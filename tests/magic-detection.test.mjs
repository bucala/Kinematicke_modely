import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import '../magic-detection.js';

const D = globalThis.KinmoDetection;
const raster = (width = 240, height = 180) => {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  const pixel = (x, y, color) => data.set([...color, 255], (y * width + x) * 4);
  const rect = (x, y, w, h, color = [0, 0, 0]) => {
    for (let cy = y; cy < y + h; cy++) for (let cx = x; cx < x + w; cx++) pixel(cx, cy, color);
  };
  return { width, height, data, pixel, rect };
};
test('Offline detection extracts colored members, a frame and a round node', () => {
  const image = raster();
  image.rect(20, 20, 180, 4, [10, 150, 50]); image.rect(20, 20, 4, 120, [10, 150, 50]); image.rect(196, 20, 4, 90, [10, 150, 50]);
  image.rect(50, 75, 110, 8, [40, 90, 180]); image.rect(180, 115, 10, 45, [210, 20, 40]);
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) if (Math.hypot(x - 45, y - 150) < 7 && Math.hypot(x - 45, y - 150) > 3) image.pixel(x, y, [200, 110, 20]);
  const before = image.data.slice(), result = D.detectPixels(image);
  for (const type of ['ground', 'link', 'panel', 'bearing']) assert(result.candidates.some((c) => c.type === type), type);
  const frame = result.candidates.filter((c) => c.type === 'ground');
  assert.equal(frame.length, 1); assert(frame[0].outline.length >= 8);
  assert(result.candidates.every((c) => c.points.every((p) => p.x >= 0 && p.x < image.width && p.y >= 0 && p.y < image.height)));
  assert.deepEqual(image.data, before); assert.match(result.note, /neurčuje pohon/);
});
test('Slanted links stay links rather than being mistaken for hollow guides', () => {
  const image = raster();
  for (let y = 30; y < 130; y++) for (let x = 30; x < 150; x++) {
    if (Math.abs(y - x + 10) < 4 && x >= 40 && x <= 130) image.pixel(x, y, [35, 85, 180]);
  }
  const link = D.detectPixels(image).candidates.find((c) => c.type === 'link');
  assert(link); assert(Math.abs(link.points[1].y - link.points[0].y) > 60);
});
test('Contour geometry does not change when a member changes color or has gradual shading', () => {
  const signatures = [];
  for (const color of [[40, 90, 180], [80, 80, 80], [180, 40, 60]]) {
    const image = raster(); image.rect(25, 60, 170, 12, color);
    const result = D.detectPixels(image);
    assert.equal(result.method, 'contours');
    signatures.push(result.candidates.map((c) => ({ type: c.type, points: c.points, outline: c.outline })));
  }
  assert.deepEqual(signatures[0], signatures[1]); assert.deepEqual(signatures[0], signatures[2]);
  const image = raster();
  for (let x = 25; x < 195; x++) image.rect(x, 60, 1, 12, [60 + Math.floor((x - 25) / 2), 60 + Math.floor((x - 25) / 2), 60 + Math.floor((x - 25) / 2)]);
  const main = D.detectPixels(image).candidates.find((c) => c.type === 'link');
  assert(main && main.outline.length >= 4); assert(Math.abs(main.points[1].x - main.points[0].x) > 150);
  const twoTone = raster(); twoTone.rect(25, 60, 85, 12, [40, 90, 180]); twoTone.rect(110, 60, 85, 12, [180, 40, 60]);
  const members = D.detectPixels(twoTone).candidates.filter((c) => c.points.length > 1);
  assert.equal(members.length, 1); assert(Math.abs(members[0].points[1].x - members[0].points[0].x) > 160);
});
test('Hollow outlined members keep their outer contour instead of becoming several edge strips', () => {
  const image = raster(); image.rect(25, 55, 170, 22); image.rect(28, 58, 164, 16, [255, 255, 255]);
  const result = D.detectPixels(image), bodies = result.candidates.filter((c) => c.points.length > 1);
  assert.equal(bodies.length, 1);
  assert(bodies[0].outline?.length >= 4); assert.equal(bodies[0].geometry, 'contour');
  assert(Math.abs(bodies[0].points[1].x - bodies[0].points[0].x) > 155);
});
test('A curved strip yields an ordered continuous centerline rather than a straight colored chord', () => {
  const image = raster();
  for (let x = 25; x <= 200; x++) {
    const y = 65 + 34 * Math.sin((x - 25) / 175 * Math.PI / 2);
    image.rect(x, Math.round(y) - 3, 1, 7, [80, 80, 80]);
  }
  const result = D.detectPixels(image), curve = result.candidates.find((c) => c.type === 'slot');
  assert(curve && curve.points.length >= 4);
  for (let i = 1; i < curve.points.length; i++) assert(Math.hypot(curve.points[i].x - curve.points[i - 1].x, curve.points[i].y - curve.points[i - 1].y) < 30);
  assert(curve.evidence.continuity > .85);
});
test('Touching branched members are not preselected as a confident mechanical part', () => {
  const image = raster();
  for (let x = 30; x < 200; x++) {
    image.rect(x, Math.round(30 + (x - 30) * .6), 1, 5, [80, 80, 80]);
    image.rect(x, Math.round(130 - (x - 30) * .6), 1, 5, [40, 90, 180]);
  }
  const result = D.detectPixels(image);
  assert(result.candidates.length > 0); assert(result.candidates.every((c) => !c.selected));
  assert(result.candidates.some((c) => c.evidence.branched));
});
test('A broad thin semicircular strip keeps the continuous curved path rather than becoming a panel', () => {
  const image = raster();
  for (let i = 0; i <= 320; i++) {
    const angle = Math.PI * i / 320;
    image.rect(Math.round(120 + 65 * Math.cos(angle)) - 2, Math.round(90 - 65 * Math.sin(angle)) - 2, 5, 5, [80, 80, 80]);
  }
  const curve = D.detectPixels(image).candidates.find((c) => c.type === 'slot');
  assert(curve && curve.selected && curve.points.length <= 64 && curve.evidence.continuity >= .85);
  assert(Math.max(...curve.points.map((p) => p.y)) - Math.min(...curve.points.map((p) => p.y)) > 40);
});
test('Blank and transparent backgrounds do not manufacture mechanism geometry', () => {
  assert.equal(D.detectPixels(raster()).candidates.length, 0);
  const transparent = raster(); transparent.data.fill(0);
  assert.equal(D.detectPixels(transparent).candidates.length, 0);
});
test('Pixel allocation, type and sensitivity are bounded before detection', () => {
  for (const input of [{ width: 769, height: 1, data: new Uint8ClampedArray(3076) }, { width: 240, height: 180, data: new Uint8Array(172800) }, { ...raster(), height: NaN }, { ...raster(), data: new Uint8ClampedArray(4) }]) assert.throws(() => D.detectPixels(input));
  for (const sensitivity of [0, 91, NaN, Infinity]) assert.throws(() => D.detectPixels(raster(), { sensitivity }));
});
test('Candidate count and IDs remain bounded on a noisy many-member image', () => {
  const image = raster(768, 768);
  for (let y = 20; y < 750; y += 14) for (let x = 20; x < 730; x += 100) image.rect(x, y, 60, 4, [20, 90, 180]);
  const result = D.detectPixels(image);
  assert.equal(result.candidates.length, 60); assert(result.limited);
  assert.equal(new Set(result.candidates.map((c) => c.id)).size, 60);
});

