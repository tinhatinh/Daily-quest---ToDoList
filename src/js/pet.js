/*
 * pet.js - LOGIC CUA SO HIEP SI
 * -----------------------------
 * - Hiep si: keo de di chuyen (qua IPC pet:move), bam (khong keo) -> chem +
 *   mo/dong panel to-do. Panel dong bo to-do voi cua so chinh qua IPC relay.
 * - Chi doc/gui qua window.api; KHONG touch fs. Cua so chinh la nguoi ghi file.
 */

import { icon } from './icons.js';

const api = window.api;
const knight = document.getElementById('knight');
const flyout = document.getElementById('flyout');
const listEl = document.getElementById('flyList');
const inputEl = document.getElementById('flyInput');
const badgeEl = document.getElementById('knightBadge');
const countEl = document.getElementById('flyCount');

let todos = [];
let open = false;
// Am thanh dong bo tu cai dat app (sound/volume) qua kenh 'theme:state'.
let audioCfg = { sound: true, volume: 0.5 };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- Ap dung theme dong bo tu app chinh ---------- */
function applyAppearance(ap) {
  if (!ap) return;
  const root = document.documentElement;
  root.setAttribute('data-theme', ap.theme || 'dark');
  root.setAttribute('data-accent', ap.accent || 'violet');
  if (ap.accent === 'custom') {
    root.style.setProperty('--custom-accent', ap.customAccent || '#7c5cff');
    root.style.setProperty('--custom-accent-2', ap.customAccent2 || '#22d3ee');
    root.style.setProperty('--accent', ap.customAccent || '#7c5cff');
    root.style.setProperty('--accent-2', ap.customAccent2 || '#22d3ee');
  } else {
    ['--custom-accent', '--custom-accent-2', '--accent', '--accent-2'].forEach((p) => root.style.removeProperty(p));
  }
  document.body.classList.toggle('reduced-motion', !!ap.reducedMotion);
  if (typeof ap.sound === 'boolean') audioCfg.sound = ap.sound;
  if (typeof ap.volume === 'number') audioCfg.volume = ap.volume;
}

/* ---------- Render ---------- */
function render() {
  const items = [...todos].sort((a, b) => Number(!!a.done) - Number(!!b.done) || (a.order || 0) - (b.order || 0));
  const openCount = items.filter((t) => !t.done).length;
  if (countEl) countEl.textContent = String(openCount);
  if (badgeEl) {
    badgeEl.textContent = String(openCount);
    badgeEl.hidden = openCount === 0;
  }
  listEl.innerHTML = items.length
    ? items
        .map(
          (t) => `<li class="pf-item ${t.done ? 'is-done' : ''}" data-id="${t.id}">
            <button class="pf-check ${t.done ? 'is-done' : ''}" data-act="toggle" aria-label="toggle">${icon('check', { size: 12 })}</button>
            <span class="pf-text">${esc(t.title)}</span>
            <button class="pf-del" data-act="del" aria-label="xóa">${icon('x', { size: 14 })}</button>
          </li>`
        )
        .join('')
    : `<li class="pf-empty">Chưa có to-do nào. Thêm bên dưới ↓</li>`;
}

/* ---------- Mo / dong flyout ---------- */
function setOpen(v) {
  open = v;
  flyout.hidden = !v;
  try {
    api.petResize(v);
  } catch (e) {}
  if (v) setTimeout(() => inputEl && inputEl.focus(), 80);
}

/* ---------- Am thanh "chem" ---------- */
let actx = null;
function sfx() {
  if (!audioCfg.sound) return; // ton trong tat/bat am thanh trong Cai dat
  const vol = Math.max(0, Math.min(1, audioCfg.volume));
  if (vol <= 0) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const o = actx.createOscillator();
    const g = actx.createGain();
    const t = actx.currentTime;
    const peak = Math.max(0.0001, 0.35 * vol); // nhe va theo âm lượng app
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(950, t);
    o.frequency.exponentialRampToValueAtTime(170, t + 0.18);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g);
    g.connect(actx.destination);
    o.start(t);
    o.stop(t + 0.22);
  } catch (e) {}
}

function slash() {
  knight.classList.remove('slashing');
  void knight.offsetWidth; // reset animation
  knight.classList.add('slashing');
  sfx();
  setTimeout(() => knight.classList.remove('slashing'), 460);
}

/* ---------- Keo / bam phan biet nhau (dung toa do MAN HINH -> theo sat chuot) ---------- */
let drag = null; // {grabX, grabY, winX, winY, moved, pointerId}
knight.addEventListener('pointerdown', async (e) => {
  let b = null;
  try {
    b = await api.petGetBounds();
  } catch (err) {}
  if (!b) return;
  drag = { grabX: e.screenX, grabY: e.screenY, winX: b.x, winY: b.y, moved: false, pointerId: e.pointerId };
  try {
    knight.setPointerCapture(e.pointerId);
  } catch (err) {}
});
knight.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.screenX - drag.grabX;
  const dy = e.screenY - drag.grabY;
  if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
  if (drag.moved) {
    try {
      api.petMoveTo(drag.winX + dx, drag.winY + dy);
    } catch (err) {}
  }
});
function endDrag(e) {
  if (!drag) return;
  const wasDrag = drag.moved;
  try {
    knight.releasePointerCapture(drag.pointerId);
  } catch (err) {}
  drag = null;
  if (!wasDrag) {
    slash();
    setOpen(!open);
  }
}
knight.addEventListener('pointerup', endDrag);
knight.addEventListener('pointercancel', () => (drag = null));
knight.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    slash();
    setOpen(!open);
  }
});

/* ---------- Xu ly to-do trong flyout ---------- */
listEl.addEventListener('click', (e) => {
  const li = e.target.closest('.pf-item');
  if (!li) return;
  const act = e.target.closest('[data-act]');
  if (!act) return;
  const id = li.dataset.id;
  if (act.dataset.act === 'toggle') api.sendTodoAction({ type: 'toggle', id });
  else if (act.dataset.act === 'del') api.sendTodoAction({ type: 'delete', id });
});

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const title = inputEl.value.trim();
    if (title) {
      api.sendTodoAction({ type: 'add', title });
      inputEl.value = '';
    }
  }
});

document.getElementById('btnOpen').addEventListener('click', () => api.petOpenMain());
document.getElementById('btnClose').addEventListener('click', () => api.petClose());

/* ---------- Dong bo tu cua so chinh ---------- */
api.on('todos:state', (payload) => {
  todos = Array.isArray(payload) ? payload : [];
  render();
});
api.on('theme:state', (ap) => applyAppearance(ap));

// lan dau xin danh sach to-do
render();
try {
  api.requestTodos();
} catch (e) {}
