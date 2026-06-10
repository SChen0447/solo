import { Vortex, VortexDirection } from './vortex';
import { FlowField, MAX_VORTEX_COUNT } from './flowField';
import { Particle, createParticles } from './particle';

type DisplayMode = 'trail' | 'velocity' | 'particles';

const LARGE_WIDTH = 800;
const LARGE_HEIGHT = 600;
const SMALL_WIDTH = 600;
const SMALL_HEIGHT = 450;
const BREAKPOINT = 1280;
const WALL_THICKNESS = 3;
const PARTICLE_COUNT = 500;
const GRID_SIZE = 30;

const app = document.getElementById('app') as HTMLDivElement;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

let containerWidth = LARGE_WIDTH;
let containerHeight = LARGE_HEIGHT;
let containerX = 0;
let containerY = 0;
let canvasWidth = 0;
let canvasHeight = 0;
let fontSize = 14;

const flowField = new FlowField();
let particles: Particle[] = [];

let currentMode: DisplayMode = 'particles';
let targetMode: DisplayMode = 'particles';
let modeTransitionProgress = 1;
const TRANSITION_DURATION = 300;
let modeTransitionStart = 0;

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragCurrentX = 0;
let dragCurrentY = 0;
let dragDirection: VortexDirection = 'cw';

const uiPanel = document.createElement('div');
const controlsDiv = document.createElement('div');
const modeButtons: HTMLButtonElement[] = [];

function initUI(): void {
  uiPanel.style.position = 'absolute';
  uiPanel.style.padding = '10px 14px';
  uiPanel.style.backgroundColor = 'rgba(52, 73, 94, 0.9)';
  uiPanel.style.color = '#ecf0f1';
  uiPanel.style.fontSize = `${fontSize}px`;
  uiPanel.style.fontFamily = 'inherit';
  uiPanel.style.borderRadius = '6px';
  uiPanel.style.pointerEvents = 'none';
  uiPanel.style.lineHeight = '1.6';
  uiPanel.style.zIndex = '10';
  uiPanel.style.whiteSpace = 'pre-line';
  document.body.appendChild(uiPanel);

  controlsDiv.style.position = 'absolute';
  controlsDiv.style.display = 'flex';
  controlsDiv.style.gap = '10px';
  controlsDiv.style.marginTop = '16px';
  controlsDiv.style.zIndex = '10';

  const modeConfigs: { mode: DisplayMode; label: string }[] = [
    { mode: 'trail', label: '粒子轨迹' },
    { mode: 'velocity', label: '速度场' },
    { mode: 'particles', label: '纯粒子' }
  ];

  for (const cfg of modeConfigs) {
    const btn = document.createElement('button');
    btn.textContent = cfg.label;
    btn.style.padding = '8px 18px';
    btn.style.fontSize = `${fontSize}px`;
    btn.style.fontFamily = 'inherit';
    btn.style.backgroundColor = '#2c3e50';
    btn.style.color = '#ecf0f1';
    btn.style.border = 'none';
    btn.style.borderRadius = '6px';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'background-color 0.2s ease, transform 0.2s ease';
    btn.dataset.mode = cfg.mode;

    btn.addEventListener('mouseenter', () => {
      btn.style.backgroundColor = '#3b5998';
      btn.style.transform = 'scale(1.05)';
    });
    btn.addEventListener('mouseleave', () => {
      if (btn.dataset.mode !== currentMode) {
        btn.style.backgroundColor = '#2c3e50';
      }
      btn.style.transform = 'scale(1)';
    });
    btn.addEventListener('click', () => {
      setDisplayMode(cfg.mode);
    });

    modeButtons.push(btn);
    controlsDiv.appendChild(btn);
  }

  updateButtonStates();
  app.appendChild(controlsDiv);
}

function updateButtonStates(): void {
  for (const btn of modeButtons) {
    if (btn.dataset.mode === currentMode) {
      btn.style.backgroundColor = '#3b5998';
    } else {
      btn.style.backgroundColor = '#2c3e50';
    }
  }
}

function setDisplayMode(mode: DisplayMode): void {
  if (mode === currentMode) return;
  targetMode = mode;
  modeTransitionProgress = 0;
  modeTransitionStart = performance.now();
}

