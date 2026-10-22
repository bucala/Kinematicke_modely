/* Geometry editing is deliberately separate from solving constrained motion. */
(function (global) {
  'use strict';
  const K = global.Kinematics;
  const constraintNames = {
    revolute: 'Otočný kĺb', prismatic: 'Posuvný kĺb', 'point-path': 'Čap vo vedení', 'cam-contact': 'Vačkový kontakt · valček', distance: 'Pevná vzdialenosť',
    fixed: 'Pevné spojenie', parallel: 'Rovnobežnosť', angle: 'Pevný relatívny uhol',
  };
  const resolvePoint = (result, reference) => reference?.elementId ? K.point(result, reference) : reference;

  function design(project, motion, options = {}) {
    return K.solve(project, motion, { ...options, design: true, collisions: false });
  }

  function editableCopy(original, motion = K.driveRange(original).min) {
    const result = K.solve(original, motion, { collisions: false });
    const project = K.copy(original);
    project.id = K.uid(); project.name = `${original.name} · voľná kópia`;
    project.kind = 'custom'; project.controls = null; project.motionPlan = null;
    project.parameters = { ...K.copy(K.defaults), travelMax: K.driveRange(original).max - K.driveRange(original).min };
    project.simulation = { ...K.simulationDefaults, ...original.simulation, mode: 'kinematic' };
    project.dimensions = project.dimensions || []; project.trajectories = project.trajectories || [];
    project.source = {
      kind: original.kind, name: original.name, motion,
      note: original.kind === 'double-drawer'
        ? 'Voľná geometrická kópia aktuálnej polohy. Predpísané uvoľnenie zadnej opory nie je prenesené. Doplňte skutočnú väzbu opory; pôvodný parametrický projekt zostáva zachovaný.'
        : 'Voľná geometrická kópia aktuálnej polohy. Parametrický pohybový zákon je nahradený editovateľnými telesami a väzbami.',
    };
    const poses = {};
    for (const e of project.elements) {
      const pose = result.poses[e.id];
      if (!pose) continue;
      const source = original.elements.find((v) => v.id === e.id);
      const wasPrimary = e.primary;
      e.primary = false; e.drive = false; e.role = '';
      e.locked = ['ground', 'slot', 'rail'].includes(e.type);
      e.x = pose.a.x; e.y = pose.a.y;
      e.angle = e.type === 'bearing' ? 0 : K.angleOf(pose.a, pose.b);
      e.length = Math.max(1, K.distance(pose.a, pose.b));
      poses[e.id] = { ...pose, angle: e.angle };
      if (wasPrimary) {
        if (e.type === 'panel') e.width = original.parameters.panelThickness;
        if (e.type === 'bearing') e.radius = original.parameters.bearingRadius;
        if (e.type === 'slot') e.slotWidth = source.role === 'rearSlot' ? 8 : original.parameters.slotWidth;
      }
      if (e.type === 'panel' && pose.c) e.localC = K.localPoint(poses[e.id], pose.c);
      const templateOutline = original.kind==='drawer' && source.type==='rail' ? null : K.templateOutlines(original,source,pose,motion)[0];
      if (pose.outline || templateOutline) e.outline = (pose.outline || templateOutline).map((v) => K.localPoint(poses[e.id], v));
      if (e.type === 'slot') {
        e.angle = 0; e.curveKind = 'polyline';
        e.controls = pose.path.map((v) => ({ x: v.x - e.x, y: v.y - e.y }));
      }
      if (source.role === 'input' && ['fourbar', 'crank'].includes(original.kind)) e.drive = true;
      if (original.kind === 'drawer' && source.role === 'rail') {
        e.x = pose.c.x; e.y = pose.c.y; e.angle = 0;
        e.length = e.stroke = project.parameters.travelMax;
        e.drive = true; e.driveMode = 'linear';
      }
      if (original.kind === 'double-drawer') {
        if (source.role === 'carrier') {
          e.type = 'link'; e.locked = false; e.drive = true;
          e.driveMode = 'linear'; e.driveAngle = 0; e.stroke = project.parameters.travelMax;
        }
        if (source.role === 'bracket') {
          e.width = 4;
          e.outline = [{ x: 0, y: 0 }, K.localPoint(poses[e.id], pose.b), K.localPoint(poses[e.id], pose.c)];
        }
        if (source.role === 'table' && pose.rects) {
          // A split table is represented by its actual two rectangular bodies.
          const [first, second] = pose.rects;
          e.length = first.w; e.width = first.h;
          e.outline = [{ x: 0, y: 0 }, { x: first.w, y: 0 }, { x: first.w, y: first.h }, { x: 0, y: first.h }];
          const extra = {
            ...K.makeElement('ground', second.x, second.y), id: K.uid(), name: 'Platforma stola · pravá časť',
            length: second.w, width: second.h,
            outline: [{ x: 0, y: 0 }, { x: second.w, y: 0 }, { x: second.w, y: second.h }, { x: 0, y: second.h }],
          };
          project.elements.push(extra);
        }
      }
      if (!wasPrimary) {
        e.parentId = source.parentId || ''; e.parentPoint = source.parentPoint || 'a';
        if (e.parentId && result.poses[e.parentId]) {
          const parent = result.poses[e.parentId], origin = parent[e.parentPoint] || parent.a;
          const v = K.rotate({ x: pose.a.x - origin.x, y: pose.a.y - origin.y }, -parent.angle);
          e.x = v.x; e.y = v.y; e.angle -= parent.angle;
        }
        e.drive = source.drive;
      }
    }
    if (original.kind === 'double-drawer') {
      for (const id of ['rear-slot', 'slot-1', 'slot-2']) {
        const e = project.elements.find((v) => v.id === id), parent = poses['rail-1'];
        e.parentId = 'rail-1'; e.parentPoint = 'a'; e.x = e.y = e.angle = 0;
        e.controls = result.poses[id].path.map((v) => K.localPoint(parent, v));
      }
      for (const [id, point] of [['bearing-1', 'c'], ['bearing-2', 'a'], ['panel-1', 'b']]) {
        const e = project.elements.find((v) => v.id === id), parent = poses['bracket-1'];
        e.parentId = 'bracket-1'; e.parentPoint = point; e.x = e.y = 0; e.angle -= parent.angle;
      }
    }
    project.connections = project.connections.filter((j) => !(original.kind === 'drawer' && [j.a.elementId, j.b.elementId].includes('frame-1') && [j.a.elementId, j.b.elementId].includes('rail-1'))).map((j) => ({
      ...j, builtin: false, type: j.type || (j.a.point === 'curve' || j.b.point === 'curve' ? 'point-path' : 'revolute'), value: j.value || 0,
    }));
    if (original.kind === 'drawer') {
      const remap = (r) => { if (r?.elementId === 'rail-1' && r.point === 'b') r.point = 'c'; };
      project.connections.forEach((j) => { remap(j.a); remap(j.b); });
      project.dimensions.forEach((d) => { remap(d.a); remap(d.b); });
      project.trajectories.forEach((t) => remap(t.reference));
      project.elements.forEach((e) => { remap(e.mountA); remap(e.mountB); });
    }
    if (project.elements.length > 120) throw new Error('Pre voľnú kópiu chýba miesto. Projekt môže obsahovať najviac 120 prvkov.');
    return K.validateProject(project);
  }

  function makeDimension(result, a, b, type = 'distance', offset = 25) {
    const pa = resolvePoint(result, a), pb = resolvePoint(result, b);
    if (!pa || !pb || K.distance(pa, pb) < K.EPS) throw new Error('Vyberte dva rôzne platné body kóty.');
    return { id: K.uid(), type, a: K.copy(a), b: K.copy(b), offset, name: '', visible: true, constraintId: '' };
  }

  function dimensionValue(result, dimension) {
    const a = resolvePoint(result, dimension.a), b = resolvePoint(result, dimension.b);
    if (!a || !b) return null;
    if (dimension.type === 'horizontal') return Math.abs(b.x - a.x);
    if (dimension.type === 'vertical') return Math.abs(b.y - a.y);
    if (dimension.type === 'angle') return K.angleOf(a, b);
    return K.distance(a, b);
  }

  function materializeTrajectory(project, trajectory, samples) {
    if (project.elements.length >= 120) throw new Error('Bol dosiahnutý limit 120 prvkov.');
    const points = samples.map((s) => {
      if (s.blocked) throw new Error('Trajektóriu nemožno previesť na vodidlo cez blokovanú polohu.');
      return K.tracePoint(s, trajectory.reference, trajectory.space);
    });
    if (points.some((p) => !p)) throw new Error('Trajektória odkazuje na neexistujúci bod.');
    if (points.every((p) => K.distance(p, points[0]) < 0.01)) throw new Error('Zvolený bod sa nepohybuje. Nie je z neho možné vytvoriť vodidlo.');
    const e = K.makeElement('slot', points[0].x, points[0].y);
    e.name = `${trajectory.name} · voľná vodiaca krivka`;
    e.curveKind = 'polyline'; e.guideOnly = true; e.locked = true;
    e.controls = points.map((p) => ({ x: p.x - e.x, y: p.y - e.y }));
    e.length = Math.max(1, K.distance(points[0], points.at(-1)));
    return e;
  }

  // Rank of the local constraint Jacobian, after fixing the single input.
  // A free extra coordinate means the dynamics cannot be reduced to that input.
  function freedom(project, result) {
    if (project.kind !== 'custom') return { free: 0, driven: true, rank: 0, variables: 0 };
    const driven = project.elements.filter((e) => e.drive).length >= 1;
    const bodies = project.elements.filter((e) => !e.parentId && !e.locked && !e.drive && ['link', 'panel', 'cam', 'motor', 'bearing', 'node'].includes(e.type));
    const variables = bodies.flatMap((e) => ['x', 'y', ...(['bearing', 'node'].includes(e.type) ? [] : ['angle'])].map((key) => ({ id: e.id, key })));
    for(const rail of project.elements.filter(e=>e.type==='rail'&&!e.primary&&!e.drive&&!e.movingRail&&project.connections.some(j=>[j.a,j.b].some(r=>K.carriageReference(project,e,r)))))variables.push({id:rail.id,key:'carriage'});
    const base = K.copy(result.poses);
    const residuals = (poses) => {
      const rows = [];
      const pathError = (p, path) => {
        const n = K.nearestOnPath(p, path), a = path[n.segment], b = path[n.segment + 1] || a;
        return ((b.x - a.x) * (p.y - n.y) - (b.y - a.y) * (p.x - n.x)) / (K.distance(a, b) || 1);
      };
      for (const j of project.connections) {
        if (j.builtin || j.contact?.enabled || [j.a, j.b].some((r) => K.isElastic(project.elements.find((e) => e.id === r.elementId)))) continue;
        const pa = poses[j.a.elementId], pb = poses[j.b.elementId];
        const a = pa?.[j.a.point], b = pb?.[j.b.point];
        const type = j.type || (j.a.point === 'curve' || j.b.point === 'curve' ? 'point-path' : 'revolute');
        if (type === 'cam-contact') {
          const guide = j.a.point === 'curve' ? pa : pb, point = j.a.point === 'curve' ? b : a, r = j.a.point === 'curve' ? j.b : j.a;
          const roller = project.elements.find((e) => e.id === r.elementId);
          if (guide?.path && point) {
            const contact = K.contactTarget(point,guide,poses[roller.id],j.surface,roller.type==='bearing'?(roller.primary?project.parameters.bearingRadius:roller.radius):0);
            rows.push((point.x - contact.x) * contact.normal.x + (point.y - contact.y) * contact.normal.y);
          }
        } else if (['point-path', 'prismatic'].includes(type)) {
          if (j.a.point === 'curve' && b && pa?.path) rows.push(pathError(b, pa.path));
          if (j.b.point === 'curve' && a && pb?.path) rows.push(pathError(a, pb.path));
          if (type === 'prismatic' && K.hasOrientation(project, j.a.point === 'curve' ? j.b : j.a)) rows.push(((((pb.angle - pa.angle - (j.value || 0) + 180) % 360) + 360) % 360 - 180) * K.DEG * 100);
        } else if (a && b) {
          if (type === 'distance') rows.push(K.distance(a, b) - (j.value || 0));
          else {
            if (!['angle', 'parallel'].includes(type)) rows.push(a.x - b.x, a.y - b.y);
            if (['angle', 'parallel', 'fixed'].includes(type)) rows.push(((((pb.angle - pa.angle - (j.value || 0) + 180) % 360) + 360) % 360 - 180) * K.DEG * 100);
          }
        }
      }
      for (const e of project.elements.filter((v) => v.type === 'bearing' && v.slotId)) {
        if (poses[e.slotId]?.path) rows.push(pathError(poses[e.id].a, poses[e.slotId].path));
      }
      return rows;
    };
    const original = residuals(base);
    const columns = variables.map(({ id, key }) => {
      const poses = K.copy(base), e = project.elements.find((v) => v.id === id), pose = poses[id];
      const delta = key === 'angle' ? 0.0001 / K.DEG : 0.01;
      if (key === 'angle') {
        pose.angle += delta;
        for (const point of ['b', 'c']) if (pose[point]) pose[point] = K.worldPoint(pose, K.localPoint(base[id], base[id][point]));
      } else if(key==='carriage'){const axis=K.rotate({x:delta,y:0},pose.angle);for(const key of K.carriagePoints)if(pose[key]){pose[key].x+=axis.x;pose[key].y+=axis.y;}if(pose.carriageOutline)pose.carriageOutline=pose.carriageOutline.map(p=>({x:p.x+axis.x,y:p.y+axis.y}));}
      else {
        for (const point of ['a', 'b', 'c']) if (pose[point]) pose[point][key] += delta;
      }
      if (e.type === 'cam') poses[id] = K.bodyPose({ ...e, x: pose.a.x, y: pose.a.y, angle: pose.angle }, result.motion, project);
      const done = new Set([id]);
      const updateChildren = (parentId) => {
        for (const child of project.elements.filter((v) => v.parentId === parentId)) {
          if (done.has(child.id)) continue;
          const parent = poses[parentId], origin = parent[child.parentPoint || 'a'] || parent.a;
          const v = K.rotate({ x: child.x, y: child.y }, parent.angle);
          const relative = base[child.id].angle - base[parentId].angle;
          poses[child.id] = K.bodyPose({ ...child, x: origin.x + v.x, y: origin.y + v.y, angle: relative + parent.angle }, result.motion, project);
          done.add(child.id); updateChildren(child.id);
        }
      };
      updateChildren(e.id);
      return residuals(poses).map((v, i) => (v - original[i]) / (key === 'angle' ? 0.0001 : delta));
    });
    const matrix = original.map((_, row) => columns.map((column) => column[row]));
    let rank = 0; const pivots = [];
    for (let column = 0; column < variables.length && rank < matrix.length; column++) {
      let pivot = rank;
      for (let row = rank + 1; row < matrix.length; row++) if (Math.abs(matrix[row][column]) > Math.abs(matrix[pivot][column])) pivot = row;
      if (Math.abs(matrix[pivot][column]) < 1e-5) continue;
      [matrix[rank], matrix[pivot]] = [matrix[pivot], matrix[rank]];
      const factor = matrix[rank][column];
      for (let c = column; c < variables.length; c++) matrix[rank][c] /= factor;
      for (let row = rank + 1; row < matrix.length; row++) {
        const amount = matrix[row][column];
        for (let c = column; c < variables.length; c++) matrix[row][c] -= amount * matrix[rank][c];
      }
      pivots.push(column); rank++;
    }
    const basis = [];
    for (let column = 0; column < variables.length; column++) if (!pivots.includes(column)) {
      const v = Array(variables.length).fill(0); v[column] = 1;
      for (let row = pivots.length - 1; row >= 0; row--) { const pivot=pivots[row]; v[pivot] = -matrix[row].reduce((sum,coefficient,c)=>sum+(c>pivot?coefficient*v[c]:0),0); } basis.push(v);
    }
    const directions = bodies.map((e) => ({ elementId: e.id, vectors: basis.map((v) => {
      const get = (key) => { const index = variables.findIndex((a) => a.id === e.id && a.key === key); return index < 0 ? 0 : v[index]; };
      return { x: get('x'), y: get('y'), angle: get('angle') };
    }).filter((v) => Math.hypot(v.x, v.y, v.angle) > .0001) }));
    return { directions, driven, free: Math.max(0, variables.length - rank), rank, variables: variables.length };
  }

  global.KinmoEditor = Object.freeze({
    design, editableCopy, constraintNames, resolvePoint, makeDimension, dimensionValue, materializeTrajectory, freedom,
  });
})(globalThis);
