// @ts-check
// Kiểm tra các sửa lỗi logic thiết kế (nhánh fix/logic-thiet-ke).
// Giá trị chuẩn lấy từ CoolProp 6.6 / NIST REFPROP; dung sai đủ rộng cho nội suy bảng 2 K.
const path = require('path');
const { test, expect } = require('@playwright/test');

const APP_PATH = 'file://' + path.resolve(__dirname, '..', 'AppThermoEngine.html');

const near = (actual, expected, relTol) =>
  expect(Math.abs(actual - expected) / Math.abs(expected)).toBeLessThan(relTol);

test.beforeEach(async ({ page }) => { await page.goto(APP_PATH); });

test('tính chất môi chất lấy từ bảng bão hòa, khớp NIST', async ({ page }) => {
  const r = await page.evaluate(() => {
    const T = window.AppThermoEngine.calc.thermo;
    return {
      nh3m10: T.refrigerantProps('NH3', 'T', -10, null),
      nh3p35: T.refrigerantProps('NH3', 'T', 35, null),
      co2m30: T.refrigerantProps('CO2', 'T', -30, null),
      r407c: T.refrigerantProps('R407C', 'T', -25, null),
      byP: T.refrigerantProps('NH3', 'P', null, 2.906),
      outside: T.refrigerantProps('NH3', 'T', -70, null),
    };
  });
  expect(r.nh3m10.source).toBe('table');
  near(r.nh3m10.Psat_bar, 2.908, 0.005);
  near(r.nh3m10.rhoLiq_kgm3, 652.0, 0.005);
  near(r.nh3m10.rhoVap_kgm3, 2.39, 0.01);
  near(r.nh3m10.latentHeat_kJkg, 1296, 0.005);
  near(r.nh3p35.rhoVap_kgm3, 10.45, 0.01);
  near(r.co2m30.latentHeat_kJkg, 303.5, 0.01);   // bản cũ: 163 (−44%)
  expect(r.r407c.glide).toBe(true);
  expect(r.r407c.Pbub_bar).toBeGreaterThan(r.r407c.Psat_bar);
  expect(Math.abs(r.byP.T_C - (-10))).toBeLessThan(0.05);
  expect(r.outside.source).toBe('correlation');  // ngoài bảng: dự phòng, có cảnh báo
  expect(r.outside.formula).toContain('NGOÀI phạm vi');
});

test('ống hồi dịch bơm tính theo dòng 2 pha, không ra DN15', async ({ page }) => {
  const rec = await page.evaluate(() => {
    const A = window.AppThermoEngine;
    const hfg = A.calc.thermo.refrigerantProps('NH3', 'T', -10, null).latentHeat_kJkg;
    const m = 3 * 200 / hfg;
    return A.calc.advancedPiping.sizeCategory('pump_wet_return', m, 'NH3', -10, 30, 'CS_Sch40', 1 / 3).recommended;
  });
  expect(['DN100 (4")', 'DN125 (5")']).toContain(rec.dn);
  expect(rec.ok).toBe(true);
});

test('cách nhiệt: h₀ mặc định là không khí lặng, h₀ lớn có cảnh báo', async ({ page }) => {
  const ho = await page.evaluate(() => window.AppThermoEngine.state.insulation.ho);
  expect(ho).toBeLessThanOrEqual(9);
  await page.evaluate(() => {
    const A = window.AppThermoEngine;
    A.state.insulation.ho = 23;
    A.state.activeCalcSub = 'insulation';
    A.ui.showTab('calc');
  });
  await expect(page.locator('#resultGridIns')).toContainText('MỎNG hơn thực tế');
});

test('sụt áp dùng điện trở ở nhiệt độ làm việc', async ({ page }) => {
  const r = await page.evaluate(() => {
    const VD = window.AppThermoEngine.calc.voltagedrop;
    return { xlpe: VD.rhoAt('Cu', 'XLPE'), pvc: VD.rhoAt('Cu', 'PVC'), lim: VD.lightingLimitPct };
  });
  near(r.xlpe, 0.0179 * (1 + 0.00393 * 70), 1e-6);
  near(r.pvc, 0.0179 * (1 + 0.00393 * 50), 1e-6);
  expect(r.lim).toBe(3);
});

test('panel kho đông −20°C: độ dày theo dòng nhiệt ≥ 125 mm', async ({ page }) => {
  await page.evaluate(() => {
    const A = window.AppThermoEngine, ins = A.state.insulation;
    Object.assign(ins, { applicationType: 'wall_panel', geometry: 'wall', kCustom: 0.022, Ta: 35, Ts: -20, RH: 80, qTarget: 8 });
    A.state.activeCalcSub = 'insulation';
    A.ui.showTab('calc');
  });
  const res = await page.evaluate(() => window.AppThermoEngine.state.insulationResult);
  expect(res.governs).toBe('flux');
  expect(res.tMin_mm).toBeGreaterThanOrEqual(125);
});

test('M3 không còn loại ống môi chất lạnh; dự án cũ được đưa về mặc định', async ({ page }) => {
  const keys = await page.evaluate(() => Object.keys(window.AppThermoEngine.data.velocityGuideline));
  for (const k of ['suction_gas', 'discharge_gas', 'liquid_pump', 'liquid_gravity']) expect(keys).not.toContain(k);
  await page.evaluate(() => {
    const A = window.AppThermoEngine;
    A.state.pipeSizing.category = 'suction_gas';
    A.state.activeCalcSub = 'pipesizing';
    A.ui.showTab('calc');
  });
  await expect(page.locator('#mainRoot')).not.toContainText('Có lỗi khi hiển thị module này');
  expect(await page.evaluate(() => window.AppThermoEngine.state.pipeSizing.category)).toBe('liquid_secondary');
});
