export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface RedAlert {
  active: boolean;
  startTime: number;
  duration: number;
  repetitions: number;
  currentRep: number;
}

export interface HintGlow {
  cardId: number;
  startTime: number;
  duration: number;
}

export class EffectsManager {
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private redAlert: RedAlert = { active: false, startTime: 0, duration: 1000, repetitions: 3, currentRep: 0 };
  private hintGlows: HintGlow[] = [];
  private audioCtx: AudioContext | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.resize(canvas);
    window.addEventListener('resize', () => this.resize(canvas));
  }

  private resize(canvas: HTMLCanvasElement): void {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  spawnGoldParticles(centerX: number, centerY: number): void {
    const count = 30;
    const colors = ['#ffd700', '#ffed4e', '#fff4a3', '#ffc107', '#ffb300'];
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 40 + Math.random() * 80;
      const radius = 120;
      const dist = Math.random() * radius;
      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed * (0.5 + Math.random()),
        vy: Math.sin(angle) * speed * (0.5 + Math.random()),
        life: 1200,
        maxLife: 1200,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 4
      });
      this.particles[this.particles.length - 1].vx *= dist / radius;
      this.particles[this.particles.length - 1].vy *= dist / radius;
    }
  }

  triggerRedAlert(): void {
    this.redAlert = {
      active: true,
      startTime: performance.now(),
      duration: 1000,
      repetitions: 3,
      currentRep: 0
    };
    this.playAlertSound();
  }

  playAlertSound(): void {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (_e) {
      // silently ignore audio errors
    }
  }

  addHintGlow(cardId: number): void {
    this.hintGlows.push({
      cardId,
      startTime: performance.now(),
      duration: 3000
    });
  }

  getActiveHintCardIds(): number[] {
    const now = performance.now();
    return this.hintGlows
      .filter(h => now - h.startTime < h.duration)
      .map(h => h.cardId);
  }

  update(dt: number): void {
    this.particles = this.particles.filter(p => {
      p.x += p.vx * dt / 1000;
      p.y += p.vy * dt / 1000;
      p.vy += 50 * dt / 1000;
      p.life -= dt;
      return p.life > 0;
    });

    const now = performance.now();
    if (this.redAlert.active) {
      const elapsed = now - this.redAlert.startTime;
      const cycleTime = elapsed % this.redAlert.duration;
      if (cycleTime < 10 && elapsed > this.redAlert.duration) {
        this.redAlert.currentRep++;
        if (this.redAlert.currentRep >= this.redAlert.repetitions) {
          this.redAlert.active = false;
        }
      }
    }

    this.hintGlows = this.hintGlows.filter(h => now - h.startTime < h.duration);
  }

  render(): void {
    const { ctx } = this;
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    this.particles.forEach(p => {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    if (this.redAlert.active) {
      const now = performance.now();
      const elapsed = now - this.redAlert.startTime;
      const cycleTime = elapsed % this.redAlert.duration;
      const progress = cycleTime / this.redAlert.duration;
      const maxRadius = Math.max(w, h) * 0.5;
      const radius = maxRadius * progress;
      const alpha = 0.6 * (1 - progress);

      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, radius);
      grad.addColorStop(0, `rgba(255, 60, 60, 0)`);
      grad.addColorStop(0.8, `rgba(255, 60, 60, ${alpha * 0.3})`);
      grad.addColorStop(1, `rgba(255, 60, 60, ${alpha})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
  }
}
