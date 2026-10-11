/* Bounded GIF89a encoder, adaptive palette and timing. No library or upload. */
(function (global) {
  'use strict';
  const limits = Object.freeze({ width: 1200, height: 1200, frames: 180, duration: 12, fps: 20, pixels: 60000000, bytes: 32 * 1024 * 1024, palettePixels: 4320000, timeout: 90000 });

  function plan(range, view, options = {}) {
    const width = options.width ?? 800, duration = options.duration ?? 6, fps = options.fps ?? 10, direction = options.direction ?? 'roundtrip', loop = options.loop !== false;
    if (!range || !Number.isFinite(range.min) || !Number.isFinite(range.max) || !Number.isFinite(range.max - range.min) || range.max <= range.min ||
        !view || !Number.isFinite(view.width) || !Number.isFinite(view.height) || view.width <= 0 || view.height <= 0) throw new Error('GIF potrebuje platný pohľad a nenulový rozsah pohonu.');
    if (!Number.isInteger(width) || width < 160 || width > limits.width || !Number.isFinite(duration) || duration < 1 || duration > limits.duration ||
        !Number.isInteger(fps) || fps < 5 || fps > limits.fps || !['forward', 'roundtrip'].includes(direction)) throw new Error('GIF: šírka 160–1 200 px, trvanie 1–12 s a frekvencia 5–20 snímok/s.');
    const height = width * view.height / view.width, scale = Math.min(1, limits.height / height);
    if (!Number.isFinite(height) || height <= 0) throw new Error('Neplatný pomer strán GIF.');
    const w = Math.max(1, Math.round(width * scale)), h = Math.max(1, Math.round(height * scale));
    let count = Math.round(duration * fps);
    if (direction === 'roundtrip') count = loop ? 2 * Math.ceil(count / 2) : 2 * Math.floor(count / 2) + 1;
    const total = Math.round(duration * 100);
    if (count * 100 > total * limits.fps) count -= direction === 'roundtrip' ? 2 : 1;
    if (count > limits.frames) throw new Error('GIF prekračuje 180 snímok. Skráťte trvanie alebo znížte frekvenciu.');
    if (w * h * count > limits.pixels) throw new Error('GIF prekračuje 60 miliónov obrazových bodov spolu. Zmenšite obrázok, trvanie alebo frekvenciu.');
    const half = (loop ? count : count - 1) / 2;
    const frames = Array.from({ length: count }, (_, i) => {
      const t = direction === 'roundtrip' ? i <= half ? i / half : 2 - i / half : i / (count - 1);
      return { motion: range.min + (range.max - range.min) * t, delay: Math.round((i + 1) * total / count) - Math.round(i * total / count) };
    });
    return { width: w, height: h, frames, direction, loop, duration: total / 100, fps: count * 100 / total, pixels: w * h * count };
  }

  function rgbaInput(rgba) {
    if (!ArrayBuffer.isView(rgba) || rgba.BYTES_PER_ELEMENT !== 1 || rgba.length < 4 || rgba.length % 4 || rgba.length > limits.width * limits.height * 4) throw new Error('Neplatný alebo príliš veľký obrazový rámec GIF.');
  }
  const rgbKey = (r, g, b) => (r >> 3) << 10 | (g >> 3) << 5 | b >> 3;

  function createPalette(background = [255, 255, 255]) {
    if (!Array.isArray(background) || background.length !== 3 || background.some((v) => !Number.isInteger(v) || v < 0 || v > 255)) throw new Error('Neplatná farba pozadia GIF.');
    background = [...background];
    const counts = new Uint32Array(32768), sums = [new Uint32Array(32768), new Uint32Array(32768), new Uint32Array(32768)];
    let pixels = 0, finished = false;
    const rgb = (rgba, i, color) => {
      const alpha = rgba[i + 3] / 255;
      for (let channel = 0; channel < 3; channel++) color[channel] = alpha === 1 ? rgba[i + channel] : Math.round(rgba[i + channel] * alpha + background[channel] * (1 - alpha));
    };
    return Object.freeze({
      add(rgba) {
        if (finished) throw new Error('Paleta GIF je už uzavretá.');
        rgbaInput(rgba);
        if (pixels + rgba.length / 4 > limits.palettePixels) throw new Error('Paleta GIF prekračuje limit troch plných snímok.');
        pixels += rgba.length / 4;
        const color = [0, 0, 0];
        for (let i = 0; i < rgba.length; i += 4) {
          rgb(rgba, i, color);
          const key = rgbKey(color[0], color[1], color[2]); counts[key]++;
          for (let channel = 0; channel < 3; channel++) sums[channel][key] += color[channel];
        }
      },
      finish() {
        if (finished) throw new Error('Paleta GIF je už uzavretá.');
        finished = true;
        const entries = [];
        for (let key = 0; key < counts.length; key++) if (counts[key]) entries.push({ count: counts[key], rgb: sums.map((sum) => sum[key] / counts[key]) });
        const box = (values) => {
          const ranges = [0, 1, 2].map((channel) => Math.max(...values.map((v) => v.rgb[channel])) - Math.min(...values.map((v) => v.rgb[channel])));
          return { values, count: values.reduce((sum, v) => sum + v.count, 0), ranges };
        };
        const boxes = entries.length ? [box(entries)] : [];
        while (boxes.length < 256) {
          let index = -1, score = -1;
          boxes.forEach((b, i) => {
            const value = Math.max(...b.ranges) * Math.sqrt(b.count);
            if (b.values.length > 1 && value > score) { score = value; index = i; }
          });
          if (index < 0) break;
          const current = boxes[index], channel = current.ranges.indexOf(Math.max(...current.ranges));
          const values = [...current.values].sort((a, b) => a.rgb[channel] - b.rgb[channel]);
          let sum = 0, split = 1;
          for (let i = 0; i < values.length - 1; i++) { sum += values[i].count; split = i + 1; if (sum >= current.count / 2) break; }
          boxes.splice(index, 1, box(values.slice(0, split)), box(values.slice(split)));
        }
        const palette = new Uint8Array(768), colors = boxes.map((b) => [0, 1, 2].map((channel) => Math.round(b.values.reduce((sum, v) => sum + v.rgb[channel] * v.count, 0) / b.count)));
        if (!colors.length) colors.push(background);
        for (let i = 0; i < 256; i++) palette.set(colors[Math.min(i, colors.length - 1)], i * 3);
        const lookup = new Int16Array(32768).fill(-1);
        return Object.freeze({
          get colors() { return palette.slice(); },
          indices(rgba) {
            rgbaInput(rgba);
            const output = new Uint8Array(rgba.length / 4), color = [0, 0, 0];
            for (let i = 0, pixel = 0; i < rgba.length; i += 4, pixel++) {
              rgb(rgba, i, color);
              const key = rgbKey(color[0], color[1], color[2]);
              if (lookup[key] < 0) {
                let closest = 0, distance = Infinity;
                for (let index = 0; index < colors.length; index++) {
                  const c = colors[index], d = .299 * (c[0] - color[0]) ** 2 + .587 * (c[1] - color[1]) ** 2 + .114 * (c[2] - color[2]) ** 2;
                  if (d < distance) { distance = d; closest = index; }
                }
                lookup[key] = closest;
              }
              output[pixel] = lookup[key];
            }
            return output;
          },
        });
      },
    });
  }

  function writer(maximum) {
    const chunks = []; let block = new Uint8Array(Math.min(65536, maximum)), offset = 0, length = 0;
    const byte = (value) => {
      if (length >= maximum) throw new Error('GIF prekračuje 32 MB alebo zvolený limit. Zmenšite obrázok alebo počet snímok.');
      if (offset === block.length) { chunks.push(block); block = new Uint8Array(Math.min(65536, maximum - length)); offset = 0; }
      block[offset++] = value; length++;
    };
    return {
      byte, word: (value) => { byte(value & 255); byte(value >>> 8 & 255); },
      bytes: (values) => { for (const value of values) byte(value); },
      text: (value) => { for (const character of value) byte(character.charCodeAt(0)); },
      finish: () => {
        const output = new Uint8Array(length); let at = 0;
        for (const chunk of chunks) { output.set(chunk, at); at += chunk.length; }
        output.set(block.subarray(0, offset), at); return output;
      },
    };
  }

  function lzw(indices, output) {
    const dictionary = new Map(), bytes = new Uint8Array(255);
    let count = 0, bits = 0, bitCount = 0, width = 9, next = 258;
    const byte = (value) => {
      bytes[count++] = value;
      if (count === 255) { output.byte(count); output.bytes(bytes); count = 0; }
    };
    const code = (value) => {
      bits |= value << bitCount; bitCount += width;
      while (bitCount >= 8) { byte(bits & 255); bits >>>= 8; bitCount -= 8; }
      // The decoder adds a dictionary entry one emitted code later.
      if (next >= (1 << width) && width < 12) width++;
    };
    output.byte(8); code(256);
    let prefix = indices[0];
    for (let i = 1; i < indices.length; i++) {
      const value = indices[i], key = prefix << 8 | value, found = dictionary.get(key);
      if (found != null) prefix = found;
      else {
        code(prefix);
        if (next < 4096) dictionary.set(key, next++);
        else { code(256); dictionary.clear(); width = 9; next = 258; }
        prefix = value;
      }
    }
    code(prefix); code(257);
    if (bitCount) byte(bits & 255);
    if (count) { output.byte(count); output.bytes(bytes.subarray(0, count)); }
    output.byte(0);
  }

  function createEncoder(options) {
    const { width, height, palette } = options, maximum = options.maxBytes ?? limits.bytes;
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > limits.width || height > limits.height ||
        !(palette instanceof Uint8Array) || palette.length !== 768 || !Number.isInteger(maximum) || maximum < 1024 || maximum > limits.bytes) throw new Error('Neplatné rozmery, paleta alebo limit GIF.');
    const output = writer(maximum); let frames = 0, finished = false, failed = false;
    output.text('GIF89a'); output.word(width); output.word(height); output.bytes([0xf7, 0, 0]); output.bytes(palette);
    if (options.loop !== false) { output.bytes([0x21, 0xff, 11]); output.text('NETSCAPE2.0'); output.bytes([3, 1, 0, 0, 0]); }
    return Object.freeze({
      get frameCount() { return frames; },
      addFrame(indices, delay = 10) {
        if (finished || failed) throw new Error('GIF je už uzavretý alebo jeho príprava zlyhala.');
        if (!(indices instanceof Uint8Array) || indices.length !== width * height || !Number.isInteger(delay) || delay < 2 || delay > 1200) throw new Error('Neplatná snímka alebo časovanie GIF.');
        if (frames >= limits.frames || (frames + 1) * width * height > limits.pixels) throw new Error('GIF prekračuje limit snímok alebo obrazových bodov.');
        try {
          output.bytes([0x21, 0xf9, 4, 4]); output.word(delay); output.bytes([0, 0]);
          output.bytes([0x2c, 0, 0, 0, 0]); output.word(width); output.word(height); output.byte(0);
          lzw(indices, output); frames++;
        } catch (error) { failed = true; throw error; }
      },
      finish() {
        if (finished || failed || !frames) throw new Error('GIF nemá dokončené snímky alebo už bol uzavretý.');
        finished = true; output.byte(0x3b); return output.finish();
      },
    });
  }

  global.KinmoGIF = Object.freeze({ limits, plan, createPalette, createEncoder });
})(globalThis);
