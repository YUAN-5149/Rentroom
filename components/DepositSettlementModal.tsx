import React, { useState, useMemo } from 'react';
import { Tenant, PaymentRecord, PaymentStatus, MaintenanceTicket } from '../types';
import { X, Printer, Scale, Plus, Trash2 } from 'lucide-react';

/**
 * 押金結算單 — 退租時勾選扣抵項目（未繳帳單、維修費）並可自行增列，
 * 自動算出應退（或應補繳）金額，列印 / 另存 PDF 供雙方簽認。
 */

interface DepositSettlementModalProps {
  tenant: Tenant;
  payments: PaymentRecord[];
  tickets: MaintenanceTicket[];
  onClose: () => void;
}

const SETTLE_PRINT_CSS = `
@media print {
  @page { margin: 20mm; }
  body * { visibility: hidden !important; }
  #settle-print-area, #settle-print-area * { visibility: visible !important; }
  #settle-modal { position: static !important; padding: 0 !important; background: none !important; }
  #settle-panel { position: static !important; box-shadow: none !important; height: auto !important; max-height: none !important; border-radius: 0 !important; }
  #settle-scroll { overflow: visible !important; height: auto !important; }
  #settle-print-area { position: absolute !important; left: 0; top: 0; width: 100%; }
  .settle-no-print { display: none !important; }
}
`;

interface CustomRow { name: string; amount: number; }

const rocToday = () => {
  const t = new Date();
  return { y: t.getFullYear() - 1911, m: t.getMonth() + 1, d: t.getDate() };
};

