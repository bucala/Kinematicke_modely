/* Kinematika's position solver. All lengths are millimetres; public angles are degrees. */
(function (global) {
  'use strict';

  const DEG = Math.PI / 180;
  const EPS = 1e-8;
  const TOLERANCE = 0.05;
  const ELASTIC_TYPES = ['spring-compression', 'spring-extension', 'piston-push', 'piston-pull'];
  const TYPES = ['ground', 'rail', 'link', 'slot', 'cam', 'bearing', 'node', 'panel', ...ELASTIC_TYPES];
  const CONSTRAINT_TYPES = ['revolute', 'prismatic', 'point-path', 'cam-contact', 'distance', 'fixed', 'parallel', 'angle'];
  const KINDS = ['drawer', 'fourbar', 'crank', 'custom'];
  const projects = new Map();
  const CURVES = ['cam', 'arc', 'bezier', 'spline', 'polyline'];
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const copy = (v) => JSON.parse(JSON.stringify(v));
  const uid = () => global.crypto?.randomUUID?.() || `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const along = (p, length, angle) => ({ x: p.x + length * Math.cos(angle * DEG), y: p.y - length * Math.sin(angle * DEG) });
  const angleOf = (a, b) => Math.atan2(a.y - b.y, b.x - a.x) / DEG;
  const wrapAngle = (value) => ((value + 180) % 360 + 360) % 360 - 180;

  const defaults = {
    frameLength: 390, frameHeight: 180, travelMin: 0, travelMax: 300,
    panelLength: 160, panelThickness: 16, pivotY: 120, panelOffsetX: 0,
    closedAngle: 90, openAngle: 0, bearingOffset: 65, bearingRadius: 6,
    slotWidth: 16, turnStart: 110, smoothness: 1, curveKind: 'cam',
    curveRadius: 250, slotOffsetX: 0, slotOffsetY: 0,
    groundLength: 260, crankLength: 72, couplerLength: 210, rockerLength: 135,
    rodLength: 190, sliderY: 120, rotationMin: 0, rotationMax: 360,
  };
  const simulationDefaults = {
    mode: 'kinematic', gravity: 9.81, damping: 8, friction: 0, inputForce: 0,
    initialVelocity: 0, duration: 10, softStops: false, stopStiffness: 100, stopDamping: 20, returnOnRelease: true, returnDamping: 200,
  };
  const rotate = (p, angle) => ({
    x: p.x * Math.cos(angle * DEG) + p.y * Math.sin(angle * DEG),
    y: -p.x * Math.sin(angle * DEG) + p.y * Math.cos(angle * DEG),
  });
  const localPoint = (pose, p) => rotate({ x: p.x - pose.a.x, y: p.y - pose.a.y }, -pose.angle);
  const worldPoint = (pose, p) => {
    const v = rotate(p, pose.angle);
    return { x: pose.a.x + v.x, y: pose.a.y + v.y };
  };
  const isElastic = (element) => ELASTIC_TYPES.includes(element?.type);
  const carriagePoints = ['c', 'ct', 'cb'];
  const pointKeys = (e) => ['bearing', 'node', 'cam'].includes(e.type) ? ['a'] : e.type === 'rail' ? ['a', 'b', ...carriagePoints] : e.type === 'panel' ? ['a', 'b', 'c'] : ['a', 'b'];
  const defaultTracePoint = (e) => e?.type === 'rail' ? 'c' : e && pointKeys(e).includes('b') ? 'b' : 'a';
  const pointName = (key) => ({ ct: 'Vrch vozíka', cb: 'Spodok vozíka' })[key] || key.toUpperCase();
  function carriageGeometry(element, pose) {
    const frame = { a: pose.c || pose.a, angle: pose.angle }, w = element.carriageWidth || 24, h = element.carriageHeight || 30;
    return {
      ct: worldPoint(frame, { x: 0, y: -h / 2 }), cb: worldPoint(frame, { x: 0, y: h / 2 }),
      carriageOutline: [{ x: -w / 2, y: -h / 2 }, { x: w / 2, y: -h / 2 }, { x: w / 2, y: h / 2 }, { x: -w / 2, y: h / 2 }].map((p) => worldPoint(frame, p)),
    };
  }
  // Shared physical outlines for template rendering, editable copies and CAD export.
  function templateOutlines(project, element, pose, motion = 0) {
    if (!element.primary) return [];
    const p = project.parameters, rect = (x,y,w,h) => [{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];
    if (project.kind === 'double-drawer') {
      if (element.role === 'frame') {
        const top=p.tableY-p.frameHeight,bottom=p.tableY-p.frontOpening;
        return [[{x:p.frameLength+8,y:bottom},{x:p.frameLength+8,y:top-8},{x:-8,y:top-8},{x:-8,y:p.tableY},{x:0,y:p.tableY},{x:0,y:top},{x:p.frameLength,y:top},{x:p.frameLength,y:bottom}]];
      }
      if(element.role==='stop') return [rect(pose.a.x-3,pose.a.y,6,pose.b.y-pose.a.y)];
      if(element.role==='carrier') return [[{x:pose.a.x,y:p.drawerY},{x:pose.b.x-6,y:p.drawerY},{x:pose.b.x-6,y:p.drawerY-38},{x:pose.b.x,y:p.drawerY-38},{x:pose.b.x,y:p.drawerY+p.drawerHeight},{x:pose.a.x,y:p.drawerY+p.drawerHeight}]];
      if(element.role==='bracket') return [[pose.a,pose.b,pose.c].map(v=>({...v}))];
    }
    if(project.kind==='drawer') {
      if(element.type==='ground') {
        const top=p.pivotY-p.frameHeight,right=p.frameLength-18;
        return [[{x:right,y:top-12},{x:-12,y:top-12},{x:-12,y:p.pivotY+26},{x:right,y:p.pivotY+26},{x:right,y:p.pivotY+14},{x:0,y:p.pivotY+14},{x:0,y:top},{x:right,y:top}]];
      }
      if(element.type==='rail') return [rect(0,p.pivotY-9,p.frameLength,18),rect(motion,p.pivotY-6,p.frameLength+p.panelOffsetX,12)];
    }
    return [];
  }
  const hasOrientation = (project, reference) => {
    let e = project.elements.find((v) => v.id === reference.elementId);
    while (e?.parentId) e = project.elements.find((v) => v.id === e.parentId);
    return !!e && !['bearing', 'node'].includes(e.type);
  };

  function makeElement(type, x = 150, y = 30) {
    const names = {
      ground: 'Pevný rám', rail: 'Lineárne vedenie', link: 'Tiahlo', slot: 'Zakrivená kulisa', cam: 'Rotačná vačka', bearing: 'Ložisko', node: 'Uzol', panel: 'Sklápacie čelo',
      'spring-compression': 'Tlačná pružina', 'spring-extension': 'Ťažná pružina', 'piston-push': 'Tlačný piest', 'piston-pull': 'Ťažný piest',
    };
    return {
      id: uid(), type, name: names[type] || 'Prvok', x, y, angle: type === 'panel' ? 90 : 0,
      length: type === 'piston-pull' ? 144 : type === 'piston-push' ? 240 : type.startsWith('spring-') ? 160 : type === 'cam' ? 40 : type === 'panel' ? 160 : type === 'rail' ? 240 : 120,
      group:'',plane:0,guideFriction:0,width: type === 'panel' ? 16 : 12, radius: type === 'cam' ? 40 : 6, stroke: 150, carriageOffset: 0, slotWidth: 16,
      carriageWidth: 24, carriageHeight: 30,
      camLift: 20, camPhase: 0, camShape: 'harmonic', camNoseRatio: .4,
      bearingOffset: 65, curveKind: 'bezier', curveRadius: 100, visible: true,
      locked: type === 'ground', drive: type === 'rail',
      slotId: '', controls: [{ x: 0, y: 0 }, { x: 45, y: 0 }, { x: 75, y: 70 }, { x: 130, y: 70 }],
      driveMode: ['rail', 'node'].includes(type) ? 'linear' : 'rotary', driveAngle: 0, drivePivot: 'a', driveSpeed: null, color: '',
      parentId: '', parentPoint: 'a', localC: null, outline: [],
      mass: ['ground', 'slot', 'node'].includes(type) || ELASTIC_TYPES.includes(type) ? 0 : type === 'rail' ? 2 : type === 'bearing' ? 0.1 : 1,
      inertia: 0, com: null,
      restLength: type === 'piston-pull' ? 144 : type === 'piston-push' ? 240 : 160, minLength: type.startsWith('piston-') ? 144 : 80, maxLength: 240, diameter: 20,
      rodDiameter: 8, wireDiameter: 2, force: 100, stiffness: 1, preload: 0, forceMode: 'rated',
      damping: type.startsWith('piston-') ? 400 : type.startsWith('spring-') ? 200 : 0, dampingCompression: null, dampingExtension: null, actuatorMode: 'gas', rangeMode: 'auto', tipMass: .1, progression: 1, mountA: null, mountB: null,
    };
  }

  function preset(kind = 'drawer') {
    if (projects.has(kind)) return projects.get(kind).create();
    if (!KINDS.includes(kind)) kind = 'drawer';
    const names = { drawer: 'Výsuv s vyklápacím čelom', fourbar: 'Štvorkĺbový mechanizmus', crank: 'Kľukový mechanizmus', custom: 'Nový mechanizmus' };
    const project = {
      version: 1, id: uid(), name: names[kind], kind, parameters: copy(defaults), controls: null,
      elements: [], connections: [], dimensions: [], trajectories: [], simulation: copy(simulationDefaults),
    };
    const add = (type, id, name, role) => {
      const e = { ...makeElement(type), id, name, role, primary: true, locked: true };
      project.elements.push(e);
      return e;
    };
    const connect = (a, ap, b, bp, name) => project.connections.push({ id: uid(), a: { elementId: a, point: ap }, b: { elementId: b, point: bp }, name, builtin: true });
    if (kind === 'drawer') {
      add('ground', 'frame-1', 'Pevný korpus', 'frame');
      add('rail', 'rail-1', 'Lineárny výsuv', 'rail');
      add('slot', 'slot-1', 'Zakrivená kulisa', 'slot');
      add('panel', 'panel-1', 'Sklápacie čelo', 'panel');
      add('bearing', 'bearing-1', 'Vodiace ložisko A', 'follower');
      add('bearing', 'bearing-2', 'Otočný čap B', 'pivot');
      connect('frame-1', 'a', 'rail-1', 'a', 'Pevné uloženie vedenia');
      connect('rail-1', 'b', 'panel-1', 'a', 'Otočný kĺb čela');
      connect('panel-1', 'c', 'bearing-1', 'a', 'Ložisko na čele');
      connect('bearing-1', 'a', 'slot-1', 'curve', 'Čap v zakrivenej kulise');
      connect('panel-1', 'a', 'bearing-2', 'a', 'Otočný čap výsuvu');
    } else if (kind === 'fourbar') {
      add('ground', 'frame-1', 'Pevný rám', 'frame');
      add('link', 'input-1', 'Hnacia kľuka', 'input');
      add('link', 'coupler-1', 'Spojovacie tiahlo', 'coupler');
      add('link', 'output-1', 'Výstupné rameno', 'output');
      connect('frame-1', 'a', 'input-1', 'a', 'Pevný otočný kĺb A');
      connect('input-1', 'b', 'coupler-1', 'a', 'Otočný kĺb B');
      connect('coupler-1', 'b', 'output-1', 'b', 'Otočný kĺb C');
      connect('output-1', 'a', 'frame-1', 'b', 'Pevný otočný kĺb D');
    } else if (kind === 'crank') {
      project.parameters.crankLength = 65;
      add('ground', 'frame-1', 'Pevný rám', 'frame');
      add('link', 'input-1', 'Hnacia kľuka', 'input');
      add('link', 'coupler-1', 'Ojnica', 'coupler');
      add('rail', 'rail-1', 'Vedenie piesta', 'rail');
      add('bearing', 'piston-1', 'Posuvný piest', 'piston');
      connect('frame-1', 'a', 'input-1', 'a', 'Uloženie kľuky');
      connect('input-1', 'b', 'coupler-1', 'a', 'Otočný kĺb ojnice');
      connect('coupler-1', 'b', 'piston-1', 'a', 'Čap piesta');
      connect('piston-1', 'a', 'rail-1', 'curve', 'Lineárne vedenie piesta');
    }
    return project;
  }

  function registerProject(definition) {
    if (!definition || !/^[a-z][a-z0-9-]+$/.test(definition.kind) || KINDS.includes(definition.kind) ||
        ['create', 'prepare', 'solve', 'validate', 'phases', 'bounds'].some((key) => typeof definition[key] !== 'function')) {
      throw new Error('Neplatná definícia projektového mechanizmu.');
    }
    projects.set(definition.kind, definition);
    KINDS.push(definition.kind);
  }

  function prepareProject(project) {
    if (projects.has(project.kind)) return projects.get(project.kind).prepare(project);
    return project.kind === 'drawer' ? slotProfile(project) : null;
  }

  function projectPhases(project) {
    if (project.motionPlan?.phases.length) return [{ motion: project.motionPlan.phases[0].from, name: 'Začiatok' }, ...project.motionPlan.phases.map((p) => ({ motion: p.to, name: p.name }))];
    if (projects.has(project.kind)) return projects.get(project.kind).phases(project);
    const range = driveRange(project);
    const names = range.unit === 'mm' ? ['Zatvorené', 'Medzipoloha', 'Otvorené'] : ['Začiatok', 'Pol cyklu', 'Celý cyklus'];
    return [range.min, lerp(range.min, range.max, 0.5), range.max].map((motion, i) => ({ motion, name: names[i] }));
  }

  function tracePoint(result, reference, space = 'world') {
    const position = point(result, reference);
    if (!position) return null;
    const origin = space === 'carrier' ? result.referenceOrigin : null;
    return origin ? { x: position.x - origin.x, y: position.y - origin.y } : { ...position };
  }

  function configuredDriveRange(project) {
    const rotary = ['fourbar', 'crank'].includes(project.kind) || (project.kind === 'custom' && project.elements.some((e) => e.drive && ['link', 'panel', 'cam'].includes(e.type) && e.driveMode !== 'linear'));
    return rotary
      ? { min: project.parameters.rotationMin ?? 0, max: project.parameters.rotationMax ?? 360, unit: '°', label: 'Uhol pohonu' }
      : { min: project.parameters.travelMin, max: project.parameters.travelMax, unit: 'mm', label: 'Posuv výsuvu' };
  }

  function driveRange(project) {
    const range = configuredDriveRange(project), rail = project.kind === 'custom' && project.elements.find((e) => e.drive && e.type === 'rail');
    if (!rail || !Number.isFinite(rail.carriageOffset) || !(rail.stroke > 0)) return range;
    const span = range.max - range.min, low = Math.max(range.min, range.min - rail.carriageOffset / rail.stroke * span), high = Math.min(range.max, range.min + (rail.length - rail.carriageOffset) / rail.stroke * span);
    return high > low + EPS ? { ...range, min: low, max: high } : range;
  }
  function railTravel(project, element, motion) {
    const range = configuredDriveRange(project);
    return element.drive ? clamp((motion - range.min) / Math.max(EPS, range.max - range.min), 0, 1) * element.stroke : 0;
  }

  function designAngle(p, s) {
    const start = clamp(p.turnStart, p.travelMin, p.travelMax - 0.01);
    const t = clamp((s - start) / (p.travelMax - start), 0, 1);
    const u = t ** clamp(p.smoothness, 0.3, 3);
    return lerp(p.closedAngle, p.openAngle, u * u * (3 - 2 * u));
  }

  function bezier(points, t) {
    if (!Array.isArray(points) || points.length < 2 || points.length > 32 || !Number.isFinite(t)) throw new Error('Bézierova krivka vyžaduje 2 až 32 riadiacich bodov a platný parameter.');
    if (t <= 0) return { ...points[0] };
    if (t >= 1) return { ...points.at(-1) };
    const reverse = t > .5, u = reverse ? 1 - t : t, degree = points.length - 1;
    let weight = (1 - u) ** degree, x = 0, y = 0, total = 0;
    // Start from the nearer endpoint to keep Bernstein weights stable at high degrees.
    for (let i = 0; i <= degree; i++) {
      const p = points[reverse ? degree - i : i];
      x += weight * p.x; y += weight * p.y; total += weight;
      weight *= (degree - i) / (i + 1) * u / (1 - u);
    }
    return { x: x / total, y: y / total };
  }

  function catmull(points, t) {
    const n = points.length - 1;
    const scaled = clamp(t, 0, 1) * n;
    const i = Math.min(n - 1, Math.floor(scaled));
    const u = scaled - i;
    const [a, b, c, d] = [points[Math.max(0, i - 1)], points[i], points[i + 1], points[Math.min(n, i + 2)]];
    const axis = (key) => 0.5 * (2 * b[key] + (-a[key] + c[key]) * u + (2 * a[key] - 5 * b[key] + 4 * c[key] - d[key]) * u * u + (-a[key] + 3 * b[key] - 3 * c[key] + d[key]) * u ** 3);
    return { x: axis('x'), y: axis('y') };
  }

  function defaultControls(p) {
    const start = along({ x: p.frameLength + p.travelMin + p.panelOffsetX, y: p.pivotY }, p.bearingOffset, p.closedAngle);
    const end = along({ x: p.frameLength + p.travelMax + p.panelOffsetX, y: p.pivotY }, p.bearingOffset, p.openAngle);
    const dx = end.x - start.x;
    return [start, { x: start.x + dx * 0.48, y: start.y }, { x: end.x - dx * 0.28, y: end.y }, end];
  }

  function arcPoints(a, b, radius, count = 180, side = 1) {
    const chord = distance(a, b);
    if (chord < EPS) return { points: [a, b], invalid: false };
    if (radius + EPS < chord / 2) return { points: [a, b], invalid: true };
    const half = Math.abs(chord - 2 * radius) <= EPS, h = half ? 0 : Math.sqrt(Math.max(0, radius * radius - chord * chord / 4));
    const center = { x: (a.x + b.x) / 2 + side * (b.y - a.y) * h / chord, y: (a.y + b.y) / 2 - side * (b.x - a.x) * h / chord };
    const start = Math.atan2(a.y - center.y, a.x - center.x);
    const sweep = -side * (half ? Math.PI : 2 * Math.asin(Math.min(1, chord / (2 * radius))));
    return { points: Array.from({ length: count + 1 }, (_, i) => ({ x: center.x + radius * Math.cos(start + sweep * i / count), y: center.y + radius * Math.sin(start + sweep * i / count) })), invalid: false };
  }
  function validateOutline(points) {
    if (!Array.isArray(points) || points.length < 3 || points.length > 64 || points.some((p) => !Number.isFinite(p?.x) || !Number.isFinite(p?.y))) throw new Error('Obrys telesa musí mať 3 až 64 platných vrcholov.');
    const area = points.reduce((total, p, i) => { const q = points[(i + 1) % points.length]; return total + p.x * q.y - q.x * p.y; }, 0);
    if (Math.abs(area) < .00001 || points.some((p, i) => points.some((q, j) => j > i && distance(p, q) < .00001))) throw new Error('Obrys telesa nesmie byť nulový ani obsahovať opakované vrcholy.');
    for (let i = 0; i < points.length; i++) for (let j = i + 2; j < points.length; j++) {
      if (i === 0 && j === points.length - 1) continue;
      const a = points[i], b = points[(i + 1) % points.length], c = points[j], d = points[(j + 1) % points.length];
      if (segmentIntersection(a, b, c, d) || nearestOnSegment(a, c, d).distance < .00001 || nearestOnSegment(b, c, d).distance < .00001 || nearestOnSegment(c, a, b).distance < .00001 || nearestOnSegment(d, a, b).distance < .00001) throw new Error('Obrys telesa sa pretína alebo prekrýva. Opravte vrcholy pred uzavretím.');
    }
  }

  function slotProfile(project) {
    const p = project.parameters;
    let points, invalid = false;
    const controls = project.controls || defaultControls(p);
    if (p.curveKind === 'cam') {
      // This manufactured profile is the locus of the panel's bearing under a smooth motion law.
      const samples = [...Array.from({ length: 241 }, (_, i) => lerp(p.travelMin, p.travelMax, i / 240)), clamp(p.turnStart, p.travelMin, p.travelMax)];
      points = samples.sort((a, b) => a - b).map((s) => along({ x: p.frameLength + s + p.panelOffsetX, y: p.pivotY }, p.bearingOffset, designAngle(p, s)));
    } else if (p.curveKind === 'polyline') {
      points = controls;
    } else if (p.curveKind === 'arc') {
      const result = arcPoints(controls[0], controls[controls.length - 1], p.curveRadius);
      points = result.points;
      invalid = result.invalid;
    } else {
      points = Array.from({ length: 241 }, (_, i) => p.curveKind === 'spline' ? catmull(controls, i / 240) : bezier(controls, i / 240));
    }
    return { points: points.map((v) => ({ x: v.x + p.slotOffsetX, y: v.y + p.slotOffsetY })), invalid, controls };
  }

  function nearestOnSegment(point, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const lengthSq = dx * dx + dy * dy;
    const t = lengthSq > EPS ? clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq, 0, 1) : 0;
    const position = { x: a.x + t * dx, y: a.y + t * dy };
    return { ...position, t, distance: distance(point, position) };
  }

  function nearestOnPath(point, points) {
    let result = { x: points[0]?.x || 0, y: points[0]?.y || 0, distance: Infinity, segment: 0, t: 0 };
    for (let i = 1; i < points.length; i++) {
      const candidate = nearestOnSegment(point, points[i - 1], points[i]);
      if (candidate.distance < result.distance) result = { ...candidate, segment: i - 1 };
    }
    return result;
  }
  function pointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j];
      if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  }
  function camProfile(element) {
    const pose = { a: { x: element.x, y: element.y }, angle: element.angle };
    if (element.camShape === 'pear') {
      const R = element.radius, r = R * (element.camNoseRatio ?? .4), d = R + element.camLift - r;
      if (d > R - r + EPS) {
        const theta = Math.acos((R - r) / d), points = [];
        for (let i = 0; i <= 160; i++) { const a = lerp(theta, Math.PI * 2 - theta, i / 160); points.push({ x: R * Math.cos(a), y: -R * Math.sin(a) }); }
        for (let i = 0; i <= 80; i++) { const a = lerp(-theta, theta, i / 80); points.push({ x: d + r * Math.cos(a), y: -r * Math.sin(a) }); }
        points.push({ ...points[0] });
        return points.map((point) => worldPoint(pose, rotate(point, element.camPhase)));
      }
    }
    return Array.from({ length: 241 }, (_, i) => {
      const theta = i / 240 * Math.PI * 2, radius = element.radius + element.camLift / 2 * (1 - Math.cos(theta - element.camPhase * DEG));
      return worldPoint(pose, { x: radius * Math.cos(theta), y: -radius * Math.sin(theta) });
    });
  }
  function nearestOnCam(point, pose, radius) {
    const path = pose.path, surface = nearestOnPath(point, path), a = path[surface.segment], b = path[surface.segment + 1];
    const length = distance(a, b) || 1;
    let normal = { x: -(b.y - a.y) / length, y: (b.x - a.x) / length };
    if (!pointInPolygon(point, path) && surface.distance > EPS) normal = { x: (point.x - surface.x) / surface.distance, y: (point.y - surface.y) / surface.distance };
    const target = { x: surface.x + normal.x * radius, y: surface.y + normal.y * radius };
    return { ...target, surface, normal, distance: distance(point, target) };
  }

  function circlePathIntersections(center, radius, points) {
    const result = [];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const dx = b.x - a.x, dy = b.y - a.y, fx = a.x - center.x, fy = a.y - center.y;
      const A = dx * dx + dy * dy;
      if (A < EPS) continue;
      const B = 2 * (fx * dx + fy * dy), C = fx * fx + fy * fy - radius * radius;
      const disc = B * B - 4 * A * C;
      if (disc < -EPS) continue;
      for (const t of [(-B + Math.sqrt(Math.max(0, disc))) / (2 * A), (-B - Math.sqrt(Math.max(0, disc))) / (2 * A)]) {
        if (t >= -EPS && t <= 1 + EPS) result.push({ x: a.x + clamp(t, 0, 1) * dx, y: a.y + clamp(t, 0, 1) * dy, segment: i - 1 });
      }
    }
    return result;
  }

  function circleIntersections(a, r1, b, r2) {
    const d = distance(a, b);
    if (d < EPS || d > r1 + r2 + EPS || d < Math.abs(r1 - r2) - EPS) return [];
    const v = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, r1 * r1 - v * v));
    const x = a.x + v * (b.x - a.x) / d, y = a.y + v * (b.y - a.y) / d;
    return [{ x: x - h * (b.y - a.y) / d, y: y + h * (b.x - a.x) / d }, { x: x + h * (b.y - a.y) / d, y: y - h * (b.x - a.x) / d }];
  }

  function segmentIntersection(a, b, c, d) {
    const rx = b.x - a.x, ry = b.y - a.y, sx = d.x - c.x, sy = d.y - c.y;
    const den = rx * sy - ry * sx;
    if (Math.abs(den) < EPS) return null;
    const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den;
    const u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { x: a.x + t * rx, y: a.y + t * ry, t, u } : null;
  }

  function segmentRect(a, b, rect, padding = 0) {
    const r = { x: rect.x - padding, y: rect.y - padding, w: rect.w + 2 * padding, h: rect.h + 2 * padding };
    const inside = (p) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    if (inside(a) || inside(b)) return true;
    const corners = [{ x: r.x, y: r.y }, { x: r.x + r.w, y: r.y }, { x: r.x + r.w, y: r.y + r.h }, { x: r.x, y: r.y + r.h }];
    return corners.some((c, i) => segmentIntersection(a, b, c, corners[(i + 1) % 4]));
  }

  function genericPath(element) {
    const controls = element.controls.map((p) => along({ x: element.x, y: element.y }, Math.hypot(p.x, p.y), -Math.atan2(p.y, p.x) / DEG + element.angle));
    if (element.curveKind === 'polyline') return controls;
    if (element.curveKind === 'arc') return arcPoints(controls[0], controls.at(-1), element.curveRadius, 180, element.curveSide || 1).points;
    return Array.from({ length: 101 }, (_, i) => element.curveKind === 'spline' ? catmull(controls, i / 100) : bezier(controls, i / 100));
  }

  function bodyPose(element, motion, project, cachedPath) {
    const a = { x: element.x, y: element.y };
    const b = along(a, element.length, element.angle);
    if (['bearing', 'node'].includes(element.type)) return { a, b: a, angle: element.angle, length: 0 };
    const pose = { a, b, controlOrigin: { ...a }, angle: element.angle, length: element.length };
    if (element.type === 'panel') pose.c = element.localC ? worldPoint(pose, element.localC) : along(a, element.bearingOffset, element.angle);
    if (element.outline?.length) pose.outline = element.outline.map((v) => worldPoint(pose, v));
    if (element.type === 'rail') {
      const travel = railTravel(project, element, motion);
      if (element.movingRail) {
        pose.a = along(a, -travel, element.angle); pose.b = along(pose.a, element.length, element.angle); pose.controlOrigin = pose.a;
        pose.c = along(a, element.carriageOffset || 0, element.angle);
        if (element.outline?.length) pose.outline = element.outline.map((v) => worldPoint(pose, v));
      } else pose.c = along(a, (element.carriageOffset || 0) + travel, element.angle);
      pose.path = [pose.a, pose.b];
      Object.assign(pose, carriageGeometry(element, pose));
    }
    if (element.type === 'slot') { pose.path = cachedPath || genericPath(element); pose.a = pose.path[0]; pose.b = pose.path[pose.path.length - 1]; }
    if (element.type === 'cam') { pose.path = cachedPath || camProfile(element); pose.outline = pose.path.slice(0, -1); }
    return pose;
  }

  function solveExtras(project, motion, poses, issues, invalid, options) {
    const noResiduals = () => ({ residual: 0, positionResidual: 0, angularResidual: 0 });
    const extras = project.elements.filter((e) => !e.primary && !isElastic(e));
    const range = driveRange(project);
    const bodies = new Map(extras.map((e) => {
      const programmed=!options.design&&e.drive?global.KinmoAdvanced?.at(project,e,motion,options.time):null;
      const linear = !options.design && e.drive && e.type !== 'rail' && e.driveMode === 'linear';
      const offset = linear ? along({ x: e.x, y: e.y }, programmed??(motion - range.min) / (range.max - range.min) * e.stroke, e.driveAngle || 0) : e;
      const angle = e.angle + (!options.design && e.drive && ['link', 'panel', 'cam'].includes(e.type) && !linear ? (programmed??motion) : 0);
      let x = offset.x, y = offset.y;
      const seed = !options.design && !e.drive && !e.locked && !e.parentId && options.bodyPositions?.[e.id];
      if (!options.design && e.drive && !linear && e.drivePivot !== 'a') {
        const local = e.drivePivot === 'c' ? e.localC || { x: e.bearingOffset, y: 0 } : { x: e.length, y: 0 };
        const before = rotate(local, e.angle), after = rotate(local, angle);
        x += before.x - after.x; y += before.y - after.y;
      }
      return [e.id, {
        element: e, x: seed && Number.isFinite(seed.x) ? seed.x : x, y: seed && Number.isFinite(seed.y) ? seed.y : y, angle: seed && Number.isFinite(seed.angle) ? seed.angle : angle, path: null,
      }];
    }));
    const refreshAll = () => {
      const done = new Set(), active = new Set();
      const refresh = (body) => {
        const e = body.element;
        if (done.has(e.id) || active.has(e.id)) return;
        active.add(e.id);
        if (e.parentId && bodies.has(e.parentId)) refresh(bodies.get(e.parentId));
        let x = body.x, y = body.y, angle = body.angle;
        const parent = poses[e.parentId];
        if (parent) {
          const origin = parent[e.parentPoint || 'a'] || parent.a;
          const offset = rotate({ x: body.x, y: body.y }, parent.angle);
          x = origin.x + offset.x; y = origin.y + offset.y; angle += parent.angle;
        }
        const transformed = { ...e, x, y, angle };
        const signature = `${x},${y},${angle}`;
        if (body.signature !== signature) {
          body.path = e.type === 'slot' ? genericPath(transformed) : e.type === 'cam' ? camProfile(transformed) : null;
          const q=!options.design&&e.drive?global.KinmoAdvanced?.at(project,e,motion,options.time):null;
          const railMotion=e.type==='rail'&&q!=null?configuredDriveRange(project).min+q/e.stroke*(configuredDriveRange(project).max-configuredDriveRange(project).min):motion;
          poses[e.id] = bodyPose(transformed, railMotion, project, body.path);
          body.signature = signature;
        }
        done.add(e.id); active.delete(e.id);
      };
      bodies.forEach(refresh);
    };
    refreshAll();
    if (options.design) return noResiduals();
    const joints = project.connections.filter((j) => !j.builtin && !(options.softContact && j.contact?.enabled) && !isElastic(project.elements.find((e) => e.id === j.a.elementId)) && !isElastic(project.elements.find((e) => e.id === j.b.elementId)));
    if (!extras.length && !joints.length) return noResiduals();
    const rootBody = (id) => {
      let body = bodies.get(id);
      while (body?.element.parentId) body = bodies.get(body.element.parentId);
      return body;
    };
    const immobile = (body) => !body || body.element.locked || body.element.drive || ['ground', 'rail', 'slot'].includes(body.element.type);
    const onGuide = (p, pose, joint) => {
      if (joint.type === 'cam-contact') {
        const reference = joint.a.point === 'curve' ? joint.b : joint.a, roller = project.elements.find((e) => e.id === reference.elementId);
        return nearestOnCam(p, pose, roller.primary ? project.parameters.bearingRadius : roller.radius);
      }
      const nearest = nearestOnPath(p, pose.path);
      if (joint.type !== 'prismatic' || joint.limitMin == null) return nearest;
      const a = pose.path[0], b = pose.path.at(-1), length = distance(a, b), along = clamp(nearest.t * length, joint.limitMin, joint.limitMax) / (length || 1);
      return { x: lerp(a.x, b.x, along), y: lerp(a.y, b.y, along) };
    };
    const endpoints = (joint) => {
      const pa = poses[joint.a.elementId], pb = poses[joint.b.elementId];
      let a = pa?.[joint.a.point], b = pb?.[joint.b.point];
      if (joint.a.point === 'curve' && b && pa?.path) a = onGuide(b, pa, joint);
      if (joint.b.point === 'curve' && a && pb?.path) b = onGuide(a, pb, joint);
      return { a, b };
    };
    const jointHasAngle = (joint) => ['parallel', 'angle', 'fixed'].includes(joint.type) ||
      (joint.type === 'prismatic' && hasOrientation(project, joint.a.point === 'curve' ? joint.b : joint.a));
    const limitError = (joint) => {
      if (joint.type !== 'revolute' || joint.limitMin == null) return 0;
      const raw = poses[joint.b.elementId].angle - poses[joint.a.elementId].angle;
      let angle = wrapAngle(raw);
      if (angle === -180 && raw > 0) angle = 180;
      return angle - clamp(angle, joint.limitMin, joint.limitMax);
    };
    const adjust = (body, point, error, sign, denom, rotateBody = true) => {
      if (immobile(body)) return;
      const r = { x: point.x - body.x, y: point.y - body.y };
      const inertia = !rotateBody || ['bearing', 'node'].includes(body.element.type) ? 0 : 4 / Math.max(100, body.element.length ** 2);
      body.x += sign * error.x / denom;
      body.y += sign * error.y / denom;
      // For the screen-coordinate convention dR/dθ = (r.y, -r.x).
      body.angle += sign * (r.y * error.x - r.x * error.y) * inertia / denom / DEG;
      refreshAll();
    };
    for (let pass = 0; pass < (joints.length ? 180 : 1); pass++) {
      for (const joint of joints) {
        const { a, b } = endpoints(joint);
        if (!a || !b) continue;
        const ba = rootBody(joint.a.elementId), bb = rootBody(joint.b.elementId);
        const type = joint.type || (joint.a.point === 'curve' || joint.b.point === 'curve' ? 'point-path' : 'revolute');
        if (jointHasAngle(joint) || Math.abs(limitError(joint)) > EPS) {
          const pa = poses[joint.a.elementId], pb = poses[joint.b.elementId];
          let error = wrapAngle(pb.angle - pa.angle - (joint.value || 0));
          if (type === 'revolute') error = limitError(joint);
          const wa = immobile(ba) ? 0 : 1, wb = immobile(bb) ? 0 : 1;
          if (wa + wb && ba !== bb) {
            if (wa) ba.angle += error * wa / (wa + wb);
            if (wb) bb.angle -= error * wb / (wa + wb);
            refreshAll();
          }
          if (['parallel', 'angle'].includes(type)) continue;
        }
        const weight = (body, point) => {
          if (immobile(body)) return 0;
          return 1 + (type === 'prismatic' || ['bearing', 'node'].includes(body.element.type) ? 0 : 4 * ((point.x - body.x) ** 2 + (point.y - body.y) ** 2) / Math.max(100, body.element.length ** 2));
        };
        const current = endpoints(joint);
        const denom = weight(ba, current.a) + weight(bb, current.b);
        if (denom < EPS || ba === bb) continue;
        const error = { x: current.b.x - current.a.x, y: current.b.y - current.a.y };
        if (type === 'distance') {
          const length = Math.hypot(error.x, error.y);
          const scale = (length - (joint.value || 0)) / (length || 1);
          if (length < EPS) { error.x = -(joint.value || 0); error.y = 0; }
          else { error.x *= scale; error.y *= scale; }
        }
        adjust(ba, current.a, error, 1, denom, type !== 'prismatic');
        adjust(bb, current.b, error, -1, denom, type !== 'prismatic');
      }
      for (const body of bodies.values()) {
        if (body.element.type !== 'bearing' || !body.element.slotId) continue;
        if (immobile(body) || body.element.parentId) continue;
        const path = poses[body.element.slotId]?.path;
        if (!path) continue;
        const nearest = nearestOnPath({ x: body.x, y: body.y }, path);
        body.x = nearest.x; body.y = nearest.y; refreshAll();
      }
      if (pass % 3 === 0 && joints.every((joint) => {
        const { a, b } = endpoints(joint);
        if (!a || !b) return true;
        const type = joint.type || (joint.a.point === 'curve' || joint.b.point === 'curve' ? 'point-path' : 'revolute');
        const positionError = type === 'distance' ? Math.abs(distance(a, b) - (joint.value || 0)) : ['parallel', 'angle'].includes(type) ? 0 : distance(a, b);
        const angleError = jointHasAngle(joint) ? Math.abs(wrapAngle(poses[joint.b.elementId].angle - poses[joint.a.elementId].angle - (joint.value || 0))) : Math.abs(limitError(joint));
        return positionError < 0.0001 && angleError < 0.0001;
      })) break;
    }
    let positionResidual = 0, angularResidual = 0;
    for (const joint of joints) {
      const { a, b } = endpoints(joint);
      if (!a || !b) { issues.push('Väzba odkazuje na neexistujúci uzol.'); continue; }
      const type = joint.type || (joint.a.point === 'curve' || joint.b.point === 'curve' ? 'point-path' : 'revolute');
      const positionError = type === 'distance' ? Math.abs(distance(a, b) - (joint.value || 0)) : ['angle', 'parallel'].includes(type) ? 0 : distance(a, b);
      const angleError = jointHasAngle(joint)
        ? Math.abs(wrapAngle(poses[joint.b.elementId].angle - poses[joint.a.elementId].angle - (joint.value || 0))) : Math.abs(limitError(joint));
      const error = Math.max(positionError, angleError);
      positionResidual = Math.max(positionResidual, positionError);
      angularResidual = Math.max(angularResidual, angleError);
      if (error > TOLERANCE) {
        invalid.push(joint.a.elementId, joint.b.elementId);
        issues.push(`Väzba „${joint.name}“: odchýlka polohy ${positionError.toFixed(2)} mm, uhla ${angleError.toFixed(2)}°. Skontrolujte uloženie a rozmery.`);
      }
    }
    for (const body of bodies.values()) {
      if (body.element.type !== 'bearing' || !body.element.slotId) continue;
      const slot = project.elements.find((e) => e.id === body.element.slotId);
      const width = slot?.primary ? project.parameters.slotWidth : slot?.slotWidth;
      if (!slot) { issues.push(`Ložisko „${body.element.name}“ nemá platnú vodiacu drážku.`); invalid.push(body.element.id); }
      const path = poses[slot?.id]?.path;
      if (path) {
        const error = nearestOnPath(poses[body.element.id].a, path).distance;
        positionResidual = Math.max(positionResidual, error);
        if (error > TOLERANCE) {
          invalid.push(body.element.id, slot.id);
          issues.push(`Vedenie ložiska „${body.element.name}“: odchýlka ${error.toFixed(2)} mm.`);
        }
      }
      if (options.collisions !== false && slot && body.element.radius * 2 > width) { issues.push(`Ložisko „${body.element.name}“ je širšie ako drážka.`); invalid.push(body.element.id, slot.id); }
    }
    for (const body of bodies.values()) {
      if (body.element.type === 'panel' && !body.element.localC && body.element.bearingOffset > body.element.length) { issues.push(`Vodiaci bod leží mimo čela „${body.element.name}“.`); invalid.push(body.element.id); }
      if (body.element.type === 'slot' && body.element.curveKind === 'arc' && distance(body.path[0], body.path.at(-1)) > body.element.curveRadius * 2 + EPS) { issues.push(`Polomer kulisy „${body.element.name}“ je príliš malý.`); invalid.push(body.element.id); }
    }
    return { residual: Math.max(positionResidual, angularResidual), positionResidual, angularResidual };
  }

  function elasticMount(project, element, key) {
    const explicit = element[key === 'a' ? 'mountA' : 'mountB'];
    if (explicit) return explicit;
    const joint = project.connections.find((j) => (j.a.elementId === element.id && j.a.point === key) || (j.b.elementId === element.id && j.b.point === key));
    return joint ? (joint.a.elementId === element.id ? joint.b : joint.a) : null;
  }

  function elasticGraph(project, poses) {
    const elastic = project.elements.filter(isElastic), ports = new Map(), parent = new Map(), mounts = [];
    const key = (r) => `${r.elementId}:${r.point}`;
    for (const e of elastic) {
      let body = e; const host = poses[e.parentId];
      if (host) { const origin = host[e.parentPoint || 'a'] || host.a, offset = rotate({ x: e.x, y: e.y }, host.angle); body = { ...e, x: origin.x + offset.x, y: origin.y + offset.y, angle: e.angle + host.angle }; }
      const base = bodyPose(body, 0, project);
      for (const point of ['a', 'b']) { const id = key({ elementId: e.id, point }); ports.set(id, { id, elementId: e.id, point, at: base[point] }); parent.set(id, id); }
    }
    const root = (id) => { let current = id; while (parent.get(current) !== current) current = parent.get(current); return current; };
    const connect = (a, b) => {
      const x = key(a), y = key(b);
      if (ports.has(x) && ports.has(y)) { const ra = root(x), rb = root(y); if (ra !== rb) parent.set(ra > rb ? ra : rb, ra > rb ? rb : ra); }
      else if (ports.has(x)) mounts.push({ port: x, ref: b }); else if (ports.has(y)) mounts.push({ port: y, ref: a });
    };
    for (const e of elastic) for (const point of ['a', 'b']) { const r = e[point === 'a' ? 'mountA' : 'mountB']; if (r) connect({ elementId: e.id, point }, r); }
    for (const j of project.connections) if (j.type === 'revolute' || !j.type) connect(j.a, j.b);
    const groups = new Map();
    for (const port of ports.values()) { const id = root(port.id); if (!groups.has(id)) groups.set(id, { id, ports: [], anchors: [] }); groups.get(id).ports.push(port); }
    for (const mount of mounts) { const group = groups.get(root(mount.port)); if (!group.anchors.some((r) => key(r) === key(mount.ref))) group.anchors.push(mount.ref); }
    for (const group of groups.values()) {
      group.at = group.anchors.map((r) => poses[r.elementId]?.[r.point]).find((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y)) || { x: group.ports.reduce((s, p) => s + p.at.x, 0) / group.ports.length, y: group.ports.reduce((s, p) => s + p.at.y, 0) / group.ports.length };
      group.mass = group.ports.reduce((sum, p) => sum + (elastic.find((e) => e.id === p.elementId).tipMass || .1), 0);
    }
    return { groups: [...groups.values()], ports: Object.fromEntries([...ports.keys()].map((id) => [id, root(id)])) };
  }

  function pistonGeometry(element, shownLength = null) {
    const stroke = element.maxLength - element.minLength, eye = Math.min(element.diameter * .4, element.minLength * .08), overlap = Math.max(element.rodDiameter, eye), cylinder = element.minLength - 2 * eye;
    return { stroke, eye, overlap, cylinder: shownLength == null ? cylinder : Math.max(cylinder, (shownLength - eye + overlap) / 2), fits: cylinder >= stroke + overlap - TOLERANCE };
  }

  function resizePiston(element, length) {
    if (!element.type.startsWith('piston-') || !Number.isFinite(length) || length < 1 || length > 5000) throw new Error('Dĺžka piesta musí byť 1 až 5000 mm.');
    const ratio = Math.max(.6, Math.min(.85, element.minLength / element.maxLength));
    const next = { ...element, length, maxLength: length, restLength: length, minLength: length * ratio };
    if (!pistonGeometry(next).fits) {
      const margin = Math.max(element.rodDiameter, element.diameter * .4);
      next.minLength = Math.min(length * .9, (length + 3 * margin) / 2);
    }
    if (!pistonGeometry(next).fits) throw new Error('Piest je príliš krátky pre zadaný priemer a tyč. Zväčšite dĺžku alebo zmenšite priemery.');
    Object.assign(element, { length: next.length, maxLength: next.maxLength, restLength: element.type === 'piston-pull' ? next.minLength : next.restLength, minLength: next.minLength });
    return element;
  }

  // A new attachment defines the construction length. Runtime motion never changes it.
  function fitMountedPistons(project, ids = null, motion = driveRange(project).min) {
    const result = solve(project, motion, { design: true, collisions: false, forces: false });
    for (const e of project.elements.filter((e) => e.type.startsWith('piston-') && (!ids || ids.includes(e.id)))) {
      const pose = result.poses[e.id];
      if (!pose || pose.length < 1 || (!elasticMount(project, e, 'a') && !elasticMount(project, e, 'b'))) continue;
      if (pose.length > e.maxLength + TOLERANCE || pose.length < e.minLength - TOLERANCE || !pistonGeometry(e).fits) {
        e.x = pose.a.x; e.y = pose.a.y; e.angle = pose.angle;
        resizePiston(e, pose.length);
      }
    }
    return project;
  }

  function fitElasticRanges(project, ids = null, result = null) {
    result ||= solve(project, driveRange(project).min, { design: true, collisions: false, forces: false });
    for (const e of project.elements.filter((e) => isElastic(e) && e.rangeMode !== 'manual' && (!ids || ids.includes(e.id)))) {
      const pose = result.poses[e.id], length = pose?.length;
      if (!(length >= 1) || length > 5000 || ![elasticMount(project, e, 'a'), elasticMount(project, e, 'b')].some(Boolean)) continue;
      if (e.type.startsWith('piston-')) { if (length > e.maxLength + TOLERANCE || length < e.minLength - TOLERANCE || !pistonGeometry(e).fits) { e.x = pose.a.x; e.y = pose.a.y; e.angle = pose.angle; resizePiston(e, length); } }
      else if (length > e.maxLength + TOLERANCE || length < e.minLength - TOLERANCE) {
        if (e.forceMode !== 'stiffness') {
          const stroke = e.type === 'spring-compression' ? e.restLength - e.minLength : e.maxLength - e.restLength;
          e.stiffness = stroke > EPS ? Math.max(0, e.force - (e.type === 'spring-extension' ? e.preload : 0)) / stroke : 0; e.forceMode = 'stiffness';
        }
        e.maxLength = Math.max(e.maxLength, Math.min(5000, length * 1.1));
        e.minLength = Math.min(e.minLength, Math.max(.1, length * .8));
      }
    }
    return project;
  }

  function solveElastic(project, poses, issues, invalid, options) {
    const graph = elasticGraph(project, poses), positions = {};
    for (const group of graph.groups) {
      const dynamic = options.elasticPositions?.[group.id], at = !group.anchors.length && dynamic && [dynamic.x, dynamic.y].every(Number.isFinite) ? dynamic : group.at;
      positions[group.id] = at;
      for (const r of group.anchors) { const p = poses[r.elementId]?.[r.point]; if (!p || ![p.x, p.y].every(Number.isFinite) || distance(p, at) > TOLERANCE) { issues.push('Spoločný montážny bod pružiny alebo piesta má nezhodné uloženie.'); invalid.push(...group.ports.map((r) => r.elementId)); } }
    }
    for (const e of project.elements.filter(isElastic)) {
      const a = positions[graph.ports[`${e.id}:a`]], b = positions[graph.ports[`${e.id}:b`]], length = distance(a, b);
      poses[e.id] = { a: { ...a }, b: { ...b }, length, angle: angleOf(a, b), mountA: elasticMount(project, e, 'a'), mountB: elasticMount(project, e, 'b') };
      if (!options.design && (length < e.minLength - (options.strokeTolerance||TOLERANCE) || length > e.maxLength + (options.strokeTolerance||TOLERANCE))) { issues.push(`„${e.name}“ prekračuje dĺžkový rozsah ${e.minLength}–${e.maxLength} mm (aktuálne ${length.toFixed(1)} mm).`); invalid.push(e.id); }
    }
  }

  function solve(project, motion, options = {}) {
    const p = project.parameters, range = driveRange(project);
    const s = clamp(Number.isFinite(motion) ? motion : range.min, range.min, range.max);
    const poses = Object.create(null), issues = [], collisions = [], invalid = [];
    let angle = 0, residual = 0, displacement = s, profile = null, details = null;
    if (projects.has(project.kind)) {
      details = projects.get(project.kind).solve(project, s, options);
      Object.assign(poses, details.poses);
      angle = details.angle; residual = details.residual;
      displacement = details.displacement; profile = details.profile;
      issues.push(...details.issues); collisions.push(...details.collisions); invalid.push(...details.invalid);
    } else if (project.kind === 'drawer') {
      profile = options.profile || slotProfile(project);
      const pivot = { x: p.frameLength + s + p.panelOffsetX, y: p.pivotY };
      const expected = designAngle(p, s);
      const minAngle = Math.min(p.closedAngle, p.openAngle), maxAngle = Math.max(p.closedAngle, p.openAngle);
      const candidates = circlePathIntersections(pivot, p.bearingOffset, profile.points)
        .map((v) => ({ ...v, angle: angleOf(pivot, v) }))
        .filter((v) => v.angle >= minAngle - 0.001 && v.angle <= maxAngle + 0.001)
        .sort((a, b) => Math.abs(a.angle - expected) - Math.abs(b.angle - expected));
      angle = candidates[0]?.angle ?? expected;
      if (!candidates.length) {
        let best = Infinity;
        for (let i = 0; i <= 180; i++) {
          const a = lerp(minAngle, maxAngle, i / 180);
          const d = nearestOnPath(along(pivot, p.bearingOffset, a), profile.points).distance;
          if (d < best) { best = d; angle = a; }
        }
        residual = best;
        issues.push(`Ložisko nedosiahne kulisu pri posuve ${s.toFixed(1)} mm.`);
        invalid.push('panel-1', 'bearing-1', 'slot-1');
      }
      const bearing = along(pivot, p.bearingOffset, angle);
      const tip = along(pivot, p.panelLength, angle);
      residual = Math.max(residual, nearestOnPath(bearing, profile.points).distance);
      poses['frame-1'] = { a: { x: 0, y: p.pivotY }, b: { x: p.frameLength, y: p.pivotY }, angle: 0, length: p.frameLength };
      poses['rail-1'] = { a: { x: s, y: p.pivotY }, b: pivot, c: pivot, angle: 0, length: p.frameLength };
      poses['panel-1'] = { a: pivot, b: tip, c: bearing, angle, length: p.panelLength };
      poses['slot-1'] = { a: profile.points[0], b: profile.points.at(-1), path: profile.points, angle: 0, length: 0 };
      poses['bearing-1'] = { a: bearing, b: bearing, angle: 0, length: 0 };
      poses['bearing-2'] = { a: pivot, b: pivot, angle: 0, length: 0 };
      if (profile.invalid) { issues.push('Polomer oblúka je menší ako polovica vzdialenosti jeho koncových bodov.'); invalid.push('slot-1'); }
      if (p.bearingOffset > p.panelLength) { issues.push('Ložisko leží mimo čelnej dosky.'); invalid.push('panel-1', 'bearing-1'); }
      if (options.collisions !== false && p.bearingRadius * 2 > p.slotWidth) { issues.push('Priemer ložiska prekračuje šírku drážky.'); collisions.push('bearing-1', 'slot-1'); }
      if (options.collisions !== false) {
        const top = p.pivotY - p.frameHeight;
        const walls = [{ x: -12, y: top, w: 12, h: p.frameHeight + 18 }, { x: 0, y: top - 12, w: p.frameLength - 18, h: 12 }];
        if (walls.some((r) => segmentRect(pivot, tip, r, p.panelThickness / 2))) {
          issues.push('Čelná doska koliduje s korpusom.'); collisions.push('panel-1', 'frame-1');
        }
      }
    } else if (project.kind === 'fourbar') {
      const a = { x: 40, y: 120 }, d = { x: 40 + p.groundLength, y: 120 }, b = along(a, p.crankLength, s);
      // Keep the same assembly branch throughout rotation instead of switching by screen height.
      const side = (v) => (d.x - b.x) * (v.y - b.y) - (d.y - b.y) * (v.x - b.x);
      const candidates = circleIntersections(b, p.couplerLength, d, p.rockerLength).sort((v, w) => side(v) - side(w));
      const c = candidates[0] || along(d, p.rockerLength, 110);
      if (!candidates.length) { issues.push('Dĺžky ramien neumožňujú uzavretie reťazca v tejto polohe.'); residual = Math.abs(distance(b, c) - p.couplerLength); invalid.push('coupler-1', 'output-1'); }
      angle = angleOf(d, c);
      displacement = 0;
      poses['frame-1'] = { a, b: d, angle: 0, length: p.groundLength };
      poses['input-1'] = { a, b, angle: s, length: p.crankLength };
      poses['coupler-1'] = { a: b, b: c, angle: angleOf(b, c), length: p.couplerLength };
      poses['output-1'] = { a: d, b: c, angle, length: p.rockerLength };
    } else if (project.kind === 'crank') {
      const a = { x: 30, y: 120 }, b = along(a, p.crankLength, s);
      const dy = p.sliderY - b.y;
      const c = { x: b.x + Math.sqrt(Math.max(0, p.rodLength ** 2 - dy ** 2)), y: p.sliderY };
      if (Math.abs(dy) > p.rodLength) { issues.push('Ojnica nedosiahne os lineárneho vedenia.'); residual = Math.abs(dy) - p.rodLength; invalid.push('coupler-1', 'piston-1'); }
      angle = angleOf(b, c); displacement = c.x - a.x;
      poses['frame-1'] = { a, b: a, angle: 0, length: 0 };
      poses['input-1'] = { a, b, angle: s, length: p.crankLength };
      poses['coupler-1'] = { a: b, b: c, angle, length: p.rodLength };
      poses['rail-1'] = { a: { x: 85, y: p.sliderY }, b: { x: 335, y: p.sliderY }, c, angle: 0, length: 250 };
      poses['piston-1'] = { a: c, b: c, angle: 0, length: 0 };
    }
    const required = projects.has(project.kind) ? Object.keys(projects.get(project.kind).types)
      : project.kind === 'drawer' ? ['frame-1', 'rail-1', 'slot-1', 'panel-1', 'bearing-1']
      : project.kind === 'fourbar' ? ['frame-1', 'input-1', 'coupler-1', 'output-1']
      : project.kind === 'crank' ? ['frame-1', 'input-1', 'coupler-1', 'rail-1', 'piston-1'] : [];
    if (required.some((id) => !project.elements.some((e) => e.id === id))) issues.push('Mechanizmus nie je kompletný. Obnovte chýbajúci prvok alebo vytvorte vlastný projekt.');
    for (const e of project.elements) if (e.type === 'rail' && poses[e.id]?.c) Object.assign(poses[e.id], carriageGeometry(e, poses[e.id]));
    const extraErrors = solveExtras(project, s, poses, issues, invalid, options);
    const positionResidual = Math.max(residual, extraErrors.positionResidual), angularResidual = extraErrors.angularResidual;
    residual = Math.max(residual, extraErrors.residual);
    solveElastic(project, poses, issues, invalid, options);
    if (project.kind === 'custom') {
      const output = [...project.elements].reverse().find((e) => ['link', 'panel'].includes(e.type) && !e.drive) || project.elements.find((e) => e.drive && ['link', 'panel'].includes(e.type));
      angle = output ? poses[output.id].angle : 0;
      const rail = project.elements.find((e) => e.type === 'rail' && e.drive);
      displacement = rail ? distance(poses[rail.id].a, poses[rail.id].c) : 0;
    }
    if (options.collisions !== false) {
      const links = project.elements.filter((e) => ['link', 'panel'].includes(e.type) && poses[e.id]);
      for (let i = 0; i < links.length; i++) {
        for (let j = i + 1; j < links.length; j++) {
          if(links[i].plane!==links[j].plane)continue;
          const a = poses[links[i].id], b = poses[links[j].id];
          const hit = segmentIntersection(a.a, a.b, b.a, b.b);
          if (hit && hit.t > 0.025 && hit.t < 0.975 && hit.u > 0.025 && hit.u < 0.975) {
            collisions.push(links[i].id, links[j].id);
            issues.push(`Kríženie členov „${links[i].name}“ a „${links[j].name}“.`);
          }
        }
      }
      const slots = project.elements.filter((e) => e.type === 'slot');
      for (const bearing of project.elements.filter((e) => !e.primary && e.type === 'bearing' && e.slotId)) {
        const slot = slots.find((s) => s.id === bearing.slotId);
        if (slot && bearing.radius * 2 > (slot.primary ? p.slotWidth : slot.slotWidth)) collisions.push(bearing.id, slot.id);
      }
      if (project.kind === 'drawer') {
        const top = p.pivotY - p.frameHeight;
        const walls = [{ x: -12, y: top, w: 12, h: p.frameHeight + 18 }, { x: 0, y: top - 12, w: p.frameLength - 18, h: 12 }];
        for (const e of links.filter((e) => !e.primary)) {
          const pose = poses[e.id];
          if (walls.some((r) => segmentRect(pose.a, pose.b, r, e.width / 2))) {
            collisions.push(e.id, 'frame-1'); issues.push(`Prvok „${e.name}“ koliduje s korpusom.`);
          }
        }
      }
    }
    if (!options.design) for (const e of project.elements.filter((e) => e.type === 'rail' && e.drive && !e.primary)) { const pose = poses[e.id], local = localPoint(pose, pose.c).x; if (local < -TOLERANCE || local > e.length + TOLERANCE) { issues.push(`Vozík „${e.name}“ je mimo mechanického rozsahu vedenia.`); invalid.push(e.id); } }
    const result = { ...details, motion: s, angle, displacement, poses, profile, residual, positionResidual, angularResidual, issues: [...new Set(issues)], collisions: [...new Set(collisions)], invalid: [...new Set(invalid)], blocked: issues.length > 0, range };
    if (global.KinmoPhysics && options.forces !== false) result.forces = global.KinmoPhysics.forces(project, result);
    return result;
  }

  function sample(project, count = 121, options = {}) {
    count = Number.isFinite(count) ? clamp(Math.round(count), 2, 1001) : 121;
    const range = driveRange(project);
    const profile = prepareProject(project);
    return Array.from({ length: count }, (_, i) => solve(project, lerp(range.min, range.max, i / (count - 1)), { ...options, profile }));
  }

  function point(pose, reference) { return pose.poses[reference?.elementId]?.[reference?.point || 'b'] || null; }

  function inverseDrive(project, target, fraction = 1, options = {}) {
    const range = driveRange(project);
    const solverOptions = { ...options, profile: options.profile || prepareProject(project) };
    const cost = (s) => {
      const result = solve(project, s, solverOptions);
      const panel = result.poses[options.elementId || 'panel-1'];
      if (!panel) return Infinity;
      const p = options.point && panel[options.point] ? panel[options.point]
        : { x: lerp(panel.a.x, panel.b.x, fraction), y: lerp(panel.a.y, panel.b.y, fraction) };
      return distance(target, p);
    };
    let best = range.min, error = Infinity;
    for (let i = 0; i <= 50; i++) {
      const s = lerp(range.min, range.max, i / 50), e = cost(s);
      if (e < error) { best = s; error = e; }
    }
    let left = Math.max(range.min, best - (range.max - range.min) / 50), right = Math.min(range.max, best + (range.max - range.min) / 50);
    for (let i = 0; i < 14; i++) {
      const a = left + (right - left) / 3, b = right - (right - left) / 3;
      if (cost(a) < cost(b)) right = b; else left = a;
    }
    return (left + right) / 2;
  }

  function bounds(project, results) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const add = (point) => {
      if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return;
      minX = Math.min(minX, point.x); minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x); maxY = Math.max(maxY, point.y);
    };
    for (const [index, result] of results.entries()) {
      for (const element of project.elements) {
        const pose = result.poses[element.id];
        if (!pose || !element.visible) continue;
        for (const key of pointKeys(element)) if (pose[key]) add(pose[key]);
        if (pose.path && (index === 0 || result.referenceOrigin)) pose.path.forEach(add);
        if (pose.outline) pose.outline.forEach(add);
        if (pose.carriageOutline) pose.carriageOutline.forEach(add);
      }
    }
    if (projects.has(project.kind)) projects.get(project.kind).bounds(project).forEach(add);
    if (project.kind === 'drawer') {
      add({ x: -12, y: project.parameters.pivotY - project.parameters.frameHeight - 12 });
      add({ x: project.parameters.frameLength + project.parameters.travelMax, y: project.parameters.pivotY + 115 });
    }
    if (!Number.isFinite(minX)) return { x: -40, y: -100, width: 700, height: 380 };
    return { x: minX - 75, y: minY - 75, width: Math.max(480, maxX - minX + 150), height: Math.max(330, maxY - minY + 160) };
  }

  function validateProject(input) {
    if (!input || typeof input !== 'object' || input.version !== 1 || !KINDS.includes(input.kind)) throw new Error('Nepodporovaný formát projektu. Očakáva sa projekt Kinematika vo verzii 1.');
    if (!Array.isArray(input.elements) || input.elements.length > 120 || !Array.isArray(input.connections) || input.connections.length > 240) throw new Error('Neplatná štruktúra alebo príliš veľký projekt.');
    const number = (value, fallback, min = -5000, max = 5000) => {
      const n = value === undefined ? fallback : value;
      if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max) throw new Error('Projekt obsahuje neplatný rozmer alebo uhol.');
      return n;
    };
    const text = (v, fallback, max = 100) => typeof v === 'string' ? v.slice(0, max) : fallback;
    const definition = projects.get(input.kind);
    const p = {};
    for (const [key, fallback] of Object.entries({ ...defaults, ...definition?.defaults })) p[key] = typeof fallback === 'number' ? number(input.parameters?.[key], fallback) : text(input.parameters?.[key], fallback);
    if (!CURVES.includes(p.curveKind) || p.travelMin < 0 || p.travelMax <= p.travelMin || p.rotationMax <= p.rotationMin || p.panelLength <= 0 || p.bearingOffset <= 0 || p.bearingRadius <= 0 || p.slotWidth <= 0 || p.frameLength <= 0 || p.frameLength + p.panelOffsetX <= 0 || p.frameHeight <= 0 || p.panelThickness <= 0 || p.curveRadius <= 0 || p.smoothness <= 0 || p.openAngle < -180 || p.closedAngle > 180 || p.closedAngle <= p.openAngle || [p.groundLength, p.crankLength, p.couplerLength, p.rockerLength, p.rodLength].some((v) => v <= 0)) throw new Error('Rozmery musia byť kladné a pohybové limity správne zoradené.');
    if (definition) definition.validate(p);
    const vector = (v) => ({ x: number(v?.x, 0), y: number(v?.y, 0) });
    const controls = (v, kind = 'bezier') => {
      const min = kind === 'spline' ? 4 : 2, max = kind === 'polyline' ? 1001 : 32;
      if (!Array.isArray(v) || v.length < min || v.length > max) throw new Error(`Krivka musí mať ${min} až ${max} bodov.`);
      return v.map((point) => ({ x: number(point?.x, 0), y: number(point?.y, 0) }));
    };
    const ids = new Set();
    const elements = input.elements.map((e) => {
      if (!e || !TYPES.includes(e.type) || typeof e.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(e.id) || ['constructor', 'prototype', '__proto__'].includes(e.id) || ids.has(e.id)) throw new Error('Projekt obsahuje neplatný alebo duplicitný prvok.');
      ids.add(e.id);
      const base = makeElement(e.type);
      const normalized = { ...base, id: e.id, type: e.type, name: text(e.name, base.name), role: text(e.role, ''), primary: input.kind !== 'custom' && !!e.primary, locked: !!e.locked, drive: !!e.drive, visible: e.visible !== false, slotId: text(e.slotId, '', 100) };
      for (const key of ['x', 'y', 'angle', 'length', 'width', 'radius', 'stroke', 'slotWidth', 'bearingOffset', 'curveRadius']) normalized[key] = number(e[key], base[key]);
      normalized.carriageOffset = number(e.carriageOffset, 0, -5000, 5000);
      normalized.movingRail = e.type === 'rail' && !normalized.primary && !!e.movingRail;
      normalized.carriageWidth = number(e.carriageWidth, 24, .1, 5000);
      normalized.carriageHeight = number(e.carriageHeight, 30, .1, 5000);
      normalized.camShape = e.camShape === 'pear' ? 'pear' : 'harmonic';
      normalized.camNoseRatio = number(e.camNoseRatio, .4, .1, 1);
      normalized.camLift = number(e.camLift, base.camLift, 0, 5000);
      normalized.camPhase = number(e.camPhase, 0, -360, 360);
      if (normalized.length <= 0 || normalized.width <= 0 || normalized.radius <= 0 || normalized.stroke <= 0 || normalized.slotWidth <= 0 || normalized.bearingOffset <= 0 || normalized.curveRadius <= 0) throw new Error('Rozmery prvkov musia byť kladné.');
      normalized.curveKind = CURVES.includes(e.curveKind) ? e.curveKind : 'bezier';
      normalized.controls = e.controls ? controls(e.controls, normalized.curveKind) : base.controls;
      normalized.curveSide = number(e.curveSide, 1, -1, 1);
      if (![1, -1].includes(normalized.curveSide)) throw new Error('Strana oblúka musí byť +1 alebo −1.');
      normalized.curveSemicircle = !!e.curveSemicircle;
      if (normalized.curveSemicircle && (e.type !== 'slot' || normalized.curveKind !== 'arc' || normalized.controls.length !== 2 || Math.abs(distance(normalized.controls[0], normalized.controls[1]) - 2 * normalized.curveRadius) > .000001)) throw new Error('Polkruh musí mať dva konce tetivy so vzdialenosťou 2R.');
      normalized.localC = e.localC == null ? null : vector(e.localC);
      normalized.parentId = text(e.parentId, '', 100);
      normalized.parentPoint = ['a', 'b', 'c', 'ct', 'cb'].includes(e.parentPoint) ? e.parentPoint : 'a';
      normalized.driveMode = e.driveMode === 'linear' || e.type === 'rail' ? 'linear' : 'rotary';
      if (e.type === 'cam' && normalized.driveMode !== 'rotary') throw new Error('Rotačná vačka vyžaduje otočný pohon.');
      normalized.driveAngle = number(e.driveAngle, 0, -360, 360);
      normalized.drivePivot = ['a', 'b', 'c'].includes(e.drivePivot) ? e.drivePivot : 'a';
      normalized.driveSpeed = e.driveSpeed == null ? null : number(e.driveSpeed, 0, -10000, 10000);
      normalized.color = /^#[0-9a-fA-F]{6}$/.test(e.color || '') ? e.color : '';
      if (e.type === 'node' && normalized.drive && normalized.driveMode !== 'linear') throw new Error('Samostatný bod môže mať iba lineárny pohon.');
      if (normalized.drivePivot === 'c' && e.type !== 'panel') throw new Error('Pohon odkazuje na neplatný otočný bod.');
      if (normalized.drivePivot === 'b' && ['node', 'bearing', 'cam'].includes(e.type)) throw new Error('Pohon odkazuje na neplatný otočný bod.');
      normalized.mass = number(e.mass, base.mass, 0, 100000);
      normalized.inertia = number(e.inertia, 0, 0, 1000000);
      normalized.com = e.com == null ? null : vector(e.com);
      normalized.guideOnly = !!e.guideOnly;
      normalized.group = text(e.group,'',60); normalized.plane = number(e.plane,0,-20,20); normalized.guideFriction=number(e.guideFriction,0,0,10000);
      if (e.outline != null && (!Array.isArray(e.outline) || (e.outline.length && e.outline.length < 3) || e.outline.length > 64)) throw new Error('Obrys telesa musí mať 3 až 64 vrcholov.');
      normalized.outline = (e.outline || []).map(vector);
      for (const key of ['restLength', 'minLength', 'maxLength', 'diameter', 'rodDiameter', 'wireDiameter']) normalized[key] = number(e[key], base[key], key === 'wireDiameter' ? 0.01 : 0.1, 5000);
      for (const key of ['force', 'stiffness', 'preload', 'damping']) normalized[key] = number(e[key], base[key], 0, 1000000);
      normalized.actuatorMode = e.actuatorMode === 'damper' ? 'damper' : 'gas'; normalized.tipMass = number(e.tipMass, .1, .001, 1000);
      normalized.rangeMode = e.rangeMode === 'manual' ? 'manual' : 'auto';
      normalized.dampingCompression = e.dampingCompression == null ? null : number(e.dampingCompression, 0, 0, 1000000); normalized.dampingExtension = e.dampingExtension == null ? null : number(e.dampingExtension, 0, 0, 1000000);
      normalized.progression = number(e.progression, 1, 1, 3);
      normalized.forceMode = e.forceMode === 'stiffness' ? 'stiffness' : 'rated';
      normalized.mountA = e.mountA || null; normalized.mountB = e.mountB || null;
      if (isElastic(e) && (normalized.minLength >= normalized.maxLength || normalized.restLength < normalized.minLength || normalized.restLength > normalized.maxLength || (e.type.startsWith('piston-') && normalized.rodDiameter >= normalized.diameter))) throw new Error('Skontrolujte minimálnu, voľnú a maximálnu dĺžku; tyč piesta musí byť užšia ako valec.');
      if (e.type.startsWith('spring-') && (normalized.wireDiameter * 2 >= normalized.diameter || (e.type === 'spring-compression' && normalized.restLength <= normalized.minLength) || (e.type === 'spring-extension' && (normalized.restLength >= normalized.maxLength || (normalized.forceMode === 'rated' && normalized.force < normalized.preload))))) throw new Error('Pružina musí mať nenulový pracovný zdvih, platný priemer drôtu a menšie predpätie ako maximálnu silu.');
      if (isElastic(e) && normalized.drive) throw new Error('Pružina ani piest nie sú predpísaný kinematický pohon. Pripojte ich medzi montážne body.');
      return normalized;
    });
    const points = ['a', 'b', 'c', 'ct', 'cb', 'curve'];
    const primaryTypes = definition?.types || {
      drawer: { 'frame-1': 'ground', 'rail-1': 'rail', 'slot-1': 'slot', 'panel-1': 'panel', 'bearing-1': 'bearing', 'bearing-2': 'bearing' },
      fourbar: { 'frame-1': 'ground', 'input-1': 'link', 'coupler-1': 'link', 'output-1': 'link' },
      crank: { 'frame-1': 'ground', 'input-1': 'link', 'coupler-1': 'link', 'rail-1': 'rail', 'piston-1': 'bearing' },
      custom: {},
    }[input.kind];
    for (const [id, type] of Object.entries(primaryTypes)) if (!elements.some((e) => e.id === id && e.type === type && e.primary)) throw new Error('Projektu chýba riadený prvok zvolenej šablóny.');
    for (const e of elements) if (e.primary && primaryTypes[e.id] !== e.type) throw new Error('Projekt obsahuje neznámy riadený prvok.');
    const primaryRoles = definition?.roles || {
      drawer: { 'frame-1': 'frame', 'rail-1': 'rail', 'slot-1': 'slot', 'panel-1': 'panel', 'bearing-1': 'follower', 'bearing-2': 'pivot' },
      fourbar: { 'frame-1': 'frame', 'input-1': 'input', 'coupler-1': 'coupler', 'output-1': 'output' },
      crank: { 'frame-1': 'frame', 'input-1': 'input', 'coupler-1': 'coupler', 'rail-1': 'rail', 'piston-1': 'piston' },
      custom: {},
    }[input.kind];
    for (const e of elements) if (e.primary) { e.role = primaryRoles[e.id]; e.locked = true; }
    const validPoint = (e, key) => pointKeys(e).includes(key) || (key === 'curve' && ['slot', 'rail', 'cam'].includes(e.type));
    const reference = (r, allowWorld = false) => {
      if (allowWorld && r && !r.elementId) return vector(r);
      const e = elements.find((v) => v.id === r?.elementId);
      if (!e || !validPoint(e, r.point) || r.point === 'curve') throw new Error('Neplatný montážny alebo referenčný bod.');
      return { elementId: e.id, point: r.point };
    };
    for (const e of elements) {
      if (e.parentId) {
        const parent = elements.find((v) => v.id === e.parentId);
        if (!parent || e.primary || isElastic(e) || isElastic(parent) || !validPoint(parent, e.parentPoint)) throw new Error('Neplatné pevné pripojenie k nosnému telesu.');
        const seen = new Set([e.id]);
        let current = parent;
        while (current) {
          if (seen.has(current.id)) throw new Error('Nosné telesá nesmú tvoriť cyklus.');
          seen.add(current.id); current = elements.find((v) => v.id === current.parentId);
        }
      }
      if (e.mountA) e.mountA = reference(e.mountA);
      if (e.mountB) e.mountB = reference(e.mountB);
      if ([e.mountA, e.mountB].some((r) => r && (r.elementId === e.id || isElastic(elements.find((v) => v.id === r.elementId))))) throw new Error('Pružné prvky musia byť pripojené k tuhým telesám, nie k sebe.');
    }
    if (input.kind === 'custom' && elements.filter((e) => e.drive).length > 1 && !input.driveProgram) throw new Error('Vlastný model môže mať len jeden nezávislý pohon.');
    const jointIds = new Set();
    const connections = input.connections.map((j) => {
      if (!j || typeof j.id !== 'string' || j.id.length > 100 || jointIds.has(j.id) || !ids.has(j.a?.elementId) || !ids.has(j.b?.elementId) || !points.includes(j.a.point) || !points.includes(j.b.point) || j.a.elementId === j.b.elementId || (j.a.point === 'curve' && j.b.point === 'curve')) throw new Error('Projekt obsahuje neplatnú kĺbovú väzbu.');
      jointIds.add(j.id);
      const ea = elements.find((e) => e.id === j.a.elementId), eb = elements.find((e) => e.id === j.b.elementId);
      if (!validPoint(ea, j.a.point) || !validPoint(eb, j.b.point)) throw new Error('Kĺbová väzba odkazuje na bod, ktorý prvok nemá.');
      const type = j.type || (j.a.point === 'curve' || j.b.point === 'curve' ? 'point-path' : 'revolute');
      if (!CONSTRAINT_TYPES.includes(type) || ((j.a.point === 'curve' || j.b.point === 'curve') && !['point-path', 'prismatic', 'cam-contact'].includes(type)) || (['point-path', 'prismatic', 'cam-contact'].includes(type) && j.a.point !== 'curve' && j.b.point !== 'curve')) throw new Error('Typ väzby nezodpovedá jej uzlom.');
      const guide = j.a.point === 'curve' ? ea : eb, follower = j.a.point === 'curve' ? eb : ea, followerPoint = j.a.point === 'curve' ? j.b.point : j.a.point;
      if (type === 'cam-contact' ? guide.type !== 'cam' || follower.type !== 'bearing' || followerPoint !== 'a' : [j.a, j.b].some((r) => r.point === 'curve' && elements.find((e) => e.id === r.elementId).type === 'cam')) throw new Error('Vačkový kontakt vyžaduje obrys vačky a stred valčekového ložiska. Strednicová väzba nie je kontakt.');
      if (type === 'prismatic' && (j.a.point === 'curve' ? ea : eb).type !== 'rail') throw new Error('Posuvná väzba vyžaduje priame lineárne vedenie.');
      const value = number(j.value, 0, type === 'distance' ? 0 : -360, type === 'distance' ? 5000 : 360);
      if ([ea, eb].some(isElastic) && !['revolute'].includes(type)) throw new Error('Montáž pružného prvku musí používať koncový otočný bod.');
      let limitMin = null, limitMax = null;
      if (j.limitMin != null || j.limitMax != null) {
        if (!['revolute', 'prismatic'].includes(type) || j.limitMin == null || j.limitMax == null) throw new Error('Limity vyžadujú otočný alebo posuvný kĺb a obe hranice.');
        limitMin = number(j.limitMin, 0, type === 'prismatic' ? 0 : -180, type === 'prismatic' ? 5000 : 180);
        limitMax = number(j.limitMax, 0, type === 'prismatic' ? 0 : -180, type === 'prismatic' ? 5000 : 180);
        const guide = j.a.point === 'curve' ? ea : eb;
        if (limitMax <= limitMin || (type === 'prismatic' && !guide.primary && limitMax > guide.length)) throw new Error('Limity musia byť zoradené a ležať v rozsahu vedenia.');
      }
      return { ...(global.KinmoAdvanced?.contact(j.contact)?{contact:global.KinmoAdvanced.contact(j.contact)}:{}), id: j.id, a: { elementId: j.a.elementId, point: j.a.point }, b: { elementId: j.b.elementId, point: j.b.point }, type, value, limitMin, limitMax, builtin: !!j.builtin && ea.primary && eb.primary, name: text(j.name, 'Otočný kĺb') };
    });
    for (const e of elements) if (e.slotId && !elements.some((s) => s.id === e.slotId && s.type === 'slot')) throw new Error('Ložisko odkazuje na neexistujúcu kulisu.');
    const uniqueRecords = (list, limit, normalize, label) => {
      if (list == null) return [];
      if (!Array.isArray(list) || list.length > limit) throw new Error(`Príliš veľa záznamov: ${label}.`);
      const seen = new Set();
      return list.map((v) => {
        if (!v || typeof v.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(v.id) || seen.has(v.id)) throw new Error(`Neplatný identifikátor: ${label}.`);
        seen.add(v.id); return { id: v.id, ...normalize(v) };
      });
    };
    const dimensions = uniqueRecords(input.dimensions, 120, (d) => {
      if (!['distance', 'horizontal', 'vertical', 'angle'].includes(d.type)) throw new Error('Nepodporovaný typ kóty.');
      if (d.constraintId && !connections.some((j) => j.id === d.constraintId && j.type === 'distance')) throw new Error('Riadiaca kóta nemá platnú vzdialenostnú väzbu.');
      let control = null;
      if (d.control) {
        const target = elements.find((e) => e.id === d.control.elementId);
        if (!target || target.primary || !['length', 'stroke'].includes(d.control.property)) throw new Error('Kóta odkazuje na neplatný rozmer prvku.');
        control = { elementId: target.id, property: d.control.property };
      }
      return { type: d.type, a: reference(d.a, true), b: reference(d.b, true), offset: number(d.offset, 25, -500, 500), name: text(d.name, ''), visible: d.visible !== false, constraintId: text(d.constraintId, ''), control };
    }, 'kóty');
    const trajectories = uniqueRecords(input.trajectories, 60, (t) => ({
      name: text(t.name, 'Trajektória'), reference: reference(t.reference),
      space: t.space === 'carrier' && input.kind === 'double-drawer' ? 'carrier' : 'world',
      color: /^#[0-9a-fA-F]{6}$/.test(t.color || '') ? t.color : '#4d9b91', visible: t.visible !== false,
    }), 'trajektórie');
    const simulation = {};
    for (const [key, fallback] of Object.entries(simulationDefaults)) {
      if(key==='softStops')simulation.softStops=!!input.simulation?.softStops;
      else if (key === 'returnOnRelease') simulation.returnOnRelease = input.simulation?.returnOnRelease !== false;
      else if (key === 'mode') simulation.mode = input.simulation?.mode === 'dynamic' ? 'dynamic' : 'kinematic';
      else {
        const negative = ['inputForce', 'initialVelocity'].includes(key);
        simulation[key] = number(input.simulation?.[key], fallback, negative ? -1000000 : key === 'duration' ? 0.1 : 0, key === 'gravity' ? 100 : key === 'duration' ? 120 : 1000000);
      }
    }
    const source = input.source && KINDS.includes(input.source.kind)
      ? { kind: input.source.kind, name: text(input.source.name, ''), motion: number(input.source.motion, 0), note: text(input.source.note, '', 500) } : null;
    let importReference = null, motionPlan = null;
    if (input.importReference != null) {
      const r = input.importReference;
      if (r.kind !== 'magic' || !Array.isArray(r.frames) || !r.frames.length || r.frames.length > 4) throw new Error('Neplatná predloha Magic importu.');
      const frames = r.frames.map((f) => {
        if (typeof f.dataURL !== 'string' || f.dataURL.length > 350000 || !/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(f.dataURL)) throw new Error('Predloha musí byť lokálny raster do 350 kB.');
        return { name: text(f.name, 'Predloha', 120), dataURL: f.dataURL, rect: { x: number(f.rect?.x, 0), y: number(f.rect?.y, 0), width: number(f.rect?.width, 0, .01, 20000), height: number(f.rect?.height, 0, .01, 20000) } };
      });
      importReference = { kind: 'magic', frames, visible: r.visible !== false, opacity: number(r.opacity, .35, .05, 1), active: number(r.active, 0, 0, frames.length - 1) };
      if (!Number.isInteger(importReference.active)) throw new Error('Neplatná poloha predlohy.');
    }
    if (input.motionPlan != null) {
      const plan = input.motionPlan, range = configuredDriveRange({ kind: input.kind, elements, parameters: p });
      if (!Array.isArray(plan.phases) || plan.phases.length > 12 || !['mm', '°'].includes(plan.unit) || plan.unit !== range.unit) throw new Error('Fázy potrebujú jednotku aktuálneho pohonu a najviac 12 krokov.');
      const phases = plan.phases.map((v, i) => ({ name: text(v.name, `Fáza ${i + 1}`, 60), from: number(v.from, range.min, range.min, range.max), to: number(v.to, range.max, range.min, range.max), duration: number(v.duration, 1, .1, 120), easing: v.easing === 'smooth' ? 'smooth' : 'linear' }));
      if (phases.some((v, i) => i && Math.abs(v.from - phases[i - 1].to) > .00001)) throw new Error('Koniec fázy musí nadväzovať na začiatok ďalšej.');
      motionPlan = { unit: plan.unit, phases };
    }
    const driveProgram=global.KinmoAdvanced?.program(input.driveProgram,elements);
    const provenance = definition?.provenance || (source?.kind === 'double-drawer' ? projects.get('double-drawer')?.provenance : null);
    return {
      version: 1, id: text(input.id, uid(), 100), name: text(input.name, 'Importovaný mechanizmus'), kind: input.kind,
      parameters: p, controls: input.controls ? controls(input.controls, p.curveKind) : null, elements, connections, dimensions, trajectories, simulation,
      ...(driveProgram?{driveProgram}:{}), ...(source ? { source } : {}), ...(importReference ? { importReference } : {}), ...(motionPlan ? { motionPlan } : {}), ...(provenance ? { provenance: copy(provenance) } : {}),
    };
  }

  global.Kinematics = Object.freeze({
    DEG, EPS, TOLERANCE, TYPES, KINDS, CURVES, ELASTIC_TYPES, CONSTRAINT_TYPES, defaults, simulationDefaults, clamp, lerp, distance, copy, uid,
    along, angleOf, preset, makeElement, configuredDriveRange, driveRange, railTravel, pistonGeometry, resizePiston, fitMountedPistons, fitElasticRanges, elasticGraph, designAngle, defaultControls, slotProfile,
    bezier, catmull, arcPoints, circleIntersections, circlePathIntersections, nearestOnSegment,
    nearestOnPath, segmentIntersection, segmentRect, solve, sample, point, inverseDrive, bounds, validateProject,
    registerProject, prepareProject, projectPhases, tracePoint,
    rotate, localPoint, worldPoint, isElastic, hasOrientation, bodyPose, genericPath, elasticMount,
    pointKeys, pointName, defaultTracePoint, carriagePoints, carriageGeometry, templateOutlines, pointInPolygon, camProfile, nearestOnCam, validateOutline,
  });
})(globalThis);
