import test from 'node:test';import assert from 'node:assert/strict';
import '../engine.js';import '../double-drawer.js';import '../editor.js';import '../slot-outline.js';import '../exports.js';
const K=globalThis.Kinematics,E=globalThis.KinmoEditor,X=globalThis.KinmoExport;
const bodies=(snapshot,id)=>snapshot.entities.filter(e=>e.elementId===id&&e.kind==='polyline'&&e.layer!=='DIMENSIONS');
const bounds=points=>({minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minY:Math.min(...points.map(p=>p.y)),maxY:Math.max(...points.map(p=>p.y))});
for(const motion of [0,60,300])test(`Double drawer Fusion preserves continuous frame, stop, L carrier and triangular bracket at ${motion} mm`,()=>{
 const p=K.preset('double-drawer'),result=K.solve(p,motion,{collisions:false}),snap=X.cadSnapshot(p,result,{dimensions:false,slotOutlines:true});
 for(const [id,count] of [['frame-1',8],['stop-1',4],['rail-1',6],['bracket-1',3]]){
  const paths=bodies(snap,id);assert.equal(paths.length,1,id);assert.equal(paths[0].closed,true,id);assert.equal(paths[0].points.length,count,id);
  const template=K.templateOutlines(p,p.elements.find(e=>e.id===id),result.poses[id],motion)[0];
  paths[0].points.forEach((v,i)=>{assert.ok(Math.abs(v.x-template[i].x)<.001);assert.ok(Math.abs(v.y+template[i].y)<.001);});
 }
 assert.equal(bounds(bodies(snap,'stop-1')[0].points).maxX-bounds(bodies(snap,'stop-1')[0].points).minX,6);
 const table=bodies(snap,'table-1');assert.equal(table.length,2);assert.ok(table.every(e=>e.closed&&e.points.length===4));
});
test('Editable double drawer keeps structural outlines, current pose and split table in CAD',()=>{
 const original=K.preset('double-drawer'),motion=60,source=K.solve(original,motion,{collisions:false});const copy=E.editableCopy(original,motion),design=E.design(copy,0),snapshot=X.cadSnapshot(copy,design,{dimensions:false});
 for(const id of ['frame-1','stop-1','rail-1','bracket-1']){
  const expected=K.templateOutlines(original,original.elements.find(e=>e.id===id),source.poses[id],motion)[0];const actual=bodies(snapshot,id)[0].points;
  assert.equal(actual.length,expected.length,id);actual.forEach((p,i)=>{assert.ok(Math.abs(p.x-expected[i].x)<.001,id);assert.ok(Math.abs(p.y+expected[i].y)<.001,id);});
 }
});
test('Rail and ground CAD retain chosen thickness and rotated end caps with independent carriage',()=>{
 const p=K.preset('custom'),rail={...K.makeElement('rail',10,20),slotWidth:80,width:12,angle:90},ground={...K.makeElement('ground',200,30),width:40,length:100};p.elements=[rail,ground];
 const snap=X.cadSnapshot(p,E.design(p,0),{dimensions:false}),r=bounds(bodies(snap,rail.id).find(e=>e.layer==='RAIL').points),g=bounds(bodies(snap,ground.id)[0].points);
 assert.equal(r.maxX-r.minX,80);assert.equal(g.maxY-g.minY,40);assert.ok(snap.entities.some(e=>e.elementId===rail.id&&e.layer==='RAIL_CARRIAGE'&&e.closed));
});
test('Drawer frame is one closed boundary and telescopic rail has both physical bodies',()=>{
 const p=K.preset('drawer'),result=K.solve(p,100,{collisions:false}),snapshot=X.cadSnapshot(p,result,{dimensions:false});
 assert.equal(bodies(snapshot,'frame-1').length,1);assert.equal(bodies(snapshot,'frame-1')[0].points.length,8);
 assert.equal(bodies(snapshot,'rail-1').length,2);assert.ok(bodies(snapshot,'rail-1').every(e=>e.closed));
});
test('Editable drawer rail does not move a copied stationary casing with its carriage',()=>{
 const p=E.editableCopy(K.preset('drawer'),100),rail=p.elements.find(e=>e.id==='rail-1');
 assert.equal(rail.outline?.length||0,0);assert.equal(rail.drive,true);
});

for(const type of ['piston-push','piston-pull'])test(`${type} exports cylinder and actual diameter rod as separate closed profiles`,()=>{
 const p=K.preset('custom'),e=K.makeElement(type,0,0);p.elements=[e];const result=E.design(p,0),snapshot=X.cadSnapshot(p,result,{dimensions:false});
 const paths=bodies(snapshot,e.id);assert.equal(paths.length,2);assert.ok(paths.every(e=>e.closed));const rod=paths.find(e=>e.layer==='PISTON_ROD');assert.ok(rod);const b=bounds(rod.points);assert.equal(b.maxY-b.minY,e.rodDiameter);
 const cylinder=paths.find(e=>e.layer!=='PISTON_ROD'),geometry=K.pistonGeometry(e,result.poses[e.id].length);assert.ok(Math.abs(bounds(cylinder.points).maxX-Math.min(result.poses[e.id].length-geometry.eye,geometry.cylinder))<.001);
});
