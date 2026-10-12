/* Native files, vectors, CAD exchange and self-contained reports. No remote upload. */
(function (global) {
  'use strict';
  const K = global.Kinematics, E = global.KinmoEditor, P = global.KinmoPhysics;
  const escape = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const n = (value, digits = 3) => Number.isFinite(value) ? Number(value.toFixed(digits)) : 0;
  const fmt = (v, digits = 2) => Number.isFinite(v) ? v.toLocaleString('sk-SK', { maximumFractionDigits: digits }) : '—';
  const labels = {
    ground: 'Pevný rám', rail: 'Lineárne vedenie', link: 'Tuhé rameno', panel: 'Panel / čelo', slot: 'Vodiaca kulisa', bearing: 'Čap / ložisko', node: 'Uzol',
    'spring-compression': 'Tlačná pružina', 'spring-extension': 'Ťažná pružina', 'piston-push': 'Tlačný piest', 'piston-pull': 'Ťažný piest',
  };
  const parameterLabels = {
    frameLength: 'Dĺžka korpusu', frameHeight: 'Výška korpusu', travelMin: 'Začiatok zdvihu', travelMax: 'Koniec zdvihu',
    panelLength: 'Dĺžka čela', panelThickness: 'Hrúbka čela', bearingRadius: 'Polomer čapu', slotWidth: 'Šírka kulisy',
    closedAngle: 'Zatvorený uhol', openAngle: 'Otvorený uhol', armLength: 'Dĺžka ramena', armClosedAngle: 'Uhol ramena, zatvorené', armOpenAngle: 'Uhol ramena, otvorené',
    rearX: 'Zadný čap X', rearY: 'Zadný čap Y', releaseTravel: 'Zdvih sklopenia', handoffLength: 'Prechod opory',
    drawerY: 'Zásuvka Y', drawerHeight: 'Výška zásuvky', tableY: 'Stôl Y', tableThickness: 'Hrúbka stola',
    cutoutStart: 'Začiatok výrezu', cutoutEnd: 'Koniec výrezu', frontOpening: 'Predné otvorenie',
    pinAX: 'Čap A, lokálne X', pinAY: 'Čap A, lokálne Y', pinBX: 'Čap B, lokálne X', pinBY: 'Čap B, lokálne Y',
    guide1X: 'Kulisa 1, posun X', guide1Y: 'Kulisa 1, posun Y', guide2X: 'Kulisa 2, posun X', guide2Y: 'Kulisa 2, posun Y',
    pivotY: 'Otočný čap Y', panelOffsetX: 'Čelo, posun X', bearingOffset: 'Vzdialenosť ložiska', turnStart: 'Začiatok sklápania',
    smoothness: 'Tvarový koeficient', curveRadius: 'Polomer oblúka', curveKind: 'Typ kulisy', slotOffsetX: 'Kulisa, posun X', slotOffsetY: 'Kulisa, posun Y',
    groundLength: 'Rozstup pevných čapov', crankLength: 'Dĺžka kľuky', couplerLength: 'Dĺžka spojky', rockerLength: 'Dĺžka výstupného ramena',
    rodLength: 'Dĺžka ojnice', sliderY: 'Vedenie Y', rotationMin: 'Začiatok otáčania', rotationMax: 'Koniec otáčania',
  };
  const parameterKeys = {
    drawer: ['frameLength', 'frameHeight', 'travelMin', 'travelMax', 'panelLength', 'panelThickness', 'pivotY', 'panelOffsetX', 'closedAngle', 'openAngle', 'bearingOffset', 'bearingRadius', 'slotWidth', 'turnStart', 'smoothness', 'curveKind', 'curveRadius', 'slotOffsetX', 'slotOffsetY'],
    fourbar: ['groundLength', 'crankLength', 'couplerLength', 'rockerLength', 'rotationMin', 'rotationMax'],
    crank: ['crankLength', 'rodLength', 'sliderY', 'rotationMin', 'rotationMax'],
  };
  function parameterRows(project) {
    const keys = project.kind === 'double-drawer' ? Object.keys(global.DoubleDrawer.defaults) : parameterKeys[project.kind] || [];
    return keys.map((key) => {
      const value = project.parameters[key], unit = /angle|rotation/i.test(key) ? '°' : ['curveKind', 'smoothness'].includes(key) ? '' : 'mm';
      return [`${parameterLabels[key] || key}${unit ? ` (${unit})` : ''}`, typeof value === 'number' ? fmt(value, 3) : String(value)];
    });
  }
  function elementLength(pose) {
    return pose?.path ? pose.path.reduce((sum, p, i) => sum + (i ? K.distance(p, pose.path[i - 1]) : 0), 0) : pose?.length;
  }
  function simulationRows(project) {
    const forceUnit = K.driveRange(project).unit === '°' ? 'N·m' : 'N', velocityUnit = `${K.driveRange(project).unit}/s`;
    const fields = {
      gravity: 'Gravitácia (m/s²)', damping: `Tlmenie (${forceUnit}·s/${forceUnit === 'N' ? 'm' : 'rad'})`,
      friction: `Trenie (${forceUnit})`, inputForce: `Vonkajší pohon (${forceUnit})`,
      initialVelocity: `Počiatočná rýchlosť (${velocityUnit})`, duration: 'Trvanie (s)',
    };
    return [['Režim', project.simulation.mode === 'dynamic' ? 'Odhadová dynamika' : 'Predpísaná kinematika'],
      ...Object.entries(fields).map(([key, label]) => [label, fmt(project.simulation[key], 3)])];
  }
  const warning = 'Odhadový 2D model, nie výrobný výkres, pevnostný výpočet ani potvrdenie bezpečnosti. Kolízie sú geometrické; obrysy voľných telies slúžia na kreslenie a CAD. Dynamika má jeden pohon a bezhmotnostné silové členy; neobsahuje kontaktné reakcie, deformácie, model západky ani nárazu.';

  function preferences(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) input = {};
    const result = {
      theme: ['mono', 'orange', 'dark'].includes(input.theme) ? input.theme : 'mono',
      cycle: Number.isFinite(input.cycle) ? K.clamp(input.cycle, 1, 60) : 6,
      speed: [0.25, 0.5, 1, 1.5, 2].includes(input.speed) ? input.speed : 1,
    };
    for (const key of ['grid', 'dimensions', 'ghosts', 'trace', 'labels', 'collisions', 'snap', 'forceArrows']) result[key] = input[key] !== false;
    for (const key of ['profileVisible', 'timelineVisible']) result[key] = input[key] === true;
    return result;
  }

  function nativeFile(project, options = {}) {
    const p = K.validateProject(project), range = K.driveRange(p);
    return {
      format: 'KINMO', formatVersion: 2, units: { length: 'mm', angle: 'deg', force: 'N', mass: 'kg', inertia: 'kg·m²' },
      project: p, workspace: { ...preferences(options.workspace), mode: ['edit', 'simulate'].includes(options.workspace?.mode) ? options.workspace.mode : p.kind === 'custom' ? 'edit' : 'simulate' },
      motion: Number.isFinite(options.motion) ? K.clamp(options.motion, range.min, range.max) : range.min,
    };
  }

  function boundedJSON(value) {
    // Compact encoding keeps dense, valid profiles inside the same import limit.
    const text = JSON.stringify(value);
    if (new TextEncoder().encode(text).length > 2 * 1024 * 1024) throw new Error('Projekt prekračuje 2 MB. Znížte počet vrcholov alebo rozdeľte projekt.');
    return text;
  }

  function serializeProject(project) { return boundedJSON(K.validateProject(project)); }
  function serializeNative(project, options = {}) { return boundedJSON(nativeFile(project, options)); }

  function parseNative(input) {
    if (typeof input === 'string') {
      if (new TextEncoder().encode(input).length > 2 * 1024 * 1024) throw new Error('Projekt je príliš veľký. Limit je 2 MB.');
      input = JSON.parse(input);
    }
    if (input?.format === 'KINMO') {
      if (input.formatVersion !== 2 || input.units?.length !== 'mm' || input.units?.angle !== 'deg' || input.units?.force !== 'N' || input.units?.mass !== 'kg' || input.units?.inertia !== 'kg·m²') throw new Error('Nepodporovaná verzia alebo jednotky súboru .kinmo.');
      const project = K.validateProject(input.project), range = K.driveRange(project);
      if (input.motion != null && (!Number.isFinite(input.motion) || input.motion < range.min || input.motion > range.max)) throw new Error('Súbor obsahuje neplatnú polohu pohonu.');
      const workspace = preferences(input.workspace);
      workspace.mode = ['edit', 'simulate'].includes(input.workspace?.mode) ? input.workspace.mode : project.kind === 'custom' ? 'edit' : 'simulate';
      return { project, workspace, motion: input.motion ?? range.min };
    }
    return { project: K.validateProject(input), workspace: null, motion: null };
  }

  function polygon(pose, width) {
    const dx = pose.b.x - pose.a.x, dy = pose.b.y - pose.a.y, length = Math.hypot(dx, dy) || 1;
    const ox = -dy * width / (2 * length), oy = dx * width / (2 * length);
    return [
      { x: pose.a.x + ox, y: pose.a.y + oy }, { x: pose.b.x + ox, y: pose.b.y + oy },
      { x: pose.b.x - ox, y: pose.b.y - oy }, { x: pose.a.x - ox, y: pose.a.y - oy },
    ];
  }
  const rectangle = (r) => [{ x: r.x, y: r.y }, { x: r.x + r.w, y: r.y }, { x: r.x + r.w, y: r.y + r.h }, { x: r.x, y: r.y + r.h }];
  const point = (p) => ({ x: n(p.x), y: n(p.y) });

  function geometry(project, result, options = {}) {
    const entities = [], p = project.parameters;
    const stroke = (e) => /^#[0-9a-fA-F]{6}$/.test(e.color || '') ? e.color : '';
    const poly = (e, points, closed = false, layer = e.type.toUpperCase().replace(/-/g, '_')) => {
      if (points.length >= 2) entities.push({ kind: 'polyline', elementId: e.id, name: e.name, layer, points: points.map(point), closed, color: stroke(e) });
    };
    const text = (name, at, layer = 'LABELS', elementId = '') => entities.push({ kind: 'text', text: name, at: point(at), height: 7, layer, elementId });
    for (const e of project.elements.filter((v) => v.visible)) {
      const pose = result.poses[e.id];
      if (!pose) continue;
      if (pose.rects) for (const r of pose.rects) poly(e, rectangle(r), true);
      else if (pose.outline?.length) poly(e, pose.outline, true);
      else if (e.primary && e.role === 'frame' && ['drawer', 'double-drawer'].includes(project.kind)) {
        const y = project.kind === 'drawer' ? p.pivotY : p.tableY, top = y - p.frameHeight;
        poly(e, rectangle({ x: -12, y: top - 12, w: 12, h: p.frameHeight + 30 }), true);
        poly(e, rectangle({ x: 0, y: top - 12, w: p.frameLength, h: 12 }), true);
        if (project.kind === 'double-drawer') poly(e, rectangle({ x: p.frameLength, y: top, w: 8, h: p.frameHeight - p.frontOpening }), true);
      } else if (['bearing', 'node'].includes(e.type)) entities.push({
        kind: 'circle', elementId: e.id, name: e.name, layer: e.type === 'node' ? 'NODE' : 'BEARING', center: point(pose.a),
        radius: n(e.primary ? p.bearingRadius : e.radius), color: stroke(e),
      });
      else if (pose.path) {
        poly(e, pose.path);
        if (e.type === 'slot' && !e.guideOnly && options.slotOutlines === true) {
          const width = e.primary ? e.role === 'rearSlot' ? 8 : p.slotWidth : e.slotWidth;
          try {
            const profiles = global.KinmoSlotOutline.contours(pose.path, width);
            profiles.forEach((points, i) => poly({ ...e, name: `${e.name} · referenčný obrys` }, points, true, i ? 'SLOT_REFERENCE_INNER' : 'SLOT_REFERENCE_OUTLINE'));
          } catch (error) { throw new Error(`Drážka „${e.name}“: ${error.message} V exporte môžete vypnúť referenčné obrysy.`); }
        }
      }
      else if (K.isElastic(e)) {
        const length = pose.length || 1, ux = (pose.b.x - pose.a.x) / length, uy = (pose.b.y - pose.a.y) / length;
        const at = (s, normal = 0) => ({ x: pose.a.x + ux * s - uy * normal, y: pose.a.y + uy * s + ux * normal });
        if (e.type.startsWith('spring-')) {
          const points = [pose.a, at(length * .13)];
          for (let i = 0; i <= 16; i++) points.push(at(length * (.16 + i / 16 * .68), (i % 2 ? 1 : -1) * e.diameter / 2));
          points.push(at(length * .87), pose.b); poly(e, points);
        } else {
          poly(e, polygon({ a: pose.a, b: at(Math.min(length * .8, e.minLength * .72)) }, e.diameter), true);
          poly(e, [pose.a, pose.b]);
        }
      } else if (e.type === 'ground') poly(e, [pose.a, pose.b]);
      else poly(e, polygon(pose, e.primary && e.type === 'panel' ? p.panelThickness : e.width), true);
      if (e.type === 'cam') entities.push({ kind: 'circle', elementId: e.id, name: `${e.name} · os`, layer: 'CAM_AXIS', center: point(pose.a), radius: 3, color: stroke(e) });
      if (pose.carriageOutline?.length) poly(e, pose.carriageOutline, true, 'RAIL_CARRIAGE');
      if (options.labels !== false) text(e.name, { x: (pose.a.x + pose.b.x) / 2, y: (pose.a.y + pose.b.y) / 2 - 12 }, 'LABELS', e.id);
    }
    const dimensions = [...(project.dimensions || [])];
    if (!dimensions.length && project.kind !== 'custom') {
      for (const e of project.elements.filter((e) => e.visible && e.primary && ['link', 'panel'].includes(e.type) && e.role !== 'bracket')) {
        const d = E.makeDimension(result, { elementId: e.id, point: 'a' }, { elementId: e.id, point: 'b' }, 'distance', e.type === 'panel' ? 75 : 45);
        d.name = { front: 'Čelo', crank: 'Kľuka', coupler: 'Spojka', rocker: 'Rameno' }[e.role] || e.name.slice(0, 18); dimensions.push(d);
      }
      if (['drawer', 'double-drawer'].includes(project.kind)) {
        const y = (project.kind === 'drawer' ? p.pivotY : p.tableY) - p.frameHeight;
        const d = E.makeDimension(result, { x: 0, y }, { x: p.frameLength, y }, 'horizontal', -30);
        d.name = 'Korpus'; dimensions.push(d);
      }
    }
    if (options.dimensions !== false) for (const d of dimensions.filter((v) => v.visible)) {
      const a = E.resolvePoint(result, d.a), b = E.resolvePoint(result, d.b);
      if (!a || !b) continue;
      const length = K.distance(a, b) || 1, offset = d.offset;
      let p1 = { x: a.x - (b.y - a.y) / length * offset, y: a.y + (b.x - a.x) / length * offset };
      let p2 = { x: b.x - (b.y - a.y) / length * offset, y: b.y + (b.x - a.x) / length * offset };
      if (d.type === 'horizontal') { p1 = { x: a.x, y: Math.max(a.y, b.y) + offset }; p2 = { x: b.x, y: p1.y }; }
      if (d.type === 'vertical') { p1 = { x: Math.max(a.x, b.x) + offset, y: a.y }; p2 = { x: p1.x, y: b.y }; }
      const e = { id: d.id, name: d.name || 'Kóta', type: 'dimension' };
      poly(e, [a, p1], false, 'DIMENSIONS'); poly(e, [b, p2], false, 'DIMENSIONS'); poly(e, [p1, p2], false, 'DIMENSIONS');
      text(`${d.name ? `${d.name}: ` : ''}${fmt(E.dimensionValue(result, d))} ${d.type === 'angle' ? '°' : 'mm'}`, { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 - 5 }, 'DIMENSIONS', d.id);
    }
    const seenTraces = new Set();
    if (options.trajectories && options.samples) for (const trajectory of [...(project.trajectories || []), ...(options.references || []).map((r, i) => ({ id: `export-trace-${i}`, name: r.label || 'Trajektória', reference: r, space: r.space || options.traceSpace || 'world', visible: true }))]) {
      if (!trajectory.visible) continue;
      const key = `${trajectory.reference.elementId}|${trajectory.reference.point}|${trajectory.space}`;
      if (seenTraces.has(key)) continue;
      seenTraces.add(key);
      let points = [];
      const flush = () => { if (points.length > 1) poly({ id: trajectory.id, name: trajectory.name, type: 'trajectory', color: trajectory.color }, points, false, 'TRAJECTORIES'); points = []; };
      for (const sample of options.samples) {
        let p = K.tracePoint(sample, trajectory.reference, trajectory.space);
        if (!p || sample.blocked) { flush(); continue; }
        if (trajectory.space === 'carrier' && result.referenceOrigin) p = { x: p.x + result.referenceOrigin.x, y: p.y + result.referenceOrigin.y };
        points.push(p);
      }
      flush();
    }
    return entities;
  }

  function geometryBounds(entities) {
    const points = entities.flatMap((e) => e.points || (e.center ? [{ x: e.center.x - e.radius, y: e.center.y - e.radius }, { x: e.center.x + e.radius, y: e.center.y + e.radius }] : [e.at]));
    if (!points.length) return { x: -10, y: -10, width: 100, height: 100 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
    return { x: minX - 35, y: minY - 35, width: Math.max(80, maxX - minX + 70), height: Math.max(80, maxY - minY + 70) };
  }

  function vectorSVG(project, result, options = {}) {
    const entities = geometry(project, result, options), b = geometryBounds(entities);
    const color = (layer) => layer === 'DIMENSIONS' ? '#65788c' : layer === 'TRAJECTORIES' ? '#438778' : layer === 'SLOT' ? '#638e83' : '#35485b';
    const textHeight = Math.max(0, (options.minimumText || 0) / Math.min(510 / b.width, 285 / b.height));
    const content = entities.map((e) => {
      if (e.kind === 'polyline') return `<${e.closed ? 'polygon' : 'polyline'} points="${e.points.map((p) => `${p.x},${p.y}`).join(' ')}" fill="${e.closed && !e.layer.startsWith('SLOT_REFERENCE') ? '#edf0f3' : 'none'}" stroke="${e.color || color(e.layer)}" stroke-width="${e.layer === 'DIMENSIONS' ? .6 : 1.3}" stroke-linejoin="round"/>`;
      if (e.kind === 'circle') return `<circle cx="${e.center.x}" cy="${e.center.y}" r="${e.radius}" fill="#ffffff" stroke="${e.color || color(e.layer)}" stroke-width="1.2"/>`;
      return `<text x="${e.at.x}" y="${e.at.y}" font-family="Roboto" font-size="${n(Math.max(e.height, textHeight))}" fill="${color(e.layer)}" text-anchor="middle">${escape(e.text)}</text>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${n(b.width)}mm" height="${n(b.height)}mm" viewBox="${n(b.x)} ${n(b.y)} ${n(b.width)} ${n(b.height)}"><title>${escape(project.name)}</title><desc>${escape(warning)}</desc><rect x="${n(b.x)}" y="${n(b.y)}" width="${n(b.width)}" height="${n(b.height)}" fill="#ffffff"/>${content}</svg>`;
  }

  function cadSnapshot(project, result, options = {}) {
    const p = K.validateProject(project);
    const entities = geometry(p, result, { ...options, labels: false });
    if (entities.some((e) => e.points?.length > 1001)) throw new Error('CAD krivka prekračuje 1001 vrcholov. Zjednodušte krivku alebo vypnite referenčné obrysy.');
    if (entities.length > 2000) throw new Error('CAD výkres prekračuje limit 2 000 entít. Skryte nepotrebné trajektórie alebo kóty.');
    const count = entities.reduce((sum, e) => sum + (e.points?.length || 1), 0);
    if (count > 30000) throw new Error('CAD výkres prekračuje limit 30 000 bodov. Skryte nepotrebné krivky alebo znížte počet ich bodov.');
    const xy = (p) => ({ x: p.x, y: -p.y });
    return {
      format: 'KINMO-CAD', version: 1, units: 'mm', name: p.name.slice(0, 100), motion: result.motion,
      referenceOnly: true, warning: `${warning}${options.slotOutlines === true ? ` ${global.KinmoSlotOutline.warning}` : ''}`, estimated: !!p.provenance?.estimated,
      slotGeometry: options.slotOutlines === true ? 'centerlines-and-reference-outlines' : 'centerlines',
      entities: entities.map((e) => ({
        ...e, ...(e.points ? { points: e.points.map(xy) } : {}),
        ...(e.center ? { center: xy(e.center) } : {}), ...(e.at ? { at: xy(e.at) } : {}),
      })),
    };
  }

  function dxf(project, result, options = {}) {
    const snapshot = cadSnapshot(project, result, options), lines = [];
    const pair = (code, value) => lines.push(String(code), String(value));
    const text = (s) => String(s).replace(/[\r\n\x00-\x1f]/g, ' ').replace(/[^\x20-\x7e]/g, (c) => `\\U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`);
    pair(0, 'SECTION'); pair(2, 'HEADER'); pair(9, '$ACADVER'); pair(1, 'AC1015');
    pair(9, '$INSUNITS'); pair(70, 4); pair(9, '$MEASUREMENT'); pair(70, 1); pair(0, 'ENDSEC');
    if (options.slotOutlines === true) pair(999, text(global.KinmoSlotOutline.warning));
    pair(0, 'SECTION'); pair(2, 'TABLES'); pair(0, 'TABLE'); pair(2, 'LAYER');
    const layers = [...new Set(snapshot.entities.map((e) => e.layer))]; pair(70, layers.length);
    for (const layer of layers) { pair(0, 'LAYER'); pair(2, layer); pair(70, 0); pair(62, layer === 'DIMENSIONS' ? 8 : 7); pair(6, 'CONTINUOUS'); }
    pair(0, 'ENDTAB'); pair(0, 'ENDSEC'); pair(0, 'SECTION'); pair(2, 'ENTITIES');
    for (const e of snapshot.entities) {
      if (e.kind === 'polyline') {
        pair(0, 'LWPOLYLINE'); pair(100, 'AcDbEntity'); pair(8, e.layer); pair(100, 'AcDbPolyline'); pair(90, e.points.length); pair(70, e.closed ? 1 : 0);
        for (const p of e.points) { pair(10, p.x); pair(20, p.y); }
      } else if (e.kind === 'circle') {
        pair(0, 'CIRCLE'); pair(100, 'AcDbEntity'); pair(8, e.layer); pair(100, 'AcDbCircle'); pair(10, e.center.x); pair(20, e.center.y); pair(30, 0); pair(40, e.radius);
      } else {
        pair(0, 'TEXT'); pair(100, 'AcDbEntity'); pair(8, e.layer); pair(100, 'AcDbText');
        pair(10, e.at.x); pair(20, e.at.y); pair(30, 0); pair(40, e.height); pair(1, text(e.text));
      }
    }
    pair(0, 'ENDSEC'); pair(0, 'EOF');
    return lines.join('\r\n') + '\r\n';
  }

  function plotSVG(rows, key, label, unit, color = '#c38936', xKey = 'motion', xLabel = 'Poloha pohonu') {
    const valid = rows.filter((r) => Number.isFinite(r[key]) && Number.isFinite(r[xKey]));
    const min = Math.min(0, ...valid.map((r) => r[key])), high = Math.max(0, ...valid.map((r) => r[key])), max = high > min ? high : min + 1;
    const xMin = Math.min(0, ...valid.map((r) => r[xKey])), xMax = Math.max(xMin + 1e-6, ...valid.map((r) => r[xKey]));
    const paths = []; let points = [];
    for (const row of rows) {
      if (row.blocked || !Number.isFinite(row[key]) || !Number.isFinite(row[xKey])) { if (points.length > 1) paths.push(points); points = []; continue; }
      points.push(`${40 + (row[xKey] - xMin) / (xMax - xMin) * 510},${112 - (row[key] - min) / (max - min) * 78}`);
    }
    if (points.length > 1) paths.push(points);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="580" height="160" viewBox="0 0 580 160"><rect width="580" height="160" fill="#ffffff"/><text x="40" y="18" font-family="Roboto" font-size="11" fill="#35485b">${escape(label)} (${escape(unit)})</text>${[0, 1, 2].map((i) => `<line x1="40" y1="${112 - i * 39}" x2="550" y2="${112 - i * 39}" stroke="#dbe2e9"/><text x="32" y="${116 - i * 39}" text-anchor="end" font-family="Roboto" font-size="8" fill="#718291">${escape(fmt(K.lerp(min, max, i / 2), 1))}</text>`).join('')}${paths.map((path) => `<polyline points="${path.join(' ')}" fill="none" stroke="${color}" stroke-width="2"/>`).join('')}<text x="40" y="140" font-family="Roboto" font-size="8">${fmt(xMin)}</text><text x="550" y="140" text-anchor="end" font-family="Roboto" font-size="8">${fmt(xMax)}</text><text x="295" y="140" text-anchor="middle" font-family="Roboto" font-size="8">${escape(xLabel)}</text></svg>`;
  }

  function reportData(project, result, samples, options = {}) {
    const p = K.validateProject(project), range = K.driveRange(p);
    const blocked = samples.filter((s) => s.blocked);
    const forces = options.forceContext ? P.forceCurve(options.forceContext) : [];
    const scene = options.scene;
    if (scene && (typeof scene.svg !== 'string' || !scene.svg.startsWith('<svg') || new TextEncoder().encode(scene.svg).length > 8 * 1024 * 1024 ||
        !Number.isInteger(scene.width) || !Number.isInteger(scene.height) || scene.width < 1 || scene.width > 2000 || scene.height < 1 || scene.height > 4000)) throw new Error('Neplatná lokálna snímka schémy pre report.');
    return {
      project: p, result, samples, range, forces, history: options.history || [], forceError: options.forceError || '',
      date: options.date || new Date().toLocaleString('sk-SK'),
      blocked: blocked.length, maxResidual: Math.max(0, ...samples.map((s) => s.residual)),
      maxPositionResidual: Math.max(0, ...samples.map((s) => s.positionResidual)),
      maxAngularResidual: Math.max(0, ...samples.map((s) => s.angularResidual)),
      drawing: scene?.svg || vectorSVG(p, result, { dimensions: true, trajectories: true, samples, references: options.references, traceSpace: options.traceSpace, labels: false, minimumText: 8 }),
      drawingKind: scene ? 'scene' : 'reference', drawingSize: scene ? { width: scene.width, height: scene.height } : null, drawingImage: null,
      plots: [plotSVG(samples, 'angle', 'Uhol výstupu', '°'), ...(p.kind === 'double-drawer' ? [plotSVG(samples, 'secondaryAngle', 'Uhol tuhého ramena', '°', '#5c86b4')] : []), ...(forces.length ? [plotSVG(forces, 'handForce', 'Vyrovnávacia sila / moment · odhad', range.unit === '°' ? 'N·m' : 'N', '#b9697c')] : []), ...(options.history?.length ? [plotSVG(options.history, 'motion', 'Poloha pohonu v čase · odhad', range.unit, '#5c86b4', 'time', 'Čas (s)')] : [])],
    };
  }

  function dimensionName(dimension) {
    return dimension.name || ({ distance: 'Dĺžka medzi bodmi', horizontal: 'Vodorovná vzdialenosť', vertical: 'Zvislá vzdialenosť', angle: 'Uhol spojnice' })[dimension.type] || 'Kóta';
  }

  function elasticDetails(project, result) {
    const mountName = (ref) => ref ? `${project.elements.find((e) => e.id === ref.elementId)?.name || ref.elementId}.${ref.point}` : 'Voľný bod';
    return project.elements.filter(K.isElastic).map((e) => ({
      parameters: [e.name, fmt(e.diameter), fmt(e.type.startsWith('spring-') ? e.wireDiameter : e.rodDiameter), fmt(e.damping), e.type.startsWith('piston-') ? fmt(e.progression) : '—'],
      mounts: [e.name, mountName(result.poses[e.id]?.mountA || e.mountA), mountName(result.poses[e.id]?.mountB || e.mountB)],
    }));
  }

  function htmlReport(data) {
    const { project: p, result: r, range } = data;
    const table = (headers, rows) => `<table><thead><tr>${headers.map((s) => `<th>${escape(s)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((s) => `<td>${escape(s)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const elastic = p.elements.filter(K.isElastic);
    const details = elasticDetails(p, r);
    const body = `
      <header><div class="eyebrow">KINEMATIKA STUDIO / TECHNICKÝ REPORT</div><h1>${escape(p.name)}</h1><p>${escape(data.date)} · 2D · mm / ° / N / kg</p></header>
      <aside>${escape(warning)}${p.provenance?.estimated ? `<br><strong>Odhadová geometria podľa nekótovaného náčrtu.</strong>` : ''}${p.source?.note ? `<br>${escape(p.source.note)}` : ''}</aside>
      <section><h2>01 / Súhrn</h2>${table(['Údaj', 'Hodnota'], [
        ['Poloha pohonu', `${fmt(r.motion)} ${range.unit}`], ['Rozsah pohonu', `${fmt(range.min)}–${fmt(range.max)} ${range.unit}`],
        ['Počet prvkov / väzieb', `${p.elements.length} / ${p.connections.length}`],
        ['Skontrolované polohy', String(data.samples.length)], ['Blokované polohy', String(data.blocked)],
        ['Maximálna polohová chyba', `${fmt(data.maxPositionResidual, 4)} mm`], ['Maximálna uhlová chyba', `${fmt(data.maxAngularResidual, 4)}°`], ['Režim', p.simulation.mode === 'dynamic' ? 'Odhadová dynamika jedného pohonu' : 'Predpísaná kinematika'],
      ])}</section>
      <section><h2>02 / ${data.drawingKind === 'scene' ? 'Schéma ako na plátne' : 'Referenčný výkres s kótami'}</h2><div class="drawing">${data.drawing}</div><p class="caption">Poloha ${fmt(r.motion)} ${range.unit}. ${data.drawingKind === 'scene' ? 'Aktuálny pohľad, farby a viditeľnosť z aplikácie, bez editačných úchytov a podkladovej fotografie. Report je statický; pohyb uložte cez export GIF.' : 'Profily kulís sú strednice, nie hotové výrobné kontúry.'} Schéma nie je výrobná dokumentácia.</p></section>
      <section><h2>03 / Pohybové a silové profily</h2>${data.plots.map((svg) => `<div class="plot">${svg}</div>`).join('')}${!data.forces.length ? `<p>Silový graf nebol vypočítaný. ${escape(data.forceError)}</p>` : ''}</section>
      <section><h2>04 / Prvky a fyzikálne parametre</h2>${table(['Prvok', 'Typ', 'Dĺžka / dráha (mm)', 'Hmotnosť (kg)', 'Uhol (°)'], p.elements.map((e) => [e.name, labels[e.type], fmt(elementLength(r.poses[e.id])), fmt(e.mass, 3), fmt(r.poses[e.id]?.angle)]))}${parameterRows(p).length ? `<h3>Aktívne parametre modelu</h3>${table(['Parameter', 'Hodnota'], parameterRows(p))}` : ''}</section>
      ${elastic.length ? `<section><h2>05 / Pružiny a piesty</h2>${table(['Prvok', 'L₀ / min / max (mm)', 'Referenčné F (N)', 'k (N/mm)', 'F₀ (N)', 'Aktuálne F (N)'], elastic.map((e) => [e.name, `${fmt(e.restLength)} / ${fmt(e.minLength)} / ${fmt(e.maxLength)}`, fmt(e.force), e.type.startsWith('spring-') ? fmt(P.springRate(e), 4) : '—', fmt(e.preload), fmt(P.axial(e, r.poses[e.id]?.length).signedForce)]))}${table(['Prvok', 'Priemer pružiny / valca (mm)', 'Priemer drôtu / tyče (mm)', 'Osové tlmenie (N·s/m)', 'Progresia piesta'], details.map((d) => d.parameters))}${table(['Prvok', 'Montáž A', 'Montáž B'], details.map((d) => d.mounts))}</section>` : ''}
      <section><h2>06 / Väzby a uložené kóty</h2>${p.connections.length ? table(['Väzba', 'Typ', 'Uzly', 'Hodnota'], p.connections.map((j) => [j.name, E.constraintNames[j.type], `${j.a.elementId}.${j.a.point} / ${j.b.elementId}.${j.b.point}`, ['distance', 'fixed', 'angle'].includes(j.type) ? String(j.value) : '—'])) : '<p>Bez samostatných geometrických väzieb.</p>'}${p.dimensions.length ? table(['Kóta', 'Hodnota', 'Riadenie'], p.dimensions.map((d) => [dimensionName(d), `${fmt(E.dimensionValue(r, d))} ${d.type === 'angle' ? '°' : 'mm'}`, d.constraintId || d.control ? 'Riadiaca' : 'Referenčná'])) : ''}</section>
      <section><h2>07 / Parametre simulácie</h2>${table(['Parameter', 'Hodnota'], simulationRows(p))}<p>Ťažisko a zotrvačnosť sú odhadnuté zo segmentu A–B, ak neboli zadané. Sila F sa meria podľa typu pružného prvku. Silové grafy používajú numerické derivácie polôh a virtuálnu prácu. Aktuálne F členov je statická osová sila, bez rýchlostného tlmenia.</p></section>
      ${data.history.length ? `<section><h2>08 / Časový záznam odhadovej dynamiky</h2>${table(['Čas (s)', `Pohon (${range.unit})`, `Rýchlosť (${range.unit}/s)`], data.history.filter((_, i) => i % Math.max(1, Math.ceil(data.history.length / 60)) === 0 || i === data.history.length - 1).map((s) => [fmt(s.time, 3), fmt(s.motion, 3), fmt(s.velocity / (range.unit === '°' ? K.DEG : .001), 3)]))}</section>` : ''}
      <section><h2>09 / Vzorkované polohy</h2>${table([`Pohon (${range.unit})`, 'Uhol (°)', 'Polohová chyba (mm)', 'Uhlová chyba (°)', 'Stav'], data.samples.filter((_, i) => i % Math.max(1, Math.ceil(data.samples.length / 25)) === 0 || i === data.samples.length - 1).map((s) => [fmt(s.motion), fmt(s.angle), fmt(s.positionResidual, 4), fmt(s.angularResidual, 4), s.blocked ? s.issues.join('; ') : 'Priechodné']))}</section>
      <footer>Lokálne vytvorený report. Údaje neboli odoslané na server. Výsledky overte na fyzickom mechanizme.</footer>`;
    let section = 0;
    const numbered = body.replace(/<h2>\d+ \/ /g, () => `<h2>${String(++section).padStart(2, '0')} / `);
    return `<!doctype html><html lang="sk"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escape(p.name)} · Report</title><style>body{font:12px/1.65 Arial,sans-serif;color:#26384a;background:#fff;max-width:1000px;margin:40px auto;padding:0 28px}h1{font-size:30px;line-height:1.2;margin:10px 0}h2{font-size:16px;border-top:1px solid #dce3e8;padding-top:18px;margin-top:30px}.eyebrow{font-size:10px;letter-spacing:2px;color:#967843}header p,.caption,footer{color:#6d7c88}aside{background:#f8f2e6;border-left:4px solid #bb9148;padding:15px;margin:20px 0;font-size:11px}table{width:100%;border-collapse:collapse;font-size:10px;margin:12px 0}th{text-align:left;background:#eff2f5;color:#405267}th,td{padding:8px;border-bottom:1px solid #dfe6eb;overflow-wrap:anywhere}tr{break-inside:avoid}svg{max-width:100%;height:auto}.drawing{width:100%;border:1px solid #dfe6eb;padding:15px}.drawing svg{display:block;width:100%;max-height:450px}.plot svg{width:100%;max-height:250px}footer{border-top:1px solid #dfe6eb;margin-top:30px;padding:15px 0;font-size:10px}@page{size:A4;margin:16mm}@media print{body{margin:0;padding:0;font-size:10px}header{break-after:avoid}section{break-inside:auto}h2{break-after:avoid}.drawing,.plot{break-inside:avoid}thead{display:table-header-group}a{color:inherit}}</style></head><body>${numbered}</body></html>`;
  }

  function pdfReport(data) {
    const { project: p, result: r, range } = data;
    if (data.drawingKind === 'scene' && (typeof data.drawingImage !== 'string' || data.drawingImage.length > 16 * 1024 * 1024 || !/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/.test(data.drawingImage))) throw new Error('PDF potrebuje dokončenú lokálnu PNG snímku schémy.');
    let section = 0;
    const header = (value) => ({ text: `${String(++section).padStart(2, '0')} / ${value.replace(/^\d+ \/ /, '')}`, style: 'section' });
    const table = (headers, rows, widths) => ({
      table: { headerRows: 1, widths, body: [headers.map((text) => ({ text, bold: true, fillColor: '#eef2f5' })), ...rows.map((row) => row.map((v) => String(v ?? '—')))] },
      fontSize: 8, layout: 'lightHorizontalLines', margin: [0, 5, 0, 14],
    });
    const content = [
      { text: 'KINEMATIKA STUDIO / TECHNICKÝ REPORT', style: 'eyebrow' },
      { text: p.name, style: 'title' },
      { text: `${data.date}  ·  2D  ·  mm / ° / N / kg`, style: 'muted', margin: [0, 0, 0, 16] },
      { text: `${warning}${p.provenance?.estimated ? '\nOdhadová geometria podľa nekótovaného náčrtu.' : ''}${p.source?.note ? `\n${p.source.note}` : ''}`, fontSize: 9, color: '#8d682f', margin: [0, 0, 0, 16] },
      header('01 / Súhrn'),
      table(['Údaj', 'Hodnota'], [
        ['Poloha pohonu', `${fmt(r.motion)} ${range.unit}`], ['Rozsah', `${fmt(range.min)}–${fmt(range.max)} ${range.unit}`],
        ['Prvky / väzby', `${p.elements.length} / ${p.connections.length}`], ['Vzorkované / blokované polohy', `${data.samples.length} / ${data.blocked}`],
        ['Maximálna polohová chyba', `${fmt(data.maxPositionResidual, 4)} mm`], ['Maximálna uhlová chyba', `${fmt(data.maxAngularResidual, 4)}°`], ['Simulácia', p.simulation.mode === 'dynamic' ? 'Odhadová dynamika jedného pohonu' : 'Predpísaná kinematika'],
      ], ['*', '*']),
      header(data.drawingKind === 'scene' ? '02 / Schéma ako na plátne' : '02 / Referenčný výkres s kótami'),
      data.drawingKind === 'scene'
        ? { image: data.drawingImage, fit: [510, 300], margin: [0, 5, 0, 8] }
        : { svg: data.drawing.replace(/width="([\d.]+)mm" height="([\d.]+)mm"/, 'width="$1" height="$2"'), fit: [510, 285], margin: [0, 5, 0, 8] },
      { text: data.drawingKind === 'scene' ? 'Aktuálny pohľad, farby a viditeľnosť z aplikácie, bez editačných úchytov a fotografie. PDF je statické; pohyb uložte cez export GIF. Schéma nie je výrobná dokumentácia.' : 'Kulisy sú strednicové profily. Výkres nie je výrobná dokumentácia.', style: 'muted' },
      header('03 / Pohybové a silové profily'),
      ...data.plots.map((svg) => ({ svg, fit: [510, 145], margin: [0, 4, 0, 10] })),
      ...(!data.forces.length ? [{ text: `Silový graf nebol vypočítaný. ${data.forceError}`, style: 'muted' }] : []),
      header('04 / Prvky a fyzikálne parametre'),
      table(['Prvok', 'Typ', 'Dĺžka / dráha (mm)', 'Hmotnosť (kg)', 'Uhol (°)'], p.elements.map((e) => [e.name, labels[e.type], fmt(elementLength(r.poses[e.id])), fmt(e.mass, 3), fmt(r.poses[e.id]?.angle)]), ['*', 85, 58, 70, 42]),
      ...(parameterRows(p).length ? [
        { text: 'Aktívne parametre modelu', bold: true, fontSize: 10, margin: [0, 8, 0, 5] },
        table(['Parameter', 'Hodnota'], parameterRows(p), ['*', '*']),
      ] : []),
    ];
    const elastic = p.elements.filter(K.isElastic);
    const details = elasticDetails(p, r);
    if (elastic.length) content.push(header('05 / Pružiny a piesty'), table(['Prvok', 'L₀ / min / max (mm)', 'Referenčné F (N)', 'k (N/mm)', 'F₀ (N)', 'Aktuálne F (N)'], elastic.map((e) => [e.name, `${fmt(e.restLength)} / ${fmt(e.minLength)} / ${fmt(e.maxLength)}`, fmt(e.force), e.type.startsWith('spring-') ? fmt(P.springRate(e), 4) : '—', fmt(e.preload), fmt(P.axial(e, r.poses[e.id]?.length).signedForce)]), ['*', 110, 62, 55, 48, 64]),
      table(['Prvok', 'Priemer pružiny / valca (mm)', 'Priemer drôtu / tyče (mm)', 'Osové tlmenie (N·s/m)', 'Progresia piesta'], details.map((d) => d.parameters), ['*', 85, 80, 80, 65]),
      table(['Prvok', 'Montáž A', 'Montáž B'], details.map((d) => d.mounts), ['*', '*', '*']));
    content.push(
      header('06 / Väzby a kóty'),
      p.connections.length ? table(['Väzba', 'Typ', 'Uzly'], p.connections.map((j) => [j.name, E.constraintNames[j.type], `${j.a.elementId}.${j.a.point} / ${j.b.elementId}.${j.b.point}`]), ['*', 100, '*']) : { text: 'Bez samostatných geometrických väzieb.', style: 'muted' },
      ...(p.dimensions.length ? [table(['Kóta', 'Hodnota'], p.dimensions.map((d) => [dimensionName(d), `${fmt(E.dimensionValue(r, d))} ${d.type === 'angle' ? '°' : 'mm'}`]), ['*', '*'])] : []),
      header('07 / Nastavenia simulácie'),
      table(['Parameter', 'Hodnota'], simulationRows(p), ['*', '*']),
      { text: 'Ťažisko a zotrvačnosť sú odhadnuté zo segmentu A–B, ak neboli zadané. Sily sa prepočítavajú virtuálnou prácou a numerickými deriváciami; nejde o overenie reakcií vo väzbách. Aktuálne F členov je statická osová sila bez rýchlostného tlmenia.', style: 'muted' },
      ...(data.history.length ? [header('08 / Časový záznam odhadovej dynamiky'), table(['Čas (s)', `Pohon (${range.unit})`, `Rýchlosť (${range.unit}/s)`], data.history.filter((_, i) => i % Math.max(1, Math.ceil(data.history.length / 60)) === 0 || i === data.history.length - 1).map((s) => [fmt(s.time, 3), fmt(s.motion, 3), fmt(s.velocity / (range.unit === '°' ? K.DEG : .001), 3)]), ['*', '*', '*'])] : []),
      header('09 / Vzorkované polohy'),
      table([`Pohon (${range.unit})`, 'Uhol (°)', 'Polohová chyba (mm)', 'Uhlová chyba (°)', 'Stav'], data.samples.filter((_, i) => i % Math.max(1, Math.ceil(data.samples.length / 25)) === 0 || i === data.samples.length - 1).map((s) => [fmt(s.motion), fmt(s.angle), fmt(s.positionResidual, 4), fmt(s.angularResidual, 4), s.blocked ? s.issues.join('; ') : 'Priechodné']), [60, 50, 80, 80, '*']),
    );
    // Keep titles with drawings and the short simulation-settings table.
    for (let i = content.length - 2; i >= 0; i--) if (content[i].style === 'section' && (content[i + 1].svg || content[i + 1].image || (content[i].text.endsWith('Nastavenia simulácie') && content[i + 1].table))) {
      const count = content[i + 1].image && content[i + 2]?.style === 'muted' ? 3 : 2;
      content.splice(i, count, { stack: content.slice(i, i + count), unbreakable: true });
    }
    return {
      pageSize: 'A4', pageMargins: [40, 42, 40, 42],
      info: { title: `${p.name} · technický report`, author: 'Kinematika Studio', subject: 'Odhadová 2D geometria a dynamika' },
      defaultStyle: { font: 'Roboto', fontSize: 10, color: '#26384a', lineHeight: 1.2 },
      styles: {
        title: { fontSize: 25, bold: true, margin: [0, 10, 0, 6] },
        eyebrow: { fontSize: 8, color: '#9a793f', characterSpacing: 1.3 },
        section: { fontSize: 13, bold: true, color: '#35485b', margin: [0, 18, 0, 7] },
        muted: { fontSize: 8, color: '#6d7c88', margin: [0, 0, 0, 8] },
      },
      footer: { text: 'Kinematika Studio · odhadový model · údaje zostali na zariadení', fontSize: 8, color: '#80909d', alignment: 'center', margin: [0, 14, 0, 0] },
      content,
    };
  }

  function forceCSV(project, samples, context, history = []) {
    const q = (s) => `"${String(s).replace(/"/g, '""')}"`, unit = K.driveRange(project).unit;
    const elastic = project.elements.filter(K.isElastic);
    const rows = [[`pohon_${unit === '°' ? 'deg' : 'mm'}`, 'cas_s', `rychlost_${unit === '°' ? 'deg' : 'mm'}_s`, `vyrovnavacia_${unit === '°' ? 'Nm' : 'N'}`, 'blokovanie', ...elastic.flatMap((e) => [`${e.id}_dlzka_mm`, `${e.id}_sila_N`])].join(';')];
    const states = history.length ? history.map((s) => ({
      ...K.solve(project, s.motion, { profile: context?.profile, forces: false }),
      time: s.time, velocity: s.velocity,
    })) : samples;
    for (const s of states) {
      const velocity = s.velocity || 0, value = context ? P.generalized(context, s.motion, velocity) : null;
      const forces = P.forces(project, s, value?.lengthRates || {});
      rows.push([n(s.motion), s.time == null ? '' : n(s.time), s.velocity == null ? '' : n(velocity / (unit === '°' ? K.DEG : .001)), value ? n(value.handForce) : '', s.blocked ? 1 : 0, ...elastic.flatMap((e) => [n(s.poses[e.id]?.length), n(forces.find((f) => f.id === e.id)?.signedForce)])].map(q).join(';'));
    }
    return '\uFEFF' + rows.join('\r\n');
  }

  global.KinmoExport = Object.freeze({ preferences, nativeFile, serializeNative, serializeProject, parseNative, geometry, geometryBounds, vectorSVG, cadSnapshot, dxf, reportData, htmlReport, pdfReport, forceCSV, warning });
})(globalThis);
