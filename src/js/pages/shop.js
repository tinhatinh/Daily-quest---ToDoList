/*
 * pages/shop.js - CUA HANG PHAN THUONG
 * ------------------------------------
 * Nguoi dung tu dinh nghia phan thuong (ten, cost coin, emoji, mo ta) va
 * "doi" bang coin kiem duoc. Doi = tru coin + tang lan doi + hoi phan.
 */

import { store } from '../store.js';
import { redeemReward, getLevelInfo } from '../gamification.js';
import { uid, escapeHtml, formatNumber } from '../utils.js';
import { icon } from '../icons.js';
import { t, i18n } from '../i18n.js';
import { audio } from '../audio.js';
import { openModal, toast, confetti, toastAchievement } from '../ui.js';

function rewardHtml(r) {
  const afford = store.state.game.coin >= r.cost;
  return `<div class="reward">
    <div class="reward__icon">${escapeHtml(r.icon || '🎁')}</div>
    <div class="reward__name">${escapeHtml(r.name)}</div>
    <div class="reward__desc">${escapeHtml(r.description || '')}</div>
    <div class="reward__foot">
      <span class="reward__cost">${icon('coin', { size: 15 })}${formatNumber(r.cost)}</span>
      <div class="row gap-1">
        <button class="icon-btn" data-act="edit" data-id="${r.id}" aria-label="${t('common.edit')}">${icon('edit')}</button>
        <button class="icon-btn" data-act="del" data-id="${r.id}" aria-label="${t('common.delete')}">${icon('trash')}</button>
        <button class="btn btn--sm ${afford ? 'btn--primary' : 'btn--subtle'}" data-act="redeem" data-id="${r.id}" ${afford ? '' : 'disabled'}>${t('shop.redeem')}</button>
      </div>
    </div>
    ${r.redeemed ? `<div class="muted" style="font-size:var(--fs-100)">${t('shop.redeemed', { n: r.redeemed })}</div>` : ''}
  </div>`;
}

function gridHtml() {
  const items = store.state.shop;
  if (!items.length) {
    return `<div class="empty"><div class="empty__art">${icon('gift', { size: 44 })}</div>
      <div class="empty__title">${t('shop.emptyTitle')}</div><div class="empty__msg">${t('shop.emptyMsg')}</div></div>`;
  }
  return items.map(rewardHtml).join('');
}

function update() {
  const grid = document.getElementById('shop-grid');
  const bal = document.getElementById('shop-balance');
  if (grid) grid.innerHTML = gridHtml();
  if (bal) bal.textContent = formatNumber(store.state.game.coin);
}

/** Mo hop them/sua phan thuong. */
function openRewardForm(reward = null) {
  const isNew = !reward;
  const d = reward || {};
  const body = document.createElement('div');
  body.className = 'stack gap-4';
  body.innerHTML = `
    <div class="form-grid">
      <div class="field"><label class="field__label">${i18n.lang === 'en' ? 'Name' : 'Tên'}</label><input class="input" id="rw-name" value="${escapeHtml(d.name || '')}" maxlength="60" /></div>
      <div class="field"><label class="field__label">${i18n.lang === 'en' ? 'Cost (coins)' : 'Giá (coin)'}</label><input class="input" id="rw-cost" type="number" min="1" value="${d.cost ?? 50}" /></div>
    </div>
    <div class="form-grid">
      <div class="field"><label class="field__label">${i18n.lang === 'en' ? 'Emoji' : 'Biểu tượng'}</label><input class="input" id="rw-icon" value="${escapeHtml(d.icon || '🎁')}" maxlength="4" /></div>
      <div class="field"><label class="field__label">${t('common.description')}</label><input class="input" id="rw-desc" value="${escapeHtml(d.description || '')}" maxlength="120" /></div>
    </div>`;
  const foot = document.createElement('div');
  foot.className = 'row gap-3 end';
  foot.style.width = '100%';
  foot.innerHTML = `<button class="btn btn--ghost" data-x>${t('common.cancel')}</button><button class="btn btn--primary" data-save>${t('common.save')}</button>`;
  body.appendChild(foot);
  const ctl = openModal({ title: isNew ? t('shop.newReward') : t('common.edit'), bodyNode: body });
  ctl.node.querySelector('.modal__foot')?.remove();
  const $ = (s) => body.querySelector(s);
  $('[data-x]').addEventListener('click', () => ctl.close());
  $('[data-save]').addEventListener('click', () => {
    const name = $('#rw-name').value.trim();
    if (!name) {
      $('#rw-name').focus();
      return;
    }
    const data = { name, cost: Math.max(1, Number($('#rw-cost').value) || 1), icon: $('#rw-icon').value.trim() || '🎁', description: $('#rw-desc').value.trim() };
    if (isNew) store.update((st) => st.shop.push({ id: uid('r'), redeemed: 0, ...data }), { undoable: true, reason: 'add-reward' });
    else store.update((st) => Object.assign(st.shop.find((x) => x.id === d.id) || {}, data), { undoable: true, reason: 'edit-reward' });
    audio.play('click');
    ctl.close();
    update();
  });
}

export const shopPage = {
  id: 'shop',
  icon: 'shoppingBag',
  navKey: 'nav.shop',
  order: 7,

  title() {
    return t('nav.shop');
  },
  subtitle() {
    return t('shop.yourCoins') + ': ' + formatNumber(store.state.game.coin) + ' ' + t('common.coin');
  },

  render(view) {
    view.innerHTML = `
      <div class="toolbar">
        <div class="stat-chip stat-chip--coin" style="font-size:var(--fs-400)">
          ${icon('coin', { size: 18 })}<span id="shop-balance">${formatNumber(store.state.game.coin)}</span> ${t('common.coin')}
        </div>
        <div class="toolbar__end">
          <button class="btn btn--primary" id="shop-new">${icon('plus')}${t('shop.newReward')}</button>
        </div>
      </div>
      <div class="reward-grid" id="shop-grid">${gridHtml()}</div>`;

    view.querySelector('#shop-new').addEventListener('click', () => openRewardForm(null));
    view.querySelector('#shop-grid').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const id = btn.dataset.id;
      const act = btn.dataset.act;
      const item = store.state.shop.find((x) => x.id === id);
      if (act === 'redeem' && item) doRedeem(item, btn);
      else if (act === 'edit' && item) openRewardForm(item);
      else if (act === 'del') {
        store.update((st) => (st.shop = st.shop.filter((x) => x.id !== id)), { undoable: true, reason: 'del-reward' });
        update();
      }
    });
  },

  onState() {
    update();
  },
};

/** Xu ly doi thuong + hieu ung. */
function doRedeem(item, btn) {
  const out = redeemReward(item.id);
  if (!out.ok) {
    if (out.reason === 'poor') {
      audio.play('error');
      toast({ type: 'error', title: t('shop.notEnough'), msg: `${item.name} · ${t('shop.yourCoins')}: ${formatNumber(store.state.game.coin)}`, iconName: 'coin' });
    }
    return;
  }
  audio.play('coin');
  const r = btn.getBoundingClientRect();
  confetti(r.left + r.width / 2, r.top, 40);
  toast({ type: 'success', title: t('toast.redeemed', { name: item.name }), iconName: 'gift' });
  (out.achievements || []).forEach((ach) => {
    audio.play('achievement');
    toastAchievement(ach, i18n.lang);
  });
  update();
}
