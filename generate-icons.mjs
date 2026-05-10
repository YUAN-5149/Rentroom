import { createWriteStream } from 'fs';
import zlib from 'zlib';

function writePNG(filename, size) {
  const width = size;
  const height = size;

  // Color palette
  const BG       = [201, 118,  60]; // #C9763C terracotta
  const ROOF     = [122, 106,  88]; // #7A6A58
  const WALL     = [251, 246, 238]; // #FBF6EE cream
  const DOOR     = [201, 118,  60]; // #C9763C
  const LEAF     = [122, 139,  92]; // #7A8B5C

  // Draw pixel by pixel
  const img = new Uint8Array(width * height * 3);
  const s = size / 512; // scale factor

  function px(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= width || iy < 0 || iy >= height) return;
    const i = (iy * width + ix) * 3;
    return i;
  }

  function fillRect(x1, y1, x2, y2, color, rx = 0) {
    for (let y = Math.floor(y1); y <= Math.ceil(y2); y++) {
      for (let x = Math.floor(x1); x <= Math.ceil(x2); x++) {
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        if (rx > 0) {
          const corners = [
            [x1 + rx, y1 + rx],
            [x2 - rx, y1 + rx],
            [x1 + rx, y2 - rx],
            [x2 - rx, y2 - rx],
          ];
          let inCorner = false;
          for (const [cx, cy] of corners) {
            if (x < cx - rx || x > cx + rx || y < cy - rx || y > cy + rx) continue;
            const dx = x - cx, dy = y - cy;
            if (dx * dx + dy * dy > rx * rx) { inCorner = true; break; }
          }
          if (inCorner) continue;
        }
        const i = (y * width + x) * 3;
        img[i] = color[0]; img[i+1] = color[1]; img[i+2] = color[2];
      }
    }
  }

  function fillCircle(cx, cy, r, color) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= r * r) {
          const i = (y * width + x) * 3;
          img[i] = color[0]; img[i+1] = color[1]; img[i+2] = color[2];
        }
      }
    }
  }

  function fillTriangle(x1, y1, x2, y2, x3, y3, color) {
    const minX = Math.floor(Math.min(x1, x2, x3));
    const maxX = Math.ceil(Math.max(x1, x2, x3));
    const minY = Math.floor(Math.min(y1, y2, y3));
    const maxY = Math.ceil(Math.max(y1, y2, y3));
    function sign(px, py, ax, ay, bx, by) {
      return (px - bx) * (ay - by) - (ax - bx) * (py - by);
    }
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        const d1 = sign(x, y, x1, y1, x2, y2);
        const d2 = sign(x, y, x2, y2, x3, y3);
        const d3 = sign(x, y, x3, y3, x1, y1);
        const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
        const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
        if (!(hasNeg && hasPos)) {
          const i = (y * width + x) * 3;
          img[i] = color[0]; img[i+1] = color[1]; img[i+2] = color[2];
        }
      }
    }
  }

  // Background rounded rect
  fillRect(0, 0, width - 1, height - 1, BG, Math.round(96 * s));

  // House wall
  fillRect(136*s, 240*s, 376*s, 440*s, WALL, 8*s);

  // Roof triangle
  fillTriangle(256*s, 100*s, 100*s, 248*s, 412*s, 248*s, ROOF);

  // Chimney
  fillRect(320*s, 140*s, 356*s, 220*s, ROOF, 4*s);

  // Leaf circles
  fillCircle(380*s, 180*s, 22*s, LEAF);
  fillCircle(356*s, 192*s, 16*s, LEAF);

  // Door
  fillRect(210*s, 330*s, 302*s, 440*s, DOOR, 8*s);

  // Door knob
  fillCircle(286*s, 388*s, 8*s, WALL);

  // Left window
  fillRect(148*s, 270*s, 218*s, 320*s, DOOR, 6*s);
  // Right window
  fillRect(294*s, 270*s, 364*s, 320*s, DOOR, 6*s);

  // Build PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const crc = crc32(Buffer.concat([typeBytes, data]));
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc >>> 0);
    return Buffer.concat([len, typeBytes, data, crcBuf]);
  }

  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    const table = makeCRCTable();
    for (const b of buf) crc = (crc >>> 8) ^ table[(crc ^ b) & 0xFF];
    return crc ^ 0xFFFFFFFF;
  }

  let crcTable = null;
  function makeCRCTable() {
    if (crcTable) return crcTable;
    crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      crcTable[i] = c;
    }
    return crcTable;
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // IDAT: filter byte 0 (None) per row
  const rawRows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 3);
    row[0] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3;
      row[1 + x * 3] = img[i];
      row[2 + x * 3] = img[i + 1];
      row[3 + x * 3] = img[i + 2];
    }
    rawRows.push(row);
  }
  const raw = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(raw, { level: 6 });

  const png = Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);

  const ws = createWriteStream(filename);
  ws.write(png);
  ws.end();
  console.log(`Written: ${filename} (${size}x${size})`);
}

writePNG('public/icon-192.png', 192);
writePNG('public/icon-512.png', 512);
writePNG('public/apple-touch-icon.png', 180);
writePNG('public/favicon-32.png', 32);
