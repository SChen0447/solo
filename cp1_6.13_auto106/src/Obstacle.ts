interface SuctionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export class Obstacle {
  x: number;
  y: number;
  radius: number;
  vertices: { x: number; y: number }[] = [];
  rotation: number = 0;
  rotationSpeed: number;
  type: 'meteor' | 'comet';
  color: string;
  shadowColor: string;

  constructor(x: number, y: number, radius: number, type: 'meteor' | 'comet' = 'meteor') {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.type = type;
    this.rotationSpeed = (Math.random() - 0.5) * 0.5;
    this.color = type === 'meteor' ? '#8b7355' : '#a8d8ea';
    this.shadowColor = type === 'meteor' ? '#5c4a32' : '#7ab8d0';
    this.generateVertices();
  }

  private generateVertices(): void {
    const numVertices = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < numVertices; i++) {
      const angle = (Math.PI * 2 * i) / numVertices;
      const r = this.radius * (0.7 + Math.random() * 0.3);
      this.vertices.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r
      });
    }
  }

  update(deltaTime: number, scrollSpeed: number): void {
    this.y += scrollSpeed * deltaTime;
    this.rotation += this.rotationSpeed * deltaTime;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    const firstV = this.vertices[0];
    ctx.moveTo(firstV.x + 3, firstV.y + 4);
    for (let i = 1; i < this.vertices.length; i++) {
      ctx.lineTo(this.vertices[i].x + 3, this.vertices[i].y + 4);
    }
    ctx.closePath();
    ctx.fill();

    const gradient = ctx.createRadialGradient(
      -this.radius * 0.3, -this.radius * 0.3, 0,
      0, 0, this.radius
    );
    gradient.addColorStop(0, this.type === 'meteor' ? '#a08060' : '#c5e8f0');
    gradient.addColorStop(0.5, this.color);
    gradient.addColorStop(1, this.shadowColor);

    ctx.fillStyle = gradient;
    ctx.strokeStyle = this.shadowColor;
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(firstV.x, firstV.y);
    for (let i = 1; i < this.vertices.length; i++) {
      ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = this.shadowColor;
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 3; i++) {
      const cx = (Math.random() - 0.5) * this.radius;
      const cy = (Math.random() - 0.5) * this.radius;
      const cr = this.radius * 0.15;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  checkCollision(mailX: number, mailY: number, mailW: number, mailH: number): boolean {
    const closestX = Math.max(this.x - this.radius, Math.min(mailX, this.x + this.radius));
    const closestY = Math.max(this.y - this.radius, Math.min(mailY, this.y + this.radius));

    const dx = mailX - closestX;
    const dy = mailY - closestY;

    return (dx * dx + dy * dy) < (this.radius * 0.8);
  }
}

export class Mailbox {
  x: number;
  y: number;
  width: number = 50;
  height: number = 60;
  isOpen: boolean = false;
  isLit: boolean = false;
  suctionStrength: number = 0;
  suctionParticles: SuctionParticle[] = [];
  starLit: boolean = false;
  starGlowIntensity: number = 0;
  delivered: boolean = false;
  deliveryAnimation: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(deltaTime: number, scrollSpeed: number, mailX: number, mailY: number, isDragging: boolean): {
    isInRange: boolean;
    suctionForce: { x: number; y: number };
  } {
    this.y += scrollSpeed * deltaTime;

    const dx = this.x - mailX;
    const dy = (this.y - 20) - mailY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const range = this.width * 1.5;
    const isInRange = dist < range && isDragging;

    if (isInRange && !this.delivered) {
      this.isOpen = true;
      this.suctionStrength = Math.min(1, this.suctionStrength + deltaTime * 3);
    } else {
      this.suctionStrength = Math.max(0, this.suctionStrength - deltaTime * 2);
      if (this.suctionStrength <= 0) {
        this.isOpen = false;
      }
    }

    if (this.starLit) {
      this.starGlowIntensity = 0.7 + Math.sin(Date.now() * 0.005) * 0.3;
    }

    this.updateSuctionParticles(deltaTime);

    const suctionForce = { x: 0, y: 0 };
    if (this.suctionStrength > 0 && isDragging && !this.delivered) {
      const force = 300 * this.suctionStrength;
      suctionForce.x = (dx / (dist || 1)) * force * deltaTime;
      suctionForce.y = (dy / (dist || 1)) * force * deltaTime;
    }

    if (this.delivered) {
      this.deliveryAnimation += deltaTime;
    }

    return { isInRange, suctionForce };
  }

  private updateSuctionParticles(deltaTime: number): void {
    if (this.suctionStrength > 0.3 && Math.random() < 0.5) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 30;
      this.suctionParticles.push({
        x: this.x + Math.cos(angle) * dist,
        y: this.y - 20 + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        life: 0.8,
        maxLife: 0.8,
        size: 2 + Math.random() * 3
      });
    }

    for (let i = this.suctionParticles.length - 1; i >= 0; i--) {
      const p = this.suctionParticles[i];
      const dx = this.x - p.x;
      const dy = (this.y - 20) - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = 200;

      p.vx = (dx / (dist || 1)) * speed;
      p.vy = (dy / (dist || 1)) * speed;
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.life -= deltaTime;

      if (p.life <= 0 || dist < 5) {
        this.suctionParticles.splice(i, 1);
      }
    }
  }

  deliver(): void {
    this.delivered = true;
    this.starLit = true;
    this.starGlowIntensity = 1;
    this.isOpen = false;
    this.suctionStrength = 0;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);

    this.renderStar(ctx);

    for (const p of this.suctionParticles) {
      const alpha = (p.life / p.maxLife) * 0.8;
      ctx.fillStyle = `rgba(100, 200, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x - this.x, p.y - this.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    const bodyW = this.width;
    const bodyH = this.height - 15;
    const bodyY = -bodyH + 10;

    const bodyGradient = ctx.createLinearGradient(-bodyW / 2, 0, bodyW / 2, 0);
    bodyGradient.addColorStop(0, '#b8860b');
    bodyGradient.addColorStop(0.3, '#ffd700');
    bodyGradient.addColorStop(0.5, '#ffec8b');
    bodyGradient.addColorStop(0.7, '#ffd700');
    bodyGradient.addColorStop(1, '#b8860b');

    ctx.fillStyle = bodyGradient;
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(-bodyW / 2, bodyY, bodyW, bodyH, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(-bodyW / 2 + 5, bodyY + 5, 8, bodyH - 10);

    if (this.isOpen) {
      const domeGradient = ctx.createRadialGradient(0, bodyY - 5, 0, 0, bodyY - 5, 25);
      domeGradient.addColorStop(0, '#ffd700');
      domeGradient.addColorStop(0.7, '#daa520');
      domeGradient.addColorStop(1, '#b8860b');
      ctx.fillStyle = domeGradient;
      ctx.beginPath();
      ctx.moveTo(-bodyW / 2 + 5, bodyY);
      ctx.quadraticCurveTo(0, bodyY - 35, bodyW / 2 - 5, bodyY);
      ctx.fill();
      ctx.stroke();

      const lightGradient = ctx.createRadialGradient(0, bodyY - 5, 0, 0, bodyY - 5, 30);
      lightGradient.addColorStop(0, 'rgba(100, 200, 255, 0.8)');
      lightGradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
      ctx.fillStyle = lightGradient;
      ctx.beginPath();
      ctx.arc(0, bodyY - 5, 30, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const domeGradient = ctx.createRadialGradient(-5, bodyY - 8, 0, 0, bodyY - 5, 25);
      domeGradient.addColorStop(0, '#ffd700');
      domeGradient.addColorStop(0.6, '#daa520');
      domeGradient.addColorStop(1, '#b8860b');
      ctx.fillStyle = domeGradient;
      ctx.beginPath();
      ctx.moveTo(-bodyW / 2 + 5, bodyY);
      ctx.quadraticCurveTo(0, bodyY - 25, bodyW / 2 - 5, bodyY);
      ctx.fill();
      ctx.stroke();
    }

    const indicatorColor = this.starLit ? '#00ff88' : '#00aa55';
    ctx.fillStyle = indicatorColor;
    ctx.shadowColor = indicatorColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, bodyY + 10, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#8b6914';
    ctx.beginPath();
    ctx.moveTo(-8, bodyY + 25);
    ctx.lineTo(0, bodyY + 18);
    ctx.lineTo(8, bodyY + 25);
    ctx.lineTo(0, bodyY + 32);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private renderStar(ctx: CanvasRenderingContext2D): void {
    const starY = -this.height - 25;
    
    if (this.starLit) {
      const glowSize = 25 * this.starGlowIntensity;
      const gradient = ctx.createRadialGradient(0, starY, 0, 0, starY, glowSize);
      gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
      gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, starY, glowSize, 0, Math.PI * 2);
      ctx.fill();
    }

    const spikes = 5;
    const outerRadius = this.starLit ? 10 : 6;
    const innerRadius = outerRadius * 0.4;

    ctx.fillStyle = this.starLit ? '#ffd700' : '#555';
    ctx.strokeStyle = this.starLit ? '#ffec8b' : '#333';
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (Math.PI * i) / spikes - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = starY + Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  checkDelivery(mailX: number, mailY: number): boolean {
    if (this.delivered) return false;
    const dx = this.x - mailX;
    const dy = (this.y - 20) - mailY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < 25;
  }
}

export class StarPoint {
  x: number;
  y: number;
  lit: boolean = false;
  glowIntensity: number = 0;
  pulsePhase: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  update(deltaTime: number): void {
    this.pulsePhase += deltaTime * 2;
    if (this.lit) {
      this.glowIntensity = 0.7 + Math.sin(this.pulsePhase) * 0.3;
    }
  }

  render(ctx: CanvasRenderingContext2D, scale: number = 1, offsetX: number = 0, offsetY: number = 0): void {
    const px = this.x * scale + offsetX;
    const py = this.y * scale + offsetY;
    const radius = 5 * scale;

    if (this.lit) {
      const glowSize = radius * 3 * this.glowIntensity;
      const gradient = ctx.createRadialGradient(px, py, 0, px, py, glowSize);
      gradient.addColorStop(0, 'rgba(255, 215, 0, 0.9)');
      gradient.addColorStop(0.4, 'rgba(255, 215, 0, 0.4)');
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(px, py, glowSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffd700';
    } else {
      ctx.fillStyle = 'transparent';
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
      ctx.lineWidth = 1.5;
    }

    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    if (this.lit) {
      ctx.fill();
    } else {
      ctx.stroke();
    }
  }

  lightUp(): void {
    this.lit = true;
    this.glowIntensity = 1;
  }
}

export class AuroraWave {
  x: number;
  y: number;
  radius: number = 0;
  maxRadius: number;
  life: number = 0;
  maxLife: number = 1.5;
  width: number = 20;
  active: boolean = true;

  constructor(x: number, y: number, maxRadius: number) {
    this.x = x;
    this.y = y;
    this.maxRadius = maxRadius;
  }

  update(deltaTime: number): void {
    this.life += deltaTime;
    this.radius = (this.life / this.maxLife) * this.maxRadius;
    if (this.life >= this.maxLife) {
      this.active = false;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    const alpha = 1 - this.life / this.maxLife;
    const gradient = ctx.createRadialGradient(
      this.x, this.y, Math.max(0, this.radius - this.width),
      this.x, this.y, this.radius
    );
    gradient.addColorStop(0, `rgba(0, 255, 136, 0)`);
    gradient.addColorStop(0.3, `rgba(0, 255, 136, ${alpha * 0.6})`);
    gradient.addColorStop(0.6, `rgba(138, 43, 226, ${alpha * 0.6})`);
    gradient.addColorStop(1, `rgba(138, 43, 226, 0)`);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
