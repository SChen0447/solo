import { PlateManager } from '../core/PlateManager';
import { Plate } from '../core/Plate';
import type { PlateSettings } from '../types';

interface UIState {
  speed2x: boolean;
  speed5x: boolean;
}

export class UIModule {
  private plateManager: PlateManager;
  private sliderSpeed: HTMLInputElement;
  private sliderUplift: HTMLInputElement;
  private sliderOpacity: HTMLInputElement;
  private valSpeed: HTMLElement;
  private valUplift: HTMLElement;
  private valOpacity: HTMLElement;
  private btnSpeed2: HTMLButtonElement;
  private btnSpeed5: HTMLButtonElement;
  private statTime: HTMLElement;
  private statCollisions: HTMLElement;
  private plateInfo: HTMLElement;
  private plateName: HTMLElement;
  private plateSpeed: HTMLElement;
  private plateCollisions: HTMLElement;

  private state: UIState;

  constructor(plateManager: PlateManager) {
    this.plateManager = plateManager;
    this.state = { speed2x: false, speed5x: false };

    this.sliderSpeed = document.getElementById('slider-speed') as HTMLInputElement;
    this.sliderUplift = document.getElementById('slider-uplift') as HTMLInputElement;
    this.sliderOpacity = document.getElementById('slider-opacity') as HTMLInputElement;
    this.valSpeed = document.getElementById('val-speed')!;
    this.valUplift = document.getElementById('val-uplift')!;
    this.valOpacity = document.getElementById('val-opacity')!;
    this.btnSpeed2 = document.getElementById('btn-speed-2') as HTMLButtonElement;
    this.btnSpeed5 = document.getElementById('btn-speed-5') as HTMLButtonElement;
    this.statTime = document.getElementById('stat-time')!;
    this.statCollisions = document.getElementById('stat-collisions')!;
    this.plateInfo = document.getElementById('plate-info')!;
    this.plateName = document.getElementById('plate-name')!;
    this.plateSpeed = document.getElementById('plate-speed')!;
    this.plateCollisions = document.getElementById('plate-collisions')!;

    this.bindEvents();
    this.syncFromManager();
  }

  private bindEvents(): void {
    this.sliderSpeed.addEventListener('input', () => {
      const value = parseFloat(this.sliderSpeed.value);
      this.valSpeed.textContent = value.toFixed(3);
      this.plateManager.updateSettings({ driftSpeed: value });
    });

    this.sliderUplift.addEventListener('input', () => {
      const value = parseFloat(this.sliderUplift.value);
      this.valUplift.textContent = value.toFixed(2);
      this.plateManager.updateSettings({ upliftAmount: value });
    });

    this.sliderOpacity.addEventListener('input', () => {
      const value = parseFloat(this.sliderOpacity.value);
      this.valOpacity.textContent = value.toFixed(2);
      this.plateManager.updateSettings({ opacity: value });
    });

    this.btnSpeed2.addEventListener('click', () => {
      this.state.speed2x = !this.state.speed2x;
      if (this.state.speed2x) {
        this.state.speed5x = false;
        this.btnSpeed5.classList.remove('active');
      }
      this.btnSpeed2.classList.toggle('active', this.state.speed2x);
      this.applyTimeMultiplier();
    });

    this.btnSpeed5.addEventListener('click', () => {
      this.state.speed5x = !this.state.speed5x;
      if (this.state.speed5x) {
        this.state.speed2x = false;
        this.btnSpeed2.classList.remove('active');
      }
      this.btnSpeed5.classList.toggle('active', this.state.speed5x);
      this.applyTimeMultiplier();
    });

    this.plateManager.onSelect((plate: Plate | null) => {
      this.showPlateInfo(plate);
    });
  }

  private applyTimeMultiplier(): void {
    let mult = 1;
    if (this.state.speed2x) mult = 2;
    if (this.state.speed5x) mult = 5;
    this.plateManager.setTimeMultiplier(mult);
  }

  private syncFromManager(): void {
    const settings: PlateSettings = this.plateManager.getSettings();
    this.sliderSpeed.value = settings.driftSpeed.toString();
    this.sliderUplift.value = settings.upliftAmount.toString();
    this.sliderOpacity.value = settings.opacity.toString();
    this.valSpeed.textContent = settings.driftSpeed.toFixed(3);
    this.valUplift.textContent = settings.upliftAmount.toFixed(2);
    this.valOpacity.textContent = settings.opacity.toFixed(2);
  }

  private showPlateInfo(plate: Plate | null): void {
    if (!plate) {
      this.plateInfo.classList.remove('visible');
      return;
    }
    const info = plate.getInfo(this.plateManager.getSettings().driftSpeed);
    this.plateName.textContent = info.name;
    this.plateSpeed.textContent = info.currentSpeed.toFixed(4);
    this.plateCollisions.textContent = info.collisionCount.toString();
    this.plateInfo.classList.add('visible');
  }

  public updateStats(): void {
    this.statTime.textContent = this.plateManager.getSimulationTime().toFixed(1);
    this.statCollisions.textContent = this.plateManager.getTotalCollisions().toString();

    const selected = this.plateManager.getSelectedPlate();
    if (selected) {
      const info = selected.getInfo(this.plateManager.getSettings().driftSpeed);
      this.plateSpeed.textContent = info.currentSpeed.toFixed(4);
      this.plateCollisions.textContent = info.collisionCount.toString();
    }
  }
}
