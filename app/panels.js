/* Kinematika UI · Pracovný priestor, strom modelu a inšpektor vlastností.
   Klasický skript bez IIFE: zdieľa najvyššiu úroveň s ostatnými app/*.js a app.js, ktorý sa načíta posledný
   a definuje stav a konštanty. Súbor obsahuje iba deklarácie funkcií, pri načítaní nič nespúšťa. */
'use strict';
  function buildShell() {
    $('#app').innerHTML = `
      <header class="app-header">
        <div class="brand"><span class="brand-mark">${icon('mechanism', 27)}</span><span>kinematika<span class="brand-dot">.</span></span><span class="brand-studio">STUDIO</span></div>
        <div class="header-divider"></div>
        <button class="project-name" data-action="projects" title="Mechanizmy, šablóny a projekty" aria-haspopup="dialog"><span id="project-name">${escape(state.project.name)}</span>${icon('chevron', 14)}</button>
        <span class="save-status" id="save-status"><i></i>Lokálny projekt</span>
        <div class="header-actions">
          ${ib('search', 'command-palette', 'Paleta príkazov (Ctrl+K)')}${ib('help', 'help', 'Pomoc a klávesové skratky')}
          <button class="button button-secondary save-button" data-action="save">${icon('save', 16)}<span>Uložiť</span></button>
          <button class="button button-dark" data-action="export">${icon('export', 16)}<span>Exportovať</span>${icon('chevron', 13)}</button>
        </div>
      </header>
      <nav class="context-bar" aria-label="Nástroje pracovného priestoru">
        <div class="workspace-tabs">
          <button class="workspace-tab is-active" data-action="view-editor" aria-pressed="true">${icon('cursor', 16)}Editor</button>
          <button class="workspace-tab" data-action="view-analysis" aria-pressed="false">${icon('chart', 16)}Analýza</button>
        </div>
        <div class="context-right">
          <div class="history-controls">${ib('undo', 'undo', 'Späť (Ctrl+Z)')}${ib('redo', 'redo', 'Znova (Ctrl+Shift+Z)')}</div>
          <span class="units-tag">mm <span>/</span> °</span>
          ${ib('settings', 'settings', 'Nastavenia, vzhľad a export')}
          ${ib('warning', 'diagnostics', 'Diagnostika konkrétnych väzieb', false, 'aria-controls="diagnostics-panel" aria-expanded="false"')}
          <div class="panel-toggles" aria-label="Voliteľné panely">${ib('chart', 'profileVisible', 'Zobraziť pohybový profil', state.profileVisible, 'aria-controls="motion-profile-panel" aria-expanded="false" aria-pressed="false"')}${ib('play', 'timelineVisible', 'Zobraziť prehrávanie časovej osi', state.timelineVisible, 'aria-controls="playback-panel" aria-expanded="false" aria-pressed="false"')}</div>
          ${ib('panel', 'toggle-inspector', 'Zobraziť vlastnosti', false, 'aria-controls="properties-panel" aria-expanded="false"')}
          ${ib('menu', 'toggle-sidebar', 'Zobraziť prvky')}<button class="mobile-menu-button" data-action="mobile-tools" aria-haspopup="dialog">${icon('menu',18)}Ponuka</button>
        </div>
      </nav>
      <section id="magic-wizard" class="magic-wizard" aria-labelledby="magic-title" hidden></section>
      <main class="workspace inspector-hidden" id="workspace">
        <aside class="sidebar" aria-label="Prvky mechanizmu">
          <div class="sidebar-heading"><span>Pracovný priestor</span><span class="small-tag">2D</span></div>
          <div class="segmented sidebar-tabs"><button data-action="sidebar-elements" class="is-active">Prvky</button><button data-action="sidebar-joints">Väzby <span id="joint-count">5</span></button></div>
          <div class="sidebar-scroll">
            <div id="palette">
              <div class="section-label">KNIŽNICA PRVKOV <span>DRAG & DROP</span></div>
              <div class="component-palette">${K.TYPES.map((type) => `
                <button class="component-card" draggable="true" data-component="${type}" title="Pretiahnite na plátno alebo kliknite na pridanie">
                  <span class="component-symbol ${type}">${icon(typeIcons[type], 23)}</span>
                  <span class="component-name">${escape(typeNames[type])}<small>${({ motor:'Výkon · napätie · otáčky', ground: 'Pevné uloženie', rail: 'Posuvná väzba', link: 'Tuhý člen', slot: 'Riadená dráha', cam: 'Harmonická / pretiahnutá', bearing: 'Otočný bod', node: 'Samostatný XY bod', panel: 'Posuv + rotácia', 'spring-compression': 'Sila pri stlačení', 'spring-extension': 'Sila pri natiahnutí', 'piston-push': 'Rozpínajúca vzpera', 'piston-pull': 'Sťahujúca vzpera' })[type]}</small></span>
                  <span class="component-add">${icon('plus', 13)}</span>
                </button>`).join('')}</div>
              <div class="sidebar-rule"></div>
            </div>
            <div class="tree-heading"><span class="section-label">ŠTRUKTÚRA MODELU</span><span id="element-count" class="count-pill">6</span></div>
            <div id="model-tree"></div>
            <div id="joint-list" hidden></div>
            <button class="add-element-button" data-action="add-menu">${icon('plus', 15)}Pridať prvok</button>
          </div>
        </aside>
        <section class="center-workspace">
          <div class="stage-header"><div class="segmented mode-switch" aria-label="Režim mechanizmu"><button data-action="mode-edit">Úprava geometrie</button><button data-action="mode-simulate">Simulácia</button></div><button class="subtle-button editable-copy" data-action="make-editable" title="Zachovať originál a vytvoriť voľnú editačnú kópiu">${icon('copy', 14)}<span>Voľná kópia</span></button><div class="stage-toggles" aria-label="Viditeľnosť plátna">${ib('grid', 'grid', 'Zobraziť mriežku', state.grid, 'aria-pressed="true"')}<button class="main-dimensions-toggle" data-action="main-dimensions" aria-pressed="false">Hlavné rozmery</button>${ib('ruler', 'dimensions', 'Zobraziť rozmery', state.dimensions, 'aria-pressed="true"')}${ib('layers', 'ghosts', 'Zobraziť krajné polohy', state.ghosts, 'aria-pressed="true"')}${ib('trace', 'trace', 'Zobraziť trajektóriu', state.trace, 'aria-pressed="true"')}${ib('text', 'labels', 'Skryť texty, názvy a uhly schémy', state.labels, 'aria-pressed="true"')}</div></div>
          <div class="canvas-area" id="canvas-area">
            <div class="scene-heading"><span class="eyebrow">KINEMATICKÝ MODEL</span><h1 id="scene-name">${escape(state.project.name)}</h1><p>Bočný pohľad <span>·</span> Rovinný mechanizmus</p><button id="project-assumptions" class="estimate-chip" data-action="project-info" hidden>${icon('info', 12)}Odhadové rozmery · predpoklady</button></div>
            <div class="scene-status" id="scene-status">${icon('check', 13)}<span>Pohyb bez kolízií</span></div>
            <div id="workflow-tools" class="workflow-tools"></div><div class="canvas-tools" aria-label="Nástroje plátna">${ib('cursor', 'tool-select', 'Výber a pohyb (V)', true)}${ib('hand', 'tool-pan', 'Posúvanie plátna (H)')}${ib('link', 'tool-connect', 'Spojiť uzlové body (J)')}${ib('ruler', 'tool-measure', 'Zmerať vzdialenosť (M)')}<span class="tool-divider"></span>${ib('free', 'grid-snap', 'Sieť 5 mm. Vypnúť pre voľný pohyb; inteligentné prichytávanie je samostatné.', state.snap, `aria-pressed="${state.snap}"`)}<button class="icon-button${state.angleSnap ? ' is-active' : ''}" data-action="angle-snap" title="Uhlové kroky 10°" aria-label="Zapnúť alebo vypnúť uhlové kroky 10°" aria-pressed="${!!state.angleSnap}"><span class="angle-snap-label" aria-hidden="true">10°</span></button>${ib('target', 'smart-snap', 'Inteligentné prichytávanie: vypnuté. Zapnúť na vyžiadanie.', false, 'aria-pressed="false"')}${ib('fit', 'fit', 'Prispôsobiť pohľad (Shift+F)')}</div>
            <svg id="mechanism-canvas" xmlns="${svgNS}" role="group" aria-label="Interaktívny 2D model. Kliknite na bod alebo člen; Shift pridáva do výberu; Ctrl prepína prekryté entity, pravé tlačidlo otvorí úpravy." tabindex="0"></svg>
            <div class="drop-hint" id="drop-hint">${icon('plus', 27)}<span>Pustite prvok na pracovnú plochu</span></div>
            <div class="axis-widget"><svg width="34" height="35" viewBox="0 0 34 35" aria-hidden="true"><path d="M9 5v23M9 5h22" fill="none" stroke="#b2bcc5" stroke-width="1.5"/><path d="m6 24 3 4 3-4m15-22 4 3-4 3" fill="none" stroke="#b2bcc5" stroke-width="1.5"/><text x="1" y="25" fill="#718291" font-size="8">Y</text><text x="26" y="18" fill="#718291" font-size="8">X</text></svg><span>XY <i>·</i> mm</span></div>
            <div class="phase-switcher" id="phase-switcher"></div>
            <div class="zoom-control">${ib('minus', 'zoom-out', 'Oddialiť')}<span id="zoom-value">100%</span>${ib('plus', 'zoom-in', 'Priblížiť')}<span class="zoom-divider"></span>${ib('expand', 'fit', 'Zobraziť celý mechanizmus')}</div>
            <div class="canvas-instruction" id="canvas-instruction" hidden></div>
            <div id="snap-choices" class="snap-choices" role="group" aria-label="Vybrať spojenie prichytených bodov" hidden></div>
            <div id="placement-tools" class="placement-tools" aria-live="polite" hidden></div>
            <div id="binding-tools" class="binding-tools" aria-label="Spojenie, uloženie a pohon výberu" hidden></div>
            <div class="selection-dock">
              <div class="manipulation-tools" id="manipulation-tools" aria-label="Priame úpravy vybraných členov" hidden></div>
              <div class="selection-summary" id="selection-summary" aria-live="polite" hidden></div>
              <div id="model-checks" class="model-checks" aria-label="Kontrola modelu" hidden></div>
            </div>
          </div>
          <section class="analysis-dashboard" id="analysis-workspace" aria-label="Analýza celého rozsahu pohybu" hidden></section>
          <section class="diagnostics-panel" id="diagnostics-panel" aria-label="Diagnostika väzieb" hidden></section>
          <section class="analysis-panel" id="motion-profile-panel" aria-label="Pohybový profil" hidden>
            <div class="analysis-header"><div class="analysis-title">${icon('chart', 17)}<h2>Pohybový profil</h2><span class="live-tag">LIVE</span><select id="graph-mode" aria-label="Zobrazený graf"><option value="angle">Uhly</option><option value="force">Sila / moment pohonu</option></select></div><div class="graph-legend"><span class="legend-line"></span><span id="graph-legend">Uhol čela</span><button class="trace-chip" data-action="trace-pick">${icon('trace', 14)}<span id="trace-name">Bod C</span>${icon('chevron', 12)}</button></div></div>
            <div class="graph-area"><span class="graph-unit" id="graph-unit">Uhol (°)</span><svg id="motion-graph" viewBox="0 0 800 94" preserveAspectRatio="none" role="img" aria-label="Graf závislosti uhla čela od posuvu výsuvu"></svg><span class="graph-x-label" id="graph-x-label">Posuv (mm)</span><div class="graph-tooltip" id="graph-tooltip" hidden></div></div>
          </section>
          <section class="playback-panel" id="playback-panel" aria-label="Prehrávanie časovej osi" hidden>
            <div class="simulation-bar">
              <div class="play-controls">${ib('reset', 'reset', 'Vrátiť do zatvorenej polohy')}<button class="play-button" data-action="play" aria-label="Spustiť simuláciu" title="Spustiť simuláciu (medzerník)">${icon('play', 17)}</button>${ib('loop', 'loop', 'Opakovať otváranie a zatváranie', true, 'aria-pressed="true"')}</div>
              <div class="motion-control"><div class="motion-label"><label for="motion-range" id="motion-label">Posuv výsuvu</label><span id="motion-total">0 – 300 mm</span></div><input id="motion-range" aria-label="Posuv výsuvu" type="range" min="0" max="300" step="0.1" value="150" /><div class="range-labels"><span id="range-min">Zatvorené</span><span id="range-max">Otvorené</span></div></div>
              <div class="motion-readout"><input id="motion-value" type="number" min="0" max="300" step="0.1" value="150" aria-label="Presná poloha pohonu" /><span id="motion-unit">mm</span></div>
              <div class="speed-control"><label for="speed">Rýchlosť</label><select id="speed" aria-label="Rýchlosť simulácie"><option value="0.25">0,25×</option><option value="0.5">0,5×</option><option value="1" selected>1×</option><option value="1.5">1,5×</option><option value="2">2×</option></select></div>
            </div><div class="dynamics-readout" id="dynamics-readout" hidden></div>
          </section>
        </section>
        <aside class="inspector" id="properties-panel" aria-label="Inšpektor vlastností" hidden><div class="inspector-top"><div>${icon('settings', 16)}<span>Vlastnosti</span></div>${ib('close', 'close-inspector', 'Zavrieť vlastnosti')}</div><div id="inspector-content"></div></aside>
      </main>
      <footer class="status-bar"><div><span class="ready-dot" id="solver-dot"></span><span id="solver-status">Solver pripravený</span><span class="status-separator"></span><span id="solver-meta">1 stupeň voľnosti</span></div><div class="status-right"><span id="pointer-coordinates">X: 0,0 <span>Y: 0,0</span></span><span class="status-separator"></span><span>Pozícia v mm</span><span class="version">v${escape(globalThis.KinmoBuild?.version || '2.1.0')}</span></div></footer>
    `;
  }

  function renderTree() {
    const p = state.project;
    $('#element-count').textContent = p.elements.length;
    $('#joint-count').textContent = p.connections.length;
    $('#model-tree').innerHTML = p.elements.length ? assemblyTreeHTML() : '<div class="empty-tree">Váš mechanizmus začína tu.<br>Pridajte prvok z knižnice.</div>';
    /* Physical members remain individually selectable inside an assembly. */
    $('#joint-list').innerHTML = p.connections.length ? p.connections.map((j, i) => {
      const a = p.elements.find((e) => e.id === j.a.elementId), b = p.elements.find((e) => e.id === j.b.elementId);
      return `<div class="joint-list-item" data-context-key="${escape(I.jointKey(j.id))}"><span class="joint-number">${String(i + 1).padStart(2, '0')}</span><div><button class="joint-edit" data-action="edit-joint" data-id="${escape(j.id)}"><strong>${escape(j.name)}</strong></button><small>${escape(a?.name)} ↔ ${escape(b?.name)}</small><small>${j.rigidAssemblyId?'Drží pevná zostava · po rozpojení sa obnoví':escape(E.constraintNames[j.type || 'revolute'])}</small></div>${!j.builtin ? ib('trash', 'delete-joint', 'Odstrániť väzbu', false, `data-id="${escape(j.id)}"`) : `<span class="joint-builtin">${icon('lock', 12)}</span>`}</div>`;
    }).join('') : '<div class="empty-tree">Zvoľte nástroj Spojiť (J)<br>a kliknite na dva uzly.</div>';
    $('#palette').hidden = state.sidebarTab !== 'elements' || !!state.magic && state.magic.step !== 4;
    $('#model-tree').hidden = state.sidebarTab !== 'elements';
    $('#joint-list').hidden = state.sidebarTab !== 'joints';
    $('.tree-heading .section-label').textContent = state.sidebarTab === 'joints' ? 'KINEMATICKÉ VÄZBY' : 'ŠTRUKTÚRA MODELU';
    $('#element-count').textContent = state.sidebarTab === 'joints' ? p.connections.length : p.elements.length;
    $('.add-element-button').innerHTML = `${icon(state.sidebarTab === 'joints' ? 'link' : 'plus', 15)}${state.sidebarTab === 'joints' ? 'Spojiť dva uzly' : 'Pridať prvok'}`;
    $('[data-action="sidebar-elements"]').classList.toggle('is-active', state.sidebarTab === 'elements');
    $('[data-action="sidebar-joints"]').classList.toggle('is-active', state.sidebarTab === 'joints');
  }
  function treeMemberHTML(e) {
    return `
      <div data-context-key="${escape(['node', 'bearing'].includes(e.type) ? I.nodeKey({ elementId: e.id, point: 'a' }) : I.elementKey(e.id))}" class="tree-row${memberSelected(e.id) ? ' is-selected' : ''}${!e.visible ? ' is-hidden' : ''}">
        <button class="tree-select" data-action="select" data-id="${escape(e.id)}"><span class="tree-symbol ${e.type}">${icon(e.role==='motor-housing'?'motor':typeIcons[e.type], 16)}</span><span>${escape(e.name)}${e.group?` · ${escape(e.group)}`:''}${e.plane?` · rovina ${e.plane}`:''}</span></button>
        <button class="tree-eye" data-action="visibility" data-id="${escape(e.id)}" title="${e.visible ? 'Skryť' : 'Zobraziť'} prvok" aria-label="${e.visible ? 'Skryť' : 'Zobraziť'} ${escape(e.name)}">${icon(e.visible ? 'eye' : 'eyeOff', 13)}</button>
        ${e.locked ? `<span class="tree-lock" title="Pevné uloženie alebo riadený prvok">${icon('lock', 11)}</span>` : '<span class="tree-lock"></span>'}
      </div>`;
  }
  function assemblyTreeHTML() {
    const p=state.project,used=new Set();state.expandedAssemblies||={};
    const motorItem=h=>{const m=p.elements.find(e=>e.type==='motor'&&e.parentId===h.id);if(!m)return treeMemberHTML(h);used.add(m.id);used.add(h.id);const key='motor:'+h.id,open=!!state.expandedAssemblies[key];return `<div class="assembly-tree"><div class="assembly-tree-heading"><button data-action="toggle-tree-group" data-id="${escape(key)}" aria-expanded="${open}" aria-label="Rozbaliť motor">${icon(open?'minus':'plus',13)}</button><button data-action="select-motor-assembly" data-id="${escape(m.id)}">${icon('motor',16)}${escape(m.name)}</button><button data-action="copy-motor-assembly" data-id="${escape(m.id)}" aria-label="Kopírovať celý motor">${icon('copy',13)}</button><button data-action="delete-motor-assembly" data-id="${escape(m.id)}" aria-label="Odstrániť celý motor">${icon('trash',13)}</button></div>${open?`<div class="assembly-tree-members">${treeMemberHTML(h)}${treeMemberHTML(m)}</div>`:''}</div>`;};
    const item=e=>e.role==='motor-housing'?motorItem(e):treeMemberHTML(e);
    return p.elements.map(e=>{
      if(used.has(e.id))return '';
      if(e.type==='motor'&&p.elements.some(h=>h.id===e.parentId&&h.role==='motor-housing'))return '';
      if(e.rigidOriginal)return '';
      if(e.rigidAssemblyId){const family=W.descendants(p,p.elements.filter(v=>v.rigidAssemblyId===e.rigidAssemblyId).map(v=>v.id)),members=p.elements.filter(v=>family.has(v.id)),key='rigid:'+e.rigidAssemblyId,open=!!state.expandedAssemblies[key];members.forEach(v=>used.add(v.id));return `<div class="assembly-tree"><div class="assembly-tree-heading"><button data-action="toggle-tree-group" data-id="${escape(key)}" aria-expanded="${open}" aria-label="Rozbaliť pevnú zostavu">${icon(open?'minus':'plus',13)}</button><button data-action="select-rigid-assembly" data-id="${escape(e.id)}">${icon('lock',16)}${escape(e.rigidAssemblyName)}</button><button data-action="unbind-rigid" data-id="${escape(e.id)}" aria-label="Rozpojiť pevnú zostavu">${icon('unlock',14)}</button></div>${open?`<div class="assembly-tree-members">${members.filter(v=>!(v.type==='motor'&&p.elements.some(h=>h.id===v.parentId&&h.role==='motor-housing'))).map(item).join('')}</div>`:''}</div>`;}
      return item(e);
    }).join('');
  }
  function motorParts(id = state.selected) {
    const e=state.project.elements.find(e=>e.id===id);if(!e)return null;
    const housing=e.role==='motor-housing'?e:state.project.elements.find(h=>h.id===e.parentId&&h.role==='motor-housing');
    const motor=e.type==='motor'?e:housing&&state.project.elements.find(m=>m.type==='motor'&&m.parentId===housing.id);
    return motor?{motor,housing}:null;
  }
  function viewElementVisible(id) {
    return !state.isolatedIds || state.isolatedIds.includes(id);
  }
  function portVisible(e, point) {
    if(!viewElementVisible(e.id))return false;
    if(state.detailLevel!=='basic')return true;
    const parts=motorParts(e.id);
    if(parts?.housing && (state.motorMode==='drive'?e.id===parts.housing.id:e.id===parts.motor.id))return false;
    if(['node','bearing'].includes(e.type)||state.tool==='connect'||state.pendingJoint||state.drag?.nodeConnection)return true;
    const hover=I.target(state.project,state.hoveredTargetId),owner=I.root(state.project,e)?.id;
    return state.selectedElementIds.some(key=>{const t=I.target(state.project,key);return t?.elementId===e.id||t?.elementId===owner;}) || hover?.elementId===e.id || state.snapPreview?.target.ref?.elementId===e.id;
  }
  function setDetailLevel(level) {
    state.detailLevel=level==='advanced'?'advanced':'basic';applyPreferences(state,true);renderScene();renderInspector();renderWorkflowTools();
  }
  function setMotorMode(mode, id = state.selected) {
    const parts=motorParts(id);if(!parts)return;
    state.motorMode=mode==='drive'?'drive':'mount';applyPreferences(state,true);
    selectTarget(I.elementKey(state.motorMode==='mount'?(parts.housing||parts.motor).id:parts.motor.id));
    renderWorkflowTools();
  }
  function isolateSelection() {
    if(state.isolatedIds){state.isolatedIds=null;}else{
      const ids=W.bodies(state.project,state.selectedElementIds);if(!ids.length)return;for(const id of [...ids]){const e=state.project.elements.find(e=>e.id===id);if(e?.rigidAssemblyId)ids.push(I.root(state.project,e).id);}
      state.isolatedIds=[...W.descendants(state.project,ids)];
      for(const id of ids){const parts=motorParts(id);if(parts){state.isolatedIds.push(parts.motor.id);if(parts.housing)state.isolatedIds.push(parts.housing.id);}}
      state.isolatedIds=[...new Set(state.isolatedIds)];
    }
    state.snapPreview=null;dismissSnapChoices();renderScene();renderWorkflowTools();updateSelectionSummary();
  }
  function basicInspectorHTML(e) {
    const parts=motorParts(e.id),size=W.thickness(e),kind=e.role==='motor-housing'?'Kryt motora':typeNames[e.type];
    return `<div class="inspector-selection"><h2>${escape(e.name)}</h2><span>${escape(kind)}</span></div><div class="inspector-body basic-properties"><p>Rozmery, montáž a pohyb</p>${!e.primary?`<button data-action="edit-numbers">Poloha X / Y</button><button data-action="edit-rotation">Natočenie</button>${size?`<button data-action="edit-thickness">${escape(size.label)} · ${fmt(size.value,1)} mm</button>`:''}${['link','panel','ground','rail'].includes(e.type)&&!e.outline.length?'<button data-action="edit-length">Dĺžka člena</button>':''}${K.isElastic(e)?'<button data-action="construction">Rozmery a zdvih</button>':''}<button data-action="selection-settings">Spojenia / uloženie</button>`:'<button data-action="make-editable">Vytvoriť voľnú kópiu</button>'}${parts?`<div class="motor-mode-controls"><button data-action="motor-mode" data-mode="mount" aria-pressed="${state.motorMode!=='drive'}">Montáž krytu</button><button data-action="motor-mode" data-mode="drive" aria-pressed="${state.motorMode==='drive'}">Pohon rotora ↻</button></div><button data-action="motor-spec">Rozmery, výkon a otáčky</button><button data-action="motor-capacity">Overiť vhodnosť motora</button>`:!e.primary&&!K.isElastic(e)&&!['ground','slot'].includes(e.type)?'<button data-action="selection-motor">Priradiť pohon</button>':''}<button data-action="explain-movement">Prečo sa nehýbe?</button><button data-action="detail-level" data-level="advanced">Pokročilé vlastnosti…</button></div>`;
  }
  function rigidAssemblyModal(release = false, id = state.selected) {
    try {
      state.playing=false;
      const keys=[...state.selectedElementIds],next=release?I.unbindRigid(state.project,id,state.result):I.bindRigid(state.project,keys,'Pevná zostava',state.result);
      const group=release?state.project.elements.find(e=>e.id===id)?.rigidAssemblyId:next.elements.find(e=>e.rigidAssemblyId&&!state.project.elements.some(old=>old.rigidAssemblyId===e.rigidAssemblyId))?.rigidAssemblyId;
      const members=(release?state.project:next).elements.filter(e=>e.rigidAssemblyId===group),suspended=(release?state.project:next).connections.filter(j=>j.rigidAssemblyId===group);
      state.rigidDraft={revision:JSON.stringify(state.project),next,release,members:members.map(e=>e.id)};
      modal(release?'Rozpojiť pevnú zostavu?':'Spojiť do pevnej zostavy',`<form id="rigid-assembly-form"><p>${release?'Diely zostanú v zobrazenej polohe a obnovia sa pôvodné vnútorné väzby.':'Vybrané telesá zachovajú vzájomnú polohu a budú sa pohybovať spolu. Montážne spoje s ostatnými dielmi zostanú aktívne.'}</p><ul>${members.map(e=>`<li>${escape(e.name)}</li>`).join('')}</ul>${release?'':quantityTextInput('name','Názov zostavy','Pevná zostava')}<p>${suspended.length} vnútorných väzieb sa ${release?'obnoví':'dočasne nahradí pevným spojením'}. Pohony: ${state.project.elements.filter(e=>e.drive).length} → ${next.elements.filter(e=>e.drive).length}.</p><p>Úpravu možno vrátiť jedným Späť.</p><div class="modal-actions"><button type="button" class="button button-secondary" data-action="close-modal">Zrušiť</button><button class="button button-dark">${release?'Rozpojiť zostavu':'Spojiť napevno'}</button></div></form>`);
    }catch(error){toast(error.message,true);}
  }
  function quantityTextInput(name,label,value) {
    return `<label class="property-field"><span>${escape(label)}</span><input class="text-field" name="${name}" value="${escape(value)}" maxlength="60" required/></label>`;
  }
  function submitRigidAssembly(data) {
    const draft=state.rigidDraft;if(!draft||draft.revision!==JSON.stringify(state.project))throw new Error('Projekt sa zmenil. Náhľad zostavy vytvorte znova.');
    const next=K.copy(draft.next),name=String(data.get('name')||'Pevná zostava').trim();if(!name||name.length>60)throw new Error('Zadajte názov zostavy.');
    if(!draft.release)for(const e of next.elements.filter(e=>draft.members.includes(e.id)))e.rigidAssemblyName=name;
    editCanvas(next,draft.release?'Pevná zostava bola rozpojená.':'Telesá boli spojené do pevnej zostavy.',draft.members.filter(id=>next.elements.some(e=>e.id===id)).map(I.elementKey));state.rigidDraft=null;$('#modal').close();
  }
  async function motorCapacityModal(startupSeconds = null) {
    const parts=motorParts();if(!parts)return;state.playing=false;
    if(!parts.motor.drive){modal('Overenie elektromotora','<p>Najskôr priraďte motoru pohon a upevnite jeho kryt k rámu.</p><button class="button button-dark" data-action="motor-enable-for-check">Priradiť pohon a overiť</button>');return;}
    const revision=JSON.stringify(state.project),motorId=parts.motor.id;
    modal('Overenie elektromotora','<p role="status">Počítam zaťaženie v pracovnom rozsahu…</p>');
    await new Promise(resolve=>setTimeout(resolve,0));if(revision!==JSON.stringify(state.project))return;
    try {
      const report=P.motorCapacity(state.project,motorId,{startupSeconds:startupSeconds??parts.motor.startupSeconds??1});
      state.motorReport={report,revision};
      const top=Math.max(report.available,report.peak,1e-3)*1.15,x=q=>35+(q-K.driveRange(state.project).min)/(K.driveRange(state.project).max-K.driveRange(state.project).min)*530,y=t=>175-Math.abs(t)/top*145;
      const plot=`<svg class="motor-load-chart" viewBox="0 0 600 205" role="img" aria-label="Potrebný a dostupný moment motora"><path d="M35 20V175H575" stroke="#708594" fill="none"/><path d="M35 ${y(report.available)}H575" stroke="#25806b" stroke-dasharray="5 3"/><polyline points="${report.rows.map(r=>x(r.motion)+','+y(r.running)).join(' ')}" fill="none" stroke="#7253cf" stroke-width="2"/><text x="40" y="15" font-size="11">Moment N·m</text><text x="430" y="200" font-size="11">Poloha motora °</text></svg>`;
      modal('Overenie elektromotora',`<h3>${escape(parts.motor.name)}</h3><p class="${report.status==='sufficient'?'':'analysis-warning'}">${({sufficient:'Menovitý moment pokrýva vypočítané zaťaženie aj rozbeh.',overloaded:'Motor alebo prevod nemá dostatočnú momentovú rezervu.',blocked:'Niektoré polohy blokujú väzby. Najskôr opravte mechanizmus.',stopped:'Pri nulových otáčkach nie je menovitý moment z výkonu určený.'})[report.status]}</p><div class="motor-load-metrics"><span>Dostupný moment <strong>${fmt(report.available,3)} N·m</strong></span><span>Potrebný za chodu <strong>${fmt(report.peak,3)} N·m</strong></span><span>Najhorší rozbeh <strong>${fmt(report.startPeak,3)} N·m</strong></span><span>Rezerva za chodu <strong>${fmt(report.margin,3)} N·m</strong></span></div>${plot}<p>Zelená: menovitý moment na výstupe prevodu. Fialová: potrebný moment. ${report.rows.length} vzorkovaných polôh, ${fmt(report.outputRPM,1)} rpm.</p><form id="motor-capacity-form">${quantityInput('startup','Čas rozbehu z ľubovoľnej polohy (s)',report.startupSeconds,'',.1,60)}<button class="button button-secondary">Prepočítať rozbeh</button></form><p>Odhad z hmotností, gravitácie, pružín, tlmičov, trenia a zotrvačnosti. Nezahŕňa elektrický rozbeh, katalógovú momentovú krivku ani zahrievanie. Záporný moment znamená brzdenie; posudzuje sa jeho veľkosť.</p><button class="button button-dark" data-action="motor-capacity-guard" data-enabled="${!parts.motor.enforceTorque}"${['blocked','stopped'].includes(report.status)?' disabled':''}>${parts.motor.enforceTorque?'Vypnúť zastavenie pri preťažení':'Pri preťažení zastaviť prehrávanie'}</button>`,true);
    }catch(error){modal('Overenie elektromotora',`<p>${escape(error.message)}</p><button class="button button-secondary" data-action="explain-movement">Skontrolovať uloženie a väzby</button>`);}
  }
  function applyMotorCapacityGuard(enabled) {
    const draft=state.motorReport;if(!draft||draft.revision!==JSON.stringify(state.project)){toast('Projekt sa zmenil. Overenie spustite znova.',true);return;}
    const next=K.copy(state.project),motor=next.elements.find(e=>e.id===draft.report.motorId);motor.enforceTorque=enabled;motor.startupSeconds=draft.report.startupSeconds;
    editCanvas(next,enabled?'Kontrola momentu je zapnutá. Pri preťažení sa prehrávanie zastaví.':'Kontrola momentu bola vypnutá.');state.motorCapacityCache=null;$('#modal').close();
  }
  function guardMotorMotion(value) {
    const motor=state.project.elements.find(e=>e.type==='motor'&&e.drive&&e.enforceTorque);if(!motor||state.project.simulation.mode==='dynamic')return value;
    try{
      const revision=JSON.stringify(state.project)+'|'+state.direction;if(state.motorCapacityCache?.revision!==revision)state.motorCapacityCache={revision,report:P.motorCapacity(state.project,motor.id,{direction:state.direction})};
      const report=state.motorCapacityCache.report,from=state.motorGuardLastMotion??state.motion,rows=state.direction<0?[...report.rows].reverse():report.rows;
      const near=report.rows.reduce((a,b)=>Math.abs(a.motion-from)<Math.abs(b.motion-from)?a:b);
      const wrapped=state.direction<0?value>from:value<from;
      const crossed=rows.filter(r=>wrapped?(state.direction<0?r.motion<=from||r.motion>=value:r.motion>=from||r.motion<=value):r.motion>=Math.min(from,value)&&r.motion<=Math.max(from,value));
      const starting=!state.motorGuardStarted,bad=starting&&Math.abs(near.starting)>report.available+1e-6?near:crossed.find(r=>Math.abs(r.running)>report.available+1e-6||r.blocked);
      state.motorGuardStarted=true;
      if(bad||report.status==='stopped'||report.status==='blocked'){state.playing=false;toast(`Motor zastavený: ${bad?.blocked?'blokujúce väzby':`potrebný moment ${fmt(Math.max(Math.abs(bad?.running||0),starting?Math.abs(bad?.starting||0):0),3)} N·m, dostupný ${fmt(report.available,3)} N·m`} · poloha ${fmt(bad?.motion??from,1)}°.`,true);return from;}
      state.motorGuardLastMotion=value;return value;
    }catch(error){state.playing=false;toast(error.message,true);return state.motion;}
  }

  function quantityInput(name, label, value, unit = 'mm', min = -5000, max = 5000) {
    return `<label class="property-field"><span>${escape(label)}</span><input class="text-field" name="${name}" type="text" data-quantity="${unit}" min="${min}" max="${max}" maxlength="128" autocomplete="off" spellcheck="false" value="${escape(value)}" required/></label>`;
  }
  function quantityValue(data, name, unit = 'mm', min = -5000, max = 5000, fallback) {
    const raw = data.get(name), value = raw == null && fallback != null ? fallback : W.parseNumber(raw, unit);
    if (value < min || value > max) throw new Error(`Hodnota ${name} musí byť v rozsahu ${min} až ${max} ${unit}.`);
    return value;
  }
  function field(label, key, value, unit = 'mm', min = 1, max = 2000, step = 0.1, scope = 'parameter', extra = '') {
    const id = `field-${scope}-${key}`;
    const digits = Math.max(0, Math.min(6, Math.ceil(-Math.log10(step))));
    return `<label class="property-field" for="${id}"><span>${escape(label)}</span><div class="number-field"><input id="${id}" data-property="${key}" data-scope="${scope}" data-quantity="${unit === 'mm' || unit === '°' ? unit : ''}" type="text" value="${Number(value).toFixed(digits)}" min="${min}" max="${max}" maxlength="128" autocomplete="off" spellcheck="false" ${extra}/><span>${escape(unit)}</span></div></label>`;
  }

  function section(title, content, suffix = '') { return `<section class="property-section"><div class="property-section-title">${escape(title)}${suffix}</div>${content}</section>`; }
  function two(a, b) { return `<div class="property-two">${a}${b}</div>`; }
  function switchRow(label, action, checked, hint = '') { return `<button class="switch-row" data-action="${action}" role="switch" aria-checked="${checked}"><span>${escape(label)}${hint ? `<small>${escape(hint)}</small>` : ''}</span><span class="switch${checked ? ' on' : ''}"></span></button>`; }

  function doubleTraceControls() {
    return `<label class="property-field"><span>Sledované body</span><select class="property-select" data-trace-mode aria-label="Sledované body trajektórie"><option value="bearings"${state.traceMode === 'bearings' ? ' selected' : ''}>Obe vodiace ložiská A + B</option><option value="single"${state.traceMode === 'single' ? ' selected' : ''}>Jeden zvolený bod</option></select></label><div class="trace-reference-label">Súradnicová sústava</div><div class="segmented trace-reference">${[['world', 'Pevný korpus'], ['carrier', 'Zásuvka']].map(([space, name]) => `<button type="button" data-action="trace-space" data-space="${space}" aria-pressed="${state.traceSpace === space}" class="${state.traceSpace === space ? 'is-active' : ''}">${name}</button>`).join('')}</div><p class="section-description trace-explanation">${state.traceSpace === 'carrier' ? 'Dráhy vzhľadom na zásuvku ležia v jej kulisách. Po sklopení sa ložiská v tejto sústave už nepohybujú.' : 'Dráhy vzhľadom na pevný korpus zahŕňajú sklopenie aj následný vodorovný posuv.'}</p>`;
  }

  function doubleDrawerGeometry(e, p) {
    const span = p.travelMax - p.travelMin;
    let geometry = '';
    if (e.role === 'front') geometry = section('Odhadová geometria čela', `${field('Dĺžka čela', 'panelLength', p.panelLength)}${field('Hrúbka čela', 'panelThickness', p.panelThickness, 'mm', 1, 100)}${two(field('Zatvorené čelo', 'closedAngle', p.closedAngle, '°', -179, 180), field('Sklopené čelo', 'openAngle', p.openAngle, '°', -180, 179))}`);
    if (e.role === 'rocker') geometry = section('Tuhé modré rameno', `${field('Dĺžka medzi kĺbmi R a B', 'armLength', p.armLength)}${two(field('Uhol zatvoreného ramena', 'armClosedAngle', p.armClosedAngle, '°', -44, 45), field('Uhol sklopeného ramena', 'armOpenAngle', p.armOpenAngle, '°', -45, 44))}<p class="section-description">Dĺžka sa počas pohybu nemení. Kĺb B je aj vodiace ložisko v druhej kulise.</p>`);
    if (e.role === 'carrier') geometry = section('Posuvný rám zásuvky', `${field('Dĺžka rámu', 'frameLength', p.frameLength)}${field('Poloha rámu Y', 'drawerY', p.drawerY, 'mm', -1000, 1000)}${field('Výška rámu', 'drawerHeight', p.drawerHeight)}`) +
      section('Dve fázy pohybu', `${two(field('Minimum pohonu', 'travelMin', p.travelMin, 'mm', 0, 1999), field('Maximum pohonu', 'travelMax', p.travelMax))}${field('Koniec sklápania od začiatku', 'releaseTravel', p.releaseTravel, 'mm', 1, span - 1)}${field('Odhadový prechod opory', 'handoffLength', p.handoffLength, 'mm', 1, p.releaseTravel)}<p class="section-description">Najprv sklopenie, potom spoločný posuv bez ďalšej rotácie.</p>`);
    if (e.role === 'frame') geometry = section('Pevný korpus', `${field('Dĺžka korpusu', 'frameLength', p.frameLength)}${field('Výška korpusu', 'frameHeight', p.frameHeight)}${field('Výška predného otvoru', 'frontOpening', p.frontOpening, 'mm', 1, p.frameHeight - 1)}<div class="fixed-note">${icon('lock', 15)}Korpus sa neposúva.</div>`);
    if (e.role === 'table') geometry = section('Pevná platforma stola', `${field('Horná plocha Y', 'tableY', p.tableY, 'mm', -1000, 1000)}${field('Hrúbka platformy', 'tableThickness', p.tableThickness)}${two(field('Začiatok pevného výrezu X', 'cutoutStart', p.cutoutStart, 'mm', 0, 2000), field('Koniec pevného výrezu X', 'cutoutEnd', p.cutoutEnd, 'mm', 1, 2500))}<p class="section-description">Výrez je odhadový a pevný pre celý zdvih. Nehýbe sa podľa aktuálnej polohy ložísk.</p>`);
    if (['stop', 'rearSlot', 'rearPin'].includes(e.role)) geometry = section('Zadná opora a čap R', `${two(field('Počiatočný čap X', 'rearX', p.rearX, 'mm', 0, 1500), field('Os čapu Y', 'rearY', p.rearY, 'mm', -1000, 1000))}${field('Koniec sklápania', 'releaseTravel', p.releaseTravel, 'mm', 1, span - 1)}${field('Odhadový prechod opory', 'handoffLength', p.handoffLength, 'mm', 1, p.releaseTravel)}<p class="section-description">Pred prechodom drží opora čap na mieste. Potom sa čap uvoľní do spoločného posuvu. Spôsob zachytenia a uvoľnenia nie je v náčrte určený.</p>`);
    if (['guide1', 'guide2'].includes(e.role)) {
      const index = e.role === 'guide1' ? 1 : 2;
      geometry = section(`Kulisa ${index} · sústava zásuvky`, `${field('Šírka drážky', 'slotWidth', p.slotWidth, 'mm', 2, 100)}${two(field('Odsadenie profilu X', `guide${index}X`, p[`guide${index}X`], 'mm', -200, 200), field('Odsadenie profilu Y', `guide${index}Y`, p[`guide${index}Y`], 'mm', -200, 200))}<p class="section-description">Profil je odvodený z tuhého držiaka a ramena, nie z ľubovoľnej spline. Odsadenie jednej kulisy môže porušiť uzavretie mechanizmu.</p>`);
    }
    if (['bracket', 'pinA', 'pinB'].includes(e.role)) geometry = section('Tuhý držiak ložísk', `<p class="section-description">Lokálne súradnice od päty čela: X po čele, Y kolmo na čelo. Ložiská majú pevný vzájomný rozstup.</p>${two(field('Ložisko A · X', 'pinAX', p.pinAX, 'mm', -200, 200), field('Ložisko A · Y', 'pinAY', p.pinAY, 'mm', -200, 200))}${two(field('Ložisko B · X', 'pinBX', p.pinBX, 'mm', -200, 200), field('Ložisko B · Y', 'pinBY', p.pinBY, 'mm', -200, 200))}${field('Priemer vodiaceho ložiska', 'bearingRadius', p.bearingRadius * 2, 'mm', 2, 100, 1, 'diameter')}<div class="fixed-note">${icon('link', 15)}Rozstup A–B: ${fmt(Math.hypot(p.pinAX - p.pinBX, p.pinAY - p.pinBY), 2)} mm</div>`);
    return geometry + `<div class="inspector-note estimated-note">${icon('warning', 15)}<p>Rozmery a uvoľnenie opory sú odhadové. Nie je to výrobný výkres.</p></div><button class="button button-secondary full-width" data-action="project-info">${icon('info', 14)}Náčrt a predpoklady projektu</button>`;
  }

  function elasticGeometry(e) {
    const spring = e.type.startsWith('spring-'), compression = e.type === 'spring-compression', pulling = ['spring-extension', 'piston-pull'].includes(e.type);
    const force = state.result.forces?.find((v) => v.id === e.id), geometry = !spring && K.pistonGeometry(e), needsFit = !spring && (!geometry.fits || selectedPose()?.length > e.maxLength + K.TOLERANCE || selectedPose()?.length < e.minLength - K.TOLERANCE);
    return '<button class="button button-secondary full-width" data-action="construction">Konštrukčné rozmery a zdvih…</button>' + section('Pracovný rozsah', `<label class="property-field"><span>Rozmery pri montáži</span><select id="range-mode" class="property-select"><option value="auto"${e.rangeMode !== 'manual' ? ' selected' : ''}>Automaticky podľa montáže</option><option value="manual"${e.rangeMode === 'manual' ? ' selected' : ''}>Vlastné pracovné dorazy</option></select></label><p class="section-description">Automatický rozsah zachová tuhosť pružiny. Ručne zadané minimum a maximum sa pri pohybe dodržia.</p>`) + (!spring ? section('Funkcia piesta', `<label class="property-field"><span>Správanie</span><select id="actuator-mode" class="property-select"><option value="gas"${e.actuatorMode !== 'damper' ? ' selected' : ''}>Plynová vzpera · sila a tlmenie</option><option value="damper"${e.actuatorMode === 'damper' ? ' selected' : ''}>Tlmič · odpor proti rýchlosti</option></select></label><p class="section-description">Pri návrhovom predĺžení sa zväčší aj valec a pracovný rozsah. Pri simulovanom vysúvaní má valec stálu dĺžku.</p>${needsFit ? `<p class="analysis-warning">Pracovný rozsah alebo vzdialenosť čapov nezodpovedá konštrukcii valca.</p><button class="button button-secondary full-width" data-action="piston-fit">Prispôsobiť valec montáži</button>` : ''}`) : '') + section('Dĺžka medzi montážnymi čapmi', `<div class="elastic-lengths"><div><span>${spring ? 'Voľná dĺžka L₀' : 'Referenčná dĺžka'}</span><strong>${fmt(e.restLength,2)} mm</strong></div><div><span>Minimum</span><strong>${fmt(e.minLength,2)} mm</strong></div><div><span>Maximum</span><strong>${fmt(e.maxLength,2)} mm</strong></div><div><span>Aktuálna dĺžka</span><strong>${fmt(selectedPose()?.length,2)} mm</strong></div></div><p class="section-description">Rozmery upravte spoločne cez Konštrukčné rozmery a zdvih.</p>`) +
      section('Priemery', `${field(spring ? 'Vonkajší priemer pružiny' : 'Priemer valca', 'diameter', e.diameter, 'mm', .1, 500, .1, 'element')}${field(spring ? 'Priemer drôtu' : 'Priemer tyče', spring ? 'wireDiameter' : 'rodDiameter', spring ? e.wireDiameter : e.rodDiameter, 'mm', .01, 500, .01, 'element')}`) +
      section(pulling ? 'Ťažná sila (sťahuje čapy)' : 'Tlačná sila (odtláča čapy)', `${spring ? `<label class="property-field"><span>Spôsob zadania sily</span><select class="property-select" id="force-mode"><option value="rated"${e.forceMode !== 'stiffness' ? ' selected' : ''}>F pri pracovnom limite</option><option value="stiffness"${e.forceMode === 'stiffness' ? ' selected' : ''}>Tuhosť k (N/mm)</option></select></label>${e.forceMode === 'stiffness' ? field('Tuhosť pružiny k', 'stiffness', e.stiffness, 'N/mm', 0, 100000, .001, 'element') : field(compression ? 'F pri minimálnej dĺžke' : 'F pri maximálnej dĺžke', 'force', e.force, 'N', 0, 1000000, .01, 'element')}${!compression ? field('Počiatočné predpätie F₀', 'preload', e.preload, 'N', 0, 1000000, .01, 'element') : ''}<p class="section-description">${compression ? 'Nad voľnou dĺžkou pružina netlačí. F = k · (L₀ − L).' : 'Pod voľnou dĺžkou je pružina voľná. Od L₀ ťahá silou F₀ + k · (L − L₀).'}</p>` : `${field('Referenčná sila F', 'force', e.force, 'N', 0, 1000000, .1, 'element')}${field('Pomer sily na konci zdvihu', 'progression', e.progression, '×', 1, 3, .01, 'element')}<p class="section-description">${pulling ? 'F pri minimálnej dĺžke, rastie pri vysúvaní.' : 'F pri maximálnej dĺžke, rastie pri zasúvaní.'} Pomer 1 znamená konštantnú silu. Nejde o pneumatický okruh ani výrobný model plynu.</p>`}${field('Osové tlmenie', 'damping', e.damping, 'N·s/m', 0, 100000, .1, 'element')}${!spring ? two(field('Tlmenie pri zasúvaní', 'dampingCompression', e.dampingCompression ?? e.damping, 'N·s/m', 0, 100000, .1, 'element'), field('Tlmenie pri vysúvaní', 'dampingExtension', e.dampingExtension ?? e.damping, 'N·s/m', 0, 100000, .1, 'element')) : ''}${field('Hmotnosť na voľnom čape', 'tipMass', e.tipMass, 'kg', .001, 1000, .001, 'element')}<p class="section-description">V režime Pohyb zo síl sa sila prenáša na pohon aj spoločné voľné čapy. Tlmenie pôsobí proti rýchlosti; hmotnosť určuje zrýchlenie.</p><div class="analysis-metric"><span>Výsledná osová sila</span><strong>${fmt(force?.magnitude || 0, 2)} <small>N</small></strong></div><div class="analysis-metric"><span>Pružná / plynová sila</span><strong id="live-nominal-force">${fmt(force?.nominalForce||0,2)} N</strong></div><div class="analysis-metric"><span>Odpor tlmenia</span><strong id="live-damping-force">${fmt(force?.dampingForce||0,2)} N</strong></div><button class="button button-secondary full-width" data-action="elastic-response">Náhľad návratu a tlmenia</button>`) +
      section('Montáž medzi telesami', `<label class="property-field"><span>Koniec A</span><select id="mount-a" class="property-select">${nodeOptions(K.elasticMount(state.project, e, 'a'), false, true, true)}</select></label><label class="property-field"><span>Koniec B</span><select id="mount-b" class="property-select">${nodeOptions(K.elasticMount(state.project, e, 'b'), false, true, true)}</select></label><p class="section-description">Sila sa prenesie medzi zvolené body. Pružný prvok nepredpisuje tuhú dĺžku. Koncové dĺžky sú dorazy, ktoré zastavia simuláciu.</p>`) +
      section('Voľné konce v editácii', `${two(field('Poloha X', 'x', e.x, 'mm', -5000, 5000, .1, 'element'), field('Poloha Y', 'y', e.y, 'mm', -5000, 5000, .1, 'element'))}${field(spring ? 'Rozostup voľných čapov' : 'Návrhová vysunutá dĺžka', 'length', e.length, 'mm', .1, 5000, .1, 'element')}${field('Uhol prvku', 'angle', e.angle, '°', -360, 360, .1, 'element')}`) +
      `<div class="inspector-note">${icon('warning', 15)}<p>Parametre sú návrhový odhad. Overte minimálnu dĺžku, zdvih, rezervu a silu v údajoch výrobcu.</p></div><button class="button button-secondary full-width" data-action="elastic-sources">Katalógové príklady a zdroje</button>`;
  }

  function drawElastic(e, pose, color, result = state.result) {
    const length = pose.length || 1, ux = (pose.b.x - pose.a.x) / length, uy = (pose.b.y - pose.a.y) / length;
    const at = (s, normal = 0) => ({ x: pose.a.x + ux * s - uy * normal, y: pose.a.y + uy * s + ux * normal });
    const spring = e.type.startsWith('spring-');
    let body;
    if (spring) {
      const points = [pose.a, at(length * .13)];
      for (let i = 0; i < 17; i++) points.push(at(length * (.16 + i / 16 * .68), (i % 2 ? 1 : -1) * e.diameter / 2));
      points.push(at(length * .87), pose.b);
      body = `<path d="${pathD(points)}" stroke="${color}" stroke-width="${Math.min(4, Math.max(1, e.wireDiameter))}" stroke-linejoin="round" fill="none"/>`;
    } else {
      const geometry = K.pistonGeometry(e, length), cylinder = Math.max(0, Math.min(length - geometry.eye, geometry.cylinder)), rod = at(cylinder);
      body = `${line(pose.a, pose.b, `stroke="#8995a2" stroke-width="${e.rodDiameter}" stroke-linecap="round"`)}${line(pose.a, rod, `stroke="${color}" stroke-width="${e.diameter}" stroke-linecap="butt"`)}${line(at(4), at(Math.max(4, cylinder - 4)), `stroke="#dde4eb" stroke-width="${e.diameter * .45}"`)}`;
    }
    const force = result.forces?.find((v) => v.id === e.id);
    body += `<text x="${(pose.a.x + pose.b.x) / 2}" y="${(pose.a.y + pose.b.y) / 2 - e.diameter / 2 - 9}" text-anchor="middle" class="force-label">${escape(e.name)} · ${fmt(force?.magnitude || 0, 1)} N</text>`;
    if (state.forceArrows && force?.magnitude > .001) {
      for (const [origin, vector] of [[pose.a, force.atA], [pose.b, force.atB]]) {
        const f = Math.hypot(vector.x, vector.y), size = 18 + Math.min(30, f * .12);
        const dx = vector.x / f, dy = vector.y / f, end = { x: origin.x + dx * size, y: origin.y + dy * size };
        body += `<g pointer-events="none" class="force-arrow">${line(origin, end, 'stroke="#bd6a77" stroke-width="1.7"')}<polygon points="${end.x},${end.y} ${end.x - dx * 7 - dy * 3},${end.y - dy * 7 + dx * 3} ${end.x - dx * 7 + dy * 3},${end.y - dy * 7 - dx * 3}" fill="#bd6a77"/></g>`;
      }
    }
    return body;
  }

  function renderInspector() {
    const container = $('#inspector-content'), e = currentElement(), p = state.project.parameters;
    if (state.analysis) {
      const blocked = state.samples.filter((s) => s.blocked);
      const angles = state.samples.map((s) => s.angle);
      const lengths = traceReferences().map((reference) => `<div class="analysis-metric"><span>Trajektória ${escape(reference.label || 'bodu')}${isDoubleDrawer() ? ` · ${state.traceSpace === 'carrier' ? 'zásuvka' : 'korpus'}` : ''}</span><strong>${fmt(traceLength(reference))} <small>mm</small></strong></div>`).join('');
      container.innerHTML = `<div class="inspector-selection"><span class="selection-icon analysis">${icon('chart', 27)}</span><div><h2>Analýza mechanizmu</h2><span class="selection-type">CELÝ ZDVIH · 121 VZORIEK</span></div></div><div class="inspector-body">
        ${section('Rozsah pohybu', `<div class="analysis-metric"><span>Uhol výstupu</span><strong>${fmt(Math.min(...angles))}° <small>→</small> ${fmt(Math.max(...angles))}°</strong></div>${lengths}<div class="analysis-metric"><span>Max. polohová chyba</span><strong>${fmt(Math.max(...state.samples.map((s) => s.positionResidual)), 3)} <small>mm</small></strong></div><div class="analysis-metric"><span>Max. uhlová chyba</span><strong>${fmt(Math.max(...state.samples.map((s) => s.angularResidual)), 3)} <small>°</small></strong></div>`)}
        ${isDoubleDrawer() ? section('Dve ložiská · dve kulisy', `${doubleTraceControls()}<div class="analysis-metric"><span>Uhol modrého ramena</span><strong>${fmt(p.armClosedAngle)}° <small>→</small> ${fmt(p.armOpenAngle)}°</strong></div><div class="fixed-note">${icon('lock', 15)}Pevná dĺžka ramena: ${fmt(p.armLength)} mm</div><button class="button button-secondary full-width" data-action="project-info">Odhadové predpoklady</button>`) : ''}
        ${section('Kontrola mechanizmu', `<div class="validation-card${blocked.length ? ' has-warning' : ''}">${icon(blocked.length ? 'warning' : 'check', 19)}<div><strong>${blocked.length ? `${blocked.length} polôh vyžaduje kontrolu` : 'Všetky polohy sú priechodné'}</strong><p>${blocked.length ? escape(blocked[0].issues[0]) : 'Väzby sú splnené v celom rozsahu pohybu.'}</p></div></div>${switchRow('Detekcia kolízií', 'collisions', state.collisions, 'Rovinná geometrická kontrola')}`)}
        ${section('Vizualizácia', `${switchRow('Trajektória bodu', 'trace', state.trace)}${switchRow('Krajné polohy', 'ghosts', state.ghosts)}${switchRow('Rozmerové kóty', 'dimensions', state.dimensions)}`)}
        ${section('Sily a odhadová dynamika', `<button class="button button-secondary full-width" data-action="analyze-forces">Vypočítať sily / moment pohonu</button>${state.forceContext ? `<div class="analysis-metric"><span>Vyrovnávacia sila ${K.driveRange(state.project).unit === '°' ? '/ moment' : ''}</span><strong>${fmt(P.generalized(state.forceContext, state.motion).handForce, 2)} <small>${K.driveRange(state.project).unit === '°' ? 'N·m' : 'N'}</small></strong></div>` : state.forceError ? `<p class="section-description">${escape(state.forceError)}</p>` : ''}${(state.result.forces || []).map((force) => `<div class="analysis-metric"><span>${escape(state.project.elements.find((e) => e.id === force.id)?.name)}</span><strong>${fmt(force.magnitude, 2)} <small>N</small></strong></div>`).join('')}<button class="button button-secondary full-width" data-action="settings">Hmotnosť, gravitácia, tlmenie a pohon</button>`)}
        <div class="inspector-note">${icon('warning', 15)}<p>Odhadový model jedného pohonu, tuhých telies a lineárnych pružín. Neoveruje kontaktné reakcie, bezpečnosť západky, deformácie ani katalógovú životnosť.</p></div>
        <button class="button button-secondary full-width" data-action="export-csv">${icon('export', 16)}Exportovať namerané dáta</button>
      </div>`;
      return;
    }
    if (!e) {
      container.innerHTML = `<div class="empty-inspector">${icon('cursor', 34)}<h2>Priestor pre váš nápad</h2><p>Vyberte prvok na plátne alebo ho pridajte z knižnice. Projekty a šablóny otvoríte cez názov mechanizmu v hlavičke.</p></div>`;
      return;
    }
    if(state.detailLevel==='basic'){container.innerHTML=basicInspectorHTML(e);return;}
    let geometry = '';
    if (e.primary && isDoubleDrawer()) {
      geometry = doubleDrawerGeometry(e, p);
    } else if (e.primary && state.project.kind === 'drawer') {
      if (e.type === 'panel') geometry = section('Geometria čela', `${field('Dĺžka čela', 'panelLength', p.panelLength)}${field('Hrúbka čela', 'panelThickness', p.panelThickness, 'mm', 1, 100)}${field('Odsadenie otočného čapu', 'panelOffsetX', p.panelOffsetX, 'mm', -300, 300)}`) +
        section('Uloženie ložiska', `${field('Vzdialenosť od otočného čapu', 'bearingOffset', p.bearingOffset, 'mm', 1, 1000)}${field('Priemer vodiaceho ložiska', 'bearingRadius', p.bearingRadius * 2, 'mm', 2, 100, 1, 'diameter')}`) +
        section('Pohybové limity', two(field('Zatvorené čelo', 'closedAngle', p.closedAngle, '°', -179, 180), field('Otvorené čelo', 'openAngle', p.openAngle, '°', -180, 179)));
      if (e.type === 'rail') geometry = section('Geometria vedenia', `${field('Celková dĺžka výsuvu', 'frameLength', p.frameLength)}${field('Výška osi výsuvu', 'pivotY', p.pivotY, 'mm', -1000, 1000)}`) +
        section('Pohybové limity', two(field('Min. vytiahnutie', 'travelMin', p.travelMin, 'mm', 0, 1999), field('Max. zdvih', 'travelMax', p.travelMax))) +
        section('Riadenie čela', `${field('Začiatok vyklápania', 'turnStart', p.turnStart, 'mm', p.travelMin, p.travelMax - 1)}${field('Tvar pohybového profilu', 'smoothness', p.smoothness, '×', 0.3, 3, 0.1)}`);
      if (e.type === 'ground') geometry = section('Geometria korpusu', `${field('Dĺžka korpusu', 'frameLength', p.frameLength)}${field('Vnútorná výška', 'frameHeight', p.frameHeight)}${field('Výška osi výsuvu', 'pivotY', p.pivotY, 'mm', -1000, 1000)}`) + section('Uloženie', '<div class="fixed-note">' + icon('lock', 15) + 'Pevné teleso · 0 stupňov voľnosti</div>');
      if (e.type === 'slot') {
        const controls = state.project.controls || K.defaultControls(p);
        geometry = section('Profil vodiacej kulisy', `<label class="property-field"><span>Typ geometrie</span><select class="property-select" id="curve-kind"><option value="cam"${p.curveKind === 'cam' ? ' selected' : ''}>Parametrický profil</option><option value="arc"${p.curveKind === 'arc' ? ' selected' : ''}>Kruhový oblúk</option><option value="bezier"${p.curveKind === 'bezier' ? ' selected' : ''}>Bézierova krivka</option><option value="spline"${p.curveKind === 'spline' ? ' selected' : ''}>Interpolovaná spline</option></select></label>${field('Šírka drážky', 'slotWidth', p.slotWidth, 'mm', 2, 100)}${p.curveKind === 'arc' ? field('Polomer zakrivenia', 'curveRadius', p.curveRadius, 'mm', 1, 5000) : ''}${p.curveKind === 'cam' ? field('Začiatok vyklápania', 'turnStart', p.turnStart, 'mm', p.travelMin, p.travelMax - 1) : ''}`) +
          section('Poloha kulisy', two(field('Odsadenie X', 'slotOffsetX', p.slotOffsetX, 'mm', -500, 500), field('Odsadenie Y', 'slotOffsetY', p.slotOffsetY, 'mm', -500, 500)));
        if (['bezier', 'spline'].includes(p.curveKind)) geometry += section('Kontrolné body', `<p class="section-description">Body môžete upraviť aj ťahaním na plátne.</p>${controls.map((c, i) => `<div class="control-point-row"><span>P${i}</span>${field('X', `${i}-x`, c.x, 'mm', -5000, 5000, 0.1, 'control')}${field('Y', `${i}-y`, c.y, 'mm', -5000, 5000, 0.1, 'control')}</div>`).join('')}`);
        geometry += '<div class="inspector-note">' + icon('info', 15) + '<p>Parametrická kulisa je odvodená z dráhy ložiska. Pri voľnej krivke solver kontroluje jej dosiahnuteľnosť.</p></div>';
      }
      if (e.type === 'bearing') geometry = section(e.role === 'pivot' ? 'Otočný čap' : 'Vodiace ložisko', `${field('Priemer ložiska', 'bearingRadius', p.bearingRadius * 2, 'mm', 2, 100, 1, 'diameter')}${e.role !== 'pivot' ? field('Vzdialenosť od otočného čapu', 'bearingOffset', p.bearingOffset) : ''}`) + section('Kinematická väzba', `<div class="fixed-note">${icon(e.role === 'pivot' ? 'bearing' : 'slot', 17)}${e.role === 'pivot' ? 'Otočný kĺb čela a výsuvu' : 'Čap striktne viazaný na kulisu'}</div>`);
    } else if (e.primary && state.project.kind === 'fourbar') {
      const key = { frame: 'groundLength', input: 'crankLength', coupler: 'couplerLength', output: 'rockerLength' }[e.role];
      geometry = section('Geometria člena', field('Vzdialenosť medzi kĺbmi', key, p[key])) + section('Uzavretý kinematický reťazec', '<div class="fixed-note">' + icon('link', 16) + 'Rotačné kĺby · pevné dĺžky ramien</div>');
    } else if (e.primary && state.project.kind === 'crank') {
      geometry = section('Geometria mechanizmu', `${field('Polomer kľuky', 'crankLength', p.crankLength)}${field('Dĺžka ojnice', 'rodLength', p.rodLength)}${field('Poloha osi vedenia Y', 'sliderY', p.sliderY, 'mm', -500, 500)}`);
    } else {
      geometry = section('Poloha a orientácia', two(field('Poloha X', 'x', e.x, 'mm', -5000, 5000, 0.1, 'element'), field('Poloha Y', 'y', e.y, 'mm', -5000, 5000, 0.1, 'element')) + field('Uhol natočenia', 'angle', e.angle, '°', -360, 360, 0.1, 'element')) +
        section('Geometria', `${!['bearing', 'node'].includes(e.type) ? field('Dĺžka prvku', 'length', e.length, 'mm', 1, 2000, 1, 'element') : field(e.type === 'node' ? 'Polomer značky bodu' : 'Polomer ložiska', 'radius', e.radius, 'mm', 1, 100, 1, 'element')}${['link', 'panel', 'ground'].includes(e.type) ? field('Hrúbka člena', 'width', e.width, 'mm', .1, 500, 1, 'element') : ''}${e.type === 'rail' ? field('Šírka vedenia', 'slotWidth', e.slotWidth, 'mm', .1, 500, .1, 'element') + field('Zdvih vedenia', 'stroke', e.stroke, 'mm', 1, 2000, 1, 'element') : ''}${e.type === 'panel' ? field('Vzdialenosť ložiska', 'bearingOffset', e.bearingOffset, 'mm', 1, 2000, 1, 'element') : ''}${e.type === 'slot' ? field('Šírka drážky', 'slotWidth', e.slotWidth, 'mm', .1, 500, 1, 'element') : ''}`);
      if (e.type === 'bearing') geometry += section('Vedenie ložiska', `<label class="property-field"><span>Viazať na kulisu</span><select class="property-select" id="bearing-slot"><option value="">Bez väzby</option>${state.project.elements.filter((s) => s.type === 'slot').map((s) => `<option value="${escape(s.id)}"${s.id === e.slotId ? ' selected' : ''}>${escape(s.name)}</option>`).join('')}</select></label>`);
      if (e.type === 'slot') geometry += section('Profil kulisy / vodiacej dráhy', `<label class="property-field"><span>Typ geometrie</span><select class="property-select" id="element-curve-kind">${[['bezier', 'Bézierova krivka'], ['spline', 'Interpolovaná spline'], ['arc', 'Kruhový oblúk'], ['polyline', 'Lomená čiara · presné body']].map(([kind, title]) => `<option value="${kind}"${e.curveKind === kind ? ' selected' : ''}>${title}</option>`).join('')}</select></label>${e.curveKind === 'arc' ? field('Polomer zakrivenia', 'curveRadius', e.curveRadius, 'mm', 1, 5000, 1, 'element') : ''}<p class="section-description">${e.controls.length} bodov, lokálne súradnice. V editačnom režime môžete body ťahať na plátne.</p>${e.controls.length <= 32 ? e.controls.map((c, i) => `<div class="control-point-row"><span>P${i}</span>${field('X', `${i}-x`, c.x, 'mm', -5000, 5000, 0.1, 'element-control')}${field('Y', `${i}-y`, c.y, 'mm', -5000, 5000, 0.1, 'element-control')}</div>`).join('') : ''}<button class="button button-secondary full-width" data-action="edit-path">Upraviť / pridať / odstrániť body</button>`);
      if (e.type === 'cam') geometry += section('Profil rotačnej vačky', `<label class="property-field"><span>Tvar vačky</span><select class="property-select" id="cam-shape"><option value="harmonic"${e.camShape !== 'pear' ? ' selected' : ''}>Harmonický radiálny profil</option><option value="pear"${e.camShape === 'pear' ? ' selected' : ''}>Pretiahnutá vačka · dva kruhové oblúky</option></select></label>${e.camShape === 'pear' ? field('Pomer polomeru špičky / základne', 'camNoseRatio', e.camNoseRatio, '×', .1, 1, .01, 'element') : ''}${field('Polomer základného kruhu R', 'radius', e.radius, 'mm', .1, 5000, .1, 'element')}${field('Zdvih profilu h', 'camLift', e.camLift, 'mm', 0, 5000, .1, 'element')}${field('Fáza výstupku', 'camPhase', e.camPhase, '°', -360, 360, .1, 'element')}<p class="section-description">${e.camShape === 'pear' ? 'Dva kruhové oblúky spojené spoločnými dotyčnicami, s osou v základnom kruhu.' : 'Jedna hladká vlna za otáčku, polomer R až R + h.'} Kontakt používa skutočný polomer valčeka a predpoklad trvalého dotyku, nie stred valčeka na obryse.</p><button class="button button-secondary full-width" data-action="cam-follower">Pridať vedený valčekový sledovač</button>`);
      if (['rail', 'link', 'panel', 'cam', 'motor'].includes(e.type)) geometry += section('Jeden pohon mechanizmu', `${switchRow('Riadený pohon', 'drive-selected', e.drive)}${!['rail', 'cam','motor'].includes(e.type) ? `<label class="property-field"><span>Druh pohonu</span><select class="property-select" id="drive-mode"><option value="rotary"${e.driveMode !== 'linear' ? ' selected' : ''}>Rotačný</option><option value="linear"${e.driveMode === 'linear' ? ' selected' : ''}>Posuv celého telesa</option></select></label>${e.driveMode === 'linear' ? `${field('Zdvih telesa', 'stroke', e.stroke, 'mm', 1, 2000, 0.1, 'element')}${field('Smer posuvu', 'driveAngle', e.driveAngle || 0, '°', -360, 360, 0.1, 'element')}` : ''}` : ''}${e.drive ? two(field('Minimum pohonu', K.driveRange(state.project).unit === '°' ? 'rotationMin' : 'travelMin', K.driveRange(state.project).min, K.driveRange(state.project).unit, K.driveRange(state.project).unit === '°' ? -360 : 0, 2000), field('Maximum pohonu', K.driveRange(state.project).unit === '°' ? 'rotationMax' : 'travelMax', K.driveRange(state.project).max, K.driveRange(state.project).unit, 1, 2000)) : ''}`);
      geometry += section('Uloženie', `${switchRow('Pevné uloženie v simulácii', 'lock-selected', e.locked)}${!K.isElastic(e) ? `<label class="property-field"><span>Nosné teleso (pevné pripojenie)</span><select class="property-select" id="parent-body"><option value="">Bez nosného telesa</option>${state.project.elements.filter((v) => v.id !== e.id && !K.isElastic(v)).map((v) => `<option value="${escape(v.id)}"${e.parentId === v.id ? ' selected' : ''}>${escape(v.name)}</option>`).join('')}</select></label>${e.parentId ? '<p class="section-description">Poloha X/Y a uhol sú lokálne vzhľadom na nosné teleso. Teleso sa pohybuje spolu s ním.</p>' : ''}` : ''}`);
      if (e.role !== 'motor-housing' && ['ground', 'link', 'panel'].includes(e.type)) geometry += section('Tvar telesa', `<button class="button button-secondary full-width" data-action="edit-outline">Upraviť obrys · ${e.outline?.length || 0} vrcholov</button>${e.type === 'panel' && e.localC ? two(field('Pomocný bod C · X', 'x', e.localC.x, 'mm', -5000, 5000, 0.1, 'local-c'), field('Pomocný bod C · Y', 'y', e.localC.y, 'mm', -5000, 5000, 0.1, 'local-c')) : ''}`);
    }
    if (e.role === 'motor-housing') geometry = section('Kryt elektromotora', '<p class="section-description">Teleso presuňte ťahaním. Montážne body A/B slúžia na pripojenie k rámu; C je stred hriadeľa.</p><button class="button button-secondary full-width" data-action="edit-thickness">Priemer krytu</button><button class="button button-secondary full-width" data-action="motor-spec">Parametre elektromotora</button>') + section('Montáž', '<button class="button button-secondary full-width" data-action="selection-settings">Spojenia / uloženie</button>');
    if (K.isElastic(e)) geometry = elasticGeometry(e);
    else geometry += section('Hmotnosť a zotrvačnosť · odhad', `${field('Hmotnosť telesa', 'mass', e.mass ?? 1, 'kg', 0, 100000, 0.1, 'element')}${field('Moment zotrvačnosti (0 = odhad)', 'inertia', e.inertia || 0, 'kg·m²', 0, 1000000, 0.0001, 'element')}<button class="button button-secondary full-width" data-action="edit-com">Nastaviť ťažisko telesa</button><p class="section-description">Bez vlastného ťažiska sa použije stred A–B, čap alebo vozík C. Zotrváčnosť sa odhadne ako tenká doska / tyč.</p>`);
    if (e.primary) geometry += `<div class="inspector-note">${icon('lock', 15)}<p>Tento model používa parametrický solver. Pre voľnú zmenu tvarov, polôh a väzieb vytvorte samostatnú kópiu.</p></div><button class="button button-secondary full-width" data-action="make-editable">${icon('copy', 14)}Vytvoriť voľnú editačnú kópiu</button>`;
    if (state.project.source?.note) geometry += `<div class="inspector-note">${icon('warning', 15)}<p>${escape(state.project.source.note)}</p></div>`;
    const joints = state.project.connections.filter((j) => j.a.elementId === e.id || j.b.elementId === e.id);
    const jointContent = `<div class="selected-joints">${joints.length ? joints.map((j) => `<div class="selected-joint">${icon('link', 16)}<div><button class="joint-edit" data-action="edit-joint" data-id="${escape(j.id)}"><strong>${escape(j.name)}</strong></button><span>${j.builtin ? 'Súčasť riadeného mechanizmu' : escape(E.constraintNames[j.type || 'revolute'])}</span></div>${j.builtin ? icon('lock', 11) : ib('trash', 'delete-joint', 'Odstrániť väzbu', false, `data-id="${escape(j.id)}"`)}</div>`).join('') : '<p class="section-description">Prvok zatiaľ nemá žiadne kĺbové väzby.</p>'}<button class="button button-secondary full-width" data-action="new-joint">${icon('link', 16)}Pridať / nastaviť väzbu</button></div>`;
    const pose = selectedPose();
    container.innerHTML = `
      <div class="inspector-selection"><span class="selection-icon ${e.type}">${icon(e.role==='motor-housing'?'motor':typeIcons[e.type], 28)}</span><div><h2>${escape(e.name)}</h2><span class="selection-type">${escape(e.role==='motor-housing'?'Kryt elektromotora':typeNames[e.type])}</span></div>${ib('dots', 'element-menu', 'Možnosti vybraného prvku')}</div>
      <div class="inspector-tabs"><button data-action="inspector-geometry" class="${state.inspectorTab === 'geometry' ? 'is-active' : ''}">Geometria</button><button data-action="inspector-joints" class="${state.inspectorTab === 'joints' ? 'is-active' : ''}">Väzby <span>${joints.length}</span></button></div>
      <div class="inspector-body">${state.inspectorTab === 'geometry' ? geometry : jointContent}
        ${section('Aktuálny stav', `<div class="live-properties"><div><span>Poloha X</span><strong id="live-x">${fmt(pose?.a.x)} <small>mm</small></strong></div><div><span>Poloha Y</span><strong id="live-y">${fmt(pose?.a.y)} <small>mm</small></strong></div><div class="highlight"><span>Uhol natočenia</span><strong id="live-angle">${fmt(pose?.angle)}<small>°</small></strong></div></div>`, '<span class="section-live-dot"></span>')}
        ${section('Trajektória', `${isDoubleDrawer() ? doubleTraceControls() : ''}<label class="check-row"><input id="trace-selected" type="checkbox"${state.trace && state.traceMode === 'single' && state.traceRef.elementId === e.id ? ' checked' : ''}/><span>Sledovať len bod tohto prvku</span></label><label class="property-field"><span>Referenčný bod</span><select class="property-select" id="trace-point">${I.pointKeys(e).filter((key) => pose?.[key]).map((point) => `<option value="${point}"${state.traceRef.elementId === e.id && state.traceRef.point === point ? ' selected' : ''}>${e.type === 'panel' && !isDoubleDrawer() ? ({ a: 'B · otočný čap', b: 'C · koniec čela', c: 'A · vodiace ložisko' })[point] : ({ a: 'Začiatok / čap', b: 'Koniec / päta čela', c: 'Pomocný bod / ložisko A' })[point]}</option>`).join('')}</select></label><button class="button button-secondary full-width" data-action="save-trace">Uložiť / upraviť trajektóriu</button>`)}
        ${section('Kóty a uložené trajektórie', `<button class="button button-secondary full-width" data-action="new-dimension">Pridať kótu medzi uzlami</button>${state.project.dimensions.map((d) => `<div class="record-row"><button data-action="edit-dimension" data-id="${escape(d.id)}">${escape(d.name || 'Kóta')} · ${fmt(E.dimensionValue(state.result, d), 2)} ${d.type === 'angle' ? '°' : 'mm'}</button>${ib('trash', 'delete-dimension', 'Odstrániť kótu', false, `data-id="${escape(d.id)}"`)}</div>`).join('')}${state.project.trajectories.map((t) => `<div class="record-row"><button data-action="edit-trace" data-id="${escape(t.id)}">${escape(t.name)}</button>${ib('trash', 'delete-trace', 'Odstrániť trajektóriu', false, `data-id="${escape(t.id)}"`)}</div>`).join('')}`)}
        <div id="inspector-warning" class="inspector-warning"${!state.result.blocked ? ' hidden' : ''}>${icon('warning', 16)}<span>${escape(state.result.issues[0] || '')}</span></div>
      </div>
      <div class="inspector-footer"><button class="button button-secondary" data-action="duplicate">${icon('copy', 15)}Duplikovať</button>${!e.primary ? ib('trash', 'delete', 'Odstrániť vybraný prvok') : '<span class="bound-tag">' + icon('link', 13) + 'Viazaný prvok</span>'}</div>
    `;
  }
