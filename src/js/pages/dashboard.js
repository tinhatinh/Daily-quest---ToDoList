/*
 * pages/dashboard.js - TRANG BANG DIEU KHIEN
 * -------------------------------------------
 * 3 cot: trai (tien do hom nay + boss), giua (danh sach quest hom nay),
 * phai (su kien tiep theo + streak + thanh tuu vua mo).
 * Cap nhat dem nguoc + ring theo thoi gian qua su kien 'clock:tick'.
 */

import { store } from '../store.js';
import { router } from '../router.js';
import {
  dayProgress,
  getTodayQuests,
  scheduleStatus,
  isQuestCompletedOn,
  eventsOnDay,
} from '../selectors.js';
import { findNextEvent } from '../recurrence.js';
import { scheduler } from '../scheduler.js';
import { questCardHtml, attachQuestDelegation, emptyStateHtml } from '../components.js';
import { openQuestForm } from '../questForm.js';
import { ACHIEVEMENTS, ENCOURAGEMENT, DIFFICULTIES } from '../constants.js';
import {
  dayPart,
  pick,
  dateKey,
  gameDayKey,
  startOfWeekMonday,
  addDaysKey,
  secondsToClock,
  humanDuration,
  timeToMinutes,
  weekdayLabel,
  escapeHtml,
  formatNumber,
  formatDateLong,
  parseDateKey,
} from '../utils.js';
import { icon } from '../icons.js';
import { t, i18n } from '../i18n.js';

let els = {};
let tickHandler = null;

/** Giay con lai den het "ngay choi" (moc dayStartHour ke tiep). */
function secondsToDayEnd() {
  const now = new Date();
  const startHour = store.state.settings.dayStartHour;
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, 0, 0);
  if (end <= now) end.setDate(end.getDate() + 1);
  return Math.max(0, Math.floor((end - now) / 1000));
}

function greeting() {
  const part = dayPart();
  const name = store.state.profile.name || (i18n.lang === 'en' ? 'hero' : 'bạn');
  const key = 'dash.greeting.' + part;
  const greet = i18n.t(key);
  const msg = pick(ENCOURAGEMENT[part] || ENCOURAGEMENT.empty);
  return `${greet}, ${name}. ${msg}`;
}

/* ---------- Tung khu vuc ---------- */
function todaySection() {
  const p = dayProgress(store.state, store.todayKey());
  const hint =
    p.total === 0
      ? t('quest.emptyTitle')
      : p.done === p.total
        ? t('dash.allDone')
        : t('dash.perfectHint', { n: p.total - p.done });
  return `
    <div class="card today-card">
      <div class="ring" id="dashRing" style="--pct:${p.pct}"><span class="ring__label" id="dashRingLabel">${p.pct}%</span></div>
      <div class="today-card__info">
        <div class="today-card__label">${t('dash.progressToday')}</div>
        <div class="today-card__count" id="dashTodayCount">${p.done} / ${p.total} ${t('dash.questDone')}</div>
        <div class="today-card__hint" id="dashTodayHint">${escapeHtml(hint)}</div>
      </div>
    </div>`;
}

function bossSection() {
  const boss = scheduler.getBossQuest();
  const today = store.todayKey();
  if (!boss) {
    return `<div class="boss-card">
      <div class="boss-card__top"><span class="boss-tag">${icon('target', { size: 13 })}${t('dash.boss')}</span></div>
      <div class="boss-card__title">${i18n.lang === 'en' ? 'No boss today' : 'Hôm nay chưa có boss'}</div>
      <div class="boss-card__desc">${i18n.lang === 'en' ? 'Add quests, then a boss will appear.' : 'Thêm quest để boss xuất hiện.'}</div>
    </div>`;
  }
  const done = isQuestCompletedOn(store.state, boss, today);
  const p = dayProgress(store.state, today);
  const hp = done ? 0 : Math.max(5, 100 - p.pct);
  const xp = Math.round((boss.xp || DIFFICULTIES[boss.difficulty]?.xp || 30) * 2);
  const coin = (boss.coin || DIFFICULTIES[boss.difficulty]?.coin || 10) + 20;
  return `<div class="boss-card" id="dashBoss">
    <div class="boss-card__top">
      <span class="boss-tag">${icon('target', { size: 13 })}${t('dash.boss')}</span>
      <span class="boss-card__time" id="dashBossTime">${done ? '' : t('dash.remaining', { t: humanDuration(secondsToDayEnd()) })}</span>
    </div>
    <div class="boss-card__title">${escapeHtml(boss.title)}</div>
    <div class="boss-card__desc">${done ? (i18n.lang === 'en' ? 'Boss defeated! 🎉' : 'Boss đã bị hạ! 🎉') : t('dash.bossDesc', { xp, coin })}</div>
    <div class="hp-bar"><div class="hp-bar__fill" style="width:${hp}%"></div></div>
    <div class="boss-card__hp">${done ? 'HP 0%' : t('dash.bossHp', { n: hp })}</div>
    ${done ? '' : `<div class="row gap-2" style="margin-top:12px;position:relative;z-index:1">
      <button class="btn btn--sm btn--primary" data-boss-action="toggle" data-id="${boss.id}">${icon('sword')}${i18n.lang === 'en' ? 'Defeat boss' : 'Đánh boss'}</button>
      <button class="btn btn--sm btn--ghost" data-boss-action="reroll">${icon('refresh')}${t('dash.bossReroll')}</button>
    </div>`}`;
}

