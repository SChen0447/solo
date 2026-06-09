export interface ParticleConfig {
  baseColor: string;
  entangledColor: string;
  radius: number;
  centerX: number;
  centerY: number;
}

export class QuantumParticle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  baseX: number;
  baseY: number;
  velocityX: number = 0;
  velocityY: number = 0;
  baseColor: string;
  entangledColor: string;
  currentColor: string;
  radius: number;
  isDragging: boolean = false;
  isEntangledActive: boolean = false;
  centerX: number;
  centerY: number;
  dragOffsetX: number = 0;
  dragOffsetY: number = 0;
  isBouncing: boolean = false;
  bounceStartTime: number = 0;
  bounceStartX: number = 0;
  bounceStartY: number = 0;

  constructor(config: ParticleConfig) {
    this.x = config.centerX + 60;
    this.y = config.centerY;
    this.targetX = this.x;
    this.targetY = this.y;
    this.baseX = this.x;
    this.baseY = this.y;
    this.baseColor = config.baseColor;
    this.entangledColor = config.entangledColor;
    this.currentColor = config.baseColor;
    this.radius = config.radius;
    this.centerX = config.centerX;
    this.centerY = config.centerY;
  }

  updateCenter(centerX: number, centerY: number): void {
    const dx = this.centerX - centerX;
    const dy = this.centerY - centerY;
    this.centerX = centerX;
    this.centerY = centerY;
    this.x -= dx;
    this.y -= dy;
    this.baseX -= dx;
    this.baseY -= dy;
    this.targetX -= dx;
    this.targetY -= dy;
  }

  setOrbitPosition(angle: number, distance: number): void {
    this.baseX = this.centerX + Math.cos(angle) * distance;
    this.baseY = this.centerY + Math.sin(angle) * distance;
    if (!this.isDragging && !this.isBouncing) {
      this.targetX = this.baseX;
      this.targetY = this.baseY;
    }
  }

  setPuzzlePosition(x: number, y: number): void {
    this.baseX = x;
    this.baseY = y;
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.velocityX = 0;
    this.velocityY = 0;
  }

  startDrag(mouseX: number, mouseY: number, sensitivity: number = 1.0): void {
    this.isDragging = true;
    this.dragOffsetX = (this.x - mouseX) * sensitivity;
    this.dragOffsetY = (this.y - mouseY) * sensitivity;
    this.isEntangledActive = true;
    this.currentColor = this.entangledColor;
  }

  updateDrag(mouseX: number, mouseY: number, sensitivity: number = 1.0): void {
    if (!this.isDragging) return;
    this.x = mouseX + this.dragOffsetX / sensitivity;
    this.y = mouseY + this.dragOffsetY / sensitivity;
    this.targetX = this.x;
    this.targetY = this.y;
  }

  endDrag(): void {
    this.isDragging = false;
    this.isEntangledActive = false;
    this.currentColor = this.baseColor;
    this.targetX = this.baseX;
    this.targetY = this.baseY;
  }

  updateEntangledPosition(other: QuantumParticle): void {
    if (!other.isDragging) return;
    const dx = other.centerX * 2 - other.x;
    const dy = other.centerY * 2 - other.y;
    this.x = dx;
    this.y = dy;
    this.targetX = dx;
    this.targetY = dy;
    this.isEntangledActive = true;
    this.currentColor = this.entangledColor;
  }

  resetEntangledColor(): void {
    if (!this.isDragging) {
      this.isEntangledActive = false;
      this.currentColor = this.baseColor;
    }
  }

  startBounce(): void {
    this.isBouncing = true;
    this.bounceStartTime = performance.now();
    this.bounceStartX = this.x;
    this.bounceStartY = this.y;
    this.velocityX = (this.baseX - this.x) * 0.1;
    this.velocityY = (this.baseY - this.y) * 0.1;
  }

  update(spring: number = 0.02, damping: number = 0.95): void {
    if (this.isDragging) return;

    if (this.isBouncing) {
      const elapsed = performance.now() - this.bounceStartTime;
      if (elapsed > 300) {
        this.isBouncing = false;
        this.targetX = this.baseX;
        this.targetY = this.baseY;
      } else {
        const t = elapsed / 300;
        const bounce = Math.sin(t * Math.PI * 3) * (1 - t);
        this.x = this.bounceStartX + (this.baseX - this.bounceStartX) * t + bounce * 20;
        this.y = this.bounceStartY + (this.baseY - this.bounceStartY) * t + bounce * 20;
        return;
      }
    }

    const ax = (this.targetX - this.x) * spring;
    const ay = (this.targetY - this.y) * spring;
    this.velocityX = (this.velocityX + ax) * damping;
    this.velocityY = (this.velocityY + ay) * damping;
    this.x += this.velocityX;
    this.y += this.velocityY;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.shadowColor = this.currentColor;
    ctx.shadowBlur = 8;
    ctx.fillStyle = this.currentColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.max(10, this.radius * 0.8)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = this.baseColor === '#4A90D9' ? '|0⟩' : '|1⟩';
    ctx.fillText(label, this.x, this.y);
    ctx.restore();
  }

  containsPoint(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= this.radius * this.radius * 2.5;
  }

  distanceTo(px: number, py: number): number {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

export class SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 1;
    this.decay = 0.98;
    this.size = Math.random() * 2 + 1;
  }

  update(): boolean {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.99;
    this.vy *= 0.99;
    this.life *= this.decay;
    return this.life > 0.01;
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = this.life;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 4;
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.restore();
  }
}

export function renderEntanglementLine(
  ctx: CanvasRenderingContext2D,
  p1: QuantumParticle,
  p2: QuantumParticle,
  time: number
): void {
  const flicker = Math.sin(time * Math.PI * 2 / 500) * 0.3 + 0.7;
  ctx.save();
  ctx.globalAlpha = flicker;
  ctx.strokeStyle = '#FFFFFFAA';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.lineDashOffset = time * 0.05;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  ctx.restore();
}
