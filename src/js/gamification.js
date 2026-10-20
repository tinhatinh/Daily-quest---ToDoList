/*
 * gamification.js - XP / LEVEL / STREAK / COMBO / ACHIEVEMENTS
 * ------------------------------------------------------------
 * Toan bo logic "game" nam o day, thao tac len draft state qua store.update.
 * - Level duoc TINH LAI tu totalXp (recomputeLevel) -> undo/reopen nhat quan.
 * - completeQuest(): danh dau xong + tinh XP (he so do kho, boss x2, combo)
 *   + coin + streak + combo + flags + kiem tra thanh tuu. Tra ket qua cho UI.
 */

import { store } from './store.js';
import {
  xpForLevel,
  MAX_LEVEL,
  XP_DIFFICULTY,
  LEVEL_TITLES,
  ACHIEVEMENTS,
  COMBO_WINDOW_MS,
  COMBO_BONUS_PER_STEP,
  COMBO_MAX_MULT,
  COMBO_ACHIEVE_WINDOW_MS,
  BOSS_XP_MULT,
  BOSS_COIN_BONUS,
  STREAK_FREEZE_EVERY,
  STREAK_FREEZE_MAX,
} from './constants.js';
import {
  findQuest,
  questBaseXp,
  questBaseCoin,
  questSubtasks,
  isQuestCompletedOn,
  isPerfectDay,
  dayProgress,
} from './selectors.js';
import { diffDays, clamp, dateKey } from './utils.js';

/* ============================ LEVEL / XP ============================ */
/** Tinh lai level + xp trong cap tu totalXp ( phu hop voi do kho XP). */
export function recomputeLevel(draft) {
  const reqMult = (XP_DIFFICULTY[draft.settings.xpDifficulty] || XP_DIFFICULTY.normal).reqMult;
  let level = 1;
  let rem = Math.max(0, Math.floor(draft.game.totalXp));
  let need = Math.round(xpForLevel(1) * reqMult);
  while (level < MAX_LEVEL) {
    need = Math.round(xpForLevel(level) * reqMult);
    if (rem >= need) {
      rem -= need;
      level++;
    } else break;
  }
  need = Math.round(xpForLevel(level) * reqMult);
  draft.game.level = level;
  draft.game.xp = rem;
  draft.game.xpNeed = need;
  return draft.game;
}

/** Cong XP vao draft, tra ve {leveled, from, to}. */
export function addXp(draft, amount) {
  const from = draft.game.level;
  draft.game.totalXp = Math.max(0, Math.floor(draft.game.totalXp + amount));
  recomputeLevel(draft);
  return { leveled: draft.game.level > from, from, to: draft.game.level };
}

/** Tru XP (reopen / huy to-do). */
export function removeXp(draft, amount) {
  draft.game.totalXp = Math.max(0, Math.floor(draft.game.totalXp - amount));
  recomputeLevel(draft);
}

/** Danh hieu theo cap (chon moc gan nhat khong vuot qua level). */
export function titleForLevel(level) {
  let cur = LEVEL_TITLES[0];
  for (const t of LEVEL_TITLES) if (level >= t.level) cur = t;
  return cur;
}

/** Thong tin level hien tai cho header / dashboard. */
export function getLevelInfo(state = store.state) {
  const g = state.game;
  const need = g.xpNeed || Math.round(xpForLevel(g.level));
  const title = titleForLevel(g.level);
  return {
    level: g.level,
    xp: g.xp,
    need,
    totalXp: g.totalXp,
    pct: need > 0 ? clamp(Math.round((g.xp / need) * 100), 0, 100) : 0,
    titleVi: title.vi,
    titleEn: title.en,
  };
}

/* ============================ COMBO ============================ */
/** Ghi nhan 1 lan hoan thanh vao chuoi combo; tra ve {count, mult}. */
export function registerCombo(draft, now = Date.now()) {
  const c = draft.game.combo;
  if (!Array.isArray(c.recent)) c.recent = [];
  if (now - (c.lastTime || 0) <= COMBO_WINDOW_MS) c.count = (c.count || 0) + 1;
  else c.count = 1;
  c.lastTime = now;
  c.recent.push(now);
  c.recent = c.recent.filter((t) => now - t <= COMBO_ACHIEVE_WINDOW_MS);
  if (c.recent.length >= 5) draft.flags.combo5 = true;
  const mult = clamp((c.count - 1) * COMBO_BONUS_PER_STEP, 0, COMBO_MAX_MULT);
  return { count: c.count, mult };
}

