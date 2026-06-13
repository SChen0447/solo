import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParticleButterfly } from './ParticleButterfly';
import { TrailRenderer } from './TrailRenderer';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  
  private particleButterfly: ParticleButterfly;
  private trailRenderer: TrailRenderer;
  
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  
  private clock: THREE.Clock;
  private animationId: number = 0;

  constructor() {
    this.container = document.getElementById('app') || document.body;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.scene = new THREE.Scene();
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 15 * Math.sin(15 * Math.PI / 180), 15 * Math.cos(15 * Math.PI / 180));
    this.camera.lookAt(0, 0, 0);
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    
    this.container.appendChild(this.renderer.domElement);
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 20;
    this.controls.enablePan = false;
    
    this.particleButterfly = new ParticleButterfly(this.scene);
    this.scene.add(this.particleButterfly.mesh);
    
    this.trailRenderer = new TrailRenderer(this.particleButterfly);
    this.scene.add(this.trailRenderer.mesh);
    
    this.setupEventListeners();
    this.animate();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('click', this.onClick.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onClick(event: MouseEvent): void {
    if (event.target !== this.renderer.domElement) return;
    
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersectPoint = new THREE.Vector3();
    
    if (this.raycaster.ray.intersectPlane(plane, intersectPoint)) {
      this.particleButterfly.triggerEnergyWave(intersectPoint);
    }
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    
    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    
    this.controls.update();
    
    this.particleButterfly.update(deltaTime);
    this.trailRenderer.update(deltaTime, this.camera);
    
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    window.removeEventListener('click', this.onClick.bind(this));
    
    this.particleButterfly.dispose();
    this.trailRenderer.dispose();
    
    this.renderer.dispose();
    this.controls.dispose();
    
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

const app = new App();

export default app;
