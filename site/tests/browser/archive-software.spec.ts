import { test, expect } from "@playwright/test";

// CI has no desktop GPU. Full motion/visual tests remain in archive.spec.ts
// and run with the default (hardware-backed) local projects before release.
test("CPU-only smoke: actual WebGL frame, real post selection, readable static destination", async ({
  page,
}) => {
  test.setTimeout(150_000);
  await page.addInitScript(() =>
    localStorage.setItem(
      "rhine-blog:settings:v1",
      JSON.stringify({
        sound: false,
        music: false,
        reduced: true,
        rendering: {
          scale: 50,
          pixelRatio: 1,
          shadows: 0,
          aoSamples: 0,
          depthOfField: 0,
          transmission: 0.25,
          anisotropy: 1,
          antialias: "off",
        },
      }),
    ),
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?scene=archive");
  await page.waitForFunction(
    () => {
      const state = (window as any).rhine?.stats();
      return state?.ready && state.drawCalls > 0;
    },
    {},
    { timeout: 90_000 },
  );
  const before = await page.evaluate(() => (window as any).rhine.stats());
  expect(before.loaded).toBe(true);
  expect(before.archiveCount).toBeGreaterThan(0);
  expect(before.archiveCandidates).toBeGreaterThanOrEqual(before.archiveCount);
  expect(before.motion.reduced).toBe(true);
  const after = await page.evaluate(() => {
    const app = (window as any).rhine;
    app.navigate("lane", 1);
    app.detail();
    return app.stats();
  });
  expect(after.selected).not.toBe(before.selected);
  expect(after.mode).toBe("detail");
  const destination = await page.locator(".read-post").getAttribute("href");
  expect(destination).toBe(`/p/${after.selectedSlug}/`);
  await page.goto(destination!);
  await expect(page.locator(".prose")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  expect(errors).toEqual([]);
});
