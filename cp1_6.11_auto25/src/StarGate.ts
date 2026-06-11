import { PlayerShip } from './PlayerShip';

interface FireworkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface GateParticle {
  angle: number;
  radius: number;
  speed: number;
  phase: number;
}

export class StarGate {
  public x: number;
  public y: number;
  public readonly PASS_RADIUS: number = 30;
  public readonly RADIUS: number = 45;

  private rotationAngle: number = 0;
  private glowPhase: number = 0;
  private gateParticles: GateParticle[];

  public isClearing: boolean = false;
  private clearProgress: number = 0;
  private readonly CLEAR_DURATION: number = 1.6;

  private fireworkParticles: FireworkParticle[] = [];
  private fireworkSpawnTimer: number = 0;

  public flashAlpha: number = 0;
  public showClearText: boolean = false;
  public clearTextAlpha: number = 0;

  private onPassedCallback: (() => void) | null = null;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.gateParticles = this.createGateParticles();
  }

  private createGateParticles(): GateParticle[] {
    const particles: GateParticle[] = [];
    for (let i = 0; i < 20; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        radius: this.RADIUS * (0.6 + Math.random() * 0.35),
        speed: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return particles;
  }

  public setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  public setOnPassedCallback(cb: () => void): void {
    this.onPassedCallback = cb;
  }

  public checkPassed(ship: PlayerShip): boolean {
    if (this.isClearing) return false;
    const dx: number = ship.x - this.x;
    const dy: number = ship.y - this.y;
    const dist: number = Math.sqrt(dx * dx + dy * dy);
    if (dist <= this.PASS_RADIUS) {
      this.startClearAnimation();
      return true;
    }
    return false;
  }

  private startClearAnimation(): void {
    this.isClearing = true;
    this.clearProgress = 0;
    this.flashAlpha = 1;
    this.fireworkParticles = [];
    this.fireworkSpawnTimer = 0;
  }

  public resetState(): void {
    this.isClearing = false;
    this.clearProgress = 0;
    this.flashAlpha = 0;
    this.showClearText = false;
    this.clearTextAlpha = 0;
    this.fireworkParticles = [];
  }

  public update(deltaTime: number): void {
    const currentRotSpeed: number = this.isClearing
      ? (Math.PI * 2) * (1 + this.clearProgress * 3)
      : Math.PI * 0.8;
    this.rotationAngle += currentRotSpeed * deltaTime;
    this.glowPhase += deltaTime * 2.5;

    for (const p of this.gateParticles) {
      p.angle += p.speed * deltaTime * (this.isClearing ? 2.5 : 1);
      p.phase += deltaTime * 4;
    }

    if (this.isClearing) {
      this.clearProgress += deltaTime / this.CLEAR_DURATION;

      this.flashAlpha = Math.max(0, this.flashAlpha - deltaTime * 3.3);

      if (this.clearProgress > 0.15) {
        this.showClearText = true;
        const textT: number = (this.clearProgress - 0.15) / 0.7;
        if (textT < 0.2) {
          this.clearTextAlpha = textT / 0.2;
        } else if (textT > 0.8) {
          this.clearTextAlpha = Math.max(0, 1 - (textT - 0.8) / 0.2);
        } else {
          this.clearTextAlpha = 1;
        }
      }

      this.fireworkSpawnTimer -= deltaTime;
      if (this.fireworkSpawnTimer <= 0 && this.clearProgress < 0.85) {
        this.spawnFirework();
        this.fireworkSpawnTimer = 0.08 + Math.random() * 0.1;
      }

      this.updateFireworks(deltaTime);

      if (this.clearProgress >= 1) {
        this.isClearing = false;
        this.showClearText = false;
        this.clearTextAlpha = 0;
        if (this.onPassedCallback) {
          this.onPassedCallback();
        }
      }
    }
  }

  private spawnFirework(): void {
    const cx: number = this.x + (Math.random() - 0.5) * 160;
    const cy: number = this.y + (Math.random() - 0.5) * 160;
    const colors: string[] = ['#ffdd44', '#ff8844', '#ff44aa', '#88ff44', '#44ddff', '#ffffff'];
    const color: string = colors[Math.floor(Math.random() * colors.length)];
    const count: number = 12 + Math.floor(Math.random() * 8);

    for (let i = 0; i < count; i++) {
      const angle: number = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed: number = 80 + Math.random() * 140;
      this.fireworkParticles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.7 + Math.random() * 0.5,
        color,
        size: 2 + Math.random() * 2,
      });
    }
  }

  private updateFireworks(deltaTime: number): void {
    for (let i: number = this.fireworkParticles.length - 1; i >= 0; i--) {
      const p: FireworkParticle = this.fireworkParticles[i];
      p.life += deltaTime;
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vx *= 0.96;
      p.vy *= 0.96;
      if (p.life >= p.maxLife) {
        this.fireworkParticles.splice(i, 1);
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    this.drawOuterGlow(ctx);
    this.drawRotatingRings(ctx);
    this.drawGateParticles(ctx);
    this.drawCore(ctx);
    this.drawFireworks(ctx);
    this.drawClearText(ctx);
  }

  private drawOuterGlow(ctx: CanvasRenderingContext2D): void {
    const pulse: number = 1 + 0.12 * Math.sin(this.glowPhase);
    const glowRadius: number = this.RADIUS * 2.2 * pulse;
    const scale: number = this.isClearing ? 1 + this.clearProgress * 1.2 : 1;

    const gradient: CanvasGradient = ctx.createRadialGradient(
      this.x, this.y, this.RADIUS * 0.3 * scale,
      this.x, this.y, glowRadius * scale
    );
    gradient.addColorStop(0, 'rgba(255, 220, 100, 0.5)');
    gradient.addColorStop(0.4, 'rgba(255, 180, 50, 0.25)');
    gradient.addColorStop(0.7, 'rgba(255, 140, 20, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, glowRadius * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawRotatingRings(ctx: CanvasRenderingContext2D): void {
    const scale: number = this.isClearing ? 1 + this.clearProgress * 1.5 : 1;
    const rings: { radius: number; width: number; alpha: number; color: string }[] = [
      { radius: this.RADIUS, width: 3, alpha: 1, color: '255, 220, 80' },
      { radius: this.RADIUS * 0.82, width: 2, alpha: 0.8, color: '255, 200, 60' },
      { radius: this.RADIUS * 1.15, width: 1.5, alpha: 0.6, color: '255, 240, 150' },
    ];

    for (let i: number = 0; i < rings.length; i++) {
      const ring = rings[i];
      const rotDir: number = i % 2 === 0 ? 1 : -1;
      const r: number = ring.radius * scale;

      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotationAngle * rotDir * (1 + i * 0.3));

      ctx.shadowColor = `rgba(${ring.color}, 0.9)`;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = `rgba(${ring.color}, ${ring.alpha})`;
      ctx.lineWidth = ring.width;

      ctx.beginPath();
      for (let seg: number = 0; seg < 6; seg++) {
        const startA: number = (seg / 6) * Math.PI * 2 + 0.1;
        const endA: number = ((seg + 1) / 6) * Math.PI * 2 - 0.1;
        ctx.moveTo(Math.cos(startA) * r, Math.sin(startA) * r);
        ctx.arc(0, 0, r, startA, endA);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawGateParticles(ctx: CanvasRenderingContext2D): void {
    const scale: number = this.isClearing ? 1 + this.clearProgress * 1.5 : 1;
    for (const p of this.gateParticles) {
      const px: number = this.x + Math.cos(p.angle) * p.radius * scale;
      const py: number = this.y + Math.sin(p.angle) * p.radius * scale;
      const brightness: number = 0.5 + 0.5 * Math.sin(p.phase);

      ctx.save();
      ctx.globalAlpha = brightness;
      ctx.shadowColor = 'rgba(255, 230, 120, 1)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = `rgba(255, 240, 180, ${brightness})`;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawCore(ctx: CanvasRenderingContext2D): void {
    const scale: number = this.isClearing ? 1 + this.clearProgress * 1.5 : 1;
    const r: number = this.RADIUS * 0.55 * scale;
    const pulse: number = 0.7 + 0.3 * Math.sin(this.glowPhase * 1.8);

    const gradient: CanvasGradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, r
    );
    gradient.addColorStop(0, `rgba(255, 255, 220, ${pulse})`);
    gradient.addColorStop(0.5, `rgba(255, 220, 100, ${pulse * 0.6})`);
    gradient.addColorStop(1, 'rgba(255, 180, 40, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = `rgba(255, 255, 200, ${0.6 * pulse})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.PASS_RADIUS, 0, Math.PI * 2);
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.restore();
  }

  private drawFireworks(ctx: CanvasRenderingContext2D): void {
    for (const p of this.fireworkParticles) {
      const t: number = p.life / p.maxLife;
      const alpha: number = 1 - t;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - t * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawClearText(ctx: CanvasRenderingContext2D): void {
    if (!this.showClearText || this.clearTextAlpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = this.clearTextAlpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const scale: number = 1 + this.clearProgress * 0.5;
    const fontSize: number = Math.floor(56 * scale);
    ctx.font = `bold ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;

    ctx.shadowColor = 'rgba(255, 220, 100, 0.9)';
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#fff2aa';
    ctx.fillText('通关！', this.x, this.y);

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 180, 40, 0.8)';
    ctx.strokeText('通关！', this.x, this.y);
    ctx.restore();
  }

  public drawFlash(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    if (this.flashAlpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, this.flashAlpha);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}
