import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CityBuilder } from './CityBuilder';
import { TrafficSimulator } from './TrafficSimulator';
import type { Vehicle } from './TrafficSimulator';
import { TimeManager } from './TimeManager';

class NeonCityApp {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;

  private cityBuilder!: CityBuilder;
  private trafficSimulator!: TrafficSimulator;
  private timeManager!: TimeManager;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();

  private clock: THREE.Clock = new THREE.Clock();
  private isLoading: boolean = true;
  private fpsFrames: number = 0;
  private fpsLastTime: number = performance.now();
  private currentFps: number = 60;
  private isPerformanceMode: boolean = false;
  private perfWarningElapsed: number = 0;
  private lowFpsCount: number = 0;

  private slider!: HTMLInputElement;
  private sliderDragging: boolean = false;

  constructor() {
    this.init();
  }

  private init(): void {
    this.setupThreeJS();
    this.setupControls();
    this.setupEventListeners();
    this.loadScene();
  }

  private setupThreeJS(): void {
    this.scene = new THREE.Scene();

    const container = document.getElementById('canvas-container')!;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 50, 100);
    this.camera.lookAt(0, 20, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    this.scene.fog = new THREE.FogExp2(0x0a0015, 0.004);
  }

  private setupControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 200;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.target.set(0, 15, 0);
    this.controls.enablePan = true;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown.bind(this));

    this.slider = document.getElementById('time-slider') as HTMLInputElement;
    this.slider.addEventListener('mousedown', () => (this.sliderDragging = true));
    this.slider.addEventListener('touchstart', () => (this.sliderDragging = true));
    window.addEventListener('mouseup', () => {
      if (this.sliderDragging) this.sliderDragging = false;
    });
    window.addEventListener('touchend', () => {
      if (this.sliderDragging) this.sliderDragging = false;
    });
    this.slider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      if (this.timeManager) {
        this.timeManager.setTime(val);
      }
    });

    const toggleBtn = document.getElementById('cycle-toggle')!;
    toggleBtn.addEventListener('click', () => {
      if (!this.timeManager) return;
      const playing = this.timeManager.toggleAutoPlay();
      toggleBtn.classList.toggle('paused', !playing);
      const icon = toggleBtn.querySelector('.icon')!;
      const text = toggleBtn.querySelector('.toggle-text')! as HTMLElement;
      icon.textContent = playing ? '🌙' : '☀️';
      text.textContent = playing ? '自动循环' : '已暂停';
    });
  }

  private async loadScene(): Promise<void> {
    const loadingEl = document.getElementById('loading-screen')!;
    const progressEl = document.getElementById('loading-progress')!;

    this.timeManager = new TimeManager(this.scene);

    this.cityBuilder = new CityBuilder();
    const progressInterval = setInterval(() => {
      const val = Math.min(parseInt(progressEl.textContent || '0') + 3, 90);
      progressEl.textContent = val + '%';
    }, 120);

    await this.cityBuilder.build(this.scene);

    clearInterval(progressInterval);
    progressEl.textContent = '95%';

    this.trafficSimulator = new TrafficSimulator();
    this.trafficSimulator.build(this.scene);

    document.getElementById('stat-buildings')!.textContent =
      this.cityBuilder.buildingCount.toString();

    progressEl.textContent = '100%';

    await this.cityBuilder.playRoofWaveAnimation();

    this.isLoading = false;
    loadingEl.classList.add('hidden');

    this.timeManager.onTimeChange = (t) => this.updateUI(t);

    this.animate();
  }

  private onPointerDown(event: PointerEvent): void {
    if (this.isLoading) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const buildingMeshes = this.cityBuilder.getBuildingMeshes();
    const vehicleMeshes = this.trafficSimulator.getVehicleMeshes();
    const allTargets = [...buildingMeshes, ...vehicleMeshes];

    const intersects = this.raycaster.intersectObjects(allTargets, false);

    if (intersects.length > 0) {
      const obj = intersects[0].object as THREE.Mesh;

      if (buildingMeshes.includes(obj)) {
        this.cityBuilder.highlightBuilding(obj);
      }

      if (vehicleMeshes.includes(obj)) {
        const v = this.trafficSimulator.triggerVehicleExplosion(obj);
        if (v) this.showVehicleInfo(v);
      }
    }
  }

  private showVehicleInfo(v: Vehicle): void {
    const panel = document.getElementById('vehicle-info')!;
    const idEl = document.getElementById('vehicle-id')!;
    const spdEl = document.getElementById('vehicle-speed')!;
    const dirEl = document.getElementById('vehicle-direction')!;

    idEl.textContent = '#' + v.id.toString().padStart(3, '0');
    spdEl.textContent = v.speed.toFixed(1) + ' u/s';
    dirEl.textContent = v.axis === 'x' ? (v.direction === 1 ? '→ 东向' : '← 西向') : (v.direction === 1 ? '↑ 北向' : '↓ 南向');

    panel.classList.add('visible');
    setTimeout(() => panel.classList.remove('visible'), 4000);
  }

  private onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private updateUI(t: number): void {
    const { label, clock } = this.timeManager.getPeriodLabel(t);

    const timeLabel = document.getElementById('time-label')!;
    timeLabel.textContent = `${label} ${clock}`;

    const statClock = document.getElementById('stat-clock')!;
    statClock.textContent = clock;

    const statTraffic = document.getElementById('stat-traffic')!;
    statTraffic.textContent = this.trafficSimulator.activeTrafficCount.toString();

    if (!this.sliderDragging) {
      this.slider.value = t.toFixed(2);
    }

    const gradient = this.timeManager.getBackgroundGradient(t);
    document.body.style.background = `linear-gradient(180deg, ${gradient.top} 0%, ${gradient.bottom} 100%)`;

    if (this.scene.fog instanceof THREE.FogExp2) {
      const fogColor = new THREE.Color(gradient.top);
      this.scene.fog.color.copy(fogColor);
    }
  }

  private updateFps(): void {
    this.fpsFrames++;
    const now = performance.now();
    if (now - this.fpsLastTime >= 1000) {
      this.currentFps = (this.fpsFrames * 1000) / (now - this.fpsLastTime);
      this.fpsFrames = 0;
      this.fpsLastTime = now;

      if (this.currentFps < 30) {
        this.lowFpsCount++;
        if (this.lowFpsCount >= 2 && !this.isPerformanceMode) {
          this.enablePerformanceMode();
        }
      } else {
        this.lowFpsCount = Math.max(0, this.lowFpsCount - 1);
      }
    }

    if (this.isPerformanceMode) {
      this.perfWarningElapsed += this.clock.getDelta();
      const warnEl = document.getElementById('performance-warning')!;
      if (this.perfWarningElapsed < 5) {
        warnEl.classList.add('visible');
      } else {
        warnEl.classList.remove('visible');
      }
    }
  }

  private enablePerformanceMode(): void {
    this.isPerformanceMode = true;
    this.perfWarningElapsed = 0;
    this.trafficSimulator.setPerformanceMode(true);
    this.cityBuilder.signalLightsEnabled = false;
    this.renderer.setPixelRatio(1);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    if (!this.isLoading) {
      this.timeManager.update(deltaTime);
      this.cityBuilder.update(this.timeManager.time, deltaTime);
      this.trafficSimulator.update(this.timeManager.time, deltaTime);
      this.updateUI(this.timeManager.time);
      this.updateFps();
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new NeonCityApp();
});
