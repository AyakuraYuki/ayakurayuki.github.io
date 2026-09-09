import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://blog.ayakurayuki.cc",
  output: "static",
  trailingSlash: "always",
  publicDir: "./static",
  outDir: "./dist",
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
