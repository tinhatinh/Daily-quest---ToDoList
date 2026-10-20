/*
 * app.js - DIEM KHOI DONG (renderer)
 * ----------------------------------
 * Thu toan bo module lai: nap state -> ap dung cai dat -> dang ky page ->
 * render header -> gan phim tat + command palette -> khoi dong scheduler +
 * dong ho -> onboarding -> xu ly su kien cua so (min/max/close).
 */

import { store } from './store.js';
import { router } from './router.js';
import { i18n, t } from './i18n.js';
import { audio } from './audio.js';
import { applyTheme } from './theme.js';
import { scheduler } from './scheduler.js';
import { topStatsHtml } from './components.js';
import { openQuestForm } from './questForm.js';
import { openFocus } from './focus.js';
import {
  initPalette,
  registerCommand,
  setPaletteProvider,
  openPalette,
  closePalette,
  isPaletteOpen,
  hasOpenModal,
  closeTopModal,
  toast,
  openModal,
} from './ui.js';
import { dayProgress } from './selectors.js';
import { toggleTodo } from './gamification.js';
import { ENCOURAGEMENT } from './constants.js';
import { pick, formatNumber, addDaysKey, dateKey, uid } from './utils.js';
import { icon } from './icons.js';

// Pages
import { dashboardPage } from './pages/dashboard.js';
import { questsPage } from './pages/quests.js';
import { todoPage } from './pages/todo.js';
import { schedulePage } from './pages/schedule.js';
import { statsPage } from './pages/stats.js';
import { achievementsPage } from './pages/achievements.js';
import { shopPage } from './pages/shop.js';
import { journalPage } from './pages/journal.js';
import { settingsPage } from './pages/settings.js';
import { maybeShowOnboarding } from './pages/onboarding.js';

/* ============================ HEADER ============================ */
function renderHeader() {
  const host = document.getElementById('topStats');
  if (host) host.innerHTML = topStatsHtml(store.state);
}

/** Bo trich cac thong so hinh thuc de dong bo sang cua so hiep si. */
function appearanceOf(s) {
  return {
    theme: s.theme,
    accent: s.accent,
    customAccent: s.customAccent,
    customAccent2: s.customAccent2,
    reducedMotion: s.reducedMotion,
    sound: s.sound,
    volume: s.volume,
  };
}

/* ============================ CUA SO ============================ */
function wireWindow() {
  const min = document.getElementById('winMin');
  const max = document.getElementById('winMax');
  const close = document.getElementById('winClose');
  const mini = document.getElementById('winMini');
  if (min) min.addEventListener('click', () => window.api.winMinimize());
  if (max) max.addEventListener('click', () => window.api.winMaximize());
  if (close) close.addEventListener('click', () => window.api.winClose());
  if (mini) mini.addEventListener('click', () => window.api.enterMini());

  const syncMaxIcon = (isMax) => {
    if (max) max.innerHTML = icon(isMax ? 'minimize' : 'maximize', { size: 12 });
  };
  window.api.winIsMaximized().then(syncMaxIcon);
  window.api.on('win:max', syncMaxIcon);
}

/* ============================ SIDEBAR ============================ */
function wireSidebar() {
  const app = document.getElementById('app');
  const btn = document.getElementById('collapseBtn');
  const apply = () => app.classList.toggle('is-collapsed', !!store.state.settings.sidebarCollapsed);
  apply();
  if (btn)
    btn.addEventListener('click', () => {
      store.update((d) => (d.settings.sidebarCollapsed = !d.settings.sidebarCollapsed), { undoable: false, reason: 'sidebar' });
      apply();
      audio.play('click');
    });
}

/* ============================ PHIM TAT ============================ */
function wireShortcuts() {
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement && document.activeElement.tagName) || '');

    if (mod && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (isPaletteOpen()) closePalette();
      else openPalette();
      return;
    }
    if (mod && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      openQuestForm(null, { onDone: () => router.refresh() });
      return;
    }
    if (mod && e.key.toLowerCase() === 't') {
      e.preventDefault();
      router.go('todo');
      setTimeout(() => todoPage.focusInput && todoPage.focusInput(), 60);
      return;
    }
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        if (store.redo()) {
          toast({ type: 'info', title: t('toast.redo'), iconName: 'redo' });
          router.refresh();
        }
      } else {
        if (store.undo()) {
          toast({ type: 'info', title: t('toast.undo'), iconName: 'undo' });
          router.refresh();
        }
      }
      return;
    }
    if (e.key === 'Escape') {
      if (isPaletteOpen()) closePalette();
      else if (hasOpenModal()) closeTopModal();
      return;
    }
    // so 1..9 chuyen trang (khong phai luc dang nhap)
    if (!mod && !typing && /^[1-9]$/.test(e.key)) {
      const pages = router.list();
      const idx = Number(e.key) - 1;
      if (pages[idx]) {
        e.preventDefault();
        router.go(pages[idx].id);
      }
    }
  });
}

