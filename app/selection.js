/* Kinematika UI · Výber, úchyty, diagnostika a prichytávanie.
   Klasický skript bez IIFE: zdieľa najvyššiu úroveň s ostatnými app/*.js a app.js, ktorý sa načíta posledný
   a definuje stav a konštanty. Súbor obsahuje iba deklarácie funkcií, pri načítaní nič nespúšťa. */
'use strict';
  function selectElement(id, additive = state.multiSelect) {
    const e = state.project.elements.find((e) => e.id === id);
    selectTarget(e && ['node', 'bearing'].includes(e.type) ? I.nodeKey({ elementId: id, point: 'a' }) : id ? I.elementKey(id) : null, additive);
  }

  function defaultTraceReference() {
    const e = currentElement();
    return { elementId: e?.id || '', point: K.defaultTracePoint(e) };
  }

  function repairSelection() {
    state.selectedElementIds = I.validSelection(state.project, state.selectedElementIds);
    const t = I.target(state.project, state.selectedElementIds.at(-1));
    state.selected = t?.elementId || I.reference(t)?.elementId || null;
  }

  function selectTarget(key, additive = false, preserve = false) {
    const restoreFocus = $('#mechanism-canvas').contains(document.activeElement);
    const previous = state.selectedElementIds.join('|');
    if (!preserve || !state.selectedElementIds.includes(key)) state.selectedElementIds = I.select(state.selectedElementIds, key, additive);
    if (state.selectedElementIds.join('|') !== previous) state.editPivot = null;
    repairSelection(); state.inspectorTab = 'geometry';
    renderTree(); renderInspector(); renderScene(); updateToolbar();
    if (restoreFocus) $('#mechanism-canvas').focus({ preventScroll: true });
  }

  function memberSelected(id) {
    return state.selectedElementIds.some((key) => { const target = I.target(state.project, key); return target?.elementId === id || target?.type === 'joint' && [target.joint.a, target.joint.b].some((r) => I.root(state.project, state.project.elements.find((e) => e.id === r.elementId))?.id === I.root(state.project, state.project.elements.find((e) => e.id === id))?.id); });
  }

  function selectedNodeReferences(fallback = null) {
    const refs = state.selectedElementIds.map((key) => I.reference(I.target(state.project, key))).filter(Boolean);
    return [...new Map((refs.length ? refs : fallback ? [fallback] : []).map((r) => [I.nodeKey(r), r])).values()];
  }
  function contextNodeReferences(r) {
    return r && state.selectedElementIds.includes(I.nodeKey(r)) && state.selectedElementIds.every((key) => I.target(state.project, key)?.type === 'node') ? selectedNodeReferences(r) : r ? [r] : [];
  }
  function contextDeleteKeys(t) {
    return ['link', 'path'].includes(t?.type) && memberSelected(t.elementId) && state.selectedElementIds.every((key) => ['link', 'path'].includes(I.target(state.project, key)?.type)) ? [...state.selectedElementIds] : t?.type === 'node' ? [I.nodeKey(I.reference(t))] : t?.elementId ? [I.elementKey(t.elementId)] : [];
  }
  function curveEditKeys(id, key = I.elementKey(id)) {
    return [...new Set([...state.selectedElementIds.filter((value) => I.target(state.project, value)?.elementId !== id), key])];
  }

  function updateSelectionSummary() {
    const el = $('#selection-summary');
    el.hidden = !state.selectedElementIds.length;
    const target = I.target(state.project, state.selectedElementIds.at(-1)), editable = target?.element && !target.element.primary && state.mode === 'edit';
    const group=target?.element?.rigidAssemblyId,canBind=state.mode==='edit'&&I.rigidMembers(state.project,state.selectedElementIds).length>=2;
    setMarkup(el, `<button data-action="multi-select" aria-pressed="${!!state.multiSelect}">${state.multiSelect?'Ukončiť výber':'Vybrať viac'}</button>${canBind?'<button data-action="bind-rigid">Spojiť napevno</button>':''}${group?'<button data-action="unbind-rigid">Rozpojiť zostavu</button>':''}<button data-action="isolate-selection" aria-pressed="${!!state.isolatedIds}">${state.isolatedIds?'Zobraziť všetko':'Izolovať výber'}</button><span>${state.selectedElementIds.length} ${state.selectedElementIds.length === 1 ? 'vybraná položka' : 'vybraných položiek'}</span><button data-action="selection-settings"${editable ? '' : ' disabled'}>Spojenia / uloženie…</button><button data-action="properties-overview">Vlastnosti…</button><button class="mobile-selection-button" data-action="mobile-selection" aria-haspopup="dialog">${escape(target?.element?.name || 'Upraviť výber')}</button>`);
  }

  function jointPoints(joint, result = state.result) {
    const pa = result.poses[joint.a.elementId], pb = result.poses[joint.b.elementId];
    let a = pa?.[joint.a.point], b = pb?.[joint.b.point];
    const roller = state.project.elements.find((e) => e.id === (joint.a.point === 'curve' ? joint.b : joint.a).elementId);
    const nearest = (point, pose) => joint.type === 'cam-contact' ? K.contactTarget(point,pose,result.poses[roller.id],joint.surface,roller.type==='bearing'?(roller.primary?state.project.parameters.bearingRadius:roller.radius):0) : K.nearestOnPath(point, pose.path);
    if (joint.a.point === 'curve' && b && pa?.path) a = nearest(b, pa);
    if (joint.b.point === 'curve' && a && pb?.path) b = nearest(a, pb);
    return { a, b };
  }

  function manipulationSVG(scale) {
    const toolbar = $('#manipulation-tools'), ids = W.bodies(state.project, state.selectedElementIds), selected = ids.map((id) => state.project.elements.find((e) => e.id === id));
    const canTransform = selected.length && selected.every((e) => e.visible && !e.primary && !e.locked && !K.isElastic(e));
    const canThickness = selected.length === 1 && selected[0].visible && W.thickness(selected[0]);
    const enabled = state.mode === 'edit' && state.tool === 'select' && (canTransform || canThickness);
    toolbar.hidden = !enabled;
    if (!enabled) { toolbar.innerHTML = ''; return ''; }
    const single = selected.length === 1 ? selected[0] : null, canLength = single && ['link', 'panel', 'ground', 'rail'].includes(single.type) && !single.outline.length;
    toolbar.innerHTML = `${canThickness ? '<button data-action="edit-thickness">Hrúbka / priemer</button>' : ''}${canTransform ? `<button data-action="edit-numbers">${icon('ruler', 13)}X / Y</button><button data-action="edit-rotation">${icon('reset', 13)}Uhol</button><button data-action="edit-pivot">${icon('target', 13)}Bod otáčania</button>${canLength ? '<button data-action="edit-length">Dĺžka</button>' : ''}` : ''}`;
    if (window.innerWidth <= 640 && !state.mobileHandles) return '';
    if (single && (single.type === 'motor' || single.role === 'motor-housing')) {
      const pose = state.result.poses[single.id], base = single.type === 'motor' ? pose.a : pose.c, diameter = W.thickness(single).value;
      const at = K.along(base, diameter*.65+34/scale, pose.angle-90), knob = 5/scale;
      return `<g data-editor-overlay="manipulation" data-motor-controls="compact">${line(base,at,'stroke="var(--secondary)" stroke-dasharray="3 3" vector-effect="non-scaling-stroke" pointer-events="none"')}<g data-edit-handle="thickness" class="edit-handle thickness" role="button" tabindex="0" aria-label="Priemer krytu motora. Potiahnite alebo zadajte presnú hodnotu."><rect x="${at.x-knob}" y="${at.y-knob}" width="${2*knob}" height="${2*knob}" rx="${2/scale}"/></g><text x="${at.x+10/scale}" y="${at.y+4/scale}" class="handle-value" font-size="${11/scale}" pointer-events="none">Ø ${fmt(diameter,1)} mm</text></g>`;
    }
    const origin = state.editPivot || W.pivot(state.project, state.selectedElementIds, state.result), size = 42 / scale, radius = 66 / scale, knob = 6 / scale;
    const occupied = state.project.elements.filter(e => e.visible).flatMap(e => {
      const pose = state.result.poses[e.id];
      if (!pose) return [];
      const controls = e.type === 'slot' && e.id === state.selected && !e.primary ? I.controlPoints(state.project, e).map(p => K.worldPoint({a:pose.controlOrigin || pose.a,angle:pose.angle},p)) : [];
      return [...I.pointKeys(e).map(key => pose[key]), ...controls, ...(pose.path || []), ...(pose.outline || [])].filter(Boolean);
    });
    const reserve = (at, direction) => { const point = W.clearHandle(at, direction, occupied, scale); occupied.push(point); return point; };
    const handle = (kind, at, label, shape = 'circle', extra = '') => `<g data-edit-handle="${kind}" ${extra} class="edit-handle ${kind}" role="button" tabindex="0" aria-label="${escape(label)}. ${kind === 'pivot' ? 'Kliknite na výber uzla alebo zadanie X / Y.' : 'Potiahnite alebo kliknite na presné číselné zadanie.'}"><title>${escape(label)}</title>${shape === 'circle' ? `<circle cx="${at.x}" cy="${at.y}" r="${knob}"/>` : `<rect x="${at.x - knob}" y="${at.y - knob}" width="${2 * knob}" height="${2 * knob}" rx="${2 / scale}"/>`}</g>`;
    let content = `<g data-editor-overlay="manipulation"><g class="edit-axes" pointer-events="none">${line(origin, { x: origin.x + size, y: origin.y }, 'class="edit-axis-x" vector-effect="non-scaling-stroke"')}${line(origin, { x: origin.x, y: origin.y + size }, 'class="edit-axis-y" vector-effect="non-scaling-stroke"')}<circle cx="${origin.x}" cy="${origin.y}" r="${radius}" class="edit-rotation-ring" vector-effect="non-scaling-stroke"/><text x="${origin.x + size + 10 / scale}" y="${origin.y + 4 / scale}" font-size="${11 / scale}">X</text><text x="${origin.x + 10 / scale}" y="${origin.y + size}" font-size="${11 / scale}">Y</text></g>`;
    if (!canTransform) content = '<g data-editor-overlay="manipulation">';
    if (canTransform) {
    const moveX = reserve({ x: origin.x + size, y: origin.y }, {x:1,y:0}), moveY = reserve({ x: origin.x, y: origin.y + size }, {x:0,y:1});
    content += handle('move-x', moveX, 'Posun vybraných členov v osi X');
    content += handle('move-y', moveY, 'Posun vybraných členov v osi Y');
    const rotateAt = reserve({ x: origin.x + radius, y: origin.y }, {x:1,y:0});
    content += line(origin, rotateAt, 'class="edit-rotation-ring" vector-effect="non-scaling-stroke" pointer-events="none"');
    content += handle('rotate', rotateAt, 'Otočenie vybraných členov okolo zvoleného bodu');
    const pivotKnob = reserve({ x: origin.x - 18 / scale, y: origin.y - 18 / scale }, {x:-1,y:-1});
    content += line(origin, pivotKnob, 'stroke="var(--secondary)" stroke-dasharray="3 3" vector-effect="non-scaling-stroke" pointer-events="none"');
    content += handle('pivot', pivotKnob, 'Zvoliť bod otáčania', 'rect');
    if (canLength) {
      const pose = state.result.poses[single.id], target = I.target(state.project, state.selectedElementIds.at(-1));
      const fixedEnd = target?.point === 'b' || single.drive && single.drivePivot === 'b' ? 'b' : 'a', end = pose[fixedEnd === 'a' ? 'b' : 'a'];
      const offset = K.rotate({ x: 0, y: -17 / scale }, pose.angle), at = reserve({ x: end.x + offset.x, y: end.y + offset.y }, offset);
      content += line(end, at, 'stroke="var(--secondary)" vector-effect="non-scaling-stroke" pointer-events="none"');
      content += handle('length', at, 'Upraviť dĺžku člena', 'rect', `data-fixed-end="${fixedEnd}"`) + `<text x="${at.x+10/scale}" y="${at.y+4/scale}" class="handle-value" font-size="${11/scale}" pointer-events="none">L ${fmt(single.length,1)} mm</text>`;
    }
    }
    if (canThickness) {
      const pose = state.result.poses[single.id], size = W.thickness(single), base = ['bearing', 'node', 'cam', 'motor'].includes(single.type) ? pose.a : { x: (pose.a.x + pose.b.x)/2, y: (pose.a.y + pose.b.y)/2 };
      const at = reserve(K.along(base, size.value / 2 + 12 / scale, pose.angle - 90), K.along({x:0,y:0}, 1, pose.angle - 90));
      content += line(base, at, 'stroke="var(--secondary)" vector-effect="non-scaling-stroke" pointer-events="none"');
      content += handle('thickness', at, `${size.label} člena`, 'rect') + `<text x="${at.x+10/scale}" y="${at.y+4/scale}" class="handle-value" font-size="${11/scale}" pointer-events="none">${escape(size.label)} ${fmt(size.value,1)} mm</text>`;
    }
    return `${content}</g>`;
  }

  function transformModal(kind = 'move', fixedEnd = null) {
    if (state.mode !== 'edit') { toast('Priame úchyty sú dostupné v režime Úprava geometrie.', true); return; }
    const ids = W.bodies(state.project, state.selectedElementIds), e = ids.length === 1 ? state.project.elements.find((e) => e.id === ids[0]) : null;
    if (!ids.length) return;
    const origin = state.editPivot || W.pivot(state.project, state.selectedElementIds, state.result);
    const number = (name, label, value, min = -5000, max = 5000) => quantityInput(name, label, value, name === 'angle' ? '°' : 'mm', min, max);
    let fields = '';
    if (['move', 'move-x', 'move-y'].includes(kind)) {
      if (kind !== 'move-y') fields += number('dx', 'Posun X (mm)', 0);
      if (kind !== 'move-x') fields += number('dy', 'Posun Y (mm, kladný nadol)', 0);
    }
    if (kind === 'rotate') fields += number('angle', 'Relatívne otočenie (°, kladné proti hodinovým ručičkám)', 0, -360, 360);
    if (['rotate', 'pivot'].includes(kind)) {
      fields += `<label class="property-field"><span>Bod otáčania podľa uzla</span><select class="property-select" name="pivot-reference"><option value="">Vlastné X / Y</option>${state.project.elements.flatMap((e) => I.pointKeys(e).filter((key) => state.result.poses[e.id]?.[key]).map((key) => `<option value="${escape(`${e.id}|${key}`)}">${escape(e.name)} · ${escape(K.pointName(key, e))}</option>`)).join('')}</select></label>`;
      fields += number('px', 'Bod otáčania X (mm)', origin.x) + number('py', 'Bod otáčania Y (mm)', origin.y);
    }
    if (kind === 'thickness') { if (!e) return; const size = W.thickness(e); fields += number('thickness', `${size.label} (mm)`, size.value, .1, 500); }
    if (kind === 'length') {
      if (!e) return;
      const end = fixedEnd || W.preferredEnd(state.project, e.id);
      fields += number('length', 'Dĺžka A–B (mm)', e.length, .1, 5000);
      fields += `<label class="property-field"><span>Zachovať bod</span><select class="property-select" name="fixed-end"><option value="a"${end === 'a' ? ' selected' : ''}>A</option><option value="b"${end === 'b' ? ' selected' : ''}>B</option><option value="center"${end === 'center' ? ' selected' : ''}>Stred A–B</option></select></label>`;
    }
    modal(kind === 'pivot' ? 'Bod otáčania' : kind === 'length' ? 'Presná dĺžka člena' : 'Presná úprava na plátne', `<p class="modal-description">Úprava geometrie ${ids.length === 1 ? 'celého člena' : 'vybranej skupiny'}. Väzby sa pri návrhu nevynucujú. Potvrdená úprava tvorí jeden krok Späť. Výrazy: <code>300/2</code>, <code>12,5 cm</code>, <code>(20+5)*2 mm</code>; uhly v ° alebo rad.</p><form id="transform-form" data-kind="${kind}" data-keys="${escape(JSON.stringify(state.selectedElementIds))}"><div class="settings-fields">${fields}</div><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zrušiť</button><button type="submit" class="button button-dark">Použiť</button></div></form>`);
  }

  function submitTransform(form, data) {
    const kind = form.dataset.kind, keys = JSON.parse(form.dataset.keys), origin = ['pivot', 'rotate'].includes(kind) ? { x: quantityValue(data, 'px'), y: quantityValue(data, 'py') } : null;
    if (kind === 'pivot') {
      if (![origin.x, origin.y].every(Number.isFinite) || Math.max(Math.abs(origin.x), Math.abs(origin.y)) > 5000) throw new Error('Bod otáčania musí mať platné X / Y v rozsahu ±5000 mm.');
      state.editPivot = origin; renderScene();
    } else {
      const ids = W.bodies(state.project, keys);
      const next = kind === 'thickness' ? W.setThickness(state.project, ids[0], quantityValue(data, 'thickness', 'mm', .1, 500)) : kind === 'length' ? W.setLength(state.project, ids[0], quantityValue(data, 'length', 'mm', .1), String(data.get('fixed-end')), state.result)
        : W.transform(state.project, keys, { dx: quantityValue(data, 'dx', 'mm', -5000, 5000, 0), dy: quantityValue(data, 'dy', 'mm', -5000, 5000, 0), angle: quantityValue(data, 'angle', '°', -360, 360, 0), pivot: kind === 'rotate' ? origin : undefined }, state.result);
      if (JSON.stringify(next) !== JSON.stringify(state.project)) editCanvas(next, 'Geometria bola upravená.');
      if (kind === 'rotate') state.editPivot = origin;
    }
    $('#modal').close(); renderScene();
  }

  function renderDiagnostics() {
    const panel = $('#diagnostics-panel');
    panel.hidden = !state.diagnosticsOpen;
    if (panel.hidden) return;
    const now = Date.now(), cache = state.diagnosticAnalysis;
    if (!cache || !(state.playing || state.drag) || now - cache.time > 500) state.diagnosticAnalysis = { ...W.diagnose(state.project, state.result), time: now };
    const analysis = state.diagnosticAnalysis, rows = state.diagnosticRows, repairs=WF.repairSuggestions(state.project,state.result);
    panel.innerHTML = `<div class="diagnostics-heading"><strong>Diagnostika zobrazenej polohy</strong><span>Tolerancia ${fmt(K.TOLERANCE, 2)} mm / ${fmt(K.TOLERANCE, 2)}° · ${state.mode === 'edit' ? 'návrh bez vynútenia' : 'simulácia'}</span>${ib('close', 'diagnostics', 'Zavrieť diagnostiku')}</div><div class="diagnostics-content"><div class="diagnostic-hints">${repairs.map(f=>`<button class="model-check repair-button" data-action="repair-model" data-key="${escape(f.key)}" data-kind="${f.action}">${escape(f.label)}</button>`).join('')}${(analysis.checks || []).map((check) => `<button class="model-check" data-action="check-model" data-key="${escape(check.key)}" data-kind="${check.action}"${check.otherKey ? ` data-other="${escape(check.otherKey)}"` : ''}>${escape(check.message)}</button>`).join('')}${[...analysis.hints, ...state.result.issues].map((hint) => `<p>${escape(hint)}</p>`).join('') || '<p>V tejto polohe nie je zistený konflikt väzieb.</p>'}</div>${rows.length ? `<div class="comparison-scroll"><table class="diagnostic-table"><thead><tr><th>Väzba</th><th>Poloha (mm)</th><th>Uhol (°)</th><th>Stav</th></tr></thead><tbody>${rows.map((r) => `<tr class="${r.status === 'error' || r.status === 'missing' ? 'diagnostic-error' : ''}"><td><button data-action="select-diagnostic" data-key="${escape(r.key)}">${escape(r.name)}</button></td><td>${fmt(r.mm, 3)}</td><td>${fmt(r.degrees, 3)}</td><td>${({ ok: 'Splnená', error: 'Odchýlka', missing: 'Chýbajúci uzol', prescribed: 'Parametrická' })[r.status]}</td></tr>`).join('')}</tbody></table></div>` : '<p class="section-description">Model nemá samostatné kĺbové väzby.</p>'}</div>`;
  }

  function selectionReference() {
    const target = I.target(state.project, state.selectedElementIds.at(-1));
    const reference = I.reference(target);
    if (reference) return reference;
    const e = target?.element;
    return e ? { elementId: e.id, point: K.defaultTracePoint(e) } : null;
  }

  function renderBindingTools() {
    const el = $('#binding-tools'), target = I.target(state.project, state.selectedElementIds.at(-1)), e = target?.element;
    if (!el) return; el.hidden = true;
    if (!e || e.primary || state.mode !== 'edit') { setMarkup(el, ''); return; }
    const r = selectionReference(), linked = state.project.connections.filter((j) => [j.a, j.b].some((r) => r.elementId === e.id)).length;
    const fixed = target.type === 'node' ? I.fixed(state.project, r) : e.locked || e.type === 'ground';
    setMarkup(el, `<strong>${escape(e.name)}${target.type === 'node' ? ` · ${r.point.toUpperCase()}` : ''}</strong><div><span>Spojenia · bod môžete potiahnuť na iný bod</span><button data-action="selection-connect">Spojiť bod · ${linked}</button><span>Uloženie</span>${e.type === 'rail' ? `<button data-action="selection-rail" data-moving="false" aria-pressed="${!e.movingRail}">Pevné vedenie · hýbe sa vozík</button><button data-action="selection-rail" data-moving="true" aria-pressed="${!!e.movingRail}">Pevný vozík · hýbe sa vedenie</button>` : `<button data-action="selection-support"${K.isElastic(e) ? ' disabled' : ''}>${fixed ? 'Uvoľniť' : 'Ukotviť'} ${target.type === 'node' ? 'bod k rámu' : 'teleso k rámu'}</button>`}<span>Pohon</span><button data-action="selection-motor"${['ground', 'slot'].includes(e.type) || e.parentId && e.type !== 'motor' || K.isElastic(e) ? ' disabled' : ''}>${e.drive ? 'Upraviť pohon' : 'Priradiť pohon'}</button></div>`);

  }

  function beginSelectedConnection() {
    const r = selectionReference(); if (!r) return;
    setTool('connect'); state.pendingJoint = r; updateToolbar(); renderScene();
  }

  function renderModelChecks() {
    const el = $('#model-checks'); if (!el) return;
    el.hidden = !state.project.elements.length || !!state.magic || !!state.insertingType || !!state.draggedPaletteType;
    if (el.hidden) return;
    const now = Date.now(), cached = state.quickChecks;
    if (!cached || cached.result !== state.result && (!(state.drag || state.playing) || now - cached.time > 500)) state.quickChecks = { result: state.result, time: now, analysis: W.diagnose(state.project, state.result) };
    const checks = state.quickChecks.analysis.checks || [];
    const open = el.querySelector?.('details')?.open;
    setMarkup(el, `<details${open ? ' open' : ''}><summary>Overiť model · ${checks.length ? `${checks.length} odporúčaní` : 'bez zistených problémov'}</summary><div>${checks.map((check) => `<button class="model-check" data-action="check-model" data-key="${escape(check.key)}" data-kind="${check.action}"${check.otherKey ? ` data-other="${escape(check.otherKey)}"` : ''}>${escape(check.message)}</button>`).join('') || '<p>V zobrazenej polohe nie je zistený problém väzieb.</p>'}</div></details>`);
  }

  function focusModelCheck(el) {
    const target = I.target(state.project, el.dataset.key); if (!target) return;
    if (state.view) {
      const pose = state.result.poses[target.elementId];
      const points = target.type === 'joint' ? [K.point(state.result, target.joint.a), K.point(state.result, target.joint.b)].filter(Boolean) : [pose?.a, pose?.b].filter(Boolean);
      if (points.length) { const x = points.reduce((sum, p) => sum + p.x, 0) / points.length, y = points.reduce((sum, p) => sum + p.y, 0) / points.length; state.view = { ...state.view, x: x - state.view.width / 2, y: y - state.view.height / 2 }; }
    }
    selectTarget(el.dataset.key);
    if (target.type === 'joint') for (const r of [target.joint.a, target.joint.b]) selectTarget(I.elementKey(r.elementId), true);
    if (el.dataset.other && I.target(state.project, el.dataset.other)) selectTarget(el.dataset.other, true);
    if(el.dataset.kind==='forces')actions['force-motion']();
    else if (el.dataset.kind === 'motor') { const r = selectionReference(); if (r) canvasDialog('motor', r); }
    else if (el.dataset.kind === 'connect') beginSelectedConnection();
    else { setInspectorOpen(true); state.diagnosticsOpen = true; renderScene(); }
  }

  function toggleSmartSnap() {
    if (state.drag) onPointerUp({ pointerId: state.drag.pointerId, cancelled: true });
    state.smartSnap = !state.smartSnap; state.snapPreview = null; dismissSnapChoices();
    renderScene(); updateToolbar();
    toast(state.smartSnap ? 'Inteligentné prichytávanie je zapnuté. Väzba vznikne iba po ďalšom potvrdení.' : 'Inteligentné prichytávanie je vypnuté.');
  }

  function toggleGridSnap() {
    if (state.drag) onPointerUp({ pointerId: state.drag.pointerId, cancelled: true });
    state.snap = !state.snap; state.snapPreview = null;
    renderScene(); updateToolbar();
    toast(state.snap ? 'Prichytávanie na sieť 5 mm je zapnuté.' : 'Sieť je vypnutá. Pohyb nemá 5 mm kroky; inteligentné prichytávanie je samostatné.');
  }

  function toggleAngleSnap() {
    if (state.drag) onPointerUp({ pointerId: state.drag.pointerId, cancelled: true });
    state.angleSnap = !state.angleSnap; renderScene(); updateToolbar();
    toast(state.angleSnap ? 'Uhlové kroky 10° sú zapnuté.' : 'Uhlové kroky sú vypnuté. Otáčanie je plynulé.');
  }

  function snapPaths() {
    if (!state.trace) return [];
    const paths = [];
    for (const reference of traceReferences()) {
      const space = reference.space || state.traceSpace, origin = space === 'carrier' ? state.result.referenceOrigin : null;
      let points = [];
      const flush = () => { if (points.length > 1) paths.push({ id: `${reference.elementId}:${reference.point}:${paths.length}`, points }); points = []; };
      for (const sample of state.samples) {
        const point = K.tracePoint(sample, reference, space);
        if (!point || sample.blocked) flush();
        else points.push(origin ? { x: point.x + origin.x, y: point.y + origin.y } : point);
      }
      flush();
    }
    return paths;
  }

  function snapOptions() {
    const matrix = $('#mechanism-canvas').getScreenCTM(), scale = Math.hypot(matrix?.a || 1, matrix?.b || 0);
    return { enabled: state.smartSnap && !state.snapSuppressed, tolerance: 8 / scale, paths: snapPaths(),allowedElements:state.isolatedIds||undefined };
  }

  function placementAt(type, point) {
    const template = K.makeElement(type), mount = I.pointKeys(template).includes(state.placementMount) ? state.placementMount : type === 'rail' ? 'c' : 'a';
    const e = W.placement(state.project, type, point, mount), preview = W.findPlacementSnap(state.project, e, { ...snapOptions(), cursor: point, sourcePoint: mount, previous: state.placementPreview?.preview });
    if (preview) { e.x += preview.delta.x; e.y += preview.delta.y; }
    else if (state.snap && !state.snapSuppressed) { e.x += Math.round(point.x / 5) * 5 - point.x; e.y += Math.round(point.y / 5) * 5 - point.y; }
    state.placementPreview = { element: e, preview, mount, point: { ...point } };
    return { element: e, preview };
  }

  function cyclePlacementMount(backward = false) {
    const type = state.draggedPaletteType || state.insertingType || state.magic?.placementType;
    if (!type) return;
    const keys = I.pointKeys(K.makeElement(type)), current = state.placementMount || (type === 'rail' ? 'c' : 'a');
    state.placementMount = keys[(keys.indexOf(current) + (backward ? keys.length - 1 : 1)) % keys.length]; state.placementPreview = null;
    if (state.pointer) state.snapPreview = placementAt(type, state.pointer).preview;
    renderSmartSnapPreview(); renderPlacementTools();
  }

  function renderPlacementTools() {
    const el = $('#placement-tools'), type = state.draggedPaletteType || state.insertingType || state.magic?.placementType;
    if (!el) return; el.hidden = !type;
    if (!type) return;
    const keys = I.pointKeys(K.makeElement(type)), mount = state.placementPreview?.mount || state.placementMount || (type === 'rail' ? 'c' : 'a');
    el.innerHTML = `<strong>${escape(typeNames[type])}</strong><span>Uchopiť za bod</span>${keys.map((key) => `<button type="button" data-action="placement-mount" data-point="${key}" aria-pressed="${key === mount}">${key.toUpperCase()}</button>`).join('')}<button type="button" data-action="placement-cancel">Zrušiť</button><small>Tab: ďalší bod · Alt: bez prichytenia</small>`;
  }

  function snapDrawingPoint(point, elementId = null) {
    if (state.smartSnap && !state.snapSuppressed) {
      const probe = K.makeElement('node', point.x, point.y), p = K.copy(state.project);
      const excluded = elementId ? W.descendants(p, [elementId]) : new Set();
      p.elements = p.elements.filter((e) => !excluded.has(e.id));
      p.connections = p.connections.filter((j) => [j.a, j.b].every((r) => !excluded.has(r.elementId)));
      // A virtual source avoids project-size validation and never creates a body or joint.
      const result = { ...state.result, poses: { ...state.result.poses, [probe.id]: { a: point, b: point, angle: 0 } } };
      p.elements.push(probe);
      const preview = W.findSnap(p, [I.nodeKey({ elementId: probe.id, point: 'a' })], result, { x: 0, y: 0 }, snapOptions());
      state.snapPreview = preview;
      if (preview) return { ...preview.point };
    }
    state.snapPreview = null;
    return state.snap && !state.snapSuppressed ? { x: Math.round(point.x / 5) * 5, y: Math.round(point.y / 5) * 5 } : point;
  }

  function findDragSnap(drag, delta, axis = null) {
    if (drag.nodeConnection && !state.snapSuppressed) {
      const choices=WF.connectionChoices(drag.projectBefore,drag.nodeConnection,drag.resultBefore,{x:drag.anchor.x+delta.x,y:drag.anchor.y+delta.y},snapOptions().tolerance,!!drag.mount).filter(c=>viewElementVisible(c.target.elementId));
      if(choices.length){const preview={...choices[0],alternatives:choices};drag.preview=preview;state.snapPreview=preview;return preview;}
    }
    const preview = W.findSnap(drag.projectBefore, drag.keys, drag.resultBefore, delta, { ...snapOptions(), wholeBodies: drag.kind === 'manipulation' || !!drag.mount, sourcePoint: drag.mount?.point, previous: drag.preview, axis, cursor: drag.start });
    drag.preview = preview; state.snapPreview = preview;
    return preview;
  }

  function smartSnapSVG(scale) {
    const preview = (state.smartSnap || state.snapPreview?.direct) && !state.snapSuppressed && state.snapPreview;
    if (!preview) return '';
    const at = preview.point, target = preview.target.at, radius = 9 / scale;
    return `<g data-editor-overlay="smart-snap" class="smart-snap-preview" pointer-events="none">${line(at, target, 'stroke="var(--accent)" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"')}<circle cx="${at.x}" cy="${at.y}" r="${radius}" fill="var(--paper)" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke"/><path d="M${at.x - radius / 2} ${at.y}h${radius}M${at.x} ${at.y - radius / 2}v${radius}" fill="none" stroke="var(--accent)" vector-effect="non-scaling-stroke"/><text x="${at.x + 14 / scale}" y="${at.y - 13 / scale}" font-size="${11 / scale}" fill="var(--ink)">${escape(preview.label)} · len náhľad</text></g>`;
  }

  function renderSmartSnapPreview() {
    const svg = $('#mechanism-canvas');
    if (!svg) return;
    // Replacing the scene during HTML5 drag detaches the browser's live drop target.
    for (const overlay of svg.querySelectorAll('[data-editor-overlay="smart-snap"]')) overlay.remove();
    const matrix = svg.getScreenCTM(), scale = Math.hypot(matrix?.a ?? 1, matrix?.b ?? 0) || 1;
    let preview = smartSnapSVG(scale);
    if (state.placementPreview && (state.draggedPaletteType || state.insertingType || state.magic?.placementType)) {
      const e = state.placementPreview.element, p = K.copy(state.project); p.elements.push(e);
      const result = E.design(K.validateProject(p), K.driveRange(p).min), pose = result.poses[e.id], at = pose[state.placementPreview.mount];
      preview += `<g data-editor-overlay="smart-snap" class="placement-ghost" pointer-events="none"><g opacity=".45">${drawElement(e, pose, result)}</g><circle cx="${at.x}" cy="${at.y}" r="${6 / scale}" fill="var(--paper)" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke"/><text x="${at.x + 10 / scale}" y="${at.y + 14 / scale}" font-size="${11 / scale}" fill="var(--ink)">${state.placementPreview.mount.toUpperCase()}</text></g>`;
    }
    if (preview) svg.insertAdjacentHTML('beforeend', preview);
  }

  function offerSnapConnection(preview, merge = false) {
    if ((!state.smartSnap && !preview?.direct) || state.snapSuppressed || !preview || !['endpoint', 'midpoint', 'guide', 'cam-contact'].includes(preview.kind)) return;
    state.pendingSnap = K.copy(preview);
    state.snapTransaction = merge ? { historyLength: state.history.length, project: JSON.stringify(state.project) } : null;
    renderSnapChoices(); renderBindingTools();
    $('#snap-choices')?.querySelector?.('[data-action="snap-connect"]')?.focus({ preventScroll: true });
  }

  function dismissSnapChoices() {
    state.pendingSnap = null; state.snapTransaction = null;
    renderSnapChoices(); renderBindingTools();
  }

  function renderSnapChoices() {
    const el = $('#snap-choices'), preview = state.pendingSnap;
    if (!el) return; el.hidden = !preview;
    if (!preview) return;
    const target = state.project.elements.find((e) => e.id === preview.target.elementId), source = state.project.elements.find((e) => e.id === preview.source.elementId);
    const types = preview.kind === 'cam-contact' ? [['cam-contact', 'Kontakt vačky']] : preview.target.ref?.point === 'curve' ? [...(target?.type === 'rail' ? [['prismatic', 'Posuvne']] : []), ['point-path', 'Otočne v dráhe']] : K.isElastic(source) || K.isElastic(target) ? [['revolute', 'Otočne']] : [['revolute', 'Vložiť otočný čap'], ['fixed', 'Spojiť napevno']];
    const suggested = I.suggestJoint(state.project, preview.source.ref || {elementId: source?.id, point:'a'}, preview.target.ref || {elementId: target?.id, point:'a'});
    types.sort((a,b) => Number(b[0] === suggested) - Number(a[0] === suggested));
    el.innerHTML = `<span>${escape(source?.name || 'Prvok')} ↔ ${escape(target?.name || 'Montážny bod')}</span>${preview.alternatives?.length>1 ? `<label>Cieľ spojenia<select class="property-select" data-setting="connection-target">${preview.alternatives.map((p,i)=>`<option value="${i}"${p.target.elementId===preview.target.elementId&&p.target.ref?.point===preview.target.ref?.point?' selected':''}>${escape(p.label)}</option>`).join('')}</select></label>` : ''}<div>${types.map(([type, label]) => `<button type="button" data-action="snap-connect" data-type="${type}">${label}</button>`).join('')}<button type="button" data-action="snap-preview" data-type="${types[0][0]}">Náhľad…</button><button type="button" data-action="snap-position">Iba zarovnať</button></div><small>Vyberte typ spojenia · Escape ponechá polohu · Späť vráti celé prichytenie</small>`;
    if (preview.alternatives?.length > 1) el.innerHTML += snapTargetDiagram(preview);
    const matrix = $('#mechanism-canvas').getScreenCTM(), area = $('#canvas-area').getBoundingClientRect();
    if (matrix) {
      el.style ||= {}; el.style.maxHeight = `${Math.max(100, (area.height || 450) - 24)}px`;
      const size = el.getBoundingClientRect();
      el.style.left = `${Math.max(12, Math.min(area.width - size.width - 12, preview.point.x * matrix.a + preview.point.y * matrix.c + matrix.e - (area.left || 0) + 16))}px`;
      el.style.top = `${Math.max(12, Math.min((area.height || 450) - size.height - 12, preview.point.x * matrix.b + preview.point.y * matrix.d + matrix.f - (area.top || 0) + 16))}px`;
    }
  }
  function snapTargetDiagram(preview) {
    const alternatives = preview.alternatives, at = preview.point;
    const matrix = $('#mechanism-canvas').getScreenCTM(), scale = Math.hypot(matrix?.a || 1, matrix?.b || 0);
    const span = Math.max(20, 100 / scale), radius = span / 35;
    const selected = c => c.target.elementId === preview.target.elementId && c.target.ref?.point === preview.target.ref?.point && c.kind === preview.kind;
    let drawing = X.vectorSVG(state.project, state.result, { dimensions:false, trajectories:false, labels:false });
    drawing = drawing.slice(drawing.indexOf('<svg')).replace(/viewBox="[^"]*"/, `viewBox="${at.x-span/2} ${at.y-span/3} ${span} ${span*2/3}"`).replace(/<svg[^>]*>/, tag => tag.replace(/ (?:width|height)="[^"]*"/g, '').replace('<svg', '<svg class="snap-target-map" aria-label="Zväčšené okolie prípojných bodov"'));
    const markers = alternatives.map((c,i) => { const p=c.point, x=p.x+radius*(2+(i%4)*3), y=p.y-radius*(3+Math.floor(i/4)*3);return `<g data-action="snap-target" data-index="${i}" role="button" tabindex="0" aria-pressed="${selected(c)}" aria-label="${escape(c.label)}"><path d="M${p.x} ${p.y}L${x} ${y}" stroke="#617787" stroke-width="${radius/5}"/><circle cx="${x}" cy="${y}" r="${radius*1.3}" fill="${selected(c)?'#a94b23':'#fff'}" stroke="#617787" stroke-width="${radius/5}"/><text x="${x}" y="${y+radius*.4}" font-size="${radius*1.5}" text-anchor="middle" fill="${selected(c)?'#fff':'#233745'}">${i+1}</text></g>`; }).join('');
    drawing = drawing.replace('</svg>', `${markers}</svg>`);
    return `<div class="snap-target-picker"><strong>Vyberte konkrétny bod</strong>${drawing}<div class="snap-target-list">${alternatives.map((c,i)=>`<button type="button" data-action="snap-target" data-index="${i}" aria-pressed="${selected(c)}">${i+1}. ${escape(c.label)}</button>`).join('')}</div></div>`;
  }

  function submitSnapConnection(data) {
    if ((!state.smartSnap && !state.pendingSnap?.direct) || !state.pendingSnap) throw new Error('Prichytávanie je vypnuté alebo náhľad už neplatí.');
    const transaction = state.snapTransaction;
    if (transaction && (transaction.historyLength !== state.history.length || transaction.project !== JSON.stringify(state.project))) { dismissSnapChoices(); throw new Error('Model sa zmenil. Prichyťte body znova.'); }
    const next = W.connectSnap(state.project, state.pendingSnap, String(data.get('type')));
    if (!transaction) pushHistory();
    state.project = next; state.playing = false; state.mode = 'edit'; dismissSnapChoices(); changed(false);
    toast('Spojenie bolo vytvorené. Späť vráti celé prichytenie.');
  }
