import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../scene-export.js', import.meta.url), 'utf8');
const escape = (value) => String(value).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

class Element {
  constructor(tag, attributes = {}, css = {}, children = []) {
    this.tag = tag; this.values = new Map(Object.entries(attributes)); this.css = css; this.children = children; this.textContent = '';
    this.rules = new Map(); this.style = { setProperty: (key, value) => this.rules.set(key, String(value)) };
    for (const child of children) child.parent = this;
  }
  get attributes() { return [...this.values].map(([name, value]) => ({ name, value })); }
  getAttribute(key) { return this.values.get(key) ?? null; }
  setAttribute(key, value) { this.values.set(key, String(value)); }
  removeAttribute(key) { this.values.delete(key); if (key === 'style') this.rules.clear(); }
  getScreenCTM() { return { a: .5, b: 0 }; }
  cloneNode() {
    const copy = new Element(this.tag, Object.fromEntries(this.values), this.css, this.children.map((v) => v.cloneNode()));
    copy.textContent = this.textContent; return copy;
  }
  querySelectorAll(selector) {
    const all = this.children.flatMap((v) => [v, ...v.querySelectorAll('*')]);
    if (selector === '*') return all;
    if (selector === '[data-editor-overlay], .control-handle') return all.filter((v) => v.values.has('data-editor-overlay') || v.getAttribute('class') === 'control-handle');
    return all.filter((v) => selector.split(',').map((s) => s.trim()).includes(v.tag));
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((v) => v !== this); }
  prepend(...children) { for (const child of children) child.parent = this; this.children.unshift(...children); }
  get outerHTML() {
    const attributes = [...this.values].map(([key, value]) => ` ${key}="${escape(value)}"`).join(''), style = this.rules.size ? ` style="${escape([...this.rules].map(([key, value]) => `${key}: ${value};`).join(' '))}"` : '';
    return `<${this.tag}${attributes}${style}>${escape(this.textContent)}${this.children.map((v) => v.outerHTML).join('')}</${this.tag}>`;
  }
}

function environment(mode = 'load') {
  const created = [], revoked = [], timers = new Map(); let nextTimer = 0;
  const canvas = { width: 0, height: 0, getContext: () => ({ drawImage(...args) { canvas.drawn = args; } }) };
  const context = vm.createContext({
    TextEncoder, Blob,
    getComputedStyle: (node) => ({ getPropertyValue: (key) => node.css[key] || '' }),
    document: { createElementNS: (ns, tag) => new Element(tag), createElement: () => canvas },
    URL: { createObjectURL: (blob) => { created.push(blob); return `blob:qa-${created.length}`; }, revokeObjectURL: (url) => revoked.push(url) },
    Image: class {
      set src(value) {
        if (value && mode !== 'wait') queueMicrotask(() => { if (mode === 'error') this.onerror?.(); else this.onload?.(); });
      }
    },
    setTimeout: (callback) => { timers.set(++nextTimer, callback); return nextTimer; },
    clearTimeout: (id) => timers.delete(id),
  });
  vm.runInContext(source, context);
  return { api: context.KinmoScene, context, canvas, created, revoked, timers };
}
const options = () => ({ view: { x: -10, y: 20, width: 1600, height: 900 }, title: '<script>importovaný názov</script>', description: 'Lokálna schéma.' });
const fixture = () => new Element('svg', { id: 'mechanism-canvas', role: 'group', class: 'labels-hidden' }, { color: '#ffffff' }, [
  new Element('defs', {}, {}, [new Element('pattern', { id: 'large-grid' })]),
  new Element('rect', { fill: 'var(--canvas)' }, { fill: 'url("https://app.example.com/#large-grid")' }),
  new Element('g', { 'data-element': 'a', role: 'button', tabindex: '0', 'aria-label': 'Rameno' }, {}, [
    new Element('circle', { class: 'node-ring', fill: 'var(--paper)', stroke: 'var(--node-free)' }, { fill: '#30302e', stroke: '#a5c8c0', 'stroke-width': '1.7px', 'stroke-dasharray': '2px, 2px', 'stroke-dashoffset': '0px', 'vector-effect': 'non-scaling-stroke' }),
    new Element('text', { class: 'part-label' }, { fill: '#d0cdc4', display: 'none', 'font-size': '9px', 'font-family': 'Segoe UI' }),
  ]),
  new Element('g', { 'data-editor-overlay': 'magic-photo' }, {}, [new Element('image', { href: 'blob:private-photo' })]),
  new Element('g', { class: 'control-handle' }, {}, [new Element('rect', { width: '10', height: '10' })]),
]);

test('Snapshot freezes node colours, visibility and internal grid paints without stylesheet dependencies', () => {
  const { api } = environment(), svg = api.snapshot(fixture(), options());
  for (const token of ['width="2000"', 'height="1125"', 'viewBox="-10 20 1600 900"', 'id="large-grid"', 'fill: url(#large-grid);', 'stroke: #a5c8c0;', 'display: none;', 'font-family: Segoe UI;']) assert(svg.includes(token), token);
  assert(!svg.includes('var(--') && !svg.includes('https://') && !svg.includes('role="button"'));
  assert(svg.includes('&lt;script&gt;') && !svg.includes('<script>'));
});

