import test from 'node:test';import assert from 'node:assert/strict';import '../engine.js';import '../double-drawer.js';import '../editor.js';import '../interaction.js';import '../workbench.js';import '../slot-outline.js';import '../exports.js';import '../contacts.js';import '../i18n.js';
const K=globalThis.Kinematics,E=globalThis.KinmoEditor,I=globalThis.KinmoInteraction,X=globalThis.KinmoExport,S=globalThis.KinmoSurfaces;
const custom=(...elements)=>K.validateProject({...K.preset('custom'),elements});
test('Cam rotates around its centre after grounded fixed support becomes a hinge',()=>{const cam=K.makeElement('cam',100,100),frame=K.makeElement('ground',100,100);let p=custom(cam,frame);p.connections.push({id:'support',type:'fixed',a:{elementId:cam.id,point:'a'},b:{elementId:frame.id,point:'a'},value:0});p=K.validateProject(p);p=I.setDriver(p,{elementId:cam.id,point:'curve'},{enabled:true,mode:'rotary',min:0,max:360,speed:45},E.design(p,0));assert.equal(p.connections[0].type,'revolute');const a=K.solve(p,0,{collisions:false}),b=K.solve(p,90,{collisions:false});assert.equal(b.blocked,false);assert.equal(b.poses[cam.id].angle-a.poses[cam.id].angle,90);assert.deepEqual(a.poses[cam.id].a,b.poses[cam.id].a);assert.notDeepEqual(a.poses[cam.id].path,b.poses[cam.id].path);});
test('Flat carriage edge tracks a rotating cam while the guide stays fixed',()=>{const cam={...K.makeElement('cam',200,100),radius:40,camLift:20,drive:true,driveSpeed:45,continuous:true};const rail={...K.makeElement('rail',0,100),drive:false,locked:true,length:300,carriageOffset:100,carriageWidth:24,carriageHeight:80};let p=custom(cam,rail);p=S.create(p,cam.id,{elementId:rail.id,point:'c'},'flat',1);const positions=[];for(const angle of [0,90,180,270,360]){const r=K.solve(p,angle,{collisions:false});assert.equal(r.blocked,false,JSON.stringify(r.issues));assert.deepEqual(r.poses[rail.id].a,{x:0,y:100});assert.ok(r.poses[rail.id].c.x>=0&&r.poses[rail.id].c.x<=300);positions.push(r.poses[rail.id].c.x);}assert.ok(Math.max(...positions)-Math.min(...positions)>10);const saved=X.parseNative(X.serializeNative(p)).project;assert.deepEqual(saved.connections[0].surface,p.connections[0].surface);});
test('Flat follower hitting a guide limit is blocked rather than moving the fixed guide',()=>{const cam={...K.makeElement('cam',500,100),drive:true},rail={...K.makeElement('rail',0,100),drive:false,locked:true,length:100,carriageHeight:200};const p=S.create(custom(cam,rail),cam.id,{elementId:rail.id,point:'c'},'flat',1);const r=K.solve(p,0,{collisions:false});assert.equal(r.blocked,true);assert.equal(r.poses[rail.id].a.x,0);assert.equal(r.poses[rail.id].c.x,100);});
test('Motor retains physical and electrical parameters, rotation, reduction and shaft CAD profile',()=>{const m={...K.makeElement('motor',40,60),rpm:1200,gearRatio:10,powerW:100,voltage:24};let p=custom(m);p=I.setDriver(p,{elementId:m.id,point:'a'},{enabled:true,mode:'rotary',min:0,max:360,speed:720},E.design(p,0));const e=p.elements[0],r=K.solve(p,90,{collisions:false});assert.equal(r.poses[m.id].angle,90);assert.equal(e.driveSpeed,720);assert.equal(S.motor(e).outputRPM,120);assert.ok(S.motor(e).torque>7);const saved=X.parseNative(X.serializeNative(p)).project.elements[0];assert.equal(saved.voltage,24);assert.equal(saved.motorDiameter,60);const cad=X.cadSnapshot(p,r,{dimensions:false});assert.ok(cad.entities.some(e=>e.layer==='MOTOR_SHAFT'&&e.radius===4));});
test('Invalid motor housing and partial continuous cycle are rejected',()=>{assert.throws(()=>custom({...K.makeElement('motor'),shaftDiameter:70,motorDiameter:60}));const cam={...K.makeElement('cam'),drive:true,continuous:true};assert.throws(()=>K.validateProject({...K.preset('custom'),elements:[cam],parameters:{...K.defaults,rotationMax:90}}));});
test('SK remains default and EN/DE UI translations never change model names or locale export',()=>{const L=globalThis.KinmoI18n;assert.equal(L.translate('Pracovný priestor','en'),'Workspace');assert.equal(L.translate('Kontaktná plocha','de'),'Kontaktfläche');assert.equal(L.translate('Uložiť','sk'),'Uložiť');const p=custom(K.makeElement('motor'));const before=JSON.stringify(p);L.translate(p.elements[0].name,'en');assert.equal(JSON.stringify(p),before);assert.equal(X.preferences().language,'sk');assert.equal(X.parseNative(X.serializeNative(p,{workspace:{language:'de'}})).workspace.language,'de');});

