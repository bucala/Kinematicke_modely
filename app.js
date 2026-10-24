/* Kinematika UI · stav, konštanty a spustenie aplikácie.
   Funkcie jednotlivých oblastí sú v app/*.js; index.html ich načíta pred týmto súborom.
   Všetky súbory UI sú klasické skripty so spoločnou najvyššou úrovňou, preto fungujú aj cez file://. */
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
  const DOUBLE_CLICK_MS = 400;
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
    motor: '<rect x="8" y="2" width="8" height="4" rx="1"/><circle cx="12" cy="13" r="7"/><circle cx="12" cy="13" r="3"/><path d="M4 10H2m2 3H2m2 3H2m18-6h2m-2 3h2m-2 3h2M7 18l-2 4h5l1-2m6-2 2 4h-5l-1-2m-2-9 2-2-1 3h2l-3 3 1-3h-1"/>',
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
  const typeNames = { motor:'Elektromotor',
    ground: 'Pevný rám', rail: 'Lineárne vedenie', link: 'Tiahlo / rameno', slot: 'Zakrivená kulisa', cam: 'Rotačná vačka', bearing: 'Čap / ložisko', node: 'Voľný uzol', panel: 'Sklápacie čelo',
    'spring-compression': 'Tlačná pružina', 'spring-extension': 'Ťažná pružina', 'piston-push': 'Tlačný piest', 'piston-pull': 'Ťažný piest',
  };
  const typeIcons = { motor:'motor', ground: 'ground', rail: 'rail', link: 'arm', slot: 'slot', cam: 'cam', bearing: 'bearing', node: 'target', panel: 'panel', 'spring-compression': 'spring', 'spring-extension': 'spring', 'piston-push': 'piston', 'piston-pull': 'piston' };
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
    press: null, lastClick: null, spacePan: null, trackpad: false, suppressContextMenuUntil: 0,
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
    expandedAssemblies: {}, isolatedIds: null, motorCapacityCache: null,
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
    globalThis.KinmoDebug?.record(warning?'warning':'notice',{message});
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
    state.history.push(K.snapshot(state.project));
    state.historySelections.push([...state.selectedElementIds]);
    if (state.history.length > 60) { state.history.shift(); state.historySelections.shift(); }
    state.future = []; state.futureSelections = [];
  }

  function changed(refit = false) {
    if (state.magic) state.magic.geometryStarted = true;
    repairSelection();
    state.dirty = true;
    recalculate(refit);
    globalThis.KinmoDebug?.checkpoint('geometry-change');
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
    document.documentElement.dataset.theme = state.theme;globalThis.KinmoI18n?.setLanguage(state.language);
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

  const pathD = (points) => points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(' ');

  let pdfLoader;
  const parseReference = (value) => {
    if (!value) return null;
    const [elementId, point] = value.split('|'); return { elementId, point };
  };

  const actions = {
    'toggle-tree-group':el=>{state.expandedAssemblies||={};state.expandedAssemblies[el.dataset.id]=!state.expandedAssemblies[el.dataset.id];renderTree();},
    'select-motor-assembly':el=>{const parts=motorParts(el.dataset.id);if(parts){state.selectedElementIds=[...(parts.housing?[I.elementKey(parts.housing.id)]:[]),I.elementKey(parts.motor.id)];repairSelection();renderTree();renderInspector();renderScene();updateToolbar();}},
    'copy-motor-assembly':el=>{selectTarget(I.elementKey(el.dataset.id));duplicateElement();},
    'delete-motor-assembly':el=>{const parts=motorParts(el.dataset.id);if(parts)deleteSelected([...W.descendants(state.project,[(parts.housing||parts.motor).id])].map(I.elementKey));},
    'select-rigid-assembly':el=>{const group=state.project.elements.find(e=>e.id===el.dataset.id)?.rigidAssemblyId;state.selectedElementIds=state.project.elements.filter(e=>e.rigidAssemblyId===group).map(e=>I.elementKey(e.id));repairSelection();renderTree();renderScene();updateToolbar();},
    'multi-select':()=>{state.multiSelect=!state.multiSelect;$('#modal').close();updateSelectionSummary();renderWorkflowTools();toast(state.multiSelect?'Klikaním pridávajte alebo odoberajte diely z výberu.':'Viacnásobný výber bol ukončený.');},
    'motor-preview':()=>{const parts=motorParts();if(parts)startRotation(parts.motor.id);},
    'bind-rigid':()=>rigidAssemblyModal(),
    'unbind-rigid':el=>rigidAssemblyModal(true,el.dataset.id||state.selected),
    'isolate-selection':isolateSelection,
    'detail-level':el=>setDetailLevel(el.dataset.level),
    'motor-mode':el=>setMotorMode(el.dataset.mode),
    'motor-capacity':()=>motorCapacityModal(),
    'motor-enable-for-check':()=>{const parts=motorParts();if(parts){const next=I.setDriver(state.project,{elementId:parts.motor.id,point:'a'},{enabled:true,mode:'rotary',min:0,max:360,speed:parts.motor.rpm*6/parts.motor.gearRatio,continuous:true},E.design(state.project,state.motion));editCanvas(next);motorCapacityModal();}},
    'motor-capacity-guard':el=>applyMotorCapacityGuard(el.dataset.enabled==='true'),
    'magic-test-mechanism':testDetectedMechanism,

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
    'repair-preview-apply':applyRepairPreview,
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
    'open-full-properties': () => { setDetailLevel('advanced'); $('#modal').close();setInspectorOpen(true); },
    'element-limits': () => { const r=selectionReference();if(r)canvasDialog('limits',r); },
    'detect-review-edit': (el) => { $('#modal').close();state.magic.review=null;state.magic.showImage=true;state.magic.tool='select';state.magic.detectEditing=el.dataset.id;renderMagicImport();renderScene();actions['detect-edit']({dataset:{id:el.dataset.id}}); },
    'construction': constructionModal,
    'cam-spin':()=>startRotation(),
    'motor-spec':()=>motorSpecModal(),
    'motor-housing':()=>motorHousing(),
    'surface-contact':()=>surfaceModal(),
    'debug-mode': debugModal,
    'debug-clear': async () => { await globalThis.KinmoDebug.clear();debugModal(); },
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
    'snap-target': el => chooseConnectionTarget(Number(el.dataset.index)),
    'snap-preview': (el) => { const s=state.pendingSnap;if(s)previewConnection(s.source.ref||{elementId:s.source.elementId,point:'a'},s.target.ref||{elementId:s.target.elementId,point:'a'},el.dataset.type,s,true); },
    'snap-connect': (el) => { const snap=state.pendingSnap;if(!snap)return;const a=snap.source.ref||{elementId:snap.source.elementId,point:'a'},b=snap.target.ref||{elementId:snap.target.elementId,point:'a'};previewConnection(a,b,el.dataset.type,snap);if(state.connectionReview){state.connectionReview.snap=K.copy(snap);state.connectionReview.transaction=state.snapTransaction;} },
    'snap-position': dismissSnapChoices,
    'placement-cancel': () => setTool('select'),
    'placement-mount': (el) => { state.placementMount = el.dataset.point; state.placementPreview = null; const type = state.draggedPaletteType || state.insertingType || state.magic?.placementType; if (type) state.snapPreview = placementAt(type, state.pointer).preview; renderSmartSnapPreview(); renderPlacementTools(); },
    'grid-snap': toggleGridSnap,
    'angle-snap': toggleAngleSnap,
    'cam-follower': () => { const e = currentElement(); if (e?.type === 'cam') try { editCanvas(I.addCamFollower(state.project, e.id, state.result), 'Vedený valček bol pridaný. Priraďte vačke otočný pohon.'); } catch (error) { toast(error.message, true); } },
    'fusion': fusionModal,
    'fusion-forget': () => { CAD.rememberPairing('', false); const form=$('#fusion-form');form.elements.key.value='';form.elements['remember-pairing'].checked=false;fusionFeedback('Kľúč v prehliadači bol zabudnutý. Uloženie v doplnku Fusion môžete zrušiť voľbou nového párovania pri jeho spustení.'); },
    'fusion-check': checkFusionConnection,
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
      if (!state.project.motionPlan?.phases.length&&!state.project.elements.some(e=>e.drive&&e.continuous)) { if (state.motion >= range.max - 0.01) state.direction = -1; if (state.motion <= range.min + 0.01) state.direction = 1; }
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
    'select': (el,event) => selectElement(el.dataset.id,!!(state.multiSelect||event?.shiftKey||event?.ctrlKey||event?.metaKey)),
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

  buildShell();
  contextMenu = CM.create({ onAction: onContextAction, onClose: () => { state.contextMenuState.isOpen = false; renderScene(); }, returnFocus: () => $('#mechanism-canvas').focus({ preventScroll: true }) });
  applyPreferences(state);
  recalculate(true);
  renderTree(); renderInspector(); updateHeader(); updateToolbar();
  globalThis.KinmoDebug?.attach(debugSnapshot);
  wireEvents();globalThis.KinmoI18n?.attach(state.language,()=>[state.project.name,...state.project.elements.map(e=>e.name)]);
  globalThis.KinmoHelp.attach({elementType:id=>state.project.elements.find(e=>e.id===id)?.type, blocked:()=>!!(state.playing || state.drag || state.contextMenuState.isOpen || state.magic), open:helpModal});
  requestAnimationFrame(animate);
