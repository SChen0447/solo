import * as THREE from 'three';
import { Loom } from './loom';
import { InteractionManager } from './interaction';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private loom: Loom;
  private interactionManager: InteractionManager;
  private clock: THREE.Clock;
  private viewAngle: { theta: number; phi: number } = { theta: 0, phi: 0 };
  private light: THREE.PointLight;
  private lightTarget: THREE.Vector3 = new THREE.Vector3(0, 200, 0);
  private readonly LIGHT_TRACK_SPEED = 0.05;

  private particleSizeSlider: HTMLInputElement | null = null;
  private waveAmplitudeSlider: HTMLInputElement | null = null;
  private colorSpeedSlider: HTMLInputElement | null = null;
  private sizeValueSpan: HTMLElement | null = null;
  private waveValueSpan: HTMLElement | null = null;
  private colorValueSpan: HTMLElement | null = null;
  private resetButton: HTMLButtonElement | null = null;

  private readonly DEFAULT_PARTICLE_SIZE = 3;
  private readonly DEFAULT_WAVE_AMPLITUDE = 15;
  private readonly DEFAULT_COLOR_SPEED = 3;

  constructor() {
    this.container = document.getElementById('app')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 300;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    const viewportHeight = this.getViewportHeight();
    this.loom = new Loom(this.scene, viewportHeight);

    this.interactionManager = new InteractionManager(
      this.loom,
      this.camera,
      this.container,
      (angle) => {
        this.viewAngle = angle;
      }
    );

    this.light = new THREE.PointLight(0xffffff, 0.5, 500);
    this.light.position.set(0, 200, 0);
    this.scene.add(this.light);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambientLight);

    this.setupControlPanel();
    this.bindEvents();
    this.animate();
  }

  private getViewportHeight(): number {
    const fov = this.camera.fov * (Math.PI / 180);
    return 2 * Math.abs(this.camera.position.z) * Math.tan(fov / 2);
  }

  private setupControlPanel(): void {
    this.particleSizeSlider = document.getElementById('particle-size') as HTMLInputElement;
    this.waveAmplitudeSlider = document.getElementById('wave-amplitude') as HTMLInputElement;
    this.colorSpeedSlider = document.getElementById('color-speed') as HTMLInputElement;
    this.sizeValueSpan = document.getElementById('size-value');
    this.waveValueSpan = document.getElementById('wave-value');
    this.colorValueSpan = document.getElementById('color-value');
    this.resetButton = document.getElementById('reset-btn') as HTMLButtonElement;

    if (this.particleSizeSlider) {
      this.particleSizeSlider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.loom.particleSystem.setBaseSize(value);
        if (this.sizeValueSpan) {
          this.sizeValueSpan.textContent = value.toFixed(1);
        }
        this.updateSliderColors();
      });
    }

    if (this.waveAmplitudeSlider) {
      this.waveAmplitudeSlider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.loom.setWaveAmplitude(value);
        if (this.waveValueSpan) {
          this.waveValueSpan.textContent = value.toFixed(1);
        }
        this.updateSliderColors();
      });
    }

    if (this.colorSpeedSlider) {
      this.colorSpeedSlider.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.loom.setColorShiftSpeed(value);
        if (this.colorValueSpan) {
          this.colorValueSpan.textContent = value.toFixed(1);
        }
        this.updateSliderColors();
      });
    }

    if (this.resetButton) {
      this.resetButton.addEventListener('click', () => {
        this.resetParameters();
      });
    }

    this.updateSliderColors();
  }

  private updateSliderColors(): void {
    const dominantColor = this.loom.getDominantColor();
    const colorHex = '#' + dominantColor.getHexString();

    const sliders = document.querySelectorAll('.control-group input[type="range"]');
    sliders.forEach((slider) => {
      (slider as HTMLElement).style.background = 
        `linear-gradient(90deg, ${colorHex}, #48dbfb)`;
    });

    const thumbs = document.querySelectorAll('.control-group input[type="range"]::-webkit-slider-thumb');
    thumbs.forEach((thumb) => {
      (thumb as HTMLElement).style.boxShadow = `0 0 8px ${colorHex}cc`;
    });
  }

  private resetParameters(): void {
    if (this.particleSizeSlider && this.sizeValueSpan) {
      this.particleSizeSlider.value = this.DEFAULT_PARTICLE_SIZE.toString();
      this.loom.particleSystem.setBaseSize(this.DEFAULT_PARTICLE_SIZE);
      this.sizeValueSpan.textContent = this.DEFAULT_PARTICLE_SIZE.toFixed(1);
    }

    if (this.waveAmplitudeSlider && this.waveValueSpan) {
      this.waveAmplitudeSlider.value = this.DEFAULT_WAVE_AMPLITUDE.toString();
      this.loom.setWaveAmplitude(this.DEFAULT_WAVE_AMPLITUDE);
      this.waveValueSpan.textContent = this.DEFAULT_WAVE_AMPLITUDE.toFixed(1);
    }

    if (this.colorSpeedSlider && this.colorValueSpan) {
      this.colorSpeedSlider.value = this.DEFAULT_COLOR_SPEED.toString();
      this.loom.setColorShiftSpeed(this.DEFAULT_COLOR_SPEED);
      this.colorValueSpan.textContent = this.DEFAULT_COLOR_SPEED.toFixed(1);
    }

    this.updateSliderColors();
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize(): void {
    const width = Math.max(window.innerWidth, 800);
    const height = Math.max(window.innerHeight, 600);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);

    const viewportHeight = this.getViewportHeight();
    this.loom.resize(viewportHeight);
    this.interactionManager.resize();
  }

  private updateLight(_delta: number): void {
    this.light.position.x += (this.lightTarget.x - this.light.position.x) * this.LIGHT_TRACK_SPEED;
    this.light.position.y += (this.lightTarget.y - this.light.position.y) * this.LIGHT_TRACK_SPEED;
    this.light.position.z += (this.lightTarget.z - this.light.position.z) * this.LIGHT_TRACK_SPEED;
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.interactionManager.update(time, delta);
    this.loom.update(time, delta, this.viewAngle);
    this.updateLight(delta);

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    window.removeEventListener('resize', this.onResize.bind(this));
    this.interactionManager.dispose();
    this.loom.dispose();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}

const app = new App();

window.addEventListener('beforeunload', () => {
  app.dispose();
});
