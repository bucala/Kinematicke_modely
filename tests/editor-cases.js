(function (global) {
  'use strict';
  const K = global.Kinematics, E = global.KinmoEditor, cases = [];
  const add = (name, run) => cases.push({ name, run });
  const assert = (condition, message = 'Podmienka nebola splnená.') => { if (!condition) throw new Error(message); };
  const near = (a, b, tolerance = 0.05) => assert(Number.isFinite(a) && Math.abs(a - b) <= tolerance, `${a} ≠ ${b}`);
  const throws = (fn) => { let failed = false; try { fn(); } catch { failed = true; } assert(failed); };
  const custom = (...elements) => ({ ...K.preset('custom'), elements });
  const joint = (a, b, type = 'revolute', value = 0, ap = 'a', bp = 'a') => ({
    id: K.uid(), name: 'Skúšobná väzba', a: { elementId: a.id, point: ap }, b: { elementId: b.id, point: bp }, type, value, builtin: false,
  });

  add('Editor ponechá navrhnuté body, simulácia vynúti kĺb.', () => {
    const a = K.makeElement('ground', 0, 0), b = K.makeElement('bearing', 150, 80), p = custom(a, b);
    p.connections.push(joint(a, b));
    near(E.design(p, 0).poses[b.id].a.x, 150);
    near(K.solve(p, 0).poses[b.id].a.x, 0);
    near(b.x, 150);
  });
  add('Editor neotáča riadený člen pri nenulovom uhle pohonu.', () => {
    const a = K.makeElement('link', 0, 0); a.drive = true; a.angle = 20;
    near(E.design(custom(a), 100).poses[a.id].angle, 20);
    near(K.solve(custom(a), 100).poses[a.id].angle, 120);
  });
  add('Lineárny pohon celého telesa zachová uhol a dĺžku.', () => {
    const a = K.makeElement('link', 10, 20);
    Object.assign(a, { drive: true, driveMode: 'linear', driveAngle: 90, stroke: 200, angle: 30 });
    const p = custom(a), s = K.solve(p, 300);
    assert(K.driveRange(p).unit === 'mm'); near(s.poses[a.id].a.x, 10); near(s.poses[a.id].a.y, -180);
    near(s.poses[a.id].angle, 30); near(s.poses[a.id].length, a.length);
  });
  add('Posúvajúce sa nosné teleso prenáša presný profil kulisy.', () => {
    const a = K.makeElement('link', 10, 20), slot = K.makeElement('slot', 5, -20);
    Object.assign(a, { drive: true, driveMode: 'linear', stroke: 200 });
    slot.parentId = a.id; slot.curveKind = 'polyline'; slot.controls = [{ x: 0, y: 0 }, { x: 50, y: 80 }];
    const p = K.validateProject(custom(a, slot)), first = K.solve(p, 0).poses[slot.id], last = K.solve(p, 300).poses[slot.id];
    near(last.path[0].x - first.path[0].x, 200); near(last.path[1].y, first.path[1].y);
  });
  add('Pevne pripojené teleso sleduje rotáciu aj lokálne odsadenie.', () => {
    const a = K.makeElement('link', 0, 0), b = K.makeElement('bearing', 100, 0);
    a.drive = true; b.parentId = a.id;
    const p = K.validateProject(custom(a, b)), s = K.solve(p, 90);
    near(s.poses[b.id].a.x, 0); near(s.poses[b.id].a.y, -100);
  });
  add('Nosné telesá sa vyhodnotia nezávisle od poradia v zozname.', () => {
    const a = K.makeElement('link', 10, 20), b = K.makeElement('link', 50, 0), c = K.makeElement('bearing', 25, 0);
    a.drive = true; b.parentId = a.id; c.parentId = b.id;
    const s = K.solve(K.validateProject(custom(c, b, a)), 90);
    near(s.poses[c.id].a.x, 10); near(s.poses[c.id].a.y, -55);
  });
  add('Import odmietne cyklus nosných telies.', () => {
    const a = K.makeElement('link'), b = K.makeElement('link'); a.parentId = b.id; b.parentId = a.id;
    throws(() => K.validateProject(custom(a, b)));
  });
  add('Import odmietne viac nezávislých pohonov.', () => {
    throws(() => K.validateProject(custom(K.makeElement('rail'), K.makeElement('rail'))));
  });
  add('Vzdialenostná väzba nastaví vzdialenosť medzi dvoma čapmi.', () => {
    const a = K.makeElement('ground', 0, 0), b = K.makeElement('bearing', 120, 0), p = custom(a, b);
    p.connections.push(joint(a, b, 'distance', 50));
    const s = K.solve(K.validateProject(p), 0);
    assert(!s.blocked); near(K.distance(s.poses[a.id].a, s.poses[b.id].a), 50);
  });
  add('Pevné spojenie kontroluje polohu aj relatívny uhol.', () => {
    const a = K.makeElement('ground', 0, 0), b = K.makeElement('link', 80, 90), p = custom(a, b);
    p.connections.push(joint(a, b, 'fixed', 35));
    const s = K.solve(K.validateProject(p), 0);
    assert(!s.blocked); near(s.poses[b.id].angle, 35); near(K.distance(s.poses[a.id].a, s.poses[b.id].a), 0);
  });
  add('Uhlová väzba nemení voľnú polohu počiatku telesa.', () => {
    const a = K.makeElement('ground', 0, 0), b = K.makeElement('link', 80, 90), p = custom(a, b);
    p.connections.push(joint(a, b, 'angle', 45));
    const s = K.solve(p, 0);
    near(s.poses[b.id].angle, 45); near(s.poses[b.id].a.x, 80); near(s.poses[b.id].a.y, 90);
  });
  add('Rovnobežnosť je editovateľná nezávislá väzba.', () => {
    const a = K.makeElement('ground', 0, 0), b = K.makeElement('link', 80, 90), p = custom(a, b); a.angle = 20;
    p.connections.push(joint(a, b, 'parallel'));
    near(K.solve(p, 0).poses[b.id].angle, 20);
  });
  add('Import odmietne vzdialenostnú väzbu na dráhu.', () => {
    const a = K.makeElement('slot'), b = K.makeElement('bearing'), p = custom(a, b);
    p.connections.push(joint(a, b, 'distance', 10, 'curve'));
    throws(() => K.validateProject(p));
  });
  add('Lokálny pomocný bod panela môže byť mimo jeho hlavnej osi.', () => {
    const a = K.makeElement('panel', 0, 0); a.angle = 90; a.localC = { x: -20, y: -30 };
    const s = K.solve(K.validateProject(custom(a)), 0);
    near(s.poses[a.id].c.x, -30); near(s.poses[a.id].c.y, 20);
  });
  add('Voľná kópia zachová originál a má vlastnú identitu.', () => {
    const p = K.preset('fourbar'), json = JSON.stringify(p), copy = E.editableCopy(p, 30);
    assert(JSON.stringify(p) === json); assert(copy.id !== p.id); assert(copy.kind === 'custom');
    assert(copy.elements.every((e) => !e.primary)); assert(copy.connections.every((j) => !j.builtin));
    const a = K.solve(p, 30, { collisions: false }), b = K.solve(copy, 0, { collisions: false });
    for (const e of p.elements) near(K.distance(a.poses[e.id].a, b.poses[e.id].a), 0);
  });
  add('Kópia výsuvu je editovateľná a zachová aktuálnu polohu čela.', () => {
    const p = K.preset('drawer'), copy = E.editableCopy(p, 80);
    const a = K.solve(p, 80), b = K.solve(copy, 0, { collisions: false });
    near(K.distance(a.poses['panel-1'].a, b.poses['panel-1'].a), 0); near(b.poses['panel-1'].angle, a.angle);
  });
  add('Dvojkulisová kópia zachová presné profily a rigidný držiak.', () => {
    const p = K.preset('double-drawer'), original = K.solve(p, 0), copy = E.editableCopy(p, 0), s = K.solve(copy, 0, { collisions: false });
    assert(copy.source.note.includes('opory')); assert(copy.provenance.estimated);
    assert(copy.elements.find((e) => e.id === 'slot-1').controls.length > 500);
    for (const id of ['bearing-1', 'bearing-2', 'rear-bearing', 'panel-1']) near(K.distance(original.poses[id].a, s.poses[id].a), 0);
    near(K.distance(s.poses['bearing-1'].a, s.poses['bearing-2'].a), K.distance(original.poses['bearing-1'].a, original.poses['bearing-2'].a));
  });
  add('Import kóty, obrysu a trajektórie zachová dáta.', () => {
    const e = K.makeElement('link', 0, 0), p = custom(e); e.outline = [{ x: 0, y: 0 }, { x: 120, y: 0 }, { x: 0, y: 20 }];
    const s = E.design(p, 0);
    p.dimensions.push(E.makeDimension(s, { elementId: e.id, point: 'a' }, { elementId: e.id, point: 'b' }));
    p.trajectories.push({ id: K.uid(), name: 'Skúšobná dráha', reference: { elementId: e.id, point: 'b' }, color: '#123456', visible: true, space: 'world' });
    const restored = K.validateProject(p);
    assert(restored.dimensions.length === 1); assert(restored.trajectories[0].color === '#123456'); assert(restored.elements[0].outline.length === 3);
  });
  add('Kóta vyhodnotí dĺžku, vodorovnú, zvislú zložku aj uhol.', () => {
    const s = { poses: {} }, a = { x: 0, y: 0 }, b = { x: 3, y: -4 };
    near(E.dimensionValue(s, E.makeDimension(s, a, b)), 5);
    near(E.dimensionValue(s, E.makeDimension(s, a, b, 'horizontal')), 3);
    near(E.dimensionValue(s, E.makeDimension(s, a, b, 'vertical')), 4);
    near(E.dimensionValue(s, E.makeDimension(s, a, b, 'angle')), 53.130102, 1e-5);
  });
  add('Import odmietne neplatné referencie kót a trajektórií.', () => {
    const p = custom(K.makeElement('link'));
    p.trajectories.push({ id: K.uid(), reference: { elementId: 'missing', point: 'a' } });
    throws(() => K.validateProject(p));
  });
  add('Vypočítaná trajektória sa prevedie na samostatnú vodiacu krivku.', () => {
    const p = K.preset('crank'), samples = K.sample(p, 25), t = { name: 'Dráha piesta', reference: { elementId: 'piston-1', point: 'a' }, space: 'world' };
    const path = E.materializeTrajectory(p, t, samples);
    assert(path.curveKind === 'polyline'); assert(path.guideOnly); assert(path.controls.length === 25);
    near(K.distance(K.genericPath(path)[0], samples[0].poses['piston-1'].a), 0);
    throws(() => E.materializeTrajectory(p, { ...t, reference: { elementId: 'frame-1', point: 'a' } }, samples));
  });
  add('Analýza voľnosti odhalí voľné rameno pripojené jediným kĺbom.', () => {
    const a = K.makeElement('rail', 0, 0), b = K.makeElement('link', 0, 0), p = custom(a, b);
    p.connections.push(joint(a, b, 'revolute', 0, 'c'));
    const f = E.freedom(p, K.solve(p, 0));
    assert(f.driven && f.free === 1);
  });
  add('Analýza voľnosti prijme čap alebo pevne pripojené teleso na vozíku.', () => {
    const a = K.makeElement('rail', 0, 0), b = K.makeElement('bearing', 0, 0), p = custom(a, b);
    p.connections.push(joint(a, b, 'revolute', 0, 'c'));
    assert(E.freedom(p, K.solve(p, 0)).free === 0);
    const c = K.makeElement('panel', 0, 0); c.parentId = a.id; c.parentPoint = 'c'; p.elements.push(c);
    assert(E.freedom(p, K.solve(p, 0)).free === 0);
  });
  add('Obrys telesa sa otáča a je zahrnutý v hraniciach plátna.', () => {
    const e = K.makeElement('link', 0, 0); e.angle = 90;
    e.outline = [{ x: 0, y: 0 }, { x: 500, y: 0 }, { x: 500, y: 300 }];
    const p = custom(e), s = K.solve(p, 0), b = K.bounds(p, [s]);
    near(s.poses[e.id].outline[2].x, 300); near(s.poses[e.id].outline[2].y, -500);
    assert(b.y < -500);
  });
  global.KinematicsTestCases = Object.freeze([...global.KinematicsTestCases, ...cases]);
})(globalThis);
