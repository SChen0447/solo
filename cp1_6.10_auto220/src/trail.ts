export interface TrailPoint {
  x: number;
  y: number;
  color: string;
  width: number;
  alpha: number;
  life: number;
  maxLife: number;
  glow: boolean;
}

export class Trail {
  points: TrailPoint[] = [];
  private readonly MAX_POINTS = 3000;
  private readonly POINT_LIFETIME = 3000;
  private glowMode: boolean = false;
  private slowGenerate: boolean = false;
  private skipNext: boolean = false;

  toggleGlowMode(): void {
    this.glowMode = !this.glowMode;
  }

  getGlowMode(): boolean {
    return this.glowMode;
  }

  setSlowGenerate(value: boolean): void {
    this.slowGenerate = value;
    this.skipNext = false;
  }

  addPoint(
    x: number,
    y: number,
    direction: { dx: number; dy: number },
    speed: number,
    maxSpeed: number
  ): void {
    if (this.slowGenerate) {
      this.skipNext = !this.skipNext;
      if (this.skipNext) return;
    }

    const color = this.calculateColor(direction);
    const width = this.calculateWidth(speed, maxSpeed);

    this.points.push({
      x,
      y,
      color,
      width,
      alpha: 1,
      life: this.POINT_LIFETIME,
      maxLife: this.POINT_LIFETIME,
      glow: this.glowMode
    });

    if (this.points.length > this.MAX_POINTS) {
      this.points.splice(0, this.points.length - this.MAX_POINTS);
    }
  }

  private calculateColor(direction: { dx: number; dy: number }): string {
    const absDx = Math.abs(direction.dx);
    const absDy = Math.abs(direction.dy);
    const total = absDx + absDy || 1;
    const hRatio = absDx / total;
    const vRatio = absDy / total;

    const hColor1 = this.hexToRgb('#4fc3f7');
    const hColor2 = this.hexToRgb('#7c4dff');
    const vColor1 = this.hexToRgb('#ff6b6b');
    const vColor2 = this.hexToRgb('#feca57');

    const t = (direction.dx + 1) / 2;
    const hR = Math.round(hColor1.r + (hColor2.r - hColor1.r) * t);
    const hG = Math.round(hColor1.g + (hColor2.g - hColor1.g) * t);
    const hB = Math.round(hColor1.b + (hColor2.b - hColor1.b) * t);

    const t2 = (direction.dy + 1) / 2;
    const vR = Math.round(vColor1.r + (vColor2.r - vColor1.r) * t2);
    const vG = Math.round(vColor1.g + (vColor2.g - vColor1.g) * t2);
    const vB = Math.round(vColor1.b + (vColor2.b - vColor1.b) * t2);

    const r = Math.round(hR * hRatio + vR * vRatio);
    const g = Math.round(hG * hRatio + vG * vRatio);
    const b = Math.round(hB * hRatio + vB * vRatio);

    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        }
      : { r: 255, g: 255, b: 255 };
  }

  private calculateWidth(speed: number, maxSpeed: number): number {
    const ratio = speed / maxSpeed;
    if (ratio < 0.33) return 4;
    if (ratio < 0.66) return 8;
    return 12;
  }

  update(deltaTime: number): void {
    for (let i = this.points.length - 1; i >= 0; i--) {
      const p = this.points[i];
      p.life -= deltaTime;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.points.splice(i, 1);
      }
    }
  }

  absorbNearby(
    holeX: number,
    holeY: number,
    holeRadius: number
  ): number {
    const threshold = holeRadius + 3;
    for (let i = this.points.length - 1; i >= 0; i--) {
      const p = this.points[i];
      const dx = p.x - holeX;
      const dy = p.y - holeY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < threshold) {
        const removeCount = Math.min(20, i + 1);
        this.points.splice(i - removeCount + 1, removeCount);
        return removeCount;
      }
    }
    return 0;
  }

  getLength(): number {
    return this.points.length;
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (let i = 1; i < this.points.length; i++) {
      const prev = this.points[i - 1];
      const curr = this.points[i];

      const alpha = curr.alpha;
      const colorMatch = /rgb\((\d+), (\d+), (\d+)\)/.exec(curr.color);
      if (!colorMatch) continue;
      const r = parseInt(colorMatch[1]);
      const g = parseInt(colorMatch[2]);
      const b = parseInt(colorMatch[3]);

      if (curr.glow) {
        ctx.save();
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.shadowBlur = 6;
      }

      ctx.beginPath();
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.lineWidth = curr.width * alpha;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();

      if (curr.glow) {
        ctx.restore();
      }
    }
  }
}
