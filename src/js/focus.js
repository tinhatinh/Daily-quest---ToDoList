/*
 * focus.js - POMODORO / FOCUS TIMER gan voi quest
 * -----------------------------------------------
 * FAB goc phai: chon quest + bat dau phiens. Het gio lam viec -> tang XP
 * (grantFocusReward) + chuyen sang nghi. Co pause/resume/stop.
 */

import { store } from './store.js';
import { grantFocusReward } from './gamification.js';
import { findQuest } from './selectors.js';
import { escapeHtml, minutesToTime } from './utils.js';
import { icon } from './icons.js';
import { t, i18n } from './i18n.js';
import { audio } from './audio.js';
import { openModal, toast, confetti } from './ui.js';

const st = { phase: 'idle', total: 0, remaining: 0, running: false, questId: null, timer: null };
let fab = null;

function ensureFab() {
  if (fab && document.contains(fab)) return fab;
  fab = document.createElement('div');
  fab.className = 'focus-fab';
  fab.hidden = true;
  fab.innerHTML = `
    <div class="focus-fab__ring" id="fzRing"></div>
    <div class="stack" style="line-height:1.1">
      <span class="focus-fab__time" id="fzTime">25:00</span>
      <span class="muted" id="fzLabel" style="font-size:var(--fs-100)"></span>
    </div>
    <button class="icon-btn" id="fzPause" aria-label="Pause"></button>
    <button class="icon-btn" id="fzStop" aria-label="Stop">${icon('x')}</button>`;
  document.body.appendChild(fab);
  fab.querySelector('#fzPause').addEventListener('click', togglePause);
  fab.querySelector('#fzStop').addEventListener('click', stop);
  return fab;
}

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function renderFab() {
  if (!fab) return;
  const pct = st.total ? ((st.total - st.remaining) / st.total) * 100 : 0;
  fab.querySelector('#fzRing').style.setProperty('--pct', pct);
  fab.querySelector('#fzTime').textContent = fmt(st.remaining);
  const q = st.questId ? findQuest(store.state, st.questId) : null;
  const phaseTxt = st.phase === 'work' ? (i18n.lang === 'en' ? 'Focus' : 'Tập trung') : i18n.lang === 'en' ? 'Break' : 'Nghỉ';
  fab.querySelector('#fzLabel').textContent = `${phaseTxt}${q ? ' · ' + q.title : ''}`;
  fab.querySelector('#fzPause').innerHTML = icon(st.running ? 'pause' : 'play');
}

/** Mo hop chon quest + bat dau. */
export function openFocus() {
  const s = store.state.settings;
  const body = document.createElement('div');
  body.className = 'stack gap-4';
  body.innerHTML = `
    <div class="field"><label class="field__label">${i18n.lang === 'en' ? 'Linked quest' : 'Gắn với quest'}</label>
      <select class="select" id="fz-quest"><option value="">— ${i18n.lang === 'en' ? 'none' : 'không'} —</option>
        ${store.state.quests.filter((q) => !q.archived).map((q) => `<option value="${q.id}">${escapeHtml(q.title)}</option>`).join('')}</select></div>
    <div class="form-grid">
      <div class="field"><label class="field__label">${i18n.lang === 'en' ? 'Work (min)' : 'Làm việc (phút)'}</label><input class="input" id="fz-work" type="number" min="1" max="120" value="${s.focusWorkMin}" /></div>
      <div class="field"><label class="field__label">${i18n.lang === 'en' ? 'Break (min)' : 'Nghỉ (phút)'}</label><input class="input" id="fz-break" type="number" min="1" max="60" value="${s.focusBreakMin}" /></div>
    </div>`;
  const foot = document.createElement('div');
  foot.className = 'row gap-3 end';
  foot.style.width = '100%';
  foot.innerHTML = `<button class="btn btn--ghost" data-x>${t('common.cancel')}</button><button class="btn btn--primary" data-go>${icon('play')}${i18n.lang === 'en' ? 'Start' : 'Bắt đầu'}</button>`;
  body.appendChild(foot);
  const ctl = openModal({ title: i18n.lang === 'en' ? 'Focus session' : 'Phiên tập trung', bodyNode: body });
  ctl.node.querySelector('.modal__foot')?.remove();
  const $ = (x) => body.querySelector(x);
  $('[data-x]').addEventListener('click', () => ctl.close());
  $('[data-go]').addEventListener('click', () => {
    const work = Math.max(1, Number($('#fz-work').value) || 25);
    const brk = Math.max(1, Number($('#fz-break').value) || 5);
    store.update((d) => {
      d.settings.focusWorkMin = work;
      d.settings.focusBreakMin = brk;
    }, { undoable: false, reason: 'focus-set' });
    startSession($('#fz-quest').value, work, brk);
    ctl.close();
  });
}

function startSession(questId, workMin, breakMin) {
  ensureFab();
  st.questId = questId || null;
  st.phase = 'work';
  st.total = workMin * 60;
  st.remaining = st.total;
  st.running = true;
  fab.hidden = false;
  renderFab();
  tickLoop();
  audio.play('click');
}

function tickLoop() {
  clearInterval(st.timer);
  st.timer = setInterval(() => {
    if (!st.running) return;
    st.remaining--;
    if (st.remaining <= 0) onPhaseEnd();
    else renderFab();
  }, 1000);
}

function onPhaseEnd() {
  if (st.phase === 'work') {
    const out = grantFocusReward();
    audio.play('focusDone');
    confetti(window.innerWidth - 90, window.innerHeight - 60, 50);
    toast({ type: 'success', title: t('toast.focusDone', { xp: out.xp || 20 }), iconName: 'timer' });
    // chuyen sang nghi
    const brk = (store.state.settings.focusBreakMin || 5) * 60;
    st.phase = 'break';
    st.total = brk;
    st.remaining = brk;
    renderFab();
  } else {
    stop();
    toast({ type: 'info', title: i18n.lang === 'en' ? 'Break over' : 'Hết giờ nghỉ', iconName: 'coffee' });
  }
}

function togglePause() {
  st.running = !st.running;
  renderFab();
  audio.play('click');
}

function stop() {
  clearInterval(st.timer);
  st.running = false;
  st.phase = 'idle';
  if (fab) fab.hidden = true;
}
