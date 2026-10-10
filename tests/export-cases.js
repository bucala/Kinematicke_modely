(function (global) {
  'use strict';
  const K = global.Kinematics, E = global.KinmoEditor, P = global.KinmoPhysics, X = global.KinmoExport, cases = [];
  const add = (name, run) => cases.push({ name, run });
  const assert = (value, message = 'Podmienka nebola splnená.') => { if (!value) throw new Error(message); };
  const near = (a, b, tolerance = .001) => assert(Number.isFinite(a) && Math.abs(a - b) <= tolerance, `${a} ≠ ${b}`);
  const throws = (fn) => { let failed = false; try { fn(); } catch { failed = true; } assert(failed, 'Očakávala sa chyba.'); };
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
