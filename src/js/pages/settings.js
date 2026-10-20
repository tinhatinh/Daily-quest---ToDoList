/*
 * pages/settings.js - CAI DAT
 * ---------------------------
 * Gom: Giao dien (theme/accent/ngon ngu), Van hanh game (gio bat dau ngay,
 * do kho XP, auto boss), Am thanh & hieu ung, He thong (thong bao, khay,
 * khoi dong cung Windows), Du lieu (xuat/nhap/backup/khoi phuc/reset 2 buoc),
 * phim tat va thong tin. Moi thay doi luu qua store + applyTheme ngay.
 */

import { store, createDefaultState } from '../store.js';
import { applyTheme } from '../theme.js';
import { router } from '../router.js';
import { i18n, t } from '../i18n.js';
import { THEMES, ACCENT_SWATCHES, LANGUAGES, XP_DIFFICULTY, SHORTCUTS } from '../constants.js';
import { escapeHtml } from '../utils.js';
import { icon } from '../icons.js';
import { audio } from '../audio.js';
import { toast, confirmDialog, openModal } from '../ui.js';
import { openImportDialog } from '../importDialog.js';

/** Ghi 1 thong so settings + ap dung phan ung. */
function setSetting(key, value) {
  store.update((d) => (d.settings[key] = value), { undoable: false, reason: 'settings' });
  applyTheme(store.state);
  if (key === 'minimizeToTray') window.api.setMinimizeToTray(value);
  if (key === 'startOnBoot') window.api.setAutoStart(value);
  if (key === 'language') {
    i18n.setLang(value);
    router.relabel();
    router.refresh();
  }
}

function toggle(key) {
  return `<div class="switch ${store.state.settings[key] ? 'is-on' : ''}" data-toggle="${key}" role="switch" tabindex="0" aria-checked="${!!store.state.settings[key]}"></div>`;
}
function row(label, hint, control) {
  return `<div class="set-row">
    <div class="set-row__info"><div class="set-row__label">${escapeHtml(label)}</div>${hint ? `<div class="set-row__hint">${escapeHtml(hint)}</div>` : ''}</div>
    <div>${control}</div>
  </div>`;
}

