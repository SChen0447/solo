import { Pane, type FolderApi } from 'tweakpane';
import * as THREE from 'three';
import type { CityParams, ColorTheme, BuildingObject } from './cityGenerator';

export interface UICallbacks {
  onParamsChange: (params: CityParams) => void;
  onTimeOfDayChange: (mode: TimeOfDay) => void;
  onBuildingHeightChange: (building: BuildingObject, height: number) => void;
  onBuildingColorChange: (building: BuildingObject, bottom: string, top: string) => void;
}

export type TimeOfDay = 'day' | 'evening' | 'night';

interface LightState {
  directionalColor: THREE.Color;
  directionalIntensity: number;
  directionalPosition: THREE.Vector3;
  ambientColor: THREE.Color;
  ambientIntensity: number;
  hemisphereSky: THREE.Color;
  hemisphereGround: THREE.Color;
  hemisphereIntensity: number;
  backgroundTop: THREE.Color;
  backgroundBottom: THREE.Color;
  isNight: boolean;
}

export class UIController {
  private pane: Pane;
  private params: CityParams;
  private callbacks: UICallbacks;
  private timeOfDay: TimeOfDay = 'day';
  private autoCycle: boolean = true;
  private selectedBuilding: BuildingObject | null = null;
  private buildingInfoEl: HTMLElement | null = null;
  private posXEl: HTMLElement | null = null;
  private posZEl: HTMLElement | null = null;
  private heightInputEl: HTMLInputElement | null = null;
  private colorBottomInputEl: HTMLInputElement | null = null;
  private colorTopInputEl: HTMLInputElement | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isProcessingChange: boolean = false;

  constructor(callbacks: UICallbacks, initialParams: CityParams) {
    this.callbacks = callbacks;
    this.params = { ...initialParams };

    const container = document.getElementById('tweakpane-container');
    this.pane = new Pane({
      container: container || undefined,
      title: '',
      expanded: true,
    });

    this.setupBuildingFolder();
    this.setupColorFolder();
    this.setupLightingFolder();
    this.setupBuildingInfoUI();
    this.setupMobileDrawer();
  }

  private setupBuildingFolder(): void {
    const folder = (this.pane as any).addFolder({
      title: '🏢 建筑参数',
      expanded: true,
    }) as FolderApi;

    folder.addBinding(this.params, 'buildingCount', {
      label: '建筑数量',
      min: 50,
      max: 200,
      step: 1,
    }).on('change', (ev: any) => {
      this.params.buildingCount = ev.value as number;
      this.debounceParamsChange();
    });

    folder.addBinding(this.params, 'minHeight', {
      label: '最小高度',
      min: 20,
      max: 100,
      step: 1,
    }).on('change', (ev: any) => {
      this.params.minHeight = Math.min(ev.value as number, this.params.maxHeight - 10);
      this.debounceParamsChange();
    });

    folder.addBinding(this.params, 'maxHeight', {
      label: '最大高度',
      min: 100,
      max: 200,
      step: 1,
    }).on('change', (ev: any) => {
      this.params.maxHeight = Math.max(ev.value as number, this.params.minHeight + 10);
      this.debounceParamsChange();
    });
  }

  private setupColorFolder(): void {
    const folder = (this.pane as any).addFolder({
      title: '🎨 颜色主题',
      expanded: true,
    }) as FolderApi;

    const themeOptions: Record<string, ColorTheme> = {
      '日落暖色系': 'sunset',
      '赛博朋克霓虹系': 'cyberpunk',
      '极地冷色系': 'polar',
      '沙漠沙色系': 'desert',
      '未来白金属系': 'futuristic',
    };

    folder.addBlade({
      view: 'list',
      label: '主题',
      options: Object.entries(themeOptions).map(([label, value]) => ({
        text: label,
        value,
      })),
      value: this.params.colorTheme,
    }).on('change', (ev: any) => {
      this.params.colorTheme = ev.value as ColorTheme;
      this.debounceParamsChange();
    });
  }

