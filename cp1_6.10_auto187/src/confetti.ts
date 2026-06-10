export const COLOR_PALETTE: string[] = [
  '#ff6b6b',
  '#ffd93d',
  '#6bcb77',
  '#4d96ff',
  '#ff9ff3',
  '#feca57',
  '#48dbfb',
  '#1dd1a1',
  '#ff6348',
  '#a29bfe',
  '#fd79a8',
  '#00b894'
];

export const CONFETTI_LIFETIME = 12000;
export const MAX_CONFETTI = 200;
export const MERGE_DISTANCE = 30;
export const BREATH_PERIOD = 1200;
export const BREATH_SIZE_AMPLITUDE = 3;
export const BREATH_ALPHA_AMPLITUDE = 0.05;

export interface ConfettiOptions {
  timePos: number;
  y: number;
  size?: number;
  color?: string;
  alpha?: number;
  velocity?: number;
}

export class Confetti {
  public id: number;
  public timePos: number;
  public y: number;
  public baseSize: number;
  public color: string;
  public baseAlpha: number;
  public velocity: number;
  public birthTime: number;

  private static nextId = 0;

  constructor(options: ConfettiOptions, engineTime: number) {
    this.id = Confetti.nextId++;
    this.timePos = options.timePos;
    this.y = options.y;
    this.baseSize = options.size ?? 20;
    this.color = options.color ?? COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
    this.baseAlpha = options.alpha ?? 0.9;
    this.velocity = options.velocity ?? (0.5 + Math.random() * 1.0);
    this.birthTime = engineTime;
  }

  public getAge(engineTime: number): number {
    return engineTime - this.birthTime;
  }

  public getSpeedMultiplier(age: number): number {
    const seconds = age / 1000;
    if (seconds < 3) {
      return 0.5;
    } else if (seconds < 8) {
      return 1.0;
    } else if (seconds < 12) {
      const t = (seconds - 8) / 4;
      return 1.0 + t * 0.5;
    }
    return 1.5;
  }

  public getSize(engineTime: number): number {
    const age = this.getAge(engineTime);
    const phase = (age % BREATH_PERIOD) / BREATH_PERIOD;
    const breath = Math.sin(phase * Math.PI * 2) * BREATH_SIZE_AMPLITUDE;
    return this.baseSize + breath;
  }

  public getAlpha(engineTime: number): number {
    const age = this.getAge(engineTime);
    const fadeRatio = Math.min(1, Math.max(0, (age - CONFETTI_LIFETIME + 2000) / 2000));
    const phase = (age % BREATH_PERIOD) / BREATH_PERIOD;
    const breath = Math.sin(phase * Math.PI * 2) * BREATH_ALPHA_AMPLITUDE;
    return Math.max(0, (this.baseAlpha + breath) * (1 - fadeRatio));
  }

  public isExpired(engineTime: number): boolean {
    return this.getAge(engineTime) >= CONFETTI_LIFETIME;
  }

  public update(deltaTime: number, engineTime: number): void {
    const age = this.getAge(engineTime);
    const speedMul = this.getSpeedMultiplier(age);
    this.timePos += this.velocity * speedMul * (deltaTime / 1000);
  }
}

export class LightWave {
  public id: number;
  public timePos: number;
  public y: number;
  public startTime: number;
  public duration: number;
  public startRadius: number;
  public endRadius: number;
  public color: string;

  private static nextId = 0;

  constructor(timePos: number, y: number, color: string, engineTime: number) {
    this.id = LightWave.nextId++;
    this.timePos = timePos;
    this.y = y;
    this.startTime = engineTime;
    this.duration = 600;
    this.startRadius = 0;
    this.endRadius = 30;
    this.color = color;
  }

  public getProgress(engineTime: number): number {
    return Math.min(1, (engineTime - this.startTime) / this.duration);
  }

  public getRadius(engineTime: number): number {
    const t = this.getProgress(engineTime);
    return this.startRadius + (this.endRadius - this.startRadius) * t;
  }

