import test from 'node:test';
import assert from 'node:assert/strict';
import '../engine.js';import '../double-drawer.js';import '../editor.js';import '../interaction.js';import '../workbench.js';import '../physics.js';import '../slot-outline.js';import '../exports.js';import '../workflow.js';import '../advanced.js';import '../usability.js';
const K=globalThis.Kinematics,U=globalThis.KinmoUsability,X=globalThis.KinmoExport;
const custom=(...elements)=>K.validateProject({...K.preset('custom'),elements});
test('Main dimensions ignore hidden geometry, dimensions and labels and retain exact mm extents',()=>{
 const a=K.makeElement('link',10,20);Object.assign(a,{length:100,width:20,angle:0,drive:false});const hidden=K.makeElement('link',4000,4000);hidden.visible=false;
 const p=custom(a,hidden),d=U.mainDimensions(p,K.solve(p,0,{design:true}));
 assert.equal(d.width,120);assert.equal(d.left,0);assert.equal(d.height,20);assert.equal(d.members.length,1);assert.equal(d.members[0].length,100);assert.equal(U.mainDimensions(custom(),K.solve(custom(),0)),null);
});
test('Main dimensions use circular outlines and carriage bodies rather than only node centres',()=>{
 const e=K.makeElement('bearing',30,40);e.radius=15;const p=custom(e),d=U.mainDimensions(p,K.solve(p,0));assert.equal(d.width,30);assert.equal(d.height,30);
 const rail=K.makeElement('rail',0,0);const r=custom(rail),rd=U.mainDimensions(r,K.solve(r,0));assert(rd.height>0);
});
test('Connection preview predicts constrained freedom without editing project or geometry',()=>{
 const a=K.makeElement('ground',0,0),b=K.makeElement('link',0,0);b.drive=false;const p=custom(a,b),before=JSON.stringify(p);
 const review=U.connectionPreview(p,{elementId:a.id,point:'a'},{elementId:b.id,point:'a'},'revolute',0);
 assert.equal(JSON.stringify(p),before);assert.equal(p.connections.length,0);assert.equal(review.project.connections.length,1);assert(review.after<=review.before);assert.match(review.motion,/otáčanie/);assert.equal(review.errors.length,0);
});
test('Connection preview exposes incompatible fixed geometry and rejects same-body links',()=>{
 const a=K.makeElement('ground',0,0),b=K.makeElement('ground',200,0),p=custom(a,b);const review=U.connectionPreview(p,{elementId:a.id,point:'a'},{elementId:b.id,point:'a'},'revolute',0);
 assert(review.result.blocked||review.errors.length);assert.throws(()=>U.connectionPreview(p,{elementId:a.id,point:'a'},{elementId:a.id,point:'b'},'fixed',0),/inom telese/);
});
test('Cycle review locates a failed sample and the actual mounting joint',()=>{
 const a=K.makeElement('ground',0,0),b=K.makeElement('ground',200,0),p=custom(a,b);p.connections=[{id:'bad',name:'Chybný spoj',type:'revolute',a:{elementId:a.id,point:'a'},b:{elementId:b.id,point:'a'},value:0}];const valid=K.validateProject(p),samples=K.sample(valid,5,{collisions:false}),review=U.cycleReview(valid,samples);
 assert.equal(review.count,5);assert(review.failures.length);assert(review.failures[0].keys.includes('j:bad'));assert.equal(review.hasDrive,false);
});
test('Cycle review checks elastic travel even when collision blocking is disabled',()=>{
 const e=K.makeElement('spring-extension',0,0),p=custom(e),a=K.solve(p,0,{design:true}),b=K.copy(a);b.motion=1;b.poses[e.id].length=e.maxLength+20;b.issues=[];b.blocked=false;
 const review=U.cycleReview(p,[a,b]);assert(review.failures.some(f=>f.motion===1&&f.reasons.some(s=>s.includes('zdvih'))));
});
test('Blocker explanations identify fixed members and offer named repairs',()=>{
 const e=K.makeElement('ground',0,0),p=custom(e),result=U.blockers(p,K.solve(p,0));assert(result.rows.some(r=>r.key==='e:'+e.id&&r.message.includes('pevné')));assert(Array.isArray(result.repairs));
});
test('Atomic piston construction enforces storage of the rod and keeps rejected inputs unchanged',()=>{
 const e=K.makeElement('piston-push',0,0),p=custom(e),before=JSON.stringify(p);
 assert.throws(()=>U.elasticConstruction(p,e.id,{minLength:100,maxLength:400,restLength:400}),/nezmestí/);assert.equal(JSON.stringify(p),before);
 const next=U.elasticConstruction(p,e.id,{minLength:180,maxLength:260,restLength:260});assert.equal(next.elements[0].rangeMode,'manual');assert(K.pistonGeometry(next.elements[0]).fits);assert.equal(JSON.stringify(p),before);
});
test('Spring construction rejects a free length outside the working interval',()=>{
 const e=K.makeElement('spring-extension',0,0),p=custom(e);assert.throws(()=>U.elasticConstruction(p,e.id,{minLength:80,maxLength:240,restLength:300}),/Voľná dĺžka/);
 const next=U.elasticConstruction(p,e.id,{minLength:80,maxLength:240,restLength:160});assert.equal(next.elements[0].restLength,160);
});
test('Diagnostic bundle retains a native reproducible model, motion and settings, without photographs',()=>{
 const e=K.makeElement('rail',0,0),p=custom(e),result=K.solve(p,37),before=JSON.stringify(p),bundle=U.issueBundle(p,result,{mode:'simulate',description:'Vozík sa zablokuje',selected:['e:'+e.id],collisions:false});
 assert.equal(bundle.format,'kinematika-issue');assert.equal(bundle.reproduction.motion,37);assert.equal(bundle.description,'Vozík sa zablokuje');const native=X.parseNative(JSON.stringify(bundle.project));assert.equal(native.project.elements[0].id,e.id);assert.equal(native.motion,37);assert.equal(native.workspace.mode,'simulate');assert.equal(native.workspace.collisions,false);assert.equal(JSON.stringify(p),before);assert.equal(bundle.project.project.importReference,undefined);
});

