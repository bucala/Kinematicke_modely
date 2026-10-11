(function (global) {
  'use strict';
  const G = global.KinmoGIF, decode = global.KinmoGifTestDecoder.decode, cases = [];
  const add = (name, run) => cases.push({ name, run });
  const assert = (value, message = 'GIF test failed.') => { if (!value) throw new Error(message); };
  const near = (a, b, tolerance = 1e-8) => assert(Math.abs(a - b) <= tolerance, `${a} != ${b}`);
  const throws = (fn) => { let failed = false; try { fn(); } catch { failed = true; } assert(failed, 'Expected an error.'); };
  const palette = () => Uint8Array.from({ length: 768 }, (_, i) => Math.floor(i / 3));
  const random = (length) => {
    let seed = 731; const values = new Uint8Array(length);
    for (let i = 0; i < length; i++) { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; values[i] = seed >>> 24; } return values;
  };
  const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  const rgba = (colors) => new Uint8ClampedArray(colors.flatMap((v) => [...v.slice(0, 3), v[3] ?? 255]));
  const range = { min: 10, max: 310 }, view = { width: 1600, height: 900 };
  const encode = (values, width = values.length, height = 1, options = {}) => {
    const encoder = G.createEncoder({ width, height, palette: palette(), ...options });
    encoder.addFrame(values, 10); return decode(encoder.finish());
  };

  add('GIF plán zachová pomer strán, celý rozsah a presné trvanie cyklu.', () => {
    const result = G.plan(range, view);
    assert(result.width === 800 && result.height === 450 && result.frames.length === 60 && result.loop);
    near(result.frames[0].motion, 10); near(result.frames[30].motion, 310);
    near(result.frames.at(-1).motion - result.frames[0].motion, 10);
    near(result.frames.reduce((sum, v) => sum + v.delay, 0), 600);
  });
  add('GIF jedným smerom zahrnie oba konce a jednorazový spätný cyklus sa vráti na začiatok.', () => {
    let result = G.plan({ min: -270, max: 90 }, view, { direction: 'forward', loop: false });
    near(result.frames[0].motion, -270); near(result.frames.at(-1).motion, 90);
    result = G.plan(range, view, { loop: false });
    assert(result.frames.length === 61 && !result.loop); near(result.frames[30].motion, 310); near(result.frames.at(-1).motion, 10);
    near(result.frames.reduce((sum, v) => sum + v.delay, 0), 600);
  });
  add('GIF vysoký pohľad sa zmenší bez natiahnutia a predvolená veľkosť je obmedzená.', () => {
    const result = G.plan(range, { width: 100, height: 1000 });
    assert(result.width === 120 && result.height === 1200 && result.pixels <= G.limits.pixels);
  });
  add('GIF plán odmietne neplatné rozmery, časovanie a nekonečný rozsah.', () => {
    for (const options of [{ width: 159 }, { width: 1201 }, { width: 800.5 }, { duration: 0 }, { duration: 12.1 }, { fps: 4 }, { fps: 21 }, { fps: '10' }, { direction: 'invalid' }]) throws(() => G.plan(range, view, options));
    for (const value of [{ min: 0, max: 0 }, { min: 10, max: 0 }, { min: -1e308, max: 1e308 }, { min: 0, max: NaN }]) throws(() => G.plan(value, view));
    for (const value of [{ width: 0, height: 10 }, { width: 1, height: Infinity }, { width: 1e-308, height: 1e308 }]) throws(() => G.plan(range, value));
  });
  add('GIF plán odmietne nadmerný počet snímok a súčet obrazových bodov.', () => {
    throws(() => G.plan(range, view, { duration: 12, fps: 20 }));
    throws(() => G.plan(range, { width: 1, height: 1 }, { width: 1200, duration: 6 }));
    const result = G.plan(range, view, { width: 480, duration: 9, fps: 20 }); assert(result.frames.length === 180);
  });
  add('GIF89a má platnú paletu, ukončenie a nepriehľadnú celoplošnú snímku.', () => {
  add('GIF zaokrúhlenie cyklu ani jednorazový koncový bod neprekročia 20 snímok/s.', () => {
    for (const direction of ['forward', 'roundtrip']) for (const loop of [true, false]) for (const duration of [1, 1.05, 1.1, 1.23]) {
      const result = G.plan(range, view, { width: 160, duration, fps: 20, direction, loop });
      assert(result.fps <= G.limits.fps); assert(result.frames[0].motion === range.min);
      assert(result.frames.reduce((sum, frame) => sum + frame.delay, 0) === Math.round(duration * 100));
      assert(result.frames.every((frame) => frame.delay >= 5));
      if (!loop && direction === 'roundtrip') assert(result.frames.at(-1).motion === range.min);
    }
  });

    const values = Uint8Array.of(0, 15, 255, 127), result = encode(values, 2, 2);
    assert(result.width === 2 && result.height === 2 && result.palette.length === 768 && result.frames.length === 1 && result.loop === 0);
    assert(same(result.frames[0].indices, values) && result.frames[0].delay === 10 && result.frames[0].disposal === 1 && result.frames[0].transparency === null);
  });
  add('GIF zachová viac snímok, individuálne časy a voľbu opakovania.', () => {
    const encoder = G.createEncoder({ width: 2, height: 1, palette: palette(), loop: false });
    encoder.addFrame(Uint8Array.of(0, 1), 5); encoder.addFrame(Uint8Array.of(2, 3), 11);
    const result = decode(encoder.finish());
    assert(result.loop === null && result.frames.length === 2 && encoder.frameCount === 2);
    assert(result.frames[0].delay === 5 && result.frames[1].delay === 11 && same(result.frames[1].indices, Uint8Array.of(2, 3)));
  });
  add('GIF LZW prejde šírkami 9–12 bitov a bezpečne resetuje plný slovník.', () => {
    const values = random(16384), result = encode(values, 128, 128).frames[0];
    assert(same(values, result.indices) && [9, 10, 11, 12].every((v) => result.widths.includes(v)) && result.clears > 1);
  });
  add('GIF LZW korektne ukončí snímku pri prechode šírky kódu.', () => {
    for (const length of [1, 2, 253, 254, 255, 256, 511, 512, 513, 1023, 1024, 1025]) {
      const values = Uint8Array.from({ length }, (_, i) => i % 256), result = encode(values).frames[0]; assert(same(values, result.indices), `Boundary ${length}`);
    }
  });
  add('GIF LZW zvládne jednofarebné plochy a opakujúce sa vzory.', () => {
    for (const values of [new Uint8Array(10000).fill(255), Uint8Array.from({ length: 10000 }, (_, i) => i % 3)]) assert(same(values, encode(values, 100, 100).frames[0].indices));
  });
  add('GIF výstup je deterministický a nemení vstupné obrazové body ani paletu.', () => {
    const values = random(1024), colors = palette(), before = values.slice(), first = G.createEncoder({ width: 32, height: 32, palette: colors });
    first.addFrame(values); const bytes = first.finish(), second = G.createEncoder({ width: 32, height: 32, palette: palette() });
    second.addFrame(values); assert(same(bytes, second.finish()) && same(values, before) && same(colors, palette()));
  });
  add('GIF odmietne neplatnú paletu, rozmery, snímku a časovanie.', () => {
    for (const options of [{ width: 0 }, { width: 1201 }, { height: 0 }, { palette: new Uint8Array(767) }, { maxBytes: 1023 }, { maxBytes: G.limits.bytes + 1 }]) throws(() => G.createEncoder({ width: 1, height: 1, palette: palette(), ...options }));
    const encoder = G.createEncoder({ width: 1, height: 1, palette: palette() });
    throws(() => encoder.finish()); throws(() => encoder.addFrame(new Uint8Array(2))); throws(() => encoder.addFrame(Uint8Array.of(0), 1));
    encoder.addFrame(Uint8Array.of(0)); encoder.finish();
    throws(() => encoder.finish()); throws(() => encoder.addFrame(Uint8Array.of(0)));
  });
  add('GIF má konečný limit snímok a veľkosti, neúplný súbor sa nevráti.', () => {
    const encoder = G.createEncoder({ width: 1, height: 1, palette: palette() });
    for (let i = 0; i < 180; i++) encoder.addFrame(Uint8Array.of(i));
    throws(() => encoder.addFrame(Uint8Array.of(0))); assert(decode(encoder.finish()).frames.length === 180);
    const bounded = G.createEncoder({ width: 512, height: 1, palette: palette(), maxBytes: 1024 });
    throws(() => bounded.addFrame(random(512))); throws(() => bounded.finish()); throws(() => bounded.addFrame(new Uint8Array(512)));
  });
  add('Adaptívna GIF paleta zachová základné farby schémy bez zmeny RGBA vstupu.', () => {
    const values = rgba([[250, 250, 250], [38, 38, 36], [113, 147, 192], [245, 216, 208], [210, 182, 42]]), before = values.slice(), builder = G.createPalette();
    builder.add(values); const mapping = builder.finish(), indices = mapping.indices(values), colors = mapping.colors;
    indices.forEach((index, i) => assert(same(colors.slice(index * 3, index * 3 + 3), values.slice(i * 4, i * 4 + 3))));
    assert(same(values, before) && colors.length === 768);
    colors.fill(0); assert(mapping.colors.some((v) => v > 0));
  });
  add('GIF paleta zmieša priehľadnosť s vybraným pozadím, aj v tmavom vzhľade.', () => {
    const values = rgba([[255, 0, 0, 128], [255, 255, 255, 0]]), builder = G.createPalette([38, 38, 36]);
    builder.add(values); const mapping = builder.finish(), indices = mapping.indices(values), colors = mapping.colors;
    assert(same(colors.slice(indices[0] * 3, indices[0] * 3 + 3), Uint8Array.of(147, 19, 18)));
    assert(same(colors.slice(indices[1] * 3, indices[1] * 3 + 3), Uint8Array.of(38, 38, 36)));
  });
  add('GIF paleta má pevný pamäťový limit a odmietne poškodené obrazové vstupy.', () => {
    for (const background of [[-1, 0, 0], [1, 2], ['0', 0, 0]]) throws(() => G.createPalette(background));
    const builder = G.createPalette();
    for (const value of [[], new Uint16Array(4), new Uint8Array(3), new Uint8Array(0)]) throws(() => builder.add(value));
    const mapping = builder.finish(); throws(() => builder.finish()); throws(() => builder.add(new Uint8Array(4))); throws(() => mapping.indices(new Uint8Array(3)));
    const large = new Uint8ClampedArray(G.limits.width * G.limits.height * 4), bounded = G.createPalette();
    for (let i = 0; i < 3; i++) bounded.add(large);
    throws(() => bounded.add(new Uint8Array(4)));
  });
  global.KinematicsTestCases = Object.freeze([...(global.KinematicsTestCases || []), ...cases]);
})(globalThis);
