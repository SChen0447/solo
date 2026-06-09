import p5 from 'p5';
import { SoundManager, SoundWaveConfig } from './sound';

export interface UIState {
  energy: number;
  currentKey: string;
  currentFreq: number;
  currentColor: string;
}

export class UIManager {
  private p: p5;
  private energyBar: HTMLElement | null;
  private energyFill: HTMLElement | null;
  private colorPreview: HTMLElement | null;
  private freqValue: HTMLElement | null;
  private freqKey: HTMLElement | null;

  public onKeyPress: ((key: string) => void) | null = null;

  constructor(p: p5) {
    this.p = p;
    this.energyBar = document.getElementById('energy-bar');
    this.energyFill = document.getElementById('energy-fill');
    this.colorPreview = document.getElementById('color-preview');
    this.freqValue = document.getElementById('freq-value');
    this.freqKey = document.getElementById('freq-key');
  }

  setupKeyListener(): void {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toUpperCase();
      if (key.length === 1 && key >= 'A' && key <= 'Z') {
        if (this.onKeyPress) {
          this.onKeyPress(key);
        }
      }
    });
  }

  updateEnergy(energy: number): void {
    if (this.energyFill) {
      this.energyFill.style.width = `${Math.min(energy, 100)}%`;
    }
    if (this.energyBar) {
      if (energy >= 100) {
        this.energyBar.classList.add('flashing', 'glowing');
      } else {
        this.energyBar.classList.remove('flashing', 'glowing');
      }
    }
  }

  updateCurrentSound(config: SoundWaveConfig): void {
    if (this.freqValue) {
      this.freqValue.textContent = `${Math.round(config.frequency)} Hz`;
    }
    if (this.freqKey) {
      this.freqKey.textContent = `按键 ${config.key}`;
    }
    if (this.colorPreview) {
      const r = this.p.red(config.color);
      const g = this.p.green(config.color);
      const b = this.p.blue(config.color);
      this.colorPreview.style.background = `rgb(${r}, ${g}, ${b})`;
      this.colorPreview.style.boxShadow = `0 0 20px rgba(${r}, ${g}, ${b}, 0.6)`;
    }
  }

  colorToHex(color: p5.Color): string {
    const r = Math.floor(this.p.red(color));
    const g = Math.floor(this.p.green(color));
    const b = Math.floor(this.p.blue(color));
    return `rgb(${r}, ${g}, ${b})`;
  }
}

export class FullscreenPulse {
  public x: number;
  public y: number;
  public radius: number;
  public maxRadius: number;
  public life: number;
  public maxLife: number;
  public color: p5.Color;
  public active: boolean;
  public hue: number;

  private p: p5;

  constructor(p: p5, x: number, y: number, hue: number) {
    this.p = p;
    this.x = x;
    this.y = y;
    this.radius = 0;
    this.maxRadius = Math.max(p.width, p.height) * 1.5;
    this.life = 0;
    this.maxLife = 1.5;
    this.hue = hue;
    this.color = p.color(
      p.hue(p.color(`hsl(${hue}, 100%, 60%)`)),
      100,
      100,
      200
    );
    this.active = true;
  }

  update(dt: number): void {
    if (!this.active) return;
    this.life += dt;
    const progress = Math.min(this.life / this.maxLife, 1);
    this.radius = this.maxRadius * progress;
    if (this.life >= this.maxLife) {
      this.active = false;
    }
  }

  draw(): void {
    if (!this.active) return;
    const progress = this.life / this.maxLife;
    const alpha = (1 - progress) * 0.6;
    const p = this.p;

    p.push();
    p.colorMode(p.HSB, 360, 100, 100, 1);
    for (let i = 0; i < 5; i++) {
      const ringRadius = this.radius - i * 30;
      if (ringRadius > 0) {
        const ringHue = (this.hue + i * 30) % 360;
        p.noFill();
        p.stroke(ringHue, 100, 100, alpha * (1 - i * 0.15));
        p.strokeWeight(8 - i * 1.5);
        p.ellipse(this.x, this.y, ringRadius * 2, ringRadius * 2);
      }
    }
    p.pop();
  }
}
