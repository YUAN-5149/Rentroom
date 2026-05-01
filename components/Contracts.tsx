
import React, { useState, useEffect, useMemo } from 'react';
import { Tenant, PaymentRecord, PaymentStatus } from '../types';
import { FileText, Edit, Plus, Trash2, User, Save, X, ChevronRight, Search, Users, Zap, DollarSign, Clock, Printer, ScrollText, Home, FileSpreadsheet, Fingerprint } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ContractsProps {
  tenants: Tenant[];
  payments: PaymentRecord[];
  onAddTenant: (tenant: Tenant, options?: { genRent: boolean, genDeposit: boolean }) => void;
  onUpdateTenant: (tenant: Tenant) => void;
  onDeleteTenant: (id: string) => void;
}

const Contracts: React.FC<ContractsProps> = ({ tenants, payments, onAddTenant, onUpdateTenant, onDeleteTenant }) => {
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [mode, setMode] = useState<'VIEW' | 'EDIT_INFO' | 'ADD'>('VIEW');
  const [searchQuery, setSearchQuery] = useState('');
  const [genRent, setGenRent] = useState(true);
  const [genDeposit, setGenDeposit] = useState(true);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  
  const initialFormState: Tenant = {
    id: '', name: '', roomNumber: '', phone: '', email: '', moveInDate: new Date().toISOString().split('T')[0],
    leaseEndDate: '', rentAmount: 0, deposit: 0, idNumber: '', contractContent: '', fingerprintId: '',
  };

  const [formData, setFormData] = useState<Tenant>(initialFormState);
  const selectedTenant = tenants.find(t => t.id === selectedTenantId) || null;

  const tenantPayments = useMemo(() => {
    return payments.filter(p => p.tenantId === selectedTenantId).sort((a, b) => b.dueDate.localeCompare(a.dueDate));
  }, [payments, selectedTenantId]);

  useEffect(() => {
    if (mode === 'ADD') {
      setFormData(initialFormState);
    } else if (selectedTenant) {
      setFormData(selectedTenant);
    }
  }, [selectedTenant, mode]);

  const filteredTenants = useMemo(() => {
    return tenants.filter(t => 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.fingerprintId && t.fingerprintId.includes(searchQuery))
    );
  }, [tenants, searchQuery]);

  const getTenantFinancialStatus = (tenantId: string) => {
    const tP = payments.filter(p => p.tenantId === tenantId);
    if (tP.length === 0) return 'NONE';
    if (tP.some(p => p.status === PaymentStatus.OVERDUE)) return 'OVERDUE';
    if (tP.some(p => p.status === PaymentStatus.PENDING)) return 'PENDING';
    return 'CLEAN';
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'ADD') {
      onAddTenant(formData, { genRent, genDeposit });
    } else {
      onUpdateTenant(formData);
    }
    setMode('VIEW');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: (name === 'rentAmount' || name === 'deposit') ? Number(value) : value }));
  };

  const handleExportTenants = () => {
    const dataToExport = tenants.map(t => ({
      房號: t.roomNumber,
      姓名: t.name,
      電話: t.phone,
      指紋建置號碼: t.fingerprintId || '',
      Email: t.email,
      身分證字號: t.idNumber,
      起租日期: t.moveInDate,
      租期屆滿: t.leaseEndDate,
      租金: t.rentAmount,
      押金: t.deposit,
      特別約定: t.contractContent
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tenants");
    XLSX.writeFile(wb, "Tenant_List.xlsx");
  };

  const renderContractText = (data: Tenant) => {
    const name = data.name || '________';
    const idNumber = data.idNumber || '________________';
    const room = data.roomNumber || '____';
    const rent = data.rentAmount ? data.rentAmount.toLocaleString() : '________';
    const deposit = data.deposit ? data.deposit.toLocaleString() : '________';
    const startDate = data.moveInDate || '    年    月    日';
    const endDate = data.leaseEndDate || '    年    月    日';

    return `住宅租賃契約書 (內政部範本參考)

第一條：租賃標的
    房屋所在地：本物業 ${room} 室。
    
第二條：租賃期間
    自 ${startDate} 起至 ${endDate} 止。

第三條：租金約定及支付
    每月租金為新臺幣 ${rent} 元整。
    承租人應於每月____日前支付租金，不得藉詞拖延。

第四條：押金約定及返還
    押金為新臺幣 ${deposit} 元整（最高不得超過二個月租金之總額）。
    承租人於租賃期滿交還房屋並扣除欠稅費後，由出租人無息返還。

第五條：當事人資訊
    承租人：${name}
    身分證字號：${idNumber}
    聯絡電話：${data.phone || '________________'}

第六條：特別約定事項
    ${data.contractContent || '（無特別約定事項）'}

第七條：返還義務
    租賃期滿，承租人應將租賃物遷空交還出租人。

--- 出租人（簽章）：________________    承租人（簽章）：________________`;
  };
  
  const downloadContract = () => {
     if (!selectedTenant) return;
     const element = document.createElement("a");
     const file = new Blob([renderContractText(selectedTenant)], {type: 'text/plain'});
     element.href = URL.createObjectURL(file);
     element.download = `Contract_${selectedTenant.name}.txt`;
     document.body.appendChild(element);
     element.click();
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-center bg-surface p-4 rounded-cozy shadow-warm-sm border border-line gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="bg-accent-soft p-2.5 rounded-lg text-accent">
                <ScrollText size={20} />
            </div>
            <div>
                <h2 className="font-serif text-lg font-bold text-ink tracking-tight">合約與租客管理</h2>
                <p className="text-[10px] text-ink-mute font-bold uppercase tracking-widest">智慧合約產生系統</p>
            </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={handleExportTenants} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 bg-surface border border-line hover:bg-bg text-ink rounded-lg text-xs font-bold transition-all shadow-warm-sm whitespace-nowrap">
                <FileSpreadsheet size={14} /> <span className="hidden sm:inline">匯出名單</span><span className="sm:hidden">匯出</span>
            </button>
            <button onClick={() => { setMode('ADD'); setSelectedTenantId(null); setMobileView('detail'); }} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 bg-ink hover:bg-black text-white rounded-lg text-xs font-bold transition-all shadow-warm-lg hover:shadow-warm-xl active:scale-95 whitespace-nowrap">
                <Plus size={14} /> <span className="hidden sm:inline">新增租客</span><span className="sm:hidden">新增</span>
            </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* List Panel */}
        <div className={`lg:w-72 flex-shrink-0 bg-surface rounded-cozy shadow-warm-sm border border-line overflow-hidden flex-col transition-all duration-300 ${mobileView === 'list' ? 'flex' : 'hidden'} lg:flex lg:h-auto h-auto`}>
          <div className="p-4 bg-bg border-b border-line">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-mute" size={12} />
              <input type="text" placeholder="搜尋租客、房號、指紋..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-surface border border-line rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all" />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-line/50">
            {filteredTenants.length > 0 ? filteredTenants.map(t => {
              const finStatus = getTenantFinancialStatus(t.id);
              return (
                <div key={t.id} onClick={() => { setSelectedTenantId(t.id); setMode('VIEW'); setMobileView('detail'); }} className={`p-4 cursor-pointer hover:bg-accent-soft/40/40 transition-all border-l-4 ${selectedTenantId === t.id ? 'bg-accent-soft/40 border-accent shadow-warm-sm' : 'border-transparent'}`}>
                  <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${finStatus === 'OVERDUE' ? 'bg-rose-500' : finStatus === 'PENDING' ? 'bg-accent/70' : 'bg-leaf'}`} />
                        <p className={`font-bold text-sm ${selectedTenantId === t.id ? 'text-warm-600' : 'text-ink'}`}>{t.name}</p>
                      </div>
                      <ChevronRight size={14} className={selectedTenantId === t.id ? 'text-accent' : 'text-ink-mute'} />
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-[10px] text-ink-mute font-bold ml-4 uppercase">{t.roomNumber} 室</p>
                    {t.fingerprintId && (
                        <p className="text-[9px] font-bold text-accent bg-accent-soft/40 px-1 rounded flex items-center gap-1">
                            <Fingerprint size={8} /> #{t.fingerprintId}
                        </p>
                    )}
                  </div>
                </div>
              );
            }) : (
                <div className="p-8 text-center text-ink-mute text-xs">
                    無符合租客
                </div>
            )}
          </div>
        </div>

        {/* Detail / Edit / Add Panel */}
        <div className={`flex-1 bg-surface rounded-cozy shadow-warm-sm border border-line overflow-hidden flex-col min-h-[500px] ${mobileView === 'detail' || mode === 'ADD' ? 'flex' : 'hidden'} lg:flex`}>
          {mode === 'ADD' || (mode === 'EDIT_INFO' && selectedTenant) ? (
             <div className="flex flex-col h-full">
                <div className="px-6 py-4 border-b border-line flex justify-between items-center bg-bg">
                    <div className="flex items-center gap-2">
                        <button onClick={() => { setMobileView('list'); setMode('VIEW'); }} className="lg:hidden p-1 text-ink-mute hover:text-ink-soft mr-1">
                          <Home size={16} />
                        </button>
                        <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                            {mode === 'ADD' ? <><Plus size={16}/> 新增租客資料</> : <><Edit size={16}/> 編輯租客資料</>}
                        </h3>
                    </div>
                    <button onClick={() => { setMode('VIEW'); setMobileView('list'); }} className="text-ink-mute hover:text-ink-soft"><X size={18} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                    <form onSubmit={handleSave} className="space-y-6 max-w-3xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-accent uppercase tracking-wider border-b border-accent-soft pb-2 mb-4">基本資料</h4>
                                <div><label className="block text-xs font-bold text-ink-soft mb-1">姓名</label><input required name="name" value={formData.name} onChange={handleInputChange} className="w-full border border-line rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-ink-soft mb-1">手機電話</label><input required name="phone" value={formData.phone} onChange={handleInputChange} className="w-full border border-line rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
                                    <div><label className="block text-xs font-bold text-accent mb-1 flex items-center gap-1"><Fingerprint size={12}/> 指紋建置號碼</label><input name="fingerprintId" value={formData.fingerprintId || ''} onChange={handleInputChange} className="w-full border border-accent-soft rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-accent/20 outline-none bg-accent-soft/40/30" placeholder="編號" /></div>
                                </div>
                                <div><label className="block text-xs font-bold text-ink-soft mb-1">身分證字號</label><input name="idNumber" value={formData.idNumber} onChange={handleInputChange} className="w-full border border-line rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
                                <div><label className="block text-xs font-bold text-ink-soft mb-1">電子郵件</label><input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full border border-line rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-accent uppercase tracking-wider border-b border-accent-soft pb-2 mb-4">租賃資訊</h4>
                                <div><label className="block text-xs font-bold text-ink-soft mb-1">房號</label><input required name="roomNumber" value={formData.roomNumber} onChange={handleInputChange} className="w-full border border-line rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-ink-soft mb-1">起租日期</label><input type="date" required name="moveInDate" value={formData.moveInDate} onChange={handleInputChange} className="w-full border border-line rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
                                    <div><label className="block text-xs font-bold text-ink-soft mb-1">合約到期</label><input type="date" name="leaseEndDate" value={formData.leaseEndDate} onChange={handleInputChange} className="w-full border border-line rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-ink-soft mb-1">每月租金</label><input type="number" required name="rentAmount" value={formData.rentAmount} onChange={handleInputChange} className="w-full border border-line rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
                                    <div><label className="block text-xs font-bold text-ink-soft mb-1">押金金額</label><input type="number" required name="deposit" value={formData.deposit} onChange={handleInputChange} className="w-full border border-line rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-accent/20 outline-none" /></div>
                                </div>
                            </div>
                        </div>
                        <div>
                             <h4 className="text-xs font-bold text-accent uppercase tracking-wider border-b border-accent-soft pb-2 mb-4">特別約定</h4>
                             <textarea name="contractContent" value={formData.contractContent} onChange={handleInputChange} rows={4} className="w-full border border-line rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent/20 outline-none" placeholder="例如：不可養寵物、不可開伙..." />
                        </div>

                        {mode === 'ADD' && (
                             <div className="bg-bg p-4 rounded-lg border border-line">
                                <h4 className="text-xs font-bold text-ink mb-3">自動建立首期帳單</h4>
                                <div className="flex gap-6">
                                    <label className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
                                        <input type="checkbox" checked={genRent} onChange={(e) => setGenRent(e.target.checked)} className="rounded text-accent focus:ring-accent" /> 建立首月租金帳單
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
                                        <input type="checkbox" checked={genDeposit} onChange={(e) => setGenDeposit(e.target.checked)} className="rounded text-accent focus:ring-accent" /> 建立押金帳單
                                    </label>
                                </div>
                             </div>
                        )}

                        <div className="pt-4 flex justify-end gap-3">
                            <button type="button" onClick={() => setMode('VIEW')} className="px-6 py-2.5 rounded-lg text-sm font-bold text-ink-soft hover:bg-surface-warm transition">取消</button>
                            <button type="submit" className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-ink hover:bg-black transition shadow-warm-lg flex items-center gap-2">
                                <Save size={16} /> 儲存資料
                            </button>
                        </div>
                    </form>
                </div>
             </div>
          ) : selectedTenant ? (
             <div className="flex flex-col h-full">
                {/* View Mode Header */}
                <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-line flex justify-between items-start bg-gradient-to-r from-stone-50 to-white gap-2">
                    <div className="flex-1 min-w-0">
                        <button onClick={() => setMobileView('list')} className="lg:hidden flex items-center gap-1 text-xs text-accent font-bold mb-2">
                          <ChevronRight size={12} className="rotate-180" /> 返回列表
                        </button>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h2 className="text-xl sm:text-2xl font-black text-ink">{selectedTenant.name}</h2>
                            <span className="px-2 py-0.5 bg-accent-soft text-accent text-xs font-bold rounded uppercase">{selectedTenant.roomNumber} 室</span>
                            {selectedTenant.fingerprintId && (
                                <span className="px-2 py-0.5 bg-accent text-white text-[10px] font-bold rounded flex items-center gap-1 shadow-warm-sm"><Fingerprint size={10}/> 指紋 #{selectedTenant.fingerprintId}</span>
                            )}
                        </div>
                        <p className="text-xs sm:text-sm text-ink-soft font-medium flex flex-wrap items-center gap-2 sm:gap-4">
                            <span className="flex items-center gap-1"><User size={14}/> {selectedTenant.phone}</span>
                            <span className="flex items-center gap-1">租期: {selectedTenant.moveInDate} ~ {selectedTenant.leaseEndDate || '未定'}</span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setMode('EDIT_INFO')} className="p-2 text-ink-mute hover:text-accent hover:bg-accent-soft/40 rounded-full transition" title="編輯"><Edit size={18} /></button>
                        <button onClick={() => { if(window.confirm('確定刪除?')) { onDeleteTenant(selectedTenant.id); setSelectedTenantId(null); } }} className="p-2 text-ink-mute hover:text-rose-600 hover:bg-rose-50 rounded-full transition" title="刪除"><Trash2 size={18} /></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="p-4 sm:p-8 grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-8">
                        {/* Financial Card */}
                        <div className="bg-surface rounded-cozy border border-line p-6 shadow-warm-sm">
                            <h4 className="text-sm font-bold text-ink mb-4 flex items-center gap-2">
                                <DollarSign size={16} className="text-leaf" /> 財務概況
                            </h4>
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-3 bg-bg rounded-lg">
                                    <p className="text-xs text-ink-soft mb-1">每月租金</p>
                                    <p className="text-lg font-black text-ink">${selectedTenant.rentAmount.toLocaleString()}</p>
                                </div>
                                <div className="p-3 bg-bg rounded-lg">
                                    <p className="text-xs text-ink-soft mb-1">押金保管</p>
                                    <p className="text-lg font-black text-ink">${selectedTenant.deposit.toLocaleString()}</p>
                                </div>
                            </div>
                            
                            <h5 className="text-xs font-bold text-ink-mute uppercase tracking-wider mb-3">近期繳費紀錄</h5>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                {tenantPayments.length > 0 ? tenantPayments.map(p => (
                                    <div key={p.id} className="flex justify-between items-center text-sm p-2 hover:bg-bg rounded border border-transparent hover:border-line transition">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-1.5 h-1.5 rounded-full ${p.status === '已繳' ? 'bg-leaf' : p.status === '逾期' ? 'bg-rose-500' : 'bg-accent/70'}`}></div>
                                            <span className="text-ink font-medium">{p.dueDate}</span>
                                            <span className="text-xs text-ink-mute bg-surface-warm px-1.5 rounded">{p.type === 'Rent' ? '租金' : '水電'}</span>
                                        </div>
                                        <span className="font-bold text-ink-soft">${p.amount.toLocaleString()}</span>
                                    </div>
                                )) : <p className="text-xs text-ink-mute italic text-center py-4">尚無繳費紀錄</p>}
                            </div>
                        </div>

                        {/* Contract Preview */}
                        <div className="bg-bg rounded-cozy border border-line p-6 shadow-inner flex flex-col">
                             <div className="flex justify-between items-center mb-4">
                                <h4 className="text-sm font-bold text-ink flex items-center gap-2">
                                    <FileText size={16} className="text-accent" /> 租賃合約預覽
                                </h4>
                                <button onClick={downloadContract} className="text-xs bg-surface border border-line px-3 py-1.5 rounded hover:bg-surface-warm text-ink-soft font-bold flex items-center gap-1 transition">
                                    <Printer size={12} /> 下載合約
                                </button>
                             </div>
                             <div className="flex-1 bg-surface border border-line rounded p-4 text-[10px] text-ink-soft font-mono leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[400px]">
                                {renderContractText(selectedTenant)}
                             </div>
                        </div>
                    </div>
                </div>
             </div>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-ink-mute p-8">
                <Users size={48} className="mb-4 opacity-50" />
                <p className="font-medium hidden lg:block">請選擇左側租客以查看詳情</p>
                <p className="font-medium lg:hidden">請從列表選擇租客以查看詳情</p>
                <p className="text-xs mt-2">或點擊上方新增按鈕建立新租客資料</p>
                <button onClick={() => setMobileView('list')} className="lg:hidden mt-4 px-4 py-2 bg-accent text-white text-sm font-bold rounded-lg">
                  返回租客列表
                </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Contracts;
