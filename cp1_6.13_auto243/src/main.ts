import * as THREE from 'three';
import gsap from 'gsap';
import { createGarden, GardenObjects, updatePlantColors, bendPlants, updateStreamColors, updateFountainHeight, updateBarrierLines, updateStreamFlow } from './scene';
import { EffectsManager } from './effects';

class MirrorGarden {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private garden: GardenObjects;
  private effects: EffectsManager;

  private azimuth: number = 0;
  private elevation: number = 30 * Math.PI / 180;
  private distance: number = 10;
  private targetAzimuth: number = 0;
  private targetElevation: number = 30 * Math.PI / 180;
  private targetDistance: number = 10;

  private minDistance: number = 5;
  private maxDistance: number = 20;
  private minElevation: number = 5 * Math.PI / 180;
  private maxElevation: number = 85 * Math.PI / 180;

  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private mouseVelocity: number = 0;
  private dragSpeed: number = 0;

  private clock: THREE.Clock;
  private animationId: number = 0;

  private fpsFrames: number = 0;
  private fpsLastTime: number = 0;
  private currentFps: number = 0;

  private fountainHeight: number = 2;
  private targetFountainHeight: number = 2;
  private minFountainHeight: number = 1.5;
  private maxFountainHeight: number = 3;

  private initialAzimuth: number = 0;
  private initialElevation: number = 30 * Math.PI / 180;
  private initialDistance: number = 10;

  private container: HTMLElement;
  private azimuthEl: HTMLElement;
  private elevationEl: HTMLElement;
  private distanceEl: HTMLElement;
  private fpsEl: HTMLElement;
  private resetBtn: HTMLElement;

  constructor() {
    this.container = document.getElementById('app') || document.body;
    this.azimuthEl = document.getElementById('azimuth')!;
    this.elevationEl = document.getElementById('elevation')!;
    this.distanceEl = document.getElementById('distance')!;
    this.fpsEl = document.getElementById('fpsCounter')!;
    this.resetBtn = document.getElementById('resetBtn')!;

    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });

    this.setupRenderer();
    this.setupLights();
    this.garden = createGarden(this.scene);
    this.effects = new EffectsManager(this.scene);

    this.setupEventListeners();
    this.updateCameraPosition();
    this.animate();
  }

  private setupRenderer(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 10, 5);
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x818cf8, 0.4);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);

    const bottomLight = new THREE.DirectionalLight(0xf472b6, 0.3);
    bottomLight.position.set(0, -5, 0);
    this.scene.add(bottomLight);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    
    this.renderer.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    this.renderer.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.renderer.domElement.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.renderer.domElement.addEventListener('touchend', this.onTouchEnd.bind(this));

    this.resetBtn.addEventListener('click', this.resetView.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.dragSpeed = 0;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      this.targetFountainHeight = this.minFountainHeight + 
        (1 - (ny + 1) / 2) * (this.maxFountainHeight - this.minFountainHeight);
      return;
    }

    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;
    
    this.dragSpeed = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    this.targetAzimuth -= deltaX * 0.005;
    this.targetElevation += deltaY * 0.003;
    this.targetElevation = Math.max(this.minElevation, Math.min(this.maxElevation, this.targetElevation));

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    
    const delta = e.deltaY * 0.01;
    this.targetDistance += delta;
    this.targetDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.targetDistance));
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      e.preventDefault();
      this.isDragging = true;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || e.touches.length !== 1) return;
    e.preventDefault();

    const deltaX = e.touches[0].clientX - this.lastMouseX;
    const deltaY = e.touches[0].clientY - this.lastMouseY;

    this.dragSpeed = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    this.targetAzimuth -= deltaX * 0.005;
    this.targetElevation += deltaY * 0.003;
    this.targetElevation = Math.max(this.minElevation, Math.min(this.maxElevation, this.targetElevation));

    this.lastMouseX = e.touches[0].clientX;
    this.lastMouseY = e.touches[0].clientY;
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  private resetView(): void {
    gsap.to(this, {
      targetAzimuth: this.initialAzimuth,
      targetElevation: this.initialElevation,
      targetDistance: this.initialDistance,
      duration: 1,
      ease: 'power2.out'
    });
  }

  private updateCameraPosition(): void {
    this.azimuth += (this.targetAzimuth - this.azimuth) * 0.1;
    this.elevation += (this.targetElevation - this.elevation) * 0.1;
    this.distance += (this.targetDistance - this.distance) * 0.1;

    this.fountainHeight += (this.targetFountainHeight - this.fountainHeight) * 0.05;

    const x = this.distance * Math.cos(this.elevation) * Math.sin(this.azimuth);
    const y = this.distance * Math.sin(this.elevation);
    const z = this.distance * Math.cos(this.elevation) * Math.cos(this.azimuth);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 1, 0);

    this.effects.setFountainHeight(this.fountainHeight);

    const windOffset = (this.distance - 10) / 15 * (15 * Math.PI / 180);
    this.effects.setWindOffset(windOffset * 3);
  }

  private updateUI(): void {
    const azimuthDeg = ((this.azimuth * 180 / Math.PI) % 360 + 360) % 360;
    const elevationDeg = this.elevation * 180 / Math.PI;
    
    this.azimuthEl.textContent = azimuthDeg.toFixed(0) + '°';
    this.elevationEl.textContent = elevationDeg.toFixed(0) + '°';
    this.distanceEl.textContent = this.distance.toFixed(1);
    this.fpsEl.textContent = 'FPS: ' + Math.round(this.currentFps);
  }

  private calculateFPS(deltaTime: number): void {
    this.fpsFrames++;
    const now = performance.now();
    
    if (now - this.fpsLastTime >= 1000) {
      this.currentFps = (this.fpsFrames * 1000) / (now - this.fpsLastTime);
      this.fpsFrames = 0;
      this.fpsLastTime = now;
    }
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    this.calculateFPS(deltaTime);
    this.updateCameraPosition();
    this.updateUI();

    updateFountainHeight(this.garden.fountain, this.fountainHeight);

    updateStreamColors(this.garden.streams, elapsedTime);
    updateStreamFlow(this.garden.streams, Math.min(1, this.dragSpeed / 50));

    updatePlantColors(this.garden.plants, this.azimuth + Math.PI);

    const bendAmount = (this.distance - 10) / 15 * 0.3;
    bendPlants(this.garden.plants, bendAmount);

    updateBarrierLines(this.garden.barrierLines, elapsedTime);

    this.effects.update(deltaTime, elapsedTime);

    this.dragSpeed *= 0.95;

    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.renderer.dispose();
    this.effects.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new MirrorGarden();
});
