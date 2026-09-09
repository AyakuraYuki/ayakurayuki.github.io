import type { Loader } from "astro/loaders";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { readPosts, publicPost, postsRoot, repositoryRoot } from "./posts.ts";

interface LegacyHeading {
  id: string;
  text: string;
}
interface Heading {
  depth: number;
  slug: string;
  text: string;
}
const escapeAttribute = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
const normalizeHeading = (value: string) => value.replace(/\s+/g, " ").trim();

/** Preserve observed Hugo anchor URLs without changing Markdown or the new heading IDs. */
export function addLegacyAnchors(
  html: string,
  headings: Heading[],
  legacy: LegacyHeading[],
): string {
  const used = new Set(headings.map((h) => h.slug));
  const occurrences = new Map<string, number>();
  for (const heading of headings) {
    const key = normalizeHeading(heading.text);
    const index = occurrences.get(key) ?? 0;
    occurrences.set(key, index + 1);
    const old = legacy.filter((h) => normalizeHeading(h.text) === key)[index];
    if (!old || used.has(old.id)) continue;
    const marker = `id="${escapeAttribute(heading.slug)}"`;
    const at = html.indexOf(marker);
    if (at === -1) continue;
    const start = html.lastIndexOf("<h", at);
    if (start === -1) continue;
    html = `${html.slice(0, start)}<span id="${escapeAttribute(old.id)}" class="legacy-anchor" aria-hidden="true"></span>${html.slice(start)}`;
    used.add(old.id);
  }
  return html;
}

export function legacyPostLoader(): Loader {
  return {
    name: "unchanged-hugo-post-bundles",
    async load(context) {
      const aliases = JSON.parse(
        await readFile(
          path.join(repositoryRoot, "migration/legacy-headings.json"),
          "utf8",
        ),
      ) as { posts: Record<string, { headings: LegacyHeading[] }> };
      const redirects = JSON.parse(
        await readFile(
          path.join(repositoryRoot, "migration/legacy-anchor-redirects.json"),
          "utf8",
        ),
      ) as { posts: Record<string, Record<string, string>> };
      const reload = async () => {
        const posts = await readPosts();
        const next = [];
        for (const post of posts) {
          const file = path.join(repositoryRoot, post.source);
          const data = await context.parseData({
            id: post.id,
            data: publicPost(post),
            filePath: file,
          });
          const rendered = await context.renderMarkdown(
            `---\n---\n${post.body}`,
            { fileURL: pathToFileURL(file) },
          );
          rendered.html = addLegacyAnchors(
            rendered.html,
            rendered.metadata?.headings ?? [],
            aliases.posts[post.slug]?.headings ?? [],
          );
          for (const [oldId, target] of Object.entries(
            redirects.posts[post.slug] ?? {},
          )) {
            const heading = rendered.metadata?.headings?.find(
              (h) => h.slug === target,
            );
            if (!heading)
              throw new Error(
                `Legacy redirect target disappeared: ${post.slug}#${target}`,
              );
            rendered.html = addLegacyAnchors(
              rendered.html,
              [heading],
              [{ id: oldId, text: heading.text }],
            );
          }
          next.push({
            id: post.id,
            data,
            body: post.body,
            filePath: path.relative(fileURLToPath(context.config.root), file),
            digest: context.generateDigest({ data, body: post.body }),
            rendered,
            assetImports: rendered.metadata?.imagePaths,
          });
        }
        // Validate/render every entry before replacing the collection; deleted/draft entries must disappear.
        context.store.clear();
        for (const entry of next) context.store.set(entry);
        context.logger.info(
          `${next.length} published legacy posts loaded without rewriting sources`,
        );
      };
      await reload();
      if (context.watcher) {
        context.watcher.add(postsRoot);
        let queue = Promise.resolve();
        const update = (file: string) => {
          const relative = path.relative(postsRoot, file);
          if (relative.startsWith("..") || path.isAbsolute(relative)) return;
          queue = queue.then(reload).catch((error) => {
            context.logger.error(String(error));
          });
        };
        context.watcher
          .on("add", update)
          .on("change", update)
          .on("unlink", update);
      }
    },
  };
}
