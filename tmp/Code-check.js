const CONFIG = {
  allowedEmails: [
    'chometaiwan@gmail.com',
    'chometaiwan1@gmail.com',
    'errorz7892@gmail.com',
    'nina 778430@gmail.com',
    'vicky121623@gmail.com'
  ],
  sheetNames: {
    items: '物品表',
    movements: '異動紀錄',
    properties: '物件地點表',
  },
  timezone: 'Asia/Taipei',
};

function doGet() {
  const user = requireAllowedUser_();
  const template = HtmlService.createTemplateFromFile('Index');
  template.userEmail = user.email;
  return template
    .evaluate()
    .setTitle('晶鑫倉庫管理')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getAppData() {
  const user = requireAllowedUser_();
  const ss = getSpreadsheet_();
  const itemSheet = getRequiredSheet_(ss, CONFIG.sheetNames.items);
  const movementSheet = ensureMovementSheet_(ss);
  ensureItemRuntimeColumns_(itemSheet);

  return JSON.stringify({
    user,
    items: readItems_(itemSheet),
    movements: readMovements_(movementSheet),
    properties: readProperties_(ss),
  });
}

function addMovement(payload) {
  const user = requireAllowedUser_();
  const ss = getSpreadsheet_();
  const itemSheet = getRequiredSheet_(ss, CONFIG.sheetNames.items);
  const movementSheet = ensureMovementSheet_(ss);
  ensureItemRuntimeColumns_(itemSheet);

  const itemId = String(payload.itemId || '').trim();
  const itemRow = findItemRow_(itemSheet, itemId);
  if (!itemRow) {
    throw new Error('找不到物品編號：' + itemId);
  }

  const item = itemRow.item;
  const action = String(payload.action || '').trim();
  const quantity = Math.max(1, normalizeAmount_(payload.quantity || 1));
  const currentAmount = normalizeAmount_(item.amount);
  const timestamp = Utilities.formatDate(new Date(), CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss');
  const nextAmount = nextAmountForAction_(currentAmount, action, quantity);
  const afterStatus = statusForAction_(action, nextAmount, item.status);
  const requestedFromLocation = String(payload.fromLocation || '').trim();
  const toLocation = String(payload.toLocation || '').trim();
  const distribution = distributionFromItem_(item);
  const fromLocation = sourceLocation_(distribution, item.location, requestedFromLocation);
  const nextDistribution = nextDistributionForAction_(distribution, fromLocation, toLocation, action, quantity);
  const nextLocation = distributionToText_(nextDistribution) || item.location;
  const movement = {
    movementId: nextMovementId_(movementSheet, timestamp),
    itemId,
    itemTypeId: item.typeId,
    action,
    fromLocation,
    toLocation,
    operator: user.email,
    timestamp,
    relatedProject: String(payload.relatedProject || '').trim(),
    note: String(payload.note || '').trim(),
    quantity,
    beforeStatus: item.status,
    afterStatus,
    userEmail: user.email,
  };

  movementSheet.appendRow([
    movement.movementId,
    movement.itemId,
    movement.itemTypeId,
    movement.action,
    movement.fromLocation,
    movement.toLocation,
    movement.operator,
    movement.timestamp,
    movement.relatedProject,
    movement.note,
    movement.beforeStatus,
    movement.afterStatus,
    movement.userEmail,
    movement.quantity,
  ]);

  updateItemRuntime_(itemSheet, itemRow.rowNumber, movement.afterStatus, nextLocation, timestamp, nextAmount, nextLocation);
  return movement;
}

function requireAllowedUser_() {
  const email = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  const allowed = CONFIG.allowedEmails.map(item => String(item).toLowerCase().trim()).filter(Boolean);
  if (!email) {
    throw new Error('無法取得登入者 email。請確認 Web App 部署為「以使用者身分執行」，並要求使用者登入 Google。');
  }
  if (!allowed.includes(email)) {
    throw new Error('此 Google 帳號不在白名單：' + email);
  }
  return { email };
}

function getSpreadsheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('找不到目前綁定的 Google Sheets。請從你的庫存試算表打開「擴充功能 > Apps Script」，不要建立獨立 Apps Script 專案。');
  }
  return ss;
}

function getRequiredSheet_(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    const existingNames = ss.getSheets().map(sheet => sheet.getName()).join('、');
    throw new Error('找不到工作表分頁：「' + sheetName + '」。目前這份試算表有：' + existingNames + '。請確認 Code.gs 的 CONFIG.sheetNames.items 名稱和分頁名稱完全一致。');
  }
  return sheet;
}

