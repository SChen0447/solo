import { Pane } from 'tweakpane';
import * as THREE from 'three';
import { EnvironmentParams } from './firefly';

export interface EnvironmentConfig {
  container?: HTMLElement;
  onChange?: (params: EnvironmentParams) => void;
}

export class EnvironmentControl {
  public params: EnvironmentParams;
  private pane: Pane;
  private ambientLight: THREE.AmbientLight;
  private moonLight: THREE.DirectionalLight;
  private onChangeCallback?: (params: EnvironmentParams) => void;

  constructor(ambientLight: THREE.AmbientLight, moonLight: THREE.DirectionalLight, config?: EnvironmentConfig) {
    this.ambientLight = ambientLight;
    this.moonLight = moonLight;
    this.onChangeCallback = config?.onChange;

    this.params = {
      temperature: 25,
      humidity: 50,
      moonPhase: 0.3
    };

    const container = config?.container || document.body;
    this.pane = new Pane({
      title: '环境参数控制',
      container: container as HTMLElement,
      expanded: true
    });

    this.pane.element.style.position = 'fixed';
    this.pane.element.style.left = '20px';
    this.pane.element.style.top = '20px';
    this.pane.element.style.zIndex = '1000';

    this.initControls();
    this.updateLights();
  }

  private initControls(): void {
    const pane = this.pane as any;
    
    const tempFolder = pane.addBlade({
      view: 'folder',
      title: '温度',
      expanded: true
    });

    tempFolder.addBinding(this.params, 'temperature', {
      min: 15,
      max: 35,
      step: 0.5,
      label: '°C'
    }).on('change', () => {
      this.notifyChange();
    });

    const humidityFolder = pane.addBlade({
      view: 'folder',
      title: '湿度',
      expanded: true
    });

    humidityFolder.addBinding(this.params, 'humidity', {
      min: 20,
      max: 80,
      step: 1,
      label: '%'
    }).on('change', () => {
      this.notifyChange();
    });

    const moonFolder = pane.addBlade({
      view: 'folder',
      title: '月相',
      expanded: true
    });

    moonFolder.addBinding(this.params, 'moonPhase', {
      min: 0,
      max: 1,
      step: 0.01,
      label: '新月→满月'
    }).on('change', () => {
      this.updateLights();
      this.notifyChange();
    });

    const infoFolder = pane.addBlade({
      view: 'folder',
      title: '说明',
      expanded: false
    });

    infoFolder.addBlade({
      view: 'list',
      label: '温度影响',
      options: [
        { text: '15°C - 慢速闪烁', value: 'cold' },
        { text: '25°C - 正常闪烁', value: 'normal' },
        { text: '35°C - 快速闪烁', value: 'hot' }
      ],
      value: 'normal',
      disabled: true
    });

    infoFolder.addBlade({
      view: 'list',
      label: '湿度影响',
      options: [
        { text: '20% - 分散分布', value: 'dry' },
        { text: '50% - 正常分布', value: 'normal' },
        { text: '80% - 密集聚集', value: 'wet' }
      ],
      value: 'normal',
      disabled: true
    });

    infoFolder.addBlade({
      view: 'list',
      label: '月相影响',
      options: [
        { text: '0 - 新月(最亮)', value: 'new' },
        { text: '0.5 - 半月', value: 'half' },
        { text: '1 - 满月(最暗)', value: 'full' }
      ],
      value: 'new',
      disabled: true
    });
  }

  private updateLights(): void {
    const { moonPhase } = this.params;

    const ambientIntensity = 0.02 + moonPhase * 0.28;
    this.ambientLight.intensity = ambientIntensity;

    const moonColor = new THREE.Color().setHSL(210 / 360, 0.3, 0.5 + moonPhase * 0.5);
    this.moonLight.color.copy(moonColor);
    this.moonLight.intensity = moonPhase * 0.8;

    const bgColor = new THREE.Color().setHSL(210 / 360, 0.3, 0.02 + moonPhase * 0.04);
    if (this.ambientLight.parent) {
      const scene = this.ambientLight.parent as THREE.Scene;
      scene.background = bgColor;
    }
  }

  private notifyChange(): void {
    if (this.onChangeCallback) {
      this.onChangeCallback(this.params);
    }
  }

  public getParams(): EnvironmentParams {
    return { ...this.params };
  }

  public dispose(): void {
    this.pane.dispose();
  }
}
