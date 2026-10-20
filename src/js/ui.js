/*
 * ui.js - LOAI HINH TUONG MO + HIEU UNG (FX)
 * ------------------------------------------
 * toast, modal, confirm, command palette, va he thong hieu ung tren canvas
 * #fx: confetti, tia bua (spark), so XP bay len, overlay LEVEL UP, combo HUD.
 * Khong phu thuoc store -> de app/pages goi thoai mai.
 */

import { icon } from './icons.js';
import { el, escapeHtml } from './utils.js';

/* =========================================================================
   TOAST
   ========================================================================= */
const TOAST_ICON = {
  success: 'checkCircle',
  error: 'xCircle',
  achievement: 'trophy',
  info: 'info',
};

/**
 * Hien toast goc phai duoi.
 * @param {object} o {type,title,msg,icon,duration}
 */
export function toast(o = {}) {
  const { type = 'info', title = '', msg = '', iconName = null, duration = 3600 } = o;
  const host = document.getElementById('toasts');
  if (!host) return;
  const node = el(
    `<div class="toast toast--${type}" role="status">
      <div class="toast__icon">${icon(iconName || TOAST_ICON[type] || 'info', { size: 20 })}</div>
      <div class="toast__body">
        <div class="toast__title">${escapeHtml(title)}</div>
        ${msg ? `<div class="toast__msg">${escapeHtml(msg)}</div>` : ''}
      </div>
    </div>`
  );
  host.appendChild(node);
  const remove = () => {
    node.classList.add('is-out');
    setTimeout(() => node.remove(), 260);
  };
  const timer = setTimeout(remove, duration);
  node.addEventListener('click', () => {
    clearTimeout(timer);
    remove();
  });
}

export const toastSuccess = (title, msg) => toast({ type: 'success', title, msg });
export const toastError = (title, msg) => toast({ type: 'error', title, msg, duration: 4600 });
export const toastInfo = (title, msg) => toast({ type: 'info', title, msg });
export function toastAchievement(ach, lang = 'vi') {
  toast({
    type: 'achievement',
    title: lang === 'en' ? ach.en : ach.vi,
    msg: (lang === 'en' ? ach.descEn : ach.descVi),
    iconName: ach.icon,
    duration: 4600,
  });
}

/* =========================================================================
   MODAL
   ========================================================================= */
let openModals = [];

/**
 * Mo modal.
 * @param {object} o {title, bodyHtml, bodyNode, footerHtml, wide, mount(node,ctl), onClose}
 * @returns {{close:Function, node:HTMLElement}}
 */
export function openModal(o = {}) {
  const { title = '', bodyHtml = '', bodyNode = null, footerHtml = '', wide = false } = o;
  const root = document.getElementById('modalRoot');
  const backdrop = el(
    `<div class="modal-backdrop">
      <div class="modal ${wide ? 'modal--wide' : ''}" role="dialog" aria-modal="true">
        <div class="modal__head">
          <div class="modal__title">${escapeHtml(title)}</div>
          <button class="icon-btn" data-close aria-label="Đóng">${icon('x')}</button>
        </div>
        <div class="modal__body"></div>
        ${footerHtml ? `<div class="modal__foot">${footerHtml}</div>` : ''}
      </div>
    </div>`
  );
  const body = backdrop.querySelector('.modal__body');
  if (bodyNode) body.appendChild(bodyNode);
  else body.innerHTML = bodyHtml;

  const ctl = {
    node: backdrop,
    close() {
      backdrop.style.animation = 'fadeIn 120ms reverse';
      setTimeout(() => {
        backdrop.remove();
        openModals = openModals.filter((m) => m !== ctl);
        if (o.onClose) o.onClose();
      }, 120);
    },
  };

  backdrop.addEventListener('mousedown', (e) => {
    if (e.target === backdrop) ctl.close();
  });
  backdrop.querySelector('[data-close]').addEventListener('click', ctl.close);
  root.appendChild(backdrop);
  openModals.push(ctl);

  // focus input dau tien
  requestAnimationFrame(() => {
    const first = backdrop.querySelector('input,textarea,select,button.btn--primary');
    if (first) first.focus();
  });
  if (o.mount) o.mount(backdrop, ctl);
  return ctl;
}

/** Dong modal tren cung (Escape). */
export function closeTopModal() {
  const top = openModals[openModals.length - 1];
  if (top) {
    top.close();
    return true;
  }
  return false;
}
export function hasOpenModal() {
  return openModals.length > 0;
}

