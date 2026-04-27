
export enum PaymentStatus {
  PAID = '已繳',
  PENDING = '待繳',
  OVERDUE = '逾期',
}

export enum MaintenanceStatus {
  OPEN = '處理中',
  IN_PROGRESS = '維修中',
  COMPLETED = '已完成',
}

export enum Priority {
  LOW = '低',
  MEDIUM = '中',
  HIGH = '高',
}

export type ExpenseCategory = 'Water' | 'Electricity' | 'Gas' | 'Internet' | 'Cleaning' | 'Other';

export interface ExpenseRecord {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: string; // YYYY-MM-DD
  description?: string;
}

export interface Tenant {
  id: string;
  name: string;
  roomNumber: string;
  phone: string;
  email: string;
  moveInDate: string;
  leaseEndDate: string;
  rentAmount: number;
  deposit: number;
  idNumber: string; // ID Card number
  contractContent?: string; // Custom contract clauses
  fingerprintId?: string; // 指紋建置號碼
}

export interface PaymentRecord {
  id: string;
  tenantId: string;
  tenantName: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: PaymentStatus;
  type: 'Rent' | 'Utility' | 'Deposit' | 'Other';
}

export interface MaintenanceTicket {
  id: string;
  tenantId: string;
  tenantName: string;
  description: string;
  reportDate: string;
  status: MaintenanceStatus;
  priority: Priority;
  category: 'Appliance' | 'Plumbing' | 'Electrical' | 'Filter' | 'Other';
  cost?: number;
  notes?: string;
}

export interface FilterSchedule {
  id: string;
  model: string;         // e.g., "UF-591"
  specification: string; // e.g., "5微米PP濾芯"
  cycleMonths: number;   // e.g., 6
  location: string;      // e.g., "1F 公共區域"
  lastReplaced: string;
  nextDue: string;
  status: 'Good' | 'Due Soon' | 'Overdue';
}

export interface MeterReading {
  id: string;
  meterName: string; // e.g. "3F A室" or "Meter #3"
  date: string;      // YYYY-MM-DD
  currentReading: number;
  previousReading: number;
  usage: number;     // current - previous
  ratePerKwh: number;
  totalCost: number;
  note?: string;
}
