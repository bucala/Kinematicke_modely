(function () {
  'use strict';

  const K = globalThis.Kinematics;
  const DD = globalThis.DoubleDrawer;
  const E = globalThis.KinmoEditor;
  const P = globalThis.KinmoPhysics;
  const X = globalThis.KinmoExport;
  const SC = globalThis.KinmoScene;
  const G = globalThis.KinmoGIF;
  const CAD = globalThis.KinmoCad;
  const I = globalThis.KinmoInteraction;
  const W = globalThis.KinmoWorkbench;
  const M = globalThis.KinmoMagicImport;
  const AD = globalThis.KinmoDetection;
  const WF = globalThis.KinmoWorkflow;
  const CM = globalThis.KinmoContextMenu;
  const $ = (selector, root = document) => root.querySelector(selector);
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (value, digits = 1) => Number.isFinite(value) ? value.toLocaleString('sk-SK', { maximumFractionDigits: digits, minimumFractionDigits: 0 }) : '—';
  const svgNS = 'http://www.w3.org/2000/svg';
  const storageKey = 'kinematika.projects.v1';
  const lastKey = 'kinematika.last.v1';
  const settingsKey = 'kinematika.settings.v2';
  const collectionKeys = Object.freeze({ assembly: 'kinematika.assemblies.v1', revision: 'kinematika.revisions.v1' });
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
    free: '<path d="M4 4h16v16H4zM4 10h16M10 4v16M3 21 21 3"/>',
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
    fit: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
    chart: '<path d="M3 3v18h18M6 15l4-5 4 3 6-8"/>',
    text: '<path d="M4 5h16M12 5v14M8 19h8M4 5v3m16-3v3"/>',
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
    cam: '<path d="M16 3c6 3 7 11 2 16-4 4-12 2-14-4-2-5 3-9 7-9 2 0 2-4 5-3Z"/><circle cx="11" cy="13" r="2"/>',
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
    ground: 'Pevný rám', rail: 'Lineárne vedenie', link: 'Tiahlo / rameno', slot: 'Zakrivená kulisa', cam: 'Rotačná vačka', bearing: 'Čap / ložisko', node: 'Voľný uzol', panel: 'Sklápacie čelo',
    'spring-compression': 'Tlačná pružina', 'spring-extension': 'Ťažná pružina', 'piston-push': 'Tlačný piest', 'piston-pull': 'Ťažný piest',
  };
  const typeIcons = { ground: 'ground', rail: 'rail', link: 'arm', slot: 'slot', cam: 'cam', bearing: 'bearing', node: 'target', panel: 'panel', 'spring-compression': 'spring', 'spring-extension': 'spring', 'piston-push': 'piston', 'piston-pull': 'piston' };
  const typeCodes = { ground: 'G', rail: 'P', link: 'L', slot: 'C', cam: 'V', bearing: 'B', node: 'N', panel: 'F', 'spring-compression': 'S−', 'spring-extension': 'S+', 'piston-push': 'P+', 'piston-pull': 'P−' };
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
    selectedElementIds: initialSelection ? [I.elementKey(initialSelection)] : [], hoveredTargetId: null,
    contextMenuState: { isOpen: false, x: 0, y: 0, targetId: null, targetType: 'canvas' },
    motion: K.driveRange(initialProject).min, playing: false, direction: 1, speed: 1, loop: true, cycle: 6,
    mainDimensions: false, grid: true, dimensions: true, ghosts: true, trace: true, labels: true, profileVisible: false, timelineVisible: false, collisions: true, snap: true, angleSnap: false,
    traceRef: initialProject.kind === DD.KIND ? { elementId: 'bearing-1', point: 'a' } : { elementId: initialSelection || '', point: K.defaultTracePoint(initialProject.elements.find((e) => e.id === initialSelection)) },
    traceMode: initialProject.kind === DD.KIND ? 'bearings' : 'single', traceSpace: 'world',
    tool: 'select', sidebarTab: 'elements', inspectorTab: 'geometry', inspectorOpen: false, analysis: false,
    mode: initialProject.kind === 'custom' ? 'edit' : 'simulate',
    forceContext: null, forceCurve: [], forceError: '', dynamic: null, dynamicHistory: [], graphMode: 'angle', forceArrows: true,
    history: [], future: [], historySelections: [], futureSelections: [], dirty: false, saved: !!loaded, storageFailed: false, view: null, baseView: null,
    pendingJoint: null, dimensionPick: null, measure: null, drag: null, pointer: { x: 0, y: 0 }, samples: [], result: null, profile: null,
    editPivot: null, diagnosticRows: [], diagnosticsOpen: false, diagnosticAnalysis: null,
    smartSnap: false, snapPreview: null, pendingSnap: null, draggedPaletteType: null, insertingType: null, placementMount: null, placementPreview: null, snapSuppressed: false, snapTransaction: null,
    pendingCollectionDelete: null, pendingRevisionId: null, revisionScope: 'current', assemblyInsertPoint: null,
    showFreedom: false, freedomCache: null, trial: null, trialBlock: null, planTime: 0, pendingImpact: null, cadSlotOutlines: true, magic: null, gifExport: null,
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
  let toastTimer, autosaveTimer, lastFrame = 0, lastInspector = 0, latestSVG = '', contextMenu;

  function toast(message, warning = false) {
    const el = $('#toast');
    el.innerHTML = `${icon(warning ? 'warning' : 'check', 17)}<span>${escape(message)}</span>`;
    el.className = `show${warning ? ' warning' : ''}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = ''; }, warning ? 6500 : 3500);
  }

  function saveProject(silent = false) {
    if (state.magic) {
      if (!silent) toast('Rozpracovanú schému dokončite tlačidlom Finish alebo exportujte jej geometriu.', true);
      return false;
    }
    try {
      let projects = readProjects();
      projects = projects.filter((p) => p.id !== state.project.id);
      projects.unshift(K.validateProject(state.project));
      if (projects.length > 20) throw new Error('Úložisko obsahuje 20 projektov. Vymažte nepotrebný projekt alebo exportujte nový do .kinmo; žiadny starší projekt sa nevymazal.');
      localStorage.setItem(storageKey, JSON.stringify(projects));
      localStorage.setItem(lastKey, state.project.id);
      state.dirty = false; state.saved = true; state.storageFailed = false;
      updateHeader();
      if (!silent) toast('Projekt bol uložený v tomto prehliadači.');
      return true;
    } catch (error) {
      state.storageFailed = true;
      updateHeader();
      if (!silent) toast(error.message || 'Lokálne úložisko nie je dostupné. Uložte projekt do súboru .kinmo.', true);
      return false;
    }
  }

  function pushHistory() {
    if (state.magic) {
      const frames = state.magic.historyScales ||= [];
      frames.length = state.history.length;
      frames.push(K.copy({ scale: state.magic.scale, points: state.magic.scale ? [state.magic.scale.a, state.magic.scale.b] : state.magic.points, distanceInput: state.magic.scale?.distance ?? state.magic.distanceInput, scaleAxis: state.magic.scale?.axis ?? state.magic.scaleAxis }));
      state.magic.futureScales = [];
      if (frames.length > 60) frames.shift();
    }
    automaticVersion();
    state.history.push(K.copy(state.project));
    state.historySelections.push([...state.selectedElementIds]);
    if (state.history.length > 60) { state.history.shift(); state.historySelections.shift(); }
    state.future = []; state.futureSelections = [];
  }

  function changed(refit = false) {
    if (state.magic) state.magic.geometryStarted = true;
    repairSelection();
    state.dirty = true;
    recalculate(refit);
    renderTree(); renderInspector(); updateHeader(); updateToolbar();
    clearTimeout(autosaveTimer);
    if (!state.magic) autosaveTimer = setTimeout(() => saveProject(true), 1400);
  }

  function undo(redo = false) {
    closeContextMenu();
    dismissSnapChoices();
    cancelDimensionPick();
    const from = redo ? state.future : state.history, to = redo ? state.history : state.future;
    if (!from.length) return;
    if (state.magic) {
      const sourceFrames = redo ? state.magic.futureScales ||= [] : state.magic.historyScales ||= [];
      const targetFrames = redo ? state.magic.historyScales ||= [] : state.magic.futureScales ||= [];
      targetFrames.length = to.length;
      targetFrames.push(K.copy({ scale: state.magic.scale, points: state.magic.points, distanceInput: state.magic.distanceInput, scaleAxis: state.magic.scaleAxis }));
      const frame = sourceFrames[from.length - 1];
      sourceFrames.length = from.length - 1;
      if (frame) Object.assign(state.magic, K.copy(frame));
    }
    const fromSelections = redo ? state.futureSelections : state.historySelections, toSelections = redo ? state.historySelections : state.futureSelections;
    toSelections.push([...state.selectedElementIds]);
    to.push(K.copy(state.project)); state.project = from.pop();
    state.selectedElementIds = fromSelections.pop() || []; repairSelection();
    if (!state.project.elements.some((e) => e.id === state.traceRef.elementId)) state.traceRef = defaultTraceReference();
    state.playing = false;
    changed(false);
  }

  function currentElement() { return state.project.elements.find((e) => e.id === state.selected); }
  function selectedPose() { return state.result?.poses[state.selected]; }

  function recalculate(refit = false) {
    state.sweepAnalysis = null;
    state.forceContext = null; state.forceCurve = []; state.forceError = ''; state.dynamic = null; state.guidePositions = null; state.dynamicHistory = [];
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
      : K.solve(state.project, state.motion, { profile: state.profile, collisions: state.collisions, elasticPositions: P.elasticPositions(state.dynamic), bodyPositions: { ...P.bodyPositions(state.dynamic), ...state.guidePositions },softContact:state.project.connections.some(j=>j.contact?.enabled),strokeTolerance:state.project.simulation.softStops?2:0 });
  }

  function prepareForces(notify = false, returning = false) {
    try {
      if(state.result?.blocked && state.project.elements.some((e)=>K.isElastic(e)&&e.rangeMode!=='manual')) {
        const next=K.fitElasticRanges(K.copy(state.project),null,state.result);
        if(JSON.stringify(next)!==JSON.stringify(state.project)){const dynamic=state.dynamic;applyProject(next);state.dynamic=dynamic;state.result=solveCurrent();}
      }
      state.forceContext = P.prepare(state.project, { motion: state.motion, profile: state.profile, samples: state.samples, collisions: state.collisions, returning, elasticPositions: P.elasticPositions(state.dynamic), bodyPositions: P.bodyPositions(state.dynamic) });
      state.forceCurve = P.forceCurve(state.forceContext); state.forceError = '';
      return true;
    } catch (error) {
      state.forceContext = null; state.forceCurve = []; state.forceError = error.message;
      if (notify) toast(error.message, true);
      return false;
    }
  }

  function setMode(mode) {
    if (state.trial && mode === 'edit') { state.trial = null; state.trialBlock = null; }
    state.playing = false; state.mode = mode;
    state.pendingJoint = null; state.dimensionPick = null; state.measure = null; state.tool = 'select';
    if (mode === 'edit') state.motion = K.driveRange(state.project).min;
    recalculate(false); renderInspector(); updateToolbar();
  }

  function applyPreferences(value, persist = false) {
    Object.assign(state, X.preferences(value));
    document.documentElement.dataset.theme = state.theme;
    document.querySelector('meta[name="theme-color"]').content = ({slate:'#f8fafc',sage:'#f9f9fb',steel:'#f4f6f8',sand:'#fafafa',dark:'#0f172a'})[state.theme];
    if ($('#speed')) $('#speed').value = String(state.speed);
    if (persist && !state.magic) {
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
    closeContextMenu();
    const rect = $('#mechanism-canvas')?.getBoundingClientRect();
    const b = state.magic?.image ? magicBounds() : K.bounds(state.project, state.samples);
    const ref = state.project.importReference;
    if (!state.magic && ref?.visible) { const r = ref.frames[ref.active].rect, x = Math.min(b.x, r.x), y = Math.min(b.y, r.y); b.width = Math.max(b.x + b.width, r.x + r.width) - x; b.height = Math.max(b.y + b.height, r.y + r.height) - y; b.x = x; b.y = y; }
    if(state.mainDimensions&&!state.magic){const margin=Math.max(b.width,b.height)*.08;b.x-=margin;b.y-=margin;b.width+=margin*2;b.height+=margin*2;}
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

  function updateInspectorVisibility() {
    $('#workspace').classList.toggle('inspector-hidden', !state.inspectorOpen);
    $('#properties-panel').hidden = !state.inspectorOpen;
    const button = $('[data-action="toggle-inspector"]');
    button.classList.toggle('is-active', state.inspectorOpen);
    button.setAttribute('aria-expanded', state.inspectorOpen);
    button.setAttribute('aria-label', state.inspectorOpen ? 'Skryť vlastnosti' : 'Zobraziť vlastnosti');
    button.title = state.inspectorOpen ? 'Skryť vlastnosti' : 'Zobraziť vlastnosti';
  }

  function setInspectorOpen(open) {
    state.inspectorOpen = open;
    if (!open && $('#properties-panel').contains(document.activeElement)) $('[data-action="toggle-inspector"]').focus();
    if (open) renderInspector();
    updateInspectorVisibility();
    fitView(); renderScene();
  }

  function updatePanelVisibility() {
    for (const [key, id, name] of [['profileVisible', 'motion-profile-panel', 'pohybový profil'], ['timelineVisible', 'playback-panel', 'prehrávanie časovej osi']]) {
      const panel = $(`#${id}`), button = $(`[data-action="${key}"]`);
      if (!state[key] && panel.contains(document.activeElement)) button.focus();
      panel.hidden = !state[key];
      button.classList.toggle('is-active', state[key]);
      button.setAttribute('aria-expanded', state[key]);
      button.setAttribute('aria-pressed', state[key]);
      const label = `${state[key] ? 'Skryť' : 'Zobraziť'} ${name}`;
      button.setAttribute('aria-label', label); button.title = label;
    }
    $('#mechanism-canvas').classList.toggle('labels-hidden', !state.labels);
    $('#canvas-area').classList.toggle('labels-hidden', !state.labels);
    const button = $('[data-action="labels"]'), label = `${state.labels ? 'Skryť' : 'Zobraziť'} texty, názvy a uhly schémy (kóty majú vlastný prepínač)`;
    button.setAttribute('aria-label', label); button.title = label;
  }

  function toggleViewPanel(key) {
    if (!['profileVisible', 'timelineVisible'].includes(key)) return;
    const canvas = $('#mechanism-canvas'), before = canvas.getBoundingClientRect();
    state[key] = !state[key];
    updateToolbar();
    const after = canvas.getBoundingClientRect();
    if (before.width > 0 && before.height > 0 && after.width > 0 && after.height > 0) {
      // Give the canvas more space without changing the user's zoom or centre.
      for (const name of ['view', 'baseView']) if (state[name]) {
        const v = state[name], width = v.width * after.width / before.width, height = v.height * after.height / before.height;
        state[name] = { x: v.x + (v.width - width) / 2, y: v.y + (v.height - height) / 2, width, height };
      }
    }
    renderScene();
  }

  function buildShell() {
    $('#app').innerHTML = `
      <header class="app-header">
        <div class="brand"><span class="brand-mark">${icon('mechanism', 27)}</span><span>kinematika<span class="brand-dot">.</span></span><span class="brand-studio">STUDIO</span></div>
        <div class="header-divider"></div>
        <button class="project-name" data-action="projects" title="Mechanizmy, šablóny a projekty" aria-haspopup="dialog"><span id="project-name">${escape(state.project.name)}</span>${icon('chevron', 14)}</button>
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
        <div class="context-right">
          <div class="history-controls">${ib('undo', 'undo', 'Späť (Ctrl+Z)')}${ib('redo', 'redo', 'Znova (Ctrl+Shift+Z)')}</div>
          <span class="units-tag">mm <span>/</span> °</span>
          ${ib('settings', 'settings', 'Nastavenia, vzhľad a export')}
          ${ib('warning', 'diagnostics', 'Diagnostika konkrétnych väzieb', false, 'aria-controls="diagnostics-panel" aria-expanded="false"')}
          <div class="panel-toggles" aria-label="Voliteľné panely">${ib('chart', 'profileVisible', 'Zobraziť pohybový profil', state.profileVisible, 'aria-controls="motion-profile-panel" aria-expanded="false" aria-pressed="false"')}${ib('play', 'timelineVisible', 'Zobraziť prehrávanie časovej osi', state.timelineVisible, 'aria-controls="playback-panel" aria-expanded="false" aria-pressed="false"')}</div>
          ${ib('panel', 'toggle-inspector', 'Zobraziť vlastnosti', false, 'aria-controls="properties-panel" aria-expanded="false"')}
          ${ib('menu', 'toggle-sidebar', 'Zobraziť prvky')}<button class="mobile-menu-button" data-action="mobile-tools" aria-haspopup="dialog">${icon('menu',18)}Ponuka</button>
        </div>
      </nav>
      <section id="magic-wizard" class="magic-wizard" aria-labelledby="magic-title" hidden></section>
      <main class="workspace inspector-hidden" id="workspace">
        <aside class="sidebar" aria-label="Prvky mechanizmu">
          <div class="sidebar-heading"><span>Pracovný priestor</span><span class="small-tag">2D</span></div>
          <div class="segmented sidebar-tabs"><button data-action="sidebar-elements" class="is-active">Prvky</button><button data-action="sidebar-joints">Väzby <span id="joint-count">5</span></button></div>
          <div class="sidebar-scroll">
            <div id="palette">
              <div class="section-label">KNIŽNICA PRVKOV <span>DRAG & DROP</span></div>
              <div class="component-palette">${K.TYPES.map((type) => `
                <button class="component-card" draggable="true" data-component="${type}" title="Pretiahnite na plátno alebo kliknite na pridanie">
                  <span class="component-symbol ${type}">${icon(typeIcons[type], 23)}</span>
                  <span class="component-name">${escape(typeNames[type])}<small>${({ ground: 'Pevné uloženie', rail: 'Posuvná väzba', link: 'Tuhý člen', slot: 'Riadená dráha', cam: 'Harmonická / pretiahnutá', bearing: 'Otočný bod', node: 'Samostatný XY bod', panel: 'Posuv + rotácia', 'spring-compression': 'Sila pri stlačení', 'spring-extension': 'Sila pri natiahnutí', 'piston-push': 'Rozpínajúca vzpera', 'piston-pull': 'Sťahujúca vzpera' })[type]}</small></span>
                  <span class="component-add">${icon('plus', 13)}</span>
                </button>`).join('')}</div>
              <div class="sidebar-rule"></div>
            </div>
            <div class="tree-heading"><span class="section-label">ŠTRUKTÚRA MODELU</span><span id="element-count" class="count-pill">6</span></div>
            <div id="model-tree"></div>
            <div id="joint-list" hidden></div>
            <button class="add-element-button" data-action="add-menu">${icon('plus', 15)}Pridať prvok</button>
          </div>
        </aside>
        <section class="center-workspace">
          <div class="stage-header"><div class="segmented mode-switch" aria-label="Režim mechanizmu"><button data-action="mode-edit">Úprava geometrie</button><button data-action="mode-simulate">Simulácia</button></div><button class="subtle-button editable-copy" data-action="make-editable" title="Zachovať originál a vytvoriť voľnú editačnú kópiu">${icon('copy', 14)}<span>Voľná kópia</span></button><div class="stage-toggles" aria-label="Viditeľnosť plátna">${ib('grid', 'grid', 'Zobraziť mriežku', state.grid, 'aria-pressed="true"')}<button class="main-dimensions-toggle" data-action="main-dimensions" aria-pressed="false">Hlavné rozmery</button>${ib('ruler', 'dimensions', 'Zobraziť rozmery', state.dimensions, 'aria-pressed="true"')}${ib('layers', 'ghosts', 'Zobraziť krajné polohy', state.ghosts, 'aria-pressed="true"')}${ib('trace', 'trace', 'Zobraziť trajektóriu', state.trace, 'aria-pressed="true"')}${ib('text', 'labels', 'Skryť texty, názvy a uhly schémy', state.labels, 'aria-pressed="true"')}</div></div>
          <div class="canvas-area" id="canvas-area">
            <div class="scene-heading"><span class="eyebrow">KINEMATICKÝ MODEL</span><h1 id="scene-name">${escape(state.project.name)}</h1><p>Bočný pohľad <span>·</span> Rovinný mechanizmus</p><button id="project-assumptions" class="estimate-chip" data-action="project-info" hidden>${icon('info', 12)}Odhadové rozmery · predpoklady</button></div>
            <div class="scene-status" id="scene-status">${icon('check', 13)}<span>Pohyb bez kolízií</span></div>
            <div id="workflow-tools" class="workflow-tools"></div><div class="canvas-tools" aria-label="Nástroje plátna">${ib('cursor', 'tool-select', 'Výber a pohyb (V)', true)}${ib('hand', 'tool-pan', 'Posúvanie plátna (H)')}${ib('link', 'tool-connect', 'Spojiť uzlové body (J)')}${ib('ruler', 'tool-measure', 'Zmerať vzdialenosť (M)')}<span class="tool-divider"></span>${ib('free', 'grid-snap', 'Sieť 5 mm. Vypnúť pre voľný pohyb; inteligentné prichytávanie je samostatné.', state.snap, `aria-pressed="${state.snap}"`)}<button class="icon-button${state.angleSnap ? ' is-active' : ''}" data-action="angle-snap" title="Uhlové kroky 10°" aria-label="Zapnúť alebo vypnúť uhlové kroky 10°" aria-pressed="${!!state.angleSnap}"><span class="angle-snap-label" aria-hidden="true">10°</span></button>${ib('target', 'smart-snap', 'Inteligentné prichytávanie: vypnuté. Zapnúť na vyžiadanie.', false, 'aria-pressed="false"')}${ib('fit', 'fit', 'Prispôsobiť pohľad (Shift+F)')}</div>
            <svg id="mechanism-canvas" xmlns="${svgNS}" role="group" aria-label="Interaktívny 2D model. Kliknite na bod alebo člen; Shift pridáva do výberu; Ctrl prepína prekryté entity, pravé tlačidlo otvorí úpravy." tabindex="0"></svg>
            <div class="drop-hint" id="drop-hint">${icon('plus', 27)}<span>Pustite prvok na pracovnú plochu</span></div>
            <div class="axis-widget"><svg width="34" height="35" viewBox="0 0 34 35" aria-hidden="true"><path d="M9 5v23M9 5h22" fill="none" stroke="#b2bcc5" stroke-width="1.5"/><path d="m6 24 3 4 3-4m15-22 4 3-4 3" fill="none" stroke="#b2bcc5" stroke-width="1.5"/><text x="1" y="25" fill="#718291" font-size="8">Y</text><text x="26" y="18" fill="#718291" font-size="8">X</text></svg><span>XY <i>·</i> mm</span></div>
            <div class="phase-switcher" id="phase-switcher"></div>
            <div class="zoom-control">${ib('minus', 'zoom-out', 'Oddialiť')}<span id="zoom-value">100%</span>${ib('plus', 'zoom-in', 'Priblížiť')}<span class="zoom-divider"></span>${ib('expand', 'fit', 'Zobraziť celý mechanizmus')}</div>
            <div class="canvas-instruction" id="canvas-instruction" hidden></div>
            <div id="snap-choices" class="snap-choices" role="group" aria-label="Vybrať spojenie prichytených bodov" hidden></div>
            <div id="placement-tools" class="placement-tools" aria-live="polite" hidden></div>
            <div id="binding-tools" class="binding-tools" aria-label="Spojenie, uloženie a pohon výberu" hidden></div>
            <div class="selection-dock">
              <div class="manipulation-tools" id="manipulation-tools" aria-label="Priame úpravy vybraných členov" hidden></div>
              <div class="selection-summary" id="selection-summary" aria-live="polite" hidden></div>
              <div id="model-checks" class="model-checks" aria-label="Kontrola modelu" hidden></div>
            </div>
          </div>
          <section class="analysis-dashboard" id="analysis-workspace" aria-label="Analýza celého rozsahu pohybu" hidden></section>
          <section class="diagnostics-panel" id="diagnostics-panel" aria-label="Diagnostika väzieb" hidden></section>
          <section class="analysis-panel" id="motion-profile-panel" aria-label="Pohybový profil" hidden>
            <div class="analysis-header"><div class="analysis-title">${icon('chart', 17)}<h2>Pohybový profil</h2><span class="live-tag">LIVE</span><select id="graph-mode" aria-label="Zobrazený graf"><option value="angle">Uhly</option><option value="force">Sila / moment pohonu</option></select></div><div class="graph-legend"><span class="legend-line"></span><span id="graph-legend">Uhol čela</span><button class="trace-chip" data-action="trace-pick">${icon('trace', 14)}<span id="trace-name">Bod C</span>${icon('chevron', 12)}</button></div></div>
            <div class="graph-area"><span class="graph-unit" id="graph-unit">Uhol (°)</span><svg id="motion-graph" viewBox="0 0 800 94" preserveAspectRatio="none" role="img" aria-label="Graf závislosti uhla čela od posuvu výsuvu"></svg><span class="graph-x-label" id="graph-x-label">Posuv (mm)</span><div class="graph-tooltip" id="graph-tooltip" hidden></div></div>
          </section>
          <section class="playback-panel" id="playback-panel" aria-label="Prehrávanie časovej osi" hidden>
            <div class="simulation-bar">
              <div class="play-controls">${ib('reset', 'reset', 'Vrátiť do zatvorenej polohy')}<button class="play-button" data-action="play" aria-label="Spustiť simuláciu" title="Spustiť simuláciu (medzerník)">${icon('play', 17)}</button>${ib('loop', 'loop', 'Opakovať otváranie a zatváranie', true, 'aria-pressed="true"')}</div>
              <div class="motion-control"><div class="motion-label"><label for="motion-range" id="motion-label">Posuv výsuvu</label><span id="motion-total">0 – 300 mm</span></div><input id="motion-range" aria-label="Posuv výsuvu" type="range" min="0" max="300" step="0.1" value="150" /><div class="range-labels"><span id="range-min">Zatvorené</span><span id="range-max">Otvorené</span></div></div>
              <div class="motion-readout"><input id="motion-value" type="number" min="0" max="300" step="0.1" value="150" aria-label="Presná poloha pohonu" /><span id="motion-unit">mm</span></div>
              <div class="speed-control"><label for="speed">Rýchlosť</label><select id="speed" aria-label="Rýchlosť simulácie"><option value="0.25">0,25×</option><option value="0.5">0,5×</option><option value="1" selected>1×</option><option value="1.5">1,5×</option><option value="2">2×</option></select></div>
            </div><div class="dynamics-readout" id="dynamics-readout" hidden></div>
          </section>
        </section>
        <aside class="inspector" id="properties-panel" aria-label="Inšpektor vlastností" hidden><div class="inspector-top"><div>${icon('settings', 16)}<span>Vlastnosti</span></div>${ib('close', 'close-inspector', 'Zavrieť vlastnosti')}</div><div id="inspector-content"></div></aside>
      </main>
      <footer class="status-bar"><div><span class="ready-dot" id="solver-dot"></span><span id="solver-status">Solver pripravený</span><span class="status-separator"></span><span id="solver-meta">1 stupeň voľnosti</span></div><div class="status-right"><span id="pointer-coordinates">X: 0,0 <span>Y: 0,0</span></span><span class="status-separator"></span><span>Pozícia v mm</span><span class="version">v2.0</span></div></footer>
    `;
  }

  function renderTree() {
    const p = state.project;
    $('#element-count').textContent = p.elements.length;
    $('#joint-count').textContent = p.connections.length;
    $('#model-tree').innerHTML = p.elements.length ? p.elements.map((e) => `
      <div data-context-key="${escape(['node', 'bearing'].includes(e.type) ? I.nodeKey({ elementId: e.id, point: 'a' }) : I.elementKey(e.id))}" class="tree-row${memberSelected(e.id) ? ' is-selected' : ''}${!e.visible ? ' is-hidden' : ''}">
        <button class="tree-select" data-action="select" data-id="${escape(e.id)}"><span class="tree-symbol ${e.type}">${icon(typeIcons[e.type], 16)}</span><span>${escape(e.name)}${e.group?` · ${escape(e.group)}`:''}${e.plane?` · rovina ${e.plane}`:''}</span></button>
        <button class="tree-eye" data-action="visibility" data-id="${escape(e.id)}" title="${e.visible ? 'Skryť' : 'Zobraziť'} prvok" aria-label="${e.visible ? 'Skryť' : 'Zobraziť'} ${escape(e.name)}">${icon(e.visible ? 'eye' : 'eyeOff', 13)}</button>
        ${e.locked ? `<span class="tree-lock" title="Pevné uloženie alebo riadený prvok">${icon('lock', 11)}</span>` : '<span class="tree-lock"></span>'}
      </div>`).join('') : '<div class="empty-tree">Váš mechanizmus začína tu.<br>Pridajte prvok z knižnice.</div>';
    $('#joint-list').innerHTML = p.connections.length ? p.connections.map((j, i) => {
      const a = p.elements.find((e) => e.id === j.a.elementId), b = p.elements.find((e) => e.id === j.b.elementId);
      return `<div class="joint-list-item" data-context-key="${escape(I.jointKey(j.id))}"><span class="joint-number">${String(i + 1).padStart(2, '0')}</span><div><button class="joint-edit" data-action="edit-joint" data-id="${escape(j.id)}"><strong>${escape(j.name)}</strong></button><small>${escape(a?.name)} · ${escape(j.a.point)} <span>↔</span> ${escape(b?.name)} · ${escape(j.b.point)}</small><small>${escape(E.constraintNames[j.type || 'revolute'])}</small></div>${!j.builtin ? ib('trash', 'delete-joint', 'Odstrániť väzbu', false, `data-id="${escape(j.id)}"`) : `<span class="joint-builtin">${icon('lock', 12)}</span>`}</div>`;
    }).join('') : '<div class="empty-tree">Zvoľte nástroj Spojiť (J)<br>a kliknite na dva uzly.</div>';
    $('#palette').hidden = state.sidebarTab !== 'elements' || !!state.magic && state.magic.step !== 4;
    $('#model-tree').hidden = state.sidebarTab !== 'elements';
    $('#joint-list').hidden = state.sidebarTab !== 'joints';
    $('.tree-heading .section-label').textContent = state.sidebarTab === 'joints' ? 'KINEMATICKÉ VÄZBY' : 'ŠTRUKTÚRA MODELU';
    $('#element-count').textContent = state.sidebarTab === 'joints' ? p.connections.length : p.elements.length;
    $('.add-element-button').innerHTML = `${icon(state.sidebarTab === 'joints' ? 'link' : 'plus', 15)}${state.sidebarTab === 'joints' ? 'Spojiť dva uzly' : 'Pridať prvok'}`;
    $('[data-action="sidebar-elements"]').classList.toggle('is-active', state.sidebarTab === 'elements');
    $('[data-action="sidebar-joints"]').classList.toggle('is-active', state.sidebarTab === 'joints');
  }

  function quantityInput(name, label, value, unit = 'mm', min = -5000, max = 5000) {
    return `<label class="property-field"><span>${escape(label)}</span><input class="text-field" name="${name}" type="text" data-quantity="${unit}" min="${min}" max="${max}" maxlength="128" autocomplete="off" spellcheck="false" value="${escape(value)}" required/></label>`;
  }
  function quantityValue(data, name, unit = 'mm', min = -5000, max = 5000, fallback) {
    const raw = data.get(name), value = raw == null && fallback != null ? fallback : W.parseNumber(raw, unit);
    if (value < min || value > max) throw new Error(`Hodnota ${name} musí byť v rozsahu ${min} až ${max} ${unit}.`);
    return value;
  }
  function field(label, key, value, unit = 'mm', min = 1, max = 2000, step = 0.1, scope = 'parameter', extra = '') {
    const id = `field-${scope}-${key}`;
    const digits = Math.max(0, Math.min(6, Math.ceil(-Math.log10(step))));
    return `<label class="property-field" for="${id}"><span>${escape(label)}</span><div class="number-field"><input id="${id}" data-property="${key}" data-scope="${scope}" data-quantity="${unit === 'mm' || unit === '°' ? unit : ''}" type="text" value="${Number(value).toFixed(digits)}" min="${min}" max="${max}" maxlength="128" autocomplete="off" spellcheck="false" ${extra}/><span>${escape(unit)}</span></div></label>`;
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
    const force = state.result.forces?.find((v) => v.id === e.id), geometry = !spring && K.pistonGeometry(e), needsFit = !spring && (!geometry.fits || selectedPose()?.length > e.maxLength + K.TOLERANCE || selectedPose()?.length < e.minLength - K.TOLERANCE);
    return '<button class="button button-secondary full-width" data-action="construction">Konštrukčné rozmery a zdvih…</button>' + section('Pracovný rozsah', `<label class="property-field"><span>Rozmery pri montáži</span><select id="range-mode" class="property-select"><option value="auto"${e.rangeMode !== 'manual' ? ' selected' : ''}>Automaticky podľa montáže</option><option value="manual"${e.rangeMode === 'manual' ? ' selected' : ''}>Vlastné pracovné dorazy</option></select></label><p class="section-description">Automatický rozsah zachová tuhosť pružiny. Ručne zadané minimum a maximum sa pri pohybe dodržia.</p>`) + (!spring ? section('Funkcia piesta', `<label class="property-field"><span>Správanie</span><select id="actuator-mode" class="property-select"><option value="gas"${e.actuatorMode !== 'damper' ? ' selected' : ''}>Plynová vzpera · sila a tlmenie</option><option value="damper"${e.actuatorMode === 'damper' ? ' selected' : ''}>Tlmič · odpor proti rýchlosti</option></select></label><p class="section-description">Pri návrhovom predĺžení sa zväčší aj valec a pracovný rozsah. Pri simulovanom vysúvaní má valec stálu dĺžku.</p>${needsFit ? `<p class="analysis-warning">Pracovný rozsah alebo vzdialenosť čapov nezodpovedá konštrukcii valca.</p><button class="button button-secondary full-width" data-action="piston-fit">Prispôsobiť valec montáži</button>` : ''}`) : '') + section('Dĺžka medzi montážnymi čapmi', `<div class="elastic-lengths"><div><span>${spring ? 'Voľná dĺžka L₀' : 'Referenčná dĺžka'}</span><strong>${fmt(e.restLength,2)} mm</strong></div><div><span>Minimum</span><strong>${fmt(e.minLength,2)} mm</strong></div><div><span>Maximum</span><strong>${fmt(e.maxLength,2)} mm</strong></div><div><span>Aktuálna dĺžka</span><strong>${fmt(selectedPose()?.length,2)} mm</strong></div></div><p class="section-description">Rozmery upravte spoločne cez Konštrukčné rozmery a zdvih.</p>`) +
      section('Priemery', `${field(spring ? 'Vonkajší priemer pružiny' : 'Priemer valca', 'diameter', e.diameter, 'mm', .1, 500, .1, 'element')}${field(spring ? 'Priemer drôtu' : 'Priemer tyče', spring ? 'wireDiameter' : 'rodDiameter', spring ? e.wireDiameter : e.rodDiameter, 'mm', .01, 500, .01, 'element')}`) +
      section(pulling ? 'Ťažná sila (sťahuje čapy)' : 'Tlačná sila (odtláča čapy)', `${spring ? `<label class="property-field"><span>Spôsob zadania sily</span><select class="property-select" id="force-mode"><option value="rated"${e.forceMode !== 'stiffness' ? ' selected' : ''}>F pri pracovnom limite</option><option value="stiffness"${e.forceMode === 'stiffness' ? ' selected' : ''}>Tuhosť k (N/mm)</option></select></label>${e.forceMode === 'stiffness' ? field('Tuhosť pružiny k', 'stiffness', e.stiffness, 'N/mm', 0, 100000, .001, 'element') : field(compression ? 'F pri minimálnej dĺžke' : 'F pri maximálnej dĺžke', 'force', e.force, 'N', 0, 1000000, .01, 'element')}${!compression ? field('Počiatočné predpätie F₀', 'preload', e.preload, 'N', 0, 1000000, .01, 'element') : ''}<p class="section-description">${compression ? 'Nad voľnou dĺžkou pružina netlačí. F = k · (L₀ − L).' : 'Pod voľnou dĺžkou je pružina voľná. Od L₀ ťahá silou F₀ + k · (L − L₀).'}</p>` : `${field('Referenčná sila F', 'force', e.force, 'N', 0, 1000000, .1, 'element')}${field('Pomer sily na konci zdvihu', 'progression', e.progression, '×', 1, 3, .01, 'element')}<p class="section-description">${pulling ? 'F pri minimálnej dĺžke, rastie pri vysúvaní.' : 'F pri maximálnej dĺžke, rastie pri zasúvaní.'} Pomer 1 znamená konštantnú silu. Nejde o pneumatický okruh ani výrobný model plynu.</p>`}${field('Osové tlmenie', 'damping', e.damping, 'N·s/m', 0, 100000, .1, 'element')}${!spring ? two(field('Tlmenie pri zasúvaní', 'dampingCompression', e.dampingCompression ?? e.damping, 'N·s/m', 0, 100000, .1, 'element'), field('Tlmenie pri vysúvaní', 'dampingExtension', e.dampingExtension ?? e.damping, 'N·s/m', 0, 100000, .1, 'element')) : ''}${field('Hmotnosť na voľnom čape', 'tipMass', e.tipMass, 'kg', .001, 1000, .001, 'element')}<p class="section-description">V režime Pohyb zo síl sa sila prenáša na pohon aj spoločné voľné čapy. Tlmenie pôsobí proti rýchlosti; hmotnosť určuje zrýchlenie.</p><div class="analysis-metric"><span>Výsledná osová sila</span><strong>${fmt(force?.magnitude || 0, 2)} <small>N</small></strong></div><div class="analysis-metric"><span>Pružná / plynová sila</span><strong id="live-nominal-force">${fmt(force?.nominalForce||0,2)} N</strong></div><div class="analysis-metric"><span>Odpor tlmenia</span><strong id="live-damping-force">${fmt(force?.dampingForce||0,2)} N</strong></div><button class="button button-secondary full-width" data-action="elastic-response">Náhľad návratu a tlmenia</button>`) +
      section('Montáž medzi telesami', `<label class="property-field"><span>Koniec A</span><select id="mount-a" class="property-select">${nodeOptions(K.elasticMount(state.project, e, 'a'), false, true, true)}</select></label><label class="property-field"><span>Koniec B</span><select id="mount-b" class="property-select">${nodeOptions(K.elasticMount(state.project, e, 'b'), false, true, true)}</select></label><p class="section-description">Sila sa prenesie medzi zvolené body. Pružný prvok nepredpisuje tuhú dĺžku. Koncové dĺžky sú dorazy, ktoré zastavia simuláciu.</p>`) +
      section('Voľné konce v editácii', `${two(field('Poloha X', 'x', e.x, 'mm', -5000, 5000, .1, 'element'), field('Poloha Y', 'y', e.y, 'mm', -5000, 5000, .1, 'element'))}${field(spring ? 'Rozostup voľných čapov' : 'Návrhová vysunutá dĺžka', 'length', e.length, 'mm', .1, 5000, .1, 'element')}${field('Uhol prvku', 'angle', e.angle, '°', -360, 360, .1, 'element')}`) +
      `<div class="inspector-note">${icon('warning', 15)}<p>Parametre sú návrhový odhad. Overte minimálnu dĺžku, zdvih, rezervu a silu v údajoch výrobcu.</p></div><button class="button button-secondary full-width" data-action="elastic-sources">Katalógové príklady a zdroje</button>`;
  }

  function drawElastic(e, pose, color, result = state.result) {
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
      const geometry = K.pistonGeometry(e, length), cylinder = Math.max(0, Math.min(length - geometry.eye, geometry.cylinder)), rod = at(cylinder);
      body = `${line(pose.a, pose.b, `stroke="#8995a2" stroke-width="${e.rodDiameter}" stroke-linecap="round"`)}${line(pose.a, rod, `stroke="${color}" stroke-width="${e.diameter}" stroke-linecap="butt"`)}${line(at(4), at(Math.max(4, cylinder - 4)), `stroke="#dde4eb" stroke-width="${e.diameter * .45}"`)}`;
    }
    const force = result.forces?.find((v) => v.id === e.id);
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
        ${section('Rozsah pohybu', `<div class="analysis-metric"><span>Uhol výstupu</span><strong>${fmt(Math.min(...angles))}° <small>→</small> ${fmt(Math.max(...angles))}°</strong></div>${lengths}<div class="analysis-metric"><span>Max. polohová chyba</span><strong>${fmt(Math.max(...state.samples.map((s) => s.positionResidual)), 3)} <small>mm</small></strong></div><div class="analysis-metric"><span>Max. uhlová chyba</span><strong>${fmt(Math.max(...state.samples.map((s) => s.angularResidual)), 3)} <small>°</small></strong></div>`)}
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
      container.innerHTML = `<div class="empty-inspector">${icon('cursor', 34)}<h2>Priestor pre váš nápad</h2><p>Vyberte prvok na plátne alebo ho pridajte z knižnice. Projekty a šablóny otvoríte cez názov mechanizmu v hlavičke.</p></div>`;
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
        section('Geometria', `${!['bearing', 'node'].includes(e.type) ? field('Dĺžka prvku', 'length', e.length, 'mm', 1, 2000, 1, 'element') : field(e.type === 'node' ? 'Polomer značky bodu' : 'Polomer ložiska', 'radius', e.radius, 'mm', 1, 100, 1, 'element')}${['link', 'panel'].includes(e.type) ? field('Hrúbka člena', 'width', e.width, 'mm', 1, 100, 1, 'element') : ''}${e.type === 'rail' ? field('Zdvih vedenia', 'stroke', e.stroke, 'mm', 1, 2000, 1, 'element') : ''}${e.type === 'panel' ? field('Vzdialenosť ložiska', 'bearingOffset', e.bearingOffset, 'mm', 1, 2000, 1, 'element') : ''}${e.type === 'slot' ? field('Šírka drážky', 'slotWidth', e.slotWidth, 'mm', 2, 100, 1, 'element') : ''}`);
      if (e.type === 'bearing') geometry += section('Vedenie ložiska', `<label class="property-field"><span>Viazať na kulisu</span><select class="property-select" id="bearing-slot"><option value="">Bez väzby</option>${state.project.elements.filter((s) => s.type === 'slot').map((s) => `<option value="${escape(s.id)}"${s.id === e.slotId ? ' selected' : ''}>${escape(s.name)}</option>`).join('')}</select></label>`);
      if (e.type === 'slot') geometry += section('Profil kulisy / vodiacej dráhy', `<label class="property-field"><span>Typ geometrie</span><select class="property-select" id="element-curve-kind">${[['bezier', 'Bézierova krivka'], ['spline', 'Interpolovaná spline'], ['arc', 'Kruhový oblúk'], ['polyline', 'Lomená čiara · presné body']].map(([kind, title]) => `<option value="${kind}"${e.curveKind === kind ? ' selected' : ''}>${title}</option>`).join('')}</select></label>${e.curveKind === 'arc' ? field('Polomer zakrivenia', 'curveRadius', e.curveRadius, 'mm', 1, 5000, 1, 'element') : ''}<p class="section-description">${e.controls.length} bodov, lokálne súradnice. V editačnom režime môžete body ťahať na plátne.</p>${e.controls.length <= 32 ? e.controls.map((c, i) => `<div class="control-point-row"><span>P${i}</span>${field('X', `${i}-x`, c.x, 'mm', -5000, 5000, 0.1, 'element-control')}${field('Y', `${i}-y`, c.y, 'mm', -5000, 5000, 0.1, 'element-control')}</div>`).join('') : ''}<button class="button button-secondary full-width" data-action="edit-path">Upraviť / pridať / odstrániť body</button>`);
      if (e.type === 'cam') geometry += section('Profil rotačnej vačky', `<label class="property-field"><span>Tvar vačky</span><select class="property-select" id="cam-shape"><option value="harmonic"${e.camShape !== 'pear' ? ' selected' : ''}>Harmonický radiálny profil</option><option value="pear"${e.camShape === 'pear' ? ' selected' : ''}>Pretiahnutá vačka · dva kruhové oblúky</option></select></label>${e.camShape === 'pear' ? field('Pomer polomeru špičky / základne', 'camNoseRatio', e.camNoseRatio, '×', .1, 1, .01, 'element') : ''}${field('Polomer základného kruhu R', 'radius', e.radius, 'mm', .1, 5000, .1, 'element')}${field('Zdvih profilu h', 'camLift', e.camLift, 'mm', 0, 5000, .1, 'element')}${field('Fáza výstupku', 'camPhase', e.camPhase, '°', -360, 360, .1, 'element')}<p class="section-description">${e.camShape === 'pear' ? 'Dva kruhové oblúky spojené spoločnými dotyčnicami, s osou v základnom kruhu.' : 'Jedna hladká vlna za otáčku, polomer R až R + h.'} Kontakt používa skutočný polomer valčeka a predpoklad trvalého dotyku, nie stred valčeka na obryse.</p><button class="button button-secondary full-width" data-action="cam-follower">Pridať vedený valčekový sledovač</button>`);
      if (['rail', 'link', 'panel', 'cam'].includes(e.type)) geometry += section('Jeden pohon mechanizmu', `${switchRow('Riadený pohon', 'drive-selected', e.drive)}${!['rail', 'cam'].includes(e.type) ? `<label class="property-field"><span>Druh pohonu</span><select class="property-select" id="drive-mode"><option value="rotary"${e.driveMode !== 'linear' ? ' selected' : ''}>Rotačný</option><option value="linear"${e.driveMode === 'linear' ? ' selected' : ''}>Posuv celého telesa</option></select></label>${e.driveMode === 'linear' ? `${field('Zdvih telesa', 'stroke', e.stroke, 'mm', 1, 2000, 0.1, 'element')}${field('Smer posuvu', 'driveAngle', e.driveAngle || 0, '°', -360, 360, 0.1, 'element')}` : ''}` : ''}${e.drive ? two(field('Minimum pohonu', K.driveRange(state.project).unit === '°' ? 'rotationMin' : 'travelMin', K.driveRange(state.project).min, K.driveRange(state.project).unit, K.driveRange(state.project).unit === '°' ? -360 : 0, 2000), field('Maximum pohonu', K.driveRange(state.project).unit === '°' ? 'rotationMax' : 'travelMax', K.driveRange(state.project).max, K.driveRange(state.project).unit, 1, 2000)) : ''}`);
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
        ${section('Trajektória', `${isDoubleDrawer() ? doubleTraceControls() : ''}<label class="check-row"><input id="trace-selected" type="checkbox"${state.trace && state.traceMode === 'single' && state.traceRef.elementId === e.id ? ' checked' : ''}/><span>Sledovať len bod tohto prvku</span></label><label class="property-field"><span>Referenčný bod</span><select class="property-select" id="trace-point">${I.pointKeys(e).filter((key) => pose?.[key]).map((point) => `<option value="${point}"${state.traceRef.elementId === e.id && state.traceRef.point === point ? ' selected' : ''}>${e.type === 'panel' && !isDoubleDrawer() ? ({ a: 'B · otočný čap', b: 'C · koniec čela', c: 'A · vodiace ložisko' })[point] : ({ a: 'Začiatok / čap', b: 'Koniec / päta čela', c: 'Pomocný bod / ložisko A' })[point]}</option>`).join('')}</select></label><button class="button button-secondary full-width" data-action="save-trace">Uložiť / upraviť trajektóriu</button>`)}
        ${section('Kóty a uložené trajektórie', `<button class="button button-secondary full-width" data-action="new-dimension">Pridať kótu medzi uzlami</button>${state.project.dimensions.map((d) => `<div class="record-row"><button data-action="edit-dimension" data-id="${escape(d.id)}">${escape(d.name || 'Kóta')} · ${fmt(E.dimensionValue(state.result, d), 2)} ${d.type === 'angle' ? '°' : 'mm'}</button>${ib('trash', 'delete-dimension', 'Odstrániť kótu', false, `data-id="${escape(d.id)}"`)}</div>`).join('')}${state.project.trajectories.map((t) => `<div class="record-row"><button data-action="edit-trace" data-id="${escape(t.id)}">${escape(t.name)}</button>${ib('trash', 'delete-trace', 'Odstrániť trajektóriu', false, `data-id="${escape(t.id)}"`)}</div>`).join('')}`)}
        <div id="inspector-warning" class="inspector-warning"${!state.result.blocked ? ' hidden' : ''}>${icon('warning', 16)}<span>${escape(state.result.issues[0] || '')}</span></div>
      </div>
      <div class="inspector-footer"><button class="button button-secondary" data-action="duplicate">${icon('copy', 15)}Duplikovať</button>${!e.primary ? ib('trash', 'delete', 'Odstrániť vybraný prvok') : '<span class="bound-tag">' + icon('link', 13) + 'Viazaný prvok</span>'}</div>
    `;
  }

  const pathD = (points) => points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(' ');
  function line(a, b, attrs = '') { return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" ${attrs}/>`; }
  function panelPoints(pose, width) {
    const dx = pose.b.x - pose.a.x, dy = pose.b.y - pose.a.y, l = Math.hypot(dx, dy) || 1;
    const ox = -dy * width / (2 * l), oy = dx * width / (2 * l);
    return [{ x: pose.a.x + ox, y: pose.a.y + oy }, { x: pose.b.x + ox, y: pose.b.y + oy }, { x: pose.b.x - ox, y: pose.b.y - oy }, { x: pose.a.x - ox, y: pose.a.y - oy }];
  }
  function panelPolygon(pose, width) {
    return panelPoints(pose, width).map((p) => `${p.x},${p.y}`).join(' ');
  }
  function node(id, key, point, label = '', active = false, scale = null) {
    const identity = I.nodeKey({ elementId: id, point: key }), kind = I.status(state.project, { elementId: id, point: key }, state.samples);
    active = state.selectedElementIds.includes(identity);
    scale ||= Math.hypot(...['a', 'b'].map((v) => $('#mechanism-canvas').getScreenCTM()?.[v] || 0)) || 1;
    const r = 5 / scale;
    return `<g data-element="${escape(id)}" data-point="${key}" data-selection-key="${escape(identity)}" class="joint-node node-${kind}${active ? ' active' : ''}${state.hoveredTargetId === identity ? ' hovered' : ''}" role="button" tabindex="0" aria-pressed="${active}" aria-label="Uzol ${escape(label || `${state.project.elements.find((e) => e.id === id)?.name} · ${key.toUpperCase()}`)}, ${({ fixed: 'pevný', driven: 'poháňaný', free: 'voľný' })[kind]}">
      <circle cx="${point.x}" cy="${point.y}" r="${(window.innerWidth<=640 ? 22 : 11) / scale}" fill="transparent" stroke="none"/>
      <circle class="node-ring" cx="${point.x}" cy="${point.y}" r="${r}" fill="var(--paper)" stroke="var(--node-${kind})" stroke-width="1.7" vector-effect="non-scaling-stroke"/>
      <circle cx="${point.x}" cy="${point.y}" r="${1.7 / scale}" fill="var(--node-${kind})" stroke="none"/>
      ${kind === 'fixed' ? `<path d="M${point.x - r * 1.6} ${point.y + r * 1.8}h${r * 3.2}m${-r * 2.5} 0-${r} ${r}m${r * 2.6}-${r}-${r} ${r}" fill="none" stroke="var(--node-fixed)" stroke-width="1.2" vector-effect="non-scaling-stroke"/>` : ''}
      ${kind === 'driven' ? `<circle cx="${point.x}" cy="${point.y}" r="${r * 1.55}" fill="none" stroke="var(--node-driven)" stroke-width="1.2" stroke-dasharray="2 2" vector-effect="non-scaling-stroke"/>` : ''}
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
    const stroke = (color) => bad ? '#df5e59' : selected ? 'var(--accent)' : color;
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

  function drawElement(e, pose, result = state.result) {
    if (!pose || !e.visible) return '';
    const p = state.project.parameters, selected = memberSelected(e.id), bad = result.collisions.includes(e.id) || result.invalid.includes(e.id);
    const color = bad ? '#df5e59' : selected ? 'var(--accent)' : e.color || (e.type === 'slot' ? '#6a8a89' : '#798997');
    let body = '';
    if (K.isElastic(e)) {
      body = drawElastic(e, pose, bad ? '#df5e59' : selected ? '#d99735' : e.type.startsWith('spring-') ? '#6590b3' : '#a4779f', result);
    } else if (e.type === 'cam') {
      body = `<path d="${pathD(pose.path)} Z" fill="#e6c7a4" fill-opacity=".7" stroke="${color}" stroke-width="1.8"/>${line(pose.a, pose.b, 'stroke="#8c7f6d" stroke-width="1" stroke-dasharray="4 4"')}<circle cx="${pose.a.x}" cy="${pose.a.y}" r="4" fill="var(--paper)" stroke="${color}"/><text x="${pose.a.x}" y="${Math.max(...pose.path.map((p) => p.y)) + 18}" text-anchor="middle" class="part-label">${escape(e.name)}</text>`;
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
        body += `<path class="scheme-annotation" d="M${mid.x} ${mid.y - 17}v-25h40" stroke="#98ada5" stroke-width="0.8" fill="none"/><text x="${mid.x + 45}" y="${mid.y - 39}" class="slot-label">Zakrivená kulisa</text>`;
      }
    } else if (e.type === 'rail') {
      if (e.primary && state.project.kind === 'drawer') {
        body = `<rect x="0" y="${p.pivotY - 9}" width="${p.frameLength}" height="18" rx="3" fill="#d9e0e5" stroke="#a5b3bf" stroke-width="1"/>
          <path d="M6 ${p.pivotY}H${p.frameLength - 6}" stroke="#b0bcc6" stroke-width="1.5"/>
          <rect x="${result.motion}" y="${p.pivotY - 6}" width="${p.frameLength + p.panelOffsetX}" height="12" rx="2" fill="${bad ? '#f4c6c4' : '#e7c18b'}" stroke="${color}" stroke-width="1.2"/>
          <path d="M${result.motion + 9} ${p.pivotY - 1}H${pose.b.x - 9}" stroke="#fcf1dc" stroke-width="1.4"/>
          ${[0.18, 0.48, 0.8].map((t) => `<circle cx="${result.motion + t * (p.frameLength + p.panelOffsetX)}" cy="${p.pivotY}" r="2.2" fill="#b58548"/>`).join('')}
          <text x="${result.motion + p.frameLength / 2 - 45}" y="${p.pivotY + 31}" class="part-label rail-label">LINEÁRNY VÝSUV</text>`;
      } else body = `${line(pose.a, pose.b, `stroke="#c4d0d9" stroke-width="22" stroke-linecap="round"`)}${line(pose.a, pose.b, `stroke="${color}" stroke-width="1" stroke-dasharray="5 4"`)}<polygon points="${K.carriageGeometry(e, pose).carriageOutline.map((p) => `${p.x},${p.y}`).join(' ')}" fill="#e7c18b" stroke="${selected ? 'var(--accent)' : '#b28649'}"/>`;
    } else if (e.type === 'panel') {
      const width = e.primary ? p.panelThickness : e.width;
      if (selected) body += `<polygon points="${panelPolygon(pose, width + 10)}" fill="#eab252" opacity="0.1"/>`;
      body += `<polygon points="${panelPolygon(pose, width)}" fill="${bad ? '#f5c6c1' : '#f2cc91'}" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"/>
        ${line(pose.a, pose.b, 'stroke="#fff8e9" stroke-width="1.2"')}`;
      if (e.primary) {
        const a = pose.a;
        const r = 35, end = K.along(a, r, pose.angle);
        body += `<path class="angle-annotation" d="M${a.x + r} ${a.y}A${r} ${r} 0 ${Math.abs(pose.angle) > 180 ? 1 : 0} ${pose.angle < 0 ? 1 : 0} ${end.x} ${end.y}" fill="none" stroke="#d5a24f" stroke-width="0.9"/>
          <text x="${a.x + 38}" y="${a.y - 14}" class="angle-label">${fmt(pose.angle)}°</text>
          <text x="${pose.b.x - 44}" y="${pose.b.y - 24}" class="panel-label">SKLÁPACIE ČELO</text>`;
      }
    } else if (e.type === 'node') {
      body = `<text x="${pose.a.x + 12}" y="${pose.a.y - 12}" class="part-label" pointer-events="none">${escape(e.name)}</text>`;
    } else if (e.type === 'bearing') {
      const r = e.primary ? (e.role === 'pivot' ? 5.5 : p.bearingRadius) : e.radius;
      body = `<circle cx="${pose.a.x}" cy="${pose.a.y}" r="${r + 2}" fill="#f8fbfa" stroke="${color}" stroke-width="1.5"/><circle cx="${pose.a.x}" cy="${pose.a.y}" r="${r * 0.58}" fill="#d9e4df" stroke="${color}" stroke-width="0.85"/><circle cx="${pose.a.x}" cy="${pose.a.y}" r="1.8" fill="#657d73"/>`;
    } else if (e.type === 'ground') {
      body = `${line(pose.a, pose.b, `stroke="${color}" stroke-width="8" stroke-linecap="round"`)}${groundGlyph(pose.a)}${groundGlyph(pose.b)}`;
    } else {
      const width = e.width;
      body = `${line(pose.a, pose.b, `stroke="${bad ? '#df5e59' : selected ? 'var(--accent)' : e.color || (e.role === 'coupler' ? '#6d9b95' : '#97a9b9')}" stroke-width="${width + 3}" stroke-linecap="round"`)}
        ${line(pose.a, pose.b, `stroke="${e.role === 'coupler' ? '#d4e6e0' : '#e3eaf0'}" stroke-width="${Math.max(2, width - 2)}" stroke-linecap="round"`)}
        <text x="${(pose.a.x + pose.b.x) / 2}" y="${(pose.a.y + pose.b.y) / 2 - 14}" text-anchor="middle" class="part-label">${escape(e.name)}</text>`;
    }
    return `<g data-element="${escape(e.id)}" data-selection-key="${escape(I.elementKey(e.id))}" class="mechanism-element ${e.type}${selected ? ' selected' : ''}${state.hoveredTargetId === I.elementKey(e.id) ? ' hovered' : ''}" role="button" tabindex="0" aria-pressed="${selected}" aria-label="${escape(e.name)}"><title>${escape(e.name)}</title>${body}</g>`;
  }

  function sceneMarkup(result = state.result, options = {}) {
    const svg = options.source || $('#mechanism-canvas'), p = state.project.parameters, elements = state.project.elements, view = options.view || state.view;
    const diagnostics = options.diagnostics || W.constraints(state.project, result);
    const scale = options.scale || Math.hypot(svg.getScreenCTM()?.a ?? 1, svg.getScreenCTM()?.b ?? 0) || 1;
    let content = `<defs>
      <pattern id="small-grid" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="var(--canvas)"/><path d="M20 0H0V20" fill="none" stroke="var(--grid-small)" stroke-width="0.7"/></pattern>
      <pattern id="large-grid" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="url(#small-grid)"/><path d="M100 0H0V100" fill="none" stroke="var(--grid-large)" stroke-width="0.9"/></pattern>
      <pattern id="frame-hatch" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="#e4e9ed"/><path d="m-1 1 8 8m-1-9 8 8" stroke="#cbd4db" stroke-width="0.8"/></pattern>
      <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e3bc77" stop-opacity=".25"/><stop offset="1" stop-color="#e3bc77" stop-opacity="0"/></linearGradient>
    </defs><rect x="${view.x}" y="${view.y}" width="${view.width}" height="${view.height}" fill="${state.grid ? 'url(#large-grid)' : 'var(--canvas)'}"/>`;
    if (!options.exporting) content += magicImageSVG() + referenceSVG();
    if (!elements.length && !state.magic?.image) content += `<g class="empty-canvas"><circle cx="${view.x + view.width / 2}" cy="${view.y + view.height / 2 - 28}" r="24" fill="#eef1f4"/><path d="M${view.x + view.width / 2 - 8} ${view.y + view.height / 2 - 28}h16m-8-8v16" stroke="#9ca9b3" stroke-width="1.8"/><text x="${view.x + view.width / 2}" y="${view.y + view.height / 2 + 20}" text-anchor="middle" class="empty-canvas-title">Vytvorte svoj prvý mechanizmus</text><text x="${view.x + view.width / 2}" y="${view.y + view.height / 2 + 41}" text-anchor="middle" class="empty-canvas-text">Pretiahnite prvky z knižnice alebo vyberte šablónu</text></g>`;
    if (state.ghosts && elements.length) {
      const samples = options.ghostSamples || K.projectPhases(state.project).map((phase) => K.solve(state.project, phase.motion, { profile: state.profile, collisions: false }));
      for (const sample of samples) {
        for (const e of elements.filter((e) => ['panel', 'link'].includes(e.type))) {
          const pose = sample.poses[e.id];
          if (!pose || !e.visible) continue;
          content += `<g opacity=".2" pointer-events="none">${line(pose.a, pose.b, 'stroke="#a9b4be" stroke-width="12" stroke-linecap="round"')}${line(pose.a, pose.b, 'stroke="#7f8c98" stroke-width="1" stroke-dasharray="5 4"')}</g>`;
        }
      }
    }
    const order = { ground: 0, slot: 1, cam: 2, rail: 2, link: 3, panel: 4, bearing: 5, node: 6, 'spring-compression': 4, 'spring-extension': 4, 'piston-push': 4, 'piston-pull': 4 };
    for (const e of [...elements].sort((a, b) => order[a.type] - order[b.type])) content += drawElement(e, result.poses[e.id], result);
    for (const joint of state.project.connections) {
      const { a, b } = jointPoints(joint, result);
      if (!a || !b || [joint.a, joint.b].some((r) => !elements.find((e) => e.id === r.elementId)?.visible)) continue;
      const identity = I.jointKey(joint.id), active = state.selectedElementIds.includes(identity), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, radius = 15 / scale;
      const diagnostic = diagnostics.find((r) => r.id === joint.id), failed = diagnostic?.status === 'error';
      content += `<g data-joint="${escape(joint.id)}" data-selection-key="${escape(identity)}" class="canvas-joint${active ? ' active' : ''}${failed ? ' diagnostic-error' : ''}${state.hoveredTargetId === identity ? ' hovered' : ''}" role="button" tabindex="0" aria-pressed="${active}" aria-label="${escape(joint.name)} · ${escape(E.constraintNames[joint.type || 'revolute'])}${failed ? ` · odchýlka ${fmt(diagnostic.mm, 2)} mm, ${fmt(diagnostic.degrees, 2)} stupňov` : ''}">
        <title>${escape(joint.name)}</title>${line(a, b, 'class="joint-line" stroke="var(--green)" stroke-width="1.2" vector-effect="non-scaling-stroke" stroke-dasharray="4 3"')}
        <circle cx="${cx}" cy="${cy}" r="${radius}" class="joint-marker" fill="transparent" stroke="var(--secondary)" stroke-width="1" vector-effect="non-scaling-stroke"/>
        ${joint.type === 'prismatic' ? `<path d="M${cx - radius / 2} ${cy}h${radius}m-${radius * .8}-${radius * .2}-${radius * .2} ${radius * .2} ${radius * .2} ${radius * .2}m${radius * .6}-${radius * .4} ${radius * .2} ${radius * .2}-${radius * .2} ${radius * .2}" fill="none" stroke="var(--secondary)" stroke-width="1" vector-effect="non-scaling-stroke" pointer-events="none"/>` : ''}</g>`;
      if (!options.exporting && failed && (state.diagnosticsOpen || active)) content += `<text data-editor-overlay="diagnostic" x="${cx + 19 / scale}" y="${cy - 19 / scale}" class="diagnostic-label" font-size="${11 / scale}" pointer-events="none">${fmt(diagnostic.mm, 2)} mm · ${fmt(diagnostic.degrees, 2)}°</text>`;
    }
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
    for (const e of elements) {
      if (!e.visible) continue;
      const pose = result.poses[e.id];
      if (!pose) continue;
      for (const key of I.pointKeys(e)) {
        const label = state.tool === 'connect' ? `${typeCodes[e.type]} · ${key.toUpperCase()}` : e.primary && state.project.kind === 'drawer' && e.id === 'panel-1' ? ({ a: 'B', b: 'C', c: 'A' })[key] : '';
        if (pose[key]) content += node(e.id, key, pose[key], label, false, scale);
      }
    }
    if (!options.exporting && state.mode === 'edit' && state.tool === 'select' && state.project.kind === 'drawer' && state.selected === 'slot-1' && ['bezier', 'spline'].includes(p.curveKind)) {
      const controls = state.project.controls || K.defaultControls(p);
      const positioned = controls.map((v) => ({ x: v.x + p.slotOffsetX, y: v.y + p.slotOffsetY }));
      content += `<path data-editor-overlay="path-controls" d="${pathD(positioned)}" fill="none" stroke="#94aaa3" stroke-width="0.9" stroke-dasharray="4 4"/>`;
      for (const [i, point] of positioned.entries()) content += `<g data-control="${i}" data-context-key="${I.controlKey('slot-1', i)}" data-selection-key="${I.controlKey('slot-1', i)}" tabindex="0" role="button" aria-label="Kulisa · riadiaci bod P${i}" class="control-handle"><rect x="${point.x - 5}" y="${point.y - 5}" width="10" height="10" rx="2" fill="#fff" stroke="#639082" stroke-width="1.5"/><text x="${point.x + 9}" y="${point.y - 9}" class="node-label">P${i}</text></g>`;
    }
    const selected = currentElement();
    if (!options.exporting && state.mode === 'edit' && state.tool === 'select' && selected?.type === 'slot' && !selected.primary) {
      const pose = result.poses[selected.id];
      const controls = selected.controls.map((v) => K.worldPoint({ ...pose, a: pose.controlOrigin || pose.a }, v));
      content += `<path data-editor-overlay="path-controls" d="${pathD(controls)}" fill="none" stroke="#a0b4a9" stroke-width="0.8" stroke-dasharray="4 4" pointer-events="none"/>`;
      controls.forEach((point, i) => {
        if (i % Math.ceil(controls.length / 64) && i !== controls.length - 1) return;
        if (selected.curveKind === 'arc' && i !== 0 && i !== controls.length - 1) return;
        const key = I.controlKey(selected.id, i), active = state.selectedElementIds.includes(key) || state.contextMenuState.isOpen && state.contextMenuState.targetId === key;
        content += `<g data-element-control="${i}" data-context-key="${key}" data-selection-key="${key}" tabindex="0" role="button" aria-label="${escape(selected.name)} · riadiaci bod P${i}" class="control-handle"><rect x="${point.x - 5}" y="${point.y - 5}" width="10" height="10" rx="2" fill="${active ? 'var(--accent-soft)' : '#fff'}" stroke="${active ? 'var(--accent)' : '#719a86'}" stroke-width="1.5"/><text x="${point.x + 8}" y="${point.y - 8}" class="node-label">P${i}</text></g>`;
      });
    }
    if (!options.exporting && state.mode === 'edit' && selected?.outline?.length && !selected.primary) {
      result.poses[selected.id].outline.forEach((point, i) => {
        const key = I.outlineKey(selected.id, i), active = state.selectedElementIds.includes(key) || state.contextMenuState.isOpen && state.contextMenuState.targetId === key;
        content += `<g data-outline-control="${i}" data-context-key="${key}" data-selection-key="${key}" tabindex="0" role="button" aria-label="${escape(selected.name)} · vrchol V${i}" class="control-handle"><rect x="${point.x - 5}" y="${point.y - 5}" width="10" height="10" fill="${active ? 'var(--accent-soft)' : '#fff'}" stroke="${active ? 'var(--accent)' : '#d39a41'}" stroke-width="1.5"/></g>`;
      });
    }
    if (!options.exporting && state.pendingJoint) {
      const pendingPose = result.poses[state.pendingJoint.elementId];
      const point = state.pendingJoint.point === 'curve' ? pendingPose?.path?.[Math.floor(pendingPose.path.length / 2)] : pendingPose?.[state.pendingJoint.point];
      if (point) content += `<circle data-editor-overlay="pending-joint" cx="${point.x}" cy="${point.y}" r="10" fill="#e9b458" fill-opacity=".16" stroke="#d79a36" stroke-width="1.5" stroke-dasharray="3 3" pointer-events="none"/>`;
    }
    if (!options.exporting && state.measure) {
      const { a, b } = state.measure;
      content += `<g data-editor-overlay="measurement">${line(a, b, 'stroke="#7288a4" stroke-width="1.3" stroke-dasharray="4 3"')}<circle cx="${a.x}" cy="${a.y}" r="3" fill="#7288a4"/><circle cx="${b.x}" cy="${b.y}" r="3" fill="#7288a4"/><text x="${(a.x + b.x) / 2}" y="${(a.y + b.y) / 2 - 9}" text-anchor="middle" class="measure-label">${fmt(K.distance(a, b), 2)} mm</text></g>`;
    }
    if (!options.exporting) {
      if(state.dynamic?.contacts?.length)content+=`<g data-editor-overlay="contact-state" pointer-events="none">${state.dynamic.contacts.map(c=>`<text x="${c.b.x+12/scale}" y="${c.b.y-12/scale}" class="handle-value" font-size="${11/scale}">${c.detached?'Odtrhnutý valček':`Kontakt ${fmt(c.force,1)} N`} · vôľa ${fmt(c.gap,2)} mm</text>`).join('')}</g>`;
      content += manipulationSVG(scale) + freedomSVG(scale) + trialSVG(scale) + liveDimensionSVG(scale) + elasticStatusSVG(scale);
      content += smartSnapSVG(scale);
      content += magicDrawingSVG(scale);
      content += magicDetectionSVG(scale) + detectionEditSVG(scale);
    }
    content += mainDimensionsSVG(result, scale);
    return content;
  }

  function renderScene() {
    const svg = $('#mechanism-canvas');
    if (!svg || !state.view || !state.result) return;
    if (state.magic && state.magic.step <= 2) { renderMagicReference(); return; }
    const { view, result } = state, elements = state.project.elements;
    state.diagnosticRows = W.constraints(state.project, result);
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
    svg.classList.toggle('pan-mode', state.tool === 'pan');
    svg.classList.toggle('connect-mode', state.tool === 'connect');
    svg.classList.toggle('magic-point-mode', state.tool === 'magic-draw');
    const content = sceneMarkup(result, { diagnostics: state.diagnosticRows });
    svg.innerHTML = content;
    renderWorkflowTools();
    renderDiagnostics(); renderSnapChoices(); renderPlacementTools(); renderBindingTools(); renderModelChecks();
    updateSelectionSummary();
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
    let markup = `<defs><linearGradient id="motion-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="var(--accent)" stop-opacity=".18"/><stop offset="1" stop-color="var(--accent)" stop-opacity=".015"/></linearGradient></defs>`;
    if (isDoubleDrawer()) {
      const x = 43 + state.project.parameters.releaseTravel / (range.max - range.min) * 717;
      markup += `<rect x="43" y="13" width="${x - 43}" height="53" fill="var(--accent-pale)"/><line x1="${x}" x2="${x}" y1="13" y2="66" stroke="var(--secondary)" stroke-dasharray="3 4"/><text x="${x + 6}" y="20" class="graph-tick">Sklopené → posuv</text>`;
    }
    for (let i = 0; i <= 3; i++) {
      const y = 66 - i / 3 * 53;
      markup += `<line x1="43" x2="760" y1="${y}" y2="${y}" stroke="var(--border)" stroke-dasharray="${i === 0 ? '' : '3 4'}" stroke-width="1"/><text x="30" y="${y + 3}" text-anchor="end" class="graph-tick">${fmt(K.lerp(min, max, i / 3), 0)}°</text>`;
    }
    for (let i = 0; i <= 6; i++) {
      const x = 43 + i / 6 * 717;
      markup += `<text x="${x}" y="85" text-anchor="middle" class="graph-tick">${fmt(K.lerp(range.min, range.max, i / 6), 0)}</text>`;
    }
    markup += `<path d="${pathD(points)}L760,66L43,66Z" fill="url(#motion-fill)" stroke="none"/><path d="${pathD(points)}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>`;
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

  function setWorkspaceView(analysis) {
    if (state.magic || state.gifExport) return;
    closeContextMenu(); state.playing = false; state.analysis = analysis;
    if (analysis) { state.sweepAnalysis = null; cancelDimensionPick(); }
    updateToolbar(); renderInspector(); updateMotion();
    requestAnimationFrame(() => renderScene());
  }

  function renderAnalysis() {
    const root = $('#analysis-workspace');
    if (!state.analysis || state.magic) return;
    if (!state.project.elements.length) {
      root.innerHTML = '<h2>Analýza mechanizmu</h2><p class="modal-description">Projekt je prázdny. V editore najskôr vložte členy, väzby a pohon.</p><button class="button button-secondary" data-action="view-editor">Späť do editora</button>';
      return;
    }
    const report = state.sweepAnalysis ||= W.analyzeSweep(state.project, state.samples), range = K.driveRange(state.project);
    const card = (title, value, detail) => `<div class="analysis-card"><span>${title}</span><strong>${value}</strong><small>${detail}</small></div>`;
    const peak = state.forceCurve?.length ? state.forceCurve.reduce((a, b) => Math.abs(a.handForce) > Math.abs(b.handForce) ? a : b) : null;
    const critical = report.blocks.map((b) => `<li><button data-action="analysis-pose" data-value="${b.start}">${fmt(b.start)}${b.end !== b.start ? ` – ${fmt(b.end)}` : ''} ${range.unit}</button><span>${escape(b.issue)}</span></li>`).join('');
    const jointErrors = report.joints.filter((j) => ['error', 'missing'].includes(j.status));
    const bounds = state.view || K.bounds(state.project, state.samples);
    root.innerHTML = `<div class="analysis-dashboard-heading"><div><h2>Analýza celého pohybu</h2><p>Simulované polohy v rozsahu ${fmt(range.min)} – ${fmt(range.max)} ${range.unit}, nie iba návrhová geometria. ${report.count} vzoriek; medzi nimi môže zostať nezachytená kolízia.</p></div><button class="button button-secondary" data-action="analysis-pose" data-value="${state.motion}">Aktuálna poloha v editore</button></div>
      <div class="analysis-cards">${card('Priechodnosť vzoriek', `${report.count - report.blocked} / ${report.count}`, report.blocked ? `${report.blocked} polôh hlási problém` : state.collisions ? 'Kontrola väzieb a kolízií' : 'Kolízna kontrola je vypnutá')}${card('Max. polohová chyba', `${fmt(report.positionResidual, 3)} mm`, 'Samostatná polohová tolerancia')}${card('Max. uhlová chyba', `${fmt(report.angularResidual, 3)}°`, 'Samostatná uhlová tolerancia')}${card('Voľné súradnice po pohone', report.freedom.free, 'Numerický odhad, nie dôkaz mobility')}</div>
      ${!report.hasDrive ? '<p class="analysis-warning" role="status">Chýba pohon. Zobrazené vzorky predstavujú statickú geometriu, nie riadený pohyb.</p>' : ''}
      <div class="analysis-preview-grid"><svg id="analysis-preview" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}" role="img" aria-label="Aktuálna poloha mechanizmu"${!state.labels ? ' class="labels-hidden"' : ''}>${sceneMarkup(state.result, { exporting: true, view: bounds, scale: 1 })}</svg><section><h3>Kritické polohy</h3>${critical ? `<ul class="analysis-critical">${critical}</ul>` : '<p>Vo vzorkovaných polohách nie je hlásené blokovanie.</p>'}${report.hints.length ? `<details><summary>Odporúčania pre model</summary><ul>${report.hints.map((hint) => `<li>${escape(hint)}</li>`).join('')}</ul></details>` : ''}<h3>Sily a moment pohonu</h3><p>${peak ? `Najväčšia absolútna vyrovnávacia ${range.unit === '°' ? 'hodnota momentu' : 'sila'}: ${fmt(peak.handForce, 2)} ${range.unit === '°' ? 'N·m' : 'N'} pri ${fmt(peak.motion)} ${range.unit}.` : 'Vypočítajte odhad vyrovnávacej sily alebo momentu v celom zdvihu.'} Ide o odhadový model s jedným vstupom, nie pevnostnú analýzu.</p><button class="button button-secondary" data-action="analyze-forces">Vypočítať sily / moment</button>${state.forceError ? `<p class="analysis-warning">${escape(state.forceError)}</p>` : ''}</section></div>
      <section><h3>Pohyby členov · rozsahy v celom zdvihu</h3><div class="analysis-table-scroll"><table class="analysis-results"><thead><tr><th>Člen / sledovaný bod</th><th>Rozsah X (mm)</th><th>Rozsah Y (mm)</th><th>Uhol (°)</th><th>Dĺžka dráhy (mm)</th></tr></thead><tbody>${report.bodies.map((e) => `<tr><td><button data-action="analysis-member" data-id="${escape(e.id)}">${escape(e.name)} · ${e.reference.toUpperCase()}</button>${!e.complete ? ' · neúplné' : ''}</td><td>${fmt(e.spanX, 2)}</td><td>${fmt(e.spanY, 2)}</td><td>${fmt(e.angleMin, 1)} → ${fmt(e.angleMax, 1)}</td><td>${fmt(e.path, 2)}</td></tr>`).join('')}</tbody></table></div></section>
      ${jointErrors.length ? `<section><h3>Nesplnené väzby v celom pohybe</h3><div class="analysis-table-scroll"><table class="analysis-results"><thead><tr><th>Väzba</th><th>Max. chyba (mm)</th><th>Max. chyba (°)</th><th>Skontrolovať polohu</th></tr></thead><tbody>${jointErrors.map((j) => `<tr><td>${escape(j.name)}</td><td>${fmt(j.mm, 3)}</td><td>${fmt(j.degrees, 3)}</td><td><button data-action="analysis-pose" data-value="${j.mm > K.TOLERANCE ? j.mmAt : j.degreesAt}">Zobraziť v editore</button></td></tr>`).join('')}</tbody></table></div></section>` : ''}`;
  }

  function updateGraphCursor() {
    const cursor = $('#graph-cursor');
    if (!cursor || !state.graphScale) return;
    if (state.graphMode === 'force') { updateForceCursor(); return; }
    const r = K.driveRange(state.project), t = (state.motion - r.min) / (r.max - r.min);
    const point = graphPoint(state.result, t * (state.samples.length - 1), state.graphScale.min, state.graphScale.max);
    point.y = K.clamp(point.y, 5, 70);
    cursor.innerHTML = `<line x1="${point.x}" x2="${point.x}" y1="7" y2="68" stroke="var(--accent)" stroke-width="1" stroke-dasharray="3 3"/><circle cx="${point.x}" cy="${point.y}" r="4.2" fill="var(--paper)" stroke="var(--accent)" stroke-width="2"/><rect x="${K.clamp(point.x - 23, 40, 714)}" y="${K.clamp(point.y - 22, 0, 44)}" width="46" height="16" rx="4" fill="var(--accent-pale)"/><text x="${K.clamp(point.x, 63, 737)}" y="${K.clamp(point.y - 11, 11, 55)}" text-anchor="middle" class="graph-value">${fmt(state.result.angle)}°</text>`;
  }

  function renderForceGraph() {
    const graph = $('#motion-graph'), range = K.driveRange(state.project);
    if (!state.forceContext && !prepareForces()) {
      graph.innerHTML = `<text x="400" y="42" text-anchor="middle" class="graph-tick">${escape(state.forceError)}</text>`;
      $('#graph-legend').textContent = 'Neurčený model síl'; return;
    }
    if(state.forceContext.bodyDynamics){graph.innerHTML='<text x="400" y="42" text-anchor="middle" class="graph-tick">Voľná silová zostava · pohyb a osové sily sledujte na plátne</text>';$('#graph-legend').textContent='Silový pohyb bez motora';return;}
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
    if (!cursor || !state.forceContext || state.forceContext.bodyDynamics) return;
    const range = K.driveRange(state.project), value = P.generalized(state.forceContext, state.motion);
    const x = 43 + (state.motion - range.min) / (range.max - range.min) * 717, y = K.clamp(66 - (value.handForce - state.graphScale.min) / (state.graphScale.max - state.graphScale.min) * 53, 5, 70);
    cursor.innerHTML = `<line x1="${x}" x2="${x}" y1="7" y2="68" stroke="#b9697c" stroke-dasharray="3 3"/><circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="#b9697c" stroke-width="2"/>`;
  }

  function renderPhases() {
    const range = K.driveRange(state.project), root = $('#phase-switcher'), phases = K.projectPhases(state.project), signature = JSON.stringify([range.unit, phases]);
    root.hidden = !state.project.elements.length;
    if (root._phaseSignature !== signature) {
      root.innerHTML = phases.map(({ motion, name }, i) => `<button data-action="phase" data-index="${i}" data-value="${motion}" class="phase-button"><span class="phase-number">${String(i + 1).padStart(2, '0')}</span><span><strong>${escape(name)}</strong><small>${fmt(motion)} ${range.unit}</small></span></button>`).join(''); root._phaseSignature = signature;
    }
    const playing = state.playing && state.project.motionPlan?.phases.length, activeIndex = playing ? WF.planAt(state.project, state.planTime || 0).index + 1 : null;
    for (const button of root.querySelectorAll('.phase-button')) button.classList.toggle('is-active', playing ? Number(button.dataset.index) === activeIndex : Math.abs(state.motion - Number(button.dataset.value)) < (range.max - range.min) / 30);
    if (playing && root._activePhase !== activeIndex) { const active = root.querySelector?.(`[data-index="${activeIndex}"]`); if (active && root.scrollWidth > root.clientWidth) root.scrollLeft = active.offsetLeft - root.clientWidth / 2 + active.offsetWidth / 2; root._activePhase = activeIndex; }
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
    const positionError = Math.max(state.result.positionResidual || 0, ...(state.diagnosticRows || []).map((r) => r.mm || 0));
    const angleError = Math.max(0, ...(state.diagnosticRows || []).map((r) => r.degrees || 0));
    const deviations = [positionError > K.TOLERANCE ? `${fmt(positionError, 2)} mm` : '', angleError > K.TOLERANCE ? `${fmt(angleError, 2)}°` : ''].filter(Boolean).join(' · ');
    $('#solver-status').textContent = state.mode === 'edit' ? 'Editácia · väzby sa nevynucujú' : state.result.blocked ? `Obmedzenie · ${deviations || 'pozri diagnostiku'}` : state.project.elements.length ? 'Väzby splnené' : 'Pripravený na nový model';
    $('#solver-meta').textContent = isDoubleDrawer() ? `${state.result.phaseLabel} · odhad` : `${state.project.connections.length} väzieb · ${state.project.kind === 'custom' ? 'vlastný model' : '1 stupeň voľnosti'}`;
    renderPhases(); updateGraphCursor();
    if (updateProperties) updateLiveProperties();
    const readout = $('#dynamics-readout');
    readout.hidden = state.project.simulation?.mode !== 'dynamic';
    if (!readout.hidden) {
      const dynamic = state.dynamic, tipSpeed = Math.max(0, ...Object.values(dynamic?.particles || {}).map((p) => Math.hypot(p.vx, p.vy) * 1000), ...Object.values(dynamic?.bodies||{}).map((b)=>Math.hypot(b.vx,b.vy)*1000));
      readout.textContent = `ODHADOVÁ DYNAMIKA · t = ${fmt(dynamic?.time || 0, 2)} s · v = ${fmt((dynamic?.velocity || 0) / (state.forceContext?.scale || .001), 2)} ${range.unit}/s${dynamic?.particles ? ` · ${dynamic?.bodies ? 'členy / čapy' : 'čapy'} ${fmt(tipSpeed, 2)} mm/s` : ''}${dynamic?.reason ? ` · ${dynamic.reason}` : ''}`;
    }
  }

  function updateLiveProperties() {
    const pose = selectedPose();
    if ($('#live-x')) $('#live-x').innerHTML = `${fmt(pose?.a.x)} <small>mm</small>`;
    if ($('#live-y')) $('#live-y').innerHTML = `${fmt(pose?.a.y)} <small>mm</small>`;
    if ($('#live-angle')) $('#live-angle').innerHTML = `${fmt(pose?.angle)}<small>°</small>`;
    const selectedForce=state.result.forces?.find(f=>f.id===state.selected);
    if($('#live-nominal-force'))$('#live-nominal-force').textContent=`${fmt(selectedForce?.nominalForce||0,2)} N`;
    if($('#live-damping-force'))$('#live-damping-force').textContent=`${fmt(selectedForce?.dampingForce||0,2)} N`;
    if ($('#live-force')) $('#live-force').textContent = `${fmt(state.result.forces?.find((f) => f.id === state.selected)?.magnitude || 0, 2)} N`;
    const warning = $('#inspector-warning');
    if (warning) { warning.hidden = !state.result.blocked; $('span', warning).textContent = state.result.issues[0] || ''; }
  }

  function setMotion(value, manual = true) {
    if (state.trial) { const safe = WF.trial(state.project, state.motion, value, { profile: state.profile, collisions: state.collisions, samples: state.samples }); value = safe.motion; state.trialBlock = safe.blocked; }
    if (manual && state.mode === 'simulate' && !state.result.blocked && state.project.elements.some(K.isElastic)) {
      const positions = P.elasticPositions(state.dynamic), safe = WF.trial(state.project, state.motion, value, { profile: state.profile, collisions: false, solve: (q) => K.solve(state.project, q, { profile: state.profile, collisions: false, elasticPositions: positions }) });
      value = safe.motion;
    }
    if (manual) {
      if(!state.drag && state.dynamic?.bodies){state.forceContext=null;state.forceCurve=[];}
      state.playing = false; state.planTime = 0;
      state.dynamic = state.drag && state.dynamic?.particles ? { ...state.dynamic, motion: value, velocity: 0, time: 0, stopped: false, reason: '' } : null;
    }
    const range = K.driveRange(state.project);
    state.motion = K.clamp(value, range.min, range.max);
    state.result = solveCurrent();
    if (state.dynamic && state.forceContext) {
      state.result.forces = P.dynamicForces(state.forceContext, state.dynamic, state.result);
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
    $('#save-status').innerHTML = `<i class="${state.dirty ? 'unsaved' : ''}"></i>${state.magic ? 'Magic import · rozpracované' : state.storageFailed ? 'Uložte cez export' : state.dirty ? 'Ukladá sa…' : state.saved ? 'Uložené lokálne' : 'Lokálny projekt'}`;
    document.title = `${state.project.name} — Kinematika`;
  }

  function updateToolbar() {
    updateInspectorVisibility();
    updatePanelVisibility();
    if (!state.magic) try { localStorage.setItem(settingsKey, JSON.stringify(X.preferences(state))); } catch { /* Export includes settings if storage is unavailable. */ }
    for (const key of ['mainDimensions', 'grid', 'dimensions', 'ghosts', 'trace', 'labels', 'loop']) {
      const el = $(`[data-action="${key==='mainDimensions'?'main-dimensions':key}"]`);
      if (el) { el.classList.toggle('is-active', state[key]); el.setAttribute('aria-pressed', state[key]); }
    }
    for (const tool of ['select', 'pan', 'connect', 'measure']) $(`[data-action="tool-${tool}"]`).classList.toggle('is-active', state.tool === tool);
    $('[data-action="undo"]').disabled = !state.history.length || !!state.magic && !magicWorking();
    $('[data-action="redo"]').disabled = !state.future.length || !!state.magic && !magicWorking();
    $('[data-action="view-editor"]').classList.toggle('is-active', !state.analysis);
    $('[data-action="view-analysis"]').classList.toggle('is-active', state.analysis);
    $('[data-action="view-editor"]').setAttribute('aria-pressed', !state.analysis);
    $('[data-action="view-analysis"]').setAttribute('aria-pressed', state.analysis);
    $('.center-workspace').classList.toggle('analysis-mode', state.analysis);
    $('#canvas-area').hidden = state.analysis && !state.magic;
    $('#analysis-workspace').hidden = !state.analysis || !!state.magic;
    $('.stage-header').hidden = state.analysis && !state.magic;
    if (state.analysis) renderAnalysis();
    for (const mode of ['edit', 'simulate']) {
      const button = $(`[data-action="mode-${mode}"]`);
      button.classList.toggle('is-active', state.mode === mode);
      button.setAttribute('aria-pressed', state.mode === mode);
    }
    $('[data-action="make-editable"]').hidden = state.project.kind === 'custom';
    const diagnosticButton = $('[data-action="diagnostics"]');
    diagnosticButton.classList.toggle('is-active', state.diagnosticsOpen);
    diagnosticButton.setAttribute('aria-expanded', state.diagnosticsOpen);
    const snapButton = $('[data-action="smart-snap"]');
    snapButton.classList.toggle('is-active', state.smartSnap);
    snapButton.setAttribute('aria-pressed', state.smartSnap);
    const snapLabel = `Inteligentné prichytávanie: ${state.smartSnap ? 'zapnuté. Vypnúť.' : 'vypnuté. Zapnúť na vyžiadanie.'}`;
    snapButton.setAttribute('aria-label', snapLabel); snapButton.title = snapLabel;
    const gridSnap = $('[data-action="grid-snap"]');
    gridSnap.classList.toggle('is-active', state.snap);
    gridSnap.setAttribute('aria-pressed', state.snap);
    const gridLabel = state.snap ? 'Sieť 5 mm: zapnutá. Vypnúť pre voľný pohyb.' : 'Voľný pohyb bez siete: zapnutý. Zapnúť sieť 5 mm.';
    gridSnap.setAttribute('aria-label', gridLabel); gridSnap.title = `${gridLabel} Inteligentné prichytávanie je samostatné.`;
    const angleSnap = $('[data-action="angle-snap"]');
    if (angleSnap) { angleSnap.classList.toggle('is-active', !!state.angleSnap); angleSnap.setAttribute('aria-pressed', !!state.angleSnap); angleSnap.title = state.angleSnap ? 'Uhlové kroky 10°: zapnuté. Vypnúť.' : 'Uhlové kroky 10°: vypnuté. Zapnúť.'; angleSnap.setAttribute('aria-label', angleSnap.title); }
    $('#workspace').dataset.mode = state.mode;
    const instruction = $('#canvas-instruction');
    instruction.hidden = !['connect', 'measure'].includes(state.tool);
    instruction.textContent = state.tool === 'connect' ? state.pendingJoint ? 'Teraz kliknite na druhý uzlový bod. Esc zruší väzbu.' : 'Kliknite na dva uzlové body. Ložisko môžete spojiť aj s kulisou.' : state.dimensionPick?.a ? 'Kliknite na druhý bod kóty B. Esc zruší výber bez zmeny projektu.' : 'Kliknite na prvý bod kóty A a potom na B. Uzly sa prepoja s telesami; klik do pozadia použije voľný bod.';
    renderMagicImport();
  }

  function selectElement(id) {
    const e = state.project.elements.find((e) => e.id === id);
    selectTarget(e && ['node', 'bearing'].includes(e.type) ? I.nodeKey({ elementId: id, point: 'a' }) : id ? I.elementKey(id) : null);
  }

  function defaultTraceReference() {
    const e = currentElement();
    return { elementId: e?.id || '', point: K.defaultTracePoint(e) };
  }

  function repairSelection() {
    state.selectedElementIds = I.validSelection(state.project, state.selectedElementIds);
    const t = I.target(state.project, state.selectedElementIds.at(-1));
    state.selected = t?.elementId || I.reference(t)?.elementId || null;
  }

  function selectTarget(key, additive = false, preserve = false) {
    const restoreFocus = $('#mechanism-canvas').contains(document.activeElement);
    const previous = state.selectedElementIds.join('|');
    if (!preserve || !state.selectedElementIds.includes(key)) state.selectedElementIds = I.select(state.selectedElementIds, key, additive);
    if (state.selectedElementIds.join('|') !== previous) state.editPivot = null;
    repairSelection(); state.inspectorTab = 'geometry';
    renderTree(); renderInspector(); renderScene(); updateToolbar();
    if (restoreFocus) $('#mechanism-canvas').focus({ preventScroll: true });
  }

  function memberSelected(id) {
    return state.selectedElementIds.some((key) => { const target = I.target(state.project, key); return target?.elementId === id || target?.type === 'joint' && [target.joint.a, target.joint.b].some((r) => I.root(state.project, state.project.elements.find((e) => e.id === r.elementId))?.id === I.root(state.project, state.project.elements.find((e) => e.id === id))?.id); });
  }

  function selectedNodeReferences(fallback = null) {
    const refs = state.selectedElementIds.map((key) => I.reference(I.target(state.project, key))).filter(Boolean);
    return [...new Map((refs.length ? refs : fallback ? [fallback] : []).map((r) => [I.nodeKey(r), r])).values()];
  }
  function contextNodeReferences(r) {
    return r && state.selectedElementIds.includes(I.nodeKey(r)) && state.selectedElementIds.every((key) => I.target(state.project, key)?.type === 'node') ? selectedNodeReferences(r) : r ? [r] : [];
  }
  function contextDeleteKeys(t) {
    return ['link', 'path'].includes(t?.type) && memberSelected(t.elementId) && state.selectedElementIds.every((key) => ['link', 'path'].includes(I.target(state.project, key)?.type)) ? [...state.selectedElementIds] : t?.type === 'node' ? [I.nodeKey(I.reference(t))] : t?.elementId ? [I.elementKey(t.elementId)] : [];
  }
  function curveEditKeys(id, key = I.elementKey(id)) {
    return [...new Set([...state.selectedElementIds.filter((value) => I.target(state.project, value)?.elementId !== id), key])];
  }

  function updateSelectionSummary() {
    const el = $('#selection-summary');
    el.hidden = !state.selectedElementIds.length;
    const target = I.target(state.project, state.selectedElementIds.at(-1)), editable = target?.element && !target.element.primary && state.mode === 'edit';
    el.innerHTML = `<span>${state.selectedElementIds.length} ${state.selectedElementIds.length === 1 ? 'vybraná položka' : 'vybraných položiek'}</span><button data-action="selection-settings"${editable ? '' : ' disabled'}>Spojenia / uloženie…</button><button data-action="properties-overview">Vlastnosti…</button><button class="mobile-selection-button" data-action="mobile-selection" aria-haspopup="dialog">${escape(target?.element?.name || 'Upraviť výber')}</button>`;
  }

  function jointPoints(joint, result = state.result) {
    const pa = result.poses[joint.a.elementId], pb = result.poses[joint.b.elementId];
    let a = pa?.[joint.a.point], b = pb?.[joint.b.point];
    const roller = state.project.elements.find((e) => e.id === (joint.a.point === 'curve' ? joint.b : joint.a).elementId);
    const nearest = (point, pose) => joint.type === 'cam-contact' ? K.nearestOnCam(point, pose, roller.primary ? state.project.parameters.bearingRadius : roller.radius) : K.nearestOnPath(point, pose.path);
    if (joint.a.point === 'curve' && b && pa?.path) a = nearest(b, pa);
    if (joint.b.point === 'curve' && a && pb?.path) b = nearest(a, pb);
    return { a, b };
  }

  function manipulationSVG(scale) {
    const toolbar = $('#manipulation-tools'), ids = W.bodies(state.project, state.selectedElementIds), selected = ids.map((id) => state.project.elements.find((e) => e.id === id));
    const canTransform = selected.length && selected.every((e) => e.visible && !e.primary && !e.locked && !K.isElastic(e));
    const canThickness = selected.length === 1 && selected[0].visible && W.thickness(selected[0]);
    const enabled = state.mode === 'edit' && state.tool === 'select' && (canTransform || canThickness);
    toolbar.hidden = !enabled;
    if (!enabled) { toolbar.innerHTML = ''; return ''; }
    const single = selected.length === 1 ? selected[0] : null, canLength = single && ['link', 'panel', 'ground', 'rail'].includes(single.type) && !single.outline.length;
    toolbar.innerHTML = `${canThickness ? '<button data-action="edit-thickness">Hrúbka / priemer</button>' : ''}${canTransform ? `<button data-action="edit-numbers">${icon('ruler', 13)}X / Y</button><button data-action="edit-rotation">${icon('reset', 13)}Uhol</button><button data-action="edit-pivot">${icon('target', 13)}Bod otáčania</button>${canLength ? '<button data-action="edit-length">Dĺžka</button>' : ''}` : ''}`;
    if (window.innerWidth <= 640 && !state.mobileHandles) return '';
    const origin = state.editPivot || W.pivot(state.project, state.selectedElementIds, state.result), size = 42 / scale, radius = 66 / scale, knob = 6 / scale;
    const handle = (kind, at, label, shape = 'circle', extra = '') => `<g data-edit-handle="${kind}" ${extra} class="edit-handle ${kind}" role="button" tabindex="0" aria-label="${escape(label)}. ${kind === 'pivot' ? 'Kliknite na výber uzla alebo zadanie X / Y.' : 'Potiahnite alebo kliknite na presné číselné zadanie.'}"><title>${escape(label)}</title>${shape === 'circle' ? `<circle cx="${at.x}" cy="${at.y}" r="${knob}"/>` : `<rect x="${at.x - knob}" y="${at.y - knob}" width="${2 * knob}" height="${2 * knob}" rx="${2 / scale}"/>`}</g>`;
    let content = `<g data-editor-overlay="manipulation"><g class="edit-axes" pointer-events="none">${line(origin, { x: origin.x + size, y: origin.y }, 'class="edit-axis-x" vector-effect="non-scaling-stroke"')}${line(origin, { x: origin.x, y: origin.y + size }, 'class="edit-axis-y" vector-effect="non-scaling-stroke"')}<circle cx="${origin.x}" cy="${origin.y}" r="${radius}" class="edit-rotation-ring" vector-effect="non-scaling-stroke"/><text x="${origin.x + size + 10 / scale}" y="${origin.y + 4 / scale}" font-size="${11 / scale}">X</text><text x="${origin.x + 10 / scale}" y="${origin.y + size}" font-size="${11 / scale}">Y</text></g>`;
    if (!canTransform) content = '<g data-editor-overlay="manipulation">';
    if (canTransform) {
    content += handle('move-x', { x: origin.x + size, y: origin.y }, 'Posun vybraných členov v osi X');
    content += handle('move-y', { x: origin.x, y: origin.y + size }, 'Posun vybraných členov v osi Y');
    content += handle('rotate', { x: origin.x + radius, y: origin.y }, 'Otočenie vybraných členov okolo zvoleného bodu');
    const pivotKnob = { x: origin.x - 18 / scale, y: origin.y - 18 / scale };
    content += line(origin, pivotKnob, 'stroke="var(--secondary)" stroke-dasharray="3 3" vector-effect="non-scaling-stroke" pointer-events="none"');
    content += handle('pivot', pivotKnob, 'Zvoliť bod otáčania', 'rect');
    if (canLength) {
      const pose = state.result.poses[single.id], target = I.target(state.project, state.selectedElementIds.at(-1));
      const fixedEnd = target?.point === 'b' || single.drive && single.drivePivot === 'b' ? 'b' : 'a', end = pose[fixedEnd === 'a' ? 'b' : 'a'];
      const offset = K.rotate({ x: 0, y: -17 / scale }, pose.angle), at = { x: end.x + offset.x, y: end.y + offset.y };
      content += line(end, at, 'stroke="var(--secondary)" vector-effect="non-scaling-stroke" pointer-events="none"');
      content += handle('length', at, 'Upraviť dĺžku člena', 'rect', `data-fixed-end="${fixedEnd}"`) + `<text x="${at.x+10/scale}" y="${at.y+4/scale}" class="handle-value" font-size="${11/scale}" pointer-events="none">L ${fmt(single.length,1)} mm</text>`;
    }
    }
    if (canThickness) {
      const pose = state.result.poses[single.id], size = W.thickness(single), base = ['bearing', 'node', 'cam'].includes(single.type) ? pose.a : { x: (pose.a.x + pose.b.x)/2, y: (pose.a.y + pose.b.y)/2 };
      const at = K.along(base, size.value / 2 + 12 / scale, pose.angle - 90);
      content += line(base, at, 'stroke="var(--secondary)" vector-effect="non-scaling-stroke" pointer-events="none"');
      content += handle('thickness', at, `${size.label} člena`, 'rect') + `<text x="${at.x+10/scale}" y="${at.y+4/scale}" class="handle-value" font-size="${11/scale}" pointer-events="none">${escape(size.label)} ${fmt(size.value,1)} mm</text>`;
    }
    return `${content}</g>`;
  }

  function transformModal(kind = 'move', fixedEnd = null) {
    if (state.mode !== 'edit') { toast('Priame úchyty sú dostupné v režime Úprava geometrie.', true); return; }
    const ids = W.bodies(state.project, state.selectedElementIds), e = ids.length === 1 ? state.project.elements.find((e) => e.id === ids[0]) : null;
    if (!ids.length) return;
    const origin = state.editPivot || W.pivot(state.project, state.selectedElementIds, state.result);
    const number = (name, label, value, min = -5000, max = 5000) => quantityInput(name, label, value, name === 'angle' ? '°' : 'mm', min, max);
    let fields = '';
    if (['move', 'move-x', 'move-y'].includes(kind)) {
      if (kind !== 'move-y') fields += number('dx', 'Posun X (mm)', 0);
      if (kind !== 'move-x') fields += number('dy', 'Posun Y (mm, kladný nadol)', 0);
    }
    if (kind === 'rotate') fields += number('angle', 'Relatívne otočenie (°, kladné proti hodinovým ručičkám)', 0, -360, 360);
    if (['rotate', 'pivot'].includes(kind)) {
      fields += `<label class="property-field"><span>Bod otáčania podľa uzla</span><select class="property-select" name="pivot-reference"><option value="">Vlastné X / Y</option>${state.project.elements.flatMap((e) => I.pointKeys(e).filter((key) => state.result.poses[e.id]?.[key]).map((key) => `<option value="${escape(`${e.id}|${key}`)}">${escape(e.name)} · ${key.toUpperCase()}</option>`)).join('')}</select></label>`;
      fields += number('px', 'Bod otáčania X (mm)', origin.x) + number('py', 'Bod otáčania Y (mm)', origin.y);
    }
    if (kind === 'thickness') { if (!e) return; const size = W.thickness(e); fields += number('thickness', `${size.label} (mm)`, size.value, .1, 500); }
    if (kind === 'length') {
      if (!e) return;
      const end = fixedEnd || W.preferredEnd(state.project, e.id);
      fields += number('length', 'Dĺžka A–B (mm)', e.length, .1, 5000);
      fields += `<label class="property-field"><span>Zachovať bod</span><select class="property-select" name="fixed-end"><option value="a"${end === 'a' ? ' selected' : ''}>A</option><option value="b"${end === 'b' ? ' selected' : ''}>B</option><option value="center"${end === 'center' ? ' selected' : ''}>Stred A–B</option></select></label>`;
    }
    modal(kind === 'pivot' ? 'Bod otáčania' : kind === 'length' ? 'Presná dĺžka člena' : 'Presná úprava na plátne', `<p class="modal-description">Úprava geometrie ${ids.length === 1 ? 'celého člena' : 'vybranej skupiny'}. Väzby sa pri návrhu nevynucujú. Potvrdená úprava tvorí jeden krok Späť. Výrazy: <code>300/2</code>, <code>12,5 cm</code>, <code>(20+5)*2 mm</code>; uhly v ° alebo rad.</p><form id="transform-form" data-kind="${kind}" data-keys="${escape(JSON.stringify(state.selectedElementIds))}"><div class="settings-fields">${fields}</div><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zrušiť</button><button type="submit" class="button button-dark">Použiť</button></div></form>`);
  }

  function submitTransform(form, data) {
    const kind = form.dataset.kind, keys = JSON.parse(form.dataset.keys), origin = ['pivot', 'rotate'].includes(kind) ? { x: quantityValue(data, 'px'), y: quantityValue(data, 'py') } : null;
    if (kind === 'pivot') {
      if (![origin.x, origin.y].every(Number.isFinite) || Math.max(Math.abs(origin.x), Math.abs(origin.y)) > 5000) throw new Error('Bod otáčania musí mať platné X / Y v rozsahu ±5000 mm.');
      state.editPivot = origin; renderScene();
    } else {
      const ids = W.bodies(state.project, keys);
      const next = kind === 'thickness' ? W.setThickness(state.project, ids[0], quantityValue(data, 'thickness', 'mm', .1, 500)) : kind === 'length' ? W.setLength(state.project, ids[0], quantityValue(data, 'length', 'mm', .1), String(data.get('fixed-end')), state.result)
        : W.transform(state.project, keys, { dx: quantityValue(data, 'dx', 'mm', -5000, 5000, 0), dy: quantityValue(data, 'dy', 'mm', -5000, 5000, 0), angle: quantityValue(data, 'angle', '°', -360, 360, 0), pivot: kind === 'rotate' ? origin : undefined }, state.result);
      if (JSON.stringify(next) !== JSON.stringify(state.project)) editCanvas(next, 'Geometria bola upravená.');
      if (kind === 'rotate') state.editPivot = origin;
    }
    $('#modal').close(); renderScene();
  }

  function renderDiagnostics() {
    const panel = $('#diagnostics-panel');
    panel.hidden = !state.diagnosticsOpen;
    if (panel.hidden) return;
    const now = Date.now(), cache = state.diagnosticAnalysis;
    if (!cache || !(state.playing || state.drag) || now - cache.time > 500) state.diagnosticAnalysis = { ...W.diagnose(state.project, state.result), time: now };
    const analysis = state.diagnosticAnalysis, rows = state.diagnosticRows, repairs=WF.repairSuggestions(state.project,state.result);
    panel.innerHTML = `<div class="diagnostics-heading"><strong>Diagnostika zobrazenej polohy</strong><span>Tolerancia ${fmt(K.TOLERANCE, 2)} mm / ${fmt(K.TOLERANCE, 2)}° · ${state.mode === 'edit' ? 'návrh bez vynútenia' : 'simulácia'}</span>${ib('close', 'diagnostics', 'Zavrieť diagnostiku')}</div><div class="diagnostics-content"><div class="diagnostic-hints">${repairs.map(f=>`<button class="model-check repair-button" data-action="repair-model" data-key="${escape(f.key)}" data-kind="${f.action}">${escape(f.label)}</button>`).join('')}${(analysis.checks || []).map((check) => `<button class="model-check" data-action="check-model" data-key="${escape(check.key)}" data-kind="${check.action}"${check.otherKey ? ` data-other="${escape(check.otherKey)}"` : ''}>${escape(check.message)}</button>`).join('')}${[...analysis.hints, ...state.result.issues].map((hint) => `<p>${escape(hint)}</p>`).join('') || '<p>V tejto polohe nie je zistený konflikt väzieb.</p>'}</div>${rows.length ? `<div class="comparison-scroll"><table class="diagnostic-table"><thead><tr><th>Väzba</th><th>Poloha (mm)</th><th>Uhol (°)</th><th>Stav</th></tr></thead><tbody>${rows.map((r) => `<tr class="${r.status === 'error' || r.status === 'missing' ? 'diagnostic-error' : ''}"><td><button data-action="select-diagnostic" data-key="${escape(r.key)}">${escape(r.name)}</button></td><td>${fmt(r.mm, 3)}</td><td>${fmt(r.degrees, 3)}</td><td>${({ ok: 'Splnená', error: 'Odchýlka', missing: 'Chýbajúci uzol', prescribed: 'Parametrická' })[r.status]}</td></tr>`).join('')}</tbody></table></div>` : '<p class="section-description">Model nemá samostatné kĺbové väzby.</p>'}</div>`;
  }

  function selectionReference() {
    const target = I.target(state.project, state.selectedElementIds.at(-1));
    const reference = I.reference(target);
    if (reference) return reference;
    const e = target?.element;
    return e ? { elementId: e.id, point: K.defaultTracePoint(e) } : null;
  }

  function renderBindingTools() {
    const el = $('#binding-tools'), target = I.target(state.project, state.selectedElementIds.at(-1)), e = target?.element;
    if (!el) return; el.hidden = true; el.innerHTML = '';
    if (!e || e.primary || state.mode !== 'edit') return;
    const r = selectionReference(), linked = state.project.connections.filter((j) => [j.a, j.b].some((r) => r.elementId === e.id)).length;
    const fixed = target.type === 'node' ? I.fixed(state.project, r) : e.locked || e.type === 'ground';
    el.innerHTML = `<strong>${escape(e.name)}${target.type === 'node' ? ` · ${r.point.toUpperCase()}` : ''}</strong><div><span>Spojenia · bod môžete potiahnuť na iný bod</span><button data-action="selection-connect">Spojiť bod · ${linked}</button><span>Uloženie</span>${e.type === 'rail' ? `<button data-action="selection-rail" data-moving="false" aria-pressed="${!e.movingRail}">Pevné vedenie · hýbe sa vozík</button><button data-action="selection-rail" data-moving="true" aria-pressed="${!!e.movingRail}">Pevný vozík · hýbe sa vedenie</button>` : `<button data-action="selection-support"${K.isElastic(e) ? ' disabled' : ''}>${fixed ? 'Uvoľniť' : 'Ukotviť'} ${target.type === 'node' ? 'bod k rámu' : 'teleso k rámu'}</button>`}<span>Pohon</span><button data-action="selection-motor"${['ground', 'slot'].includes(e.type) || e.parentId || K.isElastic(e) ? ' disabled' : ''}>${e.drive ? 'Upraviť pohon' : 'Priradiť pohon'}</button></div>`;

  }

  function beginSelectedConnection() {
    const r = selectionReference(); if (!r) return;
    setTool('connect'); state.pendingJoint = r; updateToolbar(); renderScene();
  }

  function renderModelChecks() {
    const el = $('#model-checks'); if (!el) return;
    el.hidden = !state.project.elements.length || !!state.magic || !!state.insertingType || !!state.draggedPaletteType;
    if (el.hidden) return;
    const now = Date.now(), cached = state.quickChecks;
    if (!cached || cached.result !== state.result && (!(state.drag || state.playing) || now - cached.time > 500)) state.quickChecks = { result: state.result, time: now, analysis: W.diagnose(state.project, state.result) };
    const checks = state.quickChecks.analysis.checks || [];
    const open = el.querySelector?.('details')?.open;
    el.innerHTML = `<details${open ? ' open' : ''}><summary>Overiť model · ${checks.length ? `${checks.length} odporúčaní` : 'bez zistených problémov'}</summary><div>${checks.map((check) => `<button class="model-check" data-action="check-model" data-key="${escape(check.key)}" data-kind="${check.action}"${check.otherKey ? ` data-other="${escape(check.otherKey)}"` : ''}>${escape(check.message)}</button>`).join('') || '<p>V zobrazenej polohe nie je zistený problém väzieb.</p>'}</div></details>`;
  }

  function focusModelCheck(el) {
    const target = I.target(state.project, el.dataset.key); if (!target) return;
    if (state.view) {
      const pose = state.result.poses[target.elementId];
      const points = target.type === 'joint' ? [K.point(state.result, target.joint.a), K.point(state.result, target.joint.b)].filter(Boolean) : [pose?.a, pose?.b].filter(Boolean);
      if (points.length) { const x = points.reduce((sum, p) => sum + p.x, 0) / points.length, y = points.reduce((sum, p) => sum + p.y, 0) / points.length; state.view = { ...state.view, x: x - state.view.width / 2, y: y - state.view.height / 2 }; }
    }
    selectTarget(el.dataset.key);
    if (el.dataset.other && I.target(state.project, el.dataset.other)) selectTarget(el.dataset.other, true);
    if(el.dataset.kind==='forces')actions['force-motion']();
    else if (el.dataset.kind === 'motor') { const r = selectionReference(); if (r) canvasDialog('motor', r); }
    else if (el.dataset.kind === 'connect') beginSelectedConnection();
    else { setInspectorOpen(true); state.diagnosticsOpen = true; renderScene(); }
  }

  function toggleSmartSnap() {
    if (state.drag) onPointerUp({ pointerId: state.drag.pointerId, cancelled: true });
    state.smartSnap = !state.smartSnap; state.snapPreview = null; dismissSnapChoices();
    renderScene(); updateToolbar();
    toast(state.smartSnap ? 'Inteligentné prichytávanie je zapnuté. Väzba vznikne iba po ďalšom potvrdení.' : 'Inteligentné prichytávanie je vypnuté.');
  }

  function toggleGridSnap() {
    if (state.drag) onPointerUp({ pointerId: state.drag.pointerId, cancelled: true });
    state.snap = !state.snap; state.snapPreview = null;
    renderScene(); updateToolbar();
    toast(state.snap ? 'Prichytávanie na sieť 5 mm je zapnuté.' : 'Sieť je vypnutá. Pohyb nemá 5 mm kroky; inteligentné prichytávanie je samostatné.');
  }

  function toggleAngleSnap() {
    if (state.drag) onPointerUp({ pointerId: state.drag.pointerId, cancelled: true });
    state.angleSnap = !state.angleSnap; renderScene(); updateToolbar();
    toast(state.angleSnap ? 'Uhlové kroky 10° sú zapnuté.' : 'Uhlové kroky sú vypnuté. Otáčanie je plynulé.');
  }

  function snapPaths() {
    if (!state.trace) return [];
    const paths = [];
    for (const reference of traceReferences()) {
      const space = reference.space || state.traceSpace, origin = space === 'carrier' ? state.result.referenceOrigin : null;
      let points = [];
      const flush = () => { if (points.length > 1) paths.push({ id: `${reference.elementId}:${reference.point}:${paths.length}`, points }); points = []; };
      for (const sample of state.samples) {
        const point = K.tracePoint(sample, reference, space);
        if (!point || sample.blocked) flush();
        else points.push(origin ? { x: point.x + origin.x, y: point.y + origin.y } : point);
      }
      flush();
    }
    return paths;
  }

  function snapOptions() {
    const matrix = $('#mechanism-canvas').getScreenCTM(), scale = Math.hypot(matrix?.a || 1, matrix?.b || 0);
    return { enabled: state.smartSnap && !state.snapSuppressed, tolerance: 8 / scale, paths: snapPaths() };
  }

  function placementAt(type, point) {
    const template = K.makeElement(type), mount = I.pointKeys(template).includes(state.placementMount) ? state.placementMount : type === 'rail' ? 'c' : 'a';
    const e = W.placement(state.project, type, point, mount), preview = W.findPlacementSnap(state.project, e, { ...snapOptions(), cursor: point, sourcePoint: mount, previous: state.placementPreview?.preview });
    if (preview) { e.x += preview.delta.x; e.y += preview.delta.y; }
    else if (state.snap && !state.snapSuppressed) { e.x += Math.round(point.x / 5) * 5 - point.x; e.y += Math.round(point.y / 5) * 5 - point.y; }
    state.placementPreview = { element: e, preview, mount, point: { ...point } };
    return { element: e, preview };
  }

  function cyclePlacementMount(backward = false) {
    const type = state.draggedPaletteType || state.insertingType || state.magic?.placementType;
    if (!type) return;
    const keys = I.pointKeys(K.makeElement(type)), current = state.placementMount || (type === 'rail' ? 'c' : 'a');
    state.placementMount = keys[(keys.indexOf(current) + (backward ? keys.length - 1 : 1)) % keys.length]; state.placementPreview = null;
    if (state.pointer) state.snapPreview = placementAt(type, state.pointer).preview;
    renderSmartSnapPreview(); renderPlacementTools();
  }

  function renderPlacementTools() {
    const el = $('#placement-tools'), type = state.draggedPaletteType || state.insertingType || state.magic?.placementType;
    if (!el) return; el.hidden = !type;
    if (!type) return;
    const keys = I.pointKeys(K.makeElement(type)), mount = state.placementPreview?.mount || state.placementMount || (type === 'rail' ? 'c' : 'a');
    el.innerHTML = `<strong>${escape(typeNames[type])}</strong><span>Uchopiť za bod</span>${keys.map((key) => `<button type="button" data-action="placement-mount" data-point="${key}" aria-pressed="${key === mount}">${key.toUpperCase()}</button>`).join('')}<button type="button" data-action="placement-cancel">Zrušiť</button><small>Tab: ďalší bod · Alt: bez prichytenia</small>`;
  }

  function snapDrawingPoint(point, elementId = null) {
    if (state.smartSnap && !state.snapSuppressed) {
      const probe = K.makeElement('node', point.x, point.y), p = K.copy(state.project);
      const excluded = elementId ? W.descendants(p, [elementId]) : new Set();
      p.elements = p.elements.filter((e) => !excluded.has(e.id));
      p.connections = p.connections.filter((j) => [j.a, j.b].every((r) => !excluded.has(r.elementId)));
      // A virtual source avoids project-size validation and never creates a body or joint.
      const result = { ...state.result, poses: { ...state.result.poses, [probe.id]: { a: point, b: point, angle: 0 } } };
      p.elements.push(probe);
      const preview = W.findSnap(p, [I.nodeKey({ elementId: probe.id, point: 'a' })], result, { x: 0, y: 0 }, snapOptions());
      state.snapPreview = preview;
      if (preview) return { ...preview.point };
    }
    state.snapPreview = null;
    return state.snap && !state.snapSuppressed ? { x: Math.round(point.x / 5) * 5, y: Math.round(point.y / 5) * 5 } : point;
  }

  function findDragSnap(drag, delta, axis = null) {
    if (drag.nodeConnection && !state.snapSuppressed) {
      const choices=WF.connectionChoices(drag.projectBefore,drag.nodeConnection,drag.resultBefore,{x:drag.anchor.x+delta.x,y:drag.anchor.y+delta.y},snapOptions().tolerance,!!drag.mount);
      if(choices.length){const preview={...choices[0],alternatives:choices};drag.preview=preview;state.snapPreview=preview;return preview;}
    }
    const preview = W.findSnap(drag.projectBefore, drag.keys, drag.resultBefore, delta, { ...snapOptions(), wholeBodies: drag.kind === 'manipulation' || !!drag.mount, sourcePoint: drag.mount?.point, previous: drag.preview, axis, cursor: drag.start });
    drag.preview = preview; state.snapPreview = preview;
    return preview;
  }

  function smartSnapSVG(scale) {
    const preview = (state.smartSnap || state.snapPreview?.direct) && !state.snapSuppressed && state.snapPreview;
    if (!preview) return '';
    const at = preview.point, target = preview.target.at, radius = 9 / scale;
    return `<g data-editor-overlay="smart-snap" class="smart-snap-preview" pointer-events="none">${line(at, target, 'stroke="var(--accent)" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"')}<circle cx="${at.x}" cy="${at.y}" r="${radius}" fill="var(--paper)" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke"/><path d="M${at.x - radius / 2} ${at.y}h${radius}M${at.x} ${at.y - radius / 2}v${radius}" fill="none" stroke="var(--accent)" vector-effect="non-scaling-stroke"/><text x="${at.x + 14 / scale}" y="${at.y - 13 / scale}" font-size="${11 / scale}" fill="var(--ink)">${escape(preview.label)} · len náhľad</text></g>`;
  }

  function renderSmartSnapPreview() {
    const svg = $('#mechanism-canvas');
    if (!svg) return;
    // Replacing the scene during HTML5 drag detaches the browser's live drop target.
    for (const overlay of svg.querySelectorAll('[data-editor-overlay="smart-snap"]')) overlay.remove();
    const matrix = svg.getScreenCTM(), scale = Math.hypot(matrix?.a ?? 1, matrix?.b ?? 0) || 1;
    let preview = smartSnapSVG(scale);
    if (state.placementPreview && (state.draggedPaletteType || state.insertingType || state.magic?.placementType)) {
      const e = state.placementPreview.element, p = K.copy(state.project); p.elements.push(e);
      const result = E.design(K.validateProject(p), K.driveRange(p).min), pose = result.poses[e.id], at = pose[state.placementPreview.mount];
      preview += `<g data-editor-overlay="smart-snap" class="placement-ghost" pointer-events="none"><g opacity=".45">${drawElement(e, pose, result)}</g><circle cx="${at.x}" cy="${at.y}" r="${6 / scale}" fill="var(--paper)" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke"/><text x="${at.x + 10 / scale}" y="${at.y + 14 / scale}" font-size="${11 / scale}" fill="var(--ink)">${state.placementPreview.mount.toUpperCase()}</text></g>`;
    }
    if (preview) svg.insertAdjacentHTML('beforeend', preview);
  }

  function offerSnapConnection(preview, merge = false) {
    if ((!state.smartSnap && !preview?.direct) || state.snapSuppressed || !preview || !['endpoint', 'midpoint', 'guide', 'cam-contact'].includes(preview.kind)) return;
    state.pendingSnap = K.copy(preview);
    state.snapTransaction = merge ? { historyLength: state.history.length, project: JSON.stringify(state.project) } : null;
    renderSnapChoices(); renderBindingTools();
    $('#snap-choices')?.querySelector?.('[data-action="snap-connect"]')?.focus({ preventScroll: true });
  }

  function dismissSnapChoices() {
    state.pendingSnap = null; state.snapTransaction = null;
    renderSnapChoices(); renderBindingTools();
  }

  function renderSnapChoices() {
    const el = $('#snap-choices'), preview = state.pendingSnap;
    if (!el) return; el.hidden = !preview;
    if (!preview) return;
    const target = state.project.elements.find((e) => e.id === preview.target.elementId), source = state.project.elements.find((e) => e.id === preview.source.elementId);
    const types = preview.kind === 'cam-contact' ? [['cam-contact', 'Kontakt vačky']] : preview.target.ref?.point === 'curve' ? [...(target?.type === 'rail' ? [['prismatic', 'Posuvne']] : []), ['point-path', 'Otočne v dráhe']] : K.isElastic(source) || K.isElastic(target) ? [['revolute', 'Otočne']] : [['revolute', 'Otočne'], ['fixed', 'Napevno']];
    el.innerHTML = `<span>${escape(source?.name || 'Prvok')} ↔ ${escape(target?.name || 'Montážny bod')}</span>${preview.alternatives?.length>1 ? `<label>Cieľ spojenia<select class="property-select" data-setting="connection-target">${preview.alternatives.map((p,i)=>`<option value="${i}"${p.target.elementId===preview.target.elementId&&p.target.ref.point===preview.target.ref.point?' selected':''}>${escape(p.label)}</option>`).join('')}</select></label>` : ''}<div>${types.map(([type, label]) => `<button type="button" data-action="snap-connect" data-type="${type}">${label}</button>`).join('')}<button type="button" data-action="snap-preview" data-type="${types[0][0]}">Náhľad…</button><button type="button" data-action="snap-position">Len poloha</button></div><small>Vyberte typ spojenia · Escape ponechá polohu · Späť vráti celé prichytenie</small>`;
    const matrix = $('#mechanism-canvas').getScreenCTM(), area = $('#canvas-area').getBoundingClientRect();
    if (matrix) { el.style ||= {}; el.style.left = `${Math.max(12, Math.min(area.width - 300, preview.point.x * matrix.a + preview.point.y * matrix.c + matrix.e - (area.left || 0) + 16))}px`; el.style.top = `${Math.max(12, Math.min((area.height || 450) - 110, preview.point.x * matrix.b + preview.point.y * matrix.d + matrix.f - (area.top || 0) + 16))}px`; }
  }

  function submitSnapConnection(data) {
    if ((!state.smartSnap && !state.pendingSnap?.direct) || !state.pendingSnap) throw new Error('Prichytávanie je vypnuté alebo náhľad už neplatí.');
    const transaction = state.snapTransaction;
    if (transaction && (transaction.historyLength !== state.history.length || transaction.project !== JSON.stringify(state.project))) { dismissSnapChoices(); throw new Error('Model sa zmenil. Prichyťte body znova.'); }
    const next = W.connectSnap(state.project, state.pendingSnap, String(data.get('type')));
    if (!transaction) pushHistory();
    state.project = next; state.playing = false; state.mode = 'edit'; dismissSnapChoices(); changed(false);
    toast('Spojenie bolo vytvorené. Späť vráti celé prichytenie.');
  }

  function canvasHit(event, all = false) {
    const matrix = $('#mechanism-canvas').getScreenCTM();
    if (!matrix) return all ? [] : null;
    const screen = (p) => ({ x: p.x * matrix.a + p.y * matrix.c + matrix.e, y: p.x * matrix.b + p.y * matrix.d + matrix.f });
    const candidates = [];
    for (const e of state.project.elements.filter((e) => e.visible)) {
      if (state.tool === 'connect' && state.pendingJoint?.elementId === e.id) continue;
      const pose = state.result.poses[e.id];
      if (state.mode === 'edit' && state.tool === 'select' && e.id === state.selected && pose) {
        if (e.type === 'slot' && (!e.primary || state.project.kind === 'drawer' && ['bezier', 'spline'].includes(state.project.parameters.curveKind))) {
          const points = I.controlPoints(state.project, e), stride = Math.ceil(points.length / 64);
          points.forEach((point, i) => {
            if (i % stride && i !== points.length - 1 || !e.primary && e.curveKind === 'arc' && i !== 0 && i !== points.length - 1) return;
            const at = e.primary ? { x: point.x + state.project.parameters.slotOffsetX, y: point.y + state.project.parameters.slotOffsetY } : K.worldPoint({ a: pose.controlOrigin || pose.a, angle: pose.angle }, point);
            candidates.push({ type: 'control', key: I.controlKey(e.id, i), at: screen(at) });
          });
        }
        if (!e.primary && e.outline?.length) pose.outline.forEach((point, i) => candidates.push({ type: 'outline', key: I.outlineKey(e.id, i), at: screen(point) }));
      }
      for (const key of I.pointKeys(e)) if (pose?.[key]) {
        const identity = I.nodeKey({ elementId: e.id, point: key });
        candidates.push({ type: 'node', key: identity, at: screen(pose[key]), selected: state.tool === 'select' && state.mode === 'edit' && state.selectedElementIds.includes(identity), priority: e.type === 'bearing' ? 2 : e.type === 'node' ? 1 : 0 });
      }
      if (pose && !['node', 'bearing'].includes(e.type)) {
        const polygon = pose.outline?.length ? pose.outline : e.type === 'panel' ? panelPoints(pose, e.primary ? state.project.parameters.panelThickness : e.width) : null;
        candidates.push({ type: 'body', key: e.type === 'slot' ? I.pathKey(e.id) : I.elementKey(e.id), path: (pose.path?.length ? pose.path : [pose.a, pose.b]).filter(Boolean).map(screen), polygon: polygon?.map(screen), radius: Math.max(7, (e.width + 3) * Math.hypot(matrix.a, matrix.b) / 2), priority: state.project.elements.indexOf(e) });
      }
    }
    for (const joint of state.project.connections) {
      if ([joint.a, joint.b].some((r) => !state.project.elements.find((e) => e.id === r.elementId)?.visible)) continue;
      const { a, b } = jointPoints(joint);
      if (a && b) candidates.push({ type: 'joint', key: I.jointKey(joint.id), a: screen(a), b: screen(b), marker: screen({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }) });
    }
    const hits = I.hitTargets(candidates, { x: event.clientX, y: event.clientY }, event.pointerType === 'touch' ? 22 : 12);
    const part = state.tool === 'select' && event.target?.closest?.('[data-context-key]'), partTarget = part && I.target(state.project, part.dataset.contextKey);
    if (['control', 'outline'].includes(partTarget?.type)) hits.unshift(part.dataset.contextKey);
    const dimension = !state.dimensionPick && event.target?.closest?.('[data-dimension]');
    if (dimension && I.target(state.project, I.dimensionKey(dimension.dataset.dimension))) hits.unshift(I.dimensionKey(dimension.dataset.dimension));
    const node = event.target?.closest?.('[data-point]'), joint = event.target?.closest?.('[data-joint]');
    const element = event.target?.closest?.('[data-element]'), e = state.project.elements.find((e) => e.id === element?.dataset.element);
    const fallback = node ? I.nodeKey({ elementId: node.dataset.element, point: node.dataset.point }) : joint ? I.jointKey(joint.dataset.joint) : e ? ['bearing', 'node'].includes(e.type) ? I.nodeKey({ elementId: e.id, point: 'a' }) : I.elementKey(e.id) : null;
    if (fallback && I.target(state.project, fallback) && !hits.includes(fallback)) hits.push(fallback);
    return all ? [...new Set(hits)] : hits[0] || null;
  }

  function updateHover(key) {
    if (state.hoveredTargetId === key) return;
    state.hoveredTargetId = key;
    const t = I.target(state.project, key);
    for (const el of $('#mechanism-canvas').querySelectorAll('[data-selection-key]')) el.classList.toggle('hovered', el.dataset.selectionKey === key || t?.type === 'path' && el.dataset.selectionKey === I.elementKey(t.elementId));
    $('#mechanism-canvas').dataset.hover = t?.type === 'node' ? I.status(state.project, I.reference(t), state.samples) : t?.type || '';
  }

  function closeContextMenu(focus = false) {
    contextMenu?.close(focus);
    state.contextMenuState.isOpen = false;
  }

  function contextItems(t) {
    const items=elementContextItems(t),priority=['inspect','joint-revolute','selection-connect','fix','fix-body','disconnect','disconnect-body'];
    if(t?.element&&!t.element.primary&&!['control','outline'].includes(t.type))items.unshift({id:'selection-connect',label:'Spojiť vybraný bod…'}, {separator:true});
    const first=items.filter(i=>priority.includes(i.id)),rest=items.filter(i=>!priority.includes(i.id));
    if (window.innerWidth <= 640 && items.filter(i => !i.separator).length > 7) {
      const common = items.filter(i => !i.separator && (priority.includes(i.id) || i.id === 'rail-motion')).slice(0, 5);
      return [...common, { label: 'Ďalšie možnosti…', items: items.filter(i => !common.includes(i)) }];
    }
    return first.length?[...first,{separator:true},...rest]:items;
  }
  function elementContextItems(t) {
    if (t?.type === 'joint') return [
      { id: 'edit-joint', label: 'Upraviť túto väzbu…', disabled: !!t.joint.builtin },
      { label: 'Vybrať pripojený bod', items: [t.joint.a, t.joint.b].map((r) => ({ id: `pick:${I.nodeKey(r)}`, label: `${state.project.elements.find((e) => e.id === r.elementId)?.name} · ${K.pointName(r.point)}` })) },
      { id: 'delete', label: 'Odstrániť iba túto väzbu', disabled: !!t.joint.builtin, danger: true, shortcut: 'Del' },
      ...(t.joint.builtin ? [{ id: 'copy-editable', label: 'Vytvoriť voľnú kópiu na úpravy' }] : []),
    ];
    if (t?.type === 'dimension') return [{ id: 'edit-dimension', label: 'Upraviť rozmerovú kótu…' }, { id: 'delete-dimension', label: 'Vymazať iba túto kótu' }];
    const r = I.reference(t), readonly = t?.element?.primary || t?.joint?.builtin;
    const items = readonly ? [{ id: 'copy-editable', label: 'Vytvoriť voľnú kópiu na úpravy' }, { separator: true }] : [];
    const item = (id, label, extra = {}) => ({ id, label, disabled: readonly, hint: readonly ? 'Pôvodná šablóna je chránená. Vytvorte voľnú kópiu.' : '', ...extra });
    if (['control', 'outline'].includes(t?.type)) {
      const control = t.type === 'control', points = control ? I.controlPoints(state.project, t.element) : t.element.outline, minimum = control ? t.element.curveKind === 'spline' ? 4 : 2 : 3;
      items.push(item('part-point', `Lokálne súradnice ${control ? 'P' : 'V'}${t.index}…`));
      if (control) items.push(item('control-add-after', `Pridať bod za P${t.index}`, { disabled: readonly || t.element.curveKind === 'arc' || points.length >= (t.element.curveKind === 'polyline' ? 1001 : 32), hint: 'Bézierove body riadia tvar; krivka cez vnútorný bod nemusí prechádzať.' }));
      items.push(item(control ? 'control-delete' : 'outline-delete', `Odstrániť iba ${control ? 'P' : 'V'}${t.index}`, { disabled: readonly || points.length <= minimum, hint: `Minimum je ${minimum} bodov.`, danger: true }));
      if (control) items.push({ separator: true }, item('curve-semicircle', 'Previesť kulisu na polkruh s R…'));
      items.push({ separator: true }, { id: 'select-member', label: 'Vybrať celý člen' });
      return items;
    }
    if (t?.element?.type === 'slot') items.push(item('curve-add-control', 'Pridať riadiaci bod tu', { disabled: readonly || t.element.curveKind === 'arc' || t.element.controls.length >= (t.element.curveKind === 'polyline' ? 1001 : 32), hint: 'Bod riadi tvar Bézierovej krivky, nie interpolovaný bod na nej.' }), item('curve-semicircle', t.element.curveSemicircle ? 'Polkruh · upraviť R a stranu…' : 'Previesť dráhu na polkruh s R…'), { separator: true });
    if (t?.element?.type === 'cam') items.push(item('cam-profile', 'Tvar, polomer a zdvih vačky…'), item('cam-follower', 'Pridať vedený valčekový sledovač'), { separator: true });
    if (!t) return [
      { id: 'add-node', label: 'Pridať voľný uzol' }, { id: 'add-ground', label: 'Pridať pevný bod (Ground)' },
      { id: 'add-guide', label: 'Pridať lineárne vedenie' }, { separator: true },
      { label: 'Vložiť podzostavu', items: [{ id: 'assembly-fourbar', label: 'Štvorkĺbový mechanizmus' }, { id: 'assembly-crank', label: 'Kľukový mechanizmus' }] },
      { id: 'open-library', label: 'Vložiť z vlastnej knižnice…' },
      { separator: true }, { id: 'fit', label: 'Prispôsobiť pohľad', shortcut: 'Shift+F' },
    ];
    if (r) {
      const e = state.project.elements.find((e) => e.id === r.elementId), root = I.root(state.project, e), refs = contextNodeReferences(r);
      items.push(
        { label: 'Zmeniť typ väzby', disabled: readonly, items: [item('joint-revolute', 'Otočný kĺb (Revolute)'), ...(!K.isElastic(e) ? [item('joint-prismatic', 'Posuvný kĺb (Prismatic)')] : []), ...(e.type === 'bearing' ? [item('joint-cam-contact', 'Vačkový kontakt s valčekom')] : []), item('joint-free', 'Voľný uzol / odpojiť')] },
        item('inspect', 'Vlastnosti prvku · rozmery, sily a vzhľad…'),
        item('thickness', 'Hrúbka / priemer…', { disabled: readonly || !W.thickness(e) }),
        ...(K.isElastic(e) ? [item('elastic-fit', 'Prispôsobiť pracovný rozsah montáži')] : []),
        item('fix', `${refs.every((r) => I.fixed(state.project, r)) ? 'Uvoľniť' : 'Ukotviť'}${refs.length > 1 ? ` vybrané uzly (${refs.length})` : ' uzol'}`, { shortcut: 'F' }),
        ...(e.type === 'rail' && !e.parentId ? [item('rail-motion', e.movingRail ? 'Pohyblivý vozík, pevné vedenie' : 'Pohyblivé vedenie, pevný vozík')] : []),
        item('motor', 'Priradiť / upraviť pohon…', { disabled: readonly || K.isElastic(e) || !!e.parentId || ['ground', 'slot'].includes(e.type) || ['ct', 'cb'].includes(r.point) }),
        item('limits', 'Pohybové limity…', { disabled: readonly || (!root?.drive && !state.project.connections.some((j) => !j.builtin && ['revolute', 'prismatic'].includes(j.type) && (sameReference(j.a, r) || sameReference(j.b, r)))) }),
        { separator: true },
        { label: 'Prichytenie / zarovnanie', disabled: readonly, items: [item('snap', 'Prichytiť na mriežku (5 mm)'), item('align-x', 'Rovnaké X, zvislo'), item('align-y', 'Rovnaké Y, vodorovne'), item('axis-x', 'Na os X (Y = 0)'), item('axis-y', 'Na os Y (X = 0)')] },
        item('coordinates', 'Absolútne súradnice XYZ…', { disabled: readonly }),
        { id: 'trace-node', label: 'Sledovať trajektóriu bodu…' }, { separator: true },
        item('disconnect', 'Odpojiť naviazané väzby'),
        item('delete', t.type === 'joint' ? 'Odstrániť iba túto väzbu' : ['bearing', 'node'].includes(e.type) ? 'Odstrániť iba tento uzol' : 'Odstrániť tento uzol a jeho člen…', { danger: true, shortcut: 'Del' }),
      );
      if (t.type === 'joint') items.unshift({ id: 'edit-joint', label: 'Upraviť túto väzbu…' });
    } else {
      const family = W.descendants(state.project, [t.elementId]), joints = state.project.connections.filter((j) => [j.a, j.b].some((r) => family.has(r.elementId)));
      items.push(
      { label: `Väzby člena a jeho bodov (${joints.length})`, items: joints.length ? joints.map((j) => ({ id: `pick:${I.jointKey(j.id)}`, label: `${j.name} · ${E.constraintNames[j.type]}` })) : [{ label: 'Člen nemá väzby', disabled: true }] },
      item('disconnect-body', 'Odpojiť všetky väzby tohto člena a jeho bodov', { disabled: readonly || !joints.length && !t.element.parentId }),
      ...(t.element.type === 'rail' ? [item('rail-motion', t.element.movingRail ? 'Pohyblivý vozík, pevné vedenie' : 'Pohyblivé vedenie, pevný vozík', { disabled: readonly || !!t.element.parentId })] : []),
      item('fix-body', t.element.locked || t.element.type === 'ground' ? 'Uvoľniť celé teleso' : 'Ukotviť celé teleso', { disabled: readonly || K.isElastic(t.element) || ['slot', 'rail'].includes(t.element.type) }),
      { label: 'Priradiť / upraviť pohon na uzle', disabled: readonly || K.isElastic(t.element) || !!t.element.parentId || ['ground', 'slot'].includes(t.element.type), items: I.pointKeys(t.element).filter((key) => ['a', 'b'].includes(key) || key === 'c' && t.element.type === 'panel').map((key) => item(`motor-${key}`, `Uzol ${K.pointName(key)}`)) },
      item('coordinates', 'Súradnice začiatku A…'),
      { separator: true },
      item('split', 'Rozdeliť rameno v polovici', { disabled: readonly || t.element.type !== 'link' || !!t.element.outline?.length }),
      { id: 'poi', label: 'Pridať bod záujmu (POI) a dráhu', disabled: readonly || K.isElastic(t.element) }, item('inspect', K.isElastic(t.element) ? 'Rozmery, sila a tlmenie…' : 'Vlastnosti prvku…'),
      item('thickness', 'Hrúbka / priemer…', { disabled: readonly || !W.thickness(t.element) }),
      ...(K.isElastic(t.element) ? [item('elastic-fit', 'Prispôsobiť pracovný rozsah montáži')] : [item('properties', 'Dĺžka, tuhosť a farba…')]),
      { separator: true }, item('delete', contextDeleteKeys(t).length > 1 ? `Odstrániť celý výber (${contextDeleteKeys(t).length})…` : 'Odstrániť tento člen a jeho väzby', { danger: true, shortcut: 'Del' }),
      );
    }
    items.push({ separator: true }, { label: 'Kliknutia na plátne', items: [
      { id: 'gesture-help', label: 'ĽT: výber / ťahanie; pružný uzol mení iba voľný koniec' },
      { id: 'gesture-help', label: 'Shift + ĽT: pridať alebo odobrať z výberu' },
      { id: 'gesture-help', label: 'Ctrl + ĽT: ďalšia prekrývajúca sa entita' },
      { id: 'gesture-help', label: 'Alt + ťahanie: voľný pohyb bez siete a snappingu' },
    ] }, { id: 'save-library', label: 'Uložiť výber do knižnice…', disabled: state.project.kind !== 'custom', hint: state.project.kind !== 'custom' ? 'Najskôr vytvorte voľnú kópiu šablóny.' : '' });
    return items;
  }

  function openContextMenu(event, key = canvasHit(event)) {
    if (state.drag) onPointerUp({ pointerId: state.drag.pointerId, cancelled: true });
    document.querySelectorAll('#workflow-tools details[open], #model-checks details[open]').forEach((el) => { el.open = false; });
    const t = I.target(state.project, key), hits = canvasHit(event, true);
    if (key && t?.elementId && memberSelected(t.elementId)) { state.selected = t.elementId; renderTree(); renderInspector(); renderScene(); updateToolbar(); }
    else if (key) selectTarget(key, false, true);
    state.playing = false; updateMotion();
    state.contextWorldPoint = worldPoint(event);
    state.contextMenuState = { isOpen: true, x: event.clientX, y: event.clientY, targetId: key, targetType: t?.type || 'canvas', hitKeys: hits };
    const title = !t ? 'PRACOVNÁ PLOCHA' : t.type === 'dimension' ? t.dimension.name || 'Rozmerová kóta' : t.type === 'joint' ? t.joint.name : ['control', 'outline'].includes(t.type) ? `${t.element.name} · ${t.type === 'control' ? 'P' : 'V'}${t.index}` : t.type === 'path' ? `${t.element.name} · vodiaca dráha` : t.type === 'node' ? `${t.element.name} · ${K.pointName(t.point)}` : t.element.name;
    const items = contextItems(t);
    if (hits.length > 1) items.unshift({ label: `Vybrať entitu pod kurzorom (${hits.length})`, items: hits.map((identity) => {
      const target = I.target(state.project, identity);
      return { id: `pick:${identity}`, label: target.type === 'dimension' ? `Kóta · ${target.dimension.name || 'Rozmer'}` : target.type === 'joint' ? `Väzba · ${target.joint.name}` : ['control', 'outline'].includes(target.type) ? `${target.type === 'control' ? 'P' : 'V'}${target.index} · ${target.element.name}` : target.type === 'path' ? `Dráha · ${target.element.name}` : target.type === 'node' ? `Uzol ${K.pointName(target.point)} · ${target.element.name}` : `Člen · ${target.element.name}` };
    }) }, { separator: true });
    contextMenu.open({ x: event.clientX, y: event.clientY, title, items });
    state.contextMenuState.isOpen = true; renderScene();
  }

  function onContextMenu(event) {
    if (state.gifExport) { event.preventDefault(); return; }
    if (state.magic && !magicWorking()) { event.preventDefault(); return; }
    event.preventDefault(); event.stopPropagation();
    const row = event.target?.closest?.('[data-context-key]');
    try { openContextMenu(event, row ? row.dataset.contextKey : canvasHit(event)); }
    catch (error) { toast(`Ponuku sa nepodarilo otvoriť: ${error.message}`, true); }
  }

  function editCanvas(next, message, keys = null) {
    if (state.magic && !magicWorking()) throw new Error('V tomto kroku sprievodcu sa geometria neupravuje.');
    const validated = K.validateProject(next);
    state.trial = null; state.trialBlock = null;
    closeContextMenu(); pushHistory(); state.project = validated; state.playing = false; state.mode = 'edit';
    if (keys) state.selectedElementIds = keys;
    if (!state.project.elements.some((e) => e.id === state.traceRef.elementId)) state.traceRef = { elementId: '', point: 'a' };
    changed(false); if (message) toast(message);
  }

  function deleteSelected(keys = state.selectedElementIds, confirmed = false) {
    if (!keys.length) return;
    const virtualNodes = keys.map((key) => I.target(state.project, key)).filter((t) => t?.type === 'node' && !['bearing', 'node'].includes(t.element.type));
    if (!confirmed) {
      try {
        const next = I.deleteSelection(state.project, keys, state.result), impact = WF.impact(state.project, next, state.result);
        if ((virtualNodes.length || impact.elements.length && impact.joints.length) && !virtualNodes.some((t) => t.element.primary)) {
          state.pendingDeleteKeys = [...keys]; reviewImpact(next, 'Zvolené entity a ich väzby boli odstránené.', I.validSelection(next, state.selectedElementIds), virtualNodes.length ? 'Odstrániť uzol aj jeho člen?' : 'Odstrániť prvky a naviazané väzby?'); return;
        }
      } catch (error) { toast(error.message, true); return; }
    }
    try { const next = I.deleteSelection(state.project, keys, state.result); editCanvas(next, 'Zvolené entity a ich väzby boli odstránené.', I.validSelection(next, state.selectedElementIds)); }
    catch (error) { toast(error.message, true); }
  }

  function fixSelected(fallback = null, exact = false) {
    const refs = exact ? contextNodeReferences(fallback) : selectedNodeReferences(fallback);
    if (!refs.length) { toast('Najskôr vyberte uzol. Shift+F prispôsobí pohľad.', true); return; }
    try {
      const next = I.toggleFixed(state.project, refs, state.result);
      if (!state.project.elements.some((e) => e.drive) && next.elements.some((e) => e.drive)) state.motion = K.driveRange(next).min;
      const impact = WF.impact(state.project, next, state.result);
      if (impact.driverLost || impact.joints.some((j) => state.project.connections.some((old) => old.id === j.id))) reviewImpact(next, 'Fixácia vybraných uzlov bola zmenená.');
      else editCanvas(next, 'Fixácia vybraných uzlov bola zmenená.');
    }
    catch (error) { toast(error.message, true); }
  }

  function canvasDialog(kind, r, jointType = 'revolute', jointId = '') {
    if (kind !== 'limits' && kind !== 'joint') setMode('edit');
    const e = state.project.elements.find((e) => e.id === r.elementId), at = K.point(state.result, r), range = K.driveRange(state.project);
    const number = (name, label, value, min = -5000, max = 5000) => quantityInput(name, label, value, ['x', 'y', 'length', 'radius', 'camLift'].includes(name) ? 'mm' : ['angle', 'value', 'camPhase'].includes(name) ? '°' : '', min, max);
    let fields = '', title = '';
    if (kind === 'coordinates') {
      title = 'Absolútne súradnice uzla';
      fields = `${number('x', 'X (mm)', at.x)}${number('y', 'Y (mm, nadol)', at.y)}<label class="property-field"><span>Z (mm, rovinný model)</span><input class="text-field" name="z" type="number" value="0" readonly/></label><p class="section-description">Súradnice návrhovej geometrie. Zostáva Z = 0; kĺbové väzby sa vynútia v simulácii.</p>`;
    } else if (kind === 'properties') {
      title = 'Vlastnosti členu';
      fields = `<label class="property-field"><span>Názov</span><input class="text-field" name="name" value="${escape(e.name)}" maxlength="100" required/></label>${number('length', 'Dĺžka (mm)', e.length, .1)}${number('stiffness', 'Referenčná osová tuhosť (N/mm)', e.stiffness, 0, 1000000)}<label class="property-field"><span>Farba členu</span><input type="color" name="color" value="${e.color || '#798997'}"/></label><p class="section-description">Kinematický solver počíta tuhé členy. Tuhosť ramena je referenčný údaj, nemení jeho deformáciu. Pre silový účinok použite samostatnú pružinu.</p>`;
    } else if (kind === 'cam-profile') {
      title = 'Radiálna vačka · profil';
      fields = `<label class="property-field"><span>Tvar vačky</span><select class="property-select" name="camShape"><option value="harmonic"${e.camShape !== 'pear' ? ' selected' : ''}>Harmonický profil</option><option value="pear"${e.camShape === 'pear' ? ' selected' : ''}>Pretiahnutá vačka</option></select></label>${number('camNoseRatio', 'Polomer špičky / základne', e.camNoseRatio, .1, 1)}${number('radius', 'Polomer základného kruhu R (mm)', e.radius, .1, 5000)}${number('camLift', 'Zdvih profilu h (mm)', e.camLift, 0, 5000)}${number('camPhase', 'Fáza výstupku (°)', e.camPhase, -360, 360)}<p class="section-description">Harmonický profil alebo dva kruhové oblúky spojené dotyčnicami. Valček sa vedie po vonkajšom odsadení podľa svojho polomeru. Predpoklad trvalého dotyku neoveruje kontaktné sily ani odtrhnutie.</p>`;
    } else if (kind === 'motor') {
      title = 'Pohon uzla';
      const rotary = ['link', 'panel', 'cam'].includes(e.type), linear = !rotary || e.driveMode === 'linear';
      fields = `<label class="check-row"><input type="checkbox" name="enabled" checked/><span>Zapnúť pohon (nahradí doterajší nezávislý pohon)</span></label><label class="property-field"><span>Typ pohonu</span><select name="mode" class="property-select">${e.type !== 'cam' ? `<option value="linear"${linear ? ' selected' : ''}>Lineárny, v (mm/s)</option>` : ''}${rotary ? `<option value="rotary"${!linear ? ' selected' : ''}>Otočný okolo uzla ${r.point.toUpperCase()}, ω (°/s)</option>` : ''}</select></label>${number('speed', 'v (mm/s) alebo ω (°/s), znamienko určuje počiatočný smer', e.driveSpeed ?? 30, -10000, 10000)}${number('angle', 'Smer lineárneho pohonu (°)', e.driveAngle || 0, -360, 360)}${number('min', 'Začiatok zdvihu (mm) / uhla (°)', e.drive ? range.min : 0)}${number('max', 'Koniec zdvihu (mm) / uhla (°)', e.drive ? range.max : e.type === 'cam' ? 360 : linear ? 100 : 180)}<p class="section-description">Jeden predpísaný pohon. Nulová rýchlosť drží polohu; pri opakovaní sa smer na doraze obráti. Použije sa násobič rýchlosti; odhadová dynamika zostáva riadená silami.</p>`;
    } else if (kind === 'limits') {
      title = 'Pohybové limity uzla';
      const driver = I.root(state.project, e).drive, joints = state.project.connections.filter((j) => !j.builtin && ['revolute', 'prismatic'].includes(j.type) && (sameReference(j.a, r) || sameReference(j.b, r)));
      const j = joints[0], min = driver ? range.min : j?.limitMin ?? (j?.type === 'prismatic' ? 0 : -180);
      const guide = j && state.project.elements.find((e) => e.id === (j.a.point === 'curve' ? j.a : j.b).elementId);
      const max = driver ? range.max : j?.limitMax ?? (j?.type === 'prismatic' ? guide.length : 180);
      fields = `<label class="property-field"><span>Limity pohonu alebo konkrétnej väzby</span><select name="scope" class="property-select">${driver ? '<option value="drive">Nezávislý pohon</option>' : ''}${joints.map((j) => `<option value="${escape(j.id)}">${escape(j.name)} · ${j.type === 'prismatic' ? 's (mm)' : 'θ (°)'}</option>`).join('')}</select></label>${number('min', 'Minimum, s (mm) alebo θ (°)', min)}${number('max', 'Maximum, s (mm) alebo θ (°)', max)}<p class="section-description">Posuvný kĺb: vzdialenosť od začiatku vedenia. Otočný kĺb: relatívny uhol B − A v rozsahu −180° až 180°. Prekročenie limitu nepohyblivého pohonu hlási blokovanie; nevytvára sa náraz ani odraz.</p>`;
    } else if (kind === 'joint') {
      title = 'Typ kinematickej väzby';
      const existing = state.project.connections.filter((j) => !j.builtin && (sameReference(j.a, r) || sameReference(j.b, r)));
      const joint = existing.find((j) => j.id === jointId) || existing[0];
      let other = joint ? sameReference(joint.a, r) ? joint.b : joint.a : null;
      if (jointType === 'prismatic' && other?.point !== 'curve') other = state.project.elements.find((v) => v.type === 'rail') ? { elementId: state.project.elements.find((v) => v.type === 'rail').id, point: 'curve' } : null;
      const value = jointType === 'prismatic' && joint?.type === 'prismatic' ? joint.value * (sameReference(joint.a, r) ? 1 : -1) : 0;
      fields = `<label class="property-field"><span>Typ</span><select class="property-select" name="type">${[['revolute', 'Otočný kĺb'], ['prismatic', 'Posuvný kĺb']].map(([v, name]) => `<option value="${v}"${jointType === v ? ' selected' : ''}>${name}</option>`).join('')}</select></label><label class="property-field"><span>Upravovaná väzba</span><select class="property-select" name="jointId"><option value="">Nová väzba</option>${existing.map((j) => `<option value="${escape(j.id)}"${j.id === joint?.id ? ' selected' : ''}>${escape(j.name)}</option>`).join('')}</select></label><label class="property-field"><span>Druhý bod (otočný) alebo dráha vedenia (posuvný)</span><select class="property-select" name="other" required>${canvasOtherOptions(r, jointType, other)}</select></label>${number('value', 'Relatívny uhol vedenia a posúvača (°, posuvný kĺb)', value, -360, 360)}<p class="section-description">Otočný kĺb spojí dva body. Posuvný kĺb vyžaduje dráhu priameho vedenia, obmedzí polohu aj orientáciu tuhého posúvača. Samostatný bod nemá rotačnú súradnicu.</p><button class="button button-secondary" type="button" data-action="canvas-add-guide">Pridať nové lineárne vedenie</button>`;
    }
    modal(title, `<form id="canvas-edit-form" data-kind="${kind}" data-reference="${escape(I.nodeKey(r))}">${fields}<div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zrušiť</button><button type="submit" class="button button-dark">Použiť</button></div></form>`);
  }

  function partPointModal(key) {
    const t = I.target(state.project, key);
    if (!['control', 'outline'].includes(t?.type) || t.element.primary) throw new Error('Vyberte editovateľný riadiaci bod alebo vrchol vo voľnej kópii.');
    const point = t.type === 'control' ? t.element.controls[t.index] : t.element.outline[t.index];
    modal(`Lokálne súradnice ${t.type === 'control' ? 'P' : 'V'}${t.index}`, `<form id="part-point-form" data-key="${escape(key)}">${quantityInput('x', 'X v sústave telesa (mm)', point.x, 'mm', -5000, 5000)}${quantityInput('y', 'Y v sústave telesa (mm)', point.y, 'mm', -5000, 5000)}<p class="section-description">Mení sa iba tento bod. Vnútorné Bézierove body riadia tvar; krivka cez ne nemusí prechádzať.</p><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zrušiť</button><button class="button button-dark" type="submit">Použiť</button></div></form>`);
  }
  function submitPartPoint(form, data) {
    const t = I.target(state.project, form.dataset.key);
    if (!['control', 'outline'].includes(t?.type)) throw new Error('Bod už neexistuje.');
    const at = { x: quantityValue(data, 'x', 'mm', -5000, 5000), y: quantityValue(data, 'y', 'mm', -5000, 5000) };
    editCanvas(I.setControlPoint(state.project, t.elementId, t.index, at, t.type === 'outline'), 'Upravili sa iba súradnice zvoleného bodu.', curveEditKeys(t.elementId, t.id));
    $('#modal').close();
  }
  function slotSemicircleModal(id) {
    const draft = I.semicircle(state.project, id, null, null, state.result), e = draft.elements.find((e) => e.id === id);
    modal('Kulisa · polkruh s polomerom R', `<form id="slot-semicircle-form" data-element="${escape(id)}">${quantityInput('radius', 'Polomer R (mm)', e.curveRadius, 'mm', .1, 5000)}<label class="property-field"><span>Strana tetivy P0 → koniec</span><select class="property-select" name="side"><option value="1"${e.curveSide === 1 ? ' selected' : ''}>Ľavá strana</option><option value="-1"${e.curveSide === -1 ? ' selected' : ''}>Pravá strana</option></select></label><p class="section-description">Predvolený R zachová oba konce. Pri zmene R ostáva P0 pevný a druhý koniec sa posunie po pôvodnom smere tetivy na vzdialenosť 2R. Vznikne presný 180° oblúk s dvoma koncovými bodmi; zmena je vratná cez Späť.</p><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zrušiť</button><button class="button button-dark" type="submit">Vytvoriť polkruh</button></div></form>`);
  }
  function submitSlotSemicircle(form, data) {
    const id = form.dataset.element, radius = quantityValue(data, 'radius', 'mm', .1, 5000), side = Number(data.get('side'));
    editCanvas(I.semicircle(state.project, id, radius, side, state.result), 'Kulisa je polkruh s priemerom 2R; P0 zostal na mieste.', curveEditKeys(id, I.pathKey(id)));
    $('#modal').close();
  }

  function sameReference(a, b) {
    return a?.elementId === b?.elementId && a?.point === b?.point;
  }

  function canvasOtherOptions(r, type, selected) {
    const choices = state.project.elements.filter((e) => e.id !== r.elementId && e.role !== 'canvas-anchor' && !K.isElastic(e) && (type !== 'prismatic' || e.type === 'rail'));
    return choices.length ? choices.flatMap((e) => (type === 'prismatic' ? ['curve'] : I.pointKeys(e)).map((point) => `<option value="${escape(e.id)}|${point}"${sameReference(selected, { elementId: e.id, point }) ? ' selected' : ''}>${escape(e.name)} · ${point === 'curve' ? 'dráha' : point.toUpperCase()}</option>`)).join('') : '<option value="">Najskôr pridajte druhý prvok / vedenie</option>';
  }

  function onContextAction(action) {
    if (state.magic && (!magicWorking() || ['copy-editable', 'open-library', 'save-library'].includes(action))) { toast('Najskôr dokončite alebo zrušte Magic import.', true); return; }
    const t = I.target(state.project, state.contextMenuState.targetId), r = I.reference(t);
    const at = state.contextWorldPoint, p = state.project;
    try {
      if (action === 'selection-connect') { selectTarget(state.contextMenuState.targetId || (t.type==='node'?I.nodeKey(I.reference(t)):I.elementKey(t.elementId))); beginSelectedConnection(); }
      else if (action.startsWith('pick:')) { openContextMenu({ clientX: state.contextMenuState.x, clientY: state.contextMenuState.y, target: $('#mechanism-canvas') }, action.slice(5)); }
      else if (action === 'gesture-help') modal('Ovládanie plátna', '<p>Ľavé tlačidlo vyberá a ťahá. Shift pridáva alebo odoberá z výberu. Ctrl cykluje prekrývajúce sa entity. Alt dočasne vypne sieť aj snapping. Voľný koniec pružiny alebo piesta sa mení samostatne; namontovaný koniec sleduje uchytenie. Štvorcový priečny úchyt mení hrúbku alebo priemer.</p>');
      else if (action === 'inspect') { selectElement(t.elementId); propertiesOverview(); }
      else if (action === 'thickness') { selectElement(t.elementId); setMode('edit'); transformModal('thickness'); }
      else if (action === 'elastic-fit') { const next = K.copy(p), e = next.elements.find((e) => e.id === t.elementId); e.rangeMode = 'auto'; editCanvas(K.fitElasticRanges(next, [e.id], state.result), 'Pracovný rozsah bol prispôsobený montáži.'); }
      else if (action === 'rail-motion' && t?.element?.type === 'rail') editCanvas(I.setRailMotion(p, t.elementId, !t.element.movingRail, state.result), t.element.movingRail ? 'Vozík sa pohybuje, vedenie je pevné.' : 'Vedenie sa pohybuje, vozík zostáva pevný.');
      else if (action === 'copy-editable') { makeEditable(); if (t && I.target(state.project, state.contextMenuState.targetId)) selectTarget(state.contextMenuState.targetId); }
      else if (action === 'open-library') assembliesModal(at);
      else if (action === 'save-library') recordSaveModal('assembly');
      else if (action === 'fit') { fitView(); renderScene(); }
      else if (action === 'add-node' || action === 'add-ground') {
        const next = I.addNode(p, state.snap ? { x: Math.round(at.x / 5) * 5, y: Math.round(at.y / 5) * 5 } : at, action === 'add-ground');
        editCanvas(next, 'Bod bol pridaný.', [I.nodeKey({ elementId: next.elements.at(-1).id, point: 'a' })]);
      } else if (action === 'add-guide') {
        const next = K.copy(p), e = { ...K.makeElement('rail', at.x, at.y), drive: false, locked: true };
        next.elements.push(e); editCanvas(next, 'Pevné lineárne vedenie bolo pridané.', [I.elementKey(e.id)]);
      } else if (action.startsWith('assembly-')) editCanvas(I.insertAssembly(p, action.slice(9), at), 'Podzostava bola vložená. Ak už model má pohon, nová podzostava je bez ďalšieho pohonu.');
      else if (action === 'select-member') selectTarget(I.elementKey(t.elementId));
      else if (action === 'part-point') partPointModal(state.contextMenuState.targetId);
      else if (action === 'control-delete' || action === 'outline-delete') editCanvas(I.deleteSelection(p, [t.id], state.result), 'Odstránil sa iba zvolený bod; člen zostal.', curveEditKeys(t.elementId));
      else if (action === 'control-add-after') editCanvas(I.insertControl(p, t.elementId, null, t.index + 1, state.result), 'Pridal sa ďalší riadiaci bod.', curveEditKeys(t.elementId, I.controlKey(t.elementId, t.index + 1)));
      else if (action === 'curve-add-control') editCanvas(I.insertControl(p, t.elementId, at, null, state.result), 'Pridal sa riadiaci bod. Bézierova krivka cez vnútorný bod nemusí prechádzať.', curveEditKeys(t.elementId));
      else if (action === 'curve-semicircle') slotSemicircleModal(t.elementId);
      else if (action === 'fix') fixSelected(r, true);
      else if (action === 'delete' && t?.type === 'joint') editCanvas(I.deleteSelection(p, [I.jointKey(t.id)], state.result), 'Vymazala sa iba vybraná väzba.', state.selectedElementIds.filter((key) => key !== I.jointKey(t.id)));
      else if (action === 'delete') deleteSelected(contextDeleteKeys(t));
      else if (action === 'disconnect-body') editCanvas(I.disconnectBody(p, t.elementId, state.result), 'Člen a jeho body boli odpojené od väzieb.');
      else if (action === 'fix-body') editCanvas(I.toggleBodyFixed(p, t.elementId, state.result), 'Uloženie celého telesa bolo zmenené.');
      else if (action.startsWith('motor-')) canvasDialog('motor', { elementId: t.elementId, point: action.slice(6) });
      else if (action === 'edit-joint') jointModal(t.id);
      else if (action === 'edit-dimension') dimensionModal(t.id);
      else if (action === 'delete-dimension') editCanvas(I.deleteSelection(p, [I.dimensionKey(t.id)], state.result), 'Vymazala sa iba vybraná kóta.', state.selectedElementIds.filter((key) => key !== I.dimensionKey(t.id)));
      else if (action === 'disconnect' || action === 'joint-free') reviewImpact(t.type === 'joint' && action === 'joint-free' ? I.deleteSelection(p, [I.jointKey(t.id)], state.result) : I.disconnect(p, r, state.result), 'Uzol bol odpojený.');
      else if (action === 'joint-cam-contact') {
        const cam = p.elements.find((e) => e.type === 'cam');
        if (!cam) throw new Error('Najskôr pridajte vačku, potom jej kontakt s ložiskom.');
        jointModal(null, { type: 'cam-contact', a: r, b: { elementId: cam.id, point: 'curve' } });
      }
      else if (action === 'joint-revolute' || action === 'joint-prismatic') canvasDialog('joint', r, action.slice(6), t.type === 'joint' ? t.id : '');
      else if (['coordinates', 'properties', 'motor', 'limits', 'cam-profile'].includes(action)) canvasDialog(action, r || { elementId: t.elementId, point: 'a' });
      else if (action === 'cam-follower') editCanvas(I.addCamFollower(p, t.elementId, state.result), 'Valček, jeho posúvač a vedenie boli pridané. Priraďte vačke otočný pohon.');
      else if (action === 'split') {
        setMode('edit');
        const next = I.split(p, t.elementId, state.result); editCanvas(next, 'Rameno bolo rozdelené stredovým otočným uzlom. Hmotnosť sa rozdelila rovnomerne.', [I.nodeKey({ elementId: next.elements.at(-1).id, point: 'a' })]);
      } else if (action === 'poi') {
        const next = I.addPOI(p, t.elementId, state.result); state.trace = true;
        editCanvas(next, 'Bod POI aj jeho trajektória boli pridané.', [I.nodeKey({ elementId: next.elements.at(-1).id, point: 'a' })]);
      } else if (action === 'trace-node') savedTraceModal(undefined, r);
      else if (['snap', 'align-x', 'align-y', 'axis-x', 'axis-y'].includes(action)) {
        const active = K.point(state.result, r), refs = contextNodeReferences(r);
        const transform = (v) => ({
          x: action === 'snap' ? Math.round(v.x / 5) * 5 : action === 'align-x' ? active.x : action === 'axis-y' ? 0 : v.x,
          y: action === 'snap' ? Math.round(v.y / 5) * 5 : action === 'align-y' ? active.y : action === 'axis-x' ? 0 : v.y,
        });
        editCanvas(I.transformPoints(p, refs, transform, state.result), 'Vybrané uzly boli zarovnané.');
      }
    } catch (error) { toast(error.message, true); }
  }

  function onCanvasSubmit(form, data) {
    const r = I.reference(I.target(state.project, form.dataset.reference)), kind = form.dataset.kind, p = state.project;
    const n = (name) => W.parseNumber(data.get(name), ['x', 'y', 'z', 'length', 'radius', 'camLift'].includes(name) ? 'mm' : ['angle', 'value', 'camPhase'].includes(name) ? '°' : '');
    if (!r) throw new Error('Vybraný bod už neexistuje.');
    let next;
    if (kind === 'coordinates') next = I.setCoordinates(p, r, { x: n('x'), y: n('y'), z: n('z') }, state.result);
    if (kind === 'properties') next = I.setProperties(p, r.elementId, { name: String(data.get('name')).trim(), length: n('length'), stiffness: n('stiffness'), color: String(data.get('color')) });
    if (kind === 'cam-profile') { next = K.copy(p); Object.assign(next.elements.find((e) => e.id === r.elementId), { radius: n('radius'), camLift: n('camLift'), camPhase: n('camPhase'), camShape: data.get('camShape') || 'harmonic', camNoseRatio: data.has('camNoseRatio') ? n('camNoseRatio') : .4 }); }
    if (kind === 'motor') {
      next = I.setDriver(p, r, { enabled: data.has('enabled'), mode: String(data.get('mode')), speed: n('speed'), angle: n('angle'), min: n('min'), max: n('max') }, state.result);
      state.direction = n('speed') < 0 ? -1 : 1;
      if (data.has('enabled')) state.motion = state.direction < 0 ? K.driveRange(next).max : K.driveRange(next).min;
    }
    if (kind === 'limits') next = data.get('scope') === 'drive' ? I.setLimits(p, n('min'), n('max')) : I.setJointLimits(p, String(data.get('scope')), n('min'), n('max'));
    if (kind === 'joint') next = I.setJoint(p, r, { type: String(data.get('type')), id: String(data.get('jointId')), other: parseReference(String(data.get('other'))), value: n('value') });
    editCanvas(next, 'Zmena bola uložená do modelu.'); $('#modal').close();
  }

  function setTool(tool) {
    closeContextMenu();
    if (tool === 'measure') { startDimensionPick(); return; }
    cancelDimensionPick();
    if (state.magic) {
      if (!magicWorking() && tool !== 'pan' && tool !== 'select') return;
      state.magic.tool = tool; state.magic.drawing = []; state.magic.preview = null; state.magic.placementType = null;
    }
    state.tool = tool; state.pendingJoint = null;
    state.snapPreview = null; dismissSnapChoices(); state.insertingType = null; state.placementPreview = null; state.placementMount = null; renderPlacementTools();
    if (tool !== 'measure') state.measure = null;
    updateToolbar(); renderScene();
  }

  function addElement(type, position) {
    if (!K.TYPES.includes(type)) return;
    if (state.magic) {
      if (state.magic.step !== 4) { toast('Členy vkladajte v kroku Členy a väzby.', true); return; }
      if (!position) { selectMagicTool('place', type); return; }
      try {
        const placement = placementAt(type, position), next = M.placeElement(state.project, type, placement.element), e = next.elements.at(-1);
        if (placement.preview) {
          placement.preview.source.elementId = e.id;
          if (placement.preview.source.ref) placement.preview.source.ref.elementId = e.id;
        }
        state.magic.placementType = null; state.magic.tool = 'select'; state.tool = 'select';
        editCanvas(next, `${e.name} bol vložený. Upravte jeho rozmery a spojte uzly.`, [e.type === 'node' ? I.nodeKey({ elementId: e.id, point: 'a' }) : I.elementKey(e.id)]);
        offerSnapConnection(placement.preview, true);
      } catch (error) { toast(error.message, true); }
      return;
    }
    if (!position) {
      dismissSnapChoices(); state.insertingType = type; state.placementMount = null; state.placementPreview = null; state.tool = 'place'; state.playing = false;
      renderScene(); updateToolbar(); toast('Vyberte montážny bod a kliknite na plátno. Tab prepína body, Escape zruší vloženie.'); return;
    }
    if (state.project.elements.length >= 120) { toast('Projekt môže obsahovať najviac 120 prvkov.', true); return; }
    const offset = state.project.elements.filter((e) => !e.primary).length * 15;
    const point = position || { x: 130 + offset, y: state.project.kind === 'drawer' ? -20 : -80 };
    const placement = placementAt(type, point), e = placement.element;
    if (e.drive && (state.project.kind !== 'custom' || state.project.elements.some((v) => v.drive))) e.drive = false;
    const count = state.project.elements.filter((v) => v.type === type).length + 1;
    e.name = `${typeNames[type]} ${count}`;
    const next = K.validateProject({ ...K.copy(state.project), elements: [...state.project.elements, e] });
    pushHistory(); state.project = next; state.snapPreview = null;
    state.selectedElementIds = [e.type === 'node' ? I.nodeKey({ elementId: e.id, point: 'a' }) : I.elementKey(e.id)]; state.analysis = false; state.mode = 'edit'; state.playing = false;
    state.traceRef = { elementId: e.id, point: K.defaultTracePoint(e) };
    changed(false);
    toast(`${e.name} bol pridaný. Spojte jeho uzly nástrojom J.`);
    offerSnapConnection(placement.preview, true);
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
    state.project.elements.push(clone); state.selectedElementIds = [I.elementKey(clone.id)];
    changed(false); toast('Prvok bol duplikovaný. Jeho poloha sa dá voľne upraviť.');
  }

  function deleteElement() {
    deleteSelected();
  }

  function zoom(factor, center) {
    if (state.gifExport) return;
    closeContextMenu();
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
    const transformed = matrix ? point.matrixTransform(matrix.inverse()) : { x: 0, y: 0 };
    return { x: transformed.x, y: transformed.y };
  }

  function connectPoint(reference) {
    if (!state.pendingJoint) {
      state.pendingJoint = reference; updateToolbar(); renderScene(); return;
    }
    const a = K.copy(state.pendingJoint), b = K.copy(reference);
    if (a.elementId === b.elementId) { toast('Vyberte uzol iného prvku.', true); return; }
    const ea = state.project.elements.find((e) => e.id === a.elementId), eb = state.project.elements.find((e) => e.id === b.elementId);
    if (!ea || !eb) { state.pendingJoint = null; updateToolbar(); return; }
    // A pin dropped on either end of a slot still follows the entire track.
    if (ea.type === 'slot' && eb.type === 'bearing') a.point = 'curve';
    if (eb.type === 'slot' && ea.type === 'bearing') b.point = 'curve';
    if (a.point === 'curve' && b.point === 'curve') { toast('Spojte vedenie s uzlovým bodom, nie s ďalším vedením.', true); return; }
    if (ea.primary && eb.primary) { toast('Tieto prvky sú už riadené šablónou. Pripojte vlastný prvok.', true); return; }
    const duplicate = state.project.connections.some((j) => (j.a.elementId === a.elementId && j.a.point === a.point && j.b.elementId === b.elementId && j.b.point === b.point) || (j.b.elementId === a.elementId && j.b.point === a.point && j.a.elementId === b.elementId && j.a.point === b.point));
    if (duplicate) { toast('Táto väzba už existuje.', true); state.pendingJoint = null; updateToolbar(); renderScene(); return; }
    if (state.project.connections.length >= 240) { toast('Bol dosiahnutý maximálny počet väzieb.', true); return; }
    const guide = a.point === 'curve' ? ea : b.point === 'curve' ? eb : null;
    previewConnection(a,b,guide?.type === 'cam' ? 'cam-contact' : guide ? 'point-path' : 'revolute');
  }

  function touchStart(event) {
    if (event.pointerType !== 'touch' || event.deferredTouch) return false;
    const touch = state.touchGesture ||= { points: new Map(), pinching: false, timer: null };
    touch.points.set(event.pointerId,{x:event.clientX,y:event.clientY});
    clearTimeout(touch.timer);
    if (touch.points.size > 1) {
      if (state.drag) onPointerUp({pointerId:state.drag.pointerId,cancelled:true,touchInternal:true});
      state.project=touch.project; state.history=touch.history;state.historySelections=touch.historySelections;state.future=touch.future;state.futureSelections=touch.futureSelections;state.selectedElementIds=touch.selection;state.pendingJoint=touch.pendingJoint;state.insertingType=touch.insertingType;state.editPivot=touch.editPivot;state.tool=touch.tool;state.result=touch.result;state.samples=touch.samples;state.profile=touch.profile;state.dynamic=touch.dynamic;state.forceContext=touch.forceContext;
      if(state.magic&&touch.magic){Object.assign(state.magic,touch.magic);renderMagicImport();}
      repairSelection();renderTree();renderInspector();updateToolbar();renderPlacementTools();
      const [a,b] = [...touch.points.values()]; touch.pinching=true;touch.longPressed=false; touch.distance=Math.hypot(a.x-b.x,a.y-b.y)||1; touch.view=K.copy(state.view); touch.anchor=worldPoint({clientX:(a.x+b.x)/2,clientY:(a.y+b.y)/2});
      event.preventDefault(); return true;
    }
    touch.project=K.copy(state.project);touch.history=[...state.history];touch.historySelections=[...state.historySelections];touch.future=[...state.future];touch.futureSelections=[...state.futureSelections];touch.selection=[...state.selectedElementIds];touch.pendingJoint=state.pendingJoint?K.copy(state.pendingJoint):null;touch.insertingType=state.insertingType;touch.editPivot=state.editPivot;touch.tool=state.tool;touch.result=state.result;touch.samples=state.samples;touch.profile=state.profile;touch.dynamic=state.dynamic;touch.forceContext=state.forceContext;
    touch.magic=state.magic?{points:K.copy(state.magic.points||[]),drawing:K.copy(state.magic.drawing||[]),tool:state.magic.tool,placementType:state.magic.placementType,geometryStarted:state.magic.geometryStarted,detectCandidates:K.copy(state.magic.detectCandidates||[]),detectHistory:[...(state.magic.detectHistory||[])],detectFuture:[...(state.magic.detectFuture||[])],detectEditing:state.magic.detectEditing}:null;
    touch.start={x:event.clientX,y:event.clientY};
    const key=canvasHit(event);
    touch.timer=setTimeout(()=>{
      if(state.touchGesture!==touch || touch.pinching || touch.points.size!==1)return;
      if(state.drag)onPointerUp({pointerId:state.drag.pointerId,cancelled:true,touchInternal:true});
      touch.longPressed=true;openContextMenu({clientX:touch.start.x,clientY:touch.start.y,target:$('#mechanism-canvas')},key);
    },550);
    return false;
  }
  function touchMove(event) {
    const touch=state.touchGesture;if(event.pointerType!=='touch'||!touch)return false;
    touch.points.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if (touch.longPressed) return true;
    if (!touch.pinching) { if(Math.hypot(event.clientX-touch.start.x,event.clientY-touch.start.y)>8){clearTimeout(touch.timer);touch.moved=true;}if(touch.deferred&&(state.insertingType||state.magic?.placementType)){touch.deferred.clientX=event.clientX;touch.deferred.clientY=event.clientY;} return false; }
    event.preventDefault();
    if(touch.points.size<2)return true;
    const [a,b]=[...touch.points.values()], distance=Math.hypot(a.x-b.x,a.y-b.y)||1, area=$('#mechanism-canvas').getBoundingClientRect(), ratio=touch.distance/distance;
    const width=K.clamp(touch.view.width*ratio,20,20000),height=touch.view.height*width/touch.view.width;
    state.view={x:touch.anchor.x-((a.x+b.x)/2-area.left)/area.width*width,y:touch.anchor.y-((a.y+b.y)/2-area.top)/area.height*height,width,height};renderScene();return true;
  }
  function touchEnd(event) {
    const touch=state.touchGesture;if(!touch||event.touchInternal)return false;
    clearTimeout(touch.timer);touch.points.delete(event.pointerId);
    const handled=touch.pinching||touch.longPressed;
    if(!touch.points.size)state.touchGesture=null;
    return handled;
  }

  function onPointerDown(event) {
    if (state.gifExport) return;
    if (touchStart(event)) return;
    if(event.pointerType==='touch'&&!event.deferredTouch&&(state.tool==='connect'||state.insertingType||state.magic?.placementType)){state.touchGesture.deferred={pointerId:event.pointerId,clientX:event.clientX,clientY:event.clientY,button:event.button,target:event.target,pointerType:'touch',deferredTouch:true,preventDefault(){}};if(state.insertingType||state.magic?.placementType)clearTimeout(state.touchGesture.timer);return;}
    if (event.button !== 0 && event.button !== 1) return;
    if (state.drag) return;
    event.preventDefault();
    closeContextMenu();
    state.snapPreview = null; dismissSnapChoices();
    const svg = $('#mechanism-canvas'), point = worldPoint(event);
    svg.focus({ preventScroll: true });
    state.snapSuppressed = !!event.altKey;
    const detectionHandle = event.target.closest?.('[data-detect-handle]');
    if (detectionHandle && state.magic?.step === 2.5 && !state.magic.busy) {
      const m = state.magic; pushDetectionHistory(); state.drag = { kind: 'detection', id: detectionHandle.dataset.id, field: detectionHandle.dataset.detectHandle, index: Number(detectionHandle.dataset.index), pointerId: event.pointerId, before: K.copy(m.detectCandidates) }; svg.setPointerCapture(event.pointerId); return;
    }
    if (state.magic && event.button === 0 && state.tool !== 'pan' && magicPointer(point)) return;
    if (state.insertingType && event.button === 0 && state.tool !== 'pan') {
      const type = state.insertingType; state.insertingType = null; state.tool = 'select';
      addElement(type, point); state.placementPreview = null; state.placementMount = null; renderPlacementTools(); renderSmartSnapPreview(); return;
    }
    const editHandle = event.target.closest('[data-edit-handle]');
    if (editHandle && state.mode === 'edit' && state.tool === 'select' && event.button === 0 && !(event.shiftKey || event.ctrlKey || event.metaKey)) {
      const kind = editHandle.dataset.editHandle;
      if (kind === 'pivot') { transformModal('pivot'); return; }
      svg.setPointerCapture(event.pointerId);
      state.drag = {
        kind: 'manipulation', handle: kind, fixedEnd: editHandle.dataset.fixedEnd || 'a', pointerId: event.pointerId,
        start: point, clientStart: { x: event.clientX, y: event.clientY }, keys: [...state.selectedElementIds],
        pivot: state.editPivot || W.pivot(state.project, state.selectedElementIds, state.result),
        projectBefore: K.copy(state.project), resultBefore: K.copy(state.result),
        historyBefore: [...state.history], historySelectionsBefore: [...state.historySelections],
        futureBefore: state.future, futureSelectionsBefore: state.futureSelections, moved: false,
      };
      document.body.classList.add('canvas-dragging'); return;
    }
    const control = event.target.closest('[data-control]'), elementControl = event.target.closest('[data-element-control]');
    const hit = canvasHit(event), selectedTarget = I.target(state.project, hit);
    const e = selectedTarget?.element || state.project.elements.find((e) => e.id === event.target.closest('[data-element]')?.dataset.element);
    const nodeReference = I.reference(selectedTarget);
    const nodeTarget = nodeReference ? { dataset: { element: nodeReference.elementId, point: nodeReference.point } } : null;
    const outlineControl = event.target.closest('[data-outline-control]');
    if (state.dimensionPick && state.tool === 'measure' && event.button === 0) { event.preventDefault(); pickDimensionPoint(event); return; }
    const dimension = event.target.closest('[data-dimension]');
    if (dimension && event.button === 0 && state.tool !== 'pan') { dimensionModal(dimension.dataset.dimension); return; }
    if (state.tool === 'connect' && event.button === 0) {
      if (nodeTarget) connectPoint({ elementId: nodeTarget.dataset.element, point: nodeTarget.dataset.point });
      else if (['slot', 'rail', 'cam'].includes(e?.type)) connectPoint({ elementId: e.id, point: 'curve' });
      else toast('Kliknite na označený uzlový bod alebo drážku kulisy.');
      return;
    }
    if (state.tool === 'select' && event.button === 0 && event.ctrlKey && !event.shiftKey) {
      const hits = canvasHit(event, true), current = state.selectedElementIds.at(-1), index = hits.indexOf(current);
      selectTarget(hits.length ? hits[(index + 1) % hits.length] : null); return;
    }
    if (state.tool === 'select' && event.button === 0 && (event.shiftKey || event.metaKey)) { selectTarget(hit, true); return; }
    svg.setPointerCapture(event.pointerId);
    if (state.tool === 'pan' || event.button === 1) {
      state.drag = { kind: 'pan', start: point, view: { ...state.view }, clientStart: { x: event.clientX, y: event.clientY }, pointerId: event.pointerId };
    } else if (state.tool === 'measure') {
      const reference = nodeTarget ? { elementId: nodeTarget.dataset.element, point: nodeTarget.dataset.point } : { x: point.x, y: point.y };
      const a = E.resolvePoint(state.result, reference) || point;
      state.measure = { a: { ...a }, b: { ...a }, referenceA: reference };
      state.drag = { kind: 'measure', pointerId: event.pointerId };
    } else if (state.mode === 'edit' && (outlineControl || elementControl || control)) {
      const kind = outlineControl ? 'outline-control' : elementControl ? 'element-control' : 'control', id = control ? 'slot-1' : e?.id || state.selected;
      const index = Number(outlineControl?.dataset.outlineControl ?? elementControl?.dataset.elementControl ?? control?.dataset.control);
      selectTarget(kind === 'outline-control' ? I.outlineKey(id, index) : I.controlKey(id, index)); state.playing = false;
      state.drag = {
        kind, index, id, pointerId: event.pointerId, start: point, clientStart: { x: event.clientX, y: event.clientY },
        projectBefore: K.copy(state.project), resultBefore: K.copy(state.result),
        historyBefore: [...state.history], historySelectionsBefore: [...state.historySelections],
        futureBefore: state.future, futureSelectionsBefore: state.futureSelections, moved: false,
      };
    } else if (selectedTarget?.type === 'joint') {
      selectTarget(hit); state.playing = false;
    } else if (e) {
      const preserveGroup = state.selectedElementIds.length > 1 && state.selectedElementIds.includes(hit);
      selectTarget(hit, false, preserveGroup); state.playing = false;
      const pose = state.result.poses[e.id], p = state.project.parameters;
      if (state.mode === 'edit') {
        if (e.primary) {
          toast('Parametrický prvok: upravte kóty v inšpektore alebo vytvorte voľnú kópiu.', true);
        } else {
          if (!nodeReference || !I.fixed(state.project, nodeReference)) state.drag = {
            kind: 'selection', pointerId: event.pointerId, start: point, clientStart: { x: event.clientX, y: event.clientY },
            keys: nodeReference && K.isElastic(e) ? [I.nodeKey(nodeReference)] : nodeReference && !['node', 'bearing'].includes(e.type) && !preserveGroup ? [I.elementKey(e.id)] : [...state.selectedElementIds], mount: nodeReference && !K.isElastic(e) && !['node', 'bearing'].includes(e.type) && !preserveGroup ? nodeReference : null, projectBefore: K.copy(state.project), resultBefore: K.copy(state.result),
            historyBefore: [...state.history], historySelectionsBefore: [...state.historySelections],
            futureBefore: state.future, futureSelectionsBefore: state.futureSelections, moved: false, clickSingle: preserveGroup ? hit : null,
            anchor: nodeReference ? K.point(state.result, nodeReference) : pose.a, nodeConnection: !preserveGroup ? nodeReference : null,
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
      } else if (K.isElastic(e) && nodeReference && beginElasticDrag(nodeReference, event.pointerId)) {
        // The construction stays intact; only runtime positions change while held.
      } else if (!e.primary && e.drive && e.type === 'rail') {
        state.drag = { kind: 'custom-rail', start: point, angle: e.angle, startMotion: state.motion, stroke: e.stroke, reversed: !!e.movingRail, pointerId: event.pointerId };
      } else if (!e.primary && e.drive && ['link', 'panel', 'cam', 'node'].includes(e.type)) {
        state.drag = e.driveMode === 'linear'
          ? { kind: 'custom-rail', start: point, angle: e.driveAngle, startMotion: state.motion, stroke: e.stroke, pointerId: event.pointerId }
          : { kind: 'custom-crank', center: pose[e.drivePivot || 'a'], offset: e.angle + (e.drivePivot === 'b' ? 180 : e.drivePivot === 'c' && e.localC ? -Math.atan2(e.localC.y, e.localC.x) / K.DEG : 0), pointerId: event.pointerId };
      } else if (!e.primary && !e.locked && beginBodyDrag(nodeReference || {elementId:e.id,point:'a'},point,event.pointerId)) {
        // Hold the constrained body at a runtime pose; release restores force motion.
      } else if (beginGuideDrag(e, event.pointerId)) {
        // A standalone follower can be positioned without prescribing a motor.
      } else if (!e.primary && !e.locked) {
        state.drag = { kind: 'inverse', id: e.id, key: nodeTarget?.dataset.point, fraction: K.nearestOnSegment(point, pose.a, pose.b).t, pointerId: event.pointerId };
      }
    } else selectTarget(null);
    if (state.drag) {
      document.body.classList.add('canvas-dragging');
      window.getSelection()?.removeAllRanges();
    }
    renderScene(); updateMotion();
  }

  function onPointerMove(event) {
    if (state.gifExport) return;
    if (touchMove(event)) return;
    const point = worldPoint(event);
    state.snapSuppressed = !!event.altKey;
    state.pointer = point;
    $('#pointer-coordinates').innerHTML = `X: ${fmt(point.x)} <span>Y: ${fmt(point.y)}</span>`;
    if (state.magic?.step === 2) $('#pointer-coordinates').innerHTML = `X: ${fmt(point.x)} px <span>Y: ${fmt(point.y)} px</span>`;
    const placing = state.insertingType || state.magic?.placementType;
    if (placing && !state.drag) { state.snapPreview = placementAt(placing, point).preview; renderSmartSnapPreview(); renderPlacementTools(); return; }
    if (state.magic && state.tool === 'magic-draw' && !state.drag) { state.magic.preview = snapDrawingPoint(point); renderScene(); return; }
    if (state.dimensionPick?.a && !state.drag) {
      const r = I.reference(I.target(state.project, canvasHit(event)));
      state.measure.b = r ? { ...E.resolvePoint(state.result, r) } : point;
      renderScene(); updateHover(canvasHit(event)); return;
    }
    const drag = state.drag;
    if (drag?.kind === 'detection' && event.pointerId === drag.pointerId) {
      const m = state.magic, c = m?.detectCandidates.find((c) => c.id === drag.id); if (!c) return;
      const pixel = M.pixelFromWorld(point, m.scale), target = c[drag.field][drag.index]; target.x = K.clamp(pixel.x, 0, m.image.width); target.y = K.clamp(pixel.y, 0, m.image.height); c.evidence.manual = true; c.motionEvidence = null; renderScene(); return;
    }
    if (!drag || event.pointerId !== drag.pointerId) { if (!state.contextMenuState.isOpen) updateHover(canvasHit(event)); return; }
    event.preventDefault();
    if (['rail', 'panel', 'custom-rail', 'inverse', 'crank', 'custom-crank', 'elastic-tip', 'force-body'].includes(drag.kind)) drag.simulationMoved = true;
    if (drag.kind === 'guide-follower') {
      const at = K.nearestOnPath(point, state.result.poses[drag.slotId].path), pose = state.result.poses[drag.id];
      const positions = { ...state.guidePositions, [drag.id]: { x: at.x, y: at.y, angle: pose.angle } };
      const result = K.solve(state.project, state.motion, { profile: state.profile, collisions: state.collisions, bodyPositions: { ...P.bodyPositions(state.dynamic), ...positions }, elasticPositions: P.elasticPositions(state.dynamic) });
      if (!result.blocked) { state.guidePositions = positions; state.result = result; renderScene(); updateMotion(); }
    } else if (drag.kind === 'force-body') {
      state.dynamic=P.dragBody(state.forceContext,state.dynamic,drag.id,point,drag.local);state.result=solveCurrent();state.result.forces=P.dynamicForces(state.forceContext,state.dynamic,state.result);renderScene();updateMotion();
    } else if (drag.kind === 'elastic-tip') {
      state.dynamic = P.dragTip(state.forceContext, state.dynamic, drag.id, point); state.result = solveCurrent();
      state.result.forces = P.dynamicForces(state.forceContext, state.dynamic, state.result); renderScene(); updateMotion();
    } else if (drag.kind === 'manipulation') {
      if (drag.failed || (!drag.moved && Math.hypot(event.clientX - drag.clientStart.x, event.clientY - drag.clientStart.y) < 3)) return;
      if (!drag.moved) { pushHistory(); drag.moved = true; }
      try {
        if (drag.handle === 'thickness') {
          const id = W.bodies(drag.projectBefore, drag.keys)[0], e = drag.projectBefore.elements.find((e) => e.id === id), pose = drag.resultBefore.poses[id], size = W.thickness(e), normal = K.along({ x: 0, y: 0 }, 1, pose.angle - 90);
          let value = size.value + 2 * ((point.x-drag.start.x)*normal.x + (point.y-drag.start.y)*normal.y);
          if (state.snap && !state.snapSuppressed) value = Math.round(value/5)*5;
          const min = K.isElastic(e) ? (e.type.startsWith('piston-') ? e.rodDiameter : 2 * e.wireDiameter) + .01 : .1;
          state.project = W.setThickness(drag.projectBefore, id, K.clamp(value, min, 500));
        } else if (drag.handle === 'length') {
          const id = W.bodies(drag.projectBefore, drag.keys)[0], e = drag.projectBefore.elements.find((e) => e.id === id), pose = drag.resultBefore.poses[id];
          const direction = K.along({ x: 0, y: 0 }, drag.fixedEnd === 'a' ? 1 : -1, pose.angle);
          let length = e.length + (point.x - drag.start.x) * direction.x + (point.y - drag.start.y) * direction.y;
          if (state.snap && !state.snapSuppressed) length = Math.round(length / 5) * 5;
          state.project = W.setLength(drag.projectBefore, id, K.clamp(length, .1, 5000), drag.fixedEnd, drag.resultBefore);
        } else {
          let dx = drag.handle === 'move-x' ? point.x - drag.start.x : 0, dy = drag.handle === 'move-y' ? point.y - drag.start.y : 0;
          let rotation = drag.handle === 'rotate' ? ((K.angleOf(drag.pivot, point) - K.angleOf(drag.pivot, drag.start) + 540) % 360) - 180 : 0;
          const preview = ['move-x', 'move-y'].includes(drag.handle) ? findDragSnap(drag, { x: dx, y: dy }, drag.handle === 'move-x' ? 'x' : 'y') : null;
          if (preview) { dx = preview.delta.x; dy = preview.delta.y; }
          if (state.snap && !state.snapSuppressed && !preview) {
            if (drag.handle === 'move-x') dx = Math.round((drag.pivot.x + dx) / 5) * 5 - drag.pivot.x;
            if (drag.handle === 'move-y') dy = Math.round((drag.pivot.y + dy) / 5) * 5 - drag.pivot.y;
          }
          if (state.angleSnap && !state.snapSuppressed && drag.handle === 'rotate') {
            const id = W.bodies(drag.projectBefore, drag.keys)[0], angle = drag.resultBefore.poses[id]?.angle || 0;
            rotation = Math.round((angle + rotation) / 10) * 10 - angle;
          }
          state.project = W.transform(drag.projectBefore, drag.keys, { dx, dy, angle: rotation, pivot: drag.pivot }, drag.resultBefore);
        }
        state.result = solveCurrent(); renderScene(); updateMotion();
      } catch (error) { drag.failed = true; toast(error.message, true); }
    } else if (drag.kind === 'selection') {
      if (drag.failed || (!drag.moved && Math.hypot(event.clientX - drag.clientStart.x, event.clientY - drag.clientStart.y) < 3)) return;
      if (!drag.moved) { pushHistory(); drag.moved = true; }
      let delta = { x: point.x - drag.start.x, y: point.y - drag.start.y };
      try {
        const preview = findDragSnap(drag, delta);
        if (preview) delta = preview.delta;
        else if (state.snap && !state.snapSuppressed) delta = { x: Math.round((drag.anchor.x + delta.x) / 5) * 5 - drag.anchor.x, y: Math.round((drag.anchor.y + delta.y) / 5) * 5 - drag.anchor.y };
        state.project = I.translate(drag.projectBefore, drag.keys, delta, drag.resultBefore);
        state.result = solveCurrent(); renderScene(); updateMotion();
      } catch (error) { drag.failed = true; toast(error.message, true); }
    } else if (drag.kind === 'rail') setMotion(drag.startMotion + point.x - drag.start.x);
    else if (drag.kind === 'panel') setMotion(K.inverseDrive(state.project, point, drag.fraction, { profile: state.profile, collisions: false, elementId: drag.elementId, point: drag.point }));
    else if (drag.kind === 'custom-rail') {
      const radians = drag.angle * K.DEG, range = K.configuredDriveRange(state.project);
      const offset = (point.x - drag.start.x) * Math.cos(radians) - (point.y - drag.start.y) * Math.sin(radians);
      setMotion(drag.startMotion + (drag.reversed ? -1 : 1) * offset / drag.stroke * (range.max - range.min));
    }
    else if (drag.kind === 'crank' || drag.kind === 'custom-crank') { let angle = (K.angleOf(drag.center, point) - (drag.offset || 0) + 720) % 360; if (state.angleSnap && !state.snapSuppressed) angle = Math.round(angle / 10) * 10; setMotion(angle); }
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
        if (state.snap) e.length = Math.max(1, Math.round(e.length / 5) * 5);
        if (state.angleSnap && !state.snapSuppressed) { const parentAngle = e.parentId ? state.result.poses[e.parentId].angle : 0; e.angle = Math.round((e.angle + parentAngle) / 10) * 10 - parentAngle; }
      }
      state.result = solveCurrent(); renderScene(); updateMotion();
    } else if (['element-control', 'outline-control', 'control'].includes(drag.kind)) {
      if (drag.failed || !drag.moved && Math.hypot(event.clientX - drag.clientStart.x, event.clientY - drag.clientStart.y) < 3) return;
      if (!drag.moved) { pushHistory(); drag.moved = true; }
      try {
        const snapped = snapDrawingPoint(point, drag.id);
        if (drag.kind === 'control') {
          const next = K.copy(drag.projectBefore), p = next.parameters;
          next.controls ||= K.defaultControls(p);
          next.controls[drag.index] = { x: K.clamp(snapped.x - p.slotOffsetX, -5000, 5000), y: K.clamp(snapped.y - p.slotOffsetY, -5000, 5000) };
          state.project = K.validateProject(next); state.profile = K.slotProfile(state.project);
        } else {
          const pose = drag.resultBefore.poses[drag.id], local = K.localPoint({ a: pose.controlOrigin || pose.a, angle: pose.angle }, snapped);
          state.project = I.setControlPoint(drag.projectBefore, drag.id, drag.index, { x: K.clamp(local.x, -5000, 5000), y: K.clamp(local.y, -5000, 5000) }, drag.kind === 'outline-control');
        }
        state.result = solveCurrent(); renderScene(); updateMotion();
      } catch (error) { drag.failed = true; toast(error.message, true); }
    }
  }

  function beginGuideDrag(e, pointerId) {
    if (e?.type !== 'bearing' || e.primary || e.locked || e.parentId || e.drive) return false;
    const joints = state.project.connections.filter(j => [j.a,j.b].some(r => r.elementId === e.id));
    if (joints.some(j => j.type !== 'point-path')) return false;
    const guide = joints.map(j => j.a.point === 'curve' ? j.a : j.b).find(r => state.project.elements.find(v => v.id === r.elementId)?.type === 'slot');
    const slotId = guide?.elementId || e.slotId;
    if (!state.result.poses[slotId]?.path?.length) return false;
    state.drag = { kind: 'guide-follower', id: e.id, slotId, pointerId, before: K.copy(state.guidePositions || {}) };
    return true;
  }

  function beginElasticDrag(reference, pointerId) {
    const graph=K.elasticGraph(state.project,state.result.poses),group=graph.groups.find((g)=>g.id===graph.ports[`${reference.elementId}:${reference.point}`]);
    if(group?.anchors.length)return false;
    if (!state.forceContext && !prepareForces(true)) return false;
    const context = state.forceContext, id = context.network?.graph.ports[`${reference.elementId}:${reference.point}`];
    if (!context.network?.particles.some((g) => g.id === id)) return false;
    state.dynamic ||= P.initialState(context, state.motion);
    state.drag = { kind: 'elastic-tip', id, pointerId, before: K.copy(state.dynamic) };
    return true;
  }

  function beginBodyDrag(reference, point, pointerId) {
    if(!state.project.elements.some(K.isElastic))return false;
    if (!state.forceContext && !prepareForces(false)) return false;
    const context=state.forceContext;if(!context.bodyDynamics)return false;
    let id=context.bodyDynamics.owners[reference.elementId];
    if(K.isElastic(state.project.elements.find((e)=>e.id===reference.elementId))) {
      const group=context.graph.groups.find((g)=>g.id===context.graph.ports[`${reference.elementId}:${reference.point}`]);id=group?.anchors.map((r)=>context.bodyDynamics.owners[r.elementId]).find((id)=>context.bodyDynamics.bodies.some((b)=>b.id===id));
    }
    if(!context.bodyDynamics.bodies.some((b)=>b.id===id))return false;
    state.dynamic ||= P.initialState(context,state.motion);
    state.drag={kind:'force-body',id,local:K.localPoint(state.result.poses[id],point),pointerId,before:K.copy(state.dynamic)};return true;
  }

  function resumeElasticMotion() {
    if (state.mode !== 'simulate' || state.project.simulation.returnOnRelease === false || !state.project.elements.some(K.isElastic) || state.result.blocked) return;
    state.trial = null; state.trialBlock = null;
    if (state.project.simulation.mode !== 'dynamic') {
      state.project.simulation.mode = 'dynamic'; state.dirty = true; state.saved = false; updateHeader();
      clearTimeout(autosaveTimer); autosaveTimer = setTimeout(() => saveProject(true), 700);
    }
    if (!prepareForces(true, true)) return;
    if (state.dynamic) { state.dynamic.time = 0; state.dynamic.stopped = false; state.dynamic.reason = ''; }
    state.playing = false; actions.play(); renderWorkflowTools();
  }

  function onLostPointerCapture(event) {
    if (!state.drag || state.drag.pointerId !== event.pointerId) return;
    const held = !!(event.buttons & 1) || state.touchGesture?.points.has(event.pointerId);
    if (held && !$('#modal').open && document.hasFocus?.() !== false) {
      try { $('#mechanism-canvas').setPointerCapture(event.pointerId); return; } catch { /* The pointer may already have left the window. */ }
    }
    onPointerUp({pointerId:event.pointerId,cancelled:true});
  }
  function onPointerUp(event) {
    const touch=state.touchGesture,deferred=touch?.deferred;
    if (touchEnd(event)) return;
    if(deferred&&deferred.pointerId===event.pointerId&&!event.cancelled&&event.type!=='pointercancel'){if(state.insertingType||state.magic?.placementType||!touch.moved)onPointerDown(deferred);return;}
    const drag = state.drag;
    if (drag && event.pointerId !== drag.pointerId) return;
    state.drag = null;
    state.snapPreview = null;
    document.body.classList.remove('canvas-dragging');
    if ($('#mechanism-canvas').hasPointerCapture(event.pointerId)) $('#mechanism-canvas').releasePointerCapture(event.pointerId);
    if (drag?.kind === 'guide-follower' && (event.cancelled || event.type === 'pointercancel')) { state.guidePositions = drag.before; state.result = solveCurrent(); renderScene(); updateMotion(); return; }
    if (['elastic-tip','force-body'].includes(drag?.kind) && (event.cancelled || event.type === 'pointercancel')) { state.dynamic = drag.before; state.result = solveCurrent(); renderScene(); updateMotion(); return; }
    if (drag?.kind === 'detection') { if (event.type === 'pointercancel' || event.cancelled) { state.magic.detectCandidates = drag.before; state.magic.detectHistory.pop(); } renderMagicImport(); renderScene(); return; }
    if (['selection', 'manipulation', 'element-control', 'outline-control', 'control'].includes(drag?.kind)) {
      if (!drag.moved) {
        if (drag.clickSingle) selectTarget(drag.clickSingle);
        if (drag.kind === 'manipulation' && event.type !== 'pointercancel' && !event.cancelled) transformModal(drag.handle, drag.fixedEnd);
        renderBindingTools();
        return;
      }
      if (event.type === 'pointercancel' || event.cancelled || drag.failed || JSON.stringify(state.project) === JSON.stringify(drag.projectBefore)) {
        state.project = drag.projectBefore; state.history = drag.historyBefore; state.historySelections = drag.historySelectionsBefore;
        state.future = drag.futureBefore; state.futureSelections = drag.futureSelectionsBefore;
        recalculate(false); renderTree(); renderInspector(); updateToolbar();
      } else { changed(false); offerSnapConnection(drag.preview, true); }
    }
    if (drag && ['element', 'resize'].includes(drag.kind)) {
      if (event.type === 'pointercancel' || event.cancelled) { state.project = state.history.pop() || state.project; state.historySelections.pop(); }
      try { state.project = K.validateProject(state.project); changed(false); }
      catch (error) { state.project = state.history.pop() || state.project; state.historySelections.pop(); recalculate(false); renderInspector(); toast(error.message, true); }
    }
    if (drag?.kind === 'measure' && !event.cancelled && event.type !== 'pointercancel' && K.distance(state.measure.a, state.measure.b) > 0.1) {
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-point]');
      const b = target ? { elementId: target.dataset.element, point: target.dataset.point } : { ...state.measure.b };
      pushHistory(); state.project.dimensions.push(E.makeDimension(state.result, state.measure.referenceA, b)); changed(false);
      toast('Kóta bola pridaná. Kliknutím na ňu nastavíte typ a odsadenie.');
    }
    if (drag?.simulationMoved && !event.cancelled && event.type !== 'pointercancel') resumeElasticMotion();
  }

  function mainDimensionsSVG(result, scale) {
    if (!state.mainDimensions || state.magic) return '';
    const d = globalThis.KinmoUsability.mainDimensions(state.project, result); if (!d) return '';
    const gap = 24 / scale, y = d.top - gap, x = d.left - gap, size = 12 / scale;
    return `<g data-editor-overlay="main-dimensions" class="main-dimensions" pointer-events="none" fill="var(--ink)" stroke="var(--accent)" stroke-width="1" vector-effect="non-scaling-stroke">${line({x:d.left,y:d.top},{x:d.left,y:y-gap/3})}${line({x:d.right,y:d.top},{x:d.right,y:y-gap/3})}${line({x:d.left,y},{x:d.right,y})}${line({x:d.left,y:d.top},{x:x-gap/3,y:d.top})}${line({x:d.left,y:d.bottom},{x:x-gap/3,y:d.bottom})}${line({x,y:d.top},{x,y:d.bottom})}<text x="${(d.left+d.right)/2}" y="${y-5/scale}" text-anchor="middle" stroke="none" font-size="${size}">Šírka ${fmt(d.width,1)} mm</text><text transform="translate(${x-6/scale},${(d.top+d.bottom)/2}) rotate(-90)" text-anchor="middle" stroke="none" font-size="${size}">Výška ${fmt(d.height,1)} mm</text></g>`;
  }
  function dimensionsOverview() {
    const d = globalThis.KinmoUsability.mainDimensions(state.project, state.result); if (!d) { toast('Najskôr vložte prvok.'); return; }
    modal('Hlavné rozmery mechanizmu', `<p>Aktuálna poloha · jednotky mm. Rozmery vychádzajú z obrysov viditeľných prvkov; nezahŕňajú predlohu ani texty.</p><div class="dimension-metrics"><strong>Šírka ${fmt(d.width,2)} mm</strong><strong>Výška ${fmt(d.height,2)} mm</strong></div><div class="comparison-scroll"><table class="diagnostic-table"><thead><tr><th>Prvok</th><th>A–B (mm)</th><th>Pracovný rozsah (mm)</th></tr></thead><tbody>${d.members.map(e=>`<tr><td>${escape(e.name)}</td><td>${fmt(e.length,2)}</td><td>${e.min == null ? '—' : `${fmt(e.min)}–${fmt(e.max)}`}</td></tr>`).join('')}</tbody></table></div><p>Rozmery na plátne zapnete tlačidlom Hlavné rozmery v hornej lište.</p>`);
  }
  function explainMovement() {
    const report = globalThis.KinmoUsability.blockers(state.project, state.result);
    state.showFreedom = true; renderScene();
    modal('Prečo sa mechanizmus nehýbe?', `<p>${report.free} voľných súradníc. Pevné uloženie samo osebe nie je chyba; určte, ktorá časť sa má pohybovať.</p><div class="explanation-list">${report.hints.map(s=>`<p>${escape(s)}</p>`).join('')}${report.rows.map(r=>`<button class="button button-secondary" data-action="explain-focus" data-key="${escape(r.key)}" data-kind="${r.action}">${escape(r.message)}</button>`).join('') || '<p>V zobrazenej polohe sa nenašlo obmedzenie. Skontrolujte celý cyklus.</p>'}</div><h3>Navrhnuté opravy</h3>${report.repairs.map(r=>`<button class="button button-secondary" data-action="repair-model" data-key="${escape(r.key)}" data-kind="${r.action}">${escape(r.label)}</button>`).join('') || '<p>Bez automatického návrhu opravy.</p>'}<div class="modal-actions"><button class="button button-dark" data-action="cycle-review">Overiť celý cyklus</button></div>`, true);
  }
  async function reviewCycle() {
    const revision = JSON.stringify(state.project), project = K.copy(state.project), range = K.driveRange(project), samples = [], profile = K.prepareProject(project), token = {};
    modal('Kontrola celého cyklu', '<p id="cycle-progress" role="status">Kontrolujem polohy…</p><button class="button button-secondary" data-action="close-modal">Zrušiť</button>');
    state.cycleReviewJob = token;
    try {
      for (let i=0;i<201;i++) {
        if (state.cycleReviewJob !== token || !$('#modal').open || JSON.stringify(state.project) !== revision) return;
        samples.push(K.solve(project,K.lerp(range.min,range.max,i/200),{profile,collisions:true}));
        if (i%10===0) { $('#cycle-progress').textContent = `Kontrolujem polohu ${i+1}/201`; await new Promise(resolve=>requestAnimationFrame(resolve)); }
      }
      const review = globalThis.KinmoUsability.cycleReview(project,samples); state.cycleReview = {review,revision};
      modal('Výsledok kontroly cyklu', `<p>${review.count} vzorkovaných polôh · ${review.failures.length} polôh s upozornením. Kontrolované sú väzby, kolízie a zdvih pružných členov.</p>${!review.hasDrive ? '<p class="analysis-warning">Chýba predpísaný pohon. Táto kontrola nepredpovedá časový priebeh Pohybu zo síl.</p>' : ''}<p>Kontrola je vzorkovaná; veľmi úzky konflikt medzi vzorkami môže uniknúť.</p><div class="cycle-failures">${review.failures.map((r,i)=>`<button class="button button-secondary" data-action="cycle-position" data-index="${i}">${fmt(r.motion,2)} ${review.range.unit} · ${escape(r.reasons.join(' ') || 'Nesplnená väzba')}</button>`).join('') || '<p>Vo vzorkovaných polohách nebol zistený problém.</p>'}</div>`,true);
    } catch(error) { if ($('#modal').open) toast(error.message,true); }
    finally { if (state.cycleReviewJob===token) state.cycleReviewJob=null; }
  }
  function connectionDiagram(review) {
    const svg=X.vectorSVG(review.project,review.result,{dimensions:false,trajectories:false,labels:false}), bounds=X.geometryBounds(X.geometry(review.project,review.result,{dimensions:false,trajectories:false}));
    const points=review.joint ? [K.point(review.result,review.joint.a),K.point(review.result,review.joint.b)].filter(Boolean) : [], radius=bounds.width/100;
    const markers=points.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="${radius}" fill="#f7d56e" stroke="#9b462c" stroke-width="${radius/4}"/>`).join('');
    const at=points[0], label=at ? `<text x="${at.x+radius*2}" y="${at.y-radius*2}" fill="#9b462c" font-size="${radius*2}">Nový spoj</text>` : '';
    return svg.replace('</svg>',`<g aria-label="Spojované body">${markers}${label}</g></svg>`);
  }
  function previewConnection(a, b, type, snap = null, showPreview = false) {
    try {
      const review = globalThis.KinmoUsability.connectionPreview(state.project,a,b,type,state.motion,{snap,design:state.mode==='edit'});
      if (!showPreview) {
        if (snap) submitSnapConnection(new Map([['type', type]]));
        else editCanvas(review.project, 'Väzba bola pridaná. Späť ju odstráni.');
        state.pendingJoint = null; state.connectionReview = null; updateToolbar();
        if (review.errors.length || review.result.blocked) toast('Väzba bola pridaná s upozornením. Skontrolujte uloženie a rozmery alebo použite Späť.', true);
        return;
      }
      state.connectionReview = {a:K.copy(a),b:K.copy(b),type,review,revision:JSON.stringify(state.project),snap:snap?K.copy(snap):null,transaction:state.snapTransaction};
      const elastic=[a,b].some(r=>K.isElastic(state.project.elements.find(e=>e.id===r.elementId)));
      const types = a.point==='curve'||b.point==='curve' ? ([a,b].some(r=>r.point==='curve'&&state.project.elements.find(e=>e.id===r.elementId)?.type==='rail') ? ['point-path','prismatic'] : [type]) : elastic ? ['revolute'] : ['revolute','fixed'];
      modal('Náhľad novej väzby', `<div class="connection-type-choices">${types.map(t=>`<button class="button button-secondary" data-action="connection-type" data-type="${t}" aria-pressed="${type===t}">${escape(E.constraintNames[t])}</button>`).join('')}</div><p>${escape(review.motion)}</p><p>Voľné súradnice: ${review.before} → ${review.after}. Počet závisí od aktuálnej geometrie.</p><div class="connection-preview">${connectionDiagram(review)}</div><form id="connection-review-form">${review.errors.length || review.result.blocked ? `<p class="analysis-warning">Náhľad obsahuje konflikt: ${escape([...review.errors.map(r=>r.name),...review.issues].join('; '))}</p><label class="check-row"><input type="checkbox" name="accept-conflict" required/>Vložiť aj s upozornením; geometriu upravím následne.</label>` : '<p>V tejto polohe nebol zistený konflikt väzieb. Celý cyklus overte po vložení.</p>'}<div class="modal-actions"><button class="button button-secondary" type="button" data-action="close-modal">Zrušiť</button><button class="button button-dark">Potvrdiť väzbu</button></div></form>`,true);
    } catch(error) { toast(error.message,true); }
  }
  function confirmConnection(data) {
    const draft = state.connectionReview; if (!draft || draft.revision !== JSON.stringify(state.project)) throw new Error('Model sa zmenil. Vytvorte nový náhľad väzby.');
    if ((draft.review.errors.length || draft.review.result.blocked) && !data.has('accept-conflict')) throw new Error('Potvrďte upozornenie alebo zvoľte inú väzbu.');
    if(draft.snap){state.pendingSnap=draft.snap;state.snapTransaction=draft.transaction;submitSnapConnection(new Map([['type',draft.type]]));}else editCanvas(draft.review.project,'Väzba bola potvrdená.'); state.pendingJoint=null; state.connectionReview=null; $('#modal').close(); updateToolbar();
  }
  function constructionModal() {
    const e = currentElement(); if (!e || !K.isElastic(e)) return;
    const geom = e.type.startsWith('piston-') ? K.pistonGeometry(e) : null;
    modal('Konštrukčné rozmery', `<p>${escape(e.name)} · zmeny rozsahu sa potvrdia spoločne.</p>${geom ? `<p>Valec: ${fmt(geom.cylinder,2)} mm · zdvih: ${fmt(geom.stroke,2)} mm · potrebné zasunutie: ${fmt(geom.stroke+geom.overlap,2)} mm.</p>` : '<p>Voľná dĺžka musí byť medzi oboma dorazmi.</p>'}<form id="construction-form" data-id="${escape(e.id)}"><div class="settings-fields">${quantityInput('minLength','Minimálna dĺžka medzi čapmi',''+e.minLength,'mm',.1,5000)}${quantityInput('maxLength','Maximálna dĺžka medzi čapmi',''+e.maxLength,'mm',.1,5000)}${quantityInput('restLength','Voľná / referenčná dĺžka',''+e.restLength,'mm',.1,5000)}</div><p id="construction-feedback" role="status"></p><div class="modal-actions"><button class="button button-secondary" type="button" data-action="close-modal">Zrušiť</button><button class="button button-dark">Použiť rozmery</button></div></form>`);
  }
  function propertiesOverview() {
    const e = currentElement(); if (!e) return;
    modal('Vlastnosti prvku', `<h3>${escape(e.name)}</h3><p>${escape(typeNames[e.type])}</p>${e.primary ? '<p>Chránená šablóna. Vytvorte voľnú kópiu na úpravy.</p><button class="button button-secondary" data-action="make-editable">Vytvoriť voľnú kópiu</button>' : `<div class="properties-overview"><details open><summary>Geometria</summary><div><button data-action="element-menu">Názov</button><button data-action="open-full-properties">Všetky parametre geometrie</button>${K.isElastic(e) ? '<button data-action="construction">Konštrukčné rozmery a zdvih</button>' : state.mode==='edit'&&!e.locked ? '<button data-action="edit-numbers">Poloha X / Y</button><button data-action="edit-rotation">Natočenie</button>' : ''}${state.mode==='edit'&&W.thickness(e) ? '<button data-action="edit-thickness">Hrúbka / priemer</button>' : ''}</div></details><details><summary>Spojenia a uloženie</summary><div><button data-action="selection-settings">Spojenia / uloženie</button><button data-action="new-joint">Pridať väzbu</button></div></details>${!K.isElastic(e)&&!['ground','slot'].includes(e.type)&&!e.parentId ? '<details><summary>Pohon a limity</summary><div><button data-action="selection-motor">Priradiť / upraviť pohon</button><button data-action="element-limits">Pohybové limity</button></div></details>' : ''}<details><summary>Kontrola</summary><div><button data-action="explain-movement">Prečo sa nehýbe?</button><button data-action="cycle-review">Overiť celý cyklus</button></div></details></div>`}`);
  }
  function issueModal() {
    modal('Nahlásiť problém · lokálny balík', '<p>Balík obsahuje geometriu projektu, aktuálnu polohu, režim a diagnostiku. Zdrojové obrázky sa vynechajú. Súbor si stiahnete a priložíte k hláseniu.</p><form id="issue-form"><label class="property-field"><span>Čo sa stalo a ako to zopakovať?</span><textarea class="text-field" name="description" maxlength="4000" rows="5" required></textarea></label><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zrušiť</button><button class="button button-dark">Stiahnuť diagnostický balík</button></div></form>');
  }

  function modal(title, content, wide = false) {
    state.cycleReviewJob=null;
    closeContextMenu();
    document.querySelectorAll('#workflow-tools details[open], #model-checks details[open]').forEach((el) => { el.open = false; });
    state.playing = false; updateMotion();
    const el = $('#modal');
    el.className = wide ? 'modal-wide' : '';
    el.innerHTML = `<div class="modal-heading"><div><span class="eyebrow">KINEMATIKA STUDIO</span><h2 id="modal-title">${escape(title)}</h2></div>${ib('close', 'close-modal', 'Zavrieť dialóg')}</div>${content}`;
    if (!el.open) el.showModal();
  }

  function templateCards() {
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
    return `<div class="template-grid">${Object.keys(texts).map((kind) => `<button class="preset-card" data-action="load-template" data-kind="${kind}"><div class="preset-preview"><svg viewBox="0 0 230 115" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${previews[kind]}</svg>${kind === 'drawer' ? '<span class="recommended">ODPORÚČANÉ</span>' : ''}</div><div class="preset-body"><h3>${texts[kind][0]}</h3><p>${texts[kind][1]}</p><div><span>${texts[kind][2]}</span><span>${texts[kind][3]}</span>${icon('arrow', 16)}</div></div></button>`).join('')}</div>`;
  }

  function magicBounds() {
    const magic = state.magic, rect = M.imageRect(magic.image, magic.step <= 2 ? null : magic.scale);
    let minX = rect.x, minY = rect.y, maxX = rect.x + rect.width, maxY = rect.y + rect.height;
    if (magic.step >= 3) for (const e of state.project.elements.filter((e) => e.visible)) {
      const pose = state.result.poses[e.id];
      if (!pose) continue;
      for (const p of [pose.a, pose.b, pose.c, ...(pose.path || []), ...(pose.outline || [])].filter(Boolean)) {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
      }
    }
    const padding = Math.max(.01, Math.max(maxX - minX, maxY - minY) * .06);
    return { x: minX - padding, y: minY - padding, width: maxX - minX + 2 * padding, height: maxY - minY + 2 * padding };
  }

  function liveDimensionSVG(scale) {
    const d=state.drag;if(d?.kind!=='manipulation'||!state.pointer)return '';
    const e=state.project.elements.find(e=>e.id===W.bodies(state.project,d.keys)[0]);if(!e)return '';
    const value=d.handle==='thickness'?`${W.thickness(e).label} ${fmt(W.thickness(e).value,2)} mm`:d.handle==='length'?`L ${fmt(e.length,2)} mm`:d.handle==='rotate'?`${fmt(e.angle,2)}°`:'';
    return value?`<g data-editor-overlay="dimension-live" pointer-events="none"><text class="handle-value" x="${state.pointer.x+16/scale}" y="${state.pointer.y-16/scale}" font-size="${12/scale}">${escape(d.typed?`${d.typed} · Enter`:value+' · zadajte číslo + Enter')}</text></g>`:'';
  }
  function typeDimension(event) {
    const d=state.drag;if(d?.kind!=='manipulation'||!['length','thickness','rotate'].includes(d.handle)||event.ctrlKey||event.metaKey||event.altKey)return false;
    if(/^[0-9.,-]$/.test(event.key)||event.key==='Backspace'){event.preventDefault();d.typed=event.key==='Backspace'?(d.typed||'').slice(0,-1):((d.typed||'')+event.key).slice(0,32);renderScene();return true;}
    if(event.key!=='Enter'||!d.typed)return false;
    event.preventDefault();try{const value=W.parseNumber(d.typed,d.handle==='rotate'?'°':'mm'),id=W.bodies(d.projectBefore,d.keys)[0];
      const next=d.handle==='thickness'?W.setThickness(d.projectBefore,id,value):d.handle==='length'?W.setLength(d.projectBefore,id,value,d.fixedEnd,d.resultBefore):W.transform(d.projectBefore,d.keys,{angle:value-d.projectBefore.elements.find(e=>e.id===id).angle,pivot:d.pivot},d.resultBefore);
      if(!d.moved){pushHistory();d.moved=true;}state.project=next;state.result=solveCurrent();onPointerUp({pointerId:d.pointerId});
    }catch(error){toast(error.message,true);}return true;
  }
  function elasticStatusSVG(scale) {
    const e=currentElement(),pose=e&&state.result.poses[e.id];if(state.mode!=='simulate'||!K.isElastic(e)||!pose)return '';
    const f=state.result.forces?.find(f=>f.id===e.id),stroke=pose.length-e.minLength,deflection=pose.length-e.restLength,stop=pose.length<=e.minLength+.05?' · zasunutý doraz':pose.length>=e.maxLength-.05?' · vysunutý doraz':'';
    return `<g data-editor-overlay="elastic-status" pointer-events="none"><text class="handle-value" x="${(pose.a.x+pose.b.x)/2}" y="${(pose.a.y+pose.b.y)/2+32/scale}" text-anchor="middle" font-size="${11/scale}">${e.type.startsWith('spring-')?'Deformácia':'Zdvih'} ${fmt(e.type.startsWith('spring-')?deflection:stroke,1)} mm${stop}</text><text class="handle-value" x="${(pose.a.x+pose.b.x)/2}" y="${(pose.a.y+pose.b.y)/2+47/scale}" text-anchor="middle" font-size="${10/scale}">Sila ${fmt(f?.nominalForce||0,1)} N · tlmenie ${fmt(f?.dampingForce||0,1)} N</text></g>`;
  }
  function railFreedomSVG(e,pose,scale) {
    const start=K.along(pose.a,e.carriageOffset,e.angle),end=K.along(start,e.stroke,e.angle),moving=e.movingRail?[pose.a,pose.b]:[pose.ct,pose.cb];
    return `<g data-editor-overlay="rail-freedom">${line(start,end,'stroke="#16867b" stroke-width="3" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"')}${moving.every(Boolean)?line(...moving,'stroke="#16867b" stroke-width="7" opacity=".45" vector-effect="non-scaling-stroke"'):''}${[start,end].map(p=>`<circle cx="${p.x}" cy="${p.y}" r="${5/scale}" fill="#fff" stroke="#16867b" vector-effect="non-scaling-stroke"/>`).join('')}</g>`;
  }
  function freedomBlockersSVG(id,scale) {
    const family=W.descendants(state.project,[id]);
    return state.project.connections.filter(j=>[j.a,j.b].some(r=>family.has(r.elementId))).map(j=>{const {a,b}=jointPoints(j);return a&&b?`<g>${line(a,b,'stroke="#c48227" stroke-width="5" opacity=".6" vector-effect="non-scaling-stroke"')}<circle cx="${a.x}" cy="${a.y}" r="${12/scale}" fill="none" stroke="#c48227" stroke-width="3" vector-effect="non-scaling-stroke"/><text class="handle-value" x="${a.x+16/scale}" y="${a.y-12/scale}" font-size="${10/scale}">${escape(j.name)}</text></g>`:'';}).join('');
  }
  function chooseConnectionTarget(index) {
    const prior=state.pendingSnap,choice=prior?.alternatives?.[index];if(!choice)return;
    const at=K.point(state.result,choice.source.ref),delta={x:choice.point.x-at.x,y:choice.point.y-at.y};
    state.project=I.translate(state.project,[choice.wholeBody?I.elementKey(choice.source.elementId):I.nodeKey(choice.source.ref)],delta,state.result);state.result=solveCurrent();
    state.pendingSnap={...choice,alternatives:prior.alternatives};if(state.snapTransaction)state.snapTransaction.project=JSON.stringify(state.project);renderScene();
  }
  function repairModel(el) {
    focusModelCheck({...el,dataset:{...el.dataset,kind:'inspect'}});const t=I.target(state.project,el.dataset.key);if(!t)return;
    if(el.dataset.kind==='remove-duplicate'){const next=K.copy(state.project);next.connections=next.connections.filter(j=>j.id!==t.joint.id);for(const d of next.dimensions)if(d.constraintId===t.joint.id)d.constraintId='';editCanvas(next,'Nadbytočná väzba bola odstránená.');}
    else if(el.dataset.kind==='edit-joint')jointModal(t.joint.id);
    else if(el.dataset.kind==='elastic-range'){
      const next=K.copy(state.project),e=next.elements.find(e=>e.id===t.elementId),manual=e.rangeMode==='manual';e.rangeMode='auto';K.fitElasticRanges(next,[e.id],state.result);if(manual)e.rangeMode='manual';
      state.pendingRangeRepair={revision:JSON.stringify(state.project),next};
      modal('Prispôsobiť pracovný rozsah?',`<p>Aktuálna vzdialenosť čapov: ${fmt(state.result.poses[e.id].length,2)} mm. Navrhnutý rozsah: ${fmt(e.minLength,2)}–${fmt(e.maxLength,2)} mm.</p><p>Tuhosť pružiny sa zachová; valec piesta sa prispôsobí zdvihu. Zadaný režim ručných dorazov ostane zachovaný.</p><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zrušiť</button><button class="button button-dark" data-action="repair-range-apply">Použiť pracovný rozsah</button></div>`);
    }
    else if(el.dataset.kind==='connect')beginSelectedConnection();
    else if(el.dataset.kind==='support'){selectTarget(I.nodeKey({elementId:t.elementId,point:'a'}));state.showFreedom=true;renderScene();renderBindingTools();toast('Vyberte montážny bod a stlačte Ukotviť bod k rámu.');}
  }
  function referenceCalibrationModal() {
    const ref=state.project.importReference;if(!ref)return;const frame=ref.frames[ref.active],r=frame.rect;
    state.referenceCalibration={projectId:state.project.id,revision:JSON.stringify(state.project),frame:ref.active,count:0};
    modal('Kalibrácia predlohy podľa rozmeru',`<form id="reference-calibration-form"><p>Kliknite na body A a B známeho úseku v obrázku. Zadajte jeho skutočnú dĺžku.</p><div class="calibration-picture"><img src="${escape(frame.dataURL)}" class="reference-calibration-image" data-action="reference-calibration-pick" alt="Vyberte body A a B v predlohe"/><svg id="reference-calibration-marks" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg></div><div class="plan-row">${[['ax',r.x+r.width*.25],['ay',r.y+r.height*.5],['bx',r.x+r.width*.75],['by',r.y+r.height*.5]].map(([key,v])=>quantityInput(key,key.toUpperCase()+' (mm)',v)).join('')}</div>${quantityInput('distance','Skutočná dĺžka A–B (mm)',100,'mm',.1,5000)}<label class="check-row"><input type="checkbox" name="model"${state.project.kind!=='custom'?' disabled':''}/>Prepočítať aj celý model, kóty a väzby</label><p class="section-description">Bez tejto voľby sa zmení iba predloha. Bod A zostane na mieste. Zmenu vrátite jedným Späť.</p><div class="modal-actions"><button class="button button-secondary" type="button" data-action="close-modal">Zrušiť</button><button class="button button-dark">Použiť mierku</button></div></form>`,true);
  }
  function pickReferenceCalibration(el,event) {
    const draft=state.referenceCalibration,frame=state.project.importReference?.frames[draft?.frame];if(!frame)return;
    const box=el.getBoundingClientRect(),key=draft.count++%2?'b':'a',x=K.clamp((event.clientX-box.left)/box.width,0,1),y=K.clamp((event.clientY-box.top)/box.height,0,1),form=$('#reference-calibration-form');
    form.elements[key+'x'].value=frame.rect.x+x*frame.rect.width;form.elements[key+'y'].value=frame.rect.y+y*frame.rect.height;
    const marks=$('#reference-calibration-marks');marks.innerHTML=['a','b'].map(k=>{const px=(Number(form.elements[k+'x'].value)-frame.rect.x)/frame.rect.width*100,py=(Number(form.elements[k+'y'].value)-frame.rect.y)/frame.rect.height*100;return `<circle cx="${px}" cy="${py}" r="1.2" fill="#c64a24"/><text x="${px+2}" y="${py-2}" font-size="4" fill="#c64a24">${k.toUpperCase()}</text>`;}).join('');
  }
  function elasticResponseModal(values=null) {
    const e=currentElement();if(!K.isElastic(e))return;
    const input=values||{mass:e.tipMass||1,damping:e.damping,load:0},plot=WF.response(e,Number(input.mass),Number(input.damping),2,Number(input.load||0));state.responseDraft={id:e.id,revision:JSON.stringify(state.project),...input};
    const min=e.minLength,max=e.maxLength,path=plot.rows.map((r,i)=>`${i?'L':'M'}${30+r.time/2*490} ${145-(r.length-min)/(max-min)*120}`).join('');
    modal('Náhľad návratu a tlmenia',`<form id="elastic-response-form"><p>Samostatný osový prvok s bodovou hmotnosťou. Náhľad pomáha nastaviť návrat; väzby celej zostavy sledujte na plátne.</p><svg class="response-chart" viewBox="0 0 550 175" role="img" aria-label="Dĺžka pružného prvku počas dvoch sekúnd"><path d="M30 20V145H520" fill="none" stroke="#aaa"/><path d="${path}" fill="none" stroke="#16867b" stroke-width="2"/><text x="30" y="165" font-size="12">0 s</text><text x="490" y="165" font-size="12">2 s</text><text x="35" y="15" font-size="12">Dĺžka ${fmt(min)}–${fmt(max)} mm</text></svg><div class="response-presets">${[['fast','Rýchly návrat'],['slow','Pomalý návrat'],['oscillate',e.type.startsWith('spring-')?'Kmitanie so zaťažením':'Nízke tlmenie']].map(([preset,label])=>`<button class="button button-secondary" type="button" data-action="response-preset" data-preset="${preset}">${label}</button>`).join('')}</div>${quantityInput('mass','Pohyblivá hmotnosť (kg)',input.mass,'',.001,1000)}${quantityInput('damping','Osové tlmenie (N·s/m)',input.damping,'',0,100000)}${quantityInput('load','Stála protisila v náhľade (N)',input.load||0,'',0,1000000)}<p class="section-description">Jednosmerná pružina potrebuje na kmitanie protisilu. Táto skúšobná záťaž sa neukladá do mechanizmu.</p><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zavrieť</button><button class="button button-secondary">Aktualizovať náhľad</button><button type="button" class="button button-dark" data-action="response-apply">Použiť tlmenie na prvku</button></div></form>`,true);
  }
  function applyResponsePreset(preset) {
    const e=currentElement(),form=$('#elastic-response-form'),mass=W.parseNumber(form.elements.mass.value,''),critical=2*Math.sqrt(mass*Math.max(1,P.axial(e,e.restLength).rate*1000));
    const compression=['spring-compression','piston-push'].includes(e.type),at=e.restLength+(compression?-1:1)*(compression?e.restLength-e.minLength:e.maxLength-e.restLength)*.15;
    const load=preset==='oscillate'&&e.type.startsWith('spring-')?Math.abs(P.axial(e,at).nominalForce):W.parseNumber(form.elements.load.value,'');
    elasticResponseModal({mass,load,damping:preset==='oscillate'?critical*.05:preset==='slow'?Math.max(200,critical*5):critical});
  }
  function perspectiveModal(){const m=state.magic;if(!m?.image||m.geometryStarted){toast('Perspektívu vyrovnajte pred vytvorením geometrie.',true);return;}state.perspectivePick=0;modal('Vyrovnať perspektívu fotografie',`<form id="advanced-perspective-form"><p>Kliknite štyri rohy známeho obdĺžnika po obvode: ľavý horný, pravý horný, pravý dolný, ľavý dolný. Zadaný pomer strán určí vyrovnaný obrázok. Následne nastavíte mierku v mm.</p><div class="calibration-picture"><img class="reference-calibration-image" src="${escape(m.image.url)}" data-action="magic-perspective-pick" alt="Štyri rohy obdĺžnika"/><svg id="perspective-marks" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg></div><output id="perspective-progress">Roh 1 zo 4</output><div class="advanced-fields">${[[0,0],[m.image.width,0],[m.image.width,m.image.height],[0,m.image.height]].map(([x,y],i)=>quantityInput('x'+i,'Roh '+(i+1)+' · X (px)',x,'',0,m.image.width)+quantityInput('y'+i,'Y (px)',y,'',0,m.image.height)).join('')}</div>${quantityInput('width','Známa šírka obdĺžnika (mm)',400,'',1,5000)}${quantityInput('height','Známa výška obdĺžnika (mm)',300,'',1,5000)}<button class="button button-dark">Vyrovnať obrázok a znovu kalibrovať</button></form>`,true);}
  async function rectifyMagic(data){const magic=state.magic;if(!magic?.image||magic.geometryStarted)throw new Error('Obrázok sa zmenil alebo už obsahuje geometriu.');const width=quantityValue(data,'width','',1,5000),height=quantityValue(data,'height','',1,5000),points=Array.from({length:4},(_,i)=>({x:quantityValue(data,'x'+i,'',0,magic.image.width),y:quantityValue(data,'y'+i,'',0,magic.image.height)})),image=new Image();image.src=magic.image.url;await image.decode();if(state.magic!==magic)throw new Error('Import bol zrušený.');const factor=Math.min(1200/width,1200/height),canvas=window.KinmoAdvanced.rectify(image,points,width*factor,height*factor);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));canvas.width=canvas.height=0;if(!blob)throw new Error('Vyrovnaný obrázok sa nepodarilo vytvoriť.');magic.step=1;await onMagicImage(new File([blob],'Vyrovnana-predloha.png',{type:'image/png'}));$('#modal').close();}
  function startLesson(kind){let p;if(kind==='cam'){const cam=K.makeElement('cam',100,100);cam.drive=true;cam.driveSpeed=45;p=K.preset('custom');p.elements=[cam];p=I.addCamFollower(p,cam.id,E.design(p,0));}else p=WF.kit(kind,160,25,kind==='rail');p.id=K.uid();p.name=({rail:'Príklad: vozík s pohonom','spring-arm':'Príklad: pružinové rameno',cam:'Príklad: vačka a valček'})[kind];replaceProject(p);if(state.project.id!==p.id)return;state.lesson={kind,index:0};renderLesson();}
  function renderLesson(){let panel=$('#lesson-panel');if(!panel){panel=document.createElement('div');panel.id='lesson-panel';panel.className='lesson-panel';$('#canvas-area').append(panel);}if(!state.lesson){panel.hidden=true;return;}const steps={rail:['Vyberte vedenie a overte, že pevné vedenie pohybuje vozíkom.','V simulácii potiahnite vozík. Pohyb sa zastaví na hraniciach vedenia.','Otvorte Viac pohonov a nastavte trvanie stopy.','Skúste ukotviť pripojenú dosku: diagnostika odhalí zablokovaný pohyb. Zmenu vrátite Späť.'],'spring-arm':['Vyberte rameno. Čap A je ukotvený, druhý bod je spojený s pružinou.','Stlačte Pohyb zo síl a sledujte návrat ramena.','V Meraní v čase porovnajte silu a rýchlosť.','Skúste odpojiť pružinu: voľné rameno už nemá silové pripojenie. Diagnostika upozorní na chýbajúce spojenie.'],'cam':['Vyberte vačku. Valček je vedený v priamom vedení.','Spustite simuláciu: vačka predpisuje trvalý kontakt valčeka.','V Kontakt a dorazy zapnite pružný kontakt. Pohyb zo síl umožní odtrhnutie.','Nízka hmotnosť a príliš vysoká tuhosť môžu vyžadovať menší časový krok; upravte parametre podľa diagnostiky.']},rows=steps[state.lesson.kind];panel.hidden=false;panel.innerHTML=`<strong>Krok ${state.lesson.index+1} / ${rows.length}</strong><p>${rows[state.lesson.index]}</p><button data-action="lesson-next">${state.lesson.index===rows.length-1?'Dokončiť':'Ďalší krok'}</button><button data-action="lesson-close">Zavrieť</button>`;}
  function advancedModal(tab='hub') {
    const A=window.KinmoAdvanced,e=currentElement(),ref=selectionReference();if(!A)return;
    let body='';
    if(tab==='hub') {if(!ref){toast('Vyberte čap alebo koniec člena.',true);return;}const hub=A.hub(state.project,ref,state.result);body=`<p>Spoločný čap: ${hub.references.length} bodov, ${hub.joints.length} väzieb. Odpojenie nemení ostatné členy.</p>${hub.joints.map(j=>`<div class="advanced-row"><span>${escape(state.project.elements.find(e=>e.id===j.a.elementId)?.name)} ↔ ${escape(state.project.elements.find(e=>e.id===j.b.elementId)?.name)}</span><button class="button button-secondary" data-action="hub-detach" data-id="${escape(j.id)}"${j.builtin?' disabled':''}>Odpojiť iba tento spoj</button></div>`).join('')||'<p>Čap zatiaľ nemá pripojený ďalší člen.</p>'}`;}
    if(tab==='drives'){const drivers=state.project.elements.filter(e=>e.drive&&!e.primary);body=`<form id="advanced-drives-form"><p>Každá stopa predpisuje samostatný pohyb v čase. Pridať pohon možno aj na ďalší vlastný člen. Pri rozpore väzieb sa prehrávanie zastaví.</p>${state.project.elements.filter(e=>!e.primary&&!e.parentId&&!e.locked&&['link','panel','rail','cam','node'].includes(e.type)).map(e=>{const t=state.project.driveProgram?.tracks.find(t=>t.elementId===e.id);return `<fieldset><legend><label><input type="checkbox" name="drive" value="${escape(e.id)}"${e.drive?' checked':''}/>${escape(e.name)}</label></legend><label>Typ<select name="mode-${escape(e.id)}" class="property-select"><option value="linear"${(e.driveMode==='linear'||['rail','node'].includes(e.type))?' selected':''}${e.type==='cam'?' disabled':''}>Posuv (mm)</option><option value="rotary"${(e.driveMode!=='linear'&&!['rail','node'].includes(e.type))?' selected':''}${['rail','node'].includes(e.type)?' disabled':''}>Otáčanie (°)</option></select></label><div class="advanced-fields">${[['from',t?.from??0],['to',t?.to??(e.driveMode==='linear'?e.stroke:90)],['delay',t?.delay??0],['duration',t?.duration??6]].map(([k,v])=>`<label>${({from:'Od',to:'Do',delay:'Oneskorenie (s)',duration:'Trvanie (s)'})[k]}<input class="text-field" name="${k}-${escape(e.id)}" type="number" step="any" value="${v}" required/></label>`).join('')}<label>Priebeh<select class="property-select" name="easing-${escape(e.id)}"><option value="linear">Lineárny</option><option value="smooth"${t?.easing==='smooth'?' selected':''}>Plynulý</option></select></label></div></fieldset>`;}).join('')}<button class="button button-dark">Uložiť program pohonov</button></form>`;}
    if(tab==='planes'){if(!e||e.primary){toast('Vyberte vlastný člen.',true);return;}body=`<form id="advanced-plane-form">${quantityInput('plane','Montážna rovina (−20 až 20)',e.plane||0,'',-20,20)}<label>Skupina<input class="text-field" name="group" maxlength="60" value="${escape(e.group||'')}"/></label><p>Kríženie sa kontroluje medzi členmi rovnakej roviny. Skupina organizuje výber a viditeľnosť; nevytvára pevné spojenie.</p>${e.group?`<button type="button" class="button button-secondary" data-action="group-select">Vybrať skupinu</button><button type="button" class="button button-secondary" data-action="group-visibility">Prepnúť viditeľnosť skupiny</button>`:''}<button class="button button-dark">Uložiť</button></form>`;}
    if(tab==='contacts'){const frictionBody=e&&I.root(state.project,e);body=`<form id="advanced-contact-form"><p>Pružný vačkový kontakt je jednostranný: tlačí pri preniknutí, pri odtrhnutí má nulovú silu. Pre jemnú integráciu používajte primeranú tuhosť a kladnú hmotnosť sledovača.</p>${state.project.connections.filter(j=>j.type==='cam-contact').map(j=>`<fieldset><legend><label><input type="checkbox" name="contact" value="${escape(j.id)}"${j.contact?.enabled?' checked':''}/>${escape(j.name)} · pružný kontakt</label></legend>${quantityInput('k-'+j.id,'Tuhosť kontaktu (N/mm)',j.contact?.stiffness||100,'',.01,10000)}${quantityInput('c-'+j.id,'Tlmenie kontaktu (N·s/m)',j.contact?.damping??10,'',0,10000)}</fieldset>`).join('')}<label class="check-row"><input type="checkbox" name="soft"${state.project.simulation.softStops?' checked':''}/>Pružné dorazy pružín a piestov (maximálne 2 mm prekročenie)</label>${quantityInput('stop-k','Tuhosť dorazu (N/mm)',state.project.simulation.stopStiffness||100,'',.01,10000)}${quantityInput('stop-c','Tlmenie dorazu (N·s/m)',state.project.simulation.stopDamping??20,'',0,10000)}${frictionBody&&!frictionBody.drive&&!frictionBody.locked&&!['ground','slot','rail'].includes(frictionBody.type)?quantityInput('friction','Trenie vybraného pohyblivého člena (N)',frictionBody.guideFriction||0,'',0,10000):''}<button class="button button-dark">Použiť parametre kontaktu</button></form>`;}
    if(tab==='variants'){if(!e||e.primary){toast('Vyberte vlastný člen pre varianty.',true);return;}body=`<form id="advanced-variant-form"><label>Parameter<select name="property" class="property-select">${['length','stroke','stiffness','x','y','angle'].map(k=>`<option value="${k}">${escape(k)}</option>`).join('')}</select></label><label>2 až 4 hodnoty oddelené bodkočiarkou<input class="text-field" name="values" value="${e.length}; ${e.length*1.2}" required/></label><button class="button button-dark">Porovnať varianty</button></form>`;}
    if(tab==='measure'){const rows=state.measurements||[];body=`<p>${rows.length} zaznamenaných polôh. Záznam sa dopĺňa pri prehrávaní; graf zachováva aj sily a rýchlosti dynamiky.</p><button class="button button-secondary" data-action="measurement-clear">Nový záznam</button><button class="button button-secondary" data-action="measurement-csv">Export CSV</button><label>Člen<select class="property-select" id="measure-member">${state.project.elements.map(v=>`<option value="${escape(v.id)}"${e?.id===v.id?' selected':''}>${escape(v.name)}</option>`).join('')}</select></label><label>Veličina<select class="property-select" id="measure-metric"><option value="length">Dĺžka (mm)</option><option value="angle">Uhol (°)</option><option value="speed">Rýchlosť A (mm/s)</option><option value="force">Osová sila (N)</option></select></label><button class="button button-secondary" data-action="measurement-plot">Zobraziť graf</button><div id="measurement-plot"></div>`;}
    if(tab==='revisions'){const entries=readAutomaticVersions();body=`<p>Obnoviteľné lokálne verzie pred úpravami. Ukladajú sa najviac 12 verzií a 1,5 MB; pri nedostupnom úložisku úpravy pokračujú bez zálohy.</p>${entries.filter(v=>v.project.id===state.project.id).map(v=>`<div class="advanced-row"><span>${escape(new Date(v.time).toLocaleString('sk-SK',{timeZone:'Europe/Bratislava'}))} · ${v.project.elements.length} prvkov</span><button class="button button-secondary" data-action="automatic-review" data-id="${escape(v.id)}">Porovnať / obnoviť</button></div>`).join('')||'<p>Zatiaľ nie sú uložené verzie tohto projektu.</p>'}`;}
    if(tab==='learn'){body=`<p>Príklad sa otvorí ako nový vlastný projekt. Aktuálny model sa najskôr uloží.</p>${[['rail','Vozík a pohon'],['spring-arm','Rameno s pružinou'],['cam','Vačka a valček']].map(([kind,label])=>`<button class="button button-secondary" data-action="lesson-start" data-kind="${kind}">${label}</button>`).join('')}`;}
    modal(({hub:'Spoločný čap',drives:'Časové stopy pohonov',planes:'Skupiny a montážne roviny',contacts:'Kontakt, dorazy a trenie',variants:'Porovnanie variantov',measure:'Meranie v čase',revisions:'Automatické verzie',learn:'Interaktívne príklady'})[tab],body,true);
  }
  function readAutomaticVersions() {try{const data=JSON.parse(localStorage.getItem('kinematika.automatic.v1')||'[]');return Array.isArray(data)?data.slice(0,12).flatMap(v=>{try{return [{id:String(v.id),time:Number(v.time)||0,project:K.validateProject(v.project)}];}catch{return [];}}):[];}catch{return [];}
  }
  function automaticVersion() {if(state.magic||!window.KinmoAdvanced)return;try{const entries=readAutomaticVersions(),project=K.copy(state.project);if(entries.some(v=>v.project.id===project.id&&JSON.stringify(v.project)===JSON.stringify(project)))return;entries.unshift({id:K.uid(),time:Date.now(),project});entries.splice(12);while(JSON.stringify(entries).length>1500000&&entries.length>1)entries.pop();if(JSON.stringify(entries).length<=1500000)localStorage.setItem('kinematika.automatic.v1',JSON.stringify(entries));}catch{/* Quota does not block the editing transaction. */}
  }
  function measurementPlot(){const records=state.measurements||[],id=$('#measure-member').value,metric=$('#measure-metric').value,rows=window.KinmoAdvanced.series(records,id,metric);if(!rows.length){$('#measurement-plot').innerHTML='<p>Spustite prehrávanie a potom otvorte meranie.</p>';return;}const min=Math.min(...rows.map(r=>r.value)),max=Math.max(...rows.map(r=>r.value)),duration=rows.at(-1).time||1;$('#measurement-plot').innerHTML=`<svg viewBox="0 0 600 200" class="response-chart" role="img" aria-label="Graf ${metric} podľa času">${rows.map((r,i)=>`<circle data-action="measurement-seek" data-index="${i}" cx="${20+r.time/duration*560}" cy="${170-(r.value-min)/(max-min||1)*140}" r="4" tabindex="0" role="button" aria-label="Čas ${fmt(r.time,2)} s, hodnota ${fmt(r.value,2)}"/>`).join('')}<text x="20" y="195" font-size="12">0–${fmt(duration,2)} s · ${fmt(min,2)} až ${fmt(max,2)}</text></svg>`;}
  function captureMeasurement(delta) {if(!window.KinmoAdvanced||delta<=0)return;const time=state.dynamic?state.dynamic.time:(state.measureTime||0)+delta;if(time<(state.measureTime||0)){state.measurements=[];state.measureRuntime=[];}else if(time===state.measureTime)return;state.measureTime=time;state.measurements ||= [];if(state.measurements.length>=2400)return;state.measurements.push(window.KinmoAdvanced.record(state.measurements.at(-1),state.result,state.measureTime));state.measureRuntime ||= [];state.measureRuntime.push(state.dynamic?K.copy(state.dynamic):null);
  }
  function advancedSubmit(form,data){const A=window.KinmoAdvanced,p=K.copy(state.project);
    if(form.id==='advanced-drives-form'){if(p.kind!=='custom')throw new Error('Pohony upravte vo voľnej kópii.');const ids=new Set(data.getAll('drive'));for(const e of p.elements.filter(e=>!e.primary)){e.drive=ids.has(e.id);if(e.drive)e.driveMode=String(data.get('mode-'+e.id));}p.driveProgram={tracks:p.elements.filter(e=>e.drive).map(e=>({elementId:e.id,from:Number(data.get('from-'+e.id)),to:Number(data.get('to-'+e.id)),delay:Number(data.get('delay-'+e.id)),duration:Number(data.get('duration-'+e.id)),easing:String(data.get('easing-'+e.id))}))};if(!ids.size)p.driveProgram=null;p.simulation.mode='kinematic';p.motionPlan=null;applyProject(p);state.planTime=0;}
    else if(form.id==='advanced-plane-form'){const e=p.elements.find(e=>e.id===state.selected);e.group=String(data.get('group'));e.plane=quantityValue(data,'plane','',-20,20);applyProject(p);}
    else if(form.id==='advanced-contact-form'){const ids=new Set(data.getAll('contact'));for(const j of p.connections.filter(j=>j.type==='cam-contact'))j.contact=ids.has(j.id)?{enabled:true,stiffness:quantityValue(data,'k-'+j.id,'',.01,10000),damping:quantityValue(data,'c-'+j.id,'',0,10000)}:null;p.simulation.softStops=data.has('soft');p.simulation.stopStiffness=quantityValue(data,'stop-k','',.01,10000);p.simulation.stopDamping=quantityValue(data,'stop-c','',0,10000);if(data.has('friction'))I.root(p,p.elements.find(e=>e.id===state.selected)).guideFriction=quantityValue(data,'friction','',0,10000);applyProject(p);}
    else if(form.id==='advanced-variant-form'){const variants=A.compare(p,state.selected,String(data.get('property')),String(data.get('values')).split(';').map(v=>W.parseNumber(v)));state.variantDraft=variants;modal('Výsledky variantov',`<div class="variant-grid">${variants.map((v,i)=>`<section><h3>${fmt(v.value,2)}</h3><svg viewBox="${Object.values(K.bounds(v.project,v.samples)).join(' ')}" class="response-chart">${v.project.elements.map(e=>{const pose=v.samples[0].poses[e.id];return pose?line(pose.a,pose.b,'stroke="var(--secondary)" stroke-width="3" vector-effect="non-scaling-stroke"'):'';}).join('')}</svg><p>Blokované polohy: ${v.blocked}/61 · maximálna osová sila ${fmt(v.peak,2)} N · dráha A: X ${fmt(v.spanX,2)} / Y ${fmt(v.spanY,2)} mm</p><button class="button button-dark" data-action="variant-apply" data-index="${i}">Použiť tento variant</button></section>`).join('')}</div>`,true);return true;}
    else return false;$('#modal').close();return true;
  }
  function renderWorkflowTools() {
    const root = $('#workflow-tools'); if (!root) return;
    root.hidden = !!state.magic;
    const reference = state.project.importReference, imported = reference || state.project.source?.name === 'Magic import';
    const extraTools = `<button data-action="explain-movement">Prečo sa nehýbe?</button><button data-action="cycle-review">Overiť celý cyklus</button><button data-action="dimensions-overview">Prehľad rozmerov</button><button data-action="issue-report">Nahlásiť problém</button>`;
    const advanced=window.KinmoAdvanced?`<details class="workflow-position-menu"><summary>Ďalšie nástroje</summary><div>${extraTools}${[['hub','Spoločný čap'],['drives','Viac pohonov'],['contacts','Kontakt a dorazy'],['planes','Skupiny / roviny'],['measure','Meranie v čase'],['variants','Varianty'],['revisions','Automatické verzie'],['learn','Príklady']].map(([tab,label])=>`<button data-action="advanced-open" data-tab="${tab}">${label}</button>`).join('')}</div></details>`:'';
    const markup = `${advanced}${state.phasePick ? '<button data-action="plan-pick-done">Použiť polohu</button><button data-action="plan-pick-cancel">Zrušiť výber</button>' : ''}${imported ? `<button data-action="reference-toggle" aria-pressed="${!!reference?.visible}"${reference ? '' : ' title="Doplniť pôvodný obrázok staršieho Magic projektu"'}>Predloha</button>${reference ? '<button data-action="reference-settings" aria-label="Nastaviť predlohu">◐</button>' : ''}` : ''}${(state.project.elements.some(K.isElastic)||state.project.connections.some(j=>j.contact?.enabled)) ? `<button data-action="force-motion" aria-pressed="${state.project.simulation?.mode === 'dynamic'}">Pohyb zo síl</button>` : ''}${state.mode==='simulate' ? '<details class="workflow-position-menu"><summary>Poloha simulácie</summary><div><button data-action="simulation-pause">Pozastaviť tu</button><button data-action="simulation-design">Vrátiť do návrhu</button><button data-action="simulation-bake">Poloha → návrh</button></div></details>' : ''}<button data-action="freedom-toggle" aria-pressed="${!!state.showFreedom}">Voľnosť</button><button data-action="trial-toggle" aria-pressed="${!!state.trial}">Skúšobný pohyb</button><button data-action="mechanism-kit">Zostavy</button><button data-action="motion-plan">Fázy pohybu</button>`;
    if (root._workflowMarkup !== markup) { root.innerHTML = markup + '<button class="mobile-workflow-button" data-action="mobile-workflow" aria-haspopup="dialog">Nástroje</button>'; root._workflowMarkup = markup; }
    const heading=$('.scene-heading');if(heading){heading.style ||= {};const top=Math.max(34,root.hidden?34:root.getBoundingClientRect().height+12);heading.style.top=`${top}px`;const tools=$('.canvas-tools');if(tools){tools.style ||= {};tools.style.top=`${Math.max(108,top+75)}px`;}}
  }

  function mobileToolsModal(kind = 'app') {
    let title, content;
    if (kind === 'workflow') {
      renderWorkflowTools(); renderModelChecks();
      title = 'Nástroje mechanizmu';
      content = `<section><h3>Pohyb a zostavy</h3>${$('#workflow-tools')._workflowMarkup || ''}</section><section><h3>Kontrola modelu</h3>${$('#model-checks').innerHTML}</section>`;
    } else if (kind === 'selection') {
      const e = currentElement(); title = e?.name || 'Vybraný prvok';
      content = `<section><h3>Prvok a väzby</h3><button data-action="selection-settings"${e && !e.primary && state.mode === 'edit' ? '' : ' disabled'}>Spojenia a uloženie</button><button data-action="properties-overview"${e ? '' : ' disabled'}>Vlastnosti prvku</button></section>${!$('#manipulation-tools').hidden ? `<section><h3>Geometria</h3>${$('#manipulation-tools').innerHTML}<button data-action="mobile-handles" aria-pressed="${!!state.mobileHandles}">${state.mobileHandles ? 'Skryť' : 'Zobraziť'} úchyty na plátne</button></section>` : ''}`;
    } else {
      title = 'Ponuka pracovného priestoru';
      const controls = [['undo','Späť'],['redo','Znova'],['settings','Vzhľad a nastavenia'],['diagnostics','Diagnostika väzieb'],['toggle-inspector','Inšpektor vlastností'],['profileVisible','Pohybový profil'],['timelineVisible','Časová os'],['help','Pomoc']];
      content = `<section><h3>Pracovný priestor</h3>${controls.map(([action,label])=>`<button data-action="${action}"${action === 'undo' && !state.history.length || action === 'redo' && !state.future.length ? ' disabled' : ''}>${label}</button>`).join('')}</section><section><h3>Zobrazenie plátna</h3>${[['grid','Mriežka'],['main-dimensions','Hlavné rozmery'],['dimensions','Kóty'],['ghosts','Krajné polohy'],['trace','Trajektórie'],['labels','Názvy a texty']].map(([action,label])=>`<button data-action="${action}" aria-pressed="${!!state[({grid:'grid','main-dimensions':'mainDimensions',dimensions:'dimensions',ghosts:'ghosts',trace:'trace',labels:'labels'})[action]]}">${label}</button>`).join('')}</section>`;
    }
    modal(title, `<div class="mobile-tools-dialog">${content}</div>`);
  }

  function referenceSVG() {
    const ref = state.project.importReference; if (!ref?.visible || state.magic) return '';
    const frame = ref.frames[ref.active], r = frame.rect;
    return `<g data-editor-overlay="import-reference" pointer-events="none"><image href="${escape(frame.dataURL)}" x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" preserveAspectRatio="none" opacity="${ref.opacity}"/></g>`;
  }

  function referenceSettings() {
    const r = state.project.importReference; if (!r) return;
    modal('Predloha z Magic importu', `<form id="reference-form"><p class="section-description">Obrázok je uložený v projekte a v .kinmo. Predloha nemení geometriu ani väzby.</p><button type="button" class="button button-secondary" data-action="reference-replace">Vymeniť obrázok predlohy</button><button type="button" class="button button-secondary" data-action="reference-calibrate">Kalibrovať podľa známeho rozmeru</button><label class="property-field">Priehľadnosť (%)<input class="text-field" name="opacity" type="number" min="5" max="100" value="${r.opacity * 100}" required/></label><label class="property-field">Poloha<select name="active" class="property-select">${r.frames.map((f, i) => `<option value="${i}"${r.active === i ? ' selected' : ''}>${escape(f.name)}</option>`).join('')}</select></label>${quantityInput('x', 'Ľavý okraj X (mm)', r.frames[r.active].rect.x)}${quantityInput('y', 'Horný okraj Y (mm)', r.frames[r.active].rect.y)}${quantityInput('width', 'Šírka obrázka (mm)', r.frames[r.active].rect.width, 'mm', .1, 10000)}<label class="check-row"><input name="visible" type="checkbox"${r.visible ? ' checked' : ''}/>Zobraziť predlohu</label><div class="modal-actions"><button class="button button-secondary" type="button" data-action="close-modal">Zrušiť</button><button class="button button-dark">Použiť</button></div></form>`);
  }

  async function attachReference(file) {
    if (state.magic || !file || !(state.project.importReference || state.project.source?.name === 'Magic import')) return;
    const projectId = state.project.id, image = await M.loadImage(file);
    try {
      if (state.project.id !== projectId || state.magic) return;
      const old = state.project.importReference?.frames[0]?.rect, scale = state.project.source?.note?.match(/Kalibrácia: ([0-9.]+) mm \/ ([0-9.]+) px/), factor = scale ? Number(scale[1]) / Number(scale[2]) : 500 / image.width;
      state.referenceDraft = { dataURL: image.dataURL, name: image.name, ratio: image.height / image.width, projectId };
      modal('Zarovnať predlohu k existujúcemu modelu', `<form id="reference-attach-form"><p class="section-description">Geometria zostane zachovaná. Nastavte polohu ľavého horného rohu obrázka a jeho šírku v mm podľa pôvodnej kalibrácie. Po vložení môžete doladiť zarovnanie cez nastavenie predlohy.</p>${quantityInput('x', 'Ľavý okraj X (mm)', old?.x ?? 0)}${quantityInput('y', 'Horný okraj Y (mm)', old?.y ?? 0)}${quantityInput('width', 'Šírka obrázka (mm)', old?.width ?? image.width * factor, 'mm', .1, 10000)}<div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zrušiť</button><button class="button button-dark">Pridať predlohu</button></div></form>`);
    } finally { URL.revokeObjectURL(image.url); }
  }

  function freedomSVG(scale) {
    if ((!state.showFreedom && currentElement()?.type !== 'rail') || state.magic) return '';
    const selected = state.project.elements.find((e) => e.id === state.selected); if (!selected) return '';
    const root = I.root(state.project, selected), pose = state.result.poses[root.id]; if (!pose) return '';
    const cache = state.freedomCache, now = Date.now();
    if (!cache || cache.project !== state.project || cache.result !== state.result && now - cache.time > 250) state.freedomCache = { project: state.project, result: state.result, time: now, value: E.freedom(state.project, state.result) };
    const vectors = state.freedomCache.value.directions?.find((d) => d.elementId === root.id)?.vectors || [], center = { x: (pose.a.x + pose.b.x) / 2, y: (pose.a.y + pose.b.y) / 2 }, unit = 36 / scale;
    let arrows = '';
    for (const v of vectors) {
      const norm = Math.hypot(v.x, v.y); if (norm > .001) { const dx = v.x / norm * unit, dy = v.y / norm * unit; arrows += `<path d="M${center.x - dx} ${center.y - dy}L${center.x + dx} ${center.y + dy}m${-dx * .2 - dy * .15} ${-dy * .2 + dx * .15}L${center.x + dx} ${center.y + dy}l${-dx * .2 + dy * .15} ${-dy * .2 - dx * .15}" fill="none" stroke="#16867b" stroke-width="2" vector-effect="non-scaling-stroke"/>`; }
      if (Math.abs(v.angle) > .001) arrows += `<path d="M${center.x - unit} ${center.y}a${unit} ${unit} 0 1 1 ${unit} ${unit}l${unit * .2} ${-unit * .3}m${-unit * .2} ${unit * .3}l${-unit * .3} ${-unit * .15}" fill="none" stroke="#16867b" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
    }
    const rail = root.type==='rail' ? railFreedomSVG(root,pose,scale) : '';
    const message = root.type==='rail' ? (root.movingRail?'Vozík je pevný · vedenie sa posúva':'Vedenie je pevné · vozík sa posúva') : root.drive ? 'Pohyb riadi pohon' : vectors.length ? 'Možný pohyb · väzby môžu spájať smery' : 'Poloha je v tomto bode určená';
    return `<g data-editor-overlay="freedom" pointer-events="none">${rail}${arrows}${!vectors.length && !root.drive ? freedomBlockersSVG(root.id,scale) : ''}<text x="${center.x}" y="${center.y + unit * 1.5}" text-anchor="middle" font-size="${11 / scale}" fill="#16867b" stroke="var(--paper)" stroke-width="${3 / scale}" paint-order="stroke">${message}</text></g>`;
  }

  function toggleTrial() {
    if (state.trial) { const old = state.trial; state.trial = null; state.trialBlock = null; state.mode = old.mode; setMotion(old.motion); updateToolbar(); return; }
    if (!state.project.elements.length) { toast('Najskôr vytvorte mechanizmus.', true); return; }
    if (state.project.kind === 'custom' && (!state.project.elements.some((e) => e.drive) || E.freedom(state.project, state.result).free)) { toast('Skúšobný pohyb potrebuje pohon a určený pohyb ostatných telies. Použite Overiť model.', true); return; }
    const original = { mode: state.mode, motion: state.motion };
    state.playing = false; setMode('simulate'); state.trial = original; state.trialBlock = null; state.tool = 'select'; renderScene(); updateToolbar();
    toast('Potiahnite vozík alebo rameno. Zablokovanie ponechá poslednú funkčnú polohu. Ukončenie obnoví pôvodnú polohu.');
  }

  function trialSVG(scale) {
    const blocked = state.trialBlock; if (!blocked) return '';
    const rows = W.constraints(state.project, blocked).filter((r) => r.status === 'error'), ids = new Set([...blocked.invalid, ...blocked.collisions, ...rows.flatMap((r) => r.elementIds)]);
    const marks = [...ids].map((id) => { const p = state.result.poses[id]; return p ? line(p.a, p.b, `stroke="#c74735" stroke-width="8" opacity=".45" vector-effect="non-scaling-stroke"`) : ''; }).join('');
    const r = state.view;
    return `<g data-editor-overlay="trial" pointer-events="none">${marks}<text x="${r.x + 20 / scale}" y="${r.y + r.height - 95 / scale}" font-size="${12 / scale}" fill="#c74735">${escape(blocked.issues[0] || 'Pohyb blokujú väzby alebo dorazy')} · posledná funkčná poloha</text></g>`;
  }

  function kitModal() {
    modal('Pripravená mechanická zostava', `<form id="kit-form"><label class="property-field">Zostava<select name="type" class="property-select"><option value="rail">Vozík s vedením a doskou</option><option value="link">Rameno s pevným čapom</option><option value="slot">Čap v kulise s ramenom</option><option value="panel">Sklápacie čelo s čapom</option><option value="piston">Piest medzi dvoma montážnymi čapmi</option><option value="spring-arm">Pružina na ramene</option></select></label>${quantityInput('length', 'Dĺžka (mm)', 120, 'mm', 5, 1000)}${quantityInput('width', 'Šírka / vozík (mm)', 25, 'mm', 5, 1000)}<label class="check-row"><input name="drive" type="checkbox"${state.project.elements.some((e) => e.drive) ? ' disabled' : ''}/>Priradiť zostave pohon (kulisa ostáva pasívna)</label><p class="section-description">Zostava obsahuje skutočné väzby a označené montážne body. Vonkajšie pripojenia doplňte na plátne. Vloženie možno vrátiť jedným Späť.</p><div class="modal-actions"><button class="button button-secondary" type="button" data-action="close-modal">Zrušiť</button><button class="button button-dark">Vložiť do stredu pohľadu</button></div></form>`);
  }

  function motionPlanModal() {
    if (state.project.kind === 'custom' && !state.project.elements.some((e) => e.drive)) { toast('Najskôr priraďte pohon. Fázy určujú postupnosť jeho polôh.', true); return; }
    const range = K.driveRange(state.project);
    if (!state.pendingPlanDraft) state.planOptions = { min: range.min, max: range.max, enabled: true };
    const phases = state.pendingPlanDraft || state.project.motionPlan?.phases || [{ name: 'Pohyb', from: range.min, to: range.max, duration: state.cycle || 6, easing: 'smooth' }];
    state.planDraft = K.copy(phases); state.pendingPlanDraft = null;
    modal('Fázy pohybu a dorazy', `<form id="motion-plan-form"><p class="section-description">Fázy riadia jeden existujúci pohon (${range.unit}). Koniec nadväzuje na ďalší začiatok; mechanické väzby určujú pohyb ostatných častí.</p><div id="plan-rows"></div><button type="button" class="button button-secondary" data-action="plan-add">Pridať fázu</button>${quantityInput('min', `Dolný doraz (${range.unit})`, state.planOptions.min, range.unit, range.unit === 'mm' ? 0 : -360, 5000)}${quantityInput('max', `Horný doraz (${range.unit})`, state.planOptions.max, range.unit, .01, 5000)}<label class="check-row"><input name="enabled" type="checkbox"${state.planOptions.enabled ? ' checked' : ''}/>Prehrávať postupnosť fáz</label><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zrušiť</button><button class="button button-dark">Uložiť fázy</button></div></form>`, true);
    renderPlanRows();
  }

  function renderPlanRows() {
    const root = $('#plan-rows'); if (!root) return;
    root.innerHTML = state.planDraft.map((p, i) => `<fieldset class="plan-row"><legend>Fáza ${i + 1}</legend><label>Názov<input name="name-${i}" class="text-field" value="${escape(p.name)}" maxlength="60" required/></label><label>Od<input name="from-${i}" class="text-field" type="number" step="any" value="${p.from}" required/></label><label>Do<input name="to-${i}" class="text-field" type="number" step="any" value="${p.to}" required/></label><label>Čas (s)<input name="duration-${i}" class="text-field" type="number" min=".1" max="120" step="any" value="${p.duration}" required/></label><label>Priebeh<select name="easing-${i}" class="property-select"><option value="linear"${p.easing === 'linear' ? ' selected' : ''}>Lineárny</option><option value="smooth"${p.easing === 'smooth' ? ' selected' : ''}>Plynulý</option></select></label><div><button type="button" class="button button-secondary" data-action="plan-capture" data-index="${i}" data-end="from">Od = aktuálna poloha</button><button type="button" class="button button-secondary" data-action="plan-capture" data-index="${i}" data-end="to">Do = aktuálna poloha</button><button type="button" class="button button-secondary" data-action="plan-pick" data-index="${i}" data-end="to">Koniec vybrať na plátne</button><button type="button" class="button button-secondary" data-action="plan-remove" data-index="${i}">Odstrániť fázu</button></div></fieldset>`).join('');
  }

  function readPlanDraft() {
    const data = new FormData($('#motion-plan-form'));
    state.planOptions = { min: String(data.get('min')), max: String(data.get('max')), enabled: data.has('enabled') };
    state.planDraft = state.planDraft.map((p, i) => ({ name: String(data.get(`name-${i}`)), from: Number(data.get(`from-${i}`)), to: Number(data.get(`to-${i}`)), duration: Number(data.get(`duration-${i}`)), easing: String(data.get(`easing-${i}`)) }));
  }

  function reviewImpact(next, message, keys = null, title = 'Dôsledky úpravy') {
    const impact = WF.impact(state.project, next, state.result);
    state.pendingImpact = { before: JSON.stringify(state.project), next, message, keys, result: K.copy(state.result) };
    const list = (items) => items.length ? `<ul>${items.map((v) => `<li>${escape(v.name || v.id)}</li>`).join('')}</ul>` : '<p>Žiadne</p>';
    modal(title, `<form id="impact-form"><p class="section-description">Model sa zmení až po potvrdení. Celú operáciu možno vrátiť jedným Späť.</p><div class="impact-grid"><section><h3>Odstránené prvky · ${impact.elements.length}</h3>${list(impact.elements)}<h3>Zmenené uloženie / prvky · ${impact.changed.length}</h3>${list(impact.changed)}</section><section><h3>Dotknuté väzby · ${impact.joints.length}</h3>${list(impact.joints)}<p>Odstránené kóty: ${impact.dimensions.length} · trajektórie: ${impact.trajectories.length}</p>${state.project.motionPlan && !next.motionPlan ? '<p class="analysis-warning">Odstránia sa fázy závislé od pôvodného pohonu.</p>' : ''}${impact.driverLost ? '<p class="analysis-warning">Odstráni sa aj priradený pohon.</p>' : ''}</section></div><label class="check-row"><input name="keep-pose" type="checkbox" checked/>Zachovať zobrazenú polohu ako východisko zostávajúcich telies</label><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zrušiť</button><button class="button button-dark">Potvrdiť úpravu</button></div></form>`, true);
    $('#modal').querySelector?.('#impact-form .button-dark')?.focus({ preventScroll: true });
  }

  async function addMagicPose(file) {
    const magic = state.magic; if (!magic || !magic.image || magic.busy) return;
    if ((magic.poses || []).length >= 3) throw new Error('Použite najviac štyri polohy vrátane prvého obrázka.');
    magic.busy = true; renderMagicImport();
    try { const image = await M.loadImage(file); if (state.magic !== magic) { URL.revokeObjectURL(image.url); return; } magic.poses ||= []; magic.poses.push({ image, alignment: null, candidates: [] }); magic.poseIndex = magic.poses.length - 1; magic.detectNote = 'Nová poloha potrebuje zarovnanie podľa rovnakého pevného úseku.'; }
    finally { if (state.magic === magic) { magic.busy = false; renderMagicImport(); } }
    magicPoseAlignment();
  }

  function magicPoseAlignment() {
    const magic = state.magic, frame = magic?.poses?.[magic.poseIndex || 0]; if (!frame || !magic.scale) { toast('Najskôr nastavte mierku prvého obrázka.', true); return; }
    const f = frame.image, b = magic.image, a = frame.alignment?.a || { x: magic.scale.a.x * f.width / b.width, y: magic.scale.a.y * f.height / b.height }, end = frame.alignment?.b || { x: magic.scale.b.x * f.width / b.width, y: magic.scale.b.y * f.height / b.height };
    modal('Zarovnať ďalšiu polohu', `<form id="pose-alignment-form"><p class="section-description">Na ďalšom obrázku vyberte rovnaké body A a B pevného úseku použitého pri kalibrácii. Kliknutia na obrázok postupne doplnia A/B. Ak je kalibračný úsek pohyblivý, viacpolohové porovnanie nebude platné.</p><img class="pose-alignment-image" src="${escape(f.url)}" data-action="pose-pick" data-width="${f.width}" data-height="${f.height}" alt="${escape(f.name)}"/><div class="plan-row">${[['ax', a.x], ['ay', a.y], ['bx', end.x], ['by', end.y]].map(([name, value]) => `<label>${name.toUpperCase()} (px)<input name="${name}" class="text-field" type="number" min="0" step="any" max="${name.endsWith('x') ? f.width : f.height}" value="${value}" required/></label>`).join('')}</div><div class="modal-actions"><button class="button button-secondary" type="button" data-action="close-modal">Zrušiť</button><button class="button button-dark">Potvrdiť pevný úsek</button></div></form>`, true);
    magic.posePick = 0;
  }

  function pushDetectionHistory() {
    const magic = state.magic; magic.detectHistory ||= []; magic.detectFuture = []; magic.detectHistory.push(K.copy(magic.detectCandidates || [])); if (magic.detectHistory.length > 40) magic.detectHistory.shift();
  }

  function undoDetection(redo = false) {
    const m = state.magic; if (!m || m.step !== 2.5) return;
    const list = redo ? m.detectFuture : m.detectHistory; if (!list?.length) return;
    (redo ? (m.detectHistory ||= []) : (m.detectFuture ||= [])).push(K.copy(m.detectCandidates || [])); m.detectCandidates = list.pop(); m.error = ''; renderMagicImport(); renderScene();
  }

  function editDetection(el) {
    const m = state.magic; if (!m || m.busy || m.detectAdded?.some((id) => state.project.elements.some((e) => e.id === id))) return;
    m.detectEditId = el.dataset.id; m.tool = el.dataset.tool || 'detect-edit'; m.drawing = []; renderMagicImport(); renderScene();
  }

  function commitDetectionOutline() {
    const m = state.magic; if (!m || m.drawing.length < 3) throw new Error('Obrys potrebuje aspoň tri body.');
    if ((m.detectCandidates || []).length >= 60) throw new Error('Najviac 60 návrhov. Odstráňte nepotrebné návrhy.');
    const c = WF.candidate(m.drawing, 'panel'); pushDetectionHistory(); m.detectCandidates.push(c); m.detectEditId = c.id; m.tool = 'detect-edit'; m.drawing = []; renderMagicImport(); renderScene();
  }

  function detectionEditSVG(scale) {
    const m = state.magic; if (!m || m.step !== 2.5 || !m.scale) return '';
    const c = m.detectCandidates?.find((v) => v.id === m.detectEditId), handles = [];
    if (c && m.tool === 'detect-edit') for (const kind of ['points', 'outline', 'anchors']) (c[kind] || []).forEach((p, i) => { const at = M.worldFromPixel(p, m.scale); handles.push(`<circle data-detect-handle="${kind}" data-index="${i}" data-id="${escape(c.id)}" cx="${at.x}" cy="${at.y}" r="${5 / scale}" fill="${kind === 'anchors' ? '#16867b' : '#fff'}" stroke="#a64422" stroke-width="2" vector-effect="non-scaling-stroke"/>`); });
    const path = m.drawing?.length ? `<polyline points="${m.drawing.map((p) => { const at = M.worldFromPixel(p, m.scale); return `${at.x},${at.y}`; }).join(' ')}" fill="none" stroke="#16867b" stroke-width="2" vector-effect="non-scaling-stroke"/>` : '';
    return `<g data-editor-overlay="detection-edit">${path}${handles.join('')}</g>`;
  }

  function workflowSubmit(form, data) {
    if(form.id==='magic-detection-review-form'){commitDetectedReview(data);}
    else if(form.id==='reference-calibration-form'){if(state.referenceCalibration?.revision!==JSON.stringify(state.project))throw new Error('Projekt sa zmenil. Kalibráciu otvorte znova.');applyProject(WF.calibrateReference(state.project,{x:quantityValue(data,'ax'),y:quantityValue(data,'ay')},{x:quantityValue(data,'bx'),y:quantityValue(data,'by')},quantityValue(data,'distance','mm',.1,5000),data.has('model')));fitView();renderScene();}
    else if(form.id==='elastic-response-form'){elasticResponseModal({mass:quantityValue(data,'mass','',.001,1000),damping:quantityValue(data,'damping','',0,100000),load:quantityValue(data,'load','',0,1000000)});return true;}
    else if (form.id === 'reference-attach-form') { const draft = state.referenceDraft; if (!draft || draft.projectId !== state.project.id) throw new Error('Projekt sa zmenil. Vyberte obrázok znova.'); const p = K.copy(state.project), width = quantityValue(data, 'width', 'mm', .1, 10000); p.importReference = { kind: 'magic', visible: true, opacity: .35, active: 0, frames: [{ name: draft.name, dataURL: draft.dataURL, rect: { x: quantityValue(data, 'x'), y: quantityValue(data, 'y'), width, height: width * draft.ratio } }] }; applyProject(p); state.referenceDraft = null; fitView(); renderScene(); }
    else if (form.id === 'reference-form') { const p = K.copy(state.project); p.importReference.opacity = Number(data.get('opacity')) / 100; p.importReference.active = Number(data.get('active')); p.importReference.visible = data.has('visible'); const frame = p.importReference.frames[p.importReference.active], ratio = frame.rect.height / frame.rect.width; if (data.has('x')) frame.rect.x = quantityValue(data, 'x'); if (data.has('y')) frame.rect.y = quantityValue(data, 'y'); if (data.has('width')) { frame.rect.width = quantityValue(data, 'width', 'mm', .1, 10000); frame.rect.height = frame.rect.width * ratio; } applyProject(p); }
    else if (form.id === 'kit-form') { if (state.project.kind !== 'custom') throw new Error('Zostavy vkladajte do vlastného projektu alebo voľnej kópie.'); const at = { x: state.view.x + state.view.width / 2, y: state.view.y + state.view.height / 2 }, next = WF.insertKit(state.project, String(data.get('type')), at, W.parseNumber(String(data.get('length'))), W.parseNumber(String(data.get('width'))), data.has('drive')); editCanvas(next.project, 'Zostava bola vložená. Pripojte označené montážne body.', next.added.map(I.elementKey)); }
    else if (form.id === 'motion-plan-form') { const p = K.copy(state.project), range = K.driveRange(p); readPlanDraft(); if (range.unit === 'mm') { p.parameters.travelMin = W.parseNumber(String(data.get('min'))); p.parameters.travelMax = W.parseNumber(String(data.get('max'))); } else { p.parameters.rotationMin = W.parseNumber(String(data.get('min')), '°'); p.parameters.rotationMax = W.parseNumber(String(data.get('max')), '°'); } p.motionPlan = data.has('enabled') && state.planDraft.length ? { unit: range.unit, phases: state.planDraft } : null; applyProject(p); state.planTime = 0; }
    else if (form.id === 'pose-alignment-form') { const m = state.magic, frame = m?.poses[m.poseIndex || 0]; if (!frame) throw new Error('Poloha už nie je dostupná.'); const alignment = { a: { x: Number(data.get('ax')), y: Number(data.get('ay')) }, b: { x: Number(data.get('bx')), y: Number(data.get('by')) } }; if ([alignment.a, alignment.b].some((p) => p.x < 0 || p.y < 0 || p.x > frame.image.width || p.y > frame.image.height)) throw new Error('Body musia ležať na obrázku.'); WF.frameTransform(m.scale, alignment); frame.alignment = alignment; m.detectNote = 'Poloha zarovnaná. Spustite rozpoznanie znova pre porovnanie.'; renderMagicImport(); }
    else if (form.id === 'impact-form') { const pending = state.pendingImpact; if (!pending || pending.before !== JSON.stringify(state.project)) throw new Error('Model sa zmenil. Náhľad vytvorte znova.'); const next = data.has('keep-pose') ? WF.keepPose(pending.next, pending.result, { design: true }) : pending.next; editCanvas(next, pending.message, pending.keys); state.pendingImpact = null; }
    else return false;
    $('#modal').close(); return true;
  }

  function magicImageSVG() {
    const magic = state.magic;
    if (!magic?.image || magic.step >= 3 && !magic.showImage) return '';
    const rect = M.imageRect(magic.image, magic.step <= 2 ? null : magic.scale);
    return `<g data-editor-overlay="magic-reference" pointer-events="none"><rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" fill="#fff"/><image id="magic-reference-image" href="${escape(magic.image.url)}" x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" opacity="${magic.step <= 2 ? 1 : magic.opacity}" preserveAspectRatio="none"/><rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" fill="none" stroke="var(--border)" stroke-width="1" vector-effect="non-scaling-stroke"/></g>`;
  }

  function renderMagicReference() {
    const magic = state.magic, svg = $('#mechanism-canvas'), view = state.view;
    if (!magic || !view) return;
    const scale = Math.hypot(svg.getScreenCTM()?.a || 1, svg.getScreenCTM()?.b || 0);
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
    svg.classList.toggle('pan-mode', state.tool === 'pan');
    svg.classList.toggle('magic-point-mode', magic.step === 2);
    let content = `<rect x="${view.x}" y="${view.y}" width="${view.width}" height="${view.height}" fill="var(--canvas)"/>${magicImageSVG()}`;
    if (!magic.image) content += `<text x="${view.x + view.width / 2}" y="${view.y + view.height / 2}" text-anchor="middle" fill="var(--secondary)" font-size="${14 / scale}">Nahrajte obrázok tlačidlom Magic import</text>`;
    if (magic.step === 2 && magic.points.length) {
      const a = magic.points[0], b = magic.points[1];
      content += '<g data-editor-overlay="magic-calibration" pointer-events="none">';
      if (b) content += `${line(a, b, 'stroke="#a64422" stroke-width="2" vector-effect="non-scaling-stroke" stroke-dasharray="6 3"')}<text x="${(a.x + b.x) / 2}" y="${(a.y + b.y) / 2 - 13 / scale}" text-anchor="middle" fill="#a64422" stroke="#fff" stroke-width="${3 / scale}" paint-order="stroke" font-size="${12 / scale}">${magic.scale ? `${fmt(magic.scale.distance, 2)} mm` : `${fmt(K.distance(a, b), 2)} px`}</text>`;
      magic.points.forEach((p, i) => { content += `<circle cx="${p.x}" cy="${p.y}" r="${7 / scale}" fill="#fff" stroke="#a64422" stroke-width="2" vector-effect="non-scaling-stroke"/><text x="${p.x + 12 / scale}" y="${p.y - 12 / scale}" fill="#a64422" stroke="#fff" stroke-width="${3 / scale}" paint-order="stroke" font-size="${12 / scale}">${i ? 'B' : 'A'}</text>`; });
      content += '</g>';
    }
    svg.innerHTML = content; latestSVG = content;
    $('#zoom-value').textContent = `${Math.round(state.baseView.width / view.width * 100)}%`;
    $('#selection-summary').hidden = true; $('#manipulation-tools').hidden = true; $('#diagnostics-panel').hidden = true;
  }

  function magicDrawingSVG(scale) {
    const magic = state.magic;
    if (!magicWorking() || !magic.drawing.length) return '';
    const points = [...magic.drawing, ...(magic.preview ? [magic.preview] : [])];
    return `<g data-editor-overlay="magic-drawing" pointer-events="none"><polyline points="${points.map((p) => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="#a64422" stroke-width="2" stroke-dasharray="5 3" vector-effect="non-scaling-stroke"/>${magic.drawing.map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="${5 / scale}" fill="#fff" stroke="#a64422" stroke-width="2" vector-effect="non-scaling-stroke"/><text x="${p.x + 9 / scale}" y="${p.y - 9 / scale}" fill="#a64422" stroke="#fff" stroke-width="${3 / scale}" paint-order="stroke" font-size="${11 / scale}">${i + 1}</text>`).join('')}${points.length === 2 ? `<text x="${(points[0].x + points[1].x) / 2}" y="${(points[0].y + points[1].y) / 2 - 12 / scale}" fill="#a64422" stroke="#fff" stroke-width="${3 / scale}" paint-order="stroke" font-size="${11 / scale}">${fmt(K.distance(points[0], points[1]), 2)} mm</text>` : ''}</g>`;
  }

  function magicWorking() {
    return !!state.magic && [3, 4].includes(state.magic.step);
  }

  function magicActionAllowed(action) {
    if (!state.magic || action.startsWith('magic-') || action.startsWith('detect-') || action === 'pose-pick') return true;
    if (['help', 'close-modal', 'fit', 'zoom-in', 'zoom-out', 'tool-pan', 'toggle-sidebar', 'close-inspector'].includes(action)) return true;
    if (!magicWorking()) return false;
    return ['undo', 'redo', 'tool-select', 'tool-connect', 'tool-measure', 'smart-snap', 'grid-snap', 'angle-snap', 'mobile-tools', 'mobile-selection', 'mobile-handles', 'properties-overview', 'open-full-properties', 'construction', 'element-limits', 'connection-type', 'selection-settings', 'selection-connect', 'selection-support', 'selection-rail', 'selection-motor', 'snap-connect', 'snap-preview', 'snap-position', 'placement-mount', 'placement-cancel', 'check-model', 'grid', 'dimensions', 'select', 'visibility', 'sidebar-elements', 'sidebar-joints', 'toggle-inspector', 'inspector-geometry', 'inspector-joints', 'new-joint', 'edit-joint', 'delete-joint', 'new-dimension', 'edit-dimension', 'dimension-pick', 'delete-dimension', 'edit-numbers', 'edit-rotation', 'edit-pivot', 'edit-length', 'edit-thickness', 'add-menu', 'add-component', 'duplicate', 'delete', 'confirm-canvas-delete', 'canvas-add-guide', 'lock-selected', 'drive-selected', 'element-menu', 'edit-outline', 'edit-path', 'edit-com'].includes(action);
  }

  function startMagicImport() {
    if (state.magic) return;
    automaticVersion();
    if (state.drag) onPointerUp({ pointerId: state.drag.pointerId, cancelled: true });
    closeContextMenu(); $('#modal').close(); clearTimeout(autosaveTimer);
    state.playing = false;
    const original = { ...state, magic: null }, project = K.preset('custom');
    if (project.id === original.project.id) project.id = K.uid();
    project.name = 'Schéma z obrázka';
    state.magic = { original, step: 1, image: null, scale: null, scaleAxis: 'horizontal', points: [], drawing: [], preview: null, tool: 'select', memberType: 'link', width: 10, opacity: .65, showImage: true, name: project.name, distanceInput: '300', busy: false, imageToken: 0, geometryStarted: false, placementType: null, error: '', resetApproved: false, storageError: '', backupAcknowledged: false, historyScales: [], futureScales: [] };
    state.sidebarTab = 'elements'; state.diagnosticsOpen = false;
    loadProject(project, { workspace: { ...X.preferences(original), mode: 'edit', grid: false, snap: false, ghosts: false, trace: false, dimensions: false } }, true);
    renderMagicImport();
    $('#magic-title').focus({ preventScroll: true });
  }

  function renderMagicImport() {
    const magic = state.magic, root = $('#magic-wizard'), reviewScroll = root.querySelector?.('.magic-detection-review')?.scrollTop || 0;
    root.hidden = !magic; renderWorkflowTools();
    $('[data-action="magic-import"]')?.setAttribute('aria-expanded', !!magic);
    $('#app').classList.toggle('magic-active', !!magic);
    $('#workspace').dataset.magicStep = magic?.step || '';
    for (const button of $('#app').querySelectorAll('[data-action]')) {
      if (['undo', 'redo'].includes(button.dataset.action)) continue;
      const denied = !!magic && !magicActionAllowed(button.dataset.action);
      if (denied) {
        if (!Object.hasOwn(button.dataset, 'magicDisabled')) button.dataset.magicDisabled = String(button.disabled);
        button.disabled = true;
      } else if (Object.hasOwn(button.dataset, 'magicDisabled')) {
        button.disabled = button.dataset.magicDisabled === 'true'; delete button.dataset.magicDisabled;
      }
    }
    for (const card of $('#app').querySelectorAll('[data-component]')) { card.disabled = !!magic && magic.step !== 4; card.draggable = !card.disabled; }
    if (!magic) { root.innerHTML = ''; return; }
    const step = magic.step;
    const description = step === 2.5 ? 'Voliteľná lokálna detekcia obrysov, oblastí oddelených hranami, spojitých dráh a kruhových montážnych bodov. Farba neurčuje druh ani funkciu súčiastky. Skontrolujte návrh, zmeňte typy a vyberte, čo vložiť; nejasné a rozvetvené tvary sa nepredvyberajú. Fotografie a prekrývajúce sa čiary môžu vyžadovať ručné opravy.' : ['Nahrajte vlastný náčrt. Obrázok zostáva lokálne v tomto prehliadači.', 'Vyberte začiatok a koniec známeho rozmeru. Zadajte jedinú hodnotu v mm, napríklad X = 300; mierka X aj Y sa prepočíta spoločne. Bod A je začiatok súradníc.', 'Obkreslite pevný rám, podlahu alebo pevné body. Dokončené časti sú v simulácii nepohyblivé.', 'Pretiahnite prvok z knižnice na obrázok, alebo vyberte jeho typ a potom kliknite na plátno. Úchyty upravia jeho geometriu.', 'Skontrolujte schému. Finish vytvorí samostatný projekt so zmenšenou predlohou; jej viditeľnosť prepnete tlačidlom Predloha.'][step - 1];
    let controls = '';
    if (step === 1) controls = `<div class="magic-upload"><button class="button button-dark" data-action="magic-upload"${magic.busy ? ' disabled' : ''}>${icon('import', 16)}${magic.busy ? 'Načítava sa…' : magic.image ? 'Vybrať iný obrázok…' : 'Nahrať obrázok…'}</button><span>${magic.image ? `${escape(magic.image.name)} · ${magic.image.width} × ${magic.image.height} px` : 'PNG / JPG / neanimovaný WebP · do 10 MB · najviac 16 Mpx'}</span><small>Obrázok môžete aj pustiť sem. Zostáva lokálne, bez odosielania na server.</small></div>`;
    if (step === 2) {
      const a = magic.points[0], b = magic.points[1], pixelField = (name, label, value, max) => `<label class="magic-field"><span>${label}</span><input class="text-field" name="${name}" data-magic-setting="pixel" type="number" min="0" max="${max}" step="any" value="${value ?? ''}" required/></label>`;
      controls = `<form id="magic-scale-form"><div class="magic-known-size"><label class="magic-field"><span>Známy rozmer vybraného úseku</span><select class="property-select" name="axis" data-magic-setting="scale-axis">${[['horizontal', 'X · vodorovná dĺžka'], ['vertical', 'Y · zvislá výška'], ['distance', 'Dĺžka spojnice A–B']].map(([value, title]) => `<option value="${value}"${(magic.scaleAxis || 'distance') === value ? ' selected' : ''}>${title}</option>`).join('')}</select></label><label class="magic-field"><span>Skutočná hodnota (mm)</span><input class="text-field" name="distance" data-magic-setting="distance" type="number" min=".1" max="5000" step="any" value="${escape(magic.distanceInput)}" required/></label><output id="magic-scale-preview" class="magic-scale-result" aria-live="polite">${magicScalePreview()}</output><button type="button" class="button button-secondary" data-action="magic-reset-points">Vybrať body znova</button></div><details class="magic-pixel-details"><summary>Kalibračné body v pixeloch (nie rozmery v mm)</summary><div class="magic-calibration-fields">${pixelField('ax', 'A · X (px)', a?.x, magic.image.width)}${pixelField('ay', 'A · Y (px)', a?.y, magic.image.height)}${pixelField('bx', 'B · X (px)', b?.x, magic.image.width)}${pixelField('by', 'B · Y (px)', b?.y, magic.image.height)}</div></details><p class="magic-note">X a Y používajú rovnakú mierku, pomer strán sa zachová. ${magic.geometryStarted ? 'Zmenu už vytvorenej geometrie najskôr potvrdíte; rám, členy, kóty aj väzby sa prepočítajú spolu. Prepočet možno vrátiť cez Späť.' : 'Vyberte čo najdlhší známy úsek.'} Jedna mierka neodstráni perspektívu fotografie.</p><button class="magic-hidden-submit" type="submit" tabindex="-1" aria-hidden="true">Použiť mierku</button></form>`;
    }
    if(step===2&&!magic.geometryStarted&&window.KinmoAdvanced)controls+='<button class="button button-secondary" data-action="magic-perspective">Vyrovnať perspektívu · 4 rohy</button>';
    if (step === 2) controls += `<label class="check-row"><input type="checkbox" data-magic-setting="auto-detect"${magic.detectEnabled ? ' checked' : ''}/><span>Aktivovať krok 2.5 · automaticky navrhnúť prvky z obrázka</span></label>`;
    if (step === 2.5) {
      const candidates = magic.detectCandidates || [], applied = magic.detectAdded?.some((id) => state.project.elements.some((e) => e.id === id));
      controls = `<div class="magic-detection-actions"><button class="button button-secondary" data-action="magic-detection-region"${magic.busy || applied ? ' disabled' : ''}>Vybrať oblasť · 2 rohy</button><button class="button button-secondary" data-action="magic-detection-whole"${magic.busy || applied ? ' disabled' : ''}>Celý obrázok</button><span class="magic-note">${magic.detectRegion ? `Oblasť ${magic.detectRegion.width} × ${magic.detectRegion.height} px` : 'Celý obrázok · pri viacerých polohách vyberte iba jednu'}</span><button class="button button-dark" data-action="magic-detect"${magic.busy || applied ? ' disabled' : ''}>${magic.busy ? 'Rozpoznáva sa…' : 'Rozpoznať prvky'}</button>${magic.busy ? '<button class="button button-secondary" data-action="magic-stop-detection">Zrušiť detekciu</button>' : ''}<label class="magic-opacity">Citlivosť <input type="range" min="10" max="90" value="${magic.detectSensitivity ?? 50}" data-magic-setting="detect-sensitivity"${magic.busy || applied ? ' disabled' : ''}/></label><button class="button button-secondary" data-action="magic-skip-detection"${magic.busy ? ' disabled' : ''}>Pokračovať ručne</button></div><p class="magic-note" role="status">${magic.detectNote ? escape(magic.detectNote) : 'Spustite detekciu. Návrh nevytvára pohon a neoveruje funkciu mechanizmu.'}${applied ? ' Návrh už bol vložený. Vrátiť ho môžete cez Späť v kroku 3.' : ''}</p>${candidates.length ? `<fieldset class="magic-detection-review"${magic.busy || applied ? ' disabled' : ''}><legend>Rozpoznané prvky · ${candidates.length}</legend>${candidates.map((c, index) => `<div class="magic-detection-row${c.confidence<.75 || !c.motionEvidence || c.motionEvidence.kind==='uncertain' ? ' is-uncertain' : ''}"><label class="check-row"><input type="checkbox" data-magic-setting="detect-selected" data-detection="${c.id}"${c.selected ? ' checked' : ''}/><span>${index + 1}</span></label><select class="property-select" aria-label="Typ návrhu ${index + 1}" data-magic-setting="detect-type" data-detection="${c.id}">${(c.points.length === 1 ? ['bearing', 'node'] : ['ground', 'link', 'panel', 'rail', 'slot']).map((type) => `<option value="${type}"${c.type === type ? ' selected' : ''}>${escape(typeNames[type])}</option>`).join('')}</select><span>${c.evidence?.manual ? 'Ručne upravený tvar' : `Tvar ${Math.round(c.confidence * 100)} % · odhad`} · ${c.motionEvidence ? ({ fixed: 'pevná časť · odhad', translation: 'posuvná väzba · odhad', rotation: 'otočná väzba · odhad', uncertain: 'nejasný pohyb' })[c.motionEvidence.kind] + ` (${c.motionEvidence.matches}/${c.motionEvidence.total} polôh)` : 'pohyb neoverený'}${c.evidence?.closedRegion ? ' · oblasť' : ''}</span><button class="button button-secondary" data-action="detect-edit" data-id="${escape(c.id)}">Upraviť</button>${c.motionEvidence?.kind === 'fixed' && c.points.length > 1 ? `<button class="button button-secondary" data-action="detect-fixed" data-id="${escape(c.id)}">Použiť odhad pevnej časti</button>` : ''}${c.points.length > 1 ? `<button class="button button-secondary" data-action="detect-edit" data-tool="detect-anchor" data-id="${escape(c.id)}">Pridať čap</button><button class="button button-secondary" data-action="detect-edit" data-tool="detect-split" data-id="${escape(c.id)}">Rozdeliť</button>` : `<button class="button button-secondary" data-action="detect-hole" data-role="hole" data-id="${escape(c.id)}">Otvor na vybranom telese</button><button class="button button-secondary" data-action="detect-hole" data-role="pin" data-id="${escape(c.id)}">Samostatný čap</button>`}<button class="button button-secondary" data-action="detect-delete" data-id="${escape(c.id)}">Odstrániť návrh</button>${c.anchors?.length && ['ground', 'link', 'panel'].includes(c.type) ? `<label class="check-row magic-detection-mounts"><input type="checkbox" data-magic-setting="detect-anchors" data-detection="${c.id}"${c.useAnchors !== false ? ' checked' : ''}/><span>Použiť montážne body · ${c.anchors.length} (overiť na obrázku)</span></label>` : ''}</div>`).join('')}<label class="check-row"><input type="checkbox" data-magic-setting="detect-joints"${magic.detectJoints !== false ? ' checked' : ''}/><span>Navrhnúť otočné väzby pri zhodných montážnych bodoch alebo koncoch (treba overiť)</span></label></fieldset><button class="button button-secondary" data-action="magic-apply-detection"${magic.busy || applied || !candidates.some((c) => c.selected) ? ' disabled' : ''}>Pridať vybrané prvky a pokračovať</button>` : ''}`;
    }
    if(step===2.5&&window.KinmoAdvanced)controls+=`<div class="motion-evidence">${window.KinmoAdvanced.motionGroups(magic.detectCandidates||[]).map((g,i)=>`<p>${g.ids.length} časti · istota ${Math.round(g.confidence*100)} % · ${escape(g.reason)} <button data-action="detect-motion-group" data-index="${i}">Navrhnúť spoločné teleso (vonkajší obal)</button></p>`).join('')}${(magic.detectCandidates||[]).filter(c=>c.motionEvidence).map(c=>{const proof=window.KinmoAdvanced.evidence(c);return `<p>${escape(proof.reason)} · istota ${Math.round(proof.confidence*100)} % <button data-action="detect-motion-confirm" data-id="${escape(c.id)}"${proof.confidence<.5?' disabled':''}>${c.confirmedMotion?'Potvrdené':'Použiť návrh uloženia'}</button></p>`;}).join('')}</div>`;
    if (step === 3 || step === 4) {
      const tools = step === 3 ? [['ground-line', 'Pevná úsečka / podlaha'], ['ground-outline', 'Obrys rámu'], ['fixed-point', 'Pevný bod'], ['select', 'Vybrať / upraviť']] : [['select', 'Vybrať / úchyty'], ['member', 'Obkresliť člen']];
      controls = `<div class="magic-draw-controls"><div class="magic-tool-buttons">${tools.map(([tool, title]) => `<button class="button button-secondary${magic.tool === tool ? ' is-active' : ''}" data-action="magic-tool" data-tool="${tool}" aria-pressed="${magic.tool === tool}">${title}</button>`).join('')}${step === 4 ? '<button class="button button-secondary" data-action="tool-connect">Spojiť uzly (J)</button><button class="button button-secondary" data-action="new-joint">Typ / nová väzba…</button><button class="button button-secondary" data-action="magic-motor">Pohon…</button>' : ''}</div><div class="magic-draw-options">${step === 4 ? `<label class="magic-field"><span>Obkresľovaný člen</span><select class="property-select" data-magic-setting="member-type">${[['link', 'Rameno / tiahlo'], ['panel', 'Čelo / doska'], ['rail', 'Priame vedenie']].map(([type, title]) => `<option value="${type}"${magic.memberType === type ? ' selected' : ''}>${title}</option>`).join('')}</select></label>` : ''}<label class="magic-field"><span>Hrúbka úsečky / člena (mm)</span><input class="text-field" type="number" min=".1" max="5000" step="any" value="${magic.width}" data-magic-setting="width"/></label>${magic.tool === 'ground-outline' ? `<button class="button button-dark" data-action="magic-close-outline"${magic.drawing.length < 3 ? ' disabled' : ''}>Uzavrieť obrys · ${magic.drawing.length} bodov</button>` : ''}${magic.drawing.length || magic.placementType ? '<button class="button button-secondary" data-action="magic-clear-drawing">Zrušiť rozkreslenie</button>' : ''}<span class="magic-note">${magic.placementType ? `Kliknite na bod vloženia: ${escape(typeNames[magic.placementType])}.` : magic.tool === 'ground-outline' ? 'Klikajte vrcholy. Enter alebo kliknutie pri prvom bode uzavrie obrys; Escape zruší náhľad.' : magic.tool === 'fixed-point' ? 'Kliknutím vložíte samostatný pevný bod.' : ['ground-line', 'member'].includes(magic.tool) ? 'Kliknite na začiatok A a koniec B; dĺžka sa odvodí z mierky obrázka.' : 'Pravý klik ponúka uzly, uloženie, pohon a väzby. Vlastnosti sa otvárajú iba ručne.'}</span></div></div>`;
    }
    if (step === 5) {
      const diagnostic = W.diagnose(state.project, state.result), fixed = state.project.elements.filter((e) => e.locked || e.type === 'ground').length, drivers = state.project.elements.filter((e) => e.drive).length;
      controls = `<form id="magic-finish-form"><div class="magic-review"><label class="magic-field"><span>Názov nového projektu</span><input class="text-field" name="name" data-magic-setting="name" maxlength="80" value="${escape(magic.name)}" required/></label><div class="magic-review-counts"><span>${state.project.elements.length} prvkov</span><span>${fixed} pevných</span><span>${state.project.connections.length} väzieb</span><span>${drivers} pohonov</span><span>${diagnostic.freedom.free} voľných súradníc</span></div><button type="button" class="button button-secondary" data-action="magic-export-draft">Exportovať geometriu .kinmo</button></div>${diagnostic.hints.length ? `<details class="magic-review-hints"><summary>Čo skontrolovať pred simuláciou</summary><ul>${diagnostic.hints.map((hint) => `<li>${escape(hint)}</li>`).join('')}</ul></details>` : ''}<p class="magic-note">Finish dokončí geometriu, nie dôkaz správnej funkcie. Chýbajúci pohon, voľné členy a konfliktné väzby môžete opraviť aj po dokončení.</p>${magic.storageError ? `<p class="magic-error">${escape(magic.storageError)}</p><button type="button" class="button button-secondary" data-action="magic-export-original">Exportovať pôvodný projekt .kinmo</button><label class="check-row"><input name="original-backup" data-magic-setting="backup" type="checkbox"${magic.backupAcknowledged ? ' checked' : ''}/><span>Potvrdzujem, že som pôvodný projekt uložil mimo prehliadača. Dokončiť aj bez lokálneho uloženia.</span></label>` : ''}<button class="magic-hidden-submit" type="submit" tabindex="-1" aria-hidden="true">Finish</button></form>`;
    }
    if ([2, 2.5].includes(step) && magic.image) controls += `<div class="magic-pose-tools"><button class="button button-secondary" data-action="magic-pose-add"${magic.busy || (magic.poses || []).length >= 3 ? ' disabled' : ''}>Pridať ďalšiu polohu</button>${(magic.poses || []).map((p, i) => `<span>${escape(p.image.name)} · ${p.alignment ? 'zarovnaná' : 'zarovnať'} <button class="button button-secondary" data-action="magic-pose-align" data-index="${i}">Zarovnať</button><button class="button button-secondary" data-action="magic-pose-remove" data-index="${i}"${magic.busy ? ' disabled' : ''}>Odstrániť</button></span>`).join('')}</div>`;
    if (step === 2.5 && !magic.busy && !magic.detectAdded?.some((id) => state.project.elements.some((e) => e.id === id))) controls += `<div class="magic-pose-tools"><button class="button button-secondary" data-action="detect-outline">Dokresliť obrys</button><button class="button button-secondary" data-action="detect-merge">Spojiť vybrané fragmenty (vonkajší obal)</button><button class="button button-secondary" data-action="detect-undo">Späť opravu</button><button class="button button-secondary" data-action="detect-redo">Znova opravu</button>${magic.tool === 'detect-outline' ? '<button class="button button-dark" data-action="detect-outline-finish">Dokončiť obrys (Enter)</button>' : ''}<span class="magic-note">Upraviť: ťahajte biele vrcholy alebo zelené čapy. Pridať čap / Rozdeliť: kliknite na miesto v obrázku.</span></div>`;
    const photoOptions = step >= 2.5 ? `<div class="magic-photo-options"><label class="check-row"><input type="checkbox" data-magic-setting="show-image"${magic.showImage ? ' checked' : ''}/><span>Podklad</span></label><label class="magic-opacity">Priehľadnosť <input type="range" min="10" max="100" step="5" value="${Math.round(magic.opacity * 100)}" data-magic-setting="opacity" aria-label="Viditeľnosť obrázka"/></label></div>` : '';
    const steps = M.steps.map((title, index) => ({ title, number: index + 1 }));
    if (magic.detectEnabled) steps.splice(2, 0, { title: 'Autodetekcia', number: 2.5 });
    root.innerHTML = `<div class="magic-heading"><div><h2 id="magic-title" tabindex="-1">Magic import <span>Krok ${String(step).replace('.', ',')} / 5</span></h2><p>${description}</p></div><div class="magic-navigation"><button class="button button-secondary" data-action="magic-back"${step === 1 || magic.busy ? ' disabled' : ''}>Späť</button><button class="button button-dark" data-action="magic-next"${magic.busy || step === 1 && !magic.image || step >= 4 && !state.project.elements.length ? ' disabled' : ''}>${step === 5 ? 'Finish' : 'Ďalej'}${icon('arrow', 14)}</button><button class="button button-secondary" data-action="magic-cancel">Zrušiť</button></div></div><ol class="magic-steps" aria-label="Kroky sprievodcu">${steps.map(({ title, number }) => `<li><button data-action="magic-step" data-step="${number}"${number > step || magic.busy ? ' disabled' : ''}${number === step ? ' aria-current="step"' : ''}><span>${String(number).replace('.', ',')}</span>${title}</button></li>`).join('')}</ol><div id="magic-import-panel" class="magic-controls">${controls}${photoOptions}${magic.error ? `<p class="magic-error" role="alert">${escape(magic.error)}</p>` : ''}</div>`;
    const reviewer = root.querySelector?.('.magic-detection-review'); if (reviewer) reviewer.scrollTop = reviewScroll;
  }

  function setMagicStep(step) {
    const magic = state.magic;
    if (!magic || magic.busy || ![1, 2, 2.5, 3, 4, 5].includes(step) || step === 2.5 && !magic.detectEnabled) return;
    if (magic.drawing.length) { toast('Najskôr dokončite alebo zrušte rozkreslenú časť.', true); return; }
    if (step > 1 && !magic.image || step > 2 && !magic.scale) { toast('Najskôr nahrajte obrázok a potvrďte jeho mierku.', true); return; }
    if (step === 5 && !state.project.elements.length) { toast('Najskôr vložte aspoň jeden prvok.', true); return; }
    if (state.drag) onPointerUp({ pointerId: state.drag.pointerId, cancelled: true });
    magic.step = step; magic.placementType = null; magic.preview = null; magic.error = '';
    $('#modal').close();
    state.pendingJoint = null; state.pendingSnap = null; state.snapPreview = null; state.tool = step === 2 ? 'magic-scale' : 'select';
    magic.tool = 'select';
    if (step === 3) { magic.tool = 'ground-line'; state.tool = 'magic-draw'; }
    state.inspectorOpen = false; state.diagnosticsOpen = false; $('.sidebar').classList.remove('mobile-open');
    fitView(); renderTree(); renderInspector(); renderScene(); updateToolbar();
    $('#magic-title').focus({ preventScroll: true });
  }

  function nextMagicStep() {
    const magic = state.magic;
    if (!magic || magic.busy) return;
    if (magic.step === 2) { $('#magic-scale-form').requestSubmit(); return; }
    if (magic.step === 2.5) {
      if (magic.detectCandidates?.some((c) => c.selected) && !magic.detectAdded?.some((id) => state.project.elements.some((e) => e.id === id))) applyMagicDetection();
      else setMagicStep(3);
      return;
    }
    if (magic.step === 5) { $('#magic-finish-form').requestSubmit(); return; }
    setMagicStep(magic.step + 1);
  }

  function pickMagicImage(confirmed = false) {
    const magic = state.magic;
    if (!magic || magic.step !== 1 || magic.busy) return;
    if (magic.geometryStarted && !confirmed) {
      modal('Nový obrázok a čistá schéma?', '<p class="modal-description">Zmena podkladu začne nové obkresľovanie. Rozpracovaná geometria sa vymaže až po úspešnom načítaní nového obrázka. Pôvodný projekt pred sprievodcom zostáva nedotknutý.</p><div class="modal-actions"><button class="button button-secondary" data-action="close-modal">Ponechať schému</button><button class="button button-dark" data-action="magic-confirm-image">Vybrať nový obrázok…</button></div>');
      return;
    }
    magic.resetApproved = confirmed; $('#modal').close(); $('#magic-image-file').click();
  }

  async function onMagicImage(file) {
    const magic = state.magic;
    if (!file || !magic || magic.step !== 1 || magic.busy) return;
    if (magic.geometryStarted && !magic.resetApproved) { toast('Nový podklad najskôr potvrďte tlačidlom Vybrať iný obrázok.', true); return; }
    const token = ++magic.imageToken;
    magic.busy = true; magic.error = ''; renderMagicImport();
    try {
      const image = await M.loadImage(file);
      if (state.magic !== magic || magic.imageToken !== token) { URL.revokeObjectURL(image.url); return; }
      if (magic.image) URL.revokeObjectURL(magic.image.url);
      for (const pose of magic.poses || []) URL.revokeObjectURL(pose.image.url); magic.poses = []; magic.detectHistory = []; magic.detectFuture = [];
      magic.image = image; magic.scale = null; magic.points = []; magic.drawing = []; magic.geometryStarted = false;
      magic.detectRegion = null; magic.detectRegionPoints = []; magic.detectCandidates = []; magic.detectAdded = []; magic.detectNote = '';
      magic.resetApproved = false; magic.storageError = ''; magic.backupAcknowledged = false;
      const project = K.preset('custom'); project.name = magic.name;
      loadProject(project, { workspace: { ...X.preferences(state), mode: 'edit' } }, true);
      magic.busy = false; setMagicStep(2);
      toast('Obrázok je pripravený. Vyberte dva body známeho rozmeru.');
    } catch (error) {
      if (state.magic === magic) { magic.error = error.message || 'Obrázok sa nepodarilo načítať.'; magic.resetApproved = false; toast(magic.error, true); }
    } finally {
      if (state.magic === magic) { magic.busy = false; renderMagicImport(); }
    }
  }

  function submitMagicScale(data) {
    const magic = state.magic;
    if (!magic || magic.step !== 2 || !magic.image) return;
    for (const key of ['ax', 'ay', 'bx', 'by', 'distance']) if (!String(data.get(key) ?? '').trim()) throw new Error('Vyberte alebo zadajte oba body a známu vzdialenosť.');
    const a = { x: Number(data.get('ax')), y: Number(data.get('ay')) }, b = { x: Number(data.get('bx')), y: Number(data.get('by')) };
    const scale = M.calibration(magic.image, a, b, Number(data.get('distance')), String(data.get('axis') || magic.scaleAxis || 'distance'));
    if (magic.geometryStarted && magic.scale && JSON.stringify(scale) !== JSON.stringify(magic.scale)) {
      M.rescale(state.project, magic.scale, scale);
      magic.pendingScale = scale;
      modal('Prepočítať celú schému?', `<p class="modal-description">Nová mierka ${fmt(scale.mmPerPixel, 6)} mm/px prepočíta všetky členy, pevné body, kóty a dĺžkové väzby v pomere ${fmt(scale.mmPerPixel / magic.scale.mmPerPixel, 4)}×. Uhly, hmotnosti a sily sa nemenia. Pôvodný projekt pred Magic importom zostane nedotknutý.</p><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zrušiť</button><button type="button" class="button button-dark" data-action="magic-confirm-scale">Prepočítať schému</button></div>`);
      return;
    }
    applyMagicScale(scale);
  }

  function magicScalePreview(data = null) {
    const magic = state.magic;
    if (!magic?.image) return 'Vyberte A a B';
    try {
      const a = data ? { x: Number(data.get('ax')), y: Number(data.get('ay')) } : magic.points[0];
      const b = data ? { x: Number(data.get('bx')), y: Number(data.get('by')) } : magic.points[1];
      if (data && ['ax', 'ay', 'bx', 'by'].some((key) => !String(data.get(key) || '').trim())) return 'Vyberte A a B';
      const scale = M.calibration(magic.image, a, b, Number(data ? data.get('distance') : magic.distanceInput), String(data?.get('axis') || magic.scaleAxis || 'distance'));
      return `Úsek: X = ${fmt(Math.abs(b.x - a.x) * scale.mmPerPixel, 2)} mm · Y = ${fmt(Math.abs(b.y - a.y) * scale.mmPerPixel, 2)} mm. Obrázok: ${fmt(magic.image.width * scale.mmPerPixel, 2)} × ${fmt(magic.image.height * scale.mmPerPixel, 2)} mm · ${fmt(scale.mmPerPixel, 6)} mm/px`;
    } catch (error) { return magic.points.length < 2 ? 'Vyberte A a B' : escape(error.message); }
  }

  function applyMagicScale(scale = state.magic?.pendingScale) {
    const magic = state.magic;
    if (!magic || !scale) return;
    if (magic.geometryStarted && magic.scale) {
      const next = M.rescale(state.project, magic.scale, scale), ratio = scale.mmPerPixel / magic.scale.mmPerPixel;
      pushHistory(); state.project = next; magic.width = K.clamp(magic.width * ratio, .1, 5000);
      state.motion *= ratio; state.editPivot = null;
    }
    magic.scale = scale; magic.points = [scale.a, scale.b]; magic.distanceInput = String(scale.distance); magic.scaleAxis = scale.axis;
    magic.pendingScale = null; state.project.controls = null; recalculate();
    setMagicStep(magic.detectEnabled ? 2.5 : 3);
  }

  function selectMagicDetectionRegion(whole = false) {
    const magic = state.magic;
    if (!magic || magic.step !== 2.5 || magic.busy || magic.detectAdded?.some((id) => state.project.elements.some((e) => e.id === id))) return;
    magic.detectRegion = null; magic.detectRegionPoints = []; magic.detectCandidates = []; magic.error = '';
    magic.detectNote = whole ? '' : 'Kliknite na dva protiľahlé rohy oblasti. Pri viacerých polohách vyberte iba jednu a vynechajte legendu.';
    magic.tool = whole ? 'select' : 'detection-region'; state.tool = 'select';
    renderMagicImport(); renderScene();
  }

  async function runMagicDetection(confirmed = false) {
    const magic = state.magic;
    if (!magic || magic.step !== 2.5 || magic.busy || magic.detectAdded?.some((id) => state.project.elements.some((e) => e.id === id))) return;
    if (!confirmed && magic.detectHistory?.length) { modal('Rozpoznať znova a nahradiť opravy?', '<p class="modal-description">Nová detekcia nahradí upravené návrhy a ich históriu opráv. Rozpracovaná mechanická schéma sa nezmení.</p><div class="modal-actions"><button class="button button-secondary" data-action="close-modal">Ponechať opravy</button><button class="button button-dark" data-action="magic-detect-reset">Rozpoznať znova</button></div>'); return; }
    if (magic.tool === 'detection-region') { magic.error = 'Najskôr vyberte dva protiľahlé rohy oblasti alebo zvoľte celý obrázok.'; renderMagicImport(); return; }
    const controller = new AbortController();
    magic.detectController = controller; magic.busy = true; magic.error = '';
    renderMagicImport();
    try {
      const result = await AD.detectImage(magic.image, { signal: controller.signal, sensitivity: magic.detectSensitivity ?? 50, region: magic.detectRegion });
      if (state.magic !== magic || controller.signal.aborted) return;
      const compared = [];
      for (const frame of magic.poses || []) {
        if (!frame.alignment) continue;
        const detected = await AD.detectImage(frame.image, { signal: controller.signal, sensitivity: magic.detectSensitivity ?? 50 });
        if (state.magic !== magic || controller.signal.aborted) return;
        frame.candidates = detected.candidates; compared.push(frame);
      }
      magic.detectCandidates = compared.length ? WF.comparePoses(result.candidates, compared, magic.scale) : result.candidates;
      magic.detectHistory = []; magic.detectFuture = []; magic.detectEditId = null; magic.tool = 'select';
      magic.detectNote = `${result.candidates.length ? `Nájdených ${result.candidates.length} návrhov. ` : 'Nenašli sa vhodné prvky. Pokračujte ručne alebo upravte citlivosť. '}${result.limited ? 'Zobrazený je iba ohraničený počet návrhov. ' : ''}${result.note}${compared.length ? ` Porovnaných ${compared.length + 1} zarovnaných polôh. Pohyb a väzby sú odhady na kontrolu.` : ''}`;
    } catch (error) { if (state.magic === magic) magic.error = controller.signal.aborted ? 'Detekcia bola zrušená; schéma sa nezmenila.' : error.message; }
    finally { if (state.magic === magic) { magic.busy = false; magic.detectController = null; renderMagicImport(); renderScene(); } }
  }

  function applyMagicDetection() {
    const magic = state.magic;
    if (!magic || magic.step !== 2.5 || magic.busy || magic.detectAdded?.some((id) => state.project.elements.some((e) => e.id === id))) return;
    try {
      const result = M.applyDetected(state.project, magic.image, magic.scale, magic.detectCandidates || [], { connections: magic.detectJoints !== false });
      reviewDetectedMechanism(result,magic);
    } catch (error) { magic.error = error.message; renderMagicImport(); toast(error.message, true); }
  }

  function reviewDetectedMechanism(result,magic) {
    const joints=result.project.connections.filter(j=>!state.project.connections.some(old=>old.id===j.id)),pose=K.solve(result.project,K.driveRange(result.project).min,{design:true,collisions:false}),bounds=K.bounds(result.project,[pose]);
    magic.review={...result,joints,revision:JSON.stringify(state.project)};
    const overview=`<section class="detection-overview"><h3>Telesá</h3><ul>${result.added.map(id=>result.project.elements.find(e=>e.id===id)).filter(e=>e&&!['bearing','node'].includes(e.type)).map(e=>`<li>${escape(e.name)} · ${escape(typeNames[e.type])}</li>`).join('')}</ul><h3>Čapy a montážne body</h3><p>${result.added.map(id=>result.project.elements.find(e=>e.id===id)).filter(e=>e&&['bearing','node'].includes(e.type)).length} samostatných čapov / uzlov · ${joints.length} návrhov väzieb (nepotvrdené).</p><h3>Neisté tvary</h3><div>${(magic.detectCandidates||[]).filter(c=>c.selected&&(c.confidence<.75||!c.motionEvidence||c.motionEvidence.kind==='uncertain')).map(c=>`<button type="button" class="button button-secondary" data-action="detect-review-edit" data-id="${escape(c.id)}">Upraviť ${escape(typeNames[c.type])} · ${Math.round(c.confidence*100)} %</button>`).join('')||'<p>Bez tvarov s nízkou istotou; funkciu spoja aj tak overte.</p>'}</div></section>`;
    const preview=`<svg class="detection-review-preview" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}" role="img" aria-label="Rozpoznané telesá a očíslované navrhnuté spoje">${magicImageSVG()}${result.added.map(id=>{const e=result.project.elements.find(e=>e.id===id),p=pose.poses[id];return !p||e.parentId?'':p.outline?.length?`<polygon points="${p.outline.map(p=>p.x+','+p.y).join(' ')}" fill="#e5ecee" fill-opacity=".35" stroke="#708594" vector-effect="non-scaling-stroke"/>`:line(p.a,p.b,'stroke="#708594" stroke-width="5" vector-effect="non-scaling-stroke"');}).join('')}${joints.map((j,i)=>{const a=K.point(pose,j.a),b=K.point(pose,j.b);return `<g>${line(a,b,'stroke="#c64a24" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"')}<circle cx="${a.x}" cy="${a.y}" r="${bounds.width/70}" fill="#fff" stroke="#c64a24"/><text x="${a.x}" y="${a.y+bounds.width/230}" text-anchor="middle" font-size="${bounds.width/60}" fill="#c64a24">${i+1}</text></g>`;}).join('')}</svg>`;
    modal('Obrysy rozpoznané · overte navrhnuté väzby',`<form id="magic-detection-review-form"><p>${result.added.length} prvkov prešlo kontrolou bodov a rozmerov. Tvar obrysu sám neurčuje funkciu spoja. Potvrďte iba spojenia, ktoré poznáte z mechanizmu.</p>${overview}${preview}<div class="detection-joint-review">${joints.map((j,i)=>`<label class="check-row"><input name="joint" type="checkbox" value="${escape(j.id)}"/><span>${i+1}. ${escape(result.project.elements.find(e=>e.id===j.a.elementId)?.name)} ↔ ${escape(result.project.elements.find(e=>e.id===j.b.elementId)?.name)} · neistý otočný spoj</span></label>`).join('')||'<p>Žiadne spojenie sa nenavrhuje automaticky. Obrysy možno vložiť a spojiť ručne.</p>'}</div><p class="section-description">Nepotvrdené väzby sa nevložia. Montážne body upravíte cez zelené čapy v detekcii alebo neskôr na plátne.</p><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Späť k detekcii</button><button class="button button-dark">Vložiť obrysy a potvrdené väzby</button></div></form>`,true);
  }
  function commitDetectedReview(data) {
    const magic=state.magic,review=magic?.review;if(!review||review.revision!==JSON.stringify(state.project))throw new Error('Detekcia alebo projekt sa zmenili. Návrh vytvorte znova.');
    const accepted=new Set(data.getAll('joint')),ids=new Set(review.joints.map(j=>j.id)),next=K.copy(review.project);next.connections=next.connections.filter(j=>!ids.has(j.id)||accepted.has(j.id));
    const validated=K.validateProject(next);pushHistory();state.project=validated;magic.geometryStarted=true;magic.detectAdded=review.added;magic.review=null;state.selectedElementIds=review.added.map(I.elementKey);changed(false);setMagicStep(3);toast('Obrysy a potvrdené väzby boli vložené.');
  }
  function magicDetectionSVG(scale) {
    const magic = state.magic;
    if (!magic || magic.step !== 2.5 || !magic.scale) return '';
    const corners = magic.detectRegion ? [{ x: magic.detectRegion.x, y: magic.detectRegion.y }, { x: magic.detectRegion.x + magic.detectRegion.width, y: magic.detectRegion.y + magic.detectRegion.height }] : magic.detectRegionPoints || [];
    const region = corners.map((p) => M.worldFromPixel(p, magic.scale));
    const boundary = region.length === 2 ? `<rect data-detection-region="true" x="${Math.min(region[0].x, region[1].x)}" y="${Math.min(region[0].y, region[1].y)}" width="${Math.abs(region[1].x - region[0].x)}" height="${Math.abs(region[1].y - region[0].y)}" fill="none" stroke="#a64422" stroke-width="2" stroke-dasharray="8 4" vector-effect="non-scaling-stroke"/>` : region.length === 1 ? `<circle cx="${region[0].x}" cy="${region[0].y}" r="${5 / scale}" fill="#a64422"/>` : '';
    return `<g data-editor-overlay="magic-detection" pointer-events="none">${boundary}${(magic.detectCandidates || []).map((c, index) => {
      const points = c.points.map((p) => M.worldFromPixel(p, magic.scale)), color = c.selected ? '#a64422' : '#78818a';
      const outline = ['ground', 'link', 'panel', 'rail'].includes(c.type) && c.outline?.length ? c.outline.map((p) => M.worldFromPixel(p, magic.scale)) : [];
      const mark = outline.length ? `<polygon points="${outline.map((p) => `${p.x},${p.y}`).join(' ')}" fill="${color}" fill-opacity=".06" stroke="${color}" stroke-width="2" stroke-dasharray="${c.selected ? '6 3' : '2 4'}" vector-effect="non-scaling-stroke"/>` : points.length === 1 ? `<circle cx="${points[0].x}" cy="${points[0].y}" r="${Math.max(5 / scale, c.radius * magic.scale.mmPerPixel)}" fill="none" stroke="${color}" vector-effect="non-scaling-stroke"/>` : `<polyline points="${points.map((p) => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="${c.selected ? '6 3' : '2 4'}" vector-effect="non-scaling-stroke"/>`;
      const mounts = c.useAnchors !== false && ['ground', 'link', 'panel'].includes(c.type) ? (c.anchors || []).map((anchor) => {
        const at = M.worldFromPixel(anchor, magic.scale), radius = Math.max(4 / scale, anchor.radius * magic.scale.mmPerPixel);
        return `<circle data-detection-anchor="true" cx="${at.x}" cy="${at.y}" r="${radius}" fill="#fff" fill-opacity=".5" stroke="${color}" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`;
      }).join('') : '';
      return `${mark}${mounts}<text x="${points[0].x + 8 / scale}" y="${points[0].y - 8 / scale}" font-size="${12 / scale}" fill="${color}" stroke="#fff" stroke-width="${3 / scale}" paint-order="stroke">${index + 1}</text>`;
    }).join('')}</g>`;
  }

  function selectMagicTool(tool, placement = null) {
    const magic = state.magic;
    if (!magicWorking()) return;
    const allowed = magic.step === 3 ? ['ground-line', 'ground-outline', 'fixed-point', 'select'] : ['member', 'select', 'place'];
    if (!allowed.includes(tool) || tool === 'place' && !K.TYPES.includes(placement)) return;
    if (state.drag) onPointerUp({ pointerId: state.drag.pointerId, cancelled: true });
    closeContextMenu(); magic.tool = tool; magic.placementType = placement; magic.drawing = []; magic.preview = null;
    state.pendingJoint = null; state.tool = tool === 'select' ? 'select' : 'magic-draw';
    $('.sidebar').classList.remove('mobile-open');
    renderMagicImport(); updateToolbar(); renderScene();
  }

  function clearMagicDrawing() {
    if (!state.magic) return;
    state.magic.drawing = []; state.magic.preview = null; state.magic.placementType = null;
    state.magic.error = ''; state.magic.tool = 'select'; state.tool = state.magic.step === 2 ? 'magic-scale' : 'select';
    renderMagicImport(); renderScene(); updateToolbar();
  }

  function commitMagicDrawing() {
    const magic = state.magic;
    if (!magicWorking() || !magic.drawing.length) return;
    const type = magic.tool === 'member' ? magic.memberType : magic.tool === 'fixed-point' ? 'node' : 'ground';
    if (magic.tool === 'ground-outline' && magic.drawing.length < 3) throw new Error('Obrys rámu potrebuje aspoň tri vrcholy.');
    const next = M.traceBody(state.project, type, magic.drawing, magic.width), e = next.elements.at(-1);
    magic.drawing = []; magic.preview = null; magic.error = '';
    editCanvas(next, 'Obkreslená časť bola vložená v milimetroch.', [type === 'node' ? I.nodeKey({ elementId: e.id, point: 'a' }) : I.elementKey(e.id)]);
  }

  function magicPointer(point) {
    const magic = state.magic;
    if (!magic) return false;
    if (magic.step === 2.5 && ['detect-outline', 'detect-anchor', 'detect-split', 'detect-edit'].includes(magic.tool) && !magic.busy) {
      const pixel = M.pixelFromWorld(point, magic.scale); if (pixel.x < 0 || pixel.y < 0 || pixel.x > magic.image.width || pixel.y > magic.image.height) return true;
      try {
        if (magic.tool === 'detect-outline') { if (magic.drawing.length >= 64) throw new Error('Najviac 64 vrcholov.'); magic.drawing.push(pixel); }
        if (magic.tool === 'detect-anchor') { const c = magic.detectCandidates.find((c) => c.id === magic.detectEditId); if (!c) return true; if ((c.anchors || []).length >= 24) throw new Error('Najviac 24 montážnych bodov.'); pushDetectionHistory(); c.anchors ||= []; c.anchors.push({ ...pixel, radius: 4 }); c.useAnchors = true; c.evidence.manual = true; magic.tool = 'detect-edit'; }
        if (magic.tool === 'detect-split') { if (magic.detectCandidates.length >= 60) throw new Error('Najviac 60 návrhov.'); const next = WF.splitCandidate(magic.detectCandidates, magic.detectEditId, pixel); pushDetectionHistory(); magic.detectCandidates = next; magic.detectEditId = next.at(-1).id; magic.tool = 'detect-edit'; }
        renderMagicImport(); renderScene();
      } catch (error) { toast(error.message, true); }
      return true;
    }
    if (magic.step === 2.5 && magic.tool === 'detection-region' && !magic.busy) {
      const pixel = M.pixelFromWorld(point, magic.scale);
      if (!Number.isFinite(pixel.x) || !Number.isFinite(pixel.y) || pixel.x < 0 || pixel.y < 0 || pixel.x > magic.image.width || pixel.y > magic.image.height) { toast('Roh oblasti musí ležať na obrázku.', true); return true; }
      magic.detectRegionPoints ||= [];
      const a = magic.detectRegionPoints[0];
      if (!a) magic.detectRegionPoints.push(pixel);
      else {
        const x = Math.floor(Math.min(a.x, pixel.x)), y = Math.floor(Math.min(a.y, pixel.y));
        const width = Math.ceil(Math.max(a.x, pixel.x)) - x, height = Math.ceil(Math.max(a.y, pixel.y)) - y;
        if (width < 5 || height < 5) { toast('Vyberte oblasť aspoň 5 × 5 px.', true); return true; }
        magic.detectRegion = { x, y, width, height }; magic.detectRegionPoints = []; magic.tool = 'select';
      }
      magic.error = ''; renderMagicImport(); renderScene(); return true;
    }
    if ([1, 2.5, 5].includes(magic.step)) return true;
    if (magic.step === 2) {
      if (point.x < 0 || point.y < 0 || point.x > magic.image.width || point.y > magic.image.height) { toast('Kalibračný bod musí ležať na obrázku.', true); return true; }
      if (magic.points.length === 2) magic.points = [];
      magic.points.push({ x: point.x, y: point.y }); if (!magic.geometryStarted) magic.scale = null; magic.error = '';
      renderMagicImport(); renderMagicReference(); return true;
    }
    if (state.tool !== 'magic-draw') return false;
    try {
      if (magic.placementType) {
        const type = magic.placementType; magic.placementType = null; magic.tool = 'select'; state.tool = 'select';
        addElement(type, point); renderMagicImport(); updateToolbar(); return true;
      }
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || Math.abs(point.x) > 5000 || Math.abs(point.y) > 5000) throw new Error('Kreslite v rozsahu editora ±5000 mm.');
      const scale = Math.hypot($('#mechanism-canvas').getScreenCTM()?.a || 1, $('#mechanism-canvas').getScreenCTM()?.b || 0);
      if (magic.tool === 'ground-outline' && magic.drawing.length >= 3 && K.distance(point, magic.drawing[0]) <= 9 / scale) { commitMagicDrawing(); return true; }
      if (magic.drawing.length >= M.limits.vertices) throw new Error('Obrys má najviac 64 vrcholov. Uzavrite ho alebo zrušte rozkreslenie.');
      magic.drawing.push(snapDrawingPoint(point));
      if (magic.tool === 'fixed-point' || magic.tool !== 'ground-outline' && magic.drawing.length === 2) commitMagicDrawing();
      else { renderMagicImport(); renderScene(); }
    } catch (error) { magic.error = error.message; renderMagicImport(); renderScene(); toast(error.message, true); }
    return true;
  }

  function onMagicSetting(input) {
    const magic = state.magic, setting = input.dataset?.magicSetting;
    if (!magic || !setting) return false;
    if (setting === 'distance') magic.distanceInput = input.value;
    if (setting === 'scale-axis') magic.scaleAxis = input.value;
    if (setting === 'auto-detect') {
      const form = $('#magic-scale-form');
      magic.detectEnabled = input.checked; renderMagicImport();
      if (form) $('#magic-scale-form')?.replaceWith(form);
    }
    if (setting === 'detect-sensitivity') magic.detectSensitivity = K.clamp(Number(input.value), 10, 90);
    if (setting === 'detect-joints') magic.detectJoints = input.checked;
    if (['detect-selected', 'detect-type', 'detect-anchors'].includes(setting) && !magic.busy) {
      const candidate = magic.detectCandidates?.find((c) => c.id === input.dataset.detection);
      if (candidate) {
        pushDetectionHistory();
        if (setting === 'detect-selected') candidate.selected = input.checked;
        else if (setting === 'detect-anchors') candidate.useAnchors = input.checked;
        else if ((candidate.points.length === 1 ? ['bearing', 'node'] : ['ground', 'link', 'panel', 'rail', 'slot']).includes(input.value)) candidate.type = input.value;
        renderMagicImport(); renderScene();
      }
    }
    if (['distance', 'scale-axis', 'pixel'].includes(setting) && input.form) $('#magic-scale-preview').textContent = magicScalePreview(new FormData(input.form));
    if (setting === 'name') magic.name = input.value;
    if (setting === 'backup') magic.backupAcknowledged = input.checked;
    if (setting === 'show-image') { magic.showImage = input.checked; renderScene(); }
    if (setting === 'opacity') { magic.opacity = K.clamp(Number(input.value) / 100, .1, 1); renderScene(); }
    if (setting === 'width') {
      const value = Number(input.value);
      if (!input.value.trim() || !Number.isFinite(value) || value < .1 || value > 5000) { input.value = magic.width; toast('Hrúbka musí byť 0,1 až 5000 mm.', true); }
      else magic.width = value;
    }
    if (setting === 'member-type' && ['link', 'panel', 'rail'].includes(input.value)) { magic.memberType = input.value; magic.drawing = []; magic.preview = null; renderScene(); }
    return true;
  }

  function persistMagicProjects(project, original) {
    const text = localStorage.getItem(storageKey), records = text ? JSON.parse(text) : [];
    if (!Array.isArray(records) || records.length > 20) throw new Error('Projektové úložisko má neplatný obsah. Pôvodné dáta sa neprepísali.');
    try {
      for (const record of records) if (!record?.id || K.validateProject(record).id !== record.id) throw new Error();
      if (new Set(records.map((record) => record.id)).size !== records.length) throw new Error();
    } catch { throw new Error('Projektové úložisko má poškodené alebo opakované záznamy. Pôvodné dáta sa neprepísali.'); }
    const keepOriginal = original.dirty || original.saved || original.project.elements.length > 0;
    const next = [project, ...(keepOriginal ? [K.copy(original.project)] : []), ...records.filter((p) => p.id !== project.id && p.id !== original.project.id)];
    if (next.length > 20) throw new Error('Úložisko už obsahuje 20 projektov. Magic import nevymaže staršie projekty; nový projekt exportujte.');
    localStorage.setItem(storageKey, JSON.stringify(next));
    try { localStorage.setItem(lastKey, project.id); return true; } catch { return false; }
  }

  function magicOriginalPreserved(original) {
    if (!original.dirty && !original.saved && !original.project.elements.length) return true;
    try {
      const records = JSON.parse(localStorage.getItem(storageKey) || '[]'), previous = Array.isArray(records) && records.find((p) => p.id === original.project.id);
      return !!previous && JSON.stringify(K.validateProject(previous)) === JSON.stringify(K.validateProject(original.project));
    } catch { return false; }
  }

  function submitMagicFinish(data) {
    const magic = state.magic;
    if (!magic || magic.step !== 5 || magic.busy) return;
    const project = M.finish(state.project, magic.image, magic.scale, String(data.get('name') || ''));
    X.serializeNative(project, { workspace: magic.original, motion: K.driveRange(project).min });
    let stored = false, remembered = false;
    try { remembered = persistMagicProjects(project, magic.original); stored = true; }
    catch (error) {
      magic.storageError = error.message || 'Nový projekt sa nedal uložiť do prehliadača.';
      if (!magicOriginalPreserved(magic.original) && !data.has('original-backup')) {
        magic.name = project.name; renderMagicImport();
        toast('Najskôr zachovajte pôvodný projekt: exportujte ho a potvrďte uloženú zálohu. Rozpracovaná schéma zostáva nedotknutá.', true);
        return;
      }
    }
    const preferences = { ...X.preferences(magic.original), mode: 'edit' };
    if (magic.image) URL.revokeObjectURL(magic.image.url);
    for (const pose of magic.poses || []) URL.revokeObjectURL(pose.image.url);
    state.magic = null; $('#modal').close();
    loadProject(project, { workspace: preferences }, true);
    state.saved = stored; state.dirty = !stored; state.storageFailed = !stored;
    updateHeader(); renderMagicImport();
    toast(stored ? remembered ? 'Magic import je dokončený. Nový aj pôvodný projekt sú uložené samostatne.' : 'Schéma je uložená; posledný výber projektu sa neuložil.' : 'Schéma je dokončená iba v pamäti. Exportujte ju do .kinmo.', !stored);
  }

  function cancelMagicImport(confirmed = false) {
    const magic = state.magic;
    if (!magic) return;
    if (!confirmed && (magic.geometryStarted || magic.drawing.length)) {
      modal('Zrušiť Magic import?', '<p class="modal-description">Rozpracované obkresľovanie sa zahodí. Pôvodný projekt, jeho výber a história Späť sa obnovia.</p><div class="modal-actions"><button class="button button-secondary" data-action="close-modal">Pokračovať v sprievodcovi</button><button class="button button-dark" data-action="magic-confirm-cancel">Zrušiť obkresľovanie</button></div>');
      return;
    }
    if (state.drag) onPointerUp({ pointerId: state.drag.pointerId, cancelled: true });
    magic.detectController?.abort();
    if (magic.image) URL.revokeObjectURL(magic.image.url);
    for (const pose of magic.poses || []) URL.revokeObjectURL(pose.image.url);
    clearTimeout(autosaveTimer); Object.assign(state, magic.original); state.magic = null; state.playing = false;
    $('#modal').close(); renderMagicImport(); renderTree(); renderInspector(); renderScene(); renderGraph(); updateHeader(); updateToolbar(); updateMotion();
    if (state.dirty) autosaveTimer = setTimeout(() => saveProject(true), 1400);
    $('[data-action="projects"]').focus({ preventScroll: true });
    toast('Pôvodný projekt bol obnovený bez zmien.');
  }

  function loadProject(project, imported = null, magicDraft = false) {
    if (state.magic && !magicDraft) { toast('Najskôr dokončite alebo zrušte Magic import.', true); return; }
    closeContextMenu();
    if(!magicDraft)automaticVersion();
    clearTimeout(autosaveTimer);
    state.measurements=[];state.measureRuntime=[];state.measureTime=0;state.lesson=null;if($('#lesson-panel'))$('#lesson-panel').hidden=true;
    state.project = K.copy(project); state.history = []; state.future = []; state.historySelections = []; state.futureSelections = [];
    state.motion = imported?.motion ?? K.driveRange(project).min; state.playing = false; state.saved = false; state.dirty = false; state.storageFailed = false;
    state.direction = (project.elements.find((e) => e.drive)?.driveSpeed ?? 1) < 0 ? -1 : 1;
    state.selected = projectSelection(project);
    state.selectedElementIds = state.selected ? [I.elementKey(state.selected)] : []; state.hoveredTargetId = null;
    state.traceRef = isDoubleDrawer() ? { elementId: 'bearing-1', point: 'a' } : defaultTraceReference();
    state.traceMode = isDoubleDrawer() ? 'bearings' : 'single'; state.traceSpace = 'world';
    state.pendingJoint = null; state.dimensionPick = null; state.measure = null; state.tool = 'select'; state.analysis = false; state.inspectorTab = 'geometry'; state.view = null;
    state.inspectorOpen = false; updateInspectorVisibility();
    state.editPivot = null; state.diagnosticAnalysis = null;
    state.smartSnap = false; state.snapPreview = null; state.pendingSnap = null; state.snapTransaction = null; state.insertingType = null; state.placementPreview = null; state.placementMount = null; state.snapSuppressed = false; state.quickChecks = null; state.trial = null; state.trialBlock = null; state.planTime = 0; state.freedomCache = null; state.phasePick = null; state.pendingPlanDraft = null;
    state.mode = imported?.workspace?.mode || (project.kind === 'custom' ? 'edit' : 'simulate');
    if (imported?.workspace) applyPreferences(imported.workspace, true);
    $('#modal').close();
    recalculate(true); renderTree(); renderInspector(); updateHeader(); updateToolbar();
    if (!magicDraft) saveProject(true);
    if (!state.magic && !magicDraft) toast(`Projekt „${project.name}“ je pripravený.`);
  }

  function replaceProject(project, imported = null) {
    if (state.gifExport) { toast('Najprv dokončite alebo zrušte GIF export.', true); return; }
    if (state.magic) { toast('Najskôr dokončite alebo zrušte Magic import.', true); return; }
    if (!state.dirty || saveProject(true)) { loadProject(project, imported); return; }
    state.pendingProject = project;
    state.pendingImport = imported;
    modal('Nahradiť neuložený projekt?', `<p class="modal-description">Lokálne úložisko nie je dostupné. Aktuálny projekt najskôr exportujte, ak ho chcete zachovať.</p><div class="modal-actions"><button class="button button-secondary" data-action="export-kinmo">Exportovať aktuálny projekt</button><button class="button button-dark" data-action="confirm-replace">Nahradiť projekt</button></div>`);
  }

  function readCollection(kind) {
    if (!Object.hasOwn(collectionKeys, kind)) throw new Error('Nepodporované lokálne úložisko.');
    let text;
    try { text = localStorage.getItem(collectionKeys[kind]); } catch { throw new Error('Lokálne úložisko knižnice a verzií nie je dostupné. Výber alebo verziu môžete exportovať samostatne.'); }
    return text ? W.normalizeCollection(text, kind) : [];
  }

  function writeCollection(kind, records) {
    if (!Object.hasOwn(collectionKeys, kind)) throw new Error('Nepodporované lokálne úložisko.');
    const text = W.serializeCollection(records, kind);
    try { localStorage.setItem(collectionKeys[kind], text); } catch { throw new Error('Záznam sa nepodarilo uložiť. Úložisko môže byť plné alebo zakázané. Exportujte ho do súboru; pôvodné záznamy zostali zachované.'); }
  }

  function collectionRecord(kind, id) {
    const record = readCollection(kind).find((r) => r.id === id);
    if (!record) throw new Error('Záznam už nie je v lokálnom úložisku.');
    return record;
  }

  function recordSaveModal(kind) {
    const assembly = kind === 'assembly', keys = [...state.selectedElementIds];
    if (assembly && (state.project.kind !== 'custom' || !keys.length)) { toast('Vyberte členy vo vlastnom modeli alebo vo voľnej kópii šablóny.', true); return; }
    modal(assembly ? 'Uložiť vlastnú podzostavu' : 'Uložiť pomenovanú verziu', `<p class="modal-description">${assembly ? 'Uložia sa celé vybrané členy, nesení potomkovia, vnútorné väzby, vlastné kóty a trajektórie. Skryté ukotvenia zostanú. Väzby a montáže na nevybrané telesá sa neprenesú. Ukladá sa návrhová geometria, nie okamžitá animovaná poloha.' : 'Snímka zachová natívny projekt, fyziku, vzhľad, režim a polohu pohonu. História Späť a dočasné náhľady sa neprenášajú; inteligentné prichytávanie sa neaktivuje.'}</p><form id="workbench-save-form" data-kind="${kind}" data-keys="${escape(JSON.stringify(keys))}"><label class="property-field"><span>${assembly ? 'Názov podzostavy' : 'Názov verzie'}</span><input class="text-field" name="name" maxlength="80" placeholder="${assembly ? 'Napríklad dvojramenný držiak' : 'Napríklad širšie čelo'}" required autofocus/></label><p class="section-description">Len tento prehliadač, bez synchronizácie. Limit ${W.collectionLimits[kind]} záznamov a 2 MB na kolekciu. Staršie záznamy sa nevymazávajú automaticky.</p><div class="modal-actions"><button type="button" class="button button-secondary" data-action="export-workbench-draft">Exportovať samostatne</button><button type="submit" class="button button-dark">Uložiť lokálne</button></div></form>`);
  }

  function draftRecord(form, data) {
    const kind = form.dataset.kind, name = String(data.get('name') || '');
    return kind === 'assembly' ? W.captureAssembly(state.project, JSON.parse(form.dataset.keys), name, state) : kind === 'revision' ? W.createRevision(state.project, name, { workspace: state, motion: state.motion }) : (() => { throw new Error('Nepodporovaný záznam.'); })();
  }

  function submitWorkbenchSave(form, data) {
    const kind = form.dataset.kind, record = draftRecord(form, data), records = readCollection(kind);
    writeCollection(kind, [record, ...records]);
    if (kind === 'assembly') assembliesModal(state.assemblyInsertPoint); else revisionsModal(state.revisionScope);
    toast(kind === 'assembly' ? 'Podzostava bola uložená do vlastnej knižnice.' : 'Pomenovaná verzia bola uložená.');
  }

  function exportCollection(kind, records = readCollection(kind), name = null) {
    const title = name || (kind === 'assembly' ? 'moja-kniznica' : 'verzie-projektov');
    const slug = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80) || 'kinmo';
    download(`${slug}.${kind === 'assembly' ? 'kinmolib' : 'kinmoversions'}`, W.serializeCollection(records, kind), 'application/json');
  }

  function importCollection(text, kind) {
    const records = W.mergeCollection(readCollection(kind), text, kind);
    writeCollection(kind, records);
    if (kind === 'assembly') assembliesModal(state.assemblyInsertPoint); else revisionsModal('all');
    toast('Záznamy boli pridané bez prepísania existujúcich položiek.');
  }

  function collectionErrorModal(kind, error) {
    modal(kind === 'assembly' ? 'Knižnica podzostáv' : 'Pomenované verzie', `<p class="modal-description">${escape(error.message)}</p><p class="section-description">Existujúce úložisko sa nemení. Aktuálny výber alebo verziu môžete exportovať bez lokálneho uloženia.</p><div class="modal-actions"><button class="button button-secondary" data-action="${kind === 'assembly' ? 'save-assembly' : 'save-revision'}">Pripraviť samostatný export</button><button class="button button-secondary" data-action="projects">Projekty</button></div>`);
  }

  function assembliesModal(at = null) {
    state.assemblyInsertPoint = at || state.assemblyInsertPoint || { x: state.view ? state.view.x + state.view.width / 2 : state.pointer.x, y: state.view ? state.view.y + state.view.height / 2 : state.pointer.y };
    let records;
    try { records = readCollection('assembly'); } catch (error) { collectionErrorModal('assembly', error); return; }
    modal('Vlastná knižnica podzostáv', `<p class="modal-description">Samostatné kópie celých členov a vnútorných väzieb. Každé vloženie dostane nové identifikátory a nemení originál. V modeli ostáva najviac jeden pohon.</p><div class="collection-toolbar"><button class="button button-dark" data-action="save-assembly"${state.project.kind !== 'custom' || !state.selectedElementIds.length ? ' disabled' : ''}>Uložiť aktuálny výber</button><button class="button button-secondary" data-action="import-collection" data-kind="assembly">Importovať .kinmolib</button><button class="button button-secondary" data-action="export-collection" data-kind="assembly"${!records.length ? ' disabled' : ''}>Exportovať knižnicu</button></div><div class="collection-list">${records.length ? records.map((r) => `<article class="collection-card"><div><strong>${escape(r.name)}</strong><small>${r.file.project.elements.length} prvkov · ${r.file.project.connections.length} väzieb · ${escape(new Date(r.createdAt).toLocaleDateString('sk-SK'))}</small></div><div class="collection-actions"><button data-action="insert-library" data-id="${escape(r.id)}">Vložiť…</button><button data-action="open-library-project" data-id="${escape(r.id)}">Otvoriť kópiu</button><button data-action="export-record" data-kind="assembly" data-id="${escape(r.id)}">Exportovať</button><button data-action="delete-record" data-kind="assembly" data-id="${escape(r.id)}">Odstrániť…</button></div></article>`).join('') : '<p class="empty-projects">Knižnica je prázdna. Vyberte členy pomocou Shift/Ctrl + klik a uložte výber. Šablónu najskôr preveďte na voľnú kópiu.</p>'}</div><div class="modal-actions"><button class="button button-secondary" data-action="projects">Späť na projekty</button></div>`, true);
  }

  function insertLibraryModal(id) {
    const record = collectionRecord('assembly', id), origin = state.assemblyInsertPoint || state.pointer;
    const driven = record.file.project.elements.some((e) => e.drive), canDrive = driven && state.project.kind === 'custom' && !state.project.elements.some((e) => e.drive);
    modal(`Vložiť: ${record.name}`, `<p class="modal-description">Bod X / Y je uložený referenčný začiatok podzostavy. Vonkajšie väzby doplňte po vložení. ${driven && !canDrive ? 'Model už má riadený vstup alebo chránený pohybový zákon. Pohon podzostavy bude pasívny.' : 'Vloženie tvorí jeden krok Späť.'}</p><form id="library-insert-form" data-id="${escape(id)}"><div class="settings-fields"><label class="property-field"><span>Vloženie X (mm)</span><input class="text-field" name="x" type="number" min="-5000" max="5000" step="any" value="${origin.x}" required/></label><label class="property-field"><span>Vloženie Y (mm)</span><input class="text-field" name="y" type="number" min="-5000" max="5000" step="any" value="${origin.y}" required/></label></div>${canDrive ? '<label class="check-row"><input type="checkbox" name="keep-drive" checked/><span>Zachovať jediný pohon podzostavy aj jeho rozsah</span></label>' : ''}<div class="modal-actions"><button class="button button-secondary" type="button" data-action="close-modal">Zrušiť</button><button class="button button-dark" type="submit">Vložiť kópiu</button></div></form>`);
  }

  function submitLibraryInsert(form, data) {
    const record = collectionRecord('assembly', form.dataset.id), previous = new Set(state.project.elements.map((e) => e.id));
    const next = W.insertAssembly(state.project, record, { x: Number(data.get('x')), y: Number(data.get('y')) }, data.has('keep-drive'));
    const keys = next.elements.filter((e) => !previous.has(e.id) && e.visible).map((e) => I.elementKey(e.id));
    editCanvas(next, 'Samostatná podzostava bola vložená. Vonkajšie väzby môžete doplniť na plátne.', keys); $('#modal').close();
  }

  function revisionsModal(scope = 'current') {
    state.revisionScope = scope === 'all' ? 'all' : 'current';
    let all;
    try { all = readCollection('revision'); } catch (error) { collectionErrorModal('revision', error); return; }
    const records = all.filter((r) => state.revisionScope === 'all' || r.projectId === state.project.id);
    modal('Pomenované verzie projektu', `<p class="modal-description">Uložte návrhové varianty, porovnajte rozmery a obnovte starší stav. Pred obnovením sa aktuálny stav vždy uloží ako záložná verzia. Záznamy sú iba v tomto prehliadači; export vytvorí prenosnú zálohu.</p><div class="collection-toolbar"><button class="button button-dark" data-action="save-revision">Uložiť novú verziu</button><button class="button button-secondary" data-action="compare-revisions"${!records.length ? ' disabled' : ''}>Porovnať rozmery</button><button class="button button-secondary" data-action="import-collection" data-kind="revision">Importovať verzie</button><button class="button button-secondary" data-action="export-collection" data-kind="revision"${!all.length ? ' disabled' : ''}>Exportovať všetky</button></div><label class="property-field"><span>Zobraziť záznamy</span><select class="property-select" id="revision-scope"><option value="current"${state.revisionScope === 'current' ? ' selected' : ''}>Aktuálny projekt</option><option value="all"${state.revisionScope === 'all' ? ' selected' : ''}>Všetky projekty</option></select></label><div class="collection-list">${records.length ? records.map((r) => `<article class="collection-card"><div><strong>${escape(r.name)}</strong><small>${escape(r.file.project.name)} · ${escape(new Date(r.createdAt).toLocaleString('sk-SK'))}</small></div><div class="collection-actions"><button data-action="restore-revision" data-id="${escape(r.id)}">Obnoviť…</button><button data-action="export-record" data-kind="revision" data-id="${escape(r.id)}">Exportovať</button><button data-action="delete-record" data-kind="revision" data-id="${escape(r.id)}">Odstrániť…</button></div></article>`).join('') : '<p class="empty-projects">Zatiaľ tu nie je uložená pomenovaná verzia.</p>'}</div><p class="section-description">Limit ${W.collectionLimits.revision} verzií a 2 MB spolu. Obnovenie potrebuje miesto pre zálohu aktuálneho stavu; plné alebo nedostupné úložisko obnovenie zastaví.</p><div class="modal-actions"><button class="button button-secondary" data-action="projects">Späť na projekty</button></div>`, true);
  }

  function restoreRevisionModal(id) {
    const record = collectionRecord('revision', id);
    state.pendingRevisionId = id;
    modal('Obnoviť pomenovanú verziu?', `<p class="modal-description">Obnovíte „${escape(record.name)}“ projektu „${escape(record.file.project.name)}“. Aktuálny stav najskôr uložíme ako verziu „Pred obnovením…“. Ak sa záloha nepodarí, projekt sa nezmení. História Späť sa po obnovení začne nanovo a Vlastnosti zostanú skryté.</p><div class="modal-actions"><button class="button button-secondary" data-action="close-modal">Zrušiť</button><button class="button button-dark" data-action="confirm-revision-restore">Zálohovať a obnoviť</button></div>`);
  }

  function confirmRevisionRestore() {
    const records = readCollection('revision'), record = records.find((r) => r.id === state.pendingRevisionId);
    if (!record) throw new Error('Verzia už nie je dostupná.');
    const backup = W.createRevision(state.project, `Pred obnovením ${record.name} · ${new Date().toLocaleString('sk-SK')}`.slice(0, 80), { workspace: state, motion: state.motion });
    writeCollection('revision', [backup, ...records]);
    const restored = W.restoreRevision(record);
    state.pendingRevisionId = null;
    replaceProject(restored.project, restored);
  }

  function comparisonModal() {
    const records = readCollection('revision').filter((r) => state.revisionScope === 'all' || r.projectId === state.project.id);
    if (!records.length) { toast('Najskôr uložte aspoň jednu pomenovanú verziu.', true); return; }
    const options = (selected) => `<option value="current"${selected === 'current' ? ' selected' : ''}>Aktuálny stav</option>${records.map((r) => `<option value="${escape(r.id)}"${selected === r.id ? ' selected' : ''}>${escape(r.name)} · ${escape(r.file.project.name)}</option>`).join('')}`;
    modal('Porovnať návrhové rozmery', `<p class="modal-description">Porovnávajú sa návrhové polohy, rozmery členov, uložené kóty, parametre a dorazy. Nie okamžité animované polohy, sila ani výrobná vhodnosť. Rovnaké identifikátory označujú rovnaké členy; nezávislé kópie sa zobrazia ako pridané alebo odstránené.</p><form id="revision-compare-form"><div class="settings-fields"><label class="property-field"><span>Predtým</span><select class="property-select" name="before">${options(records[0].id)}</select></label><label class="property-field"><span>Potom</span><select class="property-select" name="after">${options('current')}</select></label></div><label class="check-row"><input type="checkbox" name="changes-only" checked/><span>Iba zmenené rozmery</span></label><div class="modal-actions"><button class="button button-dark" type="submit">Porovnať</button></div></form><div id="revision-comparison" aria-live="polite"></div>`, true);
  }

  function submitRevisionComparison(data) {
    const records = readCollection('revision');
    const project = (key) => {
      if (key === 'current') return state.project;
      const record = records.find((r) => r.id === key);
      if (!record) throw new Error('Zvolená verzia už nie je dostupná.');
      return record.file.project;
    };
    const rows = W.compareDimensions(project(String(data.get('before'))), project(String(data.get('after')))).filter((r) => !data.has('changes-only') || r.status !== 'same');
    $('#revision-comparison').innerHTML = rows.length ? `<div class="comparison-scroll"><table class="comparison-table"><thead><tr><th>Rozmer</th><th>Predtým</th><th>Potom</th><th>Rozdiel</th><th>Stav</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${escape(r.label)}</td><td>${fmt(r.before, 3)} ${escape(r.unit)}</td><td>${fmt(r.after, 3)} ${escape(r.unit)}</td><td>${r.delta == null ? '—' : `${r.delta > 0 ? '+' : ''}${fmt(r.delta, 3)} ${escape(r.unit)}`}</td><td>${({ same: 'Bez zmeny', changed: 'Zmenené', added: 'Pridané', removed: 'Odstránené' })[r.status]}</td></tr>`).join('')}</tbody></table></div>` : '<p class="section-description">Zvolené návrhové rozmery sa nezmenili.</p>';
  }

  function deleteRecordModal(kind, id) {
    const record = collectionRecord(kind, id);
    state.pendingCollectionDelete = { kind, id };
    modal('Odstrániť lokálny záznam?', `<p class="modal-description">Odstránite „${escape(record.name)}“. Otvorený projekt a ostatné záznamy sa nezmenia. Vymazanie knižnice alebo verzie nemá krok Späť; najskôr si môžete uložiť súbor.</p><div class="modal-actions"><button class="button button-secondary" data-action="export-record" data-kind="${kind}" data-id="${escape(id)}">Exportovať záznam</button><button class="button button-secondary" data-action="close-modal">Zrušiť</button><button class="button button-dark" data-action="confirm-record-delete">Odstrániť iba tento záznam</button></div>`);
  }

  function confirmRecordDelete() {
    const pending = state.pendingCollectionDelete;
    if (!pending) return;
    collectionRecord(pending.kind, pending.id);
    writeCollection(pending.kind, readCollection(pending.kind).filter((r) => r.id !== pending.id));
    state.pendingCollectionDelete = null;
    if (pending.kind === 'assembly') assembliesModal(state.assemblyInsertPoint); else revisionsModal(state.revisionScope);
    toast('Zvolený lokálny záznam bol odstránený.');
  }

  function readProjects() {
    try {
      const records = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!Array.isArray(records) || records.length > 20) throw new Error();
      const ids = new Set();
      return records.map((record) => {
        const p = K.validateProject(record);
        if (!record?.id || p.id !== record.id || ids.has(p.id)) throw new Error();
        ids.add(p.id); return p;
      });
    } catch { throw new Error('Projektové úložisko nie je dostupné alebo má poškodený obsah. Dáta sa neprepísali; aktuálny projekt môžete exportovať do .kinmo.'); }
  }

  function duplicateProject(id = state.project.id, prepared = false) {
    if (state.magic || state.gifExport) return;
    try {
      const records = readProjects(), source = prepared ? DD.create() : id === state.project.id ? state.project : records.find((p) => p.id === id);
      if (!source) throw new Error('Projekt na duplikovanie už nie je uložený.');
      const copy = K.copy(K.validateProject(source)), ids = new Set([state.project.id, ...records.map((p) => p.id)]);
      for (let attempt = 0; attempt < 64 && ids.has(copy.id); attempt++) copy.id = K.uid();
      if (ids.has(copy.id)) throw new Error('Nepodarilo sa vytvoriť samostatný identifikátor kópie.');
      const base = source.name.slice(0, 80), names = new Set(records.map((p) => p.name));
      copy.name = `${base} · kópia`;
      for (let n = 2; names.has(copy.name); n++) copy.name = `${base} · kópia ${n}`;
      const preserveCurrent = state.dirty || state.saved || state.project.elements.length;
      const next = [copy, ...(preserveCurrent ? [K.copy(K.validateProject(state.project))] : []), ...records.filter((p) => !preserveCurrent || p.id !== state.project.id)];
      if (next.length > 20) throw new Error('Úložisko obsahuje 20 projektov. Najskôr vymažte nepotrebný projekt. Duplikovanie nevymaže pôvodný ani staršie projekty.');
      localStorage.setItem(storageKey, JSON.stringify(next));
      clearTimeout(autosaveTimer);
      loadProject(copy, { motion: id === state.project.id && !prepared ? state.motion : K.driveRange(copy).min, workspace: { ...X.preferences(state), mode: state.mode } }, true);
      state.saved = true; state.dirty = false; state.storageFailed = false;
      try { localStorage.setItem(lastKey, copy.id); } catch { /* The copy and original are already safely stored. */ }
      updateHeader(); toast(`Samostatná kópia „${copy.name}“ bola vytvorená a otvorená.`);
    } catch (error) { toast(error.message, true); }
  }

  function deleteProjectModal(id) {
    try {
      const project = readProjects().find((p) => p.id === id);
      if (!project) throw new Error('Tento uložený projekt už neexistuje. Šablóny nemožno vymazať.');
      state.pendingProjectDelete = id;
      modal('Vymazať uložený projekt?', `<p class="modal-description">Vymaže sa iba „${escape(project.name)}“ z tohto prehliadača. ${id === state.project.id ? 'Aktuálny projekt sa zavrie a otvorí sa čistý pracovný priestor. ' : ''}Šablóny, ostatné projekty, podzostavy a pomenované verzie zostanú. Odstránenie nemožno vrátiť cez Späť; projekt si môžete najskôr exportovať.</p><div class="modal-actions"><button class="button button-secondary" data-action="projects">Zrušiť</button><button class="button button-dark" data-action="confirm-project-delete">Vymazať tento projekt</button></div>`);
    } catch (error) { toast(error.message, true); }
  }

  function confirmProjectDelete() {
    const id = state.pendingProjectDelete;
    if (!id || state.magic || state.gifExport) return;
    try {
      const records = readProjects();
      if (!records.some((p) => p.id === id)) throw new Error('Projekt už nie je uložený. Nič sa nevymazalo.');
      localStorage.setItem(storageKey, JSON.stringify(records.filter((p) => p.id !== id)));
      if (id === state.project.id) {
        clearTimeout(autosaveTimer); loadProject(K.preset('custom'), null, true);
        state.saved = false; state.dirty = false; updateHeader();
      }
      try { if (localStorage.getItem(lastKey) === id) localStorage.removeItem(lastKey); } catch { /* Loading ignores a missing project. */ }
      state.pendingProjectDelete = null; projectsModal(); toast('Vymazal sa iba potvrdený projekt.');
    } catch (error) { toast(error.message, true); }
  }

  function projectsModal() {
    state.pendingProjectDelete = null; state.pendingImpact = null; state.referenceDraft = null;
    let projects = [], storageError = '';
    try { projects = readProjects(); } catch (error) { storageError = error.message; }
    const saved = projects.map((p) => `<div class="project-catalog-row"><button class="saved-project" data-action="load-saved" data-id="${escape(p.id)}"><span class="saved-project-icon">${icon('mechanism', 22)}</span><span><strong>${escape(p.name)}</strong><small>${p.elements.length} prvkov · ${p.id === state.project.id ? 'Aktuálny projekt · ' : ''}${p.kind === DD.KIND ? 'Dvojkulisový projekt · odhad' : p.kind === 'drawer' ? 'Výsuv a kulisa' : '2D mechanizmus'}</small></span>${icon('arrow', 16)}</button><div class="project-row-actions">${ib('copy', 'duplicate-project', `Duplikovať ${p.name}`, false, `data-id="${escape(p.id)}"`)}${ib('trash', 'delete-project', `Vymazať ${p.name}`, false, `data-id="${escape(p.id)}"`)}</div></div>`).join('');
    modal('Mechanizmy a projekty', `<p class="modal-description">Všetky šablóny, pripravené aj uložené projekty sú na jednom mieste. Otvorením šablóny vznikne samostatný projekt.</p>
      <div class="collection-toolbar"><button class="button button-secondary magic-import-button" data-action="magic-import" aria-controls="magic-wizard" aria-expanded="false">${icon('import', 16)}Magic import · schéma z obrázka</button><button class="button button-secondary" data-action="assemblies">${icon('layers', 16)}Vlastné podzostavy</button><button class="button button-secondary" data-action="revisions">${icon('copy', 16)}Pomenované verzie</button></div>
      <h3 class="projects-section-title">Šablóny mechanizmov</h3>${templateCards()}
      <h3 class="projects-section-title">Pripravený projekt podľa náčrtu</h3><div class="project-catalog-row"><button class="saved-project" data-action="load-double-drawer"><span class="saved-project-icon">${icon('folder', 22)}</span><span><strong>${escape(DD.NAME)}</strong><small>Dve pohyblivé kulisy · tuhé rameno · dve fázy</small><span class="project-estimate">ODHADOVÉ ROZMERY · 390 / 300 mm</span></span>${icon('arrow', 16)}</button>${ib('copy', 'duplicate-prepared', 'Duplikovať pripravený projekt')}${ib('info', 'project-info', 'Zobraziť náčrt a predpoklady projektu')}</div>
      <h3 class="projects-section-title">Uložené v tomto prehliadači · ${projects.length} / 20</h3><div class="projects-list">${storageError ? `<p class="magic-error" role="alert">${escape(storageError)}</p>` : saved || '<div class="empty-projects">Zatiaľ nemáte uložené projekty.<br>Aktuálny model uložte tlačidlom Uložiť.</div>'}</div>
      <div class="modal-actions"><button class="button button-secondary" data-action="duplicate-project">${icon('copy', 16)}Duplikovať aktuálny</button><button class="button button-secondary" data-action="rename">${icon('settings', 16)}Premenovať aktuálny</button><button class="button button-secondary" data-action="import">${icon('import', 16)}Importovať</button></div>`, true);
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
      ['gif', 'play', 'Animovaný pohyb', 'Celý kinematický rozsah v aktuálnom vzhľade; nastavenia, priebeh a zrušenie.', 'GIF'],
      ['pdf', 'folder', 'Technický report', 'Ostrá statická schéma ako na plátne, grafy, rozmery, sily a tabuľky.', 'PDF'],
      ['html', 'folder', 'Prenosný report na tlač', 'Samostatný report so schémou v aktuálnom vzhľade a vektorovými grafmi.', 'HTML'],
      ['dxf', 'ruler', 'CAD výmena', 'Referenčná geometria v mm; strednice a voliteľné uzavreté obrysy drážok.', 'DXF'],
      ['csv', 'chart', 'Kinematické dáta', '121 polôh, uhly, súradnice a chyby väzieb.', 'CSV'],
      ['forces', 'spring', 'Silové / dynamické dáta', 'Sily členov a časový záznam poslednej odhadovej dynamiky.', 'CSV'],
      ['json', 'code', 'Starší projekt JSON', 'Kompatibilita s pôvodným formátom, bez vzhľadu a polohy.', 'JSON'],
    ];
    modal('Export, report a CAD', `<p class="modal-description">Exporty sa vytvoria lokálne. Priame odoslanie do Fusion spustíte iba samostatným potvrdením.</p><label class="check-row"><input id="cad-slot-outlines" type="checkbox"${state.cadSlotOutlines ? ' checked' : ''}/><span>DXF / Fusion: pridať uzavreté referenčné obrysy podľa šírky drážky</span></label><p class="section-description">Strednice zostanú zachované. Obrysy majú polygonové zaoblenia a nie sú výrobným výkresom. Nulová, pretínajúca sa alebo príliš široká krivka sa odmietne; túto voľbu môžete vypnúť. Samostatné referenčné vodidlá zostanú iba strednicami.</p><div class="export-options">${choices.map(([type, glyph, name, description, extension]) => `<button data-action="export-${type}">${icon(glyph, 23)}<span><strong>${name}</strong><small>${description}</small></span><span class="file-tag">${extension}</span></button>`).join('')}<button data-action="fusion">${icon('link', 23)}<span><strong>Priame prepojenie · Autodesk Fusion</strong><small>Lokálny doplnok, párovací kľúč a nový referenčný dokument.</small></span><span class="file-tag">CAD</span></button></div><div class="export-note">${icon('lock', 14)}Exporty neopúšťajú zariadenie. Fusion vyžaduje vaše výslovné odoslanie.</div>`, true);
  }

  function download(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; anchor.dataset.kinmoDownload = 'true'; document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Súbor ${filename} bol pripravený na stiahnutie.`);
  }

  function gifOptions(data) {
    return { width: Number(data.get('width')), duration: Number(data.get('duration')), fps: Number(data.get('fps')), direction: data.get('direction'), loop: data.has('loop') };
  }

  function gifModal() {
    if (state.magic || state.drag) { toast('Najprv dokončite rozpracovanú úpravu alebo Magic import.', true); return; }
    if (!state.project.elements.some((e) => e.visible)) { toast('Najprv vytvorte viditeľný mechanizmus s pohonom.', true); return; }
    const range = K.driveRange(state.project);
    modal('Animovaný GIF', `<form id="gif-form"><fieldset id="gif-options" class="gif-fields settings-fields">
      <label class="property-field"><span>Šírka obrázka</span><select name="width" class="property-select">${[160, 320, 480, 640, 800, 1000, 1200].map((width) => `<option value="${width}"${width === 800 ? ' selected' : ''}>${width} px</option>`).join('')}</select></label>
      <label class="property-field"><span>Trvanie cyklu (s)</span><input name="duration" class="text-field" type="number" value="6" min="1" max="12" step="0.1" required></label>
      <label class="property-field"><span>Snímky za sekundu</span><input name="fps" class="text-field" type="number" value="10" min="5" max="20" step="1" required></label>
      <label class="property-field"><span>Smer pohybu</span><select name="direction" class="property-select"><option value="roundtrip"${range.unit === 'mm' ? ' selected' : ''}>Tam a späť</option><option value="forward"${range.unit === '°' ? ' selected' : ''}>Jedným smerom</option></select></label>
      <label class="check-row"><input name="loop" type="checkbox" checked><span>Opakovať animáciu bez konca</span></label></fieldset>
      <p class="section-description">GIF prevezme aktuálny výrez, vzhľad, farby a viditeľné vrstvy schémy. Zobrazuje predpísaný kinematický pohyb, nie časový záznam odhadovej dynamiky. Pred exportom prispôsobte pohľad, aby sa celý pohyb zmestil do plátna.</p>
      <p class="section-description">Najviac 1 200 × 1 200 px, 180 snímok, 60 miliónov bodov spolu a 32 MB. Prípravu môžete zrušiť; po 90 sekundách sa zastaví. Všetko sa spracuje lokálne, bez odosielania projektu.</p>
      <p id="gif-estimate" class="gif-estimate" aria-live="polite"></p><progress id="gif-progress" class="gif-progress" value="0" max="1" aria-label="Priebeh GIF exportu" hidden></progress>
      <p id="gif-status" class="section-description" role="status" hidden></p><p id="gif-error" class="gif-error" role="alert" hidden></p>
      <div class="modal-actions"><button id="gif-back" type="button" class="button button-secondary" data-action="export">Späť</button><button id="gif-cancel" type="button" class="button button-secondary" data-action="cancel-gif" hidden>Zrušiť export</button><button id="gif-start" type="submit" class="button button-dark">${icon('export', 15)}Vytvoriť GIF</button></div></form>`);
    updateGIFEstimate();
  }

  function updateGIFEstimate() {
    const form = $('#gif-form');
    if (!form || state.gifExport) return;
    const estimate = $('#gif-estimate'), start = $('#gif-start');
    try {
      const plan = G.plan(K.driveRange(state.project), state.view, gifOptions(new FormData(form)));
      estimate.textContent = `${plan.width} × ${plan.height} px · ${plan.frames.length} snímok · ${fmt(plan.duration, 1)} s · ${fmt(plan.pixels / 1e6, 1)} mil. bodov`;
      estimate.classList.remove('gif-invalid'); start.disabled = false;
    } catch (error) { estimate.textContent = error.message; estimate.classList.add('gif-invalid'); start.disabled = true; }
  }

  function gifProgress(job, progress, text) {
    if (state.gifExport !== job || !$('#gif-form')) return;
    const bar = $('#gif-progress'), status = $('#gif-status');
    bar.hidden = false; bar.value = progress; status.hidden = false; status.textContent = text;
  }

  function cancelGIF() {
    const job = state.gifExport;
    if (!job || job.controller.signal.aborted) return;
    job.cancelled = true;
    job.controller.abort(new Error('GIF export bol zrušený.'));
    gifProgress(job, $('#gif-progress')?.value || 0, 'Ruším export… Projekt zostáva nezmenený.');
    const button = $('#gif-cancel'); if (button) button.disabled = true;
  }

  function checkGIF(job) {
    if (!$('#modal').open && !job.controller.signal.aborted) {
      job.cancelled = true;
      job.controller.abort(new Error('GIF export bol zrušený zatvorením dialógu.'));
    }
    if (job.controller.signal.aborted) throw job.controller.signal.reason || new Error('GIF export bol zrušený.');
    if (state.project !== job.original || state.gifExport !== job) throw new Error('Projekt sa počas GIF exportu zmenil. Súbor nebol vytvorený.');
  }

  function gifSource(job) {
    const live = $('#mechanism-canvas'), rect = live.getBoundingClientRect(), matrix = live.getScreenCTM();
    const host = document.createElement('div'), source = document.createElementNS(svgNS, 'svg');
    host.setAttribute('aria-hidden', 'true'); host.inert = true;
    host.style.cssText = 'position:fixed;left:-100000px;top:0;pointer-events:none';
    source.setAttribute('viewBox', `${job.view.x} ${job.view.y} ${job.view.width} ${job.view.height}`);
    source.setAttribute('width', rect.width); source.setAttribute('height', rect.height);
    source.style.cssText = `display:block;width:${rect.width}px;height:${rect.height}px`;
    source.classList.toggle('labels-hidden', state.labels === false);
    job.host = host; job.source = source;
    job.scale = Math.hypot(matrix?.a ?? 1, matrix?.b ?? 0) || 1;
    host.append(source); document.body.append(host);
  }

  async function gifFrameCanvas(job, motion) {
    checkGIF(job);
    const result = K.solve(job.project, motion, { profile: job.profile, collisions: state.collisions });
    if (result.blocked) throw new Error(`GIF sa zastavil pri ${fmt(motion, 2)} ${job.range.unit}: ${result.issues[0] || 'Mechanizmus je zablokovaný.'}`);
    job.source.innerHTML = sceneMarkup(result, { source: job.source, view: job.view, scale: job.scale, exporting: true, ghostSamples: job.ghostSamples });
    const svg = SC.snapshot(job.source, { view: job.view, width: job.plan.width, maxHeight: job.plan.height, title: job.project.name, description: 'Kinematická animácia mechanizmu.' });
    const canvas = await SC.rasterize(svg, job.plan, { signal: job.controller.signal, canvas: job.canvas, readPixels: true });
    job.canvas = canvas;
    checkGIF(job);
    return canvas;
  }

  async function exportGIF(data) {
    if (state.gifExport) return false;
    if (state.drag) throw new Error('Najprv dokončite presúvanie prvku.');
    if (state.magic) throw new Error('Najprv dokončite alebo zrušte Magic import.');
    if (!state.project.elements.some((e) => e.visible)) throw new Error('GIF potrebuje viditeľný mechanizmus s pohonom.');
    const project = K.validateProject(K.copy(state.project));
    if (project.kind === 'custom' && project.elements.filter((e) => e.drive).length !== 1) throw new Error('Vlastný mechanizmus potrebuje jeden nezávislý motor. Nastavte ho v paneli vlastností.');
    const range = K.driveRange(project), plan = G.plan(range, state.view, gifOptions(data));
    const blocked = state.samples.find((sample) => sample.blocked);
    if (blocked) throw new Error(`Najprv opravte zablokovanú polohu pri ${fmt(blocked.motion, 2)} ${range.unit}. ${blocked.issues?.[0] || ''}`.trim());
    const job = { original: state.project, project, range, plan, view: K.copy(state.view), profile: K.prepareProject(project), controller: new AbortController(), cancelled: false, host: null, canvas: null };
    const timer = setTimeout(() => job.controller.abort(new Error('GIF export prekročil 90 sekúnd. Zmenšite obrázok, trvanie alebo frekvenciu.')), G.limits.timeout);
    state.gifExport = job;
    try {
      $('#gif-options').disabled = true; $('#gif-start').disabled = true; $('#gif-back').disabled = true;
      $('#gif-cancel').hidden = false; $('#gif-cancel').disabled = false; $('#gif-error').hidden = true;
      const calibration = [...new Set([0, Math.floor(plan.frames.length / 2), plan.frames.length - 1])];
      job.ghostSamples = state.ghosts ? K.projectPhases(project).map((phase) => K.solve(project, phase.motion, { profile: job.profile, collisions: false })) : [];
      gifSource(job);
      const builder = G.createPalette();
      for (let i = 0; i < calibration.length; i++) {
        gifProgress(job, i / calibration.length * 0.1, `Pripravujem farby schémy (${i + 1}/${calibration.length})…`);
        const canvas = await gifFrameCanvas(job, plan.frames[calibration[i]].motion);
        builder.add(canvas.getContext('2d').getImageData(0, 0, plan.width, plan.height).data);
      }
      const palette = builder.finish(), encoder = G.createEncoder({ width: plan.width, height: plan.height, palette: palette.colors, loop: plan.loop });
      let reference = null, hasMotion = false;
      for (let i = 0; i < plan.frames.length; i++) {
        const frame = plan.frames[i];
        gifProgress(job, 0.1 + i / plan.frames.length * 0.9, `Kreslím snímku ${i + 1}/${plan.frames.length}…`);
        const canvas = await gifFrameCanvas(job, frame.motion), indices = palette.indices(canvas.getContext('2d').getImageData(0, 0, plan.width, plan.height).data);
        if (!i) reference = indices;
        else if (!hasMotion) {
          for (let point = 0; point < indices.length; point++) if (indices[point] !== reference[point]) { hasMotion = true; reference = null; break; }
        }
        encoder.addFrame(indices, frame.delay);
        await new Promise((resolve) => setTimeout(resolve, 0));
        checkGIF(job);
      }
      if (!hasMotion) throw new Error('Zvolený pohon a rozsah nevytvárajú viditeľný pohyb. Skontrolujte motor alebo zvýšte frekvenciu snímok.');
      const bytes = encoder.finish();
      checkGIF(job);
      const slug = project.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase().slice(0, 70) || 'mechanizmus';
      download(`${slug}.gif`, bytes, 'image/gif');
      gifProgress(job, 1, `GIF je pripravený: ${plan.frames.length} snímok, ${fmt(plan.duration, 1)} s, ${fmt(bytes.length / 1024, 0)} kB. Projekt zostal nezmenený.`);
      return true;
    } catch (error) {
      if (job.cancelled) { gifProgress(job, $('#gif-progress')?.value || 0, 'Export zrušený. Projekt zostal nezmenený.'); return false; }
      if (job.controller.signal.aborted) throw job.controller.signal.reason || error;
      throw error;
    } finally {
      clearTimeout(timer); job.host?.remove();
      if (job.canvas) { job.canvas.width = 0; job.canvas.height = 0; }
      if (state.gifExport === job) state.gifExport = null;
      if (job.resized) renderScene();
      if ($('#gif-form')) {
        $('#gif-options').disabled = false; $('#gif-back').disabled = false; $('#gif-cancel').hidden = true;
        updateGIFEstimate();
      }
    }
  }

  function gifError(error) {
    const element = $('#gif-error'), status = $('#gif-status');
    if (element) { element.hidden = false; element.textContent = error.message; }
    if (status) status.hidden = true;
    toast(error.message, true);
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
      if (type === 'dxf') download(`${slug}.dxf`, X.dxf(state.project, state.result, { dimensions: state.dimensions, trajectories: state.trace, samples: state.samples, references: traceReferences(), traceSpace: state.traceSpace, slotOutlines: state.cadSlotOutlines }), 'application/dxf');
      if (type === 'forces') {
        if (!state.forceContext) prepareForces();
        download(`${slug}-sily.csv`, X.forceCSV(state.project, state.samples, state.forceContext, state.dynamicHistory), 'text/csv;charset=utf-8');
      }
      if (type === 'html' || type === 'pdf') {
        if (!state.forceContext) prepareForces();
        const data = X.reportData(state.project, state.result, state.samples, { forceContext: state.forceContext, forceError: state.forceError, history: state.dynamicHistory, references: traceReferences(), traceSpace: state.traceSpace, scene: { svg: sceneSVG(), ...SC.size(state.view) } });
        if (type === 'html') download(`${slug}-report.html`, X.htmlReport(data), 'text/html;charset=utf-8');
        else {
          const canvas = await SC.rasterize(data.drawing, data.drawingSize);
          data.drawingImage = canvas.toDataURL('image/png');
          const pdfMake = await loadPDF();
          const buffer = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Príprava PDF nebola potvrdená. Použite HTML report alebo menší model.')), 30000);
            pdfMake.createPdf(X.pdfReport(data)).getBuffer((bytes) => { clearTimeout(timer); resolve(bytes); });
          });
          download(`${slug}-report.pdf`, buffer, 'application/pdf');
        }
      }
      if (type === 'png') {
        const canvas = await SC.rasterize(sceneSVG(), SC.size(state.view));
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Prehliadač nevytvoril PNG.');
        download(`${slug}.png`, blob, 'image/png');
      }
      if (type === 'csv') {
        const unit = K.driveRange(state.project).unit;
        const rows = [['pohon_' + (unit === 'mm' ? 'mm' : 'deg'), 'uhol_vystupu_deg', 'posuv_mm', 'bod_x_mm', 'bod_y_mm', 'chyba_vazieb_mm', 'chyba_vazieb_deg', 'blokovanie', 'dovod', ...(isDoubleDrawer() ? ['uhol_ramena_deg', 'faza', 'A_korpus_x_mm', 'A_korpus_y_mm', 'B_korpus_x_mm', 'B_korpus_y_mm', 'A_zasuvka_x_mm', 'A_zasuvka_y_mm', 'B_zasuvka_x_mm', 'B_zasuvka_y_mm', 'odhadove_rozmery', 'sustava_zvoleneho_bodu'] : [])].join(';')];
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
          rows.push([s.motion.toFixed(3), s.angle.toFixed(3), s.displacement.toFixed(3), point?.x.toFixed(3) || '', point?.y.toFixed(3) || '', s.positionResidual.toFixed(5), s.angularResidual.toFixed(5), s.blocked ? '1' : '0', quote(s.issues.join(' | ')), ...extra].join(';'));
        }
        download(`${slug}-pohyb.csv`, '\uFEFF' + rows.join('\r\n'), 'text/csv;charset=utf-8');
      }
      if (type === 'svg') download(`${slug}.svg`, X.vectorSVG(state.project, state.result, { dimensions: state.dimensions, trajectories: state.trace, samples: state.samples, references: traceReferences(), traceSpace: state.traceSpace }), 'image/svg+xml');
    } catch (error) { toast(error.message || 'Export sa nepodarilo dokončiť.', true); }
  }

  function sceneSVG() {
    return SC.snapshot(state.analysis ? $('#analysis-preview') || $('#mechanism-canvas') : $('#mechanism-canvas'), { view: state.view, title: state.project.name, description: X.warning });
  }

  function settingsModal() {
    const s = { ...K.simulationDefaults, ...state.project.simulation }, unit = K.driveRange(state.project).unit === '°' ? 'N·m' : 'N';
    modal('Pracovný priestor, vzhľad a simulácia', `<form id="settings-form"><div class="settings-fields">
      <fieldset class="skin-picker"><legend>Vzhľad aplikácie</legend><div>${[['slate', 'Slate & Indigo'], ['sage', 'Neutral Sage'], ['steel', 'Steel & Teal'], ['sand', 'Warm Sand & Coffee'], ['dark', 'Dark Mode']].map(([value, name]) => `<label class="skin-choice" data-skin="${value}"><input type="radio" name="theme" value="${value}"${state.theme === value ? ' checked' : ''}/><span class="skin-samples" aria-hidden="true"><i></i><i></i><i></i></span><strong>${name}</strong></label>`).join('')}</div><p>Vzhľad sa zmení a uloží hneď. Parametre simulácie potvrďte tlačidlom nižšie.</p></fieldset>
      <label class="property-field"><span>Spôsob simulácie</span><select name="simulation-mode" class="property-select"><option value="kinematic"${s.mode !== 'dynamic' ? ' selected' : ''}>Kinematika · predpísaný pohyb</option><option value="dynamic"${s.mode === 'dynamic' ? ' selected' : ''}>Odhadová dynamika · pohyb zo síl</option></select></label>
      <label class="check-row"><input name="return-on-release" type="checkbox"${s.returnOnRelease !== false ? ' checked' : ''}/>Po pustení v simulácii vrátiť mechanizmus silou pružín / piestov</label><label class="property-field"><span>Čas kinematického zdvihu (s)</span><input name="cycle" class="text-field" type="number" min="1" max="60" step=".5" value="${state.cycle}" required/></label>
      ${[['returnDamping', 'Dodatočné osové tlmenie pri návrate (N·s/m)', 0, 100000, .1], ['gravity', 'Gravitácia (m/s²)', 0, 100, .01], ['damping', `Tlmenie pohonu (${unit}·s/${unit === 'N' ? 'm' : 'rad'})`, 0, 1000000, .1], ['friction', `Suché trenie pohonu (${unit})`, 0, 1000000, .1], ['inputForce', `Vonkajšia sila / moment pohonu (${unit})`, -1000000, 1000000, .1], ['initialVelocity', `Počiatočná rýchlosť (${K.driveRange(state.project).unit}/s)`, -1000000, 1000000, .1], ['duration', 'Čas odhadovej dynamiky (s)', .1, 120, .1]].map(([name, label, min, max, step]) => `<label class="property-field"><span>${label}</span><input class="text-field" name="${name}" type="number" min="${min}" max="${max}" step="${step}" value="${s[name]}" required/></label>`).join('')}
      <label class="check-row"><input name="snap" type="checkbox"${state.snap ? ' checked' : ''}/><span>Prichytávať prvky na mriežku (5 mm)</span></label><label class="check-row"><input name="collisions" type="checkbox"${state.collisions ? ' checked' : ''}/><span>Kontrolovať kolízie v jednej rovine</span></label><label class="check-row"><input name="forceArrows" type="checkbox"${state.forceArrows ? ' checked' : ''}/><span>Zobraziť smerové šípky síl</span></label>
      <p class="section-description">Dynamika podporuje určený pohon, voľnú silovú zostavu a voliteľný pružný kontakt vačky. Pevné dorazy zostávajú predvolené; pružnosť, tlmenie a trenie nastavíte v Kontakt a dorazy. Časový program viacerých pohonov predpisuje pohyb nezávislých stôp. Hmotnosti nastavte v inšpektore jednotlivých telies.</p></div><div class="modal-actions"><button class="button button-secondary" type="button" data-action="export">Súbory, obrázky a report</button><button class="button button-secondary" type="button" data-action="fusion">Autodesk Fusion</button><button class="button button-dark" type="submit">Použiť nastavenia</button></div></form>`, true);
  }

  function fusionModal() {
    const available = ['http:', 'https:'].includes(location.protocol);
    modal('Lokálne prepojenie · Autodesk Fusion', `<p class="modal-description">Doplnok vytvorí nový, neuložený referenčný dokument. Existujúce návrhy nemení. Krivky sú fixované úsečky, kulisy majú strednice a voliteľné uzavreté referenčné obrysy; kóty sú referenčné popisy. Nejde o výrobný profil, 3D zostavu ani Fusion joints.</p>
      <ol class="fusion-steps"><li>Stiahnite a rozbaľte doplnok. Vo Fusion: Utilities → Scripts and Add-Ins → Add-Ins → šípka pri + → Script or add-in from device → priečinok KinmoFusion. Nevytvárajte nový prázdny doplnok.</li><li>Vyberte KinmoFusion a stlačte Run. Povoľte presný pôvod <code>${escape(available ? location.origin : 'HTTP(S) adresa aplikácie')}</code>.</li><li>Vložte nižšie dočasný párovací kľúč z Fusion. Povoľte lokálnu sieť, ak si ju prehliadač vyžiada.</li></ol>
      <a class="button button-secondary" href="./cad/KinmoFusion.zip" download${!available ? ' aria-disabled="true"' : ''}>Stiahnuť doplnok KinmoFusion (ZIP)</a>
      <form id="fusion-form"><label class="property-field"><span>Dočasný párovací kľúč (neukladá sa)</span><input class="text-field" name="key" type="password" autocomplete="off" minlength="20" maxlength="100" required/></label>
      <label class="check-row"><input id="cad-slot-outlines" type="checkbox"${state.cadSlotOutlines ? ' checked' : ''}/><span>Pridať uzavreté referenčné obrysy drážok podľa šírky</span></label><p class="section-description">Obrysy sa vložia do vrstiev SLOT_REFERENCE_OUTLINE / INNER. Strednice ostávajú vo vrstve SLOT. Pretínajúce sa alebo zrútené obrysy sa neodosielajú.</p>
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
    modal('Malé štúdio. Veľké možnosti.', `<p class="modal-description">Kliknite na uzol, člen alebo kruhovú značku väzby. Shift pridáva do výberu; Ctrl prepína prekryté entity; kliknutie na pozadie výber zruší. Pravé tlačidlo otvorí úpravy bez otvárania panelu vlastností.</p><div class="help-steps"><div><span>01</span><p><strong>Poskladajte model.</strong>Pretiahnite prvky na plátno alebo pravým tlačidlom pridajte bod a podzostavu. Nástrojom J spojte uzly.</p></div><div><span>02</span><p><strong>Dolaďte geometriu.</strong>Kontextová ponuka mení súradnice, typ väzby, fixáciu, pohon a limity. Člen možno rozdeliť stredovým otočným uzlom.</p></div><div><span>03</span><p><strong>Uveďte ho do pohybu.</strong>Simulácia vynúti väzby. Otočný pohon používa ω, lineárny v; tuhosť tuhého ramena je iba referenčný údaj.</p></div></div><div class="shortcut-grid">${[['Space', 'Prehrať / pozastaviť'], ['V / H', 'Výber / posun plátna'], ['J / M', 'Spojenie / meranie'], ['F', 'Ukotviť / uvoľniť vybrané uzly'], ['Shift + F', 'Prispôsobiť pohľad'], ['Shift + F10', 'Kontextová ponuka výberu'], ['Ctrl + S', 'Uložiť projekt'], ['Ctrl + Z', 'Späť'], ['Delete / Backspace', 'Odstrániť výber'], ['Esc', 'Zavrieť ponuku / zrušiť výber']].map(([key, label]) => `<div><kbd>${key}</kbd><span>${label}</span></div>`).join('')}</div><p class="help-disclaimer">Kolízie sú geometrické, v jednej 2D rovine. Aplikácia nenahrádza pevnostný výpočet ani overenie bezpečnosti fyzického výrobku. Pôvodné šablóny upravujte vo voľnej kópii.</p>`, true);
  }

  function tracePointOptions(element, point) {
    return (element ? I.pointKeys(element) : ['a']).map((key) => `<option value="${key}"${key === point ? ' selected' : ''}>${escape(K.pointName(key))}</option>`).join('');
  }
  function traceModal() {
    modal(isDoubleDrawer() ? 'Trajektórie v dvoch súradnicových sústavách' : 'Sledujte bod počas celého pohybu.', `${isDoubleDrawer() ? doubleTraceControls() : ''}<p class="modal-description">${isDoubleDrawer() ? 'Voľbou jedného bodu sa vypne spoločné sledovanie ložísk A a B.' : 'Vyberte prvok a jeho uzlový bod. Trajektória sa vypočíta v celom rozsahu pohonu.'}</p><form id="trace-form"><label class="property-field"><span>Prvok mechanizmu</span><select class="property-select" name="element">${state.project.elements.map((e) => `<option value="${escape(e.id)}"${e.id === state.traceRef.elementId ? ' selected' : ''}>${escape(e.name)}</option>`).join('')}</select></label><label class="property-field"><span>Referenčný bod</span><select class="property-select" name="point">${tracePointOptions(state.project.elements.find((e) => e.id === state.traceRef.elementId), state.traceRef.point)}</select></label><div class="modal-actions"><button class="button button-secondary" type="button" data-action="close-modal">Hotovo</button><button class="button button-dark" type="submit">${icon('trace', 16)}Sledovať jeden bod</button></div></form>`);
  }

  function elementModal() {
    const e = currentElement();
    if (!e) return;
    modal('Upraviť prvok', `<form id="element-name-form"><label class="property-field"><span>Názov prvku</span><input class="text-field" name="name" value="${escape(e.name)}" maxlength="80" required/></label><div class="modal-actions"><button class="button button-secondary" type="button" data-action="duplicate">${icon('copy', 16)}Duplikovať</button><button class="button button-dark" type="submit">Uložiť názov</button></div></form>`);
  }

  function nodeOptions(selected, curves = false, none = false, excludeElastic = false) {
    return `${none ? '<option value="">Voľný koniec · poloha prvku</option>' : ''}${state.project.elements.filter((e) => !excludeElastic || !K.isElastic(e)).flatMap((e) => {
      const pose = state.result.poses[e.id];
      const keys = [...I.pointKeys(e).filter((key) => pose?.[key]), ...(curves && ['slot', 'rail', 'cam'].includes(e.type) ? ['curve'] : [])];
      return keys.map((point) => `<option value="${escape(e.id)}|${point}"${selected?.elementId === e.id && selected.point === point ? ' selected' : ''}>${escape(e.name)} · ${point === 'curve' ? e.type === 'cam' ? 'obrys vačky' : 'dráha' : K.pointName(point)}</option>`);
    }).join('')}`;
  }
  const parseReference = (value) => {
    if (!value) return null;
    const [elementId, point] = value.split('|'); return { elementId, point };
  };

  function jointModal(id, defaults = {}) {
    const joint = state.project.connections.find((j) => j.id === id);
    const values = joint || defaults;
    if (joint?.builtin) {
      modal('Väzba parametrického modelu', `<p class="modal-description">Táto väzba patrí do analytickej šablóny. Zmena jej typu by zrušila pôvodný pohybový zákon. Vytvorte voľnú editačnú kópiu a upravte ju tam.</p><div class="modal-actions"><button class="button button-dark" data-action="make-editable">Vytvoriť voľnú kópiu</button></div>`);
      return;
    }
    modal(joint ? 'Upraviť kinematickú väzbu' : 'Pridať kinematickú väzbu', `<form id="joint-form" data-id="${escape(id || '')}">
      <label class="property-field"><span>Názov väzby</span><input class="text-field" name="name" maxlength="100" value="${escape(values.name || E.constraintNames[values.type] || 'Otočný kĺb')}" required/></label>
      <label class="property-field"><span>Typ väzby</span><select name="type" class="property-select">${Object.entries(E.constraintNames).map(([type, name]) => `<option value="${type}"${values.type === type ? ' selected' : ''}>${name}</option>`).join('')}</select></label>
      <label class="property-field"><span>Prvý uzol</span><select name="a" class="property-select">${nodeOptions(values.a || { elementId: state.selected, point: 'a' }, true)}</select></label>
      <label class="property-field"><span>Druhý uzol</span><select name="b" class="property-select">${nodeOptions(values.b, true)}</select></label>
      <label class="property-field"><span>Vzdialenosť (mm) alebo relatívny uhol (°)</span><input name="value" class="text-field" type="number" min="-360" max="5000" step=".1" value="${joint?.value || 0}" required/></label>
      <p class="section-description">Kĺb spojí dva body. Čap vo vedení spojí jeden bod s dráhou. Vačkový kontakt vyžaduje obrys vačky a stred ložiska; používa polomer valčeka a predpoklad trvalého dotyku bez odtrhnutia či kontaktných síl. Pevné spojenie vynúti aj relatívny uhol.</p>
      <div class="modal-actions"><button type="button" class="button button-secondary" data-action="tool-connect">Vybrať uzly na plátne</button><button class="button button-dark" type="submit">Uložiť väzbu</button></div></form>`);
  }

  function dimensionReferences(form, data) {
    const previous = state.project.dimensions.find((d) => d.id === form.dataset.id);
    const read = (key) => data.get(key) === `world-${key}` ? form.dataset[key === 'a' ? 'worldA' : 'worldB'] ? JSON.parse(form.dataset[key === 'a' ? 'worldA' : 'worldB']) : previous?.[key] : parseReference(String(data.get(key) || ''));
    return { a: read('a'), b: read('b') };
  }
  function startDimensionPick(form = null) {
    if (state.gifExport || state.magic && !magicWorking()) return;
    closeContextMenu();
    const data = form ? new FormData(form) : null, draft = form ? {
      id: form.dataset.id, name: data.get('name'), type: data.get('type'), offset: data.get('offset'), value: data.get('value'), fixedEnd: data.get('fixed-end'), driving: data.has('driving'),
    } : {};
    if (state.mode !== 'edit') setMode('edit');
    state.analysis = false; state.playing = false;
    state.dimensionPick = { a: null, draft, projectId: state.project.id, previousTool: state.tool === 'measure' ? 'select' : state.tool, previousMagicTool: state.magic?.tool };
    if (state.magic) { state.magic.tool = 'measure'; state.magic.drawing = []; state.magic.preview = null; state.magic.placementType = null; }
    state.tool = 'measure'; state.pendingJoint = null; state.measure = null; state.snapPreview = null; state.pendingSnap = null;
    if ($('#modal').open) $('#modal').close();
    updateToolbar(); renderScene(); $('#mechanism-canvas').focus({ preventScroll: true });
  }
  function cancelDimensionPick() {
    if (!state.dimensionPick) return;
    state.tool = state.dimensionPick.previousTool || 'select';
    if (state.magic) state.magic.tool = state.dimensionPick.previousMagicTool || 'select';
    state.dimensionPick = null; state.measure = null;
  }
  function pickDimensionPoint(event) {
    const pick = state.dimensionPick;
    if (!pick || pick.projectId !== state.project.id) { cancelDimensionPick(); return; }
    const r = I.reference(I.target(state.project, canvasHit(event))) || worldPoint(event), at = E.resolvePoint(state.result, r);
    if (!at) { toast('Vyberte platný bod kóty.', true); return; }
    if (!pick.a) {
      pick.a = K.copy(r); state.measure = { a: { ...at }, b: { ...at }, referenceA: K.copy(r) };
      updateToolbar(); renderScene(); return;
    }
    if (K.distance(E.resolvePoint(state.result, pick.a), at) < K.EPS) { toast('Body A a B musia byť na rôznych miestach.', true); return; }
    const draft = { ...pick.draft, a: pick.a, b: K.copy(r) };
    cancelDimensionPick(); updateToolbar(); renderScene(); dimensionModal(draft.id, draft);
  }
  function dimensionModal(id, draft = {}) {
    const dimension = state.project.dimensions.find((d) => d.id === id), refs = selectedNodeReferences();
    const a = draft.a || dimension?.a || refs[0] || { elementId: state.selected, point: 'a' }, b = draft.b || dimension?.b || refs[1] || { elementId: state.selected, point: a.point === 'b' ? 'a' : 'b' };
    const type = draft.type || dimension?.type || 'distance', measured = E.dimensionValue(state.result, { a, b, type });
    const value = draft.value ?? state.project.connections.find((j) => j.id === dimension?.constraintId)?.value ?? (dimension?.control?.property === 'stroke' ? state.project.elements.find((e) => e.id === dimension.control.elementId)?.stroke : measured) ?? 100;
    const driving = draft.driving ?? !!(dimension?.constraintId || dimension?.control), end = draft.fixedEnd || 'auto';
    modal(dimension ? 'Upraviť kótu' : 'Pridať rozmerovú kótu', `<form id="dimension-form" data-id="${escape(id || '')}" data-auto-value="${draft.value == null && !driving ? '1' : '0'}" data-world-a="${!a.elementId ? escape(JSON.stringify(a)) : ''}" data-world-b="${!b.elementId ? escape(JSON.stringify(b)) : ''}">
      <p class="modal-description">Vyberte uzly zo zoznamu alebo dva body na plátne. Výrazy: <code>300/2</code>, <code>12,5 cm</code>, <code>(20+5)*2 mm</code>. Bez jednotky sa použijú mm. Meracia kóta nemení geometriu.</p>
      <button type="button" class="button button-secondary full-width" data-action="dimension-pick">Vybrať body A a B na plátne</button>
      <label class="property-field"><span>Názov (voliteľný)</span><input class="text-field" name="name" maxlength="100" value="${escape(draft.name ?? dimension?.name ?? '')}"/></label>
      <label class="property-field"><span>Typ kóty</span><select class="property-select" name="type">${[['distance', 'Dĺžka medzi bodmi'], ['horizontal', 'Vodorovná vzdialenosť'], ['vertical', 'Zvislá vzdialenosť'], ['angle', 'Uhol spojnice voči osi X']].map(([kind, name]) => `<option value="${kind}"${type === kind ? ' selected' : ''}>${name}</option>`).join('')}</select></label>
      <label class="property-field"><span>Bod A</span><select name="a" class="property-select" required>${!a.elementId ? '<option value="world-a">Voľný bod A na plátne</option>' : ''}${nodeOptions(a)}</select></label>
      <label class="property-field"><span>Bod B</span><select name="b" class="property-select" required>${!b.elementId ? '<option value="world-b">Voľný bod B na plátne</option>' : ''}${nodeOptions(b)}</select></label>
      <output id="dimension-preview" class="dimension-preview" aria-live="polite">Aktuálne: ${fmt(measured, 3)} ${type === 'angle' ? '°' : 'mm'}</output>
      ${quantityInput('offset', 'Odsadenie popisu (mm)', draft.offset ?? dimension?.offset ?? 25, 'mm', -500, 500)}
      <label class="check-row"><input type="checkbox" name="driving"${driving ? ' checked' : ''}/><span>Riadiaca kóta, zmení rozmer telesa alebo pridá vzdialenostnú väzbu</span></label>
      ${quantityInput('value', 'Predpísaný rozmer (mm)', value, 'mm', .1, 5000)}
      <label class="property-field" id="dimension-fixed-end"><span>Pri zmene dĺžky zachovať bod telesa</span><select name="fixed-end" class="property-select">${[['auto', 'Automaticky (pevný bod alebo pivot pohonu)'], ['a', 'A'], ['b', 'B'], ['center', 'Stred A–B']].map(([key, label]) => `<option value="${key}"${end === key ? ' selected' : ''}>${label}</option>`).join('')}</select></label>
      <p class="section-description" id="dimension-help">Medzi telesami možno riadiť iba dĺžku. Vodorovná a zvislá kóta na jednom jednoduchom člene mení jeho dĺžku pri zachovaní uhla. Uhol a voľné body sú iba meracie. Obrysy upravte samostatne; vonkajšie väzby sa pri zmene rozmeru neposúvajú.</p>
      <div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zrušiť</button><button class="button button-dark" type="submit">Uložiť kótu</button></div></form>`);
    updateDimensionForm($('#dimension-form'));
  }
  function updateDimensionForm(form) {
    if (!form?.elements) return;
    const data = new FormData(form), { a, b } = dimensionReferences(form, data), type = String(data.get('type'));
    const sameBody = a?.elementId && a.elementId === b?.elementId;
    const allowed = a?.elementId && b?.elementId && type !== 'angle' && (type === 'distance' || sameBody);
    const driving = form.elements.namedItem('driving'), value = form.elements.namedItem('value');
    driving.disabled = !allowed; if (!allowed) driving.checked = false;
    value.disabled = !driving.checked;
    $('#dimension-fixed-end', form).hidden = !driving.checked || !sameBody || ![a?.point, b?.point].includes('b');
    const measured = E.dimensionValue(state.result, { a, b, type });
    $('#dimension-preview', form).textContent = `Aktuálne: ${fmt(measured, 3)} ${type === 'angle' ? '°' : 'mm'}`;
    if (form.dataset.autoValue === '1' && measured != null) value.value = Number(Math.max(.1, measured).toFixed(4));
  }
  function submitDimension(form, data) {
    const next = W.applyDimension(state.project, state.result, { ...dimensionReferences(form, data), id: form.dataset.id, type: String(data.get('type')), name: data.get('name'), offset: data.get('offset'), driving: data.has('driving'), value: data.get('value'), fixedEnd: data.get('fixed-end') });
    if (JSON.stringify(next) !== JSON.stringify(state.project)) { state.dimensions = true; applyProject(next); }
    $('#modal').close(); renderScene();
  }

  function geometryModal(outline = false) {
    const e = currentElement();
    if (!e || e.primary) return;
    const points = outline ? e.outline || [] : e.controls;
    modal(outline ? 'Upraviť obrys telesa' : 'Upraviť body vodiacej dráhy', `<form id="geometry-form" data-outline="${outline}">
      <p class="modal-description">Lokálne súradnice v mm, jeden vrchol na riadok vo formáte <code>X;Y</code>. Pridaním alebo odstránením riadka meníte počet bodov. ${outline ? 'Prázdny zoznam obnoví štandardný tvar. Obrys sa používa na kreslenie a CAD, nie na presnú plošnú kolíziu.' : 'Lomená čiara zachová všetky zadané body. Výsledná trajektória je odvodená z väzieb, nie ručne upravená dráha pohybu.'}</p>
      <label class="property-field"><span>${outline ? 'Vrcholov 3–64, alebo prázdny obrys' : e.curveSemicircle ? 'Presne 2 koncové body polkruhu' : `Bodov ${e.curveKind === 'spline' ? '4' : '2'}–${e.curveKind === 'polyline' ? '1001' : '32'}`}</span><textarea name="points" class="geometry-points" spellcheck="false" rows="12">${escape(points.map((p) => `${Number(p.x.toFixed(3))};${Number(p.y.toFixed(3))}`).join('\n'))}</textarea></label>
      <div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zrušiť</button><button class="button button-dark" type="submit">Použiť body</button></div></form>`, true);
  }

  function savedTraceModal(id, referenceOverride = null) {
    const track = state.project.trajectories.find((t) => t.id === id);
    const reference = referenceOverride || track?.reference || { elementId: state.selected || state.traceRef.elementId, point: $('#trace-point')?.value || state.traceRef.point };
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
    'magic-perspective':perspectiveModal,
    'magic-perspective-pick':(el,event)=>{const m=state.magic,rect=el.getBoundingClientRect(),i=(state.perspectivePick||0)%4,form=$('#advanced-perspective-form');form.elements['x'+i].value=K.clamp((event.clientX-rect.left)/rect.width*m.image.width,0,m.image.width);form.elements['y'+i].value=K.clamp((event.clientY-rect.top)/rect.height*m.image.height,0,m.image.height);state.perspectivePick=i+1;$('#perspective-marks').innerHTML=Array.from({length:4},(_,j)=>{const x=Number(form.elements['x'+j].value)/m.image.width*100,y=Number(form.elements['y'+j].value)/m.image.height*100;return `<circle cx="${x}" cy="${y}" r="1.2" fill="#c64a24"/><text x="${x+2}" y="${y+3}" font-size="4" fill="#c64a24">${j+1}</text>`;}).join('');$('#perspective-progress').textContent=i===3?'Štyri rohy vybrané':'Roh '+(i+2)+' zo 4';},
    'detect-motion-group':el=>{try{const group=window.KinmoAdvanced.motionGroups(state.magic.detectCandidates)[Number(el.dataset.index)];if(group){pushDetectionHistory();state.magic.detectCandidates=WF.mergeCandidates(state.magic.detectCandidates,group.ids);state.magic.detectNote='Skontrolujte vonkajší obal navrhnutého spoločného telesa pred vložením.';renderMagicImport();renderScene();}}catch(error){toast(error.message,true);}},
    'detect-motion-confirm':el=>{const c=state.magic.detectCandidates.find(c=>c.id===el.dataset.id);if(c){pushDetectionHistory();c.confirmedMotion=c.motionEvidence;renderMagicImport();}},
    'lesson-start':el=>startLesson(el.dataset.kind),
    'lesson-next':()=>{if(state.lesson){if(state.lesson.index>=3)state.lesson=null;else state.lesson.index++;renderLesson();}},
    'lesson-close':()=>{state.lesson=null;renderLesson();},
    'group-select':()=>{const group=currentElement()?.group;if(group){state.selectedElementIds=state.project.elements.filter(e=>e.group===group).map(e=>I.elementKey(e.id));repairSelection();renderScene();$('#modal').close();}},
    'group-visibility':()=>{const group=currentElement()?.group;if(group){const p=K.copy(state.project),members=p.elements.filter(e=>e.group===group),visible=!members.every(e=>e.visible);for(const e of members)e.visible=visible;applyProject(p);$('#modal').close();}},
    'advanced-open':el=>advancedModal(el.dataset.tab),
    'hub-detach':el=>{const key=I.jointKey(el.dataset.id);editCanvas(I.deleteSelection(state.project,[key],state.result),'Odpojil sa iba zvolený spoj.');advancedModal('hub');},
    'measurement-clear':()=>{state.measurements=[];state.measureRuntime=[];state.measureTime=0;advancedModal('measure');},
    'measurement-plot':measurementPlot,
    'measurement-seek':el=>{const i=Number(el.dataset.index),r=state.measurements[i];if(!r)return;state.playing=false;state.mode='simulate';state.motion=r.motion;state.dynamic=K.copy(state.measureRuntime[i]);state.result={...solveCurrent(),forces:K.copy(r.forces)};renderScene();updateMotion();$('#modal').close();},
    'measurement-csv':()=>{const id=$('#measure-member').value,metric=$('#measure-metric').value,rows=window.KinmoAdvanced.series(state.measurements||[],id,metric);download('meranie.csv','cas_s;'+metric+'\r\n'+rows.map(r=>r.time+';'+r.value).join('\r\n'),'text/csv');},
    'variant-apply':el=>{const v=state.variantDraft?.[Number(el.dataset.index)];if(v){applyProject(v.project);$('#modal').close();}},
    'automatic-review':el=>{const entry=readAutomaticVersions().find(v=>v.id===el.dataset.id);if(!entry)return;state.automaticDraft=entry;const changed=entry.project.elements.filter(e=>JSON.stringify(e)!==JSON.stringify(state.project.elements.find(v=>v.id===e.id))),removed=state.project.elements.filter(e=>!entry.project.elements.some(v=>v.id===e.id));modal('Rozdiely automatickej verzie',`<p>${changed.length} zmenených alebo obnovených prvkov; ${removed.length} novších prvkov sa odstráni; väzby ${state.project.connections.length} → ${entry.project.connections.length}.</p><ul>${changed.map(e=>`<li>Obnoviť: ${escape(e.name)}</li>`).join('')}${removed.map(e=>`<li>Odstrániť: ${escape(e.name)}</li>`).join('')}</ul><button class="button button-dark" data-action="automatic-restore">Obnoviť túto verziu (možno vrátiť Späť)</button>`,true);},
    'automatic-restore':()=>{if(state.automaticDraft){applyProject(state.automaticDraft.project);$('#modal').close();}},

    'simulation-pause':()=>{state.playing=false;updateMotion();toast('Simulácia je pozastavená v zobrazenej polohe.');},
    'simulation-design':()=>{state.playing=false;state.dynamic=null;state.forceContext=null;state.dynamicHistory=[];state.planTime=0;state.trial=null;state.trialBlock=null;setMode('edit');setMotion(K.driveRange(state.project).min);},
    'simulation-bake':()=>{state.playing=false;try{if(state.project.kind!=='custom'){toast('Najskôr vytvorte voľnú kópiu šablóny.',true);return;}editCanvas(WF.bakePose(state.project,state.result),'Zobrazená poloha bola uložená do návrhu.');setMotion(K.driveRange(state.project).min);}catch(error){toast(error.message,true);}},
    'repair-model':repairModel,
    'repair-range-apply':()=>{const draft=state.pendingRangeRepair;if(!draft||draft.revision!==JSON.stringify(state.project)){toast('Projekt sa zmenil. Návrh vytvorte znova.',true);return;}applyProject(draft.next);state.pendingRangeRepair=null;$('#modal').close();},
    'reference-calibrate':referenceCalibrationModal,
    'reference-calibration-pick':pickReferenceCalibration,
    'elastic-response':()=>{try{elasticResponseModal();}catch(error){toast(error.message,true);}},
    'response-preset':el=>{try{applyResponsePreset(el.dataset.preset);}catch(error){toast(error.message,true);}},
    'response-apply':()=>{try{const draft=state.responseDraft,form=$('#elastic-response-form');if(!draft||draft.revision!==JSON.stringify(state.project))throw new Error('Projekt sa zmenil. Náhľad otvorte znova.');const next=K.copy(state.project),e=next.elements.find(e=>e.id===draft.id);e.damping=quantityValue(new FormData(form),'damping','',0,100000);e.dampingCompression=e.damping;e.dampingExtension=e.damping;applyProject(next);$('#modal').close();}catch(error){toast(error.message,true);}},

    'magic-import': startMagicImport,
    'magic-upload': () => pickMagicImage(),
    'magic-confirm-image': () => pickMagicImage(true),
    'magic-back': () => { if (state.magic) setMagicStep(state.magic.step === 2.5 ? 2 : state.magic.step === 3 && state.magic.detectEnabled ? 2.5 : state.magic.step - 1); },
    'magic-next': nextMagicStep,
    'magic-confirm-scale': () => { try { applyMagicScale(); } catch (error) { toast(error.message, true); } },
    'reference-toggle': () => { if (!state.project.importReference) { $('#reference-file').click(); return; } const p = K.copy(state.project); p.importReference.visible = !p.importReference.visible; applyProject(p); },
    'reference-settings': referenceSettings,
    'reference-replace': () => $('#reference-file').click(),
    'freedom-toggle': () => { state.showFreedom = !state.showFreedom; state.freedomCache = null; renderScene(); },
    'trial-toggle': toggleTrial,
    'mechanism-kit': kitModal,
    'motion-plan': motionPlanModal,
    'plan-pick': (el) => { readPlanDraft(); state.phasePick = { index: Number(el.dataset.index), end: el.dataset.end, mode: state.mode, motion: state.motion, timeline: state.timelineVisible }; state.pendingPlanDraft = K.copy(state.planDraft); $('#modal').close(); state.timelineVisible = true; setMode('simulate'); updateToolbar(); renderScene(); toast('Potiahnite mechanizmus alebo nastavte polohu posuvníkom a stlačte Použiť polohu.'); },
    'plan-pick-done': () => { const pick = state.phasePick; if (!pick) return; state.pendingPlanDraft[pick.index][pick.end] = state.motion; if (pick.index + 1 < state.pendingPlanDraft.length) state.pendingPlanDraft[pick.index + 1].from = state.motion; state.timelineVisible = pick.timeline; state.phasePick = null; setMode(pick.mode); updateToolbar(); renderScene(); motionPlanModal(); },
    'plan-pick-cancel': () => { const pick = state.phasePick; if (!pick) return; state.timelineVisible = pick.timeline; state.phasePick = null; setMode(pick.mode); setMotion(pick.motion); updateToolbar(); renderScene(); motionPlanModal(); },
    'plan-add': () => { readPlanDraft(); if (state.planDraft.length >= 12) return; const last = state.planDraft.at(-1); state.planDraft.push({ name: `Fáza ${state.planDraft.length + 1}`, from: last?.to ?? K.driveRange(state.project).min, to: K.driveRange(state.project).max, duration: 2, easing: 'smooth' }); renderPlanRows(); },
    'plan-remove': (el) => { readPlanDraft(); state.planDraft.splice(Number(el.dataset.index), 1); renderPlanRows(); },
    'plan-capture': (el) => { readPlanDraft(); state.planDraft[Number(el.dataset.index)][el.dataset.end] = state.motion; renderPlanRows(); },
    'magic-pose-add': () => { if (!state.magic?.busy) $('#magic-pose-file').click(); },
    'magic-pose-align': (el) => { state.magic.poseIndex = Number(el.dataset.index); magicPoseAlignment(); },
    'magic-pose-remove': (el) => { const m = state.magic, removed = m.poses.splice(Number(el.dataset.index), 1)[0]; URL.revokeObjectURL(removed.image.url); m.detectNote = 'Poloha odstránená. Spustite detekciu znova.'; renderMagicImport(); },
    'pose-pick': (el, event) => { const rect = el.getBoundingClientRect(), key = state.magic.posePick++ % 2 ? 'b' : 'a'; const form = $('#pose-alignment-form'); const width = Number(el.dataset.width), height = Number(el.dataset.height), scale = Math.min(rect.width / width, rect.height / height); form.elements[key + 'x'].value = K.clamp((event.clientX - rect.left - (rect.width - width * scale) / 2) / scale, 0, width); form.elements[key + 'y'].value = K.clamp((event.clientY - rect.top - (rect.height - height * scale) / 2) / scale, 0, height); },
    'detect-edit': editDetection,
    'detect-fixed': (el) => { const m = state.magic, c = m.detectCandidates.find((v) => v.id === el.dataset.id); pushDetectionHistory(); c.type = 'ground'; c.selected = true; renderMagicImport(); renderScene(); },
    'detect-undo': () => undoDetection(),
    'detect-redo': () => undoDetection(true),
    'detect-outline': () => { const m = state.magic; m.tool = 'detect-outline'; m.drawing = []; renderMagicImport(); renderScene(); },
    'detect-outline-finish': () => { try { commitDetectionOutline(); } catch (error) { toast(error.message, true); } },
    'detect-merge': () => { const m = state.magic; try { const next = WF.mergeCandidates(m.detectCandidates, m.detectCandidates.filter((c) => c.selected).map((c) => c.id)); pushDetectionHistory(); m.detectCandidates = next; m.detectEditId = next.at(-1).id; m.tool = 'detect-edit'; renderMagicImport(); renderScene(); } catch (error) { toast(error.message, true); } },
    'detect-delete': (el) => { const m = state.magic; pushDetectionHistory(); m.detectCandidates = m.detectCandidates.filter((c) => c.id !== el.dataset.id); renderMagicImport(); renderScene(); },
    'detect-hole': (el) => { const m = state.magic, c = m.detectCandidates.find((c) => c.id === el.dataset.id); pushDetectionHistory(); if (el.dataset.role === 'pin') { c.type = 'bearing'; c.selected = true; c.featureRole = 'pin'; } else { const host = m.detectCandidates.find((v) => v.id === m.detectEditId && v.points.length > 1); if (!host) { toast('Najskôr vyberte Upraviť na telese, ku ktorému otvor patrí.', true); return; } host.anchors ||= []; if (host.anchors.length >= 24) { toast('Najviac 24 montážnych bodov.', true); return; } host.anchors.push({ ...c.points[0], radius: c.radius }); host.useAnchors = true; c.selected = false; c.featureRole = 'hole'; } renderMagicImport(); renderScene(); },
    'magic-detect': () => runMagicDetection(),
    'magic-detect-reset': () => { $('#modal').close(); runMagicDetection(true); },
    'magic-detection-region': () => selectMagicDetectionRegion(),
    'magic-detection-whole': () => selectMagicDetectionRegion(true),
    'magic-stop-detection': () => state.magic?.detectController?.abort(),
    'magic-apply-detection': applyMagicDetection,
    'magic-skip-detection': () => setMagicStep(3),
    'magic-step': (el) => setMagicStep(Number(el.dataset.step)),
    'magic-tool': (el) => selectMagicTool(el.dataset.tool),
    'magic-close-outline': () => { try { commitMagicDrawing(); } catch (error) { toast(error.message, true); } },
    'magic-clear-drawing': clearMagicDrawing,
    'magic-reset-points': () => { if (state.magic) { state.magic.points = []; if (!state.magic.geometryStarted) state.magic.scale = null; renderMagicImport(); renderMagicReference(); } },
    'magic-cancel': () => cancelMagicImport(),
    'magic-confirm-cancel': () => cancelMagicImport(true),
    'magic-motor': () => {
      const reference = selectedNodeReferences()[0] || (state.selected ? { elementId: state.selected, point: 'a' } : null);
      const e = state.project.elements.find((e) => e.id === reference?.elementId);
      if (!e || e.parentId || !['link', 'panel', 'rail', 'node'].includes(e.type)) { toast('Najskôr vyberte vlastné rameno, čelo, vedenie alebo samostatný bod.', true); return; }
      canvasDialog('motor', reference);
    },
    'magic-export-draft': () => exportFile('kinmo'),
    'magic-export-original': () => { if (state.magic) download('povodny-projekt.kinmo', X.serializeNative(state.magic.original.project, { workspace: state.magic.original, motion: state.magic.original.motion }), 'application/json'); },
    'save': () => saveProject(),
    'export': exportModal,
    'export-json': () => exportFile('json'),
    'export-kinmo': () => exportFile('kinmo'),
    'export-dxf': () => exportFile('dxf'),
    'export-forces': () => exportFile('forces'),
    'export-html': () => exportFile('html'),
    'export-pdf': () => exportFile('pdf'),
    'export-png': () => exportFile('png'),
    'export-gif': gifModal,
    'cancel-gif': cancelGIF,
    'export-csv': () => exportFile('csv'),
    'export-svg': () => exportFile('svg'),
    'import': () => $('#import-file').click(),
    'projects': projectsModal,
    'duplicate-project': (el) => duplicateProject(el.dataset.id || state.project.id),
    'duplicate-prepared': () => duplicateProject(null, true),
    'delete-project': (el) => deleteProjectModal(el.dataset.id),
    'confirm-project-delete': confirmProjectDelete,
    'assemblies': () => assembliesModal(),
    'revisions': () => revisionsModal(),
    'save-assembly': () => recordSaveModal('assembly'),
    'save-revision': () => recordSaveModal('revision'),
    'insert-library': (el) => { try { insertLibraryModal(el.dataset.id); } catch (error) { toast(error.message, true); } },
    'open-library-project': (el) => {
      try {
        const record = collectionRecord('assembly', el.dataset.id), imported = X.parseNative(record.file);
        imported.project.id = K.uid(); imported.project.name = `${record.name} · kópia`;
        replaceProject(imported.project, imported);
      } catch (error) { toast(error.message, true); }
    },
    'export-workbench-draft': () => {
      try {
        const form = $('#workbench-save-form'), record = draftRecord(form, new FormData(form));
        exportCollection(form.dataset.kind, [record], record.name);
      } catch (error) { toast(error.message, true); }
    },
    'export-collection': (el) => { try { exportCollection(el.dataset.kind); } catch (error) { toast(error.message, true); } },
    'export-record': (el) => { try { const record = collectionRecord(el.dataset.kind, el.dataset.id); exportCollection(el.dataset.kind, [record], record.name); } catch (error) { toast(error.message, true); } },
    'import-collection': (el) => { const input = $('#workbench-import-file'); input.dataset.kind = el.dataset.kind; input.click(); },
    'restore-revision': (el) => { try { restoreRevisionModal(el.dataset.id); } catch (error) { toast(error.message, true); } },
    'confirm-revision-restore': () => { try { confirmRevisionRestore(); } catch (error) { toast(error.message, true); } },
    'compare-revisions': () => { try { comparisonModal(); } catch (error) { toast(error.message, true); } },
    'delete-record': (el) => { try { deleteRecordModal(el.dataset.kind, el.dataset.id); } catch (error) { toast(error.message, true); } },
    'confirm-record-delete': () => { try { confirmRecordDelete(); } catch (error) { toast(error.message, true); } },
    'load-double-drawer': () => replaceProject(DD.create()),
    'project-info': projectInfoModal,
    'help': helpModal,
    'settings': settingsModal,
    'main-dimensions': () => { state.mainDimensions=!state.mainDimensions; renderScene(); $('[data-action="main-dimensions"]').setAttribute('aria-pressed',String(state.mainDimensions)); if (state.mainDimensions) { fitView(); renderScene(); } updateToolbar(); },
    'dimensions-overview': dimensionsOverview,
    'explain-movement': explainMovement,
    'cycle-review': reviewCycle,
    'cycle-position': (el) => { const review=state.cycleReview;if(!review||review.revision!==JSON.stringify(state.project)){toast('Model sa zmenil. Zopakujte kontrolu.',true);return;} const failure=review.review.failures[Number(el.dataset.index)];if(!failure)return;$('#modal').close();state.mode='simulate';setMotion(failure.motion);if(failure.keys[0])selectTarget(failure.keys[0]);state.diagnosticsOpen=true;renderScene();updateToolbar(); },
    'explain-focus': (el) => { $('#modal').close(); selectTarget(el.dataset.key); state.diagnosticsOpen=true; state.showFreedom=true; renderScene(); if (el.dataset.kind==='joint') { const t=I.target(state.project,el.dataset.key); if(t?.joint&&!t.joint.builtin)jointModal(t.joint.id); } else propertiesOverview(); },
    'mobile-handles': () => { state.mobileHandles = !state.mobileHandles; renderScene(); },
    'mobile-tools': () => mobileToolsModal(),
    'mobile-workflow': () => mobileToolsModal('workflow'),
    'mobile-selection': () => mobileToolsModal('selection'),
    'properties-overview': propertiesOverview,
    'open-full-properties': () => { $('#modal').close();setInspectorOpen(true); },
    'element-limits': () => { const r=selectionReference();if(r)canvasDialog('limits',r); },
    'detect-review-edit': (el) => { $('#modal').close();state.magic.review=null;state.magic.showImage=true;state.magic.tool='select';state.magic.detectEditing=el.dataset.id;renderMagicImport();renderScene();actions['detect-edit']({dataset:{id:el.dataset.id}}); },
    'construction': constructionModal,
    'issue-report': issueModal,
    'connection-type': (el) => { const d=state.connectionReview;if(d){previewConnection(d.a,d.b,el.dataset.type,d.snap,true);if(state.connectionReview){state.connectionReview.snap=d.snap;state.connectionReview.transaction=d.transaction;}} },
    'diagnostics': () => { state.diagnosticsOpen = !state.diagnosticsOpen; state.diagnosticAnalysis = null; renderScene(); updateToolbar(); },
    'select-diagnostic': (el) => selectTarget(el.dataset.key),
    'edit-numbers': () => transformModal('move'),
    'edit-rotation': () => transformModal('rotate'),
    'edit-pivot': () => transformModal('pivot'),
    'edit-thickness': () => transformModal('thickness'),
    'edit-length': () => transformModal('length'),
    'smart-snap': toggleSmartSnap,
    'selection-settings': () => { renderBindingTools(); const content = $('#binding-tools').innerHTML; if (content) modal('Spojenia a uloženie', `<div class="binding-dialog">${content}</div>`); },
    'selection-connect': beginSelectedConnection,
    'selection-support': () => { const target = I.target(state.project, state.selectedElementIds.at(-1)); if (!target?.element) return; try { const next = target.type === 'node' ? I.toggleFixed(state.project, [I.reference(target)], state.result) : I.toggleBodyFixed(state.project, target.elementId, state.result); reviewImpact(next, 'Uloženie bolo zmenené.'); } catch (error) { toast(error.message, true); } },
    'selection-rail': (el) => { const r = selectionReference(); if (r) try { editCanvas(I.setRailMotion(state.project, r.elementId, el.dataset.moving === 'true', state.result), 'Uloženie vedenia bolo zmenené. Lineárny pohon riadi zvolenú časť.'); } catch (error) { toast(error.message, true); } },
    'selection-motor': () => { const r = selectionReference(); if (r) canvasDialog('motor', r); },
    'check-model': focusModelCheck,
    'snap-preview': (el) => { const s=state.pendingSnap;if(s)previewConnection(s.source.ref||{elementId:s.source.elementId,point:'a'},s.target.ref||{elementId:s.target.elementId,point:'a'},el.dataset.type,s,true); },
    'snap-connect': (el) => { const snap=state.pendingSnap;if(!snap)return;const a=snap.source.ref||{elementId:snap.source.elementId,point:'a'},b=snap.target.ref||{elementId:snap.target.elementId,point:'a'};previewConnection(a,b,el.dataset.type,snap);if(state.connectionReview){state.connectionReview.snap=K.copy(snap);state.connectionReview.transaction=state.snapTransaction;} },
    'snap-position': dismissSnapChoices,
    'placement-cancel': () => setTool('select'),
    'placement-mount': (el) => { state.placementMount = el.dataset.point; state.placementPreview = null; const type = state.draggedPaletteType || state.insertingType || state.magic?.placementType; if (type) state.snapPreview = placementAt(type, state.pointer).preview; renderSmartSnapPreview(); renderPlacementTools(); },
    'grid-snap': toggleGridSnap,
    'angle-snap': toggleAngleSnap,
    'cam-follower': () => { const e = currentElement(); if (e?.type === 'cam') try { editCanvas(I.addCamFollower(state.project, e.id, state.result), 'Vedený valček bol pridaný. Priraďte vačke otočný pohon.'); } catch (error) { toast(error.message, true); } },
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
      if (state.analysis) renderAnalysis();
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
    'dimension-pick': (el) => startDimensionPick(el.closest('form')),
    'delete-dimension': (el) => editCanvas(I.deleteSelection(state.project, [I.dimensionKey(el.dataset.id)], state.result), 'Kóta bola odstránená.'),
    'edit-path': () => geometryModal(false),
    'edit-outline': () => geometryModal(true),
    'save-trace': () => savedTraceModal(),
    'edit-trace': (el) => savedTraceModal(el.dataset.id),
    'delete-trace': (el) => { pushHistory(); state.project.trajectories = state.project.trajectories.filter((t) => t.id !== el.dataset.id); changed(false); },
    'trace-to-path': (el) => {
      try {
        const track = state.project.trajectories.find((t) => t.id === el.dataset.id), e = E.materializeTrajectory(state.project, track, state.samples);
        pushHistory(); state.project.elements.push(e); state.selectedElementIds = [I.elementKey(e.id)]; state.mode = 'edit'; changed(false); $('#modal').close();
        toast('Vodiaca krivka je samostatný editovateľný prvok. Pôvodná trajektória zostala zachovaná.');
      } catch (error) { toast(error.message, true); }
    },
    'close-modal': () => { cancelGIF(); $('#modal').close(); },
    'rename': () => modal('Dajte nápadu meno.', `<form id="rename-form"><label class="property-field"><span>Názov projektu</span><input class="text-field" name="name" value="${escape(state.project.name)}" maxlength="80" required autofocus/></label><div class="modal-actions"><button class="button button-secondary" type="button" data-action="close-modal">Zrušiť</button><button class="button button-dark" type="submit">Premenovať</button></div></form>`),
    'load-template': (el) => replaceProject(K.preset(el.dataset.kind)),
    'load-saved': (el) => {
      try { const p = readProjects().find((p) => p.id === el.dataset.id); replaceProject(K.validateProject(p)); } catch (error) { toast(error.message, true); }
    },
    'confirm-replace': () => { if (state.pendingProject) { loadProject(state.pendingProject, state.pendingImport); state.pendingProject = null; state.pendingImport = null; } },
    'undo': () => undo(),
    'redo': () => undo(true),
    'force-motion': () => {
      const next = K.copy(state.project); next.simulation.mode = next.simulation.mode === 'dynamic' ? 'kinematic' : 'dynamic'; next.simulation.returnOnRelease = next.simulation.mode === 'dynamic';
      applyProject(next);
      if (next.simulation.mode === 'dynamic') { toast('Pohyb zo síl je zapnutý. Spustite simuláciu; parametre hmotnosti a tlmenia upravíte vo Vlastnostiach.'); actions.play(); }
    },
    'piston-fit': () => {
      const next = K.copy(state.project), e = next.elements.find((e) => e.id === state.selected);
      if (!e?.type.startsWith('piston-')) return;
      try {
        if (K.elasticMount(next, e, 'a') || K.elasticMount(next, e, 'b')) K.fitMountedPistons(next, [e.id], state.motion);
        else K.resizePiston(e, state.result.poses[e.id]?.length || e.length);
        applyProject(next);
      } catch (error) { toast(error.message, true); }
    },
    'play': () => {
      if (!state.project.elements.length) return;
      if (state.analysis) setWorkspaceView(false);
      if (state.mode === 'edit') setMode('simulate');
      if (!state.playing && state.project.simulation.mode !== 'dynamic' && state.project.motionPlan?.phases.length && !state.planTime) { state.direction = 1; setMotion(state.project.motionPlan.phases[0].from); }
      if (!state.playing && state.result.blocked && state.project.elements.some((e) => K.isElastic(e) && e.rangeMode !== 'manual')) {
        const next = K.fitElasticRanges(K.copy(state.project), null, state.result);
        if (JSON.stringify(next) !== JSON.stringify(state.project)) applyProject(next);
      }
      if (!state.playing && state.result.blocked) { toast(`Pohon nemožno spustiť: ${state.result.issues[0]}`, true); return; }
      if (!state.playing && state.project.simulation.mode === 'dynamic') {
        if (!state.forceContext && !prepareForces(true)) return;
        if (!state.dynamic || state.dynamic.stopped) {
          state.dynamic = P.initialState(state.forceContext, state.motion);
          state.dynamicHistory = [{ ...state.dynamic }];
        }
      }
      const range = K.driveRange(state.project);
      if (!state.project.motionPlan?.phases.length) { if (state.motion >= range.max - 0.01) state.direction = -1; if (state.motion <= range.min + 0.01) state.direction = 1; }
      state.playing = !state.playing; lastFrame = 0; updateMotion();
    },
    'reset': () => {
      const range = K.driveRange(state.project);
      state.direction = (state.project.elements.find((e) => e.drive)?.driveSpeed ?? 1) < 0 ? -1 : 1;
      state.planTime = 0; setMotion(state.project.motionPlan?.phases[0]?.from ?? (state.direction < 0 ? range.max : range.min));
    },
    'phase': (el) => { setMotion(Number(el.dataset.value)); const phases = state.project.motionPlan?.phases; if (phases?.length) { const index = Number(el.dataset.index); state.planTime = phases.slice(0, index).reduce((sum, p) => sum + p.duration, 0); state.direction = index === phases.length ? -1 : 1; } },
    'loop': () => { state.loop = !state.loop; updateToolbar(); },
    'profileVisible': () => toggleViewPanel('profileVisible'),
    'timelineVisible': () => toggleViewPanel('timelineVisible'),
    'labels': () => { state.labels = !state.labels; updateToolbar(); renderScene(); },
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
    'view-editor': () => setWorkspaceView(false),
    'view-analysis': () => setWorkspaceView(true),
    'analysis-pose': (el) => { setWorkspaceView(false); setMode('simulate'); setMotion(Number(el.dataset.value)); },
    'analysis-member': (el) => { setWorkspaceView(false); selectElement(el.dataset.id); },
    'sidebar-elements': () => { state.sidebarTab = 'elements'; renderTree(); },
    'sidebar-joints': () => { state.sidebarTab = 'joints'; renderTree(); },
    'inspector-geometry': () => { state.inspectorTab = 'geometry'; renderInspector(); },
    'inspector-joints': () => { state.inspectorTab = 'joints'; renderInspector(); },
    'toggle-inspector': () => setInspectorOpen(!state.inspectorOpen),
    'close-inspector': () => setInspectorOpen(false),
    'toggle-sidebar': () => $('.sidebar').classList.toggle('mobile-open'),
    'add-menu': () => {
      if (state.sidebarTab === 'joints') { setTool('connect'); return; }
      modal('Pridať prvok do modelu', `<div class="add-component-grid">${K.TYPES.map((type) => `<button data-action="add-component" data-type="${type}"><span class="component-symbol ${type}">${icon(typeIcons[type], 26)}</span><span>${escape(typeNames[type])}</span>${icon('plus', 16)}</button>`).join('')}</div>`);
    },
    'add-component': (el) => { addElement(el.dataset.type); $('#modal').close(); },
    'duplicate': () => { duplicateElement(); $('#modal').close(); },
    'delete': deleteElement,
    'confirm-canvas-delete': () => { deleteSelected(state.pendingDeleteKeys || [], true); state.pendingDeleteKeys = null; $('#modal').close(); },
    'canvas-add-guide': () => {
      const form = $('#canvas-edit-form'), r = I.reference(I.target(state.project, form?.dataset.reference));
      if (!r) return;
      try {
        const next = K.copy(state.project), at = K.point(state.result, r), guide = { ...K.makeElement('rail', at.x, at.y), drive: false, locked: true };
        next.elements.push(guide); editCanvas(next, 'Lineárne vedenie bolo pridané.'); canvasDialog('joint', r, 'prismatic');
      } catch (error) { toast(error.message, true); }
    },
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
    const key = input.dataset.property, scope = input.dataset.scope;
    let value;
    try {
      value = W.parseNumber(input.value, input.dataset.quantity ?? (['angle', 'driveAngle'].includes(key) ? '°' : 'mm'));
      if (value < Number(input.min || -Infinity) || value > Number(input.max || Infinity) || !input.checkValidity()) throw new Error('Zadajte platnú hodnotu v povolenom rozsahu.');
    } catch (error) { toast(error.message, true); renderInspector(); return; }
    let next = K.copy(state.project);
    if (scope === 'control') {
      if (!next.controls) next.controls = K.defaultControls(next.parameters);
      const [i, axis] = key.split('-'); next.controls[Number(i)][axis] = value;
    } else if (scope === 'element-control') {
      const [i, axis] = key.split('-');
      const e = next.elements.find((e) => e.id === state.selected);
      e.controls[Number(i)][axis] = value;
      if (e.curveSemicircle) e.curveRadius = K.distance(e.controls[0], e.controls[1]) / 2;
    } else if (scope === 'local-c') {
      next.elements.find((e) => e.id === state.selected).localC[key] = value;
    } else if (scope === 'element') {
      const element = next.elements.find((e) => e.id === state.selected);
      if (key === 'length' && !element.primary && !element.locked && !element.outline.length && ['link', 'panel', 'rail', 'ground'].includes(element.type)) {
        try { next = W.setLength(next, element.id, value, W.preferredEnd(next, element.id), state.result); }
        catch (error) { toast(error.message, true); renderInspector(); return; }
      } else if ((key === 'length' || key === 'maxLength') && element.type.startsWith('piston-')) {
        try { K.resizePiston(element, value); } catch (error) { toast(error.message, true); renderInspector(); return; }
      } else if (key === 'curveRadius' && element.curveSemicircle) {
        try { next = I.semicircle(next, element.id, value, element.curveSide, state.result); }
        catch (error) { toast(error.message, true); renderInspector(); return; }
      } else element[key] = value;
      if (K.isElastic(element) && ['minLength', 'maxLength'].includes(key)) element.rangeMode = 'manual';
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
    if(event.target.dataset?.setting==='connection-target'){try{chooseConnectionTarget(Number(event.target.value));}catch(error){toast(error.message,true);}return;}
    const input = event.target;
    if (state.gifExport) return;
    if (input.name==='theme' && input.closest?.('#settings-form')) { if(input.checked)applyPreferences({...state,theme:input.value},true);return; }
    if (input.closest?.('#gif-form')) { updateGIFEstimate(); return; }
    if (input.closest?.('#dimension-form')) {
      const form = input.closest('#dimension-form');
      if (input.name === 'value') form.dataset.autoValue = '0';
      updateDimensionForm(form); return;
    }
    if (onMagicSetting(input)) return;
    if (state.magic && !magicWorking()) return;
    if (input.form?.id === 'trace-form' && input.name === 'element') {
      const point = input.form.elements.point;
      point.innerHTML = tracePointOptions(state.project.elements.find((e) => e.id === input.value), point.value);
      return;
    }
    if (input.id === 'cad-slot-outlines') { state.cadSlotOutlines = input.checked; return; }
    if (input.id === 'revision-scope') { revisionsModal(input.value); return; }
    if (input.closest('#transform-form')) {
      const form = input.closest('#transform-form');
      if (input.name === 'pivot-reference' && input.value) {
        const at = K.point(state.result, parseReference(input.value));
        if (at) { form.elements.namedItem('px').value = at.x; form.elements.namedItem('py').value = at.y; }
      } else if (['px', 'py'].includes(input.name)) form.elements.namedItem('pivot-reference').value = '';
      return;
    }
    if (input.closest('#canvas-edit-form')) {
      const form = input.closest('#canvas-edit-form'), kind = form.dataset.kind, r = I.reference(I.target(state.project, form.dataset.reference));
      if (kind === 'joint' && ['type', 'jointId'].includes(input.name)) {
        const j = state.project.connections.find((j) => j.id === form.elements.jointId.value);
        const other = j ? sameReference(j.a, r) ? j.b : j.a : null;
        if (input.name === 'jointId' && j) form.elements.type.value = j.type === 'prismatic' ? 'prismatic' : 'revolute';
        form.elements.other.innerHTML = canvasOtherOptions(r, form.elements.type.value, other);
        form.elements.value.value = form.elements.type.value === 'prismatic' && j?.type === 'prismatic' ? j.value * (sameReference(j.a, r) ? 1 : -1) : 0;
      }
      if (kind === 'limits' && input.name === 'scope') {
        const j = state.project.connections.find((j) => j.id === input.value), range = K.driveRange(state.project);
        const guide = j && state.project.elements.find((e) => e.id === (j.a.point === 'curve' ? j.a : j.b).elementId);
        form.elements.min.value = j ? j.limitMin ?? (j.type === 'prismatic' ? 0 : -180) : range.min;
        form.elements.max.value = j ? j.limitMax ?? (j.type === 'prismatic' ? guide.length : 180) : range.max;
      }
      return;
    }
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
    if (['mount-a', 'mount-b', 'force-mode', 'actuator-mode', 'range-mode'].includes(input.id)) {
      const next = K.copy(state.project), e = next.elements.find((v) => v.id === state.selected);
      if (input.id === 'force-mode') e.forceMode = input.value;
      else if (input.id === 'actuator-mode') e.actuatorMode = input.value;
      else if (input.id === 'range-mode') e.rangeMode = input.value;
      else {
        const key = input.id === 'mount-a' ? 'a' : 'b';
        e[key === 'a' ? 'mountA' : 'mountB'] = parseReference(input.value);
        next.connections = next.connections.filter((j) => !((j.a.elementId === e.id && j.a.point === key) || (j.b.elementId === e.id && j.b.point === key)));
      }
      try { if (['mount-a', 'mount-b', 'range-mode'].includes(input.id)) K.fitElasticRanges(next, [e.id], E.design(next, state.motion)); applyProject(next); } catch (error) { toast(error.message, true); renderInspector(); }
    }
    if (input.id === 'motion-value') {
      if (!input.value.trim() || !input.checkValidity()) { toast('Poloha musí byť v rozsahu pohonu.', true); input.value = state.motion.toFixed(1); return; }
      setMotion(Number(input.value));
    }
    if (input.id === 'cam-shape') {
      const next = K.copy(state.project), e = next.elements.find((e) => e.id === state.selected); e.camShape = input.value;
      if (e.camShape === 'pear') { e.camLift = Math.max(e.camLift, e.radius * 2.5); if (!e.camPhase) e.camPhase = 90; }
      applyProject(next); return;
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
      e.curveKind = input.value; e.curveSemicircle = false;
      if (e.curveKind !== 'polyline' && (e.controls.length > 32 || e.controls.length < (e.curveKind === 'spline' ? 4 : 2))) {
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
    if (state.gifExport) { event.preventDefault(); return; }
    if(form.id==='advanced-perspective-form'){event.preventDefault();try{await rectifyMagic(new FormData(form));}catch(error){toast(error.message,true);}return;}
    if(form.id.startsWith('advanced-')){event.preventDefault();try{advancedSubmit(form,new FormData(form));}catch(error){toast(error.message,true);}return;}
    if (['connection-review-form','construction-form','issue-form'].includes(form.id)) {
      event.preventDefault(); const data=new FormData(form); try {
        if(form.id==='connection-review-form')confirmConnection(data);
        if(form.id==='construction-form'){const values=Object.fromEntries(['minLength','maxLength','restLength'].map(key=>[key,quantityValue(data,key,'mm',.1,5000)]));editCanvas(globalThis.KinmoUsability.elasticConstruction(state.project,form.dataset.id,values),'Konštrukčné rozmery boli upravené.');$('#modal').close();}
        if(form.id==='issue-form'){const bundle=globalThis.KinmoUsability.issueBundle(state.project,state.result,{description:data.get('description'),mode:state.mode,selected:state.selectedElementIds,collisions:state.collisions});const text=JSON.stringify(bundle);if(new TextEncoder().encode(text).length>2*1024*1024)throw new Error('Diagnostický balík prekročil 2 MB. Zmenšite projekt.');download('kinematika-problem.json',text,'application/json');$('#modal').close();}
      }catch(error){toast(error.message,true);}return;
    }
    if (['reference-calibration-form','elastic-response-form','magic-detection-review-form','reference-attach-form', 'reference-form', 'kit-form', 'motion-plan-form', 'pose-alignment-form', 'impact-form'].includes(form.id)) {
      event.preventDefault(); try { workflowSubmit(form, new FormData(form)); } catch (error) { toast(error.message, true); } return;
    }
    if (form.id === 'gif-form') {
      event.preventDefault();
      try { await exportGIF(new FormData(form)); } catch (error) { gifError(error); }
      return;
    }
    if (['magic-scale-form', 'magic-finish-form'].includes(form.id)) {
      event.preventDefault();
      try {
        const data = new FormData(form);
        if (form.id === 'magic-scale-form') submitMagicScale(data); else submitMagicFinish(data);
      } catch (error) { toast(error.message, true); }
      return;
    }
    if (state.magic && (!magicWorking() || !['element-name-form', 'joint-form', 'dimension-form', 'geometry-form', 'com-form', 'canvas-edit-form', 'transform-form', 'snap-joint-form', 'part-point-form', 'slot-semicircle-form'].includes(form.id))) { event.preventDefault(); return; }
    if (!['rename-form', 'settings-form', 'trace-form', 'element-name-form', 'joint-form', 'dimension-form', 'geometry-form', 'saved-trace-form', 'com-form', 'fusion-form', 'canvas-edit-form', 'transform-form', 'snap-joint-form', 'workbench-save-form', 'library-insert-form', 'revision-compare-form', 'part-point-form', 'slot-semicircle-form'].includes(form.id)) return;
    event.preventDefault();
    const data = new FormData(form);
    if (['part-point-form', 'slot-semicircle-form'].includes(form.id)) {
      try { if (form.id === 'part-point-form') submitPartPoint(form, data); else submitSlotSemicircle(form, data); }
      catch (error) { toast(error.message, true); }
      return;
    }
    if (['workbench-save-form', 'library-insert-form', 'revision-compare-form'].includes(form.id)) {
      try {
        if (form.id === 'workbench-save-form') submitWorkbenchSave(form, data);
        if (form.id === 'library-insert-form') submitLibraryInsert(form, data);
        if (form.id === 'revision-compare-form') submitRevisionComparison(data);
      } catch (error) { toast(error.message, true); }
      return;
    }
    if (form.id === 'snap-joint-form') {
      try { submitSnapConnection(data); } catch (error) { toast(error.message, true); }
      return;
    }
    if (form.id === 'transform-form') {
      try { submitTransform(form, data); } catch (error) { toast(error.message, true); }
      return;
    }
    if (form.id === 'canvas-edit-form') {
      try { onCanvasSubmit(form, data); } catch (error) { toast(error.message, true); }
      return;
    }
    if (form.id === 'dimension-form') {
      try { submitDimension(form, data); } catch (error) { toast(error.message, true); }
      return;
    }
    if (form.id === 'fusion-form') {
      if (!data.has('consent')) { toast('Najprv potvrďte vytvorenie nového CAD dokumentu.', true); return; }
      const button = $('button[type="submit"]', form);
      if (button.disabled) return;
      button.disabled = true;
      try {
        const snapshot = X.cadSnapshot(state.project, state.result, { dimensions: state.dimensions, trajectories: state.trace, samples: state.samples, references: traceReferences(), traceSpace: state.traceSpace, slotOutlines: state.cadSlotOutlines });
        await CAD.send(snapshot, String(data.get('key')), (message) => { if ($('#fusion-status')) $('#fusion-status').textContent = message; });
        if ($('#fusion-status')) $('#fusion-status').textContent = 'Fusion potvrdil vytvorenie nového referenčného výkresu.';
        toast('Nový referenčný výkres bol vytvorený vo Fusion.');
      } catch (error) { if ($('#fusion-status')) $('#fusion-status').textContent = error.message; }
      finally { if (button.isConnected) button.disabled = false; }
      return;
    }
    if (['joint-form', 'geometry-form', 'saved-trace-form', 'com-form'].includes(form.id)) {
      try {
        const next = K.copy(state.project);
        if (form.id === 'com-form') next.elements.find((e) => e.id === state.selected).com = data.has('automatic') ? null : { x: Number(data.get('x')), y: Number(data.get('y')) };
        if (form.id === 'joint-form') {
          const type = String(data.get('type')), a = parseReference(String(data.get('a'))), b = parseReference(String(data.get('b')));
          const record = { ...(form.dataset.id&&next.connections.find(j=>j.id===form.dataset.id)?.contact?{contact:next.connections.find(j=>j.id===form.dataset.id).contact}:{}),id: form.dataset.id || K.uid(), name: String(data.get('name')).trim(), type, a, b, value: ['parallel', 'revolute', 'point-path', 'cam-contact'].includes(type) ? 0 : Number(data.get('value')), builtin: false };
          if (next.kind !== 'custom' && [a, b].every((r) => next.elements.find((e) => e.id === r?.elementId)?.primary)) throw new Error('Na úpravu dvoch parametrických prvkov vytvorte voľnú kópiu.');
          if (form.dataset.id) next.connections = next.connections.map((j) => j.id === form.dataset.id ? record : j);
          else next.connections.push(record);
        }
        if (form.id === 'geometry-form') {
          const outline = form.dataset.outline === 'true', e = next.elements.find((v) => v.id === state.selected);
          const points = String(data.get('points')).trim().split(/\r?\n/).filter((line) => line.trim()).map((line) => {
            const axes = line.trim().split(';');
            if (axes.length !== 2 || axes.some((v) => !v.trim() || !Number.isFinite(Number(v.trim().replace(',', '.'))))) throw new Error('Každý riadok musí obsahovať dve čísla oddelené bodkočiarkou: X;Y.');
            return { x: Number(axes[0].trim().replace(',', '.')), y: Number(axes[1].trim().replace(',', '.')) };
          });
          e[outline ? 'outline' : 'controls'] = points;
          if (!outline && e.curveSemicircle && points.length === 2) e.curveRadius = K.distance(points[0], points[1]) / 2;
        }
        if (form.id === 'saved-trace-form') {
          const record = { ...(form.dataset.id&&next.connections.find(j=>j.id===form.dataset.id)?.contact?{contact:next.connections.find(j=>j.id===form.dataset.id).contact}:{}),id: form.dataset.id || K.uid(), name: String(data.get('name')).trim(), reference: parseReference(String(data.get('reference'))), color: String(data.get('color')), space: String(data.get('space')), visible: data.has('visible') };
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
      next.simulation.returnOnRelease = data.has('return-on-release');
      next.simulation.mode = data.get('simulation-mode') === 'dynamic' ? 'dynamic' : 'kinematic';
      for (const key of ['gravity', 'damping', 'friction', 'inputForce', 'initialVelocity', 'duration', 'returnDamping']) next.simulation[key] = Number(data.get(key));
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

  function canSelectText(target) {
    const element = target?.nodeType === 3 ? target.parentElement : target;
    return Boolean(element?.isContentEditable || element?.closest?.('input,textarea'));
  }

  function onKeyboard(event) {
    const measurementTarget=event.target?.closest?.('[data-action="measurement-seek"]');if(!state.gifExport&&measurementTarget&&['Enter',' '].includes(event.key)){event.preventDefault();actions['measurement-seek'](measurementTarget);return;}
    if(!canSelectText(event.target)&&typeDimension(event))return;
    const key = event.key.toLowerCase(), modifier = event.ctrlKey || event.metaKey;
    if (state.gifExport) {
      if (key === 'escape') cancelGIF();
      if (key !== 'escape' && !$('#modal').open) event.preventDefault();
      return;
    }
    if (modifier && key === 'a' && !canSelectText(event.target)) {
      event.preventDefault(); window.getSelection()?.removeAllRanges(); return;
    }
    if ($('#modal').open || event.target.closest?.('input,select,textarea,[contenteditable]')) return;
    if ((key === 'enter' || event.code === 'Space') && event.target.closest?.('button,a')) return;
    if (key === 'alt') { state.snapSuppressed = true; state.snapPreview = null; renderSmartSnapPreview(); return; }
    if (key === 'escape' && state.insertingType) { event.preventDefault(); state.insertingType = null; state.placementPreview = null; state.placementMount = null; state.tool = 'select'; renderPlacementTools(); renderScene(); updateToolbar(); return; }
    if (key === 'tab' && (state.draggedPaletteType || state.insertingType || state.magic?.placementType)) { event.preventDefault(); cyclePlacementMount(event.shiftKey); return; }

    if (state.magic) {
      if (state.magic.step === 2.5 && modifier && ['z', 'y'].includes(key)) { event.preventDefault(); undoDetection(key === 'y' || event.shiftKey); return; }
      if (state.magic.step === 2.5 && key === 'enter' && state.magic.tool === 'detect-outline') { event.preventDefault(); try { commitDetectionOutline(); } catch (error) { toast(error.message, true); } return; }
      if (state.magic.step === 2.5 && key === 'escape' && state.magic.tool.startsWith('detect-')) { event.preventDefault(); state.magic.tool = 'select'; state.magic.drawing = []; renderMagicImport(); renderScene(); return; }
      if (modifier && key === 's') { event.preventDefault(); toast('Použite Finish alebo export rozpracovanej geometrie.', true); return; }
      if (key === 'escape' && state.magic.tool === 'detection-region') { event.preventDefault(); selectMagicDetectionRegion(true); return; }
      if (key === 'escape' && (state.magic.drawing.length || state.magic.placementType)) { event.preventDefault(); clearMagicDrawing(); return; }
      if (state.magic.drawing.length && (modifier && key === 'z' || key === 'backspace')) {
        event.preventDefault(); state.magic.drawing.pop(); state.magic.preview = null; renderMagicImport(); renderScene(); return;
      }
      if (key === 'enter' && state.magic.tool === 'ground-outline') { event.preventDefault(); try { commitMagicDrawing(); } catch (error) { toast(error.message, true); } return; }
      if (!magicWorking()) {
        if (key === 'h') setTool('pan');
        else if (key === 'escape' || key === 'v') setTool('select');
        else if (key === 'f' && event.shiftKey) { event.preventDefault(); fitView(); renderScene(); }
        else if (modifier || event.code === 'Space' || key.startsWith('arrow') || ['delete', 'backspace', 'j', 'm', 'f'].includes(key)) event.preventDefault();
        return;
      }
      if (event.code === 'Space' && !event.target.closest?.('[data-selection-key],[data-edit-handle]') || key.startsWith('arrow')) { event.preventDefault(); return; }
    }
    if (state.pendingSnap && key === 'escape') { event.preventDefault(); dismissSnapChoices(); return; }
    if (state.contextMenuState.isOpen) {
      if (key === 'escape') { event.preventDefault(); closeContextMenu(true); }
      return;
    }
    if (state.dimensionPick && key === 'escape') { event.preventDefault(); cancelDimensionPick(); updateToolbar(); renderScene(); return; }
    const canvasItem = event.target.closest?.('[data-selection-key]');
    const editHandle = event.target.closest?.('[data-edit-handle]');
    if (editHandle && (key === 'enter' || event.code === 'Space')) { event.preventDefault(); transformModal(editHandle.dataset.editHandle, editHandle.dataset.fixedEnd); return; }
    if (canvasItem && (key === 'enter' || event.code === 'Space')) { event.preventDefault(); selectTarget(canvasItem.dataset.selectionKey, event.shiftKey || modifier); return; }
    if (key === 'contextmenu' || (event.shiftKey && key === 'f10')) {
      event.preventDefault();
      const key = canvasItem?.dataset.selectionKey || state.selectedElementIds.at(-1), t = I.target(state.project, key), pose = state.result.poses[t?.elementId || I.reference(t)?.elementId];
      const part = pose && t?.type === 'control' ? t.element.primary ? { x: I.controlPoints(state.project, t.element)[t.index].x + state.project.parameters.slotOffsetX, y: I.controlPoints(state.project, t.element)[t.index].y + state.project.parameters.slotOffsetY } : K.worldPoint({ ...pose, a: pose.controlOrigin || pose.a }, I.controlPoints(state.project, t.element)[t.index]) : t?.type === 'outline' ? pose?.outline?.[t.index] : t?.type === 'path' ? pose?.path?.[Math.floor(pose.path.length / 2)] : null;
      const at = I.reference(t) ? K.point(state.result, I.reference(t)) : part || (pose ? { x: (pose.a.x + pose.b.x) / 2, y: (pose.a.y + pose.b.y) / 2 } : state.pointer);
      const matrix = $('#mechanism-canvas').getScreenCTM();
      if (matrix) openContextMenu({ clientX: at.x * matrix.a + at.y * matrix.c + matrix.e, clientY: at.x * matrix.b + at.y * matrix.d + matrix.f }, key || null);
      return;
    }
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
    else if (key === 'f') { event.preventDefault(); if (event.shiftKey) { fitView(); renderScene(); } else fixSelected(); }
    else if (key === 'delete' || key === 'backspace') { event.preventDefault(); deleteSelected(); }
    else if (key === 'escape') { if (state.drag) onPointerUp({ pointerId: state.drag.pointerId, cancelled: true }); selectTarget(null); setInspectorOpen(false); setTool('select'); $('.sidebar').classList.remove('mobile-open'); }
    else if (key === 'arrowright' || key === 'arrowleft') { event.preventDefault(); setMotion(state.motion + (key === 'arrowright' ? 1 : -1) * (event.shiftKey ? 10 : 1)); }
  }

  function animate(time) {
    state.frameWasPlaying=state.playing;
    if (state.playing && !state.gifExport && !document.hidden) {
      const delta = lastFrame ? Math.min((time - lastFrame) / 1000, 0.06) : 0;
      if (state.project.simulation.mode === 'dynamic' && state.dynamic && state.forceContext) {
        try {
          state.dynamic = P.step(state.forceContext, state.dynamic, Math.min(.25, delta * state.speed));
          if (state.dynamicHistory.length < 2400 && delta > 0) state.dynamicHistory.push({ ...state.dynamic });
          setMotion(state.dynamic.motion, false);
          if (state.dynamic.stopped) { state.playing = false; updateMotion(); toast(state.dynamic.reason, true); }
        } catch (error) { state.playing = false; toast(error.message, true); updateMotion(); }
        if (state.inspectorOpen && state.analysis && time - lastInspector > 750) { renderInspector(); lastInspector = time; }
        captureMeasurement(delta);lastFrame = time; requestAnimationFrame(animate); return;
      }
      const range = K.driveRange(state.project);
      if(state.project.driveProgram){state.planTime=K.clamp((state.planTime||0)+delta*state.speed,0,state.project.driveProgram.duration);const q=range.min+state.planTime/state.project.driveProgram.duration*(range.max-range.min);setMotion(q,false);if(state.result.blocked)state.playing=false;else if(state.planTime>=state.project.driveProgram.duration){if(state.loop)state.planTime=0;else state.playing=false;}captureMeasurement(delta);lastFrame=time;requestAnimationFrame(animate);return;}
      if (state.project.motionPlan?.phases.length) {
        const total = state.project.motionPlan.phases.reduce((sum, p) => sum + p.duration, 0);
        state.planTime = (state.planTime || 0) + delta * state.speed * state.direction;
        const end = state.planTime >= total || state.planTime <= 0;
        state.planTime = K.clamp(state.planTime, 0, total);
        const phase = WF.planAt(state.project, state.planTime), safe = WF.trial(state.project, state.motion, phase.motion, { profile: state.profile, collisions: state.collisions, samples: state.samples });
        setMotion(safe.motion, false);
        if (safe.blocked) { state.playing = false; state.trialBlock = safe.blocked; toast(safe.blocked.issues[0] || 'Fáza je blokovaná.', true); }
        else if (end) { if (state.loop) state.direction *= -1; else state.playing = false; }
        updateMotion(); captureMeasurement(delta);lastFrame = time; requestAnimationFrame(animate); return;
      }
      const driverSpeed = state.project.elements.find((e) => e.drive)?.driveSpeed;
      let next = state.motion + delta * state.speed * (driverSpeed == null ? (range.max - range.min) / state.cycle : Math.abs(driverSpeed)) * state.direction;
      const reachedEnd = next >= range.max || next <= range.min;
      next = K.clamp(next, range.min, range.max);
      // Don't jump over a known blocked sample at high playback speeds.
      const samples = state.direction > 0 ? state.samples : [...state.samples].reverse();
      const blocked = samples.find((s) => s.blocked && s.motion >= Math.min(state.motion, next) && s.motion <= Math.max(state.motion, next));
      setMotion(blocked?.motion ?? next, false);
      if (state.playing && reachedEnd) {
        if (state.loop) state.direction *= -1; else { state.playing = false; updateMotion(); }
      }
      if (state.inspectorOpen && state.analysis && time - lastInspector > 750) { renderInspector(); lastInspector = time; }
    }
    if(state.frameWasPlaying)captureMeasurement(lastFrame?Math.min((time-lastFrame)/1000,.06):0);
    lastFrame = time;
    requestAnimationFrame(animate);
  }

  function wireEvents() {
    document.addEventListener('click', (event) => {
      if (event.target.closest('a[data-kinmo-download]')?.href?.startsWith('blob:')) return;
      const summary = event.target.closest('summary');
      if (summary) document.querySelectorAll('#workflow-tools details[open], #model-checks details[open]').forEach((el) => { if (el !== summary.parentElement) el.open = false; });
      const button = event.target.closest('[data-action]');
      if (state.gifExport && (!button || !['cancel-gif', 'close-modal'].includes(button.dataset.action))) { event.preventDefault(); return; }
      if (button && !button.disabled) {
        if (!magicActionAllowed(button.dataset.action)) { toast('Najskôr dokončite alebo zrušte Magic import.', true); return; }
        document.querySelectorAll('#workflow-tools details[open], #model-checks details[open]').forEach((el) => { el.open = false; });
        if (button.closest('.binding-dialog, .mobile-tools-dialog')) $('#modal').close();
        actions[button.dataset.action]?.(button, event); return;
      }
      const component = event.target.closest('[data-component]');
      if (component && !component.disabled) addElement(component.dataset.component);
    });
    document.addEventListener('change', onChange);
    document.addEventListener('input', (event) => {
      if (state.gifExport) return;
      const construction=event.target.closest?.('#construction-form');
      if(construction){try{const data=new FormData(construction),values=Object.fromEntries(['minLength','maxLength','restLength'].map(key=>[key,quantityValue(data,key,'mm',.1,5000)])),next=globalThis.KinmoUsability.elasticConstruction(state.project,construction.dataset.id,values),e=next.elements.find(e=>e.id===construction.dataset.id);$('#construction-feedback').textContent='Platné rozmery · zdvih '+fmt(e.maxLength-e.minLength,2)+' mm';}catch(error){$('#construction-feedback').textContent=error.message;}return;}
      if (event.target.closest?.('#gif-form')) { updateGIFEstimate(); return; }
      if (event.target.dataset?.magicSetting) onMagicSetting(event.target);
    });
    document.addEventListener('submit', onSubmit);
    document.addEventListener('keydown', onKeyboard);
    document.addEventListener('pointerup', (event) => { if(event.pointerType==='touch'&&!$('#mechanism-canvas').contains(event.target))touchEnd(event); });
    document.addEventListener('pointercancel', (event) => { if(event.pointerType==='touch'&&!$('#mechanism-canvas').contains(event.target))touchEnd(event); });
    document.addEventListener('keyup', (event) => { if (event.key === 'Alt') { state.snapSuppressed = false; const type = state.draggedPaletteType || state.insertingType || state.magic?.placementType; if (type) state.snapPreview = placementAt(type, state.pointer).preview; renderSmartSnapPreview(); } });
    window.addEventListener?.('blur', () => { state.snapSuppressed = false; });
    document.addEventListener('selectstart', (event) => { if (!canSelectText(event.target)) event.preventDefault(); });
    $('#motion-range').addEventListener('input', (event) => { if (!state.gifExport) setMotion(Number(event.target.value)); });
    const svg = $('#mechanism-canvas');
    svg.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointermove', onPointerMove);
    svg.addEventListener('pointerup', onPointerUp);
    svg.addEventListener('pointercancel', onPointerUp);
    svg.addEventListener('contextmenu', onContextMenu);
    for (const selector of ['#model-tree', '#joint-list']) $(selector).addEventListener('contextmenu', onContextMenu);
    svg.addEventListener('pointerleave', () => { if (!state.drag) updateHover(null); });
    svg.addEventListener('lostpointercapture', onLostPointerCapture);
    svg.addEventListener('dragstart', (event) => event.preventDefault());
    svg.addEventListener('wheel', (event) => { event.preventDefault(); zoom(event.deltaY > 0 ? 1.08 : 0.925, worldPoint(event)); }, { passive: false });
    $('#palette').addEventListener('dragstart', (event) => {
      const component = event.target.closest('[data-component]');
      if (state.gifExport || !component || component.disabled || state.magic && state.magic.step !== 4) { event.preventDefault(); return; }
      event.dataTransfer.setData('application/x-kinematika-element', component.dataset.component);
      event.dataTransfer.effectAllowed = 'copy';
      dismissSnapChoices(); state.placementMount = null; state.placementPreview = null; state.snapSuppressed = !!event.altKey;
      state.draggedPaletteType = component.dataset.component; renderPlacementTools(); renderBindingTools(); renderModelChecks();
    });
    $('#palette').addEventListener('dragend', () => { state.draggedPaletteType = null; state.snapPreview = null; state.placementPreview = null; state.placementMount = null; $('#canvas-area').classList.remove('drop-active'); renderSmartSnapPreview(); renderPlacementTools(); renderBindingTools(); renderModelChecks(); });
    const area = $('#canvas-area');
    area.addEventListener('contextmenu', onContextMenu);
    area.addEventListener('dragover', (event) => {
      if (state.gifExport) return;
      if (state.magic?.step === 1 && event.dataTransfer.types.includes('Files')) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; return; }
      if (state.magic && state.magic.step !== 4) return;
      if (!event.dataTransfer.types.includes('application/x-kinematika-element')) return;
      event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; area.classList.add('drop-active');
      if (K.TYPES.includes(state.draggedPaletteType) && state.project.elements.length < 120) {
        try { state.snapSuppressed = !!event.altKey; state.pointer = worldPoint(event); state.snapPreview = placementAt(state.draggedPaletteType, state.pointer).preview; renderPlacementTools(); } catch { state.snapPreview = null; }
        renderSmartSnapPreview();
      }
    });
    area.addEventListener('dragleave', (event) => { if (!area.contains(event.relatedTarget)) { area.classList.remove('drop-active'); state.snapPreview = null; state.placementPreview = null; renderSmartSnapPreview(); } });
    area.addEventListener('drop', (event) => {
      event.preventDefault(); area.classList.remove('drop-active'); state.draggedPaletteType = null; state.snapPreview = null; state.snapSuppressed = !!event.altKey;
      if (state.gifExport) return;
      if (state.magic?.step === 1 && event.dataTransfer.files.length) {
        if (event.dataTransfer.files.length !== 1) { toast('Vyberte iba jeden obrázok.', true); return; }
        onMagicImage(event.dataTransfer.files[0]); return;
      }
      if (state.magic && state.magic.step !== 4) return;
      const type = event.dataTransfer.getData('application/x-kinematika-element');
      if (K.TYPES.includes(type)) addElement(type, worldPoint(event));
      state.placementPreview = null; state.placementMount = null; renderPlacementTools();
    });
    $('#import-file').addEventListener('change', async (event) => {
      if (state.gifExport) { event.target.value = ''; toast('Najprv dokončite alebo zrušte GIF export.', true); return; }
      if (state.magic) { event.target.value = ''; toast('Najskôr dokončite alebo zrušte Magic import.', true); return; }
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        if (file.size > 2 * 1024 * 1024) throw new Error('Projekt je príliš veľký. Limit je 2 MB.');
        const text=await file.text(), raw=JSON.parse(text), issue=raw.format==='kinematika-issue'?raw:null;
        const restored=issue ? globalThis.KinmoUsability.restoreIssue(issue) : null, imported=restored ? restored.native : X.parseNative(text);
        replaceProject(imported.project, imported);
        if(issue){state.mode=['edit','simulate'].includes(issue.reproduction?.mode)?issue.reproduction.mode:'edit';state.collisions=issue.reproduction?.collisions!==false;state.selectedElementIds=Array.isArray(issue.reproduction?.selected)?issue.reproduction.selected.filter(key=>I.target(state.project,key)):[];setMotion(K.clamp(Number(issue.reproduction?.motion)||0,K.driveRange(state.project).min,K.driveRange(state.project).max));state.result=restored.result;renderScene();updateToolbar();toast('Zobrazená je zaznamenaná poloha. Pri pohybe sa model znovu vypočíta.');}
      } catch (error) { toast(error.message || 'Projekt sa nepodarilo importovať.', true); }
      event.target.value = '';
    });
    $('#workbench-import-file').addEventListener('change', async (event) => {
      if (state.gifExport) { event.target.value = ''; toast('Najprv dokončite alebo zrušte GIF export.', true); return; }
      if (state.magic) { event.target.value = ''; toast('Najskôr dokončite alebo zrušte Magic import.', true); return; }
      const input = event.target, file = input.files?.[0], kind = input.dataset.kind;
      if (!file || input.disabled) return;
      input.disabled = true;
      try {
        if (file.size > 2 * 1024 * 1024) throw new Error('Kolekcia je príliš veľká. Limit je 2 MB.');
        importCollection(await file.text(), kind);
      } catch (error) { toast(error.message || 'Kolekciu sa nepodarilo importovať.', true); }
      finally { input.value = ''; input.disabled = false; }
    });
    $('#reference-file').addEventListener('change', async (event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) try { await attachReference(file); } catch (error) { toast(error.message, true); } });
    $('#magic-pose-file').addEventListener('change', async (event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) try { await addMagicPose(file); } catch (error) { toast(error.message, true); } });
    $('#magic-image-file').addEventListener('change', (event) => {
      const file = event.target.files?.[0]; event.target.value = '';
      if (file) onMagicImage(file); else if (state.magic) state.magic.resetApproved = false;
    });
    $('#magic-image-file').addEventListener('cancel', () => { if (state.magic) state.magic.resetApproved = false; });
    $('#magic-wizard').addEventListener('dragover', (event) => {
      if (state.magic?.step === 1 && event.dataTransfer.types.includes('Files')) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }
    });
    $('#magic-wizard').addEventListener('drop', (event) => {
      if (state.magic?.step !== 1 || !event.dataTransfer.files.length) return;
      event.preventDefault();
      if (event.dataTransfer.files.length !== 1) { toast('Vyberte iba jeden obrázok.', true); return; }
      onMagicImage(event.dataTransfer.files[0]);
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
      if (state.gifExport) return;
      const rect = graph.getBoundingClientRect(), range = K.driveRange(state.project);
      const t = K.clamp(((event.clientX - rect.left) / rect.width * 800 - 43) / 717, 0, 1);
      setMotion(K.lerp(range.min, range.max, t));
    });
    $('#modal').addEventListener('cancel', cancelGIF);
    $('#modal').addEventListener('close', () => {
      // A queued close event can arrive after this shared dialog has been reopened.
      if ($('#modal').open) return;
      cancelGIF(); state.pendingSnap = null; state.pendingRevisionId = null; state.pendingCollectionDelete = null; state.pendingDeleteKeys = null;
      state.pendingProjectDelete = null; state.pendingImpact = null; state.referenceDraft = null;
      if (state.magic) state.magic.pendingScale = null;
    });
    document.addEventListener('visibilitychange', () => { lastFrame = 0; });
    window.addEventListener('beforeunload', (event) => {
      if (state.magic) {
        if (state.magic.image || state.magic.busy || state.magic.original.dirty || state.project.elements.length) { event.preventDefault(); event.returnValue = ''; }
        return;
      }
      if (state.dirty) saveProject(true);
    });
    let resizeTimer;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (state.gifExport) { state.gifExport.resized = true; return; } fitView(); renderScene(); }, 150); });
  }

  buildShell();
  contextMenu = CM.create({ onAction: onContextAction, onClose: () => { state.contextMenuState.isOpen = false; renderScene(); }, returnFocus: () => $('#mechanism-canvas').focus({ preventScroll: true }) });
  applyPreferences(state);
  recalculate(true);
  renderTree(); renderInspector(); updateHeader(); updateToolbar();
  wireEvents();
  requestAnimationFrame(animate);
})();
