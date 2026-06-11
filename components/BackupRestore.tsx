import React, { useRef, useState } from 'react';
import { DatabaseBackup, Download, Upload, AlertTriangle, CheckCircle2, X } from 'lucide-react';

/**
 * 一鍵備份 / 還原
 * 匯出所有本機資料（sl_ 開頭的 localStorage：租客/帳單/濾心/電表/照片/
 * 合約填寫內容與歷史合約…）成單一 JSON 檔；還原時整批寫回並重新載入。
 */

const BACKUP_APP_TAG = '家管小屋';
const BACKUP_VERSION = 1;

const BackupRestore: React.FC = () => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingRestore, setPendingRestore] = useState<{ data: Record<string, string>; exportedAt: string; count: number } | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const handleExport = () => {
    try {
      const data: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sl_')) {
          const v = localStorage.getItem(key);
          if (v !== null) data[key] = v;
        }
      }
      const backup = {
        app: BACKUP_APP_TAG,
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        data,
      };
      const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `家管小屋備份_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setMessage({ tone: 'ok', text: `已匯出 ${Object.keys(data).length} 項資料` });
    } catch {
      setMessage({ tone: 'err', text: '匯出失敗，請重試' });
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 允許重選同一檔案
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed?.app !== BACKUP_APP_TAG || !parsed?.data || typeof parsed.data !== 'object') {
          setMessage({ tone: 'err', text: '這不是家管小屋的備份檔' });
          return;
        }
        setPendingRestore({
          data: parsed.data,
          exportedAt: (parsed.exportedAt || '').slice(0, 19).replace('T', ' '),
          count: Object.keys(parsed.data).length,
        });
      } catch {
        setMessage({ tone: 'err', text: '檔案格式錯誤，無法讀取' });
      }
    };
    reader.readAsText(file);
  };

  const confirmRestore = () => {
    if (!pendingRestore) return;
    try {
      Object.entries(pendingRestore.data).forEach(([k, v]) => {
        if (k.startsWith('sl_')) localStorage.setItem(k, v);
      });
      window.location.reload(); // 重新載入讓所有頁面吃到還原後的資料
    } catch {
      setMessage({ tone: 'err', text: '還原失敗，請重試' });
      setPendingRestore(null);
    }
  };

  return (
    <div className="bg-surface border border-line rounded-cozy p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-warm text-ink-soft grid place-items-center">
            <DatabaseBackup size={20} strokeWidth={1.7} />
          </div>
          <div>
            <div className="font-serif font-bold text-ink text-sm">資料備份</div>
            <p className="text-[11px] text-ink-mute mt-0.5">含租客、帳單、合約填寫內容、歷史合約、照片等全部本機資料</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 text-xs bg-ink hover:bg-black text-white px-4 py-2 rounded-lg font-bold transition shadow-warm-sm whitespace-nowrap"
          >
            <Download size={14} /> 匯出備份
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 text-xs bg-surface border border-line hover:bg-bg text-ink-soft px-4 py-2 rounded-lg font-bold transition shadow-warm-sm whitespace-nowrap"
          >
            <Upload size={14} /> 還原備份
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={handleFileSelected} />
        </div>
      </div>

      {message && (
        <p className={`mt-3 text-xs font-bold flex items-center gap-1.5 ${message.tone === 'ok' ? 'text-leaf' : 'text-rose-500'}`}>
          {message.tone === 'ok' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />} {message.text}
        </p>
      )}

      {/* 還原確認 */}
      {pendingRestore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm">
          <div className="bg-surface rounded-cozy shadow-warm-xl max-w-sm w-full overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-accent-soft flex items-center justify-center mb-4 mx-auto text-accent">
                <AlertTriangle size={24} />
              </div>
              <h3 className="font-serif text-xl font-bold text-ink mb-2">確定還原備份？</h3>
              <p className="text-ink-soft text-sm leading-6">
                備份時間：<b className="text-ink">{pendingRestore.exportedAt}</b>（{pendingRestore.count} 項資料）<br />
                目前裝置上的資料將被<b className="text-rose-600">覆蓋</b>，建議先匯出一份現有備份再還原。
              </p>
            </div>
            <div className="flex border-t border-line">
              <button onClick={() => setPendingRestore(null)} className="flex-1 px-6 py-4 text-ink-soft font-medium hover:bg-bg border-r border-line flex items-center justify-center gap-1">
                <X size={15} /> 取消
              </button>
              <button onClick={confirmRestore} className="flex-1 px-6 py-4 text-accent font-bold hover:bg-accent-soft/30">確認還原</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupRestore;
