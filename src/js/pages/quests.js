/*
 * pages/quests.js - TRANG NHIEM VU
 * ---------------------------------
 - Loc theo loai (tabs), tim kiem, sap xep, keo tha doi thu tu (kieu manual),
 * them/sua/xoa quest, mo subtask. Phim: mũi tên chọn, Space tick.
 */

import { store } from '../store.js';
import {
  getDueQuests,
  isQuestCompletedOn,
  findQuest,
} from '../selectors.js';
import { completeQuest, reopenQuest } from '../gamification.js';
import { scheduler } from '../scheduler.js';
import { questCardHtml, attachQuestDelegation, emptyStateHtml, handleQuestFeedback } from '../components.js';
import { openQuestForm } from '../questForm.js';
import { openImportDialog } from '../importDialog.js';
import { QUEST_TYPES } from '../constants.js';
import { escapeHtml } from '../utils.js';
import { icon } from '../icons.js';
import { t, i18n } from '../i18n.js';
import { audio } from '../audio.js';

const state = { filter: 'all', query: '', sort: 'manual', selectedId: null };
let els = {};
let keyHandler = null;

/** Danh sach quest khop bo loc + sap xep. */
function visibleQuests() {
  const today = store.todayKey();
  let list = store.state.quests.filter((q) => !q.archived);
  // chi hien quest den han hom nay voi filter 'all' de gan giong dashboard? -> giu toan bo quest active
  if (state.filter !== 'all') list = list.filter((q) => q.type === state.filter);
  const q = state.query.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (x) =>
        (x.title || '').toLowerCase().includes(q) ||
        (x.description || '').toLowerCase().includes(q) ||
        (x.tags || []).some((tag) => tag.toLowerCase().includes(q))
    );
  }
  const done = (x) => isQuestCompletedOn(store.state, x, today);
  switch (state.sort) {
    case 'priority': {
      const rank = { urgent: 0, high: 1, medium: 2, low: 3 };
      list.sort((a, b) => (rank[a.priority] ?? 2) - (rank[b.priority] ?? 2) || (a.order ?? 0) - (b.order ?? 0));
      break;
    }
    case 'deadline':
      list.sort((a, b) => (a.deadline || '99:99').localeCompare(b.deadline || '99:99'));
      break;
    case 'xp':
      list.sort((a, b) => (b.xp || 0) - (a.xp || 0));
      break;
    default:
      list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  // chua xong len dau, xong xuong cuoi
  list.sort((a, b) => Number(done(a)) - Number(done(b)));
  return list;
}

function gridHtml() {
  const list = visibleQuests();
  const today = store.todayKey();
  const boss = scheduler.getBossQuest();
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
    .map(
      (q) =>
        questCardHtml(q, {
          dateKey: today,
          isBoss: boss && q.id === boss.id,
          selected: q.id === state.selectedId,
          draggable: state.sort === 'manual',
        })
    )
    .join('');
}

function updateGrid() {
  if (!els.grid) return;
  els.grid.innerHTML = gridHtml();
  const active = visibleQuests();
  const openCount = active.filter((q) => !isQuestCompletedOn(store.state, q, store.todayKey())).length;
  if (els.count) els.count.textContent = t('quest.activeCount', { n: openCount });
}

function selectCard(id) {
  state.selectedId = id;
  document.querySelectorAll('.qcard').forEach((c) => c.classList.toggle('is-selected', c.dataset.id === id));
}

function moveSelection(dir) {
  const list = visibleQuests();
  if (!list.length) return;
  let idx = list.findIndex((q) => q.id === state.selectedId);
  idx = idx < 0 ? (dir > 0 ? 0 : list.length - 1) : Math.max(0, Math.min(list.length - 1, idx + dir));
  selectCard(list[idx].id);
  const card = document.querySelector(`.qcard[data-id="${list[idx].id}"]`);
  if (card) card.scrollIntoView({ block: 'nearest' });
}

