import { rand } from './utils';

export interface Particle {
  x: number;
  y: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface Cloud {
  x: number;
  y: number;
  speed: number;
  blobs: { ox: number; oy: number; r: number }[];
  direction: number;
}

export interface HoverGlow {
  x: number;
  y: number;
  startTime: number;
}

export class Scene {
  completed = false;
  completionTime = 0;
  bgTransition = 0;
  particles: Particle[] = [];
  clouds: Cloud[] = [];
  hoverGlows: HoverGlow[] = [];
  mouseOnSea = false;
  mouseOnSky = false;
  listening = false;
  listenStartTime = 0;
  glowEdgeRadius = 0;
  glowEdgeActive = false;
  private audioCtx: AudioContext | null = null;
  private oceanNode: AudioBufferSourceNode | null = null;
  private birdTimeouts: number[] = [];
  seaRegion = { x: 0, y: 0, w: 0, h: 0 };
  skyRegion = { x: 0, y: 0, w: 0, h: 0 };
  private nextParticleTime = 0;

  initClouds(canvasW: number, canvasH: number): void {
    this.clouds = [];
    for (let i = 0; i < 4; i++) {
      const blobs: { ox: number; oy: number; r: number }[] = [];
      const count = 3 + Math.floor(rand(0, 3));
      for (let j = 0; j < count; j++) {
        blobs.push({ ox: rand(-30, 30), oy: rand(-10, 10), r: rand(20, 45) });
      }
      this.clouds.push({
        x: rand(0, canvasW),
        y: rand(canvasH * 0.05, canvasH * 0.25),
        speed: rand(0.15, 0.4),
        blobs,
        direction: 1,
      });
    }
  }

  triggerCompletion(now: number, canvasW: number, canvasH: number): void {
    this.completed = true;
    this.completionTime = now;
    this.seaRegion = { x: 0, y: canvasH * 0.45, w: canvasW, h: canvasH * 0.55 };
    this.skyRegion = { x: 0, y: 0, w: canvasW, h: canvasH * 0.45 };
    this.initClouds(canvasW, canvasH);
  }

  reset(): void {
    this.completed = false;
    this.completionTime = 0;
    this.bgTransition = 0;
    this.particles = [];
    this.clouds = [];
    this.hoverGlows = [];
    this.mouseOnSea = false;
    this.mouseOnSky = false;
    this.glowEdgeRadius = 0;
    this.glowEdgeActive = false;
    this.stopAudio();
  }

  addHoverGlow(x: number, y: number, now: number): void {
    this.hoverGlows.push({ x, y, startTime: now });
  }

