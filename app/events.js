/* Kinematika UI · Spracovanie udalostí, klávesnica a animácia.
   Klasický skript bez IIFE: zdieľa najvyššiu úroveň s ostatnými app/*.js a app.js, ktorý sa načíta posledný
   a definuje stav a konštanty. Súbor obsahuje iba deklarácie funkcií, pri načítaní nič nespúšťa. */
'use strict';
  function onPropertyChange(input) {
    const key = input.dataset.property, scope = input.dataset.scope;
    let value;
    try {
      value = W.parseNumber(input.value, input.dataset.quantity ?? (['angle', 'driveAngle'].includes(key) ? '°' : 'mm'));
      if (value < Number(input.min || -Infinity) || value > Number(input.max || Infinity) || !input.checkValidity()) throw new Error('Zadajte platnú hodnotu v povolenom rozsahu.');
    } catch (error) { toast(error.message, true); renderInspector(); return; }
    let next = K.copy(state.project);
    if (scope === 'control') {
      if (!next.controls) next.controls = K.defaultControls(next.parameters);
      const [i, axis] = key.split('-'); next.controls[Number(i)][axis] = value;
    } else if (scope === 'element-control') {
      const [i, axis] = key.split('-');
      const e = next.elements.find((e) => e.id === state.selected);
      e.controls[Number(i)][axis] = value;
      if (e.curveSemicircle) e.curveRadius = K.distance(e.controls[0], e.controls[1]) / 2;
    } else if (scope === 'local-c') {
      next.elements.find((e) => e.id === state.selected).localC[key] = value;
    } else if (scope === 'element') {
      const element = next.elements.find((e) => e.id === state.selected);
      if (key === 'length' && !element.primary && !element.locked && !element.outline.length && ['link', 'panel', 'rail', 'ground'].includes(element.type)) {
        try { next = W.setLength(next, element.id, value, W.preferredEnd(next, element.id), state.result); }
        catch (error) { toast(error.message, true); renderInspector(); return; }
      } else if ((key === 'length' || key === 'maxLength') && element.type.startsWith('piston-')) {
        try { K.resizePiston(element, value); } catch (error) { toast(error.message, true); renderInspector(); return; }
      } else if (key === 'curveRadius' && element.curveSemicircle) {
        try { next = I.semicircle(next, element.id, value, element.curveSide, state.result); }
        catch (error) { toast(error.message, true); renderInspector(); return; }
      } else element[key] = value;
      if (K.isElastic(element) && ['minLength', 'maxLength'].includes(key)) element.rangeMode = 'manual';
      if (state.mode !== 'edit' && !element.parentId && (key === 'x' || key === 'y' || key === 'angle')) {
        const pose = selectedPose();
        if (pose) { if (key !== 'x') element.x = pose.a.x; if (key !== 'y') element.y = pose.a.y; if (key !== 'angle' && !element.drive) element.angle = pose.angle; }
      }
    } else {
      next.parameters[key] = scope === 'diameter' ? value / 2 : value;
      if (key === 'travelMax' || key === 'travelMin') next.parameters.turnStart = K.clamp(next.parameters.turnStart, next.parameters.travelMin, next.parameters.travelMax - 1);
    }
    try { K.validateProject(next); } catch (error) { toast(error.message, true); renderInspector(); return; }
    pushHistory(); state.project = next; state.playing = false; changed(false);
  }

  function onChange(event) {
    if(event.target.dataset?.setting==='connection-target'){try{chooseConnectionTarget(Number(event.target.value));}catch(error){toast(error.message,true);}return;}
    const input = event.target;
    if(input.closest?.('#surface-form')){try{if(input.name==='follower')updateSurfaceEdges();else updateSurfacePreview();}catch(error){toast(error.message,true);}return;}
    if(input.name==='language'){state.language=input.value;applyPreferences(state,true);globalThis.KinmoI18n?.setLanguage(input.value);return;}
    if (state.gifExport) return;
    if(input.name==='debug-enabled'){globalThis.KinmoDebug.setEnabled(input.checked);return;}
    if (input.name==='theme' && input.closest?.('#settings-form')) { if(input.checked)applyPreferences({...state,theme:input.value},true);return; }
    if (input.closest?.('#gif-form')) { updateGIFEstimate(); return; }
    if (input.closest?.('#dimension-form')) {
      const form = input.closest('#dimension-form');
      if (input.name === 'value') form.dataset.autoValue = '0';
      updateDimensionForm(form); return;
    }
    if (onMagicSetting(input)) return;
    if (state.magic && !magicWorking()) return;
    if (input.form?.id === 'trace-form' && input.name === 'element') {
      const point = input.form.elements.point;
      point.innerHTML = tracePointOptions(state.project.elements.find((e) => e.id === input.value), point.value);
      return;
    }
    if (input.name === 'remember-pairing' && !input.checked) { CAD.rememberPairing('', false); return; }
    if (input.id === 'cad-slot-outlines') { state.cadSlotOutlines = input.checked; return; }
    if (input.id === 'revision-scope') { revisionsModal(input.value); return; }
    if (input.closest('#transform-form')) {
      const form = input.closest('#transform-form');
      if (input.name === 'pivot-reference' && input.value) {
        const at = K.point(state.result, parseReference(input.value));
        if (at) { form.elements.namedItem('px').value = at.x; form.elements.namedItem('py').value = at.y; }
      } else if (['px', 'py'].includes(input.name)) form.elements.namedItem('pivot-reference').value = '';
      return;
    }
    if (input.closest('#canvas-edit-form')) {
      const form = input.closest('#canvas-edit-form'), kind = form.dataset.kind, r = I.reference(I.target(state.project, form.dataset.reference));
      if (kind === 'joint' && ['type', 'jointId'].includes(input.name)) {
        const j = state.project.connections.find((j) => j.id === form.elements.jointId.value);
        const other = j ? sameReference(j.a, r) ? j.b : j.a : null;
        if (input.name === 'jointId' && j) form.elements.type.value = j.type === 'prismatic' ? 'prismatic' : 'revolute';
        form.elements.other.innerHTML = canvasOtherOptions(r, form.elements.type.value, other);
        form.elements.value.value = form.elements.type.value === 'prismatic' && j?.type === 'prismatic' ? j.value * (sameReference(j.a, r) ? 1 : -1) : 0;
      }
      if (kind === 'limits' && input.name === 'scope') {
        const j = state.project.connections.find((j) => j.id === input.value), range = K.driveRange(state.project);
        const guide = j && state.project.elements.find((e) => e.id === (j.a.point === 'curve' ? j.a : j.b).elementId);
        form.elements.min.value = j ? j.limitMin ?? (j.type === 'prismatic' ? 0 : -180) : range.min;
        form.elements.max.value = j ? j.limitMax ?? (j.type === 'prismatic' ? guide.length : 180) : range.max;
      }
      return;
    }
    if (input.hasAttribute('data-trace-mode')) {
      state.traceMode = input.value === 'bearings' ? 'bearings' : 'single';
      state.trace = true; renderScene(); renderGraph(); renderInspector(); updateToolbar();
      return;
    }
    if (input.dataset.property) { onPropertyChange(input); return; }
    if (input.id === 'speed') { state.speed = Number(input.value); applyPreferences(state, true); }
    if (input.id === 'graph-mode') {
      state.graphMode = input.value === 'force' ? 'force' : 'angle'; renderGraph(); renderInspector();
    }
    if (['mount-a', 'mount-b', 'force-mode', 'actuator-mode', 'range-mode'].includes(input.id)) {
      const next = K.copy(state.project), e = next.elements.find((v) => v.id === state.selected);
      if (input.id === 'force-mode') e.forceMode = input.value;
      else if (input.id === 'actuator-mode') e.actuatorMode = input.value;
      else if (input.id === 'range-mode') e.rangeMode = input.value;
      else {
        const key = input.id === 'mount-a' ? 'a' : 'b';
        e[key === 'a' ? 'mountA' : 'mountB'] = parseReference(input.value);
        next.connections = next.connections.filter((j) => !((j.a.elementId === e.id && j.a.point === key) || (j.b.elementId === e.id && j.b.point === key)));
      }
      try { if (['mount-a', 'mount-b', 'range-mode'].includes(input.id)) K.fitElasticRanges(next, [e.id], E.design(next, state.motion)); applyProject(next); } catch (error) { toast(error.message, true); renderInspector(); }
    }
    if (input.id === 'motion-value') {
      if (!input.value.trim() || !input.checkValidity()) { toast('Poloha musí byť v rozsahu pohonu.', true); input.value = state.motion.toFixed(1); return; }
      setMotion(Number(input.value));
    }
    if (input.id === 'cam-shape') {
      const next = K.copy(state.project), e = next.elements.find((e) => e.id === state.selected); e.camShape = input.value;
      if (e.camShape === 'pear') { e.camLift = Math.max(e.camLift, e.radius * 2.5); if (!e.camPhase) e.camPhase = 90; }
      applyProject(next); return;
    }
    if (input.id === 'curve-kind') {
      pushHistory(); state.project.parameters.curveKind = input.value;
      state.project.controls = null; changed(false);
    }
    if (input.id === 'bearing-slot') {
      pushHistory(); currentElement().slotId = input.value; changed(false);
    }
    if (input.id === 'element-curve-kind') {
      const next = K.copy(state.project), e = next.elements.find((v) => v.id === state.selected);
      e.curveKind = input.value; e.curveSemicircle = false;
      if (e.curveKind !== 'polyline' && (e.controls.length > 32 || e.controls.length < (e.curveKind === 'spline' ? 4 : 2))) {
        const count = e.curveKind === 'bezier' ? 4 : e.curveKind === 'arc' ? 2 : 13;
        e.controls = Array.from({ length: count }, (_, i) => K.copy(e.controls[Math.round(i / (count - 1) * (e.controls.length - 1))]));
      }
      try { applyProject(next); } catch (error) { toast(error.message, true); renderInspector(); }
    }
    if (input.id === 'drive-mode') {
      const next = K.copy(state.project);
      next.elements.find((v) => v.id === state.selected).driveMode = input.value;
      try { applyProject(next); } catch (error) { toast(error.message, true); renderInspector(); }
    }
    if (input.id === 'parent-body') {
      const next = K.copy(state.project), e = next.elements.find((v) => v.id === state.selected), pose = state.result.poses[e.id];
      const origin = pose.controlOrigin || pose.a;
      if (input.value) {
        const parent = state.result.poses[input.value], local = K.localPoint(parent, origin);
        e.x = local.x; e.y = local.y; e.angle = pose.angle - parent.angle;
        e.parentId = input.value; e.parentPoint = 'a'; e.drive = false;
      } else { e.parentId = ''; e.x = origin.x; e.y = origin.y; e.angle = pose.angle; }
      try { applyProject(next); } catch (error) { toast(error.message, true); renderInspector(); }
    }
    if (input.id === 'trace-selected') {
      state.traceMode = 'single'; state.trace = input.checked; state.traceRef = { elementId: state.selected, point: $('#trace-point').value };
      renderScene(); renderGraph(); renderInspector(); updateToolbar();
    }
    if (input.id === 'trace-point') {
      state.traceMode = 'single'; state.trace = true; state.traceRef = { elementId: state.selected, point: input.value };
      renderScene(); renderGraph(); renderInspector(); updateToolbar();
    }
  }

  async function onSubmit(event) {
    const form = event.target;
    if(form.id==='motor-capacity-form'){event.preventDefault();motorCapacityModal(W.parseNumber(new FormData(form).get('startup'),''));return;}
    if(form.id==='rigid-assembly-form'||form.id==='hole-ownership-form'){event.preventDefault();try{const data=new FormData(form);if(form.id==='rigid-assembly-form')submitRigidAssembly(data);else submitHoleOwnership(data);}catch(error){toast(error.message,true);}return;}
    if(form.id==='motor-spec-form'){event.preventDefault();try{const data=new FormData(form),next=K.copy(state.project),e=next.elements.find(e=>e.id===form.dataset.id);for(const key of ['length','motorLength','motorDiameter','shaftDiameter','powerW','voltage','rpm','efficiency','gearRatio','gearEfficiency','direction'])e[key]=W.parseNumber(String(data.get(key)),key==='voltage'?'V':key==='powerW'?'W':key==='rpm'?'rpm':['length','motorLength','motorDiameter','shaftDiameter'].includes(key)?'mm':'');e.motorKind=data.get('motorKind');editCanvas(I.resizeMotorHousing(next,e.id),'Parametre motora boli uložené.');$('#modal').close();}catch(error){toast(error.message,true);}return;}
    if(form.id==='surface-form'){event.preventDefault();try{const data=new FormData(form),e=state.project.elements.find(e=>e.id===data.get('follower'));editCanvas(globalThis.KinmoSurfaces.create(state.project,data.get('cam'),{elementId:e.id,point:e.type==='rail'?'c':'a'},data.get('kind'),Number(data.get('edge')),data.get('kind')==='roller'?quantityValue(data,'radius','mm',0,1000):0),'Kontakt bol pridaný.');$('#modal').close();}catch(error){toast(error.message,true);}return;}
    if(form.id==='debug-form'){event.preventDefault();const data=new FormData(form);const extra=globalThis.KinmoUsability.issueBundle(state.project,state.result,{description:data.get('description'),mode:state.mode,selected:state.selectedElementIds,collisions:state.collisions});const debug=await globalThis.KinmoDebug.bundle(data.get('description'),data.has('images'),extra);download('kinematika-debug.json',JSON.stringify(debug,null,2),'application/json');return;}
    if (state.gifExport) { event.preventDefault(); return; }
    if(form.id==='advanced-perspective-form'){event.preventDefault();try{await rectifyMagic(new FormData(form));}catch(error){toast(error.message,true);}return;}
    if(form.id.startsWith('advanced-')){event.preventDefault();try{advancedSubmit(form,new FormData(form));}catch(error){toast(error.message,true);}return;}
    if (['connection-review-form','construction-form','issue-form'].includes(form.id)) {
      event.preventDefault(); const data=new FormData(form); try {
        if(form.id==='connection-review-form')confirmConnection(data);
        if(form.id==='construction-form'){const values=Object.fromEntries(['minLength','maxLength','restLength'].map(key=>[key,quantityValue(data,key,'mm',.1,5000)]));editCanvas(globalThis.KinmoUsability.elasticConstruction(state.project,form.dataset.id,values),'Konštrukčné rozmery boli upravené.');$('#modal').close();}
        if(form.id==='issue-form'){const bundle=globalThis.KinmoUsability.issueBundle(state.project,state.result,{description:data.get('description'),mode:state.mode,selected:state.selectedElementIds,collisions:state.collisions});const text=JSON.stringify(bundle);if(new TextEncoder().encode(text).length>2*1024*1024)throw new Error('Diagnostický balík prekročil 2 MB. Zmenšite projekt.');download('kinematika-problem.json',text,'application/json');$('#modal').close();}
      }catch(error){toast(error.message,true);}return;
    }
    if (['reference-calibration-form','elastic-response-form','magic-detection-review-form','reference-attach-form', 'reference-form', 'kit-form', 'motion-plan-form', 'pose-alignment-form', 'impact-form'].includes(form.id)) {
      event.preventDefault(); try { workflowSubmit(form, new FormData(form)); } catch (error) { toast(error.message, true); } return;
    }
    if (form.id === 'gif-form') {
      event.preventDefault();
      try { await exportGIF(new FormData(form)); } catch (error) { gifError(error); }
      return;
    }
    if (['magic-scale-form', 'magic-finish-form'].includes(form.id)) {
      event.preventDefault();
      try {
        const data = new FormData(form);
        if (form.id === 'magic-scale-form') submitMagicScale(data); else submitMagicFinish(data);
      } catch (error) { toast(error.message, true); }
      return;
    }
    if (state.magic && (!magicWorking() || !['element-name-form', 'joint-form', 'dimension-form', 'geometry-form', 'com-form', 'canvas-edit-form', 'transform-form', 'snap-joint-form', 'part-point-form', 'slot-semicircle-form'].includes(form.id))) { event.preventDefault(); return; }
    if (!['rename-form', 'settings-form', 'trace-form', 'element-name-form', 'joint-form', 'dimension-form', 'geometry-form', 'saved-trace-form', 'com-form', 'fusion-form', 'canvas-edit-form', 'transform-form', 'snap-joint-form', 'workbench-save-form', 'library-insert-form', 'revision-compare-form', 'part-point-form', 'slot-semicircle-form'].includes(form.id)) return;
    event.preventDefault();
    const data = new FormData(form);
    if (['part-point-form', 'slot-semicircle-form'].includes(form.id)) {
      try { if (form.id === 'part-point-form') submitPartPoint(form, data); else submitSlotSemicircle(form, data); }
      catch (error) { toast(error.message, true); }
      return;
    }
    if (['workbench-save-form', 'library-insert-form', 'revision-compare-form'].includes(form.id)) {
      try {
        if (form.id === 'workbench-save-form') submitWorkbenchSave(form, data);
        if (form.id === 'library-insert-form') submitLibraryInsert(form, data);
        if (form.id === 'revision-compare-form') submitRevisionComparison(data);
      } catch (error) { toast(error.message, true); }
      return;
    }
    if (form.id === 'snap-joint-form') {
      try { submitSnapConnection(data); } catch (error) { toast(error.message, true); }
      return;
    }
    if (form.id === 'transform-form') {
      try { submitTransform(form, data); } catch (error) { toast(error.message, true); }
      return;
    }
    if (form.id === 'canvas-edit-form') {
      try { onCanvasSubmit(form, data); } catch (error) { toast(error.message, true); }
      return;
    }
    if (form.id === 'dimension-form') {
      try { submitDimension(form, data); } catch (error) { toast(error.message, true); }
      return;
    }
    if (form.id === 'fusion-form') {
      if (!data.has('consent')) { toast('Najprv potvrďte vytvorenie nového CAD dokumentu.', true); return; }
      const button = $('button[type="submit"]', form);
      if (button.disabled) return;
      button.disabled = true;
      const feedback = $('#fusion-status');
      fusionFeedback('Overujem doplnok a pripravujem referenčný výkres…', 'busy', feedback);
      try {
        const snapshot = X.cadSnapshot(state.project, state.result, { dimensions: state.dimensions, trajectories: data.has('trajectories'), samples: state.samples, references: traceReferences(), traceSpace: state.traceSpace, slotOutlines: state.cadSlotOutlines });
        await CAD.send(snapshot, String(data.get('key')).trim(), (message, phase) => { if(phase==='paired')CAD.rememberPairing(String(data.get('key')),data.has('remember-pairing'));fusionFeedback(message, 'busy', feedback); });
        fusionFeedback('Fusion potvrdil vytvorenie nového referenčného výkresu.', 'ready', feedback);
        toast('Nový referenčný výkres bol vytvorený vo Fusion.');
      } catch (error) { fusionFeedback(error.message, 'error', feedback); }
      finally { if (button.isConnected) button.disabled = false; }
      return;
    }
    if (['joint-form', 'geometry-form', 'saved-trace-form', 'com-form'].includes(form.id)) {
      try {
        const next = K.copy(state.project);
        if (form.id === 'com-form') next.elements.find((e) => e.id === state.selected).com = data.has('automatic') ? null : { x: Number(data.get('x')), y: Number(data.get('y')) };
        if (form.id === 'joint-form') {
          const type = String(data.get('type')), a = parseReference(String(data.get('a'))), b = parseReference(String(data.get('b')));
          const record = { ...(form.dataset.id&&data.get('type')==='cam-contact'&&next.connections.find(j=>j.id===form.dataset.id)?.surface?{surface:K.copy(next.connections.find(j=>j.id===form.dataset.id).surface)}:{}), ...(form.dataset.id&&next.connections.find(j=>j.id===form.dataset.id)?.contact?{contact:next.connections.find(j=>j.id===form.dataset.id).contact}:{}),id: form.dataset.id || K.uid(), name: String(data.get('name')).trim(), type, a, b, value: ['parallel', 'revolute', 'point-path', 'cam-contact'].includes(type) ? 0 : Number(data.get('value')), builtin: false };
          if (next.kind !== 'custom' && [a, b].every((r) => next.elements.find((e) => e.id === r?.elementId)?.primary)) throw new Error('Na úpravu dvoch parametrických prvkov vytvorte voľnú kópiu.');
          if (form.dataset.id) next.connections = next.connections.map((j) => j.id === form.dataset.id ? record : j);
          else next.connections.push(record);
        }
        if (form.id === 'geometry-form') {
          const outline = form.dataset.outline === 'true', e = next.elements.find((v) => v.id === state.selected);
          const points = String(data.get('points')).trim().split(/\r?\n/).filter((line) => line.trim()).map((line) => {
            const axes = line.trim().split(';');
            if (axes.length !== 2 || axes.some((v) => !v.trim() || !Number.isFinite(Number(v.trim().replace(',', '.'))))) throw new Error('Každý riadok musí obsahovať dve čísla oddelené bodkočiarkou: X;Y.');
            return { x: Number(axes[0].trim().replace(',', '.')), y: Number(axes[1].trim().replace(',', '.')) };
          });
          e[outline ? 'outline' : 'controls'] = points;
          if (!outline && e.curveSemicircle && points.length === 2) e.curveRadius = K.distance(points[0], points[1]) / 2;
        }
        if (form.id === 'saved-trace-form') {
          const record = { ...(form.dataset.id&&data.get('type')==='cam-contact'&&next.connections.find(j=>j.id===form.dataset.id)?.surface?{surface:K.copy(next.connections.find(j=>j.id===form.dataset.id).surface)}:{}), ...(form.dataset.id&&next.connections.find(j=>j.id===form.dataset.id)?.contact?{contact:next.connections.find(j=>j.id===form.dataset.id).contact}:{}),id: form.dataset.id || K.uid(), name: String(data.get('name')).trim(), reference: parseReference(String(data.get('reference'))), color: String(data.get('color')), space: String(data.get('space')), visible: data.has('visible') };
          if (form.dataset.id) next.trajectories = next.trajectories.map((t) => t.id === form.dataset.id ? record : t);
          else next.trajectories.push(record);
          state.trace = true;
        }
        applyProject(next); $('#modal').close();
      } catch (error) { toast(error.message, true); }
      return;
    }
    if (form.id === 'rename-form' || form.id === 'element-name-form') {
      const name = String(data.get('name') || '').trim();
      if (!name) { toast('Zadajte názov.', true); return; }
      pushHistory();
      if (form.id === 'rename-form') state.project.name = name; else currentElement().name = name;
      changed(false);
    }
    if (form.id === 'settings-form') {
      const next = K.copy(state.project);
      next.simulation.returnOnRelease = data.has('return-on-release');
      next.simulation.mode = data.get('simulation-mode') === 'dynamic' ? 'dynamic' : 'kinematic';
      for (const key of ['gravity', 'damping', 'friction', 'inputForce', 'initialVelocity', 'duration', 'returnDamping']) next.simulation[key] = Number(data.get(key));
      try { K.validateProject(next); } catch (error) { toast(error.message, true); return; }
      state.cycle = K.clamp(Number(data.get('cycle')), 1, 60);
      state.snap = data.has('snap'); state.collisions = data.has('collisions');
      state.forceArrows = data.has('forceArrows');
      state.theme = String(data.get('theme'));
      applyPreferences(state, true);
      applyProject(next);
    }
    if (form.id === 'trace-form') {
      const ref = { elementId: String(data.get('element')), point: String(data.get('point')) };
      if (!state.result.poses[ref.elementId]?.[ref.point]) { toast('Tento prvok nemá zvolený uzlový bod. Vyberte začiatok alebo koniec.', true); return; }
      state.traceRef = ref; state.traceMode = 'single'; state.trace = true;
      renderScene(); renderGraph(); renderInspector(); updateToolbar();
    }
    $('#modal').close();
  }

  function canSelectText(target) {
    const element = target?.nodeType === 3 ? target.parentElement : target;
    return Boolean(element?.isContentEditable || element?.closest?.('input,textarea'));
  }

  function onKeyboard(event) {
    const snapTarget=event.target?.closest?.('[data-action="snap-target"]');if(snapTarget&&['Enter',' '].includes(event.key)){event.preventDefault();actions['snap-target'](snapTarget);return;}
    const measurementTarget=event.target?.closest?.('[data-action="measurement-seek"]');if(!state.gifExport&&measurementTarget&&['Enter',' '].includes(event.key)){event.preventDefault();actions['measurement-seek'](measurementTarget);return;}
    if(!canSelectText(event.target)&&typeDimension(event))return;
    const key = event.key.toLowerCase(), modifier = event.ctrlKey || event.metaKey;
    if (state.gifExport) {
      if (key === 'escape') cancelGIF();
      if (key !== 'escape' && !$('#modal').open) event.preventDefault();
      return;
    }
    if (modifier && key === 'a' && !canSelectText(event.target)) {
      event.preventDefault(); window.getSelection()?.removeAllRanges(); return;
    }
    if (modifier && key === 'k' && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      if (state.commandPalette && $('#modal').open && $('#command-search')) { state.commandPalette = null; $('#modal').close(); } else openCommandPalette();
      return;
    }
    if ($('#modal').open || event.target.closest?.('input,select,textarea,[contenteditable]')) return;
    if ((key === 'enter' || event.code === 'Space') && event.target.closest?.('button,a')) return;
    if (key === 'alt') { state.snapSuppressed = true; state.snapPreview = null; renderSmartSnapPreview(); return; }
    if (key === 'escape' && state.insertingType) { event.preventDefault(); state.insertingType = null; state.placementPreview = null; state.placementMount = null; state.tool = 'select'; renderPlacementTools(); renderScene(); updateToolbar(); return; }
    if (key === 'tab' && (state.draggedPaletteType || state.insertingType || state.magic?.placementType)) { event.preventDefault(); cyclePlacementMount(event.shiftKey); return; }

    if (state.magic) {
      if (state.magic.step === 2.5 && modifier && ['z', 'y'].includes(key)) { event.preventDefault(); undoDetection(key === 'y' || event.shiftKey); return; }
      if (state.magic.step === 2.5 && key === 'enter' && state.magic.tool === 'detect-outline') { event.preventDefault(); try { commitDetectionOutline(); } catch (error) { toast(error.message, true); } return; }
      if (state.magic.step === 2.5 && key === 'escape' && state.magic.tool.startsWith('detect-')) { event.preventDefault(); state.magic.tool = 'select'; state.magic.drawing = []; renderMagicImport(); renderScene(); return; }
      if (modifier && key === 's') { event.preventDefault(); toast('Použite Finish alebo export rozpracovanej geometrie.', true); return; }
      if (key === 'escape' && state.magic.tool === 'detection-region') { event.preventDefault(); selectMagicDetectionRegion(true); return; }
      if (key === 'escape' && (state.magic.drawing.length || state.magic.placementType)) { event.preventDefault(); clearMagicDrawing(); return; }
      if (state.magic.drawing.length && (modifier && key === 'z' || key === 'backspace')) {
        event.preventDefault(); state.magic.drawing.pop(); state.magic.preview = null; renderMagicImport(); renderScene(); return;
      }
      if (key === 'enter' && state.magic.tool === 'ground-outline') { event.preventDefault(); try { commitMagicDrawing(); } catch (error) { toast(error.message, true); } return; }
      if (!magicWorking()) {
        if (key === 'h') setTool('pan');
        else if (key === 'escape' || key === 'v') setTool('select');
        else if (key === 'f' && event.shiftKey) { event.preventDefault(); fitView(); renderScene(); }
        else if (modifier || event.code === 'Space' || key.startsWith('arrow') || ['delete', 'backspace', 'j', 'm', 'f'].includes(key)) event.preventDefault();
        return;
      }
      if (event.code === 'Space' && !event.target.closest?.('[data-selection-key],[data-edit-handle]') || key.startsWith('arrow')) { event.preventDefault(); return; }
    }
    if (state.pendingSnap && key === 'escape') { event.preventDefault(); dismissSnapChoices(); return; }
    if (state.contextMenuState.isOpen) {
      if (key === 'escape') { event.preventDefault(); closeContextMenu(true); }
      return;
    }
    if (state.dimensionPick && key === 'escape') { event.preventDefault(); cancelDimensionPick(); updateToolbar(); renderScene(); return; }
    const canvasItem = event.target.closest?.('[data-selection-key]');
    const editHandle = event.target.closest?.('[data-edit-handle]');
    if (editHandle && (key === 'enter' || event.code === 'Space')) { event.preventDefault(); transformModal(editHandle.dataset.editHandle, editHandle.dataset.fixedEnd); return; }
    if (canvasItem && (key === 'enter' || event.code === 'Space')) { event.preventDefault(); selectTarget(canvasItem.dataset.selectionKey, event.shiftKey || modifier); return; }
    if (key === 'contextmenu' || (event.shiftKey && key === 'f10')) {
      event.preventDefault();
      const key = canvasItem?.dataset.selectionKey || state.selectedElementIds.at(-1), t = I.target(state.project, key), pose = state.result.poses[t?.elementId || I.reference(t)?.elementId];
      const part = pose && t?.type === 'control' ? t.element.primary ? { x: I.controlPoints(state.project, t.element)[t.index].x + state.project.parameters.slotOffsetX, y: I.controlPoints(state.project, t.element)[t.index].y + state.project.parameters.slotOffsetY } : K.worldPoint({ ...pose, a: pose.controlOrigin || pose.a }, I.controlPoints(state.project, t.element)[t.index]) : t?.type === 'outline' ? pose?.outline?.[t.index] : t?.type === 'path' ? pose?.path?.[Math.floor(pose.path.length / 2)] : null;
      const at = I.reference(t) ? K.point(state.result, I.reference(t)) : part || (pose ? { x: (pose.a.x + pose.b.x) / 2, y: (pose.a.y + pose.b.y) / 2 } : state.pointer);
      const matrix = $('#mechanism-canvas').getScreenCTM();
      if (matrix) openContextMenu({ clientX: at.x * matrix.a + at.y * matrix.c + matrix.e, clientY: at.x * matrix.b + at.y * matrix.d + matrix.f }, key || null);
      return;
    }
    if (modifier && key === 's') { event.preventDefault(); saveProject(); }
    else if (modifier && key === 'z') { event.preventDefault(); undo(event.shiftKey); }
    else if (modifier && key === 'y') { event.preventDefault(); undo(true); }
    else if (modifier && key === 'd') { event.preventDefault(); duplicateElement(); }
    else if (modifier) return;
    else if (event.key === '?') { event.preventDefault(); shortcutsModal(); }
    // Space plays on release; held down it pans with a left drag (see onPointerDown and onKeyUp).
    else if (event.code === 'Space') { event.preventDefault(); if (!event.repeat && !state.spacePan) { state.spacePan = { used: false }; document.body.classList.add('space-pan'); } }
    else if (key === 'v') setTool('select');
    else if (key === 'h') setTool('pan');
    else if (key === 'j') setTool('connect');
    else if (key === 'm') setTool('measure');
    else if (key === 'f') { event.preventDefault(); if (event.shiftKey) { fitView(); renderScene(); } else fixSelected(); }
    else if (key === 'delete' || key === 'backspace') { event.preventDefault(); deleteSelected(); }
    else if (key === 'enter') { if (state.selectedElementIds.length && runPrimaryAction(state.selectedElementIds.at(-1))) event.preventDefault(); }
    else if (key === 'escape') { if (state.drag) onPointerUp({ pointerId: state.drag.pointerId, cancelled: true }); selectTarget(null); setInspectorOpen(false); setTool('select'); $('.sidebar').classList.remove('mobile-open'); }
    else if (key === 'arrowright' || key === 'arrowleft') { event.preventDefault(); setMotion(state.motion + (key === 'arrowright' ? 1 : -1) * (event.shiftKey ? 10 : 1)); }
  }

  function onKeyUp(event) {
    if (event.key === 'Alt') { state.snapSuppressed = false; const type = state.draggedPaletteType || state.insertingType || state.magic?.placementType; if (type) state.snapPreview = placementAt(type, state.pointer).preview; renderSmartSnapPreview(); }
    if (event.code === 'Space' && state.spacePan) {
      const { used } = state.spacePan; state.spacePan = null; document.body.classList.remove('space-pan');
      if (!used && !$('#modal').open) actions.play();
    }
  }

  function animate(time) {
    if(state.playing&&!state.frameWasPlaying){state.motorGuardStarted=false;state.motorGuardLastMotion=state.motion;}
    state.frameWasPlaying=state.playing;
    if (state.playing && !state.gifExport && !document.hidden) {
      const delta = lastFrame ? Math.min((time - lastFrame) / 1000, 0.06) : 0;
      if (state.project.simulation.mode === 'dynamic' && state.dynamic && state.forceContext) {
        try {
          state.dynamic = P.step(state.forceContext, state.dynamic, Math.min(.25, delta * state.speed));
          if (state.dynamicHistory.length < 2400 && delta > 0) state.dynamicHistory.push({ ...state.dynamic });
          setMotion(state.dynamic.motion, false);
          if (state.dynamic.stopped) { state.playing = false; updateMotion(); toast(state.dynamic.reason, true); }
        } catch (error) { state.playing = false; toast(error.message, true); updateMotion(); }
        if (state.inspectorOpen && state.analysis && time - lastInspector > 750) { renderInspector(); lastInspector = time; }
        captureMeasurement(delta);lastFrame = time; requestAnimationFrame(animate); return;
      }
      const range = K.driveRange(state.project);
      if(state.project.driveProgram){state.planTime=K.clamp((state.planTime||0)+delta*state.speed,0,state.project.driveProgram.duration);const q=range.min+state.planTime/state.project.driveProgram.duration*(range.max-range.min);setMotion(q,false);if(state.result.blocked)state.playing=false;else if(state.planTime>=state.project.driveProgram.duration){if(state.loop)state.planTime=0;else state.playing=false;}captureMeasurement(delta);lastFrame=time;requestAnimationFrame(animate);return;}
      if (state.project.motionPlan?.phases.length) {
        const total = state.project.motionPlan.phases.reduce((sum, p) => sum + p.duration, 0);
        state.planTime = (state.planTime || 0) + delta * state.speed * state.direction;
        const end = state.planTime >= total || state.planTime <= 0;
        state.planTime = K.clamp(state.planTime, 0, total);
        const phase = WF.planAt(state.project, state.planTime), safe = WF.trial(state.project, state.motion, phase.motion, { profile: state.profile, collisions: state.collisions, samples: state.samples });
        setMotion(safe.motion, false);
        if (safe.blocked) { state.playing = false; state.trialBlock = safe.blocked; toast(safe.blocked.issues[0] || 'Fáza je blokovaná.', true); }
        else if (end) { if (state.loop) state.direction *= -1; else state.playing = false; }
        updateMotion(); captureMeasurement(delta);lastFrame = time; requestAnimationFrame(animate); return;
      }
      const driverSpeed = state.project.elements.find((e) => e.drive)?.driveSpeed;
      let next = state.motion + delta * state.speed * (driverSpeed == null ? (range.max - range.min) / state.cycle : Math.abs(driverSpeed)) * state.direction;
      const reachedEnd = next >= range.max || next <= range.min;
      const continuous=state.project.elements.some(e=>e.drive&&e.continuous)&&range.unit==='°';
      if(continuous&&(next>range.max||next<range.min)){const end=next>range.max?range.max:range.min,tail=WF.trial(state.project,state.motion,end,{profile:state.profile,collisions:state.collisions,samples:state.samples});if(tail.blocked){setMotion(tail.motion,false);state.playing=false;lastFrame=time;requestAnimationFrame(animate);return;}const span=range.max-range.min;next=range.min+((next-range.min)%span+span)%span;state.motion=state.direction>0?range.min:range.max;}
      next = K.clamp(next, range.min, range.max);
      // Don't jump over a known blocked sample at high playback speeds.
      const samples = state.direction > 0 ? state.samples : [...state.samples].reverse();
      const blocked = samples.find((s) => s.blocked && s.motion >= Math.min(state.motion, next) && s.motion <= Math.max(state.motion, next));
      setMotion(blocked?.motion ?? next, false);
      if (state.playing && reachedEnd) {
        if (state.loop&&!continuous) state.direction *= -1; else if(!continuous) { state.playing = false; updateMotion(); }
      }
      if (state.inspectorOpen && state.analysis && time - lastInspector > 750) { renderInspector(); lastInspector = time; }
    }
    if(state.frameWasPlaying)captureMeasurement(lastFrame?Math.min((time-lastFrame)/1000,.06):0);
    lastFrame = time;
    requestAnimationFrame(animate);
  }

  function wireEvents() {
    document.addEventListener('click', (event) => {
      if (event.target.closest('a[data-kinmo-download]')?.href?.startsWith('blob:')) return;
      const summary = event.target.closest('summary');
      if (summary) document.querySelectorAll('#workflow-tools details[open], #model-checks details[open]').forEach((el) => { if (el !== summary.parentElement) el.open = false; });
      const button = event.target.closest('[data-action]');
      if (state.gifExport && (!button || !['cancel-gif', 'close-modal'].includes(button.dataset.action))) { event.preventDefault(); return; }
      if (button && !button.disabled) {
        if (!magicActionAllowed(button.dataset.action)) { toast('Najskôr dokončite alebo zrušte Magic import.', true); return; }
        document.querySelectorAll('#workflow-tools details[open], #model-checks details[open]').forEach((el) => { el.open = false; });
        if (button.closest('.binding-dialog, .mobile-tools-dialog')) $('#modal').close();
        globalThis.KinmoDebug?.record('action',{action:button.dataset.action,id:button.dataset.id,kind:button.dataset.kind,type:button.dataset.type});
        actions[button.dataset.action]?.(button, event); return;
      }
      const component = event.target.closest('[data-component]');
      if (component && !component.disabled) addElement(component.dataset.component);
    });
    document.addEventListener('change', onChange);
    document.addEventListener('input', (event) => {
      if (state.gifExport) return;
      const construction=event.target.closest?.('#construction-form');
      if(construction){try{const data=new FormData(construction),values=Object.fromEntries(['minLength','maxLength','restLength'].map(key=>[key,quantityValue(data,key,'mm',.1,5000)])),next=globalThis.KinmoUsability.elasticConstruction(state.project,construction.dataset.id,values),e=next.elements.find(e=>e.id===construction.dataset.id);$('#construction-feedback').textContent='Platné rozmery · zdvih '+fmt(e.maxLength-e.minLength,2)+' mm';}catch(error){$('#construction-feedback').textContent=error.message;}return;}
      if (event.target.closest?.('#gif-form')) { updateGIFEstimate(); return; }
      if (event.target.dataset?.magicSetting) onMagicSetting(event.target);
    });
    document.addEventListener('submit', onSubmit);
    document.addEventListener('keydown', onKeyboard);
    document.addEventListener('pointerup', (event) => { if(event.pointerType==='touch'&&!$('#mechanism-canvas').contains(event.target))touchEnd(event); });
    document.addEventListener('pointercancel', (event) => { if(event.pointerType==='touch'&&!$('#mechanism-canvas').contains(event.target))touchEnd(event); });
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', () => { state.spacePan = null; document.body.classList.remove('space-pan'); });
    window.addEventListener?.('blur', () => { state.snapSuppressed = false; });
    document.addEventListener('selectstart', (event) => { if (!canSelectText(event.target)) event.preventDefault(); });
    $('#motion-range').addEventListener('input', (event) => { if (!state.gifExport) setMotion(Number(event.target.value)); });
    const svg = $('#mechanism-canvas');
    svg.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointermove', onPointerMove);
    svg.addEventListener('pointerup', onPointerUp);
    svg.addEventListener('pointercancel', onPointerUp);
    svg.addEventListener('contextmenu', onContextMenu);
    for (const selector of ['#model-tree', '#joint-list']) $(selector).addEventListener('contextmenu', onContextMenu);
    svg.addEventListener('pointerleave', () => { if (!state.drag) updateHover(null); });
    svg.addEventListener('lostpointercapture', onLostPointerCapture);
    svg.addEventListener('dragstart', (event) => event.preventDefault());
    svg.addEventListener('wheel', onWheel, { passive: false });
    $('#palette').addEventListener('dragstart', (event) => {
      const component = event.target.closest('[data-component]');
      if (state.gifExport || !component || component.disabled || state.magic && state.magic.step !== 4) { event.preventDefault(); return; }
      event.dataTransfer.setData('application/x-kinematika-element', component.dataset.component);
      event.dataTransfer.effectAllowed = 'copy';
      dismissSnapChoices(); state.placementMount = null; state.placementPreview = null; state.snapSuppressed = !!event.altKey;
      state.draggedPaletteType = component.dataset.component; renderPlacementTools(); renderBindingTools(); renderModelChecks();
    });
    $('#palette').addEventListener('dragend', () => { state.draggedPaletteType = null; state.snapPreview = null; state.placementPreview = null; state.placementMount = null; $('#canvas-area').classList.remove('drop-active'); renderSmartSnapPreview(); renderPlacementTools(); renderBindingTools(); renderModelChecks(); });
    const area = $('#canvas-area');
    area.addEventListener('contextmenu', onContextMenu);
    area.addEventListener('dragover', (event) => {
      if (state.gifExport) return;
      if (state.magic?.step === 1 && event.dataTransfer.types.includes('Files')) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; return; }
      if (state.magic && state.magic.step !== 4) return;
      if (!event.dataTransfer.types.includes('application/x-kinematika-element')) return;
      event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; area.classList.add('drop-active');
      if (K.TYPES.includes(state.draggedPaletteType) && state.project.elements.length < 120) {
        try { state.snapSuppressed = !!event.altKey; state.pointer = worldPoint(event); state.snapPreview = placementAt(state.draggedPaletteType, state.pointer).preview; renderPlacementTools(); } catch { state.snapPreview = null; }
        renderSmartSnapPreview();
      }
    });
    area.addEventListener('dragleave', (event) => { if (!area.contains(event.relatedTarget)) { area.classList.remove('drop-active'); state.snapPreview = null; state.placementPreview = null; renderSmartSnapPreview(); } });
    area.addEventListener('drop', (event) => {
      event.preventDefault(); area.classList.remove('drop-active'); state.draggedPaletteType = null; state.snapPreview = null; state.snapSuppressed = !!event.altKey;
      if (state.gifExport) return;
      if (state.magic?.step === 1 && event.dataTransfer.files.length) {
        if (event.dataTransfer.files.length !== 1) { toast('Vyberte iba jeden obrázok.', true); return; }
        onMagicImage(event.dataTransfer.files[0]); return;
      }
      if (state.magic && state.magic.step !== 4) return;
      const type = event.dataTransfer.getData('application/x-kinematika-element');
      if (K.TYPES.includes(type)) addElement(type, worldPoint(event));
      state.placementPreview = null; state.placementMount = null; renderPlacementTools();
    });
    $('#import-file').addEventListener('change', async (event) => {
      if (state.gifExport) { event.target.value = ''; toast('Najprv dokončite alebo zrušte GIF export.', true); return; }
      if (state.magic) { event.target.value = ''; toast('Najskôr dokončite alebo zrušte Magic import.', true); return; }
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        if (file.size > 2 * 1024 * 1024) throw new Error('Projekt je príliš veľký. Limit je 2 MB.');
        const text=await file.text(), raw=JSON.parse(text), issue=raw.format==='kinematika-issue'?raw:null;
        const restored=issue ? globalThis.KinmoUsability.restoreIssue(issue) : null, imported=restored ? restored.native : X.parseNative(text);
        replaceProject(imported.project, imported);
        if(issue){state.mode=['edit','simulate'].includes(issue.reproduction?.mode)?issue.reproduction.mode:'edit';state.collisions=issue.reproduction?.collisions!==false;state.selectedElementIds=Array.isArray(issue.reproduction?.selected)?issue.reproduction.selected.filter(key=>I.target(state.project,key)):[];setMotion(K.clamp(Number(issue.reproduction?.motion)||0,K.driveRange(state.project).min,K.driveRange(state.project).max));state.result=restored.result;renderScene();updateToolbar();toast('Zobrazená je zaznamenaná poloha. Pri pohybe sa model znovu vypočíta.');}
      } catch (error) { toast(error.message || 'Projekt sa nepodarilo importovať.', true); }
      event.target.value = '';
    });
    $('#workbench-import-file').addEventListener('change', async (event) => {
      if (state.gifExport) { event.target.value = ''; toast('Najprv dokončite alebo zrušte GIF export.', true); return; }
      if (state.magic) { event.target.value = ''; toast('Najskôr dokončite alebo zrušte Magic import.', true); return; }
      const input = event.target, file = input.files?.[0], kind = input.dataset.kind;
      if (!file || input.disabled) return;
      input.disabled = true;
      try {
        if (file.size > 2 * 1024 * 1024) throw new Error('Kolekcia je príliš veľká. Limit je 2 MB.');
        importCollection(await file.text(), kind);
      } catch (error) { toast(error.message || 'Kolekciu sa nepodarilo importovať.', true); }
      finally { input.value = ''; input.disabled = false; }
    });
    $('#reference-file').addEventListener('change', async (event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) try { await attachReference(file); } catch (error) { toast(error.message, true); } });
    $('#magic-pose-file').addEventListener('change', async (event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) try { await addMagicPose(file); } catch (error) { toast(error.message, true); } });
    $('#magic-image-file').addEventListener('change', (event) => {
      const file = event.target.files?.[0]; event.target.value = '';
      if (file) onMagicImage(file); else if (state.magic) state.magic.resetApproved = false;
    });
    $('#magic-image-file').addEventListener('cancel', () => { if (state.magic) state.magic.resetApproved = false; });
    $('#magic-wizard').addEventListener('dragover', (event) => {
      if (state.magic?.step === 1 && event.dataTransfer.types.includes('Files')) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }
    });
    $('#magic-wizard').addEventListener('drop', (event) => {
      if (state.magic?.step !== 1 || !event.dataTransfer.files.length) return;
      event.preventDefault();
      if (event.dataTransfer.files.length !== 1) { toast('Vyberte iba jeden obrázok.', true); return; }
      onMagicImage(event.dataTransfer.files[0]);
    });
    const graph = $('#motion-graph');
    graph.addEventListener('pointermove', (event) => {
      const rect = graph.getBoundingClientRect();
      const t = K.clamp(((event.clientX - rect.left) / rect.width * 800 - 43) / 717, 0, 1);
      const sample = state.samples[Math.round(t * (state.samples.length - 1))];
      const tooltip = $('#graph-tooltip');
      tooltip.hidden = false;
      tooltip.textContent = state.graphMode === 'force' && state.forceContext
        ? `${fmt(sample.motion)} ${sample.range.unit} → ${fmt(P.generalized(state.forceContext, sample.motion).handForce, 2)} ${sample.range.unit === '°' ? 'N·m' : 'N'} · odhad`
        : `${fmt(sample.motion)} ${sample.range.unit} → ${fmt(sample.angle)}°${sample.blocked ? ' · blokovanie' : ''}`;
      tooltip.style.left = `${K.clamp(event.clientX - rect.left, 75, rect.width - 75)}px`;
    });
    graph.addEventListener('pointerleave', () => { $('#graph-tooltip').hidden = true; });
    graph.addEventListener('click', (event) => {
      if (state.gifExport) return;
      const rect = graph.getBoundingClientRect(), range = K.driveRange(state.project);
      const t = K.clamp(((event.clientX - rect.left) / rect.width * 800 - 43) / 717, 0, 1);
      setMotion(K.lerp(range.min, range.max, t));
    });
    $('#modal').addEventListener('cancel', cancelGIF);
    $('#modal').addEventListener('close', () => {
      // A queued close event can arrive after this shared dialog has been reopened.
      if ($('#modal').open) return;
      cancelGIF(); state.pendingSnap = null; state.pendingRevisionId = null; state.pendingCollectionDelete = null; state.pendingDeleteKeys = null;
      state.pendingProjectDelete = null; state.pendingImpact = null; state.referenceDraft = null; state.commandPalette = null;
      if (state.magic) state.magic.pendingScale = null;
    });
    document.addEventListener('visibilitychange', () => { lastFrame = 0; });
    window.addEventListener('beforeunload', (event) => {
      if (state.magic) {
        if (state.magic.image || state.magic.busy || state.magic.original.dirty || state.project.elements.length) { event.preventDefault(); event.returnValue = ''; }
        return;
      }
      if (state.dirty) saveProject(true);
    });
    let resizeTimer;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { if (state.gifExport) { state.gifExport.resized = true; return; } fitView(); renderScene(); }, 150); });
  }
