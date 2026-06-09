import p5 from 'p5';
import {
  TotemSymbol,
  Primitive,
  ARENA_RADIUS,
  INITIAL_SYMBOL_COUNT,
  INITIAL_SYMBOL_COUNT_MOBILE,
  SpeedLevel
} from './types';
import { SymbolGenerator } from './SymbolGenerator';
import { EvolutionEngine } from './EvolutionEngine';

const sketch = (p: p5) => {
  let generator: SymbolGenerator;
  let engine: EvolutionEngine;
  let centerX: number;
  let centerY: number;
  let isMobile: boolean;
  let lastTime: number = 0;

  const statCountEl = document.getElementById('stat-count') as HTMLSpanElement;
  const statMutateEl = document.getElementById('stat-mutate') as HTMLSpanElement;
  const statFuseEl = document.getElementById('stat-fuse') as HTMLSpanElement;
  const statGenEl = document.getElementById('stat-gen') as HTMLSpanElement;
  const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
  const btnSpeed = document.getElementById('btn-speed') as HTMLButtonElement;

  const setupUI = () => {
    btnReset.addEventListener('click', () => {
      const count = isMobile ? INITIAL_SYMBOL_COUNT_MOBILE : INITIAL_SYMBOL_COUNT;
      const newSymbols = generator.generateInitialSymbols(count, centerX, centerY);
      engine.reset(newSymbols);
    });

    btnSpeed.addEventListener('click', () => {
      const current = engine.getSpeed();
      let next: SpeedLevel;
      if (current === 1) next = 2;
      else if (current === 2) next = 5;
      else next = 1;

      engine.setSpeed(next);
      btnSpeed.textContent = `${next}x`;
      btnSpeed.classList.remove('speed-1x', 'speed-2x', 'speed-5x');
      btnSpeed.classList.add(`speed-${next}x`);
    });

    window.addEventListener('resize', () => {
      isMobile = window.innerWidth < 768;
      let w, h;
      const maxWidth = 1200;
      if (isMobile) {
        w = window.innerWidth;
        h = (w * 9) / 16;
      } else {
        w = Math.min(window.innerWidth, maxWidth);
        h = (w * 9) / 16;
        if (h > window.innerHeight) {
          h = window.innerHeight;
          w = (h * 16) / 9;
        }
      }
      p.resizeCanvas(w, h);
      centerX = p.width / 2;
      centerY = p.height / 2;
    });
  };

  const drawBackground = () => {
    const gradient = p.drawingContext.createLinearGradient(0, 0, p.width, p.height);
    gradient.addColorStop(0, '#2a1f14');
    gradient.addColorStop(1, '#1a0f0a');
    p.drawingContext.fillStyle = gradient;
    p.rect(0, 0, p.width, p.height);
  };

  const drawArena = () => {
    const scale = Math.min(p.width / 1200, p.height / 675);
    const arenaRadius = ARENA_RADIUS * scale;

    const ctx = p.drawingContext;
    const glow = ctx.createRadialGradient(centerX, centerY, arenaRadius * 0.6, centerX, centerY, arenaRadius * 1.4);
    glow.addColorStop(0, 'rgba(107, 78, 58, 0.3)');
    glow.addColorStop(1, 'rgba(107, 78, 58, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, arenaRadius * 1.4, 0, p.TWO_PI);
    ctx.fill();

    ctx.fillStyle = '#6b4e3a';
    ctx.beginPath();
    ctx.arc(centerX, centerY, arenaRadius, 0, p.TWO_PI);
    ctx.fill();
  };

  const drawPrimitive = (prim: Primitive) => {
    const ctx = p.drawingContext;
    ctx.save();
    ctx.translate(prim.offsetX, prim.offsetY);
    ctx.rotate(prim.rotation);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = prim.color;

    switch (prim.type) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, prim.size, 0, p.TWO_PI);
        ctx.fill();
        break;
      case 'triangle':
        ctx.beginPath();
        const h = prim.size * Math.sqrt(3) / 2;
        ctx.moveTo(0, -h * 2 / 3);
        ctx.lineTo(-prim.size / 2, h / 3);
        ctx.lineTo(prim.size / 2, h / 3);
        ctx.closePath();
        ctx.fill();
        break;
      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(0, -prim.size / 2);
        ctx.lineTo(prim.size / 2, 0);
        ctx.lineTo(0, prim.size / 2);
        ctx.lineTo(-prim.size / 2, 0);
        ctx.closePath();
        ctx.fill();
        break;
      case 'spiral':
        ctx.beginPath();
        const turns = 4;
        const maxR = prim.size;
        const totalAngle = turns * p.TWO_PI;
        for (let a = 0; a <= totalAngle; a += 0.1) {
          const r = (a / totalAngle) * maxR;
          const x = p.cos(a) * r;
          const y = p.sin(a) * r;
          if (a === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = prim.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
    }

    ctx.restore();
  };

  const drawSymbol = (s: TotemSymbol, scale: number) => {
    const ctx = p.drawingContext;
    ctx.save();
    ctx.translate(s.x * scale + (centerX - centerX * scale), s.y * scale + (centerY - centerY * scale));
    ctx.rotate(s.rotation);
    ctx.scale(s.scale, s.scale);

    for (const prim of s.primitives) {
      drawPrimitive(prim);
    }

    ctx.restore();
  };

  const drawSymbols = (symbols: TotemSymbol[]) => {
    const scale = Math.min(p.width / 1200, p.height / 675);
    for (const s of symbols) {
      drawSymbol(s, scale);
    }
  };

  const updateStats = () => {
    const stats = engine.getStats();
    if (statCountEl) statCountEl.textContent = String(stats.symbolCount);
    if (statMutateEl) statMutateEl.textContent = String(stats.mutationCount);
    if (statFuseEl) statFuseEl.textContent = String(stats.fusionCount);
    if (statGenEl) statGenEl.textContent = String(stats.generation);
  };

  p.setup = () => {
    const container = document.getElementById('canvas-container') as HTMLDivElement;
    isMobile = window.innerWidth < 768;

    let w, h;
    const maxWidth = 1200;
    if (isMobile) {
      w = window.innerWidth;
      h = (w * 9) / 16;
    } else {
      w = Math.min(window.innerWidth, maxWidth);
      h = (w * 9) / 16;
      if (h > window.innerHeight) {
        h = window.innerHeight;
        w = (h * 16) / 9;
      }
    }

    const canvas = p.createCanvas(w, h);
    canvas.parent(container);

    centerX = p.width / 2;
    centerY = p.height / 2;

    generator = new SymbolGenerator(p);
    const initialCount = isMobile ? INITIAL_SYMBOL_COUNT_MOBILE : INITIAL_SYMBOL_COUNT;
    const initialSymbols = generator.generateInitialSymbols(initialCount, centerX, centerY);
    engine = new EvolutionEngine(p, centerX, centerY, initialSymbols, generator, isMobile);

    setupUI();

    lastTime = p.millis();
  };

  p.draw = () => {
    const currentTime = p.millis();
    const dt = Math.min(currentTime - lastTime, 50);
    lastTime = currentTime;

    drawBackground();
    engine.update(dt);
    drawArena();
    drawSymbols(engine.getSymbols());
    updateStats();
  };

  p.mousePressed = () => {
    if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return;
    const scale = Math.min(p.width / 1200, p.height / 675);
    const x = (p.mouseX - (centerX - centerX * scale)) / scale;
    const y = (p.mouseY - (centerY - centerY * scale)) / scale;
    engine.triggerMutation(x, y);
  };
};

new p5(sketch);