function resizeCanvas(): void {
  const screenWidth = window.innerWidth;
  const useSmall = screenWidth < BREAKPOINT;

  containerWidth = useSmall ? SMALL_WIDTH : LARGE_WIDTH;
  containerHeight = useSmall ? SMALL_HEIGHT : LARGE_HEIGHT;
  fontSize = useSmall ? 12 : 14;

  const buttonBarHeight = 60;
  canvasWidth = containerWidth;
  canvasHeight = containerHeight + buttonBarHeight;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  canvas.style.width = `${canvasWidth}px`;
  canvas.style.height = `${canvasHeight}px`;
  canvas.style.boxShadow = '0 0 8px #3498db';
  canvas.style.borderRadius = '4px';

  containerX = 0;
  containerY = 0;

  controlsDiv.style.marginTop = '12px';
  for (const btn of modeButtons) {
    btn.style.fontSize = `${fontSize}px`;
  }
  uiPanel.style.fontSize = `${fontSize}px`;

  if (particles.length === 0) {
    particles = createParticles(PARTICLE_COUNT, containerX, containerY, containerWidth, containerHeight);
  }
}

function initVortices(): void {
  flowField.removeAll();

  flowField.addVortex(new Vortex({
    x: containerX + 200,
    y: containerY + 150,
    radius: 40,
    speed: 0.5,
    direction: 'ccw'
  }));

  flowField.addVortex(new Vortex({
    x: containerX + 450,
    y: containerY + 400,
    radius: 40,
    speed: 0.3,
    direction: 'cw'
  }));
}

function getCanvasCoords(e: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  };
}

function isInContainer(x: number, y: number): boolean {
  return x >= containerX + WALL_THICKNESS
    && x <= containerX + containerWidth - WALL_THICKNESS
    && y >= containerY + WALL_THICKNESS
    && y <= containerY + containerHeight - WALL_THICKNESS;
}

canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  const coords = getCanvasCoords(e);
  if (!isInContainer(coords.x, coords.y)) return;

  if (e.shiftKey) {
    dragDirection = 'ccw';
  } else {
    dragDirection = 'cw';
  }

  isDragging = true;
  dragStartX = coords.x;
  dragStartY = coords.y;
  dragCurrentX = coords.x;
  dragCurrentY = coords.y;
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const coords = getCanvasCoords(e);
  dragCurrentX = coords.x;
  dragCurrentY = coords.y;
});

canvas.addEventListener('mouseup', (e) => {
  if (!isDragging) return;
  isDragging = false;

  const coords = getCanvasCoords(e);
  if (!isInContainer(coords.x, coords.y)) return;
  if (flowField.getVortexCount() >= MAX_VORTEX_COUNT) return;

  flowField.addVortex(new Vortex({
    x: coords.x,
    y: coords.y,
    radius: 40,
    speed: 0.4,
    direction: dragDirection
  }));
});

canvas.addEventListener('dblclick', (e) => {
  const coords = getCanvasCoords(e);
  flowField.removeVortexAt(coords.x, coords.y);
});

window.addEventListener('resize', resizeCanvas);

function drawContainer(): void {
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(containerX, containerY, containerWidth, containerHeight);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = WALL_THICKNESS;
  ctx.strokeRect(
    containerX + WALL_THICKNESS / 2,
    containerY + WALL_THICKNESS / 2,
    containerWidth - WALL_THICKNESS,
    containerHeight - WALL_THICKNESS
  );
}

