/* Direct manipulation and diagnostics share the same validated project geometry. */
(function (global) {
  'use strict';
  const K = global.Kinematics, E = global.KinmoEditor, I = global.KinmoInteraction;
  const angle = (value) => ((value + 180) % 360 + 360) % 360 - 180;
  const design = (project) => E.design(project, K.driveRange(project).min);
  const bodies = (project, keys) => [...new Set(I.validSelection(project, keys).map((key) => I.target(project, key)?.elementId).filter(Boolean))];
  const descendants = (project, ids) => {
    const result = new Set(ids);
    for (let pass = 0; pass < project.elements.length; pass++) {
      let added = false;
      for (const e of project.elements) if (result.has(e.parentId) && !result.has(e.id)) { result.add(e.id); added = true; }
      if (!added) break;
    }
    return result;
  };
  const carried = (project, e, ids) => {
    while (e?.parentId) {
      if (ids.has(e.parentId)) return true;
      e = project.elements.find((v) => v.id === e.parentId);
    }
    return false;
  };
  function pivot(project, keys, result = design(project)) {
    const target = I.target(project, keys.at(-1)), reference = I.reference(target);
    const point = reference ? K.point(result, reference) : result.poses[target?.elementId]?.a;
    return point ? { x: point.x, y: point.y } : { x: 0, y: 0 };
  }
  function updateAnchors(project, affected) {
    const result = design(project);
    for (const j of project.connections) for (const [r, other] of [[j.a, j.b], [j.b, j.a]]) {
      const e = project.elements.find((v) => v.id === other.elementId), at = K.point(result, r);
      if (affected.has(r.elementId) && e?.role === 'canvas-anchor' && at) { e.x = at.x; e.y = at.y; }
    }
  }
  function transform(project, keys, options, result = design(project)) {
    const p = K.copy(project), ids = new Set(bodies(project, keys));
    const dx = options.dx ?? 0, dy = options.dy ?? 0, rotation = options.angle ?? 0, origin = options.pivot || pivot(project, keys, result);
    if (!ids.size || ![dx, dy, rotation, origin.x, origin.y].every(Number.isFinite)) throw new Error('Vyberte členy a zadajte konečný posun, uhol a bod otáčania.');
    for (const id of ids) {
      const e = p.elements.find((v) => v.id === id);
      if (e.primary) throw new Error('Pôvodná šablóna je chránená. Najskôr vytvorte voľnú kópiu.');
      if (e.locked && !options.allowLocked) throw new Error('Vybraný člen je zamknutý. Najskôr ho odomknite vo Vlastnostiach.');
      if (K.isElastic(e) && (e.mountA || e.mountB || p.connections.some((j) => [j.a, j.b].some((r) => r.elementId === id)))) throw new Error('Pružný prvok má montážne body. Presuňte jeho uchytenia, nie teleso.');
      if (carried(p, e, ids)) continue;
      const pose = result.poses[id], parent = result.poses[e.parentId], at = pose?.controlOrigin || pose?.a;
      if (!at) throw new Error('Vybraný člen nemá platnú polohu.');
      const rotated = K.rotate({ x: at.x - origin.x, y: at.y - origin.y }, rotation);
      const world = { x: origin.x + rotated.x + dx, y: origin.y + rotated.y + dy };
      const parentOrigin = parent?.[e.parentPoint] || parent?.a;
      const local = parent ? K.rotate({ x: world.x - parentOrigin.x, y: world.y - parentOrigin.y }, -parent.angle) : world;
      e.x = local.x; e.y = local.y; e.angle = angle(pose.angle + rotation - (parent?.angle || 0));
      if (e.drive && e.driveMode === 'linear' && e.type !== 'rail') e.driveAngle = angle(e.driveAngle + rotation);
    }
    updateAnchors(p, descendants(p, ids));
    return K.validateProject(p);
  }
  function setLength(project, id, value, fixedEnd = 'a', result = design(project)) {
    const p = K.copy(project), e = p.elements.find((v) => v.id === id), pose = result.poses[id];
    if (!e || e.primary || e.locked || !['link', 'panel', 'ground', 'rail'].includes(e.type) || e.outline.length) throw new Error('Dĺžku úchytom možno meniť na odomknutom jednoduchom člene vo voľnej kópii.');
    if (!Number.isFinite(value) || value < .1 || value > 5000 || !['a', 'b'].includes(fixedEnd)) throw new Error('Dĺžka musí byť 0,1 až 5000 mm; zachovaný koniec musí byť A alebo B.');
    if (fixedEnd === 'b') {
      const world = K.along(pose.b, -value, pose.angle), parent = result.poses[e.parentId], origin = parent?.[e.parentPoint] || parent?.a;
      const local = parent ? K.rotate({ x: world.x - origin.x, y: world.y - origin.y }, -parent.angle) : world;
      e.x = local.x; e.y = local.y;
    }
    e.length = value;
    updateAnchors(p, descendants(p, [id]));
    return K.validateProject(p);
  }
  function constraints(project, result) {
    const elements = new Map(project.elements.map((e) => [e.id, e])), rows = [];
    for (const j of project.connections) {
      const pa = result.poses[j.a.elementId], pb = result.poses[j.b.elementId], type = j.type || 'revolute';
      let a = pa?.[j.a.point], b = pb?.[j.b.point];
      if (j.a.point === 'curve' && b && pa?.path?.length) a = K.nearestOnPath(b, pa.path);
      if (j.b.point === 'curve' && a && pb?.path?.length) b = K.nearestOnPath(a, pb.path);
      let mm = a && b ? (type === 'distance' ? Math.abs(K.distance(a, b) - j.value) : ['angle', 'parallel'].includes(type) ? 0 : K.distance(a, b)) : null;
      let degrees = ['fixed', 'angle', 'parallel'].includes(type) || (type === 'prismatic' && K.hasOrientation(project, j.a.point === 'curve' ? j.b : j.a))
        ? pa && pb ? Math.abs(angle(pb.angle - pa.angle - j.value)) : null : 0;
      if (type === 'revolute' && j.limitMin != null && pa && pb) {
        const raw = pb.angle - pa.angle, relative = angle(raw) === -180 && raw > 0 ? 180 : angle(raw);
        degrees = Math.abs(relative - K.clamp(relative, j.limitMin, j.limitMax));
      }
      if (type === 'prismatic' && j.limitMin != null) {
        const path = (j.a.point === 'curve' ? pa : pb)?.path, point = j.a.point === 'curve' ? pb?.[j.b.point] : pa?.[j.a.point];
        if (path?.length && point) {
          const start = path[0], end = path.at(-1), nearest = K.nearestOnSegment(point, start, end);
          const t = K.clamp(nearest.t * K.distance(start, end), j.limitMin, j.limitMax) / (K.distance(start, end) || 1);
          const limited = { x: K.lerp(start.x, end.x, t), y: K.lerp(start.y, end.y, t) };
          mm = K.distance(point, limited);
          if (j.a.point === 'curve') a = limited; else b = limited;
        }
      }
      // Built-in point pairs document analytic mechanisms, not projection equations.
      const prescribed = !!j.builtin && ![j.a.point, j.b.point].includes('curve');
      if (prescribed) { mm = null; degrees = null; }
      rows.push({
        id: j.id, key: I.jointKey(j.id), name: j.name, type, a, b, mm, degrees, prescribed,
        status: prescribed ? 'prescribed' : mm == null || degrees == null ? 'missing' : Math.max(mm, degrees) > K.TOLERANCE ? 'error' : 'ok',
        elementIds: [j.a.elementId, j.b.elementId], elastic: [j.a, j.b].some((r) => K.isElastic(elements.get(r.elementId))),
      });
    }
    for (const e of project.elements.filter((e) => e.type === 'bearing' && e.slotId)) {
      if (project.connections.some((j) => [j.a, j.b].some((r) => r.elementId === e.id) && [j.a, j.b].some((r) => r.elementId === e.slotId && r.point === 'curve'))) continue;
      const a = result.poses[e.id]?.a, path = result.poses[e.slotId]?.path, b = a && path?.length ? K.nearestOnPath(a, path) : null, mm = b ? K.distance(a, b) : null;
      rows.push({ id: `guide-${e.id}`, key: I.nodeKey({ elementId: e.id, point: 'a' }), name: `${e.name} · vedenie`, type: 'point-path', a, b, mm, degrees: 0, prescribed: false, status: mm == null ? 'missing' : mm > K.TOLERANCE ? 'error' : 'ok', elementIds: [e.id, e.slotId] });
    }
    return rows;
  }
  function diagnose(project, result) {
    const rows = constraints(project, result), freedom = E.freedom(project, result), hints = [], duplicates = [], conflicts = [];
    const groups = new Map();
    for (const j of project.connections.filter((j) => !j.builtin)) {
      const first = `${j.a.elementId}:${j.a.point}`, second = `${j.b.elementId}:${j.b.point}`, reversed = first > second;
      const key = `${j.type}:${[first, second].sort().join('|')}`;
      const value = ['angle', 'parallel', 'fixed', 'prismatic'].includes(j.type) ? angle((reversed ? -1 : 1) * j.value) : j.value;
      const existing = groups.get(key);
      if (existing) (Math.abs(existing.value - value) < .0001 ? duplicates : conflicts).push([existing.id, j.id]);
      else groups.set(key, { id: j.id, value });
    }
    if (project.kind === 'custom') {
      const drivers = project.elements.filter((e) => e.drive);
      if (!drivers.length && project.elements.length) hints.push('Chýba priradený pohon. Statická geometria môže byť platná, ale simulátor nevie, ktorý pohyb má meniť.');
      if (drivers.length > 1) hints.push('Model má viac pohonov. Tento simulátor podporuje iba jeden nezávislý vstup.');
      if (freedom.free) hints.push(`Po určení pohonu zostáva ${freedom.free} voľných súradníc. Doplňte uloženie, ďalší kĺb alebo vedenie. Limity pohybu nenahrádzajú väzbu.`);
      for (const e of project.elements.filter((e) => !e.parentId && !e.locked && !e.drive && ['link', 'panel', 'bearing', 'node'].includes(e.type))) {
        const family = descendants(project, [e.id]);
        const linked = project.connections.some((j) => family.has(j.a.elementId) !== family.has(j.b.elementId));
        if (!linked && !(e.type === 'bearing' && e.slotId)) hints.push(`„${e.name}“ nemá väzbu na iné teleso. Voľný bod potrebuje polohové uloženie; tuhý člen aj určenie orientácie.`);
      }
    }
    if (duplicates.length) hints.push('Opakované väzby medzi rovnakými uzlami sú nadbytočné. Odstránenie kópie nemení ich požadovanú hodnotu.');
    if (conflicts.length) hints.push('Rovnakým uzlom sú predpísané rozdielne hodnoty rovnakej väzby. Tieto požiadavky sú v konflikte.');
    if (rows.some((r) => r.status === 'error')) hints.push('Zvýraznené väzby nie sú v zobrazenej polohe splnené. V editácii sa nevynucujú; v simulácii skontrolujte dĺžky, pevné body, uhly a dorazy.');
    if (rows.some((r) => r.status === 'missing')) hints.push('Niektorá väzba nemá dostupný uzol alebo vodiacu krivku.');
    if (rows.some((r) => r.prescribed)) hints.push('Bodové väzby chránenej šablóny riadi parametrický zákon. Ich samostatné rezíduá sa neodhadujú zo symbolických dvojíc bodov.');
    return { rows, freedom, hints, duplicates, conflicts };
  }
  function snapPoints(project, e, result, midpoint = true) {
    const pose = result.poses[e.id];
    if (!pose) return [];
    const points = I.pointKeys(e).filter((key) => pose[key]).map((key) => ({ elementId: e.id, ref: { elementId: e.id, point: key }, at: pose[key], kind: 'endpoint' }));
    if (midpoint && ['link', 'panel', 'ground', 'rail'].includes(e.type) && K.distance(pose.a, pose.b) > .1) {
      const at = { x: (pose.a.x + pose.b.x) / 2, y: (pose.a.y + pose.b.y) / 2 };
      points.push({ elementId: e.id, at, local: K.localPoint(pose, at), kind: 'midpoint' });
    }
    return points;
  }
  function movingSnapPoints(project, keys, result, wholeBodies) {
    const targets = I.validSelection(project, keys).map((key) => I.target(project, key));
    const full = new Set(targets.filter((t) => t.type === 'link' || wholeBodies && t.type === 'node').map((t) => t.elementId));
    const movable = [...full].filter((id) => {
      const e = project.elements.find((e) => e.id === id);
      return !e.primary && !e.locked && !K.isElastic(e) && !carried(project, e, full);
    });
    const family = descendants(project, movable), points = [];
    for (const e of project.elements.filter((e) => e.visible && family.has(e.id))) points.push(...snapPoints(project, e, result));
    for (const t of targets.filter((t) => t.type === 'node' && !family.has(t.elementId) && !full.has(t.elementId))) {
      const r = I.reference(t), e = t.element, at = K.point(result, r);
      if (at && !e.primary && !K.isElastic(e) && !I.fixed(project, r) && !carried(project, e, full)) points.push({ elementId: e.id, ref: r, at, kind: 'endpoint' });
    }
    return points;
  }
  function findSnap(project, keys, result, delta, options = {}) {
    if (options.enabled !== true) return null;
    const tolerance = options.tolerance ?? 8;
    if (![delta.x, delta.y, tolerance].every(Number.isFinite) || tolerance <= 0) throw new Error('Neplatný posun alebo tolerancia prichytávania.');
    const sources = movingSnapPoints(project, keys, result, !!options.wholeBodies), excluded = new Set(sources.map((s) => s.elementId));
    const roots = new Set(sources.map((s) => I.root(project, project.elements.find((e) => e.id === s.elementId))?.id));
    const candidates = [], destinations = project.elements.filter((e) => e.visible && !excluded.has(e.id) && !roots.has(I.root(project, e)?.id) && !K.isElastic(e));
    const offer = (source, target, point, kind, distance, tier = 0) => {
      const at = { x: source.at.x + delta.x, y: source.at.y + delta.y };
      if (options.axis === 'x' && Math.abs(point.y - at.y) > .00001 || options.axis === 'y' && Math.abs(point.x - at.x) > .00001) return;
      const adjustment = { x: point.x - at.x, y: point.y - at.y };
      const label = ({ endpoint: 'Uzlový bod', midpoint: 'Stred člena', guide: 'Vodiaca krivka', 'alignment-x': 'Zarovnanie X', 'alignment-y': 'Zarovnanie Y' })[kind];
      candidates.push({ source: K.copy(source), target: K.copy(target), point: { x: point.x, y: point.y }, delta: { x: delta.x + adjustment.x, y: delta.y + adjustment.y }, kind, distance, tier, label, priority: options.cursor ? K.distance(source.at, options.cursor) : 0 });
    };
    const targets = destinations.flatMap((e) => snapPoints(project, e, result));
    const guides = destinations.filter((e) => ['slot', 'rail'].includes(e.type)).map((e) => {
      const path = result.poses[e.id]?.path || [];
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const p of path) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
      return { elementId: e.id, path, minX, maxX, minY, maxY };
    });
    for (const source of sources) {
      const at = { x: source.at.x + delta.x, y: source.at.y + delta.y };
      for (const target of targets) {
        const distance = K.distance(at, target.at);
        if (distance <= tolerance) offer(source, target, target.at, target.kind, distance);
        else {
          if (options.axis !== 'y' && Math.abs(at.x - target.at.x) <= tolerance) offer(source, target, { x: target.at.x, y: at.y }, 'alignment-x', Math.abs(at.x - target.at.x), 1);
          if (options.axis !== 'x' && Math.abs(at.y - target.at.y) <= tolerance) offer(source, target, { x: at.x, y: target.at.y }, 'alignment-y', Math.abs(at.y - target.at.y), 1);
        }
      }
      for (const guide of guides) {
        if (guide.path.length < 2 || at.x < guide.minX - tolerance || at.x > guide.maxX + tolerance || at.y < guide.minY - tolerance || at.y > guide.maxY + tolerance) continue;
        const nearest = K.nearestOnPath(at, guide.path);
        if (nearest.distance <= tolerance) offer(source, { elementId: guide.elementId, ref: { elementId: guide.elementId, point: 'curve' }, at: nearest, kind: 'guide' }, nearest, 'guide', nearest.distance);
      }
    }
    const priority = { endpoint: 0, midpoint: 1, guide: 2, 'alignment-x': 3, 'alignment-y': 3 };
    candidates.sort((a, b) => a.tier - b.tier || (Math.abs(a.distance - b.distance) > .00001 ? a.distance - b.distance : priority[a.kind] - priority[b.kind] || a.priority - b.priority));
    return candidates[0] || null;
  }
  function connectSnap(project, preview, type = null) {
    if (!preview || !['endpoint', 'midpoint', 'guide'].includes(preview.kind)) throw new Error('Osové zarovnanie nevytvára kĺb. Vyberte skutočný bod, stred alebo vedenie.');
    const p = K.copy(project);
    const materialize = (descriptor) => {
      if (descriptor.ref) return K.copy(descriptor.ref);
      const host = p.elements.find((e) => e.id === descriptor.elementId), local = descriptor.local;
      if (!host || !local || ![local.x, local.y].every(Number.isFinite)) throw new Error('Stredový bod už nie je dostupný.');
      const node = { ...K.makeElement('node', local.x, local.y), parentId: host.id, parentPoint: 'a', radius: 3, length: 1, role: 'poi', name: `${host.name} · stred prichytenia` };
      p.elements.push(node);
      return { elementId: node.id, point: 'a' };
    };
    const a = materialize(preview.source), b = materialize(preview.target), result = design(p), first = K.point(result, a);
    if (I.root(p, p.elements.find((e) => e.id === a.elementId))?.id === I.root(p, p.elements.find((e) => e.id === b.elementId))?.id) throw new Error('Uzly patria tomu istému tuhému telesu; ďalší kĺb by bol nadbytočný.');
    const path = result.poses[b.elementId]?.path, second = b.point === 'curve' && first && path?.length ? K.nearestOnPath(first, path) : K.point(result, b);
    if (!first || !second || K.distance(first, second) > K.TOLERANCE) throw new Error('Body sa už nezhodujú. Najskôr ich znova prichyťte.');
    if (p.connections.some((j) => [j.a, j.b].some((r) => r.elementId === a.elementId && r.point === a.point) && [j.a, j.b].some((r) => r.elementId === b.elementId && r.point === b.point))) throw new Error('Tieto body už majú väzbu. Jej typ zmeňte cez úpravu kĺbu.');
    const target = p.elements.find((e) => e.id === b.elementId);
    const mode = type || (b.point === 'curve' ? target?.type === 'rail' ? 'prismatic' : 'point-path' : 'revolute');
    if (b.point === 'curve' ? !['prismatic', 'point-path'].includes(mode) : mode !== 'revolute') throw new Error('Typ spojenia nezodpovedá prichytenému bodu.');
    const value = mode === 'prismatic' ? angle(result.poses[b.elementId].angle - result.poses[a.elementId].angle) : 0;
    return I.setJoint(p, a, { type: mode, other: b, value });
  }
  const collectionLimits = Object.freeze({ assembly: 20, revision: 40 });
  const collectionFormat = (kind) => kind === 'assembly' ? 'KINMO-LIBRARY' : 'KINMO-REVISIONS';
  const recordName = (value) => {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > 80 || /[\x00-\x1f\x7f]/.test(value)) throw new Error('Názov musí obsahovať 1 až 80 znakov bez riadiacich znakov.');
    return value.trim();
  };
  function bounded(value) {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    if (new TextEncoder().encode(text).length > 2 * 1024 * 1024) throw new Error('Knižnica alebo verzie prekračujú 2 MB. Najskôr exportujte a odstráňte nepotrebné záznamy.');
    return text;
  }
  function normalizeRecord(input, kind) {
    if (!Object.hasOwn(collectionLimits, kind) || !input || input.kind !== kind || input.recordVersion !== 1 || typeof input.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(input.id) || ['constructor', 'prototype', '__proto__'].includes(input.id)) throw new Error('Nepodporovaný záznam knižnice alebo verzie.');
    if (typeof input.projectId !== 'string' || input.projectId.length > 100 || typeof input.createdAt !== 'string' || !Number.isFinite(Date.parse(input.createdAt)) || new Date(input.createdAt).toISOString() !== input.createdAt) throw new Error('Záznam nemá platný projekt alebo dátum.');
    if (input.file?.format !== 'KINMO') throw new Error('Záznam musí obsahovať úplný natívny projekt .kinmo.');
    const parsed = global.KinmoExport.parseNative(bounded(input.file));
    if (kind === 'assembly' && (parsed.project.kind !== 'custom' || !parsed.project.elements.length)) throw new Error('Knižnica obsahuje iba neprázdne nezávislé voľné podzostavy, nie chránené šablóny.');
    if (kind === 'revision' && parsed.project.id !== input.projectId) throw new Error('Verzia odkazuje na iný projekt ako jej snímka.');
    return { recordVersion: 1, kind, id: input.id, projectId: input.projectId, name: recordName(input.name), createdAt: input.createdAt, file: global.KinmoExport.nativeFile(parsed.project, parsed) };
  }
  function normalizeCollection(input, kind) {
    if (!Object.hasOwn(collectionLimits, kind)) throw new Error('Nepodporovaná kolekcia.');
    const value = JSON.parse(bounded(input));
    if (value?.format !== collectionFormat(kind) || value.formatVersion !== 1 || !Array.isArray(value.records) || value.records.length > collectionLimits[kind]) throw new Error(`Neplatná kolekcia alebo viac než ${collectionLimits[kind]} záznamov.`);
    const records = value.records.map((r) => normalizeRecord(r, kind)), ids = new Set();
    for (const r of records) { if (ids.has(r.id)) throw new Error('Kolekcia obsahuje duplicitné záznamy.'); ids.add(r.id); }
    return records;
  }
  function serializeCollection(records, kind) {
    const envelope = { format: collectionFormat(kind), formatVersion: 1, records };
    const normalized = normalizeCollection(envelope, kind);
    return bounded({ ...envelope, records: normalized });
  }
  function mergeCollection(current, incoming, kind) {
    const existing = normalizeCollection({ format: collectionFormat(kind), formatVersion: 1, records: current }, kind);
    const additions = normalizeCollection(incoming, kind), ids = new Set(existing.map((r) => r.id));
    for (const record of additions) {
      while (ids.has(record.id)) record.id = K.uid();
      ids.add(record.id);
    }
    return normalizeCollection({ format: collectionFormat(kind), formatVersion: 1, records: [...additions, ...existing] }, kind);
  }
  function captureAssembly(project, keys, name, workspace = {}) {
    const original = K.validateProject(project);
    if (original.kind !== 'custom') throw new Error('Na uloženie podzostavy najskôr vytvorte voľnú kópiu šablóny.');
    const ids = bodies(original, keys);
    for (const key of keys) {
      const t = I.target(original, key);
      if (t?.type === 'joint') ids.push(t.joint.a.elementId, t.joint.b.elementId);
    }
    if (!ids.length) throw new Error('Najskôr vyberte členy, uzly alebo ich vnútorné väzby.');
    const included = descendants(original, ids), result = design(original), p = K.copy(original);
    for (const j of original.connections) for (const [r, other] of [[j.a, j.b], [j.b, j.a]]) if (included.has(r.elementId) && original.elements.find((e) => e.id === other.elementId)?.role === 'canvas-anchor') included.add(other.elementId);
    p.id = K.uid(); p.name = recordName(name); p.controls = null; p.simulation.mode = 'kinematic';
    p.elements = p.elements.filter((e) => included.has(e.id));
    for (const e of p.elements) {
      const pose = result.poses[e.id];
      if (!pose) throw new Error('Vybraný člen nemá dostupnú návrhovú geometriu.');
      if (e.parentId && !included.has(e.parentId)) {
        const at = pose.controlOrigin || pose.a;
        e.x = at.x; e.y = at.y; e.angle = angle(pose.angle); e.parentId = ''; e.parentPoint = 'a';
      }
      if (e.slotId && !included.has(e.slotId)) e.slotId = '';
      if (K.isElastic(e)) {
        e.x = pose.a.x; e.y = pose.a.y; e.angle = angle(pose.angle); e.length = Math.max(.1, pose.length);
        for (const key of ['mountA', 'mountB']) if (e[key] && !included.has(e[key].elementId)) e[key] = null;
      }
    }
    p.connections = p.connections.filter((j) => included.has(j.a.elementId) && included.has(j.b.elementId));
    const joints = new Set(p.connections.map((j) => j.id)), allowed = (r) => !r?.elementId || included.has(r.elementId);
    p.dimensions = p.dimensions.filter((d) => allowed(d.a) && allowed(d.b) && [d.a, d.b, d.control].some((r) => r?.elementId && included.has(r.elementId)));
    for (const d of p.dimensions) {
      if (d.constraintId && !joints.has(d.constraintId)) d.constraintId = '';
      if (d.control && !included.has(d.control.elementId)) d.control = null;
    }
    p.trajectories = p.trajectories.filter((t) => included.has(t.reference.elementId));
    const origin = pivot(original, keys, result);
    for (const e of p.elements.filter((e) => !e.parentId)) { e.x -= origin.x; e.y -= origin.y; }
    for (const d of p.dimensions) for (const r of [d.a, d.b]) if (!r.elementId) { r.x -= origin.x; r.y -= origin.y; }
    const file = global.KinmoExport.nativeFile(p, { workspace: { ...workspace, mode: 'edit' }, motion: K.driveRange(p).min });
    return normalizeRecord({ recordVersion: 1, kind: 'assembly', id: K.uid(), projectId: original.id, name: p.name, createdAt: new Date().toISOString(), file }, 'assembly');
  }
  function insertAssembly(project, record, at, keepDrive = true) {
    if (!at || ![at.x, at.y].every(Number.isFinite)) throw new Error('Zadajte platný bod vloženia X / Y.');
    const p = K.copy(K.validateProject(project)), source = K.copy(normalizeRecord(record, 'assembly').file.project);
    const elements = new Map(source.elements.map((e) => [e.id, K.uid()])), joints = new Map(source.connections.map((j) => [j.id, K.uid()]));
    const driver = source.elements.find((e) => e.drive), preserveDrive = !!driver && keepDrive && p.kind === 'custom' && !p.elements.some((e) => e.drive);
    const remap = (r) => {
      if (!r) return;
      if (r.elementId) r.elementId = elements.get(r.elementId);
      else { r.x += at.x; r.y += at.y; }
    };
    for (const e of source.elements) {
      e.id = elements.get(e.id);
      if (e.parentId) e.parentId = elements.get(e.parentId); else { e.x += at.x; e.y += at.y; }
      if (e.slotId) e.slotId = elements.get(e.slotId);
      remap(e.mountA); remap(e.mountB); e.drive = e.drive && preserveDrive;
    }
    for (const j of source.connections) { j.id = joints.get(j.id); remap(j.a); remap(j.b); }
    for (const d of source.dimensions) {
      d.id = K.uid(); remap(d.a); remap(d.b);
      if (d.control) d.control.elementId = elements.get(d.control.elementId);
      if (d.constraintId) d.constraintId = joints.get(d.constraintId);
    }
    for (const t of source.trajectories) { t.id = K.uid(); remap(t.reference); }
    if (preserveDrive) for (const key of driver.type === 'rail' || driver.driveMode === 'linear' ? ['travelMin', 'travelMax'] : ['rotationMin', 'rotationMax']) p.parameters[key] = source.parameters[key];
    p.elements.push(...source.elements); p.connections.push(...source.connections); p.dimensions.push(...source.dimensions); p.trajectories.push(...source.trajectories);
    return K.validateProject(p);
  }
  function createRevision(project, name, options = {}) {
    const p = K.validateProject(project);
    return normalizeRecord({ recordVersion: 1, kind: 'revision', id: K.uid(), projectId: p.id, name: recordName(name), createdAt: new Date().toISOString(), file: global.KinmoExport.nativeFile(p, options) }, 'revision');
  }
  function restoreRevision(record) {
    return global.KinmoExport.parseNative(normalizeRecord(record, 'revision').file);
  }
  function compareDimensions(before, after) {
    const measure = (input) => {
      const p = K.validateProject(input), result = design(p), rows = new Map();
      const add = (key, label, value, unit = 'mm') => { if (Number.isFinite(value)) rows.set(key, { key, label, value, unit }); };
      const parameterNames = { travelMin: 'Začiatok zdvihu', travelMax: 'Koniec zdvihu', rotationMin: 'Začiatok otáčania', rotationMax: 'Koniec otáčania', frameLength: 'Dĺžka korpusu', frameHeight: 'Výška korpusu', panelLength: 'Dĺžka čela', panelThickness: 'Hrúbka čela', slotWidth: 'Šírka kulisy', bearingOffset: 'Odsadenie ložiska', bearingRadius: 'Polomer ložiska', crankLength: 'Dĺžka kľuky', couplerLength: 'Dĺžka spojky', rockerLength: 'Dĺžka výstupu', rodLength: 'Dĺžka ojnice' };
      for (const [key, value] of Object.entries(p.parameters)) {
        if (p.kind === 'custom' && !['travelMin', 'travelMax', 'rotationMin', 'rotationMax'].includes(key)) continue;
        add(`parameter:${key}`, `Parameter · ${parameterNames[key] || key}`, value, /angle|rotation/i.test(key) ? '°' : key === 'smoothness' ? '' : 'mm');
      }
      const propertyNames = { length: 'dĺžka', width: 'šírka', radius: 'polomer', slotWidth: 'šírka drážky', stroke: 'zdvih', minLength: 'minimum dĺžky', maxLength: 'maximum dĺžky', restLength: 'voľná dĺžka', diameter: 'priemer', rodDiameter: 'priemer tyče', wireDiameter: 'priemer drôtu' };
      for (const e of p.elements) {
        const pose = result.poses[e.id], origin = pose?.controlOrigin || pose?.a;
        if (origin) { add(`element:${e.id}:x`, `${e.name} · svetové X`, origin.x); add(`element:${e.id}:y`, `${e.name} · svetové Y`, origin.y); }
        if (!['node', 'bearing'].includes(e.type)) add(`element:${e.id}:angle`, `${e.name} · orientácia`, pose?.angle, '°');
        const fields = ['node', 'bearing'].includes(e.type) ? ['radius'] : e.type === 'slot' ? ['length', 'slotWidth'] : e.type === 'rail' ? ['length', 'width', 'stroke'] : K.isElastic(e) ? ['length', 'minLength', 'maxLength', 'restLength', 'diameter', ...(e.type.startsWith('piston-') ? ['rodDiameter'] : ['wireDiameter'])] : ['length', 'width'];
        for (const key of fields) {
          const value = key === 'length' ? pose?.path ? pose.path.reduce((total, at, i) => total + (i ? K.distance(at, pose.path[i - 1]) : 0), 0) : pose?.length : e.primary && e.type === 'panel' && key === 'width' ? p.parameters.panelThickness : e.primary && e.type === 'bearing' && key === 'radius' ? p.parameters.bearingRadius : e.primary && key === 'slotWidth' ? e.role === 'rearSlot' ? 8 : p.parameters.slotWidth : e[key];
          add(`element:${e.id}:${key}`, `${e.name} · ${propertyNames[key]}`, value);
        }
      }
      for (const d of p.dimensions) add(`dimension:${d.id}`, `Kóta · ${d.name || d.id}`, E.dimensionValue(result, d), d.type === 'angle' ? '°' : 'mm');
      for (const j of p.connections) {
        if (['distance', 'angle', 'parallel', 'fixed'].includes(j.type)) add(`joint:${j.id}:value`, `Väzba · ${j.name}`, j.value, j.type === 'distance' ? 'mm' : '°');
        if (j.limitMin != null) for (const key of ['limitMin', 'limitMax']) add(`joint:${j.id}:${key}`, `${j.name} · ${key === 'limitMin' ? 'dolný doraz' : 'horný doraz'}`, j[key], j.type === 'prismatic' ? 'mm' : '°');
      }
      return rows;
    };
    const a = measure(before), b = measure(after), keys = new Set([...a.keys(), ...b.keys()]);
    return [...keys].map((key) => {
      const first = a.get(key), second = b.get(key), sameUnit = first && second && first.unit === second.unit;
      const delta = sameUnit ? second.value - first.value : null;
      return { key, label: (second || first).label, unit: (second || first).unit, before: first?.value ?? null, after: second?.value ?? null, delta, status: !first ? 'added' : !second ? 'removed' : !sameUnit || Math.abs(delta) > .000001 ? 'changed' : 'same' };
    });
  }
  global.KinmoWorkbench = Object.freeze({
    bodies, descendants, pivot, transform, setLength, constraints, diagnose, findSnap, connectSnap,
    collectionLimits, normalizeRecord, normalizeCollection, serializeCollection, mergeCollection,
    captureAssembly, insertAssembly, createRevision, restoreRevision, compareDimensions,
  });
})(globalThis);
