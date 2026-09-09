import { defineConfig } from "astro/config";
import { buildSettings, siteIdentity } from "./build-settings.mjs";
const build = buildSettings();

export default defineConfig({
  site: siteIdentity.origin,
  output: "static",
  trailingSlash: "always",
  publicDir: "./static",
  outDir: `./${build.outDir}`,
  vite: { define: { __BLOG_RELEASE__: JSON.stringify(build.release) } },
  // Compatibility-first: keep authored image bytes and GIF animation unchanged.
  image: { service: { entrypoint: "astro/assets/services/noop" } },
  devToolbar: { enabled: false },
  markdown: {
    shikiConfig: {
      theme: "github-light",
      langAlias: { conf: "ini", curl: "bash", git: "bash" },
    },
  },
});
