'use strict';

/*
 * Daily Quest - Electron MAIN process
 * -----------------------------------
 * - Cửa sổ frameless, custom titlebar (renderer ve nut toi thieu / phong to / dong).
 * - Protocol tuong chuan "dquest://" de tai ES modules tu file:// mot an toan (bat CORS dung cach).
 * - System tray + menu nhanh, thu nho xuong khay, khoi dong cung Windows.
 * - Luu du lieu JSON o userData: ghi tam + rename (atomic), tu backup truoc khi de, khac phuc tu backup khi hong.
 * - Notification desktop, IPC channel trung ten voi preload.js.
 */

const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  Notification,
  dialog,
  shell,
  ipcMain,
  protocol,
  screen,
} = require('electron');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

// ---------------------------------------------------------------------------
// Hang so duong dan / cau hinh
// ---------------------------------------------------------------------------
const APP_DIR = __dirname; // thu muc chua main.js (va src/, examples/)
const DATA_FILE = 'daily-quest-data.json';
const BACKUP_DIR = 'backups';
const MAX_BACKUPS = 24; // giu toi da N ban backup
const SCHEME = 'dquest'; // custom scheme de tai renderer
const HOST = 'app';

// Trang thai toan cuc
let mainWindow = null;
let tray = null;
let petWin = null; // cua so mini "hiep si"
let isQuitting = false;
let minimizeToTray = true; // renderer se dong bo cai dat nay qua IPC

// Chi cho phep 1 instance: mo lan 2 -> focus cua so hien co
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => showWindow());
}

// ---------------------------------------------------------------------------
// Dang ky scheme quyen truong TRUOC khi app ready (bat buoc voi standard scheme)
// ---------------------------------------------------------------------------
protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: {
      standard: true,
      secure: true, // context an toan: Web Audio, Notification API...
      supportFetchAPI: true,
      corsEnabled: true, // cho phep ES module import
      stream: true,
    },
  },
]);

// ---------------------------------------------------------------------------
// Tao icon PNG tu thuan (khong can file .png/.ico ngoai) - logo gradient xanh + notar pen trang
// ---------------------------------------------------------------------------
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256).map((_, n) => {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      return c | 0;
    });
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = 1 + width * 4;
  const raw = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter none
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// bo tron goc (rounded rect) tra ve 0..1
function roundedCoverage(x, y, size, r) {
  const cx = Math.min(Math.max(x, r), size - r);
  const cy = Math.min(Math.max(y, r), size - r);
  const dx = x - cx;
  const dy = y - cy;
  return Math.hypot(dx, dy) <= r ? 1 : 0;
}

function buildIconPng(size) {
  const px = Buffer.alloc(size * size * 4);
  const r = size * 0.24;
  const c0 = [91, 140, 255]; // xanh duong
  const c1 = [34, 211, 238]; // cyan
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const cover = roundedCoverage(x, y, size, r);
      if (!cover) {
        px[i + 3] = 0;
        continue;
      }
      const t = (x + y) / (2 * size);
      let R = c0[0] + (c1[0] - c0[0]) * t;
      let G = c0[1] + (c1[1] - c0[1]) * t;
      let B = c0[2] + (c1[2] - c0[2]) * t;
      // net but trang cheo (giong logo mockup)
      const d = Math.abs(x - y);
      const band = size * 0.12;
      if (d < band && x > size * 0.3 && x < size * 0.72) {
        const a = 1 - d / band;
        R += (255 - R) * a;
        G += (255 - G) * a;
        B += (255 - B) * a;
      }
      px[i] = Math.round(R);
      px[i + 1] = Math.round(G);
      px[i + 2] = Math.round(B);
      px[i + 3] = 255;
    }
  }
  return encodePng(size, size, px);
}

function windowIcon() {
  return nativeImage.createFromBuffer(buildIconPng(256));
}

// ---------------------------------------------------------------------------
// Duong dan file du lieu
// ---------------------------------------------------------------------------
function dataFile() {
  return path.join(app.getPath('userData'), DATA_FILE);
}
function backupFolder() {
  return path.join(app.getPath('userData'), BACKUP_DIR);
}

function ensureDirs() {
  fs.mkdirSync(path.dirname(dataFile()), { recursive: true });
  fs.mkdirSync(backupFolder(), { recursive: true });
}

