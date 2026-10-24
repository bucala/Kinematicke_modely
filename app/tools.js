/* Kinematika UI · Väzby, motor, opravy, predloha a pracovné nástroje.
   Klasický skript bez IIFE: zdieľa najvyššiu úroveň s ostatnými app/*.js a app.js, ktorý sa načíta posledný
   a definuje stav a konštanty. Súbor obsahuje iba deklarácie funkcií, pri načítaní nič nespúšťa. */
'use strict';
  function mainDimensionsSVG(result, scale) {
    if (!state.mainDimensions || state.magic) return '';
    const d = globalThis.KinmoUsability.mainDimensions(state.project, result); if (!d) return '';
    const gap = 24 / scale, y = d.top - gap, x = d.left - gap, size = 12 / scale;
    return `<g data-editor-overlay="main-dimensions" class="main-dimensions" pointer-events="none" fill="var(--ink)" stroke="var(--accent)" stroke-width="1" vector-effect="non-scaling-stroke">${line({x:d.left,y:d.top},{x:d.left,y:y-gap/3})}${line({x:d.right,y:d.top},{x:d.right,y:y-gap/3})}${line({x:d.left,y},{x:d.right,y})}${line({x:d.left,y:d.top},{x:x-gap/3,y:d.top})}${line({x:d.left,y:d.bottom},{x:x-gap/3,y:d.bottom})}${line({x,y:d.top},{x,y:d.bottom})}<text x="${(d.left+d.right)/2}" y="${y-5/scale}" text-anchor="middle" stroke="none" font-size="${size}">Šírka ${fmt(d.width,1)} mm</text><text transform="translate(${x-6/scale},${(d.top+d.bottom)/2}) rotate(-90)" text-anchor="middle" stroke="none" font-size="${size}">Výška ${fmt(d.height,1)} mm</text></g>`;
  }
  function dimensionsOverview() {
    const d = globalThis.KinmoUsability.mainDimensions(state.project, state.result); if (!d) { toast('Najskôr vložte prvok.'); return; }
    modal('Hlavné rozmery mechanizmu', `<p>Aktuálna poloha · jednotky mm. Rozmery vychádzajú z obrysov viditeľných prvkov; nezahŕňajú predlohu ani texty.</p><div class="dimension-metrics"><strong>Šírka ${fmt(d.width,2)} mm</strong><strong>Výška ${fmt(d.height,2)} mm</strong></div><div class="comparison-scroll"><table class="diagnostic-table"><thead><tr><th>Prvok</th><th>A–B (mm)</th><th>Pracovný rozsah (mm)</th></tr></thead><tbody>${d.members.map(e=>`<tr><td>${escape(e.name)}</td><td>${fmt(e.length,2)}</td><td>${e.min == null ? '—' : `${fmt(e.min)}–${fmt(e.max)}`}</td></tr>`).join('')}</tbody></table></div><p>Rozmery na plátne zapnete tlačidlom Hlavné rozmery v hornej lište.</p>`);
  }
  function explainMovement() {
    const report = globalThis.KinmoUsability.blockers(state.project, state.result);
    state.showFreedom = true; renderScene();
    modal('Prečo sa mechanizmus nehýbe?', `<p>${report.free} voľných súradníc. Pevné uloženie samo osebe nie je chyba; určte, ktorá časť sa má pohybovať.</p><div class="explanation-list">${report.hints.map(s=>`<p>${escape(s)}</p>`).join('')}${report.rows.map(r=>`<button class="button button-secondary" data-action="explain-focus" data-key="${escape(r.key)}" data-kind="${r.action}"${r.otherKey ? ` data-other="${escape(r.otherKey)}"` : ''}>${escape(r.message)}</button>`).join('') || '<p>V zobrazenej polohe sa nenašlo obmedzenie. Skontrolujte celý cyklus.</p>'}</div><h3>Navrhnuté opravy</h3>${report.repairs.map(r=>`<button class="button button-secondary" data-action="repair-model" data-key="${escape(r.key)}" data-kind="${r.action}">${escape(r.label)}</button>`).join('') || '<p>Bez automatického návrhu opravy.</p>'}<div class="modal-actions"><button class="button button-dark" data-action="cycle-review">Overiť celý cyklus</button></div>`, true);
  }
  async function reviewCycle() {
    const revision = JSON.stringify(state.project), project = K.copy(state.project), range = K.driveRange(project), samples = [], profile = K.prepareProject(project), token = {};
    modal('Kontrola celého cyklu', '<p id="cycle-progress" role="status">Kontrolujem polohy…</p><button class="button button-secondary" data-action="close-modal">Zrušiť</button>');
    state.cycleReviewJob = token;
    try {
      for (let i=0;i<201;i++) {
        if (state.cycleReviewJob !== token || !$('#modal').open || JSON.stringify(state.project) !== revision) return;
        samples.push(K.solve(project,K.lerp(range.min,range.max,i/200),{profile,collisions:true}));
        if (i%10===0) { $('#cycle-progress').textContent = `Kontrolujem polohu ${i+1}/201`; await new Promise(resolve=>requestAnimationFrame(resolve)); }
      }
      const review = globalThis.KinmoUsability.cycleReview(project,samples); state.cycleReview = {review,revision};
      modal('Výsledok kontroly cyklu', `<p>${review.count} vzorkovaných polôh · ${review.failures.length} polôh s upozornením. Kontrolované sú väzby, kolízie a zdvih pružných členov.</p>${!review.hasDrive ? '<p class="analysis-warning">Chýba predpísaný pohon. Táto kontrola nepredpovedá časový priebeh Pohybu zo síl.</p>' : ''}<p>Kontrola je vzorkovaná; veľmi úzky konflikt medzi vzorkami môže uniknúť.</p><div class="cycle-failures">${review.failures.map((r,i)=>`<button class="button button-secondary" data-action="cycle-position" data-index="${i}">${fmt(r.motion,2)} ${review.range.unit} · ${escape(r.reasons.join(' ') || 'Nesplnená väzba')}</button>`).join('') || '<p>Vo vzorkovaných polohách nebol zistený problém.</p>'}</div>`,true);
    } catch(error) { if ($('#modal').open) toast(error.message,true); }
    finally { if (state.cycleReviewJob===token) state.cycleReviewJob=null; }
  }
  function connectionDiagram(review) {
    const svg=X.vectorSVG(review.project,review.result,{dimensions:false,trajectories:false,labels:false}), bounds=X.geometryBounds(X.geometry(review.project,review.result,{dimensions:false,trajectories:false}));
    const points=review.joint ? [K.point(review.result,review.joint.a),K.point(review.result,review.joint.b)].filter(Boolean) : [], radius=bounds.width/100;
    const markers=points.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="${radius}" fill="#f7d56e" stroke="#9b462c" stroke-width="${radius/4}"/>`).join('');
    const at=points[0], label=at ? `<text x="${at.x+radius*2}" y="${at.y-radius*2}" fill="#9b462c" font-size="${radius*2}">Nový spoj</text>` : '';
    return svg.replace('</svg>',`<g aria-label="Spojované body">${markers}${label}</g></svg>`);
  }
  function previewConnection(a, b, type, snap = null, showPreview = false) {
    try {
      const review = globalThis.KinmoUsability.connectionPreview(state.project,a,b,type,state.motion,{snap,design:state.mode==='edit'});
      if (!showPreview) {
        if (snap) submitSnapConnection(new Map([['type', type]]));
        else editCanvas(review.project, 'Väzba bola pridaná. Späť ju odstráni.');
        state.pendingJoint = null; state.connectionReview = null; updateToolbar();
        if (review.errors.length || review.result.blocked) toast('Väzba bola pridaná s upozornením. Skontrolujte uloženie a rozmery alebo použite Späť.', true);
        return;
      }
      state.connectionReview = {a:K.copy(a),b:K.copy(b),type,review,revision:JSON.stringify(state.project),snap:snap?K.copy(snap):null,transaction:state.snapTransaction};
      const elastic=[a,b].some(r=>K.isElastic(state.project.elements.find(e=>e.id===r.elementId)));
      const types = a.point==='curve'||b.point==='curve' ? ([a,b].some(r=>r.point==='curve'&&state.project.elements.find(e=>e.id===r.elementId)?.type==='rail') ? ['point-path','prismatic'] : [type]) : elastic ? ['revolute'] : ['revolute','fixed'];
      modal('Náhľad novej väzby', `<div class="connection-type-choices">${types.map(t=>`<button class="button button-secondary" data-action="connection-type" data-type="${t}" aria-pressed="${type===t}">${escape(E.constraintNames[t])}</button>`).join('')}</div><p>${escape(review.motion)}</p><p>Voľné súradnice: ${review.before} → ${review.after}. Počet závisí od aktuálnej geometrie.</p><div class="connection-preview">${connectionDiagram(review)}</div><form id="connection-review-form">${review.errors.length || review.result.blocked ? `<p class="analysis-warning">Náhľad obsahuje konflikt: ${escape([...review.errors.map(r=>r.name),...review.issues].join('; '))}</p><label class="check-row"><input type="checkbox" name="accept-conflict" required/>Vložiť aj s upozornením; geometriu upravím následne.</label>` : '<p>V tejto polohe nebol zistený konflikt väzieb. Celý cyklus overte po vložení.</p>'}<div class="modal-actions"><button class="button button-secondary" type="button" data-action="close-modal">Zrušiť</button><button class="button button-dark">Potvrdiť väzbu</button></div></form>`,true);
    } catch(error) { toast(error.message,true); }
  }
  function confirmConnection(data) {
    const draft = state.connectionReview; if (!draft || draft.revision !== JSON.stringify(state.project)) throw new Error('Model sa zmenil. Vytvorte nový náhľad väzby.');
    if ((draft.review.errors.length || draft.review.result.blocked) && !data.has('accept-conflict')) throw new Error('Potvrďte upozornenie alebo zvoľte inú väzbu.');
    if(draft.snap){state.pendingSnap=draft.snap;state.snapTransaction=draft.transaction;submitSnapConnection(new Map([['type',draft.type]]));}else editCanvas(draft.review.project,'Väzba bola potvrdená.'); state.pendingJoint=null; state.connectionReview=null; $('#modal').close(); updateToolbar();
  }
  function constructionModal() {
    const e = currentElement(); if (!e || !K.isElastic(e)) return;
    const geom = e.type.startsWith('piston-') ? K.pistonGeometry(e) : null;
    modal('Konštrukčné rozmery', `<p>${escape(e.name)} · zmeny rozsahu sa potvrdia spoločne.</p>${geom ? `<p>Valec: ${fmt(geom.cylinder,2)} mm · zdvih: ${fmt(geom.stroke,2)} mm · potrebné zasunutie: ${fmt(geom.stroke+geom.overlap,2)} mm.</p>` : '<p>Voľná dĺžka musí byť medzi oboma dorazmi.</p>'}<form id="construction-form" data-id="${escape(e.id)}"><div class="settings-fields">${quantityInput('minLength','Minimálna dĺžka medzi čapmi',''+e.minLength,'mm',.1,5000)}${quantityInput('maxLength','Maximálna dĺžka medzi čapmi',''+e.maxLength,'mm',.1,5000)}${quantityInput('restLength','Voľná / referenčná dĺžka',''+e.restLength,'mm',.1,5000)}</div><p id="construction-feedback" role="status"></p><div class="modal-actions"><button class="button button-secondary" type="button" data-action="close-modal">Zrušiť</button><button class="button button-dark">Použiť rozmery</button></div></form>`);
  }
  function propertiesOverview() {
    const e = currentElement(); if (!e) return;
    modal('Vlastnosti prvku', `<h3>${escape(e.name)}</h3><p>${escape(e.role==='motor-housing'?'Kryt elektromotora':typeNames[e.type])}</p>${e.type==='cam'?'<button class="button button-dark" data-action="cam-spin">Otáčať vačku</button><button class="button button-secondary" data-action="surface-contact">Kontaktná plocha</button>':e.type==='motor'?'<button class="button button-dark" data-action="cam-spin">Zapnúť motor</button><button class="button button-secondary" data-action="motor-spec">Parametre elektromotora</button><button class="button button-secondary" data-action="motor-housing">Kryt a montážne body</button>':''}${e.primary ? '<p>Chránená šablóna. Vytvorte voľnú kópiu na úpravy.</p><button class="button button-secondary" data-action="make-editable">Vytvoriť voľnú kópiu</button>' : `<div class="properties-overview"><details open><summary>Geometria</summary><div><button data-action="element-menu">Názov</button><button data-action="open-full-properties">Všetky parametre geometrie</button>${K.isElastic(e) ? '<button data-action="construction">Konštrukčné rozmery a zdvih</button>' : state.mode==='edit'&&!e.locked ? '<button data-action="edit-numbers">Poloha X / Y</button><button data-action="edit-rotation">Natočenie</button>' : ''}${state.mode==='edit'&&W.thickness(e) ? '<button data-action="edit-thickness">Hrúbka / priemer</button>' : ''}</div></details><details><summary>Spojenia a uloženie</summary><div><button data-action="selection-settings">Spojenia / uloženie</button><button data-action="new-joint">Pridať väzbu</button></div></details>${!K.isElastic(e)&&!['ground','slot'].includes(e.type)&&(!e.parentId||e.type==='motor') ? '<details><summary>Pohon a limity</summary><div><button data-action="selection-motor">Priradiť / upraviť pohon</button><button data-action="element-limits">Pohybové limity</button></div></details>' : ''}<details><summary>Kontrola</summary><div><button data-action="explain-movement">Prečo sa nehýbe?</button><button data-action="cycle-review">Overiť celý cyklus</button></div></details></div>`}`);
  }
  function editableForDrive(){if(state.project.kind!=='custom'){saveProject(true);const copy=E.editableCopy(state.project,state.motion);loadProject(copy,{motion:0,workspace:{...X.preferences(state),mode:'edit'}},true);}return state.project;}
  function motorHousing() {
    const e = currentElement(); if (e?.type !== 'motor') return;
    let housing = state.project.elements.find(v => v.id === e.parentId && v.role === 'motor-housing');
    if (!housing) {
      const next = I.separateMotor(state.project, e.id);
      editCanvas(next, 'Kryt a rotor sú oddelené. Pôvodné väzby hriadeľa zostali zachované.');
      housing = next.elements.find(v => v.id === next.elements.find(v => v.id === e.id).parentId);
    }
    selectTarget(I.elementKey(housing.id)); $('#modal').close(); setInspectorOpen(true); renderScene();
    toast('A/B sú úchyty krytu, C jeho stred. Kryt spojte napevno s rámom; rotor poháňa samostatný motor.');
  }
  function startRotation(id=state.selected){try{const project=editableForDrive(),e=project.elements.find(e=>e.id===id);if(!e||!['cam','motor'].includes(e.type))return;
    if(e.type==='motor')state.motorMode='drive';
    const info=e.type==='motor'?globalThis.KinmoSurfaces.motor(e):null,next=I.setDriver(project,{elementId:id,point:'a'},{enabled:true,mode:'rotary',speed:info?info.outputRPM*6:45,min:0,max:360,continuous:true},E.design(project,state.motion));
    next.simulation.mode='kinematic';editCanvas(next,'Otočný pohon bol zapnutý.');state.direction=info?.outputRPM<0?-1:1;state.mode='simulate';state.motion=state.direction<0?360:0;recalculate(false);updateToolbar();renderInspector();state.playing=!state.result.blocked;updateMotion();$('#modal').close();if(state.result.blocked)toast(state.result.issues[0]||'Otáčanie blokujú väzby.',true);}catch(error){toast(error.message,true);}}
  function motorSpecModal(id=state.selected){let e=state.project.elements.find(e=>e.id===id);if(e?.role==='motor-housing')e=state.project.elements.find(v=>v.type==='motor'&&v.parentId===id);if(!e||e.type!=='motor')return;const info=globalThis.KinmoSurfaces.motor(e);
    modal('Parametre elektromotora',`<form id="motor-spec-form" data-id="${e.id}"><div class="settings-fields"><label class="property-field"><span>Typ motora</span><select name="motorKind">${[['dc','DC'],['ac','AC'],['stepper','Krokový'],['servo','Servo']].map(([v,n])=>`<option value="${v}"${e.motorKind===v?' selected':''}>${n}</option>`).join('')}</select></label>${[['length','Polomer výstupného bodu B','mm',1,5000],['motorLength','Dĺžka telesa','mm',1,5000],['motorDiameter','Priemer telesa','mm',1,5000],['shaftDiameter','Priemer hriadeľa','mm',.1,1000],['powerW','Mechanický výkon','W',0,10000000],['voltage','Menovité napätie','V',.1,10000],['rpm','Menovité otáčky','rpm',0,100000],['efficiency','Účinnosť motora','',.01,1],['gearRatio','Prevodový pomer','',.01,10000],['gearEfficiency','Účinnosť prevodovky','',.01,1]].map(([key,label,unit,min,max])=>quantityInput(key,label,''+e[key],unit,min,max)).join('')}<label class="property-field"><span>Smer otáčania</span><select name="direction"><option value="1"${e.direction!==-1?' selected':''}>Kladný</option><option value="-1"${e.direction===-1?' selected':''}>Záporný</option></select></label></div><p>Výstup: ${fmt(info.outputRPM)} rpm · ${fmt(info.torque,3)} N·m · menovitý prúd ${fmt(info.current)} A. Menovitý režim bez elektrického rozbehu a prúdového riadenia.</p><p>Kryt má vlastné montážne body A/B a stred C. Cez tlačidlo Kryt a montážne body ho pripojíte k rámu. A rotora prenáša otáčanie pevným spojením s ramenom. B rotora je excentrický výstupný čap; jeho polomer určuje zdvih pripojeného mechanizmu.</p><div class="modal-actions"><button class="button button-dark">Použiť nastavenia</button></div></form>`);}
  function surfaceModal(id=state.selected){editableForDrive();const cams=state.project.elements.filter(e=>e.type==='cam'),followers=state.project.elements.filter(e=>!['cam','motor','ground','slot'].includes(e.type)&&!K.isElastic(e));
    if(!cams.length||!followers.length){toast('Pridajte vačku a kontaktný prvok.',true);return;}const selected=followers.find(e=>e.id===id)||followers.find(e=>e.type==='rail')||followers[0];
    modal('Kontaktná plocha',`<form id="surface-form"><label class="property-field"><span>Vačka</span><select name="cam">${cams.map(e=>`<option value="${e.id}"${e.id===id?' selected':''}>${escape(e.name)}</option>`).join('')}</select></label><label class="property-field"><span>Kontaktný prvok</span><select name="follower">${followers.map(e=>`<option value="${e.id}"${e.id===selected.id?' selected':''}>${escape(e.name)}</option>`).join('')}</select></label><label class="property-field"><span>Druh kontaktu</span><select name="kind"><option value="flat">Plochá hrana</option><option value="roller">Valček</option><option value="point">Bodový dotyk</option></select></label><label class="property-field"><span>Kontaktná hrana</span><select name="edge"></select></label><svg id="surface-preview" viewBox="0 0 200 100" style="width:100%;height:150px" aria-label="Náhľad kontaktnej hrany"></svg>${quantityInput('radius','Polomer valčeka',''+(selected.radius||4),'mm',0,1000)}<p>Kinematický dotyk s kontúrou vačky. Vozík sa pohybuje po svojom vedení; koncové limity zostávajú platné.</p><div class="modal-actions"><button class="button button-dark">Vytvoriť kontakt</button></div></form>`);updateSurfaceEdges();}
  function updateSurfaceEdges(){const form=$('#surface-form');if(!form)return;const e=state.project.elements.find(e=>e.id===form.elements.follower.value),result=E.design(state.project,state.motion),ref={elementId:e.id,point:e.type==='rail'?'c':'a'},edges=globalThis.KinmoSurfaces.edges(e,result.poses[e.id],ref);
    form.elements.edge.innerHTML=edges.map(v=>`<option value="${v.index}">Hrana ${v.index+1} · ${fmt(K.distance(v.a,v.b))} mm</option>`).join('');if(e.type==='rail')form.elements.edge.value='1';form.elements.kind.value=e.type==='bearing'?'roller':e.type==='node'?'point':'flat';updateSurfacePreview();}

  function updateSurfacePreview(){const form=$('#surface-form'),svg=$('#surface-preview');if(!form||!svg)return;form.elements.edge.closest('label').hidden=form.elements.kind.value!=='flat';form.elements.edge.disabled=form.elements.kind.value!=='flat';form.elements.radius.closest('label').hidden=form.elements.kind.value!=='roller';form.elements.radius.disabled=form.elements.kind.value!=='roller';const follower=state.project.elements.find(e=>e.id===form.elements.follower.value),cam=state.project.elements.find(e=>e.id===form.elements.cam.value),result=E.design(state.project,state.motion),pose=result.poses[follower.id],ref={elementId:follower.id,point:follower.type==='rail'?'c':'a'},edges=globalThis.KinmoSurfaces.edges(follower,pose,ref),edge=edges[Number(form.elements.edge.value)],points=edges.map(e=>K.worldPoint({a:pose[ref.point],angle:pose.angle},e.a)),camPoints=result.poses[cam.id].path,all=[...points,...camPoints],left=Math.min(...all.map(v=>v.x)),top=Math.min(...all.map(v=>v.y)),width=Math.max(...all.map(v=>v.x))-left,height=Math.max(...all.map(v=>v.y))-top;
    svg.setAttribute('viewBox',`${left-10} ${top-10} ${width+20} ${height+20}`);svg.innerHTML=`<polygon points="${camPoints.map(v=>`${v.x},${v.y}`).join(' ')}" fill="none" stroke="var(--muted)" stroke-width="1" vector-effect="non-scaling-stroke"/><polygon points="${points.map(v=>`${v.x},${v.y}`).join(' ')}" fill="none" stroke="var(--muted)" stroke-width="1" vector-effect="non-scaling-stroke"/>${edge&&form.elements.kind.value==='flat'?line(K.worldPoint({a:pose[ref.point],angle:pose.angle},edge.a),K.worldPoint({a:pose[ref.point],angle:pose.angle},edge.b),'stroke="var(--accent)" stroke-width="4" vector-effect="non-scaling-stroke"'): `<circle cx="${pose[ref.point].x}" cy="${pose[ref.point].y}" r="${form.elements.kind.value==='point'?2:quantityValue(new FormData(form),'radius','mm',0,1000)}" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke"/>`}`;}

  function debugSnapshot(includeImages = false) {
    const project = K.copy(state.project), reference = includeImages ? project.importReference : null;
    delete project.importReference; if(project.source){delete project.source.image;delete project.source.imageData;}
    return { project: JSON.parse(X.serializeNative(project, {motion:state.motion,workspace:X.preferences(state)})), mode:state.mode, motion:state.motion,
      selected:[...state.selectedElementIds], view:K.copy(state.view), tool:state.tool, playing:state.playing,
      result:state.result?{blocked:state.result.blocked,issues:[...state.result.issues],poses:K.copy(state.result.poses),forces:K.copy(state.result.forces||[])}:null,
      solver:state.result?{constraints:W.constraints(state.project,state.result),freedom:E.freedom(state.project,state.result)}:null,
      dynamic:state.dynamic?K.copy(state.dynamic):null, forceError:state.forceError, ...(reference?{reference}: {}) };
  }
  function debugModal() {
    const d=globalThis.KinmoDebug.status();
    modal('Debug režim · údaje pre cielené opravy', `<p>Pri zapnutí sa lokálne priebežne ukladajú akcie, chyby, polohy mechanizmu, zmeny geometrie a diagnostika Fusion. Záznam pretrvá obnovenie stránky. Export priložte AI spolu s popisom problému.</p><form id="debug-form"><label class="check-row"><input name="debug-enabled" type="checkbox"${d.enabled?' checked':''}/>Zapnúť priebežný debug záznam</label><p>${d.events} udalostí · ${d.checkpoints} snímok. ${escape(d.storageError)}</p><label class="property-field"><span>Čo sa stalo a ako to zopakovať?</span><textarea class="text-field" name="description" rows="4" maxlength="4000"></textarea></label><label class="check-row"><input name="images" type="checkbox"/>Zahrnúť aj predlohu Magic importu</label><p class="section-description">Kľúče Fusion, heslá a podpisové údaje sa nezapisujú. Súbor obsahuje geometriu projektu; predlohu zahrnie iba začiarknutá voľba.</p><div class="modal-actions"><button class="button button-secondary" type="button" data-action="debug-clear">Vymazať záznam</button><button class="button button-dark" type="submit">Exportovať debug súbor</button></div></form>`);
  }

  function issueModal() {
    modal('Nahlásiť problém · lokálny balík', '<p>Balík obsahuje geometriu projektu, aktuálnu polohu, režim a diagnostiku. Zdrojové obrázky sa vynechajú. Súbor si stiahnete a priložíte k hláseniu.</p><form id="issue-form"><label class="property-field"><span>Čo sa stalo a ako to zopakovať?</span><textarea class="text-field" name="description" maxlength="4000" rows="5" required></textarea></label><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zrušiť</button><button class="button button-dark">Stiahnuť diagnostický balík</button></div></form>');
  }

  function modal(title, content, wide = false) {
    state.cycleReviewJob=null;
    closeContextMenu();
    document.querySelectorAll('#workflow-tools details[open], #model-checks details[open]').forEach((el) => { el.open = false; });
    state.playing = false; updateMotion();
    const el = $('#modal');
    el.className = wide ? 'modal-wide' : '';
    el.innerHTML = `<div class="modal-heading"><div><span class="eyebrow">KINEMATIKA STUDIO</span><h2 id="modal-title">${escape(title)}</h2></div>${ib('close', 'close-modal', 'Zavrieť dialóg')}</div>${content}`;
    if (!el.open) el.showModal();
  }

  function templateCards() {
    const previews = {
      drawer: '<path d="M20 77h125M30 35v55h80M113 54h42c27 0 16 33 55 33" stroke="#a5b9b1"/><path d="M46 76h122" stroke="#d5a056" stroke-width="7"/><path d="m165 76 10-60" stroke="#d5a056" stroke-width="9"/><circle cx="165" cy="76" r="4" fill="#fff"/><circle cx="173" cy="34" r="4" fill="#fff"/>',
      fourbar: '<path d="M45 86h139" stroke="#b6c0ca" stroke-width="6"/><path d="m45 86 27-47 81-18 31 65" stroke="#d5a056" stroke-width="7"/><path d="m72 39 81-18" stroke="#79a69a" stroke-width="7"/><g fill="#fff" stroke="#71818f"><circle cx="45" cy="86" r="5"/><circle cx="72" cy="39" r="5"/><circle cx="153" cy="21" r="5"/><circle cx="184" cy="86" r="5"/></g>',
      crank: '<path d="M30 72h169" stroke="#bcc8d0" stroke-width="2"/><path d="m35 72 31-40 99 40" stroke="#d5a056" stroke-width="7"/><path d="m66 32 99 40" stroke="#79a69a" stroke-width="7"/><rect x="153" y="57" width="35" height="30" rx="4" fill="#e5c18b"/><g fill="#fff" stroke="#71818f"><circle cx="35" cy="72" r="5"/><circle cx="66" cy="32" r="5"/><circle cx="165" cy="72" r="5"/></g>',
      custom: '<rect x="25" y="17" width="180" height="80" rx="8" stroke="#d4dce2" stroke-dasharray="5 5"/><path d="M115 38v38M96 57h38" stroke="#a6b2bd" stroke-width="2"/>',
    };
    const texts = {
      drawer: ['Výsuv s vyklápacím čelom', 'Lineárne vedenie, ložisko a zakrivená kulisa.', '6 prvkov', '300 mm zdvih'],
      fourbar: ['Štvorkĺbový mechanizmus', 'Uzavretý reťazec s presnými dĺžkami ramien.', '4 prvky', '360° pohon'],
      crank: ['Kľukový mechanizmus', 'Premena rotačného pohybu na posuv piesta.', '5 prvkov', '360° pohon'],
      custom: ['Vlastný mechanizmus', 'Prázdna plocha. Vaše prvky, vaše väzby.', 'Čisté plátno', 'Bez obmedzení'],
    };
    return `<div class="template-grid">${Object.keys(texts).map((kind) => `<button class="preset-card" data-action="load-template" data-kind="${kind}"><div class="preset-preview"><svg viewBox="0 0 230 115" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${previews[kind]}</svg>${kind === 'drawer' ? '<span class="recommended">ODPORÚČANÉ</span>' : ''}</div><div class="preset-body"><h3>${texts[kind][0]}</h3><p>${texts[kind][1]}</p><div><span>${texts[kind][2]}</span><span>${texts[kind][3]}</span>${icon('arrow', 16)}</div></div></button>`).join('')}</div>`;
  }

  function magicBounds() {
    const magic = state.magic, rect = M.imageRect(magic.image, magic.step <= 2 ? null : magic.scale);
    let minX = rect.x, minY = rect.y, maxX = rect.x + rect.width, maxY = rect.y + rect.height;
    if (magic.step >= 3) for (const e of state.project.elements.filter((e) => e.visible)) {
      const pose = state.result.poses[e.id];
      if (!pose) continue;
      for (const p of [pose.a, pose.b, pose.c, ...(pose.path || []), ...(pose.outline || [])].filter(Boolean)) {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
      }
    }
    const padding = Math.max(.01, Math.max(maxX - minX, maxY - minY) * .06);
    return { x: minX - padding, y: minY - padding, width: maxX - minX + 2 * padding, height: maxY - minY + 2 * padding };
  }

  function liveDimensionSVG(scale) {
    const d=state.drag;if(d?.kind!=='manipulation'||!state.pointer)return '';
    const e=state.project.elements.find(e=>e.id===W.bodies(state.project,d.keys)[0]);if(!e)return '';
    const value=d.handle==='thickness'?`${W.thickness(e).label} ${fmt(W.thickness(e).value,2)} mm`:d.handle==='length'?`L ${fmt(e.length,2)} mm`:d.handle==='rotate'?`${fmt(e.angle,2)}°`:'';
    return value?`<g data-editor-overlay="dimension-live" pointer-events="none"><text class="handle-value" x="${state.pointer.x+16/scale}" y="${state.pointer.y-16/scale}" font-size="${12/scale}">${escape(d.typed?`${d.typed} · Enter`:value+' · zadajte číslo + Enter')}</text></g>`:'';
  }
  function typeDimension(event) {
    const d=state.drag;if(d?.kind!=='manipulation'||!['length','thickness','rotate'].includes(d.handle)||event.ctrlKey||event.metaKey||event.altKey)return false;
    if(/^[0-9.,-]$/.test(event.key)||event.key==='Backspace'){event.preventDefault();d.typed=event.key==='Backspace'?(d.typed||'').slice(0,-1):((d.typed||'')+event.key).slice(0,32);renderScene();return true;}
    if(event.key!=='Enter'||!d.typed)return false;
    event.preventDefault();try{const value=W.parseNumber(d.typed,d.handle==='rotate'?'°':'mm'),id=W.bodies(d.projectBefore,d.keys)[0];
      const next=d.handle==='thickness'?W.setThickness(d.projectBefore,id,value):d.handle==='length'?W.setLength(d.projectBefore,id,value,d.fixedEnd,d.resultBefore):W.transform(d.projectBefore,d.keys,{angle:value-d.projectBefore.elements.find(e=>e.id===id).angle,pivot:d.pivot},d.resultBefore);
      if(!d.moved){pushHistory();d.moved=true;}state.project=next;state.result=solveCurrent();onPointerUp({pointerId:d.pointerId});
    }catch(error){toast(error.message,true);}return true;
  }
  function elasticStatusSVG(scale) {
    const e=currentElement(),pose=e&&state.result.poses[e.id];if(state.mode!=='simulate'||!K.isElastic(e)||!pose)return '';
    const f=state.result.forces?.find(f=>f.id===e.id),stroke=pose.length-e.minLength,deflection=pose.length-e.restLength,stop=pose.length<=e.minLength+.05?' · zasunutý doraz':pose.length>=e.maxLength-.05?' · vysunutý doraz':'';
    return `<g data-editor-overlay="elastic-status" pointer-events="none"><text class="handle-value" x="${(pose.a.x+pose.b.x)/2}" y="${(pose.a.y+pose.b.y)/2+32/scale}" text-anchor="middle" font-size="${11/scale}">${e.type.startsWith('spring-')?'Deformácia':'Zdvih'} ${fmt(e.type.startsWith('spring-')?deflection:stroke,1)} mm${stop}</text><text class="handle-value" x="${(pose.a.x+pose.b.x)/2}" y="${(pose.a.y+pose.b.y)/2+47/scale}" text-anchor="middle" font-size="${10/scale}">Sila ${fmt(f?.nominalForce||0,1)} N · tlmenie ${fmt(f?.dampingForce||0,1)} N</text></g>`;
  }
  function railFreedomSVG(e,pose,scale) {
    const start=K.along(pose.a,e.carriageOffset,e.angle),end=K.along(start,e.stroke,e.angle),moving=e.movingRail?[pose.a,pose.b]:[pose.ct,pose.cb];
    return `<g data-editor-overlay="rail-freedom">${line(start,end,'stroke="#16867b" stroke-width="3" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"')}${moving.every(Boolean)?line(...moving,'stroke="#16867b" stroke-width="7" opacity=".45" vector-effect="non-scaling-stroke"'):''}${[start,end].map(p=>`<circle cx="${p.x}" cy="${p.y}" r="${5/scale}" fill="#fff" stroke="#16867b" vector-effect="non-scaling-stroke"/>`).join('')}</g>`;
  }
  function freedomBlockersSVG(id,scale) {
    const family=W.descendants(state.project,[id]);
    return state.project.connections.filter(j=>[j.a,j.b].some(r=>family.has(r.elementId))).map(j=>{const {a,b}=jointPoints(j);return a&&b?`<g>${line(a,b,'stroke="#c48227" stroke-width="5" opacity=".6" vector-effect="non-scaling-stroke"')}<circle cx="${a.x}" cy="${a.y}" r="${12/scale}" fill="none" stroke="#c48227" stroke-width="3" vector-effect="non-scaling-stroke"/><text class="handle-value" x="${a.x+16/scale}" y="${a.y-12/scale}" font-size="${10/scale}">${escape(j.name)}</text></g>`:'';}).join('');
  }
  function chooseConnectionTarget(index) {
    const prior=state.pendingSnap,choice=prior?.alternatives?.[index];if(!choice)return;
    if (state.snapTransaction && (state.snapTransaction.historyLength !== state.history.length || state.snapTransaction.project !== JSON.stringify(state.project))) { dismissSnapChoices(); toast('Model sa zmenil. Prichyťte body znova.', true); return; }
    const at=choice.source.ref ? K.point(state.result,choice.source.ref) : K.worldPoint(state.result.poses[choice.source.elementId],choice.source.local),delta={x:choice.point.x-at.x,y:choice.point.y-at.y};
    state.project=I.translate(state.project,[choice.wholeBody||!choice.source.ref?I.elementKey(choice.source.elementId):I.nodeKey(choice.source.ref)],delta,state.result);state.result=solveCurrent();
    state.pendingSnap={...choice,direct:prior.direct,alternatives:prior.alternatives};if(state.snapTransaction)state.snapTransaction.project=JSON.stringify(state.project);renderScene();renderSnapChoices();
  }
  function repairModel(el) {
    focusModelCheck({...el,dataset:{...el.dataset,kind:'inspect'}});const t=I.target(state.project,el.dataset.key);if(!t)return;
    if(['remove-duplicate','remove-constraint','release-rotation','release-limit','elastic-range'].includes(el.dataset.kind)) {
      const review = globalThis.KinmoUsability.repairPreview(state.project, el.dataset.key, el.dataset.kind, state.motion);
      state.pendingRepair = { review, revision: JSON.stringify(state.project) };
      modal('Náhľad opravy väzby', `<p>${escape(el.textContent || 'Úprava vybranej väzby')}</p><div class="repair-preview-grid"><figure><figcaption>Pred úpravou</figcaption>${repairDiagram(review, false)}</figure><figure><figcaption>Po úprave</figcaption>${repairDiagram(review, true)}</figure></div><p>Nesplnené väzby: ${review.beforeErrors.length} → ${review.afterErrors.length}. Voľné súradnice: ${review.beforeFree} → ${review.afterFree}.</p>${review.result.blocked ? `<p class="analysis-warning">Zostávajú problémy: ${escape(review.result.issues.join(' '))}</p>` : '<p>V tejto polohe sú väzby splnené.</p>'}<p>Ide o návrh pre aktuálnu polohu bez kontroly kolízií. Uvoľnenie mení mechanický význam zostavy; po úprave overte celý cyklus.</p><div class="modal-actions"><button class="button button-secondary" data-action="close-modal">Zrušiť</button><button class="button button-dark" data-action="repair-preview-apply">Použiť opravu</button></div>`, true);
    }
    else if(el.dataset.kind==='edit-joint')jointModal(t.joint.id);
    else if(el.dataset.kind==='connect')beginSelectedConnection();
    else if(el.dataset.kind==='support'){selectTarget(I.nodeKey({elementId:t.elementId,point:'a'}));state.showFreedom=true;renderScene();renderBindingTools();toast('Vyberte montážny bod a stlačte Ukotviť bod k rámu.');}
  }
  function repairDiagram(review, after) {
    const options = {dimensions:false,trajectories:false,labels:false};
    const bounds = X.geometryBounds([...X.geometry(state.project, review.before, options), ...X.geometry(review.project, review.result, options)]);
    const project = after ? review.project : state.project, result = after ? review.result : review.before;
    const radius = Math.max(3, Math.min(bounds.width, bounds.height) / 18), color = after ? '#258264' : '#bd503b';
    const points = review.references.map(r => K.point(result, r)).filter(Boolean).filter((p,i,all) => !all.slice(0,i).some(q => K.distance(p,q)<.01));
    const markers = points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="${radius}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke"/>${review.action==='release-rotation'&&after ? `<path d="M${p.x+radius*1.6} ${p.y}a${radius*1.6} ${radius*1.6} 0 1 0 ${-radius*1.6} ${radius*1.6}l${-radius*.4} ${-radius*.5}m${radius*.4} ${radius*.5}l${-radius*.6} ${radius*.1}" fill="none" stroke="${color}" stroke-width="1.5" vector-effect="non-scaling-stroke"/>` : ''}`).join('');
    return X.vectorSVG(project,result,options).replace(/viewBox="[^"]*"/,`viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}"`).replace('</svg>',`${markers}</svg>`);
  }
  function applyRepairPreview() {
    const draft = state.pendingRepair;
    if (!draft || draft.revision !== JSON.stringify(state.project)) { toast('Projekt sa zmenil. Návrh vytvorte znova.', true); return; }
    editCanvas(draft.review.project, 'Oprava bola použitá. Späť obnoví pôvodné väzby.');
    state.pendingRepair = null; $('#modal').close();
  }
  function referenceCalibrationModal() {
    const ref=state.project.importReference;if(!ref)return;const frame=ref.frames[ref.active],r=frame.rect;
    state.referenceCalibration={projectId:state.project.id,revision:JSON.stringify(state.project),frame:ref.active,count:0};
    modal('Kalibrácia predlohy podľa rozmeru',`<form id="reference-calibration-form"><p>Kliknite na body A a B známeho úseku v obrázku. Zadajte jeho skutočnú dĺžku.</p><div class="calibration-picture"><img src="${escape(frame.dataURL)}" class="reference-calibration-image" data-action="reference-calibration-pick" alt="Vyberte body A a B v predlohe"/><svg id="reference-calibration-marks" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg></div><div class="plan-row">${[['ax',r.x+r.width*.25],['ay',r.y+r.height*.5],['bx',r.x+r.width*.75],['by',r.y+r.height*.5]].map(([key,v])=>quantityInput(key,key.toUpperCase()+' (mm)',v)).join('')}</div>${quantityInput('distance','Skutočná dĺžka A–B (mm)',100,'mm',.1,5000)}<label class="check-row"><input type="checkbox" name="model"${state.project.kind!=='custom'?' disabled':''}/>Prepočítať aj celý model, kóty a väzby</label><p class="section-description">Bez tejto voľby sa zmení iba predloha. Bod A zostane na mieste. Zmenu vrátite jedným Späť.</p><div class="modal-actions"><button class="button button-secondary" type="button" data-action="close-modal">Zrušiť</button><button class="button button-dark">Použiť mierku</button></div></form>`,true);
  }
  function pickReferenceCalibration(el,event) {
    const draft=state.referenceCalibration,frame=state.project.importReference?.frames[draft?.frame];if(!frame)return;
    const box=el.getBoundingClientRect(),key=draft.count++%2?'b':'a',x=K.clamp((event.clientX-box.left)/box.width,0,1),y=K.clamp((event.clientY-box.top)/box.height,0,1),form=$('#reference-calibration-form');
    form.elements[key+'x'].value=frame.rect.x+x*frame.rect.width;form.elements[key+'y'].value=frame.rect.y+y*frame.rect.height;
    const marks=$('#reference-calibration-marks');marks.innerHTML=['a','b'].map(k=>{const px=(Number(form.elements[k+'x'].value)-frame.rect.x)/frame.rect.width*100,py=(Number(form.elements[k+'y'].value)-frame.rect.y)/frame.rect.height*100;return `<circle cx="${px}" cy="${py}" r="1.2" fill="#c64a24"/><text x="${px+2}" y="${py-2}" font-size="4" fill="#c64a24">${k.toUpperCase()}</text>`;}).join('');
  }
  function elasticResponseModal(values=null) {
    const e=currentElement();if(!K.isElastic(e))return;
    const input=values||{mass:e.tipMass||1,damping:e.damping,load:0},plot=WF.response(e,Number(input.mass),Number(input.damping),2,Number(input.load||0));state.responseDraft={id:e.id,revision:JSON.stringify(state.project),...input};
    const min=e.minLength,max=e.maxLength,path=plot.rows.map((r,i)=>`${i?'L':'M'}${30+r.time/2*490} ${145-(r.length-min)/(max-min)*120}`).join('');
    modal('Náhľad návratu a tlmenia',`<form id="elastic-response-form"><p>Samostatný osový prvok s bodovou hmotnosťou. Náhľad pomáha nastaviť návrat; väzby celej zostavy sledujte na plátne.</p><svg class="response-chart" viewBox="0 0 550 175" role="img" aria-label="Dĺžka pružného prvku počas dvoch sekúnd"><path d="M30 20V145H520" fill="none" stroke="#aaa"/><path d="${path}" fill="none" stroke="#16867b" stroke-width="2"/><text x="30" y="165" font-size="12">0 s</text><text x="490" y="165" font-size="12">2 s</text><text x="35" y="15" font-size="12">Dĺžka ${fmt(min)}–${fmt(max)} mm</text></svg><div class="response-presets">${[['fast','Rýchly návrat'],['slow','Pomalý návrat'],['oscillate',e.type.startsWith('spring-')?'Kmitanie so zaťažením':'Nízke tlmenie']].map(([preset,label])=>`<button class="button button-secondary" type="button" data-action="response-preset" data-preset="${preset}">${label}</button>`).join('')}</div>${quantityInput('mass','Pohyblivá hmotnosť (kg)',input.mass,'',.001,1000)}${quantityInput('damping','Osové tlmenie (N·s/m)',input.damping,'',0,100000)}${quantityInput('load','Stála protisila v náhľade (N)',input.load||0,'',0,1000000)}<p class="section-description">Jednosmerná pružina potrebuje na kmitanie protisilu. Táto skúšobná záťaž sa neukladá do mechanizmu.</p><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zavrieť</button><button class="button button-secondary">Aktualizovať náhľad</button><button type="button" class="button button-dark" data-action="response-apply">Použiť tlmenie na prvku</button></div></form>`,true);
  }
  function applyResponsePreset(preset) {
    const e=currentElement(),form=$('#elastic-response-form'),mass=W.parseNumber(form.elements.mass.value,''),critical=2*Math.sqrt(mass*Math.max(1,P.axial(e,e.restLength).rate*1000));
    const compression=['spring-compression','piston-push'].includes(e.type),at=e.restLength+(compression?-1:1)*(compression?e.restLength-e.minLength:e.maxLength-e.restLength)*.15;
    const load=preset==='oscillate'&&e.type.startsWith('spring-')?Math.abs(P.axial(e,at).nominalForce):W.parseNumber(form.elements.load.value,'');
    elasticResponseModal({mass,load,damping:preset==='oscillate'?critical*.05:preset==='slow'?Math.max(200,critical*5):critical});
  }
  function perspectiveModal(){const m=state.magic;if(!m?.image||m.geometryStarted){toast('Perspektívu vyrovnajte pred vytvorením geometrie.',true);return;}state.perspectivePick=0;modal('Vyrovnať perspektívu fotografie',`<form id="advanced-perspective-form"><p>Kliknite štyri rohy známeho obdĺžnika po obvode: ľavý horný, pravý horný, pravý dolný, ľavý dolný. Zadaný pomer strán určí vyrovnaný obrázok. Následne nastavíte mierku v mm.</p><div class="calibration-picture"><img class="reference-calibration-image" src="${escape(m.image.url)}" data-action="magic-perspective-pick" alt="Štyri rohy obdĺžnika"/><svg id="perspective-marks" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg></div><output id="perspective-progress">Roh 1 zo 4</output><div class="advanced-fields">${[[0,0],[m.image.width,0],[m.image.width,m.image.height],[0,m.image.height]].map(([x,y],i)=>quantityInput('x'+i,'Roh '+(i+1)+' · X (px)',x,'',0,m.image.width)+quantityInput('y'+i,'Y (px)',y,'',0,m.image.height)).join('')}</div>${quantityInput('width','Známa šírka obdĺžnika (mm)',400,'',1,5000)}${quantityInput('height','Známa výška obdĺžnika (mm)',300,'',1,5000)}<button class="button button-dark">Vyrovnať obrázok a znovu kalibrovať</button></form>`,true);}
  async function rectifyMagic(data){const magic=state.magic;if(!magic?.image||magic.geometryStarted)throw new Error('Obrázok sa zmenil alebo už obsahuje geometriu.');const width=quantityValue(data,'width','',1,5000),height=quantityValue(data,'height','',1,5000),points=Array.from({length:4},(_,i)=>({x:quantityValue(data,'x'+i,'',0,magic.image.width),y:quantityValue(data,'y'+i,'',0,magic.image.height)})),image=new Image();image.src=magic.image.url;await image.decode();if(state.magic!==magic)throw new Error('Import bol zrušený.');const factor=Math.min(1200/width,1200/height),canvas=window.KinmoAdvanced.rectify(image,points,width*factor,height*factor);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));canvas.width=canvas.height=0;if(!blob)throw new Error('Vyrovnaný obrázok sa nepodarilo vytvoriť.');magic.step=1;await onMagicImage(new File([blob],'Vyrovnana-predloha.png',{type:'image/png'}));$('#modal').close();}
  function startLesson(kind){let p;if(kind==='cam'){const cam=K.makeElement('cam',100,100);cam.drive=true;cam.driveSpeed=45;p=K.preset('custom');p.elements=[cam];p=I.addCamFollower(p,cam.id,E.design(p,0));}else p=WF.kit(kind,160,25,kind==='rail');p.id=K.uid();p.name=({rail:'Príklad: vozík s pohonom','spring-arm':'Príklad: pružinové rameno',cam:'Príklad: vačka a valček'})[kind];replaceProject(p);if(state.project.id!==p.id)return;state.lesson={kind,index:0};renderLesson();}
  function renderLesson(){let panel=$('#lesson-panel');if(!panel){panel=document.createElement('div');panel.id='lesson-panel';panel.className='lesson-panel';$('#canvas-area').append(panel);}if(!state.lesson){panel.hidden=true;return;}const steps={rail:['Vyberte vedenie a overte, že pevné vedenie pohybuje vozíkom.','V simulácii potiahnite vozík. Pohyb sa zastaví na hraniciach vedenia.','Otvorte Viac pohonov a nastavte trvanie stopy.','Skúste ukotviť pripojenú dosku: diagnostika odhalí zablokovaný pohyb. Zmenu vrátite Späť.'],'spring-arm':['Vyberte rameno. Čap A je ukotvený, druhý bod je spojený s pružinou.','Stlačte Pohyb zo síl a sledujte návrat ramena.','V Meraní v čase porovnajte silu a rýchlosť.','Skúste odpojiť pružinu: voľné rameno už nemá silové pripojenie. Diagnostika upozorní na chýbajúce spojenie.'],'cam':['Vyberte vačku. Valček je vedený v priamom vedení.','Spustite simuláciu: vačka predpisuje trvalý kontakt valčeka.','V Kontakt a dorazy zapnite pružný kontakt. Pohyb zo síl umožní odtrhnutie.','Nízka hmotnosť a príliš vysoká tuhosť môžu vyžadovať menší časový krok; upravte parametre podľa diagnostiky.']},rows=steps[state.lesson.kind];panel.hidden=false;panel.innerHTML=`<strong>Krok ${state.lesson.index+1} / ${rows.length}</strong><p>${rows[state.lesson.index]}</p><button data-action="lesson-next">${state.lesson.index===rows.length-1?'Dokončiť':'Ďalší krok'}</button><button data-action="lesson-close">Zavrieť</button>`;}
  function advancedModal(tab='hub') {
    const A=window.KinmoAdvanced,e=currentElement(),ref=selectionReference();if(!A)return;
    let body='';
    if(tab==='hub') {if(!ref){toast('Vyberte čap alebo koniec člena.',true);return;}const hub=A.hub(state.project,ref,state.result);body=`<p>Spoločný čap: ${hub.references.length} bodov, ${hub.joints.length} väzieb. Odpojenie nemení ostatné členy.</p>${hub.joints.map(j=>`<div class="advanced-row"><span>${escape(state.project.elements.find(e=>e.id===j.a.elementId)?.name)} ↔ ${escape(state.project.elements.find(e=>e.id===j.b.elementId)?.name)}</span><button class="button button-secondary" data-action="hub-detach" data-id="${escape(j.id)}"${j.builtin?' disabled':''}>Odpojiť iba tento spoj</button></div>`).join('')||'<p>Čap zatiaľ nemá pripojený ďalší člen.</p>'}`;}
    if(tab==='drives'){const drivers=state.project.elements.filter(e=>e.drive&&!e.primary);body=`<form id="advanced-drives-form"><p>Každá stopa predpisuje samostatný pohyb v čase. Pridať pohon možno aj na ďalší vlastný člen. Pri rozpore väzieb sa prehrávanie zastaví.</p>${state.project.elements.filter(e=>!e.primary&&!e.parentId&&!e.locked&&['link','panel','rail','cam','node'].includes(e.type)).map(e=>{const t=state.project.driveProgram?.tracks.find(t=>t.elementId===e.id);return `<fieldset><legend><label><input type="checkbox" name="drive" value="${escape(e.id)}"${e.drive?' checked':''}/>${escape(e.name)}</label></legend><label>Typ<select name="mode-${escape(e.id)}" class="property-select"><option value="linear"${(e.driveMode==='linear'||['rail','node'].includes(e.type))?' selected':''}${e.type==='cam'?' disabled':''}>Posuv (mm)</option><option value="rotary"${(e.driveMode!=='linear'&&!['rail','node'].includes(e.type))?' selected':''}${['rail','node'].includes(e.type)?' disabled':''}>Otáčanie (°)</option></select></label><div class="advanced-fields">${[['from',t?.from??0],['to',t?.to??(e.driveMode==='linear'?e.stroke:90)],['delay',t?.delay??0],['duration',t?.duration??6]].map(([k,v])=>`<label>${({from:'Od',to:'Do',delay:'Oneskorenie (s)',duration:'Trvanie (s)'})[k]}<input class="text-field" name="${k}-${escape(e.id)}" type="number" step="any" value="${v}" required/></label>`).join('')}<label>Priebeh<select class="property-select" name="easing-${escape(e.id)}"><option value="linear">Lineárny</option><option value="smooth"${t?.easing==='smooth'?' selected':''}>Plynulý</option></select></label></div></fieldset>`;}).join('')}<button class="button button-dark">Uložiť program pohonov</button></form>`;}
    if(tab==='planes'){if(!e||e.primary){toast('Vyberte vlastný člen.',true);return;}body=`<form id="advanced-plane-form">${quantityInput('plane','Montážna rovina (−20 až 20)',e.plane||0,'',-20,20)}<label>Skupina<input class="text-field" name="group" maxlength="60" value="${escape(e.group||'')}"/></label><p>Kríženie sa kontroluje medzi členmi rovnakej roviny. Skupina organizuje výber a viditeľnosť; nevytvára pevné spojenie.</p>${e.group?`<button type="button" class="button button-secondary" data-action="group-select">Vybrať skupinu</button><button type="button" class="button button-secondary" data-action="group-visibility">Prepnúť viditeľnosť skupiny</button>`:''}<button class="button button-dark">Uložiť</button></form>`;}
    if(tab==='contacts'){const frictionBody=e&&I.root(state.project,e);body=`<form id="advanced-contact-form"><p>Pružný vačkový kontakt je jednostranný: tlačí pri preniknutí, pri odtrhnutí má nulovú silu. Pre jemnú integráciu používajte primeranú tuhosť a kladnú hmotnosť sledovača.</p>${state.project.connections.filter(j=>j.type==='cam-contact').map(j=>`<fieldset><legend><label><input type="checkbox" name="contact" value="${escape(j.id)}"${j.contact?.enabled?' checked':''}/>${escape(j.name)} · pružný kontakt</label></legend>${quantityInput('k-'+j.id,'Tuhosť kontaktu (N/mm)',j.contact?.stiffness||100,'',.01,10000)}${quantityInput('c-'+j.id,'Tlmenie kontaktu (N·s/m)',j.contact?.damping??10,'',0,10000)}</fieldset>`).join('')}<label class="check-row"><input type="checkbox" name="soft"${state.project.simulation.softStops?' checked':''}/>Pružné dorazy pružín a piestov (maximálne 2 mm prekročenie)</label>${quantityInput('stop-k','Tuhosť dorazu (N/mm)',state.project.simulation.stopStiffness||100,'',.01,10000)}${quantityInput('stop-c','Tlmenie dorazu (N·s/m)',state.project.simulation.stopDamping??20,'',0,10000)}${frictionBody&&!frictionBody.drive&&!frictionBody.locked&&!['ground','slot','rail'].includes(frictionBody.type)?quantityInput('friction','Trenie vybraného pohyblivého člena (N)',frictionBody.guideFriction||0,'',0,10000):''}<button class="button button-dark">Použiť parametre kontaktu</button></form>`;}
    if(tab==='variants'){if(!e||e.primary){toast('Vyberte vlastný člen pre varianty.',true);return;}body=`<form id="advanced-variant-form"><label>Parameter<select name="property" class="property-select">${['length','stroke','stiffness','x','y','angle'].map(k=>`<option value="${k}">${escape(k)}</option>`).join('')}</select></label><label>2 až 4 hodnoty oddelené bodkočiarkou<input class="text-field" name="values" value="${e.length}; ${e.length*1.2}" required/></label><button class="button button-dark">Porovnať varianty</button></form>`;}
    if(tab==='measure'){const rows=state.measurements||[];body=`<p>${rows.length} zaznamenaných polôh. Záznam sa dopĺňa pri prehrávaní; graf zachováva aj sily a rýchlosti dynamiky.</p><button class="button button-secondary" data-action="measurement-clear">Nový záznam</button><button class="button button-secondary" data-action="measurement-csv">Export CSV</button><label>Člen<select class="property-select" id="measure-member">${state.project.elements.map(v=>`<option value="${escape(v.id)}"${e?.id===v.id?' selected':''}>${escape(v.name)}</option>`).join('')}</select></label><label>Veličina<select class="property-select" id="measure-metric"><option value="length">Dĺžka (mm)</option><option value="angle">Uhol (°)</option><option value="speed">Rýchlosť A (mm/s)</option><option value="force">Osová sila (N)</option></select></label><button class="button button-secondary" data-action="measurement-plot">Zobraziť graf</button><div id="measurement-plot"></div>`;}
    if(tab==='revisions'){const entries=readAutomaticVersions();body=`<p>Obnoviteľné lokálne verzie pred úpravami. Ukladajú sa najviac 12 verzií a 1,5 MB; pri nedostupnom úložisku úpravy pokračujú bez zálohy.</p>${entries.filter(v=>v.project.id===state.project.id).map(v=>`<div class="advanced-row"><span>${escape(new Date(v.time).toLocaleString('sk-SK',{timeZone:'Europe/Bratislava'}))} · ${v.project.elements.length} prvkov</span><button class="button button-secondary" data-action="automatic-review" data-id="${escape(v.id)}">Porovnať / obnoviť</button></div>`).join('')||'<p>Zatiaľ nie sú uložené verzie tohto projektu.</p>'}`;}
    if(tab==='learn'){body=`<p>Príklad sa otvorí ako nový vlastný projekt. Aktuálny model sa najskôr uloží.</p>${[['rail','Vozík a pohon'],['spring-arm','Rameno s pružinou'],['cam','Vačka a valček']].map(([kind,label])=>`<button class="button button-secondary" data-action="lesson-start" data-kind="${kind}">${label}</button>`).join('')}`;}
    modal(({hub:'Spoločný čap',drives:'Časové stopy pohonov',planes:'Skupiny a montážne roviny',contacts:'Kontakt, dorazy a trenie',variants:'Porovnanie variantov',measure:'Meranie v čase',revisions:'Automatické verzie',learn:'Interaktívne príklady'})[tab],body,true);
  }
  function readAutomaticVersions() {try{const data=JSON.parse(localStorage.getItem('kinematika.automatic.v1')||'[]');return Array.isArray(data)?data.slice(0,12).flatMap(v=>{try{return [{id:String(v.id),time:Number(v.time)||0,project:K.validateProject(v.project)}];}catch{return [];}}):[];}catch{return [];}
  }
  function automaticVersion() {if(state.magic||!window.KinmoAdvanced)return;try{const entries=readAutomaticVersions(),project=K.copy(state.project);if(entries.some(v=>v.project.id===project.id&&JSON.stringify(v.project)===JSON.stringify(project)))return;entries.unshift({id:K.uid(),time:Date.now(),project});entries.splice(12);while(JSON.stringify(entries).length>1500000&&entries.length>1)entries.pop();if(JSON.stringify(entries).length<=1500000)localStorage.setItem('kinematika.automatic.v1',JSON.stringify(entries));}catch{/* Quota does not block the editing transaction. */}
  }
  function measurementPlot(){const records=state.measurements||[],id=$('#measure-member').value,metric=$('#measure-metric').value,rows=window.KinmoAdvanced.series(records,id,metric);if(!rows.length){$('#measurement-plot').innerHTML='<p>Spustite prehrávanie a potom otvorte meranie.</p>';return;}const min=Math.min(...rows.map(r=>r.value)),max=Math.max(...rows.map(r=>r.value)),duration=rows.at(-1).time||1;$('#measurement-plot').innerHTML=`<svg viewBox="0 0 600 200" class="response-chart" role="img" aria-label="Graf ${metric} podľa času">${rows.map((r,i)=>`<circle data-action="measurement-seek" data-index="${i}" cx="${20+r.time/duration*560}" cy="${170-(r.value-min)/(max-min||1)*140}" r="4" tabindex="0" role="button" aria-label="Čas ${fmt(r.time,2)} s, hodnota ${fmt(r.value,2)}"/>`).join('')}<text x="20" y="195" font-size="12">0–${fmt(duration,2)} s · ${fmt(min,2)} až ${fmt(max,2)}</text></svg>`;}
  function captureMeasurement(delta) {if(!window.KinmoAdvanced||delta<=0)return;const time=state.dynamic?state.dynamic.time:(state.measureTime||0)+delta;if(time<(state.measureTime||0)){state.measurements=[];state.measureRuntime=[];}else if(time===state.measureTime)return;state.measureTime=time;state.measurements ||= [];if(state.measurements.length>=2400)return;state.measurements.push(window.KinmoAdvanced.record(state.measurements.at(-1),state.result,state.measureTime));state.measureRuntime ||= [];state.measureRuntime.push(state.dynamic?K.copy(state.dynamic):null);
  }
  function advancedSubmit(form,data){const A=window.KinmoAdvanced,p=K.copy(state.project);
    if(form.id==='advanced-drives-form'){if(p.kind!=='custom')throw new Error('Pohony upravte vo voľnej kópii.');const ids=new Set(data.getAll('drive'));for(const e of p.elements.filter(e=>!e.primary)){e.drive=ids.has(e.id);if(e.drive)e.driveMode=String(data.get('mode-'+e.id));}p.driveProgram={tracks:p.elements.filter(e=>e.drive).map(e=>({elementId:e.id,from:Number(data.get('from-'+e.id)),to:Number(data.get('to-'+e.id)),delay:Number(data.get('delay-'+e.id)),duration:Number(data.get('duration-'+e.id)),easing:String(data.get('easing-'+e.id))}))};if(!ids.size)p.driveProgram=null;p.simulation.mode='kinematic';p.motionPlan=null;applyProject(p);state.planTime=0;}
    else if(form.id==='advanced-plane-form'){const e=p.elements.find(e=>e.id===state.selected);e.group=String(data.get('group'));e.plane=quantityValue(data,'plane','',-20,20);applyProject(p);}
    else if(form.id==='advanced-contact-form'){const ids=new Set(data.getAll('contact'));for(const j of p.connections.filter(j=>j.type==='cam-contact'))j.contact=ids.has(j.id)?{enabled:true,stiffness:quantityValue(data,'k-'+j.id,'',.01,10000),damping:quantityValue(data,'c-'+j.id,'',0,10000)}:null;p.simulation.softStops=data.has('soft');p.simulation.stopStiffness=quantityValue(data,'stop-k','',.01,10000);p.simulation.stopDamping=quantityValue(data,'stop-c','',0,10000);if(data.has('friction'))I.root(p,p.elements.find(e=>e.id===state.selected)).guideFriction=quantityValue(data,'friction','',0,10000);applyProject(p);}
    else if(form.id==='advanced-variant-form'){const variants=A.compare(p,state.selected,String(data.get('property')),String(data.get('values')).split(';').map(v=>W.parseNumber(v)));state.variantDraft=variants;modal('Výsledky variantov',`<div class="variant-grid">${variants.map((v,i)=>`<section><h3>${fmt(v.value,2)}</h3><svg viewBox="${Object.values(K.bounds(v.project,v.samples)).join(' ')}" class="response-chart">${v.project.elements.map(e=>{const pose=v.samples[0].poses[e.id];return pose?line(pose.a,pose.b,'stroke="var(--secondary)" stroke-width="3" vector-effect="non-scaling-stroke"'):'';}).join('')}</svg><p>Blokované polohy: ${v.blocked}/61 · maximálna osová sila ${fmt(v.peak,2)} N · dráha A: X ${fmt(v.spanX,2)} / Y ${fmt(v.spanY,2)} mm</p><button class="button button-dark" data-action="variant-apply" data-index="${i}">Použiť tento variant</button></section>`).join('')}</div>`,true);return true;}
    else return false;$('#modal').close();return true;
  }
  function renderWorkflowTools() {
    const root = $('#workflow-tools'); if (!root) return;
    root.hidden = !!state.magic;
    const reference = state.project.importReference, imported = reference || state.project.source?.name === 'Magic import';
    const extraTools = `<button data-action="explain-movement">Prečo sa nehýbe?</button><button data-action="cycle-review">Overiť celý cyklus</button><button data-action="dimensions-overview">Prehľad rozmerov</button><button data-action="issue-report">Nahlásiť problém</button><button data-action="debug-mode">Debug režim</button>`;
    const advanced=window.KinmoAdvanced?`<details class="workflow-position-menu"><summary>Ďalšie nástroje</summary><div>${extraTools}${[['hub','Spoločný čap'],['drives','Viac pohonov'],['contacts','Kontakt a dorazy'],['planes','Skupiny / roviny'],['measure','Meranie v čase'],['variants','Varianty'],['revisions','Automatické verzie'],['learn','Príklady']].map(([tab,label])=>`<button data-action="advanced-open" data-tab="${tab}">${label}</button>`).join('')}</div></details>`:'';
    const active=currentElement(),componentTools=active?.type==='cam'?'<button data-action="cam-spin">Otáčať vačku</button><button data-action="surface-contact">Kontaktná plocha</button>':active?.type==='motor'?'<button data-action="cam-spin">Zapnúť motor</button><button data-action="motor-spec">Parametre elektromotora</button>':'';
    const parts=motorParts();
    const modeTools=`<button data-action="detail-level" data-level="${state.detailLevel==='basic'?'advanced':'basic'}">${state.detailLevel==='basic'?'Základné':'Pokročilé'} ovládanie</button>${state.isolatedIds?'<button data-action="isolate-selection">Zobraziť všetko</button>':''}${parts?`<div class="motor-mode-controls"><button data-action="motor-mode" data-mode="mount" aria-pressed="${state.motorMode!=='drive'}">Montáž</button><button data-action="motor-mode" data-mode="drive" aria-pressed="${state.motorMode==='drive'}">Pohon ↻</button><button data-action="motor-preview">Skúsiť otáčanie</button><button data-action="motor-capacity">Overiť motor</button></div>`:''}`;
    const markup = `${modeTools}${advanced}${componentTools}${state.phasePick ? '<button data-action="plan-pick-done">Použiť polohu</button><button data-action="plan-pick-cancel">Zrušiť výber</button>' : ''}${imported ? `<button data-action="reference-toggle" aria-pressed="${!!reference?.visible}"${reference ? '' : ' title="Doplniť pôvodný obrázok staršieho Magic projektu"'}>Predloha</button>${reference ? '<button data-action="reference-settings" aria-label="Nastaviť predlohu">◐</button>' : ''}` : ''}${(state.project.elements.some(K.isElastic)||state.project.connections.some(j=>j.contact?.enabled)) ? `<button data-action="force-motion" aria-pressed="${state.project.simulation?.mode === 'dynamic'}">Pohyb zo síl</button>` : ''}${state.mode==='simulate' ? '<details class="workflow-position-menu"><summary>Poloha simulácie</summary><div><button data-action="simulation-pause">Pozastaviť tu</button><button data-action="simulation-design">Vrátiť do návrhu</button><button data-action="simulation-bake">Poloha → návrh</button></div></details>' : ''}<button data-action="freedom-toggle" aria-pressed="${!!state.showFreedom}">Voľnosť</button><button data-action="trial-toggle" aria-pressed="${!!state.trial}">Skúšobný pohyb</button><button data-action="mechanism-kit">Zostavy</button><button data-action="motion-plan">Fázy pohybu</button>`;
    const layout = `${markup}|${root.hidden}|${state.canvasSize?.width}`;
    if (root._workflowMarkup !== markup) { root.innerHTML = markup + '<button class="mobile-workflow-button" data-action="mobile-workflow" aria-haspopup="dialog">Nástroje</button>'; root._workflowMarkup = markup; }
    // Measuring the toolbar forces a layout, so it happens only when its content changed.
    if (root._workflowLayout === layout) return;
    root._workflowLayout = layout;
    const heading=$('.scene-heading');if(heading){heading.style ||= {};const top=Math.max(34,root.hidden?34:root.getBoundingClientRect().height+12);heading.style.top=`${top}px`;const tools=$('.canvas-tools');if(tools){tools.style ||= {};tools.style.top=`${Math.max(108,top+75)}px`;}}
  }

  function mobileToolsModal(kind = 'app') {
    let title, content;
    if (kind === 'workflow') {
      renderWorkflowTools(); renderModelChecks();
      title = 'Nástroje mechanizmu';
      content = `<section><h3>Pohyb a zostavy</h3>${$('#workflow-tools')._workflowMarkup || ''}</section><section><h3>Kontrola modelu</h3>${$('#model-checks').innerHTML}</section>`;
    } else if (kind === 'selection') {
      const e = currentElement(); title = e?.name || 'Vybraný prvok';
      content = `<section><h3>Výber a pevná zostava</h3><p>${state.selectedElementIds.length} vybraných položiek</p><button data-action="multi-select" aria-pressed="${!!state.multiSelect}">${state.multiSelect?'Ukončiť viacnásobný výber':'Vybrať viac dielov'}</button>${state.mode==='edit'&&I.rigidMembers(state.project,state.selectedElementIds).length>=2?'<button data-action="bind-rigid">Spojiť napevno</button>':''}${e?.rigidAssemblyId?'<button data-action="unbind-rigid">Rozpojiť zostavu</button>':''}<button data-action="isolate-selection">${state.isolatedIds?'Zobraziť všetko':'Izolovať výber'}</button></section><section><h3>Prvok a väzby</h3><button data-action="selection-settings"${e && !e.primary && state.mode === 'edit' ? '' : ' disabled'}>Spojenia a uloženie</button><button data-action="properties-overview"${e ? '' : ' disabled'}>Vlastnosti prvku</button></section>${!$('#manipulation-tools').hidden ? `<section><h3>Geometria</h3>${$('#manipulation-tools').innerHTML}<button data-action="mobile-handles" aria-pressed="${!!state.mobileHandles}">${state.mobileHandles ? 'Skryť' : 'Zobraziť'} úchyty na plátne</button></section>` : ''}`;
    } else {
      title = 'Ponuka pracovného priestoru';
      const controls = [['undo','Späť'],['redo','Znova'],['settings','Vzhľad a nastavenia'],['debug-mode','Debug režim'],['diagnostics','Diagnostika väzieb'],['toggle-inspector','Inšpektor vlastností'],['profileVisible','Pohybový profil'],['timelineVisible','Časová os'],['help','Pomoc']];
      content = `<section><h3>Pracovný priestor</h3>${controls.map(([action,label])=>`<button data-action="${action}"${action === 'undo' && !state.history.length || action === 'redo' && !state.future.length ? ' disabled' : ''}>${label}</button>`).join('')}</section><section><h3>Zobrazenie plátna</h3>${[['grid','Mriežka'],['main-dimensions','Hlavné rozmery'],['dimensions','Kóty'],['ghosts','Krajné polohy'],['trace','Trajektórie'],['labels','Názvy a texty']].map(([action,label])=>`<button data-action="${action}" aria-pressed="${!!state[({grid:'grid','main-dimensions':'mainDimensions',dimensions:'dimensions',ghosts:'ghosts',trace:'trace',labels:'labels'})[action]]}">${label}</button>`).join('')}</section>`;
    }
    modal(title, `<div class="mobile-tools-dialog">${content}</div>`);
  }

  function referenceSVG() {
    const ref = state.project.importReference; if (!ref?.visible || state.magic) return '';
    const frame = ref.frames[ref.active], r = frame.rect;
    return `<g data-editor-overlay="import-reference" pointer-events="none"><image href="${escape(frame.dataURL)}" x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" preserveAspectRatio="none" opacity="${ref.opacity}"/></g>`;
  }

  function referenceSettings() {
    const r = state.project.importReference; if (!r) return;
    modal('Predloha z Magic importu', `<form id="reference-form"><p class="section-description">Obrázok je uložený v projekte a v .kinmo. Predloha nemení geometriu ani väzby.</p><button type="button" class="button button-secondary" data-action="reference-replace">Vymeniť obrázok predlohy</button><button type="button" class="button button-secondary" data-action="reference-calibrate">Kalibrovať podľa známeho rozmeru</button><label class="property-field">Priehľadnosť (%)<input class="text-field" name="opacity" type="number" min="5" max="100" value="${r.opacity * 100}" required/></label><label class="property-field">Poloha<select name="active" class="property-select">${r.frames.map((f, i) => `<option value="${i}"${r.active === i ? ' selected' : ''}>${escape(f.name)}</option>`).join('')}</select></label>${quantityInput('x', 'Ľavý okraj X (mm)', r.frames[r.active].rect.x)}${quantityInput('y', 'Horný okraj Y (mm)', r.frames[r.active].rect.y)}${quantityInput('width', 'Šírka obrázka (mm)', r.frames[r.active].rect.width, 'mm', .1, 10000)}<label class="check-row"><input name="visible" type="checkbox"${r.visible ? ' checked' : ''}/>Zobraziť predlohu</label><div class="modal-actions"><button class="button button-secondary" type="button" data-action="close-modal">Zrušiť</button><button class="button button-dark">Použiť</button></div></form>`);
  }

  async function attachReference(file) {
    if (state.magic || !file || !(state.project.importReference || state.project.source?.name === 'Magic import')) return;
    const projectId = state.project.id, image = await M.loadImage(file);
    try {
      if (state.project.id !== projectId || state.magic) return;
      const old = state.project.importReference?.frames[0]?.rect, scale = state.project.source?.note?.match(/Kalibrácia: ([0-9.]+) mm \/ ([0-9.]+) px/), factor = scale ? Number(scale[1]) / Number(scale[2]) : 500 / image.width;
      state.referenceDraft = { dataURL: image.dataURL, name: image.name, ratio: image.height / image.width, projectId };
      modal('Zarovnať predlohu k existujúcemu modelu', `<form id="reference-attach-form"><p class="section-description">Geometria zostane zachovaná. Nastavte polohu ľavého horného rohu obrázka a jeho šírku v mm podľa pôvodnej kalibrácie. Po vložení môžete doladiť zarovnanie cez nastavenie predlohy.</p>${quantityInput('x', 'Ľavý okraj X (mm)', old?.x ?? 0)}${quantityInput('y', 'Horný okraj Y (mm)', old?.y ?? 0)}${quantityInput('width', 'Šírka obrázka (mm)', old?.width ?? image.width * factor, 'mm', .1, 10000)}<div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zrušiť</button><button class="button button-dark">Pridať predlohu</button></div></form>`);
    } finally { URL.revokeObjectURL(image.url); }
  }

  function freedomSVG(scale) {
    if ((!state.showFreedom && currentElement()?.type !== 'rail') || state.magic) return '';
    const selected = state.project.elements.find((e) => e.id === state.selected); if (!selected) return '';
    const root = I.root(state.project, selected), pose = state.result.poses[root.id]; if (!pose) return '';
    const cache = state.freedomCache, now = Date.now();
    if (!cache || cache.project !== state.project || cache.result !== state.result && now - cache.time > 250) state.freedomCache = { project: state.project, result: state.result, time: now, value: E.freedom(state.project, state.result) };
    const vectors = state.freedomCache.value.directions?.find((d) => d.elementId === root.id)?.vectors || [], center = { x: (pose.a.x + pose.b.x) / 2, y: (pose.a.y + pose.b.y) / 2 }, unit = 36 / scale;
    let arrows = '';
    for (const v of vectors) {
      const norm = Math.hypot(v.x, v.y); if (norm > .001) { const dx = v.x / norm * unit, dy = v.y / norm * unit; arrows += `<path d="M${center.x - dx} ${center.y - dy}L${center.x + dx} ${center.y + dy}m${-dx * .2 - dy * .15} ${-dy * .2 + dx * .15}L${center.x + dx} ${center.y + dy}l${-dx * .2 + dy * .15} ${-dy * .2 - dx * .15}" fill="none" stroke="#16867b" stroke-width="2" vector-effect="non-scaling-stroke"/>`; }
      if (Math.abs(v.angle) > .001) arrows += `<path d="M${center.x - unit} ${center.y}a${unit} ${unit} 0 1 1 ${unit} ${unit}l${unit * .2} ${-unit * .3}m${-unit * .2} ${unit * .3}l${-unit * .3} ${-unit * .15}" fill="none" stroke="#16867b" stroke-width="2" vector-effect="non-scaling-stroke"/>`;
    }
    const rail = root.type==='rail' ? railFreedomSVG(root,pose,scale) : '';
    const message = root.type==='rail' ? (root.movingRail?'Vozík je pevný · vedenie sa posúva':'Vedenie je pevné · vozík sa posúva') : root.drive ? 'Pohyb riadi pohon' : vectors.length ? 'Možný pohyb · väzby môžu spájať smery' : 'Poloha je v tomto bode určená';
    return `<g data-editor-overlay="freedom" pointer-events="none">${rail}${arrows}${!vectors.length && !root.drive ? freedomBlockersSVG(root.id,scale) : ''}<text x="${center.x}" y="${center.y + unit * 1.5}" text-anchor="middle" font-size="${11 / scale}" fill="#16867b" stroke="var(--paper)" stroke-width="${3 / scale}" paint-order="stroke">${message}</text></g>`;
  }

  function toggleTrial() {
    if (state.trial) { const old = state.trial; state.trial = null; state.trialBlock = null; state.mode = old.mode; setMotion(old.motion); updateToolbar(); return; }
    if (!state.project.elements.length) { toast('Najskôr vytvorte mechanizmus.', true); return; }
    if (state.project.kind === 'custom' && (!state.project.elements.some((e) => e.drive) || E.freedom(state.project, state.result).free)) { toast('Skúšobný pohyb potrebuje pohon a určený pohyb ostatných telies. Použite Overiť model.', true); return; }
    const original = { mode: state.mode, motion: state.motion };
    state.playing = false; setMode('simulate'); state.trial = original; state.trialBlock = null; state.tool = 'select'; renderScene(); updateToolbar();
    toast('Potiahnite vozík alebo rameno. Zablokovanie ponechá poslednú funkčnú polohu. Ukončenie obnoví pôvodnú polohu.');
  }

  function trialSVG(scale) {
    const blocked = state.trialBlock; if (!blocked) return '';
    const rows = W.constraints(state.project, blocked).filter((r) => r.status === 'error'), ids = new Set([...blocked.invalid, ...blocked.collisions, ...rows.flatMap((r) => r.elementIds)]);
    const marks = [...ids].map((id) => { const p = state.result.poses[id]; return p ? line(p.a, p.b, `stroke="#c74735" stroke-width="8" opacity=".45" vector-effect="non-scaling-stroke"`) : ''; }).join('');
    const r = state.view;
    return `<g data-editor-overlay="trial" pointer-events="none">${marks}<text x="${r.x + 20 / scale}" y="${r.y + r.height - 95 / scale}" font-size="${12 / scale}" fill="#c74735">${escape(blocked.issues[0] || 'Pohyb blokujú väzby alebo dorazy')} · posledná funkčná poloha</text></g>`;
  }

  function kitModal() {
    modal('Pripravená mechanická zostava', `<form id="kit-form"><label class="property-field">Zostava<select name="type" class="property-select"><option value="rail">Vozík s vedením a doskou</option><option value="link">Rameno s pevným čapom</option><option value="slot">Čap v kulise s ramenom</option><option value="panel">Sklápacie čelo s čapom</option><option value="piston">Piest medzi dvoma montážnymi čapmi</option><option value="spring-arm">Pružina na ramene</option></select></label>${quantityInput('length', 'Dĺžka (mm)', 120, 'mm', 5, 1000)}${quantityInput('width', 'Šírka / vozík (mm)', 25, 'mm', 5, 1000)}<label class="check-row"><input name="drive" type="checkbox"${state.project.elements.some((e) => e.drive) ? ' disabled' : ''}/>Priradiť zostave pohon (kulisa ostáva pasívna)</label><p class="section-description">Zostava obsahuje skutočné väzby a označené montážne body. Vonkajšie pripojenia doplňte na plátne. Vloženie možno vrátiť jedným Späť.</p><div class="modal-actions"><button class="button button-secondary" type="button" data-action="close-modal">Zrušiť</button><button class="button button-dark">Vložiť do stredu pohľadu</button></div></form>`);
  }

  function motionPlanModal() {
    if (state.project.kind === 'custom' && !state.project.elements.some((e) => e.drive)) { toast('Najskôr priraďte pohon. Fázy určujú postupnosť jeho polôh.', true); return; }
    const range = K.driveRange(state.project);
    if (!state.pendingPlanDraft) state.planOptions = { min: range.min, max: range.max, enabled: true };
    const phases = state.pendingPlanDraft || state.project.motionPlan?.phases || [{ name: 'Pohyb', from: range.min, to: range.max, duration: state.cycle || 6, easing: 'smooth' }];
    state.planDraft = K.copy(phases); state.pendingPlanDraft = null;
    modal('Fázy pohybu a dorazy', `<form id="motion-plan-form"><p class="section-description">Fázy riadia jeden existujúci pohon (${range.unit}). Koniec nadväzuje na ďalší začiatok; mechanické väzby určujú pohyb ostatných častí.</p><div id="plan-rows"></div><button type="button" class="button button-secondary" data-action="plan-add">Pridať fázu</button>${quantityInput('min', `Dolný doraz (${range.unit})`, state.planOptions.min, range.unit, range.unit === 'mm' ? 0 : -360, 5000)}${quantityInput('max', `Horný doraz (${range.unit})`, state.planOptions.max, range.unit, .01, 5000)}<label class="check-row"><input name="enabled" type="checkbox"${state.planOptions.enabled ? ' checked' : ''}/>Prehrávať postupnosť fáz</label><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zrušiť</button><button class="button button-dark">Uložiť fázy</button></div></form>`, true);
    renderPlanRows();
  }

  function renderPlanRows() {
    const root = $('#plan-rows'); if (!root) return;
    root.innerHTML = state.planDraft.map((p, i) => `<fieldset class="plan-row"><legend>Fáza ${i + 1}</legend><label>Názov<input name="name-${i}" class="text-field" value="${escape(p.name)}" maxlength="60" required/></label><label>Od<input name="from-${i}" class="text-field" type="number" step="any" value="${p.from}" required/></label><label>Do<input name="to-${i}" class="text-field" type="number" step="any" value="${p.to}" required/></label><label>Čas (s)<input name="duration-${i}" class="text-field" type="number" min=".1" max="120" step="any" value="${p.duration}" required/></label><label>Priebeh<select name="easing-${i}" class="property-select"><option value="linear"${p.easing === 'linear' ? ' selected' : ''}>Lineárny</option><option value="smooth"${p.easing === 'smooth' ? ' selected' : ''}>Plynulý</option></select></label><div><button type="button" class="button button-secondary" data-action="plan-capture" data-index="${i}" data-end="from">Od = aktuálna poloha</button><button type="button" class="button button-secondary" data-action="plan-capture" data-index="${i}" data-end="to">Do = aktuálna poloha</button><button type="button" class="button button-secondary" data-action="plan-pick" data-index="${i}" data-end="to">Koniec vybrať na plátne</button><button type="button" class="button button-secondary" data-action="plan-remove" data-index="${i}">Odstrániť fázu</button></div></fieldset>`).join('');
  }

  function readPlanDraft() {
    const data = new FormData($('#motion-plan-form'));
    state.planOptions = { min: String(data.get('min')), max: String(data.get('max')), enabled: data.has('enabled') };
    state.planDraft = state.planDraft.map((p, i) => ({ name: String(data.get(`name-${i}`)), from: Number(data.get(`from-${i}`)), to: Number(data.get(`to-${i}`)), duration: Number(data.get(`duration-${i}`)), easing: String(data.get(`easing-${i}`)) }));
  }

  function reviewImpact(next, message, keys = null, title = 'Dôsledky úpravy') {
    const impact = WF.impact(state.project, next, state.result);
    state.pendingImpact = { before: JSON.stringify(state.project), next, message, keys, result: K.copy(state.result) };
    const list = (items) => items.length ? `<ul>${items.map((v) => `<li>${escape(v.name || v.id)}</li>`).join('')}</ul>` : '<p>Žiadne</p>';
    modal(title, `<form id="impact-form"><p class="section-description">Model sa zmení až po potvrdení. Celú operáciu možno vrátiť jedným Späť.</p><div class="impact-grid"><section><h3>Odstránené prvky · ${impact.elements.length}</h3>${list(impact.elements)}<h3>Zmenené uloženie / prvky · ${impact.changed.length}</h3>${list(impact.changed)}</section><section><h3>Dotknuté väzby · ${impact.joints.length}</h3>${list(impact.joints)}<p>Odstránené kóty: ${impact.dimensions.length} · trajektórie: ${impact.trajectories.length}</p>${state.project.motionPlan && !next.motionPlan ? '<p class="analysis-warning">Odstránia sa fázy závislé od pôvodného pohonu.</p>' : ''}${impact.driverLost ? '<p class="analysis-warning">Odstráni sa aj priradený pohon.</p>' : ''}</section></div><label class="check-row"><input name="keep-pose" type="checkbox" checked/>Zachovať zobrazenú polohu ako východisko zostávajúcich telies</label><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zrušiť</button><button class="button button-dark">Potvrdiť úpravu</button></div></form>`, true);
    $('#modal').querySelector?.('#impact-form .button-dark')?.focus({ preventScroll: true });
  }

  async function addMagicPose(file) {
    const magic = state.magic; if (!magic || !magic.image || magic.busy) return;
    if ((magic.poses || []).length >= 3) throw new Error('Použite najviac štyri polohy vrátane prvého obrázka.');
    magic.busy = true; renderMagicImport();
    try { const image = await M.loadImage(file); if (state.magic !== magic) { URL.revokeObjectURL(image.url); return; } magic.poses ||= []; magic.poses.push({ image, alignment: null, candidates: [] }); magic.poseIndex = magic.poses.length - 1; magic.detectNote = 'Nová poloha potrebuje zarovnanie podľa rovnakého pevného úseku.'; }
    finally { if (state.magic === magic) { magic.busy = false; renderMagicImport(); } }
    magicPoseAlignment();
  }

  function magicPoseAlignment() {
    const magic = state.magic, frame = magic?.poses?.[magic.poseIndex || 0]; if (!frame || !magic.scale) { toast('Najskôr nastavte mierku prvého obrázka.', true); return; }
    const f = frame.image, b = magic.image, a = frame.alignment?.a || { x: magic.scale.a.x * f.width / b.width, y: magic.scale.a.y * f.height / b.height }, end = frame.alignment?.b || { x: magic.scale.b.x * f.width / b.width, y: magic.scale.b.y * f.height / b.height };
    modal('Zarovnať ďalšiu polohu', `<form id="pose-alignment-form"><p class="section-description">Na ďalšom obrázku vyberte rovnaké body A a B pevného úseku použitého pri kalibrácii. Kliknutia na obrázok postupne doplnia A/B. Ak je kalibračný úsek pohyblivý, viacpolohové porovnanie nebude platné.</p><img class="pose-alignment-image" src="${escape(f.url)}" data-action="pose-pick" data-width="${f.width}" data-height="${f.height}" alt="${escape(f.name)}"/><div class="plan-row">${[['ax', a.x], ['ay', a.y], ['bx', end.x], ['by', end.y]].map(([name, value]) => `<label>${name.toUpperCase()} (px)<input name="${name}" class="text-field" type="number" min="0" step="any" max="${name.endsWith('x') ? f.width : f.height}" value="${value}" required/></label>`).join('')}</div><div class="modal-actions"><button class="button button-secondary" type="button" data-action="close-modal">Zrušiť</button><button class="button button-dark">Potvrdiť pevný úsek</button></div></form>`, true);
    magic.posePick = 0;
  }

  function pushDetectionHistory() {
    const magic = state.magic; magic.detectHistory ||= []; magic.detectFuture = []; magic.detectHistory.push(K.copy(magic.detectCandidates || [])); if (magic.detectHistory.length > 40) magic.detectHistory.shift();
  }

  function undoDetection(redo = false) {
    const m = state.magic; if (!m || m.step !== 2.5) return;
    const list = redo ? m.detectFuture : m.detectHistory; if (!list?.length) return;
    (redo ? (m.detectHistory ||= []) : (m.detectFuture ||= [])).push(K.copy(m.detectCandidates || [])); m.detectCandidates = list.pop(); m.error = ''; renderMagicImport(); renderScene();
  }

  function editDetection(el) {
    const m = state.magic; if (!m || m.busy || m.detectAdded?.some((id) => state.project.elements.some((e) => e.id === id))) return;
    m.detectEditId = el.dataset.id; m.tool = el.dataset.tool || 'detect-edit'; m.drawing = []; renderMagicImport(); renderScene();
  }

  function commitDetectionOutline() {
    const m = state.magic; if (!m || m.drawing.length < 3) throw new Error('Obrys potrebuje aspoň tri body.');
    if ((m.detectCandidates || []).length >= 60) throw new Error('Najviac 60 návrhov. Odstráňte nepotrebné návrhy.');
    const c = WF.candidate(m.drawing, 'panel'); pushDetectionHistory(); m.detectCandidates.push(c); m.detectEditId = c.id; m.tool = 'detect-edit'; m.drawing = []; renderMagicImport(); renderScene();
  }

  function detectionEditSVG(scale) {
    const m = state.magic; if (!m || m.step !== 2.5 || !m.scale) return '';
    const c = m.detectCandidates?.find((v) => v.id === m.detectEditId), handles = [];
    if (c && m.tool === 'detect-edit') for (const kind of ['points', 'outline', 'anchors']) (c[kind] || []).forEach((p, i) => { const at = M.worldFromPixel(p, m.scale); handles.push(`<circle data-detect-handle="${kind}" data-index="${i}" data-id="${escape(c.id)}" cx="${at.x}" cy="${at.y}" r="${5 / scale}" fill="${kind === 'anchors' ? '#16867b' : '#fff'}" stroke="#a64422" stroke-width="2" vector-effect="non-scaling-stroke"/>`); });
    const path = m.drawing?.length ? `<polyline points="${m.drawing.map((p) => { const at = M.worldFromPixel(p, m.scale); return `${at.x},${at.y}`; }).join(' ')}" fill="none" stroke="#16867b" stroke-width="2" vector-effect="non-scaling-stroke"/>` : '';
    return `<g data-editor-overlay="detection-edit">${path}${handles.join('')}</g>`;
  }

  function workflowSubmit(form, data) {
    if(form.id==='magic-detection-review-form'){commitDetectedReview(data);}
    else if(form.id==='reference-calibration-form'){if(state.referenceCalibration?.revision!==JSON.stringify(state.project))throw new Error('Projekt sa zmenil. Kalibráciu otvorte znova.');applyProject(WF.calibrateReference(state.project,{x:quantityValue(data,'ax'),y:quantityValue(data,'ay')},{x:quantityValue(data,'bx'),y:quantityValue(data,'by')},quantityValue(data,'distance','mm',.1,5000),data.has('model')));fitView();renderScene();}
    else if(form.id==='elastic-response-form'){elasticResponseModal({mass:quantityValue(data,'mass','',.001,1000),damping:quantityValue(data,'damping','',0,100000),load:quantityValue(data,'load','',0,1000000)});return true;}
    else if (form.id === 'reference-attach-form') { const draft = state.referenceDraft; if (!draft || draft.projectId !== state.project.id) throw new Error('Projekt sa zmenil. Vyberte obrázok znova.'); const p = K.copy(state.project), width = quantityValue(data, 'width', 'mm', .1, 10000); p.importReference = { kind: 'magic', visible: true, opacity: .35, active: 0, frames: [{ name: draft.name, dataURL: draft.dataURL, rect: { x: quantityValue(data, 'x'), y: quantityValue(data, 'y'), width, height: width * draft.ratio } }] }; applyProject(p); state.referenceDraft = null; fitView(); renderScene(); }
    else if (form.id === 'reference-form') { const p = K.copy(state.project); p.importReference.opacity = Number(data.get('opacity')) / 100; p.importReference.active = Number(data.get('active')); p.importReference.visible = data.has('visible'); const frame = p.importReference.frames[p.importReference.active], ratio = frame.rect.height / frame.rect.width; if (data.has('x')) frame.rect.x = quantityValue(data, 'x'); if (data.has('y')) frame.rect.y = quantityValue(data, 'y'); if (data.has('width')) { frame.rect.width = quantityValue(data, 'width', 'mm', .1, 10000); frame.rect.height = frame.rect.width * ratio; } applyProject(p); }
    else if (form.id === 'kit-form') { if (state.project.kind !== 'custom') throw new Error('Zostavy vkladajte do vlastného projektu alebo voľnej kópie.'); const at = { x: state.view.x + state.view.width / 2, y: state.view.y + state.view.height / 2 }, next = WF.insertKit(state.project, String(data.get('type')), at, W.parseNumber(String(data.get('length'))), W.parseNumber(String(data.get('width'))), data.has('drive')); editCanvas(next.project, 'Zostava bola vložená. Pripojte označené montážne body.', next.added.map(I.elementKey)); }
    else if (form.id === 'motion-plan-form') { const p = K.copy(state.project), range = K.driveRange(p); readPlanDraft(); if (range.unit === 'mm') { p.parameters.travelMin = W.parseNumber(String(data.get('min'))); p.parameters.travelMax = W.parseNumber(String(data.get('max'))); } else { p.parameters.rotationMin = W.parseNumber(String(data.get('min')), '°'); p.parameters.rotationMax = W.parseNumber(String(data.get('max')), '°'); } p.motionPlan = data.has('enabled') && state.planDraft.length ? { unit: range.unit, phases: state.planDraft } : null; applyProject(p); state.planTime = 0; }
    else if (form.id === 'pose-alignment-form') { const m = state.magic, frame = m?.poses[m.poseIndex || 0]; if (!frame) throw new Error('Poloha už nie je dostupná.'); const alignment = { a: { x: Number(data.get('ax')), y: Number(data.get('ay')) }, b: { x: Number(data.get('bx')), y: Number(data.get('by')) } }; if ([alignment.a, alignment.b].some((p) => p.x < 0 || p.y < 0 || p.x > frame.image.width || p.y > frame.image.height)) throw new Error('Body musia ležať na obrázku.'); WF.frameTransform(m.scale, alignment); frame.alignment = alignment; m.detectNote = 'Poloha zarovnaná. Spustite rozpoznanie znova pre porovnanie.'; renderMagicImport(); }
    else if (form.id === 'impact-form') { const pending = state.pendingImpact; if (!pending || pending.before !== JSON.stringify(state.project)) throw new Error('Model sa zmenil. Náhľad vytvorte znova.'); const next = data.has('keep-pose') ? WF.keepPose(pending.next, pending.result, { design: true }) : pending.next; editCanvas(next, pending.message, pending.keys); state.pendingImpact = null; }
    else return false;
    $('#modal').close(); return true;
  }
