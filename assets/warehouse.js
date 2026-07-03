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

const storageKeys = {
  items: "jxWarehouse.items.v1",
  movements: "jxWarehouse.movements.v1",
  operator: "jxWarehouse.operator",
  appsScriptUrl: "jxWarehouse.appsScriptUrl",
};

const state = {
  items: [],
  movements: [],
  selectedId: "",
  scannerStream: null,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const statusMap = {
  "在庫": "status-in",
  "已出庫": "status-out",
  "維修中": "status-repair",
  "報廢": "status-repair",
};

function nowText() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toast(message) {
  const node = $("#toast");
  node.textContent = message;
  node.classList.add("show");
  window.setTimeout(() => node.classList.remove("show"), 2400);
}

function movementStatus(action) {
  if (action === "出庫") return "已出庫";
  if (action === "維修") return "維修中";
  if (action === "報廢") return "報廢";
  return "在庫";
}

function buildSeedItems(records) {
  const seqByCode = new Map();
  const items = [];

  for (const record of records) {
    const category = String(record["類別"] ?? "").trim();
    const code = categoryCodes[category] ?? "OTH";
    const next = (seqByCode.get(code) ?? 0) + 1;
    seqByCode.set(code, next);
    const typeId = `JX-${code}-${String(next).padStart(3, "0")}`;
    const qty = Number(record["數量"]) || 0;

    for (let i = 1; i <= qty; i += 1) {
      items.push({
        id: `${typeId}-${String(i).padStart(3, "0")}`,
        typeId,
        category,
        name: record["品名"] ?? "",
        spec: record["規格/顏色"] ?? "",
        unit: record["單位"] ?? "",
        sourcePage: record["來源頁"] ?? "",
        status: "在庫",
        location: "公司倉庫",
        lastMovedAt: "",
      });
    }
  }

  return items;
}

async function loadData() {
  const cachedItems = localStorage.getItem(storageKeys.items);
  const cachedMovements = localStorage.getItem(storageKeys.movements);

  if (cachedItems) {
    state.items = JSON.parse(cachedItems);
  } else {
    const response = await fetch("assets/warehouse-data.json");
    const records = await response.json();
    state.items = buildSeedItems(records);
    saveItems();
  }

  state.movements = cachedMovements ? JSON.parse(cachedMovements) : [];
  $("#operatorName").value = localStorage.getItem(storageKeys.operator) ?? "";
  $("#appsScriptUrl").value = localStorage.getItem(storageKeys.appsScriptUrl) ?? "";
  updateSyncState();
}

function saveItems() {
  localStorage.setItem(storageKeys.items, JSON.stringify(state.items));
}

function saveMovements() {
  localStorage.setItem(storageKeys.movements, JSON.stringify(state.movements));
}

function updateSyncState() {
  const hasUrl = Boolean(localStorage.getItem(storageKeys.appsScriptUrl));
  $("#syncState").textContent = hasUrl ? "Google Sheets 已設定" : "本機模式";
}

function renderMetrics() {
  $("#metricInStock").textContent = state.items.filter((item) => item.status === "在庫").length;
  $("#metricOut").textContent = state.items.filter((item) => item.status === "已出庫").length;
  $("#metricRepair").textContent = state.items.filter((item) => item.status === "維修中").length;
}

function itemLabel(item) {
  return `${item.category} ${item.name}${item.spec ? ` / ${item.spec}` : ""}`;
}

function scoreItem(item, keyword) {
  const text = `${item.id} ${item.typeId} ${item.category} ${item.name} ${item.spec} ${item.location}`.toLowerCase();
  return text.includes(keyword.toLowerCase());
}

function setSelectedItem(itemId) {
  const item = state.items.find((entry) => entry.id === itemId);
  if (!item) return;

  state.selectedId = item.id;
  $("#selectedItemId").textContent = item.id;
  $("#actionTarget").textContent = item.id;
  $("#selectedName").textContent = `${item.category} ${item.name}`;
  $("#selectedSpec").textContent = item.spec || "-";
  $("#selectedStatus").textContent = item.status;
  $("#selectedLocation").textContent = item.location;
  $("#selectedType").textContent = item.typeId;
  $("#selectedMovedAt").textContent = item.lastMovedAt || "-";
  $("#itemSearch").value = item.id;
  renderSelectedHistory();
}

function renderQuickList() {
  const keyword = $("#itemSearch").value.trim();
  const list = $("#quickList");
  const matches = (keyword ? state.items.filter((item) => scoreItem(item, keyword)) : state.items)
    .slice(0, 7);

  list.innerHTML = matches.map((item) => `
    <button class="quick-item" type="button" data-id="${item.id}">
      <strong>${item.id}</strong>
      <span>${itemLabel(item)} · ${item.status} · ${item.location}</span>
    </button>
  `).join("");
}

function statusBadge(status) {
  return `<span class="status ${statusMap[status] ?? "status-out"}">${status}</span>`;
}

function renderInventory() {
  const keyword = $("#inventoryFilter").value.trim();
  const status = $("#statusFilter").value;
  const rows = state.items
    .filter((item) => !status || item.status === status)
    .filter((item) => !keyword || scoreItem(item, keyword))
    .slice(0, 500);

  $("#inventoryTable").innerHTML = rows.map((item) => `
    <tr data-id="${item.id}">
      <td>${item.id}</td>
      <td>${item.category}</td>
      <td>${item.name}</td>
      <td>${item.spec || ""}</td>
      <td>${statusBadge(item.status)}</td>
      <td>${item.location}</td>
    </tr>
  `).join("");
}

function movementCard(movement) {
  return `
    <article class="movement-card">
      <time>${movement.timestamp}</time>
      <strong>${movement.action}</strong>
      <div>
        <strong>${movement.itemId}</strong>
        <span>${movement.fromLocation || "-"} → ${movement.toLocation || "-"}</span>
        <span>${movement.operator ? ` · ${movement.operator}` : ""}${movement.note ? ` · ${movement.note}` : ""}</span>
      </div>
    </article>
  `;
}

function renderMovementList() {
  const keyword = $("#historyFilter").value.trim().toLowerCase();
  const rows = state.movements
    .filter((movement) => !keyword || JSON.stringify(movement).toLowerCase().includes(keyword))
    .slice()
    .reverse();
  $("#movementList").innerHTML = rows.length ? rows.map(movementCard).join("") : emptyText("尚無異動紀錄");
}

function renderSelectedHistory() {
  const rows = state.movements
    .filter((movement) => movement.itemId === state.selectedId)
    .slice()
    .reverse();
  $("#selectedHistoryCount").textContent = `${rows.length} 筆`;
  $("#selectedHistory").innerHTML = rows.length ? rows.map(movementCard).join("") : emptyText("此物品尚無紀錄");
}

function emptyText(text) {
  return `<div class="quick-item"><strong>${text}</strong><span></span></div>`;
}

async function sendToSheets(movement) {
  const url = localStorage.getItem(storageKeys.appsScriptUrl);
  if (!url) return;

  await fetch(url, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "appendMovement", movement }),
  });
}

