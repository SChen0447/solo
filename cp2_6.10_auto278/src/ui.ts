import { LightController, ArtificialLightConfig, NaturalLightConfig, kelvinToRGB } from './LightController';
import { HouseManager } from './HouseManager';

type EasingFunction = (t: number) => number;

const easeOut: EasingFunction = (t) => 1 - Math.pow(1 - t, 3);

export interface UIControllerOptions {
  panelContainer: HTMLElement;
  heatmapCanvas: HTMLCanvasElement;
  lightController: LightController;
  houseManager: HouseManager;
  onLightClick?: (lightId: string, screenX: number, screenY: number) => void;
  onLightHover?: (lightId: string | null) => void;
}

interface AnimatedValue {
  current: number;
  target: number;
  startTime: number;
  duration: number;
}

export class UIController {
  private panelContainer: HTMLElement;
  private heatmapCanvas: HTMLCanvasElement;
  private heatmapCtx: CanvasRenderingContext2D;
  private lightController: LightController;
  private houseManager: HouseManager;
  private animatedValues: Map<string, AnimatedValue>;
  private lastHeatmapUpdate: number = 0;
  private readonly heatmapInterval: number = 100;
  private collapsedCards: Set<string>;
  private onLightClick?: (lightId: string, screenX: number, screenY: number) => void;
  private onLightHover?: (lightId: string | null) => void;
  private heatmapData: number[] = [];
  private readonly GRID_SIZE = 20;

  constructor(options: UIControllerOptions) {
    this.panelContainer = options.panelContainer;
    this.heatmapCanvas = options.heatmapCanvas;
    this.heatmapCtx = this.heatmapCanvas.getContext('2d')!;
    this.lightController = options.lightController;
    this.houseManager = options.houseManager;
    this.animatedValues = new Map();
    this.collapsedCards = new Set();
    this.onLightClick = options.onLightClick;
    this.onLightHover = options.onLightHover;

    this.render();
    this.lightController.addListener(() => this.updateHeatmap(true));
    this.updateHeatmap(true);
  }

  private render(): void {
    this.panelContainer.innerHTML = '';

    this.createCard('natural', '自然光', this.renderNaturalControls());
    this.createCard('artificial', '人工光', this.renderArtificialControls());
    this.createCard('heatmap', '热力图设置', this.renderHeatmapControls(), true);
  }

  private createCard(id: string, title: string, content: HTMLElement, collapsed: boolean = false): void {
    const card = document.createElement('div');
    card.className = 'control-card';

    const header = document.createElement('div');
    header.className = 'card-header';
    if (collapsed || this.collapsedCards.has(id)) {
      header.classList.add('collapsed');
      this.collapsedCards.add(id);
    }

    header.innerHTML = `
      <h2>${title}</h2>
      <span class="chevron">▼</span>
    `;

    const body = document.createElement('div');
    body.className = 'card-body';
    if (this.collapsedCards.has(id)) {
      body.classList.add('collapsed');
    }
    body.appendChild(content);

    header.addEventListener('click', () => {
      if (this.collapsedCards.has(id)) {
        this.collapsedCards.delete(id);
        header.classList.remove('collapsed');
        body.classList.remove('collapsed');
      } else {
        this.collapsedCards.add(id);
        header.classList.add('collapsed');
        body.classList.add('collapsed');
      }
    });

    card.appendChild(header);
    card.appendChild(body);
    this.panelContainer.appendChild(card);
  }

  private renderNaturalControls(): HTMLElement {
    const container = document.createElement('div');
    const naturalLight = this.lightController.getNaturalLight();

    const azimuthGroup = this.createSlider(
      '太阳方位角',
      naturalLight.azimuth,
      0,
      360,
      1,
      '°',
      (value) => {
        this.animateValue('natural_azimuth', value, (v) => {
          this.lightController.setNaturalLight({ azimuth: v });
        });
      }
    );

    const altitudeGroup = this.createSlider(
      '太阳高度角',
      naturalLight.altitude,
      10,
      90,
      1,
      '°',
      (value) => {
        this.animateValue('natural_altitude', value, (v) => {
          this.lightController.setNaturalLight({ altitude: v });
        });
      }
    );

    const intensityGroup = this.createSlider(
      '光照强度',
      naturalLight.intensity,
      0,
      5,
      0.1,
      '',
      (value) => {
        this.animateValue('natural_intensity', value, (v) => {
          this.lightController.setNaturalLight({ intensity: v });
        });
      }
    );

    container.appendChild(azimuthGroup);
    container.appendChild(altitudeGroup);
    container.appendChild(intensityGroup);

    return container;
  }

