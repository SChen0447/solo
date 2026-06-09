import { GUI } from 'dat.gui';
import { Galaxy } from './galaxy';

export interface ControlParams {
  particleCount: number;
  gravityStrength: number;
  rotationSpeed: number;
  colorScheme: string;
}

export class GalaxyControls {
  private gui: GUI;
  private params: ControlParams;
  private galaxy: Galaxy;

  private onToggleEvolution: (() => void) | null = null;
  private onReset: (() => void) | null = null;

  constructor(container: HTMLElement, galaxy: Galaxy, initialParams: ControlParams) {
    this.galaxy = galaxy;
    this.params = { ...initialParams };

    this.gui = new GUI({ autoPlace: false, container, width: 280 });
    this.setupControls();
  }

  private setupControls(): void {
    this.gui.add(this.params, 'particleCount', 500, 5000, 100)
      .name('粒子总数')
      .onChange((value: number) => {
        this.galaxy.setParticleCount(value);
      });

    this.gui.add(this.params, 'gravityStrength', 0.5, 3.0, 0.1)
      .name('引力强度')
      .onChange((value: number) => {
        this.params.gravityStrength = value;
      });

    this.gui.add(this.params, 'rotationSpeed', 0.2, 3.0, 0.1)
      .name('旋转速度倍数')
      .onChange((value: number) => {
        this.params.rotationSpeed = value;
      });

    this.gui.add(this.params, 'colorScheme', {
      '暖橙到冷蓝': 'warm-cool',
      '绿到紫': 'green-purple',
      '红到黄': 'red-yellow',
      '白到蓝': 'white-blue',
      '彩虹渐变': 'rainbow'
    })
      .name('颜色渐变')
      .onChange((value: string) => {
        this.galaxy.setColorScheme(value);
      });
  }

  public getParams(): ControlParams {
    return { ...this.params };
  }

  public getGravityStrength(): number {
    return this.params.gravityStrength;
  }

  public getRotationSpeed(): number {
    return this.params.rotationSpeed;
  }

  public setToggleEvolutionHandler(handler: () => void): void {
    this.onToggleEvolution = handler;
  }

  public setResetHandler(handler: () => void): void {
    this.onReset = handler;
  }

  public handleToggleEvolution(): void {
    if (this.onToggleEvolution) {
      this.onToggleEvolution();
    }
  }

  public handleReset(): void {
    if (this.onReset) {
      this.onReset();
    }
  }

  public dispose(): void {
    this.gui.destroy();
  }
}
