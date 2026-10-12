/* Bounded, offline sketch detection. Proposals are editable geometry, not inferred mechanics. */
(function (global) {
  'use strict';
  const limits = Object.freeze({ side: 768, pixels: 768 * 768, candidates: 60, components: 4000 });
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function detectPixels({ width, height, data }, options = {}) {
    if (![width, height].every((v) => Number.isInteger(v) && v > 0 && v <= limits.side) || width * height > limits.pixels || !(data instanceof Uint8ClampedArray) || data.length !== width * height * 4) throw new Error('Detekcia vyžaduje platný raster do 768 × 768 px.');
    const sensitivity = options.sensitivity ?? 50;
    if (!Number.isFinite(sensitivity) || sensitivity < 10 || sensitivity > 90) throw new Error('Citlivosť musí byť 10 až 90 %.');
    const count = width * height, mask = new Uint8Array(count), seen = new Uint8Array(count), queue = new Uint32Array(count), proposals = [];
    const border = [[], [], []];
    const rgb = (i) => {
      const alpha = data[i * 4 + 3] / 255;
      return [0, 1, 2].map((k) => data[i * 4 + k] * alpha + 255 * (1 - alpha));
    };
    for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 100))) for (const x of [0, width - 1]) rgb(y * width + x).forEach((v, k) => border[k].push(v));
    for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 100))) for (const y of [0, height - 1]) rgb(y * width + x).forEach((v, k) => border[k].push(v));
    const background = border.map((values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)]), contrast = 100 - sensitivity;
    for (let i = 0; i < count; i++) {
      const [r, g, b] = rgb(i), max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
      if (Math.hypot(r - background[0], g - background[1], b - background[2]) < contrast || data[i * 4 + 3] < 32) continue;
      if (delta > 35 && delta / Math.max(1, max) > .2) {
        let hue = max === r ? (g - b) / delta : max === g ? 2 + (b - r) / delta : 4 + (r - g) / delta;
        hue = (hue * 60 + 360) % 360;
        mask[i] = 2 + Math.floor((hue + 15) % 360 / 30);
      } else if (Math.abs((r + g + b) / 3 - (background[0] + background[1] + background[2]) / 3) > contrast) mask[i] = 1;
    }
    const add = (type, points, stroke, confidence, color) => {
      if (points.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return;
      if (points.length > 1 && distance(points[0], points.at(-1)) < 8) return;
      proposals.push({ id: `detect-${proposals.length + 1}`, type, points, width: Math.max(1, stroke), radius: Math.max(2, stroke / 2), confidence, color, selected: confidence >= .65 });
    };
    const straightRuns = (pixels, minX, minY, maxX, maxY, color) => {
      const cells = new Set(pixels), minimum = Math.max(20, Math.min(width, height) * .07);
      for (const horizontal of [true, false]) {
        const rows = horizontal ? [minY, maxY] : [minX, maxX], columns = horizontal ? [minX, maxX] : [minY, maxY], bands = [];
        for (let row = rows[0]; row <= rows[1]; row++) {
          let start = null;
          for (let col = columns[0]; col <= columns[1] + 1; col++) {
            const exists = col <= columns[1] && cells.has(horizontal ? row * width + col : col * width + row);
            if (exists && start == null) start = col;
            if (!exists && start != null) {
              if (col - start >= minimum) {
                const band = bands.find((v) => v.last === row - 1 && Math.min(v.end, col) - Math.max(v.start, start) > .8 * Math.min(v.end - v.start, col - start));
                if (band) { band.last = row; band.start = Math.min(band.start, start); band.end = Math.max(band.end, col - 1); }
                else bands.push({ first: row, last: row, start, end: col - 1 });
              }
              start = null;
            }
          }
        }
        for (const band of bands) {
          const centre = (band.first + band.last) / 2, thickness = band.last - band.first + 1;
          if (band.end - band.start < 3 * thickness) continue;
          const points = horizontal ? [{ x: band.start, y: centre }, { x: band.end, y: centre }] : [{ x: centre, y: band.start }, { x: centre, y: band.end }];
          add('ground', points, thickness, .72, color);
        }
      }
    };
    let components = 0;
    for (let start = 0; start < count; start++) {
      if (!mask[start] || seen[start]) continue;
      if (++components > limits.components) break;
      const kind = mask[start]; let head = 0, tail = 1, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, minX = width, minY = height, maxX = 0, maxY = 0;
      queue[0] = start; seen[start] = 1;
      while (head < tail) {
        const i = queue[head++], x = i % width, y = Math.floor(i / width);
        sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy, n = ny * width + nx;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height || seen[n] || mask[n] !== kind) continue;
          seen[n] = 1; queue[tail++] = n;
        }
      }
      const bw = maxX - minX + 1, bh = maxY - minY + 1, fill = tail / (bw * bh);
      if (tail < 16 || Math.max(bw, bh) < 10 || tail > count * .7) continue;
      const cx = sx / tail, cy = sy / tail, xx = sxx / tail - cx * cx, yy = syy / tail - cy * cy, xy = sxy / tail - cx * cy;
      const theta = .5 * Math.atan2(2 * xy, xx - yy), ux = Math.cos(theta), uy = Math.sin(theta);
      const colorRGB = rgb(queue[Math.floor(tail / 2)]), color = `#${colorRGB.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
      let low = Infinity, high = -Infinity, vl = Infinity, vh = -Infinity;
      for (let n = 0; n < tail; n++) {
        const x = queue[n] % width - cx, y = Math.floor(queue[n] / width) - cy, u = x * ux + y * uy, v = -x * uy + y * ux;
        low = Math.min(low, u); high = Math.max(high, u); vl = Math.min(vl, v); vh = Math.max(vh, v);
      }
      const length = high - low, breadth = vh - vl + 1, aspect = length / breadth;
      if (aspect >= 2.8 && length >= 20) {
        const bins = Array.from({ length: Math.min(32, Math.max(4, Math.floor(length / 8))) }, () => ({ low: Infinity, high: -Infinity, total: 0 }));
        for (let n = 0; n < tail; n++) {
          const x = queue[n] % width - cx, y = Math.floor(queue[n] / width) - cy, u = x * ux + y * uy, v = -x * uy + y * ux;
          const bin = bins[Math.min(bins.length - 1, Math.floor((u - low) / Math.max(1, length) * bins.length))];
          bin.low = Math.min(bin.low, v); bin.high = Math.max(bin.high, v); bin.total++;
        }
        const centreline = bins.flatMap((bin, index) => {
          if (!bin.total) return [];
          const u = low + (index + .5) * length / bins.length, v = (bin.low + bin.high) / 2;
          return [{ x: cx + u * ux - v * uy, y: cy + u * uy + v * ux }];
        });
        const stroke = Math.max(2, tail / length), curved = breadth > 2.5 * stroke && centreline.length >= 4;
        if (curved) add('slot', centreline, stroke, .66, color);
        else add(tail / (Math.max(1, length) * breadth) < .45 ? 'rail' : aspect < 5 ? 'panel' : 'link', [{ x: cx + low * ux, y: cy + low * uy }, { x: cx + high * ux, y: cy + high * uy }], Math.min(breadth, Math.max(2, stroke)), .83, color);
      } else if (bw >= 40 && bh >= 40 && fill < .35) straightRuns(queue.subarray(0, tail), minX, minY, maxX, maxY, color);
      else if (Math.max(bw, bh) <= 64 && Math.min(bw, bh) >= 8 && Math.max(bw, bh) / Math.min(bw, bh) < 1.4 && fill > .25) add('bearing', [{ x: cx, y: cy }], Math.min(bw, bh), fill < .8 ? .68 : .58, color);
    }
    proposals.sort((a, b) => b.confidence - a.confidence);
    const unique = [];
    for (const candidate of proposals) {
      const duplicate = unique.some((other) => {
        if (candidate.points.length !== 2 || other.points.length !== 2) return candidate.points.length === 1 && other.points.length === 1 && distance(candidate.points[0], other.points[0]) < Math.min(candidate.radius, other.radius);
        const a = candidate.points, b = other.points, tolerance = Math.max(5, Math.min(candidate.width, other.width) * 1.5);
        return Math.min(distance(a[0], b[0]) + distance(a[1], b[1]), distance(a[0], b[1]) + distance(a[1], b[0])) < tolerance * 2;
      });
      if (!duplicate) unique.push(candidate);
      if (unique.length === limits.candidates) break;
    }
    return { candidates: unique, limited: components > limits.components || proposals.length > limits.candidates, note: 'Lokálny geometrický návrh. Skontrolujte typy, konce a pevné časti. Detekcia neurčuje pohon, funkciu mechanizmu ani správnosť väzieb.' };
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
        candidate.width /= factor; candidate.radius /= factor;
      });
      check(); return result;
    } finally { decoded.src = ''; canvas.width = canvas.height = 0; }
  }
  global.KinmoDetection = Object.freeze({ limits, detectPixels, detectImage });
})(globalThis);
