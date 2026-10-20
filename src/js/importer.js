/*
 * importer.js - KIEM TRA & NHAP JSON (quests / schedule)
 * ------------------------------------------------------
 * - parse() an toan (try/catch), khong bao gio crash vi JSON sai.
 * - validateQuests / validateSchedule: tra ve {ok, errors[], warnings[], items[]}
 *   trong do errors/warnings co duong truong ro rang kieu "quests[2].difficulty".
 * - normalize: dien gia tri mac dinh cho moi truong ngoai id/title (bat buoc).
 * - mergeQuests/mergeSchedule: che do Merge (bo trung id) hoac Replace.
 */

import {
  CATEGORIES,
  CATEGORY_IDS,
  DIFFICULTIES,
  DIFFICULTY_IDS,
  QUEST_TYPE_IDS,
  PRIORITY_IDS,
  REPEAT_MODE_IDS,
} from './constants.js';
import { uid, timeToMinutes, parseDateKey, parseFlexibleDate } from './utils.js';
import { isValidDateStr } from './recurrence.js';

/* ============================ PARSE ============================ */
/** Parse JSON an toan -> {ok, data, error}. */
export function parseJson(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return { ok: false, error: 'JSON trống' };
  }
  try {
    return { ok: true, data: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: 'JSON không hợp lệ: ' + (e.message || e) };
  }
}

/* ============================ ALIAS ============================ */
const TYPE_ALIAS = {
  daily: 'daily',
  day: 'daily',
  weekly: 'weekly',
  week: 'weekly',
  once: 'one-time',
  'one-time': 'one-time',
  one_time: 'one-time',
  onetime: 'one-time',
  side: 'side',
  sidequest: 'side',
  'side-quest': 'side',
  bonus: 'side',
};

/* ============================ QUEST ============================ */
/**
 * Chuan hoa 1 quest. Khong nem loi; gom errors/warnings.
 * @returns {{quest:object, errors:string[], warnings:string[]}}
 */
export function normalizeQuest(raw, index) {
  const errors = [];
  const warnings = [];
  const at = (field) => `quests[${index}].${field}`;

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { quest: null, errors: [`quests[${index}] phải là một object`], warnings };
  }

  // id
  let id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null;
  if (!id) {
    id = uid('q');
    warnings.push(`${at('id')} thiếu -> tự sinh ${id}`);
  }

  // title (bat buoc)
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (!title) errors.push(`${at('title')} là bắt buộc (chuỗi không rỗng)`);

  // type
  let type = QUEST_TYPE_IDS.includes(raw.type) ? raw.type : TYPE_ALIAS[String(raw.type || '').toLowerCase()];
  if (!type) {
    type = 'daily';
    warnings.push(`${at('type')} không nhận -> dùng "daily"`);
  }

  // difficulty
  let difficulty = DIFFICULTY_IDS.includes(raw.difficulty) ? raw.difficulty : null;
  if (!difficulty) {
    if (raw.difficulty != null) errors.push(`${at('difficulty')} phải là ${DIFFICULTY_IDS.join('|')}`);
    difficulty = 'normal';
    if (raw.difficulty == null) warnings.push(`${at('difficulty')} thiếu -> "normal"`);
  }

  // category
  let category = CATEGORY_IDS.includes(raw.category) ? raw.category : null;
  if (!category) {
    if (raw.category != null) warnings.push(`${at('category')} lạ -> "life"`);
    category = 'life';
  }

  // xp / coin (mac dinh theo do kho)
  const defXp = DIFFICULTIES[difficulty].xp;
  const defCoin = DIFFICULTIES[difficulty].coin;
  let xp = Number(raw.xp);
  if (!Number.isFinite(xp) || xp < 0) {
    xp = defXp;
    if (raw.xp != null) warnings.push(`${at('xp')} không hợp lệ -> ${defXp}`);
  }
  let coin = Number(raw.coin);
  if (!Number.isFinite(coin) || coin < 0) {
    coin = defCoin;
    if (raw.coin != null) warnings.push(`${at('coin')} không hợp lệ -> ${defCoin}`);
  }

  // repeat
  let repeat = { mode: type === 'daily' ? 'everyday' : type === 'weekly' ? 'weekly' : 'none', days: [] };
  if (raw.repeat && typeof raw.repeat === 'object') {
    const mode = REPEAT_MODE_IDS.includes(raw.repeat.mode) ? raw.repeat.mode : repeat.mode;
    let days = Array.isArray(raw.repeat.days) ? raw.repeat.days.map(Number).filter((n) => n >= 0 && n <= 6) : [];
    days = [...new Set(days)];
    repeat = { mode, days, everyNDays: Math.max(1, Number(raw.repeat.everyNDays) || 1) };
  }

  // deadline (gio trong ngay)
  let deadline = '';
  if (typeof raw.deadline === 'string' && raw.deadline.trim()) {
    if (timeToMinutes(raw.deadline) != null) deadline = raw.deadline.trim();
    else warnings.push(`${at('deadline')} phải là HH:MM -> bỏ qua`);
  }

  // dueDate (ngay den han) - chap nhan 'YYYY-MM-DD' hoac 'DD/MM/YYYY'; alias: due/date
  let dueDate = '';
  const dueRaw = raw.dueDate != null ? raw.dueDate : raw.due != null ? raw.due : raw.date;
  if (dueRaw != null && String(dueRaw).trim()) {
    const iso = parseFlexibleDate(dueRaw);
    if (iso) dueDate = iso;
    else errors.push(`${at('dueDate')} phải là YYYY-MM-DD hoặc DD/MM/YYYY`);
  }

  // subtasks -> mang chuoi
  let subtasks = [];
  if (Array.isArray(raw.subtasks)) {
    subtasks = raw.subtasks
      .map((s) => (typeof s === 'string' ? s : s && typeof s.title === 'string' ? s.title : ''))
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // tags
  let tags = Array.isArray(raw.tags) ? raw.tags.map((x) => String(x).trim()).filter(Boolean) : [];

  // priority
  let priority = PRIORITY_IDS.includes(raw.priority) ? raw.priority : 'medium';

  const quest = {
    id,
    title,
    description: typeof raw.description === 'string' ? raw.description : '',
    type,
    category,
    difficulty,
    xp: Math.round(xp),
    coin: Math.round(coin),
    repeat,
    deadline,
    dueDate,
    subtasks,
    tags,
    priority,
    order: Number.isFinite(Number(raw.order)) ? Number(raw.order) : null,
    archived: !!raw.archived,
    createdAt: raw.createdAt || Date.now(),
  };

  return { quest, errors, warnings };
}