function readItems_(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  return values.slice(1).filter(row => row.some(cell => cell !== '')).map(row => {
    const get = names => valueByHeaders_(headers, row, names);
    return {
      id: get(['單件物品編號', '單件編號', '物品編號', 'item_id', 'Item ID']),
      typeId: get(['品項編號', 'item_type_id', 'Item Type ID']),
      category: get(['類別', 'category']),
      name: get(['品名', '品茗', 'name']),
      spec: get(['規格/顏色', '規格', '顏色', 'spec']),
      amount: normalizeAmount_(get(['amount', '數量'])),
      unit: get(['單位', 'unit']),
      sourcePage: get(['來源頁', 'source_page']),
      photoUrl: get(['photo_url', '照片', '圖片', 'image_url']),
      note: get(['note', '備註']),
      status: get(['目前狀態', '狀態', '初始狀態', 'status']) || '在庫',
      location: get(['目前位置', '位置', '初始位置', 'current_location', 'location']) || '公司倉庫',
      locationDistribution: get(['位置分布', 'location_distribution']) || '',
      lastMovedAt: get(['最近異動', 'last_moved_at']) || '',
    };
  });
}

function readMovements_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  return values.slice(1).filter(row => row.some(cell => cell !== '')).map(row => ({
    movementId: valueByHeader_(headers, row, 'movement_id'),
    itemId: valueByHeader_(headers, row, 'item_id'),
    itemTypeId: valueByHeader_(headers, row, 'item_type_id'),
    action: valueByHeader_(headers, row, 'action'),
    fromLocation: valueByHeader_(headers, row, 'from_location'),
    toLocation: valueByHeader_(headers, row, 'to_location'),
    operator: valueByHeader_(headers, row, 'operator'),
    timestamp: formatCellDate_(valueByHeader_(headers, row, 'timestamp')),
    relatedProject: valueByHeader_(headers, row, 'related_project'),
    note: valueByHeader_(headers, row, 'note'),
    quantity: normalizeAmount_(valueByHeader_(headers, row, 'quantity') || 1),
    beforeStatus: valueByHeader_(headers, row, 'before_status'),
    afterStatus: valueByHeader_(headers, row, 'after_status'),
    userEmail: valueByHeader_(headers, row, 'user_email'),
  }));
}

function readProperties_(ss) {
  const sheet = ss.getSheetByName(CONFIG.sheetNames.properties);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const nameIndex = headerIndex_(headers, ['name', '名稱', '物件名稱', '房源名稱', '案場名稱']);
  if (nameIndex < 0) return [];
  const seen = {};
  return values.slice(1)
    .map(row => String(row[nameIndex] || '').trim())
    .filter(name => {
      if (!name || seen[name]) return false;
      seen[name] = true;
      return true;
    })
    .sort();
}

function ensureMovementSheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.sheetNames.movements);
  if (!sheet) sheet = ss.insertSheet(CONFIG.sheetNames.movements);
  const headers = [
    'movement_id',
    'item_id',
    'item_type_id',
    'action',
    'from_location',
    'to_location',
    'operator',
    'timestamp',
    'related_project',
    'note',
    'before_status',
    'after_status',
    'user_email',
    'quantity',
  ];
  if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() === '') {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  } else {
    const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    headers.forEach(header => {
      if (!existingHeaders.includes(header)) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
        existingHeaders.push(header);
      }
    });
  }
  return sheet;
}

function ensureItemRuntimeColumns_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (headerIndex_(headers, ['amount', '數量']) < 0) {
    sheet.getRange(1, sheet.getLastColumn() + 1).setValue('amount');
    headers.push('amount');
  }
  ['目前狀態', '目前位置', '最近異動', '位置分布'].forEach(header => {
    if (!headers.includes(header)) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header);
      headers.push(header);
    }
  });
}

function findItemRow_(sheet, itemId) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = headerIndex_(headers, ['單件物品編號', '單件編號', '物品編號', 'item_id', 'Item ID']);
  if (idIndex < 0) {
    throw new Error('物品表找不到單件物品編號欄位。請確認欄位名稱是「單件物品編號」、「單件編號」、「物品編號」或「item_id」。');
  }
  for (let i = 1; i < values.length; i += 1) {
    if (String(values[i][idIndex]).trim() === itemId) {
      const item = readItemsFromRow_(headers, values[i]);
      return { rowNumber: i + 1, item };
    }
  }
  return null;
}

function readItemsFromRow_(headers, row) {
  const get = names => valueByHeaders_(headers, row, names);
  return {
    id: get(['單件物品編號', '單件編號', '物品編號', 'item_id', 'Item ID']),
    typeId: get(['品項編號', 'item_type_id', 'Item Type ID']),
    amount: normalizeAmount_(get(['amount', '數量'])),
    status: get(['目前狀態', '狀態', '初始狀態', 'status']) || '在庫',
    location: get(['目前位置', '位置', '初始位置', 'current_location', 'location']) || '公司倉庫',
    locationDistribution: get(['位置分布', 'location_distribution']) || '',
  };
}

function updateItemRuntime_(sheet, rowNumber, status, location, timestamp, amount, locationDistribution) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  sheet.getRange(rowNumber, headers.indexOf('目前狀態') + 1).setValue(status);
  sheet.getRange(rowNumber, headers.indexOf('目前位置') + 1).setValue(location);
  sheet.getRange(rowNumber, headers.indexOf('最近異動') + 1).setValue(timestamp);
  const distributionIndex = headerIndex_(headers, ['位置分布', 'location_distribution']);
  if (distributionIndex > -1) {
    sheet.getRange(rowNumber, distributionIndex + 1).setValue(locationDistribution || '');
  }
  const amountIndex = headerIndex_(headers, ['amount', '數量']);
  if (amountIndex > -1 && amount !== null) {
    sheet.getRange(rowNumber, amountIndex + 1).setValue(amount);
  }
}