test('Motor numeric input accepts decimal commas and correct power and voltage units',()=>{const W=globalThis.KinmoWorkbench;assert.equal(W.parseNumber('0,85',''),.85);assert.equal(W.parseNumber('0.12 kW','W'),120);assert.equal(W.parseNumber('24000 mV','V'),24);assert.equal(W.parseNumber('1500 rpm','rpm'),1500);assert.throws(()=>W.parseNumber('24 mm','V'));});

test('Carriage contact follows a resized selected face and has no unused degree of freedom',()=>{const cam={...K.makeElement('cam',200,100),drive:true,radius:40,camLift:0},rail={...K.makeElement('rail',0,100),locked:true,drive:false,length:300,carriageWidth:24,carriageHeight:80};let p=S.create(custom(cam,rail),cam.id,{elementId:rail.id,point:'c'},'flat',1);const a=K.solve(p,0,{collisions:false});p.elements.find(e=>e.id===rail.id).carriageWidth=64;p=K.validateProject(p);const b=K.solve(p,0,{collisions:false});assert.ok(Math.abs(a.poses[rail.id].c.x-b.poses[rail.id].c.x-20)<.001);assert.equal(E.freedom(p,b).free,0);});

test('Enabling cam rotation aligns its centre with the declared fixed pivot',()=>{const cam=K.makeElement('cam',120,100),frame=K.makeElement('ground',100,100);let p=custom(cam,frame);p.connections.push({id:'axis',type:'revolute',a:{elementId:cam.id,point:'a'},b:{elementId:frame.id,point:'a'},value:0});p=I.setDriver(p,{elementId:cam.id,point:'a'},{enabled:true,mode:'rotary',min:0,max:360,speed:45,continuous:true},E.design(p,0));const r=K.solve(p,90,{collisions:false});assert.equal(r.blocked,false);assert.deepEqual(r.poses[cam.id].a,r.poses[frame.id].a);assert.equal(r.poses[cam.id].angle,90);});

test('A plate fixed to the carriage transfers its cam contact to carriage travel',()=>{const cam={...K.makeElement('cam',200,100),drive:true,camLift:0,radius:40},rail={...K.makeElement('rail',0,100),drive:false,locked:true,length:300,carriageOffset:100},plate={...K.makeElement('panel',0,0),parentId:rail.id,parentPoint:'c',angle:90,length:20,width:12,bearingOffset:10};const p=S.create(custom(cam,rail,plate),cam.id,{elementId:plate.id,point:'a'},'flat',0);const r=K.solve(p,0,{collisions:false});assert.equal(r.blocked,false,JSON.stringify(r.issues));assert.ok(r.poses[rail.id].c.x>140);assert.equal(r.poses[rail.id].a.x,0);assert.equal(E.freedom(p,r).free,0);});

