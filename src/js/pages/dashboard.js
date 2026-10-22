/*
 * pages/dashboard.js - TRANG BANG DIEU KHIEN
 * -------------------------------------------
 * 3 cot: trai (banner Hero Mentor + the ac nhan boss), giua (danh sach quest
 * hom nay), phai (su kien tiep theo + streak + thanh tuu vua mo).
 * Tuong anh hung doi hanh vi theo tien do (All Might "xuong dap" khi chua
 * lam duoc gi), bam vao no de nghe cau noi + ra don. Cap nhat dem nguoc +
 * ring theo thoi gian qua su kien 'clock:tick'.
 */

import { store } from '../store.js';
import {
  dayProgress,
  getTodayQuests,
  scheduleStatus,
  isQuestCompletedOn,
  eventsOnDay,
} from '../selectors.js';
import { findNextEvent } from '../recurrence.js';
import { scheduler } from '../scheduler.js';
import { questCardHtml, attachQuestDelegation, emptyStateHtml, handleQuestFeedback } from '../components.js';
import { openQuestForm } from '../questForm.js';
import { ACHIEVEMENTS, ENCOURAGEMENT, DIFFICULTIES } from '../constants.js';
import { completeQuest } from '../gamification.js';
import { audio } from '../audio.js';
import { getHero, heroLine, pickSmash } from '../heroes.js';
import { heroPortrait, villainPortrait, playSmash } from '../heroArt.js';
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
  const heroId = store.state.settings.heroStyle || 'allmight';
  // loi tho cua anh hung dung dau, neu trang moi dung loi nhan chung
  const msg = heroLine(heroId, part) || pick(ENCOURAGEMENT[part] || ENCOURAGEMENT.empty);
  return `${greet}, ${name}. ${msg}`;
}

/* ---------- Tung khu vuc ---------- */
/**
 * Banner "Hero Mentor": tuong anh hung + loi tho theo dien bien trong ngay
 * + vong tien do. All Might xuong dap (dang Toshinori) khi chua lam duoc gi.
 */
function heroBannerSection() {
  const p = dayProgress(store.state, store.todayKey());
  const heroId = store.state.settings.heroStyle || 'allmight';
  const hero = getHero(heroId);
  const boss = scheduler.getBossQuest();
  const bossAlive = !!boss && !isQuestCompletedOn(store.state, boss, store.todayKey());
  const mood = heroMood(p, bossAlive);
  const skinny = (heroId === 'allmight' || heroId === 'custom') && p.pct === 0;
  const hint =
    p.total === 0
      ? t('quest.emptyTitle')
      : p.done === p.total
        ? t('dash.allDone')
        : t('dash.perfectHint', { n: p.total - p.done });

  return `
    <div class="hero-banner" id="heroBanner" data-mood="${mood}">
      <button class="hero-banner__art" id="heroSay" type="button" data-tip="${i18n.lang === 'en' ? 'Ask for a line' : 'Bam de nghe mot cau'}" aria-label="${escapeHtml(hero.heroName)}">
        <span class="hero-banner__ring"></span>
        ${heroPortrait(heroId, { size: 118, mood, skinny })}
      </button>
      <div class="hero-banner__body">
        <div class="hero-nameplate">${icon('badge', { size: 13 })}<span>${escapeHtml(hero.heroName)}</span><span class="hero-nameplate__alias">${escapeHtml(i18n.lang === 'en' ? hero.aliasEn : hero.aliasVi)}</span></div>
        <div class="hero-speech" id="heroSpeech">${escapeHtml(heroLine(heroId, speechKey(p, bossAlive)) || greetingLine())}</div>
        <div class="hero-speech__meta">
          <span id="dashTodayCount">${p.done} / ${p.total} ${t('dash.questDone')}</span>
          <span aria-hidden="true">·</span>
          <span id="dashTodayHint">${escapeHtml(hint)}</span>
        </div>
      </div>
      <div class="ring" id="dashRing" style="--pct:${p.pct}"><span class="ring__label" id="dashRingLabel">${p.pct}%</span></div>
    </div>`;
}

/** Nguyen canh chon loi tho. */
function speechKey(p, bossAlive) {
  if (!p.total) return 'empty';
  if (p.done === p.total) return 'allDone';
  if (bossAlive) return 'boss';
  const part = dayPart();
  if (part === 'lateNight' && p.done < p.total) return 'almostDayOver';
  return part;
}

/** Hanh vi cua tuong anh hung theo tien do. */
function heroMood(p, bossAlive) {
  if (p.total && p.pct >= 100) return 'cheer';
  if (bossAlive) return 'serious';
  if (!p.total || p.pct === 0) return 'tired';
  if (p.pct < 40) return 'tired';
  return 'idle';
}

/** Loi tho mac dinh = loi chao theo buoi (co the duoc ghi de). */
function greetingLine() {
  return heroLine(store.state.settings.heroStyle || 'allmight', dayPart()) || greeting();
}

