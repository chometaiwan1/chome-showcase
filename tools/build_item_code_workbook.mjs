import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const inputJson = "C:/Web/chome-showcase/tmp/inventory_records.json";
const outputDir = "C:/Web/chome-showcase/outputs/item_codes_20260624";
await fs.mkdir(outputDir, { recursive: true });

const records = JSON.parse(await fs.readFile(inputJson, "utf8"));

const categoryCodes = {
  "抱枕": "CUS",
  "枕頭": "PIL",
  "電器": "ELE",
  "寢具": "BED",
  "燈具": "LGT",
  "傢俱": "FUR",
  "家具": "FUR",
  "收納": "STO",
  "建材": "BLD",
  "梯類": "LDR",
  "工具": "TLS",
  "地毯": "RUG",
  "毯類": "BKT",
  "床組": "BST",
  "畫框": "FRM",
  "裝飾": "DEC",
  "車用": "CAR",
};

const categoryNames = {
  CUS: "抱枕",
  PIL: "枕頭",
  ELE: "電器",
  BED: "寢具",
  LGT: "燈具",
  FUR: "家具/傢俱",
  STO: "收納",
  BLD: "建材",
  LDR: "梯類",
  TLS: "工具",
  RUG: "地毯",
  BKT: "毯類",
  BST: "床組",
  FRM: "畫框",
  DEC: "裝飾",
  CAR: "車用",
};

const seqByCode = new Map();
const itemRows = [];
const labelRows = [];

for (const record of records) {
  const rawCategory = String(record["類別"] ?? "").trim();
  const code = categoryCodes[rawCategory] ?? "OTH";
  const next = (seqByCode.get(code) ?? 0) + 1;
  seqByCode.set(code, next);
  const itemTypeId = `JX-${code}-${String(next).padStart(3, "0")}`;
  const qty = Number.isFinite(Number(record["數量"])) ? Number(record["數量"]) : null;
  const unit = record["單位"] ?? "";
  const name = record["品名"] ?? "";
  const spec = record["規格/顏色"] ?? "";
  const page = record["來源頁"] ?? "";
  const singleStart = qty && qty > 0 ? `${itemTypeId}-001` : "";
  const singleEnd = qty && qty > 0 ? `${itemTypeId}-${String(qty).padStart(3, "0")}` : "";
  const range = singleStart && singleEnd ? `${singleStart} ~ ${singleEnd}` : "";
  itemRows.push([
    itemTypeId,
    code,
    rawCategory,
    name,
    spec,
    qty,
    unit,
    range,
    page,
    `${rawCategory}-${name}-${spec}`.replace(/-+$/g, ""),
  ]);

  if (qty && qty > 0) {
    for (let i = 1; i <= qty; i += 1) {
      labelRows.push([
        `${itemTypeId}-${String(i).padStart(3, "0")}`,
        itemTypeId,
        rawCategory,
        name,
        spec,
        unit,
        page,
        "在庫",
        "公司倉庫",
      ]);
    }
  }
}

const workbook = Workbook.create();

const itemSheet = workbook.worksheets.add("品項編號表");
itemSheet.showGridLines = false;
const itemHeaders = [
  "品項編號",
  "類別碼",
  "類別",
  "品名",
  "規格/顏色",
  "數量",
  "單位",
  "單件編號範圍",
  "來源頁",
  "辨識鍵",
];
itemSheet.getRangeByIndexes(0, 0, 1, itemHeaders.length).values = [itemHeaders];
itemSheet.getRangeByIndexes(1, 0, itemRows.length, itemHeaders.length).values = itemRows;
itemSheet.tables.add(`A1:J${itemRows.length + 1}`, true, "ItemCodeTable");
itemSheet.freezePanes.freezeRows(1);

