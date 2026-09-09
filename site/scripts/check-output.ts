import assert from "node:assert/strict";
import { readFile, stat, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { parse, type DefaultTreeAdapterMap } from "parse5";
import { fromMarkdown } from "mdast-util-from-markdown";
import type { Nodes as MarkdownNode } from "mdast";
import {
  readPosts,
  bundleAssets,
  repositoryRoot,
  walkFiles,
} from "../src/lib/posts.ts";

type Element = DefaultTreeAdapterMap["element"];
type Node = DefaultTreeAdapterMap["node"];
const output = path.resolve("dist");
const failures: string[] = [];
const documents = new Map<string, { ids: Set<string>; nodes: Element[] }>();
const collect = (node: Node, nodes: Element[] = []): Element[] => {
  if ("tagName" in node) nodes.push(node);
  if ("childNodes" in node)
    for (const child of node.childNodes) collect(child, nodes);
  return nodes;
};
const attrs = (node: Element) =>
  Object.fromEntries(node.attrs.map((a) => [a.name, a.value]));
const text = (node: Node): string =>
  "value" in node
    ? node.value
    : "childNodes" in node
      ? node.childNodes.map(text).join("")
      : "";
for (const file of (await walkFiles(output)).filter((f) =>
  f.endsWith(".html"),
)) {
  const nodes = collect(parse(await readFile(file, "utf8")));
  const ids = new Set<string>();
  for (const node of nodes) {
    const id = attrs(node).id;
    if (id && ids.has(id))
      failures.push(`Duplicate id in ${path.relative(output, file)}: ${id}`);
    if (id) ids.add(id);
  }
  documents.set(file, { ids, nodes });
}
const posts = await readPosts();
let checkedCodeBlocks = 0;
for (const post of posts) {
  const file = path.join(output, post.href, "index.html");
  const document = documents.get(file);
  if (!document) {
    failures.push(`Missing article ${post.href}`);
    continue;
  }
  const title = document.nodes.find((n) => n.tagName === "title");
  if (!title || !text(title).includes(post.title))
    failures.push(`Wrong title ${post.href}`);
  const sourceCode: string[] = [];
  const collectCode = (node: MarkdownNode) => {
    if (node.type === "code") sourceCode.push(node.value.replace(/\s+$/, ""));
    if ("children" in node) node.children.forEach(collectCode);
  };
  collectCode(fromMarkdown(post.body));
  const renderedCode = document.nodes
    .filter((n) => n.tagName === "pre")
    .map((n) => text(n).replace(/\s+$/, ""));
  if (
    sourceCode.length !== renderedCode.length ||
    sourceCode.some((code, i) => code !== renderedCode[i])
  )
    failures.push(`Code block text/count changed: ${post.href}`);
  checkedCodeBlocks += sourceCode.length;
  const article = document.nodes.find((n) => n.tagName === "article");
  if (!article || text(article).trim().length < 100)
    failures.push(`Missing static article text ${post.href}`);
  if (
    !document.nodes.some(
      (n) =>
        n.tagName === "meta" &&
        attrs(n).name === "robots" &&
        attrs(n).content === "noindex, nofollow",
    )
  )
    failures.push(`Preview not protected by noindex ${post.href}`);
  if (
    document.nodes.some(
      (n) =>
        n.tagName === "img" &&
        Object.keys(attrs(n)).some((key) => key.includes("__astro_image_")),
    )
  )
    failures.push(`Unresolved Astro image marker ${post.href}`);
}
let checkedLinks = 0;
for (const [file, document] of documents) {
  const route =
    "/" +
    path
      .relative(output, file)
      .split(path.sep)
      .join("/")
      .replace(/index\.html$/, "");
  for (const node of document.nodes) {
    const attributes = attrs(node);
    const links: string[] = [];
    if (node.tagName === "a" && attributes.href) links.push(attributes.href);
    if (["img", "script", "source"].includes(node.tagName) && attributes.src)
      links.push(attributes.src);
    if (
      node.tagName === "link" &&
      ["stylesheet", "icon", "modulepreload"].includes(attributes.rel)
    )
      links.push(attributes.href);
    if (node.tagName === "img" && attributes.srcset)
      links.push(
        ...attributes.srcset.split(",").map((s) => s.trim().split(/\s+/)[0]),
      );
    for (const value of links) {
      if (/^(mailto:|tel:|data:)/i.test(value)) continue;
      if (/^javascript:/i.test(value)) {
        failures.push(`Unsafe URL ${value} in ${route}`);
        continue;
      }
      const target = new URL(value, `https://blog.ayakurayuki.cc${route}`);
      if (target.origin !== "https://blog.ayakurayuki.cc") continue;
      let destination = path.join(output, decodeURIComponent(target.pathname));
      try {
        if ((await stat(destination)).isDirectory())
          destination = path.join(destination, "index.html");
        await stat(destination);
        if (
          target.hash &&
          documents.has(destination) &&
          !documents
            .get(destination)!
            .ids.has(decodeURIComponent(target.hash.slice(1)))
        )
          failures.push(`Broken anchor ${route} → ${value}`);
      } catch {
        failures.push(`Broken local URL ${route} → ${value}`);
      }
      checkedLinks++;
    }
  }
}
const old = JSON.parse(
  await readFile(
    path.join(repositoryRoot, "migration/legacy-headings.json"),
    "utf8",
  ),
);
let checkedHeadings = 0;
for (const post of posts) {
  const ids = documents.get(path.join(output, post.href, "index.html"))?.ids;
  for (const heading of old.posts[post.slug]?.headings ?? []) {
    if (!ids?.has(heading.id))
      failures.push(`Legacy anchor not preserved: ${post.href}#${heading.id}`);
    checkedHeadings++;
  }
}
const assets = await bundleAssets(posts);
for (const asset of assets) {
  const source = await readFile(asset.source);
  const dest = path.join(output, decodeURI(asset.route));
  try {
    const bytes = await readFile(dest);
    if (
      createHash("sha256").update(bytes).digest("hex") !==
      createHash("sha256").update(source).digest("hex")
    )
      failures.push(`Attachment bytes changed: ${asset.route}`);
  } catch {
    failures.push(`Attachment missing: ${asset.route}`);
  }
}
const report = {
  generatedAt: new Date().toISOString(),
  publishedPosts: posts.length,
  yamlPosts: posts.filter((p) => p.format === "yaml").length,
  tomlPosts: posts.filter((p) => p.format === "toml").length,
  articleAssets: assets.length,
  checkedLocalLinks: checkedLinks,
  legacyHeadings: checkedHeadings,
  checkedCodeBlocks,
  htmlPages: documents.size,
  failures,
};
await mkdir(".cache", { recursive: true });
await writeFile(
  ".cache/output-report.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
assert.equal(
  failures.length,
  0,
  `Static output verification failed:\n${failures.join("\n")}`,
);
