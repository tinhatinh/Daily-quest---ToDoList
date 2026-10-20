/*
 * pages/journal.js - NHAT KY CUOI NGAY
 * ------------------------------------
 * Ghi chu ngan cho "ngay choi" hien tai + mood emoji. Luu theo dateKey vao
 * state.journal. Ben duoi la danh sach cac ngay da ghi (moi nhat tren dau).
 */

import { store } from '../store.js';
import { noteJournalSaved, getLevelInfo } from '../gamification.js';
import { dayProgress } from '../selectors.js';
import { MOODS } from '../constants.js';
import { escapeHtml, formatDateLong, parseDateKey } from '../utils.js';
import { icon } from '../icons.js';
import { t, i18n } from '../i18n.js';
import { audio } from '../audio.js';
import { toast, toastAchievement } from '../ui.js';

let selectedMood = null;
let els = {};

function moodPickerHtml() {
  return MOODS.map(
    (m) => `<button class="mood ${selectedMood === m.id ? 'is-active' : ''}" data-mood="${m.id}" data-tip="${escapeHtml(i18n.lang === 'en' ? m.en : m.vi)}" aria-label="${escapeHtml(m.vi)}">${m.emoji}</button>`
  ).join('');
}

function entryHtml(key, e) {
  const mood = MOODS.find((m) => m.id === e.mood);
  return `<div class="journal-entry">
    <div class="journal-entry__head">
      <span class="journal-entry__mood">${mood ? mood.emoji : ''}</span>
      <span class="journal-entry__date">${escapeHtml(formatDateLong(parseDateKey(key), i18n.lang))}</span>
      <span class="spacer"></span>
      <span class="muted" style="font-size:var(--fs-100)">${e.questsDone || 0} ${t('dash.questDone')} · ${e.xp || 0} XP</span>
      <button class="icon-btn" data-jdel="${key}" aria-label="${t('common.delete')}" title="${t('common.delete')}">${icon('trash')}</button>
    </div>
    <div class="journal-entry__text">${escapeHtml(e.text || '')}</div>
  </div>`;
}

function historyHtml() {
  const keys = Object.keys(store.state.journal).sort((a, b) => (a < b ? 1 : -1));
  if (!keys.length) {
    return `<div class="empty"><div class="empty__art">${icon('book', { size: 40 })}</div>
      <div class="empty__title">${t('journal.emptyTitle')}</div><div class="empty__msg">${t('journal.emptyMsg')}</div></div>`;
  }
  return keys.map((k) => entryHtml(k, store.state.journal[k])).join('');
}

function updateHistory() {
  if (els.history) els.history.innerHTML = historyHtml();
}

export const journalPage = {
  id: 'journal',
  icon: 'book',
  navKey: 'nav.journal',
  order: 8,

  title() {
    return t('nav.journal');
  },
  subtitle() {
    return formatDateLong(new Date(), i18n.lang);
  },

  render(view) {
    const today = store.todayKey();
    const existing = store.state.journal[today];
    selectedMood = existing ? existing.mood : null;
    const prog = dayProgress(store.state, today);

    view.innerHTML = `
      <div class="journal-editor">
        <div class="card">
          <div class="card__title" style="margin-bottom:12px">${t('journal.title')}</div>
          <div class="field"><label class="field__label">${t('journal.mood')}</label>
            <div class="mood-picker" id="j-moods">${moodPickerHtml()}</div>
          </div>
          <div class="field" style="margin-top:14px">
            <textarea class="textarea" id="j-text" rows="5" placeholder="${escapeHtml(t('journal.placeholder'))}">${escapeHtml(existing ? existing.text : '')}</textarea>
          </div>
          <div class="row between" style="margin-top:14px">
            <div class="muted" style="font-size:var(--fs-200)">${prog.done}/${prog.total} ${t('dash.questDone')} · ${store.dayRecord(today).xpEarned || 0} XP</div>
            <button class="btn btn--primary" id="j-save">${icon('save')}${t('journal.save')}</button>
          </div>
        </div>
        <div class="section-title" style="margin-top:8px">${i18n.lang === 'en' ? 'History' : 'Kỷ lục'}</div>
        <div id="j-history">${historyHtml()}</div>
      </div>`;

    els.text = view.querySelector('#j-text');
    els.history = view.querySelector('#j-history');

    // xoa mot ngay nhat ky
    els.history.addEventListener('click', (e) => {
      const b = e.target.closest('[data-jdel]');
      if (!b) return;
      const key = b.dataset.jdel;
      store.update(
        (d) => {
          delete d.journal[key];
          d.stats.journalDays = Object.keys(d.journal).length;
        },
        { undoable: true, reason: 'journal-del' }
      );
      audio.play('click');
      updateHistory();
    });

    view.querySelector('#j-moods').addEventListener('click', (e) => {
      const b = e.target.closest('[data-mood]');
      if (!b) return;
      selectedMood = b.dataset.mood;
      view.querySelectorAll('#j-moods .mood').forEach((x) => x.classList.toggle('is-active', x === b));
      audio.play('click');
    });

    view.querySelector('#j-save').addEventListener('click', () => {
      const text = els.text.value.trim();
      if (!text && !selectedMood) return;
      const p = dayProgress(store.state, today);
      store.update(
        (d) => {
          d.journal[today] = { text, mood: selectedMood, xp: d.dayRecords[today]?.xpEarned || 0, questsDone: p.done, ts: Date.now() };
        },
        { undoable: false, reason: 'journal-save' }
      );
      const out = noteJournalSaved();
      audio.play('achievement');
      toast({ type: 'success', title: t('journal.saved', { date: formatDateLong(new Date(), i18n.lang) }), iconName: 'book' });
      (out.achievements || []).forEach((ach) => toastAchievement(ach, i18n.lang));
      updateHistory();
    });
  },

  onState() {
    updateHistory();
  },
};
