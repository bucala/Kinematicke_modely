import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { root } from './manifest.mjs';

// Runs tests/browser.html and a boot smoke test of the application in headless Chromium.
// Playwright is not a project dependency: npm i --no-save playwright && npx playwright install chromium
let chromium;
try { ({ chromium } = await import('playwright')); }
catch { console.error('Chýba Playwright. Spustite: npm i --no-save playwright && npx playwright install chromium'); process.exit(1); }

const port = Number(process.env.BROWSER_TEST_PORT || 5174);
const server = spawn(process.execPath, [path.join(root, 'scripts/server.mjs')], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((resolve, reject) => {
  server.stdout.on('data', (chunk) => { if (String(chunk).includes('http://')) resolve(); });
  server.on('exit', (code) => reject(new Error(`Server skončil s kódom ${code}.`)));
});

const origin = `http://127.0.0.1:${port}`, failures = [];
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
async function page(url, viewport = { width: 1440, height: 900 }, extra = {}) {
  const view = await browser.newPage({ viewport, ...extra }), errors = [];
  view.on('pageerror', (error) => errors.push(error.message));
  view.on('console', (message) => { if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) errors.push(message.text()); });
  // Browsers request /favicon.ico for pages without an icon link; every other missing file is an error.
  view.on('response', (response) => { if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) errors.push(`${response.status()} ${response.url()}`); });
  await view.goto(url);
  return { view, errors };
}
const check = (name, condition, detail = '') => { console.log(`${condition ? 'ok' : 'FAIL'} - ${name}${detail ? ` · ${detail}` : ''}`); if (!condition) failures.push(name); };

