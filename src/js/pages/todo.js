/*
 * pages/todo.js - TO-DO NHANHGON
 * ------------------------------
 * Khu vuc to-do nhe: them nhanh bang 1 o nhap (Enter), tick co gach ngang
 * + XP nho, co the "thang cap" to-do thanh Quest.
 */

import { store } from '../store.js';
import { toggleTodo, getLevelInfo } from '../gamification.js';
import { emptyStateHtml, topStatsHtml } from '../components.js';
import { openQuestForm } from '../questForm.js';
import { uid, escapeHtml } from '../utils.js';
import { icon } from '../icons.js';
import { t, i18n } from '../i18n.js';
import { audio } from '../audio.js';
import { toast, toastAchievement, xpFloat, sparkAt, levelUpOverlay, confettiCannons } from '../ui.js';

let els = {};

function todoHtml(item) {
  return `<div class="todo-item ${item.done ? 'is-done' : ''}" data-id="${item.id}">
    <button class="check ${item.done ? 'is-done' : ''}" data-action="toggle" aria-pressed="${item.done}" aria-label="toggle">${icon('check')}</button>
    <span class="todo-item__text">${escapeHtml(item.title)}</span>
    <div class="todo-item__actions">
      <button class="icon-btn" data-action="promote" data-tip="${t('quest.promote')}" aria-label="${t('quest.promote')}">${icon('arrowUpRight')}</button>
      <button class="icon-btn" data-action="delete" aria-label="${t('common.delete')}">${icon('trash')}</button>
    </div>
  </div>`;
}

function listHtml() {
  const items = [...store.state.todos].sort((a, b) => Number(a.done) - Number(b.done) || (a.order ?? 0) - (b.order ?? 0));
  if (!items.length) {
    return emptyStateHtml({ iconName: 'checkSquare', title: t('todo.emptyTitle'), msg: t('todo.emptyMsg') });
  }
  return items.map(todoHtml).join('');
}

function updateList() {
  if (!els.list) return;
  els.list.innerHTML = listHtml();
}

/** Hoi phan sau khi tick to-do. */
function feedback(out, node) {
  if (!out || !out.ok) return;
  audio.play('todo');
  if (out.xp) {
    const r = node.getBoundingClientRect();
    xpFloat(r.left + r.width / 2, r.top, `+${out.xp} XP`);
    sparkAt(r.left + r.width / 2, r.top, '#22d3ee');
  }
  (out.achievements || []).forEach((ach, i) =>
    setTimeout(() => {
      audio.play('achievement');
      toastAchievement(ach, i18n.lang);
    }, 300 + i * 250)
  );
  if (out.leveledUp) {
    const info = getLevelInfo(store.state);
    setTimeout(() => {
      audio.play('levelUp');
      levelUpOverlay(info.level, i18n.lang === 'en' ? info.titleEn : info.titleVi);
      confettiCannons();
    }, 200);
  }
}

function addItem(text) {
  const title = text.trim();
  if (!title) return;
  store.update(
    (d) => {
      const maxOrder = d.todos.reduce((m, x) => Math.max(m, x.order ?? 0), 0);
      d.todos.push({ id: uid('td'), title, done: false, createdAt: Date.now(), order: maxOrder + 1 });
    },
    { undoable: false, reason: 'add-todo' }
  );
  audio.play('click');
  updateList();
}

export const todoPage = {
  id: 'todo',
  icon: 'checkSquare',
  navKey: 'nav.todo',
  order: 3,

  title() {
    return t('nav.todo');
  },
  subtitle() {
    const open = store.state.todos.filter((x) => !x.done).length;
    return i18n.lang === 'en' ? `${open} open to-dos` : `${open} việc đang mở`;
  },

  render(view) {
    view.innerHTML = `
      <div class="todo-wrap">
        <div class="todo-add">
          <div class="input-search grow">${icon('plus', { size: 16 })}
            <input class="input" id="todo-input" placeholder="${escapeHtml(t('todo.placeholder'))}" autocomplete="off" />
          </div>
          <button class="btn btn--primary" id="todo-add-btn">${t('common.add')}</button>
        </div>
        <div id="todo-list">${listHtml()}</div>
      </div>`;

    els.list = view.querySelector('#todo-list');
    els.input = view.querySelector('#todo-input');

    els.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        addItem(els.input.value);
        els.input.value = '';
      }
    });
    view.querySelector('#todo-add-btn').addEventListener('click', () => {
      addItem(els.input.value);
      els.input.value = '';
      els.input.focus();
    });

    els.list.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const row = btn.closest('.todo-item');
      const id = row && row.dataset.id;
      const action = btn.dataset.action;
      if (action === 'toggle') {
        const out = toggleTodo(id);
        feedback(out, btn);
        updateList();
      } else if (action === 'delete') {
        store.update((d) => (d.todos = d.todos.filter((x) => x.id !== id)), { undoable: true, reason: 'del-todo' });
        audio.play('click');
        updateList();
      } else if (action === 'promote') {
        const item = store.state.todos.find((x) => x.id === id);
        if (!item) return;
        openQuestForm(null, {
          onDone: () => {
            store.update((d) => (d.todos = d.todos.filter((x) => x.id !== id)), { undoable: false, reason: 'promote' });
            updateList();
          },
        });
        // dien san tieu de: mo form roi set gia tri
        setTimeout(() => {
          const inp = document.getElementById('qf-title');
          if (inp) inp.value = item.title;
        }, 30);
      }
    });
  },

  onState() {
    updateList();
  },

  /** Goi khi nhan Ctrl+T hoac menu "them to-do nhanh". */
  focusInput() {
    if (els.input) els.input.focus();
  },
};
