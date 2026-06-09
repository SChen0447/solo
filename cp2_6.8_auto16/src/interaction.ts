import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { StarField } from './starField';
import { StarData } from './starData';

export interface HoverInfo {
  index: number;
  star: StarData;
  screenPosition: { x: number; y: number };
}

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.Renderer;
  private starField: StarField;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private hoveredStarIndex: number = -1;
  private onHoverCallback: ((info: HoverInfo | null) => void) | null = null;

  private isDragging: boolean = false;
  private mouseDownPos: { x: number; y: number } = { x: 0, y: 0 };

  private flyTarget: THREE.Vector3 | null = null;
  private flyStart: THREE.Vector3 | null = null;
  private flyProgress: number = 0;
  private flyDuration: number = 1000;
  private isFlying: boolean = false;

  private originalTarget: THREE.Vector3 = new THREE.Vector3();
  private originalPosition: THREE.Vector3 = new THREE.Vector3();

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.Renderer,
    starField: StarField
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.starField = starField;

    this.controls = new OrbitControls(camera, renderer.domElement);
    this.setupControls();

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points = { threshold: 2 };
    this.mouse = new THREE.Vector2();

    this.setupEventListeners();
  }

  private setupControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 800;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 0.8;
    this.controls.enablePan = false;
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (!this.isDragging && !this.isFlying) {
      this.checkHover();
    }
  }

  private onMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.mouseDownPos = { x: event.clientX, y: event.clientY };
  }

  private onMouseUp(event: MouseEvent): void {
    const dx = Math.abs(event.clientX - this.mouseDownPos.x);
    const dy = Math.abs(event.clientY - this.mouseDownPos.y);

    if (dx < 3 && dy < 3) {
      // This was a click, not a drag
    }

    setTimeout(() => {
      this.isDragging = false;
    }, 50);
  }

  private onMouseLeave(): void {
    this.clearHover();
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const points = this.starField.points;
    const intersects = this.raycaster.intersectObject(points);

    if (intersects.length > 0) {
      const index = intersects[0].index;
      if (index !== undefined && index !== this.hoveredStarIndex) {
        this.hoveredStarIndex = index;
        this.starField.highlightStar(index);

        const star = this.starField.stars[index];
        const worldPos = this.starField.getStarWorldPosition(index);
        const screenPos = this.worldToScreen(worldPos);

        if (this.onHoverCallback) {
          this.onHoverCallback({
            index,
            star,
            screenPosition: screenPos
          });
        }
      } else if (index !== undefined && this.onHoverCallback) {
        const star = this.starField.stars[index];
        const worldPos = this.starField.getStarWorldPosition(index);
        const screenPos = this.worldToScreen(worldPos);

        this.onHoverCallback({
          index,
          star,
          screenPosition: screenPos
        });
      }
    } else {
      this.clearHover();
    }
  }

  private clearHover(): void {
    if (this.hoveredStarIndex !== -1) {
      this.hoveredStarIndex = -1;
      this.starField.clearHighlight();

      if (this.onHoverCallback) {
        this.onHoverCallback(null);
      }
    }
  }

  private worldToScreen(position: THREE.Vector3): { x: number; y: number } {
    const vector = position.clone();
    const starGroup = this.starField.getObject3D();
    vector.applyQuaternion(starGroup.quaternion);
    vector.project(this.camera);

    const canvas = this.renderer.domElement;
    return {
      x: (vector.x * 0.5 + 0.5) * canvas.clientWidth,
      y: (-vector.y * 0.5 + 0.5) * canvas.clientHeight
    };
  }

  public onHover(callback: (info: HoverInfo | null) => void): void {
    this.onHoverCallback = callback;
  }

  public flyToStar(starIndex: number, duration: number = 1000): void {
    if (starIndex < 0 || starIndex >= this.starField.stars.length) return;

    const starPos = this.starField.getStarWorldPosition(starIndex);
    const starGroup = this.starField.getObject3D();

    const worldPos = starPos.clone().applyQuaternion(starGroup.quaternion);

    const direction = worldPos.clone().normalize();
    const distance = 8;
    const targetPosition = worldPos.clone().add(direction.multiplyScalar(-distance));

    this.flyStart = this.camera.position.clone();
    this.flyTarget = targetPosition;
    this.flyProgress = 0;
    this.flyDuration = duration;
    this.isFlying = true;

    this.originalTarget.copy(this.controls.target);
    this.originalPosition.copy(this.camera.position);

    this.starField.highlightStar(starIndex);
  }

  public update(deltaTime: number): void {
    if (this.isFlying && this.flyStart && this.flyTarget) {
      this.flyProgress += deltaTime * 1000;

      const t = Math.min(1, this.flyProgress / this.flyDuration);
      const easedT = 1 - Math.pow(1 - t, 3);

      this.camera.position.lerpVectors(this.flyStart, this.flyTarget, easedT);

      const starGroup = this.starField.getObject3D();
      const closestStarWorldPos = new THREE.Vector3();
      let minDist = Infinity;
      let closestIdx = -1;

      for (let i = 0; i < this.starField.stars.length; i++) {
        const s = this.starField.stars[i];
        const pos = new THREE.Vector3(s.position[0], s.position[1], s.position[2]);
        pos.applyQuaternion(starGroup.quaternion);
        const dist = this.camera.position.distanceTo(pos);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = i;
          closestStarWorldPos.copy(pos);
        }
      }

      if (closestIdx >= 0) {
        this.controls.target.lerp(closestStarWorldPos, 0.1);
      }

      if (t >= 1) {
        this.isFlying = false;
        this.flyStart = null;
        this.flyTarget = null;
      }
    }

    if (!this.isFlying) {
      this.controls.update();
    }

    if (this.hoveredStarIndex >= 0 && this.onHoverCallback) {
      const star = this.starField.stars[this.hoveredStarIndex];
      const worldPos = this.starField.getStarWorldPosition(this.hoveredStarIndex);
      const screenPos = this.worldToScreen(worldPos);

      this.onHoverCallback({
        index: this.hoveredStarIndex,
        star,
        screenPosition: screenPos
      });
    }
  }

  public getControls(): OrbitControls {
    return this.controls;
  }

  public getIsFlying(): boolean {
    return this.isFlying;
  }

  public resetView(): void {
    this.camera.position.set(0, 0, 400);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  public dispose(): void {
    this.controls.dispose();
  }
}