  private renderArtificialControls(): HTMLElement {
    const container = document.createElement('div');
    const lights = this.lightController.getArtificialLights();

    lights.forEach((light, index) => {
      const section = this.createArtificialLightSection(light, index > 0);
      container.appendChild(section);
    });

    return container;
  }

  private createArtificialLightSection(light: ArtificialLightConfig, withBorder: boolean): HTMLElement {
    const section = document.createElement('div');
    section.className = 'light-section';
    if (!withBorder) {
      section.style.borderTop = 'none';
      section.style.paddingTop = '0';
      section.style.marginTop = '0';
    }

    const header = document.createElement('div');
    header.className = 'light-header';

    const nameLabel = document.createElement('div');
    nameLabel.className = 'light-name';

    const dot = document.createElement('span');
    dot.className = 'light-dot';
    if (!light.enabled) dot.classList.add('off');

    const name = document.createElement('span');
    name.textContent = light.name;

    nameLabel.appendChild(dot);
    nameLabel.appendChild(name);

    const switchWrap = document.createElement('label');
    switchWrap.className = 'switch';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = light.enabled;
    checkbox.addEventListener('change', () => {
      this.lightController.toggleArtificialLight(light.id);
      if (checkbox.checked) {
        dot.classList.remove('off');
      } else {
        dot.classList.add('off');
      }
      this.updateHeatmap(true);
    });

    const sliderSpan = document.createElement('span');
    sliderSpan.className = 'slider';

    switchWrap.appendChild(checkbox);
    switchWrap.appendChild(sliderSpan);

    header.appendChild(nameLabel);
    header.appendChild(switchWrap);

    const intensityGroup = this.createSlider(
      '强度',
      light.intensity,
      0,
      10,
      0.1,
      '',
      (value) => {
        this.animateValue(`light_${light.id}_intensity`, value, (v) => {
          this.lightController.setArtificialLight(light.id, { intensity: v });
        });
      }
    );

    const tempGroup = document.createElement('div');
    tempGroup.className = 'control-group';

    const tempLabel = document.createElement('div');
    tempLabel.className = 'control-label';

    const tempName = document.createElement('span');
    tempName.textContent = '色温';

    const tempValue = document.createElement('span');
    tempValue.className = 'control-value';
    tempValue.textContent = `${light.temperature}K`;

    tempLabel.appendChild(tempName);
    tempLabel.appendChild(tempValue);

    const tempSlider = document.createElement('input');
    tempSlider.type = 'range';
    tempSlider.min = '2000';
    tempSlider.max = '6500';
    tempSlider.step = '100';
    tempSlider.value = String(light.temperature);

    const tempPreview = document.createElement('div');
    tempPreview.className = 'temp-preview';

    tempSlider.addEventListener('input', () => {
      const val = parseInt(tempSlider.value, 10);
      tempValue.textContent = `${val}K`;
      this.lightController.setArtificialLight(light.id, { temperature: val });
      this.updateHeatmap(true);
    });

    tempGroup.appendChild(tempLabel);
    tempGroup.appendChild(tempSlider);
    tempGroup.appendChild(tempPreview);

    section.appendChild(header);
    section.appendChild(intensityGroup);
    section.appendChild(tempGroup);

    return section;
  }

  private renderHeatmapControls(): HTMLElement {
    const container = document.createElement('div');
    const info = document.createElement('div');
    info.style.fontSize = '12px';
    info.style.color = '#7f8c8d';
    info.style.lineHeight = '1.6';
    info.innerHTML = `
      <p>热力图显示地面20×20采样点的光照强度</p>
      <p style="margin-top: 8px;">
        <span style="display:inline-block;width:12px;height:12px;background:blue;border-radius:2px;vertical-align:middle;"></span>
        低照度 &nbsp;
        <span style="display:inline-block;width:12px;height:12px;background:red;border-radius:2px;vertical-align:middle;"></span>
        高照度
      </p>
    `;
    container.appendChild(info);
    return container;
  }

