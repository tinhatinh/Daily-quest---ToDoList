/*
 * components.js - KET XAY UI DUNG CHUNG + HOI PHU GAME
 * -----------------------------------------------------
 * - Ham sinh HTML: pill category/difficulty, the quest, subtask panel, empty
 *   state, chip header (streak/coin/level).
 * - attachQuestDelegation(): xu ly click (tick/sua/xoa/mo subtask) + keo tha
 *   doi thu tu cho moi container chua quest card.
 * - handleQuestFeedback(): tap trung hieu ung (XP bay, confetti, level-up,
 *   combo, toast thanh tuu, am thanh) sau khi hoan thanh quest.
 */

import { store } from './store.js';
import {
  CATEGORIES,
  DIFFICULTIES,
  PRIORITIES,
} from './constants.js';
import { getHero, pickSmash, heroRank } from './heroes.js';
import { playSmash, playBanner, playRankUp, stampQuest } from './heroArt.js';
import {
  questSubtasks,
  isQuestCompletedOn,
  findQuest,
} from './selectors.js';
import { completeQuest, reopenQuest, toggleSubtask, getLevelInfo } from './gamification.js';
import { escapeHtml, formatNumber, timeToMinutes, formatDateShort } from './utils.js';
import { icon } from './icons.js';
import { t, i18n } from './i18n.js';
import { audio } from './audio.js';
import {
  toast,
  toastAchievement,
  xpFloat,
  sparkAt,
  confetti,
  confettiCannons,
  levelUpOverlay,
  comboHud,
  confirmDialog,
} from './ui.js';

/* ============================ PILLS ============================ */
export function catPill(categoryId) {
  const c = CATEGORIES[categoryId] || CATEGORIES.life;
  const label = i18n.lang === 'en' ? c.en : c.vi;
  return `<span class="pill pill--cat cat-${c.id}">${icon(c.icon, { size: 12 })}${escapeHtml(label)}</span>`;
}
export function diffPill(difficultyId) {
  const d = DIFFICULTIES[difficultyId] || DIFFICULTIES.normal;
  const label = i18n.lang === 'en' ? d.en : d.vi;
  return `<span class="pill pill--diff diff-${d.id}">${escapeHtml(label)}</span>`;
}
export function priorityChip(priorityId) {
  const p = PRIORITIES[priorityId];
  if (!p || priorityId === 'medium') return '';
  return `<span class="pill pill--soft" style="color:${p.color}">${icon('flag', { size: 11 })}${escapeHtml(i18n.lang === 'en' ? p.en : p.vi)}</span>`;
}
export function deadlineChip(hhmm) {
  const m = timeToMinutes(hhmm);
  if (m == null) return '';
  const soon = m - (new Date().getHours() * 60 + new Date().getMinutes());
  const color = soon < 0 ? 'var(--danger)' : soon < 60 ? 'var(--warning)' : 'var(--muted)';
  return `<span class="pill pill--soft" style="color:${color}">${icon('clock', { size: 11 })}${escapeHtml(hhmm)}</span>`;
}

/** Chip ngay den han (dueDate), do mau neu qua han. */
export function dueChip(dueDate) {
  if (!dueDate) return '';
  const today = store.todayKey();
  const overdue = dueDate < today;
  const color = overdue ? 'var(--danger)' : 'var(--muted)';
  return `<span class="pill pill--soft" style="color:${color}" data-tip="${overdue ? 'Quá hạn' : 'Hạn nộp'}">${icon('calendar', { size: 11 })}${escapeHtml(formatDateShort(dueDate))}</span>`;
}
export function tagsHtml(tags) {
  if (!tags || !tags.length) return '';
  return tags.slice(0, 4).map((x) => `<span class="tag">${escapeHtml(x)}</span>`).join('');
}

/* ============================ QUEST CARD ============================ */
/**
 * Sinh HTML cho 1 quest card.
 * @param {object} quest
 * @param {object} ctx {dateKey, isBoss, selected, draggable}
 */