const labelSheet = workbook.worksheets.add("單件標籤清單");
labelSheet.showGridLines = false;
const labelHeaders = [
  "單件物品編號",
  "品項編號",
  "類別",
  "品名",
  "規格/顏色",
  "單位",
  "來源頁",
  "初始狀態",
  "初始位置",
];
labelSheet.getRangeByIndexes(0, 0, 1, labelHeaders.length).values = [labelHeaders];
labelSheet.getRangeByIndexes(1, 0, labelRows.length, labelHeaders.length).values = labelRows;
labelSheet.tables.add(`A1:I${labelRows.length + 1}`, true, "SingleItemLabelTable");
labelSheet.freezePanes.freezeRows(1);

const ruleSheet = workbook.worksheets.add("編號規則");
ruleSheet.showGridLines = false;
const sortedCodes = Object.entries(categoryNames).sort((a, b) => a[0].localeCompare(b[0]));
const ruleRows = [
  ["規則", "JX-類別碼-品項序號-單件序號"],
  ["品項編號範例", "JX-CUS-001"],
  ["單件編號範例", "JX-CUS-001-001"],
  ["用途", "品項編號代表同款同規格；單件物品編號代表每一件實體物品，適合貼 QR Code。"],
  ["序號原則", "同一類別碼內依目前表格順序從 001 起編；未來新增品項延續該類別最大序號。"],
  ["公司代碼", "JX = 晶鑫"],
  [null, null],
  ["類別碼", "類別"],
  ...sortedCodes.map(([code, name]) => [code, name]),
];
ruleSheet.getRangeByIndexes(0, 0, ruleRows.length, 2).values = ruleRows;

for (const sheet of [itemSheet, labelSheet]) {
  const used = sheet.getUsedRange();
  used.format.font = { name: "Microsoft JhengHei", size: 10, color: "#1F2937" };
  sheet.getRange("A1:J1").format = {
    fill: "#1F4E5F",
    font: { bold: true, color: "#FFFFFF", name: "Microsoft JhengHei", size: 10 },
  };
  used.format.borders = {
    insideHorizontal: { style: "thin", color: "#E5E7EB" },
    bottom: { style: "thin", color: "#CBD5E1" },
  };
  used.format.wrapText = true;
}

itemSheet.getRange("A:A").format.columnWidth = 18;
itemSheet.getRange("B:B").format.columnWidth = 10;
itemSheet.getRange("C:E").format.columnWidth = 14;
itemSheet.getRange("F:G").format.columnWidth = 9;
itemSheet.getRange("H:H").format.columnWidth = 32;
itemSheet.getRange("I:I").format.columnWidth = 9;
itemSheet.getRange("J:J").format.columnWidth = 34;
itemSheet.getRange(`F2:F${itemRows.length + 1}`).format.numberFormat = "#,##0";

labelSheet.getRange("A:B").format.columnWidth = 20;
labelSheet.getRange("C:E").format.columnWidth = 14;
labelSheet.getRange("F:I").format.columnWidth = 12;

ruleSheet.getRange("A1:B1").format = {
  fill: "#1F4E5F",
  font: { bold: true, color: "#FFFFFF", name: "Microsoft JhengHei", size: 10 },
};
ruleSheet.getRangeByIndexes(0, 0, ruleRows.length, 2).format.font = {
  name: "Microsoft JhengHei",
  size: 10,
  color: "#1F2937",
};
ruleSheet.getRange("A:A").format.columnWidth = 16;
ruleSheet.getRange("B:B").format.columnWidth = 76;
ruleSheet.getRange("B:B").format.wrapText = true;

const check = await workbook.inspect({
  kind: "table",
  range: "品項編號表!A1:J12",
  include: "values,formulas",
  tableMaxRows: 12,
  tableMaxCols: 10,
});
console.log(check.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 50 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

const preview = await workbook.render({
  sheetName: "品項編號表",
  range: "A1:J24",
  scale: 1,
  format: "png",
});
await fs.writeFile(`${outputDir}/item_code_preview.png`, new Uint8Array(await preview.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}/inventory_item_codes_20260624.xlsx`);
console.log(`${outputDir}/inventory_item_codes_20260624.xlsx`);
