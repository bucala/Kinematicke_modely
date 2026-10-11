import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, copyFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fusionArchive } from '../scripts/archive.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pdfDistributions = [
  ['pdfmake.min.js', 'c2fd3a5e24db096c9139bb7d266765de433b0b866d03ba356c2ef4d9ae1a53b7'],
  ['vfs_fonts.js', 'f91db5690400fc851536c3a9322f822619f8e9f681abe42013e572d88d3c1f38'],
];
const source = await readFile(path.join(root, 'cad.js'), 'utf8');
const mockKey = 'mock-pairing-value-not-a-real-key';
const job = '1234567890abcdef1234567890abcdef';
const cad = (responses, protocol = 'https:', extra = {}) => {
  const calls = [];
  const context = vm.createContext({
    location: { protocol }, AbortController, TypeError,
    setTimeout: (callback, ms) => ms === 500 ? setTimeout(callback, 0) : setTimeout(callback, ms),
    clearTimeout,
    fetch: async (url, options) => {
      calls.push({ url, options });
      const response = responses.shift();
      if (response instanceof Error) throw response;
      if (!response) throw new Error('Unexpected mock request.');
      return { ok: response.ok !== false, status: response.status || 200, json: async () => response.body };
    },
    ...extra,
  });
  vm.runInContext(source, context);
  return { api: context.KinmoCad, calls };
};
const ready = () => ({ body: { app: 'KinmoFusion', version: 1, referenceOnly: true } });

