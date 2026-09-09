/** Derive distribution metadata from the actual generated HTML, not a second Markdown renderer. */
import { readFile, writeFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { parse, serialize, type DefaultTreeAdapterMap } from "parse5";
import { readPosts, repositoryRoot, walkFiles } from "../src/lib/posts.ts";
import { buildSettings, siteIdentity } from "../build-settings.mjs";
const { mode, release, outDir } = buildSettings();
const output = path.resolve(outDir);
const posts = await readPosts();
const xml = (value: string) =>
  value.replace(
    /[<>&"']/g,
    (ch) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[ch]!,
  );
type Node = DefaultTreeAdapterMap["node"];
const nodes = (
  node: Node,
  result: DefaultTreeAdapterMap["element"][] = [],
): DefaultTreeAdapterMap["element"][] => {
  if ("tagName" in node) result.push(node);
  if ("childNodes" in node)
    node.childNodes.forEach((child) => nodes(child, result));
  return result;
};
const absolute = (relative: string, base: string) =>
  new URL(relative, base).href;
const items: string[] = [];
for (const post of posts) {
  const permalink = absolute(post.href, siteIdentity.origin);
  const html = await readFile(
    path.join(output, post.href, "index.html"),
    "utf8",
  );
  const prose = nodes(parse(html)).find((node) =>
    node.attrs.some(
      (a) => a.name === "class" && a.value.split(/\s+/).includes("prose"),
    ),
  );
  if (!prose) throw new Error(`Missing rendered article body: ${post.href}`);
  // Feed readers are not on the article's URL; absolutize every rendered resource/link.
  for (const element of nodes(prose))
    for (const attr of element.attrs) {
      if (["src", "href", "poster"].includes(attr.name))
        attr.value = absolute(attr.value, permalink);
      if (attr.name === "srcset")
        attr.value = attr.value
          .split(",")
          .map((entry) => {
            const [url, ...descriptor] = entry.trim().split(/\s+/);
            return [absolute(url, permalink), ...descriptor].join(" ");
          })
          .join(", ");
    }
  const body = xml(serialize(prose));
  items.push(
    `<item><title>${xml(post.title)}</title><link>${xml(permalink)}</link><guid isPermaLink="true">${xml(permalink)}</guid><pubDate>${new Date(post.date).toUTCString()}</pubDate>${post.categories.map((c) => `<category>${xml(c)}</category>`).join("")}<description>${body}</description><content:encoded>${body}</content:encoded></item>`,
  );
}
const feed = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>${xml(siteIdentity.title)}</title><link>${siteIdentity.origin}/</link><description>${xml(siteIdentity.description)}</description><language>zh-cn</language><atom:link href="${siteIdentity.origin}/index.xml" rel="self" type="application/rss+xml"/>${items.join("")}</channel></rss>\n`;
await writeFile(path.join(output, "index.xml"), feed);
const urls = [
  { path: "/", lastmod: "" },
  { path: "/posts/", lastmod: "" },
  ...posts.map((p) => ({ path: p.href, lastmod: p.lastmod ?? p.date })),
];
await writeFile(
  path.join(output, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${xml(absolute(url.path, siteIdentity.origin))}</loc>${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ""}</url>`).join("")}</urlset>\n`,
);
const cname = (
  await readFile(path.join(repositoryRoot, "CNAME"), "utf8")
).trim();
if (cname !== new URL(siteIdentity.origin).hostname)
  throw new Error("CNAME and canonical site origin disagree; release stopped");
if (release) await writeFile(path.join(output, "CNAME"), cname + "\n");
await writeFile(path.join(output, ".nojekyll"), "");
const commit = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: repositoryRoot,
  encoding: "utf8",
}).trim();
const trackedDirty =
  execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  }).trim().length > 0;
const upstream = JSON.parse(
  await readFile(
    path.join(repositoryRoot, "migration/rhine-upstream.lock.json"),
    "utf8",
  ),
);
const files = await Promise.all(
  [
    ...(await walkFiles(output)).filter(
      (file) => path.basename(file) !== "release-info.json",
    ),
    path.join(output, ".nojekyll"),
  ].map(async (file) => {
    const bytes = await readFile(file);
    return {
      path: path.relative(output, file).split(path.sep).join("/"),
      bytes: (await stat(file)).size,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  }),
);
await writeFile(
  path.join(output, "release-info.json"),
  JSON.stringify(
    {
      schemaVersion: 1,
      mode,
      origin: siteIdentity.origin,
      commit,
      trackedDirty,
      upstreamCommit: upstream.commit,
      articleCount: posts.length,
      files,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `${mode}: generated full-content RSS (${posts.length} articles), sitemap (${urls.length} URLs) and hashed output manifest in ${outDir}/`,
);
