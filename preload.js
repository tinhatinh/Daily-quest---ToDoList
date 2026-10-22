'use strict';

/*
 * Daily Quest - PRELOAD
 * ---------------------
 * Morong mot API han che qua window.api (contextBridge).
 * Renderer KHONG duoc dung truc tiep fs/ipc. Moi ham o day map toi mot
 * ipcMain.handle channel o main.js (ten channel trung khop).
 */

const { contextBridge, ipcRenderer } = require('electron');

// Cac channel main -> renderer duoc phep lang nghe
const LISTEN_CHANNELS = new Set(['win:max', 'menu:addTodo', 'pet:action', 'pet:request', 'todos:state', 'theme:state']);

const api = {
  // --- Du lieu ---
  loadData: () => ipcRenderer.invoke('data:load'),
  saveData: (data) => ipcRenderer.invoke('data:save', data),
  listBackups: () => ipcRenderer.invoke('data:backups'),
  restoreBackup: (name) => ipcRenderer.invoke('data:restore', name),

  // --- File dialog ---
  openJsonFile: () => ipcRenderer.invoke('dialog:open'),
  saveJsonFile: (defaultName, content) =>
    ipcRenderer.invoke('dialog:save', { defaultName, content }),

  // --- File mau ---
  readExample: (name) => ipcRenderer.invoke('app:readExample', name),

  // --- Anh hero (thu muc cuc bo userData/heroes, dung rieng tren may nay) ---
  heroesList: () => ipcRenderer.invoke('heroes:list'),
  heroesOpenFolder: () => ipcRenderer.invoke('heroes:openFolder'),

  // --- Notification ---
  notify: (title, body) => ipcRenderer.invoke('notif:show', { title, body }),

  // --- Window controls ---
  winMinimize: () => ipcRenderer.invoke('win:min'),
  winMaximize: () => ipcRenderer.invoke('win:max'),
  winClose: () => ipcRenderer.invoke('win:close'),
  winIsMaximized: () => ipcRenderer.invoke('win:ismax'),

  // --- System settings ---
  setMinimizeToTray: (v) => ipcRenderer.invoke('app:minToTray', v),
  setAutoStart: (v) => ipcRenderer.invoke('app:autoStart', v),
  quit: () => ipcRenderer.invoke('app:quit'),
  versions: () => ipcRenderer.invoke('app:versions'),
  platform: () => ipcRenderer.invoke('app:platform'),
  openExternal: (url) => ipcRenderer.invoke('shell:open', url),

  // --- Mini mode / hiep si (pet) ---
  // cua so chinh
  enterMini: () => ipcRenderer.invoke('pet:enter'),
  pushTodos: (list) => ipcRenderer.send('todos:state', list),
  pushTheme: (ap) => ipcRenderer.send('theme:state', ap),
  // cua so pet
  petOpenMain: () => ipcRenderer.invoke('pet:openMain'),
  petClose: () => ipcRenderer.invoke('pet:close'),
  petResize: (open) => ipcRenderer.send('pet:resize', !!open),
  petMove: (dx, dy) => ipcRenderer.send('pet:move', { dx, dy }),
  petGetBounds: () => ipcRenderer.invoke('pet:getBounds'),
  petMoveTo: (x, y) => ipcRenderer.send('pet:moveTo', { x, y }),
  requestTodos: () => ipcRenderer.invoke('pet:request'),
  sendTodoAction: (action) => ipcRenderer.send('pet:action', action),

  // --- Lang nghe su kien tu main (co che huy dang ky) ---
  on(channel, callback) {
    if (!LISTEN_CHANNELS.has(channel)) return () => {};
    const handler = (_event, ...args) => callback(...args);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
};

contextBridge.exposeInMainWorld('api', api);
