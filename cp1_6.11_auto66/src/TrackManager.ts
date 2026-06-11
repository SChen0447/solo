import { Particle } from './Bird';

export interface NoteFragment {
  trackIndex: number;
  angle: number;
  size: number;
  rotation: number;
  pitch: number;
  color: string;
  collected: boolean;
  spawnTime: number;
}

export interface Obstacle {
  trackIndex: number;
  startAngle: number;
  span: number;
  size: number;
  flashScale: number;
  flashTarget: number;
  flashTime: number;
}

export interface StarParticle {
  x: number;
  y: number;
  size: number;
  twinklePeriod: number;
  twinklePhase: number;
  baseAlpha: number;
  driftSpeed: { x: number; y: number };
}

export class TrackManager {
  public baseRadii: number[] = [150, 250, 350];
  public currentRadii: number[];
  public noteFragments: NoteFragment[] = [];
  public obstacles: Obstacle[] = [];
  public explosionParticles: Particle[] = [];
  public starParticles: StarParticle[] = [];
  private centerX: number;
  private centerY: number;
  private canvasWidth: number;
  private canvasHeight: number;
  private fragmentAngularVelocity: number = 0.8;
  private lastFragmentSpawn: number = 0;
  private fragmentSpawnInterval: number = 450;
  private lastObstacleSpawn: number = 0;
  private obstacleSpawnInterval: number = 2500;
  public trackColorPhase: number = 0;
  private totalParticles: number = 0;
  private maxTotalParticles: number = 180;

