import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import '../engine.js';
import '../editor.js';
import '../interaction.js';
import '../workbench.js';
import '../magic-import.js';
import '../physics.js';
import '../slot-outline.js';
import '../exports.js';
import '../context-menu.js';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

// Run the actual UI controller functions; rendering and browser layout are stubbed.
function controller(width = 1440) {
  const elements = new Map(), listeners = new Map(), storage = new Map();
  const document = { activeElement: null, body: { classList: { add() {}, remove() {} } }, addEventListener: (name, handler) => listeners.set(name, handler) };
  const element = (selector) => {
    if (!elements.has(selector)) {
      const classes = new Set(), attributes = new Map();
      elements.set(selector, {
        innerHTML: '', hidden: false, dataset: {}, attributes, listeners: new Map(), addEventListener(name, handler) { this.listeners.set(name, handler); },
        querySelectorAll: () => [], getScreenCTM: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
        setPointerCapture() {}, hasPointerCapture: () => false, releasePointerCapture() {},
        close() { this.open = false; },
        classList: {
          toggle: (name, enabled) => { if (enabled ?? !classes.has(name)) classes.add(name); else classes.delete(name); },
          add: (name) => classes.add(name), remove: (name) => classes.delete(name), contains: (name) => classes.has(name),
        },
        setAttribute: (name, value) => attributes.set(name, String(value)),
        contains: (target) => target?.panel === selector,
        focus() { document.activeElement = this; },
      });
    }
    return elements.get(selector);
  };
  const K = globalThis.Kinematics, I = globalThis.KinmoInteraction, E = globalThis.KinmoEditor;
  const project = K.validateProject({ ...K.preset('custom'), name: 'QA', elements: [{ ...K.makeElement('link', 10, 20), id: 'body', length: 100 }, { ...K.makeElement('link', 10, 60), id: 'another-body', length: 100 }] });
  const state = {
    inspectorOpen: false, analysis: false, project, selectedElementIds: [], selected: null,
    contextMenuState: { isOpen: false, targetId: null }, contextWorldPoint: { x: 150, y: 80 }, samples: [], speed: 1, direction: 1, cycle: 6, loop: true,
    grid: true, dimensions: true, ghosts: true, trace: true, playing: false, motion: 0, mode: 'edit', tool: 'select', snap: false,
    smartSnap: false, snapPreview: null, pendingSnap: null,
    revisionScope: 'current', cadSlotOutlines: true, magic: null,
    traceRef: { elementId: 'body', point: 'b' }, result: E.design(project, 0), pointer: { x: 0, y: 0 },
    history: [], historySelections: [], future: [], futureSelections: [],
  };
  const context = vm.createContext({
    state, document, location: { protocol: 'https:', origin: 'https://app.example.com' }, window: { innerWidth: width, addEventListener() {}, getSelection: () => ({ removeAllRanges() {} }) }, $: element,
    icon: () => '', escape: (value) => String(value), fmt: (value) => String(value), svgNS: 'http://www.w3.org/2000/svg',
    line: (a, b, attributes = '') => `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" ${attributes}/>`,
    ib: (name, action, title, active = false, extra = '') => `<button data-action="${action}" ${extra}></button>`,
    K, I, E, W: globalThis.KinmoWorkbench, M: { ...globalThis.KinmoMagicImport }, X: globalThis.KinmoExport, typeNames: { ground: 'Rám', link: 'Rameno', node: 'Bod', rail: 'Vedenie', panel: 'Čelo' }, typeIcons: { ground: 'ground' },
    CAD: { ENDPOINT: 'http://127.0.0.1:8765' },
    renderTree() {}, renderInspector() {}, renderScene() {}, renderGraph() {}, fitView() {},
    onChange() {}, onSubmit() {}, onContextMenu() {}, updateHover() {}, updateMotion() {},
    worldPoint: (event) => ({ x: event.clientX, y: event.clientY }), solveCurrent: () => E.design(state.project, state.motion),
    changed() { if (state.magic) state.magic.geometryStarted = true; context.repairSelection(); state.result = E.design(state.project, state.motion); }, recalculate() { state.result = E.design(state.project, state.motion); },
    toast(message) { context.lastToast = message; }, currentElement: () => state.project.elements.find((e) => e.id === state.selected),
    contextMenu: { close(focus) { context.menuClosed = { focus }; }, open(menu) { context.openedMenu = menu; } },
    setTool: (tool) => { state.tool = tool; },
    setMotion: (motion) => { state.motion = motion; }, lastFrame: 1000, lastInspector: 0, requestAnimationFrame() {},
    parseReference: (value) => { const [elementId, point] = value.split('|'); return { elementId, point }; },
    updateToolbar: () => context.updateInspectorVisibility(),
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }, storageKey: 'qa', lastKey: 'qa.last', settingsKey: 'qa.settings', DD: { NAME: 'Zásuvka', KIND: 'double-drawer' },
    collectionKeys: { assembly: 'qa.assemblies', revision: 'qa.revisions' },
    clearTimeout() {}, setTimeout: (callback) => { context.nextTimer = callback; return 1; }, autosaveTimer: null, latestSVG: '', updateHeader() {},
    URL: { revokeObjectURL: (url) => { (context.revokedURLs ||= []).push(url); } },
    isDoubleDrawer: () => state.project.kind === 'double-drawer',
    projectSelection: (project) => project.elements.find((e) => e.role === 'front')?.id || project.elements.find((e) => e.type === 'panel')?.id || project.elements.find((e) => e.role === 'coupler')?.id || project.elements[0]?.id || null,
    applyPreferences: (value) => Object.assign(state, globalThis.KinmoExport.preferences(value)), saveProject: () => true,
    download: (filename, content, type) => { context.downloaded = { filename, content, type }; },
    modal: (title, html, wide) => { context.dialog = { title, html, wide }; },
  });
  for (const name of ['buildShell', 'updateInspectorVisibility', 'setInspectorOpen', 'selectElement', 'selectTarget', 'repairSelection', 'memberSelected', 'selectedNodeReferences', 'defaultTraceReference', 'closeContextMenu', 'jointPoints', 'canvasHit', 'contextItems', 'openContextMenu', 'onContextMenu', 'pushHistory', 'undo', 'editCanvas', 'deleteSelected', 'fixSelected', 'onPointerDown', 'onPointerMove', 'onPointerUp', 'onCanvasSubmit', 'animate', 'templateCards', 'projectsModal', 'canSelectText', 'onKeyboard', 'wireEvents', 'manipulationSVG', 'transformModal', 'submitTransform', 'renderDiagnostics', 'toggleSmartSnap', 'findDragSnap', 'smartSnapSVG', 'offerSnapConnection', 'submitSnapConnection', 'readCollection', 'writeCollection', 'collectionRecord', 'recordSaveModal', 'draftRecord', 'submitWorkbenchSave', 'exportCollection', 'importCollection', 'collectionErrorModal', 'assembliesModal', 'insertLibraryModal', 'submitLibraryInsert', 'revisionsModal', 'restoreRevisionModal', 'confirmRevisionRestore', 'comparisonModal', 'submitRevisionComparison', 'deleteRecordModal', 'confirmRecordDelete', 'loadProject', 'replaceProject', 'exportModal', 'fusionModal', 'onChange', 'magicBounds', 'magicImageSVG', 'renderMagicReference', 'magicDrawingSVG', 'magicWorking', 'magicActionAllowed', 'startMagicImport', 'renderMagicImport', 'setMagicStep', 'nextMagicStep', 'pickMagicImage', 'onMagicImage', 'submitMagicScale', 'selectMagicTool', 'clearMagicDrawing', 'commitMagicDrawing', 'magicPointer', 'onMagicSetting', 'persistMagicProjects', 'magicOriginalPreserved', 'submitMagicFinish', 'cancelMagicImport', 'addElement', 'setTool', 'connectPoint', 'onContextAction']) {
    const definition = source.match(new RegExp(`  (?:async )?function ${name}\\([^\\n]*\\) \\{[\\s\\S]*?\\n  \\}`))?.[0];
    assert(definition, `Missing UI function ${name}`);
    vm.runInContext(definition, context);
  }
  return { context, state, element, document, listeners, storage };
}

test('CAD export has a shared width-outline switch without changing the model', () => {
  const { context, state } = controller(), before = JSON.stringify(state.project);
  context.exportModal(); assert.match(context.dialog.html, /id="cad-slot-outlines"[^>]* checked/);
  context.onChange({ target: { id: 'cad-slot-outlines', checked: false } });
  context.fusionModal(); assert.match(context.dialog.html, /id="cad-slot-outlines" type="checkbox"\/>/);
  assert.match(context.dialog.html, /Script or add-in from device/);
  assert.match(context.dialog.html, /SLOT_REFERENCE_OUTLINE/);
  context.onChange({ target: { id: 'cad-slot-outlines', checked: true } });
  context.exportModal(); assert.match(context.dialog.html, /id="cad-slot-outlines"[^>]* checked/);
  assert.equal(JSON.stringify(state.project), before);
  assert.equal((source.match(/slotOutlines: state\.cadSlotOutlines/g) || []).length, 2);
  assert(!('cadSlotOutlines' in globalThis.KinmoExport.preferences(state)));
});

