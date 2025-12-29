import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e-playwright',
  globalSetup: './tests/e2e-playwright/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL: 'http://localhost:8787',
    trace: 'on-first-retry',
    video: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8787',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
