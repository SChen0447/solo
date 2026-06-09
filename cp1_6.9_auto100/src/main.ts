import * as THREE from 'three';
import { createTerrain, TerrainModule } from './terrain';
import { createAurora, AuroraModule, AuroraConfig } from './aurora';
import { createStars, StarsModule, StarsConfig } from './stars';

interface AppConfig {
  auroraIntensity: number;
  colorSaturation: number;
  starSpeed: number;
}

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private clock: THREE.Clock;

  private terrain!: TerrainModule;
  private aurora!: AuroraModule;
  private stars!: StarsModule;

  private config: AppConfig = {
    auroraIntensity: 1.0,
    colorSaturation: 1.0,
    starSpeed: 1.0
  };

  private targetTheta = Math.PI * 0.3;
  private targetPhi = Math.PI * 0.42;
  private targetRadius = 30;
  private currentTheta = Math.PI * 0.3;
  private currentPhi = Math.PI * 0.42;
  private currentRadius = 30;

  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  private damping = 0.08;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.setupBackground();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.initModules();
    this.bindEvents();
    this.bindControls();
    this.updateSliderFills();

    this.animate = this.animate.bind(this);
    this.animate();
  }

  private setupBackground(): void {
    const topColor = new THREE.Color('#0a0a2e');
    const bottomColor = new THREE.Color('#1a1a4e');
    this.scene.background = null;

    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#' + topColor.getHexString());
    gradient.addColorStop(1, '#' + bottomColor.getHexString());
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    this.scene.background = texture;
  }

  private initModules(): void {
    this.terrain = createTerrain();
    this.scene.add(this.terrain.group);

    this.aurora = createAurora();
    this.scene.add(this.aurora.group);

    this.stars = createStars();
    this.scene.add(this.stars.group);
  }

  private updateCameraPosition(): void {
    const x = this.currentRadius * Math.sin(this.currentPhi) * Math.sin(this.currentTheta);
    const y = this.currentRadius * Math.cos(this.currentPhi);
    const z = this.currentRadius * Math.sin(this.currentPhi) * Math.cos(this.currentTheta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 3, -5);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.onResize());

    const dom = this.renderer.domElement;
    dom.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mouseup', () => this.onMouseUp());
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    dom.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;

    this.targetTheta -= dx * 0.005;
    this.targetPhi -= dy * 0.005;
    this.targetPhi = Math.max(0.1, Math.min(Math.PI * 0.49, this.targetPhi));
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.targetRadius += e.deltaY * 0.02;
    this.targetRadius = Math.max(10, Math.min(50, this.targetRadius));
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private bindControls(): void {
    const intensitySlider = document.getElementById('intensity-slider') as HTMLInputElement;
    const intensityValue = document.getElementById('intensity-value') as HTMLElement;
    const intensityFill = document.getElementById('intensity-fill') as HTMLElement;

    const saturationSlider = document.getElementById('saturation-slider') as HTMLInputElement;
    const saturationValue = document.getElementById('saturation-value') as HTMLElement;
    const saturationFill = document.getElementById('saturation-fill') as HTMLElement;

    const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    const speedValue = document.getElementById('speed-value') as HTMLElement;
    const speedFill = document.getElementById('speed-fill') as HTMLElement;

    const updateFill = (slider: HTMLInputElement, fill: HTMLElement): void => {
      const min = parseFloat(slider.min);
      const max = parseFloat(slider.max);
      const val = parseFloat(slider.value);
      const pct = ((val - min) / (max - min)) * 100;
      fill.style.width = pct + '%';
    };

    intensitySlider.addEventListener('input', () => {
      this.config.auroraIntensity = parseFloat(intensitySlider.value);
      intensityValue.textContent = this.config.auroraIntensity.toFixed(1);
      updateFill(intensitySlider, intensityFill);
    });

    saturationSlider.addEventListener('input', () => {
      this.config.colorSaturation = parseFloat(saturationSlider.value);
      saturationValue.textContent = this.config.colorSaturation.toFixed(2);
      updateFill(saturationSlider, saturationFill);
    });

    speedSlider.addEventListener('input', () => {
      this.config.starSpeed = parseFloat(speedSlider.value);
      speedValue.textContent = this.config.starSpeed.toFixed(1);
      updateFill(speedSlider, speedFill);
    });

    this.updateSliderFills = () => {
      updateFill(intensitySlider, intensityFill);
      updateFill(saturationSlider, saturationFill);
      updateFill(speedSlider, speedFill);
    };
  }

  private updateSliderFills(): void {
  }

  private animate(): void {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta() * 1000;
    const time = this.clock.getElapsedTime() * 1000;

    this.currentTheta += (this.targetTheta - this.currentTheta) * this.damping;
    this.currentPhi += (this.targetPhi - this.currentPhi) * this.damping;
    this.currentRadius += (this.targetRadius - this.currentRadius) * this.damping;
    this.updateCameraPosition();

    this.terrain.update(time);

    const auroraConfig: AuroraConfig = {
      intensity: this.config.auroraIntensity,
      saturation: this.config.colorSaturation
    };
    this.aurora.update(time, auroraConfig);

    const starsConfig: StarsConfig = {
      speed: this.config.starSpeed
    };
    this.stars.update(delta, starsConfig);

    this.renderer.render(this.scene, this.camera);
  }
}

new App();