export function questCardHtml(quest, ctx = {}) {
  const { dateKey = store.todayKey(), isBoss = false, selected = false, draggable = false } = ctx;
  const done = isQuestCompletedOn(store.state, quest, dateKey);
  const subs = questSubtasks(quest);
  const rec = store.state.dayRecords[dateKey];
  const entry = rec && rec.quests && rec.quests[quest.id];
  const subDone = subs.filter((s) => entry && entry.subtasks && entry.subtasks[s.id]).length;
  const subPct = subs.length ? Math.round((subDone / subs.length) * 100) : 0;
  const xp = Math.round(quest.xp || DIFFICULTIES[quest.difficulty]?.xp || 0);

  return `
  <div class="qcard ${done ? 'is-done' : ''} ${selected ? 'is-selected' : ''} ${isBoss ? 'is-boss' : ''}"
       data-id="${quest.id}" ${draggable ? 'draggable="true"' : ''}>
    ${draggable ? `<div class="qcard__drag" data-tip="Kéo để sắp xếp">${icon('grip', { size: 16 })}</div>` : ''}
    <button class="check ${done ? 'is-done' : ''}" data-action="toggle" data-id="${quest.id}"
            aria-label="${done ? t('quest.reopen') : t('quest.complete')}" aria-pressed="${done}">
      ${icon('check')}
    </button>
    <div class="qcard__body">
      <div class="qcard__title">${isBoss ? `${icon('target', { size: 14, cls: 'boss-inline' })}` : ''}${escapeHtml(quest.title)}</div>
      ${quest.description ? `<div class="qcard__desc">${escapeHtml(quest.description)}</div>` : ''}
      <div class="qcard__meta">
        ${catPill(quest.category)}${diffPill(quest.difficulty)}${priorityChip(quest.priority)}${deadlineChip(quest.deadline)}${dueChip(quest.dueDate)}
        ${tagsHtml(quest.tags)}
      </div>
    </div>
    <div class="qcard__right">
      ${subs.length ? `<button class="qcard__sub-progress" data-action="expand" data-id="${quest.id}" data-tip="${subDone}/${subs.length} subtasks">
          <div class="progress progress--thin"><div class="progress__fill" style="width:${subPct}%"></div></div>
        </button>` : ''}
      <span class="qcard__xp">+${xp} XP</span>
      <div class="qcard__actions">
        <button class="icon-btn" data-action="edit" data-id="${quest.id}" aria-label="${t('common.edit')}">${icon('edit')}</button>
        <button class="icon-btn" data-action="delete" data-id="${quest.id}" aria-label="${t('common.delete')}">${icon('trash')}</button>
      </div>
    </div>
  </div>`;
}

/** Panel subtask mo rong duoi card. */
export function subtaskPanelHtml(quest, dateKey = store.todayKey()) {
  const subs = questSubtasks(quest);
  const rec = store.state.dayRecords[dateKey];
  const entry = rec && rec.quests && rec.quests[quest.id];
  const done = subs.filter((s) => entry && entry.subtasks && entry.subtasks[s.id]).length;
  const items = subs
    .map((s) => {
      const sd = entry && entry.subtasks && entry.subtasks[s.id];
      return `<li class="subtask ${sd ? 'is-done' : ''}">
        <button class="check ${sd ? 'is-done' : ''}" data-action="subtask" data-id="${quest.id}" data-sub="${s.id}" aria-label="subtask">${icon('check')}</button>
        <span class="subtask__title">${escapeHtml(s.title)}</span>
      </li>`;
    })
    .join('');
  return `<div class="subtask-panel" data-panel="${quest.id}">
    <div class="subtask-panel__head">
      <div class="section-title" style="margin:0">${escapeHtml(quest.title)} · ${t('common.subtasks')}</div>
      <div class="muted">${done} / ${subs.length} ${t('common.done').toLowerCase()}</div>
    </div>
    <ul class="subtask-list">${items}</ul>
  </div>`;
}

