/*
 * heroArt.js - MY THUAT ANH HUNG + LOP HIEU UNG CHIEN DAU
 * -------------------------------------------------------
 * 1) Thu sinh SVG tuong an (portrait) cho tung hero + villain boss + huy hieu UA.
 *    Moi thu deu la SVG inline -> khong can file anh, chay offline, scale net.
 * 2) playSmash / playBanner / playRankUp: lop hieu ung chien dau (chanh man hinh,
 *    song kich, toc do, chu comic) noi vao #heroFx.
 * 3) mountHeroStage: nen thanh phoi + chay + bui lang lang trong #heroBg.
 * 4) setHeroVars: day bang mau cua hero len CSS var -> hero.css chi lo cau truc.
 *
 * Ton trong settings.reducedMotion + settings.heroFx ('full' | 'soft' | 'off').
 */

import { getHero, pickSmash } from './heroes.js';
import { setFxPalette } from './ui.js';

let uidSeq = 0;
const uid = (p) => `${p}${++uidSeq}`;

/* =========================================================================
   TIEN ICH
   ========================================================================= */
/** Doc cua so cai dat hien tai (doc truc tiep store qua window.DQ_SETTINGS de
 *  tranh vong tron import; neu khong co thi mac dinh 'full'). */
function fxLevel() {
  const s = (typeof window !== 'undefined' && window.DQ_SETTINGS) || {};
  if (s.reducedMotion) return 'off';
  return s.heroFx || 'full';
}

