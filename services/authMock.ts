export type UserRole = 'ADMIN' | 'TENANT';

export interface User {
  phone: string;
  name: string;
  role: UserRole;
}

// 白名單資料庫
// 在實際應用中，這裡通常會連接後端資料庫
const WHITELIST: User[] = [
  {
    phone: '0937779487',
    name: '房東 Admin',
    role: 'ADMIN'
  },
  {
    phone: '0912570503',
    name: '管理員小陳',
    role: 'ADMIN'
  },
  {
    phone: '0952337781',
    name: '授權管理員',
    role: 'ADMIN'
  }
];

export const verifyUser = (phone: string): User | null => {
  // 簡單的格式清理，移除空白與破折號
  const cleanPhone = phone.replace(/[\s-]/g, '');
  
  const user = WHITELIST.find(u => u.phone === cleanPhone);
  return user || null;
};

export const validatePhoneFormat = (phone: string): boolean => {
  // 簡單驗證台灣手機格式 (09開頭，共10碼)
  const regex = /^09\d{8}$/;
  return regex.test(phone.replace(/[\s-]/g, ''));
};