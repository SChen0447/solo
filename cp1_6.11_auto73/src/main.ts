import * as THREE from 'three';
import { Ecosystem } from './ecosystem';
import { Plant, PlantType, PlantState } from './plant';
import { Fireflies } from './fireflies';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private ecosystem: Ecosystem;
  private plant: Plant | null = null;
  private fireflies: Fireflies;

  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;

  private isDragging: boolean = false;
  private previousMouseX: number = 0;
  private previousMouseY: number = 0;
  private rotationVelocityX: number = 0;
  private rotationVelocityY: number = 0;
  private readonly INERTIA: number = 0.6;
  private cameraAngleX: number = Math.PI / 4;
  private cameraAngleY: number = Math.PI / 6;
  private cameraDistance: number = 10;
  private readonly MIN_DISTANCE: number = 5;
  private readonly MAX_DISTANCE: number = 30;

  private clock: THREE.Clock;
  private animationFrameId: number | null = null;

  private lightSlider: HTMLInputElement;
  private waterSlider: HTMLInputElement;
  private lightValue: HTMLElement;
  private waterValue: HTMLElement;
  private plantNameEl: HTMLElement;
  private plantHeightEl: HTMLElement;
  private leafCountEl: HTMLElement;
  private healthValueEl: HTMLElement;
  private healthBarEl: HTMLElement;
  private seedButtons: NodeListOf<HTMLButtonElement>;

  private selectedSeed: PlantType | null = null;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0b1d28, 15, 40);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.ambientLight = new THREE.AmbientLight(0x404050, 0.5);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    this.directionalLight.position.set(5, 10, 5);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.camera.left = -10;
    this.directionalLight.shadow.camera.right = 10;
    this.directionalLight.shadow.camera.top = 10;
    this.directionalLight.shadow.camera.bottom = -10;
    this.scene.add(this.directionalLight);

    this.fillLight = new THREE.DirectionalLight(0x7dd3fc, 0.3);
    this.fillLight.position.set(-5, 3, -5);
    this.scene.add(this.fillLight);

    this.ecosystem = new Ecosystem(this.scene);
    this.fireflies = new Fireflies(this.scene, 8);

    this.lightSlider = document.getElementById('light-slider') as HTMLInputElement;
    this.waterSlider = document.getElementById('water-slider') as HTMLInputElement;
    this.lightValue = document.getElementById('light-value')!;
    this.waterValue = document.getElementById('water-value')!;
    this.plantNameEl = document.getElementById('plant-name')!;
    this.plantHeightEl = document.getElementById('plant-height')!;
    this.leafCountEl = document.getElementById('leaf-count')!;
    this.healthValueEl = document.getElementById('health-value')!;
    this.healthBarEl = document.getElementById('health-bar')!;
    this.seedButtons = document.querySelectorAll('.seed-btn') as NodeListOf<HTMLButtonElement>;

    this.setupEventListeners();
    this.updateUI();
    this.animate();
  }

  private setupEventListeners(): void {
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this), { passive: true });
    window.addEventListener('mousemove', this.onMouseMove.bind(this), { passive: true });
    window.addEventListener('mouseup', this.onMouseUp.bind(this), { passive: true });
    this.renderer.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    this.renderer.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
    window.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: true });
    window.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: true });

    this.lightSlider.addEventListener('input', this.onLightChange.bind(this));
    this.waterSlider.addEventListener('input', this.onWaterChange.bind(this));

    this.seedButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const seedType = btn.dataset.seed as PlantType;
        this.selectSeed(seedType, btn);
      });
    });

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.previousMouseX = e.clientX;
    this.previousMouseY = e.clientY;
    this.rotationVelocityX = 0;
    this.rotationVelocityY = 0;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.previousMouseX;
    const deltaY = e.clientY - this.previousMouseY;

    this.rotationVelocityX = deltaX * 0.005;
    this.rotationVelocityY = deltaY * 0.005;

    this.cameraAngleX += this.rotationVelocityX;
    this.cameraAngleY = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.cameraAngleY + this.rotationVelocityY));

    this.previousMouseX = e.clientX;
    this.previousMouseY = e.clientY;

    this.updateCameraPosition();
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.previousMouseX = e.touches[0].clientX;
      this.previousMouseY = e.touches[0].clientY;
      this.rotationVelocityX = 0;
      this.rotationVelocityY = 0;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || e.touches.length !== 1) return;

    const deltaX = e.touches[0].clientX - this.previousMouseX;
    const deltaY = e.touches[0].clientY - this.previousMouseY;

    this.rotationVelocityX = deltaX * 0.005;
    this.rotationVelocityY = deltaY * 0.005;

    this.cameraAngleX += this.rotationVelocityX;
    this.cameraAngleY = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.cameraAngleY + this.rotationVelocityY));

    this.previousMouseX = e.touches[0].clientX;
    this.previousMouseY = e.touches[0].clientY;

    this.updateCameraPosition();
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    
    const zoomSpeed = 0.001;
    this.cameraDistance += e.deltaY * zoomSpeed * this.cameraDistance;
    this.cameraDistance = Math.max(this.MIN_DISTANCE, Math.min(this.MAX_DISTANCE, this.cameraDistance));

    const zoomLevel = 1 - (this.cameraDistance - this.MIN_DISTANCE) / (this.MAX_DISTANCE - this.MIN_DISTANCE);
    const scaledZoom = 0.5 + zoomLevel * 2.5;
    this.ecosystem.setGlassOpacity(scaledZoom);

    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraAngleX) * Math.cos(this.cameraAngleY);
    const y = this.cameraDistance * Math.sin(this.cameraAngleY) + 2;
    const z = this.cameraDistance * Math.cos(this.cameraAngleX) * Math.cos(this.cameraAngleY);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 1, 0);
  }

  private onLightChange(e: Event): void {
    const value = parseInt((e.target as HTMLInputElement).value);
    this.ecosystem.setLightIntensity(value);
    this.lightValue.textContent = `${value}%`;
    
    this.directionalLight.intensity = 0.5 + (value / 100) * 1.5;
    this.ambientLight.intensity = 0.3 + (value / 100) * 0.5;
  }

  private onWaterChange(e: Event): void {
    const value = parseInt((e.target as HTMLInputElement).value);
    this.ecosystem.setWaterAmount(value);
    this.waterValue.textContent = `${value}ml`;
  }

  private selectSeed(type: PlantType, button: HTMLButtonElement): void {
    this.seedButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    this.selectedSeed = type;

    if (this.plant) {
      this.plant.clear();
      this.scene.remove(this.plant.group);
    }

    this.plant = new Plant(type);
    const soilPos = this.ecosystem.getSoilSurfacePosition();
    this.plant.seed(this.scene, soilPos);

    setTimeout(() => {
      if (this.plant && this.selectedSeed === type) {
        this.plant.startGrowth();
      }
    }, 500);

    this.fireflies.setAttractTarget(null);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateUI(): void {
    if (this.plant) {
      const state: PlantState = this.plant.getState();
      this.plantNameEl.textContent = state.name;
      this.plantHeightEl.textContent = state.height.toFixed(1);
      this.leafCountEl.textContent = state.leafCount.toString();
      this.healthValueEl.textContent = state.health.toString();
      this.healthBarEl.style.width = `${state.health}%`;

      this.healthBarEl.classList.remove('warning', 'danger');
      if (state.health < 50) {
        this.healthBarEl.classList.add('danger');
      } else if (state.health < 75) {
        this.healthBarEl.classList.add('warning');
      }
    } else {
      this.plantNameEl.textContent = '--';
      this.plantHeightEl.textContent = '0';
      this.leafCountEl.textContent = '0';
      this.healthValueEl.textContent = '0';
      this.healthBarEl.style.width = '0%';
    }
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    if (!this.isDragging) {
      this.cameraAngleX += this.rotationVelocityX;
      this.cameraAngleY = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.cameraAngleY + this.rotationVelocityY));
      
      this.rotationVelocityX *= this.INERTIA;
      this.rotationVelocityY *= this.INERTIA;

      if (Math.abs(this.rotationVelocityX) > 0.0001 || Math.abs(this.rotationVelocityY) > 0.0001) {
        this.updateCameraPosition();
      }
    }

    this.ecosystem.update(deltaTime);

    if (this.plant) {
      const growthFactor = this.ecosystem.getGrowthFactor();
      const lightIntensity = this.ecosystem.getLightIntensity();
      this.plant.update(deltaTime, growthFactor, lightIntensity);

      if (this.plant.isMature()) {
        const topPos = this.plant.getTopPosition();
        this.fireflies.setAttractTarget(topPos);
      }
    }

    this.fireflies.update(deltaTime);

    this.updateUI();

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.fireflies.dispose();
    
    if (this.plant) {
      this.plant.clear();
    }

    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}

let app: App | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
  }
});
