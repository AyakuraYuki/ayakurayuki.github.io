import { test, expect, type Page } from "@playwright/test";
import { readPosts } from "../../src/lib/posts";
const corpus = await readPosts();
const state = (page: Page) =>
  page.evaluate(() => (window as any).rhine.stats());
async function openArchive(page: Page, query = "?scene=archive") {
  await page.goto("/" + query);
  await page.waitForFunction(
    () => (window as any).rhine?.stats().ready,
    {},
    { timeout: 90000 },
  );
  await expect
    .poll(async () => (await state(page)).cameraDetail, { timeout: 20000 })
    .toBeLessThan(0.01);
}
async function preview(page: Page) {
  await page.locator(".read-file").click();
  await expect
    .poll(async () => (await state(page)).cameraDetail, { timeout: 30000 })
    .toBeGreaterThan(0.99);
  await expect
    .poll(async () => (await state(page)).decryption.phase, { timeout: 30000 })
    .toBe("clear");
  await expect(page.locator(".read-post")).toBeVisible();
}
test.describe("three-dimensional blog integration", () => {
  test.setTimeout(150000);
  test("unequal columns loop, remembered choices survive, and movement stays directional", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await openArchive(page);
    expect((await state(page)).columnCounts).toEqual([29, 6, 1, 1, 1]);
    const first = await state(page);
    await page.keyboard.press("ArrowUp");
    const last = await state(page);
    expect(last.selectedCell.row).toBe(first.selectedCell.row - 1);
    expect(last.selected).not.toBe(first.selected);
    expect(last.selectedMappedIndex).toBe(
      corpus.findIndex((p) => p.id === last.selected),
    );
    await page.keyboard.press("ArrowDown");
    expect((await state(page)).selected).toBe(first.selected);
    for (let i = 0; i < 18; i++) await page.keyboard.press("ArrowDown");
    const remembered = (await state(page)).selected;
    expect(await page.locator("#file-ticks button:visible").count()).toBe(8);
    await page.keyboard.press("ArrowRight");
    expect(await page.locator("#file-ticks button:visible").count()).toBe(6);
    await page.keyboard.press("ArrowLeft");
    expect((await state(page)).selected).toBe(remembered);
    for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
    const single = await state(page);
    expect(await page.locator("#file-ticks button:visible").count()).toBe(1);
    await page.keyboard.press("ArrowDown");
    const repeated = await state(page);
    expect(repeated.selected).toBe(single.selected);
    expect(repeated.selectedCell.row).toBe(single.selectedCell.row + 1);
    for (let i = 0; i < 2; i++) await page.keyboard.press("ArrowRight");
    expect((await state(page)).selected).toBe(remembered);
    expect((await state(page)).archiveCount).toBe(288);
    expect(errors).toEqual([]);
  });
  test("preview opens real static article; return and refresh restore article ID", async ({
    page,
  }) => {
    const outside: string[] = [];
    page.on("request", (r) => {
      if (
        !r.url().startsWith("http://127.0.0.1:4328/") &&
        !r.url().startsWith("data:") &&
        !r.url().startsWith("blob:")
      )
        outside.push(r.url());
    });
    await openArchive(page);
    await page.keyboard.press("ArrowDown");
    const chosen = await state(page);
    await preview(page);
    await expect(page.locator(".post-preview-title")).toContainText(
      corpus.find((p) => p.id === chosen.selected)!.title,
    );
    await page.locator("[data-action=bookmark]").click();
    expect((await state(page)).saved).toContain(chosen.selected);
    await page.locator(".read-post").click();
    await expect(page).toHaveURL(new RegExp(`/p/${chosen.selectedSlug}/$`));
    await expect(page.locator(".prose")).toBeVisible();
    expect(await page.locator("canvas").count()).toBe(0);
    await page.goBack();
    await page.waitForFunction(
      () => (window as any).rhine?.stats().ready,
      {},
      { timeout: 90000 },
    );
    expect((await state(page)).selected).toBe(chosen.selected);
    await page.locator(".read-post").click();
    await page.reload();
    await page.locator("[data-archive-return]").click();
    await page.waitForFunction(
      () => (window as any).rhine?.stats().ready,
      {},
      { timeout: 90000 },
    );
    expect((await state(page)).selected).toBe(chosen.selected);
    expect((await state(page)).mode).toBe("detail");
    expect((await state(page)).saved).toContain(chosen.selected);
    expect(
      await page.evaluate(
        async () => (await navigator.serviceWorker.getRegistrations()).length,
      ),
    ).toBe(0);
    expect(outside).toEqual([]);
  });
  test("selection is vertical after settling; fast return preserves state and viewer works", async ({
    page,
  }) => {
    await openArchive(page);
    await expect
      .poll(async () => Math.abs((await state(page)).columnCamera + 10.4), {
        timeout: 30000,
      })
      .toBeLessThan(0.001);
    await expect
      .poll(async () => (await state(page)).extraction, { timeout: 15000 })
      .toBeGreaterThan(0.399);
    const base = await state(page);
    await preview(page);
    const detail = await state(page);
    expect(
      Math.abs(detail.modelPosition[0] - base.modelPosition[0]),
    ).toBeLessThan(0.01);
    expect(
      Math.abs(detail.modelPosition[2] - base.modelPosition[2]),
    ).toBeLessThan(0.01);
    expect(detail.extraction).toBeCloseTo(4.05, 2);
    expect(detail.cameraNear).toBe(5);
    await page.locator("[data-action=model-viewer]").click();
    await expect(page.locator(".model-viewer")).toBeVisible();
    await expect(page.locator("[data-viewer=explode]")).toBeEnabled({
      timeout: 30000,
    });
    await page.locator("[data-viewer=explode]").click();
    await page.locator("[data-viewer=assemble]").click();
    await page.keyboard.press("Escape");
    await expect.poll(async () => (await state(page)).viewerOpen).toBe(false);
    expect((await state(page)).selected).toBe(base.selected);
    const viewport = page.viewportSize()!;
    await page.mouse.move(viewport.width * 0.27, viewport.height * 0.29);
    await page.mouse.down();
    await page.mouse.move(viewport.width * 0.27 + 85, viewport.height * 0.29, {
      steps: 8,
    });
    await page.mouse.up();
    await expect
      .poll(async () => Math.abs((await state(page)).rotation), {
        timeout: 10000,
      })
      .toBeGreaterThan(0.12);
    const rotated = await state(page);
    await page.keyboard.press("Escape");
    const aligning = await state(page);
    expect(aligning.returnPhase).toBe("aligning");
    expect(
      Math.abs(aligning.modelPosition[1] - rotated.modelPosition[1]),
    ).toBeLessThan(0.02);
    const rebound = await page.evaluate(() => {
      const app = (window as any).rhine;
      const before = app.stats();
      app.navigate("row", 1);
      app.navigate("row", -1);
      const after = app.stats();
      return { before, after };
    });
    expect(rebound.after.selected).toBe(rebound.before.selected);
    expect(
      Math.abs(rebound.after.extraction - rebound.before.extraction),
    ).toBeLessThan(0.01);
    await page.locator(".read-file").click();
    expect((await state(page)).mode).toBe("detail");
    await page.evaluate(() => (window as any).rhine.dispose());
    expect(await page.locator("#three-scene canvas").count()).toBe(0);
  });
  test("search selects a real post and modal input isolation stays intact", async ({
    page,
  }) => {
    await openArchive(page);
    await page.locator("[data-action=search]").click();
    await page.locator("#archive-search").fill("JSON in Swift");
    await expect(page.locator(".result-row")).toHaveCount(1);
    const before = await state(page);
    await page.keyboard.press("ArrowDown");
    expect((await state(page)).selected).toBe(before.selected);
    await page.locator(".result-row").click();
    await expect.poll(async () => (await state(page)).mode).toBe("detail");
    expect((await state(page)).selectedSlug).toBe("2018-01-31-json-in-swift");
    await page.locator("[data-tab=notes]").click();
    await expect(page.locator("#tab-panel")).toContainText("文章目录");
  });
  test("failed GLB leaves a readable alternative and no-JS root lists real article links", async ({
    page,
    browser,
    baseURL,
  }) => {
    await page.route("**/assets/archive-cassette.glb", (route) =>
      route.abort(),
    );
    await page.goto("/?scene=archive");
    await expect(page.locator(".archive-error-reader")).toBeVisible({
      timeout: 30000,
    });
    await page.locator(".archive-error-reader").click();
    await expect(page.locator(".post-row")).toHaveCount(corpus.length);
    const context = await browser.newContext({ javaScriptEnabled: false });
    const plain = await context.newPage();
    await plain.goto(baseURL + "/");
    await expect(plain.locator("#archive-fallback li")).toHaveCount(
      corpus.length,
    );
    await context.close();
  });
  test("touch swipes move the array, preview scroll does not select another post", async ({
    page,
    browserName,
  }, info) => {
    test.skip(
      info.project.name !== "mobile-chromium" || browserName !== "chromium",
    );
    await openArchive(page);
    await expect
      .poll(async () => Math.abs((await state(page)).columnCamera + 10.4), {
        timeout: 30000,
      })
      .toBeLessThan(0.01);
    const cdp = await page.context().newCDPSession(page);
    const swipe = async (x: number, y: number, dx: number, dy: number) => {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x, y }],
      });
      for (let i = 1; i <= 6; i++)
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: x + (dx * i) / 6, y: y + (dy * i) / 6 }],
        });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    };
    const before = await state(page);
    await swipe(240, 180, -110, 0);
    await expect.poll(async () => (await state(page)).selectedLane).toBe(1);
    const column = await state(page);
    expect(column.selectedCell.lane).toBe(before.selectedCell.lane + 1);
    await swipe(200, 180, 0, -70);
    await expect
      .poll(async () => (await state(page)).selected)
      .not.toBe(column.selected);
    await preview(page);
    const opened = await state(page);
    const box = await page.locator("#detail-content").boundingBox();
    await swipe(
      box!.x + box!.width / 2,
      box!.y + Math.min(180, box!.height - 20),
      0,
      -90,
    );
    expect((await state(page)).selected).toBe(opened.selected);
    expect(
      await page.locator(".post-preview-body").evaluate((e) => e.scrollTop),
    ).toBeGreaterThan(0);
    await cdp.detach();
  });
  test("reduced motion and replay retain the reference model layout", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForFunction(
      () => (window as any).rhine?.stats().ready,
      {},
      { timeout: 90000 },
    );
    expect((await state(page)).mode).toBe("archive");
    expect((await state(page)).motion.reduced).toBe(true);
    await page.evaluate(() => (window as any).rhine.seek(27));
    await expect.poll(async () => (await state(page)).mode).toBe("boot");
    const film = await state(page);
    expect(film.selectedSlot).toBe(76);
    expect(film.selectedPostId).toBe(null);
    await page.locator("[data-action=skip]:visible").first().click();
    expect((await state(page)).mode).toBe("archive");
  });
  test("direct detail entry decrypts after leaving the reference slot", async ({
    page,
  }) => {
    await page.goto("/?scene=detail");
    await page.waitForFunction(
      () => (window as any).rhine?.stats().decryption.phase === "clear",
      {},
      { timeout: 60000 },
    );
    await expect(page.locator(".read-post")).toBeVisible();
    expect((await state(page)).mode).toBe("detail");
  });
});
