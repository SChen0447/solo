export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export class Crystal {
  public x: number;
  public y: number;
  public collected: boolean = false;
  public pulsePhase: number = 0;
  public ringRotation: number = 0;
  public size: number = 18;
  public particles: Particle[] = [];
  public collecting: boolean = false;
  public collectProgress: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  public update(dt: number): void {
    this.pulsePhase += dt * 2;
    this.ringRotation += dt * Math.PI * 2;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      if (this.collecting) {
        const dx = this.x - p.x;
        const dy = this.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
          const speed = 300 * dt * (1 - p.life / p.maxLife + 0.3);
          p.x += (dx / dist) * speed;
          p.y += (dy / dist) * speed;
        }
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 50 * dt;
      }
      
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    if (this.collecting) {
      this.collectProgress += dt * 2;
      if (this.collectProgress >= 1) {
        this.collected = true;
      }
    }
  }

  public startCollect(): void {
    if (this.collected || this.collecting) return;
    this.collecting = true;
    
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;
      const hue = 140 + Math.random() * 80;
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 + Math.random() * 0.4,
        maxLife: 1.2,
        size: 2 + Math.random() * 3,
        color: `hsl(${hue}, 100%, 70%)`
      });
    }
  }

  public draw(ctx: CanvasRenderingContext2D, cameraY: number): void {
    const screenY = this.y - cameraY;

    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y - cameraY, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    if (this.collected) return;

    const scale = this.collecting ? Math.max(0, 1 - this.collectProgress) : 1;
    const pulse = 1 + Math.sin(this.pulsePhase) * 0.08;
    const actualSize = this.size * pulse * scale;

    ctx.save();
    ctx.translate(this.x, screenY);

    this.drawEnergyRing(ctx, actualSize * 1.8);

    const crystalGradient = ctx.createLinearGradient(0, -actualSize, 0, actualSize);
    crystalGradient.addColorStop(0, '#00ffcc');
    crystalGradient.addColorStop(0.5, '#00aaff');
    crystalGradient.addColorStop(1, '#0066ff');

    ctx.fillStyle = crystalGradient;
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur = 20;

    this.drawHexPrism(ctx, actualSize);

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.moveTo(-actualSize * 0.3, -actualSize * 0.7);
    ctx.lineTo(0, -actualSize * 0.9);
    ctx.lineTo(actualSize * 0.1, -actualSize * 0.3);
    ctx.lineTo(-actualSize * 0.2, -actualSize * 0.2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawHexPrism(ctx: CanvasRenderingContext2D, size: number): void {
    const topY = -size * 0.8;
    const bottomY = size * 0.8;
    const radius = size * 0.6;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = topY + Math.sin(angle) * radius * 0.3;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    const frontGradient = ctx.createLinearGradient(-radius, 0, radius, 0);
    frontGradient.addColorStop(0, 'rgba(0, 255, 204, 0.6)');
    frontGradient.addColorStop(0.5, 'rgba(0, 170, 255, 0.9)');
    frontGradient.addColorStop(1, 'rgba(0, 102, 255, 0.6)');
    ctx.fillStyle = frontGradient;

    ctx.beginPath();
    ctx.moveTo(-radius, topY - radius * 0.15);
    ctx.lineTo(radius, topY + radius * 0.05);
    ctx.lineTo(radius, bottomY + radius * 0.05);
    ctx.lineTo(-radius, bottomY - radius * 0.15);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(0, 80, 150, 0.5)';
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = bottomY + Math.sin(angle) * radius * 0.3;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  private drawEnergyRing(ctx: CanvasRenderingContext2D, radius: number): void {
    ctx.save();
    ctx.rotate(this.ringRotation);

    ctx.strokeStyle = 'rgba(255, 50, 50, 0.4)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255, 50, 50, 0.8)';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    const segments = 6;
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const innerR = radius * 0.7;
      const outerR = radius * 1.1;
      
      ctx.strokeStyle = 'rgba(255, 80, 80, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
      ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
      ctx.stroke();
    }

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + this.ringRotation * 0.5;
      const r = radius * 0.9;
      
      ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * r, Math.sin(angle) * r, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  public getRadius(): number {
    return this.size * 1.5;
  }

  public getCollectRadius(): number {
    return this.size * 2;
  }
}

export function generateCrystals(count: number, terrainWidth: number, terrainHeight: number): Crystal[] {
  const crystals: Crystal[] = [];
  const margin = 60;
  const minDistance = 120;

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let x = 0, y = 0;
    let valid = false;

    while (!valid && attempts < 100) {
      x = margin + Math.random() * (terrainWidth - margin * 2);
      y = terrainHeight * 0.1 + Math.random() * (terrainHeight * 0.75);
      
      valid = true;
      for (const crystal of crystals) {
        const dx = x - crystal.x;
        const dy = y - crystal.y;
        if (Math.sqrt(dx * dx + dy * dy) < minDistance) {
          valid = false;
          break;
        }
      }
      attempts++;
    }

    if (valid) {
      crystals.push(new Crystal(x, y));
    }
  }

  return crystals;
}
