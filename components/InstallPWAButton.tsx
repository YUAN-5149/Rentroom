import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

/**
 * PWA 安裝提示按鈕
 *  - 監聽 `beforeinstallprompt`，僅當瀏覽器確認此網站可安裝才顯示
 *  - 使用者按「不要再提示」會記住選擇 7 天
 *  - 已安裝 / 已用 standalone 模式開啟時自動隱藏
 */
const DISMISS_KEY = 'sl_pwa_install_dismissed_until';

const isStandalone = () =>
  (typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari
      (window.navigator as any).standalone === true));

const InstallPWAButton: React.FC = () => {
  const [evt, setEvt] = useState<any>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalone()) return; // 已是 PWA 模式

    const dismissUntil = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissUntil && Date.now() < dismissUntil) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e);
      setHidden(false);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installed = () => setHidden(true);
    window.addEventListener('appinstalled', installed);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installed);
    };
  }, []);

  if (hidden || !evt) return null;

  const install = async () => {
    evt.prompt();
    const result = await evt.userChoice;
    if (result.outcome === 'accepted') setHidden(true);
  };

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
        onClick={install}
        className="px-3 py-1 bg-white text-accent rounded-full text-xs font-bold hover:bg-bg active:scale-95 transition"
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
