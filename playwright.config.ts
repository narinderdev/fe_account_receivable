import { defineConfig } from '@playwright/test';

const isHeaded = process.env.HEADLESS === 'false';
const slowMoValue = Number(process.env.SLOWMO || 0);
const isDemoLikeRun = isHeaded || slowMoValue > 0;

export default defineConfig({
  testDir: '.',
  testMatch: ['playwright/**/*.spec.ts'],
  workers: isDemoLikeRun ? 1 : undefined,

  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on',
    video: 'on',
    screenshot: 'on',

    // ⏱️ SLOW SPEED CONFIG
    launchOptions: {
      slowMo: slowMoValue,
    },
  },

  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        headless: !isHeaded,
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