  public getAlpha(engineTime: number): number {
    const t = this.getProgress(engineTime);
    return 0.8 * (1 - t);
  }

  public isExpired(engineTime: number): boolean {
    return engineTime - this.startTime >= this.duration;
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 255, g: 255, b: 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

export function mergeColors(c1: string, c2: string): string {
  const rgb1 = hexToRgb(c1);
  const rgb2 = hexToRgb(c2);
  return rgbToHex((rgb1.r + rgb2.r) / 2, (rgb1.g + rgb2.g) / 2, (rgb1.b + rgb2.b) / 2);
}

export class ConfettiManager {
  public confettiList: Confetti[] = [];
  public lightWaves: LightWave[] = [];

  public addConfetti(confetti: Confetti): void {
    this.confettiList.push(confetti);
    this.enforceLimit();
  }

  public addLightWave(wave: LightWave): void {
    this.lightWaves.push(wave);
  }

  private enforceLimit(): void {
    if (this.confettiList.length > MAX_CONFETTI) {
      this.confettiList.sort((a, b) => a.timePos - b.timePos);
      const excess = this.confettiList.length - MAX_CONFETTI;
      this.confettiList.splice(0, excess);
    }
  }

  public clearAll(): void {
    this.confettiList = [];
    this.lightWaves = [];
  }

  public update(deltaTime: number, engineTime: number, pixelsPerSecond: number): void {
    for (const c of this.confettiList) {
      c.update(deltaTime, engineTime);
    }

    this.detectMerges(engineTime, pixelsPerSecond);

    this.confettiList = this.confettiList.filter((c) => !c.isExpired(engineTime));
    this.lightWaves = this.lightWaves.filter((w) => !w.isExpired(engineTime));
  }

  private detectMerges(engineTime: number, pixelsPerSecond: number): void {
    if (this.confettiList.length < 2) return;

    this.confettiList.sort((a, b) => a.timePos - b.timePos);

    const toRemove: Set<number> = new Set();
    const toAdd: Confetti[] = [];
    const wavesToAdd: LightWave[] = [];

    const mergeTimeDist = MERGE_DISTANCE / pixelsPerSecond;

    for (let i = 0; i < this.confettiList.length - 1; i++) {
      if (toRemove.has(this.confettiList[i].id)) continue;

      for (let j = i + 1; j < this.confettiList.length; j++) {
        if (toRemove.has(this.confettiList[j].id)) continue;

        const a = this.confettiList[i];
        const b = this.confettiList[j];

        if (b.timePos - a.timePos > mergeTimeDist * 2) break;

        const dx = (a.timePos - b.timePos) * pixelsPerSecond;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < MERGE_DISTANCE) {
          const newTimePos = (a.timePos + b.timePos) / 2;
          const newY = (a.y + b.y) / 2;
          const newSize = Math.min(40, Math.max(14, (a.baseSize + b.baseSize) / 2));
          const newColor = mergeColors(a.color, b.color);
          const newAlpha = Math.max(a.baseAlpha, b.baseAlpha);
          const newVelocity = (a.velocity + b.velocity) / 2;

          const merged = new Confetti(
            {
              timePos: newTimePos,
              y: newY,
              size: newSize,
              color: newColor,
              alpha: newAlpha,
              velocity: newVelocity
            },
            engineTime
          );

          wavesToAdd.push(new LightWave(newTimePos, newY, newColor, engineTime));

          toRemove.add(a.id);
          toRemove.add(b.id);
          toAdd.push(merged);
          break;
        }
      }
    }

    if (toRemove.size > 0) {
      this.confettiList = this.confettiList.filter((c) => !toRemove.has(c.id));
      for (const c of toAdd) {
        this.confettiList.push(c);
      }
      for (const w of wavesToAdd) {
        this.lightWaves.push(w);
      }
      this.enforceLimit();
    }
  }
}
