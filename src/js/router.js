/*
 * router.js - DIEU HUONG TRANG (registry + render)
 * ------------------------------------------------
 * Cac page TU DANG KY voi router (tranh vong tron router <-> pages).
 * router.go(id) se: goi onHide trang cu, cap nhat nav + tieu de, render trang
 * moi vao #view, roi goi onShow. refresh()/notifyState() de ve lai theo state.
 *
 * Interface moi page:
 *   { id, icon, navKey, order, title(), subtitle(), render(viewEl),
 *     onShow?(), onHide?(), onState?(state) }
 */

import { icon } from './icons.js';
import { i18n, t } from './i18n.js';

const pages = new Map();
const order = [];
let current = null;

export const router = {
  /** Dang ky 1 page (giu thu tu theo page.order neu co). */
  register(page) {
    pages.set(page.id, page);
    if (!order.includes(page.id)) order.push(page.id);
    order.sort((a, b) => (pages.get(a).order ?? 99) - (pages.get(b).order ?? 99));
  },

  get currentId() {
    return current;
  },
  getPage(id) {
    return pages.get(id);
  },
  list() {
    return order.map((id) => pages.get(id));
  },

  /** Dung nav (icon + nhan) vao #nav. Goi sau khi dang ky du page. */
  renderNav() {
    const nav = document.getElementById('nav');
    if (!nav) return;
    nav.innerHTML = '';
    order.forEach((id, idx) => {
      const p = pages.get(id);
      const btn = document.createElement('button');
      btn.className = 'nav-item' + (id === current ? ' is-active' : '');
      btn.dataset.id = id;
      btn.setAttribute('aria-label', t(p.navKey));
      const keyHint = idx < 9 ? `<span class="nav-item__key">${idx + 1}</span>` : '';
      btn.innerHTML = `${icon(p.icon)}<span class="nav-item__label">${escapeText(t(p.navKey))}</span>${keyHint}`;
      btn.addEventListener('click', () => this.go(id));
      nav.appendChild(btn);
    });
  },

  /** Cap nhat trang thai active tren nav (khong build lai). */
  _syncNav() {
    document.querySelectorAll('.nav-item').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.id === current);
    });
  },

  /** Di chuyen toi trang. */
  go(id, opts = {}) {
    let page = pages.get(id);
    if (!page) {
      id = order[0];
      page = pages.get(id);
    }
    if (!page) return;
    if (current && current !== id) {
      const prev = pages.get(current);
      if (prev && prev.onHide) {
        try {
          prev.onHide();
        } catch (e) {}
      }
    }
    current = id;

    // Tao node #view MOI hoan toan moi lan dieu huong -> moi listener gan len #view
    // o cac render() khong bi tich luy (tranh loi "bam 1 lan mo nhieu cua so").
    const oldView = document.getElementById('view');
    const view = document.createElement('section');
    view.className = 'view';
    view.id = 'view';
    view.tabIndex = -1;
    if (!opts.keepAnim) view.classList.add('view-anim');
    oldView.replaceWith(view);

    try {
      page.render(view);
    } catch (e) {
      console.error('render page loi', id, e);
      view.innerHTML = `<div class="empty"><div class="empty__art">${icon('alert')}</div><div class="empty__title">Trang bị lỗi</div></div>`;
    }

    // Tieu de + subtitle header
    document.getElementById('pageTitle').textContent = page.title ? page.title() : t(page.navKey);
    const subEl = document.getElementById('pageSubtitle');
    const sub = page.subtitle ? page.subtitle() : '';
    subEl.textContent = sub;
    subEl.style.display = sub ? '' : 'none';

    this._syncNav();
    if (page.onShow) {
      try {
        page.onShow();
      } catch (e) {}
    }
    document.dispatchEvent(new CustomEvent('route:changed', { detail: { id } }));
  },

  /** Ve lai trang hien tai (giu animation tat). */
  refresh() {
    if (current) this.go(current, { keepAnim: true });
  },

  /** Khi state doi: goi onState cua trang hien tai, neu khong thi refresh. */
  notifyState(state) {
    const page = pages.get(current);
    if (page && page.onState) {
      try {
        page.onState(state);
        return;
      } catch (e) {}
    }
    // nav co the can cap nhat (khong co gi) -> khong refresh de tranh mat animation
  },

  /** Dich lai nhan nav khi doi ngon ngu. */
  relabel() {
    this.renderNav();
    this._syncNav();
    if (current) {
      const p = pages.get(current);
      document.getElementById('pageTitle').textContent = p.title ? p.title() : t(p.navKey);
    }
  },
};

function escapeText(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