/* ============================ COMMAND PALETTE ============================ */
function wirePalette() {
  initPalette();
  const pages = router.list();
  pages.forEach((p) =>
    registerCommand({ id: 'nav-' + p.id, label: t(p.navKey), icon: p.icon, group: t('common.all'), run: () => router.go(p.id) })
  );
  registerCommand({ id: 'new-quest', label: t('quest.new'), icon: 'plus', group: 'Quest', run: () => openQuestForm(null, { onDone: () => router.refresh() }) });
  registerCommand({ id: 'focus', label: i18n.lang === 'en' ? 'Focus session' : 'Phiên tập trung', icon: 'timer', group: 'Action', run: () => openFocus() });
  registerCommand({ id: 'undo', label: t('common.undo'), icon: 'undo', group: 'Action', run: () => { store.undo(); router.refresh(); } });
  registerCommand({ id: 'sound', label: i18n.lang === 'en' ? 'Toggle sound' : 'Bật/tắt âm thanh', icon: 'volume', group: 'Action', run: toggleSound });
  registerCommand({ id: 'boss', label: t('dash.bossReroll'), icon: 'target', group: 'Action', run: () => { scheduler.rollBoss(true); router.refresh(); } });

  setPaletteProvider(() => {
    const items = [];
    for (const q of store.state.quests.slice(0, 40)) {
      if (q.archived) continue;
      items.push({ id: 'q-' + q.id, label: q.title, icon: 'sword', group: t('nav.quests'), run: () => { router.go('quests'); } });
    }
    for (const td of store.state.todos.filter((x) => !x.done).slice(0, 20)) {
      items.push({ id: 'td-' + td.id, label: td.title, icon: 'checkSquare', group: t('nav.todo'), run: () => router.go('todo') });
    }
    return items;
  });
}

function toggleSound() {
  const val = !store.state.settings.sound;
  store.update((d) => (d.settings.sound = val), { undoable: false, reason: 'settings' });
  applyTheme(store.state);
  if (val) audio.play('click');
  toast({ type: 'info', title: i18n.lang === 'en' ? (val ? 'Sound on' : 'Sound off') : val ? 'Đã bật âm thanh' : 'Đã tắt âm thanh', iconName: val ? 'volume' : 'volumeX' });
}

/* ============================ DAILY REPORT ============================ */
function showDailyReport(prevDay) {
  const rec = store.state.dayRecords[prevDay];
  if (!rec || !(rec.xpEarned > 0)) return;
  const prevPrev = store.state.dayRecords[addDaysKey(prevDay, -1)];
  const xpDelta = (rec.xpEarned || 0) - (prevPrev ? prevPrev.xpEarned || 0 : 0);
  const doneCount = Object.values(rec.quests || {}).filter((q) => q.done).length;
  const body = document.createElement('div');
  body.className = 'stack gap-4';
  body.innerHTML = `
    <div class="row center" style="gap:12px">
      <div class="level-avatar" style="width:56px;height:56px;font-size:22px;background:var(--grad-xp)">${store.state.profile.avatar || '🦊'}</div>
      <div style="text-align:left">
        <div style="font-size:var(--fs-500);font-weight:800">${escapeLite(pick(ENCOURAGEMENT.allDone.concat(ENCOURAGEMENT.evening)))}</div>
        <div class="muted" style="font-size:var(--fs-200)">${escapeLite(prevDay)}</div>
      </div>
    </div>
    <div class="stat-cards" style="grid-template-columns:repeat(3,1fr);margin:0">
      <div class="stat-tile"><div class="stat-tile__label">${t('report.xp')}</div><div class="stat-tile__value">${formatNumber(rec.xpEarned || 0)}</div>
        <div class="stat-tile__delta">${xpDelta >= 0 ? '▲' : '▼'} ${formatNumber(Math.abs(xpDelta))} ${t('report.vsYesterday')}</div></div>
      <div class="stat-tile"><div class="stat-tile__label">${t('report.quests')}</div><div class="stat-tile__value">${doneCount}</div></div>
      <div class="stat-tile"><div class="stat-tile__label">${t('report.streak')}</div><div class="stat-tile__value">${store.state.game.streak.count}</div></div>
    </div>`;
  const foot = document.createElement('div');
  foot.className = 'row gap-3 end';
  foot.style.width = '100%';
  foot.innerHTML = `<button class="btn btn--ghost" data-later>${t('report.later')}</button><button class="btn btn--primary" data-journal>${t('report.cta')}</button>`;
  body.appendChild(foot);
  const ctl = openModal({ title: t('report.title'), bodyNode: body });
  ctl.node.querySelector('.modal__foot')?.remove();
  foot.querySelector('[data-later]').addEventListener('click', () => ctl.close());
  foot.querySelector('[data-journal]').addEventListener('click', () => {
    ctl.close();
    router.go('journal');
  });
}

