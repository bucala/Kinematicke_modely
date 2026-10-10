/* A separate, estimated project definition. The general-purpose editor stays unchanged. */
(function (global) {
  'use strict';
  const K = global.Kinematics;
  const KIND = 'double-drawer';
  const NAME = 'Dvojite sklopeny suflik';
  const ID = 'project-dvojite-sklopeny-suflik-v1';
  const defaults = {
    frameLength: 390, frameHeight: 270, travelMin: 0, travelMax: 300,
    panelLength: 75, panelThickness: 6, bearingRadius: 4, slotWidth: 12,
    closedAngle: 90, openAngle: 65, armLength: 240, armClosedAngle: 8, armOpenAngle: -5,
    rearX: 125, rearY: 100, releaseTravel: 60, handoffLength: 18,
    drawerY: 80, drawerHeight: 28, tableY: 120, tableThickness: 16,
    cutoutStart: 280, cutoutEnd: 680, frontOpening: 155,
    pinAX: 2, pinAY: -35, pinBX: -18, pinBY: -19,
    guide1X: 0, guide1Y: 0, guide2X: 0, guide2Y: 0,
  };
  const types = {
    'frame-1': 'ground', 'table-1': 'ground', 'stop-1': 'ground', 'rail-1': 'rail',
    'rear-slot': 'slot', 'slot-1': 'slot', 'slot-2': 'slot', 'rocker-1': 'link',
    'bracket-1': 'panel', 'panel-1': 'panel',
    'bearing-1': 'bearing', 'bearing-2': 'bearing', 'rear-bearing': 'bearing',
  };
  const roles = {
    'frame-1': 'frame', 'table-1': 'table', 'stop-1': 'stop', 'rail-1': 'carrier',
    'rear-slot': 'rearSlot', 'slot-1': 'guide1', 'slot-2': 'guide2', 'rocker-1': 'rocker',
    'bracket-1': 'bracket', 'panel-1': 'front',
    'bearing-1': 'pinA', 'bearing-2': 'pinB', 'rear-bearing': 'rearPin',
  };
  const names = {
    'frame-1': 'Pevný korpus', 'table-1': 'Platforma stola · fix', 'stop-1': 'Pevná zadná opora',
    'rail-1': 'Posuvný rám zásuvky', 'rear-slot': 'Pozdĺžna drážka zadného čapu',
    'slot-1': 'Kulisa 1 · na zásuvke', 'slot-2': 'Kulisa 2 · na zásuvke',
    'rocker-1': 'Modré rameno · pevná dĺžka', 'bracket-1': 'Tuhý dvojložiskový držiak',
    'panel-1': 'Sklápacie čelo', 'bearing-1': 'Vodiace ložisko A',
    'bearing-2': 'Vodiace ložisko B', 'rear-bearing': 'Zadný otočný čap R',
  };
  const provenance = {
    estimated: true,
    source: 'Trojpolohový náčrt dodaný používateľom; bez kót.',
    reference: './projects/dvojite-sklopeny-suflik-reference.png',
    note: 'Odhadová geometria, nie výrobný výkres. Obe kulisy sa posúvajú so zásuvkou; modré rameno je tuhé.',
  };
  const rotate = (point, angle) => {
    const r = angle * K.DEG;
    return { x: point.x * Math.cos(r) + point.y * Math.sin(r), y: -point.x * Math.sin(r) + point.y * Math.cos(r) };
  };
  const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
  const subtract = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
  const smooth = (t) => t * t * t * (10 + t * (-15 + 6 * t));
  const release = (p) => p.releaseTravel;
  const lostMotion = (p) => release(p) - p.handoffLength / 2;

  // The rear stop holds the pin initially. An estimated compliant/latch handoff
  // over the last handoffLength mm makes position and velocity continuous.
  function rearPosition(p, travel) {
    const end = release(p), length = p.handoffLength, start = end - length;
    if (travel <= start) return { x: p.rearX, y: p.rearY };
    if (travel >= end) return { x: p.rearX + length / 2 + travel - end, y: p.rearY };
    const t = (travel - start) / length;
    return { x: p.rearX + length / 2 * (2 * t ** 3 - t ** 4), y: p.rearY };
  }

  function design(p, u) {
    const travel = release(p) * u;
    const t = smooth(K.clamp(u, 0, 1));
    const armAngle = K.lerp(p.armClosedAngle, p.armOpenAngle, t);
    const angle = K.lerp(p.closedAngle, p.openAngle, t);
    const rear = rearPosition(p, travel);
    const b = K.along(rear, p.armLength, armAngle);
    const hinge = subtract(b, rotate({ x: p.pinBX, y: p.pinBY }, angle));
    const a = add(hinge, rotate({ x: p.pinAX, y: p.pinAY }, angle));
    return { a: { x: a.x - travel, y: a.y }, b: { x: b.x - travel, y: b.y } };
  }

  function prepare(project) {
    const p = project.parameters;
    const at = (u) => {
      const point = design(p, u);
      return {
        a: add(point.a, { x: p.guide1X, y: p.guide1Y }),
        b: add(point.b, { x: p.guide2X, y: p.guide2Y }),
      };
    };
    const parameters = [...Array.from({ length: 601 }, (_, i) => i / 600), (release(p) - p.handoffLength) / release(p)].sort((a, b) => a - b);
    const points = parameters.map(at);
    return { kind: KIND, at, guide1: points.map((v) => v.a), guide2: points.map((v) => v.b) };
  }

  function create() {
    const project = {
      version: 1, id: K.uid(), name: NAME, kind: KIND,
      parameters: { ...K.copy(K.defaults), ...defaults }, controls: null,
      provenance: K.copy(provenance), elements: [], connections: [],
    };
    for (const [id, type] of Object.entries(types)) project.elements.push({
      ...K.makeElement(type), id, type, name: names[id], role: roles[id],
      primary: true, locked: true, drive: false,
    });
    const connect = (a, ap, b, bp, name) => project.connections.push({
      id: K.uid(), a: { elementId: a, point: ap }, b: { elementId: b, point: bp }, name, builtin: true,
    });
    connect('rear-bearing', 'a', 'rear-slot', 'curve', 'Zadný čap v pozdĺžnej drážke');
    connect('rear-bearing', 'a', 'rocker-1', 'a', 'Otočný kĺb ramena R');
    connect('rocker-1', 'b', 'bracket-1', 'a', 'Rameno a držiak v bode B');
    connect('bracket-1', 'a', 'bearing-2', 'a', 'Pevné uloženie ložiska B');
    connect('bracket-1', 'c', 'bearing-1', 'a', 'Pevné uloženie ložiska A');
    connect('bearing-1', 'a', 'slot-1', 'curve', 'Ložisko A v kulise 1');
    connect('bearing-2', 'a', 'slot-2', 'curve', 'Ložisko B v kulise 2');
    connect('bracket-1', 'b', 'panel-1', 'a', 'Pevné spojenie držiaka a čela');
    return project;
  }

  function validate(p) {
    const span = p.travelMax - p.travelMin;
    if (p.releaseTravel <= 0 || p.releaseTravel >= span || p.handoffLength <= 0 || p.handoffLength > p.releaseTravel ||
        p.frameLength <= 15 || p.armLength <= 0 || p.drawerHeight <= 0 || p.tableThickness <= 0 ||
        p.cutoutStart < 0 || p.cutoutEnd <= p.cutoutStart || p.frontOpening <= 0 ||
        p.frontOpening >= p.frameHeight || p.armClosedAngle <= p.armOpenAngle ||
        p.armClosedAngle > 45 || p.armOpenAngle < -45 ||
        Math.hypot(p.pinAX - p.pinBX, p.pinAY - p.pinBY) < 1 ||
        Math.abs(p.pinAY) > 200 || Math.abs(p.pinBY) > 200 || Math.abs(p.pinAX) > 200 || Math.abs(p.pinBX) > 200) {
      throw new Error('Neplatná geometria dvojkulisového projektu. Skontrolujte zdvih, bod uvoľnenia, medzeru stola a rozstup ložísk.');
    }
  }

  function phases(project) {
    const p = project.parameters;
    return [
      { motion: p.travelMin, name: 'Zatvorené' },
      { motion: p.travelMin + release(p), name: 'Sklopené' },
      { motion: p.travelMax, name: 'Vysunuté' },
    ];
  }

  function tableRects(p) {
    return [
      { x: 0, y: p.tableY, w: p.cutoutStart, h: p.tableThickness },
      { x: p.cutoutEnd, y: p.tableY, w: Math.max(150, p.frameLength + p.travelMax - p.travelMin + 180 - p.cutoutEnd), h: p.tableThickness },
    ];
  }

  function solve(project, motion, options = {}) {
    const p = project.parameters, travel = motion - p.travelMin;
    const profile = options.profile?.kind === KIND ? options.profile : prepare(project);
    const rear = rearPosition(p, travel);
    const issues = [], collisions = [], invalid = [];
    let residual = 0, u = travel >= release(p) ? 1 : 0;
    const closure = (t) => {
      const b = profile.at(t).b;
      const dy = b.y - p.rearY;
      if (Math.abs(dy) >= p.armLength) return NaN;
      return b.x + travel - Math.sqrt(p.armLength ** 2 - dy ** 2) - rear.x;
    };
    const f0 = closure(0), f1 = closure(1);
    if (travel < release(p)) {
      if (!Number.isFinite(f0) || !Number.isFinite(f1) || f0 < -K.TOLERANCE || f1 > K.TOLERANCE) {
        issues.push('Modré rameno a zadný čap neuzatvárajú reťazec pri tejto polohe.');
        invalid.push('rocker-1', 'slot-2');
        u = Math.abs(f0) <= Math.abs(f1) ? 0 : 1;
      } else if (Math.abs(f0) < 1e-9) u = 0;
      else if (Math.abs(f1) < 1e-9) u = 1;
      else {
        let left = 0, right = 1;
        for (let i = 0; i < 48; i++) {
          const mid = (left + right) / 2;
          if (closure(mid) > 0) left = mid; else right = mid;
        }
        u = (left + right) / 2;
      }
    }
    const candidate = profile.at(u);
    const b = { x: candidate.b.x + travel, y: candidate.b.y };
    const localDelta = { x: p.pinAX - p.pinBX, y: p.pinAY - p.pinBY };
    const worldDelta = subtract(candidate.a, candidate.b);
    let angle = (Math.atan2(-worldDelta.y, worldDelta.x) - Math.atan2(-localDelta.y, localDelta.x)) / K.DEG;
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;
    const hinge = subtract(b, rotate({ x: p.pinBX, y: p.pinBY }, angle));
    const a = add(hinge, rotate({ x: p.pinAX, y: p.pinAY }, angle));
    const tip = K.along(hinge, p.panelLength, angle);
    const worldPath = (points) => points.map((point) => ({ x: point.x + travel, y: point.y }));
    const guide1 = worldPath(profile.guide1), guide2 = worldPath(profile.guide2);
    const armError = Math.abs(K.distance(rear, b) - p.armLength);
    const errorA = K.nearestOnPath(a, guide1).distance, errorB = K.nearestOnPath(b, guide2).distance;
    residual = Math.max(armError, errorA, errorB);
    if (armError > K.TOLERANCE) { issues.push('Nesplnená pevná dĺžka modrého ramena.'); invalid.push('rocker-1'); }
    if (errorA > K.TOLERANCE || errorB > K.TOLERANCE) {
      issues.push('Dve kulisy nie sú kompatibilné s pevným rozstupom ložísk.');
      invalid.push('slot-1', 'slot-2', 'bracket-1', 'bearing-1', 'bearing-2');
    }
    if (angle < p.openAngle - 0.05 || angle > p.closedAngle + 0.05) {
      issues.push('Čelo prekračuje nastavený uhlový rozsah.'); invalid.push('panel-1');
    }
    const rearSlot = [{ x: p.rearX - lostMotion(p) + travel, y: p.rearY }, { x: p.rearX + travel, y: p.rearY }];
    const rearError = K.nearestOnPath(rear, rearSlot).distance;
    residual = Math.max(residual, rearError);
    if (rearError > K.TOLERANCE) { issues.push('Zadný čap leží mimo pozdĺžnej drážky.'); invalid.push('rear-bearing', 'rear-slot'); }
    const armAngle = K.angleOf(rear, b);
    const table = tableRects(p);
    const poses = {
      'frame-1': { a: { x: 0, y: p.tableY }, b: { x: p.frameLength, y: p.tableY }, angle: 0, length: p.frameLength },
      'table-1': { a: { x: 0, y: p.tableY }, b: { x: table[1].x + table[1].w, y: p.tableY }, rects: table, angle: 0, length: table[1].x + table[1].w },
      'stop-1': { a: { x: p.rearX - 9, y: p.tableY - 42 }, b: { x: p.rearX - 9, y: p.tableY }, angle: 90, length: 42 },
      'rail-1': { a: { x: travel + 15, y: p.drawerY }, b: { x: travel + p.frameLength, y: p.drawerY }, c: { x: travel + p.frameLength, y: p.drawerY }, origin: { x: travel, y: 0 }, angle: 0, length: p.frameLength - 15 },
      'rocker-1': { a: rear, b, angle: armAngle, length: p.armLength },
      'bracket-1': { a: b, b: hinge, c: a, angle, length: K.distance(b, hinge) },
      'panel-1': { a: hinge, b: tip, c: a, angle, length: p.panelLength },
      'bearing-1': { a, b: a, angle: 0, length: 0 },
      'bearing-2': { a: b, b, angle: 0, length: 0 },
      'rear-bearing': { a: rear, b: rear, angle: 0, length: 0 },
      'slot-1': { a: guide1[0], b: guide1.at(-1), path: guide1, angle: 0, length: 0 },
      'slot-2': { a: guide2[0], b: guide2.at(-1), path: guide2, angle: 0, length: 0 },
      'rear-slot': { a: rearSlot[0], b: rearSlot[1], path: rearSlot, angle: 0, length: lostMotion(p) },
    };
    if (options.collisions !== false) {
      if (p.bearingRadius * 2 > p.slotWidth) {
        issues.push('Priemer ložiska je väčší ako šírka vodiacej drážky.');
        collisions.push('bearing-1', 'bearing-2', 'slot-1', 'slot-2');
      }
      for (const [id, width] of [['rocker-1', 10], ['panel-1', p.panelThickness]]) {
        const pose = poses[id];
        if (table.some((rect) => K.segmentRect(pose.a, pose.b, rect, width / 2))) {
          issues.push('Člen koliduje s pevnou platformou stola. Skontrolujte pevný výrez pre celý zdvih.');
          collisions.push(id, 'table-1');
        }
      }
      for (const [id, position] of [['bearing-1', a], ['bearing-2', b]]) {
        if (table.some((rect) => K.segmentRect(position, position, rect, p.bearingRadius))) {
          issues.push('Ložisko zasahuje do pevnej platformy stola.'); collisions.push(id, 'table-1');
        }
      }
      const top = p.tableY - p.frameHeight;
      const walls = [{ x: -8, y: top, w: 8, h: p.frameHeight }, { x: 0, y: top - 8, w: p.frameLength + 8, h: 8 }, { x: p.frameLength, y: top, w: 8, h: p.frameHeight - p.frontOpening }];
      if (walls.some((rect) => K.segmentRect(hinge, tip, rect, p.panelThickness / 2))) {
        issues.push('Čelo koliduje s pevným korpusom.'); collisions.push('panel-1', 'frame-1');
      }
    }
    return {
      angle, secondaryAngle: armAngle, displacement: travel, poses, profile, residual,
      issues, collisions, invalid, referenceOrigin: { x: travel, y: 0 },
      phase: travel < release(p) - 1e-6 ? 'fold' : 'slide',
      phaseLabel: travel < release(p) - 1e-6 ? 'Sklápanie v kulisách' : 'Spoločný vodorovný posuv',
      guideErrors: { a: errorA, b: errorB, rear: rearError, arm: armError },
      guideParameter: u, pinDistance: K.distance(a, b), estimated: true,
    };
  }

  function bounds(project) {
    const p = project.parameters, table = tableRects(p);
    return [{ x: -8, y: p.tableY - p.frameHeight - 8 }, { x: table[1].x + table[1].w, y: p.tableY + p.tableThickness + 65 }];
  }

  global.DoubleDrawer = Object.freeze({
    KIND, NAME, ID, defaults, provenance, create, prepare, solve, validate, phases, bounds, rearPosition,
    traces: Object.freeze([{ elementId: 'bearing-1', point: 'a', label: 'A', color: '#bf9f20' }, { elementId: 'bearing-2', point: 'a', label: 'B', color: '#ce8d32' }]),
  });
  K.registerProject({ kind: KIND, defaults, types, roles, provenance, create, prepare, solve, validate, phases, bounds });
})(globalThis);
