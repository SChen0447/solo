import { CONFIG } from './config';
import type { Particle, Tentacle, JellyfishState, Vector2 } from './types';

export class Jellyfish {
  public state: JellyfishState;
  public tentacles: Tentacle[] = [];
  public trailParticles: Particle[] = [];
  public umbrellaProjection: { active: boolean; timer: number; scale: number } = { active: false, timer: 0, scale: 1 };
  
  private canvasWidth: number;
  private canvasHeight: number;
  private keys: Set<string> = new Set();

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    
    this.state = {
      x: canvasWidth / 2,
      y: canvasHeight / 2,
      vx: 0,
      vy: 0,
      energy: CONFIG.JELLYFISH.ENERGY_MAX,
      maxEnergy: CONFIG.JELLYFISH.ENERGY_MAX,
      pulsePhase: 0,
      inCurrent: false,
      currentTimer: 0,
      strugglePhase: 0,
      isSinking: false,
      sinkTimer: 0,
    };

    this.initTentacles();
  }

  private initTentacles(): void {
    const count = CONFIG.JELLYFISH.TENTACLE_COUNT;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * i) / (count - 1) + Math.PI / 2;
      this.tentacles.push({
        baseAngle: angle,
        segments: [],
        waveOffset: (i / count) * Math.PI * 2,
      });
    }
  }

  public setKeyState(key: string, pressed: boolean): void {
    if (pressed) {
      this.keys.add(key);
    } else {
      this.keys.delete(key);
    }
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public addEnergy(amount: number): void {
    this.state.energy = Math.min(this.state.maxEnergy, this.state.energy + amount);
  }

  public triggerUmbrellaProjection(): void {
    this.umbrellaProjection.active = true;
    this.umbrellaProjection.timer = CONFIG.PARTICLES.JELLY_UMBRELLA_DURATION;
    this.umbrellaProjection.scale = 1;
  }

  public update(dt: number, currentForce: Vector2 | null): void {
    if (this.state.isSinking) {
      this.updateSinking(dt);
      return;
    }

    this.updateMovement(dt, currentForce);
    this.updatePulse(dt);
    this.updateTentacles(dt);
    this.updateTrailParticles(dt);
    this.updateEnergy(dt);
    this.updateUmbrellaProjection(dt);
    this.checkBounds();
  }

  private updateMovement(dt: number, currentForce: Vector2 | null): void {
    const speed = CONFIG.JELLYFISH.MOVE_SPEED;
    let ax = 0;
    let ay = 0;

    if (!this.state.inCurrent) {
      if (this.keys.has('ArrowLeft') || this.keys.has('a') || this.keys.has('A')) ax -= 1;
      if (this.keys.has('ArrowRight') || this.keys.has('d') || this.keys.has('D')) ax += 1;
      if (this.keys.has('ArrowUp') || this.keys.has('w') || this.keys.has('W')) ay -= 1;
      if (this.keys.has('ArrowDown') || this.keys.has('s') || this.keys.has('S')) ay += 1;
    }

    if (currentForce) {
      this.state.inCurrent = true;
      this.state.currentTimer += dt;
      this.state.strugglePhase += dt * 15;

      ax += currentForce.x;
      ay += currentForce.y;

      if (this.state.currentTimer >= CONFIG.JELLYFISH.STRUGGLE_DURATION) {
        this.state.inCurrent = false;
        this.state.currentTimer = 0;
        this.state.energy -= CONFIG.JELLYFISH.CURRENT_STRUGGLE_COST;
        if (this.state.energy <= 0) {
          this.state.energy = 0;
          this.startSinking();
        }
      }
    } else {
      this.state.inCurrent = false;
      this.state.currentTimer = 0;
    }

    const mag = Math.sqrt(ax * ax + ay * ay);
    if (mag > 0) {
      ax = (ax / mag) * speed;
      ay = (ay / mag) * speed;
    }

    this.state.vx += (ax - this.state.vx) * Math.min(1, dt * 8);
    this.state.vy += (ay - this.state.vy) * Math.min(1, dt * 8);

    this.state.x += this.state.vx;
    this.state.y += this.state.vy;
  }

  private updatePulse(dt: number): void {
    this.state.pulsePhase += (dt / CONFIG.JELLYFISH.PULSE_PERIOD) * Math.PI * 2;
  }

  private updateTentacles(_dt: number): void {
    const radius = CONFIG.JELLYFISH.BODY_RADIUS;
    const length = CONFIG.JELLYFISH.TENTACLE_LENGTH;
    const segments = CONFIG.JELLYFISH.TENTACLE_SEGMENTS;
    const speed = Math.sqrt(this.state.vx * this.state.vx + this.state.vy * this.state.vy);

    for (const tentacle of this.tentacles) {
      tentacle.segments = [];
      const baseX = this.state.x + Math.cos(tentacle.baseAngle) * radius * 0.9;
      const baseY = this.state.y + Math.sin(tentacle.baseAngle) * radius * 0.9;
      
      const dragAngle = Math.atan2(-this.state.vy, -this.state.vx);
      const dragAmount = Math.min(speed * 0.3, 0.5);

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const segLength = length * t;
        
        const wave = Math.sin(this.state.pulsePhase * 0.5 + tentacle.waveOffset + t * 3) * (10 + t * 15);
        const sideWave = Math.cos(this.state.pulsePhase * 0.3 + tentacle.waveOffset * 0.7 + t * 2) * (5 + t * 8);
        
        const struggleWave = this.state.inCurrent 
          ? Math.sin(this.state.strugglePhase + tentacle.waveOffset + t * 5) * (20 + t * 20)
          : 0;

        let dx = Math.cos(tentacle.baseAngle) * segLength;
        let dy = Math.sin(tentacle.baseAngle) * segLength;

        dx += Math.cos(tentacle.baseAngle + Math.PI / 2) * (wave + struggleWave);
        dy += Math.sin(tentacle.baseAngle + Math.PI / 2) * (wave + struggleWave);

        dx += Math.cos(dragAngle) * dragAmount * segLength * 0.5;
        dy += Math.sin(dragAngle) * dragAmount * segLength * 0.5;

        dx += sideWave * 0.3;

        tentacle.segments.push({ x: baseX + dx, y: baseY + dy });
      }
    }
  }

  private updateTrailParticles(dt: number): void {
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const p = this.trailParticles[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.life -= dt;
      p.alpha = p.life / p.maxLife;
      p.size *= 0.99;

      if (p.life <= 0) {
        this.trailParticles.splice(i, 1);
      }
    }

    const speed = Math.sqrt(this.state.vx * this.state.vx + this.state.vy * this.state.vy);
    const spawnRate = CONFIG.PARTICLES.TRAIL_PARTICLES_PER_FRAME * Math.min(speed * 0.5 + 0.5, 2);
    
    if (this.trailParticles.length < CONFIG.PARTICLES.MAX_PARTICLES * 0.5) {
      for (let i = 0; i < spawnRate; i++) {
        if (this.trailParticles.length >= CONFIG.PARTICLES.MAX_PARTICLES) break;
        
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * CONFIG.JELLYFISH.BODY_RADIUS * 0.8;
        const depthRatio = this.state.y / this.canvasHeight;
        
        const r = Math.floor(150 + depthRatio * 50);
        const g = Math.floor(180 - depthRatio * 20);
        const b = Math.floor(255 - depthRatio * 30);

        this.trailParticles.push({
          x: this.state.x + Math.cos(angle) * dist,
          y: this.state.y + Math.sin(angle) * dist,
          vx: -this.state.vx * 0.3 + (Math.random() - 0.5) * 0.5,
          vy: -this.state.vy * 0.3 + (Math.random() - 0.5) * 0.5 + 0.2,
          life: CONFIG.PARTICLES.TRAIL_LIFE,
          maxLife: CONFIG.PARTICLES.TRAIL_LIFE,
          size: 3 + Math.random() * 4,
          color: `rgba(${r}, ${g}, ${b}`,
          alpha: 1,
        });
      }
    }
  }

  private updateEnergy(dt: number): void {
    if (this.state.energy < this.state.maxEnergy && !this.state.isSinking) {
      this.state.energy = Math.min(
        this.state.maxEnergy,
        this.state.energy + CONFIG.JELLYFISH.ENERGY_REGEN * dt
      );
    }
  }

  private updateUmbrellaProjection(dt: number): void {
    if (this.umbrellaProjection.active) {
      this.umbrellaProjection.timer -= dt;
      const progress = 1 - this.umbrellaProjection.timer / CONFIG.PARTICLES.JELLY_UMBRELLA_DURATION;
      this.umbrellaProjection.scale = 1 + progress * 2;
      
      if (this.umbrellaProjection.timer <= 0) {
        this.umbrellaProjection.active = false;
      }
    }
  }

  private startSinking(): void {
    this.state.isSinking = true;
    this.state.sinkTimer = CONFIG.JELLYFISH.SINK_DURATION;
    this.state.vx = 0;
    this.state.vy = 1;
  }

  private updateSinking(dt: number): void {
    this.state.sinkTimer -= dt;
    this.state.y += Math.min(2, this.state.vy) * dt * 30;
    this.state.vy += dt * 0.5;
    
    this.state.energy = Math.min(
      this.state.maxEnergy,
      this.state.energy + (this.state.maxEnergy / CONFIG.JELLYFISH.SINK_DURATION) * dt
    );

    this.updatePulse(dt);
    this.updateTentacles(dt);
    this.updateTrailParticles(dt);

    if (this.state.y > this.canvasHeight - CONFIG.JELLYFISH.BODY_RADIUS) {
      this.state.y = this.canvasHeight - CONFIG.JELLYFISH.BODY_RADIUS;
      this.state.vy = 0;
    }

    if (this.state.sinkTimer <= 0 || this.state.energy >= this.state.maxEnergy) {
      this.state.isSinking = false;
      this.state.energy = this.state.maxEnergy;
    }
  }

  private checkBounds(): void {
    const r = CONFIG.JELLYFISH.BODY_RADIUS;
    if (this.state.x < r) { this.state.x = r; this.state.vx = 0; }
    if (this.state.x > this.canvasWidth - r) { this.state.x = this.canvasWidth - r; this.state.vx = 0; }
    if (this.state.y < r) { this.state.y = r; this.state.vy = 0; }
    if (this.state.y > this.canvasHeight - r) { this.state.y = this.canvasHeight - r; this.state.vy = 0; }
  }

  public getBodyRadius(): number {
    const pulse = 1 + Math.sin(this.state.pulsePhase) * 0.08;
    return CONFIG.JELLYFISH.BODY_RADIUS * pulse;
  }

  public getColorAlpha(alpha: number): string {
    const depthRatio = this.state.y / this.canvasHeight;
    const r = Math.floor(150 + depthRatio * 50);
    const g = Math.floor(200 - depthRatio * 20);
    const b = Math.floor(255 - depthRatio * 50);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    this.drawTrailParticles(ctx);
    this.drawTentacles(ctx);
    this.drawBody(ctx);
    this.drawUmbrellaProjection(ctx);
  }

  private drawTrailParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.trailParticles) {
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      gradient.addColorStop(0, p.color + `, ${p.alpha * 0.8})`);
      gradient.addColorStop(1, p.color + `, 0)`);
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }

  private drawTentacles(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.tentacles.length; i++) {
      const tentacle = this.tentacles[i];
      if (tentacle.segments.length < 2) continue;

      ctx.beginPath();
      ctx.moveTo(tentacle.segments[0].x, tentacle.segments[0].y);
      
      for (let j = 1; j < tentacle.segments.length; j++) {
        ctx.lineTo(tentacle.segments[j].x, tentacle.segments[j].y);
      }
      
      ctx.strokeStyle = this.getColorAlpha(0.6);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.stroke();

      const tip = tentacle.segments[tentacle.segments.length - 1];
      const glowGradient = ctx.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 8);
      glowGradient.addColorStop(0, `rgba(200, 220, 255, 0.9)`);
      glowGradient.addColorStop(1, `rgba(150, 180, 255, 0)`);
      
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(220, 240, 255, 1)';
      ctx.fill();
    }
  }

  private drawBody(ctx: CanvasRenderingContext2D): void {
    const { x, y } = this.state;
    const radius = this.getBodyRadius();
    const squash = 1 + Math.sin(this.state.pulsePhase) * 0.1;
    const stretch = 1 - Math.sin(this.state.pulsePhase) * 0.05;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(squash, stretch);

    const glowGradient = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, radius * 2);
    glowGradient.addColorStop(0, this.getColorAlpha(0.3));
    glowGradient.addColorStop(1, this.getColorAlpha(0));
    
    ctx.beginPath();
    ctx.arc(0, 0, radius * 2, 0, Math.PI * 2);
    ctx.fillStyle = glowGradient;
    ctx.fill();

    const bodyGradient = ctx.createRadialGradient(0, -radius * 0.3, radius * 0.1, 0, 0, radius);
    bodyGradient.addColorStop(0, this.getColorAlpha(0.9));
    bodyGradient.addColorStop(0.7, this.getColorAlpha(0.5));
    bodyGradient.addColorStop(1, this.getColorAlpha(0.2));

    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * 0.85, 0, Math.PI, 0);
    ctx.fillStyle = bodyGradient;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-radius, 0);
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const wave = Math.sin(this.state.pulsePhase + t * Math.PI * 2) * 3;
      const bx = -radius + t * radius * 2;
      const by = wave;
      ctx.lineTo(bx, by);
    }
    ctx.strokeStyle = this.getColorAlpha(0.7);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, -radius * 0.3, radius * 0.3, radius * 0.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fill();

    ctx.restore();
  }

  private drawUmbrellaProjection(ctx: CanvasRenderingContext2D): void {
    if (!this.umbrellaProjection.active) return;

    const { x, y } = this.state;
    const radius = this.getBodyRadius() * this.umbrellaProjection.scale;
    const alpha = this.umbrellaProjection.timer / CONFIG.PARTICLES.JELLY_UMBRELLA_DURATION;

    ctx.save();
    ctx.translate(x, y);

    const gradient = ctx.createRadialGradient(0, -radius * 0.2, radius * 0.2, 0, 0, radius);
    gradient.addColorStop(0, `rgba(180, 200, 255, ${alpha * 0.6})`);
    gradient.addColorStop(0.5, `rgba(200, 220, 255, ${alpha * 0.3})`);
    gradient.addColorStop(1, `rgba(150, 180, 255, 0)`);

    ctx.beginPath();
    ctx.ellipse(0, 0, radius, radius * 0.8, 0, Math.PI, 0);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.restore();
  }

  public getBounds(): { x: number; y: number; radius: number } {
    return {
      x: this.state.x,
      y: this.state.y,
      radius: CONFIG.JELLYFISH.BODY_RADIUS,
    };
  }
}
