export type ElementType = 'fire' | 'water' | 'thunder' | 'earth' | 'wind' | 'ice' | 'shadow' | 'light';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  type: string;
  rotation?: number;
  rotationSpeed?: number;
}

export interface LightningBranch {
  points: { x: number; y: number }[];
  life: number;
  maxLife: number;
}

export interface FlowParticle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  alpha: number;
}

export class EffectManager {
  private particles: Particle[] = [];
  private lightnings: LightningBranch[] = [];
  private flowParticles: FlowParticle[] = [];
  private centerX: number;
  private centerY: number;
  private circleRadius: number;
  private canvasWidth: number;
  private canvasHeight: number;

  private readonly elementColors: Record<ElementType, { primary: string; secondary: string; glow: string }> = {
    fire: { primary: '#FF4500', secondary: '#FFA500', glow: '#FF6347' },
    water: { primary: '#1E90FF', secondary: '#00BFFF', glow: '#87CEEB' },
    thunder: { primary: '#9400D3', secondary: '#BA55D3', glow: '#DA70D6' },
    earth: { primary: '#8B4513', secondary: '#D2691E', glow: '#CD853F' },
    wind: { primary: '#32CD32', secondary: '#90EE90', glow: '#98FB98' },
    ice: { primary: '#E0FFFF', secondary: '#B0E0E6', glow: '#ADD8E6' },
    shadow: { primary: '#2F2F2F', secondary: '#4A4A4A', glow: '#696969' },
    light: { primary: '#FFD700', secondary: '#FFFACD', glow: '#FFFFE0' }
  };

