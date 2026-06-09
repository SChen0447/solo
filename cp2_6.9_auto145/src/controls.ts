import { SpaceScene, OrbitFilter } from './scene';

export class ControlPanel {
  private scene: SpaceScene;
  private debrisCountSlider: HTMLInputElement;
  private debrisCountValue: HTMLSpanElement;
  private orbitFilterSelect: HTMLSelectElement;
  private collisionAlertToggle: HTMLInputElement;
  private statLow: HTMLElement;
  private statMedium: HTMLElement;
  private statHigh: HTMLElement;

  constructor(scene: SpaceScene) {
    this.scene = scene;

    this.debrisCountSlider = document.getElementById('debris-count') as HTMLInputElement;
    this.debrisCountValue = document.getElementById('debris-count-value') as HTMLSpanElement;
    this.orbitFilterSelect = document.getElementById('orbit-filter') as HTMLSelectElement;
    this.collisionAlertToggle = document.getElementById('collision-alert') as HTMLInputElement;
    this.statLow = document.getElementById('stat-low')!;
    this.statMedium = document.getElementById('stat-medium')!;
    this.statHigh = document.getElementById('stat-high')!;

    this.bindEvents();
    this.updateStatsDisplay();

    this.scene.onStatsChange = (low, medium, high) => {
      this.updateStatsDisplay(low, medium, high);
    };
  }

  private bindEvents(): void {
    this.debrisCountSlider.addEventListener('input', () => {
      const count = parseInt(this.debrisCountSlider.value, 10);
      this.debrisCountValue.textContent = count.toString();
      this.scene.setDebrisCount(count);
    });

    this.orbitFilterSelect.addEventListener('change', () => {
      const filter = this.orbitFilterSelect.value as OrbitFilter;
      this.scene.setOrbitFilter(filter);
    });

    this.collisionAlertToggle.addEventListener('change', () => {
      this.scene.setCollisionAlertEnabled(this.collisionAlertToggle.checked);
    });
  }

  public updateStatsDisplay(low?: number, medium?: number, high?: number): void {
    if (low === undefined || medium === undefined || high === undefined) {
      let l = 0, m = 0, h = 0;
      for (const d of this.scene.debris) {
        if (!d.mesh.visible && this.scene.orbitFilter !== 'all') continue;
        if (d.orbitType === 'low') l++;
        else if (d.orbitType === 'medium') m++;
        else h++;
      }
      this.statLow.textContent = l.toString();
      this.statMedium.textContent = m.toString();
      this.statHigh.textContent = h.toString();
    } else {
      this.statLow.textContent = low.toString();
      this.statMedium.textContent = medium.toString();
      this.statHigh.textContent = high.toString();
    }
  }
}
