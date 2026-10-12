(function (global) {
  'use strict';
  const K = global.Kinematics, E = global.KinmoEditor, P = global.KinmoPhysics, X = global.KinmoExport, S = global.KinmoSlotOutline, SC = global.KinmoScene, cases = [];
  const add = (name, run) => cases.push({ name, run });
  const assert = (value, message = 'Podmienka nebola splnená.') => { if (!value) throw new Error(message); };
  const near = (a, b, tolerance = .001) => assert(Number.isFinite(a) && Math.abs(a - b) <= tolerance, `${a} ≠ ${b}`);
  const throws = (fn) => { let failed = false; try { fn(); } catch { failed = true; } assert(failed, 'Očakávala sa chyba.'); };
  const area = (points) => Math.abs(points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p.x * q.y - q.x * p.y; }, 0) / 2);
  const slotFixture = (points = [{ x: 0, y: 0 }, { x: 100, y: 0 }], width = 10) => {
    const p = K.preset('custom'), slot = K.makeElement('slot', 20, 30);
    Object.assign(slot, { id: 'reference-slot', curveKind: 'polyline', controls: points, slotWidth: width });
    p.elements = [slot]; return p;
  };
  const fixture = () => {
    const project = K.preset('custom'), anchor = K.makeElement('ground', 0, 0), body = K.makeElement('link', 120, 0), spring = K.makeElement('spring-compression');
    Object.assign(body, { drive: true, driveMode: 'linear', stroke: 120, length: 50, mass: 1 });
    spring.mountA = { elementId: anchor.id, point: 'a' }; spring.mountB = { elementId: body.id, point: 'a' };
    project.elements = [anchor, body, spring]; project.parameters.travelMax = 120;
    Object.assign(project.simulation, { gravity: 0, damping: 0, friction: 0, mode: 'dynamic' });
    project.dimensions.push(E.makeDimension(E.design(project, 0), spring.mountA, spring.mountB));
    project.trajectories.push({ id: K.uid(), name: 'Dráha vozíka', reference: { elementId: body.id, point: 'a' }, visible: true, color: '#123456', space: 'world' });
    return { project, body, spring };
  };
  const report = () => {
    const { project } = fixture(), result = K.solve(project, 0), samples = K.sample(project, 13), context = P.prepare(project, { samples });
    return X.reportData(project, result, samples, { forceContext: context, date: '1. 1. 2026' });
  };

  add('.kinmo zachová geometriu, sily, kóty a trajektórie.', () => {
    const { project } = fixture(), file = X.nativeFile(project, { workspace: { theme: 'dark' }, motion: 37.5 });
    const restored = X.parseNative(JSON.stringify(file));
    assert(file.format === 'KINMO' && file.formatVersion === 2 && file.project.version === 1);
    assert(JSON.stringify(restored.project) === JSON.stringify(K.validateProject(project)));
    assert(restored.workspace.theme === 'dark'); near(restored.motion, 37.5);
  });
  add('.kinmo neprepíše originál pri serializácii.', () => {
    const { project } = fixture(), before = JSON.stringify(project);
    X.nativeFile(project, { motion: 10 }); assert(JSON.stringify(project) === before);
  });
  add('Natívny import prijme starší surový JSON projekt.', () => {
    const p = K.preset('drawer'), restored = X.parseNative(JSON.stringify(p));
    assert(restored.project.kind === 'drawer' && restored.workspace === null && restored.motion === null);
  });
  add('Natívny súbor obnoví režim editácie bez samovoľného spustenia simulácie.', () => {
    const p = K.preset('custom');
    assert(X.parseNative(X.nativeFile(p, { workspace: { mode: 'edit' } })).workspace.mode === 'edit');
    assert(X.parseNative(X.nativeFile(p, { workspace: { mode: 'simulate' } })).workspace.mode === 'simulate');
  });
  add('Natívny import odmietne neznámu verziu súboru.', () => {
    const f = X.nativeFile(K.preset('drawer')); f.formatVersion = 3; throws(() => X.parseNative(f));
  });
  add('Natívny import kontroluje všetky deklarované jednotky.', () => {
    for (const [unit, value] of [['length', 'cm'], ['angle', 'rad'], ['force', 'lbf'], ['mass', 'g'], ['inertia', 'kg·mm²']]) {
      const f = X.nativeFile(K.preset('drawer')); f.units[unit] = value; throws(() => X.parseNative(f));
    }
  });
  add('Natívny import odmietne polohu mimo zdvihu a nečíselnú polohu.', () => {
    for (const motion of [-1, 301, '100', Infinity]) {
      const f = X.nativeFile(K.preset('drawer')); f.motion = motion; throws(() => X.parseNative(f));
    }
  });
  add('Natívny export ohraničí polohu a import odmietne súbor nad 2 MB.', () => {
    near(X.nativeFile(K.preset('drawer'), { motion: 1000 }).motion, 300);
    throws(() => X.parseNative(' '.repeat(2 * 1024 * 1024 + 1)));
  });
  add('Natívny a starší JSON zápis sú kompaktné a odmietnu neprenosnú veľkosť v UTF-8.', () => {
    const { project } = fixture(), value = X.serializeNative(project, { motion: 20 });
    assert(!value.includes('\n  ')); near(X.parseNative(value).motion, 20);
    assert(X.parseNative(X.serializeProject(project)).project.kind === project.kind);
    const large = K.preset('custom');
    for (let i = 0; i < 55; i++) {
      const e = K.makeElement('slot');
      e.curveKind = 'polyline'; e.controls = Array.from({ length: 1001 }, (_, j) => ({ x: 1000.123456789 + j / 100, y: 2000.987654321 }));
      large.elements.push(e);
    }
    throws(() => X.serializeNative(large));
    throws(() => X.serializeProject(large));
  });
  add('Vzhľad sa normalizuje a neznáme nastavenia sa neukladajú.', () => {
    const value = X.preferences({ theme: 'dark', cycle: 100, speed: 2, grid: false, pairingKey: 'not-to-be-stored', prototype: {} });
    assert(value.theme === 'dark' && value.grid === false && value.speed === 2);
    near(value.cycle, 60); assert(!('pairingKey' in value) && !('prototype' in value));
  });
  add('Vzhľad toleruje poškodené nastavenia a zachová tri povolené skiny.', () => {
    for (const value of [null, [], 'bad']) assert(X.preferences(value).theme === 'mono');
    for (const theme of ['mono', 'orange', 'dark']) assert(X.preferences({ theme }).theme === theme);
    assert(X.preferences({ theme: '<script>', speed: 99 }).speed === 1);
  });
  add('Viditeľnosť grafu, časovej osi a popisov je nezávislá a prenosná v .kinmo.', () => {
    const keys = ['profileVisible', 'timelineVisible', 'labels'];
    for (const key of keys) {
      const workspace = X.preferences({ profileVisible: true, timelineVisible: true, labels: true, [key]: false }), restored = X.parseNative(X.nativeFile(K.preset('drawer'), { workspace })).workspace;
      assert(restored[key] === false && keys.filter((v) => v !== key).every((v) => restored[v] === true));
      assert(restored.dimensions && restored.grid);
    }
    assert(!X.preferences().profileVisible && !X.preferences().timelineVisible && X.preferences().labels);
    for (const key of ['profileVisible', 'timelineVisible']) assert(X.preferences({ [key]: 'false' })[key] === false);
  });
  add('Obrázok plátna zachová pomer strán a ohraničí vysoký pohľad na 4 000 px.', () => {
    let size = SC.size({ width: 1600, height: 900 }); assert(size.width === 2000 && size.height === 1125);
    size = SC.size({ width: 100, height: 1000 }); assert(size.width === 400 && size.height === 4000);
    size = SC.size({ width: 1, height: 1 }, { width: 800, maxHeight: 600 }); assert(size.width === 600 && size.height === 600);
    for (const view of [null, { width: 0, height: 1 }, { width: 1, height: -1 }, { width: Infinity, height: 1 }, { width: 1e-308, height: 1e308 }]) throws(() => SC.size(view));
  });
  add('SVG používa milimetrové rozmery a neobsahuje neplatné čísla.', () => {
    const { project } = fixture(), svg = X.vectorSVG(project, K.solve(project, 30));
    assert(/width="[\d.]+mm" height="[\d.]+mm"/.test(svg));
    assert(svg.includes('viewBox=') && !/NaN|Infinity|undefined/.test(svg));
  });
  add('SVG bezpečne escapuje názvy a pridáva odhadové upozornenie.', () => {
    const p = K.preset('drawer'); p.name = '<script>alert("x")</script>';
    const svg = X.vectorSVG(p, K.solve(p, 0));
    assert(svg.includes('&lt;script&gt;') && !svg.includes('<script>') && svg.includes('nie výrobný výkres'));
  });
  add('Export geometrie rešpektuje viditeľnosť prvkov.', () => {
    const { project, spring } = fixture(); spring.visible = false;
    assert(!X.geometry(project, K.solve(project, 0)).some((e) => e.elementId === spring.id));
  });
  add('SVG obsahuje uložené kóty aj pomenované trajektórie.', () => {
    const { project } = fixture(), geometry = X.geometry(project, K.solve(project, 0), { trajectories: true, samples: K.sample(project, 13) });
    assert(geometry.some((e) => e.layer === 'DIMENSIONS')); assert(geometry.some((e) => e.layer === 'TRAJECTORIES'));
    assert(!X.geometry(project, K.solve(project, 0), { dimensions: false }).some((e) => e.layer === 'DIMENSIONS'));
  });
  add('Aktívna a uložená rovnaká trajektória sa neexportuje dvakrát.', () => {
    const { project, body } = fixture(), samples = K.sample(project, 13);
    const refs = [{ elementId: body.id, point: 'a', label: 'Aktívny bod' }];
    const paths = X.geometry(project, samples[0], { trajectories: true, samples, references: refs }).filter((e) => e.layer === 'TRAJECTORIES');
    assert(paths.length === 1); near(paths[0].points.at(-1).x, 240);
  });
  add('CAD export otočí os Y a zachová jednotky mm.', () => {
    const p = K.preset('custom'), b = K.makeElement('bearing', 15, 25); p.elements = [b];
    const snapshot = X.cadSnapshot(p, K.solve(p, 0));
    assert(snapshot.format === 'KINMO-CAD' && snapshot.units === 'mm' && snapshot.referenceOnly);
    near(snapshot.entities[0].center.x, 15); near(snapshot.entities[0].center.y, -25);
  });
  add('CAD export ponechá obrys a dve presné dvojkulisové dráhy.', () => {
    const p = K.preset('double-drawer'), s = X.cadSnapshot(p, K.solve(p, 0));
    const paths = s.entities.filter((e) => ['slot-1', 'slot-2'].includes(e.elementId));
    assert(s.estimated && paths.length === 2 && paths.every((e) => e.points.length > 500));
  });
  add('CAD export odmietne geometriu nad 30 000 bodov.', () => {
    const p = K.preset('custom');
    for (let i = 0; i < 31; i++) {
      const e = K.makeElement('slot', 0, i);
      e.curveKind = 'polyline'; e.controls = Array.from({ length: 1001 }, (_, j) => ({ x: j / 10, y: 0 }));
      p.elements.push(e);
    }
    throws(() => X.cadSnapshot(p, E.design(p, 0)));
  });
  add('DXF deklaruje mm, vrstvy a zakončí sekcie.', () => {
    const { project } = fixture(), value = X.dxf(project, K.solve(project, 0));
    assert(value.includes('$INSUNITS\r\n70\r\n4\r\n') && value.includes('AC1015'));
    assert(value.includes('LWPOLYLINE') && value.includes('DIMENSIONS') && value.endsWith('0\r\nEOF\r\n'));
  });
  add('DXF escapuje Unicode kót a riadiace znaky.', () => {
    const { project } = fixture(); project.dimensions[0].name = 'Dĺžka';
    const value = X.dxf(project, K.solve(project, 0));
    assert(value.includes('\\U+013A') && !value.includes('\nDĺžka'));
  });
  add('Priama drážka má šírku, polkruhové čelá a jeden uzavretý referenčný obrys.', () => {
    const profiles = S.contours([{ x: 0, y: 0 }, { x: 100, y: 0 }], 10), points = profiles[0];
    assert(profiles.length === 1 && points.length >= 20 && points.length <= 1001);
    near(Math.min(...points.map((p) => p.x)), -5); near(Math.max(...points.map((p) => p.x)), 105);
    near(Math.min(...points.map((p) => p.y)), -5); near(Math.max(...points.map((p) => p.y)), 5);
    near(area(points), 1000 + Math.PI * 25, 1);
    assert(K.distance(points[0], points.at(-1)) > 0);
  });
  add('Referenčný obrys rešpektuje otočenie a posunutie drážky.', () => {
    const points = S.contours([{ x: 20, y: -30 }, { x: 20, y: 70 }], 10)[0];
    near(Math.min(...points.map((p) => p.x)), 15); near(Math.max(...points.map((p) => p.x)), 25);
    near(Math.min(...points.map((p) => p.y)), -35); near(Math.max(...points.map((p) => p.y)), 75);
  });
  add('Obrys odstráni opakované a husté priamkové body bez zmeny vstupu.', () => {
    const path = Array.from({ length: 1001 }, (_, i) => ({ x: Math.floor(i / 2) / 5, y: 0 })), before = JSON.stringify(path);
    const points = S.contours(path, 10)[0];
    assert(points.length < 100 && JSON.stringify(path) === before);
    near(Math.max(...points.map((p) => p.x)), 105);
  });
  add('Zaoblený obrys ľavého i pravého rohu zachová šírku a plochu.', () => {
    for (const sign of [-1, 1]) {
      const path = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: sign * 100 }];
      const forward = S.contours(path, 10)[0], backward = S.contours([...path].reverse(), 10)[0];
      near(area(forward), area(backward), 1); assert(area(forward) > 1900 && area(forward) < 2200);
    }
  });
  add('Vzorkovaný oblúk sa exportuje ako konečný obrys bez duplicitných hrán.', () => {
    const path = Array.from({ length: 201 }, (_, i) => ({ x: 100 * Math.cos(i * Math.PI / 400), y: 100 * Math.sin(i * Math.PI / 400) }));
    const points = S.contours(path, 8)[0];
    assert(points.length <= 1001 && points.every((p, i) => Number.isFinite(p.x) && Number.isFinite(p.y) && K.distance(p, points[(i + 1) % points.length]) > 0));
    near(Math.max(...points.map((p) => p.x)), 104, .05);
    near(Math.max(...points.map((p) => p.y)), 104, .05);
  });
  add('Uzavretá strednica vytvorí vonkajší aj vnútorný referenčný obrys.', () => {
    const path = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }, { x: 0, y: 0 }];
    const profiles = S.contours(path, 10), reverse = S.contours([...path].reverse(), 10);
    assert(profiles.length === 2 && area(profiles[0]) > area(profiles[1]));
    near(area(profiles[1]), 8100);
    near(area(profiles[0]), area(reverse[0]), 1); near(area(profiles[1]), area(reverse[1]), .01);
  });
  add('Pretínajúce sa strednice sa odmietnu aj pri malých rozmeroch.', () => {
    for (const size of [100, .01]) throws(() => S.contours([{ x: 0, y: 0 }, { x: size, y: size }, { x: 0, y: size }, { x: size, y: 0 }], .01));
  });
  add('Nulová, prekrývajúca sa a prudko sa vracajúca drážka sa odmietne.', () => {
    for (const path of [
      [{ x: 0, y: 0 }, { x: 0, y: 0 }],
      [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 0 }],
      [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 0 }, { x: 75, y: 0 }],
    ]) throws(() => S.contours(path, 10));
  });
  add('Obrys odmietne neplatné súradnice, šírku a prekročenie počtu vstupných bodov.', () => {
    const path = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    for (const width of [0, -.1, .009, 5001, NaN, Infinity, '10']) throws(() => S.contours(path, width));
    for (const points of [null, [], [path[0]], [{ x: NaN, y: 0 }, path[1]], Array(1002).fill(path[0])]) throws(() => S.contours(points, 10));
    assert(S.contours(path, .01)[0].length >= 3);
  });
  add('Príliš široký obrys nepredstiera bezpečný priechod cez úzky návrat.', () => {
    throws(() => S.contours([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 10 }, { x: 0, y: 10 }], 24));
    const circle = Array.from({ length: 101 }, (_, i) => ({ x: 5 * Math.cos(i * Math.PI / 200), y: 5 * Math.sin(i * Math.PI / 200) }));
    throws(() => S.contours(circle, 24));
  });
  add('Zrútený vnútorný obrys uzavretej drážky sa odmietne.', () => {
    throws(() => S.contours([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 0, y: 0 }], 24));
  });
  add('CAD ponechá strednicu a obrysy pridáva len pri explicitnej voľbe.', () => {
    const p = slotFixture(), result = E.design(p, 0), before = JSON.stringify(p);
    for (const options of [{}, { slotOutlines: false }, { slotOutlines: 'true' }]) {
      assert(!X.geometry(p, result, options).some((e) => e.layer.startsWith('SLOT_REFERENCE')));
    }
    const entities = X.geometry(p, result, { slotOutlines: true, labels: false });
    assert(entities.filter((e) => e.layer === 'SLOT').length === 1);
    assert(entities.filter((e) => e.layer === 'SLOT_REFERENCE_OUTLINE').every((e) => e.closed));
    assert(JSON.stringify(p) === before);
  });
  add('CAD obrys má správnu šírku v mm, obrátenú os Y a referenčné upozornenie.', () => {
    const p = slotFixture(), snapshot = X.cadSnapshot(p, E.design(p, 0), { slotOutlines: true });
    const outline = snapshot.entities.find((e) => e.layer === 'SLOT_REFERENCE_OUTLINE');
    assert(outline.closed && snapshot.slotGeometry === 'centerlines-and-reference-outlines' && snapshot.warning.includes('výrobnú toleranciu'));
    near(Math.min(...outline.points.map((p) => p.y)), -35); near(Math.max(...outline.points.map((p) => p.y)), -25);
    assert(X.cadSnapshot(p, E.design(p, 0)).slotGeometry === 'centerlines');
  });
  add('Oba zásuvkové modely majú referenčné obrysy v otvorenej i zatvorenej polohe.', () => {
    for (const kind of ['drawer', 'double-drawer']) {
      const p = K.preset(kind), range = K.driveRange(p);
      for (const motion of [range.min, (range.min + range.max) / 2, range.max]) {
        const snapshot = X.cadSnapshot(p, K.solve(p, motion), { slotOutlines: true, dimensions: false });
        const outlines = snapshot.entities.filter((e) => e.layer === 'SLOT_REFERENCE_OUTLINE');
        assert(outlines.length === (kind === 'drawer' ? 1 : 3));
        assert(outlines.every((e) => e.closed && e.points.length <= 1001));
        if (kind === 'double-drawer') {
          const rear = outlines.find((e) => e.elementId === 'rear-slot');
          near(Math.max(...rear.points.map((p) => p.y)) - Math.min(...rear.points.map((p) => p.y)), 8);
        }
      }
    }
  });
  add('Samostatné referenčné vodidlo nemá falošný šírkový obrys.', () => {
    const p = slotFixture(); p.elements[0].guideOnly = true;
    assert(!X.geometry(p, E.design(p, 0), { slotOutlines: true }).some((e) => e.layer.startsWith('SLOT_REFERENCE')));
  });
  add('Uzavretá drážka prenesie oba obrysy do samostatných CAD vrstiev.', () => {
    const p = slotFixture([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }, { x: 0, y: 0 }]);
    const snapshot = X.cadSnapshot(p, E.design(p, 0), { slotOutlines: true });
    for (const layer of ['SLOT_REFERENCE_OUTLINE', 'SLOT_REFERENCE_INNER']) assert(snapshot.entities.some((e) => e.layer === layer && e.closed));
  });
  add('DXF používa príznak uzavretia pre obrys, ale nie pre strednicu.', () => {
    const p = slotFixture(), dxf = X.dxf(p, E.design(p, 0), { slotOutlines: true });
    const entities = dxf.split('0\r\nLWPOLYLINE\r\n').slice(1);
    assert(entities.some((e) => e.includes('\r\n8\r\nSLOT_REFERENCE_OUTLINE\r\n') && e.includes('\r\n70\r\n1\r\n')));
    assert(entities.some((e) => e.includes('\r\n8\r\nSLOT\r\n') && e.includes('\r\n70\r\n0\r\n')));
    assert(dxf.includes('999\r\n') && dxf.includes('referen'));
  });
  add('Vektorové SVG nekreslí referenčný obrys ako plný materiál.', () => {
    const p = slotFixture(), svg = X.vectorSVG(p, E.design(p, 0), { slotOutlines: true, dimensions: false, labels: false });
    assert((svg.match(/fill="none"/g) || []).length >= 2);
  });
  add('Neplatný obrys má pomenovanú chybu a strednicový CAD zostáva dostupný.', () => {
    const p = slotFixture([{ x: 0, y: 0 }, { x: 50, y: 50 }, { x: 0, y: 50 }, { x: 50, y: 0 }]), result = E.design(p, 0);
    assert(X.cadSnapshot(p, result, { slotOutlines: false }).entities.some((e) => e.layer === 'SLOT'));
    let message = '';
    try { X.cadSnapshot(p, result, { slotOutlines: true }); } catch (error) { message = error.message; }
    assert(message.includes(p.elements[0].name) && message.includes('vypnúť referenčné obrysy'));
  });
  add('CAD odmietne aj jednu trajektóriu nad limitom Fusion 1001 bodov.', () => {
    const p = slotFixture(), result = E.design(p, 0), samples = Array(1002).fill(result);
    throws(() => X.cadSnapshot(p, result, { trajectories: true, samples, references: [{ elementId: p.elements[0].id, point: 'a' }] }));
  });
  add('Silový CSV má hlavičku a vzorky s montážnymi silami.', () => {
    const { project } = fixture(), samples = K.sample(project, 13), context = P.prepare(project, { samples });
    const value = X.forceCSV(project, samples, context);
    assert(value.startsWith('\uFEFFpohon_mm;') && value.includes('vyrovnavacia_N'));
    assert(value.split('\r\n').length === 14 && !/NaN|undefined/.test(value));
  });
  add('Dynamický CSV používa sekundy a mm/s namiesto SI rýchlosti.', () => {
    const { project } = fixture(), context = P.prepare(project), history = [{ time: 0, motion: 0, velocity: 0 }, { time: .1, motion: 1, velocity: .02 }];
    const value = X.forceCSV(project, [], context, history);
    assert(value.split('\r\n').length === 3 && value.includes('"1";"0.1";"20"'));
  });
  add('CSV bez prípustnej dynamiky zachová sily a prázdny zovšeobecnený údaj.', () => {
    const { project } = fixture(), value = X.forceCSV(project, K.sample(project, 3), null);
    assert(value.split('\r\n').length === 4 && !/NaN|undefined/.test(value));
  });
  add('HTML report má výkres, grafy, rozmery, fyziku a tabuľky.', () => {
    const value = X.htmlReport(report());
    for (const token of ['<!doctype html>', '<svg', '<table', 'Pružiny a piesty', 'Väzby a uložené kóty', 'Vyrovnávacia sila', 'Vzorkované polohy', 'Priemer drôtu / tyče', 'Osové tlmenie', 'Montáž A', 'Montáž B', 'Dĺžka medzi bodmi']) assert(value.includes(token), token);
    assert(!value.includes('<script') && !value.includes('<link'));
  });
  add('HTML report nepustí importovaný názov do vykonateľného HTML.', () => {
    const data = report(); data.project.name = '<script>alert(1)</script>'; data.project.elements[0].name = '<img src=x onerror=alert(1)>';
    const value = X.htmlReport(data);
    assert(value.includes('&lt;script&gt;') && value.includes('&lt;img') && !value.includes('<script') && !value.includes('<img'));
  });
  add('Report viditeľne označí chýbajúci silový výpočet.', () => {
    const p = K.preset('custom'), samples = K.sample(p, 3);
    const data = X.reportData(p, samples[0], samples, { forceError: 'Chýba pohon.' });
    assert(X.htmlReport(data).includes('Chýba pohon.') && JSON.stringify(X.pdfReport(data)).includes('Chýba pohon.'));
  });
  add('PDF definícia je serializovateľná a používa lokálne vektory a Roboto.', () => {
    const spec = X.pdfReport(report()), text = JSON.stringify(spec);
    assert(spec.pageSize === 'A4' && spec.defaultStyle.font === 'Roboto');
    assert(spec.content.some((node) => node.svg) && spec.content.some((node) => node.table));
    assert(!text.includes('"image":"http') && !text.includes('"font":"Arial"'));
    assert(JSON.parse(text).content.length === spec.content.length);
    assert(spec.content.some((node) => node.unbreakable && node.stack?.some((child) => child.style === 'section' && child.text.includes('Nastavenia simulácie'))));
    for (const token of ['Priemer drôtu / tyče', 'Osové tlmenie', 'Montáž A', 'Montáž B', 'Dĺžka medzi bodmi']) assert(text.includes(token), token);
  });
  add('PDF a HTML report zahrnú časový záznam dynamiky.', () => {
    const data = report(); data.history = [{ time: .1, motion: 2, velocity: .02 }];
    assert(X.htmlReport(data).includes('Časový záznam') && JSON.stringify(X.pdfReport(data)).includes('Rýchlosť (mm/s)'));
  });
  add('Report preberie schému z plátna bez vynútenia kót alebo iného vzhľadu.', () => {
    const { project } = fixture(), samples = K.sample(project, 3), svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="#262624"/></svg>';
    const data = X.reportData(project, samples[0], samples, { scene: { svg, width: 1, height: 1 } });
    assert(data.drawing === svg && data.drawingKind === 'scene');
    assert(X.htmlReport(data).includes('Schéma ako na plátne') && X.htmlReport(data).includes('Report je statický'));
    throws(() => X.pdfReport(data));
    data.drawingImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6fCgAAAAASUVORK5CYII=';
    const spec = X.pdfReport(data), drawing = spec.content.find((v) => v.stack?.some((child) => child.image));
    assert(drawing?.unbreakable && drawing.stack[1].image === data.drawingImage && drawing.stack[2].text.includes('PDF je statické'));
    assert(spec.content.some((v) => v.table) && spec.defaultStyle.font === 'Roboto');
  });
  add('Report odmietne nadmernú snímku a PDF odmietne vzdialený alebo nesprávny obrázok.', () => {
    const p = K.preset('custom'), samples = K.sample(p, 3), scene = { svg: '<svg/>', width: 2000, height: 4000 };
    for (const invalid of [{ width: 2001 }, { height: 4001 }, { width: NaN }, { svg: '<svg>' + ' '.repeat(8 * 1024 * 1024) }]) throws(() => X.reportData(p, samples[0], samples, { scene: { ...scene, ...invalid } }));
    const data = X.reportData(p, samples[0], samples, { scene });
    for (const image of ['https://example.com/image.png', 'data:image/jpeg;base64,abcd', 'data:image/png;base64,abcd', 'data:image/png;base64,iVBORw0KGgo' + 'a'.repeat(16 * 1024 * 1024)]) { data.drawingImage = image; throws(() => X.pdfReport(data)); }
  });
  add('Reporty nevydávajú uhlovú chybu za milimetre.', () => {
    const p = K.preset('custom'), a = { ...K.makeElement('link', 0, 0), locked: true }, b = { ...K.makeElement('link', 0, 0), locked: true, angle: 30 };
    p.elements = [a, b]; p.connections = [{ id: K.uid(), name: 'Uhlový konflikt', type: 'angle', a: { elementId: a.id, point: 'a' }, b: { elementId: b.id, point: 'a' }, value: 10 }];
    const samples = K.sample(p, 3, { collisions: false }), data = X.reportData(p, samples[0], samples);
    near(data.maxPositionResidual, 0); near(data.maxAngularResidual, 20);
    const html = X.htmlReport(data), pdf = JSON.stringify(X.pdfReport(data));
    for (const value of [html, pdf]) assert(value.includes('Polohová chyba (mm)') && value.includes('Uhlová chyba (°)') && !value.includes('Maximálna chyba väzieb'));
  });
  add('Reporty po úplných otáčkach nevykazujú fiktívnu chybu 360°.', () => {
    const p = K.preset('custom'), a = { ...K.makeElement('link', 0, 0), locked: true, angle: 720 }, b = { ...K.makeElement('link', 0, 0), locked: true };
    p.elements = [a, b]; p.connections = [{ id: K.uid(), name: 'Úplné otáčky', type: 'angle', a: { elementId: a.id, point: 'a' }, b: { elementId: b.id, point: 'a' }, value: 0 }];
    for (const error of [0, 7]) {
      b.angle = error;
      const samples = K.sample(p, 3, { collisions: false }), data = X.reportData(p, samples[0], samples);
      near(data.maxPositionResidual, 0); near(data.maxAngularResidual, error); assert(data.blocked === (error ? 3 : 0));
      assert(X.htmlReport(data).includes('Uhlová chyba (°)') && JSON.stringify(X.pdfReport(data)).includes('Uhlová chyba (°)'));
    }
  });
  add('Report dvojkulisového projektu obsahuje dva uhlové profily a odhad.', () => {
    const p = K.preset('double-drawer'), samples = K.sample(p, 13), data = X.reportData(p, samples[0], samples);
    assert(data.plots.length === 2 && X.htmlReport(data).includes('Odhadová geometria'));
  });
  add('Výkres analytického modelu doplní referenčné rozmery aj bez uložených kót.', () => {
    const p = K.preset('double-drawer'), geometry = X.geometry(p, K.solve(p, 0));
    const texts = geometry.filter((e) => e.kind === 'text' && e.layer === 'DIMENSIONS').map((e) => e.text);
    assert(texts.some((s) => s.includes('Rameno: 240')) && texts.some((s) => s.includes('Korpus: 390')));
  });
  add('Report obsahuje iba aktívne parametre konkrétnej šablóny.', () => {
    const p = K.preset('double-drawer'), samples = K.sample(p, 3), html = X.htmlReport(X.reportData(p, samples[0], samples));
    assert(html.includes('Hrúbka stola') && !html.includes('Dĺžka spojky'));
  });
  add('Report preruší graf cez neplatnú vzorku.', () => {
    const p = K.preset('fourbar'), samples = K.sample(p, 7);
    samples[3].blocked = true;
    const data = X.reportData(p, samples[0], samples);
    assert((data.plots[0].match(/<polyline /g) || []).length === 2);
  });
  add('Časový graf reportu používa skutočný čas, nie poradie vzoriek.', () => {
    const data = report(), history = [{ time: 0, motion: 0 }, { time: .1, motion: 1 }, { time: 1, motion: 2 }];
    const value = X.reportData(data.project, data.result, data.samples, { history }).plots.at(-1);
    assert(value.includes('Čas (s)') && value.includes('91,'));
  });
  add('Hranice prázdnej geometrie majú kladný rozsah.', () => {
    const b = X.geometryBounds([]); assert(b.width > 0 && b.height > 0);
  });
  global.KinematicsTestCases = Object.freeze([...global.KinematicsTestCases, ...cases]);
})(globalThis);
