/* Independent, read-only test decoder. It is not part of the application. */
(function (global) {
  'use strict';
  function decode(bytes) {
    let offset = 0;
    const byte = () => { if (offset >= bytes.length) throw new Error('Truncated GIF.'); return bytes[offset++]; };
    const word = () => byte() | byte() << 8;
    const block = (length) => { const value = bytes.slice(offset, offset + length); if (value.length !== length) throw new Error('Truncated GIF block.'); offset += length; return value; };
    const text = (length) => String.fromCharCode(...block(length));
    const subblocks = () => {
      const chunks = []; let length = 0, n;
      while ((n = byte())) { chunks.push(block(n)); length += n; }
      const all = new Uint8Array(length); let position = 0;
      for (const chunk of chunks) { all.set(chunk, position); position += chunk.length; } return all;
    };
    if (!['GIF87a', 'GIF89a'].includes(text(6))) throw new Error('Invalid GIF header.');
    const width = word(), height = word(), packed = byte(), background = byte(); byte();
    const palette = packed & 128 ? block(3 * (1 << ((packed & 7) + 1))) : null;
    const frames = []; let loop = null, delay = 0, disposal = 0, transparency = null, trailer = false;
    while (offset < bytes.length) {
      const marker = byte();
      if (marker === 0x3b) { trailer = true; break; }
      if (marker === 0x21) {
        const label = byte();
        if (label === 0xf9) {
          if (byte() !== 4) throw new Error('Invalid graphics control extension.');
          const flags = byte(); delay = word(); const index = byte(); transparency = flags & 1 ? index : null; disposal = flags >> 2 & 7;
          if (byte() !== 0) throw new Error('Invalid graphics terminator.');
        } else if (label === 0xff) {
          const application = text(byte()), data = subblocks();
          if (application === 'NETSCAPE2.0' && data[0] === 1) loop = data[1] | data[2] << 8;
        } else subblocks();
        continue;
      }
      if (marker !== 0x2c) throw new Error('Invalid GIF block.');
      const x = word(), y = word(), w = word(), h = word(), flags = byte();
      if (!w || !h || w * h > 1440000 || flags & 64) throw new Error('Unsupported test frame dimensions or interlace.');
      const colors = flags & 128 ? block(3 * (1 << ((flags & 7) + 1))) : palette;
      const minimum = byte(), compressed = subblocks();
      if (minimum < 2 || minimum > 8 || !colors) throw new Error('Invalid LZW setup.');
      const clear = 1 << minimum, stop = clear + 1, widths = new Set();
      let table, next, bits, previous, bit = 0, position = 0, ended = false, clears = 0;
      const reset = () => {
        table = Array.from({ length: 4096 }, (_, i) => i < clear ? Uint8Array.of(i) : null);
        next = stop + 1; bits = minimum + 1; previous = null;
      };
      const readCode = () => {
        if (bit + bits > compressed.length * 8) throw new Error('Truncated LZW stream.');
        widths.add(bits); let value = 0;
        for (let i = 0; i < bits; i++, bit++) value |= (compressed[bit >> 3] >> (bit & 7) & 1) << i;
        return value;
      };
      const indices = new Uint8Array(w * h); reset();
      while (!ended) {
        const code = readCode();
        if (code === clear) { reset(); clears++; continue; }
        if (code === stop) { ended = true; break; }
        let entry = table[code];
        if (!entry && code === next && previous) { entry = new Uint8Array(previous.length + 1); entry.set(previous); entry[previous.length] = previous[0]; }
        if (!entry || position + entry.length > indices.length) throw new Error('Invalid LZW code or excess pixels.');
        indices.set(entry, position); position += entry.length;
        if (previous && next < 4096) {
          const value = new Uint8Array(previous.length + 1); value.set(previous); value[previous.length] = entry[0]; table[next++] = value;
          if (next === (1 << bits) && bits < 12) bits++;
        }
        previous = entry;
      }
      if (!ended || position !== indices.length) throw new Error('Incomplete GIF pixels.');
      frames.push({ x, y, width: w, height: h, indices, palette: colors, delay, disposal, transparency, widths: [...widths], clears });
      delay = 0; disposal = 0; transparency = null;
    }
    if (!trailer || offset !== bytes.length) throw new Error('Missing GIF trailer or trailing data.');
    return { width, height, background, palette, frames, loop };
  }
  global.KinmoGifTestDecoder = Object.freeze({ decode });
})(globalThis);
