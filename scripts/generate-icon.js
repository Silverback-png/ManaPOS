/**
 * Generates build/icon.png — the ManaPOS app icon (512×512 RGBA PNG).
 *
 * No dependencies: the PNG is encoded by hand (zlib is Node core) and the
 * artwork is rasterized at 4× resolution, then box-downsampled for clean
 * anti-aliased edges. Design: dark rounded square (panel) with an emerald
 * "M" monogram (accent), matching the app's dark theme.
 *
 * Run with plain Node:  node scripts/generate-icon.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 512; // final icon size
const SS = 4; // supersample factor
const W = SIZE * SS; // working canvas: 2048×2048

// ------------------------------------------------------------------ colors
function hex(code) {
  const n = parseInt(code.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}
const PANEL = hex('#14171C');
const ACCENT = hex('#10B981');

// ------------------------------------------------- working buffer (RGBA)
const buf = new Uint8Array(W * W * 4); // starts fully transparent

function fillRect(x, y, w, h, [r, g, b, a]) {
  const x0 = Math.max(0, Math.round(x));
  const y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(W, Math.round(x + w));
  const y1 = Math.min(W, Math.round(y + h));
  for (let yy = y0; yy < y1; yy++) {
    let i = (yy * W + x0) * 4;
    for (let xx = x0; xx < x1; xx++) {
      buf[i] = r;
      buf[i + 1] = g;
      buf[i + 2] = b;
      buf[i + 3] = a;
      i += 4;
    }
  }
}

/** Row-sweep rounded rectangle — inset per row from the circle equation. */
function fillRoundedRect(x, y, w, h, radius, color) {
  for (let row = 0; row < h; row++) {
    let inset = 0;
    if (row < radius) {
      const dy = radius - row - 0.5;
      inset = radius - Math.sqrt(radius * radius - dy * dy);
    } else if (row >= h - radius) {
      const dy = row - (h - radius) + 0.5;
      inset = radius - Math.sqrt(radius * radius - dy * dy);
    }
    fillRect(x + inset, y + row, w - 2 * inset, 1, color);
  }
}

/** Thick line via overlapping squares along the path (smooth after 4× downsample). */
function drawStroke(x0, y0, x1, y1, thickness, color) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (thickness / 8));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    fillRect(
      x0 + (x1 - x0) * t - thickness / 2,
      y0 + (y1 - y0) * t - thickness / 2,
      thickness,
      thickness,
      color
    );
  }
}

// ------------------------------------------------------------- the artwork
// Rounded-square tile: 32px breathing room (512-scale), ~21% corner radius.
const MARGIN = 32 * SS;
const TILE = W - MARGIN * 2;
fillRoundedRect(MARGIN, MARGIN, TILE, TILE, 96 * SS, PANEL);

// "M" monogram (2048-scale coordinates; centered on the tile).
const T = 48 * SS; // stroke thickness
const TOP = 140 * SS;
const BOTTOM = 372 * SS;
const LEFT = 130 * SS;
const RIGHT = 382 * SS;
const MID_X = W / 2;
const MID_Y = 290 * SS; // where the inner V bottoms out

fillRect(LEFT, TOP, T, BOTTOM - TOP, ACCENT); // left stem
fillRect(RIGHT - T, TOP, T, BOTTOM - TOP, ACCENT); // right stem
drawStroke(LEFT + T / 2, TOP, MID_X, MID_Y, T, ACCENT); // left diagonal
drawStroke(RIGHT - T / 2, TOP, MID_X, MID_Y, T, ACCENT); // right diagonal

// ------------------------------------------------- downsample 4× → 512×512
const pixels = Buffer.alloc(SIZE * SIZE * 4);
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    let r = 0,
      g = 0,
      b = 0,
      a = 0;
    for (let dy = 0; dy < SS; dy++) {
      for (let dx = 0; dx < SS; dx++) {
        const i = ((y * SS + dy) * W + (x * SS + dx)) * 4;
        r += buf[i];
        g += buf[i + 1];
        b += buf[i + 2];
        a += buf[i + 3];
      }
    }
    const o = (y * SIZE + x) * 4;
    const n = SS * SS;
    pixels[o] = Math.round(r / n);
    pixels[o + 1] = Math.round(g / n);
    pixels[o + 2] = Math.round(b / n);
    pixels[o + 3] = Math.round(a / n);
  }
}

// ------------------------------------------------------------ PNG encoding
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

// Scanlines with filter byte 0 (None) before each row.
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  const rowStart = y * (SIZE * 4 + 1);
  raw[rowStart] = 0;
  pixels.copy(raw, rowStart + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
// compression (10), filter (11), interlace (12) stay 0

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
]);

const outFile = path.join(__dirname, '..', 'build', 'icon.png');
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, png);
console.log('ICON_OK', outFile, png.length, 'bytes');
