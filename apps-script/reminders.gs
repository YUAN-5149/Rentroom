/**
 * 家管小屋 — 每日到期提醒 Email
 *
 * 功能：每天自動檢查「逾期/過期帳單、合約到期、濾心到期」，
 *       有需要關注的事項時寄 Email 通知房東。
 *
 * 部署步驟（獨立指令碼，不綁定任何試算表）：
 * 1. 前往 https://script.google.com → 新增專案
 * 2. 貼上本檔全部程式碼 → 儲存（專案名稱例如「家管小屋提醒」）
 * 3. 上方選擇函式「dailyReminderCheck」→ 執行一次 → 授權
 *    （會跳未驗證警告：進階 → 前往專案 → 允許）
 * 4. 左側鬧鐘圖示「觸發條件」→ 新增觸發條件：
 *    - 函式：dailyReminderCheck
 *    - 事件來源：時間驅動 → 日計時器 → 上午 8 時～9 時
 * 5. 完成。之後每天早上有事項就會收到信，沒事不打擾。
 */

// ===== 設定 =====
const RECIPIENT = 'd086110@gmail.com'; // 收件人（你的信箱）
const LEASE_WARN_DAYS = 60;            // 合約到期前幾天開始提醒

// 既有系統的 Web App 端點（與前端 googleSheetService.ts 相同）
const TENANTS_URL  = 'https://script.google.com/macros/s/AKfycbw70J0EVv__jiy07J8awh997Wpr4gTC5P7CIGEJqx3LPc2LIZMlZLZvd9D2spOeDA/exec';
const PAYMENTS_URL = 'https://script.google.com/macros/s/AKfycbyvd6BkeKdwqMx8y-VJVop81256WORFxfpmbwB-UJg3qOEPDO5YFS6CIFZwZAdA_1fN2A/exec';
const FILTERS_URL  = 'https://script.google.com/macros/s/AKfycbzD48CCREG2Y6o5a1ET74o2Wt56CBftpbaSFex3m2xv3ymXNcoykfWwMeAkpp_NTc8Y/exec';

// ===== 主程式 =====
function dailyReminderCheck() {
  const urgent = [];   // 🔴 已逾期/已過期
  const upcoming = []; // 🟡 即將到期/待關注
  const today = new Date();
  const todayStr = Utilities.formatDate(today, 'Asia/Taipei', 'yyyy-MM-dd');

  // --- 1. 帳單 ---
  const payments = fetchJson(PAYMENTS_URL);
  payments.forEach(function (p) {
    const row = lower(p);
    const status = String(row.status || '');
    const due = toDateStr(row.duedate);
    const name = row.tenantname || '租客';
    const amount = Number(row.amount) || 0;
    const label = name + ' 的帳單 $' + amount.toLocaleString() + '（繳費日 ' + due + '）';
    if (status.indexOf('逾期') >= 0) {
      urgent.push('帳單逾期：' + label);
    } else if (status.indexOf('待繳') >= 0 && due && due < todayStr) {
      upcoming.push('過期未繳：' + label);
    }
  });

  // --- 2. 合約到期 ---
  const tenants = fetchJson(TENANTS_URL);
  tenants.forEach(function (t) {
    const row = lower(t);
    const end = toDateStr(row.leaseenddate);
    if (!end) return;
    const days = Math.ceil((new Date(end) - new Date(todayStr)) / 86400000);
    const label = (row.name || '租客') + '（' + (row.roomnumber || '') + '）合約 ' + end;
    if (days < 0) urgent.push('合約已到期：' + label);
    else if (days <= LEASE_WARN_DAYS) upcoming.push('合約將到期：' + label + '（' + days + ' 天後）');
  });

  // --- 3. 濾心 ---
  const filters = fetchJson(FILTERS_URL);
  filters.forEach(function (f) {
    const row = lower(f);
    const nextDue = toDateStr(row.nextdue);
    if (!nextDue) return;
    const days = Math.ceil((new Date(nextDue) - new Date(todayStr)) / 86400000);
    const label = '濾心 ' + (row.model || '') + '（預計到期 ' + nextDue + '）';
    if (days < 0) urgent.push('濾心已過期：' + label);
    else if (days <= 30) upcoming.push('濾心將到期：' + label + '（' + days + ' 天後）');
  });

  // --- 寄信（沒事不寄） ---
  if (urgent.length === 0 && upcoming.length === 0) return;

  const subject = '🏠 家管小屋提醒：' +
    (urgent.length > 0 ? urgent.length + ' 件緊急' : '') +
    (urgent.length > 0 && upcoming.length > 0 ? '、' : '') +
    (upcoming.length > 0 ? upcoming.length + ' 件待關注' : '');

  let body = '早安！以下是今日（' + todayStr + '）需要關注的事項：\n\n';
  if (urgent.length > 0) {
    body += '🔴 緊急事項\n' + urgent.map(function (s) { return '  · ' + s; }).join('\n') + '\n\n';
  }
  if (upcoming.length > 0) {
    body += '🟡 待關注\n' + upcoming.map(function (s) { return '  · ' + s; }).join('\n') + '\n\n';
  }
  body += '開啟系統處理：https://room-3kq3.vercel.app/\n\n— 家管小屋 自動提醒';

  MailApp.sendEmail(RECIPIENT, subject, body);
}

// ===== 工具函式 =====
function fetchJson(url) {
  try {
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    const json = JSON.parse(res.getContentText());
    if (Array.isArray(json)) return json;
    if (json && Array.isArray(json.data)) return json.data;
    if (json && Array.isArray(json.repairs)) return json.repairs;
    return [];
  } catch (e) {
    return [];
  }
}

// 欄位名稱統一轉小寫（容忍 Sheet 標題大小寫差異）
function lower(obj) {
  const out = {};
  Object.keys(obj || {}).forEach(function (k) { out[k.toLowerCase()] = obj[k]; });
  return out;
}

// 日期欄可能是字串或 Date 物件，統一輸出 yyyy-MM-dd
function toDateStr(v) {
  if (!v) return '';
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Taipei', 'yyyy-MM-dd');
  const s = String(v);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s;
}
