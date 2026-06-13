import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Astrolabe, ASTROLABE_CONFIG } from './astrolabe';
import type { RuneData } from './astrolabe';
import { ParticleSystem, PARTICLE_CONFIG } from './particles';

const CAMERA_CONFIG = {
  INITIAL_DISTANCE: 3,
  INITIAL_ANGLE_X: 20,
  DAMPING: 0.05,
};

const LIGHT_CONFIG = {
  SPOTLIGHT_COLOR: 0x4466ff,
  SPOTLIGHT_INTENSITY: 0.3,
  SPOTLIGHT_DISTANCE: 5,
};

class Application {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private astrolabe: Astrolabe | null = null;
  private particleSystem: ParticleSystem | null = null;
  private clock: THREE.Clock;
  private container: HTMLElement;
  private astrolabeDiameter: number;
  
  private frameTimes: number[] = [];
  private isLowPerformance: boolean = false;
  private performanceRecoveryTime: number = 0;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;
    
    this.clock = new THREE.Clock();
    
    this.astrolabeDiameter = this.calculateDiameter();
    
    this.scene = new THREE.Scene();
    this.setupBackground();
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.setupCamera();
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.setupRenderer();
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.setupControls();
    
    this.setupLighting();
    this.createAstrolabe();
    this.createParticleSystem();
    this.setupEventListeners();
    
    this.animate();
  }

  private calculateDiameter(): number {
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      return Math.max(window.innerWidth * ASTROLABE_CONFIG.DIAMETER_RATIO_MOBILE, ASTROLABE_CONFIG.MIN_DIAMETER * 0.6);
    }
    return Math.max(window.innerHeight * ASTROLABE_CONFIG.DIAMETER_RATIO_DESKTOP, ASTROLABE_CONFIG.MIN_DIAMETER);
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#040720');
    gradient.addColorStop(1, '#0a0e27');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);
    
    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  private setupCamera(): void {
    const angleRad = (CAMERA_CONFIG.INITIAL_ANGLE_X * Math.PI) / 180;
    const distance = CAMERA_CONFIG.INITIAL_DISTANCE;
    
    this.camera.position.set(
      0,
      Math.sin(angleRad) * distance,
      Math.cos(angleRad) * distance
    );
    this.camera.lookAt(0, 0, 0);
  }

  private setupRenderer(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);
  }

  private setupControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = CAMERA_CONFIG.DAMPING;
    this.controls.enablePan = false;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 6;
    this.controls.minPolarAngle = Math.PI / 6;
    this.controls.maxPolarAngle = Math.PI / 2;
    this.controls.target.set(0, 0, 0);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);
    
    const spotLight = new THREE.SpotLight(
      LIGHT_CONFIG.SPOTLIGHT_COLOR,
      LIGHT_CONFIG.SPOTLIGHT_INTENSITY
    );
    spotLight.position.set(0, -LIGHT_CONFIG.SPOTLIGHT_DISTANCE, 0);
    spotLight.target.position.set(0, 0, 0);
    spotLight.angle = Math.PI / 4;
    spotLight.penumbra = 0.5;
    spotLight.decay = 1;
    spotLight.distance = LIGHT_CONFIG.SPOTLIGHT_DISTANCE * 2;
    this.scene.add(spotLight);
    this.scene.add(spotLight.target);
    
    const topLight = new THREE.DirectionalLight(0xffffff, 0.3);
    topLight.position.set(0, 5, 3);
    this.scene.add(topLight);
  }

  private createAstrolabe(): void {
    this.astrolabe = new Astrolabe({
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      diameter: this.astrolabeDiameter,
      onRuneActivate: (rune: RuneData, worldPos: THREE.Vector3) => {
        this.onRuneActivate(rune, worldPos);
      },
    });
  }

  private createParticleSystem(): void {
    this.particleSystem = new ParticleSystem({
      scene: this.scene,
      astrolabeCenter: new THREE.Vector3(0, 0, 0),
    });
  }

  private onRuneActivate(rune: RuneData, worldPos: THREE.Vector3): void {
    if (this.particleSystem) {
      this.particleSystem.triggerBurst(worldPos, rune.color, 1.0);
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    this.renderer.domElement.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.astrolabe) {
        this.astrolabe.onRaycast(e.clientX, e.clientY);
      }
    });
    
    this.renderer.domElement.addEventListener('click', (e: MouseEvent) => {
      if (this.astrolabe) {
        this.astrolabe.onClick(e.clientX, e.clientY);
      }
    });
    
    this.renderer.domElement.addEventListener('touchmove', (e: TouchEvent) => {
      e.preventDefault();
      if (this.astrolabe && e.touches.length > 0) {
        const touch = e.touches[0];
        this.astrolabe.onRaycast(touch.clientX, touch.clientY);
      }
    }, { passive: false });
    
    this.renderer.domElement.addEventListener('touchend', (e: TouchEvent) => {
      if (this.astrolabe && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        this.astrolabe.onClick(touch.clientX, touch.clientY);
      }
    });
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    const newDiameter = this.calculateDiameter();
    if (Math.abs(newDiameter - this.astrolabeDiameter) > 50) {
      this.recreateAstrolabe();
    }
  }

  private recreateAstrolabe(): void {
    if (this.astrolabe) {
      this.astrolabe.dispose();
      this.astrolabe = null;
    }
    
    this.astrolabeDiameter = this.calculateDiameter();
    this.createAstrolabe();
  }

  private updatePerformanceMonitoring(frameTime: number): void {
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift();
    }
    
    if (this.frameTimes.length >= 30) {
      const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
      const fps = 1000 / avgFrameTime;
      
      if (fps < PARTICLE_CONFIG.LOW_FPS_THRESHOLD && !this.isLowPerformance) {
        let lowFrameCount = 0;
        for (let i = this.frameTimes.length - 3; i < this.frameTimes.length; i++) {
          if (1000 / this.frameTimes[i] < PARTICLE_CONFIG.LOW_FPS_THRESHOLD) {
            lowFrameCount++;
          }
        }
        
        if (lowFrameCount >= 3) {
          this.isLowPerformance = true;
          this.performanceRecoveryTime = 0;
          if (this.particleSystem) {
            this.particleSystem.adjustParticleCount(PARTICLE_CONFIG.ORBIT_COUNT_LOW);
          }
        }
      } else if (this.isLowPerformance && fps >= 50) {
        this.performanceRecoveryTime += frameTime;
        if (this.performanceRecoveryTime >= 1000) {
          this.isLowPerformance = false;
          if (this.particleSystem) {
            this.particleSystem.adjustParticleCount(PARTICLE_CONFIG.ORBIT_COUNT);
          }
        }
      } else if (!this.isLowPerformance) {
        this.performanceRecoveryTime = 0;
      }
    }
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    
    const deltaTime = this.clock.getDelta();
    const frameTime = this.clock.getDelta() * 1000 + deltaTime * 1000;
    
    this.updatePerformanceMonitoring(frameTime);
    
    this.controls.update();
    
    if (this.astrolabe) {
      this.astrolabe.update(deltaTime);
    }
    
    if (this.particleSystem) {
      this.particleSystem.update(deltaTime);
    }
    
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    if (this.astrolabe) {
      this.astrolabe.dispose();
    }
    if (this.particleSystem) {
      this.particleSystem.dispose();
    }
    
    this.renderer.dispose();
    this.controls.dispose();
    
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}

let app: Application | null = null;

window.addEventListener('DOMContentLoaded', () => {
  try {
    app = new Application('app');
    console.log('符语·星仪 已启动');
  } catch (error) {
    console.error('应用启动失败:', error);
  }
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
  }
});