const W=globalThis.KinmoWorkbench, ref=(e,point='a')=>({elementId:e.id,point});
const near=(a,b)=>assert.ok(K.distance(a,b)<1e-5,`${JSON.stringify(a)} != ${JSON.stringify(b)}`);
test('Both motor ports can be placed, snapped, selected, saved and used as parent attachments',()=>{
  const m=K.makeElement('motor',100,100),pin=K.makeElement('bearing',120,100),p=custom(m,pin),r=E.design(p,0);
  assert.deepEqual(K.pointKeys(m),['a','b']);
  const snap=W.findSnap(p,[I.elementKey(pin.id)],r,{x:0,y:0},{enabled:true,tolerance:8});
  assert.equal(snap.target.ref.point,'b');assert.equal(snap.target.elementId,m.id);
  const connected=W.connectSnap(p,snap);assert.equal(connected.connections[0].type,'revolute');
  const child={...K.makeElement('node',0,0),parentId:m.id,parentPoint:'b'};
  const driven=I.setDriver(custom(m,child),ref(m),{enabled:true,mode:'rotary',min:0,max:360,speed:45},r);
  for(const angle of [0,90,180,270,360]){const pose=K.solve(driven,angle,{collisions:false});near(pose.poses[child.id].a,pose.poses[m.id].b);near(pose.poses[m.id].a,{x:100,y:100});}
  assert.equal(X.parseNative(X.serializeNative(connected)).project.connections[0].b.point,'b');
});
test('Motor shaft coupling transfers rotation and a ground support stays revolute',()=>{
  const m={...K.makeElement('motor',100,100),drive:true},cam=K.makeElement('cam',100,100),ground=K.makeElement('ground',100,100);
  const p=custom(m,cam,ground),preview={kind:'endpoint',source:{elementId:cam.id,ref:ref(cam)},target:{elementId:m.id,ref:ref(m)}};
  assert.equal(I.suggestJoint(p,ref(m),ref(cam)),'fixed');assert.equal(I.suggestJoint(p,ref(cam),ref(m)),'fixed');
  assert.equal(I.suggestJoint(p,ref(m),ref(ground)),'revolute');assert.equal(I.suggestJoint(p,ref(m,'b'),ref(cam)),'revolute');
  const coupled=W.connectSnap(p,preview);assert.equal(coupled.connections[0].type,'fixed');
  for(const angle of [0,45,90,180,270]){const r=K.solve(coupled,angle,{collisions:false});assert.equal(r.blocked,false,JSON.stringify(r.issues));assert.ok(Math.abs(((r.poses[cam.id].angle-r.poses[m.id].angle+540)%360)-180)<1e-4);}
  assert.equal(W.connectSnap(p,preview,'revolute').connections[0].type,'revolute');
});
test('Moving motor and cam centres preserves profile size, phase and output arm, also under a parent',()=>{
  for(const type of ['cam','motor'])for(const parented of [false,true]){
    const parent={...K.makeElement('link',50,60),angle:35},e={...K.makeElement(type,20,30),angle:67,...(parented?{parentId:parent.id,parentPoint:'b'}:{})};
    const p=custom(...(parented?[parent,e]:[e])),before=JSON.stringify(p),r=E.design(p,0),at={x:r.poses[e.id].a.x+27,y:r.poses[e.id].a.y-13};
    const next=I.setCoordinates(p,ref(e),at,r),moved=next.elements.find(v=>v.id===e.id),after=E.design(next,0);
    near(after.poses[e.id].a,at);assert.equal(moved.angle,e.angle);assert.equal(moved.length,e.length);assert.equal(moved.radius,e.radius);
    assert.equal(JSON.stringify(p),before);
  }
});
test('Motor output pin edits radius and angle about A rather than moving the shaft',()=>{
  const e=K.makeElement('motor',40,60),p=custom(e),next=I.setCoordinates(p,ref(e,'b'),{x:40,y:110},E.design(p,0)),r=E.design(next,0);
  near(r.poses[e.id].a,{x:40,y:60});near(r.poses[e.id].b,{x:40,y:110});assert.equal(next.elements[0].length,50);
});
test('Every element exposes finite, selectable and placeable mounting points at nonzero angles',()=>{
  for(const type of K.TYPES){
    const e={...K.makeElement(type,100,200),angle:37},p=custom(e),r=E.design(p,0);
    for(const point of K.pointKeys(e)){
      const at=K.point(r,ref(e,point));assert.ok(Number.isFinite(at.x)&&Number.isFinite(at.y),`${type}.${point}`);
      assert.equal(I.target(p,I.nodeKey(ref(e,point))).point,point);
      const placed=W.placement(custom(),type,{x:237,y:119},point);near(K.point(E.design(custom(placed),0),ref(placed,point)),{x:237,y:119});
    }
  }
});
test('Passive rail carriage and fixed guide points remain distinct through attached child points',()=>{
  for(const movingRail of [false,true]){
    const rail={...K.makeElement('rail',100,100),drive:false,locked:true,movingRail},child={...K.makeElement('node',0,0),parentId:rail.id,parentPoint:'ct'},p=custom(rail,child);
    for(const key of ['c','ct','cb'])assert.equal(I.fixed(p,ref(rail,key)),movingRail);
    for(const key of ['a','b'])assert.equal(I.fixed(p,ref(rail,key)),!movingRail);
    assert.equal(I.fixed(p,ref(child)),movingRail);assert.equal(I.status(p,ref(child)),movingRail?'fixed':'free');
  }
});
test('Handles clear dense pins and each other at small and large zoom without changing the action ray',()=>{
  for(const scale of [.2,1,5]){
    const occupied=Array.from({length:100},(_,i)=>({x:i*15/scale,y:0}));
    const at=W.clearHandle({x:42/scale,y:0},{x:1,y:0},occupied,scale);
    assert.equal(at.y,0);assert.ok(occupied.every(p=>K.distance(p,at)*scale>=30));
    const next=W.clearHandle(at,{x:1,y:0},[...occupied,at],scale);assert.ok(K.distance(at,next)*scale>=30);
  }
});
test('Carriage point dragging stays on its axis, respects guide ends and leaves the guide in place',()=>{
  for(const angle of [0,37,90]){
    const rail={...K.makeElement('rail',80,90),angle,drive:false,locked:true,carriageOffset:50,length:200},p=custom(rail),r=E.design(p,0),axis=K.along({x:0,y:0},1,angle),normal=K.along({x:0,y:0},1,angle+90);
    for(const travel of [-100,30,300]){
      const at={x:r.poses[rail.id].ct.x+axis.x*travel+normal.x*20,y:r.poses[rail.id].ct.y+axis.y*travel+normal.y*20};
      const next=I.translate(p,[I.nodeKey(ref(rail,'ct'))],{x:at.x-r.poses[rail.id].ct.x,y:at.y-r.poses[rail.id].ct.y},r),shown=E.design(next,0);
      near(shown.poses[rail.id].a,r.poses[rail.id].a);near(shown.poses[rail.id].b,r.poses[rail.id].b);
      assert.ok(Math.abs(next.elements[0].carriageOffset-K.clamp(50+travel,0,200))<1e-5);
    }
  }
});
test('Thickness changes preserve mounting coordinates and centreline geometry for all element types',()=>{
  for(const type of K.TYPES){
    const e={...K.makeElement(type,50,70),angle:53},p=custom(e),before=JSON.stringify(p),r=E.design(p,0),next=W.setThickness(p,e.id,40),shown=E.design(next,0);
    for(const point of K.pointKeys(e))near(K.point(r,ref(e,point)),K.point(shown,ref(e,point)));
    assert.equal(JSON.stringify(p),before);assert.equal(W.thickness(next.elements[0]).value,40);
  }
});
test('A pin connected to a passive carriage is not fixed merely because the guide is locked',()=>{
  const rail={...K.makeElement('rail',100,100),drive:false,locked:true,carriageOffset:50},pin=K.makeElement('bearing',150,100);
  const p=I.setJoint(custom(rail,pin),ref(pin),{type:'revolute',other:ref(rail,'c')});
  assert.equal(I.fixed(p,ref(pin)),false);assert.equal(I.status(p,ref(pin)),'free');
});