  constructor(centerX: number, centerY: number, circleRadius: number, canvasWidth: number, canvasHeight: number) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.circleRadius = circleRadius;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.initFlowParticles();
  }

  public resize(centerX: number, centerY: number, circleRadius: number, canvasWidth: number, canvasHeight: number): void {
    this.centerX = centerX;
    this.centerY = centerY;
    this.circleRadius = circleRadius;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  private initFlowParticles(): void {
    this.flowParticles = [];
    const count = 24;
    for (let i = 0; i < count; i++) {
      this.flowParticles.push({
        angle: (Math.PI * 2 * i) / count + Math.random() * 0.3,
        radius: this.circleRadius + 5 + Math.random() * 8,
        speed: 0.008 + Math.random() * 0.006,
        size: 1.5 + Math.random() * 2,
        alpha: 0.4 + Math.random() * 0.4
      });
    }
  }

  public triggerElementEffect(element: ElementType, x: number, y: number): void {
    switch (element) {
      case 'fire':
        this.createFireEffect(x, y);
        break;
      case 'water':
        this.createWaterEffect(x, y);
        break;
      case 'thunder':
        this.createThunderEffect(x, y);
        break;
      case 'earth':
        this.createEarthEffect(x, y);
        break;
      case 'wind':
        this.createWindEffect(x, y);
        break;
      case 'ice':
        this.createIceEffect(x, y);
        break;
      case 'shadow':
        this.createShadowEffect(x, y);
        break;
      case 'light':
        this.createLightEffect(x, y);
        break;
    }
  }

  private createFireEffect(x: number, y: number): void {
    const colors = this.elementColors.fire;
    for (let i = 0; i < 60; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 3,
        life: 0,
        maxLife: 60 + Math.random() * 40,
        size: 3 + Math.random() * 5,
        color: Math.random() > 0.5 ? colors.primary : colors.secondary,
        alpha: 1,
        type: 'fire'
      });
    }
  }

  private createWaterEffect(x: number, y: number): void {
    const colors = this.elementColors.water;
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 80 + Math.random() * 40,
        size: 2 + Math.random() * 4,
        color: Math.random() > 0.5 ? colors.primary : colors.secondary,
        alpha: 1,
        type: 'water'
      });
    }
  }

  private createThunderEffect(x: number, y: number): void {
    const colors = this.elementColors.thunder;
    for (let i = 0; i < 6; i++) {
      this.createLightningBranch(x, y, 80 + Math.random() * 120);
    }
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 6;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 30 + Math.random() * 20,
        size: 2 + Math.random() * 3,
        color: Math.random() > 0.5 ? colors.primary : colors.secondary,
        alpha: 1,
        type: 'spark'
      });
    }
  }

  private createLightningBranch(startX: number, startY: number, length: number): void {
    const points: { x: number; y: number }[] = [{ x: startX, y: startY }];
    let currentX = startX;
    let currentY = startY;
    const angle = Math.random() * Math.PI * 2;
    const segments = 8 + Math.floor(Math.random() * 6);

    for (let i = 0; i < segments; i++) {
      const segLen = length / segments + (Math.random() - 0.5) * 10;
      const currentAngle = angle + (Math.random() - 0.5) * 0.6;
      currentX += Math.cos(currentAngle) * segLen;
      currentY += Math.sin(currentAngle) * segLen;
      points.push({ x: currentX, y: currentY });
    }

    this.lightnings.push({
      points,
      life: 0,
      maxLife: 25 + Math.random() * 15
    });
  }

  private createEarthEffect(x: number, y: number): void {
    const colors = this.elementColors.earth;
    for (let i = 0; i < 45; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 70 + Math.random() * 50,
        size: 4 + Math.random() * 6,
        color: Math.random() > 0.5 ? colors.primary : colors.secondary,
        alpha: 1,
        type: 'rock',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2
      });
    }
  }

  private createWindEffect(x: number, y: number): void {
    const colors = this.elementColors.wind;
    for (let i = 0; i < 55; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 2,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 50 + Math.random() * 40,
        size: 1.5 + Math.random() * 3,
        color: Math.random() > 0.5 ? colors.primary : colors.secondary,
        alpha: 0.9,
        type: 'wind'
      });
    }
  }

  private createIceEffect(x: number, y: number): void {
    const colors = this.elementColors.ice;
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 90 + Math.random() * 50,
        size: 2 + Math.random() * 4,
        color: Math.random() > 0.5 ? colors.primary : colors.secondary,
        alpha: 1,
        type: 'ice',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15
      });
    }
  }

  private createShadowEffect(x: number, y: number): void {
    const colors = this.elementColors.shadow;
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 100 + Math.random() * 60,
        size: 3 + Math.random() * 5,
        color: Math.random() > 0.5 ? colors.primary : colors.secondary,
        alpha: 0.85,
        type: 'shadow'
      });
    }
  }

  private createLightEffect(x: number, y: number): void {
    const colors = this.elementColors.light;
    for (let i = 0; i < 65; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 60 + Math.random() * 50,
        size: 2 + Math.random() * 4,
        color: Math.random() > 0.5 ? colors.primary : colors.secondary,
        alpha: 1,
        type: 'light'
      });
    }
  }

  public triggerVictoryEffect(): void {
    const allColors = Object.values(this.elementColors);
    for (let i = 0; i < 300; i++) {
      const colorSet = allColors[Math.floor(Math.random() * allColors.length)];
      this.particles.push({
        x: this.centerX + (Math.random() - 0.5) * this.circleRadius * 0.5,
        y: this.centerY + (Math.random() - 0.5) * this.circleRadius * 0.5,
        vx: (Math.random() - 0.5) * 10,
        vy: -2 - Math.random() * 6,
        life: 0,
        maxLife: 120 + Math.random() * 60,
        size: 3 + Math.random() * 5,
        color: Math.random() > 0.5 ? colorSet.primary : colorSet.secondary,
        alpha: 1,
        type: 'victory'
      });
    }
  }

  public createRuneGlow(x: number, y: number, color: string): void {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 20 + Math.random() * 15,
        size: 2 + Math.random() * 3,
        color,
        alpha: 0.8,
        type: 'glow'
      });
    }
  }

  public update(deltaTime: number): void {
    const dt = deltaTime / 16.67;

    for (const fp of this.flowParticles) {
      fp.angle += fp.speed * dt;
      if (fp.angle > Math.PI * 2) {
        fp.angle -= Math.PI * 2;
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      switch (p.type) {
        case 'fire':
          p.vy -= 0.08 * dt;
          p.vx *= 0.99;
          p.size *= 0.995;
          break;
        case 'water':
          p.vy += 0.05 * dt;
          p.vx *= 0.995;
          break;
        case 'rock':
          p.vy += 0.12 * dt;
          p.vx *= 0.99;
          if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
            p.rotation += p.rotationSpeed * dt;
          }
          break;
        case 'wind':
          p.vx += (Math.random() - 0.5) * 0.1 * dt;
          p.vy += (Math.random() - 0.5) * 0.05 * dt;
          p.vx *= 0.995;
          p.vy *= 0.995;
          break;
        case 'ice':
          p.vy += 0.03 * dt;
          if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
            p.rotation += p.rotationSpeed * dt;
          }
          break;
        case 'shadow':
          p.vx *= 0.98;
          p.vy *= 0.98;
          const dx = this.centerX - p.x;
          const dy = this.centerY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            p.vx += (dx / dist) * 0.02 * dt;
            p.vy += (dy / dist) * 0.02 * dt;
          }
          break;
        case 'light':
          p.vx *= 0.995;
          p.vy *= 0.995;
          break;
        case 'victory':
          p.vy += 0.05 * dt;
          break;
        case 'glow':
          p.vx *= 0.95;
          p.vy *= 0.95;
          break;
        case 'spark':
          p.vx *= 0.97;
          p.vy *= 0.97;
          break;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const lifeRatio = p.life / p.maxLife;
      p.alpha = Math.max(0, 1 - lifeRatio * lifeRatio);
    }

    for (let i = this.lightnings.length - 1; i >= 0; i--) {
      this.lightnings[i].life += dt;
      if (this.lightnings[i].life >= this.lightnings[i].maxLife) {
        this.lightnings.splice(i, 1);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.renderFlowParticles(ctx);
    this.renderLightnings(ctx);
    this.renderParticles(ctx);
  }

  private renderFlowParticles(ctx: CanvasRenderingContext2D): void {
    for (const fp of this.flowParticles) {
      const x = this.centerX + Math.cos(fp.angle) * fp.radius;
      const y = this.centerY + Math.sin(fp.angle) * fp.radius;
      ctx.beginPath();
      ctx.arc(x, y, fp.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 215, 0, ${fp.alpha})`;
      ctx.fill();
    }
  }

  private renderLightnings(ctx: CanvasRenderingContext2D): void {
    for (const lt of this.lightnings) {
      const alpha = 1 - lt.life / lt.maxLife;
      ctx.save();
      ctx.strokeStyle = `rgba(186, 85, 211, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#DA70D6';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(lt.points[0].x, lt.points[0].y);
      for (let i = 1; i < lt.points.length; i++) {
        ctx.lineTo(lt.points[i].x, lt.points[i].y);
      }
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;

      if (p.rotation !== undefined) {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.translate(-p.x, -p.y);
      }

      switch (p.type) {
        case 'fire':
        case 'light':
        case 'glow':
        case 'spark':
        case 'victory':
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          gradient.addColorStop(0, p.color);
          gradient.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'water':
        case 'shadow':
        case 'wind':
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'rock':
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(p.x - p.size, p.y);
          ctx.lineTo(p.x, p.y - p.size * 0.8);
          ctx.lineTo(p.x + p.size * 0.8, p.y + p.size * 0.3);
          ctx.lineTo(p.x + p.size * 0.3, p.y + p.size);
          ctx.lineTo(p.x - p.size * 0.6, p.y + p.size * 0.7);
          ctx.closePath();
          ctx.fill();
          break;
        case 'ice':
          ctx.fillStyle = p.color;
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI * 2 * i) / 6;
            const px = p.x + Math.cos(a) * p.size;
            const py = p.y + Math.sin(a) * p.size;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        default:
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
      }

      ctx.restore();
    }
  }

  public getElementColors(element: ElementType): { primary: string; secondary: string; glow: string } {
    return this.elementColors[element];
  }
}
