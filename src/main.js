import './styles.css';
import { DEFAULT_G, computeSystemEnergy } from './physics/gravity.js';
import { verletStep } from './physics/integrator.js';

const canvas = document.getElementById('sim-canvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const timeReadout = document.getElementById('time-readout');
const fpsReadout = document.getElementById('fps-readout');
const inspectorContent = document.getElementById('inspector-content');
const bodyCountEl = document.getElementById('body-count');
const energyReadout = document.getElementById('energy-readout');
const momentumReadout = document.getElementById('momentum-readout');
const playToggle = document.getElementById('play-toggle');
const resetButton = document.getElementById('reset-button');
const stepButton = document.getElementById('step-button');
const addBodyButton = document.getElementById('add-body-button');
const gravityToggle = document.getElementById('gravity-toggle');
const trailsToggle = document.getElementById('trails-toggle');
const vectorsToggle = document.getElementById('vectors-toggle');
const gridToggle = document.getElementById('grid-toggle');
const timeScaleInput = document.getElementById('time-scale');
const fullscreenButton = document.getElementById('fullscreen-button');

const STATE = {
  bodies: [],
  running: true,
  time: 0,
  timeScale: 1,
  gravityEnabled: true,
  trailsEnabled: true,
  vectorsEnabled: true,
  gridEnabled: true,
  dt: 0.016,
  softening: 32,
  selectedBodyIndex: -1,
  camera: { x: 0, y: 0, zoom: 1 },
  lastFrame: performance.now(),
  fps: 60,
  accumulator: 0,
  draggingBody: null,
  draggingView: null,
  didDrag: false,
  suppressNextClick: false,
};

const BASE_PRESET = {
  bodies: [
    { id: 1, name: 'Sun', mass: 4000, x: 0, y: 0, vx: 0, vy: 0, radius: 18, color: '#fbbf24', trail: [] },
    { id: 2, name: 'Earth', mass: 35, x: 250, y: 0, vx: 0, vy: 5.2, radius: 8, color: '#7dd3fc', trail: [] },
  ],
};

let basePreset = JSON.parse(JSON.stringify(BASE_PRESET));
let selectedPresetKey = 'orbit';

function cloneBodies(list) {
  return list.map((body) => ({
    ...body,
    trail: [...(body.trail || [])],
    ax: 0,
    ay: 0,
  }));
}

function resetSimulation() {
  STATE.bodies = cloneBodies(basePreset.bodies);
  STATE.time = 0;
  STATE.accumulator = 0;
  STATE.running = true;
  STATE.selectedBodyIndex = 0;
  playToggle.textContent = 'Pause';
  updateStatus();
  timeReadout.textContent = '0.00 s';
  renderInspector();
  renderStats();
}

function updateStatus() {
  statusEl.textContent = STATE.running ? 'Running' : 'Paused';
  statusEl.style.color = STATE.running ? '#4ade80' : '#fbbf24';
}

function addBodyAtCenter() {
  const name = document.getElementById('body-name').value.trim() || 'Planet';
  const massValue = Number(document.getElementById('body-mass').value);
  const radiusValue = Number(document.getElementById('body-radius').value);
  const mass = Number.isFinite(massValue) ? Math.max(1, massValue) : 1000;
  const radius = Number.isFinite(radiusValue) ? Math.min(30, Math.max(2, radiusValue)) : 7;
  const color = document.getElementById('body-color').value || '#7dd3fc';

  const body = {
    id: Date.now() + Math.random(),
    name,
    mass,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius,
    color,
    trail: [],
    ax: 0,
    ay: 0,
  };

  STATE.bodies.push(body);
  STATE.selectedBodyIndex = STATE.bodies.length - 1;
  renderInspector();
  renderStats();
}

function renderInspector() {
  const body = STATE.selectedBodyIndex >= 0 ? STATE.bodies[STATE.selectedBodyIndex] : null;

  if (!body) {
    const prompt = document.createElement('p');
    prompt.textContent = 'Select a body to inspect.';
    inspectorContent.replaceChildren(prompt);
    return;
  }

  const momentum = Math.hypot(body.vx, body.vy);
  const rows = [
    ['Name', body.name],
    ['Mass', body.mass.toFixed(1)],
    ['Position', `(${body.x.toFixed(1)}, ${body.y.toFixed(1)})`],
    ['Velocity', `(${body.vx.toFixed(2)}, ${body.vy.toFixed(2)})`],
    ['Speed', momentum.toFixed(2)],
    ['Accel', `(${(body.ax || 0).toFixed(3)}, ${(body.ay || 0).toFixed(3)})`],
    ['Radius', String(body.radius)],
  ];
  inspectorContent.replaceChildren(...rows.map(([label, value]) => {
    const row = document.createElement('div');
    const title = document.createElement('span');
    const reading = document.createElement('strong');
    row.className = 'stat-row';
    title.textContent = label;
    reading.textContent = value;
    row.append(title, reading);
    return row;
  }));
}

function renderStats() {
  const system = computeSystemEnergy(STATE.bodies, DEFAULT_G, STATE.softening);
  const momentum = STATE.bodies.reduce((sum, body) => sum + body.mass * Math.hypot(body.vx, body.vy), 0);

  bodyCountEl.textContent = String(STATE.bodies.length);
  energyReadout.textContent = `${system.total.toFixed(2)}`;
  momentumReadout.textContent = `${momentum.toFixed(2)}`;
}

function computeMomentumVector() {
  let px = 0;
  let py = 0;
  for (const body of STATE.bodies) {
    px += body.mass * body.vx;
    py += body.mass * body.vy;
  }
  return { x: px, y: py };
}

function stepSimulation(dt) {
  if (!STATE.bodies.length) return;

  verletStep(STATE.bodies, dt, DEFAULT_G, STATE.softening, STATE.gravityEnabled);
  for (const body of STATE.bodies) {
    if (STATE.trailsEnabled) {
      body.trail.push({ x: body.x, y: body.y });
      if (body.trail.length > 120) body.trail.shift();
    }
  }

  STATE.time += dt;
}

function drawGrid() {
  if (!STATE.gridEnabled) return;
  const { width, height } = canvas;
  ctx.save();
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.12)';
  ctx.lineWidth = 1;
  const step = 50 * STATE.camera.zoom;
  const offsetX = ((STATE.camera.x * STATE.camera.zoom) % step + step) % step;
  const offsetY = ((STATE.camera.y * STATE.camera.zoom) % step + step) % step;

  for (let x = -offsetX; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = -offsetY; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function screenToWorld(x, y) {
  const rect = canvas.getBoundingClientRect();
  const sx = (x - rect.left) * (canvas.width / rect.width);
  const sy = (y - rect.top) * (canvas.height / rect.height);
  return {
    x: (sx - canvas.width / 2) / STATE.camera.zoom + STATE.camera.x,
    y: (sy - canvas.height / 2) / STATE.camera.zoom + STATE.camera.y,
  };
}

function worldToScreen(x, y) {
  const px = (x - STATE.camera.x) * STATE.camera.zoom + canvas.width / 2;
  const py = (y - STATE.camera.y) * STATE.camera.zoom + canvas.height / 2;
  return { x: px, y: py };
}

function drawBodies() {
  for (const body of STATE.bodies) {
    const pos = worldToScreen(body.x, body.y);
    if (STATE.trailsEnabled && body.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(worldToScreen(body.trail[0].x, body.trail[0].y).x, worldToScreen(body.trail[0].x, body.trail[0].y).y);
      for (let i = 1; i < body.trail.length; i += 1) {
        const p = worldToScreen(body.trail[i].x, body.trail[i].y);
        ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = body.color + '66';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    if (body.name === 'Black Hole') {
      const pulse = 1 + Math.sin(STATE.time * 2) * 0.035;
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(-0.25);
      ctx.strokeStyle = 'rgba(192, 132, 252, 0.58)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, body.radius * 2.2 * pulse, body.radius * 0.75 * pulse, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    const glow = ctx.createRadialGradient(pos.x, pos.y, 2, pos.x, pos.y, body.radius * 5);
    glow.addColorStop(0, body.color);
    glow.addColorStop(0.4, body.color + 'cc');
    glow.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, body.radius * 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = body.color;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, body.radius, 0, Math.PI * 2);
    ctx.fill();

    if (STATE.vectorsEnabled) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      const vx = body.vx * STATE.camera.zoom * 0.06;
      const vy = body.vy * STATE.camera.zoom * 0.06;
      ctx.lineTo(pos.x + vx, pos.y + vy);
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    if (STATE.bodies[STATE.selectedBodyIndex] === body) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, body.radius + 7 + Math.sin(STATE.time * 4) * 1.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.font = '12px Inter, Segoe UI, sans-serif';
    ctx.fillStyle = 'rgba(229, 246, 255, 0.8)';
    ctx.fillText(body.name, pos.x + body.radius + 9, pos.y - body.radius - 5);
  }
}

function drawStarfield(now) {
  let seed = 1427;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  ctx.save();
  for (let i = 0; i < 90; i += 1) {
    const x = random() * canvas.width;
    const y = random() * canvas.height;
    const twinkle = 0.25 + (Math.sin(now * 0.0015 + i * 1.7) + 1) * 0.25;
    ctx.fillStyle = `rgba(190, 225, 255, ${twinkle.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(x, y, random() > 0.94 ? 1.4 : 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function render(now = performance.now()) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawStarfield(now);
  drawGrid();
  drawBodies();

  timeReadout.textContent = `${STATE.time.toFixed(2)} s`;
  fpsReadout.textContent = String(Math.round(STATE.fps));

  const momentum = computeMomentumVector();
  if (momentum.x || momentum.y) {
    const screenP = worldToScreen(0, 0);
    ctx.beginPath();
    ctx.moveTo(screenP.x, screenP.y);
    ctx.lineTo(screenP.x + momentum.x * 0.5, screenP.y + momentum.y * 0.5);
    ctx.strokeStyle = 'rgba(244, 114, 182, 0.8)';
    ctx.stroke();
  }

  renderStats();
  renderInspector();
}

function animate(now) {
  const delta = Math.min((now - STATE.lastFrame) / 1000, 0.1);
  STATE.lastFrame = now;
  STATE.fps += (1 / Math.max(delta, 0.001) - STATE.fps) * 0.12;

  if (STATE.running) {
    STATE.accumulator += delta * STATE.timeScale;
    while (STATE.accumulator >= STATE.dt) {
      stepSimulation(STATE.dt);
      STATE.accumulator -= STATE.dt;
    }
  }

  render(now);
  requestAnimationFrame(animate);
}

function restorePreset(key) {
  if (key === 'orbit') {
    basePreset = {
      bodies: [
        { id: 1, name: 'Star', mass: 5000, x: 0, y: 0, vx: 0, vy: 0, radius: 18, color: '#fbbf24', trail: [] },
        { id: 2, name: 'Planet', mass: 30, x: 240, y: 0, vx: 0, vy: Math.sqrt((DEFAULT_G * 5000) / 240), radius: 7, color: '#7dd3fc', trail: [] },
      ],
    };
  }

  if (key === 'binary') {
    basePreset = {
      bodies: [
        { id: 1, name: 'A', mass: 2500, x: -105, y: 0, vx: 0, vy: Math.sqrt((DEFAULT_G * 4000) / 280) * (105 / 280), radius: 13, color: '#7dd3fc', trail: [] },
        { id: 2, name: 'B', mass: 1500, x: 175, y: 0, vx: 0, vy: -Math.sqrt((DEFAULT_G * 4000) / 280) * (175 / 280), radius: 12, color: '#fbbf24', trail: [] },
      ],
    };
  }

  if (key === 'escape') {
    basePreset = {
      bodies: [
        { id: 1, name: 'Massive', mass: 5000, x: 0, y: 0, vx: 0, vy: 0, radius: 16, color: '#f87171', trail: [] },
        { id: 2, name: 'Probe', mass: 10, x: 200, y: 0, vx: 0, vy: Math.sqrt((2 * DEFAULT_G * 5000) / 200), radius: 5, color: '#38bdf8', trail: [] },
      ],
    };
  }

  if (key === 'blackhole') {
    basePreset = {
      bodies: [
        { id: 1, name: 'Black Hole', mass: 8000, x: 0, y: 0, vx: 0, vy: 0, radius: 22, color: '#111827', trail: [] },
        { id: 2, name: 'Orbit', mass: 25, x: 280, y: 0, vx: 0, vy: Math.sqrt((DEFAULT_G * 8000) / 280), radius: 6, color: '#c084fc', trail: [] },
      ],
    };
  }

  document.querySelectorAll('[data-preset]').forEach((button) => {
    const isActive = button.dataset.preset === key;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
  resetSimulation();
}

playToggle.addEventListener('click', () => {
  STATE.running = !STATE.running;
  updateStatus();
  playToggle.textContent = STATE.running ? 'Pause' : 'Play';
});

stepButton.addEventListener('click', () => {
  STATE.running = false;
  playToggle.textContent = 'Play';
  updateStatus();
  stepSimulation(STATE.dt * STATE.timeScale);
  render();
});

resetButton.addEventListener('click', () => {
  resetSimulation();
});

addBodyButton.addEventListener('click', addBodyAtCenter);

gravityToggle.addEventListener('change', (event) => {
  STATE.gravityEnabled = event.target.checked;
});

trailsToggle.addEventListener('change', (event) => {
  STATE.trailsEnabled = event.target.checked;
});

vectorsToggle.addEventListener('change', (event) => {
  STATE.vectorsEnabled = event.target.checked;
});

gridToggle.addEventListener('change', (event) => {
  STATE.gridEnabled = event.target.checked;
});

timeScaleInput.addEventListener('input', (event) => {
  STATE.timeScale = Number(event.target.value);
});

fullscreenButton.addEventListener('click', async () => {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
});

document.querySelectorAll('[data-preset]').forEach((button) => {
  button.addEventListener('click', () => {
    selectedPresetKey = button.dataset.preset;
    restorePreset(selectedPresetKey);
  });
});

canvas.addEventListener('click', (event) => {
  if (STATE.suppressNextClick) {
    STATE.suppressNextClick = false;
    return;
  }

  const point = screenToWorld(event.clientX, event.clientY);
  const body = STATE.bodies
    .map((item) => ({ item, distance: Math.hypot(item.x - point.x, item.y - point.y) }))
    .filter(({ item, distance }) => distance < item.radius + 12)
    .sort((a, b) => a.distance - b.distance)[0]?.item;
  if (body) {
    STATE.selectedBodyIndex = STATE.bodies.indexOf(body);
  } else {
    const newBody = {
      id: Date.now() + Math.random(),
      name: `Body ${STATE.bodies.length + 1}`,
      mass: 80,
      x: point.x,
      y: point.y,
      vx: 0,
      vy: 0,
      radius: 6,
      color: '#7dd3fc',
      trail: [],
      ax: 0,
      ay: 0,
    };
    STATE.bodies.push(newBody);
    STATE.selectedBodyIndex = STATE.bodies.length - 1;
  }
  renderInspector();
  renderStats();
});

canvas.addEventListener('wheel', (event) => {
  event.preventDefault();
  const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;
  STATE.camera.zoom *= scaleFactor;
  STATE.camera.zoom = Math.min(4, Math.max(0.4, STATE.camera.zoom));
});

canvas.addEventListener('pointerdown', (event) => {
  const point = screenToWorld(event.clientX, event.clientY);
  const selected = STATE.bodies[STATE.selectedBodyIndex];
  STATE.didDrag = false;
  if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
  if (selected && Math.hypot(selected.x - point.x, selected.y - point.y) < selected.radius + 20) {
    STATE.draggingBody = { index: STATE.selectedBodyIndex, start: point };
  } else {
    STATE.draggingView = { x: event.clientX, y: event.clientY, cameraX: STATE.camera.x, cameraY: STATE.camera.y };
  }
});

canvas.addEventListener('pointermove', (event) => {
  if (STATE.draggingBody || STATE.draggingView) {
    const movement = Math.hypot(event.movementX, event.movementY);
    if (movement > 2) STATE.didDrag = true;
  }

  if (STATE.draggingBody) {
    const point = screenToWorld(event.clientX, event.clientY);
    const body = STATE.bodies[STATE.draggingBody.index];
    body.x = point.x;
    body.y = point.y;
    body.vx = 0;
    body.vy = 0;
    renderInspector();
    return;
  }

  if (STATE.draggingView) {
    const dx = (event.clientX - STATE.draggingView.x) / STATE.camera.zoom;
    const dy = (event.clientY - STATE.draggingView.y) / STATE.camera.zoom;
    STATE.camera.x = STATE.draggingView.cameraX - dx;
    STATE.camera.y = STATE.draggingView.cameraY - dy;
  }
});

canvas.addEventListener('pointerup', () => {
  if (STATE.didDrag) STATE.suppressNextClick = true;
  STATE.draggingBody = null;
  STATE.draggingView = null;
});

restorePreset('orbit');
updateStatus();
requestAnimationFrame(animate);
