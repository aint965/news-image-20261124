// THE WORLD TODAY — a newspaper front page summing up Tuesday 24 November 2026.
// Draws the whole image programmatically (no assets, no network) and writes a
// deterministic PNG to $MAKEFUN_OUTPUT_DIR/entry.png (default /output).
// Node 22, standard library only.

import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette ---
const PAPER: RGB = [248, 244, 232];
const PANEL: RGB = [255, 253, 246];
const INK: RGB = [20, 20, 20];
const NAVY: RGB = [27, 42, 74];
const RED: RGB = [179, 38, 30];
const GREY: RGB = [90, 90, 90];
const SKY: RGB = [156, 195, 229];
const SEA: RGB = [96, 139, 178];
const GREEN: RGB = [74, 140, 82];
const DARKGREEN: RGB = [46, 100, 56];
const GOLD: RGB = [212, 160, 32];
const ORANGE: RGB = [232, 116, 24];
const WHITE: RGB = [255, 255, 255];
const PIC_BG: RGB = [234, 241, 248];
const STEEL: RGB = [110, 122, 138];
const DARKRED: RGB = [140, 40, 32];

type RGB = [number, number, number];

// ---------------------------------------------------------------- canvas ---
const px = new Uint8Array(W * H * 3);
function fill(r: number, g: number, b: number): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = r;
    px[i * 3 + 1] = g;
    px[i * 3 + 2] = b;
  }
}
function setPix(x: number, y: number, c: RGB): void {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= W || yi >= H) return;
  const i = (yi * W + xi) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}
function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  const x0 = Math.max(0, Math.round(x));
  const y0 = Math.max(0, Math.round(y));
  const x1 = Math.min(W, Math.round(x + w));
  const y1 = Math.min(H, Math.round(y + h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * W + xx) * 3;
      px[i] = c[0];
      px[i + 1] = c[1];
      px[i + 2] = c[2];
    }
  }
}
function strokeRect(x: number, y: number, w: number, h: number, c: RGB, t: number): void {
  fillRect(x, y, w, t, c);
  fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c);
  fillRect(x + w - t, y, t, h, c);
}
function hline(x: number, y: number, w: number, c: RGB, t = 1): void {
  fillRect(x, y, w, t, c);
}
function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  const ri = Math.round(r);
  for (let dy = -ri; dy <= ri; dy++) {
    const dx = Math.floor(Math.sqrt(Math.max(0, ri * ri - dy * dy)));
    fillRect(cx - dx, cy + dy, dx * 2 + 1, 1, c);
  }
}
function ring(cx: number, cy: number, r: number, t: number, c: RGB): void {
  fillCircle(cx, cy, r, c);
  // punch the middle back out is caller-dependent; here we draw ring by
  // overdrawing with the background colour is wrong in general, so instead
  // draw the ring as concentric 1px circles.
  for (let k = 1; k < t; k++) fillCircle(cx, cy, r - k, c);
}
function drawLine(x0: number, y0: number, x1: number, y1: number, c: RGB, thick = 1): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  const rad = Math.max(1, Math.floor(thick / 2));
  for (let s = 0; s <= steps; s++) {
    fillCircle(x0 + (dx * s) / steps, y0 + (dy * s) / steps, rad, c);
  }
}
function ellipseArc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, c: RGB, thick = 1): void {
  const rad = Math.max(1, Math.floor(thick / 2));
  for (let a = a0; a <= a1; a += 1) {
    const t = (a * Math.PI) / 180;
    fillCircle(cx + rx * Math.cos(t), cy + ry * Math.sin(t), rad, c);
  }
}
function ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB, thick = 1): void {
  ellipseArc(cx, cy, rx, ry, 0, 360, c, thick);
}
function fillEllipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  const rxi = Math.round(rx);
  const ryi = Math.round(ry);
  for (let dy = -ryi; dy <= ryi; dy++) {
    const dx = Math.floor(rxi * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ryi * ryi))));
    fillRect(cx - dx, cy + dy, dx * 2 + 1, 1, c);
  }
}
function fillPentagon(cx: number, cy: number, r: number, rot: number, c: RGB): void {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < 5; i++) {
    const a = rot + (i * 2 * Math.PI) / 5;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  fillPolygon(pts, c);
}
function fillPolygon(points: Array<[number, number]>, c: RGB): void {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of points) {
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  for (let y = Math.ceil(minY); y <= Math.floor(maxY); y++) {
    const xs: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
        xs.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      fillRect(Math.ceil(xs[k]), y, Math.floor(xs[k + 1]) - Math.ceil(xs[k]) + 1, 1, c);
    }
  }
}