  private createSlider(
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    unit: string,
    onChange: (value: number) => void
  ): HTMLElement {
    const group = document.createElement('div');
    group.className = 'control-group';

    const labelDiv = document.createElement('div');
    labelDiv.className = 'control-label';

    const nameSpan = document.createElement('span');
    nameSpan.textContent = label;

    const valueSpan = document.createElement('span');
    valueSpan.className = 'control-value';
    valueSpan.textContent = `${value.toFixed(step < 1 ? 1 : 0)}${unit}`;

    labelDiv.appendChild(nameSpan);
    labelDiv.appendChild(valueSpan);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      valueSpan.textContent = `${val.toFixed(step < 1 ? 1 : 0)}${unit}`;
      onChange(val);
      this.updateHeatmap(false);
    });

    group.appendChild(labelDiv);
    group.appendChild(slider);

    return group;
  }

  private animateValue(
    key: string,
    target: number,
    apply: (value: number) => void
  ): void {
    const existing = this.animatedValues.get(key);
    this.animatedValues.set(key, {
      current: existing ? existing.current : target,
      target,
      startTime: performance.now(),
      duration: 300
    });

    const animate = () => {
      const entry = this.animatedValues.get(key);
      if (!entry) return;

      const elapsed = performance.now() - entry.startTime;
      const progress = Math.min(1, elapsed / entry.duration);
      const eased = easeOut(progress);
      const current = entry.current + (entry.target - entry.current) * eased;

      apply(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.animatedValues.delete(key);
      }
    };

    requestAnimationFrame(animate);
  }

  public updateHeatmap(force: boolean = false): void {
    const now = performance.now();
    if (!force && now - this.lastHeatmapUpdate < this.heatmapInterval) {
      return;
    }
    this.lastHeatmapUpdate = now;

    requestAnimationFrame(() => this.renderHeatmap());
  }

  private renderHeatmap(): void {
    const points = this.houseManager.getFloorPoints(this.GRID_SIZE);
    const values: number[] = [];

    let maxVal = 0;
    let minVal = Infinity;

    for (let i = 0; i < points.length; i++) {
      const illuminance = this.lightController.calculateIlluminance(points[i].x, points[i].z);
      values.push(illuminance);
      maxVal = Math.max(maxVal, illuminance);
      minVal = Math.min(minVal, illuminance);
    }

    if (maxVal === minVal) maxVal = minVal + 0.01;

    this.heatmapData = values;

    const ctx = this.heatmapCtx;
    const canvas = this.heatmapCanvas;
    const cellW = canvas.width / this.GRID_SIZE;
    const cellH = canvas.height / this.GRID_SIZE;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let iz = 0; iz < this.GRID_SIZE; iz++) {
      for (let ix = 0; ix < this.GRID_SIZE; ix++) {
        const idx = iz * this.GRID_SIZE + ix;
        const normalized = (values[idx] - minVal) / (maxVal - minVal);
        const color = this.valueToColor(normalized);

        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 0.85)`;
        ctx.fillRect(
          ix * cellW,
          canvas.height - (iz + 1) * cellH,
          cellW + 1,
          cellH + 1
        );
      }
    }

    ctx.fillStyle = 'rgba(44, 62, 80, 0.8)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('低', 4, canvas.height - 4);
    ctx.textAlign = 'right';
    ctx.fillText('高', canvas.width - 4, canvas.height - 4);
  }

  private valueToColor(value: number): { r: number; g: number; b: number } {
    const clamped = Math.max(0, Math.min(1, value));

    if (clamped < 0.25) {
      const t = clamped / 0.25;
      return {
        r: 0,
        g: Math.round(50 * t),
        b: Math.round(150 + 105 * t)
      };
    } else if (clamped < 0.5) {
      const t = (clamped - 0.25) / 0.25;
      return {
        r: 0,
        g: Math.round(50 + 205 * t),
        b: Math.round(255 - 255 * t)
      };
    } else if (clamped < 0.75) {
      const t = (clamped - 0.5) / 0.25;
      return {
        r: Math.round(255 * t),
        g: 255,
        b: 0
      };
    } else {
      const t = (clamped - 0.75) / 0.25;
      return {
        r: 255,
        g: Math.round(255 - 255 * t),
        b: 0
      };
    }
  }

  public showLightTooltip(lightId: string, screenX: number, screenY: number): void {
    this.hideLightTooltip();
    const config = this.lightController.getArtificialLight(lightId);
    if (!config) return;

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip-card';
    tooltip.id = 'light-tooltip';

    const color = kelvinToRGB(config.temperature);
    tooltip.innerHTML = `
      <h4>${config.name}</h4>
      <p>状态: <strong>${config.enabled ? '开启' : '关闭'}</strong></p>
      <p>强度: <strong>${config.intensity.toFixed(1)}</strong></p>
      <p>色温: <strong>${config.temperature}K</strong></p>
      <p>RGB: <strong>(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})</strong></p>
    `;

    tooltip.style.left = `${screenX + 15}px`;
    tooltip.style.top = `${screenY + 15}px`;

    document.body.appendChild(tooltip);
  }

  public hideLightTooltip(): void {
    const existing = document.getElementById('light-tooltip');
    if (existing) existing.remove();
  }

  public dispose(): void {
    this.hideLightTooltip();
    this.animatedValues.clear();
    this.panelContainer.innerHTML = '';
  }
}
