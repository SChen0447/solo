import * as THREE from 'three';
import { GUI } from 'dat.gui';
import { ParticleSystem, ParticleSystemParams } from './particleSystem';

export interface InteractionState {
  isDragging: boolean;
  lastMouseX: number;
  lastMouseY: number;
  sceneRotationY: number;
  cameraDistance: number;
  autoRotate: boolean;
}

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private particleSystem: ParticleSystem;
  private container: HTMLElement;
  private guiContainer: HTMLElement;

  private state: InteractionState;
  private gui: GUI;
  private guiParams: {
    rotationSpeed: number;
    collapseStrength: number;
    sizeMultiplier: number;
    colorOffset: number;
    autoRotate: boolean;
    reset: () => void;
  };

  private sensitivity = 0.01;
  private minDistance = 5;
  private maxDistance = 30;
  private zoomStep = 0.5;

  constructor(
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    particleSystem: ParticleSystem,
    container: HTMLElement,
    guiContainer: HTMLElement
  ) {
    this.camera = camera;
    this.scene = scene;
    this.particleSystem = particleSystem;
    this.container = container;
    this.guiContainer = guiContainer;

    const initialParams = particleSystem.getParams();
    this.state = {
      isDragging: false,
      lastMouseX: 0,
      lastMouseY: 0,
      sceneRotationY: 0,
      cameraDistance: 15,
      autoRotate: true
    };

    this.guiParams = {
      rotationSpeed: initialParams.rotationSpeed,
      collapseStrength: initialParams.collapseStrength,
      sizeMultiplier: initialParams.sizeMultiplier,
      colorOffset: initialParams.colorOffset,
      autoRotate: true,
      reset: () => {
        this.particleSystem.reset();
      }
    };

    this.gui = new GUI({ autoPlace: false, width: 280 });
    this.guiContainer.appendChild(this.gui.domElement);

    this.setupGUI();
    this.setupEventListeners();
  }

  private setupGUI(): void {
    this.gui.add(this.guiParams, 'rotationSpeed', 0, 0.01, 0.0001)
      .name('星云旋转速度')
      .onChange((value: number) => {
        this.particleSystem.setParams({ rotationSpeed: value });
      });

    this.gui.add(this.guiParams, 'collapseStrength', 0, 0.01, 0.0001)
      .name('坍缩强度')
      .onChange((value: number) => {
        this.particleSystem.setParams({ collapseStrength: value });
      });

    this.gui.add(this.guiParams, 'sizeMultiplier', 0.5, 2.0, 0.01)
      .name('粒子大小倍率')
      .onChange((value: number) => {
        this.particleSystem.setParams({ sizeMultiplier: value });
      });

    this.gui.add(this.guiParams, 'colorOffset', -0.5, 0.5, 0.01)
      .name('颜色偏移')
      .onChange((value: number) => {
        this.particleSystem.setParams({ colorOffset: value });
      });

    this.gui.add(this.guiParams, 'autoRotate')
      .name('自动旋转')
      .onChange((value: boolean) => {
        this.state.autoRotate = value;
      });

    this.gui.add(this.guiParams, 'reset')
      .name('重置粒子系统');
  }

  private setupEventListeners(): void {
    this.container.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.container.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.container.addEventListener('mouseleave', this.onMouseUp.bind(this));
    this.container.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    this.container.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.container.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.container.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    this.state.isDragging = true;
    this.state.lastMouseX = event.clientX;
    this.state.lastMouseY = event.clientY;
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.state.isDragging) return;

    const deltaX = event.clientX - this.state.lastMouseX;
    this.state.lastMouseX = event.clientX;
    this.state.lastMouseY = event.clientY;

    this.state.sceneRotationY += deltaX * this.sensitivity;
  }

  private onMouseUp(): void {
    this.state.isDragging = false;
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();

    if (event.deltaY > 0) {
      this.state.cameraDistance = Math.min(this.maxDistance, this.state.cameraDistance + this.zoomStep);
    } else {
      this.state.cameraDistance = Math.max(this.minDistance, this.state.cameraDistance - this.zoomStep);
    }
  }

  private onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length === 1) {
      this.state.isDragging = true;
      this.state.lastMouseX = event.touches[0].clientX;
      this.state.lastMouseY = event.touches[0].clientY;
    }
  }

  private onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    if (!this.state.isDragging || event.touches.length !== 1) return;

    const deltaX = event.touches[0].clientX - this.state.lastMouseX;
    this.state.lastMouseX = event.touches[0].clientX;
    this.state.lastMouseY = event.touches[0].clientY;

    this.state.sceneRotationY += deltaX * this.sensitivity;
  }

  private onTouchEnd(): void {
    this.state.isDragging = false;
  }

  public update(): void {
    if (this.state.autoRotate && !this.state.isDragging) {
      this.state.sceneRotationY += 0.001;
    }

    this.scene.rotation.y = this.state.sceneRotationY;

    const distance = this.state.cameraDistance;
    this.camera.position.set(0, 5, distance);
    this.camera.lookAt(0, 0, 0);
  }

  public dispose(): void {
    this.gui.destroy();
    this.container.removeEventListener('mousedown', this.onMouseDown.bind(this));
    this.container.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.container.removeEventListener('mouseup', this.onMouseUp.bind(this));
    this.container.removeEventListener('mouseleave', this.onMouseUp.bind(this));
    this.container.removeEventListener('wheel', this.onWheel.bind(this));
    this.container.removeEventListener('touchstart', this.onTouchStart.bind(this));
    this.container.removeEventListener('touchmove', this.onTouchMove.bind(this));
    this.container.removeEventListener('touchend', this.onTouchEnd.bind(this));
  }
}
