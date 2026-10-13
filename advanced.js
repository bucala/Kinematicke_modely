/* Local tools for time programs, contacts, measurements and image rectification. */
(function(global){
  'use strict';
  const K=()=>global.Kinematics;
  const num=(v,f,min,max)=>{const n=v==null?f:Number(v);if(!Number.isFinite(n)||n<min||n>max)throw new Error('Neplatný parameter rozšíreného modelu.');return n;};
  function program(value,elements){
    if(!value)return null;
    if(!Array.isArray(value.tracks)||!value.tracks.length||value.tracks.length>12)throw new Error('Program potrebuje 1 až 12 pohonov.');
    const ids=new Set();const tracks=value.tracks.map(t=>{const e=elements.find(e=>e.id===t.elementId);if(!e||!e.drive||ids.has(e.id))throw new Error('Každá stopa musí mať vlastný pohon.');ids.add(e.id);const linear=e.type==='rail'||e.driveMode==='linear';return{elementId:e.id,from:num(t.from,0,linear?0:-3600,linear?e.stroke:3600),to:num(t.to,linear?e.stroke:360,linear?0:-3600,linear?e.stroke:3600),delay:num(t.delay,0,0,120),duration:num(t.duration,6,.1,120),easing:t.easing==='smooth'?'smooth':'linear'};});
    if(elements.filter(e=>e.drive).some(e=>!ids.has(e.id)))throw new Error('Pridajte stopu pre každý pohon.');
    const duration=Math.max(...tracks.map(t=>t.delay+t.duration));if(duration>120)throw new Error('Program môže trvať najviac 120 s.');return{tracks,duration};
  }
  function at(project,element,motion,time){const track=project.driveProgram?.tracks.find(t=>t.elementId===element.id);if(!track)return null;const range=K().configuredDriveRange(project),seconds=time??(motion-range.min)/(range.max-range.min)*project.driveProgram.duration;let t=K().clamp((seconds-track.delay)/track.duration,0,1);if(track.easing==='smooth')t=t*t*(3-2*t);return K().lerp(track.from,track.to,t);}
  function contact(value){return value?.enabled?{enabled:true,stiffness:num(value.stiffness,100,.01,10000),damping:num(value.damping,10,0,10000)}:null;}
  function hub(project,reference,result){
    const signature=r=>r.elementId+':'+r.point,refs=new Map([[signature(reference),reference]]),ids=new Set();
    for(let pass=0;pass<project.connections.length+1;pass++){let change=false;for(const j of project.connections.filter(j=>j.type==='revolute'||j.type==='fixed'))if(refs.has(signature(j.a))||refs.has(signature(j.b))){ids.add(j.id);for(const r of [j.a,j.b])if(!refs.has(signature(r))){refs.set(signature(r),r);change=true;}}if(!change)break;}
    return{references:[...refs.values()],joints:project.connections.filter(j=>ids.has(j.id)),position:K().point(result,reference)};
  }
  function record(previous,result,time){
    if(!Number.isFinite(time)||time<0)throw new Error('Meranie potrebuje nezáporný čas.');
    const row={time,motion:result.motion,poses:Object.fromEntries(Object.entries(result.poses).map(([id,p])=>[id,Object.fromEntries(Object.entries(p).filter(([key])=>['a','b','c','ct','cb','angle','length'].includes(key)).map(([k,v])=>[k,typeof v==='object'?{...v}:v]))])),forces:K().copy(result.forces||[])};
    row.velocity={};if(previous&&time>previous.time)for(const [id,p]of Object.entries(row.poses)){const a=previous.poses[id]?.a;if(a)row.velocity[id]=K().distance(a,p.a)/(time-previous.time);}
    return row;
  }
  function series(records,id,metric){return records.map(r=>({time:r.time,value:metric==='speed'?r.velocity[id]||0:metric==='force'?r.forces.find(f=>f.id===id)?.signedForce||0:metric==='angle'?r.poses[id]?.angle||0:r.poses[id]?.length||0}));}
  function compare(project,id,property,values){
    if(!['length','stroke','stiffness','x','y','angle'].includes(property)||!Array.isArray(values)||values.length<2||values.length>4)throw new Error('Porovnajte 2 až 4 hodnoty rozmeru, polohy alebo tuhosti.');
    return values.map(value=>{const p=K().copy(project),e=p.elements.find(e=>e.id===id);if(!e||e.primary)throw new Error('Varianty vyžadujú vlastný člen.');e[property]=num(value,0,['x','y','angle'].includes(property)?-5000: .001,5000);if(property==='stiffness')e.forceMode='stiffness';const valid=K().validateProject(p),samples=K().sample(valid,61),points=samples.map(r=>r.poses[id]?.a).filter(Boolean);const peak=Math.max(0,...samples.flatMap(r=>(r.forces||[]).map(f=>Math.abs(f.signedForce))));return{value,project:valid,samples,blocked:samples.filter(r=>r.blocked).length,peak,spanX:points.length?Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)):0,spanY:points.length?Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)):0};});
  }
  function solveLinear(matrix,vector){const a=matrix.map((r,i)=>[...r,vector[i]]),n=vector.length;for(let c=0;c<n;c++){let pivot=c;for(let r=c+1;r<n;r++)if(Math.abs(a[r][c])>Math.abs(a[pivot][c]))pivot=r;if(Math.abs(a[pivot][c])<1e-10)throw new Error('Kalibračné body tvoria degenerovaný štvoruholník.');[a[c],a[pivot]]=[a[pivot],a[c]];const f=a[c][c];for(let j=c;j<=n;j++)a[c][j]/=f;for(let r=0;r<n;r++)if(r!==c){const f=a[r][c];for(let j=c;j<=n;j++)a[r][j]-=f*a[c][j];}}return a.map(r=>r[n]);}
  function homography(from,to){if(from.length!==4||to.length!==4||[...from,...to].some(p=>![p.x,p.y].every(Number.isFinite)))throw new Error('Perspektíva vyžaduje štyri platné rohy.');const cross=(a,b,c)=>(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x),turns=from.map((p,i)=>cross(p,from[(i+1)%4],from[(i+2)%4]));if(turns.some(v=>Math.abs(v)<1e-5)||turns.some(v=>v*turns[0]<0))throw new Error('Rohy vyberte po obvode bez kríženia.');const rows=[],values=[];from.forEach((p,i)=>{const q=to[i];rows.push([p.x,p.y,1,0,0,0,-q.x*p.x,-q.x*p.y],[0,0,0,p.x,p.y,1,-q.y*p.x,-q.y*p.y]);values.push(q.x,q.y);});const h=[...solveLinear(rows,values),1];return p=>{const d=h[6]*p.x+h[7]*p.y+1;if(Math.abs(d)<1e-9)throw new Error('Bod leží na horizonte perspektívy.');return{x:(h[0]*p.x+h[1]*p.y+h[2])/d,y:(h[3]*p.x+h[4]*p.y+h[5])/d};};}
  function rectify(image,points,width,height){
    width=Math.round(num(width,800,20,1600));height=Math.round(num(height,600,20,1600));if(width*height>2000000)throw new Error('Vyrovnaný obrázok môže mať najviac 2 MP.');
    if(points.some(p=>p.x<0||p.y<0||p.x>image.naturalWidth||p.y>image.naturalHeight))throw new Error('Rohy musia ležať na fotografii.');homography(points,[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}]);
    const source=document.createElement('canvas');source.width=image.naturalWidth;source.height=image.naturalHeight;const s=source.getContext('2d');s.drawImage(image,0,0);const data=s.getImageData(0,0,source.width,source.height),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d'),out=ctx.createImageData(width,height),map=homography([{x:0,y:0},{x:width-1,y:0},{x:width-1,y:height-1},{x:0,y:height-1}],points);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=map({x,y}),sx=Math.floor(p.x),sy=Math.floor(p.y),i=(y*width+x)*4;if(sx<0||sy<0||sx>=source.width||sy>=source.height){out.data.set([255,255,255,255],i);continue;}const fx=p.x-sx,fy=p.y-sy;for(let c=0;c<3;c++){let v=0;for(let a=0;a<2;a++)for(let b=0;b<2;b++)v+=data.data[(Math.min(sy+b,source.height-1)*source.width+Math.min(sx+a,source.width-1))*4+c]*(a?fx:1-fx)*(b?fy:1-fy);out.data[i+c]=v;}out.data[i+3]=255;}ctx.putImageData(out,0,0);source.width=source.height=0;return canvas;
  }
  function evidence(c){const e=c.motionEvidence;if(!e?.matches)return{confidence:0,reason:'Chýba jednoznačná zhoda v ďalšej polohe.',suggestion:'uncertain'};const names={fixed:'Oba konce ostali na rovnakom mieste.',rotation:`Bod ${e.pivot?.toUpperCase()} ostal pevný, druhý sa presunul.`,translation:'Orientácia zostala rovnaká pri presune telesa.',uncertain:'Pohyb nemožno jednoznačne priradiť.'};return{confidence:Math.min(.95,e.matches/Math.max(1,e.total)*.85),reason:names[e.kind],suggestion:e.kind};}
  function motionGroups(candidates){
    const groups=[],used=new Set(),compatible=(a,b)=>{const common=(a.motionEvidence?.transforms||[]).flatMap(t=>{const u=b.motionEvidence?.transforms?.find(u=>u.frame===t.frame);return u?[[t,u]]:[];});return common.length&&common.every(([t,u])=>Math.abs(((t.angle-u.angle+540)%360)-180)<2&&Math.hypot(t.x-u.x,t.y-u.y)<4);};
    for(const c of candidates.filter(c=>c.points.length>1&&c.motionEvidence?.transforms?.length)){if(used.has(c.id))continue;const members=[c,...candidates.filter(d=>d.id!==c.id&&!used.has(d.id)&&d.points.length>1&&compatible(c,d))];if(members.length>1){members.forEach(c=>used.add(c.id));groups.push({ids:members.map(c=>c.id),confidence:Math.min(...members.map(evidence).map(e=>e.confidence)),reason:'Časti vykazujú rovnaký posuv a otočenie v porovnaných polohách.'});}}
    return groups;
  }
  global.KinmoAdvanced=Object.freeze({program,at,contact,hub,record,series,compare,homography,rectify,evidence,motionGroups});
})(globalThis);
