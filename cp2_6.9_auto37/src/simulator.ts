import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { generateCity, updateTrafficLights, CityData } from './city';
import { TrafficSystem, TrafficStats } from './traffic';
import { UIManager } from './ui';

export interface TimePeriodConfig {
  vehicleCount: number;
  speedMultiplier: number;
  isPeakHour: boolean;
}

export class Simulator {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;

  private cityData: CityData;
  private trafficSystem: TrafficSystem;
  private uiManager: UIManager;

  private currentTime: number = 480;
  private targetTime: number = 480;
  private autoPlay: boolean = true;
  private timeSpeed: number = 2;

  private targetVehicleCount: number = 300;
  private targetSpeedMultiplier: number = 0.7;
  private currentSpeedMultiplier: number = 0.7;

  private clock: THREE.Clock;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) as HTMLElement;
    if (!this.container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0D1117);
    this.scene.fog = new THREE.Fog(0x0D1117, 150, 400);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(120, 100, 120);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 50;
    this.controls.maxDistance = 300;
    this.controls.target.set(0, 0, 0);

    this.setupLights();

    this.cityData = generateCity(this.scene);

    this.trafficSystem = new TrafficSystem(
      this.scene,
      this.cityData.roadSegments,
      this.cityData.intersections
    );
    this.trafficSystem.init(300);

    this.uiManager = new UIManager();
    this.uiManager.onTimeChange((minutes) => {
      this.targetTime = minutes;
      this.updateTimePeriod(minutes);
    });

    this.clock = new THREE.Clock();

    this.updateTimePeriod(this.currentTime);

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private setupLights() {
    const ambientLight = new THREE.AmbientLight(0x404050, 0.6);
    this.scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x2a2a3e, 0.4);
    this.scene.add(hemisphereLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(60, 100, 40);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 300;
    directionalLight.shadow.camera.left = -150;
    directionalLight.shadow.camera.right = 150;
    directionalLight.shadow.camera.top = 150;
    directionalLight.shadow.camera.bottom = -150;
    directionalLight.shadow.bias = -0.0005;
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x8fa8c8, 0.3);
    fillLight.position.set(-50, 60, -60);
    this.scene.add(fillLight);
  }

  private updateTimePeriod(minutes: number) {
    const config = this.getTimePeriodConfig(minutes);
    this.targetVehicleCount = config.vehicleCount;
    this.targetSpeedMultiplier = config.speedMultiplier;
  }

  private getTimePeriodConfig(minutes: number): TimePeriodConfig {
    if (minutes >= 420 && minutes < 540) {
      const progress = (minutes - 420) / 120;
      const peakFactor = Math.sin(progress * Math.PI);
      return {
        vehicleCount: Math.floor(300 + 300 * peakFactor),
        speedMultiplier: 0.3 + 0.2 * (1 - peakFactor),
        isPeakHour: true
      };
    }

    if (minutes >= 720 && minutes < 840) {
      const progress = (minutes - 720) / 120;
      const peakFactor = Math.sin(progress * Math.PI);
      return {
        vehicleCount: Math.floor(300 + 150 * peakFactor),
        speedMultiplier: 0.5 + 0.1 * (1 - peakFactor),
        isPeakHour: false
      };
    }

    if (minutes >= 1020 && minutes < 1140) {
      const progress = (minutes - 1020) / 120;
      const peakFactor = Math.sin(progress * Math.PI);
      return {
        vehicleCount: Math.floor(300 + 280 * peakFactor),
        speedMultiplier: 0.35 + 0.15 * (1 - peakFactor),
        isPeakHour: true
      };
    }

    if (minutes >= 1320 || minutes < 360) {
      return {
        vehicleCount: 50,
        speedMultiplier: 1.0,
        isPeakHour: false
      };
    }

    if ((minutes >= 360 && minutes < 420) || (minutes >= 1140 && minutes < 1320)) {
      const transition = minutes < 420
        ? (minutes - 360) / 60
        : 1 - (minutes - 1140) / 180;
      return {
        vehicleCount: Math.floor(50 + 250 * transition),
        speedMultiplier: 1.0 - 0.4 * transition,
        isPeakHour: false
      };
    }

    return {
      vehicleCount: 300,
      speedMultiplier: 0.7,
      isPeakHour: false
    };
  }

  private isPeakHour(minutes: number): boolean {
    return (minutes >= 420 && minutes < 540) || (minutes >= 1020 && minutes < 1140);
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private smoothUpdate(deltaTime: number) {
    const smoothing = 1 - Math.pow(0.01, deltaTime);

    this.currentTime += (this.targetTime - this.currentTime) * smoothing;

    this.currentSpeedMultiplier += (this.targetSpeedMultiplier - this.currentSpeedMultiplier) * smoothing;
    this.trafficSystem.setAverageSpeedMultiplier(this.currentSpeedMultiplier);

    this.trafficSystem.setVehicleCount(this.targetVehicleCount);

    this.uiManager.setTime(Math.round(this.currentTime));
  }

  private updateAutoTime(deltaTime: number) {
    if (this.autoPlay) {
      this.targetTime += deltaTime * this.timeSpeed * 10;
      if (this.targetTime > 1440) {
        this.targetTime = 360;
      }
      this.updateTimePeriod(this.targetTime);
    }
  }

  public update() {
    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.updateAutoTime(deltaTime);
    this.smoothUpdate(deltaTime);

    const isPeak = this.isPeakHour(this.currentTime);
    updateTrafficLights(this.cityData.intersections, deltaTime, isPeak);

    this.trafficSystem.update(deltaTime, this.currentTime);

    this.controls.update();

    const stats: TrafficStats = this.trafficSystem.getStats();
    this.uiManager.updateStats({
      simTime: this.uiManager.formatTime(Math.round(this.currentTime)),
      vehicleCount: stats.totalVehicles,
      averageSpeed: stats.averageSpeed
    });

    this.renderer.render(this.scene, this.camera);

    this.frameCount++;
  }

  public start() {
    const animate = () => {
      requestAnimationFrame(animate);
      this.update();
    };
    animate();
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getControls(): OrbitControls {
    return this.controls;
  }
}
