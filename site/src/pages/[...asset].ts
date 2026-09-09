import type { APIRoute, GetStaticPaths } from "astro";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  bundleAssets,
  readPosts,
  repositoryRoot,
  walkFiles,
} from "../lib/posts";

// Serve authored bundle files at their old URLs. Never copy Hugo's public/ output.
export const getStaticPaths: GetStaticPaths = async () => {
  const files = await bundleAssets(await readPosts());
  const staticRoot = path.join(repositoryRoot, "static");
  for (const source of await walkFiles(staticRoot)) {
    files.push({
      source,
      route:
        "/" +
        path
          .relative(staticRoot, source)
          .split(path.sep)
          .map(encodeURIComponent)
          .join("/"),
    });
  }
  return files.map((file) => ({
    params: { asset: decodeURI(file.route.slice(1)) },
    props: { source: file.source },
  }));
};
const types: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
};
export const GET: APIRoute = async ({ props }) =>
  new Response(new Uint8Array(await readFile(props.source)), {
    headers: {
      "Content-Type":
        types[path.extname(props.source)] ?? "application/octet-stream",
    },
  });
