/*
 * pages/schedule.js - LICH TRINH / TIMELINE
 * -----------------------------------------
 * Timeline doc theo gio (1 phut = 1px), duong "bay gio" chay theo thoi gian
 * thuc, chon ngay (T2..CN) + che do Ngay/Tuan. Su kien mau theo category, ho
 * tro = sua, nut tick = hoan thanh (va hoan thanh quest lien ket).
 */

import { store } from '../store.js';
import { eventsOnDay, findQuest, isQuestCompletedOn } from '../selectors.js';
import { findNextEvent, describeRepeat, isValidDateStr } from '../recurrence.js';
import { completeQuest } from '../gamification.js';
import { CATEGORIES, CATEGORY_IDS } from '../constants.js';
import {
  dateKey,
  gameDayKey,
  addDaysKey,
  parseDateKey,
  weekdayLabel,
  formatDateLong,
  timeToMinutes,
  escapeHtml,
  uid,
  secondsToClock,
} from '../utils.js';
import { icon } from '../icons.js';
import { t, i18n } from '../i18n.js';
import { openModal, toast, confirmDialog } from '../ui.js';
import { audio } from '../audio.js';
import { openImportDialog } from '../importDialog.js';

const HOUR_H = 60; // px moi gio (=> 1 phut = 1px)
const state = { mode: 'day', dateKey: null };
let els = {};
let tick = null;

function todayKey() {
  return gameDayKey(new Date(), store.state.settings.dayStartHour);
}
function selKey() {
  return state.dateKey || todayKey();
}
function toMin(hhmm) {
  return timeToMinutes(hhmm) ?? 0;
}
function catColorVar(cat) {
  return (CATEGORIES[cat] || CATEGORIES.life).color;
}

/** Xep su kien vao cac cot (lane) de khong de chong lan. */
function layout(events) {
  const sorted = [...events].sort((a, b) => toMin(a.start) - toMin(b.start));
  const laneEnds = [];
  const placed = sorted.map((ev) => {
    const s = toMin(ev.start);
    const e = Math.max(toMin(ev.end), s + 15);
    let lane = laneEnds.findIndex((end) => end <= s);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(e);
    } else laneEnds[lane] = e;
    return { ev, s, e, lane };
  });
  const lanes = Math.max(1, laneEnds.length);
  placed.forEach((p) => (p.lanes = lanes));
  return placed;
}

/** Da hoan thanh su kien hom nay? */
function eventDone(id, dk) {
  const rec = store.state.dayRecords[dk];
  return !!(rec && rec.events && rec.events[id]);
}
function toggleEventDone(id, dk) {
  let linkedId = null;
  let becomingDone = false;
  store.update(
    (d) => {
      d.dayRecords[dk] = d.dayRecords[dk] || { quests: {}, events: {}, xpEarned: 0, coinEarned: 0, todosDone: [], perfect: false };
      d.dayRecords[dk].events = d.dayRecords[dk].events || {};
      const was = !!d.dayRecords[dk].events[id];
      d.dayRecords[dk].events[id] = !was;
      becomingDone = !was;
      const ev = d.schedule.find((x) => x.id === id);
      if (ev && ev.linkedQuestId) linkedId = ev.linkedQuestId;
    },
    { undoable: true, reason: 'event-done' }
  );
  // hoan thanh quest lien ket NGOAI recipe (tranh store.update long nhau)
  if (becomingDone && linkedId) {
    const q = findQuest(store.state, linkedId);
    if (q && !isQuestCompletedOn(store.state, q, store.todayKey())) completeQuest(linkedId);
  }
  audio.play('tick');
}

/* ---------- Thanh chon ngay ---------- */
function dayPickerHtml() {
  const today = todayKey();
  const monday = parseDateKey(today);
  const dow = monday.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  monday.setDate(monday.getDate() + diff);
  let html = '';
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = dateKey(d);
    const active = key === selKey();
    html += `<button class="day-pill ${active ? 'is-active' : ''} ${key === today ? 'is-today' : ''}" data-date="${key}">
      <div class="day-pill__dow">${weekdayLabel(d.getDay(), i18n.lang, true)}</div>
      <div class="day-pill__date">${d.getDate()}</div>
    </button>`;
  }
  return html;
}

