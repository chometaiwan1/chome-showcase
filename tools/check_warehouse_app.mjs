import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto("http://127.0.0.1:4173/warehouse.html");
await page.waitForSelector("#metricInStock");

const title = await page.locator("h1").textContent();
const initialInStock = await page.locator("#metricInStock").textContent();

await page.fill("#itemSearch", "JX-CUS-001-001");
await page.click('.quick-item[data-id="JX-CUS-001-001"]');
await page.selectOption("#actionType", "出庫");
await page.fill("#toLocation", "中山區測試物件");
await page.fill("#operatorName", "測試人員");
await page.fill("#movementNote", "自動測試");
await page.click("button.primary-action");
await page.waitForTimeout(250);

const selectedStatus = await page.locator("#selectedStatus").textContent();
const selectedLocation = await page.locator("#selectedLocation").textContent();
const selectedHistory = await page.locator("#selectedHistoryCount").textContent();
const outCount = await page.locator("#metricOut").textContent();

console.log(JSON.stringify({
  title,
  initialInStock,
  selectedStatus,
  selectedLocation,
  selectedHistory,
  outCount,
}, null, 2));

await browser.close();
