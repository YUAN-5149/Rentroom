import React, { useState } from 'react';
import { PaymentRecord } from '../types';
import { X, Printer, Receipt as ReceiptIcon } from 'lucide-react';

/**
 * 繳費收據 — 標記「已繳」的帳單可開立收據，列印 / 另存 PDF 交付租客。
 * 列印機制與住宅租賃契約書相同（print CSS 隱藏系統介面）。
 */

interface ReceiptModalProps {
  payment: PaymentRecord;
  roomNumber: string;
  onClose: () => void;
}

const RECEIPT_PRINT_CSS = `
@media print {
  @page { margin: 20mm; }
  body * { visibility: hidden !important; }
  #receipt-print-area, #receipt-print-area * { visibility: visible !important; }
  #receipt-modal { position: static !important; padding: 0 !important; background: none !important; }
  #receipt-panel { position: static !important; box-shadow: none !important; height: auto !important; max-height: none !important; border-radius: 0 !important; }
  #receipt-scroll { overflow: visible !important; height: auto !important; }
  #receipt-print-area { position: absolute !important; left: 0; top: 0; width: 100%; }
  #receipt-print-area input { border: none !important; border-bottom: 1px solid #444 !important; border-radius: 0 !important; background: none !important; }
}
`;

// 數字轉中文大寫（收據正式格式用）
const toChineseNumeral = (num: number): string => {
  const d = ['零', '壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖'];
  const u1 = ['', '拾', '佰', '仟'];
  const u2 = ['', '萬', '億'];
  let str = String(Math.floor(Math.abs(num)));
  if (str === '0') return '零';
  const groups: string[] = [];
  while (str.length > 0) { groups.unshift(str.slice(-4)); str = str.slice(0, -4); }
  let result = '';
  groups.forEach((g, gi) => {
    let gs = '';
    let zeroPending = false;
    for (let i = 0; i < g.length; i++) {
      const digit = Number(g[i]);
      const unitPos = g.length - 1 - i;
      if (digit === 0) { zeroPending = gs !== ''; }
      else {
        if (zeroPending) { gs += '零'; zeroPending = false; }
        gs += d[digit] + u1[unitPos];
      }
    }
    if (gs) result += gs + u2[groups.length - 1 - gi];
  });
  return result;
};

const rocToday = () => {
  const t = new Date();
  return { y: t.getFullYear() - 1911, m: t.getMonth() + 1, d: t.getDate() };
};

const ReceiptModal: React.FC<ReceiptModalProps> = ({ payment, roomNumber, onClose }) => {
  const typeLabel = payment.type === 'Rent' ? '房屋租金'
    : payment.type === 'Utility' ? '水電費'
    : payment.type === 'Deposit' ? '押金' : '其他費用';

  // 繳費期間預設為帳單繳費日的民國年月，可修改
  const defaultPeriod = (() => {
    const due = payment.dueDate || '';
    if (/^\d{4}-\d{2}/.test(due)) {
      return `民國 ${Number(due.slice(0, 4)) - 1911} 年 ${Number(due.slice(5, 7))} 月`;
    }
    return '';
  })();
  const [period, setPeriod] = useState(defaultPeriod);
  const [note, setNote] = useState('');
  const today = rocToday();

  return (
    <div id="receipt-modal" className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-0 sm:p-6">
      <style>{RECEIPT_PRINT_CSS}</style>
      <div id="receipt-panel" className="bg-surface w-full h-full sm:rounded-cozy sm:max-w-xl sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden shadow-warm-xl">

        {/* 工具列 */}
        <div className="px-4 sm:px-6 py-3 border-b border-line flex justify-between items-center bg-bg shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <ReceiptIcon size={18} className="text-accent" />
            <div>
              <h3 className="font-serif text-sm sm:text-base font-bold text-ink">繳費收據 · {payment.tenantName}</h3>
              <p className="text-[10px] text-ink-mute">期間與備註可修改後再列印</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs bg-ink text-white px-3 py-2 rounded-lg font-bold hover:bg-black transition shadow-warm-sm"
            >
              <Printer size={14} /> 列印 / 存 PDF
            </button>
            <button onClick={onClose} className="p-2 text-ink-mute hover:text-ink rounded-full hover:bg-surface-warm transition">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 收據內容 */}
        <div id="receipt-scroll" className="flex-1 overflow-y-auto p-4 sm:p-8 bg-bg/40">
          <div id="receipt-print-area" className="bg-surface border-4 border-double border-stone-400 rounded-sm p-8 sm:p-10 max-w-lg mx-auto text-ink">

            <h1 className="text-center text-2xl font-black tracking-[0.5em] mb-1 font-serif">收　據</h1>
            <p className="text-center text-[10px] text-ink-mute tracking-widest mb-6">RECEIPT</p>

            <div className="flex justify-between text-xs text-ink-soft mb-6">
              <span>收據編號：R-{payment.id.replace(/^pay?-/, '').toUpperCase()}</span>
              <span>開立日期：民國 {today.y} 年 {today.m} 月 {today.d} 日</span>
            </div>

            <p className="text-sm leading-8 mb-2">
              茲收到承租人 <b className="text-base px-1 border-b border-stone-400">{payment.tenantName}</b> 繳納下列款項：
            </p>

            <table className="w-full text-sm my-4 border-collapse">
              <tbody>
                <tr className="border-y border-stone-300">
                  <td className="py-2.5 w-24 text-ink-soft">房　　號</td>
                  <td className="py-2.5 font-bold">{roomNumber}</td>
                </tr>
                <tr className="border-b border-stone-300">
                  <td className="py-2.5 text-ink-soft">費用類別</td>
                  <td className="py-2.5 font-bold">{typeLabel}</td>
                </tr>
                <tr className="border-b border-stone-300">
                  <td className="py-2.5 text-ink-soft">繳費期間</td>
                  <td className="py-2.5">
                    <input
                      value={period}
                      onChange={e => setPeriod(e.target.value)}
                      className="w-full bg-transparent border-b border-dashed border-stone-400 outline-none font-bold focus:border-accent"
                    />
                  </td>
                </tr>
                <tr className="border-b border-stone-300">
                  <td className="py-2.5 text-ink-soft">金　　額</td>
                  <td className="py-2.5">
                    <span className="font-black text-lg">NT$ {payment.amount.toLocaleString()}</span>
                    <span className="block text-xs text-ink-soft mt-1">新臺幣 {toChineseNumeral(payment.amount)} 元整</span>
                  </td>
                </tr>
                <tr className="border-b border-stone-300">
                  <td className="py-2.5 text-ink-soft">備　　註</td>
                  <td className="py-2.5">
                    <input
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="（無）"
                      className="w-full bg-transparent border-b border-dashed border-stone-400 outline-none focus:border-accent"
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            <p className="text-xs text-ink-mute leading-6 mb-10">上列款項業已如數收訖，特立此據為憑。</p>

            <div className="flex justify-end">
              <div className="text-sm text-right space-y-8">
                <p>出租人（收款人）簽章：<span className="inline-block w-40 border-b border-stone-400 align-bottom">&nbsp;</span></p>
              </div>
            </div>

            <p className="text-center text-sm mt-10 tracking-wider">
              中　華　民　國　{today.y}　年　{today.m}　月　{today.d}　日
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;
