import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import '../engine.js';

const source = await readFile(new URL('../magic-import.js', import.meta.url), 'utf8');
// These headers exercise validation, not a replacement image decoder.
const png = (width = 800, height = 600) => {
  const bytes = new Uint8Array(45), view = new DataView(bytes.buffer);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]); view.setUint32(8, 13);
  bytes.set([73, 72, 68, 82], 12); view.setUint32(16, width); view.setUint32(20, height); bytes.set([73, 69, 78, 68], 37);
  return bytes;
};
const file = (bytes = png(), type = 'image/png') => ({ name: 'Hand drawn.png', size: bytes.length, type, arrayBuffer: async () => bytes.buffer });
const loader = (outcome = 'load', dimensions = [800, 600]) => {
  const images = [], created = [], revoked = [], timers = new Map(), cleared = [];
  class Image {
    constructor() { images.push(this); [this.naturalWidth, this.naturalHeight] = dimensions; }
    set src(value) {
      this.source = value;
      if (value && outcome !== 'timeout') queueMicrotask(() => { if (outcome === 'load') this.onload?.(); else this.onerror?.(); });
    }
  }
  const context = vm.createContext({
    Kinematics: globalThis.Kinematics, Image, Uint8Array, DataView, Blob,
    URL: { createObjectURL(blob) { created.push(blob); return 'blob:owned-fixture'; }, revokeObjectURL(url) { revoked.push(url); } },
    setTimeout(callback, milliseconds) { timers.set(1, { callback, milliseconds }); return 1; },
    clearTimeout(id) { cleared.push(id); timers.delete(id); },
  });
  vm.runInContext(source, context);
  return { api: context.KinmoMagicImport, images, created, revoked, timers, cleared };
};

test('Raster loading is inert until explicitly requested and uses only a local blob', async () => {
  const { api, images, created, revoked, timers, cleared } = loader();
  assert.equal(created.length, 0); assert.equal(images.length, 0);
  const result = await api.loadImage(file());
  assert.equal(result.url, 'blob:owned-fixture'); assert.equal(result.width, 800); assert.equal(result.height, 600);
  assert.equal(result.name, 'Hand drawn.png'); assert.equal(created.length, 1); assert.equal(created[0].type, 'image/png');
  assert.equal(revoked.length, 0); assert.equal(timers.size, 0); assert.deepEqual(cleared, [1]);
  assert.equal(images[0].onload, null); assert.equal(images[0].onerror, null);
  assert(!/\bfetch\s*\(|XMLHttpRequest|localStorage|FileReader|eval\s*\(/.test(source));
});
test('Raster validation runs before object URLs or image decoding', async () => {
  const { api, created, images } = loader();
  await assert.rejects(api.loadImage(file(png(8193, 10))), /8192/);
  await assert.rejects(api.loadImage(file(png(), 'image/jpeg')), /nezodpovedá/);
  await assert.rejects(api.loadImage(file(new TextEncoder().encode('<svg>not a raster</svg>'))), /formát/);
  await assert.rejects(api.loadImage({ size: api.limits.bytes + 1, type: 'image/png' }), /10 MB/);
  assert.equal(created.length, 0); assert.equal(images.length, 0);
});
test('Image decode errors release the blob and remove event handlers', async () => {
  const { api, created, revoked, images, timers } = loader('error');
  await assert.rejects(api.loadImage(file()), /nedá otvoriť/);
  assert.equal(created.length, 1); assert.deepEqual(revoked, ['blob:owned-fixture']); assert.equal(timers.size, 0);
  assert.equal(images[0].source, ''); assert.equal(images[0].onload, null); assert.equal(images[0].onerror, null);
});
test('Decoded dimensions are checked even when the raster header is small', async () => {
  const { api, revoked, images } = loader('load', [4001, 4000]);
  await assert.rejects(api.loadImage(file()), /16 miliónov/);
  assert.deepEqual(revoked, ['blob:owned-fixture']); assert.equal(images[0].source, '');
});
test('Image orientation may swap decoded dimensions without changing the Y-down convention', async () => {
  const { api } = loader('load', [600, 800]), result = await api.loadImage(file());
  assert.equal(result.width, 600); assert.equal(result.height, 800);
  const scale = api.calibration(result, { x: 10, y: 10 }, { x: 210, y: 10 }, 100);
  assert.equal(api.worldFromPixel({ x: 10, y: 110 }, scale).y, 50);
});
test('A stalled image decode has a bounded 15-second timeout and releases its blob', async () => {
  const { api, timers, revoked, images } = loader('timeout'), pending = api.loadImage(file());
  await new Promise(setImmediate);
  assert.equal(timers.get(1).milliseconds, 15000); timers.get(1).callback();
  await assert.rejects(pending, /príliš dlho/);
  assert.deepEqual(revoked, ['blob:owned-fixture']); assert.equal(images[0].source, '');
});
test('An unavailable decoder does not allocate a temporary object URL', async () => {
  let created = false;
  const context = vm.createContext({
    Kinematics: globalThis.Kinematics, Uint8Array, DataView, Blob,
    Image: class { constructor() { throw new Error('No decoder'); } },
    URL: { createObjectURL() { created = true; } },
  });
  vm.runInContext(source, context);
  await assert.rejects(context.KinmoMagicImport.loadImage(file()), /No decoder/); assert(!created);
});
