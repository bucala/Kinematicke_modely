import test from 'node:test';
import assert from 'node:assert/strict';
import '../engine.js';
import '../double-drawer.js';
import '../editor.js';
import '../interaction.js';
import '../workbench.js';
import '../magic-import.js';
import '../exports.js';
import '../workflow.js';
import '../physics.js';
const K = globalThis.Kinematics, E = KinmoEditor, I = KinmoInteraction, F = KinmoWorkflow, M = KinmoMagicImport;
const near = (a, b) => assert(Math.abs(a - b) < .001, `${a} != ${b}`);
const custom = (...elements) => K.validateProject({ ...K.preset('custom'), elements });
const raster = 'data:image/jpeg;base64,/9j/2Q==';
test('Magic Finish embeds a portable reference with the original calibrated world rectangle', () => {
  const image = { width: 800, height: 400, dataURL: raster, name: 'Kinka.jpg' }, scale = M.calibration(image, { x: 100, y: 50 }, { x: 500, y: 50 }, 200);
  const p = M.finish(custom(K.makeElement('link')), image, scale, 'Z predlohy');
  assert.equal(p.importReference.frames[0].dataURL, raster); assert.equal(p.importReference.frames[0].rect.x, -50); assert.equal(p.importReference.frames[0].rect.y, -25); assert.equal(p.importReference.frames[0].rect.width, 400);
  assert.equal(p.importReference.kind, 'magic'); assert(p.importReference.visible);
  const restored = KinmoExport.parseNative(KinmoExport.serializeNative(p)).project;
  assert.deepEqual(restored.importReference, p.importReference);
});
test('Reference validation rejects SVG, external URLs, oversized content and invalid opacity/selection', () => {
  const p = custom(), reference = { kind: 'magic', frames: [{ name: 'Podklad', dataURL: raster, rect: { x: 0, y: 0, width: 100, height: 100 } }] };
  for (const dataURL of ['https://example.org/a.jpg', 'data:image/svg+xml;base64,AAAA', 'data:image/jpeg;base64,' + 'A'.repeat(350001)]) assert.throws(() => K.validateProject({ ...p, importReference: { ...reference, frames: [{ ...reference.frames[0], dataURL }] } }));
  for (const r of [{ ...reference, opacity: 0 }, { ...reference, active: .5 }, { ...reference, active: 1 }, { ...reference, frames: Array(5).fill(reference.frames[0]) }]) assert.throws(() => K.validateProject({ ...p, importReference: r }));
  assert(!custom().importReference);
});
test('Pose alignment accounts for camera scale, rotation and translation', () => {
  const map = F.frameTransform({ a: { x: 20, y: 30 }, b: { x: 120, y: 30 } }, { a: { x: 50, y: 80 }, b: { x: 50, y: 280 } });
  const a = map({ x: 50, y: 80 }), b = map({ x: 50, y: 280 }); near(a.x, 20); near(a.y, 30); near(b.x, 120); near(b.y, 30);
  assert.throws(() => F.frameTransform({ a, b }, { a, b: a }));
});
const lineCandidate = (id, a, b, width = 8) => ({ id, type: 'link', points: [a, b], outline: [], width, radius: 4, selected: true, confidence: .7, evidence: {} });
test('Multiple aligned poses distinguish stationary, translating and pivoting members without changing types or selecting uncertain matches', () => {
  const candidates = [lineCandidate('fixed', { x: 0, y: 0 }, { x: 100, y: 0 }, 20), lineCandidate('slide', { x: 0, y: 100 }, { x: 50, y: 100 }, 10), lineCandidate('rotate', { x: 200, y: 100 }, { x: 240, y: 100 }, 5)];
  const other = K.copy(candidates); other[1].points = [{ x: 20, y: 100 }, { x: 70, y: 100 }]; other[2].points = [{ x: 200, y: 100 }, { x: 200, y: 60 }];
  const calibration = { a: { x: 0, y: 0 }, b: { x: 100, y: 0 } }, before = JSON.stringify(candidates), result = F.comparePoses(candidates, [{ candidates: other, alignment: calibration }], calibration);
  assert.deepEqual(result.map((c) => c.motionEvidence.kind), ['fixed', 'translation', 'rotation']); assert.equal(result[2].motionEvidence.pivot, 'a'); assert.equal(result[0].type, 'link'); assert.equal(JSON.stringify(candidates), before);
  const ambiguous = F.comparePoses([candidates[0]], [{ candidates: [candidates[0], { ...candidates[0], id: 'duplicate' }], alignment: calibration }], calibration);
  assert.equal(ambiguous[0].motionEvidence.kind, 'uncertain'); assert.equal(ambiguous[0].motionEvidence.matches, 0);
});
test('Joining fragments retains distinct pins and splitting a polygon partitions its outline and anchors', () => {
  const a = F.candidate([{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 20 }, { x: 0, y: 20 }], 'panel', [{ x: 10, y: 10, radius: 3 }]);
  const b = F.candidate([{ x: 40, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 20 }, { x: 40, y: 20 }], 'panel', [{ x: 70, y: 10, radius: 3 }]);
  const original = JSON.stringify([a, b]), joined = F.mergeCandidates([a, b], [a.id, b.id]); assert.equal(joined.length, 1); assert.equal(joined[0].anchors.length, 2); assert.equal(JSON.stringify([a, b]), original);
  const split = F.splitCandidate(joined, joined[0].id, { x: 40, y: 10 }); assert.equal(split.length, 2); assert.equal(split.reduce((n, c) => n + c.anchors.length, 0), 2); assert(split.every((c) => c.outline.length >= 3));
  assert.throws(() => F.splitCandidate(joined, joined[0].id, { x: 0, y: 0 }));
});
test('Manual geometry rejects degenerate outlines and circular fragments cannot be merged into a body', () => {
  assert.throws(() => F.candidate([{ x: 1, y: 1 }, { x: 1, y: 1 }])); assert.throws(() => F.candidate([{ x: NaN, y: 1 }, { x: 5, y: 1 }]));
  const c = F.candidate([{ x: 0, y: 0 }, { x: 50, y: 0 }]); assert.throws(() => F.mergeCandidates([c, { id: 'pin', points: [{ x: 0, y: 0 }] }], [c.id, 'pin']));
});
for (const type of ['rail', 'link', 'slot', 'panel']) test(`Ready ${type} assembly has valid real connections and retains dimensions when inserted`, () => {
  const model = F.kit(type, 160, 30, type !== 'slot'); assert(model.connections.length >= 1); assert.equal(K.validateProject(model).elements[0].id, model.elements[0].id);
  const before = custom(), result = F.insertKit(before, type, { x: 200, y: 100 }, 160, 30, true); assert.equal(before.elements.length, 0); assert(result.added.every((id) => result.project.elements.some((e) => e.id === id))); near(result.project.elements[0].x, 200); near(result.project.elements[0].y, 100);
  if (type !== 'slot') { assert.equal(E.freedom(model, K.solve(model, 0, { collisions: false })).free, 0); assert(!K.solve(model, K.driveRange(model).max / 2, { collisions: false }).blocked); }
});
test('Assembly insertion preserves the existing single motor and does not silently add a second', () => {
  const p = F.kit('link', 120, 25, true), next = F.insertKit(p, 'rail', { x: 300, y: 100 }, 120, 25, true).project;
  assert.equal(next.elements.filter((e) => e.drive).length, 1); assert.equal(next.elements.find((e) => e.drive).id, p.elements.find((e) => e.drive).id);
});
test('Freedom vectors describe a free point and the remaining rotation about a grounded pivot', () => {
  const node = K.makeElement('node'), p = custom(node), free = E.freedom(p, E.design(p, 0)); assert.equal(free.free, 2); assert.equal(free.directions[0].vectors.length, 2); assert(free.directions[0].vectors.every((v) => !v.angle));
  const arm = F.kit('link', 120, 25, false), fixed = E.freedom(arm, E.design(arm, 0)); assert.equal(fixed.free, 1); assert(fixed.directions.find((d) => d.elementId === arm.elements[1].id).vectors.some((v) => Math.abs(v.angle) > 0));
});
test('Trial follows the real solver while preserving every byte of the project', () => {
  const p = F.kit('rail', 120, 25, true), before = JSON.stringify(p), next = F.trial(p, 0, 150, { collisions: false });
  assert(!next.blocked); near(next.motion, 150); near(next.result.poses[p.elements[0].id].c.x, 60); assert.equal(JSON.stringify(p), before);
});
test('Trial stops before a blocked interval even when the final requested position is feasible', () => {
  const p = custom(), solve = (motion) => ({ motion, blocked: motion >= 50 && motion <= 70, poses: {}, invalid: [], collisions: [], issues: ['Doraz'] });
  const next = F.trial(p, 0, 100, { solve }); assert(next.blocked); assert(next.motion < 50 && next.motion > 49.99); assert(!next.result.blocked);
  const reverse = F.trial(p, 100, 0, { solve }); assert(reverse.blocked); assert(reverse.motion > 70 && reverse.motion < 70.01);
  assert.equal(F.trial(p, 60, 90, { solve }).motion, 60);
});
test('Consequence preview reports dependencies and preserving the shown pose leaves the source untouched', () => {
  const p = F.kit('link', 120, 25, true), result = K.solve(p, 45, { collisions: false }), next = I.disconnect(p, { elementId: p.elements[1].id, point: 'a' }, result), impact = F.impact(p, next, result);
  assert.equal(impact.joints.length, 1); assert.equal(p.connections.length, 1);
  const kept = F.keepPose(next, result), shown = K.solve(kept, 45, { collisions: false }); near(shown.poses[p.elements[1].id].a.x, result.poses[p.elements[1].id].a.x); near(shown.poses[p.elements[1].id].b.y, result.poses[p.elements[1].id].b.y);
});
test('Phase timing, holds, reversal and smooth interpolation survive native export', () => {
  const p = F.kit('rail', 120, 25, true); p.motionPlan = { unit: 'mm', phases: [{ name: 'Sklopiť', from: 0, to: 60, duration: 2, easing: 'linear' }, { name: 'Počkať', from: 60, to: 60, duration: 1, easing: 'linear' }, { name: 'Vysunúť', from: 60, to: 300, duration: 3, easing: 'smooth' }, { name: 'Späť', from: 300, to: 0, duration: 2, easing: 'linear' }] };
  const validated = K.validateProject(p); near(F.planAt(validated, 1).motion, 30); near(F.planAt(validated, 2.5).motion, 60); near(F.planAt(validated, 4.5).motion, 180); near(F.planAt(validated, 7).motion, 150); near(F.planAt(validated, 8).motion, 0);
  assert.equal(K.projectPhases(validated)[2].name, 'Počkať'); assert.deepEqual(KinmoExport.parseNative(KinmoExport.serializeNative(validated)).project.motionPlan, validated.motionPlan);
});
test('Phase validation rejects jumps, wrong units, unordered limits and invalid durations', () => {
  const p = F.kit('rail', 120, 25, true), phase = { name: 'Pohyb', from: 0, to: 100, duration: 1 };
  for (const plan of [{ unit: '°', phases: [phase] }, { unit: 'mm', phases: [{ ...phase, duration: 0 }] }, { unit: 'mm', phases: [phase, { ...phase, from: 90 }] }, { unit: 'mm', phases: [{ ...phase, to: 400 }] }]) assert.throws(() => K.validateProject({ ...p, motionPlan: plan }));
});
test('Deleting the motor clears dependent phase definitions instead of preventing deletion', () => {
  const p = F.kit('link', 120, 25, true); p.motionPlan = { unit: '°', phases: [{ name: 'Otočiť', from: 0, to: 90, duration: 1 }] };
  const next = I.deleteSelection(K.validateProject(p), [I.elementKey(p.elements[1].id)]); assert(!next.motionPlan); assert.equal(next.elements.length, 1);
});
test('Keeping a rotary motor pose for the editor preserves the visible endpoints at nonzero motion', () => {
  const p = F.kit('link', 120, 25, true), shown = K.solve(p, 45, { collisions: false });
  const kept = F.keepPose(p, shown, { design: true }), after = E.design(kept, 45);
  near(after.poses[p.elements[1].id].b.x, shown.poses[p.elements[1].id].b.x); near(after.poses[p.elements[1].id].b.y, shown.poses[p.elements[1].id].b.y);
});
test('Recalibration scales portable reference placement and millimeter phases with the model', () => {
  const p = F.kit('rail', 120, 25, true), image = { width: 800, height: 400, name: 'Podklad', dataURL: raster }, oldScale = M.calibration(image, { x: 0, y: 0 }, { x: 800, y: 0 }, 400), newScale = M.calibration(image, { x: 0, y: 0 }, { x: 800, y: 0 }, 800);
  const imported = M.finish(p, image, oldScale, 'Schéma'); imported.motionPlan = { unit: 'mm', phases: [{ name: 'Posuv', from: 0, to: 150, duration: 2 }] };
  const scaled = M.rescale(imported, oldScale, newScale); near(scaled.importReference.frames[0].rect.width, 800); near(scaled.motionPlan.phases[0].to, 300); assert.equal(scaled.importReference.frames[0].dataURL, raster);
});
test('Captured reusable assembly omits the full project image and its playback plan', () => {
  const p = F.kit('rail', 120, 25, true); p.importReference = { kind: 'magic', visible: true, opacity: .35, active: 0, frames: [{ name: 'Fotografia', dataURL: raster, rect: { x: 0, y: 0, width: 100, height: 100 } }] }; p.motionPlan = { unit: 'mm', phases: [{ name: 'Pohyb', from: 0, to: 150, duration: 1 }] };
  const record = KinmoWorkbench.captureAssembly(p, p.elements.map((e) => I.elementKey(e.id)), 'Vozík'); assert(!record.file.project.importReference); assert(!record.file.project.motionPlan); assert(p.importReference && p.motionPlan);
});
test('Invalid trial inputs cannot return NaN geometry or enter a solver loop', () => {
  assert.throws(() => F.trial(custom(), 0, NaN)); assert.throws(() => F.trial(custom(), Infinity, 0));
});
test('Trial checks sampled blocked positions narrower than its uniform scan interval', () => {
  const solve = (motion) => ({ motion, blocked: motion > 50.2 && motion < 50.4, poses: {}, invalid: [], collisions: [], issues: ['Kolízia'] });
  const result = F.trial(custom(), 0, 100, { solve, samples: [{ motion: 50.3 }] }); assert(result.blocked); assert(result.motion <= 50.2 && result.motion > 50.19);
});

