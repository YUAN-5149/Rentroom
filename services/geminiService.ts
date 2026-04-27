import { PaymentRecord } from "../types";

// API Key 設定已移除，改為使用本地模版生成訊息
export const generatePaymentReminder = async (record: PaymentRecord, daysOverdue: number): Promise<string> => {
  // 模擬延遲以提供更好的 UX 感受 (可選)
  await new Promise(resolve => setTimeout(resolve, 500));

  return `[溫馨提醒] \n\n您好 ${record.tenantName}，\n\n提醒您，您的 ${record.type} 款項 (新台幣 $${record.amount.toLocaleString()}) 原定於 ${record.dueDate} 繳納，目前已逾期 ${daysOverdue} 天。\n\n請您撥冗儘速處理繳費事宜。若您已完成繳款，請忽略此訊息。若有任何問題或需要協助，歡迎隨時與我聯繫。\n\n祝 平安順心`;
};