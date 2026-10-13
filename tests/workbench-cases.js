(function (global) {
  'use strict';
  const K = global.Kinematics, E = global.KinmoEditor, I = global.KinmoInteraction, W = global.KinmoWorkbench, cases = [];
  const add = (name, run) => cases.push({ name, run });
  const assert = (value, message = 'Nesplnená podmienka') => { if (!value) throw new Error(message); };
  const near = (a, b, tolerance = .001) => assert(Number.isFinite(a) && Math.abs(a - b) <= tolerance, `${a} ≠ ${b}`);
  const throws = (fn) => { let failed = false; try { fn(); } catch { failed = true; } assert(failed, 'Očakávané odmietnutie operácie'); };
  const custom = (...elements) => K.validateProject({ ...K.preset('custom'), elements });
  const ref = (e, point = 'a') => ({ elementId: e.id, point });
  const joint = (a, b, type = 'revolute', value = 0) => ({ id: K.uid(), a, b, type, value, name: 'Skúšobná väzba' });
  add('Číselné výrazy podporujú desatinnú čiarku, zátvorky a jednotky bez eval.', () => {
    near(W.parseNumber('300/2'), 150); near(W.parseNumber('12,5 cm'), 125); near(W.parseNumber('(20+5)*2 mm'), 50);
    near(W.parseNumber('2 * (5cm + 2mm)'), 104); near(W.parseNumber('−(5+5) cm ÷ 2'), -50);
    near(W.parseNumber('.25 m + 50'), 300); near(W.parseNumber('2e-3 m'), 2);
    near(W.parseNumber(`${Math.PI} rad`, '°'), 180); near(W.parseNumber('360/2 °', '°'), 180);
    near(W.parseNumber('2 × 3', ''), 6);
    for (const value of ['', '   ', '1/0', '1e400', '1,2,3', '3 +', '(3+2', '4in', '2cm * 3cm', '100mm/2mm', 'globalThis.alert(1)', '1;throw 2', 'constructor.constructor("return 1")()', '('.repeat(13) + '1' + ')'.repeat(13), '1'.repeat(129)]) throws(() => W.parseNumber(value));
    throws(() => W.parseNumber('2 cm', '°')); throws(() => W.parseNumber('2 mm', ''));
  });
  add('Riadiaca kóta vyhodnotí výraz a zachová zvolený koniec B jedným atómovým krokom.', () => {
    const e = { ...K.makeElement('link', 10, 20), length: 100 }, p = custom(e), before = JSON.stringify(p), result = E.design(p, 0);
    const next = W.applyDimension(p, result, { a: ref(e), b: ref(e, 'b'), driving: true, value: '20 cm', fixedEnd: 'b', offset: '5/2 cm' });
    near(next.elements[0].length, 200); near(next.dimensions[0].offset, 25); assert(next.dimensions[0].control.property === 'length');
    const pose = E.design(next, 0).poses[e.id]; near(pose.b.x, result.poses[e.id].b.x); near(pose.b.y, result.poses[e.id].b.y); near(pose.a.x, -90);
    assert(JSON.stringify(p) === before);
  });
  add('Automatický zachovaný bod kóty rešpektuje pevný koniec B aj pivot pohonu B.', () => {
    const e = { ...K.makeElement('link', 0, 0), length: 100 };
    for (const p of [I.toggleFixed(custom(e), [ref(e, 'b')]), custom({ ...e, drive: true, drivePivot: 'b' })]) {
      const result = E.design(p, 0), next = W.applyDimension(p, result, { a: ref(e), b: ref(e, 'b'), driving: true, value: '300/2', fixedEnd: 'auto' });
      near(E.design(next, 0).poses[e.id].b.x, result.poses[e.id].b.x); assert(W.preferredEnd(p, e.id) === 'b');
    }
  });
  add('Riadiaca kóta počas simulácie zachová zvolený bod aj pri otočnom pivote A/B/C.', () => {
    const at = (pose, end) => end === 'center' ? { x: (pose.a.x + pose.b.x) / 2, y: (pose.a.y + pose.b.y) / 2 } : pose[end];
    for (const drivePivot of ['a', 'b', 'c']) {
      const e = { ...K.makeElement(drivePivot === 'c' ? 'panel' : 'link', 0, 0), length: 100, drive: true, drivePivot }, p = custom(e), result = K.solve(p, 45);
      for (const fixedEnd of ['a', 'b', 'center']) {
        const next = W.applyDimension(p, result, { a: ref(e), b: ref(e, 'b'), driving: true, value: '20 cm', fixedEnd }), pose = K.solve(next, 45).poses[e.id];
        near(at(pose, fixedEnd).x, at(result.poses[e.id], fixedEnd).x); near(at(pose, fixedEnd).y, at(result.poses[e.id], fixedEnd).y);
        near(pose.angle, result.poses[e.id].angle);
      }
    }
  });
  add('Riadiaca kóta počas lineárnej simulácie nepridá posuv pohonu druhýkrát.', () => {
    const e = { ...K.makeElement('link', 10, 20), angle: 30, length: 100, drive: true, driveMode: 'linear', driveAngle: 45 }, p = custom(e), range = K.driveRange(p), motion = (range.min + range.max) / 2, result = K.solve(p, motion);
    const next = W.applyDimension(p, result, { a: ref(e), b: ref(e, 'b'), driving: true, value: '150mm', fixedEnd: 'b' }), pose = K.solve(next, motion).poses[e.id];
    near(pose.b.x, result.poses[e.id].b.x); near(pose.b.y, result.poses[e.id].b.y); near(pose.angle, 30);
  });
  add('Riadiaca kóta zachová poháňaný B aj v otočenej sústave rodiča.', () => {
    const parent = { ...K.makeElement('link', 100, 50), angle: 45 }, e = { ...K.makeElement('link', 20, 10), parentId: parent.id, angle: 15, length: 100, drive: true, drivePivot: 'b' }, p = custom(parent, e), result = K.solve(p, 45);
    const next = W.applyDimension(p, result, { a: ref(e), b: ref(e, 'b'), driving: true, value: '150mm', fixedEnd: 'b' }), pose = K.solve(next, 45).poses[e.id];
    near(pose.b.x, result.poses[e.id].b.x); near(pose.b.y, result.poses[e.id].b.y); near(pose.angle, result.poses[e.id].angle);
  });
  add('Stred a koniec B zostanú pri zmene dĺžky na mieste aj v súradniciach rodiča.', () => {
    const parent = { ...K.makeElement('link', 100, 50), angle: 45 }, child = { ...K.makeElement('link', 20, 10), parentId: parent.id, angle: 30, length: 100 }, p = custom(parent, child), result = E.design(p, 0);
    const b = W.setLength(p, child.id, 150, 'b', result), pose = E.design(b, 0).poses[child.id];
    near(pose.b.x, result.poses[child.id].b.x); near(pose.b.y, result.poses[child.id].b.y);
    const center = W.setLength(p, child.id, 200, 'center', result), c = E.design(center, 0).poses[child.id], old = result.poses[child.id];
    near((c.a.x + c.b.x) / 2, (old.a.x + old.b.x) / 2); near((c.a.y + c.b.y) / 2, (old.a.y + old.b.y) / 2);
  });
  add('Vodorovná riadiaca kóta jednoduchého člena mení projekciu, nie nesprávne celú dĺžku.', () => {
    const e = { ...K.makeElement('link', 0, 0), angle: 60, length: 100 }, p = custom(e), result = E.design(p, 0);
    const next = W.applyDimension(p, result, { a: ref(e), b: ref(e, 'b'), type: 'horizontal', driving: true, value: '10cm' });
    near(next.elements[0].length, 200); near(E.dimensionValue(E.design(next, 0), next.dimensions[0]), 100); near(next.elements[0].angle, 60);
    const vertical = custom({ ...e, angle: 90 });
    throws(() => W.applyDimension(vertical, E.design(vertical, 0), { a: ref(e), b: ref(e, 'b'), type: 'horizontal', driving: true, value: '10cm' }));
  });
  add('Opakovaná úprava riadiacej väzby zachová jej ID a vypnutie riadenia odstráni iba vlastnú väzbu.', () => {
    const e = K.makeElement('node', 0, 0), f = K.makeElement('node', 100, 0), p = custom(e, f);
    const first = W.applyDimension(p, E.design(p, 0), { a: ref(e), b: ref(f), driving: true, value: '80mm' }), d = first.dimensions[0];
    const second = W.applyDimension(first, E.design(first, 0), { id: d.id, a: ref(e), b: ref(f), driving: true, value: '120/2' });
    assert(second.connections.length === 1 && second.connections[0].id === d.constraintId); near(second.connections[0].value, 60);
    const third = W.applyDimension(second, E.design(second, 0), { id: d.id, a: ref(e), b: ref(f), driving: false });
    assert(third.connections.length === 0 && third.dimensions.length === 1 && !third.dimensions[0].constraintId);
    assert(I.deleteSelection(second, [I.dimensionKey(d.id)]).elements.length === 2);
    assert(I.deleteSelection(second, [I.dimensionKey(d.id)]).connections.length === 0);
    const shared = K.validateProject({ ...second, dimensions: [...second.dimensions, { ...second.dimensions[0], id: K.uid() }] });
    const onlyOneRemoved = I.deleteSelection(shared, [I.dimensionKey(d.id)]);
    assert(onlyOneRemoved.dimensions.length === 1 && onlyOneRemoved.connections.length === 1);
  });
  add('Neplatná inteligentná kóta neprepíše geometriu, ani väzbu pri zmene uzlov.', () => {
    const e = K.makeElement('link', 0, 0), f = K.makeElement('node', 300, 0), p = custom(e, f), result = E.design(p, 0), before = JSON.stringify(p);
    for (const options of [{ value: '1/0' }, { value: '-20' }, { value: '6m' }, { value: '100', offset: '60cm' }, { value: '100', type: 'angle' }, { value: '100', fixedEnd: 'invalid' }]) {
      throws(() => W.applyDimension(p, result, { a: ref(e), b: ref(e, 'b'), driving: true, ...options }));
      assert(JSON.stringify(p) === before);
    }
    const cross = W.applyDimension(p, result, { a: ref(e), b: ref(f), driving: true, value: '100' }), d = cross.dimensions[0];
    const own = W.applyDimension(cross, E.design(cross, 0), { id: d.id, a: ref(e), b: ref(e, 'b'), driving: true, value: '200', fixedEnd: 'b' });
    assert(own.connections.length === 0 && own.dimensions[0].control.elementId === e.id);
  });
  add('Analýza celého zdvihu odlíši statický projekt, polohovú chybu a uhlovú chybu.', () => {
    const p = custom(K.makeElement('link', 0, 0)), samples = K.sample(p, 121, { collisions: false }), report = W.analyzeSweep(p, samples);
    assert(!report.hasDrive && report.count === 121 && report.blocked === 0);
    near(report.bodies[0].spanX, 0); near(report.bodies[0].path, 0); near(report.positionResidual, 0); near(report.angularResidual, 0);
    throws(() => W.analyzeSweep(p, [])); throws(() => W.analyzeSweep(p, [{ motion: NaN, poses: {} }, samples[0]]));
  });
  add('Analýza neprehltne plnú otáčku pri prechode cez ±180 stupňov.', () => {
    const e = { ...K.makeElement('link', 0, 0), drive: true, length: 100 }, p = custom(e), report = W.analyzeSweep(p, K.sample(p, 121, { collisions: false }));
    near(report.bodies[0].angleMax - report.bodies[0].angleMin, 360);
    near(report.bodies[0].spanX, 200); near(report.bodies[0].spanY, 200);
    near(report.bodies[0].path, 2 * Math.PI * 100, .1); assert(report.hasDrive);
  });
  add('Analýza zoskupí kritické polohy nepriechodného mechanizmu bez úprav geometrie.', () => {
    const p = K.preset('fourbar'); p.parameters.groundLength = 1000; p.parameters.crankLength = 30; p.parameters.couplerLength = 10; p.parameters.rockerLength = 40;
    const before = JSON.stringify(p), report = W.analyzeSweep(p, K.sample(p, 121, { collisions: false }));
    assert(report.blocked === 121 && report.blocks.length === 1); near(report.blocks[0].start, 0); near(report.blocks[0].end, 360);
    assert(JSON.stringify(p) === before);
  });

  add('Úchyt X/Y presúva celý člen aj pri výbere jeho koncového bodu.', () => {
    const e = K.makeElement('link', 10, 20), original = custom(e), next = W.transform(original, [I.nodeKey(ref(e, 'b'))], { dx: 25, dy: -8 });
    near(next.elements[0].x, 35); near(next.elements[0].y, 12); near(next.elements[0].length, e.length); near(original.elements[0].x, 10);
  });
  add('Otočný úchyt zachová zvolený bod a používa správny smer osi Y.', () => {
    const e = K.makeElement('link', 10, 20), original = custom(e), result = E.design(original, 0);
    const next = W.transform(original, [I.elementKey(e.id)], { angle: 90, pivot: result.poses[e.id].b }), pose = E.design(next, 0).poses[e.id];
    near(pose.b.x, result.poses[e.id].b.x); near(pose.b.y, result.poses[e.id].b.y); near(pose.a.y, 140);
  });
  add('Skupinové úchyty neaplikujú transformáciu na neseného potomka dvakrát.', () => {
    const parent = K.makeElement('link', 10, 20), child = { ...K.makeElement('link', 5, 7), parentId: parent.id }, p = custom(parent, child);
    const before = E.design(p, 0).poses[child.id].a, next = W.transform(p, [I.elementKey(child.id), I.elementKey(parent.id)], { dx: 30, dy: 9 });
    const after = E.design(next, 0).poses[child.id].a;
    near(after.x, before.x + 30); near(after.y, before.y + 9); near(next.elements[1].x, 5);
  });
  add('Otočenie potomka prepočíta jeho lokálnu polohu voči nezvolenému rodičovi.', () => {
    const parent = { ...K.makeElement('link', 60, 40), angle: 35 }, child = { ...K.makeElement('link', 12, 8), parentId: parent.id, angle: 20 };
    const p = custom(parent, child), result = E.design(p, 0), origin = result.poses[child.id].b;
    const next = W.transform(p, [I.elementKey(child.id)], { angle: 25, pivot: origin }), pose = E.design(next, 0).poses[child.id];
    near(pose.b.x, origin.x); near(pose.b.y, origin.y); near(pose.angle, 80);
  });
  add('Úchyty odmietajú zamknuté členy, chránený originál a nečíselné hodnoty.', () => {
    const e = { ...K.makeElement('link'), locked: true }, p = custom(e);
    throws(() => W.transform(p, [I.elementKey(e.id)], { dx: 1 }));
    throws(() => W.transform(custom({ ...e, locked: false }), [I.elementKey(e.id)], { angle: NaN }));
    const original = K.preset('fourbar');
    throws(() => W.transform(original, [I.elementKey('input-1')], { dx: 1 }));
    throws(() => W.setLength(p, e.id, 40));
  });
  add('Dĺžkový úchyt zachová koniec B, montážny pivot a platnú rodičovskú geometriu.', () => {
    const parent = { ...K.makeElement('link', 10, 20), angle: 45 }, e = { ...K.makeElement('link', 15, 25), parentId: parent.id, length: 100 };
    const p = custom(parent, e), before = E.design(p, 0).poses[e.id].b, next = W.setLength(p, e.id, 150, 'b'), pose = E.design(next, 0).poses[e.id];
    near(pose.b.x, before.x); near(pose.b.y, before.y); near(pose.length, 150);
    throws(() => W.setLength(p, e.id, 0)); throws(() => W.setLength(p, e.id, 5001));
  });
  add('Úchyty premiestnia skryté ukotvenie spolu s návrhovým bodom.', () => {
    const e = K.makeElement('link', 0, 0), p = I.toggleFixed(custom(e), [ref(e)]);
    const next = W.transform(p, [I.elementKey(e.id)], { dx: 20, angle: 30, pivot: { x: 0, y: 0 } }), pose = K.solve(next, 0, { collisions: false });
    near(pose.poses[e.id].a.x, 20); assert(!pose.blocked);
    const anchor = next.elements.find((e) => e.role === 'canvas-anchor'); near(anchor.x, 20);
  });
  add('Diagnostika rozlišuje odchýlku vzdialenosti v mm a relatívny uhol v stupňoch.', () => {
    const a = { ...K.makeElement('link', 0, 0), locked: true }, b = { ...K.makeElement('link', 12, 0), locked: true, angle: 7 };
    const p = custom(a, b); p.connections = [joint(ref(a), ref(b), 'fixed', 2)];
    const row = W.constraints(p, E.design(p, 0))[0];
    near(row.mm, 12); near(row.degrees, 5); assert(row.status === 'error');
    p.connections[0].type = 'distance'; p.connections[0].value = 10;
    near(W.constraints(p, E.design(p, 0))[0].mm, 2);
  });
  add('Diagnostika priamky a dorazu meria aj pozdĺžne prekročenie bez fiktívnej rotácie bodu.', () => {
    const rail = { ...K.makeElement('rail', 0, 0), drive: false, length: 100 }, e = K.makeElement('node', 80, 4), p = custom(rail, e);
    p.connections = [{ ...joint(ref(rail, 'curve'), ref(e), 'prismatic'), limitMin: 10, limitMax: 50 }];
    const row = W.constraints(p, E.design(p, 0))[0]; near(row.mm, Math.hypot(30, 4)); near(row.degrees, 0);
  });
  add('Diagnostika vysvetlí voľný člen, chýbajúci pohon, opakovanú a konfliktnú väzbu.', () => {
    const a = K.makeElement('node', 0, 0), b = K.makeElement('node', 10, 0), p = custom(a, b);
    const free = W.diagnose(p, E.design(p, 0)); assert(free.freedom.free === 4 && free.hints.some((h) => h.includes('Chýba priradený pohon')));
    p.connections = [joint(ref(a), ref(b), 'distance', 10), joint(ref(b), ref(a), 'distance', 10), joint(ref(a), ref(b), 'distance', 20)];
    const result = W.diagnose(p, E.design(p, 0)); assert(result.duplicates.length === 1 && result.conflicts.length === 1);
  });
  add('Symbolické bodové väzby šablóny sa nevydávajú za namerané chybné kĺby.', () => {
    const p = K.preset('drawer'), rows = W.constraints(p, K.solve(p, 80));
    assert(rows.some((r) => r.prescribed)); assert(rows.filter((r) => r.prescribed).every((r) => r.mm === null && r.degrees === null));
  });
  add('Solver pomenúva neplatnú väzbu a nevydáva stupne za milimetre.', () => {
    const a = { ...K.makeElement('link', 0, 0), locked: true }, b = { ...K.makeElement('link', 0, 0), locked: true, angle: 30 }, p = custom(a, b);
    p.connections = [joint(ref(a), ref(b), 'angle', 10)];
    const result = K.solve(p, 0, { collisions: false });
    assert(result.blocked && result.issues.some((issue) => issue.includes('Skúšobná väzba') && issue.includes('20.00°')));
    near(W.constraints(p, result)[0].mm, 0); near(result.positionResidual, 0); near(result.angularResidual, 20); near(result.residual, 20);
  });
  add('Solver zachová oddelené chyby mm/° aj pri kombinovanej pevnej väzbe a návrhovej polohe.', () => {
    const a = { ...K.makeElement('link', 0, 0), locked: true }, b = { ...K.makeElement('link', 12, 0), locked: true, angle: 7 }, p = custom(a, b);
    p.connections = [joint(ref(a), ref(b), 'fixed', 2)];
    const result = K.solve(p, 0, { collisions: false }), design = E.design(p, 0);
    near(result.positionResidual, 12); near(result.angularResidual, 5); near(result.residual, 12);
    near(design.positionResidual, 0); near(design.angularResidual, 0);
  });
  add('Analytická šablóna má polohovú chybu oddelene od uhlovej chyby pridaného člena.', () => {
    const p = K.preset('fourbar'), a = { ...K.makeElement('link', 0, 0), locked: true }, b = { ...K.makeElement('link', 0, 0), locked: true, angle: 30 };
    p.elements.push(a, b); p.connections.push(joint(ref(a), ref(b), 'angle', 10));
    const result = K.solve(p, 0, { collisions: false });
    near(result.positionResidual, 0); near(result.angularResidual, 20);
  });
  add('Úplné otáčky pohonu nevytvárajú fiktívnu uhlovú chybu ani blokovanie.', () => {
    const a = { ...K.makeElement('link', 0, 0), drive: true, angle: 360 }, b = { ...K.makeElement('link', 0, 0), locked: true }, p = custom(a, b);
    p.connections = [joint(ref(a), ref(b), 'angle')];
    const result = K.solve(p, 360, { collisions: false }), row = W.constraints(p, result)[0];
    near(result.poses[a.id].angle, 720); near(result.angularResidual, 0); near(row.degrees, 0);
    assert(!result.blocked && row.status === 'ok');
  });
  add('Uhlové väzby vyhodnotia kladné aj záporné úplné otáčky rovnako ako diagnostika.', () => {
    for (const type of ['angle', 'parallel', 'fixed']) for (const turns of [-12, -3, -2, -1, 0, 1, 2, 3, 12]) for (const error of [0, 7]) {
      const value = type === 'parallel' ? 0 : 17;
      const a = { ...K.makeElement('link', 0, 0), locked: true, angle: turns * 360 }, b = { ...K.makeElement('link', 0, 0), locked: true, angle: value + error }, p = custom(a, b);
      p.connections = [joint(ref(a), ref(b), type, value)];
      const result = K.solve(p, 0, { collisions: false }), row = W.constraints(p, result)[0];
      near(result.positionResidual, 0); near(result.angularResidual, error); near(row.degrees, error);
      assert(result.blocked === !!error && row.status === (error ? 'error' : 'ok'));
    }
  });
  add('Projekcia uhlovej väzby nepridá zbytočnú celú otáčku voľnému ramenu.', () => {
    for (const motion of [-720, 720]) for (const start of [10, -90]) {
      const a = { ...K.makeElement('link', 0, 0), drive: true }, b = { ...K.makeElement('link', 0, 0), angle: start }, p = custom(a, b);
      Object.assign(p.parameters, { rotationMin: -720, rotationMax: 720 });
      p.connections = [joint(ref(a), ref(b), 'angle', 10)];
      const result = K.solve(p, motion, { collisions: false });
      near(result.poses[b.id].angle, 10); near(result.angularResidual, 0); assert(!result.blocked);
    }
  });
  add('Posuvné vedenie pri úplných otáčkach zachová správnu uhlovú odchýlku.', () => {
    for (const turns of [-3, 3]) {
      const rail = { ...K.makeElement('rail', 0, 0), drive: false, angle: turns * 360 }, e = { ...K.makeElement('link', 0, 0), locked: true, angle: 25 }, p = custom(rail, e);
      p.connections = [joint(ref(rail, 'curve'), ref(e), 'prismatic', 25)];
      const result = K.solve(p, 0, { collisions: false });
      near(result.angularResidual, 0); near(W.constraints(p, result)[0].degrees, 0); assert(!result.blocked);
    }
  });
  add('Dorazy zachovajú znamienko hranice 180° aj po viacerých otáčkach.', () => {
    for (const sign of [-1, 1]) {
      const a = { ...K.makeElement('link', 0, 0), locked: true }, b = { ...K.makeElement('link', 0, 0), locked: true, angle: sign * 540 }, p = custom(a, b);
      p.connections = [{ ...joint(ref(a), ref(b)), limitMin: sign > 0 ? 170 : -180, limitMax: sign > 0 ? 180 : -170 }];
      const result = K.solve(p, 0, { collisions: false });
      near(result.angularResidual, 0); near(W.constraints(p, result)[0].degrees, 0); assert(!result.blocked);
    }
  });
  add('Porovnanie dvojkulisovej zásuvky nezamení zadnú 8 mm drážku za hlavné kulisy.', () => {
    const before = K.preset('double-drawer'), after = K.copy(before); after.parameters.slotWidth += 2;
    const rows = W.compareDimensions(before, after), rear = rows.find((r) => r.key === 'element:rear-slot:slotWidth');
    near(rear.before, 8); near(rear.after, 8); assert(rear.status === 'same');
    assert(rows.some((r) => r.key === 'element:slot-1:slotWidth' && r.delta === 2));
  });
  add('Inteligentné prichytávanie je predvolene vypnuté a nemení projekt.', () => {
    const a = K.makeElement('node', 0, 0), b = K.makeElement('node', 25, 30), p = custom(a, b), before = JSON.stringify(p);
    assert(W.findSnap(p, [I.nodeKey(ref(a))], E.design(p, 0), { x: 24, y: 29 }) === null);
    assert(JSON.stringify(p) === before);
  });
  add('Zapnuté prichytávanie nájde koncový bod bez vytvorenia väzby.', () => {
    const a = K.makeElement('node', 0, 0), b = K.makeElement('node', 25, 30), p = custom(a, b);
    const snap = W.findSnap(p, [I.nodeKey(ref(a))], E.design(p, 0), { x: 24, y: 29 }, { enabled: true, tolerance: 3 });
    assert(snap.kind === 'endpoint'); near(snap.delta.x, 25); near(snap.delta.y, 30); assert(!p.connections.length);
  });
  add('Stred člena je presný cieľ; nesený stredový uzol vznikne až po potvrdení.', () => {
    const a = K.makeElement('node', 0, 0), b = { ...K.makeElement('link', 100, 50), length: 100 }, p = custom(a, b), keys = [I.nodeKey(ref(a))];
    const snap = W.findSnap(p, keys, E.design(p, 0), { x: 148, y: 49 }, { enabled: true, tolerance: 3 });
    assert(snap.kind === 'midpoint'); near(snap.point.x, 150); assert(p.elements.length === 2);
    const moved = I.translate(p, keys, snap.delta), connected = W.connectSnap(moved, snap);
    assert(moved.elements.length === 2 && !moved.connections.length);
    assert(connected.elements.length === 3 && connected.connections.length === 1 && connected.elements[2].parentId === b.id);
  });
  add('Krivka vedenia ponúka skutočný posuvný kĺb a zachová orientáciu ramena.', () => {
    const e = { ...K.makeElement('link', 20, 20), angle: 30, length: 100 }, rail = { ...K.makeElement('rail', 0, 0), drive: false, length: 100 }, p = custom(e, rail), keys = [I.elementKey(e.id)];
    const snap = W.findSnap(p, keys, E.design(p, 0), { x: 5, y: -18 }, { enabled: true, tolerance: 3, cursor: { x: 20, y: 20 } });
    assert(snap.kind === 'guide'); near(snap.delta.y, -20);
    const moved = I.translate(p, keys, snap.delta), connected = W.connectSnap(moved, snap);
    assert(connected.connections[0].type === 'prismatic'); near(connected.connections[0].value, -30);
    near(K.solve(connected, 0, { collisions: false }).poses[e.id].angle, 30);
  });
  add('Osové zarovnanie mení iba zvolenú súradnicu a nemôže vytvoriť kĺb.', () => {
    const a = K.makeElement('node', 0, 20), b = K.makeElement('node', 25, 80), p = custom(a, b);
    const snap = W.findSnap(p, [I.nodeKey(ref(a))], E.design(p, 0), { x: 24, y: 0 }, { enabled: true, tolerance: 3 });
    assert(snap.kind === 'alignment-x'); near(snap.delta.x, 25); near(snap.delta.y, 0);
    throws(() => W.connectSnap(p, snap));
  });
  add('Úchyt osi ignoruje cieľ, ktorý by potreboval zmenu druhej súradnice.', () => {
    const a = K.makeElement('node', 0, 20), b = K.makeElement('node', 25, 22), p = custom(a, b);
    const snap = W.findSnap(p, [I.nodeKey(ref(a))], E.design(p, 0), { x: 24, y: 0 }, { enabled: true, wholeBodies: true, tolerance: 3, axis: 'x' });
    assert(snap === null);
  });
  add('Prichytávanie ignoruje vlastné teleso, nesených potomkov a skryté ciele.', () => {
    const a = K.makeElement('link', 0, 0), child = { ...K.makeElement('node', 20, 0), parentId: a.id }, hidden = { ...K.makeElement('node', 21, 0), visible: false }, p = custom(a, child, hidden);
    assert(W.findSnap(p, [I.elementKey(a.id)], E.design(p, 0), { x: 1, y: 0 }, { enabled: true }) === null);
    assert(W.findSnap(p, [I.nodeKey(ref(child))], E.design(p, 0), { x: 1, y: 0 }, { enabled: true }) === null);
  });
  add('Potvrdenie dvoch skutočných bodov vytvorí jedinú otočnú väzbu.', () => {
    const a = K.makeElement('node', 0, 0), b = K.makeElement('node', 25, 30), p = custom(a, b), keys = [I.nodeKey(ref(a))];
    const snap = W.findSnap(p, keys, E.design(p, 0), { x: 24, y: 29 }, { enabled: true, tolerance: 3 }), moved = I.translate(p, keys, snap.delta), next = W.connectSnap(moved, snap);
    assert(next.connections.length === 1 && next.connections[0].type === 'revolute');
    throws(() => W.connectSnap(next, snap)); assert(!moved.connections.length);
  });
  add('Starý náhľad po zmene cieľa odmietne spoj bez čiastočnej zmeny modelu.', () => {
    const a = K.makeElement('node', 0, 0), b = K.makeElement('node', 25, 30), p = custom(a, b), keys = [I.nodeKey(ref(a))];
    const snap = W.findSnap(p, keys, E.design(p, 0), { x: 24, y: 29 }, { enabled: true, tolerance: 3 });
    const moved = I.translate(p, keys, snap.delta); moved.elements[1].x = 40;
    const before = JSON.stringify(moved); throws(() => W.connectSnap(moved, snap)); assert(JSON.stringify(moved) === before);
  });
  add('Tolerancia prichytávania je explicitná a nečíselný posun sa odmietne.', () => {
    const a = K.makeElement('node', 0, 0), b = K.makeElement('node', 25, 30), p = custom(a, b), keys = [I.nodeKey(ref(a))];
    assert(W.findSnap(p, keys, E.design(p, 0), { x: 20, y: 25 }, { enabled: true, tolerance: 2 }) === null);
    throws(() => W.findSnap(p, keys, E.design(p, 0), { x: NaN, y: 0 }, { enabled: true }));
  });
  add('Prichytenie na stredovú os ramena funguje aj mimo jeho stredu a bez väzby.', () => {
    const node = K.makeElement('node', 0, 0), body = { ...K.makeElement('link', 100, 80), length: 160, angle: 35 }, p = custom(node, body);
    const at = K.along({ x: 100, y: 80 }, 53, 35), normal = K.rotate({ x: 0, y: 2 }, 35);
    const snap = W.findSnap(p, [I.nodeKey(ref(node))], E.design(p, 0), { x: at.x + normal.x, y: at.y + normal.y }, { enabled: true, tolerance: 3 });
    assert(snap.kind === 'axis'); near(snap.point.x, at.x); near(snap.point.y, at.y);
    throws(() => W.connectSnap(p, snap)); assert(!p.connections.length);
  });
  add('Pružina je cieľom prichytenia cez montážne body aj svoju os.', () => {
    const node = K.makeElement('node', 0, 0), spring = K.makeElement('spring-extension', 100, 80), p = custom(node, spring);
    const endpoint = W.findSnap(p, [I.nodeKey(ref(node))], E.design(p, 0), { x: 100 + spring.length - 1, y: 79 }, { enabled: true, tolerance: 3 });
    assert(endpoint.kind === 'endpoint' && endpoint.target.ref.elementId === spring.id && endpoint.target.ref.point === 'b');
    const axis = W.findSnap(p, [I.nodeKey(ref(node))], E.design(p, 0), { x: 137, y: 82 }, { enabled: true, tolerance: 3 });
    assert(axis.kind === 'axis'); near(axis.point.y, 80);
  });
  add('Voľný koniec pružiny sa prichytí a potvrdená montáž sleduje nosný bod.', () => {
    const spring = K.makeElement('spring-extension', 0, 0), node = K.makeElement('node', 160, 40), p = custom(spring, node), keys = [I.nodeKey(ref(spring, 'b'))];
    const snap = W.findSnap(p, keys, E.design(p, 0), { x: node.x - spring.length - 1, y: 39 }, { enabled: true, tolerance: 3 });
    assert(snap.kind === 'endpoint');
    const moved = I.translate(p, keys, snap.delta), connected = W.connectSnap(moved, snap);
    assert(K.elasticMount(connected, connected.elements[0], 'b').elementId === node.id);
    near(E.design(connected, 0).poses[spring.id].b.y, 40); assert(!p.connections.length);
  });
  add('Prichytenie na vrch a spodok vozíka používa otočené pohyblivé montážne body.', () => {
    const rail = { ...K.makeElement('rail', 100, 80), drive: true, angle: 30, carriageOffset: 20 }, node = K.makeElement('node', 0, 0), p = custom(node, rail);
    const result = E.design(p, 150), cart = result.poses[rail.id];
    assert(I.pointKeys(rail).includes('ct') && I.pointKeys(rail).includes('cb'));
    near(K.distance(cart.c, cart.ct), 15); near(K.distance(cart.c, cart.cb), 15);
    const snap = W.findSnap(p, [I.nodeKey(ref(node))], result, { x: cart.ct.x + 1, y: cart.ct.y + 1 }, { enabled: true, tolerance: 3 });
    assert(snap.kind === 'endpoint' && snap.target.ref.point === 'ct');
    assert(I.status(p, ref(rail, 'ct')) === 'driven');
    const joined = I.setJoint(p, ref(node), { type: 'revolute', other: ref(rail, 'cb') });
    const first = K.solve(joined, 0, { collisions: false }), last = K.solve(joined, 300, { collisions: false });
    assert(!first.blocked && !last.blocked); near(K.distance(first.poses[node.id].a, last.poses[node.id].a), rail.stroke);
  });
  add('Vozík sa prichytí k rámu a potvrdené pevné spojenie funguje s pohyblivým vedením.', () => {
    for (const atMotion of [0, 150]) {
    const rail = { ...K.makeElement('rail', 30, 80), angle: 30, carriageOffset: 20 }, ground = K.makeElement('ground', 120, 150), p = custom(rail, ground), before = JSON.stringify(p);
    const result = E.design(p, atMotion), from = result.poses[rail.id].ct, target = result.poses[ground.id].a;
    const keys = [I.nodeKey(ref(rail, 'ct'))], snap = W.findSnap(p, keys, result, { x: target.x - from.x + .5, y: target.y - from.y + .5 }, { enabled: true, tolerance: 2 });
    assert(snap?.source.ref.point === 'ct' && snap.target.ref.point === 'a');
    const moved = I.translate(p, keys, snap.delta, result), pose = E.design(moved, atMotion);
    near(K.distance(pose.poses[rail.id].ct, target), 0);
    const connected = W.connectSnap(moved, snap, 'fixed'), reverse = I.setRailMotion(connected, rail.id, true, pose);
    assert(connected.connections[0].type === 'fixed');
    const displayed = E.design(reverse, atMotion), movedRail = W.transform(reverse, [I.elementKey(rail.id)], { dx: 12, dy: 7 }, displayed), afterMove = E.design(movedRail, atMotion);
    near(afterMove.poses[rail.id].a.x, displayed.poses[rail.id].a.x + 12); near(afterMove.poses[rail.id].a.y, displayed.poses[rail.id].a.y + 7);
    for (const motion of [0, 150, 300]) {
      const sample = K.solve(reverse, motion, { collisions: false }); assert(!sample.blocked);
      near(K.distance(sample.poses[rail.id].ct, target), 0);
    }
    assert(JSON.stringify(p) === before);
    }
  });
  add('Viditeľná trajektória je geometrický cieľ, nie automatická kinematická väzba.', () => {
    const node = K.makeElement('node', 0, 0), p = custom(node);
    const snap = W.findSnap(p, [I.nodeKey(ref(node))], E.design(p, 0), { x: 38, y: 41 }, { enabled: true, tolerance: 3, paths: [{ id: 'trace', points: [{ x: 20, y: 40 }, { x: 90, y: 40 }] }] });
    assert(snap.kind === 'trajectory'); near(snap.point.x, 38); near(snap.point.y, 40);
    throws(() => W.connectSnap(p, snap));
  });
  add('Nový vložený prvok používa rovnaké geometrické prichytenie bez mutácie projektu.', () => {
    const body = { ...K.makeElement('link', 100, 80), length: 160 }, p = custom(body), node = K.makeElement('node', 137, 82), before = JSON.stringify(p);
    const snap = W.findPlacementSnap(p, node, { enabled: true, tolerance: 3 });
    assert(snap.kind === 'axis'); near(snap.delta.x, 0); near(snap.delta.y, -2); assert(JSON.stringify(p) === before);
    assert(W.findPlacementSnap(p, node, { enabled: false }) === null);
  });
  add('Vačka má uzavretý radiálny profil, presnú rotáciu a prenositeľné parametre.', () => {
    const cam = { ...K.makeElement('cam', 30, 40), radius: 25, camLift: 15, camPhase: 0, drive: true }, p = custom(cam);
    assert(K.TYPES.includes('cam'));
    assert(K.pointKeys(cam).join() === 'a'); throws(() => custom({ ...cam, drivePivot: 'b' }));
    const range = K.driveRange(p); assert(range.unit === '°'); near(range.max, 360); near(K.solve(p, 360).motion, 360);
    const report = W.analyzeSweep(p, K.sample(p, 121, { collisions: false }));
    assert(report.bodies[0].reference === 'a'); near(report.bodies[0].angleMax, 360);
    const zero = K.solve(p, 0, { collisions: false }).poses[cam.id], quarter = K.solve(p, 90, { collisions: false }).poses[cam.id];
    near(K.distance(zero.path[0], zero.path.at(-1)), 0); near(K.distance(zero.a, zero.path[0]), 25);
    near(Math.max(...zero.path.map((v) => K.distance(zero.a, v))), 40);
    near(quarter.a.x, 30); near(quarter.a.y, 40);
    const rotated = K.worldPoint({ a: zero.a, angle: 90 }, K.localPoint({ a: zero.a, angle: 0 }, zero.path[30]));
    near(quarter.path[30].x, rotated.x); near(quarter.path[30].y, rotated.y);
    const restored = K.validateProject(JSON.parse(JSON.stringify(p))).elements[0];
    near(restored.camLift, 15); near(restored.camPhase, 0);
  });
  add('Vačkový valček ostáva mimo profilu a v lineárnom vedení počas celého cyklu.', () => {
    const cam = { ...K.makeElement('cam', 120, 140), drive: true }, p = I.addCamFollower(custom(cam), cam.id), before = JSON.stringify(p);
    const roller = p.elements.find((e) => e.type === 'bearing'), slider = p.elements.find((e) => e.role === 'cam-slider');
    const samples = K.sample(p, 121, { collisions: false }), positions = [];
    for (const sample of samples) {
      assert(!sample.blocked, sample.issues.join('; '));
      const body = sample.poses[cam.id], at = sample.poses[roller.id].a;
      near(at.x, cam.x, .01); near(K.nearestOnPath(at, body.path).distance, roller.radius, .01);
      assert(!K.pointInPolygon(at, body.path)); near(sample.poses[slider.id].angle, 90, .01);
      assert(W.constraints(p, sample).every((row) => row.status === 'ok'));
      positions.push(at.y);
    }
    assert(Math.max(...positions) - Math.min(...positions) > 15);
    assert(E.freedom(p, samples[0]).free === 0); assert(JSON.stringify(p) === before);
  });
  add('Vačkový kontakt používa skutočný polomer valčeka, nie jeho stred na obryse.', () => {
    const cam = { ...K.makeElement('cam', 0, 100), radius: 30, camLift: 0, drive: true };
    let p = I.addCamFollower(custom(cam), cam.id), roller = p.elements.find((e) => e.type === 'bearing');
    roller.radius = 10; p = K.validateProject(p);
    for (const motion of [0, 90, 180, 270, 360]) {
      const result = K.solve(p, motion, { collisions: false }); assert(!result.blocked);
      near(K.distance(result.poses[roller.id].a, result.poses[cam.id].a), 40, .01);
    }
    const impossible = K.copy(p);
    const slider = impossible.elements.find((e) => e.role === 'cam-slider'); slider.locked = true; slider.y += 20;
    assert(K.solve(K.validateProject(impossible), 0, { collisions: false }).blocked);
  });
  add('Vačkový kontakt odmieta bod bez valčeka, bežnú drážku a strednicovú náhradu.', () => {
    const cam = K.makeElement('cam'), roller = K.makeElement('bearing'), node = K.makeElement('node'), slot = K.makeElement('slot'), p = custom(cam, roller, node, slot);
    const curve = ref(cam, 'curve'), contact = joint(ref(roller), curve, 'cam-contact');
    K.validateProject({ ...p, connections: [contact] });
    throws(() => K.validateProject({ ...p, connections: [{ ...contact, a: ref(node) }] }));
    throws(() => K.validateProject({ ...p, connections: [{ ...contact, b: ref(slot, 'curve') }] }));
    throws(() => K.validateProject({ ...p, connections: [{ ...contact, type: 'point-path' }] }));
    throws(() => custom({ ...cam, camLift: -1 }));
    throws(() => custom({ ...cam, drive: true, driveMode: 'linear' }));
  });
  add('Vačka bez ukotvenia má tri voľné súradnice a kontakt nepredstiera dynamiku.', () => {
    const cam = K.makeElement('cam'), p = custom(cam); assert(E.freedom(p, E.design(p, 0)).free === 3);
    const driven = I.setDriver(p, ref(cam), { enabled: true, mode: 'rotary', min: 0, max: 360, speed: 30 });
    const contact = I.addCamFollower(driven, cam.id);
    throws(() => global.KinmoPhysics.prepare(contact, { collisions: false }));
  });
  add('Prichytávanie valčeka na vačku zachová jeho polomer a kontakt čaká na potvrdenie.', () => {
    const cam = { ...K.makeElement('cam', 100, 100), camLift: 0, radius: 30 }, roller = K.makeElement('bearing', 0, 0), p = custom(cam, roller), keys = [I.nodeKey(ref(roller))];
    const snap = W.findSnap(p, keys, E.design(p, 0), { x: 100, y: 65 }, { enabled: true, tolerance: 3 });
    assert(snap.kind === 'cam-contact'); assert(snap.label.includes('valček'));
    const moved = I.translate(p, keys, snap.delta), connected = W.connectSnap(moved, snap);
    assert(!moved.connections.length && connected.connections[0].type === 'cam-contact');
    near(K.nearestOnPath(E.design(moved, 0).poses[roller.id].a, E.design(moved, 0).poses[cam.id].path).distance, roller.radius, .01);
  });
  add('Knižnica zachová vybrané celé členy, potomkov a vnútorné väzby bez zmeny zdroja.', () => {
    const a = K.makeElement('link', 10, 20), b = K.makeElement('link', 130, 20), poi = { ...K.makeElement('node', 40, 0), parentId: a.id }, outside = K.makeElement('node', 300, 300), p = custom(a, b, poi, outside);
    p.connections = [joint(ref(a, 'b'), ref(b)), joint(ref(b, 'b'), ref(outside))];
    const before = JSON.stringify(p), record = W.captureAssembly(p, [I.elementKey(a.id), I.elementKey(b.id)], 'Moja podzostava'), copy = record.file.project;
    assert(copy.elements.length === 3 && copy.connections.length === 1 && copy.elements.some((e) => e.parentId === a.id));
    assert(copy.id !== p.id && record.projectId === p.id && JSON.stringify(p) === before);
  });
  add('Výber kĺbu uloží obe telesá a skryté ukotvenie sa nestratí.', () => {
    const a = K.makeElement('link', 10, 20), b = K.makeElement('link', 130, 20), p = I.toggleFixed(custom(a, b), [ref(a)]);
    p.connections.push(joint(ref(a, 'b'), ref(b)));
    const r = W.captureAssembly(p, [I.jointKey(p.connections.at(-1).id)], 'Ukotvená dvojica');
    assert(r.file.project.elements.length === 3 && r.file.project.connections.length === 2);
    assert(r.file.project.elements.some((e) => e.role === 'canvas-anchor'));
  });
  add('Samostatne kopírovaný potomok sa odpojí pri zachovaní svetovej geometrie.', () => {
    const parent = { ...K.makeElement('link', 30, 50), angle: 35 }, child = { ...K.makeElement('link', 10, 20), parentId: parent.id, parentPoint: 'b', angle: 15 }, p = custom(parent, child);
    const record = W.captureAssembly(p, [I.elementKey(child.id)], 'Potomok'), element = record.file.project.elements[0];
    assert(!element.parentId); near(element.x, 0); near(element.y, 0); near(element.angle, 50);
  });
  add('Vonkajšie montáže pružiny a nevybrané kulisy sa vyčistia, nie ponechajú ako poškodené odkazy.', () => {
    const a = K.makeElement('node', 30, 50), b = K.makeElement('node', 200, 50), spring = { ...K.makeElement('spring-extension', 10, 20), mountA: ref(a), mountB: ref(b) }, slot = K.makeElement('slot'), bearing = { ...K.makeElement('bearing', 80, 0), slotId: slot.id }, p = custom(a, b, spring, slot, bearing);
    const r = W.captureAssembly(p, [I.elementKey(spring.id), I.nodeKey(ref(bearing))], 'Samostatné prvky');
    const elastic = r.file.project.elements.find(K.isElastic), follower = r.file.project.elements.find((e) => e.type === 'bearing');
    assert(!elastic.mountA && !elastic.mountB && !follower.slotId); near(elastic.length, 170);
    K.validateProject(r.file.project);
  });
  add('Vloženie knižnice remapuje všetky identity, kóty, riadiace väzby a dráhy.', () => {
    const a = K.makeElement('node', 0, 0), b = K.makeElement('node', 100, 0), p = custom(a, b), connection = joint(ref(a), ref(b), 'distance', 100);
    p.connections = [connection];
    p.dimensions = [{ id: K.uid(), type: 'distance', a: ref(a), b: ref(b), offset: 20, constraintId: connection.id, name: 'Rozstup', visible: true }];
    p.trajectories = [{ id: K.uid(), name: 'Bod', reference: ref(b), visible: true, space: 'world', color: '#123456' }];
    const record = W.captureAssembly(p, [I.nodeKey(ref(a)), I.nodeKey(ref(b))], 'Dvojica'), inserted = W.insertAssembly(custom(), record, { x: 300, y: 100 });
    assert(inserted.elements.every((e) => !p.elements.some((old) => old.id === e.id)));
    assert(inserted.dimensions[0].constraintId === inserted.connections[0].id);
    assert(inserted.trajectories[0].reference.elementId === inserted.elements[1].id);
    const again = W.insertAssembly(inserted, record, { x: 500, y: 100 });
    assert(new Set(again.elements.map((e) => e.id)).size === 4 && again.connections.length === 2);
    assert(record.file.project.connections[0].id === connection.id);
  });
  add('Svetové konce kóty sa presúvajú so súradnicovým rámcom podzostavy.', () => {
    const e = K.makeElement('link', 50, 70), p = custom(e);
    p.dimensions = [{ id: K.uid(), type: 'distance', a: ref(e), b: { x: 80, y: 110 }, visible: true, name: 'Svetová', offset: 10 }];
    const r = W.captureAssembly(p, [I.elementKey(e.id)], 'S kótou'), next = W.insertAssembly(custom(), r, { x: 200, y: 300 });
    near(next.dimensions[0].b.x, 230); near(next.dimensions[0].b.y, 340);
    near(E.dimensionValue(E.design(next, 0), next.dimensions[0]), 50);
  });
  add('Vloženie prvého pohonu prevezme rozsah; ďalšia podzostava ostane pasívna.', () => {
    const driver = { ...K.makeElement('link', 10, 20), drive: true, driveMode: 'rotary' }, p = custom(driver);
    p.parameters.rotationMin = 25; p.parameters.rotationMax = 125;
    const record = W.captureAssembly(p, [I.elementKey(driver.id)], 'Pohon'), first = W.insertAssembly(custom(), record, { x: 100, y: 100 });
    near(first.parameters.rotationMin, 25); near(first.parameters.rotationMax, 125); assert(first.elements[0].drive);
    const next = W.insertAssembly(first, record, { x: 300, y: 100 });
    assert(next.elements.filter((e) => e.drive).length === 1 && !next.elements[1].drive);
    const passive = W.insertAssembly(custom(), record, { x: 100, y: 100 }, false); assert(!passive.elements[0].drive);
  });
  add('Knižnica nemení chránený parametrický pohybový zákon.', () => {
    const e = { ...K.makeElement('link', 0, 0), drive: true }, p = custom(e), r = W.captureAssembly(p, [I.elementKey(e.id)], 'Pasívna kópia'), original = K.preset('fourbar');
    throws(() => W.captureAssembly(original, [I.elementKey('input-1')], 'Originál'));
    const next = W.insertAssembly(original, r, { x: 400, y: 100 }); assert(!next.elements.at(-1).drive && next.kind === 'fourbar');
    assert(JSON.stringify(next.parameters) === JSON.stringify(original.parameters));
  });
  add('Neplatné vloženie a modelový limit odmietnu celú operáciu bez čiastočnej kópie.', () => {
    const e = K.makeElement('link', 0, 0), p = custom(e), r = W.captureAssembly(p, [I.elementKey(e.id)], 'Jedno rameno');
    throws(() => W.insertAssembly(p, r, { x: Infinity, y: 0 }));
    const full = custom(...Array.from({ length: 120 }, (_, i) => K.makeElement('node', i, 0))), before = JSON.stringify(full);
    throws(() => W.insertAssembly(full, r, { x: 0, y: 0 })); assert(JSON.stringify(full) === before);
  });
  add('Knižnica a verzie majú vlastný prenosný formát s kontrolou jednotiek.', () => {
    const e = K.makeElement('link'), p = custom(e), r = W.captureAssembly(p, [I.elementKey(e.id)], 'Prenosná');
    const text = W.serializeCollection([r], 'assembly'), parsed = W.normalizeCollection(text, 'assembly');
    assert(JSON.parse(text).format === 'KINMO-LIBRARY' && parsed[0].name === 'Prenosná');
    const invalid = K.copy(r); invalid.file.units.length = 'inch'; throws(() => W.serializeCollection([invalid], 'assembly'));
    throws(() => W.normalizeCollection(text, 'revision'));
  });
  add('Import duplicitného záznamu vytvorí novú identitu bez prepísania originálu.', () => {
    const e = K.makeElement('link'), p = custom(e), r = W.captureAssembly(p, [I.elementKey(e.id)], 'Názov'), text = W.serializeCollection([r], 'assembly');
    const merged = W.mergeCollection([r], text, 'assembly');
    assert(merged.length === 2 && merged[0].id !== r.id && merged[1].id === r.id);
    assert(r.id === JSON.parse(text).records[0].id);
  });
  add('Limity kolekcie sa neobchádzajú automatickým mazaním a vstup nad 2 MB sa odmietne.', () => {
    const e = K.makeElement('link'), p = custom(e), r = W.captureAssembly(p, [I.elementKey(e.id)], 'Limit'), current = Array.from({ length: 20 }, (_, i) => ({ ...K.copy(r), id: `record-${i}` }));
    throws(() => W.mergeCollection(current, W.serializeCollection([r], 'assembly'), 'assembly'));
    assert(current.length === 20);
    throws(() => W.normalizeCollection(' '.repeat(2 * 1024 * 1024 + 1), 'assembly'));
    throws(() => W.serializeCollection([r, r], 'assembly'));
  });
  add('Záznam odmietne prázdny alebo dlhý názov, zlý dátum a prázdnu podzostavu.', () => {
    const e = K.makeElement('link'), p = custom(e);
    throws(() => W.captureAssembly(p, [], 'Bez výberu')); throws(() => W.captureAssembly(p, [I.elementKey(e.id)], ' '));
    throws(() => W.createRevision(p, 'x'.repeat(81)));
    const r = W.captureAssembly(p, [I.elementKey(e.id)], 'Platná');
    throws(() => W.normalizeRecord({ ...r, createdAt: 'neskôr' }, 'assembly'));
    throws(() => W.normalizeRecord({ ...r, file: global.KinmoExport.nativeFile(custom()) }, 'assembly'));
  });
  add('Pomenovaná verzia zachová model, režim, vzhľad a polohu, nie aktiváciu prichytávania.', () => {
    const e = { ...K.makeElement('link'), drive: true }, p = custom(e), before = JSON.stringify(p);
    const r = W.createRevision(p, 'Variant A', { workspace: { mode: 'simulate', theme: 'dark', smartSnap: true, snap: false }, motion: 80 });
    const restored = W.restoreRevision(r);
    assert(restored.project.id === p.id && restored.workspace.mode === 'simulate' && restored.workspace.theme === 'dark');
    near(restored.motion, 80); assert(!restored.workspace.snap && !Object.hasOwn(restored.workspace, 'smartSnap'));
    assert(JSON.stringify(p) === before && restored.project !== p);
  });
  add('Verzia nesmie zameniť identitu svojej snímky s iným projektom.', () => {
    const r = W.createRevision(custom(K.makeElement('link')), 'Identita');
    throws(() => W.normalizeRecord({ ...r, projectId: K.uid() }, 'revision'));
    const text = W.serializeCollection([r], 'revision'); assert(W.normalizeCollection(text, 'revision')[0].file.project.id === r.projectId);
  });
  add('Porovnanie návrhov oddeľuje zmeny dĺžky, polohy a uhla s jednotkami.', () => {
    const e = { ...K.makeElement('link', 10, 20), length: 100 }, before = custom(e), after = K.copy(before);
    after.elements[0].length = 135; after.elements[0].x = 25; after.elements[0].angle = 30;
    const rows = W.compareDimensions(before, after);
    const row = (property) => rows.find((r) => r.key === `element:${e.id}:${property}`);
    near(row('length').delta, 35); near(row('x').delta, 15); near(row('angle').delta, 30);
    assert(row('length').unit === 'mm' && row('angle').unit === '°' && row('length').status === 'changed');
    assert(W.compareDimensions(before, before).every((r) => r.status === 'same'));
  });
  add('Porovnanie zahŕňa uložené kóty, riadiace vzdialenosti a dorazy.', () => {
    const a = K.makeElement('link', 0, 0), b = K.makeElement('link', 120, 0), before = custom(a, b);
    before.connections = [{ ...joint(ref(a), ref(b), 'revolute'), limitMin: -30, limitMax: 30 }];
    before.dimensions = [{ id: K.uid(), type: 'distance', a: ref(a), b: ref(b), offset: 10 }];
    const after = K.copy(before); after.connections[0].limitMax = 50; after.elements[1].x = 150;
    const rows = W.compareDimensions(before, after);
    near(rows.find((r) => r.key === `joint:${before.connections[0].id}:limitMax`).delta, 20);
    near(rows.find((r) => r.key === `dimension:${before.dimensions[0].id}`).delta, 30);
  });
  add('Pridané a odstránené telesá sa neporovnávajú cez podobné názvy.', () => {
    const a = K.makeElement('node', 0, 0), before = custom(a), after = custom(K.makeElement('node', 0, 0));
    const rows = W.compareDimensions(before, after).filter((r) => r.key.startsWith('element:'));
    assert(rows.some((r) => r.status === 'added') && rows.some((r) => r.status === 'removed'));
    assert(rows.every((r) => r.delta === null));
  });
  add('Vloženie zvoleným montážnym bodom nemení rozmery ani pôvodný projekt.', () => {
    const p = custom(), before = JSON.stringify(p), at = { x: 237, y: 119 };
    for (const type of ['link', 'panel', 'rail', 'cam', 'slot', 'node']) {
      for (const mount of I.pointKeys(K.makeElement(type))) {
        const e = W.placement(p, type, at, mount), pose = E.design(custom(e), 0);
        const point = K.point(pose, ref(e, mount)); near(point.x, at.x); near(point.y, at.y);
        near(e.length, K.makeElement(type).length);
      }
    }
    assert(JSON.stringify(p) === before); throws(() => W.placement(p, 'link', at, 'ct'));
  });
  add('Snap drží pôvodný bod do 1,5 násobku tolerancie a potom prejde na bližší.', () => {
    const a = K.makeElement('node', 0, 0), b = K.makeElement('node', 100, 30), c = K.makeElement('node', 116, 30), p = custom(a, b, c), result = E.design(p, 0), keys = [I.elementKey(a.id)], options = { enabled: true, tolerance: 8 };
    const first = W.findSnap(p, keys, result, { x: 99, y: 30 }, options); assert(first.target.elementId === b.id);
    const held = W.findSnap(p, keys, result, { x: 110, y: 30 }, { ...options, previous: first }); assert(held.target.elementId === b.id);
    const released = W.findSnap(p, keys, result, { x: 114, y: 30 }, { ...options, previous: held }); assert(released.target.elementId === c.id);
    const disabled = W.findSnap(p, keys, result, { x: 110, y: 30 }, { ...options, enabled: false, previous: held }); assert(disabled === null);
  });
  add('Náhľad vloženia drží cieľ aj pri novej identite a prichytáva iba vybraný koniec.', () => {
    const target = K.makeElement('node', 200, 100), p = custom(target), at = { x: 199, y: 101 };
    const first = W.findPlacementSnap(p, W.placement(p, 'link', at, 'b'), { enabled: true, tolerance: 8, sourcePoint: 'b' });
    assert(first.source.ref.point === 'b' && first.target.elementId === target.id);
    const next = W.findPlacementSnap(p, W.placement(p, 'link', { x: 210, y: 100 }, 'b'), { enabled: true, tolerance: 8, sourcePoint: 'b', previous: first });
    assert(next.target.elementId === target.id && next.source.elementId !== first.source.elementId);
    near(next.delta.x, -10);
  });
  add('Diagnostické odporúčania obsahujú identity prvkov aj konfliktných kĺbov.', () => {
    const a = K.makeElement('link', 0, 0), b = K.makeElement('ground', 0, 0), p = custom(a, b);
    let checks = W.diagnose(p, E.design(p, 0)).checks;
    assert(checks.some((c) => c.key === I.elementKey(a.id) && c.action === 'motor'));
    assert(checks.some((c) => c.key === I.elementKey(a.id) && c.action === 'connect'));
    p.connections = [joint(ref(a), ref(b))];
    checks = W.diagnose(p, E.design(p, 0)).checks; assert(checks.some((c) => c.action === 'support'));
    p.connections = [joint(ref(a), ref(b), 'distance', 20), joint(ref(a), ref(b), 'distance', 40)];
    checks = W.diagnose(p, E.design(p, 0)).checks;
    assert(checks.some((c) => c.key === I.jointKey(p.connections[0].id) && c.otherKey === I.jointKey(p.connections[1].id)));
  });
  add('Prichytenie osi nezablokuje následné prichytenie skutočného otočného bodu.', () => {
    const spring = K.makeElement('spring-compression', 300, 0), piston = K.makeElement('piston-push', 0, 0), p = custom(spring, piston), result = E.design(p, 0), keys = [I.elementKey(spring.id)];
    const axis = W.findSnap(p, keys, result, { x: -100, y: 0 }, { enabled: true, wholeBodies: true, sourcePoint: 'a', tolerance: 3 }); assert(axis.kind === 'axis');
    const endpoint = W.findSnap(p, keys, result, { x: -60, y: 0 }, { enabled: true, wholeBodies: true, sourcePoint: 'a', tolerance: 3, previous: axis });
    assert(endpoint.kind === 'endpoint' && endpoint.target.ref.point === 'b');
  });
  add('Priečny rozmer vlastného obrysu škáluje skutočnú výšku okolo stredu.', () => {
    const e=K.makeElement('link',0,0);e.outline=[{x:0,y:20},{x:100,y:20},{x:100,y:60},{x:0,y:60}];
    const p=custom(e),next=W.setThickness(p,e.id,80),updated=next.elements[0];near(W.thickness(e).value,40);near(W.thickness(updated).value,80);
    near(Math.min(...updated.outline.map(p=>p.y)),0);near(Math.max(...updated.outline.map(p=>p.y)),80);near(updated.length,e.length);near(p.elements[0].outline[0].y,20);
    const spring=K.makeElement('spring-compression');throws(()=>W.setThickness(custom(spring),spring.id,2*spring.wireDiameter));
  });
  global.KinematicsTestCases = [...(global.KinematicsTestCases || []), ...cases];
})(globalThis);
