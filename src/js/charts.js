/*
 * charts.js - VE BIEU DO (canvas + DOM heatmap)
 * ---------------------------------------------
 * - drawBarChart(canvas, data): cot XP/quest 7 ngay, co animate mo mang.
 * - renderHeatmap(container, days): o heatmap kieu GitHub 12 tuan.
 * - Doc mau tu CSS variables -> tu dong hop theme.
 * - Ton trong reduced-motion (bo qua animate).
 */

import { store } from './store.js';

/** Lay gia tri CSS var hien tai. */
function cssVar(name, fallback = '') {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Chuan hoa canvas theo devicePixelRatio. */
function setupCanvas(canvas, cssW, cssH) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(cssW * dpr));
  canvas.height = Math.max(1, Math.floor(cssH * dpr));
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Veu bieu do cot.
 * @param {HTMLCanvasElement} canvas
 * @param {Array<{label:string, value:number, sub?:string}>} data
 * @param {object} opts { height, color, max }
 */
export function drawBarChart(canvas, data, opts = {}) {
  const height = opts.height || 220;
  const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 600;
  const ctx = setupCanvas(canvas, width, height);
  const accent = cssVar('--accent', '#7c5cff');
  const accent2 = cssVar('--accent-2', '#22d3ee');
  const muted = cssVar('--muted', '#8f8dab');
  const grid = cssVar('--border', 'rgba(255,255,255,0.08)');
  const text = cssVar('--text', '#f4f3fb');

  const padL = 8;
  const padR = 8;
  const padT = 22;
  const padB = 26;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const max = opts.max || Math.max(1, ...data.map((d) => d.value));
  const n = data.length || 1;
  const slot = plotW / n;
  const barW = Math.min(46, slot * 0.56);
  const reduced = store.state.settings.reducedMotion;

  const draw = (progress) => {
    ctx.clearRect(0, 0, width, height);
    // duong luoi ngang
    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const y = padT + (plotH * g) / 4;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(width - padR, y);
      ctx.stroke();
    }
    data.forEach((d, i) => {
      const cx = padL + slot * i + slot / 2;
      const full = (d.value / max) * plotH;
      const h = Math.max(d.value > 0 ? 3 : 0, full * progress);
      const y = padT + plotH - h;
      const grad = ctx.createLinearGradient(0, y, 0, padT + plotH);
      grad.addColorStop(0, accent2);
      grad.addColorStop(1, accent);
      ctx.fillStyle = d.value > 0 ? grad : grid;
      roundRect(ctx, cx - barW / 2, y, barW, h, 8);
      ctx.fill();
      // gia tri tren dinh
      if (d.value > 0 && progress > 0.6) {
        ctx.fillStyle = text;
        ctx.font = '600 12px ' + cssVar('--font-sans', 'system-ui');
        ctx.textAlign = 'center';
        ctx.fillText(String(d.value), cx, y - 6);
      }
      // nhan duoi
      ctx.fillStyle = muted;
      ctx.font = '500 11px ' + cssVar('--font-sans', 'system-ui');
      ctx.textAlign = 'center';
      ctx.fillText(d.label, cx, height - 8);
    });
  };

  if (reduced) {
    draw(1);
    return;
  }
  const start = performance.now();
  const dur = 650;
  const step = (t) => {
    const p = Math.min(1, (t - start) / dur);
    draw(1 - Math.pow(1 - p, 3)); // easeOut
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Map gia tri -> mau o heatmap (5 muc). */
function heatColor(value, max) {
  const base = cssVar('--accent', '#7c5cff');
  if (!value) return cssVar('--surface-2', 'rgba(255,255,255,0.06)');
  const ratio = max ? Math.min(1, value / max) : 0;
  const level = Math.max(1, Math.ceil(ratio * 4)); // 1..4
  const alpha = 0.25 + level * 0.18;
  return hexToRgba(base, Math.min(1, alpha));
}

function hexToRgba(hex, a) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/**
 * Ve heatmap 12 tuan (84 o) theo thu tu cot = tuan, hang = thu.
 * @param {HTMLElement} container
 * @param {Array<{key:string, value:number}>} days - danh sach ngay lien tuc (moi nhat cuoi)
 */
export function renderHeatmap(container, days) {
  container.innerHTML = '';
  const max = Math.max(1, ...days.map((d) => d.value));
  // can bang so o cho dung 12 tuan
  const cells = days.slice(-12 * 7);
  for (const d of cells) {
    const cell = document.createElement('div');
    cell.className = 'hm-cell';
    cell.style.background = heatColor(d.value, max);
    cell.dataset.tip = `${d.key}: ${d.value}`;
    container.appendChild(cell);
  }
}

/** Cap nhat 1 ring (conic) bang cach set --pct. */
export function setRing(el, pct) {
  if (el) el.style.setProperty('--pct', String(Math.max(0, Math.min(100, pct))));
}