  private setupLightingFolder(): void {
    const folder = (this.pane as any).addFolder({
      title: '🌅 光照系统',
      expanded: true,
    }) as FolderApi;

    const timeOptions: Record<string, TimeOfDay> = {
      '☀️ 白天': 'day',
      '🌇 傍晚': 'evening',
      '🌙 夜晚': 'night',
    };

    folder.addBlade({
      view: 'list',
      label: '时间',
      options: Object.entries(timeOptions).map(([label, value]) => ({
        text: label,
        value,
      })),
      value: this.timeOfDay,
    }).on('change', (ev: any) => {
      this.timeOfDay = ev.value as TimeOfDay;
      this.autoCycle = false;
      this.callbacks.onTimeOfDayChange(this.timeOfDay);
    });

    folder.addBinding({ auto: true }, 'auto', {
      label: '自动循环',
    }).on('change', (ev: any) => {
      this.autoCycle = ev.value as boolean;
    });
  }

  private setupBuildingInfoUI(): void {
    this.buildingInfoEl = document.getElementById('building-info');
    this.posXEl = document.getElementById('info-pos-x');
    this.posZEl = document.getElementById('info-pos-z');
    this.heightInputEl = document.getElementById('info-height') as HTMLInputElement;
    this.colorBottomInputEl = document.getElementById('info-color-bottom') as HTMLInputElement;
    this.colorTopInputEl = document.getElementById('info-color-top') as HTMLInputElement;

    if (this.heightInputEl) {
      this.heightInputEl.addEventListener('input', (e) => {
        if (!this.selectedBuilding || this.isProcessingChange) return;
        const target = e.target as HTMLInputElement;
        const value = parseFloat(target.value);
        if (!isNaN(value) && value >= 20 && value <= 200) {
          this.isProcessingChange = true;
          this.callbacks.onBuildingHeightChange(this.selectedBuilding, value);
          setTimeout(() => {
            this.isProcessingChange = false;
          }, 100);
        }
      });
    }

    if (this.colorBottomInputEl) {
      this.colorBottomInputEl.addEventListener('input', (e) => {
        if (!this.selectedBuilding) return;
        const target = e.target as HTMLInputElement;
        this.callbacks.onBuildingColorChange(
          this.selectedBuilding,
          target.value,
          this.selectedBuilding.data.colorTop
        );
      });
    }

    if (this.colorTopInputEl) {
      this.colorTopInputEl.addEventListener('input', (e) => {
        if (!this.selectedBuilding) return;
        const target = e.target as HTMLInputElement;
        this.callbacks.onBuildingColorChange(
          this.selectedBuilding,
          this.selectedBuilding.data.colorBottom,
          target.value
        );
      });
    }
  }

  private setupMobileDrawer(): void {
    const drawerToggle = document.getElementById('drawer-toggle');
    const controlPanel = document.getElementById('control-panel');

    if (drawerToggle && controlPanel) {
      drawerToggle.addEventListener('click', () => {
        controlPanel.classList.toggle('open');
      });

      const checkMobile = () => {
        if (window.innerWidth <= 768) {
          drawerToggle.classList.remove('hidden');
          controlPanel.classList.remove('open');
        } else {
          drawerToggle.classList.add('hidden');
          controlPanel.classList.remove('open');
        }
      };

      checkMobile();
      window.addEventListener('resize', checkMobile);
    }
  }

