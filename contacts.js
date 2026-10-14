(function(global){
 'use strict';const K=global.Kinematics;
 function edges(element,pose,reference){
  const polygon=element.type==='rail'?pose.carriageOutline:pose.outline?.length?pose.outline:(global.KinmoExport?.geometry({parameters:{},elements:[element],dimensions:[]}, {poses:{[element.id]:pose}}, {dimensions:false,labels:false}).find(e=>e.closed)?.points||[]);
  const frame={a:pose[reference.point],angle:pose.angle};return (polygon||[]).map((a,i)=>({a:K.localPoint(frame,a),b:K.localPoint(frame,polygon[(i+1)%polygon.length]),index:i}));
 }
 function create(project,camId,followerRef,kind,edgeIndex=0,radius=0){
  const p=K.copy(project),result=K.solve(p,0,{design:true}),cam=p.elements.find(e=>e.id===camId),e=p.elements.find(e=>e.id===followerRef.elementId);
  if(!cam||cam.type!=='cam'||!e||K.isElastic(e)||e.id===camId)throw Error('Vyberte vačku a samostatný kontaktný prvok.');
  if(e.type==='rail'&&e.movingRail)throw Error('Kontakt vozíka vyžaduje pevné vedenie a pohyblivý vozík.');
  let surface={kind,radius};
  if(kind==='flat'){const edge=edges(e,result.poses[e.id],followerRef)[edgeIndex];if(!edge)throw Error('Vyberte platnú kontaktnú hranu.');const angle=result.poses[e.id].angle,center=K.rotate({x:(edge.a.x+edge.b.x)/2,y:(edge.a.y+edge.b.y)/2},angle),origin=result.poses[e.id][followerRef.point],a=K.rotate(edge.a,angle),b=K.rotate(edge.b,angle),normal={x:-(b.y-a.y),y:b.x-a.x},v={x:origin.x+center.x-result.poses[camId].a.x,y:origin.y+center.y-result.poses[camId].a.y};surface={kind,a:edge.a,b:edge.b,...(e.type==='rail'||result.poses[e.id].outline?.length?{edgeIndex}:{}),normalSign:normal.x*v.x+normal.y*v.y>=0?1:-1};}
  const record={id:K.uid(),name:'Kontakt plochy s vačkou',type:'cam-contact',a:followerRef,b:{elementId:camId,point:'curve'},surface,value:0,builtin:false};p.connections.push(record);return K.validateProject(p);
 }
 function motor(element){const outputRPM=element.direction*element.rpm/element.gearRatio,torque=element.rpm>0?element.powerW/(element.rpm*2*Math.PI/60)*element.gearRatio*element.gearEfficiency:0;return{outputRPM,torque,current:element.powerW/(element.voltage*element.efficiency)};}
 global.KinmoSurfaces=Object.freeze({edges,create,motor});
})(globalThis);
