import * as THREE from 'three';
import type { CoffeeRegion, TerrainData } from './terrain';

export interface InteractionCallbacks {
  onHover: (region: CoffeeRegion | null, screenX: number, screenY: number, worldPoint: THREE.Vector3 | null) => void;
  onClick: (region: CoffeeRegion | null) => void;
  onCenterRegionChange: (region: CoffeeRegion | null) => void;
  onAutoRotateToggle: (enabled: boolean) => void;
}

interface InteractionState {
  isDragging: boolean;
  isPinching: boolean;
  lastX: number;
  lastY: number;
  pinchStartDist: number;
  pinchStartDistance: number;
  hoveredRegion: CoffeeRegion | null;
}

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private terrain: TerrainData;
  private callbacks: InteractionCallbacks;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private state: InteractionState;

  public cameraAngle: number = 0;
  public cameraHeight: number = 0.5;
  public cameraDistance: number = 45;
  public autoRotate: boolean = true;
  public autoRotateSpeed: number = 0.08;

  private readonly MIN_DISTANCE = 20;
  private readonly MAX_DISTANCE = 75;
  private readonly MIN_HEIGHT = 0.15;
  private readonly MAX_HEIGHT = 1.2;
  private readonly target = new THREE.Vector3(0, 0, 0);

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    terrain: TerrainData,
    callbacks: InteractionCallbacks
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.terrain = terrain;
    this.callbacks = callbacks;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.state = {
      isDragging: false,
      isPinching: false,
      lastX: 0,
      lastY: 0,
      pinchStartDist: 0,
      pinchStartDistance: this.cameraDistance,
      hoveredRegion: null
    };

    this.bindEvents();
    this.updateCameraPosition();
  }

  private bindEvents(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('mousemove', this.onMouseMove.bind(this));
    dom.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    dom.addEventListener('click', this.onClick.bind(this));
    dom.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    dom.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    dom.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    dom.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });

    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private updateMouse(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private raycastTerrain(): { point: THREE.Vector3; region: CoffeeRegion | null } | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.terrain.mesh);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const region = this.terrain.getRegionAt(point.x, point.z);
      return { point, region };
    }
    return null;
  }

  private onMouseMove(e: MouseEvent): void {
    this.updateMouse(e.clientX, e.clientY);

    if (this.state.isDragging) {
      const dx = e.clientX - this.state.lastX;
      const dy = e.clientY - this.state.lastY;
      this.cameraAngle -= dx * 0.005;
      this.cameraHeight = Math.max(
        this.MIN_HEIGHT,
        Math.min(this.MAX_HEIGHT, this.cameraHeight + dy * 0.003)
      );
      this.state.lastX = e.clientX;
      this.state.lastY = e.clientY;
      this.updateCameraPosition();
    } else {
      const hit = this.raycastTerrain();
      if (hit) {
        if (hit.region !== this.state.hoveredRegion) {
          this.state.hoveredRegion = hit.region;
          this.updateHighlight(hit.region);
        }
        this.callbacks.onHover(hit.region, e.clientX, e.clientY, hit.point);
      } else {
        if (this.state.hoveredRegion !== null) {
          this.state.hoveredRegion = null;
          this.updateHighlight(null);
        }
        this.callbacks.onHover(null, e.clientX, e.clientY, null);
      }
    }
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.state.isDragging = true;
      this.state.lastX = e.clientX;
      this.state.lastY = e.clientY;
      if (this.autoRotate) {
        this.autoRotate = false;
        this.callbacks.onAutoRotateToggle(false);
      }
    }
  }

  private onMouseUp(): void {
    this.state.isDragging = false;
  }

  private onClick(e: MouseEvent): void {
    if (this.state.isDragging) return;
    this.updateMouse(e.clientX, e.clientY);
    const hit = this.raycastTerrain();
    this.callbacks.onClick(hit ? hit.region : null);
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
    this.cameraDistance = Math.max(
      this.MIN_DISTANCE,
      Math.min(this.MAX_DISTANCE, this.cameraDistance * zoomFactor)
    );
    this.updateCameraPosition();
  }

  private getTouchDistance(touches: TouchList): number {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.state.isDragging = true;
      this.state.lastX = e.touches[0].clientX;
      this.state.lastY = e.touches[0].clientY;
      if (this.autoRotate) {
        this.autoRotate = false;
        this.callbacks.onAutoRotateToggle(false);
      }
    } else if (e.touches.length === 2) {
      this.state.isPinching = true;
      this.state.isDragging = false;
      this.state.pinchStartDist = this.getTouchDistance(e.touches);
      this.state.pinchStartDistance = this.cameraDistance;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1 && this.state.isDragging) {
      const dx = e.touches[0].clientX - this.state.lastX;
      const dy = e.touches[0].clientY - this.state.lastY;
      this.cameraAngle -= dx * 0.005;
      this.cameraHeight = Math.max(
        this.MIN_HEIGHT,
        Math.min(this.MAX_HEIGHT, this.cameraHeight + dy * 0.003)
      );
      this.state.lastX = e.touches[0].clientX;
      this.state.lastY = e.touches[0].clientY;
      this.updateCameraPosition();
    } else if (e.touches.length === 2 && this.state.isPinching) {
      const currentDist = this.getTouchDistance(e.touches);
      const scale = this.state.pinchStartDist / currentDist;
      this.cameraDistance = Math.max(
        this.MIN_DISTANCE,
        Math.min(this.MAX_DISTANCE, this.state.pinchStartDistance * scale)
      );

      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const midX = (touch1.clientX + touch2.clientX) / 2;
      const midY = (touch1.clientY + touch2.clientY) / 2;
      this.updateMouse(midX, midY);
      this.updateCameraPosition();
    } else if (e.touches.length === 1 && !this.state.isDragging) {
      this.updateMouse(e.touches[0].clientX, e.touches[0].clientY);
      const hit = this.raycastTerrain();
      if (hit) {
        if (hit.region !== this.state.hoveredRegion) {
          this.state.hoveredRegion = hit.region;
          this.updateHighlight(hit.region);
        }
        this.callbacks.onHover(hit.region, e.touches[0].clientX, e.touches[0].clientY, hit.point);
      }
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 0) {
      if (this.state.isDragging && !this.state.isPinching) {
        const changedTouch = e.changedTouches[0];
        this.updateMouse(changedTouch.clientX, changedTouch.clientY);
        const hit = this.raycastTerrain();
        if (hit && hit.region) {
          this.callbacks.onClick(hit.region);
        }
      }
      this.state.isDragging = false;
      this.state.isPinching = false;
    } else if (e.touches.length === 1) {
      this.state.isPinching = false;
      this.state.isDragging = true;
      this.state.lastX = e.touches[0].clientX;
      this.state.lastY = e.touches[0].clientY;
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      e.preventDefault();
      this.autoRotate = !this.autoRotate;
      this.callbacks.onAutoRotateToggle(this.autoRotate);
    }
  }

  private onResize(): void {
    const container = this.renderer.domElement.parentElement;
    if (container) {
      const width = container.clientWidth;
      const height = container.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  private updateHighlight(region: CoffeeRegion | null): void {
    const material = this.terrain.highlightMesh.material as THREE.LineBasicMaterial;
    if (region) {
      material.color.set(region.color);
      material.opacity = 0.6;
    } else {
      material.opacity = 0;
    }
  }

  public updateCameraPosition(): void {
    const heightOffset = this.cameraHeight * this.cameraDistance * 0.6;
    const radius = Math.cos(this.cameraHeight * Math.PI * 0.4) * this.cameraDistance;

    this.camera.position.x = this.target.x + Math.cos(this.cameraAngle) * radius;
    this.camera.position.z = this.target.z + Math.sin(this.cameraAngle) * radius;
    this.camera.position.y = heightOffset + 5;

    this.camera.lookAt(this.target);
  }

  public update(deltaTime: number): void {
    if (this.autoRotate) {
      this.cameraAngle += this.autoRotateSpeed * deltaTime;
      this.updateCameraPosition();
    }

    const centerRay = new THREE.Raycaster();
    const centerNdc = new THREE.Vector2(0, 0);
    centerRay.setFromCamera(centerNdc, this.camera);
    const intersects = centerRay.intersectObject(this.terrain.mesh);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      const region = this.terrain.getRegionAt(point.x, point.z);
      this.callbacks.onCenterRegionChange(region);
    } else {
      this.callbacks.onCenterRegionChange(null);
    }
  }

  public dispose(): void {
    const dom = this.renderer.domElement;
    dom.removeEventListener('mousemove', this.onMouseMove.bind(this));
    dom.removeEventListener('mousedown', this.onMouseDown.bind(this));
    window.removeEventListener('mouseup', this.onMouseUp.bind(this));
    dom.removeEventListener('click', this.onClick.bind(this));
    dom.removeEventListener('wheel', this.onWheel.bind(this));
    dom.removeEventListener('touchstart', this.onTouchStart.bind(this));
    dom.removeEventListener('touchmove', this.onTouchMove.bind(this));
    dom.removeEventListener('touchend', this.onTouchEnd.bind(this));
    window.removeEventListener('keydown', this.onKeyDown.bind(this));
    window.removeEventListener('resize', this.onResize.bind(this));
  }
}