/** Gom SVG: them <svg> bao bo quanh noi dung. */
function svgWrap(inner, { size = 120, cls = '', vb = '0 0 120 120', label = '' } = {}) {
  return `<svg class="hp ${cls}" viewBox="${vb}" width="${size}" height="${size}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

/* =========================================================================
   TONG DUNG: khung nguoi + mat (moi hero dung lai)
   ========================================================================= */
function bodyBase(c, k) {
  return `
    <defs>
      <linearGradient id="${k.gSuit}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${c.suit}" stop-opacity="1"/>
        <stop offset="1" stop-color="${c.ink}" stop-opacity="1"/>
      </linearGradient>
      <radialGradient id="${k.gSkin}" cx="0.42" cy="0.34" r="0.75">
        <stop offset="0" stop-color="#ffe3c4"/>
        <stop offset="1" stop-color="#e9b98f"/>
      </radialGradient>
      <linearGradient id="${k.gHair}" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stop-color="${c.line}"/>
        <stop offset="1" stop-color="${c.hair}"/>
      </linearGradient>
      <radialGradient id="${k.gAura}" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stop-color="${c.accent}" stop-opacity="0.55"/>
        <stop offset="0.55" stop-color="${c.accent}" stop-opacity="0.14"/>
        <stop offset="1" stop-color="${c.accent}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse class="hp-aura" cx="60" cy="62" rx="58" ry="58" fill="url(#${k.gAura})"/>
    <path class="hp-torso" d="M12 120 C12 95 33 82 60 82 C87 82 108 95 108 120 Z" fill="url(#${k.gSuit})"/>
    <path class="hp-neck" d="M50 70 h20 v14 a10 10 0 0 1 -20 0 Z" fill="#d9a97f"/>
    <ellipse class="hp-head" cx="60" cy="48" rx="27" ry="29" fill="url(#${k.gSkin})"/>`;
}

/** Mat: long trang + mung + dom + diem sang. */
function eye(cx, cy, iris, { rx = 7.6, ry = 8.6, sparkle = true } = {}) {
  return `
    <g class="hp-eye">
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff"/>
      <circle cx="${cx}" cy="${cy + 0.6}" r="${rx - 2.2}" fill="${iris}"/>
      <circle cx="${cx}" cy="${cy + 0.6}" r="2.1" fill="#101018"/>
      ${sparkle ? `<circle cx="${cx - 2.4}" cy="${cy - 2.8}" r="2" fill="#fff" opacity="0.95"/>` : ''}
    </g>`;
}

/* =========================================================================
   PORTRAIT TUNG HERO
   ========================================================================= */
const ART = {
  /* ---------------- ALL MIGHT: dang co bung, cuoi toe ---------------- */
  allmight(c, k) {
    return `
    ${bodyBase(c, k)}
    <!-- vai + nguc costume -->
    <path class="hp-pad" d="M12 120 C12 100 26 90 40 88 L40 120 Z" fill="${c.accent}" opacity="0.9"/>
    <path class="hp-pad" d="M108 120 C108 100 94 90 80 88 L80 120 Z" fill="${c.accent}" opacity="0.9"/>
    <path d="M46 92 h28 l-6 16 h-16 Z" fill="${c.accent}" opacity="0.85"/>
    <!-- toc vang gai -->
    <path class="hp-hair" d="M30 34 C24 14 40 2 50 12 C48 -2 72 -4 74 12 C86 2 98 16 90 34 C82 22 70 20 60 22 C48 20 38 24 30 34 Z" fill="url(#${k.gHair})"/>
    <path class="hp-hair" d="M52 22 C56 8 66 8 70 20 C64 16 58 16 52 22 Z" fill="${c.hair}"/>
    <!-- chan may day -->
    <path class="hp-brow" d="M38 36 C44 31 52 31 56 34" stroke="${c.hair}" stroke-width="4.4" fill="none" stroke-linecap="round"/>
    <path class="hp-brow" d="M82 36 C76 31 68 31 64 34" stroke="${c.hair}" stroke-width="4.4" fill="none" stroke-linecap="round"/>
    <!-- mat xanh -->
    ${eye(48, 46, '#1f6fe0')}
    ${eye(72, 46, '#1f6fe0')}
    <!-- cuoi toe: rang trang + net -->
    <g class="hp-mouth">
      <path d="M40 58 C48 74 72 74 80 58 C70 63 50 63 40 58 Z" fill="#fff" stroke="#7a4b32" stroke-width="1.6"/>
      <path d="M44 61 h32" stroke="#d8cfc6" stroke-width="1.2"/>
      <path d="M52 59.5 v4 M60 60.5 v5 M68 59.5 v4" stroke="#d8cfc6" stroke-width="1"/>
    </g>
    <!-- vang net quanh mat (khuon mat na) -->
    <path d="M36 44 C36 34 44 30 48 30 M84 44 C84 34 76 30 72 30" stroke="${c.glow}" stroke-width="2.4" fill="none" opacity="0.75" stroke-linecap="round"/>`;
  },

  /* ---------------- ALL MIGHT dang "xupe" (Toshinori) ---------------- */
  allmightSkinny(c, k) {
    return `
    <defs>
      <radialGradient id="${k.gSkin}" cx="0.4" cy="0.3" r="0.8">
        <stop offset="0" stop-color="#ffe6ca"/><stop offset="1" stop-color="#e3b389"/>
      </radialGradient>
    </defs>
    <!-- bo do rong tung, dang ngoi khuyu -->
    <path class="hp-torso" d="M22 120 C24 100 38 92 60 92 C82 92 96 100 98 120 Z" fill="${c.suit}" opacity="0.9"/>
    <path d="M40 96 C48 108 72 108 80 96" fill="none" stroke="${c.accent}" stroke-width="2.4" opacity="0.5"/>
    <path class="hp-neck" d="M55 78 h10 v16 h-10 Z" fill="#d9a97f"/>
    <!-- dau nho, hai mat xuo -->
    <ellipse class="hp-head" cx="60" cy="54" rx="24" ry="26" fill="url(#${k.gSkin})"/>
    <path class="hp-hair" d="M36 44 C34 22 48 12 60 14 C74 12 86 24 84 44 C76 30 68 26 60 27 C50 26 42 32 36 44 Z" fill="#cdb86a"/>
    <path d="M40 40 L34 24 L46 34 Z M60 32 L60 12 L68 30 Z M80 40 L86 24 L74 34 Z" fill="#cdb86a" opacity="0.9"/>
    <path d="M40 44 C48 39 56 39 58 42 M80 44 C72 39 64 39 62 42" stroke="#b9a55c" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    ${eye(50, 54, '#4b78b5', { rx: 7, ry: 8.2 })}
    ${eye(70, 54, '#4b78b5', { rx: 7, ry: 8.2 })}
    <!-- net mo duoi mat (kiet suc) -->
    <path d="M44 63 C47 66 53 66 56 63 M64 63 C67 66 73 66 76 63" stroke="#c99b74" stroke-width="1.6" fill="none" opacity="0.85"/>
    <path d="M40 60 C38 68 40 76 44 82 M80 60 C82 68 80 76 76 82" stroke="#c99b74" stroke-width="1.4" fill="none" opacity="0.6"/>
    <path class="hp-mouth" d="M52 72 C56 69 64 69 68 72" stroke="#8b5a3c" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  },

  /* ---------------- DEKU: toc xanh, mat nan, tan nhang ---------------- */
  midoriya(c, k) {
    return `
    ${bodyBase(c, k)}
    <path class="hp-pad" d="M40 88 C34 96 32 108 33 120 L46 120 C44 108 45 96 48 90 Z" fill="${c.accent}" opacity="0.5"/>
    <path class="hp-pad" d="M80 88 C86 96 88 108 87 120 L74 120 C76 108 75 96 72 90 Z" fill="${c.accent}" opacity="0.5"/>
    <!-- toc xanh rung nhiu gai -->
    <path class="hp-hair" d="M31 40 L28 20 L40 30 L41 12 L52 26 L58 8 L64 26 L74 12 L78 28 L90 18 L89 40 C82 30 70 26 60 27 C48 26 38 31 31 40 Z" fill="url(#${k.gHair})"/>
    <!-- bang mat na den -->
    <path class="hp-mask" d="M30 42 C40 36 80 36 90 42 L90 52 C78 46 42 46 30 52 Z" fill="#132018" opacity="0.92"/>
    ${eye(48, 48, '#2fbf71')}
    ${eye(72, 48, '#2fbf71')}
    <path class="hp-brow" d="M40 34 C46 31 53 31 57 34 M80 34 C74 31 67 31 63 34" stroke="#249c5b" stroke-width="3.2" fill="none" stroke-linecap="round"/>
    <g class="hp-freck" fill="#d99a72">
      <circle cx="41" cy="56" r="1.3"/><circle cx="45" cy="59" r="1.3"/><circle cx="39" cy="61" r="1.2"/>
      <circle cx="79" cy="56" r="1.3"/><circle cx="75" cy="59" r="1.3"/><circle cx="81" cy="61" r="1.2"/>
    </g>
    <path class="hp-mouth" d="M52 64 C57 69 63 69 68 64" stroke="#8b5a3c" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <!-- tia set One For All -->
    <path class="hp-spark" d="M22 70 L28 60 L25 58 L33 46" stroke="${c.accent2}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity="0.85"/>
    <path class="hp-spark" d="M98 70 L92 60 L95 58 L87 46" stroke="${c.accent2}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity="0.85"/>`;
  },

  /* ---------------- BAKUGO: toc ngang bong, mat ghet, guom no ---------------- */
  bakugo(c, k) {
    return `
    ${bodyBase(c, k)}
    <path class="hp-pad" d="M84 88 C96 92 104 102 106 120 L86 120 Z" fill="#3a3f4a"/>
    <rect class="hp-gauntlet" x="86" y="94" width="20" height="24" rx="6" fill="#c9ced8" stroke="#7d848f" stroke-width="1.4"/>
    <path d="M88 100 h16 M88 106 h16 M88 112 h16" stroke="#7d848f" stroke-width="1.2"/>
    <!-- toc trang-xam gai goc -->
    <path class="hp-hair" d="M28 40 L24 16 L38 28 L39 8 L51 24 L60 4 L69 24 L81 8 L82 28 L96 16 L92 40 C84 28 72 24 60 25 C48 24 36 28 28 40 Z" fill="url(#${k.gHair})"/>
    <path class="hp-mask" d="M34 34 C44 28 76 28 86 34 L86 40 C74 35 46 35 34 40 Z" fill="#1c1f26" opacity="0.9"/>
    <path class="hp-brow" d="M38 40 L56 45 M82 40 L64 45" stroke="#c9b98a" stroke-width="3.6" stroke-linecap="round"/>
    ${eye(48, 50, '#d8342f', { sparkle: false })}
    ${eye(72, 50, '#d8342f', { sparkle: false })}
    <!-- mieng nghien rang -->
    <g class="hp-mouth">
      <path d="M48 64 C55 61 65 61 72 64 C68 70 52 70 48 64 Z" fill="#fff" stroke="#6d4630" stroke-width="1.4"/>
      <path d="M54 63 v5 M60 62.5 v6 M66 63 v5" stroke="#c9bdb2" stroke-width="1"/>
    </g>`;
  },

  /* ---------------- TODOROKI: nua trang nua do, set ngo ---------------- */
  todoroki(c, k) {
    return `
    ${bodyBase(c, k)}
    <path class="hp-pad" d="M12 120 C12 100 26 90 40 88 L40 120 Z" fill="${c.accent}" opacity="0.35"/>
    <path class="hp-pad" d="M108 120 C108 100 94 90 80 88 L80 120 Z" fill="${c.accent2}" opacity="0.4"/>
    <!-- toc: nua trang -->
    <path class="hp-hairL" d="M60 26 C48 25 38 30 31 40 L30 20 L42 12 L46 22 L54 6 L60 18 Z" fill="#f2f6ff"/>
    <!-- nua do -->
    <path class="hp-hairR" d="M60 26 C72 25 82 30 89 40 L90 18 L78 10 L72 22 L66 6 L60 18 Z" fill="#e0402f"/>
    <path class="hp-brow" d="M38 38 C44 35 52 35 56 38 M82 38 C76 35 68 35 64 38" stroke="#dfe6f2" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${eye(48, 46, '#7f8a99')}
    ${eye(72, 46, '#37b6e8')}
    <!-- vet set ngo ben mat trai -->
    <path class="hp-scar" d="M44 32 C42 40 42 50 45 58" stroke="#c8503f" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.9"/>
    <path class="hp-scar" d="M46 36 C44 44 45 52 47 56" stroke="#e8836d" stroke-width="1.6" fill="none" opacity="0.8"/>
    <path class="hp-mouth" d="M53 65 h14" stroke="#8b5a3c" stroke-width="2" stroke-linecap="round"/>`;
  },

  /* ---------------- URARAKA: toc nau bob, mat to, hong dang ---------------- */
  uraraka(c, k) {
    return `
    ${bodyBase(c, k)}
    <path class="hp-pad" d="M40 88 C30 94 24 106 26 120 L44 120 Z" fill="${c.accent}" opacity="0.55"/>
    <path class="hp-pad" d="M80 88 C90 94 96 106 94 120 L76 120 Z" fill="${c.accent}" opacity="0.55"/>
    <!-- toc bob tron -->
    <path class="hp-hair" d="M28 52 C24 26 40 14 60 14 C80 14 96 26 92 52 C92 62 88 68 84 70 C86 56 84 44 80 38 C70 44 50 44 40 38 C36 44 34 56 36 70 C32 68 28 62 28 52 Z" fill="url(#${k.gHair})"/>
    <path d="M40 38 C50 44 70 44 80 38 C74 30 46 30 40 38 Z" fill="#8d5f3f"/>
    <!-- bang trang hong -->
    <path class="hp-mask" d="M32 44 C42 38 78 38 88 44 L88 50 C76 45 44 45 32 50 Z" fill="${c.glow}" opacity="0.9"/>
    ${eye(48, 50, '#7a4a24', { ry: 9.6 })}
    ${eye(72, 50, '#7a4a24', { ry: 9.6 })}
    <g class="hp-blush" fill="${c.glow}" opacity="0.4">
      <ellipse cx="38" cy="58" rx="6" ry="3.4"/><ellipse cx="82" cy="58" rx="6" ry="3.4"/>
    </g>
    <!-- khep hong -->
    <path class="hp-pin" d="M84 26 l6 -4 l1 7 z" fill="${c.accent}"/>
    <g class="hp-mouth">
      <path d="M52 62 C56 70 64 70 68 62 C63 65 57 65 52 62 Z" fill="#c65b74" stroke="#8b3d52" stroke-width="1.2"/>
    </g>
    <!-- qua bong trong luc -->
    <g class="hp-orb" fill="none" stroke="${c.accent}" stroke-width="1.8" opacity="0.8">
      <circle cx="20" cy="76" r="6"/><circle cx="102" cy="66" r="4.4"/>
    </g>`;
  },

  /* ---------------- ERASER HEAD: toc den dai, kenh, khan bat ---------------- */
  aizawa(c, k) {
    return `
    ${bodyBase(c, k)}
    <!-- khan bat nguoi -->
    <path class="hp-scarf" d="M28 96 C40 88 80 88 92 96 C86 106 74 110 60 110 C46 110 34 106 28 96 Z" fill="#6a5136" opacity="0.95"/>
    <path d="M34 100 l-8 18 M86 100 l8 18" stroke="#6a5136" stroke-width="5" stroke-linecap="round" opacity="0.8"/>
    <!-- toc den dai hai ben -->
    <path class="hp-hair" d="M26 46 C22 22 40 12 60 12 C80 12 98 22 94 46 L96 86 L86 84 L88 50 C80 40 40 40 32 50 L34 84 L24 86 Z" fill="#171a21"/>
    <!-- kenh tren tran -->
    <g class="hp-goggles">
      <rect x="34" y="26" width="52" height="9" rx="4" fill="#2a2f3a"/>
      <circle cx="46" cy="30.5" r="6.4" fill="#c22b3f" stroke="#1b1e26" stroke-width="1.6"/>
      <circle cx="74" cy="30.5" r="6.4" fill="#c22b3f" stroke="#1b1e26" stroke-width="1.6"/>
    </g>
    <path class="hp-brow" d="M38 42 L58 44 M82 42 L62 44" stroke="#171a21" stroke-width="3.4" stroke-linecap="round"/>
    ${eye(48, 49, '#d23b45', { sparkle: false })}
    ${eye(72, 49, '#d23b45', { sparkle: false })}
    <path d="M41 58 C45 61 52 61 55 58 M65 58 C68 61 75 61 79 58" stroke="#c79a76" stroke-width="1.6" fill="none" opacity="0.85"/>
    <path class="hp-mouth" d="M52 68 h16" stroke="#8b5a3c" stroke-width="2.2" stroke-linecap="round"/>`;
  },
};

