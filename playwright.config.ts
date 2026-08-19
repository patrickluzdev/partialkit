import { defineConfig, devices } from "@playwright/test";

const PORT = 4321;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],

  // Rendering differs per OS, so baselines are kept per platform. CI runs inside
  // the Playwright container to stay on the linux set.
  snapshotPathTemplate: "tests/__screenshots__/{platform}/{projectName}/{arg}{ext}",

  expect: {
    toHaveScreenshot: {
      // Rounded shapes and glyphs land on different subpixels between runs —
      // measured at up to ~700 pixels on a small example, which no budget can
      // tell apart from a change of that size. So this suite guards layout,
      // colour and size; anything finer is asserted in metrics.spec.ts.
      threshold: 0.35,
      maxDiffPixelRatio: 0.02,
    },
  },

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],

  webServer: {
    command: "npm run docs:build && npm run docs:preview",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    timeout: 120_000,
  },
});
