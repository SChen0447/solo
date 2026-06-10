import * as THREE from 'three';
import { SceneManager } from './scene';
import { Simulator, type SimulationParams, type HudData } from './simulation';
import { ParticleFlow, AccretionDisk } from './visuals';

const DEFAULT_PARAMS: SimulationParams = {
  transferRate: 0.5,
  viscosity: 0.05,
  jetStrength: 0.7,
  maxParticles: 1500
};

class StarSystem {
  private whiteDwarf: THREE.Mesh;
  private mainSequence: THREE.Mesh;
  private wdGlow: THREE.Mesh;
  private msGlow: THREE.Mesh;

  constructor(private sceneManager: SceneManager) {
    this.whiteDwarf = this.sceneManager.addStar({
      radius: 0.3,
      color: 0xffffff,
      position: new THREE.Vector3(0, 0, 0)
    });

    this.mainSequence = this.sceneManager.addStar({
      radius: 0.8,
      color: 0xffaa00,
      position: new THREE.Vector3(4, 0, 0)
    });

    this.wdGlow = this.createGlowMesh(0.45, 0xffffff, 0.4);
    this.msGlow = this.createGlowMesh(1.1, 0xffaa00, 0.35);
    this.sceneManager.addObject(this.wdGlow);
    this.sceneManager.addObject(this.msGlow);
  }

  private createGlowMesh(radius: number, color: number, opacity: number): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(color) },
        opacity: { value: opacity }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float opacity;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(glowColor, intensity * opacity);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });
    return new THREE.Mesh(geometry, material);
  }

  public update(wdPos: THREE.Vector3, msPos: THREE.Vector3): void {
    this.whiteDwarf.position.copy(wdPos);
    this.mainSequence.position.copy(msPos);
    this.wdGlow.position.copy(wdPos);
    this.msGlow.position.copy(msPos);
    this.sceneManager.updateLightPosition(0, wdPos);
    this.sceneManager.updateLightPosition(1, msPos);
  }
}

class CameraController {
  private isDragging: boolean = false;
  private lastX: number = 0;
  private lastY: number = 0;
  private theta: number = 0;
  private phi: number = Math.PI / 2;
  private radius: number = 8;
  private autoRotate: boolean = true;
  private autoRotateSpeed: number = 0.02;
  private target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  constructor(
    private camera: THREE.PerspectiveCamera,
    private domElement: HTMLElement
  ) {
    this.setupEventListeners();
    this.updateCameraPosition();
  }

  private setupEventListeners(): void {
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    this.domElement.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        this.isDragging = true;
        this.autoRotate = false;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        this.isDragging = false;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.lastX;
      const deltaY = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;

      this.theta -= deltaX * 0.005;
      this.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.phi - deltaY * 0.005));
      this.updateCameraPosition();
    });

    this.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.radius = Math.max(3, Math.min(20, this.radius + e.deltaY * 0.005));
      this.updateCameraPosition();
    }, { passive: false });
  }

  private updateCameraPosition(): void {
    const x = this.target.x + this.radius * Math.sin(this.phi) * Math.cos(this.theta);
    const y = this.target.y + this.radius * Math.cos(this.phi);
    const z = this.target.z + this.radius * Math.sin(this.phi) * Math.sin(this.theta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }

  public update(deltaTime: number): void {
    if (this.autoRotate) {
      this.theta += this.autoRotateSpeed * deltaTime;
      this.updateCameraPosition();
    }
  }
}

class UIController {
  private params: SimulationParams;
  private onParamsChange: (params: Partial<SimulationParams>) => void;

  constructor(
    initialParams: SimulationParams,
    onParamsChange: (params: Partial<SimulationParams>) => void
  ) {
    this.params = { ...initialParams };
    this.onParamsChange = onParamsChange;
    this.setupSliders();
  }

