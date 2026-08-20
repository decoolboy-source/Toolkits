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
    baseURL: 'http://127.0.0.1:4173',
  },
  // Static server for PWA tests (manifest/service worker require a real
  // http(s) origin — file:// cannot register a service worker at all).
  webServer: {
    command: 'python3 -m http.server 4173',
    url: 'http://127.0.0.1:4173/AppThermoEngine.html',
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
});
