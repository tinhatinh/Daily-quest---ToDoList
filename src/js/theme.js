/*
 * theme.js - AP DUNG CAI DAT TRUC QUAN
 * ------------------------------------
 * Doc settings -> set data-theme / data-hero / accent tu doan / lop
 * reduced-motion / cau hinh am thanh. Dung chung cho app.js va settings.
 *
 * Voi ban do anh hung (My Hero Academia): heroStyle QUYET DINH toan bo bang
 * mau (inline var tren :root -> uu tien cao hon moi CSS rule), nen khong con
 * xung dot voi o chon "mau nhan". Cung tai day, nen anh hung duoc nap va aura
 * One For All duoc dong bo theo streak.
 */

import { audio } from './audio.js';
import { setHeroVars, applyCustomPalette, mountHeroStage, syncHeroAura } from './heroArt.js';

/** Ap theme, hero, reduced-motion va am thanh theo state hien tai. */
export function applyTheme(state) {
  const s = state.settings;
  const root = document.documentElement;
  const hero = s.heroStyle || 'allmight';

  root.setAttribute('data-theme', s.theme || 'academia');
  root.setAttribute('data-accent', s.accent || 'violet');

  // --- Bang mau theo anh hung ---
  if (hero === 'custom') {
    applyCustomPalette(s.customAccent, s.customAccent2, root);
  } else {
    setHeroVars(hero, root);
    if (s.accent === 'custom') {
      // van cho phep "tu y" ghi de 2 mau nhan neu nguoi dung da chon
      root.style.setProperty('--accent', s.customAccent || '#7c5cff');
      root.style.setProperty('--accent-2', s.customAccent2 || '#22d3ee');
    }
  }

  // --- De heroArt.doc duoc thong so hieu ung ma khong import store (tranh vong tron) ---
  window.DQ_SETTINGS = {
    heroStyle: hero,
    heroFx: s.heroFx || 'full',
    reducedMotion: !!s.reducedMotion,
    theme: s.theme,
    language: s.language,
  };

  mountHeroStage();
  syncHeroAura((state.game && state.game.streak && state.game.streak.count) || 0);

  document.body.classList.toggle('reduced-motion', !!s.reducedMotion);
  audio.configure({ sound: s.sound, volume: s.volume });
}