/** validate toan bo kho quests. */
export function validateQuests(text) {
  const parsed = parseJson(text);
  if (!parsed.ok) return { ok: false, errors: [parsed.error], warnings: [], items: [] };
  const root = parsed.data;
  const arr = Array.isArray(root) ? root : root && Array.isArray(root.quests) ? root.quests : null;
  if (!arr) {
    return { ok: false, errors: ['Cần mảng "quests" (hoặc 1 mảng quest trực tiếp)'], warnings: [], items: [] };
  }
  const errors = [];
  const warnings = [];
  const items = [];
  arr.forEach((raw, i) => {
    const r = normalizeQuest(raw, i);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
    if (r.quest && r.errors.length === 0) items.push(r.quest);
  });
  return { ok: errors.length === 0, errors, warnings, items };
}

/* ============================ SCHEDULE ============================ */
/** Chuan hoa 1 su kien lich trinh. */
export function normalizeEvent(raw, index) {
  const errors = [];
  const warnings = [];
  const at = (field) => `schedule[${index}].${field}`;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { event: null, errors: [`schedule[${index}] phải là một object`], warnings };
  }
  let id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : uid('s');
  if (typeof raw.id !== 'string' || !raw.id.trim()) warnings.push(`${at('id')} thiếu -> tự sinh ${id}`);
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (!title) errors.push(`${at('title')} là bắt buộc`);

  const start = timeToMinutes(raw.start);
  const end = timeToMinutes(raw.end);
  if (start == null) errors.push(`${at('start')} phải là HH:MM`);
  if (end == null) errors.push(`${at('end')} phải là HH:MM`);
  if (start != null && end != null && end <= start) warnings.push(`${at('end')} nên sau ${at('start')}`);

  let category = CATEGORY_IDS.includes(raw.category) ? raw.category : 'life';
  if (!CATEGORY_IDS.includes(raw.category) && raw.category != null) warnings.push(`${at('category')} lạ -> "life"`);

  let days = Array.isArray(raw.days) ? [...new Set(raw.days.map(Number).filter((n) => n >= 0 && n <= 6))] : [1, 2, 3, 4, 5];
  if (!days.length) {
    days = [0, 1, 2, 3, 4, 5, 6];
    warnings.push(`${at('days')} rỗng -> cả tuần`);
  }

  // ---- Ngay thang + luat lap (kieu Google Calendar) ----
  const rep = raw.repeat && typeof raw.repeat === 'object' ? raw.repeat : {};
  const FREQS = ['none', 'daily', 'weekly', 'monthly'];
  let freq = typeof rep.freq === 'string' && FREQS.includes(rep.freq) ? rep.freq : null;
  if (rep.freq != null && !freq) errors.push(`${at('repeat.freq')} phải là none|daily|weekly|monthly`);
  if (!freq) freq = days.length ? 'weekly' : 'none';

  const interval = Math.max(1, Math.min(365, Number(rep.interval) || 1));

  // byWeekdays (weekly) -> dong bo voi `days`
  let byWeekdays = Array.isArray(rep.byWeekdays)
    ? [...new Set(rep.byWeekdays.map(Number).filter((n) => n >= 0 && n <= 6))]
    : [];
  if (!byWeekdays.length) byWeekdays = days.slice();

  // byMonthDays (monthly)
  let byMonthDays = Array.isArray(rep.byMonthDays)
    ? [...new Set(rep.byMonthDays.map(Number).filter((n) => n >= 1 && n <= 31))]
    : [];

  // startDate / endDate (YYYY-MM-DD)
  let startDate = '';
  if (raw.startDate != null && String(raw.startDate).trim()) {
    const s = String(raw.startDate).trim();
    if (isValidDateStr(s)) startDate = s;
    else errors.push(`${at('startDate')} phải là YYYY-MM-DD`);
  }
  let endDate = '';
  if (raw.endDate != null && String(raw.endDate).trim()) {
    const s = String(raw.endDate).trim();
    if (isValidDateStr(s)) endDate = s;
    else errors.push(`${at('endDate')} phải là YYYY-MM-DD`);
  }
  if (startDate && endDate && endDate < startDate) errors.push(`${at('endDate')} phải sau ${at('startDate')}`);

  // dates[] (ngay cu the, giong RDATE)
  let dates = [];
  if (Array.isArray(raw.dates)) {
    const rawDates = raw.dates.map((s) => String(s).trim()).filter(Boolean);
    rawDates.forEach((s) => { if (!isValidDateStr(s)) errors.push(`${at('dates')} "${s}" không phải YYYY-MM-DD`); });
    dates = [...new Set(rawDates.filter((s) => isValidDateStr(s)))].sort();
  }

  // if weekly but no weekday chosen, suy ra theo thu cua startDate
  if (freq === 'weekly' && !byWeekdays.length && startDate) byWeekdays = [parseDateKey(startDate).getDay()];
  if (freq === 'none' && !startDate && !dates.length) {
    warnings.push(`${at('repeat.freq')}="none" cần startDate hoặc dates để sự kiện xuất hiện`);
  }

  const daysOut = freq === 'weekly' ? byWeekdays : days;

  const event = {
    id,
    title,
    start: raw.start || '09:00',
    end: raw.end || '10:00',
    days: daysOut,
    category,
    linkedQuestId: typeof raw.linkedQuestId === 'string' ? raw.linkedQuestId : '',
    note: typeof raw.note === 'string' ? raw.note : '',
    reminderMinutes: Math.max(0, Number(raw.reminderMinutes) || 0),
    startDate,
    endDate,
    dates,
    repeat: { freq, interval, byWeekdays, byMonthDays },
  };
  return { event, errors, warnings };
}

