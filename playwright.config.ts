import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end smoke test against the real stack: Firebase emulators (started by
 * `npm run test:e2e` via `firebase emulators:exec`), the API with freshly seeded data, and the
 * exported web build (`npm run build:web:e2e` first).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:8081',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    geolocation: { latitude: 51.5049, longitude: -0.0857 },
    permissions: ['geolocation'],
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Pixel 7'],
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
          : {},
      },
    },
  ],
  webServer: [
    {
      command:
        'npm run seed -w @civiccircle/api -- --reset && npm run start:dev -w @civiccircle/api',
      url: 'http://localhost:8787/health',
      timeout: 120_000,
      reuseExistingServer: false,
      env: { AI_PROVIDER: 'mock', LOG_LEVEL: 'warn' },
    },
    {
      command: 'node e2e/serve-spa.mjs apps/web/dist 8081',
      url: 'http://localhost:8081',
      reuseExistingServer: false,
    },
  ],
});
