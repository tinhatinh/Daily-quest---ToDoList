/*
 * importDialog.js - HOP IMPORT JSON (quests / schedule)
 * -----------------------------------------------------
 * - Chon file hoac dan JSON vao textarea.
 * - "Kiem tra & xem truoc": dung importer.validate* -> bao loi theo truong.
 * - Che do Merge / Replace. Chi ap dung khi validate OK.
 * - Nut "Tai file mau" doc tu examples/ qua IPC.
 */

import { store } from './store.js';
import { validateQuests, validateSchedule, mergeById } from './importer.js';
import { openModal, toast, confirmDialog } from './ui.js';
import { icon } from './icons.js';
import { t, i18n } from './i18n.js';
import { audio } from './audio.js';

/**
 * @param {'quests'|'schedule'} kind
 * @param {object} opts { onDone }
 */
export function openImportDialog(kind = 'quests', opts = {}) {
  const isQuests = kind === 'quests';
  let mode = 'merge';
  let lastResult = null;

  const body = document.createElement('div');
  body.className = 'stack gap-4';
  body.innerHTML = `
    <div class="row gap-2 wrap">
      <button class="btn btn--subtle" data-pick>${icon('folder')}${t('import.pickFile')}</button>
      <button class="btn btn--ghost" data-sample>${icon('download')}${t('import.downloadSample')}</button>
    </div>
    <div class="field">
      <label class="field__label">${t('import.paste')}</label>
      <textarea class="textarea textarea--mono" id="imp-text" rows="9" placeholder='{ "version": 1, "${isQuests ? 'quests' : 'schedule'}": [ ... ] }'></textarea>
      ${isQuests ? `<div class="field__hint">${i18n.lang === 'en' ? 'Optional fields:' : 'Trường tùy chọn:'} <code>deadline</code> (HH:MM), <code>dueDate</code> (YYYY-MM-DD hoặc DD/MM/YYYY), <code>repeat</code>, <code>subtasks</code>, <code>tags</code>, <code>priority</code></div>` : `<div class="field__hint">${i18n.lang === 'en' ? 'Date fields (optional):' : 'Trường ngày tháng (tùy chọn):'} <code>startDate</code>, <code>endDate</code> (YYYY-MM-DD hoặc DD/MM/YYYY), <code>repeat:{freq:none|daily|weekly|monthly, interval, byWeekdays, byMonthDays}</code>, <code>dates:["YYYY-MM-DD"]</code></div>`}
    </div>
    <div class="import-modes">
      <button class="import-mode is-active" data-mode="merge">
        <div class="import-mode__title">${icon('layers')}${t('import.merge')}</div>
        <div class="import-mode__desc">${t('import.mergeDesc')}</div>
      </button>
      <button class="import-mode" data-mode="replace">
        <div class="import-mode__title">${icon('refresh')}${t('import.replace')}</div>
        <div class="import-mode__desc">${t('import.replaceDesc')}</div>
      </button>
    </div>
    <div id="imp-report"></div>
    <div class="row gap-2 wrap end" style="margin-top:4px">
      <button class="btn btn--ghost" data-preview>${icon('eye')}${t('import.doPreview')}</button>
      <button class="btn btn--primary" data-apply disabled>${icon('upload')}${t('import.apply')}</button>
    </div>
  `;

  const ctl = openModal({
    title: isQuests ? t('import.quests') : t('import.schedule'),
    bodyNode: body,
    wide: true,
  });
  ctl.node.querySelector('.modal__foot')?.remove();

  const $ = (sel) => body.querySelector(sel);
  const textArea = $('#imp-text');
  const report = $('#imp-report');
  const applyBtn = $('[data-apply]');

  // chon che do
  body.querySelectorAll('[data-mode]').forEach((b) => {
    b.addEventListener('click', () => {
      mode = b.dataset.mode;
      body.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('is-active', x === b));
    });
  });

  // chon file
  $('[data-pick]').addEventListener('click', async () => {
    const res = await window.api.openJsonFile();
    if (res && res.ok) {
      textArea.value = res.text;
      runPreview();
    }
  });

  // tai file mau
  $('[data-sample]').addEventListener('click', async () => {
    const name = isQuests ? 'quests.sample.json' : 'schedule.sample.json';
    const res = await window.api.readExample(name);
    if (res && res.ok) {
      textArea.value = res.text;
      runPreview();
    } else {
      toast({ type: 'error', title: t('common.close'), msg: 'Không đọc được file mẫu' });
    }
  });

  $('[data-preview]').addEventListener('click', runPreview);

  function runPreview() {
    const text = textArea.value;
    lastResult = isQuests ? validateQuests(text) : validateSchedule(text);
    renderReport();
    applyBtn.disabled = !(lastResult && lastResult.ok && lastResult.items.length);
  }

  function renderReport() {
    if (!lastResult) {
      report.innerHTML = '';
      return;
    }
    const { ok, errors, warnings, items } = lastResult;
    let html = '';
    if (errors.length) {
      html += `<div class="validate-report validate-report--err">
        <div style="font-weight:700;margin-bottom:6px">${t('import.invalid')}</div>
        ${errors.map((e) => `<span class="validate-line">• ${escapeText(e)}</span>`).join('')}
      </div>`;
    } else if (ok) {
      const existing = isQuests ? store.state.quests : store.state.schedule;
      const merged = mergeById(existing, items, mode);
      html += `<div class="validate-report validate-report--ok">
        <div style="font-weight:700;margin-bottom:6px">${t('import.valid', { n: items.length })}</div>
        <span class="validate-line">${t('import.summary', { add: merged.added, skip: merged.skipped })}</span>
      </div>`;
    }
    if (warnings.length) {
      html += `<div class="validate-report" style="margin-top:8px;background:color-mix(in srgb,var(--warning) 12%,transparent);color:var(--warning);border:1px solid color-mix(in srgb,var(--warning) 30%,transparent)">
        ${warnings.map((w) => `<span class="validate-line">⚠ ${escapeText(w)}</span>`).join('')}
      </div>`;
    }
    report.innerHTML = html;
  }

  // ap dung
  applyBtn.addEventListener('click', async () => {
    if (!lastResult || !lastResult.ok) return;
    if (mode === 'replace') {
      const yes = await confirmDialog({
        title: t('import.replace'),
        message: i18n.lang === 'en' ? 'Replace ALL current data with the imported items?' : 'Thay thế TOÀN BỘ dữ liệu hiện tại bằng dữ liệu nhập?',
        confirmText: t('common.confirm'),
        danger: true,
      });
      if (!yes) return;
    }
    const field = isQuests ? 'quests' : 'schedule';
    store.update(
      (d) => {
        const merged = mergeById(d[field], lastResult.items, mode);
        d[field] = merged.result;
      },
      { undoable: true, reason: 'import' }
    );
    audio.play('achievement');
    toast({ type: 'success', title: t('toast.imported', { n: lastResult.items.length }), iconName: 'checkCircle' });
    ctl.close();
    if (opts.onDone) opts.onDone();
  });
}

function escapeText(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
