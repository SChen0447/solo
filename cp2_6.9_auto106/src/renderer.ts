export interface CarState {
  x: number;
  y: number;
  width: number;
  height: number;
  speedMultiplier: number;
  boosted: boolean;
}

export interface ObstacleState {
  id: number;
  type: 'cone' | 'missile';
  x: number;
  y: number;
  width: number;
  height: number;
  passed: boolean;
}

export interface PowerUpState {
  id: number;
  x: number;
  y: number;
  radius: number;
  rotation: number;
  collected: boolean;
}

export interface ParticleState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  colorStart: string;
  colorEnd: string;
}

export interface GameRenderState {
  car: CarState;
  obstacles: ObstacleState[];
  powerUps: PowerUpState[];
  particles: ParticleState[];
  score: number;
  speedPercent: number;
  progress: number;
  scrollOffset: number;
  flashRed: boolean;
  gameOver: boolean;
  victory: boolean;
  victoryAnimProgress: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private width: number = 0;
  private height: number = 0;

  private readonly PRIMARY_COLOR = '#2A3B4C';
  private readonly SECONDARY_COLOR = '#1F2A36';
  private readonly GUARDRAIL_RED = '#FF3333';
  private readonly GUARDRAIL_WHITE = '#FFFFFF';
  private readonly CONE_COLOR = '#FF6B35';
  private readonly MISSILE_COLOR = '#FF2222';
  private readonly STAR_COLOR_START = '#FFD700';
  private readonly HUD_TEXT_COLOR = '#FFFFFF';
  private readonly HUD_GLOW_COLOR = '#00E5FF';
  private readonly BG_COLOR = '#0B0E14';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  public resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
  }

  private getTrackWidth(): number {
    return this.width * 0.6;
  }

  private getTrackLeft(): number {
    return (this.width - this.getTrackWidth()) / 2;
  }

  private getCarXRange(): { min: number; max: number } {
    const trackWidth = this.getTrackWidth();
    const trackLeft = this.getTrackLeft();
    const range = trackWidth * 0.8;
    const start = trackLeft + (trackWidth - range) / 2;
    return { min: start, max: start + range };
  }

  public render(state: GameRenderState): void {
    this.ctx.fillStyle = this.BG_COLOR;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.drawTrack(state.scrollOffset);
    this.drawGuardrails(state.scrollOffset);
    this.drawPowerUps(state.powerUps);
    this.drawObstacles(state.obstacles);
    this.drawParticles(state.particles);
    this.drawCar(state.car);
    this.drawHUD(state.score, state.speedPercent);

    if (state.flashRed) {
      this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
      this.ctx.fillRect(0, 0, this.width, this.height);
    }

    if (state.victory) {
      this.drawVictory(state.victoryAnimProgress);
    }
  }

  private drawTrack(scrollOffset: number): void {
    const trackWidth = this.getTrackWidth();
    const horizonY = this.height * 0.3;
    const bottomY = this.height;
    const bandHeight = 80;
    const totalBands = Math.ceil((bottomY - horizonY) / bandHeight) + 4;

    for (let i = -2; i < totalBands; i++) {
      const offset = ((scrollOffset % bandHeight) + bandHeight) % bandHeight;
      const yTop = horizonY + i * bandHeight + offset;
      const yBottom = yTop + bandHeight;

      if (yBottom < horizonY || yTop > bottomY) continue;

      const perspectiveTop = (yTop - horizonY) / (bottomY - horizonY);
      const perspectiveBottom = (yBottom - horizonY) / (bottomY - horizonY);
      const widthTop = trackWidth * Math.max(0.1, perspectiveTop);
      const widthBottom = trackWidth * Math.max(0.1, perspectiveBottom);
      const leftTop = (this.width - widthTop) / 2;
      const leftBottom = (this.width - widthBottom) / 2;

      this.ctx.beginPath();
      this.ctx.moveTo(leftTop, yTop);
      this.ctx.lineTo(leftTop + widthTop, yTop);
      this.ctx.lineTo(leftBottom + widthBottom, yBottom);
      this.ctx.lineTo(leftBottom, yBottom);
      this.ctx.closePath();
      this.ctx.fillStyle = i % 2 === 0 ? this.PRIMARY_COLOR : this.SECONDARY_COLOR;
      this.ctx.fill();
    }
  }

  private drawGuardrails(scrollOffset: number): void {
    const trackWidth = this.getTrackWidth();
    const horizonY = this.height * 0.3;
    const bottomY = this.height;
    const segmentHeight = 100;
    const totalSegments = Math.ceil((bottomY - horizonY) / segmentHeight) + 4;

    for (let i = -2; i < totalSegments; i++) {
      const offset = ((scrollOffset % segmentHeight) + segmentHeight) % segmentHeight;
      const yTop = horizonY + i * segmentHeight + offset;
      const yBottom = yTop + segmentHeight;

      if (yBottom < horizonY || yTop > bottomY) continue;

      const perspectiveTop = (yTop - horizonY) / (bottomY - horizonY);
      const perspectiveBottom = (yBottom - horizonY) / (bottomY - horizonY);
      const widthTop = trackWidth * Math.max(0.1, perspectiveTop);
      const widthBottom = trackWidth * Math.max(0.1, perspectiveBottom);
      const leftTop = (this.width - widthTop) / 2;
      const leftBottom = (this.width - widthBottom) / 2;
      const railWidthTop = Math.max(3, 60 * Math.max(0.1, perspectiveTop));
      const railWidthBottom = Math.max(3, 60 * Math.max(0.1, perspectiveBottom));
      const railHeight = Math.max(2, 20 * Math.max(0.1, perspectiveBottom));

      const isRed = i % 2 === 0;
      const color = isRed ? this.GUARDRAIL_RED : this.GUARDRAIL_WHITE;

      this.ctx.fillStyle = color;

      this.ctx.beginPath();
      this.ctx.moveTo(leftTop - railWidthTop, yTop);
      this.ctx.lineTo(leftTop, yTop);
      this.ctx.lineTo(leftBottom, yBottom);
      this.ctx.lineTo(leftBottom - railWidthBottom, yBottom + railHeight);
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.moveTo(leftTop + widthTop, yTop);
      this.ctx.lineTo(leftTop + widthTop + railWidthTop, yTop);
      this.ctx.lineTo(leftBottom + widthBottom + railWidthBottom, yBottom + railHeight);
      this.ctx.lineTo(leftBottom + widthBottom, yBottom);
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  private drawCar(car: CarState): void {
    const range = this.getCarXRange();
    const carX = range.min + car.x * (range.max - range.min);
    const carY = this.height * 0.8;
    const carWidth = Math.min(60, this.width * 0.06);
    const carHeight = Math.min(100, this.height * 0.12);

    this.ctx.save();
    this.ctx.translate(carX, carY);

    if (car.boosted) {
      this.ctx.shadowColor = '#FFD700';
      this.ctx.shadowBlur = 20;
    }

    this.ctx.fillStyle = '#00E5FF';
    this.ctx.beginPath();
    this.ctx.moveTo(0, -carHeight / 2);
    this.ctx.lineTo(-carWidth / 2, carHeight / 3);
    this.ctx.lineTo(-carWidth / 3, carHeight / 2);
    this.ctx.lineTo(carWidth / 3, carHeight / 2);
    this.ctx.lineTo(carWidth / 2, carHeight / 3);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = '#0088AA';
    this.ctx.beginPath();
    this.ctx.moveTo(0, -carHeight / 4);
    this.ctx.lineTo(-carWidth / 4, carHeight / 6);
    this.ctx.lineTo(carWidth / 4, carHeight / 6);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = '#FF4444';
    this.ctx.fillRect(-carWidth / 3, carHeight / 3, carWidth / 6, carHeight / 8);
    this.ctx.fillRect(carWidth / 6, carHeight / 3, carWidth / 6, carHeight / 8);

    this.ctx.restore();
  }

  private drawObstacles(obstacles: ObstacleState[]): void {
    const trackWidth = this.getTrackWidth();
    const trackLeft = this.getTrackLeft();
    const horizonY = this.height * 0.3;
    const bottomY = this.height;

    for (const obs of obstacles) {
      const perspective = Math.max(0.1, (obs.y - horizonY) / (bottomY - horizonY));
      if (perspective < 0.1 || perspective > 1.2) continue;

      const x = trackLeft + obs.x * trackWidth;
      const y = obs.y;

      if (obs.type === 'cone') {
        const coneHeight = 40 * perspective;
        const coneWidth = 30 * perspective;

        this.ctx.fillStyle = this.CONE_COLOR;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - coneHeight);
        this.ctx.lineTo(x - coneWidth / 2, y);
        this.ctx.lineTo(x + coneWidth / 2, y);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(x - coneWidth / 2, y - coneHeight * 0.4, coneWidth, coneHeight * 0.15);
        this.ctx.fillRect(x - coneWidth / 2, y - coneHeight * 0.7, coneWidth, coneHeight * 0.1);
      } else {
        const size = 30 * perspective;
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(Math.PI / 4);
        this.ctx.fillStyle = this.MISSILE_COLOR;
        this.ctx.fillRect(-size / 2, -size / 2, size, size);
        this.ctx.strokeStyle = '#FF8888';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-size / 2, -size / 2, size, size);
        this.ctx.restore();
      }
    }
  }

  private drawPowerUps(powerUps: PowerUpState[]): void {
    const trackWidth = this.getTrackWidth();
    const trackLeft = this.getTrackLeft();

    for (const pu of powerUps) {
      if (pu.collected) continue;

      const x = trackLeft + pu.x * trackWidth;
      const y = pu.y;
      const radius = pu.radius;

      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.rotate((pu.rotation * Math.PI) / 180);

      this.ctx.shadowColor = this.STAR_COLOR_START;
      this.ctx.shadowBlur = 15;

      this.ctx.fillStyle = this.STAR_COLOR_START;
      this.ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const outerAngle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const innerAngle = outerAngle + Math.PI / 5;
        const outerX = Math.cos(outerAngle) * radius;
        const outerY = Math.sin(outerAngle) * radius;
        const innerX = Math.cos(innerAngle) * radius * 0.4;
        const innerY = Math.sin(innerAngle) * radius * 0.4;
        if (i === 0) {
          this.ctx.moveTo(outerX, outerY);
        } else {
          this.ctx.lineTo(outerX, outerY);
        }
        this.ctx.lineTo(innerX, innerY);
      }
      this.ctx.closePath();
      this.ctx.fill();

      this.ctx.restore();
    }
  }

  private drawParticles(particles: ParticleState[]): void {
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      const t = 1 - alpha;

      const c1 = this.hexToRgb(p.colorStart);
      const c2 = this.hexToRgb(p.colorEnd);
      const r = Math.round(c1.r + (c2.r - c1.r) * t);
      const g = Math.round(c1.g + (c2.g - c1.g) * t);
      const b = Math.round(c1.b + (c2.b - c1.b) * t);

      this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
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

  private drawHUD(score: number, speedPercent: number): void {
    this.ctx.save();
    this.ctx.font = '18px monospace';
    this.ctx.fillStyle = this.HUD_TEXT_COLOR;
    this.ctx.shadowColor = this.HUD_GLOW_COLOR;
    this.ctx.shadowBlur = 4;

    this.ctx.fillText(`SCORE: ${Math.floor(score)}`, 20, 35);
    this.ctx.fillText(`SPEED: ${Math.floor(speedPercent)}%`, 20, 60);

    this.ctx.restore();
  }

  private drawVictory(progress: number): void {
    const scale = 0.5 + progress * 0.5;
    const alpha = progress;

    if (progress > 0.3) {
      const bgT = Math.min(1, (progress - 0.3) / 0.7);
      this.ctx.fillStyle = `rgba(255, 215, 0, ${bgT * 0.3})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.translate(this.width / 2, this.height / 2);
    this.ctx.scale(scale, scale);
    this.ctx.font = 'bold 64px monospace';
    this.ctx.fillStyle = '#FFD700';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.shadowColor = '#FFA500';
    this.ctx.shadowBlur = 20;
    this.ctx.fillText('Race Complete!!', 0, 0);
    this.ctx.restore();
  }
}