/**
 * Hop thoai xac nhan 2 nut.
 * @returns {Promise<boolean>}
 */
export function confirmDialog({ title = 'Xác nhận', message = '', confirmText = 'Xác nhận', cancelText = 'Hủy', danger = false } = {}) {
  return new Promise((resolve) => {
    const body = el(`<div class="stack gap-3"><p style="color:var(--text-2)">${escapeHtml(message)}</p></div>`);
    const foot = el(
      `<div class="row gap-3 end" style="width:100%">
        <button class="btn btn--ghost" data-no>${escapeHtml(cancelText)}</button>
        <button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-yes>${escapeHtml(confirmText)}</button>
      </div>`
    );
    const ctl = openModal({ title, bodyNode: body, onClose: () => resolve(false) });
    ctl.node.querySelector('.modal__foot')?.remove();
    ctl.node.querySelector('.modal__body').appendChild(foot);
    foot.querySelector('[data-no]').addEventListener('click', () => {
      ctl.close();
      resolve(false);
    });
    foot.querySelector('[data-yes]').addEventListener('click', () => {
      // resolve(true) chay truoc onClose (goi sau 120ms) -> Promise tra ve true
      ctl.close();
      resolve(true);
    });
  });
}

/* =========================================================================
   FX: CONFETTI / SPARK / XP FLOAT / LEVEL UP / COMBO
   ========================================================================= */
const fx = {
  canvas: null,
  ctx: null,
  parts: [],
  running: false,
  palette: ['#7c5cff', '#22d3ee', '#ff6ec7', '#ffc94a', '#2fd39a', '#ff8a3d'],

  init() {
    if (this.canvas) return;
    this.canvas = document.getElementById('fx');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },
  resize() {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  },
  add(p) {
    this.parts.push(p);
    if (!this.running) this.loop();
  },
  loop() {
    this.running = true;
    const step = () => {
      const { ctx, canvas } = this;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.parts = this.parts.filter((p) => p.life > 0);
      for (const p of this.parts) {
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= 1;
        const a = Math.max(0, p.life / p.maxLife);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (this.parts.length) requestAnimationFrame(step);
      else {
        this.running = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    requestAnimationFrame(step);
  },

  /** Confetti nho no tai (x,y). */
  burst(x, y, count = 40, spread = 6) {
    this.init();
    if (!this.ctx) return;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * spread + 2;
      this.parts.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 3,
        gravity: 0.22,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 8 + 5,
        color: this.palette[(Math.random() * this.palette.length) | 0],
        shape: Math.random() > 0.4 ? 'rect' : 'circle',
        life: 70 + Math.random() * 30,
        maxLife: 100,
      });
    }
    if (!this.running) this.loop();
  },

  /** Mia bung tu 2 goc tren man hinh (level up). */
  cannons() {
    this.init();
    if (!this.ctx) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (const origin of [
      { x: w * 0.1, y: h * 0.85, dir: 1 },
      { x: w * 0.9, y: h * 0.85, dir: -1 },
    ]) {
      for (let i = 0; i < 60; i++) {
        this.parts.push({
          x: origin.x,
          y: origin.y,
          vx: origin.dir * (Math.random() * 8 + 3),
          vy: -(Math.random() * 12 + 8),
          gravity: 0.32,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.4,
          size: Math.random() * 9 + 5,
          color: this.palette[(Math.random() * this.palette.length) | 0],
          shape: Math.random() > 0.5 ? 'rect' : 'circle',
          life: 90 + Math.random() * 30,
          maxLife: 120,
        });
      }
    }
    if (!this.running) this.loop();
  },

  /** Tia bua nho khi tick checkbox. */
  spark(x, y, color = '#2fd39a') {
    this.init();
    if (!this.ctx) return;
    for (let i = 0; i < 10; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = Math.random() * 3 + 1;
      this.parts.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        gravity: 0.05,
        rot: 0,
        vr: 0,
        size: Math.random() * 4 + 2,
        color,
        shape: 'circle',
        life: 24 + Math.random() * 12,
        maxLife: 36,
      });
    }
    if (!this.running) this.loop();
  },
};

/** So "+30 XP" bay len tai (x,y). */
export function xpFloat(x, y, text = '+XP') {
  const node = el(`<div class="xp-float">${escapeHtml(text)}</div>`);
  node.style.left = x + 'px';
  node.style.top = y + 'px';
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 1000);
}

