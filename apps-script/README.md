# 晶鑫倉庫管理 Apps Script Web App 部署說明

這一版是給 Google Sheets 綁定 Apps Script 使用的 Web App。

## 1. 開啟 Apps Script

1. 打開你的倉庫 Google Sheets。
2. 點選 `擴充功能` -> `Apps Script`。
3. 建立下列檔案，並把本資料夾同名檔案內容貼上：
   - `Code.gs`
   - `Index.html`
   - `styles.html`
   - `app.html`
   - `appsscript.json`

## 2. 設定白名單

在 `Code.gs` 最上方修改：

```js
allowedEmails: [
  '請改成你的Google帳號@gmail.com',
],
```

例如：

```js
allowedEmails: [
  'boss@example.com',
  'warehouse@example.com',
  'designer@example.com',
],
```

## 3. 確認工作表名稱

系統預設讀取：

- `單件標籤清單`
- `異動紀錄`

如果你的 Google Sheets 工作表名稱不同，請修改 `Code.gs` 的：

```js
sheetNames: {
  items: '單件標籤清單',
  movements: '異動紀錄',
},
```

## 4. 發布 Web App

1. 點右上角 `部署`。
2. 選 `新增部署作業`。
3. 類型選 `網頁應用程式`。
4. 執行身分選：`存取網頁應用程式的使用者`。
5. 存取權建議選：`任何擁有 Google 帳戶的使用者`。
6. 點 `部署`。
7. 授權 Apps Script 存取這份試算表。
8. 複製 Web App URL 給白名單帳號使用。

## 5. 重要注意

- 每個白名單使用者第一次開啟時，可能需要授權。
- 因為部署為「以使用者身分執行」，白名單使用者也需要被分享這份 Google Sheets 的存取權。
- 如果使用者不在白名單，畫面會顯示拒絕原因。
- 如果 Apps Script 無法取得登入者 email，請確認部署設定是「存取網頁應用程式的使用者」。

## 6. 異動紀錄欄位

系統會寫入：

- `movement_id`
- `item_id`
- `item_type_id`
- `action`
- `from_location`
- `to_location`
- `operator`
- `timestamp`
- `related_project`
- `note`
- `before_status`
- `after_status`
- `user_email`

系統也會在 `單件標籤清單` 自動補上：

- `目前狀態`
- `目前位置`
- `最近異動`
