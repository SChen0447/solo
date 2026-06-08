import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { CloudSystem, WeatherType } from './cloudSystem';
import { LightningSystem } from './lightning';
import { UIManager } from './ui';

interface WeatherLighting {
  ambientColor: THREE.Color;
  ambientIntensity: number;
  directionalColor: THREE.Color;
  directionalIntensity: number;
  fogColor: THREE.Color;
  fogDensity: number;
  stormAmbientColor: THREE.Color;
  stormAmbientIntensity: number;
}

const WEATHER_LIGHTING: Record<WeatherType, WeatherLighting> = {
  sunny: {
    ambientColor: new THREE.Color(0xfff5e6),
    ambientIntensity: 0.6,
    directionalColor: new THREE.Color(0xffd700),
    directionalIntensity: 1.0,
    fogColor: new THREE.Color(0x87ceeb),
    fogDensity: 0.015,
    stormAmbientColor: new THREE.Color(0xff0000),
    stormAmbientIntensity: 0
  },
  cloudy: {
    ambientColor: new THREE.Color(0xb0c4de),
    ambientIntensity: 0.5,
    directionalColor: new THREE.Color(0xe0e8f0),
    directionalIntensity: 0.6,
    fogColor: new THREE.Color(0x9db4c9),
    fogDensity: 0.025,
    stormAmbientColor: new THREE.Color(0xff0000),
    stormAmbientIntensity: 0
  },
  rainy: {
    ambientColor: new THREE.Color(0x4a6b8f),
    ambientIntensity: 0.4,
    directionalColor: new THREE.Color(0x6b8ca8),
    directionalIntensity: 0.3,
    fogColor: new THREE.Color(0x3a4f66),
    fogDensity: 0.04,
    stormAmbientColor: new THREE.Color(0xff0000),
    stormAmbientIntensity: 0
  },
  storm: {
    ambientColor: new THREE.Color(0x2a1a3a),
    ambientIntensity: 0.3,
    directionalColor: new THREE.Color(0x4a3a5a),
    directionalIntensity: 0.2,
    fogColor: new THREE.Color(0x1a1028),
    fogDensity: 0.05,
    stormAmbientColor: new THREE.Color(0x8b0000),
    stormAmbientIntensity: 0.15
  }
};

class App {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private composer!: EffectComposer;
  private bloomPass!: UnrealBloomPass;
  private cloudSystem!: CloudSystem;
  private lightningSystem!: LightningSystem;
  private uiManager!: UIManager;
  private clock: THREE.Clock;
  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;
  private stormAmbientLight!: THREE.AmbientLight;
  private currentLighting!: WeatherLighting;
  private targetLighting!: WeatherLighting;
  private isTransitioning: boolean;
  private transitionProgress: number;
  private transitionDuration: number;
  private container: HTMLElement;
  private animationId!: number;

  constructor() {
    this.container = document.getElementById('app') || document.body;
    this.clock = new THREE.Clock();
    this.isTransitioning = false;
    this.transitionProgress = 1;
    this.transitionDuration = 3;
    this.animationId = 0;

    this.currentLighting = { ...WEATHER_LIGHTING.sunny };
    this.targetLighting = { ...WEATHER_LIGHTING.sunny };

    this.init();
  }

  private init(): void {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 8, 25);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 30;
    this.controls.maxPolarAngle = Math.PI / 2;
    this.controls.target.set(0, 5, 0);

    this.ambientLight = new THREE.AmbientLight(
      this.currentLighting.ambientColor,
      this.currentLighting.ambientIntensity
    );
    this.scene.add(this.ambientLight);

    this.stormAmbientLight = new THREE.AmbientLight(
      this.currentLighting.stormAmbientColor,
      this.currentLighting.stormAmbientIntensity
    );
    this.scene.add(this.stormAmbientLight);

    this.directionalLight = new THREE.DirectionalLight(
      this.currentLighting.directionalColor,
      this.currentLighting.directionalIntensity
    );
    this.directionalLight.position.set(10, 20, 10);
    this.scene.add(this.directionalLight);

