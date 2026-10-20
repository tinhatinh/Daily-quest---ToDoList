/*
 * pages/stats.js - THONG KE
 * -------------------------
 * O so lieu tong hop + bieu do cot 7 ngay (canvas) + heatmap 12 tuan +
 * tien do theo category + ring ti le hoan thanh thang.
 */

import { store } from '../store.js';
import { dayProgress, getDueQuests, isQuestCompletedOn, categoryProgress } from '../selectors.js';
import { getLevelInfo } from '../gamification.js';
import { drawBarChart, renderHeatmap } from '../charts.js';
import { CATEGORIES } from '../constants.js';
import {
  gameDayKey,
  addDaysKey,
  dateKey,
  weekdayLabel,
  formatNumber,
  escapeHtml,
  pct,
} from '../utils.js';
import { icon } from '../icons.js';
import { t, i18n } from '../i18n.js';

function lastNDays(n) {
  const today = gameDayKey(new Date(), store.state.settings.dayStartHour);
  const arr = [];
  for (let i = n - 1; i >= 0; i--) {
    const key = addDaysKey(today, -i);
    arr.push(key);
  }
  return arr;
}

function tile(iconName, label, value, delta) {
  return `<div class="stat-tile">
    <div class="stat-tile__label">${icon(iconName, { size: 15 })}${escapeHtml(label)}</div>
    <div class="stat-tile__value">${escapeHtml(String(value))}</div>
    ${delta ? `<div class="stat-tile__delta">${escapeHtml(delta)}</div>` : ''}
  </div>`;
}

export const statsPage = {
  id: 'stats',
  icon: 'barChart',
  navKey: 'nav.stats',
  order: 5,

  title() {
    return t('nav.stats');
  },
  subtitle() {
    return t('stats.overview');
  },

  render(view) {
    const s = store.state;
    const info = getLevelInfo(s);
    const today = gameDayKey(new Date(), s.settings.dayStartHour);

    // 7 ngay gan nhat: XP kiem duoc
    const days = lastNDays(7);
    const barData = days.map((k) => {
      const rec = s.dayRecords[k];
      const d = parseLocalDate(k);
      return { label: weekdayLabel(d.getDay(), i18n.lang, true), value: rec ? rec.xpEarned || 0 : 0 };
    });

    // heatmap 12 tuan: so quest hoan thanh/ngay
    const heatDays = lastNDays(12 * 7).map((k) => {
      const rec = s.dayRecords[k];
      const done = rec ? Object.values(rec.quests || {}).filter((q) => q.done).length : 0;
      return { key: k, value: done };
    });

    // thang: ti le hoan thanh toan bo quest trong thang
    const monthKeys = monthDays();
    let mTotal = 0;
    let mDone = 0;
    for (const k of monthKeys) {
      const due = getDueQuests(s, k);
      mTotal += due.length;
      mDone += due.filter((q) => isQuestCompletedOn(s, q, k)).length;
    }
    const monthPct = pct(mDone, mTotal);

    const catProg = categoryProgress(s, today);

    view.innerHTML = `
      <div class="stat-cards">
        ${tile('zap', t('stats.xpEarned'), formatNumber(s.game.totalXp), `${t('common.level')} ${info.level}`)}
        ${tile('sword', t('stats.questsDone'), formatNumber(s.stats.totalQuests || 0))}
        ${tile('flame', t('stats.bestStreak'), (s.stats.maxStreak || 0) + ' ' + t('common.days'))}
        ${tile('star', t('stats.perfectDays'), s.stats.perfectDays || 0)}
      </div>
      <div class="grid cols-2" style="margin-bottom:20px">
        <div class="chart-wrap">
          <div class="section-title">${t('stats.last7')}</div>
          <canvas id="bar7" height="220"></canvas>
        </div>
        <div class="chart-wrap">
          <div class="section-title">${t('stats.completionRate')} (${t('common.level')} thang)</div>
          <div class="row center" style="gap:24px;padding:14px 0">
            <div class="ring" style="--pct:${monthPct}"><span class="ring__label">${monthPct}%</span></div>
            <div class="stack gap-2">
              <div class="muted">${escapeHtml(t('stats.questsDone'))}</div>
              <div style="font-size:var(--fs-700);font-weight:800">${mDone} / ${mTotal}</div>
              <div class="muted" style="font-size:var(--fs-200)">${i18n.lang === 'en' ? 'this month' : 'tháng này'}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="chart-wrap" style="margin-bottom:20px">
        <div class="section-title">${t('stats.heatmap')}</div>
        <div class="heatmap" id="heatmap"></div>
      </div>
      <div class="chart-wrap">
        <div class="section-title">${t('stats.byCategory')} · ${t('common.today')}</div>
        ${renderCatBars(catProg)}
      </div>`;

    requestAnimationFrame(() => {
      const canvas = view.querySelector('#bar7');
      if (canvas) drawBarChart(canvas, barData, { height: 220 });
      const hm = view.querySelector('#heatmap');
      if (hm) renderHeatmap(hm, heatDays);
    });
  },

  onState() {
    this.render(document.getElementById('view'));
  },
};

function renderCatBars(catProg) {
  const entries = Object.entries(catProg);
  if (!entries.length) return `<div class="muted" style="padding:12px 0">${t('quest.emptyTitle')}</div>`;
  return entries
    .map(([cat, v]) => {
      const c = CATEGORIES[cat] || CATEGORIES.life;
      const p = pct(v.done, v.total);
      const label = i18n.lang === 'en' ? c.en : c.vi;
      return `<div class="cat-progress-row">
        <div class="cat-progress-row__name" style="--c:${c.color}"><span class="cat-dot" style="--c:${c.color}"></span>${escapeHtml(label)}</div>
        <div class="progress grow"><div class="progress__fill" style="width:${p}%;background:${c.color}"></div></div>
        <div class="muted nowrap" style="font-size:var(--fs-200);width:64px;text-align:right">${v.done}/${v.total}</div>
      </div>`;
    })
    .join('');
}

function parseLocalDate(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Cac ngay trong thang hien tai (den hom nay). */
function monthDays() {
  const today = gameDayKey(new Date(), store.state.settings.dayStartHour);
  const d = parseLocalDate(today);
  const arr = [];
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  for (let x = new Date(first); x <= d; x.setDate(x.getDate() + 1)) arr.push(dateKey(x));
  return arr;
}
