import type { ColorAperture, Point } from './iceWall';

export interface LightBeamConfig {
  startX: number;
  startY: number;
  angle: number;
  width: number;
  brightness: number;
}

export interface SpectrumRay {
  angle: number;
  color: string;
  wavelength: number;
  intensity: number;
}

interface ScreenConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

const SPECTRUM_COLORS = [
  { wavelength: 380, color: 'rgba(148, 0, 211, ' },
  { wavelength: 450, color: 'rgba(75, 0, 130, ' },
  { wavelength: 495, color: 'rgba(0, 0, 255, ' },
  { wavelength: 570, color: 'rgba(0, 255, 0, ' },
  { wavelength: 590, color: 'rgba(255, 255, 0, ' },
  { wavelength: 620, color: 'rgba(255, 127, 0, ' },
  { wavelength: 750, color: 'rgba(255, 0, 0, ' }
];

const FAN_ANGLE = 15 * Math.PI / 180;
const RAY_WIDTH = 2;
const TOTAL_SPECTRUM_WIDTH = 30;

export class LightBeam {
  private config: LightBeamConfig;
  private screen: ScreenConfig;
  private canvasWidth: number;
  private canvasHeight: number;
  private spectrumRays: SpectrumRay[] = [];
  private hasApertureInPath = false;
  private apertureHitPoint: Point | null = null;

  constructor(config: LightBeamConfig, canvasWidth: number, canvasHeight: number) {
    this.config = { ...config };
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.screen = this.calculateScreenPosition();
    this.generateSpectrumRays();
  }

  private calculateScreenPosition(): ScreenConfig {
    const screenWidth = Math.min(this.canvasWidth * 0.5, 600);
    const screenHeight = screenWidth * 9 / 16;
    return {
      x: (this.canvasWidth - screenWidth) / 2,
      y: this.canvasHeight - screenHeight - 120,
      width: screenWidth,
      height: screenHeight
    };
  }

  private generateSpectrumRays(): void {
    this.spectrumRays = [];
    const numRays = Math.ceil(TOTAL_SPECTRUM_WIDTH / RAY_WIDTH);
    const baseAngle = this.config.angle * Math.PI / 180;

    for (let i = 0; i < numRays; i++) {
      const t = i / (numRays - 1);
      const wavelength = 380 + t * (750 - 380);
      const angleOffset = (t - 0.5) * FAN_ANGLE;
      
      this.spectrumRays.push({
        angle: baseAngle + angleOffset,
        color: this.wavelengthToColor(wavelength),
        wavelength,
        intensity: 0.9
      });
    }
  }

  private wavelengthToColor(wavelength: number): string {
    if (wavelength < SPECTRUM_COLORS[0].wavelength) {
      return SPECTRUM_COLORS[0].color;
    }
    if (wavelength > SPECTRUM_COLORS[SPECTRUM_COLORS.length - 1].wavelength) {
      return SPECTRUM_COLORS[SPECTRUM_COLORS.length - 1].color;
    }
    
    for (let i = 0; i < SPECTRUM_COLORS.length - 1; i++) {
      const curr = SPECTRUM_COLORS[i];
      const next = SPECTRUM_COLORS[i + 1];
      if (wavelength >= curr.wavelength && wavelength <= next.wavelength) {
        const t = (wavelength - curr.wavelength) / (next.wavelength - curr.wavelength);
        return this.interpolateColor(curr.color, next.color, t);
      }
    }
    return SPECTRUM_COLORS[0].color;
  }

  private interpolateColor(color1: string, color2: string, t: number): string {
    const r1 = parseInt(color1.match(/\d+/)?.[0] || '0');
    const g1 = parseInt(color1.match(/\d+/g)?.[1] || '0');
    const b1 = parseInt(color1.match(/\d+/g)?.[2] || '0');
    const r2 = parseInt(color2.match(/\d+/)?.[0] || '0');
    const g2 = parseInt(color2.match(/\d+/g)?.[1] || '0');
    const b2 = parseInt(color2.match(/\d+/g)?.[2] || '0');
    
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    
    return `rgba(${r}, ${g}, ${b}, `;
  }

