export interface StarRingParticle {
  angle: number;
  radius: number;
  size: number;
  speed: number;
  hue: number;
}

export interface IntersectionPoint {
  x: number;
  y: number;
  gridX: number;
  gridY: number;
}

export type DistortionFn = (x: number, y: number) => { dx: number; dy: number };

export class StarBoard {
  public centerX: number = 0;
  public centerY: number = 0;
  public radius: number = 0;
  public gridSize: number = 19;
  public cellSize: number = 0;

  private starRingParticles: StarRingParticle[] = [];
  private ringParticleCount: number = 200;

  private starLights: { x: number; y: number; phase: number }[] = [];

  private time: number = 0;

  private gridPoints: { x: number; y: number; valid: boolean }[][] = [];

  constructor() {
    this.initStarRing();
  }

  public resize(viewportWidth: number, viewportHeight: number): void {
    const minDiameter = 550;
    const diameter = Math.max(viewportHeight * 0.65, minDiameter);
    this.radius = diameter / 2;
    this.centerX = viewportWidth / 2;
    this.centerY = viewportHeight / 2;

    this.cellSize = (this.radius * 1.8) / (this.gridSize - 1);

    this.initStarLights();
    this.initStarRing();
    this.initGridPoints();
  }

  private initGridPoints(): void {
    this.gridPoints = [];
    for (let i = 0; i < this.gridSize; i++) {
      this.gridPoints[i] = [];
      for (let j = 0; j < this.gridSize; j++) {
        const point = this.getIntersectionPoint(i, j);
        if (point) {
          this.gridPoints[i][j] = { x: point.x, y: point.y, valid: true };
        } else {
          const offset = (this.gridSize - 1) / 2;
          const x = this.centerX + (i - offset) * this.cellSize;
          const y = this.centerY + (j - offset) * this.cellSize;
          this.gridPoints[i][j] = { x, y, valid: false };
        }
      }
    }
  }

  private initStarLights(): void {
    this.starLights = [];
    for (let i = 0; i < this.gridSize; i++) {
      for (let j = 0; j < this.gridSize; j++) {
        const point = this.getIntersectionPoint(i, j);
        if (point && this.isInsideBoard(point.x, point.y)) {
          this.starLights.push({
            x: point.x,
            y: point.y,
            phase: Math.random() * Math.PI * 2
          });
        }
      }
    }
  }

  private initStarRing(): void {
    this.starRingParticles = [];
    for (let i = 0; i < this.ringParticleCount; i++) {
      this.starRingParticles.push({
        angle: Math.random() * Math.PI * 2,
        radius: this.radius + Math.random() * 10 - 5,
        size: 1 + Math.random() * 2,
        speed: 0.5 + Math.random() * 0.3,
        hue: 180 + Math.random() * 90
      });
    }
  }

  public getIntersectionPoint(gridX: number, gridY: number): IntersectionPoint | null {
    const offset = (this.gridSize - 1) / 2;
    const x = this.centerX + (gridX - offset) * this.cellSize;
    const y = this.centerY + (gridY - offset) * this.cellSize;

    const distFromCenter = Math.sqrt(
      Math.pow(x - this.centerX, 2) + Math.pow(y - this.centerY, 2)
    );

    if (distFromCenter > this.radius * 0.95) {
      return null;
    }

    return { x, y, gridX, gridY };
  }

  public findNearestIntersection(mouseX: number, mouseY: number): IntersectionPoint | null {
    if (!this.isInsideBoard(mouseX, mouseY)) {
      return null;
    }

    const offset = (this.gridSize - 1) / 2;
    const gridX = Math.round((mouseX - this.centerX) / this.cellSize + offset);
    const gridY = Math.round((mouseY - this.centerY) / this.cellSize + offset);

    if (gridX < 0 || gridX >= this.gridSize || gridY < 0 || gridY >= this.gridSize) {
      return null;
    }

    return this.getIntersectionPoint(gridX, gridY);
  }

  public isInsideBoard(x: number, y: number): boolean {
    const dist = Math.sqrt(Math.pow(x - this.centerX, 2) + Math.pow(y - this.centerY, 2));
    return dist <= this.radius;
  }

