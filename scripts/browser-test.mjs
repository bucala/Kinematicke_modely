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

  // Real mouse: box selection, double click and repeated click on overlapping entities.
  const mouse = await page(`${origin}/`);
  await mouse.view.waitForSelector('#workspace', { timeout: 15000 });
  await mouse.view.evaluate(() => { const project = Kinematics.validateProject(Kinematics.preset('fourbar')); localStorage.setItem('kinematika.projects.v1', JSON.stringify([project])); localStorage.setItem('kinematika.last.v1', project.id); });
  await mouse.view.reload(); await mouse.view.waitForSelector('#workspace', { timeout: 15000 });
  await mouse.view.evaluate(() => { makeEditable(); fitView(); renderScene(); });
  const screen = (points) => mouse.view.evaluate((points) => { const m = document.querySelector('#mechanism-canvas').getScreenCTM(); return points.map((p) => ({ x: p.x * m.a + p.y * m.c + m.e, y: p.x * m.b + p.y * m.d + m.f })); }, points);
  const geometry = await mouse.view.evaluate(() => { const ids = state.project.elements.map((e) => e.id), poses = state.result.poses, coupler = state.project.elements.find((e) => e.name === 'Spojovacie tiahlo').id; return { ids, couplerId: coupler, coupler: poses[coupler], all: Object.values(poses).flatMap((p) => [p.a, p.b].filter(Boolean)) }; });
  const xs = geometry.all.map((p) => p.x), ys = geometry.all.map((p) => p.y);
  const [corner1, corner2, couplerMid, joint] = await screen([{ x: Math.min(...xs), y: Math.min(...ys) }, { x: Math.max(...xs), y: Math.max(...ys) }, { x: (geometry.coupler.a.x + geometry.coupler.b.x) / 2, y: (geometry.coupler.a.y + geometry.coupler.b.y) / 2 }, geometry.coupler.a]);
  const selected = () => mouse.view.evaluate(() => [...state.selectedElementIds]);
  // A margin of 30 px around the mechanism stays clear of the toolbars that float over the canvas.
  const topLeft = { x: Math.min(corner1.x, corner2.x) - 30, y: Math.min(corner1.y, corner2.y) - 30 }, bottomRight = { x: Math.max(corner1.x, corner2.x) + 30, y: Math.max(corner1.y, corner2.y) + 30 };
  await mouse.view.mouse.move(topLeft.x, topLeft.y); await mouse.view.mouse.down(); await mouse.view.mouse.move(bottomRight.x, bottomRight.y, { steps: 6 });
  const boxVisible = await mouse.view.evaluate(() => { const box = document.querySelector('.marquee-box'); return !!box && !box.hidden && box.offsetWidth > 20; });
  await mouse.view.mouse.up();
  const boxed = await selected(), boxGone = await mouse.view.evaluate(() => !document.querySelector('.marquee-box'));
  check('Obdĺžnikový výber myšou', boxVisible && boxGone && boxed.length >= 4, `${boxed.length} vybraných prvkov`);
  // From the empty inside of the four-bar towards the upper left, across the coupler only.
  await mouse.view.mouse.move(couplerMid.x + 60, couplerMid.y + 60); await mouse.view.mouse.down(); await mouse.view.mouse.move(couplerMid.x - 20, couplerMid.y - 5, { steps: 6 }); await mouse.view.mouse.up();
  const crossing = await selected();
  check('Krížový výber sprava doľava zachytí dotknuté teleso', crossing.join() === `e:${geometry.couplerId}`, crossing.join(', '));
  await mouse.view.mouse.click(10, 10); await mouse.view.keyboard.press('Escape');
  await mouse.view.mouse.dblclick(couplerMid.x, couplerMid.y);
  const dialog = await mouse.view.evaluate(() => document.querySelector('#modal[open]')?.querySelector('h2,h3,#modal-title')?.textContent || '');
  check('Dvojklik otvorí hlavnú úpravu telesa', /Vlastnosti prvku/.test(dialog), dialog || 'dialóg sa neotvoril');
  await mouse.view.evaluate(() => document.querySelector('#modal')?.close());
  const cycle = [];
  for (let i = 0; i < 3; i++) { await mouse.view.mouse.click(joint.x, joint.y); cycle.push((await selected()).join()); await mouse.view.waitForTimeout(450); }
  check('Opakovaný klik na kĺbe prepína prekryté entity', new Set(cycle).size === 3, cycle.join(' → '));
  // Panning and the wheel: right drag, Space held, Alt+wheel scrubbing and Ctrl+wheel (pinch) zoom.
  const viewState = () => mouse.view.evaluate(() => ({ x: state.view.x, width: state.view.width, motion: state.motion, playing: state.playing, menu: !!document.querySelector('.canvas-context-menu:not([hidden])'), geometry: JSON.stringify(state.project.elements.map((e) => [e.x, e.y, e.angle])) }));
  await mouse.view.keyboard.press('Escape');
  const empty = { x: couplerMid.x + 60, y: couplerMid.y + 60 };
  let before = await viewState();
  await mouse.view.mouse.move(empty.x, empty.y); await mouse.view.mouse.down({ button: 'right' }); await mouse.view.mouse.move(empty.x + 80, empty.y + 30, { steps: 5 }); await mouse.view.mouse.up({ button: 'right' });
  let after = await viewState();
  check('Ťahanie pravým tlačidlom posúva plátno bez ponuky', after.x < before.x && !after.menu, `x ${before.x.toFixed(1)} → ${after.x.toFixed(1)}`);
  await mouse.view.mouse.click(empty.x, empty.y, { button: 'right' }); after = await viewState();
  check('Pravý klik bez pohybu otvorí ponuku', after.menu);
  await mouse.view.keyboard.press('Escape');
  before = await viewState();
  await mouse.view.keyboard.down('Space'); await mouse.view.mouse.move(couplerMid.x, couplerMid.y); await mouse.view.mouse.down(); await mouse.view.mouse.move(couplerMid.x - 70, couplerMid.y, { steps: 5 }); await mouse.view.mouse.up(); await mouse.view.keyboard.up('Space');
  after = await viewState();
  check('Podržaný medzerník + ťahanie posúva plátno, nie prvok', after.x > before.x && after.geometry === before.geometry && !after.playing);
  await mouse.view.keyboard.press('Space'); after = await viewState();
  check('Ťuknutie medzerníka spustí simuláciu', after.playing); await mouse.view.keyboard.press('Space');
  before = await viewState();
  await mouse.view.mouse.move(empty.x, empty.y); await mouse.view.keyboard.down('Alt'); await mouse.view.mouse.wheel(0, 100); await mouse.view.keyboard.up('Alt');
  after = await viewState();
  check('Alt + koliesko posunie polohu pohonu', after.motion !== before.motion && after.width === before.width, `${before.motion} → ${after.motion}`);
  await mouse.view.keyboard.down('Control'); await mouse.view.mouse.wheel(0, -60); await mouse.view.keyboard.up('Control');
  after = await viewState();
  check('Ctrl + koliesko (štipnutie) zoomuje plátno', after.width < before.width);
  check('Ovládanie myšou bez chýb stránky', !mouse.errors.length, mouse.errors.join(' | '));
  await mouse.view.close();

  // Dragging in simulation never fails silently: every movable part either moves or the app says why.
  const silent = await page(`${origin}/`);
  await silent.view.waitForSelector('#workspace', { timeout: 15000 });
  const models = await silent.view.evaluate(dragModels);
  const quiet = [];
  for (const model of models) {
    await silent.view.evaluate((json) => { document.querySelector('dialog[open]')?.close(); loadProject(Kinematics.validateProject(JSON.parse(json))); setMode('simulate'); fitView(); renderScene(); window.__toasts = []; if (!window.__toastWrapped) { const original = toast; toast = (message, ...rest) => { window.__toasts.push(String(message)); return original(message, ...rest); }; window.__toastWrapped = true; } }, model.json);
    for (const id of model.parts) {
      const spot = await silent.view.evaluate((id) => {
        const pose = state.result.poses[id], e = state.project.elements.find((v) => v.id === id), m = document.querySelector('#mechanism-canvas').getScreenCTM();
        const at = e.type === 'bearing' || !pose.b ? pose.a : K.isElastic(e) ? pose.b : { x: pose.a.x + (pose.b.x - pose.a.x) * .6, y: pose.a.y + (pose.b.y - pose.a.y) * .6 };
        window.__toasts = []; window.__before = JSON.stringify(state.result.poses);
        return { name: e.name, x: at.x * m.a + at.y * m.c + m.e, y: at.x * m.b + at.y * m.d + m.f };
      }, id);
      await silent.view.mouse.move(spot.x, spot.y); await silent.view.mouse.down(); await silent.view.mouse.move(spot.x + 40, spot.y + 25, { steps: 6 }); await silent.view.mouse.up();
      const reaction = await silent.view.evaluate(() => ({ moved: JSON.stringify(state.result.poses) !== window.__before, said: window.__toasts.length }));
      if (!reaction.moved && !reaction.said) quiet.push(`${model.name} → ${spot.name}`);
      await silent.view.evaluate((json) => { state.playing = false; document.querySelector('dialog[open]')?.close(); loadProject(Kinematics.validateProject(JSON.parse(json))); setMode('simulate'); fitView(); renderScene(); }, model.json);
    }
  }
  check('Ťahanie v simulácii nikdy nezlyhá potichu', !quiet.length && !silent.errors.length, quiet.length ? `bez reakcie: ${quiet.join('; ')}` : `${models.reduce((n, m) => n + m.parts.length, 0)} dielov v ${models.length} modeloch${silent.errors.length ? ` · ${silent.errors.join(' | ')}` : ''}`);
  await silent.view.close();

  // Real touch through the DevTools protocol: one-finger pan, two- and three-finger taps, double tap.
  const touchPage = await page(`${origin}/`, { width: 390, height: 844 }, { isMobile: true, hasTouch: true });
  await touchPage.view.waitForSelector('#workspace', { timeout: 15000 });
  await touchPage.view.evaluate(() => { const project = Kinematics.validateProject(Kinematics.preset('fourbar')); localStorage.setItem('kinematika.projects.v1', JSON.stringify([project])); localStorage.setItem('kinematika.last.v1', project.id); });
  await touchPage.view.reload(); await touchPage.view.waitForSelector('#workspace', { timeout: 15000 });
  await touchPage.view.evaluate(() => { makeEditable(); fitView(); renderScene(); });
  const cdp = await touchPage.view.context().newCDPSession(touchPage.view);
  const touches = async (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], id) => ({ x, y, id })) });
  const pause = (ms) => touchPage.view.waitForTimeout(ms);
  // An empty spot inside the canvas, clear of floating toolbars.
  const spots = await touchPage.view.evaluate(() => {
    const svg = document.querySelector('#mechanism-canvas'), m = svg.getScreenCTM(), r = svg.getBoundingClientRect();
    const free = (x, y) => { const el = document.elementFromPoint(x, y); return svg.contains(el) && !canvasHit({ clientX: x, clientY: y, target: el, pointerType: 'touch' }); };
    let empty = null;
    for (let y = r.top + r.height * .35; y < r.bottom - 40 && !empty; y += 12) for (let x = r.left + 30; x < r.right - 30 && !empty; x += 12) if (free(x, y) && free(x + 60, y) && free(x, y + 40)) empty = { x, y };
    return { empty };
  });
  const snapshot = () => touchPage.view.evaluate(() => ({ x: state.view.x, history: state.history.length, future: state.future.length, geometry: JSON.stringify(state.project.elements.map((e) => [e.x, e.y, e.angle])), dialog: document.querySelector('#modal[open]')?.querySelector('h2,h3,#modal-title')?.textContent || '' }));
  if (!spots.empty) check('Dotykové gestá', false, 'na plátne sa nenašlo voľné miesto');
  else {
    let before = await snapshot();
    await touches('touchStart', [[spots.empty.x, spots.empty.y]]); for (let i = 1; i <= 5; i++) { await touches('touchMove', [[spots.empty.x + i * 12, spots.empty.y + i * 6]]); } await touches('touchEnd', []);
    let after = await snapshot();
    check('Jeden prst po prázdnej ploche posúva plátno', after.x < before.x && after.geometry === before.geometry, `x ${before.x.toFixed(1)} → ${after.x.toFixed(1)}`);
    // One undoable edit to take back: a small move of the coupler.
    await touchPage.view.evaluate(() => { pushHistory(); state.project.elements.find((e) => e.name === 'Spojovacie tiahlo').x += 5; changed(); });
    await pause(450); before = await snapshot();
    await touches('touchStart', [[spots.empty.x, spots.empty.y], [spots.empty.x + 50, spots.empty.y]]); await pause(60); await touches('touchEnd', []);
    after = await snapshot();
    check('Ťuk dvoma prstami vráti krok', after.history === before.history - 1 && after.future === before.future + 1, `história ${before.history} → ${after.history}`);
    await pause(450);
    await touches('touchStart', [[spots.empty.x, spots.empty.y], [spots.empty.x + 40, spots.empty.y], [spots.empty.x + 20, spots.empty.y + 30]]); await pause(60); await touches('touchEnd', []);
    const redone = await snapshot();
    check('Ťuk troma prstami krok zopakuje', redone.history === before.history && redone.future === before.future, `história ${after.history} → ${redone.history}`);
    await pause(450);
    // In geometry editing a tap on the selected body's large edit handles opens the exact edit, so the double tap runs in simulation.
    // The view moved with the one-finger pan, so the coupler is located again.
    const coupler = await touchPage.view.evaluate(() => { setMode('simulate'); selectTarget(null); const m = document.querySelector('#mechanism-canvas').getScreenCTM(), pose = state.result.poses[state.project.elements.find((e) => e.name === 'Spojovacie tiahlo').id], mid = { x: pose.a.x + (pose.b.x - pose.a.x) / 3, y: pose.a.y + (pose.b.y - pose.a.y) / 3 }; return { x: mid.x * m.a + mid.y * m.c + m.e, y: mid.x * m.b + mid.y * m.d + m.f }; });
    for (const offset of [0, 6]) { await touches('touchStart', [[coupler.x + offset, coupler.y + offset / 2]]); await pause(40); await touches('touchEnd', []); await pause(120); }
    after = await snapshot();
    check('Dvojťuk na ramene otvorí hlavnú úpravu', /Vlastnosti prvku/.test(after.dialog), after.dialog || 'dialóg sa neotvoril');
  }
  check('Dotykové gestá bez chýb stránky', !touchPage.errors.length, touchPage.errors.join(' | '));
  await touchPage.view.close();

  // Command palette: real keys open it, search and Enter run a command, ? shows the shortcuts, and every listed command runs.
  {
  const palette = await page(`${origin}/`);
  palette.view.on('dialog', (dialog) => dialog.dismiss().catch(() => {}));
  palette.view.on('download', (download) => download.cancel().catch(() => {}));
  await palette.view.waitForSelector('#workspace', { timeout: 15000 });
  await palette.view.evaluate(() => { const project = Kinematics.validateProject(Kinematics.preset('fourbar')); localStorage.setItem('kinematika.projects.v1', JSON.stringify([project])); localStorage.setItem('kinematika.last.v1', project.id); });
  await palette.view.reload(); await palette.view.waitForSelector('#workspace', { timeout: 15000 });
  await palette.view.click('#mechanism-canvas', { position: { x: 5, y: 5 } }).catch(() => {});
  await palette.view.keyboard.press('Control+k');
  const opened = await palette.view.waitForSelector('#command-search', { timeout: 3000 }).then(() => true, () => false);
  const focused = await palette.view.evaluate(() => document.activeElement?.id === 'command-search');
  await palette.view.keyboard.type('mriez');
  const first = await palette.view.evaluate(() => document.querySelector('.command-item.is-active .command-label')?.textContent);
  const gridBefore = await palette.view.evaluate(() => state.grid);
  await palette.view.keyboard.press('Enter');
  const gridAfter = await palette.view.evaluate(() => ({ grid: state.grid, open: document.querySelector('#modal').open }));
  check('Ctrl + K otvorí paletu, hľadanie a Enter spustí príkaz', opened && focused && /mriežk/i.test(first || '') && gridAfter.grid !== gridBefore && !gridAfter.open, `${first || 'bez výsledku'} · mriežka ${gridBefore} → ${gridAfter.grid}`);
  await palette.view.keyboard.press('Control+k'); await palette.view.waitForSelector('#command-search');
  const name = await palette.view.evaluate(() => state.project.elements.at(-1).name);
  await palette.view.keyboard.type(name); await palette.view.keyboard.press('ArrowDown'); await palette.view.keyboard.press('ArrowUp'); await palette.view.keyboard.press('Enter');
  const selected = await palette.view.evaluate(() => I.target(state.project, state.selectedElementIds.at(-1))?.element?.name);
  check('Paleta vyberie prvok podľa názvu', selected === name, `${name} → ${selected}`);
  await palette.view.keyboard.press('Control+k'); await palette.view.waitForSelector('#command-search'); await palette.view.keyboard.press('Control+k');
  const toggled = await palette.view.evaluate(() => !document.querySelector('#modal').open);
  await palette.view.keyboard.press('Control+k'); await palette.view.waitForSelector('#command-search'); await palette.view.keyboard.type('xyz'); await palette.view.keyboard.press('Escape');
  const escaped = await palette.view.evaluate(() => !document.querySelector('#modal').open);
  await palette.view.click('#mechanism-canvas', { position: { x: 5, y: 5 } }).catch(() => {});
  await palette.view.keyboard.press('?');
  const overview = await palette.view.evaluate(() => ({ open: document.querySelector('#modal').open, groups: document.querySelectorAll('#modal .shortcut-group').length, palette: document.querySelectorAll('#modal kbd').length }));
  check('Druhé Ctrl + K aj Esc paletu zavrie a ? ukáže prehľad skratiek', toggled && escaped && overview.open && overview.groups >= 4, `${overview.groups} skupín, ${overview.palette} skratiek`);
  // Every command listed on a fresh page runs without a page error.
  const total = await palette.view.evaluate(() => collectCommands().length);
  let ran = 0; const broken = [];
  for (let index = 0; index < total; index++) {
    await palette.view.reload(); await palette.view.waitForSelector('#workspace', { timeout: 15000 });
    const before = palette.errors.length;
    const result = await palette.view.evaluate(async (index) => { const command = collectCommands()[index]; if (!command) return null; let error = ''; try { command.run(); } catch (failure) { error = failure.message; } await new Promise((r) => setTimeout(r, 60)); return { label: command.label, error }; }, index);
    if (!result) continue;
    ran++;
    if (result.error || palette.errors.length > before) broken.push(`${result.label} · ${result.error || palette.errors.slice(before).join(' | ')}`);
  }
  for (const problem of broken) console.log(`  ${problem}`);
  check('Každý príkaz palety sa spustí bez chyby', ran > 20 && !broken.length && !palette.errors.length, `${ran} príkazov${palette.errors.length ? ` · ${palette.errors.join(' | ')}` : ''}`);
  await palette.view.close();
  }

  // Performance: a spring, a piston and a pin in a slot together; zoom, playback and dragging with the CPU slowed 4×.
  {
    const perf = await page(`${origin}/`);
    await perf.view.waitForSelector('#workspace', { timeout: 15000 });
    await perf.view.evaluate(`(() => { const project = (${perfModel})(); localStorage.setItem('kinematika.projects.v1', JSON.stringify([project])); localStorage.setItem('kinematika.last.v1', project.id); })()`);
    await perf.view.reload(); await perf.view.waitForSelector('#workspace', { timeout: 15000 });
    await perf.view.evaluate(() => { setMode('simulate'); zoom(1 / 2.5); });
    // Structure: zoom redraws neither bodies nor the swept positions; a rename keeps the 121-position sweep.
    const structure = await perf.view.evaluate(async () => {
      const svg = document.querySelector('#mechanism-canvas'), bodies = () => [...svg.querySelectorAll('.scene-part')].filter((part) => part.querySelector('.mechanism-element'));
      const before = bodies(), ghosts = state.ghostCache?.samples, samples = state.samples;
      let renders = 0; const original = renderScene; window.renderScene = function (...args) { renders++; return original.apply(this, args); };
      const rect = svg.getBoundingClientRect(), wheel = (deltaY) => svg.dispatchEvent(new WheelEvent('wheel', { deltaY, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2, bubbles: true, cancelable: true }));
      for (let i = 0; i < 6; i++) wheel(-40);
      // The gesture is shown as a scaled picture; one sharp redraw follows when it pauses.
      const during = renders; await new Promise((resolve) => setTimeout(resolve, 300));
      window.renderScene = original;
      const after = bodies(), kept = before.filter((part) => after.includes(part)).length;
      pushHistory(); state.project.name += ' 2'; changed();
      return { kept, total: before.length, renders, during, ghostsKept: state.ghostCache?.samples === ghosts, samplesKept: state.samples === samples };
    });
    check('Zoom neprekresľuje telesá a nerieši mechanizmus znova', structure.total > 0 && structure.kept === structure.total && structure.ghostsKept, `${structure.kept}/${structure.total} častí s telesami ponechaných`);
    check('Gesto kolieska sa počas pohybu len zväčšuje a ostro prekreslí raz', structure.during === 0 && structure.renders === 1, `${structure.during} počas gesta, ${structure.renders} po ňom`);
    check('Premenovanie neprepočíta 121 polôh pohybu', structure.samplesKept);
    const wait = (ms) => perf.view.waitForTimeout(ms), cdp = await perf.view.context().newCDPSession(perf.view);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const frames = async (run) => {
      await perf.view.evaluate(() => { window.__frames = []; window.__stop = false; let last = performance.now(); const loop = (t) => { window.__frames.push(t - last); last = t; if (!window.__stop) requestAnimationFrame(loop); }; requestAnimationFrame(loop); });
      await run();
      return perf.view.evaluate(() => { window.__stop = true; const f = window.__frames.slice(2), sorted = [...f].sort((a, b) => a - b), total = f.reduce((a, b) => a + b, 0); return { fps: Math.round(f.length * 1000 / total), p95: Math.round(sorted[Math.floor(sorted.length * .95)]) }; });
    };
    const center = await perf.view.evaluate(() => { const r = document.querySelector('#mechanism-canvas').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await perf.view.mouse.move(center.x, center.y);
    const zoomed = await frames(async () => { for (let i = 0; i < 24; i++) { await perf.view.mouse.wheel(0, i < 12 ? -60 : 60); await wait(16); } });
    const played = await frames(async () => { await perf.view.evaluate(() => actions.play()); await wait(2500); await perf.view.evaluate(() => { if (state.playing) actions.play(); }); });
    const pin = await perf.view.evaluate(() => { const e = state.project.elements.find((e) => e.type === 'bearing'), p = state.result.poses[e.id].a, m = document.querySelector('#mechanism-canvas').getScreenCTM(); return { x: p.x * m.a + p.y * m.c + m.e, y: p.x * m.b + p.y * m.d + m.f }; });
    const dragged = await frames(async () => { await perf.view.mouse.move(pin.x, pin.y); await perf.view.mouse.down(); for (let i = 1; i <= 30; i++) { await perf.view.mouse.move(pin.x + i * 3, pin.y + i); await wait(16); } await perf.view.mouse.up(); });
    // A light pin on a damped spring springing back after release: it used to need ~5000 solver runs per frame.
    await perf.view.evaluate(`(() => { const K = Kinematics, el = (type, extra = {}) => ({ ...K.makeElement(type, 0, 0), ...extra }), joint = (a, ap, b, bp, type = 'revolute') => ({ id: K.uid(), name: 'Väzba', type, a: { elementId: a.id, point: ap }, b: { elementId: b.id, point: bp } });
      const slot = el('slot', { locked: true }), pin = el('bearing'), spring = el('spring-compression');
      let project = K.validateProject({ ...K.preset('custom'), name: 'Návrat pružiny', elements: [slot, pin, spring], connections: [joint(pin, 'a', slot, 'curve', 'point-path'), joint(spring, 'b', pin, 'a'), joint(spring, 'a', slot, 'b')] });
      const path = K.solve(project, 0).poses[slot.id].path, at = path[Math.floor(path.length / 2)]; project.elements[1].x = at.x; project.elements[1].y = at.y;
      replaceProject(K.validateProject(project)); setMode('simulate'); })()`);
    const springPin = await perf.view.evaluate(() => { const e = state.project.elements.find((e) => e.type === 'bearing'), p = state.result.poses[e.id].a, m = document.querySelector('#mechanism-canvas').getScreenCTM(); return { x: p.x * m.a + p.y * m.c + m.e, y: p.x * m.b + p.y * m.d + m.f }; });
    await perf.view.mouse.move(springPin.x, springPin.y); await perf.view.mouse.down();
    for (let i = 1; i <= 20; i++) { await perf.view.mouse.move(springPin.x - i * 4, springPin.y - i * 2); await wait(16); }
    const returned = await frames(async () => { await perf.view.mouse.up(); await wait(1500); });
    const springTime = await perf.view.evaluate(() => state.dynamic?.time || 0);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    check('Návrat pružiny po pustení čapu je plynulý', returned.p95 <= Number(process.env.PERF_P95_MS || 100) && springTime > .1, `${returned.fps} sn./s, p95 ${returned.p95} ms, simulovaný čas ${springTime.toFixed(2)} s za 1,5 s`);
    // Generous limits so a slow CI runner does not fail; before these changes zoom and drag reached 117–150 ms.
    const limit = Number(process.env.PERF_P95_MS || 100), report = (name, r) => `${name} ${r.fps} sn./s, p95 ${r.p95} ms`;
    check('Plynulosť pri 4× pomalšom CPU (pružina, piest, kulisa)', [zoomed, played, dragged].every((r) => r.p95 <= limit), [report('zoom', zoomed), report('prehrávanie', played), report('ťahanie', dragged)].join(' · ') + ` · limit p95 ${limit} ms`);
    check('Výkonnostný test bez chýb stránky', !perf.errors.length, perf.errors.join(' | '));
    await perf.view.close();
  }

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
// Runs in the page: small models whose movable parts a user would try to drag in simulation.
// A spring, a piston and a pin in a curved slot driven by a four-bar: the combination users reported as jerky.
function perfModel() {
  const K = Kinematics, p = K.preset('fourbar');
  const project = K.validateProject({ ...p, kind: 'custom', name: 'Výkon · pružina, piest a kulisa', elements: p.elements.map((e) => ({ ...e, primary: false, locked: e.type === 'ground' })), connections: p.connections.map((c) => ({ ...c, builtin: false, type: 'revolute' })) });
  const el = (type, x, y, extra = {}) => ({ ...K.makeElement(type, x, y), ...extra }), joint = (a, ap, b, bp, type = 'revolute') => ({ id: K.uid(), name: 'Väzba', type, a: { elementId: a.id, point: ap }, b: { elementId: b.id, point: bp } });
  const ground = project.elements.find((e) => e.type === 'ground'), links = project.elements.filter((e) => e.type === 'link'), [rocker, coupler] = [links.at(-1), links[1]];
  const slot = el('slot', ground.x, ground.y + 180), pin = el('bearing', 0, 0), spring = el('spring-compression', 0, 0), piston = el('piston-push', 0, 0);
  project.elements.push(slot, pin, spring, piston);
  project.connections.push(joint(pin, 'a', slot, 'curve', 'point-path'), joint(spring, 'a', slot, 'b'), joint(spring, 'b', pin, 'a'), joint(piston, 'a', ground, 'a'), joint(piston, 'b', coupler, 'b'));
  const path = K.solve(project, 0).poses[slot.id].path, at = path[Math.floor(path.length / 2)]; pin.x = at.x; pin.y = at.y;
  return K.validateProject(project);
}

function dragModels() {
  const K = Kinematics, el = (type, x, y, extra = {}) => ({ ...K.makeElement(type, x, y), ...extra });
  const joint = (a, ap, b, bp, type = 'revolute') => ({ id: K.uid(), name: 'Väzba', type, a: { elementId: a.id, point: ap }, b: { elementId: b.id, point: bp } });
  const model = (name, elements, connections) => { const project = K.validateProject({ ...K.preset('custom'), name, elements, connections }); return { name, project }; };
  const onSlot = (pin, slot, project) => { const path = K.solve(project, 0).poses[slot.id].path, at = path[Math.floor(path.length / 2)]; Object.assign(project.elements.find((e) => e.id === pin.id), { x: at.x, y: at.y }); };
  const list = [];
  { const g = el('ground', 0, 0), l = el('link', 0, 0, { mass: 1, angle: 90 }), s = el('spring-compression', 0, 0); list.push(model('Kyvadlo s pružinou', [g, l, s], [joint(g, 'a', l, 'a'), joint(s, 'a', g, 'b'), joint(s, 'b', l, 'b')])); }
  { const slot = el('slot', 0, 0), pin = el('bearing', 0, 0), m = model('Čap v kulise', [slot, pin], [joint(pin, 'a', slot, 'curve', 'point-path')]); onSlot(pin, slot, m.project); list.push(m); }
  { const slot = el('slot', 0, 0), pin = el('bearing', 0, 0), spring = el('spring-compression', 0, 0), base = el('ground', -300, 0), crank = el('link', -300, 0, { drive: true });
    const m = model('Čap v kulise s pružinou a samostatným pohonom', [slot, pin, spring, base, crank], [joint(pin, 'a', slot, 'curve', 'point-path'), joint(spring, 'b', pin, 'a'), joint(spring, 'a', slot, 'b'), joint(base, 'a', crank, 'a')]); onSlot(pin, slot, m.project); list.push(m); }
  { const base = el('ground', 0, 0), crank = el('link', 0, 0, { drive: true }), loose = el('link', 250, 80); list.push(model('Voľné teleso vedľa pohonu', [base, crank, loose], [joint(base, 'a', crank, 'a')])); }
  { const p = K.preset('fourbar'); list.push({ name: 'Štvorkĺb', project: K.validateProject({ ...p, kind: 'custom', elements: p.elements.map((e) => ({ ...e, primary: false, locked: e.type === 'ground' })), connections: p.connections.map((c) => ({ ...c, builtin: false, type: 'revolute' })) }) }); }
  return list.map(({ name, project }) => ({ name, json: JSON.stringify(project), parts: project.elements.filter((e) => !e.locked && !['ground', 'slot', 'rail'].includes(e.type)).map((e) => e.id) }));
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
      if (item.shortcut && KinmoI18n.missing(item.shortcut, 'en').some((part) => /\p{Ll}/u.test(part))) problems.push(`${name}: nepreložená skratka „${item.shortcut}“`);
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