export const settingsPage = {
  id: 'settings',
  icon: 'settings',
  navKey: 'nav.settings',
  order: 9,

  title() {
    return t('nav.settings');
  },
  subtitle() {
    return '';
  },

  render(view) {
    const s = store.state.settings;
    const lang = i18n.lang;

    view.innerHTML = `
    <div class="settings">
      <div class="set-group">
        <div class="set-group__title">${icon('palette')}${t('set.appearance')}</div>
        <div class="field" style="margin-bottom:14px"><label class="field__label">${t('set.theme')}</label>
          <div class="theme-swatches" id="set-themes">
            ${Object.entries(THEMES).map(([id, th]) => `<button class="swatch ${s.theme === id ? 'is-active' : ''}" data-theme="${id}" style="background:${th.preview}"><span class="swatch__name">${escapeHtml(lang === 'en' ? th.en : th.vi)}</span></button>`).join('')}
          </div>
        </div>
        <div class="field"><label class="field__label">${t('set.accent')}</label>
          <div class="accent-dots" id="set-accents">
            ${ACCENT_SWATCHES.map((a) => `<button class="accent-dot ${s.accent === a.id ? 'is-active' : ''}" data-accent="${a.id}" style="background:${a.color}" aria-label="${a.id}"></button>`).join('')}
            <label class="accent-dot accent-dot--custom ${s.accent === 'custom' ? 'is-active' : ''}" data-tip="${lang === 'en' ? 'Custom' : 'Tùy chỉnh'}">${icon('plus', { size: 14 })}<input type="color" id="set-custom" value="${escapeHtml(s.customAccent)}" /></label>
          </div>
        </div>
        <div class="set-row" style="border-top:1px solid var(--border);margin-top:14px;padding-top:14px">
          <div class="set-row__info"><div class="set-row__label">${t('set.language')}</div></div>
          <select class="select" id="set-lang" style="width:auto">
            ${Object.entries(LANGUAGES).map(([id, nm]) => `<option value="${id}" ${s.language === id ? 'selected' : ''}>${escapeHtml(nm)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="set-group">
        <div class="set-group__title">${icon('zap')}${t('set.gameplay')}</div>
        ${row(t('set.dayStart'), t('set.dayStartHint'), `<select class="select" id="set-daystart" style="width:auto">${Array.from({ length: 13 }, (_, h) => `<option value="${h}" ${s.dayStartHour === h ? 'selected' : ''}>${String(h).padStart(2, '0')}:00</option>`).join('')}</select>`)}
        ${row(t('set.xpDifficulty'), '', `<select class="select" id="set-xpdiff" style="width:auto">${Object.values(XP_DIFFICULTY).map((x) => `<option value="${x.id}" ${s.xpDifficulty === x.id ? 'selected' : ''}>${escapeHtml(lang === 'en' ? x.en : x.vi)}</option>`).join('')}</select>`)}
        ${row(t('set.autoBoss'), '', toggle('autoBoss'))}
      </div>

      <div class="set-group">
        <div class="set-group__title">${icon('volume')}${t('set.audio')}</div>
        ${row(t('set.sound'), '', toggle('sound'))}
        ${row(t('set.volume'), '', `<input type="range" id="set-vol" min="0" max="1" step="0.05" value="${s.volume}" style="width:160px" />`)}
        ${row(t('set.reducedMotion'), '', toggle('reducedMotion'))}
      </div>

      <div class="set-group">
        <div class="set-group__title">${icon('monitor')}${t('set.system')}</div>
        ${row(t('set.notifications'), '', toggle('notifications'))}
        ${row(t('set.minimizeToTray'), '', toggle('minimizeToTray'))}
        ${row(t('set.autoStart'), '', toggle('startOnBoot'))}
      </div>

      <div class="set-group">
        <div class="set-group__title">${icon('folder')}${t('set.data')}</div>
        <div class="row gap-2 wrap" style="margin-bottom:14px">
          <button class="btn btn--subtle" data-exp="all">${icon('download')}${t('set.exportAll')}</button>
          <button class="btn btn--subtle" data-exp="quests">${icon('download')}Quests</button>
          <button class="btn btn--subtle" data-exp="schedule">${icon('download')}Schedule</button>
          <button class="btn btn--ghost" data-imp="quests">${icon('upload')}${t('import.quests')}</button>
          <button class="btn btn--ghost" data-imp="schedule">${icon('upload')}${t('import.schedule')}</button>
          <button class="btn btn--ghost" data-backup>${icon('save')}${t('set.backup')}</button>
        </div>
        <div class="field__label" style="margin-bottom:6px">${t('set.backups')}</div>
        <div id="set-backups" class="stack gap-2"><div class="muted" style="font-size:var(--fs-200)">…</div></div>
        <div class="set-row" style="border-top:1px solid var(--border);margin-top:14px;padding-top:14px">
          <div class="set-row__info"><div class="set-row__label" style="color:var(--danger)">${t('set.reset')}</div><div class="set-row__hint">${t('set.resetWarn')}</div></div>
          <button class="btn btn--danger" id="set-reset">${icon('trash')}${t('set.reset')}</button>
        </div>
      </div>

      <div class="set-group">
        <div class="set-group__title">${icon('keyboard')}${t('set.shortcuts')}</div>
        ${SHORTCUTS.map((k) => `<div class="set-row"><div class="set-row__info"><div class="set-row__label">${escapeHtml(lang === 'en' ? k.en : k.vi)}</div></div><span class="kbd">${escapeHtml(k.keys)}</span></div>`).join('')}
      </div>

      <div class="set-group">
        <div class="set-group__title">${icon('info')}${t('set.about')}</div>
        <div class="muted" style="font-size:var(--fs-300);line-height:1.7">
          <b style="color:var(--text)">Daily Quest</b> v1.0.0<br />
          Electron + HTML/CSS/JS thuần · offline · dữ liệu lưu cục bộ.<br />
          <span id="set-versions" class="muted">…</span>
        </div>
      </div>
    </div>`;

    // ---- theme swatches ----
    view.querySelector('#set-themes').addEventListener('click', (e) => {
      const b = e.target.closest('[data-theme]');
      if (!b) return;
      setSetting('theme', b.dataset.theme);
      view.querySelectorAll('#set-themes .swatch').forEach((x) => x.classList.toggle('is-active', x === b));
    });
    // ---- accents ----
    view.querySelector('#set-accents').addEventListener('click', (e) => {
      const b = e.target.closest('[data-accent]');
      if (!b) return;
      setSetting('accent', b.dataset.accent);
      view.querySelectorAll('.accent-dot').forEach((x) => x.classList.toggle('is-active', x === b));
    });
    view.querySelector('#set-custom').addEventListener('input', (e) => {
      store.update((d) => {
        d.settings.accent = 'custom';
        d.settings.customAccent = e.target.value;
      }, { undoable: false, reason: 'settings' });
      applyTheme(store.state);
      view.querySelectorAll('.accent-dot').forEach((x) => x.classList.toggle('is-active', x.classList.contains('accent-dot--custom')));
    });
    // ---- selects ----
    bindSelect(view, '#set-lang', (v) => setSetting('language', v));
    bindSelect(view, '#set-daystart', (v) => setSetting('dayStartHour', Number(v)));
    bindSelect(view, '#set-xpdiff', (v) => setSetting('xpDifficulty', v));
    // ---- volume ----
    view.querySelector('#set-vol').addEventListener('input', (e) => {
      setSetting('volume', Number(e.target.value));
    });
    // ---- toggles ----
    view.querySelectorAll('[data-toggle]').forEach((sw) => {
      const handler = () => {
        const key = sw.dataset.toggle;
        const val = !store.state.settings[key];
        setSetting(key, val);
        sw.classList.toggle('is-on', val);
        sw.setAttribute('aria-checked', String(val));
        audio.play('click');
      };
      sw.addEventListener('click', handler);
      sw.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handler();
        }
      });
    });
    // ---- data: export ----
    view.querySelectorAll('[data-exp]').forEach((b) =>
      b.addEventListener('click', () => exportData(b.dataset.exp))
    );
    view.querySelectorAll('[data-imp]').forEach((b) =>
      b.addEventListener('click', () => openImportDialog(b.dataset.imp, { onDone: () => {} }))
    );
    view.querySelector('[data-backup]').addEventListener('click', async () => {
      const res = await store.saveNow();
      toast({ type: res && res.ok ? 'success' : 'error', title: t('set.backup'), iconName: 'save' });
      loadBackups(view);
    });
    // ---- reset ----
    view.querySelector('#set-reset').addEventListener('click', () => doReset(view));

    loadBackups(view);
    loadVersions(view);
  },

  onState() {},
};

function bindSelect(view, sel, fn) {
  const el = view.querySelector(sel);
  if (el) el.addEventListener('change', (e) => fn(e.target.value));
}

/** Xuat du lieu (toan bo hoac tung phan) ra file JSON. */
async function exportData(scope) {
  const s = store.state;
  let payload;
  let name = 'daily-quest';
  if (scope === 'quests') {
    payload = { version: 1, quests: s.quests };
    name = 'quests.export.json';
  } else if (scope === 'schedule') {
    payload = { version: 1, schedule: s.schedule };
    name = 'schedule.export.json';
  } else {
    payload = s;
    name = 'daily-quest.export.json';
  }
  const res = await window.api.saveJsonFile(name, JSON.stringify(payload, null, 2));
  if (res && res.ok) toast({ type: 'success', title: t('set.exportAll'), msg: res.path, iconName: 'download' });
}

/** Liệt ke va khoi phuc backup. */
async function loadBackups(view) {
  const box = view.querySelector('#set-backups');
  if (!box) return;
  const res = await window.api.listBackups();
  const list = (res && res.backups) || [];
  if (!list.length) {
    box.innerHTML = `<div class="muted" style="font-size:var(--fs-200)">${t('set.noBackups')}</div>`;
    return;
  }
  box.innerHTML = list
    .slice(0, 8)
    .map(
      (b) =>
        `<div class="set-row" style="padding:8px 0;border-top:1px solid var(--border)">
          <div class="set-row__info"><div class="set-row__label" style="font-size:var(--fs-300)">${escapeHtml(b.name)}</div>
          <div class="set-row__hint">${new Date(b.time).toLocaleString(i18n.lang === 'en' ? 'en-US' : 'vi-VN')}</div></div>
          <button class="btn btn--sm btn--ghost" data-restore="${escapeHtml(b.name)}">${icon('refresh')}${t('set.restore')}</button>
        </div>`
    )
    .join('');
  box.querySelectorAll('[data-restore]').forEach((b) =>
    b.addEventListener('click', async () => {
      const yes = await confirmDialog({ title: t('set.restore'), message: b.dataset.restore, confirmText: t('common.confirm') });
      if (!yes) return;
      const res = await window.api.restoreBackup(b.dataset.restore);
      if (res && res.ok) {
        store.replaceState(res.data, { undoable: false });
        applyTheme(store.state);
        router.refresh();
        toast({ type: 'success', title: t('toast.restored'), iconName: 'checkCircle' });
      } else {
        toast({ type: 'error', title: t('set.restore'), msg: (res && res.error) || '', iconName: 'alert' });
      }
    })
  );
}

async function loadVersions(view) {
  const el = view.querySelector('#set-versions');
  if (!el) return;
  try {
    const v = await window.api.versions();
    el.textContent = `Electron ${v.electron} · Chromium ${v.chrome} · Node ${v.node}`;
  } catch (e) {
    el.textContent = '';
  }
}

/** Reset 2 buoc. */
async function doReset(view) {
  const lang = i18n.lang;
  const step1 = await confirmDialog({
    title: t('set.reset'),
    message: lang === 'en' ? 'This will erase ALL data. Continue?' : 'Mọi tiến trình, quest, lịch trình sẽ bị xóa. Tiếp tục?',
    confirmText: t('set.resetStep1'),
    danger: true,
  });
  if (!step1) return;
  const step2 = await confirmDialog({
    title: t('set.reset'),
    message: t('set.resetWarn'),
    confirmText: t('set.resetStep2'),
    danger: true,
  });
  if (!step2) return;
  store.replaceState(createDefaultState(), { undoable: false });
  await store.saveNow();
  applyTheme(store.state);
  toast({ type: 'success', title: t('set.reset'), msg: lang === 'en' ? 'Data cleared' : 'Đã xóa dữ liệu', iconName: 'trash' });
  setTimeout(() => window.location.reload(), 600);
}
