/* Reviewable mechanism workflows. All operations are local and return new models. */
(function (global) {
  'use strict';
  const K = global.Kinematics, E = global.KinmoEditor, I = global.KinmoInteraction, W = global.KinmoWorkbench;
  const finitePoint = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.y);
  function frameTransform(base, frame) {
    if (![base.a, base.b, frame.a, frame.b].every(finitePoint) || K.distance(frame.a, frame.b) < 5 || K.distance(base.a, base.b) < 5) throw new Error('Zarovnanie potrebuje dva rôzne body pevného úseku.');
    const scale = K.distance(base.a, base.b) / K.distance(frame.a, frame.b), angle = K.angleOf(base.a, base.b) - K.angleOf(frame.a, frame.b);
    return (p) => { const v = K.rotate({ x: (p.x - frame.a.x) * scale, y: (p.y - frame.a.y) * scale }, angle); return { x: base.a.x + v.x, y: base.a.y + v.y }; };
  }
  function comparePoses(baseCandidates, frames, calibration) {
    const copies = K.copy(baseCandidates), signatures = (c) => ({ length: c.points.length > 1 ? K.distance(c.points[0], c.points.at(-1)) : c.radius * 2, width: c.width || c.radius * 2 });
    const matches = copies.map(() => []);
    for (const frame of frames) {
      const map = frameTransform(calibration, frame.alignment), scale = K.distance(calibration.a, calibration.b) / K.distance(frame.alignment.a, frame.alignment.b);
      const candidates = frame.candidates.map((c) => ({ ...c, points: c.points.map(map), width: c.width * scale, radius: c.radius * scale })), used = new Set();
      copies.forEach((c, i) => {
        const s = signatures(c), ranked = candidates.map((v, index) => {
          const t = signatures(v), size = Math.abs(Math.log(Math.max(.01, t.length) / Math.max(.01, s.length))) + Math.abs(Math.log(Math.max(.01, t.width) / Math.max(.01, s.width)));
          const compatible = (v.points.length === 1) === (c.points.length === 1);
          return { v, index, size, score: size + K.distance(v.points[0], c.points[0]) / Math.max(100, s.length * 4), compatible };
        }).filter((r) => r.compatible && r.size < .45 && !used.has(r.index)).sort((a, b) => a.score - b.score);
        if (!ranked.length || ranked[1] && ranked[1].score - ranked[0].score < .1) return;
        const best = ranked[0]; used.add(best.index);
        const direct = K.distance(c.points[0], best.v.points[0]) + K.distance(c.points.at(-1), best.v.points.at(-1));
        const reverse = K.distance(c.points[0], best.v.points.at(-1)) + K.distance(c.points.at(-1), best.v.points[0]);
        matches[i].push(reverse < direct ? [...best.v.points].reverse() : best.v.points);
      });
    }
    return copies.map((c, i) => {
      const poses = matches[i], tolerance = Math.max(3, signatures(c).length * .015), a = c.points[0], b = c.points.at(-1);
      const fixed = poses.length && poses.every((p) => K.distance(a, p[0]) < tolerance && K.distance(b, p.at(-1)) < tolerance);
      const translating = poses.length && poses.every((p) => Math.abs(K.angleOf(p[0], p.at(-1)) - K.angleOf(a, b)) < 3);
      const pivot = poses.length && c.points.length > 1 && (poses.every((p) => K.distance(a, p[0]) < tolerance) ? 'a' : poses.every((p) => K.distance(b, p.at(-1)) < tolerance) ? 'b' : null);
      c.motionEvidence = { kind: fixed ? 'fixed' : pivot ? 'rotation' : translating ? 'translation' : 'uncertain', pivot: pivot || '', matches: poses.length, total: frames.length };
      return c;
    });
  }
  function candidate(points, type = 'panel', anchors = []) {
    if (!Array.isArray(points) || points.length < 2 || points.length > 64 || points.some((p) => !finitePoint(p))) throw new Error('Obrys potrebuje 2 až 64 platných bodov.');
    let a = points[0], b = points[1], maximum = 0;
    for (const p of points) for (const q of points) if (K.distance(p, q) > maximum) { a = p; b = q; maximum = K.distance(p, q); }
    if (maximum < 1) throw new Error('Prvok je príliš malý.');
    return { id: K.uid(), type, points: [{ ...a }, { ...b }], outline: points.length > 2 ? K.copy(points) : [], width: 8, radius: 4, confidence: 1, selected: true, anchors: K.copy(anchors), useAnchors: true, evidence: { manual: true } };
  }
  function mergeCandidates(candidates, ids) {
    const members = candidates.filter((c) => ids.includes(c.id));
    if (members.length < 2 || members.some((c) => c.points.length < 2)) throw new Error('Vyberte aspoň dva fragmenty telesa. Kruhové miesta priraďte ako montážne body.');
    const points = members.flatMap((c) => c.outline?.length ? c.outline : c.points).sort((a, b) => a.x - b.x || a.y - b.y);
    const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x), lower = [], upper = [];
    for (const p of points) { while (lower.length > 1 && cross(lower.at(-2), lower.at(-1), p) <= 0) lower.pop(); lower.push(p); }
    for (const p of [...points].reverse()) { while (upper.length > 1 && cross(upper.at(-2), upper.at(-1), p) <= 0) upper.pop(); upper.push(p); }
    const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)], anchors = [];
    for (const p of members.flatMap((c) => c.anchors || [])) if (!anchors.some((a) => K.distance(a, p) < 2)) anchors.push(p);
    const merged = candidate(hull, members[0].type, anchors.slice(0, 24)); merged.width = Math.max(...members.map((c) => c.width));
    return [...candidates.filter((c) => !ids.includes(c.id)), merged];
  }
  function splitCandidate(candidates, id, at) {
    const c = candidates.find((c) => c.id === id); if (!c || c.points.length < 2 || !finitePoint(at)) throw new Error('Vyberte teleso a bod rezu.');
    const a = c.points[0], b = c.points.at(-1), length = K.distance(a, b), n = { x: (b.x - a.x) / length, y: (b.y - a.y) / length }, side = (p) => (p.x - at.x) * n.x + (p.y - at.y) * n.y;
    const near = K.nearestOnSegment(at, a, b); if (near.t < .05 || near.t > .95) throw new Error('Rez musí ležať medzi koncami telesa.');
    const cut = (sign) => {
      const points = c.outline || [], out = [];
      for (let i = 0; i < points.length; i++) { const p = points[i], q = points[(i + 1) % points.length], x = side(p), y = side(q); if (x * sign >= 0) out.push(p); if ((x < 0) !== (y < 0)) { const t = x / (x - y); out.push({ x: K.lerp(p.x, q.x, t), y: K.lerp(p.y, q.y, t) }); } }
      return out.length >= 3 ? out : sign < 0 ? [a, { x: near.x, y: near.y }] : [{ x: near.x, y: near.y }, b];
    };
    const pieces = [-1, 1].map((sign) => ({ ...candidate(cut(sign), c.type, (c.anchors || []).filter((p) => side(p) * sign >= 0)), width: c.width }));
    return [...candidates.filter((v) => v.id !== id), ...pieces];
  }
  function impact(before, after, result) {
    const removed = (key) => before[key].filter((v) => !after[key].some((x) => x.id === v.id));
    const changed = after.elements.filter((e) => { const old = before.elements.find((v) => v.id === e.id); return old && JSON.stringify(e) !== JSON.stringify(old); });
    const ids = new Set([...removed('elements'), ...changed].map((e) => e.id));
    const editedJoints = after.connections.filter((j) => JSON.stringify(j) !== JSON.stringify(before.connections.find((v) => v.id === j.id)));
    for (const j of [...removed('connections'), ...editedJoints]) for (const r of [j.a, j.b]) ids.add(r.elementId);
    for (const id of W.descendants(before, [...ids])) ids.add(id);
    const joints = [...before.connections.filter((j) => [j.a, j.b].some((r) => ids.has(r.elementId))), ...editedJoints.filter((j) => !before.connections.some((v) => v.id === j.id))];
    return { elements: removed('elements'), changed, joints, dimensions: removed('dimensions'), trajectories: removed('trajectories'), driverLost: before.elements.some((e) => e.drive && !after.elements.some((v) => v.id === e.id && v.drive)), pose: result };
  }
  function keepPose(project, result, options = {}) {
    const p = K.copy(project), range = K.driveRange(p), motion = result.motion ?? range.min;
    for (const e of p.elements.filter((v) => !v.parentId && !v.primary)) {
      const pose = result.poses[e.id]; if (!pose) continue;
      const source = { a: pose.controlOrigin || pose.a, angle: pose.angle }; let x = source.a.x, y = source.a.y, angle = source.angle;
      if (!options.design && e.drive && ['link', 'panel', 'cam'].includes(e.type) && e.driveMode !== 'linear') {
        angle -= motion; const pivot = pose[e.drivePivot || 'a'];
        const local = e.drivePivot === 'b' ? { x: e.length, y: 0 } : e.drivePivot === 'c' ? e.localC || { x: e.bearingOffset, y: 0 } : { x: 0, y: 0 }, offset = K.rotate(local, angle); x = pivot.x - offset.x; y = pivot.y - offset.y;
      } else if (e.drive && e.type === 'rail' && e.movingRail) { const v = K.along({ x, y }, K.railTravel(p, e, motion), e.angle); x = v.x; y = v.y; }
      else if (!options.design && e.drive && e.driveMode === 'linear' && e.type !== 'rail') { const v = K.along({ x, y }, -(motion - range.min) / (range.max - range.min) * e.stroke, e.driveAngle); x = v.x; y = v.y; }
      e.x = x; e.y = y; e.angle = angle;
    }
    return K.validateProject(p);
  }
  function trial(project, from, to, options = {}) {
    if (![from, to].every(Number.isFinite)) throw new Error('Skúšobný pohyb potrebuje platné polohy.');
    const range = K.driveRange(project); from = K.clamp(from, range.min, range.max);
    const desired = K.clamp(to, range.min, range.max), steps = Math.max(1, Math.ceil(Math.abs(desired - from) / ((range.max - range.min) / 200))), solve = options.solve || ((s) => K.solve(project, s, { collisions: options.collisions !== false, profile: options.profile }));
    let last = from, result = solve(from);
    if (result.blocked) return { motion: from, result, blocked: result };
    const checkpoints = Array.from({ length: steps }, (_, i) => K.lerp(from, desired, (i + 1) / steps));
    for (const s of (options.samples || []).slice(0, 501)) if (Number.isFinite(s.motion) && s.motion > Math.min(from, desired) && s.motion < Math.max(from, desired)) checkpoints.push(s.motion);
    checkpoints.sort((a, b) => desired >= from ? a - b : b - a);
    for (const next of [...new Set(checkpoints)]) {
      const tested = solve(next);
      if (tested.blocked) { let low = last, high = next; for (let n = 0; n < 10; n++) { const mid = (low + high) / 2; if (solve(mid).blocked) high = mid; else low = mid; } return { motion: low, result: solve(low), blocked: tested }; }
      last = next; result = tested;
    }
    return { motion: desired, result, blocked: null };
  }
  function planAt(project, seconds) {
    const phases = project.motionPlan?.phases; if (!phases?.length) return null;
    if (!Number.isFinite(seconds)) throw new Error('Neplatný čas fázy.');
    const duration = phases.reduce((sum, p) => sum + p.duration, 0), time = K.clamp(seconds, 0, duration); let offset = 0;
    for (let i = 0; i < phases.length; i++) { const p = phases[i]; if (time <= offset + p.duration || i === phases.length - 1) { let t = K.clamp((time - offset) / p.duration, 0, 1); if (p.easing === 'smooth') t = t * t * (3 - 2 * t); return { motion: K.lerp(p.from, p.to, t), index: i, name: p.name, duration }; } offset += p.duration; }
  }
  function kit(type, length = 120, width = 25, drive = false) {
    if (!['rail', 'link', 'slot', 'panel'].includes(type) || ![length, width].every((v) => Number.isFinite(v) && v >= 5 && v <= 1000)) throw new Error('Vyberte zostavu a rozmery 5 až 1000 mm.');
    const p = K.preset('custom'), add = (type, x, y, data = {}) => { const e = { ...K.makeElement(type, x, y), drive: false, ...data }; p.elements.push(e); return e; }, ref = (e, point = 'a') => ({ elementId: e.id, point }), joint = (a, b, type) => p.connections.push({ id: K.uid(), a, b, type, value: 0, name: E.constraintNames[type] });
    if (type === 'rail') { const rail = add('rail', 0, 0, { length, stroke: length, drive, carriageHeight: width, name: 'Vedenie zostavy' }), plate = add('panel', 0, 0, { length: width * 2, width, bearingOffset: width, name: 'Doska vozíka' }); joint(ref(rail, 'c'), ref(plate), 'fixed'); }
    if (type === 'link' || type === 'panel') { const bearing = add('bearing', 0, 0, { locked: true, radius: 5, name: 'Pevný čap' }), arm = add(type, 0, 0, { length, width, bearingOffset: length / 2, drive, driveMode: 'rotary', name: type === 'link' ? 'Rameno s čapom' : 'Sklápacie čelo' }); joint(ref(bearing), ref(arm), 'revolute'); }
    if (type === 'slot') { const slot = add('slot', 0, 0, { length, curveKind: 'polyline', controls: [{ x: 0, y: 0 }, { x: length, y: 0 }], slotWidth: width, name: 'Kulisa zostavy' }), bearing = add('bearing', 0, 0, { radius: Math.min(5, width / 3), name: 'Čap v kulise' }), arm = add('link', 0, 0, { length: width * 2, name: 'Pripojovacie rameno' }); joint(ref(slot, 'curve'), ref(bearing), 'point-path'); joint(ref(bearing), ref(arm), 'revolute'); }
    return K.validateProject(p);
  }
  function insertKit(project, type, at, length, width, drive) {
    const p = K.copy(project), source = kit(type, length, width, drive && !project.elements.some((e) => e.drive)), ids = new Map(source.elements.map((e) => [e.id, K.uid()]));
    const added = source.elements.map((e) => ({ ...e, id: ids.get(e.id), x: e.x + at.x, y: e.y + at.y })); p.elements.push(...added);
    p.connections.push(...source.connections.map((j) => ({ ...j, id: K.uid(), a: { ...j.a, elementId: ids.get(j.a.elementId) }, b: { ...j.b, elementId: ids.get(j.b.elementId) } })));
    return { project: K.validateProject(p), added: added.map((e) => e.id) };
  }
  global.KinmoWorkflow = Object.freeze({ frameTransform, comparePoses, candidate, mergeCandidates, splitCandidate, impact, keepPose, trial, planAt, kit, insertKit });
})(globalThis);
