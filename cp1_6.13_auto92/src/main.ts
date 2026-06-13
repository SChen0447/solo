import { StarSystem } from './starSystem';
import { Planet } from './planet';
import { OrbitRing } from './orbitRing';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  private starSystem!: StarSystem;
  private orbit!: OrbitRing;
  private planets: Planet[] = [];

  private mouseX: number | null = null;
  private mouseY: number | null = null;
  private draggingPlanet: Planet | null = null;

  private lastTime: number = 0;
  private rafId: number = 0;
  private running: boolean = false;

  private totalPlanets: number = 12;
  private placedCount: number = 0;
  private audioCtx: AudioContext | null = null;
  private chaosCircleEl!: HTMLElement;
  private chaosCountEl!: HTMLElement;
  private victoryTriggered: boolean = false;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.chaosCircleEl = document.getElementById('chaos-circle') as HTMLElement;
    this.chaosCountEl = document.getElementById('chaos-count') as HTMLElement;
    this.init();
  }

  private init() {
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());

    this.starSystem = new StarSystem(200);
    this.orbit = new OrbitRing(this.width / 2, this.height / 2, this.totalPlanets);
    this.createPlanets();
    this.updateChaosIndicator();
    this.bindEvents();
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private handleResize() {
    this.dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.starSystem) this.starSystem.resize(this.width, this.height);
    if (this.orbit) {
      this.orbit.resize(this.width, this.height);
      this.orbit.setCenter(this.width / 2, this.height / 2);
    }
  }

  private createPlanets() {
    this.planets = [];
    for (let i = 0; i < this.totalPlanets; i++) {
      const planet = new Planet(i, this.width / 2, this.height / 2, this.width, this.height);
      this.planets.push(planet);
    }
  }

  private bindEvents() {
    const c = this.canvas;

    c.addEventListener('mousedown', e => this.onPointerDown(e.clientX, e.clientY));
    c.addEventListener('mousemove', e => this.onPointerMove(e.clientX, e.clientY));
    c.addEventListener('mouseup', () => this.onPointerUp());
    c.addEventListener('mouseleave', () => this.onPointerUp());

    c.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.touches[0];
      if (t) this.onPointerDown(t.clientX, t.clientY);
    }, { passive: false });

    c.addEventListener('touchmove', e => {
      e.preventDefault();
      const t = e.touches[0];
      if (t) this.onPointerMove(t.clientX, t.clientY);
    }, { passive: false });

    c.addEventListener('touchend', e => {
      e.preventDefault();
      this.onPointerUp();
    }, { passive: false });

    const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    resetBtn.addEventListener('click', () => this.reset());
  }

  private onPointerDown(px: number, py: number) {
    this.ensureAudio();
    this.mouseX = px;
    this.mouseY = py;

    for (let i = this.planets.length - 1; i >= 0; i--) {
      const p = this.planets[i];
      if (p.containsPoint(px, py)) {
        if (p.isInOrbit()) {
          this.orbit.releasePhase(p);
          this.placedCount = Math.max(0, this.placedCount - 1);
          this.updateChaosIndicator();
          this.victoryTriggered = false;
        }
        p.startDrag();
        this.draggingPlanet = p;
        const top = this.planets.splice(i, 1)[0];
        this.planets.push(top);
        break;
      }
    }
  }

  private onPointerMove(px: number, py: number) {
    this.mouseX = px;
    this.mouseY = py;
  }

  private onPointerUp() {
    if (this.draggingPlanet) {
      const p = this.draggingPlanet;
      p.endDrag();

      const result = this.orbit.checkPhase(p);
      if (result.placed) {
        this.placedCount++;
        this.updateChaosIndicator();
        this.playTone(this.placedCount);
        setTimeout(() => {
          if (result.burstAt && result.color) {
            this.orbit.spawnBurstParticles(p.x, p.y, result.color);
          }
        }, 260);
        this.checkVictory();
      }
      this.draggingPlanet = null;
    }
    this.mouseX = null;
    this.mouseY = null;
  }

  private ensureAudio() {
    if (!this.audioCtx) {
      try {
        const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
        this.audioCtx = new Ctx();
      } catch {
        this.audioCtx = null;
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  private playTone(step: number) {
    if (!this.audioCtx) return;
    try {
      const ctx = this.audioCtx;
      const t = ctx.currentTime;
      const freq = 200 + (step / this.totalPlanets) * 600;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);

      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.52);
    } catch {
    }
  }

  private updateChaosIndicator() {
    const remaining = this.totalPlanets - this.placedCount;
    const progress = this.placedCount / this.totalPlanets;
    this.chaosCountEl.textContent = String(remaining);

    const r1 = 255, g1 = 51, b1 = 85;
    const r2 = 20, g2 = 220, b2 = 120;
    const r = Math.round(r1 + (r2 - r1) * progress);
    const g = Math.round(g1 + (g2 - g1) * progress);
    const b = Math.round(b1 + (b2 - b1) * progress);

    const stops = [];
    const segments = this.totalPlanets;
    for (let i = 0; i < segments; i++) {
      const segProgress = i / segments;
      const placed = segProgress < progress;
      if (placed) {
        const cr = Math.round(r1 + (r2 - r1) * segProgress);
        const cg = Math.round(g1 + (g2 - g1) * segProgress);
        const cb = Math.round(b1 + (b2 - b1) * segProgress);
        stops.push(`rgb(${cr},${cg},${cb}) ${(i / segments) * 100}% ${((i + 1) / segments) * 100}%`);
      } else {
        stops.push(`rgba(${r},${g},${b},0.25) ${(i / segments) * 100}% ${((i + 1) / segments) * 100}%`);
      }
    }

    this.chaosCircleEl.style.background = `conic-gradient(from 0deg, ${stops.join(', ')})`;
    this.chaosCircleEl.style.boxShadow = `0 0 ${8 + progress * 18}px rgba(${r},${g},${b},${0.3 + progress * 0.5})`;
  }

  private checkVictory() {
    if (this.placedCount >= this.totalPlanets && !this.victoryTriggered) {
      this.victoryTriggered = true;
      this.orbit.triggerVictoryFlower();
      this.starSystem.triggerVictoryFlash();
      this.playVictoryChord();
    }
  }

  private playVictoryChord() {
    if (!this.audioCtx) return;
    try {
      const ctx = this.audioCtx;
      const t = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.50];

      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t + i * 0.1);

        const st = t + i * 0.1;
        gain.gain.setValueAtTime(0.0001, st);
        gain.gain.exponentialRampToValueAtTime(0.18, st + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, st + 1.5);

        osc.connect(gain).connect(ctx.destination);
        osc.start(st);
        osc.stop(st + 1.55);
      });
    } catch {
    }
  }

  private reset() {
    this.placedCount = 0;
    this.victoryTriggered = false;
    this.orbit.reset();
    this.createPlanets();
    this.updateChaosIndicator();
    this.starSystem.repositionStars();
  }

  private drawBackground() {
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#0a0520');
    grad.addColorStop(1, '#1a0a2e');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    const vignette = this.ctx.createRadialGradient(
      this.width / 2, this.height / 2, Math.min(this.width, this.height) * 0.1,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.75
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
    this.ctx.fillStyle = vignette;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private loop = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(50, now - this.lastTime);
    this.lastTime = now;

    this.drawBackground();
    this.starSystem.update(dt);
    this.starSystem.draw(this.ctx);
    this.orbit.update(dt, this.planets);
    this.orbit.draw(this.ctx);

    for (const p of this.planets) {
      p.update(
        dt,
        (p.isDragging || this.draggingPlanet === p) ? this.mouseX : null,
        (p.isDragging || this.draggingPlanet === p) ? this.mouseY : null,
        this.width / 2,
        this.height / 2
      );
      p.draw(
        this.ctx,
        (p.isDragging || this.draggingPlanet === p) ? this.mouseX : null,
        (p.isDragging || this.draggingPlanet === p) ? this.mouseY : null
      );
    }

    if (this.draggingPlanet && this.mouseX !== null && this.mouseY !== null) {
      const info = this.orbit.getNearestPhase(this.mouseX, this.mouseY);
      const dist = this.orbit.getDistanceToOrbit(this.mouseX, this.mouseY);
      const canPlace = dist < this.orbit.attractionRadius && !this.orbit.isPhaseOccupied(info.phaseIndex);

      if (canPlace) {
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(120, 220, 255, 0.7)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([6, 6]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.mouseX, this.mouseY);
        this.ctx.lineTo(info.posX, info.posY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        this.ctx.beginPath();
        this.ctx.arc(info.posX, info.posY, this.draggingPlanet.baseRadius * 1.1, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(120, 220, 255, 0.5)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.restore();
      }
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  destroy() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
