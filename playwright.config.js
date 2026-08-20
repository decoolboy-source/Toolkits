// @ts-check
const { defineConfig, devices } = require('@playwright/test');

// PW_CHROMIUM_PATH lets this suite reuse a pre-installed browser (used in the
// dev sandbox). CI installs its own browser via `playwright install` and
// leaves this unset, so devices['Desktop Chrome'] behaves normally there.
const launchOptions = process.env.PW_CHROMIUM_PATH
  ? { executablePath: process.env.PW_CHROMIUM_PATH }
  : {};

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    launchOptions,
  },
});
