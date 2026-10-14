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
