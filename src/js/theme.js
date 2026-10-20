/*
 * theme.js - AP DUNG CAI DAT TRUC QUAN
 * ------------------------------------
 * Doc settings -> set data-theme / data-accent / accent tu doan / lop
 * reduced-motion / cau hinh am thanh. Dung chung cho app.js va settings.
 */

import { audio } from './audio.js';

/** Ap theme, accent, reduced-motion va am thanh theo state hien tai. */
export function applyTheme(state) {
  const s = state.settings;
  const root = document.documentElement;
  root.setAttribute('data-theme', s.theme || 'dark');
  root.setAttribute('data-accent', s.accent || 'violet');

  if (s.accent === 'custom') {
    root.style.setProperty('--custom-accent', s.customAccent || '#7c5cff');
    root.style.setProperty('--custom-accent-2', s.customAccent2 || '#22d3ee');
    root.style.setProperty('--accent', s.customAccent || '#7c5cff');
    root.style.setProperty('--accent-2', s.customAccent2 || '#22d3ee');
  } else {
    root.style.removeProperty('--custom-accent');
    root.style.removeProperty('--custom-accent-2');
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-2');
  }

  document.body.classList.toggle('reduced-motion', !!s.reducedMotion);
  audio.configure({ sound: s.sound, volume: s.volume });
}