// ------------------------------------------------------------- bitmap font --
// 5x7 glyphs, one string per row, "1" = ink. Uppercase + digits + punctuation.
const GLYPHS: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "+": ["00000", "00100", "00100", "01110", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "*": ["00000", "00100", "10101", "01110", "10101", "00100", "00000"],
};

function textWidth(text: string, scale: number): number {
  const t = text.toUpperCase();
  if (t.length === 0) return 0;
  return t.length * 6 * scale - scale;
}
function drawText(x: number, y: number, text: string, scale: number, c: RGB): void {
  const t = text.toUpperCase();
  let cx = x;
  for (const ch of t) {
    const g = GLYPHS[ch] ?? GLYPHS["?"];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (g[row][col] === "1") {
          fillRect(cx + col * scale, y + row * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}
function drawTextCentered(cx: number, y: number, text: string, scale: number, c: RGB): void {
  drawText(cx - Math.floor(textWidth(text, scale) / 2), y, text, scale, c);
}
function wrap(text: string, scale: number, maxW: number): string[] {
  const words = text.toUpperCase().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const cand = cur === "" ? w : cur + " " + w;
    if (textWidth(cand, scale) <= maxW || cur === "") {
      cur = cand;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}
function drawWrapped(x: number, y: number, text: string, scale: number, c: RGB, maxW: number, lineH: number): number {
  const lines = wrap(text, scale, maxW);
  lines.forEach((ln, i) => drawText(x, y + i * lineH, ln, scale, c));
  return y + lines.length * lineH;
}

// --------------------------------------------------------------- pictograms --
function picWarship(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, PIC_BG);
  // sky + sea
  fillRect(x, y + h * 0.68, w, h * 0.32, SEA);
  // flame + smoke at the stern (explosion and fire at the port)
  fillPolygon(
    [
      [x + w * 0.1, y + h * 0.55],
      [x + w * 0.16, y + h * 0.3],
      [x + w * 0.22, y + h * 0.55],
    ],
    ORANGE,
  );
  fillPolygon(
    [
      [x + w * 0.13, y + h * 0.55],
      [x + w * 0.16, y + h * 0.42],
      [x + w * 0.19, y + h * 0.55],
    ],
    GOLD,
  );
  fillCircle(x + w * 0.16, y + h * 0.24, h * 0.07, STEEL);
  fillCircle(x + w * 0.2, y + h * 0.16, h * 0.05, GREY);
  // hull
  fillPolygon(
    [
      [x + w * 0.06, y + h * 0.52],
      [x + w * 0.94, y + h * 0.52],
      [x + w * 0.84, y + h * 0.7],
      [x + w * 0.16, y + h * 0.7],
    ],
    NAVY,
  );
  // deck, bridge, funnel, mast
  fillRect(x + w * 0.3, y + h * 0.38, w * 0.36, h * 0.14, STEEL);
  fillRect(x + w * 0.42, y + h * 0.26, w * 0.13, h * 0.12, INK);
  fillRect(x + w * 0.64, y + h * 0.3, w * 0.07, h * 0.22, DARKRED);
  drawLine(x + w * 0.485, y + h * 0.26, x + w * 0.485, y + h * 0.08, INK, 3);
  fillPolygon(
    [
      [x + w * 0.485, y + h * 0.08],
      [x + w * 0.6, y + h * 0.13],
      [x + w * 0.485, y + h * 0.18],
    ],
    RED,
  );
  // gun at the bow
  fillRect(x + w * 0.78, y + h * 0.44, w * 0.1, h * 0.08, INK);
  // portholes
  for (const fx of [0.3, 0.45, 0.6, 0.75]) {
    fillCircle(x + w * fx, y + h * 0.6, Math.max(2, h * 0.025), WHITE);
  }
  // waves
  for (const [wx, wy] of [
    [0.12, 0.78],
    [0.45, 0.84],
    [0.72, 0.78],
  ] as const) {
    fillRect(x + w * wx, y + h * wy, w * 0.14, Math.max(2, h * 0.03), WHITE);
  }
  strokeRect(x, y, w, h, INK, 2);
}
function picGlobe(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, PIC_BG);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const r = Math.min(w, h) / 2 - 4;
  // orbit ring behind the disc, using the wide box so the globe reads big
  ellipse(cx, cy, r + 24, (r + 24) * 0.28, NAVY, 2);
  fillCircle(cx, cy, r, NAVY);
  fillCircle(cx, cy, r - 3, SKY);
  // curved meridians: full ellipses, narrow to wide, plus the centre line
  for (const f of [0.35, 0.7]) {
    ellipse(cx, cy, r * f, r - 3, NAVY, 2);
  }
  drawLine(cx, cy - r + 3, cx, cy + r - 3, NAVY, 2);
  // curved parallels: arcs bulging toward the equator
  ellipseArc(cx, cy - r * 0.5, r * 0.86, r * 0.16, 0, 180, NAVY, 2);
  ellipseArc(cx, cy + r * 0.5, r * 0.86, r * 0.16, 180, 360, NAVY, 2);
  // continents as irregular polygons (never circles, so nothing reads as a molecule)
  const P = (fx: number, fy: number): [number, number] => [cx + r * fx, cy + r * fy];
  fillPolygon([P(-0.62, -0.42), P(-0.2, -0.58), P(-0.02, -0.28), P(-0.38, -0.08), P(-0.66, -0.18)], GREEN);
  fillPolygon([P(0.12, -0.52), P(0.52, -0.44), P(0.58, -0.12), P(0.3, -0.02), P(0.08, -0.28)], GREEN);
  fillPolygon([P(-0.42, 0.18), P(-0.14, 0.22), P(-0.2, 0.58), P(-0.48, 0.52)], GREEN);
  fillPolygon([P(0.34, 0.34), P(0.62, 0.34), P(0.56, 0.56), P(0.34, 0.56)], GREEN);
  // outline ring
  for (let k = 0; k < 3; k++) {
    const rr = r - k;
    for (let a = 0; a < 360; a += 2) {
      const rad = (a * Math.PI) / 180;
      setPix(cx + rr * Math.cos(rad), cy + rr * Math.sin(rad), NAVY);
    }
  }
  strokeRect(x, y, w, h, INK, 2);
}
function picTanker(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, PIC_BG);
  fillRect(x, y + h * 0.7, w, h * 0.3, SEA);
  // deck tanks
  for (const fx of [0.2, 0.38, 0.56]) {
    fillRect(x + w * fx, y + h * 0.42, w * 0.13, h * 0.26, WHITE);
    fillCircle(x + w * (fx + 0.065), y + h * 0.42, w * 0.065, WHITE);
    strokeRect(x + w * fx, y + h * 0.42, w * 0.13, h * 0.26, INK, 2);
  }
  // hull
  fillPolygon(
    [
      [x + w * 0.05, y + h * 0.6],
      [x + w * 0.95, y + h * 0.6],
      [x + w * 0.88, y + h * 0.74],
      [x + w * 0.12, y + h * 0.74],
    ],
    DARKRED,
  );
  // bridge tower at the stern
  fillRect(x + w * 0.8, y + h * 0.3, w * 0.12, h * 0.3, WHITE);
  fillRect(x + w * 0.8, y + h * 0.3, w * 0.12, h * 0.08, NAVY);
  drawLine(x + w * 0.86, y + h * 0.3, x + w * 0.86, y + h * 0.16, INK, 3);
  fillCircle(x + w * 0.86, y + h * 0.13, h * 0.04, ORANGE);
  // waves
  for (const [wx, wy] of [
    [0.1, 0.82],
    [0.42, 0.88],
    [0.7, 0.82],
  ] as const) {
    fillRect(x + w * wx, y + h * wy, w * 0.13, Math.max(2, h * 0.03), WHITE);
  }
  strokeRect(x, y, w, h, INK, 2);
}
function picChip(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, PIC_BG);
  const s = Math.min(w, h) * 0.52;
  const cx = x + w / 2;
  const cy = y + h / 2;
  // pins
  for (let i = 0; i < 5; i++) {
    const t = -s / 2 + (i * s) / 4;
    fillRect(cx + t - 2, cy - s / 2 - 9, 4, 9, GOLD);
    fillRect(cx + t - 2, cy + s / 2, 4, 9, GOLD);
    fillRect(cx - s / 2 - 9, cy + t - 2, 9, 4, GOLD);
    fillRect(cx + s / 2, cy + t - 2, 9, 4, GOLD);
  }
  // body + die
  fillRect(cx - s / 2, cy - s / 2, s, s, INK);
  fillRect(cx - s * 0.3, cy - s * 0.3, s * 0.6, s * 0.6, NAVY);
  drawTextCentered(cx, cy - 7, "AI", 2, WHITE);
  strokeRect(x, y, w, h, INK, 2);
}
function picBallot(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, PIC_BG);
  const cx = x + w / 2;
  // ballot paper rising from the slot, with a red tick
  fillRect(cx - w * 0.09, y + h * 0.06, w * 0.18, h * 0.36, WHITE);
  strokeRect(cx - w * 0.09, y + h * 0.06, w * 0.18, h * 0.36, INK, 2);
  drawLine(cx - w * 0.06, y + h * 0.26, cx - w * 0.01, y + h * 0.34, RED, 5);
  drawLine(cx - w * 0.01, y + h * 0.34, cx + w * 0.07, y + h * 0.14, RED, 5);
  // box
  fillRect(cx - w * 0.3, y + h * 0.44, w * 0.6, h * 0.44, NAVY);
  fillRect(cx - w * 0.34, y + h * 0.38, w * 0.68, h * 0.08, RED);
  fillRect(cx - w * 0.12, y + h * 0.38, w * 0.24, h * 0.03, INK);
  drawTextCentered(cx, y + h * 0.6, "VOTE", 2, WHITE);
  strokeRect(x, y, w, h, INK, 2);
}
function picFootball(x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, PIC_BG);
  const cx = x + w / 2;
  const cy = y + h / 2 - 4;
  const r = Math.min(w, h) / 2 - 5;
  // grass strip at the bottom, with the ball's shadow on it
  fillRect(x, y + h - 14, w, 14, GREEN);
  fillEllipse(cx, cy + r + 1, r * 0.8, 5, DARKGREEN);
  fillCircle(cx, cy, r, INK);
  fillCircle(cx, cy, r - 3, WHITE);
  // centre pentagon
  fillPentagon(cx, cy, r * 0.28, -Math.PI / 2, INK);
  // five outer pentagons (never circles), each joined to the centre by a short seam
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const ox = cx + r * 0.66 * Math.cos(a);
    const oy = cy + r * 0.66 * Math.sin(a);
    fillPentagon(ox, oy, r * 0.22, a + Math.PI, INK);
    const vx = cx + r * 0.28 * Math.cos(a);
    const vy = cy + r * 0.28 * Math.sin(a);
    const ix = ox + r * 0.22 * Math.cos(a + Math.PI);
    const iy = oy + r * 0.22 * Math.sin(a + Math.PI);
    drawLine(vx, vy, ix, iy, INK, 3);
  }
  strokeRect(x, y, w, h, INK, 2);
}

