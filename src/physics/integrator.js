export function verletStep(bodies, dt, G, softening = 32, gravityEnabled = true) {
  const accelerations = gravityEnabled ? computeAccelerations(bodies, G, softening) : bodies.map(() => ({ x: 0, y: 0 }));

  for (const [index, body] of bodies.entries()) {
    const accel = accelerations[index];
    body.vx += accel.x * dt * 0.5;
    body.vy += accel.y * dt * 0.5;
    body.x += body.vx * dt;
    body.y += body.vy * dt;
  }

  const nextAccelerations = gravityEnabled ? computeAccelerations(bodies, G, softening) : bodies.map(() => ({ x: 0, y: 0 }));

  for (const [index, body] of bodies.entries()) {
    const accel = nextAccelerations[index];
    body.vx += accel.x * dt * 0.5;
    body.vy += accel.y * dt * 0.5;
    body.ax = accel.x;
    body.ay = accel.y;
  }
}

function computeAccelerations(bodies, G, softening) {
  const accelerations = bodies.map(() => ({ x: 0, y: 0 }));

  for (let i = 0; i < bodies.length; i += 1) {
    const bi = bodies[i];
    const a = accelerations[i];

    for (let j = 0; j < bodies.length; j += 1) {
      if (i === j) continue;

      const bj = bodies[j];
      const dx = bj.x - bi.x;
      const dy = bj.y - bi.y;
      const distSq = dx * dx + dy * dy + softening * softening;
      const dist = Math.sqrt(distSq);
      const invDist3 = 1 / (distSq * dist);

      a.x += G * bj.mass * dx * invDist3;
      a.y += G * bj.mass * dy * invDist3;
    }
  }

  return accelerations;
}