  update(_deltaTime: number, _currentTime: number, apertures: ColorAperture[], wallBounds: { x: number; y: number; width: number; height: number }): void {
    const baseAngle = this.config.angle * Math.PI / 180;
    const dirX = Math.cos(baseAngle);
    const dirY = Math.sin(baseAngle);
    
    this.hasApertureInPath = false;
    this.apertureHitPoint = null;
    
    const wallEntry = this.getLineRectIntersection(
      this.config.startX, this.config.startY,
      dirX, dirY,
      wallBounds.x, wallBounds.y, wallBounds.width, wallBounds.height
    );
    
    if (wallEntry) {
      const wallExit = this.getLineRectIntersection(
        wallEntry.x, wallEntry.y,
        dirX, dirY,
        wallBounds.x, wallBounds.y, wallBounds.width, wallBounds.height,
        true
      );
      
      const endX = wallExit ? wallExit.x : this.config.startX + dirX * 2000;
      const endY = wallExit ? wallExit.y : this.config.startY + dirY * 2000;
      
      for (const aperture of apertures) {
        const hit = this.lineCircleIntersection(
          wallEntry.x, wallEntry.y,
          endX, endY,
          aperture.x, aperture.y, aperture.radius
        );
        if (hit) {
          this.hasApertureInPath = true;
          this.apertureHitPoint = hit;
          break;
        }
      }
    }
    
    this.generateSpectrumRays();
  }

  private getLineRectIntersection(
    startX: number, startY: number,
    dirX: number, dirY: number,
    rectX: number, rectY: number, rectW: number, rectH: number,
    exit: boolean = false
  ): Point | null {
    let tMin = 0;
    let tMax = Infinity;
    
    if (Math.abs(dirX) > 0.0001) {
      const t1 = (rectX - startX) / dirX;
      const t2 = (rectX + rectW - startX) / dirX;
      tMin = Math.max(tMin, Math.min(t1, t2));
      tMax = Math.min(tMax, Math.max(t1, t2));
    }
    
    if (Math.abs(dirY) > 0.0001) {
      const t1 = (rectY - startY) / dirY;
      const t2 = (rectY + rectH - startY) / dirY;
      tMin = Math.max(tMin, Math.min(t1, t2));
      tMax = Math.min(tMax, Math.max(t1, t2));
    }
    
    if (tMin <= tMax && tMin > 0.001) {
      const t = exit ? tMax : tMin;
      return {
        x: startX + dirX * t,
        y: startY + dirY * t
      };
    }
    return null;
  }

  private lineCircleIntersection(
    x1: number, y1: number,
    x2: number, y2: number,
    cx: number, cy: number, r: number
  ): Point | null {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const fx = x1 - cx;
    const fy = y1 - cy;
    
    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;
    
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;
    
    const t = (-b - Math.sqrt(discriminant)) / (2 * a);
    if (t >= 0 && t <= 1) {
      return {
        x: x1 + dx * t,
        y: y1 + dy * t
      };
    }
    return null;
  }

  render(ctx: CanvasRenderingContext2D, _currentTime: number): void {
    this.renderScreen(ctx);
    
    const baseAngle = this.config.angle * Math.PI / 180;
    const dirX = Math.cos(baseAngle);
    const dirY = Math.sin(baseAngle);
    
    const beamEndX = this.config.startX + dirX * 2000;
    const beamEndY = this.config.startY + dirY * 2000;
    
    this.renderBeam(ctx, this.config.startX, this.config.startY, beamEndX, beamEndY);
    
    if (this.hasApertureInPath && this.apertureHitPoint) {
      this.renderSpectrum(ctx, this.apertureHitPoint);
    }
  }

