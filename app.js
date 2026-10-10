(function () {
  'use strict';

  const K = globalThis.Kinematics;
  const DD = globalThis.DoubleDrawer;
  const E = globalThis.KinmoEditor;
  const P = globalThis.KinmoPhysics;
  const X = globalThis.KinmoExport;
  const CAD = globalThis.KinmoCad;
  const $ = (selector, root = document) => root.querySelector(selector);
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (value, digits = 1) => Number.isFinite(value) ? value.toLocaleString('sk-SK', { maximumFractionDigits: digits, minimumFractionDigits: 0 }) : '—';
  const svgNS = 'http://www.w3.org/2000/svg';
  const storageKey = 'kinematika.projects.v1';
  const lastKey = 'kinematika.last.v1';
  const settingsKey = 'kinematika.settings.v2';
  const icons = {
    mechanism: '<path d="M4 19 11 4l9 11-16 4Z"/><circle cx="4" cy="19" r="2"/><circle cx="11" cy="4" r="2"/><circle cx="20" cy="15" r="2"/>',
    chevron: '<path d="m8 10 4 4 4-4"/>',
    arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    save: '<path d="M5 3h12l4 4v14H3V3h2Z"/><path d="M7 3v7h10V3M7 21v-7h10v7"/>',
    export: '<path d="M12 16V3m-4 4 4-4 4 4M4 14v7h16v-7"/>',
    import: '<path d="M12 3v13m-4-4 4 4 4-4M4 17v4h16v-4"/>',
    folder: '<path d="M3 7V4h6l2 3h10v13H3V7Z"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .6-1.5 1-1.5 2M12 16h.01"/>',
    cursor: '<path d="m5 3 14 10-7 1-3 7-4-18Z"/>',
    hand: '<path d="M8 13V7a1.5 1.5 0 0 1 3 0v5-8a1.5 1.5 0 0 1 3 0v8-6a1.5 1.5 0 0 1 3 0v7-4a1.5 1.5 0 0 1 3 0v7c0 4-3 6-7 6-3 0-5-2-7-5l-3-4a1.5 1.5 0 0 1 2-2l3 2Z"/>',
    link: '<path d="m10 13 4-4M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0" transform="translate(1 1)"/>',
    ruler: '<path d="m3 15 12-12 6 6L9 21l-6-6Zm3-3 2 2m1-5 2 2m1-5 2 2m1-5 2 2"/>',
    grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18m6-18v18M3 9h18M3 15h18"/>',
    layers: '<path d="m12 3 10 6-10 6L2 9l10-6Zm-9 11 9 5 9-5M3 18l9 5 9-5"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="m3 3 18 18M10 5h2c6 0 10 7 10 7s-1 2-4 4M6 6c-3 2-4 6-4 6s4 7 10 7c2 0 3 0 5-1M9 9a4 4 0 0 0 6 6"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    unlock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 7-3M12 14v3"/>',
    play: '<path d="m8 4 12 8-12 8V4Z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    reset: '<path d="M3 10a9 9 0 1 1 2 9M3 3v7h7"/>',
    loop: '<path d="M4 8h14l-3-3m3 3-3 3M20 16H6l3-3m-3 3 3 3"/>',
    target: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><circle cx="12" cy="12" r="3"/>',
    chart: '<path d="M3 3v18h18M6 15l4-5 4 3 6-8"/>',
    trace: '<path d="M3 18c7 0 2-12 8-12s3 12 10 12"/><circle cx="3" cy="18" r="2"/><circle cx="21" cy="18" r="2"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor" stroke="none"/><circle cx="15" cy="17" r="3" fill="currentColor" stroke="none"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
    undo: '<path d="M3 10h11a7 7 0 0 1 0 14M3 10l5-5m-5 5 5 5" transform="translate(0 -3)"/>',
    redo: '<path d="M21 10H10a7 7 0 0 0 0 14M21 10l-5-5m5 5-5 5" transform="translate(0 -3)"/>',
    dots: '<circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/>',
    ground: '<path d="M3 11h18M12 3v8M3 16l4-5m2 5 4-5m2 5 4-5"/>',
    rail: '<path d="M3 8h18M3 16h18"/><rect x="8" y="5" width="8" height="14" rx="2"/><path d="m3 12 2-2m14 4 2-2"/>',
    arm: '<path d="m5 17 14-10" stroke-width="6"/><circle cx="5" cy="17" r="3" fill="var(--icon-bg, #fff)"/><circle cx="19" cy="7" r="3" fill="var(--icon-bg, #fff)"/>',
    slot: '<path d="M3 18h5c8 0 3-13 13-13" stroke-width="7"/><path d="M3 18h5c8 0 3-13 13-13" stroke="var(--icon-bg, #fff)" stroke-width="2"/>',
    bearing: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4v3m0 10v3M4 12h3m10 0h3"/>',
    panel: '<path d="M8 3h8v18H8z"/><circle cx="12" cy="7" r="1.5"/><circle cx="12" cy="17" r="1.5"/><path d="M4 17H2m18-10h2"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    warning: '<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5M12 17h.01"/>',
    code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-14-2 16"/>',
    expand: '<path d="M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M5 9h.1M9 9h.1M13 9h.1M17 9h.1M5 12h.1M9 12h.1M13 12h.1M17 12h.1M7 16h10"/>',
    spring: '<path d="M2 12h3l2-6 3 12 3-12 3 12 3-6h3"/>',
    piston: '<path d="M2 12h5m10 0h5M7 7h10v10H7zM12 7v10"/>',
  };
  const icon = (name, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.mechanism}</svg>`;
  const ib = (name, action, title, active = false, extra = '') => `<button class="icon-button${active ? ' is-active' : ''}" data-action="${action}" title="${escape(title)}" aria-label="${escape(title)}" ${extra}>${icon(name)}</button>`;
  const typeNames = {
    ground: 'Pevný rám', rail: 'Lineárne vedenie', link: 'Tiahlo / rameno', slot: 'Zakrivená kulisa', bearing: 'Čap / ložisko', panel: 'Sklápacie čelo',
    'spring-compression': 'Tlačná pružina', 'spring-extension': 'Ťažná pružina', 'piston-push': 'Tlačný piest', 'piston-pull': 'Ťažný piest',
  };
  const typeIcons = { ground: 'ground', rail: 'rail', link: 'arm', slot: 'slot', bearing: 'bearing', panel: 'panel', 'spring-compression': 'spring', 'spring-extension': 'spring', 'piston-push': 'piston', 'piston-pull': 'piston' };
  const typeCodes = { ground: 'G', rail: 'P', link: 'L', slot: 'C', bearing: 'B', panel: 'F', 'spring-compression': 'S−', 'spring-extension': 'S+', 'piston-push': 'P+', 'piston-pull': 'P−' };
  let loaded = null, preferences = X.preferences();
  try {
    preferences = X.preferences(JSON.parse(localStorage.getItem(settingsKey) || '{}'));
    const projects = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const latest = localStorage.getItem(lastKey);
    const candidate = projects.find((p) => p.id === latest);
    if (candidate) loaded = K.validateProject(candidate);
  } catch { /* Local storage can be unavailable for a file:// origin. */ }

  const projectSelection = (project) => project.elements.find((e) => e.role === 'front')?.id || project.elements.find((e) => e.type === 'panel')?.id || project.elements.find((e) => e.role === 'coupler')?.id || project.elements[0]?.id || null;
  const initialProject = loaded || K.preset('custom');
  const initialSelection = projectSelection(initialProject);
  const state = {
    project: initialProject, selected: initialSelection,
    motion: K.driveRange(initialProject).min, playing: false, direction: 1, speed: 1, loop: true, cycle: 6,
    grid: true, dimensions: true, ghosts: true, trace: true, collisions: true, snap: true,
    traceRef: initialProject.kind === DD.KIND ? { elementId: 'bearing-1', point: 'a' } : { elementId: initialSelection || '', point: 'b' },
    traceMode: initialProject.kind === DD.KIND ? 'bearings' : 'single', traceSpace: 'world',
    tool: 'select', sidebarTab: 'elements', inspectorTab: 'geometry', analysis: false,
    mode: initialProject.kind === 'custom' ? 'edit' : 'simulate',
    forceContext: null, forceCurve: [], forceError: '', dynamic: null, dynamicHistory: [], graphMode: 'angle', forceArrows: true,
    history: [], future: [], dirty: false, saved: !!loaded, storageFailed: false, view: null, baseView: null,
    pendingJoint: null, drag: null, pointer: { x: 0, y: 0 }, samples: [], result: null, profile: null,
    ...preferences,
  };
  const isDoubleDrawer = () => state.project.kind === DD.KIND;
  const traceReferences = () => [
    ...(isDoubleDrawer() && state.traceMode === 'bearings' ? DD.traces : [{ ...state.traceRef, label: traceLabel(), color: '#4d9b91' }]),
    ...(state.project.trajectories || []).filter((t) => t.visible).map((t) => ({ ...t.reference, label: t.name, color: t.color, space: t.space })),
  ];
  const traceLength = (reference) => {
    const points = state.samples.map((sample) => K.tracePoint(sample, reference, state.traceSpace)).filter(Boolean);
    return points.reduce((sum, point, i) => sum + (i ? K.distance(point, points[i - 1]) : 0), 0);
  };
  let toastTimer, autosaveTimer, lastFrame = 0, lastInspector = 0, latestSVG = '';

  function toast(message, warning = false) {
    const el = $('#toast');
    el.innerHTML = `${icon(warning ? 'warning' : 'check', 17)}<span>${escape(message)}</span>`;
    el.className = `show${warning ? ' warning' : ''}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = ''; }, warning ? 6500 : 3500);
  }

  function saveProject(silent = false) {
    try {
      let projects = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!Array.isArray(projects)) projects = [];
      projects = projects.filter((p) => p.id !== state.project.id);
      projects.unshift(state.project);
      localStorage.setItem(storageKey, JSON.stringify(projects.slice(0, 20)));
      localStorage.setItem(lastKey, state.project.id);
      state.dirty = false; state.saved = true; state.storageFailed = false;
      updateHeader();
      if (!silent) toast('Projekt bol uložený v tomto prehliadači.');
      return true;
    } catch {
      state.storageFailed = true;
      updateHeader();
      if (!silent) toast('Lokálne úložisko nie je dostupné. Uložte projekt do súboru .kinmo.', true);
      return false;
    }
  }

  function pushHistory() {
    state.history.push(K.copy(state.project));
    if (state.history.length > 60) state.history.shift();
    state.future = [];
  }

  function changed(refit = false) {
    state.dirty = true;
    recalculate(refit);
    renderTree(); renderInspector(); updateHeader(); updateToolbar();
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => saveProject(true), 1400);
  }

  function undo(redo = false) {
    const from = redo ? state.future : state.history, to = redo ? state.history : state.future;
    if (!from.length) return;
    to.push(K.copy(state.project)); state.project = from.pop();
    if (!state.project.elements.some((e) => e.id === state.selected)) state.selected = state.project.elements[0]?.id || null;
    if (!state.project.elements.some((e) => e.id === state.traceRef.elementId)) state.traceRef = { elementId: state.selected || '', point: 'b' };
    state.playing = false;
    changed(false);
  }

  function currentElement() { return state.project.elements.find((e) => e.id === state.selected); }
  function selectedPose() { return state.result?.poses[state.selected]; }

  function recalculate(refit = false) {
    state.forceContext = null; state.forceCurve = []; state.forceError = ''; state.dynamic = null; state.dynamicHistory = [];
    state.project.dimensions ||= []; state.project.trajectories ||= [];
    state.project.simulation ||= { ...K.simulationDefaults };
    state.profile = K.prepareProject(state.project);
    const range = K.driveRange(state.project);
    state.motion = K.clamp(state.motion, range.min, range.max);
    state.samples = K.sample(state.project, 121, { collisions: state.collisions });
    state.result = solveCurrent();
    if (refit || !state.baseView) fitView();
    renderScene(); renderGraph(); updateMotion();
  }

  function solveCurrent() {
    return state.mode === 'edit'
      ? E.design(state.project, state.motion, { profile: state.profile })
      : K.solve(state.project, state.motion, { profile: state.profile, collisions: state.collisions });
  }

  function prepareForces(notify = false) {
    try {
      state.forceContext = P.prepare(state.project, { motion: state.motion, profile: state.profile, samples: state.samples, collisions: state.collisions });
      state.forceCurve = P.forceCurve(state.forceContext); state.forceError = '';
      return true;
    } catch (error) {
      state.forceContext = null; state.forceCurve = []; state.forceError = error.message;
      if (notify) toast(error.message, true);
      return false;
    }
  }

  function setMode(mode) {
    state.playing = false; state.mode = mode;
    state.pendingJoint = null; state.measure = null; state.tool = 'select';
    if (mode === 'edit') state.motion = K.driveRange(state.project).min;
    recalculate(false); renderInspector(); updateToolbar();
  }

  function applyPreferences(value, persist = false) {
    Object.assign(state, X.preferences(value));
    document.documentElement.dataset.theme = state.theme;
    document.querySelector('meta[name="theme-color"]').content = state.theme === 'dark' ? '#282b30' : state.theme === 'orange' ? '#ededed' : '#ffffff';
    if ($('#speed')) $('#speed').value = String(state.speed);
    if (persist) {
      try { localStorage.setItem(settingsKey, JSON.stringify(X.preferences(state))); }
      catch { toast('Vzhľad platí v tejto relácii. Nastavenia sa nedali uložiť do prehliadača.', true); }
    }
  }

  function makeEditable() {
    try {
      const project = E.editableCopy(state.project, state.motion);
      if (!saveProject(true)) state.dirty = true;
      replaceProject(project);
    } catch (error) { toast(error.message, true); }
  }

  function fitView() {
    const rect = $('#mechanism-canvas')?.getBoundingClientRect();
    const b = K.bounds(state.project, state.samples);
    const aspect = rect?.width && rect?.height ? rect.width / rect.height : 1.8;
    if (b.width / b.height > aspect) {
      const h = b.width / aspect;
      b.y -= (h - b.height) / 2; b.height = h;
    } else {
      const w = b.height * aspect;
      b.x -= (w - b.width) / 2; b.width = w;
    }
    state.baseView = { ...b }; state.view = { ...b };
  }

  function buildShell() {
    $('#app').innerHTML = `
      <header class="app-header">
        <div class="brand"><span class="brand-mark">${icon('mechanism', 27)}</span><span>kinematika<span class="brand-dot">.</span></span><span class="brand-studio">STUDIO</span></div>
        <div class="header-divider"></div>
        <button class="project-name" data-action="projects" title="Otvoriť projekty"><span id="project-name">${escape(state.project.name)}</span>${icon('chevron', 14)}</button>
        <span class="save-status" id="save-status"><i></i>Lokálny projekt</span>
        <div class="header-actions">
          ${ib('help', 'help', 'Pomoc a klávesové skratky')}
          <button class="button button-secondary save-button" data-action="save">${icon('save', 16)}<span>Uložiť</span></button>
          <button class="button button-dark" data-action="export">${icon('export', 16)}<span>Exportovať</span>${icon('chevron', 13)}</button>
        </div>
      </header>
      <nav class="context-bar" aria-label="Nástroje pracovného priestoru">
        <div class="workspace-tabs">
          <button class="workspace-tab is-active" data-action="view-editor" aria-pressed="true">${icon('cursor', 16)}Editor</button>
          <button class="workspace-tab" data-action="view-analysis" aria-pressed="false">${icon('chart', 16)}Analýza</button>
        </div>
        <div class="context-separator"></div>
        <button class="subtle-button projects-button" data-action="projects" title="Samostatné a uložené projekty">${icon('folder', 16)}<span>Projekty</span></button>
        <button class="subtle-button" data-action="templates">${icon('layers', 16)}<span>Šablóny mechanizmov</span>${icon('chevron', 13)}</button>
        <div class="context-right">
          <div class="history-controls">${ib('undo', 'undo', 'Späť (Ctrl+Z)')}${ib('redo', 'redo', 'Znova (Ctrl+Shift+Z)')}</div>
          <span class="units-tag">mm <span>/</span> °</span>
          ${ib('settings', 'settings', 'Nastavenia, vzhľad a export')}
          ${ib('panel', 'toggle-inspector', 'Zobraziť alebo skryť vlastnosti')}
          ${ib('menu', 'toggle-sidebar', 'Zobraziť prvky')}
        </div>
      </nav>
      <main class="workspace" id="workspace">
        <aside class="sidebar" aria-label="Prvky mechanizmu">
          <div class="sidebar-heading"><span>Pracovný priestor</span><span class="small-tag">2D</span></div>
          <div class="segmented sidebar-tabs"><button data-action="sidebar-elements" class="is-active">Prvky</button><button data-action="sidebar-joints">Väzby <span id="joint-count">5</span></button></div>
          <div class="sidebar-scroll">
            <div id="palette">
              <div class="section-label">KNIŽNICA PRVKOV <span>DRAG & DROP</span></div>
              <div class="component-palette">${K.TYPES.map((type) => `
                <button class="component-card" draggable="true" data-component="${type}" title="Pretiahnite na plátno alebo kliknite na pridanie">
                  <span class="component-symbol ${type}">${icon(typeIcons[type], 23)}</span>
                  <span class="component-name">${escape(typeNames[type])}<small>${({ ground: 'Pevné uloženie', rail: 'Posuvná väzba', link: 'Tuhý člen', slot: 'Riadená dráha', bearing: 'Otočný bod', panel: 'Posuv + rotácia', 'spring-compression': 'Sila pri stlačení', 'spring-extension': 'Sila pri natiahnutí', 'piston-push': 'Rozpínajúca vzpera', 'piston-pull': 'Sťahujúca vzpera' })[type]}</small></span>
                  <span class="component-add">${icon('plus', 13)}</span>
                </button>`).join('')}</div>
              <div class="sidebar-rule"></div>
            </div>
            <div class="tree-heading"><span class="section-label">ŠTRUKTÚRA MODELU</span><span id="element-count" class="count-pill">6</span></div>
            <div id="model-tree"></div>
            <div id="joint-list" hidden></div>
            <button class="add-element-button" data-action="add-menu">${icon('plus', 15)}Pridať prvok</button>
          </div>
          <div class="sidebar-bottom">
            <button class="template-card" data-action="templates"><span class="template-icon">${icon('layers', 20)}</span><span>Od nápadu k pohybu<small>Preskúmajte hotové mechanizmy</small></span>${icon('arrow', 16)}</button>
            <div class="sidebar-tip">${icon('cursor', 14)}<span>Potiahnite výsuv alebo čelo<br> a preskúmajte jeho pohyb.</span></div>
          </div>
        </aside>
        <section class="center-workspace">
          <div class="stage-header"><div class="segmented mode-switch" aria-label="Režim mechanizmu"><button data-action="mode-edit">Úprava geometrie</button><button data-action="mode-simulate">Simulácia</button></div><button class="subtle-button editable-copy" data-action="make-editable" title="Zachovať originál a vytvoriť voľnú editačnú kópiu">${icon('copy', 14)}<span>Voľná kópia</span></button><div class="stage-toggles">${ib('grid', 'grid', 'Zobraziť mriežku', state.grid, 'aria-pressed="true"')}${ib('ruler', 'dimensions', 'Zobraziť rozmery', state.dimensions, 'aria-pressed="true"')}${ib('layers', 'ghosts', 'Zobraziť krajné polohy', state.ghosts, 'aria-pressed="true"')}${ib('trace', 'trace', 'Zobraziť trajektóriu', state.trace, 'aria-pressed="true"')}</div></div>
          <div class="canvas-area" id="canvas-area">
            <div class="scene-heading"><span class="eyebrow">KINEMATICKÝ MODEL</span><h1 id="scene-name">${escape(state.project.name)}</h1><p>Bočný pohľad <span>·</span> Rovinný mechanizmus</p><button id="project-assumptions" class="estimate-chip" data-action="project-info" hidden>${icon('info', 12)}Odhadové rozmery · predpoklady</button></div>
            <div class="scene-status" id="scene-status">${icon('check', 13)}<span>Pohyb bez kolízií</span></div>
            <div class="canvas-tools" aria-label="Nástroje plátna">${ib('cursor', 'tool-select', 'Výber a pohyb (V)', true)}${ib('hand', 'tool-pan', 'Posúvanie plátna (H)')}${ib('link', 'tool-connect', 'Spojiť uzlové body (J)')}${ib('ruler', 'tool-measure', 'Zmerať vzdialenosť (M)')}<span class="tool-divider"></span>${ib('target', 'fit', 'Prispôsobiť pohľad (F)')}</div>
            <svg id="mechanism-canvas" xmlns="${svgNS}" role="img" aria-label="Interaktívny 2D model mechanizmu. Uchopte čelo alebo výsuv a potiahnite." tabindex="0"></svg>
            <div class="drop-hint" id="drop-hint">${icon('plus', 27)}<span>Pustite prvok na pracovnú plochu</span></div>
            <div class="axis-widget"><svg width="34" height="35" viewBox="0 0 34 35" aria-hidden="true"><path d="M9 5v23M9 5h22" fill="none" stroke="#b2bcc5" stroke-width="1.5"/><path d="m6 24 3 4 3-4m15-22 4 3-4 3" fill="none" stroke="#b2bcc5" stroke-width="1.5"/><text x="1" y="25" fill="#718291" font-size="8">Y</text><text x="26" y="18" fill="#718291" font-size="8">X</text></svg><span>XY <i>·</i> mm</span></div>
            <div class="phase-switcher" id="phase-switcher"></div>
            <div class="zoom-control">${ib('minus', 'zoom-out', 'Oddialiť')}<span id="zoom-value">100%</span>${ib('plus', 'zoom-in', 'Priblížiť')}<span class="zoom-divider"></span>${ib('expand', 'fit', 'Zobraziť celý mechanizmus')}</div>
            <div class="canvas-instruction" id="canvas-instruction" hidden></div>
          </div>
          <section class="analysis-panel" aria-label="Analýza pohybu">
            <div class="analysis-header"><div class="analysis-title">${icon('chart', 17)}<h2>Pohybový profil</h2><span class="live-tag">LIVE</span><select id="graph-mode" aria-label="Zobrazený graf"><option value="angle">Uhly</option><option value="force">Sila / moment pohonu</option></select></div><div class="graph-legend"><span class="legend-line"></span><span id="graph-legend">Uhol čela</span><button class="trace-chip" data-action="trace-pick">${icon('trace', 14)}<span id="trace-name">Bod C</span>${icon('chevron', 12)}</button></div></div>
            <div class="graph-area"><span class="graph-unit" id="graph-unit">Uhol (°)</span><svg id="motion-graph" viewBox="0 0 800 94" preserveAspectRatio="none" role="img" aria-label="Graf závislosti uhla čela od posuvu výsuvu"></svg><span class="graph-x-label" id="graph-x-label">Posuv (mm)</span><div class="graph-tooltip" id="graph-tooltip" hidden></div></div>
            <div class="simulation-bar">
              <div class="play-controls">${ib('reset', 'reset', 'Vrátiť do zatvorenej polohy')}<button class="play-button" data-action="play" aria-label="Spustiť simuláciu" title="Spustiť simuláciu (medzerník)">${icon('play', 17)}</button>${ib('loop', 'loop', 'Opakovať otváranie a zatváranie', true, 'aria-pressed="true"')}</div>
              <div class="motion-control"><div class="motion-label"><label for="motion-range" id="motion-label">Posuv výsuvu</label><span id="motion-total">0 – 300 mm</span></div><input id="motion-range" aria-label="Posuv výsuvu" type="range" min="0" max="300" step="0.1" value="150" /><div class="range-labels"><span id="range-min">Zatvorené</span><span id="range-max">Otvorené</span></div></div>
              <div class="motion-readout"><input id="motion-value" type="number" min="0" max="300" step="0.1" value="150" aria-label="Presná poloha pohonu" /><span id="motion-unit">mm</span></div>
              <div class="speed-control"><label for="speed">Rýchlosť</label><select id="speed" aria-label="Rýchlosť simulácie"><option value="0.25">0,25×</option><option value="0.5">0,5×</option><option value="1" selected>1×</option><option value="1.5">1,5×</option><option value="2">2×</option></select></div>
            </div><div class="dynamics-readout" id="dynamics-readout" hidden></div>
          </section>
        </section>
        <aside class="inspector" aria-label="Inšpektor vlastností"><div class="inspector-top"><div>${icon('settings', 16)}<span>Vlastnosti</span></div>${ib('close', 'toggle-inspector', 'Zavrieť vlastnosti')}</div><div id="inspector-content"></div></aside>
      </main>
      <footer class="status-bar"><div><span class="ready-dot" id="solver-dot"></span><span id="solver-status">Solver pripravený</span><span class="status-separator"></span><span id="solver-meta">1 stupeň voľnosti</span></div><div class="status-right"><span id="pointer-coordinates">X: 0,0 <span>Y: 0,0</span></span><span class="status-separator"></span><span>Pozícia v mm</span><span class="version">v2.0</span></div></footer>
    `;
  }

  function renderTree() {
    const p = state.project;
    $('#element-count').textContent = p.elements.length;
    $('#joint-count').textContent = p.connections.length;
    $('#model-tree').innerHTML = p.elements.length ? p.elements.map((e) => `
      <div class="tree-row${state.selected === e.id ? ' is-selected' : ''}${!e.visible ? ' is-hidden' : ''}">
        <button class="tree-select" data-action="select" data-id="${escape(e.id)}"><span class="tree-symbol ${e.type}">${icon(typeIcons[e.type], 16)}</span><span>${escape(e.name)}</span></button>
        <button class="tree-eye" data-action="visibility" data-id="${escape(e.id)}" title="${e.visible ? 'Skryť' : 'Zobraziť'} prvok" aria-label="${e.visible ? 'Skryť' : 'Zobraziť'} ${escape(e.name)}">${icon(e.visible ? 'eye' : 'eyeOff', 13)}</button>
        ${e.locked ? `<span class="tree-lock" title="Pevné uloženie alebo riadený prvok">${icon('lock', 11)}</span>` : '<span class="tree-lock"></span>'}
      </div>`).join('') : '<div class="empty-tree">Váš mechanizmus začína tu.<br>Pridajte prvok z knižnice.</div>';
    $('#joint-list').innerHTML = p.connections.length ? p.connections.map((j, i) => {
      const a = p.elements.find((e) => e.id === j.a.elementId), b = p.elements.find((e) => e.id === j.b.elementId);
      return `<div class="joint-list-item"><span class="joint-number">${String(i + 1).padStart(2, '0')}</span><div><button class="joint-edit" data-action="edit-joint" data-id="${escape(j.id)}"><strong>${escape(j.name)}</strong></button><small>${escape(a?.name)} · ${escape(j.a.point)} <span>↔</span> ${escape(b?.name)} · ${escape(j.b.point)}</small><small>${escape(E.constraintNames[j.type || 'revolute'])}</small></div>${!j.builtin ? ib('trash', 'delete-joint', 'Odstrániť väzbu', false, `data-id="${escape(j.id)}"`) : `<span class="joint-builtin">${icon('lock', 12)}</span>`}</div>`;
    }).join('') : '<div class="empty-tree">Zvoľte nástroj Spojiť (J)<br>a kliknite na dva uzly.</div>';
    $('#palette').hidden = state.sidebarTab !== 'elements';
    $('#model-tree').hidden = state.sidebarTab !== 'elements';
    $('#joint-list').hidden = state.sidebarTab !== 'joints';
    $('.tree-heading .section-label').textContent = state.sidebarTab === 'joints' ? 'KINEMATICKÉ VÄZBY' : 'ŠTRUKTÚRA MODELU';
    $('#element-count').textContent = state.sidebarTab === 'joints' ? p.connections.length : p.elements.length;
    $('.add-element-button').innerHTML = `${icon(state.sidebarTab === 'joints' ? 'link' : 'plus', 15)}${state.sidebarTab === 'joints' ? 'Spojiť dva uzly' : 'Pridať prvok'}`;
    $('[data-action="sidebar-elements"]').classList.toggle('is-active', state.sidebarTab === 'elements');
    $('[data-action="sidebar-joints"]').classList.toggle('is-active', state.sidebarTab === 'joints');
  }

  function field(label, key, value, unit = 'mm', min = 1, max = 2000, step = 0.1, scope = 'parameter', extra = '') {
    const id = `field-${scope}-${key}`;
    const digits = Math.max(0, Math.min(6, Math.ceil(-Math.log10(step))));
    return `<label class="property-field" for="${id}"><span>${escape(label)}</span><div class="number-field"><input id="${id}" data-property="${key}" data-scope="${scope}" type="number" value="${Number(value).toFixed(digits)}" min="${min}" max="${max}" step="${step}" ${extra}/><span>${escape(unit)}</span></div></label>`;
  }

  function section(title, content, suffix = '') { return `<section class="property-section"><div class="property-section-title">${escape(title)}${suffix}</div>${content}</section>`; }
  function two(a, b) { return `<div class="property-two">${a}${b}</div>`; }
  function switchRow(label, action, checked, hint = '') { return `<button class="switch-row" data-action="${action}" role="switch" aria-checked="${checked}"><span>${escape(label)}${hint ? `<small>${escape(hint)}</small>` : ''}</span><span class="switch${checked ? ' on' : ''}"></span></button>`; }

  function doubleTraceControls() {
    return `<label class="property-field"><span>Sledované body</span><select class="property-select" data-trace-mode aria-label="Sledované body trajektórie"><option value="bearings"${state.traceMode === 'bearings' ? ' selected' : ''}>Obe vodiace ložiská A + B</option><option value="single"${state.traceMode === 'single' ? ' selected' : ''}>Jeden zvolený bod</option></select></label><div class="trace-reference-label">Súradnicová sústava</div><div class="segmented trace-reference">${[['world', 'Pevný korpus'], ['carrier', 'Zásuvka']].map(([space, name]) => `<button type="button" data-action="trace-space" data-space="${space}" aria-pressed="${state.traceSpace === space}" class="${state.traceSpace === space ? 'is-active' : ''}">${name}</button>`).join('')}</div><p class="section-description trace-explanation">${state.traceSpace === 'carrier' ? 'Dráhy vzhľadom na zásuvku ležia v jej kulisách. Po sklopení sa ložiská v tejto sústave už nepohybujú.' : 'Dráhy vzhľadom na pevný korpus zahŕňajú sklopenie aj následný vodorovný posuv.'}</p>`;
  }

  function doubleDrawerGeometry(e, p) {
    const span = p.travelMax - p.travelMin;
    let geometry = '';
    if (e.role === 'front') geometry = section('Odhadová geometria čela', `${field('Dĺžka čela', 'panelLength', p.panelLength)}${field('Hrúbka čela', 'panelThickness', p.panelThickness, 'mm', 1, 100)}${two(field('Zatvorené čelo', 'closedAngle', p.closedAngle, '°', -179, 180), field('Sklopené čelo', 'openAngle', p.openAngle, '°', -180, 179))}`);
    if (e.role === 'rocker') geometry = section('Tuhé modré rameno', `${field('Dĺžka medzi kĺbmi R a B', 'armLength', p.armLength)}${two(field('Uhol zatvoreného ramena', 'armClosedAngle', p.armClosedAngle, '°', -44, 45), field('Uhol sklopeného ramena', 'armOpenAngle', p.armOpenAngle, '°', -45, 44))}<p class="section-description">Dĺžka sa počas pohybu nemení. Kĺb B je aj vodiace ložisko v druhej kulise.</p>`);
    if (e.role === 'carrier') geometry = section('Posuvný rám zásuvky', `${field('Dĺžka rámu', 'frameLength', p.frameLength)}${field('Poloha rámu Y', 'drawerY', p.drawerY, 'mm', -1000, 1000)}${field('Výška rámu', 'drawerHeight', p.drawerHeight)}`) +
      section('Dve fázy pohybu', `${two(field('Minimum pohonu', 'travelMin', p.travelMin, 'mm', 0, 1999), field('Maximum pohonu', 'travelMax', p.travelMax))}${field('Koniec sklápania od začiatku', 'releaseTravel', p.releaseTravel, 'mm', 1, span - 1)}${field('Odhadový prechod opory', 'handoffLength', p.handoffLength, 'mm', 1, p.releaseTravel)}<p class="section-description">Najprv sklopenie, potom spoločný posuv bez ďalšej rotácie.</p>`);
    if (e.role === 'frame') geometry = section('Pevný korpus', `${field('Dĺžka korpusu', 'frameLength', p.frameLength)}${field('Výška korpusu', 'frameHeight', p.frameHeight)}${field('Výška predného otvoru', 'frontOpening', p.frontOpening, 'mm', 1, p.frameHeight - 1)}<div class="fixed-note">${icon('lock', 15)}Korpus sa neposúva.</div>`);
    if (e.role === 'table') geometry = section('Pevná platforma stola', `${field('Horná plocha Y', 'tableY', p.tableY, 'mm', -1000, 1000)}${field('Hrúbka platformy', 'tableThickness', p.tableThickness)}${two(field('Začiatok pevného výrezu X', 'cutoutStart', p.cutoutStart, 'mm', 0, 2000), field('Koniec pevného výrezu X', 'cutoutEnd', p.cutoutEnd, 'mm', 1, 2500))}<p class="section-description">Výrez je odhadový a pevný pre celý zdvih. Nehýbe sa podľa aktuálnej polohy ložísk.</p>`);
    if (['stop', 'rearSlot', 'rearPin'].includes(e.role)) geometry = section('Zadná opora a čap R', `${two(field('Počiatočný čap X', 'rearX', p.rearX, 'mm', 0, 1500), field('Os čapu Y', 'rearY', p.rearY, 'mm', -1000, 1000))}${field('Koniec sklápania', 'releaseTravel', p.releaseTravel, 'mm', 1, span - 1)}${field('Odhadový prechod opory', 'handoffLength', p.handoffLength, 'mm', 1, p.releaseTravel)}<p class="section-description">Pred prechodom drží opora čap na mieste. Potom sa čap uvoľní do spoločného posuvu. Spôsob zachytenia a uvoľnenia nie je v náčrte určený.</p>`);
    if (['guide1', 'guide2'].includes(e.role)) {
      const index = e.role === 'guide1' ? 1 : 2;
      geometry = section(`Kulisa ${index} · sústava zásuvky`, `${field('Šírka drážky', 'slotWidth', p.slotWidth, 'mm', 2, 100)}${two(field('Odsadenie profilu X', `guide${index}X`, p[`guide${index}X`], 'mm', -200, 200), field('Odsadenie profilu Y', `guide${index}Y`, p[`guide${index}Y`], 'mm', -200, 200))}<p class="section-description">Profil je odvodený z tuhého držiaka a ramena, nie z ľubovoľnej spline. Odsadenie jednej kulisy môže porušiť uzavretie mechanizmu.</p>`);
    }
    if (['bracket', 'pinA', 'pinB'].includes(e.role)) geometry = section('Tuhý držiak ložísk', `<p class="section-description">Lokálne súradnice od päty čela: X po čele, Y kolmo na čelo. Ložiská majú pevný vzájomný rozstup.</p>${two(field('Ložisko A · X', 'pinAX', p.pinAX, 'mm', -200, 200), field('Ložisko A · Y', 'pinAY', p.pinAY, 'mm', -200, 200))}${two(field('Ložisko B · X', 'pinBX', p.pinBX, 'mm', -200, 200), field('Ložisko B · Y', 'pinBY', p.pinBY, 'mm', -200, 200))}${field('Priemer vodiaceho ložiska', 'bearingRadius', p.bearingRadius * 2, 'mm', 2, 100, 1, 'diameter')}<div class="fixed-note">${icon('link', 15)}Rozstup A–B: ${fmt(Math.hypot(p.pinAX - p.pinBX, p.pinAY - p.pinBY), 2)} mm</div>`);
    return geometry + `<div class="inspector-note estimated-note">${icon('warning', 15)}<p>Rozmery a uvoľnenie opory sú odhadové. Nie je to výrobný výkres.</p></div><button class="button button-secondary full-width" data-action="project-info">${icon('info', 14)}Náčrt a predpoklady projektu</button>`;
  }

  function elasticGeometry(e) {
    const spring = e.type.startsWith('spring-'), compression = e.type === 'spring-compression', pulling = ['spring-extension', 'piston-pull'].includes(e.type);
    const force = state.result.forces?.find((v) => v.id === e.id);
    return section('Dĺžka medzi montážnymi čapmi', `${field(spring ? 'Voľná dĺžka L₀' : 'Referenčná dĺžka', 'restLength', e.restLength, 'mm', .1, 5000, .1, 'element')}${two(field('Minimálna dĺžka', 'minLength', e.minLength, 'mm', .1, 5000, .1, 'element'), field('Maximálna dĺžka', 'maxLength', e.maxLength, 'mm', .1, 5000, .1, 'element'))}<div class="analysis-metric"><span>Aktuálna dĺžka</span><strong>${fmt(selectedPose()?.length, 2)} <small>mm</small></strong></div>`) +
      section('Priemery', `${field(spring ? 'Vonkajší priemer pružiny' : 'Priemer valca', 'diameter', e.diameter, 'mm', .1, 500, .1, 'element')}${field(spring ? 'Priemer drôtu' : 'Priemer tyče', spring ? 'wireDiameter' : 'rodDiameter', spring ? e.wireDiameter : e.rodDiameter, 'mm', .01, 500, .01, 'element')}`) +
      section(pulling ? 'Ťažná sila (sťahuje čapy)' : 'Tlačná sila (odtláča čapy)', `${spring ? `<label class="property-field"><span>Spôsob zadania sily</span><select class="property-select" id="force-mode"><option value="rated"${e.forceMode !== 'stiffness' ? ' selected' : ''}>F pri pracovnom limite</option><option value="stiffness"${e.forceMode === 'stiffness' ? ' selected' : ''}>Tuhosť k (N/mm)</option></select></label>${e.forceMode === 'stiffness' ? field('Tuhosť pružiny k', 'stiffness', e.stiffness, 'N/mm', 0, 100000, .001, 'element') : field(compression ? 'F pri minimálnej dĺžke' : 'F pri maximálnej dĺžke', 'force', e.force, 'N', 0, 1000000, .01, 'element')}${!compression ? field('Počiatočné predpätie F₀', 'preload', e.preload, 'N', 0, 1000000, .01, 'element') : ''}<p class="section-description">${compression ? 'Nad voľnou dĺžkou pružina netlačí. F = k · (L₀ − L).' : 'Pod voľnou dĺžkou je pružina voľná. Od L₀ ťahá silou F₀ + k · (L − L₀).'}</p>` : `${field('Referenčná sila F', 'force', e.force, 'N', 0, 1000000, .1, 'element')}${field('Pomer sily na konci zdvihu', 'progression', e.progression, '×', 1, 3, .01, 'element')}<p class="section-description">${pulling ? 'F pri minimálnej dĺžke, rastie pri vysúvaní.' : 'F pri maximálnej dĺžke, rastie pri zasúvaní.'} Pomer 1 znamená konštantnú silu. Nejde o pneumatický okruh ani výrobný model plynu.</p>`}${field('Osové tlmenie', 'damping', e.damping, 'N·s/m', 0, 100000, .1, 'element')}<div class="analysis-metric"><span>Výsledná osová sila</span><strong>${fmt(force?.magnitude || 0, 2)} <small>N</small></strong></div>`) +
      section('Montáž medzi telesami', `<label class="property-field"><span>Koniec A</span><select id="mount-a" class="property-select">${nodeOptions(K.elasticMount(state.project, e, 'a'), false, true, true)}</select></label><label class="property-field"><span>Koniec B</span><select id="mount-b" class="property-select">${nodeOptions(K.elasticMount(state.project, e, 'b'), false, true, true)}</select></label><p class="section-description">Sila sa prenesie medzi zvolené body. Pružný prvok nepredpisuje tuhú dĺžku. Koncové dĺžky sú dorazy, ktoré zastavia simuláciu.</p>`) +
      section('Voľné konce v editácii', `${two(field('Poloha X', 'x', e.x, 'mm', -5000, 5000, .1, 'element'), field('Poloha Y', 'y', e.y, 'mm', -5000, 5000, .1, 'element'))}${field('Rozostup voľných čapov', 'length', e.length, 'mm', .1, 5000, .1, 'element')}${field('Uhol prvku', 'angle', e.angle, '°', -360, 360, .1, 'element')}`) +
      `<div class="inspector-note">${icon('warning', 15)}<p>Parametre sú návrhový odhad. Overte minimálnu dĺžku, zdvih, rezervu a silu v údajoch výrobcu.</p></div><button class="button button-secondary full-width" data-action="elastic-sources">Katalógové príklady a zdroje</button>`;
  }

  function drawElastic(e, pose, color) {
    const length = pose.length || 1, ux = (pose.b.x - pose.a.x) / length, uy = (pose.b.y - pose.a.y) / length;
    const at = (s, normal = 0) => ({ x: pose.a.x + ux * s - uy * normal, y: pose.a.y + uy * s + ux * normal });
    const spring = e.type.startsWith('spring-');
    let body;
    if (spring) {
      const points = [pose.a, at(length * .13)];
      for (let i = 0; i < 17; i++) points.push(at(length * (.16 + i / 16 * .68), (i % 2 ? 1 : -1) * e.diameter / 2));
      points.push(at(length * .87), pose.b);
      body = `<path d="${pathD(points)}" stroke="${color}" stroke-width="${Math.min(4, Math.max(1, e.wireDiameter))}" stroke-linejoin="round" fill="none"/>`;
    } else {
      const cylinder = Math.min(length * .8, e.minLength * .72), rod = at(cylinder);
      body = `${line(pose.a, pose.b, `stroke="#8995a2" stroke-width="${e.rodDiameter}" stroke-linecap="round"`)}${line(pose.a, rod, `stroke="${color}" stroke-width="${e.diameter}" stroke-linecap="butt"`)}${line(at(4), at(Math.max(4, cylinder - 4)), `stroke="#dde4eb" stroke-width="${e.diameter * .45}"`)}`;
    }
    const force = state.result.forces?.find((v) => v.id === e.id);
    body += `<text x="${(pose.a.x + pose.b.x) / 2}" y="${(pose.a.y + pose.b.y) / 2 - e.diameter / 2 - 9}" text-anchor="middle" class="force-label">${escape(e.name)} · ${fmt(force?.magnitude || 0, 1)} N</text>`;
    if (state.forceArrows && force?.magnitude > .001) {
      for (const [origin, vector] of [[pose.a, force.atA], [pose.b, force.atB]]) {
        const f = Math.hypot(vector.x, vector.y), size = 18 + Math.min(30, f * .12);
        const dx = vector.x / f, dy = vector.y / f, end = { x: origin.x + dx * size, y: origin.y + dy * size };
        body += `<g pointer-events="none" class="force-arrow">${line(origin, end, 'stroke="#bd6a77" stroke-width="1.7"')}<polygon points="${end.x},${end.y} ${end.x - dx * 7 - dy * 3},${end.y - dy * 7 + dx * 3} ${end.x - dx * 7 + dy * 3},${end.y - dy * 7 - dx * 3}" fill="#bd6a77"/></g>`;
      }
    }
    return body;
  }

  function renderInspector() {
    const container = $('#inspector-content'), e = currentElement(), p = state.project.parameters;
    if (state.analysis) {
      const blocked = state.samples.filter((s) => s.blocked);
      const angles = state.samples.map((s) => s.angle);
      const lengths = traceReferences().map((reference) => `<div class="analysis-metric"><span>Trajektória ${escape(reference.label || 'bodu')}${isDoubleDrawer() ? ` · ${state.traceSpace === 'carrier' ? 'zásuvka' : 'korpus'}` : ''}</span><strong>${fmt(traceLength(reference))} <small>mm</small></strong></div>`).join('');
      container.innerHTML = `<div class="inspector-selection"><span class="selection-icon analysis">${icon('chart', 27)}</span><div><h2>Analýza mechanizmu</h2><span class="selection-type">CELÝ ZDVIH · 121 VZORIEK</span></div></div><div class="inspector-body">
        ${section('Rozsah pohybu', `<div class="analysis-metric"><span>Uhol výstupu</span><strong>${fmt(Math.min(...angles))}° <small>→</small> ${fmt(Math.max(...angles))}°</strong></div>${lengths}<div class="analysis-metric"><span>Max. chyba väzieb</span><strong>${fmt(Math.max(...state.samples.map((s) => s.residual)), 3)} <small>mm</small></strong></div>`)}
        ${isDoubleDrawer() ? section('Dve ložiská · dve kulisy', `${doubleTraceControls()}<div class="analysis-metric"><span>Uhol modrého ramena</span><strong>${fmt(p.armClosedAngle)}° <small>→</small> ${fmt(p.armOpenAngle)}°</strong></div><div class="fixed-note">${icon('lock', 15)}Pevná dĺžka ramena: ${fmt(p.armLength)} mm</div><button class="button button-secondary full-width" data-action="project-info">Odhadové predpoklady</button>`) : ''}
        ${section('Kontrola mechanizmu', `<div class="validation-card${blocked.length ? ' has-warning' : ''}">${icon(blocked.length ? 'warning' : 'check', 19)}<div><strong>${blocked.length ? `${blocked.length} polôh vyžaduje kontrolu` : 'Všetky polohy sú priechodné'}</strong><p>${blocked.length ? escape(blocked[0].issues[0]) : 'Väzby sú splnené v celom rozsahu pohybu.'}</p></div></div>${switchRow('Detekcia kolízií', 'collisions', state.collisions, 'Rovinná geometrická kontrola')}`)}
        ${section('Vizualizácia', `${switchRow('Trajektória bodu', 'trace', state.trace)}${switchRow('Krajné polohy', 'ghosts', state.ghosts)}${switchRow('Rozmerové kóty', 'dimensions', state.dimensions)}`)}
        ${section('Sily a odhadová dynamika', `<button class="button button-secondary full-width" data-action="analyze-forces">Vypočítať sily / moment pohonu</button>${state.forceContext ? `<div class="analysis-metric"><span>Vyrovnávacia sila ${K.driveRange(state.project).unit === '°' ? '/ moment' : ''}</span><strong>${fmt(P.generalized(state.forceContext, state.motion).handForce, 2)} <small>${K.driveRange(state.project).unit === '°' ? 'N·m' : 'N'}</small></strong></div>` : state.forceError ? `<p class="section-description">${escape(state.forceError)}</p>` : ''}${(state.result.forces || []).map((force) => `<div class="analysis-metric"><span>${escape(state.project.elements.find((e) => e.id === force.id)?.name)}</span><strong>${fmt(force.magnitude, 2)} <small>N</small></strong></div>`).join('')}<button class="button button-secondary full-width" data-action="settings">Hmotnosť, gravitácia, tlmenie a pohon</button>`)}
        <div class="inspector-note">${icon('warning', 15)}<p>Odhadový model jedného pohonu, tuhých telies a lineárnych pružín. Neoveruje kontaktné reakcie, bezpečnosť západky, deformácie ani katalógovú životnosť.</p></div>
        <button class="button button-secondary full-width" data-action="export-csv">${icon('export', 16)}Exportovať namerané dáta</button>
      </div>`;
      return;
    }
    if (!e) {
      container.innerHTML = `<div class="empty-inspector">${icon('cursor', 34)}<h2>Priestor pre váš nápad</h2><p>Vyberte prvok na plátne alebo ho pridajte z knižnice. Pripravené projekty nájdete samostatne.</p><button class="button button-dark" data-action="projects">${icon('folder', 15)}Otvoriť projekt</button><button class="button button-secondary" data-action="templates">Vybrať šablónu</button></div>`;
      return;
    }
    let geometry = '';
    if (e.primary && isDoubleDrawer()) {
      geometry = doubleDrawerGeometry(e, p);
    } else if (e.primary && state.project.kind === 'drawer') {
      if (e.type === 'panel') geometry = section('Geometria čela', `${field('Dĺžka čela', 'panelLength', p.panelLength)}${field('Hrúbka čela', 'panelThickness', p.panelThickness, 'mm', 1, 100)}${field('Odsadenie otočného čapu', 'panelOffsetX', p.panelOffsetX, 'mm', -300, 300)}`) +
        section('Uloženie ložiska', `${field('Vzdialenosť od otočného čapu', 'bearingOffset', p.bearingOffset, 'mm', 1, 1000)}${field('Priemer vodiaceho ložiska', 'bearingRadius', p.bearingRadius * 2, 'mm', 2, 100, 1, 'diameter')}`) +
        section('Pohybové limity', two(field('Zatvorené čelo', 'closedAngle', p.closedAngle, '°', -179, 180), field('Otvorené čelo', 'openAngle', p.openAngle, '°', -180, 179)));
      if (e.type === 'rail') geometry = section('Geometria vedenia', `${field('Celková dĺžka výsuvu', 'frameLength', p.frameLength)}${field('Výška osi výsuvu', 'pivotY', p.pivotY, 'mm', -1000, 1000)}`) +
        section('Pohybové limity', two(field('Min. vytiahnutie', 'travelMin', p.travelMin, 'mm', 0, 1999), field('Max. zdvih', 'travelMax', p.travelMax))) +
        section('Riadenie čela', `${field('Začiatok vyklápania', 'turnStart', p.turnStart, 'mm', p.travelMin, p.travelMax - 1)}${field('Tvar pohybového profilu', 'smoothness', p.smoothness, '×', 0.3, 3, 0.1)}`);
      if (e.type === 'ground') geometry = section('Geometria korpusu', `${field('Dĺžka korpusu', 'frameLength', p.frameLength)}${field('Vnútorná výška', 'frameHeight', p.frameHeight)}${field('Výška osi výsuvu', 'pivotY', p.pivotY, 'mm', -1000, 1000)}`) + section('Uloženie', '<div class="fixed-note">' + icon('lock', 15) + 'Pevné teleso · 0 stupňov voľnosti</div>');
      if (e.type === 'slot') {
        const controls = state.project.controls || K.defaultControls(p);
        geometry = section('Profil vodiacej kulisy', `<label class="property-field"><span>Typ geometrie</span><select class="property-select" id="curve-kind"><option value="cam"${p.curveKind === 'cam' ? ' selected' : ''}>Parametrický profil</option><option value="arc"${p.curveKind === 'arc' ? ' selected' : ''}>Kruhový oblúk</option><option value="bezier"${p.curveKind === 'bezier' ? ' selected' : ''}>Bézierova krivka</option><option value="spline"${p.curveKind === 'spline' ? ' selected' : ''}>Interpolovaná spline</option></select></label>${field('Šírka drážky', 'slotWidth', p.slotWidth, 'mm', 2, 100)}${p.curveKind === 'arc' ? field('Polomer zakrivenia', 'curveRadius', p.curveRadius, 'mm', 1, 5000) : ''}${p.curveKind === 'cam' ? field('Začiatok vyklápania', 'turnStart', p.turnStart, 'mm', p.travelMin, p.travelMax - 1) : ''}`) +
          section('Poloha kulisy', two(field('Odsadenie X', 'slotOffsetX', p.slotOffsetX, 'mm', -500, 500), field('Odsadenie Y', 'slotOffsetY', p.slotOffsetY, 'mm', -500, 500)));
        if (['bezier', 'spline'].includes(p.curveKind)) geometry += section('Kontrolné body', `<p class="section-description">Body môžete upraviť aj ťahaním na plátne.</p>${controls.map((c, i) => `<div class="control-point-row"><span>P${i}</span>${field('X', `${i}-x`, c.x, 'mm', -5000, 5000, 0.1, 'control')}${field('Y', `${i}-y`, c.y, 'mm', -5000, 5000, 0.1, 'control')}</div>`).join('')}`);
        geometry += '<div class="inspector-note">' + icon('info', 15) + '<p>Parametrická kulisa je odvodená z dráhy ložiska. Pri voľnej krivke solver kontroluje jej dosiahnuteľnosť.</p></div>';
      }
      if (e.type === 'bearing') geometry = section(e.role === 'pivot' ? 'Otočný čap' : 'Vodiace ložisko', `${field('Priemer ložiska', 'bearingRadius', p.bearingRadius * 2, 'mm', 2, 100, 1, 'diameter')}${e.role !== 'pivot' ? field('Vzdialenosť od otočného čapu', 'bearingOffset', p.bearingOffset) : ''}`) + section('Kinematická väzba', `<div class="fixed-note">${icon(e.role === 'pivot' ? 'bearing' : 'slot', 17)}${e.role === 'pivot' ? 'Otočný kĺb čela a výsuvu' : 'Čap striktne viazaný na kulisu'}</div>`);
    } else if (e.primary && state.project.kind === 'fourbar') {
      const key = { frame: 'groundLength', input: 'crankLength', coupler: 'couplerLength', output: 'rockerLength' }[e.role];
      geometry = section('Geometria člena', field('Vzdialenosť medzi kĺbmi', key, p[key])) + section('Uzavretý kinematický reťazec', '<div class="fixed-note">' + icon('link', 16) + 'Rotačné kĺby · pevné dĺžky ramien</div>');
    } else if (e.primary && state.project.kind === 'crank') {
      geometry = section('Geometria mechanizmu', `${field('Polomer kľuky', 'crankLength', p.crankLength)}${field('Dĺžka ojnice', 'rodLength', p.rodLength)}${field('Poloha osi vedenia Y', 'sliderY', p.sliderY, 'mm', -500, 500)}`);
    } else {
      geometry = section('Poloha a orientácia', two(field('Poloha X', 'x', e.x, 'mm', -5000, 5000, 0.1, 'element'), field('Poloha Y', 'y', e.y, 'mm', -5000, 5000, 0.1, 'element')) + field('Uhol natočenia', 'angle', e.angle, '°', -360, 360, 0.1, 'element')) +
        section('Geometria', `${e.type !== 'bearing' ? field('Dĺžka prvku', 'length', e.length, 'mm', 1, 2000, 1, 'element') : field('Polomer ložiska', 'radius', e.radius, 'mm', 1, 100, 1, 'element')}${['link', 'panel'].includes(e.type) ? field('Hrúbka člena', 'width', e.width, 'mm', 1, 100, 1, 'element') : ''}${e.type === 'rail' ? field('Zdvih vedenia', 'stroke', e.stroke, 'mm', 1, 2000, 1, 'element') : ''}${e.type === 'panel' ? field('Vzdialenosť ložiska', 'bearingOffset', e.bearingOffset, 'mm', 1, 2000, 1, 'element') : ''}${e.type === 'slot' ? field('Šírka drážky', 'slotWidth', e.slotWidth, 'mm', 2, 100, 1, 'element') : ''}`);
      if (e.type === 'bearing') geometry += section('Vedenie ložiska', `<label class="property-field"><span>Viazať na kulisu</span><select class="property-select" id="bearing-slot"><option value="">Bez väzby</option>${state.project.elements.filter((s) => s.type === 'slot').map((s) => `<option value="${escape(s.id)}"${s.id === e.slotId ? ' selected' : ''}>${escape(s.name)}</option>`).join('')}</select></label>`);
      if (e.type === 'slot') geometry += section('Profil kulisy / vodiacej dráhy', `<label class="property-field"><span>Typ geometrie</span><select class="property-select" id="element-curve-kind">${[['bezier', 'Bézierova krivka'], ['spline', 'Interpolovaná spline'], ['arc', 'Kruhový oblúk'], ['polyline', 'Lomená čiara · presné body']].map(([kind, title]) => `<option value="${kind}"${e.curveKind === kind ? ' selected' : ''}>${title}</option>`).join('')}</select></label>${e.curveKind === 'arc' ? field('Polomer zakrivenia', 'curveRadius', e.curveRadius, 'mm', 1, 5000, 1, 'element') : ''}<p class="section-description">${e.controls.length} bodov, lokálne súradnice. V editačnom režime môžete body ťahať na plátne.</p>${e.controls.length <= 32 ? e.controls.map((c, i) => `<div class="control-point-row"><span>P${i}</span>${field('X', `${i}-x`, c.x, 'mm', -5000, 5000, 0.1, 'element-control')}${field('Y', `${i}-y`, c.y, 'mm', -5000, 5000, 0.1, 'element-control')}</div>`).join('') : ''}<button class="button button-secondary full-width" data-action="edit-path">Upraviť / pridať / odstrániť body</button>`);
      if (['rail', 'link', 'panel'].includes(e.type)) geometry += section('Jeden pohon mechanizmu', `${switchRow('Riadený pohon', 'drive-selected', e.drive)}${e.type !== 'rail' ? `<label class="property-field"><span>Druh pohonu</span><select class="property-select" id="drive-mode"><option value="rotary"${e.driveMode !== 'linear' ? ' selected' : ''}>Rotačný</option><option value="linear"${e.driveMode === 'linear' ? ' selected' : ''}>Posuv celého telesa</option></select></label>${e.driveMode === 'linear' ? `${field('Zdvih telesa', 'stroke', e.stroke, 'mm', 1, 2000, 0.1, 'element')}${field('Smer posuvu', 'driveAngle', e.driveAngle || 0, '°', -360, 360, 0.1, 'element')}` : ''}` : ''}${e.drive ? two(field('Minimum pohonu', K.driveRange(state.project).unit === '°' ? 'rotationMin' : 'travelMin', K.driveRange(state.project).min, K.driveRange(state.project).unit, K.driveRange(state.project).unit === '°' ? -360 : 0, 2000), field('Maximum pohonu', K.driveRange(state.project).unit === '°' ? 'rotationMax' : 'travelMax', K.driveRange(state.project).max, K.driveRange(state.project).unit, 1, 2000)) : ''}`);
      geometry += section('Uloženie', `${switchRow('Pevné uloženie v simulácii', 'lock-selected', e.locked)}${!K.isElastic(e) ? `<label class="property-field"><span>Nosné teleso (pevné pripojenie)</span><select class="property-select" id="parent-body"><option value="">Bez nosného telesa</option>${state.project.elements.filter((v) => v.id !== e.id && !K.isElastic(v)).map((v) => `<option value="${escape(v.id)}"${e.parentId === v.id ? ' selected' : ''}>${escape(v.name)}</option>`).join('')}</select></label>${e.parentId ? '<p class="section-description">Poloha X/Y a uhol sú lokálne vzhľadom na nosné teleso. Teleso sa pohybuje spolu s ním.</p>' : ''}` : ''}`);
      if (['ground', 'link', 'panel'].includes(e.type)) geometry += section('Tvar telesa', `<button class="button button-secondary full-width" data-action="edit-outline">Upraviť obrys · ${e.outline?.length || 0} vrcholov</button>${e.type === 'panel' && e.localC ? two(field('Pomocný bod C · X', 'x', e.localC.x, 'mm', -5000, 5000, 0.1, 'local-c'), field('Pomocný bod C · Y', 'y', e.localC.y, 'mm', -5000, 5000, 0.1, 'local-c')) : ''}`);
    }
    if (K.isElastic(e)) geometry = elasticGeometry(e);
    else geometry += section('Hmotnosť a zotrvačnosť · odhad', `${field('Hmotnosť telesa', 'mass', e.mass ?? 1, 'kg', 0, 100000, 0.1, 'element')}${field('Moment zotrvačnosti (0 = odhad)', 'inertia', e.inertia || 0, 'kg·m²', 0, 1000000, 0.0001, 'element')}<button class="button button-secondary full-width" data-action="edit-com">Nastaviť ťažisko telesa</button><p class="section-description">Bez vlastného ťažiska sa použije stred A–B, čap alebo vozík C. Zotrváčnosť sa odhadne ako tenká doska / tyč.</p>`);
    if (e.primary) geometry += `<div class="inspector-note">${icon('lock', 15)}<p>Tento model používa parametrický solver. Pre voľnú zmenu tvarov, polôh a väzieb vytvorte samostatnú kópiu.</p></div><button class="button button-secondary full-width" data-action="make-editable">${icon('copy', 14)}Vytvoriť voľnú editačnú kópiu</button>`;
    if (state.project.source?.note) geometry += `<div class="inspector-note">${icon('warning', 15)}<p>${escape(state.project.source.note)}</p></div>`;
    const joints = state.project.connections.filter((j) => j.a.elementId === e.id || j.b.elementId === e.id);
    const jointContent = `<div class="selected-joints">${joints.length ? joints.map((j) => `<div class="selected-joint">${icon('link', 16)}<div><button class="joint-edit" data-action="edit-joint" data-id="${escape(j.id)}"><strong>${escape(j.name)}</strong></button><span>${j.builtin ? 'Súčasť riadeného mechanizmu' : escape(E.constraintNames[j.type || 'revolute'])}</span></div>${j.builtin ? icon('lock', 11) : ib('trash', 'delete-joint', 'Odstrániť väzbu', false, `data-id="${escape(j.id)}"`)}</div>`).join('') : '<p class="section-description">Prvok zatiaľ nemá žiadne kĺbové väzby.</p>'}<button class="button button-secondary full-width" data-action="new-joint">${icon('link', 16)}Pridať / nastaviť väzbu</button></div>`;
    const pose = selectedPose();
    container.innerHTML = `
      <div class="inspector-selection"><span class="selection-icon ${e.type}">${icon(typeIcons[e.type], 28)}</span><div><h2>${escape(e.name)}</h2><span class="selection-type">${escape(typeNames[e.type])}</span></div>${ib('dots', 'element-menu', 'Možnosti vybraného prvku')}</div>
      <div class="inspector-tabs"><button data-action="inspector-geometry" class="${state.inspectorTab === 'geometry' ? 'is-active' : ''}">Geometria</button><button data-action="inspector-joints" class="${state.inspectorTab === 'joints' ? 'is-active' : ''}">Väzby <span>${joints.length}</span></button></div>
      <div class="inspector-body">${state.inspectorTab === 'geometry' ? geometry : jointContent}
        ${section('Aktuálny stav', `<div class="live-properties"><div><span>Poloha X</span><strong id="live-x">${fmt(pose?.a.x)} <small>mm</small></strong></div><div><span>Poloha Y</span><strong id="live-y">${fmt(pose?.a.y)} <small>mm</small></strong></div><div class="highlight"><span>Uhol natočenia</span><strong id="live-angle">${fmt(pose?.angle)}<small>°</small></strong></div></div>`, '<span class="section-live-dot"></span>')}
        ${section('Trajektória', `${isDoubleDrawer() ? doubleTraceControls() : ''}<label class="check-row"><input id="trace-selected" type="checkbox"${state.trace && state.traceMode === 'single' && state.traceRef.elementId === e.id ? ' checked' : ''}/><span>Sledovať len bod tohto prvku</span></label><label class="property-field"><span>Referenčný bod</span><select class="property-select" id="trace-point">${['a', ...(e.type !== 'bearing' ? ['b'] : []), ...(pose?.c ? ['c'] : [])].map((point) => `<option value="${point}"${state.traceRef.elementId === e.id && state.traceRef.point === point ? ' selected' : ''}>${e.type === 'panel' && !isDoubleDrawer() ? ({ a: 'B · otočný čap', b: 'C · koniec čela', c: 'A · vodiace ložisko' })[point] : ({ a: 'Začiatok / čap', b: 'Koniec / päta čela', c: 'Pomocný bod / ložisko A' })[point]}</option>`).join('')}</select></label><button class="button button-secondary full-width" data-action="save-trace">Uložiť / upraviť trajektóriu</button>`)}
        ${section('Kóty a uložené trajektórie', `<button class="button button-secondary full-width" data-action="new-dimension">Pridať kótu medzi uzlami</button>${state.project.dimensions.map((d) => `<div class="record-row"><button data-action="edit-dimension" data-id="${escape(d.id)}">${escape(d.name || 'Kóta')} · ${fmt(E.dimensionValue(state.result, d), 2)} ${d.type === 'angle' ? '°' : 'mm'}</button>${ib('trash', 'delete-dimension', 'Odstrániť kótu', false, `data-id="${escape(d.id)}"`)}</div>`).join('')}${state.project.trajectories.map((t) => `<div class="record-row"><button data-action="edit-trace" data-id="${escape(t.id)}">${escape(t.name)}</button>${ib('trash', 'delete-trace', 'Odstrániť trajektóriu', false, `data-id="${escape(t.id)}"`)}</div>`).join('')}`)}
        <div id="inspector-warning" class="inspector-warning"${!state.result.blocked ? ' hidden' : ''}>${icon('warning', 16)}<span>${escape(state.result.issues[0] || '')}</span></div>
      </div>
      <div class="inspector-footer"><button class="button button-secondary" data-action="duplicate">${icon('copy', 15)}Duplikovať</button>${!e.primary ? ib('trash', 'delete', 'Odstrániť vybraný prvok') : '<span class="bound-tag">' + icon('link', 13) + 'Viazaný prvok</span>'}</div>
    `;
  }

  const pathD = (points) => points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(' ');
  function line(a, b, attrs = '') { return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" ${attrs}/>`; }
  function panelPolygon(pose, width) {
    const dx = pose.b.x - pose.a.x, dy = pose.b.y - pose.a.y, l = Math.hypot(dx, dy) || 1;
    const ox = -dy * width / (2 * l), oy = dx * width / (2 * l);
    return `${pose.a.x + ox},${pose.a.y + oy} ${pose.b.x + ox},${pose.b.y + oy} ${pose.b.x - ox},${pose.b.y - oy} ${pose.a.x - ox},${pose.a.y - oy}`;
  }
  function node(id, key, point, label = '', active = false) {
    return `<g data-element="${escape(id)}" data-point="${key}" class="joint-node${active ? ' active' : ''}" role="button" aria-label="Uzol ${escape(label || key)}">
      <circle cx="${point.x}" cy="${point.y}" r="12" fill="transparent" stroke="none"/>
      <circle cx="${point.x}" cy="${point.y}" r="5" fill="#fff" stroke="${active ? '#d9952b' : '#556471'}" stroke-width="1.7"/>
      <circle cx="${point.x}" cy="${point.y}" r="1.65" fill="${active ? '#bd7c1f' : '#556471'}" stroke="none"/>
      ${label ? `<text x="${point.x + 11}" y="${point.y - 9}" class="node-label">${escape(label)}</text>` : ''}
    </g>`;
  }
  function dimHorizontal(x1, x2, y, from, label, color = '#9ba7b1') {
    return `<g class="dimension" fill="${color}" stroke="${color}" stroke-width="0.75"><path d="M${x1} ${from}V${y + 5}M${x2} ${from}V${y + 5}" stroke-dasharray="2 3"/><path d="M${x1} ${y}H${x2}"/><path d="m${x1} ${y} 5-2v4Zm${x2} ${y}-5-2v4Z" stroke="none"/><text x="${(x1 + x2) / 2}" y="${y - 7}" text-anchor="middle" stroke="none" class="dimension-label">${escape(label)}</text></g>`;
  }
  function groundGlyph(point) {
    return `<g fill="none" stroke="#81909c" stroke-width="1.5"><path d="M${point.x} ${point.y}v14m-12 0h24m-20 0-5 6m13-6-5 6m13-6-5 6"/></g>`;
  }

  function drawDoubleDrawer(e, pose, selected, bad) {
    const p = state.project.parameters;
    const stroke = (color) => bad ? '#df5e59' : selected ? '#bc8532' : color;
    if (e.role === 'frame') {
      const top = p.tableY - p.frameHeight, frontBottom = p.tableY - p.frontOpening;
      return `<path d="M${p.frameLength + 8} ${frontBottom}V${top - 8}H-8V${p.tableY}H0V${top}H${p.frameLength}V${frontBottom}Z" fill="#e7f3e8" stroke="${stroke('#6a9b76')}" stroke-width="1.4"/><text x="${p.frameLength / 2}" y="${top - 23}" text-anchor="middle" class="part-label">PEVNÝ KORPUS · ODHAD</text>`;
    }
    if (e.role === 'table') return `${pose.rects.map((rect) => `<rect x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}" fill="${bad ? '#f4c6c4' : '#e0e5e7'}" stroke="${stroke('#49535a')}" stroke-width="2"/>`).join('')}<text x="18" y="${p.tableY + p.tableThickness + 19}" class="part-label">PLATFORMA STOLA · FIX</text><text x="${(p.cutoutStart + p.cutoutEnd) / 2}" y="${p.tableY + p.tableThickness + 19}" text-anchor="middle" class="part-sublabel">Pevný výrez · odhad pre celý zdvih</text>`;
    if (e.role === 'stop') return `<rect x="${pose.a.x - 3}" y="${pose.a.y}" width="6" height="${pose.b.y - pose.a.y}" fill="#fff" stroke="${stroke('#49535a')}" stroke-width="2"/><text x="${pose.a.x - 10}" y="${pose.a.y - 12}" text-anchor="end" class="part-sublabel">Zadná opora</text>`;
    if (e.role === 'carrier') return `<path d="M${pose.a.x} ${p.drawerY}H${pose.b.x - 6}V${p.drawerY - 38}H${pose.b.x}V${p.drawerY + p.drawerHeight}H${pose.a.x}Z" fill="#e5f0d7" fill-opacity=".65" stroke="${stroke('#95af51')}" stroke-width="1.5"/><text x="${(pose.a.x + pose.b.x) / 2}" y="${p.drawerY - 10}" text-anchor="middle" class="part-label">ZÁSUVKA · POHYBLIVÁ</text>`;
    if (['guide1', 'guide2', 'rearSlot'].includes(e.role)) {
      const width = e.role === 'rearSlot' ? 8 : p.slotWidth;
      const color = e.role === 'guide1' ? '#d2b62a' : '#d69d43', fill = e.role === 'guide1' ? '#f7e89a' : '#f8ddb0';
      return `<path d="${pathD(pose.path)}" fill="none" stroke="${bad ? '#f4c6c4' : fill}" stroke-width="${width + 9}" stroke-linecap="round" stroke-linejoin="round"/><path d="${pathD(pose.path)}" fill="none" stroke="${stroke(color)}" stroke-width="${width + 2}" stroke-linecap="round" stroke-linejoin="round"/><path d="${pathD(pose.path)}" fill="none" stroke="#fffdf5" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    if (e.role === 'rocker') return `${line(pose.a, pose.b, `stroke="${stroke('#7193c0')}" stroke-width="12" stroke-linecap="round"`)}${line(pose.a, pose.b, 'stroke="#e5edf6" stroke-width="7" stroke-linecap="round"')}<text x="${(pose.a.x + pose.b.x) / 2}" y="${(pose.a.y + pose.b.y) / 2 - 17}" text-anchor="middle" class="arm-label">Tuhé rameno · ${fmt(p.armLength)} mm</text>`;
    if (e.role === 'bracket') return `<polygon points="${pose.a.x},${pose.a.y} ${pose.b.x},${pose.b.y} ${pose.c.x},${pose.c.y}" fill="#f7dcbb" fill-opacity=".35" stroke="${stroke('#d4a266')}" stroke-width="2.3" stroke-linejoin="round"/>`;
    if (e.role === 'front') return `<polygon points="${panelPolygon(pose, p.panelThickness)}" fill="#f5d8d0" stroke="${stroke('#c87567')}" stroke-width="1.8" stroke-linejoin="round"/><text x="${pose.b.x + 13}" y="${pose.b.y + 10}" class="angle-label">${fmt(pose.angle)}°</text>`;
    if (['pinA', 'pinB', 'rearPin'].includes(e.role)) {
      const r = e.role === 'rearPin' ? 4 : p.bearingRadius;
      return `<circle cx="${pose.a.x}" cy="${pose.a.y}" r="${r + 2}" fill="#fff" stroke="${stroke('#688ab3')}" stroke-width="1.6"/><circle cx="${pose.a.x}" cy="${pose.a.y}" r="${r * 0.55}" fill="#dde9f4" stroke="${stroke('#688ab3')}" stroke-width=".8"/>`;
    }
    return '';
  }

  function drawElement(e, pose) {
    if (!pose || !e.visible) return '';
    const p = state.project.parameters, selected = e.id === state.selected, bad = state.result.collisions.includes(e.id) || state.result.invalid.includes(e.id);
    const color = bad ? '#df5e59' : selected ? '#d99735' : e.type === 'slot' ? '#6a8a89' : '#798997';
    let body = '';
    if (K.isElastic(e)) {
      body = drawElastic(e, pose, bad ? '#df5e59' : selected ? '#d99735' : e.type.startsWith('spring-') ? '#6590b3' : '#a4779f');
    } else if (pose.outline?.length) {
      body = `<polygon points="${pose.outline.map((v) => `${v.x},${v.y}`).join(' ')}" fill="${e.type === 'ground' ? '#dfe7ec' : '#f2cc91'}" fill-opacity=".65" stroke="${color}" stroke-width="1.8"/>`;
      if (e.type === 'ground') body += groundGlyph(pose.a);
    } else if (e.primary && isDoubleDrawer()) {
      body = drawDoubleDrawer(e, pose, selected, bad);
    } else if (e.primary && state.project.kind === 'drawer' && e.type === 'ground') {
      const top = p.pivotY - p.frameHeight;
      body = `<path d="M${p.frameLength - 18} ${top - 12}H-12V${p.pivotY + 26}H${p.frameLength - 18}v-12H0V${top}H${p.frameLength - 18}Z" fill="url(#frame-hatch)" stroke="${bad ? '#df5e59' : selected ? '#d99735' : '#b1bdc7'}" stroke-width="1.4"/>
        <path d="M${p.frameLength - 18} ${top}v${p.frameHeight + 14}" fill="none" stroke="#b9c3cb" stroke-dasharray="4 5" stroke-width="1"/>
        <text x="${p.frameLength / 2 - 30}" y="${top - 24}" class="part-label">PEVNÝ KORPUS</text><text x="${p.frameLength / 2 - 30}" y="${top - 11}" class="part-sublabel">${fmt(p.frameLength)} mm</text>
        ${groundGlyph({ x: 35, y: p.pivotY + 27 })}${groundGlyph({ x: p.frameLength - 55, y: p.pivotY + 27 })}`;
    } else if (e.type === 'slot') {
      body = `<path d="${pathD(pose.path)}" fill="none" stroke="${bad ? '#f5c5c3' : '#d9e6e3'}" stroke-width="${(e.primary ? p.slotWidth : e.slotWidth) + 18}" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${pathD(pose.path)}" fill="none" stroke="${selected ? '#c8913b' : bad ? '#df5e59' : '#8fa9a4'}" stroke-width="${(e.primary ? p.slotWidth : e.slotWidth) + 2}" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${pathD(pose.path)}" fill="none" stroke="#f4f8f7" stroke-width="${e.primary ? p.slotWidth : e.slotWidth}" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${pathD(pose.path)}" fill="none" stroke="#8ba39c" stroke-width="0.8" stroke-dasharray="3 4"/>`;
      if (e.primary && state.project.kind === 'drawer') {
        const mid = pose.path[Math.floor(pose.path.length * 0.57)];
        body += `<path d="M${mid.x} ${mid.y - 17}v-25h40" stroke="#98ada5" stroke-width="0.8" fill="none"/><text x="${mid.x + 45}" y="${mid.y - 39}" class="slot-label">Zakrivená kulisa</text>`;
      }
    } else if (e.type === 'rail') {
      if (e.primary && state.project.kind === 'drawer') {
        body = `<rect x="0" y="${p.pivotY - 9}" width="${p.frameLength}" height="18" rx="3" fill="#d9e0e5" stroke="#a5b3bf" stroke-width="1"/>
          <path d="M6 ${p.pivotY}H${p.frameLength - 6}" stroke="#b0bcc6" stroke-width="1.5"/>
          <rect x="${state.motion}" y="${p.pivotY - 6}" width="${p.frameLength + p.panelOffsetX}" height="12" rx="2" fill="${bad ? '#f4c6c4' : '#e7c18b'}" stroke="${color}" stroke-width="1.2"/>
          <path d="M${state.motion + 9} ${p.pivotY - 1}H${pose.b.x - 9}" stroke="#fcf1dc" stroke-width="1.4"/>
          ${[0.18, 0.48, 0.8].map((t) => `<circle cx="${state.motion + t * (p.frameLength + p.panelOffsetX)}" cy="${p.pivotY}" r="2.2" fill="#b58548"/>`).join('')}
          <text x="${state.motion + p.frameLength / 2 - 45}" y="${p.pivotY + 31}" class="part-label rail-label">LINEÁRNY VÝSUV</text>`;
      } else body = `${line(pose.a, pose.b, `stroke="#c4d0d9" stroke-width="22" stroke-linecap="round"`)}${line(pose.a, pose.b, `stroke="${color}" stroke-width="1" stroke-dasharray="5 4"`)}<rect x="${(pose.c || pose.a).x - 12}" y="${(pose.c || pose.a).y - 15}" width="24" height="30" rx="3" fill="#e7c18b" stroke="#b28649"/>`;
    } else if (e.type === 'panel') {
      const width = e.primary ? p.panelThickness : e.width;
      if (selected) body += `<polygon points="${panelPolygon(pose, width + 10)}" fill="#eab252" opacity="0.1"/>`;
      body += `<polygon points="${panelPolygon(pose, width)}" fill="${bad ? '#f5c6c1' : '#f2cc91'}" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"/>
        ${line(pose.a, pose.b, 'stroke="#fff8e9" stroke-width="1.2"')}`;
      if (e.primary) {
        const a = pose.a;
        const r = 35, end = K.along(a, r, pose.angle);
        body += `<path d="M${a.x + r} ${a.y}A${r} ${r} 0 ${Math.abs(pose.angle) > 180 ? 1 : 0} ${pose.angle < 0 ? 1 : 0} ${end.x} ${end.y}" fill="none" stroke="#d5a24f" stroke-width="0.9"/>
          <text x="${a.x + 38}" y="${a.y - 14}" class="angle-label">${fmt(pose.angle)}°</text>
          <text x="${pose.b.x - 44}" y="${pose.b.y - 24}" class="panel-label">SKLÁPACIE ČELO</text>`;
      }
    } else if (e.type === 'bearing') {
      const r = e.primary ? (e.role === 'pivot' ? 5.5 : p.bearingRadius) : e.radius;
      body = `<circle cx="${pose.a.x}" cy="${pose.a.y}" r="${r + 2}" fill="#f8fbfa" stroke="${color}" stroke-width="1.5"/><circle cx="${pose.a.x}" cy="${pose.a.y}" r="${r * 0.58}" fill="#d9e4df" stroke="${color}" stroke-width="0.85"/><circle cx="${pose.a.x}" cy="${pose.a.y}" r="1.8" fill="#657d73"/>`;
    } else if (e.type === 'ground') {
      body = `${line(pose.a, pose.b, `stroke="${color}" stroke-width="8" stroke-linecap="round"`)}${groundGlyph(pose.a)}${groundGlyph(pose.b)}`;
    } else {
      const width = e.width;
      body = `${line(pose.a, pose.b, `stroke="${bad ? '#df5e59' : selected ? '#d69c44' : e.role === 'coupler' ? '#6d9b95' : '#97a9b9'}" stroke-width="${width + 3}" stroke-linecap="round"`)}
        ${line(pose.a, pose.b, `stroke="${e.role === 'coupler' ? '#d4e6e0' : '#e3eaf0'}" stroke-width="${Math.max(2, width - 2)}" stroke-linecap="round"`)}
        <text x="${(pose.a.x + pose.b.x) / 2}" y="${(pose.a.y + pose.b.y) / 2 - 14}" text-anchor="middle" class="part-label">${escape(e.name)}</text>`;
    }
    return `<g data-element="${escape(e.id)}" class="mechanism-element ${e.type}${selected ? ' selected' : ''}"><title>${escape(e.name)}</title>${body}</g>`;
  }

  function renderScene() {
    const svg = $('#mechanism-canvas');
    if (!svg || !state.view || !state.result) return;
    const p = state.project.parameters, elements = state.project.elements, result = state.result, view = state.view;
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
    svg.classList.toggle('pan-mode', state.tool === 'pan');
    svg.classList.toggle('connect-mode', state.tool === 'connect');
    let content = `<defs>
      <pattern id="small-grid" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="var(--canvas)"/><path d="M20 0H0V20" fill="none" stroke="var(--grid-small)" stroke-width="0.7"/></pattern>
      <pattern id="large-grid" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="url(#small-grid)"/><path d="M100 0H0V100" fill="none" stroke="var(--grid-large)" stroke-width="0.9"/></pattern>
      <pattern id="frame-hatch" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="#e4e9ed"/><path d="m-1 1 8 8m-1-9 8 8" stroke="#cbd4db" stroke-width="0.8"/></pattern>
      <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e3bc77" stop-opacity=".25"/><stop offset="1" stop-color="#e3bc77" stop-opacity="0"/></linearGradient>
    </defs><rect x="${view.x}" y="${view.y}" width="${view.width}" height="${view.height}" fill="${state.grid ? 'url(#large-grid)' : 'var(--canvas)'}"/>`;
    if (!elements.length) content += `<g class="empty-canvas"><circle cx="${view.x + view.width / 2}" cy="${view.y + view.height / 2 - 28}" r="24" fill="#eef1f4"/><path d="M${view.x + view.width / 2 - 8} ${view.y + view.height / 2 - 28}h16m-8-8v16" stroke="#9ca9b3" stroke-width="1.8"/><text x="${view.x + view.width / 2}" y="${view.y + view.height / 2 + 20}" text-anchor="middle" class="empty-canvas-title">Vytvorte svoj prvý mechanizmus</text><text x="${view.x + view.width / 2}" y="${view.y + view.height / 2 + 41}" text-anchor="middle" class="empty-canvas-text">Pretiahnite prvky z knižnice alebo vyberte šablónu</text></g>`;
    if (state.ghosts && elements.length) {
      for (const phase of K.projectPhases(state.project)) {
        const sample = K.solve(state.project, phase.motion, { profile: state.profile, collisions: false });
        for (const e of elements.filter((e) => ['panel', 'link'].includes(e.type))) {
          const pose = sample.poses[e.id];
          if (!pose || !e.visible) continue;
          content += `<g opacity=".2" pointer-events="none">${line(pose.a, pose.b, 'stroke="#a9b4be" stroke-width="12" stroke-linecap="round"')}${line(pose.a, pose.b, 'stroke="#7f8c98" stroke-width="1" stroke-dasharray="5 4"')}</g>`;
        }
      }
    }
    for (const joint of state.project.connections.filter((j) => !j.builtin)) {
      const pa = result.poses[joint.a.elementId], pb = result.poses[joint.b.elementId];
      let a = pa?.[joint.a.point], b = pb?.[joint.b.point];
      if (joint.a.point === 'curve' && b && pa?.path) a = K.nearestOnPath(b, pa.path);
      if (joint.b.point === 'curve' && a && pb?.path) b = K.nearestOnPath(a, pb.path);
      if (a && b) content += line(a, b, `stroke="${K.distance(a, b) > K.TOLERANCE ? '#de6a60' : '#8eafa3'}" stroke-width="1.2" stroke-dasharray="4 3"`);
    }
    const order = { ground: 0, slot: 1, rail: 2, link: 3, panel: 4, bearing: 5, 'spring-compression': 4, 'spring-extension': 4, 'piston-push': 4, 'piston-pull': 4 };
    for (const e of [...elements].sort((a, b) => order[a.type] - order[b.type])) content += drawElement(e, result.poses[e.id]);
    if (state.trace) {
      for (const reference of traceReferences()) {
        const space = reference.space || state.traceSpace;
        const origin = space === 'carrier' ? result.referenceOrigin : null;
        const displayPoint = (point) => origin ? { x: point.x + origin.x, y: point.y + origin.y } : point;
        let segment = [];
        const paths = [];
        for (const sample of state.samples) {
          const point = K.tracePoint(sample, reference, space);
          if (!point || sample.blocked) { if (segment.length > 1) paths.push(segment); segment = []; }
          else segment.push(displayPoint(point));
        }
        if (segment.length > 1) paths.push(segment);
        content += paths.map((points) => `<path data-trace="${escape(reference.label)}" data-reference="${space}" d="${pathD(points)}" fill="none" stroke="${reference.color}" stroke-width="1.5" stroke-dasharray="3 4" opacity=".9" pointer-events="none"/>`).join('');
        const point = K.point(result, reference);
        if (point) content += `<g pointer-events="none"><circle cx="${point.x}" cy="${point.y}" r="9" fill="${reference.color}" fill-opacity=".1" stroke="${reference.color}" stroke-width="1"/><circle cx="${point.x}" cy="${point.y}" r="2.8" fill="${reference.color}"/><text x="${point.x + 13}" y="${point.y + 16}" class="trace-label" style="fill:${reference.color}">${isDoubleDrawer() ? escape(reference.label) : `Trajektória ${escape(reference.label)}`}</text></g>`;
      }
    }
    if (state.dimensions && isDoubleDrawer()) {
      content += dimHorizontal(0, p.frameLength, p.tableY + 58, p.tableY + p.tableThickness, `≈ ${fmt(p.frameLength)} mm · korpus`);
      content += dimHorizontal(p.frameLength, p.frameLength + p.travelMax - p.travelMin, p.tableY + 95, p.tableY + p.tableThickness, `≈ ${fmt(p.travelMax - p.travelMin)} mm · zdvih`, '#b49768');
    }
    if (state.dimensions && state.project.kind === 'drawer') {
      content += dimHorizontal(0, p.frameLength, p.pivotY + 61, p.pivotY + 30, `${fmt(p.frameLength)} mm · korpus`);
      content += dimHorizontal(p.frameLength + p.travelMin, p.frameLength + p.travelMax, p.pivotY + 99, p.pivotY + 39, `Zdvih ${fmt(p.travelMax - p.travelMin)} mm`, '#b49769');
      const panel = result.poses['panel-1'];
      if (panel) content += `<text x="${(panel.a.x + panel.b.x) / 2 - 17}" y="${(panel.a.y + panel.b.y) / 2}" class="panel-dimension" text-anchor="end">${fmt(p.panelLength)} mm</text>`;
    }
    if (state.dimensions) for (const dimension of state.project.dimensions.filter((d) => d.visible)) {
      const a = E.resolvePoint(result, dimension.a), b = E.resolvePoint(result, dimension.b);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy) || 1, offset = dimension.offset;
      let p1 = { x: a.x - dy / length * offset, y: a.y + dx / length * offset }, p2 = { x: b.x - dy / length * offset, y: b.y + dx / length * offset };
      if (dimension.type === 'horizontal') { p1 = { x: a.x, y: Math.max(a.y, b.y) + offset }; p2 = { x: b.x, y: p1.y }; }
      if (dimension.type === 'vertical') { p1 = { x: Math.max(a.x, b.x) + offset, y: a.y }; p2 = { x: p1.x, y: b.y }; }
      content += `<g data-dimension="${escape(dimension.id)}" class="editable-dimension" stroke="#7288a4" stroke-width=".8" fill="#7288a4">${line(a, p1, 'stroke-dasharray="2 3"')}${line(b, p2, 'stroke-dasharray="2 3"')}${line(p1, p2)}<circle cx="${p1.x}" cy="${p1.y}" r="2"/><circle cx="${p2.x}" cy="${p2.y}" r="2"/><text x="${(p1.x + p2.x) / 2}" y="${(p1.y + p2.y) / 2 - 5}" text-anchor="middle" stroke="none" class="dimension-label">${escape(dimension.name ? `${dimension.name}: ` : '')}${fmt(E.dimensionValue(result, dimension), 2)} ${dimension.type === 'angle' ? '°' : 'mm'}${dimension.constraintId || dimension.control ? ' · riadiaca' : ''}</text></g>`;
    }
    if (state.project.kind === 'drawer') {
      const panel = result.poses['panel-1'];
      if (panel && elements.some((e) => e.id === 'panel-1' && e.visible)) {
        content += node('panel-1', 'a', panel.a, 'B', state.selected === 'panel-1');
        content += node('panel-1', 'b', panel.b, 'C', true);
        content += node('panel-1', 'c', panel.c, 'A', state.selected === 'bearing-1');
      }
    } else if (isDoubleDrawer() && state.tool !== 'connect') {
      for (const [id, label] of [['bearing-1', 'A'], ['bearing-2', 'B'], ['rear-bearing', 'R']]) {
        if (elements.some((e) => e.id === id && e.visible)) content += node(id, 'a', result.poses[id].a, label, state.selected === id);
      }
      if (elements.some((e) => e.id === 'panel-1' && e.visible)) content += node('panel-1', 'b', result.poses['panel-1'].b, '', state.selected === 'panel-1');
    }
    for (const e of elements) {
      if (!e.visible || (e.primary && (state.project.kind === 'drawer' || isDoubleDrawer()) && state.tool !== 'connect')) continue;
      const pose = result.poses[e.id];
      if (!pose) continue;
      if (state.tool === 'connect' || ['link', 'ground'].includes(e.type) || e.id === state.selected) {
        for (const key of ['a', 'b', ...(pose.c ? ['c'] : [])]) {
          if (e.type === 'bearing' && key === 'b') continue;
          content += node(e.id, key, pose[key], state.tool === 'connect' ? `${typeCodes[e.type]} · ${key.toUpperCase()}` : '', e.id === state.selected);
        }
      }
    }
    if (state.mode === 'edit' && state.project.kind === 'drawer' && state.selected === 'slot-1' && ['bezier', 'spline'].includes(p.curveKind)) {
      const controls = state.project.controls || K.defaultControls(p);
      const positioned = controls.map((v) => ({ x: v.x + p.slotOffsetX, y: v.y + p.slotOffsetY }));
      content += `<path d="${pathD(positioned)}" fill="none" stroke="#94aaa3" stroke-width="0.9" stroke-dasharray="4 4"/>`;
      for (const [i, point] of positioned.entries()) content += `<g data-control="${i}" class="control-handle"><rect x="${point.x - 5}" y="${point.y - 5}" width="10" height="10" rx="2" fill="#fff" stroke="#639082" stroke-width="1.5"/><text x="${point.x + 9}" y="${point.y - 9}" class="node-label">P${i}</text></g>`;
    }
    const selected = currentElement();
    if (state.mode === 'edit' && selected?.type === 'slot' && !selected.primary) {
      const pose = result.poses[selected.id];
      const controls = selected.controls.map((v) => K.worldPoint({ ...pose, a: pose.controlOrigin || pose.a }, v));
      content += `<path d="${pathD(controls)}" fill="none" stroke="#a0b4a9" stroke-width="0.8" stroke-dasharray="4 4" pointer-events="none"/>`;
      controls.forEach((point, i) => {
        if (i % Math.ceil(controls.length / 64) && i !== controls.length - 1) return;
        content += `<g data-element-control="${i}" class="control-handle"><rect x="${point.x - 5}" y="${point.y - 5}" width="10" height="10" rx="2" fill="#fff" stroke="#719a86" stroke-width="1.5"/><text x="${point.x + 8}" y="${point.y - 8}" class="node-label">P${i}</text></g>`;
      });
    }
    if (state.mode === 'edit' && selected?.outline?.length && !selected.primary) {
      result.poses[selected.id].outline.forEach((point, i) => {
        content += `<g data-outline-control="${i}" class="control-handle"><rect x="${point.x - 5}" y="${point.y - 5}" width="10" height="10" fill="#fff" stroke="#d39a41" stroke-width="1.5"/></g>`;
      });
    }
    if (state.pendingJoint) {
      const pendingPose = result.poses[state.pendingJoint.elementId];
      const point = state.pendingJoint.point === 'curve' ? pendingPose?.path?.[Math.floor(pendingPose.path.length / 2)] : pendingPose?.[state.pendingJoint.point];
      if (point) content += `<circle cx="${point.x}" cy="${point.y}" r="10" fill="#e9b458" fill-opacity=".16" stroke="#d79a36" stroke-width="1.5" stroke-dasharray="3 3" pointer-events="none"/>`;
    }
    if (state.measure) {
      const { a, b } = state.measure;
      content += `${line(a, b, 'stroke="#7288a4" stroke-width="1.3" stroke-dasharray="4 3"')}<circle cx="${a.x}" cy="${a.y}" r="3" fill="#7288a4"/><circle cx="${b.x}" cy="${b.y}" r="3" fill="#7288a4"/><text x="${(a.x + b.x) / 2}" y="${(a.y + b.y) / 2 - 9}" text-anchor="middle" class="measure-label">${fmt(K.distance(a, b), 2)} mm</text>`;
    }
    svg.innerHTML = content;
    latestSVG = content;
    $('#zoom-value').textContent = `${Math.round(state.baseView.width / view.width * 100)}%`;
    const status = $('#scene-status');
    status.className = `scene-status${result.blocked ? ' blocked' : ''}`;
    status.innerHTML = `${icon(result.blocked ? 'warning' : 'check', 13)}<span>${state.mode === 'edit' ? 'Úprava geometrie · bez projekcie väzieb' : result.blocked ? 'Skontrolujte mechanizmus' : !elements.length ? 'Prázdny editor' : state.collisions ? 'Pohyb bez kolízií' : 'Kolízna kontrola vypnutá'}</span>`;
    status.title = result.issues.join('\n');
  }

  function traceLabel() {
    const e = state.project.elements.find((e) => e.id === state.traceRef.elementId);
    if (isDoubleDrawer()) {
      const labels = { pinA: { a: 'A' }, pinB: { a: 'B' }, rearPin: { a: 'R' }, front: { a: 'P', b: 'Č', c: 'A' }, bracket: { a: 'B', b: 'P', c: 'A' } };
      if (labels[e?.role]?.[state.traceRef.point]) return labels[e.role][state.traceRef.point];
    }
    return e?.type === 'panel' ? ({ a: 'B', b: 'C', c: 'A' })[state.traceRef.point] : state.traceRef.point.toUpperCase();
  }

  function graphPoint(sample, index, min, max, key = 'angle') {
    return { x: 43 + index / (state.samples.length - 1) * 717, y: 66 - (sample[key] - min) / (max - min || 1) * 53 };
  }
  function renderGraph() {
    const graph = $('#motion-graph');
    if (!graph) return;
    if (state.graphMode === 'force') { renderForceGraph(); return; }
    const angles = state.samples.flatMap((s) => isDoubleDrawer() ? [s.angle, s.secondaryAngle] : [s.angle]);
    const min = Math.floor(Math.min(0, ...angles) / 15) * 15, max = Math.max(15, Math.ceil(Math.max(...angles) / 15) * 15);
    state.graphScale = { min, max };
    const points = state.samples.map((s, i) => graphPoint(s, i, min, max));
    const range = K.driveRange(state.project);
    let markup = `<defs><linearGradient id="motion-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#dbb574" stop-opacity=".18"/><stop offset="1" stop-color="#dbb574" stop-opacity=".015"/></linearGradient></defs>`;
    if (isDoubleDrawer()) {
      const x = 43 + state.project.parameters.releaseTravel / (range.max - range.min) * 717;
      markup += `<rect x="43" y="13" width="${x - 43}" height="53" fill="#faf4e8"/><line x1="${x}" x2="${x}" y1="13" y2="66" stroke="#b5bec6" stroke-dasharray="3 4"/><text x="${x + 6}" y="20" class="graph-tick">Sklopené → posuv</text>`;
    }
    for (let i = 0; i <= 3; i++) {
      const y = 66 - i / 3 * 53;
      markup += `<line x1="43" x2="760" y1="${y}" y2="${y}" stroke="#e8ecef" stroke-dasharray="${i === 0 ? '' : '3 4'}" stroke-width="1"/><text x="30" y="${y + 3}" text-anchor="end" class="graph-tick">${fmt(K.lerp(min, max, i / 3), 0)}°</text>`;
    }
    for (let i = 0; i <= 6; i++) {
      const x = 43 + i / 6 * 717;
      markup += `<text x="${x}" y="85" text-anchor="middle" class="graph-tick">${fmt(K.lerp(range.min, range.max, i / 6), 0)}</text>`;
    }
    markup += `<path d="${pathD(points)}L760,66L43,66Z" fill="url(#motion-fill)" stroke="none"/><path d="${pathD(points)}" fill="none" stroke="#c7984d" stroke-width="2" stroke-linejoin="round"/>`;
    if (isDoubleDrawer()) markup += `<path data-series="arm" d="${pathD(state.samples.map((s, i) => graphPoint(s, i, min, max, 'secondaryAngle')))}" fill="none" stroke="#7193c0" stroke-width="1.7" stroke-linejoin="round"/>`;
    for (let i = 0; i < state.samples.length; i++) if (state.samples[i].blocked) markup += `<rect x="${points[i].x - 2.5}" y="13" width="6" height="53" fill="#e9766d" opacity=".08"/>`;
    markup += '<g id="graph-cursor"></g>';
    graph.innerHTML = markup;
    $('#graph-legend').innerHTML = isDoubleDrawer() ? 'Čelo <span class="legend-line arm-legend"></span> Rameno' : state.project.kind === 'drawer' ? 'Uhol čela' : state.project.kind === 'custom' ? 'Uhol výstupu' : 'Uhol výstupného člena';
    graph.setAttribute('aria-label', isDoubleDrawer() ? 'Graf uhla čela a modrého ramena voči posuvu zásuvky, s prechodom na spoločný posuv.' : 'Graf uhla výstupu voči polohe pohonu.');
    $('#graph-x-label').textContent = range.unit === 'mm' ? 'Posuv (mm)' : 'Uhol pohonu (°)';
    $('#graph-unit').textContent = 'Uhol (°)';
    $('#trace-name').textContent = isDoubleDrawer() && state.traceMode === 'bearings' ? 'Ložiská A + B' : `Bod ${traceLabel() || 'C'}`;
    $('[data-action="trace-pick"]').classList.toggle('is-off', !state.trace);
    updateGraphCursor();
  }

  function updateGraphCursor() {
    const cursor = $('#graph-cursor');
    if (!cursor || !state.graphScale) return;
    if (state.graphMode === 'force') { updateForceCursor(); return; }
    const r = K.driveRange(state.project), t = (state.motion - r.min) / (r.max - r.min);
    const point = graphPoint(state.result, t * (state.samples.length - 1), state.graphScale.min, state.graphScale.max);
    point.y = K.clamp(point.y, 5, 70);
    cursor.innerHTML = `<line x1="${point.x}" x2="${point.x}" y1="7" y2="68" stroke="#c5a46e" stroke-width="1" stroke-dasharray="3 3"/><circle cx="${point.x}" cy="${point.y}" r="4.2" fill="#fff" stroke="#c7984d" stroke-width="2"/><rect x="${K.clamp(point.x - 23, 40, 714)}" y="${K.clamp(point.y - 22, 0, 44)}" width="46" height="16" rx="4" fill="#f9f2e7"/><text x="${K.clamp(point.x, 63, 737)}" y="${K.clamp(point.y - 11, 11, 55)}" text-anchor="middle" class="graph-value">${fmt(state.result.angle)}°</text>`;
  }

  function renderForceGraph() {
    const graph = $('#motion-graph'), range = K.driveRange(state.project);
    if (!state.forceContext && !prepareForces()) {
      graph.innerHTML = `<text x="400" y="42" text-anchor="middle" class="graph-tick">${escape(state.forceError)}</text>`;
      $('#graph-legend').textContent = 'Neurčený model síl'; return;
    }
    const values = state.forceCurve.map((s) => s.handForce), min = Math.min(0, ...values), max = Math.max(1, ...values);
    state.graphScale = { min, max };
    const points = state.forceCurve.map((sample, i) => ({ x: 43 + i / (values.length - 1) * 717, y: 66 - (sample.handForce - min) / (max - min) * 53 }));
    graph.innerHTML = `${[0, 1, 2, 3].map((i) => `<line x1="43" x2="760" y1="${66 - i / 3 * 53}" y2="${66 - i / 3 * 53}" stroke="#dce3e8" stroke-dasharray="3 4"/><text x="34" y="${69 - i / 3 * 53}" text-anchor="end" class="graph-tick">${fmt(K.lerp(min, max, i / 3), 1)}</text>`).join('')}<path d="${pathD(points)}" fill="none" stroke="#b9697c" stroke-width="2"/>${[0, 1, 2, 3, 4, 5, 6].map((i) => `<text x="${43 + i / 6 * 717}" y="85" text-anchor="middle" class="graph-tick">${fmt(K.lerp(range.min, range.max, i / 6), 0)}</text>`).join('')}<g id="graph-cursor"></g>`;
    $('#graph-legend').textContent = 'Vyrovnávacia sila · odhad';
    $('#graph-unit').textContent = range.unit === '°' ? 'Moment (N·m)' : 'Sila (N)';
    $('#graph-x-label').textContent = range.unit === '°' ? 'Uhol pohonu (°)' : 'Posuv (mm)';
    graph.setAttribute('aria-label', 'Odhadová vyrovnávacia sila alebo moment pohonu v celom rozsahu.');
    updateForceCursor();
  }

  function updateForceCursor() {
    const cursor = $('#graph-cursor');
    if (!cursor || !state.forceContext) return;
    const range = K.driveRange(state.project), value = P.generalized(state.forceContext, state.motion);
    const x = 43 + (state.motion - range.min) / (range.max - range.min) * 717, y = K.clamp(66 - (value.handForce - state.graphScale.min) / (state.graphScale.max - state.graphScale.min) * 53, 5, 70);
    cursor.innerHTML = `<line x1="${x}" x2="${x}" y1="7" y2="68" stroke="#b9697c" stroke-dasharray="3 3"/><circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="#b9697c" stroke-width="2"/>`;
  }

  function renderPhases() {
    const range = K.driveRange(state.project);
    $('#phase-switcher').hidden = !state.project.elements.length;
    $('#phase-switcher').innerHTML = K.projectPhases(state.project).map(({ motion, name }, i) => `<button data-action="phase" data-value="${motion}" class="phase-button${Math.abs(state.motion - motion) < (range.max - range.min) / 30 ? ' is-active' : ''}"><span class="phase-number">0${i + 1}</span><span><strong>${escape(name)}</strong><small>${fmt(motion)} ${range.unit}</small></span></button>`).join('');
  }

  function updateMotion(updateProperties = true) {
    const range = K.driveRange(state.project), input = $('#motion-range'), exact = $('#motion-value');
    input.min = exact.min = range.min; input.max = exact.max = range.max;
    input.value = state.motion;
    input.style.setProperty('--range-progress', `${(state.motion - range.min) / (range.max - range.min) * 100}%`);
    if (document.activeElement !== exact) exact.value = state.motion.toFixed(1).replace(/\.0$/, '');
    $('#motion-label').textContent = range.label;
    input.setAttribute('aria-label', range.label);
    $('#motion-unit').textContent = range.unit;
    $('#motion-total').textContent = `${fmt(range.min)} – ${fmt(range.max)} ${range.unit}`;
    $('#range-min').textContent = range.unit === 'mm' ? 'Zatvorené' : '0°';
    $('#range-max').textContent = range.unit === 'mm' ? 'Otvorené' : '360°';
    const play = $('[data-action="play"]');
    play.disabled = !state.project.elements.length;
    play.innerHTML = icon(state.playing ? 'pause' : 'play', 17);
    play.setAttribute('aria-label', state.playing ? 'Pozastaviť simuláciu' : 'Spustiť simuláciu');
    play.title = `${state.playing ? 'Pozastaviť' : 'Spustiť'} simuláciu (medzerník)`;
    play.classList.toggle('playing', state.playing);
    $('#solver-dot').classList.toggle('warning', state.result.blocked);
    $('#solver-status').textContent = state.mode === 'edit' ? 'Editácia · väzby sa nevynucujú' : state.result.blocked ? `Obmedzenie · chyba ${fmt(state.result.residual, 2)} mm` : state.project.elements.length ? 'Väzby splnené' : 'Pripravený na nový model';
    $('#solver-meta').textContent = isDoubleDrawer() ? `${state.result.phaseLabel} · odhad` : `${state.project.connections.length} väzieb · ${state.project.kind === 'custom' ? 'vlastný model' : '1 stupeň voľnosti'}`;
    renderPhases(); updateGraphCursor();
    if (updateProperties) updateLiveProperties();
    const readout = $('#dynamics-readout');
    readout.hidden = state.project.simulation?.mode !== 'dynamic';
    if (!readout.hidden) {
      const dynamic = state.dynamic;
      readout.textContent = `ODHADOVÁ DYNAMIKA · t = ${fmt(dynamic?.time || 0, 2)} s · v = ${fmt((dynamic?.velocity || 0) / (state.forceContext?.scale || .001), 2)} ${range.unit}/s${dynamic?.reason ? ` · ${dynamic.reason}` : ''}`;
    }
  }

  function updateLiveProperties() {
    const pose = selectedPose();
    if ($('#live-x')) $('#live-x').innerHTML = `${fmt(pose?.a.x)} <small>mm</small>`;
    if ($('#live-y')) $('#live-y').innerHTML = `${fmt(pose?.a.y)} <small>mm</small>`;
    if ($('#live-angle')) $('#live-angle').innerHTML = `${fmt(pose?.angle)}<small>°</small>`;
    if ($('#live-force')) $('#live-force').textContent = `${fmt(state.result.forces?.find((f) => f.id === state.selected)?.magnitude || 0, 2)} N`;
    const warning = $('#inspector-warning');
    if (warning) { warning.hidden = !state.result.blocked; $('span', warning).textContent = state.result.issues[0] || ''; }
  }

  function setMotion(value, manual = true) {
    if (manual) { state.playing = false; state.dynamic = null; }
    const range = K.driveRange(state.project);
    state.motion = K.clamp(value, range.min, range.max);
    state.result = solveCurrent();
    if (state.dynamic && state.forceContext) {
      const value = P.generalized(state.forceContext, state.motion, state.dynamic.velocity);
      state.result.forces = P.forces(state.project, state.result, value.lengthRates);
    }
    if (state.playing && state.result.blocked) {
      state.playing = false;
      toast(`Simulácia zastavená: ${state.result.issues[0]}`, true);
    }
    renderScene(); updateMotion();
  }

  function updateHeader() {
    $('#project-name').textContent = state.project.name;
    $('#scene-name').textContent = state.project.name;
    $('#project-assumptions').hidden = !isDoubleDrawer();
    $('#canvas-area').classList.toggle('double-drawer-project', isDoubleDrawer());
    $('#save-status').innerHTML = `<i class="${state.dirty ? 'unsaved' : ''}"></i>${state.storageFailed ? 'Uložte cez export' : state.dirty ? 'Ukladá sa…' : state.saved ? 'Uložené lokálne' : 'Lokálny projekt'}`;
    document.title = `${state.project.name} — Kinematika`;
  }

  function updateToolbar() {
    try { localStorage.setItem(settingsKey, JSON.stringify(X.preferences(state))); } catch { /* Export includes settings if storage is unavailable. */ }
    for (const key of ['grid', 'dimensions', 'ghosts', 'trace', 'loop']) {
      const el = $(`[data-action="${key}"]`);
      if (el) { el.classList.toggle('is-active', state[key]); el.setAttribute('aria-pressed', state[key]); }
    }
    for (const tool of ['select', 'pan', 'connect', 'measure']) $(`[data-action="tool-${tool}"]`).classList.toggle('is-active', state.tool === tool);
    $('[data-action="undo"]').disabled = !state.history.length;
    $('[data-action="redo"]').disabled = !state.future.length;
    $('[data-action="view-editor"]').classList.toggle('is-active', !state.analysis);
    $('[data-action="view-analysis"]').classList.toggle('is-active', state.analysis);
    $('[data-action="view-editor"]').setAttribute('aria-pressed', !state.analysis);
    $('[data-action="view-analysis"]').setAttribute('aria-pressed', state.analysis);
    $('.center-workspace').classList.toggle('analysis-mode', state.analysis);
    for (const mode of ['edit', 'simulate']) {
      const button = $(`[data-action="mode-${mode}"]`);
      button.classList.toggle('is-active', state.mode === mode);
      button.setAttribute('aria-pressed', state.mode === mode);
    }
    $('[data-action="make-editable"]').hidden = state.project.kind === 'custom';
    $('#workspace').dataset.mode = state.mode;
    const instruction = $('#canvas-instruction');
    instruction.hidden = !['connect', 'measure'].includes(state.tool);
    instruction.textContent = state.tool === 'connect' ? state.pendingJoint ? 'Teraz kliknite na druhý uzlový bod. Esc zruší väzbu.' : 'Kliknite na dva uzlové body. Ložisko môžete spojiť aj s kulisou.' : 'Kliknite a potiahnite medzi dvoma bodmi na zmeranie vzdialenosti.';
  }

  function selectElement(id) {
    state.selected = id; state.inspectorTab = 'geometry'; state.analysis = false;
    renderTree(); renderInspector(); renderScene(); updateToolbar();
    if (window.innerWidth < 900) $('.inspector').classList.add('mobile-open');
  }

  function setTool(tool) {
    state.tool = tool; state.pendingJoint = null;
    if (tool !== 'measure') state.measure = null;
    updateToolbar(); renderScene();
  }

  function addElement(type, position) {
    if (!K.TYPES.includes(type)) return;
    if (state.project.elements.length >= 120) { toast('Projekt môže obsahovať najviac 120 prvkov.', true); return; }
    pushHistory();
    const offset = state.project.elements.filter((e) => !e.primary).length * 15;
    const point = position || { x: 130 + offset, y: state.project.kind === 'drawer' ? -20 : -80 };
    const e = K.makeElement(type, state.snap ? Math.round(point.x / 5) * 5 : point.x, state.snap ? Math.round(point.y / 5) * 5 : point.y);
    if (e.drive && (state.project.kind !== 'custom' || state.project.elements.some((v) => v.drive))) e.drive = false;
    const count = state.project.elements.filter((v) => v.type === type).length + 1;
    e.name = `${typeNames[type]} ${count}`;
    state.project.elements.push(e); state.selected = e.id; state.analysis = false; state.mode = 'edit'; state.playing = false;
    state.traceRef = { elementId: e.id, point: e.type === 'bearing' ? 'a' : 'b' };
    changed(false);
    toast(`${e.name} bol pridaný. Spojte jeho uzly nástrojom J.`);
  }

  function duplicateElement() {
    const e = currentElement(), pose = selectedPose();
    if (!e) return;
    if (state.project.elements.length >= 120) { toast('Projekt môže obsahovať najviac 120 prvkov.', true); return; }
    pushHistory();
    const clone = { ...K.copy(e), id: K.uid(), name: `${e.name} · kópia`, primary: false, role: '', locked: false, drive: false, slotId: '', x: (pose?.a.x ?? e.x) + 35, y: (pose?.a.y ?? e.y) - 35, angle: pose?.angle ?? e.angle, length: pose?.length || e.length };
    if (e.type === 'panel' && e.primary) { clone.width = state.project.parameters.panelThickness; clone.bearingOffset = state.project.parameters.bearingOffset; }
    if (e.type === 'bearing' && e.primary) clone.radius = state.project.parameters.bearingRadius;
    if (e.type === 'rail' && e.primary) clone.stroke = state.project.parameters.travelMax - state.project.parameters.travelMin;
    if (e.type === 'slot' && e.primary && pose?.path) {
      clone.angle = 0; clone.curveKind = 'spline'; clone.slotWidth = state.project.parameters.slotWidth;
      clone.controls = Array.from({ length: 13 }, (_, i) => {
        const point = pose.path[Math.round(i / 12 * (pose.path.length - 1))];
        return { x: point.x - pose.a.x, y: point.y - pose.a.y };
      });
    }
    state.project.elements.push(clone); state.selected = clone.id;
    changed(false); toast('Prvok bol duplikovaný. Jeho poloha sa dá voľne upraviť.');
  }

  function deleteElement() {
    const e = currentElement();
    if (!e) return;
    if (e.primary) { toast('Riadený prvok šablóny nemožno odstrániť. Vytvorte vlastný mechanizmus.', true); return; }
    pushHistory();
    state.project.elements = state.project.elements.filter((v) => v.id !== e.id);
    state.project.connections = state.project.connections.filter((j) => j.a.elementId !== e.id && j.b.elementId !== e.id);
    for (const remaining of state.project.elements) {
      if (remaining.slotId === e.id) remaining.slotId = '';
      if (remaining.parentId === e.id) {
        const pose = state.result.poses[remaining.id];
        if (pose) { remaining.x = pose.controlOrigin?.x ?? pose.a.x; remaining.y = pose.controlOrigin?.y ?? pose.a.y; remaining.angle = pose.angle; }
        remaining.parentId = '';
      }
      if (remaining.mountA?.elementId === e.id) remaining.mountA = null;
      if (remaining.mountB?.elementId === e.id) remaining.mountB = null;
    }
    state.project.dimensions = state.project.dimensions.filter((d) => d.a.elementId !== e.id && d.b.elementId !== e.id);
    state.project.trajectories = state.project.trajectories.filter((t) => t.reference.elementId !== e.id);
    state.selected = state.project.elements[0]?.id || null;
    if (state.traceRef.elementId === e.id) state.traceRef = { elementId: state.selected || '', point: 'b' };
    changed(false); toast('Prvok a jeho väzby boli odstránené.');
  }

  function zoom(factor, center) {
    const view = state.view, base = state.baseView;
    const w = K.clamp(view.width * factor, base.width * 0.2, base.width * 3);
    const f = w / view.width;
    const c = center || { x: view.x + view.width / 2, y: view.y + view.height / 2 };
    state.view = { x: c.x - (c.x - view.x) * f, y: c.y - (c.y - view.y) * f, width: w, height: view.height * f };
    renderScene();
  }

  function worldPoint(event) {
    const svg = $('#mechanism-canvas'), point = svg.createSVGPoint();
    point.x = event.clientX; point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    return matrix ? point.matrixTransform(matrix.inverse()) : { x: 0, y: 0 };
  }

  function connectPoint(reference) {
    if (!state.pendingJoint) {
      state.pendingJoint = reference; updateToolbar(); renderScene(); return;
    }
    const a = state.pendingJoint, b = reference;
    if (a.elementId === b.elementId) { toast('Vyberte uzol iného prvku.', true); return; }
    const ea = state.project.elements.find((e) => e.id === a.elementId), eb = state.project.elements.find((e) => e.id === b.elementId);
    if (!ea || !eb) { state.pendingJoint = null; updateToolbar(); return; }
    if (a.point === 'curve' && b.point === 'curve') { toast('Spojte vedenie s uzlovým bodom, nie s ďalším vedením.', true); return; }
    if (ea.primary && eb.primary) { toast('Tieto prvky sú už riadené šablónou. Pripojte vlastný prvok.', true); return; }
    const duplicate = state.project.connections.some((j) => (j.a.elementId === a.elementId && j.a.point === a.point && j.b.elementId === b.elementId && j.b.point === b.point) || (j.b.elementId === a.elementId && j.b.point === a.point && j.a.elementId === b.elementId && j.a.point === b.point));
    if (duplicate) { toast('Táto väzba už existuje.', true); state.pendingJoint = null; updateToolbar(); renderScene(); return; }
    if (state.project.connections.length >= 240) { toast('Bol dosiahnutý maximálny počet väzieb.', true); return; }
    pushHistory();
    if (a.point === 'curve' || b.point === 'curve') {
      const bearing = a.point === 'curve' ? eb : ea, slot = a.point === 'curve' ? ea : eb;
      if (bearing.type === 'bearing' && !bearing.primary && slot.type === 'slot') bearing.slotId = slot.id;
    }
    state.project.connections.push({ id: K.uid(), a, b, type: a.point === 'curve' || b.point === 'curve' ? 'point-path' : 'revolute', value: 0, name: a.point === 'curve' || b.point === 'curve' ? 'Čap vo vedení' : 'Otočný kĺb', builtin: false });
    state.pendingJoint = null; changed(false);
    toast('Kinematická väzba bola vytvorená.');
  }

  function onPointerDown(event) {
    if (event.button !== 0 && event.button !== 1) return;
    if (state.drag) return;
    event.preventDefault();
    const svg = $('#mechanism-canvas'), point = worldPoint(event);
    svg.focus({ preventScroll: true });
    const control = event.target.closest('[data-control]'), elementControl = event.target.closest('[data-element-control]');
    const target = event.target.closest('[data-element]'), e = state.project.elements.find((e) => e.id === target?.dataset.element);
    const nodeTarget = event.target.closest('[data-point]');
    const outlineControl = event.target.closest('[data-outline-control]');
    const dimension = event.target.closest('[data-dimension]');
    if (dimension) { dimensionModal(dimension.dataset.dimension); return; }
    if (state.tool === 'connect' && event.button === 0) {
      if (nodeTarget) connectPoint({ elementId: nodeTarget.dataset.element, point: nodeTarget.dataset.point });
      else if (['slot', 'rail'].includes(e?.type)) connectPoint({ elementId: e.id, point: 'curve' });
      else toast('Kliknite na označený uzlový bod alebo drážku kulisy.');
      return;
    }
    svg.setPointerCapture(event.pointerId);
    if (state.tool === 'pan' || event.button === 1 || event.altKey) {
      state.drag = { kind: 'pan', start: point, view: { ...state.view }, clientStart: { x: event.clientX, y: event.clientY }, pointerId: event.pointerId };
    } else if (state.tool === 'measure') {
      const reference = nodeTarget ? { elementId: nodeTarget.dataset.element, point: nodeTarget.dataset.point } : { x: point.x, y: point.y };
      const a = E.resolvePoint(state.result, reference) || point;
      state.measure = { a: { ...a }, b: { ...a }, referenceA: reference };
      state.drag = { kind: 'measure', pointerId: event.pointerId };
    } else if (state.mode === 'edit' && outlineControl) {
      pushHistory(); state.playing = false;
      state.drag = { kind: 'outline-control', index: Number(outlineControl.dataset.outlineControl), id: state.selected, pointerId: event.pointerId };
    } else if (elementControl) {
      pushHistory(); state.playing = false;
      state.drag = { kind: 'element-control', index: Number(elementControl.dataset.elementControl), id: state.selected, pointerId: event.pointerId };
    } else if (control) {
      pushHistory(); state.playing = false;
      state.drag = { kind: 'control', index: Number(control.dataset.control), pointerId: event.pointerId };
      if (!state.project.controls) state.project.controls = K.defaultControls(state.project.parameters);
    } else if (e) {
      selectElement(e.id); state.playing = false;
      const pose = state.result.poses[e.id], p = state.project.parameters;
      if (state.mode === 'edit') {
        if (e.primary) {
          toast('Parametrický prvok: upravte kóty v inšpektore alebo vytvorte voľnú kópiu.', true);
        } else {
          pushHistory();
          state.drag = {
            kind: nodeTarget && nodeTarget.dataset.point !== 'a' && !K.isElastic(e) ? 'resize' : 'element',
            key: nodeTarget?.dataset.point, id: e.id, start: point, x: e.x, y: e.y, angle: e.angle,
            pose: K.copy(pose), pointerId: event.pointerId,
          };
        }
      } else if (e.primary && isDoubleDrawer() && ['carrier', 'front', 'bracket', 'pinA', 'pinB', 'rocker', 'rearPin'].includes(e.role)) {
        if (e.role === 'carrier') state.drag = { kind: 'rail', start: point, startMotion: state.motion, pointerId: event.pointerId };
        else {
          const key = nodeTarget?.dataset.point;
          const fraction = K.nearestOnSegment(point, pose.a, pose.b).t;
          state.drag = { kind: 'panel', elementId: e.id, point: key || (e.type === 'bearing' ? 'a' : undefined), fraction, pointerId: event.pointerId };
        }
      } else if (e.primary && state.project.kind === 'drawer' && ['rail', 'panel', 'bearing'].includes(e.type)) {
        const panel = state.result.poses['panel-1'];
        const nearest = K.nearestOnSegment(point, panel.a, panel.b);
        const isPivot = nodeTarget?.dataset.point === 'a' && nodeTarget.dataset.element === 'panel-1';
        state.drag = { kind: e.type === 'rail' || e.role === 'pivot' || isPivot ? 'rail' : 'panel', start: point, startMotion: state.motion, fraction: e.role === 'follower' || nodeTarget?.dataset.point === 'c' ? p.bearingOffset / p.panelLength : nearest.t, pointerId: event.pointerId };
      } else if (e.primary && ['fourbar', 'crank'].includes(state.project.kind) && e.role === 'input') {
        state.drag = { kind: 'crank', center: pose.a, pointerId: event.pointerId };
      } else if (!e.primary && e.drive && e.type === 'rail') {
        state.drag = { kind: 'custom-rail', start: point, angle: e.angle, startMotion: state.motion, stroke: e.stroke, pointerId: event.pointerId };
      } else if (!e.primary && e.drive && ['link', 'panel'].includes(e.type)) {
        state.drag = e.driveMode === 'linear'
          ? { kind: 'custom-rail', start: point, angle: e.driveAngle, startMotion: state.motion, stroke: e.stroke, pointerId: event.pointerId }
          : { kind: 'custom-crank', center: pose.a, offset: e.angle, pointerId: event.pointerId };
      } else if (!e.primary && !e.locked) {
        state.drag = { kind: 'inverse', id: e.id, key: nodeTarget?.dataset.point, fraction: K.nearestOnSegment(point, pose.a, pose.b).t, pointerId: event.pointerId };
      }
    } else if (!state.project.elements.length) {
      state.selected = null; renderInspector();
    }
    if (state.drag) {
      document.body.classList.add('canvas-dragging');
      window.getSelection()?.removeAllRanges();
    }
    renderScene(); updateMotion();
  }

  function onPointerMove(event) {
    const point = worldPoint(event);
    state.pointer = point;
    $('#pointer-coordinates').innerHTML = `X: ${fmt(point.x)} <span>Y: ${fmt(point.y)}</span>`;
    const drag = state.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    if (drag.kind === 'rail') setMotion(drag.startMotion + point.x - drag.start.x);
    else if (drag.kind === 'panel') setMotion(K.inverseDrive(state.project, point, drag.fraction, { profile: state.profile, collisions: false, elementId: drag.elementId, point: drag.point }));
    else if (drag.kind === 'custom-rail') {
      const radians = drag.angle * K.DEG, range = K.driveRange(state.project);
      const offset = (point.x - drag.start.x) * Math.cos(radians) - (point.y - drag.start.y) * Math.sin(radians);
      setMotion(drag.startMotion + offset / drag.stroke * (range.max - range.min));
    }
    else if (drag.kind === 'crank' || drag.kind === 'custom-crank') setMotion((K.angleOf(drag.center, point) - (drag.offset || 0) + 720) % 360);
    else if (drag.kind === 'inverse') setMotion(K.inverseDrive(state.project, point, drag.fraction, { profile: state.profile, collisions: false, elementId: drag.id, point: drag.key }));
    else if (drag.kind === 'pan') {
      const rect = $('#mechanism-canvas').getBoundingClientRect();
      const scale = Math.max(drag.view.width / rect.width, drag.view.height / rect.height);
      state.view = { ...drag.view, x: drag.view.x - (event.clientX - drag.clientStart.x) * scale, y: drag.view.y - (event.clientY - drag.clientStart.y) * scale };
      renderScene();
    } else if (drag.kind === 'measure') { state.measure.b = point; renderScene(); }
    else if (drag.kind === 'element') {
      const e = state.project.elements.find((e) => e.id === drag.id);
      if (!e) return;
      let delta = { x: point.x - drag.start.x, y: point.y - drag.start.y };
      if (e.parentId) delta = K.rotate(delta, -(state.result.poses[e.parentId]?.angle || 0));
      e.x = K.clamp(drag.x + delta.x, -5000, 5000);
      e.y = K.clamp(drag.y + delta.y, -5000, 5000);
      if (state.snap) { e.x = Math.round(e.x / 5) * 5; e.y = Math.round(e.y / 5) * 5; }
      state.result = solveCurrent();
      renderScene(); updateMotion();
    } else if (drag.kind === 'resize') {
      const e = currentElement(), origin = drag.pose.controlOrigin || drag.pose.a;
      if (!e) return;
      if (drag.key === 'c' && e.type === 'panel') e.localC = K.localPoint({ a: origin, angle: drag.pose.angle }, point);
      else if (drag.key === 'c' && e.type === 'rail') e.stroke = Math.max(1, K.distance(origin, point));
      else {
        e.length = K.clamp(K.distance(origin, point), 1, 2000);
        e.angle = K.angleOf(origin, point) - (e.parentId ? state.result.poses[e.parentId].angle : 0);
        e.angle = ((e.angle + 540) % 360) - 180;
        if (state.snap) { e.length = Math.max(1, Math.round(e.length / 5) * 5); e.angle = Math.round(e.angle / 5) * 5; }
      }
      state.result = solveCurrent(); renderScene(); updateMotion();
    } else if (['element-control', 'outline-control'].includes(drag.kind)) {
      const e = state.project.elements.find((e) => e.id === drag.id);
      const pose = state.result.poses[e.id], local = K.localPoint({ ...pose, a: pose.controlOrigin || pose.a }, point);
      e[drag.kind === 'outline-control' ? 'outline' : 'controls'][drag.index] = { x: K.clamp(local.x, -5000, 5000), y: K.clamp(local.y, -5000, 5000) };
      state.result = solveCurrent();
      renderScene(); updateMotion();
    } else if (drag.kind === 'control') {
      const p = state.project.parameters;
      state.project.controls[drag.index] = { x: K.clamp(point.x - p.slotOffsetX, -5000, 5000), y: K.clamp(point.y - p.slotOffsetY, -5000, 5000) };
      state.profile = K.slotProfile(state.project);
      state.result = K.solve(state.project, state.motion, { profile: state.profile, collisions: state.collisions });
      renderScene(); updateMotion();
    }
  }

  function onPointerUp(event) {
    const drag = state.drag;
    if (drag && event.pointerId !== drag.pointerId) return;
    state.drag = null;
    document.body.classList.remove('canvas-dragging');
    if ($('#mechanism-canvas').hasPointerCapture(event.pointerId)) $('#mechanism-canvas').releasePointerCapture(event.pointerId);
    if (drag && ['element', 'resize', 'control', 'element-control', 'outline-control'].includes(drag.kind)) {
      if (event.type === 'pointercancel' || event.cancelled) state.project = state.history.pop() || state.project;
      try { state.project = K.validateProject(state.project); changed(false); }
      catch (error) { state.project = state.history.pop() || state.project; recalculate(false); renderInspector(); toast(error.message, true); }
    }
    if (drag?.kind === 'measure' && !event.cancelled && event.type !== 'pointercancel' && K.distance(state.measure.a, state.measure.b) > 0.1) {
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-point]');
      const b = target ? { elementId: target.dataset.element, point: target.dataset.point } : { ...state.measure.b };
      pushHistory(); state.project.dimensions.push(E.makeDimension(state.result, state.measure.referenceA, b)); changed(false);
      toast('Kóta bola pridaná. Kliknutím na ňu nastavíte typ a odsadenie.');
    }
  }

  function modal(title, content, wide = false) {
    state.playing = false; updateMotion();
    const el = $('#modal');
    el.className = wide ? 'modal-wide' : '';
    el.innerHTML = `<div class="modal-heading"><div><span class="eyebrow">KINEMATIKA STUDIO</span><h2 id="modal-title">${escape(title)}</h2></div>${ib('close', 'close-modal', 'Zavrieť dialóg')}</div>${content}`;
    if (!el.open) el.showModal();
  }

  function templatesModal() {
    const previews = {
      drawer: '<path d="M20 77h125M30 35v55h80M113 54h42c27 0 16 33 55 33" stroke="#a5b9b1"/><path d="M46 76h122" stroke="#d5a056" stroke-width="7"/><path d="m165 76 10-60" stroke="#d5a056" stroke-width="9"/><circle cx="165" cy="76" r="4" fill="#fff"/><circle cx="173" cy="34" r="4" fill="#fff"/>',
      fourbar: '<path d="M45 86h139" stroke="#b6c0ca" stroke-width="6"/><path d="m45 86 27-47 81-18 31 65" stroke="#d5a056" stroke-width="7"/><path d="m72 39 81-18" stroke="#79a69a" stroke-width="7"/><g fill="#fff" stroke="#71818f"><circle cx="45" cy="86" r="5"/><circle cx="72" cy="39" r="5"/><circle cx="153" cy="21" r="5"/><circle cx="184" cy="86" r="5"/></g>',
      crank: '<path d="M30 72h169" stroke="#bcc8d0" stroke-width="2"/><path d="m35 72 31-40 99 40" stroke="#d5a056" stroke-width="7"/><path d="m66 32 99 40" stroke="#79a69a" stroke-width="7"/><rect x="153" y="57" width="35" height="30" rx="4" fill="#e5c18b"/><g fill="#fff" stroke="#71818f"><circle cx="35" cy="72" r="5"/><circle cx="66" cy="32" r="5"/><circle cx="165" cy="72" r="5"/></g>',
      custom: '<rect x="25" y="17" width="180" height="80" rx="8" stroke="#d4dce2" stroke-dasharray="5 5"/><path d="M115 38v38M96 57h38" stroke="#a6b2bd" stroke-width="2"/>',
    };
    const texts = {
      drawer: ['Výsuv s vyklápacím čelom', 'Lineárne vedenie, ložisko a zakrivená kulisa.', '6 prvkov', '300 mm zdvih'],
      fourbar: ['Štvorkĺbový mechanizmus', 'Uzavretý reťazec s presnými dĺžkami ramien.', '4 prvky', '360° pohon'],
      crank: ['Kľukový mechanizmus', 'Premena rotačného pohybu na posuv piesta.', '5 prvkov', '360° pohon'],
      custom: ['Vlastný mechanizmus', 'Prázdna plocha. Vaše prvky, vaše väzby.', 'Čisté plátno', 'Bez obmedzení'],
    };
    modal('Každý pohyb začína nápadom.', `<p class="modal-description">Vyberte pripravený model alebo poskladajte vlastný mechanizmus.</p><div class="template-grid">${Object.keys(texts).map((kind) => `<button class="preset-card" data-action="load-template" data-kind="${kind}"><div class="preset-preview"><svg viewBox="0 0 230 115" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${previews[kind]}</svg>${kind === 'drawer' ? '<span class="recommended">ODPORÚČANÉ</span>' : ''}</div><div class="preset-body"><h3>${texts[kind][0]}</h3><p>${texts[kind][1]}</p><div><span>${texts[kind][2]}</span><span>${texts[kind][3]}</span>${icon('arrow', 16)}</div></div></button>`).join('')}</div>`, true);
  }

  function loadProject(project, imported = null) {
    clearTimeout(autosaveTimer);
    state.project = K.copy(project); state.history = []; state.future = [];
    state.motion = imported?.motion ?? K.driveRange(project).min; state.playing = false; state.saved = false; state.dirty = false; state.storageFailed = false;
    state.selected = projectSelection(project);
    state.traceRef = isDoubleDrawer() ? { elementId: 'bearing-1', point: 'a' } : { elementId: state.selected || '', point: 'b' };
    state.traceMode = isDoubleDrawer() ? 'bearings' : 'single'; state.traceSpace = 'world';
    state.pendingJoint = null; state.measure = null; state.tool = 'select'; state.analysis = false; state.inspectorTab = 'geometry'; state.view = null;
    state.mode = imported?.workspace?.mode || (project.kind === 'custom' ? 'edit' : 'simulate');
    if (imported?.workspace) applyPreferences(imported.workspace, true);
    $('#modal').close();
    recalculate(true); renderTree(); renderInspector(); updateHeader(); updateToolbar();
    saveProject(true);
    toast(`Projekt „${project.name}“ je pripravený.`);
  }

  function replaceProject(project, imported = null) {
    if (!state.dirty || saveProject(true)) { loadProject(project, imported); return; }
    state.pendingProject = project;
    state.pendingImport = imported;
    modal('Nahradiť neuložený projekt?', `<p class="modal-description">Lokálne úložisko nie je dostupné. Aktuálny projekt najskôr exportujte, ak ho chcete zachovať.</p><div class="modal-actions"><button class="button button-secondary" data-action="export-kinmo">Exportovať aktuálny projekt</button><button class="button button-dark" data-action="confirm-replace">Nahradiť projekt</button></div>`);
  }

  function projectsModal() {
    let projects = [];
    try { const data = JSON.parse(localStorage.getItem(storageKey) || '[]'); projects = Array.isArray(data) ? data : []; } catch { /* Export remains available. */ }
    modal('Vaše projekty', `<p class="modal-description">Editor začína prázdny. Pripravené mechanizmy otvorte samostatne; uložené projekty zostávajú zachované v tomto prehliadači.</p><h3 class="projects-section-title">Pripravený projekt podľa náčrtu</h3><div class="project-catalog-row"><button class="saved-project" data-action="load-double-drawer"><span class="saved-project-icon">${icon('folder', 22)}</span><span><strong>${escape(DD.NAME)}</strong><small>Dve pohyblivé kulisy · tuhé rameno · dve fázy</small><span class="project-estimate">ODHADOVÉ ROZMERY · 390 / 300 mm</span></span>${icon('arrow', 16)}</button>${ib('info', 'project-info', 'Zobraziť náčrt a predpoklady projektu')}</div><h3 class="projects-section-title">Uložené v tomto prehliadači</h3><div class="projects-list">${projects.length ? projects.filter((p) => p && typeof p === 'object').map((p) => `<button class="saved-project" data-action="load-saved" data-id="${escape(p.id)}"><span class="saved-project-icon">${icon('mechanism', 22)}</span><span><strong>${escape(p.name)}</strong><small>${p.elements?.length || 0} prvkov · ${p.kind === DD.KIND ? 'Dvojkulisový projekt · odhad' : p.kind === 'drawer' ? 'Výsuv a kulisa' : '2D mechanizmus'}</small></span>${icon('arrow', 16)}</button>`).join('') : '<div class="empty-projects">Zatiaľ nemáte uložené projekty.<br>Aktuálny model uložte tlačidlom Uložiť.</div>'}</div><div class="modal-actions"><button class="button button-secondary" data-action="rename">${icon('settings', 16)}Premenovať aktuálny</button><button class="button button-secondary" data-action="import">${icon('import', 16)}Importovať</button><button class="button button-dark" data-action="load-template" data-kind="custom">${icon('plus', 16)}Prázdny projekt</button></div>`);
  }

  function projectInfoModal() {
    const p = isDoubleDrawer() ? state.project.parameters : DD.defaults;
    modal(DD.NAME, `<p class="modal-description">Odhadová kinematická rekonštrukcia trojpolohového náčrtu. Geometria je vzájomne kompatibilná, nie zmeraná z obrázka.</p><div class="project-assumption-warning">${icon('warning', 20)}<p><strong>Nie je to výrobný výkres.</strong> Nákres nemá kóty. Korpus ${fmt(p.frameLength)} mm, zdvih ${fmt(p.travelMax - p.travelMin)} mm, rameno ${fmt(p.armLength)} mm a čelo ${fmt(p.panelLength)} mm sú odhady.</p></div><div class="project-info-grid"><section><h3>Potvrdené uloženie</h3><ul><li>Obe zakrivené kulisy sa pohybujú so zásuvkou.</li><li>Modré rameno má pevnú dĺžku. V náčrte sú jeho zmeny iba schematické.</li><li>Ložiská A a B sú na spoločnom tuhom držiaku čela.</li><li>Korpus, zadná opora a platforma stola sú pevné.</li></ul></section><section><h3>Odhadové doplnenia</h3><ul><li>Zadný čap R má pozdĺžnu drážku na zásuvke.</li><li>Opora drží čap do ${fmt(p.releaseTravel - p.handoffLength)} mm. Prechod do posuvu prebieha na posledných ${fmt(p.handoffLength)} mm sklápania.</li><li>Zachytenie a uvoľnenie čapu by vyžadovalo doraz / západku alebo poddajné uloženie. Detail náčrt neurčuje.</li><li>Výrez stola ${fmt(p.cutoutStart)}–${fmt(p.cutoutEnd)} mm je jeden pevný odhad pre celý zdvih, nie pohyblivá medzera z jednotlivých obrázkov.</li></ul></section></div><ol class="project-motion-steps"><li><strong>01 · Zatvorené</strong>Čelo ${fmt(p.closedAngle)}°, rameno ${fmt(p.armClosedAngle)}°.</li><li><strong>02 · Sklopené</strong>Pri zdvihu ${fmt(p.releaseTravel)} mm dosiahne čelo ${fmt(p.openAngle)}° a rameno ${fmt(p.armOpenAngle)}°.</li><li><strong>03 · Vysunuté</strong>Ďalších ${fmt(p.travelMax - p.travelMin - p.releaseTravel)} mm sa členy posúvajú spolu. Ložiská zostávajú v rovnakých miestach kulís.</li></ol><p class="project-info-note">Trajektórie môžete zobraziť vzhľadom na pevný korpus alebo na zásuvku. Solver kontroluje dĺžku ramena, rozstup ložísk a obe drážky s toleranciou ${fmt(K.TOLERANCE, 2)} mm. Uvoľnenie opory je predpísaný odhadový pohyb; sily, trenie a funkciu západky tento model neoveruje.</p><figure class="project-reference"><img src="${escape(DD.provenance.reference)}" alt="Pôvodný náčrt troch polôh zásuvky: zatvorené, sklopené a vysunuté čelo, dve pohyblivé kulisy a tuhé modré rameno." width="908" height="1024"/><figcaption>Pôvodný referenčný náčrt, schematický a bez rozmerových kót.</figcaption></figure><div class="modal-actions"><button class="button button-secondary" data-action="projects">${icon('folder', 15)}Projekty</button><button class="button button-dark" data-action="${isDoubleDrawer() ? 'close-modal' : 'load-double-drawer'}">${isDoubleDrawer() ? 'Späť do projektu' : 'Otvoriť samostatný projekt'}</button></div>`, true);
  }

  function exportModal() {
    const choices = [
      ['kinmo', 'code', 'Natívny projekt .kinmo', 'Geometria, väzby, kóty, trajektórie, fyzika, vzhľad a poloha pohonu.', 'KINMO'],
      ['svg', 'mechanism', 'Vektorový výkres', 'Referenčný výkres v mm s kótami a trajektóriami.', 'SVG'],
      ['png', 'eye', 'Obrázok pracovnej plochy', 'Aktuálny pohľad, najviac 2 000 × 4 000 px, bez externého servera.', 'PNG'],
      ['pdf', 'folder', 'Technický report', 'Výkres, grafy, rozmery, sily a tabuľky v jednom dokumente.', 'PDF'],
      ['html', 'folder', 'Prenosný report na tlač', 'Samostatný report s vloženými vektorovými výkresmi.', 'HTML'],
      ['dxf', 'ruler', 'CAD výmena', '2D referenčná geometria v mm; kulisy sú strednicové profily.', 'DXF'],
      ['csv', 'chart', 'Kinematické dáta', '121 polôh, uhly, súradnice a chyby väzieb.', 'CSV'],
      ['forces', 'spring', 'Silové / dynamické dáta', 'Sily členov a časový záznam poslednej odhadovej dynamiky.', 'CSV'],
      ['json', 'code', 'Starší projekt JSON', 'Kompatibilita s pôvodným formátom, bez vzhľadu a polohy.', 'JSON'],
    ];
    modal('Export, report a CAD', `<p class="modal-description">Exporty sa vytvoria lokálne. Priame odoslanie do Fusion spustíte iba samostatným potvrdením.</p><div class="export-options">${choices.map(([type, glyph, name, description, extension]) => `<button data-action="export-${type}">${icon(glyph, 23)}<span><strong>${name}</strong><small>${description}</small></span><span class="file-tag">${extension}</span></button>`).join('')}<button data-action="fusion">${icon('link', 23)}<span><strong>Priame prepojenie · Autodesk Fusion</strong><small>Lokálny doplnok, párovací kľúč a nový referenčný dokument.</small></span><span class="file-tag">CAD</span></button></div><div class="export-note">${icon('lock', 14)}Exporty neopúšťajú zariadenie. Fusion vyžaduje vaše výslovné odoslanie.</div>`, true);
  }

  function download(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Súbor ${filename} bol pripravený na stiahnutie.`);
  }

  let pdfLoader;
  function loadPDF() {
    if (!pdfLoader) pdfLoader = (async () => {
      for (const src of ['./vendor/pdfmake/pdfmake.min.js', './vendor/pdfmake/vfs_fonts.js']) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          const timer = setTimeout(() => { script.remove(); reject(new Error('PDF modul sa nenačítal. Použite HTML report alebo skontrolujte súbory aplikácie.')); }, 15000);
          script.src = new URL(src, document.baseURI).href;
          script.onload = () => { clearTimeout(timer); resolve(); };
          script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('PDF modul nie je dostupný. Skontrolujte súbory aplikácie alebo použite HTML report.')); };
          document.head.append(script);
        });
      }
      return globalThis.pdfMake;
    })().catch((error) => { pdfLoader = null; throw error; });
    return pdfLoader;
  }

  async function exportFile(type) {
    try {
      const slug = state.project.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase().slice(0, 70) || 'mechanizmus';
      if (type === 'json') download(`${slug}.json`, X.serializeProject(state.project), 'application/json');
      if (type === 'kinmo') download(`${slug}.kinmo`, X.serializeNative(state.project, { workspace: state, motion: state.motion }), 'application/vnd.kinmo+json');
      if (type === 'dxf') download(`${slug}.dxf`, X.dxf(state.project, state.result, { dimensions: state.dimensions, trajectories: state.trace, samples: state.samples, references: traceReferences(), traceSpace: state.traceSpace }), 'application/dxf');
      if (type === 'forces') {
        if (!state.forceContext) prepareForces();
        download(`${slug}-sily.csv`, X.forceCSV(state.project, state.samples, state.forceContext, state.dynamicHistory), 'text/csv;charset=utf-8');
      }
      if (type === 'html' || type === 'pdf') {
        if (!state.forceContext) prepareForces();
        const data = X.reportData(state.project, state.result, state.samples, { forceContext: state.forceContext, forceError: state.forceError, history: state.dynamicHistory, references: traceReferences(), traceSpace: state.traceSpace });
        if (type === 'html') download(`${slug}-report.html`, X.htmlReport(data), 'text/html;charset=utf-8');
        else {
          const pdfMake = await loadPDF();
          const buffer = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Príprava PDF nebola potvrdená. Použite HTML report alebo menší model.')), 30000);
            pdfMake.createPdf(X.pdfReport(data)).getBuffer((bytes) => { clearTimeout(timer); resolve(bytes); });
          });
          download(`${slug}-report.pdf`, buffer, 'application/pdf');
        }
      }
      if (type === 'png') {
        const svg = sceneSVG(), url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
        try {
          const image = new Image();
          await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Obrázok sa nepodarilo vytvoriť. Použite SVG.')); image.src = url; });
          const canvas = document.createElement('canvas');
          const height = Math.max(1, Math.round(2000 * state.view.height / state.view.width)), scale = Math.min(1, 4000 / height);
          canvas.width = Math.max(1, Math.round(2000 * scale)); canvas.height = Math.max(1, Math.round(height * scale));
          const context = canvas.getContext('2d'); context.drawImage(image, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
          if (!blob) throw new Error('Prehliadač nevytvoril PNG.');
          download(`${slug}.png`, blob, 'image/png');
        } finally { URL.revokeObjectURL(url); }
      }
      if (type === 'csv') {
        const unit = K.driveRange(state.project).unit;
        const rows = [['pohon_' + (unit === 'mm' ? 'mm' : 'deg'), 'uhol_vystupu_deg', 'posuv_mm', 'bod_x_mm', 'bod_y_mm', 'chyba_vazieb_mm', 'blokovanie', 'dovod', ...(isDoubleDrawer() ? ['uhol_ramena_deg', 'faza', 'A_korpus_x_mm', 'A_korpus_y_mm', 'B_korpus_x_mm', 'B_korpus_y_mm', 'A_zasuvka_x_mm', 'A_zasuvka_y_mm', 'B_zasuvka_x_mm', 'B_zasuvka_y_mm', 'odhadove_rozmery', 'sustava_zvoleneho_bodu'] : [])].join(';')];
        for (const s of state.samples) {
          const point = K.tracePoint(s, state.traceRef, state.traceSpace);
          const quote = (v) => `"${String(v).replace(/"/g, '""')}"`;
          const extra = [];
          if (isDoubleDrawer()) {
            extra.push(s.secondaryAngle.toFixed(3), s.phase);
            for (const space of ['world', 'carrier']) for (const reference of DD.traces) {
              const position = K.tracePoint(s, reference, space);
              extra.push(position.x.toFixed(3), position.y.toFixed(3));
            }
            extra.push('1', quote(state.traceSpace === 'carrier' ? 'zasuvka' : 'korpus'));
          }
          rows.push([s.motion.toFixed(3), s.angle.toFixed(3), s.displacement.toFixed(3), point?.x.toFixed(3) || '', point?.y.toFixed(3) || '', s.residual.toFixed(5), s.blocked ? '1' : '0', quote(s.issues.join(' | ')), ...extra].join(';'));
        }
        download(`${slug}-pohyb.csv`, '\uFEFF' + rows.join('\r\n'), 'text/csv;charset=utf-8');
      }
      if (type === 'svg') download(`${slug}.svg`, X.vectorSVG(state.project, state.result, { dimensions: state.dimensions, trajectories: state.trace, samples: state.samples, references: traceReferences(), traceSpace: state.traceSpace }), 'image/svg+xml');
    } catch (error) { toast(error.message || 'Export sa nepodarilo dokončiť.', true); }
  }

  function sceneSVG() {
    const v = state.view, css = getComputedStyle(document.documentElement), names = ['canvas', 'grid-small', 'grid-large', 'secondary', 'paper', 'ink'];
    const variables = names.map((name) => `--${name}:${css.getPropertyValue(`--${name}`).trim()};`).join('');
    const source = $('#mechanism-canvas'), snapshot = source.cloneNode(true), labels = source.querySelectorAll('text');
    for (const [i, label] of snapshot.querySelectorAll('text').entries()) {
      const style = getComputedStyle(labels[i]);
      for (const property of ['font-family', 'font-size', 'font-weight', 'font-style', 'letter-spacing', 'fill', 'stroke', 'paint-order']) label.style.setProperty(property, style.getPropertyValue(property));
    }
    return `<svg xmlns="${svgNS}" width="2000" height="${Math.round(2000 * v.height / v.width)}" viewBox="${v.x} ${v.y} ${v.width} ${v.height}" style="${variables}"><title>${escape(state.project.name)}</title><desc>${escape(X.warning)}</desc>${snapshot.innerHTML}</svg>`;
  }

  function settingsModal() {
    const s = { ...K.simulationDefaults, ...state.project.simulation }, unit = K.driveRange(state.project).unit === '°' ? 'N·m' : 'N';
    modal('Pracovný priestor, vzhľad a simulácia', `<form id="settings-form"><div class="settings-fields">
      <label class="property-field"><span>Vzhľad aplikácie</span><select name="theme" class="property-select">${[['mono', 'Biela / čierna'], ['orange', 'Sivá / oranžová'], ['dark', 'Tmavosivá / biela']].map(([value, name]) => `<option value="${value}"${state.theme === value ? ' selected' : ''}>${name}</option>`).join('')}</select></label>
      <label class="property-field"><span>Spôsob simulácie</span><select name="simulation-mode" class="property-select"><option value="kinematic"${s.mode !== 'dynamic' ? ' selected' : ''}>Kinematika · predpísaný pohyb</option><option value="dynamic"${s.mode === 'dynamic' ? ' selected' : ''}>Odhadová dynamika · pohyb zo síl</option></select></label>
      <label class="property-field"><span>Čas kinematického zdvihu (s)</span><input name="cycle" class="text-field" type="number" min="1" max="60" step=".5" value="${state.cycle}" required/></label>
      ${[['gravity', 'Gravitácia (m/s²)', 0, 100, .01], ['damping', `Tlmenie pohonu (${unit}·s/${unit === 'N' ? 'm' : 'rad'})`, 0, 1000000, .1], ['friction', `Suché trenie pohonu (${unit})`, 0, 1000000, .1], ['inputForce', `Vonkajšia sila / moment pohonu (${unit})`, -1000000, 1000000, .1], ['initialVelocity', `Počiatočná rýchlosť (${K.driveRange(state.project).unit}/s)`, -1000000, 1000000, .1], ['duration', 'Čas odhadovej dynamiky (s)', .1, 120, .1]].map(([name, label, min, max, step]) => `<label class="property-field"><span>${label}</span><input class="text-field" name="${name}" type="number" min="${min}" max="${max}" step="${step}" value="${s[name]}" required/></label>`).join('')}
      <label class="check-row"><input name="snap" type="checkbox"${state.snap ? ' checked' : ''}/><span>Prichytávať prvky na mriežku (5 mm)</span></label><label class="check-row"><input name="collisions" type="checkbox"${state.collisions ? ' checked' : ''}/><span>Kontrolovať kolízie v jednej rovine</span></label><label class="check-row"><input name="forceArrows" type="checkbox"${state.forceArrows ? ' checked' : ''}/><span>Zobraziť smerové šípky síl</span></label>
      <p class="section-description">Dynamika vyžaduje jeden nezávislý pohon a určený pohyb všetkých telies. Po prekročení dĺžky, kolízii alebo doraze sa zastaví, bez odrazu a modelu nárazu. Hmotnosti nastavte v inšpektore jednotlivých telies.</p></div><div class="modal-actions"><button class="button button-secondary" type="button" data-action="export">Súbory, obrázky a report</button><button class="button button-secondary" type="button" data-action="fusion">Autodesk Fusion</button><button class="button button-dark" type="submit">Použiť nastavenia</button></div></form>`, true);
  }

  function fusionModal() {
    const available = ['http:', 'https:'].includes(location.protocol);
    modal('Lokálne prepojenie · Autodesk Fusion', `<p class="modal-description">Doplnok vytvorí nový, neuložený referenčný dokument. Existujúce návrhy nemení. Krivky sú fixované úsečky, kulisy sú strednice a kóty sú referenčné popisy. Nejde o prevod na 3D zostavu alebo Fusion joints.</p>
      <ol class="fusion-steps"><li>Stiahnite a rozbaľte doplnok. Vo Fusion: Utilities → Scripts and Add-Ins → Add-Ins → + → priečinok KinmoFusion.</li><li>Spustite doplnok ručne. Povoľte pôvod <code>${escape(available ? location.origin : 'HTTP(S) adresa aplikácie')}</code>.</li><li>Vložte nižšie dočasný párovací kľúč z Fusion. Povoľte lokálnu sieť, ak si ju prehliadač vyžiada.</li></ol>
      <a class="button button-secondary" href="./cad/KinmoFusion.zip" download${!available ? ' aria-disabled="true"' : ''}>Stiahnuť doplnok KinmoFusion (ZIP)</a>
      <form id="fusion-form"><label class="property-field"><span>Dočasný párovací kľúč (neukladá sa)</span><input class="text-field" name="key" type="password" autocomplete="off" minlength="20" maxlength="100" required/></label>
      <label class="check-row"><input type="checkbox" name="consent" required/><span>Súhlasím s odoslaním viditeľnej geometrie do nového dokumentu v bežiacom Fusion.</span></label>
      <p class="section-description">Spojenie: <code>${escape(CAD.ENDPOINT)}</code>, iba toto zariadenie. Po práci zastavte doplnok. ${available ? 'Nie sú potrebné prihlasovacie údaje Autodesk.' : 'file:// nemôže použiť priame spojenie. Spustite lokálny server alebo použite DXF; doplnok je tiež v priečinku cad/KinmoFusion.'}</p>
      <p id="fusion-status" class="section-description" role="status"></p>
      <div class="modal-actions"><button type="button" class="button button-secondary" data-action="fusion-check"${!available ? ' disabled' : ''}>Overiť spojenie</button><button type="submit" class="button button-dark"${!available ? ' disabled' : ''}>Odoslať nový referenčný výkres</button></div></form>`, true);
  }

  function elasticSourcesModal() {
    modal('Príklady pružných prvkov a zdroje', `<p class="modal-description">Katalógové príklady sú referenčné, bez záruky vhodnosti pre váš mechanizmus. Dĺžka znamená vzdialenosť montážnych bodov, pri ťažnej pružine vnútorných hrán očiek.</p><div class="export-options">
      <button data-action="apply-elastic-example" data-example="compression"><span><strong>Gutekunst D-001 · tlačná pružina</strong><small>Drôt 0,2 / Ø 3,1 / L₀ 7,5 mm · sn 4,82 mm · k 0,095 N/mm · Fn ≈ 0,46 N</small></span></button>
      <button data-action="apply-elastic-example" data-example="extension"><span><strong>Gutekunst RZ-001I · ťažná pružina</strong><small>Drôt 0,2 / Ø 2,7 / L₀ 6,2 mm · sn 13,29 mm · k 0,078 N/mm · Fn ≈ 1,101 N. F₀ ≈ 0,064 N je odvodené, nie samostatne overené.</small></span></button>
      <button data-action="apply-elastic-example" data-example="piston"><span><strong>Modelová vzpera · nie katalógový výrobok</strong><small>Tyč 8 / valec 19 mm · zdvih 100 mm · dĺžka 180–280 mm · F 400 N · pomer 1,2.</small></span></button></div>
      <p class="section-description">Pri plynových vzperách overte hmotnosť, ťažisko, montážne body, uhol otvorenia, teplotu a silu ruky. V kalkulátore výrobca odporúča rezervu zdvihu aspoň 10 mm a montáž tyčou nadol. Odhadový model aplikácie neoveruje tieto výrobné a montážne podmienky.</p><div class="reference-links"><a href="https://www.federnshop.com/en/products/compression_springs.html" target="_blank" rel="noopener noreferrer">Gutekunst · tlačné pružiny</a><a href="https://www.federnshop.com/en/products/extension_springs/rz-001i.html" target="_blank" rel="noopener noreferrer">Gutekunst · ťažné pružiny</a><a href="https://www.plynovepruzinyshop.cz/kalkulator/" target="_blank" rel="noopener noreferrer">Kalkulátor plynových vzpier</a></div>`, true);
  }

  function centerOfMassModal() {
    const e = currentElement(), pose = selectedPose();
    if (!e || !pose) return;
    const point = e.com || K.localPoint(pose, P.centerOfMass(e, pose));
    modal('Ťažisko telesa', `<form id="com-form"><p class="modal-description">Lokálne súradnice od bodu A v orientácii telesa. Hmotnosť sa nachádza v geometrii prvku.</p><label class="property-field"><span>Ťažisko X (mm)</span><input class="text-field" name="x" type="number" min="-5000" max="5000" step=".1" value="${point.x.toFixed(1)}" required/></label><label class="property-field"><span>Ťažisko Y (mm)</span><input class="text-field" name="y" type="number" min="-5000" max="5000" step=".1" value="${point.y.toFixed(1)}" required/></label><label class="check-row"><input type="checkbox" name="automatic"${e.com ? '' : ' checked'}/><span>Použiť automatický odhad ťažiska</span></label><div class="modal-actions"><button class="button button-dark" type="submit">Uložiť ťažisko</button></div></form>`);
  }

  function helpModal() {
    modal('Malé štúdio. Veľké možnosti.', `<p class="modal-description">Všetko, čo potrebujete na preskúmanie mechanizmu.</p><div class="help-steps"><div><span>01</span><p><strong>Poskladajte model.</strong>Pretiahnite prvky na plátno. Nástrojom J spojte uzlové body do kinematického reťazca.</p></div><div><span>02</span><p><strong>Dolaďte geometriu.</strong>Vyberte prvok a nastavte rozmery, polohy ložísk, tvar kulisy alebo pohybové limity.</p></div><div><span>03</span><p><strong>Uveďte ho do pohybu.</strong>Potiahnite čelo alebo výsuv, posuňte ovládač alebo spustite animáciu.</p></div></div><div class="shortcut-grid">${[['Space', 'Prehrať / pozastaviť'], ['V', 'Výber a pohyb'], ['H', 'Posúvanie plátna'], ['J', 'Spojenie uzlov'], ['M', 'Meranie vzdialenosti'], ['F', 'Prispôsobiť pohľad'], ['Ctrl + S', 'Uložiť projekt'], ['Ctrl + Z', 'Späť'], ['Delete', 'Odstrániť vlastný prvok'], ['Esc', 'Zrušiť nástroj']].map(([key, label]) => `<div><kbd>${key}</kbd><span>${label}</span></div>`).join('')}</div><p class="help-disclaimer">Kolízie sú geometrické, v jednej 2D rovine. Aplikácia nenahrádza pevnostný výpočet ani overenie bezpečnosti fyzického výrobku.</p>`, true);
  }

  function traceModal() {
    modal(isDoubleDrawer() ? 'Trajektórie v dvoch súradnicových sústavách' : 'Sledujte bod počas celého pohybu.', `${isDoubleDrawer() ? doubleTraceControls() : ''}<p class="modal-description">${isDoubleDrawer() ? 'Voľbou jedného bodu sa vypne spoločné sledovanie ložísk A a B.' : 'Vyberte prvok a jeho uzlový bod. Trajektória sa vypočíta v celom rozsahu pohonu.'}</p><form id="trace-form"><label class="property-field"><span>Prvok mechanizmu</span><select class="property-select" name="element">${state.project.elements.map((e) => `<option value="${escape(e.id)}"${e.id === state.traceRef.elementId ? ' selected' : ''}>${escape(e.name)}</option>`).join('')}</select></label><label class="property-field"><span>Referenčný bod</span><select class="property-select" name="point"><option value="a"${state.traceRef.point === 'a' ? ' selected' : ''}>Začiatok prvku / otočný čap</option><option value="b"${state.traceRef.point === 'b' ? ' selected' : ''}>Koniec prvku / koniec čela</option><option value="c"${state.traceRef.point === 'c' ? ' selected' : ''}>Pomocný bod / vodiace ložisko</option></select></label><div class="modal-actions"><button class="button button-secondary" type="button" data-action="close-modal">Hotovo</button><button class="button button-dark" type="submit">${icon('trace', 16)}Sledovať jeden bod</button></div></form>`);
  }

  function elementModal() {
    const e = currentElement();
    if (!e) return;
    modal('Upraviť prvok', `<form id="element-name-form"><label class="property-field"><span>Názov prvku</span><input class="text-field" name="name" value="${escape(e.name)}" maxlength="80" required/></label><div class="modal-actions"><button class="button button-secondary" type="button" data-action="duplicate">${icon('copy', 16)}Duplikovať</button><button class="button button-dark" type="submit">Uložiť názov</button></div></form>`);
  }

  function nodeOptions(selected, curves = false, none = false, excludeElastic = false) {
    return `${none ? '<option value="">Voľný koniec · poloha prvku</option>' : ''}${state.project.elements.filter((e) => !excludeElastic || !K.isElastic(e)).flatMap((e) => {
      const pose = state.result.poses[e.id];
      const keys = ['a', ...(e.type !== 'bearing' ? ['b'] : []), ...(pose?.c ? ['c'] : []), ...(curves && ['slot', 'rail'].includes(e.type) ? ['curve'] : [])];
      return keys.map((point) => `<option value="${escape(e.id)}|${point}"${selected?.elementId === e.id && selected.point === point ? ' selected' : ''}>${escape(e.name)} · ${point === 'curve' ? 'dráha' : point.toUpperCase()}</option>`);
    }).join('')}`;
  }
  const parseReference = (value) => {
    if (!value) return null;
    const [elementId, point] = value.split('|'); return { elementId, point };
  };

  function jointModal(id) {
    const joint = state.project.connections.find((j) => j.id === id);
    if (joint?.builtin) {
      modal('Väzba parametrického modelu', `<p class="modal-description">Táto väzba patrí do analytickej šablóny. Zmena jej typu by zrušila pôvodný pohybový zákon. Vytvorte voľnú editačnú kópiu a upravte ju tam.</p><div class="modal-actions"><button class="button button-dark" data-action="make-editable">Vytvoriť voľnú kópiu</button></div>`);
      return;
    }
    modal(joint ? 'Upraviť kinematickú väzbu' : 'Pridať kinematickú väzbu', `<form id="joint-form" data-id="${escape(id || '')}">
      <label class="property-field"><span>Názov väzby</span><input class="text-field" name="name" maxlength="100" value="${escape(joint?.name || 'Otočný kĺb')}" required/></label>
      <label class="property-field"><span>Typ väzby</span><select name="type" class="property-select">${Object.entries(E.constraintNames).map(([type, name]) => `<option value="${type}"${joint?.type === type ? ' selected' : ''}>${name}</option>`).join('')}</select></label>
      <label class="property-field"><span>Prvý uzol</span><select name="a" class="property-select">${nodeOptions(joint?.a || { elementId: state.selected, point: 'a' }, true)}</select></label>
      <label class="property-field"><span>Druhý uzol</span><select name="b" class="property-select">${nodeOptions(joint?.b, true)}</select></label>
      <label class="property-field"><span>Vzdialenosť (mm) alebo relatívny uhol (°)</span><input name="value" class="text-field" type="number" min="-360" max="5000" step=".1" value="${joint?.value || 0}" required/></label>
      <p class="section-description">Kĺb spojí dva body. Čap vo vedení spojí jeden bod s dráhou. Pevné spojenie vynúti aj relatívny uhol. Vzdialenosť, rovnobežnosť a uhol sa vynucujú až v simulácii.</p>
      <div class="modal-actions"><button type="button" class="button button-secondary" data-action="tool-connect">Vybrať uzly na plátne</button><button class="button button-dark" type="submit">Uložiť väzbu</button></div></form>`);
  }

  function dimensionModal(id) {
    const dimension = state.project.dimensions.find((d) => d.id === id);
    modal(dimension ? 'Upraviť kótu' : 'Pridať rozmerovú kótu', `<form id="dimension-form" data-id="${escape(id || '')}">
      <label class="property-field"><span>Názov (voliteľný)</span><input class="text-field" name="name" maxlength="100" value="${escape(dimension?.name || '')}"/></label>
      <label class="property-field"><span>Typ kóty</span><select class="property-select" name="type">${[['distance', 'Dĺžka medzi bodmi'], ['horizontal', 'Vodorovná vzdialenosť'], ['vertical', 'Zvislá vzdialenosť'], ['angle', 'Uhol spojnice voči osi X']].map(([type, name]) => `<option value="${type}"${dimension?.type === type ? ' selected' : ''}>${name}</option>`).join('')}</select></label>
      ${dimension && (!dimension.a.elementId || !dimension.b.elementId) ? '<p class="section-description">Kóta bola odmeraná medzi voľnými bodmi. Pri zmene uzlov ju prepojíte na telesá.</p>' : ''}
      <label class="property-field"><span>Prvý uzol</span><select name="a" class="property-select">${dimension && !dimension.a.elementId ? '<option value="world-a">Pôvodný voľný bod A</option>' : ''}${nodeOptions(dimension?.a || { elementId: state.selected, point: 'a' })}</select></label>
      <label class="property-field"><span>Druhý uzol</span><select name="b" class="property-select">${dimension && !dimension.b.elementId ? '<option value="world-b">Pôvodný voľný bod B</option>' : ''}${nodeOptions(dimension?.b || { elementId: state.selected, point: 'b' })}</select></label>
      <label class="property-field"><span>Odsadenie popisu (mm)</span><input class="text-field" name="offset" type="number" min="-500" max="500" step=".1" value="${dimension?.offset ?? 25}" required/></label>
      <label class="check-row"><input type="checkbox" name="driving"${dimension?.constraintId || dimension?.control ? ' checked' : ''}/><span>Riadiaca dĺžková kóta (rozmer telesa alebo vzdialenostná väzba)</span></label>
      <label class="property-field"><span>Predpísaná dĺžka riadiacej kóty (mm)</span><input class="text-field" name="value" type="number" min="1" max="5000" step=".1" value="${dimension ? state.project.connections.find((j) => j.id === dimension.constraintId)?.value ?? (dimension.control ? state.project.elements.find((e) => e.id === dimension.control.elementId)?.[dimension.control.property] : null) ?? Math.max(1, E.dimensionValue(state.result, dimension) || 1) : selectedPose()?.length || 100}" required/></label>
      <div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zrušiť</button><button class="button button-dark" type="submit">Uložiť kótu</button></div></form>`);
  }

  function geometryModal(outline = false) {
    const e = currentElement();
    if (!e || e.primary) return;
    const points = outline ? e.outline || [] : e.controls;
    modal(outline ? 'Upraviť obrys telesa' : 'Upraviť body vodiacej dráhy', `<form id="geometry-form" data-outline="${outline}">
      <p class="modal-description">Lokálne súradnice v mm, jeden vrchol na riadok vo formáte <code>X;Y</code>. Pridaním alebo odstránením riadka meníte počet bodov. ${outline ? 'Prázdny zoznam obnoví štandardný tvar. Obrys sa používa na kreslenie a CAD, nie na presnú plošnú kolíziu.' : 'Lomená čiara zachová všetky zadané body. Výsledná trajektória je odvodená z väzieb, nie ručne upravená dráha pohybu.'}</p>
      <label class="property-field"><span>${outline ? 'Vrcholov 3–64, alebo prázdny obrys' : `Bodov ${['polyline', 'arc'].includes(e.curveKind) ? '2' : '4'}–${e.curveKind === 'polyline' ? '1001' : '32'}`}</span><textarea name="points" class="geometry-points" spellcheck="false" rows="12">${escape(points.map((p) => `${Number(p.x.toFixed(3))};${Number(p.y.toFixed(3))}`).join('\n'))}</textarea></label>
      <div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zrušiť</button><button class="button button-dark" type="submit">Použiť body</button></div></form>`, true);
  }

  function savedTraceModal(id) {
    const track = state.project.trajectories.find((t) => t.id === id);
    const reference = track?.reference || { elementId: state.selected || state.traceRef.elementId, point: $('#trace-point')?.value || state.traceRef.point };
    modal(track ? 'Upraviť uloženú trajektóriu' : 'Uložiť trajektóriu bodu', `<form id="saved-trace-form" data-id="${escape(id || '')}">
      <label class="property-field"><span>Názov trajektórie</span><input name="name" class="text-field" maxlength="100" value="${escape(track?.name || `${currentElement()?.name || 'Bod'} · ${reference.point.toUpperCase()}`)}" required/></label>
      <label class="property-field"><span>Sledovaný uzol</span><select class="property-select" name="reference">${nodeOptions(reference)}</select></label>
      <label class="property-field"><span>Farba</span><input type="color" name="color" value="${track?.color || '#4d9b91'}"/></label>
      <label class="property-field"><span>Súradnicová sústava</span><select class="property-select" name="space"><option value="world">Pevná sústava</option>${isDoubleDrawer() ? `<option value="carrier"${track?.space === 'carrier' ? ' selected' : ''}>Zásuvka</option>` : ''}</select></label>
      <label class="check-row"><input type="checkbox" name="visible"${track?.visible !== false ? ' checked' : ''}/><span>Zobraziť trajektóriu</span></label>
      <p class="section-description">Trajektória sa vypočíta z pohybu. Ak chcete meniť jej tvar, vytvorte samostatnú vodiacu krivku a upravte jej body; kinematické väzby potom určia dosiahnuteľný pohyb.</p>
      <div class="modal-actions">${track ? `<button type="button" class="button button-secondary" data-action="trace-to-path" data-id="${escape(track.id)}">Vytvoriť editovateľnú vodiacu krivku</button>` : ''}<button class="button button-dark" type="submit">Uložiť trajektóriu</button></div></form>`);
  }

  function applyProject(next) {
    const validated = K.validateProject(next);
    pushHistory(); state.project = validated;
    state.playing = false; changed(false);
  }

  const actions = {
    'save': () => saveProject(),
    'export': exportModal,
    'export-json': () => exportFile('json'),
    'export-kinmo': () => exportFile('kinmo'),
    'export-dxf': () => exportFile('dxf'),
    'export-forces': () => exportFile('forces'),
    'export-html': () => exportFile('html'),
    'export-pdf': () => exportFile('pdf'),
    'export-png': () => exportFile('png'),
    'export-csv': () => exportFile('csv'),
    'export-svg': () => exportFile('svg'),
    'import': () => $('#import-file').click(),
    'projects': projectsModal,
    'load-double-drawer': () => replaceProject(DD.create()),
    'project-info': projectInfoModal,
    'templates': templatesModal,
    'help': helpModal,
    'settings': settingsModal,
    'fusion': fusionModal,
    'fusion-check': async (el) => {
      el.disabled = true;
      try {
        const key = $('#fusion-form').elements.key.value;
        await CAD.status(key);
        if ($('#fusion-status')) $('#fusion-status').textContent = 'Lokálne spojenie je overené. Žiadna geometria ešte nebola odoslaná.';
      } catch (error) { if ($('#fusion-status')) $('#fusion-status').textContent = error.message; }
      finally { if (el.isConnected) el.disabled = false; }
    },
    'elastic-sources': elasticSourcesModal,
    'edit-com': centerOfMassModal,
    'analyze-forces': () => {
      if (prepareForces(true)) { state.graphMode = 'force'; $('#graph-mode').value = 'force'; renderGraph(); renderInspector(); }
    },
    'apply-elastic-example': (el) => {
      let e = currentElement();
      const type = el.dataset.example === 'compression' ? 'spring-compression' : el.dataset.example === 'extension' ? 'spring-extension' : 'piston-push';
      if (!e || !K.isElastic(e)) {
        addElement(type); e = currentElement();
      }
      const next = K.copy(state.project), target = next.elements.find((v) => v.id === e.id);
      target.type = type; target.name = el.dataset.example === 'compression' ? 'Gutekunst D-001 · príklad' : el.dataset.example === 'extension' ? 'Gutekunst RZ-001I · príklad' : 'Modelová vzpera 8–19 · odhad';
      if (type === 'spring-compression') Object.assign(target, { restLength: 7.5, minLength: 2.68, maxLength: 7.5, length: 7.5, diameter: 3.1, wireDiameter: .2, force: .46, stiffness: .095, preload: 0, forceMode: 'stiffness' });
      else if (type === 'spring-extension') Object.assign(target, { restLength: 6.2, minLength: 6.2, maxLength: 19.49, length: 6.2, diameter: 2.7, wireDiameter: .2, force: 1.101, stiffness: .078, preload: .064, forceMode: 'stiffness' });
      else Object.assign(target, { restLength: 280, minLength: 180, maxLength: 280, length: 280, diameter: 19, rodDiameter: 8, force: 400, progression: 1.2 });
      target.mountA = null; target.mountB = null;
      next.connections = next.connections.filter((j) => j.a.elementId !== target.id && j.b.elementId !== target.id);
      try { applyProject(next); $('#modal').close(); toast('Príklad bol vložený bez montážnych väzieb. Skontrolujte parametre výrobcu.'); } catch (error) { toast(error.message, true); }
    },
    'mode-edit': () => setMode('edit'),
    'mode-simulate': () => setMode('simulate'),
    'make-editable': makeEditable,
    'new-joint': () => jointModal(),
    'edit-joint': (el) => jointModal(el.dataset.id),
    'new-dimension': () => dimensionModal(),
    'edit-dimension': (el) => dimensionModal(el.dataset.id),
    'delete-dimension': (el) => {
      pushHistory();
      const dimension = state.project.dimensions.find((d) => d.id === el.dataset.id);
      if (dimension?.constraintId) state.project.connections = state.project.connections.filter((j) => j.id !== dimension.constraintId);
      state.project.dimensions = state.project.dimensions.filter((d) => d.id !== el.dataset.id); changed(false);
    },
    'edit-path': () => geometryModal(false),
    'edit-outline': () => geometryModal(true),
    'save-trace': () => savedTraceModal(),
    'edit-trace': (el) => savedTraceModal(el.dataset.id),
    'delete-trace': (el) => { pushHistory(); state.project.trajectories = state.project.trajectories.filter((t) => t.id !== el.dataset.id); changed(false); },
    'trace-to-path': (el) => {
      try {
        const track = state.project.trajectories.find((t) => t.id === el.dataset.id), e = E.materializeTrajectory(state.project, track, state.samples);
        pushHistory(); state.project.elements.push(e); state.selected = e.id; state.mode = 'edit'; changed(false); $('#modal').close();
        toast('Vodiaca krivka je samostatný editovateľný prvok. Pôvodná trajektória zostala zachovaná.');
      } catch (error) { toast(error.message, true); }
    },
    'close-modal': () => $('#modal').close(),
    'rename': () => modal('Dajte nápadu meno.', `<form id="rename-form"><label class="property-field"><span>Názov projektu</span><input class="text-field" name="name" value="${escape(state.project.name)}" maxlength="80" required autofocus/></label><div class="modal-actions"><button class="button button-secondary" type="button" data-action="close-modal">Zrušiť</button><button class="button button-dark" type="submit">Premenovať</button></div></form>`),
    'load-template': (el) => replaceProject(K.preset(el.dataset.kind)),
    'load-saved': (el) => {
      try { const p = JSON.parse(localStorage.getItem(storageKey) || '[]').find((p) => p.id === el.dataset.id); replaceProject(K.validateProject(p)); } catch (error) { toast(error.message, true); }
    },
    'confirm-replace': () => { if (state.pendingProject) { loadProject(state.pendingProject, state.pendingImport); state.pendingProject = null; state.pendingImport = null; } },
    'undo': () => undo(),
    'redo': () => undo(true),
    'play': () => {
      if (!state.project.elements.length) return;
      if (state.mode === 'edit') setMode('simulate');
      if (!state.playing && state.result.blocked) { toast(`Pohon nemožno spustiť: ${state.result.issues[0]}`, true); return; }
      if (!state.playing && state.project.simulation.mode === 'dynamic') {
        if (!state.forceContext && !prepareForces(true)) return;
        if (!state.dynamic || state.dynamic.stopped) {
          state.dynamic = P.initialState(state.forceContext, state.motion);
          state.dynamicHistory = [{ ...state.dynamic }];
        }
      }
      const range = K.driveRange(state.project);
      if (state.motion >= range.max - 0.01) state.direction = -1;
      if (state.motion <= range.min + 0.01) state.direction = 1;
      state.playing = !state.playing; lastFrame = 0; updateMotion();
    },
    'reset': () => { state.direction = 1; setMotion(K.driveRange(state.project).min); },
    'phase': (el) => setMotion(Number(el.dataset.value)),
    'loop': () => { state.loop = !state.loop; updateToolbar(); },
    'grid': () => { state.grid = !state.grid; renderScene(); updateToolbar(); },
    'dimensions': () => { state.dimensions = !state.dimensions; renderScene(); updateToolbar(); if (state.analysis) renderInspector(); },
    'ghosts': () => { state.ghosts = !state.ghosts; renderScene(); updateToolbar(); if (state.analysis) renderInspector(); },
    'trace': () => { state.trace = !state.trace; renderScene(); renderGraph(); renderInspector(); updateToolbar(); },
    'collisions': () => { state.collisions = !state.collisions; recalculate(false); renderInspector(); },
    'trace-pick': traceModal,
    'trace-space': (el) => {
      state.traceSpace = el.dataset.space === 'carrier' ? 'carrier' : 'world';
      renderScene(); renderInspector();
      if ($('#modal').open && $('[data-trace-mode]', $('#modal'))) {
        const form = $('#trace-form'), element = form?.elements.element.value, point = form?.elements.point.value;
        traceModal();
        if (element) $('#trace-form').elements.element.value = element;
        if (point) $('#trace-form').elements.point.value = point;
      }
    },
    'tool-select': () => setTool('select'),
    'tool-pan': () => setTool('pan'),
    'tool-connect': () => { $('#modal').close(); setMode('edit'); setTool('connect'); },
    'tool-measure': () => setTool('measure'),
    'fit': () => { fitView(); renderScene(); },
    'zoom-in': () => zoom(0.8),
    'zoom-out': () => zoom(1.25),
    'select': (el) => selectElement(el.dataset.id),
    'visibility': (el) => { const e = state.project.elements.find((e) => e.id === el.dataset.id); if (e) { pushHistory(); e.visible = !e.visible; changed(false); } },
    'view-editor': () => { state.analysis = false; updateToolbar(); renderInspector(); requestAnimationFrame(() => { fitView(); renderScene(); }); },
    'view-analysis': () => { state.analysis = true; updateToolbar(); renderInspector(); requestAnimationFrame(() => { fitView(); renderScene(); }); if (window.innerWidth < 900) $('.inspector').classList.add('mobile-open'); },
    'sidebar-elements': () => { state.sidebarTab = 'elements'; renderTree(); },
    'sidebar-joints': () => { state.sidebarTab = 'joints'; renderTree(); },
    'inspector-geometry': () => { state.inspectorTab = 'geometry'; renderInspector(); },
    'inspector-joints': () => { state.inspectorTab = 'joints'; renderInspector(); },
    'toggle-inspector': () => { if (window.innerWidth < 900) $('.inspector').classList.toggle('mobile-open'); else $('.workspace').classList.toggle('inspector-hidden'); requestAnimationFrame(() => { fitView(); renderScene(); }); },
    'toggle-sidebar': () => $('.sidebar').classList.toggle('mobile-open'),
    'add-menu': () => {
      if (state.sidebarTab === 'joints') { setTool('connect'); return; }
      modal('Pridať prvok do modelu', `<div class="add-component-grid">${K.TYPES.map((type) => `<button data-action="add-component" data-type="${type}"><span class="component-symbol ${type}">${icon(typeIcons[type], 26)}</span><span>${escape(typeNames[type])}</span>${icon('plus', 16)}</button>`).join('')}</div>`);
    },
    'add-component': (el) => { addElement(el.dataset.type); $('#modal').close(); },
    'duplicate': () => { duplicateElement(); $('#modal').close(); },
    'delete': deleteElement,
    'lock-selected': () => { const e = currentElement(); if (e && !e.primary) { pushHistory(); e.locked = !e.locked; if (e.locked) e.drive = false; changed(false); } },
    'drive-selected': () => {
      const e = currentElement();
      if (!e || e.primary) return;
      pushHistory(); e.drive = !e.drive;
      if (e.drive) {
        e.locked = false;
        for (const other of state.project.elements) if (other.id !== e.id && !other.primary) other.drive = false;
      }
      state.motion = K.driveRange(state.project).min;
      changed(true);
    },
    'element-menu': elementModal,
    'delete-joint': (el) => {
      const joint = state.project.connections.find((j) => j.id === el.dataset.id);
      if (!joint || joint.builtin) return;
      pushHistory();
      if (joint.a.point === 'curve' || joint.b.point === 'curve') {
        const bearingId = joint.a.point === 'curve' ? joint.b.elementId : joint.a.elementId;
        const bearing = state.project.elements.find((e) => e.id === bearingId);
        if (bearing && !bearing.primary) bearing.slotId = '';
      }
      state.project.connections = state.project.connections.filter((j) => j.id !== joint.id);
      for (const d of state.project.dimensions) if (d.constraintId === joint.id) d.constraintId = '';
      changed(false); toast('Väzba bola odstránená.');
    },
  };

  function onPropertyChange(input) {
    const key = input.dataset.property, scope = input.dataset.scope, value = Number(input.value);
    if (!input.value.trim() || !Number.isFinite(value) || !input.checkValidity()) { toast('Zadajte platnú hodnotu v povolenom rozsahu.', true); renderInspector(); return; }
    const next = K.copy(state.project);
    if (scope === 'control') {
      if (!next.controls) next.controls = K.defaultControls(next.parameters);
      const [i, axis] = key.split('-'); next.controls[Number(i)][axis] = value;
    } else if (scope === 'element-control') {
      const [i, axis] = key.split('-');
      next.elements.find((e) => e.id === state.selected).controls[Number(i)][axis] = value;
    } else if (scope === 'local-c') {
      next.elements.find((e) => e.id === state.selected).localC[key] = value;
    } else if (scope === 'element') {
      const element = next.elements.find((e) => e.id === state.selected);
      element[key] = value;
      if (state.mode !== 'edit' && !element.parentId && (key === 'x' || key === 'y' || key === 'angle')) {
        const pose = selectedPose();
        if (pose) { if (key !== 'x') element.x = pose.a.x; if (key !== 'y') element.y = pose.a.y; if (key !== 'angle' && !element.drive) element.angle = pose.angle; }
      }
    } else {
      next.parameters[key] = scope === 'diameter' ? value / 2 : value;
      if (key === 'travelMax' || key === 'travelMin') next.parameters.turnStart = K.clamp(next.parameters.turnStart, next.parameters.travelMin, next.parameters.travelMax - 1);
    }
    try { K.validateProject(next); } catch (error) { toast(error.message, true); renderInspector(); return; }
    pushHistory(); state.project = next; state.playing = false; changed(false);
  }

  function onChange(event) {
    const input = event.target;
    if (input.hasAttribute('data-trace-mode')) {
      state.traceMode = input.value === 'bearings' ? 'bearings' : 'single';
      state.trace = true; renderScene(); renderGraph(); renderInspector(); updateToolbar();
      return;
    }
    if (input.dataset.property) { onPropertyChange(input); return; }
    if (input.id === 'speed') { state.speed = Number(input.value); applyPreferences(state, true); }
    if (input.id === 'graph-mode') {
      state.graphMode = input.value === 'force' ? 'force' : 'angle'; renderGraph(); renderInspector();
    }
    if (['mount-a', 'mount-b', 'force-mode'].includes(input.id)) {
      const next = K.copy(state.project), e = next.elements.find((v) => v.id === state.selected);
      if (input.id === 'force-mode') e.forceMode = input.value;
      else {
        const key = input.id === 'mount-a' ? 'a' : 'b';
        e[key === 'a' ? 'mountA' : 'mountB'] = parseReference(input.value);
        next.connections = next.connections.filter((j) => !((j.a.elementId === e.id && j.a.point === key) || (j.b.elementId === e.id && j.b.point === key)));
      }
      try { applyProject(next); } catch (error) { toast(error.message, true); renderInspector(); }
    }
    if (input.id === 'motion-value') {
      if (!input.value.trim() || !input.checkValidity()) { toast('Poloha musí byť v rozsahu pohonu.', true); input.value = state.motion.toFixed(1); return; }
      setMotion(Number(input.value));
    }
    if (input.id === 'curve-kind') {
      pushHistory(); state.project.parameters.curveKind = input.value;
      state.project.controls = null; changed(false);
    }
    if (input.id === 'bearing-slot') {
      pushHistory(); currentElement().slotId = input.value; changed(false);
    }
    if (input.id === 'element-curve-kind') {
      const next = K.copy(state.project), e = next.elements.find((v) => v.id === state.selected);
      e.curveKind = input.value;
      if (e.curveKind !== 'polyline' && (e.controls.length > 32 || e.controls.length < 4)) {
        const count = e.curveKind === 'bezier' ? 4 : e.curveKind === 'arc' ? 2 : 13;
        e.controls = Array.from({ length: count }, (_, i) => K.copy(e.controls[Math.round(i / (count - 1) * (e.controls.length - 1))]));
      }
      try { applyProject(next); } catch (error) { toast(error.message, true); renderInspector(); }
    }
    if (input.id === 'drive-mode') {
      const next = K.copy(state.project);
      next.elements.find((v) => v.id === state.selected).driveMode = input.value;
      try { applyProject(next); } catch (error) { toast(error.message, true); renderInspector(); }
    }
    if (input.id === 'parent-body') {
      const next = K.copy(state.project), e = next.elements.find((v) => v.id === state.selected), pose = state.result.poses[e.id];
      const origin = pose.controlOrigin || pose.a;
      if (input.value) {
        const parent = state.result.poses[input.value], local = K.localPoint(parent, origin);
        e.x = local.x; e.y = local.y; e.angle = pose.angle - parent.angle;
        e.parentId = input.value; e.parentPoint = 'a'; e.drive = false;
      } else { e.parentId = ''; e.x = origin.x; e.y = origin.y; e.angle = pose.angle; }
      try { applyProject(next); } catch (error) { toast(error.message, true); renderInspector(); }
    }
    if (input.id === 'trace-selected') {
      state.traceMode = 'single'; state.trace = input.checked; state.traceRef = { elementId: state.selected, point: $('#trace-point').value };
      renderScene(); renderGraph(); renderInspector(); updateToolbar();
    }
    if (input.id === 'trace-point') {
      state.traceMode = 'single'; state.trace = true; state.traceRef = { elementId: state.selected, point: input.value };
      renderScene(); renderGraph(); renderInspector(); updateToolbar();
    }
  }

  async function onSubmit(event) {
    const form = event.target;
    if (!['rename-form', 'settings-form', 'trace-form', 'element-name-form', 'joint-form', 'dimension-form', 'geometry-form', 'saved-trace-form', 'com-form', 'fusion-form'].includes(form.id)) return;
    event.preventDefault();
    const data = new FormData(form);
    if (form.id === 'fusion-form') {
      if (!data.has('consent')) { toast('Najprv potvrďte vytvorenie nového CAD dokumentu.', true); return; }
      const button = $('button[type="submit"]', form);
      if (button.disabled) return;
      button.disabled = true;
      try {
        const snapshot = X.cadSnapshot(state.project, state.result, { dimensions: state.dimensions, trajectories: state.trace, samples: state.samples, references: traceReferences(), traceSpace: state.traceSpace });
        await CAD.send(snapshot, String(data.get('key')), (message) => { if ($('#fusion-status')) $('#fusion-status').textContent = message; });
        if ($('#fusion-status')) $('#fusion-status').textContent = 'Fusion potvrdil vytvorenie nového referenčného výkresu.';
        toast('Nový referenčný výkres bol vytvorený vo Fusion.');
      } catch (error) { if ($('#fusion-status')) $('#fusion-status').textContent = error.message; }
      finally { if (button.isConnected) button.disabled = false; }
      return;
    }
    if (['joint-form', 'dimension-form', 'geometry-form', 'saved-trace-form', 'com-form'].includes(form.id)) {
      try {
        const next = K.copy(state.project);
        if (form.id === 'com-form') next.elements.find((e) => e.id === state.selected).com = data.has('automatic') ? null : { x: Number(data.get('x')), y: Number(data.get('y')) };
        if (form.id === 'joint-form') {
          const type = String(data.get('type')), a = parseReference(String(data.get('a'))), b = parseReference(String(data.get('b')));
          const record = { id: form.dataset.id || K.uid(), name: String(data.get('name')).trim(), type, a, b, value: ['parallel', 'revolute', 'point-path'].includes(type) ? 0 : Number(data.get('value')), builtin: false };
          if (next.kind !== 'custom' && [a, b].every((r) => next.elements.find((e) => e.id === r?.elementId)?.primary)) throw new Error('Na úpravu dvoch parametrických prvkov vytvorte voľnú kópiu.');
          if (form.dataset.id) next.connections = next.connections.map((j) => j.id === form.dataset.id ? record : j);
          else next.connections.push(record);
        }
        if (form.id === 'dimension-form') {
          const previous = next.dimensions.find((d) => d.id === form.dataset.id);
          const a = data.get('a') === 'world-a' ? previous.a : parseReference(String(data.get('a')));
          const b = data.get('b') === 'world-b' ? previous.b : parseReference(String(data.get('b')));
          const record = { ...E.makeDimension(state.result, a, b, String(data.get('type')), Number(data.get('offset'))), id: previous?.id || K.uid(), name: String(data.get('name')).trim(), control: null };
          if (previous?.constraintId) next.connections = next.connections.filter((j) => j.id !== previous.constraintId);
          if (data.has('driving')) {
            if (record.type !== 'distance' || !a.elementId || !b.elementId) throw new Error('Riadiaca kóta musí byť dĺžka medzi uzlami telies.');
            const value = Number(data.get('value'));
            if (a.elementId === b.elementId) {
              const e = next.elements.find((v) => v.id === a.elementId);
              if (e.primary || K.isElastic(e) || ![a.point, b.point].includes('a')) throw new Error('Tento rozmer nemožno riadiť priamo. Upravte ho v geometrii prvku.');
              const end = a.point === 'a' ? b.point : a.point;
              const property = end === 'c' && e.type === 'rail' ? 'stroke' : end === 'b' && e.type !== 'slot' ? 'length' : null;
              if (!property) throw new Error('Riadiaca kóta podporuje dĺžku A–B alebo zdvih vedenia A–C.');
              e[property] = value; record.control = { elementId: e.id, property };
            } else {
              record.constraintId = previous?.constraintId || K.uid();
              next.connections.push({ id: record.constraintId, name: record.name || 'Riadiaca kóta', a, b, type: 'distance', value, builtin: false });
            }
          }
          if (previous) next.dimensions = next.dimensions.map((d) => d.id === previous.id ? record : d);
          else next.dimensions.push(record);
        }
        if (form.id === 'geometry-form') {
          const outline = form.dataset.outline === 'true', e = next.elements.find((v) => v.id === state.selected);
          const points = String(data.get('points')).trim().split(/\r?\n/).filter((line) => line.trim()).map((line) => {
            const axes = line.trim().split(';');
            if (axes.length !== 2 || axes.some((v) => !v.trim() || !Number.isFinite(Number(v.trim().replace(',', '.'))))) throw new Error('Každý riadok musí obsahovať dve čísla oddelené bodkočiarkou: X;Y.');
            return { x: Number(axes[0].trim().replace(',', '.')), y: Number(axes[1].trim().replace(',', '.')) };
          });
          e[outline ? 'outline' : 'controls'] = points;
        }
        if (form.id === 'saved-trace-form') {
          const record = { id: form.dataset.id || K.uid(), name: String(data.get('name')).trim(), reference: parseReference(String(data.get('reference'))), color: String(data.get('color')), space: String(data.get('space')), visible: data.has('visible') };
          if (form.dataset.id) next.trajectories = next.trajectories.map((t) => t.id === form.dataset.id ? record : t);
          else next.trajectories.push(record);
          state.trace = true;
        }
        applyProject(next); $('#modal').close();
      } catch (error) { toast(error.message, true); }
      return;
    }
    if (form.id === 'rename-form' || form.id === 'element-name-form') {
      const name = String(data.get('name') || '').trim();
      if (!name) { toast('Zadajte názov.', true); return; }
      pushHistory();
      if (form.id === 'rename-form') state.project.name = name; else currentElement().name = name;
      changed(false);
    }
    if (form.id === 'settings-form') {
      const next = K.copy(state.project);
      next.simulation.mode = data.get('simulation-mode') === 'dynamic' ? 'dynamic' : 'kinematic';
      for (const key of ['gravity', 'damping', 'friction', 'inputForce', 'initialVelocity', 'duration']) next.simulation[key] = Number(data.get(key));
      try { K.validateProject(next); } catch (error) { toast(error.message, true); return; }
      state.cycle = K.clamp(Number(data.get('cycle')), 1, 60);
      state.snap = data.has('snap'); state.collisions = data.has('collisions');
      state.forceArrows = data.has('forceArrows');
      state.theme = String(data.get('theme'));
      applyPreferences(state, true);
      applyProject(next);
    }
    if (form.id === 'trace-form') {
      const ref = { elementId: String(data.get('element')), point: String(data.get('point')) };
      if (!state.result.poses[ref.elementId]?.[ref.point]) { toast('Tento prvok nemá zvolený uzlový bod. Vyberte začiatok alebo koniec.', true); return; }
      state.traceRef = ref; state.traceMode = 'single'; state.trace = true;
      renderScene(); renderGraph(); renderInspector(); updateToolbar();
    }
    $('#modal').close();
  }

  function onKeyboard(event) {
    if ($('#modal').open || event.target.closest('input,select,textarea,[contenteditable]')) return;
    const key = event.key.toLowerCase(), modifier = event.ctrlKey || event.metaKey;
    if (modifier && key === 's') { event.preventDefault(); saveProject(); }
    else if (modifier && key === 'z') { event.preventDefault(); undo(event.shiftKey); }
    else if (modifier && key === 'y') { event.preventDefault(); undo(true); }
    else if (modifier && key === 'd') { event.preventDefault(); duplicateElement(); }
    else if (modifier) return;
    else if (event.code === 'Space') { event.preventDefault(); actions.play(); }
    else if (key === 'v') setTool('select');
    else if (key === 'h') setTool('pan');
    else if (key === 'j') setTool('connect');
    else if (key === 'm') setTool('measure');
    else if (key === 'f') { fitView(); renderScene(); }
    else if (key === 'delete' || key === 'backspace') { event.preventDefault(); deleteElement(); }
    else if (key === 'escape') { if (state.drag) onPointerUp({ pointerId: state.drag.pointerId, cancelled: true }); setTool('select'); $('.inspector').classList.remove('mobile-open'); $('.sidebar').classList.remove('mobile-open'); }
    else if (key === 'arrowright' || key === 'arrowleft') { event.preventDefault(); setMotion(state.motion + (key === 'arrowright' ? 1 : -1) * (event.shiftKey ? 10 : 1)); }
  }

  function animate(time) {
    if (state.playing && !document.hidden) {
      const delta = lastFrame ? Math.min((time - lastFrame) / 1000, 0.06) : 0;
      if (state.project.simulation.mode === 'dynamic' && state.dynamic && state.forceContext) {
        try {
          state.dynamic = P.step(state.forceContext, state.dynamic, Math.min(.25, delta * state.speed));
          if (state.dynamicHistory.length < 2400 && delta > 0) state.dynamicHistory.push({ ...state.dynamic });
          setMotion(state.dynamic.motion, false);
          if (state.dynamic.stopped) { state.playing = false; updateMotion(); toast(state.dynamic.reason, true); }
        } catch (error) { state.playing = false; toast(error.message, true); updateMotion(); }
        if (state.analysis && time - lastInspector > 750) { renderInspector(); lastInspector = time; }
        lastFrame = time; requestAnimationFrame(animate); return;
      }
      const range = K.driveRange(state.project);
      let next = state.motion + delta * state.speed * (range.max - range.min) / state.cycle * state.direction;
      const reachedEnd = next >= range.max || next <= range.min;
      next = K.clamp(next, range.min, range.max);
      // Don't jump over a known blocked sample at high playback speeds.
      const samples = state.direction > 0 ? state.samples : [...state.samples].reverse();
      const blocked = samples.find((s) => s.blocked && s.motion >= Math.min(state.motion, next) && s.motion <= Math.max(state.motion, next));
      setMotion(blocked?.motion ?? next, false);
      if (state.playing && reachedEnd) {
        if (state.loop) state.direction *= -1; else { state.playing = false; updateMotion(); }
      }
      if (state.analysis && time - lastInspector > 750) { renderInspector(); lastInspector = time; }
    }
    lastFrame = time;
    requestAnimationFrame(animate);
  }

  function wireEvents() {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (button && !button.disabled) { actions[button.dataset.action]?.(button); return; }
      const component = event.target.closest('[data-component]');
      if (component) addElement(component.dataset.component);
    });
    document.addEventListener('change', onChange);
    document.addEventListener('submit', onSubmit);
    document.addEventListener('keydown', onKeyboard);
    $('#motion-range').addEventListener('input', (event) => setMotion(Number(event.target.value)));
    const svg = $('#mechanism-canvas');
    svg.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointermove', onPointerMove);
    svg.addEventListener('pointerup', onPointerUp);
    svg.addEventListener('pointercancel', onPointerUp);
    svg.addEventListener('lostpointercapture', (event) => { if (state.drag) onPointerUp({ pointerId: event.pointerId, cancelled: true }); });
    svg.addEventListener('selectstart', (event) => event.preventDefault());
    svg.addEventListener('dragstart', (event) => event.preventDefault());
    svg.addEventListener('wheel', (event) => { event.preventDefault(); zoom(event.deltaY > 0 ? 1.08 : 0.925, worldPoint(event)); }, { passive: false });
    $('#palette').addEventListener('dragstart', (event) => {
      const component = event.target.closest('[data-component]');
      if (!component) return;
      event.dataTransfer.setData('application/x-kinematika-element', component.dataset.component);
      event.dataTransfer.effectAllowed = 'copy';
    });
    const area = $('#canvas-area');
    area.addEventListener('dragover', (event) => {
      if (!event.dataTransfer.types.includes('application/x-kinematika-element')) return;
      event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; area.classList.add('drop-active');
    });
    area.addEventListener('dragleave', (event) => { if (!area.contains(event.relatedTarget)) area.classList.remove('drop-active'); });
    area.addEventListener('drop', (event) => {
      event.preventDefault(); area.classList.remove('drop-active');
      const type = event.dataTransfer.getData('application/x-kinematika-element');
      if (K.TYPES.includes(type)) addElement(type, worldPoint(event));
    });
    $('#import-file').addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        if (file.size > 2 * 1024 * 1024) throw new Error('Projekt je príliš veľký. Limit je 2 MB.');
        const imported = X.parseNative(await file.text());
        replaceProject(imported.project, imported);
      } catch (error) { toast(error.message || 'Projekt sa nepodarilo importovať.', true); }
      event.target.value = '';
    });
    const graph = $('#motion-graph');
    graph.addEventListener('pointermove', (event) => {
      const rect = graph.getBoundingClientRect();
      const t = K.clamp(((event.clientX - rect.left) / rect.width * 800 - 43) / 717, 0, 1);
      const sample = state.samples[Math.round(t * (state.samples.length - 1))];
      const tooltip = $('#graph-tooltip');
      tooltip.hidden = false;
      tooltip.textContent = state.graphMode === 'force' && state.forceContext
        ? `${fmt(sample.motion)} ${sample.range.unit} → ${fmt(P.generalized(state.forceContext, sample.motion).handForce, 2)} ${sample.range.unit === '°' ? 'N·m' : 'N'} · odhad`
        : `${fmt(sample.motion)} ${sample.range.unit} → ${fmt(sample.angle)}°${sample.blocked ? ' · blokovanie' : ''}`;
      tooltip.style.left = `${K.clamp(event.clientX - rect.left, 75, rect.width - 75)}px`;
    });
    graph.addEventListener('pointerleave', () => { $('#graph-tooltip').hidden = true; });
    graph.addEventListener('click', (event) => {
      const rect = graph.getBoundingClientRect(), range = K.driveRange(state.project);
      const t = K.clamp(((event.clientX - rect.left) / rect.width * 800 - 43) / 717, 0, 1);
      setMotion(K.lerp(range.min, range.max, t));
    });
    $('#modal').addEventListener('click', (event) => { if (event.target === $('#modal')) { const r = event.target.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) event.target.close(); } });
    document.addEventListener('visibilitychange', () => { lastFrame = 0; });
    window.addEventListener('beforeunload', () => { if (state.dirty) saveProject(true); });
    let resizeTimer;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { fitView(); renderScene(); }, 150); });
  }

  buildShell();
  applyPreferences(state);
  recalculate(true);
  renderTree(); renderInspector(); updateHeader(); updateToolbar();
  wireEvents();
  requestAnimationFrame(animate);
})();
