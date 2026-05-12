import { useEffect, useState } from 'react';

/**
 * usePWAInstall — 集中管理 PWA 安裝狀態與行為
 *
 * 支援：
 *  - Android / 桌機 Chrome / Edge：beforeinstallprompt 原生安裝對話框
 *  - iOS Safari：無 beforeinstallprompt → 由上層 UI 顯示「加入主畫面」教學
 *  - 已安裝（standalone 模式）：自動隱藏
 */

type Outcome = 'accepted' | 'dismissed' | 'unavailable';

const detectStandalone = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as any).standalone === true
  );
};

const detectPlatform = () => {
  if (typeof navigator === 'undefined') return { isIOS: false, isAndroid: false };
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/.test(ua);
  return { isIOS, isAndroid };
};

export function usePWAInstall() {
  const [installEvent, setInstallEvent] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(detectStandalone());
  const { isIOS, isAndroid } = detectPlatform();

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    const onInstalled = () => {
      setInstallEvent(null);
      setIsStandalone(true);
    };
    const mq = window.matchMedia('(display-mode: standalone)');
    const onMq = (e: MediaQueryListEvent) => setIsStandalone(e.matches);

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    mq.addEventListener?.('change', onMq);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      mq.removeEventListener?.('change', onMq);
    };
  }, []);

  const install = async (): Promise<Outcome> => {
    if (!installEvent) return 'unavailable';
    installEvent.prompt();
    const result = await installEvent.userChoice;
    if (result.outcome === 'accepted') setInstallEvent(null);
    return result.outcome;
  };

  return {
    isStandalone,
    isIOS,
    isAndroid,
    canPrompt: !!installEvent,    // Android/Chrome 有原生提示
    needsIOSGuide: isIOS && !isStandalone, // iOS 要走教學流程
    install,
  };
}
