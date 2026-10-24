/* Kinematika UI · Kontextové ponuky podľa typu entity.
   Klasický skript bez IIFE: zdieľa najvyššiu úroveň s ostatnými app/*.js a app.js, ktorý sa načíta posledný
   a definuje stav a konštanty. Súbor obsahuje iba deklarácie funkcií, pri načítaní nič nespúšťa. */
'use strict';
  // Every entity type has its own short menu: actions typical for the type first, shared edits next, removal last.
  // Unavailable actions are left out; each action has exactly one home (a joint owns its type, a body owns its drive).
  function contextItems(t) {
    const items = elementContextItems(t).filter(Boolean), actions = items.filter((i) => !i.separator);
    if (window.innerWidth <= 640 && actions.length > 7) {
      const common = actions.slice(0, 5);
      return markPrimary([...common, { label: 'Ďalšie možnosti…', items: items.filter((i) => !common.includes(i)) }], t);
    }
    return markPrimary(tidyMenu(items), t);
  }
  // The main edit of an entity type, opened by double click or Enter; it is always one of the menu items.
  function primaryAction(t) {
    if (!t) return 'fit';
    if (t.type === 'joint') return 'edit-joint';
    if (t.type === 'dimension') return 'edit-dimension';
    if (t.element?.primary) return t.type === 'link' ? 'inspect' : null;
    if (['control', 'outline'].includes(t.type)) return 'part-point';
    if (t.type === 'path') return 'curve-add-control';
    if (I.reference(t)) return 'coordinates';
    const e = t.element;
    return e.role === 'motor-housing' || e.type === 'motor' ? 'motor-spec' : e.type === 'cam' ? 'cam-profile' : e.type === 'slot' ? 'edit-path' : 'inspect';
  }
  function menuHas(items, id) {
    return items.some((item) => item.id === id && !item.disabled || item.items && menuHas(item.items, id));
  }
  function markPrimary(items, t) {
    const id = primaryAction(t);
    const mark = (list) => list.map((item) => (item.items ? { ...item, items: mark(item.items) } : item.id === id && !item.shortcut ? { ...item, shortcut: 'Dvojklik' } : item));
    return id && menuHas(items, id) ? mark(items) : items;
  }
  // Drops leading, trailing and doubled separators left after optional items were omitted.
  function tidyMenu(items) {
    return items.filter((item, i, list) => !item.separator || i > 0 && i < list.length - 1 && !list[i - 1].separator);
  }
  function elementContextItems(t) {
    if (!t) return canvasMenu();
    if (t.type === 'joint') return jointMenu(t);
    if (t.type === 'dimension') return [{ id: 'edit-dimension', label: 'Upraviť rozmerovú kótu…' }, { separator: true }, { id: 'delete-dimension', label: 'Vymazať iba túto kótu', danger: true }];
    if (t.element?.primary) return templateMenu(t);
    if (['control', 'outline'].includes(t.type)) return curvePointMenu(t);
    if (t.type === 'path') return pathMenu(t);
    if (I.reference(t)) return nodeMenu(t);
    return selectedBodyCount(t) > 1 ? selectionMenu(t) : bodyMenu(t);
  }
  function memberLink(t) {
    return { id: `pick:${I.elementKey(t.elementId)}`, label: `Celý člen „${t.element.name}“…` };
  }
  function selectedBodyCount(t) {
    const bodies = state.selectedElementIds.filter((key) => ['link', 'path'].includes(I.target(state.project, key)?.type));
    return memberSelected(t.elementId) ? bodies.length : 0;
  }
  function canvasMenu() {
    return [
      { id: 'add-node', label: 'Pridať voľný uzol' }, { id: 'add-ground', label: 'Pridať pevný bod (Ground)' },
      { id: 'add-guide', label: 'Pridať lineárne vedenie' }, { separator: true },
      { label: 'Vložiť podzostavu', items: [{ id: 'assembly-fourbar', label: 'Štvorkĺb' }, { id: 'assembly-crank', label: 'Kľuka s piestom' }] },
      { id: 'open-library', label: 'Vložiť z vlastnej knižnice…' },
      { separator: true }, { id: 'fit', label: 'Prispôsobiť pohľad', shortcut: 'Shift+F' },
    ];
  }
  // Protected template: one way out instead of a list of disabled edits.
  function templateMenu(t) {
    const r = I.reference(t);
    return [
      { id: 'copy-editable', label: 'Vytvoriť voľnú kópiu na úpravy' },
      { label: 'Šablóna je chránená · úpravy vo voľnej kópii', disabled: true },
      { separator: true },
      t.type === 'link' ? { id: 'inspect', label: 'Vlastnosti prvku…' } : null,
      r ? { id: 'trace-node', label: 'Sledovať trajektóriu bodu…' } : null,
    ];
  }
  function jointMenu(t) {
    const j = t.joint, ends = { label: 'Vybrať pripojený bod', items: [j.a, j.b].map((r) => ({ id: `pick:${I.nodeKey(r)}`, label: `${state.project.elements.find((e) => e.id === r.elementId)?.name} · ${K.pointName(r.point)}` })) };
    if (j.builtin) return [{ id: 'copy-editable', label: 'Vytvoriť voľnú kópiu na úpravy' }, { separator: true }, ends];
    const type = j.type || 'revolute', mark = (value) => (type === value ? ' ✓' : '');
    return [
      { label: 'Typ väzby', items: [
        { id: 'joint-revolute', label: `Otočný kĺb (Revolute)${mark('revolute')}` },
        { id: 'joint-prismatic', label: `Posuvný kĺb (Prismatic)${mark('prismatic')}` },
      ] },
      ['revolute', 'prismatic'].includes(type) ? { id: 'limits', label: 'Pohybové limity…' } : null,
      { id: 'edit-joint', label: 'Upraviť väzbu · typ, body a hodnota…' },
      ends,
      { separator: true },
      { id: 'delete', label: 'Odstrániť iba túto väzbu', danger: true, shortcut: 'Del' },
    ];
  }
  function curvePointMenu(t) {
    const control = t.type === 'control', points = control ? I.controlPoints(state.project, t.element) : t.element.outline;
    const minimum = control ? t.element.curveKind === 'spline' ? 4 : 2 : 3, letter = control ? 'P' : 'V';
    return [
      { id: 'part-point', label: `Lokálne súradnice ${letter}${t.index}…` },
      control && t.element.curveKind !== 'arc' && points.length < (t.element.curveKind === 'polyline' ? 1001 : 32) ? { id: 'control-add-after', label: `Pridať bod za P${t.index}` } : null,
      control ? { id: 'curve-semicircle', label: 'Previesť kulisu na polkruh s R…' } : null,
      { separator: true }, memberLink(t),
      points.length > minimum ? { separator: true } : null,
      points.length > minimum ? { id: control ? 'control-delete' : 'outline-delete', label: `Odstrániť iba ${letter}${t.index}`, danger: true } : null,
    ];
  }
  function pathMenu(t) {
    const e = t.element, slot = e.type === 'slot';
    return [
      slot && e.curveKind !== 'arc' && e.controls.length < (e.curveKind === 'polyline' ? 1001 : 32) ? { id: 'curve-add-control', label: 'Pridať riadiaci bod tu' } : null,
      slot ? { id: 'curve-semicircle', label: e.curveSemicircle ? 'Polkruh · upraviť R a stranu…' : 'Previesť dráhu na polkruh s R…' } : null,
      slot ? { id: 'edit-path', label: 'Upraviť body vodiacej dráhy…' } : null,
      { separator: true }, memberLink(t),
    ];
  }
  function nodeMenu(t) {
    const r = I.reference(t), e = t.element, root = I.root(state.project, e), refs = contextNodeReferences(r);
    const joints = state.project.connections.filter((j) => sameReference(j.a, r) || sameReference(j.b, r));
    const drivable = !K.isElastic(e) && !(e.parentId && e.type !== 'motor') && !['ground', 'slot'].includes(e.type) && !['ct', 'cb'].includes(r.point);
    const limited = root?.drive || joints.some((j) => !j.builtin && ['revolute', 'prismatic'].includes(j.type));
    const pointOnly = ['bearing', 'node'].includes(e.type);
    return [
      { id: 'selection-connect', label: 'Spojiť s iným bodom…', shortcut: 'J' },
      K.isElastic(e) ? null : { id: 'joint-new-prismatic', label: 'Posuvný kĺb po vedení…' },
      joints.length ? { label: `Väzby uzla (${joints.length})`, items: joints.map((j) => ({ id: `pick:${I.jointKey(j.id)}`, label: `${j.name} · ${E.constraintNames[j.type] || j.type}` })) } : null,
      { id: 'fix', label: `${refs.every((v) => I.fixed(state.project, v)) ? 'Uvoľniť' : 'Ukotviť'}${refs.length > 1 ? ` vybrané uzly (${refs.length})` : ' uzol'}`, shortcut: 'F' },
      drivable ? { id: 'motor', label: 'Priradiť / upraviť pohon…' } : null,
      limited ? { id: 'limits', label: 'Pohybové limity…' } : null,
      K.isElastic(e) ? { id: 'elastic-fit', label: 'Prispôsobiť pracovný rozsah montáži' } : null,
      { separator: true },
      pointOnly ? { id: 'inspect', label: 'Vlastnosti prvku…' } : null,
      pointOnly && W.thickness(e) ? { id: 'thickness', label: 'Hrúbka / priemer…' } : null,
      { label: 'Poloha a zarovnanie', items: [{ id: 'coordinates', label: 'Absolútne súradnice XYZ…' }, { id: 'snap', label: 'Prichytiť na mriežku (5 mm)' }, { id: 'align-x', label: 'Rovnaké X, zvislo' }, { id: 'align-y', label: 'Rovnaké Y, vodorovne' }, { id: 'axis-x', label: 'Na os X (Y = 0)' }, { id: 'axis-y', label: 'Na os Y (X = 0)' }] },
      { id: 'trace-node', label: 'Sledovať trajektóriu bodu…' },
      pointOnly ? null : memberLink(t),
      { separator: true },
      joints.some((j) => !j.builtin) ? { id: 'disconnect', label: 'Odpojiť naviazané väzby' } : null,
      pointOnly ? { id: 'delete', label: 'Odstrániť iba tento uzol', danger: true, shortcut: 'Del' } : null,
    ];
  }
  // Type-specific actions come first; they are what the body is right-clicked for.
  function bodyTypeItems(e) {
    if (e.role === 'motor-housing') return [{ id: 'motor-check', label: 'Overiť motor…' }, { id: 'motor-spec', label: 'Parametre elektromotora…' }];
    if (e.type === 'motor') return [{ id: 'spin', label: 'Zapnúť motor' }, { id: 'motor-check', label: 'Overiť motor…' }, { id: 'motor-spec', label: 'Parametre elektromotora…' }];
    if (e.type === 'cam') return [{ id: 'spin', label: 'Zapnúť otáčanie' }, { id: 'cam-profile', label: 'Tvar, polomer a zdvih vačky…' }, { id: 'surface-contact', label: 'Kontaktná plocha…' }, { id: 'cam-follower', label: 'Pridať vedený valčekový sledovač' }];
    if (e.type === 'slot') return [{ id: 'edit-path', label: 'Upraviť body vodiacej dráhy…' }, { id: 'curve-semicircle', label: e.curveSemicircle ? 'Polkruh · upraviť R a stranu…' : 'Previesť dráhu na polkruh s R…' }];
    if (e.type === 'rail') return e.parentId ? [] : [{ id: 'rail-motion', label: e.movingRail ? 'Pohyblivý vozík, pevné vedenie' : 'Pohyblivé vedenie, pevný vozík' }];
    if (K.isElastic(e)) return [{ id: 'elastic-fit', label: 'Prispôsobiť pracovný rozsah montáži' }];
    if (e.type === 'link') return [!e.outline?.length ? { id: 'split', label: 'Rozdeliť rameno v polovici' } : null, { id: 'poi', label: 'Pridať bod záujmu (POI) a dráhu' }];
    if (e.type === 'panel') return [{ id: 'poi', label: 'Pridať bod záujmu (POI) a dráhu' }];
    return [];
  }
  function bodyMenu(t) {
    const e = t.element, family = W.descendants(state.project, [t.elementId]);
    const joints = state.project.connections.filter((j) => [j.a, j.b].some((r) => family.has(r.elementId)));
    const drivable = e.role !== 'motor-housing' && !K.isElastic(e) && !(e.parentId && e.type !== 'motor') && !['ground', 'slot'].includes(e.type);
    const driveKeys = drivable ? I.pointKeys(e).filter((key) => ['cam', 'motor'].includes(e.type) ? key === 'a' : ['a', 'b'].includes(key) || key === 'c' && e.type === 'panel') : [];
    const fixable = !K.isElastic(e) && !['slot', 'rail'].includes(e.type);
    return [
      ...bodyTypeItems(e),
      driveKeys.length ? { label: 'Priradiť / upraviť pohon na uzle', items: driveKeys.map((key) => ({ id: `motor-${key}`, label: `Uzol ${K.pointName(key, e)}` })) } : null,
      { separator: true },
      { id: 'inspect', label: K.isElastic(e) ? 'Rozmery, sila a tlmenie…' : 'Vlastnosti prvku…' },
      W.thickness(e) ? { id: 'thickness', label: 'Hrúbka / priemer…' } : null,
      fixable ? { id: 'fix-body', label: e.locked || e.type === 'ground' ? 'Uvoľniť celé teleso' : 'Ukotviť celé teleso' } : null,
      { id: 'coordinates', label: 'Súradnice začiatku A…' },
      e.rigidAssemblyId ? { id: 'select-assembly', label: 'Vybrať celú pevnú zostavu' } : null,
      e.rigidAssemblyId ? { id: 'unbind-rigid', label: 'Rozpojiť zostavu' } : null,
      joints.length ? { label: `Väzby člena a jeho bodov (${joints.length})`, items: joints.map((j) => ({ id: `pick:${I.jointKey(j.id)}`, label: `${j.name} · ${E.constraintNames[j.type] || j.type}` })) } : null,
      { separator: true },
      joints.length || e.parentId ? { id: 'disconnect-body', label: 'Odpojiť všetky väzby tohto člena a jeho bodov' } : null,
      { id: 'delete', label: 'Odstrániť tento člen a jeho väzby', danger: true, shortcut: 'Del' },
    ];
  }
  // Several selected bodies: actions for the group, not for the body under the cursor.
  function selectionMenu(t) {
    const keys = contextDeleteKeys(t), rigid = t.element.rigidAssemblyId;
    return [
      { id: 'bind-rigid', label: 'Spojiť do pevnej zostavy' },
      rigid ? { id: 'unbind-rigid', label: 'Rozpojiť zostavu' } : null,
      { id: 'isolate', label: 'Izolovať výber' },
      { id: 'save-library', label: 'Uložiť výber do knižnice…' },
      { separator: true },
      memberLink(t),
      { separator: true },
      { id: 'delete', label: `Odstrániť celý výber (${keys.length})…`, danger: true, shortcut: 'Del' },
    ];
  }
