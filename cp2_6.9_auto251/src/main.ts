import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'dat.gui';
import { BrownianSystem, BrownianParams } from './brownianSystem';

class App {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private brownianSystem!: BrownianSystem;
  private gui!: GUI;
  private clock!: THREE.Clock;

  private container!: HTMLElement;
  private infoTemperature!: HTMLElement;
  private infoViscosity!: HTMLElement;
  private infoSpeed!: HTMLElement;
  private infoFps!: HTMLElement;

  private params: BrownianParams = {
    temperature: 50,
    viscosity: 30,
    particleSize: 0.06
  };

  private frameCount: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 60;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.infoTemperature = document.getElementById('info-temperature')!;
    this.infoViscosity = document.getElementById('info-viscosity')!;
    this.infoSpeed = document.getElementById('info-speed')!;
    this.infoFps = document.getElementById('info-fps')!;

    this.clock = new THREE.Clock();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();
    this.brownianSystem = new BrownianSystem(500);

    this.setupLighting();
    this.setupGUI();
    this.scene.add(this.brownianSystem.getMesh());

    this.handleResize = this.handleResize.bind(this);
    this.animate = this.animate.bind(this);

    window.addEventListener('resize', this.handleResize);
    this.container.appendChild(this.renderer.domElement);

    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0A0A2E');
    gradient.addColorStop(1, '#1A1A4E');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    scene.background = texture;

    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(8, 6, 10);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0A0A2E, 1);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.minDistance = 2;
    controls.maxDistance = 20;
    controls.enablePan = true;
    return controls;
  }

  private setupLighting(): void {
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(5, 5, 5);
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.5);
    fillLight.position.set(-3, -2, -3);
    this.scene.add(fillLight);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);
  }

  private setupGUI(): void {
    this.gui = new GUI({ width: 280 });
    this.gui.domElement.style.position = 'fixed';
    this.gui.domElement.style.top = '20px';
    this.gui.domElement.style.right = '20px';
    this.gui.domElement.style.borderRadius = '8px';
    this.gui.domElement.style.overflow = 'hidden';
    this.gui.domElement.style.background = '#1A1A2E';

    this.gui.add(this.params, 'temperature', 0, 100, 1)
      .name('Temperature')
      .onChange((value: number) => {
        this.brownianSystem.setParams({ temperature: value });
      });

    this.gui.add(this.params, 'viscosity', 0, 100, 1)
      .name('Viscosity')
      .onChange((value: number) => {
        this.brownianSystem.setParams({ viscosity: value });
      });

    this.gui.add(this.params, 'particleSize', 0.02, 0.2, 0.01)
      .name('Particle Size')
      .onChange((value: number) => {
        this.brownianSystem.setParticleSize(value);
      });
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    if (window.innerWidth < 768) {
      this.gui.domElement.style.width = '200px';
    } else {
      this.gui.domElement.style.width = '280px';
    }
  }

  private updateInfoPanel(): void {
    const currentParams = this.brownianSystem.getCurrentParams();
    this.infoTemperature.textContent = currentParams.temperature.toFixed(0);
    this.infoViscosity.textContent = currentParams.viscosity.toFixed(0);
    this.infoSpeed.textContent = this.brownianSystem.getAverageSpeed().toFixed(4);
    this.infoFps.textContent = this.currentFps.toString();
  }

  private animate(): void {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    this.frameCount++;
    this.fpsTime += delta;

    if (this.fpsTime >= 0.5) {
      this.currentFps = Math.round(this.frameCount / this.fpsTime);
      this.frameCount = 0;
      this.fpsTime = 0;
    }

    this.brownianSystem.update(delta);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.updateInfoPanel();
  }

  public dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    this.brownianSystem.dispose();
    this.gui.destroy();
    this.renderer.dispose();
    this.controls.dispose();
  }
}

new App();
