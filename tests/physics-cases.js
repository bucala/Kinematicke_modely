(function (global) {
  'use strict';
  const K = global.Kinematics, P = global.KinmoPhysics, cases = [];
  const add = (name, run) => cases.push({ name, run });
  const assert = (v, m = 'Podmienka nebola splnená.') => { if (!v) throw new Error(m); };
  const near = (a, b, tolerance = 0.01) => assert(Number.isFinite(a) && Math.abs(a - b) <= tolerance, `${a} ≠ ${b}`);
  const throws = (fn) => { let failed = false; try { fn(); } catch { failed = true; } assert(failed); };
  const slider = (type = 'spring-compression') => {
    const anchor = K.makeElement('ground', 0, 0), body = K.makeElement('link', 120, 0), spring = K.makeElement(type);
    spring.damping = 0;
    Object.assign(body, { drive: true, driveMode: 'linear', stroke: 120, length: 50, mass: 1 });
    if (type.startsWith('piston-')) Object.assign(spring, { length: 120, restLength: 160, minLength: 80, maxLength: 240 });
    spring.mountA = { elementId: anchor.id, point: 'a' }; spring.mountB = { elementId: body.id, point: 'a' };
    const project = K.preset('custom'); project.parameters.travelMax = 120; project.elements = [anchor, body, spring];
    Object.assign(project.simulation, { gravity: 0, damping: 0, friction: 0, mode: 'dynamic' });
    return { project, anchor, body, spring };
  };

  add('Tlačná pružina pôsobí len pri stlačení.', () => {
    const e = K.makeElement('spring-compression');
    near(P.axial(e, 120).signedForce, 50); near(P.axial(e, 180).signedForce, 0);
    near(P.axial(e, 80).signedForce, 100); near(P.axial(e, 120).potential, 1);
  });
  add('Ťažná pružina pôsobí správnym smerom a rešpektuje predpätie.', () => {
    const e = K.makeElement('spring-extension'); e.force = 110; e.preload = 10;
    near(P.axial(e, 159).signedForce, 0); near(P.axial(e, 160).signedForce, -10);
    near(P.axial(e, 200).signedForce, -60); near(P.axial(e, 240).signedForce, -110);
  });
  add('Tuhosť v N/mm nezávisí od hodnoty katalógového F.', () => {
    const e = K.makeElement('spring-compression'); e.forceMode = 'stiffness'; e.stiffness = 2;
    near(P.axial(e, 120).signedForce, 80);
  });
  add('Pružina s osovým tlmením odporuje rýchlosti, nie polohe.', () => {
    const e = K.makeElement('spring-compression'); e.damping = 20;
    near(P.axial(e, 120, 1).dampingForce, -20); near(P.axial(e, 120, -1).dampingForce, 20);
    near(P.axial(e, 200, 1).dampingForce, 0);
  });
  add('Tlačný a ťažný piest majú opačné smery konštantnej sily.', () => {
    const a = K.makeElement('piston-push'), b = K.makeElement('piston-pull');
    near(P.axial(a, 150).signedForce, 100); near(P.axial(b, 150).signedForce, -100);
  });
  add('Progresívna vzpera správne mení silu po zdvihu.', () => {
    const a = K.makeElement('piston-push'), b = K.makeElement('piston-pull'); a.progression = b.progression = 1.2;
    near(P.axial(a, a.minLength).signedForce, 120); near(P.axial(a, a.maxLength).signedForce, 100);
    near(P.axial(b, b.minLength).signedForce, -100); near(P.axial(b, b.maxLength).signedForce, -120);
  });
  add('Montáž pružiny nemení tuhú geometriu pripojeného telesa.', () => {
    const { project, body, spring } = slider(), s = K.solve(project, 30);
    near(s.poses[body.id].a.x, 150); near(s.poses[body.id].length, 50); near(s.poses[spring.id].length, 150);
    assert(!s.blocked);
  });
  add('Kĺby na pružine znamenajú montáž, nie tuhú vzdialenosť.', () => {
    const { project, body, anchor, spring } = slider(); spring.mountA = spring.mountB = null;
    project.connections = [['a', anchor], ['b', body]].map(([key, e]) => ({ id: K.uid(), name: 'Montáž', type: 'revolute', a: { elementId: spring.id, point: key }, b: { elementId: e.id, point: 'a' } }));
    const s = K.solve(K.validateProject(project), 30);
    near(s.poses[spring.id].length, 150); near(s.poses[body.id].a.x, 150);
  });
  add('Osové sily v oboch čapoch sú rovnako veľké a opačné.', () => {
    const { project } = slider(), force = K.solve(project, 0).forces[0];
    near(force.atA.x + force.atB.x, 0); near(force.atA.y + force.atB.y, 0); near(force.magnitude, 50);
  });
  add('Kinematika odmietne prekročenie dĺžky piesta aj bez kolízií.', () => {
    const { project, spring } = slider('piston-push'); spring.maxLength = 180; spring.restLength = 160;
    const s = K.solve(project, 100, { collisions: false });
    assert(s.blocked && s.invalid.includes(spring.id));
  });
  add('Editor dovolí meniť montáž aj mimo pracovného rozsahu.', () => {
    const { project, spring } = slider('piston-push'); spring.maxLength = 180; spring.restLength = 160;
    assert(!global.KinmoEditor.design(project, 100).blocked);
  });
  add('Import pružných prvkov zachová force, montáž, hmotnosť a dynamiku.', () => {
    const { project, body, spring } = slider(); body.mass = 3; spring.damping = 12; project.simulation.inputForce = 4;
    const p = K.validateProject(JSON.parse(JSON.stringify(project)));
    near(p.elements.find((e) => e.id === body.id).mass, 3); near(p.elements.find((e) => e.id === spring.id).damping, 12);
    near(p.simulation.inputForce, 4); assert(p.simulation.mode === 'dynamic');
  });
  add('Import odmietne nesprávne dĺžky, predpätie a priemery.', () => {
    for (const patch of [{ minLength: 200, maxLength: 100 }, { restLength: 20 }, { wireDiameter: 20 }, { mass: -1 }, { force: -1 }]) {
      const { project, spring } = slider(); Object.assign(spring, patch); throws(() => K.validateProject(project));
    }
    const a = slider('piston-push'); a.spring.rodDiameter = a.spring.diameter; throws(() => K.validateProject(a.project));
    const b = slider('spring-extension'); b.spring.preload = 101; throws(() => K.validateProject(b.project));
  });
  add('Import odmietne pružinu pripojenú k sebe alebo inej pružine.', () => {
    const { project, spring } = slider(); spring.mountA = { elementId: spring.id, point: 'a' };
    throws(() => K.validateProject(project));
  });
  add('Efektívna hmotnosť jedného lineárneho pohonu používa kilogramy.', () => {
    const { project } = slider(), context = P.prepare(project), value = P.generalized(context, 20);
    near(value.mass, 1, 1e-6); near(value.elasticForce, 25, 1e-6); near(value.handForce, -25, 1e-6);
    assert(value.unit === 'N');
  });
  add('Sila pružiny skutočne uvedie pohon do pohybu.', () => {
    const { project } = slider(), context = P.prepare(project), s = P.step(context, P.initialState(context), .03);
    assert(s.motion > 0 && s.velocity > 0 && !s.stopped);
    assert(s.motion < 120);
  });
  add('Väčšia sila a menšia hmotnosť majú väčšie zrýchlenie.', () => {
    const a = slider(), b = slider(); b.spring.force *= 2;
    const ca = P.prepare(a.project), cb = P.prepare(b.project);
    const sa = P.step(ca, P.initialState(ca), .01), sb = P.step(cb, P.initialState(cb), .01);
    assert(sb.velocity > sa.velocity * 1.9);
    a.body.mass = 2; const heavier = P.prepare(a.project), sh = P.step(heavier, P.initialState(heavier), .01);
    assert(sh.velocity < sa.velocity * .51);
  });
  add('Ťažná vzpera zmenší lineárny posuv, tlačná ho zväčší.', () => {
    const a = slider('piston-push'), b = slider('piston-pull'), ca = P.prepare(a.project), cb = P.prepare(b.project);
    const sa = P.step(ca, P.initialState(ca, 60), .01), sb = P.step(cb, P.initialState(cb, 60), .01);
    assert(sa.motion > 60 && sb.motion < 60);
  });
  add('Nulové sily zachovajú nulovú rýchlosť.', () => {
    const { project, spring } = slider(); spring.force = 0;
    const c = P.prepare(project), s = P.step(c, P.initialState(c, 40), .1);
    near(s.motion, 40, 1e-8); near(s.velocity, 0, 1e-8);
  });
  add('Počiatočná rýchlosť v mm/s sa prevedie na m/s.', () => {
    const { project, spring } = slider(); spring.force = 0; project.simulation.initialVelocity = 10;
    const c = P.prepare(project), s = P.step(c, P.initialState(c, 40), .1);
    near(s.motion, 41, 1e-6); near(s.velocity, .01, 1e-9);
  });
  add('Gravitácia smeruje nadol v SVG a používa m/s².', () => {
    const { project, body, spring } = slider(); body.driveAngle = -90; spring.force = 0;
    spring.maxLength = 500; project.simulation.gravity = 9.81;
    const c = P.prepare(project), value = P.generalized(c, 20);
    near(value.gravity, 9.81, 1e-5);
  });
  add('Rotačný pohon počíta moment a efektívnu zotrvačnosť.', () => {
    const p = K.preset('custom'), e = K.makeElement('link', 0, 0); e.drive = true; e.length = 1000; e.mass = 1; e.width = .1;
    p.elements = [e]; const c = P.prepare(p), v = P.generalized(c, 0);
    assert(v.unit === 'N·m'); near(v.mass, 1 / 3, .001); near(v.gravity, -4.905, .002);
  });
  add('Suché trenie udrží pohon v pokoji pod prahom sily.', () => {
    const { project, spring } = slider(); spring.force = 0; project.simulation.inputForce = 2; project.simulation.friction = 3;
    const c = P.prepare(project), s = P.step(c, P.initialState(c, 40), .1);
    near(s.velocity, 0, 1e-9); near(s.motion, 40, 1e-9);
  });
  add('Dynamika sa na limite zastaví bez odrazu.', () => {
    const { project, spring } = slider('piston-push'); spring.force = 10000;
    const c = P.prepare(project), s = P.step(c, P.initialState(c, 119), .1);
    assert(s.stopped); near(s.motion, 120); near(s.velocity, 0);
  });
  add('Dynamika nepreskočí doraz maximálnej dĺžky pružného prvku.', () => {
    const { project, spring } = slider('piston-push'); spring.force = 10000; spring.maxLength = 180; spring.restLength = 160;
    const c = P.prepare(project), s = P.step(c, P.initialState(c, 50), .1);
    assert(s.stopped); assert(s.motion <= 60.06 && s.motion >= 59.9);
  });
  add('Dynamika odmietne neúplne určený vlastný model.', () => {
    const { project } = slider(); project.elements.push(K.makeElement('link', 400, 100));
    throws(() => P.prepare(project));
    const noInput = K.preset('custom'); noInput.elements.push(K.makeElement('link')); throws(() => P.prepare(noInput));
  });
  add('Dynamika odmietne nulovú hmotnosť pohyblivých telies.', () => {
    const { project, body } = slider(); body.mass = 0;
    throws(() => P.prepare(project));
  });
  add('Dynamika rešpektuje maximálny čas a odmietne neplatný krok.', () => {
    const { project, spring } = slider(); spring.force = 0; project.simulation.duration = .1;
    const c = P.prepare(project), initial = P.initialState(c), s = P.step(c, initial, .2);
    assert(s.stopped); near(s.time, .1, 1e-10); throws(() => P.step(c, initial, NaN)); throws(() => P.step(c, initial, -1)); throws(() => P.step(c, initial, 1));
  });
  add('Zastavený dynamický stav sa ďalej nemení.', () => {
    const { project } = slider(), c = P.prepare(project), s = { ...P.initialState(c), stopped: true, reason: 'Doraz' };
    assert(JSON.stringify(P.step(c, s, .1)) === JSON.stringify(s));
  });
  add('Dynamické kroky nemenia uloženú geometriu projektu.', () => {
    const { project } = slider(), json = JSON.stringify(project), c = P.prepare(project);
    P.step(c, P.initialState(c), .1); assert(JSON.stringify(project) === json);
  });
  add('Spoločný otočný čap pružiny a piesta nezmizne a nezávisí od poradia prvkov.', () => {
    const p = K.preset('custom'), ground = K.makeElement('ground', 0, 0), piston = K.makeElement('piston-push', 0, 0), spring = K.makeElement('spring-compression', 240, 0);
    spring.length = 120; piston.mountA = { elementId: ground.id, point: 'a' };
    p.elements = [ground, piston, spring];
    p.connections = [{ id: K.uid(), type: 'revolute', a: { elementId: piston.id, point: 'b' }, b: { elementId: spring.id, point: 'a' } }];
    const result = K.solve(K.validateProject(p), 0, { collisions: false });
    assert(!result.blocked); near(result.poses[piston.id].length, 240); near(result.poses[spring.id].length, 120);
    const reversed = K.solve({ ...p, elements: [...p.elements].reverse() }, 0, { collisions: false });
    for (const e of [piston, spring]) for (const key of ['a', 'b']) near(K.distance(result.poses[e.id][key], reversed.poses[e.id][key]), 0);
  });
  add('Reťazec pružných prvkov prenesie pevné uloženie cez spoločný čap.', () => {
    const p = K.preset('custom'), ground = K.makeElement('ground', 120, 0), a = K.makeElement('spring-compression', 0, 0), b = K.makeElement('spring-extension', 120, 0);
    a.mountB = { elementId: ground.id, point: 'a' }; p.elements = [b, ground, a];
    p.connections = [{ id: K.uid(), type: 'revolute', a: { elementId: a.id, point: 'b' }, b: { elementId: b.id, point: 'a' } }];
    const result = K.solve(p, 0, { collisions: false });
    near(result.poses[a.id].b.x, 120); near(result.poses[b.id].a.x, 120); assert(!result.blocked);
    const graph = K.elasticGraph(p, result.poses), group = graph.groups.find((g) => g.ports.length === 2);
    assert(group.anchors.length === 1); near(group.mass, .2);
    assert(global.KinmoInteraction.fixed(p, { elementId: b.id, point: 'a' }));
  });
  add('Nezhodné uloženie spoločného čapu hlási chybu a zachová viditeľné telesá.', () => {
    const p = K.preset('custom'), g = K.makeElement('ground', 0, 0), h = K.makeElement('ground', 20, 0), a = K.makeElement('spring-compression'), b = K.makeElement('piston-push');
    a.mountA = { elementId: g.id, point: 'a' }; b.mountA = { elementId: h.id, point: 'a' }; p.elements = [g, h, a, b];
    p.connections = [{ id: K.uid(), type: 'revolute', a: { elementId: a.id, point: 'a' }, b: { elementId: b.id, point: 'a' } }];
    const result = K.solve(p, 0, { collisions: false });
    assert(result.blocked && result.poses[a.id] && result.poses[b.id]); assert(result.issues.some((s) => /nezhodné uloženie/.test(s)));
  });
  const freeSpring = (damping = 0) => {
    const p = K.preset('custom'), ground = K.makeElement('ground', 0, 0), spring = K.makeElement('spring-compression', 0, 0);
    spring.length = 120; spring.mountA = { elementId: ground.id, point: 'a' }; spring.damping = damping; p.elements = [ground, spring];
    Object.assign(p.simulation, { mode: 'dynamic', gravity: 0, damping: 0 });
    return { p, spring };
  };
  add('Voľný čap pružiny sa hýbe zo sily aj bez predpísaného pohonu.', () => {
    const { p, spring } = freeSpring(), json = JSON.stringify(p), c = P.prepare(p, { collisions: false }), initial = P.initialState(c), s = P.step(c, initial, .01);
    const id = c.network.graph.ports[`${spring.id}:b`];
    assert(!s.stopped && s.particles[id].x > initial.particles[id].x && s.particles[id].vx > 0); near(s.particles[id].y, 0);
    const pose = K.solve(p, s.motion, { collisions: false, elasticPositions: P.elasticPositions(s) }).poses[spring.id]; near(pose.b.x, s.particles[id].x);
    assert(JSON.stringify(p) === json && initial.particles[id].x === 120);
  });
  add('Tlmenie skutočne zmenší rýchlosť voľného čapu pružiny.', () => {
    const a = freeSpring(0), b = freeSpring(30), ca = P.prepare(a.p, { collisions: false }), cb = P.prepare(b.p, { collisions: false });
    const sa = P.step(ca, P.initialState(ca), .01), sb = P.step(cb, P.initialState(cb), .01);
    assert(sb.particles[cb.network.graph.ports[`${b.spring.id}:b`]].vx < sa.particles[ca.network.graph.ports[`${a.spring.id}:b`]].vx * .6);
  });
  add('Väčšia hmotnosť voľného čapu zníži zrýchlenie.', () => {
    const a = freeSpring(), b = freeSpring(); b.spring.tipMass = .4;
    const ca = P.prepare(a.p), cb = P.prepare(b.p), sa = P.step(ca, P.initialState(ca), .001), sb = P.step(cb, P.initialState(cb), .001);
    const va = sa.particles[ca.network.graph.ports[`${a.spring.id}:b`]].vx, vb = sb.particles[cb.network.graph.ports[`${b.spring.id}:b`]].vx;
    assert(vb < va * .3 && vb > va * .2);
  });
  add('Tlmič má nulovú statickú silu a samostatné odpory pri zasúvaní a vysúvaní.', () => {
    const e = K.makeElement('piston-push'); Object.assign(e, { actuatorMode: 'damper', damping: 10, dampingCompression: 40, dampingExtension: 20 });
    near(P.axial(e, 200, 0).signedForce, 0); near(P.axial(e, 200, -2).signedForce, 80); near(P.axial(e, 200, 2).signedForce, -40);
    for (const v of [-2, 2]) assert(P.axial(e, 200, v).signedForce * v < 0);
  });
  add('Samostatný tlmič spomalí pohyb a bez rýchlosti sa nerozbehne.', () => {
    const p = K.preset('custom'), ground = K.makeElement('ground', 0, 0), damper = K.makeElement('piston-push', 0, 0);
    Object.assign(damper, { length: 200, actuatorMode: 'damper', damping: 10 }); damper.mountA = { elementId: ground.id, point: 'a' }; p.elements = [ground, damper]; p.simulation.gravity = 0;
    const c = P.prepare(p, { collisions: false }), s = P.initialState(c), id = c.network.graph.ports[`${damper.id}:b`];
    near(P.step(c, s, .05).particles[id].x, 200); s.particles[id].vx = .1;
    const next = P.step(c, s, .01); assert(next.particles[id].vx > 0 && next.particles[id].vx < .05); assert(next.particles[id].x > 200);
    assert(P.dynamicForces(c, next, K.solve(p, next.motion, { elasticPositions: P.elasticPositions(next) }))[0].dampingForce < 0);
  });
  add('Spoločné pružné čapy majú jeden dynamický bod a pružina rozhýbe piest.', () => {
    const p = K.preset('custom'), ground = K.makeElement('ground', 0, 0), piston = K.makeElement('piston-push', 0, 0), spring = K.makeElement('spring-compression', 200, 0);
    spring.length = 120; Object.assign(piston, { length: 200, actuatorMode: 'damper', damping: 10 }); piston.mountA = { elementId: ground.id, point: 'a' }; p.elements = [ground, spring, piston];
    p.connections = [{ id: K.uid(), type: 'revolute', a: { elementId: piston.id, point: 'b' }, b: { elementId: spring.id, point: 'a' } }]; p.simulation.gravity = 0;
    const c = P.prepare(p, { collisions: false }), s = P.step(c, P.initialState(c), .01), result = K.solve(p, 0, { collisions: false, elasticPositions: P.elasticPositions(s) });
    assert(c.network.graph.ports[`${piston.id}:b`] === c.network.graph.ports[`${spring.id}:a`]); near(K.distance(result.poses[piston.id].b, result.poses[spring.id].a), 0);
    assert(!result.blocked && result.poses[piston.id] && result.poses[spring.id]); assert(result.poses[piston.id].length < 200);
  });
  add('Dynamický voľný koniec neprekročí pracovné dorazy ani pri veľkej sile.', () => {
    const { p, spring } = freeSpring(); spring.force = 1000; spring.restLength = spring.maxLength = 160;
    const c = P.prepare(p, { collisions: false }); let s = P.initialState(c);
    for (let i = 0; i < 20; i++) { s = P.step(c, s, .01); const r = K.solve(p, 0, { collisions: false, elasticPositions: P.elasticPositions(s) }); assert(!r.blocked); assert(r.poses[spring.id].length <= 160.00001); }
  });
  add('Rozmery valca rastú s návrhovou dĺžkou a valec pojme celý zdvih.', () => {
    const e = K.makeElement('piston-push'), initial = K.pistonGeometry(e); assert(initial.fits);
    K.resizePiston(e, 480); const larger = K.pistonGeometry(e);
    assert(larger.cylinder > initial.cylinder * 1.8 && larger.fits); near(e.length, 480); near(e.maxLength, 480);
    near(larger.cylinder, K.pistonGeometry(e).cylinder);
    const json = JSON.stringify(e); throws(() => K.resizePiston(e, 1)); assert(JSON.stringify(e) === json);
    const p = K.preset('custom'); p.elements = [e];
    const extended = global.KinmoInteraction.setCoordinates(p, { elementId: e.id, point: 'b' }, { x: e.x + 600, y: e.y });
    assert(K.pistonGeometry(extended.elements[0]).fits && K.pistonGeometry(extended.elements[0]).cylinder > larger.cylinder);
  });
  add('Nové parametre tlmiča a hmotnosti zachová uloženie aj import.', () => {
    const { p, spring } = freeSpring(); Object.assign(spring, { dampingCompression: 23, dampingExtension: 45, tipMass: .7 });
    const copy = global.KinmoExport.parseNative(global.KinmoExport.serializeNative(p)).project.elements.find((e) => e.id === spring.id);
    near(copy.dampingCompression, 23); near(copy.dampingExtension, 45); near(copy.tipMass, .7);
    for (const patch of [{ dampingCompression: -1 }, { dampingExtension: Infinity }, { tipMass: 0 }]) { Object.assign(spring, patch); throws(() => K.validateProject(p)); Object.assign(spring, { dampingCompression: 23, dampingExtension: 45, tipMass: .7 }); }
  });

  add('Sila z voľného pružného čapu sa prenesie aj na pohyblivé nosné teleso.', () => {
    const p = K.preset('custom'), body = K.makeElement('link', 0, 0), spring = K.makeElement('spring-compression', 60, 0);
    spring.length = 120; Object.assign(body, { drive: true, driveMode: 'linear', stroke: 120, mass: 1 }); spring.mountA = { elementId: body.id, point: 'a' };
    p.elements = [body, spring]; p.parameters.travelMax = 120; Object.assign(p.simulation, { gravity: 0, damping: 0 });
    const c = P.prepare(p, { motion: 60, collisions: false }), initial = P.initialState(c, 60), s = P.step(c, initial, .005);
    assert(s.motion < 60 && s.velocity < 0 && !s.stopped); assert(s.particles[c.network.graph.ports[`${spring.id}:b`]].vx > 0);
    const csv = global.KinmoExport.forceCSV(p, [], c, [initial, s]);
    const rows = csv.split('\r\n'), index = rows[0].split(';').indexOf(`${spring.id}_dlzka_mm`);
    assert(Number(rows[2].split(';')[index].replaceAll('"', '')) > Number(rows[1].split(';')[index].replaceAll('"', '')));
  });
  add('Montáž dlhého piesta prispôsobí valec skutočným čapom bez presunu uloženia.', () => {
    const p = K.preset('custom'), a = K.makeElement('ground', 0, 0), b = { ...K.makeElement('node', 600, 0), locked: true }, piston = K.makeElement('piston-push', 0, 0), I = global.KinmoInteraction;
    p.elements = [a, b, piston];
    const first = I.setJoint(p, { elementId: piston.id, point: 'a' }, { type: 'revolute', other: { elementId: a.id, point: 'a' } });
    const mounted = I.setJoint(first, { elementId: piston.id, point: 'b' }, { type: 'revolute', other: { elementId: b.id, point: 'a' } }), e = mounted.elements.find((e) => e.id === piston.id), result = K.solve(mounted, 0), g = K.pistonGeometry(e);
    assert(!result.blocked && g.fits); near(e.maxLength, 600); near(result.poses[piston.id].length, 600);
    assert(600 - g.cylinder <= g.cylinder + g.eye); near(result.poses[a.id].a.x, 0); near(result.poses[b.id].a.x, 600);
    assert(piston.maxLength === 240 && p.connections.length === 0);
  });
  add('Aj neplatný starší piest má viditeľnú tyč, ktorá nie je dlhšia než valec s okom.', () => {
    const e = K.makeElement('piston-push'), g = K.pistonGeometry(e, 650);
    assert(650 - g.cylinder <= g.cylinder + g.eye); assert(e.maxLength === 240);
  });
  for (const type of ['spring-compression', 'spring-extension', 'piston-push', 'piston-pull']) {
    add(`${type}: po pustení sa vráti tlmene do prirodzenej východiskovej polohy.`, () => {
      const p = K.preset('custom'), anchor = K.makeElement('ground', 0, 0), e = K.makeElement(type, 0, 0), body = K.makeElement('node', e.length, 0);
      const compression = ['spring-compression', 'piston-push'].includes(type), stroke = type.startsWith('piston-') ? 96 : 80;
      Object.assign(body, { mass: 1, drive: true, driveMode: 'linear', driveAngle: compression ? 180 : 0, stroke });
      e.mountA = { elementId: anchor.id, point: 'a' }; e.mountB = { elementId: body.id, point: 'a' }; p.elements = [anchor, body, e]; p.parameters.travelMax = stroke; p.simulation.gravity = 0;
      const c = P.prepare(p, { motion: 40, collisions: false }); let state = P.initialState(c, 40), g = K.pistonGeometry(e).cylinder;
      state = P.step(c, state, .05); assert(state.motion < 40 && state.motion > 0 && state.velocity < 0);
      for (let i = 0; i < 80 && !state.stopped; i++) state = P.step(c, state, .05);
      near(state.motion, 0, .02); near(K.solve(p, state.motion, { collisions: false }).poses[e.id].length, e.length, .02);
      if (type.startsWith('piston-')) near(K.pistonGeometry(e).cylinder, g);
    });
  }
  add('Priame stlačenie voľného čapu rešpektuje dorazy a po pustení nemení konštrukciu.', () => {
    const p = K.preset('custom'), anchor = K.makeElement('ground', 0, 0), e = K.makeElement('spring-compression', 0, 0); e.mountA = { elementId: anchor.id, point: 'a' }; p.elements = [anchor, e]; p.simulation.gravity = 0;
    const json = JSON.stringify(p), c = P.prepare(p), initial = P.initialState(c), id = c.network.graph.ports[`${e.id}:b`], held = P.dragTip(c, initial, id, { x: 20, y: 0 });
    near(held.particles[id].x, e.minLength); near(initial.particles[id].x, 160);
    let state = P.dragTip(c, initial, id, { x: 120, y: 0 });
    state = P.step(c, state, .1); assert(state.particles[id].x > 120 && state.particles[id].x < 160);
    for (let i = 0; i < 50; i++) state = P.step(c, state, .1);
    near(state.particles[id].x, 160, .05); assert(JSON.stringify(p) === json);
  });
  add('Nové pružiny začínajú v pokoji a ťažný piest v zasunutej polohe.', () => {
    for (const type of ['spring-compression', 'spring-extension']) { const e = K.makeElement(type); near(e.length, e.restLength); near(P.axial(e, e.length).signedForce, 0); assert(e.damping > 0); }
    const pull = K.makeElement('piston-pull'); near(pull.length, pull.minLength); assert(K.pistonGeometry(pull).fits);
  });

  add('Automatický návrat tlmí aj starší nulový odpor, bez prepísania parametrov prvku.', () => {
    const { project, spring } = slider(); spring.damping = 0; project.simulation.returnDamping = 200; const before = JSON.stringify(project);
    const ordinary = P.prepare(project), returning = P.prepare(project, { returning: true });
    const a = P.step(ordinary, P.initialState(ordinary), .03), b = P.step(returning, P.initialState(returning), .03);
    assert(b.motion < a.motion && b.motion > 0 && returning.returning); near(returning.elastic[0].damping, 200); near(spring.damping, 0); assert(JSON.stringify(project) === before);
  });
  add('Pružina rozhýbe nepoháňané rameno okolo pevného čapu a neprepíše návrh.', () => {
    const p=K.preset('custom'),pivot=K.makeElement('ground',0,0),anchor=K.makeElement('ground',0,200),link=K.makeElement('link',0,0),spring=K.makeElement('spring-extension',0,200);
    spring.mountA={elementId:anchor.id,point:'a'};spring.mountB={elementId:link.id,point:'b'};
    p.elements=[pivot,anchor,link,spring];p.connections=[{id:K.uid(),type:'revolute',a:{elementId:link.id,point:'a'},b:{elementId:pivot.id,point:'a'}}];p.simulation.gravity=0;
    const json=JSON.stringify(p),c=P.prepare(p,{collisions:false}),initial=P.initialState(c),state=P.step(c,initial,.03),result=K.solve(p,0,{collisions:false,bodyPositions:P.bodyPositions(state),elasticPositions:P.elasticPositions(state)});
    assert(c.bodyDynamics && !state.stopped && !result.blocked);assert(result.poses[link.id].b.y>1);near(K.distance(result.poses[link.id].a,result.poses[pivot.id].a),0,.001);near(result.poses[link.id].length,120);
    assert(JSON.stringify(p)===json && initial.bodies[link.id].angle===0);
  });
  add('Silový pohyb ramena s ložiskom v kulise funguje bez motora.', () => {
    const p=K.preset('custom'),anchor=K.makeElement('ground',0,240),link=K.makeElement('link',0,0),slot=K.makeElement('slot',120,0),bearing=K.makeElement('bearing',120,0),spring=K.makeElement('spring-extension',0,0);
    Object.assign(slot,{curveKind:'polyline',controls:[{x:0,y:0},{x:80,y:80},{x:160,y:100}],slotWidth:20});bearing.slotId=slot.id;
    spring.mountA={elementId:link.id,point:'a'};spring.mountB={elementId:anchor.id,point:'a'};p.elements=[anchor,slot,link,bearing,spring];p.simulation.gravity=0;
    p.connections=[{id:K.uid(),type:'revolute',a:{elementId:link.id,point:'b'},b:{elementId:bearing.id,point:'a'}}];
    const c=P.prepare(p,{collisions:false}),state=P.step(c,P.initialState(c),.03),result=K.solve(p,0,{collisions:false,bodyPositions:P.bodyPositions(state)});
    assert(c.bodyDynamics && c.freedom.free===2 && !state.stopped && !result.blocked);assert(result.poses[link.id].a.y>1);
    near(K.distance(result.poses[link.id].b,result.poses[bearing.id].a),0,.001);near(K.nearestOnPath(result.poses[bearing.id].a,result.poses[slot.id].path).distance,0,.001);
    const csv=global.KinmoExport.forceCSV(p,[],c,[state]);assert(!csv.includes('NaN'));
  });
  add('Automatická montáž pružiny zachová jej tuhosť a povolí dlhú montáž.', () => {
    const p=K.preset('custom'),a=K.makeElement('ground',0,0),b=K.makeElement('ground',0,353),spring=K.makeElement('spring-extension',0,0);spring.mountA={elementId:a.id,point:'a'};spring.mountB={elementId:b.id,point:'a'};p.elements=[a,b,spring];
    const rate=P.springRate(spring),next=K.fitElasticRanges(K.copy(p)),e=next.elements.find((e)=>e.id===spring.id);near(P.springRate(e),rate);assert(e.maxLength>353 && e.restLength===160 && !K.solve(next,0).blocked);
    spring.rangeMode='manual';const manual=K.fitElasticRanges(K.copy(p));near(manual.elements.find((e)=>e.id===spring.id).maxLength,240);assert(K.solve(manual,0).blocked);
  });
  add('Nepoháňané rameno s piestom sa zastaví na ručnom doraze bez preskočenia.', () => {
    const p=K.preset('custom'),pivot=K.makeElement('ground',0,0),anchor=K.makeElement('ground',0,200),link=K.makeElement('link',0,0),piston=K.makeElement('piston-push',0,200);
    Object.assign(piston,{force:1000,rangeMode:'manual',mountA:{elementId:anchor.id,point:'a'},mountB:{elementId:link.id,point:'b'}});
    p.elements=[pivot,anchor,link,piston];p.connections=[{id:K.uid(),type:'revolute',a:{elementId:link.id,point:'a'},b:{elementId:pivot.id,point:'a'}}];p.simulation.gravity=0;
    const c=P.prepare(p,{collisions:false});let state=P.initialState(c);
    for(let i=0;i<100&&!state.stopped;i++)state=P.step(c,state,.01);
    const result=K.solve(p,0,{collisions:false,bodyPositions:P.bodyPositions(state)});
    assert(state.stopped && !result.blocked);near(result.poses[piston.id].length,piston.maxLength,.002);near(K.distance(result.poses[link.id].a,result.poses[pivot.id].a),0,.001);
    assert(Object.values(state.bodies).every(b=>[b.vx,b.vy,b.omega].every(v=>v===0)));
  });
  add('Odhadová dynamika pomenuje diely, ktoré sa ešte voľne pohybujú.', () => {
    const crank = { ...K.makeElement('link', 0, 0), id: 'crank', drive: true }, loose = { ...K.makeElement('link', 300, 0), id: 'loose', name: 'Voľné rameno' };
    const ground = { ...K.makeElement('ground', 0, 0), id: 'base' }, project = K.validateProject({ ...K.preset('custom'), elements: [ground, crank, loose], connections: [{ id: 'pivot', name: 'Uloženie', type: 'revolute', a: { elementId: 'base', point: 'a' }, b: { elementId: 'crank', point: 'a' } }] });
    project.simulation.mode = 'dynamic';
    let message = '';
    try { P.prepare(project); } catch (error) { message = error.message; }
    assert(/Voľne sa pohybuje: Voľné rameno\./.test(message), message || 'Dynamika mala odmietnuť voľné rameno.');
  });
  add('Ťahanie ramena otočne uloženého na pevnom čape ho otočí za kurzorom a čap zostane na mieste.', () => {
    const ground = { ...K.makeElement('ground', 0, 0), id: 'base' }, arm = { ...K.makeElement('link', 0, 0), id: 'arm', mass: 1, angle: 90 }, spring = { ...K.makeElement('spring-compression', 0, 0), id: 'push' };
    const joint = (id, a, ap, b, bp) => ({ id, name: id, type: 'revolute', a: { elementId: a, point: ap }, b: { elementId: b, point: bp } });
    const project = K.validateProject({ ...K.preset('custom'), elements: [ground, arm, spring], connections: [joint('pivot', 'base', 'a', 'arm', 'a'), joint('top', 'push', 'a', 'base', 'b'), joint('tip', 'push', 'b', 'arm', 'b')] });
    project.simulation.mode = 'dynamic';
    const context = P.prepare(project), start = P.initialState(context, 0), tip = { x: 0, y: -120 }, target = { x: 85, y: -85 };
    const moved = P.dragBody(context, start, 'arm', target, K.localPoint({ a: { x: start.bodies.arm.x, y: start.bodies.arm.y }, angle: start.bodies.arm.angle }, tip));
    const body = moved.bodies.arm;
    near(body.x, 0, 0.01); near(body.y, 0, 0.01); near(body.angle, 45, 0.5);
  });
  global.KinematicsTestCases = Object.freeze([...global.KinematicsTestCases, ...cases]);
})(globalThis);
