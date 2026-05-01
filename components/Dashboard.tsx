
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { PaymentRecord, PaymentStatus, ExpenseRecord } from '../types';
import { TrendingUp, TrendingDown, AlertCircle, LayoutGrid, Wallet, Scale, ChevronLeft, ChevronRight, Sparkles, Leaf } from 'lucide-react';

interface DashboardProps {
  payments: PaymentRecord[];
  expenses: ExpenseRecord[];
}

// 家管小屋 cream palette for charts
const PIE_COLORS = ['#7A8B5C', '#C9763C', '#C46A6A']; // leaf / accent / rose

const Dashboard: React.FC<DashboardProps> = ({ payments, expenses }) => {
  const [year, setYear] = useState(new Date().getFullYear());

  const currentPayments = useMemo(
    () => payments.filter(p => new Date(p.dueDate).getFullYear() === year),
    [payments, year]
  );
  const currentExpenses = useMemo(
    () => expenses.filter(e => new Date(e.date).getFullYear() === year),
    [expenses, year]
  );

  const totalPaid = useMemo(() => currentPayments.filter(p => p.status === PaymentStatus.PAID).reduce((a, c) => a + c.amount, 0), [currentPayments]);
  const totalPending = useMemo(() => currentPayments.filter(p => p.status === PaymentStatus.PENDING).reduce((a, c) => a + c.amount, 0), [currentPayments]);
  const totalOverdue = useMemo(() => currentPayments.filter(p => p.status === PaymentStatus.OVERDUE).reduce((a, c) => a + c.amount, 0), [currentPayments]);
  const totalExpenses = useMemo(() => currentExpenses.reduce((a, c) => a + c.amount, 0), [currentExpenses]);
  const netProfit = totalPaid - totalExpenses;

  const pieData = useMemo(() => [
    { name: '已收租金', value: totalPaid },
    { name: '待收租金', value: totalPending },
    { name: '逾期租金', value: totalOverdue },
  ], [totalPaid, totalPending, totalOverdue]);

  const barData = useMemo(() => ([{ name: '財務概況', income: totalPaid, expense: totalExpenses }]), [totalPaid, totalExpenses]);

  const overdueCount = currentPayments.filter(p => p.status === PaymentStatus.OVERDUE).length;
  const pendingCount = currentPayments.filter(p => p.status === PaymentStatus.PENDING).length;
  const reminderText = overdueCount > 0
    ? `本年度有 ${overdueCount} 筆逾期款項待處理，建議今天撥個電話關心一下 ☕`
    : pendingCount > 0
      ? `還有 ${pendingCount} 筆款項待繳，記得提醒一下租客 ☕`
      : '本年度所有款項都已清，泡杯茶犒賞自己一下 🍵';

  const changeYear = (delta: number) => setYear(prev => prev + delta);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
        <div>
          <div className="flex items-center gap-2 text-ink-mute text-xs tracking-widest mb-1.5">
            <span className="w-4 h-px bg-ink-mute" /> DASHBOARD · {year} 年度
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl text-ink font-bold tracking-wide">今天也辛苦了</h1>
        </div>

        <div className="flex items-center bg-surface border border-line rounded-full px-1 py-1 shadow-warm-sm">
          <button
            onClick={() => changeYear(-1)}
            className="p-1.5 hover:bg-surface-warm rounded-full text-ink-soft hover:text-ink transition"
            title="上一年"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="px-3 text-sm font-semibold text-ink select-none min-w-[5rem] text-center">{year} 年度</span>
          <button
            onClick={() => changeYear(1)}
            className="p-1.5 hover:bg-surface-warm rounded-full text-ink-soft hover:text-ink transition"
            title="下一年"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Greeting strip */}
      <div
        className="relative overflow-hidden rounded-cozy border border-line p-5 sm:p-6 flex items-center gap-4 sm:gap-5"
        style={{ background: 'linear-gradient(135deg, #F5EBDA 0%, #FFFFFF 100%)' }}
      >
        <Leaf size={140} strokeWidth={1} className="absolute -right-3 -top-3 text-leaf opacity-[0.12] pointer-events-none" />
        <div className="w-14 h-14 rounded-2xl bg-accent-soft text-accent grid place-items-center flex-shrink-0">
          <Sparkles size={26} strokeWidth={1.6} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] text-ink-soft mb-1">本月小提醒</div>
          <div className="font-serif text-base sm:text-[17px] text-ink leading-relaxed">{reminderText}</div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="本年已收" value={`$${totalPaid.toLocaleString()}`} icon={TrendingUp} accent="leaf" />
        <StatCard label="本年支出" value={`$${totalExpenses.toLocaleString()}`} icon={TrendingDown} accent="accent" />
        <StatCard label="淨利潤" value={`$${netProfit.toLocaleString()}`} icon={Scale} accent="sky" valueClass={netProfit >= 0 ? 'text-ink' : 'text-rose-600'} />
        <StatCard label="未收帳款" value={`$${(totalPending + totalOverdue).toLocaleString()}`} icon={AlertCircle} accent="rose" sub={overdueCount > 0 ? `含 ${overdueCount} 筆逾期` : '皆未逾期'} />
      </div>

      {(payments.length > 0 || expenses.length > 0) ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Income vs Expense */}
          <div className="bg-surface border border-line rounded-cozy p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs text-ink-mute mb-1">本年度</div>
                <div className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                  <Wallet size={18} className="text-accent" /> 收支平衡
                </div>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="2 4" horizontal={false} stroke="#EADFCC" />
                  <XAxis type="number" stroke="#7A6A58" fontSize={11} tickFormatter={(val) => `$${val/1000}k`} />
                  <YAxis dataKey="name" type="category" stroke="#7A6A58" width={80} fontSize={11} />
                  <Tooltip
                    cursor={{ fill: '#FBF6EE' }}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #EADFCC', boxShadow: '0 4px 12px rgba(58,46,34,0.10)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#7A6A58' }} />
                  <Bar dataKey="income"  name="總收入" fill="#7A8B5C" radius={[0, 8, 8, 0]} barSize={28} />
                  <Bar dataKey="expense" name="總支出" fill="#C9763C" radius={[0, 8, 8, 0]} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Collection Status */}
          <div className="bg-surface border border-line rounded-cozy p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs text-ink-mute mb-1">本年度</div>
                <div className="font-serif text-lg font-bold text-ink flex items-center gap-2">
                  <AlertCircle size={18} className="text-accent" /> 租金回收狀態
                </div>
              </div>
            </div>
            <div className="h-64">
              {pieData.some(d => d.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData.filter(d => d.value > 0)}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={82}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#FFFFFF" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `$${value.toLocaleString()}`}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #EADFCC' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#7A6A58' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-ink-mute font-hand text-base">~ 此年度尚無租金數據 ~</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface p-12 rounded-cozy-lg text-center flex flex-col items-center border border-dashed border-line">
          <div className="bg-accent-soft p-6 rounded-full mb-5">
            <LayoutGrid size={42} className="text-accent" />
          </div>
          <h3 className="font-serif text-xl text-ink font-bold">歡迎來到家管小屋</h3>
          <p className="text-ink-soft mt-3 max-w-md mx-auto leading-relaxed text-sm">
            目前尚無任何營運數據。請至 <span className="font-semibold text-accent">合約與租客</span> 新增您的第一位租客，並到 <span className="font-semibold text-accent">費用管理</span> 紀錄支出。
          </p>
          <p className="font-hand text-base text-ink-mute mt-4">~ start with care ~</p>
        </div>
      )}
    </div>
  );
};

