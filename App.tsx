
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, DollarSign, FileText, Wrench, Menu, X, LogOut, Receipt, Zap, Camera, Coffee, ChevronRight } from 'lucide-react';

import Dashboard from './components/Dashboard';
import Financials from './components/Financials';
import Contracts from './components/Contracts';
import Maintenance from './components/Maintenance';
import Expenses from './components/Expenses';
import Meters from './components/Meters';
import RoomCondition from './components/RoomCondition';
import Login from './components/Login';

import { mockPayments, mockTenants, mockTickets, mockFilters, mockExpenses, mockReadings } from './services/mockData';
import { verifyUser, User } from './services/authMock';
import { PaymentRecord, PaymentStatus, MaintenanceTicket, MaintenanceStatus, Tenant, ExpenseRecord, FilterSchedule, MeterReading, RoomPhoto } from './types';
import {
  syncTenantToSheet, fetchTenantsFromSheet,
  syncExpenseToSheet, fetchExpensesFromSheet,
  syncPaymentToSheet, fetchPaymentsFromSheet,
  syncMaintenanceToSheet, fetchMaintenanceFromSheet,
  syncMeterToSheet, fetchMetersFromSheet
} from './services/googleSheetService';
import {
  fetchPhotosFromDrive,
  uploadPhotoToDrive,
  updatePhotoCaptionOnDrive,
  deletePhotoFromDrive,
} from './services/photoApi';

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
    { path: '/room-condition', label: '套房原狀', icon: Camera },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:inset-auto flex flex-col bg-surface border-r border-line shadow-warm`}
      style={{
        backgroundImage:
          'radial-gradient(circle at 10% 0%, rgba(242,217,192,0.33) 0%, transparent 40%), radial-gradient(circle at 90% 100%, rgba(221,227,201,0.40) 0%, transparent 35%)',
      }}
    >
      {/* Brand */}
      <div className="flex items-center justify-between gap-3 px-5 pt-7 pb-5 border-b border-dashed border-line mx-1">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-[14px] bg-accent text-white grid place-items-center shadow-warm-lg"
            style={{ transform: 'rotate(-4deg)' }}
          >
            <Coffee size={22} strokeWidth={1.8} />
          </div>
          <div>
            <div className="font-hand text-[24px] text-ink leading-none font-bold">家管小屋</div>
            <div className="text-[10.5px] text-ink-mute tracking-[1.5px] mt-0.5">HOME · MANAGE · CARE</div>
          </div>
        </div>
        <button onClick={() => setMobileOpen(false)} className="md:hidden text-ink-mute hover:text-ink p-1">
          <X size={20} />
        </button>
      </div>

      {/* Nav */}
      <nav className="px-3 pt-4 pb-2 flex flex-col gap-1 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] transition-all
                ${active
                  ? 'bg-accent text-white font-semibold shadow-warm-lg'
                  : 'text-ink-soft hover:bg-surface-warm hover:text-ink font-medium'}`}
            >
              <item.icon size={18} strokeWidth={1.7} />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight size={14} strokeWidth={2.2} />}
            </Link>
          );
        })}
      </nav>

      {/* User card */}
      <div className="m-3 mb-2 p-3.5 rounded-[14px] bg-surface-warm border border-line">
        <div className="flex items-center gap-3 mb-2.5">
          <div className="w-9 h-9 rounded-full bg-leaf grid place-items-center font-bold text-white text-[15px]">
            {user.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink truncate">{user.name}</p>
            <p className="text-[10.5px] text-ink-mute mt-px">{user.role === 'ADMIN' ? '管理員' : '一般用戶'} · 在線</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-1.5 text-[11.5px] text-ink-soft hover:text-accent py-1.5 rounded-lg transition"
        >
          <LogOut size={13} strokeWidth={1.7} /> 登出系統
        </button>
      </div>

      <div className="text-center text-[10px] text-ink-mute pb-3 font-hand">
        —— with care, since 2024 ——
      </div>
    </aside>
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

  const [roomPhotos, setRoomPhotos] = useState<RoomPhoto[]>(() => {
    const saved = localStorage.getItem('sl_room_photos_v1');
    return saved !== null ? JSON.parse(saved) : [];
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

      // 6. Room photos from Google Drive
      const cloudPhotos = await fetchPhotosFromDrive();
      if (cloudPhotos) setRoomPhotos(cloudPhotos);
    };
    loadFromCloud();
  }, []);

  useEffect(() => { localStorage.setItem('sl_tenants_v2', JSON.stringify(tenants)); }, [tenants]);
  useEffect(() => { localStorage.setItem('sl_payments_v2', JSON.stringify(payments)); }, [payments]);
  useEffect(() => { localStorage.setItem('sl_tickets_v2', JSON.stringify(tickets)); }, [tickets]);
  useEffect(() => { localStorage.setItem('sl_expenses_v2', JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem('sl_filters_v2', JSON.stringify(filters)); }, [filters]);
  useEffect(() => { localStorage.setItem('sl_meters_v2', JSON.stringify(meterReadings)); }, [meterReadings]);
  useEffect(() => { localStorage.setItem('sl_room_photos_v1', JSON.stringify(roomPhotos)); }, [roomPhotos]);

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

  // Room Condition Handlers (Google Drive backed)
  const handleAddRoomPhotos = async (files: File[], roomId: import('./types').RoomId) => {
    // Upload each file to Drive sequentially; state updates as each finishes.
    for (const file of files) {
      try {
        const cloudPhoto = await uploadPhotoToDrive(file, roomId, '');
        setRoomPhotos(prev => [cloudPhoto, ...prev]);
      } catch (err) {
        console.error('上傳失敗:', file.name, err);
        alert(`上傳失敗：${file.name}\n${err instanceof Error ? err.message : err}`);
      }
    }
  };

  const handleUpdateRoomCaption = (id: string, caption: string) => {
    // Optimistic UI: update locally, then sync to Drive description
    setRoomPhotos(prev => prev.map(p => p.id === id ? { ...p, caption } : p));
    updatePhotoCaptionOnDrive(id, caption).catch(err => {
      console.error('更新照片說明失敗:', err);
    });
  };

  const handleDeleteRoomPhoto = (id: string) => {
    // Optimistic UI: remove locally, then trash on Drive
    setRoomPhotos(prev => prev.filter(p => p.id !== id));
    deletePhotoFromDrive(id).catch(err => {
      console.error('Drive 刪除失敗:', err);
    });
  };

  if (!user) return <Login onLogin={handleLogin} error={loginError} />;

  return (
    <HashRouter>
      <div className="flex h-screen overflow-hidden bg-bg font-sans text-ink">
        {/* Mobile backdrop overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-20 bg-warm-600/40 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} user={user} onLogout={() => setUser(null)} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="md:hidden bg-surface p-4 flex items-center justify-between z-10 border-b border-line">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[10px] bg-accent text-white grid place-items-center" style={{ transform: 'rotate(-4deg)' }}>
                <Coffee size={16} strokeWidth={1.8} />
              </div>
              <h1 className="font-hand text-[20px] text-ink leading-none font-bold">家管小屋</h1>
            </div>
            <button onClick={() => setMobileOpen(true)} className="text-ink-soft hover:text-ink p-1.5 rounded-lg hover:bg-surface-warm">
              <Menu size={20} />
            </button>
          </header>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
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
              <Route path="/room-condition" element={
                <RoomCondition
                  photos={roomPhotos}
                  onAddPhotos={handleAddRoomPhotos}
                  onUpdateCaption={handleUpdateRoomCaption}
                  onDeletePhoto={handleDeleteRoomPhoto}
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
