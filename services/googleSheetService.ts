
import { Tenant, ExpenseRecord, ExpenseCategory, PaymentRecord, PaymentStatus, MaintenanceTicket, FilterSchedule, MaintenanceStatus, Priority, MeterReading } from '../types';

// ============================================================================
// 設定 1: 租客管理 Sheet
// ============================================================================
export const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw70J0EVv__jiy07J8awh997Wpr4gTC5P7CIGEJqx3LPc2LIZMlZLZvd9D2spOeDA/exec"; 

// ============================================================================
// 設定 2: 費用管理 Sheet
// ============================================================================
export const GOOGLE_SCRIPT_EXPENSES_URL = "https://script.google.com/macros/s/AKfycbymaG_U9W_lUjwmn5N7YeQ0fS5RlHCneG8pjK8b8bCkwkfMpsUwcG08tlU-j8WFRUmI/exec"; 

// ============================================================================
// 設定 3: 財務管理 Sheet
// ============================================================================
export const GOOGLE_SCRIPT_PAYMENTS_URL = "https://script.google.com/macros/s/AKfycbyvd6BkeKdwqMx8y-VJVop81256WORFxfpmbwB-UJg3qOEPDO5YFS6CIFZwZAdA_1fN2A/exec"; 

// ============================================================================
// 設定 4: 維修管理 Sheet (僅包含報修單 Repairs)
// ============================================================================
export const GOOGLE_SCRIPT_MAINTENANCE_URL = "https://script.google.com/macros/s/AKfycbymi85ebX1JCDoGIXeq1qOLtruOAVyNCibQrD_wPigccpAzFQN1N-ReW-sOzu4TUP3oEA/exec"; 

// ============================================================================
// 設定 5: 飲水機濾心管理 Sheet (Filters)
// 對應 Spreadsheet: https://docs.google.com/spreadsheets/d/1b8mzxeuzyQskMIdXrLcFBH5P37mKUnMKIiZW0TB_mO4/edit?gid=0#gid=0
// ============================================================================
export const GOOGLE_SCRIPT_FILTER_URL = "https://script.google.com/macros/s/AKfycbzD48CCREG2Y6o5a1ET74o2Wt56CBftpbaSFex3m2xv3ymXNcoykfWwMeAkpp_NTc8Y/exec"; 

// ============================================================================
// 設定 6: 電表管理 Sheet 
// ============================================================================
export const GOOGLE_SCRIPT_METERS_URL = "https://script.google.com/macros/s/AKfycbwBqUhDImQQN1sIdSTv0rfXzUTJxvp9-9ya1dOQgHq8aIpNMofCR2a6JI1_gS4jqeNmLw/exec"; 


/** 類別中英轉換 (費用) */
const CATEGORY_MAP_TO_ZH: Record<ExpenseCategory, string> = {
  'Water': '自來水費',
  'Electricity': '電費',
  'Gas': '瓦斯費',
  'Internet': '網路費',
  'Cleaning': '清潔費',
  'Other': '雜支'
};

const CATEGORY_MAP_TO_EN: Record<string, ExpenseCategory> = {
  '自來水費': 'Water',
  '電費': 'Electricity',
  '瓦斯費': 'Gas',
  '網路費': 'Internet',
  '清潔費': 'Cleaning',
  '雜支': 'Other'
};

/** 帳單類別中英轉換 (財務) */
const PAYMENT_TYPE_TO_ZH: Record<string, string> = {
  'Rent': '租金',
  'Utility': '水電費',
  'Deposit': '押金',
  'Other': '其他'
};

const PAYMENT_TYPE_TO_EN: Record<string, any> = {
  '租金': 'Rent',
  '水電費': 'Utility',
  '押金': 'Deposit',
  '其他': 'Other'
};

/** 維修狀態中英轉換 */
const MAINTENANCE_STATUS_TO_ZH: Record<MaintenanceStatus, string> = {
  [MaintenanceStatus.OPEN]: '待處理',
  [MaintenanceStatus.IN_PROGRESS]: '維修中',
  [MaintenanceStatus.COMPLETED]: '已完成'
};
const MAINTENANCE_STATUS_TO_EN: Record<string, MaintenanceStatus> = {
  '待處理': MaintenanceStatus.OPEN,
  '維修中': MaintenanceStatus.IN_PROGRESS,
  '已完成': MaintenanceStatus.COMPLETED,
  'Open': MaintenanceStatus.OPEN, // Fallback
  'In Progress': MaintenanceStatus.IN_PROGRESS,
  'Completed': MaintenanceStatus.COMPLETED
};

/** 濾心狀態中英轉換 */
const FILTER_STATUS_TO_ZH: Record<string, string> = {
    'Good': '良好',
    'Due Soon': '即將到期',
    'Overdue': '已過期'
};
const FILTER_STATUS_TO_EN: Record<string, any> = {
    '良好': 'Good',
    '即將到期': 'Due Soon',
    '已過期': 'Overdue',
    'Good': 'Good',
    'Due Soon': 'Due Soon',
    'Overdue': 'Overdue'
};


