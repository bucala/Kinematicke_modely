/* Kinematika UI · Exporty, GIF, PDF, nastavenia a prepojenie s Fusion.
   Klasický skript bez IIFE: zdieľa najvyššiu úroveň s ostatnými app/*.js a app.js, ktorý sa načíta posledný
   a definuje stav a konštanty. Súbor obsahuje iba deklarácie funkcií, pri načítaní nič nespúšťa. */
'use strict';
  function download(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; anchor.dataset.kinmoDownload = 'true'; document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`Súbor ${filename} bol pripravený na stiahnutie.`);
  }

  function gifOptions(data) {
    return { width: Number(data.get('width')), duration: Number(data.get('duration')), fps: Number(data.get('fps')), direction: data.get('direction'), loop: data.has('loop') };
  }

  function gifModal() {
    if (state.magic || state.drag) { toast('Najprv dokončite rozpracovanú úpravu alebo Magic import.', true); return; }
    if (!state.project.elements.some((e) => e.visible)) { toast('Najprv vytvorte viditeľný mechanizmus s pohonom.', true); return; }
    const range = K.driveRange(state.project);
    modal('Animovaný GIF', `<form id="gif-form"><fieldset id="gif-options" class="gif-fields settings-fields">
      <label class="property-field"><span>Šírka obrázka</span><select name="width" class="property-select">${[160, 320, 480, 640, 800, 1000, 1200].map((width) => `<option value="${width}"${width === 800 ? ' selected' : ''}>${width} px</option>`).join('')}</select></label>
      <label class="property-field"><span>Trvanie cyklu (s)</span><input name="duration" class="text-field" type="number" value="6" min="1" max="12" step="0.1" required></label>
      <label class="property-field"><span>Snímky za sekundu</span><input name="fps" class="text-field" type="number" value="10" min="5" max="20" step="1" required></label>
      <label class="property-field"><span>Smer pohybu</span><select name="direction" class="property-select"><option value="roundtrip"${range.unit === 'mm' ? ' selected' : ''}>Tam a späť</option><option value="forward"${range.unit === '°' ? ' selected' : ''}>Jedným smerom</option></select></label>
      <label class="check-row"><input name="loop" type="checkbox" checked><span>Opakovať animáciu bez konca</span></label></fieldset>
      <p class="section-description">GIF prevezme aktuálny výrez, vzhľad, farby a viditeľné vrstvy schémy. Zobrazuje predpísaný kinematický pohyb, nie časový záznam odhadovej dynamiky. Pred exportom prispôsobte pohľad, aby sa celý pohyb zmestil do plátna.</p>
      <p class="section-description">Najviac 1 200 × 1 200 px, 180 snímok, 60 miliónov bodov spolu a 32 MB. Prípravu môžete zrušiť; po 90 sekundách sa zastaví. Všetko sa spracuje lokálne, bez odosielania projektu.</p>
      <p id="gif-estimate" class="gif-estimate" aria-live="polite"></p><progress id="gif-progress" class="gif-progress" value="0" max="1" aria-label="Priebeh GIF exportu" hidden></progress>
      <p id="gif-status" class="section-description" role="status" hidden></p><p id="gif-error" class="gif-error" role="alert" hidden></p>
      <div class="modal-actions"><button id="gif-back" type="button" class="button button-secondary" data-action="export">Späť</button><button id="gif-cancel" type="button" class="button button-secondary" data-action="cancel-gif" hidden>Zrušiť export</button><button id="gif-start" type="submit" class="button button-dark">${icon('export', 15)}Vytvoriť GIF</button></div></form>`);
    updateGIFEstimate();
  }

  function updateGIFEstimate() {
    const form = $('#gif-form');
    if (!form || state.gifExport) return;
    const estimate = $('#gif-estimate'), start = $('#gif-start');
    try {
      const plan = G.plan(K.driveRange(state.project), state.view, gifOptions(new FormData(form)));
      estimate.textContent = `${plan.width} × ${plan.height} px · ${plan.frames.length} snímok · ${fmt(plan.duration, 1)} s · ${fmt(plan.pixels / 1e6, 1)} mil. bodov`;
      estimate.classList.remove('gif-invalid'); start.disabled = false;
    } catch (error) { estimate.textContent = error.message; estimate.classList.add('gif-invalid'); start.disabled = true; }
  }

  function gifProgress(job, progress, text) {
    if (state.gifExport !== job || !$('#gif-form')) return;
    const bar = $('#gif-progress'), status = $('#gif-status');
    bar.hidden = false; bar.value = progress; status.hidden = false; status.textContent = text;
  }

  function cancelGIF() {
    const job = state.gifExport;
    if (!job || job.controller.signal.aborted) return;
    job.cancelled = true;
    job.controller.abort(new Error('GIF export bol zrušený.'));
    gifProgress(job, $('#gif-progress')?.value || 0, 'Ruším export… Projekt zostáva nezmenený.');
    const button = $('#gif-cancel'); if (button) button.disabled = true;
  }

  function checkGIF(job) {
    if (!$('#modal').open && !job.controller.signal.aborted) {
      job.cancelled = true;
      job.controller.abort(new Error('GIF export bol zrušený zatvorením dialógu.'));
    }
    if (job.controller.signal.aborted) throw job.controller.signal.reason || new Error('GIF export bol zrušený.');
    if (state.project !== job.original || state.gifExport !== job) throw new Error('Projekt sa počas GIF exportu zmenil. Súbor nebol vytvorený.');
  }

  function gifSource(job) {
    const live = $('#mechanism-canvas'), rect = live.getBoundingClientRect(), matrix = live.getScreenCTM();
    const host = document.createElement('div'), source = document.createElementNS(svgNS, 'svg');
    host.setAttribute('aria-hidden', 'true'); host.inert = true;
    host.style.cssText = 'position:fixed;left:-100000px;top:0;pointer-events:none';
    source.setAttribute('viewBox', `${job.view.x} ${job.view.y} ${job.view.width} ${job.view.height}`);
    source.setAttribute('width', rect.width); source.setAttribute('height', rect.height);
    source.style.cssText = `display:block;width:${rect.width}px;height:${rect.height}px`;
    source.classList.toggle('labels-hidden', state.labels === false);
    job.host = host; job.source = source;
    job.scale = Math.hypot(matrix?.a ?? 1, matrix?.b ?? 0) || 1;
    host.append(source); document.body.append(host);
  }

  async function gifFrameCanvas(job, motion) {
    checkGIF(job);
    const result = K.solve(job.project, motion, { profile: job.profile, collisions: state.collisions });
    if (result.blocked) throw new Error(`GIF sa zastavil pri ${fmt(motion, 2)} ${job.range.unit}: ${result.issues[0] || 'Mechanizmus je zablokovaný.'}`);
    job.source.innerHTML = sceneMarkup(result, { source: job.source, view: job.view, scale: job.scale, exporting: true, ghostSamples: job.ghostSamples });
    const svg = SC.snapshot(job.source, { view: job.view, width: job.plan.width, maxHeight: job.plan.height, title: job.project.name, description: 'Kinematická animácia mechanizmu.' });
    const canvas = await SC.rasterize(svg, job.plan, { signal: job.controller.signal, canvas: job.canvas, readPixels: true });
    job.canvas = canvas;
    checkGIF(job);
    return canvas;
  }

  async function exportGIF(data) {
    if (state.gifExport) return false;
    if (state.drag) throw new Error('Najprv dokončite presúvanie prvku.');
    if (state.magic) throw new Error('Najprv dokončite alebo zrušte Magic import.');
    if (!state.project.elements.some((e) => e.visible)) throw new Error('GIF potrebuje viditeľný mechanizmus s pohonom.');
    const project = K.validateProject(K.copy(state.project));
    if (project.kind === 'custom' && project.elements.filter((e) => e.drive).length !== 1) throw new Error('Vlastný mechanizmus potrebuje jeden nezávislý motor. Nastavte ho v paneli vlastností.');
    const range = K.driveRange(project), plan = G.plan(range, state.view, gifOptions(data));
    const blocked = state.samples.find((sample) => sample.blocked);
    if (blocked) throw new Error(`Najprv opravte zablokovanú polohu pri ${fmt(blocked.motion, 2)} ${range.unit}. ${blocked.issues?.[0] || ''}`.trim());
    const job = { original: state.project, project, range, plan, view: K.copy(state.view), profile: K.prepareProject(project), controller: new AbortController(), cancelled: false, host: null, canvas: null };
    const timer = setTimeout(() => job.controller.abort(new Error('GIF export prekročil 90 sekúnd. Zmenšite obrázok, trvanie alebo frekvenciu.')), G.limits.timeout);
    state.gifExport = job;
    try {
      $('#gif-options').disabled = true; $('#gif-start').disabled = true; $('#gif-back').disabled = true;
      $('#gif-cancel').hidden = false; $('#gif-cancel').disabled = false; $('#gif-error').hidden = true;
      const calibration = [...new Set([0, Math.floor(plan.frames.length / 2), plan.frames.length - 1])];
      job.ghostSamples = state.ghosts ? K.projectPhases(project).map((phase) => K.solve(project, phase.motion, { profile: job.profile, collisions: false })) : [];
      gifSource(job);
      const builder = G.createPalette();
      for (let i = 0; i < calibration.length; i++) {
        gifProgress(job, i / calibration.length * 0.1, `Pripravujem farby schémy (${i + 1}/${calibration.length})…`);
        const canvas = await gifFrameCanvas(job, plan.frames[calibration[i]].motion);
        builder.add(canvas.getContext('2d').getImageData(0, 0, plan.width, plan.height).data);
      }
      const palette = builder.finish(), encoder = G.createEncoder({ width: plan.width, height: plan.height, palette: palette.colors, loop: plan.loop });
      let reference = null, hasMotion = false;
      for (let i = 0; i < plan.frames.length; i++) {
        const frame = plan.frames[i];
        gifProgress(job, 0.1 + i / plan.frames.length * 0.9, `Kreslím snímku ${i + 1}/${plan.frames.length}…`);
        const canvas = await gifFrameCanvas(job, frame.motion), indices = palette.indices(canvas.getContext('2d').getImageData(0, 0, plan.width, plan.height).data);
        if (!i) reference = indices;
        else if (!hasMotion) {
          for (let point = 0; point < indices.length; point++) if (indices[point] !== reference[point]) { hasMotion = true; reference = null; break; }
        }
        encoder.addFrame(indices, frame.delay);
        await new Promise((resolve) => setTimeout(resolve, 0));
        checkGIF(job);
      }
      if (!hasMotion) throw new Error('Zvolený pohon a rozsah nevytvárajú viditeľný pohyb. Skontrolujte motor alebo zvýšte frekvenciu snímok.');
      const bytes = encoder.finish();
      checkGIF(job);
      const slug = project.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase().slice(0, 70) || 'mechanizmus';
      download(`${slug}.gif`, bytes, 'image/gif');
      gifProgress(job, 1, `GIF je pripravený: ${plan.frames.length} snímok, ${fmt(plan.duration, 1)} s, ${fmt(bytes.length / 1024, 0)} kB. Projekt zostal nezmenený.`);
      return true;
    } catch (error) {
      if (job.cancelled) { gifProgress(job, $('#gif-progress')?.value || 0, 'Export zrušený. Projekt zostal nezmenený.'); return false; }
      if (job.controller.signal.aborted) throw job.controller.signal.reason || error;
      throw error;
    } finally {
      clearTimeout(timer); job.host?.remove();
      if (job.canvas) { job.canvas.width = 0; job.canvas.height = 0; }
      if (state.gifExport === job) state.gifExport = null;
      if (job.resized) renderScene();
      if ($('#gif-form')) {
        $('#gif-options').disabled = false; $('#gif-back').disabled = false; $('#gif-cancel').hidden = true;
        updateGIFEstimate();
      }
    }
  }

  function gifError(error) {
    const element = $('#gif-error'), status = $('#gif-status');
    if (element) { element.hidden = false; element.textContent = error.message; }
    if (status) status.hidden = true;
    toast(error.message, true);
  }
  function loadPDF() {
    if (!pdfLoader) pdfLoader = (async () => {
      for (const src of ['./vendor/pdfmake/pdfmake.min.js', './vendor/pdfmake/vfs_fonts.js']) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          const timer = setTimeout(() => { script.remove(); reject(new Error('PDF modul sa nenačítal. Použite HTML report alebo skontrolujte súbory aplikácie.')); }, 15000);
          script.src = new URL(src, document.baseURI).href;
          script.onload = () => { clearTimeout(timer); resolve(); };
          script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('PDF modul nie je dostupný. Skontrolujte súbory aplikácie alebo použite HTML report.')); };
          document.head.append(script);
        });
      }
      return globalThis.pdfMake;
    })().catch((error) => { pdfLoader = null; throw error; });
    return pdfLoader;
  }

  async function exportFile(type) {
    try {
      const slug = state.project.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase().slice(0, 70) || 'mechanizmus';
      if (type === 'json') download(`${slug}.json`, X.serializeProject(state.project), 'application/json');
      if (type === 'kinmo') download(`${slug}.kinmo`, X.serializeNative(state.project, { workspace: state, motion: state.motion }), 'application/vnd.kinmo+json');
      if (type === 'dxf') download(`${slug}.dxf`, X.dxf(state.project, state.result, { dimensions: state.dimensions, trajectories: state.trace, samples: state.samples, references: traceReferences(), traceSpace: state.traceSpace, slotOutlines: state.cadSlotOutlines }), 'application/dxf');
      if (type === 'forces') {
        if (!state.forceContext) prepareForces();
        download(`${slug}-sily.csv`, X.forceCSV(state.project, state.samples, state.forceContext, state.dynamicHistory), 'text/csv;charset=utf-8');
      }
      if (type === 'html' || type === 'pdf') {
        if (!state.forceContext) prepareForces();
        const data = X.reportData(state.project, state.result, state.samples, { forceContext: state.forceContext, forceError: state.forceError, history: state.dynamicHistory, references: traceReferences(), traceSpace: state.traceSpace, scene: { svg: sceneSVG(), ...SC.size(state.view) } });
        if (type === 'html') download(`${slug}-report.html`, X.htmlReport(data), 'text/html;charset=utf-8');
        else {
          const canvas = await SC.rasterize(data.drawing, data.drawingSize);
          data.drawingImage = canvas.toDataURL('image/png');
          const pdfMake = await loadPDF();
          const buffer = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Príprava PDF nebola potvrdená. Použite HTML report alebo menší model.')), 30000);
            pdfMake.createPdf(X.pdfReport(data)).getBuffer((bytes) => { clearTimeout(timer); resolve(bytes); });
          });
          download(`${slug}-report.pdf`, buffer, 'application/pdf');
        }
      }
      if (type === 'png') {
        const canvas = await SC.rasterize(sceneSVG(), SC.size(state.view));
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Prehliadač nevytvoril PNG.');
        download(`${slug}.png`, blob, 'image/png');
      }
      if (type === 'csv') {
        const unit = K.driveRange(state.project).unit;
        const rows = [['pohon_' + (unit === 'mm' ? 'mm' : 'deg'), 'uhol_vystupu_deg', 'posuv_mm', 'bod_x_mm', 'bod_y_mm', 'chyba_vazieb_mm', 'chyba_vazieb_deg', 'blokovanie', 'dovod', ...(isDoubleDrawer() ? ['uhol_ramena_deg', 'faza', 'A_korpus_x_mm', 'A_korpus_y_mm', 'B_korpus_x_mm', 'B_korpus_y_mm', 'A_zasuvka_x_mm', 'A_zasuvka_y_mm', 'B_zasuvka_x_mm', 'B_zasuvka_y_mm', 'odhadove_rozmery', 'sustava_zvoleneho_bodu'] : [])].join(';')];
        for (const s of state.samples) {
          const point = K.tracePoint(s, state.traceRef, state.traceSpace);
          const quote = (v) => `"${String(v).replace(/"/g, '""')}"`;
          const extra = [];
          if (isDoubleDrawer()) {
            extra.push(s.secondaryAngle.toFixed(3), s.phase);
            for (const space of ['world', 'carrier']) for (const reference of DD.traces) {
              const position = K.tracePoint(s, reference, space);
              extra.push(position.x.toFixed(3), position.y.toFixed(3));
            }
            extra.push('1', quote(state.traceSpace === 'carrier' ? 'zasuvka' : 'korpus'));
          }
          rows.push([s.motion.toFixed(3), s.angle.toFixed(3), s.displacement.toFixed(3), point?.x.toFixed(3) || '', point?.y.toFixed(3) || '', s.positionResidual.toFixed(5), s.angularResidual.toFixed(5), s.blocked ? '1' : '0', quote(s.issues.join(' | ')), ...extra].join(';'));
        }
        download(`${slug}-pohyb.csv`, '\uFEFF' + rows.join('\r\n'), 'text/csv;charset=utf-8');
      }
      if (type === 'svg') download(`${slug}.svg`, X.vectorSVG(state.project, state.result, { dimensions: state.dimensions, trajectories: state.trace, samples: state.samples, references: traceReferences(), traceSpace: state.traceSpace }), 'image/svg+xml');
    } catch (error) { toast(error.message || 'Export sa nepodarilo dokončiť.', true); }
  }

  function sceneSVG() {
    return SC.snapshot(state.analysis ? $('#analysis-preview') || $('#mechanism-canvas') : $('#mechanism-canvas'), { view: state.view, title: state.project.name, description: X.warning });
  }

  function settingsModal() {
    const s = { ...K.simulationDefaults, ...state.project.simulation }, unit = K.driveRange(state.project).unit === '°' ? 'N·m' : 'N';
    modal('Pracovný priestor, vzhľad a simulácia', `<form id="settings-form"><div class="settings-fields">
      <label class="property-field"><span>Jazyk aplikácie</span><select name="language"><option value="sk"${state.language==='sk'?' selected':''}>Slovenčina</option><option value="en"${state.language==='en'?' selected':''}>English</option><option value="de"${state.language==='de'?' selected':''}>Deutsch</option></select></label>
      <fieldset class="skin-picker"><legend>Vzhľad aplikácie</legend><div>${[['slate', 'Slate & Indigo'], ['sage', 'Neutral Sage'], ['steel', 'Steel & Teal'], ['sand', 'Warm Sand & Coffee'], ['dark', 'Dark Mode']].map(([value, name]) => `<label class="skin-choice" data-skin="${value}"><input type="radio" name="theme" value="${value}"${state.theme === value ? ' checked' : ''}/><span class="skin-samples" aria-hidden="true"><i></i><i></i><i></i></span><strong>${name}</strong></label>`).join('')}</div><p>Vzhľad sa zmení a uloží hneď. Parametre simulácie potvrďte tlačidlom nižšie.</p></fieldset>
      <label class="property-field"><span>Spôsob simulácie</span><select name="simulation-mode" class="property-select"><option value="kinematic"${s.mode !== 'dynamic' ? ' selected' : ''}>Kinematika · predpísaný pohyb</option><option value="dynamic"${s.mode === 'dynamic' ? ' selected' : ''}>Odhadová dynamika · pohyb zo síl</option></select></label>
      <label class="check-row"><input name="return-on-release" type="checkbox"${s.returnOnRelease !== false ? ' checked' : ''}/>Po pustení v simulácii vrátiť mechanizmus silou pružín / piestov</label><label class="property-field"><span>Čas kinematického zdvihu (s)</span><input name="cycle" class="text-field" type="number" min="1" max="60" step=".5" value="${state.cycle}" required/></label>
      ${[['returnDamping', 'Dodatočné osové tlmenie pri návrate (N·s/m)', 0, 100000, .1], ['gravity', 'Gravitácia (m/s²)', 0, 100, .01], ['damping', `Tlmenie pohonu (${unit}·s/${unit === 'N' ? 'm' : 'rad'})`, 0, 1000000, .1], ['friction', `Suché trenie pohonu (${unit})`, 0, 1000000, .1], ['inputForce', `Vonkajšia sila / moment pohonu (${unit})`, -1000000, 1000000, .1], ['initialVelocity', `Počiatočná rýchlosť (${K.driveRange(state.project).unit}/s)`, -1000000, 1000000, .1], ['duration', 'Čas odhadovej dynamiky (s)', .1, 120, .1]].map(([name, label, min, max, step]) => `<label class="property-field"><span>${label}</span><input class="text-field" name="${name}" type="number" min="${min}" max="${max}" step="${step}" value="${s[name]}" required/></label>`).join('')}
      <label class="check-row"><input name="snap" type="checkbox"${state.snap ? ' checked' : ''}/><span>Prichytávať prvky na mriežku (5 mm)</span></label><label class="check-row"><input name="collisions" type="checkbox"${state.collisions ? ' checked' : ''}/><span>Kontrolovať kolízie v jednej rovine</span></label><label class="check-row"><input name="forceArrows" type="checkbox"${state.forceArrows ? ' checked' : ''}/><span>Zobraziť smerové šípky síl</span></label>
      <p class="section-description">Dynamika podporuje určený pohon, voľnú silovú zostavu a voliteľný pružný kontakt vačky. Pevné dorazy zostávajú predvolené; pružnosť, tlmenie a trenie nastavíte v Kontakt a dorazy. Časový program viacerých pohonov predpisuje pohyb nezávislých stôp. Hmotnosti nastavte v inšpektore jednotlivých telies.</p></div><div class="modal-actions"><button class="button button-secondary" type="button" data-action="export">Súbory, obrázky a report</button><button class="button button-secondary" type="button" data-action="fusion">Autodesk Fusion</button><button class="button button-dark" type="submit">Použiť nastavenia</button></div></form>`, true);
  }

  function fusionModal() {
    const available = ['http:', 'https:'].includes(location.protocol) && globalThis.KinmoNative?.platform !== 'android', savedKey = CAD.rememberedKey();
    modal('Lokálne prepojenie · Autodesk Fusion', `<p class="modal-description">Doplnok vytvorí nový, neuložený referenčný dokument. Existujúce návrhy nemení. Krivky sú fixované úsečky, kulisy majú strednice a voliteľné uzavreté referenčné obrysy; kóty sú referenčné popisy. Nejde o výrobný profil, 3D zostavu ani Fusion joints.</p>
      ${globalThis.KinmoNative?.platform==='android'?'<p class="analysis-warning">Fusion beží na Windows alebo macOS. V Android aplikácii použite export DXF a otvorte ho na počítači.</p>':''}<ol class="fusion-steps"><li>Stiahnite a rozbaľte doplnok. Vo Fusion: Utilities → Scripts and Add-Ins → Add-Ins → šípka pri + → Script or add-in from device → priečinok KinmoFusion. Nevytvárajte nový prázdny doplnok.</li><li>Vyberte KinmoFusion a stlačte Run. Ak už beží s inou adresou, zastavte ho a spustite znova; môžete použiť uložené párovanie alebo vytvoriť nový kľúč. Povoľte presný pôvod <code>${escape(available ? location.origin : 'HTTP(S) adresa aplikácie')}</code>.</li><li>Pri prvom párovaní vložte nižšie kľúč z Fusion. Pre opätovné použitie ho zapamätajte v doplnku aj prehliadači. Povoľte lokálnu sieť, ak si ju prehliadač vyžiada.</li></ol>
      <a class="button button-secondary" href="./cad/KinmoFusion.zip" download${!available ? ' aria-disabled="true"' : ''}>Stiahnuť doplnok KinmoFusion (ZIP)</a>
      <form id="fusion-form"><label class="property-field"><span>Párovací kľúč z doplnku Fusion</span><input class="text-field" name="key" type="password" autocomplete="off" minlength="20" maxlength="100" value="${escape(savedKey)}" required/></label>
      <label class="check-row"><input name="remember-pairing" type="checkbox"${savedKey ? ' checked' : ''}/><span>Zapamätať overený kľúč v tomto prehliadači</span></label><p class="section-description">V doplnku Fusion tiež zvoľte zapamätanie párovania. Kľúč zostane iba v úložisku tohto webu; nie je súčasťou projektu ani exportov.</p><button type="button" class="button button-secondary" data-action="fusion-forget">Zabudnúť kľúč v prehliadači</button>
      <label class="check-row"><input id="cad-slot-outlines" type="checkbox"${state.cadSlotOutlines ? ' checked' : ''}/><span>Pridať uzavreté referenčné obrysy drážok podľa šírky</span></label><p class="section-description">Obrysy sa vložia do vrstiev SLOT_REFERENCE_OUTLINE / INNER. Strednice ostávajú vo vrstve SLOT. Pretínajúce sa alebo zrútené obrysy sa neodosielajú.</p>
      <label class="check-row"><input type="checkbox" name="trajectories"/><span>Pridať pomocné trajektórie pohybu</span></label><p class="section-description">Trajektórie sú pomocné krivky, nie súčiastky. Predvolene sa neposielajú.</p>
      <label class="check-row"><input type="checkbox" name="consent" required/><span>Súhlasím s odoslaním viditeľnej geometrie do nového dokumentu v bežiacom Fusion.</span></label>
      <p class="section-description">Spojenie: <code>${escape(CAD.ENDPOINT)}</code>, iba toto zariadenie. Po práci zastavte doplnok. ${available ? 'Nie sú potrebné prihlasovacie údaje Autodesk.' : globalThis.KinmoNative?.platform==='android'?'Na Android zariadení použite DXF pre počítač.':'file:// nemôže použiť priame spojenie. Spustite lokálny server alebo použite DXF; doplnok je tiež v priečinku cad/KinmoFusion.'}</p>
      <div id="fusion-status" class="fusion-feedback" data-state="idle" role="status" aria-live="polite" aria-atomic="true">Najskôr overte spojenie. Overenie nevytvorí dokument vo Fusion; výkres odošle až druhé tlačidlo.</div>
      <div class="modal-actions"><button type="button" class="button button-secondary" data-action="fusion-check"${!available ? ' disabled' : ''}>Overiť spojenie</button><button type="submit" class="button button-dark"${!available ? ' disabled' : ''}>Odoslať nový referenčný výkres</button></div></form>`, true);
  }

  function fusionFeedback(message, status = 'idle', target = $('#fusion-status')) {
    if (!target || target !== $('#fusion-status')) return;
    target.textContent = message; target.dataset.state = status;
    target.setAttribute('aria-busy', String(status === 'busy'));
    target.scrollIntoView?.({ block: 'nearest' });
  }

  async function checkFusionConnection(button) {
    const target = $('#fusion-status'), form = $('#fusion-form');
    button.disabled = true;
    fusionFeedback('Overujem spojenie s doplnkom na tomto zariadení… Ak Chrome požiada o prístup k lokálnej sieti, povoľte ho.', 'busy', target);
    try {
      const ready = await CAD.status(form.elements.key.value.trim());
      CAD.rememberPairing(form.elements.key.value, !!form.elements['remember-pairing']?.checked);
      if (ready.busy) { fusionFeedback('Doplnok je pripojený, ale ešte spracúva predchádzajúci výkres. Zavrite dialógy vo Fusion a počkajte na dokončenie.', 'idle', target); return; }
      fusionFeedback('Spojenie s KinmoFusion je overené. Na vytvorenie dokumentu potvrďte súhlas a kliknite na Odoslať nový referenčný výkres.', 'ready', target);
    } catch (error) { fusionFeedback(error.message, 'error', target); }
    finally { if (button.isConnected) button.disabled = false; }
  }

  function elasticSourcesModal() {
    modal('Príklady pružných prvkov a zdroje', `<p class="modal-description">Katalógové príklady sú referenčné, bez záruky vhodnosti pre váš mechanizmus. Dĺžka znamená vzdialenosť montážnych bodov, pri ťažnej pružine vnútorných hrán očiek.</p><div class="export-options">
      <button data-action="apply-elastic-example" data-example="compression"><span><strong>Gutekunst D-001 · tlačná pružina</strong><small>Drôt 0,2 / Ø 3,1 / L₀ 7,5 mm · sn 4,82 mm · k 0,095 N/mm · Fn ≈ 0,46 N</small></span></button>
      <button data-action="apply-elastic-example" data-example="extension"><span><strong>Gutekunst RZ-001I · ťažná pružina</strong><small>Drôt 0,2 / Ø 2,7 / L₀ 6,2 mm · sn 13,29 mm · k 0,078 N/mm · Fn ≈ 1,101 N. F₀ ≈ 0,064 N je odvodené, nie samostatne overené.</small></span></button>
      <button data-action="apply-elastic-example" data-example="piston"><span><strong>Modelová vzpera · nie katalógový výrobok</strong><small>Tyč 8 / valec 19 mm · zdvih 100 mm · dĺžka 180–280 mm · F 400 N · pomer 1,2.</small></span></button></div>
      <p class="section-description">Pri plynových vzperách overte hmotnosť, ťažisko, montážne body, uhol otvorenia, teplotu a silu ruky. V kalkulátore výrobca odporúča rezervu zdvihu aspoň 10 mm a montáž tyčou nadol. Odhadový model aplikácie neoveruje tieto výrobné a montážne podmienky.</p><div class="reference-links"><a href="https://www.federnshop.com/en/products/compression_springs.html" target="_blank" rel="noopener noreferrer">Gutekunst · tlačné pružiny</a><a href="https://www.federnshop.com/en/products/extension_springs/rz-001i.html" target="_blank" rel="noopener noreferrer">Gutekunst · ťažné pružiny</a><a href="https://www.plynovepruzinyshop.cz/kalkulator/" target="_blank" rel="noopener noreferrer">Kalkulátor plynových vzpier</a></div>`, true);
  }

  function centerOfMassModal() {
    const e = currentElement(), pose = selectedPose();
    if (!e || !pose) return;
    const point = e.com || K.localPoint(pose, P.centerOfMass(e, pose));
    modal('Ťažisko telesa', `<form id="com-form"><p class="modal-description">Lokálne súradnice od bodu A v orientácii telesa. Hmotnosť sa nachádza v geometrii prvku.</p><label class="property-field"><span>Ťažisko X (mm)</span><input class="text-field" name="x" type="number" min="-5000" max="5000" step=".1" value="${point.x.toFixed(1)}" required/></label><label class="property-field"><span>Ťažisko Y (mm)</span><input class="text-field" name="y" type="number" min="-5000" max="5000" step=".1" value="${point.y.toFixed(1)}" required/></label><label class="check-row"><input type="checkbox" name="automatic"${e.com ? '' : ' checked'}/><span>Použiť automatický odhad ťažiska</span></label><div class="modal-actions"><button class="button button-dark" type="submit">Uložiť ťažisko</button></div></form>`);
  }