  public getRandomEdgePoint(): { x: number; y: number; angle: number } {
    const angle = Math.random() * Math.PI * 2;
    const x = this.centerX + Math.cos(angle) * this.radius;
    const y = this.centerY + Math.sin(angle) * this.radius;
    return { x, y, angle };
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    for (const particle of this.starRingParticles) {
      particle.angle += particle.speed * deltaTime * 0.001;
      if (particle.angle > Math.PI * 2) {
        particle.angle -= Math.PI * 2;
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D, distortionFn?: DistortionFn): void {
    this.renderBoardGlow(ctx, distortionFn);
    this.renderBackground(ctx);
    this.renderGrid(ctx, distortionFn);
    this.renderStarLights(ctx, distortionFn);
    this.renderStarRing(ctx, distortionFn);
  }

  private applyDistortion(
    x: number,
    y: number,
    distortionFn?: DistortionFn
  ): { x: number; y: number } {
    if (!distortionFn) {
      return { x, y };
    }
    const offset = distortionFn(x, y);
    return { x: x + offset.dx, y: y + offset.dy };
  }

  private renderBoardGlow(ctx: CanvasRenderingContext2D, distortionFn?: DistortionFn): void {
    if (!distortionFn) {
      const gradient = ctx.createRadialGradient(
        this.centerX, this.centerY, this.radius * 0.8,
        this.centerX, this.centerY, this.radius + 20
      );
      gradient.addColorStop(0, 'rgba(100, 50, 200, 0.15)');
      gradient.addColorStop(1, 'rgba(100, 50, 200, 0)');

      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, this.radius + 20, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      return;
    }

    ctx.save();
    ctx.beginPath();
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const r = this.radius + 20;
      const x = this.centerX + Math.cos(angle) * r;
      const y = this.centerY + Math.sin(angle) * r;
      const distorted = this.applyDistortion(x, y, distortionFn);
      if (i === 0) {
        ctx.moveTo(distorted.x, distorted.y);
      } else {
        ctx.lineTo(distorted.x, distorted.y);
      }
    }
    ctx.closePath();
    ctx.clip();

    const gradient = ctx.createRadialGradient(
      this.centerX, this.centerY, this.radius * 0.8,
      this.centerX, this.centerY, this.radius + 20
    );
    gradient.addColorStop(0, 'rgba(100, 50, 200, 0.15)');
    gradient.addColorStop(1, 'rgba(100, 50, 200, 0)');

    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();
  }

  private renderBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, this.radius
    );
    gradient.addColorStop(0, '#2a0055');
    gradient.addColorStop(1, '#0a0015');

    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  private renderGrid(ctx: CanvasRenderingContext2D, distortionFn?: DistortionFn): void {
    ctx.save();

    if (!distortionFn) {
      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, this.radius * 0.95, 0, Math.PI * 2);
      ctx.clip();

      ctx.strokeStyle = 'rgba(192, 192, 200, 0.3)';
      ctx.lineWidth = 1.5;

      const offset = (this.gridSize - 1) / 2;
      const gridWidth = (this.gridSize - 1) * this.cellSize;
      const startX = this.centerX - gridWidth / 2;
      const startY = this.centerY - gridWidth / 2;

      for (let i = 0; i < this.gridSize; i++) {
        const x = startX + i * this.cellSize;
        ctx.beginPath();
        ctx.moveTo(x, startY);
        ctx.lineTo(x, startY + gridWidth);
        ctx.stroke();
      }

      for (let j = 0; j < this.gridSize; j++) {
        const y = startY + j * this.cellSize;
        ctx.beginPath();
        ctx.moveTo(startX, y);
        ctx.lineTo(startX + gridWidth, y);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = 'rgba(192, 192, 200, 0.3)';
      ctx.lineWidth = 1.5;

      for (let i = 0; i < this.gridSize; i++) {
        ctx.beginPath();
        let started = false;
        for (let j = 0; j < this.gridSize; j++) {
          const point = this.gridPoints[i][j];
          if (!point.valid) {
            if (started) {
              ctx.stroke();
              ctx.beginPath();
              started = false;
            }
            continue;
          }
          const distorted = this.applyDistortion(point.x, point.y, distortionFn);
          if (!started) {
            ctx.moveTo(distorted.x, distorted.y);
            started = true;
          } else {
            ctx.lineTo(distorted.x, distorted.y);
          }
        }
        if (started) {
          ctx.stroke();
        }
      }

      for (let j = 0; j < this.gridSize; j++) {
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < this.gridSize; i++) {
          const point = this.gridPoints[i][j];
          if (!point.valid) {
            if (started) {
              ctx.stroke();
              ctx.beginPath();
              started = false;
            }
            continue;
          }
          const distorted = this.applyDistortion(point.x, point.y, distortionFn);
          if (!started) {
            ctx.moveTo(distorted.x, distorted.y);
            started = true;
          } else {
            ctx.lineTo(distorted.x, distorted.y);
          }
        }
        if (started) {
          ctx.stroke();
        }
      }
    }

