import type { EcosystemType, DensityType, LayerType, PlantData } from './ecosystem';

export interface ControlCallbacks {
  onEcosystemChange: (type: EcosystemType) => void;
  onDensityChange: (density: DensityType) => void;
  onSunAngleChange: (angle: number) => void;
  onLayerOpacityChange: (layer: LayerType, opacity: number) => void;
  onResetView: () => void;
}

const LAYER_NAMES: Record<LayerType, string> = {
  tree: '乔木层',
  shrub: '灌木层',
  herb: '草本层'
};

export class UIController {
  private callbacks: ControlCallbacks;

  private ecosystemSelect: HTMLSelectElement;
  private densitySelect: HTMLSelectElement;
  private sunlightSlider: HTMLInputElement;
  private sunlightValue: HTMLElement;
  private treeOpacitySlider: HTMLInputElement;
  private shrubOpacitySlider: HTMLInputElement;
  private herbOpacitySlider: HTMLInputElement;
  private resetBtn: HTMLButtonElement;
  private infoCard: HTMLElement;
  private infoSpecies: HTMLElement;
  private infoHeight: HTMLElement;
  private infoCrown: HTMLElement;
  private infoLayer: HTMLElement;

  private treeCountEl: HTMLElement;
  private shrubCountEl: HTMLElement;
  private herbCountEl: HTMLElement;
  private treeBarEl: HTMLElement;
  private shrubBarEl: HTMLElement;
  private herbBarEl: HTMLElement;

  constructor(callbacks: ControlCallbacks) {
    this.callbacks = callbacks;

    this.ecosystemSelect = this.getElementById<HTMLSelectElement>('ecosystem-select');
    this.densitySelect = this.getElementById<HTMLSelectElement>('density-select');
    this.sunlightSlider = this.getElementById<HTMLInputElement>('sunlight-slider');
    this.sunlightValue = this.getElementById('sunlight-value');
    this.treeOpacitySlider = this.getElementById<HTMLInputElement>('tree-opacity');
    this.shrubOpacitySlider = this.getElementById<HTMLInputElement>('shrub-opacity');
    this.herbOpacitySlider = this.getElementById<HTMLInputElement>('herb-opacity');
    this.resetBtn = this.getElementById<HTMLButtonElement>('reset-btn');
    this.infoCard = this.getElementById('info-card');
    this.infoSpecies = this.getElementById('info-species');
    this.infoHeight = this.getElementById('info-height');
    this.infoCrown = this.getElementById('info-crown');
    this.infoLayer = this.getElementById('info-layer');

    this.treeCountEl = this.getElementById('tree-count');
    this.shrubCountEl = this.getElementById('shrub-count');
    this.herbCountEl = this.getElementById('herb-count');
    this.treeBarEl = this.getElementById('tree-bar');
    this.shrubBarEl = this.getElementById('shrub-bar');
    this.herbBarEl = this.getElementById('herb-bar');

    this.bindEvents();
  }

  private getElementById<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Element with id "${id}" not found`);
    return el as T;
  }

  private bindEvents(): void {
    this.ecosystemSelect.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value as EcosystemType;
      this.callbacks.onEcosystemChange(value);
    });

    this.densitySelect.addEventListener('change', (e) => {
      const value = (e.target as HTMLSelectElement).value as DensityType;
      this.callbacks.onDensityChange(value);
    });

    this.sunlightSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.sunlightValue.textContent = `${value}°`;
      this.callbacks.onSunAngleChange(value);
    });

    const bindOpacity = (
      slider: HTMLInputElement,
      layer: LayerType
    ) => {
      slider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.callbacks.onLayerOpacityChange(layer, value);
      });
    };

    bindOpacity(this.treeOpacitySlider, 'tree');
    bindOpacity(this.shrubOpacitySlider, 'shrub');
    bindOpacity(this.herbOpacitySlider, 'herb');

    this.resetBtn.addEventListener('click', () => {
      this.callbacks.onResetView();
    });
  }

  public showPlantInfo(plant: PlantData | null): void {
    if (!plant) {
      this.infoCard.classList.remove('visible');
      return;
    }

    this.infoSpecies.textContent = plant.species;
    this.infoHeight.textContent = `${plant.height.toFixed(2)} m`;
    this.infoCrown.textContent = `${plant.crownDiameter.toFixed(2)} m`;
    this.infoLayer.textContent = LAYER_NAMES[plant.layer];
    this.infoCard.classList.add('visible');
  }

  public updateStats(stats: {
    treeCount: number;
    shrubCount: number;
    herbCount: number;
    totalCount: number;
  }): void {
    const { treeCount, shrubCount, herbCount, totalCount } = stats;

    this.treeCountEl.textContent = treeCount.toString();
    this.shrubCountEl.textContent = shrubCount.toString();
    this.herbCountEl.textContent = herbCount.toString();

    if (totalCount > 0) {
      this.treeBarEl.style.width = `${(treeCount / totalCount) * 100}%`;
      this.shrubBarEl.style.width = `${(shrubCount / totalCount) * 100}%`;
      this.herbBarEl.style.width = `${(herbCount / totalCount) * 100}%`;
    } else {
      this.treeBarEl.style.width = '0%';
      this.shrubBarEl.style.width = '0%';
      this.herbBarEl.style.width = '0%';
    }
  }

  public getCurrentEcosystem(): EcosystemType {
    return this.ecosystemSelect.value as EcosystemType;
  }

  public getCurrentDensity(): DensityType {
    return this.densitySelect.value as DensityType;
  }

  public getCurrentSunAngle(): number {
    return parseFloat(this.sunlightSlider.value);
  }
}
