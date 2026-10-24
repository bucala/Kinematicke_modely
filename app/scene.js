/* Kinematika UI · Kreslenie mechanizmu, grafy, analýza a prehrávanie.
   Klasický skript bez IIFE: zdieľa najvyššiu úroveň s ostatnými app/*.js a app.js, ktorý sa načíta posledný
   a definuje stav a konštanty. Súbor obsahuje iba deklarácie funkcií, pri načítaní nič nespúšťa. */
'use strict';
  // Screen pixels per model millimetre, from the canvas size and the view box (preserveAspectRatio "meet").
  // Reading getScreenCTM right after a new viewBox would force the browser to lay the page out mid-frame.
  function canvasScale(view = state.view) {
    const size = state.canvasSize || $('#mechanism-canvas')?.getBoundingClientRect?.();
    if (!size?.width || !size?.height || !view?.width || !view?.height) return 1;
    return Math.min(size.width / view.width, size.height / view.height) || 1;
  }

  // Client coordinates to model coordinates for a view that may not be drawn yet (coalesced wheel events).
  function viewPoint(event, view = state.view) {
    const rect = $('#mechanism-canvas').getBoundingClientRect(), scale = Math.min(rect.width / view.width, rect.height / view.height) || 1;
    return { x: view.x + (event.clientX - (rect.left || 0) - (rect.width - view.width * scale) / 2) / scale, y: view.y + (event.clientY - (rect.top || 0) - (rect.height - view.height * scale) / 2) / scale };
  }

  // Panels redrawn with every scene frame touch the DOM only when their markup changes.
  function setMarkup(el, html) {
    if (el._markup === html) return false;
    el.innerHTML = html; el._markup = html;
    return true;
  }

  // Each scene part lives in its own group; unchanged parts keep their DOM, so the browser re-lays out and repaints
  // only what moved. Nodes added to the canvas by other code are dropped, as a full innerHTML replacement did.
  function patchScene(svg, chunks) {
    if (!svg.children || typeof document.createElementNS !== 'function') { svg.innerHTML = chunks.join(''); return; }
    let layers = svg._sceneLayers;
    if (!layers?.every((layer) => layer.node.parentNode === svg)) { svg.innerHTML = ''; layers = []; }
    const own = new Set(layers.map((layer) => layer.node));
    for (const child of [...svg.children]) if (!own.has(child)) child.remove();
    chunks.forEach((html, i) => {
      let layer = layers[i];
      if (!layer) { const node = document.createElementNS(svgNS, 'g'); node.setAttribute('class', 'scene-part'); svg.append(node); layer = layers[i] = { node, html: null }; }
      if (layer.html !== html) { layer.node.innerHTML = html; layer.html = html; }
    });
    for (const layer of layers.splice(chunks.length)) layer.node.remove();
    svg._sceneLayers = layers;
  }

  // In debug mode a small meter shows the frame rate, the worst frame and the scene render time, so a report can be measured.
  function updateFpsMeter() {
    const area = $('#canvas-area'); if (!area || typeof requestAnimationFrame !== 'function') return;
    let meter = $('#fps-meter');
    if (!globalThis.KinmoDebug?.status().enabled) { meter?.remove(); state.fpsMeter = null; return; }
    if (!meter) { meter = document.createElement('div'); meter.id = 'fps-meter'; meter.className = 'fps-meter'; meter.setAttribute('aria-hidden', 'true'); area.append(meter); }
    if (state.fpsMeter) return;
    const meterState = state.fpsMeter = { frames: [], last: performance.now() };
    const tick = (time) => {
      if (state.fpsMeter !== meterState) return;
      meterState.frames.push(time - meterState.last); meterState.last = time;
      const total = meterState.frames.reduce((sum, value) => sum + value, 0);
      if (total >= 500) {
        meter.textContent = `${fmt(meterState.frames.length * 1000 / total, 0)} snímok/s · najhorší ${fmt(Math.max(...meterState.frames), 0)} ms · scéna ${fmt(state.renderTime ?? 0, 1)} ms`;
        meterState.frames = [];
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // At most one scene render per display frame for high-rate input (wheel, trackpad, simulation).
  function scheduleScene() {
    if (typeof requestAnimationFrame !== 'function') { renderScene(); return; }
    state.sceneFrame ||= requestAnimationFrame(() => { state.sceneFrame = 0; renderScene(); });
  }

  // Extreme positions only change with the model, not with zoom, selection or the drive position.
  function ghostSamples() {
    const cache = state.ghostCache;
    if (cache?.project === state.project && cache.profile === state.profile && cache.epoch === state.ghostEpoch) return cache.samples;
    const samples = K.projectPhases(state.project).map((phase) => K.solve(state.project, phase.motion, { profile: state.profile, collisions: false }));
    state.ghostCache = { project: state.project, profile: state.profile, epoch: state.ghostEpoch, samples };
    return samples;
  }

  function line(a, b, attrs = '') { return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" ${attrs}/>`; }
  function panelPoints(pose, width) {
    const dx = pose.b.x - pose.a.x, dy = pose.b.y - pose.a.y, l = Math.hypot(dx, dy) || 1;
    const ox = -dy * width / (2 * l), oy = dx * width / (2 * l);
    return [{ x: pose.a.x + ox, y: pose.a.y + oy }, { x: pose.b.x + ox, y: pose.b.y + oy }, { x: pose.b.x - ox, y: pose.b.y - oy }, { x: pose.a.x - ox, y: pose.a.y - oy }];
  }
  function panelPolygon(pose, width) {
    return panelPoints(pose, width).map((p) => `${p.x},${p.y}`).join(' ');
  }
  function node(id, key, point, label = '', active = false, scale = null) {
    const identity = I.nodeKey({ elementId: id, point: key }), kind = I.status(state.project, { elementId: id, point: key }, state.samples);
    active = state.selectedElementIds.includes(identity);
    scale ||= canvasScale();
    const r = 5 / scale;
    return `<g data-element="${escape(id)}" data-point="${key}" data-selection-key="${escape(identity)}" class="joint-node node-${kind}${active ? ' active' : ''}${state.hoveredTargetId === identity ? ' hovered' : ''}" role="button" tabindex="0" aria-pressed="${active}" aria-label="Uzol ${escape(label || `${state.project.elements.find((e) => e.id === id)?.name} · ${K.pointName(key, state.project.elements.find(e => e.id === id))}`)}, ${({ fixed: 'pevný', driven: 'poháňaný', free: 'voľný' })[kind]}">
      <circle cx="${point.x}" cy="${point.y}" r="${(window.innerWidth<=640 ? 22 : 11) / scale}" fill="transparent" stroke="none"/>
      <circle class="node-ring" cx="${point.x}" cy="${point.y}" r="${r}" fill="var(--paper)" stroke="var(--node-${kind})" stroke-width="1.7" vector-effect="non-scaling-stroke"/>
      <circle cx="${point.x}" cy="${point.y}" r="${1.7 / scale}" fill="var(--node-${kind})" stroke="none"/>
      ${kind === 'fixed' ? `<path d="M${point.x - r * 1.6} ${point.y + r * 1.8}h${r * 3.2}m${-r * 2.5} 0-${r} ${r}m${r * 2.6}-${r}-${r} ${r}" fill="none" stroke="var(--node-fixed)" stroke-width="1.2" vector-effect="non-scaling-stroke"/>` : ''}
      ${kind === 'driven' ? `<circle cx="${point.x}" cy="${point.y}" r="${r * 1.55}" fill="none" stroke="var(--node-driven)" stroke-width="1.2" stroke-dasharray="2 2" vector-effect="non-scaling-stroke"/>` : ''}
      ${label ? `<text x="${point.x + 11}" y="${point.y - 9}" class="node-label">${escape(label)}</text>` : ''}
    </g>`;
  }
  function dimHorizontal(x1, x2, y, from, label, color = '#9ba7b1') {
    return `<g class="dimension" fill="${color}" stroke="${color}" stroke-width="0.75"><path d="M${x1} ${from}V${y + 5}M${x2} ${from}V${y + 5}" stroke-dasharray="2 3"/><path d="M${x1} ${y}H${x2}"/><path d="m${x1} ${y} 5-2v4Zm${x2} ${y}-5-2v4Z" stroke="none"/><text x="${(x1 + x2) / 2}" y="${y - 7}" text-anchor="middle" stroke="none" class="dimension-label">${escape(label)}</text></g>`;
  }
  function groundGlyph(point) {
    return `<g fill="none" stroke="#81909c" stroke-width="1.5"><path d="M${point.x} ${point.y}v14m-12 0h24m-20 0-5 6m13-6-5 6m13-6-5 6"/></g>`;
  }

  function drawDoubleDrawer(e, pose, selected, bad) {
    const p = state.project.parameters;
    const stroke = (color) => bad ? '#df5e59' : selected ? 'var(--accent)' : color;
    const outline=K.templateOutlines(state.project,e,pose,state.motion)[0], points=outline?.map(v=>`${v.x},${v.y}`).join(' ') || '';
    if (e.role === 'frame') {
      const top = p.tableY - p.frameHeight;
      return `<polygon points="${points}" fill="#e7f3e8" stroke="${stroke('#6a9b76')}" stroke-width="1.4"/><text x="${p.frameLength / 2}" y="${top - 23}" text-anchor="middle" class="part-label">PEVNÝ KORPUS · ODHAD</text>`;
    }
    if (e.role === 'table') return `${pose.rects.map((rect) => `<rect x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}" fill="${bad ? '#f4c6c4' : '#e0e5e7'}" stroke="${stroke('#49535a')}" stroke-width="2"/>`).join('')}<text x="18" y="${p.tableY + p.tableThickness + 19}" class="part-label">PLATFORMA STOLA · FIX</text><text x="${(p.cutoutStart + p.cutoutEnd) / 2}" y="${p.tableY + p.tableThickness + 19}" text-anchor="middle" class="part-sublabel">Pevný výrez · odhad pre celý zdvih</text>`;
    if (e.role === 'stop') return `<polygon points="${points}" fill="#fff" stroke="${stroke('#49535a')}" stroke-width="2"/><text x="${pose.a.x - 10}" y="${pose.a.y - 12}" text-anchor="end" class="part-sublabel">Zadná opora</text>`;
    if (e.role === 'carrier') return `<polygon points="${points}" fill="#e5f0d7" fill-opacity=".65" stroke="${stroke('#95af51')}" stroke-width="1.5"/><text x="${(pose.a.x + pose.b.x) / 2}" y="${p.drawerY - 10}" text-anchor="middle" class="part-label">ZÁSUVKA · POHYBLIVÁ</text>`;
    if (['guide1', 'guide2', 'rearSlot'].includes(e.role)) {
      const width = e.role === 'rearSlot' ? 8 : p.slotWidth;
      const color = e.role === 'guide1' ? '#d2b62a' : '#d69d43', fill = e.role === 'guide1' ? '#f7e89a' : '#f8ddb0';
      return `<path d="${pathD(pose.path)}" fill="none" stroke="${bad ? '#f4c6c4' : fill}" stroke-width="${width + 9}" stroke-linecap="round" stroke-linejoin="round"/><path d="${pathD(pose.path)}" fill="none" stroke="${stroke(color)}" stroke-width="${width + 2}" stroke-linecap="round" stroke-linejoin="round"/><path d="${pathD(pose.path)}" fill="none" stroke="#fffdf5" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    if (e.role === 'rocker') return `${line(pose.a, pose.b, `stroke="${stroke('#7193c0')}" stroke-width="12" stroke-linecap="round"`)}${line(pose.a, pose.b, 'stroke="#e5edf6" stroke-width="7" stroke-linecap="round"')}<text x="${(pose.a.x + pose.b.x) / 2}" y="${(pose.a.y + pose.b.y) / 2 - 17}" text-anchor="middle" class="arm-label">Tuhé rameno · ${fmt(p.armLength)} mm</text>`;
    if (e.role === 'bracket') return `<polygon points="${points}" fill="#f7dcbb" fill-opacity=".35" stroke="${stroke('#d4a266')}" stroke-width="2.3" stroke-linejoin="round"/>`;
    if (e.role === 'front') return `<polygon points="${panelPolygon(pose, p.panelThickness)}" fill="#f5d8d0" stroke="${stroke('#c87567')}" stroke-width="1.8" stroke-linejoin="round"/><text x="${pose.b.x + 13}" y="${pose.b.y + 10}" class="angle-label">${fmt(pose.angle)}°</text>`;
    if (['pinA', 'pinB', 'rearPin'].includes(e.role)) {
      const r = e.role === 'rearPin' ? 4 : p.bearingRadius;
      return `<circle cx="${pose.a.x}" cy="${pose.a.y}" r="${r + 2}" fill="#fff" stroke="${stroke('#688ab3')}" stroke-width="1.6"/><circle cx="${pose.a.x}" cy="${pose.a.y}" r="${r * 0.55}" fill="#dde9f4" stroke="${stroke('#688ab3')}" stroke-width=".8"/>`;
    }
    return '';
  }

  function drawMotorHousing(e, pose, color) {
    const r = (e.type === 'motor' ? e.motorDiameter : e.width) / 2, center = e.type === 'motor' ? pose.a : pose.c || K.worldPoint(pose, e.localC || {x:e.length/2,y:0});
    const angle = e.type === 'motor' ? e.angle : pose.angle;
    const fins = [-.6,-.3,0,.3,.6].map(y => {
      const edge = Math.sqrt(1-y*y)*r;
      return `<path d="M${-edge-r*.15} ${y*r}h${r*.28}M${edge-r*.13} ${y*r}h${r*.28}"/>`;
    }).join('');
    return `<g data-motor-appearance="housing" transform="translate(${center.x} ${center.y}) rotate(${-angle})" stroke="${color}" stroke-width="${r*.055}" stroke-linejoin="round"><path d="M${-r*.62} ${r*.7}l${-r*.24} ${r*.48}h${r*.55}l${r*.14} ${-r*.27}M${r*.62} ${r*.7}l${r*.24} ${r*.48}h${-r*.55}l${-r*.14} ${-r*.27}" fill="var(--surface-subtle)"/><g stroke-width="${r*.09}">${fins}</g><circle r="${r}" fill="var(--surface-subtle)"/><circle r="${r*.8}" fill="var(--paper)"/><rect x="${-r*.45}" y="${-r*1.24}" width="${r*.9}" height="${r*.36}" rx="${r*.07}" fill="var(--surface-subtle)"/><path d="M${r*.08} ${-r*1.18}l${-r*.19} ${r*.16}h${r*.15}l${-r*.12} ${r*.1}" fill="none"/><circle r="${r*.18}" fill="var(--accent-soft)"/></g>`;
  }
  function drawElement(e, pose, result = state.result) {
    if (!pose || !e.visible) return '';
    const p = state.project.parameters, selected = memberSelected(e.id), bad = result.collisions.includes(e.id) || result.invalid.includes(e.id);
    const color = bad ? '#df5e59' : selected ? 'var(--accent)' : e.color || (e.type === 'slot' ? '#6a8a89' : '#798997');
    let body = '';
    if (K.isElastic(e)) {
      body = drawElastic(e, pose, bad ? '#df5e59' : selected ? '#d99735' : e.type.startsWith('spring-') ? '#6590b3' : '#a4779f', result);
    } else if (e.role === 'motor-housing') {
      body = drawMotorHousing(e, pose, color);
    } else if (e.type === 'motor') {
      const separate=state.project.elements.some(v=>v.id===e.parentId&&v.role==='motor-housing');
      body=`${separate?'':drawMotorHousing(e,pose,color)}${line(pose.a,pose.b,`stroke="${color}" stroke-width="3"`)}<circle cx="${pose.a.x}" cy="${pose.a.y}" r="${e.shaftDiameter/2}" fill="var(--paper)" stroke="${color}"/>`;
    } else if (e.type === 'cam') {
      body = `<path d="${pathD(pose.path)} Z" fill="#e6c7a4" fill-opacity=".7" stroke="${color}" stroke-width="1.8"/>${line(pose.a, pose.b, 'stroke="#8c7f6d" stroke-width="1" stroke-dasharray="4 4"')}<circle cx="${pose.a.x}" cy="${pose.a.y}" r="4" fill="var(--paper)" stroke="${color}"/><text x="${pose.a.x}" y="${Math.max(...pose.path.map((p) => p.y)) + 18}" text-anchor="middle" class="part-label">${escape(e.name)}</text>`;
    } else if (pose.outline?.length) {
      body = `<polygon points="${pose.outline.map((v) => `${v.x},${v.y}`).join(' ')}" fill="${e.type === 'ground' ? '#dfe7ec' : '#f2cc91'}" fill-opacity=".65" stroke="${color}" stroke-width="1.8"/>`;
      if (e.type === 'ground') body += groundGlyph(pose.a);
    } else if (e.primary && isDoubleDrawer()) {
      body = drawDoubleDrawer(e, pose, selected, bad);
    } else if (e.primary && state.project.kind === 'drawer' && e.type === 'ground') {
      const top = p.pivotY - p.frameHeight;
      body = `<path d="M${p.frameLength - 18} ${top - 12}H-12V${p.pivotY + 26}H${p.frameLength - 18}v-12H0V${top}H${p.frameLength - 18}Z" fill="url(#frame-hatch)" stroke="${bad ? '#df5e59' : selected ? '#d99735' : '#b1bdc7'}" stroke-width="1.4"/>
        <path d="M${p.frameLength - 18} ${top}v${p.frameHeight + 14}" fill="none" stroke="#b9c3cb" stroke-dasharray="4 5" stroke-width="1"/>
        <text x="${p.frameLength / 2 - 30}" y="${top - 24}" class="part-label">PEVNÝ KORPUS</text><text x="${p.frameLength / 2 - 30}" y="${top - 11}" class="part-sublabel">${fmt(p.frameLength)} mm</text>
        ${groundGlyph({ x: 35, y: p.pivotY + 27 })}${groundGlyph({ x: p.frameLength - 55, y: p.pivotY + 27 })}`;
    } else if (e.type === 'slot') {
      body = `<path d="${pathD(pose.path)}" fill="none" stroke="${bad ? '#f5c5c3' : '#d9e6e3'}" stroke-width="${(e.primary ? p.slotWidth : e.slotWidth) + 18}" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${pathD(pose.path)}" fill="none" stroke="${selected ? '#c8913b' : bad ? '#df5e59' : '#8fa9a4'}" stroke-width="${(e.primary ? p.slotWidth : e.slotWidth) + 2}" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${pathD(pose.path)}" fill="none" stroke="#f4f8f7" stroke-width="${e.primary ? p.slotWidth : e.slotWidth}" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="${pathD(pose.path)}" fill="none" stroke="#8ba39c" stroke-width="0.8" stroke-dasharray="3 4"/>`;
      if (e.primary && state.project.kind === 'drawer') {
        const mid = pose.path[Math.floor(pose.path.length * 0.57)];
        body += `<path class="scheme-annotation" d="M${mid.x} ${mid.y - 17}v-25h40" stroke="#98ada5" stroke-width="0.8" fill="none"/><text x="${mid.x + 45}" y="${mid.y - 39}" class="slot-label">Zakrivená kulisa</text>`;
      }
    } else if (e.type === 'rail') {
      if (e.primary && state.project.kind === 'drawer') {
        body = `<rect x="0" y="${p.pivotY - 9}" width="${p.frameLength}" height="18" rx="3" fill="#d9e0e5" stroke="#a5b3bf" stroke-width="1"/>
          <path d="M6 ${p.pivotY}H${p.frameLength - 6}" stroke="#b0bcc6" stroke-width="1.5"/>
          <rect x="${result.motion}" y="${p.pivotY - 6}" width="${p.frameLength + p.panelOffsetX}" height="12" rx="2" fill="${bad ? '#f4c6c4' : '#e7c18b'}" stroke="${color}" stroke-width="1.2"/>
          <path d="M${result.motion + 9} ${p.pivotY - 1}H${pose.b.x - 9}" stroke="#fcf1dc" stroke-width="1.4"/>
          ${[0.18, 0.48, 0.8].map((t) => `<circle cx="${result.motion + t * (p.frameLength + p.panelOffsetX)}" cy="${p.pivotY}" r="2.2" fill="#b58548"/>`).join('')}
          <text x="${result.motion + p.frameLength / 2 - 45}" y="${p.pivotY + 31}" class="part-label rail-label">LINEÁRNY VÝSUV</text>`;
      } else body = `${line(pose.a, pose.b, `stroke="#c4d0d9" stroke-width="${e.slotWidth}" stroke-linecap="round"`)}${line(pose.a, pose.b, `stroke="${color}" stroke-width="1" stroke-dasharray="5 4"`)}<polygon points="${K.carriageGeometry(e, pose).carriageOutline.map((p) => `${p.x},${p.y}`).join(' ')}" fill="#e7c18b" stroke="${selected ? 'var(--accent)' : '#b28649'}"/>`;
    } else if (e.type === 'panel') {
      const width = e.primary ? p.panelThickness : e.width;
      if (selected) body += `<polygon points="${panelPolygon(pose, width + 10)}" fill="#eab252" opacity="0.1"/>`;
      body += `<polygon points="${panelPolygon(pose, width)}" fill="${bad ? '#f5c6c1' : '#f2cc91'}" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"/>
        ${line(pose.a, pose.b, 'stroke="#fff8e9" stroke-width="1.2"')}`;
      if (e.primary) {
        const a = pose.a;
        const r = 35, end = K.along(a, r, pose.angle);
        body += `<path class="angle-annotation" d="M${a.x + r} ${a.y}A${r} ${r} 0 ${Math.abs(pose.angle) > 180 ? 1 : 0} ${pose.angle < 0 ? 1 : 0} ${end.x} ${end.y}" fill="none" stroke="#d5a24f" stroke-width="0.9"/>
          <text x="${a.x + 38}" y="${a.y - 14}" class="angle-label">${fmt(pose.angle)}°</text>
          <text x="${pose.b.x - 44}" y="${pose.b.y - 24}" class="panel-label">SKLÁPACIE ČELO</text>`;
      }
    } else if (e.type === 'node') {
      body = `<text x="${pose.a.x + 12}" y="${pose.a.y - 12}" class="part-label" pointer-events="none">${escape(e.name)}</text>`;
    } else if (e.type === 'bearing') {
      const r = e.primary ? (e.role === 'pivot' ? 5.5 : p.bearingRadius) : e.radius;
      body = `<circle cx="${pose.a.x}" cy="${pose.a.y}" r="${r + 2}" fill="#f8fbfa" stroke="${color}" stroke-width="1.5"/><circle cx="${pose.a.x}" cy="${pose.a.y}" r="${r * 0.58}" fill="#d9e4df" stroke="${color}" stroke-width="0.85"/><circle cx="${pose.a.x}" cy="${pose.a.y}" r="1.8" fill="#657d73"/>`;
    } else if (e.type === 'ground') {
      body = `${line(pose.a, pose.b, `stroke="${color}" stroke-width="${e.width}" stroke-linecap="round"`)}${groundGlyph(pose.a)}${groundGlyph(pose.b)}`;
    } else {
      const width = e.width;
      body = `${line(pose.a, pose.b, `stroke="${bad ? '#df5e59' : selected ? 'var(--accent)' : e.color || (e.role === 'coupler' ? '#6d9b95' : '#97a9b9')}" stroke-width="${width + 3}" stroke-linecap="round"`)}
        ${line(pose.a, pose.b, `stroke="${e.role === 'coupler' ? '#d4e6e0' : '#e3eaf0'}" stroke-width="${Math.max(2, width - 2)}" stroke-linecap="round"`)}
        <text x="${(pose.a.x + pose.b.x) / 2}" y="${(pose.a.y + pose.b.y) / 2 - 14}" text-anchor="middle" class="part-label">${escape(e.name)}</text>`;
    }
    return `<g data-element="${escape(e.id)}" data-selection-key="${escape(I.elementKey(e.id))}" class="mechanism-element ${e.type}${selected ? ' selected' : ''}${state.hoveredTargetId === I.elementKey(e.id) ? ' hovered' : ''}" role="button" tabindex="0" aria-pressed="${selected}" aria-label="${escape(e.name)}"><title>${escape(e.name)}</title>${body}</g>`;
  }

  function sceneMarkup(result = state.result, options = {}) {
    const svg = options.source || $('#mechanism-canvas'), p = state.project.parameters, elements = state.project.elements.filter(e=>options.exporting||viewElementVisible(e.id)), view = options.view || state.view;
    const diagnostics = options.diagnostics || W.constraints(state.project, result);
    const scale = options.scale || (options.source ? Math.hypot(svg.getScreenCTM()?.a ?? 1, svg.getScreenCTM()?.b ?? 0) || 1 : canvasScale(view));
    // Parts are separated so the canvas can replace only the parts that changed (see patchScene).
    const cut = '<!--§-->';
    let content = `<defs>
      <pattern id="small-grid" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="var(--canvas)"/><path d="M20 0H0V20" fill="none" stroke="var(--grid-small)" stroke-width="0.7"/></pattern>
      <pattern id="large-grid" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="url(#small-grid)"/><path d="M100 0H0V100" fill="none" stroke="var(--grid-large)" stroke-width="0.9"/></pattern>
      <pattern id="frame-hatch" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="#e4e9ed"/><path d="m-1 1 8 8m-1-9 8 8" stroke="#cbd4db" stroke-width="0.8"/></pattern>
      <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e3bc77" stop-opacity=".25"/><stop offset="1" stop-color="#e3bc77" stop-opacity="0"/></linearGradient>
    </defs>${cut}<rect x="${view.x}" y="${view.y}" width="${view.width}" height="${view.height}" fill="${state.grid ? 'url(#large-grid)' : 'var(--canvas)'}"/>`;
    content += cut;
    if (!options.exporting) content += magicImageSVG() + referenceSVG() + cut;
    if (!elements.length && !state.magic?.image) content += `<g class="empty-canvas"><circle cx="${view.x + view.width / 2}" cy="${view.y + view.height / 2 - 28}" r="24" fill="#eef1f4"/><path d="M${view.x + view.width / 2 - 8} ${view.y + view.height / 2 - 28}h16m-8-8v16" stroke="#9ca9b3" stroke-width="1.8"/><text x="${view.x + view.width / 2}" y="${view.y + view.height / 2 + 20}" text-anchor="middle" class="empty-canvas-title">Vytvorte svoj prvý mechanizmus</text><text x="${view.x + view.width / 2}" y="${view.y + view.height / 2 + 41}" text-anchor="middle" class="empty-canvas-text">Pretiahnite prvky z knižnice alebo vyberte šablónu</text></g>`;
    content += cut;
    if (state.ghosts && elements.length) {
      const samples = options.ghostSamples || ghostSamples();
      for (const sample of samples) {
        for (const e of elements.filter((e) => ['panel', 'link'].includes(e.type))) {
          const pose = sample.poses[e.id];
          if (!pose || !e.visible) continue;
          content += `<g opacity=".2" pointer-events="none">${line(pose.a, pose.b, 'stroke="#a9b4be" stroke-width="12" stroke-linecap="round"')}${line(pose.a, pose.b, 'stroke="#7f8c98" stroke-width="1" stroke-dasharray="5 4"')}</g>`;
        }
      }
    }
    const order = { ground: 0, slot: 1, cam: 2, rail: 2, link: 3, panel: 4, bearing: 5, node: 6, 'spring-compression': 4, 'spring-extension': 4, 'piston-push': 4, 'piston-pull': 4 };
    content += cut;
    for (const e of [...elements].sort((a, b) => order[a.type] - order[b.type])) content += drawElement(e, result.poses[e.id], result) + cut;
    for (const joint of state.project.connections.filter(j=>!j.rigidAssemblyId)) {
      const { a, b } = jointPoints(joint, result);
      if (!a || !b || [joint.a, joint.b].some((r) => !elements.find((e) => e.id === r.elementId)?.visible)) continue;
      const identity = I.jointKey(joint.id), active = state.selectedElementIds.includes(identity), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, radius = 15 / scale;
      const diagnostic = diagnostics.find((r) => r.id === joint.id), failed = diagnostic?.status === 'error';
      content += `<g data-joint="${escape(joint.id)}" data-selection-key="${escape(identity)}" class="canvas-joint${active ? ' active' : ''}${failed ? ' diagnostic-error' : ''}${state.hoveredTargetId === identity ? ' hovered' : ''}" role="button" tabindex="0" aria-pressed="${active}" aria-label="${escape(joint.name)} · ${escape(E.constraintNames[joint.type || 'revolute'])}${failed ? ` · odchýlka ${fmt(diagnostic.mm, 2)} mm, ${fmt(diagnostic.degrees, 2)} stupňov` : ''}">
        <title>${escape(joint.name)}</title>${line(a, b, 'class="joint-line" stroke="var(--green)" stroke-width="1.2" vector-effect="non-scaling-stroke" stroke-dasharray="4 3"')}
        <circle cx="${cx}" cy="${cy}" r="${radius}" class="joint-marker" fill="transparent" stroke="var(--secondary)" stroke-width="1" vector-effect="non-scaling-stroke"/>
        ${joint.type === 'prismatic' ? `<path d="M${cx - radius / 2} ${cy}h${radius}m-${radius * .8}-${radius * .2}-${radius * .2} ${radius * .2} ${radius * .2} ${radius * .2}m${radius * .6}-${radius * .4} ${radius * .2} ${radius * .2}-${radius * .2} ${radius * .2}" fill="none" stroke="var(--secondary)" stroke-width="1" vector-effect="non-scaling-stroke" pointer-events="none"/>` : ''}</g>`;
      content += cut;
      if (!options.exporting && failed && (state.diagnosticsOpen || active)) content += `<text data-editor-overlay="diagnostic" x="${cx + 19 / scale}" y="${cy - 19 / scale}" class="diagnostic-label" font-size="${11 / scale}" pointer-events="none">${fmt(diagnostic.mm, 2)} mm · ${fmt(diagnostic.degrees, 2)}°</text>`;
    }
    content += cut;
    if (state.trace && !state.isolatedIds) {
      for (const reference of traceReferences()) {
        const space = reference.space || state.traceSpace;
        const origin = space === 'carrier' ? result.referenceOrigin : null;
        const displayPoint = (point) => origin ? { x: point.x + origin.x, y: point.y + origin.y } : point;
        let segment = [];
        const paths = [];
        for (const sample of state.samples) {
          const point = K.tracePoint(sample, reference, space);
          if (!point || sample.blocked) { if (segment.length > 1) paths.push(segment); segment = []; }
          else segment.push(displayPoint(point));
        }
        if (segment.length > 1) paths.push(segment);
        content += paths.map((points) => `<path data-trace="${escape(reference.label)}" data-reference="${space}" d="${pathD(points)}" fill="none" stroke="${reference.color}" stroke-width="1.5" stroke-dasharray="3 4" opacity=".9" pointer-events="none"/>`).join('');
        const point = K.point(result, reference);
        if (point) content += `<g pointer-events="none"><circle cx="${point.x}" cy="${point.y}" r="9" fill="${reference.color}" fill-opacity=".1" stroke="${reference.color}" stroke-width="1"/><circle cx="${point.x}" cy="${point.y}" r="2.8" fill="${reference.color}"/><text x="${point.x + 13}" y="${point.y + 16}" class="trace-label" style="fill:${reference.color}">${isDoubleDrawer() ? escape(reference.label) : `Trajektória ${escape(reference.label)}`}</text></g>`;
      }
    }
    content += cut;
    if (state.dimensions && isDoubleDrawer()) {
      content += dimHorizontal(0, p.frameLength, p.tableY + 58, p.tableY + p.tableThickness, `≈ ${fmt(p.frameLength)} mm · korpus`);
      content += dimHorizontal(p.frameLength, p.frameLength + p.travelMax - p.travelMin, p.tableY + 95, p.tableY + p.tableThickness, `≈ ${fmt(p.travelMax - p.travelMin)} mm · zdvih`, '#b49768');
    }
    if (state.dimensions && state.project.kind === 'drawer') {
      content += dimHorizontal(0, p.frameLength, p.pivotY + 61, p.pivotY + 30, `${fmt(p.frameLength)} mm · korpus`);
      content += dimHorizontal(p.frameLength + p.travelMin, p.frameLength + p.travelMax, p.pivotY + 99, p.pivotY + 39, `Zdvih ${fmt(p.travelMax - p.travelMin)} mm`, '#b49769');
      const panel = result.poses['panel-1'];
      if (panel) content += `<text x="${(panel.a.x + panel.b.x) / 2 - 17}" y="${(panel.a.y + panel.b.y) / 2}" class="panel-dimension" text-anchor="end">${fmt(p.panelLength)} mm</text>`;
    }
    if (state.dimensions) for (const dimension of state.project.dimensions.filter((d) => d.visible&&(!d.a.elementId||viewElementVisible(d.a.elementId))&&(!d.b.elementId||viewElementVisible(d.b.elementId)))) {
      const a = E.resolvePoint(result, dimension.a), b = E.resolvePoint(result, dimension.b);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy) || 1, offset = dimension.offset;
      let p1 = { x: a.x - dy / length * offset, y: a.y + dx / length * offset }, p2 = { x: b.x - dy / length * offset, y: b.y + dx / length * offset };
      if (dimension.type === 'horizontal') { p1 = { x: a.x, y: Math.max(a.y, b.y) + offset }; p2 = { x: b.x, y: p1.y }; }
      if (dimension.type === 'vertical') { p1 = { x: Math.max(a.x, b.x) + offset, y: a.y }; p2 = { x: p1.x, y: b.y }; }
      content += `<g data-dimension="${escape(dimension.id)}" class="editable-dimension" stroke="#7288a4" stroke-width=".8" fill="#7288a4">${line(a, p1, 'stroke-dasharray="2 3"')}${line(b, p2, 'stroke-dasharray="2 3"')}${line(p1, p2)}<circle cx="${p1.x}" cy="${p1.y}" r="2"/><circle cx="${p2.x}" cy="${p2.y}" r="2"/><text x="${(p1.x + p2.x) / 2}" y="${(p1.y + p2.y) / 2 - 5}" text-anchor="middle" stroke="none" class="dimension-label">${escape(dimension.name ? `${dimension.name}: ` : '')}${fmt(E.dimensionValue(result, dimension), 2)} ${dimension.type === 'angle' ? '°' : 'mm'}${dimension.constraintId || dimension.control ? ' · riadiaca' : ''}</text></g>`;
    }
    content += cut;
    for (const e of elements) {
      if (!e.visible) continue;
      const pose = result.poses[e.id];
      content += cut;
      if (!pose) continue;
      for (const key of I.pointKeys(e)) {
        const label = state.tool === 'connect' ? `${typeCodes[e.type]} · ${K.pointName(key, e)}` : e.primary && state.project.kind === 'drawer' && e.id === 'panel-1' ? ({ a: 'B', b: 'C', c: 'A' })[key] : '';
        if (pose[key] && (options.exporting || portVisible(e,key))) content += node(e.id, key, pose[key], label, false, scale);
      }
    }
    content += cut;
    if (!options.exporting && state.mode === 'edit' && state.tool === 'select' && state.project.kind === 'drawer' && state.selected === 'slot-1' && ['bezier', 'spline'].includes(p.curveKind)) {
      const controls = state.project.controls || K.defaultControls(p);
      const positioned = controls.map((v) => ({ x: v.x + p.slotOffsetX, y: v.y + p.slotOffsetY }));
      content += `<path data-editor-overlay="path-controls" d="${pathD(positioned)}" fill="none" stroke="#94aaa3" stroke-width="0.9" stroke-dasharray="4 4"/>`;
      for (const [i, point] of positioned.entries()) content += `<g data-control="${i}" data-context-key="${I.controlKey('slot-1', i)}" data-selection-key="${I.controlKey('slot-1', i)}" tabindex="0" role="button" aria-label="Kulisa · riadiaci bod P${i}" class="control-handle"><rect x="${point.x - 5}" y="${point.y - 5}" width="10" height="10" rx="2" fill="#fff" stroke="#639082" stroke-width="1.5"/><text x="${point.x + 9}" y="${point.y - 9}" class="node-label">P${i}</text></g>`;
    }
    const selected = currentElement();
    if (!options.exporting && state.mode === 'edit' && state.tool === 'select' && selected?.type === 'slot' && !selected.primary) {
      const pose = result.poses[selected.id];
      const controls = selected.controls.map((v) => K.worldPoint({ ...pose, a: pose.controlOrigin || pose.a }, v));
      content += `<path data-editor-overlay="path-controls" d="${pathD(controls)}" fill="none" stroke="#a0b4a9" stroke-width="0.8" stroke-dasharray="4 4" pointer-events="none"/>`;
      controls.forEach((point, i) => {
        if (i % Math.ceil(controls.length / 64) && i !== controls.length - 1) return;
        if (selected.curveKind === 'arc' && i !== 0 && i !== controls.length - 1) return;
        const key = I.controlKey(selected.id, i), active = state.selectedElementIds.includes(key) || state.contextMenuState.isOpen && state.contextMenuState.targetId === key;
        content += `<g data-element-control="${i}" data-context-key="${key}" data-selection-key="${key}" tabindex="0" role="button" aria-label="${escape(selected.name)} · riadiaci bod P${i}" class="control-handle"><rect x="${point.x - 5}" y="${point.y - 5}" width="10" height="10" rx="2" fill="${active ? 'var(--accent-soft)' : '#fff'}" stroke="${active ? 'var(--accent)' : '#719a86'}" stroke-width="1.5"/><text x="${point.x + 8}" y="${point.y - 8}" class="node-label">P${i}</text></g>`;
      });
    }
    if (!options.exporting && state.mode === 'edit' && selected?.outline?.length && !selected.primary && selected.role !== 'motor-housing') {
      result.poses[selected.id].outline.forEach((point, i) => {
        const key = I.outlineKey(selected.id, i), active = state.selectedElementIds.includes(key) || state.contextMenuState.isOpen && state.contextMenuState.targetId === key;
        content += `<g data-outline-control="${i}" data-context-key="${key}" data-selection-key="${key}" tabindex="0" role="button" aria-label="${escape(selected.name)} · vrchol V${i}" class="control-handle"><rect x="${point.x - 5}" y="${point.y - 5}" width="10" height="10" fill="${active ? 'var(--accent-soft)' : '#fff'}" stroke="${active ? 'var(--accent)' : '#d39a41'}" stroke-width="1.5"/></g>`;
      });
    }
    if (!options.exporting && state.pendingJoint) {
      const pendingPose = result.poses[state.pendingJoint.elementId];
      const point = state.pendingJoint.point === 'curve' ? pendingPose?.path?.[Math.floor(pendingPose.path.length / 2)] : pendingPose?.[state.pendingJoint.point];
      if (point) content += `<circle data-editor-overlay="pending-joint" cx="${point.x}" cy="${point.y}" r="10" fill="#e9b458" fill-opacity=".16" stroke="#d79a36" stroke-width="1.5" stroke-dasharray="3 3" pointer-events="none"/>`;
    }
    if (!options.exporting && state.measure) {
      const { a, b } = state.measure;
      content += `<g data-editor-overlay="measurement">${line(a, b, 'stroke="#7288a4" stroke-width="1.3" stroke-dasharray="4 3"')}<circle cx="${a.x}" cy="${a.y}" r="3" fill="#7288a4"/><circle cx="${b.x}" cy="${b.y}" r="3" fill="#7288a4"/><text x="${(a.x + b.x) / 2}" y="${(a.y + b.y) / 2 - 9}" text-anchor="middle" class="measure-label">${fmt(K.distance(a, b), 2)} mm</text></g>`;
    }
    content += cut;
    if (!options.exporting) {
      if(state.dynamic?.contacts?.length)content+=`<g data-editor-overlay="contact-state" pointer-events="none">${state.dynamic.contacts.map(c=>`<text x="${c.b.x+12/scale}" y="${c.b.y-12/scale}" class="handle-value" font-size="${11/scale}">${c.detached?'Odtrhnutý valček':`Kontakt ${fmt(c.force,1)} N`} · vôľa ${fmt(c.gap,2)} mm</text>`).join('')}</g>`;
      content += manipulationSVG(scale) + freedomSVG(scale) + trialSVG(scale) + liveDimensionSVG(scale) + elasticStatusSVG(scale);
      content += smartSnapSVG(scale);
      content += magicDrawingSVG(scale);
      content += magicDetectionSVG(scale) + detectionEditSVG(scale);
    }
    content += cut + mainDimensionsSVG(result, scale);
    return options.chunks ? content.split(cut).filter(Boolean) : content.replaceAll(cut, '');
  }

  function renderScene() {
    const svg = $('#mechanism-canvas');
    if (!svg || !state.view || !state.result) return;
    if (state.magic && state.magic.step <= 2) { renderMagicReference(); return; }
    if (state.sceneFrame) { cancelAnimationFrame(state.sceneFrame); state.sceneFrame = 0; }
    const started = globalThis.performance?.now() ?? 0;
    const { view, result } = state, elements = state.project.elements;
    if (state.diagnosticFor?.result !== result || state.diagnosticFor.project !== state.project) { state.diagnosticRows = W.constraints(state.project, result); state.diagnosticFor = { result, project: state.project }; }
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
    svg.classList.toggle('pan-mode', state.tool === 'pan');
    svg.classList.toggle('connect-mode', state.tool === 'connect');
    svg.classList.toggle('magic-point-mode', state.tool === 'magic-draw');
    const chunks = sceneMarkup(result, { diagnostics: state.diagnosticRows, chunks: true }), content = chunks.join('');
    patchScene(svg, chunks);
    renderWorkflowTools();
    renderDiagnostics(); renderSnapChoices(); renderPlacementTools(); renderBindingTools(); renderModelChecks();
    updateSelectionSummary();
    latestSVG = content;
    $('#zoom-value').textContent = `${Math.round(state.baseView.width / view.width * 100)}%`;
    const status = $('#scene-status');
    status.className = `scene-status${result.blocked ? ' blocked' : ''}`;
    status.innerHTML = `${icon(result.blocked ? 'warning' : 'check', 13)}<span>${state.mode === 'edit' ? 'Úprava geometrie · bez projekcie väzieb' : result.blocked ? 'Skontrolujte mechanizmus' : !elements.length ? 'Prázdny editor' : state.collisions ? 'Pohyb bez kolízií' : 'Kolízna kontrola vypnutá'}</span>`;
    status.title = result.issues.join('\n');
    state.renderTime = (globalThis.performance?.now() ?? 0) - started;
  }

  function traceLabel() {
    const e = state.project.elements.find((e) => e.id === state.traceRef.elementId);
    if (isDoubleDrawer()) {
      const labels = { pinA: { a: 'A' }, pinB: { a: 'B' }, rearPin: { a: 'R' }, front: { a: 'P', b: 'Č', c: 'A' }, bracket: { a: 'B', b: 'P', c: 'A' } };
      if (labels[e?.role]?.[state.traceRef.point]) return labels[e.role][state.traceRef.point];
    }
    return e?.type === 'panel' ? ({ a: 'B', b: 'C', c: 'A' })[state.traceRef.point] : state.traceRef.point.toUpperCase();
  }

  function graphPoint(sample, index, min, max, key = 'angle') {
    return { x: 43 + index / (state.samples.length - 1) * 717, y: 66 - (sample[key] - min) / (max - min || 1) * 53 };
  }
  function renderGraph() {
    const graph = $('#motion-graph');
    if (!graph) return;
    if (state.graphMode === 'force') { renderForceGraph(); return; }
    const angles = state.samples.flatMap((s) => isDoubleDrawer() ? [s.angle, s.secondaryAngle] : [s.angle]);
    const min = Math.floor(Math.min(0, ...angles) / 15) * 15, max = Math.max(15, Math.ceil(Math.max(...angles) / 15) * 15);
    state.graphScale = { min, max };
    const points = state.samples.map((s, i) => graphPoint(s, i, min, max));
    const range = K.driveRange(state.project);
    let markup = `<defs><linearGradient id="motion-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="var(--accent)" stop-opacity=".18"/><stop offset="1" stop-color="var(--accent)" stop-opacity=".015"/></linearGradient></defs>`;
    if (isDoubleDrawer()) {
      const x = 43 + state.project.parameters.releaseTravel / (range.max - range.min) * 717;
      markup += `<rect x="43" y="13" width="${x - 43}" height="53" fill="var(--accent-pale)"/><line x1="${x}" x2="${x}" y1="13" y2="66" stroke="var(--secondary)" stroke-dasharray="3 4"/><text x="${x + 6}" y="20" class="graph-tick">Sklopené → posuv</text>`;
    }
    for (let i = 0; i <= 3; i++) {
      const y = 66 - i / 3 * 53;
      markup += `<line x1="43" x2="760" y1="${y}" y2="${y}" stroke="var(--border)" stroke-dasharray="${i === 0 ? '' : '3 4'}" stroke-width="1"/><text x="30" y="${y + 3}" text-anchor="end" class="graph-tick">${fmt(K.lerp(min, max, i / 3), 0)}°</text>`;
    }
    for (let i = 0; i <= 6; i++) {
      const x = 43 + i / 6 * 717;
      markup += `<text x="${x}" y="85" text-anchor="middle" class="graph-tick">${fmt(K.lerp(range.min, range.max, i / 6), 0)}</text>`;
    }
    markup += `<path d="${pathD(points)}L760,66L43,66Z" fill="url(#motion-fill)" stroke="none"/><path d="${pathD(points)}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>`;
    if (isDoubleDrawer()) markup += `<path data-series="arm" d="${pathD(state.samples.map((s, i) => graphPoint(s, i, min, max, 'secondaryAngle')))}" fill="none" stroke="#7193c0" stroke-width="1.7" stroke-linejoin="round"/>`;
    for (let i = 0; i < state.samples.length; i++) if (state.samples[i].blocked) markup += `<rect x="${points[i].x - 2.5}" y="13" width="6" height="53" fill="#e9766d" opacity=".08"/>`;
    markup += '<g id="graph-cursor"></g>';
    graph.innerHTML = markup;
    $('#graph-legend').innerHTML = isDoubleDrawer() ? 'Čelo <span class="legend-line arm-legend"></span> Rameno' : state.project.kind === 'drawer' ? 'Uhol čela' : state.project.kind === 'custom' ? 'Uhol výstupu' : 'Uhol výstupného člena';
    graph.setAttribute('aria-label', isDoubleDrawer() ? 'Graf uhla čela a modrého ramena voči posuvu zásuvky, s prechodom na spoločný posuv.' : 'Graf uhla výstupu voči polohe pohonu.');
    $('#graph-x-label').textContent = range.unit === 'mm' ? 'Posuv (mm)' : 'Uhol pohonu (°)';
    $('#graph-unit').textContent = 'Uhol (°)';
    $('#trace-name').textContent = isDoubleDrawer() && state.traceMode === 'bearings' ? 'Ložiská A + B' : `Bod ${traceLabel() || 'C'}`;
    $('[data-action="trace-pick"]').classList.toggle('is-off', !state.trace);
    updateGraphCursor();
  }

  function setWorkspaceView(analysis) {
    if (state.magic || state.gifExport) return;
    closeContextMenu(); state.playing = false; state.analysis = analysis;
    if (analysis) { state.sweepAnalysis = null; cancelDimensionPick(); }
    updateToolbar(); renderInspector(); updateMotion();
    requestAnimationFrame(() => renderScene());
  }

  function renderAnalysis() {
    const root = $('#analysis-workspace');
    if (!state.analysis || state.magic) return;
    if (!state.project.elements.length) {
      root.innerHTML = '<h2>Analýza mechanizmu</h2><p class="modal-description">Projekt je prázdny. V editore najskôr vložte členy, väzby a pohon.</p><button class="button button-secondary" data-action="view-editor">Späť do editora</button>';
      return;
    }
    const report = state.sweepAnalysis ||= W.analyzeSweep(state.project, state.samples), range = K.driveRange(state.project);
    const card = (title, value, detail) => `<div class="analysis-card"><span>${title}</span><strong>${value}</strong><small>${detail}</small></div>`;
    const peak = state.forceCurve?.length ? state.forceCurve.reduce((a, b) => Math.abs(a.handForce) > Math.abs(b.handForce) ? a : b) : null;
    const critical = report.blocks.map((b) => `<li><button data-action="analysis-pose" data-value="${b.start}">${fmt(b.start)}${b.end !== b.start ? ` – ${fmt(b.end)}` : ''} ${range.unit}</button><span>${escape(b.issue)}</span></li>`).join('');
    const jointErrors = report.joints.filter((j) => ['error', 'missing'].includes(j.status));
    const bounds = state.view || K.bounds(state.project, state.samples);
    root.innerHTML = `<div class="analysis-dashboard-heading"><div><h2>Analýza celého pohybu</h2><p>Simulované polohy v rozsahu ${fmt(range.min)} – ${fmt(range.max)} ${range.unit}, nie iba návrhová geometria. ${report.count} vzoriek; medzi nimi môže zostať nezachytená kolízia.</p></div><button class="button button-secondary" data-action="analysis-pose" data-value="${state.motion}">Aktuálna poloha v editore</button></div>
      <div class="analysis-cards">${card('Priechodnosť vzoriek', `${report.count - report.blocked} / ${report.count}`, report.blocked ? `${report.blocked} polôh hlási problém` : state.collisions ? 'Kontrola väzieb a kolízií' : 'Kolízna kontrola je vypnutá')}${card('Max. polohová chyba', `${fmt(report.positionResidual, 3)} mm`, 'Samostatná polohová tolerancia')}${card('Max. uhlová chyba', `${fmt(report.angularResidual, 3)}°`, 'Samostatná uhlová tolerancia')}${card('Voľné súradnice po pohone', report.freedom.free, 'Numerický odhad, nie dôkaz mobility')}</div>
      ${!report.hasDrive ? '<p class="analysis-warning" role="status">Chýba pohon. Zobrazené vzorky predstavujú statickú geometriu, nie riadený pohyb.</p>' : ''}
      <div class="analysis-preview-grid"><svg id="analysis-preview" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}" role="img" aria-label="Aktuálna poloha mechanizmu"${!state.labels ? ' class="labels-hidden"' : ''}>${sceneMarkup(state.result, { exporting: true, view: bounds, scale: 1 })}</svg><section><h3>Kritické polohy</h3>${critical ? `<ul class="analysis-critical">${critical}</ul>` : '<p>Vo vzorkovaných polohách nie je hlásené blokovanie.</p>'}${report.hints.length ? `<details><summary>Odporúčania pre model</summary><ul>${report.hints.map((hint) => `<li>${escape(hint)}</li>`).join('')}</ul></details>` : ''}<h3>Sily a moment pohonu</h3><p>${peak ? `Najväčšia absolútna vyrovnávacia ${range.unit === '°' ? 'hodnota momentu' : 'sila'}: ${fmt(peak.handForce, 2)} ${range.unit === '°' ? 'N·m' : 'N'} pri ${fmt(peak.motion)} ${range.unit}.` : 'Vypočítajte odhad vyrovnávacej sily alebo momentu v celom zdvihu.'} Ide o odhadový model s jedným vstupom, nie pevnostnú analýzu.</p><button class="button button-secondary" data-action="analyze-forces">Vypočítať sily / moment</button>${state.forceError ? `<p class="analysis-warning">${escape(state.forceError)}</p>` : ''}</section></div>
      <section><h3>Pohyby členov · rozsahy v celom zdvihu</h3><div class="analysis-table-scroll"><table class="analysis-results"><thead><tr><th>Člen / sledovaný bod</th><th>Rozsah X (mm)</th><th>Rozsah Y (mm)</th><th>Uhol (°)</th><th>Dĺžka dráhy (mm)</th></tr></thead><tbody>${report.bodies.map((e) => `<tr><td><button data-action="analysis-member" data-id="${escape(e.id)}">${escape(e.name)} · ${e.reference.toUpperCase()}</button>${!e.complete ? ' · neúplné' : ''}</td><td>${fmt(e.spanX, 2)}</td><td>${fmt(e.spanY, 2)}</td><td>${fmt(e.angleMin, 1)} → ${fmt(e.angleMax, 1)}</td><td>${fmt(e.path, 2)}</td></tr>`).join('')}</tbody></table></div></section>
      ${jointErrors.length ? `<section><h3>Nesplnené väzby v celom pohybe</h3><div class="analysis-table-scroll"><table class="analysis-results"><thead><tr><th>Väzba</th><th>Max. chyba (mm)</th><th>Max. chyba (°)</th><th>Skontrolovať polohu</th></tr></thead><tbody>${jointErrors.map((j) => `<tr><td>${escape(j.name)}</td><td>${fmt(j.mm, 3)}</td><td>${fmt(j.degrees, 3)}</td><td><button data-action="analysis-pose" data-value="${j.mm > K.TOLERANCE ? j.mmAt : j.degreesAt}">Zobraziť v editore</button></td></tr>`).join('')}</tbody></table></div></section>` : ''}`;
  }

  function updateGraphCursor() {
    const cursor = $('#graph-cursor');
    if (!cursor || !state.graphScale) return;
    if (state.graphMode === 'force') { updateForceCursor(); return; }
    const r = K.driveRange(state.project), t = (state.motion - r.min) / (r.max - r.min);
    const point = graphPoint(state.result, t * (state.samples.length - 1), state.graphScale.min, state.graphScale.max);
    point.y = K.clamp(point.y, 5, 70);
    cursor.innerHTML = `<line x1="${point.x}" x2="${point.x}" y1="7" y2="68" stroke="var(--accent)" stroke-width="1" stroke-dasharray="3 3"/><circle cx="${point.x}" cy="${point.y}" r="4.2" fill="var(--paper)" stroke="var(--accent)" stroke-width="2"/><rect x="${K.clamp(point.x - 23, 40, 714)}" y="${K.clamp(point.y - 22, 0, 44)}" width="46" height="16" rx="4" fill="var(--accent-pale)"/><text x="${K.clamp(point.x, 63, 737)}" y="${K.clamp(point.y - 11, 11, 55)}" text-anchor="middle" class="graph-value">${fmt(state.result.angle)}°</text>`;
  }

  function renderForceGraph() {
    const graph = $('#motion-graph'), range = K.driveRange(state.project);
    if (!state.forceContext && !prepareForces()) {
      graph.innerHTML = `<text x="400" y="42" text-anchor="middle" class="graph-tick">${escape(state.forceError)}</text>`;
      $('#graph-legend').textContent = 'Neurčený model síl'; return;
    }
    if(state.forceContext.bodyDynamics){graph.innerHTML='<text x="400" y="42" text-anchor="middle" class="graph-tick">Voľná silová zostava · pohyb a osové sily sledujte na plátne</text>';$('#graph-legend').textContent='Silový pohyb bez motora';return;}
    const values = state.forceCurve.map((s) => s.handForce), min = Math.min(0, ...values), max = Math.max(1, ...values);
    state.graphScale = { min, max };
    const points = state.forceCurve.map((sample, i) => ({ x: 43 + i / (values.length - 1) * 717, y: 66 - (sample.handForce - min) / (max - min) * 53 }));
    graph.innerHTML = `${[0, 1, 2, 3].map((i) => `<line x1="43" x2="760" y1="${66 - i / 3 * 53}" y2="${66 - i / 3 * 53}" stroke="#dce3e8" stroke-dasharray="3 4"/><text x="34" y="${69 - i / 3 * 53}" text-anchor="end" class="graph-tick">${fmt(K.lerp(min, max, i / 3), 1)}</text>`).join('')}<path d="${pathD(points)}" fill="none" stroke="#b9697c" stroke-width="2"/>${[0, 1, 2, 3, 4, 5, 6].map((i) => `<text x="${43 + i / 6 * 717}" y="85" text-anchor="middle" class="graph-tick">${fmt(K.lerp(range.min, range.max, i / 6), 0)}</text>`).join('')}<g id="graph-cursor"></g>`;
    $('#graph-legend').textContent = 'Vyrovnávacia sila · odhad';
    $('#graph-unit').textContent = range.unit === '°' ? 'Moment (N·m)' : 'Sila (N)';
    $('#graph-x-label').textContent = range.unit === '°' ? 'Uhol pohonu (°)' : 'Posuv (mm)';
    graph.setAttribute('aria-label', 'Odhadová vyrovnávacia sila alebo moment pohonu v celom rozsahu.');
    updateForceCursor();
  }

  function updateForceCursor() {
    const cursor = $('#graph-cursor');
    if (!cursor || !state.forceContext || state.forceContext.bodyDynamics) return;
    const range = K.driveRange(state.project), value = P.generalized(state.forceContext, state.motion);
    const x = 43 + (state.motion - range.min) / (range.max - range.min) * 717, y = K.clamp(66 - (value.handForce - state.graphScale.min) / (state.graphScale.max - state.graphScale.min) * 53, 5, 70);
    cursor.innerHTML = `<line x1="${x}" x2="${x}" y1="7" y2="68" stroke="#b9697c" stroke-dasharray="3 3"/><circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="#b9697c" stroke-width="2"/>`;
  }

  function renderPhases() {
    const range = K.driveRange(state.project), root = $('#phase-switcher'), phases = K.projectPhases(state.project), signature = JSON.stringify([range.unit, phases]);
    root.hidden = !state.project.elements.length;
    if (root._phaseSignature !== signature) {
      root.innerHTML = phases.map(({ motion, name }, i) => `<button data-action="phase" data-index="${i}" data-value="${motion}" class="phase-button"><span class="phase-number">${String(i + 1).padStart(2, '0')}</span><span><strong>${escape(name)}</strong><small>${fmt(motion)} ${range.unit}</small></span></button>`).join(''); root._phaseSignature = signature;
    }
    const playing = state.playing && state.project.motionPlan?.phases.length, activeIndex = playing ? WF.planAt(state.project, state.planTime || 0).index + 1 : null;
    for (const button of root.querySelectorAll('.phase-button')) button.classList.toggle('is-active', playing ? Number(button.dataset.index) === activeIndex : Math.abs(state.motion - Number(button.dataset.value)) < (range.max - range.min) / 30);
    if (playing && root._activePhase !== activeIndex) { const active = root.querySelector?.(`[data-index="${activeIndex}"]`); if (active && root.scrollWidth > root.clientWidth) root.scrollLeft = active.offsetLeft - root.clientWidth / 2 + active.offsetWidth / 2; root._activePhase = activeIndex; }
  }

  function updateMotion(updateProperties = true) {
    const range = K.driveRange(state.project), input = $('#motion-range'), exact = $('#motion-value');
    input.min = exact.min = range.min; input.max = exact.max = range.max;
    input.value = state.motion;
    input.style.setProperty('--range-progress', `${(state.motion - range.min) / (range.max - range.min) * 100}%`);
    if (document.activeElement !== exact) exact.value = state.motion.toFixed(1).replace(/\.0$/, '');
    $('#motion-label').textContent = range.label;
    input.setAttribute('aria-label', range.label);
    $('#motion-unit').textContent = range.unit;
    $('#motion-total').textContent = `${fmt(range.min)} – ${fmt(range.max)} ${range.unit}`;
    $('#range-min').textContent = range.unit === 'mm' ? 'Zatvorené' : '0°';
    $('#range-max').textContent = range.unit === 'mm' ? 'Otvorené' : '360°';
    const play = $('[data-action="play"]');
    play.disabled = !state.project.elements.length;
    play.innerHTML = icon(state.playing ? 'pause' : 'play', 17);
    play.setAttribute('aria-label', state.playing ? 'Pozastaviť simuláciu' : 'Spustiť simuláciu');
    play.title = `${state.playing ? 'Pozastaviť' : 'Spustiť'} simuláciu (medzerník)`;
    play.classList.toggle('playing', state.playing);
    document.body.classList.toggle('simulation-playing', !!state.playing);
    $('#solver-dot').classList.toggle('warning', state.result.blocked);
    const positionError = Math.max(state.result.positionResidual || 0, ...(state.diagnosticRows || []).map((r) => r.mm || 0));
    const angleError = Math.max(0, ...(state.diagnosticRows || []).map((r) => r.degrees || 0));
    const deviations = [positionError > K.TOLERANCE ? `${fmt(positionError, 2)} mm` : '', angleError > K.TOLERANCE ? `${fmt(angleError, 2)}°` : ''].filter(Boolean).join(' · ');
    $('#solver-status').textContent = state.mode === 'edit' ? 'Editácia · väzby sa nevynucujú' : state.result.blocked ? `Obmedzenie · ${deviations || 'pozri diagnostiku'}` : state.project.elements.length ? 'Väzby splnené' : 'Pripravený na nový model';
    $('#solver-meta').textContent = isDoubleDrawer() ? `${state.result.phaseLabel} · odhad` : `${state.project.connections.length} väzieb · ${state.project.kind === 'custom' ? 'vlastný model' : '1 stupeň voľnosti'}`;
    renderPhases(); updateGraphCursor();
    if (updateProperties) updateLiveProperties();
    const readout = $('#dynamics-readout');
    readout.hidden = state.project.simulation?.mode !== 'dynamic';
    if (!readout.hidden) {
      const dynamic = state.dynamic, tipSpeed = Math.max(0, ...Object.values(dynamic?.particles || {}).map((p) => Math.hypot(p.vx, p.vy) * 1000), ...Object.values(dynamic?.bodies||{}).map((b)=>Math.hypot(b.vx,b.vy)*1000));
      readout.textContent = `ODHADOVÁ DYNAMIKA · t = ${fmt(dynamic?.time || 0, 2)} s · v = ${fmt((dynamic?.velocity || 0) / (state.forceContext?.scale || .001), 2)} ${range.unit}/s${dynamic?.particles ? ` · ${dynamic?.bodies ? 'členy / čapy' : 'čapy'} ${fmt(tipSpeed, 2)} mm/s` : ''}${dynamic?.reason ? ` · ${dynamic.reason}` : ''}`;
    }
  }

  function updateLiveProperties() {
    const pose = selectedPose();
    if ($('#live-x')) $('#live-x').innerHTML = `${fmt(pose?.a.x)} <small>mm</small>`;
    if ($('#live-y')) $('#live-y').innerHTML = `${fmt(pose?.a.y)} <small>mm</small>`;
    if ($('#live-angle')) $('#live-angle').innerHTML = `${fmt(pose?.angle)}<small>°</small>`;
    const selectedForce=state.result.forces?.find(f=>f.id===state.selected);
    if($('#live-nominal-force'))$('#live-nominal-force').textContent=`${fmt(selectedForce?.nominalForce||0,2)} N`;
    if($('#live-damping-force'))$('#live-damping-force').textContent=`${fmt(selectedForce?.dampingForce||0,2)} N`;
    if ($('#live-force')) $('#live-force').textContent = `${fmt(state.result.forces?.find((f) => f.id === state.selected)?.magnitude || 0, 2)} N`;
    const warning = $('#inspector-warning');
    if (warning) { warning.hidden = !state.result.blocked; $('span', warning).textContent = state.result.issues[0] || ''; }
  }

  function setMotion(value, manual = true) {
    if(!manual&&state.playing)value=guardMotorMotion(value);
    if (state.trial) { const safe = WF.trial(state.project, state.motion, value, { profile: state.profile, collisions: state.collisions, samples: state.samples }); value = safe.motion; state.trialBlock = safe.blocked; }
    if (manual && state.mode === 'simulate' && !state.result.blocked && state.project.elements.some(K.isElastic)) {
      // Once a drag has found the blocked end, pushing further the same way stays there without another bisection.
      const limit = state.drag?.trialLimit, direction = Math.sign(value - state.motion);
      if (limit && direction === limit.direction && (value - limit.motion) * direction >= 0) value = limit.motion;
      else {
        const positions = P.elasticPositions(state.dynamic), safe = WF.trial(state.project, state.motion, value, { profile: state.profile, collisions: false, solve: (q) => K.solve(state.project, q, { maxPasses: state.drag ? DRAG_PASSES : undefined, profile: state.profile, collisions: false, elasticPositions: positions }) });
        if (state.drag) state.drag.trialLimit = safe.blocked ? { motion: safe.motion, direction } : null;
        value = safe.motion;
      }
    }
    if (manual) {
      if(!state.drag && state.dynamic?.bodies){state.forceContext=null;state.forceCurve=[];}
      state.playing = false; state.planTime = 0;
      state.dynamic = state.drag && state.dynamic?.particles ? { ...state.dynamic, motion: value, velocity: 0, time: 0, stopped: false, reason: '' } : null;
    }
    const range = K.driveRange(state.project);
    state.motion = K.clamp(value, range.min, range.max);
    state.result = solveCurrent();
    if (state.dynamic && state.forceContext) {
      state.result.forces = P.dynamicForces(state.forceContext, state.dynamic, state.result);
    }
    if (state.playing && state.result.blocked) {
      state.playing = false;
      toast(`Simulácia zastavená: ${state.result.issues[0]}`, true);
    }
    renderScene(); updateMotion();
  }

  function updateHeader() {
    $('#project-name').textContent = state.project.name;
    $('#scene-name').textContent = state.project.name;
    $('#project-assumptions').hidden = !isDoubleDrawer();
    $('#canvas-area').classList.toggle('double-drawer-project', isDoubleDrawer());
    $('#save-status').innerHTML = `<i class="${state.dirty ? 'unsaved' : ''}"></i>${state.magic ? 'Magic import · rozpracované' : state.storageFailed ? 'Uložte cez export' : state.dirty ? 'Ukladá sa…' : state.saved ? 'Uložené lokálne' : 'Lokálny projekt'}`;
    document.title = `${state.project.name} — Kinematika`;
  }

  function updateToolbar() {
    updateInspectorVisibility();
    updatePanelVisibility();
    if (!state.magic) try { localStorage.setItem(settingsKey, JSON.stringify(X.preferences(state))); } catch { /* Export includes settings if storage is unavailable. */ }
    for (const key of ['mainDimensions', 'grid', 'dimensions', 'ghosts', 'trace', 'labels', 'loop']) {
      const el = $(`[data-action="${key==='mainDimensions'?'main-dimensions':key}"]`);
      if (el) { el.classList.toggle('is-active', state[key]); el.setAttribute('aria-pressed', state[key]); }
    }
    for (const tool of ['select', 'pan', 'connect', 'measure']) $(`[data-action="tool-${tool}"]`).classList.toggle('is-active', state.tool === tool);
    $('[data-action="undo"]').disabled = !state.history.length || !!state.magic && !magicWorking();
    $('[data-action="redo"]').disabled = !state.future.length || !!state.magic && !magicWorking();
    $('[data-action="view-editor"]').classList.toggle('is-active', !state.analysis);
    $('[data-action="view-analysis"]').classList.toggle('is-active', state.analysis);
    $('[data-action="view-editor"]').setAttribute('aria-pressed', !state.analysis);
    $('[data-action="view-analysis"]').setAttribute('aria-pressed', state.analysis);
    $('.center-workspace').classList.toggle('analysis-mode', state.analysis);
    $('#canvas-area').hidden = state.analysis && !state.magic;
    $('#analysis-workspace').hidden = !state.analysis || !!state.magic;
    $('.stage-header').hidden = state.analysis && !state.magic;
    if (state.analysis) renderAnalysis();
    for (const mode of ['edit', 'simulate']) {
      const button = $(`[data-action="mode-${mode}"]`);
      button.classList.toggle('is-active', state.mode === mode);
      button.setAttribute('aria-pressed', state.mode === mode);
    }
    $('[data-action="make-editable"]').hidden = state.project.kind === 'custom';
    const diagnosticButton = $('[data-action="diagnostics"]');
    diagnosticButton.classList.toggle('is-active', state.diagnosticsOpen);
    diagnosticButton.setAttribute('aria-expanded', state.diagnosticsOpen);
    const snapButton = $('[data-action="smart-snap"]');
    snapButton.classList.toggle('is-active', state.smartSnap);
    snapButton.setAttribute('aria-pressed', state.smartSnap);
    const snapLabel = `Inteligentné prichytávanie: ${state.smartSnap ? 'zapnuté. Vypnúť.' : 'vypnuté. Zapnúť na vyžiadanie.'}`;
    snapButton.setAttribute('aria-label', snapLabel); snapButton.title = snapLabel;
    const gridSnap = $('[data-action="grid-snap"]');
    gridSnap.classList.toggle('is-active', state.snap);
    gridSnap.setAttribute('aria-pressed', state.snap);
    const gridLabel = state.snap ? 'Sieť 5 mm: zapnutá. Vypnúť pre voľný pohyb.' : 'Voľný pohyb bez siete: zapnutý. Zapnúť sieť 5 mm.';
    gridSnap.setAttribute('aria-label', gridLabel); gridSnap.title = `${gridLabel} Inteligentné prichytávanie je samostatné.`;
    const angleSnap = $('[data-action="angle-snap"]');
    if (angleSnap) { angleSnap.classList.toggle('is-active', !!state.angleSnap); angleSnap.setAttribute('aria-pressed', !!state.angleSnap); angleSnap.title = state.angleSnap ? 'Uhlové kroky 10°: zapnuté. Vypnúť.' : 'Uhlové kroky 10°: vypnuté. Zapnúť.'; angleSnap.setAttribute('aria-label', angleSnap.title); }
    $('#workspace').dataset.mode = state.mode;
    const instruction = $('#canvas-instruction');
    instruction.hidden = !['connect', 'measure'].includes(state.tool);
    instruction.textContent = state.tool === 'connect' ? state.pendingJoint ? 'Teraz kliknite na druhý uzlový bod. Esc zruší väzbu.' : 'Kliknite na dva uzlové body. Ložisko môžete spojiť aj s kulisou.' : state.dimensionPick?.a ? 'Kliknite na druhý bod kóty B. Esc zruší výber bez zmeny projektu.' : 'Kliknite na prvý bod kóty A a potom na B. Uzly sa prepoja s telesami; klik do pozadia použije voľný bod.';
    renderMagicImport();
  }
