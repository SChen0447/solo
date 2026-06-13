import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { StarNebula, MusicType } from './StarNebula';
import { ControlPanel } from './ControlPanel';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private starNebula: StarNebula;
  private controlPanel: ControlPanel;
  private progressBar: HTMLElement;
  
  private clock: THREE.Clock;
  private animationId: number | null = null;
  private readonly targetFPS = 60;
  private readonly frameInterval = 1000 / this.targetFPS;
  private lastFrameTime = 0;

  constructor() {
    this.clock = new THREE.Clock();
    
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 0, 600);
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    
    const container = document.getElementById('canvas-container');
    if (!container) {
      throw new Error('Canvas container not found');
    }
    container.appendChild(this.renderer.domElement);
    
    this.camera.userData.canvas = this.renderer.domElement;
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = false;
    this.controls.minDistance = 300;
    this.controls.maxDistance = 1200;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 0.8;
    
    this.starNebula = new StarNebula(this.scene, this.camera);
    
    this.controlPanel = new ControlPanel('control-panel', (type: MusicType) => {
      this.starNebula.playMusic(type);
    });
    
    const progressBarElement = document.getElementById('progress-bar');
    if (!progressBarElement) {
      throw new Error('Progress bar not found');
    }
    this.progressBar = progressBarElement;
    
    this.setupEventListeners();
    this.start();
  }

  private setupEventListeners() {
    window.addEventListener('resize', this.onResize.bind(this));
    
    this.renderer.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
    }, { passive: false });
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateProgressBar() {
    const progress = this.starNebula.getProgress() * 100;
    this.progressBar.style.width = `${progress}%`;
  }

  private animate(currentTime: number) {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    
    const deltaTime = currentTime - this.lastFrameTime;
    
    if (deltaTime >= this.frameInterval) {
      this.lastFrameTime = currentTime - (deltaTime % this.frameInterval);
      
      const delta = this.clock.getDelta();
      const elapsed = this.clock.getElapsedTime() * 1000;
      
      this.controls.update();
      this.starNebula.update(delta, elapsed);
      this.updateProgressBar();
      
      this.renderer.render(this.scene, this.camera);
    }
  }

  private start() {
    this.lastFrameTime = performance.now();
    this.animate(this.lastFrameTime);
  }

  public stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public dispose() {
    this.stop();
    this.starNebula.dispose();
    this.controlPanel.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}

let app: App | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});