/* ============================ EMPTY STATE ============================ */
export function emptyStateHtml({ iconName = 'sparkles', title = '', msg = '', actionLabel = '', actionId = '' }) {
  return `<div class="empty">
    <div class="empty__art">${icon(iconName, { size: 44 })}</div>
    <div class="empty__title">${escapeHtml(title)}</div>
    ${msg ? `<div class="empty__msg">${escapeHtml(msg)}</div>` : ''}
    ${actionLabel ? `<button class="btn btn--primary" data-empty-action="${actionId}">${icon('plus')}${escapeHtml(actionLabel)}</button>` : ''}
  </div>`;
}

/* ============================ HEADER CHIPS ============================ */
/** HTML 3 chip tren topbar: streak / coin / hang anh hung + XP. */
export function topStatsHtml(state = store.state) {
  const g = state.game;
  const info = getLevelInfo(state);
  const streakIcon = icon('flame', { size: 16 });
  const coinIcon = icon('coin', { size: 16 });
  const rank = heroRank(info.level, i18n.lang);
  return `
    <div class="stat-chip stat-chip--streak" data-tip="${t('common.streak')}">
      ${streakIcon}<span>${g.streak.count} ${t('common.days')}</span>
    </div>
    <div class="stat-chip stat-chip--coin" data-tip="${t('nav.shop')}">
      ${coinIcon}<span>${formatNumber(g.coin)} ${t('common.coin')}</span>
    </div>
    <div class="stat-chip stat-chip--level" data-tip="${t('hero.rank')}">
      <div class="level-avatar">${state.profile.avatar || '🦊'}</div>
      <div class="level-meta">
        <div class="level-meta__top">
          <span class="hero-tier" data-tier="${rank.tier}">${escapeHtml(rank.tier)}</span>
          <span><b>${escapeHtml(rank.label)}</b> · ${formatNumber(info.xp)} / ${formatNumber(info.need)} ${t('common.xp')}</span>
        </div>
        <div class="progress progress--xp progress--thin"><div class="progress__fill" style="width:${info.pct}%"></div></div>
      </div>
    </div>`;
}

/* =========================================================================
   HOI PHU GAME sau khi hoan thanh quest
   ========================================================================= */
/**
 * @param {object} out ket qua tu completeQuest()
 * @param {object} quest
 * @param {{x:number,y:number,node:HTMLElement|null}} pt toa do click + the quest (de dong "SMASHED")
 */
