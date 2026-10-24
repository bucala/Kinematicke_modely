/* Local explanations and review data. These operations do not mutate a project. */
(function (global) {
  'use strict';
  const K = global.Kinematics, E = global.KinmoEditor, I = global.KinmoInteraction, W = global.KinmoWorkbench, X = global.KinmoExport;
  function mainDimensions(project, result) {
    const entities = X.geometry(project, result, { dimensions: false, trajectories: false }).filter(e => e.layer !== 'DIMENSIONS' && e.kind !== 'text');
    const points = entities.flatMap(e => e.points || (e.center ? [{ x: e.center.x - e.radius, y: e.center.y - e.radius }, { x: e.center.x + e.radius, y: e.center.y + e.radius }] : []));
    for (const e of project.elements.filter(e=>e.visible)) { const pose=result.poses[e.id];if(pose?.carriageOutline)points.push(...pose.carriageOutline);if(e.type==='ground'&&pose?.a&&pose?.b&&!pose.outline?.length){const radius=e.width/2;for(const at of [pose.a,pose.b])points.push({x:at.x-radius,y:at.y-radius},{x:at.x+radius,y:at.y+radius});} }
    if (!points.length) return null;
    const left = Math.min(...points.map(p => p.x)), right = Math.max(...points.map(p => p.x)), top = Math.min(...points.map(p => p.y)), bottom = Math.max(...points.map(p => p.y));
    return { left, right, top, bottom, width: right - left, height: bottom - top,
      members: project.elements.filter(e => e.visible && !e.parentId && result.poses[e.id]?.a && result.poses[e.id]?.b && !['ground', 'node', 'bearing', 'cam'].includes(e.type)).map(e => ({ id: e.id, name: e.name, length: K.distance(result.poses[e.id].a, result.poses[e.id].b), min: K.isElastic(e) ? e.minLength : null, max: K.isElastic(e) ? e.maxLength : null })) };
  }
  function blockers(project, result) {
    const analysis = W.diagnose(project, result), rows = [...analysis.checks];
    for (const e of project.elements) {
      if (e.locked || e.type === 'ground') rows.push({ key: I.elementKey(e.id), message: `${e.name}: celé teleso je pevné.`, action: 'support' });
      if (e.type === 'rail') rows.push({ key: I.elementKey(e.id), message: `${e.name}: ${e.movingRail ? 'pevný vozík, posúva sa vedenie' : 'pevné vedenie, posúva sa vozík'}; rozsah ${e.travelMin}–${e.travelMax} mm.`, action: 'support' });
      if (K.isElastic(e)) {
        const length = result.poses[e.id]?.length;
        if (length < e.minLength - K.TOLERANCE || length > e.maxLength + K.TOLERANCE || e.type.startsWith('piston-') && !K.pistonGeometry(e).fits) rows.push({ key: I.elementKey(e.id), message: `${e.name}: dĺžka alebo zdvih nezodpovedá pracovnému rozsahu ${e.minLength}–${e.maxLength} mm.`, action: 'geometry' });
      }
    }
    for (const j of project.connections.filter(j => !j.builtin && ['fixed', 'fixed-point'].includes(j.type))) rows.push({ key: I.jointKey(j.id), message: `${j.name}: pevná väzba obmedzuje pohyb pripojených bodov.`, action: 'joint' });
    const repairs = global.KinmoWorkflow.repairSuggestions(project, result);
    for (const row of analysis.rows.filter(r => r.status === 'error')) {
      const joint = project.connections.find(j => j.id === row.id);
      if (joint?.builtin || !joint) continue;
      if (joint.type === 'fixed') repairs.push({ key: row.key, action: 'release-rotation', label: `${joint.name}: povoliť vzájomné otáčanie` });
      if (joint.limitMin != null) repairs.push({ key: row.key, action: 'release-limit', label: `${joint.name}: preveriť pohyb bez dorazu` });
      repairs.push({ key: row.key, action: 'remove-constraint', label: `${joint.name}: preveriť odpojenie väzby` });
    }
    return { rows, hints: [...new Set([...result.issues, ...analysis.hints])], repairs, free: analysis.freedom.free };
  }
  function repairPreview(project, key, action, motion) {
    let next = K.copy(project);
    const target = I.target(next, key), before = K.solve(project, motion, { collisions: false });
    if (!target) throw new Error('Cieľ opravy už neexistuje.');
    const joint = target.joint;
    if (['remove-duplicate', 'remove-constraint'].includes(action)) {
      if (!joint || joint.builtin) throw new Error('Vyberte upraviteľnú väzbu.');
      if (action === 'remove-duplicate' && !W.diagnose(project, before).duplicates.some(pair => pair[1] === joint.id)) throw new Error('Väzba už nie je nadbytočnou kópiou.');
      next = I.deleteSelection(next, [key], before);
    } else if (action === 'release-rotation') {
      if (!joint || joint.builtin || joint.type !== 'fixed') throw new Error('Uvoľniť možno iba vlastnú pevnú väzbu.');
      joint.type = 'revolute'; joint.value = 0; delete joint.limitMin; delete joint.limitMax;
      joint.name = 'Otočný spoj';
    } else if (action === 'release-limit') {
      if (!joint || joint.builtin || joint.limitMin == null) throw new Error('Väzba nemá upraviteľný doraz.');
      delete joint.limitMin; delete joint.limitMax;
    } else if (action === 'elastic-range') {
      const e = target.element;
      if (!K.isElastic(e) || e.primary) throw new Error('Vyberte vlastnú pružinu alebo piest.');
      const manual = e.rangeMode === 'manual'; e.rangeMode = 'auto'; K.fitElasticRanges(next, [e.id], before);
      if (manual) e.rangeMode = 'manual';
    } else throw new Error('Neznámy návrh opravy.');
    next = K.validateProject(next);
    const result = K.solve(next, motion, { collisions: false });
    return { project: next, result, before, action, key,
      elementIds: joint ? [joint.a.elementId, joint.b.elementId] : [target.elementId],
      references: joint ? [K.copy(joint.a), K.copy(joint.b)] : [{elementId:target.elementId,point:'a'}],
      beforeFree: E.freedom(project, before).free, afterFree: E.freedom(next, result).free,
      beforeErrors: W.constraints(project, before).filter(r => ['error', 'missing'].includes(r.status)),
      afterErrors: W.constraints(next, result).filter(r => ['error', 'missing'].includes(r.status)) };
  }
  function connectionPreview(project, a, b, type, motion, options = {}) {
    const before = options.design ? E.design(project, motion) : K.solve(project, motion, { collisions: false });
    const relative = ((before.poses[b.elementId].angle - before.poses[a.elementId].angle + 540) % 360) - 180;
    const next = options.snap ? W.connectSnap(project, options.snap, type) : I.setJoint(project, a, { other: b, type, value: ['fixed','prismatic'].includes(type) ? relative : 0 }), result = K.solve(next, motion, { collisions: false });
    const errors = W.constraints(next, result).filter(r => ['error', 'missing'].includes(r.status));
    return { joint: next.connections.find(j=>!project.connections.some(old=>old.id===j.id)), project: next, result, errors, issues: result.issues, before: E.freedom(project, before).free, after: E.freedom(next, result).free,
      motion: ({ revolute: 'Body zostanú spojené, vzájomné otáčanie ostane možné.', fixed: 'Telesá si zachovajú vzájomnú polohu aj natočenie.', prismatic: 'Ostane posuv pozdĺž vedenia; orientácia je viazaná.', 'point-path': 'Bod sa bude pohybovať po dráhe.', 'cam-contact': 'Valček bude sledovať profil vačky.' })[type] || E.constraintNames[type] };
  }
  function cycleReview(project, samples) {
    const analysis = W.analyzeSweep(project, samples), failures = [];
    for (const sample of samples) {
      const reasons = [...sample.issues];
      for (const e of project.elements.filter(K.isElastic)) {
        const length = sample.poses[e.id]?.length;
        if (length < e.minLength - K.TOLERANCE || length > e.maxLength + K.TOLERANCE) reasons.push(`${e.name}: prekročený pracovný zdvih.`);
      }
      if (sample.blocked || reasons.length) failures.push({ motion: sample.motion, reasons: [...new Set(reasons)], keys: W.constraints(project, sample).filter(r => ['error', 'missing'].includes(r.status)).map(r => r.key) });
    }
    return { count: samples.length, failures, analysis, range: K.driveRange(project), hasDrive: project.kind !== 'custom' || project.elements.some(e => e.drive) };
  }
  function elasticConstruction(project, id, values) {
    const p = K.copy(project), e = p.elements.find(e => e.id === id);
    if (!e || !K.isElastic(e) || e.primary) throw new Error('Vyberte vlastnú pružinu alebo piest.');
    for (const key of ['minLength', 'maxLength', 'restLength']) { const n = Number(values[key]); if (!Number.isFinite(n) || n < .1 || n > 5000) throw new Error('Dĺžky musia byť v rozsahu 0,1–5000 mm.'); e[key] = n; }
    if (e.minLength > e.restLength || e.restLength > e.maxLength || e.maxLength <= e.minLength) throw new Error('Voľná dĺžka musí ležať medzi minimom a maximom; zdvih musí byť kladný.');
    if (e.type.startsWith('piston-') && !K.pistonGeometry(e).fits) throw new Error('Piestnica sa nezmestí do valca. Zväčšite minimálnu dĺžku alebo zmenšite maximálnu dĺžku / zdvih.');
    e.rangeMode = 'manual'; return K.validateProject(p);
  }
  function issueBundle(project, result, options = {}) {
    const p = K.copy(project);
    // A diagnostic file contains mechanical geometry, not embedded source photographs.
    delete p.importReference;
    if (p.reference) delete p.reference.image;
    if (p.source) { delete p.source.image; delete p.source.imageData; }
    return { format: 'kinematika-issue', version: 1, created: new Date().toISOString(), description: String(options.description || '').slice(0, 4000), project: JSON.parse(X.serializeNative(p,{motion:result.motion,workspace:{mode:options.mode,collisions:options.collisions}})),
      reproduction: { motion: result.motion, mode: options.mode, selected: [...(options.selected || [])], collisions: options.collisions !== false },
      snapshot: { poses: K.copy(result.poses), blocked: !!result.blocked, issues: [...result.issues] },
      diagnostics: { blocked: !!result.blocked, issues: [...result.issues], forces: K.copy(result.forces || []), constraints: W.constraints(project, result) }, dimensions: mainDimensions(project, result) };
  }
  function restoreIssue(input) {
    if (input?.format !== 'kinematika-issue' || input.version !== 1) throw new Error('Neznámy diagnostický balík.');
    if(input.reproduction?.selected != null && (!Array.isArray(input.reproduction.selected)||input.reproduction.selected.length>10000||input.reproduction.selected.some(key=>typeof key!=='string'||key.length>256)))throw new Error('Neplatný výber v diagnostickom balíku.');
    const native = X.parseNative(JSON.stringify(input.project)), baseline = K.solve(native.project, native.motion, { collisions: input.reproduction?.collisions !== false });
    const poses = K.copy(baseline.poses), snapshot = input.snapshot;
    if (snapshot) {
      const finite = value => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1e7;
      const point = value => value && finite(value.x) && finite(value.y);
      for (const [id, saved] of Object.entries(snapshot.poses || {})) {
        if (!poses[id] || !saved || typeof saved !== 'object') throw new Error('Snímka obsahuje neznáme teleso.');
        for (const key of ['a', 'b', 'c', 'ct', 'cb']) if (saved[key] != null) { if (!point(saved[key])) throw new Error('Neplatný bod snímky.'); poses[id][key] = { x: saved[key].x, y: saved[key].y }; }
        for (const key of ['angle', 'length']) if (saved[key] != null) { if (!finite(saved[key])) throw new Error('Neplatný rozmer snímky.'); poses[id][key] = saved[key]; }
        for (const key of ['path', 'outline', 'carriageOutline']) if (saved[key] != null) { if (!Array.isArray(saved[key]) || saved[key].length > 10000 || !saved[key].every(point)) throw new Error('Neplatný obrys snímky.'); poses[id][key] = saved[key].map(p=>({x:p.x,y:p.y})); }
        if (saved.rects != null) { if (!Array.isArray(saved.rects) || saved.rects.length > 1000 || !saved.rects.every(r=>['x','y','w','h'].every(k=>finite(r[k])))) throw new Error('Neplatné obdĺžniky snímky.'); poses[id].rects=saved.rects.map(r=>({x:r.x,y:r.y,w:r.w,h:r.h})); }
      }
      if (!Array.isArray(snapshot.issues) || snapshot.issues.length>240 || snapshot.issues.some(s=>typeof s!=='string'||s.length>4000)) throw new Error('Neplatná diagnostika snímky.');
    }
    return { native, result: snapshot ? {...baseline,poses,blocked:!!snapshot.blocked,issues:[...snapshot.issues]} : baseline };
  }
  global.KinmoUsability = Object.freeze({ mainDimensions, blockers, repairPreview, connectionPreview, cycleReview, elasticConstruction, issueBundle, restoreIssue });
})(globalThis);
