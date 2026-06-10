import { Terrain } from './terrain';
import { Water } from './water';
import { Particles } from './particles';

export class UIController {
  private terrain: Terrain;
  private water: Water;
  private particles: Particles;
  private elevationSlider: HTMLInputElement;
  private waterSlider: HTMLInputElement;
  private particleSlider: HTMLInputElement;
  private elevationValue: HTMLElement;
  private waterValue: HTMLElement;
  private particleValue: HTMLElement;
  private randomizeBtn: HTMLButtonElement;
  private onRandomize: (() => Promise<void>) | null = null;

  constructor(terrain: Terrain, water: Water, particles: Particles) {
    this.terrain = terrain;
    this.water = water;
    this.particles = particles;

    this.elevationSlider = document.getElementById('elevation-slider') as HTMLInputElement;
    this.waterSlider = document.getElementById('water-slider') as HTMLInputElement;
    this.particleSlider = document.getElementById('particle-slider') as HTMLInputElement;
    this.elevationValue = document.getElementById('elevation-value') as HTMLElement;
    this.waterValue = document.getElementById('water-value') as HTMLElement;
    this.particleValue = document.getElementById('particle-value') as HTMLElement;
    this.randomizeBtn = document.getElementById('randomize-btn') as HTMLButtonElement;

    this.bindEvents();
  }

  public setRandomizeCallback(callback: () => Promise<void>): void {
    this.onRandomize = callback;
  }

  private bindEvents(): void {
    this.elevationSlider.addEventListener('input', () => {
      const value = parseFloat(this.elevationSlider.value);
      this.elevationValue.textContent = value.toFixed(1);
      this.terrain.setElevation(value);
    });

    this.waterSlider.addEventListener('input', () => {
      const value = parseFloat(this.waterSlider.value);
      this.waterValue.textContent = value.toString();
      this.water.setIntensity(value);
    });

    this.particleSlider.addEventListener('input', () => {
      const value = parseFloat(this.particleSlider.value);
      this.particleValue.textContent = value.toString();
      this.particles.setDensity(value);
    });

    this.randomizeBtn.addEventListener('click', (e) => {
      this.createRipple(e);
      if (this.onRandomize) {
        this.onRandomize();
      }
    });
  }

  private createRipple(e: MouseEvent): void {
    const btn = this.randomizeBtn;
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (x - size / 2) + 'px';
    ripple.style.top = (y - size / 2) + 'px';

    btn.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 300);
  }
}