export function handleQuestFeedback(out, quest, pt = { x: innerWidth / 2, y: innerHeight / 2 }) {
  if (!out || !out.ok) {
    if (out && out.alreadyDone) return;
    return;
  }
  const heroId = currentHeroId();
  const hero = getHero(heroId);
  const fxOn = (store.state.settings.heroFx || 'full') !== 'off' && !store.state.settings.reducedMotion;

  // ---- 1. Don chien: am thanh dac truyen + hieu ung va cham ----
  const smashText = pickSmash(heroId);
  const power = out.boss ? 2 : quest.difficulty === 'epic' ? 1.7 : quest.difficulty === 'hard' ? 1.35 : 1;
  audio.play(out.boss ? 'smash' : hero.sfx || 'tick');
  if (out.boss) audio.play('villain');
  if (fxOn) {
    playSmash({ x: pt.x, y: pt.y, hero: heroId, text: smashText, power });
    stampQuest(pt.node, out.boss ? 'JUSTICE SMASH' : 'SMASHED');
  } else {
    audio.play('tick');
  }
  xpFloat(pt.x, pt.y, `+${out.xp} XP`);
  sparkAt(pt.x, pt.y, heroColor(heroId));

  if (out.combo > 1) {
    comboHud(out.combo);
    audio.play('combo');
    if (fxOn && out.combo >= 3) playBanner(i18n.lang === 'en' ? hero.ultraEn : hero.ultraVi, hero.heroName, heroId);
  }
  toast({
    type: 'success',
    title: t('toast.questDone', { name: quest.title }),
    msg: `${smashText} +${out.xp} XP · +${out.coin} ${t('common.coin')}`,
    iconName: 'checkCircle',
  });

  (out.achievements || []).forEach((ach, i) => {
    setTimeout(() => {
      audio.play('achievement');
      toastAchievement(ach, i18n.lang);
    }, 350 + i * 250);
  });

  if (out.leveledUp) {
    const info = getLevelInfo(store.state);
    const rank = heroRank(info.level, i18n.lang);
    setTimeout(() => {
      audio.play('rankUp');
      if (fxOn) {
        playRankUp({ level: info.level, rank: rank.label, tier: rank.tier, hero: heroId });
      } else {
        levelUpOverlay(info.level, rank.label);
      }
      confettiCannons();
      toast({
        type: 'achievement',
        title: t('toast.levelUp', { title: rank.label }),
        msg: i18n.lang === 'en' ? hero.aliasEn : hero.aliasVi,
        iconName: 'crown',
        duration: 4200,
      });
    }, 320);
  }
  if (out.perfect) {
    setTimeout(() => {
      confetti(innerWidth / 2, innerHeight / 3, 90);
      if (fxOn) {
        audio.play('ultra');
        playBanner('PERFECT DAY!', i18n.lang === 'en' ? 'You saved the day' : 'Cậu đã cứu cả ngày hôm nay', heroId);
      }
    }, 620);
  }
}

/** id anh hung dang dung (mac dinh: All Might). */
export function currentHeroId() {
  return store.state.settings.heroStyle || 'allmight';
}
/** Mau nhan cua hero (danh cho tia bua). */
function heroColor(heroId) {
  return getHero(heroId).colors.accent;
}

/* =========================================================================
   SU KIEN (delegation) cho vuong quest
   ========================================================================= */
/**
 * Gan vao container chua cac quest card. Xu ly: tick, mo subtask, sua, xoa,
 * va keo tha doi thu tu (neu cho phep).
 * @param {HTMLElement} container
 * @param {object} opts { dateKey, allowDrag, onEdit(quest), onNeedRefresh() }
 */
