import React, { useState } from 'react';
import { Building, ArrowRight, Lock, Phone } from 'lucide-react';
import { validatePhoneFormat } from '../services/authMock';

interface LoginProps {
  onLogin: (phone: string) => void;
  error?: string | null;
}

const Login: React.FC<LoginProps> = ({ onLogin, error }) => {
  const [phone, setPhone] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    
    if (!validatePhoneFormat(phone)) {
      setValidationError('請輸入有效的手機號碼 (例如: 0912345678)');
      return;
    }

    onLogin(phone);
  };

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-orange-100">
        <div className="bg-amber-600 p-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Building className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-wide">SmartLandlord</h1>
          <p className="text-amber-100 mt-2 text-sm">智慧房東管理系統 Pro</p>
        </div>

        <div className="p-8">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-stone-800">登入系統</h2>
            <p className="text-stone-500 text-sm mt-1">請輸入您的授權手機號碼以存取權限</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-stone-700 ml-1 block">手機號碼</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone size={18} className="text-stone-400" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition outline-none text-stone-800 font-medium"
                  placeholder="09xx-xxx-xxx"
                  autoFocus
                />
              </div>
            </div>

            {(error || validationError) && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <Lock size={16} />
                {validationError || error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3 px-4 rounded-lg transition transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg"
            >
              登入驗證 <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-8 text-center">
             <p className="text-xs text-stone-400">
               本系統採用白名單驗證機制，<br/>僅限授權管理者使用。
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;