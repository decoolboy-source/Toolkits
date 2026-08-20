// @ts-check
const { test, expect } = require('@playwright/test');

// These tests need a real http(s) origin (service workers cannot register
// under file://), so they go through the webServer configured in
// playwright.config.js instead of the raw file path used by app.spec.js.

test.describe('PWA packaging', () => {
  test('manifest link resolves to valid JSON with the expected icons', async ({ page, request }) => {
    await page.goto('/AppThermoEngine.html');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBeTruthy();
    const manifestUrl = new URL(href, page.url()).toString();
    const res = await request.get(manifestUrl);
    expect(res.ok()).toBeTruthy();
    const manifest = await res.json();
    expect(manifest.name).toBe('AppThermoEngine');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
    for (const icon of manifest.icons) {
      const iconUrl = new URL(icon.src, manifestUrl).toString();
      const iconRes = await request.get(iconUrl);
      expect(iconRes.ok(), `icon ${icon.src} should be reachable`).toBeTruthy();
    }
  });

  test('service worker registers and reaches the active state', async ({ page }) => {
    await page.goto('/AppThermoEngine.html');
    const state = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return reg.active ? reg.active.state : null;
    });
    expect(state).toBe('activated');
  });

  test('app shell is served from the service worker cache after registration', async ({ page }) => {
    await page.goto('/AppThermoEngine.html');
    await page.evaluate(() => navigator.serviceWorker.ready);
    const cached = await page.evaluate(async () => {
      const keys = await caches.keys();
      const results = {};
      for (const key of keys) {
        const cache = await caches.open(key);
        const match = await cache.match('./AppThermoEngine.html');
        results[key] = !!match;
      }
      return results;
    });
    expect(Object.values(cached).some(Boolean)).toBeTruthy();
  });

  test('install button stays hidden until beforeinstallprompt fires', async ({ page }) => {
    await page.goto('/AppThermoEngine.html');
    await expect(page.locator('#btnInstallApp')).toBeHidden();
  });
});