test('Diagnostic restore preserves a moved free body and rejects active or invalid snapshot coordinates',()=>{
 const e=K.makeElement('link',0,0);e.drive=false;const p=custom(e),r=K.solve(p,0);r.poses[e.id].a.x=47;r.poses[e.id].b.x+=47;
 const bundle=U.issueBundle(p,r,{mode:'simulate'}),restored=U.restoreIssue(bundle);assert.equal(restored.result.poses[e.id].a.x,47);assert.equal(restored.native.project.elements[0].x,0);
 bundle.snapshot.poses[e.id].a.x='<script>';assert.throws(()=>U.restoreIssue(bundle),/Neplatný bod/);
});

test('Diagnostic export strips embedded Magic frames without changing the source project',()=>{
 const e=K.makeElement('link',0,0);e.drive=false;const p=custom(e),r=K.solve(p,0);p.importReference={frames:[{url:'data:image/png;base64,PRIVATE_PHOTO'}]};const before=JSON.stringify(p),bundle=U.issueBundle(p,r);
 assert(!JSON.stringify(bundle).includes('PRIVATE_PHOTO'));assert.equal(JSON.stringify(p),before);
});

test('Fixed preview preserves the displayed relative orientation instead of forcing zero degrees',()=>{
 const a=K.makeElement('ground',0,0),b=K.makeElement('link',0,0);b.drive=false;b.angle=35;const p=custom(a,b);
 const review=U.connectionPreview(p,{elementId:a.id,point:'a'},{elementId:b.id,point:'a'},'fixed',0,{design:true});
 assert.equal(review.project.connections[0].value,35);assert(Math.abs(review.result.poses[b.id].angle-35)<1e-3);
});

test('A malformed diagnostic selection is rejected before the caller replaces its project',()=>{
 const e=K.makeElement('link',0,0);e.drive=false;const p=custom(e),bundle=U.issueBundle(p,K.solve(p,0));bundle.reproduction.selected=[{elementId:e.id}];assert.throws(()=>U.restoreIssue(bundle),/Neplatný výber/);
});

