import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4173/fullscale-prototype/'

export default defineConfig({
  testDir: './browser',
  testMatch: '**/*.e2e.ts',
  timeout: 45_000,
  forbidOnly: Boolean(process.env.CI),
  use: { baseURL, trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium-iphone14',
      use: {
        ...devices['iPhone 14'],
        defaultBrowserType: 'chromium',
        launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE },
      },
    },
    { name: 'webkit-iphone14', use: { ...devices['iPhone 14'] } },
  ],
})