/* ---------- Timeline ---------- */
function timelineHtml() {
  const dk = selKey();
  const events = eventsOnDay(store.state, dk);
  const placed = layout(events);
  let hours = '';
  for (let h = 0; h < 24; h++) {
    hours += `<div class="tl-hour"><span class="tl-hour__label">${String(h).padStart(2, '0')}:00</span></div>`;
  }
  const blocks = placed
    .map((p) => {
      const top = p.s; // 1 phut = 1px
      const height = Math.max(24, p.e - p.s);
      const width = 100 / p.lanes;
      const left = p.lane * width;
      const isNow = dk === todayKey() && toMin(p.ev.start) <= nowMin() && nowMin() < toMin(p.ev.end);
      const past = toMin(p.ev.end) < nowMin() && dk === todayKey();
      const done = eventDone(p.ev.id, dk);
      return `<div class="tl-event ${isNow ? 'is-now' : ''} ${past ? 'is-past' : ''}" data-id="${p.ev.id}"
        style="top:${top}px;height:${height}px;left:calc(${left}% + 4px);width:calc(${width}% - 8px);--c:${catColorVar(p.ev.category)}">
        <div class="tl-event__title">${escapeHtml(p.ev.title)}</div>
        <div class="tl-event__time">${p.ev.start} – ${p.ev.end}${done ? ' ✓' : ''}</div>
      </div>`;
    })
    .join('');
  const nowTop = nowMin();
  const showNow = dk === todayKey();
  return `<div class="timeline" id="timeline">
    <div class="tl-grid">
      ${hours}
      <div class="tl-events">${blocks}</div>
      ${showNow ? `<div class="tl-now" id="tlNow" style="top:${nowTop}px"></div>` : ''}
    </div>
  </div>`;
}

function nowMin() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes() + n.getSeconds() / 60;
}

/* ---------- The week view ---------- */
function weekHtml() {
  const monday = parseDateKey(selKey());
  const dow = monday.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  monday.setDate(monday.getDate() + diff);
  let cols = '';
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = dateKey(d);
    const evs = eventsOnDay(store.state, key);
    const chips = evs
      .map(
        (e) =>
          `<button class="week-chip" data-id="${e.id}" style="--c:${catColorVar(e.category)}"><b>${escapeHtml(e.title)}</b>${e.start}–${e.end}</button>`
      )
      .join('');
    cols += `<div class="week-col ${key === todayKey() ? 'is-today' : ''}">
      <div class="week-col__head"><div class="muted" style="font-size:var(--fs-100)">${weekdayLabel(d.getDay(), i18n.lang, true)}</div>
      <div style="font-weight:800">${d.getDate()}</div></div>
      ${chips || `<div class="muted" style="font-size:var(--fs-100);text-align:center;padding:12px 0">—</div>`}
    </div>`;
  }
  return `<div class="week-grid">${cols}</div>`;
}

