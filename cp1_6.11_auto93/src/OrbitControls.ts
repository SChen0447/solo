import * as THREE from 'three';
import { OrbitControls as ThreeOrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class OrbitControlsManager {
  private controls: ThreeOrbitControls;
  private autoRotateEnabled: boolean = true;
  private autoRotateSpeed: number = 0.5;
  private resumeDelay: number = 3000;
  private resumeTimer: number | null = null;
  private userInteracting: boolean = false;
  private camera: THREE.PerspectiveCamera;
  private targetGroup: THREE.Group | null = null;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement
  ) {
    this.camera = camera;
    this.controls = new ThreeOrbitControls(camera, domElement);
    this.setupControls();
    this.setupEventListeners();
  }

  private setupControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 0.8;
    this.controls.panSpeed = 0.5;
    
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 4.0;
    
    this.controls.minPolarAngle = Math.PI / 6;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    
    this.controls.enablePan = false;
    
    this.controls.target.set(0, 1, 0);
    this.controls.update();
  }

  private setupEventListeners(): void {
    const onStart = () => {
      this.userInteracting = true;
      this.autoRotateEnabled = false;
      if (this.resumeTimer !== null) {
        window.clearTimeout(this.resumeTimer);
        this.resumeTimer = null;
      }
    };

    const onEnd = () => {
      this.userInteracting = false;
      this.resumeTimer = window.setTimeout(() => {
        if (!this.userInteracting) {
          this.autoRotateEnabled = true;
        }
      }, this.resumeDelay);
    };

    this.controls.addEventListener('start', onStart);
    this.controls.addEventListener('end', onEnd);
  }

  setTargetGroup(group: THREE.Group): void {
    this.targetGroup = group;
  }

  update(delta: number): void {
    if (this.autoRotateEnabled && this.targetGroup) {
      const radians = (this.autoRotateSpeed * Math.PI / 180) * (delta / 16.67);
      this.targetGroup.rotation.y += radians;
    }
    this.controls.update();
  }

  resetView(): void {
    const initialPosition = new THREE.Vector3(5, 4, 6);
    const initialTarget = new THREE.Vector3(0, 1, 0);
    
    const startPosition = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    
    const duration = 800;
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      
      this.camera.position.lerpVectors(startPosition, initialPosition, eased);
      this.controls.target.lerpVectors(startTarget, initialTarget, eased);
      this.controls.update();
      
      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
    
    this.userInteracting = true;
    this.autoRotateEnabled = false;
    if (this.resumeTimer !== null) {
      window.clearTimeout(this.resumeTimer);
    }
    this.resumeTimer = window.setTimeout(() => {
      this.userInteracting = false;
      this.autoRotateEnabled = true;
    }, this.resumeDelay);
  }

  getDistance(): number {
    return this.camera.position.distanceTo(this.controls.target);
  }

  getControls(): ThreeOrbitControls {
    return this.controls;
  }

  setAutoRotateSpeed(speed: number): void {
    this.autoRotateSpeed = speed;
  }

  dispose(): void {
    if (this.resumeTimer !== null) {
      window.clearTimeout(this.resumeTimer);
    }
    this.controls.dispose();
  }
}
