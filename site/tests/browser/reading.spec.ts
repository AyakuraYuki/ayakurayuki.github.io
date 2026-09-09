import { test, expect } from "@playwright/test";
import { readPosts } from "../../src/lib/posts";
const corpus = await readPosts();
const count = corpus.length;
const projectCount = corpus.filter((p) =>
  p.categories.includes("project"),
).length;

test("index filters, search and normal article links work", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".post-row:visible")).toHaveCount(count);
  await page.getByRole("button", { name: /项目档案/ }).click();
  await expect(page.locator(".post-row:visible")).toHaveCount(projectCount);
  await page.getByRole("button", { name: /全部档案/ }).click();
  await page.getByRole("searchbox").fill("超卖");
  await expect(page.locator(".post-row:visible")).toHaveCount(1);
  await page.locator(".post-row:visible h2 a").click();
  await expect(page).toHaveURL(
    /\/p\/2025-12-01-high-concurrency-overselling-issue\/$/,
  );
  await expect(page.locator("article h1")).toContainText("超卖问题");
  await page.reload();
  await expect(page.locator(".prose")).toContainText("库存");
  await page.goBack();
  await expect(page.getByRole("searchbox")).toHaveValue("超卖");
  await expect(page.locator(".post-row:visible")).toHaveCount(1);
  expect(errors).toEqual([]);
});
test("long code is scrollable without horizontal document overflow", async ({
  page,
}) => {
  await page.goto("/p/2022-07-08-apollo-in-docker/");
  await expect(page.locator(".prose pre").first()).toBeVisible();
  const geometry = await page.evaluate(() => ({
    width: innerWidth,
    document: document.documentElement.scrollWidth,
    code: [...document.querySelectorAll("pre")].some(
      (pre) => pre.scrollWidth > pre.clientWidth,
    ),
  }));
  expect(geometry.document).toBeLessThanOrEqual(geometry.width + 1);
  expect(geometry.code).toBe(true);
  await expect(page.locator(".copy-code").first()).toBeVisible();
});
test("all authored images and GIF load in the page bundle", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/p/2018-01-31-json-in-swift/");
  for (const image of await page.locator(".prose img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate(
          (el: HTMLImageElement) => el.complete && el.naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
  const response = await page.request.get("/p/2018-01-31-json-in-swift/4.gif");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/gif");
  expect(errors).toEqual([]);
});
test("article, images and navigation remain available without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}/p/2023-12-13-deploy-etcd-in-local-machine/`);
  await expect(page.locator("article h1")).toContainText("etcd");
  await expect(page.locator(".prose")).toContainText("supervisor");
  await expect(page.locator("pre").first()).toBeVisible();
  await expect(page.locator(".article-cover")).toBeVisible();
  await page.getByRole("link", { name: "← 返回文章索引" }).click();
  await expect(page.locator(".post-row")).toHaveCount(count);
  await context.close();
});
test("preview has no service worker or third-party runtime requests", async ({
  page,
}) => {
  const outside: string[] = [];
  page.on("request", (req) => {
    if (
      !req.url().startsWith("http://127.0.0.1:4328/") &&
      !req.url().startsWith("data:")
    )
      outside.push(req.url());
  });
  await page.goto("/p/2025-12-01-high-concurrency-overselling-issue/");
  await expect(page.locator("meta[name=robots]")).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  expect(
    await page.evaluate(
      async () => (await navigator.serviceWorker.getRegistrations()).length,
    ),
  ).toBe(0);
  expect(outside).toEqual([]);
});

test("historical fragments and native table scroll remain usable", async ({
  page,
}) => {
  await page.goto(
    "/p/2024-01-24-tweak-linux-limits/#" + encodeURIComponent("目标文件-2"),
  );
  await expect(page.locator('[id="目标文件-2"]')).toHaveCount(1);
  await expect(page.locator('[id="systemd-配置调整"]')).toBeInViewport();
  await page.goto("/p/2023-12-14-permission-overwrite/");
  await expect(page.locator(".table-scroll").first()).toBeAttached();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