try {
  const suite = await page(`${origin}/tests/browser.html`);
  await suite.view.waitForFunction(() => globalThis.KinematicsTestResult, null, { timeout: 120000 });
  const result = await suite.view.evaluate(() => globalThis.KinematicsTestResult);
  for (const { name, message } of result.failed) console.log(`FAIL - ${name}\n  ${message}`);
  check('Spoločná sada v prehliadači', !result.failed.length && result.passed === result.total, `${result.passed} / ${result.total}`);
  check('Sada v prehliadači bez chýb stránky', !suite.errors.length, suite.errors.join(' | '));

  for (const [name, url] of [['HTTP', `${origin}/`], ['file://', pathToFileURL(path.join(root, 'index.html')).href]]) {
    const app = await page(url);
    const ready = await app.view.waitForSelector('#workspace', { timeout: 15000 }).then(() => true, () => false);
    check(`Aplikácia sa spustí cez ${name}`, ready && !app.errors.length, app.errors.join(' | '));
  }
  const mobile = await page(`${origin}/`, { width: 390, height: 844 }, { isMobile: true, hasTouch: true });
  await mobile.view.waitForSelector('#workspace', { timeout: 15000 });
  check('Mobil 390 px bez vodorovného posúvania', !(await mobile.view.evaluate(() => document.documentElement.scrollWidth > innerWidth)) && !mobile.errors.length, mobile.errors.join(' | '));

  // Context menus: one short menu per entity type, no duplicates or dead items, every item runs, every label translated.
  const menus = await page(`${origin}/`);
  menus.view.on('dialog', (dialog) => dialog.dismiss().catch(() => {}));
  menus.view.on('download', (download) => download.cancel().catch(() => {}));
  await menus.view.waitForSelector('#workspace', { timeout: 15000 });
  const menuReport = await menus.view.evaluate(checkContextMenus);
  for (const problem of menuReport.problems) console.log(`  ${problem}`);
  check('Kontextové ponuky podľa typu entity', !menuReport.problems.length && !menus.errors.length, `${menuReport.menus} ponúk, ${menuReport.actions} spustených akcií${menus.errors.length ? ` · ${menus.errors.join(' | ')}` : ''}`);
  await menus.view.close();

  // Translation coverage: open every template and run every non-destructive UI action in EN and DE.
  const allowed = JSON.parse(await readFile(path.join(root, 'tests/i18n-untranslated.json'), 'utf8'));
  for (const language of ['en', 'de']) {
    const tour = await page(`${origin}/`);
    tour.view.on('dialog', (dialog) => dialog.dismiss().catch(() => {}));
    tour.view.on('download', (download) => download.cancel().catch(() => {}));
    await tour.view.waitForSelector('#workspace', { timeout: 15000 });
    const found = new Set();
    for (const kind of ['fourbar', 'crank', 'drawer', 'double-drawer']) {
      await tour.view.evaluate((kind) => { const project = Kinematics.validateProject(Kinematics.preset(kind)); localStorage.setItem('kinematika.projects.v1', JSON.stringify([project])); localStorage.setItem('kinematika.last.v1', project.id); }, kind);
      await tour.view.reload(); await tour.view.waitForSelector('#workspace', { timeout: 15000 });
      for (const text of await tour.view.evaluate(untranslatedTexts, language)) found.add(text);
    }
    const unexpected = [...found].filter((text) => !allowed[language].includes(text)).sort();
    for (const text of unexpected) console.log(`  [${language}] ${text}`);
    check(`Preklad ${language.toUpperCase()} bez nových slovenských textov`, !unexpected.length, unexpected.length ? `${unexpected.length} textov; preložte ich v i18n.js` : `${found.size} povolených výnimiek`);
    await tour.view.close();
  }
} finally {
  await browser.close();
  server.kill();
}
// Runs in the page: builds the menu of every entity type in a model with all element kinds, then runs each item on a fresh copy.
async function checkContextMenus() {
  const K = Kinematics, I = KinmoInteraction, problems = [], messages = [];
  const project = K.preset('custom'), add = (type, x, y) => { const e = K.makeElement(type, x, y); project.elements.push(e); return e; };
  const ground = add('ground', 0, 200), link = add('link', 0, 200), link2 = add('link', 100, 100), slot = add('slot', 200, 100), cam = add('cam', 300, 200);
  const rail = add('rail', 0, 300), spring = add('spring-compression', 50, 50), motor = add('motor', 400, 200), node = add('node', 150, 150), panel = add('panel', 250, 0);
  project.connections.push({ id: 'menu-j1', name: 'Kĺb A', type: 'revolute', a: { elementId: ground.id, point: 'a' }, b: { elementId: link.id, point: 'a' } });
  project.connections.push({ id: 'menu-j2', name: 'Kĺb B', type: 'revolute', a: { elementId: link.id, point: 'b' }, b: { elementId: link2.id, point: 'a' } });
  const base = JSON.stringify(K.validateProject(project));
  const cases = [
    ['plocha', null], ['väzba', I.jointKey('menu-j1')], ['uzol ramena', I.nodeKey({ elementId: link.id, point: 'b' })], ['pevný bod', I.nodeKey({ elementId: ground.id, point: 'a' })],
    ['voľný uzol', I.nodeKey({ elementId: node.id, point: 'a' })], ['dráha kulisy', I.pathKey(slot.id)], ['riadiaci bod', I.controlKey(slot.id, 1)],
    ...[link, ground, slot, cam, rail, spring, motor, panel].map((e) => [`teleso ${e.type}`, I.elementKey(e.id)]),
  ];
  const originalToast = toast; toast = (message) => messages.push(String(message));
  const fresh = (selection = []) => { document.querySelector('dialog[open]')?.close(); closeContextMenu(); loadProject(K.validateProject(JSON.parse(base))); state.selectedElementIds = selection; };
  const runAll = async (name, key, selection) => {
    fresh(selection); const t = key ? I.target(state.project, key) : null, items = contextItems(t);
    const flat = items.flatMap((i) => i.items ? [i, ...i.items] : [i]).filter((i) => !i.separator);
    const ids = flat.filter((i) => !i.items).map((i) => i.id).filter(Boolean), top = items.filter((i) => !i.separator).length;
    if (new Set(ids).size !== ids.length) problems.push(`${name}: akcia je v ponuke dvakrát (${ids.filter((id, i) => ids.indexOf(id) !== i).join(', ')})`);
    if (top > 10) problems.push(`${name}: ${top} položiek na hornej úrovni`);
    for (const item of flat) {
      if (item.disabled && !item.items && !/chránená/.test(item.label)) problems.push(`${name}: neaktívna položka „${item.label}“`);
      for (const language of ['en', 'de']) if (KinmoI18n.missing(item.label, language).some((part) => /\p{Ll}/u.test(part) && !state.project.elements.some((e) => part.includes(e.name)) && !state.project.connections.some((c) => part.includes(c.name)))) problems.push(`${name}: nepreložené „${item.label}“ (${language})`);
    }
    for (const id of ids.filter((id) => !id.startsWith('pick:') && !id.startsWith('assembly-'))) {
      fresh(selection); openContextMenu({ clientX: 300, clientY: 300, target: document.body }, key); messages.length = 0;
      try { onContextAction(id); await new Promise((resolve) => setTimeout(resolve, 0)); } catch (error) { problems.push(`${name} → ${id}: ${error.message}`); }
      for (const message of messages) if (/Neznáma akcia|is not|Cannot read|undefined/.test(message)) problems.push(`${name} → ${id}: ${message}`);
      count++;
    }
  };
  let count = 0;
  try {
    for (const [name, key] of cases) await runAll(name, key, key ? [key] : []);
    await runAll('výber dvoch telies', I.elementKey(link.id), [I.elementKey(link.id), I.elementKey(link2.id)]);
    const template = K.preset('fourbar'); loadProject(K.validateProject(template));
    const templateItems = contextItems(I.target(state.project, I.elementKey('input-1')));
    if (!templateItems.some((i) => i.id === 'copy-editable') || templateItems.filter((i) => i.disabled).length > 1) problems.push('šablóna: chýba cesta k voľnej kópii alebo obsahuje neaktívne úpravy');
  } finally { toast = originalToast; fresh(); }
  return { problems, menus: cases.length + 2, actions: count };
}
// Runs in the page: returns texts with parts left in Slovak after translation, numbers normalized to {n}; model and project names are skipped.
async function untranslatedTexts(language) {
  const number = /[-−]?\d+(?:[\u00a0\u202f ]\d{3})*(?:[,.]\d+)?(?:\s?[–-]\s?[-−]?\d+(?:[\u00a0\u202f ]\d{3})*(?:[,.]\d+)?)?/g;
  const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const templateNames = [...Kinematics.KINDS, 'double-drawer'].flatMap((kind) => { try { const p = Kinematics.preset(kind); return [p.name, ...p.elements.map((e) => e.name), ...p.connections.map((c) => c.name)]; } catch { return []; } });
  const names = () => [...templateNames, state.project.name, ...state.project.elements.map((e) => e.name), ...state.project.connections.map((c) => c.name), ...(state.project.dimensions || []).map((d) => d.name), ...(state.project.trajectories || []).map((t) => t.name)].filter(Boolean);
  const found = new Set();
  // Model and project names are replaced by a placeholder first; a part counts when it has lowercase letters (not PDF or DXF).
  // Error texts from actions run outside their dialog are browser messages, not UI copy.
  const check = (text) => {
    let value = text?.trim(); if (!value || /Cannot read|is not a function|is not defined|undefined/.test(value)) return;
    const original = value, untranslated = () => KinmoI18n.missing(value, language).some((part) => /\p{Ll}/u.test(part));
    if (!untranslated()) return;
    for (const name of names().sort((a, b) => b.length - a.length)) value = value.split(name).join('◆');
    if (untranslated()) found.add(original.replace(number, '{n}'));
  };
  const grab = () => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let node;
    while ((node = walker.nextNode())) if (!node.parentElement?.closest('script,style,textarea,code,noscript,[data-i18n-user]')) check(node.nodeValue);
    for (const element of document.querySelectorAll('[title],[aria-label],[placeholder]')) for (const name of ['title', 'aria-label', 'placeholder']) check(element.getAttribute(name));
  };
  await frame(); grab();
  const skip = /delete|remove|import|pick|file|reset|clear|discard|download|export-file|gif-start|pdf|cancel|confirm|undo|redo|apply|submit|commit/i;
  for (const name of Object.keys(actions)) {
    if (skip.test(name)) continue;
    if (state.project.elements.length) { state.selectedElementIds = [state.project.elements[1]?.id].filter(Boolean); state.selectedId = state.selectedElementIds[0]; }
    try { const result = actions[name]({ target: document.body, dataset: {}, closest: () => null }); if (result?.then) await Promise.race([result, new Promise((resolve) => setTimeout(resolve, 150))]); } catch { /* Actions outside their dialog may refuse; only rendered text matters. */ }
    await frame(); grab();
    document.querySelector('dialog[open]')?.close();
    if (state.magic) try { cancelMagicImport(); } catch { /* Already closed. */ }
  }
  return [...found];
}
if (failures.length) { console.error(`\n${failures.length} kontrol zlyhalo.`); process.exit(1); }
console.log('\nVšetky kontroly v prehliadači prešli.');