test('Properties start hidden, with a single accessible toggle and a close button', () => {
  const { context, element } = controller(); context.buildShell();
  const html = element('#app').innerHTML;
  assert.match(source, /inspectorOpen: false/);
  assert.match(html, /class="workspace inspector-hidden"/);
  assert.match(html, /id="properties-panel"[^>]*hidden/);
  assert.match(html, /data-action="toggle-inspector"[^>]*aria-expanded="false"/);
  assert.match(html, /data-action="close-inspector"/);
});

for (const width of [393, 1440]) {
  test(`Selecting geometry at ${width}px does not open properties`, () => {
    const { context, state, element } = controller(width);
    context.updateInspectorVisibility(); context.selectElement('body');
    assert.equal(state.selected, 'body'); assert.equal(state.inspectorOpen, false);
    assert.equal(element('#properties-panel').hidden, true);
    assert(element('#workspace').classList.contains('inspector-hidden'));
    assert(!element('.inspector').classList.contains('mobile-open'));
  });
  test(`An explicitly opened properties panel stays open during selection at ${width}px`, () => {
    const { context, state, element } = controller(width);
    context.setInspectorOpen(true); context.selectElement('body');
    assert.equal(state.inspectorOpen, true); assert.equal(element('#properties-panel').hidden, false);
    assert.equal(element('[data-action="toggle-inspector"]').attributes.get('aria-expanded'), 'true');
    context.setInspectorOpen(false); context.selectElement('another-body');
    assert.equal(element('#properties-panel').hidden, true);
  });
}

test('Closing focused properties returns focus to the visible toggle', () => {
  const { context, element, document } = controller();
  context.setInspectorOpen(true); document.activeElement = { panel: '#properties-panel' };
  context.setInspectorOpen(false);
  assert.equal(document.activeElement, element('[data-action="toggle-inspector"]'));
});

