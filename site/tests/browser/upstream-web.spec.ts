import { test, expect, type Page } from "@playwright/test";
const stats = (page: Page) =>
  page.evaluate(() => (window as any).rhine.stats());
async function loaded(page: Page, query = "?scene=archive") {
  await page.goto("/" + query);
  await page.waitForFunction(
    () => (window as any).rhine?.stats().started,
    {},
    { timeout: 90000 },
  );
  await expect
    .poll(async () => Math.abs((await stats(page)).columnCamera + 10.4), {
      timeout: 30000,
    })
    .toBeLessThan(0.005);
}
test.describe("upstream web upgrade", () => {
  test.skip(
    process.env.ARCHIVE_TEST_RENDERING === "software",
    "Full new web behavior uses GPU-backed local browsers; CI retains a real WebGL smoke check.",
  );
  test.setTimeout(120000);
  test("dark preference persists into preview, reader, and restored archive without loading wallpaper host", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await loaded(page);
    await page.locator("[data-action=settings]").click();
    await page.locator("[data-color-theme=dark]").click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-dark-surface",
      "true",
    );
    await page.locator("[data-action=close-modal]").click();
    await page.locator(".read-file").click();
    await expect
      .poll(async () => (await stats(page)).decryption.phase, {
        timeout: 20000,
      })
      .toBe("clear");
    expect((await stats(page)).colorTheme).toBe("dark");
    await page.locator(".read-post").click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-reader-theme",
      "dark",
    );
    await expect(page.locator(".prose")).toBeVisible();
    expect(await page.locator("canvas").count()).toBe(0);
    await page.locator("[data-archive-return]").click();
    await page.waitForFunction(
      () => (window as any).rhine?.stats().started,
      {},
      { timeout: 90000 },
    );
    expect((await stats(page)).colorTheme).toBe("dark");
    expect(
      await page.evaluate(() => ({
        host: !!(window as any).rhineWallpaperHost,
        wallpaper: document.documentElement.dataset.wallpaper,
      })),
    ).toEqual({ host: false, wallpaper: undefined });
    expect(
      await page
        .locator(".workbench, .relay-entry, [data-action=toggle-three]")
        .count(),
    ).toBe(0);
    expect(
      await page.evaluate(
        async () => (await navigator.serviceWorker.getRegistrations()).length,
      ),
    ).toBe(0);
    expect(errors).toEqual([]);
  });
  test("performance override preserves custom quality and motion preference across refresh", async ({
    page,
  }) => {
    await loaded(page);
    const before = await stats(page);
    await page.locator("[data-action=settings]").click();
    await page.locator("[data-pref=superPerformance]").check();
    let current = await stats(page);
    expect(current.superPerformance).toBe(true);
    expect(current.motion.reduced).toBe(before.motion.reduced);
    expect(current.savedQuality).toEqual(before.savedQuality);
    expect(current.effectiveQuality.aoSamples).toBe(0);
    expect(current.effectiveQuality.scale).toBe(60);
    await page.reload();
    await page.waitForFunction(
      () => (window as any).rhine?.stats().started,
      {},
      { timeout: 90000 },
    );
    expect((await stats(page)).superPerformance).toBe(true);
    await page.locator("[data-action=settings]").click();
    await page.locator("[data-pref=superPerformance]").uncheck();
    current = await stats(page);
    expect(current.effectiveQuality).toEqual(before.savedQuality);
    expect(current.motion.reduced).toBe(before.motion.reduced);
  });
  test("audio entry waits for a real click, starts without subtitle and uses font shards", async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem(
        "rhine-blog:settings:v1",
        JSON.stringify({ sound: true, music: false, reduced: false }),
      ),
    );
    await page.goto("/");
    await page.waitForFunction(
      () => (window as any).rhine?.stats().entry === "waiting",
      {},
      { timeout: 90000 },
    );
    expect((await stats(page)).started).toBe(false);
    await expect(page.locator(".entry-start")).toBeFocused();
    await page.locator(".entry-start").click();
    await page.waitForFunction(
      () => (window as any).rhine.stats().started,
      {},
      { timeout: 30000 },
    );
    await expect(page.locator("#stage")).toHaveAttribute(
      "data-layout",
      "opening",
    );
    expect(await page.locator("#cinema-caption").count()).toBe(0);
    const box = await page.locator("#stage").boundingBox();
    const viewport = page.viewportSize()!;
    expect(Math.abs(box!.width - viewport.width)).toBeLessThan(1);
    expect(Math.abs(box!.height - viewport.height)).toBeLessThan(1);
    const resources = await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .map((e) => ({
          url: e.name,
          bytes: (e as PerformanceResourceTiming).encodedBodySize,
        })),
    );
    const fonts = resources.filter((r) => r.url.endsWith(".woff2"));
    expect(fonts.length).toBeGreaterThan(0);
    expect(fonts.length).toBeLessThan(80);
    expect(fonts.every((r) => r.url.includes("/misans-webfont-4.3.1/"))).toBe(
      true,
    );
    expect(fonts.reduce((total, f) => total + f.bytes, 0)).toBeLessThan(
      4 * 1024 * 1024,
    );
  });
  test("wheel follows row sequence and free drag can change both coordinates", async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop-chromium");
    await loaded(page);
    await page.mouse.move(350, 330);
    const before = await stats(page);
    await page.mouse.wheel(0, 120);
    await expect
      .poll(async () => (await stats(page)).selected)
      .not.toBe(before.selected);
    await expect
      .poll(async () => (await stats(page)).archiveMomentum, { timeout: 20000 })
      .toBe(null);
    const origin = await stats(page);
    const p = origin.dragProjection;
    const x = 420,
      y = 280;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(
      x + p.lane.x * 1.2 + p.row.x * 2.1,
      y + p.lane.y * 1.2 + p.row.y * 2.1,
      { steps: 12 },
    );
    const held = await stats(page);
    expect(held.holdingArchive).toBe(true);
    expect(held.dragMapping).toBe("free");
    expect(held.selectedCell.lane).not.toBe(origin.selectedCell.lane);
    expect(held.selectedCell.row).not.toBe(origin.selectedCell.row);
    await page.mouse.up();
    await page.keyboard.press("ArrowDown");
    const after = await stats(page);
    expect(after.selectedPostId).toBe(after.selected);
    expect(after.selectedMappedIndex).toBeGreaterThanOrEqual(0);
  });
});