/* ============================ STREAK ============================ */
/** Cap nhat streak khi hoan thanh (toi da tang 1 lan/ngay). */
export function touchStreak(draft, todayKey) {
  const s = draft.game.streak;
  if (s.lastDay === todayKey) return { changed: false, count: s.count };
  if (!s.lastDay) {
    s.count = 1;
  } else {
    const gap = diffDays(s.lastDay, todayKey);
    if (gap === 1) {
      s.count += 1;
    } else if (gap > 1 && s.freezes > 0) {
      s.freezes -= 1; // dung freeze de giu chuoi (bo qua ngay lot)
      s.count += 1;
    } else {
      s.count = 1; // gian doan -> bat dau lai
    }
  }
  s.lastDay = todayKey;
  s.max = Math.max(s.max || 0, s.count);
  draft.stats.maxStreak = Math.max(draft.stats.maxStreak || 0, s.count);
  // moi moc STREAK_FREEZE_EVERY ngay -> +1 freeze (cap nhat STREAK_FREEZE_MAX)
  if (s.count > 0 && s.count % STREAK_FREEZE_EVERY === 0 && s.freezes < STREAK_FREEZE_MAX) {
    s.freezes += 1;
  }
  return { changed: true, count: s.count };
}

/**
 * Kiem tra mat streak khi sang ngay moi (scheduler goi).
 * Neu khong hoan thanh hom qua va con freeze -> tieu freeze giu chuoi, nguoc lai reset.
 */
export function applyStreakRollover(draft, todayKey) {
  const s = draft.game.streak;
  if (!s.lastDay || s.count === 0) return { broke: false };
  const gap = diffDays(s.lastDay, todayKey);
  if (gap <= 1) return { broke: false }; // van trong chuoi (hom qua or hom nay)
  if (s.freezes > 0) {
    s.freezes -= 1;
    return { broke: false, usedFreeze: true };
  }
  s.count = 0;
  return { broke: true };
}

/* ============================ ACHIEVEMENTS ============================ */
/** Dung context cho cac ham test() trong ACHIEVEMENTS. */
function buildContext(draft) {
  return { game: draft.game, stats: draft.stats, flags: draft.flags };
}

/** Danh gia toan bo thanh tuu, mo khoa cai moi, day vao out.achievements. */
export function checkAchievements(draft, out) {
  out.achievements = out.achievements || [];
  const ctx = buildContext(draft);
  for (const ach of ACHIEVEMENTS) {
    if (draft.game.achievements[ach.id]) continue;
    let ok = false;
    try {
      ok = !!ach.test(ctx);
    } catch (e) {
      ok = false;
    }
    if (ok) {
      draft.game.achievements[ach.id] = dateKey();
      out.achievements.push(ach);
    }
  }
}

/* ============================ HANH DONG CHINH ============================ */
/**
 * hoan thanh mot quest. Tra ve ket qua de UI phat animation/am thanh.
 * undoable -> Ctrl+Z huy duoc.
 */