const DepositSettlementModal: React.FC<DepositSettlementModalProps> = ({ tenant, payments, tickets, onClose }) => {
  // 可勾選的扣抵來源：該租客未繳的帳單、有費用的維修單
  const unpaidPayments = useMemo(
    () => payments.filter(p => p.tenantId === tenant.id && p.status !== PaymentStatus.PAID),
    [payments, tenant.id]
  );
  const costTickets = useMemo(
    () => tickets.filter(t => t.tenantId === tenant.id && (t.cost || 0) > 0),
    [tickets, tenant.id]
  );

  const [pickedPayments, setPickedPayments] = useState<string[]>([]);
  const [pickedTickets, setPickedTickets] = useState<string[]>([]);
  const [customRows, setCustomRows] = useState<CustomRow[]>([]);

  const toggle = (list: string[], setList: (v: string[]) => void, id: string) =>
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);

  const payTypeLabel = (t: string) => t === 'Rent' ? '租金' : t === 'Utility' ? '水電費' : t === 'Deposit' ? '押金' : '其他費用';

  // 結算明細（列印用）
  const deductions = useMemo(() => {
    const rows: { name: string; amount: number }[] = [];
    unpaidPayments.filter(p => pickedPayments.includes(p.id))
      .forEach(p => rows.push({ name: `欠繳${payTypeLabel(p.type)}（繳費日 ${p.dueDate}）`, amount: p.amount }));
    costTickets.filter(t => pickedTickets.includes(t.id))
      .forEach(t => rows.push({ name: `修繕費用：${t.description.slice(0, 20)}${t.description.length > 20 ? '…' : ''}`, amount: t.cost || 0 }));
    customRows.filter(r => r.name.trim() !== '' || r.amount > 0)
      .forEach(r => rows.push({ name: r.name || '其他扣抵', amount: r.amount }));
    return rows;
  }, [unpaidPayments, costTickets, pickedPayments, pickedTickets, customRows]);

  const totalDeduction = deductions.reduce((a, c) => a + c.amount, 0);
  const refund = tenant.deposit - totalDeduction;
  const today = rocToday();

  return (
    <div id="settle-modal" className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-0 sm:p-6">
      <style>{SETTLE_PRINT_CSS}</style>
      <div id="settle-panel" className="bg-surface w-full h-full sm:rounded-cozy sm:max-w-2xl sm:h-[94vh] flex flex-col overflow-hidden shadow-warm-xl">

        {/* 工具列 */}
        <div className="px-4 sm:px-6 py-3 border-b border-line flex justify-between items-center bg-bg shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <Scale size={18} className="text-accent" />
            <div>
              <h3 className="font-serif text-sm sm:text-base font-bold text-ink">押金結算單 · {tenant.name}</h3>
              <p className="text-[10px] text-ink-mute">勾選扣抵項目後列印，供退租點交時雙方簽認</p>
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

        <div id="settle-scroll" className="flex-1 overflow-y-auto">
          {/* 扣抵項目選擇（不列印） */}
          <div className="settle-no-print p-4 sm:p-6 space-y-4 bg-bg/40 border-b border-line">
            {unpaidPayments.length > 0 && (
              <div>
                <p className="text-xs font-bold text-ink-soft mb-2">未繳帳單（勾選列入扣抵）：</p>
                <div className="space-y-1.5">
                  {unpaidPayments.map(p => (
                    <label key={p.id} className="flex items-center gap-2.5 p-2.5 bg-surface rounded-lg border border-line text-sm cursor-pointer hover:border-accent transition">
                      <input type="checkbox" checked={pickedPayments.includes(p.id)} onChange={() => toggle(pickedPayments, setPickedPayments, p.id)} className="rounded text-accent focus:ring-accent" />
                      <span className="flex-1">{payTypeLabel(p.type)}（{p.dueDate} · {p.status}）</span>
                      <span className="font-bold text-ink">${p.amount.toLocaleString()}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {costTickets.length > 0 && (
              <div>
                <p className="text-xs font-bold text-ink-soft mb-2">維修紀錄（勾選列入扣抵）：</p>
                <div className="space-y-1.5">
                  {costTickets.map(t => (
                    <label key={t.id} className="flex items-center gap-2.5 p-2.5 bg-surface rounded-lg border border-line text-sm cursor-pointer hover:border-accent transition">
                      <input type="checkbox" checked={pickedTickets.includes(t.id)} onChange={() => toggle(pickedTickets, setPickedTickets, t.id)} className="rounded text-accent focus:ring-accent" />
                      <span className="flex-1 line-clamp-1">{t.description}（{t.reportDate}）</span>
                      <span className="font-bold text-ink">${(t.cost || 0).toLocaleString()}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-xs font-bold text-ink-soft mb-2">自行增列扣抵（清潔費、鑰匙遺失…）：</p>
              <div className="space-y-1.5">
                {customRows.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={r.name}
                      onChange={e => setCustomRows(rows => rows.map((x, xi) => xi === i ? { ...x, name: e.target.value } : x))}
                      placeholder="項目名稱"
                      className="flex-1 border border-line rounded-lg p-2 text-sm bg-surface outline-none focus:ring-2 focus:ring-accent/20"
                    />
                    <input
                      type="number"
                      value={r.amount || ''}
                      onChange={e => setCustomRows(rows => rows.map((x, xi) => xi === i ? { ...x, amount: Number(e.target.value) } : x))}
                      placeholder="金額"
                      className="w-28 border border-line rounded-lg p-2 text-sm bg-surface outline-none focus:ring-2 focus:ring-accent/20 text-right"
                    />
                    <button onClick={() => setCustomRows(rows => rows.filter((_, xi) => xi !== i))} className="p-2 text-ink-mute hover:text-rose-500"><Trash2 size={15} /></button>
                  </div>
                ))}
                <button
                  onClick={() => setCustomRows(rows => [...rows, { name: '', amount: 0 }])}
                  className="flex items-center gap-1 text-xs text-accent font-bold hover:underline"
                >
                  <Plus size={13} /> 新增一列
                </button>
              </div>
            </div>
          </div>

          {/* 結算單（列印區） */}
          <div className="p-4 sm:p-8">
            <div id="settle-print-area" className="bg-surface border-4 border-double border-stone-400 rounded-sm p-8 sm:p-10 max-w-lg mx-auto text-ink">
              <h1 className="text-center text-2xl font-black tracking-[0.3em] mb-1 font-serif">押金結算單</h1>
              <p className="text-center text-[10px] text-ink-mute tracking-widest mb-6">DEPOSIT SETTLEMENT</p>

              <table className="w-full text-sm border-collapse mb-2">
                <tbody>
                  <tr className="border-y border-stone-300">
                    <td className="py-2 w-24 text-ink-soft">承 租 人</td>
                    <td className="py-2 font-bold">{tenant.name}</td>
                    <td className="py-2 w-20 text-ink-soft">房　號</td>
                    <td className="py-2 font-bold">{tenant.roomNumber}</td>
                  </tr>
                  <tr className="border-b border-stone-300">
                    <td className="py-2 text-ink-soft">租賃期間</td>
                    <td className="py-2 font-bold" colSpan={3}>{tenant.moveInDate} ～ {tenant.leaseEndDate || '＿＿＿＿'}</td>
                  </tr>
                  <tr className="border-b border-stone-300">
                    <td className="py-2 text-ink-soft">原收押金</td>
                    <td className="py-2 font-black text-base" colSpan={3}>NT$ {tenant.deposit.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              <p className="text-xs font-bold text-ink-soft mt-4 mb-1.5">扣抵明細：</p>
              <table className="w-full text-sm border-collapse">
                <tbody>
                  {deductions.length > 0 ? deductions.map((d, i) => (
                    <tr key={i} className="border-b border-dashed border-stone-300">
                      <td className="py-1.5 text-ink-soft w-6">{i + 1}.</td>
                      <td className="py-1.5">{d.name}</td>
                      <td className="py-1.5 text-right font-bold whitespace-nowrap">− ${d.amount.toLocaleString()}</td>
                    </tr>
                  )) : (
                    <tr className="border-b border-dashed border-stone-300">
                      <td className="py-2 text-ink-mute text-center" colSpan={3}>（無扣抵項目）</td>
                    </tr>
                  )}
                  <tr>
                    <td className="pt-2.5 font-bold" colSpan={2}>扣抵合計</td>
                    <td className="pt-2.5 text-right font-black whitespace-nowrap">− ${totalDeduction.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              <div className={`mt-4 p-3.5 rounded-lg border-2 ${refund >= 0 ? 'border-stone-400 bg-bg/60' : 'border-rose-300 bg-rose-50/60'}`}>
                <div className="flex justify-between items-baseline">
                  <span className="font-bold">{refund >= 0 ? '應退還承租人押金' : '押金不足，承租人應補繳'}</span>
                  <span className={`font-black text-xl ${refund >= 0 ? 'text-ink' : 'text-rose-600'}`}>NT$ {Math.abs(refund).toLocaleString()}</span>
                </div>
              </div>

              <p className="text-xs text-ink-mute leading-6 mt-4 mb-8">
                雙方確認上列結算內容無誤，{refund >= 0 ? '出租人已將應退金額退還承租人' : '承租人已補繳不足金額'}，
                自簽認日起押金結清，雙方不再互負押金相關之返還或請求義務。
              </p>

              <div className="space-y-6 text-sm">
                <p>出租人簽章：<span className="inline-block w-44 border-b border-stone-400 align-bottom">&nbsp;</span></p>
                <p>承租人簽章：<span className="inline-block w-44 border-b border-stone-400 align-bottom">&nbsp;</span></p>
              </div>

              <p className="text-center text-sm mt-8 tracking-wider">
                中　華　民　國　{today.y}　年　{today.m}　月　{today.d}　日
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepositSettlementModal;
