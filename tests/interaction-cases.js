(function (global) {
  'use strict';
  const K = global.Kinematics, E = global.KinmoEditor, I = global.KinmoInteraction, cases = [];
  const add = (name, run) => cases.push({ name, run });
  const assert = (value, message = 'Nesplnená podmienka') => { if (!value) throw new Error(message); };
  const near = (a, b, tolerance = .01) => assert(Number.isFinite(a) && Math.abs(a - b) <= tolerance, `${a} ≠ ${b}`);
  const throws = (fn) => { let failed = false; try { fn(); } catch { failed = true; } assert(failed, 'Očakávané odmietnutie operácie'); };
  const custom = (...elements) => K.validateProject({ ...K.preset('custom'), elements });
  const ref = (e, point = 'a') => ({ elementId: e.id, point });
  const link = () => ({ ...K.makeElement('link', 10, 20), length: 100 });
  const joint = (a, b, type = 'revolute') => ({ id: K.uid(), a, b, type, value: 0, name: 'Väzba' });

  add('Plátno pridá skutočný voľný uzol bez zmeny pôvodného projektu.', () => {
    const original = custom(), p = I.addNode(original, { x: 42, y: -18 }), e = p.elements[0];
    assert(!original.elements.length && e.type === 'node' && !e.locked && e.mass === 0);
    near(K.solve(p, 0).poses[e.id].a.x, 42); assert(E.freedom(p, K.solve(p, 0)).free === 2);
  });
  add('Pevný bod má nulovú voľnosť a možno ho uvoľniť aj znovu ukotviť.', () => {
    const p = I.addNode(custom(), { x: 5, y: 9 }, true), r = ref(p.elements[0]);
    assert(E.freedom(p, K.solve(p, 0)).free === 0);
    const loose = I.toggleFixed(p, [r]); assert(!I.fixed(loose, r) && E.freedom(loose, K.solve(loose, 0)).free === 2);
    assert(I.fixed(I.toggleFixed(loose, [r]), r));
  });
  add('Fixácia koncového uzla nechá ramenu jednu rotačnú voľnosť.', () => {
    const e = link(), p = I.toggleFixed(custom(e), [ref(e)]);
    assert(p.elements.length === 2 && p.connections[0].type === 'revolute');
    assert(E.freedom(p, K.solve(p, 0)).free === 1);
    assert(!I.fixed(p, ref(e, 'b')) && I.fixed(p, ref(e)));
    const loose = I.toggleFixed(p, [ref(e)]); assert(loose.elements.length === 1 && !loose.connections.length);
  });
  add('Multifix ukotví dva body a vracia ich späť jednou operáciou.', () => {
    let p = I.addNode(I.addNode(custom(), { x: 0, y: 0 }), { x: 20, y: 0 });
    const refs = p.elements.map((e) => ref(e));
    p = I.toggleFixed(p, refs); assert(refs.every((r) => I.fixed(p, r)));
    p = I.toggleFixed(p, refs); assert(refs.every((r) => !I.fixed(p, r)));
  });
  add('Otočný kĺb skutočne spojí body; voľný typ ich odpojí.', () => {
    const a = K.makeElement('node', 0, 0), b = K.makeElement('node', 100, 0); a.locked = true;
    const p = I.setJoint(custom(a, b), ref(b), { type: 'revolute', other: ref(a) });
    near(K.solve(p, 0).poses[b.id].a.x, 0);
    const free = I.setJoint(p, ref(b), { type: 'free' }); assert(!free.connections.length);
    near(K.solve(free, 0).poses[b.id].a.x, 100);
  });
  add('Zmena typu väzby zachová identitu a nezduplikuje spoj.', () => {
    const a = K.makeElement('node'), b = K.makeElement('node'), r = ref(a), other = ref(b);
    const p = I.setJoint(custom(a, b), r, { type: 'revolute', other });
    const next = I.setJoint(p, r, { type: 'distance', other, id: p.connections[0].id, value: 50 });
    assert(next.connections.length === 1 && next.connections[0].id === p.connections[0].id && next.connections[0].type === 'distance');
  });
  add('Posuvný kĺb vynúti polohu na priamke aj orientáciu tuhého posúvača.', () => {
    const rail = K.makeElement('rail', 0, 0), slider = link(); rail.drive = false; slider.angle = 40;
    const p = I.setJoint(custom(rail, slider), ref(slider), { type: 'prismatic', other: ref(rail, 'curve'), value: 0 });
    const s = K.solve(p, 0); assert(!s.blocked); near(s.poses[slider.id].a.y, 0); near(s.poses[slider.id].angle, 0);
    assert(E.freedom(p, s).free === 1);
  });
  add('Posuvná väzba bodu odoberie len jednu súradnicu, nie fiktívnu rotáciu.', () => {
    const rail = K.makeElement('rail', 0, 0), point = K.makeElement('node', 20, 40); rail.drive = false;
    const p = I.setJoint(custom(rail, point), ref(point), { type: 'prismatic', other: ref(rail, 'curve') });
    near(K.solve(p, 0).poses[point.id].a.y, 0); assert(E.freedom(p, K.solve(p, 0)).free === 1);
  });
  add('Čap vo vedení dovoľuje rotáciu; posuvný kĺb ju zamkne.', () => {
    const rail = K.makeElement('rail', 0, 0), slider = link(); rail.drive = false;
    const p = I.setJoint(custom(rail, slider), ref(slider), { type: 'point-path', other: ref(rail, 'curve') });
    assert(E.freedom(p, K.solve(p, 0)).free === 2);
    const next = I.setJoint(p, ref(slider), { id: p.connections[0].id, type: 'prismatic', other: ref(rail, 'curve') });
    assert(E.freedom(next, K.solve(next, 0)).free === 1);
  });
  add('Posuvná väzba odmietne zakrivenú kulisu alebo dva bežné body.', () => {
    const slot = K.makeElement('slot'), e = link(), p = custom(slot, e);
    throws(() => I.setJoint(p, ref(e), { type: 'prismatic', other: ref(slot, 'curve') }));
    throws(() => I.setJoint(p, ref(e), { type: 'prismatic', other: ref(slot) }));
    assert(!p.connections.length);
  });
  add('Absolútne XYZ mení skutočný bod a odmietne nenulové Z.', () => {
    const e = link(), p = custom(e), next = I.setCoordinates(p, ref(e, 'b'), { x: 10, y: -80, z: 0 });
    near(E.design(next, 0).poses[e.id].b.y, -80); near(next.elements[0].angle, 90);
    throws(() => I.setCoordinates(p, ref(e), { x: 0, y: 0, z: 1 })); near(p.elements[0].x, 10);
  });
  add('Zmena začiatku ramena zachová druhý koniec.', () => {
    const e = link(), p = I.setCoordinates(custom(e), ref(e), { x: 25, y: 40 });
    const s = E.design(p, 0); near(s.poses[e.id].a.x, 25); near(s.poses[e.id].b.x, 110); near(s.poses[e.id].b.y, 20);
  });
  add('XYZ pripojeného POI použije súradnice nosného telesa.', () => {
    const e = link(); e.angle = 90;
    const p = I.addPOI(custom(e), e.id), node = p.elements.at(-1), next = I.setCoordinates(p, ref(node), { x: 40, y: -30 });
    const s = E.design(next, 0); near(s.poses[node.id].a.x, 40); near(s.poses[node.id].a.y, -30);
  });
  add('Presun pevného endpointu aktualizuje aj jeho skryté ukotvenie.', () => {
    const e = link(), p = I.toggleFixed(custom(e), [ref(e)]), next = I.setCoordinates(p, ref(e), { x: 30, y: 40 });
    near(K.solve(next, 0).poses[e.id].a.x, 30); near(K.solve(next, 0).poses[e.id].a.y, 40);
  });
  add('Prichytenie a zarovnanie viacerých uzlov je atómové.', () => {
    const a = K.makeElement('node', 13, 19), b = K.makeElement('node', 27, 31), refs = [ref(a), ref(b)];
    const p = I.transformPoints(custom(a, b), refs, (v) => ({ x: Math.round(v.x / 5) * 5, y: 20 }));
    near(p.elements[0].x, 15); near(p.elements[1].x, 25); near(p.elements[1].y, 20);
  });
  add('Multiselect prekladá viac členov a nezdvojuje posun endpointu.', () => {
    const a = link(), b = link(); b.y = 60;
    const p = I.translate(custom(a, b), [I.elementKey(a.id), I.nodeKey(ref(a)), I.elementKey(b.id)], { x: 15, y: -5 });
    near(p.elements[0].x, 25); near(p.elements[1].x, 25); near(p.elements[1].y, 55);
  });
  add('Ťahanie neposúva pevné uzly.', () => {
    const e = K.makeElement('node', 7, 8); e.locked = true;
    const p = I.translate(custom(e), [I.nodeKey(ref(e))], { x: 10, y: 10 }); near(p.elements[0].x, 7);
  });
  add('Motor okolo konca B udržuje B pevný a otáča skutočnú geometriu.', () => {
    const e = link(), p = I.setDriver(custom(e), ref(e, 'b'), { enabled: true, mode: 'rotary', speed: 45, min: 0, max: 180 });
    const s = K.solve(p, 90); near(s.poses[e.id].b.x, 110); near(s.poses[e.id].b.y, 20); near(s.poses[e.id].a.x, 110); near(s.poses[e.id].a.y, 120);
    near(p.elements[0].driveSpeed, 45);
  });
  add('Motor s nenulovým začiatkom zachová úvodnú polohu.', () => {
    const e = link(), p = I.setDriver(custom(e), ref(e, 'b'), { enabled: true, mode: 'rotary', speed: -20, min: 30, max: 120 });
    const s = K.solve(p, 30); near(s.poses[e.id].a.x, 10); near(s.poses[e.id].b.x, 110); near(s.poses[e.id].angle, 0);
  });
  add('Lineárny motor bodu rešpektuje v, smer a koncové limity.', () => {
    const e = K.makeElement('node', 10, 20), p = I.setDriver(custom(e), ref(e), { enabled: true, mode: 'linear', speed: 25, angle: 90, min: 0, max: 100 });
    const s = K.solve(p, 100); near(s.poses[e.id].a.x, 10); near(s.poses[e.id].a.y, -80);
    const limited = I.setLimits(p, 20, 70); near(K.solve(limited, 70).poses[e.id].a.y, -30);
    throws(() => I.setLimits(p, 20, 20));
  });
  add('Priradenie nového motora ponechá práve jeden nezávislý vstup.', () => {
    const a = link(), b = link(); a.drive = true;
    const p = I.setDriver(custom(a, b), ref(b), { enabled: true, mode: 'rotary', speed: 30, min: 0, max: 90 });
    assert(!p.elements[0].drive && p.elements[1].drive); throws(() => I.setDriver(p, ref(b), { enabled: true, mode: 'rotary', speed: NaN, min: 0, max: 90 }));
  });
  add('Odstránenie uzla vyčistí väzby, kóty a trajektórie.', () => {
    const a = K.makeElement('node'), b = link(), p = custom(a, b);
    p.connections.push(joint(ref(a), ref(b)));
    p.dimensions.push({ id: K.uid(), a: ref(a), b: ref(b), type: 'distance', offset: 20 });
    p.trajectories.push({ id: K.uid(), reference: ref(a), name: 'Bod' });
    const next = I.deleteSelection(p, [I.nodeKey(ref(a))]);
    assert(next.elements.length === 1 && !next.connections.length && !next.dimensions.length && !next.trajectories.length);
  });
  add('Odstránenie členu vyčistí riadiace kóty a zachová svetovú polohu detí.', () => {
    const e = link(), p = I.addPOI(custom(e), e.id), child = p.elements.at(-1), before = E.design(p, 0).poses[child.id].a;
    p.dimensions.push({ id: K.uid(), type: 'distance', a: { x: 0, y: 0 }, b: { x: 50, y: 0 }, offset: 0, control: { elementId: e.id, property: 'length' } });
    const next = I.deleteSelection(p, [I.elementKey(e.id)]), after = E.design(next, 0).poses[child.id].a;
    assert(!next.dimensions.length && next.elements[0].parentId === ''); near(before.x, after.x); near(before.y, after.y);
  });
  add('Odstránenie samotnej väzby zachová členy a zruší riadenie kóty.', () => {
    const a = link(), b = link(), p = custom(a, b), j = joint(ref(a), ref(b), 'distance'); j.value = 40; p.connections.push(j);
    p.dimensions.push({ id: K.uid(), type: 'distance', a: ref(a), b: ref(b), offset: 20, constraintId: j.id });
    const next = I.deleteSelection(p, [I.jointKey(j.id)]); assert(next.elements.length === 2 && !next.connections.length && !next.dimensions[0].constraintId);
  });
  add('Rozdelenie ramena vloží stredový uzol, dva segmenty a dve väzby.', () => {
    const e = link(), p = I.split(custom(e), e.id);
    assert(p.elements.length === 3 && p.connections.length === 2);
    assert(p.elements.filter((e) => e.type === 'link').every((e) => e.length === 50));
    near(p.elements.reduce((n, e) => n + e.mass, 0), 1); near(p.elements.at(-1).x, 60);
  });
  add('Rozdelenie premapuje koncové väzby, montáže, kóty, deti a trajektórie.', () => {
    const e = link(), other = K.makeElement('node', 110, 20), spring = K.makeElement('spring-extension'), child = K.makeElement('node', 0, 0);
    spring.mountA = ref(e, 'b'); child.parentId = e.id; child.parentPoint = 'b';
    const p = custom(e, other, spring, child); p.connections.push(joint(ref(e, 'b'), ref(other)));
    p.dimensions.push({ id: K.uid(), a: ref(e), b: ref(e, 'b'), type: 'distance', control: { elementId: e.id, property: 'length' } });
    p.trajectories.push({ id: K.uid(), reference: ref(e, 'b') });
    const next = I.split(p, e.id), second = next.elements.find((v) => v.type === 'link' && v.id !== e.id);
    assert(next.connections[0].a.elementId === second.id && next.dimensions[0].b.elementId === second.id && !next.dimensions[0].control);
    assert(next.elements.find((v) => v.id === spring.id).mountA.elementId === second.id && next.elements.find((v) => v.id === child.id).parentId === second.id);
    assert(next.trajectories[0].reference.elementId === second.id); near(E.design(next, 0).poses[child.id].a.x, 110);
  });
  add('POI zostane bezhmotný, pevne na člene a automaticky sleduje dráhu.', () => {
    const e = link(); e.drive = true; const p = I.addPOI(custom(e), e.id), poi = p.elements.at(-1);
    assert(poi.mass === 0 && poi.parentId === e.id && p.trajectories[0].reference.elementId === poi.id);
    near(K.solve(p, 90).poses[poi.id].a.x, 10); near(K.solve(p, 90).poses[poi.id].a.y, -30);
  });
  for (const kind of ['fourbar', 'crank']) add(`Podzostava ${kind} má nové ID, správny posun a rešpektuje jeden pohon.`, () => {
    let p = I.insertAssembly(custom(), kind, { x: 80, y: 90 }); const ids = new Set(p.elements.map((e) => e.id));
    near(p.elements.find((e) => e.type === 'ground').x, 80); near(p.elements.find((e) => e.type === 'ground').y, 90);
    assert(p.elements.filter((e) => e.drive).length === 1 && p.connections.every((j) => !j.builtin));
    p = I.insertAssembly(p, kind, { x: 400, y: 200 }); assert(new Set(p.elements.map((e) => e.id)).size === p.elements.length);
    assert(p.elements.filter((e) => e.drive).length === 1 && p.elements.slice(ids.size).every((e) => !ids.has(e.id)));
  });
  add('Dĺžka, referenčná tuhosť a farba prežijú validáciu a natívny export.', () => {
    const e = link(), p = I.setProperties(custom(e), e.id, { length: 145, stiffness: 220, color: '#c15f3c' });
    const restored = K.validateProject(JSON.parse(JSON.stringify(p)));
    near(restored.elements[0].length, 145); near(restored.elements[0].stiffness, 220); assert(restored.elements[0].color === '#c15f3c');
  });
  add('Pôvodné šablóny odmietnu deštruktívne editácie bez zmeny dát.', () => {
    const p = K.preset('fourbar'), json = JSON.stringify(p), e = p.elements[1];
    for (const fn of [() => I.split(p, e.id), () => I.deleteSelection(p, [I.elementKey(e.id)]), () => I.toggleFixed(p, [ref(e)]), () => I.setCoordinates(p, ref(e), { x: 10, y: 10 })]) throws(fn);
    assert(JSON.stringify(p) === json);
  });
  add('Limit projektu odmietne pridaný bod atómovo.', () => {
    const p = custom(...Array.from({ length: 120 }, () => K.makeElement('node'))); throws(() => I.addNode(p, { x: 0, y: 0 })); assert(p.elements.length === 120);
  });
  add('Výber rozlišuje body, členy a väzby; modifikátor prepína položky.', () => {
    const e = link(), p = custom(e), a = I.nodeKey(ref(e)), b = I.elementKey(e.id);
    assert(I.target(p, a).type === 'node' && I.target(p, b).type === 'link');
    assert(I.select([a], b, true).length === 2 && I.select([a, b], a, true)[0] === b);
    assert(!I.select([a], null).length && I.validSelection(p, [a, a, 'e:missing']).length === 1);
  });
  add('Hit-testing uprednostní blízky uzol pred väzbou pri každom zoome.', () => {
    const candidates = [{ type: 'joint', key: 'j:1', a: { x: 0, y: 20 }, b: { x: 100, y: 20 } }, { type: 'node', key: 'n:1:a', at: { x: 20, y: 20 } }];
    assert(I.hitTest(candidates, { x: 28, y: 20 }) === 'n:1:a'); assert(I.hitTest(candidates, { x: 70, y: 24 }) === 'j:1');
    assert(I.hitTest(candidates, { x: 70, y: 40 }) === null);
  });
  add('Hit-testing na prekrývajúcich sa bodoch zachová aktívny uzol.', () => {
    const at = { x: 20, y: 20 }, c = [{ type: 'node', key: 'n:a:a', at }, { type: 'node', key: 'n:b:a', at, selected: true }];
    assert(I.hitTest(c, at) === 'n:b:a');
  });
  add('Vývoz samostatného uzla vytvorí kružnicu, nie degenerovaný člen.', () => {
    const p = I.addNode(custom(), { x: 30, y: 40 }), entities = global.KinmoExport.geometry(p, K.solve(p, 0));
    assert(entities.some((e) => e.kind === 'circle' && e.layer === 'NODE' && e.center.x === 30));
  });
  add('Posuvný kĺb vynúti vlastné limity smin a smax pozdĺž vedenia.', () => {
    const guide = K.makeElement('rail', 0, 0), node = K.makeElement('node', 220, 40); guide.drive = false;
    let p = I.setJoint(custom(guide, node), ref(node), { type: 'prismatic', other: ref(guide, 'curve') });
    p = I.setJointLimits(p, p.connections[0].id, 30, 90);
    const s = K.solve(p, 0); near(s.poses[node.id].a.x, 90); near(s.poses[node.id].a.y, 0); assert(!s.blocked);
    assert(E.freedom(p, s).free === 1, 'Jednostranný doraz nesmie predstierať úplné kinematické určenie.');
    throws(() => I.setJointLimits(p, p.connections[0].id, 90, 30));
    throws(() => I.setJointLimits(p, p.connections[0].id, 0, 1000));
  });
  add('Otočný kĺb vynúti relatívne uhlové limity bez zmeny dĺžky.', () => {
    const ground = K.makeElement('node', 10, 20), e = link(); ground.locked = true; e.angle = 100;
    let p = I.setJoint(custom(ground, e), ref(ground), { type: 'revolute', other: ref(e) });
    p = I.setJointLimits(p, p.connections[0].id, -30, 45);
    const s = K.solve(p, 0); near(s.poses[e.id].angle, 45); near(s.poses[e.id].length, 100); assert(!s.blocked);
  });
  add('Uhlový doraz na predpísanom pohone hlási blokovanie, nie tiché ignorovanie.', () => {
    const ground = K.makeElement('node', 10, 20), e = link(); ground.locked = true; e.drive = true;
    let p = I.setJoint(custom(ground, e), ref(ground), { type: 'revolute', other: ref(e) });
    p = I.setJointLimits(p, p.connections[0].id, -20, 60);
    assert(!K.solve(p, 40).blocked && K.solve(p, 100).blocked);
  });
  add('Zmena typu zruší nekompatibilné limity starého kĺbu.', () => {
    const guide = K.makeElement('rail'), e = link(); guide.drive = false;
    let p = I.setJoint(custom(guide, e), ref(e), { type: 'prismatic', other: ref(guide, 'curve') });
    p = I.setJointLimits(p, p.connections[0].id, 20, 70);
    p = I.setJoint(p, ref(e), { id: p.connections[0].id, type: 'revolute', other: ref(guide) });
    assert(p.connections[0].limitMin === null && p.connections[0].limitMax === null);
  });
  add('Odstránenie vedenia ložiska zruší aj implicitný slotId.', () => {
    const slot = K.makeElement('slot'), bearing = K.makeElement('bearing'); bearing.slotId = slot.id;
    const p = custom(slot, bearing), j = joint(ref(bearing), ref(slot, 'curve'), 'point-path'); p.connections.push(j);
    const next = I.deleteSelection(p, [I.jointKey(j.id)]);
    assert(next.elements.find((e) => e.id === bearing.id).slotId === '');
  });
  add('Zmena vzdialenostnej väzby na kĺb uvoľní riadiacu kótu.', () => {
    const a = K.makeElement('node'), b = link(), p = custom(a, b), j = joint(ref(a), ref(b), 'distance'); j.value = 80; p.connections.push(j);
    p.dimensions.push({ id: K.uid(), type: 'distance', a: ref(a), b: ref(b), constraintId: j.id });
    const next = I.setJoint(p, ref(a), { id: j.id, type: 'revolute', other: ref(b) });
    assert(next.connections[0].id === j.id && next.dimensions[0].constraintId === '');
  });
  add('Uvoľnenie POI na pevnom telese zachová polohu a odstráni rodiča.', () => {
    const e = link(); e.locked = true; const p = I.addPOI(custom(e), e.id), node = p.elements.at(-1), at = E.design(p, 0).poses[node.id].a;
    const next = I.toggleFixed(p, [ref(node)]), pose = E.design(next, 0).poses[node.id];
    assert(next.elements.at(-1).parentId === '' && !I.fixed(next, ref(node))); near(pose.a.x, at.x); near(pose.a.y, at.y);
  });
  add('Fixácia poháňaného bodu zmrazí jeho aktuálnu simulačnú polohu.', () => {
    const node = K.makeElement('node', 10, 20), p = I.setDriver(custom(node), ref(node), { enabled: true, mode: 'linear', speed: 30, min: 0, max: 100 });
    const next = I.toggleFixed(p, [ref(node)], K.solve(p, 70));
    assert(next.elements[0].locked && !next.elements[0].drive); near(next.elements[0].x, 80); near(K.solve(next, 0).poses[node.id].a.x, 80);
  });
  add('Ukotvenie konca motorového ramena zachová aktuálny uhol aj jeho pôvodný pivot.', () => {
    const e = link(); e.drive = true; const p = custom(e);
    const next = I.toggleFixed(p, [ref(e, 'b')], K.solve(p, 90)), s = K.solve(next, 0);
    assert(!next.elements.find((v) => v.id === e.id).drive && I.fixed(next, ref(e)) && I.fixed(next, ref(e, 'b')));
    near(s.poses[e.id].angle, 90); near(s.poses[e.id].a.x, 10); near(s.poses[e.id].b.y, -80);
  });
  add('Uvoľnenie pivotu motora zachová aktuálnu geometriu namiesto návratu do nuly.', () => {
    const e = link(); e.drive = true; const p = custom(e);
    const next = I.toggleFixed(p, [ref(e)], K.solve(p, 45));
    assert(!next.elements[0].drive); near(next.elements[0].angle, 45);
  });
  add('Pevné a pohyblivé uzly analytických šablón majú správny vizuálny stav.', () => {
    const p = K.preset('double-drawer'), samples = K.sample(p, 3);
    assert(I.status(p, { elementId: 'slot-1', point: 'a' }, samples) === 'free');
    assert(I.status(p, { elementId: 'frame-1', point: 'a' }, samples) === 'fixed');
    assert(I.status(p, { elementId: 'rail-1', point: 'a' }, samples) === 'driven');
  });
  add('Farba členu sa prenesie aj do vektorového výkresu.', () => {
    const e = link(), p = I.setProperties(custom(e), e.id, { color: '#c15f3c' });
    assert(global.KinmoExport.vectorSVG(p, K.solve(p, 0)).includes('stroke="#c15f3c"'));
  });
  add('Fixácia vozíka C zachová aktuálny posuv aj po vypnutí pohonu.', () => {
    const rail = K.makeElement('rail', 0, 0), p = custom(rail), r = ref(rail, 'c'), result = K.solve(p, 180);
    const at = result.poses[rail.id].c, next = I.toggleFixed(p, [r], result);
    assert(!next.elements[0].drive && I.fixed(next, r)); near(K.solve(next, 0).poses[rail.id].c.x, at.x);
    const moving = I.toggleFixed(next, [r]); assert(moving.elements[0].drive && !I.fixed(moving, r));
    near(K.solve(moving, 0).poses[rail.id].c.x, at.x);
  });
  add('Bod na pohyblivom vozíku sa nepovažuje za pevný bod vedenia.', () => {
    const rail = K.makeElement('rail'), marker = K.makeElement('node', 0, 0);
    marker.parentId = rail.id; marker.parentPoint = 'c'; const p = custom(rail, marker);
    assert(!I.fixed(p, ref(marker)));
  });
  add('Vektorový export nepustí neplatnú farbu do SVG atribútu.', () => {
    const node = K.makeElement('node'); node.color = '#fff" onload="bad';
    const p = { ...K.preset('custom'), elements: [node] };
    assert(!global.KinmoExport.vectorSVG(p, K.solve(p, 0)).includes('onload='));
  });
  add('Výmena poradia rovnakej posuvnej väzby zachová limity a správny uhol.', () => {
    const rail = K.makeElement('rail'); rail.drive = false;
    const e = link(); let p = I.setJoint(custom(rail, e), ref(rail, 'curve'), { type: 'prismatic', other: ref(e), value: 30 });
    p = I.setJointLimits(p, p.connections[0].id, 10, 100);
    const next = I.setJoint(p, ref(e), { id: p.connections[0].id, type: 'prismatic', other: ref(rail, 'curve'), value: -30 });
    near(next.connections[0].limitMin, 10); near(next.connections[0].limitMax, 100); near(K.solve(next, 0).poses[e.id].angle, 30);
  });
  add('Natívny súbor zachová fixovaný vozík, nulovú rýchlosť aj posuvnú väzbu.', () => {
    const rail = K.makeElement('rail'); let p = I.toggleFixed(custom(rail), [ref(rail, 'c')], K.solve(custom(rail), 150));
    const node = K.makeElement('node', 50, 0); p.elements.push(node); p = K.validateProject(p);
    p = I.setJoint(p, ref(node), { type: 'prismatic', other: ref(rail, 'curve') });
    p = I.setJointLimits(p, p.connections[0].id, 20, 100); p = I.setDriver(p, ref(node), { enabled: true, mode: 'linear', speed: 0, min: 0, max: 100 });
    const next = global.KinmoExport.parseNative(global.KinmoExport.serializeNative(p)).project;
    near(next.elements.find((e) => e.id === rail.id).carriageOffset, 75);
    near(next.elements.find((e) => e.id === node.id).driveSpeed, 0); near(next.connections[0].limitMax, 100);
  });
  add('Prepojenie ukotveného bodu inam odstráni nepoužívanú internú kotvu.', () => {
    const a = link(), b = K.makeElement('node', 120, 20), p = I.toggleFixed(custom(a, b), [ref(a)]);
    const next = I.setJoint(p, ref(a), { id: p.connections[0].id, type: 'revolute', other: ref(b) });
    assert(next.elements.length === 2 && !next.elements.some((e) => e.role === 'canvas-anchor'));
  });
  add('Skupinový posun nosiča a vnoreného POI sa nepripočíta dvakrát.', () => {
    const a = link(), b = link(), poi = K.makeElement('node', 20, 0);
    b.parentId = a.id; b.parentPoint = 'b'; poi.parentId = b.id;
    const p = custom(a, b, poi), before = E.design(p).poses[poi.id].a;
    const next = I.translate(p, [I.nodeKey(ref(poi)), I.elementKey(a.id)], { x: 10, y: 15 }), at = E.design(next).poses[poi.id].a;
    near(at.x, before.x + 10); near(at.y, before.y + 15); near(next.elements[2].x, 20);
  });
  add('Transformácia bodu a jeho nosiča je nezávislá od poradia výberu.', () => {
    const a = link(), poi = K.makeElement('node', 50, 0); poi.parentId = a.id;
    const p = custom(a, poi), before = E.design(p).poses[poi.id].a;
    const next = I.transformPoints(p, [ref(poi), ref(a)], (v) => ({ x: v.x + 5, y: v.y + 10 }));
    const at = E.design(next).poses[poi.id].a; near(at.x, before.x + 5); near(at.y, before.y + 10);
  });
  add('Fixácia pridaného bodu neprepíše pohon ani geometriu chránenej šablóny.', () => {
    let p = K.preset('drawer'); const marker = K.makeElement('node', 0, 0);
    marker.parentId = 'rail-1'; marker.parentPoint = 'c'; p.elements.push(marker); p = K.validateProject(p);
    const before = JSON.stringify(p.elements.filter((e) => e.primary));
    const next = I.toggleFixed(p, [ref(marker)], K.solve(p, 70));
    assert(JSON.stringify(next.elements.filter((e) => e.primary)) === before && I.fixed(next, ref(marker)));
  });
  global.KinematicsTestCases = [...(global.KinematicsTestCases || []), ...cases];
})(globalThis);
