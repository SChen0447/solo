import { LightMesh } from './lightMesh';
import { ControlPanel } from './controlPanel';

const canvas = document.getElementById('light-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const lightMesh = new LightMesh();

new ControlPanel('control-panel', {
  onPulseChange: (freq: number) => {
    lightMesh.pulseFrequency = freq;
  },
  onDistanceChange: (dist: number) => {
    lightMesh.connectionDistance = dist;
  },
  onThresholdChange: (threshold: number) => {
    lightMesh.starThreshold = threshold;
  }
});

let isDragging = false;
let lastNodeTime = 0;
const NODE_INTERVAL = 0.03;

function getCanvasPos(e: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

canvas.addEventListener('mousedown', (e) => {
  const pos = getCanvasPos(e);
  if (!lightMesh.handleClick(pos.x, pos.y)) {
    isDragging = true;
    lightMesh.addNode(pos.x, pos.y);
    lastNodeTime = performance.now() / 1000;
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const pos = getCanvasPos(e);
  const now = performance.now() / 1000;
  if (now - lastNodeTime >= NODE_INTERVAL) {
    lightMesh.addNode(pos.x, pos.y);
    lastNodeTime = now;
  }
});

canvas.addEventListener('mouseup', () => {
  isDragging = false;
});

canvas.addEventListener('mouseleave', () => {
  isDragging = false;
});

canvas.addEventListener('click', (e) => {
  const pos = getCanvasPos(e);
  lightMesh.handleClick(pos.x, pos.y);
});

let lastTime = performance.now() / 1000;

function drawBackground(): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
  gradient.addColorStop(0, '#0a0e27');
  gradient.addColorStop(1, '#1a1a3e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

  ctx.save();
  const starCount = 80;
  const time = Date.now() * 0.001;
  for (let i = 0; i < starCount; i++) {
    const seed = i * 12345.6789;
    const sx = ((Math.sin(seed) * 10000) % 1 + 1) % 1 * window.innerWidth;
    const sy = ((Math.cos(seed * 1.3) * 10000) % 1 + 1) % 1 * window.innerHeight;
    const sr = 0.5 + ((Math.sin(seed * 2.7) * 10000) % 1 + 1) % 1 * 1.2;
    const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * 2 + seed));
    ctx.globalAlpha = twinkle * 0.6;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function animate(): void {
  const now = performance.now() / 1000;
  const dt = Math.min(now - lastTime, 0.05);
  lastTime = now;

  drawBackground();
  lightMesh.update(dt);
  lightMesh.draw(ctx);

  requestAnimationFrame(animate);
}

animate();
