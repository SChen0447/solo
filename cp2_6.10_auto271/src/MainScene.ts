import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { NebulaSystem, ColorTheme } from './NebulaSystem';
import { UIManager } from './UIManager';

class MainScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private nebulaSystem: NebulaSystem;
  private uiManager: UIManager;
  private clock: THREE.Clock;
  private animationId: number = 0;
  private tempVec3: THREE.Vector3 = new THREE.Vector3();

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000011);

    this.clock = new THREE.Clock();

    const container = document.getElementById('canvas-container');
    if (!container) {
      throw new Error('Canvas container not found');
    }

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 2, 10);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setClearColor(0x000011, 1);
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 20;
    this.controls.enablePan = false;

    this.nebulaSystem = new NebulaSystem();
    this.scene.add(this.nebulaSystem.points);

    this.uiManager = new UIManager({
      onDensityChange: (level: number) => {
        this.nebulaSystem.setDensity(level);
      },
      onSpeedChange: (speed: number) => {
        this.nebulaSystem.setSpeed(speed);
      },
      onThemeChange: (theme: ColorTheme) => {
        this.nebulaSystem.setColorTheme(theme);
      },
      onParticleClick: (index: number, _worldPos: THREE.Vector3) => {
        this.handleParticleClick(index);
      }
    });

    this.uiManager.updateParticleCount(this.nebulaSystem.particleCount);

    this.bindEvents();
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.onResize());

    this.renderer.domElement.addEventListener('click', (event: MouseEvent) => {
      this.uiManager.handleClick(event, this.camera, this.nebulaSystem.points);
    });
  }

  private handleParticleClick(index: number): void {
    const density = this.nebulaSystem.getParticleDensity(index);
    const colorHex = this.nebulaSystem.getParticleColorHex(index);

    if (!this.nebulaSystem.getParticlePosition(index, this.tempVec3)) {
      return;
    }

    const screenPos = this.worldToScreen(this.tempVec3);
    if (screenPos) {
      this.uiManager.showParticleInfo(screenPos, density, colorHex);
    }

    this.uiManager.updateParticleCount(this.nebulaSystem.particleCount);
  }

  private worldToScreen(worldPos: THREE.Vector3): { x: number; y: number } | null {
    const container = this.uiManager.getCanvasContainer();
    const rect = container.getBoundingClientRect();

    const projected = worldPos.clone().project(this.camera);

    const x = (projected.x * 0.5 + 0.5) * rect.width;
    const y = (-projected.y * 0.5 + 0.5) * rect.height;

    if (projected.z > 1) {
      return null;
    }

    return { x, y };
  }

  private onResize(): void {
    const container = this.uiManager.getCanvasContainer();
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  public start(): void {
    this.animate();
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    this.nebulaSystem.updateParticles(delta);
    this.controls.update();

    this.renderer.render(this.scene, this.camera);

    this.uiManager.updateParticleCount(this.nebulaSystem.particleCount);
  }

  public dispose(): void {
    if (this.animationId !== 0) {
      cancelAnimationFrame(this.animationId);
    }
    this.controls.dispose();
    this.nebulaSystem.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', () => this.onResize());
  }
}

const mainScene = new MainScene();
mainScene.start();
