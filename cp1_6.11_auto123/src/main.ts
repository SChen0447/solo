import * as THREE from 'three';
import { RenderManager } from './renderManager';
import { FluidSystem } from './fluidSystem';
import { InteractionHandler, SimulationParams } from './interactionHandler';
import Stats from 'stats.js';
import { Pane } from 'tweakpane';

const PARTICLE_COUNT = 300;

type TweakpaneAny = any;

class App {
  private container: HTMLElement;
  private renderManager!: RenderManager;
  private fluidSystem!: FluidSystem;
  private interactionHandler!: InteractionHandler;

  private stats!: Stats;
  private pane: Pane | null = null;
  private fpsElement!: HTMLElement;
  private pulseRing!: HTMLElement;

  private clock: THREE.Clock;
  private animationId: number = 0;
  private neighborRecomputeTimer: number = 0;

  private params: SimulationParams;
  private magnetWorldPos: THREE.Vector3;
  private smoothedMagnetPos: THREE.Vector3;

  constructor() {
    const app = document.getElementById('app');
    if (!app) {
      throw new Error('Container #app not found');
    }
    this.container = app;

    this.clock = new THREE.Clock();
    this.params = {
      magneticStrength: 1.0,
      viscosity: 0.5,
      polaritySwapped: false
    };
    this.magnetWorldPos = new THREE.Vector3(3, 1.5, 3);
    this.smoothedMagnetPos = new THREE.Vector3(3, 1.5, 3);

    this.init();
  }

  private init(): void {
    this.createStats();
    this.createPulseRing();

    this.renderManager = new RenderManager({
      container: this.container,
      particleCount: PARTICLE_COUNT
    });

    this.fluidSystem = new FluidSystem({
      particleCount: PARTICLE_COUNT,
      minRadius: 0.05,
      maxRadius: 0.2,
      springStiffness: 1.5,
      dipoleStrength: 0.6,
      dishRadius: 3.8,
      gravity: 4.0
    });

    this.interactionHandler = new InteractionHandler(
      this.renderManager,
      this.fluidSystem,
      {
        onParamsChange: (params: SimulationParams) => {
          this.params = params;
          this.fluidSystem.setDipoleStrength(
            THREE.MathUtils.lerp(0.3, 1.0, (params.magneticStrength - 0.1) / 1.9)
          );
        },
        onPulse: (screenX: number, screenY: number) => {
          this.triggerPulse(screenX, screenY);
        },
        onMagnetMove: (worldPos: THREE.Vector3) => {
          this.magnetWorldPos.copy(worldPos);
        }
      },
      this.params
    );

    this.magnetWorldPos.copy(this.renderManager.magnet.position);
    this.smoothedMagnetPos.copy(this.magnetWorldPos);

    this.createTweakpane();
    this.bindUI();
    this.start();
  }

  private createStats(): void {
    this.stats = new Stats();
    this.stats.showPanel(0);
    const fpsDom = this.stats.dom;
    fpsDom.style.position = 'fixed';
    fpsDom.style.left = 'auto';
    fpsDom.style.right = '20px';
    fpsDom.style.top = '150px';
    fpsDom.style.opacity = '0';
    fpsDom.style.pointerEvents = 'none';
    document.body.appendChild(fpsDom);

    this.fpsElement = document.getElementById('fpsValue') as HTMLElement;
  }

  private createPulseRing(): void {
    this.pulseRing = document.getElementById('pulseRing') as HTMLElement;
  }

  private triggerPulse(screenX: number, screenY: number): void {
    if (!this.pulseRing) return;
    this.pulseRing.style.left = screenX + 'px';
    this.pulseRing.style.top = screenY + 'px';
    this.pulseRing.classList.remove('active');
    void this.pulseRing.offsetWidth;
    this.pulseRing.classList.add('active');
  }

