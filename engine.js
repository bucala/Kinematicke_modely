/* Kinematika's position solver. All lengths are millimetres; public angles are degrees. */
(function (global) {
  'use strict';

  const DEG = Math.PI / 180;
  const EPS = 1e-8;
  const TOLERANCE = 0.05;
  const ELASTIC_TYPES = ['spring-compression', 'spring-extension', 'piston-push', 'piston-pull'];
  const TYPES = ['ground', 'rail', 'link', 'slot', 'bearing', 'node', 'panel', ...ELASTIC_TYPES];
  const CONSTRAINT_TYPES = ['revolute', 'prismatic', 'point-path', 'distance', 'fixed', 'parallel', 'angle'];
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
    initialVelocity: 0, duration: 10,
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
  const hasOrientation = (project, reference) => {
    let e = project.elements.find((v) => v.id === reference.elementId);
    while (e?.parentId) e = project.elements.find((v) => v.id === e.parentId);
    return !!e && !['bearing', 'node'].includes(e.type);
  };

  function makeElement(type, x = 150, y = 30) {
    const names = {
      ground: 'Pevný rám', rail: 'Lineárne vedenie', link: 'Tiahlo', slot: 'Zakrivená kulisa', bearing: 'Ložisko', node: 'Uzol', panel: 'Sklápacie čelo',
      'spring-compression': 'Tlačná pružina', 'spring-extension': 'Ťažná pružina', 'piston-push': 'Tlačný piest', 'piston-pull': 'Ťažný piest',
    };
    return {
      id: uid(), type, name: names[type] || 'Prvok', x, y, angle: type === 'panel' ? 90 : 0,
      length: type === 'panel' ? 160 : type === 'rail' ? 240 : 120,
      width: type === 'panel' ? 16 : 12, radius: 6, stroke: 150, carriageOffset: 0, slotWidth: 16,
      bearingOffset: 65, curveKind: 'bezier', curveRadius: 100, visible: true,
      locked: type === 'ground', drive: type === 'rail',
      slotId: '', controls: [{ x: 0, y: 0 }, { x: 45, y: 0 }, { x: 75, y: 70 }, { x: 130, y: 70 }],
      driveMode: ['rail', 'node'].includes(type) ? 'linear' : 'rotary', driveAngle: 0, drivePivot: 'a', driveSpeed: null, color: '',
      parentId: '', parentPoint: 'a', localC: null, outline: [],
      mass: ['ground', 'slot', 'node'].includes(type) || ELASTIC_TYPES.includes(type) ? 0 : type === 'rail' ? 2 : type === 'bearing' ? 0.1 : 1,
      inertia: 0, com: null,
      restLength: 160, minLength: 80, maxLength: 240, diameter: 20,
      rodDiameter: 8, wireDiameter: 2, force: 100, stiffness: 1, preload: 0, forceMode: 'rated',
      damping: 0, progression: 1, mountA: null, mountB: null,
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

  function driveRange(project) {
    const rotary = ['fourbar', 'crank'].includes(project.kind) || (project.kind === 'custom' && project.elements.some((e) => e.drive && ['link', 'panel'].includes(e.type) && e.driveMode !== 'linear'));
    return rotary
      ? { min: project.parameters.rotationMin ?? 0, max: project.parameters.rotationMax ?? 360, unit: '°', label: 'Uhol pohonu' }
      : { min: project.parameters.travelMin, max: project.parameters.travelMax, unit: 'mm', label: 'Posuv výsuvu' };
  }

  function designAngle(p, s) {
    const start = clamp(p.turnStart, p.travelMin, p.travelMax - 0.01);
    const t = clamp((s - start) / (p.travelMax - start), 0, 1);
    const u = t ** clamp(p.smoothness, 0.3, 3);
    return lerp(p.closedAngle, p.openAngle, u * u * (3 - 2 * u));
  }

  function bezier(points, t) {
    const u = 1 - t;
    return {
      x: u ** 3 * points[0].x + 3 * u * u * t * points[1].x + 3 * u * t * t * points[2].x + t ** 3 * points[3].x,
      y: u ** 3 * points[0].y + 3 * u * u * t * points[1].y + 3 * u * t * t * points[2].y + t ** 3 * points[3].y,
    };
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

  function arcPoints(a, b, radius, count = 180) {
    const chord = distance(a, b);
    if (chord < EPS) return { points: [a, b], invalid: false };
    if (radius < chord / 2) return { points: [a, b], invalid: true };
    const h = Math.sqrt(Math.max(0, radius * radius - chord * chord / 4));
    const center = { x: (a.x + b.x) / 2 + (b.y - a.y) * h / chord, y: (a.y + b.y) / 2 - (b.x - a.x) * h / chord };
    const start = Math.atan2(a.y - center.y, a.x - center.x);
    let sweep = Math.atan2(b.y - center.y, b.x - center.x) - start;
    while (sweep > Math.PI) sweep -= Math.PI * 2;
    while (sweep < -Math.PI) sweep += Math.PI * 2;
    return { points: Array.from({ length: count + 1 }, (_, i) => ({ x: center.x + radius * Math.cos(start + sweep * i / count), y: center.y + radius * Math.sin(start + sweep * i / count) })), invalid: false };
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
      points = Array.from({ length: 241 }, (_, i) => p.curveKind === 'spline' ? catmull(controls, i / 240) : bezier(controls.slice(0, 4), i / 240));
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
    if (element.curveKind === 'arc') return arcPoints(controls[0], controls.at(-1), element.curveRadius).points;
    return Array.from({ length: 101 }, (_, i) => element.curveKind === 'spline' ? catmull(controls, i / 100) : bezier(controls.slice(0, 4), i / 100));
  }

  function bodyPose(element, motion, project, cachedPath) {
    const a = { x: element.x, y: element.y };
    const b = along(a, element.length, element.angle);
    if (['bearing', 'node'].includes(element.type)) return { a, b: a, angle: element.angle, length: 0 };
    const pose = { a, b, controlOrigin: { ...a }, angle: element.angle, length: element.length };
    if (element.type === 'panel') pose.c = element.localC ? worldPoint(pose, element.localC) : along(a, element.bearingOffset, element.angle);
    if (element.outline?.length) pose.outline = element.outline.map((v) => worldPoint(pose, v));
    if (element.type === 'rail') {
      const range = driveRange(project);
      const t = (motion - range.min) / Math.max(EPS, range.max - range.min);
      pose.c = along(a, (element.carriageOffset || 0) + (element.drive ? t : 0) * element.stroke, element.angle);
      pose.path = [a, b];
    }
    if (element.type === 'slot') { pose.path = cachedPath || genericPath(element); pose.a = pose.path[0]; pose.b = pose.path[pose.path.length - 1]; }
    return pose;
  }

  function solveExtras(project, motion, poses, issues, invalid, options) {
    const extras = project.elements.filter((e) => !e.primary && !isElastic(e));
    const range = driveRange(project);
    const bodies = new Map(extras.map((e) => {
      const linear = !options.design && e.drive && e.type !== 'rail' && e.driveMode === 'linear';
      const offset = linear ? along({ x: e.x, y: e.y }, (motion - range.min) / (range.max - range.min) * e.stroke, e.driveAngle || 0) : e;
      const angle = e.angle + (!options.design && e.drive && ['link', 'panel'].includes(e.type) && !linear ? motion : 0);
      let x = offset.x, y = offset.y;
      if (!options.design && e.drive && !linear && e.drivePivot !== 'a') {
        const local = e.drivePivot === 'c' ? e.localC || { x: e.bearingOffset, y: 0 } : { x: e.length, y: 0 };
        const before = rotate(local, e.angle), after = rotate(local, angle);
        x += before.x - after.x; y += before.y - after.y;
      }
      return [e.id, {
        element: e, x, y, angle, path: null,
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
          body.path = e.type === 'slot' ? genericPath(transformed) : null;
          poses[e.id] = bodyPose(transformed, motion, project, body.path);
          body.signature = signature;
        }
        done.add(e.id); active.delete(e.id);
      };
      bodies.forEach(refresh);
    };
    refreshAll();
    if (options.design) return 0;
    const joints = project.connections.filter((j) => !j.builtin && !isElastic(project.elements.find((e) => e.id === j.a.elementId)) && !isElastic(project.elements.find((e) => e.id === j.b.elementId)));
    if (!extras.length && !joints.length) return 0;
    const rootBody = (id) => {
      let body = bodies.get(id);
      while (body?.element.parentId) body = bodies.get(body.element.parentId);
      return body;
    };
    const immobile = (body) => !body || body.element.locked || body.element.drive || ['ground', 'rail', 'slot'].includes(body.element.type);
    const onGuide = (p, pose, joint) => {
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
      let angle = ((raw + 540) % 360 + 360) % 360 - 180;
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
          let error = pb.angle - pa.angle - (joint.value || 0);
          error = ((error + 540) % 360) - 180;
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
        const angleError = jointHasAngle(joint) ? Math.abs(((poses[joint.b.elementId].angle - poses[joint.a.elementId].angle - (joint.value || 0) + 540) % 360) - 180) : Math.abs(limitError(joint));
        return positionError < 0.0001 && angleError < 0.0001;
      })) break;
    }
    let residual = 0;
    for (const joint of joints) {
      const { a, b } = endpoints(joint);
      if (!a || !b) { issues.push('Väzba odkazuje na neexistujúci uzol.'); continue; }
      const type = joint.type || (joint.a.point === 'curve' || joint.b.point === 'curve' ? 'point-path' : 'revolute');
      const positionError = type === 'distance' ? Math.abs(distance(a, b) - (joint.value || 0)) : ['angle', 'parallel'].includes(type) ? 0 : distance(a, b);
      const angleError = jointHasAngle(joint)
        ? Math.abs(((poses[joint.b.elementId].angle - poses[joint.a.elementId].angle - (joint.value || 0) + 540) % 360) - 180) : Math.abs(limitError(joint));
      const error = Math.max(positionError, angleError);
      residual = Math.max(residual, error);
      if (error > TOLERANCE) invalid.push(joint.a.elementId, joint.b.elementId);
    }
    for (const body of bodies.values()) {
      if (body.element.type !== 'bearing' || !body.element.slotId) continue;
      const slot = project.elements.find((e) => e.id === body.element.slotId);
      const width = slot?.primary ? project.parameters.slotWidth : slot?.slotWidth;
      if (!slot) { issues.push(`Ložisko „${body.element.name}“ nemá platnú vodiacu drážku.`); invalid.push(body.element.id); }
      const path = poses[slot?.id]?.path;
      if (path) {
        const error = nearestOnPath(poses[body.element.id].a, path).distance;
        residual = Math.max(residual, error);
        if (error > TOLERANCE) invalid.push(body.element.id, slot.id);
      }
      if (options.collisions !== false && slot && body.element.radius * 2 > width) { issues.push(`Ložisko „${body.element.name}“ je širšie ako drážka.`); invalid.push(body.element.id, slot.id); }
    }
    if (residual > TOLERANCE) issues.push(`Nesplnená kĺbová väzba (${residual.toFixed(2)} mm). Skontrolujte dĺžky a pevné body.`);
    for (const body of bodies.values()) {
      if (body.element.type === 'panel' && !body.element.localC && body.element.bearingOffset > body.element.length) { issues.push(`Vodiaci bod leží mimo čela „${body.element.name}“.`); invalid.push(body.element.id); }
      if (body.element.type === 'slot' && body.element.curveKind === 'arc' && distance(body.path[0], body.path.at(-1)) > body.element.curveRadius * 2 + EPS) { issues.push(`Polomer kulisy „${body.element.name}“ je príliš malý.`); invalid.push(body.element.id); }
    }
    return residual;
  }

  function elasticMount(project, element, key) {
    const explicit = element[key === 'a' ? 'mountA' : 'mountB'];
    if (explicit) return explicit;
    const joint = project.connections.find((j) => (j.a.elementId === element.id && j.a.point === key) || (j.b.elementId === element.id && j.b.point === key));
    return joint ? (joint.a.elementId === element.id ? joint.b : joint.a) : null;
  }

  function solveElastic(project, poses, issues, invalid, options) {
    for (const e of project.elements.filter(isElastic)) {
      const base = bodyPose(e, 0, project);
      const ma = elasticMount(project, e, 'a'), mb = elasticMount(project, e, 'b');
      const a = ma ? poses[ma.elementId]?.[ma.point] : base.a;
      const b = mb ? poses[mb.elementId]?.[mb.point] : base.b;
      if (!a || !b) { issues.push(`Prvok „${e.name}“ nemá platné montážne body.`); invalid.push(e.id); continue; }
      const length = distance(a, b);
      poses[e.id] = { a: { ...a }, b: { ...b }, length, angle: angleOf(a, b), mountA: ma, mountB: mb };
      if (!options.design && (length < e.minLength - TOLERANCE || length > e.maxLength + TOLERANCE)) {
        issues.push(`„${e.name}“ prekračuje dĺžkový rozsah ${e.minLength}–${e.maxLength} mm (aktuálne ${length.toFixed(1)} mm).`);
        invalid.push(e.id);
      }
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
    residual = Math.max(residual, solveExtras(project, s, poses, issues, invalid, options));
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
    const result = { ...details, motion: s, angle, displacement, poses, profile, residual, issues: [...new Set(issues)], collisions: [...new Set(collisions)], invalid: [...new Set(invalid)], blocked: issues.length > 0, range };
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
        for (const key of ['a', 'b', 'c']) if (pose[key]) add(pose[key]);
        if (pose.path && (index === 0 || result.referenceOrigin)) pose.path.forEach(add);
        if (pose.outline) pose.outline.forEach(add);
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
      const min = ['polyline', 'arc'].includes(kind) ? 2 : 4, max = kind === 'polyline' ? 1001 : 32;
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
      normalized.carriageOffset = number(e.carriageOffset, 0, 0, 5000);
      if (normalized.length <= 0 || normalized.width <= 0 || normalized.radius <= 0 || normalized.stroke <= 0 || normalized.slotWidth <= 0 || normalized.bearingOffset <= 0 || normalized.curveRadius <= 0) throw new Error('Rozmery prvkov musia byť kladné.');
      normalized.curveKind = CURVES.includes(e.curveKind) ? e.curveKind : 'bezier';
      normalized.controls = e.controls ? controls(e.controls, normalized.curveKind) : base.controls;
      normalized.localC = e.localC == null ? null : vector(e.localC);
      normalized.parentId = text(e.parentId, '', 100);
      normalized.parentPoint = ['a', 'b', 'c'].includes(e.parentPoint) ? e.parentPoint : 'a';
      normalized.driveMode = e.driveMode === 'linear' || e.type === 'rail' ? 'linear' : 'rotary';
      normalized.driveAngle = number(e.driveAngle, 0, -360, 360);
      normalized.drivePivot = ['a', 'b', 'c'].includes(e.drivePivot) ? e.drivePivot : 'a';
      normalized.driveSpeed = e.driveSpeed == null ? null : number(e.driveSpeed, 0, -10000, 10000);
      normalized.color = /^#[0-9a-fA-F]{6}$/.test(e.color || '') ? e.color : '';
      if (e.type === 'node' && normalized.drive && normalized.driveMode !== 'linear') throw new Error('Samostatný bod môže mať iba lineárny pohon.');
      if (normalized.drivePivot === 'c' && e.type !== 'panel') throw new Error('Pohon odkazuje na neplatný otočný bod.');
      if (normalized.drivePivot === 'b' && ['node', 'bearing'].includes(e.type)) throw new Error('Pohon odkazuje na neplatný otočný bod.');
      normalized.mass = number(e.mass, base.mass, 0, 100000);
      normalized.inertia = number(e.inertia, 0, 0, 1000000);
      normalized.com = e.com == null ? null : vector(e.com);
      normalized.guideOnly = !!e.guideOnly;
      if (e.outline != null && (!Array.isArray(e.outline) || (e.outline.length && e.outline.length < 3) || e.outline.length > 64)) throw new Error('Obrys telesa musí mať 3 až 64 vrcholov.');
      normalized.outline = (e.outline || []).map(vector);
      for (const key of ['restLength', 'minLength', 'maxLength', 'diameter', 'rodDiameter', 'wireDiameter']) normalized[key] = number(e[key], base[key], key === 'wireDiameter' ? 0.01 : 0.1, 5000);
      for (const key of ['force', 'stiffness', 'preload', 'damping']) normalized[key] = number(e[key], base[key], 0, 1000000);
      normalized.progression = number(e.progression, 1, 1, 3);
      normalized.forceMode = e.forceMode === 'stiffness' ? 'stiffness' : 'rated';
      normalized.mountA = e.mountA || null; normalized.mountB = e.mountB || null;
      if (isElastic(e) && (normalized.minLength >= normalized.maxLength || normalized.restLength < normalized.minLength || normalized.restLength > normalized.maxLength || (e.type.startsWith('piston-') && normalized.rodDiameter >= normalized.diameter))) throw new Error('Skontrolujte minimálnu, voľnú a maximálnu dĺžku; tyč piesta musí byť užšia ako valec.');
      if (e.type.startsWith('spring-') && (normalized.wireDiameter * 2 >= normalized.diameter || (e.type === 'spring-compression' && normalized.restLength <= normalized.minLength) || (e.type === 'spring-extension' && (normalized.restLength >= normalized.maxLength || (normalized.forceMode === 'rated' && normalized.force < normalized.preload))))) throw new Error('Pružina musí mať nenulový pracovný zdvih, platný priemer drôtu a menšie predpätie ako maximálnu silu.');
      if (isElastic(e) && normalized.drive) throw new Error('Pružina ani piest nie sú predpísaný kinematický pohon. Pripojte ich medzi montážne body.');
      return normalized;
    });
    const points = ['a', 'b', 'c', 'curve'];
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
    const validPoint = (e, key) => key === 'a' || (key === 'b' && !['bearing', 'node'].includes(e.type)) || (key === 'c' && ['panel', 'rail'].includes(e.type)) || (key === 'curve' && ['slot', 'rail'].includes(e.type));
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
    if (input.kind === 'custom' && elements.filter((e) => e.drive).length > 1) throw new Error('Vlastný model môže mať len jeden nezávislý pohon.');
    const jointIds = new Set();
    const connections = input.connections.map((j) => {
      if (!j || typeof j.id !== 'string' || j.id.length > 100 || jointIds.has(j.id) || !ids.has(j.a?.elementId) || !ids.has(j.b?.elementId) || !points.includes(j.a.point) || !points.includes(j.b.point) || j.a.elementId === j.b.elementId || (j.a.point === 'curve' && j.b.point === 'curve')) throw new Error('Projekt obsahuje neplatnú kĺbovú väzbu.');
      jointIds.add(j.id);
      const ea = elements.find((e) => e.id === j.a.elementId), eb = elements.find((e) => e.id === j.b.elementId);
      if (!validPoint(ea, j.a.point) || !validPoint(eb, j.b.point)) throw new Error('Kĺbová väzba odkazuje na bod, ktorý prvok nemá.');
      const type = j.type || (j.a.point === 'curve' || j.b.point === 'curve' ? 'point-path' : 'revolute');
      if (!CONSTRAINT_TYPES.includes(type) || ((j.a.point === 'curve' || j.b.point === 'curve') && !['point-path', 'prismatic'].includes(type)) || (['point-path', 'prismatic'].includes(type) && j.a.point !== 'curve' && j.b.point !== 'curve')) throw new Error('Typ väzby nezodpovedá jej uzlom.');
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
      return { id: j.id, a: { elementId: j.a.elementId, point: j.a.point }, b: { elementId: j.b.elementId, point: j.b.point }, type, value, limitMin, limitMax, builtin: !!j.builtin && ea.primary && eb.primary, name: text(j.name, 'Otočný kĺb') };
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
      if (key === 'mode') simulation.mode = input.simulation?.mode === 'dynamic' ? 'dynamic' : 'kinematic';
      else {
        const negative = ['inputForce', 'initialVelocity'].includes(key);
        simulation[key] = number(input.simulation?.[key], fallback, negative ? -1000000 : key === 'duration' ? 0.1 : 0, key === 'gravity' ? 100 : key === 'duration' ? 120 : 1000000);
      }
    }
    const source = input.source && KINDS.includes(input.source.kind)
      ? { kind: input.source.kind, name: text(input.source.name, ''), motion: number(input.source.motion, 0), note: text(input.source.note, '', 500) } : null;
    const provenance = definition?.provenance || (source?.kind === 'double-drawer' ? projects.get('double-drawer')?.provenance : null);
    return {
      version: 1, id: text(input.id, uid(), 100), name: text(input.name, 'Importovaný mechanizmus'), kind: input.kind,
      parameters: p, controls: input.controls ? controls(input.controls, p.curveKind) : null, elements, connections, dimensions, trajectories, simulation,
      ...(source ? { source } : {}), ...(provenance ? { provenance: copy(provenance) } : {}),
    };
  }

  global.Kinematics = Object.freeze({
    DEG, EPS, TOLERANCE, TYPES, KINDS, CURVES, ELASTIC_TYPES, CONSTRAINT_TYPES, defaults, simulationDefaults, clamp, lerp, distance, copy, uid,
    along, angleOf, preset, makeElement, driveRange, designAngle, defaultControls, slotProfile,
    bezier, catmull, arcPoints, circleIntersections, circlePathIntersections, nearestOnSegment,
    nearestOnPath, segmentIntersection, segmentRect, solve, sample, point, inverseDrive, bounds, validateProject,
    registerProject, prepareProject, projectPhases, tracePoint,
    rotate, localPoint, worldPoint, isElastic, hasOrientation, bodyPose, genericPath, elasticMount,
  });
})(globalThis);