test('Separate motor housing remains fixed while the rotor drives a shaft coupling for a full turn',()=>{
 const motor={...K.makeElement('motor',100,100),angle:37}, frame=K.makeElement('ground',100,100);
 let p=I.separateMotor(custom(motor,frame),motor.id); const housing=p.elements.find(e=>e.role==='motor-housing');
 const initial=E.design(p,0);near(initial.poses[motor.id].a,{x:100,y:100});assert.equal(initial.poses[motor.id].angle,37);
 p=I.setJoint(p,ref(housing,'c'),{type:'fixed',other:ref(frame),value:-37});
 p=I.setDriver(p,ref(motor),{enabled:true,mode:'rotary',min:0,max:360,speed:45,continuous:true},E.design(p,0));
 const arm={...K.makeElement('link',100,100),angle:37,length:70};p=K.validateProject({...p,elements:[...p.elements,arm]});
 p=I.setJoint(p,ref(motor),{type:'fixed',other:ref(arm),value:0});
 for(const angle of [0,45,90,180,270,360]){
  const r=K.solve(p,angle,{collisions:false});assert.equal(r.blocked,false,r.issues.join('; '));
  assert.ok(K.distance(r.poses[housing.id].a,initial.poses[housing.id].a)<.001);assert.ok(K.distance(r.poses[motor.id].a,{x:100,y:100})<.001);
  assert.ok(Math.abs(r.poses[housing.id].angle-37)<.001);
  assert.ok(Math.abs(((r.poses[arm.id].angle-r.poses[motor.id].angle+540)%360)-180)<.001);
  assert.equal(E.freedom(p,r).free,0);
 }
 assert.equal(I.fixed(p,ref(motor,'b')),false);assert.equal(I.status(p,ref(motor,'b')),'driven');
 const saved=X.parseNative(X.serializeNative(p)).project;
 assert.equal(saved.elements.find(e=>e.id===motor.id).parentId,housing.id);
 assert.equal(I.separateMotor(p,motor.id).elements.length,p.elements.length);
});
test('Motor housing conversion preserves legacy shaft connections and drive phase',()=>{
 const motor={...K.makeElement('motor',90,120),angle:26,drive:true}, frame=K.makeElement('ground',90,120);
 let p=I.setJoint(custom(motor,frame),ref(motor),{type:'revolute',other:ref(frame)});const before=JSON.stringify(p),next=I.separateMotor(p,motor.id);
 for(const angle of [0,90,180]){const a=K.solve(p,angle,{collisions:false}),b=K.solve(next,angle,{collisions:false});near(a.poses[motor.id].b,b.poses[motor.id].b);assert.equal(b.blocked,false);}
 assert.equal(JSON.stringify(p),before);assert.deepEqual(next.connections,p.connections);
});
test('Dragging a separated motor translates its housing, but editing B changes only its crank radius',()=>{
 const m=K.makeElement('motor',100,100),p=I.separateMotor(custom(m),m.id),h=p.elements.find(e=>e.role==='motor-housing'),r=E.design(p,0);
 const moved=I.translate(p,[I.elementKey(m.id)],{x:40,y:30},r),shown=E.design(moved,0);
 near(shown.poses[m.id].a,{x:140,y:130});near(shown.poses[h.id].c,shown.poses[m.id].a);
 const edited=I.setCoordinates(p,ref(m,'b'),{x:100,y:150},r),after=E.design(edited,0);
 near(after.poses[h.id].c,r.poses[h.id].c);near(after.poses[m.id].b,{x:100,y:150});
 const transformed=W.transform(p,[I.elementKey(m.id)],{dx:25,dy:-10},r),t=E.design(transformed,0);
 near(t.poses[h.id].c,t.poses[m.id].a);near(t.poses[m.id].a,{x:125,y:90});
});
test('Stopping and restarting a mounted motor preserves its displayed relative phase',()=>{
 const m={...K.makeElement('motor',120,100),angle:57};let p=I.separateMotor(custom(m),m.id);
 p=I.setDriver(p,ref(m),{enabled:true,mode:'rotary',min:0,max:360,speed:45},E.design(p,0));
 const shown=K.solve(p,80,{collisions:false});p=I.setDriver(p,ref(m),{enabled:false},shown);
 const stopped=K.solve(p,0,{collisions:false});near(stopped.poses[m.id].b,shown.poses[m.id].b);
 p=I.setDriver(p,ref(m),{enabled:true,mode:'rotary',min:0,max:360,speed:45},stopped);
 near(K.solve(p,0,{collisions:false}).poses[m.id].b,shown.poses[m.id].b);
});

