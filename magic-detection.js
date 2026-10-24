/* Bounded, offline sketch detection. Geometry and mounting points remain reviewable proposals. */
(function (global) {
  'use strict';
  const limits = Object.freeze({ side: 768, pixels: 768 * 768, candidates: 60, components: 4000, contour: 8192, proposals: 240, simplifyWork: 200000 });
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const area = (points) => Math.abs(points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p.x * q.y - q.x * p.y; }, 0) / 2);
  function segmentDistance(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
  }
  function simplify(points, tolerance) {
    const keep = new Set([0, points.length - 1]), work = [[0, points.length - 1]]; let comparisons = 0;
    while (work.length) {
      const [a, b] = work.pop(); let index = -1, error = tolerance;
      for (let i = a + 1; i < b; i++) {
        if (++comparisons > limits.simplifyWork) return points;
        const value = segmentDistance(points[i], points[a], points[b]);
        if (value > error) { index = i; error = value; }
      }
      if (index !== -1) { keep.add(index); work.push([a, index], [index, b]); }
    }
    return [...keep].sort((a, b) => a - b).map((i) => points[i]);
  }
  function resample(points) {
    const total = points.reduce((sum, p, i) => sum + (i ? distance(p, points[i - 1]) : 0), 0), step = Math.max(16, total / Math.max(1, 63 - points.length));
    const result = [points[0]];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], parts = Math.max(1, Math.ceil(distance(a, b) / step));
      for (let n = 1; n <= parts; n++) result.push({ x: a.x + (b.x - a.x) * n / parts, y: a.y + (b.y - a.y) * n / parts });
    }
    return result;
  }
  function simplePolygon(points) {
    if (points.length < 3 || points.length > 64 || area(points) < 1 || new Set(points.map((p) => `${p.x}:${p.y}`)).size !== points.length) return false;
    const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    for (let i = 0; i < points.length; i++) for (let j = i + 2; j < points.length; j++) {
      if (i === 0 && j === points.length - 1) continue;
      const a = points[i], b = points[(i + 1) % points.length], c = points[j], d = points[(j + 1) % points.length];
      if (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0 || [segmentDistance(a, c, d), segmentDistance(b, c, d), segmentDistance(c, a, b), segmentDistance(d, a, b)].some((v) => v < .000001)) return false;
    }
    return true;
  }
  function inside(p, polygon) {
    let value = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j];
      if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) value = !value;
    }
    return value;
  }
  // Flood regions between strong edges, including white holes. Never interpret a color as a part type.
  function enclosedRegions(width, height, edge, threshold, queue) {
    const regions = new Uint32Array(width * height), visited = new Uint8Array(width * height);
    let id = 0, limited = false;
    for (let start = 0; start < regions.length; start++) {
      if (visited[start] || edge[start] >= threshold) continue;
      if (++id > limits.components) { limited = true; break; }
      let head = 0, tail = 1, border = false;
      queue[0] = start; visited[start] = 1;
      while (head < tail) {
        const at = queue[head++], x = at % width, y = Math.floor(at / width);
        border ||= x === 0 || y === 0 || x === width - 1 || y === height - 1;
        for (const n of [x ? at - 1 : -1, x + 1 < width ? at + 1 : -1, y ? at - width : -1, y + 1 < height ? at + width : -1]) {
          if (n < 0 || visited[n] || edge[n] >= threshold) continue;
          visited[n] = 1; queue[tail++] = n;
        }
      }
      if (!border && tail >= 12) for (let n = 0; n < tail; n++) regions[queue[n]] = id;
    }
    return { regions, limited };
  }
  function contour(labels, id, start, width, height, size) {
    const directions = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
    let at = { x: start % width, y: Math.floor(start / width) }, back = { x: at.x - 1, y: at.y }, first = null;
    const points = [], maximum = Math.min(limits.contour * 4, size * 24);
    for (let step = 0; step < maximum; step++) {
      const from = directions.findIndex(([dx, dy]) => at.x + dx === back.x && at.y + dy === back.y);
      let next = null, previous = null;
      for (let k = 1; k <= 8; k++) {
        const index = (Math.max(0, from) + k) % 8, [dx, dy] = directions[index], x = at.x + dx, y = at.y + dy;
        if (x < 0 || y < 0 || x >= width || y >= height || labels[y * width + x] !== id) continue;
        next = { x, y }; const [px, py] = directions[(index + 7) % 8]; previous = { x: at.x + px, y: at.y + py }; break;
      }
      if (!next) return { points: [], closed: false };
      if (first && at.x === start % width && at.y === Math.floor(start / width) && next.x === first.x && next.y === first.y) return { points, closed: true };
      first ||= next; points.push(at);
      if (points.length >= limits.contour) break;
      at = next; back = previous;
    }
    return { points: [], closed: false, limited: true };
  }
  function detectPixels({ width, height, data }, options = {}) {
    if (![width, height].every((v) => Number.isInteger(v) && v > 0 && v <= limits.side) || width * height > limits.pixels || !(data instanceof Uint8ClampedArray) || data.length !== width * height * 4) throw new Error('Detekcia vyžaduje platný raster do 768 × 768 px.');
    const sensitivity = options.sensitivity ?? 50;
    if (!Number.isFinite(sensitivity) || sensitivity < 10 || sensitivity > 90) throw new Error('Citlivosť musí byť 10 až 90 %.');
    const count = width * height, mask = new Uint8Array(count), labels = new Uint32Array(count), queue = new Uint32Array(count), rgb = new Uint8ClampedArray(count * 3), edge = new Uint8Array(count), proposals = [];
    const border = [[], [], []];
    for (let i = 0; i < count; i++) for (let k = 0; k < 3; k++) rgb[i * 3 + k] = data[i * 4 + k] * data[i * 4 + 3] / 255 + 255 - data[i * 4 + 3];
    for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 100))) for (const x of [0, width - 1]) for (let k = 0; k < 3; k++) border[k].push(rgb[(y * width + x) * 3 + k]);
    for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 100))) for (const y of [0, height - 1]) for (let k = 0; k < 3; k++) border[k].push(rgb[(y * width + x) * 3 + k]);
    const background = border.map((values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)]), contrast = 10 + (90 - sensitivity) * .4, barrier = 12 + (90 - sensitivity) * .35;
    // Only replace small deviations from a 3x3 median. Unconditional median
    // filtering would erase genuine one-pixel lines and small mounting holes.
    const sourceRGB = rgb.slice(), samples = new Array(9);
    for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) for (let k = 0; k < 3; k++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) samples[n++] = sourceRGB[((y + dy) * width + x + dx) * 3 + k];
      samples.sort((a, b) => a - b);
      const at = (y * width + x) * 3 + k;
      if (Math.abs(samples[4] - sourceRGB[at]) <= 32) rgb[at] = samples[4];
    }
    const difference = (a, b) => Math.max(Math.abs(rgb[a * 3] - rgb[b * 3]), Math.abs(rgb[a * 3 + 1] - rgb[b * 3 + 1]), Math.abs(rgb[a * 3 + 2] - rgb[b * 3 + 2]));
    for (let i = 0; i < count; i++) {
      if (Math.hypot(rgb[i * 3] - background[0], rgb[i * 3 + 1] - background[1], rgb[i * 3 + 2] - background[2]) >= contrast && data[i * 4 + 3] >= 32) mask[i] = 1;
      const x = i % width, y = Math.floor(i / width);
      edge[i] = Math.max(x ? difference(i, i - 1) : 0, x + 1 < width ? difference(i, i + 1) : 0, y ? difference(i, i - width) : 0, y + 1 < height ? difference(i, i + width) : 0);
    }
    const enclosed = enclosedRegions(width, height, edge, barrier, queue);
    let limited = enclosed.limited, pass = 0, ambiguous = false;
    const add = (type, points, stroke, confidence, color, outline = [], evidence = {}) => {
      if (points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return;
      if (points.length > 64) { limited = true; return; }
      // Secondary edge strips and unclosed contours are not reliable extra bodies.
      if (pass && points.length === 2 && (stroke <= 2.5 || !outline.length)) return;
      points = points.map((p) => ({ x: Math.max(0, Math.min(width - 1, p.x)), y: Math.max(0, Math.min(height - 1, p.y)) }));
      if (points.length > 1 && distance(points[0], points.at(-1)) < 8) return;
      if (proposals.length >= limits.proposals) { limited = true; return; }
      if (pass) { confidence = Math.min(confidence, .64); evidence = { ...evidence, ...(pass === 2 ? { closedRegion: true } : { edgePartition: true }) }; }
      stroke = Math.min(Math.max(width, height), Math.max(1, stroke));
      proposals.push({ type, points, width: stroke, radius: Math.max(2, stroke / 2), confidence, color, selected: confidence >= .78, outline, geometry: outline.length ? 'contour' : 'centerline', evidence });
    };
    let components = 0;
    for (pass = 0; pass < 3; pass++) {
      if (components >= limits.components) { limited = true; break; }
      if (pass === 1 && !ambiguous) continue;
      if (pass) labels.fill(0);
    for (let start = 0; start < count; start++) {
      if (labels[start] || (pass === 2 ? !enclosed.regions[start] : !mask[start] || pass === 1 && mask[start] !== 2)) continue;
      if (++components > limits.components) { limited = true; break; }
      let head = 0, tail = 1, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, uncertain = 0, foreground = 0, minX = width, minY = height, maxX = 0, maxY = 0;
      queue[0] = start; labels[start] = components;
      while (head < tail) {
        const i = queue[head++], x = i % width, y = Math.floor(i / width);
        sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
        uncertain += mask[i] === 2 ? 1 : 0; foreground += mask[i] ? 1 : 0;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy, n = ny * width + nx;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height || labels[n]) continue;
          if (pass === 2 ? enclosed.regions[n] !== enclosed.regions[start] : !mask[n] || pass === 1 && (mask[n] !== 2 || difference(i, n) > barrier)) continue;
          labels[n] = components; queue[tail++] = n;
        }
      }
      const bw = maxX - minX + 1, bh = maxY - minY + 1, fill = tail / (bw * bh);
      if (tail < (pass === 2 ? 12 : 20) || Math.max(bw, bh) < (pass === 2 ? 5 : 12) || tail > count * .7) continue;
      const cx = sx / tail, cy = sy / tail, xx = sxx / tail - cx * cx, yy = syy / tail - cy * cy, xy = sxy / tail - cx * cy;
      const theta = .5 * Math.atan2(2 * xy, xx - yy), ux = Math.cos(theta), uy = Math.sin(theta);
      const colorIndex = queue[Math.floor(tail / 2)] * 3, color = `#${[0, 1, 2].map((k) => rgb[colorIndex + k].toString(16).padStart(2, '0')).join('')}`;
      const boundary = contour(labels, components, start, width, height, tail);
      limited ||= !!boundary.limited;
      const support = boundary.points.length ? boundary.points.filter((p) => edge[p.y * width + p.x] >= barrier / 2).length / boundary.points.length : 0;
      let outline = [];
      if (boundary.closed) for (let tolerance = .55; tolerance <= 8; tolerance *= 1.6) {
        const reduced = simplify([...boundary.points, boundary.points[0]], tolerance).slice(0, -1);
        if (simplePolygon(reduced)) { outline = reduced; break; }
      }
      let low = Infinity, high = -Infinity, vl = Infinity, vh = -Infinity;
      for (let n = 0; n < tail; n++) {
        const x = queue[n] % width - cx, y = Math.floor(queue[n] / width) - cy, u = x * ux + y * uy, v = -x * uy + y * ux;
        low = Math.min(low, u); high = Math.max(high, u); vl = Math.min(vl, v); vh = Math.max(vh, v);
      }
      const length = high - low, breadth = vh - vl + 1, aspect = length / breadth;
      const firstProposal = proposals.length;
      const points = [{ x: cx + low * ux, y: cy + low * uy }, { x: cx + high * ux, y: cy + high * uy }];
      const radii = boundary.points.map((p) => distance(p, { x: cx, y: cy })), meanRadius = radii.reduce((sum, v) => sum + v, 0) / (radii.length || 1);
      const roundness = meanRadius ? Math.sqrt(radii.reduce((sum, v) => sum + (v - meanRadius) ** 2, 0) / (radii.length || 1)) / meanRadius : 1;
      const orthogonal = outline.reduce((sum, a, i) => { const b = outline[(i + 1) % outline.length], l = distance(a, b); return sum + (Math.min(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) <= 1 ? l : 0); }, 0) / (outline.reduce((sum, a, i) => sum + distance(a, outline[(i + 1) % outline.length]), 0) || 1);
      const smallHole = pass === 2 && Math.max(bw, bh) <= 10 && foreground / tail < .25;
      // Nearly square bounds alone also fit blocks and tiny triangular windows.
      // Require radial consistency and a sufficiently detailed, disk-like contour.
      const circular = Math.max(bw, bh) <= 64 && Math.min(bw, bh) >= (pass === 2 ? 5 : 8) && Math.max(bw, bh) / Math.min(bw, bh) < (smallHole ? 1.5 : 1.3) && roundness < (Math.max(bw, bh) > 16 ? .1 : .16) && outline.length >= 6 && area(outline) / (bw * bh) >= .55 && area(outline) / (bw * bh) <= .86;
      // Thin white interiors are useful in outline-only diagrams. Large white windows are background.
      if (pass === 2 && !circular) {
        if (foreground / tail >= .75 && uncertain / tail < .5) continue;
        if (foreground / tail < .75 && (aspect < 2.8 || aspect > 50 || length < 25 || breadth < 3)) continue;
        if (outline.length && proposals.some((c) => c.selected && c.outline.length && outline.every((p) => inside(p, c.outline)) && (c.type !== 'ground' || outline.every((p) => c.outline.some((a, i) => segmentDistance(p, a, c.outline[(i + 1) % c.outline.length]) <= 6))))) continue;
      }
      if (circular) {
        add('bearing', [{ x: cx, y: cy }], meanRadius * 2, support > .7 ? .84 : .64, color, [], { edgeSupport: support, continuity: 1, circularFeature: true });
      } else if (fill < .25 && bw >= 40 && bh >= 40 && outline.length >= 8 && orthogonal > .75 && aspect < 4.5) {
        add('ground', points, Math.max(2, tail / Math.max(bw, bh)), .8 + support * .06, color, outline, { edgeSupport: support, continuity: 1 });
      } else if ((aspect >= 2.8 || aspect >= 1.6 && fill < .35 && outline.length >= 6) && length >= 20) {
        const bins = Array.from({ length: Math.min(48, Math.max(6, Math.floor(length / 4))) }, () => []);
        for (let n = 0; n < tail; n++) {
          const x = queue[n] % width - cx, y = Math.floor(queue[n] / width) - cy, u = x * ux + y * uy, v = -x * uy + y * ux;
          const bin = bins[Math.min(bins.length - 1, Math.floor((u - low) / Math.max(1, length) * bins.length))];
          bin.push(v);
        }
        const widths = []; let separated = 0;
        const centreline = bins.flatMap((bin, index) => {
          if (!bin.length) return [];
          bin.sort((a, b) => a - b);
          if (bin.some((v, i) => i && v - bin[i - 1] > Math.max(3, tail / length * 2))) separated++;
          const min = bin[Math.floor((bin.length - 1) * .02)], max = bin[Math.ceil((bin.length - 1) * .98)];
          widths.push(max - min + 1);
          const u = low + (index + .5) * length / bins.length, v = (min + max) / 2;
          return [{ x: cx + u * ux - v * uy, y: cy + u * uy + v * ux }];
        });
        const interiorWidths = widths.slice(Math.floor(widths.length * .15), Math.ceil(widths.length * .85));
        const stroke = widths.sort((a, b) => a - b)[Math.floor(widths.length / 2)] || 2, continuity = centreline.length / bins.length;
        const meanWidth = widths.reduce((sum, v) => sum + v, 0) / widths.length, variation = Math.sqrt(widths.reduce((sum, v) => sum + (v - meanWidth) ** 2, 0) / widths.length) / meanWidth;
        const branched = separated / bins.length > .2 && variation > .45 || widths.some((v) => v > stroke * 3.5) || centreline.some((p, i) => i && distance(p, centreline[i - 1]) > Math.max(20, stroke * 3));
        const deviation = Math.max(...centreline.map((p) => segmentDistance(p, centreline[0], centreline.at(-1)))), path = simplify(centreline, .65);
        const curved = deviation > Math.max(2, stroke * .55) && path.length >= 4;
        const evidence = { edgeSupport: support, continuity, branched, widthRatio: stroke / Math.max(1, length), widthVariation: variation };
        // A bent silhouette is not necessarily a guide: broad plates keep their editable outline.
        // Ignore the end caps: a real semicircle widens there in PCA coordinates.
        // A local upright in the middle of a base is not a curved guide, however.
        const uniformInterior = interiorWidths.every((v) => v <= stroke * 1.5);
        const cavity = pass === 2 && foreground / tail < .25 && aspect >= 3 && !branched && uniformInterior;
        if (cavity || curved && !branched && continuity >= .85 && uniformInterior && stroke / Math.max(1, length) <= .1) add('slot', resample(path), stroke, .76 + support * .08, color, [], { ...evidence, ...(cavity ? { cavity: true } : {}) });
        else {
          // Empty corners of a bent plate's PCA box do not establish a hollow
          // guide. Compare raster occupancy with its actual silhouette instead.
          const type = curved && !uniformInterior || pass === 2 && branched ? 'panel' : outline.length && tail / Math.max(1, area(outline)) < .5 ? 'rail' : aspect < 6 ? 'panel' : 'link';
          add(type, points, stroke, branched || continuity < .85 || curved && !uniformInterior ? .58 : .78 + support * .08, color, outline, evidence);
        }
      } else if (outline.length && Math.max(bw, bh) >= 24) add('panel', points, Math.max(2, breadth), .6, color, outline, { edgeSupport: support, continuity: 1, branched: true });
      if (!pass && proposals.slice(firstProposal).some((c) => !c.selected)) {
        ambiguous = true;
        proposals.slice(firstProposal).forEach((c) => { c.evidence.foregroundComposite = true; });
        for (let n = 0; n < tail; n++) mask[queue[n]] = 2;
      }
    }
    }
    // Prefer the outer silhouette to JPEG edge bands and enclosed fill fragments.
    // Require geometric containment AND compatible appearance; overlapping parts
    // of different appearance must remain separate, reviewable hypotheses.
    const bounds = (c) => ({ x: Math.min(...c.outline.map((p) => p.x)), y: Math.min(...c.outline.map((p) => p.y)), r: Math.max(...c.outline.map((p) => p.x)), b: Math.max(...c.outline.map((p) => p.y)) });
    const shapes = proposals.filter((c) => c.outline.length).map((c) => ({ c, bounds: bounds(c), area: area(c.outline) }));
    const nearShape = (p, polygon, tolerance = 2) => inside(p, polygon) || polygon.some((a, i) => segmentDistance(p, a, polygon[(i + 1) % polygon.length]) <= tolerance);
    const contained = (points, polygon) => points.every((p, i) => {
      const q = points[(i + 1) % points.length];
      return [0, .25, .5, .75].every((t) => nearShape({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t }, polygon));
    });
    const compatible = (a, b) => {
      const rgbOf = (c) => [1, 3, 5].map((at) => parseInt(c.color.slice(at, at + 2), 16)), x = rgbOf(a), y = rgbOf(b);
      if (Math.max(...x.map((v, i) => Math.abs(v - y[i]))) < 70) return true;
      const chroma = (values) => { const lo = Math.min(...values), delta = Math.max(...values) - lo; return delta < 25 ? null : values.map((v) => (v - lo) / delta); };
      const cx = chroma(x), cy = chroma(y);
      return cx && cy && Math.max(...cx.map((v, i) => Math.abs(v - cy[i]))) < .4;
    };
    const redundant = new Set();
    for (const shape of shapes) {
      const c = shape.c;
      if (c.evidence.foregroundComposite) {
        const children = shapes.filter((other) => other !== shape && !other.c.evidence.foregroundComposite && other.area < shape.area * .85 && contained(other.c.outline, c.outline));
        if (children.length >= 3 && (shape.bounds.r - shape.bounds.x) * (shape.bounds.b - shape.bounds.y) > count * .55) { redundant.add(c); continue; }
      }
      if (!c.evidence.closedRegion && !c.evidence.edgePartition) continue;
      for (const outer of shapes) {
        if (outer === shape || outer.c.evidence.foregroundComposite || outer.area <= shape.area * 1.05) continue;
        const hollowFrame = outer.c.type === 'ground' && c.evidence.closedRegion && distance(c.points[0], c.points.at(-1)) / c.width > 15 && /^#(?:f[0-9a-f]){3}$/i.test(c.color);
        if (!hollowFrame && !compatible(c, outer.c)) continue;
        const a = shape.bounds, b = outer.bounds;
        if (a.x < b.x - 2 || a.y < b.y - 2 || a.r > b.r + 2 || a.b > b.b + 2) continue;
        if (contained(c.outline, outer.c.outline)) {
          outer.c.evidence = { ...c.evidence, ...outer.c.evidence, branched: !!(c.evidence.branched || outer.c.evidence.branched) };
          redundant.add(c); break;
        }
      }
    }
    // White interiors of long hollow frame sections are not extra guide paths.
    for (const c of proposals) {
      if (c.type !== 'slot' || !c.evidence.cavity || distance(c.points[0], c.points.at(-1)) / c.width <= 15) continue;
      if (shapes.some((outer) => !redundant.has(outer.c) && outer.c.type === 'ground' && c.points.every((p) => nearShape(p, outer.c.outline)))) redundant.add(c);
    }
    for (let i = proposals.length - 1; i >= 0; i--) if (redundant.has(proposals[i])) proposals.splice(i, 1);
    proposals.sort((a, b) => b.confidence - a.confidence);
    const unique = [];
    for (const candidate of proposals) {
      const duplicate = unique.find((other) => {
        if (candidate.points.length !== 2 || other.points.length !== 2) return candidate.points.length === 1 && other.points.length === 1 && distance(candidate.points[0], other.points[0]) < Math.min(candidate.radius, other.radius);
        if (candidate.outline.length && other.outline.length) {
          const bounds = (points) => ({ x: Math.min(...points.map((p) => p.x)), y: Math.min(...points.map((p) => p.y)), r: Math.max(...points.map((p) => p.x)), b: Math.max(...points.map((p) => p.y)) });
          const a = bounds(candidate.outline), b = bounds(other.outline), intersection = Math.max(0, Math.min(a.r, b.r) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.y, b.y));
          const union = (a.r - a.x) * (a.b - a.y) + (b.r - b.x) * (b.b - b.y) - intersection;
          return intersection / Math.max(1, union) > .85 && Math.min(area(candidate.outline), area(other.outline)) / Math.max(1, area(candidate.outline), area(other.outline)) > .75;
        }
        const a = candidate.points, b = other.points, tolerance = Math.max(6, Math.min(10, Math.min(candidate.width, other.width) * .6));
        return Math.min(distance(a[0], b[0]) + distance(a[1], b[1]), distance(a[0], b[1]) + distance(a[1], b[0])) < tolerance * 2;
      });
      if (!duplicate) unique.push(candidate);
      else {
        duplicate.evidence = { ...duplicate.evidence, ...candidate.evidence, branched: !!(duplicate.evidence.branched || candidate.evidence.branched) };
        if (candidate.outline.length && area(candidate.outline) > area(duplicate.outline)) { duplicate.outline = candidate.outline; duplicate.geometry = 'contour'; }
      }
      if (unique.length > limits.candidates) { limited = true; break; }
    }
    const candidates = unique.slice(0, limits.candidates).map((c, i) => ({ ...c, id: `detect-${i + 1}` }));
    for (const body of candidates) {
      if (!['ground', 'link', 'panel'].includes(body.type) || !body.outline.length) continue;
      body.anchors = candidates.filter((pin) => pin.type === 'bearing' && (inside(pin.points[0], body.outline) || body.outline.some((p, i) => segmentDistance(pin.points[0], p, body.outline[(i + 1) % body.outline.length]) <= Math.min(3, pin.radius / 2)))).map((pin) => ({ ...pin.points[0], radius: pin.radius }));
      // A frame can surround moving parts without owning their pins. Fixing these points needs explicit review.
      if (body.type === 'ground' && body.anchors.length) body.useAnchors = false;
    }
    return { method: 'contours', candidates, limited, note: 'Obrysový návrh: hrany, uzavreté oblasti a kruhové montážne body, nie význam farieb. Nejasné tvary nie sú predvybrané. Krúžok môže byť otvor, čap alebo značka; overte jeho priradenie k telesu a otočné spoje. Detekcia neurčuje pohon, funkciu mechanizmu ani správnosť väzieb.' };
  }
  async function detectImage(image, { signal, sensitivity = 50, region } = {}) {
    if (!image?.url?.startsWith('blob:') || !Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width < 1 || image.height < 1 || image.width > 8192 || image.height > 8192 || image.width * image.height > 16000000) throw new Error('Detekcia používa iba lokálne nahraný obrázok.');
    const crop = region ?? { x: 0, y: 0, width: image.width, height: image.height };
    if (![crop.x, crop.y, crop.width, crop.height].every(Number.isInteger) || crop.x < 0 || crop.y < 0 || crop.width < (region ? 5 : 1) || crop.height < (region ? 5 : 1) || crop.x + crop.width > image.width || crop.y + crop.height > image.height) throw new Error('Vyberte oblasť vo vnútri obrázka s rozmermi aspoň 5 × 5 px.');
    const check = () => { if (signal?.aborted) throw new Error('Detekcia bola zrušená.'); };
    check();
    const decoded = new global.Image(), canvas = global.document.createElement('canvas');
    try {
      await new Promise((resolve, reject) => {
        const finish = (error) => {
          global.clearTimeout(timer); signal?.removeEventListener('abort', abort); decoded.onload = decoded.onerror = null;
          if (error) reject(error); else resolve();
        };
        const abort = () => finish(new Error('Detekcia bola zrušená.'));
        const timer = global.setTimeout(() => finish(new Error('Detekcia obrázka prekročila 15 sekúnd.')), 15000);
        signal?.addEventListener('abort', abort, { once: true });
        decoded.onload = () => finish(); decoded.onerror = () => finish(new Error('Podklad sa nepodarilo dekódovať.'));
        decoded.src = image.url;
      });
      check();
      const factor = Math.min(1, limits.side / Math.max(crop.width, crop.height));
      canvas.width = Math.max(1, Math.round(crop.width * factor)); canvas.height = Math.max(1, Math.round(crop.height * factor));
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Prehliadač neposkytuje čítanie obrázka.');
      context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(decoded, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
      await new Promise((resolve) => global.setTimeout(resolve, 0)); check();
      const result = detectPixels(context.getImageData(0, 0, canvas.width, canvas.height), { sensitivity });
      result.candidates.forEach((candidate) => {
        const original = (p) => ({ x: crop.x + p.x * crop.width / canvas.width, y: crop.y + p.y * crop.height / canvas.height });
        candidate.points = candidate.points.map(original);
        candidate.outline = candidate.outline.map(original);
        candidate.anchors = candidate.anchors?.map((p) => ({ ...original(p), radius: p.radius / factor }));
        candidate.width /= factor; candidate.radius /= factor;
      });
      check(); return result;
    } finally { decoded.src = ''; canvas.width = canvas.height = 0; }
  }
  // Interpret geometry before proposing mechanics. A hole belongs to a body;
  // it does not become an independent bearing merely because it is circular.
  function mechanismCandidates(input, decisions = {}) {
    const candidates = JSON.parse(JSON.stringify(input)), bodies = candidates.filter(c=>c.selected&&c.points.length>1&&['ground','panel','link','rail'].includes(c.type));
    const holes = candidates.filter(c=>c.selected&&c.points.length===1&&['bearing','node'].includes(c.type));
    const ownership = [];
    for (const body of bodies) body.anchors = (body.anchors||[]).filter(a=>!holes.some(h=>distance(a,h.points[0])<=Math.max(2,h.radius*.6)));
    for (const hole of holes) {
      const at = hole.points[0], owners = bodies.flatMap(body=>{
        const polygon = body.outline||[], interior = polygon.length>=3 && inside(at,polygon);
        const edge = polygon.length>=3 ? Math.min(...polygon.map((a,i)=>segmentDistance(at,a,polygon[(i+1)%polygon.length]))) : Math.min(...body.points.slice(1).map((b,i)=>segmentDistance(at,body.points[i],b)));
        const near = interior || edge <= (polygon.length?Math.max(2,hole.radius+2):Math.max(body.width/2,hole.radius+2));
        return near ? [{id:body.id,confidence:interior?.9:.6,reason:interior?'Otvor leží v uzavretom obryse telesa.':'Kruh leží pri obryse alebo osi člena; vlastníctvo treba overiť.'}] : [];
      });
      const automatic = owners.length===1&&owners[0].confidence>=.85 ? owners[0].id : null;
      const choice = Object.hasOwn(decisions,hole.id) ? decisions[hole.id] : automatic;
      if (choice && !['pin','shared','ignore',...owners.map(o=>o.id)].includes(choice) || choice==='shared'&&owners.length<2) throw new Error('Vyberte platného vlastníka otvoru.');
      ownership.push({id:hole.id,at,radius:hole.radius,owners,choice,automatic:choice===automatic&&!!automatic});
      hole.selected = choice==='pin';
      if (!choice || choice==='ignore') continue;
      const assigned = choice==='shared'||choice==='pin' ? owners : owners.filter(o=>o.id===choice);
      for (const owner of assigned) {
        const body=bodies.find(c=>c.id===owner.id);
        if (!['ground','link','panel'].includes(body.type)) continue;
        body.useAnchors=true;body.anchors||=[];body.anchors.push({...at,radius:hole.radius});
      }
    }
    return {candidates,ownership,unresolved:ownership.filter(h=>!h.choice),stages:['Telesá','Vlastníctvo otvorov','Návrh väzieb','Skúška pohybu']};
  }
  global.KinmoDetection = Object.freeze({ limits, detectPixels, detectImage, mechanismCandidates });
})(globalThis);