test('A blocked fixed shaft support offers a reversible hinge repair with concrete before/after evidence',()=>{
 const motor={...K.makeElement('motor',100,100),drive:true},ground=K.makeElement('ground',100,100);
 const p=K.validateProject({...custom(motor,ground),connections:[{id:'support',name:'Pevná os',type:'fixed',a:{elementId:motor.id,point:'a'},b:{elementId:ground.id,point:'a'},value:0}]});
 const before=JSON.stringify(p),result=K.solve(p,90,{collisions:false}),report=U.blockers(p,result);
 assert.equal(result.blocked,true);assert.ok(report.repairs.some(r=>r.key==='j:support'&&r.action==='release-rotation'));
 const review=U.repairPreview(p,'j:support','release-rotation',90);
 assert.equal(JSON.stringify(p),before);assert.equal(review.before.blocked,true);assert.equal(review.result.blocked,false);
 assert.equal(review.project.connections[0].type,'revolute');assert.equal(review.beforeErrors.length,1);assert.equal(review.afterErrors.length,0);
 assert.deepEqual(review.elementIds,[motor.id,ground.id]);
});
test('Constraint removal preview clears its driving dimension and retains unrelated joints',()=>{
 const a=K.makeElement('ground',0,0),b=K.makeElement('link',50,0);
 let p=custom(a,b);p.connections=[{id:'distance',name:'Rozmer',type:'distance',a:{elementId:a.id,point:'a'},b:{elementId:b.id,point:'a'},value:50}];
 p.dimensions=[{id:'dimension',type:'distance',a:{elementId:a.id,point:'a'},b:{elementId:b.id,point:'a'},offset:20,constraintId:'distance'}];p=K.validateProject(p);
 const review=U.repairPreview(p,'j:distance','remove-constraint',0);
 assert.equal(p.connections.length,1);assert.equal(review.project.connections.length,0);assert.equal(review.project.dimensions[0].constraintId,'');
 assert.ok(review.afterFree>review.beforeFree);
 assert.throws(()=>U.repairPreview(p,'j:distance','remove-duplicate',0),/nadbytočnou/);
 assert.throws(()=>U.repairPreview(p,'j:distance','release-rotation',0),/pevnú/);
 assert.throws(()=>U.repairPreview(p,'j:missing','remove-constraint',0),/neexistuje/);
});
test('Limit repair previews release the stop without replacing the actual hinge',()=>{
 const motor={...K.makeElement('motor',100,100),drive:true},ground=K.makeElement('ground',100,100);
 const p=K.validateProject({...custom(motor,ground),connections:[{id:'hinge',name:'Doraz',type:'revolute',a:{elementId:ground.id,point:'a'},b:{elementId:motor.id,point:'a'},value:0,limitMin:0,limitMax:30}]});
 const review=U.repairPreview(p,'j:hinge','release-limit',90);
 assert.equal(review.before.blocked,true);assert.equal(review.result.blocked,false);assert.equal(review.project.connections[0].type,'revolute');
 assert.equal(review.project.connections[0].limitMax,null);assert.equal(p.connections[0].limitMax,30);
});

