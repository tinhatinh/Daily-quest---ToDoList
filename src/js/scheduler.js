/*
 * scheduler.js - XU LY THEO THOI GIAN THUC
 * ----------------------------------------
 * - Phát hiện sang "ngày chơi" mới (theo settings.dayStartHour) khi mở app
 *   và khi đồng hồ chạy qua ngưỡng -> xử lý rollover: streak freeze/break,
 *   reset combo, sinh Boss Quest mới, gọi hook báo cáo cuối ngày.
 * - Nhắc lịch trình (reminderMinutes) + hạn quest (deadline) bằng Notification.
 * - app.js gọi scheduler.tick() mỗi giây; logic phút/ngay tu bên trong.
 */

import { store } from './store.js';
import { applyStreakRollover } from './gamification.js';
import {
  getDueQuests,
  isQuestCompletedOn,
  eventsOnDay,
  findQuest,
} from './selectors.js';
import { timeToMinutes, pick } from './utils.js';

let hooks = {};
let lastTickDay = null;
let lastMinute = -1;
const notified = new Set(); // khoa thong bao da gui trong ngay

/** Quy uoc so phut hien tai (0..1440, le). */
function nowMinutes(d = new Date()) {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

export const scheduler = {
  /** Gan cac callback: onRollover(info), onBoss(quest), onReport(info). */
  setHooks(h) {
    hooks = h || {};
  },

  /** Goi khi app san sang (sau store.load). */
  ensureReady() {
    const today = store.todayKey();
    const seen = store.state.meta.lastSeenDay;
    if (!seen) {
      store.update(
        (d) => {
          d.meta.lastSeenDay = today;
          d.meta.createdAt = d.meta.createdAt || Date.now();
        },
        { undoable: false, reason: 'init' }
      );
      lastTickDay = today;
      this.rollBoss(false);
      return;
    }
    if (seen !== today) {
      this.handleRollover(seen, today);
    }
    lastTickDay = today;
    if (!store.state.boss || store.state.boss.date !== today) this.rollBoss(false);
  },

  /** Goi moi giay tu app.js. */
  tick() {
    const today = store.todayKey();
    if (today !== lastTickDay) {
      const prev = lastTickDay || store.state.meta.lastSeenDay;
      this.handleRollover(prev, today);
      lastTickDay = today;
    }
    const now = new Date();
    const min = now.getHours() * 60 + now.getMinutes();
    if (min !== lastMinute) {
      lastMinute = min;
      this.checkReminders(now, today);
    }
  },

  /** Xu ly khi sang ngay moi. */
  handleRollover(prevDay, today) {
    let info = { broke: false, usedFreeze: false };
    store.update(
      (d) => {
        info = applyStreakRollover(d, today);
        d.meta.lastSeenDay = today;
        d.game.combo = { count: 0, lastTime: 0, recent: [] };
      },
      { undoable: false, reason: 'rollover' }
    );
    notified.clear();
    this.rollBoss(false);
    if (hooks.onRollover) hooks.onRollover({ prevDay, today, ...info });
  },

  /** Chon ngau nhien 1 Boss Quest (bonus x2 XP) tu quest hom nay chua xong. */
  rollBoss(force = false) {
    const st = store.state;
    if (!st.settings.autoBoss && !force) return null;
    const today = store.todayKey();
    const due = getDueQuests(st, today);
    if (!due.length) return null;
    const open = due.filter((q) => !isQuestCompletedOn(st, q, today));
    const pool = open.length ? open : due;
    // tranh trung boss cu neu co the
    const prevId = st.boss && st.boss.date === today ? st.boss.questId : null;
    const candidates = pool.length > 1 ? pool.filter((q) => q.id !== prevId) : pool;
    const chosen = pick(candidates);
    if (!chosen) return null;
    store.update(
      (d) => {
        d.boss = { date: today, questId: chosen.id };
      },
      { undoable: false, reason: 'boss' }
    );
    if (hooks.onBoss) hooks.onBoss(chosen);
    return chosen;
  },

  /** Lay quest boss hom nay (hoac null). */
  getBossQuest(state = store.state) {
    const today = store.todayKey();
    if (!state.boss || state.boss.date !== today || !state.boss.questId) return null;
    return findQuest(state, state.boss.questId);
  },

  /** Gui Notification cho lich trinh sap toi + sap den han quest. */
  checkReminders(now, today) {
    if (!store.state.settings.notifications) return;
    const cur = nowMinutes(now);

    // --- Su kien lich trinh ---
    for (const e of eventsOnDay(store.state, today)) {
      const rm = Number(e.reminderMinutes) || 0;
      if (rm <= 0) continue;
      const start = timeToMinutes(e.start);
      if (start == null) continue;
      const until = start - cur;
      if (until >= 0 && until <= rm) {
        this._notifyOnce(`ev:${today}:${e.id}:${start}`, e.title, `Bắt đầu lúc ${e.start} (${Math.round(until)} phút nữa)`);
      }
    }

    // --- Han chót quest ---
    for (const q of getDueQuests(store.state, today)) {
      if (isQuestCompletedOn(store.state, q, today)) continue;
      const dl = timeToMinutes(q.deadline);
      if (dl == null) continue;
      const until = dl - cur;
      if (until >= 0 && until <= 15) {
        this._notifyOnce(`q:${today}:${q.id}:${dl}`, `Sắp tới hạn: ${q.title}`, `Còn ${Math.round(until)} phút nữa (hạn ${q.deadline})`);
      }
    }
  },

  /** Gui 1 notification, chong lap trong cung ngay/gio. */
  _notifyOnce(key, title, body) {
    if (notified.has(key)) return;
    notified.add(key);
    try {
      window.api.notify(title, body);
    } catch (e) {
      /* bo qua neu khong ho tro */
    }
  },

  /** Xoa bo nho thong bao (dùng khi test/reset). */
  resetNotified() {
    notified.clear();
  },
};
