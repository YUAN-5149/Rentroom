
import React, { useState, useMemo } from 'react';
import { ExpenseRecord, ExpenseCategory } from '../types';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Receipt, Plus, Trash2, Droplets, Zap, Flame, Wifi, HelpCircle, Save, X, Calendar, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExpensesProps {
  expenses: ExpenseRecord[];
  onAddExpense: (expense: ExpenseRecord) => void;
  onDeleteExpense: (id: string) => void;
}

const COLORS = {
  Water: '#0ea5e9',      // Sky-500
  Electricity: '#eab308', // Yellow-500
  Gas: '#f97316',         // Orange-500
  Internet: '#6366f1',    // Indigo-500
  Cleaning: '#10b981',    // Emerald-500
  Other: '#78716c'        // Stone-500
};

const CATEGORY_NAMES: Record<ExpenseCategory, string> = {
  Water: '自來水費',
  Electricity: '電費',
  Gas: '瓦斯費',
  Internet: '網路費',
  Cleaning: '清潔費',
  Other: '雜支'
};

const Expenses: React.FC<ExpensesProps> = ({ expenses, onAddExpense, onDeleteExpense }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

  const initialFormState: Partial<ExpenseRecord> = {
    category: 'Electricity',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  // Filter Data by Year
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => new Date(e.date).getFullYear() === yearFilter).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, yearFilter]);

  // Data for Pie Chart (Category Sum)
  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    filteredExpenses.forEach(e => {
      map.set(e.category, (map.get(e.category) || 0) + e.amount);
    });
    return Array.from(map.entries()).map(([key, value]) => ({
      name: CATEGORY_NAMES[key as ExpenseCategory],
      value: value,
      key: key
    }));
  }, [filteredExpenses]);

  // Data for Bar Chart (Monthly Trend)
  const barData = useMemo(() => {
    const data = Array(12).fill(0).map((_, i) => ({ name: `${i + 1}月`, total: 0 }));
    filteredExpenses.forEach(e => {
      const month = new Date(e.date).getMonth();
      data[month].total += e.amount;
    });
    return data;
  }, [filteredExpenses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newExpense: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      category: formData.category as ExpenseCategory,
      amount: Number(formData.amount),
      date: formData.date || '',
      description: formData.description
    };
    onAddExpense(newExpense);
    setIsModalOpen(false);
    setFormData(initialFormState);
  };

  const getIcon = (category: ExpenseCategory) => {
    switch (category) {
      case 'Water': return <Droplets size={18} className="text-sky-500" />;
      case 'Electricity': return <Zap size={18} className="text-yellow-500" />;
      case 'Gas': return <Flame size={18} className="text-orange-500" />;
      case 'Internet': return <Wifi size={18} className="text-indigo-500" />;
      case 'Cleaning': return <Sparkles size={18} className="text-emerald-500" />;
      default: return <HelpCircle size={18} className="text-stone-400" />;
    }
  };

  const handleExport = () => {
    const dataToExport = filteredExpenses.map(e => ({
      日期: e.date,
      類別: CATEGORY_NAMES[e.category],
      金額: e.amount,
      說明: e.description
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    XLSX.writeFile(wb, `Expenses_${yearFilter}.xlsx`);
  };

  const changeYear = (delta: number) => {
    setYearFilter(prev => prev + delta);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-4 rounded-lg shadow-sm border-b-2 border-orange-100 gap-4">
        <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                <Receipt size={24} />
            </div>
            <h2 className="text-2xl font-bold text-stone-800">費用支出管理</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
          <div className="flex items-center bg-white border border-stone-300 rounded-md p-0.5 shadow-sm justify-center">
             <button 
               onClick={() => changeYear(-1)}
               className="p-1.5 hover:bg-stone-100 rounded text-stone-500 hover:text-stone-800 transition"
               title="上一年"
             >
               <ChevronLeft size={16} />
             </button>
             <span className="px-3 py-1 text-sm font-bold text-stone-800 select-none min-w-[5rem] text-center">
               {yearFilter} 年度
             </span>
             <button 
               onClick={() => changeYear(1)}
               className="p-1.5 hover:bg-stone-100 rounded text-stone-500 hover:text-stone-800 transition"
               title="下一年"
             >
               <ChevronRight size={16} />
             </button>
          </div>

          <div className="flex gap-2">
            <button 
                onClick={() => setIsModalOpen(true)}
                className="flex-1 flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-900 text-white px-4 py-2 rounded-md text-sm transition shadow-sm whitespace-nowrap"
            >
                <Plus size={16} /> 新增支出
            </button>
            <button onClick={handleExport} className="flex-1 px-4 py-2 bg-white border border-stone-300 rounded-md text-sm font-bold text-stone-600 hover:bg-stone-50 whitespace-nowrap">
                匯出 Excel
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-100">
            <h3 className="text-lg font-bold text-stone-800 mb-4">類別支出佔比 ({yearFilter})</h3>
            <div className="h-64">
                {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[entry.key as ExpenseCategory] || COLORS.Other} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center text-stone-400">尚無資料</div>}
            </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-100">
            <h3 className="text-lg font-bold text-stone-800 mb-4">月度支出趨勢</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                        <XAxis dataKey="name" stroke="#a8a29e" fontSize={12} />
                        <YAxis stroke="#a8a29e" fontSize={12} />
                        <Tooltip 
                            cursor={{fill: '#fffbeb'}}
                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e7e5e4' }}
                        />
                        <Bar dataKey="total" fill="#f59e0b" radius={[4, 4, 0, 0]} name="支出總額" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      {/* Mobile card view */}
      <div className="sm:hidden space-y-3">
        {filteredExpenses.map((record) => (
          <div key={record.id} className="bg-white rounded-lg shadow-sm border border-stone-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-stone-50 border border-stone-100">
                  {getIcon(record.category)}
                </div>
                <div>
                  <p className="text-sm font-bold text-stone-700">{CATEGORY_NAMES[record.category]}</p>
                  <p className="text-xs text-stone-400">{record.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-base font-black text-stone-800">${record.amount.toLocaleString()}</span>
                <button
                  onClick={() => { if(window.confirm('確定刪除?')) onDeleteExpense(record.id); }}
                  className="text-stone-300 hover:text-rose-500 transition p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            {record.description && (
              <p className="text-xs text-stone-500 mt-2 pl-12">{record.description}</p>
            )}
          </div>
        ))}
        {filteredExpenses.length === 0 && (
          <div className="bg-white rounded-lg p-12 text-center text-stone-400 italic">此年度尚無支出紀錄</div>
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden sm:block bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-orange-100">
                <thead className="bg-stone-100">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-stone-600 uppercase tracking-wider whitespace-nowrap">類別</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-stone-600 uppercase tracking-wider whitespace-nowrap">日期</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-stone-600 uppercase tracking-wider whitespace-nowrap">說明</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-stone-600 uppercase tracking-wider whitespace-nowrap">金額</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-stone-600 uppercase tracking-wider whitespace-nowrap">操作</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-stone-100">
                    {filteredExpenses.map((record) => (
                        <tr key={record.id} className="hover:bg-amber-50/30 transition">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-full bg-stone-50 border border-stone-100">
                                        {getIcon(record.category)}
                                    </div>
                                    <span className="text-sm font-bold text-stone-700">{CATEGORY_NAMES[record.category]}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600 font-medium">
                                {record.date}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">
                                {record.description || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-stone-800">
                                ${record.amount.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                <button
                                    onClick={() => { if(window.confirm('確定刪除?')) onDeleteExpense(record.id); }}
                                    className="text-stone-400 hover:text-rose-500 transition p-1"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </td>
                        </tr>
                    ))}
                    {filteredExpenses.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-stone-400 italic">此年度尚無支出紀錄</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-orange-50 shrink-0">
                    <h3 className="text-lg font-bold text-stone-800">新增支出項目</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-600"><X size={20} /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-1">費用類別</label>
                            <div className="grid grid-cols-2 gap-2">
                                {(['Water', 'Electricity', 'Gas', 'Internet', 'Cleaning', 'Other'] as ExpenseCategory[]).map(cat => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setFormData({...formData, category: cat})}
                                        className={`flex items-center gap-2 p-2 rounded-lg text-sm font-medium border transition ${formData.category === cat ? 'bg-amber-50 border-amber-500 text-amber-800' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}
                                    >
                                        {getIcon(cat)}
                                        {CATEGORY_NAMES[cat]}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-1">金額</label>
                            <input 
                                type="number"
                                required
                                value={formData.amount}
                                onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                                className="w-full border border-stone-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-1">日期</label>
                            <input 
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({...formData, date: e.target.value})}
                                className="w-full border border-stone-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-1">備註說明</label>
                            <input 
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                placeholder="例如：9月份帳單"
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
    </div>
  );
};

export default Expenses;
