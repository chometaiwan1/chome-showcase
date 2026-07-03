import fs from "node:fs/promises";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Web/chome-showcase/outputs/inventory_20260624";
await fs.mkdir(outputDir, { recursive: true });

const rows = [
  ["寢具", "大三", "", 3, "件", "1", "03大三", "待確認", "品名筆跡不確定，可能為床組/枕套分類"],
  ["寢具", "大綠", "綠色", 2, "件", "1", "2大綠", "待確認", "位於頁首，分類需確認"],
  ["寢具", "大米", "米色", 12, "件", "1", "12大米", "待確認", "位於頁首，分類需確認"],
  ["寢具", "小米", "米色/小", 4, "件", "1", "4小米", "待確認", "位於頁首，分類需確認"],
  ["抱枕", "抱枕", "", 2, "件", "1", "2抱枕", "待確認", ""],
  ["枕頭", "枕頭", "", 9, "顆", "1", "9枕頭", "可辨識", ""],
  ["寢具", "大寢", "", 4, "件", "1", "4大寢", "待確認", "可能為大寢具/大枕套"],
  ["抱枕", "小抱枕", "", 3, "顆", "1", "3小抱枕", "可辨識", ""],
  ["抱枕", "小咖", "咖色", 1, "顆", "1", "小咖...x1", "待確認", "括號內容不清楚"],
  ["抱枕", "小灰", "灰色", 1, "顆", "1", "小灰...x1", "待確認", "括號內容不清楚"],
  ["電器", "電風扇", "", 1, "台", "1", "電風扇 x1", "可辨識", ""],
  ["寢具", "灰條", "灰條紋", 2, "件", "1", "灰條 x2（一大一小）", "可辨識", "一大一小"],
  ["燈具", "LED平板燈", "", 18, "盞", "1", "LED平板燈 (x18)", "可辨識", ""],
  ["燈具", "LED平板燈", "白光", 6, "盞", "1", "白光 x6", "可辨識", ""],
  ["燈具", "LED平板燈", "暖黃", 4, "盞", "1", "暖黃 x4", "可辨識", ""],
  ["燈具", "黑圓罩", "黑色", 1, "個", "1", "黑圓罩 x1", "可辨識", ""],
  ["收納/架類", "木衣架", "", 2, "件", "1", "木衣架...x2", "待確認", "前後文字不清楚"],
  ["建材/板材", "石膏天花木板", "黑色", 6, "片", "1", "石膏天花木板 黑 x6 B04", "待確認", "B04 是否為型號需確認"],
  ["收納/架類", "5層架", "藍色", 1, "座", "1", "5層架 x1（藍色）", "待確認", ""],
  ["收納/架類", "3層櫃", "橘銀", 1, "座", "1", "3層櫃（橘銀）x1", "待確認", ""],
  ["收納/架類", "4門頂櫃", "", 1, "座", "1", "4門頂櫃 x1", "待確認", "品名可能需校正"],
  ["地毯", "米毯", "米色", 2, "張", "1", "米毯（55x85）x2", "可辨識", "尺寸 55x85"],
  ["地毯", "黑米黃地毯", "黑/米/黃", 4, "張", "1", "黑米黃地毯（120x180）x4", "可辨識", "尺寸 120x180"],
  ["運動/其他", "雙高爾夫球網", "", 4, "組", "1", "雙...高爾夫球網 x4", "待確認", "前綴字不清楚"],
  ["寢具", "雙人床組", "白/櫻粉/米/芋/奶茶等", null, "組", "1", "雙人床組（白、櫻粉、米、芋、奶茶...）", "待確認", "原稿未清楚標出各色數量"],
  ["寢具", "雙人羽絨被", "", 1, "件", "1", "雙人羽絨被 x1", "可辨識", ""],

  ["毯類", "方用毯", "白", 1, "條", "2", "方用毯：白 x1", "可辨識", ""],
  ["毯類", "方用毯", "咖啡色", 1, "條", "2", "咖啡色 x1", "可辨識", ""],
  ["毯類", "方用毯", "深灰", 1, "條", "2", "深灰 x1", "可辨識", ""],
  ["毯類", "方用毯", "奶茶", 1, "條", "2", "奶茶 x1", "可辨識", ""],
  ["床組", "床組", "青霞", 2, "組", "2", "床組：青霞 x2", "待確認", "顏色字樣可能為青霞/青霧"],
  ["床組", "床組", "果綠", 2, "組", "2", "果綠 x2", "可辨識", ""],
  ["床組", "床組", "奶茶", 4, "組", "2", "奶茶 x4", "可辨識", ""],
  ["床組", "床組", "咖啡", 2, "組", "2", "咖啡 x2", "可辨識", ""],
  ["地毯", "地毯", "藻綠", null, "張", "2", "地毯 藻綠", "待確認", "未看清數量"],
  ["地毯", "地毯", "白", 9, "張", "2", "白 x9", "可辨識", ""],
  ["屏風/隔屏", "屏", "奶茶", 1, "件", "2", "屏：奶茶 x1", "待確認", "品名可能為屏風"],
  ["屏風/隔屏", "屏", "米", 1, "件", "2", "米 x1", "待確認", "品名可能為屏風"],
  ["屏風/隔屏", "屏", "白", 2, "件", "2", "白 x2", "待確認", "品名可能為屏風"],
  ["屏風/隔屏", "屏", "墨綠", 1, "件", "2", "墨綠 x1", "待確認", "品名可能為屏風"],
  ["被套", "被套", "藍灰", 1, "件", "2", "被套：藍灰 x1", "可辨識", ""],
  ["被套", "被套", "果灰", 1, "件", "2", "果灰 x1", "待確認", "顏色字樣較淡"],
  ["被套", "被套", "米", 1, "件", "2", "米 x1", "可辨識", ""],
  ["被套", "被套", "咖", 1, "件", "2", "咖 x1", "可辨識", ""],
  ["被套", "被套", "深咖", 1, "件", "2", "深咖 x1", "待確認", ""],
  ["被套", "被套", "綠", 1, "件", "2", "綠 x1", "可辨識", ""],
  ["被套", "被套", "芝", 1, "件", "2", "芝 x1", "待確認", "顏色名稱需確認"],
  ["被套", "被套", "淺綠", 1, "件", "2", "淺綠 x1", "可辨識", ""],
  ["被子", "被子", "雙人", 4, "件", "2", "被子：雙人 x4", "可辨識", ""],
  ["被子", "被子", "單人", 1, "件", "2", "單人 x1", "可辨識", ""],
  ["家具/板材", "百特", "破鞋持繩", 1, "件", "2", "百特（破鞋持繩）x1", "待確認", "品名與括號內容筆跡不確定"],
  ["家具/收納", "玫瑰金櫃", "60x80", 2, "座", "2", "玫瑰金櫃 x2（60x80）", "可辨識", ""],
  ["五金/桿件", "壁延桿", "", 1, "支", "2", "壁延桿 x1", "待確認", "品名可能需校正"],
  ["燈具", "雲暖燈架", "", 1, "座", "2", "雲暖燈架 x1", "待確認", "品名可能需校正"],
  ["家具/板材", "湯衣板", "", 1, "片", "2", "湯衣板 x1", "待確認", "品名可能需校正"],
  ["框畫/相框", "黑木框", "50x70", 4, "個", "2", "黑木框 x4（50x70）", "可辨識", ""],
  ["地墊", "黑色腳踏墊", "", 1, "張", "2", "黑色腳踏墊 x1", "可辨識", ""],
  ["框畫/相框", "黑框", "24x33", 2, "個", "2", "黑框 x2（24x33）", "可辨識", ""],

  ["家具", "木矮桌", "", 3, "張", "3", "木矮桌 x3", "可辨識", ""],
  ["裝飾品", "假書", "大", 43, "本", "3", "假書 大 x43", "可辨識", ""],
  ["裝飾品", "假書", "中", 4, "本", "3", "中 x4", "可辨識", ""],
  ["裝飾品", "假書", "小", 8, "本", "3", "小 x8", "可辨識", ""],
  ["裝飾品", "彩色鈎扣墊", "", 1, "件", "3", "彩色鈎扣墊 x1", "待確認", "品名可能需校正"],
  ["燈具", "壁燈", "", 4, "盞", "3", "壁燈 x4", "可辨識", "旁註另有奶茶/大墨石/百...等字樣，需確認是否為壁燈細項"],
  ["燈具", "壁燈", "奶茶", 1, "盞", "3", "（奶茶 x1）", "待確認", "疑似壁燈細項"],
  ["燈具", "壁燈", "大墨石", 1, "盞", "3", "（大墨石 x1）", "待確認", "疑似壁燈細項"],
  ["燈具", "壁燈", "百黃", 2, "盞", "3", "（百黃 x2）", "待確認", "疑似壁燈細項"],
  ["燈具", "壁燈", "百星", 5, "盞", "3", "（百星 x5）", "待確認", "疑似壁燈細項"],
];

