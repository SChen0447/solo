import * as THREE from 'three';
import { ParticleSystem } from './particleSystem';
import { UIControls } from './uiControls';

class OrbitControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private target: THREE.Vector3;

  private spherical: THREE.Spherical;
  private sphericalDelta: THREE.Spherical;
  private panOffset: THREE.Vector3;

  private isDragging: boolean = false;
  private isPanning: boolean = false;
  private lastX: number = 0;
  private lastY: number = 0;

  private rotateSpeed: number = 0.005;
  private panSpeed: number = 0.01;
  private zoomSpeed: number = 0.001;

  private minPolarAngle: number = Math.PI / 6;
  private maxPolarAngle: number = Math.PI * 5 / 6;
  private minDistance: number = 3;
  private maxDistance: number = 30;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.target = new THREE.Vector3(0, 0, 0);

    const offset = new THREE.Vector3().copy(camera.position).sub(this.target);
    this.spherical = new THREE.Spherical().setFromVector3(offset);
    this.sphericalDelta = new THREE.Spherical();
    this.panOffset = new THREE.Vector3();

    this.bindEvents();
    this.updateCamera();
  }

  private bindEvents(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    this.domElement.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('mouseup', this.onMouseUp);
    this.domElement.addEventListener('mouseleave', this.onMouseUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.domElement.addEventListener('contextmenu', this.onContextMenu);
  }

  private onMouseDown = (event: MouseEvent): void => {
    if (event.button === 0) {
      if (event.shiftKey) {
        this.isPanning = true;
      } else {
        this.isDragging = true;
      }
      this.lastX = event.clientX;
      this.lastY = event.clientY;
    }
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (this.isDragging) {
      const deltaX = event.clientX - this.lastX;
      const deltaY = event.clientY - this.lastY;

      this.sphericalDelta.theta -= deltaX * this.rotateSpeed;
      this.sphericalDelta.phi -= deltaY * this.rotateSpeed;

      this.lastX = event.clientX;
      this.lastY = event.clientY;
    } else if (this.isPanning) {
      const deltaX = event.clientX - this.lastX;
      const deltaY = event.clientY - this.lastY;

      const distance = this.camera.position.distanceTo(this.target);
      const panScale = distance * this.panSpeed;

      const te = this.camera.matrix.elements;
      const xAxis = new THREE.Vector3(te[0], te[1], te[2]);
      const yAxis = new THREE.Vector3(te[4], te[5], te[6]);

      this.panOffset.add(xAxis.multiplyScalar(-deltaX * panScale));
      this.panOffset.add(yAxis.multiplyScalar(deltaY * panScale));

      this.lastX = event.clientX;
      this.lastY = event.clientY;
    }
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
    this.isPanning = false;
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const scale = 1 + event.deltaY * this.zoomSpeed;
    this.spherical.radius = THREE.MathUtils.clamp(
      this.spherical.radius * scale,
      this.minDistance,
      this.maxDistance
    );
  };

  private onContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  public update(): void {
    this.spherical.theta += this.sphericalDelta.theta;
    this.spherical.phi += this.sphericalDelta.phi;

    this.spherical.phi = THREE.MathUtils.clamp(
      this.spherical.phi,
      this.minPolarAngle,
      this.maxPolarAngle
    );

    this.spherical.radius = THREE.MathUtils.clamp(
      this.spherical.radius,
      this.minDistance,
      this.maxDistance
    );

    this.sphericalDelta.set(0, 0, 0);
    this.target.add(this.panOffset);
    this.panOffset.set(0, 0, 0);

    this.updateCamera();
  }

  private updateCamera(): void {
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  public dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('mouseleave', this.onMouseUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);
  }
}

class Application {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private particleSystem: ParticleSystem;
  private uiControls: UIControls;
  private fpsCounter: HTMLElement;

  private clock: THREE.Clock;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;

  private animationId: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.fpsCounter = document.getElementById('fps-counter')!;

    this.scene = new THREE.Scene();
    this.scene.background = null;
    this.scene.fog = new THREE.FogExp2(0x0a0a23, 0.008);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 3, 12);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.particleSystem = new ParticleSystem(this.scene, 2000);
    this.uiControls = new UIControls(this.container, this.particleSystem);

    this.clock = new THREE.Clock();

    this.bindEvents();
    this.animate();
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);

    this.controls.update();
    this.particleSystem.update(deltaTime);

    this.renderer.render(this.scene, this.camera);

    this.updateFPS();
  };

  private updateFPS(): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      const fps = Math.round(
        (this.frameCount * 1000) / (now - this.lastFpsUpdate)
      );
      this.fpsCounter.textContent = `FPS: ${fps}`;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize);
    this.controls.dispose();
    this.particleSystem.dispose();
    this.uiControls.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

let app: Application | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new Application();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
    app = null;
  }
});
