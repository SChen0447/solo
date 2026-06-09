import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as dat from 'dat.gui';
import {
  ForceFieldManager,
  createPresetFields,
  createDraggedRepulsion,
  createDefaultForceFields
} from './forceField';
import { ParticleSystem } from './particleSystem';

type PresetMode = 'nebula' | 'tornado' | 'fountain';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;

  private forceFieldManager: ForceFieldManager;
  private particleSystem: ParticleSystem;
  private gui!: dat.GUI;

  private clock: THREE.Clock;
  private elapsedTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;
  private fpsAccumulator: number = 0;

  private params: {
    particleCount: number;
    forceStrength: number;
    speedMultiplier: number;
    preset: PresetMode;
  };

  private isDragging: boolean = false;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private dragPlane: THREE.Plane;

  private infoPanel: {
    particles: HTMLElement;
    lines: HTMLElement;
    fps: HTMLElement;
  };

  private lastDragTime: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;

    this.params = {
      particleCount: 10000,
      forceStrength: 1.0,
      speedMultiplier: 1.0,
      preset: 'nebula'
    };

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();

    this.forceFieldManager = new ForceFieldManager();
    this.initDefaultForceFields();

    this.particleSystem = new ParticleSystem(
      this.scene,
      this.forceFieldManager,
      this.params.particleCount
    );

    this.infoPanel = {
      particles: document.getElementById('particle-count')!,
      lines: document.getElementById('line-count')!,
      fps: document.getElementById('fps')!
    };

    this.setupUI();
    this.setupGUI();
    this.setupEventListeners();
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();

    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0A0A1A');
    gradient.addColorStop(1, '#1B1B3A');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    scene.background = texture;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 2, 12);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.rotateSpeed = 0.5;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 3;
    controls.maxDistance = 40;
    return controls;
  }

  private initDefaultForceFields(): void {
    this.forceFieldManager.clear();
    const fields = createDefaultForceFields();
    for (const field of fields) {
      this.forceFieldManager.addField(field);
    }
  }

  private applyPreset(preset: PresetMode): void {
    this.forceFieldManager.clear();
    const fields = createPresetFields(preset);
    for (const field of fields) {
      this.forceFieldManager.addField(field);
    }
  }

  private setupUI(): void {
    const particleSlider = document.getElementById('particle-slider') as HTMLInputElement;
    const particleValue = document.getElementById('particle-value')!;
    particleSlider.addEventListener('input', () => {
      const value = parseInt(particleSlider.value);
      this.params.particleCount = value;
      particleValue.textContent = value.toString();
      this.particleSystem.setMaxParticles(value);
    });

    const forceSlider = document.getElementById('force-slider') as HTMLInputElement;
    const forceValue = document.getElementById('force-value')!;
    forceSlider.addEventListener('input', () => {
      const value = parseFloat(forceSlider.value);
      this.params.forceStrength = value;
      forceValue.textContent = value.toFixed(1);
      this.forceFieldManager.setGlobalStrengthMultiplier(value);
    });

    const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    const speedValue = document.getElementById('speed-value')!;
    speedSlider.addEventListener('input', () => {
      const value = parseFloat(speedSlider.value);
      this.params.speedMultiplier = value;
      speedValue.textContent = value.toFixed(1);
      this.particleSystem.setSpeedMultiplier(value);
    });

    const presetSelect = document.getElementById('preset-select') as HTMLSelectElement;
    presetSelect.addEventListener('change', () => {
      this.params.preset = presetSelect.value as PresetMode;
      this.applyPreset(this.params.preset);
    });

    const resetBtn = document.getElementById('reset-btn')!;
    resetBtn.addEventListener('click', () => {
      this.resetSystem();
    });
  }

  private setupGUI(): void {
    this.gui = new dat.GUI({ autoPlace: false });
    this.gui.domElement.style.display = 'none';
    this.container.appendChild(this.gui.domElement);

    const particleFolder = this.gui.add(this.params, 'particleCount', 1000, 20000, 500);
    particleFolder.name('粒子总数');
    particleFolder.onChange((value: number) => {
      (document.getElementById('particle-slider') as HTMLInputElement).value = value.toString();
      document.getElementById('particle-value')!.textContent = value.toString();
      this.particleSystem.setMaxParticles(value);
    });

    const forceFolder = this.gui.add(this.params, 'forceStrength', 0, 3.0, 0.1);
    forceFolder.name('力场强度');
    forceFolder.onChange((value: number) => {
      (document.getElementById('force-slider') as HTMLInputElement).value = value.toString();
      document.getElementById('force-value')!.textContent = value.toFixed(1);
      this.forceFieldManager.setGlobalStrengthMultiplier(value);
    });

    const speedFolder = this.gui.add(this.params, 'speedMultiplier', 0, 2.0, 0.1);
    speedFolder.name('速度缩放');
    speedFolder.onChange((value: number) => {
      (document.getElementById('speed-slider') as HTMLInputElement).value = value.toString();
      document.getElementById('speed-value')!.textContent = value.toFixed(1);
      this.particleSystem.setSpeedMultiplier(value);
    });

    const presetFolder = this.gui.add(this.params, 'preset', ['nebula', 'tornado', 'fountain']);
    presetFolder.name('预设场景');
    presetFolder.onChange((value: PresetMode) => {
      (document.getElementById('preset-select') as HTMLSelectElement).value = value;
      this.applyPreset(value);
    });

    this.gui.add({ reset: () => this.resetSystem() }, 'reset').name('重置系统');
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());

    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mouseup', () => this.onMouseUp());
    canvas.addEventListener('mouseleave', () => this.onMouseUp());

    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', () => this.onMouseUp());
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateMouse(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getMouseWorldPosition(): THREE.Vector3 | null {
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    this.dragPlane.setFromNormalAndCoplanarPoint(
      cameraDirection.negate(),
      new THREE.Vector3(0, 0, 0)
    );

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const point = new THREE.Vector3();
    const result = this.raycaster.ray.intersectPlane(this.dragPlane, point);

    return result ? point : null;
  }

  private onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.updateMouse(event.clientX, event.clientY);
    this.createDragForce();
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMouse(event.clientX, event.clientY);
    if (this.isDragging) {
      this.createDragForce();
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length > 0) {
      this.isDragging = true;
      this.updateMouse(event.touches[0].clientX, event.touches[0].clientY);
      this.createDragForce();
    }
  }

  private onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length > 0 && this.isDragging) {
      this.updateMouse(event.touches[0].clientX, event.touches[0].clientY);
      this.createDragForce();
    }
  }

  private createDragForce(): void {
    const now = performance.now();
    if (now - this.lastDragTime < 80) return;
    this.lastDragTime = now;

    const position = this.getMouseWorldPosition();
    if (position) {
      const field = createDraggedRepulsion(position);
      this.forceFieldManager.addField(field);
      this.particleSystem.addPulseRing(position);
    }
  }

  private resetSystem(): void {
    this.params.particleCount = 10000;
    this.params.forceStrength = 1.0;
    this.params.speedMultiplier = 1.0;
    this.params.preset = 'nebula';

    (document.getElementById('particle-slider') as HTMLInputElement).value = '10000';
    document.getElementById('particle-value')!.textContent = '10000';

    (document.getElementById('force-slider') as HTMLInputElement).value = '1';
    document.getElementById('force-value')!.textContent = '1.0';

    (document.getElementById('speed-slider') as HTMLInputElement).value = '1';
    document.getElementById('speed-value')!.textContent = '1.0';

    (document.getElementById('preset-select') as HTMLSelectElement).value = 'nebula';

    this.particleSystem.dispose();
    this.particleSystem = new ParticleSystem(
      this.scene,
      this.forceFieldManager,
      this.params.particleCount
    );
    this.particleSystem.setSpeedMultiplier(this.params.speedMultiplier);
    this.applyPreset(this.params.preset);
    this.forceFieldManager.setGlobalStrengthMultiplier(this.params.forceStrength);
  }

  private updateInfoPanel(): void {
    this.infoPanel.particles.textContent = `粒子数: ${this.particleSystem.getActiveParticleCount()}`;
    this.infoPanel.lines.textContent = `连线数: ${this.particleSystem.getLineCount()}`;
    this.infoPanel.fps.textContent = `FPS: ${this.fps}`;
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    this.elapsedTime += deltaTime;

    this.frameCount++;
    this.fpsAccumulator += deltaTime;
    if (this.fpsAccumulator >= 0.5) {
      this.fps = Math.round(this.frameCount / this.fpsAccumulator);
      this.frameCount = 0;
      this.fpsAccumulator = 0;
      this.updateInfoPanel();
    }

    this.controls.update();

    this.forceFieldManager.update(deltaTime, this.elapsedTime);

    this.particleSystem.update(deltaTime, this.fps);

    this.renderer.render(this.scene, this.camera);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