function timestampName() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(
    d.getMinutes()
  )}${p(d.getSeconds())}`;
}

// Ghi file an toan: backup ban cu -> ghi .tmp -> rename de atomic
function writeDataAtomic(obj) {
  ensureDirs();
  const target = dataFile();
  const json = JSON.stringify(obj, null, 2);

  // backup ban hien tai (neu co) truoc khi de
  if (fs.existsSync(target)) {
    try {
      const bak = path.join(backupFolder(), `${timestampName()}.json`);
      fs.copyFileSync(target, bak);
      pruneBackups();
    } catch (e) {
      /* backup loi khong duoc lam hong thao tac chinh */
    }
  }

  const tmp = target + '.tmp';
  fs.writeFileSync(tmp, json, 'utf8');
  try {
    fs.renameSync(tmp, target);
  } catch (e) {
    // Windows doi khi rename khi file bi khoa -> thu xo roi ghi lai
    if (fs.existsSync(target)) fs.unlinkSync(target);
    fs.writeFileSync(target, json, 'utf8');
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
  return true;
}

function pruneBackups() {
  try {
    const dir = backupFolder();
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    files.slice(MAX_BACKUPS).forEach((x) => {
      try {
        fs.unlinkSync(path.join(dir, x.f));
      } catch (e) {}
    });
  } catch (e) {}
}

// Doc du lieu, tu phuc hoi tu backup neu file chinh hong
function readData() {
  ensureDirs();
  const target = dataFile();
  const tryParse = (file) => {
    if (!fs.existsSync(file)) return null;
    try {
      const txt = fs.readFileSync(file, 'utf8').trim();
      if (!txt) return null;
      return JSON.parse(txt);
    } catch (e) {
      return null;
    }
  };

  const main = tryParse(target);
  if (main) return { data: main, restored: false };

  // file chinh hong/trong -> tim backup moi nhat hop le
  try {
    const dir = backupFolder();
    const backups = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    for (const b of backups) {
      const data = tryParse(path.join(dir, b.f));
      if (data) {
        // khoi phuc lai file chinh
        try {
          writeDataAtomic(data);
        } catch (e) {}
        return { data, restored: true };
      }
    }
  } catch (e) {}

  return { data: null, restored: false };
}

function listBackups() {
  try {
    const dir = backupFolder();
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => ({ name: f, time: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);
  } catch (e) {
    return [];
  }
}

function restoreBackup(name) {
  const file = path.join(backupFolder(), path.basename(name));
  if (!fs.existsSync(file)) throw new Error('Backup khong ton tai');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  writeDataAtomic(data);
  return data;
}

// ---------------------------------------------------------------------------
// Cua so chinh
// ---------------------------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    show: false,
    backgroundColor: '#0d0b1a',
    icon: windowIcon(),
    title: 'Daily Quest',
    webPreferences: {
      preload: path.join(APP_DIR, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error('did-fail-load', code, desc);
  });

  mainWindow.loadURL(`${SCHEME}://${HOST}/src/index.html`);

  const sendMax = () => {
    if (mainWindow) mainWindow.webContents.send('win:max', mainWindow.isMaximized());
  };
  mainWindow.on('maximize', sendMax);
  mainWindow.on('unmaximize', sendMax);

  // Chan dong khi thu nho xuong khay
  mainWindow.on('close', (e) => {
    if (!isQuitting && minimizeToTray) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => (mainWindow = null));

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

function showWindow() {
  if (!mainWindow) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

// ---------------------------------------------------------------------------
// System tray + menu nhanh
// ---------------------------------------------------------------------------
function createTray() {
  try {
    const icon = nativeImage.createFromBuffer(buildIconPng(32));
    tray = new Tray(icon);
    tray.setToolTip('Daily Quest');
    const menu = Menu.buildFromTemplate([
      { label: 'Mở Daily Quest', click: () => showWindow() },
      {
        label: 'Thêm to-do nhanh',
        click: () => {
          showWindow();
          if (mainWindow) mainWindow.webContents.send('menu:addTodo');
        },
      },
      { label: 'Chế độ hiệp sĩ (mini)', click: () => enterMiniMode() },
      { type: 'separator' },
      {
        label: 'Khởi động cùng Windows',
        type: 'checkbox',
        checked: app.getLoginItemSettings().openAtLogin,
        click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
      },
      { type: 'separator' },
      {
        label: 'Thoát',
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]);
    tray.setContextMenu(menu);
    tray.on('click', () => (mainWindow && mainWindow.isVisible() ? mainWindow.focus() : showWindow()));
    tray.on('double-click', () => showWindow());
  } catch (e) {
    console.error('Khong tao duoc tray:', e);
  }
}

// ---------------------------------------------------------------------------
// PET / MINI MODE - cua so nho "hiep si" luc tren man hinh
// ---------------------------------------------------------------------------
function petBounds(open) {
  // kich thuoc: dong (chi hiep si nho) mo (kem panel to-do ben tren)
  return open ? { w: 320, h: 460 } : { w: 140, h: 150 };
}

function createPet() {
  if (petWin && !petWin.isDestroyed()) {
    petWin.show();
    return;
  }
  const wa = screen.getPrimaryDisplay().workArea;
  const { w, h } = petBounds(false);
  petWin = new BrowserWindow({
    width: w,
    height: h,
    x: wa.x + wa.width - w - 24,
    y: wa.y + wa.height - h - 16,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    show: true,
    title: 'Daily Quest Mini',
    icon: windowIcon(),
    webPreferences: {
      preload: path.join(APP_DIR, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  petWin.setAlwaysOnTop(true, 'screen-saver');
  petWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  petWin.loadURL(`${SCHEME}://${HOST}/src/pet.html`);
  // khi pet san sang -> xin main window day to-do hien tai
  petWin.webContents.on('did-finish-load', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('pet:request');
  });
  petWin.on('closed', () => {
    petWin = null;
  });
}

function destroyPet() {
  if (petWin && !petWin.isDestroyed()) petWin.close();
}

/** Phong to / thu nho cua so pet, gi goc duoi-ben-phai co dinh. */
function resizePet(open) {
  if (!petWin || petWin.isDestroyed()) return;
  const b = petWin.getBounds();
  const wa = screen.getPrimaryDisplay().workArea;
  const { w, h } = petBounds(open);
  let nx = b.x + b.width - w;
  let ny = b.y + b.height - h;
  nx = Math.max(wa.x, Math.min(nx, wa.x + wa.width - w));
  ny = Math.max(wa.y, Math.min(ny, wa.y + wa.height - h));
  petWin.setBounds({ x: nx, y: ny, width: w, height: h });
}

function enterMiniMode() {
  createPet();
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
}

// Menu ung dung (frameless -> khong hien thanh menu, nhung phim tat van chay)
function buildAppMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Thoát',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            isQuitting = true;
            app.quit();
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
      ],
    },
    { role: 'editMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ---------------------------------------------------------------------------
// IPC - ten channel phai khop voi preload.js
// ---------------------------------------------------------------------------
function registerIpc() {
  // Du lieu
  ipcMain.handle('data:load', () => {
    try {
      return { ok: true, ...readData() };
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) };
    }
  });

  ipcMain.handle('data:save', (_e, data) => {
    try {
      writeDataAtomic(data);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) };
    }
  });

  ipcMain.handle('data:backups', () => {
    try {
      return { ok: true, backups: listBackups() };
    } catch (e) {
      return { ok: false, error: String(e), backups: [] };
    }
  });

  ipcMain.handle('data:restore', (_e, name) => {
    try {
      return { ok: true, data: restoreBackup(name) };
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) };
    }
  });

  // File dialogs
  ipcMain.handle('dialog:open', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Chon file JSON',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile'],
    });
    if (res.canceled || !res.filePaths[0]) return { ok: false, canceled: true };
    try {
      const text = fs.readFileSync(res.filePaths[0], 'utf8');
      return { ok: true, name: path.basename(res.filePaths[0]), text };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  ipcMain.handle('dialog:save', async (_e, { defaultName, content }) => {
    const res = await dialog.showSaveDialog(mainWindow, {
      title: 'Luu file',
      defaultPath: defaultName || 'daily-quest.json',
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (res.canceled || !res.filePath) return { ok: false, canceled: true };
    try {
      fs.writeFileSync(res.filePath, content, 'utf8');
      return { ok: true, path: res.filePath };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  // Doc file mau tu examples/
  ipcMain.handle('app:readExample', (_e, name) => {
    try {
      const safe = path.basename(name);
      const file = path.join(APP_DIR, 'examples', safe);
      const text = fs.readFileSync(file, 'utf8');
      return { ok: true, text };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  // Notification desktop
  ipcMain.handle('notif:show', (_e, { title, body }) => {
    try {
      if (Notification.isSupported()) {
        const n = new Notification({ title: title || 'Daily Quest', body: body || '' });
        n.on('click', () => showWindow());
        n.show();
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  // Window controls
  ipcMain.handle('win:min', () => {
    if (mainWindow) mainWindow.minimize();
  });
  ipcMain.handle('win:max', () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
    return mainWindow.isMaximized();
  });
  ipcMain.handle('win:close', () => {
    if (mainWindow) mainWindow.close();
  });
  ipcMain.handle('win:ismax', () => (mainWindow ? mainWindow.isMaximized() : false));

  // Cai dat he thong
  ipcMain.handle('app:minToTray', (_e, v) => {
    minimizeToTray = !!v;
    return minimizeToTray;
  });
  ipcMain.handle('app:autoStart', (_e, v) => {
    try {
      app.setLoginItemSettings({ openAtLogin: !!v });
      return { ok: true, value: !!v };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });
  ipcMain.handle('app:quit', () => {
    isQuitting = true;
    app.quit();
  });
  ipcMain.handle('app:versions', () => ({
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    app: app.getVersion(),
  }));
  ipcMain.handle('app:platform', () => process.platform);
  ipcMain.handle('shell:open', (_e, url) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
  });

  // ----- Pet / mini mode (dong bo to-do giua cua so chinh va hiep si) -----
  ipcMain.handle('pet:enter', () => enterMiniMode());
  ipcMain.handle('pet:openMain', () => {
    showWindow();
    if (petWin && !petWin.isDestroyed()) petWin.hide();
  });
  ipcMain.handle('pet:close', () => destroyPet());
  ipcMain.on('pet:resize', (_e, open) => resizePet(!!open));
  ipcMain.on('pet:move', (_e, d) => {
    if (!petWin || petWin.isDestroyed() || !d) return;
    const [x, y] = petWin.getPosition();
    petWin.setPosition(Math.round(x + (d.dx || 0)), Math.round(y + (d.dy || 0)));
  });
  // di chuyen tuyet doi (de keo tron, theo sat chuot)
  ipcMain.handle('pet:getBounds', () => (petWin && !petWin.isDestroyed() ? petWin.getBounds() : null));
  ipcMain.on('pet:moveTo', (_e, p) => {
    if (!petWin || petWin.isDestroyed() || !p) return;
    petWin.setPosition(Math.round(p.x), Math.round(p.y));
  });
  // main window -> day to-do cho pet
  ipcMain.on('todos:state', (_e, list) => {
    if (petWin && !petWin.isDestroyed()) petWin.webContents.send('todos:state', list);
  });
  // main window -> dong bo theme/accent cho pet (flyout cung theme voi app)
  ipcMain.on('theme:state', (_e, ap) => {
    if (petWin && !petWin.isDestroyed()) petWin.webContents.send('theme:state', ap);
  });
  // pet -> gui hanh dong ve main window
  ipcMain.on('pet:action', (_e, action) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('pet:action', action);
  });
  // pet -> xin to-do (main window se push qua 'todos:state')
  ipcMain.handle('pet:request', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('pet:request');
  });
}

// ---------------------------------------------------------------------------
// Khoi dong
// ---------------------------------------------------------------------------
app.whenReady().then(() => {
  // Handler cho dquest:// - map duong dan -> file trong APP_DIR, chan thu muc
  protocol.handle(SCHEME, async (request) => {
    try {
      const url = new URL(request.url);
      let rel = decodeURIComponent(url.pathname);
      if (rel.startsWith('/')) rel = rel.slice(1);
      if (!rel) rel = 'src/index.html';
      const abs = path.normalize(path.join(APP_DIR, rel));
      if (!abs.startsWith(path.normalize(APP_DIR))) {
        return new Response('Forbidden', { status: 403 });
      }
      if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
        return new Response('Not found: ' + rel, { status: 404 });
      }
      const ext = path.extname(abs).toLowerCase();
      const types = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.mjs': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.woff2': 'font/woff2',
        '.woff': 'font/woff',
      };
      const buf = fs.readFileSync(abs);
      return new Response(buf, {
        headers: {
          'Content-Type': types[ext] || 'application/octet-stream',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (e) {
      return new Response('Error: ' + (e && e.message), { status: 500 });
    }
  });

  buildAppMenu();
  registerIpc();
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  // Windows: thoat het khi dong cua so (neu khong thu nho khay thi app da dong)
  if (process.platform !== 'darwin') {
    if (!minimizeToTray || isQuitting) app.quit();
  }
});
