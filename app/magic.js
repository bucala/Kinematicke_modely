/* Kinematika UI · Magic import z obrázka.
   Klasický skript bez IIFE: zdieľa najvyššiu úroveň s ostatnými app/*.js a app.js, ktorý sa načíta posledný
   a definuje stav a konštanty. Súbor obsahuje iba deklarácie funkcií, pri načítaní nič nespúšťa. */
'use strict';
  function magicImageSVG() {
    const magic = state.magic;
    if (!magic?.image || magic.step >= 3 && !magic.showImage) return '';
    const rect = M.imageRect(magic.image, magic.step <= 2 ? null : magic.scale);
    return `<g data-editor-overlay="magic-reference" pointer-events="none"><rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" fill="#fff"/><image id="magic-reference-image" href="${escape(magic.image.url)}" x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" opacity="${magic.step <= 2 ? 1 : magic.opacity}" preserveAspectRatio="none"/><rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" fill="none" stroke="var(--border)" stroke-width="1" vector-effect="non-scaling-stroke"/></g>`;
  }

  function renderMagicReference() {
    const magic = state.magic, svg = $('#mechanism-canvas'), view = state.view;
    if (!magic || !view) return;
    const scale = Math.hypot(svg.getScreenCTM()?.a || 1, svg.getScreenCTM()?.b || 0);
    svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.width} ${view.height}`);
    svg.classList.toggle('pan-mode', state.tool === 'pan');
    svg.classList.toggle('magic-point-mode', magic.step === 2);
    let content = `<rect x="${view.x}" y="${view.y}" width="${view.width}" height="${view.height}" fill="var(--canvas)"/>${magicImageSVG()}`;
    if (!magic.image) content += `<text x="${view.x + view.width / 2}" y="${view.y + view.height / 2}" text-anchor="middle" fill="var(--secondary)" font-size="${14 / scale}">Nahrajte obrázok tlačidlom Magic import</text>`;
    if (magic.step === 2 && magic.points.length) {
      const a = magic.points[0], b = magic.points[1];
      content += '<g data-editor-overlay="magic-calibration" pointer-events="none">';
      if (b) content += `${line(a, b, 'stroke="#a64422" stroke-width="2" vector-effect="non-scaling-stroke" stroke-dasharray="6 3"')}<text x="${(a.x + b.x) / 2}" y="${(a.y + b.y) / 2 - 13 / scale}" text-anchor="middle" fill="#a64422" stroke="#fff" stroke-width="${3 / scale}" paint-order="stroke" font-size="${12 / scale}">${magic.scale ? `${fmt(magic.scale.distance, 2)} mm` : `${fmt(K.distance(a, b), 2)} px`}</text>`;
      magic.points.forEach((p, i) => { content += `<circle cx="${p.x}" cy="${p.y}" r="${7 / scale}" fill="#fff" stroke="#a64422" stroke-width="2" vector-effect="non-scaling-stroke"/><text x="${p.x + 12 / scale}" y="${p.y - 12 / scale}" fill="#a64422" stroke="#fff" stroke-width="${3 / scale}" paint-order="stroke" font-size="${12 / scale}">${i ? 'B' : 'A'}</text>`; });
      content += '</g>';
    }
    svg.innerHTML = content; latestSVG = content;
    $('#zoom-value').textContent = `${Math.round(state.baseView.width / view.width * 100)}%`;
    $('#selection-summary').hidden = true; $('#manipulation-tools').hidden = true; $('#diagnostics-panel').hidden = true;
  }

  function magicDrawingSVG(scale) {
    const magic = state.magic;
    if (!magicWorking() || !magic.drawing.length) return '';
    const points = [...magic.drawing, ...(magic.preview ? [magic.preview] : [])];
    return `<g data-editor-overlay="magic-drawing" pointer-events="none"><polyline points="${points.map((p) => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="#a64422" stroke-width="2" stroke-dasharray="5 3" vector-effect="non-scaling-stroke"/>${magic.drawing.map((p, i) => `<circle cx="${p.x}" cy="${p.y}" r="${5 / scale}" fill="#fff" stroke="#a64422" stroke-width="2" vector-effect="non-scaling-stroke"/><text x="${p.x + 9 / scale}" y="${p.y - 9 / scale}" fill="#a64422" stroke="#fff" stroke-width="${3 / scale}" paint-order="stroke" font-size="${11 / scale}">${i + 1}</text>`).join('')}${points.length === 2 ? `<text x="${(points[0].x + points[1].x) / 2}" y="${(points[0].y + points[1].y) / 2 - 12 / scale}" fill="#a64422" stroke="#fff" stroke-width="${3 / scale}" paint-order="stroke" font-size="${11 / scale}">${fmt(K.distance(points[0], points[1]), 2)} mm</text>` : ''}</g>`;
  }

  function magicWorking() {
    return !!state.magic && [3, 4].includes(state.magic.step);
  }

  function magicActionAllowed(action) {
    if (!state.magic || action.startsWith('magic-') || action.startsWith('detect-') || action === 'pose-pick') return true;
    if (['help', 'shortcuts', 'command-palette', 'close-modal', 'fit', 'zoom-in', 'zoom-out', 'tool-pan', 'toggle-sidebar', 'close-inspector'].includes(action)) return true;
    if (!magicWorking()) return false;
    return ['multi-select','bind-rigid','unbind-rigid','isolate-selection','detail-level','motor-mode','toggle-tree-group','select-motor-assembly','select-rigid-assembly','undo', 'redo', 'tool-select', 'tool-connect', 'tool-measure', 'smart-snap', 'grid-snap', 'angle-snap', 'mobile-tools', 'mobile-selection', 'mobile-handles', 'properties-overview', 'open-full-properties', 'construction', 'element-limits', 'connection-type', 'selection-settings', 'selection-connect', 'selection-support', 'selection-rail', 'selection-motor', 'snap-connect', 'snap-preview', 'snap-position', 'placement-mount', 'placement-cancel', 'check-model', 'grid', 'dimensions', 'select', 'visibility', 'sidebar-elements', 'sidebar-joints', 'toggle-inspector', 'inspector-geometry', 'inspector-joints', 'new-joint', 'edit-joint', 'delete-joint', 'new-dimension', 'edit-dimension', 'dimension-pick', 'delete-dimension', 'edit-numbers', 'edit-rotation', 'edit-pivot', 'edit-length', 'edit-thickness', 'add-menu', 'add-component', 'duplicate', 'delete', 'confirm-canvas-delete', 'canvas-add-guide', 'lock-selected', 'drive-selected', 'element-menu', 'edit-outline', 'edit-path', 'edit-com'].includes(action);
  }

  function startMagicImport() {
    if (state.magic) return;
    automaticVersion();
    if (state.drag) onPointerUp({ pointerId: state.drag.pointerId, cancelled: true });
    closeContextMenu(); $('#modal').close(); clearTimeout(autosaveTimer);
    state.playing = false;
    const original = { ...state, magic: null }, project = K.preset('custom');
    if (project.id === original.project.id) project.id = K.uid();
    project.name = 'Schéma z obrázka';
    state.magic = { original, step: 1, image: null, scale: null, scaleAxis: 'horizontal', points: [], drawing: [], preview: null, tool: 'select', memberType: 'link', width: 10, opacity: .65, showImage: true, name: project.name, distanceInput: '300', busy: false, imageToken: 0, geometryStarted: false, placementType: null, error: '', resetApproved: false, storageError: '', backupAcknowledged: false, historyScales: [], futureScales: [] };
    state.sidebarTab = 'elements'; state.diagnosticsOpen = false;
    loadProject(project, { workspace: { ...X.preferences(original), mode: 'edit', grid: false, snap: false, ghosts: false, trace: false, dimensions: false } }, true);
    renderMagicImport();
    $('#magic-title').focus({ preventScroll: true });
  }

  function renderMagicImport() {
    const magic = state.magic, root = $('#magic-wizard'), reviewScroll = root.querySelector?.('.magic-detection-review')?.scrollTop || 0;
    root.hidden = !magic; renderWorkflowTools();
    $('[data-action="magic-import"]')?.setAttribute('aria-expanded', !!magic);
    $('#app').classList.toggle('magic-active', !!magic);
    $('#workspace').dataset.magicStep = magic?.step || '';
    for (const button of $('#app').querySelectorAll('[data-action]')) {
      if (['undo', 'redo'].includes(button.dataset.action)) continue;
      const denied = !!magic && !magicActionAllowed(button.dataset.action);
      if (denied) {
        if (!Object.hasOwn(button.dataset, 'magicDisabled')) button.dataset.magicDisabled = String(button.disabled);
        button.disabled = true;
      } else if (Object.hasOwn(button.dataset, 'magicDisabled')) {
        button.disabled = button.dataset.magicDisabled === 'true'; delete button.dataset.magicDisabled;
      }
    }
    for (const card of $('#app').querySelectorAll('[data-component]')) { card.disabled = !!magic && magic.step !== 4; card.draggable = !card.disabled; }
    if (!magic) { root.innerHTML = ''; return; }
    const step = magic.step;
    const description = step === 2.5 ? 'Voliteľná lokálna detekcia obrysov, oblastí oddelených hranami, spojitých dráh a kruhových montážnych bodov. Farba neurčuje druh ani funkciu súčiastky. Skontrolujte návrh, zmeňte typy a vyberte, čo vložiť; nejasné a rozvetvené tvary sa nepredvyberajú. Fotografie a prekrývajúce sa čiary môžu vyžadovať ručné opravy.' : ['Nahrajte vlastný náčrt. Obrázok zostáva lokálne v tomto prehliadači.', 'Vyberte začiatok a koniec známeho rozmeru. Zadajte jedinú hodnotu v mm, napríklad X = 300; mierka X aj Y sa prepočíta spoločne. Bod A je začiatok súradníc.', 'Obkreslite pevný rám, podlahu alebo pevné body. Dokončené časti sú v simulácii nepohyblivé.', 'Pretiahnite prvok z knižnice na obrázok, alebo vyberte jeho typ a potom kliknite na plátno. Úchyty upravia jeho geometriu.', 'Skontrolujte schému. Finish vytvorí samostatný projekt so zmenšenou predlohou; jej viditeľnosť prepnete tlačidlom Predloha.'][step - 1];
    let controls = '';
    if (step === 1) controls = `<div class="magic-upload"><button class="button button-dark" data-action="magic-upload"${magic.busy ? ' disabled' : ''}>${icon('import', 16)}${magic.busy ? 'Načítava sa…' : magic.image ? 'Vybrať iný obrázok…' : 'Nahrať obrázok…'}</button><span>${magic.image ? `${escape(magic.image.name)} · ${magic.image.width} × ${magic.image.height} px` : 'PNG / JPG / neanimovaný WebP · do 10 MB · najviac 16 Mpx'}</span><small>Obrázok môžete aj pustiť sem. Zostáva lokálne, bez odosielania na server.</small></div>`;
    if (step === 2) {
      const a = magic.points[0], b = magic.points[1], pixelField = (name, label, value, max) => `<label class="magic-field"><span>${label}</span><input class="text-field" name="${name}" data-magic-setting="pixel" type="number" min="0" max="${max}" step="any" value="${value ?? ''}" required/></label>`;
      controls = `<form id="magic-scale-form"><div class="magic-known-size"><label class="magic-field"><span>Známy rozmer vybraného úseku</span><select class="property-select" name="axis" data-magic-setting="scale-axis">${[['horizontal', 'X · vodorovná dĺžka'], ['vertical', 'Y · zvislá výška'], ['distance', 'Dĺžka spojnice A–B']].map(([value, title]) => `<option value="${value}"${(magic.scaleAxis || 'distance') === value ? ' selected' : ''}>${title}</option>`).join('')}</select></label><label class="magic-field"><span>Skutočná hodnota (mm)</span><input class="text-field" name="distance" data-magic-setting="distance" type="number" min=".1" max="5000" step="any" value="${escape(magic.distanceInput)}" required/></label><output id="magic-scale-preview" class="magic-scale-result" aria-live="polite">${magicScalePreview()}</output><button type="button" class="button button-secondary" data-action="magic-reset-points">Vybrať body znova</button></div><details class="magic-pixel-details"><summary>Kalibračné body v pixeloch (nie rozmery v mm)</summary><div class="magic-calibration-fields">${pixelField('ax', 'A · X (px)', a?.x, magic.image.width)}${pixelField('ay', 'A · Y (px)', a?.y, magic.image.height)}${pixelField('bx', 'B · X (px)', b?.x, magic.image.width)}${pixelField('by', 'B · Y (px)', b?.y, magic.image.height)}</div></details><p class="magic-note">X a Y používajú rovnakú mierku, pomer strán sa zachová. ${magic.geometryStarted ? 'Zmenu už vytvorenej geometrie najskôr potvrdíte; rám, členy, kóty aj väzby sa prepočítajú spolu. Prepočet možno vrátiť cez Späť.' : 'Vyberte čo najdlhší známy úsek.'} Jedna mierka neodstráni perspektívu fotografie.</p><button class="magic-hidden-submit" type="submit" tabindex="-1" aria-hidden="true">Použiť mierku</button></form>`;
    }
    if(step===2&&!magic.geometryStarted&&window.KinmoAdvanced)controls+='<button class="button button-secondary" data-action="magic-perspective">Vyrovnať perspektívu · 4 rohy</button>';
    if (step === 2) controls += `<label class="check-row"><input type="checkbox" data-magic-setting="auto-detect"${magic.detectEnabled ? ' checked' : ''}/><span>Aktivovať krok 2.5 · automaticky navrhnúť prvky z obrázka</span></label>`;
    if (step === 2.5) {
      const candidates = magic.detectCandidates || [], applied = magic.detectAdded?.some((id) => state.project.elements.some((e) => e.id === id));
      controls = `<div class="magic-detection-actions"><button class="button button-secondary" data-action="magic-detection-region"${magic.busy || applied ? ' disabled' : ''}>Vybrať oblasť · 2 rohy</button><button class="button button-secondary" data-action="magic-detection-whole"${magic.busy || applied ? ' disabled' : ''}>Celý obrázok</button><span class="magic-note">${magic.detectRegion ? `Oblasť ${magic.detectRegion.width} × ${magic.detectRegion.height} px` : 'Celý obrázok · pri viacerých polohách vyberte iba jednu'}</span><button class="button button-dark" data-action="magic-detect"${magic.busy || applied ? ' disabled' : ''}>${magic.busy ? 'Rozpoznáva sa…' : 'Rozpoznať prvky'}</button>${magic.busy ? '<button class="button button-secondary" data-action="magic-stop-detection">Zrušiť detekciu</button>' : ''}<label class="magic-opacity">Citlivosť <input type="range" min="10" max="90" value="${magic.detectSensitivity ?? 50}" data-magic-setting="detect-sensitivity"${magic.busy || applied ? ' disabled' : ''}/></label><button class="button button-secondary" data-action="magic-skip-detection"${magic.busy ? ' disabled' : ''}>Pokračovať ručne</button></div><p class="magic-note" role="status">${magic.detectNote ? escape(magic.detectNote) : 'Spustite detekciu. Návrh nevytvára pohon a neoveruje funkciu mechanizmu.'}${applied ? ' Návrh už bol vložený. Vrátiť ho môžete cez Späť v kroku 3.' : ''}</p>${candidates.length ? `<fieldset class="magic-detection-review"${magic.busy || applied ? ' disabled' : ''}><legend>Rozpoznané prvky · ${candidates.length}</legend>${candidates.map((c, index) => `<div class="magic-detection-row${c.confidence<.75 || !c.motionEvidence || c.motionEvidence.kind==='uncertain' ? ' is-uncertain' : ''}"><label class="check-row"><input type="checkbox" data-magic-setting="detect-selected" data-detection="${c.id}"${c.selected ? ' checked' : ''}/><span>${index + 1}</span></label><select class="property-select" aria-label="Typ návrhu ${index + 1}" data-magic-setting="detect-type" data-detection="${c.id}">${(c.points.length === 1 ? ['bearing', 'node'] : ['ground', 'link', 'panel', 'rail', 'slot']).map((type) => `<option value="${type}"${c.type === type ? ' selected' : ''}>${escape(typeNames[type])}</option>`).join('')}</select><span>${c.evidence?.manual ? 'Ručne upravený tvar' : `Tvar ${Math.round(c.confidence * 100)} % · odhad`} · ${c.motionEvidence ? ({ fixed: 'pevná časť · odhad', translation: 'posuvná väzba · odhad', rotation: 'otočná väzba · odhad', uncertain: 'nejasný pohyb' })[c.motionEvidence.kind] + ` (${c.motionEvidence.matches}/${c.motionEvidence.total} polôh)` : 'pohyb neoverený'}${c.evidence?.closedRegion ? ' · oblasť' : ''}</span><button class="button button-secondary" data-action="detect-edit" data-id="${escape(c.id)}">Upraviť</button>${c.motionEvidence?.kind === 'fixed' && c.points.length > 1 ? `<button class="button button-secondary" data-action="detect-fixed" data-id="${escape(c.id)}">Použiť odhad pevnej časti</button>` : ''}${c.points.length > 1 ? `<button class="button button-secondary" data-action="detect-edit" data-tool="detect-anchor" data-id="${escape(c.id)}">Pridať čap</button><button class="button button-secondary" data-action="detect-edit" data-tool="detect-split" data-id="${escape(c.id)}">Rozdeliť</button>` : `<button class="button button-secondary" data-action="detect-hole" data-role="hole" data-id="${escape(c.id)}">Otvor na vybranom telese</button><button class="button button-secondary" data-action="detect-hole" data-role="pin" data-id="${escape(c.id)}">Samostatný čap</button>`}<button class="button button-secondary" data-action="detect-delete" data-id="${escape(c.id)}">Odstrániť návrh</button>${c.anchors?.length && ['ground', 'link', 'panel'].includes(c.type) ? `<label class="check-row magic-detection-mounts"><input type="checkbox" data-magic-setting="detect-anchors" data-detection="${c.id}"${c.useAnchors !== false ? ' checked' : ''}/><span>Použiť montážne body · ${c.anchors.length} (overiť na obrázku)</span></label>` : ''}</div>`).join('')}<label class="check-row"><input type="checkbox" data-magic-setting="detect-joints"${magic.detectJoints !== false ? ' checked' : ''}/><span>Navrhnúť otočné väzby pri zhodných montážnych bodoch alebo koncoch (treba overiť)</span></label></fieldset><button class="button button-secondary" data-action="magic-apply-detection"${magic.busy || applied || !candidates.some((c) => c.selected) ? ' disabled' : ''}>Pridať vybrané prvky a pokračovať</button>` : ''}`;
    }
    if(step===2.5&&window.KinmoAdvanced)controls+=`<div class="motion-evidence">${window.KinmoAdvanced.motionGroups(magic.detectCandidates||[]).map((g,i)=>`<p>${g.ids.length} časti · istota ${Math.round(g.confidence*100)} % · ${escape(g.reason)} <button data-action="detect-motion-group" data-index="${i}">Navrhnúť spoločné teleso (vonkajší obal)</button></p>`).join('')}${(magic.detectCandidates||[]).filter(c=>c.motionEvidence).map(c=>{const proof=window.KinmoAdvanced.evidence(c);return `<p>${escape(proof.reason)} · istota ${Math.round(proof.confidence*100)} % <button data-action="detect-motion-confirm" data-id="${escape(c.id)}"${proof.confidence<.5?' disabled':''}>${c.confirmedMotion?'Potvrdené':'Použiť návrh uloženia'}</button></p>`;}).join('')}</div>`;
    if (step === 3 || step === 4) {
      const tools = step === 3 ? [['ground-line', 'Pevná úsečka / podlaha'], ['ground-outline', 'Obrys rámu'], ['fixed-point', 'Pevný bod'], ['select', 'Vybrať / upraviť']] : [['select', 'Vybrať / úchyty'], ['member', 'Obkresliť člen']];
      controls = `<div class="magic-draw-controls"><div class="magic-tool-buttons">${tools.map(([tool, title]) => `<button class="button button-secondary${magic.tool === tool ? ' is-active' : ''}" data-action="magic-tool" data-tool="${tool}" aria-pressed="${magic.tool === tool}">${title}</button>`).join('')}${step === 4 ? '<button class="button button-secondary" data-action="tool-connect">Spojiť uzly (J)</button><button class="button button-secondary" data-action="new-joint">Typ / nová väzba…</button><button class="button button-secondary" data-action="magic-motor">Pohon…</button>' : ''}</div><div class="magic-draw-options">${step === 4 ? `<label class="magic-field"><span>Obkresľovaný člen</span><select class="property-select" data-magic-setting="member-type">${[['link', 'Rameno / tiahlo'], ['panel', 'Čelo / doska'], ['rail', 'Priame vedenie']].map(([type, title]) => `<option value="${type}"${magic.memberType === type ? ' selected' : ''}>${title}</option>`).join('')}</select></label>` : ''}<label class="magic-field"><span>Hrúbka úsečky / člena (mm)</span><input class="text-field" type="number" min=".1" max="5000" step="any" value="${magic.width}" data-magic-setting="width"/></label>${magic.tool === 'ground-outline' ? `<button class="button button-dark" data-action="magic-close-outline"${magic.drawing.length < 3 ? ' disabled' : ''}>Uzavrieť obrys · ${magic.drawing.length} bodov</button>` : ''}${magic.drawing.length || magic.placementType ? '<button class="button button-secondary" data-action="magic-clear-drawing">Zrušiť rozkreslenie</button>' : ''}<span class="magic-note">${magic.placementType ? `Kliknite na bod vloženia: ${escape(typeNames[magic.placementType])}.` : magic.tool === 'ground-outline' ? 'Klikajte vrcholy. Enter alebo kliknutie pri prvom bode uzavrie obrys; Escape zruší náhľad.' : magic.tool === 'fixed-point' ? 'Kliknutím vložíte samostatný pevný bod.' : ['ground-line', 'member'].includes(magic.tool) ? 'Kliknite na začiatok A a koniec B; dĺžka sa odvodí z mierky obrázka.' : 'Pravý klik ponúka uzly, uloženie, pohon a väzby. Vlastnosti sa otvárajú iba ručne.'}</span></div></div>`;
    }
    if (step === 5) {
      const diagnostic = W.diagnose(state.project, state.result), fixed = state.project.elements.filter((e) => e.locked || e.type === 'ground').length, drivers = state.project.elements.filter((e) => e.drive).length;
      controls = `<form id="magic-finish-form"><div class="magic-review"><label class="magic-field"><span>Názov nového projektu</span><input class="text-field" name="name" data-magic-setting="name" maxlength="80" value="${escape(magic.name)}" required/></label><div class="magic-review-counts"><span>${state.project.elements.length} prvkov</span><span>${fixed} pevných</span><span>${state.project.connections.length} väzieb</span><span>${drivers} pohonov</span><span>${diagnostic.freedom.free} voľných súradníc</span></div><button type="button" class="button button-secondary" data-action="magic-export-draft">Exportovať geometriu .kinmo</button></div>${diagnostic.hints.length ? `<details class="magic-review-hints"><summary>Čo skontrolovať pred simuláciou</summary><ul>${diagnostic.hints.map((hint) => `<li>${escape(hint)}</li>`).join('')}</ul></details>` : ''}<p class="magic-note">Finish dokončí geometriu, nie dôkaz správnej funkcie. Chýbajúci pohon, voľné členy a konfliktné väzby môžete opraviť aj po dokončení.</p>${magic.storageError ? `<p class="magic-error">${escape(magic.storageError)}</p><button type="button" class="button button-secondary" data-action="magic-export-original">Exportovať pôvodný projekt .kinmo</button><label class="check-row"><input name="original-backup" data-magic-setting="backup" type="checkbox"${magic.backupAcknowledged ? ' checked' : ''}/><span>Potvrdzujem, že som pôvodný projekt uložil mimo prehliadača. Dokončiť aj bez lokálneho uloženia.</span></label>` : ''}<button class="magic-hidden-submit" type="submit" tabindex="-1" aria-hidden="true">Finish</button></form>`;
    }
    if ([2, 2.5].includes(step) && magic.image) controls += `<div class="magic-pose-tools"><button class="button button-secondary" data-action="magic-pose-add"${magic.busy || (magic.poses || []).length >= 3 ? ' disabled' : ''}>Pridať ďalšiu polohu</button>${(magic.poses || []).map((p, i) => `<span>${escape(p.image.name)} · ${p.alignment ? 'zarovnaná' : 'zarovnať'} <button class="button button-secondary" data-action="magic-pose-align" data-index="${i}">Zarovnať</button><button class="button button-secondary" data-action="magic-pose-remove" data-index="${i}"${magic.busy ? ' disabled' : ''}>Odstrániť</button></span>`).join('')}</div>`;
    if (step === 2.5 && !magic.busy && !magic.detectAdded?.some((id) => state.project.elements.some((e) => e.id === id))) controls += `<div class="magic-pose-tools"><button class="button button-secondary" data-action="detect-outline">Dokresliť obrys</button><button class="button button-secondary" data-action="detect-merge">Spojiť vybrané fragmenty (vonkajší obal)</button><button class="button button-secondary" data-action="detect-undo">Späť opravu</button><button class="button button-secondary" data-action="detect-redo">Znova opravu</button>${magic.tool === 'detect-outline' ? '<button class="button button-dark" data-action="detect-outline-finish">Dokončiť obrys (Enter)</button>' : ''}<span class="magic-note">Upraviť: ťahajte biele vrcholy alebo zelené čapy. Pridať čap / Rozdeliť: kliknite na miesto v obrázku.</span></div>`;
    const photoOptions = step >= 2.5 ? `<div class="magic-photo-options"><label class="check-row"><input type="checkbox" data-magic-setting="show-image"${magic.showImage ? ' checked' : ''}/><span>Podklad</span></label><label class="magic-opacity">Priehľadnosť <input type="range" min="10" max="100" step="5" value="${Math.round(magic.opacity * 100)}" data-magic-setting="opacity" aria-label="Viditeľnosť obrázka"/></label></div>` : '';
    const steps = M.steps.map((title, index) => ({ title, number: index + 1 }));
    if (magic.detectEnabled) steps.splice(2, 0, { title: 'Autodetekcia', number: 2.5 });
    root.innerHTML = `<div class="magic-heading"><div><h2 id="magic-title" tabindex="-1">Magic import <span>Krok ${String(step).replace('.', ',')} / 5</span></h2><p>${description}</p></div><div class="magic-navigation"><button class="button button-secondary" data-action="magic-back"${step === 1 || magic.busy ? ' disabled' : ''}>Späť</button><button class="button button-dark" data-action="magic-next"${magic.busy || step === 1 && !magic.image || step >= 4 && !state.project.elements.length ? ' disabled' : ''}>${step === 5 ? 'Finish' : 'Ďalej'}${icon('arrow', 14)}</button><button class="button button-secondary" data-action="magic-cancel">Zrušiť</button></div></div><ol class="magic-steps" aria-label="Kroky sprievodcu">${steps.map(({ title, number }) => `<li><button data-action="magic-step" data-step="${number}"${number > step || magic.busy ? ' disabled' : ''}${number === step ? ' aria-current="step"' : ''}><span>${String(number).replace('.', ',')}</span>${title}</button></li>`).join('')}</ol><div id="magic-import-panel" class="magic-controls">${controls}${photoOptions}${magic.error ? `<p class="magic-error" role="alert">${escape(magic.error)}</p>` : ''}</div>`;
    const reviewer = root.querySelector?.('.magic-detection-review'); if (reviewer) reviewer.scrollTop = reviewScroll;
  }

  function setMagicStep(step) {
    const magic = state.magic;
    if (!magic || magic.busy || ![1, 2, 2.5, 3, 4, 5].includes(step) || step === 2.5 && !magic.detectEnabled) return;
    if (magic.drawing.length) { toast('Najskôr dokončite alebo zrušte rozkreslenú časť.', true); return; }
    if (step > 1 && !magic.image || step > 2 && !magic.scale) { toast('Najskôr nahrajte obrázok a potvrďte jeho mierku.', true); return; }
    if (step === 5 && !state.project.elements.length) { toast('Najskôr vložte aspoň jeden prvok.', true); return; }
    if (state.drag) onPointerUp({ pointerId: state.drag.pointerId, cancelled: true });
    magic.step = step; magic.placementType = null; magic.preview = null; magic.error = '';
    $('#modal').close();
    state.pendingJoint = null; state.pendingSnap = null; state.snapPreview = null; state.tool = step === 2 ? 'magic-scale' : 'select';
    magic.tool = 'select';
    if (step === 3) { magic.tool = 'ground-line'; state.tool = 'magic-draw'; }
    state.inspectorOpen = false; state.diagnosticsOpen = false; $('.sidebar').classList.remove('mobile-open');
    fitView(); renderTree(); renderInspector(); renderScene(); updateToolbar();
    $('#magic-title').focus({ preventScroll: true });
  }

  function nextMagicStep() {
    const magic = state.magic;
    if (!magic || magic.busy) return;
    if (magic.step === 2) { $('#magic-scale-form').requestSubmit(); return; }
    if (magic.step === 2.5) {
      if (magic.detectCandidates?.some((c) => c.selected) && !magic.detectAdded?.some((id) => state.project.elements.some((e) => e.id === id))) applyMagicDetection();
      else setMagicStep(3);
      return;
    }
    if (magic.step === 5) { $('#magic-finish-form').requestSubmit(); return; }
    setMagicStep(magic.step + 1);
  }

  function pickMagicImage(confirmed = false) {
    const magic = state.magic;
    if (!magic || magic.step !== 1 || magic.busy) return;
    if (magic.geometryStarted && !confirmed) {
      modal('Nový obrázok a čistá schéma?', '<p class="modal-description">Zmena podkladu začne nové obkresľovanie. Rozpracovaná geometria sa vymaže až po úspešnom načítaní nového obrázka. Pôvodný projekt pred sprievodcom zostáva nedotknutý.</p><div class="modal-actions"><button class="button button-secondary" data-action="close-modal">Ponechať schému</button><button class="button button-dark" data-action="magic-confirm-image">Vybrať nový obrázok…</button></div>');
      return;
    }
    magic.resetApproved = confirmed; $('#modal').close(); $('#magic-image-file').click();
  }

  async function onMagicImage(file) {
    const magic = state.magic;
    if (!file || !magic || magic.step !== 1 || magic.busy) return;
    if (magic.geometryStarted && !magic.resetApproved) { toast('Nový podklad najskôr potvrďte tlačidlom Vybrať iný obrázok.', true); return; }
    const token = ++magic.imageToken;
    magic.busy = true; magic.error = ''; renderMagicImport();
    try {
      const image = await M.loadImage(file);
      if (state.magic !== magic || magic.imageToken !== token) { URL.revokeObjectURL(image.url); return; }
      if (magic.image) URL.revokeObjectURL(magic.image.url);
      for (const pose of magic.poses || []) URL.revokeObjectURL(pose.image.url); magic.poses = []; magic.detectHistory = []; magic.detectFuture = [];
      magic.image = image; magic.scale = null; magic.points = []; magic.drawing = []; magic.geometryStarted = false;
      magic.detectRegion = null; magic.detectRegionPoints = []; magic.detectCandidates = []; magic.detectAdded = []; magic.detectNote = '';
      magic.resetApproved = false; magic.storageError = ''; magic.backupAcknowledged = false;
      const project = K.preset('custom'); project.name = magic.name;
      loadProject(project, { workspace: { ...X.preferences(state), mode: 'edit' } }, true);
      magic.busy = false; setMagicStep(2);
      toast('Obrázok je pripravený. Vyberte dva body známeho rozmeru.');
    } catch (error) {
      if (state.magic === magic) { magic.error = error.message || 'Obrázok sa nepodarilo načítať.'; magic.resetApproved = false; toast(magic.error, true); }
    } finally {
      if (state.magic === magic) { magic.busy = false; renderMagicImport(); }
    }
  }

  function submitMagicScale(data) {
    const magic = state.magic;
    if (!magic || magic.step !== 2 || !magic.image) return;
    for (const key of ['ax', 'ay', 'bx', 'by', 'distance']) if (!String(data.get(key) ?? '').trim()) throw new Error('Vyberte alebo zadajte oba body a známu vzdialenosť.');
    const a = { x: Number(data.get('ax')), y: Number(data.get('ay')) }, b = { x: Number(data.get('bx')), y: Number(data.get('by')) };
    const scale = M.calibration(magic.image, a, b, Number(data.get('distance')), String(data.get('axis') || magic.scaleAxis || 'distance'));
    if (magic.geometryStarted && magic.scale && JSON.stringify(scale) !== JSON.stringify(magic.scale)) {
      M.rescale(state.project, magic.scale, scale);
      magic.pendingScale = scale;
      modal('Prepočítať celú schému?', `<p class="modal-description">Nová mierka ${fmt(scale.mmPerPixel, 6)} mm/px prepočíta všetky členy, pevné body, kóty a dĺžkové väzby v pomere ${fmt(scale.mmPerPixel / magic.scale.mmPerPixel, 4)}×. Uhly, hmotnosti a sily sa nemenia. Pôvodný projekt pred Magic importom zostane nedotknutý.</p><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zrušiť</button><button type="button" class="button button-dark" data-action="magic-confirm-scale">Prepočítať schému</button></div>`);
      return;
    }
    applyMagicScale(scale);
  }

  function magicScalePreview(data = null) {
    const magic = state.magic;
    if (!magic?.image) return 'Vyberte A a B';
    try {
      const a = data ? { x: Number(data.get('ax')), y: Number(data.get('ay')) } : magic.points[0];
      const b = data ? { x: Number(data.get('bx')), y: Number(data.get('by')) } : magic.points[1];
      if (data && ['ax', 'ay', 'bx', 'by'].some((key) => !String(data.get(key) || '').trim())) return 'Vyberte A a B';
      const scale = M.calibration(magic.image, a, b, Number(data ? data.get('distance') : magic.distanceInput), String(data?.get('axis') || magic.scaleAxis || 'distance'));
      return `Úsek: X = ${fmt(Math.abs(b.x - a.x) * scale.mmPerPixel, 2)} mm · Y = ${fmt(Math.abs(b.y - a.y) * scale.mmPerPixel, 2)} mm. Obrázok: ${fmt(magic.image.width * scale.mmPerPixel, 2)} × ${fmt(magic.image.height * scale.mmPerPixel, 2)} mm · ${fmt(scale.mmPerPixel, 6)} mm/px`;
    } catch (error) { return magic.points.length < 2 ? 'Vyberte A a B' : escape(error.message); }
  }

  function applyMagicScale(scale = state.magic?.pendingScale) {
    const magic = state.magic;
    if (!magic || !scale) return;
    if (magic.geometryStarted && magic.scale) {
      const next = M.rescale(state.project, magic.scale, scale), ratio = scale.mmPerPixel / magic.scale.mmPerPixel;
      pushHistory(); state.project = next; magic.width = K.clamp(magic.width * ratio, .1, 5000);
      state.motion *= ratio; state.editPivot = null;
    }
    magic.scale = scale; magic.points = [scale.a, scale.b]; magic.distanceInput = String(scale.distance); magic.scaleAxis = scale.axis;
    magic.pendingScale = null; state.project.controls = null; recalculate();
    setMagicStep(magic.detectEnabled ? 2.5 : 3);
  }

  function selectMagicDetectionRegion(whole = false) {
    const magic = state.magic;
    if (!magic || magic.step !== 2.5 || magic.busy || magic.detectAdded?.some((id) => state.project.elements.some((e) => e.id === id))) return;
    magic.detectRegion = null; magic.detectRegionPoints = []; magic.detectCandidates = []; magic.error = '';
    magic.detectNote = whole ? '' : 'Kliknite na dva protiľahlé rohy oblasti. Pri viacerých polohách vyberte iba jednu a vynechajte legendu.';
    magic.tool = whole ? 'select' : 'detection-region'; state.tool = 'select';
    renderMagicImport(); renderScene();
  }

  async function runMagicDetection(confirmed = false) {
    const magic = state.magic;
    if (!magic || magic.step !== 2.5 || magic.busy || magic.detectAdded?.some((id) => state.project.elements.some((e) => e.id === id))) return;
    if (!confirmed && magic.detectHistory?.length) { modal('Rozpoznať znova a nahradiť opravy?', '<p class="modal-description">Nová detekcia nahradí upravené návrhy a ich históriu opráv. Rozpracovaná mechanická schéma sa nezmení.</p><div class="modal-actions"><button class="button button-secondary" data-action="close-modal">Ponechať opravy</button><button class="button button-dark" data-action="magic-detect-reset">Rozpoznať znova</button></div>'); return; }
    if (magic.tool === 'detection-region') { magic.error = 'Najskôr vyberte dva protiľahlé rohy oblasti alebo zvoľte celý obrázok.'; renderMagicImport(); return; }
    const controller = new AbortController();
    magic.detectController = controller; magic.busy = true; magic.error = '';
    renderMagicImport();
    try {
      const result = await AD.detectImage(magic.image, { signal: controller.signal, sensitivity: magic.detectSensitivity ?? 50, region: magic.detectRegion });
      if (state.magic !== magic || controller.signal.aborted) return;
      const compared = [];
      for (const frame of magic.poses || []) {
        if (!frame.alignment) continue;
        const detected = await AD.detectImage(frame.image, { signal: controller.signal, sensitivity: magic.detectSensitivity ?? 50 });
        if (state.magic !== magic || controller.signal.aborted) return;
        frame.candidates = detected.candidates; compared.push(frame);
      }
      magic.detectCandidates = compared.length ? WF.comparePoses(result.candidates, compared, magic.scale) : result.candidates;
      magic.holeDecisions={};magic.motionProbe=null;magic.detectHistory = []; magic.detectFuture = []; magic.detectEditId = null; magic.tool = 'select';
      magic.detectNote = `${result.candidates.length ? `Nájdených ${result.candidates.length} návrhov. ` : 'Nenašli sa vhodné prvky. Pokračujte ručne alebo upravte citlivosť. '}${result.limited ? 'Zobrazený je iba ohraničený počet návrhov. ' : ''}${result.note}${compared.length ? ` Porovnaných ${compared.length + 1} zarovnaných polôh. Pohyb a väzby sú odhady na kontrolu.` : ''}`;
    } catch (error) { if (state.magic === magic) magic.error = controller.signal.aborted ? 'Detekcia bola zrušená; schéma sa nezmenila.' : error.message; }
    finally { if (state.magic === magic) { magic.busy = false; magic.detectController = null; renderMagicImport(); renderScene(); } }
  }

  function applyMagicDetection() {
    const magic = state.magic;
    if (!magic || magic.step !== 2.5 || magic.busy || magic.detectAdded?.some((id) => state.project.elements.some((e) => e.id === id))) return;
    try {
      const interpretation=AD.mechanismCandidates(magic.detectCandidates||[],magic.holeDecisionRevision===JSON.stringify(magic.detectCandidates)?magic.holeDecisions||{}:{});
      if(interpretation.unresolved.length){reviewHoleOwnership(interpretation);return;}
      magic.interpretation=interpretation;
      const result = M.applyDetected(state.project, magic.image, magic.scale, interpretation.candidates, { connections: magic.detectJoints !== false });
      reviewDetectedMechanism(result,magic);
    } catch (error) { magic.error = error.message; renderMagicImport(); toast(error.message, true); }
  }
  function reviewHoleOwnership(interpretation) {
    const magic=state.magic;magic.ownershipDraft={interpretation,revision:JSON.stringify(state.project),candidates:JSON.stringify(magic.detectCandidates)};
    const image=magic.image,stroke=Math.max(image.width,image.height)/250,font=Math.max(image.width/40,stroke*4);
    const preview=`<svg class="detection-review-preview" viewBox="0 0 ${image.width} ${image.height}" role="img" aria-label="Očíslované otvory a telesá v predlohe"><image href="${escape(image.dataURL||image.url)}" width="${image.width}" height="${image.height}"/>${magic.detectCandidates.filter(c=>c.selected&&c.points.length>1).map(c=>`<g fill="none" stroke="#7253cf" stroke-width="${stroke}"><polyline points="${(c.outline?.length?[...c.outline,c.outline[0]]:c.points).map(p=>p.x+','+p.y).join(' ')}"/><text x="${c.points[0].x}" y="${c.points[0].y-font}" fill="#7253cf" stroke="#fff" stroke-width="${stroke}" paint-order="stroke" font-size="${font}">T${magic.detectCandidates.findIndex(v=>v.id===c.id)+1}</text></g>`).join('')}${interpretation.ownership.map((h,i)=>`<g><circle cx="${h.at.x}" cy="${h.at.y}" r="${Math.max(h.radius,stroke*3)}" fill="#fff" fill-opacity=".7" stroke="#c64a24" stroke-width="${stroke}"/><text x="${h.at.x+Math.max(h.radius,stroke*3)}" y="${h.at.y}" font-size="${font}" fill="#c64a24" stroke="#fff" stroke-width="${stroke}" paint-order="stroke">${i+1}</text></g>`).join('')}</svg>`;
    modal('Magic import · komu patria otvory?',`<form id="hole-ownership-form"><p>1. Telesá → 2. Vlastníctvo otvorov → 3. Väzby → 4. Skúška pohybu</p><p>Kruh môže byť otvor v diele alebo samostatný čap. Pri prekrytí rozhodnite, ktoré telesá patria k tomu istému čapu. Čísla označujú otvory, T označuje telesá.</p>${preview}<div class="ownership-choices">${interpretation.ownership.map((h,i)=>`<label class="property-field"><span>Otvor ${i+1} · x ${fmt(h.at.x,0)}, y ${fmt(h.at.y,0)} px</span><select name="owner-${escape(h.id)}" class="property-select" required><option value="">Vyberte význam kruhu…</option>${h.owners.map(o=>`<option value="${escape(o.id)}"${h.choice===o.id?' selected':''}>Otvor v telese ${(magic.detectCandidates||[]).findIndex(c=>c.id===o.id)+1} · ${escape(typeNames[(magic.detectCandidates||[]).find(c=>c.id===o.id)?.type])}</option>`).join('')}${h.owners.length>1?`<option value="shared"${h.choice==='shared'?' selected':''}>Spoločný čap · ${h.owners.length} telies</option>`:''}<option value="pin"${h.choice==='pin'?' selected':''}>Samostatný čap / ložisko</option><option value="ignore"${h.choice==='ignore'?' selected':''}>Ignorovať kruh</option></select><small>${h.owners.map(o=>o.reason).join(' ')||'Kruhu sa nenašiel jednoznačný vlastník.'}</small></label>`).join('')}</div><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Späť k obrysom</button><button class="button button-dark">Navrhnúť väzby</button></div></form>`,true);
  }
  function submitHoleOwnership(data) {
    const magic=state.magic,draft=magic?.ownershipDraft;
    if(!draft||draft.revision!==JSON.stringify(state.project)||draft.candidates!==JSON.stringify(magic.detectCandidates))throw new Error('Detekcia sa zmenila. Priradenie otvorov vytvorte znova.');
    const decisions={...(magic.holeDecisions||{})};for(const h of draft.interpretation.ownership){const choice=String(data.get('owner-'+h.id)||'');if(!choice)throw new Error('Určte význam každého kruhu.');decisions[h.id]=choice;}
    AD.mechanismCandidates(magic.detectCandidates,decisions);magic.holeDecisions=decisions;magic.holeDecisionRevision=JSON.stringify(magic.detectCandidates);magic.ownershipDraft=null;applyMagicDetection();
  }
  function testDetectedMechanism() {
    const magic=state.magic,review=magic?.review,form=$('#magic-detection-review-form');if(!review||!form)return;
    const accepted=new Set(new FormData(form).getAll('joint')),ids=new Set(review.joints.map(j=>j.id)),next=K.copy(review.project);next.connections=next.connections.filter(j=>!ids.has(j.id)||accepted.has(j.id));
    const tested=M.probeMechanism(next,[...accepted]);magic.motionProbe={signature:[...accepted].sort().join('|'),failed:tested.checked&&tested.blocked.length>0};
    const status=$('#magic-mechanism-status');status.innerHTML=`<p>${escape(tested.note)}</p>${tested.checked?`<p>${tested.samples.length-tested.blocked.length}/${tested.samples.length} skúšobných polôh je priechodných.</p>${tested.blocked.length?`<p class="analysis-warning">${escape(tested.blocked[0].issues.join(' '))}</p><label class="check-row"><input name="accept-probe-conflict" type="checkbox"/>Vložiť na ručnú opravu aj napriek blokovaniu skúšky.</label>`:''}<div class="connection-preview">${X.vectorSVG(tested.project,tested.samples.at(-1),{dimensions:false,trajectories:false,labels:false})}</div>`:''}`;
  }

  function reviewDetectedMechanism(result,magic) {
    const joints=result.project.connections.filter(j=>!state.project.connections.some(old=>old.id===j.id)),pose=K.solve(result.project,K.driveRange(result.project).min,{design:true,collisions:false}),bounds=K.bounds(result.project,[pose]);
    magic.motionProbe=null;magic.review={...result,joints,revision:JSON.stringify(state.project)};
    const overview=`<section class="detection-overview"><h3>Telesá</h3><ul>${result.added.map(id=>result.project.elements.find(e=>e.id===id)).filter(e=>e&&!['bearing','node'].includes(e.type)).map(e=>`<li>${escape(e.name)} · ${escape(typeNames[e.type])}</li>`).join('')}</ul><h3>Čapy a montážne body</h3><p>${result.added.map(id=>result.project.elements.find(e=>e.id===id)).filter(e=>e&&['bearing','node'].includes(e.type)).length} samostatných čapov / uzlov · ${joints.length} návrhov väzieb (nepotvrdené).</p><h3>Neisté tvary</h3><div>${(magic.detectCandidates||[]).filter(c=>c.selected&&(c.confidence<.75||!c.motionEvidence||c.motionEvidence.kind==='uncertain')).map(c=>`<button type="button" class="button button-secondary" data-action="detect-review-edit" data-id="${escape(c.id)}">Upraviť ${escape(typeNames[c.type])} · ${Math.round(c.confidence*100)} %</button>`).join('')||'<p>Bez tvarov s nízkou istotou; funkciu spoja aj tak overte.</p>'}</div></section>`;
    const preview=`<svg class="detection-review-preview" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}" role="img" aria-label="Rozpoznané telesá a očíslované navrhnuté spoje">${magicImageSVG()}${result.added.map(id=>{const e=result.project.elements.find(e=>e.id===id),p=pose.poses[id];return !p||e.parentId?'':p.outline?.length?`<polygon points="${p.outline.map(p=>p.x+','+p.y).join(' ')}" fill="#e5ecee" fill-opacity=".35" stroke="#708594" vector-effect="non-scaling-stroke"/>`:line(p.a,p.b,'stroke="#708594" stroke-width="5" vector-effect="non-scaling-stroke"');}).join('')}${joints.map((j,i)=>{const a=K.point(pose,j.a),b=K.point(pose,j.b);return `<g>${line(a,b,'stroke="#c64a24" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"')}<circle cx="${a.x}" cy="${a.y}" r="${bounds.width/70}" fill="#fff" stroke="#c64a24"/><text x="${a.x}" y="${a.y+bounds.width/230}" text-anchor="middle" font-size="${bounds.width/60}" fill="#c64a24">${i+1}</text></g>`;}).join('')}</svg>`;
    modal('Obrysy rozpoznané · overte navrhnuté väzby',`<form id="magic-detection-review-form"><p class="mechanism-stages">Telesá → vlastníctvo otvorov → väzby → skúška pohybu</p><p>${result.added.length} prvkov prešlo kontrolou bodov a rozmerov. Tvar obrysu sám neurčuje funkciu spoja. Potvrďte iba spojenia, ktoré poznáte z mechanizmu.</p>${overview}${preview}<div class="detection-joint-review">${joints.map((j,i)=>`<label class="check-row"><input name="joint" type="checkbox" value="${escape(j.id)}"/><span>${i+1}. ${escape(result.project.elements.find(e=>e.id===j.a.elementId)?.name)} ↔ ${escape(result.project.elements.find(e=>e.id===j.b.elementId)?.name)} · neistý otočný spoj · ${[j.a,j.b].some(r=>result.project.elements.find(e=>e.id===r.elementId)?.parentId)?'zhodné otvory / montážne body':'zhodné konce členov'}</span></label>`).join('')||'<p>Žiadne spojenie sa nenavrhuje automaticky. Obrysy možno vložiť a spojiť ručne.</p>'}</div><p class="section-description">Nepotvrdené väzby sa nevložia. Montážne body upravíte cez zelené čapy v detekcii alebo neskôr na plátne.</p><div id="magic-mechanism-status" role="status"></div><button type="button" class="button button-secondary" data-action="magic-test-mechanism">Overiť návrh pohybom</button><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Späť k detekcii</button><button class="button button-dark">Vložiť obrysy a potvrdené väzby</button></div></form>`,true);
  }
  function commitDetectedReview(data) {
    const magic=state.magic,review=magic?.review;if(!review||review.revision!==JSON.stringify(state.project))throw new Error('Detekcia alebo projekt sa zmenili. Návrh vytvorte znova.');
    const accepted=new Set(data.getAll('joint')),ids=new Set(review.joints.map(j=>j.id)),next=K.copy(review.project);next.connections=next.connections.filter(j=>!ids.has(j.id)||accepted.has(j.id));
    if(magic.motionProbe?.failed&&magic.motionProbe.signature===[...accepted].sort().join('|')&&!data.has('accept-probe-conflict'))throw new Error('Skúška pohybu je blokovaná. Upravte väzby alebo potvrďte vloženie na ručnú opravu.');
    const validated=K.validateProject(next);pushHistory();state.project=validated;magic.geometryStarted=true;magic.detectAdded=review.added;magic.review=null;state.selectedElementIds=review.added.map(I.elementKey);changed(false);setMagicStep(3);toast('Obrysy a potvrdené väzby boli vložené.');
  }
  function magicDetectionSVG(scale) {
    const magic = state.magic;
    if (!magic || magic.step !== 2.5 || !magic.scale) return '';
    const corners = magic.detectRegion ? [{ x: magic.detectRegion.x, y: magic.detectRegion.y }, { x: magic.detectRegion.x + magic.detectRegion.width, y: magic.detectRegion.y + magic.detectRegion.height }] : magic.detectRegionPoints || [];
    const region = corners.map((p) => M.worldFromPixel(p, magic.scale));
    const boundary = region.length === 2 ? `<rect data-detection-region="true" x="${Math.min(region[0].x, region[1].x)}" y="${Math.min(region[0].y, region[1].y)}" width="${Math.abs(region[1].x - region[0].x)}" height="${Math.abs(region[1].y - region[0].y)}" fill="none" stroke="#a64422" stroke-width="2" stroke-dasharray="8 4" vector-effect="non-scaling-stroke"/>` : region.length === 1 ? `<circle cx="${region[0].x}" cy="${region[0].y}" r="${5 / scale}" fill="#a64422"/>` : '';
    return `<g data-editor-overlay="magic-detection" pointer-events="none">${boundary}${(magic.detectCandidates || []).map((c, index) => {
      const points = c.points.map((p) => M.worldFromPixel(p, magic.scale)), color = c.selected ? '#a64422' : '#78818a';
      const outline = ['ground', 'link', 'panel', 'rail'].includes(c.type) && c.outline?.length ? c.outline.map((p) => M.worldFromPixel(p, magic.scale)) : [];
      const mark = outline.length ? `<polygon points="${outline.map((p) => `${p.x},${p.y}`).join(' ')}" fill="${color}" fill-opacity=".06" stroke="${color}" stroke-width="2" stroke-dasharray="${c.selected ? '6 3' : '2 4'}" vector-effect="non-scaling-stroke"/>` : points.length === 1 ? `<circle cx="${points[0].x}" cy="${points[0].y}" r="${Math.max(5 / scale, c.radius * magic.scale.mmPerPixel)}" fill="none" stroke="${color}" vector-effect="non-scaling-stroke"/>` : `<polyline points="${points.map((p) => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="${c.selected ? '6 3' : '2 4'}" vector-effect="non-scaling-stroke"/>`;
      const mounts = c.useAnchors !== false && ['ground', 'link', 'panel'].includes(c.type) ? (c.anchors || []).map((anchor) => {
        const at = M.worldFromPixel(anchor, magic.scale), radius = Math.max(4 / scale, anchor.radius * magic.scale.mmPerPixel);
        return `<circle data-detection-anchor="true" cx="${at.x}" cy="${at.y}" r="${radius}" fill="#fff" fill-opacity=".5" stroke="${color}" stroke-width="1.5" vector-effect="non-scaling-stroke"/>`;
      }).join('') : '';
      return `${mark}${mounts}<text x="${points[0].x + 8 / scale}" y="${points[0].y - 8 / scale}" font-size="${12 / scale}" fill="${color}" stroke="#fff" stroke-width="${3 / scale}" paint-order="stroke">${index + 1}</text>`;
    }).join('')}</g>`;
  }

  function selectMagicTool(tool, placement = null) {
    const magic = state.magic;
    if (!magicWorking()) return;
    const allowed = magic.step === 3 ? ['ground-line', 'ground-outline', 'fixed-point', 'select'] : ['member', 'select', 'place'];
    if (!allowed.includes(tool) || tool === 'place' && !K.TYPES.includes(placement)) return;
    if (state.drag) onPointerUp({ pointerId: state.drag.pointerId, cancelled: true });
    closeContextMenu(); magic.tool = tool; magic.placementType = placement; magic.drawing = []; magic.preview = null;
    state.pendingJoint = null; state.tool = tool === 'select' ? 'select' : 'magic-draw';
    $('.sidebar').classList.remove('mobile-open');
    renderMagicImport(); updateToolbar(); renderScene();
  }

  function clearMagicDrawing() {
    if (!state.magic) return;
    state.magic.drawing = []; state.magic.preview = null; state.magic.placementType = null;
    state.magic.error = ''; state.magic.tool = 'select'; state.tool = state.magic.step === 2 ? 'magic-scale' : 'select';
    renderMagicImport(); renderScene(); updateToolbar();
  }

  function commitMagicDrawing() {
    const magic = state.magic;
    if (!magicWorking() || !magic.drawing.length) return;
    const type = magic.tool === 'member' ? magic.memberType : magic.tool === 'fixed-point' ? 'node' : 'ground';
    if (magic.tool === 'ground-outline' && magic.drawing.length < 3) throw new Error('Obrys rámu potrebuje aspoň tri vrcholy.');
    const next = M.traceBody(state.project, type, magic.drawing, magic.width), e = next.elements.at(-1);
    magic.drawing = []; magic.preview = null; magic.error = '';
    editCanvas(next, 'Obkreslená časť bola vložená v milimetroch.', [type === 'node' ? I.nodeKey({ elementId: e.id, point: 'a' }) : I.elementKey(e.id)]);
  }

  function magicPointer(point) {
    const magic = state.magic;
    if (!magic) return false;
    if (magic.step === 2.5 && ['detect-outline', 'detect-anchor', 'detect-split', 'detect-edit'].includes(magic.tool) && !magic.busy) {
      const pixel = M.pixelFromWorld(point, magic.scale); if (pixel.x < 0 || pixel.y < 0 || pixel.x > magic.image.width || pixel.y > magic.image.height) return true;
      try {
        if (magic.tool === 'detect-outline') { if (magic.drawing.length >= 64) throw new Error('Najviac 64 vrcholov.'); magic.drawing.push(pixel); }
        if (magic.tool === 'detect-anchor') { const c = magic.detectCandidates.find((c) => c.id === magic.detectEditId); if (!c) return true; if ((c.anchors || []).length >= 24) throw new Error('Najviac 24 montážnych bodov.'); pushDetectionHistory(); c.anchors ||= []; c.anchors.push({ ...pixel, radius: 4 }); c.useAnchors = true; c.evidence.manual = true; magic.tool = 'detect-edit'; }
        if (magic.tool === 'detect-split') { if (magic.detectCandidates.length >= 60) throw new Error('Najviac 60 návrhov.'); const next = WF.splitCandidate(magic.detectCandidates, magic.detectEditId, pixel); pushDetectionHistory(); magic.detectCandidates = next; magic.detectEditId = next.at(-1).id; magic.tool = 'detect-edit'; }
        renderMagicImport(); renderScene();
      } catch (error) { toast(error.message, true); }
      return true;
    }
    if (magic.step === 2.5 && magic.tool === 'detection-region' && !magic.busy) {
      const pixel = M.pixelFromWorld(point, magic.scale);
      if (!Number.isFinite(pixel.x) || !Number.isFinite(pixel.y) || pixel.x < 0 || pixel.y < 0 || pixel.x > magic.image.width || pixel.y > magic.image.height) { toast('Roh oblasti musí ležať na obrázku.', true); return true; }
      magic.detectRegionPoints ||= [];
      const a = magic.detectRegionPoints[0];
      if (!a) magic.detectRegionPoints.push(pixel);
      else {
        const x = Math.floor(Math.min(a.x, pixel.x)), y = Math.floor(Math.min(a.y, pixel.y));
        const width = Math.ceil(Math.max(a.x, pixel.x)) - x, height = Math.ceil(Math.max(a.y, pixel.y)) - y;
        if (width < 5 || height < 5) { toast('Vyberte oblasť aspoň 5 × 5 px.', true); return true; }
        magic.detectRegion = { x, y, width, height }; magic.detectRegionPoints = []; magic.tool = 'select';
      }
      magic.error = ''; renderMagicImport(); renderScene(); return true;
    }
    if ([1, 2.5, 5].includes(magic.step)) return true;
    if (magic.step === 2) {
      if (point.x < 0 || point.y < 0 || point.x > magic.image.width || point.y > magic.image.height) { toast('Kalibračný bod musí ležať na obrázku.', true); return true; }
      if (magic.points.length === 2) magic.points = [];
      magic.points.push({ x: point.x, y: point.y }); if (!magic.geometryStarted) magic.scale = null; magic.error = '';
      renderMagicImport(); renderMagicReference(); return true;
    }
    if (state.tool !== 'magic-draw') return false;
    try {
      if (magic.placementType) {
        const type = magic.placementType; magic.placementType = null; magic.tool = 'select'; state.tool = 'select';
        addElement(type, point); renderMagicImport(); updateToolbar(); return true;
      }
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || Math.abs(point.x) > 5000 || Math.abs(point.y) > 5000) throw new Error('Kreslite v rozsahu editora ±5000 mm.');
      const scale = Math.hypot($('#mechanism-canvas').getScreenCTM()?.a || 1, $('#mechanism-canvas').getScreenCTM()?.b || 0);
      if (magic.tool === 'ground-outline' && magic.drawing.length >= 3 && K.distance(point, magic.drawing[0]) <= 9 / scale) { commitMagicDrawing(); return true; }
      if (magic.drawing.length >= M.limits.vertices) throw new Error('Obrys má najviac 64 vrcholov. Uzavrite ho alebo zrušte rozkreslenie.');
      magic.drawing.push(snapDrawingPoint(point));
      if (magic.tool === 'fixed-point' || magic.tool !== 'ground-outline' && magic.drawing.length === 2) commitMagicDrawing();
      else { renderMagicImport(); renderScene(); }
    } catch (error) { magic.error = error.message; renderMagicImport(); renderScene(); toast(error.message, true); }
    return true;
  }

  function onMagicSetting(input) {
    const magic = state.magic, setting = input.dataset?.magicSetting;
    if (!magic || !setting) return false;
    if (setting === 'distance') magic.distanceInput = input.value;
    if (setting === 'scale-axis') magic.scaleAxis = input.value;
    if (setting === 'auto-detect') {
      const form = $('#magic-scale-form');
      magic.detectEnabled = input.checked; renderMagicImport();
      if (form) $('#magic-scale-form')?.replaceWith(form);
    }
    if (setting === 'detect-sensitivity') magic.detectSensitivity = K.clamp(Number(input.value), 10, 90);
    if (setting === 'detect-joints') magic.detectJoints = input.checked;
    if (['detect-selected', 'detect-type', 'detect-anchors'].includes(setting) && !magic.busy) {
      const candidate = magic.detectCandidates?.find((c) => c.id === input.dataset.detection);
      if (candidate) {
        pushDetectionHistory();
        if (setting === 'detect-selected') candidate.selected = input.checked;
        else if (setting === 'detect-anchors') candidate.useAnchors = input.checked;
        else if ((candidate.points.length === 1 ? ['bearing', 'node'] : ['ground', 'link', 'panel', 'rail', 'slot']).includes(input.value)) candidate.type = input.value;
        renderMagicImport(); renderScene();
      }
    }
    if (['distance', 'scale-axis', 'pixel'].includes(setting) && input.form) $('#magic-scale-preview').textContent = magicScalePreview(new FormData(input.form));
    if (setting === 'name') magic.name = input.value;
    if (setting === 'backup') magic.backupAcknowledged = input.checked;
    if (setting === 'show-image') { magic.showImage = input.checked; renderScene(); }
    if (setting === 'opacity') { magic.opacity = K.clamp(Number(input.value) / 100, .1, 1); renderScene(); }
    if (setting === 'width') {
      const value = Number(input.value);
      if (!input.value.trim() || !Number.isFinite(value) || value < .1 || value > 5000) { input.value = magic.width; toast('Hrúbka musí byť 0,1 až 5000 mm.', true); }
      else magic.width = value;
    }
    if (setting === 'member-type' && ['link', 'panel', 'rail'].includes(input.value)) { magic.memberType = input.value; magic.drawing = []; magic.preview = null; renderScene(); }
    return true;
  }

  function persistMagicProjects(project, original) {
    const text = localStorage.getItem(storageKey), records = text ? JSON.parse(text) : [];
    if (!Array.isArray(records) || records.length > 20) throw new Error('Projektové úložisko má neplatný obsah. Pôvodné dáta sa neprepísali.');
    try {
      for (const record of records) if (!record?.id || K.validateProject(record).id !== record.id) throw new Error();
      if (new Set(records.map((record) => record.id)).size !== records.length) throw new Error();
    } catch { throw new Error('Projektové úložisko má poškodené alebo opakované záznamy. Pôvodné dáta sa neprepísali.'); }
    const keepOriginal = original.dirty || original.saved || original.project.elements.length > 0;
    const next = [project, ...(keepOriginal ? [K.copy(original.project)] : []), ...records.filter((p) => p.id !== project.id && p.id !== original.project.id)];
    if (next.length > 20) throw new Error('Úložisko už obsahuje 20 projektov. Magic import nevymaže staršie projekty; nový projekt exportujte.');
    localStorage.setItem(storageKey, JSON.stringify(next));
    try { localStorage.setItem(lastKey, project.id); return true; } catch { return false; }
  }

  function magicOriginalPreserved(original) {
    if (!original.dirty && !original.saved && !original.project.elements.length) return true;
    try {
      const records = JSON.parse(localStorage.getItem(storageKey) || '[]'), previous = Array.isArray(records) && records.find((p) => p.id === original.project.id);
      return !!previous && JSON.stringify(K.validateProject(previous)) === JSON.stringify(K.validateProject(original.project));
    } catch { return false; }
  }

  function submitMagicFinish(data) {
    const magic = state.magic;
    if (!magic || magic.step !== 5 || magic.busy) return;
    const project = M.finish(state.project, magic.image, magic.scale, String(data.get('name') || ''));
    X.serializeNative(project, { workspace: magic.original, motion: K.driveRange(project).min });
    let stored = false, remembered = false;
    try { remembered = persistMagicProjects(project, magic.original); stored = true; }
    catch (error) {
      magic.storageError = error.message || 'Nový projekt sa nedal uložiť do prehliadača.';
      if (!magicOriginalPreserved(magic.original) && !data.has('original-backup')) {
        magic.name = project.name; renderMagicImport();
        toast('Najskôr zachovajte pôvodný projekt: exportujte ho a potvrďte uloženú zálohu. Rozpracovaná schéma zostáva nedotknutá.', true);
        return;
      }
    }
    const preferences = { ...X.preferences(magic.original), mode: 'edit' };
    if (magic.image) URL.revokeObjectURL(magic.image.url);
    for (const pose of magic.poses || []) URL.revokeObjectURL(pose.image.url);
    state.magic = null; $('#modal').close();
    loadProject(project, { workspace: preferences }, true);
    state.saved = stored; state.dirty = !stored; state.storageFailed = !stored;
    updateHeader(); renderMagicImport();
    toast(stored ? remembered ? 'Magic import je dokončený. Nový aj pôvodný projekt sú uložené samostatne.' : 'Schéma je uložená; posledný výber projektu sa neuložil.' : 'Schéma je dokončená iba v pamäti. Exportujte ju do .kinmo.', !stored);
  }

  function cancelMagicImport(confirmed = false) {
    const magic = state.magic;
    if (!magic) return;
    if (!confirmed && (magic.geometryStarted || magic.drawing.length)) {
      modal('Zrušiť Magic import?', '<p class="modal-description">Rozpracované obkresľovanie sa zahodí. Pôvodný projekt, jeho výber a história Späť sa obnovia.</p><div class="modal-actions"><button class="button button-secondary" data-action="close-modal">Pokračovať v sprievodcovi</button><button class="button button-dark" data-action="magic-confirm-cancel">Zrušiť obkresľovanie</button></div>');
      return;
    }
    if (state.drag) onPointerUp({ pointerId: state.drag.pointerId, cancelled: true });
    magic.detectController?.abort();
    if (magic.image) URL.revokeObjectURL(magic.image.url);
    for (const pose of magic.poses || []) URL.revokeObjectURL(pose.image.url);
    clearTimeout(autosaveTimer); Object.assign(state, magic.original); state.magic = null; state.playing = false;
    $('#modal').close(); renderMagicImport(); renderTree(); renderInspector(); renderScene(); renderGraph(); updateHeader(); updateToolbar(); updateMotion();
    if (state.dirty) autosaveTimer = setTimeout(() => saveProject(true), 1400);
    $('[data-action="projects"]').focus({ preventScroll: true });
    toast('Pôvodný projekt bol obnovený bez zmien.');
  }
