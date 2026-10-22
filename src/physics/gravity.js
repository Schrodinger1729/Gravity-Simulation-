export const DEFAULT_G = 2400;

export function computeForces(bodies, G = DEFAULT_G, softening = 32) {
  const accelerations = bodies.map(() => ({ x: 0, y: 0 }));

  for (let i = 0; i < bodies.length; i += 1) {
    const a = accelerations[i];
    const bi = bodies[i];

    for (let j = 0; j < bodies.length; j += 1) {
      if (i === j) continue;

      const bj = bodies[j];
      const dx = bj.x - bi.x;
      const dy = bj.y - bi.y;
      const distSq = dx * dx + dy * dy + softening * softening;
      const dist = Math.sqrt(distSq);
      const invDist3 = 1 / (distSq * dist);

      const ax = G * bj.mass * dx * invDist3;
      const ay = G * bj.mass * dy * invDist3;

      a.x += ax;
      a.y += ay;
    }
  }

  return accelerations;
}

export function computeSystemEnergy(bodies, G = DEFAULT_G, softening = 32) {
  let kinetic = 0;
  let potential = 0;

  for (const body of bodies) {
    const speedSq = body.vx * body.vx + body.vy * body.vy;
    kinetic += 0.5 * body.mass * speedSq;
  }

  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const dx = bodies[j].x - bodies[i].x;
      const dy = bodies[j].y - bodies[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy + softening * softening);
      potential -= (G * bodies[i].mass * bodies[j].mass) / dist;
    }
  }

  return {
    kinetic,
    potential,
    total: kinetic + potential,
  };
}