export function attachQuestDelegation(container, opts = {}) {
  const { dateKey = store.todayKey(), allowDrag = false, onEdit, onNeedRefresh } = opts;
  let dragId = null;

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    const rect = btn.getBoundingClientRect();
    const pt = { x: rect.left + rect.width / 2, y: rect.top, node: btn.closest('.qcard') };

    if (action === 'toggle') {
      const quest = findQuest(store.state, id);
      if (!quest) return;
      const done = isQuestCompletedOn(store.state, quest, dateKey);
      if (done) {
        audio.play('click');
        reopenQuest(id);
        onNeedRefresh && onNeedRefresh();
      } else {
        const out = completeQuest(id);
        handleQuestFeedback(out, quest, pt);
        // cho dong "SMASHED" chay xong roi ve lai danh sach (neu ve som no se bi xoa mat)
        const fxMs = (store.state.settings.heroFx || 'full') === 'off' || store.state.settings.reducedMotion ? 0 : 420;
        if (fxMs) setTimeout(() => onNeedRefresh && onNeedRefresh(), fxMs);
        else onNeedRefresh && onNeedRefresh();
      }
    } else if (action === 'edit') {
      const quest = findQuest(store.state, id);
      if (quest && onEdit) onEdit(quest);
    } else if (action === 'delete') {
      const quest = findQuest(store.state, id);
      if (quest) onDeleteQuest(quest, onNeedRefresh);
    } else if (action === 'expand') {
      toggleSubtaskPanel(id, container, dateKey);
    } else if (action === 'subtask') {
      const sub = btn.dataset.sub;
      const res = toggleSubtask(id, sub);
      if (res && res.allDone && res.result && res.result.ok) {
        const quest = findQuest(store.state, id);
        handleQuestFeedback(res.result, quest, pt);
      }
      // ve lai panel neu dang mo
      const panel = container.querySelector(`[data-panel="${id}"]`);
      if (panel) {
        const q = findQuest(store.state, id);
        panel.outerHTML = subtaskPanelHtml(q, dateKey);
      }
      onNeedRefresh && onNeedRefresh();
    }
  });

  if (allowDrag) {
    container.addEventListener('dragstart', (e) => {
      const card = e.target.closest('.qcard[draggable]');
      if (!card) return;
      dragId = card.dataset.id;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try {
        e.dataTransfer.setData('text/plain', dragId);
      } catch (err) {}
    });
    container.addEventListener('dragover', (e) => {
      if (!dragId) return;
      e.preventDefault();
      const over = e.target.closest('.qcard');
      if (!over || over.dataset.id === dragId) return;
      const dragging = container.querySelector('.qcard.dragging');
      const box = over.getBoundingClientRect();
      const before = e.clientY < box.top + box.height / 2;
      if (dragging) over.classList.toggle('drop-before', before);
    });
    container.addEventListener('drop', (e) => {
      e.preventDefault();
      const over = e.target.closest('.qcard');
      container.querySelectorAll('.drop-before').forEach((x) => x.classList.remove('drop-before'));
      if (!over || !dragId || over.dataset.id === dragId) return;
      const before = e.clientY < over.getBoundingClientRect().top + over.getBoundingClientRect().height / 2;
      reorderQuest(dragId, over.dataset.id, before);
      onNeedRefresh && onNeedRefresh();
    });
    container.addEventListener('dragend', () => {
      container.querySelectorAll('.dragging').forEach((x) => x.classList.remove('dragging'));
      container.querySelectorAll('.drop-before').forEach((x) => x.classList.remove('drop-before'));
      dragId = null;
    });
  }
}

/** Mo/dong panel subtask ngay duoi card. */
function toggleSubtaskPanel(id, container, dateKey) {
  const existing = container.querySelector(`[data-panel="${id}"]`);
  if (existing) {
    existing.remove();
    return;
  }
  container.querySelectorAll('[data-panel]').forEach((p) => p.remove());
  const card = container.querySelector(`.qcard[data-id="${id}"]`);
  const quest = findQuest(store.state, id);
  if (!card || !quest || !questSubtasks(quest).length) return;
  card.insertAdjacentHTML('afterend', subtaskPanelHtml(quest, dateKey));
}

/** Xoa quest co xac nhan. */
async function onDeleteQuest(quest, onNeedRefresh) {
  const yes = await confirmDialog({
    title: t('common.delete'),
    message: t('quest.deleteConfirm', { name: quest.title }),
    confirmText: t('common.delete'),
    danger: true,
  });
  if (!yes) return;
  store.update(
    (d) => {
      d.quests = d.quests.filter((q) => q.id !== quest.id);
      if (d.boss && d.boss.questId === quest.id) d.boss = { date: null, questId: null };
    },
    { undoable: true, reason: 'delete-quest' }
  );
  audio.play('click');
  toast({ type: 'info', title: t('common.delete'), msg: quest.title, iconName: 'trash' });
  onNeedRefresh && onNeedRefresh();
}

/** Doi thu tu quest theo keo tha (cap nhat truong order). */
function reorderQuest(draggedId, targetId, before) {
  store.update(
    (d) => {
      const list = [...d.quests].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const from = list.findIndex((q) => q.id === draggedId);
      if (from < 0) return;
      const [moved] = list.splice(from, 1);
      let to = list.findIndex((q) => q.id === targetId);
      if (to < 0) to = list.length;
      if (!before) to += 1;
      list.splice(to, 0, moved);
      list.forEach((q, i) => {
        const real = d.quests.find((x) => x.id === q.id);
        if (real) real.order = i;
      });
    },
    { undoable: true, reason: 'reorder' }
  );
}
