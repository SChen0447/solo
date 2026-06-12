export interface Bubble {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface SubmarineState {
  x: number;
  y: number;
  angle: number;
  width: number;
  height: number;
  boundingBox: { x: number; y: number; w: number; h: number };
}

export class Submarine {
  private x: number;
  private y: number;
  private angle: number = 0;
  private targetAngle: number = 0;
  private vx: number = 0;
  private vy: number = 0;
  private readonly speed: number = 3;
  private readonly width: number = 80;
  private readonly height: number = 35;
  private readonly bubbleRate: number = 4;
  private bubbles: Bubble[] = [];
  private keys: Set<string> = new Set();
  private propellerAngle: number = 0;
  private sceneBounds: { minX: number; minY: number; maxX: number; maxY: number };
  private isMoving: boolean = false;

  constructor(
    startX: number,
    startY: number,
    sceneBounds: { minX: number; minY: number; maxX: number; maxY: number }
  ) {
    this.x = startX;
    this.y = startY;
    this.sceneBounds = sceneBounds;
    this.setupInput();
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      this.keys.add(e.key);
    });
    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keys.delete(e.key);
    });
  }

  public update(deltaTime: number, terrainHeights: number[], terrainOffsetX: number): SubmarineState {
    this.isMoving = false;
    let moveX = 0;
    let moveY = 0;

    if (this.keys.has('ArrowUp') || this.keys.has('w') || this.keys.has('W')) {
      moveY -= 1;
      this.isMoving = true;
    }
    if (this.keys.has('ArrowDown') || this.keys.has('s') || this.keys.has('S')) {
      moveY += 1;
      this.isMoving = true;
    }
    if (this.keys.has('ArrowLeft') || this.keys.has('a') || this.keys.has('A')) {
      moveX -= 1;
      this.isMoving = true;
    }
    if (this.keys.has('ArrowRight') || this.keys.has('d') || this.keys.has('D')) {
      moveX += 1;
      this.isMoving = true;
    }

    if (moveX !== 0 || moveY !== 0) {
      const len = Math.sqrt(moveX * moveX + moveY * moveY);
      this.vx = (moveX / len) * this.speed;
      this.vy = (moveY / len) * this.speed;
      this.targetAngle = Math.atan2(moveY, moveX);
    } else {
      this.vx *= 0.9;
      this.vy *= 0.9;
    }

    let angleDiff = this.targetAngle - this.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.angle += angleDiff * 0.1;

    this.x += this.vx;
    this.y += this.vy;

    const halfW = this.width / 2;
    const halfH = this.height / 2;
    this.x = Math.max(this.sceneBounds.minX + halfW, Math.min(this.sceneBounds.maxX - halfW, this.x));
    this.y = Math.max(this.sceneBounds.minY + halfH, Math.min(this.sceneBounds.maxY - halfH, this.y));

    const terrainIdx = Math.floor((this.x - terrainOffsetX) / 10);
    if (terrainIdx >= 0 && terrainIdx < terrainHeights.length) {
      const terrainY = terrainHeights[terrainIdx];
      if (this.y + halfH > terrainY) {
        this.y = terrainY - halfH;
      }
    }

    if (this.isMoving) {
      this.propellerAngle += 0.5;
    }
    this.propellerAngle += 0.1;

    this.emitBubbles();
    this.updateBubbles();

    return {
      x: this.x,
      y: this.y,
      angle: this.angle,
      width: this.width,
      height: this.height,
      boundingBox: {
        x: this.x - halfW,
        y: this.y - halfH,
        w: this.width,
        h: this.height
      }
    };
  }

  private emitBubbles(): void {
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const backAngle = this.angle + Math.PI;
      const spawnX = this.x + Math.cos(backAngle) * (this.width / 2 - 5) + (Math.random() - 0.5) * 10;
      const spawnY = this.y + Math.sin(backAngle) * (this.width / 2 - 5) + (Math.random() - 0.5) * 10;
      
      this.bubbles.push({
        x: spawnX,
        y: spawnY,
        vx: (Math.random() - 0.5) * 0.5 + Math.cos(backAngle) * 0.3,
        vy: -0.5 - Math.random() * 0.8,
        radius: 2 + Math.random() * 4,
        alpha: 0.6 + Math.random() * 0.3,
        life: 0,
        maxLife: 60 + Math.random() * 60
      });
    }
  }

  private updateBubbles(): void {
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.life++;
      b.x += b.vx;
      b.y += b.vy;
      b.vx += (Math.random() - 0.5) * 0.05;
      b.radius *= 0.995;
      b.alpha = (1 - b.life / b.maxLife) * 0.7;
      
      if (b.life >= b.maxLife || b.radius < 0.5) {
        this.bubbles.splice(i, 1);
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D, cameraX: number, cameraY: number): void {
    const screenX = this.x - cameraX;
    const screenY = this.y - cameraY;

    ctx.save();
    for (const b of this.bubbles) {
      const bx = b.x - cameraX;
      const by = b.y - cameraY;
      ctx.beginPath();
      ctx.arc(bx, by, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 220, 255, ${b.alpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(220, 240, 255, ${b.alpha * 0.5})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(this.angle);

    ctx.shadowColor = 'rgba(100, 180, 255, 0.6)';
    ctx.shadowBlur = 15;

    const bodyGradient = ctx.createLinearGradient(-this.width / 2, 0, this.width / 2, 0);
    bodyGradient.addColorStop(0, '#1a3a5c');
    bodyGradient.addColorStop(0.3, '#2d5a87');
    bodyGradient.addColorStop(0.5, '#3d7ab0');
    bodyGradient.addColorStop(0.7, '#2d5a87');
    bodyGradient.addColorStop(1, '#1a3a5c');

    ctx.beginPath();
    ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = bodyGradient;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(150, 210, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(15, 0, 18, 12, 0, 0, Math.PI * 2);
    const glassGradient = ctx.createRadialGradient(15, -3, 2, 15, 0, 18);
    glassGradient.addColorStop(0, 'rgba(200, 240, 255, 0.9)');
    glassGradient.addColorStop(0.5, 'rgba(120, 200, 255, 0.6)');
    glassGradient.addColorStop(1, 'rgba(60, 140, 220, 0.4)');
    ctx.fillStyle = glassGradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(180, 230, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#1a3a5c';
    ctx.fillRect(-this.width / 2 + 5, -5, 8, 10);

    ctx.save();
    ctx.translate(-this.width / 2 - 2, 0);
    ctx.rotate(this.propellerAngle);
    ctx.fillStyle = '#4a6a8a';
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 2);
      ctx.fillRect(-2, -12, 4, 12);
      ctx.restore();
    }
    ctx.restore();

    ctx.beginPath();
    ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(150, 210, 255, 0.3)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.restore();
  }

  public getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  public getBoundingBox(): { x: number; y: number; w: number; h: number } {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      w: this.width,
      h: this.height
    };
  }

  public isSubMoving(): boolean {
    return this.isMoving;
  }
}
