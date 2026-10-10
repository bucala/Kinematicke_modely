import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import '../engine.js';
import '../editor.js';
import '../interaction.js';
import '../context-menu.js';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

// Run the actual UI controller functions; rendering and browser layout are stubbed.
function controller(width = 1440) {
  const elements = new Map(), listeners = new Map();
  const document = { activeElement: null, body: { classList: { add() {}, remove() {} } }, addEventListener: (name, handler) => listeners.set(name, handler) };
  const element = (selector) => {
    if (!elements.has(selector)) {
      const classes = new Set(), attributes = new Map();
      elements.set(selector, {
        innerHTML: '', hidden: false, attributes, listeners: new Map(), addEventListener(name, handler) { this.listeners.set(name, handler); },
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
    traceRef: { elementId: 'body', point: 'b' }, result: E.design(project, 0), pointer: { x: 0, y: 0 },
    history: [], historySelections: [], future: [], futureSelections: [],
  };
  const context = vm.createContext({
    state, document, window: { innerWidth: width, addEventListener() {}, getSelection: () => ({ removeAllRanges() {} }) }, $: element,
    icon: () => '', escape: (value) => String(value), fmt: (value) => String(value), svgNS: 'http://www.w3.org/2000/svg',
    ib: (name, action, title, active = false, extra = '') => `<button data-action="${action}" ${extra}></button>`,
    K, I, E, typeNames: { ground: 'Rám' }, typeIcons: { ground: 'ground' },
    renderTree() {}, renderInspector() {}, renderScene() {}, fitView() {},
    onChange() {}, onSubmit() {}, onContextMenu() {}, updateHover() {}, updateMotion() {},
    worldPoint: (event) => ({ x: event.clientX, y: event.clientY }), solveCurrent: () => E.design(state.project, state.motion),
    changed() { context.repairSelection(); state.result = E.design(state.project, state.motion); }, recalculate() { state.result = E.design(state.project, state.motion); },
    toast(message) { context.lastToast = message; }, currentElement: () => state.project.elements.find((e) => e.id === state.selected),
    contextMenu: { close(focus) { context.menuClosed = { focus }; }, open(menu) { context.openedMenu = menu; } },
    setTool: (tool) => { state.tool = tool; },
    setMotion: (motion) => { state.motion = motion; }, lastFrame: 1000, lastInspector: 0, requestAnimationFrame() {},
    parseReference: (value) => { const [elementId, point] = value.split('|'); return { elementId, point }; },
    updateToolbar: () => context.updateInspectorVisibility(),
    localStorage: { getItem: () => null }, storageKey: 'qa', DD: { NAME: 'Zásuvka', KIND: 'double-drawer' },
    modal: (title, html, wide) => { context.dialog = { title, html, wide }; },
  });
  for (const name of ['buildShell', 'updateInspectorVisibility', 'setInspectorOpen', 'selectElement', 'selectTarget', 'repairSelection', 'memberSelected', 'selectedNodeReferences', 'defaultTraceReference', 'closeContextMenu', 'jointPoints', 'canvasHit', 'contextItems', 'openContextMenu', 'onContextMenu', 'pushHistory', 'undo', 'editCanvas', 'deleteSelected', 'fixSelected', 'onPointerDown', 'onPointerMove', 'onPointerUp', 'onCanvasSubmit', 'animate', 'templateCards', 'projectsModal', 'canSelectText', 'onKeyboard', 'wireEvents']) {
    const definition = source.match(new RegExp(`  function ${name}\\([^\\n]*\\) \\{[\\s\\S]*?\\n  \\}`))?.[0];
    assert(definition, `Missing UI function ${name}`);
    vm.runInContext(definition, context);
  }
  return { context, state, element, document, listeners };
}

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