/* =========================================================================
   ANH THAT CUA HERO (image pack cuc bo)
   ---------------------------------------------------------------------
  Nguoi dung co the tu bo hinh cua ho vao <userData>/heroes/*.png. App chi
   doc tu thu muc do tren may cua chinh ho (khong tai, khong dong goi bat ky
   anh nao vao file build). Dat ten:
     allmight.png            : anh dung (mood idle)
     allmight-cheer.png      : luc mung / hoan thanh
     allmight-serious.png    : luc doi mat boss
     allmight-tired.png      : luc kiet suc
     allmight-skinny.png     : dang Toshinori
     villain.png             : ac nhan cho the boss
   Co anh -> dung anh; khong co -> dung tuong SVG ve san.
   ========================================================================= */
let heroImages = new Map();

/** Nap lai danh sach anh co trong thu muc heroes. */
export async function refreshHeroImages() {
  try {
    const res = await window.api.heroesList();
    const m = new Map();
    for (const img of (res && res.images) || []) m.set(String(img.key).toLowerCase(), img.url);
    heroImages = m;
  } catch (e) {
    /* khong co bridge (mo trong trinh duyet) -> dung SVG */
  }
  return heroImages;
}

/** So anh dang co, theo tung hero (de hien thi trong Cai dat). */
export function heroImageStatus(heroId) {
  const variants = ['', '-idle', '-cheer', '-serious', '-tired', '-skinny'];
  return variants.filter((v) => heroImages.has(String(heroId + v).toLowerCase())).length;
}
export function villainImageAvailable() {
  return heroImages.has('villain');
}
function photoUrl(keys) {
  for (const k of keys) {
    const url = heroImages.get(String(k).toLowerCase());
    if (url) return url;
  }
  return null;
}

