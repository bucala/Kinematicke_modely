(function (global) {
  'use strict';
  const K = global.Kinematics, P = global.KinmoPhysics, cases = [];
  const add = (name, run) => cases.push({ name, run });
  const assert = (v, m = 'Podmienka nebola splnená.') => { if (!v) throw new Error(m); };
  const near = (a, b, tolerance = 0.01) => assert(Number.isFinite(a) && Math.abs(a - b) <= tolerance, `${a} ≠ ${b}`);
  const throws = (fn) => { let failed = false; try { fn(); } catch { failed = true; } assert(failed); };
  const slider = (type = 'spring-compression') => {
    const anchor = K.makeElement('ground', 0, 0), body = K.makeElement('link', 120, 0), spring = K.makeElement(type);
    Object.assign(body, { drive: true, driveMode: 'linear', stroke: 120, length: 50, mass: 1 });
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
  global.KinematicsTestCases = Object.freeze([...global.KinematicsTestCases, ...cases]);
})(globalThis);