test('Node connection gesture ranks all overlapping supports and excludes its own body and existing joints', () => {
  const a=K.makeElement('link',0,0),b=K.makeElement('ground',200,0),c=K.makeElement('node',200,0),p=custom(a,b,c),r={elementId:a.id,point:'a'},pose=E.design(p,0);
  const choices=F.connectionChoices(p,r,pose,{x:200,y:1},8,true);assert.equal(choices.length,2);assert(choices.every(v=>v.direct&&v.source.ref.elementId===a.id));
  const moved=I.translate(p,[I.elementKey(a.id)],choices[0].delta,pose),joined=KinmoWorkbench.connectSnap(moved,choices[0],'revolute');assert.equal(joined.connections.length,1);assert.equal(p.connections.length,0);
  assert(!F.connectionChoices(joined,r,E.design(joined,0),{x:200,y:0},8).some(v=>v.target.elementId===choices[0].target.elementId));
});
test('Applying a simulated rail pose to the draft preserves both rail ends and carriage in either mounting mode', () => {
  for(const movingRail of [false,true]){const rail=K.makeElement('rail',0,0);Object.assign(rail,{drive:true,movingRail,length:300,stroke:120,carriageOffset:30,angle:30});const p=custom(rail),pose=K.solve(p,100,{collisions:false}),next=F.bakePose(p,pose),after=E.design(next,0);for(const key of ['a','b','c'])near(K.distance(pose.poses[rail.id][key],after.poses[rail.id][key]),0);assert.equal(rail.carriageOffset,30);}
});
test('Baking force-driven elastic runtime length preserves joints and original spring properties', () => {
  const anchor=K.makeElement('ground',0,0),e=K.makeElement('spring-compression',0,0);e.mountA={elementId:anchor.id,point:'a'};const p=custom(anchor,e),context=KinmoPhysics.prepare(p),s=KinmoPhysics.initialState(context),id=context.network.graph.ports[e.id+':b'],held=KinmoPhysics.dragTip(context,s,id,{x:120,y:0}),pose=K.solve(p,0,{elasticPositions:KinmoPhysics.elasticPositions(held)}),next=F.bakePose(p,pose);
  near(next.elements.find(v=>v.id===e.id).length,120);near(next.elements.find(v=>v.id===e.id).restLength,160);assert.equal(p.elements[1].length,160);assert.throws(()=>F.bakePose(p,{...pose,blocked:true}));
});
test('Reference calibration anchors A and optionally scales all geometry and dimensions once', () => {
  const e=K.makeElement('link',20,30),p=custom(e);p.importReference={kind:'magic',visible:true,opacity:.35,active:0,frames:[{name:'Test',dataURL:raster,rect:{x:0,y:0,width:400,height:200}}]};
  const a={x:100,y:50},b={x:200,y:50},image=F.calibrateReference(p,a,b,200),model=F.calibrateReference(p,a,b,200,true);
  near(image.importReference.frames[0].rect.x,-100);near(image.importReference.frames[0].rect.width,800);near(image.elements[0].length,e.length);
  near(model.importReference.frames[0].rect.width,800);near(model.elements[0].x,-60);near(model.elements[0].y,10);near(model.elements[0].length,e.length*2);assert.equal(p.importReference.frames[0].rect.width,400);
  assert.throws(()=>F.calibrateReference(p,a,a,100));
});
test('Piston and spring-arm kits remap every internal mount, simulate without a motor and leave the host unchanged', () => {
  for(const type of ['piston','spring-arm']) {const host=custom(),inserted=F.insertKit(host,type,{x:300,y:80},160,20,false),ids=new Set(inserted.added);assert.equal(host.elements.length,0);
    for(const e of inserted.project.elements.filter(K.isElastic))for(const r of [e.mountA,e.mountB])assert(ids.has(r.elementId));
    const pose=K.solve(inserted.project,0,{collisions:false});assert(!pose.blocked);assert.doesNotThrow(()=>KinmoPhysics.prepare(inserted.project,{collisions:false}));
  }
});
test('Return response separates slow settling from oscillation and never edits the element', () => {
  const e=K.makeElement('spring-compression'),before=JSON.stringify(e),slow=F.response(e,1,500),oscillating=F.response(e,1,1);
  assert(slow.rows.length>50&&oscillating.rows.length>50);assert(slow.rows.at(-1).length>slow.rows[0].length);assert(oscillating.rows.some(r=>r.length>e.restLength));assert.equal(JSON.stringify(e),before);assert.throws(()=>F.response(e,0,5));
});
test('Diagnostic repair suggestions identify redundant joints and elastic stroke issues precisely', () => {
  const a=K.makeElement('link'),b=K.makeElement('ground'),e=K.makeElement('spring-extension');e.mountA={elementId:b.id,point:'a'};e.mountB={elementId:a.id,point:'b'};const p=custom(a,b,e);a.length=400;p.elements[0].length=400;
  const j={id:K.uid(),type:'revolute',name:'Čap',value:0,a:{elementId:a.id,point:'a'},b:{elementId:b.id,point:'a'}};p.connections=[j,{...j,id:K.uid()}];const fixes=F.repairSuggestions(p,E.design(p,0));assert(fixes.some(f=>f.action==='remove-duplicate'&&f.key===I.jointKey(p.connections[1].id)));assert(fixes.some(f=>f.action==='elastic-range'&&f.key===I.elementKey(e.id)));
});
test('Freedom directions satisfy the linearized joints of a coupled two-arm chain',()=>{
  const ground=K.makeElement('ground',0,0),a=K.makeElement('link',0,0),b=K.makeElement('link',120,0),p=custom(ground,a,b);p.connections=[{id:K.uid(),type:'revolute',value:0,a:{elementId:ground.id,point:'a'},b:{elementId:a.id,point:'a'}},{id:K.uid(),type:'revolute',value:0,a:{elementId:a.id,point:'b'},b:{elementId:b.id,point:'a'}}];const pose=E.design(p,0),freedom=E.freedom(p,pose);assert.equal(freedom.free,2);
  for(let i=0;i<2;i++){const shifted=K.copy(pose),step=1e-5;for(const e of [a,b]){const v=freedom.directions.find(d=>d.elementId===e.id).vectors[i]||{x:0,y:0,angle:0},old=pose.poses[e.id];shifted.poses[e.id]={...old,a:{x:old.a.x+v.x*step,y:old.a.y+v.y*step},angle:old.angle+v.angle*step/K.DEG};shifted.poses[e.id].b=K.worldPoint(shifted.poses[e.id],K.localPoint(old,old.b));}for(const j of p.connections)assert(K.distance(K.point(shifted,j.a),K.point(shifted,j.b))<.00001);}
});

test('Small spring-arm and piston kits have physically usable dimensions and active force',()=>{
  for(const type of ['spring-arm','piston']){const p=F.kit(type,30,5,false),pose=K.solve(p,0,{collisions:false}),e=p.elements.find(K.isElastic);assert(!pose.blocked);assert(Math.abs(KinmoPhysics.axial(e,pose.poses[e.id].length).nominalForce)>0);if(type==='piston')assert(K.pistonGeometry(e).fits);}
});

test('Low damping with an explicit opposing load produces repeated spring oscillations',()=>{
  const e=K.makeElement('spring-compression'),plot=F.response(e,1,1,2,10),equilibrium=e.restLength-10/KinmoPhysics.springRate(e);let crossings=0;
  for(let i=1;i<plot.rows.length;i++)if((plot.rows[i-1].length-equilibrium)*(plot.rows[i].length-equilibrium)<0)crossings++;
  assert(crossings>3);assert.throws(()=>F.response(e,1,1,2,-1));
});
