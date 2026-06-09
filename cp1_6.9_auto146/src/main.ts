import p5 from 'p5';
import { Synth, type WaveformType } from './synth';
import {
  Wave,
  type WavePoint,
  type Particle,
  colorFromDirection,
  createParticles,
  updateAndDrawParticles
} from './wave';
import { UIController } from './ui';

const CANVAS_W = 960;
const CANVAS_H = 640;

const BG_COLOR_A = { r: 10, g: 15, b: 42 };
const BG_COLOR_B = { r: 42, g: 10, b: 21 };
const BORDER_A = { r: 102, g: 153, b: 255 };
const BORDER_B = { r: 255, g: 102, b: 136 };

interface InterferenceKey {
  key: string;
  time: number;
}

const sketch = (p: p5) => {
  const synth = new Synth();
  const ui = new UIController();

  let waves: Wave[] = [];
  let particles: Particle[] = [];
  let isDrawing = false;
  let currentPoints: WavePoint[] = [];
  let lastX = 0;
  let lastY = 0;
  let totalDirection = { dx: 0, dy: 0 };
  let interferenceCount = 0;
  let recentInterferences: InterferenceKey[] = [];
  let targetBgT = 0;
  let currentBgT = 0;
  let startTime = 0;

  p.setup = () => {
    const canvas = p.createCanvas(CANVAS_W, CANVAS_H);
    canvas.parent('canvas-wrapper');
    p.pixelDensity(window.devicePixelRatio || 1);
    startTime = performance.now();

    ui.onGenerate = () => {
      synth.resume();
      generateRandomWave();
    };

    ui.onClear = () => {
      clearAll();
    };
  };

  p.draw = () => {
    const now = performance.now();
    const elapsed = now - startTime;

    updateBackgroundTarget();
    currentBgT = lerp(currentBgT, targetBgT, 0.02);

    drawBackground();

    if (isDrawing && currentPoints.length > 0) {
      drawCurrentTrail();
    }

    for (const w of waves) {
      w.update(elapsed);
      w.draw(p);
    }

    particles = updateAndDrawParticles(p, particles);
    if (particles.length > 400) {
      particles = particles.slice(particles.length - 400);
    }

    checkAllInterferences();

    updateHeader();
    updateBorder();

    if (isDrawing) {
      drawCursorHint();
    }
  };

  p.mousePressed = () => {
    if (!isOnCanvas()) return;
    synth.resume();
    isDrawing = true;
    currentPoints = [];
    totalDirection = { dx: 0, dy: 0 };
    const mx = p.mouseX;
    const my = p.mouseY;
    currentPoints.push({ x: mx, y: my, baseY: my });
    lastX = mx;
    lastY = my;
  };

  p.mouseDragged = () => {
    if (!isDrawing) return;
    const mx = p.constrain(p.mouseX, 0, CANVAS_W);
    const my = p.constrain(p.mouseY, 0, CANVAS_H);
    const dx = mx - lastX;
    const dy = my - lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 3) {
      currentPoints.push({ x: mx, y: my, baseY: my });
      totalDirection.dx += dx;
      totalDirection.dy += dy;
      lastX = mx;
      lastY = my;
    }
  };

  p.mouseReleased = () => {
    if (!isDrawing) return;
    isDrawing = false;
    if (currentPoints.length >= 2) {
      const params = ui.getParams();
      const color =
        totalDirection.dx !== 0 || totalDirection.dy !== 0
          ? colorFromDirection(totalDirection.dx, totalDirection.dy)
          : randomColor();
      const wave = new Wave(
        [...currentPoints],
        params.frequency,
        params.amplitude,
        color,
        params.waveform as WaveformType,
        synth
      );
      waves.push(wave);
    }
    currentPoints = [];
  };

  function isOnCanvas(): boolean {
    return (
      p.mouseX >= 0 &&
      p.mouseX <= CANVAS_W &&
      p.mouseY >= 0 &&
      p.mouseY <= CANVAS_H
    );
  }

  function drawBackground(): void {
    const r = Math.round(lerp(BG_COLOR_A.r, BG_COLOR_B.r, currentBgT));
    const g = Math.round(lerp(BG_COLOR_A.g, BG_COLOR_B.g, currentBgT));
    const b = Math.round(lerp(BG_COLOR_A.b, BG_COLOR_B.b, currentBgT));
    p.background(r, g, b);

    const ctx = (p as any).drawingContext as CanvasRenderingContext2D;
    const grad = ctx.createRadialGradient(
      CANVAS_W / 2,
      CANVAS_H / 2,
      50,
      CANVAS_W / 2,
      CANVAS_H / 2,
      CANVAS_W * 0.7
    );
    grad.addColorStop(0, `rgba(${102}, ${153}, ${255}, 0.08)`);
    grad.addColorStop(0.5, `rgba(${255}, ${102}, ${136}, 0.05)`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  function drawCurrentTrail(): void {
    if (currentPoints.length < 2) return;
    const color =
      totalDirection.dx !== 0 || totalDirection.dy !== 0
        ? colorFromDirection(totalDirection.dx, totalDirection.dy)
        : '#ff88aa';
    p.noFill();
    p.stroke(color);
    p.strokeWeight(2.5);
    const ctx = (p as any).drawingContext as CanvasRenderingContext2D;
    ctx.shadowBlur = 12;
    ctx.shadowColor = color;
    p.beginShape();
    for (const pt of currentPoints) {
      p.vertex(pt.x, pt.y);
    }
    p.endShape();
    ctx.shadowBlur = 0;
  }

  function drawCursorHint(): void {
    const color =
      totalDirection.dx !== 0 || totalDirection.dy !== 0
        ? colorFromDirection(totalDirection.dx, totalDirection.dy)
        : '#ff88aa';
    p.noStroke();
    const ctx = (p as any).drawingContext as CanvasRenderingContext2D;
    ctx.shadowBlur = 20;
    ctx.shadowColor = color;
    p.fill(color);
    p.circle(p.mouseX, p.mouseY, 8);
    ctx.shadowBlur = 0;
  }

  function checkAllInterferences(): void {
    recentInterferences = recentInterferences.filter(
      (k) => performance.now() - k.time < 300
    );
    const checkedKeys = new Set(recentInterferences.map((k) => k.key));

    for (let i = 0; i < waves.length; i++) {
      for (let j = i + 1; j < waves.length; j++) {
        const w1 = waves[i];
        const w2 = waves[j];
        const hits = w1.checkInterference(w2);
        if (hits && hits.length > 0) {
          for (const h of hits) {
            const key = `${Math.round(h.x)}_${Math.round(h.y)}`;
            if (!checkedKeys.has(key)) {
              checkedKeys.add(key);
              recentInterferences.push({ key, time: performance.now() });
              const newParticles = createParticles(h.x, h.y, h.color, 8);
              particles.push(...newParticles);
              const freqs = [w1.frequency, w2.frequency];
              if (w1.id < w2.id) {
                w1.triggerInterferenceSound(freqs);
              } else {
                w2.triggerInterferenceSound(freqs);
              }
              interferenceCount++;
            }
          }
        }
      }
    }
  }

  function updateBackgroundTarget(): void {
    const n = waves.length;
    if (n <= 1) targetBgT = 0;
    else if (n >= 5) targetBgT = 1;
    else targetBgT = (n - 1) / 4;
  }

  function updateHeader(): void {
    const header = document.getElementById('header');
    if (header) {
      header.textContent = `活跃轨迹: ${waves.length} | 干涉次数: ${interferenceCount}`;
    }
  }

  function updateBorder(): void {
    const wrapper = document.getElementById('canvas-wrapper');
    if (!wrapper) return;
    const t = currentBgT;
    const r = Math.round(lerp(BORDER_A.r, BORDER_B.r, t));
    const g = Math.round(lerp(BORDER_A.g, BORDER_B.g, t));
    const b = Math.round(lerp(BORDER_A.b, BORDER_B.b, t));
    wrapper.style.borderColor = `rgb(${r}, ${g}, ${b})`;
    wrapper.style.boxShadow = `0 0 15px rgba(${r}, ${g}, ${b}, 0.5), 0 0 30px rgba(${255 - r}, ${255 - g}, ${255 - b}, 0.2), inset 0 0 20px rgba(10, 15, 42, 0.5)`;
  }

  function generateRandomWave(): void {
    const points: WavePoint[] = [];
    const startX = 50 + Math.random() * (CANVAS_W - 100);
    const startY = 50 + Math.random() * (CANVAS_H - 100);
    let x = startX;
    let y = startY;
    points.push({ x, y, baseY: y });
    const segments = 15 + Math.floor(Math.random() * 20);
    let tdx = 0;
    let tdy = 0;
    for (let i = 0; i < segments; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 50;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      x = p.constrain(x + dx, 20, CANVAS_W - 20);
      y = p.constrain(y + dy, 20, CANVAS_H - 20);
      points.push({ x, y, baseY: y });
      tdx += dx;
      tdy += dy;
    }
    const params = ui.getParams();
    const freq = 100 + Math.floor(Math.random() * 800);
    const color =
      tdx !== 0 || tdy !== 0 ? colorFromDirection(tdx, tdy) : randomColor();
    const wave = new Wave(
      points,
      freq,
      params.amplitude,
      color,
      params.waveform as WaveformType,
      synth
    );
    waves.push(wave);
  }

  function clearAll(): void {
    for (const w of waves) {
      w.stop();
    }
    waves = [];
    particles = [];
    interferenceCount = 0;
    recentInterferences = [];
  }

  function randomColor(): string {
    const colors = [
      '#ff4466',
      '#ff8844',
      '#ffcc44',
      '#44ff88',
      '#44ccff',
      '#4488ff',
      '#aa44ff',
      '#ff44cc'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
};

new p5(sketch);