/** The <img> dien anh that, van nam trong khung .hp de CSS chiem chot. */
function photoTag(url, mood, cls, size, label) {
  return `<span class="hp hp--photo is-${mood} ${cls}" style="--photo-size:${size}px">
    <img src="${url}" alt="${escapeText(label)}" draggable="false" />
    <span class="hp-photo-frame" aria-hidden="true"></span>
    <span class="hp-photo-tone" aria-hidden="true"></span>
  </span>`;
}

/* =========================================================================
   API: TUONG AN
   ========================================================================= */
/**
 * Ve tuong anh hero: anh that (neu co) hoac SVG ve san.
 * @param {string} heroId
 * @param {object} o { size, mood: 'idle'|'cheer'|'serious'|'tired', skinny, cls }
 */
export function heroPortrait(heroId, o = {}) {
  const hero = getHero(heroId);
  const c = hero.colors;
  const skinny = !!o.skinny;
  const key = skinny ? 'allmightSkinny' : heroId;
  const art = ART[key] || ART.allmight;
  const mood = skinny ? 'tired' : o.mood || 'idle';

  // 1) thu anh that cua nguoi dung
  const url = photoUrl(
    skinny
      ? ['allmight-skinny', 'allmight-tired', 'allmight']
      : [`${heroId}-${mood}`, `${heroId}-idle`, heroId]
  );
  if (url) return photoTag(url, mood, `hp--${heroId} ${o.cls || ''}`, o.size || 120, hero.heroName);

  // 2) fallback: SVG
  const k = { gSuit: uid('gS'), gSkin: uid('gK'), gHair: uid('gH'), gAura: uid('gA') };
  const cls = `hp--${heroId} ${skinny ? 'hp--skinny' : ''} is-${mood} ${o.cls || ''}`;
  return svgWrap(art(c, k), { size: o.size || 120, cls, label: hero.heroName });
}