function questList() {
  const today = store.todayKey();
  const boss = scheduler.getBossQuest();
  let list = getTodayQuests(store.state, today);
  // boss len dau
  if (boss) list = [boss, ...list.filter((q) => q.id !== boss.id)];
  if (!list.length) {
    return emptyStateHtml({
      iconName: 'sword',
      title: t('quest.emptyTitle'),
      msg: t('quest.emptyMsg'),
      actionLabel: t('quest.new'),
      actionId: 'new-quest',
    });
  }
  return list
    .map((q) => questCardHtml(q, { dateKey: today, isBoss: boss && q.id === boss.id, draggable: false }))
    .join('');
}

function nextEventSection() {
  const today = store.todayKey();
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  const todays = eventsOnDay(store.state, today);
  const happening = todays.find((e) => timeToMinutes(e.start) <= cur && cur < timeToMinutes(e.end));
  const next = happening ? null : findNextEvent(store.state, today, now, 60);
  const ev = happening || (next && next.event);
  if (!ev) {
    return `<div class="card"><div class="card__title" style="font-size:var(--fs-400);color:var(--muted)">${t('dash.nextEvent')}</div>
      <div class="next-event__time" style="margin-top:8px">${t('dash.noEvent')}</div></div>`;
  }
  const dateLabel = happening || next.dateKey === today ? '' : `${escapeHtml(formatDateLong(parseDateKey(next.dateKey), i18n.lang))} · `;
  const ts = happening ? '' : `data-ts="${next.ts}"`;
  return `<div class="card" id="dashNext">
    <div class="card__title" style="font-size:var(--fs-300);color:var(--muted);font-weight:600">${happening ? t('sched.happening') : t('dash.nextEvent')}</div>
    <div class="next-event__time" style="margin-top:6px;font-size:var(--fs-600)">${escapeHtml(ev.title)}</div>
    <div class="muted" style="font-size:var(--fs-300)">${dateLabel}${ev.start} – ${ev.end}</div>
    <div class="next-event__count" id="dashNextCount" ${ts}>${happening ? '' : t('dash.remaining', { t: '00:00:00' })}</div>
  </div>`;
}

function streakSection() {
  const st = store.state.game.streak;
  const monday = startOfWeekMonday(new Date());
  const todayCal = gameDayKey(new Date(), store.state.settings.dayStartHour);
  let dots = '';
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = dateKey(d);
    const rec = store.state.dayRecords[key];
    const done = rec && ((rec.xpEarned || 0) > 0 || Object.values(rec.quests || {}).some((q) => q.done));
    const isToday = key === todayCal;
    dots += `<div class="sdot ${done ? 'is-done' : ''} ${isToday ? 'is-today' : ''}">${weekdayLabel(d.getDay(), i18n.lang, true)}</div>`;
  }
  return `<div class="card">
    <div class="streak-card__big">${icon('flame')}${i18n.lang === 'en' ? `${st.count}-day streak` : `Chuỗi ${st.count} ngày`}</div>
    <div class="muted" style="font-size:var(--fs-200);margin-top:4px">${st.freezes > 0 ? `${icon('shield', { size: 13 })} ${st.freezes} freeze` : `${t('common.streak')}: ${st.count}`}</div>
    <div class="streak-dots">${dots}</div>
  </div>`;
}

function unlockSection() {
  const todayCal = dateKey();
  const unlocked = Object.entries(store.state.game.achievements).filter(([, d]) => d === todayCal);
  if (!unlocked.length) {
    // goi y thanh tuu gan nhat chua mo
    const next = ACHIEVEMENTS.find((a) => !store.state.game.achievements[a.id]);
    if (!next) return '';
    return `<div class="card">
      <div class="muted" style="font-size:var(--fs-200);letter-spacing:var(--ls-wide);font-weight:700">${t('ach.locked').toUpperCase()}</div>
      <div class="card__title" style="margin-top:6px">${icon(next.icon, { size: 18 })} ${escapeHtml(i18n.lang === 'en' ? next.en : next.vi)}</div>
      <div class="muted" style="font-size:var(--fs-200);margin-top:4px">${escapeHtml(i18n.lang === 'en' ? next.descEn : next.descVi)}</div>
    </div>`;
  }
  const last = unlocked[unlocked.length - 1][0];
  const ach = ACHIEVEMENTS.find((a) => a.id === last);
  if (!ach) return '';
  return `<div class="card just-unlocked">
    <div class="just-unlocked__label">${t('dash.justUnlocked').toUpperCase()}</div>
    <div class="card__title" style="margin-top:6px">${icon(ach.icon, { size: 20 })} ${escapeHtml(i18n.lang === 'en' ? ach.en : ach.vi)}</div>
    <div class="muted" style="font-size:var(--fs-300);margin-top:4px">${escapeHtml(i18n.lang === 'en' ? ach.descEn : ach.descVi)}</div>
  </div>`;
}

