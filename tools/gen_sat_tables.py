"""Sinh bảng bão hòa môi chất lạnh cho AppThermoEngine từ CoolProp.

Chạy:  python tools/gen_sat_tables.py > tools/sat_tables.js
rồi dán nội dung vào khối App.data.satTables trong AppThermoEngine.html
(hoặc dùng tools/inject_sat_tables.py).

Cột mỗi dòng: [T_C, P_bub_bar, P_dew_bar, rhoL, rhoV, hfg, cpL, muL, muV]
- rhoL, cpL, muL: lỏng bão hòa (Q=0) tại T  -> T hiểu là nhiệt độ điểm sôi (bubble)
- rhoV, muV:      hơi bão hòa (Q=1) tại T  -> T hiểu là nhiệt độ điểm sương (dew)
- hfg = h(P_dew,Q=1) - h(P_dew,Q=0): ẩn nhiệt tại CÙNG áp suất bay hơi (đúng cho dàn bay hơi,
  kể cả môi chất hỗn hợp có trượt nhiệt độ).
Đơn vị: bar, kg/m3, kJ/kg, kJ/kg.K, mPa.s
"""
import json, math
import CoolProp
import CoolProp.CoolProp as CP

# key app -> (tên CoolProp cho cân bằng pha, tên CoolProp cho độ nhớt hoặc None, Tmin_C, Tmax_C)
FLUIDS = {
    'NH3':     ('Ammonia',        'Ammonia',        -60, 60),
    'CO2':     ('CarbonDioxide',  'CarbonDioxide',  -56, 28),
    'R22':     ('R22',            'R22',            -60, 60),
    'R134a':   ('R134a',          'R134a',          -60, 65),
    'R32':     ('R32',            'R32',            -60, 60),
    'R410A':   ('R410A.mix',      'R410A',          -60, 60),
    'R404A':   ('R404A.mix',      'R404A',          -60, 60),
    'R507A':   ('R507A.mix',      'R507A',          -60, 60),
    'R449A':   ('R449A.mix',      None,             -60, 60),
    'R407C':   ('R407C.mix',      'R407C',          -60, 60),
    'R290':    ('n-Propane',      'n-Propane',      -60, 65),
    'R600a':   ('IsoButane',      'IsoButane',      -40, 80),
    'R1234yf': ('R1234yf',        'R1234yf',        -60, 65),
    'R1234ze': ('R1234ze(E)',     'R1234ze(E)',     -40, 80),
    'R23':     ('R23',            'R23',            -100, 22),
    'R508B':   ('R508B.mix',      'R508B.mix',      -100, 8),
}
STEP = 2

def sig(x, n=5):
    if x is None or x == 0 or not math.isfinite(x):
        return x
    return float(f'{x:.{n}g}')

out = {'source': f'CoolProp {CoolProp.__version__}', 'cols': ['T_C','Pb','Pd','rhoL','rhoV','hfg','cpL','muL','muV'], 'fluids': {}}
for key, (eq, tr, tmin, tmax) in FLUIDS.items():
    rows = []
    for T_C in range(tmin, tmax + 1, STEP):
        T = T_C + 273.15
        try:
            Pb = CP.PropsSI('P', 'T', T, 'Q', 0, eq)
            Pd = CP.PropsSI('P', 'T', T, 'Q', 1, eq)
            rhoL = CP.PropsSI('D', 'T', T, 'Q', 0, eq)
            rhoV = CP.PropsSI('D', 'T', T, 'Q', 1, eq)
            if abs(Pb - Pd) / Pb < 1e-4:   # môi chất đơn / gần đẳng phí: tính theo T cho ổn định
                hV = CP.PropsSI('H', 'T', T, 'Q', 1, eq)
                hL = CP.PropsSI('H', 'T', T, 'Q', 0, eq)
            else:                           # hỗn hợp có trượt: cùng áp suất bay hơi P_dew
                hV = CP.PropsSI('H', 'P', Pd, 'Q', 1, eq)
                hL = CP.PropsSI('H', 'P', Pd, 'Q', 0, eq)
        except Exception:
            continue
        try:
            cpL = CP.PropsSI('C', 'T', T, 'Q', 0, tr or eq)
        except Exception:
            cpL = None
        muL = muV = None
        if tr:
            try:
                muL = CP.PropsSI('V', 'T', T, 'Q', 0, tr) * 1e3
                muV = CP.PropsSI('V', 'T', T, 'Q', 1, tr) * 1e3
            except Exception:
                muL = muV = None
        rows.append([T_C, sig(Pb/1e5), sig(Pd/1e5), sig(rhoL), sig(rhoV), sig((hV-hL)/1e3),
                     sig(cpL/1e3) if cpL else None, sig(muL, 4) if muL else None, sig(muV, 4) if muV else None])
    out['fluids'][key] = rows

print(json.dumps(out, separators=(',', ':')))
