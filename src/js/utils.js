/*
 * utils.js - HAM Tien ich dung chung
 * ----------------------------------
 * Id, xu ly ngay gio local (YYYY-MM-DD theo "gio bat dau ngay"), dinh dang
 * thoi gian/song, clamp, debounce, deepClone, escapeHTML, random, DOM helper.
 * KHONG dung den timezone UTC de tranh loi lech ngay dem.
 */

/* ============================ ID ============================ */
/** Sinh id ngan, du doc lap thoi gian + ngau nhien. */
export function uid(prefix = 'id') {
  const t = Date.now().toString(36).slice(-5);
  const r = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${t}${r}`;
}

/* ============================ SO ============================ */
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
export const round = (n, d = 0) => {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
};
export const pct = (part, whole) => (whole <= 0 ? 0 : clamp(Math.round((part / whole) * 100), 0, 100));
export const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Dinh dang so theo kieu VN: 1240 -> "1.240" */
export function formatNumber(n) {
  return (n ?? 0).toLocaleString('vi-VN');
}

/* ============================ TAP ============================ */
export function uniq(arr) {
  return [...new Set(arr)];
}
export function groupBy(arr, fn) {
  return arr.reduce((acc, x) => {
    const k = fn(x);
    (acc[k] ||= []).push(x);
    return acc;
  }, {});
}
export function sum(arr, fn = (x) => x) {
  return arr.reduce((s, x) => s + (fn(x) || 0), 0);
}

/* ============================ DEEP / DOM ============================ */
export function deepClone(obj) {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(obj);
    } catch (e) {}
  }
  return JSON.parse(JSON.stringify(obj));
}

export function debounce(fn, wait = 400) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function throttle(fn, wait = 200) {
  let last = 0;
  let timer;
  return (...args) => {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn(...args);
    } else {
      clearTimeout(timer);
      timer = setTimeout(() => {
        last = Date.now();
        fn(...args);
      }, wait - (now - last));
    }
  };
}

/** Escape ky tu HTML de chen chuoi an toan vao innerHTML. */
export function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Tao phan tu tu HTML chuoi. */
export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

/** $ / $$ querySelector shortcut. */
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ============================ NGAY GIO (LOCAL) ============================ */
const pad = (n) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' tu Date local (khong bi lech múi giờ). */
export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse 'YYYY-MM-DD' -> Date local (00:00). */
export function parseDateKey(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Kiem tra ngay that ton tai (loai 31/02, 30/02...). */
function isRealDate(y, mIndex, d) {
  if (!(d >= 1 && d <= 31) || !(mIndex >= 0 && mIndex <= 11)) return false;
  const dt = new Date(y, mIndex, d);
  return dt.getFullYear() === y && dt.getMonth() === mIndex && dt.getDate() === d;
}

/**
 * Chen nhat ngay o nhieu dinh dang tra ve 'YYYY-MM-DD' (luu tru noi bo),
 * hoac null neu sai. Chap nhan:
 *   - 'YYYY-MM-DD' (chuan)
 *   - 'DD/MM/YYYY' hoac 'D/M/YY' (kieu Viet Nam)
 */
export function parseFlexibleDate(input) {
  if (input == null) return null;
  const s = String(input).trim();
  if (!s) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) {
    const y = +m[1], mo = +m[2], d = +m[3];
    return isRealDate(y, mo - 1, d) ? `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null;
  }
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(s); // DD/MM/YYYY
  if (m) {
    let y = +m[3];
    if (y < 100) y += y < 70 ? 2000 : 1900;
    const d = +m[1], mo = +m[2];
    return isRealDate(y, mo - 1, d) ? `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null;
  }
  return null;
}

/** 'YYYY-MM-DD' -> 'DD/MM/YYYY' de hien thi. */
export function formatDateShort(iso) {
  if (!iso || typeof iso !== 'string') return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/**
 * "Ngay choi" (game day) cho mot thoi diem: neu gio hien tai < dayStartHour
 * thi tinh thuoc NGAY HOM QUA (vi nguoi thuc khuya van coi la "hom nay").
 */
export function gameDayKey(d = new Date(), dayStartHour = 4) {
  const copy = new Date(d.getTime());
  if (copy.getHours() < dayStartHour) copy.setDate(copy.getDate() - 1);
  return dateKey(copy);
}

/** Cong N ngay vao dateKey (giu dinh dang YYYY-MM-DD). */
export function addDaysKey(key, n) {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/** Hieu so ngay giua 2 dateKey (b - a), theo ngay local. */
export function diffDays(aKey, bKey) {
  const a = parseDateKey(aKey).getTime();
  const b = parseDateKey(bKey).getTime();
  return Math.round((b - a) / 86400000);
}

/** Thu trong tuan 0..6 (0 = CN) tu dateKey. */
export function weekdayOf(key) {
  return parseDateKey(key).getDay();
}

/** Date local dau tuan (thu Hai) cua mot dateKey. */
export function startOfWeekMonday(d = new Date()) {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = copy.getDay(); // 0 CN..6 T7
  const diff = day === 0 ? -6 : 1 - day; // ve thu Hai
  copy.setDate(copy.getDate() + diff);
  return copy;
}

/* ============================ DINH DANG THOI GIAN ============================ */
const WEEKDAYS_VI = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
const WEEKDAYS_SHORT_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_SHORT_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS_VI = ['tháng 1', 'tháng 2', 'tháng 3', 'tháng 4', 'tháng 5', 'tháng 6', 'tháng 7', 'tháng 8', 'tháng 9', 'tháng 10', 'tháng 11', 'tháng 12'];

export function weekdayLabel(dayIndex, lang = 'vi', short = false) {
  const i = clamp(dayIndex, 0, 6);
  if (lang === 'en') return short ? WEEKDAYS_SHORT_EN[i] : WEEKDAYS_EN[i];
  return short ? WEEKDAYS_SHORT_VI[i] : WEEKDAYS_VI[i];
}

/** 'Thứ Ba, 20 tháng 10' */
export function formatDateLong(d = new Date(), lang = 'vi') {
  if (lang === 'en') {
    return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  }
  return `${WEEKDAYS_VI[d.getDay()]}, ${d.getDate()} ${MONTHS_VI[d.getMonth()]}`;
}

/** 'HH:MM' -> so phut tu 00:00. Tra null neu sai. */
export function timeToMinutes(str) {
  if (!str || typeof str !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(str.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** So phut -> 'HH:MM'. */
export function minutesToTime(mins) {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

/** Giay -> 'HH:MM:SS' (cho dem nguoc). */
export function secondsToClock(totalSeconds) {
  let s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Giay -> '2h 15m' / '45m' / '30s' (ngan gon). */
export function humanDuration(totalSeconds) {
  let s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

/** Gio hien tai -> buoi trong ngay (de chao + loi nhan). */
export function dayPart(d = new Date()) {
  const h = d.getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 13) return 'midday';
  if (h >= 13 && h < 18) return 'afternoon';
  if (h >= 18 && h < 23) return 'evening';
  return 'lateNight';
}

/* ============================ MAU ============================ */
/** Hex -> {r,g,b}. */
export function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full.slice(0, 6), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
/** Hex + alpha -> rgba() chuoi. */
export function withAlpha(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
/** Chanh (luminance) de quyet dinh chu den/trang tren nen mau. */
export function isLight(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}
