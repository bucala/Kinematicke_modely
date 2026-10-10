/* Canvas identities and atomic editing operations. No DOM or project mutation. */
(function (global) {
  'use strict';
  const K = global.Kinematics, E = global.KinmoEditor;
  const nodeKey = (r) => `n:${r.elementId}:${r.point}`;
  const elementKey = (id) => `e:${id}`;
  const jointKey = (id) => `j:${id}`;
  const same = (a, b) => a?.elementId === b?.elementId && a?.point === b?.point;
  const pointKeys = (e) => ['bearing', 'node'].includes(e.type) ? ['a'] : ['panel', 'rail'].includes(e.type) ? ['a', 'b', 'c'] : ['a', 'b'];
  const poseOf = (p) => E.design(p, K.driveRange(p).min);
  const mutable = (e) => {
    if (!e || e.primary) throw new Error('Pôvodná šablóna je chránená. Najskôr vytvorte voľnú kópiu.');
    return e;
  };
  function target(project, key) {
    if (!key) return null;
    if (key.startsWith('j:')) {
      const joint = project.connections.find((j) => j.id === key.slice(2));
      return joint ? { type: 'joint', id: joint.id, joint } : null;
    }
    if (key.startsWith('n:')) {
      const [, elementId, point] = key.split(':'), element = project.elements.find((e) => e.id === elementId);
      return element && pointKeys(element).includes(point) ? { type: 'node', id: key, elementId, point, element } : null;
    }
    const id = key.startsWith('e:') ? key.slice(2) : key, element = project.elements.find((e) => e.id === id);
    return element ? { type: 'link', id, elementId: id, element } : null;
  }
  const validSelection = (p, ids) => [...new Set(ids)].filter((id) => target(p, id));
  const select = (ids, key, additive = false) => !key ? [] : !additive ? [key] : ids.includes(key) ? ids.filter((id) => id !== key) : [...ids, key];
  const reference = (t) => t?.type === 'node' ? { elementId: t.elementId, point: t.point } : t?.type === 'joint' ? K.copy(t.joint.a.point === 'curve' ? t.joint.b : t.joint.a) : null;
  function root(project, e) {
    while (e?.parentId) e = project.elements.find((v) => v.id === e.parentId);
    return e;
  }
  function fixed(project, r) {
    const e = project.elements.find((v) => v.id === r.elementId), body = root(project, e);
    if (!body) return false;
    let rootPoint = r.point, child = e;
    while (child?.parentId) { rootPoint = child.parentPoint; child = project.elements.find((v) => v.id === child.parentId); }
    if (body.type === 'rail' && (!body.drive || rootPoint !== 'c')) return true;
    if (body.type === 'ground' || (!body.primary && body.locked && !body.drive) || body.type === 'slot') return true;
    if (e === body && body.drive && body.driveMode === 'rotary' && r.point === body.drivePivot) return true;
    return project.connections.some((j) => ['revolute', 'fixed'].includes(j.type || 'revolute') && [j.a, j.b].some((a, i) => {
      if (!same(a, r)) return false;
      const other = root(project, project.elements.find((v) => v.id === [j.b, j.a][i].elementId));
      return other?.type === 'ground' || (!other?.primary && other?.locked);
    }));
  }
  function status(project, r, samples = []) {
    const e = root(project, project.elements.find((v) => v.id === r.elementId));
    if (e?.drive || (e?.primary && (['input', 'carrier'].includes(e.role) || (e.type === 'rail' && (r.point === 'c' || (project.kind === 'drawer' && r.point === 'b')))))) return 'driven';
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
    if (e.type === 'rail') e.carriageOffset = K.distance(pose.a, pose.c);
  }
  function addNode(project, at, locked = false) {
    const p = K.copy(project);
    p.elements.push({ ...K.makeElement('node', at.x, at.y), length: 1, radius: 3, locked, name: locked ? 'Pevný bod' : 'Voľný uzol' });
    return K.validateProject(p);
  }
  function disconnect(project, r, result = poseOf(project)) {
    const p = K.copy(project), e = mutable(p.elements.find((v) => v.id === r.elementId));
    removeConnections(p, p.connections.filter((j) => same(j.a, r) || same(j.b, r)).map((j) => j.id));
    if (['bearing', 'node'].includes(e.type)) { detach(p, e, result.poses); e.slotId = ''; }
    cleanAnchors(p);
    return K.validateProject(p);
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
    return K.validateProject(p);
  }
  function toggleFixed(project, references, result = poseOf(project)) {
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
      if (!shouldFix && e.type === 'rail' && r.point === 'c') {
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
    return K.validateProject(p);
  }
  function deleteSelection(project, keys, result = poseOf(project)) {
    const p = K.copy(project), removed = new Set(), joints = [];
    for (const key of keys) {
      const t = target(p, key); if (!t) continue;
      if (t.type === 'joint') joints.push(t.id);
      else removed.add(mutable(t.element).id);
    }
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
    return K.validateProject(p);
  }
  function coordinates(p, r, at, result) {
    const e = mutable(p.elements.find((v) => v.id === r.elementId)), pose = result.poses[e.id];
    if (!pose?.[r.point] || !Number.isFinite(at.x) || !Number.isFinite(at.y) || (at.z != null && at.z !== 0)) throw new Error('Zadajte platné X a Y; v 2D musí byť Z = 0.');
    const parent = result.poses[e.parentId], parentAngle = parent?.angle || 0;
    const localOrigin = (point) => parent ? K.rotate({ x: point.x - parent[e.parentPoint].x, y: point.y - parent[e.parentPoint].y }, -parentAngle) : point;
    if (e.type === 'rail' && r.point === 'c') throw new Error('Polohu vozíka určuje pohon. Upravte jeho zdvih alebo polohu vedenia.');
    if (e.type === 'slot') {
      e.controls[r.point === 'a' ? 0 : e.controls.length - 1] = K.localPoint({ a: pose.controlOrigin, angle: pose.angle }, at);
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
  function setCoordinates(project, r, at, result = poseOf(project)) {
    const p = K.copy(project); coordinates(p, r, at, result); return K.validateProject(p);
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
    for (const { r, at } of desired) coordinates(p, r, at, poseOf(p));
    return K.validateProject(p);
  }
  function translate(project, keys, delta, result = poseOf(project)) {
    let p = K.copy(project);
    const bodies = new Set(keys.map((key) => target(p, key)).filter((t) => t?.type === 'link').map((t) => t.elementId));
    const carried = (e) => {
      while (e?.parentId) {
        if (bodies.has(e.parentId)) return true;
        e = project.elements.find((v) => v.id === e.parentId);
      }
      return false;
    };
    for (const id of bodies) {
      const e = mutable(p.elements.find((v) => v.id === id));
      if (e.locked || e.type === 'ground' || carried(e)) continue;
      const parent = result.poses[e.parentId], v = parent ? K.rotate(delta, -parent.angle) : delta;
      e.x += v.x; e.y += v.y;
    }
    const refs = keys.map((key) => reference(target(project, key))).filter((r) => r && !bodies.has(r.elementId) && !carried(project.elements.find((e) => e.id === r.elementId)) && !fixed(project, r));
    if (refs.length) p = transformPoints(p, refs, (at) => ({ x: at.x + delta.x, y: at.y + delta.y }), result);
    return K.validateProject(p);
  }
  function setDriver(project, r, options, result = poseOf(project)) {
    if (project.kind !== 'custom') throw new Error('Zmenu pohonu vykonajte vo voľnej kópii šablóny.');
    const p = K.copy(project), e = mutable(p.elements.find((v) => v.id === r.elementId));
    if (e.parentId || K.isElastic(e) || ['ground', 'slot'].includes(e.type)) throw new Error('Vyberte samostatný pohyblivý uzol alebo rameno.');
    if (!options.enabled) { e.drive = false; return K.validateProject(p); }
    const linear = options.mode === 'linear', min = options.min, max = options.max;
    if (!Number.isFinite(options.speed) || !(max > min)) throw new Error('Pohon vyžaduje konečnú rýchlosť a zoradené limity.');
    if (!linear && !['link', 'panel'].includes(e.type)) throw new Error('Otočný pohon vyžaduje rameno alebo panel.');
    if (linear && min < 0) throw new Error('Začiatok lineárneho zdvihu nesmie byť záporný.');
    for (const body of p.elements) body.drive = false;
    Object.assign(e, { drive: true, locked: false, driveMode: linear ? 'linear' : 'rotary', drivePivot: linear ? 'a' : r.point, driveSpeed: options.speed, driveAngle: options.angle || 0 });
    if (linear) {
      p.parameters.travelMin = min; p.parameters.travelMax = max; e.stroke = max - min;
      e.x = result.poses[e.id].a.x; e.y = result.poses[e.id].a.y;
    } else {
      p.parameters.rotationMin = min; p.parameters.rotationMax = max;
      const pivot = K.point(result, r), local = r.point === 'c' ? e.localC || { x: e.bearingOffset, y: 0 } : { x: r.point === 'b' ? e.length : 0, y: 0 };
      e.angle = result.poses[e.id].angle - min;
      const v = K.rotate(local, e.angle); e.x = pivot.x - v.x; e.y = pivot.y - v.y;
    }
    return K.validateProject(p);
  }
  function setLimits(project, min, max) {
    const p = K.copy(project), driver = p.elements.find((e) => e.drive);
    if (!driver || p.kind !== 'custom') throw new Error('Najskôr priraďte pohon vo vlastnom modeli.');
    if (driver.driveMode === 'linear' || driver.type === 'rail') {
      p.parameters.travelMin = min; p.parameters.travelMax = max; driver.stroke = max - min;
    } else { p.parameters.rotationMin = min; p.parameters.rotationMax = max; }
    return K.validateProject(p);
  }
  function setProperties(project, id, properties) {
    const p = K.copy(project), e = mutable(p.elements.find((v) => v.id === id));
    for (const key of ['name', 'length', 'stiffness', 'color']) if (properties[key] != null) e[key] = properties[key];
    return K.validateProject(p);
  }
  function setJointLimits(project, id, min, max) {
    const p = K.copy(project), j = p.connections.find((j) => j.id === id);
    if (!j || j.builtin) throw new Error('Vyberte editovateľný otočný alebo posuvný kĺb.');
    if (j.type === 'revolute' && !K.hasOrientation(p, j.a) && !K.hasOrientation(p, j.b)) throw new Error('Dva samostatné body nemajú relatívny uhol. Vyberte kĺb ramena.');
    j.limitMin = min; j.limitMax = max; return K.validateProject(p);
  }
  function addPOI(project, id, result = poseOf(project)) {
    const p = K.copy(project), host = p.elements.find((e) => e.id === id), pose = result.poses[id];
    if (!host || !pose) throw new Error('Vyberte platný člen.');
    const e = { ...K.makeElement('node', pose.length / 2, 0), parentId: id, parentPoint: 'a', length: 1, radius: 3, name: `${host.name} · POI`, role: 'poi' };
    p.elements.push(e);
    p.trajectories.push({ id: K.uid(), reference: { elementId: e.id, point: 'a' }, space: 'world', name: e.name, color: host.color || '#4d9b91', visible: true });
    return K.validateProject(p);
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
    return K.validateProject(p);
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
    return K.validateProject(p);
  }
  // Screen-space candidates make small nodes equally easy to hit at every zoom.
  function hitTest(candidates, at, nodeRadius = 11, jointRadius = 6) {
    const nodes = candidates.filter((c) => c.type === 'node' && K.distance(c.at, at) <= nodeRadius);
    nodes.sort((a, b) => K.distance(a.at, at) - K.distance(b.at, at) || (b.selected ? 1 : 0) - (a.selected ? 1 : 0) || (b.priority || 0) - (a.priority || 0));
    if (nodes.length) return nodes[0].key;
    const joints = candidates.filter((c) => c.type === 'joint' && ((c.marker && Math.abs(K.distance(c.marker, at) - 15) <= 4) || K.nearestOnSegment(at, c.a, c.b).distance <= jointRadius));
    joints.sort((a, b) => K.nearestOnSegment(at, a.a, a.b).distance - K.nearestOnSegment(at, b.a, b.b).distance);
    return joints[0]?.key || null;
  }
  global.KinmoInteraction = Object.freeze({
    nodeKey, elementKey, jointKey, pointKeys, target, reference, validSelection, select, fixed, status, root, hitTest,
    addNode, disconnect, setJoint, toggleFixed, deleteSelection, setCoordinates, transformPoints, translate,
    setDriver, setLimits, setJointLimits, setProperties, addPOI, split, insertAssembly,
  });
})(globalThis);
