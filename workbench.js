/* Direct manipulation and diagnostics share the same validated project geometry. */
(function (global) {
  'use strict';
  const K = global.Kinematics, E = global.KinmoEditor, I = global.KinmoInteraction;
  const angle = (value) => ((value + 180) % 360 + 360) % 360 - 180;
  function parseNumber(input, unit = 'mm') {
    if (typeof input === 'number') { if (Number.isFinite(input)) return input; throw new Error('Zadajte konečné číslo.'); }
    if (typeof input !== 'string' || !input.trim() || input.length > 128) throw new Error('Zadajte číslo alebo krátky výraz, napríklad 300/2 alebo 12,5 cm.');
    const text = input.toLowerCase().replace(/,/g, '.').replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/'), tokens = [];
    const token = /\s*(?:(\d+(?:\.\d*)?|\.\d+)(?:e([+-]?\d+))?|(mm|cm|deg|rad|rpm|kw|w|kv|mv|v|m|°)|([()+*/-]))/gy;
    let offset = 0, match;
    while (offset < text.trimEnd().length) {
      token.lastIndex = offset; match = token.exec(text);
      if (!match || tokens.length >= 64) throw new Error('Použite iba čísla, +, −, ×, /, zátvorky a podporované jednotky.');
      offset = token.lastIndex;
      tokens.push(match[1] ? { number: Number(match[1] + (match[2] ? `e${match[2]}` : '')) } : match[3] ? { unit: match[3] } : { operator: match[4] });
    }
    const factors = unit === 'mm' ? { mm: 1, cm: 10, m: 1000 } : ['°', 'deg'].includes(unit) ? { '°': 1, deg: 1, rad: 180 / Math.PI } : unit==='W'?{w:1,kw:1000}:unit==='V'?{v:1,mv:.001,kv:1000}:unit==='rpm'?{rpm:1}:{};
    // A single trailing unit belongs to the whole expression: "300/2 cm".
    const finalUnit = tokens.at(-1)?.unit && tokens.filter((t) => t.unit).length === 1 ? tokens.pop().unit : null;
    let index = 0;
    const finite = (value) => { if (!Number.isFinite(value.value)) throw new Error('Výraz je mimo rozsahu alebo obsahuje delenie nulou.'); return value; };
    const primary = (depth) => {
      if (depth > 12) throw new Error('Výraz má príliš veľa vnorených zátvoriek.');
      const current = tokens[index++]; let value;
      if (current?.operator === '+' || current?.operator === '-') { value = primary(depth + 1); if (current.operator === '-') value.value = -value.value; }
      else if (current?.operator === '(') {
        value = expression(depth + 1);
        if (tokens[index++]?.operator !== ')') throw new Error('Uzavrite zátvorky vo výraze.');
      } else if (current && 'number' in current) value = { value: current.number, dimension: 0, explicit: false };
      else throw new Error('Vo výraze chýba číslo.');
      if (tokens[index]?.unit) {
        const symbol = tokens[index++].unit, factor = factors[symbol];
        if (factor == null || value.dimension !== 0 || value.explicit) throw new Error('Jednotka nezodpovedá zadávanému rozmeru.');
        value = { value: value.value * factor, dimension: 1, explicit: true };
      }
      return finite(value);
    };
    const term = (depth) => {
      let a = primary(depth);
      while (['*', '/'].includes(tokens[index]?.operator)) {
        const operator = tokens[index++].operator, b = primary(depth);
        if (operator === '/' && b.value === 0) throw new Error('Delenie nulou nie je dovolené.');
        a = finite({ value: operator === '*' ? a.value * b.value : a.value / b.value, dimension: operator === '*' ? a.dimension + b.dimension : a.dimension - b.dimension, explicit: a.explicit || b.explicit });
      }
      return a;
    };
    const expression = (depth) => {
      let a = term(depth);
      while (['+', '-'].includes(tokens[index]?.operator)) {
        const operator = tokens[index++].operator, b = term(depth);
        if (a.explicit && b.explicit && a.dimension !== b.dimension) throw new Error('Sčítavajte iba rovnaké jednotky.');
        a = finite({ value: operator === '+' ? a.value + b.value : a.value - b.value, dimension: a.explicit ? a.dimension : b.dimension, explicit: a.explicit || b.explicit });
      }
      return a;
    };
    const result = expression(0);
    if (index !== tokens.length || result.explicit && result.dimension !== 1) throw new Error('Výraz musí určovať jednu dĺžku alebo jeden uhol, nie plochu ani pomer jednotiek.');
    if (finalUnit && factors[finalUnit] == null) throw new Error('Jednotka nezodpovedá zadávanému rozmeru.');
    return finite({ ...result, value: result.value * (finalUnit ? factors[finalUnit] : 1) }).value;
  }
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
    for (const id of [...ids]) {
      const e = p.elements.find(v => v.id === id), housing = e.type === 'motor' && p.elements.find(v => v.id === e.parentId && v.role === 'motor-housing');
      if (housing) { ids.delete(id); ids.add(housing.id); }
    }
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
      if (e.type === 'rail' && e.movingRail && e.drive) {
        const range = K.driveRange(p), travel = K.railTravel(p, e, result.motion ?? range.min);
        const shift = K.along({ x: 0, y: 0 }, travel, e.angle); e.x += shift.x; e.y += shift.y;
      }
      if (e.drive && e.driveMode === 'linear' && e.type !== 'rail') e.driveAngle = angle(e.driveAngle + rotation);
    }
    updateAnchors(p, descendants(p, ids));
    return K.validateProject(p);
  }
  function setLength(project, id, value, fixedEnd = 'a', result = design(project)) {
    const p = K.copy(project), e = p.elements.find((v) => v.id === id), pose = result.poses[id];
    if (!e || e.primary || e.locked || !['link', 'panel', 'ground', 'rail'].includes(e.type) || e.outline.length) throw new Error('Dĺžku úchytom možno meniť na odomknutom jednoduchom člene vo voľnej kópii.');
    if (!Number.isFinite(value) || value < .1 || value > 5000 || !['a', 'b', 'center'].includes(fixedEnd)) throw new Error('Dĺžka musí byť 0,1 až 5000 mm; zachovaný bod musí byť A, B alebo stred.');
    const parent = result.poses[e.parentId], origin = parent?.[e.parentPoint] || parent?.a;
    const anchor = fixedEnd === 'b' ? pose.b : fixedEnd === 'center' ? { x: (pose.a.x + pose.b.x) / 2, y: (pose.a.y + pose.b.y) / 2 } : pose.a;
    const world = K.along(anchor, -value * (fixedEnd === 'b' ? 1 : fixedEnd === 'center' ? .5 : 0), pose.angle);
    // Store design coordinates, not a second application of the displayed drive.
    if (e.drive && e.driveMode !== 'linear') {
      const pivot = e.drivePivot === 'b' ? { x: value, y: 0 } : e.drivePivot === 'c' ? e.localC || { x: e.bearingOffset, y: 0 } : { x: 0, y: 0 };
      const before = K.rotate(pivot, e.angle + (parent?.angle || 0)), after = K.rotate(pivot, pose.angle);
      world.x += after.x - before.x; world.y += after.y - before.y;
    } else if (e.drive) {
      const base = parent ? K.rotate({ x: e.x, y: e.y }, parent.angle) : { x: e.x, y: e.y };
      world.x -= pose.a.x - base.x - (origin?.x || 0); world.y -= pose.a.y - base.y - (origin?.y || 0);
    } else {
      const difference = angle(pose.angle - (parent?.angle || 0) - e.angle);
      if (Math.abs(difference) > K.EPS) e.angle = angle(e.angle + difference);
    }
    const local = parent ? K.rotate({ x: world.x - origin.x, y: world.y - origin.y }, -parent.angle) : world;
    e.x = local.x; e.y = local.y;
    e.length = value;
    updateAnchors(p, descendants(p, [id]));
    return K.validateProject(p);
  }
  // Clearance is measured in screen pixels, independent of model units and zoom.
  // Move along the handle's action axis so dragging keeps its original meaning.
  function clearHandle(at, direction, occupied, scale = 1, clearance = 30) {
    if (!(scale > 0) || !Number.isFinite(scale)) throw new Error('Neplatná mierka úchytov.');
    const length = Math.hypot(direction.x, direction.y);
    if (!length) throw new Error('Úchyt potrebuje smer.');
    const axis = { x: direction.x / length, y: direction.y / length };
    // Each obstacle excludes a finite interval on the action ray. Jump past it
    // instead of using a capped search which could still overlap a dense model.
    const radius = clearance / scale; let travel = 0;
    for (let pass = 0; pass <= occupied.length; pass++) {
      let next = travel;
      for (const p of occupied) {
        const dx = p.x - at.x, dy = p.y - at.y, projection = dx * axis.x + dy * axis.y;
        const perpendicular = dx * axis.y - dy * axis.x;
        if (Math.abs(perpendicular) >= radius) continue;
        const half = Math.sqrt(radius * radius - perpendicular * perpendicular);
        if (travel > projection - half && travel < projection + half) next = Math.max(next, projection + half + .01 / scale);
      }
      if (next === travel) break;
      travel = next;
    }
    return { x: at.x + travel * axis.x, y: at.y + travel * axis.y };
  }
  function thickness(element) {
    if (!element || element.primary) return null;
    const key = element.type==='motor'?'motorDiameter':K.isElastic(element) ? 'diameter' : ['bearing', 'node', 'cam'].includes(element.type) ? 'radius' : ['slot', 'rail'].includes(element.type) ? 'slotWidth' : 'width';
    const span = key === 'width' && element.outline?.length ? Math.max(...element.outline.map(p => p.y)) - Math.min(...element.outline.map(p => p.y)) : 0;
    return { key, value: span || element[key] * (key === 'radius' ? 2 : 1), label: element.type === 'motor' || element.role === 'motor-housing' ? 'Priemer krytu' : key === 'radius' ? 'Priemer' : K.isElastic(element) ? 'Vonkajší priemer' : element.type === 'rail' ? 'Šírka vedenia' : element.type === 'slot' ? 'Šírka drážky' : 'Hrúbka' };
  }
  function setThickness(project, id, value) {
    const p = K.copy(project), e = p.elements.find((e) => e.id === id), size = thickness(e);
    if (!size || !Number.isFinite(value) || value < .1 || value > 500) throw new Error('Priečny rozmer musí byť 0,1 až 500 mm na vlastnom prvku.');
    if (e.role === 'motor-housing') {
      const motor = p.elements.find(v => v.type === 'motor' && v.parentId === e.id);
      if (motor) { motor.motorDiameter = value; return I.resizeMotorHousing(p,motor.id); }
    }
    if (K.isElastic(e) && value <= (e.type.startsWith('piston-') ? e.rodDiameter : 2 * e.wireDiameter)) throw new Error('Vonkajší priemer musí byť väčší než priemer tyče alebo drôtu.');
    if (e.outline?.length && size.key === 'width') {
      const center = (Math.min(...e.outline.map(p => p.y)) + Math.max(...e.outline.map(p => p.y))) / 2;
      e.outline = e.outline.map((p) => ({ x: p.x, y: center + (p.y - center) * value / size.value }));
    }
    e[size.key] = size.key === 'radius' ? value / 2 : value;
    if (e.type === 'motor') return I.resizeMotorHousing(p, e.id);
    return K.validateProject(p);
  }

  function preferredEnd(project, id) {
    const e = project.elements.find((e) => e.id === id);
    return e?.drive && e.drivePivot === 'b' || I.fixed(project, { elementId: id, point: 'b' }) && !I.fixed(project, { elementId: id, point: 'a' }) ? 'b' : 'a';
  }
  function applyDimension(project, result, options) {
    let next = K.copy(K.validateProject(project));
    const previousIndex = next.dimensions.findIndex((d) => d.id === options.id), previous = next.dimensions[previousIndex], a = options.a, b = options.b, type = options.type || 'distance';
    const record = { ...E.makeDimension(result, a, b, type, parseNumber(options.offset ?? 25)), id: previous?.id || K.uid(), name: String(options.name || '').trim(), control: null };
    if (previous?.constraintId && !next.dimensions.some((d) => d.id !== previous.id && d.constraintId === previous.constraintId)) next.connections = next.connections.filter((j) => j.id !== previous.constraintId);
    if (previous) next.dimensions.splice(previousIndex, 1);
    if (options.driving) {
      if (!a?.elementId || !b?.elementId || type === 'angle') throw new Error('Riadiaca dĺžka potrebuje dva uzly telies. Uhlová kóta je iba meracia.');
      const value = parseNumber(options.value);
      if (value < .1 || value > 5000) throw new Error('Predpísaný rozmer musí byť 0,1 až 5000 mm.');
      if (a.elementId === b.elementId) {
        const e = next.elements.find((v) => v.id === a.elementId), end = a.point === 'a' ? b.point : a.point;
        if (!e || e.primary || K.isElastic(e) || ![a.point, b.point].includes('a')) throw new Error('Tento rozmer sa nedá riadiť priamo. Vytvorte voľnú kópiu alebo upravte geometriu prvku.');
        const property = end === 'c' && e.type === 'rail' ? 'stroke' : end === 'b' && e.type !== 'slot' ? 'length' : null;
        if (!property) throw new Error('Podporovaná je dĺžka A–B alebo zdvih vedenia A–C.');
        const pa = E.resolvePoint(result, a), pb = E.resolvePoint(result, b), total = K.distance(pa, pb);
        const projection = type === 'horizontal' ? Math.abs(pb.x - pa.x) / total : type === 'vertical' ? Math.abs(pb.y - pa.y) / total : 1;
        if (projection < .00001) throw new Error('Pri tomto uhle je zvolená zložka nulová. Najskôr otočte člen alebo použite dĺžkovú kótu.');
        const length = value / projection;
        const fixedEnd = !options.fixedEnd || options.fixedEnd === 'auto' ? preferredEnd(next, e.id) : options.fixedEnd;
        if (!['a', 'b', 'center'].includes(fixedEnd)) throw new Error('Vyberte zachovaný bod A, B alebo stred.');
        if (property === 'length') { if (Math.abs(length - e.length) > K.EPS) next = setLength(next, e.id, length, fixedEnd, result); }
        else next.elements.find((v) => v.id === e.id).stroke = length;
        record.control = { elementId: e.id, property };
      } else {
        if (type !== 'distance') throw new Error('Medzi rôznymi telesami použite riadiacu dĺžku A–B. Vodorovná a zvislá kóta sú tu iba meracie.');
        if (next.kind !== 'custom' && [a, b].every((r) => next.elements.find((e) => e.id === r.elementId)?.primary)) throw new Error('Na riadenie dvoch parametrických prvkov vytvorte voľnú kópiu.');
        record.constraintId = previous?.constraintId && !next.connections.some((j) => j.id === previous.constraintId) ? previous.constraintId : K.uid();
        next.connections.push({ id: record.constraintId, name: record.name || 'Riadiaca kóta', a, b, type: 'distance', value, builtin: false });
      }
    }
    if (previous) next.dimensions.splice(previousIndex, 0, record);
    else next.dimensions.push(record);
    return K.validateProject(next);
  }
  function constraints(project, result) {
    const elements = new Map(project.elements.map((e) => [e.id, e])), rows = [];
    for (const j of project.connections) {
      const pa = result.poses[j.a.elementId], pb = result.poses[j.b.elementId], type = j.type || 'revolute';
      let a = pa?.[j.a.point], b = pb?.[j.b.point];
      const roller = elements.get((j.a.point === 'curve' ? j.b : j.a).elementId);
      const nearest = (point, pose) => type === 'cam-contact' ? K.nearestOnCam(point, pose, roller.primary ? project.parameters.bearingRadius : roller.radius) : K.nearestOnPath(point, pose.path);
      if (j.a.point === 'curve' && b && pa?.path?.length) a = nearest(b, pa);
      if (j.b.point === 'curve' && a && pb?.path?.length) b = nearest(a, pb);
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
      if (!drivers.length && project.elements.length) hints.push(project.elements.some(K.isElastic) ? 'Bez predpísaného pohonu použite Pohyb zo síl; pružné členy môžu rozhýbať pripojené telesá.' : 'Chýba priradený pohon. Statická geometria môže byť platná, ale simulátor nevie, ktorý pohyb má meniť.');
      if (drivers.length > 1 && !project.driveProgram) hints.push('Model má viac pohonov. Tento simulátor podporuje iba jeden nezávislý vstup.');
      if (freedom.free) hints.push(`Po určení pohonu zostáva ${freedom.free} voľných súradníc. Doplňte uloženie, ďalší kĺb alebo vedenie. Limity pohybu nenahrádzajú väzbu.`);
      for (const e of project.elements.filter((e) => !e.parentId && !e.locked && !e.drive && ['link', 'panel', 'cam', 'motor', 'bearing', 'node'].includes(e.type))) {
        const family = descendants(project, [e.id]);
        const linked = project.connections.some((j) => family.has(j.a.elementId) !== family.has(j.b.elementId));
        if (!linked && !project.elements.filter(K.isElastic).some(v=>[v.mountA,v.mountB].some(r=>r&&family.has(r.elementId))) && !(e.type === 'bearing' && e.slotId)) hints.push(`„${e.name}“ nemá väzbu na iné teleso. Voľný bod potrebuje polohové uloženie; tuhý člen aj určenie orientácie.`);
      }
    }
    if (duplicates.length) hints.push('Opakované väzby medzi rovnakými uzlami sú nadbytočné. Odstránenie kópie nemení ich požadovanú hodnotu.');
    if (conflicts.length) hints.push('Rovnakým uzlom sú predpísané rozdielne hodnoty rovnakej väzby. Tieto požiadavky sú v konflikte.');
    if (rows.some((r) => r.status === 'error')) hints.push('Zvýraznené väzby nie sú v zobrazenej polohe splnené. V editácii sa nevynucujú; v simulácii skontrolujte dĺžky, pevné body, uhly a dorazy.');
    if (rows.some((r) => r.status === 'missing')) hints.push('Niektorá väzba nemá dostupný uzol alebo vodiacu krivku.');
    if (rows.some((r) => r.prescribed)) hints.push('Bodové väzby chránenej šablóny riadi parametrický zákon. Ich samostatné rezíduá sa neodhadujú zo symbolických dvojíc bodov.');
    const checks = [];
    const movable = project.elements.filter((e) => !e.parentId && !e.locked && !['ground', 'slot'].includes(e.type));
    if (project.kind === 'custom' && movable.length && !project.elements.some((e) => e.drive)) checks.push(project.elements.some(K.isElastic) ? { key:I.elementKey(movable[0].id),message:'Bez motora: spustiť Pohyb zo síl pripojených pružných členov.',action:'forces' } : { key: I.elementKey(movable[0].id), message: 'Chýba pohon. Vyberte prvok a priraďte mu pohyb.', action: 'motor' });
    for (const e of movable.filter((e) => !e.drive && !K.isElastic(e))) {
      const family = descendants(project, [e.id]), joints = project.connections.filter((j) => family.has(j.a.elementId) !== family.has(j.b.elementId));
      if (!joints.length && !project.elements.filter(K.isElastic).some(v=>[v.mountA,v.mountB].some(r=>r&&family.has(r.elementId))) && !(e.type === 'bearing' && e.slotId)) checks.push({ key: I.elementKey(e.id), message: `${e.name}: chýba spojenie s ďalším prvkom.`, action: 'connect' });
      else if (joints.length === 1 && joints[0].type === 'revolute' && ['link', 'panel', 'cam', 'motor'].includes(e.type)) checks.push({ key: I.elementKey(e.id), message: `${e.name}: jeden otočný spoj ešte umožňuje voľné otáčanie.`, action: 'support' });
    }
    for (const pair of conflicts) checks.push({ key: I.jointKey(pair[0]), otherKey: I.jointKey(pair[1]), message: 'Tieto dve väzby si odporujú. Skontrolujte ich hodnoty.', action: 'joint' });
    for (const row of rows.filter((r) => ['error', 'missing'].includes(r.status))) checks.push({ key: row.key, message: `${row.name}: ${row.status === 'missing' ? 'chýba bod alebo dráha' : 'body alebo uhly sa nezhodujú'}.`, action: 'joint' });
    return { rows, freedom, hints, duplicates, conflicts, checks };
  }
  function analyzeSweep(project, samples) {
    const p = K.validateProject(project);
    if (!Array.isArray(samples) || samples.length < 2 || samples.length > 501 || samples.some((s) => !Number.isFinite(s?.motion) || !s.poses)) throw new Error('Analýza potrebuje 2 až 501 platných vzoriek pohybu.');
    const blocks = [], jointRows = new Map();
    let active = null;
    for (const sample of samples) {
      if (sample.blocked) {
        if (!active) { active = { start: sample.motion, end: sample.motion, issue: sample.issues?.[0] || 'Nesplnená väzba alebo kolízia.' }; blocks.push(active); }
        else active.end = sample.motion;
      } else active = null;
      for (const row of constraints(p, sample)) {
        const previous = jointRows.get(row.id);
        if (!previous) jointRows.set(row.id, { ...row, mmAt: sample.motion, degreesAt: sample.motion });
        else {
          if (row.mm != null && (previous.mm == null || row.mm > previous.mm)) { previous.mm = row.mm; previous.mmAt = sample.motion; }
          if (row.degrees != null && (previous.degrees == null || row.degrees > previous.degrees)) { previous.degrees = row.degrees; previous.degreesAt = sample.motion; }
          if (row.status === 'error' || row.status === 'missing') previous.status = row.status;
        }
      }
    }
    const bodyRows = p.elements.filter((e) => e.visible && e.role !== 'canvas-anchor').map((e) => {
      const reference = K.defaultTracePoint(e);
      const poses = samples.map((s) => s.poses[e.id]), points = poses.map((pose) => pose?.[reference]).filter((v) => v && Number.isFinite(v.x) && Number.isFinite(v.y));
      let previous = null, unwrapped = 0;
      const angles = poses.flatMap((pose) => {
        if (!Number.isFinite(pose?.angle)) return [];
        unwrapped = previous == null ? pose.angle : unwrapped + angle(pose.angle - previous);
        previous = pose.angle; return [unwrapped];
      });
      const span = (key) => points.length ? Math.max(...points.map((v) => v[key])) - Math.min(...points.map((v) => v[key])) : null;
      const path = points.reduce((total, at, i) => total + (i ? K.distance(at, points[i - 1]) : 0), 0);
      return { id: e.id, name: e.name, reference, spanX: span('x'), spanY: span('y'), path, angleMin: angles.length ? Math.min(...angles) : null, angleMax: angles.length ? Math.max(...angles) : null, complete: points.length === samples.length };
    });
    const maximum = (key) => {
      const values = samples.filter((s) => Number.isFinite(s[key]));
      return values.length ? Math.max(...values.map((s) => s[key])) : null;
    };
    return {
      count: samples.length, blocked: samples.filter((s) => s.blocked).length, blocks, bodies: bodyRows, joints: [...jointRows.values()],
      positionResidual: maximum('positionResidual'), angularResidual: maximum('angularResidual'),
      freedom: E.freedom(p, samples[0]), hints: diagnose(p, samples[0]).hints, hasDrive: p.kind !== 'custom' || p.elements.some((e) => e.drive),
    };
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
  function movingSnapPoints(project, keys, result, wholeBodies, inserting = false) {
    const targets = I.validSelection(project, keys).map((key) => I.target(project, key));
    const full = new Set(targets.filter((t) => t.type === 'link' || wholeBodies && t.type === 'node').map((t) => t.elementId));
    const movable = [...full].filter((id) => {
      const e = project.elements.find((e) => e.id === id);
      return !e.primary && (inserting || !e.locked) && (!K.isElastic(e) || !['a', 'b'].some((key) => K.elasticMount(project, e, key))) && !carried(project, e, full);
    });
    const family = descendants(project, movable), points = [];
    for (const e of project.elements.filter((e) => e.visible && family.has(e.id))) points.push(...snapPoints(project, e, result));
    for (const t of targets.filter((t) => t.type === 'node' && !family.has(t.elementId) && !full.has(t.elementId))) {
      const r = I.reference(t), e = t.element, at = K.point(result, r);
      if (at && !e.primary && (!K.isElastic(e) || !K.elasticMount(project, e, r.point)) && (inserting || !I.fixed(project, r)) && !carried(project, e, full)) points.push({ elementId: e.id, ref: r, at, kind: 'endpoint' });
    }
    return points;
  }
  function findSnap(project, keys, result, delta, options = {}) {
    if (options.enabled !== true) return null;
    let tolerance = options.tolerance ?? 8;
    if (![delta.x, delta.y, tolerance].every(Number.isFinite) || tolerance <= 0) throw new Error('Neplatný posun alebo tolerancia prichytávania.');
    const sources = movingSnapPoints(project, keys, result, !!options.wholeBodies, !!options.inserting).filter((s) => !options.sourcePoint || s.ref?.point === options.sourcePoint), excluded = new Set(sources.map((s) => s.elementId));
    const enterTolerance = tolerance, releaseTolerance = options.previous ? tolerance * 1.5 : tolerance;
    tolerance = releaseTolerance;
    const roots = new Set(sources.map((s) => I.root(project, project.elements.find((e) => e.id === s.elementId))?.id));
    const candidates = [], destinations = project.elements.filter((e) => e.visible && !excluded.has(e.id) && !roots.has(I.root(project, e)?.id));
    const offer = (source, target, point, kind, distance, tier = 0) => {
      const at = { x: source.at.x + delta.x, y: source.at.y + delta.y };
      if (options.axis === 'x' && Math.abs(point.y - at.y) > .00001 || options.axis === 'y' && Math.abs(point.x - at.x) > .00001) return;
      const adjustment = { x: point.x - at.x, y: point.y - at.y };
      const targetName = project.elements.find((e) => e.id === target.elementId)?.name;
      const label = (targetName ? `${targetName} · ` : '') + ({ endpoint: target.ref ? K.pointName(target.ref.point, project.elements.find(e => e.id === target.elementId)) + ' · montážny bod' : 'Uzlový bod', midpoint: 'Stred člena', guide: 'Vodiaca krivka', 'cam-contact': 'Vačkový kontakt · valček', axis: 'Stredová os', edge: 'Obrys / hrana', trajectory: 'Trajektória', 'alignment-x': 'Zarovnanie X', 'alignment-y': 'Zarovnanie Y' })[kind];
      candidates.push({ source: K.copy(source), target: K.copy(target), point: { x: point.x, y: point.y }, delta: { x: delta.x + adjustment.x, y: delta.y + adjustment.y }, kind, distance, tier, label, priority: options.cursor ? K.distance(source.at, options.cursor) : 0 });
    };
    const targets = destinations.flatMap((e) => snapPoints(project, e, result));
    const guides = destinations.flatMap((e) => {
      const pose = result.poses[e.id];
      if (!pose) return [];
      const paths = ['slot', 'rail', 'cam'].includes(e.type) ? [{ path: pose.path, kind: e.type === 'cam' ? 'cam-contact' : 'guide', ref: { elementId: e.id, point: 'curve' } }] : K.distance(pose.a, pose.b) > K.EPS ? [{ path: [pose.a, pose.b], kind: 'axis' }] : [];
      const outline = e.type === 'rail' ? pose.carriageOutline : pose.outline;
      if (outline?.length) paths.push({ path: [...outline, outline[0]], kind: 'edge' });
      if (e.type === 'panel' && !outline?.length) {
        const normal = K.rotate({ x: 0, y: (e.primary ? project.parameters.panelThickness : e.width) / 2 }, pose.angle);
        for (const sign of [-1, 1]) paths.push({ path: [pose.a, pose.b].map((p) => ({ x: p.x + sign * normal.x, y: p.y + sign * normal.y })), kind: 'edge' });
      }
      return paths.map((path) => ({ ...path, elementId: e.id }));
    }).concat((options.paths || []).filter((p) => Array.isArray(p.points) && p.points.length > 1 && p.points.length <= 1001).map((p) => ({ path: p.points, kind: 'trajectory', id: p.id }))).map((descriptor) => {
      const path = descriptor.path || [];
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const p of path) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
      return { ...descriptor, path, minX, maxX, minY, maxY };
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
        const roller = project.elements.find((e) => e.id === source.ref?.elementId), contact = guide.kind === 'cam-contact';
        if (contact && (roller?.type !== 'bearing' || source.ref.point !== 'a')) continue;
        const radius = contact ? roller.primary ? project.parameters.bearingRadius : roller.radius : 0, margin = tolerance + radius;
        if (guide.path.length < 2 || at.x < guide.minX - margin || at.x > guide.maxX + margin || at.y < guide.minY - margin || at.y > guide.maxY + margin) continue;
        const nearest = contact ? K.nearestOnCam(at, result.poses[guide.elementId], radius) : K.nearestOnPath(at, guide.path);
        if (nearest.distance <= tolerance) offer(source, { elementId: guide.elementId || '', ref: guide.ref, at: nearest, kind: guide.kind, id: guide.id }, nearest, guide.kind, nearest.distance, ['guide', 'cam-contact'].includes(guide.kind) ? 0 : .5);
      }
    }
    const priority = { endpoint: 0, midpoint: 1, guide: 2, 'cam-contact': 2, axis: 3, edge: 4, trajectory: 4, 'alignment-x': 5, 'alignment-y': 5 };
    const sameTarget = (a, b) => a && b && a.kind === b.kind && (options.inserting || a.source.elementId === b.source.elementId) && a.source.ref?.point === b.source.ref?.point && a.target.elementId === b.target.elementId && a.target.ref?.point === b.target.ref?.point && a.target.kind === b.target.kind && a.target.id === b.target.id;
    const retained = options.previous && candidates.find((c) => sameTarget(c, options.previous) && c.distance <= releaseTolerance);
    const entering = candidates.filter((c) => c.distance <= enterTolerance);
    const stronger = retained && entering.filter((c) => c.tier < retained.tier || c.tier === retained.tier && priority[c.kind] < priority[retained.kind]);
    const choice = selected => {
      if (!selected) return null;
      const alternatives = [selected, ...entering.filter(c => c !== selected && c.source.elementId === selected.source.elementId && c.source.ref?.point === selected.source.ref?.point && ['endpoint','midpoint','guide','cam-contact'].includes(c.kind))];
      const unique = alternatives.filter((c, i) => !alternatives.slice(0, i).some(other => sameTarget(c, other))).slice(0, 16);
      return { ...selected, motion: result.motion, wholeBody: !!options.wholeBodies || !!options.inserting,
        alternatives: unique.map(c => ({ ...c, motion: result.motion, wholeBody: !!options.wholeBodies || !!options.inserting })) };
    };
    if (retained && !stronger.length) return choice(retained);
    if (stronger?.length) { stronger.sort((a, b) => a.tier - b.tier || priority[a.kind] - priority[b.kind] || a.distance - b.distance); return choice(stronger[0]); }
    entering.sort((a, b) => a.tier - b.tier || (Math.abs(a.distance - b.distance) > .00001 ? a.distance - b.distance : priority[a.kind] - priority[b.kind] || a.priority - b.priority));
    return choice(entering[0]);
  }
  function findPlacementSnap(project, element, options = {}) {
    if (options.enabled !== true) return null;
    const p = K.copy(project), e = K.copy(element);
    if (e.drive && (p.kind !== 'custom' || p.elements.some((body) => body.drive))) e.drive = false;
    p.elements.push(e);
    const validated = K.validateProject(p);
    return findSnap(validated, [I.elementKey(e.id)], design(validated), { x: 0, y: 0 }, { ...options, inserting: true, wholeBodies: true });
  }
  function placement(project, type, at, mount = 'a') {
    const e = K.makeElement(type, at.x, at.y), p = K.copy(project);
    if (!I.pointKeys(e).includes(mount)) throw new Error('Vyberte existujúci montážny bod prvku.');
    if (e.drive && (p.kind !== 'custom' || p.elements.some((v) => v.drive))) e.drive = false;
    p.elements.push(e);
    const point = K.point(design(K.validateProject(p)), { elementId: e.id, point: mount });
    e.x += at.x - point.x; e.y += at.y - point.y;
    return e;
  }
  function connectSnap(project, preview, type = null) {
    if (!preview || !['endpoint', 'midpoint', 'guide', 'cam-contact'].includes(preview.kind)) throw new Error('Osové zarovnanie nevytvára kĺb. Vyberte skutočný bod, stred alebo vedenie.');
    const p = K.copy(project);
    const materialize = (descriptor) => {
      if (descriptor.ref) return K.copy(descriptor.ref);
      const host = p.elements.find((e) => e.id === descriptor.elementId), local = descriptor.local;
      if (!host || !local || ![local.x, local.y].every(Number.isFinite)) throw new Error('Stredový bod už nie je dostupný.');
      const node = { ...K.makeElement('node', local.x, local.y), parentId: host.id, parentPoint: 'a', radius: 3, length: 1, role: 'poi', name: `${host.name} · stred prichytenia` };
      p.elements.push(node);
      return { elementId: node.id, point: 'a' };
    };
    const a = materialize(preview.source), b = materialize(preview.target), result = E.design(p, preview.motion ?? K.driveRange(p).min), first = K.point(result, a);
    if (I.root(p, p.elements.find((e) => e.id === a.elementId))?.id === I.root(p, p.elements.find((e) => e.id === b.elementId))?.id) throw new Error('Uzly patria tomu istému tuhému telesu; ďalší kĺb by bol nadbytočný.');
    const target = p.elements.find((e) => e.id === b.elementId), source = p.elements.find((e) => e.id === a.elementId);
    const path = result.poses[b.elementId]?.path, second = b.point === 'curve' && first && path?.length ? target.type === 'cam' ? K.nearestOnCam(first, result.poses[b.elementId], source.radius) : K.nearestOnPath(first, path) : K.point(result, b);
    if (!first || !second || K.distance(first, second) > K.TOLERANCE) throw new Error('Body sa už nezhodujú. Najskôr ich znova prichyťte.');
    if (p.connections.some((j) => [j.a, j.b].some((r) => r.elementId === a.elementId && r.point === a.point) && [j.a, j.b].some((r) => r.elementId === b.elementId && r.point === b.point))) throw new Error('Tieto body už majú väzbu. Jej typ zmeňte cez úpravu kĺbu.');
    const mode = type || I.suggestJoint(p, a, b);
    if (b.point === 'curve' ? !['prismatic', 'point-path', 'cam-contact'].includes(mode) : !['revolute', 'fixed'].includes(mode)) throw new Error('Typ spojenia nezodpovedá prichytenému bodu.');
    const value = ['prismatic', 'fixed'].includes(mode) ? angle(result.poses[b.elementId].angle - result.poses[a.elementId].angle) : 0;
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
    p.importReference = null; p.motionPlan = null;
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
    parseNumber, applyDimension, preferredEnd, bodies, descendants, pivot, clearHandle, transform, setLength, thickness, setThickness, constraints, diagnose, analyzeSweep, findSnap, findPlacementSnap, placement, connectSnap,
    collectionLimits, normalizeRecord, normalizeCollection, serializeCollection, mergeCollection,
    captureAssembly, insertAssembly, createRevision, restoreRevision, compareDimensions,
  });
})(globalThis);