test('CAD module does not connect or send on load', () => {
  const { calls } = cad([]); assert.equal(calls.length, 0);
});
test('CAD status is a read with a bounded loopback endpoint', async () => {
  const { api, calls } = cad([ready()]);
  await api.status(mockKey);
  assert.equal(calls.length, 1); assert.equal(calls[0].url, 'http://127.0.0.1:8765/status');
  assert.equal(calls[0].options.method, 'GET'); assert.equal(calls[0].options.credentials, 'omit');
  assert.equal(calls[0].options.redirect, 'error'); assert.equal(calls[0].options.cache, 'no-store');
  assert.equal(calls[0].options.mode, 'cors'); assert(!('body' in calls[0].options));
});
test('CAD pairing values are required and file origins are rejected', async () => {
  for (const key of ['', 'short', 'x'.repeat(101), mockKey + '\r\nbad']) {
    const { api, calls } = cad([]); await assert.rejects(api.status(key)); assert.equal(calls.length, 0);
  }
  const { api, calls } = cad([], 'file:'); await assert.rejects(api.status(mockKey), /file:\/\//); assert.equal(calls.length, 0);
});
test('CAD checks the local service identity', async () => {
  const { api } = cad([{ body: { app: 'Other', version: 1, referenceOnly: false } }]);
  await assert.rejects(api.status(mockKey), /KinmoFusion/);
});
test('CAD exposes origin and authorization failures without leaking a key', async () => {
  const { api } = cad([{ ok: false, status: 401 }]);
  await assert.rejects(api.status(mockKey), (error) => error.message.includes('401') && !error.message.includes(mockKey));
});
test('CAD gives a usable local network error', async () => {
  const { api } = cad([new TypeError('Failed to fetch')]);
  await assert.rejects(api.status(mockKey), /lokálnu sieť/);
});
test('CAD sends only through explicit send and waits for main-thread completion', async () => {
  const { api, calls } = cad([ready(), { body: { job } }, { body: { state: 'pending' } }, { body: { state: 'done' } }]);
  const snapshot = { format: 'KINMO-CAD', version: 1, units: 'mm', referenceOnly: true, entities: [] }, progress = [];
  const result = await api.send(snapshot, mockKey, (message) => progress.push(message));
  assert.equal(result.state, 'done'); assert.equal(calls.length, 4);
  assert.equal(calls[1].options.method, 'POST'); assert.deepEqual(JSON.parse(calls[1].options.body), snapshot);
  assert.equal(calls[1].options.headers['Content-Type'], 'application/json');
  assert.equal(calls[2].url, `http://127.0.0.1:8765/jobs/${job}`); assert.equal(progress.length, 1);
});
test('CAD rejects invalid job identifiers before polling', async () => {
  const { api, calls } = cad([ready(), { body: { job: '../arbitrary-path' } }]);
  await assert.rejects(api.send({}, mockKey), /identifikátor/); assert.equal(calls.length, 2);
});
test('CAD reports import errors as partial NEW documents', async () => {
  const { api } = cad([ready(), { body: { job } }, { body: { state: 'error', message: 'untrusted details' } }]);
  await assert.rejects(api.send({}, mockKey), /neúplný nový dokument/);
});
test('CAD polling times out without sending a second snapshot', async () => {
  let tick = 0;
  const { api, calls } = cad([ready(), { body: { job } }], 'https:', { Date: { now: () => (tick++ ? 61000 : 0) } });
  await assert.rejects(api.send({}, mockKey), /pred ďalším odoslaním/); assert.equal(calls.length, 2);
});
test('Fusion ZIP is deterministic and contains only the four public add-in files', async () => {
  const bytes = await fusionArchive(root); assert.deepEqual(bytes, await fusionArchive(root));
  assert.equal(bytes.readUInt32LE(0), 0x04034b50);
  const names = []; let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    assert.equal(bytes.readUInt16LE(offset + 8), 0);
    const size = bytes.readUInt32LE(offset + 18), length = bytes.readUInt16LE(offset + 26), extra = bytes.readUInt16LE(offset + 28);
    names.push(bytes.subarray(offset + 30, offset + 30 + length).toString('utf8'));
    offset += 30 + length + extra + size;
  }
  assert.equal(bytes.readUInt32LE(offset), 0x02014b50);
  assert.deepEqual(names, ['KinmoFusion/KinmoFusion.py', 'KinmoFusion/KinmoFusion.manifest', 'KinmoFusion/bridge.py', 'KinmoFusion/README.md']);
  assert.equal(bytes.readUInt32LE(bytes.length - 22), 0x06054b50);
  assert.equal(bytes.readUInt16LE(bytes.length - 12), 4);
});
test('Offline PDF distribution matches the recorded upstream hashes', async () => {
  for (const [name, hash] of pdfDistributions) assert.equal(createHash('sha256').update(await readFile(path.join(root, 'vendor/pdfmake', name))).digest('hex'), hash, name);
  assert((await readFile(path.join(root, 'vendor/pdfmake/LICENSE'), 'utf8')).includes('MIT'));
  assert((await readFile(path.join(root, 'vendor/pdfmake/Roboto-LICENSE.txt'), 'utf8')).includes('SIL OPEN FONT LICENSE'));
});
test('Git preserves pinned PDF bytes when staging and checking out on any newline policy', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'kinmo-pdf-checkout-'));
  const git = (cwd, args) => execFileSync('git', args, { cwd, maxBuffer: 5 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    for (const autocrlf of ['true', 'input', 'false']) {
      const repository = path.join(directory, autocrlf), checkout = path.join(directory, `${autocrlf}-checkout`);
      await mkdir(path.join(repository, 'vendor/pdfmake'), { recursive: true });
      await copyFile(path.join(root, '.gitattributes'), path.join(repository, '.gitattributes'));
      for (const [name] of pdfDistributions) await copyFile(path.join(root, 'vendor/pdfmake', name), path.join(repository, 'vendor/pdfmake', name));
      git(repository, ['init', '--quiet']);
      const policy = ['-c', `core.autocrlf=${autocrlf}`];
      git(repository, [...policy, 'add', '--', '.gitattributes', ...pdfDistributions.map(([name]) => `vendor/pdfmake/${name}`)]);
      const prefix = checkout.replace(/\\/g, '/') + '/';
      git(repository, [...policy, 'checkout-index', '--all', `--prefix=${prefix}`]);
      for (const [name, hash] of pdfDistributions) {
        const staged = git(repository, ['show', `:vendor/pdfmake/${name}`]);
        const checkedOut = await readFile(path.join(checkout, 'vendor/pdfmake', name));
        for (const bytes of [staged, checkedOut]) assert.equal(createHash('sha256').update(bytes).digest('hex'), hash, `${name}, core.autocrlf=${autocrlf}`);
      }
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('Publisher includes the PDF newline policy and changelog in its explicit file allowlist', async () => {
  const publisher = await readFile(path.join(root, 'push-github.ps1'), 'utf8');
  const files = publisher.match(/\$ProjectFiles = @\(([\s\S]*?)\n\)/)?.[1];
  assert(files); assert.match(files, /^\s*'\.gitattributes'\s*$/m);
  assert.match(files, /^\s*'CHANGELOG\.md'\s*$/m);
  const readme = await readFile(path.join(root, 'README.md'), 'utf8'), changelog = await readFile(path.join(root, 'CHANGELOG.md'), 'utf8');
  assert(readme.includes('(CHANGELOG.md)')); assert(changelog.includes('Magic import') && changelog.includes('5e985fd'));
  assert((await readFile(path.join(root, 'cad/KinmoFusion/README.md'), 'utf8')).includes('## História zmien'));
});
test('Production policy allows only the specific loopback CAD endpoint', async () => {
  const headers = await readFile(path.join(root, '_headers'), 'utf8');
  assert(headers.includes("connect-src 'self' http://127.0.0.1:8765;"));
  assert(!headers.includes('connect-src *') && !headers.includes("'unsafe-eval'"));
});
test('Manifest requires a manual add-in start', async () => {
  const value = JSON.parse(await readFile(path.join(root, 'cad/KinmoFusion/KinmoFusion.manifest'), 'utf8'));
  assert.equal(value.type, 'addin'); assert.equal(value.runOnStartup, false);
});
test('Canvas modules and regression cases are in the public build and explicit publisher', async () => {
  const html = await readFile(path.join(root, 'index.html'), 'utf8'), build = await readFile(path.join(root, 'scripts/build.mjs'), 'utf8');
  const server = await readFile(path.join(root, 'scripts/server.mjs'), 'utf8'), publisher = await readFile(path.join(root, 'push-github.ps1'), 'utf8');
  for (const file of ['interaction.js', 'workbench.js', 'magic-import.js', 'context-menu.js', 'slot-outline.js', 'scene-export.js', 'gif-export.js']) {
    assert(html.includes(`src="./${file}"`)); assert(build.includes(`'${file}'`)); assert(server.includes(`'${file}'`)); assert(publisher.includes(`'${file}'`));
  }
  assert(html.indexOf('src="./editor.js"') < html.indexOf('src="./interaction.js"') && html.indexOf('src="./context-menu.js"') < html.indexOf('src="./app.js"'));
  assert(html.indexOf('src="./slot-outline.js"') < html.indexOf('src="./exports.js"'));
  assert(html.indexOf('src="./magic-import.js"') > html.indexOf('src="./engine.js"') && html.indexOf('src="./magic-import.js"') < html.indexOf('src="./app.js"'));
  const accept = html.match(/id="magic-image-file"[^>]*accept="([^"]+)"/)?.[1];
  assert.deepEqual(accept?.split(','), ['image/png', 'image/jpeg', 'image/webp', '.png', '.jpg', '.jpeg', '.webp']);
  for (const file of ['tests/interaction-cases.js', 'tests/workbench-cases.js', 'tests/magic-import-cases.js', 'tests/gif-decoder.js', 'tests/gif-cases.js']) {
    assert(server.includes(`'${file}'`)); assert(publisher.includes(`'${file}'`));
  }
});
