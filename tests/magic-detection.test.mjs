import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import '../engine.js';
import '../editor.js';
import '../interaction.js';
import '../magic-import.js';
import '../exports.js';
import '../magic-detection.js';

const D = globalThis.KinmoDetection;
test('Translucent JPEG keeps four main circular features and broad bent plates without square or wedge pins', async () => {
  const bytes = gunzipSync(await readFile(new URL('./fixtures/translucent-mechanism-768x429.rgba.gz', import.meta.url)));
  assert.equal(bytes.length, 768 * 429 * 4);
  const image = { width: 768, height: 429, data: new Uint8ClampedArray(bytes) };
  const result = D.detectPixels(image), pins = result.candidates.filter((c) => c.type === 'bearing');
  for (const at of [{ x: 164, y: 254 }, { x: 491, y: 276 }, { x: 481, y: 336 }, { x: 696, y: 254 }]) {
    assert(pins.some((c) => Math.hypot(c.points[0].x - at.x, c.points[0].y - at.y) < 2), `missing circular feature ${JSON.stringify(at)}`);
  }
  assert.equal(pins.length, 4, 'green block and white wedge must not create extra bearings');
  const upperPlate = result.candidates.find((c) => c.outline.some((p) => p.x > 590 && p.y < 60));
  assert(upperPlate && upperPlate.type === 'panel' && !upperPlate.selected, 'bent filled plate is not a hollow rail');
  assert(!result.limited);
  const scale = KinmoMagicImport.calibration(image, { x: 0, y: 0 }, { x: 768, y: 0 }, 1000);
  const project = KinmoMagicImport.applyDetected(Kinematics.preset('custom'), image, scale, result.candidates.map((c) => ({ ...c, selected: true })), { connections: false }).project;
  const restored = KinmoExport.parseNative(KinmoExport.serializeNative(project)).project;
  assert.equal(restored.elements.length, project.elements.length);
  assert.equal(restored.connections.length, 0);
  assert(!restored.elements.some((e) => e.drive));
});

test('Supplied colored JPEG preserves pins, plates and cavities without turning the base into a guide', async () => {
  const bytes = gunzipSync(await readFile(new URL('./fixtures/colored-mechanism-768x573.rgba.gz', import.meta.url)));
  assert.equal(bytes.length, 768 * 573 * 4);
  const image = { width: 768, height: 573, data: new Uint8ClampedArray(bytes) };
  const result = D.detectPixels(image);
  for (const at of [{ x: 259, y: 483 }, { x: 620, y: 403 }, { x: 649, y: 434 }]) {
    assert(result.candidates.some((c) => c.type === 'bearing' && Math.hypot(c.points[0].x - at.x, c.points[0].y - at.y) < 2), `missing pin ${JSON.stringify(at)}`);
  }
  const base = result.candidates.find((c) => c.outline.some((p) => p.y > 550) && c.outline.some((p) => p.x < 30));
  assert(base && base.type === 'panel' && !base.selected, 'base and upright need one reviewable body silhouette');
  assert(!result.candidates.some((c) => c.type === 'slot' && c.points.some((p) => p.y > 520)), 'the base is not a guide path');
  assert(result.candidates.some((c) => c.type === 'link' && c.points.some((p) => p.x < 270) && c.points.some((p) => p.x > 640) && c.anchors.length >= 2), 'blue member keeps its visible extent and mounting points');
  assert(result.candidates.some((c) => c.type === 'panel' && c.outline.some((p) => p.x > 680 && p.y < 290)), 'red plate must survive deduplication');
  assert.equal(result.candidates.filter((c) => c.type === 'ground' && c.outline.some((p) => p.y < 60)).length, 1, 'one green frame silhouette, without a nested fill duplicate');
  assert(!result.candidates.some((c) => c.type === 'slot' && c.points.some((p) => p.y < 300)), 'hollow frame interiors must not become extra guides');
  assert(result.candidates.some((c) => c.type === 'slot' && c.evidence.cavity && c.points.every((p) => p.x > 140 && p.x < 235 && Math.abs(p.y - 483) < 3)), 'horizontal cavity has an editable path');
  assert(result.candidates.length < 26, 'reduce the original 26 competing proposals while retaining the asserted features');
  assert(!result.limited);
  assert.deepEqual(image.data, new Uint8ClampedArray(bytes), 'detection does not mutate the input');
  const scale = KinmoMagicImport.calibration(image, { x: 0, y: 0 }, { x: 768, y: 0 }, 500);
  const imported = KinmoMagicImport.applyDetected(Kinematics.preset('custom'), image, scale, result.candidates.map((c) => ({ ...c, selected: true })), { connections: true }).project;
  assert(!imported.elements.some((e) => e.drive));
  const restored = KinmoExport.parseNative(KinmoExport.serializeNative(imported)).project;
  assert.equal(restored.elements.length, imported.elements.length);
  assert.equal(restored.connections.length, imported.connections.length);
});