test('Only the header opens projects from the main layout; duplicate navigation is absent', () => {
  const { context, element } = controller(); context.buildShell();
  const html = element('#app').innerHTML;
  assert.equal((html.match(/data-action="projects"/g) || []).length, 1);
  assert(!html.includes('data-action="templates"') && !html.includes('sidebar-bottom'));
  assert(!source.includes('data-action="templates"'));
  assert.match(styles, /\.project-name \{ display: flex; order: 3;/);
});

test('The single project dialog retains all four templates and the independent drawer project', () => {
  const { context } = controller(); context.projectsModal();
  assert.equal((context.dialog.html.match(/data-action="load-template"/g) || []).length, 4);
  assert.equal((context.dialog.html.match(/data-action="load-double-drawer"/g) || []).length, 1);
  assert(context.dialog.wide);
});

test('Selection styling covers the entire interface, with explicit editable-field exceptions', () => {
  assert.match(styles, /\* \{[^}]*user-select: none; -webkit-user-select: none;/);
  assert.match(styles, /input, textarea,[^}]*user-select: text; -webkit-user-select: text;/);
  assert.match(styles, /\[contenteditable\] \* \{ user-select: inherit; -webkit-user-select: inherit;/);
  assert.match(styles, /\[contenteditable="false"\] \{ user-select: none; -webkit-user-select: none;/);
});

test('Text selection is allowed only for fields and actual editable content, including text nodes', () => {
  const { context } = controller(), ui = { closest: () => null };
  const input = { closest: () => input }, editable = { ...ui, isContentEditable: true };
  assert.equal(context.canSelectText(ui), false);
  assert.equal(context.canSelectText(input), true);
  assert.equal(context.canSelectText(editable), true);
  assert.equal(context.canSelectText({ nodeType: 3, parentElement: editable }), true);
  assert.equal(context.canSelectText({ nodeType: 3, parentElement: ui }), false);
  assert.equal(context.canSelectText(null), false);
});

test('Document selection guard covers dialogs and headers without blocking fields', () => {
  const { context, listeners } = controller(); context.wireEvents();
  const guard = listeners.get('selectstart'); assert(guard);
  let prevented = false;
  guard({ target: { closest: () => null }, preventDefault: () => { prevented = true; } });
  assert(prevented); prevented = false;
  guard({ target: { closest: () => ({}) }, preventDefault: () => { prevented = true; } });
  assert(!prevented);
});

for (const modifier of ['ctrlKey', 'metaKey']) {
  test(`${modifier}+A does not select interface text, even inside an open dialog`, () => {
    const { context, element } = controller(); element('#modal').open = true;
    let prevented = false, cleared = false;
    context.window.getSelection = () => ({ removeAllRanges: () => { cleared = true; } });
    context.onKeyboard({ key: 'a', [modifier]: true, target: { closest: () => null }, preventDefault: () => { prevented = true; } });
    assert(prevented && cleared); prevented = false; cleared = false;
    context.onKeyboard({ key: 'a', [modifier]: true, target: { closest: () => ({}) }, preventDefault: () => { prevented = true; } });
    assert(!prevented && !cleared);
  });
}

test('Cream theme uses the Claude palette without changing existing theme identifiers', () => {
  const cream = styles.match(/:root\[data-theme="orange"\] \{([^}]+)\}/)?.[1]; assert(cream);
  for (const [name, color] of [['paper', '#ffffff'], ['canvas', '#f4f3ee'], ['accent', '#c15f3c'], ['grid-large', '#b1ada1']]) {
    assert(cream.includes(`--${name}: ${color};`), `${name} should use ${color}`);
  }
  assert(source.includes("['orange', 'Krémová / terakota']"));
  assert.match(styles, /:root\[data-theme="mono"\]/); assert.match(styles, /:root\[data-theme="dark"\]/);
  assert(source.includes('stroke="var(--accent)"'));
});

test('Central selection distinguishes endpoint and body, without opening properties', () => {
  const { context, state } = controller();
  context.selectTarget('n:body:a'); assert.equal(state.selected, 'body'); assert.deepEqual([...state.selectedElementIds], ['n:body:a']);
  context.selectTarget('e:another-body', true); assert.equal(state.selectedElementIds.length, 2);
  assert(context.memberSelected('body') && context.memberSelected('another-body') && !state.inspectorOpen);
  context.selectTarget('n:body:a', true); assert.deepEqual([...state.selectedElementIds], ['e:another-body']);
  context.selectTarget(null); assert.equal(state.selected, null); assert.equal(state.selectedElementIds.length, 0);
});

test('Right click suppresses the native menu and preserves an existing multiselection', () => {
  const { context, state } = controller(); context.selectTarget('n:body:a'); context.selectTarget('n:another-body:a', true);
  let prevented = false, stopped = false;
  context.onContextMenu({ clientX: 10, clientY: 20, target: { closest: () => null }, preventDefault() { prevented = true; }, stopPropagation() { stopped = true; } });
  assert(prevented && stopped && state.contextMenuState.isOpen);
  assert.equal(state.contextMenuState.targetType, 'node'); assert.equal(state.selectedElementIds.length, 2);
  assert(context.openedMenu.items.some((i) => i.id === 'fix' && i.label.includes('(2)')));
  assert(!state.inspectorOpen);
});

test('Canvas context exposes real additions, subassemblies and fitting', () => {
  const { context, state } = controller();
  const items = context.contextItems(null);
  assert(items.some((i) => i.id === 'add-node') && items.some((i) => i.id === 'add-ground'));
  assert.equal(items.find((i) => i.items)?.items.length, 2);
  context.openContextMenu({ clientX: 150, clientY: 200 }, null);
  assert.equal(state.contextMenuState.targetType, 'canvas'); assert.equal(state.selectedElementIds.length, 0);
});

test('Fix shortcut edits a selected node and Undo/Redo restores model and selection', () => {
  const { context, state } = controller(); context.selectTarget('n:body:a');
  context.fixSelected(); assert(globalThis.KinmoInteraction.fixed(state.project, { elementId: 'body', point: 'a' }));
  assert.equal(state.history.length, 1); assert(!state.inspectorOpen);
  context.undo(); assert.equal(state.project.elements.length, 2); assert.deepEqual([...state.selectedElementIds], ['n:body:a']);
  context.undo(true); assert.equal(state.project.elements.length, 3);
});

test('Delete handles all selected members and Undo restores the multiselection', () => {
  const { context, state } = controller(); context.selectTarget('e:body'); context.selectTarget('e:another-body', true);
  context.deleteSelected(); assert.equal(state.project.elements.length, 0); assert.equal(state.selectedElementIds.length, 0);
  context.undo(); assert.equal(state.project.elements.length, 2); assert.equal(state.selectedElementIds.length, 2);
});

test('Endpoint deletion explains that its owning rigid member will be removed', () => {
  const { context, state } = controller(); context.selectTarget('n:body:b'); context.deleteSelected();
  assert(context.dialog.html.includes('confirm-canvas-delete')); assert.equal(state.project.elements.length, 2);
  context.deleteSelected(state.pendingDeleteKeys, true); assert.equal(state.project.elements.length, 1);
});

test('Node properties forms use atomic operations rather than modifying a menu alone', () => {
  const { context, state } = controller(), form = { dataset: { kind: 'coordinates', reference: 'n:body:b' } };
  const values = new Map([['x', '10'], ['y', '-80'], ['z', '0']]);
  context.onCanvasSubmit(form, values);
  assert.equal(state.project.elements[0].angle, 90); assert.equal(state.history.length, 1); assert(!state.inspectorOpen);
});

test('Invalid node edits preserve history, geometry and selection', () => {
  const { context, state } = controller(), before = JSON.stringify(state.project);
  context.selectTarget('n:body:a');
  assert.throws(() => context.onCanvasSubmit({ dataset: { kind: 'coordinates', reference: 'n:body:a' } }, new Map([['x', '0'], ['y', '0'], ['z', '1']])));
  assert.equal(JSON.stringify(state.project), before); assert.equal(state.history.length, 0);
  assert.deepEqual([...state.selectedElementIds], ['n:body:a']);
});

const pointer = (clientX, clientY, extra = {}) => ({ clientX, clientY, button: 0, pointerId: 1, target: { closest: (selector) => selector === '[data-element]' ? { dataset: { element: 'body' } } : null }, preventDefault() {}, ...extra });
const handlePointer = (kind, x, y, fixedEnd = 'a') => pointer(x, y, { target: { closest: (selector) => selector === '[data-edit-handle]' ? { dataset: { editHandle: kind, fixedEnd } } : null } });

for (const width of [393, 1440]) {
  test(`Magic connects coincident fixed/member nodes and drives the selected body at ${width}px`, () => {
    const { context, state, element } = controller(width), K = globalThis.Kinematics;
    state.project = K.validateProject({ ...K.preset('custom'), elements: [
      { ...K.makeElement('node', 0, 0), id: 'fixed', locked: true },
      { ...K.makeElement('link', 0, 0), id: 'member', length: 120 },
    ] });
    state.result = globalThis.KinmoEditor.design(state.project, 0);
    state.magic = { step: 4, drawing: [], preview: null, tool: 'select', placementType: null, geometryStarted: false };
    const matrix = { a: width === 393 ? .4375 : 1.25, b: 0, c: 0, d: 1, e: 123.456, f: 27.891 };
    element('#mechanism-canvas').getScreenCTM = () => matrix;
    const at = pointer(matrix.e, matrix.f, { target: { closest: () => null } });
    assert.equal(context.canvasHit(at), 'n:fixed:a');
    context.setTool('connect');
    context.onPointerDown(at); assert.equal(state.pendingJoint.elementId, 'fixed');
    context.onPointerDown(at);
    assert.equal(state.project.connections.length, 1);
    assert.equal(state.project.connections[0].a.elementId, 'fixed');
    assert.equal(state.project.connections[0].b.elementId, 'member');
    assert.equal(state.pendingJoint, null); assert.equal(state.history.length, 1);
    context.undo(); assert.equal(state.project.connections.length, 0);
    context.undo(true); assert.equal(state.project.connections.length, 1);
    context.setTool('select');
    context.onPointerDown(pointer(matrix.e + 60 * matrix.a, matrix.f, {
      target: { closest: (selector) => selector === '[data-element]' ? { dataset: { element: 'member' } } : null },
    }));
    context.onPointerUp({ pointerId: 1 });
    assert.equal(state.selected, 'member'); assert.equal(context.selectedNodeReferences().length, 0);
    context.onCanvasSubmit({ dataset: { kind: 'motor', reference: `n:${state.selected}:a` } },
      new Map([['enabled', 'on'], ['mode', 'rotary'], ['speed', '20'], ['angle', '0'], ['min', '0'], ['max', '90']]));
    const solved = K.solve(state.project, 45, { collisions: false });
    assert(!solved.blocked); assert.equal(solved.poses.member.angle, 45); assert(!state.inspectorOpen);
  });
}

test('Direct handles stay off protected templates and do not open properties', () => {
  const { context, state, element } = controller(); context.selectTarget('n:body:b');
  const svg = context.manipulationSVG(1);
  assert.match(svg, /data-edit-handle="move-x"/); assert.match(svg, /data-edit-handle="rotate"/);
  assert.match(svg, /data-fixed-end="b"/); assert(!state.inspectorOpen);
  state.mode = 'simulate'; assert.equal(context.manipulationSVG(1), ''); assert(element('#manipulation-tools').hidden);
  state.mode = 'edit'; state.project = globalThis.Kinematics.preset('fourbar'); state.selectedElementIds = ['e:input-1'];
  assert.equal(context.manipulationSVG(1), '');
});

test('An axis handle changes only its own axis and commits one Undo step', () => {
  const { context, state } = controller(); context.selectTarget('e:body');
  context.onPointerDown(handlePointer('move-x', 52, 20));
  context.onPointerMove(pointer(72, 91)); context.onPointerMove(pointer(82, 102)); context.onPointerUp({ pointerId: 1 });
  assert.equal(state.project.elements[0].x, 40); assert.equal(state.project.elements[0].y, 20);
  assert.equal(state.history.length, 1); assert(!state.inspectorOpen);
  context.undo(); assert.equal(state.project.elements[0].x, 10);
});

test('Axis grid snap keeps the other coordinate unchanged', () => {
  const { context, state } = controller(); context.selectTarget('e:body'); state.snap = true;
  context.onPointerDown(handlePointer('move-y', 10, 62)); context.onPointerMove(pointer(170, 84)); context.onPointerUp({ pointerId: 1 });
  assert.equal(state.project.elements[0].x, 10); assert.equal(state.project.elements[0].y, 40);
});

test('A handle click opens numeric entry without adding empty history', () => {
  const { context, state } = controller(); context.selectTarget('e:body');
  context.onPointerDown(handlePointer('move-x', 52, 20)); context.onPointerUp({ pointerId: 1 });
  assert.match(context.dialog.html, /id="transform-form"/); assert.equal(state.history.length, 0); assert(!state.inspectorOpen);
});

for (const modifier of ['shiftKey', 'ctrlKey', 'metaKey']) test(`A handle does not swallow ${modifier} multiselection`, () => {
  const { context, state } = controller(); context.selectTarget('n:body:a');
  const event = handlePointer('pivot', 10, 20); event[modifier] = true;
  context.onPointerDown(event);
  assert.equal(state.selectedElementIds.length, 0); assert(!state.drag); assert(!context.dialog);
});

test('The pivot chooser is offset from the selected node hit area', () => {
  const { context, state } = controller(); context.selectTarget('n:body:a');
  const html = context.manipulationSVG(1), origin = state.result.poses.body.a;
  assert.match(html, new RegExp(`data-edit-handle="pivot"[^]*?<rect x="${origin.x - 24}" y="${origin.y - 24}"`));
  assert.match(html, /Kliknite na výber uzla/);
});

test('Numeric rotation preserves the chosen pivot and groups the edit into one step', () => {
  const { context, state } = controller(); context.selectTarget('e:body');
  context.submitTransform({ dataset: { kind: 'rotate', keys: '["e:body"]' } }, new Map([['angle', '90'], ['px', '110'], ['py', '20']]));
  assert.equal(state.project.elements[0].angle, 90);
  const pose = state.result.poses.body;
  assert(Math.abs(pose.b.x - 110) < .001 && Math.abs(pose.b.y - 20) < .001);
  assert.equal(state.editPivot.x, 110); assert.equal(state.history.length, 1); assert(!state.inspectorOpen);
});

test('Invalid numeric edits and zero movement preserve project and history', () => {
  const { context, state } = controller(), before = JSON.stringify(state.project), form = { dataset: { kind: 'move', keys: '["e:body"]' } };
  context.submitTransform(form, new Map([['dx', '0'], ['dy', '0']]));
  assert.equal(state.history.length, 0); assert.equal(JSON.stringify(state.project), before);
  assert.throws(() => context.submitTransform(form, new Map([['dx', 'bad'], ['dy', '0']])));
  assert.equal(state.history.length, 0); assert.equal(JSON.stringify(state.project), before);
});

test('Cancelling a direct handle restores all 60 history entries and redo', () => {
  const { context, state } = controller(); context.selectTarget('e:body');
  state.history = Array.from({ length: 60 }, () => globalThis.Kinematics.copy(state.project));
  state.historySelections = Array.from({ length: 60 }, () => ['e:body']);
  state.future = [globalThis.Kinematics.copy(state.project)]; state.futureSelections = [['e:body']];
  const first = state.history[0];
  context.onPointerDown(handlePointer('move-x', 52, 20)); context.onPointerMove(pointer(72, 20));
  context.onPointerUp({ pointerId: 1, type: 'pointercancel' });
  assert.equal(state.project.elements[0].x, 10); assert.equal(state.history.length, 60); assert.equal(state.history[0], first);
  assert.equal(state.future.length, 1);
});

test('Diagnostics present separate unit columns without opening properties', () => {
  const { context, state, element } = controller();
  state.project.connections = [{ id: 'qa-joint', name: 'Spoj A', a: { elementId: 'body', point: 'a' }, b: { elementId: 'another-body', point: 'a' }, type: 'revolute', value: 0 }];
  state.result = globalThis.KinmoEditor.design(state.project, 0); state.diagnosticRows = globalThis.KinmoWorkbench.constraints(state.project, state.result);
  state.diagnosticsOpen = true; context.renderDiagnostics();
  const html = element('#diagnostics-panel').innerHTML;
  assert.match(html, /Poloha \(mm\)/); assert.match(html, /Uhol \(°\)/); assert.match(html, /data-key="j:qa-joint"/);
  assert(!state.inspectorOpen);
});

test('Intelligent snap starts off, has an explicit button and resets on project load', () => {
  const { context, state, element } = controller(); context.buildShell();
  assert.equal(state.smartSnap, false);
  assert.match(element('#app').innerHTML, /data-action="smart-snap"[^>]*aria-pressed="false"/);
  assert.match(source, /state\.smartSnap = false; state\.snapPreview = null; state\.pendingSnap = null/);
  context.toggleSmartSnap(); assert.equal(state.smartSnap, true); assert(!state.inspectorOpen);
  context.toggleSmartSnap(); assert.equal(state.smartSnap, false);
});

test('Disabled intelligent snap does not offer a joint after an ordinary drag', () => {
  const { context, state } = controller(); context.selectTarget('n:body:a');
  context.onPointerDown(pointer(10, 20)); context.onPointerMove(pointer(10, 59)); context.onPointerUp({ pointerId: 1 });
  assert.equal(state.project.elements[0].y, 59); assert(!state.pendingSnap && !state.project.connections.length);
  assert(!context.dialog);
});

test('Enabled intelligent snap previews geometry but requires a separate joint confirmation', () => {
  const { context, state } = controller(); state.smartSnap = true; context.selectTarget('n:body:a');
  context.onPointerDown(pointer(10, 20)); context.onPointerMove(pointer(10, 59));
  assert(state.snapPreview && !state.project.connections.length);
  context.onPointerUp({ pointerId: 1 });
  assert.equal(state.project.elements[0].y, 60); assert.equal(state.history.length, 1); assert(!state.project.connections.length);
  assert.match(context.dialog.html, /snap-joint-form/); assert(state.pendingSnap);
  context.submitSnapConnection(new Map([['type', 'revolute']]));
  assert.equal(state.project.connections.length, 1); assert.equal(state.history.length, 2); assert.equal(state.pendingSnap, null);
  context.undo(); assert.equal(state.project.connections.length, 0); assert.equal(state.project.elements[0].y, 60);
});

test('Turning intelligent snap off cancels an active drag and preserves redo', () => {
  const { context, state } = controller(); state.smartSnap = true; context.selectTarget('n:body:a');
  state.future = [globalThis.Kinematics.copy(state.project)]; state.futureSelections = [['n:body:a']];
  context.onPointerDown(pointer(10, 20)); context.onPointerMove(pointer(10, 59)); context.toggleSmartSnap();
  assert.equal(state.project.elements[0].y, 20); assert.equal(state.smartSnap, false);
  assert.equal(state.history.length, 0); assert.equal(state.future.length, 1); assert.equal(state.pendingSnap, null);
});

test('Cancelling a snapped drag restores geometry without showing a connection prompt', () => {
  const { context, state } = controller(); state.smartSnap = true; context.selectTarget('n:body:a');
  context.onPointerDown(pointer(10, 20)); context.onPointerMove(pointer(10, 59));
  context.onPointerUp({ pointerId: 1, type: 'pointercancel' });
  assert.equal(state.project.elements[0].y, 20); assert(!state.pendingSnap); assert.equal(state.history.length, 0);
  assert(!context.dialog);
});

test('The single project gateway exposes the custom library and named versions', () => {
  const { context } = controller(); context.projectsModal();
  assert.match(context.dialog.html, /data-action="assemblies"/); assert.match(context.dialog.html, /data-action="revisions"/);
  assert.equal((context.dialog.html.match(/data-action="load-double-drawer"/g) || []).length, 1);
});

test('Saving a selected assembly persists a validated copy without editing the project', () => {
  const { context, state, storage } = controller(); context.selectTarget('e:body');
  const before = JSON.stringify(state.project);
  context.submitWorkbenchSave({ dataset: { kind: 'assembly', keys: '["e:body"]' } }, new Map([['name', 'Držiak']]));
  const records = context.readCollection('assembly');
  assert.equal(records.length, 1); assert.equal(records[0].name, 'Držiak'); assert.equal(records[0].file.project.elements.length, 1);
  assert.equal(JSON.stringify(state.project), before); assert.equal(state.history.length, 0);
  const second = controller(); second.storage.set('qa.assemblies', storage.get('qa.assemblies'));
  assert.equal(second.context.readCollection('assembly')[0].name, 'Držiak');
});

test('Inserting a stored assembly makes a new selected member and one undo step', () => {
  const { context, state } = controller(); context.selectTarget('e:body');
  context.submitWorkbenchSave({ dataset: { kind: 'assembly', keys: '["e:body"]' } }, new Map([['name', 'Rameno']]));
  const record = context.readCollection('assembly')[0];
  context.submitLibraryInsert({ dataset: { id: record.id } }, new Map([['x', '300'], ['y', '200']]));
  assert.equal(state.project.elements.length, 3); assert.equal(state.project.elements[2].x, 300); assert.equal(state.project.elements[2].y, 200);
  assert.notEqual(state.project.elements[2].id, 'body'); assert.equal(state.history.length, 1); assert(!state.inspectorOpen);
  context.undo(); assert.equal(state.project.elements.length, 2); assert.deepEqual([...state.selectedElementIds], ['e:body']);
});

test('Invalid library insertion leaves model, selection and history untouched', () => {
  const { context, state } = controller(); context.selectTarget('e:body');
  context.submitWorkbenchSave({ dataset: { kind: 'assembly', keys: '["e:body"]' } }, new Map([['name', 'Rameno']]));
  const record = context.readCollection('assembly')[0], before = JSON.stringify(state.project);
  assert.throws(() => context.submitLibraryInsert({ dataset: { id: record.id } }, new Map([['x', 'bad'], ['y', '0']])));
  assert.equal(JSON.stringify(state.project), before); assert.equal(state.history.length, 0); assert.deepEqual([...state.selectedElementIds], ['e:body']);
});

test('Corrupt collection storage blocks writes without overwriting the original bytes', () => {
  const { context, state, storage } = controller(), corrupt = '{"format":"KINMO-LIBRARY","records":"broken"}';
  storage.set('qa.assemblies', corrupt); context.selectTarget('e:body');
  assert.throws(() => context.submitWorkbenchSave({ dataset: { kind: 'assembly', keys: '["e:body"]' } }, new Map([['name', 'Nová']])));
  assert.equal(storage.get('qa.assemblies'), corrupt); assert.equal(state.history.length, 0);
});

test('Standalone assembly export remains available when local storage is unavailable', () => {
  const { context, state } = controller(); context.selectTarget('e:body');
  context.localStorage.getItem = () => { throw new Error('Unavailable'); };
  const form = { dataset: { kind: 'assembly', keys: '["e:body"]' } }, record = context.draftRecord(form, new Map([['name', 'Prenosná']]));
  context.exportCollection('assembly', [record], record.name);
  assert.match(context.downloaded.filename, /\.kinmolib$/);
  assert.equal(globalThis.KinmoWorkbench.normalizeCollection(context.downloaded.content, 'assembly')[0].name, 'Prenosná');
  assert.equal(state.history.length, 0);
});

test('Named version restore backs up the current geometry and keeps properties and smart snap off', () => {
  const { context, state } = controller(); state.project.elements[0].length = 100;
  context.submitWorkbenchSave({ dataset: { kind: 'revision', keys: '[]' } }, new Map([['name', 'Pôvodná']]));
  const record = context.readCollection('revision')[0];
  state.project.elements[0].length = 140; state.smartSnap = true; state.inspectorOpen = true;
  state.history = [globalThis.Kinematics.copy(state.project)];
  context.restoreRevisionModal(record.id);
  assert.equal(state.project.elements[0].length, 140);
  context.confirmRevisionRestore();
  const records = context.readCollection('revision');
  assert.equal(records.length, 2); assert.equal(records[0].file.project.elements[0].length, 140); assert.match(records[0].name, /^Pred obnovením/);
  assert.equal(state.project.elements[0].length, 100); assert.equal(state.smartSnap, false); assert.equal(state.inspectorOpen, false);
  assert.equal(state.history.length, 0);
});

test('A failed backup stops restore before changing the current project', () => {
  const { context, state, storage } = controller();
  context.submitWorkbenchSave({ dataset: { kind: 'revision', keys: '[]' } }, new Map([['name', 'Základ']]));
  const record = context.readCollection('revision')[0]; state.project.elements[0].length = 150;
  const before = JSON.stringify(state.project), old = storage.get('qa.revisions');
  context.restoreRevisionModal(record.id); context.localStorage.setItem = () => { throw new Error('Quota exceeded'); };
  assert.throws(() => context.confirmRevisionRestore());
  assert.equal(JSON.stringify(state.project), before); assert.equal(storage.get('qa.revisions'), old);
});

test('Comparison shows a signed dimension delta without altering geometry or history', () => {
  const { context, state, element } = controller();
  context.submitWorkbenchSave({ dataset: { kind: 'revision', keys: '[]' } }, new Map([['name', '100 mm']]));
  const record = context.readCollection('revision')[0]; state.project.elements[0].length = 135;
  const before = JSON.stringify(state.project);
  context.comparisonModal(); context.submitRevisionComparison(new Map([['before', record.id], ['after', 'current'], ['changes-only', 'on']]));
  assert.match(element('#revision-comparison').innerHTML, /\+35 mm/); assert.match(element('#revision-comparison').innerHTML, /Zmenené/);
  assert.equal(JSON.stringify(state.project), before); assert.equal(state.history.length, 0);
});

test('Collection deletion asks for confirmation and deletes only the named record', () => {
  const { context, state } = controller();
  context.submitWorkbenchSave({ dataset: { kind: 'revision', keys: '[]' } }, new Map([['name', 'A']]));
  context.submitWorkbenchSave({ dataset: { kind: 'revision', keys: '[]' } }, new Map([['name', 'B']]));
  const records = context.readCollection('revision'), before = JSON.stringify(state.project);
  context.deleteRecordModal('revision', records[0].id); assert.equal(context.readCollection('revision').length, 2);
  assert.match(context.dialog.html, /confirm-record-delete/);
  context.confirmRecordDelete();
  assert.equal(context.readCollection('revision').length, 1); assert.equal(context.readCollection('revision')[0].id, records[1].id);
  assert.equal(JSON.stringify(state.project), before); assert.equal(state.history.length, 0);
});

test('Collection import merges copies instead of replacing existing records', () => {
  const { context } = controller();
  context.submitWorkbenchSave({ dataset: { kind: 'revision', keys: '[]' } }, new Map([['name', 'Prenos']]));
  const records = context.readCollection('revision'), text = globalThis.KinmoWorkbench.serializeCollection(records, 'revision');
  context.importCollection(text, 'revision');
  const merged = context.readCollection('revision');
  assert.equal(merged.length, 2); assert.notEqual(merged[0].id, merged[1].id); assert.equal(merged[1].id, records[0].id);
});

test('Simple Click+Select adds no empty history entry; background clears nonempty models', () => {
  const { context, state } = controller(); context.onPointerDown(pointer(60, 20)); context.onPointerUp({ pointerId: 1 });
  assert.deepEqual([...state.selectedElementIds], ['e:body']); assert.equal(state.history.length, 0);
  context.onPointerDown(pointer(350, 200, { target: { closest: () => null } }));
  assert.equal(state.selectedElementIds.length, 0); assert.equal(state.project.elements.length, 2);
});

for (const modifier of ['shiftKey', 'ctrlKey', 'metaKey']) test(`${modifier}+click toggles selection without initiating a drag`, () => {
  const { context, state } = controller(); context.selectTarget('e:another-body');
  context.onPointerDown(pointer(60, 20, { [modifier]: true })); assert.equal(state.selectedElementIds.length, 2); assert(!state.drag);
  context.onPointerDown(pointer(60, 20, { [modifier]: true })); assert.deepEqual([...state.selectedElementIds], ['e:another-body']);
});

test('Dragging a multiselection makes one undo entry and preserves both members', () => {
  const { context, state } = controller(); context.selectTarget('e:body'); context.selectTarget('e:another-body', true);
  context.onPointerDown(pointer(60, 20)); context.onPointerMove(pointer(80, 30)); context.onPointerUp({ pointerId: 1 });
  assert.equal(state.project.elements[0].x, 30); assert.equal(state.project.elements[1].x, 30);
  assert.equal(state.history.length, 1); assert.equal(state.selectedElementIds.length, 2);
  context.undo(); assert.equal(state.project.elements[0].x, 10); assert.equal(state.selectedElementIds.length, 2);
});

test('Escape cancels a drag without consuming redo history', () => {
  const { context, state } = controller(); context.selectTarget('e:body');
  state.future = [globalThis.Kinematics.copy(state.project)]; state.futureSelections = [['e:body']];
  context.onPointerDown(pointer(60, 20)); context.onPointerMove(pointer(80, 30));
  context.onPointerUp({ pointerId: 1, cancelled: true });
  assert.equal(state.project.elements[0].x, 10); assert.equal(state.history.length, 0); assert.equal(state.future.length, 1);
});

test('Keyboard Escape closes the menu first, then clears selection', () => {
  const { context, state } = controller(); context.selectTarget('e:body'); state.contextMenuState.isOpen = true;
  const event = { key: 'Escape', target: { closest: () => null }, preventDefault() {} };
  context.onKeyboard(event); assert(!state.contextMenuState.isOpen); assert.equal(state.selectedElementIds.length, 1);
  context.onKeyboard(event); assert.equal(state.selectedElementIds.length, 0);
});

test('F toggles point fixation; Shift+F remains Fit View', () => {
  const { context, state } = controller(); context.selectTarget('n:body:a');
  context.onKeyboard({ key: 'f', target: { closest: () => null }, preventDefault() {} });
  assert.equal(state.history.length, 1);
  context.onKeyboard({ key: 'f', shiftKey: true, target: { closest: () => null }, preventDefault() {} });
  assert.equal(state.history.length, 1);
});

test('Node, member and background menu items stay within narrow ownership', () => {
  const { context, state } = controller(), I = globalThis.KinmoInteraction;
  const node = context.contextItems(I.target(state.project, 'n:body:a')), member = context.contextItems(I.target(state.project, 'e:body'));
  assert(node.some((i) => i.id === 'coordinates') && !node.some((i) => i.id === 'split'));
  assert(member.some((i) => i.id === 'split') && member.some((i) => i.id === 'poi') && !member.some((i) => i.id === 'coordinates'));
  state.project = globalThis.Kinematics.preset('fourbar');
  assert(context.contextItems(I.target(state.project, 'n:input-1:a')).find((i) => i.id === 'fix').disabled);
});

test('Menu positioning clamps both axes inside desktop and mobile viewports', () => {
  const position = globalThis.KinmoContextMenu.position;
  assert.deepEqual(position(1430, 890, 270, 440, 1440, 900), { x: 1162, y: 452 });
  assert.deepEqual(position(380, 830, 270, 600, 393, 852), { x: 115, y: 244 });
  assert.deepEqual(position(-50, -30, 270, 300, 393, 852), { x: 8, y: 8 });
});

test('Canvas wires native context suppression, hover, capture and zoom close', () => {
  const { context, element } = controller(); context.wireEvents();
  assert(element('#mechanism-canvas').listeners.has('contextmenu'));
  assert(element('#mechanism-canvas').listeners.has('pointerleave'));
  assert.match(source, /function zoom\([^]*?closeContextMenu\(\)/);
  assert.match(source, /svg\.setPointerCapture\(event\.pointerId\)/);
});

test('Dragging back to the starting position leaves no empty undo entry', () => {
  const { context, state } = controller(); context.selectTarget('e:body');
  context.onPointerDown(pointer(60, 20)); context.onPointerMove(pointer(80, 30)); context.onPointerMove(pointer(60, 20)); context.onPointerUp({ pointerId: 1 });
  assert.equal(state.project.elements[0].x, 10); assert.equal(state.history.length, 0);
});

for (const mode of ['linear', 'rotary']) test(`Kinematic playback uses the configured ${mode} speed and the UI multiplier`, () => {
  const { context, state } = controller(), I = globalThis.KinmoInteraction;
  state.project = I.setDriver(state.project, { elementId: 'body', point: 'a' }, { enabled: true, mode, speed: 40, min: 0, max: 120 });
  state.playing = true; state.speed = .5; state.motion = 30;
  context.animate(1060); assert(Math.abs(state.motion - 31.2) < 1e-9);
});

test('Configured motor speed still respects end stops and loop direction', () => {
  const { context, state } = controller();
  state.project = globalThis.KinmoInteraction.setDriver(state.project, { elementId: 'body', point: 'a' }, { enabled: true, mode: 'linear', speed: 40, min: 0, max: 120 });
  state.playing = true; state.motion = 119.5;
  context.animate(1060); assert.equal(state.motion, 120); assert.equal(state.direction, -1);
});

test('An explicit zero motor speed holds position rather than using the legacy cycle', () => {
  const { context, state } = controller();
  state.project = globalThis.KinmoInteraction.setDriver(state.project, { elementId: 'body', point: 'a' }, { enabled: true, mode: 'linear', speed: 0, min: 0, max: 120 });
  state.playing = true; state.motion = 30;
  context.animate(1060); assert.equal(state.motion, 30);
});

test('A negative motor speed starts at the upper limit and moves backwards', () => {
  const { context, state } = controller();
  context.onCanvasSubmit({ dataset: { kind: 'motor', reference: 'n:body:a' } }, new Map(Object.entries({ enabled: 'on', mode: 'rotary', speed: '-40', angle: '0', min: '0', max: '120' })));
  assert.equal(state.direction, -1); assert.equal(state.motion, 120);
  state.playing = true; context.animate(1060); assert(Math.abs(state.motion - 117.6) < 1e-9);
});

test('Legacy unconfigured motors retain cycle-based playback', () => {
  const { context, state } = controller(); state.project.elements[0].drive = true;
  assert.equal(state.project.elements[0].driveSpeed, null);
  state.playing = true; state.motion = 30; state.speed = .5;
  context.animate(1060); assert(Math.abs(state.motion - 31.8) < 1e-9);
});

test('Cancelling a drag at the 60-step limit preserves every previous undo entry', () => {
  const { context, state } = controller();
  state.history = Array.from({ length: 60 }, () => globalThis.Kinematics.copy(state.project));
  state.historySelections = Array.from({ length: 60 }, () => ['e:body']);
  const before = [...state.history]; context.selectTarget('e:body');
  context.onPointerDown(pointer(60, 20)); context.onPointerMove(pointer(80, 30));
  context.onPointerUp({ pointerId: 1, cancelled: true });
  assert.equal(state.history.length, before.length);
  for (let i = 0; i < before.length; i++) assert.equal(state.history[i], before[i]);
  assert.equal(state.historySelections.length, 60); assert.equal(state.project.elements[0].x, 10);
});

const tracingWizard = (ui = controller()) => {
  const { context, state } = ui;
  context.startMagicImport();
  state.magic.image = { url: 'blob:qa-image', width: 800, height: 600, name: 'Náčrt.png' };
  state.magic.step = 2; state.tool = 'magic-scale';
  state.view = state.baseView = { x: 0, y: 0, width: 800, height: 600 };
  context.submitMagicScale(new Map(Object.entries({ ax: '100', ay: '80', bx: '500', by: '80', distance: '200' })));
  return ui;
};

test('Magic import has one accessible header entry and an initially hidden wizard', () => {
  const { context, element } = controller(); context.buildShell();
  const html = element('#app').innerHTML;
  assert.equal((html.match(/data-action="magic-import"/g) || []).length, 1);
  assert.match(html, /data-action="magic-import"[^>]*aria-controls="magic-wizard"[^>]*aria-expanded="false"/);
  assert.match(html, /id="magic-wizard"[^>]*hidden/);
  assert.match(styles, /\.magic-heading \{[^}]*position: sticky/);
  assert.match(styles, /#app\.magic-active \{ min-height: 700px/);
});
test('SVG coordinate conversion and wizard clicks retain XY accessors as ordinary point data', () => {
  const { context, element, state } = tracingWizard(), svg = element('#mechanism-canvas');
  svg.createSVGPoint = () => ({ x: 0, y: 0, matrixTransform: () => Object.create({ x: 100, y: 80 }) });
  svg.getScreenCTM = () => ({ inverse: () => ({}) });
  vm.runInContext(source.match(/  function worldPoint\([^\n]*\) \{[\s\S]*?\n  \}/)[0], context);
  assert.deepEqual({ ...context.worldPoint({ clientX: 10, clientY: 20 }) }, { x: 100, y: 80 });
  state.magic.step = 2; state.magic.points = [];
  context.magicPointer(Object.create({ x: 100, y: 80 })); assert.deepEqual({ ...state.magic.points[0] }, { x: 100, y: 80 });
  state.magic.step = 3; state.tool = 'magic-draw'; state.magic.tool = 'ground-line';
  context.magicPointer(Object.create({ x: 0, y: 0 })); context.magicPointer(Object.create({ x: 100, y: 0 }));
  assert.equal(state.project.elements[0].length, 100);
});
test('Starting Magic import creates an isolated blank draft without saving or opening properties', () => {
  const { context, state, storage, element } = controller(), original = state.project, before = JSON.stringify(original);
  state.history = [globalThis.Kinematics.copy(original)]; state.historySelections = [['e:body']]; state.dirty = true;
  context.startMagicImport();
  assert(state.magic && state.magic.original.project === original);
  assert.equal(state.project.kind, 'custom'); assert.equal(state.project.elements.length, 0); assert.notEqual(state.project.id, original.id);
  assert.equal(state.history.length, 0); assert.equal(state.inspectorOpen, false); assert.equal(state.smartSnap, false);
  assert.equal(state.magic.step, 1); assert.equal(storage.size, 0); assert.equal(JSON.stringify(original), before);
  assert.match(element('#magic-wizard').innerHTML, /nie automatické rozpoznávanie/);
});
test('Drafts cannot be saved, autosaved, replaced or switched to another project', () => {
  const { context, state, storage } = tracingWizard(), draft = state.project;
  for (const name of ['saveProject', 'changed']) {
    const definition = source.match(new RegExp(`  function ${name}\\([^\\n]*\\) \\{[\\s\\S]*?\\n  \\}`))?.[0];
    vm.runInContext(definition, context);
  }
  assert.equal(context.saveProject(), false); context.changed();
  context.loadProject(globalThis.Kinematics.preset('fourbar')); context.replaceProject(globalThis.Kinematics.preset('drawer'));
  assert.equal(state.project, draft); assert.equal(storage.size, 0); assert.equal(context.nextTimer, undefined);
  assert(state.magic.geometryStarted);
});
test('Step navigation requires a raster, calibrated scale and at least one final element', () => {
  const { context, state } = controller(); context.startMagicImport();
  context.setMagicStep(2); assert.equal(state.magic.step, 1);
  state.magic.image = { url: 'blob:qa-image', width: 800, height: 600, name: 'QA.png' };
  context.setMagicStep(3); assert.equal(state.magic.step, 1);
  context.setMagicStep(2); assert.equal(state.magic.step, 2);
  context.submitMagicScale(new Map(Object.entries({ ax: '10', ay: '10', bx: '210', by: '10', distance: '100' })));
  context.setMagicStep(5); assert.equal(state.magic.step, 3);
});
test('Two calibration clicks preserve pixel coordinates and use the known millimeter distance', () => {
  const { context, state } = controller(); context.startMagicImport();
  state.magic.image = { url: 'blob:qa-image', width: 800, height: 600, name: 'QA.png' };
  state.magic.step = 2; state.view = state.baseView = { x: 0, y: 0, width: 800, height: 600 };
  context.magicPointer({ x: 100, y: 80 }); context.magicPointer({ x: 500, y: 80 });
  assert.equal(state.magic.points.length, 2);
  context.submitMagicScale(new Map(Object.entries({ ax: '100', ay: '80', bx: '500', by: '80', distance: '200' })));
  assert.equal(state.magic.step, 3); assert.equal(state.magic.scale.mmPerPixel, .5); assert.equal(state.tool, 'magic-draw');
});
test('Invalid or empty scale fields keep the raster and draft unchanged', () => {
  const { context, state } = controller(); context.startMagicImport();
  state.magic.image = { url: 'blob:qa-image', width: 800, height: 600, name: 'QA.png' }; state.magic.step = 2;
  const before = JSON.stringify(state.project);
  for (const distance of ['', 'bad', '-1']) assert.throws(() => context.submitMagicScale(new Map(Object.entries({ ax: '100', ay: '80', bx: '500', by: '80', distance }))));
  assert.equal(state.magic.step, 2); assert.equal(state.magic.scale, null); assert.equal(JSON.stringify(state.project), before);
});
test('Floor tracing is one atomic undo and unfinished drawings block navigation', () => {
  const { context, state, storage } = tracingWizard();
  context.magicPointer({ x: 0, y: 80 }); context.setMagicStep(4); assert.equal(state.magic.step, 3);
  context.magicPointer({ x: 200, y: 80 });
  const floor = state.project.elements[0];
  assert(floor.locked && !floor.drive && floor.outline.length === 4); assert.equal(floor.length, 200);
  assert.equal(state.history.length, 1); assert.equal(state.magic.drawing.length, 0); assert.equal(storage.size, 0);
  context.undo(); assert.equal(state.project.elements.length, 0);
  context.undo(true); assert.equal(state.project.elements.length, 1);
});
test('Frame outline closes via Enter and creates parented fixed vertex nodes', () => {
  const { context, state } = tracingWizard(); context.selectMagicTool('ground-outline');
  for (const point of [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 60 }, { x: 0, y: 60 }]) context.magicPointer(point);
  context.onKeyboard({ key: 'Enter', target: { closest: () => null }, preventDefault() {} });
  assert.equal(state.project.elements.length, 3); assert.equal(state.history.length, 1);
  assert.equal(state.project.elements.at(-1).outline.length, 4); assert(state.project.elements.at(-1).locked);
});
test('Drawing undo removes a pending vertex and Escape clears the preview, not completed geometry', () => {
  const { context, state } = tracingWizard(); context.selectMagicTool('ground-outline');
  context.magicPointer({ x: 0, y: 0 }); context.magicPointer({ x: 100, y: 0 });
  context.onKeyboard({ key: 'z', ctrlKey: true, target: { closest: () => null }, preventDefault() {} }); assert.equal(state.magic.drawing.length, 1);
  context.onKeyboard({ key: 'Escape', target: { closest: () => null }, preventDefault() {} });
  assert.equal(state.magic.drawing.length, 0); assert.equal(state.project.elements.length, 0); assert.equal(state.history.length, 0);
});
test('A rejected crossing frame preserves its preview for correction and does not push history', () => {
  const { context, state } = tracingWizard(); context.selectMagicTool('ground-outline');
  for (const point of [{ x: 0, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 60 }, { x: 100, y: 0 }]) context.magicPointer(point);
  assert.throws(() => context.commitMagicDrawing());
  assert.equal(state.magic.drawing.length, 4); assert.equal(state.history.length, 0); assert.equal(state.project.elements.length, 0);
});
test('Scale remains locked after drawing, including after Undo removes every element', () => {
  const { context, state, element } = tracingWizard();
  context.magicPointer({ x: 0, y: 0 }); context.magicPointer({ x: 100, y: 0 }); context.undo();
  assert.equal(state.project.elements.length, 0); assert(state.magic.geometryStarted);
  context.setMagicStep(2); context.renderMagicImport();
  assert.match(element('#magic-wizard').innerHTML, /name="distance"[^>]*disabled/);
  const scale = state.magic.scale;
  context.submitMagicScale(new Map(Object.entries({ ax: '0', ay: '0', bx: '100', by: '0', distance: '1000' })));
  assert.equal(state.magic.scale, scale);
});
test('Fixed point drawing and click-then-place members preserve the ordinary manual properties policy', () => {
  const { context, state } = tracingWizard(); context.selectMagicTool('fixed-point'); context.magicPointer({ x: 10, y: 20 });
  assert(state.project.elements[0].locked);
  context.setMagicStep(4); context.addElement('link'); assert.equal(state.magic.placementType, 'link');
  context.magicPointer({ x: 25, y: 30 });
  assert.equal(state.project.elements[1].type, 'link'); assert.equal(state.project.elements[1].x, 25); assert.equal(state.project.elements[1].y, 30);
  assert.equal(state.inspectorOpen, false); assert.equal(state.magic.placementType, null); assert.equal(state.history.length, 2);
});
test('Wizard member drop, connection tool and motor forms operate on the same mechanism model', () => {
  const { context, state } = tracingWizard();
  context.magicPointer({ x: 0, y: 0 }); context.magicPointer({ x: 100, y: 0 });
  const floor = state.project.elements[0]; context.setMagicStep(4);
  context.addElement('link', { x: 0, y: 0 }); const link = state.project.elements[1];
  context.connectPoint({ elementId: floor.id, point: 'a' }); context.connectPoint({ elementId: link.id, point: 'a' });
  context.onCanvasSubmit({ dataset: { kind: 'motor', reference: `n:${link.id}:a` } }, new Map(Object.entries({ enabled: 'on', mode: 'rotary', angle: '0', speed: '20', min: '0', max: '90' })));
  assert.equal(state.project.connections.length, 1); assert(state.project.elements[1].drive); assert.equal(state.project.elements[1].driveSpeed, 20);
  assert.equal(state.history.length, 4); assert(state.magic.geometryStarted);
});
test('Wizard member tracing follows the chosen type and exact endpoints rather than default lengths', () => {
  const { context, state } = tracingWizard(); context.setMagicStep(4);
  context.onMagicSetting({ dataset: { magicSetting: 'member-type' }, value: 'panel' }); context.selectMagicTool('member');
  context.magicPointer({ x: 20, y: 30 }); context.magicPointer({ x: 80, y: 110 });
  assert.equal(state.project.elements[0].type, 'panel'); assert.equal(state.project.elements[0].length, 100); assert.equal(state.project.elements[0].bearingOffset, 50);
});
test('Wizard action guards block persistence, exports with a raster, collections and simulation', () => {
  const { context, state } = tracingWizard();
  for (const action of ['save', 'projects', 'settings', 'export', 'export-svg', 'revisions', 'library', 'play', 'mode-simulate', 'insert-library']) assert.equal(context.magicActionAllowed(action), false);
  assert(context.magicActionAllowed('fit') && context.magicActionAllowed('magic-export-draft') && context.magicActionAllowed('new-joint'));
  for (const action of ['open-library', 'save-library', 'copy-editable']) { context.dialog = null; context.onContextAction(action); assert.equal(context.dialog, null); }
  state.magic.step = 5; assert.equal(context.magicActionAllowed('new-joint'), false);
});
test('Wizard Space does not start simulation but still activates focused canvas nodes', () => {
  const { context, state } = tracingWizard(); context.magicPointer({ x: 0, y: 0 }); context.magicPointer({ x: 100, y: 0 }); context.setMagicStep(4);
  const id = state.project.elements[0].id;
  const node = { dataset: { selectionKey: `n:${id}:a` } };
  context.onKeyboard({ key: ' ', code: 'Space', target: { closest: (selector) => selector.includes('data-selection-key') ? node : null }, preventDefault() {} });
  assert.equal(state.selectedElementIds[0], `n:${id}:a`);
  context.onKeyboard({ key: ' ', code: 'Space', target: { closest: () => null }, preventDefault() {} }); assert.equal(state.playing, false);
});
test('Wizard buttons retain native Enter and Space activation without committing a drawing', () => {
  const { context, state } = tracingWizard(); context.selectMagicTool('ground-outline');
  for (const point of [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 60 }]) context.magicPointer(point);
  let prevented = false;
  const button = { closest: (selector) => selector === 'button,a' ? button : null };
  for (const [key, code] of [['Enter', 'Enter'], [' ', 'Space']]) context.onKeyboard({ key, code, target: button, preventDefault() { prevented = true; } });
  assert.equal(prevented, false); assert.equal(state.magic.drawing.length, 3); assert.equal(state.project.elements.length, 0);
  state.magic.step = 5;
  context.onKeyboard({ key: ' ', code: 'Space', target: button, preventDefault() { prevented = true; } });
  assert.equal(prevented, false); assert.equal(state.playing, false);
});
test('Cancel asks before discarding completed drawing and restores original geometry, selection and all history', () => {
  const ui = controller(), { context, state, storage } = ui, original = state.project, history = [globalThis.Kinematics.copy(state.project)];
  state.selected = 'body'; state.selectedElementIds = ['n:body:b']; state.history = history; state.historySelections = [['e:body']]; state.dirty = true;
  const before = JSON.stringify(original); tracingWizard(ui);
  context.magicPointer({ x: 0, y: 0 }); context.magicPointer({ x: 100, y: 0 });
  context.cancelMagicImport(); assert(state.magic && context.dialog.html.includes('magic-confirm-cancel'));
  context.cancelMagicImport(true);
  assert.equal(state.magic, null); assert.equal(state.project, original); assert.equal(JSON.stringify(state.project), before);
  assert.equal(state.history, history); assert.deepEqual([...state.selectedElementIds], ['n:body:b']); assert.equal(state.dirty, true); assert.equal(storage.size, 0);
  assert.deepEqual([...context.revokedURLs], ['blob:qa-image']); assert(context.nextTimer);
});
test('Finish preserves the original and creates a separately named geometry-only project', () => {
  const { context, state, storage } = tracingWizard(), original = state.magic.original.project, before = JSON.stringify(original);
  context.magicPointer({ x: 0, y: 0 }); context.magicPointer({ x: 100, y: 0 }); const draftId = state.project.id;
  context.setMagicStep(5); context.submitMagicFinish(new Map([['name', 'Obkreslený mechanizmus']]));
  assert.equal(state.magic, null); assert.equal(state.project.id, draftId); assert.equal(state.project.name, 'Obkreslený mechanizmus');
  assert.equal(state.saved, true); assert.equal(state.dirty, false); assert.equal(state.history.length, 0); assert.equal(state.inspectorOpen, false);
  const records = JSON.parse(storage.get('qa'));
  assert.equal(records.length, 2); assert.equal(JSON.stringify(records.find((p) => p.id === original.id)), before);
  assert.equal(storage.get('qa.last'), draftId); assert(!storage.get('qa').includes('blob:')); assert.deepEqual([...context.revokedURLs], ['blob:qa-image']);
});
test('An invalid final name leaves the original, draft, storage and local photo intact', () => {
  const { context, state, storage } = tracingWizard(); context.selectMagicTool('fixed-point'); context.magicPointer({ x: 0, y: 0 }); context.setMagicStep(5);
  const before = JSON.stringify(state.project);
  assert.throws(() => context.submitMagicFinish(new Map([['name', '  ']])));
  assert(state.magic); assert.equal(JSON.stringify(state.project), before); assert.equal(storage.size, 0); assert.equal(context.revokedURLs, undefined);
});
test('Unavailable storage requires preserving the unsaved original before a memory-only Finish', () => {
  const { context, state, storage } = tracingWizard(); state.magic.original.dirty = true;
  context.selectMagicTool('fixed-point'); context.magicPointer({ x: 0, y: 0 }); context.setMagicStep(5);
  context.localStorage.setItem = () => { throw new Error('Quota exceeded'); };
  context.submitMagicFinish(new Map([['name', 'V pamäti']]));
  assert(state.magic && state.magic.storageError); assert.equal(storage.size, 0); assert.equal(context.revokedURLs, undefined);
  context.submitMagicFinish(new Map([['name', 'V pamäti'], ['original-backup', 'on']]));
  assert.equal(state.magic, null); assert(state.dirty && state.storageFailed && !state.saved); assert.equal(state.project.name, 'V pamäti');
});
test('A fully preserved original permits memory-only Finish without an unnecessary backup prompt', () => {
  const { context, state, storage } = tracingWizard(), original = state.magic.original.project;
  storage.set('qa', JSON.stringify([original]));
  context.selectMagicTool('fixed-point'); context.magicPointer({ x: 0, y: 0 }); context.setMagicStep(5);
  context.localStorage.setItem = () => { throw new Error('Quota exceeded'); };
  context.submitMagicFinish(new Map([['name', 'Exportujem neskôr']]));
  assert.equal(state.magic, null); assert(state.dirty && state.storageFailed); assert.equal(JSON.parse(storage.get('qa'))[0].id, original.id);
});
test('Magic Finish never evicts any of the 20 existing projects', () => {
  const { context, state, storage } = tracingWizard();
  const records = Array.from({ length: 20 }, (_, i) => ({ ...globalThis.Kinematics.preset('custom'), id: `saved-${i}`, name: `Saved ${i}` })), bytes = JSON.stringify(records);
  storage.set('qa', bytes); context.selectMagicTool('fixed-point'); context.magicPointer({ x: 0, y: 0 }); context.setMagicStep(5);
  context.submitMagicFinish(new Map([['name', 'Nad limitom']]));
  assert(state.magic && state.magic.storageError.includes('20 projektov')); assert.equal(storage.get('qa'), bytes);
});
for (const corrupt of ['not-json', '{"projects":[]}', '[null]', '[{"id":"bad","kind":"unknown"}]']) test(`Magic Finish preserves malformed project storage: ${corrupt}`, () => {
  const { context, state, storage } = tracingWizard();
  storage.set('qa', corrupt); context.selectMagicTool('fixed-point'); context.magicPointer({ x: 0, y: 0 }); context.setMagicStep(5);
  context.submitMagicFinish(new Map([['name', 'Neprepísať']]));
  assert(state.magic && state.magic.storageError); assert.equal(storage.get('qa'), corrupt);
});
test('Failure to remember the last project does not invalidate successfully saved geometry', () => {
  const { context, state, storage } = tracingWizard(), setItem = context.localStorage.setItem;
  context.localStorage.setItem = (key, value) => { if (key === 'qa.last') throw new Error('Last key unavailable'); setItem(key, value); };
  context.selectMagicTool('fixed-point'); context.magicPointer({ x: 0, y: 0 }); context.setMagicStep(5);
  context.submitMagicFinish(new Map([['name', 'Uložený']]));
  assert.equal(state.magic, null); assert(state.saved && !state.dirty && !state.storageFailed); assert.equal(JSON.parse(storage.get('qa')).length, 2);
  assert.match(context.lastToast, /posledný výber/);
});
test('Cancelling an in-flight raster decode revokes the stale result without replacing the original', async () => {
  const { context, state } = controller(), original = state.project; context.startMagicImport();
  let resolve; context.M.loadImage = () => new Promise((done) => { resolve = done; });
  const pending = context.onMagicImage({ name: 'Delayed.png' }); assert(state.magic.busy);
  context.cancelMagicImport(true);
  resolve({ url: 'blob:stale-image', width: 800, height: 600, name: 'Delayed.png' }); await pending;
  assert.equal(state.magic, null); assert.equal(state.project, original); assert.deepEqual([...context.revokedURLs], ['blob:stale-image']);
});
test('Failed raster replacement keeps existing calibrated geometry and releases reset permission', async () => {
  const { context, state } = tracingWizard(); context.selectMagicTool('fixed-point'); context.magicPointer({ x: 0, y: 0 }); context.setMagicStep(1);
  state.magic.resetApproved = true;
  const before = JSON.stringify(state.project), image = state.magic.image, scale = state.magic.scale;
  context.M.loadImage = async () => { throw new Error('Invalid raster'); };
  await context.onMagicImage({ name: 'Bad.png' });
  assert.equal(JSON.stringify(state.project), before); assert.equal(state.magic.image, image); assert.equal(state.magic.scale, scale);
  assert.equal(state.magic.busy, false); assert.equal(state.magic.resetApproved, false); assert.equal(context.revokedURLs, undefined);
});
test('Successful raster replacement clears only the draft and revokes its old photo', async () => {
  const { context, state, storage } = tracingWizard(); context.selectMagicTool('fixed-point'); context.magicPointer({ x: 0, y: 0 }); context.setMagicStep(1);
  const original = state.magic.original.project, before = JSON.stringify(original);
  state.magic.resetApproved = true; context.M.loadImage = async () => ({ url: 'blob:new-image', width: 400, height: 300, name: 'New.png' });
  await context.onMagicImage({ name: 'New.png' });
  assert.equal(state.magic.step, 2); assert.equal(state.project.elements.length, 0); assert.equal(state.history.length, 0);
  assert.equal(state.magic.scale, null); assert.equal(state.magic.geometryStarted, false); assert.equal(state.magic.image.url, 'blob:new-image');
  assert.equal(JSON.stringify(original), before); assert.equal(storage.size, 0); assert.deepEqual([...context.revokedURLs], ['blob:qa-image']);
});
test('The calibration marker stays visible on a white raster even with the dark interface skin', () => {
  const { context, state, element } = tracingWizard(); context.setMagicStep(2); context.renderMagicReference();
  assert.match(element('#mechanism-canvas').innerHTML, /stroke="#a64422"/);
  assert.match(context.magicImageSVG(), /data-editor-overlay="magic-reference"/);
  context.setMagicStep(3); context.magicPointer({ x: 10, y: 20 });
  assert.match(context.magicDrawingSVG(1), /data-editor-overlay="magic-drawing"/);
  assert.match(styles, /\.magic-active :is\(\.part-label, \.node-label, \.part-sublabel\)[^{]*\{[^}]*fill: #33322f;[^}]*paint-order: stroke;/);
});
