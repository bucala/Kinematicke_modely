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
