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
    // `serviceWorker.ready` can resolve a tick before the active worker's
    // own state flips from "activating" to "activated" — wait for the real
    // statechange event instead of reading state at a single point in time.
    const state = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      if (reg.active.state === 'activated') return 'activated';
      return await new Promise((resolve) => {
        const worker = reg.active;
        const onChange = () => {
          if (worker.state === 'activated') {
            worker.removeEventListener('statechange', onChange);
            resolve('activated');
          }
        };
        worker.addEventListener('statechange', onChange);
        setTimeout(() => resolve(worker.state), 5000);
      });
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
