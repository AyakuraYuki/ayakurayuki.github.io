import { test, expect } from "@playwright/test";
import { buildSettings, siteIdentity } from "../../build-settings.mjs";
import { readPosts } from "../../src/lib/posts";
const posts = await readPosts();

test("reader-facing pages have no migration status copy or obsolete progress links", async ({
  page,
}) => {
  await page.goto("/posts/");
  expect(
    (
      await page
        .locator(".site-header, .site-footer, .index-sidebar")
        .allTextContents()
    ).join(" "),
  ).not.toMatch(/迁移|非正式|第一阶段|第二阶段/);
  await expect(page.locator('a[href*="/migration/"]')).toHaveCount(0);
  await expect(page.getByRole("link", { name: "RSS 订阅 ↗" })).toBeVisible();
  const notFound = await page.goto("/migration/");
  expect(notFound?.status()).toBe(404);
  await expect(page.locator("body")).not.toContainText(/迁移|预览|阶段/);
  await expect(page.locator("link[rel=canonical]")).toHaveCount(0);
  await expect(page.locator("meta[name=robots]")).toHaveAttribute(
    "content",
    "noindex, follow",
  );
});

test("RSS, sitemap and indexing agree with the artifact build mode", async ({
  page,
  request,
}) => {
  await page.goto("/posts/");
  const result = await page.evaluate(async () => {
    const parse = (text: string) =>
      new DOMParser().parseFromString(text, "application/xml");
    const feed = parse(await (await fetch("/index.xml")).text());
    const map = parse(await (await fetch("/sitemap.xml")).text());
    const items = [...feed.querySelectorAll("item")];
    return {
      errors:
        feed.querySelectorAll("parsererror").length +
        map.querySelectorAll("parsererror").length,
      items: items.map((item) => ({
        link: item.querySelector("link")?.textContent,
        body: item.querySelector("description")?.textContent ?? "",
      })),
      urls: [...map.querySelectorAll("loc")].map((node) => node.textContent),
    };
  });
  expect(result.errors).toBe(0);
  expect(result.items).toHaveLength(posts.length);
  expect(result.urls).toHaveLength(posts.length + 2);
  expect(
    result.items.every((item) =>
      item.link?.startsWith(siteIdentity.origin + "/p/"),
    ),
  ).toBe(true);
  expect(
    result.items.some(
      (item) => item.body.includes("<pre") && item.body.includes("<code"),
    ),
  ).toBe(true);
  expect(
    result.items.some((item) =>
      item.body.includes(`src="${siteIdentity.origin}/_astro/`),
    ),
  ).toBe(true);
  const robots = await (await request.get("/robots.txt")).text();
  if (buildSettings().release) {
    expect(robots).toContain("Allow: /");
    expect(robots).not.toContain("Disallow: /");
    expect(robots).toContain(`${siteIdentity.origin}/sitemap.xml`);
  } else expect(robots).toContain("Disallow: /");
  await expect(page.locator("meta[name=robots]")).toHaveAttribute(
    "content",
    buildSettings().robots,
  );
  await page.goto(posts[0].href);
  const metadata = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ??
      "{}",
  );
  expect(metadata["@type"]).toBe("BlogPosting");
  expect(metadata.url).toBe(siteIdentity.origin + posts[0].href);
});