export function completeQuest(questId) {
  const out = { ok: false, alreadyDone: false, xp: 0, coin: 0, combo: 1, leveledUp: false, newLevel: 0, achievements: [], perfect: false, boss: false, streak: 0 };
  const state = store.state;
  const quest = findQuest(state, questId);
  if (!quest) return out;
  const todayKey = store.todayKey();
  if (isQuestCompletedOn(state, quest, todayKey)) {
    out.alreadyDone = true;
    return out;
  }

  store.update(
    (draft) => {
      const q = findQuest(draft, questId);
      if (!q) return;
      ensureDay(draft, todayKey);
      const rec2 = draft.dayRecords[todayKey];
      rec2.quests[questId] = rec2.quests[questId] || { done: false, subtasks: {} };
      // danh dau hoan thanh + hoan thanh het subtask
      const subs = questSubtasks(q);
      rec2.quests[questId].done = true;
      rec2.quests[questId].subtasks = {};
      subs.forEach((s) => (rec2.quests[questId].subtasks[s.id] = true));
      if (subs.length) {
        draft.flags.subtaskDone = true;
        draft.stats.subtaskDone = (draft.stats.subtaskDone || 0) + 1;
      }

      // ---- tinh XP ----
      const gainMult = (XP_DIFFICULTY[draft.settings.xpDifficulty] || XP_DIFFICULTY.normal).gainMult;
      const isBoss = draft.boss && draft.boss.questId === questId && draft.boss.date === todayKey;
      const combo = registerCombo(draft);
      let xp = questBaseXp(q) * gainMult;
      if (isBoss) xp *= BOSS_XP_MULT;
      xp *= 1 + combo.mult;
      xp = Math.max(1, Math.round(xp));

      let coin = questBaseCoin(q);
      if (isBoss) coin += BOSS_COIN_BONUS;

      const lvl = addXp(draft, xp);
      draft.game.coin += coin;
      draft.stats.totalQuests += 1;
      draft.stats.totalCoinsEarned += coin;
      rec2.xpEarned = (rec2.xpEarned || 0) + xp;
      rec2.coinEarned = (rec2.coinEarned || 0) + coin;
      rec2.quests[questId].xp = xp;
      rec2.quests[questId].coin = coin;

      // ---- flags theo thoi diem / loai ----
      const hour = new Date().getHours();
      if (hour < 8) draft.flags.earlyBird = true;
      if (hour >= 23) draft.flags.nightOwl = true;
      if (q.difficulty === 'epic') {
        draft.flags.epicDone = true;
        draft.stats.epicDone = (draft.stats.epicDone || 0) + 1;
      }
      if (isBoss) {
        draft.flags.bossSlain = true;
        draft.stats.bossSlain = (draft.stats.bossSlain || 0) + 1;
      }

      // ---- streak ----
      const st = touchStreak(draft, todayKey);
      out.streak = draft.game.streak.count;

      // ---- perfect day ----
      if (isPerfectDay(draft, todayKey) && !rec2.perfect) {
        rec2.perfect = true;
        draft.flags.perfectDay = true;
        draft.stats.perfectDays = (draft.stats.perfectDays || 0) + 1;
        out.perfect = true;
      }

      // ---- thanh tuu ----
      checkAchievements(draft, out);

      // ---- ket qua cho UI ----
      out.ok = true;
      out.xp = xp;
      out.coin = coin;
      out.combo = combo.count;
      out.leveledUp = lvl.leveled;
      out.newLevel = lvl.to;
      out.boss = isBoss;
    },
    { undoable: true, reason: 'complete-quest' }
  );

  return out;
}

/** Mo khoa lai mot quest (tru XP/coin da ghi nhan cua no hom nay). */
export function reopenQuest(questId) {
  const out = { ok: false };
  const state = store.state;
  const quest = findQuest(state, questId);
  if (!quest) return out;
  const todayKey = store.todayKey();
  if (!isQuestCompletedOn(state, quest, todayKey)) return out;

  store.update(
    (draft) => {
      const rec = draft.dayRecords[todayKey];
      if (!rec || !rec.quests[questId]) return;
      const entry = rec.quests[questId];
      const xp = entry.xp || 0;
      const coin = entry.coin || 0;
      removeXp(draft, xp);
      draft.game.coin = Math.max(0, draft.game.coin - coin);
      draft.stats.totalQuests = Math.max(0, draft.stats.totalQuests - 1);
      rec.xpEarned = Math.max(0, (rec.xpEarned || 0) - xp);
      rec.coinEarned = Math.max(0, (rec.coinEarned || 0) - coin);
      delete rec.quests[questId];
      if (rec.perfect && !isPerfectDay(draft, todayKey)) {
        rec.perfect = false;
        draft.stats.perfectDays = Math.max(0, (draft.stats.perfectDays || 0) - 1);
      }
      out.ok = true;
    },
    { undoable: true, reason: 'reopen-quest' }
  );
  return out;
}

/** Bat/tat subtask; tu dong hoan thanh quest khi tick cai cuoi cung. */
export function toggleSubtask(questId, subtaskId) {
  const todayKey = store.todayKey();
  let allDone = false;
  store.update(
    (draft) => {
      const q = findQuest(draft, questId);
      if (!q) return;
      const rec = ensureDay(draft, todayKey);
      rec.quests[questId] = rec.quests[questId] || { done: false, subtasks: {} };
      const subs = rec.quests[questId].subtasks;
      subs[subtaskId] = !subs[subtaskId];
      const total = questSubtasks(q).length;
      const done = Object.values(subs).filter(Boolean).length;
      allDone = total > 0 && done === total;
    },
    { undoable: false, reason: 'subtask' }
  );
  if (allDone && !isQuestCompletedOn(store.state, findQuest(store.state, questId), todayKey)) {
    return { allDone: true, result: completeQuest(questId) };
  }
  return { allDone: false };
}

