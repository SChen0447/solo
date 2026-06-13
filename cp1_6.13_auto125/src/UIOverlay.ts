import { LayerData, GlobalSettings } from './LayerManager';

export interface UICallbacks {
  onReset: () => void;
  onDepthChange: (depth: number) => void;
  onOpacityChange: (opacity: number) => void;
  onBrightnessChange: (brightness: number) => void;
}

export class UIOverlay {
  private infoPanel: HTMLElement;
  private topResetBtn: HTMLElement;
  private panelResetBtn: HTMLElement;
  private depthSlider: HTMLInputElement;
  private opacitySlider: HTMLInputElement;
  private brightnessSlider: HTMLInputElement;
  private mineralLabelsContainer: HTMLElement;
  private callbacks: UICallbacks;
  private mineralLabels: HTMLElement[] = [];

  private readonly PANEL_OFFSET = 15;

  constructor(callbacks: UICallbacks) {
    this.callbacks = callbacks;

    const infoPanelEl = document.getElementById('info-panel');
    const topResetBtnEl = document.getElementById('top-reset-btn');
    const panelResetBtnEl = document.getElementById('panel-reset-btn');
    const depthSliderEl = document.getElementById('depth-slider');
    const opacitySliderEl = document.getElementById('opacity-slider');
    const brightnessSliderEl = document.getElementById('brightness-slider');
    const overlayEl = document.getElementById('ui-overlay');

    if (!infoPanelEl || !topResetBtnEl || !panelResetBtnEl ||
        !depthSliderEl || !opacitySliderEl || !brightnessSliderEl || !overlayEl) {
      throw new Error('UI elements not found');
    }

    this.infoPanel = infoPanelEl;
    this.topResetBtn = topResetBtnEl;
    this.panelResetBtn = panelResetBtnEl;
    this.depthSlider = depthSliderEl as HTMLInputElement;
    this.opacitySlider = opacitySliderEl as HTMLInputElement;
    this.brightnessSlider = brightnessSliderEl as HTMLInputElement;
    this.mineralLabelsContainer = overlayEl;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.topResetBtn.addEventListener('click', this.handleReset);
    this.panelResetBtn.addEventListener('click', this.handleReset);

    this.depthSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.callbacks.onDepthChange(value);
    });

    this.opacitySlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.callbacks.onOpacityChange(value);
    });

    this.brightnessSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.callbacks.onBrightnessChange(value);
    });

    document.addEventListener('mousemove', this.handleMouseMove);
  }

  private handleReset = (): void => {
    this.depthSlider.value = '0';
    this.opacitySlider.value = '1';
    this.brightnessSlider.value = '1';
    this.callbacks.onReset();
  };

  private handleMouseMove = (event: MouseEvent): void => {
    if (this.infoPanel.classList.contains('visible')) {
      this.updatePanelPosition(event.clientX, event.clientY);
    }
  };

  private updatePanelPosition(mouseX: number, mouseY: number): void {
    const panelWidth = this.infoPanel.offsetWidth;
    const panelHeight = this.infoPanel.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = mouseX + this.PANEL_OFFSET;
    let y = mouseY + this.PANEL_OFFSET;

    if (x + panelWidth > viewportWidth - 10) {
      x = mouseX - panelWidth - this.PANEL_OFFSET;
    }
    if (y + panelHeight > viewportHeight - 10) {
      y = mouseY - panelHeight - this.PANEL_OFFSET;
    }

    this.infoPanel.style.left = `${Math.max(10, x)}px`;
    this.infoPanel.style.top = `${Math.max(10, y)}px`;
  }

  public showLayerInfo(layer: LayerData): void {
    const mineralsHtml = layer.minerals
      .map(m => `<span class="mineral-tag">${m}</span>`)
      .join('');

    const ageText = this.formatAge(layer.age);
    const depthText = `${layer.depthStart.toFixed(1)}m - ${layer.depthEnd.toFixed(1)}m`;

    this.infoPanel.innerHTML = `
      <h3>${layer.name}</h3>
      <div class="info-row">
        <span class="info-label">深度范围:</span>${depthText}
      </div>
      <div class="info-row">
        <span class="info-label">地质年代:</span>${ageText}
      </div>
      <div class="info-row">
        <span class="info-label">矿物成分:</span>
        <div class="minerals">${mineralsHtml}</div>
      </div>
    `;

    this.infoPanel.classList.add('visible');
  }

  public hideLayerInfo(): void {
    this.infoPanel.classList.remove('visible');
  }

  private formatAge(ageInMillionYears: number): string {
    if (ageInMillionYears < 1) {
      const years = ageInMillionYears * 1000000;
      if (years < 10000) {
        return `${Math.round(years)}年前`;
      }
      return `${(years / 10000).toFixed(1)}万年前`;
    }
    return `${ageInMillionYears.toFixed(1)}亿年前`;
  }

  public updateSliders(settings: GlobalSettings): void {
    this.depthSlider.value = settings.depth.toString();
    this.opacitySlider.value = settings.opacity.toString();
    this.brightnessSlider.value = settings.brightness.toString();
  }

  public createMineralLabels(
    layers: LayerData[],
    positions: Map<number, { x: number; y: number }[]>
  ): void {
    this.clearMineralLabels();

    layers.forEach((layer) => {
      const labelPositions = positions.get(layer.id) || [];
      labelPositions.forEach((pos, index) => {
        if (index < layer.minerals.length) {
          const mineral = layer.minerals[index];
          const label = document.createElement('div');
          label.className = 'mineral-label';
          label.style.backgroundColor = layer.colors[0];
          label.style.border = `1px solid ${layer.colors[layer.colors.length - 1]}`;
          label.style.left = `${pos.x}px`;
          label.style.top = `${pos.y}px`;
          label.textContent = mineral.substring(0, 1);
          label.title = mineral;
          label.dataset.mineral = mineral;
          label.dataset.layerId = layer.id.toString();
          this.mineralLabelsContainer.appendChild(label);
          this.mineralLabels.push(label);
        }
      });
    });
  }

  public updateMineralLabelPositions(
    positions: Map<number, { x: number; y: number }[]>
  ): void {
    positions.forEach((posList, layerId) => {
      this.mineralLabels
        .filter(l => l.dataset.layerId === layerId.toString())
        .forEach((label, index) => {
          if (posList[index]) {
            label.style.left = `${posList[index].x}px`;
            label.style.top = `${posList[index].y}px`;
          }
        });
    });
  }

  public clearMineralLabels(): void {
    this.mineralLabels.forEach(label => label.remove());
    this.mineralLabels = [];
  }

  public dispose(): void {
    this.topResetBtn.removeEventListener('click', this.handleReset);
    this.panelResetBtn.removeEventListener('click', this.handleReset);
    document.removeEventListener('mousemove', this.handleMouseMove);
    this.clearMineralLabels();
  }
}
