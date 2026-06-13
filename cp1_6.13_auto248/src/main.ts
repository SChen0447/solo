import * as THREE from 'three';
import { ParticleSystem } from './particles';

class GravityStarfieldApp {
  private readonly container: HTMLElement;
  private readonly crosshair: HTMLElement;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;

  private particleSystem!: ParticleSystem;

  private readonly clock: THREE.Clock = new THREE.Clock();

  private readonly mouseNDC: THREE.Vector2 = new THREE.Vector2(0, 0);
  private readonly gravityWorld: THREE.Vector3 = new THREE.Vector3();
  private readonly raycaster: THREE.Raycaster = new THREE.Raycaster();

  private isMouseInCanvas: boolean = false;
  private lastMouseUpdate: number = 0;
  private readonly MOUSE_UPDATE_INTERVAL: number = 1000 / 60;

  private cameraDistance: number = 10;
  private cameraTheta: number = 0;
  private cameraPhi: number = Math.PI / 3;

  private readonly MIN_DISTANCE: number = 5;
  private readonly MAX_DISTANCE: number = 20;
  private readonly MIN_PHI: number = Math.PI / 6;
  private readonly MAX_PHI: number = (5 * Math.PI) / 6;

  private isDragging: boolean = false;
  private lastDragX: number = 0;
  private lastDragY: number = 0;

  private readonly DRAG_SENSITIVITY: number = 0.005;
  private readonly ZOOM_SENSITIVITY: number = 0.001;

  private animationFrameId: number = 0;
  private isDisposed: boolean = false;

  private readonly gravityPlaneZ: number = 0;

  constructor() {
    const containerElement = document.getElementById('app');
    const crosshairElement = document.getElementById('crosshair');

    if (!containerElement || !crosshairElement) {
      throw new Error('Required DOM elements not found');
    }

    this.container = containerElement;
    this.crosshair = crosshairElement;

    this.init();
    this.bindEvents();
    this.animate();
  }

  private init(): void {
    this.scene = new THREE.Scene();

    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(
      60,
      width / height,
      0.1,
      1000
    );
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.particleSystem = new ParticleSystem({
      count: 5000,
      radius: 4,
      colorStart: '#667eea',
      colorEnd: '#f093fb',
    });
    this.scene.add(this.particleSystem.points);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
  }

  private updateCameraPosition(): void {
    const sinPhi = Math.sin(this.cameraPhi);
    const x = this.cameraDistance * sinPhi * Math.cos(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * sinPhi * Math.sin(this.cameraTheta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateMatrixWorld(true);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseenter', this.handleMouseEnter);
    window.addEventListener('mouseleave', this.handleMouseLeave);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('click', this.handleClick);
    window.addEventListener('wheel', this.handleWheel, { passive: false });

    window.addEventListener('contextmenu', this.handleContextMenu);
  }

  private unbindEvents(): void {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseenter', this.handleMouseEnter);
    window.removeEventListener('mouseleave', this.handleMouseLeave);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('click', this.handleClick);
    window.removeEventListener('wheel', this.handleWheel);

    window.removeEventListener('contextmenu', this.handleContextMenu);
  }

  private readonly handleResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  };

  private readonly handleContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  private readonly handleMouseEnter = (): void => {
    this.isMouseInCanvas = true;
    this.crosshair.classList.add('visible');
  };

  private readonly handleMouseLeave = (): void => {
    this.isMouseInCanvas = false;
    this.isDragging = false;
    this.crosshair.classList.remove('visible');
    this.particleSystem.setGravityPoint(this.gravityWorld, false);
  };

  private readonly handleMouseMove = (e: MouseEvent): void => {
    const now = performance.now();
    const shouldUpdateMouse = now - this.lastMouseUpdate >= this.MOUSE_UPDATE_INTERVAL;

    this.crosshair.style.left = `${e.clientX}px`;
    this.crosshair.style.top = `${e.clientY}px`;

    if (this.isDragging) {
      const deltaX = e.clientX - this.lastDragX;
      const deltaY = e.clientY - this.lastDragY;

      this.cameraTheta -= deltaX * this.DRAG_SENSITIVITY;
      this.cameraPhi -= deltaY * this.DRAG_SENSITIVITY;

      this.cameraPhi = Math.max(this.MIN_PHI, Math.min(this.MAX_PHI, this.cameraPhi));
      this.updateCameraPosition();

      this.lastDragX = e.clientX;
      this.lastDragY = e.clientY;
    }

    if (shouldUpdateMouse) {
      this.lastMouseUpdate = now;

      this.mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;

      this.updateGravityPoint();
    }
  };

  private updateGravityPoint(): void {
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);

    const planeNormal = new THREE.Vector3(0, 0, 1);
    const planePoint = new THREE.Vector3(0, 0, this.gravityPlaneZ);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      planeNormal,
      planePoint
    );

    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersection);

    if (intersection) {
      this.gravityWorld.copy(intersection);
      this.particleSystem.setGravityPoint(this.gravityWorld, this.isMouseInCanvas && !this.isDragging);
    }
  }

  private readonly handleMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;

    this.isDragging = true;
    this.lastDragX = e.clientX;
    this.lastDragY = e.clientY;
  };

  private readonly handleMouseUp = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    this.isDragging = false;
  };

  private readonly handleClick = (e: MouseEvent): void => {
    const dragThreshold = 5;
    if (Math.abs(e.clientX - this.lastDragX) > dragThreshold ||
        Math.abs(e.clientY - this.lastDragY) > dragThreshold) {
      return;
    }

    this.mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseNDC, this.camera);

    const planeNormal = new THREE.Vector3(0, 0, 1);
    const planePoint = new THREE.Vector3(0, 0, this.gravityPlaneZ);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      planeNormal,
      planePoint
    );

    const intersection = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersection);

    if (intersection) {
      this.particleSystem.triggerExplosion(intersection);
    }
  };

  private readonly handleWheel = (e: WheelEvent): void => {
    e.preventDefault();

    const delta = e.deltaY * this.ZOOM_SENSITIVITY;
    this.cameraDistance = Math.max(
      this.MIN_DISTANCE,
      Math.min(this.MAX_DISTANCE, this.cameraDistance + delta * this.cameraDistance)
    );
    this.updateCameraPosition();
  };

  private readonly animate = (): void => {
    if (this.isDisposed) return;

    this.animationFrameId = requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();

    this.particleSystem.update(deltaTime);

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    this.isDisposed = true;
    cancelAnimationFrame(this.animationFrameId);

    this.unbindEvents();

    this.particleSystem.dispose();
    this.scene.remove(this.particleSystem.points);

    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }

    this.renderer.dispose();
  }
}

const bootstrap = (): void => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new GravityStarfieldApp();
    });
  } else {
    new GravityStarfieldApp();
  }
};

if (typeof window !== 'undefined') {
  bootstrap();
}

export default GravityStarfieldApp;
