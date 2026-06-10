import p5 from 'p5';
import { RGB, lerpColor, rgbToString, THEMES } from './types';

export type KeyState = 'idle' | 'pressed' | 'releasing' | 'flashing';

export class WebKey {
  x: number;
  y: number;
  radius: number;
  index: number;
  isEdge: boolean;

  private state: KeyState = 'idle';
  private animTime = 0;
  private animDuration = 0.3;
  private flashTime = 0;
  private flashDuration = 0.1;
  private baseColor: RGB;
  private targetColor: RGB;
  private colorLerp = 1;
  private colorLerpDuration = 1.2;
  private colorLerpTime = 1.2;

  glowRadius = 8;
  glowAlpha = 0.3;

  constructor(
    x: number,
    y: number,
    index: number,
    isEdge: boolean,
    themeName: string,
    colorT: number
  ) {
    this.x = x;
    this.y = y;
    this.radius = 14;
    this.index = index;
    this.isEdge = isEdge;
    const theme = THEMES[themeName];
    this.baseColor = lerpColor(theme.keyStart, theme.keyEnd, colorT);
    this.targetColor = { ...this.baseColor };
  }

  setTheme(themeName: string, colorT: number): void {
    const theme = THEMES[themeName];
    this.baseColor = lerpColor(theme.keyStart, theme.keyEnd, colorT);
    this.colorLerp = 0;
    this.colorLerpTime = 0;
  }

  press(): void {
    if (this.state === 'idle' || this.state === 'flashing') {
      this.state = 'pressed';
      this.animTime = 0;
    }
  }

  flash(): void {
    this.state = 'flashing';
    this.flashTime = 0;
  }

  hitTest(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }

  update(dt: number): void {
    if (this.colorLerpTime < this.colorLerpDuration) {
      this.colorLerpTime += dt;
      this.colorLerp = Math.min(1, this.colorLerpTime / this.colorLerpDuration);
    }

    if (this.state === 'pressed') {
      this.animTime += dt;
      if (this.animTime >= this.animDuration) {
        this.state = 'idle';
        this.animTime = 0;
      }
    }

    if (this.state === 'flashing') {
      this.flashTime += dt;
      if (this.flashTime >= this.flashDuration) {
        this.state = 'idle';
        this.flashTime = 0;
      }
    }
  }

  getCurrentColor(): RGB {
    return lerpColor(this.targetColor, this.baseColor, this.colorLerp);
  }

  getScale(): number {
    if (this.state === 'pressed') {
      const t = this.animTime / this.animDuration;
      const eased = 1 - Math.pow(1 - t, 3);
      if (t < 0.5) {
        return 1 - 0.3 * (t / 0.5);
      } else {
        return 0.7 + 0.3 * ((t - 0.5) / 0.5) * eased;
      }
    }
    if (this.state === 'flashing') {
      return 1.1;
    }
    return 1;
  }

  draw(p: p5): void {
    const color = this.getCurrentColor();
    const scale = this.getScale();
    const r = this.radius * scale;

    p.push();
    p.drawingContext.shadowBlur = this.glowRadius * 2;
    p.drawingContext.shadowColor = rgbToString(color, this.glowAlpha);

    p.noStroke();
    p.fill(color.r, color.g, color.b, 220);
    p.ellipse(this.x, this.y, r * 2, r * 2);

    p.drawingContext.shadowBlur = 0;
    p.fill(color.r, color.g, color.b, 80);
    p.ellipse(this.x, this.y, r * 2.5, r * 2.5);
    p.pop();
  }
}
