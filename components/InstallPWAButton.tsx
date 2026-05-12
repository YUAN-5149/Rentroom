import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

/**
 * 浮動安裝提示（登入後顯示）
 *  - 共用 usePWAInstall hook
 *  - 僅在 Android/Chrome 有原生 prompt 時自動出現
 *  - 使用者按「不要再提示」會記住選擇 7 天
 *  - 已 standalone 自動隱藏
 *  - iOS 不在此顯示（登入頁的「安裝到主畫面」按鈕已涵蓋）
 */

const DISMISS_KEY = 'sl_pwa_install_dismissed_until';

const InstallPWAButton: React.FC = () => {
  const pwa = usePWAInstall();
  const [hidden, setHidden] = useState(() => {
    const dismissUntil = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return !!dismissUntil && Date.now() < dismissUntil;
  });

  if (pwa.isStandalone || hidden || !pwa.canPrompt) return null;

  const dismiss = () => {
    const week = 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(Date.now() + week));
    setHidden(true);
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-full shadow-warm-lg max-w-[90vw]">
      <Download size={16} strokeWidth={1.8} className="flex-shrink-0" />
      <span className="text-[13px] font-semibold flex-1">把家管小屋加到主畫面</span>
      <button
        onClick={() => pwa.install()}
        className="px-3 py-1 bg-surface text-accent rounded-full text-xs font-bold hover:bg-bg active:scale-95 transition"
      >
        安裝
      </button>
      <button
        onClick={dismiss}
        className="p-1 text-white/80 hover:text-white"
        aria-label="不要再提示"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default InstallPWAButton;
