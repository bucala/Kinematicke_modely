/* Polygonal width offsets are reference geometry, never a manufacturing profile. */
(function (global) {
  'use strict';
  const EPS = 1e-7, MAX_VERTICES = 1001;
  const warning = 'Obrysy drážok sú polygonové referenčné odsadenia vzorkovanej strednice podľa zadanej šírky. Neoverujú nástroj, vôľu, výrobnú toleranciu, pevnosť ani funkciu uloženia.';
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  function nearest(point, a, b) {
    const x = b.x - a.x, y = b.y - a.y, square = x * x + y * y;
    const t = square ? Math.max(0, Math.min(1, ((point.x - a.x) * x + (point.y - a.y) * y) / square)) : 0;
    return distance(point, { x: a.x + t * x, y: a.y + t * y });
  }
  function clean(points) {
    const result = [];
    for (const p of points) if (!result.length || distance(p, result.at(-1)) > EPS) result.push({ x: p.x, y: p.y });
    return result;
  }
  function simplify(points, tolerance) {
    if (points.length < 3) return points;
    const keep = new Set([0, points.length - 1]), work = [[0, points.length - 1]];
    while (work.length) {
      const [start, end] = work.pop();
      let index = -1, error = tolerance;
      for (let i = start + 1; i < end; i++) {
        const value = nearest(points[i], points[start], points[end]);
        if (value > error) { index = i; error = value; }
      }
      if (index !== -1) { keep.add(index); work.push([start, index], [index, end]); }
    }
    return [...keep].sort((a, b) => a - b).map((i) => points[i]);
  }
  function intersects(a, b, c, d) {
    const values = [cross(a, b, c), cross(a, b, d), cross(c, d, a), cross(c, d, b)];
    const on = (p, x, y, value) => Math.abs(value) <= EPS && p.x >= Math.min(x.x, y.x) - EPS && p.x <= Math.max(x.x, y.x) + EPS && p.y >= Math.min(x.y, y.y) - EPS && p.y <= Math.max(x.y, y.y) + EPS;
    const opposite = (a, b) => a > EPS && b < -EPS || a < -EPS && b > EPS;
    return opposite(values[0], values[1]) && opposite(values[2], values[3]) || on(c, a, b, values[0]) || on(d, a, b, values[1]) || on(a, c, d, values[2]) || on(b, c, d, values[3]);
  }
  function simple(points, closed) {
    const count = points.length - (closed ? 0 : 1);
    const segments = Array.from({ length: count }, (_, i) => {
      const a = points[i], b = points[(i + 1) % points.length];
      return { a, b, i, minX: Math.min(a.x, b.x), maxX: Math.max(a.x, b.x), minY: Math.min(a.y, b.y), maxY: Math.max(a.y, b.y) };
    }).sort((a, b) => a.minX - b.minX);
    let active = [];
    for (const segment of segments) {
      active = active.filter((s) => s.maxX >= segment.minX - EPS);
      for (const other of active) {
        const gap = Math.abs(segment.i - other.i);
        if (gap === 1 || closed && gap === count - 1 || other.maxY < segment.minY - EPS || segment.maxY < other.minY - EPS) continue;
        if (intersects(segment.a, segment.b, other.a, other.b)) return false;
      }
      active.push(segment);
    }
    return true;
  }
  const area = (points) => points.reduce((sum, p, i) => { const next = points[(i + 1) % points.length]; return sum + p.x * next.y - next.x * p.y; }, 0) / 2;
  function contains(points, point) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[i], b = points[j];
      if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  }
  function contours(input, width) {
    if (!Array.isArray(input) || input.length < 2 || input.length > 1001 || input.some((p) => !p || ![p.x, p.y].every(Number.isFinite)) || !Number.isFinite(width) || width < .01 || width > 5000) throw new Error('Referenčný obrys vyžaduje 2 až 1001 platných bodov a šírku 0,01 až 5000 mm.');
    let path = clean(input);
    const closed = path.length > 2 && distance(path[0], path.at(-1)) < EPS;
    if (closed) path.pop();
    if (path.length < (closed ? 3 : 2) || !simple(path, closed)) throw new Error('Strednica drážky je nulová, pretína sa alebo sa prekrýva. Použite strednicový export alebo opravte krivku.');
    const reducedPath = simplify(closed ? [...path, path[0]] : path, Math.min(.005, width / 400));
    path = closed ? reducedPath.slice(0, -1) : reducedPath;
    const radius = width / 2, tolerance = Math.min(.02, radius / 100), step = 2 * Math.acos(1 - tolerance / radius);
    const arc = (at, normal, sweep) => {
      const count = Math.max(1, Math.ceil(Math.abs(sweep) / step)), start = Math.atan2(normal.y, normal.x);
      if (count > 256) throw new Error('Referenčné zaoblenie je príliš zložité. Použite strednicový export.');
      return Array.from({ length: count + 1 }, (_, i) => ({ x: at.x + radius * Math.cos(start + sweep * i / count), y: at.y + radius * Math.sin(start + sweep * i / count) }));
    };
    const segmentCount = path.length - (closed ? 0 : 1);
    const directions = Array.from({ length: segmentCount }, (_, i) => {
      const a = path[i], b = path[(i + 1) % path.length], length = distance(a, b);
      return { x: (b.x - a.x) / length, y: (b.y - a.y) / length };
    });
    const normal = (d, side) => ({ x: -d.y * side, y: d.x * side });
    const side = (sign) => {
      const points = [];
      for (let i = 0; i < path.length; i++) {
        const at = path[i], incoming = directions[(i + segmentCount - 1) % segmentCount], outgoing = directions[i % segmentCount];
        if (!closed && (i === 0 || i === path.length - 1)) {
          const n = normal(i === 0 ? outgoing : incoming, sign);
          points.push({ x: at.x + n.x * radius, y: at.y + n.y * radius }); continue;
        }
        const turn = Math.atan2(incoming.x * outgoing.y - incoming.y * outgoing.x, incoming.x * outgoing.x + incoming.y * outgoing.y);
        const before = normal(incoming, sign), after = normal(outgoing, sign);
        if (Math.abs(turn) > Math.PI - .00001) throw new Error('Drážka sa prudko vracia na vlastnú strednicu. Opravte krivku alebo exportujte iba strednicu.');
        if (turn * sign < -EPS) points.push(...arc(at, before, turn));
        else {
          const denominator = 1 + before.x * after.x + before.y * after.y;
          points.push({ x: at.x + radius * (before.x + after.x) / denominator, y: at.y + radius * (before.y + after.y) / denominator });
        }
        if (points.length > 10000) throw new Error('Referenčný obrys má priveľa vrcholov. Zjednodušte krivku alebo použite strednicový export.');
      }
      return clean(points);
    };
    const left = side(1), right = side(-1);
    let profiles;
    if (closed) profiles = [left, right];
    else {
      const endCap = arc(path.at(-1), normal(directions.at(-1), 1), -Math.PI);
      const startCap = arc(path[0], normal(directions[0], -1), -Math.PI);
      profiles = [clean([...left, ...endCap.slice(1), ...right.reverse().slice(1), ...startCap.slice(1, -1)])];
    }
    const centerline = closed ? [...path, path[0]] : path;
    profiles = profiles.map((profile) => {
      if (Math.abs(area(profile)) < EPS || !simple(profile, true)) throw new Error('Šírka drážky vytvára pretínajúci sa alebo zrútený obrys. Zmenšite šírku alebo exportujte iba strednicu.');
      // Reject overlaps instead of pretending to compute a manufacturing union.
      for (const p of profile) {
        let minimum = Infinity;
        for (let i = 1; i < centerline.length; i++) minimum = Math.min(minimum, nearest(p, centerline[i - 1], centerline[i]));
        if (minimum < radius - Math.max(EPS, tolerance)) throw new Error('Drážka je príliš široká pre odstupy alebo zakrivenie strednice. Použite strednicový export alebo opravte rozmery.');
      }
      const reduced = simplify([...profile, profile[0]], Math.min(.01, radius / 100)).slice(0, -1);
      const rounded = clean(reduced.map((p) => ({ x: Number(p.x.toFixed(3)), y: Number(p.y.toFixed(3)) })));
      if (rounded.length > 1 && distance(rounded[0], rounded.at(-1)) < EPS) rounded.pop();
      if (rounded.length < 3 || rounded.length > MAX_VERTICES || Math.abs(area(rounded)) < EPS || !simple(rounded, true)) throw new Error('Obrys sa nedá bezpečne vyjadriť do 1001 vrcholov na 0,001 mm. Zjednodušte krivku alebo použite strednicový export.');
      return rounded;
    });
    if (closed) {
      profiles.sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
      if (!profiles[1].every((point) => contains(profiles[0], point))) throw new Error('Vnútorný obrys uzavretej drážky sa zrútil. Zmenšite šírku alebo použite strednicový export.');
    }
    return profiles;
  }
  global.KinmoSlotOutline = Object.freeze({ contours, warning });
})(globalThis);
