import type { APIRoute } from "astro";
import { isRelease, siteIdentity } from "../lib/site-meta";
export const GET: APIRoute = () =>
  new Response(
    isRelease
      ? `User-agent: *\nAllow: /\nSitemap: ${siteIdentity.origin}/sitemap.xml\n`
      : "User-agent: *\nDisallow: /\n",
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
