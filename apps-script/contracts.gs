/**
 * 合約管理 Sheet — Google Apps Script 後端
 *
 * 部署步驟：
 * 1. 在 Google Drive 建立一個新試算表（例如命名「Contracts」）
 * 2. 試算表上方選單 → 擴充功能 → Apps Script
 * 3. 刪除預設內容，貼上本檔全部程式碼 → 儲存
 * 4. 右上「部署」→ 新增部署 → 類型選「網頁應用程式」
 *    - 執行身分：我
 *    - 誰可以存取：任何人
 * 5. 按「部署」並授權，複製產生的 /exec 網址
 * 6. 將網址填入前端 services/googleSheetService.ts 的 GOOGLE_SCRIPT_CONTRACTS_URL
 *
 * 資料結構：每位租客一列
 *   tenantId | tenantName | updatedAt | data(合約欄位 JSON)
 */

const SHEET_NAME = 'Contracts';

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['tenantId', 'tenantName', 'updatedAt', 'data']);
  }
  return sheet;
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// GET：回傳全部合約列
function doGet() {
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues();
  const headers = rows.shift();
  const result = rows.map(function (r) {
    const obj = {};
    headers.forEach(function (h, i) { obj[h] = r[i]; });
    return obj;
  });
  return jsonOut(result);
}

// POST：{action: 'UPDATE'|'DELETE', data: {tenantId, tenantName, updatedAt, data}}
// UPDATE 為 upsert：該租客已存在則覆寫整列，否則新增一列
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    const data = payload.data || {};
    if (!data.tenantId) return jsonOut({ status: 'error', message: 'tenantId required' });

    const sheet = getSheet();
    const rows = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(data.tenantId)) { rowIndex = i + 1; break; }
    }

    if (action === 'DELETE') {
      if (rowIndex > 0) sheet.deleteRow(rowIndex);
      return jsonOut({ status: 'success' });
    }

    const rowValues = [
      String(data.tenantId),
      data.tenantName || '',
      data.updatedAt || new Date().toISOString(),
      data.data || ''
    ];
    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, 4).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }
    return jsonOut({ status: 'success' });
  } catch (err) {
    return jsonOut({ status: 'error', message: String(err) });
  }
}
