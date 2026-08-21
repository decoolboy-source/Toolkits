// @ts-check
const path = require('path');
const { test, expect } = require('@playwright/test');

const APP_PATH = 'file://' + path.resolve(__dirname, '..', 'AppThermoEngine.html');

const CALC_SUBS = [
  'lookup', 'insulation', 'coolingload', 'electrical', 'cabletray', 'voltagedrop',
  'pallet', 'asrs', 'psychro', 'unitconv', 'advpipe', 'standards', 'pipesizing', 'lubricant',
];
const OTHER_TABS = ['db', 'admin', 'report', 'ai', 'settings', 'about'];

/** Collect page + console errors, ignoring third-party CDN noise unrelated to app logic. */
function collectErrors(page) {
  const errors = [];
  const ignore = /fonts\.googleapis|unpkg\.com|ERR_CONNECTION|ERR_TUNNEL|ERR_NAME_NOT_RESOLVED/;
  page.on('pageerror', (err) => errors.push('[pageerror] ' + err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !ignore.test(msg.text())) errors.push('[console] ' + msg.text());
  });
  return errors;
}

test.describe('App shell', () => {
  test('loads and shows the lookup module by default', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(APP_PATH);
    await expect(page.locator('#mainRoot')).toContainText('Thông số đầu vào');
    expect(errors).toEqual([]);
  });

  test('every calc sub-module renders without console/page errors', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(APP_PATH);
    for (const sub of CALC_SUBS) {
      await page.evaluate((s) => {
        window.AppThermoEngine.state.activeCalcSub = s;
        window.AppThermoEngine.ui.showTab('calc');
      }, sub);
      await expect(page.locator('#mainRoot')).not.toContainText('Có lỗi khi hiển thị module này');
    }
    expect(errors).toEqual([]);
  });

  test('every top-level tab renders without console/page errors', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(APP_PATH);
    for (const tab of OTHER_TABS) {
      await page.evaluate((t) => window.AppThermoEngine.ui.showTab(t), tab);
      await expect(page.locator('#mainRoot')).not.toContainText('Có lỗi khi hiển thị module này');
    }
    expect(errors).toEqual([]);
  });
});

test.describe('Disclaimer banner', () => {
  test('is visible on first load and links to the footer note', async ({ page }) => {
    await page.goto(APP_PATH);
    await expect(page.locator('#disclaimerBanner')).toBeVisible();
    await expect(page.locator('#disclaimerBanner')).toContainText('tham khảo');
    await expect(page.locator('#disclaimerBanner')).toContainText('thay thế');
    await expect(page.locator('.shrink-0.z-20.bg-panel-900')).toContainText('tham khảo');
  });

  test('dismiss button is a real clickable target (regression: was 0px when the CDN icon failed to load)', async ({ page }) => {
    await page.goto(APP_PATH);
    const btn = page.locator('#btnDismissDisclaimer');
    const box = await btn.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThan(10);
    expect(box.height).toBeGreaterThan(10);
  });

  test('dismissing persists across reloads via localStorage', async ({ page }) => {
    await page.goto(APP_PATH);
    await page.click('#btnDismissDisclaimer');
    await expect(page.locator('#disclaimerBanner')).toBeHidden();
    await page.reload();
    await expect(page.locator('#disclaimerBanner')).toBeHidden();
  });
});

test.describe('Module 1 — property lookup correctness sanity checks', () => {
  test('NH3 saturation pressure at -10°C is within 5% of the known reference value (~2.908 bar(a))', async ({ page }) => {
    await page.goto(APP_PATH);
    await page.evaluate(() => {
      window.AppThermoEngine.state.inputs.category = 'refrigerant';
      window.AppThermoEngine.state.inputs.fluid = 'NH3';
      window.AppThermoEngine.state.inputs.mode = 'T';
      window.AppThermoEngine.state.inputs.T_C = -10;
      window.AppThermoEngine.ui.showTab('calc');
    });
    const panelText = await page.locator('#mainRoot').innerText();
    const match = panelText.match(/Áp suất bão hòa[\s\S]{0,40}?([\d.]+)\s*bar/);
    expect(match, 'could not find saturation pressure value in the lookup panel').not.toBeNull();
    const pBar = parseFloat(match[1]);
    const reference = 2.908;
    expect(Math.abs(pBar - reference) / reference).toBeLessThan(0.05);
  });

  test('PASS/FAIL diagnostic flags an invalid input (T above critical temperature)', async ({ page }) => {
    await page.goto(APP_PATH);
    await page.evaluate(() => {
      window.AppThermoEngine.state.inputs.category = 'refrigerant';
      window.AppThermoEngine.state.inputs.fluid = 'NH3';
      window.AppThermoEngine.state.inputs.mode = 'T';
      window.AppThermoEngine.state.inputs.T_C = 500; // far above NH3's critical temp (~132°C)
      window.AppThermoEngine.ui.showTab('calc');
      window.AppThermoEngine.ui.safeRun('runCalc');
    });
    await expect(page.locator('#diagBadge')).toContainText(/FAIL|vượt quá|không hợp lệ/i, { timeout: 5000 }).catch(async () => {
      // badge shows the first failing check message rather than the literal word FAIL
      await expect(page.locator('#diagBadge')).not.toContainText('PASS');
    });
  });
});

test.describe('Error safety net', () => {
  test('a thrown error inside a run*Calc function is caught by safeRun and shows a toast instead of crashing', async ({ page }) => {
    await page.goto(APP_PATH);
    await page.evaluate(() => {
      window.AppThermoEngine.state.activeCalcSub = 'insulation';
      window.AppThermoEngine.ui.showTab('calc');
      window.AppThermoEngine.ui.runInsulationCalc = () => { throw new Error('test-induced failure'); };
      window.AppThermoEngine.ui.safeRun('runInsulationCalc');
    });
    await expect(page.locator('#toastWrap')).toContainText('Lỗi tính toán');
    await expect(page.locator('#mainRoot')).toBeVisible();
  });

  test('a thrown error inside a render_* function shows the fallback card and the app recovers on next navigation', async ({ page }) => {
    await page.goto(APP_PATH);
    await page.evaluate(() => {
      window.AppThermoEngine.ui.render_psychro = () => { throw new Error('test-induced render failure'); };
      window.AppThermoEngine.state.activeCalcSub = 'psychro';
      window.AppThermoEngine.ui.showTab('calc');
    });
    await expect(page.locator('#mainRoot')).toContainText('Có lỗi khi hiển thị module này');

    await page.evaluate(() => {
      window.AppThermoEngine.state.activeCalcSub = 'lookup';
      window.AppThermoEngine.ui.showTab('calc');
    });
    await expect(page.locator('#mainRoot')).toContainText('Thông số đầu vào');
  });

  test('an uncaught global error still leaves the app usable (window.onerror safety net)', async ({ page }) => {
    await page.goto(APP_PATH);
    await page.evaluate(() => {
      setTimeout(() => { throw new Error('unrelated async failure'); }, 0);
    });
    await page.waitForTimeout(200);
    await expect(page.locator('#toastWrap')).toContainText('lỗi không mong muốn');
    // app still responds to normal navigation afterwards
    await page.evaluate(() => {
      window.AppThermoEngine.state.activeCalcSub = 'unitconv';
      window.AppThermoEngine.ui.showTab('calc');
    });
    await expect(page.locator('#mainRoot')).not.toContainText('Có lỗi khi hiển thị module này');
  });
});
