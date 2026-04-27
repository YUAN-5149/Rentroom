
import React, { useState, useMemo } from 'react';
import { MeterReading } from '../types';
import { Zap, Plus, Trash2, Save, X, Search, ArrowRight, History, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface MetersProps {
  readings: MeterReading[];
  onAddReading: (reading: MeterReading) => void;
  onDeleteReading: (id: string) => void;
}

const Meters: React.FC<MetersProps> = ({ readings, onAddReading, onDeleteReading }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 預設表單狀態
  const [formData, setFormData] = useState<Partial<MeterReading>>({
    meterName: '',
    date: new Date().toISOString().split('T')[0],
    currentReading: 0,
    previousReading: 0,
    ratePerKwh: 5.5, // 預設每度 5.5 元
    note: ''
  });

  // 取得所有不重複的電表名稱
  const uniqueMeters = useMemo(() => {
    const names = new Set(readings.map(r => r.meterName));
    return Array.from(names).sort();
  }, [readings]);

  // 動態計算平均費率
  const dynamicAverageRate = useMemo(() => {
    if (readings.length === 0) return 5.5; // 無資料時顯示預設 5.5
    const totalRate = readings.reduce((acc, curr) => acc + (curr.ratePerKwh || 0), 0);
    return (totalRate / readings.length).toFixed(1);
  }, [readings]);

  // 過濾顯示資料
  const filteredReadings = useMemo(() => {
    return readings.filter(r => 
      r.meterName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.date.includes(searchQuery)
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [readings, searchQuery]);

  // 當選擇電表名稱時，自動帶入上次讀數
  const handleMeterNameChange = (name: string) => {
    const meterReadings = readings.filter(r => r.meterName === name);
    const lastReading = meterReadings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    
    setFormData(prev => ({
      ...prev,
      meterName: name,
      previousReading: lastReading ? lastReading.currentReading : 0
    }));
  };

  const calculateUsage = () => {
    const current = Number(formData.currentReading) || 0;
    const prev = Number(formData.previousReading) || 0;
    return Math.max(0, parseFloat((current - prev).toFixed(1)));
  };

  const calculateCost = () => {
    const usage = calculateUsage();
    const rate = Number(formData.ratePerKwh) || 0;
    return Math.round(usage * rate);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const usage = calculateUsage();
    const totalCost = calculateCost();

    const newReading: MeterReading = {
      id: `m-${Date.now()}`,
      meterName: formData.meterName || '未命名電表',
      date: formData.date || '',
      currentReading: Number(formData.currentReading),
      previousReading: Number(formData.previousReading),
      usage: usage,
      ratePerKwh: Number(formData.ratePerKwh),
      totalCost: totalCost,
      note: formData.note
    };

    onAddReading(newReading);
    setIsModalOpen(false);
    setFormData({
      ...formData,
      meterName: '',
      currentReading: 0,
      previousReading: 0,
      note: ''
    });
  };

  const confirmDelete = () => {
    if (deleteTargetId) {
        onDeleteReading(deleteTargetId);
        setDeleteTargetId(null);
    }
  };

  const handleExport = () => {
    const dataToExport = filteredReadings.map(r => ({
      電表名稱: r.meterName,
      抄表日期: r.date,
      本次讀數: r.currentReading,
      上次讀數: r.previousReading,
      使用度數: r.usage,
      費率: r.ratePerKwh,
      金額: r.totalCost,
      備註: r.note
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "電表抄表紀錄");
    XLSX.writeFile(wb, "Electricity_Report.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-4 rounded-lg shadow-sm border-b-2 border-orange-100 gap-4">
        <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-2 rounded-lg text-yellow-600">
                <Zap size={24} />
            </div>
            <h2 className="text-2xl font-bold text-stone-800">電表抄表管理</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            <input 
              type="text" 
              placeholder="搜尋電表..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-stone-300 rounded-md text-sm outline-none focus:ring-2 focus:ring-amber-500 w-full sm:w-auto"
            />
          </div>
          <button 
              onClick={() => setIsModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-900 text-white px-4 py-2 rounded-md text-sm transition shadow-sm whitespace-nowrap"
          >
              <Plus size={16} /> 新增抄表
          </button>
          <button onClick={handleExport} className="flex-1 px-4 py-2 bg-white border border-stone-300 rounded-md text-sm font-bold text-stone-600 hover:bg-stone-50 whitespace-nowrap">
              匯出 Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-stone-100 flex items-center justify-between">
            <div>
                <p className="text-xs text-stone-500 font-bold uppercase">本月總用電</p>
                <p className="text-2xl font-black text-stone-800 mt-1">
                    {readings.filter(r => r.date.startsWith(new Date().toISOString().slice(0, 7))).reduce((acc, r) => acc + r.usage, 0).toLocaleString()} <span className="text-sm font-medium text-stone-400">度</span>
                </p>
            </div>
            <Zap size={32} className="text-yellow-400 opacity-50" />
        </div>
         <div className="bg-white p-4 rounded-lg shadow-sm border border-stone-100 flex items-center justify-between">
            <div>
                <p className="text-xs text-stone-500 font-bold uppercase">平均計費單價</p>
                <p className="text-2xl font-black text-stone-800 mt-1">
                    ${filteredReadings.length > 0 ? dynamicAverageRate : '5.5'} <span className="text-sm font-medium text-stone-400">/度</span>
                </p>
            </div>
             <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 font-bold">$</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-stone-100 flex items-center justify-between">
            <div>
                <p className="text-xs text-stone-500 font-bold uppercase">已建檔電表</p>
                <p className="text-2xl font-black text-stone-800 mt-1">
                    {uniqueMeters.length} <span className="text-sm font-medium text-stone-400">支</span>
                </p>
            </div>
            <History size={32} className="text-blue-400 opacity-50" />
        </div>
      </div>

      {/* Mobile card view */}
      <div className="sm:hidden space-y-3">
        {filteredReadings.map((reading) => (
          <div key={reading.id} className="bg-white rounded-lg shadow-sm border border-stone-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-8 bg-yellow-400 rounded-sm flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-bold text-stone-800">{reading.meterName}</p>
                  <p className="text-xs text-stone-400">{reading.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-stone-800">${reading.totalCost.toLocaleString()}</span>
                <button
                  type="button"
                  onClick={() => setDeleteTargetId(reading.id)}
                  className="text-stone-300 hover:text-rose-500 transition p-1 rounded-full hover:bg-rose-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-100">
              <div className="text-center">
                <p className="text-[10px] text-stone-400 font-bold uppercase">前次讀數</p>
                <p className="text-sm font-bold text-stone-600 mt-0.5">{reading.previousReading}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-stone-400 font-bold uppercase">本次讀數</p>
                <p className="text-sm font-bold text-stone-800 mt-0.5">{reading.currentReading}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-stone-400 font-bold uppercase">使用度數</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 mt-0.5">
                  {reading.usage} 度
                </span>
              </div>
            </div>
            {reading.note && <p className="text-xs text-stone-400 mt-2 italic">{reading.note}</p>}
          </div>
        ))}
        {filteredReadings.length === 0 && (
          <div className="bg-white rounded-lg p-12 text-center text-stone-400 italic">尚無抄表紀錄</div>
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-orange-100">
                <thead className="bg-stone-100">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-stone-600 uppercase tracking-wider whitespace-nowrap">電表名稱</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-stone-600 uppercase tracking-wider whitespace-nowrap">抄表日期</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-stone-600 uppercase tracking-wider whitespace-nowrap">本次讀數</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-stone-600 uppercase tracking-wider whitespace-nowrap">使用度數</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-stone-600 uppercase tracking-wider whitespace-nowrap">小計金額</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-stone-600 uppercase tracking-wider whitespace-nowrap">操作</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-stone-100">
                    {filteredReadings.map((reading) => (
                        <tr key={reading.id} className="hover:bg-amber-50/30 transition">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-8 bg-yellow-400 rounded-sm"></div>
                                    <span className="text-sm font-bold text-stone-700">{reading.meterName}</span>
                                </div>
                                {reading.note && <p className="text-xs text-stone-400 pl-4 mt-1">{reading.note}</p>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 font-medium">
                                {reading.date}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-stone-800">{reading.currentReading}</div>
                                <div className="text-xs text-stone-400">前次: {reading.previousReading}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800">
                                    {reading.usage} 度
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-stone-800">
                                ${reading.totalCost.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                <button
                                    type="button"
                                    onClick={() => setDeleteTargetId(reading.id)}
                                    className="text-stone-400 hover:text-rose-500 transition p-2 rounded-full hover:bg-rose-50"
                                    title="刪除紀錄"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {filteredReadings.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-stone-400 italic">尚無抄表紀錄</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* 新增視窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-orange-50 shrink-0">
                    <h3 className="text-lg font-bold text-stone-800">新增電表紀錄</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-600"><X size={20} /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-1">電表名稱/房號</label>
                            <div className="relative">
                                <input 
                                    list="meter-suggestions"
                                    type="text"
                                    required
                                    value={formData.meterName}
                                    onChange={(e) => handleMeterNameChange(e.target.value)}
                                    placeholder="例如：3F A室 電表"
                                    className="w-full border border-stone-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                />
                                <datalist id="meter-suggestions">
                                    {uniqueMeters.map(m => <option key={m} value={m} />)}
                                </datalist>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">抄表日期</label>
                                <input 
                                    type="date"
                                    required
                                    value={formData.date}
                                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                                    className="w-full border border-stone-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-bold text-stone-700 mb-1">每度費率</label>
                                <input 
                                    type="number"
                                    step="0.1"
                                    required
                                    value={formData.ratePerKwh}
                                    onChange={(e) => setFormData({...formData, ratePerKwh: parseFloat(e.target.value)})}
                                    className="w-full border border-stone-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-stone-50 rounded-lg border border-stone-200 space-y-4">
                            <div className="flex items-end gap-2">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-stone-500 mb-1">上次讀數</label>
                                    <input 
                                        type="number"
                                        step="0.1"
                                        value={formData.previousReading}
                                        onChange={(e) => setFormData({...formData, previousReading: parseFloat(e.target.value)})}
                                        className="w-full border border-stone-300 rounded p-2 text-sm bg-stone-100"
                                    />
                                </div>
                                <div className="pb-3 text-stone-400"><ArrowRight size={16} /></div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-amber-600 mb-1">本次讀數</label>
                                    <input 
                                        type="number"
                                        step="0.1"
                                        required
                                        autoFocus
                                        value={formData.currentReading}
                                        onChange={(e) => setFormData({...formData, currentReading: parseFloat(e.target.value)})}
                                        className="w-full border-2 border-amber-500 rounded p-2 text-sm font-bold text-stone-800 focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between items-center border-t border-stone-200 pt-3">
                                <span className="text-sm font-bold text-stone-600">本期用電：</span>
                                <span className="text-lg font-black text-amber-600">{calculateUsage()} 度</span>
                            </div>
                             <div className="flex justify-between items-center">
                                <span className="text-sm font-bold text-stone-600">預估電費：</span>
                                <span className="text-lg font-black text-stone-800">${calculateCost()}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-1">備註</label>
                            <input 
                                type="text"
                                value={formData.note}
                                onChange={(e) => setFormData({...formData, note: e.target.value})}
                                placeholder="異常狀況紀錄..."
                                className="w-full border border-stone-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                        </div>
                        <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 rounded-lg mt-2 flex items-center justify-center gap-2">
                            <Save size={18} /> 儲存紀錄
                        </button>
                    </form>
                </div>
            </div>
        </div>
      )}

      {/* 刪除確認視窗 */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-sm w-full overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-4 mx-auto text-rose-600">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-bold text-stone-800 mb-2">確定刪除此紀錄?</h3>
              <p className="text-stone-500 text-sm">此操作將永久移除此筆抄表數據。</p>
            </div>
            <div className="flex border-t border-stone-100">
              <button 
                onClick={() => setDeleteTargetId(null)} 
                className="flex-1 px-6 py-4 text-stone-600 font-medium hover:bg-stone-50 border-r border-stone-100"
              >
                取消
              </button>
              <button 
                onClick={confirmDelete} 
                className="flex-1 px-6 py-4 text-rose-600 font-bold hover:bg-rose-50"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Meters;
