import * as THREE from 'three';
import type { CosmicEvent } from './dataManager';
import type { TimelineRenderer, NodeObject } from './timelineRenderer';

export interface InteractionCallbacks {
  onFocus: (event: CosmicEvent | null) => void;
  onTimelineUpdate: (progress: number) => void;
}

export class InteractionController {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private timelineRenderer: TimelineRenderer;
  private dataManager: { getEventById: (id: number) => CosmicEvent | undefined; getTotalTimespan: () => number };
  private callbacks: InteractionCallbacks;

  private isDragging: boolean = false;
  private isPanning: boolean = false;
  private isAnimating: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  private spherical: { radius: number; theta: number; phi: number } = {
    radius: 30,
    theta: Math.PI / 4,
    phi: Math.PI / 3
  };

  private sphericalTarget: { radius: number; theta: number; phi: number } = {
    radius: 30,
    theta: Math.PI / 4,
    phi: Math.PI / 3
  };

  private target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private panOffset: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  private animationProgress: number = 0;
  private animationDuration: number = 1;
  private animationStart: { pos: THREE.Vector3; target: THREE.Vector3 } | null = null;
  private animationEnd: { pos: THREE.Vector3; target: THREE.Vector3 } | null = null;

  private focusedNode: NodeObject | null = null;
  private isMobile: boolean = false;
  private isInteractive: boolean = false;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();

  private hoveredMesh: THREE.Mesh | null = null;
  private originalCursor: string = 'default';

  private infoCard: HTMLElement | null = null;
  private eventNameEl: HTMLElement | null = null;
  private eventEraEl: HTMLElement | null = null;
  private eventDescEl: HTMLElement | null = null;
  private closeCardBtn: HTMLElement | null = null;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    timelineRenderer: TimelineRenderer,
    dataManager: { getEventById: (id: number) => CosmicEvent | undefined; getTotalTimespan: () => number },
    callbacks: InteractionCallbacks
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.timelineRenderer = timelineRenderer;
    this.dataManager = dataManager;
    this.callbacks = callbacks;