// ------------------------------------------------------------------ layout --
interface Story {
  kicker: string;
  headline: string;
  deck: string;
  pic: (x: number, y: number, w: number, h: number) => void;
}

function drawStoryCell(cx: number, cy: number, cw: number, ch: number, s: Story, picH: number): void {
  fillRect(cx, cy, cw, ch, PANEL);
  strokeRect(cx, cy, cw, ch, INK, 2);
  drawText(cx + 14, cy + 12, s.kicker, 2, RED);
  hline(cx + 14, cy + 32, cw - 28, INK, 1);
  s.pic(cx + 14, cy + 40, cw - 28, picH);
  const hy = drawWrapped(cx + 14, cy + 48 + picH, s.headline, 3, INK, cw - 28, 24);
  drawWrapped(cx + 14, hy + 6, s.deck, 3, GREY, cw - 28, 22);
}

function draw(): void {
  fill(PAPER[0], PAPER[1], PAPER[2]);
  strokeRect(8, 8, W - 16, H - 16, INK, 3);

  // ---- masthead ----
  drawTextCentered(W / 2, 30, "THE WORLD TODAY", 8, INK);
  hline(24, 98, W - 48, INK, 2);
  // ---- date band ----
  fillRect(24, 106, W - 48, 48, NAVY);
  drawTextCentered(W / 2, 116, "TUESDAY, 24 NOVEMBER 2026", 4, WHITE);
  drawTextCentered(W / 2, 164, "SIX STORIES FROM AROUND THE WORLD", 2, GREY);
  hline(24, 186, W - 48, INK, 2);

  // ---- lead story ----
  const leadY = 196;
  const leadH = 236;
  fillRect(24, leadY, W - 48, leadH, PANEL);
  strokeRect(24, leadY, W - 48, leadH, INK, 2);
  drawText(48, leadY + 14, "LEAD STORY - UKRAINE", 2, RED);
  drawWrapped(48, leadY + 36, "UKRAINE SAYS IT SANK RUSSIAN WARSHIP OFF LIBYA", 5, INK, 928, 40);
  drawWrapped(
    48,
    leadY + 122,
    "KYIV SAYS ITS FORCES SANK THE RUSSIAN CORVETTE MERKURY AFTER A BLAST AT BENGHAZI PORT.",
    3,
    INK,
    560,
    24,
  );
  picWarship(640, leadY + 116, 336, 88);
  hline(48, leadY + 210, 928, INK, 1);
  drawTextCentered(W / 2, leadY + 220, "BENGHAZI, LIBYA - 24 NOVEMBER 2026", 2, GREY);

  // ---- grid: 3 across, then 2 across ----
  const row1Y = 444;
  const rowH = 276;
  const row2Y = 732;
  const row2H = 252;
  const stories: Story[] = [
    {
      kicker: "CLIMATE",
      headline: "COP31 ENDS WITH NO DEAL",
      deck: "NO DEAL. TALKS MAY RESUME NEXT YEAR.",
      pic: picGlobe,
    },
    {
      kicker: "MIDDLE EAST",
      headline: "IRAN VOWS TO COUNTER US HORMUZ BLOCKADE",
      deck: "TRUMP VOWED TO SINK IRAN SHIPS.",
      pic: picTanker,
    },
    {
      kicker: "TECHNOLOGY",
      headline: "NVIDIA REINSTATES HUANG AS CHIEF",
      deck: "UNANIMOUS, TRUMP STEPPED IN.",
      pic: picChip,
    },
    {
      kicker: "POLITICS",
      headline: "DEMOCRATS TAKE HISTORIC 258-SEAT HOUSE MAJORITY",
      deck: "A RECORD DEMOCRATIC HOUSE MAJORITY.",
      pic: picBallot,
    },
    {
      kicker: "SPORT",
      headline: "UK TO HOST 2035 WOMEN'S WORLD CUP",
      deck: "UK TO HOST THE 2035 WOMEN'S WORLD CUP.",
      pic: picFootball,
    },
  ];
  const xs3 = [24, 353, 682];
  for (let i = 0; i < 3; i++) {
    drawStoryCell(xs3[i], row1Y, 317, rowH, stories[i], 80);
  }
  drawStoryCell(24, row2Y, 482, row2H, stories[3], 96);
  drawStoryCell(518, row2Y, 482, row2H, stories[4], 96);

  // ---- footer ----
  drawTextCentered(W / 2, 994, "THE WORLD TODAY - TUESDAY, 24 NOVEMBER 2026 - SIX STORIES", 2, GREY);
}

// --------------------------------------------------------------------- PNG --
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  const crc = crc32(Buffer.concat([Buffer.from(type, "ascii"), data]));
  out.writeUInt32BE(crc, 8 + data.length);
  return out;
}
function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// -------------------------------------------------------------------- main --
function main(): void {
  draw();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/entry.png`, encodePNG());
}
main();
