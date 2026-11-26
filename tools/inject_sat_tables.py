"""Ghi bảng bão hòa (JSON từ gen_sat_tables.py) vào AppThermoEngine.html, giữa hai dấu
/*SAT_TABLES_BEGIN*/ ... /*SAT_TABLES_END*/.  Chạy:
    python tools/gen_sat_tables.py > sat.json
    python tools/inject_sat_tables.py sat.json
"""
import sys, re, json
data = json.load(open(sys.argv[1], encoding='utf-8'))
p = 'AppThermoEngine.html'
s = open(p, encoding='utf-8', newline='').read()
block = '/*SAT_TABLES_BEGIN*/App.data.satTables = ' + json.dumps(data, separators=(',', ':')) + ';/*SAT_TABLES_END*/'
if '/*SAT_TABLES_BEGIN*/' in s:
    s = re.sub(r'/\*SAT_TABLES_BEGIN\*/.*?/\*SAT_TABLES_END\*/', lambda m: block, s, flags=re.S)
else:
    raise SystemExit('Không thấy cặp dấu /*SAT_TABLES_BEGIN*/ ... /*SAT_TABLES_END*/ trong ' + p)
open(p, 'w', encoding='utf-8', newline='').write(s)
print('ok', len(block))
