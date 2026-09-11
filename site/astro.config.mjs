import { defineConfig } from "astro/config";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const models = ["archive-cassette", "archive-assembly"].map((name) => {
  const source = readFileSync(
    new URL(`./static/assets/${name}.glb`, import.meta.url),
  );
  const hash = createHash("sha256").update(source).digest("hex").slice(0, 16);
  return {
    key: `assets/${name}.glb`,
    fileName: `assets/${name}.${hash}.glb`,
    source,
  };
});
import { buildSettings, siteIdentity } from "./build-settings.mjs";
const build = buildSettings();

export default defineConfig({
  site: siteIdentity.origin,
  output: "static",
  trailingSlash: "always",
  publicDir: "./static",
  outDir: `./${build.outDir}`,
  vite: {
    define: {
      __BLOG_RELEASE__: JSON.stringify(build.release),
      __RHINE_MODELS__: JSON.stringify(
        Object.fromEntries(models.map((model) => [model.key, model.fileName])),
      ),
    },
    plugins: [
      {
        name: "blog-versioned-models",
        apply: "build",
        buildStart() {
          for (const model of models)
            this.emitFile({
              type: "asset",
              fileName: model.fileName,
              source: model.source,
            });
        },
      },
    ],
  },
  // Compatibility-first: keep authored image bytes and GIF animation unchanged.
  image: { service: { entrypoint: "astro/assets/services/noop" } },
  devToolbar: { enabled: false },
  markdown: {
    shikiConfig: {
      themes: { light: "github-light", dark: "github-dark" },
      langAlias: { conf: "ini", curl: "bash", git: "bash" },
    },
  },
});
