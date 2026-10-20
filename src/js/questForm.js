/*
 * questForm.js - HOP MO / SUA QUEST (modal form)
 * ----------------------------------------------
 * Mot modal duy nhat dung cho "them moi" va "sua". Gom day du truong:
 * title, mo ta, loai, category, do kho, xp, coin, han, uu tien, luat lap
 * (mode + ngay trong tuan + moi N ngay), subtasks (moi dong 1 viec), tags.
 * openQuestForm(quest|null, { onDone })
 */

import { store } from './store.js';
import {
  CATEGORIES,
  CATEGORY_IDS,
  DIFFICULTIES,
  DIFFICULTY_IDS,
  QUEST_TYPES,
  QUEST_TYPE_IDS,
  REPEAT_MODES,
  REPEAT_MODE_IDS,
  PRIORITIES,
  PRIORITY_IDS,
} from './constants.js';
import { uid, escapeHtml, timeToMinutes } from './utils.js';
import { icon } from './icons.js';
import { t, i18n } from './i18n.js';
import { openModal } from './ui.js';
import { audio } from './audio.js';

// Thu trong tuan theo thu hien thi: T2..T7, CN (index 1..6,0)
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DOW_LABEL = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** Tao <option> cho 1 select tu map {id:{vi,en}}. */
function options(map, selected, lang) {
  return Object.values(map)
    .map((v) => `<option value="${v.id}" ${v.id === selected ? 'selected' : ''}>${escapeHtml(lang === 'en' ? v.en : v.vi)}</option>`)
    .join('');
}

/**
 * Mo hop quest.
 * @param {object|null} quest quest can sua, hoac null de them moi
 * @param {object} opts { onDone(quest, isNew) }
 */
