import React, { useState } from 'react';
import { ArrowRight, Lock, Phone, Eye, EyeOff, Coffee, Leaf } from 'lucide-react';
import { validatePhoneFormat } from '../services/authMock';

interface LoginProps {
  onLogin: (phone: string) => void;
  error?: string | null;
}

const Login: React.FC<LoginProps> = ({ onLogin, error }) => {
  const [phone, setPhone] = useState('');
  const [validationError, setValidationError] = useState('');
  const [showPhone, setShowPhone] = useState(false);

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
    <div
      className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] bg-bg text-ink"
      style={{
        backgroundImage:
          'radial-gradient(circle at 20% 80%, rgba(242,217,192,0.55) 0, transparent 50%), radial-gradient(circle at 90% 10%, rgba(221,227,201,0.65) 0, transparent 50%)',
      }}
    >
      {/* === Left brand panel === */}
      <div className="relative px-8 sm:px-16 lg:px-20 py-12 lg:py-16 flex flex-col justify-between overflow-hidden">
        {/* Decorative leaf bottom-right */}
        <Leaf
          size={180}
          strokeWidth={1}
          className="absolute right-6 bottom-6 text-leaf opacity-[0.18] rotate-12 pointer-events-none hidden sm:block"
        />

        <div>
          {/* Brand */}
          <div className="flex items-center gap-3.5">
            <div
              className="w-13 h-13 sm:w-[52px] sm:h-[52px] rounded-[18px] bg-accent text-white grid place-items-center shadow-warm-lg"
              style={{ transform: 'rotate(-5deg)' }}
            >
              <Coffee size={28} strokeWidth={1.7} />
            </div>
            <div>
              <div className="font-hand text-3xl sm:text-4xl text-ink leading-none font-bold">家管小屋</div>
              <div className="text-[11px] text-ink-mute tracking-[2px] mt-1">HOME · MANAGE · CARE</div>
            </div>
          </div>

          {/* Hero copy */}
          <h1 className="font-serif font-bold text-ink leading-tight tracking-wide max-w-[480px] mt-12 lg:mt-20"
              style={{ fontSize: 'clamp(32px, 4.5vw, 46px)' }}>
            把每位租客<br />
            當<span className="relative text-accent inline-block">
              家人
              <svg
                className="absolute left-0 -bottom-2 w-full h-3 pointer-events-none"
                viewBox="0 0 100 12"
                preserveAspectRatio="none"
              >
                <path
                  d="M2 8 Q 25 2, 50 7 T 98 5"
                  stroke="#C9763C"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  opacity="0.5"
                />
              </svg>
            </span>{' '}一樣照顧
          </h1>

          <p className="mt-7 text-[15px] text-ink-soft leading-[1.7] max-w-[420px]">
            房租、合約、維修、水電、套房原狀。<br />
            溫柔、穩當地，把這些瑣事一次處理好。
          </p>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-7 mt-12 lg:mt-0">
          {[
            { n: '24', l: '位租客' },
            { n: '6',  l: '間套房' },
            { n: '2024', l: '陪伴起點' },
          ].map((s, i) => (
            <div key={i}>
              <div className="font-serif text-3xl text-ink font-bold">{s.n}</div>
              <div className="text-[11.5px] text-ink-mute tracking-widest mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* === Right form panel === */}
      <div className="px-6 sm:px-12 py-10 grid place-items-center">
        <div className="relative w-full max-w-[380px] bg-surface rounded-cozy-lg border border-line p-10 shadow-warm-xl">
          {/* tape decoration */}
          <div
            className="absolute top-[-14px] left-1/2 -translate-x-1/2 bg-accent-soft text-accent px-4 py-1 font-hand font-bold"
            style={{ transform: 'translateX(-50%) rotate(-2deg)', fontSize: 16 }}
          >
            welcome back
          </div>

          <h2 className="font-serif text-2xl font-bold text-ink mt-4 mb-2">登入您的小屋</h2>
          <p className="text-[12.5px] text-ink-soft leading-relaxed mb-7">
            僅限授權手機號碼存取，<br />這扇門只為您而開。
          </p>

          <form onSubmit={handleSubmit}>
            <label className="text-[11.5px] text-ink-soft tracking-wide mb-2 block">手機號碼</label>
            <div className="flex items-center border-[1.5px] border-line rounded-xl px-3 bg-bg transition focus-within:border-accent focus-within:bg-surface">
              <Phone size={16} strokeWidth={1.7} className="text-ink-mute" />
              <input
                type={showPhone ? 'tel' : 'password'}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 border-none bg-transparent px-2.5 py-3 text-sm text-ink outline-none tracking-widest font-medium"
                placeholder="09xx-xxx-xxx"
                autoFocus
                inputMode="numeric"
              />
              <button
                type="button"
                onClick={() => setShowPhone(v => !v)}
                className="text-ink-mute hover:text-accent transition p-1"
                tabIndex={-1}
                aria-label={showPhone ? '隱藏號碼' : '顯示號碼'}
              >
                {showPhone ? <EyeOff size={16} strokeWidth={1.7} /> : <Eye size={16} strokeWidth={1.7} />}
              </button>
            </div>
            <p className="text-[11px] text-ink-mute mt-1.5 ml-1">
              {showPhone ? '號碼已顯示' : '號碼已隱藏 · 點擊眼睛圖示顯示'}
            </p>

            {(error || validationError) && (
              <div className="mt-4 bg-rose-50 border border-rose-100 text-rose-600 px-3.5 py-2.5 rounded-lg text-sm flex items-center gap-2">
                <Lock size={15} />
                {validationError || error}
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-6 py-3.5 bg-ink hover:bg-warm-600 text-white border-none rounded-xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-2 shadow-warm-lg transition active:scale-[0.98]"
            >
              登入驗證 <ArrowRight size={15} strokeWidth={2.2} />
            </button>
          </form>

          <div className="mt-6 p-3.5 bg-bg rounded-xl text-[11.5px] text-ink-mute leading-[1.7] text-center border border-dashed border-line">
            白名單驗證 · 安全溫暖<br />
            <span className="text-ink-soft font-hand text-sm">see you at home ·</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