function drawVortices(): void {
  const vortices = flowField.getVortices();
  for (const v of vortices) {
    ctx.beginPath();
    ctx.arc(v.x, v.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = v.direction === 'cw' ? '#e74c3c' : '#3498db';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(v.x, v.y, v.radius, 0, Math.PI * 2);
    ctx.strokeStyle = v.direction === 'cw' ? 'rgba(231, 76, 60, 0.3)' : 'rgba(52, 152, 219, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const arrowRotation = v.direction === 'cw' ? 0 : Math.PI;
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.rotate(arrowRotation);
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0.2, Math.PI * 2 - 0.2);
    ctx.strokeStyle = v.direction === 'cw' ? '#e74c3c' : '#3498db';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

function drawParticles(alpha: number): void {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  for (const p of particles) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTrails(alpha: number): void {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  for (const p of particles) {
    const trail = p.trail;
    if (trail.length < 2) continue;

    for (let i = 1; i < trail.length; i++) {
      const t = i / trail.length;
      ctx.beginPath();
      ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
      ctx.lineTo(trail[i].x, trail[i].y);
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = alpha * t * 0.7;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function drawVelocityField(alpha: number): void {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;

  const cols = GRID_SIZE;
  const rows = GRID_SIZE;
  const cellW = (containerWidth - WALL_THICKNESS * 2) / cols;
  const cellH = (containerHeight - WALL_THICKNESS * 2) / rows;
  const scale = 0.5;

  ctx.strokeStyle = '#ecf0f1';
  ctx.fillStyle = '#ecf0f1';
  ctx.lineWidth = 1;

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const px = containerX + WALL_THICKNESS + cellW * (i + 0.5);
      const py = containerY + WALL_THICKNESS + cellH * (j + 0.5);
      const vel = flowField.getVelocityAt(px, py);
      const speed = Math.sqrt(vel.vx * vel.vx + vel.vy * vel.vy);
      if (speed < 0.01) continue;

      const len = speed * scale * 10;
      const angle = Math.atan2(vel.vy, vel.vx);
      const endX = px + Math.cos(angle) * len;
      const endY = py + Math.sin(angle) * len;

      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      const headLen = 4;
      const headAngle = Math.PI / 6;
      ctx.beginPath();
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - headLen * Math.cos(angle - headAngle),
        endY - headLen * Math.sin(angle - headAngle)
      );
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - headLen * Math.cos(angle + headAngle),
        endY - headLen * Math.sin(angle + headAngle)
      );
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function drawDragIndicator(): void {
  if (!isDragging) return;

  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = 'rgba(52, 152, 219, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(dragStartX, dragStartY);
  ctx.lineTo(dragCurrentX, dragCurrentY);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(dragCurrentX, dragCurrentY, 8, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(52, 152, 219, 0.6)';
  ctx.fill();

  ctx.setLineDash([]);
  ctx.restore();
}

function drawStatsPanel(): void {
  let totalSpeed = 0;
  for (const p of particles) {
    totalSpeed += p.getSpeed();
  }
  const avgSpeed = particles.length > 0 ? totalSpeed / particles.length : 0;
  const totalStrength = flowField.getTotalStrength();

  const lines = [
    `粒子总数: ${particles.length}`,
    `平均速度: ${avgSpeed.toFixed(2)} px/frame`,
    `涡流强度: ${totalStrength.toFixed(2)}`
  ];

  uiPanel.textContent = lines.join('\n');

  const canvasRect = canvas.getBoundingClientRect();
  const panelWidth = 180;
  uiPanel.style.left = `${canvasRect.right - panelWidth - 10}px`;
  uiPanel.style.top = `${canvasRect.top + 10}px`;
  uiPanel.style.width = `${panelWidth}px`;
}

function updateModeTransition(now: number): void {
  if (modeTransitionProgress < 1) {
    const elapsed = now - modeTransitionStart;
    modeTransitionProgress = Math.min(1, elapsed / TRANSITION_DURATION);
    if (modeTransitionProgress >= 1) {
      currentMode = targetMode;
      updateButtonStates();
    }
  }
}

function getRenderAlphas(): { particles: number; trails: number; velocity: number } {
  const t = modeTransitionProgress;

  if (currentMode === targetMode) {
    return {
      particles: currentMode !== 'velocity' ? 1 : 0.3,
      trails: currentMode === 'trail' ? 1 : 0,
      velocity: currentMode === 'velocity' ? 1 : 0
    };
  }

  const modeValue = (m: DisplayMode): { p: number; tr: number; v: number } => {
    switch (m) {
      case 'trail': return { p: 1, tr: 1, v: 0 };
      case 'velocity': return { p: 0.3, tr: 0, v: 1 };
      case 'particles': return { p: 1, tr: 0, v: 0 };
    }
  };

  const from = modeValue(currentMode);
  const to = modeValue(targetMode);

  return {
    particles: from.p + (to.p - from.p) * t,
    trails: from.tr + (to.tr - from.tr) * t,
    velocity: from.v + (to.v - from.v) * t
  };
}

function animate(now: number): void {
  updateModeTransition(now);

  for (const p of particles) {
    p.update(flowField, containerX, containerY, containerWidth, containerHeight);
  }

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  drawContainer();

  const alphas = getRenderAlphas();
  drawVelocityField(alphas.velocity);
  drawTrails(alphas.trails);
  drawParticles(alphas.particles);

  drawVortices();
  drawDragIndicator();

  drawStatsPanel();

  requestAnimationFrame(animate);
}

function init(): void {
  initUI();
  resizeCanvas();
  initVortices();
  requestAnimationFrame(animate);
}

init();
