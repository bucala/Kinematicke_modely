import { spawn } from 'node:child_process';
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
} finally {
  await browser.close();
  server.kill();
}
if (failures.length) { console.error(`\n${failures.length} kontrol zlyhalo.`); process.exit(1); }
console.log('\nVšetky kontroly v prehliadači prešli.');
