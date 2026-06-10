import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Road } from './Road';
import { TrafficLightSystem, LightState } from './TrafficLight';
import { VehicleManager } from './Vehicle';

class TrafficSimulation {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private road: Road;
  private trafficLightSystem: TrafficLightSystem;
  private vehicleManager: VehicleManager;
  private clock: THREE.Clock;

  private readonly targetFPS = 60;
  private readonly frameInterval = 1 / this.targetFPS;
  private accumulator = 0;

  private readonly defaultCameraPosition = new THREE.Vector3(10.6, 10.6, 10.6);
  private readonly defaultTarget = new THREE.Vector3(0, 0, 0);

  private container: HTMLElement;
  private lightInfoEl: HTMLElement;
  private vehicleCountEl: HTMLElement;
  private vehicleSpeedsEl: HTMLElement;
  private resetBtn: HTMLElement;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.lightInfoEl = document.getElementById('light-info')!;
    this.vehicleCountEl = document.getElementById('vehicle-count')!;
    this.vehicleSpeedsEl = document.getElementById('vehicle-speeds')!;
    this.resetBtn = document.getElementById('reset-btn')!;

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.controls = this.createControls();
    this.clock = new THREE.Clock();

    this.road = new Road();
    this.road.addToScene(this.scene);

    this.trafficLightSystem = new TrafficLightSystem();
    this.trafficLightSystem.addToScene(this.scene);

    this.vehicleManager = new VehicleManager(this.scene, this.trafficLightSystem);

    this.setupLights();
    this.setupEventListeners();
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e27);
    scene.fog = new THREE.Fog(0x0a0e27, 20, 50);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.copy(this.defaultCameraPosition);
    camera.lookAt(this.defaultTarget);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.rotateSpeed = 0.5;
    controls.minDistance = 5;
    controls.maxDistance = 25;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minPolarAngle = 0.1;
    controls.target.copy(this.defaultTarget);
    return controls;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    this.scene.add(directionalLight);

    const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x362d1f, 0.3);
    this.scene.add(hemisphereLight);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());
    this.resetBtn.addEventListener('click', () => this.resetCamera());
  }

  private onWindowResize(): void {
    const minWidth = 1024;
    const minHeight = 768;
    const width = Math.max(window.innerWidth, minWidth);
    const height = Math.max(window.innerHeight, minHeight);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private resetCamera(): void {
    this.camera.position.copy(this.defaultCameraPosition);
    this.controls.target.copy(this.defaultTarget);
    this.controls.update();
  }

  private getStateColor(state: LightState): string {
    switch (state) {
      case 'red': return '#ff3333';
      case 'yellow': return '#ffcc00';
      case 'green': return '#33ff33';
    }
  }

  private getStateText(state: LightState): string {
    switch (state) {
      case 'red': return '红灯';
      case 'yellow': return '黄灯';
      case 'green': return '绿灯';
    }
  }

  private updateUI(): void {
    const nsState = this.trafficLightSystem.getNSState();
    const ewState = this.trafficLightSystem.getEWState();
    const countdown = this.trafficLightSystem.getCountdown();

    this.lightInfoEl.innerHTML = `
      <div class="row">
        <span class="light-status" style="background-color: ${this.getStateColor(nsState)}"></span>
        南北方向：${this.getStateText(nsState)} 倒计时${countdown}秒
      </div>
      <div class="row">
        <span class="light-status" style="background-color: ${this.getStateColor(ewState)}"></span>
        东西方向：${this.getStateText(ewState)} 倒计时${countdown}秒
      </div>
    `;

    this.vehicleCountEl.textContent = `路口车辆总数：${this.vehicleManager.getVehicleCount()}`;

    const speeds = this.vehicleManager.getVehicleSpeeds();
    this.vehicleSpeedsEl.innerHTML = speeds
      .map((s) => `<div class="row">车辆${s.id}速度：${s.speed.toFixed(1)} 单位/秒</div>`)
      .join('');
  }

  private update(deltaTime: number): void {
    this.trafficLightSystem.update(deltaTime);
    this.vehicleManager.update(deltaTime);
    this.controls.update();
    this.updateUI();
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const rawDelta = this.clock.getDelta();
    this.accumulator += rawDelta;

    while (this.accumulator >= this.frameInterval) {
      this.update(this.frameInterval);
      this.accumulator -= this.frameInterval;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new TrafficSimulation();
});
