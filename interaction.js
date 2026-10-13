/* Canvas identities and atomic editing operations. No DOM or project mutation. */
(function (global) {
  'use strict';
  const K = global.Kinematics, E = global.KinmoEditor;
  const nodeKey = (r) => `n:${r.elementId}:${r.point}`;
  const elementKey = (id) => `e:${id}`;
  const jointKey = (id) => `j:${id}`;
  const dimensionKey = (id) => `d:${id}`;
  const controlKey = (id, index) => `p:${id}:control:${index}`;
  const outlineKey = (id, index) => `p:${id}:outline:${index}`;
  const pathKey = (id) => `p:${id}:path`;
  const same = (a, b) => a?.elementId === b?.elementId && a?.point === b?.point;
  const pointKeys = K.pointKeys;
  const poseOf = (p) => E.design(p, K.driveRange(p).min);
  const controlPoints = (p, e) => e?.primary && p.kind === 'drawer' && e.id === 'slot-1' ? p.controls || K.defaultControls(p.parameters) : e?.controls || [];
  const mutable = (e) => {
    if (!e || e.primary) throw new Error('Pôvodná šablóna je chránená. Najskôr vytvorte voľnú kópiu.');
    return e;
  };
  function validateEdit(p) {
    if (p.motionPlan && (p.motionPlan.unit !== K.driveRange(p).unit || p.kind === 'custom' && !p.elements.some((e) => e.drive))) p.motionPlan = null;
    return K.validateProject(p);
  }
  function target(project, key) {
    if (!key) return null;
    if (key.startsWith('d:')) {
      const dimension = project.dimensions.find((d) => d.id === key.slice(2));
      return dimension ? { type: 'dimension', id: dimension.id, dimension } : null;
    }
    if (key.startsWith('j:')) {
      const joint = project.connections.find((j) => j.id === key.slice(2));
      return joint ? { type: 'joint', id: joint.id, joint } : null;
    }
    if (key.startsWith('n:')) {
      const [, elementId, point] = key.split(':'), element = project.elements.find((e) => e.id === elementId);
      return element && pointKeys(element).includes(point) ? { type: 'node', id: key, elementId, point, element } : null;
    }
    if (key.startsWith('p:')) {
      const [, elementId, kind, value] = key.split(':'), element = project.elements.find((e) => e.id === elementId), index = Number(value);
      if (!element) return null;
      if (kind === 'path') return element.type === 'slot' ? { type: 'path', id: key, elementId, element } : null;
      const points = kind === 'control' && element.type === 'slot' ? controlPoints(project, element) : kind === 'outline' ? element.outline : null;
      return points && Number.isInteger(index) && index >= 0 && index < points.length ? { type: kind, id: key, elementId, element, index } : null;
    }
    const id = key.startsWith('e:') ? key.slice(2) : key, element = project.elements.find((e) => e.id === id);
    return element ? { type: 'link', id, elementId: id, element } : null;
  }
  const validSelection = (p, ids) => [...new Set(ids)].filter((id) => target(p, id));
  const select = (ids, key, additive = false) => !key ? [] : !additive ? [key] : ids.includes(key) ? ids.filter((id) => id !== key) : [...ids, key];
  const reference = (t) => t?.type === 'node' ? { elementId: t.elementId, point: t.point } : t?.type === 'joint' ? K.copy(t.joint.a.point === 'curve' ? t.joint.b : t.joint.a) : null;
  function root(project, e) {
    return rootReference(project, e).body;
  }
  function rootReference(project, e, point) {
    while (e?.parentId) { point = e.parentPoint; e = project.elements.find((v) => v.id === e.parentId); }
    return { body: e, point };
  }
  const railDriven = (p, e, point) => {
    if (e?.movingRail) return e.drive && ['a', 'b'].includes(point);
    return e?.primary && (e.role === 'carrier' || p.kind === 'drawer' && point === 'b') || (e?.drive || e?.primary) && K.carriagePoints.includes(point);
  };
  function fixed(project, r) {
    const e = project.elements.find((v) => v.id === r.elementId), { body, point: rootPoint } = rootReference(project, e, r.point);
    if (!body) return false;
    if (body.type === 'rail' && !railDriven(project, body, rootPoint)) return true;
    if (body.type === 'ground' || (!body.primary && body.locked && !body.drive) || body.type === 'slot') return true;
    if (e === body && body.drive && body.driveMode === 'rotary' && r.point === body.drivePivot) return true;
    return project.connections.some((j) => ['revolute', 'fixed'].includes(j.type || 'revolute') && [j.a, j.b].some((a, i) => {
      if (!same(a, r)) return false;
      const other = root(project, project.elements.find((v) => v.id === [j.b, j.a][i].elementId));
      return other?.type === 'ground' || (!other?.primary && other?.locked);
    }));
  }
  function status(project, r, samples = []) {
    const { body: e, point } = rootReference(project, project.elements.find((v) => v.id === r.elementId), r.point);
    if (e?.type === 'rail' ? railDriven(project, e, point) : e?.drive || e?.primary && ['input', 'carrier'].includes(e.role)) return 'driven';
    if (e?.primary && samples.length) {
      const first = K.point(samples[0], r);
      return first && samples.every((s) => K.point(s, r) && K.distance(first, K.point(s, r)) < K.TOLERANCE) ? 'fixed' : 'free';
    }
    return fixed(project, r) ? 'fixed' : 'free';
  }
  function removeConnections(p, ids) {
    const removed = new Set(ids);
    const records = p.connections.filter((v) => removed.has(v.id));
    for (const j of records) if (j.builtin) throw new Error('Vstavanú väzbu upravujte vo voľnej kópii.');
    p.connections = p.connections.filter((j) => !removed.has(j.id));
    for (const j of records) {
      if (![j.a.point, j.b.point].includes('curve')) continue;
      const guide = j.a.point === 'curve' ? j.a : j.b, r = j.a.point === 'curve' ? j.b : j.a, e = p.elements.find((e) => e.id === r.elementId);
      if (e?.slotId === guide.elementId && !p.connections.some((j) => (same(j.a, r) && same(j.b, guide)) || (same(j.b, r) && same(j.a, guide)))) e.slotId = '';
    }
    for (const d of p.dimensions) if (removed.has(d.constraintId)) d.constraintId = '';
  }
  function cleanAnchors(p) {
    const used = (id) => p.connections.some((j) => [j.a, j.b].some((r) => r.elementId === id)) ||
      p.elements.some((e) => e.parentId === id || [e.mountA, e.mountB].some((r) => r?.elementId === id)) ||
      p.dimensions.some((d) => [d.a, d.b, d.control].some((r) => r?.elementId === id)) || p.trajectories.some((t) => t.reference.elementId === id);
    p.elements = p.elements.filter((e) => e.role !== 'canvas-anchor' || used(e.id));
  }
  function anchor(p, r, at) {
    const e = { ...K.makeElement('node', at.x, at.y), locked: true, visible: false, radius: 3, role: 'canvas-anchor', name: 'Ukotvenie uzla' };
    p.elements.push(e);
    p.connections.push({ id: K.uid(), a: K.copy(r), b: { elementId: e.id, point: 'a' }, type: 'revolute', value: 0, builtin: false, name: 'Pevný bod, voľné otáčanie' });
  }
  function detach(p, e, poses) {
    if (!e.parentId) return;
    const pose = poses[e.id];
    e.x = (pose.controlOrigin || pose.a).x; e.y = (pose.controlOrigin || pose.a).y; e.angle = pose.angle; e.parentId = ''; e.parentPoint = 'a';
  }
  function storePose(e, result) {
    const pose = result.poses[e.id], parent = result.poses[e.parentId], origin = pose.controlOrigin || pose.a;
    const at = parent ? K.rotate({ x: origin.x - parent[e.parentPoint].x, y: origin.y - parent[e.parentPoint].y }, -parent.angle) : origin;
    e.x = at.x; e.y = at.y; e.angle = pose.angle - (parent?.angle || 0);
    if (e.type === 'rail') e.carriageOffset = K.localPoint({ a: pose.a, angle: pose.angle }, pose.c).x;
  }
  function setRailMotion(project, id, moving, result = poseOf(project)) {
    const p = K.copy(project), e = mutable(p.elements.find((v) => v.id === id));
    if (e.type !== 'rail' || e.parentId || p.kind !== 'custom') throw new Error('Režim samostatného vedenia upravte vo vlastnom modeli alebo vo voľnej kópii.');
    if (p.elements.some((v) => v.drive && v.id !== id)) throw new Error('Vedenie potrebuje jediný lineárny pohon. Najskôr vypnite druhý pohon.');
    storePose(e, result); e.movingRail = !!moving; e.drive = true; e.locked = false;
    // Rebase the drive so switching modes retains the displayed geometry at the current input.
    const range = K.driveRange(p), travel = ((result.motion ?? range.min) - range.min) / Math.max(K.EPS, range.max - range.min) * e.stroke;
    if (moving) { const offset = K.along({ x: 0, y: 0 }, travel, e.angle); e.x += offset.x; e.y += offset.y; }
    e.carriageOffset -= travel;
    const released = moving ? ['a', 'b'] : K.carriagePoints;
    removeConnections(p, p.connections.filter((j) => ['revolute', 'fixed'].includes(j.type) && [j.a, j.b].some((r, i) => {
      if (r.elementId !== id || !released.includes(r.point)) return false;
      const other = root(p, p.elements.find((v) => v.id === [j.b, j.a][i].elementId));
      return other?.locked || other?.type === 'ground';
    })).map((j) => j.id));
    cleanAnchors(p); return validateEdit(p);
  }
  function addNode(project, at, locked = false) {
    const p = K.copy(project);
    p.elements.push({ ...K.makeElement('node', at.x, at.y), length: 1, radius: 3, locked, name: locked ? 'Pevný bod' : 'Voľný uzol' });
    return validateEdit(p);
  }
  function disconnect(project, r, result = poseOf(project)) {
    const p = K.copy(project), e = mutable(p.elements.find((v) => v.id === r.elementId));
    removeConnections(p, p.connections.filter((j) => same(j.a, r) || same(j.b, r)).map((j) => j.id));
    if (['bearing', 'node'].includes(e.type)) { detach(p, e, result.poses); e.slotId = ''; }
    cleanAnchors(p);
    return validateEdit(p);
  }
  function disconnectBody(project, id, result = poseOf(project)) {
    const p = K.copy(project), e = mutable(p.elements.find((v) => v.id === id)), family = new Set([id]);
    for (let pass = 0; pass < p.elements.length; pass++) for (const child of p.elements) if (family.has(child.parentId)) family.add(child.id);
    removeConnections(p, p.connections.filter((j) => [j.a, j.b].some((r) => family.has(r.elementId))).map((j) => j.id));
    detach(p, e, result.poses);
    for (const member of p.elements.filter((v) => family.has(v.id))) if (member.type === 'bearing') member.slotId = '';
    cleanAnchors(p);
    return validateEdit(p);
  }
  function toggleBodyFixed(project, id, result = poseOf(project)) {
    const p = K.copy(project), e = mutable(p.elements.find((v) => v.id === id));
    if (K.isElastic(e) || ['rail', 'slot'].includes(e.type)) throw new Error('Uloženie vedenia alebo pružného prvku upravte cez jeho uzly a montážne väzby.');
    const shouldFix = !(e.locked || e.type === 'ground');
    detach(p, e, result.poses); storePose(e, result); e.drive = false; e.locked = shouldFix;
    if (!shouldFix && e.type === 'ground') e.type = 'link';
    if (!shouldFix) removeConnections(p, p.connections.filter((j) => [j.a, j.b].some((r) => r.elementId === id) && [j.a, j.b].some((r) => p.elements.find((v) => v.id === r.elementId)?.role === 'canvas-anchor')).map((j) => j.id));
    cleanAnchors(p); return validateEdit(p);
  }
  function setJoint(project, r, options) {
    if (options.type === 'free') return disconnect(project, r);
    const p = K.copy(project);
    mutable(p.elements.find((e) => e.id === r.elementId));
    const other = options.other;
    if (!other || other.elementId === r.elementId) throw new Error('Vyberte bod alebo vedenie na inom telese.');
    let j = options.id ? p.connections.find((v) => v.id === options.id) : p.connections.find((v) => (same(v.a, r) && same(v.b, other)) || (same(v.b, r) && same(v.a, other)));
    if (j?.builtin) throw new Error('Vstavanú väzbu upravujte vo voľnej kópii.');
    if (!j) { j = { id: K.uid() }; p.connections.push(j); }
    else if (j.type !== options.type || !((same(j.a, r) && same(j.b, other)) || (same(j.a, other) && same(j.b, r)))) {
      removeConnections(p, [j.id]); p.connections.push(j); j.limitMin = null; j.limitMax = null;
    } else if (j.type === 'revolute' && !same(j.a, r) && j.limitMin != null) {
      [j.limitMin, j.limitMax] = [-j.limitMax, -j.limitMin];
    }
    Object.assign(j, { a: K.copy(r), b: K.copy(other), type: options.type, value: options.value ?? 0, name: E.constraintNames[options.type], builtin: false });
    cleanAnchors(p);
    return validateEdit(p);
  }
  function toggleFixed(project, references, result = poseOf(project)) {
    const rail = references.length === 1 && project.elements.find((e) => e.id === references[0].elementId);
    if (rail?.type === 'rail' && !rail.primary && fixed(project, references[0])) {
      if (['a', 'b'].includes(references[0].point)) return setRailMotion(project, rail.id, true, result);
      if (rail.movingRail && K.carriagePoints.includes(references[0].point)) return setRailMotion(project, rail.id, false, result);
    }
    const p = K.copy(project), shouldFix = !references.every((r) => fixed(project, r));
    // Stopping a motor freezes its displayed pose and retains its ground pivot.
    for (const driver of p.elements.filter((e) => e.drive && !e.primary)) {
      if (!shouldFix || !references.some((r) => root(p, p.elements.find((e) => e.id === r.elementId))?.id === driver.id &&
        (driver.driveMode === 'linear' || K.distance(K.point(result, r), result.poses[driver.id][driver.drivePivot]) > K.EPS))) continue;
      const pivot = { elementId: driver.id, point: driver.drivePivot };
      const supported = p.connections.some((j) => ['revolute', 'fixed'].includes(j.type) && (same(j.a, pivot) || same(j.b, pivot)) && fixed(p, same(j.a, pivot) ? j.b : j.a));
      storePose(driver, result); driver.drive = false;
      if (driver.driveMode === 'rotary' && !supported) anchor(p, pivot, K.point(result, pivot));
    }
    for (const r of references) {
      const e = mutable(p.elements.find((v) => v.id === r.elementId));
      if (shouldFix && fixed(p, r)) continue;
      if (!shouldFix && !fixed(p, r)) continue;
      const parent = root(p, e);
      if ((shouldFix && !e.parentId) || (e.drive && e.driveMode === 'rotary' && e.drivePivot === r.point)) storePose(e, result);
      if (!shouldFix && e.parentId && (parent.locked || parent.type === 'ground') && ['node', 'bearing'].includes(e.type)) detach(p, e, result.poses);
      if (!shouldFix && e.type === 'rail' && K.carriagePoints.includes(r.point)) {
        if (p.kind !== 'custom' || p.elements.some((v) => v.drive && v.id !== e.id)) throw new Error('Obnovenie vozíka vyžaduje vlastný model bez ďalšieho nezávislého pohonu.');
        e.drive = true;
      } else if (['node', 'bearing'].includes(e.type) && !e.parentId) { e.locked = shouldFix; if (shouldFix) e.drive = false; }
      else if (shouldFix) {
        if (e.drive) e.drive = false;
        anchor(p, r, K.point(result, r));
      } else {
        if (e.drive && e.driveMode === 'rotary' && e.drivePivot === r.point) e.drive = false;
        if (e.locked || e.type === 'ground') {
          if (['rail', 'slot'].includes(e.type)) throw new Error('Vedenie je pevné teleso. Uvoľnite pripojený posúvač, nie samotné vedenie.');
          e.locked = false;
          if (e.type === 'ground') e.type = 'link';
          for (const key of pointKeys(e).filter((key) => key !== r.point)) anchor(p, { elementId: e.id, point: key }, result.poses[e.id][key]);
        }
      }
      if (!shouldFix) removeConnections(p, p.connections.filter((j) => {
        if (!['revolute', 'fixed'].includes(j.type) || (!same(j.a, r) && !same(j.b, r))) return false;
        const other = root(p, p.elements.find((v) => v.id === (same(j.a, r) ? j.b : j.a).elementId));
        return other?.locked || other?.type === 'ground';
      }).map((j) => j.id));
    }
    cleanAnchors(p);
    return validateEdit(p);
  }
  function deleteSelection(project, keys, result = poseOf(project)) {
    const p = K.copy(project), removed = new Set(), joints = [], dimensions = new Set(), parts = [];
    for (const key of new Set(keys)) {
      const t = target(p, key); if (!t) continue;
      if (t.type === 'joint') joints.push(t.id);
      else if (t.type === 'dimension') dimensions.add(t.id);
      else if (['control', 'outline'].includes(t.type)) parts.push(t);
      else removed.add(mutable(t.element).id);
    }
    for (const t of parts.sort((a, b) => b.index - a.index)) if (!removed.has(t.elementId)) erasePart(mutable(p.elements.find((e) => e.id === t.elementId)), t.index, t.type === 'outline');
    const owned = p.dimensions.filter((d) => dimensions.has(d.id)).map((d) => d.constraintId).filter(Boolean);
    p.dimensions = p.dimensions.filter((d) => !dimensions.has(d.id));
    joints.push(...owned.filter((id) => !p.dimensions.some((d) => d.constraintId === id) && p.connections.some((j) => j.id === id && !j.builtin)));
    removeConnections(p, [...joints, ...p.connections.filter((j) => [j.a, j.b].some((r) => removed.has(r.elementId))).map((j) => j.id)]);
    for (const e of p.elements) {
      if (removed.has(e.parentId)) detach(p, e, result.poses);
      if (removed.has(e.slotId)) e.slotId = '';
      for (const key of ['mountA', 'mountB']) if (removed.has(e[key]?.elementId)) e[key] = null;
    }
    p.elements = p.elements.filter((e) => !removed.has(e.id));
    p.dimensions = p.dimensions.filter((d) => ![d.a, d.b, d.control].some((r) => removed.has(r?.elementId)));
    p.trajectories = p.trajectories.filter((t) => !removed.has(t.reference.elementId));
    cleanAnchors(p);
    return validateEdit(p);
  }
  function coordinates(p, r, at, result) {
    const e = mutable(p.elements.find((v) => v.id === r.elementId)), pose = result.poses[e.id];
    if (!pose?.[r.point] || !Number.isFinite(at.x) || !Number.isFinite(at.y) || (at.z != null && at.z !== 0)) throw new Error('Zadajte platné X a Y; v 2D musí byť Z = 0.');
    const parent = result.poses[e.parentId], parentAngle = parent?.angle || 0;
    const localOrigin = (point) => parent ? K.rotate({ x: point.x - parent[e.parentPoint].x, y: point.y - parent[e.parentPoint].y }, -parentAngle) : point;
    if (e.type === 'rail' && K.carriagePoints.includes(r.point)) {
      const delta = { x: at.x - pose[r.point].x, y: at.y - pose[r.point].y }, axis = K.along({ x: 0, y: 0 }, 1, pose.angle);
      const travel = delta.x * axis.x + delta.y * axis.y;
      e.carriageOffset += travel;
      const v = K.rotate({ x: delta.x - travel * axis.x, y: delta.y - travel * axis.y }, -parentAngle);
      e.x += v.x; e.y += v.y;
      return;
    }
    if (K.isElastic(e) && K.elasticMount(p, e, r.point)) throw new Error('Montážny bod je pripojený. Najskôr ho odpojte alebo upravte nosné teleso.');
    if (e.type === 'slot') {
      e.controls[r.point === 'a' ? 0 : e.controls.length - 1] = K.localPoint({ a: pose.controlOrigin, angle: pose.angle }, at);
      if (e.curveSemicircle) e.curveRadius = K.distance(e.controls[0], e.controls[1]) / 2;
    } else if (['bearing', 'node'].includes(e.type)) {
      const v = localOrigin(at); e.x = v.x; e.y = v.y;
    } else if (r.point === 'c') e.localC = K.localPoint(pose, at);
    else {
      const a = r.point === 'a' ? at : pose.a, b = r.point === 'b' ? at : pose.b, v = localOrigin(a);
      e.x = v.x; e.y = v.y; e.length = K.distance(a, b); e.angle = K.angleOf(a, b) - parentAngle;
    }
    for (const j of p.connections.filter((j) => same(j.a, r) || same(j.b, r))) {
      const other = p.elements.find((v) => v.id === (same(j.a, r) ? j.b : j.a).elementId);
      if (other?.role === 'canvas-anchor') { other.x = at.x; other.y = at.y; }
    }
  }
  function erasePart(e, index, outline = false) {
    const points = outline ? e.outline : e.controls, minimum = outline ? 3 : e.curveKind === 'spline' ? 4 : 2;
    if (!outline && e.type !== 'slot' || !points || !Number.isInteger(index) || index < 0 || index >= points.length) throw new Error('Vyberte existujúci riadiaci bod alebo vrchol.');
    if (points.length <= minimum) throw new Error(`Profil musí mať aspoň ${minimum} body. Tento bod už nemožno odstrániť.`);
    points.splice(index, 1);
    if (outline) K.validateOutline(points);
  }
  function removeControl(project, id, index) {
    const p = K.copy(project), e = mutable(p.elements.find((e) => e.id === id));
    erasePart(e, index); return validateEdit(p);
  }
  function setControlPoint(project, id, index, at, outline = false) {
    const p = K.copy(project), e = mutable(p.elements.find((e) => e.id === id)), points = outline ? e.outline : e.controls;
    if (!outline && e.type !== 'slot' || !points || !Number.isInteger(index) || index < 0 || index >= points.length || !Number.isFinite(at?.x) || !Number.isFinite(at?.y)) throw new Error('Vyberte existujúci bod a platné lokálne X/Y.');
    points[index] = { x: at.x, y: at.y };
    if (outline) K.validateOutline(points);
    else if (e.curveSemicircle) e.curveRadius = K.distance(points[0], points[1]) / 2;
    return validateEdit(p);
  }
  function insertControl(project, id, at = null, index = null, result = poseOf(project)) {
    const p = K.copy(project), e = mutable(p.elements.find((e) => e.id === id)), pose = result.poses[id], points = e.controls;
    if (e.type !== 'slot' || e.curveKind === 'arc' || points.length >= (e.curveKind === 'polyline' ? 1001 : 32)) throw new Error('Do oblúka bod nepridávajte; Bézier a spline majú najviac 32 bodov.');
    if (index == null) {
      let fraction = .5, minimum = Infinity;
      if (at) for (let i = 1; i < pose.path.length; i++) {
        const nearest = K.nearestOnSegment(at, pose.path[i - 1], pose.path[i]);
        if (nearest.distance < minimum) { minimum = nearest.distance; fraction = (i - 1 + nearest.t) / (pose.path.length - 1); }
      }
      index = Math.max(1, Math.min(points.length - 1, Math.floor(fraction * (points.length - 1)) + 1));
    }
    if (!Number.isInteger(index) || index < 0 || index > points.length) throw new Error('Poradie nového riadiaceho bodu je neplatné.');
    let local;
    if (at) {
      if (!Number.isFinite(at.x) || !Number.isFinite(at.y)) throw new Error('Bod musí mať platné X/Y.');
      local = K.localPoint({ a: pose.controlOrigin || pose.a, angle: pose.angle }, at);
    } else {
      const a = points[Math.max(0, index - 1)], b = points[Math.min(points.length - 1, index)], adjacent = index === points.length ? points.at(-2) : points[1];
      local = index === 0 || index === points.length ? { x: a.x + (a.x - adjacent.x) / 2, y: a.y + (a.y - adjacent.y) / 2 } : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
    points.splice(index, 0, local);
    return validateEdit(p);
  }
  function semicircle(project, id, radius = null, side = null, result = poseOf(project)) {
    const p = K.copy(project), e = mutable(p.elements.find((e) => e.id === id));
    if (e.type !== 'slot') throw new Error('Na polkruh možno previesť vodiacu kulisu.');
    const a = e.controls[0], b = e.controls.at(-1), length = K.distance(a, b);
    if (length < K.EPS || radius != null && (!Number.isFinite(radius) || radius <= 0 || radius > 5000)) throw new Error('Polkruh potrebuje rôzne konce a kladný polomer do 5000 mm.');
    radius ??= length / 2;
    if (side == null) {
      const pose = result.poses[id], mid = K.localPoint({ a: pose.controlOrigin || pose.a, angle: pose.angle }, pose.path[Math.floor(pose.path.length / 2)]);
      side = e.curveSemicircle ? e.curveSide : (b.x - a.x) * (mid.y - a.y) - (b.y - a.y) * (mid.x - a.x) < 0 ? -1 : 1;
    }
    if (![1, -1].includes(side)) throw new Error('Vyberte jednu z dvoch strán tetivy.');
    e.controls = [{ ...a }, { x: a.x + (b.x - a.x) * 2 * radius / length, y: a.y + (b.y - a.y) * 2 * radius / length }];
    e.curveKind = 'arc'; e.curveRadius = radius; e.curveSide = side; e.curveSemicircle = true;
    return validateEdit(p);
  }
  function setCoordinates(project, r, at, result = poseOf(project)) {
    const p = K.copy(project); coordinates(p, r, at, result); return validateEdit(p);
  }
  function transformPoints(project, references, transform, result = poseOf(project)) {
    let p = K.copy(project);
    const desired = references.map((r) => ({ r, at: transform(K.point(result, r), r) }));
    const depth = (r) => {
      let e = project.elements.find((v) => v.id === r.elementId), n = 0;
      while (e?.parentId) { n++; e = project.elements.find((v) => v.id === e.parentId); }
      return n;
    };
    desired.sort((a, b) => depth(a.r) - depth(b.r));
    for (const { r, at } of desired) coordinates(p, r, at, E.design(p, result.motion ?? K.driveRange(p).min));
    return validateEdit(p);
  }
  function translate(project, keys, delta, result = poseOf(project)) {
    let p = K.copy(project);
    const bodies = new Set(keys.map((key) => target(p, key)).filter((t) => ['link', 'path'].includes(t?.type)).map((t) => t.elementId));
    const carried = (e) => {
      while (e?.parentId) {
        if (bodies.has(e.parentId)) return true;
        e = project.elements.find((v) => v.id === e.parentId);
      }
      return false;
    };
    for (const id of bodies) {
      const e = mutable(p.elements.find((v) => v.id === id));
      if (e.locked || e.type === 'ground' || carried(e) || K.isElastic(e) && ['a', 'b'].some((key) => K.elasticMount(p, e, key))) continue;
      const parent = result.poses[e.parentId], v = parent ? K.rotate(delta, -parent.angle) : delta;
      e.x += v.x; e.y += v.y;
    }
    const refs = keys.map((key) => reference(target(project, key))).filter((r) => r && !bodies.has(r.elementId) && !carried(project.elements.find((e) => e.id === r.elementId)) && !fixed(project, r));
    if (refs.length) p = transformPoints(p, refs, (at) => ({ x: at.x + delta.x, y: at.y + delta.y }), result);
    return validateEdit(p);
  }
  function setDriver(project, r, options, result = poseOf(project)) {
    if (project.kind !== 'custom') throw new Error('Zmenu pohonu vykonajte vo voľnej kópii šablóny.');
    const p = K.copy(project), e = mutable(p.elements.find((v) => v.id === r.elementId));
    if (e.parentId || K.isElastic(e) || ['ground', 'slot'].includes(e.type)) throw new Error('Vyberte samostatný pohyblivý uzol alebo rameno.');
    if (!options.enabled) { if (e.type === 'rail') storePose(e, result); e.drive = false; return validateEdit(p); }
    const linear = options.mode === 'linear', min = options.min, max = options.max;
    if (!Number.isFinite(options.speed) || !(max > min)) throw new Error('Pohon vyžaduje konečnú rýchlosť a zoradené limity.');
    if (!linear && !['link', 'panel', 'cam'].includes(e.type)) throw new Error('Otočný pohon vyžaduje rameno, panel alebo vačku.');
    if (linear && e.type === 'cam') throw new Error('Vačka používa otočný pohon.');
    if (linear && min < 0) throw new Error('Začiatok lineárneho zdvihu nesmie byť záporný.');
    for (const body of p.elements) body.drive = false;
    Object.assign(e, { drive: true, locked: false, driveMode: linear ? 'linear' : 'rotary', drivePivot: linear ? 'a' : r.point, driveSpeed: options.speed, driveAngle: options.angle || 0 });
    if (linear) {
      p.parameters.travelMin = min; p.parameters.travelMax = max; e.stroke = max - min;
      e.x = result.poses[e.id].a.x; e.y = result.poses[e.id].a.y;
      if (e.type === 'rail') e.carriageOffset = K.localPoint({ a: result.poses[e.id].a, angle: result.poses[e.id].angle }, result.poses[e.id].c).x;
    } else {
      p.parameters.rotationMin = min; p.parameters.rotationMax = max;
      const pivot = K.point(result, r), local = r.point === 'c' ? e.localC || { x: e.bearingOffset, y: 0 } : { x: r.point === 'b' ? e.length : 0, y: 0 };
      e.angle = result.poses[e.id].angle - min;
      const v = K.rotate(local, e.angle); e.x = pivot.x - v.x; e.y = pivot.y - v.y;
    }
    return validateEdit(p);
  }
  function setLimits(project, min, max) {
    const p = K.copy(project), driver = p.elements.find((e) => e.drive);
    if (!driver || p.kind !== 'custom') throw new Error('Najskôr priraďte pohon vo vlastnom modeli.');
    if (driver.driveMode === 'linear' || driver.type === 'rail') {
      p.parameters.travelMin = min; p.parameters.travelMax = max; driver.stroke = max - min;
    } else { p.parameters.rotationMin = min; p.parameters.rotationMax = max; }
    return validateEdit(p);
  }
  function setProperties(project, id, properties) {
    const p = K.copy(project), e = mutable(p.elements.find((v) => v.id === id));
    for (const key of ['name', 'length', 'stiffness', 'color']) if (properties[key] != null) e[key] = properties[key];
    return validateEdit(p);
  }
  function setJointLimits(project, id, min, max) {
    const p = K.copy(project), j = p.connections.find((j) => j.id === id);
    if (!j || j.builtin) throw new Error('Vyberte editovateľný otočný alebo posuvný kĺb.');
    if (j.type === 'revolute' && !K.hasOrientation(p, j.a) && !K.hasOrientation(p, j.b)) throw new Error('Dva samostatné body nemajú relatívny uhol. Vyberte kĺb ramena.');
    j.limitMin = min; j.limitMax = max; return validateEdit(p);
  }
  function addPOI(project, id, result = poseOf(project)) {
    const p = K.copy(project), host = p.elements.find((e) => e.id === id), pose = result.poses[id];
    if (!host || !pose) throw new Error('Vyberte platný člen.');
    const e = { ...K.makeElement('node', pose.length / 2, 0), parentId: id, parentPoint: 'a', length: 1, radius: 3, name: `${host.name} · POI`, role: 'poi' };
    p.elements.push(e);
    p.trajectories.push({ id: K.uid(), reference: { elementId: e.id, point: 'a' }, space: 'world', name: e.name, color: host.color || '#4d9b91', visible: true });
    return validateEdit(p);
  }
  function addCamFollower(project, id, result = poseOf(project)) {
    const p = K.copy(project), cam = mutable(p.elements.find((e) => e.id === id)), pose = result.poses[id];
    if (cam.type !== 'cam' || !pose) throw new Error('Vyberte rotačnú vačku.');
    if (p.elements.length > 117 || p.connections.length > 238) throw new Error('Pre valček, posúvač a vedenie chýba miesto v projekte.');
    const rollerRadius = 6, extent = cam.radius + cam.camLift + rollerRadius, at = { x: pose.a.x, y: pose.a.y - extent };
    const rail = { ...K.makeElement('rail', at.x, at.y - 90), drive: false, locked: true, angle: -90, length: extent * 2 + 180, name: `${cam.name} · vedenie sledovača` };
    const slider = { ...K.makeElement('link', at.x, at.y), angle: 90, length: 70, width: 8, role: 'cam-slider', name: `${cam.name} · posúvač` };
    const roller = { ...K.makeElement('bearing', 0, 0), parentId: slider.id, parentPoint: 'a', radius: rollerRadius, role: 'cam-roller', name: `${cam.name} · valček` };
    p.elements.push(rail, slider, roller);
    p.connections.push(
      { id: K.uid(), a: { elementId: slider.id, point: 'a' }, b: { elementId: rail.id, point: 'curve' }, type: 'prismatic', value: -180, name: 'Posuvný kĺb sledovača', builtin: false },
      { id: K.uid(), a: { elementId: roller.id, point: 'a' }, b: { elementId: cam.id, point: 'curve' }, type: 'cam-contact', value: 0, name: 'Vačkový kontakt · trvalý dotyk valčeka', builtin: false },
    );
    return validateEdit(p);
  }
  function split(project, id, result = poseOf(project)) {
    const p = K.copy(project), first = mutable(p.elements.find((e) => e.id === id)), pose = result.poses[id];
    if (first.type !== 'link' || first.outline.length || first.length < 0.2) throw new Error('Rozdeliť možno jednoduché rameno dlhé aspoň 0,2 mm.');
    const mid = { x: (pose.a.x + pose.b.x) / 2, y: (pose.a.y + pose.b.y) / 2 };
    const second = { ...K.copy(first), id: K.uid(), name: `${first.name} · 2`, x: mid.x, y: mid.y, angle: pose.angle, parentId: '', parentPoint: 'a' };
    first.name += ' · 1'; first.length /= 2; first.mass /= 2; first.inertia /= 8; first.com = null;
    second.length = first.length; second.mass = first.mass; second.inertia = first.inertia; second.com = null;
    if (first.drive && first.driveMode === 'rotary' && first.drivePivot === 'b') { first.drive = false; second.drive = true; }
    else second.drive = false;
    const node = { ...K.makeElement('node', mid.x, mid.y), length: 1, radius: 3, name: 'Stredový uzol', role: 'split-node' };
    const remap = (r) => { if (r?.elementId === id && r.point === 'b') r.elementId = second.id; };
    p.connections.forEach((j) => { remap(j.a); remap(j.b); });
    p.dimensions.forEach((d) => { remap(d.a); remap(d.b); if (d.control?.elementId === id) d.control = null; });
    p.trajectories.forEach((t) => remap(t.reference));
    p.elements.forEach((e) => {
      remap(e.mountA); remap(e.mountB);
      if (e.parentId === id) {
        const child = result.poses[e.id], onSecond = e.parentPoint === 'b' || K.localPoint(pose, child.a).x > first.length;
        if (onSecond) {
          e.parentId = second.id;
          const origin = e.parentPoint === 'b' ? pose.b : mid, v = K.rotate({ x: child.a.x - origin.x, y: child.a.y - origin.y }, -pose.angle);
          e.x = v.x; e.y = v.y; e.angle = child.angle - pose.angle;
        }
      }
    });
    p.elements.push(second, node);
    for (const r of [{ elementId: first.id, point: 'b' }, { elementId: second.id, point: 'a' }]) p.connections.push({ id: K.uid(), a: r, b: { elementId: node.id, point: 'a' }, type: 'revolute', value: 0, name: 'Stredový otočný kĺb', builtin: false });
    return validateEdit(p);
  }
  function insertAssembly(project, kind, at) {
    if (!['fourbar', 'crank'].includes(kind)) throw new Error('Nepodporovaná podzostava.');
    const p = K.copy(project), assembly = E.editableCopy(K.preset(kind), 0), ids = new Map(assembly.elements.map((e) => [e.id, K.uid()]));
    const frame = assembly.elements.find((e) => e.type === 'ground'), dx = at.x - frame.x, dy = at.y - frame.y;
    const driven = project.kind !== 'custom' || p.elements.some((e) => e.drive);
    const remap = (r) => { if (r) r.elementId = ids.get(r.elementId); };
    for (const e of assembly.elements) {
      e.id = ids.get(e.id);
      if (e.parentId) e.parentId = ids.get(e.parentId);
      else { e.x += dx; e.y += dy; }
      if (e.slotId) e.slotId = ids.get(e.slotId);
      remap(e.mountA); remap(e.mountB);
      if (driven) e.drive = false;
    }
    for (const j of assembly.connections) {
      j.id = K.uid(); remap(j.a); remap(j.b);
      if (j.type === 'point-path' && assembly.elements.find((e) => e.id === (j.a.point === 'curve' ? j.a : j.b).elementId)?.type === 'rail') j.type = 'prismatic';
    }
    p.elements.push(...assembly.elements); p.connections.push(...assembly.connections);
    return validateEdit(p);
  }
  // Screen-space candidates make small nodes equally easy to hit at every zoom.
  function hitTargets(candidates, at, nodeRadius = 12, jointRadius = 8) {
    const parts = candidates.filter((c) => ['control', 'outline'].includes(c.type) && K.distance(c.at, at) <= 9).sort((a, b) => K.distance(a.at, at) - K.distance(b.at, at));
    const nodes = candidates.filter((c) => c.type === 'node' && K.distance(c.at, at) <= nodeRadius);
    nodes.sort((a, b) => K.distance(a.at, at) - K.distance(b.at, at) || (b.selected ? 1 : 0) - (a.selected ? 1 : 0) || (b.priority || 0) - (a.priority || 0));
    const joints = candidates.filter((c) => c.type === 'joint' && ((c.marker && Math.abs(K.distance(c.marker, at) - 15) <= 4) || K.nearestOnSegment(at, c.a, c.b).distance <= jointRadius));
    joints.sort((a, b) => K.nearestOnSegment(at, a.a, a.b).distance - K.nearestOnSegment(at, b.a, b.b).distance);
    const inside = (polygon) => {
      let result = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const a = polygon[i], b = polygon[j];
        if ((a.y > at.y) !== (b.y > at.y) && at.x < (b.x - a.x) * (at.y - a.y) / (b.y - a.y) + a.x) result = !result;
      }
      return result;
    };
    const bodies = candidates.filter((c) => c.type === 'body').flatMap((c) => {
      let distance = c.polygon?.length >= 3 && inside(c.polygon) ? 0 : Infinity;
      const points = c.path || [];
      for (let i = 1; i < points.length; i++) distance = Math.min(distance, K.nearestOnSegment(at, points[i - 1], points[i]).distance);
      if (c.polygon?.length) for (let i = 0; i < c.polygon.length; i++) distance = Math.min(distance, K.nearestOnSegment(at, c.polygon[i], c.polygon[(i + 1) % c.polygon.length]).distance);
      return distance <= Math.max(7, c.radius || 0) ? [{ ...c, distance }] : [];
    }).sort((a, b) => a.distance - b.distance || (b.priority || 0) - (a.priority || 0));
    return [...new Set([...parts, ...nodes, ...joints, ...bodies].map((c) => c.key))];
  }
  function hitTest(candidates, at, nodeRadius = 12, jointRadius = 8) {
    return hitTargets(candidates, at, nodeRadius, jointRadius)[0] || null;
  }
  global.KinmoInteraction = Object.freeze({
    nodeKey, elementKey, jointKey, dimensionKey, controlKey, outlineKey, pathKey, controlPoints, pointKeys, target, reference, validSelection, select, fixed, status, root, hitTest, hitTargets, setRailMotion,
    addNode, disconnect, disconnectBody, toggleBodyFixed, setJoint, toggleFixed, deleteSelection, setCoordinates, transformPoints, translate,
    setDriver, setLimits, setJointLimits, setProperties, addPOI, addCamFollower, split, insertAssembly, removeControl, insertControl, setControlPoint, semicircle,
  });
})(globalThis);
