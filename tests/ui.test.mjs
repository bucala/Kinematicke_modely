import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { manifest } from '../scripts/manifest.mjs';
import '../engine.js';
import '../double-drawer.js';
import '../editor.js';
import '../interaction.js';
import '../workbench.js';
import '../workflow.js';
import '../magic-import.js';
import '../magic-detection.js';
import '../physics.js';
import '../slot-outline.js';
import '../scene-export.js';
import '../gif-export.js';
import '../exports.js';
import '../context-menu.js';
import '../usability.js';
import './gif-decoder.js';

// The UI is split into app/*.js and app.js; read them in page order as one source.
const { page } = await manifest(fileURLToPath(new URL('..', import.meta.url)));
const source = (await Promise.all(page.filter((file) => file === 'app.js' || file.startsWith('app/')).map((file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8')))).join('\n');
const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');

// Run the actual UI controller and drawing functions; browser layout is stubbed.
function controller(width = 1440) {
  const elements = new Map(), listeners = new Map(), storage = new Map();
  const document = { querySelectorAll: () => [], activeElement: null, body: { classList: { add() {}, remove() {} } }, addEventListener: (name, handler) => listeners.set(name, handler) };
  const element = (selector) => {
    if (!elements.has(selector)) {
      const classes = new Set(), attributes = new Map();
      elements.set(selector, {
        innerHTML: '', hidden: false, dataset: {}, attributes, listeners: new Map(), addEventListener(name, handler) { this.listeners.set(name, handler); },
        querySelectorAll: () => [], getScreenCTM: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
        getBoundingClientRect: () => ({ width: 800, height: 450 }),
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
    grid: true, dimensions: true, ghosts: true, trace: true, labels: true, profileVisible: true, timelineVisible: true, playing: false, motion: 0, mode: 'edit', tool: 'select', snap: false,
    smartSnap: false, snapPreview: null, pendingSnap: null,
    revisionScope: 'current', cadSlotOutlines: true, magic: null, gifExport: null,
    traceRef: { elementId: 'body', point: 'b' }, result: E.design(project, 0), pointer: { x: 0, y: 0 },
    history: [], historySelections: [], future: [], futureSelections: [],
  };
  const context = vm.createContext({
    KinmoUsability: globalThis.KinmoUsability, state, document, location: { protocol: 'https:', origin: 'https://app.example.com' }, window: { innerWidth: width, addEventListener() {}, getSelection: () => ({ removeAllRanges() {} }) }, $: element,
    icon: () => '', escape: (value) => String(value), fmt: (value) => String(value), svgNS: 'http://www.w3.org/2000/svg',
    line: (a, b, attributes = '') => `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" ${attributes}/>`,
    ib: (name, action, title, active = false, extra = '') => `<button data-action="${action}" ${extra}></button>`,
    K, I, E, P: globalThis.KinmoPhysics, W: globalThis.KinmoWorkbench, WF: globalThis.KinmoWorkflow, M: { ...globalThis.KinmoMagicImport }, AD: { ...globalThis.KinmoDetection }, AbortController, X: globalThis.KinmoExport, G: globalThis.KinmoGIF, SC: globalThis.KinmoScene, typeNames: { ground: 'Rám', link: 'Rameno', node: 'Bod', rail: 'Vedenie', panel: 'Čelo', cam: 'Rotačná vačka' }, typeIcons: { ground: 'ground', cam: 'cam' },
    CAD: { ENDPOINT: 'http://127.0.0.1:8765', rememberedKey:()=>'',rememberPairing(){} },
    drawElement() { return '<g class="ghost-body"/>'; }, renderTree() {}, renderInspector() {}, renderScene() {}, renderGraph() {}, fitView() {},
    onChange() {}, onSubmit() {}, onContextMenu() {}, updateHover() {}, updateMotion() {},
    worldPoint: (event) => ({ x: event.clientX, y: event.clientY }), solveCurrent: () => E.design(state.project, state.motion),
    changed() { if (state.magic) state.magic.geometryStarted = true; context.repairSelection(); state.result = E.design(state.project, state.motion); }, recalculate() { state.result = E.design(state.project, state.motion); },
    toast(message) { context.lastToast = message; }, currentElement: () => state.project.elements.find((e) => e.id === state.selected),
    contextMenu: { close(focus) { context.menuClosed = { focus }; }, open(menu) { context.openedMenu = menu; } },
    setTool: (tool) => { state.tool = tool; },
    setMotion: (motion) => { state.motion = motion; }, lastFrame: 1000, lastInspector: 0, requestAnimationFrame() {},
    parseReference: (value) => { const [elementId, point] = value.split('|'); return { elementId, point }; },
    updateToolbar: () => { context.updateInspectorVisibility(); context.updatePanelVisibility(); },
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) }, storageKey: 'qa', lastKey: 'qa.last', DOUBLE_CLICK_MS: 400, settingsKey: 'qa.settings', DD: { NAME: 'Zásuvka', KIND: 'double-drawer' },
    collectionKeys: { assembly: 'qa.assemblies', revision: 'qa.revisions' },
    clearTimeout() {}, setTimeout: (callback) => { context.nextTimer = callback; return 1; }, autosaveTimer: null, latestSVG: '', updateHeader() {},
    URL: { revokeObjectURL: (url) => { (context.revokedURLs ||= []).push(url); } },
    isDoubleDrawer: () => state.project.kind === 'double-drawer',
    projectSelection: (project) => project.elements.find((e) => e.role === 'front')?.id || project.elements.find((e) => e.type === 'panel')?.id || project.elements.find((e) => e.role === 'coupler')?.id || project.elements[0]?.id || null,
    applyPreferences: (value) => Object.assign(state, globalThis.KinmoExport.preferences(value)), saveProject: () => true,
    download: (filename, content, type) => { context.downloaded = { filename, content, type }; },
    modal: (title, html, wide) => { context.dialog = { title, html, wide }; },
  });
  for (const name of ['fusionFeedback', 'checkFusionConnection', 'onLostPointerCapture', 'connectionDiagram', 'touchStart', 'touchMove', 'touchEnd', 'mainDimensionsSVG', 'previewConnection', 'confirmConnection', 'propertiesOverview', 'buildShell', 'updateInspectorVisibility', 'setInspectorOpen', 'updatePanelVisibility', 'toggleViewPanel', 'selectElement', 'selectTarget', 'repairSelection', 'memberSelected', 'selectedNodeReferences', 'defaultTraceReference', 'closeContextMenu', 'jointPoints', 'canvasHit', 'contextItems', 'openContextMenu', 'onContextMenu', 'pushHistory', 'undo', 'editCanvas', 'deleteSelected', 'fixSelected', 'onPointerDown', 'onPointerMove', 'onPointerUp', 'onCanvasSubmit', 'animate', 'templateCards', 'projectsModal', 'canSelectText', 'onKeyboard', 'wireEvents', 'manipulationSVG', 'transformModal', 'submitTransform', 'renderDiagnostics', 'toggleSmartSnap', 'findDragSnap', 'smartSnapSVG', 'offerSnapConnection', 'submitSnapConnection', 'readCollection', 'writeCollection', 'collectionRecord', 'recordSaveModal', 'draftRecord', 'submitWorkbenchSave', 'exportCollection', 'importCollection', 'collectionErrorModal', 'assembliesModal', 'insertLibraryModal', 'submitLibraryInsert', 'revisionsModal', 'restoreRevisionModal', 'confirmRevisionRestore', 'comparisonModal', 'submitRevisionComparison', 'deleteRecordModal', 'confirmRecordDelete', 'loadProject', 'replaceProject', 'exportModal', 'fusionModal', 'onChange', 'magicBounds', 'magicImageSVG', 'renderMagicReference', 'magicDrawingSVG', 'magicWorking', 'magicActionAllowed', 'startMagicImport', 'renderMagicImport', 'setMagicStep', 'nextMagicStep', 'pickMagicImage', 'onSubmit', 'onMagicImage', 'submitMagicScale', 'selectMagicTool', 'clearMagicDrawing', 'commitMagicDrawing', 'magicPointer', 'onMagicSetting', 'persistMagicProjects', 'magicOriginalPreserved', 'submitMagicFinish', 'cancelMagicImport', 'addElement', 'duplicateElement', 'setTool', 'connectPoint', 'onContextAction', 'sceneMarkup', 'drawElement', 'drawMotorHousing', 'drawDoubleDrawer', 'drawElastic', 'panelPolygon', 'node', 'dimHorizontal', 'groundGlyph', 'traceLabel', 'gifOptions', 'gifModal', 'updateGIFEstimate', 'gifProgress', 'cancelGIF', 'checkGIF', 'gifSource', 'gifFrameCanvas', 'exportGIF', 'gifError']) {
    const definition = source.match(new RegExp(`  (?:async )?function ${name}\\([^\\n]*\\) \\{[\\s\\S]*?\\n  \\}`))?.[0];
    assert(definition, `Missing UI function ${name}`);
    vm.runInContext(definition, context);
  }
  vm.runInContext(source.match(/  const pathD = [^\n]+/)[0], context);
  for (const name of ['magicScalePreview', 'applyMagicScale', 'selectMagicDetectionRegion', 'runMagicDetection', 'applyMagicDetection', 'magicDetectionSVG', 'readProjects', 'duplicateProject', 'deleteProjectModal', 'confirmProjectDelete', 'setWorkspaceView', 'renderAnalysis', 'sceneSVG', 'sameReference', 'quantityInput', 'quantityValue', 'startDimensionPick', 'cancelDimensionPick', 'pickDimensionPoint', 'dimensionModal', 'dimensionReferences', 'updateDimensionForm', 'submitDimension', 'nodeOptions', 'onPropertyChange', 'field', 'applyProject', 'setMode', 'panelPoints']) {
    vm.runInContext(source.match(new RegExp(`  (?:async )?function ${name}\\([^\\n]*\\) \\{[\\s\\S]*?\\n  \\}`))[0], context);
  }
  for (const name of ['updateSelectionSummary','motorParts','viewElementVisible','portVisible','guardMotorMotion','treeMemberHTML','assemblyTreeHTML','basicInspectorHTML','setDetailLevel','setMotorMode','isolateSelection','quantityTextInput','rigidAssemblyModal','submitRigidAssembly','reviewHoleOwnership','submitHoleOwnership','testDetectedMechanism','automaticVersion','readAutomaticVersions','captureMeasurement','elementContextItems','onWheel','startPan','zoom','onKeyUp','releasePointer','finishClick','repeatedClick','isMacPlatform','renderMarquee','finishMarquee','onDoubleClick','runPrimaryAction','primaryAction','menuHas','markPrimary','tidyMenu','memberLink','selectedBodyCount','canvasMenu','templateMenu','jointMenu','curvePointMenu','pathMenu','nodeMenu','bodyTypeItems','bodyMenu','selectionMenu','typeDimension','liveDimensionSVG','elasticStatusSVG','railFreedomSVG','freedomBlockersSVG','chooseConnectionTarget','snapTargetDiagram','repairDiagram','applyRepairPreview','motorHousing','repairModel','referenceCalibrationModal','pickReferenceCalibration','elasticResponseModal','applyResponsePreset','reviewDetectedMechanism','commitDetectedReview','jointModal','beginGuideDrag', 'beginBodyDrag', 'beginElasticDrag', 'resumeElasticMotion', 'prepareForces', 'renderWorkflowTools', 'mobileToolsModal', 'referenceSVG', 'referenceSettings', 'freedomSVG', 'toggleTrial', 'trialSVG', 'kitModal', 'motionPlanModal', 'renderPlanRows', 'readPlanDraft', 'reviewImpact', 'magicPoseAlignment', 'pushDetectionHistory', 'undoDetection', 'editDetection', 'commitDetectionOutline', 'detectionEditSVG', 'workflowSubmit', 'cyclePlacementMount', 'renderPlacementTools', 'renderSnapChoices', 'dismissSnapChoices', 'selectionReference', 'renderBindingTools', 'beginSelectedConnection', 'renderModelChecks', 'focusModelCheck', 'toggleGridSnap', 'toggleAngleSnap', 'snapPaths', 'snapOptions', 'placementAt', 'snapDrawingPoint', 'renderSmartSnapPreview', 'canvasDialog', 'canvasOtherOptions', 'jointModal', 'contextNodeReferences', 'contextDeleteKeys', 'curveEditKeys', 'partPointModal', 'submitPartPoint', 'slotSemicircleModal', 'submitSlotSemicircle', 'tracePointOptions']) vm.runInContext(source.match(new RegExp(`  function ${name}\\([^\\n]*\\) \\{[\\s\\S]*?\\n  \\}`))[0], context);
  vm.runInContext(source.match(/  const traceReferences = \(\) => \[[\s\S]*?\n  \];/)[0], context);
  return { context, state, element, document, listeners, storage };
}

function curveController() {
  const fixture = controller(), { context, state } = fixture;
  const e = { ...context.K.makeElement('slot', 200, 150), id: 'qa-slot', controls: [{ x: 0, y: 0 }, { x: 40, y: 80 }, { x: 120, y: 80 }, { x: 150, y: 0 }] };
  state.project.elements.push(e); state.project = context.K.validateProject(state.project); state.result = context.E.design(state.project, 0);
  context.selectTarget(context.I.elementKey(e.id));
  return { ...fixture, slot: state.project.elements.at(-1), event: (point) => ({ clientX: point.x, clientY: point.y, target: { closest: () => null } }) };
}
test('Part menus keep existing highlights and fix only the clicked node, not another selected node', () => {
  const { context, state } = controller(), clicked = { elementId: 'body', point: 'a' }, other = { elementId: 'another-body', point: 'a' };
  const keys = [context.I.nodeKey(other), context.I.elementKey('body')]; state.selectedElementIds = keys; context.repairSelection();
  context.openContextMenu({ clientX: 10, clientY: 20, target: { closest: () => null } }, context.I.nodeKey(clicked));
  assert.deepEqual([...state.selectedElementIds], keys); assert(context.memberSelected('body') && context.memberSelected('another-body'));
  context.onContextAction('fix'); assert(context.I.fixed(state.project, clicked)); assert(!context.I.fixed(state.project, other));
  assert.deepEqual([...state.selectedElementIds], keys);
});
test('The background context menu does not clear an existing highlighted selection', () => {
  const { context, state } = controller();
  context.selectTarget(context.I.elementKey('body'));
  context.openContextMenu({ clientX: 400, clientY: 400, target: { closest: () => null } }, null);
  assert.deepEqual([...state.selectedElementIds], [context.I.elementKey('body')]);
});
test('Active Bezier control handles are geometrically hit before bodies and have exact part identities', () => {
  const { context, slot, event } = curveController(), point = { x: slot.x + slot.controls[2].x, y: slot.y + slot.controls[2].y };
  assert.equal(context.canvasHit(event(point)), context.I.controlKey(slot.id, 2));
  context.openContextMenu(event(point), context.I.controlKey(slot.id, 2));
  assert.match(context.openedMenu.title, /P2/); assert(context.openedMenu.items.some((item) => item.id === 'control-delete'));
  assert(!context.openedMenu.items.some((item) => item.id === 'delete'));
});
test('Shift-F10 anchors the exact selected Bezier control rather than the body midpoint', () => {
  const { context, state, slot } = curveController(), key = context.I.controlKey(slot.id, 2), pose = state.result.poses[slot.id], point = context.K.worldPoint({ ...pose, a: pose.controlOrigin || pose.a }, slot.controls[2]);
  const target = { closest: (selector) => selector === '[data-selection-key]' ? { dataset: { selectionKey: key } } : null };
  context.openContextMenu = (event, targetKey) => { context.menuProbe = { event, targetKey }; };
  context.onKeyboard({ key: 'F10', shiftKey: true, target, preventDefault() {} });
  assert.equal(context.menuProbe.targetKey, key); assert.equal(context.menuProbe.event.clientX, point.x); assert.equal(context.menuProbe.event.clientY, point.y);
});
test('The bulk geometry form keeps an edited semicircle exact and makes one undo step', async () => {
  const { context, state, slot } = curveController();
  state.project = context.I.semicircle(state.project, slot.id, 80, -1); state.result = context.E.design(state.project, 0);
  context.FormData = function () { return new Map([['points', '0;0\n200;0']]); };
  vm.runInContext(source.match(/  async function onSubmit\([^\n]*\) \{[\s\S]*?\n  \}/)[0], context);
  await context.onSubmit({ target: { id: 'geometry-form', dataset: { outline: 'false' } }, preventDefault() {} });
  const next = state.project.elements.at(-1);
  assert(next.curveSemicircle && next.curveSide === -1); assert.equal(next.curveRadius, 100); assert.equal(state.history.length, 1);
  context.undo(); assert.equal(state.project.elements.at(-1).curveRadius, 80);
});
test('Trace point choices include carriage CT/CB and switch to the single cam axis', () => {
  const { context, state } = controller(), rail = { ...context.K.makeElement('rail', 200, 300), drive: false }, cam = context.K.makeElement('cam', 350, 300);
  state.project.elements.push(rail, cam); state.project = context.K.validateProject(state.project); state.traceRef = { elementId: rail.id, point: 'ct' };
  vm.runInContext(source.match(/  function traceModal\([^\n]*\) \{[\s\S]*?\n  \}/)[0], context);
  context.traceModal();
  const choices = context.dialog.html.match(/<select[^>]*name="point">([\s\S]*?)<\/select>/)[1];
  assert.match(choices, /value="ct" selected/); assert.match(choices, /value="cb"/);
  const point = { value: 'ct', innerHTML: choices };
  context.onChange({ target: { name: 'element', value: cam.id, dataset: {}, closest: () => null, form: { id: 'trace-form', elements: { point } } } });
  assert.match(point.innerHTML, /value="a"/); assert.doesNotMatch(point.innerHTML, /value="(b|c|ct|cb)"/);
});
test('Right-click P2 removes only that control point, retains highlighted members and creates one undo step', () => {
  const { context, state, slot, event } = curveController();
  state.selectedElementIds = [context.I.elementKey('another-body'), context.I.elementKey(slot.id)]; context.repairSelection();
  const before = JSON.stringify(state.project), point = { x: slot.x + slot.controls[2].x, y: slot.y + slot.controls[2].y };
  context.openContextMenu(event(point), context.I.controlKey(slot.id, 2)); context.onContextAction('control-delete');
  assert.equal(state.project.elements.length, 3); assert.equal(state.project.elements.at(-1).controls.length, 3);
  assert.equal(state.history.length, 1); assert(context.memberSelected('another-body') && context.memberSelected(slot.id));
  context.undo(); assert.equal(JSON.stringify(state.project), before);
});
test('A curve part menu adds a Bezier control at the clicked path without creating a joint', () => {
  const { context, state, slot, event } = curveController(), at = state.result.poses[slot.id].path[50];
  context.openContextMenu(event(at), context.I.pathKey(slot.id)); context.onContextAction('curve-add-control');
  const next = state.project.elements.at(-1);
  assert.equal(next.controls.length, 5); assert.equal(state.project.connections.length, 0); assert.equal(state.history.length, 1);
  assert(next.controls.some((p) => Math.abs(p.x + next.x - at.x) < 1e-8 && Math.abs(p.y + next.y - at.y) < 1e-8));
});
test('A slot curve context menu offers a semicircle radius form with the endpoint rule stated', () => {
  const { context, state, slot, event } = curveController(), before = JSON.stringify(state.project), at = state.result.poses[slot.id].path[50];
  context.openContextMenu(event(at), context.I.pathKey(slot.id)); context.onContextAction('curve-semicircle');
  assert.match(context.dialog?.html || '', /slot-semicircle-form/); assert.match(context.dialog.html, /2R/);
  assert.equal(JSON.stringify(state.project), before); assert.equal(state.history.length, 0);
});
test('The semicircle form accepts radius expressions, retains bad input and inserts one undoable exact arc', () => {
  const { context, state, slot } = curveController(), form = { dataset: { element: slot.id } }, before = JSON.stringify(state.project);
  context.slotSemicircleModal(slot.id); const dialog = context.dialog;
  assert.throws(() => context.submitSlotSemicircle(form, new Map([['radius', '1/0'], ['side', '1']])));
  assert.equal(context.dialog, dialog); assert.equal(JSON.stringify(state.project), before); assert.equal(state.history.length, 0);
  context.submitSlotSemicircle(form, new Map([['radius', '8 cm'], ['side', '-1']]));
  const next = state.project.elements.at(-1); assert(next.curveSemicircle && next.curveKind === 'arc'); assert.equal(next.curveRadius, 80);
  assert.equal(context.K.distance(next.controls[0], next.controls[1]), 160); assert.equal(state.history.length, 1);
  context.undo(); assert.equal(JSON.stringify(state.project), before);
});
test('A part coordinate form changes only the chosen control and does not masquerade as a joint node', () => {
  const { context, state, slot } = curveController(), key = context.I.controlKey(slot.id, 2), form = { dataset: { key } };
  context.partPointModal(key); assert.match(context.dialog.html, /part-point-form/);
  context.submitPartPoint(form, new Map([['x', '12/2 cm'], ['y', '25 mm']]));
  const controls = state.project.elements.at(-1).controls; assert.equal(controls[2].x, 60); assert.equal(controls[2].y, 25);
  assert.equal(controls[1].x, 40); assert.equal(controls[3].x, 150); assert.equal(state.project.connections.length, 0); assert.equal(state.history.length, 1);
});
test('Clicking a control adds no history and cancelling its drag preserves a full 60-step undo/redo history', () => {
  const { context, state, slot } = curveController(), key = context.I.controlKey(slot.id, 2), at = { x: slot.x + slot.controls[2].x, y: slot.y + slot.controls[2].y };
  const target = { closest: (selector) => selector === '[data-element-control]' ? { dataset: { elementControl: '2' } } : selector === '[data-context-key]' ? { dataset: { contextKey: key } } : null };
  const event = (point, extra = {}) => ({ clientX: point.x, clientY: point.y, button: 0, pointerId: 1, target, preventDefault() {}, ...extra });
  context.onPointerDown(event(at)); context.onPointerUp(event(at)); assert.equal(state.history.length, 0);
  state.history = Array.from({ length: 60 }, (_, i) => ({ ...context.K.copy(state.project), name: `Before ${i}` }));
  state.historySelections = Array.from({ length: 60 }, () => [key]); state.future = [{ ...context.K.copy(state.project), name: 'Redo' }]; state.futureSelections = [[key]];
  const history = [...state.history], future = state.future, before = JSON.stringify(state.project);
  context.onPointerDown(event(at)); context.onPointerMove(event({ x: at.x + 20, y: at.y + 10 }));
  assert.notEqual(JSON.stringify(state.project), before);
  context.onPointerUp(event(at, { cancelled: true }));
  assert.equal(JSON.stringify(state.project), before); assert.deepEqual([...state.history], history); assert.equal(state.future, future);
});
const gifData = (values = {}) => new Map(Object.entries({ width: '160', duration: '1', fps: '6', direction: 'roundtrip', loop: 'on', ...values }).filter(([, value]) => value !== null));
function gifController() {
  const fixture = controller(), { context, state, element, document } = fixture, hosts = [], frames = [], snapshots = [];
  state.project.elements[0].drive = true;
  state.project = context.K.validateProject(state.project);
  state.result = context.E.design(state.project, 0);
  state.view = { x: -100, y: -100, width: 800, height: 450 }; state.baseView = { ...state.view };
  state.ghosts = false; state.trace = false; state.dimensions = false; state.collisions = false;
  context.DD = globalThis.DoubleDrawer;
  context.AbortController = AbortController; context.setTimeout = setTimeout; context.clearTimeout = clearTimeout;
  context.FormData = class { constructor() { return gifData(); } };
  context.actions = { 'cancel-gif': context.cancelGIF, 'close-modal': () => element('#modal').close() };
  element('#modal').open = true;
  document.createElement = (tag) => {
    const node = element(`created:${tag}:${hosts.length}`); node.style = {}; node.children = [];
    node.append = (child) => node.children.push(child); node.remove = () => { node.removed = true; };
    return node;
  };
  document.createElementNS = (ns, tag) => document.createElement(tag);
  document.body.append = (host) => hosts.push(host);
  const drawing = context.sceneMarkup;
  context.sceneMarkup = (result, options) => { frames.push(result.motion); return drawing(result, options); };
  let canvasCount = 0;
  context.SC = {
    snapshot(svg, options) { snapshots.push({ markup: svg.innerHTML, options, labelsHidden: svg.classList.contains('labels-hidden') }); return String(frames.at(-1)); },
    async rasterize(svg, plan, options) {
      assert.equal(options.readPixels, true); assert(!options.signal.aborted);
      const canvas = options.canvas || { getContext: () => ({ getImageData: () => {
        const pixels = new Uint8ClampedArray(canvas.width * canvas.height * 4).fill(255);
        pixels.set([78, 150, 200, 255], (Math.round(canvas.motion / 360 * (canvas.width - 1)) % canvas.width) * 4);
        return { data: pixels };
      } }) };
      if (!options.canvas) canvasCount++;
      canvas.width = plan.width; canvas.height = plan.height; canvas.motion = Number(svg);
      fixture.canvas = canvas; return canvas;
    },
  };
  const submit = source.match(/  async function onSubmit\([^\n]*\) \{[\s\S]*?\n  \}/)[0]; vm.runInContext(submit, context);
  return Object.assign(fixture, { hosts, frames, snapshots, canvases: () => canvasCount });
}

function gifUnchanged(fixture) {
  const { state, storage, element } = fixture;
  return JSON.stringify({ project: state.project, result: state.result, view: state.view, baseView: state.baseView, motion: state.motion, playing: state.playing, direction: state.direction, mode: state.mode, tool: state.tool, selected: state.selected, selection: state.selectedElementIds, history: state.history, future: state.future, dynamic: state.dynamic, dynamicHistory: state.dynamicHistory, storage: [...storage], liveCanvas: element('#mechanism-canvas').innerHTML });
}

test('GIF export is discoverable, has bounded settings and labels kinematics honestly', () => {
  const { context, state, element } = gifController(), before = JSON.stringify(state.project);
  context.exportModal(); assert.match(context.dialog.html, /data-action="export-gif"/);
  context.gifModal(); assert.match(context.dialog.html, /id="gif-form"/); assert.match(context.dialog.html, /nie časový záznam/);
  for (const token of ['name="width"', 'name="duration"', 'name="fps"', 'name="direction"', 'name="loop"', 'role="status"', 'role="alert"', 'data-action="cancel-gif"', '90 sekundách']) assert(context.dialog.html.includes(token), token);
  assert.match(element('#gif-estimate').textContent, /160 × 90 px/);
  assert.equal(element('#gif-start').disabled, false); assert.equal(JSON.stringify(state.project), before);
});

test('GIF settings reject excessive work before a canvas or timer is allocated', async () => {
  const fixture = gifController(), { context, state, hosts } = fixture, before = gifUnchanged(fixture);
  await assert.rejects(context.exportGIF(gifData({ width: '1200', duration: '12', fps: '20' })), /180 snímok/);
  await assert.rejects(context.exportGIF(gifData({ width: '1200', duration: '8', fps: '10' })), /60 miliónov/);
  assert.equal(state.gifExport, null); assert.equal(hosts.length, 0); assert.equal(gifUnchanged(fixture), before);
});

test('GIF refuses an empty, unpowered, busy or already blocked model without modifying it', async () => {
  for (const kind of ['empty', 'no-drive', 'magic', 'drag', 'blocked']) {
    const fixture = gifController(), { context, state, hosts } = fixture;
    if (kind === 'empty') state.project.elements = [];
    if (kind === 'no-drive') state.project.elements[0].drive = false;
    if (kind === 'magic') state.magic = {};
    if (kind === 'drag') state.drag = {};
    if (kind === 'blocked') state.samples = [{ motion: 12, blocked: true, issues: ['Obmedzenie.'] }];
    const before = gifUnchanged(fixture);
    await assert.rejects(context.exportGIF(gifData()));
    assert.equal(state.gifExport, null); assert.equal(hosts.length, 0); assert.equal(gifUnchanged(fixture), before);
  }
});

test('GIF frames use the actual drawing outside the live canvas, preserve state and independently decode', async () => {
  const fixture = gifController(), { context, state, hosts, frames, snapshots } = fixture;
  state.motion = 33; state.playing = true; state.labels = false; state.selected = 'body'; state.selectedElementIds = ['e:body'];
  state.dynamic = { motion: 33, velocity: 12, time: 4 }; state.dynamicHistory = [{ ...state.dynamic }];
  fixture.element('#mechanism-canvas').innerHTML = 'original live drawing';
  const before = gifUnchanged(fixture);
  assert.equal(await context.exportGIF(gifData()), true);
  const decoded = globalThis.KinmoGifTestDecoder.decode(context.downloaded.content);
  assert.equal(context.downloaded.type, 'image/gif'); assert.match(context.downloaded.filename, /\.gif$/);
  assert.equal(decoded.width, 160); assert.equal(decoded.height, 90); assert.equal(decoded.frames.length, 6); assert.equal(decoded.loop, 0);
  assert.equal(decoded.frames.reduce((sum, frame) => sum + frame.delay, 0), 100);
  assert.notDeepEqual(decoded.frames[0].indices, decoded.frames[1].indices);
  assert.equal(frames.length, 9); assert.equal(snapshots.length, 9); assert(snapshots.every((frame) => frame.labelsHidden && frame.markup.includes('node-ring')));
  assert(snapshots.every((frame) => !frame.markup.includes('data-editor-overlay')));
  assert.equal(fixture.canvases(), 1); assert(hosts[0].removed && hosts[0].inert);
  assert.equal(fixture.canvas.width, 0); assert.equal(state.gifExport, null);
  assert.equal(gifUnchanged(fixture), before); assert.equal(fixture.element('#gif-progress').value, 1);
});

test('GIF single-pass direction omits the loop extension and includes both range ends', async () => {
  const { context, frames } = gifController();
  await context.exportGIF(gifData({ direction: 'forward', loop: null }));
  const decoded = globalThis.KinmoGifTestDecoder.decode(context.downloaded.content);
  assert.equal(decoded.loop, null); assert.equal(decoded.frames.length, 6);
  assert.deepEqual(frames.slice(-6), [0, 72, 144, 216, 288, 360]);
});

test('Cancelling GIF during decoding stops download, releases private resources and preserves all state', async () => {
  const fixture = gifController(), { context, state, hosts } = fixture, before = gifUnchanged(fixture);
  context.SC.rasterize = (svg, plan, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('mock decode cancelled')), { once: true }));
  const pending = context.exportGIF(gifData()); assert(state.gifExport); context.cancelGIF();
  assert.equal(await pending, false); assert.equal(context.downloaded, undefined);
  assert.equal(state.gifExport, null); assert(hosts[0].removed); assert.equal(gifUnchanged(fixture), before);
  assert.match(fixture.element('#gif-status').textContent, /Export zrušený/); assert(!fixture.element('#gif-options').disabled);
});

test('GIF deadline reports its own reason, not a generic raster abort, and allows retry', async () => {
  const fixture = gifController(), { context, state, hosts } = fixture, before = gifUnchanged(fixture);
  context.G = { ...globalThis.KinmoGIF, limits: { ...globalThis.KinmoGIF.limits, timeout: 10 } };
  context.SC.rasterize = (svg, plan, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('mock image abort')), { once: true }));
  await assert.rejects(context.exportGIF(gifData()), /90 sekúnd/);
  assert.equal(state.gifExport, null); assert(hosts[0].removed); assert.equal(context.downloaded, undefined);
  assert.equal(gifUnchanged(fixture), before); assert(!fixture.element('#gif-start').disabled);
});

test('Cancelling GIF after encoded frames discards partial bytes and releases the reused canvas', async () => {
  const fixture = gifController(), { context, state, frames } = fixture, raster = context.SC.rasterize, before = gifUnchanged(fixture);
  context.SC.rasterize = async (...args) => { const canvas = await raster(...args); if (frames.length === 5) context.cancelGIF(); return canvas; };
  assert.equal(await context.exportGIF(gifData()), false);
  assert.equal(context.downloaded, undefined); assert.equal(state.gifExport, null);
  assert.equal(fixture.canvas.width, 0); assert(fixture.hosts[0].removed); assert.equal(gifUnchanged(fixture), before);
});

test('GIF output-size failure cannot download partial bytes or change the live mechanism', async () => {
  const fixture = gifController(), { context, state } = fixture, before = gifUnchanged(fixture);
  context.G = { ...globalThis.KinmoGIF, createEncoder: (options) => globalThis.KinmoGIF.createEncoder({ ...options, maxBytes: 1024 }) };
  await assert.rejects(context.exportGIF(gifData()), /GIF prekračuje/);
  assert.equal(context.downloaded, undefined); assert.equal(state.gifExport, null);
  assert.equal(fixture.canvas.width, 0); assert(fixture.hosts[0].removed); assert.equal(gifUnchanged(fixture), before);
});

test('Closing GIF cancels even if the browser delays its dialog close event', async () => {
  const fixture = gifController(), { context, state, element } = fixture, raster = context.SC.rasterize, before = gifUnchanged(fixture);
  context.SC.rasterize = async (...args) => { const canvas = await raster(...args); element('#modal').open = false; return canvas; };
  assert.equal(await context.exportGIF(gifData()), false);
  assert.equal(context.downloaded, undefined); assert.equal(state.gifExport, null);
  assert(fixture.hosts[0].removed); assert.equal(fixture.canvas.width, 0); assert.equal(gifUnchanged(fixture), before);
});

test('GIF decode failure cleans up without replacing current pose, selection or model', async () => {
  const fixture = gifController(), { context, state, hosts } = fixture, before = gifUnchanged(fixture);
  context.SC.rasterize = async () => { throw new Error('mock raster failure'); };
  await assert.rejects(context.exportGIF(gifData()), /mock raster failure/);
  assert.equal(state.gifExport, null); assert(hosts[0].removed); assert.equal(gifUnchanged(fixture), before);
});

test('A GIF pose blocked between existing samples fails atomically instead of skipping through it', async () => {
  const fixture = gifController(), { context, state } = fixture;
  state.project.parameters.rotationMax = 90;
  const engine = context.K;
  context.K = { ...engine, solve(project, motion, options) { const result = engine.solve(project, motion, options); if (motion === 60) { result.blocked = true; result.issues = ['Limit kĺbu.']; } return result; } };
  const before = gifUnchanged(fixture);
  await assert.rejects(context.exportGIF(gifData()), /pri 60 °: Limit kĺbu/);
  assert.equal(context.downloaded, undefined); assert.equal(state.gifExport, null); assert.equal(gifUnchanged(fixture), before);
});

test('GIF refuses visually identical indexed frames instead of offering a static animation', async () => {
  const fixture = gifController(), { context, state } = fixture, before = gifUnchanged(fixture), raster = context.SC.rasterize;
  context.SC.rasterize = async (...args) => { const canvas = await raster(...args); canvas.motion = 0; return canvas; };
  await assert.rejects(context.exportGIF(gifData()), /nevytvárajú viditeľný pohyb/);
  assert.equal(context.downloaded, undefined); assert.equal(state.gifExport, null); assert.equal(gifUnchanged(fixture), before);
});

test('Unexpected project replacement aborts GIF without restoring over newer user work', async () => {
  const fixture = gifController(), { context, state } = fixture, original = state.project, raster = context.SC.rasterize;
  context.SC.rasterize = async (...args) => { const canvas = await raster(...args); state.project = context.K.copy(original); state.project.name = 'Newer user work'; return canvas; };
  await assert.rejects(context.exportGIF(gifData()), /Projekt sa počas/);
  assert.equal(state.project.name, 'Newer user work'); assert.equal(original.name, 'QA');
  assert.equal(context.downloaded, undefined); assert.equal(state.gifExport, null);
});

test('Active GIF blocks editor input, playback, imports and duplicate jobs but Escape cancels it', async () => {
  const fixture = gifController(), { context, state, listeners, element } = fixture;
  context.wireEvents(); state.playing = true;
  state.gifExport = { controller: new AbortController(), cancelled: false };
  const before = gifUnchanged(fixture);
  context.animate(1100); context.onPointerDown({}); context.onPointerMove({});
  context.onChange({ target: { dataset: { property: 'length' } } });
  context.replaceProject(context.K.preset('drawer'));
  element('#motion-range').listeners.get('input')({ target: { value: '60' } });
  element('#motion-graph').listeners.get('click')({});
  let prevented = false;
  listeners.get('click')({ target: { closest: () => ({ dataset: { action: 'play' } }) }, preventDefault() { prevented = true; } });
  assert(prevented); assert.equal(await context.exportGIF(gifData()), false); assert.equal(gifUnchanged(fixture), before);
  context.onKeyboard({ key: 'Escape' }); assert(state.gifExport.cancelled && state.gifExport.controller.signal.aborted);
  state.gifExport = null;
});

test('Closing the GIF dialog cancels its job, and form submission shows errors as text', async () => {
  const fixture = gifController(), { context, state, element } = fixture; context.wireEvents();
  state.gifExport = { controller: new AbortController() };
  element('#modal').open = false;
  element('#modal').listeners.get('close')(); assert(state.gifExport.controller.signal.aborted);
  state.gifExport = null; state.project.elements[0].drive = false;
  let prevented = false;
  await context.onSubmit({ target: { id: 'gif-form' }, preventDefault() { prevented = true; } });
  assert(prevented); assert.match(element('#gif-error').textContent, /jeden nezávislý motor/);
  context.gifError(new Error('<img src=x onerror=alert(1)>'));
  assert.equal(element('#gif-error').innerHTML, ''); assert.equal(element('#gif-error').textContent, '<img src=x onerror=alert(1)>');
});
test('Clicking outside a numeric dialog does not discard it; explicit close clears only that draft', () => {
  const { context, state, element } = controller(); context.wireEvents();
  element('#modal').open = true;
  state.pendingDeleteKeys = ['e:body']; state.pendingSnap = { target: 'draft' };
  const before = JSON.stringify(state.project);
  assert.equal(element('#modal').listeners.get('click'), undefined);
  element('#modal').listeners.get('close')();
  assert.deepEqual(state.pendingDeleteKeys, ['e:body']); assert(state.pendingSnap);
  element('#modal').open = false; element('#modal').listeners.get('close')();
  assert.equal(state.pendingDeleteKeys, null); assert.equal(state.pendingSnap, null); assert.equal(JSON.stringify(state.project), before);
});

test('The GIF editor lock permits its own blob download default action', () => {
  const { context, state, listeners } = gifController(); context.wireEvents();
  state.gifExport = { controller: new AbortController() };
  let prevented = false;
  const anchor = { href: 'blob:owned-output', closest: (selector) => selector === 'a[data-kinmo-download]' ? anchor : null };
  listeners.get('click')({ target: anchor, preventDefault() { prevented = true; } });
  assert.equal(prevented, false);
  assert.match(source, /anchor\.dataset\.kinmoDownload = 'true'/);
  state.gifExport = null;
});

for (const kind of ['drawer', 'fourbar', 'crank', 'double-drawer']) {
  test(`The actual ${kind} drawing takes an explicit GIF pose without modifying live state`, () => {
    const fixture = gifController(), { context, state } = fixture;
    state.project = context.K.validateProject(context.K.preset(kind)); state.motion = 13; state.selected = null; state.selectedElementIds = [];
    state.profile = context.K.prepareProject(state.project); state.result = context.K.solve(state.project, 13, { profile: state.profile, collisions: false });
    const before = gifUnchanged(fixture), range = context.K.driveRange(state.project), motion = range.min + (range.max - range.min) * .6;
    const result = context.K.solve(state.project, motion, { profile: state.profile, collisions: false });
    const markup = context.sceneMarkup(result, { exporting: true, view: state.view, scale: 2 });
    assert.match(markup, /node-ring/); assert(!markup.includes('data-editor-overlay'));
    if (kind === 'drawer') assert(markup.includes(`<rect x="${motion}"`));
    assert.equal(gifUnchanged(fixture), before);
  });
}

test('Joint points and elastic labels use the requested frame rather than stale live results', () => {
  const { context, state } = gifController(), result = context.K.copy(state.result);
  result.poses.body.a = { x: 700, y: 800 };
  const joint = { a: { elementId: 'body', point: 'a' }, b: { elementId: 'another-body', point: 'b' } };
  assert.deepEqual({ ...context.jointPoints(joint, result).a }, { x: 700, y: 800 });
  const spring = { ...context.K.makeElement('spring-compression'), id: 'spring' }, pose = { a: { x: 0, y: 0 }, b: { x: 100, y: 0 }, length: 100 };
  result.forces = [{ id: 'spring', magnitude: 37 }];
  state.result.forces = [{ id: 'spring', magnitude: 99 }];
  const drawing = context.drawElastic(spring, pose, '#123456', result);
  assert(drawing.includes('37 N') && !drawing.includes('99 N'));
});

test('Toolbar buttons retain native Space activation rather than starting playback', () => {
  const { context, state } = controller();
  context.actions = { play: () => { state.playing = true; } };
  let prevented = false;
  const button = { closest: (selector) => selector === 'button,a' ? button : null };
  context.onKeyboard({ key: ' ', code: 'Space', target: button, preventDefault() { prevented = true; } });
  assert.equal(prevented, false); assert.equal(state.playing, false);
});

test('CAD export has a shared width-outline switch without changing the model', () => {
  const { context, state } = controller(), before = JSON.stringify(state.project);
  context.exportModal(); assert.match(context.dialog.html, /id="cad-slot-outlines"[^>]* checked/);
  context.onChange({ target: { id: 'cad-slot-outlines', checked: false } });
  context.fusionModal(); assert.match(context.dialog.html, /id="cad-slot-outlines" type="checkbox"\/>/);
  assert.match(context.dialog.html,/name="trajectories"\/>/);
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
test('Analysis is a separate visible workspace with full sweep results, not a hidden properties tab', () => {
  const { context, state, element } = controller();
  state.samples = context.K.sample(state.project, 121, { collisions: false }); state.view = state.baseView = context.K.bounds(state.project, state.samples);
  vm.runInContext(source.match(/  function updateToolbar\([^\n]*\) \{[\s\S]*?\n  \}/)[0], context);
  const before = JSON.stringify(state.project);
  context.setWorkspaceView(true);
  assert.equal(state.inspectorOpen, false); assert(element('#canvas-area').hidden && !element('#analysis-workspace').hidden);
  assert.match(element('#analysis-workspace').innerHTML, /Analýza celého pohybu/);
  assert.match(element('#analysis-workspace').innerHTML, /Rozsah X \(mm\)/);
  assert.match(element('#analysis-workspace').innerHTML, /Chýba pohon/);
  context.selectTarget('e:body'); assert.equal(state.analysis, true);
  context.setWorkspaceView(false); assert(!element('#canvas-area').hidden && element('#analysis-workspace').hidden);
  assert.equal(JSON.stringify(state.project), before); assert.equal(state.history.length, 0);
});
test('Fit view uses only framing corners while smart snap retains its central circle', () => {
  const fit = source.match(/    fit: '([^']+)'/)[1], target = source.match(/    target: '([^']+)'/)[1];
  assert(!fit.includes('circle')); assert(target.includes('circle')); assert(source.includes("ib('fit', 'fit'"));
});
test('Image export uses the visible analysis preview rather than the hidden editor canvas', () => {
  const { context, state, element } = controller();
  context.SC = { snapshot: (svg) => svg }; state.analysis = true;
  assert.equal(context.sceneSVG(), element('#analysis-preview')); state.analysis = false;
  assert.equal(context.sceneSVG(), element('#mechanism-canvas'));
});

for (const width of [393, 1440]) {
  test(`Profile and timeline hide independently and remain restorable at ${width}px`, () => {
    const { context, state, element } = controller(width), before = JSON.stringify(state.project);
    state.playing = true; state.motion = 33; state.selectedElementIds = ['e:body']; state.selected = 'body';
    context.toggleViewPanel('profileVisible');
    assert(element('#motion-profile-panel').hidden && !element('#playback-panel').hidden);
    assert.equal(element('[data-action="profileVisible"]').attributes.get('aria-expanded'), 'false');
    assert.match(element('[data-action="profileVisible"]').title, /^Zobraziť/);
    context.toggleViewPanel('timelineVisible');
    assert(element('#motion-profile-panel').hidden && element('#playback-panel').hidden);
    context.toggleViewPanel('profileVisible');
    assert(!element('#motion-profile-panel').hidden && element('#playback-panel').hidden);
    context.toggleViewPanel('timelineVisible');
    assert(!element('#playback-panel').hidden);
    assert.equal(state.playing, true); assert.equal(state.motion, 33);
    assert.equal(state.selected, 'body'); assert.equal(state.history.length, 0);
    assert.equal(JSON.stringify(state.project), before);
  });
}

test('Hiding a focused playback panel returns focus to its permanent toolbar button', () => {
  const { context, document, element } = controller();
  document.activeElement = { panel: '#playback-panel' };
  context.toggleViewPanel('timelineVisible');
  assert.equal(document.activeElement, element('[data-action="timelineVisible"]'));
});

test('Panel visibility expands the view around its centre without changing zoom', () => {
  const { context, state, element } = controller();
  state.view = { x: 10, y: 20, width: 800, height: 400 }; state.baseView = { x: -390, y: -180, width: 1600, height: 800 };
  element('#mechanism-canvas').getBoundingClientRect = () => ({ width: 800, height: state.profileVisible ? 400 : 600 });
  context.toggleViewPanel('profileVisible');
  assert.deepEqual({ ...state.view }, { x: 10, y: -80, width: 800, height: 600 });
  assert.equal(state.baseView.height / state.view.height, 2);
  context.toggleViewPanel('profileVisible');
  assert.deepEqual({ ...state.view }, { x: 10, y: 20, width: 800, height: 400 });
});

test('Scheme labels have their own toggle, independent of dimensions and accessible geometry', () => {
  const { context, state, element } = controller();
  context.buildShell();
  const html = element('#app').innerHTML;
  assert.match(html, /data-action="labels"[^>]*aria-pressed="true"/);
  assert.match(html, /id="motion-profile-panel"/); assert.match(html, /id="playback-panel"/);
  assert(html.indexOf('data-action="timelineVisible"') < html.indexOf('id="playback-panel"'));
  assert(html.indexOf('data-action="profileVisible"') < html.indexOf('class="stage-header"'));
  assert.match(html, /id="motion-profile-panel"[^>]*hidden/); assert.match(html, /id="playback-panel"[^>]*hidden/);
  state.labels = false; context.updatePanelVisibility();
  assert(element('#mechanism-canvas').classList.contains('labels-hidden'));
  assert.match(element('[data-action="labels"]').title, /^Zobraziť texty/);
  assert(state.dimensions);
  const rule = styles.match(/\.labels-hidden :is\(([^)]+)\) \{ display: none; \}/)?.[1];
  assert(rule.includes('.angle-annotation') && rule.includes('.node-label') && rule.includes('.scene-heading'));
  assert(!rule.includes('.dimension-label') && !rule.includes('.diagnostic-label') && !rule.includes('.joint-node'));
  assert(source.includes('class="angle-annotation"'));
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

test('Canvas instructions let node clicks through while linking or picking dimensions', () => {
  const rules = [...styles.matchAll(/\.canvas-instruction\s*\{([^}]*)\}/g)].map((match) => match[1]);
  assert(rules.some((rule) => /pointer-events:\s*none\s*;/.test(rule)));
  for (const rule of rules) {
    const value = rule.match(/pointer-events:\s*([^;]+);/)?.[1];
    if (value) assert.equal(value.trim(), 'none');
  }
  assert.match(source, /instruction\.textContent =/);
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

test('Five modern palettes use the requested neutral surfaces and accessible accent text', () => {
  const palettes = [
    ['slate','#f8fafc','#ffffff','#0f172a','#4f46e5'],
    ['sage','#f9f9fb','#ffffff','#1e293b','#3b7a57'],
    ['steel','#f4f6f8','#ffffff','#111827','#0284c7'],
    ['sand','#fafafa','#ffffff','#18181b','#d97706'],
    ['dark','#0f172a','#1e293b','#f8fafc','#38bdf8'],
  ];
  const luminance = hex => { const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722; };
  const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  for(const [theme,canvas,paper,ink,accent] of palettes){
    const block=styles.match(new RegExp(`:root\\[data-theme="${theme}"\\] \{([^}]+)\}`))?.[1];assert(block,theme);
    for(const [name,value] of [['canvas',canvas],['paper',paper],['ink',ink],['accent',accent]])assert(block.includes(`--${name}: ${value};`));
    const token=name=>block.match(new RegExp(`--${name}: (#[a-f0-9]+);`))[1];
    for(const bg of [canvas,paper])for(const text of ['ink','secondary','muted'])assert(contrast(token(text),bg)>=4.5,`${theme} ${text} on ${bg}`);
    if(theme!=='dark')assert.equal(token('surface-subtle'),'#ffffff');
    assert(contrast(token('on-accent'),accent)>=4.5,`${theme} primary button`);
    assert(contrast(token('accent-ink'),token('accent-pale'))>=4.5,`${theme} active item`);
    assert(source.includes(`['${theme}',`));
  }
  assert(styles.includes('color: var(--on-accent)'));
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
  assert(context.dialog.html.includes('impact-form')); assert(context.dialog.html.includes('keep-pose')); assert.equal(state.project.elements.length, 2);
  context.deleteSelected(state.pendingDeleteKeys, true); assert.equal(state.project.elements.length, 1);
});

test('Workflow form submission prevents navigation and atomically saves the Magic reference preferences', async () => {
  const { context, state } = controller();
  state.project.importReference = { kind: 'magic', visible: true, opacity: .35, active: 0, frames: [{ name: 'Obrázok', dataURL: 'data:image/jpeg;base64,/9j/2Q==', rect: { x: 0, y: 0, width: 100, height: 50 } }] };
  const fields = new Map([['opacity', '60'], ['active', '0'], ['visible', 'on']]);
  context.FormData = class { get(key) { return fields.get(key) ?? null; } has(key) { return fields.has(key); } };
  let prevented = false; await context.onSubmit({ target: { id: 'reference-form' }, preventDefault() { prevented = true; } });
  assert(prevented); assert.equal(state.project.importReference.opacity, .6); assert.equal(state.history.length, 1);
  context.undo(); assert.equal(state.project.importReference.opacity, .35);
});
test('Reference control appears only for Magic projects and renders calibrated coordinates', () => {
  const { context, state, element } = controller(); context.renderWorkflowTools(); assert(!element('#workflow-tools').innerHTML.includes('reference-toggle'));
  state.project.source = { kind: 'custom', name: 'Magic import', motion: 0, note: '' }; context.renderWorkflowTools(); assert.match(element('#workflow-tools').innerHTML, /reference-toggle/); assert.match(element('#workflow-tools').innerHTML, /Doplniť pôvodný obrázok/);
  state.project.importReference = { kind: 'magic', visible: true, opacity: .35, active: 0, frames: [{ dataURL: 'data:image/jpeg;base64,/9j/2Q==', rect: { x: -20, y: -10, width: 200, height: 100 } }] };
  assert.match(context.referenceSVG(), /x="-20" y="-10" width="200"/); state.project.importReference.visible = false; assert.equal(context.referenceSVG(), '');
});
test('Consequence confirmation is one Undo operation and rejects a stale review', () => {
  const { context, state } = controller(), original = JSON.stringify(state.project), next = context.I.deleteSelection(state.project, ['e:body'], state.result);
  context.reviewImpact(next, 'Odstránené'); assert.equal(JSON.stringify(state.project), original);
  context.workflowSubmit({ id: 'impact-form' }, new Map([['keep-pose', 'on']])); assert.equal(state.project.elements.length, 1); assert.equal(state.history.length, 1);
  context.undo(); assert.equal(JSON.stringify(state.project), original);
  context.reviewImpact(next, 'Odstránené'); state.project.name = 'Novšia úprava'; assert.throws(() => context.workflowSubmit({ id: 'impact-form' }, new Map())); assert.equal(state.project.elements.length, 2);
});
test('Detection repair history is separate from project geometry and supports redo', () => {
  const { context, state } = tracingWizard(); state.magic.detectEnabled = true; context.setMagicStep(2.5);
  state.magic.detectCandidates = [{ id: 'manual', type: 'panel', selected: true, points: [{ x: 20, y: 20 }, { x: 80, y: 20 }], outline: [], anchors: [], evidence: {} }];
  const project = JSON.stringify(state.project); context.pushDetectionHistory(); state.magic.detectCandidates[0].points[0].x = 30;
  context.undoDetection(); assert.equal(state.magic.detectCandidates[0].points[0].x, 20); context.undoDetection(true); assert.equal(state.magic.detectCandidates[0].points[0].x, 30);
  assert.equal(JSON.stringify(state.project), project); assert.equal(state.history.length, 0);
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

test('Dragging a circular mount translates the entire rigid member and one Undo restores it', () => {
  const { context, state } = controller(); context.selectTarget('n:body:b');
  context.onPointerDown(pointer(110, 20)); context.onPointerMove(pointer(140, 45)); context.onPointerUp({ pointerId: 1 });
  assert.equal(state.project.elements[0].length, 100); assert.equal(state.project.elements[0].x, 40); assert.equal(state.project.elements[0].y, 45);
  assert.equal(state.history.length, 1); context.undo(); assert.equal(state.project.elements[0].x, 10); assert.equal(state.project.elements[0].y, 20);
});
test('Alt bypasses grid and smart snap during mounting-point dragging without changing the toggles', () => {
  const { context, state } = controller(); state.snap = true; state.smartSnap = true; context.selectTarget('n:body:a');
  context.onPointerDown(pointer(10, 20, { altKey: true })); context.onPointerMove(pointer(12, 58, { altKey: true })); context.onPointerUp({ pointerId: 1 });
  assert.equal(state.project.elements[0].x, 12); assert.equal(state.project.elements[0].y, 58); assert(!state.pendingSnap); assert(!state.snapPreview);
  assert(state.snap && state.smartSnap); assert.equal(state.project.elements[0].length, 100);
});
test('Palette click prepares a cancellable ghost; Tab cycles mounts without creating geometry or history', () => {
  const { context, state, element } = controller(), before = JSON.stringify(state.project);
  element('#mechanism-canvas').insertAdjacentHTML = (_, html) => { element('#mechanism-canvas').innerHTML += html; };
  context.addElement('rail'); assert.equal(state.insertingType, 'rail'); assert.equal(JSON.stringify(state.project), before); assert.equal(state.history.length, 0);
  context.cyclePlacementMount(); assert.equal(state.placementMount, 'ct');
  assert.match(element('#placement-tools').innerHTML, /placement-cancel/);
  context.cyclePlacementMount(true); assert.equal(state.placementMount, 'c');
  context.onPointerDown(pointer(200, 200, { target: { closest: () => null } }));
  assert.equal(state.insertingType, null); assert.equal(state.project.elements.length, 3); assert.equal(state.history.length, 1);
  const rail = state.project.elements.at(-1), point = context.K.point(state.result, { elementId: rail.id, point: 'c' });
  assert.equal(point.x, 200); assert.equal(point.y, 200); context.undo(); assert.equal(state.project.elements.length, 2);
});
test('A stale inline snap transaction cannot merge a connection into unrelated edits', () => {
  const { context, state } = controller(); state.smartSnap = true; context.selectTarget('n:body:a');
  context.onPointerDown(pointer(10, 20)); context.onPointerMove(pointer(10, 59)); context.onPointerUp({ pointerId: 1 });
  assert(state.pendingSnap); state.project.elements[0].name = 'Changed after snap';
  assert.throws(() => context.submitSnapConnection(new Map([['type', 'fixed']])));
  assert.equal(state.project.connections.length, 0); assert.equal(state.pendingSnap, null); assert.equal(state.history.length, 1);
});
test('Clickable model checks select the named body and start connecting its mounting point', () => {
  const { context, state, element } = controller(); state.view = { x: 800, y: 800, width: 300, height: 200 }; context.renderModelChecks();
  assert.match(element('#model-checks').innerHTML, /data-key="e:body"/);
  context.focusModelCheck({ dataset: { key: 'e:body', kind: 'connect' } });
  assert.equal(state.selected, 'body'); assert.equal(state.tool, 'connect'); assert.equal(state.pendingJoint.elementId, 'body');
  assert.equal(state.view.x, -90); assert.equal(state.view.y, -80);
  context.selectTarget('n:body:b'); context.renderBindingTools();
  assert.equal(element('#binding-tools').hidden, true, 'selection never opens connection controls'); assert.match(element('#binding-tools').innerHTML, /bod k rámu/); assert.match(element('#binding-tools').innerHTML, /Spojenia/); assert.match(element('#binding-tools').innerHTML, /Pohon/);
});
test('Alt bypasses 5mm rounding when resizing with the separate dimension handle', () => {
  const { context, state } = controller(); state.snap = true; context.selectTarget('e:body');
  context.onPointerDown(handlePointer('length', 110, 20));
  context.onPointerMove(pointer(127, 20, { altKey: true })); context.onPointerUp({ pointerId: 1 });
  assert.equal(state.project.elements[0].length, 117); assert(state.snap); assert.equal(state.history.length, 1);
});

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
    if (state.connectionReview) context.confirmConnection(new Map([['accept-conflict','on']]));
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

for (const modifier of ['shiftKey', 'metaKey']) test(`A handle does not swallow ${modifier} multiselection`, () => {
  const { context, state } = controller(); context.selectTarget('n:body:a');
  const event = handlePointer('pivot', 10, 20); event[modifier] = true;
  context.onPointerDown(event);
  assert.equal(state.selectedElementIds.length, 0); assert(!state.drag); assert(!context.dialog);
});

test('The pivot chooser is offset from the selected node hit area', () => {
  const { context, state } = controller(); context.selectTarget('n:body:a');
  const html = context.manipulationSVG(1), origin = state.result.poses.body.a;
  const match = html.match(/data-edit-handle="pivot"[^]*?<rect x="([^"]+)" y="([^"]+)"/);
  assert.ok(match); const at = {x:Number(match[1])+6,y:Number(match[2])+6};
  assert.ok(at.x < origin.x && at.y < origin.y);
  assert.ok(context.K.distance(at,origin) >= 30);
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

test('Grid toggle is discoverable and independent from intelligent snap', () => {
  const { context, state, element } = controller();
  context.buildShell();
  assert.match(element('#app').innerHTML, /data-action="grid-snap"/);
  state.snap = true; state.smartSnap = true;
  context.toggleGridSnap();
  assert.equal(state.snap, false); assert.equal(state.smartSnap, true);
  context.toggleGridSnap();
  assert.equal(state.snap, true); assert.equal(state.smartSnap, true);
  assert.equal(state.history.length, 0);
});

test('The 10-degree toggle persists independently and quantizes absolute rotation during a drag', () => {
  for (const enabled of [false, true]) {
    const { context, state, element } = controller(); context.buildShell();
    assert.match(element('#app').innerHTML, /data-action="angle-snap"/);
    state.snap = !enabled; state.smartSnap = true; state.angleSnap = false;
    if (enabled) context.toggleAngleSnap();
    assert.equal(state.angleSnap, enabled); assert.equal(state.snap, !enabled); assert.equal(state.smartSnap, true);
    const preferences = globalThis.KinmoExport.parseNative(globalThis.KinmoExport.serializeNative(state.project, { workspace: state })).workspace;
    assert.equal(preferences.angleSnap, enabled);
    state.project.elements[0].angle = 17; state.result = globalThis.KinmoEditor.design(state.project, 0);
    context.selectTarget('e:body'); state.editPivot = { x: 10, y: 20 };
    context.onPointerDown(handlePointer('rotate', 60, 20));
    context.onPointerMove(pointer(10 + 50 * Math.cos(14 * Math.PI / 180), 20 - 50 * Math.sin(14 * Math.PI / 180)));
    context.onPointerUp({ pointerId: 1 });
    assert(Math.abs(state.project.elements[0].angle - (enabled ? 30 : 31)) < 1e-7);
    assert.equal(state.history.length, 1); context.undo(); assert.equal(state.project.elements[0].angle, 17);
  }
});
test('The rail context menu switches the moving part and Undo restores the original mode', () => {
  const { context, state } = controller();
  state.project.elements = [{ ...globalThis.Kinematics.makeElement('rail', 10, 20), id: 'body' }];
  state.result = globalThis.KinmoEditor.design(state.project, 0); context.selectTarget('n:body:b');
  const target = globalThis.KinmoInteraction.target(state.project, 'n:body:b');
  // The moving part belongs to the guide body; the node menu links to it instead of repeating the action.
  assert(!context.contextItems(target).some((item) => item.id === 'rail-motion') && context.contextItems(target).some((item) => item.id === 'pick:e:body'));
  assert(context.contextItems(globalThis.KinmoInteraction.target(state.project, 'e:body')).some((item) => item.id === 'rail-motion' && /Pohyblivé vedenie/.test(item.label)));
  state.contextMenuState.targetId = 'e:body'; context.onContextAction('rail-motion');
  assert(state.project.elements[0].movingRail); assert.equal(state.history.length, 1);
  context.undo(); assert(!state.project.elements[0].movingRail);
});
test('Free insertion retains arbitrary coordinates without five-millimetre steps', () => {
  const { context, state } = controller();
  state.snap = false; state.smartSnap = false;
  context.addElement('node', { x: 43.17, y: 22.24 });
  const e = state.project.elements.at(-1);
  assert.equal(e.x, 43.17); assert.equal(e.y, 22.24);
  assert.equal(state.history.length, 1); assert.equal(state.project.connections.length, 0);
});

test('Insertion prioritizes the nearby body axis over the grid and creates no joint', () => {
  const { context, state } = controller();
  state.snap = true; state.smartSnap = true;
  context.addElement('node', { x: 43.17, y: 22.24 });
  const e = state.project.elements.at(-1);
  assert.equal(e.x, 43.17); assert.equal(e.y, 20);
  assert.equal(state.history.length, 1); assert.equal(state.project.connections.length, 0);
  assert.equal(context.dialog, undefined);
});

test('Grid visibility does not control grid movement, and drawing honors the separate choices', () => {
  const { context, state } = controller();
  state.grid = true; state.snap = false; state.smartSnap = false;
  assert.deepEqual(context.snapDrawingPoint({ x: 43.17, y: 22.24 }), { x: 43.17, y: 22.24 });
  state.grid = false; state.snap = true;
  assert.equal(context.snapDrawingPoint({ x: 43.17, y: 22.24 }).x, 45);
  state.smartSnap = true;
  assert.equal(context.snapDrawingPoint({ x: 43.17, y: 22.24 }).y, 20);
});

test('Palette drop uses intelligent insertion and cleans its preview', () => {
  const { context, state, element } = controller();
  context.wireEvents(); state.snap = true; state.smartSnap = true;
  state.draggedPaletteType = 'node'; state.snapPreview = { kind: 'axis' };
  element('#canvas-area').listeners.get('drop')({
    preventDefault() {}, clientX: 43.17, clientY: 22.24,
    dataTransfer: { getData: () => 'node' },
  });
  assert.equal(state.project.elements.at(-1).x, 43.17);
  assert.equal(state.project.elements.at(-1).y, 20);
  assert.equal(state.draggedPaletteType, null); assert.equal(state.snapPreview, null);
});

test('Palette drag previews preserve the live SVG drop target and clean only their overlay', () => {
  const { context, state, element } = controller(), svg = element('#mechanism-canvas'), overlays = [];
  assert.match(styles.match(/\.drop-hint \{([^}]+)\}/)?.[1] || '', /background: transparent;/);
  let redraws = 0, removals = 0;
  svg.innerHTML = 'stable drop target';
  svg.querySelectorAll = () => [...overlays];
  svg.insertAdjacentHTML = (position, markup) => {
    assert.equal(position, 'beforeend'); assert.match(markup, /data-editor-overlay="smart-snap"/);
    overlays.push({ remove() { removals++; overlays.splice(overlays.indexOf(this), 1); } });
  };
  context.renderScene = () => { redraws++; svg.innerHTML = 'replaced drop target'; };
  context.wireEvents(); state.smartSnap = true; state.draggedPaletteType = 'node';
  const over = { clientX: 43.17, clientY: 22.24, preventDefault() { this.accepted = true; }, dataTransfer: { types: ['application/x-kinematika-element'] } };
  const area = element('#canvas-area');
  area.listeners.get('dragover')(over);
  assert.equal(over.accepted, true); assert.equal(over.dataTransfer.dropEffect, 'copy');
  assert.equal(redraws, 0); assert.equal(svg.innerHTML, 'stable drop target'); assert.equal(overlays.length, 1);
  assert.equal(state.snapPreview.point.y, 20);
  area.listeners.get('dragover')(over);
  assert.equal(overlays.length, 1); assert.equal(removals, 1);
  area.listeners.get('dragleave')({ relatedTarget: null });
  assert.equal(state.snapPreview, null); assert.equal(overlays.length, 0); assert.equal(redraws, 0);
  element('#palette').listeners.get('dragend')();
  assert.equal(state.draggedPaletteType, null); assert.equal(svg.innerHTML, 'stable drop target');
});

test('Intelligent snap starts off, has an explicit button and resets on project load', () => {
  const { context, state, element } = controller(); context.buildShell();
  assert.equal(state.smartSnap, false);
  assert.match(element('#app').innerHTML, /data-action="smart-snap"[^>]*aria-pressed="false"/);
  assert.match(source, /state\.smartSnap = false; state\.snapPreview = null; state\.pendingSnap = null/);
  context.toggleSmartSnap(); assert.equal(state.smartSnap, true); assert(!state.inspectorOpen);
  context.toggleSmartSnap(); assert.equal(state.smartSnap, false);
});

test('Cam is discoverable, its profile accepts quantities and a follower is one undo step', () => {
  const { context, state, element } = controller();
  context.buildShell();
  const tile = element('#app').innerHTML.match(/<button[^>]*data-component="cam"[\s\S]*?<\/button>/)[0];
  assert.match(tile, /<small>Harmonická \/ pretiahnutá<\/small>/); assert.doesNotMatch(tile, /undefined/);
  context.addElement('cam', { x: 200, y: 180 }); const cam = state.project.elements.at(-1);
  assert.equal(state.traceRef.elementId, cam.id); assert.equal(state.traceRef.point, 'a');
  assert.equal(context.defaultTraceReference().point, 'a');
  assert.match(source, /cam: 'Rotačná vačka'/);
  state.contextMenuState.targetId = `e:${cam.id}`;
  context.onContextAction('cam-profile');
  assert.match(context.dialog.html, /name="camLift"/); assert.match(context.dialog.html, /trvalého dotyku/);
  context.onCanvasSubmit({ dataset: { kind: 'cam-profile', reference: `n:${cam.id}:a` } }, new Map([['radius', '3 cm'], ['camLift', '20/2 mm'], ['camPhase', '90 deg']]));
  const edited = state.project.elements.find((e) => e.id === cam.id);
  assert.equal(edited.radius, 30); assert.equal(edited.camLift, 10); assert.equal(edited.camPhase, 90);
  const history = state.history.length, count = state.project.elements.length;
  state.contextMenuState.targetId = `e:${cam.id}`; context.onContextAction('cam-follower');
  assert.equal(state.project.elements.length, count + 3); assert.equal(state.history.length, history + 1);
  assert.equal(state.project.connections.filter((j) => j.type === 'cam-contact').length, 1);
  context.undo(); assert.equal(state.project.elements.length, count);
  context.nodeOptions(null, true); context.jointModal(); assert.match(context.dialog.html, /value="cam-contact"/);
  assert.match(context.dialog.html, /obrys vačky/); assert.equal(element('#modal').open, false);
});

test('Connecting a roller to a cam creates contact; a nonroller fails without a history edit', () => {
  const { context, state } = controller();
  context.addElement('cam', { x: 200, y: 180 }); const cam = state.project.elements.at(-1);
  context.addElement('bearing', { x: 200, y: 120 }); const roller = state.project.elements.at(-1);
  const history = state.history.length;
  context.connectPoint({ elementId: roller.id, point: 'a' }); context.connectPoint({ elementId: cam.id, point: 'curve' });
  assert.equal(state.connectionReview, null); assert(!context.dialog);
  assert.equal(state.project.connections.at(-1).type, 'cam-contact'); assert.equal(state.history.length, history + 1);
  context.connectPoint({ elementId: 'body', point: 'a' }); context.connectPoint({ elementId: cam.id, point: 'curve' });
  assert.equal(state.history.length, history + 1); assert.equal(state.project.connections.length, 1);
  assert.match(context.lastToast, /Vačkový kontakt/);
});

test('Alt suppresses direct node connection even when a destination is nearby', () => {
  const { context, state } = controller(); context.selectTarget('n:body:a');
  context.onPointerDown(pointer(10, 20,{altKey:true})); context.onPointerMove(pointer(10, 59,{altKey:true})); context.onPointerUp({ pointerId: 1 });
  assert.equal(state.project.elements[0].y, 59); assert(!state.pendingSnap && !state.project.connections.length);
  assert(!context.dialog);
});

test('Enabled intelligent snap previews geometry and inline confirmation shares one Undo step', () => {
  const { context, state, element } = controller(); state.smartSnap = true; context.selectTarget('n:body:a');
  context.onPointerDown(pointer(10, 20)); context.onPointerMove(pointer(10, 59));
  assert(state.snapPreview && !state.project.connections.length);
  context.onPointerUp({ pointerId: 1 });
  assert.equal(state.project.elements[0].y, 60); assert.equal(state.history.length, 1); assert(!state.project.connections.length);
  assert.match(element('#snap-choices').innerHTML, /snap-connect/); assert(state.pendingSnap); assert(!context.dialog);
  context.submitSnapConnection(new Map([['type', 'revolute']]));
  assert.equal(state.project.connections.length, 1); assert.equal(state.history.length, 1); assert.equal(state.pendingSnap, null);
  context.undo(); assert.equal(state.project.connections.length, 0); assert.equal(state.project.elements[0].y, 20);
  context.undo(true); assert.equal(state.project.connections.length, 1); assert.equal(state.project.elements[0].y, 60);
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
test('Duplicating a project preserves current unsaved edits and opens an independent stored copy', () => {
  const { context, state, storage } = controller(), original = state.project, old = context.K.copy(original);
  storage.set('qa', JSON.stringify([old])); state.dirty = true; state.project.elements[0].length = 180;
  const before = JSON.stringify(state.project);
  context.duplicateProject(original.id);
  const records = JSON.parse(storage.get('qa'));
  assert.equal(records.length, 2); assert.notEqual(state.project.id, original.id); assert.match(state.project.name, /kópia/);
  assert.equal(JSON.stringify(records.find((p) => p.id === original.id)), before);
  assert.equal(state.project.elements[0].length, 180); assert.equal(state.saved, true); assert.equal(state.dirty, false);
  state.project.elements[0].length = 200; assert.equal(original.elements[0].length, 180);
});
test('A full or malformed project store blocks duplication without evicting or overwriting user projects', () => {
  for (const kind of ['full', 'invalid', 'unavailable']) {
    const { context, state, storage } = controller(), original = state.project;
    const records = Array.from({ length: 20 }, (_, i) => ({ ...context.K.copy(original), id: `project-${i}` }));
    storage.set('qa', kind === 'invalid' ? 'user bytes, not JSON' : JSON.stringify(records));
    if (kind === 'unavailable') context.localStorage.setItem = () => { throw new Error('quota'); };
    const before = storage.get('qa');
    context.duplicateProject();
    assert.equal(storage.get('qa'), before); assert.equal(state.project, original); assert(context.lastToast);
  }
});
test('Deleting a noncurrent project needs confirmation and leaves the active history and other records intact', () => {
  const { context, state, storage } = controller(), current = context.K.copy(state.project), other = { ...context.K.copy(current), id: 'other-project', name: 'Iný' };
  storage.set('qa', JSON.stringify([current, other])); state.history = [context.K.copy(current)];
  const history = state.history, before = JSON.stringify(state.project);
  context.deleteProjectModal(other.id);
  assert.equal(JSON.parse(storage.get('qa')).length, 2); assert.match(context.dialog.html, /confirm-project-delete/);
  context.confirmProjectDelete();
  assert.deepEqual(JSON.parse(storage.get('qa')).map((p) => p.id), [current.id]);
  assert.equal(JSON.stringify(state.project), before); assert.equal(state.history, history);
});
test('Deleting the active project stops its autosave and opens an unsaved blank canvas, not a resurrected record', () => {
  const { context, state, storage } = controller(), id = state.project.id;
  storage.set('qa', JSON.stringify([state.project])); storage.set('qa.last', id);
  context.deleteProjectModal(id); context.confirmProjectDelete();
  assert.equal(storage.get('qa'), '[]'); assert.equal(storage.get('qa.last'), undefined);
  assert.notEqual(state.project.id, id); assert.equal(state.project.elements.length, 0); assert.equal(state.saved, false);
  assert.equal(state.history.length, 0); assert.equal(state.dirty, false);
});
test('A failed delete write keeps both the active project and its stored record', () => {
  const { context, state, storage } = controller(), before = JSON.stringify(state.project);
  storage.set('qa', `[${before}]`); context.deleteProjectModal(state.project.id);
  context.localStorage.setItem = () => { throw new Error('quota'); }; context.confirmProjectDelete();
  assert.equal(JSON.stringify(state.project), before); assert.equal(storage.get('qa'), `[${before}]`);
  context.deleteProjectModal('double-drawer-template'); assert.match(context.lastToast, /nemožno vymazať/);
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

for (const modifier of ['shiftKey', 'metaKey']) test(`${modifier}+click toggles selection without initiating a drag`, () => {
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
  const nodeItems = node.flatMap((i) => [i, ...(i.items || [])]);
  assert(nodeItems.some((i) => i.id === 'coordinates') && !nodeItems.some((i) => i.id === 'split'));
  assert(member.some((i) => i.id === 'split') && member.some((i) => i.id === 'poi') && member.some((i) => i.id === 'coordinates'));
  assert(member.some((i) => i.id === 'fix-body') && !member.some((i) => i.disabled));
  // A protected template offers the way to an editable copy instead of a list of disabled edits.
  state.project = globalThis.Kinematics.preset('fourbar');
  const template = context.contextItems(I.target(state.project, 'n:input-1:a'));
  assert(template.some((i) => i.id === 'copy-editable') && !template.some((i) => i.id === 'fix'));
});
test('A right click on a canvas overlay still picks the underlying member geometrically', () => {
  const { context, state } = controller();
  let prevented = false;
  const event = { clientX: 55, clientY: 22, target: { closest: () => null }, preventDefault() { prevented = true; }, stopPropagation() {} };
  context.onContextMenu(event);
  assert(prevented); assert.equal(state.contextMenuState.targetId, 'e:body');
  assert.equal(context.openedMenu.items.some((item) => item.id === 'delete' && /tento člen/.test(item.label)), true);
});
test('Coincident nodes, a joint and bodies remain individually accessible through the overlap chooser', () => {
  const { context, state } = controller();
  state.project.elements[1].y = 20;
  state.project.connections.push({ id: 'joint-overlap', a: { elementId: 'body', point: 'a' }, b: { elementId: 'another-body', point: 'a' }, type: 'revolute' });
  state.project = context.K.validateProject(state.project); state.result = context.E.design(state.project, 0);
  const event = { clientX: 10, clientY: 20, target: { closest: () => null }, preventDefault() {}, stopPropagation() {} };
  context.onContextMenu(event);
  const chooser = context.openedMenu.items[0];
  assert.match(chooser.label, /Vybrať entitu/); assert(chooser.items.some((item) => item.id === 'pick:j:joint-overlap'));
  context.onContextAction('pick:j:joint-overlap');
  assert.equal(state.contextMenuState.targetId, 'j:joint-overlap'); assert.equal(state.contextMenuState.targetType, 'joint');
});
test('Deleting a context joint removes only that joint even when several bodies are selected', () => {
  const { context, state } = controller();
  state.project.connections.push({ id: 'only-joint', a: { elementId: 'body', point: 'a' }, b: { elementId: 'another-body', point: 'a' }, type: 'revolute' });
  state.project = context.K.validateProject(state.project); state.result = context.E.design(state.project, 0);
  state.selectedElementIds = ['e:body', 'e:another-body', 'j:only-joint']; state.contextMenuState.targetId = 'j:only-joint';
  context.onContextAction('delete');
  assert.equal(state.project.connections.length, 0); assert.equal(state.project.elements.length, 2); assert.equal(state.history.length, 1);
});
test('Visible panels support geometric body selection and bound two-point dimension picking', () => {
  const { context, state } = controller();
  state.project.elements.push({ ...context.K.makeElement('panel', 250, -50), id: 'panel', angle: 30, length: 160, width: 80 });
  state.project = context.K.validateProject(state.project); state.result = context.E.design(state.project, 0);
  const before = JSON.stringify(state.project), pose = state.result.poses.panel;
  const event = (point) => ({ button: 0, clientX: point.x, clientY: point.y, pointerId: 1, target: { closest: () => null }, preventDefault() {} });
  const dx = pose.b.x - pose.a.x, dy = pose.b.y - pose.a.y, length = Math.hypot(dx, dy);
  const inside = { x: (pose.a.x + pose.b.x) / 2 - dy * 20 / length, y: (pose.a.y + pose.b.y) / 2 + dx * 20 / length };
  assert.equal(context.canvasHit(event(inside)), 'e:panel');
  assert.equal(context.canvasHit(event(pose.a)), 'n:panel:a');
  assert.equal(typeof context.panelPolygon(pose, 80), 'string');
  context.setTool('measure'); context.onPointerDown(event(pose.a)); context.onPointerUp({ pointerId: 1 });
  assert.equal(state.measure.referenceA.elementId, 'panel');
  context.onPointerDown(event(pose.b));
  assert.equal(state.dimensionPick, null);
  assert.match(context.dialog.html, /value="panel\|a" selected/); assert.match(context.dialog.html, /value="panel\|b" selected/);
  assert.equal(state.history.length, 0); assert.equal(JSON.stringify(state.project), before);
});
test('The measure tool picks two bound canvas nodes and opens a draft form without making an undo entry', () => {
  const { context, state } = controller(), before = JSON.stringify(state.project);
  const click = (x, y) => context.onPointerDown({ button: 0, clientX: x, clientY: y, pointerId: 1, target: { closest: () => null }, preventDefault() {} });
  context.setTool('measure'); assert(state.dimensionPick); click(10, 20);
  assert.equal(state.measure.referenceA.elementId, 'body'); assert.equal(state.history.length, 0);
  context.onPointerUp({ pointerId: 1 });
  context.onPointerMove({ clientX: 10, clientY: 60, pointerId: 1 }); assert.equal(state.measure.b.y, 60);
  click(10, 60);
  assert.equal(state.dimensionPick, null); assert.equal(state.tool, 'select'); assert.equal(state.measure, null);
  assert.match(context.dialog.html, /value="body\|a" selected/); assert.match(context.dialog.html, /value="another-body\|a" selected/);
  assert.equal(state.history.length, 0); assert.equal(JSON.stringify(state.project), before);
});
test('Point selection retains the pending expression and name; Escape cancels without modifying an existing dimension', () => {
  const { context, state, element } = controller(), values = new Map([['name', 'Moja kóta'], ['type', 'distance'], ['offset', '2cm'], ['value', '300/2'], ['fixed-end', 'b'], ['driving', 'on']]);
  context.FormData = class { constructor() {} get(key) { return values.get(key) ?? null; } has(key) { return values.has(key); } };
  context.startDimensionPick({ dataset: { id: '' } });
  context.pickDimensionPoint({ clientX: 10, clientY: 20 });
  context.pickDimensionPoint({ clientX: 110, clientY: 20 });
  assert.match(context.dialog.html, /value="Moja kóta"/); assert.match(context.dialog.html, /value="300\/2"/); assert.match(context.dialog.html, /value="b" selected/);
  assert.equal(state.history.length, 0);
  context.startDimensionPick(); context.pickDimensionPoint({ clientX: 10, clientY: 20 });
  element('#modal').open = false;
  context.onKeyboard({ key: 'Escape', code: 'Escape', target: { closest: () => null }, preventDefault() {} });
  assert.equal(state.dimensionPick, null); assert.equal(state.measure, null); assert.equal(state.project.dimensions.length, 0);
});
test('Saving a typed driving dimension is one undo entry and keeps B in place; invalid input leaves the form and model unchanged', () => {
  const { context, state, element } = controller(), form = { dataset: { id: '' } }, before = JSON.stringify(state.project);
  const data = new Map([['name', 'Test'], ['type', 'distance'], ['a', 'body|a'], ['b', 'body|b'], ['offset', '2,5cm'], ['value', '300/2'], ['fixed-end', 'b'], ['driving', 'on']]);
  element('#modal').open = true; data.set('value', '1/0');
  assert.throws(() => context.submitDimension(form, data)); assert(element('#modal').open);
  assert.equal(JSON.stringify(state.project), before); assert.equal(state.history.length, 0);
  data.set('value', '300/2'); context.submitDimension(form, data);
  assert.equal(state.project.elements[0].length, 150); assert.equal(state.result.poses.body.b.x, 110);
  assert.equal(state.project.dimensions[0].offset, 25); assert.equal(state.history.length, 1); assert(!element('#modal').open);
  context.undo(); assert.equal(JSON.stringify(state.project), before);
});
test('A draft dimension supports a free canvas point without pretending it is a driving body reference', () => {
  const { context, state } = controller(), before = JSON.stringify(state.project);
  context.startDimensionPick(); context.pickDimensionPoint({ clientX: 10, clientY: 20 }); context.pickDimensionPoint({ clientX: 400, clientY: 300 });
  assert.match(context.dialog.html, /data-world-b="\{"x":400,"y":300\}"/);
  const form = { dataset: { worldB: '{"x":400,"y":300}' } }, data = new Map([['a', 'body|a'], ['b', 'world-b'], ['type', 'distance'], ['offset', '25']]);
  data.set('driving', 'on'); data.set('value', '100');
  assert.throws(() => context.submitDimension(form, data)); assert.equal(JSON.stringify(state.project), before);
  data.delete('driving'); context.submitDimension(form, data);
  assert.equal(state.project.dimensions[0].b.x, 400); assert.equal(state.project.elements[0].length, 100);
});
test('Property numbers and precise transforms accept units and preserve the motor B pivot', () => {
  const { context, state } = controller();
  state.project.elements[0].drive = true; state.project.elements[0].drivePivot = 'b'; state.selected = 'body';
  state.project = context.K.validateProject(state.project); state.result = context.E.design(state.project, 0);
  context.onPropertyChange({ dataset: { property: 'length', scope: 'element', quantity: 'mm' }, value: '20 cm', min: '.1', max: '5000', checkValidity: () => true });
  assert.equal(state.project.elements[0].length, 200); assert.equal(state.result.poses.body.b.x, 110);
  context.submitTransform({ dataset: { kind: 'move-x', keys: '["e:body"]' } }, new Map([['dx', '2,5cm']]));
  assert.equal(state.result.poses.body.b.x, 135);
  const before = JSON.stringify(state.project), history = state.history.length;
  context.onPropertyChange({ dataset: { property: 'length', scope: 'element', quantity: 'mm' }, value: '6m', min: '.1', max: '5000', checkValidity: () => true });
  assert.equal(JSON.stringify(state.project), before); assert.equal(state.history.length, history);
});
test('The dimension context menu deletes only its dimension and owned constraint, not selected bodies', () => {
  const { context, state } = controller();
  state.project = context.W.applyDimension(state.project, state.result, { a: { elementId: 'body', point: 'a' }, b: { elementId: 'another-body', point: 'a' }, driving: true, value: '40mm' });
  const d = state.project.dimensions[0]; state.result = context.E.design(state.project, 0);
  state.contextMenuState.targetId = `d:${d.id}`; state.selectedElementIds = ['e:body', `d:${d.id}`];
  assert.equal(context.contextItems(context.I.target(state.project, `d:${d.id}`)).filter((i) => !i.separator)[1].id, 'delete-dimension');
  context.onContextAction('delete-dimension');
  assert.equal(state.project.elements.length, 2); assert.equal(state.project.dimensions.length, 0); assert.equal(state.project.connections.length, 0);
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

test('Magic import lives only in Mechanisms and projects, with an initially hidden wizard', () => {
  const { context, element } = controller(); context.buildShell();
  const html = element('#app').innerHTML;
  assert.equal((html.match(/data-action="magic-import"/g) || []).length, 0);
  context.projectsModal();
  assert.equal((context.dialog.html.match(/data-action="magic-import"/g) || []).length, 1);
  assert.match(context.dialog.html, /data-action="magic-import"[^>]*aria-controls="magic-wizard"[^>]*aria-expanded="false"/);
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
  assert.match(element('#magic-wizard').innerHTML, /zostáva lokálne/);
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
test('A new scale after tracing requires confirmation and undo restores geometry and calibration together', () => {
  const { context, state, element } = tracingWizard();
  context.magicPointer({ x: 0, y: 0 }); context.magicPointer({ x: 100, y: 0 });
  const before = JSON.stringify(state.project), scale = state.magic.scale;
  context.setMagicStep(2); context.renderMagicImport();
  assert.doesNotMatch(element('#magic-wizard').innerHTML, /name="distance"[^>]*disabled/);
  context.submitMagicScale(new Map(Object.entries({ ax: '100', ay: '80', bx: '500', by: '80', distance: '300' })));
  assert.equal(state.magic.scale, scale);
  assert.equal(JSON.stringify(state.project), before); assert.match(context.dialog.html, /magic-confirm-scale/);
  context.applyMagicScale();
  assert.equal(state.project.elements[0].length, 150); assert.equal(state.magic.scale.mmPerPixel, .75);
  context.undo(); assert.equal(state.project.elements[0].length, 100); assert.equal(state.magic.scale.mmPerPixel, .5);
  context.undo(true); assert.equal(state.project.elements[0].length, 150); assert.equal(state.magic.scale.mmPerPixel, .75);
});
test('One horizontal millimeter value recalculates the whole image height without changing aspect ratio', () => {
  const { context, state } = controller(); context.startMagicImport();
  state.magic.image = { width: 800, height: 600 }; state.magic.step = 2;
  const data = new Map(Object.entries({ ax: '100', ay: '80', bx: '500', by: '180', distance: '300', axis: 'horizontal' }));
  assert.match(context.magicScalePreview(data), /X = 300 mm · Y = 75 mm/);
  assert.match(context.magicScalePreview(data), /600 × 450 mm/);
  context.submitMagicScale(data);
  assert.equal(state.magic.scale.mmPerPixel, .75); assert.equal(state.magic.scale.axis, 'horizontal');
});
test('Toggling autodetection retains the live scale form and incomplete calibration input', () => {
  const { context, state } = controller(); context.startMagicImport();
  state.magic.image = { width: 800, height: 600 }; state.magic.step = 2;
  const select = context.$, before = JSON.stringify(state.project);
  for (const checked of [true, false]) {
    const form = { values: { ax: '0', ay: checked ? '0' : '', bx: '799', by: '0' }, details: { open: true } };
    const placeholder = { replaceWith(node) { this.restored = node; } };
    let queries = 0;
    context.$ = (selector) => selector === '#magic-scale-form' ? (queries++ ? placeholder : form) : select(selector);
    context.onMagicSetting({ dataset: { magicSetting: 'auto-detect' }, checked });
    assert.equal(placeholder.restored, form);
    assert.equal(state.magic.detectEnabled, checked);
    assert.equal(form.details.open, true);
    assert.equal(form.values.ay, checked ? '0' : '');
    assert.equal(state.magic.points.length, 0); assert.equal(state.magic.scale, null);
    assert.equal(JSON.stringify(state.project), before); assert.equal(state.history.length, 0);
  }
});
test('Optional step 2.5 needs opt-in and a calibrated image, not an integer-only step check', () => {
  const { context, state, element } = tracingWizard();
  context.setMagicStep(2.5); assert.equal(state.magic.step, 3);
  state.magic.detectEnabled = true; context.setMagicStep(2.5);
  assert.equal(state.magic.step, 2.5); context.renderMagicImport();
  assert.match(element('#magic-wizard').innerHTML, /data-step="2.5"/);
  assert.match(element('#magic-wizard').innerHTML, /data-action="magic-detect"/);
  assert.equal(context.magicWorking(), false);
  const before = JSON.stringify(state.project);
  assert(context.magicPointer({ x: 10, y: 10 })); assert.equal(JSON.stringify(state.project), before);
});
test('Detection preview leaves the draft unchanged; applying it is one undoable insertion', async () => {
  const { context, state } = tracingWizard(), before = JSON.stringify(state.project);
  state.magic.detectEnabled = true; context.setMagicStep(2.5);
  context.AD.detectImage = async () => ({ candidates: [{ id: 'detect-1', type: 'link', selected: true, points: [{ x: 100, y: 80 }, { x: 500, y: 80 }], width: 10, radius: 5, confidence: .83 }], note: 'Overiť.' });
  await context.runMagicDetection();
  assert.equal(JSON.stringify(state.project), before); assert.equal(state.history.length, 0);
  assert.match(context.magicDetectionSVG(1), /magic-detection/);
  context.applyMagicDetection();
  assert.equal(state.magic.step,2.5);assert.equal(state.project.elements.length,0);assert(state.magic.review);
  context.commitDetectedReview(new FormData());
  assert.equal(state.magic.step, 3); assert.equal(state.project.elements.length, 1);
  assert.equal(state.project.elements[0].length, 200); assert(!state.project.elements[0].drive);
  assert.equal(state.history.length, 1);
  context.setMagicStep(2.5); context.applyMagicDetection(); assert.equal(state.project.elements.length, 1);
  context.setMagicStep(3); context.undo(); assert.equal(state.project.elements.length, 0);
});
test('An invalid detection identifies the failing row and deselecting it allows the next step', () => {
  const { context, state } = tracingWizard(), before = JSON.stringify(state.project);
  state.magic.detectEnabled = true; context.setMagicStep(2.5);
  const valid = { id: 'detect-1', type: 'link', selected: true, points: [{ x: 100, y: 80 }, { x: 500, y: 80 }], width: 10, radius: 5, confidence: .8 };
  state.magic.detectCandidates = [valid, { ...valid, id: 'detect-2', points: [{ x: -.02, y: 80 }, { x: 500, y: 80 }] }];
  context.nextMagicStep();
  assert.equal(state.magic.step, 2.5); assert.equal(JSON.stringify(state.project), before); assert.equal(state.history.length, 0);
  assert.match(state.magic.error, /Návrh 2/); assert.match(state.magic.error, /Odznačte/);
  context.onMagicSetting({ dataset: { magicSetting: 'detect-selected', detection: 'detect-2' }, checked: false });
  context.nextMagicStep();
  assert.equal(state.magic.step,2.5);context.commitDetectedReview(new FormData());
  assert.equal(state.magic.step, 3); assert.equal(state.project.elements.length, 1); assert.equal(state.history.length, 1);
});
test('Mounting-point preview and opt-out are reviewable and the complete insertion is undoable', async () => {
  const { context, state, element } = tracingWizard();
  state.magic.detectEnabled = true; context.setMagicStep(2.5);
  const candidate = { id: 'detect-1', type: 'link', selected: true, points: [{ x: 100, y: 80 }, { x: 500, y: 80 }], width: 10, radius: 5, confidence: .64, anchors: [{ x: 200, y: 80, radius: 6 }] };
  context.AD.detectImage = async () => ({ candidates: [candidate], note: 'Overiť.' });
  await context.runMagicDetection();
  assert.match(element('#magic-wizard').innerHTML, /detect-anchors/);
  assert.match(context.magicDetectionSVG(1), /data-detection-anchor/);
  context.onMagicSetting({ dataset: { magicSetting: 'detect-anchors', detection: candidate.id }, checked: false });
  assert.doesNotMatch(context.magicDetectionSVG(1), /data-detection-anchor/);
  context.onMagicSetting({ dataset: { magicSetting: 'detect-anchors', detection: candidate.id }, checked: true });
  context.applyMagicDetection();
  assert.equal(state.project.elements.length,0);context.commitDetectedReview(new FormData());
  assert.equal(state.project.elements.length, 2); assert.equal(state.history.length, 1);
  context.undo(); assert.equal(state.project.elements.length, 0);
});
test('Two-corner region selection uses original image pixels without changing the project or calibration', async () => {
  const { context, state } = tracingWizard(), before = JSON.stringify(state.project), calibration = JSON.stringify(state.magic.scale);
  state.magic.detectEnabled = true; context.setMagicStep(2.5);
  context.selectMagicDetectionRegion();
  assert(context.magicPointer({ x: -40, y: -30 })); // Original pixel (20, 20), calibration A=(100,80), scale=.5
  context.magicPointer({ x: 150, y: 60 }); // Original pixel (400, 200)
  assert.deepEqual(JSON.parse(JSON.stringify(state.magic.detectRegion)), { x: 20, y: 20, width: 380, height: 180 });
  assert.match(context.magicDetectionSVG(1), /data-detection-region/);
  let received;
  context.AD.detectImage = async (image, options) => { received = options.region; return { candidates: [], note: 'Overiť.' }; };
  await context.runMagicDetection(); assert.equal(received, state.magic.detectRegion);
  assert.equal(JSON.stringify(state.project), before); assert.equal(JSON.stringify(state.magic.scale), calibration);
  context.selectMagicDetectionRegion(true); assert.equal(state.magic.detectRegion, null);
  context.selectMagicDetectionRegion(); context.magicPointer({ x: -1000, y: -1000 }); assert.equal(state.magic.detectRegionPoints.length, 0);
  context.magicPointer({ x: 0, y: 0 }); context.magicPointer({ x: 1, y: 1 }); assert.equal(state.magic.detectRegionPoints.length, 1);
  await context.runMagicDetection(); assert.match(state.magic.error, /dva protiľahlé rohy/);
  let prevented = false;
  context.onKeyboard({ key: 'Escape', code: 'Escape', target: { closest: () => null }, preventDefault() { prevented = true; } });
  assert(prevented); assert.equal(state.magic.tool, 'select'); assert.equal(state.magic.detectRegionPoints.length, 0);
});
test('Cancelling a detection or its wizard prevents a late result from changing either project', async () => {
  for (const cancelWizard of [false, true]) {
    const { context, state } = tracingWizard(), original = state.magic.original.project;
    state.magic.detectEnabled = true; context.setMagicStep(2.5);
    let finish;
    context.AD.detectImage = (image, { signal }) => new Promise((resolve) => { finish = resolve; context.detectorSignal = signal; });
    const pending = context.runMagicDetection();
    if (cancelWizard) context.cancelMagicImport(true); else state.magic.detectController.abort();
    assert(context.detectorSignal.aborted);
    finish({ candidates: [{ selected: true }], note: 'Stale' }); await pending;
    if (cancelWizard) assert.equal(state.project, original);
    else { assert.equal(state.project.elements.length, 0); assert.equal(state.magic.detectCandidates, undefined); assert.equal(state.magic.busy, false); }
  }
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
  assert(!context.dialog);
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

test('Reverse-moving guide follows pointer along its rotated axis and clamps at carriage stops', () => {
  for (const angle of [0, 30, 90]) {
    const { context, state } = controller(), K = context.K, rail = { ...K.makeElement('rail', 0, 0), angle, length: 200, stroke: 150, carriageOffset: 100, movingRail: true };
    state.project = K.preset('custom'); state.project.elements = [rail]; state.mode = 'simulate'; state.motion = 100; state.result = K.solve(state.project, 100, { collisions: false });
    const before = state.result.poses[rail.id].a, axis = K.along({ x: 0, y: 0 }, 1, angle);
    context.setMotion = (value) => { const range = K.driveRange(state.project); state.motion = K.clamp(value, range.min, range.max); state.result = K.solve(state.project, state.motion, { collisions: false }); };
    state.drag = { kind: 'custom-rail', angle, start: { x: 0, y: 0 }, startMotion: 100, stroke: 150, reversed: true };
    context.onPointerMove({ clientX: 20 * axis.x, clientY: 20 * axis.y, preventDefault() {}, target: { closest: () => null } });
    assert(Math.abs(state.result.poses[rail.id].a.x - before.x - axis.x * 20) < .001);
    assert(Math.abs(state.result.poses[rail.id].a.y - before.y - axis.y * 20) < .001);
    context.onPointerMove({ clientX: -1000 * axis.x, clientY: -1000 * axis.y, preventDefault() {}, target: { closest: () => null } });
    assert.equal(state.motion, K.driveRange(state.project).max); assert(!state.result.blocked);
    const local = K.localPoint(state.result.poses[rail.id], state.result.poses[rail.id].c); assert(Math.abs(local.x - rail.length) < .001);
  }
});

test('Piston inspector design length resizes its cylinder and stroke together', () => {
  const { context, state } = controller(), K = context.K, piston = K.makeElement('piston-push', 0, 0);
  state.project = K.preset('custom'); state.project.elements = [piston]; state.selected = piston.id; state.result = context.E.design(state.project, 0);
  const before = K.pistonGeometry(piston).cylinder;
  context.onPropertyChange({ value: '480', min: '1', max: '5000', dataset: { property: 'length', scope: 'element' }, checkValidity: () => true });
  const e = state.project.elements[0]; assert.equal(e.length, 480); assert.equal(e.maxLength, 480); assert(K.pistonGeometry(e).cylinder > before * 1.8 && K.pistonGeometry(e).fits);
  assert.equal(state.history.length, 1);
});

function elasticController() {
  const fixture = controller(), { context, state } = fixture, K = context.K;
  const ground = K.makeElement('ground', 0, 0), spring = K.makeElement('spring-compression', 0, 0); spring.mountA = { elementId: ground.id, point: 'a' };
  state.project = K.preset('custom'); state.project.elements = [ground, spring]; state.project.simulation.gravity = 0; state.mode = 'simulate'; state.result = K.solve(state.project, 0);
  for (const name of ['solveCurrent', 'setMotion']) vm.runInContext(source.match(new RegExp(`  function ${name}\\([^\\n]*\\) \\{[\\s\\S]*?\\n  \\}`))[0], context);
  context.actions = { play() { context.playCalls = (context.playCalls || 0) + 1; state.playing = true; state.dynamic ||= context.P.initialState(state.forceContext, state.motion); } };
  return { ...fixture, spring };
}
test('Releasing a directly compressed spring automatically starts force return without changing design', () => {
  const { context, state, spring } = elasticController(), original = JSON.stringify(state.project.elements);
  assert(context.beginElasticDrag({ elementId: spring.id, point: 'b' }, 1));
  context.onPointerMove({ pointerId: 1, clientX: 120, clientY: 0, preventDefault() {}, target: { closest: () => null } });
  assert.equal(state.result.poses[spring.id].length, 120);
  context.onPointerUp({ pointerId: 1 }); assert.equal(context.playCalls, 1); assert(state.playing && state.project.simulation.mode === 'dynamic');
  const after = context.P.step(state.forceContext, state.dynamic, .1), id = state.forceContext.network.graph.ports[`${spring.id}:b`]; assert(after.particles[id].x > 120);
  assert.equal(JSON.stringify(state.project.elements), original);
});
test('Return opt-out and pointer cancellation do not start force playback', () => {
  for (const cancel of [true, false]) {
    const { context, state, spring } = elasticController(); state.project.simulation.returnOnRelease = cancel;
    context.beginElasticDrag({ elementId: spring.id, point: 'b' }, 1);
    context.onPointerMove({ pointerId: 1, clientX: 120, clientY: 0, preventDefault() {}, target: { closest: () => null } });
    context.onPointerUp({ pointerId: 1, cancelled: cancel }); assert.equal(context.playCalls || 0, 0);
    assert.equal(state.result.poses[spring.id].length, cancel ? 160 : 120);
  }
});

test('Manual simulation drag stops at piston stroke instead of drawing an impossible rod', () => {
  const { context, state } = elasticController(), K = context.K;
  const anchor = K.makeElement('ground', 0, 0), body = K.makeElement('node', 240, 0), piston = K.makeElement('piston-push', 0, 0);
  Object.assign(body, { mass: 1, drive: true, driveMode: 'linear', driveAngle: 180, stroke: 180 });
  piston.mountA = { elementId: anchor.id, point: 'a' }; piston.mountB = { elementId: body.id, point: 'a' };
  state.project.elements = [anchor, body, piston]; state.project.parameters.travelMax = 180; state.result = K.solve(state.project, 0, { collisions: false });
  context.setMotion(180); assert(!state.result.blocked); assert(state.motion < 97);
  assert(state.result.poses[piston.id].length >= piston.minLength - K.TOLERANCE);
});

for(const type of ['spring-compression','spring-extension','piston-push','piston-pull']) test(`${type}: bound A leaves B individually draggable and snap-ready`,()=>{
  const {context,state}=controller(),K=context.K,ground=K.makeElement('ground',0,0),e=K.makeElement(type,0,0);
  e.mountA={elementId:ground.id,point:'a'};state.project=K.preset('custom');state.project.elements=[ground,e];state.mode='edit';state.result=context.E.design(state.project,0);
  const before=state.result.poses[e.id].b;
  context.onPointerDown(pointer(before.x,before.y));assert.deepEqual([...state.drag.keys],[context.I.nodeKey({elementId:e.id,point:'b'})]);
  context.onPointerMove(pointer(before.x+20,before.y+10));context.onPointerUp({pointerId:1});
  const pose=state.result.poses[e.id];assert.equal(pose.a.x,0);assert.equal(pose.a.y,0);assert(Math.abs(pose.b.x-before.x-20)<.001&&Math.abs(pose.b.y-before.y-10)<.001);
  assert.equal(state.project.elements.find((v)=>v.id===e.id).mountA.elementId,ground.id);assert.equal(state.history.length,1);
});
test('Transverse handle changes link width, preserves endpoints and is one undo transaction',()=>{
  const {context,state}=controller(),e=state.project.elements[0],pose=state.result.poses[e.id];context.selectTarget(context.I.elementKey(e.id));
  assert.match(context.manipulationSVG(1),/data-edit-handle="thickness"/);
  const target={closest:s=>s==='[data-edit-handle]'?{dataset:{editHandle:'thickness'}}:null};
  context.onPointerDown(pointer(60,0,{target}));context.onPointerMove(pointer(60,10));context.onPointerUp({pointerId:1});
  assert.equal(state.project.elements[0].width,32);assert.equal(state.project.elements[0].length,100);assert.deepEqual(state.result.poses[e.id].a,pose.a);assert.deepEqual(state.result.poses[e.id].b,pose.b);assert.equal(state.history.length,1);
  context.undo();assert.equal(state.project.elements[0].width,12);
});
test('Thickness handle also exists on a mounted elastic element and fixed frame',()=>{
  const {context,state}=controller(),K=context.K,g=K.makeElement('ground',0,0),e=K.makeElement('piston-push',0,0);e.mountA={elementId:g.id,point:'a'};state.project=K.preset('custom');state.project.elements=[g,e];state.result=context.E.design(state.project,0);
  for(const element of [g,e]) {context.selectTarget(context.I.elementKey(element.id));const html=context.manipulationSVG(1);assert.match(html,/data-edit-handle="thickness"/);assert.doesNotMatch(html,/data-edit-handle="move-x"/);}
});
test('Ctrl click cycles overlapping entities while Shift retains additive selection',()=>{
  const {context,state}=controller(),hits=['n:body:a','e:body','e:another-body'];context.canvasHit=(_event,all)=>all?hits:hits[0];context.selectTarget('e:body');
  context.onPointerDown(pointer(10,20,{ctrlKey:true}));assert.deepEqual([...state.selectedElementIds],['e:another-body']);assert(!state.drag);
  context.onPointerDown(pointer(10,20,{ctrlKey:true}));assert.deepEqual([...state.selectedElementIds],['n:body:a']);
  context.onPointerDown(pointer(10,20,{shiftKey:true}));assert.equal(state.selectedElementIds.length,0);
});
test('Right menus cover every library body, node, and an actual joint without invalid operations',()=>{
  const {context,state}=controller(),K=context.K,types=K.TYPES;
  for(const type of types){const e=K.makeElement(type,0,0);state.project=K.preset('custom');state.project.elements=[e];state.result=context.E.design(state.project,0);
    // Body properties live on the body; a node of a larger member links to it, a standalone point is its own body.
    for(const key of [context.I.elementKey(e.id),context.I.nodeKey({elementId:e.id,point:'a'})]){const items=context.contextItems(context.I.target(state.project,key)),body=key.startsWith('e:')||['bearing','node'].includes(type);assert(body?items.some(i=>i.id==='inspect')&&items.some(i=>i.id==='thickness'):items.some(i=>i.id===`pick:${context.I.elementKey(e.id)}`),`${type} ${key}`);assert(!items.flatMap(i=>[i,...(i.items||[])]).some(i=>i.disabled));if(K.isElastic(e))assert(!items.flatMap(i=>i.items||[]).some(i=>i.id==='joint-prismatic'));}
  }
  const a=K.makeElement('link',0,0),b=K.makeElement('link',120,0),j={id:'menu-joint',type:'revolute',a:{elementId:a.id,point:'b'},b:{elementId:b.id,point:'a'}};state.project.elements=[a,b];state.project.connections=[j];
  const menu=context.contextItems(context.I.target(state.project,context.I.jointKey(j.id)));assert(menu.some(i=>i.id==='edit-joint'));assert(menu.find(i=>i.label==='Typ väzby').items.some(i=>i.id==='joint-revolute'&&i.label.endsWith('✓')));assert(menu.some(i=>i.id==='delete'&&i.label.includes('iba túto väzbu')));
});

test('Direct node drag offers overlapping destinations without global smart snap and creates one undoable joint',()=>{
  const {context,state}=controller(),K=context.K,a=K.makeElement('link',0,0),b=K.makeElement('ground',200,0),c=K.makeElement('node',200,0);state.project=K.validateProject({...K.preset('custom'),elements:[a,b,c]});state.result=context.E.design(state.project,0);
  context.onPointerDown(pointer(0,0));context.onPointerMove(pointer(200,0));context.onPointerUp({pointerId:1});assert(state.pendingSnap?.direct);assert.equal(state.pendingSnap.alternatives.length,2);assert.equal(state.history.length,1);
  context.chooseConnectionTarget(1);context.submitSnapConnection(new Map([['type','revolute']]));assert.equal(state.project.connections[0].b.elementId,c.id);assert.equal(state.history.length,1);context.undo();assert.equal(state.project.connections.length,0);assert.equal(state.project.elements[0].x,0);
});
test('Typing a numeric transverse dimension while holding its handle commits the exact value once',()=>{
  const {context,state}=controller();context.selectTarget('e:body');const target={closest:s=>s==='[data-edit-handle]'?{dataset:{editHandle:'thickness'}}:null};context.onPointerDown(pointer(60,30,{target}));context.onPointerMove(pointer(60,35));
  for(const key of ['2','5',',','5','Enter'])context.onKeyboard({key,target:{closest:()=>null},preventDefault(){}});
  assert.equal(state.project.elements[0].width,25.5);assert.equal(state.history.length,1);assert.equal(state.drag,null);context.undo();assert.equal(state.project.elements[0].width,12);
});
test('Magic review inserts only explicitly confirmed inferred joints and supports undo',()=>{
  const {context,state}=tracingWizard();state.magic.detectEnabled=true;context.setMagicStep(2.5);state.magic.detectCandidates=[{id:'a',type:'link',selected:true,points:[{x:100,y:80},{x:300,y:80}],width:10,radius:5,confidence:.8},{id:'b',type:'link',selected:true,points:[{x:300,y:80},{x:500,y:80}],width:10,radius:5,confidence:.8}];
  context.applyMagicDetection();assert.equal(state.project.elements.length,0);assert.equal(state.magic.review.joints.length,1);assert.match(context.dialog.html,/neistý otočný spoj/);
  context.commitDetectedReview({getAll:()=>[]});assert.equal(state.project.elements.length,2);assert.equal(state.project.connections.length,0);context.undo();assert.equal(state.project.elements.length,0);
  context.setMagicStep(2.5);context.applyMagicDetection();const id=state.magic.review.joints[0].id;context.commitDetectedReview({getAll:()=>[id]});assert.equal(state.project.connections.length,1);assert.equal(state.project.connections[0].id,id);
});
test('Locked movement shows the actual restricting joints and rail preview names its fixed member',()=>{
  const {context,state}=controller(),K=context.K,g=K.makeElement('ground',0,0),e=K.makeElement('link',0,0);state.project=K.validateProject({...K.preset('custom'),elements:[g,e],connections:[{id:'fixed-qa',type:'fixed',name:'Pevné spojenie',value:0,a:{elementId:g.id,point:'a'},b:{elementId:e.id,point:'a'}}]});state.result=context.E.design(state.project,0);context.selectTarget(context.I.elementKey(e.id));state.showFreedom=true;assert.match(context.freedomSVG(1),/Pevné spojenie/);
  const rail=K.makeElement('rail');rail.movingRail=true;state.project.elements=[rail];state.project.connections=[];state.result=context.E.design(state.project,0);context.selectTarget(context.I.elementKey(rail.id));state.showFreedom=false;assert.match(context.freedomSVG(1),/Vozík je pevný/);
});

test('Mobile context menus keep all commands reachable in a compact menu', () => {
  const { context, state } = controller(390);
  const target = context.I.target(state.project, 'e:body');
  const desktop = controller().context.contextItems(target);
  const mobile = context.contextItems(target);
  const commands = items => items.flatMap(i => i.items ? commands(i.items) : i.id ? [i.id] : []);
  assert.deepEqual([...commands(mobile)].sort(), [...commands(desktop)].sort());
  assert(mobile.length <= 6); assert(mobile.some(i => i.label === 'Ďalšie možnosti…'));
});

test('An explicitly requested connection preview records no edit and rejects a stale confirmation', () => {
  const {context,state}=controller();
  const a={elementId:'body',point:'b'},b={elementId:'another-body',point:'a'};
  const before=JSON.stringify(state.project),history=state.history.length;
  context.previewConnection(a,b,'revolute',null,true);
  assert(state.connectionReview);assert.equal(JSON.stringify(state.project),before);assert.equal(state.history.length,history);
  state.project.name='Changed while reviewing';
  assert.throws(()=>context.confirmConnection(new Map()),/Model sa zmenil/);
  assert.equal(state.project.connections.length,0);assert.equal(state.history.length,history);
});
test('Touch pinch changes the viewport without editing bodies or recording history', () => {
  const {context,state}=controller(393);state.view={x:0,y:0,width:800,height:450};
  const before=JSON.stringify(state.project),event=(id,x,y)=>({pointerType:'touch',pointerId:id,clientX:x,clientY:y,preventDefault(){},target:{closest:()=>null}});
  assert.equal(context.touchStart(event(1,100,100)),false);assert.equal(context.touchStart(event(2,200,100)),true);
  assert.equal(context.touchMove(event(2,300,100)),true);assert.equal(state.view.width,400);
  assert.equal(JSON.stringify(state.project),before);assert.equal(state.history.length,0);
  context.touchEnd(event(2,300,100));context.touchEnd(event(1,100,100));assert.equal(state.touchGesture,null);
});
test('Main dimension overlay is opt-in and labels physical millimetres', () => {
  const {context,state}=controller();assert.equal(context.mainDimensionsSVG(state.result,1),'');
  state.mainDimensions=true;const drawing=context.mainDimensionsSVG(state.result,1);
  assert.match(drawing,/Šírka .* mm/);assert.match(drawing,/Výška .* mm/);assert.match(drawing,/pointer-events="none"/);
  assert.equal(state.project.dimensions.length,0);
});

test('A second touch rolls back an initial placement and preserves the placement tool',()=>{
 const {context,state}=controller(393);state.view={x:0,y:0,width:800,height:450};state.insertingType='link';state.tool='place';
 const event=(id,x)=>({pointerType:'touch',pointerId:id,clientX:x,clientY:100,button:0,preventDefault(){},target:{closest:()=>null}}),before=JSON.stringify(state.project);
 context.onPointerDown(event(1,100));assert.equal(state.project.elements.length,2);assert(state.touchGesture.deferred);
 context.onPointerDown(event(2,200));assert.equal(JSON.stringify(state.project),before);assert.equal(state.history.length,0);assert.equal(state.insertingType,'link');assert.equal(state.tool,'place');
});


test('Rerender capture loss keeps an active drag, but release or a dialog cancels it',()=>{
 const {context,state,element}=controller();let recaptured=0,cancelled=0;
 element('#mechanism-canvas').setPointerCapture=()=>{recaptured++;};context.onPointerUp=()=>{cancelled++;state.drag=null;};
 state.drag={pointerId:7};context.onLostPointerCapture({pointerId:7,buttons:1});assert(state.drag);assert.equal(recaptured,1);assert.equal(cancelled,0);
 context.onLostPointerCapture({pointerId:7,buttons:0});assert.equal(cancelled,1);assert.equal(state.drag,null);
 state.drag={pointerId:7};element('#modal').open=true;context.onLostPointerCapture({pointerId:7,buttons:1});assert.equal(cancelled,2);assert.equal(recaptured,1);
});

test('Changing the skin applies immediately without committing simulation fields or editing the mechanism',()=>{
 const {context,state}=controller(),before=JSON.stringify(state.project);let applied=null;
 context.applyPreferences=(value,persist)=>{applied={theme:value.theme,persist};state.theme=value.theme;};
 context.onChange({target:{name:'theme',value:'dark',checked:true,dataset:{},closest:selector=>selector==='#settings-form'?{}:null}});
 assert.deepEqual(applied,{theme:'dark',persist:true});assert.equal(JSON.stringify(state.project),before);assert.equal(state.history.length,0);
 context.onChange({target:{name:'theme',value:'mono',checked:false,dataset:{},closest:()=>({})}});assert.equal(state.theme,'dark');
});


test('Manual connections skip the review dialog, create one undoable edit and clear the pending point',()=>{
 const {context,state}=controller(),before=JSON.stringify(state.project);
 context.connectPoint({elementId:'body',point:'b'});context.connectPoint({elementId:'another-body',point:'a'});
 assert(!context.dialog);assert.equal(state.project.connections.length,1);assert.equal(state.pendingJoint,null);assert.equal(state.history.length,1);
 context.undo();assert.equal(JSON.stringify(state.project),before);
});

test('Connecting a pin to either end of a slot creates a path constraint in either click order',()=>{
 for(const reverse of [false,true]){
  const {context,state}=controller(),K=context.K;
  const slot={...K.makeElement('slot',200,100),id:'guide'},pin={...K.makeElement('bearing',200,100),id:'pin'};
  state.project=K.validateProject({...K.preset('custom'),elements:[slot,pin]});state.result=K.solve(state.project,0,{collisions:false});
  const refs=[{elementId:slot.id,point:'a'},{elementId:pin.id,point:'a'}];if(reverse)refs.reverse();
  refs.forEach(r=>context.connectPoint(r));
  const j=state.project.connections[0];assert.equal(j.type,'point-path');assert([j.a,j.b].some(r=>r.elementId===slot.id&&r.point==='curve'));assert(!context.dialog);
 }
});

test('A standalone pin follows a curved track in simulation without a motor, changes no geometry and cancels cleanly',()=>{
 const {context,state}=controller(),K=context.K;
 const slot={...K.makeElement('slot',200,100),id:'guide'},pin={...K.makeElement('bearing',200,100),id:'pin'};
 state.project=K.validateProject({...K.preset('custom'),elements:[slot,pin],connections:[{id:'joint',type:'point-path',a:{elementId:pin.id,point:'a'},b:{elementId:slot.id,point:'curve'},value:0,name:'Track'}]});
 state.mode='simulate';state.collisions=false;state.result=K.solve(state.project,0,{collisions:false});state.contextMenuState.isOpen=false;
 const before=JSON.stringify(state.project);context.solveCurrent=()=>K.solve(state.project,state.motion,{collisions:false,bodyPositions:state.guidePositions});
 for(const t of [0,.5,1]){
  assert(context.beginGuideDrag(state.project.elements[1],7));
  const path=state.result.poses.guide.path,p=path[Math.round(t*(path.length-1))];
  context.onPointerMove({pointerId:7,clientX:p.x,clientY:p.y,preventDefault(){}});
  assert(K.distance(state.result.poses.pin.a,p)<K.TOLERANCE);assert(!state.result.blocked);
  context.onPointerUp({pointerId:7,type:'pointerup'});
 }
 assert.equal(JSON.stringify(state.project),before);assert.equal(state.history.length,0);
 const old=JSON.stringify(state.guidePositions);context.beginGuideDrag(state.project.elements[1],7);
 context.onPointerMove({pointerId:7,clientX:200,clientY:100,preventDefault(){}});context.onPointerUp({pointerId:7,type:'pointercancel'});
 assert.equal(JSON.stringify(state.guidePositions),old);
 state.project.elements[1].locked=true;assert.equal(context.beginGuideDrag(state.project.elements[1],7),false);
});

test('The impact confirmation receives focus so Enter confirms deletion instead of closing the dialog',()=>{
 const {context,state,element}=controller(),button=element('#confirm-impact');
 element('#modal').querySelector=selector=>selector==='#impact-form .button-dark'?button:null;
 context.reviewImpact(context.I.deleteSelection(state.project,['e:body'],state.result),'Deleted',null,'Odstrániť prvky a naviazané väzby?');
 assert.equal(context.document.activeElement,button);assert.equal(state.project.elements.length,2);
 context.workflowSubmit({id:'impact-form'},new Map([['keep-pose','on']]));assert.equal(state.project.elements.length,1);
});


test('The connection tool picks an overlapping pin before a selected slot endpoint',()=>{
 const {context,state}=controller(),K=context.K;
 const slot={...K.makeElement('slot',200,100),id:'guide'},pin={...K.makeElement('bearing',200,100),id:'pin'};
 state.project=K.validateProject({...K.preset('custom'),elements:[slot,pin]});state.result=K.solve(state.project,0,{collisions:false});
 context.selectTarget('n:guide:a');state.tool='connect';
 context.onPointerDown(pointer(200,100));assert.equal(state.pendingJoint.elementId,'pin');
 context.onPointerDown(pointer(200,100));assert.equal(state.project.connections.length,1);assert.equal(state.project.connections[0].type,'point-path');assert(!context.dialog);
});


test('Mobile menus keep workflow and display actions reachable and selection menus never edit the model',()=>{
 const {context,state,element}=controller(390),before=JSON.stringify(state.project);
 context.mobileToolsModal('workflow');
 for(const action of ['freedom-toggle','trial-toggle','mechanism-kit','motion-plan'])assert(context.dialog.html.includes(`data-action="${action}"`));
 context.mobileToolsModal();
 for(const action of ['settings','undo','redo','dimensions','main-dimensions','labels','diagnostics'])assert(context.dialog.html.includes(`data-action="${action}"`));
 context.selectTarget('e:body');element('#manipulation-tools').hidden=false;element('#manipulation-tools').innerHTML='<button data-action="edit-thickness">Hrúbka</button>';
 context.mobileToolsModal('selection');assert(context.dialog.html.includes('selection-settings'));assert(context.dialog.html.includes('edit-thickness'));assert.equal(JSON.stringify(state.project),before);assert.equal(state.history.length,0);
});


test('Mobile geometry handles are opt-in while precise editing commands stay available',()=>{
 const {context,state,element}=controller(390);context.selectTarget('e:body');
 assert.equal(context.manipulationSVG(1),'');assert(!element('#manipulation-tools').hidden);assert(element('#manipulation-tools').innerHTML.includes('edit-length'));
 context.mobileToolsModal('selection');assert(context.dialog.html.includes('mobile-handles'));
 state.mobileHandles=true;assert(context.manipulationSVG(1).includes('data-edit-handle="length"'));assert.equal(state.history.length,0);
});


test('Rail and frame rendering follows the thickness changed by the editor instead of a fixed stroke',()=>{
 for(const type of ['rail','ground']){
  const {context,state}=controller(),K=context.K,e={...K.makeElement(type,0,0),id:'thick'};
  state.project=K.validateProject({...K.preset('custom'),elements:[e]});
  const key=type==='rail'?'slotWidth':'width';
  for(const size of [16,60,255]){
   state.project=context.W.setThickness(state.project,e.id,size);state.result=context.E.design(state.project,0);
   const current=state.project.elements[0],html=context.drawElement(current,state.result.poses[e.id],state.result);
   assert.equal(current[key],size);assert(html.includes(`stroke-width="${size}"`),type+' '+size);
   assert.equal(context.W.thickness(current).value,size);
  }
 }
});

test('Fusion connection checking immediately shows progress, reports errors visibly and can be retried without sending geometry',async()=>{
 const {context,element}=controller(),status=element('#fusion-status'),button=element('#fusion-check');button.isConnected=true;
 element('#fusion-form').elements={key:{value:' mock-pairing-value-not-a-real-key '}};
 let release,calls=0;context.CAD.status=key=>{assert.equal(key,'mock-pairing-value-not-a-real-key');calls++;return new Promise(resolve=>release=resolve);};
 const pending=context.checkFusionConnection(button);assert.equal(status.dataset.state,'busy');assert(button.disabled);assert(status.textContent.includes('Overujem'));
 release({});await pending;assert.equal(status.dataset.state,'ready');assert(!button.disabled);
 context.CAD.status=async()=>{calls++;throw Error('Port 8765 nie je dostupný');};
 await context.checkFusionConnection(button);assert.equal(status.dataset.state,'error');assert.equal(status.textContent,'Port 8765 nie je dostupný');assert(!button.disabled);assert.equal(calls,2);
});

test('Manipulation handles leave every real port accessible across element types and zoom levels',()=>{
 const {context,state}=controller(),K=context.K;
 for(const type of K.TYPES)for(const scale of [.3,1,3]){
  const e={...K.makeElement(type,100,150),id:'audit-body',length:type==='link'?42:K.makeElement(type).length,angle:31};
  state.project=K.validateProject({...K.preset('custom'),elements:[e]});state.result=context.E.design(state.project,0);state.selectedElementIds=['e:audit-body'];state.selected=e.id;
  const html=context.manipulationSVG(scale),pins=K.pointKeys(e).map(point=>K.point(state.result,{elementId:e.id,point})),handles=[];
  for(const match of html.matchAll(/data-edit-handle="([^"]+)"[^]*?<(circle|rect) ([^>]+)>/g)){
   const attrs=Object.fromEntries([...match[3].matchAll(/([a-z]+)="([^"]+)"/g)].map(m=>[m[1],Number(m[2])]));
   const at=match[2]==='circle'?{x:attrs.cx,y:attrs.cy}:{x:attrs.x+attrs.width/2,y:attrs.y+attrs.height/2};
   assert.ok(pins.every(p=>K.distance(p,at)*scale>=29.99),`${type}.${match[1]} covers a port at zoom ${scale}`);
   assert.ok(handles.every(p=>K.distance(p,at)*scale>=29.99),`${type}.${match[1]} covers a handle`);handles.push(at);
  }
  assert.ok(handles.length,`${type} has its size handle`);
 }
});
test('Connection tool couples motor shaft rigidly and leaves the eccentric pin revolute',()=>{
 for(const point of ['a','b']){
  const {context,state}=controller(),K=context.K,m={...K.makeElement('motor',100,100),id:'motor'},link={...K.makeElement('link',point==='a'?100:120,100),id:'driven-link'};
  state.project=K.validateProject({...K.preset('custom'),elements:[m,link]});state.result=context.E.design(state.project,0);
  context.connectPoint({elementId:m.id,point});context.connectPoint({elementId:link.id,point:'a'});
  assert.equal(state.project.connections.length,1);assert.equal(state.project.connections[0].type,point==='a'?'fixed':'revolute');
 }
});
test('Dragging a passive carriage port moves the carriage instead of the locked guide',()=>{
 const {context,state}=controller(),K=context.K,rail={...K.makeElement('rail',100,100),id:'rail',drive:false,locked:true,carriageOffset:50};
 state.project=K.validateProject({...K.preset('custom'),elements:[rail]});state.result=context.E.design(state.project,0);
 const at=state.result.poses.rail.ct;context.onPointerDown(pointer(at.x,at.y));assert.deepEqual(Array.from(state.drag.keys),['n:rail:ct']);
 context.onPointerMove(pointer(at.x+30,at.y+20));context.onPointerUp({pointerId:1});
 assert.equal(state.project.elements[0].carriageOffset,80);assert.equal(state.project.elements[0].x,100);assert.equal(state.project.elements[0].y,100);
});

test('A new palette motor creates one undoable housing and rotor assembly',()=>{
 const {context,state}=controller();state.project=context.K.preset('custom');state.result=context.E.design(state.project,0);
 context.addElement('motor',{x:100,y:100});
 assert.equal(state.project.elements.length,2);const motor=state.project.elements.find(e=>e.type==='motor'),housing=state.project.elements.find(e=>e.role==='motor-housing');
 assert.equal(motor.parentId,housing.id);assert.equal(motor.parentPoint,'c');assert.equal(state.history.length,1);
 assert.ok(context.K.distance(state.result.poses[motor.id].a,state.result.poses[housing.id].c)<1e-6);
 context.undo();assert.equal(state.project.elements.length,0);
});
test('Repair preview makes no edit until confirmed, is undoable and refuses a changed project',()=>{
 const {context,state}=controller(),K=context.K,m={...K.makeElement('motor',100,100),drive:true},g=K.makeElement('ground',100,100);
 state.project=K.validateProject({...K.preset('custom'),elements:[m,g],connections:[{id:'fixed-support',name:'Pevná os',type:'fixed',a:{elementId:m.id,point:'a'},b:{elementId:g.id,point:'a'},value:0}]});state.motion=90;state.result=K.solve(state.project,90,{collisions:false});
 const before=JSON.stringify(state.project),button={dataset:{key:'j:fixed-support',kind:'release-rotation'},textContent:'Uvoľniť otočenie'};
 context.repairModel(button);assert.equal(JSON.stringify(state.project),before);assert.equal(state.history.length,0);assert.match(context.dialog.html,/Pred úpravou/);assert.match(context.dialog.html,/Po úprave/);
 context.applyRepairPreview();assert.equal(state.project.connections[0].type,'revolute');assert.equal(state.history.length,1);
 context.undo();assert.equal(state.project.connections[0].type,'fixed');
 context.repairModel(button);state.project.name+=' changed';context.applyRepairPreview();assert.equal(state.project.connections[0].type,'fixed');assert.match(context.lastToast,/zmenil/);
});

test('Duplicating a rotor creates its own housing at the displayed world pose',()=>{
 const {context,state}=controller(),K=context.K,m={...K.makeElement('motor',100,100),id:'motor-copy'};state.project=context.I.separateMotor(K.validateProject({...K.preset('custom'),elements:[m]}),m.id);state.result=context.E.design(state.project,0);context.selectTarget(context.I.elementKey(m.id));
 const originalHousing=state.project.elements.find(e=>e.role==='motor-housing');context.selectedPose=()=>state.result.poses[state.selected];context.duplicateElement();
 const clone=state.project.elements.find(e=>e.type==='motor'&&e.id!==m.id);assert.notEqual(clone.parentId,originalHousing.id);assert.equal(state.project.elements.length,4);assert.equal(state.history.length,1);
 assert.ok(K.distance(state.result.poses[clone.id].a,{x:135,y:65})<1e-6);context.undo();assert.equal(state.project.elements.length,2);
});

test('Motor housing and rotor show compact size controls without editable outline vertices or invisible hit targets',()=>{
 const {context,state}=controller(),K=context.K,m={...K.makeElement('motor',100,100),id:'simple-motor'};
 state.project=context.I.separateMotor(K.validateProject({...K.preset('custom'),elements:[m]}),m.id);state.result=context.E.design(state.project,0);
 const housing=state.project.elements.find(e=>e.role==='motor-housing');
 for(const id of [housing.id,m.id]){
  context.selectTarget(context.I.elementKey(id));
  const scene=context.sceneMarkup(state.result,{scale:1,diagnostics:[],view:{x:-100,y:-100,width:600,height:400}}),controls=context.manipulationSVG(1);
  assert.equal((scene.match(/data-outline-control=/g)||[]).length,0);
  assert.match(scene,/data-motor-appearance="housing"/);assert.match(controls,/data-motor-controls="compact"/);
  assert.equal((controls.match(/data-edit-handle=/g)||[]).length,1);assert.match(controls,/data-edit-handle="thickness"/);
 }
 context.selectTarget(context.I.elementKey(housing.id));const vertex=state.result.poses[housing.id].outline[12];
 assert.ok(!String(context.canvasHit({clientX:vertex.x,clientY:vertex.y})).startsWith('p:'),'a hidden vertex must not intercept body dragging');
});

test('Basic motor modes expose housing mounts or rotor ports and advanced mode restores every port',()=>{
 const {context:c,state:s}=controller(),K=c.K;let p=K.preset('custom');p.elements=[{...K.makeElement('motor',100,100),id:'motor'}];p=c.I.separateMotor(p,'motor');s.project=p;s.detailLevel='basic';s.motorMode='mount';s.selectedElementIds=p.elements.map(e=>'e:'+e.id);const motor=p.elements.find(e=>e.id==='motor'),housing=p.elements.find(e=>e.role==='motor-housing');
 assert.equal(c.portVisible(motor,'a'),false);assert.equal(c.portVisible(housing,'a'),true);s.motorMode='drive';assert.equal(c.portVisible(motor,'b'),true);assert.equal(c.portVisible(housing,'a'),false);
 s.selectedElementIds=[];s.tool='select';assert.equal(c.portVisible(motor,'a'),false);s.tool='connect';assert.equal(c.portVisible(motor,'a'),true);s.detailLevel='advanced';assert.equal(c.portVisible(housing,'b'),true);
});
test('Isolation includes assembly descendants but never changes the model or its history',()=>{
 const {context:c,state:s}=controller();s.project=c.I.bindRigid(s.project,['e:body','e:another-body']);const extra=c.K.makeElement('link',400,400);s.project.elements.push(extra);s.result=c.E.design(s.project,0);s.selectedElementIds=['e:body'];const before=JSON.stringify(s.project);
 c.isolateSelection();assert.equal(c.viewElementVisible(extra.id),false);assert.equal(c.viewElementVisible('another-body'),true);assert.equal(JSON.stringify(s.project),before);assert.equal(s.history.length,0);c.isolateSelection();assert.equal(c.viewElementVisible(extra.id),true);
});
test('Rigid assembly confirmation is atomic, named and reversible; stale confirmation cannot overwrite later edits',()=>{
 const {context:c,state:s}=controller();s.selectedElementIds=['e:body','e:another-body'];const before=JSON.stringify(s.project);c.rigidAssemblyModal();assert.equal(JSON.stringify(s.project),before);assert.equal(s.history.length,0);
 c.submitRigidAssembly(new Map([['name','Nosná zostava']]));assert.equal(s.history.length,1);assert(s.project.elements.every(e=>e.rigidAssemblyName==='Nosná zostava'));c.undo();assert.equal(JSON.stringify(s.project),before);
 c.rigidAssemblyModal();s.project.name='New edit';assert.throws(()=>c.submitRigidAssembly(new Map([['name','Zostava']])),/Projekt sa zmenil/);assert.equal(s.project.name,'New edit');
});
test('Motor protection stops an overloaded startup and permits a sufficient motor without changing manual settings',()=>{
 const {context:c,state:s}=controller(),motor={...c.K.makeElement('motor',0,0),id:'motor',drive:true,rpm:60,powerW:.01,enforceTorque:true,mass:0},arm={...c.K.makeElement('link',0,0),parentId:'motor',parentPoint:'a',length:1000,mass:2};s.project=c.K.validateProject({...c.K.preset('custom'),elements:[motor,arm]});s.direction=1;s.motion=0;s.playing=true;
 assert.equal(c.guardMotorMotion(5),0);assert.equal(s.playing,false);assert.match(c.lastToast,/Motor zastavený/);
 s.project.elements[0].powerW=100000;s.motorGuardStarted=false;s.motorGuardLastMotion=null;s.playing=true;assert.equal(c.guardMotorMotion(5),5);assert.equal(s.playing,true);
});
test('Copying a grouped motor preserves its housing and descendants and produces one undo step',()=>{
 const {context:c,state:s}=controller();s.project=c.K.preset('custom');s.project.elements=[{...c.K.makeElement('motor',100,100),id:'motor'}];s.project=c.I.separateMotor(s.project,'motor');s.result=c.E.design(s.project,0);c.selectedPose=()=>s.result.poses[s.selected];const housing=s.project.elements.find(e=>e.role==='motor-housing');c.selectTarget('e:'+housing.id);c.duplicateElement();
 assert.equal(s.project.elements.filter(e=>e.type==='motor').length,2);assert.equal(s.project.elements.filter(e=>e.role==='motor-housing').length,2);assert.equal(s.history.length,1);const motors=s.project.elements.filter(e=>e.type==='motor');assert.notEqual(motors[0].parentId,motors[1].parentId);c.undo();assert.equal(s.project.elements.length,2);
});
test('Mobile selection menu exposes rigid binding and isolation and tree selection supports additive taps',()=>{
 const {context:c,state:s}=controller(390);s.multiSelect=true;c.selectElement('body');c.selectElement('another-body');assert.equal(s.selectedElementIds.length,2);c.mobileToolsModal('selection');assert.match(c.dialog.html,/data-action="bind-rigid"/);assert.match(c.dialog.html,/data-action="multi-select"/);assert.match(c.dialog.html,/data-action="isolate-selection"/);
 c.selectElement('body');assert.deepEqual([...s.selectedElementIds],['e:another-body']);
});

test('A free node starts a new prismatic joint from its menu, never editing an existing joint', () => {
  const { context, state } = controller(), I = globalThis.KinmoInteraction;
  const items = context.contextItems(I.target(state.project, 'n:body:a'));
  assert(items.some((i) => i.id === 'joint-new-prismatic') && !items.some((i) => i.label === 'Zmeniť typ väzby'));
  state.project.connections.push({ id: 'existing-joint', name: 'Pôvodná', a: { elementId: 'body', point: 'a' }, b: { elementId: 'another-body', point: 'a' }, type: 'revolute' });
  state.project = context.K.validateProject(state.project); state.result = context.E.design(state.project, 0);
  state.contextMenuState.targetId = 'n:body:a'; context.onContextAction('joint-new-prismatic');
  assert.match(context.dialog.html, /<option value="">Nová väzba<\/option>/); assert.doesNotMatch(context.dialog.html, /value="existing-joint" selected/);
  const joint = context.contextItems(I.target(state.project, 'j:existing-joint'));
  assert(joint.find((i) => i.label === 'Typ väzby').items.some((i) => i.id === 'joint-prismatic'));
  context.onContextAction('no-such-action'); assert.match(context.lastToast, /Neznáma akcia ponuky: no-such-action/);
});

test('A repeated click on the same spot cycles overlapping entities, but a double click and a drag do not', () => {
  const { context, state } = controller(), hits = ['n:body:a', 'e:body', 'e:another-body'];
  context.canvasHit = (_event, all) => (all ? hits : hits[0]);
  const click = (time) => { context.onPointerDown(pointer(10, 20, { timeStamp: time })); context.onPointerUp(pointer(10, 20, { timeStamp: time + 60 })); };
  click(1000); assert.deepEqual([...state.selectedElementIds], ['n:body:a']);
  // A second click within the interval is a double click: it opens the main edit and does not cycle.
  context.dialog = null; click(1200); assert.deepEqual([...state.selectedElementIds], ['n:body:a']); assert.match(context.dialog?.title || '', /súradnice/i);
  click(2000); assert.deepEqual([...state.selectedElementIds], ['n:body:a']);
  click(3000); assert.deepEqual([...state.selectedElementIds], ['e:body']);
  click(4000); assert.deepEqual([...state.selectedElementIds], ['e:another-body']);
  click(5000); assert.deepEqual([...state.selectedElementIds], ['n:body:a']);
  // Pressing the same spot and dragging keeps the current entity instead of cycling further.
  click(5600); assert.deepEqual([...state.selectedElementIds], ['e:body']);
  context.onPointerDown(pointer(10, 20, { timeStamp: 6600 })); context.onPointerMove(pointer(40, 20, { timeStamp: 6650, buttons: 1 })); context.onPointerUp(pointer(40, 20, { timeStamp: 6700 }));
  assert.deepEqual([...state.selectedElementIds], ['e:body']);
  // A click elsewhere starts a new cycle.
  click(7500); context.onPointerDown(pointer(300, 300, { timeStamp: 8500 })); context.onPointerUp(pointer(300, 300, { timeStamp: 8550 }));
  assert.deepEqual([...state.selectedElementIds], ['n:body:a']);
});
test('On macOS Ctrl+click is left to the system right click instead of cycling or dragging', () => {
  const { context, state } = controller(), hits = ['n:body:a', 'e:body'];
  context.canvasHit = (_event, all) => (all ? hits : hits[0]); context.navigator = { platform: 'MacIntel' }; context.selectTarget('e:body');
  context.onPointerDown(pointer(10, 20, { ctrlKey: true })); assert.deepEqual([...state.selectedElementIds], ['e:body']); assert(!state.drag);
});
test('Dragging on empty canvas selects with a window or a crossing box; Shift adds and a click clears', () => {
  const { context, state } = controller(), I = globalThis.KinmoInteraction, empty = { target: { closest: () => null } };
  context.canvasHit = (_event, all) => (all ? [] : null);
  const box = (from, to, extra = {}) => { context.onPointerDown(pointer(from.x, from.y, { ...empty, ...extra })); context.onPointerMove(pointer(to.x, to.y, { ...empty, buttons: 1 })); context.onPointerUp(pointer(to.x, to.y, empty)); };
  const everything = I.boxSelect(state.project, state.result, { a: { x: -1000, y: -1000 }, b: { x: 1000, y: 1000 } }, false).sort();
  assert(everything.length >= 2);
  box({ x: -1000, y: -1000 }, { x: 1000, y: 1000 }); assert.deepEqual([...state.selectedElementIds].sort(), everything);
  const first = everything[0], body = state.result.poses[I.target(state.project, first).elementId], mid = { x: (body.a.x + (body.b?.x ?? body.a.x)) / 2, y: (body.a.y + (body.b?.y ?? body.a.y)) / 2 };
  context.onPointerDown(pointer(5000, 5000, empty)); context.onPointerUp(pointer(5000, 5000, empty)); assert.equal(state.selectedElementIds.length, 0);
  box({ x: mid.x + 6, y: mid.y + 6 }, { x: mid.x - 6, y: mid.y - 6 }); assert(state.selectedElementIds.includes(first), 'Krížový výber sprava doľava má zachytiť dotknuté teleso.');
  context.selectTarget(null); box({ x: mid.x - 6, y: mid.y - 6 }, { x: mid.x + 6, y: mid.y + 6 }); assert(!state.selectedElementIds.includes(first), 'Okno zľava doprava nesmie zachytiť čiastočne zasiahnuté teleso.');
  context.selectTarget(everything[1]); box({ x: mid.x + 6, y: mid.y + 6 }, { x: mid.x - 6, y: mid.y - 6 }, { shiftKey: true });
  assert(state.selectedElementIds.includes(everything[1]) && state.selectedElementIds.includes(first), 'Shift pridáva k existujúcemu výberu.');
});
test('Double click and Enter run the main edit of the entity, which the menu marks', () => {
  const { context, state } = controller(), I = globalThis.KinmoInteraction, event = { clientX: 10, clientY: 20, target: { closest: () => null }, preventDefault() {} };
  context.canvasHit = () => 'e:body'; context.dialog = null; context.onDoubleClick(event);
  assert.equal(context.dialog?.title, 'Vlastnosti prvku');
  assert(context.contextItems(I.target(state.project, 'e:body')).some((i) => i.id === 'inspect' && i.shortcut === 'Dvojklik'));
  context.canvasHit = () => 'n:body:a'; context.dialog = null; context.onDoubleClick(event);
  assert.match(context.dialog?.title || '', /súradnice/i); assert.deepEqual([...state.selectedElementIds], ['n:body:a']);
  context.dialog = null; context.selectTarget('e:body'); context.onKeyboard({ key: 'Enter', target: { closest: () => null }, preventDefault() {} });
  assert.equal(context.dialog?.title, 'Vlastnosti prvku');
  state.tool = 'pan'; context.dialog = null; context.onDoubleClick(event); assert.equal(context.dialog, null);
});

test('Two quick Shift clicks on one spot toggle the selection without opening the main edit', () => {
  const { context, state } = controller(), hits = ['e:body', 'e:another-body'];
  context.canvasHit = (_event, all) => (all ? hits : hits[0]); context.dialog = null;
  for (const time of [1000, 1150]) { context.onPointerDown(pointer(10, 20, { timeStamp: time, shiftKey: true })); context.onPointerUp(pointer(10, 20, { timeStamp: time + 40, shiftKey: true })); }
  assert.equal(context.dialog, null); assert.equal(state.selectedElementIds.length, 0);
});

test('Mouse wheel zooms, a trackpad pans and pinches, Shift pans sideways and Alt scrubs the drive', () => {
  const { context, state } = controller(), wheel = (extra) => ({ clientX: 100, clientY: 100, deltaX: 0, deltaY: 100, deltaMode: 0, preventDefault() {}, ...extra });
  state.view = { x: 0, y: 0, width: 800, height: 450 }; state.baseView = { ...state.view };
  const view = () => ({ ...state.view });
  let before = view(); context.onWheel(wheel()); assert(state.view.width > before.width, 'Koliesko myši zoomuje.');
  before = view(); context.onWheel(wheel({ deltaY: 0, deltaX: 40 })); assert(!state.trackpad, 'Samotný vodorovný posun (naklonenie kolieska) trackpad neprepne.');
  before = view(); context.onWheel(wheel({ shiftKey: true, deltaY: 50 })); assert(state.view.x > before.x && state.view.width === before.width && state.view.y === before.y, 'Shift + koliesko posúva vodorovne.');
  before = view(); context.onWheel(wheel({ deltaX: 12, deltaY: 30 })); assert(state.trackpad && state.view.width === before.width && state.view.y > before.y, 'Trackpad posúva.');
  before = view(); context.onWheel(wheel({ deltaY: 30 })); assert(state.view.width === before.width && state.view.y > before.y, 'Po rozpoznaní trackpadu posúva aj zvislý pohyb.');
  before = view(); context.onWheel(wheel({ ctrlKey: true, deltaY: -20 })); assert(state.view.width < before.width, 'Štipnutie (Ctrl + koliesko) zoomuje.');
  state.motion = 0; state.playing = true; context.onWheel(wheel({ altKey: true })); assert(state.motion > 0 && !state.playing, 'Alt + koliesko posunie polohu pohonu.');
  const after = state.motion; context.onWheel(wheel({ altKey: true, deltaY: -100 })); assert(state.motion < after);
});
test('Space plays when tapped and pans the canvas when held during a drag', () => {
  const { context, state } = controller(); let plays = 0; context.actions = { play: () => { plays++; } };
  state.view = { x: 0, y: 0, width: 800, height: 450 }; state.baseView = { ...state.view };
  const key = (type, extra = {}) => ({ key: ' ', code: 'Space', target: { closest: () => null }, preventDefault() {}, ...extra });
  context.onKeyboard(key()); context.onKeyUp(key()); assert.equal(plays, 1, 'Ťuknutie medzerníka prehrá.');
  context.onKeyboard(key()); context.onKeyboard(key({ repeat: true }));
  const before = { ...state.view };
  context.onPointerDown(pointer(100, 100)); assert.equal(state.drag?.kind, 'pan', 'Podržaný medzerník + ťahanie posúva plátno aj nad prvkom.');
  context.onPointerMove(pointer(160, 130, { buttons: 1 })); context.onPointerUp(pointer(160, 130));
  assert(state.view.x < before.x && state.view.y < before.y); assert.equal(state.history.length, 0);
  context.onKeyUp(key()); assert.equal(plays, 1, 'Po posune pustenie medzerníka neprehrá.');
});
test('A right drag pans without a menu; a right click still opens it on every platform order', () => {
  const { context, state } = controller(), right = (x, y, extra = {}) => pointer(x, y, { button: 2, ...extra });
  state.view = { x: 0, y: 0, width: 800, height: 450 }; state.baseView = { ...state.view };
  const menuEvent = (x, y) => ({ clientX: x, clientY: y, target: { closest: () => null }, preventDefault() {}, stopPropagation() {} });
  // Linux/macOS order: contextmenu arrives at the press.
  let before = { ...state.view }; context.openedMenu = null;
  context.onPointerDown(right(100, 100)); context.onContextMenu(menuEvent(100, 100)); assert.equal(context.openedMenu, null);
  context.onPointerMove(right(170, 140, { buttons: 2 })); context.onPointerUp(right(170, 140));
  assert(state.view.x < before.x, 'Ťahanie pravým tlačidlom posúva plátno.'); assert.equal(context.openedMenu, null, 'Po posune sa ponuka neotvorí.');
  context.onPointerDown(right(55, 22)); context.onContextMenu(menuEvent(55, 22)); context.onPointerUp(right(55, 22));
  assert(context.openedMenu, 'Pravý klik bez pohybu otvorí ponuku.');
  // Windows order: contextmenu arrives after the release.
  context.openedMenu = null; context.onPointerDown(right(100, 100)); context.onPointerMove(right(170, 140, { buttons: 2 })); context.onPointerUp(right(170, 140));
  context.onContextMenu(menuEvent(170, 140)); assert.equal(context.openedMenu, null, 'Neskorá ponuka po posune sa potlačí.');
  context.onPointerDown(right(55, 22)); context.onPointerUp(right(55, 22)); context.onContextMenu(menuEvent(55, 22));
  assert(context.openedMenu, 'Neskorá ponuka po pravom kliku sa otvorí.');
});
