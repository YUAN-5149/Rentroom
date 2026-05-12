import React from 'react';
import { X, Share2, PlusSquare } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const IOSInstallGuide: React.FC<Props> = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3 sm:p-6 bg-warm-600/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface w-full sm:max-w-sm rounded-cozy-lg p-6 shadow-warm-xl border border-line relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 紙膠帶裝飾 */}
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent-soft text-accent px-3 py-0.5 font-hand font-bold text-sm rounded-sm"
          style={{ transform: 'translateX(-50%) rotate(-2deg)' }}
        >
          install on iPhone
        </div>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-ink-mute hover:text-ink p-1"
          aria-label="關閉"
        >
          <X size={18} />
        </button>

        <h3 className="font-serif text-xl font-bold text-ink mt-3 mb-2">把家管小屋加到主畫面</h3>
        <p className="text-xs text-ink-soft mb-5 leading-relaxed">
          iOS 需要使用 Safari 內建的「加入主畫面」功能，依下面三步驟操作：
        </p>

        <ol className="space-y-4">
          <li className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-full bg-accent text-white font-bold text-xs grid place-items-center flex-shrink-0 mt-0.5">1</span>
            <div className="flex-1">
              <div className="text-sm text-ink font-semibold mb-1 flex items-center gap-1.5">
                點底部的<Share2 size={15} className="text-accent" />分享按鈕
              </div>
              <p className="text-[11.5px] text-ink-mute leading-relaxed">
                Safari 視窗下方中間的「向上箭頭」圖示
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-full bg-accent text-white font-bold text-xs grid place-items-center flex-shrink-0 mt-0.5">2</span>
            <div className="flex-1">
              <div className="text-sm text-ink font-semibold mb-1 flex items-center gap-1.5">
                往下捲，選<PlusSquare size={15} className="text-accent" />「加入主畫面」
              </div>
              <p className="text-[11.5px] text-ink-mute leading-relaxed">
                選單可能要往下滾才看得到
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-7 h-7 rounded-full bg-accent text-white font-bold text-xs grid place-items-center flex-shrink-0 mt-0.5">3</span>
            <div className="flex-1">
              <div className="text-sm text-ink font-semibold mb-1">右上角點「加入」</div>
              <p className="text-[11.5px] text-ink-mute leading-relaxed">
                完成！主畫面就會有「家管小屋」icon
              </p>
            </div>
          </li>
        </ol>

        <div className="mt-5 p-3 bg-bg rounded-xl border border-dashed border-line text-center">
          <p className="text-[11.5px] text-ink-mute leading-relaxed">
            <span className="font-hand text-sm text-ink-soft">tip ·</span> 必須用<b className="text-ink"> Safari </b>開啟才能加入主畫面，<br/>Chrome / Edge 等其他瀏覽器不支援
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-4 py-2.5 bg-ink text-white rounded-xl text-sm font-semibold hover:bg-warm-600 transition active:scale-[0.98]"
        >
          知道了
        </button>
      </div>
    </div>
  );
};

export default IOSInstallGuide;
