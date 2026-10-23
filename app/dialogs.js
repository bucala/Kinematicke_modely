/* Kinematika UI · Dialógy prvkov, väzieb, kót a trajektórií.
   Klasický skript bez IIFE: zdieľa najvyššiu úroveň s ostatnými app/*.js a app.js, ktorý sa načíta posledný
   a definuje stav a konštanty. Súbor obsahuje iba deklarácie funkcií, pri načítaní nič nespúšťa. */
'use strict';
  function helpModal() {
    modal('Obrázkový návod · prvky a funkcie', globalThis.KinmoHelp.manual(), true);
  }

  function tracePointOptions(element, point) {
    return (element ? I.pointKeys(element) : ['a']).map((key) => `<option value="${key}"${key === point ? ' selected' : ''}>${escape(K.pointName(key, element))}</option>`).join('');
  }
  function traceModal() {
    modal(isDoubleDrawer() ? 'Trajektórie v dvoch súradnicových sústavách' : 'Sledujte bod počas celého pohybu.', `${isDoubleDrawer() ? doubleTraceControls() : ''}<p class="modal-description">${isDoubleDrawer() ? 'Voľbou jedného bodu sa vypne spoločné sledovanie ložísk A a B.' : 'Vyberte prvok a jeho uzlový bod. Trajektória sa vypočíta v celom rozsahu pohonu.'}</p><form id="trace-form"><label class="property-field"><span>Prvok mechanizmu</span><select class="property-select" name="element">${state.project.elements.map((e) => `<option value="${escape(e.id)}"${e.id === state.traceRef.elementId ? ' selected' : ''}>${escape(e.name)}</option>`).join('')}</select></label><label class="property-field"><span>Referenčný bod</span><select class="property-select" name="point">${tracePointOptions(state.project.elements.find((e) => e.id === state.traceRef.elementId), state.traceRef.point)}</select></label><div class="modal-actions"><button class="button button-secondary" type="button" data-action="close-modal">Hotovo</button><button class="button button-dark" type="submit">${icon('trace', 16)}Sledovať jeden bod</button></div></form>`);
  }

  function elementModal() {
    const e = currentElement();
    if (!e) return;
    modal('Upraviť prvok', `<form id="element-name-form"><label class="property-field"><span>Názov prvku</span><input class="text-field" name="name" value="${escape(e.name)}" maxlength="80" required/></label><div class="modal-actions"><button class="button button-secondary" type="button" data-action="duplicate">${icon('copy', 16)}Duplikovať</button><button class="button button-dark" type="submit">Uložiť názov</button></div></form>`);
  }

  function nodeOptions(selected, curves = false, none = false, excludeElastic = false) {
    return `${none ? '<option value="">Voľný koniec · poloha prvku</option>' : ''}${state.project.elements.filter((e) => !excludeElastic || !K.isElastic(e)).flatMap((e) => {
      const pose = state.result.poses[e.id];
      const keys = [...I.pointKeys(e).filter((key) => pose?.[key]), ...(curves && ['slot', 'rail', 'cam'].includes(e.type) ? ['curve'] : [])];
      return keys.map((point) => `<option value="${escape(e.id)}|${point}"${selected?.elementId === e.id && selected.point === point ? ' selected' : ''}>${escape(e.name)} · ${point === 'curve' ? e.type === 'cam' ? 'obrys vačky' : 'dráha' : K.pointName(point)}</option>`);
    }).join('')}`;
  }

  function jointModal(id, defaults = {}) {
    const joint = state.project.connections.find((j) => j.id === id);
    const values = joint || defaults;
    if (joint?.builtin) {
      modal('Väzba parametrického modelu', `<p class="modal-description">Táto väzba patrí do analytickej šablóny. Zmena jej typu by zrušila pôvodný pohybový zákon. Vytvorte voľnú editačnú kópiu a upravte ju tam.</p><div class="modal-actions"><button class="button button-dark" data-action="make-editable">Vytvoriť voľnú kópiu</button></div>`);
      return;
    }
    modal(joint ? 'Upraviť kinematickú väzbu' : 'Pridať kinematickú väzbu', `<form id="joint-form" data-id="${escape(id || '')}">
      <label class="property-field"><span>Názov väzby</span><input class="text-field" name="name" maxlength="100" value="${escape(values.name || E.constraintNames[values.type] || 'Otočný kĺb')}" required/></label>
      <label class="property-field"><span>Typ väzby</span><select name="type" class="property-select">${Object.entries(E.constraintNames).map(([type, name]) => `<option value="${type}"${values.type === type ? ' selected' : ''}>${name}</option>`).join('')}</select></label>
      <label class="property-field"><span>Prvý uzol</span><select name="a" class="property-select">${nodeOptions(values.a || { elementId: state.selected, point: 'a' }, true)}</select></label>
      <label class="property-field"><span>Druhý uzol</span><select name="b" class="property-select">${nodeOptions(values.b, true)}</select></label>
      <label class="property-field"><span>Vzdialenosť (mm) alebo relatívny uhol (°)</span><input name="value" class="text-field" type="number" min="-360" max="5000" step=".1" value="${joint?.value || 0}" required/></label>
      <p class="section-description">Kĺb spojí dva body. Čap vo vedení spojí jeden bod s dráhou. Vačkový kontakt vyžaduje obrys vačky a stred ložiska; používa polomer valčeka a predpoklad trvalého dotyku bez odtrhnutia či kontaktných síl. Pevné spojenie vynúti aj relatívny uhol.</p>
      <div class="modal-actions"><button type="button" class="button button-secondary" data-action="tool-connect">Vybrať uzly na plátne</button><button class="button button-dark" type="submit">Uložiť väzbu</button></div></form>`);
  }

  function dimensionReferences(form, data) {
    const previous = state.project.dimensions.find((d) => d.id === form.dataset.id);
    const read = (key) => data.get(key) === `world-${key}` ? form.dataset[key === 'a' ? 'worldA' : 'worldB'] ? JSON.parse(form.dataset[key === 'a' ? 'worldA' : 'worldB']) : previous?.[key] : parseReference(String(data.get(key) || ''));
    return { a: read('a'), b: read('b') };
  }
  function startDimensionPick(form = null) {
    if (state.gifExport || state.magic && !magicWorking()) return;
    closeContextMenu();
    const data = form ? new FormData(form) : null, draft = form ? {
      id: form.dataset.id, name: data.get('name'), type: data.get('type'), offset: data.get('offset'), value: data.get('value'), fixedEnd: data.get('fixed-end'), driving: data.has('driving'),
    } : {};
    if (state.mode !== 'edit') setMode('edit');
    state.analysis = false; state.playing = false;
    state.dimensionPick = { a: null, draft, projectId: state.project.id, previousTool: state.tool === 'measure' ? 'select' : state.tool, previousMagicTool: state.magic?.tool };
    if (state.magic) { state.magic.tool = 'measure'; state.magic.drawing = []; state.magic.preview = null; state.magic.placementType = null; }
    state.tool = 'measure'; state.pendingJoint = null; state.measure = null; state.snapPreview = null; state.pendingSnap = null;
    if ($('#modal').open) $('#modal').close();
    updateToolbar(); renderScene(); $('#mechanism-canvas').focus({ preventScroll: true });
  }
  function cancelDimensionPick() {
    if (!state.dimensionPick) return;
    state.tool = state.dimensionPick.previousTool || 'select';
    if (state.magic) state.magic.tool = state.dimensionPick.previousMagicTool || 'select';
    state.dimensionPick = null; state.measure = null;
  }
  function pickDimensionPoint(event) {
    const pick = state.dimensionPick;
    if (!pick || pick.projectId !== state.project.id) { cancelDimensionPick(); return; }
    const r = I.reference(I.target(state.project, canvasHit(event))) || worldPoint(event), at = E.resolvePoint(state.result, r);
    if (!at) { toast('Vyberte platný bod kóty.', true); return; }
    if (!pick.a) {
      pick.a = K.copy(r); state.measure = { a: { ...at }, b: { ...at }, referenceA: K.copy(r) };
      updateToolbar(); renderScene(); return;
    }
    if (K.distance(E.resolvePoint(state.result, pick.a), at) < K.EPS) { toast('Body A a B musia byť na rôznych miestach.', true); return; }
    const draft = { ...pick.draft, a: pick.a, b: K.copy(r) };
    cancelDimensionPick(); updateToolbar(); renderScene(); dimensionModal(draft.id, draft);
  }
  function dimensionModal(id, draft = {}) {
    const dimension = state.project.dimensions.find((d) => d.id === id), refs = selectedNodeReferences();
    const a = draft.a || dimension?.a || refs[0] || { elementId: state.selected, point: 'a' }, b = draft.b || dimension?.b || refs[1] || { elementId: state.selected, point: a.point === 'b' ? 'a' : 'b' };
    const type = draft.type || dimension?.type || 'distance', measured = E.dimensionValue(state.result, { a, b, type });
    const value = draft.value ?? state.project.connections.find((j) => j.id === dimension?.constraintId)?.value ?? (dimension?.control?.property === 'stroke' ? state.project.elements.find((e) => e.id === dimension.control.elementId)?.stroke : measured) ?? 100;
    const driving = draft.driving ?? !!(dimension?.constraintId || dimension?.control), end = draft.fixedEnd || 'auto';
    modal(dimension ? 'Upraviť kótu' : 'Pridať rozmerovú kótu', `<form id="dimension-form" data-id="${escape(id || '')}" data-auto-value="${draft.value == null && !driving ? '1' : '0'}" data-world-a="${!a.elementId ? escape(JSON.stringify(a)) : ''}" data-world-b="${!b.elementId ? escape(JSON.stringify(b)) : ''}">
      <p class="modal-description">Vyberte uzly zo zoznamu alebo dva body na plátne. Výrazy: <code>300/2</code>, <code>12,5 cm</code>, <code>(20+5)*2 mm</code>. Bez jednotky sa použijú mm. Meracia kóta nemení geometriu.</p>
      <button type="button" class="button button-secondary full-width" data-action="dimension-pick">Vybrať body A a B na plátne</button>
      <label class="property-field"><span>Názov (voliteľný)</span><input class="text-field" name="name" maxlength="100" value="${escape(draft.name ?? dimension?.name ?? '')}"/></label>
      <label class="property-field"><span>Typ kóty</span><select class="property-select" name="type">${[['distance', 'Dĺžka medzi bodmi'], ['horizontal', 'Vodorovná vzdialenosť'], ['vertical', 'Zvislá vzdialenosť'], ['angle', 'Uhol spojnice voči osi X']].map(([kind, name]) => `<option value="${kind}"${type === kind ? ' selected' : ''}>${name}</option>`).join('')}</select></label>
      <label class="property-field"><span>Bod A</span><select name="a" class="property-select" required>${!a.elementId ? '<option value="world-a">Voľný bod A na plátne</option>' : ''}${nodeOptions(a)}</select></label>
      <label class="property-field"><span>Bod B</span><select name="b" class="property-select" required>${!b.elementId ? '<option value="world-b">Voľný bod B na plátne</option>' : ''}${nodeOptions(b)}</select></label>
      <output id="dimension-preview" class="dimension-preview" aria-live="polite">Aktuálne: ${fmt(measured, 3)} ${type === 'angle' ? '°' : 'mm'}</output>
      ${quantityInput('offset', 'Odsadenie popisu (mm)', draft.offset ?? dimension?.offset ?? 25, 'mm', -500, 500)}
      <label class="check-row"><input type="checkbox" name="driving"${driving ? ' checked' : ''}/><span>Riadiaca kóta, zmení rozmer telesa alebo pridá vzdialenostnú väzbu</span></label>
      ${quantityInput('value', 'Predpísaný rozmer (mm)', value, 'mm', .1, 5000)}
      <label class="property-field" id="dimension-fixed-end"><span>Pri zmene dĺžky zachovať bod telesa</span><select name="fixed-end" class="property-select">${[['auto', 'Automaticky (pevný bod alebo pivot pohonu)'], ['a', 'A'], ['b', 'B'], ['center', 'Stred A–B']].map(([key, label]) => `<option value="${key}"${end === key ? ' selected' : ''}>${label}</option>`).join('')}</select></label>
      <p class="section-description" id="dimension-help">Medzi telesami možno riadiť iba dĺžku. Vodorovná a zvislá kóta na jednom jednoduchom člene mení jeho dĺžku pri zachovaní uhla. Uhol a voľné body sú iba meracie. Obrysy upravte samostatne; vonkajšie väzby sa pri zmene rozmeru neposúvajú.</p>
      <div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zrušiť</button><button class="button button-dark" type="submit">Uložiť kótu</button></div></form>`);
    updateDimensionForm($('#dimension-form'));
  }
  function updateDimensionForm(form) {
    if (!form?.elements) return;
    const data = new FormData(form), { a, b } = dimensionReferences(form, data), type = String(data.get('type'));
    const sameBody = a?.elementId && a.elementId === b?.elementId;
    const allowed = a?.elementId && b?.elementId && type !== 'angle' && (type === 'distance' || sameBody);
    const driving = form.elements.namedItem('driving'), value = form.elements.namedItem('value');
    driving.disabled = !allowed; if (!allowed) driving.checked = false;
    value.disabled = !driving.checked;
    $('#dimension-fixed-end', form).hidden = !driving.checked || !sameBody || ![a?.point, b?.point].includes('b');
    const measured = E.dimensionValue(state.result, { a, b, type });
    $('#dimension-preview', form).textContent = `Aktuálne: ${fmt(measured, 3)} ${type === 'angle' ? '°' : 'mm'}`;
    if (form.dataset.autoValue === '1' && measured != null) value.value = Number(Math.max(.1, measured).toFixed(4));
  }
  function submitDimension(form, data) {
    const next = W.applyDimension(state.project, state.result, { ...dimensionReferences(form, data), id: form.dataset.id, type: String(data.get('type')), name: data.get('name'), offset: data.get('offset'), driving: data.has('driving'), value: data.get('value'), fixedEnd: data.get('fixed-end') });
    if (JSON.stringify(next) !== JSON.stringify(state.project)) { state.dimensions = true; applyProject(next); }
    $('#modal').close(); renderScene();
  }

  function geometryModal(outline = false) {
    const e = currentElement();
    if (!e || e.primary) return;
    const points = outline ? e.outline || [] : e.controls;
    modal(outline ? 'Upraviť obrys telesa' : 'Upraviť body vodiacej dráhy', `<form id="geometry-form" data-outline="${outline}">
      <p class="modal-description">Lokálne súradnice v mm, jeden vrchol na riadok vo formáte <code>X;Y</code>. Pridaním alebo odstránením riadka meníte počet bodov. ${outline ? 'Prázdny zoznam obnoví štandardný tvar. Obrys sa používa na kreslenie a CAD, nie na presnú plošnú kolíziu.' : 'Lomená čiara zachová všetky zadané body. Výsledná trajektória je odvodená z väzieb, nie ručne upravená dráha pohybu.'}</p>
      <label class="property-field"><span>${outline ? 'Vrcholov 3–64, alebo prázdny obrys' : e.curveSemicircle ? 'Presne 2 koncové body polkruhu' : `Bodov ${e.curveKind === 'spline' ? '4' : '2'}–${e.curveKind === 'polyline' ? '1001' : '32'}`}</span><textarea name="points" class="geometry-points" spellcheck="false" rows="12">${escape(points.map((p) => `${Number(p.x.toFixed(3))};${Number(p.y.toFixed(3))}`).join('\n'))}</textarea></label>
      <div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zrušiť</button><button class="button button-dark" type="submit">Použiť body</button></div></form>`, true);
  }

  function savedTraceModal(id, referenceOverride = null) {
    const track = state.project.trajectories.find((t) => t.id === id);
    const reference = referenceOverride || track?.reference || { elementId: state.selected || state.traceRef.elementId, point: $('#trace-point')?.value || state.traceRef.point };
    modal(track ? 'Upraviť uloženú trajektóriu' : 'Uložiť trajektóriu bodu', `<form id="saved-trace-form" data-id="${escape(id || '')}">
      <label class="property-field"><span>Názov trajektórie</span><input name="name" class="text-field" maxlength="100" value="${escape(track?.name || `${currentElement()?.name || 'Bod'} · ${reference.point.toUpperCase()}`)}" required/></label>
      <label class="property-field"><span>Sledovaný uzol</span><select class="property-select" name="reference">${nodeOptions(reference)}</select></label>
      <label class="property-field"><span>Farba</span><input type="color" name="color" value="${track?.color || '#4d9b91'}"/></label>
      <label class="property-field"><span>Súradnicová sústava</span><select class="property-select" name="space"><option value="world">Pevná sústava</option>${isDoubleDrawer() ? `<option value="carrier"${track?.space === 'carrier' ? ' selected' : ''}>Zásuvka</option>` : ''}</select></label>
      <label class="check-row"><input type="checkbox" name="visible"${track?.visible !== false ? ' checked' : ''}/><span>Zobraziť trajektóriu</span></label>
      <p class="section-description">Trajektória sa vypočíta z pohybu. Ak chcete meniť jej tvar, vytvorte samostatnú vodiacu krivku a upravte jej body; kinematické väzby potom určia dosiahnuteľný pohyb.</p>
      <div class="modal-actions">${track ? `<button type="button" class="button button-secondary" data-action="trace-to-path" data-id="${escape(track.id)}">Vytvoriť editovateľnú vodiacu krivku</button>` : ''}<button class="button button-dark" type="submit">Uložiť trajektóriu</button></div></form>`);
  }

  function applyProject(next) {
    const validated = K.validateProject(next);
    pushHistory(); state.project = validated;
    state.playing = false; changed(false);
  }
