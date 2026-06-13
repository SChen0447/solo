import * as THREE from 'three';
import { FiberSystem } from './fiberSystem';
import { InteractionController } from './interaction';

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private fiberSystem!: FiberSystem;
  private interactionController!: InteractionController;
  private clock: THREE.Clock;
  private animationFrameId: number = 0;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 0;
  private physicsUpdateTime: number = 0;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 0, 400);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    this.setupLights();
    this.initFiberSystem();
    this.initInteraction();
    this.setupEventListeners();
    this.startRenderLoop();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.6);
    mainLight.position.set(100, 200, 100);
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-100, -100, -100);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff88ff, 0.4);
    rimLight.position.set(0, 0, -200);
    this.scene.add(rimLight);
  }

  private initFiberSystem(): void {
    this.fiberSystem = new FiberSystem(
      this.scene,
      this.camera,
      window.innerHeight
    );
  }

  private initInteraction(): void {
    this.interactionController = new InteractionController(
      this.renderer.domElement,
      this.camera,
      this.scene,
      this.fiberSystem
    );

    this.interactionController.setOnDragStart((fiberIndex, nodeIndex) => {
      console.log(`Dragging fiber ${fiberIndex}, node ${nodeIndex}`);
    });

    this.interactionController.setOnDragEnd(() => {
      console.log('Drag ended');
    });

    this.interactionController.setOnLightClick(() => {
      console.log('Light clicked and fixed');
    });
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.fiberSystem.resize(height);
    this.interactionController.resize();
  }

  private startRenderLoop(): void {
    this.lastTime = performance.now();
    this.animate();
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    const elapsedTime = this.clock.getElapsedTime();

    const physicsStartTime = performance.now();

    this.fiberSystem.update(deltaTime, elapsedTime);

    this.physicsUpdateTime = performance.now() - physicsStartTime;

    this.renderer.render(this.scene, this.camera);

    this.frameCount++;
    if (currentTime - (currentTime % 1000) !== this.lastTime - (this.lastTime % 1000)) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      
      if (this.fps < 50) {
        console.warn(`Low FPS: ${this.fps}`);
      }
      if (this.physicsUpdateTime > 3) {
        console.warn(`Slow physics update: ${this.physicsUpdateTime.toFixed(2)}ms`);
      }
    }
  }

  public getFPS(): number {
    return this.fps;
  }

  public getPhysicsUpdateTime(): number {
    return this.physicsUpdateTime;
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onResize.bind(this));
    this.interactionController.dispose();
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}

let app: App;

document.addEventListener('DOMContentLoaded', () => {
  app = new App('app');
  
  (window as any).getAppStats = () => {
    return {
      fps: app.getFPS(),
      physicsTime: app.getPhysicsUpdateTime()
    };
  };
});