  private createTweakpane(): void {
    this.pane = new Pane({
      title: '调试面板',
      expanded: false
    }) as Pane;

    const paneAny = this.pane as TweakpaneAny;
    const paneEl: HTMLElement | null =
      paneAny.element || paneAny.containerElem_ || paneAny.domElement;
    if (paneEl) {
      paneEl.style.position = 'fixed';
      paneEl.style.left = '20px';
      paneEl.style.top = '150px';
      paneEl.style.zIndex = '99';
      paneEl.style.opacity = '0.9';
    }

    const addBinding = (
      target: any,
      key: string,
      opts: any,
      onChange: (value: any) => void
    ) => {
      if (typeof paneAny.addBinding === 'function') {
        paneAny.addBinding(target, key, opts).on('change', (ev: any) => {
          onChange(ev.value);
        });
      } else if (typeof paneAny.addInput === 'function') {
        paneAny.addInput(target, key, opts).on('change', (ev: any) => {
          onChange(ev.value);
        });
      }
    };

    addBinding(
      this.params,
      'magneticStrength',
      { label: '磁场强度', min: 0.1, max: 2.0, step: 0.05 },
      (value: number) => this.interactionHandler.setMagneticStrength(value)
    );

    addBinding(
      this.params,
      'viscosity',
      { label: '流体黏度', min: 0.2, max: 1.0, step: 0.1 },
      (value: number) => this.interactionHandler.setViscosity(value)
    );

    addBinding(
      this.params,
      'polaritySwapped',
      { label: '极性反转' },
      (value: boolean) => {
        this.renderManager.setMagnetPolarity(value);
        this.fluidSystem.triggerPolaritySwap();
      }
    );
  }

  private bindUI(): void {
    // 键盘快捷键
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        this.resetSimulation();
      }
      if (e.key === 'p' || e.key === 'P') {
        const btn = document.getElementById('polarityBtn');
        btn?.click();
      }
    });
  }

  private resetSimulation(): void {
    // 重新生成流体
    const newFluid = new FluidSystem({
      particleCount: PARTICLE_COUNT,
      minRadius: 0.05,
      maxRadius: 0.2,
      springStiffness: 1.5,
      dipoleStrength: 0.6,
      dishRadius: 3.8,
      gravity: 4.0
    });

    // 复制新系统状态（直接替换）
    Object.assign(this.fluidSystem, newFluid);
    this.fluidSystem.setDipoleStrength(
      THREE.MathUtils.lerp(0.3, 1.0, (this.params.magneticStrength - 0.1) / 1.9)
    );

    // 重置磁铁位置
    this.renderManager.setMagnetPosition(3, 1.5, 3);
    this.magnetWorldPos.set(3, 1.5, 3);
    this.smoothedMagnetPos.copy(this.magnetWorldPos);
  }

  private start(): void {
    this.clock.start();
    this.animate();
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    this.stats.begin();

    const dt = this.clock.getDelta();
    const elapsed = this.clock.elapsedTime;

    // 平滑磁铁位置（减少抖动）
    this.smoothedMagnetPos.lerp(this.magnetWorldPos, Math.min(1, dt * 30));

    // 极性反转时，磁场方向反转
    const effectiveMagnetPos = this.smoothedMagnetPos.clone();
    let effectiveStrength = this.params.magneticStrength;

    if (this.params.polaritySwapped) {
      effectiveStrength *= -1;
    }

    // 更新流体模拟
    this.fluidSystem.update(
      effectiveMagnetPos,
      effectiveStrength,
      this.params.viscosity,
      dt
    );

    // 定期重新计算邻居关系（每0.5秒）
    this.neighborRecomputeTimer += dt;
    if (this.neighborRecomputeTimer > 0.5) {
      this.neighborRecomputeTimer = 0;
      this.fluidSystem.recomputeNeighbors();
    }

    // 获取粒子数据并更新渲染
    const positions = this.fluidSystem.getParticles();
    const scales = this.fluidSystem.getScales();
    this.renderManager.setParticlePositions(positions, scales);

    // 渲染
    this.renderManager.render();

    // 更新FPS显示
    this.updateFPS();

    this.stats.end();
  }

  private updateFPS(): void {
    if (!this.fpsElement) return;
    const fpsPanel = (this.stats as any).dom;
    let fps = 60;
    if (fpsPanel && fpsPanel.children && fpsPanel.children.length > 0) {
      const textDiv = fpsPanel.querySelector('div');
      if (textDiv) {
        const match = textDiv.textContent?.match(/(\d+(?:\.\d+)?)/);
        if (match) {
          fps = parseFloat(match[1]);
        }
      }
    }
    this.fpsElement.textContent = fps.toFixed(0);

    // 根据帧率改变颜色提示性能
    if (fps >= 50) {
      this.fpsElement.style.color = '#88ff88';
    } else if (fps >= 30) {
      this.fpsElement.style.color = '#ffcc66';
    } else {
      this.fpsElement.style.color = '#ff6666';
    }
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.renderManager.dispose();
    if (this.pane) {
      this.pane.dispose();
    }
  }
}

// 启动应用
let app: App | null = null;

document.addEventListener('DOMContentLoaded', () => {
  try {
    app = new App();
    console.log('磁流体动力学模拟器已启动');
  } catch (error) {
    console.error('启动失败:', error);
  }
});

// 清理
window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
  }
});