// === Reusable: warm-themed stat card ===
const StatCard: React.FC<{
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  accent: 'leaf' | 'accent' | 'sky' | 'rose';
  sub?: string;
  valueClass?: string;
}> = ({ label, value, icon: Icon, accent, sub, valueClass }) => {
  const map = {
    leaf:   { fg: '#7A8B5C', bg: '#DDE3C9' },
    accent: { fg: '#C9763C', bg: '#F2D9C0' },
    sky:    { fg: '#7A9CB0', bg: '#D6E2EA' },
    rose:   { fg: '#C46A6A', bg: '#F7DDDD' },
  }[accent];
  return (
    <div className="relative bg-surface border border-line rounded-cozy p-5 overflow-hidden">
      <div className="absolute -bottom-7 -right-5 w-28 h-28 rounded-full opacity-[0.18]" style={{ background: map.fg }} />
      <div className="relative flex items-center justify-between mb-3.5">
        <div className="w-10 h-10 rounded-xl grid place-items-center" style={{ background: map.bg, color: map.fg }}>
          <Icon size={20} strokeWidth={1.7} />
        </div>
      </div>
      <div className="relative text-[12px] text-ink-soft mb-1.5">{label}</div>
      <div className={`relative font-serif font-bold tracking-wide text-2xl ${valueClass || 'text-ink'}`}>{value}</div>
      {sub && <div className="relative text-[11.5px] text-ink-mute mt-1.5">{sub}</div>}
    </div>
  );
};

export default Dashboard;
