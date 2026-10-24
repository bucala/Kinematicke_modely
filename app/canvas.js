/* Kinematika UI · Plátno: zásahy, kontextová ponuka, vkladanie a ťahanie.
   Klasický skript bez IIFE: zdieľa najvyššiu úroveň s ostatnými app/*.js a app.js, ktorý sa načíta posledný
   a definuje stav a konštanty. Súbor obsahuje iba deklarácie funkcií, pri načítaní nič nespúšťa. */
'use strict';
  function canvasHit(event, all = false) {
    const matrix = $('#mechanism-canvas').getScreenCTM();
    if (!matrix) return all ? [] : null;
    const screen = (p) => ({ x: p.x * matrix.a + p.y * matrix.c + matrix.e, y: p.x * matrix.b + p.y * matrix.d + matrix.f });
    const candidates = [];
    for (const e of state.project.elements.filter((e) => e.visible&&viewElementVisible(e.id))) {
      if (state.tool === 'connect' && state.pendingJoint?.elementId === e.id) continue;
      const pose = state.result.poses[e.id];
      if (state.mode === 'edit' && state.tool === 'select' && e.id === state.selected && pose) {
        if (e.type === 'slot' && (!e.primary || state.project.kind === 'drawer' && ['bezier', 'spline'].includes(state.project.parameters.curveKind))) {
          const points = I.controlPoints(state.project, e), stride = Math.ceil(points.length / 64);
          points.forEach((point, i) => {
            if (i % stride && i !== points.length - 1 || !e.primary && e.curveKind === 'arc' && i !== 0 && i !== points.length - 1) return;
            const at = e.primary ? { x: point.x + state.project.parameters.slotOffsetX, y: point.y + state.project.parameters.slotOffsetY } : K.worldPoint({ a: pose.controlOrigin || pose.a, angle: pose.angle }, point);
            candidates.push({ type: 'control', key: I.controlKey(e.id, i), at: screen(at) });
          });
        }
        if (!e.primary && e.outline?.length && e.role !== 'motor-housing') pose.outline.forEach((point, i) => candidates.push({ type: 'outline', key: I.outlineKey(e.id, i), at: screen(point) }));
      }
      for (const key of I.pointKeys(e)) if (pose?.[key] && portVisible(e,key)) {
        const identity = I.nodeKey({ elementId: e.id, point: key });
        candidates.push({ type: 'node', key: identity, at: screen(pose[key]), selected: state.tool === 'select' && state.mode === 'edit' && state.selectedElementIds.includes(identity), priority: e.type === 'bearing' ? 2 : e.type === 'node' ? 1 : 0 });
      }
      if (pose && !['node', 'bearing'].includes(e.type)) {
        const polygon = pose.outline?.length ? pose.outline : e.type === 'panel' ? panelPoints(pose, e.primary ? state.project.parameters.panelThickness : e.width) : null;
        candidates.push({ type: 'body', key: e.type === 'slot' ? I.pathKey(e.id) : I.elementKey(e.id), path: (pose.path?.length ? pose.path : [pose.a, pose.b]).filter(Boolean).map(screen), polygon: polygon?.map(screen), radius: Math.max(7, (e.type === 'rail' ? e.slotWidth : e.type === 'slot' ? e.slotWidth + 20 : e.width + 3) * Math.hypot(matrix.a, matrix.b) / 2), priority: state.project.elements.indexOf(e) });
      }
    }
    for (const joint of state.project.connections.filter(j=>!j.rigidAssemblyId)) {
      if ([joint.a,joint.b].some(r=>!viewElementVisible(r.elementId)))continue;
      if ([joint.a, joint.b].some((r) => !state.project.elements.find((e) => e.id === r.elementId)?.visible)) continue;
      const { a, b } = jointPoints(joint);
      if (a && b) candidates.push({ type: 'joint', key: I.jointKey(joint.id), a: screen(a), b: screen(b), marker: screen({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }) });
    }
    const hits = I.hitTargets(candidates, { x: event.clientX, y: event.clientY }, event.pointerType === 'touch' ? 22 : 12);
    // In simulation a fixed guide or frame body cannot be dragged, so a moving part under the pointer wins (a wide slot hides its pin).
    if (state.mode === 'simulate') {
      const still = (key) => { const t = I.target(state.project, key), e = t?.element; return !['node', 'joint'].includes(t?.type) && !!e && (e.type === 'ground' || e.locked || ['slot', 'rail'].includes(e.type) && !e.parentId); };
      hits.sort((a, b) => still(a) - still(b));
    }
    const part = state.tool === 'select' && event.target?.closest?.('[data-context-key]'), partTarget = part && I.target(state.project, part.dataset.contextKey);
    if (['control', 'outline'].includes(partTarget?.type)) hits.unshift(part.dataset.contextKey);
    const dimension = !state.dimensionPick && event.target?.closest?.('[data-dimension]');
    if (dimension && I.target(state.project, I.dimensionKey(dimension.dataset.dimension))) hits.unshift(I.dimensionKey(dimension.dataset.dimension));
    const node = event.target?.closest?.('[data-point]'), joint = event.target?.closest?.('[data-joint]');
    const element = event.target?.closest?.('[data-element]'), e = state.project.elements.find((e) => e.id === element?.dataset.element);
    const fallback = node ? I.nodeKey({ elementId: node.dataset.element, point: node.dataset.point }) : joint ? I.jointKey(joint.dataset.joint) : e ? ['bearing', 'node'].includes(e.type) ? I.nodeKey({ elementId: e.id, point: 'a' }) : I.elementKey(e.id) : null;
    if (fallback && I.target(state.project, fallback) && !hits.includes(fallback)) hits.push(fallback);
    return all ? [...new Set(hits)] : hits[0] || null;
  }

  function updateHover(key) {
    if (state.hoveredTargetId === key) return;
    state.hoveredTargetId = key;
    const t = I.target(state.project, key);
    for (const el of $('#mechanism-canvas').querySelectorAll('[data-selection-key]')) el.classList.toggle('hovered', el.dataset.selectionKey === key || t?.type === 'path' && el.dataset.selectionKey === I.elementKey(t.elementId));
    if(state.detailLevel==='basic'&&!state.drag)renderScene();
    $('#mechanism-canvas').dataset.hover = t?.type === 'node' ? I.status(state.project, I.reference(t), state.samples) : t?.type || '';
  }

  function closeContextMenu(focus = false) {
    contextMenu?.close(focus);
    state.contextMenuState.isOpen = false;
  }

  function openContextMenu(event, key = canvasHit(event)) {
    if (state.drag) onPointerUp({ pointerId: state.drag.pointerId, cancelled: true });
    document.querySelectorAll('#workflow-tools details[open], #model-checks details[open]').forEach((el) => { el.open = false; });
    const t = I.target(state.project, key), hits = canvasHit(event, true);
    if (key && t?.elementId && memberSelected(t.elementId)) { state.selected = t.elementId; renderTree(); renderInspector(); renderScene(); updateToolbar(); }
    else if (key) selectTarget(key, false, true);
    state.playing = false; updateMotion();
    state.contextWorldPoint = worldPoint(event);
    state.contextMenuState = { isOpen: true, x: event.clientX, y: event.clientY, targetId: key, targetType: t?.type || 'canvas', hitKeys: hits };
    const title = !t ? 'PRACOVNÁ PLOCHA' : t.type === 'dimension' ? t.dimension.name || 'Rozmerová kóta' : t.type === 'joint' ? t.joint.name : ['control', 'outline'].includes(t.type) ? `${t.element.name} · ${t.type === 'control' ? 'P' : 'V'}${t.index}` : t.type === 'path' ? `${t.element.name} · vodiaca dráha` : t.type === 'node' ? `${t.element.name} · ${K.pointName(t.point)}` : t.element.name;
    const items = contextItems(t);
    if (hits.length > 1) items.unshift({ label: `Vybrať entitu pod kurzorom (${hits.length})`, items: hits.map((identity) => {
      const target = I.target(state.project, identity);
      return { id: `pick:${identity}`, label: target.type === 'dimension' ? `Kóta · ${target.dimension.name || 'Rozmer'}` : target.type === 'joint' ? `Väzba · ${target.joint.name}` : ['control', 'outline'].includes(target.type) ? `${target.type === 'control' ? 'P' : 'V'}${target.index} · ${target.element.name}` : target.type === 'path' ? `Dráha · ${target.element.name}` : target.type === 'node' ? `Uzol ${K.pointName(target.point)} · ${target.element.name}` : `Člen · ${target.element.name}` };
    }) }, { separator: true });
    contextMenu.open({ x: event.clientX, y: event.clientY, title, items });
    state.contextMenuState.isOpen = true; renderScene();
  }

  function onContextMenu(event) {
    if (state.gifExport) { event.preventDefault(); return; }
    if (state.magic && !magicWorking()) { event.preventDefault(); return; }
    event.preventDefault(); event.stopPropagation();
    const drag = state.drag;
    if (drag?.kind === 'pan' && drag.button === 2) { drag.menuPending = { clientX: event.clientX, clientY: event.clientY, target: event.target, preventDefault() {}, stopPropagation() {} }; return; }
    if (state.suppressContextMenuUntil > Date.now()) { state.suppressContextMenuUntil = 0; return; }
    const row = event.target?.closest?.('[data-context-key]');
    try { openContextMenu(event, row ? row.dataset.contextKey : canvasHit(event)); }
    catch (error) { toast(`Ponuku sa nepodarilo otvoriť: ${error.message}`, true); }
  }

  // Double click runs the entity's main edit from its menu; on empty canvas it fits the view.
  function onDoubleClick(event) {
    if (state.gifExport || state.magic || state.tool !== 'select' || state.insertingType || state.drag) return;
    if (event.target?.closest?.('[data-edit-handle],[data-dimension]')) return;
    event.preventDefault?.();
    runPrimaryAction(canvasHit(event), worldPoint(event));
  }
  function runPrimaryAction(key, at = null) {
    const t = key ? I.target(state.project, key) : null;
    let action = primaryAction(t);
    // Adding a control point needs a location; without one the path's points are edited instead.
    if (action === 'curve-add-control' && !at) action = 'edit-path';
    if (!action || !menuHas(contextItems(t), action)) return false;
    if (key && !state.selectedElementIds.includes(key)) selectTarget(key);
    state.contextMenuState = { ...state.contextMenuState, isOpen: false, targetId: key, targetType: t?.type || 'canvas' };
    state.contextWorldPoint = at || state.pointer;
    onContextAction(action);
    return true;
  }

  function editCanvas(next, message, keys = null) {
    if (state.magic && !magicWorking()) throw new Error('V tomto kroku sprievodcu sa geometria neupravuje.');
    const validated = K.validateProject(next);
    state.trial = null; state.trialBlock = null;
    closeContextMenu(); pushHistory(); state.project = validated; state.playing = false; state.mode = 'edit';
    if (keys) state.selectedElementIds = keys;
    if (!state.project.elements.some((e) => e.id === state.traceRef.elementId)) state.traceRef = { elementId: '', point: 'a' };
    changed(false); if (message) toast(message);
  }

  function deleteSelected(keys = state.selectedElementIds, confirmed = false) {
    if (!keys.length) return;
    const virtualNodes = keys.map((key) => I.target(state.project, key)).filter((t) => t?.type === 'node' && !['bearing', 'node'].includes(t.element.type));
    if (!confirmed) {
      try {
        const next = I.deleteSelection(state.project, keys, state.result), impact = WF.impact(state.project, next, state.result);
        if ((virtualNodes.length || impact.elements.length && impact.joints.length) && !virtualNodes.some((t) => t.element.primary)) {
          state.pendingDeleteKeys = [...keys]; reviewImpact(next, 'Zvolené entity a ich väzby boli odstránené.', I.validSelection(next, state.selectedElementIds), virtualNodes.length ? 'Odstrániť uzol aj jeho člen?' : 'Odstrániť prvky a naviazané väzby?'); return;
        }
      } catch (error) { toast(error.message, true); return; }
    }
    try { const next = I.deleteSelection(state.project, keys, state.result); editCanvas(next, 'Zvolené entity a ich väzby boli odstránené.', I.validSelection(next, state.selectedElementIds)); }
    catch (error) { toast(error.message, true); }
  }

  function fixSelected(fallback = null, exact = false) {
    const refs = exact ? contextNodeReferences(fallback) : selectedNodeReferences(fallback);
    if (!refs.length) { toast('Najskôr vyberte uzol. Shift+F prispôsobí pohľad.', true); return; }
    try {
      const next = I.toggleFixed(state.project, refs, state.result);
      if (!state.project.elements.some((e) => e.drive) && next.elements.some((e) => e.drive)) state.motion = K.driveRange(next).min;
      const impact = WF.impact(state.project, next, state.result);
      if (impact.driverLost || impact.joints.some((j) => state.project.connections.some((old) => old.id === j.id))) reviewImpact(next, 'Fixácia vybraných uzlov bola zmenená.');
      else editCanvas(next, 'Fixácia vybraných uzlov bola zmenená.');
    }
    catch (error) { toast(error.message, true); }
  }

  function canvasDialog(kind, r, jointType = 'revolute', jointId = '') {
    if (kind !== 'limits' && kind !== 'joint') setMode('edit');
    const e = state.project.elements.find((e) => e.id === r.elementId), at = K.point(state.result, r), range = K.driveRange(state.project);
    const number = (name, label, value, min = -5000, max = 5000) => quantityInput(name, label, value, ['x', 'y', 'length', 'radius', 'camLift'].includes(name) ? 'mm' : ['angle', 'value', 'camPhase'].includes(name) ? '°' : '', min, max);
    let fields = '', title = '';
    if (kind === 'coordinates') {
      title = 'Absolútne súradnice uzla';
      fields = `${number('x', 'X (mm)', at.x)}${number('y', 'Y (mm, nadol)', at.y)}<label class="property-field"><span>Z (mm, rovinný model)</span><input class="text-field" name="z" type="number" value="0" readonly/></label><p class="section-description">Súradnice návrhovej geometrie. Zostáva Z = 0; kĺbové väzby sa vynútia v simulácii.</p>`;
    } else if (kind === 'properties') {
      title = 'Vlastnosti členu';
      fields = `<label class="property-field"><span>Názov</span><input class="text-field" name="name" value="${escape(e.name)}" maxlength="100" required/></label>${number('length', 'Dĺžka (mm)', e.length, .1)}${number('stiffness', 'Referenčná osová tuhosť (N/mm)', e.stiffness, 0, 1000000)}<label class="property-field"><span>Farba členu</span><input type="color" name="color" value="${e.color || '#798997'}"/></label><p class="section-description">Kinematický solver počíta tuhé členy. Tuhosť ramena je referenčný údaj, nemení jeho deformáciu. Pre silový účinok použite samostatnú pružinu.</p>`;
    } else if (kind === 'cam-profile') {
      title = 'Radiálna vačka · profil';
      fields = `<label class="property-field"><span>Tvar vačky</span><select class="property-select" name="camShape"><option value="harmonic"${e.camShape !== 'pear' ? ' selected' : ''}>Harmonický profil</option><option value="pear"${e.camShape === 'pear' ? ' selected' : ''}>Pretiahnutá vačka</option></select></label>${number('camNoseRatio', 'Polomer špičky / základne', e.camNoseRatio, .1, 1)}${number('radius', 'Polomer základného kruhu R (mm)', e.radius, .1, 5000)}${number('camLift', 'Zdvih profilu h (mm)', e.camLift, 0, 5000)}${number('camPhase', 'Fáza výstupku (°)', e.camPhase, -360, 360)}<p class="section-description">Harmonický profil alebo dva kruhové oblúky spojené dotyčnicami. Valček sa vedie po vonkajšom odsadení podľa svojho polomeru. Predpoklad trvalého dotyku neoveruje kontaktné sily ani odtrhnutie.</p>`;
    } else if (kind === 'motor') {
      title = 'Pohon uzla';
      const rotary = ['link', 'panel', 'cam', 'motor'].includes(e.type), linear = !rotary || e.driveMode === 'linear';
      fields = `${['cam','motor'].includes(e.type)?`<label class="check-row"><input type="checkbox" name="continuous"${e.continuous?' checked':''}/><span>Súvislé otáčanie (celý cyklus)</span></label>`:''}<label class="check-row"><input type="checkbox" name="enabled" checked/><span>Zapnúť pohon (nahradí doterajší nezávislý pohon)</span></label><label class="property-field"><span>Typ pohonu</span><select name="mode" class="property-select">${!['cam','motor'].includes(e.type) ? `<option value="linear"${linear ? ' selected' : ''}>Lineárny, v (mm/s)</option>` : ''}${rotary ? `<option value="rotary"${!linear ? ' selected' : ''}>Otočný okolo uzla ${r.point.toUpperCase()}, ω (°/s)</option>` : ''}</select></label>${number('speed', 'v (mm/s) alebo ω (°/s), znamienko určuje počiatočný smer', e.driveSpeed ?? 30, -10000, 10000)}${number('angle', 'Smer lineárneho pohonu (°)', e.driveAngle || 0, -360, 360)}${number('min', 'Začiatok zdvihu (mm) / uhla (°)', e.drive ? range.min : 0)}${number('max', 'Koniec zdvihu (mm) / uhla (°)', e.drive ? range.max : e.type === 'cam' ? 360 : linear ? 100 : 180)}<p class="section-description">Jeden predpísaný pohon. Nulová rýchlosť drží polohu. Súvislé otáčanie pokračuje bez obracania; pri obmedzenom zdvihu sa smer na doraze obráti. Použije sa násobič rýchlosti; odhadová dynamika zostáva riadená silami.</p>`;
    } else if (kind === 'limits') {
      title = 'Pohybové limity uzla';
      const driver = I.root(state.project, e).drive, joints = state.project.connections.filter((j) => !j.builtin && ['revolute', 'prismatic'].includes(j.type) && (sameReference(j.a, r) || sameReference(j.b, r)));
      const j = joints[0], min = driver ? range.min : j?.limitMin ?? (j?.type === 'prismatic' ? 0 : -180);
      const guide = j && state.project.elements.find((e) => e.id === (j.a.point === 'curve' ? j.a : j.b).elementId);
      const max = driver ? range.max : j?.limitMax ?? (j?.type === 'prismatic' ? guide.length : 180);
      fields = `<label class="property-field"><span>Limity pohonu alebo konkrétnej väzby</span><select name="scope" class="property-select">${driver ? '<option value="drive">Nezávislý pohon</option>' : ''}${joints.map((j) => `<option value="${escape(j.id)}">${escape(j.name)} · ${j.type === 'prismatic' ? 's (mm)' : 'θ (°)'}</option>`).join('')}</select></label>${number('min', 'Minimum, s (mm) alebo θ (°)', min)}${number('max', 'Maximum, s (mm) alebo θ (°)', max)}<p class="section-description">Posuvný kĺb: vzdialenosť od začiatku vedenia. Otočný kĺb: relatívny uhol B − A v rozsahu −180° až 180°. Prekročenie limitu nepohyblivého pohonu hlási blokovanie; nevytvára sa náraz ani odraz.</p>`;
    } else if (kind === 'joint') {
      title = 'Typ kinematickej väzby';
      const existing = state.project.connections.filter((j) => !j.builtin && (sameReference(j.a, r) || sameReference(j.b, r)));
      // 'new' starts a further joint instead of editing the node's first one.
      const joint = jointId === 'new' ? null : existing.find((j) => j.id === jointId) || existing[0];
      let other = joint ? sameReference(joint.a, r) ? joint.b : joint.a : null;
      if (jointType === 'prismatic' && other?.point !== 'curve') other = state.project.elements.find((v) => v.type === 'rail') ? { elementId: state.project.elements.find((v) => v.type === 'rail').id, point: 'curve' } : null;
      const value = jointType === 'prismatic' && joint?.type === 'prismatic' ? joint.value * (sameReference(joint.a, r) ? 1 : -1) : 0;
      fields = `<label class="property-field"><span>Typ</span><select class="property-select" name="type">${[['revolute', 'Otočný kĺb'], ['prismatic', 'Posuvný kĺb']].map(([v, name]) => `<option value="${v}"${jointType === v ? ' selected' : ''}>${name}</option>`).join('')}</select></label><label class="property-field"><span>Upravovaná väzba</span><select class="property-select" name="jointId"><option value="">Nová väzba</option>${existing.map((j) => `<option value="${escape(j.id)}"${j.id === joint?.id ? ' selected' : ''}>${escape(j.name)}</option>`).join('')}</select></label><label class="property-field"><span>Druhý bod (otočný) alebo dráha vedenia (posuvný)</span><select class="property-select" name="other" required>${canvasOtherOptions(r, jointType, other)}</select></label>${number('value', 'Relatívny uhol vedenia a posúvača (°, posuvný kĺb)', value, -360, 360)}<p class="section-description">Otočný kĺb spojí dva body. Posuvný kĺb vyžaduje dráhu priameho vedenia, obmedzí polohu aj orientáciu tuhého posúvača. Samostatný bod nemá rotačnú súradnicu.</p><button class="button button-secondary" type="button" data-action="canvas-add-guide">Pridať nové lineárne vedenie</button>`;
    }
    modal(title, `<form id="canvas-edit-form" data-kind="${kind}" data-reference="${escape(I.nodeKey(r))}">${fields}<div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zrušiť</button><button type="submit" class="button button-dark">Použiť</button></div></form>`);
  }

  function partPointModal(key) {
    const t = I.target(state.project, key);
    if (!['control', 'outline'].includes(t?.type) || t.element.primary) throw new Error('Vyberte editovateľný riadiaci bod alebo vrchol vo voľnej kópii.');
    const point = t.type === 'control' ? t.element.controls[t.index] : t.element.outline[t.index];
    modal(`Lokálne súradnice ${t.type === 'control' ? 'P' : 'V'}${t.index}`, `<form id="part-point-form" data-key="${escape(key)}">${quantityInput('x', 'X v sústave telesa (mm)', point.x, 'mm', -5000, 5000)}${quantityInput('y', 'Y v sústave telesa (mm)', point.y, 'mm', -5000, 5000)}<p class="section-description">Mení sa iba tento bod. Vnútorné Bézierove body riadia tvar; krivka cez ne nemusí prechádzať.</p><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zrušiť</button><button class="button button-dark" type="submit">Použiť</button></div></form>`);
  }
  function submitPartPoint(form, data) {
    const t = I.target(state.project, form.dataset.key);
    if (!['control', 'outline'].includes(t?.type)) throw new Error('Bod už neexistuje.');
    const at = { x: quantityValue(data, 'x', 'mm', -5000, 5000), y: quantityValue(data, 'y', 'mm', -5000, 5000) };
    editCanvas(I.setControlPoint(state.project, t.elementId, t.index, at, t.type === 'outline'), 'Upravili sa iba súradnice zvoleného bodu.', curveEditKeys(t.elementId, t.id));
    $('#modal').close();
  }
  function slotSemicircleModal(id) {
    const draft = I.semicircle(state.project, id, null, null, state.result), e = draft.elements.find((e) => e.id === id);
    modal('Kulisa · polkruh s polomerom R', `<form id="slot-semicircle-form" data-element="${escape(id)}">${quantityInput('radius', 'Polomer R (mm)', e.curveRadius, 'mm', .1, 5000)}<label class="property-field"><span>Strana tetivy P0 → koniec</span><select class="property-select" name="side"><option value="1"${e.curveSide === 1 ? ' selected' : ''}>Ľavá strana</option><option value="-1"${e.curveSide === -1 ? ' selected' : ''}>Pravá strana</option></select></label><p class="section-description">Predvolený R zachová oba konce. Pri zmene R ostáva P0 pevný a druhý koniec sa posunie po pôvodnom smere tetivy na vzdialenosť 2R. Vznikne presný 180° oblúk s dvoma koncovými bodmi; zmena je vratná cez Späť.</p><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zrušiť</button><button class="button button-dark" type="submit">Vytvoriť polkruh</button></div></form>`);
  }
  function submitSlotSemicircle(form, data) {
    const id = form.dataset.element, radius = quantityValue(data, 'radius', 'mm', .1, 5000), side = Number(data.get('side'));
    editCanvas(I.semicircle(state.project, id, radius, side, state.result), 'Kulisa je polkruh s priemerom 2R; P0 zostal na mieste.', curveEditKeys(id, I.pathKey(id)));
    $('#modal').close();
  }

  function sameReference(a, b) {
    return a?.elementId === b?.elementId && a?.point === b?.point;
  }

  function canvasOtherOptions(r, type, selected) {
    const choices = state.project.elements.filter((e) => e.id !== r.elementId && e.role !== 'canvas-anchor' && !K.isElastic(e) && (type !== 'prismatic' || e.type === 'rail'));
    return choices.length ? choices.flatMap((e) => (type === 'prismatic' ? ['curve'] : I.pointKeys(e)).map((point) => `<option value="${escape(e.id)}|${point}"${sameReference(selected, { elementId: e.id, point }) ? ' selected' : ''}>${escape(e.name)} · ${point === 'curve' ? 'dráha' : point.toUpperCase()}</option>`)).join('') : '<option value="">Najskôr pridajte druhý prvok / vedenie</option>';
  }

  function onContextAction(action) {
    if (state.magic && (!magicWorking() || ['copy-editable', 'open-library', 'save-library'].includes(action))) { toast('Najskôr dokončite alebo zrušte Magic import.', true); return; }
    const t = I.target(state.project, state.contextMenuState.targetId), r = I.reference(t);
    const at = state.contextWorldPoint, p = state.project;
    try {
      if (action === 'selection-connect') { selectTarget(state.contextMenuState.targetId || (t.type==='node'?I.nodeKey(I.reference(t)):I.elementKey(t.elementId))); beginSelectedConnection(); }
      else if (action.startsWith('pick:')) { openContextMenu({ clientX: state.contextMenuState.x, clientY: state.contextMenuState.y, target: $('#mechanism-canvas') }, action.slice(5)); }
      else if (action === 'inspect') { selectElement(t.elementId); propertiesOverview(); }
      else if (action === 'motor-check') { selectElement(t.elementId); motorCapacityModal(); }
      else if (action === 'edit-path') { selectElement(t.elementId); geometryModal(false); }
      else if (action === 'select-assembly') actions['select-rigid-assembly']({ dataset: { id: t.elementId } });
      else if (action === 'unbind-rigid') rigidAssemblyModal(true, t.elementId);
      else if (action === 'bind-rigid') rigidAssemblyModal();
      else if (action === 'isolate') isolateSelection();
      else if (action === 'thickness') { selectElement(t.elementId); setMode('edit'); transformModal('thickness'); }
      else if (action === 'elastic-fit') { const next = K.copy(p), e = next.elements.find((e) => e.id === t.elementId); e.rangeMode = 'auto'; editCanvas(K.fitElasticRanges(next, [e.id], state.result), 'Pracovný rozsah bol prispôsobený montáži.'); }
      else if (action === 'rail-motion' && t?.element?.type === 'rail') editCanvas(I.setRailMotion(p, t.elementId, !t.element.movingRail, state.result), t.element.movingRail ? 'Vozík sa pohybuje, vedenie je pevné.' : 'Vedenie sa pohybuje, vozík zostáva pevný.');
      else if (action === 'copy-editable') { makeEditable(); if (t && I.target(state.project, state.contextMenuState.targetId)) selectTarget(state.contextMenuState.targetId); }
      else if (action === 'open-library') assembliesModal(at);
      else if (action === 'save-library') recordSaveModal('assembly');
      else if (action === 'fit') { fitView(); renderScene(); }
      else if (action === 'add-node' || action === 'add-ground') {
        const next = I.addNode(p, state.snap ? { x: Math.round(at.x / 5) * 5, y: Math.round(at.y / 5) * 5 } : at, action === 'add-ground');
        editCanvas(next, 'Bod bol pridaný.', [I.nodeKey({ elementId: next.elements.at(-1).id, point: 'a' })]);
      } else if (action === 'add-guide') {
        const next = K.copy(p), e = { ...K.makeElement('rail', at.x, at.y), drive: false, locked: true };
        next.elements.push(e); editCanvas(next, 'Pevné lineárne vedenie bolo pridané.', [I.elementKey(e.id)]);
      } else if (action.startsWith('assembly-')) editCanvas(I.insertAssembly(p, action.slice(9), at), 'Podzostava bola vložená. Ak už model má pohon, nová podzostava je bez ďalšieho pohonu.');
      else if (action === 'select-member') selectTarget(I.elementKey(t.elementId));
      else if (action === 'part-point') partPointModal(state.contextMenuState.targetId);
      else if (action === 'control-delete' || action === 'outline-delete') editCanvas(I.deleteSelection(p, [t.id], state.result), 'Odstránil sa iba zvolený bod; člen zostal.', curveEditKeys(t.elementId));
      else if (action === 'control-add-after') editCanvas(I.insertControl(p, t.elementId, null, t.index + 1, state.result), 'Pridal sa ďalší riadiaci bod.', curveEditKeys(t.elementId, I.controlKey(t.elementId, t.index + 1)));
      else if (action === 'curve-add-control') editCanvas(I.insertControl(p, t.elementId, at, null, state.result), 'Pridal sa riadiaci bod. Bézierova krivka cez vnútorný bod nemusí prechádzať.', curveEditKeys(t.elementId));
      else if (action === 'curve-semicircle') slotSemicircleModal(t.elementId);
      else if (action === 'fix') fixSelected(r, true);
      else if (action === 'delete' && t?.type === 'joint') editCanvas(I.deleteSelection(p, [I.jointKey(t.id)], state.result), 'Vymazala sa iba vybraná väzba.', state.selectedElementIds.filter((key) => key !== I.jointKey(t.id)));
      else if (action === 'delete') deleteSelected(contextDeleteKeys(t));
      else if (action === 'disconnect-body') editCanvas(I.disconnectBody(p, t.elementId, state.result), 'Člen a jeho body boli odpojené od väzieb.');
      else if (action === 'fix-body') editCanvas(I.toggleBodyFixed(p, t.elementId, state.result), 'Uloženie celého telesa bolo zmenené.');
      else if(action==='spin')startRotation(t.elementId);
      else if(action==='surface-contact')surfaceModal(t.elementId);
      else if(action==='motor-spec')motorSpecModal(t.elementId);
      else if (action.startsWith('motor-')) canvasDialog('motor', { elementId: t.elementId, point: action.slice(6) });
      else if (action === 'edit-joint') jointModal(t.id);
      else if (action === 'edit-dimension') dimensionModal(t.id);
      else if (action === 'delete-dimension') editCanvas(I.deleteSelection(p, [I.dimensionKey(t.id)], state.result), 'Vymazala sa iba vybraná kóta.', state.selectedElementIds.filter((key) => key !== I.dimensionKey(t.id)));
      else if (action === 'disconnect' || action === 'joint-free') reviewImpact(t.type === 'joint' && action === 'joint-free' ? I.deleteSelection(p, [I.jointKey(t.id)], state.result) : I.disconnect(p, r, state.result), 'Uzol bol odpojený.');
      else if (action === 'joint-cam-contact') {
        const cam = p.elements.find((e) => e.type === 'cam');
        if (!cam) throw new Error('Najskôr pridajte vačku, potom jej kontakt s ložiskom.');
        jointModal(null, { type: 'cam-contact', a: r, b: { elementId: cam.id, point: 'curve' } });
      }
      else if (action === 'joint-revolute' || action === 'joint-prismatic') canvasDialog('joint', r, action.slice(6), t.type === 'joint' ? t.id : '');
      else if (action === 'joint-new-prismatic') canvasDialog('joint', r, 'prismatic', 'new');
      else if (['coordinates', 'properties', 'motor', 'limits', 'cam-profile'].includes(action)) canvasDialog(action, r || { elementId: t.elementId, point: 'a' });
      else if (action === 'cam-follower') editCanvas(I.addCamFollower(p, t.elementId, state.result), 'Valček, jeho posúvač a vedenie boli pridané. Priraďte vačke otočný pohon.');
      else if (action === 'split') {
        setMode('edit');
        const next = I.split(p, t.elementId, state.result); editCanvas(next, 'Rameno bolo rozdelené stredovým otočným uzlom. Hmotnosť sa rozdelila rovnomerne.', [I.nodeKey({ elementId: next.elements.at(-1).id, point: 'a' })]);
      } else if (action === 'poi') {
        const next = I.addPOI(p, t.elementId, state.result); state.trace = true;
        editCanvas(next, 'Bod POI aj jeho trajektória boli pridané.', [I.nodeKey({ elementId: next.elements.at(-1).id, point: 'a' })]);
      } else if (action === 'trace-node') savedTraceModal(undefined, r);
      else if (['snap', 'align-x', 'align-y', 'axis-x', 'axis-y'].includes(action)) {
        const active = K.point(state.result, r), refs = contextNodeReferences(r);
        const transform = (v) => ({
          x: action === 'snap' ? Math.round(v.x / 5) * 5 : action === 'align-x' ? active.x : action === 'axis-y' ? 0 : v.x,
          y: action === 'snap' ? Math.round(v.y / 5) * 5 : action === 'align-y' ? active.y : action === 'axis-x' ? 0 : v.y,
        });
        editCanvas(I.transformPoints(p, refs, transform, state.result), 'Vybrané uzly boli zarovnané.');
      }
      else throw new Error(`Neznáma akcia ponuky: ${action}`);
    } catch (error) { toast(error.message, true); }
  }

  function onCanvasSubmit(form, data) {
    const r = I.reference(I.target(state.project, form.dataset.reference)), kind = form.dataset.kind, p = state.project;
    const n = (name) => W.parseNumber(data.get(name), ['x', 'y', 'z', 'length', 'radius', 'camLift'].includes(name) ? 'mm' : ['angle', 'value', 'camPhase'].includes(name) ? '°' : '');
    if (!r) throw new Error('Vybraný bod už neexistuje.');
    let next;
    if (kind === 'coordinates') next = I.setCoordinates(p, r, { x: n('x'), y: n('y'), z: n('z') }, state.result);
    if (kind === 'properties') next = I.setProperties(p, r.elementId, { name: String(data.get('name')).trim(), length: n('length'), stiffness: n('stiffness'), color: String(data.get('color')) });
    if (kind === 'cam-profile') { next = K.copy(p); Object.assign(next.elements.find((e) => e.id === r.elementId), { radius: n('radius'), camLift: n('camLift'), camPhase: n('camPhase'), camShape: data.get('camShape') || 'harmonic', camNoseRatio: data.has('camNoseRatio') ? n('camNoseRatio') : .4 }); }
    if (kind === 'motor') {
      next = I.setDriver(p, r, { enabled: data.has('enabled'), mode: String(data.get('mode')), speed: n('speed'), angle: n('angle'), min: n('min'), max: n('max'),continuous:data.has('continuous') }, state.result);
      state.direction = n('speed') < 0 ? -1 : 1;
      if (data.has('enabled')) state.motion = state.direction < 0 ? K.driveRange(next).max : K.driveRange(next).min;
    }
    if (kind === 'limits') next = data.get('scope') === 'drive' ? I.setLimits(p, n('min'), n('max')) : I.setJointLimits(p, String(data.get('scope')), n('min'), n('max'));
    if (kind === 'joint') next = I.setJoint(p, r, { type: String(data.get('type')), id: String(data.get('jointId')), other: parseReference(String(data.get('other'))), value: n('value') });
    editCanvas(next, 'Zmena bola uložená do modelu.'); $('#modal').close();
  }

  function setTool(tool) {
    closeContextMenu();
    if (tool === 'measure') { startDimensionPick(); return; }
    cancelDimensionPick();
    if (state.magic) {
      if (!magicWorking() && tool !== 'pan' && tool !== 'select') return;
      state.magic.tool = tool; state.magic.drawing = []; state.magic.preview = null; state.magic.placementType = null;
    }
    state.tool = tool; state.pendingJoint = null;
    state.snapPreview = null; dismissSnapChoices(); state.insertingType = null; state.placementPreview = null; state.placementMount = null; renderPlacementTools();
    if (tool !== 'measure') state.measure = null;
    updateToolbar(); renderScene();
  }

  function addElement(type, position) {
    if (!K.TYPES.includes(type)) return;
    if (state.magic) {
      if (state.magic.step !== 4) { toast('Členy vkladajte v kroku Členy a väzby.', true); return; }
      if (!position) { selectMagicTool('place', type); return; }
      try {
        const placement = placementAt(type, position); let next = M.placeElement(state.project, type, placement.element); const e = next.elements.at(-1);
        if (type === 'motor') next = I.separateMotor(next, e.id);
        if (placement.preview) {
          placement.preview.source.elementId = e.id;
          if (placement.preview.source.ref) placement.preview.source.ref.elementId = e.id;
        }
        state.magic.placementType = null; state.magic.tool = 'select'; state.tool = 'select';
        editCanvas(next, `${e.name} bol vložený. Upravte jeho rozmery a spojte uzly.`, [e.type === 'node' ? I.nodeKey({ elementId: e.id, point: 'a' }) : I.elementKey(e.id)]);
        offerSnapConnection(placement.preview, true);
      } catch (error) { toast(error.message, true); }
      return;
    }
    if (!position) {
      dismissSnapChoices(); state.insertingType = type; state.placementMount = null; state.placementPreview = null; state.tool = 'place'; state.playing = false;
      renderScene(); updateToolbar(); toast('Vyberte montážny bod a kliknite na plátno. Tab prepína body, Escape zruší vloženie.'); return;
    }
    if (state.project.elements.length > (type === 'motor' ? 118 : 119)) { toast('Projekt môže obsahovať najviac 120 prvkov; motor s krytom potrebuje dve miesta.', true); return; }
    const offset = state.project.elements.filter((e) => !e.primary).length * 15;
    const point = position || { x: 130 + offset, y: state.project.kind === 'drawer' ? -20 : -80 };
    const placement = placementAt(type, point), e = placement.element;
    if (e.drive && (state.project.kind !== 'custom' || state.project.elements.some((v) => v.drive))) e.drive = false;
    const count = state.project.elements.filter((v) => v.type === type).length + 1;
    e.name = `${typeNames[type]} ${count}`;
    let next = K.validateProject({ ...K.copy(state.project), elements: [...state.project.elements, e] });
    if (type === 'motor') next = I.separateMotor(next, e.id);
    pushHistory(); state.project = next; state.snapPreview = null;
    state.selectedElementIds = [e.type === 'node' ? I.nodeKey({ elementId: e.id, point: 'a' }) : I.elementKey(e.id)]; state.analysis = false; state.mode = 'edit'; state.playing = false;
    state.traceRef = { elementId: e.id, point: K.defaultTracePoint(e) };
    changed(false);
    toast(`${e.name} bol pridaný. Spojte jeho uzly nástrojom J.`);
    offerSnapConnection(placement.preview, true);
  }

  function duplicateElement() {
    const e = currentElement(), pose = selectedPose();
    if (!e) return;
    const motor=motorParts(e.id);
    if(e.rigidAssemblyId||motor?.housing){
      try{
        const root=I.root(state.project,e),keys=[I.elementKey(root.id)],origin=W.pivot(state.project,keys,state.result);
        const record=W.captureAssembly(state.project,keys,`${root.rigidAssemblyName||motor?.motor.name||root.name} · kópia`);
        const next=W.insertAssembly(state.project,record,{x:origin.x+35,y:origin.y-35},false),old=new Set(state.project.elements.map(e=>e.id));
        editCanvas(next,'Zostava bola skopírovaná aj s vlastnými dielmi.',next.elements.filter(e=>!old.has(e.id)).map(e=>I.elementKey(e.id)));
      }catch(error){toast(error.message,true);}return;
    }
    if (e.type === 'motor') {
      if (state.project.elements.length > 118) { toast('Kópia motora s krytom potrebuje dve voľné miesta.', true); return; }
      const housing = state.project.elements.find(v => v.id === e.parentId && v.role === 'motor-housing');
      const clone = {...K.copy(e),id:K.uid(),name:`${e.name} · kópia`,parentId:'',parentPoint:'a',drive:false,locked:false,
        x:pose.a.x+35,y:pose.a.y-35,angle:pose.angle,mass:housing?.mass??e.mass};
      const next = K.copy(state.project); next.elements.push(clone);
      editCanvas(I.separateMotor(next,clone.id),'Motor bol skopírovaný s vlastným krytom.',[I.elementKey(clone.id)]); return;
    }
    if (state.project.elements.length >= 120) { toast('Projekt môže obsahovať najviac 120 prvkov.', true); return; }
    pushHistory();
    const clone = { ...K.copy(e), id: K.uid(), name: `${e.name} · kópia`, primary: false, role: '', locked: false, drive: false, slotId: '', x: (pose?.a.x ?? e.x) + 35, y: (pose?.a.y ?? e.y) - 35, angle: pose?.angle ?? e.angle, length: pose?.length || e.length };
    if (e.type === 'panel' && e.primary) { clone.width = state.project.parameters.panelThickness; clone.bearingOffset = state.project.parameters.bearingOffset; }
    if (e.type === 'bearing' && e.primary) clone.radius = state.project.parameters.bearingRadius;
    if (e.type === 'rail' && e.primary) clone.stroke = state.project.parameters.travelMax - state.project.parameters.travelMin;
    if (e.type === 'slot' && e.primary && pose?.path) {
      clone.angle = 0; clone.curveKind = 'spline'; clone.slotWidth = state.project.parameters.slotWidth;
      clone.controls = Array.from({ length: 13 }, (_, i) => {
        const point = pose.path[Math.round(i / 12 * (pose.path.length - 1))];
        return { x: point.x - pose.a.x, y: point.y - pose.a.y };
      });
    }
    state.project.elements.push(clone); state.selectedElementIds = [I.elementKey(clone.id)];
    changed(false); toast('Prvok bol duplikovaný. Jeho poloha sa dá voľne upraviť.');
  }

  function deleteElement() {
    deleteSelected();
  }

  // Mouse wheel zooms. A trackpad, recognized by a diagonal two-finger scroll, pans; pinching (Ctrl+wheel) zooms.
  // Shift+wheel pans horizontally and Alt+wheel scrubs the drive position.
  function onWheel(event) {
    event.preventDefault();
    if (state.gifExport) return;
    if (event.altKey) {
      const range = K.driveRange(state.project), direction = Math.sign(event.deltaY || event.deltaX);
      if (!direction || !(range.max > range.min)) return;
      state.playing = false;
      setMotion(K.clamp(state.motion + direction * (range.max - range.min) / 60, range.min, range.max));
      return;
    }
    const pinch = event.ctrlKey || event.metaKey;
    if (!pinch && !event.shiftKey && event.deltaMode === 0 && event.deltaX && event.deltaY) state.trackpad = true;
    // Several wheel events can arrive per frame; the view is updated each time and drawn once.
    if (pinch) { zoom(K.clamp(Math.exp(event.deltaY * 0.01), 0.5, 2), viewPoint(event), true); return; }
    if (!state.trackpad && !event.shiftKey) { zoom(event.deltaY > 0 ? 1.08 : 0.925, viewPoint(event), true); return; }
    const rect = $('#mechanism-canvas').getBoundingClientRect(), unit = event.deltaMode === 1 ? 16 : 1;
    const scale = Math.max(state.view.width / rect.width, state.view.height / rect.height) * unit;
    const dx = event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX, dy = event.shiftKey ? 0 : event.deltaY;
    closeContextMenu();
    state.view = { ...state.view, x: state.view.x + dx * scale, y: state.view.y + dy * scale };
    scheduleScene();
  }
  function startPan(event, extra = {}) {
    $('#mechanism-canvas').setPointerCapture(event.pointerId);
    state.drag = { kind: 'pan', start: worldPoint(event), view: { ...state.view }, clientStart: { x: event.clientX, y: event.clientY }, pointerId: event.pointerId, moved: false, ...extra };
    document.body.classList.add('canvas-dragging');
  }

  function zoom(factor, center, deferred = false) {
    if (state.gifExport) return;
    closeContextMenu();
    const view = state.view, base = state.baseView;
    const w = K.clamp(view.width * factor, base.width * 0.2, base.width * 3);
    const f = w / view.width;
    const c = center || { x: view.x + view.width / 2, y: view.y + view.height / 2 };
    state.view = { x: c.x - (c.x - view.x) * f, y: c.y - (c.y - view.y) * f, width: w, height: view.height * f };
    if (deferred) scheduleScene(); else renderScene();
  }

  function worldPoint(event) {
    const svg = $('#mechanism-canvas'), point = svg.createSVGPoint();
    point.x = event.clientX; point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    const transformed = matrix ? point.matrixTransform(matrix.inverse()) : { x: 0, y: 0 };
    return { x: transformed.x, y: transformed.y };
  }

  function connectPoint(reference) {
    if (!state.pendingJoint) {
      state.pendingJoint = reference; updateToolbar(); renderScene(); return;
    }
    const a = K.copy(state.pendingJoint), b = K.copy(reference);
    if (a.elementId === b.elementId) { toast('Vyberte uzol iného prvku.', true); return; }
    const ea = state.project.elements.find((e) => e.id === a.elementId), eb = state.project.elements.find((e) => e.id === b.elementId);
    if (!ea || !eb) { state.pendingJoint = null; updateToolbar(); return; }
    // A pin dropped on either end of a slot still follows the entire track.
    if (ea.type === 'slot' && eb.type === 'bearing') a.point = 'curve';
    if (eb.type === 'slot' && ea.type === 'bearing') b.point = 'curve';
    if (a.point === 'curve' && b.point === 'curve') { toast('Spojte vedenie s uzlovým bodom, nie s ďalším vedením.', true); return; }
    if (ea.primary && eb.primary) { toast('Tieto prvky sú už riadené šablónou. Pripojte vlastný prvok.', true); return; }
    const duplicate = state.project.connections.some((j) => (j.a.elementId === a.elementId && j.a.point === a.point && j.b.elementId === b.elementId && j.b.point === b.point) || (j.b.elementId === a.elementId && j.b.point === a.point && j.a.elementId === b.elementId && j.a.point === b.point));
    if (duplicate) { toast('Táto väzba už existuje.', true); state.pendingJoint = null; updateToolbar(); renderScene(); return; }
    if (state.project.connections.length >= 240) { toast('Bol dosiahnutý maximálny počet väzieb.', true); return; }
    const guide = a.point === 'curve' ? ea : b.point === 'curve' ? eb : null;
    previewConnection(a,b,guide?.type === 'cam' ? 'cam-contact' : guide ? 'point-path' : I.suggestJoint(state.project, a, b));
  }

  function touchStart(event) {
    if (event.pointerType !== 'touch' || event.deferredTouch) return false;
    const touch = state.touchGesture ||= { points: new Map(), pinching: false, timer: null };
    touch.points.set(event.pointerId,{x:event.clientX,y:event.clientY});
    // Finger origins, travel and count tell a two- or three-finger tap (Undo / Redo) from a pinch.
    if (touch.points.size === 1) { touch.began = event.timeStamp ?? Date.now(); touch.origins = new Map(); touch.maxPoints = 1; touch.travel = 0; }
    touch.origins.set(event.pointerId, { x: event.clientX, y: event.clientY }); touch.maxPoints = Math.max(touch.maxPoints, touch.points.size);
    clearTimeout(touch.timer);
    if (touch.points.size > 1) {
      if (state.drag) onPointerUp({pointerId:state.drag.pointerId,cancelled:true,touchInternal:true});
      state.project=touch.project; state.history=touch.history;state.historySelections=touch.historySelections;state.future=touch.future;state.futureSelections=touch.futureSelections;state.selectedElementIds=touch.selection;state.pendingJoint=touch.pendingJoint;state.insertingType=touch.insertingType;state.editPivot=touch.editPivot;state.tool=touch.tool;state.result=touch.result;state.samples=touch.samples;state.samplesSignature=null;state.profile=touch.profile;state.dynamic=touch.dynamic;state.forceContext=touch.forceContext;
      if(state.magic&&touch.magic){Object.assign(state.magic,touch.magic);renderMagicImport();}
      repairSelection();renderTree();renderInspector();updateToolbar();renderPlacementTools();
      const [a,b] = [...touch.points.values()]; touch.pinching=true;touch.longPressed=false; touch.distance=Math.hypot(a.x-b.x,a.y-b.y)||1; touch.view=K.copy(state.view); touch.anchor=worldPoint({clientX:(a.x+b.x)/2,clientY:(a.y+b.y)/2});
      event.preventDefault(); return true;
    }
    touch.project=K.copy(state.project);touch.history=[...state.history];touch.historySelections=[...state.historySelections];touch.future=[...state.future];touch.futureSelections=[...state.futureSelections];touch.selection=[...state.selectedElementIds];touch.pendingJoint=state.pendingJoint?K.copy(state.pendingJoint):null;touch.insertingType=state.insertingType;touch.editPivot=state.editPivot;touch.tool=state.tool;touch.result=state.result;touch.samples=state.samples;touch.profile=state.profile;touch.dynamic=state.dynamic;touch.forceContext=state.forceContext;
    touch.magic=state.magic?{points:K.copy(state.magic.points||[]),drawing:K.copy(state.magic.drawing||[]),tool:state.magic.tool,placementType:state.magic.placementType,geometryStarted:state.magic.geometryStarted,detectCandidates:K.copy(state.magic.detectCandidates||[]),detectHistory:[...(state.magic.detectHistory||[])],detectFuture:[...(state.magic.detectFuture||[])],detectEditing:state.magic.detectEditing}:null;
    touch.start={x:event.clientX,y:event.clientY};
    const key=canvasHit(event);
    touch.timer=setTimeout(()=>{
      if(state.touchGesture!==touch || touch.pinching || touch.points.size!==1)return;
      if(state.drag)onPointerUp({pointerId:state.drag.pointerId,cancelled:true,touchInternal:true});
      touch.longPressed=true;openContextMenu({clientX:touch.start.x,clientY:touch.start.y,target:$('#mechanism-canvas')},key);
    },550);
    return false;
  }
  function touchMove(event) {
    const touch=state.touchGesture;if(event.pointerType!=='touch'||!touch)return false;
    touch.points.set(event.pointerId,{x:event.clientX,y:event.clientY});
    const origin = touch.origins?.get(event.pointerId); if (origin) touch.travel = Math.max(touch.travel, Math.hypot(event.clientX - origin.x, event.clientY - origin.y));
    if (touch.longPressed) return true;
    if (!touch.pinching) { if(Math.hypot(event.clientX-touch.start.x,event.clientY-touch.start.y)>8){clearTimeout(touch.timer);touch.moved=true;}if(touch.deferred&&(state.insertingType||state.magic?.placementType)){touch.deferred.clientX=event.clientX;touch.deferred.clientY=event.clientY;} return false; }
    event.preventDefault();
    if(touch.points.size<2)return true;
    const [a,b]=[...touch.points.values()], distance=Math.hypot(a.x-b.x,a.y-b.y)||1, area=$('#mechanism-canvas').getBoundingClientRect(), ratio=touch.distance/distance;
    const width=K.clamp(touch.view.width*ratio,20,20000),height=touch.view.height*width/touch.view.width;
    state.view={x:touch.anchor.x-((a.x+b.x)/2-area.left)/area.width*width,y:touch.anchor.y-((a.y+b.y)/2-area.top)/area.height*height,width,height};renderScene();return true;
  }
  function touchEnd(event) {
    const touch=state.touchGesture;if(!touch||event.touchInternal)return false;
    clearTimeout(touch.timer);touch.points.delete(event.pointerId);
    const handled=touch.pinching||touch.longPressed;
    if(!touch.points.size){
      state.touchGesture=null;
      // A quick tap of two fingers undoes and of three fingers redoes; the pinch view is restored.
      if(touch.maxPoints>=2&&touch.travel<12&&!touch.longPressed&&(event.timeStamp??Date.now())-touch.began<400){
        if(touch.view){state.view=touch.view;renderScene();}
        undo(touch.maxPoints>2);
      }
    }
    return handled;
  }

  function onPointerDown(event) {
    if (state.gifExport) return;
    if (touchStart(event)) return;
    if(event.pointerType==='touch'&&!event.deferredTouch&&(state.tool==='connect'||state.insertingType||state.magic?.placementType)){state.touchGesture.deferred={pointerId:event.pointerId,clientX:event.clientX,clientY:event.clientY,button:event.button,target:event.target,pointerType:'touch',deferredTouch:true,preventDefault(){}};if(state.insertingType||state.magic?.placementType)clearTimeout(state.touchGesture.timer);return;}
    if (state.drag) return;
    // Right button drag pans; a right click without movement still opens the menu (see onContextMenu).
    if (event.button === 2 && event.pointerType !== 'touch') { event.preventDefault(); startPan(event, { button: 2 }); return; }
    // Holding Space turns a left drag into panning anywhere on the canvas, also over entities.
    if (state.spacePan && event.button === 0) { event.preventDefault(); closeContextMenu(); state.spacePan.used = true; startPan(event); return; }
    if (event.button !== 0 && event.button !== 1) return;
    event.preventDefault();
    closeContextMenu();
    state.snapPreview = null; dismissSnapChoices();
    const svg = $('#mechanism-canvas'), point = worldPoint(event);
    svg.focus({ preventScroll: true });
    state.snapSuppressed = !!event.altKey;
    const detectionHandle = event.target.closest?.('[data-detect-handle]');
    if (detectionHandle && state.magic?.step === 2.5 && !state.magic.busy) {
      const m = state.magic; pushDetectionHistory(); state.drag = { kind: 'detection', id: detectionHandle.dataset.id, field: detectionHandle.dataset.detectHandle, index: Number(detectionHandle.dataset.index), pointerId: event.pointerId, before: K.copy(m.detectCandidates) }; svg.setPointerCapture(event.pointerId); return;
    }
    if (state.magic && event.button === 0 && state.tool !== 'pan' && magicPointer(point)) return;
    if (state.insertingType && event.button === 0 && state.tool !== 'pan') {
      const type = state.insertingType; state.insertingType = null; state.tool = 'select';
      addElement(type, point); state.placementPreview = null; state.placementMount = null; renderPlacementTools(); renderSmartSnapPreview(); return;
    }
    const editHandle = event.target.closest('[data-edit-handle]');
    if (editHandle && state.mode === 'edit' && state.tool === 'select' && event.button === 0 && !(event.shiftKey || event.ctrlKey || event.metaKey)) {
      const kind = editHandle.dataset.editHandle;
      if (kind === 'pivot') { transformModal('pivot'); return; }
      svg.setPointerCapture(event.pointerId);
      state.drag = {
        kind: 'manipulation', handle: kind, fixedEnd: editHandle.dataset.fixedEnd || 'a', pointerId: event.pointerId,
        start: point, clientStart: { x: event.clientX, y: event.clientY }, keys: [...state.selectedElementIds],
        pivot: state.editPivot || W.pivot(state.project, state.selectedElementIds, state.result),
        projectBefore: K.copy(state.project), resultBefore: K.copy(state.result),
        historyBefore: [...state.history], historySelectionsBefore: [...state.historySelections],
        futureBefore: state.future, futureSelectionsBefore: state.futureSelections, moved: false,
      };
      document.body.classList.add('canvas-dragging'); return;
    }
    const control = event.target.closest('[data-control]'), elementControl = event.target.closest('[data-element-control]');
    // A repeated plain click on the same spot keeps the current entity for dragging and cycles on release.
    const hits = canvasHit(event, true), repeat = repeatedClick(event, hits);
    const hit = repeat || hits[0] || null, selectedTarget = I.target(state.project, hit);
    const plain = event.button === 0 && !(event.shiftKey || event.ctrlKey || event.metaKey || event.altKey);
    state.press = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, hits, cycle: repeat, plain };
    // In simulation a joint is grabbed by its rigid, movable member, so dragging a shared point moves the mechanism.
    const jointEnd = state.mode === 'simulate' && selectedTarget?.type === 'joint' ? [selectedTarget.joint.a, selectedTarget.joint.b].find((r) => { const v = state.project.elements.find((x) => x.id === r.elementId); return r.point !== 'curve' && v && !K.isElastic(v) && !v.locked && !['ground', 'slot', 'rail'].includes(v.type); }) : null;
    const e = jointEnd ? state.project.elements.find((v) => v.id === jointEnd.elementId) : selectedTarget?.element || state.project.elements.find((e) => e.id === event.target.closest('[data-element]')?.dataset.element);
    const nodeReference = jointEnd || I.reference(selectedTarget);
    const nodeTarget = nodeReference ? { dataset: { element: nodeReference.elementId, point: nodeReference.point } } : null;
    const outlineControl = event.target.closest('[data-outline-control]');
    if (state.dimensionPick && state.tool === 'measure' && event.button === 0) { event.preventDefault(); pickDimensionPoint(event); return; }
    const dimension = event.target.closest('[data-dimension]');
    if (dimension && event.button === 0 && state.tool !== 'pan') { dimensionModal(dimension.dataset.dimension); return; }
    if (state.tool === 'connect' && event.button === 0) {
      if (nodeTarget) connectPoint({ elementId: nodeTarget.dataset.element, point: nodeTarget.dataset.point });
      else if (['slot', 'rail', 'cam'].includes(e?.type)) connectPoint({ elementId: e.id, point: 'curve' });
      else toast('Kliknite na označený uzlový bod alebo drážku kulisy.');
      return;
    }
    if (state.tool === 'select' && event.button === 0 && event.ctrlKey && !event.shiftKey) {
      // On macOS Ctrl+click is the system right click; the contextmenu event opens the menu instead.
      if (isMacPlatform()) return;
      const current = state.selectedElementIds.at(-1), index = hits.indexOf(current);
      selectTarget(hits.length ? hits[(index + 1) % hits.length] : null); return;
    }
    if (state.tool === 'select' && event.button === 0 && (event.shiftKey || event.metaKey || state.multiSelect) && (hit || event.pointerType === 'touch')) { selectTarget(hit, true); return; }
    svg.setPointerCapture(event.pointerId);
    if (state.tool === 'pan' || event.button === 1) {
      state.drag = { kind: 'pan', start: point, view: { ...state.view }, clientStart: { x: event.clientX, y: event.clientY }, pointerId: event.pointerId };
    } else if (state.tool === 'measure') {
      const reference = nodeTarget ? { elementId: nodeTarget.dataset.element, point: nodeTarget.dataset.point } : { x: point.x, y: point.y };
      const a = E.resolvePoint(state.result, reference) || point;
      state.measure = { a: { ...a }, b: { ...a }, referenceA: reference };
      state.drag = { kind: 'measure', pointerId: event.pointerId };
    } else if (state.mode === 'edit' && (outlineControl || elementControl || control)) {
      const kind = outlineControl ? 'outline-control' : elementControl ? 'element-control' : 'control', id = control ? 'slot-1' : e?.id || state.selected;
      const index = Number(outlineControl?.dataset.outlineControl ?? elementControl?.dataset.elementControl ?? control?.dataset.control);
      selectTarget(kind === 'outline-control' ? I.outlineKey(id, index) : I.controlKey(id, index)); state.playing = false;
      state.drag = {
        kind, index, id, pointerId: event.pointerId, start: point, clientStart: { x: event.clientX, y: event.clientY },
        projectBefore: K.copy(state.project), resultBefore: K.copy(state.result),
        historyBefore: [...state.history], historySelectionsBefore: [...state.historySelections],
        futureBefore: state.future, futureSelectionsBefore: state.futureSelections, moved: false,
      };
    } else if (selectedTarget?.type === 'joint' && !jointEnd) {
      selectTarget(hit); state.playing = false;
    } else if (e) {
      const preserveGroup = state.selectedElementIds.length > 1 && state.selectedElementIds.includes(hit);
      selectTarget(hit, false, preserveGroup); state.playing = false;
      const pose = state.result.poses[e.id], p = state.project.parameters;
      if (state.mode === 'edit') {
        if (e.primary) {
          toast('Parametrický prvok: upravte kóty v inšpektore alebo vytvorte voľnú kópiu.', true);
        } else {
          if (!nodeReference || !I.fixed(state.project, nodeReference)) state.drag = {
            kind: 'selection', pointerId: event.pointerId, start: point, clientStart: { x: event.clientX, y: event.clientY },
            keys: nodeReference && (K.isElastic(e) || e.type === 'rail' && K.carriagePoints.includes(nodeReference.point)) ? [I.nodeKey(nodeReference)] : nodeReference && !['node', 'bearing'].includes(e.type) && !preserveGroup ? [I.elementKey(e.id)] : [...state.selectedElementIds], mount: nodeReference && !K.isElastic(e) && !(e.type === 'rail' && K.carriagePoints.includes(nodeReference.point)) && !['node', 'bearing'].includes(e.type) && !preserveGroup ? nodeReference : null, projectBefore: K.copy(state.project), resultBefore: K.copy(state.result),
            historyBefore: [...state.history], historySelectionsBefore: [...state.historySelections],
            futureBefore: state.future, futureSelectionsBefore: state.futureSelections, moved: false, clickSingle: preserveGroup ? hit : null,
            anchor: nodeReference ? K.point(state.result, nodeReference) : pose.a, nodeConnection: !preserveGroup ? nodeReference : null,
          };
        }
      } else if (e.primary && isDoubleDrawer() && ['carrier', 'front', 'bracket', 'pinA', 'pinB', 'rocker', 'rearPin'].includes(e.role)) {
        if (e.role === 'carrier') state.drag = { kind: 'rail', start: point, startMotion: state.motion, pointerId: event.pointerId };
        else {
          const key = nodeTarget?.dataset.point;
          const fraction = K.nearestOnSegment(point, pose.a, pose.b).t;
          state.drag = { kind: 'panel', elementId: e.id, point: key || (e.type === 'bearing' ? 'a' : undefined), fraction, pointerId: event.pointerId };
        }
      } else if (e.primary && state.project.kind === 'drawer' && ['rail', 'panel', 'bearing'].includes(e.type)) {
        const panel = state.result.poses['panel-1'];
        const nearest = K.nearestOnSegment(point, panel.a, panel.b);
        const isPivot = nodeTarget?.dataset.point === 'a' && nodeTarget.dataset.element === 'panel-1';
        state.drag = { kind: e.type === 'rail' || e.role === 'pivot' || isPivot ? 'rail' : 'panel', start: point, startMotion: state.motion, fraction: e.role === 'follower' || nodeTarget?.dataset.point === 'c' ? p.bearingOffset / p.panelLength : nearest.t, pointerId: event.pointerId };
      } else if (e.primary && ['fourbar', 'crank'].includes(state.project.kind) && e.role === 'input') {
        state.drag = { kind: 'crank', center: pose.a, pointerId: event.pointerId };
      } else if (K.isElastic(e) && nodeReference && beginElasticDrag(nodeReference, event.pointerId)) {
        // The construction stays intact; only runtime positions change while held.
      } else if (!e.primary && e.drive && e.type === 'rail') {
        state.drag = { kind: 'custom-rail', start: point, angle: e.angle, startMotion: state.motion, stroke: e.stroke, reversed: !!e.movingRail, pointerId: event.pointerId };
      } else if (!e.primary && e.drive && ['link', 'panel', 'cam', 'motor', 'node'].includes(e.type)) {
        state.drag = e.driveMode === 'linear'
          ? { kind: 'custom-rail', start: point, angle: e.driveAngle, startMotion: state.motion, stroke: e.stroke, pointerId: event.pointerId }
          : { kind: 'custom-crank', center: pose[e.drivePivot || 'a'], offset: e.angle + (e.drivePivot === 'b' ? 180 : e.drivePivot === 'c' && e.localC ? -Math.atan2(e.localC.y, e.localC.x) / K.DEG : 0), pointerId: event.pointerId };
      } else if (!e.primary && !e.locked && beginBodyDrag(nodeReference || {elementId:e.id,point:'a'},point,event.pointerId)) {
        // Hold the constrained body at a runtime pose; release restores force motion.
      } else if (beginGuideDrag(e, event.pointerId)) {
        // A standalone follower can be positioned without prescribing a motor.
      } else if (!e.primary && !e.locked) {
        state.drag = { kind: 'inverse', id: e.id, key: nodeTarget?.dataset.point, fraction: K.nearestOnSegment(point, pose.a, pose.b).t, pointerId: event.pointerId, startPose: K.copy(pose) };
      }
    } else if (state.tool === 'select' && event.button === 0 && event.pointerType !== 'touch') {
      // Dragging on empty canvas selects with a box (Shift/Cmd adds); a plain click there still clears the selection.
      const additive = event.shiftKey || event.metaKey;
      if (!additive) selectTarget(null);
      state.drag = { kind: 'marquee', pointerId: event.pointerId, start: point, end: point, clientStart: { x: event.clientX, y: event.clientY }, clientEnd: { x: event.clientX, y: event.clientY }, additive, base: [...state.selectedElementIds], moved: false };
    } else if (state.tool === 'select' && event.button === 0 && event.pointerType === 'touch') {
      // One finger on empty canvas pans; a tap without movement still clears the selection.
      selectTarget(null); startPan(event);
    } else selectTarget(null);
    if (state.drag) {
      document.body.classList.add('canvas-dragging');
      window.getSelection()?.removeAllRanges();
    }
    renderScene(); updateMotion();
  }

  function onPointerMove(event) {
    if (state.gifExport) return;
    if (touchMove(event)) return;
    const point = worldPoint(event);
    state.snapSuppressed = !!event.altKey;
    state.pointer = point;
    $('#pointer-coordinates').innerHTML = `X: ${fmt(point.x)} <span>Y: ${fmt(point.y)}</span>`;
    if (state.magic?.step === 2) $('#pointer-coordinates').innerHTML = `X: ${fmt(point.x)} px <span>Y: ${fmt(point.y)} px</span>`;
    const placing = state.insertingType || state.magic?.placementType;
    if (placing && !state.drag) { state.snapPreview = placementAt(placing, point).preview; renderSmartSnapPreview(); renderPlacementTools(); return; }
    if (state.magic && state.tool === 'magic-draw' && !state.drag) { state.magic.preview = snapDrawingPoint(point); renderScene(); return; }
    if (state.dimensionPick?.a && !state.drag) {
      const r = I.reference(I.target(state.project, canvasHit(event)));
      state.measure.b = r ? { ...E.resolvePoint(state.result, r) } : point;
      renderScene(); updateHover(canvasHit(event)); return;
    }
    const drag = state.drag;
    if (drag?.kind === 'detection' && event.pointerId === drag.pointerId) {
      const m = state.magic, c = m?.detectCandidates.find((c) => c.id === drag.id); if (!c) return;
      const pixel = M.pixelFromWorld(point, m.scale), target = c[drag.field][drag.index]; target.x = K.clamp(pixel.x, 0, m.image.width); target.y = K.clamp(pixel.y, 0, m.image.height); c.evidence.manual = true; c.motionEvidence = null; renderScene(); return;
    }
    if (!drag || event.pointerId !== drag.pointerId) { if (!state.contextMenuState.isOpen) updateHover(canvasHit(event)); return; }
    event.preventDefault();
    if (drag.kind === 'marquee') {
      drag.end = point; drag.clientEnd = { x: event.clientX, y: event.clientY };
      drag.moved ||= Math.hypot(event.clientX - drag.clientStart.x, event.clientY - drag.clientStart.y) > 4;
      renderMarquee(drag); return;
    }
    if (['rail', 'panel', 'custom-rail', 'inverse', 'crank', 'custom-crank', 'elastic-tip', 'force-body'].includes(drag.kind)) drag.simulationMoved = true;
    if (drag.kind === 'guide-follower') {
      const at = K.nearestOnPath(point, state.result.poses[drag.slotId].path), pose = state.result.poses[drag.id];
      const positions = { ...state.guidePositions, [drag.id]: { x: at.x, y: at.y, angle: pose.angle } };
      const result = K.solve(state.project, state.motion, { maxPasses: DRAG_PASSES, profile: state.profile, collisions: state.collisions, bodyPositions: { ...P.bodyPositions(state.dynamic), ...positions }, elasticPositions: P.elasticPositions(state.dynamic) });
      if (!result.blocked) { state.guidePositions = positions; state.result = result; renderScene(); updateMotion(); }
    } else if (drag.kind === 'force-body') {
      state.dynamic=P.dragBody(state.forceContext,state.dynamic,drag.id,point,drag.local);state.result=solveCurrent();state.result.forces=P.dynamicForces(state.forceContext,state.dynamic,state.result);renderScene();updateMotion();
    } else if (drag.kind === 'elastic-tip') {
      state.dynamic = P.dragTip(state.forceContext, state.dynamic, drag.id, point); state.result = solveCurrent();
      state.result.forces = P.dynamicForces(state.forceContext, state.dynamic, state.result); renderScene(); updateMotion();
    } else if (drag.kind === 'manipulation') {
      if (drag.failed || (!drag.moved && Math.hypot(event.clientX - drag.clientStart.x, event.clientY - drag.clientStart.y) < 3)) return;
      if (!drag.moved) { pushHistory(); drag.moved = true; }
      try {
        if (drag.handle === 'thickness') {
          const id = W.bodies(drag.projectBefore, drag.keys)[0], e = drag.projectBefore.elements.find((e) => e.id === id), pose = drag.resultBefore.poses[id], size = W.thickness(e), normal = K.along({ x: 0, y: 0 }, 1, pose.angle - 90);
          let value = size.value + 2 * ((point.x-drag.start.x)*normal.x + (point.y-drag.start.y)*normal.y);
          if (state.snap && !state.snapSuppressed) value = Math.round(value/5)*5;
          const min = K.isElastic(e) ? (e.type.startsWith('piston-') ? e.rodDiameter : 2 * e.wireDiameter) + .01 : .1;
          state.project = W.setThickness(drag.projectBefore, id, K.clamp(value, min, 500));
        } else if (drag.handle === 'length') {
          const id = W.bodies(drag.projectBefore, drag.keys)[0], e = drag.projectBefore.elements.find((e) => e.id === id), pose = drag.resultBefore.poses[id];
          const direction = K.along({ x: 0, y: 0 }, drag.fixedEnd === 'a' ? 1 : -1, pose.angle);
          let length = e.length + (point.x - drag.start.x) * direction.x + (point.y - drag.start.y) * direction.y;
          if (state.snap && !state.snapSuppressed) length = Math.round(length / 5) * 5;
          state.project = W.setLength(drag.projectBefore, id, K.clamp(length, .1, 5000), drag.fixedEnd, drag.resultBefore);
        } else {
          let dx = drag.handle === 'move-x' ? point.x - drag.start.x : 0, dy = drag.handle === 'move-y' ? point.y - drag.start.y : 0;
          let rotation = drag.handle === 'rotate' ? ((K.angleOf(drag.pivot, point) - K.angleOf(drag.pivot, drag.start) + 540) % 360) - 180 : 0;
          const preview = ['move-x', 'move-y'].includes(drag.handle) ? findDragSnap(drag, { x: dx, y: dy }, drag.handle === 'move-x' ? 'x' : 'y') : null;
          if (preview) { dx = preview.delta.x; dy = preview.delta.y; }
          if (state.snap && !state.snapSuppressed && !preview) {
            if (drag.handle === 'move-x') dx = Math.round((drag.pivot.x + dx) / 5) * 5 - drag.pivot.x;
            if (drag.handle === 'move-y') dy = Math.round((drag.pivot.y + dy) / 5) * 5 - drag.pivot.y;
          }
          if (state.angleSnap && !state.snapSuppressed && drag.handle === 'rotate') {
            const id = W.bodies(drag.projectBefore, drag.keys)[0], angle = drag.resultBefore.poses[id]?.angle || 0;
            rotation = Math.round((angle + rotation) / 10) * 10 - angle;
          }
          state.project = W.transform(drag.projectBefore, drag.keys, { dx, dy, angle: rotation, pivot: drag.pivot }, drag.resultBefore);
        }
        state.result = solveCurrent(); renderScene(); updateMotion();
      } catch (error) { drag.failed = true; toast(error.message, true); }
    } else if (drag.kind === 'selection') {
      if (drag.failed || (!drag.moved && Math.hypot(event.clientX - drag.clientStart.x, event.clientY - drag.clientStart.y) < 3)) return;
      if (!drag.moved) { pushHistory(); drag.moved = true; }
      let delta = { x: point.x - drag.start.x, y: point.y - drag.start.y };
      try {
        const preview = findDragSnap(drag, delta);
        if (preview) delta = preview.delta;
        else if (state.snap && !state.snapSuppressed) delta = { x: Math.round((drag.anchor.x + delta.x) / 5) * 5 - drag.anchor.x, y: Math.round((drag.anchor.y + delta.y) / 5) * 5 - drag.anchor.y };
        state.project = I.translate(drag.projectBefore, drag.keys, delta, drag.resultBefore);
        state.result = solveCurrent(); renderScene(); updateMotion();
      } catch (error) { drag.failed = true; toast(error.message, true); }
    } else if (drag.kind === 'rail') setMotion(drag.startMotion + point.x - drag.start.x);
    else if (drag.kind === 'panel') setMotion(K.inverseDrive(state.project, point, drag.fraction, { profile: state.profile, collisions: false, elementId: drag.elementId, point: drag.point }));
    else if (drag.kind === 'custom-rail') {
      const radians = drag.angle * K.DEG, range = K.configuredDriveRange(state.project);
      const offset = (point.x - drag.start.x) * Math.cos(radians) - (point.y - drag.start.y) * Math.sin(radians);
      setMotion(drag.startMotion + (drag.reversed ? -1 : 1) * offset / drag.stroke * (range.max - range.min));
    }
    else if (drag.kind === 'crank' || drag.kind === 'custom-crank') { let angle = (K.angleOf(drag.center, point) - (drag.offset || 0) + 720) % 360; if (state.angleSnap && !state.snapSuppressed) angle = Math.round(angle / 10) * 10; setMotion(angle); }
    else if (drag.kind === 'inverse') setMotion(K.inverseDrive(state.project, point, drag.fraction, { profile: state.profile, collisions: false, elementId: drag.id, point: drag.key }));
    else if (drag.kind === 'pan') {
      drag.moved ||= Math.hypot(event.clientX - drag.clientStart.x, event.clientY - drag.clientStart.y) > 4;
      const rect = $('#mechanism-canvas').getBoundingClientRect();
      const scale = Math.max(drag.view.width / rect.width, drag.view.height / rect.height);
      state.view = { ...drag.view, x: drag.view.x - (event.clientX - drag.clientStart.x) * scale, y: drag.view.y - (event.clientY - drag.clientStart.y) * scale };
      renderScene();
    } else if (drag.kind === 'measure') { state.measure.b = point; renderScene(); }
    else if (drag.kind === 'element') {
      const e = state.project.elements.find((e) => e.id === drag.id);
      if (!e) return;
      let delta = { x: point.x - drag.start.x, y: point.y - drag.start.y };
      if (e.parentId) delta = K.rotate(delta, -(state.result.poses[e.parentId]?.angle || 0));
      e.x = K.clamp(drag.x + delta.x, -5000, 5000);
      e.y = K.clamp(drag.y + delta.y, -5000, 5000);
      if (state.snap) { e.x = Math.round(e.x / 5) * 5; e.y = Math.round(e.y / 5) * 5; }
      state.ghostEpoch = (state.ghostEpoch || 0) + 1; state.result = solveCurrent();
      renderScene(); updateMotion();
    } else if (drag.kind === 'resize') {
      const e = currentElement(), origin = drag.pose.controlOrigin || drag.pose.a;
      if (!e) return;
      if (drag.key === 'c' && e.type === 'panel') e.localC = K.localPoint({ a: origin, angle: drag.pose.angle }, point);
      else if (drag.key === 'c' && e.type === 'rail') e.stroke = Math.max(1, K.distance(origin, point));
      else {
        e.length = K.clamp(K.distance(origin, point), 1, 2000);
        e.angle = K.angleOf(origin, point) - (e.parentId ? state.result.poses[e.parentId].angle : 0);
        e.angle = ((e.angle + 540) % 360) - 180;
        if (state.snap) e.length = Math.max(1, Math.round(e.length / 5) * 5);
        if (state.angleSnap && !state.snapSuppressed) { const parentAngle = e.parentId ? state.result.poses[e.parentId].angle : 0; e.angle = Math.round((e.angle + parentAngle) / 10) * 10 - parentAngle; }
      }
      state.ghostEpoch = (state.ghostEpoch || 0) + 1; state.result = solveCurrent(); renderScene(); updateMotion();
    } else if (['element-control', 'outline-control', 'control'].includes(drag.kind)) {
      if (drag.failed || !drag.moved && Math.hypot(event.clientX - drag.clientStart.x, event.clientY - drag.clientStart.y) < 3) return;
      if (!drag.moved) { pushHistory(); drag.moved = true; }
      try {
        const snapped = snapDrawingPoint(point, drag.id);
        if (drag.kind === 'control') {
          const next = K.copy(drag.projectBefore), p = next.parameters;
          next.controls ||= K.defaultControls(p);
          next.controls[drag.index] = { x: K.clamp(snapped.x - p.slotOffsetX, -5000, 5000), y: K.clamp(snapped.y - p.slotOffsetY, -5000, 5000) };
          state.project = K.validateProject(next); state.profile = K.slotProfile(state.project);
        } else {
          const pose = drag.resultBefore.poses[drag.id], local = K.localPoint({ a: pose.controlOrigin || pose.a, angle: pose.angle }, snapped);
          state.project = I.setControlPoint(drag.projectBefore, drag.id, drag.index, { x: K.clamp(local.x, -5000, 5000), y: K.clamp(local.y, -5000, 5000) }, drag.kind === 'outline-control');
        }
        state.result = solveCurrent(); renderScene(); updateMotion();
      } catch (error) { drag.failed = true; toast(error.message, true); }
    }
  }

  function beginGuideDrag(e, pointerId) {
    if (e?.type !== 'bearing' || e.primary || e.locked || e.parentId || e.drive) return false;
    // Springs and pistons on the follower are not kinematic constraints: their ends follow the pin.
    const elastic = (j) => [j.a, j.b].some((r) => K.isElastic(state.project.elements.find((v) => v.id === r.elementId)));
    const joints = state.project.connections.filter(j => [j.a,j.b].some(r => r.elementId === e.id) && !elastic(j));
    if (joints.some(j => j.type !== 'point-path')) return false;
    const guide = joints.map(j => j.a.point === 'curve' ? j.a : j.b).find(r => state.project.elements.find(v => v.id === r.elementId)?.type === 'slot');
    const slotId = guide?.elementId || e.slotId;
    if (!state.result.poses[slotId]?.path?.length) return false;
    state.drag = { kind: 'guide-follower', id: e.id, slotId, pointerId, before: K.copy(state.guidePositions || {}) };
    return true;
  }

  function beginElasticDrag(reference, pointerId) {
    const graph=K.elasticGraph(state.project,state.result.poses),group=graph.groups.find((g)=>g.id===graph.ports[`${reference.elementId}:${reference.point}`]);
    if(group?.anchors.length)return false;
    if (!state.forceContext && !prepareForces(true)) return false;
    const context = state.forceContext, id = context.network?.graph.ports[`${reference.elementId}:${reference.point}`];
    if (!context.network?.particles.some((g) => g.id === id)) return false;
    state.dynamic ||= P.initialState(context, state.motion);
    state.drag = { kind: 'elastic-tip', id, pointerId, before: K.copy(state.dynamic) };
    return true;
  }

  function beginBodyDrag(reference, point, pointerId) {
    if(!state.project.elements.some(K.isElastic))return false;
    if (!state.forceContext && !prepareForces(false)) return false;
    const context=state.forceContext;if(!context.bodyDynamics)return false;
    let id=context.bodyDynamics.owners[reference.elementId];
    if(K.isElastic(state.project.elements.find((e)=>e.id===reference.elementId))) {
      const group=context.graph.groups.find((g)=>g.id===context.graph.ports[`${reference.elementId}:${reference.point}`]);id=group?.anchors.map((r)=>context.bodyDynamics.owners[r.elementId]).find((id)=>context.bodyDynamics.bodies.some((b)=>b.id===id));
    }
    if(!context.bodyDynamics.bodies.some((b)=>b.id===id))return false;
    state.dynamic ||= P.initialState(context,state.motion);
    state.drag={kind:'force-body',id,local:K.localPoint(state.result.poses[id],point),pointerId,before:K.copy(state.dynamic)};return true;
  }

  function resumeElasticMotion() {
    if (state.mode !== 'simulate' || state.project.simulation.returnOnRelease === false || !state.project.elements.some(K.isElastic) || state.result.blocked) return;
    state.trial = null; state.trialBlock = null;
    if (state.project.simulation.mode !== 'dynamic') {
      state.project.simulation.mode = 'dynamic'; state.dirty = true; state.saved = false; updateHeader();
      clearTimeout(autosaveTimer); autosaveTimer = setTimeout(() => saveProject(true), 700);
    }
    if (!prepareForces(true, true)) return;
    if (state.dynamic) { state.dynamic.time = 0; state.dynamic.stopped = false; state.dynamic.reason = ''; }
    state.playing = false; actions.play(); renderWorkflowTools();
  }

  function onLostPointerCapture(event) {
    if (!state.drag || state.drag.pointerId !== event.pointerId) return;
    const held = !!(event.buttons & 1) || state.touchGesture?.points.has(event.pointerId);
    if (held && !$('#modal').open && document.hasFocus?.() !== false) {
      try { $('#mechanism-canvas').setPointerCapture(event.pointerId); return; } catch { /* The pointer may already have left the window. */ }
    }
    onPointerUp({pointerId:event.pointerId,cancelled:true});
  }
  function onPointerUp(event) {
    const press = state.press, gesture = state.touchGesture; state.press = null;
    releasePointer(event);
    if (!(gesture && (gesture.maxPoints > 1 || gesture.longPressed))) finishClick(press, event);
  }
  // A plain click (no movement) on the spot of the previous click selects the next overlapping entity.
  function repeatedClick(event, hits) {
    const last = state.lastClick, time = event.timeStamp ?? Date.now();
    if (!last || state.tool !== 'select' || event.button !== 0 || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return null;
    if (hits.length < 2 || !hits.includes(last.key) || Math.hypot(event.clientX - last.x, event.clientY - last.y) > clickRadius(event)) return null;
    // A second click within the double-click interval is a double click, not a cycle.
    if (time - last.time < DOUBLE_CLICK_MS || state.selectedElementIds.length !== 1 || state.selectedElementIds[0] !== last.key) return null;
    return last.key;
  }
  // Double clicks are recognized from pointer releases: the canvas re-renders between clicks and
  // pointerdown is prevented, so the browser's own dblclick event is not delivered reliably.
  function finishClick(press, event) {
    if (!press || event.pointerId !== press.pointerId || event.cancelled || event.type === 'pointercancel' || Math.hypot(event.clientX - press.x, event.clientY - press.y) > clickRadius(event)) return;
    // Only plain left clicks count towards double clicks and cycling; Shift/Ctrl clicks start over.
    if (!press.plain) { state.lastClick = null; return; }
    const time = event.timeStamp ?? Date.now(), last = state.lastClick;
    if (!press.cycle && last && time - last.time < DOUBLE_CLICK_MS && Math.hypot(press.x - last.x, press.y - last.y) <= clickRadius(event)) { state.lastClick = null; onDoubleClick(event); return; }
    const key = press.cycle ? press.hits[(press.hits.indexOf(press.cycle) + 1) % press.hits.length] : state.selectedElementIds.at(-1) ?? null;
    if (press.cycle) selectTarget(key);
    state.lastClick = { x: press.x, y: press.y, time, key };
  }
  // A finger lands less precisely than a mouse pointer.
  function clickRadius(event) {
    return event.pointerType === 'touch' ? 14 : 4;
  }
  function isMacPlatform() {
    return /Mac|iPhone|iPad|iPod/.test(globalThis.navigator?.userAgentData?.platform || globalThis.navigator?.platform || '');
  }
  function renderMarquee(drag) {
    const area = $('#canvas-area');
    if (!area?.getBoundingClientRect || !document.createElement) return;
    let box = area.querySelector('.marquee-box');
    if (!box) { box = document.createElement('div'); box.className = 'marquee-box'; box.setAttribute('aria-hidden', 'true'); area.append(box); }
    const bounds = area.getBoundingClientRect(), a = drag.clientStart, b = drag.clientEnd;
    box.classList.toggle('crossing', b.x < a.x); box.hidden = !drag.moved;
    Object.assign(box.style, { left: `${Math.min(a.x, b.x) - bounds.left}px`, top: `${Math.min(a.y, b.y) - bounds.top}px`, width: `${Math.abs(b.x - a.x)}px`, height: `${Math.abs(b.y - a.y)}px` });
  }
  // Left to right selects bodies fully inside the box, right to left also bodies the box touches.
  function finishMarquee(drag, event) {
    $('#canvas-area').querySelector?.('.marquee-box')?.remove();
    if (!drag.moved || event.cancelled || event.type === 'pointercancel') return;
    const keys = I.boxSelect(state.project, state.result, { a: drag.start, b: drag.end }, drag.clientEnd.x < drag.clientStart.x, (e) => e.visible && viewElementVisible(e.id));
    state.selectedElementIds = [...new Set([...(drag.additive ? drag.base : []), ...keys])];
    state.editPivot = null; repairSelection(); renderTree(); renderInspector(); renderScene(); updateToolbar();
  }
  function releasePointer(event) {
    const touch=state.touchGesture,deferred=touch?.deferred;
    if (touchEnd(event)) return;
    if(deferred&&deferred.pointerId===event.pointerId&&!event.cancelled&&event.type!=='pointercancel'){if(state.insertingType||state.magic?.placementType||!touch.moved)onPointerDown(deferred);return;}
    const drag = state.drag;
    if (drag && event.pointerId !== drag.pointerId) return;
    state.drag = null;
    state.snapPreview = null;
    document.body.classList.remove('canvas-dragging');
    if (drag?.kind === 'pan' && drag.button === 2) {
      if ($('#mechanism-canvas').hasPointerCapture(event.pointerId)) $('#mechanism-canvas').releasePointerCapture(event.pointerId);
      // Windows sends contextmenu after the release, Linux and macOS at the press (kept as menuPending).
      if (drag.moved) { if (!drag.menuPending) state.suppressContextMenuUntil = Date.now() + 500; }
      else if (drag.menuPending && !event.cancelled && event.type !== 'pointercancel') onContextMenu(drag.menuPending);
      return;
    }
    // Dragging a body the drive does not move must not fail silently.
    if (drag?.kind === 'inverse' && drag.simulationMoved && !event.cancelled && event.type !== 'pointercancel') {
      const pose = state.result.poses[drag.id], name = state.project.elements.find((e) => e.id === drag.id)?.name;
      if (pose && drag.startPose && ['a', 'b'].every((key) => !pose[key] || K.distance(pose[key], drag.startPose[key]) < 0.01)) toast(`„${name}“ sa s pohonom nepohybuje, preto ho ťahanie neposunie. Pripojte ho k poháňanému mechanizmu alebo ho presuňte v Úprave geometrie.`, true);
    }
    if (drag?.kind === 'marquee') { if ($('#mechanism-canvas').hasPointerCapture(event.pointerId)) $('#mechanism-canvas').releasePointerCapture(event.pointerId); finishMarquee(drag, event); return; }
    if ($('#mechanism-canvas').hasPointerCapture(event.pointerId)) $('#mechanism-canvas').releasePointerCapture(event.pointerId);
    if (drag?.kind === 'guide-follower' && (event.cancelled || event.type === 'pointercancel')) { state.guidePositions = drag.before; state.result = solveCurrent(); renderScene(); updateMotion(); return; }
    if (['elastic-tip','force-body'].includes(drag?.kind) && (event.cancelled || event.type === 'pointercancel')) { state.dynamic = drag.before; state.result = solveCurrent(); renderScene(); updateMotion(); return; }
    if (drag?.kind === 'detection') { if (event.type === 'pointercancel' || event.cancelled) { state.magic.detectCandidates = drag.before; state.magic.detectHistory.pop(); } renderMagicImport(); renderScene(); return; }
    if (['selection', 'manipulation', 'element-control', 'outline-control', 'control'].includes(drag?.kind)) {
      if (!drag.moved) {
        if (drag.clickSingle) selectTarget(drag.clickSingle);
        if (drag.kind === 'manipulation' && event.type !== 'pointercancel' && !event.cancelled) transformModal(drag.handle, drag.fixedEnd);
        renderBindingTools();
        return;
      }
      if (event.type === 'pointercancel' || event.cancelled || drag.failed || JSON.stringify(state.project) === JSON.stringify(drag.projectBefore)) {
        state.project = drag.projectBefore; state.history = drag.historyBefore; state.historySelections = drag.historySelectionsBefore;
        state.future = drag.futureBefore; state.futureSelections = drag.futureSelectionsBefore;
        recalculate(false); renderTree(); renderInspector(); updateToolbar();
      } else { changed(false); offerSnapConnection(drag.preview, true); }
    }
    if (drag && ['element', 'resize'].includes(drag.kind)) {
      if (event.type === 'pointercancel' || event.cancelled) { state.project = state.history.pop() || state.project; state.historySelections.pop(); }
      try { state.project = K.validateProject(state.project); changed(false); }
      catch (error) { state.project = state.history.pop() || state.project; state.historySelections.pop(); recalculate(false); renderInspector(); toast(error.message, true); }
    }
    if (drag?.kind === 'measure' && !event.cancelled && event.type !== 'pointercancel' && K.distance(state.measure.a, state.measure.b) > 0.1) {
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-point]');
      const b = target ? { elementId: target.dataset.element, point: target.dataset.point } : { ...state.measure.b };
      pushHistory(); state.project.dimensions.push(E.makeDimension(state.result, state.measure.referenceA, b)); changed(false);
      toast('Kóta bola pridaná. Kliknutím na ňu nastavíte typ a odsadenie.');
    }
    if(drag){globalThis.KinmoDebug?.record('gesture-end',{kind:drag.kind,cancelled:!!event.cancelled||event.type==='pointercancel'});globalThis.KinmoDebug?.checkpoint('gesture-end',true);}
    // Drag frames used a capped solver; the resting pose gets the full solve.
    if (drag && state.mode === 'simulate' && !['pan', 'marquee'].includes(drag.kind)) { state.result = solveCurrent(); if (state.dynamic && state.forceContext) state.result.forces = P.dynamicForces(state.forceContext, state.dynamic, state.result); renderScene(); updateMotion(); }
    if (drag?.simulationMoved && !event.cancelled && event.type !== 'pointercancel') resumeElasticMotion();
  }
