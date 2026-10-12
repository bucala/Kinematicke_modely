/* Estimated, rigid, one-coordinate dynamics. SI is used internally (m, rad, s, kg, N).
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
      force = (pulling ? -1 : 1) * element.force * (1 + (progression - 1) * (pulling ? t : 1 - t));
      rate = element.force * (progression - 1) / (element.maxLength - element.minLength);
    }
    const damping = active ? -(element.damping || 0) * lengthVelocity : 0;
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
    if (element.type === 'rail' && pose.c) return pose.c;
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
    if (!freedom.driven || freedom.free) throw new Error(`Dynamika vyžaduje jeden pohon a úplne určenú geometriu. Zostáva ${freedom.free} ďalších voľných súradníc.`);
    const samples = options.samples?.length >= 3 ? options.samples : K.sample(p, 241, { profile, collisions: options.collisions !== false, forces: false });
    const config = settings(p);
    const elastic = p.elements.filter(K.isElastic);
    const rows = samples.map((sample, index) => {
      const previous = samples[Math.max(0, index - 1)], next = samples[Math.min(samples.length - 1, index + 1)];
      const dq = (next.motion - previous.motion) * scale;
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
      const members = elastic.map((e) => {
        const a = previous.poses[e.id], b = next.poses[e.id], pose = sample.poses[e.id];
        return { id: e.id, length: pose?.length || 0, jacobian: a && b ? (b.length - a.length) / 1000 / dq : 0 };
      });
      return { motion: sample.motion, mass, gravity, members, blocked: sample.blocked, issues: sample.issues };
    });
    const usable = rows.filter((r) => !r.blocked);
    if (!usable.length || usable.some((r) => !Number.isFinite(r.mass) || r.mass < 1e-9)) throw new Error('Pohyblivé telesá nemajú platnú efektívnu hmotnosť. Nastavte hmotnosť a skontrolujte singulárne polohy.');
    let maxStep = 1 / 240;
    for (const row of usable) {
      let stiffness = 0, damping = config.damping;
      for (const member of row.members) {
        const e = elastic.find((v) => v.id === member.id), value = axial(e, member.length);
        stiffness += value.rate * 1000 * member.jacobian ** 2;
        damping += (e.damping || 0) * member.jacobian ** 2;
      }
      maxStep = Math.min(maxStep, 0.25 * Math.sqrt(row.mass / Math.max(1, stiffness)), 0.4 * row.mass / Math.max(1, damping));
    }
    if (maxStep < 0.00001) throw new Error('Systém je príliš tuhý alebo silno tlmený pre túto odhadovú dynamiku. Znížte tuhosť / tlmenie alebo použite profesionálny dynamický solver.');
    return { project: p, range, scale, profile, rows, config, elastic, maxStep, collisions: options.collisions !== false, freedom, estimated: true };
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
      velocity: context.config.initialVelocity * context.scale, time: 0, stopped: false, reason: '',
    };
  }

  function step(context, previous, elapsed) {
    if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > 0.25) throw new Error('Časový krok musí byť v rozsahu 0–0,25 s.');
    const state = { ...previous };
    if (state.stopped || elapsed === 0) return state;
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

  function forceCurve(context) {
    return context.rows.map((row) => ({ motion: row.motion, ...generalized(context, row.motion), blocked: row.blocked }));
  }

  global.KinmoPhysics = Object.freeze({ springRate, axial, forces, centerOfMass, inertia, prepare, generalized, initialState, step, forceCurve });
})(globalThis);