  update(now: number, canvasW: number, canvasH: number): void {
    if (!this.completed) return;

    const elapsed = now - this.completionTime;
    this.bgTransition = Math.min(1, elapsed / 2000);

    if (now >= this.nextParticleTime) {
      const freq = this.mouseOnSea ? 250 : 500;
      this.nextParticleTime = now + freq;
      const count = this.mouseOnSea ? 2 : 1;
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: rand(this.seaRegion.x, this.seaRegion.x + this.seaRegion.w),
          y: rand(this.seaRegion.y, this.seaRegion.y + this.seaRegion.h),
          size: rand(1.5, 3),
          life: 0,
          maxLife: 200,
          color: this.mouseOnSea ? '#ffd700' : `rgba(255,${200 + Math.floor(rand(0, 55))},${150 + Math.floor(rand(0, 50))},1)`,
        });
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].life += 16;
      if (this.particles[i].life > this.particles[i].maxLife) {
        this.particles.splice(i, 1);
      }
    }

    for (const cloud of this.clouds) {
      const dir = this.mouseOnSky ? -cloud.direction : cloud.direction;
      cloud.x += cloud.speed * dir;
      if (cloud.x > canvasW + 100) cloud.x = -100;
      if (cloud.x < -100) cloud.x = canvasW + 100;
    }

    for (let i = this.hoverGlows.length - 1; i >= 0; i--) {
      if (now - this.hoverGlows[i].startTime > 800) {
        this.hoverGlows.splice(i, 1);
      }
    }

    if (this.glowEdgeActive) {
      const ge = now - this.listenStartTime;
      const maxR = canvasW * 0.3;
      this.glowEdgeRadius = Math.min(maxR, maxR * (ge % 2000) / 2000);
    } else {
      this.glowEdgeRadius = 0;
    }
  }

  drawBackground(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number, now: number): void {
    const t = this.bgTransition;

    const r1 = lerp(42, 20, t);
    const g1 = lerp(21, 15, t);
    const b1 = lerp(8, 50, t);
    const r2 = lerp(59, 80, t);
    const g2 = lerp(26, 50, t);
    const b2 = lerp(10, 100, t);

    const grad = ctx.createLinearGradient(0, 0, canvasW, canvasH);
    grad.addColorStop(0, `rgb(${r1},${g1},${b1})`);
    grad.addColorStop(1, `rgb(${r2},${g2},${b2})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    if (t < 1) {
      this.drawWoodGrain(ctx, canvasW, canvasH, 1 - t);
    }
  }

  private drawWoodGrain(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number): void {
    ctx.save();
    ctx.globalAlpha = alpha * 0.15;
    for (let i = 0; i < 40; i++) {
      const y = (i / 40) * h;
      ctx.strokeStyle = `rgba(80,40,10,${0.1 + Math.random() * 0.1})`;
      ctx.lineWidth = rand(0.5, 2);
      ctx.beginPath();
      ctx.moveTo(0, y + rand(-3, 3));
      for (let x = 0; x < w; x += 40) {
        ctx.lineTo(x, y + rand(-3, 3));
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  drawCompletionGlow(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number, now: number): void {
    if (!this.completed) return;
    const elapsed = now - this.completionTime;
    if (elapsed > 2000) return;

    const progress = Math.min(1, elapsed / 2000);
    const maxR = Math.sqrt(canvasW * canvasW + canvasH * canvasH) / 2;
    const radius = maxR * progress;

    const grad = ctx.createRadialGradient(
      canvasW / 2, canvasH / 2, 0,
      canvasW / 2, canvasH / 2, radius
    );
    grad.addColorStop(0, `rgba(255,200,100,${0.4 * (1 - progress)})`);
    grad.addColorStop(1, 'rgba(255,200,100,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const progress = p.life / p.maxLife;
      const alpha = progress < 0.1 ? progress / 0.1 : 1 - (progress - 0.1) / 0.9;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawClouds(ctx: CanvasRenderingContext2D): void {
    for (const cloud of this.clouds) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      for (const blob of cloud.blobs) {
        const grad = ctx.createRadialGradient(
          cloud.x + blob.ox, cloud.y + blob.oy, 0,
          cloud.x + blob.ox, cloud.y + blob.oy, blob.r
        );
        grad.addColorStop(0, 'rgba(220,210,230,0.6)');
        grad.addColorStop(1, 'rgba(220,210,230,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cloud.x + blob.ox, cloud.y + blob.oy, blob.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawHoverGlows(ctx: CanvasRenderingContext2D, now: number): void {
    for (const g of this.hoverGlows) {
      const elapsed = now - g.startTime;
      const progress = elapsed / 800;
      if (progress > 1) continue;
      const radius = 30;
      const alpha = 0.4 * (1 - progress);
      const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, radius);
      grad.addColorStop(0, `rgba(255,160,60,${alpha})`);
      grad.addColorStop(1, 'rgba(255,160,60,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(g.x, g.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawEdgeGlow(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number): void {
    if (!this.glowEdgeActive || this.glowEdgeRadius <= 0) return;
    const r = this.glowEdgeRadius;
    ctx.save();
    const grad = ctx.createRadialGradient(
      canvasW / 2, canvasH / 2, Math.max(0, r - 20),
      canvasW / 2, canvasH / 2, r
    );
    grad.addColorStop(0, 'rgba(255,220,150,0)');
    grad.addColorStop(0.5, 'rgba(255,220,150,0.15)');
    grad.addColorStop(1, 'rgba(255,220,150,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.restore();
  }

  toggleListen(now: number): void {
    if (!this.completed) return;
    if (this.listening) {
      this.listening = false;
      this.glowEdgeActive = false;
      this.stopAudio();
    } else {
      this.listening = true;
      this.listenStartTime = now;
      this.glowEdgeActive = true;
      this.playAudio();
    }
  }

  private playAudio(): void {
    try {
      this.audioCtx = new AudioContext();
      const ctx = this.audioCtx;
      const duration = 5;

      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const t = i / ctx.sampleRate;
        const envelope = Math.sin(Math.PI * t / duration);
        const noise = (Math.random() * 2 - 1);
        const lowPass = Math.sin(2 * Math.PI * 80 * t) * 0.3 + Math.sin(2 * Math.PI * 120 * t) * 0.2;
        data[i] = (noise * 0.15 + lowPass * 0.4) * envelope * 0.3;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const gain = ctx.createGain();
      gain.gain.value = 0.4;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
      this.oceanNode = source;

      this.playBirdChirp(ctx, gain, 1500);
      this.birdTimeouts.push(window.setTimeout(() => {
        this.playBirdChirp(ctx, gain, 3000);
      }, 1500));
    } catch (e) {
      // Audio not supported
    }
  }

  private playBirdChirp(ctx: AudioContext, destination: AudioNode, delay: number): void {
    const chirpDuration = 0.6;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * chirpDuration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / ctx.sampleRate;
      const freq = 2000 + 1500 * Math.sin(t * 30);
      const envelope = Math.sin(Math.PI * t / chirpDuration);
      data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.15;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(destination);
    source.start(ctx.currentTime + delay / 1000);
  }

  private stopAudio(): void {
    if (this.oceanNode) {
      try { this.oceanNode.stop(); } catch (e) { /* ignore */ }
      this.oceanNode = null;
    }
    for (const t of this.birdTimeouts) {
      clearTimeout(t);
    }
    this.birdTimeouts = [];
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }

  isMouseOnSea(mx: number, my: number): boolean {
    if (!this.completed) return false;
    return mx >= this.seaRegion.x && mx <= this.seaRegion.x + this.seaRegion.w &&
           my >= this.seaRegion.y && my <= this.seaRegion.y + this.seaRegion.h;
  }

  isMouseOnSky(mx: number, my: number): boolean {
    if (!this.completed) return false;
    return mx >= this.skyRegion.x && mx <= this.skyRegion.x + this.skyRegion.w &&
           my >= this.skyRegion.y && my <= this.skyRegion.y + this.skyRegion.h;
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
