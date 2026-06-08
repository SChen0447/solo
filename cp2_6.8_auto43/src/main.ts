import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AudioAnalyzer } from './audioAnalyzer';
import { ShapeGenerator, ShapeType, ThemeType } from './shapeGenerator';
import { UIControls } from './uiControls';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private audioAnalyzer: AudioAnalyzer;
  private shapeGenerator: ShapeGenerator;
  private uiControls: UIControls;
  private container: HTMLElement;
  private clock: THREE.Clock;
  private isRunning: boolean = false;
  private animationId: number = 0;
  private lights: {
    ambient: THREE.AmbientLight;
    point1: THREE.PointLight;
    point2: THREE.PointLight;
  } | null = null;

  constructor() {
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera();
    this.renderer = new THREE.WebGLRenderer();
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.audioAnalyzer = new AudioAnalyzer();
    this.shapeGenerator = new ShapeGenerator();
    this.container = document.createElement('div');
    this.uiControls = new UIControls({
      onSensitivityChange: this.handleSensitivityChange.bind(this),
      onShapeChange: this.handleShapeChange.bind(this),
      onThemeChange: this.handleThemeChange.bind(this),
      onStartCapture: this.handleStartCapture.bind(this),
    });
  }

  init(): void {
    this.createScene();
    this.createCamera();
    this.createRenderer();
    this.createLights();
    this.createControls();
    this.addShape();
    
    this.container.id = 'canvas-container';
    document.body.appendChild(this.container);
    this.container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', this.handleResize.bind(this));
    this.handleResize();
  }

  private createScene(): void {
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 8, 25);
  }

  private createCamera(): void {
    this.camera.fov = 60;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.near = 0.1;
    this.camera.far = 1000;
    this.camera.position.set(0, 0, 7);
    this.camera.updateProjectionMatrix();
  }

  private createRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
  }

  private createLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00aaff, 1, 20);
    pointLight1.position.set(5, 5, 5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff00aa, 0.8, 20);
    pointLight2.position.set(-5, -3, 3);
    this.scene.add(pointLight2);

    this.lights = {
      ambient: ambientLight,
      point1: pointLight1,
      point2: pointLight2,
    };
  }

  private createControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = true;
    this.controls.enablePan = false;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 15;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;
  }

  private addShape(): void {
    const mesh = this.shapeGenerator.getMesh();
    this.scene.add(mesh);
  }

  private handleSensitivityChange(value: number): void {
    this.shapeGenerator.setSensitivity(value);
  }

  private handleShapeChange(shape: ShapeType): void {
    this.shapeGenerator.setShape(shape);
  }

  private handleThemeChange(theme: ThemeType): void {
    this.shapeGenerator.setTheme(theme);
    this.updateLightColors(theme);
  }

  private updateLightColors(theme: ThemeType): void {
    if (!this.lights) return;

    switch (theme) {
      case 'aurora':
        this.lights.point1.color.setHex(0x00aaff);
        this.lights.point2.color.setHex(0xaa00ff);
        break;
      case 'lava':
        this.lights.point1.color.setHex(0xff4400);
        this.lights.point2.color.setHex(0xffaa00);
        break;
      case 'ocean':
        this.lights.point1.color.setHex(0x00ffff);
        this.lights.point2.color.setHex(0xffffff);
        break;
    }
  }

  private async handleStartCapture(): Promise<void> {
    try {
      await this.audioAnalyzer.init();
      this.isRunning = true;
      this.animate();
    } catch (error) {
      console.error('启动音频捕捉失败:', error);
      this.uiControls.showError('无法访问麦克风，请确保已授权麦克风权限。');
    }
  }

  private animate(): void {
    if (!this.isRunning) return;

    this.animationId = requestAnimationFrame(this.animate.bind(this));

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    if (this.audioAnalyzer.ready) {
      const frequencyBands = this.audioAnalyzer.getFrequencyBands();
      const timeDomainData = this.audioAnalyzer.getTimeDomainArray();

      this.shapeGenerator.update(frequencyBands, deltaTime);

      this.uiControls.drawWaveform(timeDomainData);

      if (this.lights) {
        const volume = this.audioAnalyzer.getAverageVolume();
        this.lights.point1.intensity = 1 + volume * 2;
        this.lights.point2.intensity = 0.8 + volume * 2;
      }
    } else {
      this.shapeGenerator.update([0, 0, 0, 0, 0, 0, 0, 0], deltaTime);
    }

    if (this.lights) {
      this.lights.point1.position.x = Math.sin(elapsedTime * 0.5) * 6;
      this.lights.point1.position.y = Math.cos(elapsedTime * 0.3) * 4;
      this.lights.point2.position.x = Math.cos(elapsedTime * 0.4) * 5;
      this.lights.point2.position.y = Math.sin(elapsedTime * 0.6) * 3;
    }

    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }

  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.uiControls.updateWaveformSize();
  }

  dispose(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    window.removeEventListener('resize', this.handleResize.bind(this));

    this.controls.dispose();
    this.shapeGenerator.dispose();
    this.audioAnalyzer.dispose();
    this.renderer.dispose();
  }
}

const app = new App();
app.init();

export default app;