    ctx.restore();
    this.renderCoordLabels(ctx, distortionFn);
  }

  private renderCoordLabels(ctx: CanvasRenderingContext2D, distortionFn?: DistortionFn): void {
    ctx.save();
    ctx.fillStyle = 'rgba(200, 220, 255, 0.4)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const labelRadius = this.radius * 0.9;
    const letters = 'ABCDEFGHJKLMNOPQRST';

    for (let i = 0; i < this.gridSize; i++) {
      const point = this.gridPoints[i][Math.floor(this.gridSize / 2)];
      if (!point.valid) continue;

      const topAngle = -Math.PI / 2;
      const topX = this.centerX + Math.cos(topAngle) * labelRadius * 0.95;
      const topY = this.centerY + Math.sin(topAngle) * labelRadius * 0.95;

      const bottomAngle = Math.PI / 2;
      const bottomX = this.centerX + Math.cos(bottomAngle) * labelRadius * 0.95;
      const bottomY = this.centerY + Math.sin(bottomAngle) * labelRadius * 0.95;

      const offset = (this.gridSize - 1) / 2;
      const x = this.centerX + (i - offset) * this.cellSize;

      if (Math.abs(x - this.centerX) < labelRadius * 0.9) {
        let topPos = { x, y: topY - 8 };
        let bottomPos = { x, y: bottomY + 8 };

        if (distortionFn) {
          topPos = this.applyDistortion(topPos.x, topPos.y, distortionFn);
          bottomPos = this.applyDistortion(bottomPos.x, bottomPos.y, distortionFn);
        }

        ctx.fillText(letters[i], topPos.x, topPos.y);
        ctx.fillText(letters[i], bottomPos.x, bottomPos.y);
      }
    }

    for (let j = 0; j < this.gridSize; j++) {
      const offset = (this.gridSize - 1) / 2;
      const y = this.centerY + (j - offset) * this.cellSize;
      const num = String(this.gridSize - j);

      const leftAngle = Math.PI;
      const leftX = this.centerX + Math.cos(leftAngle) * labelRadius * 0.95;
      const leftY = this.centerY + Math.sin(leftAngle) * labelRadius * 0.95;

      const rightAngle = 0;
      const rightX = this.centerX + Math.cos(rightAngle) * labelRadius * 0.95;
      const rightY = this.centerY + Math.sin(rightAngle) * labelRadius * 0.95;

      if (Math.abs(y - this.centerY) < labelRadius * 0.9) {
        let leftPos = { x: leftX - 12, y };
        let rightPos = { x: rightX + 12, y };

        if (distortionFn) {
          leftPos = this.applyDistortion(leftPos.x, leftPos.y, distortionFn);
          rightPos = this.applyDistortion(rightPos.x, rightPos.y, distortionFn);
        }

        ctx.fillText(num, leftPos.x, leftPos.y);
        ctx.fillText(num, rightPos.x, rightPos.y);
      }
    }

    ctx.restore();
  }

  private renderStarLights(ctx: CanvasRenderingContext2D, distortionFn?: DistortionFn): void {
    for (const light of this.starLights) {
      const twinkle = 0.6 + Math.sin(this.time * 0.002 + light.phase) * 0.2;

      let pos = { x: light.x, y: light.y };
      if (distortionFn) {
        pos = this.applyDistortion(light.x, light.y, distortionFn);
      }

      const gradient = ctx.createRadialGradient(
        pos.x, pos.y, 0,
        pos.x, pos.y, 3
      );
      gradient.addColorStop(0, `rgba(255, 255, 255, ${twinkle})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }

  private renderStarRing(ctx: CanvasRenderingContext2D, distortionFn?: DistortionFn): void {
    for (const particle of this.starRingParticles) {
      let x = this.centerX + Math.cos(particle.angle) * particle.radius;
      let y = this.centerY + Math.sin(particle.angle) * particle.radius;

      if (distortionFn) {
        const distorted = this.applyDistortion(x, y, distortionFn);
        x = distorted.x;
        y = distorted.y;
      }

      const gradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, particle.size * 2
      );
      gradient.addColorStop(0, `hsla(${particle.hue}, 100%, 70%, 0.8)`);
      gradient.addColorStop(1, `hsla(${particle.hue}, 100%, 70%, 0)`);

      ctx.beginPath();
      ctx.arc(x, y, particle.size * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }

  public getBoardRadius(): number {
    return this.radius;
  }
}