test('Changing motor diameter resizes its housing around the shaft and retains all assembly references',()=>{
 const m={...K.makeElement('motor',140,80),angle:53},p=I.separateMotor(custom(m),m.id),h=p.elements.find(e=>e.role==='motor-housing'),before=E.design(p,0);
 const next=W.setThickness(p,m.id,120),shown=E.design(next,0),housing=next.elements.find(e=>e.id===h.id);
 near(shown.poses[m.id].a,before.poses[m.id].a);near(shown.poses[h.id].c,shown.poses[m.id].a);
 assert.equal(housing.width,120);assert.equal(housing.length,h.length*2);assert.equal(next.elements.find(e=>e.id===m.id).motorDiameter,120);
 assert.equal(p.elements.find(e=>e.id===m.id).motorDiameter,60);
 const entities=X.geometry(next,shown,{dimensions:false,labels:false});assert.ok(entities.some(e=>e.elementId===h.id&&e.closed));
 const rotor=entities.find(e=>e.elementId===m.id&&e.closed);assert.ok(rotor.points.length===4,'rotor export must not duplicate the housing disk');
});

test('Resizing through the simple housing control changes motor diameter uniformly and keeps the shaft centred',()=>{
 const m={...K.makeElement('motor',100,100),angle:41},p=I.separateMotor(custom(m),m.id),h=p.elements.find(e=>e.role==='motor-housing');
 const next=W.setThickness(p,h.id,90),result=E.design(next,0),housing=next.elements.find(e=>e.id===h.id);
 assert.equal(next.elements.find(e=>e.id===m.id).motorDiameter,90);assert.equal(W.thickness(housing).value,90);
 for(const point of result.poses[h.id].outline)assert.ok(Math.abs(K.distance(point,result.poses[h.id].c)-45)<1e-6);
 near(result.poses[m.id].a,{x:100,y:100});assert.throws(()=>W.setThickness(p,h.id,4),/Hriadeľ/);
});
