// @ts-check
// Menu "Tính Toán" xếp theo chuyên ngành; Lubricant Mycom đã chuyển sang MYCOMselect.
const path = require('path');
const { test, expect } = require('@playwright/test');

const APP_PATH = 'file://' + path.resolve(__dirname, '..', 'AppThermoEngine.html');

test.beforeEach(async ({ page }) => { await page.goto(APP_PATH); });

test('sidebar có đủ nhóm chuyên ngành, mỗi công cụ thuộc đúng một nhóm', async ({ page }) => {
  const nav = page.locator('#tabNavDesktop');
  for (const g of ['Lạnh công nghiệp', 'HVAC & Nước', 'Cách nhiệt & Kho lạnh', 'Điện', 'Kho vận', 'Tra cứu chung']) {
    await expect(nav).toContainText(g);
  }
  const r = await page.evaluate(() => {
    const ui = window.AppThermoEngine.ui;
    const groups = new Set(ui.CALC_GROUPS.map(g => g.id));
    return {
      allGrouped: ui.CALC_SUBS.every(s => groups.has(s.group)),
      buttons: document.querySelectorAll('#tabNavDesktop .nav-subbtn').length,
      subs: ui.CALC_SUBS.length,
    };
  });
  expect(r.allGrouped).toBe(true);
  expect(r.buttons).toBe(r.subs);
});

test('Lubricant đã gỡ; link sang MYCOMselect; phiên cũ đang mở lubricant về Tra cứu', async ({ page }) => {
  const link = page.locator('#tabNavDesktop a.nav-extlink');
  await expect(link).toHaveAttribute('href', '../MYCOMselect/#dau-nap');
  const ids = await page.evaluate(() => window.AppThermoEngine.ui.CALC_SUBS.map(s => s.id));
  expect(ids).not.toContain('lubricant');
  await page.evaluate(() => {
    const A = window.AppThermoEngine;
    A.state.activeCalcSub = 'lubricant';
    A.ui.showTab('calc');
  });
  await expect(page.locator('#mainRoot')).not.toContainText('Có lỗi khi hiển thị module này');
  expect(await page.evaluate(() => window.AppThermoEngine.state.activeCalcSub)).toBe('lookup');
});
