/*
 * recurrence.js - QUY LUAT XUAT HIEN SU KIEN (kieu Google Calendar)
 * ----------------------------------------------------------------
 * Thuan tuy (khong DOM) -> test duoc bang Node. Xac dinh mot su kien lich
 * trinh co dien ra vao mot ngay (YYYY-MM-DD) hay khong, du la:
 *   - cac ngay cu the (dates[])            -> giong RDATE
 *   - lap hang ngay / hang tuan / hang thang (repeat.freq + interval)
 *   - co khoang ngay (startDate..endDate)  -> giong DTSTART..UNTIL
 * Tuong thich nguoc: su kien chi co `days` (thu) van hien hang tuan vo han.
 */

import { parseDateKey, dateKey, addDaysKey, diffDays, startOfWeekMonday } from './utils.js';

/** Date local nua dem (bo gio/phut/giay). */
function midnight(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** 'HH:MM' -> so phut (0..1439), mac dinh 0. */
function toMin(hhmm) {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** timestamp local cua ngay + gio 'HH:MM'. */
function tsFor(dateKeyStr, hhmm) {
  const d = parseDateKey(dateKeyStr);
  const [h, m] = String(hhmm || '0:0').split(':').map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d.getTime();
}

/** Lay tan suat (freq) thuc te cua event, suy ra nguoc tu `days`/`dates`. */
export function effectiveFreq(event) {
  const rep = event.repeat || {};
  if (rep.freq) return rep.freq;
  if (Array.isArray(event.dates) && event.dates.length) return 'dates';
  if (Array.isArray(event.days) && event.days.length) return 'weekly';
  return 'none';
}

/**
 * Su kien co dien ra vao ngay `dk` (YYYY-MM-DD)?
 */
export function eventOccursOnDate(event, dk) {
  if (!event || !dk) return false;

  // 1) Danh sach ngay cu the chi phoi
  if (Array.isArray(event.dates) && event.dates.length) {
    return event.dates.includes(dk);
  }

  const rep = event.repeat || {};
  const freq = rep.freq || (Array.isArray(event.days) && event.days.length ? 'weekly' : 'none');
  const d = midnight(parseDateKey(dk));
  const start = event.startDate ? midnight(parseDateKey(event.startDate)) : null;
  const end = event.endDate ? midnight(parseDateKey(event.endDate)) : null;

  // 2) Kiem tra khoang ngay (DTSTART..UNTIL)
  if (start && d < start) return false;
  if (end && d > end) return false;

  switch (freq) {
    case 'none':
      // mot lan vao startDate (hoac suat hien moi ngay neu khong co moc)
      return start ? dk === event.startDate : true;

    case 'daily': {
      const iv = Math.max(1, Number(rep.interval) || 1);
      if (!start) return true;
      const diff = diffDays(event.startDate, dk);
      return diff >= 0 && diff % iv === 0;
    }

    case 'monthly': {
      const by =
        Array.isArray(rep.byMonthDays) && rep.byMonthDays.length
          ? rep.byMonthDays
          : [start ? start.getDate() : d.getDate()];
      if (!by.includes(d.getDate())) return false;
      const iv = Math.max(1, Number(rep.interval) || 1);
      if (iv === 1 || !start) return true;
      const months = (d.getFullYear() - start.getFullYear()) * 12 + (d.getMonth() - start.getMonth());
      return months >= 0 && months % iv === 0;
    }

    case 'weekly':
    default: {
      const wd = d.getDay();
      const by =
        Array.isArray(event.days) && event.days.length
          ? event.days
          : Array.isArray(rep.byWeekdays)
          ? rep.byWeekdays
          : [];
      if (!by.length) return start ? wd === start.getDay() : false;
      if (!by.includes(wd)) return false;
      const iv = Math.max(1, Number(rep.interval) || 1);
      if (iv === 1 || !start) return true;
      // dem so tuan tu tuan cua startDate (moc thu Hai)
      const weeks = Math.round(diffDays(dateKey(startOfWeekMonday(start)), dateKey(startOfWeekMonday(d))) / 7);
      return weeks >= 0 && weeks % iv === 0;
    }
  }
}

/** Danh sach {event, dateKey} cac suat trong [fromDateKey, +horizon ngay). */
export function occurrencesInRange(state, fromDateKey, horizon = 30) {
  const out = [];
  for (let i = 0; i < horizon; i++) {
    const dk = addDaysKey(fromDateKey, i);
    for (const e of state.schedule) {
      if (eventOccursOnDate(e, dk)) out.push({ event: e, dateKey: dk });
    }
  }
  return out;
}

/**
 * Su kien sap toi (som nhat > hien tai) trong `horizon` ngay.
 * Tra ve { event, dateKey, ts } hoac null.
 */
export function findNextEvent(state, fromDateKey, now = new Date(), horizon = 60) {
  const nowTs = now.getTime();
  let best = null;
  for (let i = 0; i < horizon; i++) {
    const dk = addDaysKey(fromDateKey, i);
    for (const e of state.schedule) {
      if (!eventOccursOnDate(e, dk)) continue;
      const ts = tsFor(dk, e.start);
      if (ts > nowTs && (!best || ts < best.ts)) best = { event: e, dateKey: dk, ts };
    }
  }
  return best;
}

/** Mo ta ngan gon luat lap cho UI (vd "Hàng tuần · T2 T4"). */
export function describeRepeat(event, lang = 'vi') {
  const short = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const freq = effectiveFreq(event);
  const rep = event.repeat || {};
  const iv = Math.max(1, Number(rep.interval) || 1);
  const every = iv > 1 ? (lang === 'en' ? ` every ${iv}` : ` mỗi ${iv}`) : '';
  if (Array.isArray(event.dates) && event.dates.length) {
    return lang === 'en' ? `${event.dates.length} specific dates` : `${event.dates.length} ngày cụ thể`;
  }
  switch (freq) {
    case 'none':
      return event.startDate ? (lang === 'en' ? `One-time · ${event.startDate}` : `Một lần · ${event.startDate}`) : lang === 'en' ? 'One-time' : 'Một lần';
    case 'daily':
      return lang === 'en' ? `Daily${every}` : `Hàng ngày${every}`;
    case 'monthly': {
      const by = Array.isArray(rep.byMonthDays) && rep.byMonthDays.length ? rep.byMonthDays.join(', ') : event.startDate ? String(parseDateKey(event.startDate).getDate()) : '?';
      return (lang === 'en' ? `Monthly · day ${by}` : `Hàng tháng · ngày ${by}`) + every;
    }
    case 'weekly':
    default: {
      const by = (Array.isArray(event.days) && event.days.length ? event.days : rep.byWeekdays || []).slice().sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b));
      const wd = by.map((i) => short[i]).join(' ');
      return (lang === 'en' ? `Weekly · ${wd}` : `Hàng tuần · ${wd}`) + every;
    }
  }
}

/** Bo xung mot chuoi YYYY-MM-DD hop le khong. */
export function isValidDateStr(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = parseDateKey(s);
  return dateKey(d) === s; // loai ngay khong ton tai (vd 2026-02-30)
}