test('Kinka JPEG retains visible pin locations and broad bent silhouettes as reviewable plates', async () => {
  const bytes = gunzipSync(await readFile(new URL('./fixtures/kinka-768x429.rgba.gz', import.meta.url)));
  assert.equal(bytes.length, 768 * 429 * 4);
  const result = D.detectPixels({ width: 768, height: 429, data: new Uint8ClampedArray(bytes) });
  for (const at of [{ x: 164, y: 254 }, { x: 491, y: 276 }, { x: 481, y: 336 }, { x: 696, y: 254 }]) {
    assert(result.candidates.some((c) => c.type === 'bearing' && Math.hypot(c.points[0].x - at.x, c.points[0].y - at.y) < 2), `missing visible circular feature ${JSON.stringify(at)}`);
  }
  const plate = result.candidates.find((c) => c.type === 'panel' && c.evidence.closedRegion && c.anchors?.some((p) => Math.hypot(p.x - 164, p.y - 254) < 2) && c.anchors?.some((p) => Math.hypot(p.x - 491, p.y - 276) < 2));
  assert(plate && plate.outline.length >= 8 && !plate.selected, 'the broad silhouette and its mounting points need review');
  assert(result.candidates.filter((c) => c.type === 'slot').every((c) => c.evidence.widthRatio <= .1));
  assert(!result.candidates.some((c) => c.points.length === 2 && !c.outline.length && c.width <= 1.5 && (c.evidence.edgePartition || c.evidence.closedRegion)), 'secondary one-pixel partitions are edge artifacts');
  const image = { width: 768, height: 429 }, scale = KinmoMagicImport.calibration(image, { x: 0, y: 0 }, { x: 768, y: 0 }, 500);
  const imported = KinmoMagicImport.applyDetected(Kinematics.preset('custom'), image, scale, result.candidates.map((c) => ({ ...c, selected: true })), { connections: true }).project;
  assert(imported.elements.length > result.candidates.length, 'actual mounting points must be inserted');
  assert(!imported.elements.some((e) => e.drive), 'a picture does not establish a driver');
  const restored = KinmoExport.parseNative(KinmoExport.serializeNative(imported)).project;
  assert.equal(restored.elements.length, imported.elements.length);
  assert.equal(restored.connections.length, imported.connections.length);
});
const raster = (width = 240, height = 180) => {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  const pixel = (x, y, color) => data.set([...color, 255], (y * width + x) * 4);
  const rect = (x, y, w, h, color = [0, 0, 0]) => {
    for (let cy = y; cy < y + h; cy++) for (let cx = x; cx < x + w; cx++) pixel(cx, cy, color);
  };
  return { width, height, data, pixel, rect };
};
test('Solid squares and square holes are not circular mounting features', () => {
  const image = raster();
  image.rect(25, 35, 30, 30, [20, 100, 50]);
  image.rect(100, 35, 35, 35); image.rect(104, 39, 27, 27, [255, 255, 255]);
  assert(!D.detectPixels(image).candidates.some((c) => c.type === 'bearing'));
});
test('Noise suppression preserves thin high-contrast lines', () => {
  const image = raster();
  image.rect(20, 40, 180, 1);
  assert(D.detectPixels(image).candidates.some((c) => c.points.length === 2 && Math.abs(c.points[1].x - c.points[0].x) > 170));
});
test('A straight body with a local upright keeps its contour rather than a false curved centreline', () => {
  const image = raster();
  image.rect(15, 130, 210, 20); image.rect(75, 95, 12, 35);
  const result = D.detectPixels(image);
  assert(!result.candidates.some((c) => c.type === 'slot'));
  assert(result.candidates.some((c) => c.outline.length >= 6 && !c.selected));
});
// A schematic fixture inspired by the supplied Kinka illustration, not its JPEG bytes.
function mountingSketch(grayscale = false) {
  const image = raster(480, 300);
  const paint = (color) => grayscale ? [color[0], color[0], color[0]] : color;
  const polygon = (points, fill) => {
    for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
      let inside = false, boundary = Infinity;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const a = points[i], b = points[j];
        if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
        const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)));
        boundary = Math.min(boundary, Math.hypot(x - a.x - dx * t, y - a.y - dy * t));
      }
      if (boundary <= 2) image.pixel(x, y, paint([35, 65, 100]));
      else if (inside) image.pixel(x, y, paint(fill));
    }
  };
  image.rect(20, 90, 140, 125, paint([80, 155, 90]));
  polygon([{ x: 90, y: 180 }, { x: 345, y: 180 }, { x: 350, y: 250 }, { x: 320, y: 268 }, { x: 305, y: 225 }, { x: 110, y: 210 }], [190, 220, 235]);
  polygon([{ x: 90, y: 180 }, { x: 320, y: 120 }, { x: 365, y: 35 }, { x: 385, y: 40 }, { x: 365, y: 180 }, { x: 335, y: 205 }, { x: 110, y: 210 }], [170, 210, 225]);
  for (const center of [{ x: 120, y: 192 }, { x: 338, y: 182 }, { x: 330, y: 245 }]) {
    for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
      const r = Math.hypot(x - center.x, y - center.y);
      if (r <= 8) image.pixel(x, y, r >= 5 ? paint([35, 65, 100]) : [255, 255, 255]);
    }
  }
  return image;
}