  private debounceParamsChange(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.callbacks.onParamsChange({ ...this.params });
    }, 150);
  }

  public showBuildingInfo(building: BuildingObject): void {
    this.selectedBuilding = building;
    if (this.buildingInfoEl) {
      this.buildingInfoEl.classList.add('visible');
    }
    if (this.posXEl) {
      this.posXEl.textContent = building.data.position.x.toFixed(1);
    }
    if (this.posZEl) {
      this.posZEl.textContent = building.data.position.z.toFixed(1);
    }
    if (this.heightInputEl) {
      this.heightInputEl.value = building.data.height.toFixed(0);
    }
    if (this.colorBottomInputEl) {
      this.colorBottomInputEl.value = building.data.colorBottom;
    }
    if (this.colorTopInputEl) {
      this.colorTopInputEl.value = building.data.colorTop;
    }
  }

  public hideBuildingInfo(): void {
    this.selectedBuilding = null;
    if (this.buildingInfoEl) {
      this.buildingInfoEl.classList.remove('visible');
    }
  }

  public updateBuildingHeight(height: number): void {
    if (this.heightInputEl && !this.isProcessingChange) {
      this.heightInputEl.value = height.toFixed(0);
    }
  }

  public updateBuildingColors(bottom: string, top: string): void {
    if (this.colorBottomInputEl) {
      this.colorBottomInputEl.value = bottom;
    }
    if (this.colorTopInputEl) {
      this.colorTopInputEl.value = top;
    }
  }

  public isAutoCycleEnabled(): boolean {
    return this.autoCycle;
  }

  public getTimeOfDay(): TimeOfDay {
    return this.timeOfDay;
  }

  public setTimeOfDay(mode: TimeOfDay): void {
    this.timeOfDay = mode;
  }

  public dispose(): void {
    this.pane.dispose();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}

export class DayNightSystem {
  private scene: THREE.Scene;
  private directionalLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private hemisphereLight: THREE.HemisphereLight;
  private currentTime: number = 0;
  private cycleDuration: number = 30;
  private targetMode: TimeOfDay | null = null;
  private transitionProgress: number = 1;
  private fromState: LightState | null = null;
  private toState: LightState | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(this.ambientLight);