const source = await readFile(new URL('../magic-detection.js', import.meta.url), 'utf8');
const loader = (outcome = 'load') => {
  const canvases = [], images = [], timers = new Map();
  class Image {
    constructor() { images.push(this); }
    set src(value) { this.source = value; if (value && outcome !== 'stalled') queueMicrotask(() => outcome === 'error' ? this.onerror?.() : this.onload?.()); }
  }
  const context = vm.createContext({
    Image, Uint8ClampedArray, Uint8Array, Uint32Array, Set,
    setTimeout(fn, ms) { if (ms === 0) queueMicrotask(fn); else timers.set(1, fn); return ms === 0 ? 2 : 1; },
    clearTimeout(id) { timers.delete(id); },
    document: { createElement() {
      const canvas = { getContext: () => ({ fillRect() {}, drawImage() {}, getImageData(x, y, w, h) { return raster(w, h); } }) };
      canvases.push(canvas); return canvas;
    } },
  });
  vm.runInContext(source, context);
  return { api: context.KinmoDetection, canvases, images, timers };
};
test('Image detection accepts only local rasters and releases the private canvas', async () => {
  const fixture = loader(), { api, canvases, images, timers } = fixture;
  for (const url of ['https://example.com/sketch.png', 'data:image/png,x', 'file:///sketch.png']) await assert.rejects(api.detectImage({ url, width: 100, height: 100 }));
  assert.equal(canvases.length, 0);
  const result = await api.detectImage({ url: 'blob:local-sketch', width: 1600, height: 1200 });
  assert.equal(result.candidates.length, 0); assert.equal(canvases[0].width, 0); assert.equal(canvases[0].height, 0);
  assert.equal(images[0].source, ''); assert.equal(timers.size, 0);
  assert(!/\bfetch\s*\(|XMLHttpRequest|eval\s*\(/.test(source));
});
test('Abort, stalled decoding and image errors release resources without revoking the borrowed photo', async () => {
  for (const outcome of ['abort', 'timeout', 'error']) {
    const { api, canvases, images, timers } = loader(outcome === 'error' ? 'error' : 'stalled'), controller = new AbortController();
    const pending = api.detectImage({ url: 'blob:local-sketch', width: 200, height: 100 }, { signal: controller.signal });
    if (outcome === 'abort') controller.abort(); else if (outcome === 'timeout') timers.get(1)();
    await assert.rejects(pending);
    assert.equal(canvases[0].width, 0); assert.equal(images[0].source, ''); assert.equal(timers.size, 0);
  }
  const { api, canvases } = loader(), controller = new AbortController(); controller.abort();
  await assert.rejects(api.detectImage({ url: 'blob:local-sketch', width: 200, height: 100 }, { signal: controller.signal }));
  assert.equal(canvases.length, 0);
});
