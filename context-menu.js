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
    let submenu = null, submenuOwner = null, pages = [], anchor = { x: 8, y: 8 };
    const viewport = () => ({ width: doc.defaultView?.visualViewport?.width || doc.documentElement.clientWidth, height: doc.defaultView?.visualViewport?.height || doc.documentElement.clientHeight });
    const place = (menu, x, y) => {
      const { width, height } = viewport(), rect = menu.getBoundingClientRect(), p = position(x, y, rect.width, rect.height, width, height);
      menu.style.maxHeight = `${Math.max(80, height - 16)}px`;
      menu.style.left = `${p.x}px`; menu.style.top = `${p.y}px`;
    };
    const closeSubmenu = () => {
      submenu?.remove(); submenu = null;
      submenuOwner?.setAttribute('aria-expanded', 'false'); submenuOwner = null;
    };
    const close = (focus = false) => {
      if (el.hidden) return;
      closeSubmenu(); pages = []; el.hidden = true; onClose?.();
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
            if (viewport().width <= 640) { pages.push({ title: item.label, items: item.items }); showPage(); return; }
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
          button.addEventListener('pointerenter', (event) => { if (viewport().width > 640 && event.pointerType !== 'touch' && !button.disabled) openSubmenu(false); });
        } else {
          if (menu === el) button.addEventListener('pointerenter', () => closeSubmenu());
          button.addEventListener('click', () => { close(true); onAction?.(item.id); });
        }
        menu.append(button);
      }
    };
    const showPage = () => {
      el.replaceChildren(); el.scrollTop = 0;
      const page = pages.at(-1), heading = doc.createElement('div'); heading.className = 'context-heading';
      if (pages.length > 1) {
        const back = doc.createElement('button'); back.type = 'button'; back.textContent = '‹ Späť'; back.setAttribute('aria-label', 'Späť do predchádzajúcej ponuky');
        back.addEventListener('click', () => { pages.pop(); showPage(); }); heading.append(back);
      }
      const title = doc.createElement('span'); title.textContent = page.title || 'Možnosti'; heading.append(title);
      const dismiss = doc.createElement('button'); dismiss.type = 'button'; dismiss.textContent = '×'; dismiss.setAttribute('aria-label', 'Zavrieť ponuku');
      dismiss.addEventListener('click', () => close(true)); heading.append(dismiss); el.append(heading);
      fill(el, page.items); el.hidden = false; place(el, anchor.x, anchor.y);
      buttons(el).find(button => button.getAttribute('role') === 'menuitem')?.focus({ preventScroll: true });
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
      else if (event.key === 'ArrowLeft' && pages.length > 1) { event.preventDefault(); pages.pop(); showPage(); }
      else if (event.key === 'ArrowLeft' && submenu) { event.preventDefault(); const owner = submenuOwner; closeSubmenu(); owner.focus(); }
    };
    el.addEventListener('keydown', keyboard);
    const outside = (event) => { if (!el.contains(event.target) && !submenu?.contains(event.target)) close(); };
    doc.addEventListener('pointerdown', outside, true);
    const resize = () => close();
    doc.defaultView?.addEventListener('resize', resize);
    doc.defaultView?.visualViewport?.addEventListener('resize', resize);
    doc.defaultView?.visualViewport?.addEventListener('scroll', resize);
    return Object.freeze({
      element: el, close,
      open({ x, y, title, items }) {
        closeSubmenu(); anchor = { x, y }; pages = [{ title, items }]; showPage();
      },
      destroy() { close(); doc.defaultView?.removeEventListener('resize', resize); doc.defaultView?.visualViewport?.removeEventListener('resize', resize); doc.defaultView?.visualViewport?.removeEventListener('scroll', resize); doc.removeEventListener('pointerdown', outside, true); el.remove(); },
    });
  }
  global.KinmoContextMenu = Object.freeze({ create, position });
})(globalThis);
