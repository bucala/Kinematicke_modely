/* One rigid input coordinate plus axial elastic links with point masses at free ports.
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

  function prepare(project, options = {}) {
    const p = K.validateProject(project), range = K.driveRange(p), scale = range.unit === '°' ? K.DEG : 0.001;
    if (p.connections.some((j) => j.type === 'cam-contact')) throw new Error('Vačkový kontakt je kinematický s predpokladom trvalého dotyku. Odhadová dynamika nepočíta kontaktné reakcie, predpätie ani odtrhnutie valčeka.');
    const profile = options.profile || K.prepareProject(p);
    const initial = K.solve(p, options.motion ?? range.min, { profile, collisions: options.collisions !== false });
    if (initial.blocked) throw new Error(`Dynamiku nemožno spustiť: ${initial.issues[0]}`);
    const freedom = E.freedom(p, initial);
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
    return { project: p, range, scale, profile, rows, config, elastic, maxStep, collisions: options.collisions !== false, freedom, network, estimated: true };
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
          const result = K.solve(context.project, middle, { profile: context.profile, collisions: context.collisions, forces: false });
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
    const positions = elasticPositions(state), solve = (q) => K.solve(context.project, q, { profile: context.profile, collisions: false, forces: false, elasticPositions: positions });
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
      const rate = ux * (b.velocity.x - a.velocity.x) + uy * (b.velocity.y - a.velocity.y), force = axial(e, length, rate).signedForce;
      lengthRates[e.id] = rate;
      if (loads[a.id]) { loads[a.id].x -= ux * force; loads[a.id].y -= uy * force; }
      if (loads[b.id]) { loads[b.id].x += ux * force; loads[b.id].y += uy * force; }
      drive += force * (ux * (b.jacobian.x - a.jacobian.x) + uy * (b.jacobian.y - a.jacobian.y));
    }
    return { loads, drive, lengthRates, result };
  }

  function dynamicForces(context, state, result) {
    const rates = generalized(context, state.motion, state.velocity).lengthRates;
    if (context.network) Object.assign(rates, networkForces(context, state).lengthRates);
    return forces(context.project, result, rates);
  }

  function stepNetwork(context, previous, elapsed) {
    const state = { ...previous, particles: Object.fromEntries(Object.entries(previous.particles).map(([id, p]) => [id, { ...p }])) };
    const count = Math.ceil(elapsed / context.maxStep), baseDt = elapsed / count;
    if (count > 25000) throw new Error('Časový krok je príliš veľký pre nastavenú tuhosť.');
    for (let i = 0; i < count; i++) {
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
      for (let pass = 0; pass < 20; pass++) {
        const result = K.solve(context.project, state.motion, { profile: context.profile, collisions: false, forces: false, elasticPositions: elasticPositions(state) });
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
      const result = K.solve(context.project, state.motion, { profile: context.profile, collisions: context.collisions, forces: false, elasticPositions: elasticPositions(state) });
      if (!Object.values(state.particles).every((p) => [p.x, p.y, p.vx, p.vy].every(Number.isFinite)) || !Number.isFinite(state.velocity)) { state.stopped = true; state.reason = 'Numericky nestabilný výpočet.'; }
      else if (result.blocked) { state.stopped = true; state.reason = result.issues[0]; }
      if (state.time >= context.config.duration - 1e-12) { state.time = context.config.duration; state.stopped = true; state.reason = 'Uplynul nastavený čas simulácie.'; }
      if (state.stopped) break;
    }
    return state;
  }

  function forceCurve(context) {
    return context.rows.map((row) => ({ motion: row.motion, ...generalized(context, row.motion), blocked: row.blocked }));
  }

  global.KinmoPhysics = Object.freeze({ springRate, axial, forces, centerOfMass, inertia, prepare, generalized, initialState, step, forceCurve, elasticPositions, dynamicForces });
})(globalThis);