/* ---------- The ben phai ---------- */
/** Che do THANG: lich 7 cot, moi o hien cham mau theo su kien. */
function monthHtml() {
  const anchor = parseDateKey(selKey());
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = (first.getDay() + 6) % 7; // 0 = Mon
  const today = todayKey();
  const pad = (n) => String(n).padStart(2, '0');

  let cells = '';
  for (let i = 0; i < startDow; i++) cells += '<div class="cal-cell is-blank"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${pad(month + 1)}-${pad(d)}`;
    const evs = eventsOnDay(store.state, key);
    const dots = evs.slice(0, 4).map((e) => `<span class="cal-dot" style="--c:${catColorVar(e.category)}"></span>`).join('');
    const more = evs.length > 4 ? `<span class="cal-more">+${evs.length - 4}</span>` : '';
    cells += `<div class="cal-cell ${key === today ? 'is-today' : ''} ${key === selKey() ? 'is-sel' : ''}" data-date="${key}">
      <div class="cal-cell__num">${d}</div>
      <div class="cal-cell__dots">${dots}${more}</div>
    </div>`;
  }
  const dow = [1, 2, 3, 4, 5, 6, 0].map((i) => `<div class="cal-dow">${weekdayLabel(i, i18n.lang, true)}</div>`).join('');
  return `<div class="cal">
    <div class="cal-nav">
      <button class="icon-btn" data-mnav="-1">${icon('chevronLeft')}</button>
      <div class="cal-nav__label">${escapeHtml(monthYearLabel(year, month))}</div>
      <button class="icon-btn" data-mnav="1">${icon('chevronRight')}</button>
    </div>
    <div class="cal-head">${dow}</div>
    <div class="cal-grid">${cells}</div>
  </div>`;
}

function monthYearLabel(year, month) {
  if (i18n.lang === 'en') return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const names = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
  return `${names[month]} ${year}`;
}

function sideHtml() {
  const dk = selKey();
  const events = eventsOnDay(store.state, dk);
  const cur = nowMin();
  const isToday = dk === todayKey();
  const happening = isToday ? events.find((e) => toMin(e.start) <= cur && cur < toMin(e.end)) : null;
  const next = findNextEvent(store.state, todayKey(), new Date(), 60);

  let nowCard = '';
  if (happening) {
    const s = toMin(happening.start);
    const e = Math.max(toMin(happening.end), s + 1);
    const pct = Math.round(((cur - s) / (e - s)) * 100);
    const q = happening.linkedQuestId ? findQuest(store.state, happening.linkedQuestId) : null;
    nowCard = `<div class="card now-card">
      <div class="now-card__label">${t('sched.happening')}</div>
      <div class="card__title" style="margin:6px 0;font-size:var(--fs-600)">${escapeHtml(happening.title)}</div>
      <div class="muted" style="font-size:var(--fs-300)">${happening.start} – ${happening.end}${happening.note ? ' · ' + escapeHtml(happening.note) : ''}</div>
      <div class="progress" style="margin:12px 0"><div class="progress__fill" style="width:${pct}%"></div></div>
      ${q ? `<div class="muted" style="font-size:var(--fs-200)">${t('sched.linkedQuest', { name: q.title })}</div>` : ''}
      <button class="btn btn--sm btn--primary" style="margin-top:10px" data-evdone="${happening.id}">${icon('check')}${t('sched.eventDone')}</button>
    </div>`;
  }

  let nextCard = '';
  if (next) {
    const isTodayNext = next.dateKey === todayKey();
    const secs = Math.max(0, Math.round((next.ts - Date.now()) / 1000));
    const when = isTodayNext ? next.event.start : `${formatDateLong(parseDateKey(next.dateKey), i18n.lang)} · ${next.event.start}`;
    nextCard = `<div class="card">
      <div class="muted" style="font-weight:700">${t('sched.upNext')}</div>
      <div class="card__title" style="margin:6px 0">${escapeHtml(next.event.title)}</div>
      <div class="muted" style="font-size:var(--fs-300)">${escapeHtml(when)}</div>
      <div class="muted" style="font-size:var(--fs-100);margin-top:2px">${escapeHtml(describeRepeat(next.event, i18n.lang))}</div>
      <div class="next-event__count count-pink" id="schedCount" data-ts="${next.ts}">${t('dash.remaining', { t: secondsToClock(secs) })}</div>
    </div>`;
  }

  const reminderCard = `<div class="card">
    <div class="card__title" style="font-size:var(--fs-500)">${t('sched.reminder')}</div>
    <div class="muted" style="margin-top:8px;font-size:var(--fs-300)">${t('sched.reminderDesc', { n: 10 })}</div>
  </div>`;

  return nowCard + nextCard + reminderCard;
}