    this.isMobile = window.innerWidth < 768;
    this.setupUIReferences();
    this.setupEventListeners();
    this.updateCameraFromSpherical();
  }

  private setupUIReferences(): void {
    this.infoCard = document.getElementById('info-card');
    this.eventNameEl = document.getElementById('event-name');
    this.eventEraEl = document.getElementById('event-era');
    this.eventDescEl = document.getElementById('event-description');
    this.closeCardBtn = document.getElementById('close-card');

    if (this.closeCardBtn) {
      this.closeCardBtn.addEventListener('click', () => this.exitFocus());
    }
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    canvas.addEventListener('click', (e) => this.onClick(e));

    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('resize', () => this.onResize());
  }

  setInteractive(interactive: boolean): void {
    this.isInteractive = interactive;
  }

  setInitialCamera(radius: number, theta: number, phi: number): void {
    this.spherical.radius = radius;
    this.spherical.theta = theta;
    this.spherical.phi = phi;
    this.sphericalTarget.radius = radius;
    this.sphericalTarget.theta = theta;
    this.sphericalTarget.phi = phi;
    this.updateCameraFromSpherical();
  }

  private onMouseDown(e: MouseEvent): void {
    if (!this.isInteractive || this.isAnimating) return;

    if (e.button === 0) {
      this.isDragging = true;
    } else if (e.button === 2) {
      this.isPanning = true;
    }
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isDragging && !this.isMobile) {
      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;

      this.sphericalTarget.theta -= deltaX * 0.005;
      this.sphericalTarget.phi = Math.max(
        0.1,
        Math.min(Math.PI - 0.1, this.sphericalTarget.phi - deltaY * 0.005)
      );

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    } else if (this.isPanning && !this.isMobile) {
      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;

      const panSpeed = this.spherical.radius * 0.001;
      const right = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);
      this.camera.getWorldDirection(right);
      right.cross(up).normalize();

      this.panOffset.addScaledVector(right, -deltaX * panSpeed);
      this.panOffset.y += deltaY * panSpeed;

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    } else if (!this.isDragging && !this.isPanning && this.isInteractive) {
      this.checkHover(e.clientX, e.clientY);
    }
  }

  private onMouseUp(e: MouseEvent): void {
    this.isDragging = false;
    this.isPanning = false;
  }

  private onWheel(e: WheelEvent): void {
    if (!this.isInteractive || this.isAnimating) return;
    e.preventDefault();

    const zoomSpeed = 0.001;
    this.sphericalTarget.radius *= 1 + e.deltaY * zoomSpeed;
    this.sphericalTarget.radius = Math.max(10, Math.min(60, this.sphericalTarget.radius));
  }

  private onClick(e: MouseEvent): void {
    if (!this.isInteractive || this.isAnimating) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const nodeMeshes = this.timelineRenderer.getNodeMeshes();
    const intersects = this.raycaster.intersectObjects(nodeMeshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const node = this.timelineRenderer.getNodeByMesh(hitMesh);
      if (node) {
        this.focusOnNode(node);
      }
    }
  }

  private onTouchStart(e: TouchEvent): void {
    if (!this.isInteractive || this.isAnimating) return;
    if (e.touches.length === 1) {
      e.preventDefault();
      this.isDragging = true;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || !this.isInteractive) return;
    if (e.touches.length === 1) {
      e.preventDefault();
      const deltaX = e.touches[0].clientX - this.lastMouseX;
      const deltaY = e.touches[0].clientY - this.lastMouseY;

      this.sphericalTarget.theta -= deltaX * 0.005;
      this.sphericalTarget.phi = Math.max(
        0.1,
        Math.min(Math.PI - 0.1, this.sphericalTarget.phi - deltaY * 0.005)
      );

      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    if (this.isDragging && Math.abs(e.changedTouches[0].clientX - this.lastMouseX) < 5
        && Math.abs(e.changedTouches[0].clientY - this.lastMouseY) < 5) {
      this.onClick({
        clientX: e.changedTouches[0].clientX,
        clientY: e.changedTouches[0].clientY
      } as MouseEvent);
    }
    this.isDragging = false;
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.exitFocus();
    }
  }

  private onResize(): void {
    this.isMobile = window.innerWidth < 768;
  }

  private checkHover(clientX: number, clientY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const nodeMeshes = this.timelineRenderer.getNodeMeshes();
    const intersects = this.raycaster.intersectObjects(nodeMeshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      if (this.hoveredMesh !== hitMesh) {
        if (this.hoveredMesh) {
          const mat = this.hoveredMesh.material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = (this.timelineRenderer as any).nodes
            .find((n: NodeObject) => n.mesh === this.hoveredMesh)
            ?.originalEmissiveIntensity || 0.8;
        }
        this.hoveredMesh = hitMesh;
        this.renderer.domElement.style.cursor = 'pointer';
      }
    } else {
      if (this.hoveredMesh) {
        const mat = this.hoveredMesh.material as THREE.MeshStandardMaterial;
        const node = (this.timelineRenderer as any).nodes
          .find((n: NodeObject) => n.mesh === this.hoveredMesh);
        if (node && this.focusedNode !== node) {
          mat.emissiveIntensity = node.originalEmissiveIntensity;
        }
        this.hoveredMesh = null;
        this.renderer.domElement.style.cursor = this.originalCursor;
      }
    }
  }

  private focusOnNode(node: NodeObject): void {
    if (this.focusedNode === node) return;

    this.focusedNode = node;
    this.isAnimating = true;
    this.animationProgress = 0;

    const nodePos = node.basePosition.clone();
    const dir = new THREE.Vector3().subVectors(this.camera.position, this.target).normalize();
    const lookDir = new THREE.Vector3(0, Math.sin(THREE.MathUtils.degToRad(15)), -1).normalize();

    const endPos = nodePos.clone().add(
      lookDir.multiplyScalar(-2)
    );
    const endTarget = nodePos.clone();

    this.animationStart = {
      pos: this.camera.position.clone(),
      target: this.target.clone().add(this.panOffset)
    };
    this.animationEnd = {
      pos: endPos,
      target: endTarget
    };

    this.timelineRenderer.setFocus(node.event.id);
    this.showInfoCard(node.event);
    this.updateTimeline(node.event);
  }

  private exitFocus(): void {
    if (!this.focusedNode && !this.isAnimating) return;

    this.focusedNode = null;
    this.isAnimating = true;
    this.animationProgress = 0;

    const dir = new THREE.Vector3(
      Math.sin(Math.PI / 3) * Math.cos(Math.PI / 4),
      Math.cos(Math.PI / 3),
      Math.sin(Math.PI / 3) * Math.sin(Math.PI / 4)
    );

    this.animationStart = {
      pos: this.camera.position.clone(),
      target: this.target.clone()
    };
    this.animationEnd = {
      pos: dir.multiplyScalar(30),
      target: new THREE.Vector3(0, 0, 0)
    };

    this.sphericalTarget.radius = 30;
    this.sphericalTarget.theta = Math.PI / 4;
    this.sphericalTarget.phi = Math.PI / 3;
    this.panOffset.set(0, 0, 0);

    this.timelineRenderer.setFocus(null);
    this.hideInfoCard();
    this.callbacks.onTimelineUpdate(0);
  }

  private showInfoCard(event: CosmicEvent): void {
    if (!this.infoCard || !this.eventNameEl || !this.eventEraEl || !this.eventDescEl) return;

    this.eventNameEl.textContent = event.name;
    this.eventEraEl.textContent = event.eraLabel;
    this.eventDescEl.textContent = event.description;

    this.infoCard.classList.add('visible');
    this.callbacks.onFocus(event);
  }

  private hideInfoCard(): void {
    if (this.infoCard) {
      this.infoCard.classList.remove('visible');
    }
    this.callbacks.onFocus(null);
  }

  private updateTimeline(event: CosmicEvent): void {
    const total = this.dataManager.getTotalTimespan();
    const progress = 1 - event.era / total;
    this.callbacks.onTimelineUpdate(Math.max(0, Math.min(1, progress)));
  }

  update(deltaTime: number): void {
    if (this.isAnimating && this.animationStart && this.animationEnd) {
      this.animationProgress += deltaTime / this.animationDuration;

      if (this.animationProgress >= 1) {
        this.animationProgress = 1;
        this.isAnimating = false;
        this.camera.position.copy(this.animationEnd.pos);
        this.target.copy(this.animationEnd.target);
      } else {
        const t = this.easeInOutCubic(this.animationProgress);
        const bezierT = this.bezierBlend(t);

        this.camera.position.lerpVectors(
          this.animationStart.pos,
          this.animationEnd.pos,
          bezierT
        );
        this.target.lerpVectors(
          this.animationStart.target,
          this.animationEnd.target,
          bezierT
        );
      }
      this.camera.lookAt(this.target);
    } else if (!this.isMobile) {
      this.spherical.radius += (this.sphericalTarget.radius - this.spherical.radius) * 0.1;
      this.spherical.theta += (this.sphericalTarget.theta - this.spherical.theta) * 0.1;
      this.spherical.phi += (this.sphericalTarget.phi - this.spherical.phi) * 0.1;

      if (!this.isAnimating) {
        this.updateCameraFromSpherical();
      }
    }
  }

  private updateCameraFromSpherical(): void {
    const sinPhiRadius = this.spherical.radius * Math.sin(this.spherical.phi);
    this.camera.position.x = sinPhiRadius * Math.cos(this.spherical.theta) + this.target.x + this.panOffset.x;
    this.camera.position.y = this.spherical.radius * Math.cos(this.spherical.phi) + this.target.y + this.panOffset.y;
    this.camera.position.z = sinPhiRadius * Math.sin(this.spherical.theta) + this.target.z + this.panOffset.z;
    this.camera.lookAt(this.target.x + this.panOffset.x, this.target.y + this.panOffset.y, this.target.z + this.panOffset.z);
  }

  rotateCamera(angleDelta: number): void {
    this.sphericalTarget.theta += angleDelta;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private bezierBlend(t: number): number {
    return t * t * (3 - 2 * t);
  }

  isFocused(): boolean {
    return this.focusedNode !== null;
  }
}
