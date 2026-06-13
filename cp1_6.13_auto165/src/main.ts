import * as THREE from 'three';
import { SandClock } from './sandClock';
import { InteractionManager } from './interaction';
import { clamp } from './utils';

class App {
  private scene: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private container: HTMLElement;
  
  private sandClock!: SandClock;
  private interactionManager!: InteractionManager;
  
  private ambientLight!: THREE.AmbientLight;
  private directionalLight!: THREE.DirectionalLight;
  
  private clock: THREE.Clock;
  private animationFrameId: number | null = null;
  
  private isPaused: boolean = false;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 60;
  
  private readonly MIN_HOURGLASS_HEIGHT = 4;
  private readonly MAX_HOURGLASS_HEIGHT = 6;
  
  constructor() {
    this.container = document.getElementById('app')!;
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    
    this.initRenderer();
    this.initCamera();
    this.initLights();
    this.initSandClock();
    this.initInteraction();
    this.setupEventListeners();
    
    this.animate = this.animate.bind(this);
  }
  
  private initRenderer(): void {
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
    
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.zIndex = '5';
    
    this.container.appendChild(this.renderer.domElement);
  }
  
  private initCamera(): void {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    
    this.camera.position.set(0, 2, 12);
    this.camera.lookAt(0, 0, 0);
  }
  
  private initLights(): void {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(this.ambientLight);
    
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    this.directionalLight.position.set(-5, 8, 5);
    this.directionalLight.castShadow = true;
    
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.camera.left = -10;
    this.directionalLight.shadow.camera.right = 10;
    this.directionalLight.shadow.camera.top = 10;
    this.directionalLight.shadow.camera.bottom = -10;
    this.directionalLight.shadow.bias = -0.0001;
    
    this.scene.add(this.directionalLight);
    
    const fillLight = new THREE.DirectionalLight(0xfff5e6, 0.3);
    fillLight.position.set(5, 3, -5);
    this.scene.add(fillLight);
    
    const rimLight = new THREE.DirectionalLight(0xe8d5b7, 0.2);
    rimLight.position.set(0, -3, -8);
    this.scene.add(rimLight);
  }
  
  private initSandClock(): void {
    this.sandClock = new SandClock(this.scene);
    this.updateHourglassScale();
  }
  
  private initInteraction(): void {
    this.interactionManager = new InteractionManager(
      this.sandClock,
      this.camera,
      this.renderer
    );
  }
  
  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('visibilitychange', this.onVisibilityChange.bind(this));
    
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePause();
      }
    });
  }
  
  private onWindowResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
    this.updateHourglassScale();
  }
  
  private updateHourglassScale(): void {
    const viewportHeight = window.innerHeight;
    const targetHeight = clamp(
      viewportHeight * 0.12,
      this.MIN_HOURGLASS_HEIGHT,
      this.MAX_HOURGLASS_HEIGHT
    );
    
    const baseHeight = 6.5;
    const scale = targetHeight / baseHeight;
    this.sandClock.resize(scale);
  }
  
  private onVisibilityChange(): void {
    if (document.hidden) {
      this.isPaused = true;
    } else {
      this.isPaused = false;
      this.clock.getDelta();
    }
  }
  
  private togglePause(): void {
    this.isPaused = !this.isPaused;
    if (!this.isPaused) {
      this.clock.getDelta();
    }
  }
  
  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate);
    
    if (this.isPaused) return;
    
    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();
    
    this.updateFPS();
    
    this.interactionManager.update(deltaTime);
    const interactionState = this.interactionManager.getState();
    
    this.sandClock.update(deltaTime, interactionState.dragSpeed);
    
    this.animateCamera(elapsedTime);
    
    this.renderer.render(this.scene, this.camera);
  }
  
  private animateCamera(time: number): void {
    const baseX = 0;
    const baseY = 2;
    const baseZ = 12;
    
    const floatOffset = Math.sin(time * 0.3) * 0.1;
    
    this.camera.position.y = baseY + floatOffset;
    
    if (!this.interactionManager.getState().isDragging) {
      const slowRotation = Math.sin(time * 0.1) * 0.02;
      this.camera.position.x = baseX + Math.sin(slowRotation) * baseZ;
      this.camera.position.z = baseZ * Math.cos(slowRotation);
    }
    
    this.camera.lookAt(0, 0, 0);
  }
  
  private updateFPS(): void {
    this.frameCount++;
    const now = performance.now();
    
    if (now - this.lastTime >= 1000) {
      this.fps = Math.round(
        (this.frameCount * 1000) / (now - this.lastTime)
      );
      this.frameCount = 0;
      this.lastTime = now;
      
      if (this.fps < 55) {
        console.warn(`Low FPS detected: ${this.fps}`);
      }
    }
  }
  
  public start(): void {
    this.lastTime = performance.now();
    this.animate();
    console.log('墨韵·流沙钟 - 应用已启动');
  }
  
  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    this.interactionManager.dispose();
    this.sandClock.dispose();
    
    this.renderer.dispose();
    
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    window.removeEventListener('visibilitychange', this.onVisibilityChange.bind(this));
  }
  
  public getFPS(): number {
    return this.fps;
  }
}

const app = new App();
app.start();

(window as any).app = app;

export default App;