/* ---------- Cap nhat dong ---------- */
function updateLive() {
  const now = document.getElementById('tlNow');
  if (now && selKey() === todayKey()) now.style.top = nowMin() + 'px';
  const cnt = document.getElementById('schedCount');
  if (cnt && cnt.dataset.ts) {
    const secs = Math.max(0, Math.round((Number(cnt.dataset.ts) - Date.now()) / 1000));
    cnt.textContent = t('dash.remaining', { t: secondsToClock(secs) });
  }
}

function rerender() {
  if (!els.main) return;
  els.main.innerHTML =
    state.mode === 'month' ? monthHtml() : state.mode === 'week' ? weekHtml() : timelineHtml();
  els.side.innerHTML = sideHtml();
  document.querySelectorAll('.day-pill').forEach((p) => p.classList.toggle('is-active', p.dataset.date === selKey()));
  if (state.mode === 'day') {
    const tl = document.getElementById('timeline');
    if (tl) tl.scrollTop = Math.max(0, (selKey() === todayKey() ? nowMin() : 7 * 60) - 120);
  }
}

/* ---------- Form su kien (kieu Google Calendar) ---------- */
function openEventForm(ev = null) {
  const lang = i18n.lang;
  const isNew = !ev;
  const d = ev || {};
  const rep = d.repeat || {};
  const freq0 = rep.freq || (d.days && d.days.length ? 'weekly' : isNew ? 'weekly' : 'none');
  const days = new Set(rep.byWeekdays && rep.byWeekdays.length ? rep.byWeekdays : d.days || [1, 2, 3, 4, 5]);
  const monthDays = (rep.byMonthDays || []).join(', ');
  const datesText = (d.dates || []).join('\n');

  const body = document.createElement('div');
  body.className = 'stack gap-4';
  body.innerHTML = `
    <div class="field"><label class="field__label">${t('common.title')} *</label>
      <input class="input" id="ev-title" value="${escapeHtml(d.title || '')}" maxlength="120" /></div>
    <div class="form-grid">
      <div class="field"><label class="field__label">${lang === 'en' ? 'Start time' : 'Giờ bắt đầu'}</label><input class="input" id="ev-start" type="time" value="${escapeHtml(d.start || '09:00')}" /></div>
      <div class="field"><label class="field__label">${lang === 'en' ? 'End time' : 'Giờ kết thúc'}</label><input class="input" id="ev-end" type="time" value="${escapeHtml(d.end || '10:00')}" /></div>
      <div class="field"><label class="field__label">${t('common.category')}</label>
        <select class="select" id="ev-cat">${CATEGORY_IDS.map((c) => `<option value="${c}" ${(d.category || 'life') === c ? 'selected' : ''}>${escapeHtml(lang === 'en' ? CATEGORIES[c].en : CATEGORIES[c].vi)}</option>`).join('')}</select></div>
      <div class="field"><label class="field__label">${lang === 'en' ? 'Reminder (min)' : 'Nhắc trước (phút)'}</label><input class="input" id="ev-rem" type="number" min="0" max="120" value="${d.reminderMinutes ?? 10}" /></div>
    </div>

    <div class="form-grid">
      <div class="field"><label class="field__label">${lang === 'en' ? 'Repeat' : 'Lặp lại'}</label>
        <select class="select" id="ev-freq">
          <option value="none" ${freq0 === 'none' ? 'selected' : ''}>${lang === 'en' ? 'Does not repeat' : 'Không lặp (một lần)'}</option>
          <option value="daily" ${freq0 === 'daily' ? 'selected' : ''}>${lang === 'en' ? 'Daily' : 'Hàng ngày'}</option>
          <option value="weekly" ${freq0 === 'weekly' ? 'selected' : ''}>${lang === 'en' ? 'Weekly' : 'Hàng tuần'}</option>
          <option value="monthly" ${freq0 === 'monthly' ? 'selected' : ''}>${lang === 'en' ? 'Monthly' : 'Hàng tháng'}</option>
        </select></div>
      <div class="field" id="ev-interval-field"><label class="field__label">${lang === 'en' ? 'Every (N)' : 'Mỗi (N)'}</label><input class="input" id="ev-interval" type="number" min="1" max="365" value="${rep.interval || 1}" /></div>
    </div>

    <div class="field" id="ev-days-field"><label class="field__label">${lang === 'en' ? 'On these days' : 'Xuất hiện vào các thứ'}</label>
      <div class="row gap-2 wrap" id="ev-days">${[1, 2, 3, 4, 5, 6, 0]
        .map((idx) => `<button type="button" class="tab ${days.has(idx) ? 'is-active' : ''}" data-day="${idx}" style="min-width:46px;justify-content:center">${weekdayLabel(idx, lang, true)}</button>`)
        .join('')}</div></div>

    <div class="field" id="ev-month-field"><label class="field__label">${lang === 'en' ? 'Days of month (comma separated)' : 'Ngày trong tháng (phẩy cách, vd 2, 16)'}</label>
      <input class="input" id="ev-monthdays" placeholder="2, 16, 30" value="${escapeHtml(monthDays)}" /></div>

    <div class="form-grid">
      <div class="field"><label class="field__label">${lang === 'en' ? 'Starts on' : 'Bắt đầu từ (ngày)'}</label><input class="input" id="ev-startdate" type="date" value="${escapeHtml(d.startDate || '')}" /></div>
      <div class="field"><label class="field__label">${lang === 'en' ? 'Ends' : 'Kết thúc'}</label>
        <select class="select" id="ev-endmode">
          <option value="never">${lang === 'en' ? 'Never' : 'Không hạn (mãi)'}</option>
          <option value="until" ${d.endDate ? 'selected' : ''}>${lang === 'en' ? 'On date' : 'Đến ngày'}</option>
        </select></div>
    </div>
    <div class="field" id="ev-enddate-field"><label class="field__label">${lang === 'en' ? 'Until date' : 'Đến hết ngày'}</label><input class="input" id="ev-enddate" type="date" value="${escapeHtml(d.endDate || '')}" /></div>

    <details class="field" id="ev-adv" ${datesText ? 'open' : ''}>
      <summary class="field__label" style="cursor:pointer">${lang === 'en' ? 'Advanced: specific dates (override repeat)' : 'Nâng cao: các ngày cụ thể (ghi đè luật lặp)'}</summary>
      <textarea class="textarea" id="ev-dates" rows="3" placeholder="YYYY-MM-DD (mỗi dòng một ngày)">${escapeHtml(datesText)}</textarea>
    </details>

    <div class="field"><label class="field__label">${lang === 'en' ? 'Linked quest' : 'Liên kết quest'}</label>
      <select class="select" id="ev-link"><option value="">— ${lang === 'en' ? 'none' : 'không'} —</option>
        ${store.state.quests.map((q) => `<option value="${q.id}" ${d.linkedQuestId === q.id ? 'selected' : ''}>${escapeHtml(q.title)}</option>`).join('')}</select></div>
    <div class="field"><label class="field__label">${lang === 'en' ? 'Note' : 'Ghi chú'}</label><input class="input" id="ev-note" value="${escapeHtml(d.note || '')}" /></div>
    <div id="ev-err"></div>
  `;
  const foot = document.createElement('div');
  foot.className = 'row gap-3 end';
  foot.style.width = '100%';
  foot.innerHTML = `${!isNew ? `<button class="btn btn--danger" data-del>${icon('trash')}${t('common.delete')}</button>` : ''}
    <button class="btn btn--ghost" data-x>${t('common.cancel')}</button>
    <button class="btn btn--primary" data-save>${t('common.save')}</button>`;
  body.appendChild(foot);

  const ctl = openModal({ title: isNew ? t('sched.newEvent') : t('common.edit'), bodyNode: body, wide: true });
  ctl.node.querySelector('.modal__foot')?.remove();
  const $ = (s) => body.querySelector(s);

  // weekday toggles
  body.querySelectorAll('#ev-days [data-day]').forEach((b) =>
    b.addEventListener('click', () => {
      const idx = Number(b.dataset.day);
      if (days.has(idx)) days.delete(idx);
      else days.add(idx);
      b.classList.toggle('is-active');
    })
  );

  // hien/ank theo freq + endmode
  function syncVis() {
    const f = $('#ev-freq').value;
    $('#ev-days-field').classList.toggle('hidden', f !== 'weekly');
    $('#ev-month-field').classList.toggle('hidden', f !== 'monthly');
    $('#ev-interval-field').classList.toggle('hidden', f === 'none');
    $('#ev-enddate-field').classList.toggle('hidden', $('#ev-endmode').value !== 'until');
  }
  $('#ev-freq').addEventListener('change', syncVis);
  $('#ev-endmode').addEventListener('change', syncVis);
  syncVis();

  $('[data-x]').addEventListener('click', () => ctl.close());
  const del = $('[data-del]');
  if (del)
    del.addEventListener('click', async () => {
      if (await confirmDialog({ title: t('common.delete'), message: d.title, danger: true, confirmText: t('common.delete') })) {
        store.update((st) => (st.schedule = st.schedule.filter((x) => x.id !== d.id)), { undoable: true, reason: 'del-event' });
        ctl.close();
        rerender();
      }
    });

  $('[data-save]').addEventListener('click', () => {
    const title = $('#ev-title').value.trim();
    const errBox = $('#ev-err');
    const fail = (msg) => {
      errBox.innerHTML = `<div class="validate-report validate-report--err">${escapeHtml(msg)}</div>`;
    };
    if (!title) {
      $('#ev-title').focus();
      return;
    }
    const freq = $('#ev-freq').value;
    const interval = Math.max(1, Number($('#ev-interval').value) || 1);
    const startDate = $('#ev-startdate').value || '';
    const endMode = $('#ev-endmode').value;
    const endDate = endMode === 'until' ? $('#ev-enddate').value || '' : '';

    const dates = ($('#ev-dates').value || '')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const badDate = dates.find((s) => !isValidDateStr(s));
    if (badDate) return fail(`${lang === 'en' ? 'Invalid date' : 'Ngày không hợp lệ'}: ${badDate} (YYYY-MM-DD)`);

    const byMonthDays = ($('#ev-monthdays').value || '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => n >= 1 && n <= 31);

    if (startDate && endDate && endDate < startDate) return fail(lang === 'en' ? 'End date is before start date' : 'Ngày kết thúc trước ngày bắt đầu');
    if (freq === 'none' && !startDate && !dates.length) return fail(lang === 'en' ? 'One-time event needs a start date or specific dates' : 'Sự kiện một lần cần ngày bắt đầu hoặc ngày cụ thể');

    const byWeekdays = [...days].sort((a, b) => a - b);
    const data = {
      title,
      start: $('#ev-start').value || '09:00',
      end: $('#ev-end').value || '10:00',
      category: $('#ev-cat').value,
      reminderMinutes: Math.max(0, Number($('#ev-rem').value) || 0),
      linkedQuestId: $('#ev-link').value,
      note: $('#ev-note').value.trim(),
      days: freq === 'weekly' ? byWeekdays : byWeekdays.length ? byWeekdays : [],
      startDate,
      endDate,
      dates: [...new Set(dates)].sort(),
      repeat: { freq, interval, byWeekdays, byMonthDays },
    };
    if (toMin(data.end) <= toMin(data.start)) data.end = '23:59';

    if (isNew) {
      store.update((st) => st.schedule.push({ id: uid('s'), ...data }), { undoable: true, reason: 'add-event' });
    } else {
      store.update((st) => Object.assign(st.schedule.find((x) => x.id === d.id) || {}, data), { undoable: true, reason: 'edit-event' });
    }
    audio.play('click');
    ctl.close();
    rerender();
  });
}

export const schedulePage = {
  id: 'schedule',
  icon: 'calendar',
  navKey: 'nav.schedule',
  order: 4,

  title() {
    return t('nav.schedule');
  },
  subtitle() {
    if (state.mode === 'month') {
      const a = parseDateKey(selKey());
      return monthYearLabel(a.getFullYear(), a.getMonth());
    }
    if (state.mode === 'week') {
      return i18n.lang === 'en' ? 'This week' : 'Tuần này';
    }
    return formatDateLong(parseDateKey(selKey()), i18n.lang);
  },

  render(view) {
    if (!state.dateKey) state.dateKey = todayKey();
    view.innerHTML = `
      <div class="toolbar">
        <div class="seg" id="sched-mode">
          <button class="${state.mode === 'day' ? 'is-active' : ''}" data-mode="day">${t('sched.day')}</button>
          <button class="${state.mode === 'week' ? 'is-active' : ''}" data-mode="week">${t('sched.week')}</button>
          <button class="${state.mode === 'month' ? 'is-active' : ''}" data-mode="month">${i18n.lang === 'en' ? 'Month' : 'Tháng'}</button>
        </div>
        <div class="toolbar__end">
          <button class="btn btn--subtle" id="sched-import">${icon('upload')}${t('quest.import')}</button>
          <button class="btn btn--primary" id="sched-new">${icon('plus')}${t('sched.newEvent')}</button>
        </div>
      </div>
      <div class="day-picker" id="sched-days">${dayPickerHtml()}</div>
      <div class="sched">
        <div class="sched__main" id="sched-main"></div>
        <div class="dash__col" id="sched-side"></div>
      </div>`;

    els.main = view.querySelector('#sched-main');
    els.side = view.querySelector('#sched-side');

    view.querySelector('#sched-mode').addEventListener('click', (e) => {
      const b = e.target.closest('[data-mode]');
      if (!b) return;
      state.mode = b.dataset.mode;
      view.querySelectorAll('#sched-mode button').forEach((x) => x.classList.toggle('is-active', x === b));
      rerender();
    });
    view.querySelector('#sched-days').addEventListener('click', (e) => {
      const p = e.target.closest('[data-date]');
      if (!p) return;
      state.dateKey = p.dataset.date;
      document.getElementById('pageSubtitle').textContent = this.subtitle();
      rerender();
    });
    view.querySelector('#sched-new').addEventListener('click', () => openEventForm(null));
    view.querySelector('#sched-import').addEventListener('click', () => openImportDialog('schedule', { onDone: rerender }));

    // click su kien / week chip / event done / calendar cell
    view.addEventListener('click', (e) => {
      const done = e.target.closest('[data-evdone]');
      if (done) {
        toggleEventDone(done.dataset.evdone, selKey());
        rerender();
        return;
      }
      const mnav = e.target.closest('[data-mnav]');
      if (mnav) {
        const anchor = parseDateKey(selKey());
        anchor.setMonth(anchor.getMonth() + Number(mnav.dataset.mnav), 1);
        state.dateKey = dateKey(anchor);
        document.getElementById('pageSubtitle').textContent = this.subtitle();
        rerender();
        return;
      }
      const cell = e.target.closest('.cal-cell[data-date]');
      if (cell) {
        state.dateKey = cell.dataset.date;
        state.mode = 'day';
        view.querySelectorAll('#sched-mode button').forEach((x) => x.classList.toggle('is-active', x.dataset.mode === 'day'));
        document.getElementById('pageSubtitle').textContent = this.subtitle();
        rerender();
        return;
      }
      const block = e.target.closest('.tl-event, .week-chip');
      if (block) {
        const ev = store.state.schedule.find((x) => x.id === block.dataset.id);
        if (ev) openEventForm(ev);
      }
    });

    rerender();
  },

  onState() {
    rerender();
  },
  onShow() {
    tick = () => updateLive();
    document.addEventListener('clock:tick', tick);
  },
  onHide() {
    if (tick) document.removeEventListener('clock:tick', tick);
  },
};
