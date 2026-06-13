export interface TrailPoint {
  x: number;
  y: number;
  time: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface Trail {
  points: TrailPoint[];
  duration: number;
}

export interface EnergyStar {
  x: number;
  y: number;
  phase: number;
}

export class VisualEffects {
  private ctx: CanvasRenderingContext2D;
  private trails: Trail[] = [];
  private particles: Particle[] = [];
  private energyStars: EnergyStar[] = [];
  private cornerHaloPhase: number = 0;
  private cornerHaloActive: boolean = false;
  private cornerHaloTimer: number = 0;
  private crescentSlashProgress: number = -1;
  private crescentSlashDuration: number = 1;
  private crescentSlashTimer: number = 0;
  private stardustParticles: Particle[] = [];
  private readonly MAX_TRAILS = 50;
  private readonly MAX_PARTICLES = 500;
  private readonly TRAIL_DURATION = 3000;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  public addTrail(points: TrailPoint[]): void {
    if (this.trails.length >= this.MAX_TRAILS) {
      this.trails.shift();
    }
    this.trails.push({ points, duration: this.TRAIL_DURATION });
  }

  public spawnShatterParticles(x: number, y: number, color: string, count: number = 20): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.MAX_PARTICLES) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 200 + Math.random() * 200;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 3,
        color,
        alpha: 1,
        life: 0.8,
        maxLife: 0.8
      });
    }
  }

  public addEnergyStar(x: number, y: number): void {
    if (this.energyStars.length < 3) {
      this.energyStars.push({ x, y, phase: 0 });
    }
  }

  public getEnergyStarCount(): number {
    return this.energyStars.length;
  }

  public clearEnergyStars(): void {
    this.energyStars = [];
    this.cornerHaloActive = false;
  }

  public triggerCornerHalos(): void {
    this.cornerHaloActive = true;
    this.cornerHaloTimer = 0;
    this.cornerHaloPhase = 0;
  }

  public triggerCrescentSlash(): void {
    this.crescentSlashProgress = 0;
    this.crescentSlashTimer = 0;
    this.stardustParticles = [];
  }

  public isCrescentSlashActive(): boolean {
    return this.crescentSlashProgress >= 0 && this.crescentSlashProgress < 1;
  }

  public getCrescentSlashProgress(): number {
    return this.crescentSlashProgress;
  }

  public update(dt: number, now: number, viewportW: number, viewportH: number): void {
    this.trails = this.trails.filter(trail => {
      if (trail.points.length === 0) return false;
      const elapsed = now - trail.points[trail.points.length - 1].time;
      return elapsed < trail.duration;
    });

    this.particles = this.particles.filter(p => {
      p.life -= dt;
      if (p.life <= 0) return false;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      return true;
    });

    this.energyStars.forEach(star => {
      star.phase += dt;
    });

    if (this.cornerHaloActive) {
      this.cornerHaloTimer += dt;
      this.cornerHaloPhase += dt * Math.PI * 4;
      if (this.cornerHaloTimer >= 2) {
        this.cornerHaloActive = false;
      }
    }

    if (this.crescentSlashProgress >= 0) {
      this.crescentSlashTimer += dt;
      this.crescentSlashProgress = Math.min(1, this.crescentSlashTimer / this.crescentSlashDuration);

      if (this.stardustParticles.length < this.MAX_PARTICLES) {
        const slashX = this.crescentSlashProgress * viewportW;
        for (let i = 0; i < 5; i++) {
          this.stardustParticles.push({
            x: slashX + (Math.random() - 0.5) * 20,
            y: Math.random() * viewportH,
            vx: (Math.random() - 0.5) * 50,
            vy: (Math.random() - 0.5) * 50,
            size: 2,
            color: '#ffffff',
            alpha: 1,
            life: 2,
            maxLife: 2
          });
        }
      }

      this.stardustParticles = this.stardustParticles.filter(p => {
        p.life -= dt;
        if (p.life <= 0) return false;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha = Math.max(0, p.life / p.maxLife);
        return true;
      });

      if (this.crescentSlashProgress >= 1 && this.stardustParticles.length === 0) {
        this.crescentSlashProgress = -1;
      }
    }
  }

  public render(now: number, viewportW: number, viewportH: number, centerX: number, centerY: number): void {
    const ctx = this.ctx;

    this.trails.forEach(trail => {
      if (trail.points.length < 2) return;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 1; i < trail.points.length; i++) {
        const prev = trail.points[i - 1];
        const curr = trail.points[i];
        const elapsed = now - curr.time;
        const alpha = Math.max(0, 1 - elapsed / trail.duration);
        const gradient = ctx.createLinearGradient(prev.x, prev.y, curr.x, curr.y);
        gradient.addColorStop(0, `rgba(254, 240, 138, ${alpha})`);
        gradient.addColorStop(1, `rgba(254, 240, 138, ${alpha * 0.3})`);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.shadowColor = '#fef08a';
        ctx.shadowBlur = 8 * alpha;
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.stroke();
      }
      ctx.restore();
    });

    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    this.renderEnergyStars(centerX, centerY);
    this.renderCornerHalos(viewportW, viewportH);
    this.renderCrescentSlash(viewportW, viewportH);

    this.stardustParticles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  private renderEnergyStars(centerX: number, centerY: number): void {
    const ctx = this.ctx;
    const starSpacing = 25;
    const totalWidth = (this.energyStars.length - 1) * starSpacing;
    const startX = centerX - totalWidth / 2;
    const y = centerY;

    this.energyStars.forEach((star, i) => {
      const x = startX + i * starSpacing;
      const pulse = 0.8 + 0.2 * Math.sin(star.phase * (Math.PI * 2 / 0.6));
      ctx.save();
      const haloGradient = ctx.createRadialGradient(x, y, 0, x, y, 24);
      haloGradient.addColorStop(0, `rgba(253, 224, 71, ${0.5 * pulse})`);
      haloGradient.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = haloGradient;
      ctx.beginPath();
      ctx.arc(x, y, 24, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fde047';
      ctx.shadowColor = '#fde047';
      ctx.shadowBlur = 15 * pulse;
      ctx.beginPath();
      ctx.arc(x, y, 6 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  private renderCornerHalos(viewportW: number, viewportH: number): void {
    if (!this.cornerHaloActive) return;
    const ctx = this.ctx;
    const corners = [
      { x: 50, y: 50 },
      { x: viewportW - 50, y: 50 },
      { x: 50, y: viewportH - 50 },
      { x: viewportW - 50, y: viewportH - 50 }
    ];
    const flash = (Math.sin(this.cornerHaloPhase) + 1) / 2;
    corners.forEach(c => {
      ctx.save();
      const gradient = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 50);
      gradient.addColorStop(0, `rgba(192, 132, 252, ${0.3 * flash})`);
      gradient.addColorStop(1, 'rgba(192, 132, 252, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 50, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  private renderCrescentSlash(viewportW: number, viewportH: number): void {
    if (this.crescentSlashProgress < 0) return;
    const ctx = this.ctx;
    const t = this.crescentSlashProgress;
    const slashX = t * viewportW;
    const alpha = 0.8 - t * 0.6;
    const bladeWidth = viewportH;

    ctx.save();
    const gradient = ctx.createRadialGradient(
      slashX, viewportH / 2, 0,
      slashX, viewportH / 2, bladeWidth / 2
    );
    gradient.addColorStop(0, `rgba(192, 132, 252, ${alpha})`);
    gradient.addColorStop(0.4, `rgba(192, 132, 252, ${alpha * 0.5})`);
    gradient.addColorStop(1, 'rgba(192, 132, 252, 0)');
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(slashX, viewportH / 2, bladeWidth / 2, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
    ctx.restore();
  }

  public renderAiming(startX: number, startY: number, endX: number, endY: number, now: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.5)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    const crossBlink = (Math.sin(now * (Math.PI * 2 / 0.5)) + 1) / 2;
    ctx.globalAlpha = 0.5 + 0.5 * crossBlink;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    const s = 5;
    ctx.beginPath();
    ctx.moveTo(endX - s, endY);
    ctx.lineTo(endX + s, endY);
    ctx.moveTo(endX, endY - s);
    ctx.lineTo(endX, endY + s);
    ctx.stroke();
    ctx.restore();
  }

  public renderArrow(x: number, y: number, angle: number): void {
    const ctx = this.ctx;
    const len = 40;
    const tailX = x - Math.cos(angle) * len;
    const tailY = y - Math.sin(angle) * len;

    ctx.save();
    const gradient = ctx.createLinearGradient(tailX, tailY, x, y);
    gradient.addColorStop(0, 'rgba(252, 211, 77, 0.6)');
    gradient.addColorStop(1, '#ffffff');
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#fcd34d';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(x, y);
    ctx.stroke();

    ctx.fillStyle = '#fcd34d';
    ctx.shadowColor = '#fcd34d';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    const arrowSize = 6;
    ctx.moveTo(x, y);
    ctx.lineTo(x - Math.cos(angle - Math.PI / 4) * arrowSize, y - Math.sin(angle - Math.PI / 4) * arrowSize);
    ctx.lineTo(x - Math.cos(angle + Math.PI / 4) * arrowSize, y - Math.sin(angle + Math.PI / 4) * arrowSize);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
