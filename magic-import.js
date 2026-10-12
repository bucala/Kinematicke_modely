/* Local raster tracing. Pixel calibration never changes the mechanism's mm/degree convention. */
(function (global) {
  'use strict';
  const K = global.Kinematics;
  const limits = Object.freeze({ bytes: 10 * 1024 * 1024, side: 8192, pixels: 16000000, vertices: 64 });
  const steps = Object.freeze(['Obrázok', 'Mierka', 'Pevné časti', 'Členy a väzby', 'Dokončenie']);
  const mimeTypes = ['image/png', 'image/jpeg', 'image/webp'];
  const point = (p) => !!p && [p.x, p.y].every(Number.isFinite);
  const size = (width, height) => {
    if (![width, height].every((v) => Number.isInteger(v) && v > 0 && v <= limits.side) || width * height > limits.pixels) throw new Error('Obrázok môže mať najviac 8192 px na stranu a 16 miliónov pixelov. Zmenšite ho pred importom.');
    return { width, height };
  };
  function validateFile(file) {
    if (!file || !Number.isInteger(file.size) || file.size < 1 || file.size > limits.bytes) throw new Error('Vyberte obrázok PNG, JPG alebo WebP do 10 MB.');
    if (file.type && !mimeTypes.includes(file.type)) throw new Error('Podporované sú iba PNG, JPG a neanimované WebP. SVG, GIF a HEIC najskôr preveďte na PNG alebo JPG.');
  }
  function imageMetadata(bytes, mime = '') {
    if (!(bytes instanceof Uint8Array) || bytes.length < 12 || bytes.length > limits.bytes) throw new Error('Obrázok je prázdny, poškodený alebo prekračuje 10 MB.');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const text = (offset, count) => String.fromCharCode(...bytes.subarray(offset, offset + count));
    let width, height, type;
    if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) {
      if (bytes.length < 33 || view.getUint32(8) !== 13 || text(12, 4) !== 'IHDR') throw new Error('PNG nemá platnú hlavičku.');
      type = 'image/png'; width = view.getUint32(16); height = view.getUint32(20);
      size(width, height);
      for (let offset = 8; offset + 12 <= bytes.length;) {
        const length = view.getUint32(offset), end = offset + length + 12;
        if (end > bytes.length) throw new Error('PNG obsahuje neúplný blok.');
        if (text(offset + 4, 4) === 'acTL') throw new Error('Animovaný obrázok nie je podporovaný. Uložte jednu snímku ako PNG alebo JPG.');
        if (text(offset + 4, 4) === 'IEND') break;
        offset = end;
      }
    } else if (bytes[0] === 255 && bytes[1] === 216) {
      type = 'image/jpeg';
      for (let offset = 2; offset < bytes.length;) {
        if (bytes[offset++] !== 255) throw new Error('JPG obsahuje neplatnú hlavičku.');
        while (bytes[offset] === 255) offset++;
        const marker = bytes[offset++];
        if (marker === 217 || marker === 218 || offset + 2 > bytes.length) break;
        if (marker === 1 || marker >= 208 && marker <= 215) continue;
        const length = view.getUint16(offset);
        if (length < 2 || offset + length > bytes.length) throw new Error('JPG obsahuje neúplný blok.');
        if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
          if (length < 8) throw new Error('JPG nemá platné rozmery.');
          height = view.getUint16(offset + 3); width = view.getUint16(offset + 5); break;
        }
        offset += length;
      }
    } else if (text(0, 4) === 'RIFF' && text(8, 4) === 'WEBP') {
      type = 'image/webp';
      if (view.getUint32(4, true) + 8 !== bytes.length) throw new Error('WebP obsahuje neúplný blok.');
      for (let offset = 12; offset + 8 <= bytes.length;) {
        const kind = text(offset, 4), length = view.getUint32(offset + 4, true), start = offset + 8;
        if (start + length > bytes.length) throw new Error('WebP obsahuje neúplný blok.');
        if (kind === 'ANIM' || kind === 'ANMF' || kind === 'VP8X' && length >= 10 && (bytes[start] & 2)) throw new Error('Animovaný obrázok nie je podporovaný. Uložte jednu snímku ako PNG alebo JPG.');
        if (kind === 'VP8X' && length >= 10) {
          width = 1 + bytes[start + 4] + (bytes[start + 5] << 8) + (bytes[start + 6] << 16);
          height = 1 + bytes[start + 7] + (bytes[start + 8] << 8) + (bytes[start + 9] << 16);
        } else if (kind === 'VP8 ' && length >= 10 && bytes[start + 3] === 157 && bytes[start + 4] === 1 && bytes[start + 5] === 42 && width == null) {
          width = view.getUint16(start + 6, true) & 16383; height = view.getUint16(start + 8, true) & 16383;
        } else if (kind === 'VP8L' && length >= 5 && bytes[start] === 47 && width == null) {
          const bits = view.getUint32(start + 1, true);
          width = 1 + (bits & 16383); height = 1 + (bits >>> 14 & 16383);
        }
        offset = start + length + (length & 1);
      }
    } else throw new Error('Súbor nemá podporovaný obrázkový formát. Vyberte skutočný PNG, JPG alebo WebP.');
    if (mime && mime !== type) throw new Error('Typ súboru nezodpovedá obsahu obrázka.');
    return { ...size(width, height), type };
  }
  async function loadImage(file) {
    validateFile(file);
    const bytes = new Uint8Array(await file.arrayBuffer()), metadata = imageMetadata(bytes, file.type);
    const image = new global.Image(), url = global.URL.createObjectURL(new Blob([bytes], { type: metadata.type }));
    try {
      await new Promise((resolve, reject) => {
        const finish = (error) => { global.clearTimeout(timer); image.onload = null; image.onerror = null; if (error) reject(error); else resolve(); };
        const timer = global.setTimeout(() => finish(new Error('Načítanie obrázka trvá príliš dlho. Skúste menší PNG alebo JPG.')), 15000);
        image.onerror = () => finish(new Error('Obrázok sa nedá otvoriť. Uložte ho znova ako PNG alebo JPG.'));
        image.onload = () => {
          try { size(image.naturalWidth, image.naturalHeight); finish(); } catch (error) { finish(error); }
        };
        image.src = url;
      });
      return { url, width: image.naturalWidth, height: image.naturalHeight, type: metadata.type, name: String(file.name || 'Obrázok').slice(0, 120) };
    } catch (error) {
      image.src = ''; global.URL.revokeObjectURL(url); throw error;
    }
  }
  function calibration(image, a, b, distance, axis = 'distance') {
    size(image?.width, image?.height);
    if (![a, b].every((p) => point(p) && p.x >= 0 && p.y >= 0 && p.x <= image.width && p.y <= image.height)) throw new Error('Vyberte dva body priamo na obrázku.');
    if (!['distance', 'horizontal', 'vertical'].includes(axis)) throw new Error('Vyberte dĺžku A–B, rozmer X alebo rozmer Y.');
    const pixels = axis === 'horizontal' ? Math.abs(b.x - a.x) : axis === 'vertical' ? Math.abs(b.y - a.y) : K.distance(a, b);
    if (pixels < 2) throw new Error('Kalibračné body musia byť od seba aspoň 2 pixely. Vyberte čo najdlhší známy rozmer.');
    if (!Number.isFinite(distance) || distance < .1 || distance > 5000) throw new Error('Známa vzdialenosť musí byť 0,1 až 5000 mm.');
    const result = { a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y }, distance, axis, pixels, mmPerPixel: distance / pixels }, rect = imageRect(image, result);
    if (rect.x < -5000 || rect.y < -5000 || rect.x + rect.width > 5000 || rect.y + rect.height > 5000) throw new Error('Podklad po kalibrácii presahuje rozsah editora ±5000 mm. Skontrolujte rozmer, zvoľte dlhší úsek alebo obrázok orežte.');
    return result;
  }
  function rescale(project, from, to) {
    const p = K.copy(K.validateProject(project));
    if (p.kind !== 'custom' || !point(from?.a) || !point(to?.a) || ![from?.mmPerPixel, to?.mmPerPixel].every((v) => Number.isFinite(v) && v > 0)) throw new Error('Prepočet vyžaduje vlastnú schému a dve platné mierky.');
    const ratio = to.mmPerPixel / from.mmPerPixel;
    const local = (v) => ({ x: v.x * ratio, y: v.y * ratio });
    const world = (v) => ({ x: v.x * ratio + (from.a.x - to.a.x) * to.mmPerPixel, y: v.y * ratio + (from.a.y - to.a.y) * to.mmPerPixel });
    for (const e of p.elements) {
      Object.assign(e, e.parentId ? local(e) : world(e));
      for (const key of ['length', 'width', 'radius', 'camLift', 'stroke', 'carriageOffset', 'carriageWidth', 'carriageHeight', 'slotWidth', 'bearingOffset', 'curveRadius']) e[key] *= ratio;
      if (K.isElastic(e)) for (const key of ['restLength', 'minLength', 'maxLength', 'diameter', 'rodDiameter', 'wireDiameter']) e[key] *= ratio;
      e.controls = e.controls.map(local); e.outline = e.outline.map(local);
      if (e.localC) e.localC = local(e.localC);
      if (e.com) e.com = local(e.com);
      if (e.driveMode === 'linear' && e.driveSpeed != null) e.driveSpeed *= ratio;
    }
    for (const j of p.connections) {
      if (j.type === 'distance') j.value *= ratio;
      if (j.type === 'prismatic' && j.limitMin != null) { j.limitMin *= ratio; j.limitMax *= ratio; }
    }
    for (const d of p.dimensions) {
      if (!d.a.elementId) d.a = world(d.a);
      if (!d.b.elementId) d.b = world(d.b);
      d.offset *= ratio;
    }
    p.parameters.travelMin *= ratio; p.parameters.travelMax *= ratio;
    if (p.controls) p.controls = p.controls.map(world);
    if (p.elements.some((e) => e.drive && e.driveMode === 'linear')) p.simulation.initialVelocity *= ratio;
    return K.validateProject(p);
  }
  function worldFromPixel(p, scale) {
    if (!point(p) || !point(scale?.a) || !Number.isFinite(scale.mmPerPixel) || scale.mmPerPixel <= 0) throw new Error('Obrázok ešte nemá platnú mierku.');
    return { x: (p.x - scale.a.x) * scale.mmPerPixel, y: (p.y - scale.a.y) * scale.mmPerPixel };
  }
  function pixelFromWorld(p, scale) {
    if (!point(p) || !point(scale?.a) || !Number.isFinite(scale.mmPerPixel) || scale.mmPerPixel <= 0) throw new Error('Obrázok ešte nemá platnú mierku.');
    return { x: p.x / scale.mmPerPixel + scale.a.x, y: p.y / scale.mmPerPixel + scale.a.y };
  }
  function imageRect(image, scale = null) {
    size(image?.width, image?.height);
    const origin = scale ? worldFromPixel({ x: 0, y: 0 }, scale) : { x: 0, y: 0 }, factor = scale?.mmPerPixel ?? 1;
    return { ...origin, width: image.width * factor, height: image.height * factor };
  }
  function traceBody(project, type, points, width = 10) {
    const p = K.copy(K.validateProject(project));
    if (p.kind !== 'custom' || !['ground', 'node', 'link', 'panel', 'rail'].includes(type)) throw new Error('Obkresľovanie vyžaduje vlastný projekt a podporovaný tuhý člen.');
    if (!Array.isArray(points) || points.length < (type === 'node' ? 1 : 2) || points.length > (type === 'ground' ? limits.vertices : type === 'node' ? 1 : 2) || points.some((v) => !point(v) || Math.abs(v.x) > 5000 || Math.abs(v.y) > 5000)) throw new Error('Zadajte platné body v rozsahu ±5000 mm. Obrys rámu môže mať najviac 64 vrcholov.');
    if (!Number.isFinite(width) || width < .1 || width > 5000) throw new Error('Hrúbka musí byť 0,1 až 5000 mm.');
    const a = points[0], length = type === 'node' ? 1 : K.distance(a, points[1]);
    if (length < .1 || length > 5000) throw new Error('Člen musí mať dĺžku 0,1 až 5000 mm.');
    const e = { ...K.makeElement(type, a.x, a.y), length, width, angle: type === 'node' ? 0 : K.angleOf(a, points[1]), name: type === 'ground' ? 'Pevná časť' : type === 'node' ? 'Pevný bod' : type === 'panel' ? 'Obkreslené čelo' : type === 'rail' ? 'Obkreslené vedenie' : 'Obkreslené rameno' };
    if (['ground', 'node'].includes(type)) { e.locked = true; e.drive = false; e.mass = 0; }
    if (type === 'node') e.radius = 3;
    if (type === 'rail') {
      e.stroke = length; e.drive = !p.elements.some((v) => v.drive);
      if (e.drive) { p.parameters.travelMin = 0; p.parameters.travelMax = e.stroke; }
    }
    if (type === 'panel') e.bearingOffset = length / 2;
    if (type === 'ground') {
      if (points.length === 2) e.outline = [{ x: 0, y: -width / 2 }, { x: length, y: -width / 2 }, { x: length, y: width / 2 }, { x: 0, y: width / 2 }];
      else {
        validateOutline(points);
        e.outline = points.map((v) => K.rotate({ x: v.x - a.x, y: v.y - a.y }, -e.angle));
        for (let i = 2; i < points.length; i++) p.elements.push({ ...K.makeElement('node', e.outline[i].x, e.outline[i].y), parentId: e.id, radius: 3, length: 1, mass: 0, role: 'poi', name: `Pevná časť · vrchol ${i + 1}` });
      }
    }
    p.elements.push(e);
    return K.validateProject(p);
  }
  const validateOutline = K.validateOutline;
  function placeElement(project, type, at) {
    const p = K.copy(K.validateProject(project));
    if (p.kind !== 'custom' || !K.TYPES.includes(type) || !point(at) || Math.abs(at.x) > 5000 || Math.abs(at.y) > 5000) throw new Error('Vyberte prvok a bod vloženia v rozsahu ±5000 mm.');
    const e = K.makeElement(type, at.x, at.y);
    e.name = `${e.name} ${p.elements.filter((v) => v.type === type).length + 1}`;
    if (e.drive && p.elements.some((v) => v.drive)) e.drive = false;
    if (e.drive) { p.parameters.travelMin = 0; p.parameters.travelMax = e.stroke; }
    p.elements.push(e);
    return K.validateProject(p);
  }
  function applyDetected(project, image, scale, candidates, options = {}) {
    let p = K.copy(K.validateProject(project));
    const checked = calibration(image, scale?.a, scale?.b, scale?.distance, scale?.axis), added = [];
    if (p.kind !== 'custom' || Math.abs(checked.mmPerPixel - scale.mmPerPixel) > 1e-9 || !Array.isArray(candidates) || candidates.length > 60) throw new Error('Detekcia vyžaduje kalibrovanú vlastnú schému a najviac 60 návrhov.');
    const selected = candidates.filter((c) => c.selected);
    if (!selected.length) throw new Error('Vyberte aspoň jeden rozpoznaný prvok alebo preskočte detekciu.');
    for (const c of selected) {
      if (!['ground', 'link', 'panel', 'rail', 'slot', 'bearing', 'node'].includes(c.type) || !Array.isArray(c.points) || c.points.length < (['bearing', 'node'].includes(c.type) ? 1 : 2) || c.points.length > 64 || c.points.some((v) => !point(v) || v.x < 0 || v.y < 0 || v.x > image.width || v.y > image.height) || !Number.isFinite(c.width) || c.width <= 0 || c.width > Math.max(image.width, image.height) || !Number.isFinite(c.radius) || c.radius <= 0) throw new Error('Rozpoznaný prvok má neplatné body alebo rozmery.');
      if (c.outline != null && (!Array.isArray(c.outline) || c.outline.length > 64 || c.outline.length && c.outline.length < 3 || c.outline.some((v) => !point(v) || v.x < 0 || v.y < 0 || v.x > image.width || v.y > image.height))) throw new Error('Rozpoznaný obrys má neplatné vrcholy.');
      const points = c.points.map((v) => worldFromPixel(v, scale)), parameters = K.copy(p.parameters);
      let e;
      if (['bearing', 'node', 'slot'].includes(c.type)) {
        e = K.makeElement(c.type, points[0].x, points[0].y);
        if (c.type === 'slot') {
          e.curveKind = 'polyline'; e.controls = points.map((v) => ({ x: v.x - e.x, y: v.y - e.y }));
          e.slotWidth = Math.max(.1, c.width * scale.mmPerPixel);
        } else {
          e.radius = Math.max(.1, c.radius * scale.mmPerPixel); e.length = 1;
        }
        p.elements.push(e);
      } else {
        p = traceBody(p, c.type, [points[0], points.at(-1)], Math.max(.1, c.width * scale.mmPerPixel));
        e = p.elements.at(-1);
      }
      if (c.outline?.length && ['ground', 'link', 'panel'].includes(c.type)) {
        const outline = c.outline.map((v) => worldFromPixel(v, scale));
        validateOutline(outline);
        e.outline = outline.map((v) => K.rotate({ x: v.x - e.x, y: v.y - e.y }, -e.angle));
      }
      e.drive = false; e.locked = c.type === 'ground'; e.color = /^#[0-9a-fA-F]{6}$/.test(c.color || '') ? c.color : '';
      e.name = `Detekcia · ${K.makeElement(c.type).name} ${added.length + 1}`;
      p.parameters = parameters; added.push(e.id);
    }
    if (options.connections === true) {
      const tolerance = options.tolerance ?? 4;
      if (!Number.isFinite(tolerance) || tolerance <= 0 || tolerance > 25) throw new Error('Tolerancia detekcie uzlov musí byť 0 až 25 px.');
      const result = K.solve(K.validateProject(p), K.driveRange(p).min, { design: true, collisions: false }), groups = [];
      const elements = p.elements.filter((e) => added.includes(e.id)).sort((a, b) => Number(b.locked) - Number(a.locked));
      for (const e of elements) for (const key of ['bearing', 'node'].includes(e.type) ? ['a'] : e.type === 'slot' ? [] : ['a', 'b']) {
        const at = result.poses[e.id][key], r = { elementId: e.id, point: key };
        const group = groups.find((g) => K.distance(g.at, at) <= tolerance * scale.mmPerPixel);
        if (!group) { groups.push({ at, r, fixed: e.locked }); continue; }
        if (group.r.elementId === e.id || group.fixed && e.locked) continue;
        p.connections.push({ id: K.uid(), name: 'Detegovaný otočný spoj · overiť', type: 'revolute', a: group.r, b: r, value: 0, builtin: false });
      }
    }
    return { project: K.validateProject(p), added };
  }
  function finish(project, image, scale, name) {
    const p = K.copy(K.validateProject(project));
    if (p.kind !== 'custom' || !p.elements.length) throw new Error('Najskôr vytvorte aspoň jeden člen alebo pevný bod.');
    const checked = calibration(image, scale?.a, scale?.b, scale?.distance, scale?.axis);
    if (!Number.isFinite(scale.mmPerPixel) || Math.abs(scale.mmPerPixel - checked.mmPerPixel) > 1e-9) throw new Error('Mierka obrázka sa zmenila. Potvrďte kalibráciu pred dokončením.');
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 80 || /[\x00-\x1f\x7f]/.test(name)) throw new Error('Zadajte názov projektu s 1 až 80 znakmi.');
    p.name = name.trim();
    p.source = { kind: 'custom', name: 'Magic import', motion: 0, note: `Schéma z lokálneho obrázka, obkreslená alebo navrhnutá lokálnou detekciou. Geometriu a väzby treba overiť. Kalibrácia: ${checked.distance} mm / ${Number(checked.pixels.toFixed(3))} px. Fotografia sa neukladá; jedna mierka neodstraňuje perspektívu ani skreslenie objektívu.` };
    return K.validateProject(p);
  }
  global.KinmoMagicImport = Object.freeze({ limits, steps, validateFile, imageMetadata, loadImage, calibration, rescale, worldFromPixel, pixelFromWorld, imageRect, traceBody, placeElement, applyDetected, finish });
})(globalThis);
