import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: ['playwright/**/*.spec.ts'],

  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on',
    video: 'on',
    screenshot: 'on',

    // ⏱️ SLOW SPEED CONFIG
    launchOptions: {
      slowMo: Number(process.env.SLOWMO || 0),
    },
  },

  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        headless: process.env.HEADLESS !== 'false',
      },
    },
  ],

  webServer: {
    command: 'npm run start',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
