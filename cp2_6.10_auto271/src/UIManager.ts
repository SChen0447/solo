import * as THREE from 'three';
import { ColorTheme } from './NebulaSystem';

export interface UIManagerCallbacks {
  onDensityChange: (level: number) => void;
  onSpeedChange: (speed: number) => void;
  onThemeChange: (theme: ColorTheme) => void;
  onParticleClick: (index: number, worldPos: THREE.Vector3) => void;
}

export class UIManager {
  private callbacks: UIManagerCallbacks;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private infoCardTimeout: number | null = null;
  private canvasContainer: HTMLElement;
  private particleInfo: HTMLElement;
  private densitySlider: HTMLInputElement;
  private densityValue: HTMLElement;
  private speedSlider: HTMLInputElement;
  private speedValue: HTMLElement;
  private particleCountEl: HTMLElement;
  private themeSwatches: HTMLElement[] = [];
  private tempVec3: THREE.Vector3 = new THREE.Vector3();

  constructor(callbacks: UIManagerCallbacks) {
    this.callbacks = callbacks;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    const canvasContainer = document.getElementById('canvas-container');
    const particleInfo = document.getElementById('particle-info');
    const densitySlider = document.getElementById('density-slider') as HTMLInputElement;
    const densityValue = document.getElementById('density-value');
    const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    const speedValue = document.getElementById('speed-value');
    const particleCountEl = document.getElementById('particle-count');

    if (!canvasContainer || !particleInfo || !densitySlider || !densityValue
        || !speedSlider || !speedValue || !particleCountEl) {
      throw new Error('Required DOM elements not found');
    }

    this.canvasContainer = canvasContainer;
    this.particleInfo = particleInfo;
    this.densitySlider = densitySlider;
    this.densityValue = densityValue;
    this.speedSlider = speedSlider;
    this.speedValue = speedValue;
    this.particleCountEl = particleCountEl;

    this.initThemeSwatches();
    this.bindEvents();
  }

  private initThemeSwatches(): void {
    const container = document.getElementById('theme-container');
    if (!container) return;

    const swatches = container.querySelectorAll('.theme-swatch');
    swatches.forEach((swatch) => {
      this.themeSwatches.push(swatch as HTMLElement);
    });
  }

  private bindEvents(): void {
    this.densitySlider.addEventListener('input', () => {
      const value = parseInt(this.densitySlider.value, 10);
      this.densityValue.textContent = value.toString();
      this.callbacks.onDensityChange(value);
    });

    this.speedSlider.addEventListener('input', () => {
      const value = parseFloat(this.speedSlider.value);
      this.speedValue.textContent = value.toFixed(1);
      this.callbacks.onSpeedChange(value);
    });

    this.themeSwatches.forEach((swatch) => {
      swatch.addEventListener('click', () => {
        const theme = swatch.dataset.theme as ColorTheme;
        if (!theme) return;

        this.themeSwatches.forEach((s) => s.classList.remove('active'));
        swatch.classList.add('active');
        this.callbacks.onThemeChange(theme);
      });
    });
  }

  public handleClick(event: MouseEvent, camera: THREE.Camera, points: THREE.Points): void {
    const rect = this.canvasContainer.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.mouse.x = (x / rect.width) * 2 - 1;
    this.mouse.y = -(y / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);
    this.raycaster.params.Points = { threshold: 0.15 };

    const intersects = this.raycaster.intersectObject(points, false);

    if (intersects.length > 0 && intersects[0].index !== undefined) {
      const index = intersects[0].index;
      const positions = points.geometry.attributes.position.array as Float32Array;
      const i3 = index * 3;
      this.tempVec3.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);
      this.callbacks.onParticleClick(index, this.tempVec3);
    }
  }

  public updateParticleCount(count: number): void {
    this.particleCountEl.textContent = count.toLocaleString();
  }

  public showParticleInfo(
    screenPos: { x: number; y: number },
    density: number,
    colorHex: string
  ): void {
    if (this.infoCardTimeout !== null) {
      clearTimeout(this.infoCardTimeout);
      this.infoCardTimeout = null;
    }

    const densityPercent = (density * 100).toFixed(1);

    this.particleInfo.innerHTML = `
      <div class="info-title">粒子数据</div>
      <div class="info-row">
        <span class="info-label">本地密度</span>
        <span class="info-value">${densityPercent}%</span>
      </div>
      <div class="info-row">
        <span class="info-label">主色光谱</span>
        <span class="info-value">
          ${colorHex.toUpperCase()}
          <span class="info-color-preview" style="background: ${colorHex};"></span>
        </span>
      </div>
    `;

    const rect = this.canvasContainer.getBoundingClientRect();
    const cardWidth = 180;
    const cardHeight = 90;

    let posX = screenPos.x + 16;
    let posY = screenPos.y + 16;

    if (posX + cardWidth > rect.width) {
      posX = screenPos.x - cardWidth - 16;
    }
    if (posY + cardHeight > rect.height) {
      posY = screenPos.y - cardHeight - 16;
    }

    this.particleInfo.style.left = `${posX}px`;
    this.particleInfo.style.top = `${posY}px`;

    requestAnimationFrame(() => {
      this.particleInfo.classList.add('visible');
    });

    this.infoCardTimeout = window.setTimeout(() => {
      this.particleInfo.classList.remove('visible');
      this.infoCardTimeout = null;
    }, 2000);
  }

  public getCanvasContainer(): HTMLElement {
    return this.canvasContainer;
  }
}
