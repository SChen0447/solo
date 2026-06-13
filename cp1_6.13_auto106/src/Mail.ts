interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  age: number;
}

interface PaperPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  color: string;
  alpha: number;
}

export class Mail {
  x: number;
  y: number;
  width: number = 50;
  height: number = 35;
  isDragging: boolean = false;
  trail: TrailPoint[] = [];
  isShattered: boolean = false;
  paperPieces: PaperPiece[] = [];
  shatterTime: number = 0;
  glowIntensity: number = 1;
  pulsePhase: number = 0;

  private maxTrailLength: number = 15;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(deltaTime: number): void {
    this.pulsePhase += deltaTime * 3;
    this.glowIntensity = 0.8 + Math.sin(this.pulsePhase) * 0.2;

    if (this.isShattered) {
      this.shatterTime += deltaTime;
      this.updateShatter(deltaTime);
      return;
    }

    if (this.isDragging && this.trail.length > 0) {
      for (let i = this.trail.length - 1; i >= 0; i--) {
        this.trail[i].age += deltaTime;
        this.trail[i].alpha = Math.max(0, 0.5 - this.trail[i].age / 0.3);
        if (this.trail[i].alpha <= 0) {
          this.trail.splice(i, 1);
        }
      }
    }
  }

  addTrailPoint(x: number, y: number): void {
    this.trail.push({
      x,
      y,
      alpha: 0.5,
      age: 0
    });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }
  }

  shatter(): void {
    if (this.isShattered) return;
    this.isShattered = true;
    this.shatterTime = 0;
    this.paperPieces = [];
    
    const colors = ['#f5e6c8', '#e8d5a8', '#d4c096', '#c9b580'];
    const numPieces = 12;

    for (let i = 0; i < numPieces; i++) {
      const angle = (Math.PI * 2 * i) / numPieces + Math.random() * 0.5;
      const speed = 100 + Math.random() * 150;
      this.paperPieces.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 10,
        size: 5 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1
      });
    }
  }

  private updateShatter(deltaTime: number): void {
    const gravity = 200;
    for (const piece of this.paperPieces) {
      piece.vy += gravity * deltaTime;
      piece.x += piece.vx * deltaTime;
      piece.y += piece.vy * deltaTime;
      piece.rotation += piece.rotationSpeed * deltaTime;
      piece.alpha = Math.max(0, 1 - this.shatterTime / 1.5);
    }
  }

  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.isShattered = false;
    this.paperPieces = [];
    this.shatterTime = 0;
    this.trail = [];
  }

  getCollisionBox(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height
    };
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (this.isShattered) {
      this.renderShatter(ctx);
      return;
    }

    this.renderTrail(ctx);
    this.renderEnvelope(ctx);
  }

  private renderTrail(ctx: CanvasRenderingContext2D): void {
    if (this.trail.length < 2) return;

    ctx.save();
    for (let i = 1; i < this.trail.length; i++) {
      const prev = this.trail[i - 1];
      const curr = this.trail[i];
      const alpha = curr.alpha * 0.5;

      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderEnvelope(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);

    const glowSize = 20 * this.glowIntensity;
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize + 25);
    gradient.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
    gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(-glowSize - 25, -glowSize - 20, (glowSize + 25) * 2, (glowSize + 20) * 2);

    const w = this.width;
    const h = this.height;

    ctx.fillStyle = '#f5e6c8';
    ctx.strokeStyle = '#c9a96e';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(w / 2, -h / 2);
    ctx.lineTo(w / 2, h / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#d4b87a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(0, 0);
    ctx.lineTo(w / 2, -h / 2);
    ctx.stroke();

    const sealRadius = 8;
    const sealGradient = ctx.createRadialGradient(-2, -2, 0, 0, 0, sealRadius);
    sealGradient.addColorStop(0, '#ff6b6b');
    sealGradient.addColorStop(0.7, '#c0392b');
    sealGradient.addColorStop(1, '#8b0000');

    ctx.fillStyle = sealGradient;
    ctx.beginPath();
    ctx.arc(0, 0, sealRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(-2, -2, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderShatter(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const piece of this.paperPieces) {
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rotation);
      ctx.globalAlpha = piece.alpha;
      ctx.fillStyle = piece.color;
      ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.7);
      ctx.restore();
    }
    ctx.restore();
  }

  isShatterComplete(): boolean {
    return this.shatterTime > 1.5;
  }
}