/** 優先級中英轉換 */
const PRIORITY_TO_ZH: Record<Priority, string> = {
  [Priority.LOW]: '低',
  [Priority.MEDIUM]: '中',
  [Priority.HIGH]: '高'
};
const PRIORITY_TO_EN: Record<string, Priority> = {
  '低': Priority.LOW,
  '中': Priority.MEDIUM,
  '高': Priority.HIGH,
  'Low': Priority.LOW, // Fallback
  'Medium': Priority.MEDIUM,
  'High': Priority.HIGH
};
const MAINTENANCE_CAT_TO_ZH: Record<string, string> = {
    'Appliance': '家電',
    'Plumbing': '水電管路',
    'Electrical': '電力系統',
    'Filter': '濾心耗材',
    'Other': '其他'
};
const MAINTENANCE_CAT_TO_EN: Record<string, any> = {
    '家電': 'Appliance',
    '水電管路': 'Plumbing',
    '電力系統': 'Electrical',
    '濾心耗材': 'Filter',
    '其他': 'Other'
};


// --- Helper for Robust Post ---
const sendPost = async (url: string, payload: any) => {
    return fetch(url, { 
        method: 'POST', 
        body: JSON.stringify(payload),
        headers: { "Content-Type": "text/plain;charset=utf-8" }
    });
};

// --- Tenants Sync ---
export const syncTenantToSheet = async (action: 'CREATE' | 'UPDATE' | 'DELETE', tenant: Partial<Tenant>) => {
  if (!GOOGLE_SCRIPT_URL) return;
  try {
    const dataToSync = { ...tenant };
    // Fix: Ensure phone is treated as string before replace
    if (dataToSync.phone !== undefined && dataToSync.phone !== null) {
      dataToSync.phone = String(dataToSync.phone).replace(/\D/g, '');
    }
    const payload = { action, data: dataToSync };
    await sendPost(GOOGLE_SCRIPT_URL, payload);
  } catch (error) { console.error("Tenant Sync Error", error); }
};

export const fetchTenantsFromSheet = async (): Promise<Tenant[] | null> => {
    if (!GOOGLE_SCRIPT_URL) return null;
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();
        return Array.isArray(data) ? data.map((row: any) => ({
            id: row.id || `t-${Math.random()}`,
            name: row.name || '',
            roomNumber: row.roomNumber || '',
            phone: row.phone || '',
            email: row.email || '', 
            moveInDate: row.moveInDate || '',
            leaseEndDate: row.leaseEndDate || '',
            rentAmount: Number(row.rentAmount) || 0,
            deposit: Number(row.deposit) || 0,
            idNumber: row.idNumber || '',
            contractContent: row.contractContent || '',
            fingerprintId: row.fingerprintId || '' 
        })) : null;
    } catch (e) { return null; }
}

// --- Expenses Sync ---
export const syncExpenseToSheet = async (action: 'CREATE' | 'DELETE', expense: Partial<ExpenseRecord>) => {
  if (!GOOGLE_SCRIPT_EXPENSES_URL) return;
  try {
    const categoryZH = expense.category ? CATEGORY_MAP_TO_ZH[expense.category] : '雜支';
    const payload = { action, data: { ...expense, category: categoryZH } };
    await sendPost(GOOGLE_SCRIPT_EXPENSES_URL, payload);
  } catch (error) { console.error("Expense Sync Error", error); }
};

export const fetchExpensesFromSheet = async (): Promise<ExpenseRecord[] | null> => {
  if (!GOOGLE_SCRIPT_EXPENSES_URL) return null;
  try {
    const response = await fetch(GOOGLE_SCRIPT_EXPENSES_URL);
    const data = await response.json();
    return Array.isArray(data) ? data.map((row: any) => ({
      id: row.id,
      category: CATEGORY_MAP_TO_EN[row.category] || 'Other',
      amount: Number(row.amount) || 0,
      date: row.date || '',
      description: row.description || ''
    })) : null;
  } catch (e) { return null; }
};

// --- Payments Sync ---
export const syncPaymentToSheet = async (action: 'CREATE' | 'UPDATE' | 'DELETE', payment: Partial<PaymentRecord>) => {
  if (!GOOGLE_SCRIPT_PAYMENTS_URL) return;
  try {
    const typeZH = payment.type ? (PAYMENT_TYPE_TO_ZH[payment.type] || '其他') : '';
    const payload = { action, data: { ...payment, type: typeZH } };
    await sendPost(GOOGLE_SCRIPT_PAYMENTS_URL, payload);
  } catch (error) { console.error("Payment Sync Error", error); }
};

export const fetchPaymentsFromSheet = async (): Promise<PaymentRecord[] | null> => {
  if (!GOOGLE_SCRIPT_PAYMENTS_URL) return null;
  try {
    const response = await fetch(GOOGLE_SCRIPT_PAYMENTS_URL);
    const data = await response.json();
    return Array.isArray(data) ? data.map((row: any) => ({
      id: row.id,
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      amount: Number(row.amount) || 0,
      dueDate: row.dueDate || '',
      status: row.status as PaymentStatus,
      type: PAYMENT_TYPE_TO_EN[row.type] || 'Other'
    })) : null;
  } catch (e) { return null; }
};