export function openQuestForm(quest = null, opts = {}) {
  const lang = i18n.lang;
  const isNew = !quest;
  const d = quest || {};
  const repeat = d.repeat || { mode: d.type || 'daily', days: [1, 2, 3, 4, 5] };
  const subs = (d.subtasks || []).map((s) => (typeof s === 'string' ? s : s.title || '')).join('\n');
  const tags = Array.isArray(d.tags) ? d.tags.join(', ') : '';

  const body = document.createElement('div');
  body.className = 'stack gap-4';
  body.innerHTML = `
    <div class="field">
      <label class="field__label">${t('common.title')} *</label>
      <input class="input" id="qf-title" maxlength="140" placeholder="${escapeHtml(lang === 'en' ? 'e.g. Đọc sách 20 trang' : 'vd: Đọc sách 20 trang')}" value="${escapeHtml(d.title || '')}" />
    </div>
    <div class="field">
      <label class="field__label">${t('common.description')}</label>
      <input class="input" id="qf-desc" maxlength="220" value="${escapeHtml(d.description || '')}" />
    </div>
    <div class="form-grid">
      <div class="field">
        <label class="field__label">${t('common.type')}</label>
        <select class="select" id="qf-type">${options(QUEST_TYPES, d.type || 'daily', lang)}</select>
      </div>
      <div class="field">
        <label class="field__label">${t('common.category')}</label>
        <select class="select" id="qf-cat">${options(CATEGORIES, d.category || 'life', lang)}</select>
      </div>
      <div class="field">
        <label class="field__label">${t('common.difficulty')}</label>
        <select class="select" id="qf-diff">${options(DIFFICULTIES, d.difficulty || 'normal', lang)}</select>
      </div>
      <div class="field">
        <label class="field__label">${t('common.priority')}</label>
        <select class="select" id="qf-prio">${options(PRIORITIES, d.priority || 'medium', lang)}</select>
      </div>
      <div class="field">
        <label class="field__label">XP</label>
        <input class="input" id="qf-xp" type="number" min="0" max="9999" value="${d.xp ?? DIFFICULTIES[d.difficulty || 'normal'].xp}" />
      </div>
      <div class="field">
        <label class="field__label">${t('common.coin')}</label>
        <input class="input" id="qf-coin" type="number" min="0" max="9999" value="${d.coin ?? DIFFICULTIES[d.difficulty || 'normal'].coin}" />
      </div>
      <div class="field">
        <label class="field__label">${t('common.deadline')}</label>
        <input class="input" id="qf-deadline" type="time" value="${escapeHtml(d.deadline || '')}" />
      </div>
      <div class="field">
        <label class="field__label">${lang === 'en' ? 'Due date' : 'Hạn nộp (ngày)'}</label>
        <input class="input" id="qf-duedate" type="date" value="${escapeHtml(d.dueDate || '')}" />
      </div>
      <div class="field">
        <label class="field__label">${t('common.repeat')}</label>
        <select class="select" id="qf-repeat">${options(REPEAT_MODES, repeat.mode || 'everyday', lang)}</select>
      </div>
    </div>

    <div class="field" id="qf-days-field">
      <label class="field__label">${lang === 'en' ? 'Repeat on' : 'Lặp vào các thứ'}</label>
      <div class="row gap-2 wrap" id="qf-days">
        ${DOW_ORDER.map((idx) => `<button type="button" class="tab" data-day="${idx}" style="min-width:46px;justify-content:center">${DOW_LABEL[idx]}</button>`).join('')}
      </div>
    </div>
    <div class="field hidden" id="qf-everyn-field">
      <label class="field__label">${lang === 'en' ? 'Every N days' : 'Cứ mỗi N ngày'}</label>
      <input class="input" id="qf-everyn" type="number" min="1" max="60" value="${repeat.everyNDays || 3}" />
    </div>

    <div class="field">
      <label class="field__label">${t('common.subtasks')} (${lang === 'en' ? 'one per line' : 'mỗi dòng một việc'})</label>
      <textarea class="textarea" id="qf-subs" rows="3" placeholder="${escapeHtml(lang === 'en' ? 'Warm up\\nMain workout\\nStretch' : 'Khởi động\\nTập chính\\nGiãn cơ')}">${escapeHtml(subs)}</textarea>
    </div>
    <div class="field">
      <label class="field__label">${t('common.tags')} (${lang === 'en' ? 'comma separated' : 'phân tách bằng dấu phẩy'})</label>
      <input class="input" id="qf-tags" value="${escapeHtml(tags)}" />
    </div>
  `;

  const foot = document.createElement('div');
  foot.className = 'row gap-3 end';
  foot.style.width = '100%';
  foot.innerHTML = `
    <button class="btn btn--ghost" data-x>${t('common.cancel')}</button>
    <button class="btn btn--primary" data-save>${icon('save')}${isNew ? t('common.add') : t('common.save')}</button>`;
  body.appendChild(foot);

  const ctl = openModal({
    title: isNew ? t('quest.new') : t('quest.edit'),
    bodyNode: body,
    wide: true,
  });
  // loai bo footer mac dinh cua modal (da tu bo vao body)
  ctl.node.querySelector('.modal__foot')?.remove();

  const $ = (id) => body.querySelector('#' + id);

  // ---- day toggles ----
  const selectedDays = new Set((repeat.days || []).map(Number));
  function syncDays() {
    body.querySelectorAll('#qf-days [data-day]').forEach((b) => {
      b.classList.toggle('is-active', selectedDays.has(Number(b.dataset.day)));
    });
  }
  body.querySelectorAll('#qf-days [data-day]').forEach((b) => {
    b.addEventListener('click', () => {
      const idx = Number(b.dataset.day);
      if (selectedDays.has(idx)) selectedDays.delete(idx);
      else selectedDays.add(idx);
      syncDays();
      audio.play('click');
    });
  });

  // ---- repeat mode -> hien/ank truong ngay / everyN ----
  const repeatSel = $('qf-repeat');
  function syncRepeat() {
    const mode = repeatSel.value;
    $('qf-days-field').classList.toggle('hidden', !(mode === 'weekly' || mode === 'weekdays'));
    $('qf-everyn-field').classList.toggle('hidden', mode !== 'everyN');
  }
  repeatSel.addEventListener('change', syncRepeat);

  // ---- do kho -> cap nhat xp/coin mac dinh neu chua tu sua ----
  const diffSel = $('qf-diff');
  diffSel.addEventListener('change', () => {
    const def = DIFFICULTIES[diffSel.value];
    $('qf-xp').value = def.xp;
    $('qf-coin').value = def.coin;
  });

  syncDays();
  syncRepeat();

  foot.querySelector('[data-x]').addEventListener('click', () => ctl.close());
  foot.querySelector('[data-save]').addEventListener('click', () => {
    const title = $('qf-title').value.trim();
    if (!title) {
      $('qf-title').focus();
      $('qf-title').style.borderColor = 'var(--danger)';
      return;
    }
    const type = $('qf-type').value;
    const mode = repeatSel.value;
    const questData = {
      title,
      description: $('qf-desc').value.trim(),
      type,
      category: $('qf-cat').value,
      difficulty: diffSel.value,
      priority: $('qf-prio').value,
      xp: Math.max(0, Number($('qf-xp').value) || 0),
      coin: Math.max(0, Number($('qf-coin').value) || 0),
      deadline: $('qf-deadline').value && timeToMinutes($('qf-deadline').value) != null ? $('qf-deadline').value : '',
      dueDate: $('qf-duedate').value || '',
      repeat: {
        mode,
        days: [...selectedDays].sort((a, b) => a - b),
        everyNDays: Math.max(1, Number($('qf-everyn').value) || 1),
      },
      subtasks: $('qf-subs').value.split('\n').map((s) => s.trim()).filter(Boolean),
      tags: $('qf-tags').value.split(',').map((s) => s.trim()).filter(Boolean),
    };

    let saved = null;
    let createdNew = false;
    store.update(
      (draft) => {
        if (isNew) {
          createdNew = true;
          const maxOrder = draft.quests.reduce((m, q) => Math.max(m, q.order ?? 0), 0);
          saved = { id: uid('q'), order: maxOrder + 1, createdAt: Date.now(), archived: false, ...questData };
          draft.quests.push(saved);
        } else {
          const target = draft.quests.find((q) => q.id === quest.id);
          if (target) {
            Object.assign(target, questData);
            saved = target;
          }
        }
      },
      { undoable: true, reason: isNew ? 'add-quest' : 'edit-quest' }
    );
    audio.play(createdNew ? 'achievement' : 'click');
    ctl.close();
    if (opts.onDone) opts.onDone(saved, createdNew);
  });
}