/**
 * Ve ac nhan (boss quest): anh 'villain.png' neu co, khong thi SVG.
 */
export function villainPortrait(heroId, o = {}) {
  const url = photoUrl(['villain', `villain-${heroId}`]);
  if (url) return photoTag(url, 'serious', 'hp--villain', o.size || 96, 'Villain');
  const hero = getHero(heroId);
  const c = hero.colors;
  const gid = uid('vg');
  const inner = `
    <defs>
      <radialGradient id="${gid}" cx="0.5" cy="0.42" r="0.62">
        <stop offset="0" stop-color="${c.glow}" stop-opacity="0.5"/>
        <stop offset="1" stop-color="${c.ink}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="60" cy="58" r="52" fill="url(#${gid})"/>
    <path class="vl-body" d="M14 120 C16 92 34 78 60 78 C86 78 104 92 106 120 Z" fill="#0d0f16" opacity="0.95"/>
    <path class="vl-head" d="M34 56 C34 30 46 16 60 16 C74 16 86 30 86 56 C86 76 74 88 60 88 C46 88 34 76 34 56 Z" fill="#151824"/>
    <path class="vl-horn" d="M36 34 L22 12 L42 24 Z" fill="#1c2030"/>
    <path class="vl-horn" d="M84 34 L98 12 L78 24 Z" fill="#1c2030"/>
    <g class="vl-eyes">
      <ellipse cx="49" cy="52" rx="8" ry="5.4" fill="${c.glow}"/>
      <ellipse cx="71" cy="52" rx="8" ry="5.4" fill="${c.glow}"/>
      <circle cx="49" cy="52" r="2.2" fill="#fff"/>
      <circle cx="71" cy="52" r="2.2" fill="#fff"/>
    </g>
    <path class="vl-grin" d="M42 68 C50 80 70 80 78 68 C70 72 50 72 42 68 Z" fill="#0a0a10" stroke="${c.glow}" stroke-width="1.2" opacity="0.9"/>
    <path d="M48 70 l2 5 M56 70.5 l1 6 M64 70.5 l-1 6 M72 70 l-2 5" stroke="${c.glow}" stroke-width="1.1" opacity="0.75"/>`;
  return svgWrap(inner, { size: o.size || 96, cls: `hp--villain ${o.cls || ''}`, label: 'Villain' });
}