  private renderScreen(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    
    const gradient = ctx.createLinearGradient(
      this.screen.x, this.screen.y,
      this.screen.x, this.screen.y + this.screen.height
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
    
    ctx.fillStyle = gradient;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(this.screen.x, this.screen.y, this.screen.width, this.screen.height, 8);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '11px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('虚拟光谱屏', this.screen.x + this.screen.width / 2, this.screen.y - 8);
    
    ctx.restore();
  }

  private renderBeam(
    ctx: CanvasRenderingContext2D,
    startX: number, startY: number,
    endX: number, endY: number
  ): void {
    ctx.save();
    
    const brightness = this.config.brightness;
    const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${0.9 * brightness})`);
    gradient.addColorStop(0.3, `rgba(230, 240, 255, ${0.6 * brightness})`);
    gradient.addColorStop(0.7, `rgba(200, 220, 255, ${0.3 * brightness})`);
    gradient.addColorStop(1, 'rgba(200, 220, 255, 0)');
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = this.config.width;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(200, 230, 255, 0.8)';
    ctx.shadowBlur = 15 * brightness;
    
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(startX, startY, 6, 0, Math.PI * 2);
    const sourceGradient = ctx.createRadialGradient(startX, startY, 0, startX, startY, 8);
    sourceGradient.addColorStop(0, `rgba(255, 255, 255, ${brightness})`);
    sourceGradient.addColorStop(0.5, `rgba(200, 230, 255, ${0.5 * brightness})`);
    sourceGradient.addColorStop(1, 'rgba(200, 230, 255, 0)');
    ctx.fillStyle = sourceGradient;
    ctx.fill();
    
    ctx.restore();
  }

  private renderSpectrum(ctx: CanvasRenderingContext2D, origin: Point): void {
    ctx.save();
    const brightness = this.config.brightness;
    
    for (let i = 0; i < this.spectrumRays.length; i++) {
      const ray = this.spectrumRays[i];
      const rayDirX = Math.cos(ray.angle);
      const rayDirY = Math.sin(ray.angle);
      
      const screenHit = this.raycastToScreen(origin.x, origin.y, rayDirX, rayDirY);
      
      if (screenHit) {
        const alpha = 0.85 * brightness;
        const color = ray.color + alpha + ')';
        
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = RAY_WIDTH;
        ctx.lineCap = 'round';
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
        
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(screenHit.x, screenHit.y);
        ctx.stroke();
        ctx.restore();
        
        ctx.save();
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha * 0.6;
        ctx.beginPath();
        ctx.ellipse(
          screenHit.x, screenHit.y,
          RAY_WIDTH * 1.5, this.screen.height * 0.4,
          0, 0, Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
      }
    }
    
    ctx.restore();
  }

  private raycastToScreen(
    startX: number, startY: number,
    dirX: number, dirY: number
  ): Point | null {
    const t = (this.screen.y - startY) / dirY;
    if (t <= 0) return null;
    
    const x = startX + dirX * t;
    if (x >= this.screen.x && x <= this.screen.x + this.screen.width) {
      return { x, y: this.screen.y };
    }
    
    const t2 = (this.screen.y + this.screen.height - startY) / dirY;
    if (t2 <= 0) return null;
    const x2 = startX + dirX * t2;
    if (x2 >= this.screen.x && x2 <= this.screen.x + this.screen.width) {
      return { x: x2, y: this.screen.y + this.screen.height };
    }
    
    const t3 = (this.screen.x - startX) / dirX;
    if (t3 > 0) {
      const y = startY + dirY * t3;
      if (y >= this.screen.y && y <= this.screen.y + this.screen.height) {
        return { x: this.screen.x, y };
      }
    }
    
    const t4 = (this.screen.x + this.screen.width - startX) / dirX;
    if (t4 > 0) {
      const y = startY + dirY * t4;
      if (y >= this.screen.y && y <= this.screen.y + this.screen.height) {
        return { x: this.screen.x + this.screen.width, y };
      }
    }
    
    return null;
  }

  setAngle(angle: number): void {
    this.config.angle = angle;
  }

  setBrightness(brightness: number): void {
    this.config.brightness = brightness;
  }

  getScreen(): ScreenConfig {
    return { ...this.screen };
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.config.startX = width - 80;
    this.config.startY = 80;
    this.screen = this.calculateScreenPosition();
  }

  reset(): void {
    this.hasApertureInPath = false;
    this.apertureHitPoint = null;
  }
}
