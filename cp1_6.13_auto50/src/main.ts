import { LightManager } from './lightManager';
import { LevelManager } from './levelManager';
import type { MirrorData, PrismData, LightSegment, FlashEffect, Vec2 } from './lightManager';

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  phase: number;
  speed: number;
}

interface RotationTrail {
  points: Vec2[];
  alpha: number;
  color: string;
}

interface VictoryWave {
  x: number;
  y: number;
  startTime: number;
  maxRadius: number;
  duration: number;
}

const CANVAS_W = 800;
const CANVAS_H = 600;
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;
const EMITTER_RADIUS = 10;
const LASER_WIDTH = 3;
const MIRROR_LENGTH = 60;
const MIRROR_WIDTH = 6;
const PRISM_SIZE = 50;
const TARGET_RADIUS = 20;
const TARGET_INNER_RADIUS = 15;
const HANDLE_RADIUS = 5;
const ROTATION_STEP = 1;

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const lightManager = new LightManager();
const levelManager = new LevelManager();

let stars: Star[] = [];
let currentMirrors: MirrorData[] = [];
let currentPrism: PrismData | null = null;
let lightSegments: LightSegment[] = [];
let flashEffects: { x: number; y: number; birth: number; duration: number }[] = [];
let rotationTrails: RotationTrail[] = [];

let draggingMirror: number = -1;
let draggingPrism: boolean = false;
let hoveredMirror: number = -1;
let hoveredPrism: boolean = false;
let hoveredTarget: boolean = false;
let dragStartAngle: number = 0;
let dragStartMouseAngle: number = 0;
let prismDragOffset: Vec2 = { x: 0, y: 0 };

let lastEmitTime: number = 0;
let emitterActive: boolean = true;
let emitterPaused: boolean = false;
let pauseUntil: number = 0;

let gameTime: number = 0;
let levelStartTime: number = 0;
let gameComplete: boolean = false;

let victoryWaves: VictoryWave[] = [];
let screenFlashTime: number = 0;
let victoryTextTime: number = 0;
let victoryTextActive: boolean = false;
let levelCompleted: boolean = false;

let scaleFactor: number = 1;
let lastFrameTime: number = 0;
let accumulator: number = 0;

function initStars(): void {
  stars = [];
  const level = levelManager.getCurrentLevel();
  for (let i = 0; i < 80; i++) {
    stars.push({
      x: Math.random() * CANVAS_W,
      y: Math.random() * CANVAS_H,
      size: 2 + Math.random() * 3,
      baseAlpha: 0.2 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 2,
    });
  }
}

function loadLevel(): void {
  const level = levelManager.getCurrentLevel();
  currentMirrors = level.mirrors.map(m => ({ ...m }));
  currentPrism = level.prism ? { ...level.prism } : null;
  lightSegments = [];
  flashEffects = [];
  rotationTrails = [];
  victoryWaves = [];
  victoryTextActive = false;
  levelCompleted = false;
  levelStartTime = performance.now();
  gameTime = 0;
  lastEmitTime = 0;
  emitterActive = true;
  emitterPaused = false;
  gameComplete = false;
  initStars();
}

function resizeCanvas(): void {
  const wrapper = document.getElementById('game-wrapper')!;
  const maxW = window.innerWidth - 20;
  const maxH = window.innerHeight - 20;
  const aspect = 16 / 9;

  let w = maxW;
  let h = w / aspect;
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }
  w = Math.max(w, 480);
  h = Math.max(h, 270);

  scaleFactor = w / CANVAS_W;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
}

function getMousePos(e: MouseEvent): Vec2 {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / scaleFactor),
    y: ((e.clientY - rect.top) / scaleFactor),
  };
}

function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const ap = { x: p.x - a.x, y: p.y - a.y };
  const t = Math.max(0, Math.min(1, (ap.x * ab.x + ap.y * ab.y) / (ab.x * ab.x + ab.y * ab.y)));
  const proj = { x: a.x + t * ab.x, y: a.y + t * ab.y };
  return Math.sqrt((p.x - proj.x) ** 2 + (p.y - proj.y) ** 2);
}