  constructor(centerX: number, centerY: number, canvasWidth: number, canvasHeight: number) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.currentRadii = [...this.baseRadii];
    this.initStarParticles();
  }

  private initStarParticles(): void {
    const starCount = 80;
    for (let i = 0; i < starCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 80 + Math.random() * 360;
      this.starParticles.push({
        x: this.centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 200,
        y: this.centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 200,
        size: 1 + Math.random() * 2,
        twinklePeriod: 0.2 + Math.random() * 0.6,
        twinklePhase: Math.random() * Math.PI * 2,
        baseAlpha: 0.3 + Math.random() * 0.5,
        driftSpeed: {
          x: (Math.random() - 0.5) * 0.15,
          y: (Math.random() - 0.5) * 0.15
        }
      });
    }
  }

  public reset(centerX?: number, centerY?: number): void {
    if (centerX !== undefined) this.centerX = centerX;
    if (centerY !== undefined) this.centerY = centerY;
    this.noteFragments = [];
    this.obstacles = [];
    this.explosionParticles = [];
    this.currentRadii = [...this.baseRadii];
    this.starParticles = [];
    this.initStarParticles();
    this.lastFragmentSpawn = 0;
    this.lastObstacleSpawn = 0;
  }

  public update(
    dt: number,
    overallEnergy: number,
    highEnergy: number,
    beatDetected: boolean,
    bassEnergy: number,
    currentTime: number
  ): void {
    const expansionAmount = Math.sin(currentTime * 0.004 * (0.8 + overallEnergy * 2)) * 20 + overallEnergy * 20;
    for (let i = 0; i < this.baseRadii.length; i++) {
      this.currentRadii[i] = this.baseRadii[i] + expansionAmount;
    }

    this.trackColorPhase += dt * (0.5 + overallEnergy * 1.5);

    for (const star of this.starParticles) {
      star.twinklePhase += (dt / star.twinklePeriod) * Math.PI * 2 * (1 + highEnergy * 2);
      star.x += star.driftSpeed.x;
      star.y += star.driftSpeed.y;
      if (star.x < 0 || star.x > this.canvasWidth) star.driftSpeed.x *= -1;
      if (star.y < 0 || star.y > this.canvasHeight) star.driftSpeed.y *= -1;
    }

    for (const frag of this.noteFragments) {
      frag.angle += this.fragmentAngularVelocity * dt;
      if (frag.angle > Math.PI * 2) frag.angle -= Math.PI * 2;
      frag.rotation += dt * (Math.PI * 2 / 0.3);
    }

    const targetCount = 12 + Math.floor(overallEnergy * 3);
    if (this.noteFragments.length < targetCount && currentTime - this.lastFragmentSpawn > this.fragmentSpawnInterval) {
      this.spawnFragment();
      this.lastFragmentSpawn = currentTime;
    }

    if (this.noteFragments.length > 15) {
      this.noteFragments.splice(0, this.noteFragments.length - 15);
    }

    if (beatDetected) {
      for (const obs of this.obstacles) {
        obs.flashTarget = 1.3;
        obs.flashTime = 0.1;
      }
    }

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.startAngle += this.fragmentAngularVelocity * 0.7 * dt;
      if (obs.startAngle > Math.PI * 2) obs.startAngle -= Math.PI * 2;

      if (obs.flashTime > 0) {
        obs.flashTime -= dt;
        const t = 1 - obs.flashTime / 0.1;
        obs.flashScale = 1 + (1.3 - 1) * (1 - Math.abs(2 * t - 1));
        if (obs.flashTime <= 0) {
          obs.flashScale = 1;
        }
      } else {
        obs.flashScale = 1;
      }

      const lifeTime = 12000;
      if (currentTime - (obs as any).spawnTime > lifeTime) {
        this.obstacles.splice(i, 1);
      }
    }

    const targetObstacleCount = 3 + Math.floor(overallEnergy * 2);
    if (this.obstacles.length < targetObstacleCount && currentTime - this.lastObstacleSpawn > this.obstacleSpawnInterval) {
      this.spawnObstacle(currentTime);
      this.lastObstacleSpawn = currentTime;
    }

    for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
      const p = this.explosionParticles[i];
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.vy += 0.05;
      if (p.life <= 0) {
        this.explosionParticles.splice(i, 1);
      }
    }

    this.totalParticles = this.explosionParticles.length;
    if (this.totalParticles > this.maxTotalParticles) {
      this.explosionParticles.splice(0, this.totalParticles - this.maxTotalParticles);
    }
  }

  private spawnFragment(): void {
    const trackIndex = Math.floor(Math.random() * this.baseRadii.length);
    const angle = Math.random() * Math.PI * 2;
    const pitch = Math.floor(Math.random() * 12);
    const colors = [
      '#FFD700', '#FFA500', '#FF6347',
      '#FFE4B5', '#F0E68C', '#FF8C00'
    ];

    for (const existing of this.noteFragments) {
      if (existing.trackIndex === trackIndex) {
        const diff = Math.abs(existing.angle - angle);
        const minDiff = Math.min(diff, Math.PI * 2 - diff);
        if (minDiff < 0.3) return;
      }
    }

    this.noteFragments.push({
      trackIndex,
      angle,
      size: 20,
      rotation: 0,
      pitch,
      color: colors[pitch % colors.length],
      collected: false,
      spawnTime: performance.now()
    });
  }

  private spawnObstacle(currentTime: number): void {
    const trackIndex = Math.floor(Math.random() * this.baseRadii.length);
    const startAngle = Math.random() * Math.PI * 2;
    const span = (15 * Math.PI) / 180;

    for (const existing of this.obstacles) {
      if (existing.trackIndex === trackIndex) {
        const diff = Math.abs(existing.startAngle - startAngle);
        const minDiff = Math.min(diff, Math.PI * 2 - diff);
        if (minDiff < 0.6) return;
      }
    }

    const obstacle: any = {
      trackIndex,
      startAngle,
      span,
      size: 25,
      flashScale: 1,
      flashTarget: 1,
      flashTime: 0,
      spawnTime: currentTime
    };
    this.obstacles.push(obstacle);
  }

  public collectFragment(fragment: NoteFragment): void {
    const radius = this.currentRadii[fragment.trackIndex];
    const x = this.centerX + Math.cos(fragment.angle) * radius;
    const y = this.centerY + Math.sin(fragment.angle) * radius;
    this.spawnExplosion(x, y, fragment.color);
    fragment.collected = true;
  }

  private spawnExplosion(x: number, y: number, baseColor: string): void {
    const particleCount = 30;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 3 + Math.random() * 5;
      const colorVariation = Math.random();
      let color = baseColor;
      if (colorVariation < 0.3) color = '#FFFFFF';
      else if (colorVariation < 0.6) color = this.lightenColor(baseColor, 30);

      this.explosionParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        size: 2 + Math.random() * 4,
        color,
        alpha: 1
      });
    }
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return `rgb(${R}, ${G}, ${B})`;
  }

  public getFragmentPosition(fragment: NoteFragment): { x: number; y: number } {
    const radius = this.currentRadii[fragment.trackIndex];
    return {
      x: this.centerX + Math.cos(fragment.angle) * radius,
      y: this.centerY + Math.sin(fragment.angle) * radius
    };
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.renderStars(ctx);
    this.renderTracks(ctx);
    this.renderFragments(ctx);
    this.renderObstacles(ctx);
    this.renderExplosions(ctx);
  }

  private renderStars(ctx: CanvasRenderingContext2D): void {
    for (const star of this.starParticles) {
      const twinkle = (Math.sin(star.twinklePhase) + 1) / 2;
      const alpha = star.baseAlpha * (0.4 + twinkle * 0.6);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#00FFFF';
      ctx.shadowBlur = star.size * 3 * twinkle;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderTracks(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.currentRadii.length; i++) {
      const radius = this.currentRadii[i];
      const hue = (this.trackColorPhase * 50 + i * 120) % 360;

      ctx.save();
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.3)`;
      ctx.lineWidth = 12;
      ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
      ctx.shadowBlur = 30;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hue}, 100%, 80%, 0.8)`;
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      ctx.stroke();

      ctx.restore();
    }
  }

  private renderFragments(ctx: CanvasRenderingContext2D): void {
    for (const frag of this.noteFragments) {
      if (frag.collected) continue;
      const pos = this.getFragmentPosition(frag);
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(frag.rotation);

      ctx.shadowColor = frag.color;
      ctx.shadowBlur = 20;

      ctx.fillStyle = frag.color;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;

      const s = frag.size;
      ctx.beginPath();
      ctx.moveTo(-s * 0.15, s * 0.4);
      ctx.lineTo(-s * 0.15, -s * 0.3);
      ctx.quadraticCurveTo(-s * 0.15, -s * 0.5, s * 0.1, -s * 0.5);
      ctx.quadraticCurveTo(s * 0.35, -s * 0.5, s * 0.35, -s * 0.3);
      ctx.quadraticCurveTo(s * 0.35, -s * 0.1, s * 0.15, -s * 0.05);
      ctx.lineTo(s * 0.15, s * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(s * 0.35, s * 0.35, s * 0.25, s * 0.15, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(s * 0.15, -s * 0.05);
      ctx.quadraticCurveTo(s * 0.5, -s * 0.1, s * 0.4, s * 0.25);
      ctx.stroke();

      ctx.restore();
    }
  }

  private renderObstacles(ctx: CanvasRenderingContext2D): void {
    for (const obs of this.obstacles) {
      const midAngle = obs.startAngle + obs.span / 2;
      const radius = this.currentRadii[obs.trackIndex];
      const x = this.centerX + Math.cos(midAngle) * radius;
      const y = this.centerY + Math.sin(midAngle) * radius;
      const scale = obs.flashScale;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(midAngle + Math.PI / 4);
      ctx.scale(scale, scale);

      const s = obs.size;

      ctx.shadowColor = '#FF0000';
      ctx.shadowBlur = obs.flashScale > 1 ? 30 : 10;

      const gradient = ctx.createLinearGradient(-s / 2, -s / 2, s / 2, s / 2);
      gradient.addColorStop(0, '#1a0a1a');
      gradient.addColorStop(0.5, '#2d1b2d');
      gradient.addColorStop(1, '#1a0a1a');
      ctx.fillStyle = gradient;

      ctx.beginPath();
      ctx.moveTo(0, -s / 2);
      ctx.lineTo(s / 2, 0);
      ctx.lineTo(0, s / 2);
      ctx.lineTo(-s / 2, 0);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = obs.flashScale > 1 ? '#FF4444' : '#660066';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.strokeStyle = obs.flashScale > 1 ? '#FF8888' : '#AA44AA';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, -s * 0.3);
      ctx.lineTo(s * 0.3, s * 0.3);
      ctx.moveTo(s * 0.3, -s * 0.3);
      ctx.lineTo(-s * 0.3, s * 0.3);
      ctx.stroke();

      ctx.restore();
    }
  }

  private renderExplosions(ctx: CanvasRenderingContext2D): void {
    for (const p of this.explosionParticles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  public getRadiusOffset(trackIndex: number): number {
    return this.currentRadii[trackIndex] - this.baseRadii[trackIndex];
  }

  public checkObstacleCollision(x: number, y: number, hitRadius: number): Obstacle | null {
    for (const obs of this.obstacles) {
      const midAngle = obs.startAngle + obs.span / 2;
      const radius = this.currentRadii[obs.trackIndex];
      const ox = this.centerX + Math.cos(midAngle) * radius;
      const oy = this.centerY + Math.sin(midAngle) * radius;
      const dx = x - ox;
      const dy = y - oy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const obsHitRadius = (obs.size * obs.flashScale) * 0.7;
      if (dist < hitRadius + obsHitRadius) {
        return obs;
      }
    }
    return null;
  }

  public getTotalParticleCount(): number {
    return this.totalParticles;
  }
}