/** Huy hieu UA (logo sidebar). */
export function uaCrest(size = 30) {
  const g = uid('uc');
  const inner = `
    <defs>
      <linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="var(--hero-accent)"/>
        <stop offset="1" stop-color="var(--hero-accent-2)"/>
      </linearGradient>
    </defs>
    <path d="M60 6 L110 24 C110 66 92 98 60 114 C28 98 10 66 10 24 Z" fill="url(#${g})" opacity="0.16"/>
    <path d="M60 6 L110 24 C110 66 92 98 60 114 C28 98 10 66 10 24 Z" fill="none" stroke="var(--hero-accent)" stroke-width="4"/>
    <path d="M34 40 L48 82 L60 52 L72 82 L86 40" fill="none" stroke="var(--text)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M46 92 C56 98 64 98 74 92" fill="none" stroke="var(--hero-accent-2)" stroke-width="4" stroke-linecap="round"/>`;
  return svgWrap(inner, { size, vb: '0 0 120 120', cls: 'hp--crest', label: 'UA' });
}

/* =========================================================================
   API: SET CSS VAR THEO HERO
   ========================================================================= */
/** Day bang mau hero len :root (hero.css dung cac var nay). */
export function setHeroVars(heroId, root = document.documentElement, palette = null, attrOverride = null) {
  const hero = getHero(heroId);
  const c = palette || hero.colors;
  root.style.setProperty('--hero-accent', c.accent);
  root.style.setProperty('--hero-accent-2', c.accent2);
  root.style.setProperty('--hero-glow', c.glow);
  root.style.setProperty('--hero-ink', c.ink);
  root.style.setProperty('--hero-hair', c.hair);
  root.style.setProperty('--hero-suit', c.suit);
  root.style.setProperty('--hero-line', c.line);
  root.style.setProperty('--hero-ink-text', '#f4f3fb');
  root.style.setProperty('--accent', c.accent);
  root.style.setProperty('--accent-2', c.accent2);
  root.style.setProperty('--accent-soft', hexA(c.accent, 0.18));
  root.style.setProperty('--accent-line', hexA(c.accent, 0.46));
  root.style.setProperty('--ring', hexA(c.accent, 0.55));
  root.style.setProperty('--grad-accent', `linear-gradient(135deg, ${c.accent}, ${c.accent2})`);
  root.style.setProperty('--grad-xp', `linear-gradient(90deg, ${c.accent2}, ${c.accent})`);
  root.style.setProperty('--grad-level', `linear-gradient(135deg, ${c.accent}, ${c.glow})`);
  root.style.setProperty('--grad-boss', `linear-gradient(150deg, ${hexA(c.glow, 0.5)}, ${hexA(c.ink, 0.75)})`);
  root.style.setProperty('--grad-streak', `linear-gradient(135deg, ${c.line}, ${c.glow})`);
  root.setAttribute('data-hero', attrOverride || hero.id);
  // hat confetti cung bang mau voi hero
  setFxPalette([c.accent, c.accent2, c.glow, c.line, '#ffffff']);
}

