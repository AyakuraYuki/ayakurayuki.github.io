import { defineConfig, devices } from "@playwright/test";
import { buildSettings } from "./build-settings.mjs";
const release = buildSettings().release;
const software = process.env.ARCHIVE_TEST_RENDERING === "software";
export default defineConfig({
  testDir: "./tests/browser",
  timeout: 30_000,
  retries:
    process.env.CI && process.env.ARCHIVE_TEST_RENDERING !== "software" ? 1 : 0,
  workers: process.env.ARCHIVE_TEST_RENDERING === "software" ? 1 : 2,
  maxFailures: process.env.CI ? 3 : undefined,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4328",
    launchOptions: {
      args:
        process.env.ARCHIVE_TEST_RENDERING === "software"
          ? [
              "--enable-unsafe-swiftshader",
              "--use-gl=angle",
              "--use-angle=swiftshader",
            ]
          : ["--enable-unsafe-swiftshader"],
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      testIgnore: software
        ? ["**/archive.spec.ts", "**/archive-software.spec.ts"]
        : ["**/archive-software.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
        channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile-chromium",
      testIgnore: software
        ? ["**/archive.spec.ts", "**/archive-software.spec.ts"]
        : ["**/archive-software.spec.ts"],
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
      },
    },
    ...(software
      ? [
          {
            name: "archive-software-smoke",
            testMatch: "**/archive-software.spec.ts",
            use: {
              ...devices["Desktop Chrome"],
              channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
              viewport: { width: 960, height: 540 },
            },
          },
        ]
      : []),
  ],
  webServer: {
    command: `node scripts/serve-dist.mjs ${release ? "--release" : ""} --port 4328`,
    url: "http://127.0.0.1:4328",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