    this.scene.fog = new THREE.FogExp2(
      this.currentLighting.fogColor,
      this.currentLighting.fogDensity
    );
    this.scene.background = this.currentLighting.fogColor;

    this.cloudSystem = new CloudSystem(this.scene);
    this.lightningSystem = new LightningSystem(this.scene, this.cloudSystem);

    this.uiManager = new UIManager();
    this.uiManager.setOnWeatherChange((weather: WeatherType) => {
      this.setWeather(weather);
    });
    this.uiManager.setOnSpeedChange((speed: number) => {
      this.cloudSystem.setSpeedMultiplier(speed);
    });

    this.initPostProcessing();
    this.initEventListeners();
    this.animate();
  }

  private initPostProcessing(): void {
    this.composer = new EffectComposer(this.renderer);
    
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.3,
      0.4,
      0.85
    );
    this.bloomPass.strength = 0.5;
    this.bloomPass.radius = 0.5;
    this.bloomPass.threshold = 0.6;
    this.composer.addPass(this.bloomPass);
  }

  private initEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  setWeather(weather: WeatherType): void {
    if (this.cloudSystem.getCurrentWeather() === weather && !this.isTransitioning) return;

    this.targetLighting = { ...WEATHER_LIGHTING[weather] };
    this.isTransitioning = true;
    this.transitionProgress = 0;

    this.cloudSystem.setWeather(weather);
    this.lightningSystem.setActive(weather === 'storm');
  }

  private updateTransition(deltaTime: number): void {
    if (!this.isTransitioning) return;

    this.transitionProgress += deltaTime / this.transitionDuration;

    if (this.transitionProgress >= 1) {
      this.transitionProgress = 1;
      this.isTransitioning = false;
      this.currentLighting = { ...this.targetLighting };
    }

    const t = this.easeInOutCubic(this.transitionProgress);
    this.interpolateLighting(t);
  }

  private interpolateLighting(t: number): void {
    const curr = this.currentLighting;
    const target = this.targetLighting;

    const ambientColor = curr.ambientColor.clone().lerp(target.ambientColor, t);
    const ambientIntensity = curr.ambientIntensity + (target.ambientIntensity - curr.ambientIntensity) * t;

    const directionalColor = curr.directionalColor.clone().lerp(target.directionalColor, t);
    const directionalIntensity = curr.directionalIntensity + (target.directionalIntensity - curr.directionalIntensity) * t;

    const stormAmbientColor = curr.stormAmbientColor.clone().lerp(target.stormAmbientColor, t);
    const stormAmbientIntensity = curr.stormAmbientIntensity + (target.stormAmbientIntensity - curr.stormAmbientIntensity) * t;

    const fogColor = curr.fogColor.clone().lerp(target.fogColor, t);
    const fogDensity = curr.fogDensity + (target.fogDensity - curr.fogDensity) * t;

    this.ambientLight.color.copy(ambientColor);
    this.ambientLight.intensity = ambientIntensity;

    this.directionalLight.color.copy(directionalColor);
    this.directionalLight.intensity = directionalIntensity;

    this.stormAmbientLight.color.copy(stormAmbientColor);
    this.stormAmbientLight.intensity = stormAmbientIntensity;

    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(fogColor);
      this.scene.fog.density = fogDensity;
    }
    this.scene.background = fogColor;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.controls.update();
    this.updateTransition(deltaTime);
    this.cloudSystem.update(deltaTime);
    this.lightningSystem.update(deltaTime);

    const flashIntensity = this.lightningSystem.getFlashIntensity();
    if (flashIntensity > 0) {
      this.bloomPass.strength = 0.5 + flashIntensity * 1.5;
    } else {
      this.bloomPass.strength = 0.3;
    }

    this.composer.render();
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.cloudSystem.dispose();
    this.lightningSystem.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', () => this.onResize());
  }
}

const app = new App();
(window as any).app = app;