// --- Maintenance Sync ---
export const syncMaintenanceToSheet = async (
  action: 'CREATE' | 'UPDATE' | 'DELETE', 
  type: 'REPAIR' | 'FILTER', 
  data: Partial<MaintenanceTicket> | Partial<FilterSchedule>
) => {
  const targetUrl = type === 'FILTER' ? GOOGLE_SCRIPT_FILTER_URL : GOOGLE_SCRIPT_MAINTENANCE_URL;
  if (!targetUrl || targetUrl.includes("在此處填入")) return;

  try {
    let finalData = { ...data };
    if (type === 'REPAIR') {
      const ticket = data as Partial<MaintenanceTicket>;
      if(ticket.status) (finalData as any).status = MAINTENANCE_STATUS_TO_ZH[ticket.status];
      if(ticket.priority) (finalData as any).priority = PRIORITY_TO_ZH[ticket.priority];
      if(ticket.category) (finalData as any).category = MAINTENANCE_CAT_TO_ZH[ticket.category] || '其他';
    } else if (type === 'FILTER') {
      const filter = data as Partial<FilterSchedule>;
      if(filter.status) (finalData as any).status = FILTER_STATUS_TO_ZH[filter.status] || filter.status;
    }

    const payload = { action, type, data: finalData };
    const response = await sendPost(targetUrl, payload);
    const result = await response.json();

    if (result.status === 'error' && (result.message === 'ID not found' || result.message.includes('not found')) && action === 'UPDATE') {
        const createPayload = { action: 'CREATE', type, data: finalData };
        await sendPost(targetUrl, createPayload);
    }
  } catch (error) { console.error(`Maintenance Sync Error (${type})`, error); }
};

export const fetchMaintenanceFromSheet = async (): Promise<{ repairs: MaintenanceTicket[] | null, filters: FilterSchedule[] | null }> => {
  let repairs: MaintenanceTicket[] | null = null;
  let filters: FilterSchedule[] | null = null;

  if (GOOGLE_SCRIPT_MAINTENANCE_URL) {
    try {
      const response = await fetch(GOOGLE_SCRIPT_MAINTENANCE_URL);
      const json = await response.json(); 
      const rawRepairs = json.repairs || (Array.isArray(json) ? json : []);
      if (Array.isArray(rawRepairs)) {
        repairs = rawRepairs.map((row: any) => ({
            id: row.id,
            tenantId: row.tenantId,
            tenantName: row.tenantName,
            description: row.description,
            reportDate: row.reportDate,
            status: MAINTENANCE_STATUS_TO_EN[row.status] || MaintenanceStatus.OPEN,
            priority: PRIORITY_TO_EN[row.priority] || Priority.MEDIUM,
            category: MAINTENANCE_CAT_TO_EN[row.category] || 'Other',
            cost: Number(row.cost) || 0,
            notes: row.notes || ''
        }));
      } else repairs = [];
    } catch (e) { repairs = null; }
  }

  if (GOOGLE_SCRIPT_FILTER_URL && !GOOGLE_SCRIPT_FILTER_URL.includes("在此處填入")) {
    try {
        const response = await fetch(GOOGLE_SCRIPT_FILTER_URL);
        const json = await response.json();
        const rawFilters = Array.isArray(json) ? json : (json.data || []);
        if (Array.isArray(rawFilters)) {
            filters = rawFilters.map((row: any) => ({
                id: row.id,
                model: row.model,
                specification: row.specification,
                cycleMonths: Number(row.cycleMonths),
                location: row.location,
                lastReplaced: row.lastReplaced,
                nextDue: row.nextDue,
                status: FILTER_STATUS_TO_EN[row.status] || 'Good'
            }));
        } else filters = [];
    } catch (e) { filters = null; }
  }
  return { repairs, filters };
};

// --- Meters Sync ---
export const syncMeterToSheet = async (action: 'CREATE' | 'DELETE', reading: Partial<MeterReading>) => {
  if (!GOOGLE_SCRIPT_METERS_URL) return;
  try {
    const payload = { action, data: reading };
    await sendPost(GOOGLE_SCRIPT_METERS_URL, payload);
  } catch (error) { console.error("Meter Sync Error", error); }
};

export const fetchMetersFromSheet = async (): Promise<MeterReading[] | null> => {
    if (!GOOGLE_SCRIPT_METERS_URL) return null;
    try {
        const response = await fetch(GOOGLE_SCRIPT_METERS_URL);
        const data = await response.json();
        return Array.isArray(data) ? data.map((row: any) => ({
            id: row.id ? String(row.id) : `m-gen-${Math.random().toString(36).substr(2, 9)}`, 
            meterName: row.meterName,
            date: row.date,
            currentReading: Number(row.currentReading),
            previousReading: Number(row.previousReading),
            usage: Number(row.usage),
            ratePerKwh: Number(row.ratePerKwh),
            totalCost: Number(row.totalCost),
            note: row.note
        })) : null;
    } catch(e) { return null; }
}