/* ============================ TO-DO / FOCUS / SHOP ============================ */
const TODO_XP = 5;
const TODO_COIN = 1;
const FOCUS_XP = 20;
const FOCUS_COIN = 6;

/** Bat/tat to-do; cho XP nho khi xong. */
export function toggleTodo(todoId) {
  const out = { ok: false, xp: 0, leveledUp: false, newLevel: 0, achievements: [] };
  store.update(
    (draft) => {
      const item = draft.todos.find((x) => x.id === todoId);
      if (!item) return;
      if (!item.done) {
        item.done = true;
        item.doneAt = Date.now();
        const lvl = addXp(draft, TODO_XP);
        draft.game.coin += TODO_COIN;
        draft.stats.todosDone = (draft.stats.todosDone || 0) + 1;
        out.xp = TODO_XP;
        out.leveledUp = lvl.leveled;
        out.newLevel = lvl.to;
      } else {
        item.done = false;
        removeXp(draft, TODO_XP);
        draft.game.coin = Math.max(0, draft.game.coin - TODO_COIN);
        draft.stats.todosDone = Math.max(0, (draft.stats.todosDone || 0) - 1);
      }
      checkAchievements(draft, out);
      out.ok = true;
    },
    { undoable: true, reason: 'todo' }
  );
  return out;
}

/** Thuong XP khi xong 1 phien focus (pomodoro). */
export function grantFocusReward() {
  const out = { ok: false, xp: FOCUS_XP, coin: FOCUS_COIN, leveledUp: false, newLevel: 0, achievements: [] };
  store.update(
    (draft) => {
      const lvl = addXp(draft, FOCUS_XP);
      draft.game.coin += FOCUS_COIN;
      draft.stats.totalCoinsEarned += FOCUS_COIN;
      draft.stats.focusSessions = (draft.stats.focusSessions || 0) + 1;
      out.leveledUp = lvl.leveled;
      out.newLevel = lvl.to;
      checkAchievements(draft, out);
      out.ok = true;
    },
    { undoable: false, reason: 'focus' }
  );
  return out;
}

/** Doi mot phan thuong trong cua hang. */
export function redeemReward(rewardId) {
  const out = { ok: false, reason: null, achievements: [] };
  const item = store.state.shop.find((r) => r.id === rewardId);
  if (!item) {
    out.reason = 'notfound';
    return out;
  }
  if (store.state.game.coin < item.cost) {
    out.reason = 'poor';
    return out;
  }
  store.update(
    (draft) => {
      const it = draft.shop.find((r) => r.id === rewardId);
      if (!it || draft.game.coin < it.cost) return;
      draft.game.coin -= it.cost;
      it.redeemed = (it.redeemed || 0) + 1;
      draft.stats.redeems = (draft.stats.redeems || 0) + 1;
      checkAchievements(draft, out);
      out.ok = true;
    },
    { undoable: true, reason: 'redeem' }
  );
  return out;
}

/** Ghi nhan mot ngay nhat ky (tinh thanh tuu journal). */
export function noteJournalSaved() {
  const out = { achievements: [] };
  store.update(
    (draft) => {
      draft.stats.journalDays = Object.keys(draft.journal).length;
      checkAchievements(draft, out);
    },
    { undoable: false, reason: 'journal' }
  );
  return out;
}

/* ============================ TIEN ICH NOI BO ============================ */
/** Bao dam co dayRecord cho ngay (draft la ban clone, mutate truc tiep). */
function ensureDay(draft, dateKeyStr) {
  if (!draft.dayRecords[dateKeyStr]) {
    draft.dayRecords[dateKeyStr] = { quests: {}, xpEarned: 0, coinEarned: 0, todosDone: [], perfect: false };
  }
  return draft.dayRecords[dateKeyStr];
}

/** So nguyen hoa tien do hom nay (tien ich cho nhieu noi). */
export function todayProgress() {
  return dayProgress(store.state, store.todayKey());
}
