
import React, { useState, useCallback } from 'react';
import { RoomPhoto, RoomId } from '../types';
import {
  Camera, Plus, Trash2, ImageOff, Upload,
  ChevronLeft, ChevronRight, Clock, Home, X, ZoomIn
} from 'lucide-react';

interface RoomConditionProps {
  photos: RoomPhoto[];
  onAddPhotos: (photos: RoomPhoto[]) => void;
  onUpdateCaption: (id: string, caption: string) => void;
  onDeletePhoto: (id: string) => void;
}

const ROOMS: { id: RoomId; label: string; color: string; bg: string }[] = [
  { id: '1', label: '第一間', color: 'text-sky-700',    bg: 'bg-sky-50 border-sky-300'    },
  { id: '2', label: '第二間', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-300' },
  { id: '3', label: '第三間', color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-300'  },
  { id: '4', label: '第四間', color: 'text-rose-700',   bg: 'bg-rose-50 border-rose-300'   },
];

const MAX_FILE_MB = 5;

// Unique IDs for hidden inputs (keyed by room so switching rooms resets selection)
const photoInputId = (room: RoomId) => `room-photo-input-${room}`;
const cameraInputId = (room: RoomId) => `room-camera-input-${room}`;

const RoomCondition: React.FC<RoomConditionProps> = ({
  photos, onAddPhotos, onUpdateCaption, onDeletePhoto
}) => {
  const [selectedRoom, setSelectedRoom] = useState<RoomId>('1');
  const [dragging, setDragging] = useState(false);
  const [lightbox, setLightbox] = useState<RoomPhoto | null>(null);
  const [captions, setCaptions] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  const roomPhotos = photos.filter(p => p.roomId === selectedRoom)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  const currentRoom = ROOMS.find(r => r.id === selectedRoom)!;

  // 讀取圖片為 base64
  const readFile = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (arr.length === 0) return;

    const oversized = arr.filter(f => f.size > MAX_FILE_MB * 1024 * 1024);
    if (oversized.length > 0) {
      alert(`以下檔案超過 ${MAX_FILE_MB}MB 限制：\n${oversized.map(f => f.name).join('\n')}`);
      return;
    }

    setUploading(true);
    try {
      const newPhotos: RoomPhoto[] = await Promise.all(
        arr.map(async (file) => ({
          id: `rp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          roomId: selectedRoom,
          imageData: await readFile(file),
          caption: '',
          uploadedAt: new Date().toISOString(),
          fileName: file.name,
        }))
      );
      onAddPhotos(newPhotos);
    } finally {
      setUploading(false);
    }
  }, [selectedRoom, onAddPhotos]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = ''; // reset so same file can be re-selected
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleCaptionBlur = (id: string) => {
    const val = captions[id];
    if (val !== undefined) {
      onUpdateCaption(id, val);
    }
  };

  const getCaption = (photo: RoomPhoto) =>
    captions[photo.id] !== undefined ? captions[photo.id] : photo.caption;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  const goLightbox = (dir: 'prev' | 'next') => {
    if (!lightbox) return;
    const idx = roomPhotos.findIndex(p => p.id === lightbox.id);
    const next = dir === 'prev' ? idx - 1 : idx + 1;
    if (next >= 0 && next < roomPhotos.length) setLightbox(roomPhotos[next]);
  };

  return (
    <div className="space-y-6">

      {/* Hidden file inputs — label-based trigger works on iOS/Android/desktop */}
      <input
        id={photoInputId(selectedRoom)}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />
      {/* Camera-capture input: opens camera directly on mobile */}
      <input
        id={cameraInputId(selectedRoom)}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInput}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-stone-200 gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-2.5 rounded-lg text-indigo-600">
            <Camera size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-800 tracking-tight">套房原狀紀錄</h2>
            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Room Condition Photos</p>
          </div>
        </div>

        {/* 上傳中狀態指示（取代原本的兩個按鈕）*/}
        {uploading && (
          <div className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-lg">
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            上傳中...
          </div>
        )}
      </div>

      {/* Room Tabs */}
      <div className="grid grid-cols-4 gap-2">
        {ROOMS.map(room => {
          const count = photos.filter(p => p.roomId === room.id).length;
          const active = room.id === selectedRoom;
          return (
            <button
              key={room.id}
              onClick={() => setSelectedRoom(room.id)}
              className={`relative flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all font-bold text-sm shadow-sm
                ${active
                  ? `${room.bg} ${room.color} shadow-md scale-[1.03]`
                  : 'bg-white border-stone-200 text-stone-500 hover:border-stone-300 hover:bg-stone-50'
                }`}
            >
              {/* 房號圓徽 — 直接顯示 1/2/3/4，視覺上一眼對應「第N間」 */}
              <div className={`relative w-9 h-9 rounded-full flex items-center justify-center font-black text-base border-2 transition
                ${active
                  ? `bg-white ${room.color} ${room.bg.split(' ')[1]} shadow`
                  : 'bg-stone-100 text-stone-400 border-stone-200'}`}>
                {room.id}
              </div>
              <span className="mt-1.5 text-xs font-bold flex items-center gap-1">
                <Home size={11} className={active ? room.color : 'text-stone-400'} />
                {room.label}
              </span>
              {/* 照片張數徽章 — 加「張」字明確表示是計數，不是房號 */}
              {count > 0 && (
                <span className={`absolute -top-1.5 -right-1.5 min-w-[24px] h-5 px-1.5 rounded-full text-[10px] font-black flex items-center justify-center shadow gap-0.5
                  ${active ? 'bg-indigo-600 text-white' : 'bg-stone-600 text-white'}`}>
                  {count}<span className="text-[8px] opacity-80">張</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Drop Zone + Photo Grid */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`rounded-xl transition-all ${dragging ? 'ring-4 ring-indigo-400 ring-offset-2 bg-indigo-50/40' : ''}`}
      >
        {roomPhotos.length === 0 ? (
          /* Empty State — entire area is a label for reliable tap-to-open on mobile */
          <label
            htmlFor={photoInputId(selectedRoom)}
            className="flex flex-col items-center justify-center gap-4 p-12 rounded-xl border-2 border-dashed border-stone-300 bg-white cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group"
          >
            <div className={`p-5 rounded-full ${currentRoom.bg} transition-transform group-hover:scale-110`}>
              <ImageOff size={36} className={currentRoom.color} />
            </div>
            <div className="text-center">
              <p className="font-bold text-stone-600">{currentRoom.label}尚無照片紀錄</p>
              <p className="text-sm text-stone-400 mt-1">點擊或拖曳照片至此上傳</p>
              <p className="text-xs text-stone-300 mt-1">支援 JPG、PNG、HEIC · 每張最大 {MAX_FILE_MB}MB</p>
            </div>
            <span className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${currentRoom.bg} ${currentRoom.color} border ${currentRoom.bg.replace('bg-','border-').replace('-50','-300')}`}>
              <Plus size={16} /> 新增照片
            </span>
          </label>
        ) : (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className={`flex items-center justify-between px-4 py-2.5 rounded-lg border ${currentRoom.bg}`}>
              <span className={`text-sm font-bold ${currentRoom.color}`}>
                {currentRoom.label} · 共 {roomPhotos.length} 張照片
              </span>
              <label
                htmlFor={photoInputId(selectedRoom)}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border bg-white/80 hover:bg-white transition cursor-pointer select-none ${currentRoom.color}`}
              >
                <Plus size={13} /> 繼續新增
              </label>
            </div>

            {/* Photo Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {roomPhotos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-shadow"
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
                    <img
                      src={photo.imageData}
                      alt={photo.caption || photo.fileName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-zoom-in"
                      onClick={() => setLightbox(photo)}
                    />
                    {/* Overlay buttons */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-start justify-between p-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => setLightbox(photo)}
                        className="p-1.5 bg-white/90 rounded-full shadow text-stone-700 hover:text-indigo-600 transition"
                        title="放大檢視"
                      >
                        <ZoomIn size={15} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`確定刪除「${photo.fileName}」？此操作無法復原。`)) {
                            onDeletePhoto(photo.id);
                            setCaptions(prev => { const c = {...prev}; delete c[photo.id]; return c; });
                          }
                        }}
                        className="p-1.5 bg-white/90 rounded-full shadow text-stone-400 hover:text-rose-600 transition"
                        title="刪除照片"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    {/* Index badge */}
                    <div className={`absolute bottom-2 left-2 text-[10px] font-black px-1.5 py-0.5 rounded-full ${currentRoom.bg} ${currentRoom.color} shadow-sm border`}>
                      #{index + 1}
                    </div>
                  </div>

                  {/* Info + Caption */}
                  <div className="p-3 flex flex-col gap-2 flex-1">
                    {/* Timestamp & filename */}
                    <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-medium">
                      <Clock size={10} />
                      <span>{formatDate(photo.uploadedAt)}</span>
                      <span className="text-stone-200">·</span>
                      <span className="truncate max-w-[120px]" title={photo.fileName}>{photo.fileName}</span>
                    </div>

                    {/* Caption textarea */}
                    <textarea
                      value={getCaption(photo)}
                      onChange={(e) => setCaptions(prev => ({ ...prev, [photo.id]: e.target.value }))}
                      onBlur={() => handleCaptionBlur(photo.id)}
                      placeholder="點擊輸入照片說明..."
                      rows={3}
                      className={`w-full text-xs text-stone-700 border border-stone-200 rounded-lg p-2.5 resize-none
                        focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400
                        placeholder:text-stone-300 transition-all bg-stone-50 hover:bg-white leading-relaxed`}
                    />

                    {/* Save indicator */}
                    {captions[photo.id] !== undefined && captions[photo.id] !== photo.caption && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => { onUpdateCaption(photo.id, captions[photo.id]); }}
                          className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-full transition"
                        >
                          儲存說明 ✓
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Add more card — label for reliable tap-to-open */}
              <label
                htmlFor={photoInputId(selectedRoom)}
                className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-stone-200 bg-stone-50 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all min-h-[200px] group"
              >
                <div className={`p-3 rounded-full ${currentRoom.bg} group-hover:scale-110 transition-transform`}>
                  <Plus size={22} className={currentRoom.color} />
                </div>
                <p className="text-xs font-bold text-stone-400 group-hover:text-indigo-600 transition">新增更多照片</p>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onClick={() => setLightbox(null)}
        >
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 text-white" onClick={e => e.stopPropagation()}>
            <div className="text-sm font-bold text-stone-300 truncate max-w-[60%]">{lightbox.fileName}</div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-stone-400">
                {roomPhotos.findIndex(p => p.id === lightbox.id) + 1} / {roomPhotos.length}
              </span>
              <button onClick={() => setLightbox(null)} className="p-1.5 text-stone-400 hover:text-white transition">
                <X size={22} />
              </button>
            </div>
          </div>

          {/* Image */}
          <div className="flex-1 flex items-center justify-center px-4 relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => goLightbox('prev')}
              disabled={roomPhotos.findIndex(p => p.id === lightbox.id) === 0}
              className="absolute left-2 sm:left-4 p-2 bg-white/10 hover:bg-white/25 disabled:opacity-20 rounded-full text-white transition"
            >
              <ChevronLeft size={28} />
            </button>

            <img
              src={lightbox.imageData}
              alt={lightbox.caption || lightbox.fileName}
              className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-2xl"
            />

            <button
              onClick={() => goLightbox('next')}
              disabled={roomPhotos.findIndex(p => p.id === lightbox.id) === roomPhotos.length - 1}
              className="absolute right-2 sm:right-4 p-2 bg-white/10 hover:bg-white/25 disabled:opacity-20 rounded-full text-white transition"
            >
              <ChevronRight size={28} />
            </button>
          </div>

          {/* Caption */}
          <div className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}>
            {lightbox.caption ? (
              <p className="text-stone-300 text-sm">{lightbox.caption}</p>
            ) : (
              <p className="text-stone-600 text-xs italic">（無照片說明）</p>
            )}
            <p className="text-stone-600 text-[10px] mt-1 flex items-center justify-center gap-1">
              <Clock size={10} /> {formatDate(lightbox.uploadedAt)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomCondition;
