
import { Tenant, PaymentRecord, MaintenanceTicket, FilterSchedule, ExpenseRecord, MeterReading } from '../types';

export const mockTenants: Tenant[] = [];

export const mockPayments: PaymentRecord[] = [];

export const mockTickets: MaintenanceTicket[] = [];

export const mockExpenses: ExpenseRecord[] = [];

export const mockReadings: MeterReading[] = [];

export const mockFilters: FilterSchedule[] = [
  { 
    id: 'f1', 
    model: 'UF-591', 
    specification: 'QUICK-FIT新卡式5微米PP濾芯', 
    cycleMonths: 6, 
    location: '1F 公共區域', 
    lastReplaced: '2023-10-01', 
    nextDue: '2024-04-01', 
    status: 'Good' 
  },
  { 
    id: 'f2', 
    model: 'UF-592', 
    specification: 'QUICK-FIT新卡式塊狀活性碳濾芯', 
    cycleMonths: 6, 
    location: '1F 公共區域', 
    lastReplaced: '2023-10-01', 
    nextDue: '2024-04-01', 
    status: 'Good' 
  },
  { 
    id: 'f3', 
    model: 'UF-504', 
    specification: '0.0001微米逆滲透薄膜', 
    cycleMonths: 24, 
    location: '1F 公共區域', 
    lastReplaced: '2022-05-01', 
    nextDue: '2024-05-01', 
    status: 'Due Soon' 
  },
  { 
    id: 'f4', 
    model: 'UF-28', 
    specification: '遠紅外線麥飯石濾芯', 
    cycleMonths: 24, 
    location: '1F 公共區域', 
    lastReplaced: '2022-01-01', 
    nextDue: '2024-01-01', 
    status: 'Overdue' 
  },
  { 
    id: 'f5', 
    model: 'UF-515', 
    specification: '椰殼顆粒活性碳後置濾心', 
    cycleMonths: 12, 
    location: '1F 公共區域', 
    lastReplaced: '2023-04-01', 
    nextDue: '2024-04-01', 
    status: 'Good' 
  }
];