const I=globalThis.KinmoInteraction,W=globalThis.KinmoWorkbench,P=globalThis.KinmoPhysics,E=globalThis.KinmoEditor;
const almost=(a,b,tolerance=1e-5)=>assert.ok(Math.abs(a-b)<tolerance,`${a} differs from ${b}`);
const pointNear=(a,b)=>almost(K.distance(a,b),0);
test('Rigid binding preserves a displayed multi-body layout through rotation, translation, serialization and release',()=>{
 const a={...K.makeElement('link',40,60),drive:true,angle:20},b={...K.makeElement('panel',130,110),angle:-35},c={...K.makeElement('bearing',270,90),locked:false};
 const p=custom(a,b,c),before=JSON.stringify(p),pose=K.solve(p,45,{collisions:false});
 let joined=I.bindRigid(p,[a,b,c].map(e=>'e:'+e.id),'Rám ramena',pose);
 assert.equal(JSON.stringify(p),before);assert.equal(new Set(joined.elements.map(e=>e.rigidAssemblyId)).size,1);
 // Re-evaluating the same motor phase must preserve every displayed endpoint.
 const initial=K.solve(joined,45,{collisions:false});for(const e of p.elements)for(const key of K.pointKeys(e))pointNear(initial.poses[e.id][key],pose.poses[e.id][key]);
 joined=X.parseNative(X.serializeNative(joined)).project;
 const rotated=K.solve(joined,135,{collisions:false});
 almost(rotated.poses[b.id].angle-initial.poses[b.id].angle,90);
 almost(K.distance(rotated.poses[a.id].a,rotated.poses[b.id].a),K.distance(initial.poses[a.id].a,initial.poses[b.id].a));
 const moved=I.translate(joined,['e:'+b.id],{x:23,y:-17},rotated),m=K.solve(moved,135,{collisions:false});pointNear(m.poses[a.id].a,{x:rotated.poses[a.id].a.x+23,y:rotated.poses[a.id].a.y-17});
 const split=I.unbindRigid(moved,b.id,m),released=K.solve(split,135,{design:true,collisions:false});assert(split.elements.every(e=>!e.parentId&&!e.rigidAssemblyId));for(const e of p.elements)pointNear(released.poses[e.id].a,m.poses[e.id].a);
});
test('Rigid assembly suspends internal joints, retains external joints and restores their original identities',()=>{
 const a={...K.makeElement('link',0,0),drive:true},b=K.makeElement('link',100,0),fixed=K.makeElement('ground',0,0);
 let p=custom(a,b,fixed);p.connections=[{id:'inner',type:'revolute',a:{elementId:a.id,point:'b'},b:{elementId:b.id,point:'a'},value:0},{id:'outer',type:'revolute',a:{elementId:a.id,point:'a'},b:{elementId:fixed.id,point:'a'},value:0}];p=K.validateProject(p);
 const shown=E.design(p,0),joined=I.bindRigid(p,['e:'+a.id,'e:'+b.id],'Zostava',shown);
 assert(joined.connections.find(j=>j.id==='inner').rigidAssemblyId);assert(!joined.connections.find(j=>j.id==='outer').rigidAssemblyId);
 const result=K.solve(joined,90,{collisions:false});assert.equal(result.blocked,false);assert.equal(E.freedom(joined,result).free,0);assert.equal(W.constraints(joined,result).length,1);
 const released=I.unbindRigid(joined,b.id,result);assert.deepEqual(released.connections,p.connections);
});
test('Copying a rigid assembly twice produces independent groups and deleting any member removes its assembly',()=>{
 const a=K.makeElement('link',0,0),b=K.makeElement('panel',130,40),p=I.bindRigid(custom(a,b),['e:'+a.id,'e:'+b.id]);
 const record=W.captureAssembly(p,['e:'+b.id],'Modul');let copies=W.insertAssembly(custom(),record,{x:0,y:0},false);copies=W.insertAssembly(copies,record,{x:400,y:0},false);
 const groups=[...new Set(copies.elements.map(e=>e.rigidAssemblyId))];assert.equal(groups.length,2);const member=copies.elements.find(e=>e.rigidOriginal);
 const deleted=I.deleteSelection(copies,['e:'+member.id]);assert.equal(deleted.elements.length,2);assert(deleted.elements.every(e=>e.rigidAssemblyId!==member.rigidAssemblyId));
 const split=I.unbindRigid(copies,member.id);assert.equal(split.elements.filter(e=>e.rigidAssemblyId).length,2);
});
test('Rigid binding handles fixed supports, children and failed selections without mutating the project',()=>{
 const a=K.makeElement('ground',0,0),b={...K.makeElement('link',40,60),drive:true},child={...K.makeElement('node',10,0),parentId:b.id,parentPoint:'b'};
 const p=custom(a,b,child),before=JSON.stringify(p),joined=I.bindRigid(p,['e:'+a.id,'e:'+b.id]);assert.equal(joined.elements.find(e=>e.id===b.id).drive,false);
 const at0=K.solve(joined,0,{collisions:false}),at90=K.solve(joined,90,{collisions:false});pointNear(at0.poses[child.id].a,at90.poses[child.id].a);
 const released=I.unbindRigid(joined,b.id,at90);assert(released.elements.find(e=>e.id===b.id).drive);assert.equal(released.elements.find(e=>e.id===child.id).parentId,b.id);
 assert.throws(()=>I.bindRigid(p,['e:'+b.id,'e:'+child.id]),/aspoň dve/);assert.throws(()=>I.bindRigid(joined,['e:'+a.id,'e:'+b.id]),/aspoň dve|rozpojte/);assert.equal(JSON.stringify(p),before);
});
test('Imported suspended joints cannot silently disable an external constraint',()=>{
 const a=K.makeElement('link',0,0),b=K.makeElement('panel',100,0),outside=K.makeElement('ground',0,0),p=I.bindRigid(custom(a,b,outside),['e:'+a.id,'e:'+b.id]);
 p.connections=[{id:'fake',type:'revolute',a:{elementId:a.id,point:'a'},b:{elementId:outside.id,point:'a'},rigidAssemblyId:p.elements[0].rigidAssemblyId}];assert.throws(()=>K.validateProject(p),/vnútri pevnej/);
});
function motorArm(powerW=200,gearRatio=1){
 const motor={...K.makeElement('motor',0,0),drive:true,rpm:60,powerW,gearRatio,gearEfficiency:.8,mass:0},arm={...K.makeElement('link',0,0),parentId:motor.id,parentPoint:'a',length:1000,width:1,mass:2};
 const p=custom(motor,arm);p.simulation.gravity=9.81;p.simulation.friction=0;p.simulation.inputForce=0;return {p:K.validateProject(p),motor,arm};
}
test('Motor capacity agrees with analytical gravitational torque and gearbox torque for a uniform arm',()=>{
 const {p,motor}=motorArm(),before=JSON.stringify(p),report=P.motorCapacity(p,motor.id);
 almost(report.available,200/(2*Math.PI)*.8,1e-8);almost(report.peak,9.81,.02);
 const horizontal=report.rows.find(r=>r.motion===0),vertical=report.rows.find(r=>r.motion===90);almost(Math.abs(horizontal.gravity),9.81,.02);almost(vertical.gravity,0,.02);assert.equal(report.status,'sufficient');assert.equal(JSON.stringify(p),before);
 const geared=motorArm(200,10),g=P.motorCapacity(geared.p,geared.motor.id);almost(g.available/report.available,10);almost(g.outputRPM,6);almost(g.peak,report.peak,.02);
});
test('Motor estimate distinguishes overload, zero speed and unconstrained models; startup time changes inertial load',()=>{
 const {p,motor}=motorArm(1),r=P.motorCapacity(p,motor.id);assert.equal(r.status,'overloaded');assert(r.firstOverload);assert(r.margin<0);
 p.elements.find(e=>e.id===motor.id).rpm=0;assert.equal(P.motorCapacity(p,motor.id).status,'stopped');
 const normal=motorArm(),fast=P.motorCapacity(normal.p,normal.motor.id,{startupSeconds:.5}),slow=P.motorCapacity(normal.p,normal.motor.id,{startupSeconds:5});assert(fast.startPeak>slow.startPeak);almost(fast.peak,slow.peak);
 normal.p.elements.push(K.makeElement('link',300,300));assert.throws(()=>P.motorCapacity(normal.p,normal.motor.id),/uloženie/);
});
test('Basic motor preferences survive native workspace export',()=>{
 const {p}=motorArm(),restored=X.parseNative(X.serializeNative(p,{workspace:{detailLevel:'advanced',motorMode:'drive'}}));assert.equal(restored.workspace.detailLevel,'advanced');assert.equal(restored.workspace.motorMode,'drive');assert.equal(X.preferences().detailLevel,'basic');
});
test('Motor capacity reverses damping and startup acceleration with the playback direction',()=>{
 const {p,motor}=motorArm();p.simulation.friction=2;const forward=P.motorCapacity(p,motor.id,{direction:1}),reverse=P.motorCapacity(p,motor.id,{direction:-1});
 almost(forward.outputRPM,-reverse.outputRPM);for(let i=0;i<forward.rows.length;i++){almost(forward.rows[i].running-reverse.rows[i].running,4,1e-5);almost(forward.rows[i].starting-forward.rows[i].running,-(reverse.rows[i].starting-reverse.rows[i].running));}
});