    this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x0a0a1a, 0.5);
    this.scene.add(this.hemisphereLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directionalLight.position.set(100, 150, 100);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 500;
    this.directionalLight.shadow.camera.left = -300;
    this.directionalLight.shadow.camera.right = 300;
    this.directionalLight.shadow.camera.top = 300;
    this.directionalLight.shadow.camera.bottom = -300;
    this.directionalLight.shadow.bias = -0.0005;
    this.scene.add(this.directionalLight);

    this.applyState(this.getDayState());
  }

  private getDayState(): LightState {
    return {
      directionalColor: new THREE.Color(0xfff4e0),
      directionalIntensity: 1.0,
      directionalPosition: new THREE.Vector3(100, 150, 100),
      ambientColor: new THREE.Color(0xffffff),
      ambientIntensity: 0.4,
      hemisphereSky: new THREE.Color(0x87ceeb),
      hemisphereGround: new THREE.Color(0x1a1a3a),
      hemisphereIntensity: 0.6,
      backgroundTop: new THREE.Color(0x1a3a6a),
      backgroundBottom: new THREE.Color(0x2a4a7a),
      isNight: false,
    };
  }

  private getEveningState(): LightState {
    return {
      directionalColor: new THREE.Color(0xff8844),
      directionalIntensity: 0.7,
      directionalPosition: new THREE.Vector3(150, 80, 50),
      ambientColor: new THREE.Color(0xffaa66),
      ambientIntensity: 0.3,
      hemisphereSky: new THREE.Color(0xff7744),
      hemisphereGround: new THREE.Color(0x2a1a3a),
      hemisphereIntensity: 0.4,
      backgroundTop: new THREE.Color(0x4a2a4a),
      backgroundBottom: new THREE.Color(0x7a3a3a),
      isNight: false,
    };
  }

  private getNightState(): LightState {
    return {
      directionalColor: new THREE.Color(0x8888ff),
      directionalIntensity: 0.2,
      directionalPosition: new THREE.Vector3(-50, 100, -100),
      ambientColor: new THREE.Color(0x4466aa),
      ambientIntensity: 0.15,
      hemisphereSky: new THREE.Color(0x0a0a3a),
      hemisphereGround: new THREE.Color(0x050515),
      hemisphereIntensity: 0.2,
      backgroundTop: new THREE.Color(0x05051a),
      backgroundBottom: new THREE.Color(0x0a0a2a),
      isNight: true,
    };
  }

  private lerpState(a: LightState, b: LightState, t: number): LightState {
    return {
      directionalColor: a.directionalColor.clone().lerp(b.directionalColor, t),
      directionalIntensity: a.directionalIntensity + (b.directionalIntensity - a.directionalIntensity) * t,
      directionalPosition: a.directionalPosition.clone().lerp(b.directionalPosition, t),
      ambientColor: a.ambientColor.clone().lerp(b.ambientColor, t),
      ambientIntensity: a.ambientIntensity + (b.ambientIntensity - a.ambientIntensity) * t,
      hemisphereSky: a.hemisphereSky.clone().lerp(b.hemisphereSky, t),
      hemisphereGround: a.hemisphereGround.clone().lerp(b.hemisphereGround, t),
      hemisphereIntensity: a.hemisphereIntensity + (b.hemisphereIntensity - a.hemisphereIntensity) * t,
      backgroundTop: a.backgroundTop.clone().lerp(b.backgroundTop, t),
      backgroundBottom: a.backgroundBottom.clone().lerp(b.backgroundBottom, t),
      isNight: t > 0.5 ? b.isNight : a.isNight,
    };
  }

  private applyState(state: LightState): void {
    this.directionalLight.color.copy(state.directionalColor);
    this.directionalLight.intensity = state.directionalIntensity;
    this.directionalLight.position.copy(state.directionalPosition);
    this.ambientLight.color.copy(state.ambientColor);
    this.ambientLight.intensity = state.ambientIntensity;
    this.hemisphereLight.color.copy(state.hemisphereSky);
    this.hemisphereLight.groundColor.copy(state.hemisphereGround);
    this.hemisphereLight.intensity = state.hemisphereIntensity;
    this.updateBackground(state);
  }

  private updateBackground(state: LightState): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, `#${state.backgroundTop.getHexString()}`);
    gradient.addColorStop(1, `#${state.backgroundBottom.getHexString()}`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  public switchTo(mode: TimeOfDay): void {
    let target: LightState;
    if (mode === 'day') target = this.getDayState();
    else if (mode === 'evening') target = this.getEveningState();
    else target = this.getNightState();

    this.fromState = this.getCurrentState();
    this.toState = target;
    this.targetMode = mode;
    this.transitionProgress = 0;
  }

  private getCurrentState(): LightState {
    return {
      directionalColor: this.directionalLight.color.clone(),
      directionalIntensity: this.directionalLight.intensity,
      directionalPosition: this.directionalLight.position.clone(),
      ambientColor: this.ambientLight.color.clone(),
      ambientIntensity: this.ambientLight.intensity,
      hemisphereSky: this.hemisphereLight.color.clone(),
      hemisphereGround: this.hemisphereLight.groundColor.clone(),
      hemisphereIntensity: this.hemisphereLight.intensity,
      backgroundTop: new THREE.Color(0x0a0a2a),
      backgroundBottom: new THREE.Color(0x1a1a3a),
      isNight: this.ambientLight.intensity < 0.25,
    };
  }

  public getIsNight(): boolean {
    return this.ambientLight.intensity < 0.25;
  }

  public update(delta: number, autoCycle: boolean): void {
    if (this.targetMode && this.toState && this.fromState) {
      this.transitionProgress = Math.min(1, this.transitionProgress + delta / 1.5);
      const state = this.lerpState(this.fromState, this.toState, this.easeInOut(this.transitionProgress));
      this.applyState(state);
      if (this.transitionProgress >= 1) {
        this.targetMode = null;
      }
      return;
    }

    if (autoCycle) {
      this.currentTime = (this.currentTime + delta) % this.cycleDuration;
      const t = this.currentTime / this.cycleDuration;

      let state: LightState;
      if (t < 0.33) {
        state = this.lerpState(this.getNightState(), this.getDayState(), t / 0.33);
      } else if (t < 0.5) {
        state = this.lerpState(this.getDayState(), this.getEveningState(), (t - 0.33) / 0.17);
      } else if (t < 0.83) {
        state = this.lerpState(this.getEveningState(), this.getNightState(), (t - 0.5) / 0.33);
      } else {
        state = this.getNightState();
      }
      this.applyState(state);
    }
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  public dispose(): void {
    this.scene.remove(this.directionalLight);
    this.scene.remove(this.ambientLight);
    this.scene.remove(this.hemisphereLight);
    this.directionalLight.dispose?.();
  }
}
