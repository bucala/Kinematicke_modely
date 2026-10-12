(function (global) {
  'use strict';
  const K = global.Kinematics, E = global.KinmoEditor, I = global.KinmoInteraction, M = global.KinmoMagicImport, X = global.KinmoExport, cases = [];
  const add = (name, run) => cases.push({ name, run });
  const assert = (value, message = 'Nesplnená podmienka') => { if (!value) throw new Error(message); };
  const near = (a, b, tolerance = 1e-8) => assert(Number.isFinite(a) && Math.abs(a - b) <= tolerance, `${a} ≠ ${b}`);
  const throws = (fn) => { let failed = false; try { fn(); } catch { failed = true; } assert(failed, 'Očakávané odmietnutie operácie'); };
  const image = { width: 800, height: 600, url: 'blob:temporary-local-reference', name: 'Náčrt.png' };
  const scale = () => M.calibration(image, { x: 100, y: 80 }, { x: 500, y: 80 }, 200);
  const png = (width, height, animated = false) => {
    const bytes = new Uint8Array(animated ? 53 : 45), view = new DataView(bytes.buffer);
    bytes.set([137, 80, 78, 71, 13, 10, 26, 10]); view.setUint32(8, 13);
    bytes.set([73, 72, 68, 82], 12); view.setUint32(16, width); view.setUint32(20, height);
    if (animated) { view.setUint32(33, 8); bytes.set([97, 99, 84, 76], 37); }
    else bytes.set([73, 69, 78, 68], 37);
    return bytes;
  };
  const jpeg = (width, height) => new Uint8Array([255, 216, 255, 192, 0, 8, 8, height >> 8, height & 255, width >> 8, width & 255, 0, 255, 217]);
  const webp = (kind, payload) => {
    const bytes = new Uint8Array(20 + payload.length + (payload.length & 1)), view = new DataView(bytes.buffer);
    bytes.set([82, 73, 70, 70]); view.setUint32(4, bytes.length - 8, true); bytes.set([87, 69, 66, 80], 8);
    bytes.set([...kind].map((c) => c.charCodeAt(0)), 12); view.setUint32(16, payload.length, true); bytes.set(payload, 20);
    return bytes;
  };

  add('Magic import prijíma iba lokálne rastry do 10 MB, nie SVG ani animované formáty.', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp', '']) M.validateFile({ size: 100, type });
    for (const type of ['image/svg+xml', 'image/gif', 'image/heic', 'text/html']) throws(() => M.validateFile({ size: 100, type }));
    for (const size of [0, -1, .5, NaN, Infinity, M.limits.bytes + 1]) throws(() => M.validateFile({ size, type: 'image/png' }));
    throws(() => M.validateFile(null));
  });
  add('Magic import číta skutočné PNG/JPG rozmery z obsahu, nie z názvu súboru.', () => {
    for (const [bytes, type] of [[png(800, 600), 'image/png'], [jpeg(800, 600), 'image/jpeg']]) {
      const result = M.imageMetadata(bytes, type); near(result.width, 800); near(result.height, 600); assert(result.type === type);
      throws(() => M.imageMetadata(bytes, type === 'image/png' ? 'image/jpeg' : 'image/png'));
    }
    throws(() => M.imageMetadata(new TextEncoder().encode('<svg width="800" height="600"></svg>'), 'image/png'));
  });
  add('Magic import podporuje statický rozšírený, stratový aj bezstratový WebP.', () => {
    const payload = new Uint8Array(10); payload[4] = 31; payload[7] = 23;
    let result = M.imageMetadata(webp('VP8X', payload), 'image/webp'); near(result.width, 32); near(result.height, 24);
    result = M.imageMetadata(webp('VP8 ', new Uint8Array([0, 0, 0, 157, 1, 42, 32, 0, 24, 0])));
    near(result.width, 32); near(result.height, 24);
    const lossless = new Uint8Array(5); lossless[0] = 47; new DataView(lossless.buffer).setUint32(1, 31 | 23 << 14, true);
    result = M.imageMetadata(webp('VP8L', lossless)); near(result.width, 32); near(result.height, 24);
  });
  add('Magic import odmietne APNG a animovaný WebP ešte pred dekódovaním obrázka.', () => {
    throws(() => M.imageMetadata(png(800, 600, true)));
    const payload = new Uint8Array(10); payload[0] = 2;
    throws(() => M.imageMetadata(webp('VP8X', payload)));
    for (const kind of ['ANIM', 'ANMF']) throws(() => M.imageMetadata(webp(kind, new Uint8Array(8))));
  });
  add('Magic import odmietne príliš veľké, nulové a poškodené hlavičky obrázkov.', () => {
    for (const [w, h] of [[0, 10], [10, 0], [8193, 10], [4001, 4000]]) throws(() => M.imageMetadata(png(w, h)));
    throws(() => M.imageMetadata(png(800, 600).subarray(0, 32)));
    const incomplete = png(800, 600); new DataView(incomplete.buffer).setUint32(33, 100);
    throws(() => M.imageMetadata(incomplete));
    const badWebp = webp('VP8X', new Uint8Array(10)); new DataView(badWebp.buffer).setUint32(4, 999, true);
    throws(() => M.imageMetadata(badWebp));
    const badJpeg = jpeg(800, 600); new DataView(badJpeg.buffer).setUint16(4, 500);
    throws(() => M.imageMetadata(badJpeg));
    throws(() => M.imageMetadata(new Uint8Array(11)));
  });
  add('Kalibrácia Magic import zachová začiatok A a os Y smerom nadol v milimetroch.', () => {
    const calibration = scale(), origin = M.worldFromPixel(calibration.a, calibration), endpoint = M.worldFromPixel(calibration.b, calibration);
    near(calibration.mmPerPixel, .5); near(origin.x, 0); near(origin.y, 0); near(endpoint.x, 200); near(endpoint.y, 0);
    const down = M.worldFromPixel({ x: 100, y: 180 }, calibration); near(down.x, 0); near(down.y, 50);
    const pixel = M.pixelFromWorld({ x: -25, y: 60 }, calibration); near(pixel.x, 50); near(pixel.y, 200);
    const rect = M.imageRect(image, calibration); near(rect.x, -50); near(rect.y, -40); near(rect.width, 400); near(rect.height, 300);
  });
  add('Kalibrácia používa euklidovskú vzdialenosť bez otáčania alebo korekcie perspektívy.', () => {
    const a = { x: 20, y: 30 }, b = { x: 80, y: 110 }, calibration = M.calibration(image, a, b, 50);
    near(calibration.pixels, 100); near(calibration.mmPerPixel, .5);
    const end = M.worldFromPixel(b, calibration); near(end.x, 30); near(end.y, 40); near(K.distance({ x: 0, y: 0 }, end), 50);
    a.x = 200; b.y = 200; near(calibration.a.x, 20); near(calibration.b.y, 110);
  });
  add('Magic import kopíruje aj SVG/DOM body s prototypovými prístupmi k X/Y.', () => {
    const a = Object.create({ x: 100, y: 80 }), b = Object.create({ x: 500, y: 80 }), calibration = M.calibration(image, a, b, 200);
    near(calibration.a.x, 100); near(calibration.b.x, 500); near(calibration.mmPerPixel, .5);
    const p = M.traceBody(K.preset('custom'), 'link', [a, b]);
    near(p.elements[0].x, 100); near(p.elements[0].length, 400);
  });
  add('Jedna známa hodnota X alebo Y zachová rovnakú mierku oboch osí.', () => {
    const a = { x: 100, y: 80 }, b = { x: 500, y: 180 };
    const x = M.calibration(image, a, b, 300, 'horizontal'), y = M.calibration(image, a, b, 75, 'vertical');
    near(x.mmPerPixel, .75); near(y.mmPerPixel, .75);
    near(M.imageRect(image, x).height, 450); near(M.worldFromPixel(b, x).y, 75);
    throws(() => M.calibration(image, a, { x: 100, y: 280 }, 300, 'horizontal'));
    throws(() => M.calibration(image, a, b, 300, 'bad-axis'));
  });
  add('Prekalibrovanie prepočíta rodičov, obrysy, dĺžkové väzby aj kóty atomicky.', () => {
    let p = M.traceBody(K.preset('custom'), 'link', [{ x: 10, y: 20 }, { x: 110, y: 20 }]);
    const e = p.elements[0], child = { ...K.makeElement('node', 20, 5), parentId: e.id, mass: 0 };
    p.elements.push(child, { ...K.makeElement('node', 210, 20), locked: true });
    p.connections.push({ id: 'd', a: { elementId: e.id, point: 'b' }, b: { elementId: p.elements[2].id, point: 'a' }, type: 'distance', value: 100 });
    p.dimensions.push({ id: 'dim', type: 'distance', a: { x: 10, y: 20 }, b: { x: 110, y: 20 }, offset: 25 });
    p = K.validateProject(p);
    const before = JSON.stringify(p), from = scale(), to = M.calibration(image, { x: 80, y: 60 }, { x: 480, y: 60 }, 300);
    const next = M.rescale(p, from, to), result = E.design(next, 0);
    near(next.elements[0].length, 150); near(next.elements[0].x, 30); near(next.elements[0].y, 45);
    near(next.elements[1].x, 30); near(next.elements[1].y, 7.5);
    near(result.poses[child.id].a.x, 60); near(result.poses[child.id].a.y, 52.5);
    near(next.connections[0].value, 150); near(next.dimensions[0].a.x, 30); near(next.dimensions[0].offset, 37.5);
    near(next.elements[0].mass, p.elements[0].mass); near(next.elements[0].angle, p.elements[0].angle);
    assert(JSON.stringify(p) === before);
    throws(() => M.rescale(p, from, { a: { x: 0, y: 0 }, mmPerPixel: 1000 }));
    assert(JSON.stringify(p) === before);
  });
  add('Kalibrácia odmietne krátky úsek, body mimo fotografie a neplatný známy rozmer.', () => {
    for (const b of [{ x: 101, y: 80 }, { x: -1, y: 80 }, { x: 801, y: 80 }, { x: 100, y: 601 }, { x: NaN, y: 80 }]) throws(() => M.calibration(image, { x: 100, y: 80 }, b, 10));
    for (const distance of [0, .09, 5001, NaN, Infinity]) throws(() => M.calibration(image, { x: 100, y: 80 }, { x: 500, y: 80 }, distance));
    throws(() => M.calibration(image, { x: 100, y: 80 }, { x: 102, y: 80 }, 5000));
    throws(() => M.worldFromPixel({ x: 0, y: 0 }, null)); throws(() => M.pixelFromWorld({ x: 0, y: Infinity }, scale()));
  });
  add('Prepočet mierky zachová stranu a presný polkruh, profil vačky a všetky tri body vozíka.', () => {
    const slot = K.makeElement('slot', 20, 40), rail = { ...K.makeElement('rail', 200, 80), drive: false }, cam = { ...K.makeElement('cam', 350, 100), drive: false };
    const p = I.semicircle(K.validateProject({ ...K.preset('custom'), elements: [slot, rail, cam] }), slot.id, 80, -1), before = JSON.stringify(p);
    const next = M.rescale(p, { a: { x: 0, y: 0 }, mmPerPixel: 1 }, { a: { x: 0, y: 0 }, mmPerPixel: 1.5 });
    const restored = X.parseNative(X.serializeNative(next)).project, result = E.design(restored, 0), previous = E.design(p, 0);
    assert(restored.elements[0].curveSemicircle && restored.elements[0].curveSide === -1); near(restored.elements[0].curveRadius, 120);
    near(restored.elements[2].radius, cam.radius * 1.5); near(restored.elements[2].camLift, cam.camLift * 1.5);
    for (const key of K.carriagePoints) { near(result.poses[rail.id][key].x, previous.poses[rail.id][key].x * 1.5); near(result.poses[rail.id][key].y, previous.poses[rail.id][key].y * 1.5); }
    previous.poses[slot.id].path.forEach((point, i) => { near(result.poses[slot.id].path[i].x, point.x * 1.5); near(result.poses[slot.id].path[i].y, point.y * 1.5); });
    assert(JSON.stringify(p) === before);
  });
  add('Pevná podlaha Magic import vznikne ako ukotvený obrys s presnou dĺžkou a hrúbkou.', () => {
    const original = K.preset('custom'), before = JSON.stringify(original), next = M.traceBody(original, 'ground', [{ x: 10, y: 20 }, { x: 110, y: 20 }], 8), e = next.elements.at(-1), pose = E.design(next, 0).poses[e.id];
    assert(e.locked && !e.drive && e.mass === 0 && e.outline.length === 4); near(e.length, 100); near(e.width, 8);
    near(pose.outline[0].y, 16); near(pose.outline[2].y, 24); near(pose.b.x, 110);
    assert(JSON.stringify(original) === before);
  });
  add('Šikmý pevný rám zachová svetové vrcholy a ponúkne ďalšie pevné uzly na spojenie.', () => {
    const points = [{ x: 10, y: 20 }, { x: 70, y: 100 }, { x: 30, y: 130 }, { x: -30, y: 50 }], p = M.traceBody(K.preset('custom'), 'ground', points), e = p.elements.at(-1), result = E.design(p, 0);
    near(e.angle, K.angleOf(points[0], points[1])); near(e.length, 100); assert(e.locked);
    result.poses[e.id].outline.forEach((point, index) => { near(point.x, points[index].x); near(point.y, points[index].y); });
    assert(p.elements.length === 3 && p.elements.slice(0, 2).every((child) => child.parentId === e.id && child.mass === 0));
    p.elements.slice(0, 2).forEach((child, i) => { const at = K.point(result, { elementId: child.id, point: 'a' }); near(at.x, points[i + 2].x); near(at.y, points[i + 2].y); });
  });
  add('Obrys pevného rámu odmietne priesečníky, opakované a nulové vrcholy bez zmeny projektu.', () => {
    const p = K.preset('custom'), before = JSON.stringify(p);
    for (const points of [
      [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 40, y: 0 }],
      [{ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 20 }, { x: 0, y: 0 }],
      [{ x: 0, y: 0 }, { x: 30, y: 30 }, { x: 0, y: 20 }, { x: 30, y: 0 }],
    ]) throws(() => M.traceBody(p, 'ground', points));
    assert(JSON.stringify(p) === before);
  });
  add('Pevný bod Magic import nie je pohon a zostáva nepohyblivý počas simulácie.', () => {
    const p = M.traceBody(K.preset('custom'), 'node', [{ x: -20, y: 30 }]), e = p.elements[0], result = K.solve(p, 100, { collisions: false });
    assert(e.locked && !e.drive && e.mass === 0); near(result.poses[e.id].a.x, -20); near(result.poses[e.id].a.y, 30);
  });
  add('Obkreslené rameno a čelo používajú známe konce, uhol, dĺžku a voľné tuhé telo.', () => {
    for (const type of ['link', 'panel']) {
      const p = M.traceBody(K.preset('custom'), type, [{ x: 10, y: 20 }, { x: 70, y: 100 }], 5), e = p.elements[0], pose = E.design(p, 0).poses[e.id];
      near(e.length, 100); near(pose.a.x, 10); near(pose.b.x, 70); near(pose.b.y, 100); near(e.width, 5); assert(!e.locked && !e.drive);
      if (type === 'panel') near(e.bearingOffset, 50);
    }
  });
  add('Obkreslené vedenie vytvorí správny zdvih a nikdy nepridá druhý pohon.', () => {
    let p = M.traceBody(K.preset('custom'), 'rail', [{ x: 0, y: 0 }, { x: 100, y: 0 }]);
    near(p.elements[0].stroke, 100); near(p.parameters.travelMax, 100); assert(p.elements[0].drive);
    p = M.traceBody(p, 'rail', [{ x: 0, y: 20 }, { x: 50, y: 20 }]); assert(!p.elements[1].drive);
    assert(p.elements.filter((e) => e.drive).length === 1); near(p.parameters.travelMax, 100);
  });
  add('Magic import vkladá všetky typy členov ako nezávislé overené kópie.', () => {
    const p = K.preset('custom'), before = JSON.stringify(p), ids = [];
    for (const type of K.TYPES) {
      const next = M.placeElement(p, type, { x: 25, y: -30 }), e = next.elements[0];
      assert(e.type === type && next.elements.length === 1); near(e.x, 25); near(e.y, -30); ids.push(e.id);
    }
    assert(new Set(ids).size === ids.length && JSON.stringify(p) === before);
    const first = M.placeElement(p, 'rail', { x: 0, y: 0 }), second = M.placeElement(first, 'rail', { x: 0, y: 20 });
    assert(first.elements[0].drive && !second.elements[1].drive);
  });
  add('Magic import odmietne chránený originál, neplatný typ, dĺžku a súradnice.', () => {
    const p = K.preset('custom'), a = { x: 0, y: 0 }, b = { x: 100, y: 0 };
    throws(() => M.traceBody(K.preset('fourbar'), 'ground', [a, b]));
    throws(() => M.placeElement(K.preset('fourbar'), 'link', a));
    for (const type of ['slot', 'spring-linear', 'unknown']) throws(() => M.traceBody(p, type, [a, b]));
    for (const width of [0, 5001, NaN]) throws(() => M.traceBody(p, 'link', [a, b], width));
    throws(() => M.traceBody(p, 'link', [a, { x: 0, y: 0 }]));
    throws(() => M.traceBody(p, 'link', [{ x: -3000, y: 0 }, { x: 3000, y: 0 }]));
    throws(() => M.placeElement(p, 'link', { x: 5001, y: 0 })); throws(() => M.placeElement(p, 'unknown', a));
  });
  add('Limity obrysu a 120 členov sa pri Magic import kontrolujú atomicky.', () => {
    const points = Array.from({ length: 65 }, (_, i) => ({ x: 100 * Math.cos(i * 2 * Math.PI / 65), y: 100 * Math.sin(i * 2 * Math.PI / 65) }));
    throws(() => M.traceBody(K.preset('custom'), 'ground', points));
    const p = K.validateProject({ ...K.preset('custom'), elements: Array.from({ length: 120 }, (_, i) => ({ ...K.makeElement('node', i, 0), id: `point-${i}` })) }), before = JSON.stringify(p);
    throws(() => M.placeElement(p, 'node', { x: 0, y: 0 })); throws(() => M.traceBody(p, 'ground', [{ x: 0, y: 0 }, { x: 10, y: 0 }]));
    assert(JSON.stringify(p) === before);
  });
  add('Obkreslený rám, člen, otočný kĺb a pohon fungujú s existujúcim solverom.', () => {
    let p = M.traceBody(K.preset('custom'), 'ground', [{ x: 0, y: 0 }, { x: 100, y: 0 }]), ground = p.elements[0];
    p = M.traceBody(p, 'link', [{ x: 0, y: 0 }, { x: 80, y: 0 }]); const link = p.elements[1];
    p = I.setJoint(p, { elementId: link.id, point: 'a' }, { type: 'revolute', other: { elementId: ground.id, point: 'a' }, value: 0 });
    p = I.setDriver(p, { elementId: link.id, point: 'a' }, { enabled: true, mode: 'rotary', angle: 0, speed: 20, min: 0, max: 90 });
    const result = K.solve(p, 45, { collisions: false }); assert(!result.blocked); near(result.poses[link.id].a.x, 0); near(result.poses[link.id].angle, 45);
    near(result.poses[link.id].b.x, 80 / Math.sqrt(2)); near(result.poses[link.id].b.y, -80 / Math.sqrt(2));
  });
  add('Finish vytvorí pomenovaný vlastný projekt s kalibráciou, ale bez fotografie.', () => {
    const original = M.traceBody(K.preset('custom'), 'link', [{ x: 0, y: 0 }, { x: 100, y: 0 }]), before = JSON.stringify(original), next = M.finish(original, image, scale(), '  Moja schéma  ');
    assert(next.name === 'Moja schéma' && next.id === original.id && next.kind === 'custom' && next.source.name === 'Magic import');
    assert(next.source.note.includes('200 mm / 400 px') && next.source.note.includes('perspektívu'));
    const text = X.serializeNative(next), parsed = X.parseNative(text).project;
    assert(parsed.source.name === 'Magic import' && !text.includes('blob:') && !text.includes(image.name) && !('image' in next) && JSON.stringify(original) === before);
  });
  add('Autodetekcia vloží vybrané návrhy atomicky bez pohonu a neprepíše existujúce členy.', () => {
    const p = K.preset('custom'), before = JSON.stringify(p);
    const candidates = [
      { type: 'ground', selected: true, points: [{ x: 100, y: 80 }, { x: 500, y: 80 }], width: 8, radius: 4, color: '#00aa44' },
      { type: 'link', selected: true, points: [{ x: 100, y: 80 }, { x: 100, y: 280 }], width: 10, radius: 4 },
      { type: 'rail', selected: false, points: [{ x: 300, y: 80 }, { x: 600, y: 80 }], width: 10, radius: 4 },
    ];
    const result = M.applyDetected(p, image, scale(), candidates, { connections: true });
    assert(result.project.elements.length === 2 && result.added.length === 2 && result.project.connections.length === 1);
    assert(!result.project.elements.some((e) => e.drive)); near(result.project.elements[0].length, 200);
    assert(result.project.elements[0].locked && !result.project.elements[1].locked && JSON.stringify(p) === before);
    throws(() => M.applyDetected(p, image, scale(), [...candidates, { ...candidates[0], points: [{ x: -1, y: 0 }, { x: 100, y: 0 }] }]));
    throws(() => M.applyDetected(p, image, scale(), candidates.map((c) => ({ ...c, selected: false }))));
    assert(JSON.stringify(p) === before);
  });
  add('Finish odmietne prázdny projekt, neplatný názov a zmenenú kalibráciu.', () => {
    const p = M.traceBody(K.preset('custom'), 'node', [{ x: 0, y: 0 }]), calibration = scale(), before = JSON.stringify(p);
    throws(() => M.finish(K.preset('custom'), image, calibration, 'Prázdny'));
    for (const name of ['', '  ', 'a'.repeat(81), 'Názov\n']) throws(() => M.finish(p, image, calibration, name));
    throws(() => M.finish(p, image, null, 'Bez mierky')); throws(() => M.finish(p, image, { ...calibration, mmPerPixel: 1 }, 'Zmenená'));
    assert(JSON.stringify(p) === before);
  });
  add('Obrysový návrh zachová celý konkávny obrys v mierke a odmietne neplatný polygon bez čiastočného vloženia.', () => {
    const p = K.preset('custom'), before = JSON.stringify(p), outline = [{ x: 100, y: 80 }, { x: 500, y: 80 }, { x: 500, y: 100 }, { x: 120, y: 100 }, { x: 120, y: 280 }, { x: 100, y: 280 }];
    const candidate = { type: 'ground', selected: true, points: [{ x: 100, y: 80 }, { x: 500, y: 80 }], outline, width: 8, radius: 4 };
    const next = M.applyDetected(p, image, scale(), [candidate]).project, e = next.elements[0], pose = E.design(next, 0).poses[e.id];
    assert(e.outline.length === outline.length);
    pose.outline.forEach((point, i) => { const expected = M.worldFromPixel(outline[i], scale()); near(point.x, expected.x); near(point.y, expected.y); });
    throws(() => M.applyDetected(p, image, scale(), [{ ...candidate, outline: [...outline, { x: 801, y: 50 }] }]));
    throws(() => M.applyDetected(p, image, scale(), [{ ...candidate, outline: [{ x: 100, y: 80 }, { x: 200, y: 180 }, { x: 100, y: 180 }, { x: 200, y: 80 }] }]));
    assert(JSON.stringify(p) === before);
  });
  global.KinematicsTestCases.push(...cases);
})(globalThis);
