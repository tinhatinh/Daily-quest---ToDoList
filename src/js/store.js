/*
 * store.js - STATE TAP TRUNG + PERSIST + UNDO/REDO
 * ------------------------------------------------
 * - Mot object state duy nhat, pub/sub don gian (subscribe/notify).
 * - update(recipe, opts): clone -> recipe(mutate draft) -> set state -> notify
 *   -> len lich undo (neu opts.undoable) -> goi persist (debounce).
 * - undo/redo: stack snapshot (gioi han 60).
 * - Persist qua window.api.saveData (main process ghi atomic + backup).
 * - migrate() dien truong con thieu de chong du lieu hong/lac hau.
 */

import {
  DEFAULT_SETTINGS,
  DEFAULT_SHOP,
} from './constants.js';
import { deepClone, debounce, gameDayKey } from './utils.js';

const SCHEMA_VERSION = 1;
const UNDO_LIMIT = 60;

/** Trang thai ran moi hoan toan (chua co du lieu nguoi dung). */
export function createDefaultState() {
  return {
    version: SCHEMA_VERSION,
    onboardingDone: false,
    profile: { name: '', avatar: '🦊', createdAt: null },
    game: {
      level: 1,
      xp: 0,
      totalXp: 0,
      coin: 0,
      streak: { count: 0, lastDay: null, freezes: 0, max: 0 },
      combo: { count: 0, lastTime: 0 },
      achievements: {}, // { [achId]: 'YYYY-MM-DD' }
    },
    stats: {
      totalQuests: 0,
      totalCoinsEarned: 0,
      todosDone: 0,
      focusSessions: 0,
      journalDays: 0,
      perfectDays: 0,
      epicDone: 0,
      bossSlain: 0,
      subtaskDone: 0,
      maxStreak: 0,
      redeems: 0,
    },
    flags: {
      earlyBird: false,
      nightOwl: false,
      combo5: false,
      perfectDay: false,
      epicDone: false,
      bossSlain: false,
      subtaskDone: false,
    },
    quests: [],
    todos: [],
    schedule: [],
    shop: DEFAULT_SHOP.map((r) => ({ ...r, redeemed: 0 })),
    journal: {}, // { [dateKey]: { text, mood, xp, questsDone } }
    dayRecords: {}, // { [dateKey]: { quests:{}, xpEarned, coinEarned, todosDone:[], perfect } }
    boss: { date: null, questId: null },
    settings: { ...DEFAULT_SETTINGS },
    meta: { createdAt: null, lastSeenDay: null },
  };
}

/** Dien cac truong con thieu so voi schema hien tai (chong lac hau). */
function migrate(raw) {
  const base = createDefaultState();
  if (!raw || typeof raw !== 'object') return base;
  const s = { ...base, ...raw };
  s.profile = { ...base.profile, ...(raw.profile || {}) };
  s.game = {
    ...base.game,
    ...(raw.game || {}),
    streak: { ...base.game.streak, ...((raw.game || {}).streak || {}) },
    combo: { ...base.game.combo, ...((raw.game || {}).combo || {}) },
    achievements: { ...((raw.game || {}).achievements || {}) },
  };
  s.stats = { ...base.stats, ...(raw.stats || {}) };
  s.flags = { ...base.flags, ...(raw.flags || {}) };
  s.settings = { ...DEFAULT_SETTINGS, ...(raw.settings || {}) };
  s.boss = { ...base.boss, ...(raw.boss || {}) };
  s.meta = { ...base.meta, ...(raw.meta || {}) };
  s.quests = Array.isArray(raw.quests) ? raw.quests : [];
  s.todos = Array.isArray(raw.todos) ? raw.todos : [];
  s.schedule = Array.isArray(raw.schedule) ? raw.schedule : [];
  s.shop = Array.isArray(raw.shop) && raw.shop.length ? raw.shop : base.shop;
  s.journal = raw.journal && typeof raw.journal === 'object' ? raw.journal : {};
  s.dayRecords = raw.dayRecords && typeof raw.dayRecords === 'object' ? raw.dayRecords : {};
  s.version = SCHEMA_VERSION;
  return s;
}