/** Burst confetti tai toa do. */
export function confetti(x, y, count) {
  fx.burst(x, y, count);
}
export function confettiCannons() {
  fx.cannons();
}
export function sparkAt(x, y, color) {
  fx.spark(x, y, color);
}

/** Overlay LEVEL UP!. */
export function levelUpOverlay(level, titleText) {
  const box = document.getElementById('levelup');
  if (!box) return;
  box.querySelector('#levelupLevel').textContent = String(level);
  box.querySelector('#levelupSub').textContent = titleText || '';
  box.hidden = false;
  const card = box.querySelector('.levelup__card');
  card.style.animation = 'none';
  // force reflow de khoi dong lai animation
  void card.offsetWidth;
  card.style.animation = '';
  setTimeout(() => (box.hidden = true), 2400);
}

/** HUD combo (x N). */
export function comboHud(count) {
  const box = document.getElementById('combo');
  if (!box) return;
  box.querySelector('#comboN').textContent = String(count);
  box.hidden = false;
  box.style.animation = 'none';
  void box.offsetWidth;
  box.style.animation = '';
  clearTimeout(comboHud._t);
  comboHud._t = setTimeout(() => (box.hidden = true), 1400);
}

/* =========================================================================
   COMMAND PALETTE
   ========================================================================= */
const commands = [];
let paletteProvider = null; // () => [{id,label,icon,group,run}]

/** Dang ky lenh tinh cho palette. */
export function registerCommand(cmd) {
  if (!commands.find((c) => c.id === cmd.id)) commands.push(cmd);
}
export function setPaletteProvider(fn) {
  paletteProvider = fn;
}

let paletteOpen = false;
let paletteIndex = 0;
let paletteMatches = [];

function buildPaletteList(query) {
  const staticCmds = commands;
  const dyn = paletteProvider ? paletteProvider() : [];
  const all = [...staticCmds, ...dyn];
  const q = query.trim().toLowerCase();
  if (!q) return all.slice(0, 12);
  return all
    .filter((c) => (c.label + ' ' + (c.group || '')).toLowerCase().includes(q))
    .slice(0, 14);
}

function renderPalette() {
  const list = document.getElementById('paletteList');
  if (!list) return;
  if (!paletteMatches.length) {
    list.innerHTML = `<li class="palette__empty">Không tìm thấy lệnh nào</li>`;
    return;
  }
  list.innerHTML = paletteMatches
    .map(
      (c, i) =>
        `<li class="palette__item ${i === paletteIndex ? 'is-active' : ''}" data-i="${i}" role="option">
          ${icon(c.icon || 'command', { size: 18 })}
          <span>${escapeHtml(c.label)}</span>
          ${c.group ? `<span class="pi-group">${escapeHtml(c.group)}</span>` : ''}
        </li>`
    )
    .join('');
  const active = list.querySelector('.is-active');
  if (active) active.scrollIntoView({ block: 'nearest' });
}

export function openPalette(prefill = '') {
  const box = document.getElementById('palette');
  const input = document.getElementById('paletteInput');
  if (!box || !input) return;
  paletteOpen = true;
  box.hidden = false;
  input.value = prefill;
  paletteIndex = 0;
  paletteMatches = buildPaletteList(prefill);
  renderPalette();
  setTimeout(() => input.focus(), 20);
}

export function closePalette() {
  const box = document.getElementById('palette');
  if (box) box.hidden = true;
  paletteOpen = false;
}
export function isPaletteOpen() {
  return paletteOpen;
}

function runPaletteItem(i) {
  const cmd = paletteMatches[i];
  if (!cmd) return;
  closePalette();
  if (cmd.run) cmd.run();
}

/** Khoi dung xu ly su kien cho palette (goi 1 lan luc bootstrap). */
export function initPalette() {
  const input = document.getElementById('paletteInput');
  const list = document.getElementById('paletteList');
  const box = document.getElementById('palette');
  if (!input || !list || !box) return;
  input.addEventListener('input', () => {
    paletteMatches = buildPaletteList(input.value);
    paletteIndex = 0;
    renderPalette();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      paletteIndex = Math.min(paletteMatches.length - 1, paletteIndex + 1);
      renderPalette();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      paletteIndex = Math.max(0, paletteIndex - 1);
      renderPalette();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runPaletteItem(paletteIndex);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closePalette();
    }
  });
  list.addEventListener('click', (e) => {
    const item = e.target.closest('.palette__item');
    if (item) runPaletteItem(Number(item.dataset.i));
  });
  box.addEventListener('mousedown', (e) => {
    if (e.target === box) closePalette();
  });
}