function toggleSelected() {
  if (!state.selectedId) return;
  const quest = findQuest(store.state, state.selectedId);
  if (!quest) return;
  const card = document.querySelector(`.qcard[data-id="${quest.id}"] [data-action="toggle"]`);
  const rect = card ? card.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0 };
  const pt = { x: rect.left + rect.width / 2, y: rect.top };
  const done = isQuestCompletedOn(store.state, quest, store.todayKey());
  if (done) {
    audio.play('click');
    reopenQuest(quest.id);
  } else {
    handleQuestFeedback(completeQuest(quest.id), quest, pt);
  }
  updateGrid();
}

export const questsPage = {
  id: 'quests',
  icon: 'sword',
  navKey: 'nav.quests',
  order: 2,

  title() {
    return t('nav.quests');
  },
  subtitle() {
    const open = store.state.quests.filter((q) => !q.archived && !isQuestCompletedOn(store.state, q, store.todayKey())).length;
    return t('quest.activeCount', { n: open });
  },

  render(view) {
    view.innerHTML = `
      <div class="toolbar">
        <div class="tabs" id="q-tabs">
          <button class="tab ${state.filter === 'all' ? 'is-active' : ''}" data-filter="all">${t('common.all')}</button>
          ${Object.values(QUEST_TYPES)
            .map((tp) => `<button class="tab ${state.filter === tp.id ? 'is-active' : ''}" data-filter="${tp.id}">${escapeHtml(i18n.lang === 'en' ? tp.en : tp.vi)}</button>`)
            .join('')}
        </div>
        <div class="toolbar__search input-search">
          ${icon('search', { size: 16 })}
          <input class="input" id="q-search" placeholder="${escapeHtml(t('quest.search'))}" value="${escapeHtml(state.query)}" />
        </div>
        <div class="toolbar__end">
          <select class="select" id="q-sort" style="width:auto">
            <option value="manual" ${state.sort === 'manual' ? 'selected' : ''}>${t('quest.sort.manual')}</option>
            <option value="priority" ${state.sort === 'priority' ? 'selected' : ''}>${t('quest.sort.priority')}</option>
            <option value="deadline" ${state.sort === 'deadline' ? 'selected' : ''}>${t('quest.sort.deadline')}</option>
            <option value="xp" ${state.sort === 'xp' ? 'selected' : ''}>${t('quest.sort.xp')}</option>
          </select>
          <button class="btn btn--subtle" id="q-import">${icon('upload')}${t('quest.import')}</button>
          <button class="btn btn--primary" id="q-new">${icon('plus')}${t('quest.new')}</button>
        </div>
      </div>
      <div class="quest-grid" id="q-grid"></div>
    `;

    els.grid = view.querySelector('#q-grid');
    els.count = view.querySelector('#pageSubtitle');

    attachQuestDelegation(els.grid, {
      dateKey: store.todayKey(),
      allowDrag: state.sort === 'manual',
      onEdit: (q) => openQuestForm(q, { onDone: () => updateGrid() }),
      onNeedRefresh: () => updateGrid(),
    });

    // tabs
    view.querySelector('#q-tabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-filter]');
      if (!b) return;
      state.filter = b.dataset.filter;
      view.querySelectorAll('#q-tabs .tab').forEach((x) => x.classList.toggle('is-active', x === b));
      updateGrid();
    });
    // search
    view.querySelector('#q-search').addEventListener('input', (e) => {
      state.query = e.target.value;
      updateGrid();
    });
    // sort
    view.querySelector('#q-sort').addEventListener('change', (e) => {
      state.sort = e.target.value;
      updateGrid();
    });
    // new / import
    view.querySelector('#q-new').addEventListener('click', () => openQuestForm(null, { onDone: () => updateGrid() }));
    view.querySelector('#q-import').addEventListener('click', () => openImportDialog('quests', { onDone: () => updateGrid() }));

    // empty action
    view.addEventListener('click', (e) => {
      if (e.target.closest('[data-empty-action="new-quest"]')) openQuestForm(null, { onDone: () => updateGrid() });
    });

    updateGrid();
  },

  onState() {
    updateGrid();
  },

  onShow() {
    keyHandler = (e) => {
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      // Space tren nut check thi de native click xu ly (tranh tick 2 lan)
      if ((e.key === ' ' || e.code === 'Space') && tag === 'BUTTON') return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveSelection(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveSelection(-1);
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        toggleSelected();
      }
    };
    document.addEventListener('keydown', keyHandler);
  },
  onHide() {
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
  },
};
