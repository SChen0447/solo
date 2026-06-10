import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ElectromagneticWave, PolarizationMode } from './wave';
import { UIController } from './ui';

class App {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private wave!: ElectromagneticWave;
  private ui!: UIController;

  private clock: THREE.Clock = new THREE.Clock();
  private frameCount: number = 0;
  private fpsTimer: number = 0;
  private currentFPS: number = 60;

  private gridSphere!: THREE.Mesh;
  private axesHelper!: THREE.AxesHelper;

  constructor() {
    this.init();
    this.animate();
  }

  private init(): void {
    this.initScene();
    this.initCamera();
    this.initRenderer();
    this.initControls();
    this.initLighting();
    this.initHelpers();
    this.initWave();
    this.initUI();
    this.handleResize();
  }

  private initScene(): void {
    this.scene = new THREE.Scene();

    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(1, '#1a1a3e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  private initCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(8, 6, 10);
    this.camera.lookAt(0, 0, 0);
  }

  private initRenderer(): void {
    const container = document.getElementById('scene-container')!;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);
  }

  private initControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 20;
    this.controls.enablePan = true;
    this.controls.target.set(0, 0, 0);
  }

  private initLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404080, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    this.scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x00d4ff, 0.5, 30);
    pointLight1.position.set(-5, 5, 5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff6b6b, 0.3, 30);
    pointLight2.position.set(5, -3, -5);
    this.scene.add(pointLight2);
  }

  private initHelpers(): void {
    const sphereGeometry = new THREE.SphereGeometry(5, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x3a3a6a,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });
    this.gridSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.scene.add(this.gridSphere);

    this.axesHelper = new THREE.AxesHelper(6);
    this.scene.add(this.axesHelper);

    const gridHelper = new THREE.GridHelper(12, 12, 0x3a3a6a, 0x2a2a4a);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.2;
    this.scene.add(gridHelper);
  }

  private initWave(): void {
    this.wave = new ElectromagneticWave();
    this.scene.add(this.wave.group);
  }

  private initUI(): void {
    this.ui = new UIController({
      onFrequencyChange: (freq: number) => {
        this.wave.setFrequency(freq);
      },
      onAmplitudeChange: (amp: number) => {
        this.wave.setAmplitude(amp);
      },
      onPhaseDiffChange: (phase: number) => {
        this.wave.setPhaseDiff(phase);
      },
      onPolarizationChange: (mode: PolarizationMode) => {
        this.wave.setPolarization(mode);
      },
      getPolarizationState: () => {
        const params = this.wave.getParams();
        let hAmp = 1;
        if (params.polarization === 'elliptical') hAmp = 0.6;
        return {
          eAmp: params.amplitude,
          hAmp: params.amplitude * hAmp,
          phaseDiff: (params.phaseDiff * Math.PI) / 180,
          polarization: params.polarization
        };
      }
    });
  }

  private handleResize(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();

    this.wave.update(deltaTime);
    this.controls.update();

    this.frameCount++;
    this.fpsTimer += deltaTime;
    if (this.fpsTimer >= 0.5) {
      this.currentFPS = this.frameCount / this.fpsTimer;
      this.ui.updateFPS(this.currentFPS);
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
