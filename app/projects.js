/* Kinematika UI · Projekty, knižnica podzostáv a pomenované verzie.
   Klasický skript bez IIFE: zdieľa najvyššiu úroveň s ostatnými app/*.js a app.js, ktorý sa načíta posledný
   a definuje stav a konštanty. Súbor obsahuje iba deklarácie funkcií, pri načítaní nič nespúšťa. */
'use strict';
  function loadProject(project, imported = null, magicDraft = false) {
    if (state.magic && !magicDraft) { toast('Najskôr dokončite alebo zrušte Magic import.', true); return; }
    closeContextMenu();
    if(!magicDraft)automaticVersion();
    clearTimeout(autosaveTimer);
    state.measurements=[];state.measureRuntime=[];state.measureTime=0;state.lesson=null;if($('#lesson-panel'))$('#lesson-panel').hidden=true;
    state.project = K.copy(project); state.history = []; state.future = []; state.historySelections = []; state.futureSelections = [];
    state.motion = imported?.motion ?? K.driveRange(project).min; state.playing = false; state.saved = false; state.dirty = false; state.storageFailed = false;
    state.direction = (project.elements.find((e) => e.drive)?.driveSpeed ?? 1) < 0 ? -1 : 1;
    state.selected = projectSelection(project);
    state.selectedElementIds = state.selected ? [I.elementKey(state.selected)] : []; state.hoveredTargetId = null;
    state.traceRef = isDoubleDrawer() ? { elementId: 'bearing-1', point: 'a' } : defaultTraceReference();
    state.traceMode = isDoubleDrawer() ? 'bearings' : 'single'; state.traceSpace = 'world';
    state.pendingJoint = null; state.dimensionPick = null; state.measure = null; state.tool = 'select'; state.analysis = false; state.inspectorTab = 'geometry'; state.view = null;
    state.inspectorOpen = false; updateInspectorVisibility();
    state.editPivot = null; state.diagnosticAnalysis = null;
    state.multiSelect=false;state.isolatedIds=null;state.motorCapacityCache=null;state.expandedAssemblies={};state.motorGuardStarted=false;state.motorGuardLastMotion=null;
    state.smartSnap = false; state.snapPreview = null; state.pendingSnap = null; state.snapTransaction = null; state.insertingType = null; state.placementPreview = null; state.placementMount = null; state.snapSuppressed = false; state.quickChecks = null; state.trial = null; state.trialBlock = null; state.planTime = 0; state.freedomCache = null; state.phasePick = null; state.pendingPlanDraft = null;
    state.mode = imported?.workspace?.mode || (project.kind === 'custom' ? 'edit' : 'simulate');
    if (imported?.workspace) applyPreferences(imported.workspace, true);
    $('#modal').close();
    recalculate(true); renderTree(); renderInspector(); updateHeader(); updateToolbar();
    if (!magicDraft) saveProject(true);
    if (!state.magic && !magicDraft) toast(`Projekt „${project.name}“ je pripravený.`);
  }

  function replaceProject(project, imported = null) {
    if (state.gifExport) { toast('Najprv dokončite alebo zrušte GIF export.', true); return; }
    if (state.magic) { toast('Najskôr dokončite alebo zrušte Magic import.', true); return; }
    if (!state.dirty || saveProject(true)) { loadProject(project, imported); return; }
    state.pendingProject = project;
    state.pendingImport = imported;
    modal('Nahradiť neuložený projekt?', `<p class="modal-description">Lokálne úložisko nie je dostupné. Aktuálny projekt najskôr exportujte, ak ho chcete zachovať.</p><div class="modal-actions"><button class="button button-secondary" data-action="export-kinmo">Exportovať aktuálny projekt</button><button class="button button-dark" data-action="confirm-replace">Nahradiť projekt</button></div>`);
  }

  function readCollection(kind) {
    if (!Object.hasOwn(collectionKeys, kind)) throw new Error('Nepodporované lokálne úložisko.');
    let text;
    try { text = localStorage.getItem(collectionKeys[kind]); } catch { throw new Error('Lokálne úložisko knižnice a verzií nie je dostupné. Výber alebo verziu môžete exportovať samostatne.'); }
    return text ? W.normalizeCollection(text, kind) : [];
  }

  function writeCollection(kind, records) {
    if (!Object.hasOwn(collectionKeys, kind)) throw new Error('Nepodporované lokálne úložisko.');
    const text = W.serializeCollection(records, kind);
    try { localStorage.setItem(collectionKeys[kind], text); } catch { throw new Error('Záznam sa nepodarilo uložiť. Úložisko môže byť plné alebo zakázané. Exportujte ho do súboru; pôvodné záznamy zostali zachované.'); }
  }

  function collectionRecord(kind, id) {
    const record = readCollection(kind).find((r) => r.id === id);
    if (!record) throw new Error('Záznam už nie je v lokálnom úložisku.');
    return record;
  }

  function recordSaveModal(kind) {
    const assembly = kind === 'assembly', keys = [...state.selectedElementIds];
    if (assembly && (state.project.kind !== 'custom' || !keys.length)) { toast('Vyberte členy vo vlastnom modeli alebo vo voľnej kópii šablóny.', true); return; }
    modal(assembly ? 'Uložiť vlastnú podzostavu' : 'Uložiť pomenovanú verziu', `<p class="modal-description">${assembly ? 'Uložia sa celé vybrané členy, nesení potomkovia, vnútorné väzby, vlastné kóty a trajektórie. Skryté ukotvenia zostanú. Väzby a montáže na nevybrané telesá sa neprenesú. Ukladá sa návrhová geometria, nie okamžitá animovaná poloha.' : 'Snímka zachová natívny projekt, fyziku, vzhľad, režim a polohu pohonu. História Späť a dočasné náhľady sa neprenášajú; inteligentné prichytávanie sa neaktivuje.'}</p><form id="workbench-save-form" data-kind="${kind}" data-keys="${escape(JSON.stringify(keys))}"><label class="property-field"><span>${assembly ? 'Názov podzostavy' : 'Názov verzie'}</span><input class="text-field" name="name" maxlength="80" placeholder="${assembly ? 'Napríklad dvojramenný držiak' : 'Napríklad širšie čelo'}" required autofocus/></label><p class="section-description">Len tento prehliadač, bez synchronizácie. Limit ${W.collectionLimits[kind]} záznamov a 2 MB na kolekciu. Staršie záznamy sa nevymazávajú automaticky.</p><div class="modal-actions"><button type="button" class="button button-secondary" data-action="export-workbench-draft">Exportovať samostatne</button><button type="submit" class="button button-dark">Uložiť lokálne</button></div></form>`);
  }

  function draftRecord(form, data) {
    const kind = form.dataset.kind, name = String(data.get('name') || '');
    return kind === 'assembly' ? W.captureAssembly(state.project, JSON.parse(form.dataset.keys), name, state) : kind === 'revision' ? W.createRevision(state.project, name, { workspace: state, motion: state.motion }) : (() => { throw new Error('Nepodporovaný záznam.'); })();
  }

  function submitWorkbenchSave(form, data) {
    const kind = form.dataset.kind, record = draftRecord(form, data), records = readCollection(kind);
    writeCollection(kind, [record, ...records]);
    if (kind === 'assembly') assembliesModal(state.assemblyInsertPoint); else revisionsModal(state.revisionScope);
    toast(kind === 'assembly' ? 'Podzostava bola uložená do vlastnej knižnice.' : 'Pomenovaná verzia bola uložená.');
  }

  function exportCollection(kind, records = readCollection(kind), name = null) {
    const title = name || (kind === 'assembly' ? 'moja-kniznica' : 'verzie-projektov');
    const slug = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 80) || 'kinmo';
    download(`${slug}.${kind === 'assembly' ? 'kinmolib' : 'kinmoversions'}`, W.serializeCollection(records, kind), 'application/json');
  }

  function importCollection(text, kind) {
    const records = W.mergeCollection(readCollection(kind), text, kind);
    writeCollection(kind, records);
    if (kind === 'assembly') assembliesModal(state.assemblyInsertPoint); else revisionsModal('all');
    toast('Záznamy boli pridané bez prepísania existujúcich položiek.');
  }

  function collectionErrorModal(kind, error) {
    modal(kind === 'assembly' ? 'Knižnica podzostáv' : 'Pomenované verzie', `<p class="modal-description">${escape(error.message)}</p><p class="section-description">Existujúce úložisko sa nemení. Aktuálny výber alebo verziu môžete exportovať bez lokálneho uloženia.</p><div class="modal-actions"><button class="button button-secondary" data-action="${kind === 'assembly' ? 'save-assembly' : 'save-revision'}">Pripraviť samostatný export</button><button class="button button-secondary" data-action="projects">Projekty</button></div>`);
  }

  function assembliesModal(at = null) {
    state.assemblyInsertPoint = at || state.assemblyInsertPoint || { x: state.view ? state.view.x + state.view.width / 2 : state.pointer.x, y: state.view ? state.view.y + state.view.height / 2 : state.pointer.y };
    let records;
    try { records = readCollection('assembly'); } catch (error) { collectionErrorModal('assembly', error); return; }
    modal('Vlastná knižnica podzostáv', `<p class="modal-description">Samostatné kópie celých členov a vnútorných väzieb. Každé vloženie dostane nové identifikátory a nemení originál. V modeli ostáva najviac jeden pohon.</p><div class="collection-toolbar"><button class="button button-dark" data-action="save-assembly"${state.project.kind !== 'custom' || !state.selectedElementIds.length ? ' disabled' : ''}>Uložiť aktuálny výber</button><button class="button button-secondary" data-action="import-collection" data-kind="assembly">Importovať .kinmolib</button><button class="button button-secondary" data-action="export-collection" data-kind="assembly"${!records.length ? ' disabled' : ''}>Exportovať knižnicu</button></div><div class="collection-list">${records.length ? records.map((r) => `<article class="collection-card"><div><strong>${escape(r.name)}</strong><small>${r.file.project.elements.length} prvkov · ${r.file.project.connections.length} väzieb · ${escape(new Date(r.createdAt).toLocaleDateString('sk-SK'))}</small></div><div class="collection-actions"><button data-action="insert-library" data-id="${escape(r.id)}">Vložiť…</button><button data-action="open-library-project" data-id="${escape(r.id)}">Otvoriť kópiu</button><button data-action="export-record" data-kind="assembly" data-id="${escape(r.id)}">Exportovať</button><button data-action="delete-record" data-kind="assembly" data-id="${escape(r.id)}">Odstrániť…</button></div></article>`).join('') : '<p class="empty-projects">Knižnica je prázdna. Vyberte členy pomocou Shift/Ctrl + klik a uložte výber. Šablónu najskôr preveďte na voľnú kópiu.</p>'}</div><div class="modal-actions"><button class="button button-secondary" data-action="projects">Späť na projekty</button></div>`, true);
  }

  function insertLibraryModal(id) {
    const record = collectionRecord('assembly', id), origin = state.assemblyInsertPoint || state.pointer;
    const driven = record.file.project.elements.some((e) => e.drive), canDrive = driven && state.project.kind === 'custom' && !state.project.elements.some((e) => e.drive);
    modal(`Vložiť: ${record.name}`, `<p class="modal-description">Bod X / Y je uložený referenčný začiatok podzostavy. Vonkajšie väzby doplňte po vložení. ${driven && !canDrive ? 'Model už má riadený vstup alebo chránený pohybový zákon. Pohon podzostavy bude pasívny.' : 'Vloženie tvorí jeden krok Späť.'}</p><form id="library-insert-form" data-id="${escape(id)}"><div class="settings-fields"><label class="property-field"><span>Vloženie X (mm)</span><input class="text-field" name="x" type="number" min="-5000" max="5000" step="any" value="${origin.x}" required/></label><label class="property-field"><span>Vloženie Y (mm)</span><input class="text-field" name="y" type="number" min="-5000" max="5000" step="any" value="${origin.y}" required/></label></div>${canDrive ? '<label class="check-row"><input type="checkbox" name="keep-drive" checked/><span>Zachovať jediný pohon podzostavy aj jeho rozsah</span></label>' : ''}<div class="modal-actions"><button class="button button-secondary" type="button" data-action="close-modal">Zrušiť</button><button class="button button-dark" type="submit">Vložiť kópiu</button></div></form>`);
  }

  function submitLibraryInsert(form, data) {
    const record = collectionRecord('assembly', form.dataset.id), previous = new Set(state.project.elements.map((e) => e.id));
    const next = W.insertAssembly(state.project, record, { x: Number(data.get('x')), y: Number(data.get('y')) }, data.has('keep-drive'));
    const keys = next.elements.filter((e) => !previous.has(e.id) && e.visible).map((e) => I.elementKey(e.id));
    editCanvas(next, 'Samostatná podzostava bola vložená. Vonkajšie väzby môžete doplniť na plátne.', keys); $('#modal').close();
  }

  function revisionsModal(scope = 'current') {
    state.revisionScope = scope === 'all' ? 'all' : 'current';
    let all;
    try { all = readCollection('revision'); } catch (error) { collectionErrorModal('revision', error); return; }
    const records = all.filter((r) => state.revisionScope === 'all' || r.projectId === state.project.id);
    modal('Pomenované verzie projektu', `<p class="modal-description">Uložte návrhové varianty, porovnajte rozmery a obnovte starší stav. Pred obnovením sa aktuálny stav vždy uloží ako záložná verzia. Záznamy sú iba v tomto prehliadači; export vytvorí prenosnú zálohu.</p><div class="collection-toolbar"><button class="button button-dark" data-action="save-revision">Uložiť novú verziu</button><button class="button button-secondary" data-action="compare-revisions"${!records.length ? ' disabled' : ''}>Porovnať rozmery</button><button class="button button-secondary" data-action="import-collection" data-kind="revision">Importovať verzie</button><button class="button button-secondary" data-action="export-collection" data-kind="revision"${!all.length ? ' disabled' : ''}>Exportovať všetky</button></div><label class="property-field"><span>Zobraziť záznamy</span><select class="property-select" id="revision-scope"><option value="current"${state.revisionScope === 'current' ? ' selected' : ''}>Aktuálny projekt</option><option value="all"${state.revisionScope === 'all' ? ' selected' : ''}>Všetky projekty</option></select></label><div class="collection-list">${records.length ? records.map((r) => `<article class="collection-card"><div><strong>${escape(r.name)}</strong><small>${escape(r.file.project.name)} · ${escape(new Date(r.createdAt).toLocaleString('sk-SK'))}</small></div><div class="collection-actions"><button data-action="restore-revision" data-id="${escape(r.id)}">Obnoviť…</button><button data-action="export-record" data-kind="revision" data-id="${escape(r.id)}">Exportovať</button><button data-action="delete-record" data-kind="revision" data-id="${escape(r.id)}">Odstrániť…</button></div></article>`).join('') : '<p class="empty-projects">Zatiaľ tu nie je uložená pomenovaná verzia.</p>'}</div><p class="section-description">Limit ${W.collectionLimits.revision} verzií a 2 MB spolu. Obnovenie potrebuje miesto pre zálohu aktuálneho stavu; plné alebo nedostupné úložisko obnovenie zastaví.</p><div class="modal-actions"><button class="button button-secondary" data-action="projects">Späť na projekty</button></div>`, true);
  }

  function restoreRevisionModal(id) {
    const record = collectionRecord('revision', id);
    state.pendingRevisionId = id;
    modal('Obnoviť pomenovanú verziu?', `<p class="modal-description">Obnovíte „${escape(record.name)}“ projektu „${escape(record.file.project.name)}“. Aktuálny stav najskôr uložíme ako verziu „Pred obnovením…“. Ak sa záloha nepodarí, projekt sa nezmení. História Späť sa po obnovení začne nanovo a Vlastnosti zostanú skryté.</p><div class="modal-actions"><button class="button button-secondary" data-action="close-modal">Zrušiť</button><button class="button button-dark" data-action="confirm-revision-restore">Zálohovať a obnoviť</button></div>`);
  }

  function confirmRevisionRestore() {
    const records = readCollection('revision'), record = records.find((r) => r.id === state.pendingRevisionId);
    if (!record) throw new Error('Verzia už nie je dostupná.');
    const backup = W.createRevision(state.project, `Pred obnovením ${record.name} · ${new Date().toLocaleString('sk-SK')}`.slice(0, 80), { workspace: state, motion: state.motion });
    writeCollection('revision', [backup, ...records]);
    const restored = W.restoreRevision(record);
    state.pendingRevisionId = null;
    replaceProject(restored.project, restored);
  }

  function comparisonModal() {
    const records = readCollection('revision').filter((r) => state.revisionScope === 'all' || r.projectId === state.project.id);
    if (!records.length) { toast('Najskôr uložte aspoň jednu pomenovanú verziu.', true); return; }
    const options = (selected) => `<option value="current"${selected === 'current' ? ' selected' : ''}>Aktuálny stav</option>${records.map((r) => `<option value="${escape(r.id)}"${selected === r.id ? ' selected' : ''}>${escape(r.name)} · ${escape(r.file.project.name)}</option>`).join('')}`;
    modal('Porovnať návrhové rozmery', `<p class="modal-description">Porovnávajú sa návrhové polohy, rozmery členov, uložené kóty, parametre a dorazy. Nie okamžité animované polohy, sila ani výrobná vhodnosť. Rovnaké identifikátory označujú rovnaké členy; nezávislé kópie sa zobrazia ako pridané alebo odstránené.</p><form id="revision-compare-form"><div class="settings-fields"><label class="property-field"><span>Predtým</span><select class="property-select" name="before">${options(records[0].id)}</select></label><label class="property-field"><span>Potom</span><select class="property-select" name="after">${options('current')}</select></label></div><label class="check-row"><input type="checkbox" name="changes-only" checked/><span>Iba zmenené rozmery</span></label><div class="modal-actions"><button class="button button-dark" type="submit">Porovnať</button></div></form><div id="revision-comparison" aria-live="polite"></div>`, true);
  }

  function submitRevisionComparison(data) {
    const records = readCollection('revision');
    const project = (key) => {
      if (key === 'current') return state.project;
      const record = records.find((r) => r.id === key);
      if (!record) throw new Error('Zvolená verzia už nie je dostupná.');
      return record.file.project;
    };
    const rows = W.compareDimensions(project(String(data.get('before'))), project(String(data.get('after')))).filter((r) => !data.has('changes-only') || r.status !== 'same');
    $('#revision-comparison').innerHTML = rows.length ? `<div class="comparison-scroll"><table class="comparison-table"><thead><tr><th>Rozmer</th><th>Predtým</th><th>Potom</th><th>Rozdiel</th><th>Stav</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${escape(r.label)}</td><td>${fmt(r.before, 3)} ${escape(r.unit)}</td><td>${fmt(r.after, 3)} ${escape(r.unit)}</td><td>${r.delta == null ? '—' : `${r.delta > 0 ? '+' : ''}${fmt(r.delta, 3)} ${escape(r.unit)}`}</td><td>${({ same: 'Bez zmeny', changed: 'Zmenené', added: 'Pridané', removed: 'Odstránené' })[r.status]}</td></tr>`).join('')}</tbody></table></div>` : '<p class="section-description">Zvolené návrhové rozmery sa nezmenili.</p>';
  }

  function deleteRecordModal(kind, id) {
    const record = collectionRecord(kind, id);
    state.pendingCollectionDelete = { kind, id };
    modal('Odstrániť lokálny záznam?', `<p class="modal-description">Odstránite „${escape(record.name)}“. Otvorený projekt a ostatné záznamy sa nezmenia. Vymazanie knižnice alebo verzie nemá krok Späť; najskôr si môžete uložiť súbor.</p><div class="modal-actions"><button class="button button-secondary" data-action="export-record" data-kind="${kind}" data-id="${escape(id)}">Exportovať záznam</button><button class="button button-secondary" data-action="close-modal">Zrušiť</button><button class="button button-dark" data-action="confirm-record-delete">Odstrániť iba tento záznam</button></div>`);
  }

  function confirmRecordDelete() {
    const pending = state.pendingCollectionDelete;
    if (!pending) return;
    collectionRecord(pending.kind, pending.id);
    writeCollection(pending.kind, readCollection(pending.kind).filter((r) => r.id !== pending.id));
    state.pendingCollectionDelete = null;
    if (pending.kind === 'assembly') assembliesModal(state.assemblyInsertPoint); else revisionsModal(state.revisionScope);
    toast('Zvolený lokálny záznam bol odstránený.');
  }

  function readProjects() {
    try {
      const records = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!Array.isArray(records) || records.length > 20) throw new Error();
      const ids = new Set();
      return records.map((record) => {
        const p = K.validateProject(record);
        if (!record?.id || p.id !== record.id || ids.has(p.id)) throw new Error();
        ids.add(p.id); return p;
      });
    } catch { throw new Error('Projektové úložisko nie je dostupné alebo má poškodený obsah. Dáta sa neprepísali; aktuálny projekt môžete exportovať do .kinmo.'); }
  }

  function duplicateProject(id = state.project.id, prepared = false) {
    if (state.magic || state.gifExport) return;
    try {
      const records = readProjects(), source = prepared ? DD.create() : id === state.project.id ? state.project : records.find((p) => p.id === id);
      if (!source) throw new Error('Projekt na duplikovanie už nie je uložený.');
      const copy = K.copy(K.validateProject(source)), ids = new Set([state.project.id, ...records.map((p) => p.id)]);
      for (let attempt = 0; attempt < 64 && ids.has(copy.id); attempt++) copy.id = K.uid();
      if (ids.has(copy.id)) throw new Error('Nepodarilo sa vytvoriť samostatný identifikátor kópie.');
      const base = source.name.slice(0, 80), names = new Set(records.map((p) => p.name));
      copy.name = `${base} · kópia`;
      for (let n = 2; names.has(copy.name); n++) copy.name = `${base} · kópia ${n}`;
      const preserveCurrent = state.dirty || state.saved || state.project.elements.length;
      const next = [copy, ...(preserveCurrent ? [K.copy(K.validateProject(state.project))] : []), ...records.filter((p) => !preserveCurrent || p.id !== state.project.id)];
      if (next.length > 20) throw new Error('Úložisko obsahuje 20 projektov. Najskôr vymažte nepotrebný projekt. Duplikovanie nevymaže pôvodný ani staršie projekty.');
      localStorage.setItem(storageKey, JSON.stringify(next));
      clearTimeout(autosaveTimer);
      loadProject(copy, { motion: id === state.project.id && !prepared ? state.motion : K.driveRange(copy).min, workspace: { ...X.preferences(state), mode: state.mode } }, true);
      state.saved = true; state.dirty = false; state.storageFailed = false;
      try { localStorage.setItem(lastKey, copy.id); } catch { /* The copy and original are already safely stored. */ }
      updateHeader(); toast(`Samostatná kópia „${copy.name}“ bola vytvorená a otvorená.`);
    } catch (error) { toast(error.message, true); }
  }

  function deleteProjectModal(id) {
    try {
      const project = readProjects().find((p) => p.id === id);
      if (!project) throw new Error('Tento uložený projekt už neexistuje. Šablóny nemožno vymazať.');
      state.pendingProjectDelete = id;
      modal('Vymazať uložený projekt?', `<p class="modal-description">Vymaže sa iba „${escape(project.name)}“ z tohto prehliadača. ${id === state.project.id ? 'Aktuálny projekt sa zavrie a otvorí sa čistý pracovný priestor. ' : ''}Šablóny, ostatné projekty, podzostavy a pomenované verzie zostanú. Odstránenie nemožno vrátiť cez Späť; projekt si môžete najskôr exportovať.</p><div class="modal-actions"><button class="button button-secondary" data-action="projects">Zrušiť</button><button class="button button-dark" data-action="confirm-project-delete">Vymazať tento projekt</button></div>`);
    } catch (error) { toast(error.message, true); }
  }

  function confirmProjectDelete() {
    const id = state.pendingProjectDelete;
    if (!id || state.magic || state.gifExport) return;
    try {
      const records = readProjects();
      if (!records.some((p) => p.id === id)) throw new Error('Projekt už nie je uložený. Nič sa nevymazalo.');
      localStorage.setItem(storageKey, JSON.stringify(records.filter((p) => p.id !== id)));
      if (id === state.project.id) {
        clearTimeout(autosaveTimer); loadProject(K.preset('custom'), null, true);
        state.saved = false; state.dirty = false; updateHeader();
      }
      try { if (localStorage.getItem(lastKey) === id) localStorage.removeItem(lastKey); } catch { /* Loading ignores a missing project. */ }
      state.pendingProjectDelete = null; projectsModal(); toast('Vymazal sa iba potvrdený projekt.');
    } catch (error) { toast(error.message, true); }
  }

  function projectsModal() {
    state.pendingProjectDelete = null; state.pendingImpact = null; state.referenceDraft = null;
    let projects = [], storageError = '';
    try { projects = readProjects(); } catch (error) { storageError = error.message; }
    const saved = projects.map((p) => `<div class="project-catalog-row"><button class="saved-project" data-action="load-saved" data-id="${escape(p.id)}"><span class="saved-project-icon">${icon('mechanism', 22)}</span><span><strong>${escape(p.name)}</strong><small>${p.elements.length} prvkov · ${p.id === state.project.id ? 'Aktuálny projekt · ' : ''}${p.kind === DD.KIND ? 'Dvojkulisový projekt · odhad' : p.kind === 'drawer' ? 'Výsuv a kulisa' : '2D mechanizmus'}</small></span>${icon('arrow', 16)}</button><div class="project-row-actions">${ib('copy', 'duplicate-project', `Duplikovať ${p.name}`, false, `data-id="${escape(p.id)}"`)}${ib('trash', 'delete-project', `Vymazať ${p.name}`, false, `data-id="${escape(p.id)}"`)}</div></div>`).join('');
    modal('Mechanizmy a projekty', `<p class="modal-description">Všetky šablóny, pripravené aj uložené projekty sú na jednom mieste. Otvorením šablóny vznikne samostatný projekt.</p>
      <div class="collection-toolbar"><button class="button button-secondary magic-import-button" data-action="magic-import" aria-controls="magic-wizard" aria-expanded="false">${icon('import', 16)}Magic import · schéma z obrázka</button><button class="button button-secondary" data-action="assemblies">${icon('layers', 16)}Vlastné podzostavy</button><button class="button button-secondary" data-action="revisions">${icon('copy', 16)}Pomenované verzie</button></div>
      <h3 class="projects-section-title">Šablóny mechanizmov</h3>${templateCards()}
      <h3 class="projects-section-title">Pripravený projekt podľa náčrtu</h3><div class="project-catalog-row"><button class="saved-project" data-action="load-double-drawer"><span class="saved-project-icon">${icon('folder', 22)}</span><span><strong>${escape(DD.NAME)}</strong><small>Dve pohyblivé kulisy · tuhé rameno · dve fázy</small><span class="project-estimate">ODHADOVÉ ROZMERY · 390 / 300 mm</span></span>${icon('arrow', 16)}</button>${ib('copy', 'duplicate-prepared', 'Duplikovať pripravený projekt')}${ib('info', 'project-info', 'Zobraziť náčrt a predpoklady projektu')}</div>
      <h3 class="projects-section-title">Uložené v tomto prehliadači · ${projects.length} / 20</h3><div class="projects-list">${storageError ? `<p class="magic-error" role="alert">${escape(storageError)}</p>` : saved || '<div class="empty-projects">Zatiaľ nemáte uložené projekty.<br>Aktuálny model uložte tlačidlom Uložiť.</div>'}</div>
      <div class="modal-actions"><button class="button button-secondary" data-action="duplicate-project">${icon('copy', 16)}Duplikovať aktuálny</button><button class="button button-secondary" data-action="rename">${icon('settings', 16)}Premenovať aktuálny</button><button class="button button-secondary" data-action="import">${icon('import', 16)}Importovať</button></div>`, true);
  }

  function projectInfoModal() {
    const p = isDoubleDrawer() ? state.project.parameters : DD.defaults;
    modal(DD.NAME, `<p class="modal-description">Odhadová kinematická rekonštrukcia trojpolohového náčrtu. Geometria je vzájomne kompatibilná, nie zmeraná z obrázka.</p><div class="project-assumption-warning">${icon('warning', 20)}<p><strong>Nie je to výrobný výkres.</strong> Nákres nemá kóty. Korpus ${fmt(p.frameLength)} mm, zdvih ${fmt(p.travelMax - p.travelMin)} mm, rameno ${fmt(p.armLength)} mm a čelo ${fmt(p.panelLength)} mm sú odhady.</p></div><div class="project-info-grid"><section><h3>Potvrdené uloženie</h3><ul><li>Obe zakrivené kulisy sa pohybujú so zásuvkou.</li><li>Modré rameno má pevnú dĺžku. V náčrte sú jeho zmeny iba schematické.</li><li>Ložiská A a B sú na spoločnom tuhom držiaku čela.</li><li>Korpus, zadná opora a platforma stola sú pevné.</li></ul></section><section><h3>Odhadové doplnenia</h3><ul><li>Zadný čap R má pozdĺžnu drážku na zásuvke.</li><li>Opora drží čap do ${fmt(p.releaseTravel - p.handoffLength)} mm. Prechod do posuvu prebieha na posledných ${fmt(p.handoffLength)} mm sklápania.</li><li>Zachytenie a uvoľnenie čapu by vyžadovalo doraz / západku alebo poddajné uloženie. Detail náčrt neurčuje.</li><li>Výrez stola ${fmt(p.cutoutStart)}–${fmt(p.cutoutEnd)} mm je jeden pevný odhad pre celý zdvih, nie pohyblivá medzera z jednotlivých obrázkov.</li></ul></section></div><ol class="project-motion-steps"><li><strong>01 · Zatvorené</strong>Čelo ${fmt(p.closedAngle)}°, rameno ${fmt(p.armClosedAngle)}°.</li><li><strong>02 · Sklopené</strong>Pri zdvihu ${fmt(p.releaseTravel)} mm dosiahne čelo ${fmt(p.openAngle)}° a rameno ${fmt(p.armOpenAngle)}°.</li><li><strong>03 · Vysunuté</strong>Ďalších ${fmt(p.travelMax - p.travelMin - p.releaseTravel)} mm sa členy posúvajú spolu. Ložiská zostávajú v rovnakých miestach kulís.</li></ol><p class="project-info-note">Trajektórie môžete zobraziť vzhľadom na pevný korpus alebo na zásuvku. Solver kontroluje dĺžku ramena, rozstup ložísk a obe drážky s toleranciou ${fmt(K.TOLERANCE, 2)} mm. Uvoľnenie opory je predpísaný odhadový pohyb; sily, trenie a funkciu západky tento model neoveruje.</p><figure class="project-reference"><img src="${escape(DD.provenance.reference)}" alt="Pôvodný náčrt troch polôh zásuvky: zatvorené, sklopené a vysunuté čelo, dve pohyblivé kulisy a tuhé modré rameno." width="908" height="1024"/><figcaption>Pôvodný referenčný náčrt, schematický a bez rozmerových kót.</figcaption></figure><div class="modal-actions"><button class="button button-secondary" data-action="projects">${icon('folder', 15)}Projekty</button><button class="button button-dark" data-action="${isDoubleDrawer() ? 'close-modal' : 'load-double-drawer'}">${isDoubleDrawer() ? 'Späť do projektu' : 'Otvoriť samostatný projekt'}</button></div>`, true);
  }

  function exportModal() {
    const choices = [
      ['kinmo', 'code', 'Natívny projekt .kinmo', 'Geometria, väzby, kóty, trajektórie, fyzika, vzhľad a poloha pohonu.', 'KINMO'],
      ['svg', 'mechanism', 'Vektorový výkres', 'Referenčný výkres v mm s kótami a trajektóriami.', 'SVG'],
      ['png', 'eye', 'Obrázok pracovnej plochy', 'Aktuálny pohľad, najviac 2 000 × 4 000 px, bez externého servera.', 'PNG'],
      ['gif', 'play', 'Animovaný pohyb', 'Celý kinematický rozsah v aktuálnom vzhľade; nastavenia, priebeh a zrušenie.', 'GIF'],
      ['pdf', 'folder', 'Technický report', 'Ostrá statická schéma ako na plátne, grafy, rozmery, sily a tabuľky.', 'PDF'],
      ['html', 'folder', 'Prenosný report na tlač', 'Samostatný report so schémou v aktuálnom vzhľade a vektorovými grafmi.', 'HTML'],
      ['dxf', 'ruler', 'CAD výmena', 'Referenčná geometria v mm; strednice a voliteľné uzavreté obrysy drážok.', 'DXF'],
      ['csv', 'chart', 'Kinematické dáta', '121 polôh, uhly, súradnice a chyby väzieb.', 'CSV'],
      ['forces', 'spring', 'Silové / dynamické dáta', 'Sily členov a časový záznam poslednej odhadovej dynamiky.', 'CSV'],
      ['json', 'code', 'Starší projekt JSON', 'Kompatibilita s pôvodným formátom, bez vzhľadu a polohy.', 'JSON'],
    ];
    modal('Export, report a CAD', `<p class="modal-description">Exporty sa vytvoria lokálne. Priame odoslanie do Fusion spustíte iba samostatným potvrdením.</p><label class="check-row"><input id="cad-slot-outlines" type="checkbox"${state.cadSlotOutlines ? ' checked' : ''}/><span>DXF / Fusion: pridať uzavreté referenčné obrysy podľa šírky drážky</span></label><p class="section-description">Strednice zostanú zachované. Obrysy majú polygonové zaoblenia a nie sú výrobným výkresom. Nulová, pretínajúca sa alebo príliš široká krivka sa odmietne; túto voľbu môžete vypnúť. Samostatné referenčné vodidlá zostanú iba strednicami.</p><div class="export-options">${choices.map(([type, glyph, name, description, extension]) => `<button data-action="export-${type}">${icon(glyph, 23)}<span><strong>${name}</strong><small>${description}</small></span><span class="file-tag">${extension}</span></button>`).join('')}<button data-action="fusion">${icon('link', 23)}<span><strong>Priame prepojenie · Autodesk Fusion</strong><small>Lokálny doplnok, párovací kľúč a nový referenčný dokument.</small></span><span class="file-tag">CAD</span></button></div><div class="export-note">${icon('lock', 14)}Exporty neopúšťajú zariadenie. Fusion vyžaduje vaše výslovné odoslanie.</div>`, true);
  }
