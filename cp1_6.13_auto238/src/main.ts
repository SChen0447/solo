import { FungusManager, FungusRenderData, BloomEvent, hexToRgba } from './FungusManager';
import { ParticleSystem, ParticleRenderData } from './ParticleSystem';
import * as Tone from 'tone';

const BASE_W = 1200;
const BASE_H = 800;
const MIN_W = 800;
const MIN_H = 600;

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let fungusManager: FungusManager;
let particleSystem: ParticleSystem;
let synth: Tone.Synth | null = null;
let audioStarted = false;

let mouseX: number = -9999;
let mouseY: number = -9999;
let hasMouse = false;
let mouseHaloColor: string | null = null;
let mouseHaloColorAnim: { r: number; g: number; b: number } = { r: 255, g: 255, b: 255 };
let mouseHaloTarget: { r: number; g: number; b: number } = { r: 255, g: 255, b: 255 };

let lastFrameTime = 0;
let fpsAccum = 0;
let fpsFrames = 0;
let _fpsDisplay = 60;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

function resizeCanvas(): void {
  const w = Math.max(MIN_W, window.innerWidth);
  const h = Math.max(MIN_H, window.innerHeight);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  fungusManager.resize(w, h);
}

function initAudio(): void {
  if (audioStarted) return;
  audioStarted = true;
  Tone.start().catch(() => {});
  try {
    synth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.005,
        decay: 0.15,
        sustain: 0.02,
        release: 0.08
      }
    }).toDestination();
    synth.volume.value = -8;
  } catch (_e) {
    synth = null;
  }
}

function playBloomSound(audioX: number): void {
  if (!synth) return;
  const baseFreq = 1200 + audioX * 600;
  const jitter = (Math.random() - 0.5) * 200;
  const freq = Math.max(1200, Math.min(1800, baseFreq + jitter));
  try {
    synth.triggerAttackRelease(freq, '0.2');
  } catch (_e) {}
}

function handleBloom(event: BloomEvent): void {
  particleSystem.emit(event.x, event.y, 6 + Math.floor(Math.random() * 5));
  playBloomSound(event.audioX);
  mouseHaloColor = event.color;
  const rgb = hexToRgb(event.color);
  mouseHaloTarget = rgb;
  setTimeout(() => {
    if (mouseHaloColor === event.color) {
      mouseHaloColor = null;
      mouseHaloTarget = { r: 255, g: 255, b: 255 };
    }
  }, 300);
}

