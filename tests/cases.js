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

  add('Dvojkulisový projekt je samostatný a nemení pôvodné šablóny.', () => {
    const p = K.preset('double-drawer'), q = K.validateProject(p);
    assert(p.name === 'Dvojite sklopeny suflik'); assert(q.provenance.estimated);
    assert(p.id !== K.preset('double-drawer').id, 'Samostatný nový exemplár nesmie prepísať uložený projekt.');
    assert(p.elements.filter((e) => e.type === 'slot').length === 3);
    assert(K.preset('custom').elements.length === 0);
    near(K.preset('drawer').parameters.panelLength, 160);
    p.parameters.armLength = 200;
    near(K.preset('double-drawer').parameters.armLength, 240);
  });
  add('Tri polohy dvojkulisového projektu rešpektujú sklopenie pred posuvom.', () => {
    const p = K.preset('double-drawer'), phases = K.projectPhases(p);
    near(phases[0].motion, 0); near(phases[1].motion, 60); near(phases[2].motion, 300);
    near(K.solve(p, phases[0].motion).angle, 90);
    near(K.solve(p, phases[1].motion).angle, 65);
    near(K.solve(p, phases[2].motion).angle, 65);
    near(K.solve(p, 0).secondaryAngle, 8);
    near(K.solve(p, 300).secondaryAngle, -5);
    assert(K.solve(p, 59).phase === 'fold'); assert(K.solve(p, 60).phase === 'slide');
  });
  add('Obe ložiská, zadný čap a tuhé členy spĺňajú väzby v celom zdvihu.', () => {
    const p = K.preset('double-drawer'), v = p.parameters;
    for (const s of K.sample(p, 1001)) {
      assert(!s.blocked, `Blokovanie pri ${s.motion}: ${s.issues.join(', ')}`);
      const a = s.poses['bearing-1'].a, b = s.poses['bearing-2'].a, rear = s.poses['rear-bearing'].a;
      const panel = s.poses['panel-1'];
      near(K.distance(rear, b), v.armLength);
      near(K.distance(a, b), Math.hypot(v.pinAX - v.pinBX, v.pinAY - v.pinBY));
      near(K.distance(a, panel.a), Math.hypot(v.pinAX, v.pinAY));
      near(K.distance(b, panel.a), Math.hypot(v.pinBX, v.pinBY));
      near(K.distance(panel.a, panel.b), v.panelLength);
      for (const error of Object.values(s.guideErrors)) near(error, 0, K.TOLERANCE);
      for (const j of p.connections) {
        const pa = s.poses[j.a.elementId], pb = s.poses[j.b.elementId];
        let first = pa[j.a.point], second = pb[j.b.point];
        if (j.a.point === 'curve') first = K.nearestOnPath(second, pa.path);
        if (j.b.point === 'curve') second = K.nearestOnPath(first, pb.path);
        near(K.distance(first, second), 0, K.TOLERANCE);
      }
    }
  });
  add('Obe zakrivené kulisy aj zadná drážka sa posúvajú so zásuvkou.', () => {
    const p = K.preset('double-drawer'), first = K.solve(p, 0);
    for (const motion of [23.7, 42, 60, 173, 300]) {
      const s = K.solve(p, motion);
      for (const id of ['slot-1', 'slot-2', 'rear-slot']) {
        const before = first.poses[id].path, after = s.poses[id].path;
        assert(before.length === after.length);
        for (let i = 0; i < before.length; i++) {
          near(after[i].x - before[i].x, motion); near(after[i].y, before[i].y);
        }
      }
    }
  });
  add('Po sklopení sa celý mechanizmus iba posúva bez zmeny uhlov.', () => {
    const p = K.preset('double-drawer'), start = K.solve(p, 60);
    for (const motion of [61, 120, 180, 240, 300]) {
      const s = K.solve(p, motion);
      near(s.angle, start.angle); near(s.secondaryAngle, start.secondaryAngle);
      for (const id of ['rail-1', 'rocker-1', 'bracket-1', 'panel-1', 'bearing-1', 'bearing-2', 'rear-bearing']) {
        for (const key of ['a', 'b', 'c']) {
          const before = start.poses[id][key], after = s.poses[id][key];
          if (before) { near(after.x - before.x, motion - 60); near(after.y, before.y); }
        }
      }
    }
  });
  add('Zadná opora drží čap pred odhadovým odovzdaním do posuvu.', () => {
    const p = K.preset('double-drawer'), v = p.parameters;
    for (const motion of [0, 10, 25, v.releaseTravel - v.handoffLength]) {
      const rear = K.solve(p, motion).poses['rear-bearing'].a;
      near(rear.x, v.rearX); near(rear.y, v.rearY);
    }
    const released = K.solve(p, v.releaseTravel);
    near(released.poses['rear-bearing'].a.x, v.rearX + v.handoffLength / 2);
    near(K.distance(released.poses['rear-bearing'].a, released.poses['rear-slot'].a), 0);
  });
  add('Polohy aj rýchlosti nadväzujú pri odovzdaní a zmene fázy.', () => {
    const p = K.preset('double-drawer'), profile = K.prepareProject(p), h = 0.0001;
    for (const motion of [p.parameters.releaseTravel - p.parameters.handoffLength, p.parameters.releaseTravel]) {
      const before = K.solve(p, motion - h, { profile }), at = K.solve(p, motion, { profile }), after = K.solve(p, motion + h, { profile });
      for (const id of ['bearing-1', 'bearing-2', 'rear-bearing', 'panel-1']) {
        for (const key of ['a', 'b']) for (const axis of ['x', 'y']) {
          const v1 = (at.poses[id][key][axis] - before.poses[id][key][axis]) / h;
          const v2 = (after.poses[id][key][axis] - at.poses[id][key][axis]) / h;
          near(v1, v2, 0.002);
          assert(K.distance(before.poses[id][key], after.poses[id][key]) < 0.001);
        }
      }
    }
  });
  add('Trajektórie odlišujú pevný korpus od súradníc pohyblivej zásuvky.', () => {
    const p = K.preset('double-drawer'), folded = K.solve(p, 60), open = K.solve(p, 300);
    for (const reference of globalThis.DoubleDrawer.traces) {
      const a = K.tracePoint(folded, reference), b = K.tracePoint(open, reference);
      near(b.x - a.x, 240); near(b.y, a.y);
      near(K.distance(K.tracePoint(folded, reference, 'carrier'), K.tracePoint(open, reference, 'carrier')), 0);
    }
    assert(K.tracePoint(open, { elementId: 'missing', point: 'a' }) === null);
  });
  add('Pevný korpus, opora a platforma nemenia polohu ani výrez stola.', () => {
    const p = K.preset('double-drawer'), first = K.solve(p, 0);
    for (const motion of [30, 60, 300]) {
      const s = K.solve(p, motion);
      for (const id of ['frame-1', 'table-1', 'stop-1']) {
        near(K.distance(first.poses[id].a, s.poses[id].a), 0);
        near(K.distance(first.poses[id].b, s.poses[id].b), 0);
      }
      assert(JSON.stringify(first.poses['table-1'].rects) === JSON.stringify(s.poses['table-1'].rects));
    }
  });
  add('Zúženie pevného výrezu stola odhalí kolíziu modrého ramena.', () => {
    const p = K.preset('double-drawer'); p.parameters.cutoutEnd = 580;
    const s = K.solve(p, 300);
    assert(s.blocked); assert(s.collisions.includes('table-1')); assert(s.collisions.includes('rocker-1'));
    assert(!K.solve(p, 300, { collisions: false }).blocked);
  });
  add('Nekompatibilné posunutie jednej kulisy neobíde pevný rozstup ložísk.', () => {
    const p = K.preset('double-drawer'); p.parameters.guide1Y = 20;
    const s = K.solve(p, 30, { collisions: false });
    assert(s.blocked); assert(s.invalid.includes('slot-1')); assert(s.residual > K.TOLERANCE);
    near(s.pinDistance, Math.hypot(p.parameters.pinAX - p.parameters.pinBX, p.parameters.pinAY - p.parameters.pinBY));
  });
  add('Nedosiahnuteľná druhá kulisa vráti chybu namiesto nečíselnej polohy.', () => {
    const p = K.preset('double-drawer'); p.parameters.guide2Y = 400;
    const s = K.solve(p, 30, { collisions: false });
    assert(s.blocked); assert(Number.isFinite(s.angle)); assert(Number.isFinite(s.residual));
    assert(s.invalid.includes('rocker-1'));
  });
  add('Dvojkulisový projekt kontroluje priemer ložísk v oboch drážkach.', () => {
    const p = K.preset('double-drawer'); p.parameters.bearingRadius = 8;
    const s = K.solve(p, 30);
    assert(s.blocked); assert(s.collisions.includes('slot-1')); assert(s.collisions.includes('slot-2'));
    assert(!K.solve(p, 30, { collisions: false }).blocked);
  });
  add('Dvojkulisový projekt ošetrí posuv aj pri nenulovom minime pohonu.', () => {
    const p = K.preset('double-drawer'); p.parameters.travelMin = 20; p.parameters.travelMax = 320;
    const phases = K.projectPhases(p);
    near(phases[0].motion, 20); near(phases[1].motion, 80); near(phases[2].motion, 320);
    near(K.solve(p, -100).displacement, 0); near(K.solve(p, 1000).displacement, 300);
    near(K.solve(p, 20).angle, 90); near(K.solve(p, 320).angle, 65);
    assert(JSON.stringify(K.solve(p, 320).poses['table-1'].rects) === JSON.stringify(K.solve(K.preset('double-drawer'), 300).poses['table-1'].rects));
  });
  add('Inverzné ťahanie nájde polohu čela aj každého vodiaceho ložiska.', () => {
    const p = K.preset('double-drawer'), profile = K.prepareProject(p);
    for (const motion of [4, 27.4, 50, 60, 170, 295]) {
      const s = K.solve(p, motion, { profile });
      near(K.inverseDrive(p, s.poses['panel-1'].b, 1, { profile, collisions: false }), motion, 0.1);
      for (const reference of globalThis.DoubleDrawer.traces) {
        near(K.inverseDrive(p, K.point(s, reference), 1, { ...reference, profile, collisions: false }), motion, 0.1);
      }
    }
  });
  add('Dvojkulisový projekt po importe zachová geometriu aj upozornenie.', () => {
    const p = K.preset('double-drawer');
    Object.assign(p.parameters, { armLength: 245, releaseTravel: 70, handoffLength: 20, pinAX: 4, guide1X: 1 });
    p.name = 'Môj upravený šuplík'; p.provenance = { estimated: false, reference: 'https://invalid.example/' };
    const restored = K.validateProject(JSON.parse(JSON.stringify(p)));
    assert(restored.name === p.name); assert(restored.provenance.estimated);
    assert(restored.provenance.reference === globalThis.DoubleDrawer.provenance.reference);
    for (const key of ['armLength', 'releaseTravel', 'handoffLength', 'pinAX', 'guide1X']) near(restored.parameters[key], p.parameters[key]);
    for (const motion of [0, 30, 70, 300]) {
      const a = K.solve(p, motion), b = K.solve(restored, motion);
      near(a.angle, b.angle); near(a.residual, b.residual);
      near(K.distance(a.poses['bearing-2'].a, b.poses['bearing-2'].a), 0);
    }
  });
  add('Import dvojkulisového projektu odmietne chýbajúcu kulisu alebo držiak.', () => {
    for (const id of ['slot-1', 'slot-2', 'rear-slot', 'bracket-1']) {
      const p = K.preset('double-drawer'); p.elements = p.elements.filter((e) => e.id !== id);
      throws(() => K.validateProject(p)); assert(K.solve(p, 0).blocked);
    }
    const p = K.preset('double-drawer'); p.elements.find((e) => e.id === 'slot-2').role = 'frame';
    assert(K.validateProject(p).elements.find((e) => e.id === 'slot-2').role === 'guide2');
  });
  add('Import dvojkulisového projektu odmietne neplatné rozmery a zhodné ložiská.', () => {
    for (const patch of [{ frameLength: 10 }, { releaseTravel: 300 }, { releaseTravel: 0 }, { handoffLength: 0 }, { handoffLength: 70 }, { armLength: -1 }, { cutoutEnd: 200 }, { frontOpening: 270 }, { pinAX: -18, pinAY: -19 }, { guide2Y: '20' }]) {
      const p = K.preset('double-drawer'); Object.assign(p.parameters, patch);
      throws(() => K.validateProject(p));
    }
  });
  add('Dvojkulisový projekt umožní pripojiť ďalší vlastný tuhý člen.', () => {
    const p = K.preset('double-drawer'), arm = K.makeElement('link', 360, 66);
    p.elements.push(arm); p.connections.push(joint(p.elements.find((e) => e.id === 'bearing-2'), 'a', arm, 'a'));
    const s = K.solve(p, 150, { collisions: false });
    assert(!s.blocked); near(K.distance(s.poses[arm.id].a, s.poses['bearing-2'].a), 0, K.TOLERANCE);
    near(K.distance(s.poses[arm.id].a, s.poses[arm.id].b), arm.length);
    near(s.poses['rocker-1'].length, p.parameters.armLength);
  });
  add('Hranice dvojkulisového projektu obsahujú obe pohyblivé kulisy v celom zdvihu.', () => {
    const p = K.preset('double-drawer'), samples = K.sample(p, 21), b = K.bounds(p, samples);
    for (const s of samples) for (const pose of Object.values(s.poses)) {
      for (const point of [pose.a, pose.b, pose.c, ...(pose.path || [])].filter(Boolean)) {
        assert(point.x >= b.x && point.x <= b.x + b.width && point.y >= b.y && point.y <= b.y + b.height);
      }
    }
  });

  add('Pretiahnutá vačka má kruhovú základňu, úzku špičku a hladké dotyčnice.', () => {
    const e = { ...K.makeElement('cam', 0, 0), camShape: 'pear', camLift: 100, camPhase: 90 }, path = K.camProfile(e), xs = path.map((p) => p.x), ys = path.map((p) => p.y);
    near(Math.min(...ys), -140, .01); near(Math.max(...ys), 40, .01); assert(Math.max(...xs) - Math.min(...xs) < 80.01);
    near(K.distance(path[0], path.at(-1)), 0);
    const outline = path.slice(0, -1), cross = (a, b, c) => (b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x), sign = Math.sign(cross(...outline.slice(0, 3)));
    assert(outline.every((a, i) => cross(a, outline[(i+1)%outline.length], outline[(i+2)%outline.length]) * sign >= -1e-6));
    const result = K.solve(custom(e), 0, { collisions: false }), target = K.nearestOnCam({ x: 0, y: -200 }, result.poses[e.id], 10);
    near(target.x, 0, .05); near(target.y, -150, .05);
    const mass = global.KinmoPhysics.centerOfMass(e, result.poses[e.id]); assert(Number.isFinite(mass.x) && Number.isFinite(mass.y));
  });
  add('Pretiahnutý profil a polomer špičky sa zachovajú pri importe a otočení.', () => {
    const e = { ...K.makeElement('cam', 10, 20), camShape: 'pear', camLift: 100, camNoseRatio: .3, camPhase: 90 }, p = custom(e), imported = K.validateProject(JSON.parse(JSON.stringify(p))).elements[0];
    assert(imported.camShape === 'pear'); near(imported.camNoseRatio, .3);
    const base = K.camProfile(e), turned = K.camProfile({ ...e, angle: 35 });
    for (let i = 0; i < base.length; i++) near(K.distance(K.worldPoint({ a: { x: 10, y: 20 }, angle: 35 }, { x: base[i].x - 10, y: base[i].y - 20 }), turned[i]), 0);
  });
  global.KinematicsTestCases = Object.freeze(cases);
})(globalThis);