function valueByHeader_(headers, row, name) {
  const index = headers.indexOf(name);
  return index > -1 ? row[index] : '';
}

function valueByHeaders_(headers, row, names) {
  const index = headerIndex_(headers, names);
  return index > -1 ? row[index] : '';
}

function headerIndex_(headers, names) {
  const targets = names.map(normalizeHeader_);
  return headers.findIndex(header => targets.includes(normalizeHeader_(header)));
}

function normalizeHeader_(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/_/g, '');
}

function normalizeAmount_(value) {
  const amount = Number(String(value == null ? '' : value).replace(/,/g, '').trim());
  return Number.isFinite(amount) ? amount : 0;
}

function distributionFromItem_(item) {
  const parsed = distributionFromText_(item.locationDistribution || item.location);
  const location = String(item.location || '未填位置').trim() || '未填位置';
  const amount = normalizeAmount_(item.amount);
  const parsedTotal = Object.keys(parsed).reduce((total, key) => total + normalizeAmount_(parsed[key]), 0);
  if (amount > parsedTotal) {
    parsed[location] = normalizeAmount_(parsed[location]) + (amount - parsedTotal);
  }
  if (Object.keys(parsed).length) return parsed;
  return amount > 0 ? { [location]: amount } : {};
}

function distributionFromText_(text) {
  const result = {};
  String(text || '').split('、').forEach(part => {
    const value = String(part || '').trim();
    if (!value) return;
    const match = value.match(/^(.+?)\s*[xX]\s*([0-9.]+)$/);
    if (!match) return;
    const location = match[1].trim();
    const amount = normalizeAmount_(match[2]);
    if (location && amount > 0) result[location] = (result[location] || 0) + amount;
  });
  return result;
}

function distributionToText_(distribution) {
  return Object.keys(distribution)
    .filter(location => normalizeAmount_(distribution[location]) > 0)
    .sort()
    .map(location => location + ' X ' + normalizeAmount_(distribution[location]))
    .join('、');
}

function sourceLocation_(distribution, fallbackLocation, requestedLocation) {
  const requested = String(requestedLocation || '').trim();
  if (requested && normalizeAmount_(distribution[requested]) > 0) return requested;
  if (requested) {
    throw new Error('來源位置沒有可用數量：' + requested);
  }
  if (normalizeAmount_(distribution['公司倉庫']) > 0) return '公司倉庫';
  const fallback = String(fallbackLocation || '').trim();
  if (fallback && normalizeAmount_(distribution[fallback]) > 0) return fallback;
  const locations = Object.keys(distribution).filter(location => normalizeAmount_(distribution[location]) > 0).sort();
  return locations[0] || fallback || '未填位置';
}

function nextDistributionForAction_(distribution, fromLocation, toLocation, action, quantity) {
  const next = Object.assign({}, distribution);
  const source = fromLocation;
  const target = String(toLocation || '').trim() || source;
  const movingActions = ['出庫', '入庫', '調撥', '維修'];
  if (movingActions.includes(action)) {
    if (normalizeAmount_(next[source]) < quantity) {
      throw new Error('異動數量不可大於來源位置數量。' + source + ' 目前數量：' + normalizeAmount_(next[source]));
    }
    next[source] = normalizeAmount_(next[source]) - quantity;
    next[target] = normalizeAmount_(next[target]) + quantity;
  } else if (action === '入庫') {
    next[target] = normalizeAmount_(next[target]) + quantity;
  } else if (action === '報廢') {
    if (normalizeAmount_(next[source]) < quantity) {
      throw new Error('報廢數量不可大於來源位置數量。' + source + ' 目前數量：' + normalizeAmount_(next[source]));
    }
    next[source] = normalizeAmount_(next[source]) - quantity;
  }
  Object.keys(next).forEach(location => {
    if (normalizeAmount_(next[location]) <= 0) delete next[location];
  });
  return next;
}

function nextAmountForAction_(currentAmount, action, quantity) {
  const amount = normalizeAmount_(currentAmount);
  if (action === '報廢') return Math.max(0, amount - quantity);
  return amount;
}

function statusForAction_(action, amount, beforeStatus) {
  if (action === '出庫') return amount <= 0 ? '已出庫' : (beforeStatus === '良好' ? '良好' : '在庫');
  if (action === '入庫' || action === '盤點' || action === '調撥') return beforeStatus === '良好' ? '良好' : '在庫';
  if (action === '維修') return '維修中';
  if (action === '報廢') return '報廢';
  return '在庫';
}

function nextMovementId_(sheet, timestamp) {
  const dateKey = timestamp.slice(0, 10).replace(/-/g, '');
  const serial = Math.max(1, sheet.getLastRow());
  return 'MOV-' + dateKey + '-' + String(serial).padStart(4, '0');
}

function formatCellDate_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') {
    return Utilities.formatDate(value, CONFIG.timezone, 'yyyy-MM-dd HH:mm:ss');
  }
  return value || '';
}
