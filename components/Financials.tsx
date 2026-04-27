
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { PaymentRecord, PaymentStatus, Tenant } from '../types';
import { FileSpreadsheet, Home, Trash2, AlertTriangle, Plus, X, Save, Calendar } from 'lucide-react';

interface FinancialsProps {
  payments: PaymentRecord[];
  tenants: Tenant[];
  onUpdatePayment: (id: string, updates: Partial<PaymentRecord>) => void;
  onDeletePayment: (id: string) => void;
  onAddPayments: (records: PaymentRecord[]) => void;
}

const Financials: React.FC<FinancialsProps> = ({ payments, tenants, onUpdatePayment, onDeletePayment, onAddPayments }) => {
  const [filter, setFilter] = useState<PaymentStatus | 'ALL'>('ALL');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Add Form State
  const [newPayment, setNewPayment] = useState<Partial<PaymentRecord>>({
    tenantId: '',
    amount: 0,
    dueDate: new Date().toISOString().split('T')[0],
    status: PaymentStatus.PENDING,
    type: 'Utility'
  });

  const filteredPayments = payments.filter(p => filter === 'ALL' || p.status === filter);

  const getTenantInfo = (tenantId: string) => {
    return tenants.find(t => t.id === tenantId) || { name: '未知租客', roomNumber: '未知' };
  };

  const handleExportExcel = () => {
    const dataToExport = filteredPayments.map(p => {
        const tenant = getTenantInfo(p.tenantId);
        return {
            租客姓名: tenant.name,
            房號: tenant.roomNumber,
            金額: p.amount,
            繳費日: p.dueDate,
            狀態: p.status,
            類別: p.type === 'Rent' ? '租金' : p.type === 'Deposit' ? '押金' : p.type === 'Utility' ? '水電' : '其他'
        };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financials");
    XLSX.writeFile(wb, "Rent_Report.xlsx");
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.tenantId) return alert('請選擇租客');
    
    const tenant = getTenantInfo(newPayment.tenantId);
    const record: PaymentRecord = {
      id: `p-${Date.now()}`,
      tenantId: newPayment.tenantId,
      tenantName: tenant.name,
      amount: Number(newPayment.amount),
      dueDate: newPayment.dueDate || '',
      status: newPayment.status || PaymentStatus.PENDING,
      type: newPayment.type as any
    };

    onAddPayments([record]);
    setIsAddModalOpen(false);
    setNewPayment({ tenantId: '', amount: 0, dueDate: new Date().toISOString().split('T')[0], status: PaymentStatus.PENDING, type: 'Utility' });
  };

  const confirmDelete = () => {
    if (deleteTargetId) {
      onDeletePayment(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
        case PaymentStatus.PAID: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case PaymentStatus.OVERDUE: return 'bg-rose-100 text-rose-800 border-rose-200';
        default: return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
        case 'Rent': return <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded font-bold border border-amber-100">租金</span>;
        case 'Deposit': return <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded font-bold border border-indigo-100">押金</span>;
        case 'Utility': return <span className="text-[10px] px-1.5 py-0.5 bg-sky-50 text-sky-600 rounded font-bold border border-sky-100">水電</span>;
        default: return <span className="text-[10px] px-1.5 py-0.5 bg-stone-50 text-stone-500 rounded font-bold border border-stone-100">其他</span>;
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-4 rounded-lg shadow-sm border-b-2 border-orange-100 gap-4">
        <h2 className="text-2xl font-bold text-stone-800">財務管理</h2>
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
          <select 
            className="border border-stone-300 rounded-md px-3 py-2 text-sm text-stone-700 bg-white flex-grow xl:flex-grow-0"
            value={filter}
            onChange={(e) => setFilter(e.target.value as PaymentStatus | 'ALL')}
          >
            <option value="ALL">全部顯示</option>
            <option value={PaymentStatus.PAID}>已繳</option>
            <option value={PaymentStatus.PENDING}>待繳</option>
            <option value={PaymentStatus.OVERDUE}>逾期</option>
          </select>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex-grow xl:flex-grow-0 flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-900 text-white px-4 py-2 rounded-md text-sm transition shadow-sm whitespace-nowrap"
          >
            <Plus size={16} /> <span className="hidden sm:inline">新增帳單</span><span className="sm:hidden">新增</span>
          </button>
          <button 
            onClick={handleExportExcel}
            className="flex-grow xl:flex-grow-0 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md text-sm transition shadow-sm whitespace-nowrap"
          >
            <FileSpreadsheet size={16} /> 匯出
          </button>
        </div>
      </div>

      {/* Mobile card view */}
      <div className="sm:hidden space-y-3">
        {filteredPayments.map((payment) => {
          const tenant = getTenantInfo(payment.tenantId);
          return (
            <div key={payment.id} className="bg-white rounded-lg shadow-sm border border-stone-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-amber-50 px-2 py-1 rounded">
                    <Home size={13} className="text-amber-500" />
                    <span className="text-xs font-bold text-amber-700">{tenant.roomNumber}</span>
                  </div>
                  <span className="text-sm font-bold text-stone-800">{payment.tenantName}</span>
                </div>
                <button onClick={() => setDeleteTargetId(payment.id)} className="text-stone-300 hover:text-rose-500 transition p-1">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-black text-stone-800">${payment.amount.toLocaleString()}</span>
                    {getTypeBadge(payment.type)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-stone-500">
                    <Calendar size={12} />
                    <input
                      type="date"
                      value={payment.dueDate}
                      onChange={(e) => onUpdatePayment(payment.id, { dueDate: e.target.value })}
                      className="bg-transparent border-b border-dashed border-stone-300 outline-none text-stone-600 font-medium"
                    />
                  </div>
                </div>
                <select
                  value={payment.status}
                  onChange={(e) => onUpdatePayment(payment.id, { status: e.target.value as PaymentStatus })}
                  className={`text-xs font-semibold py-1.5 px-3 rounded-full border cursor-pointer outline-none transition appearance-none ${getStatusColor(payment.status)}`}
                >
                  <option value={PaymentStatus.PENDING}>待繳</option>
                  <option value={PaymentStatus.PAID}>已繳</option>
                  <option value={PaymentStatus.OVERDUE}>逾期</option>
                </select>
              </div>
            </div>
          );
        })}
        {filteredPayments.length === 0 && (
          <div className="bg-white rounded-lg p-12 text-center text-stone-400 italic">無帳單資料</div>
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block bg-white rounded-lg shadow overflow-hidden border border-stone-200">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-orange-100">
            <thead className="bg-orange-50">
                <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase tracking-wider whitespace-nowrap">房號</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase tracking-wider whitespace-nowrap">租客</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase tracking-wider whitespace-nowrap">金額</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase tracking-wider whitespace-nowrap">繳費日</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase tracking-wider whitespace-nowrap">狀態</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-amber-900 uppercase tracking-wider whitespace-nowrap">操作</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-orange-50">
                {filteredPayments.map((payment) => {
                const tenant = getTenantInfo(payment.tenantId);
                return (
                    <tr key={payment.id} className="hover:bg-orange-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-stone-700">
                        <div className="flex items-center gap-2">
                            <Home size={16} className="text-amber-400" />
                            {tenant.roomNumber}
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-stone-800">
                        {payment.tenantName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                        <span className="text-sm text-stone-800 font-semibold">${payment.amount.toLocaleString()}</span>
                        <div className="flex gap-1">
                            {getTypeBadge(payment.type)}
                        </div>
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 group">
                            <Calendar size={14} className="text-stone-900 group-hover:text-amber-600 transition-colors" />
                            <input
                            type="date"
                            value={payment.dueDate}
                            onChange={(e) => onUpdatePayment(payment.id, { dueDate: e.target.value })}
                            className="text-sm bg-transparent border-b border-dashed border-stone-300 hover:border-amber-500 hover:text-amber-700 focus:border-amber-600 focus:ring-0 outline-none px-1 py-0.5 text-stone-800 font-medium transition cursor-pointer"
                            />
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <select
                            value={payment.status}
                            onChange={(e) => onUpdatePayment(payment.id, { status: e.target.value as PaymentStatus })}
                            className={`text-sm font-semibold py-1 px-3 rounded-full border cursor-pointer outline-none transition appearance-none ${getStatusColor(payment.status)}`}
                        >
                            <option value={PaymentStatus.PENDING}>待繳</option>
                            <option value={PaymentStatus.PAID}>已繳</option>
                            <option value={PaymentStatus.OVERDUE}>逾期</option>
                        </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-400">
                        <button onClick={() => setDeleteTargetId(payment.id)} className="hover:text-rose-600 transition p-2">
                            <Trash2 size={18} />
                        </button>
                    </td>
                    </tr>
                );
                })}
                {filteredPayments.length === 0 && (
                <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-stone-400 italic">無帳單資料</td>
                </tr>
                )}
            </tbody>
            </table>
        </div>
      </div>

      {/* Add Payment Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-orange-50 shrink-0">
              <h3 className="text-lg font-bold text-stone-800">新增繳費帳單</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-stone-400 hover:text-stone-600"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto">
                <form onSubmit={handleAddPayment} className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-stone-700 mb-1">選擇租客</label>
                    <select 
                    className="w-full border border-stone-300 rounded-lg p-2 text-sm bg-white"
                    value={newPayment.tenantId}
                    onChange={(e) => setNewPayment({...newPayment, tenantId: e.target.value})}
                    required
                    >
                    <option value="">請選擇租客...</option>
                    {tenants.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.roomNumber})</option>
                    ))}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="block text-sm font-bold text-stone-700 mb-1">帳單類別</label>
                    <select 
                        className="w-full border border-stone-300 rounded-lg p-2 text-sm bg-white"
                        value={newPayment.type}
                        onChange={(e) => setNewPayment({...newPayment, type: e.target.value as any})}
                    >
                        <option value="Rent">租金</option>
                        <option value="Utility">水電</option>
                        <option value="Deposit">押金</option>
                        <option value="Other">其他</option>
                    </select>
                    </div>
                    <div>
                    <label className="block text-sm font-bold text-stone-700 mb-1">帳單金額</label>
                    <input 
                        type="number" 
                        className="w-full border border-stone-300 rounded-lg p-2 text-sm"
                        value={newPayment.amount}
                        onChange={(e) => setNewPayment({...newPayment, amount: Number(e.target.value)})}
                        required
                    />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-bold text-stone-700 mb-1">繳費日</label>
                    <div className="relative">
                        <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-900 pointer-events-none" />
                        <input 
                        type="date" 
                        className="w-full border border-stone-300 rounded-lg pl-10 pr-2 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                        value={newPayment.dueDate}
                        onChange={(e) => setNewPayment({...newPayment, dueDate: e.target.value})}
                        required
                        />
                    </div>
                </div>
                <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 bg-stone-100 py-2 rounded-lg text-sm font-bold text-stone-600">取消</button>
                    <button type="submit" className="flex-1 bg-amber-600 py-2 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2"><Save size={16}/> 建立帳單</button>
                </div>
                </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-sm w-full overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-4 mx-auto text-rose-600"><AlertTriangle size={24} /></div>
              <h3 className="text-xl font-bold text-stone-800 mb-2">確認刪除?</h3>
              <p className="text-stone-500 text-sm">此操作無法復原。</p>
            </div>
            <div className="flex border-t border-stone-100">
              <button onClick={() => setDeleteTargetId(null)} className="flex-1 px-6 py-4 text-stone-600 font-medium hover:bg-stone-50 border-r border-stone-100">取消</button>
              <button onClick={confirmDelete} className="flex-1 px-6 py-4 text-rose-600 font-bold hover:bg-rose-50">確認刪除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Financials;
