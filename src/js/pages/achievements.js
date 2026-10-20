/*
 * pages/achievements.js - THANH TUU
 * ---------------------------------
 * Luoi toan bo thanh tuu. Mo khoa hien sac mau vang + ngay mo; chua mo thi
 * mong + icon khoa. Hien tong so da mo phia tren.
 */

import { store } from '../store.js';
import { ACHIEVEMENTS, ACHIEVEMENT_TIERS } from '../constants.js';
import { escapeHtml } from '../utils.js';
import { icon } from '../icons.js';
import { t, i18n } from '../i18n.js';

export const achievementsPage = {
  id: 'achievements',
  icon: 'trophy',
  navKey: 'nav.achievements',
  order: 6,

  title() {
    return t('nav.achievements');
  },
  subtitle() {
    const unlocked = Object.keys(store.state.game.achievements).length;
    return t('ach.unlocked', { a: unlocked, b: ACHIEVEMENTS.length });
  },

  render(view) {
    const unlocked = store.state.game.achievements;
    const count = Object.keys(unlocked).length;

    const cards = ACHIEVEMENTS.map((a) => {
      const isOpen = !!unlocked[a.id];
      const tier = ACHIEVEMENT_TIERS[a.tier] || ACHIEVEMENT_TIERS.bronze;
      const name = i18n.lang === 'en' ? a.en : a.vi;
      const desc = i18n.lang === 'en' ? a.descEn : a.descVi;
      return `<div class="ach ${isOpen ? 'is-unlocked' : 'is-locked'}">
        <div class="ach__icon">
          ${icon(a.icon, { size: 30 })}
          <span class="ach__tier" style="color:${tier.color}">${escapeHtml(i18n.lang === 'en' ? a.tier : tier.vi)}</span>
          ${isOpen ? '' : `<span class="ach__lock">${icon('lock', { size: 12 })}</span>`}
        </div>
        <div class="ach__name">${escapeHtml(name)}</div>
        <div class="ach__desc">${escapeHtml(desc)}</div>
        ${isOpen ? `<div class="ach__date">${icon('checkCircle', { size: 12 })} ${unlocked[a.id]}</div>` : `<div class="muted" style="font-size:var(--fs-100)">${t('ach.locked')}</div>`}
      </div>`;
    }).join('');

    view.innerHTML = `
      <div class="row between wrap gap-3" style="margin-bottom:18px">
        <div class="stat-chip stat-chip--level" style="padding:10px 16px">
          <div class="level-avatar" style="background:var(--grad-coin)">${count}</div>
          <div class="level-meta" style="min-width:auto">
            <div style="font-weight:700">${t('ach.unlocked', { a: count, b: ACHIEVEMENTS.length })}</div>
            <div class="progress progress--thin" style="width:160px"><div class="progress__fill" style="width:${Math.round((count / ACHIEVEMENTS.length) * 100)}%"></div></div>
          </div>
        </div>
      </div>
      <div class="ach-grid">${cards}</div>`;
  },

  onState() {
    this.render(document.getElementById('view'));
  },
};