const headers = ["類別", "品名", "規格/顏色", "數量", "單位", "來源頁", "原文辨識", "辨識狀態", "備註"];
const workbook = Workbook.create();
const sheet = workbook.worksheets.add("整理庫存");
sheet.showGridLines = false;
sheet.getRange("A1:I1").values = [headers];
sheet.getRangeByIndexes(1, 0, rows.length, headers.length).values = rows;

const used = sheet.getRangeByIndexes(0, 0, rows.length + 1, headers.length);
used.format.font = { name: "Microsoft JhengHei", size: 10, color: "#1F2937" };
sheet.getRange("A1:I1").format = {
  fill: "#1F4E5F",
  font: { bold: true, color: "#FFFFFF", name: "Microsoft JhengHei", size: 10 },
};
used.format.borders = {
  insideHorizontal: { style: "thin", color: "#E5E7EB" },
  bottom: { style: "thin", color: "#CBD5E1" },
};
sheet.getRange(`D2:D${rows.length + 1}`).format.numberFormat = "#,##0";
sheet.getRange(`A2:C${rows.length + 1}`).format.wrapText = true;
sheet.getRange(`G2:I${rows.length + 1}`).format.wrapText = true;
sheet.getRange("A:A").format.columnWidth = 13;
sheet.getRange("B:B").format.columnWidth = 18;
sheet.getRange("C:C").format.columnWidth = 18;
sheet.getRange("D:D").format.columnWidth = 9;
sheet.getRange("E:E").format.columnWidth = 8;
sheet.getRange("F:F").format.columnWidth = 8;
sheet.getRange("G:G").format.columnWidth = 30;
sheet.getRange("H:H").format.columnWidth = 12;
sheet.getRange("I:I").format.columnWidth = 34;
sheet.freezePanes.freezeRows(1);
sheet.tables.add(`A1:I${rows.length + 1}`, true, "InventoryTable");
sheet.getRange(`H2:H${rows.length + 1}`).conditionalFormats.add("containsText", {
  text: "待確認",
  format: { fill: "#FEF3C7", font: { color: "#92400E" } },
});
sheet.getRange(`H2:H${rows.length + 1}`).conditionalFormats.add("containsText", {
  text: "可辨識",
  format: { fill: "#DCFCE7", font: { color: "#166534" } },
});