function drawFloorGlow(d: FungusRenderData): void {
  ctx.save();
  ctx.beginPath();
  const color = hexToRgba(d.baseColor, 0.2 * d.brightness);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 30;
  ctx.arc(d.baseX, d.baseY + 2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStem(d: FungusRenderData): void {
  const angle = d.currentAngle;
  const tipX = d.baseX + Math.sin(angle) * d.stemLength;
  const tipY = d.baseY - Math.cos(angle) * d.stemLength;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = d.stemWidth;
  const alpha = 0.85 * d.brightness;
  const color = hexToRgba(d.baseColor, Math.min(1, alpha));
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;

  ctx.beginPath();
  ctx.moveTo(d.baseX, d.baseY);
  const ctrlX = d.baseX + Math.sin(angle * 0.5) * d.stemLength * 0.5;
  const ctrlY = d.baseY - Math.cos(angle * 0.5) * d.stemLength * 0.5;
  ctx.quadraticCurveTo(ctrlX, ctrlY, tipX, tipY);
  ctx.stroke();
  ctx.restore();
}

function drawCap(d: FungusRenderData): void {
  const angle = d.currentAngle;
  const tipX = d.baseX + Math.sin(angle) * d.stemLength;
  const tipY = d.baseY - Math.cos(angle) * d.stemLength;
  const capRadius = 10 * d.capScale;

  ctx.save();
  ctx.translate(tipX, tipY);
  ctx.rotate(angle);

  const alpha = 0.9 * d.brightness;
  const color = hexToRgba(d.baseColor, Math.min(1, alpha));
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 25;

  ctx.beginPath();
  ctx.ellipse(0, 0, capRadius, capRadius * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();

  for (const s of d.spots) {
    const sa = 0.95 * d.brightness;
    ctx.fillStyle = hexToRgba('#ffffff', Math.min(1, sa));
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(s.offsetX, s.offsetY, s.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHighlight(d: FungusRenderData): void {
  const angle = d.currentAngle;
  const tipX = d.baseX + Math.sin(angle) * d.stemLength;
  const tipY = d.baseY - Math.cos(angle) * d.stemLength;
  const capRadius = 10 * d.capScale;

  ctx.save();
  ctx.translate(tipX, tipY);
  ctx.rotate(angle);
  ctx.strokeStyle = hexToRgba(d.baseColor, 0.8);
  ctx.shadowColor = d.baseColor;
  ctx.shadowBlur = 15;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 0, capRadius + 2, capRadius * 0.65 + 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawParticles(list: ParticleRenderData[]): void {
  for (const p of list) {
    if (p.alpha <= 0) break;
    ctx.save();
    ctx.fillStyle = hexToRgba(p.color, p.alpha);
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawMouseHalo(w: number, h: number): void {
  if (!hasMouse || mouseX < -5000 || mouseY < -5000) return;
  if (mouseX > w + 100 || mouseY > h + 100) return;

  const haloX = mouseX;
  const haloY = mouseY - 20;

  mouseHaloColorAnim.r = lerp(mouseHaloColorAnim.r, mouseHaloTarget.r, 0.15);
  mouseHaloColorAnim.g = lerp(mouseHaloColorAnim.g, mouseHaloTarget.g, 0.15);
  mouseHaloColorAnim.b = lerp(mouseHaloColorAnim.b, mouseHaloTarget.b, 0.15);

  const r = Math.round(mouseHaloColorAnim.r);
  const g = Math.round(mouseHaloColorAnim.g);
  const b = Math.round(mouseHaloColorAnim.b);

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  const gradient = ctx.createRadialGradient(haloX, haloY, 0, haloX, haloY, 20);
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.22)`);
  gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.1)`);
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(haloX, haloY, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.9)`;
  ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 1)`;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(mouseX, mouseY, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function render(fungi: FungusRenderData[], particles: ParticleRenderData[], w: number, h: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (const d of fungi) drawFloorGlow(d);
  for (const d of fungi) drawStem(d);
  for (const d of fungi) drawCap(d);
  for (const d of fungi) { if (d.highlight) drawHighlight(d); }

  drawParticles(particles);
  ctx.restore();

  drawMouseHalo(w, h);

  // fps
  fpsAccum += performance.now() - lastFrameTime;
  fpsFrames++;
  if (fpsAccum >= 500) {
    _fpsDisplay = Math.round(fpsFrames * 1000 / fpsAccum);
    fpsAccum = 0;
    fpsFrames = 0;
  }
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(100, 200, 255, 0.25)';
  ctx.font = '10px monospace';
  ctx.fillText(`${_fpsDisplay}FPS  P:${particleSystem.getActiveCount()}`, 10, 16);
  ctx.restore();
}

function gameLoop(timestamp: number): void {
  const delta = lastFrameTime === 0 ? 16 : Math.min(50, timestamp - lastFrameTime);
  lastFrameTime = timestamp;

  const w = Math.max(MIN_W, window.innerWidth);
  const h = Math.max(MIN_H, window.innerHeight);

  if (hasMouse) {
    fungusManager.handleMouseMove(mouseX, mouseY);
  }

  const fungi = fungusManager.update(delta);
  const particles = particleSystem.update(delta);

  render(fungi, particles, w, h);

  requestAnimationFrame(gameLoop);
}

function onMouseMove(e: MouseEvent): void {
  mouseX = e.clientX;
  mouseY = e.clientY;
  hasMouse = true;
  initAudio();
}

function onMouseLeave(): void {
  hasMouse = false;
}

function onTouchMove(e: TouchEvent): void {
  if (e.touches.length > 0) {
    mouseX = e.touches[0].clientX;
    mouseY = e.touches[0].clientY;
    hasMouse = true;
    initAudio();
  }
  e.preventDefault();
}

function onTouchEnd(): void {
  hasMouse = false;
}

function onResize(): void {
  resizeCanvas();
}

function init(): void {
  canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  const ctx2d = canvas.getContext('2d');
  if (!ctx2d) throw new Error('Canvas 2D context not available');
  ctx = ctx2d;

  const initW = Math.max(MIN_W, window.innerWidth);
  const initH = Math.max(MIN_H, window.innerHeight);

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = initW * dpr;
  canvas.height = initH * dpr;
  canvas.style.width = initW + 'px';
  canvas.style.height = initH + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  void BASE_W; void BASE_H;

  fungusManager = new FungusManager(initW, initH);
  particleSystem = new ParticleSystem(200);

  fungusManager.onBloom(handleBloom);

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseleave', onMouseLeave);
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd);
  window.addEventListener('resize', onResize);

  window.addEventListener('click', () => { initAudio(); }, { once: false });

  lastFrameTime = 0;
  requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', init);
