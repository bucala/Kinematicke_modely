(function (global) {
  'use strict';
  const K = global.Kinematics;
  const cases = [];
  const add = (name, run) => cases.push({ name, run });
  const assert = (condition, message = 'Podmienka nebola splnená.') => { if (!condition) throw new Error(message); };
  const near = (actual, expected, tolerance = 1e-5) => assert(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance, `Očakávané ${expected} ± ${tolerance}, získané ${actual}.`);
  const throws = (fn) => { let rejected = false; try { fn(); } catch { rejected = true; } assert(rejected, 'Neplatné dáta mali byť odmietnuté.'); };
  const joint = (a, pointA, b, pointB) => ({ id: K.uid(), a: { elementId: a.id, point: pointA }, b: { elementId: b.id, point: pointB }, builtin: false, name: 'Testovací kĺb' });
  const custom = (...elements) => ({ ...K.preset('custom'), elements });

  add('Zatvorený výsuv má vertikálne čelo (90°).', () => {
    const s = K.solve(K.preset(), 0);
    near(s.angle, 90); near(s.poses['panel-1'].a.x, 390); assert(!s.blocked);
  });
  add('Plne vysunuté čelo je horizontálne (0°).', () => {
    const s = K.solve(K.preset(), 300);
    near(s.angle, 0); near(s.poses['panel-1'].a.x, 690); near(s.poses['panel-1'].b.x, 850); assert(!s.blocked);
  });
  add('Čelo zostáva vertikálne pred začiatkom vyklápania.', () => {
    near(K.solve(K.preset(), 80).angle, 90);
  });
  add('Parametrický výsuv je priechodný v celom zdvihu.', () => {
    for (const s of K.sample(K.preset(), 241)) assert(!s.blocked, `Blokovanie pri ${s.motion} mm: ${s.issues.join(', ')}`);
  });
  add('Ložisko leží striktne na vypočítanej drážke.', () => {
    for (const s of K.sample(K.preset(), 121)) near(K.nearestOnPath(s.poses['bearing-1'].a, s.profile.points).distance, 0, 1e-5);
  });
  add('Vzdialenosti pevných bodov čela sa počas pohybu nemenia.', () => {
    const p = K.preset();
    for (const s of K.sample(p, 41)) {
      const pose = s.poses['panel-1'];
      near(K.distance(pose.a, pose.b), p.parameters.panelLength);
      near(K.distance(pose.a, pose.c), p.parameters.bearingOffset);
    }
  });
  add('Pohon rešpektuje minimálny a maximálny posuv.', () => {
    const p = K.preset();
    near(K.solve(p, -100).motion, 0); near(K.solve(p, 1000).motion, 300);
  });
  add('Zmenené rozmery regenerujú kulisu aj polohy čela.', () => {
    const p = K.preset();
    Object.assign(p.parameters, { frameLength: 450, travelMax: 380, panelLength: 140, bearingOffset: 55 });
    const s = K.solve(p, 380);
    near(s.poses['panel-1'].a.x, 830); near(s.poses['panel-1'].b.x, 970); assert(!s.blocked);
  });
  add('Nastaviteľné uhlové limity sa zachovajú.', () => {
    const p = K.preset();
    p.parameters.closedAngle = 70; p.parameters.openAngle = 15;
    near(K.solve(p, 0).angle, 70); near(K.solve(p, 300).angle, 15);
  });
  add('Príliš veľké ložisko vyvolá kolíziu.', () => {
    const p = K.preset(); p.parameters.bearingRadius = 12;
    const s = K.solve(p, 160);
    assert(s.blocked); assert(s.collisions.includes('bearing-1'));
  });
  add('Vypnutie kolízií vypne kontrolu priemeru, nie kinematické väzby.', () => {
    const p = K.preset(); p.parameters.bearingRadius = 12;
    assert(!K.solve(p, 160, { collisions: false }).blocked);
    p.parameters.slotOffsetY = -200;
    assert(K.solve(p, 160, { collisions: false }).blocked);
  });
  add('Nedosiahnuteľná drážka hlási blokovanie.', () => {
    const p = K.preset(); p.parameters.slotOffsetY = -250;
    const s = K.solve(p, 150);
    assert(s.blocked); assert(s.residual > 1); assert(s.issues.some((v) => v.includes('nedosiahne')));
  });
  add('Čelo zasunuté do korpusu sa označí ako kolízia.', () => {
    const p = K.preset(); p.parameters.panelOffsetX = -100; p.parameters.panelLength = 220;
    const s = K.solve(p, 0);
    assert(s.collisions.includes('panel-1')); assert(s.collisions.includes('frame-1'));
  });
  add('Neplatný polomer kruhovej kulisy hlási chybu.', () => {
    const p = K.preset(); p.parameters.curveKind = 'arc'; p.parameters.curveRadius = 30;
    const s = K.solve(p, 150);
    assert(s.blocked); assert(s.issues.some((v) => v.includes('Polomer')));
  });
  add('Bézierova krivka zachová koncové body.', () => {
    const controls = [{ x: 0, y: 0 }, { x: 10, y: 30 }, { x: 50, y: 80 }, { x: 90, y: 100 }];
    near(K.bezier(controls, 0).x, 0); near(K.bezier(controls, 1).y, 100);
  });
  add('Spline prechádza všetkými kontrolnými bodmi.', () => {
    const controls = [{ x: 0, y: 0 }, { x: 40, y: 30 }, { x: 80, y: 10 }, { x: 140, y: 70 }];
    for (let i = 0; i < controls.length; i++) near(K.distance(K.catmull(controls, i / 3), controls[i]), 0);
  });
  add('Kruhový oblúk zachová konce a odmietne malý polomer.', () => {
    const a = { x: 0, y: 0 }, b = { x: 100, y: 0 };
    const valid = K.arcPoints(a, b, 70);
    assert(!valid.invalid); near(K.distance(valid.points[0], a), 0); near(K.distance(valid.points.at(-1), b), 0);
    assert(K.arcPoints(a, b, 20).invalid);
  });
  add('Inverzný solver nájde posuv pri ručnom ťahaní čela.', () => {
    const p = K.preset(), s = K.solve(p, 205);
    near(K.inverseDrive(p, s.poses['panel-1'].b, 1, { collisions: false }), 205, 0.2);
  });
  add('Štvorkĺbový mechanizmus zachová všetky tri pohyblivé dĺžky.', () => {
    const p = K.preset('fourbar');
    for (const s of K.sample(p, 73, { collisions: false })) {
      assert(!s.blocked);
      near(K.distance(s.poses['input-1'].a, s.poses['input-1'].b), p.parameters.crankLength);
      near(K.distance(s.poses['coupler-1'].a, s.poses['coupler-1'].b), p.parameters.couplerLength);
      near(K.distance(s.poses['output-1'].a, s.poses['output-1'].b), p.parameters.rockerLength);
    }
  });
  add('Neuzatvoriteľný štvorkĺbový reťazec sa zablokuje.', () => {
    const p = K.preset('fourbar'); p.parameters.couplerLength = 20; p.parameters.rockerLength = 20;
    assert(K.solve(p, 90).blocked);
  });
  add('Ojnica kľukového mechanizmu zachová dĺžku v celom cykle.', () => {
    const p = K.preset('crank');
    for (const s of K.sample(p, 73)) {
      assert(!s.blocked); near(K.distance(s.poses['coupler-1'].a, s.poses['coupler-1'].b), p.parameters.rodLength);
      near(s.poses['piston-1'].a.y, p.parameters.sliderY);
    }
  });
  add('Piest kľukového mechanizmu má zdvih dvojnásobku polomeru.', () => {
    const p = K.preset('crank');
    near(K.solve(p, 0).displacement - K.solve(p, 180).displacement, p.parameters.crankLength * 2);
  });
  add('Krátka ojnica nedosiahne lineárne vedenie.', () => {
    const p = K.preset('crank'); p.parameters.rodLength = 20;
    assert(K.solve(p, 90).blocked);
  });
  add('Vlastný výsuv má pohyblivý uzol C.', () => {
    const rail = K.makeElement('rail', 10, 40); rail.stroke = 200;
    const p = custom(rail), s = K.solve(p, 150);
    near(s.poses[rail.id].c.x, 110); near(s.poses[rail.id].c.y, 40);
  });
  add('Tiahlo pripojené na vozík sleduje lineárny pohon.', () => {
    const rail = K.makeElement('rail', 10, 40), arm = K.makeElement('link', 10, 40);
    rail.stroke = 180;
    const p = custom(rail, arm); p.connections.push(joint(rail, 'c', arm, 'a'));
    const s = K.solve(p, 300, { collisions: false });
    assert(!s.blocked); near(s.poses[arm.id].a.x, 190, 0.05); near(K.distance(s.poses[arm.id].a, s.poses[arm.id].b), arm.length);
  });
  add('Vlastné hnacie rameno sa otáča okolo pevného začiatku.', () => {
    const arm = K.makeElement('link', 0, 0); arm.drive = true; arm.length = 100;
    const p = custom(arm), s = K.solve(p, 90);
    assert(K.driveRange(p).unit === '°'); near(s.poses[arm.id].b.x, 0); near(s.poses[arm.id].b.y, -100);
  });
  add('Ložisko vo vlastnej kulise zostáva na krivke.', () => {
    const slot = K.makeElement('slot', 0, 0), bearing = K.makeElement('bearing', 55, 80);
    bearing.slotId = slot.id;
    const p = custom(slot, bearing), s = K.solve(p, 100);
    assert(!s.blocked); near(K.nearestOnPath(s.poses[bearing.id].a, s.poses[slot.id].path).distance, 0);
  });
  add('Spojenie uzla s drážkou sa vyhodnotí ako čap vo vedení.', () => {
    const slot = K.makeElement('slot', 0, 0), bearing = K.makeElement('bearing', 55, 80);
    const p = custom(slot, bearing); p.connections.push(joint(slot, 'curve', bearing, 'a'));
    const s = K.solve(p, 100);
    assert(!s.blocked); near(s.residual, 0, 0.05);
  });
  add('Dve nezhodné pevné polohy vytvoria nesplnenú väzbu.', () => {
    const a = K.makeElement('ground', 0, 0), b = K.makeElement('ground', 100, 100);
    const p = custom(a, b); p.connections.push(joint(a, 'a', b, 'a'));
    const s = K.solve(p, 0);
    assert(s.blocked); assert(s.residual > 100);
  });
  add('Skrížené ramená sa označia červenou kolíznou indikáciou.', () => {
    const a = K.makeElement('link', 0, 0), b = K.makeElement('link', 60, -60);
    a.length = 120; b.length = 120; b.angle = -90;
    const s = K.solve(custom(a, b), 0);
    assert(s.blocked); assert(s.collisions.includes(a.id)); assert(s.collisions.includes(b.id));
  });
  add('Priesečník úsečiek a kolízia s obdĺžnikom sú geometricky správne.', () => {
    const point = K.segmentIntersection({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 });
    near(point.x, 5); near(point.y, 5);
    assert(K.segmentRect({ x: -10, y: 5 }, { x: 20, y: 5 }, { x: 0, y: 0, w: 10, h: 10 }));
    assert(!K.segmentRect({ x: -10, y: 20 }, { x: 20, y: 20 }, { x: 0, y: 0, w: 10, h: 10 }));
  });
  add('Projekt po exporte a importe zachová rozmery a názvy.', () => {
    const original = K.preset(); original.name = 'Môj skúšobný mechanizmus';
    const restored = K.validateProject(JSON.parse(JSON.stringify(original)));
    assert(restored.name === original.name); assert(restored.elements.length === 6); near(restored.parameters.travelMax, 300);
    near(K.solve(restored, 175).angle, K.solve(original, 175).angle);
  });
  add('Import odmietne zamenené pohybové limity a záporné rozmery.', () => {
    const p = K.preset(); p.parameters.travelMax = -1; throws(() => K.validateProject(p));
    const q = K.preset(); q.parameters.panelLength = -50; throws(() => K.validateProject(q));
  });
  add('Import odmietne chýbajúci primárny prvok.', () => {
    const p = K.preset(); p.elements = p.elements.filter((e) => e.id !== 'panel-1');
    throws(() => K.validateProject(p));
  });
  add('Import odmietne duplicitné prvky a neexistujúce uzly.', () => {
    const p = K.preset(); p.elements.push(K.copy(p.elements[0])); throws(() => K.validateProject(p));
    const q = K.preset(); q.connections[0].a.elementId = 'missing'; throws(() => K.validateProject(q));
  });
  add('Import odmietne prototypové identifikátory a nečíselné hodnoty.', () => {
    const p = K.preset('custom'), e = K.makeElement('link'); e.id = '__proto__'; p.elements.push(e);
    throws(() => K.validateProject(p));
    const q = K.preset(); q.parameters.panelLength = '160'; throws(() => K.validateProject(q));
  });
  add('Import odmietne nezodpovedajúci typ uzla.', () => {
    const p = K.preset(); p.connections[0].a.point = 'c';
    throws(() => K.validateProject(p));
  });
  add('Vzorkovanie ošetrí malý počet vzoriek a neplatný pohon.', () => {
    const p = K.preset();
    assert(K.sample(p, 1).length === 2); near(K.solve(p, NaN).motion, 0);
  });
  add('Hranice plátna obsahujú všetky polohy mechanizmu.', () => {
    const p = K.preset(), samples = K.sample(p, 5), bounds = K.bounds(p, samples);
    for (const s of samples) for (const pose of Object.values(s.poses)) for (const key of ['a', 'b', 'c']) {
      const point = pose[key];
      if (point) assert(point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height);
    }
  });
  add('Pevne uložené ložisko sa nepresunie nasilu na kulisu.', () => {
    const slot = K.makeElement('slot', 0, 0), bearing = K.makeElement('bearing', 55, 200);
    bearing.locked = true; bearing.slotId = slot.id;
    const s = K.solve(custom(slot, bearing), 0);
    assert(s.blocked); near(s.poses[bearing.id].a.y, 200); assert(s.invalid.includes(bearing.id));
  });
  add('Blokovanie voľnej kulisy má červenú indikáciu prvkov.', () => {
    const p = K.preset(); p.parameters.slotOffsetY = -250;
    const s = K.solve(p, 150);
    assert(s.invalid.includes('slot-1')); assert(s.invalid.includes('bearing-1'));
  });
  add('Import normalizuje úlohy riadených prvkov šablóny.', () => {
    const p = K.preset('fourbar'); p.elements.find((e) => e.id === 'input-1').role = 'invalid-role';
    assert(K.validateProject(p).elements.find((e) => e.id === 'input-1').role === 'input');
  });

  global.KinematicsTestCases = Object.freeze(cases);
})(globalThis);