function escapeLite(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/* ============================ SCHEDULER HOOKS ============================ */
/* ============================ PET / MINI ============================ */
function wirePet() {
  // cua so hiep si gui hanh dong to-do sang cua so chinh (nguoi ghi du lieu duy nhat)
  window.api.on('pet:action', (a) => handlePetAction(a));
  window.api.on('pet:request', () => {
    try {
      window.api.pushTodos(store.state.todos);
      window.api.pushTheme(appearanceOf(store.state.settings));
    } catch (e) {}
  });
}

function handlePetAction(a) {
  if (!a || !a.type) return;
  if (a.type === 'add') {
    const title = (a.title || '').trim();
    if (!title) return;
    store.update(
      (d) => {
        const maxOrder = d.todos.reduce((m, x) => Math.max(m, x.order || 0), 0);
        d.todos.push({ id: uid('td'), title, done: false, createdAt: Date.now(), order: maxOrder + 1 });
      },
      { undoable: false, reason: 'pet-add' }
    );
  } else if (a.type === 'toggle') {
    toggleTodo(a.id);
  } else if (a.type === 'delete') {
    store.update((d) => (d.todos = d.todos.filter((x) => x.id !== a.id)), { undoable: true, reason: 'pet-del' });
  }
  // store thay doi -> subscribe se pushTodos lai sang pet
}

function wireScheduler() {
  scheduler.setHooks({
    onRollover: (info) => {
      if (info.broke) {
        toast({ type: 'error', title: i18n.lang === 'en' ? 'Streak lost' : 'Mất chuỗi', msg: pick(ENCOURAGEMENT.streakLost), iconName: 'flame' });
      } else if (info.usedFreeze) {
        toast({ type: 'info', title: i18n.lang === 'en' ? 'Streak freeze used' : 'Đã dùng Streak Freeze', msg: i18n.lang === 'en' ? 'Your streak is saved!' : 'Chuỗi của bạn được giữ nguyên!', iconName: 'shield' });
      }
      if (info.prevDay) showDailyReport(info.prevDay);
      renderHeader();
      router.refresh();
    },
    onBoss: (quest) => {
      toast({ type: 'info', title: i18n.lang === 'en' ? 'New Boss Quest!' : 'Boss Quest mới!', msg: quest.title, iconName: 'target', duration: 4200 });
    },
  });
  scheduler.ensureReady();
  // dong ho 1 giay: scheduler.tick + thong bao 'clock:tick' cho cac trang dem nguoc
  setInterval(() => {
    scheduler.tick();
    document.dispatchEvent(new CustomEvent('clock:tick'));
  }, 1000);
}

/* ============================ KHOI DONG ============================ */
async function boot() {
  const load = await store.load();
  if (load.restored) {
    toast({ type: 'error', title: i18n.lang === 'en' ? 'Data recovered' : 'Đã khôi phục dữ liệu', msg: t('toast.restored'), iconName: 'alert', duration: 5200 });
  } else if (!load.ok) {
    toast({ type: 'error', title: 'Lỗi', msg: 'Không đọc được file dữ liệu, đã tạo mới.', iconName: 'alert' });
  }

  i18n.setLang(store.state.settings.language);
  applyTheme(store.state);
  window.api.setMinimizeToTray(store.state.settings.minimizeToTray);
  if (store.state.settings.startOnBoot) window.api.setAutoStart(true);

  // dang ky page
  [dashboardPage, questsPage, todoPage, schedulePage, statsPage, achievementsPage, shopPage, journalPage, settingsPage].forEach((p) => router.register(p));
  router.renderNav();

  renderHeader();
  store.subscribe(() => {
    renderHeader();
    router.notifyState(store.state);
    // dong bo to-do + theme sang cua so hiep si (neu mo)
    try {
      window.api.pushTodos(store.state.todos);
      window.api.pushTheme(appearanceOf(store.state.settings));
    } catch (e) {}
  });

  wireWindow();
  wireSidebar();
  wireShortcuts();
  wirePalette();
  wirePet();
  wireScheduler();

  // mo AudioContext khi nguoi dung tuong tac dau tien
  const unlock = () => {
    audio.unlock();
    document.removeEventListener('pointerdown', unlock);
  };
  document.addEventListener('pointerdown', unlock);

  // hien UI chinh + onboarding de len tren neu can
  router.go('dashboard');
  maybeShowOnboarding(() => {
    renderHeader();
    router.go('dashboard');
  });

  // luu tru tru khi dong
  window.addEventListener('beforeunload', () => {
    store.saveNow();
  });
}

boot().catch((e) => {
  console.error('boot loi', e);
  const view = document.getElementById('view');
  if (view) view.innerHTML = `<div class="empty"><div class="empty__art">${icon('alert')}</div><div class="empty__title">Khởi động thất bại</div><div class="empty__msg">${escapeLite(e && e.message ? e.message : e)}</div></div>`;
});
