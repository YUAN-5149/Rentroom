
import React, { useState, useEffect, useMemo } from 'react';
import { MaintenanceTicket, FilterSchedule, MaintenanceStatus, Priority, Tenant } from '../types';
import { Wrench, CheckCircle, AlertTriangle, Plus, Edit, Trash2, X, Save, RefreshCw, Calendar, User, ClipboardList, CheckSquare, Square, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import * as XLSX from 'xlsx';

interface MaintenanceProps {
  tickets: MaintenanceTicket[];
  filters: FilterSchedule[];
  tenants: Tenant[];
  onUpdateTicketStatus: (id: string, status: MaintenanceStatus) => void;
  onAddTicket: (ticket: MaintenanceTicket) => void;
  onUpdateTicket: (ticket: MaintenanceTicket) => void;
  onDeleteTicket: (id: string) => void;
  onBatchUpdateTicketStatus: (ids: string[], status: MaintenanceStatus) => void;
  onUpdateFilter: (filter: FilterSchedule) => void; // New prop
}

const Maintenance: React.FC<MaintenanceProps> = ({ 
  tickets, 
  filters, 
  tenants,
  onUpdateTicketStatus,
  onAddTicket,
  onUpdateTicket,
  onDeleteTicket,
  onBatchUpdateTicketStatus,
  onUpdateFilter
}) => {
  const [activeTab, setActiveTab] = useState<'REPAIR' | 'FILTER'>('REPAIR');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  
  // Removed localFilters state, using props 'filters' directly
  const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);

  // --- Filtering & Sorting State ---
  const [filterStatus, setFilterStatus] = useState<'ALL' | MaintenanceStatus>('ALL');
  const [filterPriority, setFilterPriority] = useState<'ALL' | Priority>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'priority' | 'cost'; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  // Form State for Repairs
  const initialFormState: Partial<MaintenanceTicket> = {
    description: '',
    reportDate: new Date().toISOString().split('T')[0],
    status: MaintenanceStatus.OPEN,
    priority: Priority.MEDIUM,
    category: 'Appliance',
    cost: 0,
    notes: '',
    tenantId: ''
  };
  const [formData, setFormData] = useState<Partial<MaintenanceTicket>>(initialFormState);

  const exportReport = () => {
    const data = activeTab === 'REPAIR' ? tickets : filters;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab === 'REPAIR' ? "Repairs" : "Filters");
    XLSX.writeFile(wb, "Maintenance_Report.xlsx");
  };

  // Helper: Calculate status based on nextDue date
  const calculateStatus = (nextDue: string): 'Good' | 'Due Soon' | 'Overdue' => {
    const today = new Date();
    const dueDate = new Date(nextDue);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays <= 30) return 'Due Soon';
    return 'Good';
  };

  const addMonths = (dateStr: string, months: number): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  };

  const handleDateChange = (id: string, newDate: string) => {
    const filter = filters.find(f => f.id === id);
    if (filter) {
        const nextDue = addMonths(newDate, filter.cycleMonths);
        const updatedFilter = {
            ...filter,
            lastReplaced: newDate,
            nextDue: nextDue,
            status: calculateStatus(nextDue)
        };
        onUpdateFilter(updatedFilter);
    }
  };

  const handleMarkReplaced = (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    handleDateChange(id, today);
  };

  const getModelBgColor = (model: string) => {
    switch (model) {
      case 'UF-591': return 'bg-blue-100';    // 藍底色
      case 'UF-592': return 'bg-green-100';   // 綠底色
      case 'UF-504': return 'bg-sky-100';     // 水藍底色
      case 'UF-28':  return 'bg-accent-soft';  // 黃底色
      case 'UF-515': return 'bg-orange-100';  // 橘底色
      default: return 'bg-surface';
    }
  };

  const handleOpenAddModal = () => {
    setEditingTicketId(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ticket: MaintenanceTicket) => {
    setEditingTicketId(ticket.id);
    setFormData(ticket);
    setIsModalOpen(true);
  };

  const handleInlinePriorityUpdate = (id: string, priority: Priority) => {
    const ticket = tickets.find(t => t.id === id);
    if (ticket) {
        onUpdateTicket({ ...ticket, priority });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedTenant = tenants.find(t => t.id === formData.tenantId);
    const tenantName = selectedTenant ? selectedTenant.name : (formData.tenantName || '未知租客');

    const ticketData = {
        ...formData,
        tenantName,
        id: editingTicketId || `mt-${Date.now()}`,
        status: formData.status || MaintenanceStatus.OPEN,
        priority: formData.priority || Priority.MEDIUM,
        category: formData.category || 'Other',
    } as MaintenanceTicket;

    if (editingTicketId) {
        onUpdateTicket(ticketData);
    } else {
        onAddTicket(ticketData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
      if (window.confirm('確定要刪除此維修紀錄嗎？')) {
          onDeleteTicket(id);
          setSelectedTicketIds(prev => prev.filter(sid => sid !== id));
      }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
        ...prev,
        [name]: name === 'cost' ? Number(value) : value
    }));
  };

  const getStatusStyle = (status: MaintenanceStatus) => {
    switch (status) {
        case MaintenanceStatus.COMPLETED: return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case MaintenanceStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-800 border-blue-200';
        default: return 'bg-accent-soft text-amber-800 border-accent-soft';
    }
  };

  const getPriorityStyle = (priority: Priority) => {
    switch (priority) {
        case Priority.HIGH: return 'text-rose-600 font-bold';
        case Priority.MEDIUM: return 'text-accent font-bold';
        default: return 'text-emerald-600 font-bold';
    }
  };

  const translateCategory = (cat: string) => {
    const mapping: Record<string, string> = {
        'Appliance': '家電',
        'Plumbing': '水電管路',
        'Electrical': '電力系統',
        'Filter': '濾心耗材',
        'Other': '其他'
    };
    return mapping[cat] || cat;
  };

  const toggleSelectAll = () => {
    if (selectedTicketIds.length === filteredAndSortedTickets.length && filteredAndSortedTickets.length > 0) {
      setSelectedTicketIds([]);
    } else {
      setSelectedTicketIds(filteredAndSortedTickets.map(t => t.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedTicketIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleBatchStatusUpdate = (status: MaintenanceStatus) => {
    if (selectedTicketIds.length === 0) return;
    onBatchUpdateTicketStatus(selectedTicketIds, status);
    setSelectedTicketIds([]);
  };

  // --- Sorting & Filtering Logic ---
  const handleSort = (key: 'date' | 'priority' | 'cost') => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const getPriorityWeight = (p: Priority) => {
    if (p === Priority.HIGH) return 3;
    if (p === Priority.MEDIUM) return 2;
    return 1;
  };

  const filteredAndSortedTickets = useMemo(() => {
    let result = [...tickets];

    // 1. Filter
    if (filterStatus !== 'ALL') {
      result = result.filter(t => t.status === filterStatus);
    }
    if (filterPriority !== 'ALL') {
      result = result.filter(t => t.priority === filterPriority);
    }
    if (filterCategory !== 'ALL') {
      result = result.filter(t => t.category === filterCategory);
    }

    // 2. Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortConfig.key) {
        case 'date':
          comparison = new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime();
          break;
        case 'cost':
          comparison = (a.cost || 0) - (b.cost || 0);
          break;
        case 'priority':
          comparison = getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
          break;
      }
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [tickets, filterStatus, filterPriority, filterCategory, sortConfig]);


  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortConfig.key !== colKey) return <ArrowUpDown size={14} className="text-ink-mute ml-1 inline" />;
    return sortConfig.direction === 'asc' ? 
      <ArrowUp size={14} className="text-accent ml-1 inline" /> : 
      <ArrowDown size={14} className="text-accent ml-1 inline" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-surface p-4 rounded-lg shadow-warm-sm border-b-2 border-line gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full xl:w-auto">
          <h2 className="font-serif text-2xl font-bold text-ink whitespace-nowrap">維修管理</h2>
          <div className="flex bg-bg rounded-lg p-1 w-full sm:w-auto">
             <button 
                onClick={() => setActiveTab('REPAIR')}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition whitespace-nowrap ${activeTab === 'REPAIR' ? 'bg-surface shadow-warm text-accent' : 'text-ink-soft hover:text-ink'}`}
             >
                租客報修
             </button>
             <button 
                onClick={() => setActiveTab('FILTER')}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition whitespace-nowrap ${activeTab === 'FILTER' ? 'bg-surface shadow-warm text-accent' : 'text-ink-soft hover:text-ink'}`}
             >
                飲水機濾心
             </button>
          </div>
        </div>
        <div className="flex gap-2 w-full xl:w-auto">
            {activeTab === 'REPAIR' && (
                <button 
                    onClick={handleOpenAddModal}
                    className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-accent hover:bg-amber-700 text-white px-4 py-2 rounded-md text-sm transition shadow-warm-sm whitespace-nowrap"
                >
                    <Plus size={16} /> 新增報修
                </button>
            )}
            <button 
            onClick={exportReport}
            className="flex-1 xl:flex-none flex items-center justify-center gap-2 bg-stone-700 hover:bg-stone-800 text-white px-4 py-2 rounded-md text-sm transition whitespace-nowrap"
            >
            匯出 Excel
            </button>
        </div>
      </div>

      {activeTab === 'REPAIR' ? (
        <div className="space-y-4">

          {/* Filter Bar */}
          <div className="bg-surface p-3 rounded-lg border border-line flex flex-wrap gap-2 items-center shadow-warm-sm overflow-x-auto">
             <div className="flex items-center gap-2 text-ink-soft text-sm font-bold mr-2">
                <Filter size={16} /> 篩選:
             </div>
             
             <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="bg-bg border border-line text-ink text-xs rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-accent flex-grow sm:flex-grow-0"
             >
                <option value="ALL">全部狀態</option>
                <option value={MaintenanceStatus.OPEN}>待處理</option>
                <option value={MaintenanceStatus.IN_PROGRESS}>維修中</option>
                <option value={MaintenanceStatus.COMPLETED}>已完成</option>
             </select>

             <select 
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as any)}
                className="bg-bg border border-line text-ink text-xs rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-accent flex-grow sm:flex-grow-0"
             >
                <option value="ALL">全部優先級</option>
                <option value={Priority.HIGH}>緊急 (High)</option>
                <option value={Priority.MEDIUM}>普通 (Medium)</option>
                <option value={Priority.LOW}>低 (Low)</option>
             </select>

             <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-bg border border-line text-ink text-xs rounded-md px-2 py-1.5 outline-none focus:ring-1 focus:ring-accent flex-grow sm:flex-grow-0"
             >
                <option value="ALL">全部類別</option>
                <option value="Appliance">家電</option>
                <option value="Plumbing">水電管路</option>
                <option value="Electrical">電力系統</option>
                <option value="Filter">濾心耗材</option>
                <option value="Other">其他</option>
             </select>
             
             {(filterStatus !== 'ALL' || filterPriority !== 'ALL' || filterCategory !== 'ALL') && (
               <button 
                  onClick={() => { setFilterStatus('ALL'); setFilterPriority('ALL'); setFilterCategory('ALL'); }}
                  className="text-xs text-rose-500 hover:text-rose-700 font-bold ml-auto"
               >
                 清除篩選
               </button>
             )}
          </div>

          {selectedTicketIds.length > 0 && (
            <div className="bg-stone-800 text-white p-3 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between animate-in slide-in-from-top-2 duration-300 shadow-warm-lg gap-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                <div className="text-sm font-bold flex items-center gap-2">
                  <CheckSquare size={16} className="text-amber-500" />
                  已選取 {selectedTicketIds.length} 項紀錄
                </div>
                <div className="h-4 w-px bg-stone-600 hidden sm:block"></div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="text-xs font-medium text-ink-mute whitespace-nowrap">批次標記：</div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button 
                            onClick={() => handleBatchStatusUpdate(MaintenanceStatus.COMPLETED)}
                            className="flex-1 sm:flex-none px-3 py-1 bg-emerald-600 hover:bg-emerald-700 rounded text-xs font-bold transition flex items-center justify-center gap-1.5"
                        >
                            <CheckCircle size={14} /> <span className="sm:inline">已完成</span>
                        </button>
                        <button 
                            onClick={() => handleBatchStatusUpdate(MaintenanceStatus.IN_PROGRESS)}
                            className="flex-1 sm:flex-none px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs font-bold transition flex items-center justify-center gap-1.5"
                        >
                            <RefreshCw size={14} /> <span className="sm:inline">維修中</span>
                        </button>
                    </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedTicketIds([])}
                className="absolute top-2 right-2 sm:static text-ink-mute hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Mobile card view */}
          <div className="sm:hidden space-y-3">
            {filteredAndSortedTickets.map(ticket => (
              <div key={ticket.id} className={`bg-surface rounded-lg shadow-warm-sm border border-line p-4 ${selectedTicketIds.includes(ticket.id) ? 'ring-2 ring-amber-400' : ''}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button onClick={() => toggleSelectOne(ticket.id)} className="text-ink-mute hover:text-accent transition flex-shrink-0">
                      {selectedTicketIds.includes(ticket.id) ? <CheckSquare size={18} className="text-accent" /> : <Square size={18} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ink line-clamp-2">{ticket.description}</p>
                      {ticket.notes && <p className="text-xs text-ink-mute italic mt-0.5">附註: {ticket.notes}</p>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    <button onClick={() => handleOpenEditModal(ticket)} className="text-ink-mute hover:text-accent transition p-1.5 rounded-full hover:bg-accent-soft/40">
                      <Edit size={15} />
                    </button>
                    <button onClick={() => handleDelete(ticket.id)} className="text-ink-mute hover:text-rose-600 transition p-1.5 rounded-full hover:bg-rose-50">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-line">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 bg-accent-soft rounded-full flex items-center justify-center text-accent text-[10px] font-bold">
                      {ticket.tenantName.charAt(0)}
                    </div>
                    <span className="text-xs text-ink-soft font-medium">{ticket.tenantName}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 bg-surface-warm text-ink-soft rounded font-bold">{translateCategory(ticket.category)}</span>
                  <span className="text-xs text-ink-soft">{ticket.reportDate}</span>
                  <span className="text-xs font-bold text-ink">${(ticket.cost || 0).toLocaleString()}</span>
                  <div className="ml-auto flex items-center gap-2">
                    <select
                      value={ticket.priority}
                      onChange={(e) => handleInlinePriorityUpdate(ticket.id, e.target.value as Priority)}
                      className={`text-xs bg-transparent border-none focus:ring-0 cursor-pointer p-0 ${getPriorityStyle(ticket.priority)}`}
                    >
                      <option value={Priority.LOW}>低級</option>
                      <option value={Priority.MEDIUM}>普通</option>
                      <option value={Priority.HIGH}>緊急</option>
                    </select>
                    <select
                      value={ticket.status}
                      onChange={(e) => onUpdateTicketStatus(ticket.id, e.target.value as MaintenanceStatus)}
                      className={`text-[11px] font-bold py-1 px-2 rounded-full border cursor-pointer outline-none transition appearance-none shadow-warm-sm ${getStatusStyle(ticket.status)}`}
                    >
                      <option value={MaintenanceStatus.OPEN}>待處理</option>
                      <option value={MaintenanceStatus.IN_PROGRESS}>維修中</option>
                      <option value={MaintenanceStatus.COMPLETED}>已完成</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
            {filteredAndSortedTickets.length === 0 && (
              <div className="bg-surface rounded-lg p-12 text-center text-ink-mute italic">目前沒有符合條件的報修紀錄。</div>
            )}
          </div>

          {/* Desktop table view */}
          <div className="hidden sm:block bg-surface rounded-lg shadow-warm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-line">
                <thead className="bg-surface-warm">
                    <tr>
                    <th className="px-6 py-3 text-left w-10">
                        <button onClick={toggleSelectAll} className="text-ink-mute hover:text-accent transition">
                        {selectedTicketIds.length === filteredAndSortedTickets.length && filteredAndSortedTickets.length > 0 ? (
                            <CheckSquare size={18} className="text-accent" />
                        ) : (
                            <Square size={18} />
                        )}
                        </button>
                    </th>
                    <th
                        className="px-6 py-3 text-left text-xs font-bold text-ink-soft uppercase tracking-wider cursor-pointer hover:bg-surface-warm transition select-none group whitespace-nowrap"
                        onClick={() => handleSort('date')}
                    >
                        日期 / 類別 <SortIcon colKey="date" />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-soft uppercase tracking-wider whitespace-nowrap">租客</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-soft uppercase tracking-wider min-w-[200px]">問題描述</th>
                    <th
                        className="px-6 py-3 text-left text-xs font-bold text-ink-soft uppercase tracking-wider cursor-pointer hover:bg-surface-warm transition select-none group whitespace-nowrap"
                        onClick={() => handleSort('priority')}
                    >
                        優先級 (可改) <SortIcon colKey="priority" />
                    </th>
                    <th
                        className="px-6 py-3 text-left text-xs font-bold text-ink-soft uppercase tracking-wider cursor-pointer hover:bg-surface-warm transition select-none group whitespace-nowrap"
                        onClick={() => handleSort('cost')}
                    >
                        費用 <SortIcon colKey="cost" />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-ink-soft uppercase tracking-wider whitespace-nowrap">處理狀態 (可改)</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-ink-soft uppercase tracking-wider whitespace-nowrap">操作</th>
                    </tr>
                </thead>
                <tbody className="bg-surface divide-y divide-line">
                    {filteredAndSortedTickets.map(ticket => (
                    <tr key={ticket.id} className={`${selectedTicketIds.includes(ticket.id) ? 'bg-accent-soft/40/50' : 'hover:bg-bg/30'} transition duration-150`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                        <button onClick={() => toggleSelectOne(ticket.id)} className="text-ink-mute hover:text-accent transition">
                            {selectedTicketIds.includes(ticket.id) ? (
                            <CheckSquare size={18} className="text-accent" />
                            ) : (
                            <Square size={18} />
                            )}
                        </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-stone-900">{ticket.reportDate}</div>
                        <div className="text-[10px] px-1.5 py-0.5 bg-surface-warm text-ink-soft rounded inline-block mt-1 font-bold">
                            {translateCategory(ticket.category)}
                        </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-accent-soft rounded-full flex items-center justify-center text-accent text-xs font-bold">
                                {ticket.tenantName.charAt(0)}
                            </div>
                            <span className="text-sm text-ink font-medium">{ticket.tenantName}</span>
                        </div>
                        </td>
                        <td className="px-6 py-4">
                        <p className="text-sm text-ink line-clamp-1 max-w-xs" title={ticket.description}>
                            {ticket.description}
                        </p>
                        {ticket.notes && <p className="text-[10px] text-ink-mute mt-0.5 italic">附註: {ticket.notes}</p>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <select
                            value={ticket.priority}
                            onChange={(e) => handleInlinePriorityUpdate(ticket.id, e.target.value as Priority)}
                            className={`text-xs bg-transparent border-none focus:ring-0 cursor-pointer p-0 pr-6 ${getPriorityStyle(ticket.priority)}`}
                            >
                            <option value={Priority.LOW}>低級</option>
                            <option value={Priority.MEDIUM}>普通</option>
                            <option value={Priority.HIGH}>緊急</option>
                            </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-ink font-semibold">
                            ${(ticket.cost || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <select
                            value={ticket.status}
                            onChange={(e) => onUpdateTicketStatus(ticket.id, e.target.value as MaintenanceStatus)}
                            className={`text-xs font-bold py-1 px-3 rounded-full border cursor-pointer outline-none transition appearance-none shadow-warm-sm ${getStatusStyle(ticket.status)}`}
                            >
                            <option value={MaintenanceStatus.OPEN}>待處理</option>
                            <option value={MaintenanceStatus.IN_PROGRESS}>維修中</option>
                            <option value={MaintenanceStatus.COMPLETED}>已完成</option>
                            </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <div className="flex justify-end gap-2">
                            <button
                                onClick={() => handleOpenEditModal(ticket)}
                                className="text-ink-mute hover:text-accent transition p-1.5 rounded-full hover:bg-accent-soft/40"
                                title="完整編輯"
                            >
                                <Edit size={16} />
                            </button>
                            <button
                                onClick={() => handleDelete(ticket.id)}
                                className="text-ink-mute hover:text-rose-600 transition p-1.5 rounded-full hover:bg-rose-50"
                                title="刪除"
                            >
                                <Trash2 size={16} />
                            </button>
                            </div>
                        </td>
                    </tr>
                    ))}
                    {filteredAndSortedTickets.length === 0 && (
                        <tr>
                            <td colSpan={8} className="px-6 py-12 text-center text-ink-mute italic">
                                目前沒有符合條件的報修紀錄。
                            </td>
                        </tr>
                    )}
                </tbody>
                </table>
            </div>
            <div className="p-4 bg-bg flex items-center gap-2 text-[11px] text-ink-soft overflow-x-auto whitespace-nowrap">
              <ClipboardList size={12} className="text-amber-500 flex-shrink-0" />
              <span>提示：點擊表格標題（日期、優先級、費用）可進行排序。勾選方塊可進行批次狀態更新。</span>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Mobile card view for filters */}
          <div className="sm:hidden space-y-3">
            {filters.map(filter => (
              <div key={filter.id} className={`rounded-lg shadow-warm-sm border border-line p-4 ${getModelBgColor(filter.model)}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-black text-ink">{filter.model}</p>
                    <p className="text-xs text-ink-soft mt-0.5">{filter.specification}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-warm-sm
                      ${filter.status === 'Overdue' ? 'bg-rose-100 text-rose-800' :
                      filter.status === 'Due Soon' ? 'bg-accent-soft text-amber-800 border border-accent-soft' : 'bg-emerald-100 text-emerald-800'}`}>
                      {filter.status === 'Overdue' ? '已過期' : filter.status === 'Due Soon' ? '即將到期' : '良好'}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-ink-mute font-bold mb-1">更換週期</p>
                    <p className="text-ink">每 {filter.cycleMonths} 個月</p>
                  </div>
                  <div>
                    <p className="text-ink-mute font-bold mb-1">預計到期</p>
                    <p className="text-ink font-bold">{filter.nextDue}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-ink-mute font-bold mb-1">上次更換（可編輯）</p>
                    <input
                      type="date"
                      value={filter.lastReplaced}
                      onChange={(e) => handleDateChange(filter.id, e.target.value)}
                      className="text-sm bg-surface/60 border border-line rounded px-2 py-1 outline-none focus:ring-1 focus:ring-accent w-full"
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleMarkReplaced(filter.id)}
                  className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs bg-surface/80 text-ink px-3 py-2 rounded-md border border-line hover:bg-amber-500 hover:text-white hover:border-accent transition-all font-bold shadow-warm-sm"
                >
                  <RefreshCw size={12} /> 一鍵標記今日更換
                </button>
              </div>
            ))}
          </div>

          {/* Desktop table view for filters */}
          <div className="hidden sm:block bg-surface rounded-lg shadow-warm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-line">
                  <thead className="bg-surface-warm">
                  <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-ink-soft uppercase tracking-wider whitespace-nowrap">型號 / 規格</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-ink-soft uppercase tracking-wider whitespace-nowrap">更換週期</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-ink-soft uppercase tracking-wider whitespace-nowrap">上次更換 (可編輯)</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-ink-soft uppercase tracking-wider whitespace-nowrap">預計到期</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-ink-soft uppercase tracking-wider whitespace-nowrap">狀態</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-ink-soft uppercase tracking-wider whitespace-nowrap">操作</th>
                  </tr>
                  </thead>
                  <tbody className="bg-surface divide-y divide-line">
                  {filters.map(filter => (
                      <tr key={filter.id} className={`${getModelBgColor(filter.model)} transition duration-200`}>
                      <td className="px-6 py-4">
                          <div className="text-sm font-bold text-ink whitespace-nowrap">{filter.model}</div>
                          <div className="text-xs text-ink-soft whitespace-nowrap">{filter.specification}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-ink-soft">
                          每 {filter.cycleMonths} 個月
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                              <input
                              type="date"
                              value={filter.lastReplaced}
                              onChange={(e) => handleDateChange(filter.id, e.target.value)}
                              className="text-sm bg-transparent border-b border-dashed border-stone-400 hover:border-accent focus:border-amber-600 focus:ring-0 outline-none px-1 py-0.5 text-ink transition"
                              />
                          </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-ink">{filter.nextDue}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-warm-sm
                              ${filter.status === 'Overdue' ? 'bg-rose-100 text-rose-800' :
                              filter.status === 'Due Soon' ? 'bg-accent-soft text-amber-800 border border-accent-soft' : 'bg-emerald-100 text-emerald-800'}`}>
                              {filter.status === 'Overdue' ? '已過期' : filter.status === 'Due Soon' ? '即將到期' : '良好'}
                          </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                          <button
                              onClick={() => handleMarkReplaced(filter.id)}
                              className="flex items-center gap-1 text-xs bg-surface/80 text-ink px-3 py-1.5 rounded-md border border-line hover:bg-amber-500 hover:text-white hover:border-accent transition-all font-bold shadow-warm-sm"
                              title="標記為今日更換"
                          >
                              <RefreshCw size={12} /> 一鍵更新
                          </button>
                      </td>
                      </tr>
                  ))}
                  </tbody>
              </table>
            </div>
            <div className="p-4 bg-bg flex items-center gap-2 text-[11px] text-ink-soft overflow-x-auto whitespace-nowrap">
              <Calendar size={12} className="text-amber-500 flex-shrink-0" />
              <span>提醒：預計到期日前 1 個月將自動轉為「即將到期」狀態。修改「上次更換日期」將自動連動計算。</span>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal (Repair Only) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
            <div className="bg-surface rounded-cozy shadow-warm-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-line flex justify-between items-center bg-bg shrink-0">
                    <h3 className="font-serif text-lg font-bold text-ink">
                        {editingTicketId ? '編輯維修紀錄' : '新增維修紀錄'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-ink-mute hover:text-ink-soft">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-ink">報修租客</label>
                                <select 
                                    name="tenantId" 
                                    value={formData.tenantId} 
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-line rounded text-sm focus:ring-2 focus:ring-accent outline-none bg-surface"
                                    required
                                >
                                    <option value="" disabled>請選擇租客</option>
                                    {tenants.map(t => (
                                        <option key={t.id} value={t.id}>{t.name} ({t.roomNumber})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-ink">報修日期</label>
                                <input 
                                    type="date"
                                    name="reportDate" 
                                    value={formData.reportDate} 
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-line rounded text-sm focus:ring-2 focus:ring-accent outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-ink">問題類別</label>
                            <select 
                                name="category" 
                                value={formData.category} 
                                onChange={handleInputChange}
                                className="w-full p-2 border border-line rounded text-sm focus:ring-2 focus:ring-accent outline-none bg-surface"
                            >
                                <option value="Appliance">家電 (Appliance)</option>
                                <option value="Plumbing">水電管路 (Plumbing)</option>
                                <option value="Electrical">電力系統 (Electrical)</option>
                                <option value="Filter">濾心/耗材 (Filter)</option>
                                <option value="Other">其他 (Other)</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-ink">問題描述</label>
                            <textarea 
                                name="description" 
                                value={formData.description} 
                                onChange={handleInputChange}
                                placeholder="請簡述維修狀況..."
                                className="w-full p-2 border border-line rounded text-sm h-24 focus:ring-2 focus:ring-accent outline-none resize-none"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-ink">優先等級</label>
                                <select 
                                    name="priority" 
                                    value={formData.priority} 
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-line rounded text-sm focus:ring-2 focus:ring-accent outline-none bg-surface"
                                >
                                    <option value={Priority.LOW}>低 (Low)</option>
                                    <option value={Priority.MEDIUM}>中 (Medium)</option>
                                    <option value={Priority.HIGH}>高 (High)</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-ink">目前狀態</label>
                                <select 
                                    name="status" 
                                    value={formData.status} 
                                    onChange={handleInputChange}
                                    className="w-full p-2 border border-line rounded text-sm focus:ring-2 focus:ring-accent outline-none bg-surface"
                                >
                                    <option value={MaintenanceStatus.OPEN}>處理中</option>
                                    <option value={MaintenanceStatus.IN_PROGRESS}>維修中</option>
                                    <option value={MaintenanceStatus.COMPLETED}>已完成</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-ink">維修費用 (TWD)</label>
                            <input 
                                type="number"
                                name="cost" 
                                value={formData.cost} 
                                onChange={handleInputChange}
                                className="w-full p-2 border border-line rounded text-sm focus:ring-2 focus:ring-accent outline-none"
                                placeholder="0"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-ink">備註</label>
                            <input 
                                name="notes" 
                                value={formData.notes || ''} 
                                onChange={handleInputChange}
                                className="w-full p-2 border border-line rounded text-sm focus:ring-2 focus:ring-accent outline-none"
                                placeholder="處理細節或備註..."
                            />
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-line mt-2">
                            {editingTicketId ? (
                                <button 
                                    type="button"
                                    onClick={() => handleDelete(editingTicketId)}
                                    className="text-rose-600 hover:text-rose-700 text-sm font-semibold flex items-center gap-1"
                                >
                                    <Trash2 size={16} /> <span className="hidden sm:inline">刪除紀錄</span><span className="sm:hidden">刪除</span>
                                </button>
                            ) : <div></div>}
                        
                            <div className="flex gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-sm text-ink-soft bg-surface-warm rounded hover:bg-surface-warm transition"
                                >
                                    取消
                                </button>
                                <button 
                                    type="submit"
                                    className="px-4 py-2 text-sm text-white bg-accent rounded hover:bg-amber-700 transition flex items-center gap-2 shadow-warm-sm"
                                >
                                    <Save size={16} /> 儲存
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;
