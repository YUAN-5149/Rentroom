import { RoomPhoto, RoomId } from '../types';

/**
 * Photo API — 透過 Apps Script Web App 將照片儲存到 Google Drive 資料夾。
 *
 * Apps Script 端對應 actions:
 *   GET  ?action=photo:list             → 列出所有照片
 *   POST { action: 'photo:add', ... }   → 上傳一張（base64）
 *   POST { action: 'photo:updateCaption', id, caption }
 *   POST { action: 'photo:delete', id }
 */
export const PHOTO_API_URL =
  'https://script.google.com/macros/s/AKfycbz6nmB--G2k6PvYPf4hYiDqlvSEWpGeCDYrAtP2fEsRFhzdTMHOVgPChG-KkOh1eq6zOw/exec';

// 用 text/plain 送 JSON 避免 CORS preflight（Apps Script Web App 不支援 OPTIONS）
async function postJson(payload: any) {
  const res = await fetch(PHOTO_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow',
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid response: ${text.slice(0, 200)}`);
  }
}

// File → base64（不含 "data:..,base64," 前綴）
function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
      if (!m) return reject(new Error('Invalid data URL'));
      resolve({ mimeType: m[1], base64: m[2] });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 從雲端載入所有照片
export async function fetchPhotosFromDrive(): Promise<RoomPhoto[] | null> {
  try {
    const res = await fetch(`${PHOTO_API_URL}?action=photo:list`, { method: 'GET' });
    const json = await res.json();
    if (!json.ok) {
      console.warn('[photoApi] list failed:', json.error);
      return null;
    }
    return (json.data as any[]).map(p => ({
      id: p.id,
      roomId: (p.roomId || '1') as RoomId,
      imageData: p.imageData,        // Drive thumbnail URL
      caption: p.caption || '',
      uploadedAt: p.uploadedAt,
      fileName: p.fileName,
    }));
  } catch (err) {
    console.warn('[photoApi] list error:', err);
    return null;
  }
}

// 上傳一張到雲端，回傳完整 RoomPhoto（含雲端 url）
export async function uploadPhotoToDrive(
  file: File,
  roomId: RoomId,
  caption: string = ''
): Promise<RoomPhoto> {
  const { base64, mimeType } = await fileToBase64(file);
  const json = await postJson({
    action: 'photo:add',
    roomId,
    caption,
    fileName: file.name,
    mimeType,
    imageBase64: base64,
  });
  if (!json.ok || !json.photo) throw new Error(json.error || 'upload failed');
  const p = json.photo;
  return {
    id: p.id,
    roomId: (p.roomId || roomId) as RoomId,
    imageData: p.imageData,
    caption: p.caption || '',
    uploadedAt: p.uploadedAt,
    fileName: p.fileName,
  };
}

// 雲端更新照片說明
export async function updatePhotoCaptionOnDrive(id: string, caption: string): Promise<void> {
  const json = await postJson({ action: 'photo:updateCaption', id, caption });
  if (!json.ok) throw new Error(json.error || 'update caption failed');
}

// 雲端刪除照片（移到垃圾桶）
export async function deletePhotoFromDrive(id: string): Promise<void> {
  const json = await postJson({ action: 'photo:delete', id });
  if (!json.ok) throw new Error(json.error || 'delete failed');
}
