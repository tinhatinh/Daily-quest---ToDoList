/*
 * pages/onboarding.js - HUONG DAN LAN DAU
 * ---------------------------------------
 * Overlay toan man hinh 3 buoc: (1) ten + (2) avatar + (3) theme & nap mau.
 * Xong -> gan profile/settings, (tuy chon) nap 8 quest + 6 su kien mau,
 * dat onboardingDone=true, luu va goi onDone de app hien UI chinh.
 */

import { store } from '../store.js';
import { applyTheme } from '../theme.js';
import { AVATARS, THEMES, SAMPLE_QUESTS, SAMPLE_SCHEDULE } from '../constants.js';
import { escapeHtml } from '../utils.js';
import { icon } from '../icons.js';
import { t, i18n } from '../i18n.js';
import { audio } from '../audio.js';

// Mac dinh de TRONG: nguoi dung tu them quest/lich trinh cua minh.
const draft = { name: '', avatar: AVATARS[0], theme: 'dark', loadSample: false };

/** Hien onboarding neu chua xong. */
export function maybeShowOnboarding(onDone) {
  if (store.state.onboardingDone) {
    onDone && onDone();
    return;
  }
  render(0, onDone);
}

function render(step, onDone) {
  let overlay = document.getElementById('onboard');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'onboard';
    overlay.className = 'onboard';
    document.body.appendChild(overlay);
  }
  const steps = 3;
  const dots = Array.from({ length: steps }, (_, i) => `<div class="onboard__step ${i === step ? 'is-active' : ''}"></div>`).join('');

  let inner = '';
  if (step === 0) {
    inner = `
      <div class="onboard__logo">${icon('sword', { size: 46, stroke: 2 })}</div>
      <div>
        <div class="onboard__title">${t('ob.welcome')}</div>
        <div class="onboard__sub">${t('ob.welcomeSub')}</div>
      </div>
      <div class="field" style="text-align:left">
        <label class="field__label">${t('ob.name')}</label>
        <input class="input" id="ob-name" placeholder="${escapeHtml(t('ob.namePh'))}" value="${escapeHtml(draft.name)}" maxlength="30" />
      </div>`;
  } else if (step === 1) {
    inner = `
      <div class="onboard__title" style="font-size:var(--fs-700)">${t('ob.avatar')}</div>
      <div class="avatar-picker">
        ${AVATARS.map((a) => `<button class="avatar-opt ${draft.avatar === a ? 'is-active' : ''}" data-avatar="${a}">${a}</button>`).join('')}
      </div>`;
  } else {
    inner = `
      <div class="onboard__title" style="font-size:var(--fs-700)">${t('ob.theme')}</div>
      <div class="theme-swatches" style="justify-content:center">
        ${Object.entries(THEMES).map(([id, th]) => `<button class="swatch ${draft.theme === id ? 'is-active' : ''}" data-theme="${id}" style="width:96px;height:60px;background:${th.preview}"><span class="swatch__name">${escapeHtml(i18n.lang === 'en' ? th.en : th.vi)}</span></button>`).join('')}
      </div>
      <label class="row gap-3" style="justify-content:center;margin-top:8px;cursor:pointer">
        <span class="switch ${draft.loadSample ? 'is-on' : ''}" id="ob-sample" role="switch"></span>
        <span>${t('ob.loadSample')}</span>
      </label>`;
  }

  overlay.innerHTML = `
    <div class="onboard__card">
      ${inner}
      <div class="onboard__steps">${dots}</div>
      <div class="row gap-3" style="justify-content:center">
        ${step > 0 ? `<button class="btn btn--ghost" data-back>${icon('chevronLeft')}${t('ob.back')}</button>` : ''}
        <button class="btn btn--primary btn--lg" data-next>${step < steps - 1 ? t('ob.next') + icon('chevronRight') : icon('rocket') + t('ob.start')}</button>
      </div>
    </div>`;

  // gan su kien
  const nameInput = overlay.querySelector('#ob-name');
  if (nameInput) {
    nameInput.focus();
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') next();
    });
    draft.name = draft.name || '';
  }
  overlay.querySelectorAll('[data-avatar]').forEach((b) =>
    b.addEventListener('click', () => {
      draft.avatar = b.dataset.avatar;
      overlay.querySelectorAll('[data-avatar]').forEach((x) => x.classList.toggle('is-active', x === b));
      audio.play('click');
    })
  );
  overlay.querySelectorAll('[data-theme]').forEach((b) =>
    b.addEventListener('click', () => {
      draft.theme = b.dataset.theme;
      overlay.querySelectorAll('[data-theme]').forEach((x) => x.classList.toggle('is-active', x === b));
      audio.play('click');
    })
  );
  const sample = overlay.querySelector('#ob-sample');
  if (sample)
    sample.addEventListener('click', () => {
      draft.loadSample = !draft.loadSample;
      sample.classList.toggle('is-on', draft.loadSample);
    });

  const back = overlay.querySelector('[data-back]');
  if (back) back.addEventListener('click', () => render(step - 1, onDone));
  overlay.querySelector('[data-next]').addEventListener('click', next);

  function next() {
    if (step === 0) {
      draft.name = (nameInput ? nameInput.value : draft.name).trim() || (i18n.lang === 'en' ? 'Hero' : 'Anh hùng');
    }
    audio.play('click');
    if (step < 2) render(step + 1, onDone);
    else finish(onDone);
  }
}

/** hoan tat: ghi profile/settings + nap mau. */
function finish(onDone) {
  store.update(
    (d) => {
      d.profile.name = draft.name;
      d.profile.avatar = draft.avatar;
      d.profile.createdAt = Date.now();
      d.settings.theme = draft.theme;
      d.onboardingDone = true;
      if (draft.loadSample) {
        d.quests = SAMPLE_QUESTS.map((q, i) => ({
          ...q,
          subtasks: [...(q.subtasks || [])],
          tags: [...(q.tags || [])],
          repeat: { ...q.repeat, days: [...(q.repeat.days || [])] },
          order: i,
          archived: false,
          createdAt: Date.now(),
        }));
        d.schedule = SAMPLE_SCHEDULE.map((s) => ({ ...s, days: [...s.days] }));
      }
    },
    { undoable: false, reason: 'onboarding' }
  );
  applyTheme(store.state);
  store.saveNow();
  const overlay = document.getElementById('onboard');
  if (overlay) overlay.remove();
  audio.play('levelUp');
  onDone && onDone();
}
