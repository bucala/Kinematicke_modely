/* Bounded, offline sketch detection. Proposals are editable geometry, not inferred mechanics. */
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
    const difference = (a, b) => Math.max(Math.abs(rgb[a * 3] - rgb[b * 3]), Math.abs(rgb[a * 3 + 1] - rgb[b * 3 + 1]), Math.abs(rgb[a * 3 + 2] - rgb[b * 3 + 2]));
    for (let i = 0; i < count; i++) {
      if (Math.hypot(rgb[i * 3] - background[0], rgb[i * 3 + 1] - background[1], rgb[i * 3 + 2] - background[2]) >= contrast && data[i * 4 + 3] >= 32) mask[i] = 1;
      const x = i % width, y = Math.floor(i / width);
      edge[i] = Math.max(x ? difference(i, i - 1) : 0, x + 1 < width ? difference(i, i + 1) : 0, y ? difference(i, i - width) : 0, y + 1 < height ? difference(i, i + width) : 0);
    }
    let limited = false, pass = 0, ambiguous = false;
    const add = (type, points, stroke, confidence, color, outline = [], evidence = {}) => {
      if (points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return;
      if (points.length > 1 && distance(points[0], points.at(-1)) < 8) return;
      if (proposals.length >= limits.proposals) { limited = true; return; }
      if (pass) { confidence = Math.min(confidence, .64); evidence = { ...evidence, edgePartition: true }; }
      proposals.push({ type, points, width: Math.max(1, stroke), radius: Math.max(2, stroke / 2), confidence, color, selected: confidence >= .78, outline, geometry: outline.length ? 'contour' : 'centerline', evidence });
    };
    let components = 0;
    for (pass = 0; pass < 2; pass++) {
      if (pass) { if (!ambiguous || components >= limits.components) break; labels.fill(0); }
    for (let start = 0; start < count; start++) {
      if (!mask[start] || labels[start] || pass && mask[start] !== 2) continue;
      if (++components > limits.components) { limited = true; break; }
      let head = 0, tail = 1, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, minX = width, minY = height, maxX = 0, maxY = 0;
      queue[0] = start; labels[start] = components;
      while (head < tail) {
        const i = queue[head++], x = i % width, y = Math.floor(i / width);
        sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy, n = ny * width + nx;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height || labels[n] || !mask[n] || pass && (mask[n] !== 2 || difference(i, n) > barrier)) continue;
          labels[n] = components; queue[tail++] = n;
        }
      }
      const bw = maxX - minX + 1, bh = maxY - minY + 1, fill = tail / (bw * bh);
      if (tail < 20 || Math.max(bw, bh) < 12 || tail > count * .7) continue;
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
      if (Math.max(bw, bh) <= 64 && Math.min(bw, bh) >= 8 && Math.max(bw, bh) / Math.min(bw, bh) < 1.3 && roundness < .16) {
        add('bearing', [{ x: cx, y: cy }], meanRadius * 2, support > .7 ? .84 : .64, color, [], { edgeSupport: support, continuity: 1 });
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
        const stroke = widths.sort((a, b) => a - b)[Math.floor(widths.length / 2)] || 2, continuity = centreline.length / bins.length;
        const meanWidth = widths.reduce((sum, v) => sum + v, 0) / widths.length, variation = Math.sqrt(widths.reduce((sum, v) => sum + (v - meanWidth) ** 2, 0) / widths.length) / meanWidth;
        const branched = separated / bins.length > .2 && variation > .45 || widths.some((v) => v > stroke * 3.5) || centreline.some((p, i) => i && distance(p, centreline[i - 1]) > Math.max(20, stroke * 3));
        const deviation = Math.max(...centreline.map((p) => segmentDistance(p, centreline[0], centreline.at(-1)))), path = simplify(centreline, .65);
        const curved = deviation > Math.max(2, stroke * .55) && path.length >= 4;
        const evidence = { edgeSupport: support, continuity, branched };
        if (curved && !branched && continuity >= .85) add('slot', resample(path), stroke, .76 + support * .08, color, [], evidence);
        else {
          const type = tail / (Math.max(1, length) * breadth) < .35 ? 'rail' : aspect < 6 ? 'panel' : 'link';
          add(type, points, stroke, branched || continuity < .85 ? .58 : .78 + support * .08, color, outline, evidence);
        }
      } else if (outline.length && Math.max(bw, bh) >= 24) add('panel', points, Math.max(2, breadth), .6, color, outline, { edgeSupport: support, continuity: 1, branched: true });
      if (!pass && proposals.slice(firstProposal).some((c) => !c.selected)) {
        ambiguous = true;
        for (let n = 0; n < tail; n++) mask[queue[n]] = 2;
      }
    }
    }
    proposals.sort((a, b) => b.confidence - a.confidence);
    const unique = [];
    for (const candidate of proposals) {
      const duplicate = unique.find((other) => {
        if (candidate.points.length !== 2 || other.points.length !== 2) return candidate.points.length === 1 && other.points.length === 1 && distance(candidate.points[0], other.points[0]) < Math.min(candidate.radius, other.radius);
        const a = candidate.points, b = other.points, tolerance = Math.max(6, Math.min(candidate.width, other.width) * .6);
        return Math.min(distance(a[0], b[0]) + distance(a[1], b[1]), distance(a[0], b[1]) + distance(a[1], b[0])) < tolerance * 2;
      });
      if (!duplicate) unique.push(candidate);
      else if (candidate.outline.length && area(candidate.outline) > area(duplicate.outline)) { duplicate.outline = candidate.outline; duplicate.geometry = 'contour'; }
      if (unique.length > limits.candidates) { limited = true; break; }
    }
    return { method: 'contours', candidates: unique.slice(0, limits.candidates).map((c, i) => ({ ...c, id: `detect-${i + 1}` })), limited, note: 'Obrysový geometrický návrh: hrany, tvar a spojitosť strednice, nie význam farieb. Rozvetvené a nejasné tvary nie sú predvybrané. Skontrolujte typy, konce a pevné časti. Detekcia neurčuje pohon, funkciu mechanizmu ani správnosť väzieb.' };
  }
  async function detectImage(image, { signal, sensitivity = 50 } = {}) {
    if (!image?.url?.startsWith('blob:') || !Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width < 1 || image.height < 1 || image.width > 8192 || image.height > 8192 || image.width * image.height > 16000000) throw new Error('Detekcia používa iba lokálne nahraný obrázok.');
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
      const factor = Math.min(1, limits.side / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * factor)); canvas.height = Math.max(1, Math.round(image.height * factor));
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Prehliadač neposkytuje čítanie obrázka.');
      context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(decoded, 0, 0, canvas.width, canvas.height);
      await new Promise((resolve) => global.setTimeout(resolve, 0)); check();
      const result = detectPixels(context.getImageData(0, 0, canvas.width, canvas.height), { sensitivity });
      result.candidates.forEach((candidate) => {
        candidate.points = candidate.points.map((p) => ({ x: p.x * image.width / canvas.width, y: p.y * image.height / canvas.height }));
        candidate.outline = candidate.outline.map((p) => ({ x: p.x * image.width / canvas.width, y: p.y * image.height / canvas.height }));
        candidate.width /= factor; candidate.radius /= factor;
      });
      check(); return result;
    } finally { decoded.src = ''; canvas.width = canvas.height = 0; }
  }
  global.KinmoDetection = Object.freeze({ limits, detectPixels, detectImage });
})(globalThis);
