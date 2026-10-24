/* One driven coordinate, or force-connected free rigid bodies projected onto their joints.
   Axial elastic links use point masses at unanchored ports.
   SI is used internally (m, rad, s, kg, N).
   This is not a multibody/contact solver or a manufacturer gas-spring rating tool. */
(function (global) {
  'use strict';
  const K = global.Kinematics, E = global.KinmoEditor;
  const settings = (project) => ({ ...K.simulationDefaults, ...project.simulation });
  const deltaAngle = (a, b) => ((((b - a + 180) % 360) + 360) % 360 - 180) * K.DEG;

  function springRate(element) {
    if (element.forceMode === 'stiffness') return element.stiffness;
    const compression = element.type === 'spring-compression';
    const stroke = compression ? element.restLength - element.minLength : element.maxLength - element.restLength;
    return stroke > K.EPS ? Math.max(0, element.force - (compression ? 0 : element.preload)) / stroke : 0;
  }

  function axial(element, length, lengthVelocity = 0) {
    let force = 0, potential = 0, rate = 0, active = true;
    if (element.type === 'spring-compression') {
      const deflection = Math.max(0, element.restLength - length);
      rate = springRate(element); force = rate * deflection;
      potential = rate * deflection * deflection / 2000; active = deflection > 0;
    } else if (element.type === 'spring-extension') {
      const deflection = Math.max(0, length - element.restLength);
      active = length >= element.restLength;
      rate = springRate(element);
      force = active ? -(element.preload + rate * deflection) : 0;
      potential = (element.preload * deflection + rate * deflection * deflection / 2) / 1000;
    } else {
      const t = K.clamp((length - element.minLength) / (element.maxLength - element.minLength), 0, 1);
      const progression = element.progression || 1;
      const pulling = element.type === 'piston-pull';
      force = (element.actuatorMode === 'damper' ? 0 : (pulling ? -1 : 1)) * element.force * (1 + (progression - 1) * (pulling ? t : 1 - t));
      rate = (element.actuatorMode === 'damper' ? 0 : element.force) * (progression - 1) / (element.maxLength - element.minLength);
    }
    const coefficient = (lengthVelocity < 0 ? element.dampingCompression : element.dampingExtension) ?? element.damping ?? 0;
    const damping = active ? -coefficient * lengthVelocity : 0;
    return {
      signedForce: force + damping, nominalForce: force, dampingForce: damping, magnitude: Math.abs(force + damping),
      potential, rate, active, withinRange: length >= element.minLength - K.TOLERANCE && length <= element.maxLength + K.TOLERANCE,
    };
  }

  function forces(project, result, lengthRates = {}) {
    return project.elements.filter(K.isElastic).flatMap((e) => {
      const pose = result.poses[e.id];
      if (!pose) return [];
      const value = axial(e, pose.length, lengthRates[e.id] || 0);
      const ux = (pose.b.x - pose.a.x) / (pose.length || 1), uy = (pose.b.y - pose.a.y) / (pose.length || 1);
      return [{
        id: e.id, ...value, length: pose.length, a: pose.a, b: pose.b,
        atA: { x: -ux * value.signedForce, y: -uy * value.signedForce },
        atB: { x: ux * value.signedForce, y: uy * value.signedForce },
      }];
    });
  }

  function camMass(pose) {
    const points = pose.outline.map((p) => ({ x: p.x - pose.a.x, y: p.y - pose.a.y }));
    let area = 0, x = 0, y = 0, moment = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length], cross = a.x * b.y - b.x * a.y;
      area += cross; x += (a.x + b.x) * cross; y += (a.y + b.y) * cross;
      moment += cross * (a.x * a.x + a.x * b.x + b.x * b.x + a.y * a.y + a.y * b.y + b.y * b.y);
    }
    const center = { x: x / (3 * area), y: y / (3 * area) };
    return { center: { x: pose.a.x + center.x, y: pose.a.y + center.y }, variance: Math.max(0, moment / (6 * area) - center.x ** 2 - center.y ** 2) };
  }
  function centerOfMass(element, pose) {
    if (element.com) return K.worldPoint(pose, element.com);
    if (element.type === 'cam') return camMass(pose).center;
    if (['bearing', 'node'].includes(element.type)) return pose.a;
    if (element.type === 'rail' && pose.c && !element.movingRail) return pose.c;
    return { x: (pose.a.x + pose.b.x) / 2, y: (pose.a.y + pose.b.y) / 2 };
  }

  function inertia(element, pose) {
    if (element.inertia > 0) return element.inertia;
    if (element.type === 'cam') {
      const mass = camMass(pose), at = centerOfMass(element, pose);
      return (element.mass || 0) * (mass.variance + K.distance(mass.center, at) ** 2) / 1000000;
    }
    if (['bearing', 'node'].includes(element.type)) return 0;
    const length = pose.length / 1000, width = (element.width || 0) / 1000;
    return (element.mass || 0) * (length * length + width * width) / 12;
  }

  function stopForce(context,e,length,velocity){if(!context.config.softStops)return 0;const penetration=length<e.minLength?e.minLength-length:length>e.maxLength?e.maxLength-length:0;const value=context.config.stopStiffness*penetration-context.config.stopDamping*velocity;return penetration>0?Math.max(0,value):penetration<0?Math.min(0,value):0;}
  function bodyPositions(state) {
    return Object.fromEntries(Object.entries(state?.bodies || {}).map(([id, b]) => [id, { x: b.x, y: b.y, angle: b.angle }]));
  }
  function prepareBodies(project, initial, config, profile, freedom, collisions) {
    const contactMode=project.connections.some(j=>!j.rigidAssemblyId&&j.contact?.enabled);
    if ((freedom.driven&&!contactMode) || !freedom.free || (!project.elements.some(K.isElastic)&&!contactMode)) return null;
    const rootId = (id) => { let e = project.elements.find((e) => e.id === id); while (e?.parentId) e = project.elements.find((v) => v.id === e.parentId); return e?.id; };
    const connected = new Set([...project.elements.filter(K.isElastic).map((e) => e.id),...project.connections.filter(j=>!j.rigidAssemblyId&&j.contact?.enabled).flatMap(j=>[j.a.elementId,j.b.elementId])]), edges = project.connections.map((j) => [j.a.elementId, j.b.elementId]);
    for (const e of project.elements) { if (e.parentId) edges.push([e.id, e.parentId]); if (e.slotId) edges.push([e.id, e.slotId]); for (const r of [e.mountA, e.mountB]) if (r) edges.push([e.id, r.elementId]); }
    for (let pass = 0; pass < project.elements.length; pass++) { let changed = false; for (const [a,b] of edges) if (connected.has(a) !== connected.has(b)) { connected.add(a); connected.add(b); changed = true; } if (!changed) break; }
    const roots = project.elements.filter((e) => !e.primary && !e.locked && !e.parentId && !e.drive && ['link','panel','cam','motor','node','bearing'].includes(e.type));
    if (!roots.length || roots.length > 32 || roots.some((e) => !connected.has(e.id))) return null;
    const graph = K.elasticGraph(project, initial.poses), particles = graph.groups.filter((g) => !g.anchors.length), owners = Object.fromEntries(project.elements.map((e) => [e.id, rootId(e.id)]));
    const bodies = roots.map((root) => {
      const members = project.elements.filter((e) => !K.isElastic(e) && rootId(e.id) === root.id && e.mass > 0), mass = members.reduce((sum,e) => sum + e.mass, 0);
      if (!(mass > 0)) throw new Error(`Pohyblivý člen „${root.name}“ potrebuje kladnú hmotnosť vo Vlastnostiach.`);
      const center = members.reduce((sum,e) => { const p = centerOfMass(e, initial.poses[e.id]); return { x: sum.x + e.mass*p.x/mass, y: sum.y + e.mass*p.y/mass }; }, { x:0, y:0 });
      const moment = members.reduce((sum,e) => sum + inertia(e, initial.poses[e.id]) + e.mass * (K.distance(center, centerOfMass(e, initial.poses[e.id]))/1000)**2, 0);
      return { id: root.id, mass, inertia: Math.max(1e-8,moment), localCenter: K.localPoint(initial.poses[root.id], center), oriented: !['node','bearing'].includes(root.type) };
    });
    let maxStep = 1/1000;
    for(const b of bodies)for(const j of project.connections.filter(j=>!j.rigidAssemblyId&&j.contact?.enabled))maxStep=Math.min(maxStep,.05*Math.sqrt(b.mass/(j.contact.stiffness*1000)),.1*b.mass/Math.max(1,j.contact.damping));
    if(config.softStops)for(const b of bodies)maxStep=Math.min(maxStep,.05*Math.sqrt(b.mass/(config.stopStiffness*1000)),.1*b.mass/Math.max(1,config.stopDamping));
    for (const b of [...bodies, ...particles]) {
      const members = project.elements.filter(K.isElastic).filter((e) => ['a','b'].some((key) => { const group = graph.groups.find((g) => g.id === graph.ports[`${e.id}:${key}`]); return group.id === b.id || group.anchors.some((r) => owners[r.elementId] === b.id); }));
      const stiffness = members.reduce((sum,e) => sum + Math.abs(axial(e,initial.poses[e.id].length).rate)*1000,0), damping = members.reduce((sum,e) => sum + Math.max(e.damping,e.dampingCompression||0,e.dampingExtension||0),config.damping);
      maxStep = Math.min(maxStep, .1*Math.sqrt(b.mass/Math.max(1,stiffness)), .1*b.mass/Math.max(1,damping));
    }
    if (maxStep < .00001) throw new Error('Zostava je príliš tuhá alebo silno tlmená. Upravte hmotnosť, tuhosť alebo tlmenie.');
    // A shared elastic port attached to several rigid bodies is one revolute support.
    for (const g of graph.groups) for (const r of g.anchors.slice(1)) project.connections.push({ id: K.uid(), type:'revolute', a:g.anchors[0], b:r, name:'Spoločný pružný čap', value:0 });
    return { project, config, profile, freedom, range:K.driveRange(project), scale:.001, elastic:project.elements.filter(K.isElastic), graph, particles, network:particles.length?{graph,particles,members:project.elements.filter(K.isElastic).filter((e)=>['a','b'].some((key)=>particles.some((g)=>g.id===graph.ports[`${e.id}:${key}`])))}:null, bodyDynamics:{ bodies, owners }, programStart:project.driveProgram?(initial.motion-K.driveRange(project).min)/(K.driveRange(project).max-K.driveRange(project).min)*project.driveProgram.duration:0, maxStep, collisions, initial, rows:[], estimated:true };
  }
  function bodyCenter(body, pose) { return K.worldPoint(pose, body.localCenter); }
  function bodyLoads(context, state) {
    const result = K.solve(context.project,state.motion,{ profile:context.profile,softContact:true,strokeTolerance:context.config.softStops?2:0,collisions:false,forces:false,bodyPositions:bodyPositions(state),elasticPositions:elasticPositions(state) });
    const loads = Object.fromEntries(context.bodyDynamics.bodies.map((b) => [b.id,{ x:0,y:b.mass*context.config.gravity,torque:0 }]));
    const tipLoads = Object.fromEntries(context.particles.map((g) => [g.id,{ x:0,y:g.mass*context.config.gravity }])), lengthRates = {};
    const endpoint = (e,key) => {
      const id = context.graph.ports[`${e.id}:${key}`], g = context.graph.groups.find((g) => g.id === id), at = result.poses[e.id][key], particle = state.particles[id];
      const owner = g.anchors.map((r) => context.bodyDynamics.owners[r.elementId]).find((id) => state.bodies[id]), b = context.bodyDynamics.bodies.find((b) => b.id === owner), s = state.bodies[owner];
      const center = b && bodyCenter(b,result.poses[owner]), rx = center ? (at.x-center.x)/1000 : 0, ry = center ? (at.y-center.y)/1000 : 0;
      const velocity = particle ? { x:particle.vx,y:particle.vy } : s ? { x:s.vx+s.omega*ry,y:s.vy-s.omega*rx } : { x:0,y:0 };
      return { id,owner,at,rx,ry,velocity };
    };
    for (const e of context.elastic) {
      const a = endpoint(e,'a'), b = endpoint(e,'b'), length = K.distance(a.at,b.at), ux=(b.at.x-a.at.x)/(length||1),uy=(b.at.y-a.at.y)/(length||1);
      const rate=ux*(b.velocity.x-a.velocity.x)+uy*(b.velocity.y-a.velocity.y), force=axial(e,length,rate).signedForce+stopForce(context,e,length,rate); lengthRates[e.id]=rate;
      for (const [p,sign] of [[a,-1],[b,1]]) {
        const fx=sign*ux*force,fy=sign*uy*force;
        if(tipLoads[p.id]) { tipLoads[p.id].x+=fx;tipLoads[p.id].y+=fy; }
        if(loads[p.owner]) { loads[p.owner].x+=fx;loads[p.owner].y+=fy;loads[p.owner].torque+=p.ry*fx-p.rx*fy; }
      }
    }
    const contacts=[];
    for(const j of context.project.connections.filter(j=>!j.rigidAssemblyId&&j.contact?.enabled)){const rollerRef=j.a.point==='curve'?j.b:j.a,camRef=j.a.point==='curve'?j.a:j.b,roller=context.project.elements.find(e=>e.id===rollerRef.elementId),pose=result.poses[roller.id],cam=result.poses[camRef.elementId],owner=context.bodyDynamics.owners[roller.id],s=state.bodies[owner];if(!s)continue;const point=K.point(result,rollerRef),near=K.contactTarget(point,cam,pose,j.surface,roller.radius||0),gap=near.gap??((point.x-near.x)*near.normal.x+(point.y-near.y)*near.normal.y);const motor=context.project.elements.find(e=>e.id===camRef.elementId),omega=!motor.drive?0:(context.project.driveProgram?((global.KinmoAdvanced.at(context.project,motor,state.motion,(context.programStart||0)+state.time+.0001)-global.KinmoAdvanced.at(context.project,motor,state.motion,(context.programStart||0)+state.time))/ .0001):(motor.driveSpeed??60))*K.DEG,r={x:(near.surface.x-cam.a.x)/1000,y:(near.surface.y-cam.a.y)/1000},surface={x:omega*r.y,y:-omega*r.x},vn=(s.vx-surface.x)*near.normal.x+(s.vy-surface.y)*near.normal.y,force=gap<=0?Math.max(0,-j.contact.stiffness*gap-j.contact.damping*vn):0;loads[owner].x+=near.normal.x*force;loads[owner].y+=near.normal.y*force;const body=context.bodyDynamics.bodies.find(b=>b.id===owner),center=bodyCenter(body,result.poses[owner]);loads[owner].torque+=((point.y-center.y)*near.normal.x-(point.x-center.x)*near.normal.y)/1000*force;contacts.push({id:j.id,elementId:roller.id,gap,force,detached:gap>0,a:near.surface,b:point,normal:near.normal});}
    for(const b of context.bodyDynamics.bodies){const e=context.project.elements.find(e=>e.id===b.id),s=state.bodies[b.id],speed=Math.hypot(s.vx,s.vy),friction=e.guideFriction||context.config.friction;if(speed>1e-8&&friction){loads[b.id].x-=friction*s.vx/speed;loads[b.id].y-=friction*s.vy/speed;}}
    return { result,loads,tipLoads,lengthRates,contacts };
  }
  function projectBodies(context,state,previous,dt) {
    const result=K.solve(context.project,state.motion,{ profile:context.profile,softContact:true,strokeTolerance:context.config.softStops?2:0,collisions:context.collisions,forces:false,bodyPositions:bodyPositions(state),elasticPositions:elasticPositions(state) });
    for(const b of context.bodyDynamics.bodies) {
      const pose=result.poses[b.id],s=state.bodies[b.id], oldPose=previous.poses[b.id], center=bodyCenter(b,pose),before=bodyCenter(b,oldPose);
      Object.assign(s,{x:pose.a.x,y:pose.a.y,angle:pose.angle,vx:(center.x-before.x)/1000/dt,vy:(center.y-before.y)/1000/dt,omega:b.oriented?deltaAngle(oldPose.angle,pose.angle)/dt:0});
    }
    return result;
  }
  function stepBodies(context,previous,elapsed) {
    const state=K.copy(previous),count=Math.ceil(elapsed/context.maxStep),dt=elapsed/count;
    if(count>25000) throw new Error('Časový krok je príliš veľký pre tuhosť zostavy.');
    const outsideStroke = result => context.elastic.some(e => { const length=result.poses[e.id]?.length; const tolerance=context.config.softStops?2:1e-6;return length < e.minLength-tolerance || length > e.maxLength+tolerance; });
    for(let i=0;i<count;i++) {
      const h=Math.min(dt,context.config.duration-state.time); if(h<=0) break;
      const before=K.copy(state);if(context.project.elements.some(e=>e.drive)){const range=K.driveRange(context.project),program=context.project.driveProgram;state.motion=K.clamp(program?range.min+((context.programStart||0)+state.time+h)/program.duration*(range.max-range.min):state.motion+(context.project.elements.find(e=>e.drive).driveSpeed??60)*h,range.min,range.max);}const value=bodyLoads(context,state);state.contacts=value.contacts;
      for(const b of context.bodyDynamics.bodies) {
        const s=state.bodies[b.id],load=value.loads[b.id],center=bodyCenter(b,value.result.poses[b.id]);
        s.vx+=(load.x-context.config.damping*s.vx)/b.mass*h;s.vy+=(load.y-context.config.damping*s.vy)/b.mass*h;
        if(b.oriented)s.omega+=(load.torque-context.config.damping*b.inertia/b.mass*s.omega)/b.inertia*h;
        s.angle+=s.omega*h/K.DEG;
        const offset=K.rotate(b.localCenter,s.angle);s.x=center.x+s.vx*h*1000-offset.x;s.y=center.y+s.vy*h*1000-offset.y;
      }
      for(const g of context.particles) {const p=state.particles[g.id],load=value.tipLoads[g.id];p.vx+=load.x/g.mass*h;p.vy+=load.y/g.mass*h;p.x+=p.vx*h*1000;p.y+=p.vy*h*1000;}
      const result=projectBodies(context,state,value.result,h);state.time+=h;
      if(!Object.values(state.bodies).every((b)=>[b.x,b.y,b.angle,b.vx,b.vy,b.omega].every(Number.isFinite)) || !Object.values(state.particles).every(p=>[p.x,p.y,p.vx,p.vy].every(Number.isFinite))) {state.stopped=true;state.reason='Numericky nestabilná poloha zostavy.';}
      else if(result.blocked || outsideStroke(result)){
        const candidate=K.copy(state);let low=0,high=1,safe=value.result;
        for(let n=0;n<16;n++){const t=(low+high)/2;
          for(const b of context.bodyDynamics.bodies){const a=before.bodies[b.id],z=candidate.bodies[b.id];Object.assign(state.bodies[b.id],{x:K.lerp(a.x,z.x,t),y:K.lerp(a.y,z.y,t),angle:a.angle+deltaAngle(a.angle,z.angle)*t/K.DEG});}
          for(const g of context.particles){const a=before.particles[g.id],z=candidate.particles[g.id];Object.assign(state.particles[g.id],{x:K.lerp(a.x,z.x,t),y:K.lerp(a.y,z.y,t)});}
          const tested=K.solve(context.project,state.motion,{profile:context.profile,softContact:true,strokeTolerance:context.config.softStops?2:0,collisions:context.collisions,forces:false,bodyPositions:bodyPositions(state),elasticPositions:elasticPositions(state)});
          if(tested.blocked || outsideStroke(tested))high=t;else{low=t;safe=tested;}
        }
        for(const b of context.bodyDynamics.bodies){const p=safe.poses[b.id];Object.assign(state.bodies[b.id],{x:p.a.x,y:p.a.y,angle:p.angle,vx:0,vy:0,omega:0});}
        for(const g of context.particles){const a=before.particles[g.id],z=candidate.particles[g.id];Object.assign(state.particles[g.id],{x:K.lerp(a.x,z.x,low),y:K.lerp(a.y,z.y,low),vx:0,vy:0});}
        state.time=before.time+h*low;state.stopped=true;state.reason=result.issues[0] || 'Pracovný doraz pružného prvku.';
      }
      if(state.time>=context.config.duration-1e-12){state.stopped=true;state.reason='Uplynul nastavený čas simulácie.';}
      if(state.stopped)break;
    }
    return state;
  }
  function dragBody(context,previous,id,point,local) {
    if(!context.bodyDynamics||!previous.bodies[id]||![point.x,point.y].every(Number.isFinite))throw new Error('Vyberte pohyblivý člen silovej zostavy.');
    const state=K.copy(previous),s=state.bodies[id],offset=K.rotate(local,s.angle);s.x=point.x-offset.x;s.y=point.y-offset.y;
    const result=K.solve(context.project,state.motion,{profile:context.profile,softContact:true,strokeTolerance:context.config.softStops?2:0,collisions:false,forces:false,bodyPositions:bodyPositions(state),elasticPositions:elasticPositions(state)});
    for(const b of context.bodyDynamics.bodies){const p=result.poses[b.id];Object.assign(state.bodies[b.id],{x:p.a.x,y:p.a.y,angle:p.angle,vx:0,vy:0,omega:0});}
    state.time=0;state.stopped=false;state.reason='';return state;
  }

  function prepare(project, options = {}) {
    const p = K.validateProject(project), range = K.driveRange(p), scale = range.unit === '°' ? K.DEG : 0.001;
    if (options.returning) for (const e of p.elements.filter(K.isElastic)) {
      e.damping += p.simulation.returnDamping;
      for (const key of ['dampingCompression', 'dampingExtension']) if (e[key] != null) e[key] += p.simulation.returnDamping;
    }
    if(p.connections.some(j=>!j.rigidAssemblyId&&j.type==='cam-contact'&&j.contact?.enabled&&p.elements.some(e=>e.type==='rail'&&K.carriageReference(p,e,j.a.point==='curve'?j.b:j.a))))throw new Error('Dynamický kontakt vozíka vyžaduje samostatné pohyblivé teleso; pre priamy vozík použite kinematický kontakt.');
    if (p.connections.some((j) => !j.rigidAssemblyId && j.type === 'cam-contact'&&!j.contact?.enabled)) throw new Error('Vačkový kontakt je kinematický s predpokladom trvalého dotyku. Odhadová dynamika nepočíta kontaktné reakcie, predpätie ani odtrhnutie valčeka.');
    const profile = options.profile || K.prepareProject(p);
    const initial = K.solve(p, options.motion ?? range.min, { profile, softContact:p.connections.some(j=>!j.rigidAssemblyId&&j.contact?.enabled),strokeTolerance:p.simulation.softStops?2:0, collisions: options.collisions !== false, elasticPositions: options.elasticPositions, bodyPositions: options.bodyPositions });
    if (initial.blocked) throw new Error(`Dynamiku nemožno spustiť: ${initial.issues[0]}`);
    const freedom = E.freedom(p, initial);
    const bodies = prepareBodies(p,initial,settings(p),profile,freedom,options.collisions !== false);
    if(bodies) { bodies.returning=!!options.returning; return bodies; }
    const graph = K.elasticGraph(p, initial.poses), particles = graph.groups.filter((g) => !g.anchors.length);
    const network = particles.length ? { graph, particles, members: p.elements.filter(K.isElastic).filter((e) => ['a', 'b'].some((key) => particles.some((g) => g.id === graph.ports[`${e.id}:${key}`]))) } : null;
    if ((!freedom.driven && !network) || freedom.free) throw new Error(`Dynamika potrebuje určené tuhé telesá a pohon alebo voľné pružné čapy. Zostáva ${freedom.free} ďalších voľných súradníc.`);
    const samples = options.samples?.length >= 3 ? options.samples : K.sample(p, 241, { profile, collisions: options.collisions !== false, forces: false });
    const config = settings(p);
    const elastic = p.elements.filter(K.isElastic), rigidElastic = elastic.filter((e) => !network?.members.some((m) => m.id === e.id));
    const rows = samples.map((sample, index) => {
      const previous = samples[Math.max(0, index - 1)], next = samples[Math.min(samples.length - 1, index + 1)];
      const dq = (next.motion - previous.motion) * scale || 1;
      let mass = 0, gravity = 0;
      for (const e of p.elements.filter((v) => !K.isElastic(v) && v.mass > 0)) {
        const a = previous.poses[e.id], b = next.poses[e.id], pose = sample.poses[e.id];
        if (!a || !b || !pose) continue;
        const ca = centerOfMass(e, a), cb = centerOfMass(e, b);
        const dx = (cb.x - ca.x) / 1000 / dq, dy = (cb.y - ca.y) / 1000 / dq;
        const da = deltaAngle(a.angle, b.angle) / dq;
        mass += e.mass * (dx * dx + dy * dy) + inertia(e, pose) * da * da;
        gravity += e.mass * config.gravity * dy;
      }
      const members = rigidElastic.map((e) => {
        const a = previous.poses[e.id], b = next.poses[e.id], pose = sample.poses[e.id];
        return { id: e.id, length: pose?.length || 0, jacobian: a && b ? (b.length - a.length) / 1000 / dq : 0 };
      });
      return { motion: sample.motion, mass: freedom.driven ? mass : 1, gravity, members, blocked: sample.blocked, issues: sample.issues };
    });
    const usable = rows.filter((r) => !r.blocked);
    if (!usable.length || usable.some((r) => !Number.isFinite(r.mass) || r.mass < 1e-9)) throw new Error('Pohyblivé telesá nemajú platnú efektívnu hmotnosť. Nastavte hmotnosť a skontrolujte singulárne polohy.');
    let maxStep = 1 / 240;
    for (const row of usable) {
      let stiffness = 0, damping = config.damping;
      for (const member of row.members) {
        const e = elastic.find((v) => v.id === member.id), value = axial(e, member.length);
        stiffness += value.rate * 1000 * member.jacobian ** 2;
        damping += Math.max(e.damping || 0, e.dampingCompression || 0, e.dampingExtension || 0) * member.jacobian ** 2;
      }
      maxStep = Math.min(maxStep, 0.25 * Math.sqrt(row.mass / Math.max(1, stiffness)), 0.4 * row.mass / Math.max(1, damping));
    }
    if (network) for (const g of particles) {
      const members = network.members.filter((e) => ['a', 'b'].some((key) => graph.ports[`${e.id}:${key}`] === g.id));
      const stiffness = members.reduce((sum, e) => sum + Math.abs(axial(e, initial.poses[e.id].length).rate) * 1000, 0);
      const damping = members.reduce((sum, e) => sum + Math.max(e.damping || 0, e.dampingCompression || 0, e.dampingExtension || 0), 0);
      maxStep = Math.min(maxStep, .1 * Math.sqrt(g.mass / Math.max(1, stiffness)), .2 * g.mass / Math.max(1, damping));
    }
    if (maxStep < 0.00001) throw new Error('Systém je príliš tuhý alebo silno tlmený pre túto odhadovú dynamiku. Znížte tuhosť / tlmenie alebo použite profesionálny dynamický solver.');
    if(config.softStops)for(const g of network?.particles||[])maxStep=Math.min(maxStep,.05*Math.sqrt(g.mass/(config.stopStiffness*1000)),.1*g.mass/Math.max(1,config.stopDamping));
    if(maxStep<.00001)throw new Error('Pružný doraz je príliš tuhý pre hmotnosť čapu. Upravte tuhosť, tlmenie alebo hmotnosť.');
    return { project: p, range, scale, profile, rows, config, elastic, maxStep, collisions: options.collisions !== false, freedom, network, returning: !!options.returning, estimated: true };
  }

  function interpolate(context, motion) {
    const rows = context.rows;
    const u = K.clamp((motion - context.range.min) / (context.range.max - context.range.min) * (rows.length - 1), 0, rows.length - 1);
    const i = Math.min(rows.length - 2, Math.floor(u)), t = u - i, a = rows[i], b = rows[i + 1];
    return {
      mass: K.lerp(a.mass, b.mass, t), gravity: K.lerp(a.gravity, b.gravity, t),
      massDerivative: (b.mass - a.mass) / ((b.motion - a.motion) * context.scale),
      members: a.members.map((member, j) => ({
        id: member.id, length: K.lerp(member.length, b.members[j].length, t),
        jacobian: K.lerp(member.jacobian, b.members[j].jacobian, t),
      })),
    };
  }

  function generalized(context, motion, velocity = 0) {
    if(context.bodyDynamics)return {mass:1,gravity:0,elasticForce:0,external:0,damping:0,friction:0,net:0,handForce:0,potential:0,kinetic:0,lengthRates:{},unit:'N'};
    const row = interpolate(context, motion);
    let elasticForce = 0, memberDamping = 0, potential = 0;
    const lengthRates = {};
    for (const member of row.members) {
      const e = context.elastic.find((v) => v.id === member.id), rate = member.jacobian * velocity;
      const value = axial(e, member.length, rate);
      elasticForce += value.nominalForce * member.jacobian;
      memberDamping += value.dampingForce * member.jacobian;
      potential += value.potential; lengthRates[e.id] = rate;
    }
    const external = context.config.inputForce, damping = -context.config.damping * velocity;
    const applied = elasticForce + row.gravity + external + damping + memberDamping;
    const friction = Math.abs(velocity) > 1e-8
      ? -Math.sign(velocity) * context.config.friction
      : -Math.sign(applied) * Math.min(Math.abs(applied), context.config.friction);
    const kineticBias = -0.5 * row.massDerivative * velocity * velocity;
    return {
      ...row, elasticForce, external, damping: damping + memberDamping, friction, kineticBias,
      net: applied + friction + kineticBias, handForce: -(elasticForce + row.gravity),
      potential, kinetic: 0.5 * row.mass * velocity * velocity, lengthRates, unit: context.range.unit === '°' ? 'N·m' : 'N',
    };
  }

  function initialState(context, motion = context.range.min) {
    if(context.bodyDynamics)return {motion,time:0,velocity:0,stopped:false,reason:'',bodies:Object.fromEntries(context.bodyDynamics.bodies.map((b)=>[b.id,{x:context.initial.poses[b.id].a.x,y:context.initial.poses[b.id].a.y,angle:context.initial.poses[b.id].angle,vx:0,vy:0,omega:0}])),particles:Object.fromEntries(context.particles.map((g)=>[g.id,{x:g.at.x,y:g.at.y,vx:0,vy:0}]))};
    return {
      motion: K.clamp(motion, context.range.min, context.range.max),
      velocity: context.freedom.driven ? context.config.initialVelocity * context.scale : 0, time: 0, stopped: false, reason: '',
      ...(context.network ? { particles: Object.fromEntries(context.network.particles.map((g) => [g.id, { x: g.at.x, y: g.at.y, vx: 0, vy: 0 }])) } : {}),
    };
  }

  function step(context, previous, elapsed) {
    if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > 0.25) throw new Error('Časový krok musí byť v rozsahu 0–0,25 s.');
    const state = { ...previous };
    if (state.stopped || elapsed === 0) return state;
    if(context.bodyDynamics)return stepBodies(context,previous,elapsed);
    if (context.network) return stepNetwork(context, previous, elapsed);
    const count = Math.ceil(elapsed / context.maxStep), baseDt = elapsed / count;
    if (count > 25000) throw new Error('Časový krok je príliš veľký pre nastavenú tuhosť.');
    for (let i = 0; i < count; i++) {
      const dt = Math.min(baseDt, Math.max(0, context.config.duration - state.time));
      const value = generalized(context, state.motion, state.velocity);
      if (value.mass < 1e-9) { state.stopped = true; state.reason = 'Singulárna poloha alebo nulová efektívna hmotnosť.'; break; }
      const velocity = state.velocity + value.net / value.mass * dt;
      const candidate = state.motion + velocity * dt / context.scale;
      const next = K.clamp(candidate, context.range.min, context.range.max);
      const lo = Math.min(state.motion, next), hi = Math.max(state.motion, next);
      const blocked = context.rows.filter((r) => r.blocked && r.motion >= lo && r.motion <= hi).sort((a, b) => velocity >= 0 ? a.motion - b.motion : b.motion - a.motion)[0];
      const members = interpolate(context, next).members;
      const member = members.find((m) => !axial(context.elastic.find((e) => e.id === m.id), m.length).withinRange);
      if (blocked || member) {
        const target = blocked?.motion ?? next;
        let a = state.motion, b = target;
        for (let n = 0; n < 18; n++) {
          const middle = (a + b) / 2;
          const result = K.solve(context.project, middle, { profile: context.profile,softContact:true,strokeTolerance:context.config.softStops?2:0, collisions: context.collisions, forces: false });
          if (result.blocked) b = middle; else a = middle;
        }
        state.motion = a; state.velocity = 0; state.stopped = true;
        state.reason = blocked?.issues[0] || 'Doraz minimálnej / maximálnej dĺžky pružiny alebo piesta.';
      } else {
        state.motion = next; state.velocity = velocity;
        if (candidate !== next || (next === context.range.min && velocity < 0) || (next === context.range.max && velocity > 0)) {
          state.velocity = 0; state.stopped = true; state.reason = 'Dosiahnutý limit pohonu (bez modelu nárazu).';
        }
      }
      state.time += dt;
      if (!Number.isFinite(state.velocity) || !Number.isFinite(state.motion)) { state.stopped = true; state.reason = 'Numericky nestabilný výpočet.'; break; }
      if (state.time >= context.config.duration - 1e-12) { state.time = context.config.duration; state.stopped = true; state.reason = 'Uplynul nastavený čas simulácie.'; }
      if (state.stopped) break;
    }
    return state;
  }

  function elasticPositions(state) {
    return Object.fromEntries(Object.entries(state?.particles || {}).map(([id, p]) => [id, { x: p.x, y: p.y }]));
  }

  // Free ports share a particle at each revolute joint. Fixed/rigid ports remain exact anchors.
  function networkForces(context, state) {
    const positions = elasticPositions(state), solve = (q) => K.solve(context.project, q, { profile: context.profile,softContact:true,strokeTolerance:context.config.softStops?2:0, collisions: false, forces: false, elasticPositions: positions });
    const result = solve(state.motion), span = context.range.max - context.range.min;
    const qa = Math.max(context.range.min, state.motion - span * .00001), qb = Math.min(context.range.max, state.motion + span * .00001);
    const before = context.freedom.driven ? solve(qa) : result, after = context.freedom.driven ? solve(qb) : result, dq = (qb - qa) * context.scale || 1;
    const loads = Object.fromEntries(context.network.particles.map((g) => [g.id, { x: 0, y: g.mass * context.config.gravity }]));
    let drive = 0; const lengthRates = {};
    const endpoint = (e, key) => {
      const id = context.network.graph.ports[`${e.id}:${key}`], particle = state.particles[id], at = result.poses[e.id][key];
      const jacobian = particle ? { x: 0, y: 0 } : { x: (after.poses[e.id][key].x - before.poses[e.id][key].x) / 1000 / dq, y: (after.poses[e.id][key].y - before.poses[e.id][key].y) / 1000 / dq };
      return { id, at, jacobian, velocity: particle ? { x: particle.vx, y: particle.vy } : { x: jacobian.x * state.velocity, y: jacobian.y * state.velocity } };
    };
    for (const e of context.network.members) {
      const a = endpoint(e, 'a'), b = endpoint(e, 'b'), length = K.distance(a.at, b.at);
      const ux = (b.at.x - a.at.x) / (length || 1), uy = (b.at.y - a.at.y) / (length || 1);
      const rate = ux * (b.velocity.x - a.velocity.x) + uy * (b.velocity.y - a.velocity.y), force = axial(e, length, rate).signedForce+stopForce(context,e,length,rate);
      lengthRates[e.id] = rate;
      if (loads[a.id]) { loads[a.id].x -= ux * force; loads[a.id].y -= uy * force; }
      if (loads[b.id]) { loads[b.id].x += ux * force; loads[b.id].y += uy * force; }
      drive += force * (ux * (b.jacobian.x - a.jacobian.x) + uy * (b.jacobian.y - a.jacobian.y));
    }
    return { loads, drive, lengthRates, result };
  }

  function dragTip(context, previous, id, point) {
    if (!context.network?.particles.some((g) => g.id === id) || ![point.x, point.y].every(Number.isFinite)) throw new Error('Vyberte voľný pružný čap.');
    const state = { ...previous, time: 0, stopped: false, reason: '', velocity: 0, particles: Object.fromEntries(Object.entries(previous.particles).map(([key, p]) => [key, { ...p, vx: 0, vy: 0 }])) };
    const tip = state.particles[id]; tip.x = point.x; tip.y = point.y;
    for (let pass = 0; pass < (context.config.softStops?0:20); pass++) {
      const result = K.solve(context.project, state.motion, { profile: context.profile,softContact:true,strokeTolerance:context.config.softStops?2:0, collisions: false, forces: false, elasticPositions: elasticPositions(state), bodyPositions:bodyPositions(state) });
      let error = 0;
      for (const e of context.network.members) {
        const keys = ['a', 'b'], key = keys.find((key) => context.network.graph.ports[`${e.id}:${key}`] === id); if (!key) continue;
        const pose = result.poses[e.id], other = pose[key === 'a' ? 'b' : 'a'], length = K.distance(tip, other), target = K.clamp(length, e.minLength, e.maxLength);
        error = Math.max(error, Math.abs(length - target));
        const prior = previous.particles[id], fallbackLength = K.distance(prior, other) || 1, ux = length > K.EPS ? (tip.x - other.x) / length : (prior.x - other.x) / fallbackLength, uy = length > K.EPS ? (tip.y - other.y) / length : (prior.y - other.y) / fallbackLength;
        tip.x = other.x + ux * target; tip.y = other.y + uy * target;
      }
      if (error < .000001) break;
    }
    return state;
  }

  function dynamicForces(context, state, result) {
    if(context.bodyDynamics){const value=bodyLoads(context,state);return [...forces(context.project,result,value.lengthRates),...value.contacts.map(c=>({id:c.elementId,signedForce:c.force,nominalForce:c.force,dampingForce:0,magnitude:c.force,a:c.a,b:c.b,atA:{x:-c.normal.x*c.force,y:-c.normal.y*c.force},atB:{x:c.normal.x*c.force,y:c.normal.y*c.force},contact:true,detached:c.detached,gap:c.gap}))];}
    const rates = generalized(context, state.motion, state.velocity).lengthRates;
    if (context.network) Object.assign(rates, networkForces(context, state).lengthRates);
    return forces(context.project, result, rates);
  }

  function stepNetwork(context, previous, elapsed) {
    const state = { ...previous, particles: Object.fromEntries(Object.entries(previous.particles).map(([id, p]) => [id, { ...p }])) };
    const count = Math.ceil(elapsed / context.maxStep), baseDt = elapsed / count;
    if (count > 25000) throw new Error('Časový krok je príliš veľký pre nastavenú tuhosť.');
    for (let i = 0; i < count; i++) {
      const safeState=context.config.softStops?K.copy(state):null;
      const dt = Math.min(baseDt, Math.max(0, context.config.duration - state.time));
      if (dt <= 0) { state.stopped = true; state.reason = 'Uplynul nastavený čas simulácie.'; break; }
      const value = generalized(context, state.motion, state.velocity), network = networkForces(context, state);
      if (context.freedom.driven) {
        state.velocity += (value.net + network.drive) / value.mass * dt;
        const candidate = state.motion + state.velocity * dt / context.scale;
        state.motion = K.clamp(candidate, context.range.min, context.range.max);
        if (state.motion !== candidate) state.velocity = 0;
      }
      for (const g of context.network.particles) {
        const p = state.particles[g.id], load = network.loads[g.id];
        p.vx += load.x / g.mass * dt; p.vy += load.y / g.mass * dt;
        p.x += p.vx * dt * 1000; p.y += p.vy * dt * 1000;
      }
      // Inelastic stroke stops: project length and remove only forbidden radial velocity.
      // Repeated passes handle series links sharing the same particle.
      for (let pass = 0; pass < (context.config.softStops?0:20); pass++) {
        const result = K.solve(context.project, state.motion, { profile: context.profile,softContact:true,strokeTolerance:context.config.softStops?2:0, collisions: false, forces: false, elasticPositions: elasticPositions(state) });
        let correction = 0;
        for (const e of context.network.members) {
          const pose = result.poses[e.id], length = pose.length;
          if (length < K.EPS) { state.stopped = true; state.reason = 'Pružný prvok má zhodné montážne body.'; break; }
          const target = K.clamp(length, e.minLength, e.maxLength), error = length - target;
          if (Math.abs(error) < .000001) continue;
          correction = Math.max(correction, Math.abs(error));
          const aId = context.network.graph.ports[`${e.id}:a`], bId = context.network.graph.ports[`${e.id}:b`], a = state.particles[aId], b = state.particles[bId];
          const wa = a ? 1 / context.network.particles.find((g) => g.id === aId).mass : 0, wb = b ? 1 / context.network.particles.find((g) => g.id === bId).mass : 0, total = wa + wb;
          if (!total) continue;
          const ux = (pose.b.x - pose.a.x) / length, uy = (pose.b.y - pose.a.y) / length;
          if (a) { a.x += ux * error * wa / total; a.y += uy * error * wa / total; }
          if (b) { b.x -= ux * error * wb / total; b.y -= uy * error * wb / total; }
          const velocityA = a || { vx: (pose.a.x - network.result.poses[e.id].a.x) / 1000 / dt, vy: (pose.a.y - network.result.poses[e.id].a.y) / 1000 / dt };
          const velocityB = b || { vx: (pose.b.x - network.result.poses[e.id].b.x) / 1000 / dt, vy: (pose.b.y - network.result.poses[e.id].b.y) / 1000 / dt };
          const radial = (velocityB.vx - velocityA.vx) * ux + (velocityB.vy - velocityA.vy) * uy;
          if (radial * error > 0) {
            if (a) { a.vx += radial * ux * wa / total; a.vy += radial * uy * wa / total; }
            if (b) { b.vx -= radial * ux * wb / total; b.vy -= radial * uy * wb / total; }
          }
        }
        if (state.stopped || correction < .000001) break;
      }
      state.time += dt;
      const result = K.solve(context.project, state.motion, { profile: context.profile,softContact:true,strokeTolerance:context.config.softStops?2:0, collisions: context.collisions, forces: false, elasticPositions: elasticPositions(state) });
      if (!Object.values(state.particles).every((p) => [p.x, p.y, p.vx, p.vy].every(Number.isFinite)) || !Number.isFinite(state.velocity)) { state.stopped = true; state.reason = 'Numericky nestabilný výpočet.'; }
      else if (result.blocked) { if(safeState)Object.assign(state,safeState);state.stopped = true; state.reason = result.issues[0]; }
      if (state.time >= context.config.duration - 1e-12) { state.time = context.config.duration; state.stopped = true; state.reason = 'Uplynul nastavený čas simulácie.'; }
      if (state.stopped) break;
    }
    return state;
  }

  function forceCurve(context) {
    if(context.bodyDynamics)return [];
    return context.rows.map((row) => ({ motion: row.motion, ...generalized(context, row.motion), blocked: row.blocked }));
  }
  function motorCapacity(project, id, options = {}) {
    const p=K.validateProject(project), motor=p.elements.find(e=>e.id===id), range=K.driveRange(p);
    if(!motor||motor.type!=='motor'||!motor.drive||range.unit!=='°'||p.elements.filter(e=>e.drive).length!==1||p.driveProgram)throw new Error('Overenie potrebuje jeden aktívny elektromotor s rotačným pohonom.');
    const initial=K.solve(p,range.min,{collisions:false});
    if(E.freedom(p,initial).free)throw new Error('Najskôr doplňte uloženie mechanizmu. Voľné telesá nemajú jednoznačnú požiadavku na moment.');
    const count=options.count??Math.max(121,Math.ceil((range.max-range.min)/30)+1), startup=options.startupSeconds??motor.startupSeconds??1;
    if(!Number.isInteger(count)||count<31||count>241||(range.max-range.min)/(count-1)>30||!Number.isFinite(startup)||startup<.1||startup>60)throw new Error('Skúška potrebuje 31–241 polôh a rozbeh 0,1–60 s.');
    const direction=options.direction??motor.direction;if(![1,-1].includes(direction))throw new Error('Smer pohonu musí byť kladný alebo záporný.');
    const samples=K.sample(p,count,{collisions:false,forces:false}), speed=direction*motor.rpm*2*Math.PI/60/motor.gearRatio;
    const available=motor.rpm>0?motor.powerW/(motor.rpm*2*Math.PI/60)*motor.gearRatio*motor.gearEfficiency:0, config=settings(p);
    // Five-point derivatives use equally accurate one-sided stencils at range ends.
    // Mixing forward and central differences fabricates inertia torque at those ends.
    const h=(samples[1].motion-samples[0].motion)*K.DEG;
    const derivative=(i,value)=>{
      const start=Math.max(0,Math.min(samples.length-5,i-2)),offset=i-start;
      const weights=[[-25,48,-36,16,-3],[-3,-10,18,-6,1],[1,-8,0,8,-1],[-1,6,-18,10,3],[3,-16,36,-48,25]][offset];
      return weights.reduce((sum,w,j)=>sum+w*value(start+j),0)/(12*h);
    };
    const rows=samples.map((sample,i)=>{
      let mass=0, gravity=0, elastic=0, damp=0;
      for(const e of p.elements.filter(e=>!K.isElastic(e)&&e.mass>0)){
        const pose=sample.poses[e.id];if(!pose)continue;
        const dx=derivative(i,j=>centerOfMass(e,samples[j].poses[e.id]).x)/1000;
        const dy=derivative(i,j=>centerOfMass(e,samples[j].poses[e.id]).y)/1000;
        const da=derivative(i,j=>deltaAngle(pose.angle,samples[j].poses[e.id].angle));
        mass+=e.mass*(dx*dx+dy*dy)+inertia(e,pose)*da*da;gravity+=e.mass*config.gravity*dy;
      }
      for(const e of p.elements.filter(K.isElastic)){
        const jac=derivative(i,j=>samples[j].poses[e.id].length)/1000,value=axial(e,sample.poses[e.id].length,jac*speed);
        elastic+=value.nominalForce*jac;damp+=value.dampingForce*jac;
      }
      return {motion:sample.motion,mass,gravity,elastic,damp,blocked:sample.blocked,issues:sample.issues};
    });
    rows.forEach((row,i)=>{
      const massDerivative=derivative(i,j=>rows[j].mass);
      row.running=-row.gravity-row.elastic-row.damp-config.inputForce+Math.sign(speed)*config.friction+.5*massDerivative*speed*speed;
      row.starting=row.running+row.mass*speed/startup;row.utilization=available?Math.abs(row.running)/available:Math.abs(row.running)>1e-9?Infinity:0;
    });
    const blocked=rows.filter(r=>r.blocked),peak=Math.max(...rows.map(r=>Math.abs(r.running))),startPeak=Math.max(...rows.map(r=>Math.abs(r.starting)));
    return {motorId:id,rows,available,peak,startPeak,startupSeconds:startup,outputRPM:speed*60/(2*Math.PI),margin:available-peak,
      firstOverload:rows.find(r=>r.utilization>1+1e-6)||null,status:blocked.length?'blocked':motor.rpm===0?'stopped':Math.max(peak,startPeak)>available+1e-6?'overloaded':'sufficient',blocked:blocked.length,estimated:true};
  }

  global.KinmoPhysics = Object.freeze({ motorCapacity, springRate, axial, forces, centerOfMass, inertia, prepare, generalized, initialState, step, forceCurve, elasticPositions, dynamicForces, dragTip, bodyPositions, dragBody });
})(globalThis);