/* ---------- Cap nhat dong (khong build lai ca trang) ---------- */
function updateDynamic() {
  if (!els.view || !document.contains(els.view)) return;
  const today = store.todayKey();
  const p = dayProgress(store.state, today);
  if (els.ring) els.ring.style.setProperty('--pct', p.pct);
  if (els.ringLabel) els.ringLabel.textContent = p.pct + '%';
  if (els.todayCount) els.todayCount.textContent = `${p.done} / ${p.total} ${t('dash.questDone')}`;
  if (els.todayHint) {
    els.todayHint.textContent = p.total === 0 ? t('quest.emptyTitle') : p.done === p.total ? t('dash.allDone') : t('dash.perfectHint', { n: p.total - p.done });
  }
  // dem nguoc su kien (dua vao timestamp tuyet doi trong data-ts)
  if (els.nextCount && els.nextCount.dataset.ts) {
    const secs = Math.max(0, Math.round((Number(els.nextCount.dataset.ts) - Date.now()) / 1000));
    els.nextCount.textContent = t('dash.remaining', { t: secondsToClock(secs) });
  }
  if (els.bossTime) {
    const boss = scheduler.getBossQuest();
    if (boss && !isQuestCompletedOn(store.state, boss, today)) {
      els.bossTime.textContent = t('dash.remaining', { t: humanDuration(secondsToDayEnd()) });
    }
  }
}

export const dashboardPage = {
  id: 'dashboard',
  icon: 'home',
  navKey: 'nav.dashboard',
  order: 1,

  title() {
    return t('nav.dashboard');
  },
  subtitle() {
    return greeting();
  },

  render(view) {
    els.view = view;
    view.innerHTML = `
      <div class="dash">
        <div class="dash__col dash__left">${todaySection()}${bossSection()}</div>
        <div class="dash__col dash__center">
          <div class="section-title">${t('dash.todayQuests')}</div>
          <div class="dash-list" id="dashQuestList">${questList()}</div>
        </div>
        <div class="dash__col dash__right">${nextEventSection()}${streakSection()}${unlockSection()}</div>
      </div>`;

    els.ring = view.querySelector('#dashRing');
    els.ringLabel = view.querySelector('#dashRingLabel');
    els.todayCount = view.querySelector('#dashTodayCount');
    els.todayHint = view.querySelector('#dashTodayHint');
    els.nextCount = view.querySelector('#dashNextCount');
    els.bossTime = view.querySelector('#dashBossTime');
    els.list = view.querySelector('#dashQuestList');

    attachQuestDelegation(els.list, {
      dateKey: store.todayKey(),
      allowDrag: false,
      onEdit: (q) => openQuestForm(q, { onDone: () => this.refreshList() }),
      onNeedRefresh: () => this.refreshList(),
    });

    // nut trong boss + empty action
    view.addEventListener('click', onDashClick);
    updateDynamic();
  },

  refreshList() {
    if (!els.list) return;
    els.list.innerHTML = questList();
    const boss = document.querySelector('#dashBoss');
    if (boss) boss.outerHTML = bossSection();
    els.bossTime = els.view.querySelector('#dashBossTime');
    updateDynamic();
  },

  onState() {
    updateDynamic();
  },

  onShow() {
    tickHandler = () => updateDynamic();
    document.addEventListener('clock:tick', tickHandler);
  },
  onHide() {
    if (tickHandler) document.removeEventListener('clock:tick', tickHandler);
    const view = els.view;
    if (view) view.removeEventListener('click', onDashClick);
  },
};

/** Xu ly nut boss + empty action (delegate tren view). */
function onDashClick(e) {
  const bossBtn = e.target.closest('[data-boss-action]');
  if (bossBtn) {
    const act = bossBtn.dataset.bossAction;
    if (act === 'reroll') {
      scheduler.rollBoss(true);
      dashboardPage.refreshList();
    } else if (act === 'toggle') {
      router.go('quests');
    }
    return;
  }
  const emptyBtn = e.target.closest('[data-empty-action="new-quest"]');
  if (emptyBtn) openQuestForm(null, { onDone: () => dashboardPage.refreshList() });
}