function getMirrorEndpoints(m: MirrorData): [Vec2, Vec2] {
  const rad = (m.angle * Math.PI) / 180;
  const half = m.length / 2;
  return [
    { x: m.x - Math.cos(rad) * half, y: m.y - Math.sin(rad) * half },
    { x: m.x + Math.cos(rad) * half, y: m.y + Math.sin(rad) * half },
  ];
}

function getPrismVertices(p: PrismData): Vec2[] {
  const h = (p.size * Math.sqrt(3)) / 2;
  return [
    { x: p.x, y: p.y - h * (2 / 3) },
    { x: p.x - p.size / 2, y: p.y + h / 3 },
    { x: p.x + p.size / 2, y: p.y + h / 3 },
  ];
}

function pointInTriangle(p: Vec2, a: Vec2, b: Vec2, c: Vec2): boolean {
  const sign = (p1: Vec2, p2: Vec2, p3: Vec2) =>
    (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  const d1 = sign(p, a, b);
  const d2 = sign(p, b, c);
  const d3 = sign(p, c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

function onMouseDown(e: MouseEvent): void {
  const pos = getMousePos(e);
  const level = levelManager.getCurrentLevel();

  for (let i = 0; i < currentMirrors.length; i++) {
    const [a, b] = getMirrorEndpoints(currentMirrors[i]);
    const distToHandleA = Math.sqrt((pos.x - a.x) ** 2 + (pos.y - a.y) ** 2);
    const distToHandleB = Math.sqrt((pos.x - b.x) ** 2 + (pos.y - b.y) ** 2);
    if (distToHandleA < 15 || distToHandleB < 15) {
      draggingMirror = i;
      dragStartAngle = currentMirrors[i].angle;
      dragStartMouseAngle = Math.atan2(pos.y - currentMirrors[i].y, pos.x - currentMirrors[i].x) * 180 / Math.PI;
      return;
    }
    const dist = distToSegment(pos, a, b);
    if (dist < 10) {
      draggingMirror = i;
      dragStartAngle = currentMirrors[i].angle;
      dragStartMouseAngle = Math.atan2(pos.y - currentMirrors[i].y, pos.x - currentMirrors[i].x) * 180 / Math.PI;
      return;
    }
  }

  if (currentPrism) {
    const verts = getPrismVertices(currentPrism);
    if (pointInTriangle(pos, verts[0], verts[1], verts[2])) {
      draggingPrism = true;
      prismDragOffset = { x: currentPrism.x - pos.x, y: currentPrism.y - pos.y };
      return;
    }
  }
}

function onMouseMove(e: MouseEvent): void {
  const pos = getMousePos(e);

  if (draggingMirror >= 0) {
    const m = currentMirrors[draggingMirror];
    const mouseAngle = Math.atan2(pos.y - m.y, pos.x - m.x) * 180 / Math.PI;
    let delta = mouseAngle - dragStartMouseAngle;
    let newAngle = dragStartAngle + delta;
    newAngle = Math.round(newAngle / ROTATION_STEP) * ROTATION_STEP;
    newAngle = ((newAngle % 360) + 360) % 360;

    const oldAngle = m.angle;
    m.angle = newAngle;

    if (Math.abs(newAngle - oldAngle) > 0.5) {
      const [a, b] = getMirrorEndpoints(m);
      rotationTrails.push({
        points: [a, b],
        alpha: 0.4,
        color: '#aaaacc',
      });
    }
    return;
  }

  if (draggingPrism && currentPrism) {
    currentPrism.x = pos.x + prismDragOffset.x;
    currentPrism.y = pos.y + prismDragOffset.y;
    return;
  }

  hoveredMirror = -1;
  hoveredPrism = false;
  hoveredTarget = false;

  for (let i = 0; i < currentMirrors.length; i++) {
    const [a, b] = getMirrorEndpoints(currentMirrors[i]);
    if (distToSegment(pos, a, b) < 12) {
      hoveredMirror = i;
      break;
    }
  }

  if (currentPrism) {
    const verts = getPrismVertices(currentPrism);
    if (pointInTriangle(pos, verts[0], verts[1], verts[2])) {
      hoveredPrism = true;
    }
  }

  const level = levelManager.getCurrentLevel();
  const dx = pos.x - level.target.x;
  const dy = pos.y - level.target.y;
  if (Math.sqrt(dx * dx + dy * dy) < level.target.radius + 5) {
    hoveredTarget = true;
  }

  canvas.style.cursor = (hoveredMirror >= 0 || hoveredPrism) ? 'pointer' : 'default';
}

function onMouseUp(): void {
  draggingMirror = -1;
  draggingPrism = false;
}

function resetLevel(): void {
  loadLevel();
  emitterPaused = true;
  pauseUntil = performance.now() + 1000;
}

function drawBackground(time: number): void {
  const level = levelManager.getCurrentLevel();
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, '#0a0e1a');
  grad.addColorStop(1, level.bgTint);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function drawStars(time: number): void {
  const level = levelManager.getCurrentLevel();
  const baseColor = level.starColor;
  const r = parseInt(baseColor.slice(1, 3), 16);
  const g = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);

  for (const star of stars) {
    const alpha = star.baseAlpha * (0.5 + 0.5 * Math.sin(time * 0.001 * star.speed + star.phase));
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEmitter(time: number): void {
  const level = levelManager.getCurrentLevel();
  const ex = level.emitter.x;
  const ey = level.emitter.y;

  const glowSize = EMITTER_RADIUS + 4 + 2 * Math.sin(time * 0.003);
  const glow = ctx.createRadialGradient(ex, ey, 0, ex, ey, glowSize + 6);
  glow.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
  glow.addColorStop(0.5, 'rgba(255, 100, 100, 0.3)');
  glow.addColorStop(1, 'rgba(255, 50, 50, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(ex, ey, glowSize + 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(ex, ey, EMITTER_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ff3333';
  ctx.beginPath();
  ctx.arc(ex, ey, EMITTER_RADIUS * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawMirror(mirror: MirrorData, index: number, time: number): void {
  const [a, b] = getMirrorEndpoints(mirror);
  const isHovered = hoveredMirror === index;
  const isHighlighted = isMirrorHit(mirror);

  ctx.save();

  if (isHovered) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = MIRROR_WIDTH + 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
  if (isHighlighted) {
    grad.addColorStop(0, '#ffd700');
    grad.addColorStop(0.5, '#ffec80');
    grad.addColorStop(1, '#ffd700');
  } else {
    grad.addColorStop(0, '#888899');
    grad.addColorStop(0.3, '#ccccdd');
    grad.addColorStop(0.5, '#aaaabb');
    grad.addColorStop(0.7, '#ccccdd');
    grad.addColorStop(1, '#888899');
  }

  ctx.strokeStyle = grad;
  ctx.lineWidth = MIRROR_WIDTH;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();

  ctx.fillStyle = '#ff8833';
  ctx.beginPath();
  ctx.arc(a.x, a.y, HANDLE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(b.x, b.y, HANDLE_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  if (isHovered) {
    ctx.fillStyle = '#ffaa55';
    ctx.beginPath();
    ctx.arc(a.x, a.y, HANDLE_RADIUS + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(b.x, b.y, HANDLE_RADIUS + 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function isMirrorHit(mirror: MirrorData): boolean {
  const [a, b] = getMirrorEndpoints(mirror);
  for (const seg of lightSegments) {
    const dist = distToSegment({ x: (seg.start.x + seg.end.x) / 2, y: (seg.start.y + seg.end.y) / 2 }, a, b);
    if (dist < 15) {
      const hit = lineSegmentIntersect(seg.start, seg.end, a, b);
      if (hit) return true;
    }
  }
  return false;
}

function lineSegmentIntersect(p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2): boolean {
  const d1x = p2.x - p1.x;
  const d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x;
  const d2y = p4.y - p3.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 0.001) return false;
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / denom;
  const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function drawPrism(prism: PrismData, time: number): void {
  const verts = getPrismVertices(prism);
  const isHovered = hoveredPrism;

  ctx.save();

  if (isHovered) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(verts[0].x, verts[0].y);
    ctx.lineTo(verts[1].x, verts[1].y);
    ctx.lineTo(verts[2].x, verts[2].y);
    ctx.closePath();
    ctx.stroke();
  }

  const rainbowGrad = ctx.createLinearGradient(
    verts[1].x, verts[1].y, verts[2].x, verts[0].y
  );
  const offset = (time * 0.0005) % 1;
  rainbowGrad.addColorStop((0 + offset) % 1, 'rgba(255, 0, 0, 0.25)');
  rainbowGrad.addColorStop((0.17 + offset) % 1, 'rgba(255, 165, 0, 0.25)');
  rainbowGrad.addColorStop((0.33 + offset) % 1, 'rgba(255, 255, 0, 0.25)');
  rainbowGrad.addColorStop((0.5 + offset) % 1, 'rgba(0, 255, 0, 0.25)');
  rainbowGrad.addColorStop((0.67 + offset) % 1, 'rgba(0, 0, 255, 0.25)');
  rainbowGrad.addColorStop((0.83 + offset) % 1, 'rgba(75, 0, 130, 0.25)');
  rainbowGrad.addColorStop((1 + offset) % 1, 'rgba(148, 0, 211, 0.25)');

  ctx.fillStyle = rainbowGrad;
  ctx.beginPath();
  ctx.moveTo(verts[0].x, verts[0].y);
  ctx.lineTo(verts[1].x, verts[1].y);
  ctx.lineTo(verts[2].x, verts[2].y);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(180, 200, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(verts[0].x, verts[0].y);
  ctx.lineTo(verts[1].x, verts[1].y);
  ctx.lineTo(verts[2].x, verts[2].y);
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

function drawTarget(time: number): void {
  const level = levelManager.getCurrentLevel();
  const tx = level.target.x;
  const ty = level.target.y;
  const pulse = 1 + 0.15 * Math.sin(time * 0.001 * Math.PI);

  ctx.save();

  const outerGlow = ctx.createRadialGradient(tx, ty, 0, tx, ty, TARGET_RADIUS * pulse * 1.5);
  outerGlow.addColorStop(0, 'rgba(0, 255, 255, 0.3)');
  outerGlow.addColorStop(0.6, 'rgba(0, 255, 255, 0.1)');
  outerGlow.addColorStop(1, 'rgba(0, 255, 255, 0)');
  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.arc(tx, ty, TARGET_RADIUS * pulse * 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(tx, ty, TARGET_RADIUS * pulse, 0, Math.PI * 2);
  ctx.stroke();

  const innerGrad = ctx.createRadialGradient(tx, ty, 0, tx, ty, TARGET_RADIUS * 0.6 * pulse);
  innerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
  innerGrad.addColorStop(1, 'rgba(150, 200, 255, 0.3)');
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.arc(tx, ty, TARGET_RADIUS * 0.6 * pulse, 0, Math.PI * 2);
  ctx.fill();

  if (hoveredTarget) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tx, ty, TARGET_RADIUS + 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawLightSegments(time: number): void {
  for (const seg of lightSegments) {
    const alpha = seg.intensity;
    if (alpha <= 0.01) continue;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.shadowColor = seg.color;
    ctx.shadowBlur = 8;

    ctx.strokeStyle = seg.color;
    ctx.lineWidth = LASER_WIDTH;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(seg.start.x, seg.start.y);
    ctx.lineTo(seg.end.x, seg.end.y);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

function drawFlashEffects(time: number): void {
  flashEffects = flashEffects.filter(f => time - f.birth < f.duration);
  for (const f of flashEffects) {
    const progress = (time - f.birth) / f.duration;
    const alpha = 1 - progress;
    const radius = 8 * (0.5 + 0.5 * (1 - progress));
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(f.x, f.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRotationTrails(time: number): void {
  rotationTrails = rotationTrails.filter(t => t.alpha > 0.01);
  for (const trail of rotationTrails) {
    trail.alpha *= 0.92;
    ctx.strokeStyle = trail.color;
    ctx.globalAlpha = trail.alpha;
    ctx.lineWidth = MIRROR_WIDTH;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(trail.points[0].x, trail.points[0].y);
    ctx.lineTo(trail.points[1].x, trail.points[1].y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawInfoBar(time: number): void {
  const level = levelManager.getCurrentLevel();

  ctx.fillStyle = 'rgba(10, 14, 26, 0.7)';
  ctx.fillRect(0, 0, CANVAS_W, 36);

  ctx.strokeStyle = 'rgba(68, 136, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 36);
  ctx.lineTo(CANVAS_W, 36);
  ctx.stroke();

  ctx.font = 'bold 16px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = '#88aaff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(level.name, 16, 18);

  const elapsed = Math.floor(gameTime / 1000);
  const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const secs = String(elapsed % 60).padStart(2, '0');
  ctx.font = '16px "Courier New", monospace';
  ctx.fillStyle = '#ff4444';
  ctx.textAlign = 'center';
  ctx.fillText(`${mins}:${secs}`, CANVAS_W / 2, 18);

  const btnX = CANVAS_W - 90;
  const btnY = 6;
  const btnW = 76;
  const btnH = 24;
  const btnHovered = isResetButtonHovered();

  ctx.fillStyle = btnHovered ? 'rgba(68, 136, 255, 0.4)' : '#333333';
  ctx.strokeStyle = btnHovered ? '#4488ff' : 'rgba(100, 100, 100, 0.5)';
  ctx.lineWidth = btnHovered ? 2 : 1;
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 4);
  ctx.fill();
  ctx.stroke();

  if (btnHovered) {
    ctx.shadowColor = '#4488ff';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  ctx.font = '13px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = '#ccccdd';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('重置', btnX + btnW / 2, btnY + btnH / 2);
}

let mousePos: Vec2 = { x: 0, y: 0 };

function isResetButtonHovered(): boolean {
  const btnX = CANVAS_W - 90;
  const btnY = 6;
  const btnW = 76;
  const btnH = 24;
  return mousePos.x >= btnX && mousePos.x <= btnX + btnW && mousePos.y >= btnY && mousePos.y <= btnY + btnH;
}

function drawVictoryWaves(time: number): void {
  victoryWaves = victoryWaves.filter(w => time - w.startTime < w.duration);
  for (const wave of victoryWaves) {
    const progress = (time - wave.startTime) / wave.duration;
    const radius = 20 + 60 * progress;
    const alpha = 1 - progress;

    const colors = ['#ff3333', '#33ff33', '#3333ff', '#00ffff', '#ffff33'];
    for (let i = 0; i < colors.length; i++) {
      const r = radius - i * 3;
      if (r < 0) continue;
      ctx.strokeStyle = colors[i];
      ctx.globalAlpha = alpha * 0.6;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

function drawVictoryText(time: number): void {
  if (!victoryTextActive) return;
  const elapsed = time - victoryTextTime;
  if (elapsed < 0) return;

  let y: number;
  let alpha = 1;
  if (elapsed < 500) {
    y = CANVAS_H - (CANVAS_H / 2 - 18) * (elapsed / 500);
    alpha = elapsed / 500;
  } else if (elapsed < 2500) {
    y = CANVAS_H / 2;
    alpha = 1;
  } else if (elapsed < 3000) {
    y = CANVAS_H / 2;
    alpha = 1 - (elapsed - 2500) / 500;
  } else {
    victoryTextActive = false;
    return;
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = 'bold 36px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#00ffff';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('通关！', CANVAS_W / 2, y);
  ctx.shadowColor = '#4488ff';
  ctx.shadowBlur = 30;
  ctx.fillText('通关！', CANVAS_W / 2, y);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawScreenFlash(time: number): void {
  if (screenFlashTime <= 0) return;
  const elapsed = time - screenFlashTime;
  if (elapsed > 100) {
    screenFlashTime = 0;
    return;
  }
  const alpha = 1 - elapsed / 100;
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function drawHint(time: number): void {
  const level = levelManager.getCurrentLevel();
  const elapsed = time - levelStartTime;
  if (elapsed > 4000) return;
  const alpha = elapsed < 3000 ? 0.8 : 0.8 * (1 - (elapsed - 3000) / 1000);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = '14px "Segoe UI", "Microsoft YaHei", sans-serif';
  ctx.fillStyle = '#88aaff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(level.hint, CANVAS_W / 2, CANVAS_H - 30);
  ctx.restore();
}

function updateLight(time: number): void {
  if (!emitterActive || emitterPaused) {
    if (emitterPaused && time >= pauseUntil) {
      emitterPaused = false;
    }
    return;
  }

  const level = levelManager.getCurrentLevel();
  const result = lightManager.traceRays(
    level.emitter,
    currentMirrors,
    currentPrism ? [currentPrism] : [],
    [],
    level.target,
    CANVAS_W,
    CANVAS_H
  );

  lightSegments = result.segments;

  const newFlashes: { x: number; y: number; birth: number; duration: number }[] = [];
  for (const fe of result.flashEffects) {
    newFlashes.push({
      x: fe.x,
      y: fe.y,
      birth: time,
      duration: fe.duration,
    });
  }
  flashEffects = [...flashEffects, ...newFlashes];

  if (result.hitTarget && !levelCompleted) {
    levelCompleted = true;
    const target = level.target;
    victoryWaves.push({
      x: target.x,
      y: target.y,
      startTime: time,
      maxRadius: 80,
      duration: 1500,
    });
    screenFlashTime = time;
    victoryTextTime = time;
    victoryTextActive = true;

    setTimeout(() => {
      if (levelManager.getCurrentLevelIndex() < levelManager.getTotalLevels() - 1) {
        levelManager.startTransition();
      } else {
        gameComplete = true;
      }
    }, 3000);
  }
}

function handleTransition(time: number): void {
  const switched = levelManager.updateTransition(16);
  if (switched) {
    levelManager.nextLevel();
    loadLevel();
  }
}

function gameLoop(timestamp: number): void {
  if (lastFrameTime === 0) lastFrameTime = timestamp;
  const dt = timestamp - lastFrameTime;
  lastFrameTime = timestamp;

  accumulator += dt;
  if (accumulator > FRAME_TIME * 3) accumulator = FRAME_TIME * 3;

  while (accumulator >= FRAME_TIME) {
    accumulator -= FRAME_TIME;
    gameTime += FRAME_TIME;
  }

  updateLight(timestamp);

  if (levelManager.isCurrentlyTransitioning()) {
    handleTransition(timestamp);
  }

  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  drawBackground(timestamp);
  drawStars(timestamp);
  drawTarget(timestamp);
  drawLightSegments(timestamp);
  drawFlashEffects(timestamp);
  drawRotationTrails(timestamp);

  if (currentPrism) {
    drawPrism(currentPrism, timestamp);
  }

  for (let i = 0; i < currentMirrors.length; i++) {
    drawMirror(currentMirrors[i], i, timestamp);
  }

  drawEmitter(timestamp);
  drawVictoryWaves(timestamp);
  drawScreenFlash(timestamp);
  drawVictoryText(timestamp);
  drawInfoBar(timestamp);
  drawHint(timestamp);

  if (levelManager.isCurrentlyTransitioning()) {
    levelManager.drawTransition(ctx, CANVAS_W, CANVAS_H);
  }

  if (gameComplete) {
    ctx.save();
    ctx.font = 'bold 28px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#ffdd44';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#ffdd44';
    ctx.shadowBlur = 20;
    ctx.fillText('🎉 恭喜通关全部关卡！🎉', CANVAS_W / 2, CANVAS_H / 2);
    ctx.shadowBlur = 0;
    ctx.font = '16px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#88aaff';
    ctx.fillText('点击"重置"按钮重新开始', CANVAS_W / 2, CANVAS_H / 2 + 40);
    ctx.restore();
  }

  requestAnimationFrame(gameLoop);
}

function init(): void {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  canvas.addEventListener('mousedown', (e) => {
    const pos = getMousePos(e);
    mousePos = pos;
    if (isResetButtonHovered()) {
      if (gameComplete) {
        levelManager.resetToFirst();
      }
      resetLevel();
      return;
    }
    onMouseDown(e);
  });

  canvas.addEventListener('mousemove', (e) => {
    mousePos = getMousePos(e);
    onMouseMove(e);
  });

  canvas.addEventListener('mouseup', () => onMouseUp());
  canvas.addEventListener('mouseleave', () => onMouseUp());

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', { clientX: touch.clientX, clientY: touch.clientY });
    onMouseDown(mouseEvent);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', { clientX: touch.clientX, clientY: touch.clientY });
    onMouseMove(mouseEvent);
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    onMouseUp();
  }, { passive: false });

  loadLevel();

  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    setTimeout(() => {
      loadingScreen.classList.add('fade-out');
      setTimeout(() => loadingScreen.remove(), 600);
    }, 1500);
  }

  requestAnimationFrame(gameLoop);
}

init();
