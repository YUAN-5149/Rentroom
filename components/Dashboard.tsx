
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { PaymentRecord, PaymentStatus, ExpenseRecord } from '../types';
import { TrendingUp, TrendingDown, AlertCircle, Users, LayoutGrid, Wallet, Scale, ChevronLeft, ChevronRight } from 'lucide-react';

interface DashboardProps {
  payments: PaymentRecord[];
  expenses: ExpenseRecord[];
}

// Warm Amber Theme Colors
const COLORS = ['#d97706', '#f59e0b', '#78350f']; // Amber-600, Amber-400, Amber-900

const Dashboard: React.FC<DashboardProps> = ({ payments, expenses }) => {
  const [year, setYear] = useState(new Date().getFullYear());

  // Filter Data by Year
  const currentPayments = useMemo(() => {
    return payments.filter(p => new Date(p.dueDate).getFullYear() === year);
  }, [payments, year]);

  const currentExpenses = useMemo(() => {
    return expenses.filter(e => new Date(e.date).getFullYear() === year);
  }, [expenses, year]);

  // 收入計算 (Based on filtered data)
  const totalPaid = useMemo(() => currentPayments.filter(p => p.status === PaymentStatus.PAID).reduce((acc, curr) => acc + curr.amount, 0), [currentPayments]);
  const totalPending = useMemo(() => currentPayments.filter(p => p.status === PaymentStatus.PENDING).reduce((acc, curr) => acc + curr.amount, 0), [currentPayments]);
  const totalOverdue = useMemo(() => currentPayments.filter(p => p.status === PaymentStatus.OVERDUE).reduce((acc, curr) => acc + curr.amount, 0), [currentPayments]);
  
  // 支出計算 (Based on filtered data)
  const totalExpenses = useMemo(() => currentExpenses.reduce((acc, curr) => acc + curr.amount, 0), [currentExpenses]);

  // 淨利計算
  const netProfit = totalPaid - totalExpenses;

  const pieData = useMemo(() => [
    { name: '已收租金', value: totalPaid },
    { name: '待收租金', value: totalPending },
    { name: '逾期租金', value: totalOverdue },
  ], [totalPaid, totalPending, totalOverdue]);

  // Bar Chart Data: 收入 vs 支出
  const barData = useMemo(() => {
    return [
      { name: '財務概況', income: totalPaid, expense: totalExpenses },
    ];
  }, [totalPaid, totalExpenses]);

  const changeYear = (delta: number) => {
    setYear(prev => prev + delta);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Header & Year Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-lg shadow-sm border-b-2 border-orange-100 gap-4">
        <h2 className="text-2xl font-bold text-stone-800">營運總覽看板</h2>
        
        <div className="flex items-center bg-white border border-stone-300 rounded-md p-0.5 shadow-sm w-full sm:w-auto justify-center">
             <button 
               onClick={() => changeYear(-1)}
               className="p-1.5 hover:bg-stone-100 rounded text-stone-500 hover:text-stone-800 transition"
               title="上一年"
             >
               <ChevronLeft size={16} />
             </button>
             <span className="px-3 py-1 text-sm font-bold text-stone-800 select-none min-w-[5rem] text-center">
               {year} 年度
             </span>
             <button 
               onClick={() => changeYear(1)}
               className="p-1.5 hover:bg-stone-100 rounded text-stone-500 hover:text-stone-800 transition"
               title="下一年"
             >
               <ChevronRight size={16} />
             </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: 實際收入 (Green/Emerald) */}
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-emerald-500 hover:shadow-md transition relative overflow-hidden">
          <div className="absolute right-4 top-4 text-emerald-100"><TrendingUp size={48} /></div>
          <h3 className="text-stone-500 text-sm font-medium relative z-10">已收總額 (Income)</h3>
          <p className="text-2xl font-black text-stone-800 mt-2 relative z-10">${totalPaid.toLocaleString()}</p>
        </div>

        {/* Card 2: 總支出 (Orange) */}
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-orange-500 hover:shadow-md transition relative overflow-hidden">
           <div className="absolute right-4 top-4 text-orange-100"><TrendingDown size={48} /></div>
          <h3 className="text-stone-500 text-sm font-medium relative z-10">總支出 (Expenses)</h3>
          <p className="text-2xl font-black text-stone-800 mt-2 relative z-10">${totalExpenses.toLocaleString()}</p>
        </div>

         {/* Card 3: 淨利 (Indigo) */}
         <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-indigo-500 hover:shadow-md transition relative overflow-hidden">
          <div className="absolute right-4 top-4 text-indigo-100"><Scale size={48} /></div>
          <h3 className="text-stone-500 text-sm font-medium relative z-10">淨利 (Net Profit)</h3>
          <p className={`text-2xl font-black mt-2 relative z-10 ${netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
            ${netProfit.toLocaleString()}
          </p>
        </div>

        {/* Card 4: 未收帳款 (Rose/Red) */}
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-rose-500 hover:shadow-md transition relative overflow-hidden">
          <div className="absolute right-4 top-4 text-rose-100"><AlertCircle size={48} /></div>
          <h3 className="text-stone-500 text-sm font-medium relative z-10">未收帳款 (Unpaid)</h3>
          <div className="flex items-baseline gap-2 mt-2 relative z-10">
             <p className="text-2xl font-black text-stone-800">${(totalPending + totalOverdue).toLocaleString()}</p>
             <span className="text-xs text-rose-500 font-bold bg-rose-50 px-1.5 py-0.5 rounded">含逾期</span>
          </div>
        </div>
      </div>

      {(payments.length > 0 || expenses.length > 0) ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income vs Expense Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-100">
            <h3 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
              <Wallet size={20} className="text-amber-600" /> 收支平衡分析 ({year})
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f5f5f4" />
                  <XAxis type="number" stroke="#78716c" fontSize={12} tickFormatter={(val) => `$${val/1000}k`} />
                  <YAxis dataKey="name" type="category" stroke="#78716c" width={80} fontSize={12} />
                  <Tooltip 
                    cursor={{fill: '#fffbeb'}}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e7e5e4', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Bar dataKey="income" name="總收入" fill="#10b981" radius={[0, 4, 4, 0]} barSize={30} />
                  <Bar dataKey="expense" name="總支出" fill="#f97316" radius={[0, 4, 4, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Collection Status Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-stone-100">
            <h3 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
              <AlertCircle size={20} className="text-amber-600" /> 租金回收狀態 ({year})
            </h3>
            <div className="h-64">
              {pieData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData.filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-stone-400 italic">
                  此年度尚無租金數據
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-xl shadow-sm text-center flex flex-col items-center border border-dashed border-stone-300">
           <div className="bg-amber-50 p-6 rounded-full mb-6">
              <LayoutGrid size={48} className="text-amber-200" />
           </div>
           <h3 className="text-2xl font-bold text-stone-600">歡迎使用 SmartLandlord Pro</h3>
           <p className="text-stone-400 mt-4 max-w-md mx-auto leading-relaxed">
             目前尚無任何營運數據。請前往<span className="font-bold text-amber-600 mx-1">合約與租客</span>頁面新增您的第一位租客，並至<span className="font-bold text-amber-600 mx-1">費用管理</span>紀錄支出。
           </p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
