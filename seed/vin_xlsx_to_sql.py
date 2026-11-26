"""Chuyển file "Số khung.xlsx" của cửa hàng thành SQL để nạp vào D1.
Dùng: python3 seed/vin_xlsx_to_sql.py "So khung.xlsx" > seed/vin.sql
"""
import json, sys
from openpyxl import load_workbook

PART_COLS = ['Lốc', 'Dàn nóng', 'Dàn lạnh', 'Quạt dàn nóng', 'Quạt dàn lạnh', 'Van tiết lưu', 'Van áp suất']
FIX = {'Sanfafe': 'Santafe', 'Pajerosport': 'Pajero Sport', 'CRV': 'CR-V'}

def q(v):
    if v is None or str(v).strip() == '':
        return 'NULL'
    return "'" + str(v).strip().replace("'", "''") + "'"

def header_map(ws):
    h = [str(c.value).strip() if c.value else '' for c in ws[1]]
    return {name: i for i, name in enumerate(h)}

wb = load_workbook(sys.argv[1], data_only=True)
out = ['DELETE FROM vin_wmi;', 'DELETE FROM vin_vds;', 'DELETE FROM vin_old;']

for r in wb['WMI_Data'].iter_rows(min_row=2, values_only=True):
    if r[0]:
        out.append(f"INSERT OR REPLACE INTO vin_wmi (code, make, country) VALUES ({q(r[0])},{q(r[1])},{q(r[2])});")

ws = wb['VDS_Data']; hm = header_map(ws)
for r in ws.iter_rows(min_row=2, values_only=True):
    if not r[0]:
        continue
    model = r[2]
    if isinstance(model, (int, float)):  # Mazda ghi "2", "3"
        model = f"Mazda {int(model)}"
    model = FIX.get(str(model).strip(), str(model).strip())
    parts = {p: str(r[hm[p]]).strip() for p in PART_COLS if p in hm and r[hm[p]] not in (None, '')}
    out.append(
        f"INSERT OR REPLACE INTO vin_vds (wmi, vds, model, engine, parts) VALUES "
        f"({q(r[0])},{q(r[1])},{q(model)},{q(r[3])},{q(json.dumps(parts, ensure_ascii=False))});"
    )

ws = wb['OLD_VIN_Data']; hm = header_map(ws)
for r in ws.iter_rows(min_row=2, values_only=True):
    if not r[0]:
        continue
    parts = {p: str(r[hm[p]]).strip() for p in PART_COLS if p in hm and r[hm[p]] not in (None, '')}
    year = int(r[4]) if isinstance(r[4], (int, float)) else None
    out.append(
        f"INSERT OR REPLACE INTO vin_old (prefix, make, model, engine, year, country, parts) VALUES "
        f"({q(r[0])},{q(r[1])},{q(r[2])},{q(r[3])},{year if year else 'NULL'},{q(r[5])},{q(json.dumps(parts, ensure_ascii=False))});"
    )

print('\n'.join(out))