test('Enclosed interiors separate touching outlined plates and retain internal circular mounting points', () => {
  for (const grayscale of [false, true]) {
    const result = D.detectPixels(mountingSketch(grayscale));
    const bodies = result.candidates.filter((c) => c.evidence.closedRegion && c.outline.length);
    assert(bodies.length >= 2, 'edge-enclosed plates should survive a connected foreground');
    assert(bodies.every((c) => !c.selected), 'overlapping interpretations require review');
    for (const at of [{ x: 120, y: 192 }, { x: 338, y: 182 }, { x: 330, y: 245 }]) {
      assert(result.candidates.some((c) => c.type === 'bearing' && Math.hypot(c.points[0].x - at.x, c.points[0].y - at.y) < 2), `missing circle at ${JSON.stringify(at)}`);
      assert(bodies.some((c) => c.anchors?.some((p) => Math.hypot(p.x - at.x, p.y - at.y) < 2)), 'internal mounting point must attach to a plate');
    }
  }
});
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
const loader = (outcome = 'load', pixels = raster) => {
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
      const canvas = { getContext: () => ({ fillRect() {}, drawImage(...args) { canvas.drawArgs = args.slice(1); }, getImageData(x, y, w, h) { return pixels(w, h); } }) };
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
test('Cropped detection maps contours, points and mounting radii back to original image coordinates', async () => {
  const pixels = (w, h) => {
    const image = raster(w, h); image.rect(20, 30, 180, 22, [50, 90, 180]);
    for (let y = 32; y < 51; y++) for (let x = 25; x < 45; x++) {
      const r = Math.hypot(x - 35, y - 41);
      if (r <= 7) image.pixel(x, y, r >= 4 ? [0, 0, 0] : [255, 255, 255]);
    }
    return image;
  };
  const { api, canvases } = loader('load', pixels), region = { x: 1000, y: 300, width: 2000, height: 1000 };
  const expected = D.detectPixels(pixels(768, 384));
  const result = await api.detectImage({ url: 'blob:cropped', width: 4000, height: 2000 }, { region });
  assert.deepEqual(canvases[0].drawArgs, [1000, 300, 2000, 1000, 0, 0, 768, 384]);
  assert(result.candidates.some((c) => c.anchors?.length));
  assert.equal(result.candidates.length, expected.candidates.length);
  result.candidates.forEach((candidate, i) => {
    for (const field of ['points', 'outline', 'anchors']) (candidate[field] || []).forEach((p, j) => {
      const original = expected.candidates[i][field][j];
      assert(Math.abs(p.x - (1000 + original.x * 2000 / 768)) < 1e-8);
      assert(Math.abs(p.y - (300 + original.y * 1000 / 384)) < 1e-8);
      if (field === 'anchors') assert(Math.abs(p.radius - original.radius / .384) < 1e-8);
    });
  });
  for (const bad of [{ ...region, x: -1 }, { ...region, width: 5000 }, { ...region, height: 2 }, { ...region, x: .5 }]) await assert.rejects(api.detectImage({ url: 'blob:cropped', width: 4000, height: 2000 }, { region: bad }));
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

const ownerBody=(id='body',offset=0)=>({id,type:'panel',selected:true,points:[{x:offset,y:0},{x:offset+100,y:0}],outline:[{x:offset,y:0},{x:offset+100,y:0},{x:offset+100,y:80},{x:offset,y:80}],anchors:[{x:50,y:40,radius:5}],width:80,radius:5});
const ownerHole=()=>({id:'hole',type:'bearing',selected:true,points:[{x:50,y:40}],radius:5});
test('Mechanism interpretation turns an interior hole into a body mounting point, not a duplicate bearing',()=>{
 const input=[ownerBody(),ownerHole()],before=JSON.stringify(input),r=D.mechanismCandidates(input);
 assert.equal(JSON.stringify(input),before);assert.equal(r.unresolved.length,0);assert.equal(r.ownership[0].choice,'body');assert(r.ownership[0].automatic);assert.equal(r.candidates[0].anchors.length,1);assert.equal(r.candidates[1].selected,false);
 const scale=KinmoMagicImport.calibration({width:200,height:100},{x:0,y:0},{x:200,y:0},200);
 const result=KinmoMagicImport.applyDetected(Kinematics.preset('custom'),{width:200,height:100},scale,r.candidates,{connections:true});assert.equal(result.project.elements.filter(e=>e.type==='bearing'&&!e.parentId).length,0);assert.equal(result.project.elements.filter(e=>e.type==='node'&&e.parentId===result.candidateMap.body).length,1);
});
test('Overlapping bodies require an explicit hole owner and shared pin choice creates one mount per body',()=>{
 const input=[ownerBody('first'),ownerBody('second',20),ownerHole()],ambiguous=D.mechanismCandidates(input);assert.equal(ambiguous.unresolved.length,1);
 const single=D.mechanismCandidates(input,{hole:'second'});assert.equal(single.candidates[0].anchors.length,0);assert.equal(single.candidates[1].anchors.length,1);
 const shared=D.mechanismCandidates(input,{hole:'shared'});assert.equal(shared.unresolved.length,0);assert(shared.candidates.slice(0,2).every(c=>c.anchors.length===1));assert.equal(shared.candidates[2].selected,false);
 const pin=D.mechanismCandidates(input,{hole:'pin'});assert(pin.candidates[2].selected);assert.equal(D.mechanismCandidates(input,{hole:'ignore'}).candidates[0].anchors.length,0);
 assert.throws(()=>D.mechanismCandidates(input,{hole:'missing'}),/vlastníka/);assert.throws(()=>D.mechanismCandidates([ownerBody(),ownerHole()],{hole:'shared'}),/vlastníka/);
});
test('Motion probe exercises a confirmed grounded hinge without persisting a guessed driver',()=>{
 const K=Kinematics,I=KinmoInteraction,M=KinmoMagicImport,a=K.makeElement('ground',0,0),b=K.makeElement('link',0,0);
 let p=K.validateProject({...K.preset('custom'),elements:[a,b]});p=I.setJoint(p,{elementId:a.id,point:'a'},{other:{elementId:b.id,point:'a'},type:'revolute'});const before=JSON.stringify(p),r=M.probeMechanism(p,p.connections.map(j=>j.id));
 assert.equal(r.checked,true);assert.equal(r.samples.length,5);assert.equal(r.blocked.length,0);assert.equal(JSON.stringify(p),before);assert(p.elements.every(e=>!e.drive));assert.equal(M.probeMechanism(p,[]).checked,false);
});
test('Motion probe reports a jammed arm and supports a pivot at an internal mounting node',()=>{
 const K=Kinematics,I=KinmoInteraction,M=KinmoMagicImport,a=K.makeElement('ground',0,0),b={...K.makeElement('panel',-50,0),angle:0,localC:{x:50,y:0}},node={...K.makeElement('node',50,0),parentId:b.id,parentPoint:'a'},other=K.makeElement('ground',100,0);
 let p=K.validateProject({...K.preset('custom'),elements:[a,b,node,other]});p=I.setJoint(p,{elementId:a.id,point:'a'},{other:{elementId:node.id,point:'a'},type:'revolute'});let r=M.probeMechanism(p,p.connections.map(j=>j.id));assert(r.checked);assert.equal(r.blocked.length,0);assert(Math.abs(r.samples[4].poses[b.id].angle-r.samples[0].poses[b.id].angle)>20);
 p=I.setJoint(p,{elementId:other.id,point:'a'},{other:{elementId:b.id,point:'b'},type:'revolute'});r=M.probeMechanism(p,p.connections.map(j=>j.id));assert(r.checked);assert(r.blocked.length>0);
});
test('A circle at an intermediate bend belongs to the polyline body and remains a reviewable near-edge choice',()=>{
 const body={...ownerBody(),outline:[],points:[{x:10,y:70},{x:50,y:40},{x:90,y:70}],width:10};const r=D.mechanismCandidates([body,ownerHole()]);assert.equal(r.ownership[0].owners.length,1);assert.equal(r.unresolved.length,1);
});
