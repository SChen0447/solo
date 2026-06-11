import { v4 as uuidv4 } from 'uuid';

export interface Shrimp {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  energy: number;
  size: number;
  eyePhase: number;
}

export interface ShrimpSimOptions {
  count: number;
  canvasWidth: number;
  canvasHeight: number;
  ventX: number;
  ventY: number;
}

export interface EnvironmentParams {
  temperature: number;
  ph: number;
}

export interface ShrimpInfo {
  shrimp: Shrimp;
  localTemp: number;
}

const TEMPERATURE_SIGMA = 120;
const BASE_SPEED = 40;
const HUNGER_SPEED_MULTIPLIER = 1.5;
const ENERGY_DRAIN_BASE = 0.5;
const ENERGY_DRAIN_FAST = 1.0;
const ENERGY_RECOVERY_RATE = 5;
const BIOFILM_RADIUS = 80;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export class ShrimpSim {
  private shrimps: Shrimp[] = [];
  private canvasWidth: number;
  private canvasHeight: number;
  private ventX: number;
  private ventY: number;
  private frameCounter = 0;

  constructor(options: ShrimpSimOptions) {
    this.canvasWidth = options.canvasWidth;
    this.canvasHeight = options.canvasHeight;
    this.ventX = options.ventX;
    this.ventY = options.ventY;
    this.initializeShrimps(options.count);
  }

  private initializeShrimps(count: number): void {
    this.shrimps = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 150 + Math.random() * 250;
      const x = clamp(this.ventX + Math.cos(angle) * distance, 60, this.canvasWidth - 60);
      const y = clamp(this.ventY + Math.sin(angle) * distance, 60, this.canvasHeight - 60);
      this.shrimps.push({
        id: uuidv4(),
        x,
        y,
        vx: (Math.random() - 0.5) * 30,
        vy: (Math.random() - 0.5) * 30,
        angle: Math.random() * Math.PI * 2,
        energy: 40 + Math.random() * 40,
        size: 8 + Math.random() * 4,
        eyePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public getTemperatureAt(x: number, y: number, ventTemp: number): number {
    const dx = x - this.ventX;
    const dy = y - this.ventY;
    const distSq = dx * dx + dy * dy;
    return ventTemp * Math.exp(-distSq / (2 * TEMPERATURE_SIGMA * TEMPERATURE_SIGMA));
  }

  public getBiofilmDensityAt(x: number, y: number, biofilmGrid: Map<string, number>, gridSize: number): number {
    const dx = x - this.ventX;
    const dy = y - this.ventY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > BIOFILM_RADIUS) return 0;
    const gx = Math.floor((x - (this.ventX - BIOFILM_RADIUS)) / gridSize);
    const gy = Math.floor((y - (this.ventY - BIOFILM_RADIUS)) / gridSize);
    return biofilmGrid.get(`${gx},${gy}`) ?? 0;
  }

  private findOptimalDirection(shrimp: Shrimp, ventTemp: number, targetTempMin: number, targetTempMax: number): { x: number; y: number } {
    let bestScore = -Infinity;
    let bestDirX = Math.cos(shrimp.angle);
    let bestDirY = Math.sin(shrimp.angle);
    const sampleCount = 8;
    for (let i = 0; i < sampleCount; i++) {
      const sampleAngle = (i / sampleCount) * Math.PI * 2;
      const sampleX = shrimp.x + Math.cos(sampleAngle) * 25;
      const sampleY = shrimp.y + Math.sin(sampleAngle) * 25;
      const temp = this.getTemperatureAt(sampleX, sampleY, ventTemp);
      let score = 0;
      if (temp >= targetTempMin && temp <= targetTempMax) {
        score = 100 - Math.abs(temp - (targetTempMin + targetTempMax) / 2);
      } else if (temp < targetTempMin) {
        const dx = this.ventX - shrimp.x;
        const dy = this.ventY - shrimp.y;
        const toVentAngle = Math.atan2(dy, dx);
        score = Math.cos(sampleAngle - toVentAngle) * 50;
      } else {
        const dx = shrimp.x - this.ventX;
        const dy = shrimp.y - this.ventY;
        const awayAngle = Math.atan2(dy, dx);
        score = Math.cos(sampleAngle - awayAngle) * 50;
      }
      if (score > bestScore) {
        bestScore = score;
        bestDirX = Math.cos(sampleAngle);
        bestDirY = Math.sin(sampleAngle);
      }
    }
    return { x: bestDirX, y: bestDirY };
  }

  public update(
    dt: number,
    params: EnvironmentParams,
    biofilmGrid: Map<string, number>,
    gridSize: number
  ): void {
    this.frameCounter++;
    const { temperature: ventTemp } = params;
    for (const shrimp of this.shrimps) {
      shrimp.eyePhase += dt * 3;
      const localTemp = this.getTemperatureAt(shrimp.x, shrimp.y, ventTemp);
      const biofilmDensity = this.getBiofilmDensityAt(shrimp.x, shrimp.y, biofilmGrid, gridSize);
      let targetDirX: number;
      let targetDirY: number;
      let speedMultiplier = 1;
      if (shrimp.energy < 20) {
        const optimal = this.findOptimalDirection(shrimp, ventTemp, 30, 50);
        targetDirX = optimal.x;
        targetDirY = optimal.y;
        speedMultiplier = HUNGER_SPEED_MULTIPLIER;
      } else if (shrimp.energy > 70) {
        shrimp.angle += (Math.random() - 0.5) * dt * 2;
        targetDirX = Math.cos(shrimp.angle);
        targetDirY = Math.sin(shrimp.angle);
      } else {
        if (Math.random() < 0.02) {
          const optimal = this.findOptimalDirection(shrimp, ventTemp, 25, 55);
          targetDirX = optimal.x;
          targetDirY = optimal.y;
          shrimp.angle = Math.atan2(targetDirY, targetDirX);
        } else {
          shrimp.angle += (Math.random() - 0.5) * dt * 1.5;
          targetDirX = Math.cos(shrimp.angle);
          targetDirY = Math.sin(shrimp.angle);
        }
      }
      const targetVx = targetDirX * BASE_SPEED * speedMultiplier;
      const targetVy = targetDirY * BASE_SPEED * speedMultiplier;
      shrimp.vx = lerp(shrimp.vx, targetVx, 0.05);
      shrimp.vy = lerp(shrimp.vy, targetVy, 0.05);
      shrimp.x += shrimp.vx * dt;
      shrimp.y += shrimp.vy * dt;
      shrimp.x = clamp(shrimp.x, 15, this.canvasWidth - 15);
      shrimp.y = clamp(shrimp.y, 15, this.canvasHeight - 15);
      shrimp.angle = Math.atan2(shrimp.vy, shrimp.vx);
      if (biofilmDensity > 0.5 && localTemp >= 30 && localTemp <= 50) {
        shrimp.energy = clamp(shrimp.energy + ENERGY_RECOVERY_RATE * dt, 0, 100);
      } else {
        const drainRate = speedMultiplier > 1 ? ENERGY_DRAIN_FAST : ENERGY_DRAIN_BASE;
        shrimp.energy = clamp(shrimp.energy - drainRate * dt, 0, 100);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D, lowQuality: boolean, ventTemp: number): ShrimpInfo[] {
    const shrimpInfos: ShrimpInfo[] = [];
    const updateEyes = lowQuality ? this.frameCounter % 3 === 0 : true;
    for (const shrimp of this.shrimps) {
      ctx.save();
      ctx.translate(shrimp.x, shrimp.y);
      ctx.rotate(shrimp.angle);
      ctx.fillStyle = `rgba(220, 220, 220, 0.75)`;
      ctx.beginPath();
      if (lowQuality) {
        ctx.arc(0, 0, shrimp.size * 0.6, 0, Math.PI * 2);
      } else {
        ctx.ellipse(0, 0, shrimp.size * 0.8, shrimp.size * 0.4, 0, 0, Math.PI * 2);
      }
      ctx.fill();
      if (!lowQuality) {
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        ctx.fillStyle = 'rgba(220,220,220,0.5)';
        for (let i = 0; i < 3; i++) {
          const legX = shrimp.size * 0.2 - i * shrimp.size * 0.25;
          ctx.beginPath();
          ctx.moveTo(legX, shrimp.size * 0.3);
          ctx.lineTo(legX - 2, shrimp.size * 0.7);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = 'rgba(220,220,220,0.6)';
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(legX, -shrimp.size * 0.3);
          ctx.lineTo(legX - 2, -shrimp.size * 0.7);
          ctx.stroke();
        }
      }
      if (updateEyes) {
        const eyeBrightness = (Math.sin(shrimp.eyePhase) + 1) / 2;
        const eyeAlpha = 0.6 + eyeBrightness * 0.4;
        const eyeGlow = eyeBrightness > 0.7;
        ctx.fillStyle = `rgba(255, 230, 150, ${eyeAlpha})`;
        if (eyeGlow) {
          ctx.shadowColor = 'rgba(255, 230, 150, 0.8)';
          ctx.shadowBlur = 4;
        }
        ctx.beginPath();
        ctx.arc(shrimp.size * 0.45, -shrimp.size * 0.15, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(shrimp.size * 0.45, shrimp.size * 0.15, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
      const localTemp = this.getTemperatureAt(shrimp.x, shrimp.y, ventTemp);
      shrimpInfos.push({ shrimp, localTemp });
    }
    return shrimpInfos;
  }

  public getShrimps(): Shrimp[] {
    return this.shrimps;
  }

  public getCount(): number {
    return this.shrimps.length;
  }

  public getGatheringRatio(): number {
    let gathered = 0;
    for (const shrimp of this.shrimps) {
      const dx = shrimp.x - this.ventX;
      const dy = shrimp.y - this.ventY;
      if (dx * dx + dy * dy <= BIOFILM_RADIUS * BIOFILM_RADIUS) {
        gathered++;
      }
    }
    return this.shrimps.length > 0 ? gathered / this.shrimps.length : 0;
  }

  public findShrimpAtPoint(px: number, py: number, ventTemp: number): ShrimpInfo | null {
    for (let i = this.shrimps.length - 1; i >= 0; i--) {
      const shrimp = this.shrimps[i];
      const dx = px - shrimp.x;
      const dy = py - shrimp.y;
      const hitRadius = shrimp.size * 1.2;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        const localTemp = this.getTemperatureAt(shrimp.x, shrimp.y, ventTemp);
        return { shrimp, localTemp };
      }
    }
    return null;
  }
}
