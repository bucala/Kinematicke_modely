/* Kinematika UI · Paleta príkazov (Ctrl+K) a prehľad klávesových skratiek (?).
   Klasický skript bez IIFE: zdieľa najvyššiu úroveň s ostatnými app/*.js a app.js, ktorý sa načíta posledný
   a definuje stav a konštanty. Súbor obsahuje iba deklarácie funkcií, pri načítaní nič nespúšťa. */
'use strict';
  // Lowercase without diacritics, so "kulisa", "Kulisa" and "kulísa" match alike.
  function foldText(value) {
    return String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  // Every query word must appear in the text: word start > anywhere > abbreviation. 0 means no match.
  function commandScore(query, text) {
    const words = foldText(query).split(/\s+/).filter(Boolean), haystack = foldText(text);
    if (!words.length) return 1;
    let score = haystack.startsWith(words.join(' ')) ? 4 : 0;
    for (const word of words) {
      const at = haystack.indexOf(word);
      if (at >= 0) { score += at === 0 || /[^a-z0-9]/.test(haystack[at - 1]) ? 3 : 2; continue; }
      // Abbreviations stay inside one word that starts with the same letter ("zbr" → "zobraziť").
      const inOrder = (token) => { let index = 0; for (const char of token) if (char === word[index]) index++; return index === word.length; };
      if (!haystack.split(/[^a-z0-9]+/).some((token) => token[0] === word[0] && inOrder(token))) return 0;
      score += 1;
    }
    return score;
  }

  function filterCommands(commands, query, limit = 40) {
    return commands.map((command, order) => ({ command, order, score: commandScore(query, `${command.label} ${command.group || ''} ${command.keywords || ''}`) }))
      .filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score || a.order - b.order).slice(0, limit).map((entry) => entry.command);
  }

  function commandShortcut(action) {
    return ({ undo: 'Ctrl + Z', redo: 'Ctrl + Shift + Z', save: 'Ctrl + S', help: 'F1', play: 'Space', fit: 'Shift + F', 'tool-select': 'V', 'tool-pan': 'H', 'tool-connect': 'J', 'tool-measure': 'M', shortcuts: '?', duplicate: 'Ctrl + D' })[action] || '';
  }

  function commandGroup(button) {
    if (button.closest('.app-header')) return 'Projekt';
    if (button.closest('.canvas-tools, .zoom-control')) return 'Nástroje plátna';
    if (button.closest('.context-bar, .stage-header')) return 'Zobrazenie';
    if (button.closest('#properties-panel')) return 'Vlastnosti';
    if (button.closest('.sidebar')) return 'Model';
    if (button.closest('#playback-panel')) return 'Simulácia';
    return 'Úpravy výberu';
  }

  // Commands are the enabled, visible buttons of the workspace (so modes and the Magic import guard
  // stay in charge), plus inserting a part, selecting a part and the few keyboard-only actions.
  function collectCommands() {
    const commands = [], seen = new Set(), skip = new Set(['close-modal', 'select', 'toggle-tree-group', 'measurement-seek', 'snap-target', 'command-palette', 'element-menu']);
    const T = (value) => globalThis.KinmoI18n?.translate(value) ?? value;
    const add = (command) => { const key = foldText(command.label); if (!command.label || seen.has(key)) return; seen.add(key); commands.push(command); };
    for (const button of $('#app').querySelectorAll('[data-action]')) {
      const action = button.dataset.action;
      if (skip.has(action) || button.disabled || button.getAttribute('aria-disabled') === 'true' || !button.getClientRects().length) continue;
      const label = T((button.getAttribute('aria-label') || button.title || button.textContent || '').replace(/\s+/g, ' ').trim());
      if (label.length > 90) continue;
      add({ label, group: T(commandGroup(button)), action, keywords: action.replace(/-/g, ' '), shortcut: commandShortcut(action), run: () => button.click() });
    }
    for (const [action, label, run] of [['play', 'Prehrať / pozastaviť', () => actions.play()], ['fit', 'Prispôsobiť pohľad', () => { fitView(); renderScene(); }], ['shortcuts', 'Prehľad klávesových skratiek', shortcutsModal], ['help', 'Obrázkový návod', helpModal]]) {
      if (!commands.some((c) => c.action === action) && (!state.magic || ['shortcuts', 'help', 'fit'].includes(action))) add({ label: T(label), group: T('Príkazy'), action, shortcut: commandShortcut(action), run });
    }
    if (!state.magic && state.mode !== 'simulate') for (const type of K.TYPES) add({ label: `${T('Pridať prvok')} · ${T(typeNames[type])}`, group: T('Knižnica prvkov'), keywords: type, run: () => addElement(type) });
    if (!state.magic || magicWorking()) for (const e of state.project.elements) commands.push({ label: e.name, user: true, group: T('Vybrať v modeli'), keywords: T(typeNames[e.type] || ''), run: () => { selectTarget(I.elementKey(e.id)); if (!state.inspectorOpen) setInspectorOpen(true); } });
    return commands;
  }

  function openCommandPalette() {
    const commands = collectCommands(), hint = isMacPlatform() ? '⌘ K' : 'Ctrl + K';
    modal('Paleta príkazov', `<div class="command-palette"><input id="command-search" class="text-field" type="text" role="combobox" aria-expanded="true" aria-controls="command-results" aria-autocomplete="list" autocomplete="off" spellcheck="false" placeholder="Hľadať príkaz alebo prvok…"/><ul id="command-results" class="command-results" role="listbox" aria-label="Príkazy"></ul><p class="command-hint">↑ ↓ výber · Enter spustiť · Esc zavrieť · ${hint}</p></div>`);
    $('#modal').classList.add('modal-command');
    state.commandPalette = { commands, results: [], active: 0 };
    const input = $('#command-search'), list = $('#command-results');
    input.addEventListener('input', () => { state.commandPalette.active = 0; renderCommandResults(); });
    input.addEventListener('keydown', onCommandKey);
    list.addEventListener('click', (event) => { const item = event.target.closest('[data-command]'); if (item) runCommand(Number(item.dataset.command)); });
    list.addEventListener('pointermove', (event) => { const item = event.target.closest('[data-command]'); if (item && Number(item.dataset.command) !== state.commandPalette.active) { state.commandPalette.active = Number(item.dataset.command); renderCommandResults(); } });
    renderCommandResults();
    input.focus();
  }

  function renderCommandResults() {
    const palette = state.commandPalette, input = $('#command-search'), list = $('#command-results');
    if (!palette || !input || !list) return;
    palette.results = filterCommands(palette.commands, input.value);
    palette.active = K.clamp(palette.active, 0, Math.max(0, palette.results.length - 1));
    list.innerHTML = palette.results.length ? palette.results.map((c, i) => `<li id="command-${i}" role="option" class="command-item${i === palette.active ? ' is-active' : ''}" aria-selected="${i === palette.active}" data-command="${i}"><span class="command-label"${c.user ? ' data-i18n-user' : ''}>${escape(c.label)}</span><small>${escape(c.group || '')}</small>${c.shortcut ? `<kbd>${escape(c.shortcut)}</kbd>` : ''}</li>`).join('') : '<li class="command-empty" role="presentation">Žiadny príkaz nezodpovedá hľadaniu.</li>';
    if (palette.results.length) input.setAttribute('aria-activedescendant', `command-${palette.active}`); else input.removeAttribute('aria-activedescendant');
    list.querySelector('.is-active')?.scrollIntoView?.({ block: 'nearest' });
  }

  function onCommandKey(event) {
    const palette = state.commandPalette;
    if (!palette) return;
    const count = palette.results.length;
    if (['ArrowDown', 'ArrowUp'].includes(event.key) && count) { event.preventDefault(); palette.active = (palette.active + (event.key === 'ArrowDown' ? 1 : -1) + count) % count; renderCommandResults(); }
    else if (['PageDown', 'PageUp'].includes(event.key) && count) { event.preventDefault(); palette.active = K.clamp(palette.active + (event.key === 'PageDown' ? 8 : -8), 0, count - 1); renderCommandResults(); }
    else if (event.key === 'Enter') { event.preventDefault(); runCommand(palette.active); }
    // A search field would only clear its text on the first Escape.
    else if (event.key === 'Escape') { event.preventDefault(); state.commandPalette = null; $('#modal').close(); }
  }

  function runCommand(index) {
    const command = state.commandPalette?.results[index];
    if (!command) return;
    state.commandPalette = null;
    $('#modal').close();
    try { command.run(); } catch (error) { toast(error.message, true); }
  }

  function shortcutsModal() {
    modal('Klávesové skratky', `<div class="shortcut-overview">${globalThis.KinmoHelp?.shortcutGrid() || ''}</div><div class="modal-actions"><button type="button" class="button button-secondary" data-action="help">${icon('help', 16)}Obrázkový návod</button><button type="button" class="button button-dark" data-action="command-palette">${icon('search', 16)}Paleta príkazov</button></div>`, true);
  }
