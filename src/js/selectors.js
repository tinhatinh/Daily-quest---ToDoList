/*
 * selectors.js - HAM TRUY VAN STATE (pure, khong side-effect)
 * -----------------------------------------------------------
 * Tach rieng de gamification + scheduler + pages cung dung, tranh vong
 * tron import. Tat ca lay (state, ...) tra ve gia tri tinh duoc, khong ghi.
 */

import { CATEGORIES, DIFFICULTIES } from './constants.js';
import { weekdayOf, diffDays, parseDateKey } from './utils.js';
import { eventOccursOnDate } from './recurrence.js';

/** Tim quest theo id. */
export function findQuest(state, id) {
  return state.quests.find((q) => q.id === id) || null;
}

/** XP goc cua quest (fallback theo do kho). */
export function questBaseXp(quest) {
  const n = Number(quest.xp);
  if (Number.isFinite(n) && n > 0) return n;
  return (DIFFICULTIES[quest.difficulty] || DIFFICULTIES.normal).xp;
}

/** Coin goc cua quest. */
export function questBaseCoin(quest) {
  const n = Number(quest.coin);
  if (Number.isFinite(n) && n >= 0) return n;
  return (DIFFICULTIES[quest.difficulty] || DIFFICULTIES.normal).coin;
}

/** Danh sach subtask chuan hoa: [{id,title,}] (template, khong luu done o day). */
export function questSubtasks(quest) {
  return (quest.subtasks || []).map((s, i) =>
    typeof s === 'string' ? { id: `st_${i}`, title: s } : { id: s.id || `st_${i}`, title: s.title || '' }
  );
}

/** DayRecord cho mot ngay (khong tao moi). */
export function peekDay(state, dateKey) {
  return state.dayRecords[dateKey] || null;
}

/** Quest nay da xong VAO ngay dateKey? */
export function isQuestCompletedOn(state, quest, dateKey) {
  const rec = peekDay(state, dateKey);
  return !!(rec && rec.quests && rec.quests[quest.id] && rec.quests[quest.id].done);
}

/** Quest one-time/side da xong lan nao chua (o bat ky ngay nao)? */
export function isQuestEverCompleted(state, quest) {
  if (quest.type !== 'one-time' && quest.type !== 'side') return false;
  return Object.values(state.dayRecords).some(
    (rec) => rec.quests && rec.quests[quest.id] && rec.quests[quest.id].done
  );
}

/** Lan hoan thanh gan nhat (dateKey) cua quest, hoac null. */
export function lastCompletedDay(state, quest) {
  let best = null;
  for (const [dk, rec] of Object.entries(state.dayRecords)) {
    if (rec.quests && rec.quests[quest.id] && rec.quests[quest.id].done) {
      if (!best || dk > best) best = dk;
    }
  }
  return best;
}

/**
 * Quest co "den han"/xuat hien vao ngay dateKey khong (de hien trong danh sach hom nay).
 * - daily: theo repeat.mode (everyday/weekdays/weekly/everyN).
 * - weekly: theo repeat.days (mac dinh hom nay).
 * - one-time / side: luon active cho toi khi hoan thanh (one-time) - side luon hien.
 */
export function isQuestDueOn(state, quest, dateKey) {
  if (quest.archived) return false;
  const wd = weekdayOf(dateKey);
  const repeat = quest.repeat || { mode: quest.type === 'daily' ? 'everyday' : 'none', days: [] };

  switch (quest.type) {
    case 'one-time':
      return !isQuestEverCompleted(state, quest);
    case 'side':
      return true; // side quest luon san co de lam bonus
    case 'weekly':
    case 'daily':
    default:
      break;
  }

  switch (repeat.mode) {
    case 'everyday':
      return true;
    case 'weekdays':
      return wd >= 1 && wd <= 5;
    case 'weekly':
      return (repeat.days && repeat.days.length ? repeat.days : [wd]).includes(wd);
    case 'everyN': {
      const n = Math.max(1, Number(repeat.everyNDays) || 1);
      const last = lastCompletedDay(state, quest);
      if (!last) return true;
      return Math.abs(diffDays(last, dateKey)) >= n;
    }
    case 'none':
      // khong lap: chi hien den khi hoan thanh mot lan
      return !isQuestEverCompleted(state, quest);
    default:
      return true;
  }
}

/** Danh sach quest den han trong ngay. */
export function getDueQuests(state, dateKey) {
  return state.quests.filter((q) => isQuestDueOn(state, q, dateKey));
}

/** Danh sach quest hom nay da loc + sap xep theo thu tu thu cong (order). */
export function getTodayQuests(state, dateKey) {
  return getDueQuests(state, dateKey).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** Trang thai hoan thanh mot quest hom nay (done + subtasks done). */
export function questCompletion(state, quest, dateKey) {
  const rec = peekDay(state, dateKey);
  const entry = rec && rec.quests && rec.quests[quest.id];
  const subs = questSubtasks(quest);
  const subDone = subs.filter((s) => entry && entry.subtasks && entry.subtasks[s.id]).length;
  return {
    done: !!(entry && entry.done) || isQuestEverCompleted(state, quest) && (quest.type === 'one-time' || quest.type === 'side') && isQuestCompletedOn(state, quest, dateKey),
    subDone,
    subTotal: subs.length,
  };
}

/** Tong hop tien do ngay: so luong + ti le %. */
export function dayProgress(state, dateKey) {
  const due = getDueQuests(state, dateKey);
  const done = due.filter((q) => isQuestCompletedOn(state, q, dateKey)).length;
  const total = due.length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0, due };
}

/** Ngay co phai "Perfect Day" (co it nhat 1 quest va xong het)? */
export function isPerfectDay(state, dateKey) {
  const { total, done } = dayProgress(state, dateKey);
  return total > 0 && done === total;
}

/** Ti le hoan thanh theo category trong ngay. */
export function categoryProgress(state, dateKey) {
  const due = getDueQuests(state, dateKey);
  const map = {};
  for (const q of due) {
    const cat = CATEGORIES[q.category] ? q.category : 'life';
    map[cat] ||= { total: 0, done: 0 };
    map[cat].total++;
    if (isQuestCompletedOn(state, q, dateKey)) map[cat].done++;
  }
  return map;
}

/** Danh sach su kien lich trinh trong ngay (0..6), theo luat xuat hien. */
export function eventsOnDay(state, dateKey) {
  return state.schedule
    .filter((e) => eventOccursOnDate(e, dateKey))
    .sort((a, b) => toMin(a.start) - toMin(b.start));
}

function toMin(hhmm) {
  const [h, m] = String(hhmm || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Tinh trang thai su kien hom nay: now (dang dien ra), next (sap toi). */
export function scheduleStatus(state, dateKey, now = new Date()) {
  const events = eventsOnDay(state, dateKey);
  const curMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  let happening = null;
  let upcoming = null;
  for (const e of events) {
    const s = toMin(e.start);
    const en = toMin(e.end);
    if (curMin >= s && curMin < en) happening = e;
    else if (curMin < s && !upcoming) upcoming = e;
  }
  return { events, happening, upcoming, curMin };
}

/** So luong to-do con/chua xong. */
export function todoCounts(state) {
  const total = state.todos.length;
  const done = state.todos.filter((x) => x.done).length;
  return { total, done, open: total - done };
}
