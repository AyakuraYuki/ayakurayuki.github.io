import { siteIdentity } from "../../build-settings.mjs";
export { siteIdentity };
export const isRelease = __BLOG_RELEASE__;
export const robots = isRelease ? "index, follow" : "noindex, nofollow";
export const absoluteUrl = (route: string) =>
  new URL(route, siteIdentity.origin).href;
export const jsonForHtml = (data: unknown) =>
  JSON.stringify(data).replace(/</g, "\\u003c");
