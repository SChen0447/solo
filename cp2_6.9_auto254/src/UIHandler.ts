import type { Planet, PlanetNetwork } from './PlanetNetwork';
import type { DroneManager } from './DroneManager';

export interface GameState {
  currency: number;
  cargoDelivered: number;
  progress: number;
  selectedStartPlanetId: string | null;
  selectedEndPlanetId: string | null;
}

export class UIHandler {
  private startSelect: HTMLSelectElement;
  private endSelect: HTMLSelectElement;
  private btnDispatch: HTMLButtonElement;
  private btnBuildGate: HTMLButtonElement;
  private btnUpgradeSpeed: HTMLButtonElement;
  private btnAddDrone: HTMLButtonElement;

  private currencyValue: HTMLElement;
  private droneCount: HTMLElement;
  private cargoCount: HTMLElement;
  private progressFill: HTMLElement;
  private progressPercent: HTMLElement;
  private currencyContainer: HTMLElement;

  private tooltip: HTMLElement;
  private canvas: HTMLCanvasElement;

  onDispatch?: () => void;
  onBuildGate?: () => void;
  onUpgradeSpeed?: () => void;
  onAddDrone?: () => void;
  onPlanetHover?: (planet: Planet | null, x: number, y: number) => void;

  private GATE_COST = 50;
  private SPEED_COST = 30;
  private DRONE_COST = 80;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.startSelect = document.getElementById('start-planet') as HTMLSelectElement;
    this.endSelect = document.getElementById('end-planet') as HTMLSelectElement;
    this.btnDispatch = document.getElementById('btn-dispatch') as HTMLButtonElement;
    this.btnBuildGate = document.getElementById('btn-build-gate') as HTMLButtonElement;
    this.btnUpgradeSpeed = document.getElementById('btn-upgrade-speed') as HTMLButtonElement;
    this.btnAddDrone = document.getElementById('btn-add-drone') as HTMLButtonElement;

    this.currencyValue = document.getElementById('currency-value') as HTMLElement;
    this.droneCount = document.getElementById('drone-count') as HTMLElement;
    this.cargoCount = document.getElementById('cargo-count') as HTMLElement;
    this.progressFill = document.getElementById('progress-fill') as HTMLElement;
    this.progressPercent = document.getElementById('progress-percent') as HTMLElement;
    this.currencyContainer = document.getElementById('currency-container') as HTMLElement;

    this.tooltip = document.getElementById('tooltip') as HTMLElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.btnDispatch.addEventListener('click', () => this.onDispatch?.());
    this.btnBuildGate.addEventListener('click', () => this.onBuildGate?.());
    this.btnUpgradeSpeed.addEventListener('click', () => this.onUpgradeSpeed?.());
    this.btnAddDrone.addEventListener('click', () => this.onAddDrone?.());

    this.startSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      (this as any).selectedStartPlanetId = target.value || null;
    });

    this.endSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      (this as any).selectedEndPlanetId = target.value || null;
    });

    this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => {
      this.hideTooltip();
      this.onPlanetHover?.(null, 0, 0);
    });
  }

  private handleCanvasMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    this.onPlanetHover?.(null, x, y);
  }

  populatePlanetSelectors(planets: Planet[], centralId?: string): void {
    const options = planets
      .filter(p => !p.isCentral)
      .map(p => `<option value="${p.id}">${p.name}</option>`)
      .join('');

    this.startSelect.innerHTML = `<option value="">-- 选择起点 --</option>${options}`;
    this.endSelect.innerHTML = `<option value="">-- 选择终点 --</option>${options}`;
  }

  getSelectedStartId(): string | null {
    return this.startSelect.value || null;
  }

  getSelectedEndId(): string | null {
    return this.endSelect.value || null;
  }

  updateResourceBar(
    currency: number,
    droneManager: DroneManager,
    cargoDelivered: number,
    progress: number
  ): void {
    this.currencyValue.textContent = Math.floor(currency).toString();

    this.droneCount.textContent = `${droneManager.getDroneCount()} / ${droneManager.getMaxDroneCount()}`;
    this.cargoCount.textContent = cargoDelivered.toString();

    const pct = Math.min(100, Math.max(0, progress));
    this.progressFill.style.width = `${pct}%`;
    this.progressPercent.textContent = `${pct.toFixed(1)}%`;

    this.updateButtonStates(currency, droneManager);
  }

  private updateButtonStates(currency: number, droneManager: DroneManager): void {
    const startId = this.getSelectedStartId();
    const endId = this.getSelectedEndId();
    this.btnDispatch.disabled = !startId || !endId || startId === endId;

    this.btnBuildGate.disabled = currency < this.GATE_COST;

    const canUpgrade = currency >= this.SPEED_COST && droneManager.canUpgradeSpeed();
    this.btnUpgradeSpeed.disabled = !canUpgrade;
    if (!droneManager.canUpgradeSpeed()) {
      const lvl = droneManager.getSpeedUpgradeLevel();
      const max = droneManager.getMaxSpeedUpgrades();
      this.btnUpgradeSpeed.innerHTML = `⚡ 已满级 (${lvl}/${max})`;
    } else {
      this.btnUpgradeSpeed.innerHTML = `⚡ 升级速度 <span class="btn-price">💰 ${this.SPEED_COST}</span>`;
    }

    const canAddDrone = currency >= this.DRONE_COST && droneManager.canAddDrone();
    this.btnAddDrone.disabled = !canAddDrone;
    if (!droneManager.canAddDrone()) {
      this.btnAddDrone.innerHTML = `🛸 已达上限 (${droneManager.getDroneCount()}/${droneManager.getMaxDroneCount()})`;
    } else {
      this.btnAddDrone.innerHTML = `🛸 增加无人机 <span class="btn-price">💰 ${this.DRONE_COST}</span>`;
    }
  }

  showTooltip(planet: Planet, screenX: number, screenY: number): void {
    this.tooltip.innerHTML = `
      <div class="planet-name">${planet.name}</div>
      <div class="planet-info">积压: ${planet.cargoBacklog}/${planet.maxBacklog}</div>
    `;
    this.tooltip.style.left = `${screenX + 15}px`;
    this.tooltip.style.top = `${screenY + 15}px`;
    this.tooltip.classList.add('visible');
  }

  hideTooltip(): void {
    this.tooltip.classList.remove('visible');
  }

  spawnCurrencyPopup(amount: number): void {
    const popup = document.createElement('div');
    popup.className = 'currency-popup';
    popup.textContent = `+${amount}`;
    const rect = this.currencyContainer.getBoundingClientRect();
    popup.style.left = `${rect.width - 20}px`;
    popup.style.top = '0px';
    this.currencyContainer.appendChild(popup);
    setTimeout(() => popup.remove(), 1000);
  }
}