function bossSection() {
  const heroId = store.state.settings.heroStyle || 'allmight';
  const hero = getHero(heroId);
  const boss = scheduler.getBossQuest();
  const today = store.todayKey();
  if (!boss) {
    return `<div class="villain-card villain-card--calm">
      <div class="villain-card__top"><span class="villain-tag">${icon('shield', { size: 13 })}${t('dash.calm')}</span></div>
      <div class="villain-card__title">${i18n.lang === 'en' ? 'A quiet city today' : 'Hôm nay thành phố bình yên'}</div>
      <div class="villain-card__desc">${i18n.lang === 'en' ? 'Add quests and a villain will show up.' : 'Thêm quest để ác nhân xuất hiện.'}</div>
    </div>`;
  }
  const done = isQuestCompletedOn(store.state, boss, today);
  const p = dayProgress(store.state, today);
  const hp = done ? 0 : Math.max(5, 100 - p.pct);
  const xp = Math.round((boss.xp || DIFFICULTIES[boss.difficulty]?.xp || 30) * 2);
  const coin = (boss.coin || DIFFICULTIES[boss.difficulty]?.coin || 10) + 20;
  return `<div class="villain-card ${done ? 'is-dead' : ''}" id="dashBoss">
    <div class="villain-card__top">
      <span class="villain-tag">${icon('skull', { size: 13 })}${t('dash.boss')}</span>
      <span class="villain-card__time" id="dashBossTime">${done ? '' : t('dash.remaining', { t: humanDuration(secondsToDayEnd()) })}</span>
    </div>
    <div class="villain-card__title">${escapeHtml(boss.title)}</div>
    <div class="villain-card__desc">${done ? (i18n.lang === 'en' ? 'Villain defeated! 🎉' : 'Ác nhân đã bị hạ! 🎉') : t('dash.bossDesc', { xp, coin })}</div>
    <div class="vp-bar">
      <div class="vp-bar__fill" style="width:${hp}%"></div>
      <div class="vp-bar__label">${done ? 'K.O.' : 'HP ' + hp + '%'}</div>
    </div>
    ${done ? '' : `<div class="row gap-2" style="margin-top:14px">
      <button class="btn btn--sm btn--primary" data-boss-action="toggle" data-id="${boss.id}">${icon('sword')}${i18n.lang === 'en' ? 'Defeat boss' : 'Đánh boss'}</button>
      <button class="btn btn--sm btn--ghost" data-boss-action="reroll">${icon('refresh')}${t('dash.bossReroll')}</button>
    </div>`}
    <div class="villain-card__art">${villainPortrait(heroId, { size: 128 })}</div>
  </div>`;
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
        <div class="dash__hero">${heroBannerSection()}</div>
        <div class="dash__col dash__left">${bossSection()}</div>
        <div class="dash__col dash__center">
          <div class="section-title">${t('dash.todayQuests')}</div>
          <div class="dash-list" id="dashQuestList">${questList()}</div>
        </div>
        <div class="dash__col dash__right">${nextEventSection()}${streakSection()}${unlockSection()}</div>
      </div>`;

    this.cacheEls();
    els.nextCount = view.querySelector('#dashNextCount');
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

  /** Cam lai cac node dong cua banner / boss (outerHTML thay doi lien tuc). */
  cacheEls() {
    const view = els.view;
    if (!view) return;
    els.ring = view.querySelector('#dashRing');
    els.ringLabel = view.querySelector('#dashRingLabel');
    els.todayCount = view.querySelector('#dashTodayCount');
    els.todayHint = view.querySelector('#dashTodayHint');
    els.bossTime = view.querySelector('#dashBossTime');
  },

  refreshList() {
    if (!els.list) return;
    els.list.innerHTML = questList();
    const boss = els.view.querySelector('#dashBoss');
    if (boss) boss.outerHTML = bossSection();
    // tuong anh hung cung doi theo dien bien trong ngay
    const banner = els.view.querySelector('#heroBanner');
    if (banner) banner.outerHTML = heroBannerSection();
    this.cacheEls();
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
      smashBoss(bossBtn);
    }
    return;
  }
  const say = e.target.closest('#heroSay');
  if (say) {
    heroSay(say);
    return;
  }
  const emptyBtn = e.target.closest('[data-empty-action="new-quest"]');
  if (emptyBtn) openQuestForm(null, { onDone: () => dashboardPage.refreshList() });
}

/** Bam tuong anh hung -> ra don + noi mot cau khac. */
const SAY_KEYS = ['morning', 'midday', 'afternoon', 'evening', 'lateNight', 'allDone', 'levelUp', 'combo', 'boss', 'almostDayOver'];
function heroSay(node) {
  const heroId = store.state.settings.heroStyle || 'allmight';
  const r = node.getBoundingClientRect();
  const speech = els.view && els.view.querySelector('#heroSpeech');
  if (speech) {
    const line = heroLine(heroId, SAY_KEYS[Math.floor(Math.random() * SAY_KEYS.length)]) || greeting();
    speech.textContent = line;
  }
  audio.play('ultra');
  playSmash({
    x: r.left + r.width / 2,
    y: r.top + r.height * 0.45,
    hero: heroId,
    text: pickSmash(heroId),
    power: 1.1,
  });
  node.classList.remove('is-hit');
  void node.offsetWidth;
  node.classList.add('is-hit');
  const banner = els.view && els.view.querySelector('#heroBanner');
  if (banner) {
    banner.classList.remove('is-cheer');
    void banner.offsetWidth;
    banner.classList.add('is-cheer');
    setTimeout(() => banner.classList.remove('is-cheer'), 900);
  }
}

/** "Danh boss" ngay tren banner: ac nhan rung + khuynh. */
function smashBoss(btn) {
  const boss = scheduler.getBossQuest();
  if (!boss) return;
  const card = btn.closest('.villain-card');
  const r = btn.getBoundingClientRect();
  const pt = { x: r.left + r.width / 2, y: r.top };
  card && card.classList.add('is-hit');
  const out = completeQuest(boss.id);
  handleQuestFeedback(out, boss, { ...pt, node: card });
  setTimeout(() => {
    if (card) {
      card.classList.remove('is-hit');
      card.classList.add('is-dead');
    }
  }, 320);
  setTimeout(() => dashboardPage.refreshList(), 950);
}
