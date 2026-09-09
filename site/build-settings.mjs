/** One explicit switch for output paths and indexing. NODE_ENV=production alone is not a release. */
export const siteIdentity = Object.freeze({
  origin: "https://blog.ayakurayuki.cc",
  title: "Ayakura Yuki 的小窝",
  description: "技术笔记、项目档案与生活记录。",
  author: "Ayakura Yuki",
  language: "zh-CN",
});
export function buildSettings(mode = process.env.SITE_BUILD ?? "preview") {
  if (!["preview", "production"].includes(mode))
    throw new Error(`Unsupported SITE_BUILD: ${mode}`);
  const release = mode === "production";
  return {
    mode,
    release,
    outDir: release ? "dist-release" : "dist",
    reportName: release ? "release-output-report.json" : "output-report.json",
    robots: release ? "index, follow" : "noindex, nofollow",
  };
}