/** validate kho schedule. */
export function validateSchedule(text) {
  const parsed = parseJson(text);
  if (!parsed.ok) return { ok: false, errors: [parsed.error], warnings: [], items: [] };
  const root = parsed.data;
  const arr = Array.isArray(root) ? root : root && Array.isArray(root.schedule) ? root.schedule : null;
  if (!arr) {
    return { ok: false, errors: ['Cần mảng "schedule" (hoặc 1 mảng sự kiện trực tiếp)'], warnings: [], items: [] };
  }
  const errors = [];
  const warnings = [];
  const items = [];
  arr.forEach((raw, i) => {
    const r = normalizeEvent(raw, i);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
    if (r.event && r.errors.length === 0) items.push(r.event);
  });
  return { ok: errors.length === 0, errors, warnings, items };
}

/* ============================ MERGE ============================ */
/** Gan order tang dan cho nhung item chua co order. */
function assignOrder(list) {
  let max = 0;
  list.forEach((q) => {
    if (Number.isFinite(q.order) && q.order != null) max = Math.max(max, q.order);
  });
  list.forEach((q) => {
    if (q.order == null) q.order = ++max;
  });
  return list;
}

/**
 * Hop nhat danh sach theo id.
 * @param {'merge'|'replace'} mode
 * @returns {{result:Array, added:number, skipped:number}}
 */
export function mergeById(existing, incoming, mode) {
  if (mode === 'replace') {
    const result = assignOrder(incoming.map((x) => ({ ...x })));
    return { result, added: result.length, skipped: 0 };
  }
  const ids = new Set(existing.map((x) => x.id));
  const toAdd = [];
  let skipped = 0;
  for (const item of incoming) {
    if (ids.has(item.id)) skipped++;
    else {
      ids.add(item.id);
      toAdd.push({ ...item, order: null });
    }
  }
  const result = assignOrder([...existing, ...toAdd]);
  return { result, added: toAdd.length, skipped };
}

/** Tao chuoi JSON de xuat (pretty). */
export function toJson(obj) {
  return JSON.stringify(obj, null, 2);
}
