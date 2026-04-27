
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, DollarSign, FileText, Wrench, Menu, X, LogOut, Receipt, Zap } from 'lucide-react';

import Dashboard from './components/Dashboard';
import Financials from './components/Financials';
import Contracts from './components/Contracts';
import Maintenance from './components/Maintenance';
import Expenses from './components/Expenses';
import Meters from './components/Meters'; // New Component
import Login from './components/Login';

import { mockPayments, mockTenants, mockTickets, mockFilters, mockExpenses, mockReadings } from './services/mockData';
import { verifyUser, User } from './services/authMock';
import { PaymentRecord, PaymentStatus, MaintenanceTicket, MaintenanceStatus, Tenant, ExpenseRecord, FilterSchedule, MeterReading } from './types';
import { 
  syncTenantToSheet, fetchTenantsFromSheet, 
  syncExpenseToSheet, fetchExpensesFromSheet,
  syncPaymentToSheet, fetchPaymentsFromSheet,
  syncMaintenanceToSheet, fetchMaintenanceFromSheet,
  syncMeterToSheet, fetchMetersFromSheet
} from './services/googleSheetService';

// Sidebar Navigation Component
const Sidebar = ({ 
  mobileOpen, 
  setMobileOpen, 
  user, 
  onLogout 
}: { 
  mobileOpen: boolean, 
  setMobileOpen: (open: boolean) => void,
  user: User,
  onLogout: () => void
}) => {
  const location = useLocation();
  const navItems = [
    { path: '/', label: '總覽看板', icon: LayoutDashboard },
    { path: '/contracts', label: '合約與租客', icon: FileText },
    { path: '/expenses', label: '費用管理', icon: Receipt },
    { path: '/financials', label: '財務管理', icon: DollarSign },
    { path: '/maintenance', label: '維修管理', icon: Wrench },
    { path: '/meters', label: '電表管理', icon: Zap },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-stone-900 text-stone-100 transform transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:inset-auto flex flex-col`}>
      <div className="flex items-center justify-between p-6 border-b border-stone-700">
        <h1 className="text-xl font-bold tracking-wider text-amber-500">SmartLandlord</h1>
        <button onClick={() => setMobileOpen(false)} className="md:hidden text-stone-400">
          <X size={24} />
        </button>
      </div>
      <nav className="p-4 space-y-2 flex-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive(item.path) ? 'bg-amber-600 text-white shadow-lg' : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'}`}
          >
            <item.icon size={20} />
            <span className="font-medium text-sm">{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-6 border-t border-stone-700 bg-stone-900">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-amber-600 flex items-center justify-center font-bold text-white shadow-md">
            {user.name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-medium text-stone-200">{user.name}</p>
            <p className="text-[10px] text-stone-500">{user.role === 'ADMIN' ? '管理員' : '一般用戶'}</p>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 text-xs text-stone-400 hover:text-rose-400 hover:bg-stone-800 py-2 rounded transition"
        >
          <LogOut size={12} /> 登出系統
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Using '_v2' suffix to force clear old localStorage data and load new mockData
  const [tenants, setTenants] = useState<Tenant[]>(() => {
    const saved = localStorage.getItem('sl_tenants_v2');
    return saved !== null ? JSON.parse(saved) : mockTenants;
  });

  const [payments, setPayments] = useState<PaymentRecord[]>(() => {
    const saved = localStorage.getItem('sl_payments_v2');
    return saved !== null ? JSON.parse(saved) : mockPayments;
  });

  const [tickets, setTickets] = useState<MaintenanceTicket[]>(() => {
    const saved = localStorage.getItem('sl_tickets_v2');
    return saved !== null ? JSON.parse(saved) : mockTickets;
  });

  const [filters, setFilters] = useState<FilterSchedule[]>(() => {
    const saved = localStorage.getItem('sl_filters_v2');
    return saved !== null ? JSON.parse(saved) : mockFilters;
  });

  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => {
    const saved = localStorage.getItem('sl_expenses_v2');
    return saved !== null ? JSON.parse(saved) : mockExpenses;
  });

  const [meterReadings, setMeterReadings] = useState<MeterReading[]>(() => {
    const saved = localStorage.getItem('sl_meters_v2');
    return saved !== null ? JSON.parse(saved) : mockReadings;
  });

  // Load from Google Sheets on mount
  useEffect(() => {
    const loadFromCloud = async () => {
      // 1. Tenants
      const cloudTenants = await fetchTenantsFromSheet();
      if (cloudTenants && cloudTenants.length > 0) setTenants(cloudTenants);
      
      // 2. Expenses
      const cloudExpenses = await fetchExpensesFromSheet();
      if (cloudExpenses && cloudExpenses.length > 0) setExpenses(cloudExpenses);

      // 3. Payments
      const cloudPayments = await fetchPaymentsFromSheet();
      if (cloudPayments && cloudPayments.length > 0) setPayments(cloudPayments);

      // 4. Maintenance (Repairs & Filters)
      const cloudMaintenance = await fetchMaintenanceFromSheet();
      if (cloudMaintenance) {
          if (cloudMaintenance.repairs.length > 0) {
              setTickets(cloudMaintenance.repairs);
          }
          // Temporarily disable overwriting filters from cloud to ensure mock data (new specs) is shown
          // if (cloudMaintenance.filters.length > 0) {
          //    setFilters(cloudMaintenance.filters);
          // }
      }

      // 5. Meters
      const cloudMeters = await fetchMetersFromSheet();
      if (cloudMeters && cloudMeters.length > 0) setMeterReadings(cloudMeters);
    };
    loadFromCloud();
  }, []);

  useEffect(() => { localStorage.setItem('sl_tenants_v2', JSON.stringify(tenants)); }, [tenants]);
  useEffect(() => { localStorage.setItem('sl_payments_v2', JSON.stringify(payments)); }, [payments]);
  useEffect(() => { localStorage.setItem('sl_tickets_v2', JSON.stringify(tickets)); }, [tickets]);
  useEffect(() => { localStorage.setItem('sl_expenses_v2', JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem('sl_filters_v2', JSON.stringify(filters)); }, [filters]);
  useEffect(() => { localStorage.setItem('sl_meters_v2', JSON.stringify(meterReadings)); }, [meterReadings]);

  const handleLogin = (phone: string) => {
    const verifiedUser = verifyUser(phone);
    if (verifiedUser) { setUser(verifiedUser); setLoginError(null); } 
    else { setLoginError('此手機號碼無存取權限。'); }
  };

  const handleUpdatePayment = (id: string, updates: Partial<PaymentRecord>) => {
    setPayments(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    syncPaymentToSheet('UPDATE', { id, ...updates });
  };

  const handleDeletePayment = (id: string) => {
    setPayments(prev => prev.filter(p => p.id !== id));
    syncPaymentToSheet('DELETE', { id });
  };

  const handleAddPayments = (newPayments: PaymentRecord[]) => {
    setPayments(prev => [...newPayments, ...prev]);
    newPayments.forEach(p => syncPaymentToSheet('CREATE', p));
  };

  const handleDeleteTenant = (id: string) => {
    if (window.confirm('確定要刪除這位租客資料？此操作將永久移除其所有財務紀錄與報修單。')) {
      setTenants(prev => prev.filter(t => t.id !== id));
      
      setPayments(prev => {
        const toDelete = prev.filter(p => p.tenantId === id);
        toDelete.forEach(p => syncPaymentToSheet('DELETE', { id: p.id }));
        return prev.filter(p => p.tenantId !== id);
      });

      setTickets(prev => {
          const toDelete = prev.filter(t => t.tenantId === id);
          toDelete.forEach(t => syncMaintenanceToSheet('DELETE', 'REPAIR', { id: t.id }));
          return prev.filter(t => t.tenantId !== id);
      });
      
      syncTenantToSheet('DELETE', { id });
    }
  };

  const handleAddTenant = (newTenant: Tenant, options?: { genRent: boolean, genDeposit: boolean }) => {
    const tenantId = newTenant.id || `t-${Date.now()}`;
    const tenantWithId = { ...newTenant, id: tenantId };
    
    setTenants(prev => [...prev, tenantWithId]);
    syncTenantToSheet('CREATE', tenantWithId);
    
    const newPayments: PaymentRecord[] = [];
    if (options?.genRent) {
      newPayments.push({
        id: `pay-r-${Date.now()}-1`,
        tenantId: tenantId,
        tenantName: newTenant.name, 
        amount: newTenant.rentAmount,
        dueDate: new Date().toISOString().split('T')[0],
        status: PaymentStatus.PENDING,
        type: 'Rent'
      });
    }
    if (options?.genDeposit) {
      newPayments.push({
        id: `pay-d-${Date.now()}-2`,
        tenantId: tenantId,
        tenantName: newTenant.name, 
        amount: newTenant.deposit,
        dueDate: new Date().toISOString().split('T')[0],
        status: PaymentStatus.PENDING,
        type: 'Deposit'
      });
    }
    if (newPayments.length > 0) {
      setPayments(prev => [...newPayments, ...prev]);
      newPayments.forEach(p => syncPaymentToSheet('CREATE', p));
    }
  };

  const handleUpdateTenant = (updatedTenant: Tenant) => {
    setTenants(prev => prev.map(t => t.id === updatedTenant.id ? updatedTenant : t));
    syncTenantToSheet('UPDATE', updatedTenant);
    
    setPayments(prev => prev.map(p => p.tenantId === updatedTenant.id ? { 
      ...p, 
      tenantName: updatedTenant.name,
      amount: (p.type === 'Rent' && p.status !== PaymentStatus.PAID) ? updatedTenant.rentAmount : p.amount
    } : p));
  };

  // --- Maintenance Handlers ---

  const handleAddTicket = (ticket: MaintenanceTicket) => {
      setTickets(prev => [ticket, ...prev]);
      syncMaintenanceToSheet('CREATE', 'REPAIR', ticket);
  };

  const handleUpdateTicket = (updatedTicket: MaintenanceTicket) => {
      setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
      syncMaintenanceToSheet('UPDATE', 'REPAIR', updatedTicket);
  };

  const handleDeleteTicket = (id: string) => {
      setTickets(prev => prev.filter(t => t.id !== id));
      syncMaintenanceToSheet('DELETE', 'REPAIR', { id });
  };

  const handleUpdateTicketStatus = (id: string, status: MaintenanceStatus) => {
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
      syncMaintenanceToSheet('UPDATE', 'REPAIR', { id, status });
  };

  const handleBatchUpdateTicketsStatus = (ids: string[], status: MaintenanceStatus) => {
    setTickets(prev => prev.map(t => ids.includes(t.id) ? { ...t, status } : t));
    ids.forEach(id => syncMaintenanceToSheet('UPDATE', 'REPAIR', { id, status }));
  };

  // Filter Updates
  const handleUpdateFilter = (updatedFilter: FilterSchedule) => {
      setFilters(prev => prev.map(f => f.id === updatedFilter.id ? updatedFilter : f));
      syncMaintenanceToSheet('UPDATE', 'FILTER', updatedFilter);
  };

  const handleAddExpense = (newExpense: ExpenseRecord) => {
    setExpenses(prev => [newExpense, ...prev]);
    syncExpenseToSheet('CREATE', newExpense);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    syncExpenseToSheet('DELETE', { id });
  };

  // Meters Handlers
  const handleAddReading = (reading: MeterReading) => {
    setMeterReadings(prev => [reading, ...prev]);
    syncMeterToSheet('CREATE', reading);
  };

  const handleDeleteReading = (id: string) => {
    setMeterReadings(prev => {
        const afterDelete = prev.filter(r => String(r.id) !== String(id));
        return afterDelete;
    });
    syncMeterToSheet('DELETE', { id });
  };

  if (!user) return <Login onLogin={handleLogin} error={loginError} />;

  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden bg-orange-50 font-sans">
        {/* Mobile backdrop overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-20 bg-stone-900/50 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} user={user} onLogout={() => setUser(null)} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="md:hidden bg-white shadow-sm p-4 flex items-center justify-between z-10 border-b border-orange-100">
             <h1 className="font-bold text-stone-800 text-sm tracking-tight">SmartLandlord</h1>
             <button onClick={() => setMobileOpen(true)} className="text-stone-600"><Menu size={20} /></button>
          </header>
          <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
            <Routes>
              <Route path="/" element={<Dashboard payments={payments} expenses={expenses} />} />
              <Route path="/financials" element={
                <Financials 
                  payments={payments} 
                  tenants={tenants} 
                  onUpdatePayment={handleUpdatePayment} 
                  onDeletePayment={handleDeletePayment}
                  onAddPayments={handleAddPayments}
                />
              } />
              <Route path="/expenses" element={
                 <Expenses 
                    expenses={expenses}
                    onAddExpense={handleAddExpense}
                    onDeleteExpense={handleDeleteExpense}
                 />
              } />
              <Route path="/meters" element={
                 <Meters 
                    readings={meterReadings}
                    onAddReading={handleAddReading}
                    onDeleteReading={handleDeleteReading}
                 />
              } />
              <Route path="/contracts" element={
                <Contracts 
                  tenants={tenants} 
                  payments={payments} 
                  onAddTenant={handleAddTenant} 
                  onUpdateTenant={handleUpdateTenant} 
                  onDeleteTenant={handleDeleteTenant} 
                />
              } />
              <Route path="/maintenance" element={
                <Maintenance 
                  tickets={tickets} 
                  filters={filters} 
                  tenants={tenants} 
                  onAddTicket={handleAddTicket} 
                  onUpdateTicket={handleUpdateTicket} 
                  onDeleteTicket={handleDeleteTicket} 
                  onUpdateTicketStatus={handleUpdateTicketStatus}
                  onBatchUpdateTicketStatus={handleBatchUpdateTicketsStatus}
                  onUpdateFilter={handleUpdateFilter}
                />
              } />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;
