/* Styled snapshots of the actual canvas. Rasterisation stays on this device. */
(function (global) {
  'use strict';
  const limits = Object.freeze({ width: 2000, height: 4000, pixels: 8000000, svgBytes: 8 * 1024 * 1024, timeout: 15000 });
  const properties = ['color', 'fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-dasharray', 'stroke-dashoffset', 'opacity', 'visibility', 'display', 'vector-effect', 'font-family', 'font-size', 'font-weight', 'font-style', 'letter-spacing', 'text-anchor', 'dominant-baseline', 'paint-order', 'stop-color', 'stop-opacity', 'filter'];

  function size(view, options = {}) {
    const width = options.width ?? limits.width, maxHeight = options.maxHeight ?? limits.height;
    if (!view || !Number.isFinite(view.width) || !Number.isFinite(view.height) || view.width <= 0 || view.height <= 0 ||
        !Number.isInteger(width) || width < 1 || width > limits.width || !Number.isInteger(maxHeight) || maxHeight < 1 || maxHeight > limits.height) throw new Error('Neplatné rozmery obrazového exportu.');
    const height = width * view.height / view.width, scale = Math.min(1, maxHeight / height);
    if (!Number.isFinite(height) || height <= 0) throw new Error('Neplatný pomer strán obrazového exportu.');
    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
  }

  function localPaint(value) {
    return value.replace(/url\(([^)]+)\)/g, (match, reference) => {
      const id = reference.trim().replace(/^['"]|['"]$/g, '').match(/#([a-zA-Z][\w-]*)$/)?.[1];
      if (!id) throw new Error('Obrazový export nesmie načítavať externé obrázky alebo filtre.');
      return `url(#${id})`;
    });
  }

  function snapshot(source, options) {
    const { view } = options, dimensions = size(view, options);
    if (!Number.isFinite(view.x) || !Number.isFinite(view.y)) throw new Error('Neplatný pohľad plátna.');
    const copy = source.cloneNode(true), originals = [source, ...source.querySelectorAll('*')], copies = [copy, ...copy.querySelectorAll('*')];
    const overlays = [...copy.querySelectorAll('[data-editor-overlay], .control-handle')];
    for (const [i, node] of copies.entries()) {
      const css = global.getComputedStyle(originals[i]);
      node.removeAttribute('style');
      for (const property of properties) {
        const value = css.getPropertyValue(property).trim();
        if (value) { node.style.setProperty(property, localPaint(value)); node.removeAttribute(property); }
      }
      if (css.getPropertyValue('vector-effect').trim() === 'non-scaling-stroke') {
        const matrix = originals[i].getScreenCTM?.() || source.getScreenCTM(), scale = matrix ? Math.hypot(matrix.a, matrix.b) : 1;
        if (scale > 0) {
          // Keep one-screen-pixel strokes equally legible in high-resolution PNG/PDF.
          node.style.setProperty('vector-effect', 'none');
          for (const property of ['stroke-width', 'stroke-dasharray', 'stroke-dashoffset']) {
            const value = css.getPropertyValue(property).trim();
            if (value && value !== 'none' && /^[\d.eE+\-\s,px]+$/.test(value)) {
              node.style.setProperty(property, value.split(/[\s,]+/).map((v) => Number.parseFloat(v) / scale).join(' '));
            }
          }
        }
      }
      for (const attribute of [...node.attributes]) if (/^(?:data-|aria-|on)|^(?:role|tabindex|id)$/.test(attribute.name) && !(attribute.name === 'id' && node !== copy)) node.removeAttribute(attribute.name);
    }
    for (const overlay of overlays) overlay.remove();
    if (copy.querySelector('image, use, script, foreignObject, a, animate, set')) throw new Error('Schéma obsahuje nepodporovaný externý alebo interaktívny obsah.');
    for (const node of [copy, ...copy.querySelectorAll('*')]) {
      if (node.getAttribute('href') || node.getAttribute('xlink:href')) throw new Error('Schéma nesmie odkazovať na externý obsah.');
    }
    copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    copy.setAttribute('width', dimensions.width); copy.setAttribute('height', dimensions.height);
    copy.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
    copy.removeAttribute('class');
    const title = global.document.createElementNS('http://www.w3.org/2000/svg', 'title'), description = global.document.createElementNS('http://www.w3.org/2000/svg', 'desc');
    title.textContent = options.title || ''; description.textContent = options.description || '';
    copy.prepend(title, description);
    const value = copy.outerHTML;
    if (new TextEncoder().encode(value).length > limits.svgBytes) throw new Error('Obraz schémy prekračuje 8 MB. Skryte nepotrebné trajektórie a krajné polohy.');
    return value;
  }

  function abortError() {
    const error = new Error('Obrazový export bol zrušený.'); error.name = 'AbortError'; return error;
  }

  async function rasterize(svg, dimensions, options = {}) {
    const { width, height } = dimensions, signal = options.signal;
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > limits.width || height > limits.height || width * height > limits.pixels) throw new Error('Obrázok prekračuje povolené rozmery.');
    if (typeof svg !== 'string' || new TextEncoder().encode(svg).length > limits.svgBytes) throw new Error('Obraz schémy prekračuje 8 MB.');
    if (signal?.aborted) throw abortError();
    const image = new global.Image(), url = global.URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    try {
      await new Promise((resolve, reject) => {
        const finish = (error) => {
          clearTimeout(timer); signal?.removeEventListener('abort', cancel);
          image.onload = image.onerror = null;
          if (error) { image.src = ''; reject(error); } else resolve();
        };
        const cancel = () => finish(abortError());
        const timer = setTimeout(() => finish(new Error('Prehliadač nedokončil kreslenie obrázka. Skúste menší model.')), limits.timeout);
        image.onload = () => finish();
        image.onerror = () => finish(new Error('Obrázok schémy sa nepodarilo vytvoriť.'));
        signal?.addEventListener('abort', cancel, { once: true });
        image.src = url;
      });
      if (signal?.aborted) throw abortError();
      const canvas = options.canvas || global.document.createElement('canvas'); canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: options.readPixels === true });
      if (!context) throw new Error('Prehliadač nepodporuje kreslenie obrazového exportu.');
      context.drawImage(image, 0, 0, width, height);
      return canvas;
    } finally { global.URL.revokeObjectURL(url); }
  }

  global.KinmoScene = Object.freeze({ limits, size, snapshot, rasterize });
})(globalThis);