const categories = [...new Set(rows.map((r) => r[0]))].sort((a, b) => a.localeCompare(b, "zh-Hant"));
const summary = workbook.worksheets.add("類別彙總");
summary.showGridLines = false;
summary.getRange("A1:D1").values = [["類別", "品項筆數", "可加總數量", "待確認筆數"]];
summary.getRangeByIndexes(1, 0, categories.length, 1).values = categories.map((c) => [c]);
summary.getRange(`B2`).formulas = [[`=COUNTIF('整理庫存'!$A$2:$A$${rows.length + 1},A2)`]];
summary.getRange(`B2:B${categories.length + 1}`).fillDown();
summary.getRange(`C2`).formulas = [[`=SUMIF('整理庫存'!$A$2:$A$${rows.length + 1},A2,'整理庫存'!$D$2:$D$${rows.length + 1})`]];
summary.getRange(`C2:C${categories.length + 1}`).fillDown();
summary.getRange(`D2`).formulas = [[`=COUNTIFS('整理庫存'!$A$2:$A$${rows.length + 1},A2,'整理庫存'!$H$2:$H$${rows.length + 1},"待確認")`]];
summary.getRange(`D2:D${categories.length + 1}`).fillDown();
summary.getRange(`A1:D${categories.length + 1}`).format.font = { name: "Microsoft JhengHei", size: 10, color: "#1F2937" };
summary.getRange("A1:D1").format = {
  fill: "#1F4E5F",
  font: { bold: true, color: "#FFFFFF", name: "Microsoft JhengHei", size: 10 },
};
summary.getRange(`B2:D${categories.length + 1}`).format.numberFormat = "#,##0";
summary.getRange("A:A").format.columnWidth = 16;
summary.getRange("B:D").format.columnWidth = 14;
summary.tables.add(`A1:D${categories.length + 1}`, true, "CategorySummaryTable");
summary.freezePanes.freezeRows(1);

const notes = workbook.worksheets.add("欄位說明");
notes.showGridLines = false;
notes.getRange("A1:B6").values = [
  ["欄位", "說明"],
  ["辨識狀態", "可辨識表示掃描件上較清楚；待確認表示筆跡淡、品名不完整或數量需回頭核對。"],
  ["來源頁", "對應原始 PDF 第幾頁。"],
  ["原文辨識", "盡量保留掃描件上的原始寫法，方便與原稿比對。"],
  ["數量空白", "表示有看到品名，但原稿未能可靠判讀數量。"],
  ["建議", "匯入 Google Sheets 前，先篩選辨識狀態為待確認的列逐筆校對。"],
];
notes.getRange("A1:B1").format = {
  fill: "#1F4E5F",
  font: { bold: true, color: "#FFFFFF", name: "Microsoft JhengHei", size: 10 },
};
notes.getRange("A1:B6").format.font = { name: "Microsoft JhengHei", size: 10, color: "#1F2937" };
notes.getRange("A:A").format.columnWidth = 14;
notes.getRange("B:B").format.columnWidth = 76;
notes.getRange("B:B").format.wrapText = true;

const check = await workbook.inspect({
  kind: "table",
  range: "整理庫存!A1:I8",
  include: "values,formulas",
  tableMaxRows: 8,
  tableMaxCols: 9,
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
  sheetName: "整理庫存",
  range: "A1:I24",
  scale: 1,
  format: "png",
});
await fs.writeFile(`${outputDir}/inventory_preview.png`, new Uint8Array(await preview.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}/inventory_from_scan_20260624.xlsx`);
console.log(`${outputDir}/inventory_from_scan_20260624.xlsx`);
