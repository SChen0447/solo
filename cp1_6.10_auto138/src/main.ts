import * as THREE from 'three';
import { NebulaSystem } from './nebula';
import { ControlManager } from './controls';
import { UIManager } from './ui';

class Application {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private uiOverlay: HTMLElement;
  
  private nebula!: NebulaSystem;
  private controls!: ControlManager;
  private ui!: UIManager;
  
  private startTime: number = 0;
  private lastTime: number = 0;
  private animationId: number = 0;
  
  constructor() {
    const containerEl = document.getElementById('canvas-container');
    const uiOverlayEl = document.getElementById('ui-overlay');
    
    if (!containerEl || !uiOverlayEl) {
      throw new Error('Required DOM elements not found');
    }
    
    this.container = containerEl;
    this.uiOverlay = uiOverlayEl;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 18);
    this.camera.lookAt(0, 0, 0);
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    this.container.appendChild(this.renderer.domElement);
    
    this.init();
  }
  
  private init(): void {
    this.nebula = new NebulaSystem(this.scene);
    this.controls = new ControlManager(this.camera, this.renderer, this.nebula);
    this.ui = new UIManager({
      container: this.uiOverlay,
      controlManager: this.controls
    });
    
    window.addEventListener('resize', this.onResize);
    
    this.startTime = performance.now() / 1000;
    this.lastTime = this.startTime;
    this.animate();
  }
  
  private onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };
  
  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);
    
    const currentTime = performance.now() / 1000;
    const time = currentTime - this.startTime;
    const deltaTime = Math.min(currentTime - this.lastTime, 0.05);
    this.lastTime = currentTime;
    
    this.controls.update();
    this.nebula.update(time, deltaTime);
    
    this.renderer.render(this.scene, this.camera);
  };
  
  dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize);
    
    this.ui.dispose();
    this.controls.dispose();
    this.nebula.dispose();
    
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

let app: Application | null = null;

function bootstrap(): void {
  try {
    app = new Application();
  } catch (error) {
    console.error('Failed to initialize application:', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}

export { Application };