class Store {
  constructor() {
    this._state = createDefaultState();
    this._subs = new Set();
    this._undoStack = [];
    this._redoStack = [];
    this._persist = debounce(() => this._flush(), 600);
    this._ready = false;
    this._lastError = null;
  }

  /* ---------- Doc ---------- */
  get state() {
    return this._state;
  }
  getState() {
    return this._state;
  }
  get settings() {
    return this._state.settings;
  }

  /** Nap du lieu tu main (goi 1 luc khoi dong). Tra ve thong tin khoi phuc. */
  async load() {
    try {
      const res = await window.api.loadData();
      if (res && res.ok && res.data) {
        this._state = migrate(res.data);
        this._ready = true;
        return { ok: true, restored: !!res.restored };
      }
      // chua co file -> state mac dinh
      this._state = createDefaultState();
      this._ready = true;
      return { ok: true, restored: false, fresh: true };
    } catch (e) {
      this._lastError = String((e && e.message) || e);
      this._state = createDefaultState();
      this._ready = true;
      return { ok: false, error: this._lastError };
    }
  }

  /* ---------- Pub/Sub ---------- */
  subscribe(fn) {
    this._subs.add(fn);
    return () => this._subs.delete(fn);
  }
  _notify(reason) {
    for (const fn of this._subs) {
      try {
        fn(this._state, reason);
      } catch (e) {
        console.error('subscriber loi', e);
      }
    }
  }

  /* ---------- Ghi ---------- */
  /**
   * Ap dung mot thay doi.
   * @param {(draft:object)=>void} recipe ham mutate ban sao state
   * @param {object} opts { undoable?:bool, persist?:bool, reason?:string }
   */
  update(recipe, opts = {}) {
    const { undoable = false, persist = true, reason = 'update' } = opts;
    if (undoable) {
      this._undoStack.push(deepClone(this._state));
      if (this._undoStack.length > UNDO_LIMIT) this._undoStack.shift();
      this._redoStack = [];
    }
    const draft = deepClone(this._state);
    recipe(draft);
    draft.version = SCHEMA_VERSION;
    this._state = draft;
    this._notify(reason);
    if (persist) this._persist();
    return draft;
  }

  /** Ghi de thay the toan bo state (import replace / restore). */
  replaceState(next, { undoable = true } = {}) {
    return this.update((d) => Object.assign(d, migrate(next)), { undoable, reason: 'replace' });
  }

  /* ---------- Undo / Redo ---------- */
  get canUndo() {
    return this._undoStack.length > 0;
  }
  get canRedo() {
    return this._redoStack.length > 0;
  }
  undo() {
    if (!this._undoStack.length) return false;
    this._redoStack.push(deepClone(this._state));
    this._state = this._undoStack.pop();
    this._notify('undo');
    this._persist();
    return true;
  }
  redo() {
    if (!this._redoStack.length) return false;
    this._undoStack.push(deepClone(this._state));
    this._state = this._redoStack.pop();
    this._notify('redo');
    this._persist();
    return true;
  }

  /* ---------- Persist ---------- */
  async _flush() {
    try {
      const res = await window.api.saveData(this._state);
      if (res && !res.ok) this._lastError = res.error;
      return res;
    } catch (e) {
      this._lastError = String((e && e.message) || e);
      return { ok: false, error: this._lastError };
    }
  }
  /** Luu ngay (bo qua debounce) - dung khi thoat app / sau import. */
  async saveNow() {
    return this._flush();
  }

  /* ---------- Tien ich: ngay choi hien tai ---------- */
  todayKey() {
    return gameDayKey(new Date(), this._state.settings.dayStartHour);
  }

  /** Lay (hoac tao moi) dayRecord cho mot ngay. */
  dayRecord(dateKey = this.todayKey()) {
    const st = this._state;
    if (!st.dayRecords[dateKey]) {
      st.dayRecords[dateKey] = { quests: {}, xpEarned: 0, coinEarned: 0, todosDone: [], perfect: false };
    }
    return st.dayRecords[dateKey];
  }
}

// Singleton dung toan ung dung
export const store = new Store();
