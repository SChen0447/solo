import * as THREE from 'three';

const MIN_TIME = 6 * 60;
const MAX_TIME = 20 * 60;
const STEP = 15;
const SUN_DISTANCE = 500;

const COLOR_0600 = new THREE.Color('#ffaa66');
const COLOR_1200 = new THREE.Color('#ffffff');
const COLOR_1800 = new THREE.Color('#ff6633');
const COLOR_2000 = new THREE.Color('#331100');

function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return a.clone().lerp(b, Math.max(0, Math.min(1, t)));
}

function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export class ShadowSimulator {
  private scene: THREE.Scene;
  private directionalLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private currentMinutes: number = 12 * 60;
  private container: HTMLElement | null = null;
  private dialElement: HTMLElement | null = null;
  private sliderElement: HTMLElement | null = null;
  private timeDisplay: HTMLElement | null = null;
  private isDragging: boolean = false;
  private onChangeCallback: ((minutes: number) => void) | null = null;

  constructor(scene: THREE.Scene, directionalLight: THREE.DirectionalLight, ambientLight: THREE.AmbientLight) {
    this.scene = scene;
    this.directionalLight = directionalLight;
    this.ambientLight = ambientLight;
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 1024;
    this.directionalLight.shadow.mapSize.height = 1024;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 1500;
    const shadowSize = 500;
    this.directionalLight.shadow.camera.left = -shadowSize;
    this.directionalLight.shadow.camera.right = shadowSize;
    this.directionalLight.shadow.camera.top = shadowSize;
    this.directionalLight.shadow.camera.bottom = -shadowSize;
    this.directionalLight.shadow.bias = -0.001;
    this.directionalLight.shadow.normalBias = 0.02;
  }

  public createUI(containerId: string): void {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.container.innerHTML = '';

    this.dialElement = document.createElement('div');
    this.dialElement.className = 'time-dial';
    this.dialElement.innerHTML = `
      <div class="dial-background"></div>
      <div class="dial-ticks"></div>
      <div class="dial-hours"></div>
      <div class="dial-slider" id="dial-slider"></div>
      <div class="dial-center">
        <span class="time-display" id="time-display">12:00</span>
      </div>
    `;

    this.container.appendChild(this.dialElement);
    this.sliderElement = document.getElementById('dial-slider');
    this.timeDisplay = document.getElementById('time-display');

    this.createHourMarkers();
    this.bindDialEvents();
    this.updateDialUI();
    this.updateLight();
  }

  private createHourMarkers(): void {
    const ticksContainer = this.dialElement?.querySelector('.dial-ticks');
    const hoursContainer = this.dialElement?.querySelector('.dial-hours');
    if (!ticksContainer || !hoursContainer) return;

    for (let h = 6; h <= 20; h++) {
      const tick = document.createElement('div');
      tick.className = 'dial-tick';
      const angle = this.minutesToAngle(h * 60);
      tick.style.transform = `rotate(${angle}deg) translateY(-52px)`;
      if (h % 3 === 0) {
        tick.classList.add('major');
      }
      ticksContainer.appendChild(tick);

      const hour = document.createElement('div');
      hour.className = 'dial-hour';
      hour.textContent = `${h}`;
      const hourAngle = this.minutesToAngle(h * 60);
      const rad = (hourAngle - 90) * Math.PI / 180;
      const radius = 40;
      hour.style.left = `calc(50% + ${Math.cos(rad) * radius}px)`;
      hour.style.top = `calc(50% + ${Math.sin(rad) * radius}px)`;
      hoursContainer.appendChild(hour);
    }
  }

  private minutesToAngle(minutes: number): number {
    const t = (minutes - MIN_TIME) / (MAX_TIME - MIN_TIME);
    return -90 + t * 180;
  }

  private angleToMinutes(angle: number): number {
    const t = (angle + 90) / 180;
    const minutes = MIN_TIME + t * (MAX_TIME - MIN_TIME);
    const snapped = Math.round(minutes / STEP) * STEP;
    return Math.max(MIN_TIME, Math.min(MAX_TIME, snapped));
  }

  private bindDialEvents(): void {
    const dial = this.dialElement;
    if (!dial) return;

    dial.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).classList.contains('dial-hour')) {
        const hourText = (e.target as HTMLElement).textContent;
        if (hourText) {
          const hour = parseInt(hourText, 10);
          this.setTime(hour * 60);
        }
        return;
      }
      this.isDragging = true;
      this.handleDialDrag(e);
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.handleDialDrag(e);
      }
    });

    document.addEventListener('mouseup', () => {
      this.isDragging = false;
    });
  }

  private handleDialDrag(e: MouseEvent): void {
    if (!this.dialElement) return;
    const rect = this.dialElement.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const minutes = this.angleToMinutes(angle);
    this.setTime(minutes);
  }

  public setTime(minutes: number): void {
    const snapped = Math.round(minutes / STEP) * STEP;
    this.currentMinutes = Math.max(MIN_TIME, Math.min(MAX_TIME, snapped));
    this.updateDialUI();
    this.updateLight();
    if (this.onChangeCallback) {
      this.onChangeCallback(this.currentMinutes);
    }
  }

  private updateDialUI(): void {
    if (this.sliderElement) {
      const angle = this.minutesToAngle(this.currentMinutes);
      this.sliderElement.style.transform = `rotate(${angle}deg)`;
    }
    if (this.timeDisplay) {
      this.timeDisplay.textContent = minutesToTimeString(this.currentMinutes);
    }
  }

  private updateLight(): void {
    const t = (this.currentMinutes - MIN_TIME) / (MAX_TIME - MIN_TIME);
    
    const elevationT = Math.sin(t * Math.PI);
    const elevation = 5 + elevationT * 75;
    
    const azimuth = -90 + t * 180;

    const radElev = elevation * Math.PI / 180;
    const radAzim = azimuth * Math.PI / 180;

    const sunX = SUN_DISTANCE * Math.cos(radElev) * Math.sin(radAzim);
    const sunY = SUN_DISTANCE * Math.sin(radElev);
    const sunZ = SUN_DISTANCE * Math.cos(radElev) * Math.cos(radAzim);

    this.directionalLight.position.set(sunX, sunY, sunZ);
    this.directionalLight.target.position.set(0, 0, 0);

    let colorTemp: THREE.Color;
    if (this.currentMinutes <= 12 * 60) {
      const localT = (this.currentMinutes - 6 * 60) / (6 * 60);
      colorTemp = lerpColor(COLOR_0600, COLOR_1200, localT);
    } else if (this.currentMinutes <= 18 * 60) {
      const localT = (this.currentMinutes - 12 * 60) / (6 * 60);
      colorTemp = lerpColor(COLOR_1200, COLOR_1800, localT);
    } else {
      const localT = (this.currentMinutes - 18 * 60) / (2 * 60);
      colorTemp = lerpColor(COLOR_1800, COLOR_2000, localT);
    }

    this.directionalLight.color = colorTemp;

    const intensity = 0.3 + elevationT * 1.2;
    this.directionalLight.intensity = intensity;

    const ambientIntensity = 0.3 + elevationT * 0.4;
    this.ambientLight.intensity = ambientIntensity;

    const skyBrightness = 0.2 + elevationT * 0.8;
    this.ambientLight.color = new THREE.Color().setHSL(0.6, 0.5, 0.3 + skyBrightness * 0.4);
  }

  public onChange(callback: (minutes: number) => void): void {
    this.onChangeCallback = callback;
  }

  public update(): void {
    this.directionalLight.target.updateMatrixWorld();
  }

  public getCurrentMinutes(): number {
    return this.currentMinutes;
  }
}