/** #rrggbb + alpha -> rgba() */
function hexA(hex, a) {
  const h = String(hex).replace('#', '');
  const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : h.slice(0, 6);
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/* ---- Tien ich mau (cho che do "Tu y chinh anh") ---- */
function toRgb(hex) {
  const h = String(hex || '').replace('#', '');
  const full = h.length === 3 ? h.split('').map((x) => x + x).join('') : (h + '000000').slice(0, 6);
  const n = parseInt(full, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function toHex(rgb) {
  return '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
/** Tron 2 mau: t = 0 -> a, t = 1 -> b. */
function mix(a, b, t) {
  const A = toRgb(a);
  const B = toRgb(b);
  return toHex([0, 1, 2].map((i) => A[i] + (B[i] - A[i]) * t));
}

/**
 * Che do "Tu y": sinh bo mau hero tu 2 mau nhan, de UI luon dong bo.
 */
export function applyCustomPalette(accent, accent2, root = document.documentElement) {
  const a = accent || '#7c5cff';
  const b = accent2 || '#22d3ee';
  setHeroVars(
    'allmight',
    root,
    {
      accent: a,
      accent2: b,
      glow: mix(b, '#ff3d5e', 0.45),
      ink: mix(a, '#05060d', 0.82),
      hair: mix(a, '#ffffff', 0.45),
      suit: mix(a, '#0d1226', 0.55),
      line: mix(b, '#ffffff', 0.4),
    },
    'custom'
  );
}


/* =========================================================================
   API: NEAN ANH HUNG (nen man hinh)
   ========================================================================= */
/**
 * Tao / cap nhat cac lop nen: bau troi, chay, duong chÃ¢n trá»i thÃ nh phá»‘,
 * bung sang va hat lien tuc. Chi tao mot lan.
 */
export function mountHeroStage(hostId = 'heroBg') {
  const host = document.getElementById(hostId);
  if (!host || host.dataset.mounted === '1') return;
  host.dataset.mounted = '1';
  host.setAttribute('aria-hidden', 'true');
  host.innerHTML = `
    <div class="hb-sky"></div>
    <div class="hb-rays"></div>
    <div class="hb-clouds">
      <div class="hb-cloud c1"></div>
      <div class="hb-cloud c2"></div>
      <div class="hb-cloud c3"></div>
    </div>
    <div class="hb-city">
      <svg class="hb-far" viewBox="0 0 1200 260" preserveAspectRatio="none">
        <path d="M0 260V150h40v-30h34v30h28v-52h44v52h30v-24h38v24h34v-64h46v64h30v-30h40v30h34v-46h42v46h30v-70h48v70h30v-26h40v26h34v-52h44v52h30v-34h38v34h34v-60h46v60h30v-20h40v20h44v130z"/>
      </svg>
      <svg class="hb-near" viewBox="0 0 1200 220" preserveAspectRatio="none">
        <path d="M0 220V120h64v-40h52v40h44v-70h70v70h50v-34h60v34h54v-84h76v84h56v-46h64v46h58v-64h72v64h52v-28h60v28h64v-74h74v74h60v100z"/>
        <g class="hb-win">
          <rect x="196" y="140" width="10" height="14"/><rect x="214" y="140" width="10" height="14"/>
          <rect x="196" y="164" width="10" height="14"/><rect x="232" y="164" width="10" height="14"/>
          <rect x="360" y="128" width="10" height="14"/><rect x="380" y="128" width="10" height="14"/>
          <rect x="360" y="152" width="10" height="14"/><rect x="400" y="152" width="10" height="14"/>
          <rect x="540" y="146" width="10" height="14"/><rect x="560" y="146" width="10" height="14"/>
          <rect x="700" y="120" width="10" height="14"/><rect x="720" y="120" width="10" height="14"/>
          <rect x="700" y="146" width="10" height="14"/><rect x="740" y="146" width="10" height="14"/>
          <rect x="900" y="134" width="10" height="14"/><rect x="920" y="134" width="10" height="14"/>
          <rect x="1060" y="150" width="10" height="14"/><rect x="1080" y="150" width="10" height="14"/>
        </g>
      </svg>
    </div>
    <div class="hb-dust"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
    <div class="hb-vignette"></div>`;
}

/* =========================================================================
   API: HIEU UNG CHIEN DAU
   ========================================================================= */
function fxHost() {
  let host = document.getElementById('heroFx');
  if (!host) {
    host = document.createElement('div');
    host.id = 'heroFx';
    host.className = 'hero-fx';
    host.setAttribute('aria-hidden', 'true');
    document.body.appendChild(host);
  }
  return host;
}

function tmp(html, cls, ttl, host) {
  const node = document.createElement('div');
  node.className = 'hx ' + cls;
  node.innerHTML = html;
  host.appendChild(node);
  setTimeout(() => {
    node.classList.add('is-out');
    setTimeout(() => node.remove(), 420);
  }, ttl);
  return node;
}

/** Lam rung ca cua so (screen shake). */
function shake(power = 1) {
  const app = document.getElementById('app');
  if (!app) return;
  app.style.setProperty('--shake', String(power));
  app.classList.remove('is-shaking');
  void app.offsetWidth;
  app.classList.add('is-shaking');
  setTimeout(() => app.classList.remove('is-shaking'), 460);
}

/**
 * Hieu ung "SMASH" khi hoan thanh mot quest.
 * @param {object} o { x, y, hero, text, power: 0..2, kind }
 */
export function playSmash(o = {}) {
  const level = fxLevel();
  if (level === 'off') return;
  const soft = level === 'soft';
  const hero = getHero(o.hero);
  const host = fxHost();
  const x = typeof o.x === 'number' ? o.x : window.innerWidth / 2;
  const y = typeof o.y === 'number' ? o.y : window.innerHeight / 2;
  const power = Math.max(0, Math.min(2, o.power == null ? 1 : o.power));
  const text = o.text || pickSmash(hero.id);
  const scale = 1 + power * 0.35;

  // 1) chanh man hinh
  tmp('', 'hx-flash', soft ? 160 : 260, host);

  // 2) vong song kich tai diem cham
  const rings = soft ? 1 : power >= 1.6 ? 3 : 2;
  const wave = document.createElement('div');
  wave.className = 'hx hx-wave';
  wave.style.left = x + 'px';
  wave.style.top = y + 'px';
  wave.style.setProperty('--scale', String(scale));
  for (let i = 0; i < rings; i++) {
    const r = document.createElement('span');
    r.style.animationDelay = i * 90 + 'ms';
    wave.appendChild(r);
  }
  host.appendChild(wave);
  setTimeout(() => wave.remove(), 1200);

  // 3) ngoi sao va cham
  const star = document.createElement('div');
  star.className = 'hx hx-star';
  star.style.left = x + 'px';
  star.style.top = y + 'px';
  star.innerHTML = `<svg viewBox="0 0 120 120" width="${Math.round(150 * scale)}" height="${Math.round(150 * scale)}">
    <path d="M60 4 L70 44 L104 22 L80 54 L118 60 L80 68 L102 100 L68 78 L60 116 L52 78 L18 100 L40 68 L2 60 L40 54 L16 22 L50 44 Z"
      fill="var(--hero-accent)" opacity="0.9"/></svg>`;
  host.appendChild(star);
  setTimeout(() => star.remove(), 900);

  // 4) duong toc do (speed lines)
  if (!soft) {
    const lines = document.createElement('div');
    lines.className = 'hx hx-speed';
    lines.style.left = x + 'px';
    lines.style.top = y + 'px';
    host.appendChild(lines);
    setTimeout(() => lines.remove(), 900);
  }

  // 5) chu comic (giu trong man hinh, chu dai -> chu nho)
  const half = Math.min(240, window.innerWidth * 0.42);
  const cx = Math.max(half, Math.min(window.innerWidth - half, x));
  const comic = document.createElement('div');
  comic.className = 'hx hx-comic';
  comic.style.left = cx + 'px';
  comic.style.top = Math.max(90, y - 40) + 'px';
  comic.style.setProperty('--rot', (Math.random() * 10 - 5).toFixed(1) + 'deg');
  comic.style.setProperty('--len', String(text.length));
  comic.innerHTML = `<span>${escapeText(text)}</span>`;
  host.appendChild(comic);
  setTimeout(() => {
    comic.classList.add('is-out');
    setTimeout(() => comic.remove(), 400);
  }, 900);

  if (!soft) shake(power);
}

/** Banner lon giua man hinh ("PLUS ULTRA!", "PERFECT DAY!"). */
export function playBanner(main, sub, heroId) {
  const level = fxLevel();
  if (level === 'off') return;
  const host = fxHost();
  const hero = getHero(heroId);
  const node = document.createElement('div');
  node.className = 'hx hx-banner';
  node.innerHTML = `
    <div class="hbn-inner">
      <div class="hbn-main">${escapeText(main)}</div>
      ${sub ? `<div class="hbn-sub">${escapeText(sub)}</div>` : ''}
      <div class="hbn-rule"></div>
    </div>`;
  host.appendChild(node);
  if (level === 'full') shake(1.2);
  setTimeout(() => {
    node.classList.add('is-out');
    setTimeout(() => node.remove(), 500);
  }, level === 'soft' ? 1200 : 1700);
  return hero;
}

/**
 * Over "LENG HANG": the rank anh hung + bung tia.
 * @param {object} o { level, rank, tier, hero, name }
 */
export function playRankUp(o = {}) {
  const level = fxLevel();
  const host = fxHost();
  const hero = getHero(o.hero);
  const node = document.createElement('div');
  node.className = 'hx hx-rank';
  node.innerHTML = `
    <div class="hrk-rays"></div>
    <div class="hrk-card">
      <div class="hrk-portrait">${heroPortrait(hero.id, { size: 118, mood: 'cheer' })}</div>
      <div class="hrk-info">
        <div class="hrk-kicker">HERO RANK UP</div>
        <div class="hrk-tier">${escapeText(o.tier || 'S')}</div>
        <div class="hrk-name">${escapeText(o.rank || '')}</div>
        <div class="hrk-level">LV ${escapeText(String(o.level || 1))}</div>
      </div>
    </div>`;
  host.appendChild(node);
  if (level !== 'off' && level !== 'soft') {
    shake(1.4);
    // de the LEN HANG tho xong moi day banner, hai thu chong len nhau rat roi
    setTimeout(() => playBanner(hero.ultraVi, hero.heroName, hero.id), 620);
  }
  setTimeout(() => {
    node.classList.add('is-out');
    setTimeout(() => node.remove(), 520);
  }, 2600);
}

/** Dong "SMASHED" len the quest vua xong. */
export function stampQuest(node, text = 'SMASHED') {
  if (!node || fxLevel() === 'off') return;
  node.classList.remove('is-smashed');
  void node.offsetWidth;
  node.classList.add('is-smashed');
  const stamp = document.createElement('div');
  stamp.className = 'hx hx-stamp';
  stamp.textContent = text;
  node.appendChild(stamp);
  setTimeout(() => {
    stamp.classList.add('is-out');
    setTimeout(() => stamp.remove(), 400);
  }, 780);
  setTimeout(() => node.classList.remove('is-smashed'), 1000);
}

/** Set lop aura tren body theo streak (One For All cang manh cang sang). */
export function syncHeroAura(streakCount) {
  const b = document.body;
  const n = Math.max(0, Number(streakCount) || 0);
  b.classList.toggle('aura-1', n >= 3);
  b.classList.toggle('aura-2', n >= 7);
  b.classList.toggle('aura-3', n >= 30);
}

function escapeText(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
