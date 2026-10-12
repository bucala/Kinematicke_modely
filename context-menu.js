/* Reusable, keyboard-accessible popup menu. All labels are text, never HTML. */
(function (global) {
  'use strict';
  function position(x, y, width, height, viewportWidth, viewportHeight) {
    return { x: Math.max(8, Math.min(x, viewportWidth - width - 8)), y: Math.max(8, Math.min(y, viewportHeight - height - 8)) };
  }
  function create({ document: doc = global.document, onAction, onClose, returnFocus }) {
    const el = doc.createElement('div');
    el.className = 'canvas-context-menu'; el.hidden = true; el.setAttribute('role', 'menu'); el.setAttribute('aria-label', 'Úpravy mechanizmu');
    doc.body.append(el);
    let submenu = null, submenuOwner = null;
    const viewport = () => ({ width: doc.documentElement.clientWidth, height: doc.documentElement.clientHeight });
    const place = (menu, x, y) => {
      const { width, height } = viewport(), rect = menu.getBoundingClientRect(), p = position(x, y, rect.width, rect.height, width, height);
      menu.style.left = `${p.x}px`; menu.style.top = `${p.y}px`;
    };
    const closeSubmenu = () => {
      submenu?.remove(); submenu = null;
      submenuOwner?.setAttribute('aria-expanded', 'false'); submenuOwner = null;
    };
    const close = (focus = false) => {
      if (el.hidden) return;
      closeSubmenu(); el.hidden = true; onClose?.();
      if (focus) returnFocus?.();
    };
    const buttons = (menu) => [...menu.querySelectorAll('button:not(:disabled)')];
    const fill = (menu, items) => {
      for (const item of items) {
        if (item.separator) { const separator = doc.createElement('div'); separator.className = 'context-separator'; separator.setAttribute('role', 'separator'); menu.append(separator); continue; }
        const button = doc.createElement('button'), label = doc.createElement('span');
        button.type = 'button'; button.setAttribute('role', 'menuitem'); button.tabIndex = -1; button.disabled = !!item.disabled;
        if (item.danger) button.className = 'context-danger';
        if (item.id) button.dataset.contextAction = item.id;
        if (item.hint) button.title = item.hint;
        label.textContent = item.label; button.append(label);
        if (item.items || item.shortcut) {
          const suffix = doc.createElement('span'); suffix.className = 'context-suffix'; suffix.textContent = item.items ? '›' : item.shortcut; button.append(suffix);
        }
        if (item.items) {
          button.setAttribute('aria-haspopup', 'menu'); button.setAttribute('aria-expanded', 'false');
          const openSubmenu = (focus) => {
            if (submenuOwner === button && submenu) { if (focus) buttons(submenu)[0]?.focus(); return; }
            closeSubmenu(); submenuOwner = button;
            submenu = doc.createElement('div'); submenu.className = 'canvas-context-menu context-submenu'; submenu.setAttribute('role', 'menu'); submenu.setAttribute('aria-label', item.label);
            doc.body.append(submenu); submenu.addEventListener('keydown', keyboard); submenu.addEventListener('contextmenu', (event) => event.preventDefault());
            fill(submenu, item.items); button.setAttribute('aria-expanded', 'true');
            const r = button.getBoundingClientRect(), { width } = viewport(), w = submenu.getBoundingClientRect().width;
            place(submenu, r.right + w + 8 > width ? r.left - w : r.right, r.top);
            if (focus) buttons(submenu)[0]?.focus();
          };
          button.addEventListener('click', () => openSubmenu(true));
          button.addEventListener('pointerenter', (event) => { if (event.pointerType !== 'touch' && !button.disabled) openSubmenu(false); });
        } else button.addEventListener('click', () => { close(true); onAction?.(item.id); });
        menu.append(button);
      }
    };
    el.addEventListener('contextmenu', (event) => event.preventDefault());
    const keyboard = (event) => {
      event.stopPropagation();
      const menu = submenu?.contains(event.target) ? submenu : el, all = buttons(menu), index = all.indexOf(doc.activeElement);
      if (event.key === 'Escape') { event.preventDefault(); close(true); }
      else if (event.key === 'Tab') close(true);
      else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); event.stopPropagation();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? all.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + all.length) % all.length;
        all[next]?.focus();
      } else if (event.key === 'ArrowRight' && doc.activeElement?.getAttribute('aria-haspopup') === 'menu') { event.preventDefault(); doc.activeElement.click(); }
      else if (event.key === 'ArrowLeft' && submenu) { event.preventDefault(); const owner = submenuOwner; closeSubmenu(); owner.focus(); }
    };
    el.addEventListener('keydown', keyboard);
    const outside = (event) => { if (!el.contains(event.target) && !submenu?.contains(event.target)) close(); };
    doc.addEventListener('pointerdown', outside, true);
    return Object.freeze({
      element: el, close,
      open({ x, y, title, items }) {
        closeSubmenu(); el.replaceChildren();
        if (title) { const heading = doc.createElement('div'); heading.className = 'context-heading'; heading.textContent = title; el.append(heading); }
        fill(el, items); el.hidden = false; place(el, x, y); buttons(el)[0]?.focus({ preventScroll: true });
      },
      destroy() { close(); doc.removeEventListener('pointerdown', outside, true); el.remove(); },
    });
  }
  global.KinmoContextMenu = Object.freeze({ create, position });
})(globalThis);
