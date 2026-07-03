const SHEETS = {
  items: '單件標籤清單',
  movements: '異動紀錄',
};

function doPost(event) {
  const body = JSON.parse(event.postData.contents || '{}');
  if (body.action === 'appendMovement') {
    appendMovement(body.movement);
    return jsonResponse({ ok: true });
  }
  if (body.action === 'snapshot') {
    return jsonResponse(readSnapshot());
  }
  return jsonResponse({ ok: false, error: 'Unknown action' });
}

function appendMovement(movement) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const movementSheet = ss.getSheetByName(SHEETS.movements);
  const itemSheet = ss.getSheetByName(SHEETS.items);

  movementSheet.appendRow([
    movement.movementId,
    movement.itemId,
    movement.itemTypeId,
    movement.action,
    movement.fromLocation,
    movement.toLocation,
    movement.operator,
    movement.timestamp,
    '',
    movement.note,
    movement.beforeStatus,
    movement.afterStatus,
  ]);

  updateItemStatus(itemSheet, movement.itemId, movement.afterStatus, movement.toLocation, movement.timestamp);
}

function updateItemStatus(sheet, itemId, status, location, timestamp) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const itemIdCol = headers.indexOf('單件物品編號');
  const statusCol = headers.indexOf('目前狀態') > -1 ? headers.indexOf('目前狀態') : headers.indexOf('初始狀態');
  const locationCol = headers.indexOf('目前位置') > -1 ? headers.indexOf('目前位置') : headers.indexOf('初始位置');
  const movedAtCol = headers.indexOf('最近異動');

  for (let i = 1; i < values.length; i += 1) {
    if (values[i][itemIdCol] === itemId) {
      if (statusCol > -1) sheet.getRange(i + 1, statusCol + 1).setValue(status);
      if (locationCol > -1) sheet.getRange(i + 1, locationCol + 1).setValue(location);
      if (movedAtCol > -1) sheet.getRange(i + 1, movedAtCol + 1).setValue(timestamp);
      return;
    }
  }
}

function readSnapshot() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    items: sheetObjects(ss.getSheetByName(SHEETS.items)),
    movements: sheetObjects(ss.getSheetByName(SHEETS.movements)),
  };
}

function sheetObjects(sheet) {
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  return values.map(row => {
    const item = {};
    headers.forEach((header, index) => item[header] = row[index]);
    return item;
  });
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
