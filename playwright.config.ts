import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  // WebGL、音频和完整牌局并行过多会争抢本机浏览器资源，造成与功能无关的超时。
  // 三个执行槽正好覆盖 Chromium、Firefox、WebKit，同时保证 Windows 与 macOS 稳定。
  workers: 3,
  timeout: 60_000,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4399",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev:web -- --port 4399 --strictPort",
    url: "http://127.0.0.1:4399",
    reuseExistingServer: false,
  },
  projects: [
    { name: "Chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "Firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "WebKit", use: { ...devices["Desktop Safari"] } },
  ],
});
