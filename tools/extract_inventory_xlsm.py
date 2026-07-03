import json
import sys

import openpyxl


source, output = sys.argv[1], sys.argv[2]
workbook = openpyxl.load_workbook(
    source, read_only=True, data_only=True, keep_vba=True
)
sheet = workbook["整理庫存"]
sheet.reset_dimensions()

rows = list(sheet.iter_rows(values_only=True))
headers = list(rows[0])
records = []
for row in rows[1:]:
    if not any(value is not None for value in row):
        continue
    padded = list(row) + [None] * (len(headers) - len(row))
    record = dict(zip(headers, padded[: len(headers)]))
    qty = record.get("數量")
    if isinstance(qty, float) and qty.is_integer():
        record["數量"] = int(qty)
    source_page = record.get("來源頁")
    if isinstance(source_page, float) and source_page.is_integer():
        record["來源頁"] = int(source_page)
    records.append(record)

with open(output, "w", encoding="utf-8") as file:
    json.dump(records, file, ensure_ascii=False, indent=2)