  private setupSliders(): void {
    const transferSlider = document.getElementById('slider-transfer') as HTMLInputElement;
    const viscositySlider = document.getElementById('slider-viscosity') as HTMLInputElement;
    const jetSlider = document.getElementById('slider-jet') as HTMLInputElement;
    const countSlider = document.getElementById('slider-count') as HTMLInputElement;

    const transferVal = document.getElementById('val-transfer') as HTMLElement;
    const viscosityVal = document.getElementById('val-viscosity') as HTMLElement;
    const jetVal = document.getElementById('val-jet') as HTMLElement;
    const countVal = document.getElementById('val-count') as HTMLElement;

    transferSlider.addEventListener('input', () => {
      const v = parseFloat(transferSlider.value);
      this.params.transferRate = v;
      transferVal.textContent = v.toFixed(2);
      this.onParamsChange({ transferRate: v });
    });

    viscositySlider.addEventListener('input', () => {
      const v = parseFloat(viscositySlider.value);
      this.params.viscosity = v;
      viscosityVal.textContent = v.toFixed(3);
      this.onParamsChange({ viscosity: v });
    });

    jetSlider.addEventListener('input', () => {
      const v = parseFloat(jetSlider.value);
      this.params.jetStrength = v;
      jetVal.textContent = v.toFixed(2);
      this.onParamsChange({ jetStrength: v });
    });

    countSlider.addEventListener('input', () => {
      const v = parseInt(countSlider.value, 10);
      this.params.maxParticles = v;
      countVal.textContent = v.toString();
      this.onParamsChange({ maxParticles: v });
    });
  }

  public updateHud(data: HudData): void {
    const hudParticles = document.getElementById('hud-particles') as HTMLElement;
    const hudAngular = document.getElementById('hud-angular') as HTMLElement;
    const hudFlow = document.getElementById('hud-flow') as HTMLElement;
    const hudPeriod = document.getElementById('hud-period') as HTMLElement;

    if (hudParticles) hudParticles.textContent = data.totalParticles.toString();
    if (hudAngular) hudAngular.textContent = data.diskAngularVelocity.toFixed(3);
    if (hudFlow) hudFlow.textContent = Math.round(data.transferFlow).toString();
    if (hudPeriod) hudPeriod.textContent = data.orbitalPeriod.toFixed(2);
  }
}

class Application {
  private sceneManager: SceneManager;
  private starSystem: StarSystem;
  private simulator: Simulator;
  private particleFlow: ParticleFlow;
  private accretionDisk: AccretionDisk;
  private cameraController: CameraController;
  private uiController: UIController;
  private clock: THREE.Clock;
  private running: boolean = false;

  constructor(container: HTMLElement) {
    this.sceneManager = new SceneManager(container);
    this.starSystem = new StarSystem(this.sceneManager);
    this.simulator = new Simulator({ ...DEFAULT_PARAMS });
    this.particleFlow = new ParticleFlow(this.sceneManager, DEFAULT_PARAMS.maxParticles);
    this.accretionDisk = new AccretionDisk(this.sceneManager);
    this.cameraController = new CameraController(
      this.sceneManager.camera,
      this.sceneManager.renderer.domElement
    );
    this.uiController = new UIController(
      { ...DEFAULT_PARAMS },
      (params) => this.handleParamsChange(params)
    );
    this.clock = new THREE.Clock();
  }

  private handleParamsChange(params: Partial<SimulationParams>): void {
    if (params.maxParticles !== undefined) {
      this.particleFlow.resizeMaxParticles(params.maxParticles);
    }
    this.simulator.setParams(params);
  }

  public start(): void {
    this.running = true;
    this.animate();
  }

  public stop(): void {
    this.running = false;
  }

  private animate(): void {
    if (!this.running) return;

    requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.05);

    this.cameraController.update(deltaTime);

    const particleData = this.simulator.update(deltaTime);

    const wd = this.simulator.getWhiteDwarf();
    const ms = this.simulator.getMainSequence();
    this.starSystem.update(wd.position, ms.position);

    this.particleFlow.update(particleData);
    this.accretionDisk.update(deltaTime, this.simulator.getPrecessionAngle(), wd.position);

    const hudData = this.simulator.getHudData();
    this.uiController.updateHud(hudData);

    this.sceneManager.render();
  }

  public dispose(): void {
    this.stop();
    this.particleFlow.dispose();
    this.accretionDisk.dispose();
    this.sceneManager.dispose();
  }
}

function init(): void {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('Canvas container not found');
    return;
  }

  const app = new Application(container);
  app.start();

  window.addEventListener('beforeunload', () => {
    app.dispose();
  });
}

init();
