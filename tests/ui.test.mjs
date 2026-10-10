import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

// Run the actual UI controller functions; rendering and browser layout are stubbed.
function controller(width = 1440) {
  const elements = new Map(), listeners = new Map();
  const document = { activeElement: null, addEventListener: (name, handler) => listeners.set(name, handler) };
  const element = (selector) => {
    if (!elements.has(selector)) {
      const classes = new Set(), attributes = new Map();
      elements.set(selector, {
        innerHTML: '', hidden: false, attributes, addEventListener() {},
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
  const state = { inspectorOpen: false, analysis: false, project: { name: 'QA' }, grid: true, dimensions: true, ghosts: true, trace: true };
  const context = vm.createContext({
    state, document, window: { innerWidth: width, addEventListener() {}, getSelection: () => ({ removeAllRanges() {} }) }, $: element,
    icon: () => '', escape: (value) => String(value), svgNS: 'http://www.w3.org/2000/svg',
    ib: (name, action, title, active = false, extra = '') => `<button data-action="${action}" ${extra}></button>`,
    K: { TYPES: ['ground'] }, typeNames: { ground: 'Rám' }, typeIcons: { ground: 'ground' },
    renderTree() {}, renderInspector() {}, renderScene() {}, fitView() {},
    onChange() {}, onSubmit() {}, onPointerDown() {}, onPointerMove() {}, onPointerUp() {},
    updateToolbar: () => context.updateInspectorVisibility(),
    localStorage: { getItem: () => null }, storageKey: 'qa', DD: { NAME: 'Zásuvka', KIND: 'double-drawer' },
    modal: (title, html, wide) => { context.dialog = { title, html, wide }; },
  });
  for (const name of ['buildShell', 'updateInspectorVisibility', 'setInspectorOpen', 'selectElement', 'templateCards', 'projectsModal', 'canSelectText', 'onKeyboard', 'wireEvents']) {
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