test('Pixel-sized strokes scale with the exported picture rather than becoming thin in PDF', () => {
  const { api } = environment(), svg = api.snapshot(fixture(), options());
  assert(svg.includes('stroke-width: 3.4;') && svg.includes('stroke-dasharray: 4 4;') && svg.includes('vector-effect: none;'));
});

test('Snapshot removes reference photos, measurements and editing handles but leaves the original untouched', () => {
  const { api } = environment(), original = fixture(), before = original.outerHTML, svg = api.snapshot(original, options());
  assert(!svg.includes('private-photo') && !svg.includes('<image') && !svg.includes('control-handle') && !svg.includes('data-editor-overlay'));
  assert.equal(original.outerHTML, before);
});

test('Unsupported external content, active markup and excessive snapshot dimensions are rejected', () => {
  const { api } = environment();
  for (const tag of ['image', 'use', 'script', 'foreignObject', 'a', 'animate', 'set']) {
    const original = fixture(); original.children.push(new Element(tag));
    assert.throws(() => api.snapshot(original, options()), /nepodporovaný/);
  }
  const original = fixture(); original.children.push(new Element('path', {}, { fill: 'url(https://example.com/image.svg)' }));
  assert.throws(() => api.snapshot(original, options()), /externé/);
  assert.throws(() => api.snapshot(fixture(), { ...options(), width: 2001 }), /rozmery/);
  assert.throws(() => api.snapshot(fixture(), { ...options(), title: 'x'.repeat(8 * 1024 * 1024) }), /8 MB/);
});

test('Rasterisation creates a bounded canvas and always releases the temporary SVG URL', async () => {
  const { api, canvas, created, revoked, timers } = environment();
  const result = await api.rasterize('<svg/>', { width: 800, height: 450 });
  assert.equal(result, canvas); assert.equal(canvas.width, 800); assert.equal(canvas.height, 450);
  assert.equal(canvas.drawn.length, 5); assert.equal(created.length, 1); assert.deepEqual(revoked, ['blob:qa-1']);
  assert.equal(timers.size, 0);
});

test('Raster decoding failures release the URL and report a useful error', async () => {
  const { api, revoked, timers } = environment('error');
  await assert.rejects(api.rasterize('<svg/>', { width: 800, height: 450 }), /nepodarilo/);
  assert.deepEqual(revoked, ['blob:qa-1']); assert.equal(timers.size, 0);
});

test('Animation rasterisation reuses one private canvas and keeps URL cleanup per frame', async () => {
  const { api, canvas, created, revoked, timers } = environment();
  const first = await api.rasterize('<svg/>', { width: 320, height: 180 }, { readPixels: true });
  const second = await api.rasterize('<svg/>', { width: 160, height: 90 }, { canvas: first, readPixels: true });
  assert.equal(first, second); assert.equal(second, canvas);
  assert.equal(canvas.width, 160); assert.equal(canvas.height, 90);
  assert.equal(created.length, 2); assert.equal(revoked.length, 2); assert.equal(timers.size, 0);
});

test('Cancellation before rasterisation creates no image or URL', async () => {
  const { api, created } = environment(), controller = new AbortController(); controller.abort();
  await assert.rejects(api.rasterize('<svg/>', { width: 800, height: 450 }, { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(created.length, 0);
});

test('Cancellation during decoding clears listeners, timers and the temporary URL', async () => {
  const { api, revoked, timers } = environment('wait'), controller = new AbortController();
  const pending = api.rasterize('<svg/>', { width: 800, height: 450 }, { signal: controller.signal }); controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.deepEqual(revoked, ['blob:qa-1']); assert.equal(timers.size, 0);
});

test('A stalled SVG decode has a finite timeout and leaves no object URL', async () => {
  const { api, revoked, timers } = environment('wait'), pending = api.rasterize('<svg/>', { width: 800, height: 450 });
  [...timers.values()][0]();
  await assert.rejects(pending, /nedokončil/); assert.deepEqual(revoked, ['blob:qa-1']); assert.equal(timers.size, 0);
});

test('Rasterisation refuses excessive dimensions and bytes before allocating an image', async () => {
  const { api, created } = environment();
  for (const dimensions of [{ width: 2001, height: 1 }, { width: 1, height: 4001 }, { width: 0, height: 1 }, { width: 1.5, height: 1 }]) await assert.rejects(api.rasterize('<svg/>', dimensions), /rozmery/);
  await assert.rejects(api.rasterize('x'.repeat(8 * 1024 * 1024 + 1), { width: 1, height: 1 }), /8 MB/);
  assert.equal(created.length, 0);
});

test('Canvas allocation and drawing failures still clean up the temporary image URL', async () => {
  for (const getContext of [() => null, () => ({ drawImage() { throw new Error('mock draw failure'); } })]) {
    const { api, canvas, revoked } = environment(); canvas.getContext = getContext;
    await assert.rejects(api.rasterize('<svg/>', { width: 800, height: 450 }));
    assert.deepEqual(revoked, ['blob:qa-1']);
  }
});