async function addMovement(formData) {
  const item = state.items.find((entry) => entry.id === state.selectedId);
  if (!item) {
    toast("請先選取物品");
    return;
  }

  const timestamp = nowText();
  const action = formData.get("actionType");
  const movement = {
    movementId: `MOV-${timestamp.slice(0, 10).replaceAll("-", "")}-${String(state.movements.length + 1).padStart(4, "0")}`,
    itemId: item.id,
    itemTypeId: item.typeId,
    action,
    fromLocation: item.location,
    toLocation: formData.get("toLocation"),
    operator: formData.get("operatorName"),
    timestamp,
    beforeStatus: item.status,
    afterStatus: movementStatus(action),
    note: formData.get("movementNote"),
  };

  item.status = movement.afterStatus;
  item.location = movement.toLocation;
  item.lastMovedAt = timestamp;
  state.movements.push(movement);

  localStorage.setItem(storageKeys.operator, movement.operator);
  saveItems();
  saveMovements();
  renderAll();
  setSelectedItem(item.id);
  $("#movementNote").value = "";
  toast("異動紀錄已新增");

  try {
    await sendToSheets(movement);
  } catch {
    toast("本機已儲存，雲端同步稍後再試");
  }
}

function exportMovementsCsv() {
  const headers = ["movement_id", "item_id", "item_type_id", "action", "from_location", "to_location", "operator", "timestamp", "before_status", "after_status", "note"];
  const lines = [
    headers.join(","),
    ...state.movements.map((movement) => [
      movement.movementId,
      movement.itemId,
      movement.itemTypeId,
      movement.action,
      movement.fromLocation,
      movement.toLocation,
      movement.operator,
      movement.timestamp,
      movement.beforeStatus,
      movement.afterStatus,
      movement.note,
    ].map(csvCell).join(",")),
  ];
  const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `movements-${new Date().toISOString().slice(0, 10)}.csv`);
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadSnapshot() {
  const blob = new Blob([JSON.stringify({ items: state.items, movements: state.movements }, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  downloadBlob(blob, `warehouse-snapshot-${new Date().toISOString().slice(0, 10)}.json`);
}

async function resetDemo() {
  if (!confirm("重置會清除本機異動紀錄，確定要繼續？")) return;
  localStorage.removeItem(storageKeys.items);
  localStorage.removeItem(storageKeys.movements);
  state.selectedId = "";
  await loadData();
  renderAll();
  toast("已重置本機庫存");
}

async function startScanner() {
  if (!("BarcodeDetector" in window)) {
    toast("此瀏覽器不支援內建掃碼");
    return;
  }

  if (state.scannerStream) {
    state.scannerStream.getTracks().forEach((track) => track.stop());
    state.scannerStream = null;
    $("#scannerVideo").srcObject = null;
    $("#scanButton").textContent = "掃碼";
    return;
  }

  const detector = new BarcodeDetector({ formats: ["qr_code"] });
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
  state.scannerStream = stream;
  const video = $("#scannerVideo");
  video.srcObject = stream;
  await video.play();
  $("#scanButton").textContent = "停止";

  const tick = async () => {
    if (!state.scannerStream) return;
    const codes = await detector.detect(video);
    if (codes.length) {
      const value = codes[0].rawValue.trim();
      $("#itemSearch").value = value;
      renderQuickList();
      const item = state.items.find((entry) => entry.id === value);
      if (item) setSelectedItem(item.id);
      toast(item ? "已讀取 QR Code" : "找不到此物品編號");
    }
    requestAnimationFrame(tick);
  };
  tick();
}

function bindEvents() {
  $$(".nav-tab").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".nav-tab").forEach((node) => node.classList.remove("active"));
      $$(".view").forEach((node) => node.classList.remove("active"));
      button.classList.add("active");
      $(`#view-${button.dataset.view}`).classList.add("active");
    });
  });

  $("#itemSearch").addEventListener("input", renderQuickList);
  $("#quickList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-id]");
    if (button) setSelectedItem(button.dataset.id);
  });

  $("#inventoryTable").addEventListener("click", (event) => {
    const row = event.target.closest("[data-id]");
    if (!row) return;
    setSelectedItem(row.dataset.id);
    document.querySelector('[data-view="operate"]').click();
  });

  $("#inventoryFilter").addEventListener("input", renderInventory);
  $("#statusFilter").addEventListener("change", renderInventory);
  $("#historyFilter").addEventListener("input", renderMovementList);
  $("#exportMovements").addEventListener("click", exportMovementsCsv);
  $("#downloadSnapshot").addEventListener("click", downloadSnapshot);
  $("#resetDemo").addEventListener("click", resetDemo);
  $("#scanButton").addEventListener("click", () => startScanner().catch(() => toast("無法啟動相機")));

  $("#movementForm").addEventListener("submit", (event) => {
    event.preventDefault();
    addMovement(new FormData(event.currentTarget));
  });

  $("#saveSettings").addEventListener("click", () => {
    localStorage.setItem(storageKeys.appsScriptUrl, $("#appsScriptUrl").value.trim());
    updateSyncState();
    toast("設定已儲存");
  });
}

function renderAll() {
  renderMetrics();
  renderQuickList();
  renderInventory();
  renderMovementList();
  renderSelectedHistory();
}

await loadData();
bindEvents();
renderAll();
if (state.items[0]) setSelectedItem(state.items[0].id);
