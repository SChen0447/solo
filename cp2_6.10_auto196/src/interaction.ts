import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RiverSystem, RiverSegment } from './riverSystem';

export interface LockedCard {
  segmentId: string;
  element: HTMLElement;
  worldPos: THREE.Vector3;
}

export class InteractionManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private riverSystem: RiverSystem;
  private container: HTMLElement;

  public controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private hoveredSegmentId: string | null = null;
  private lockedCards: Map<string, LockedCard> = new Map();
  private activeCard: HTMLElement | null = null;

  private glowRing: THREE.Mesh | null = null;
  private glowTargetOpacity: number = 0;
  private glowCurrentOpacity: number = 0;

  private isRotating: boolean = false;
  private prevCameraRot: THREE.Euler = new THREE.Euler();

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    riverSystem: RiverSystem,
    container: HTMLElement
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.riverSystem = riverSystem;
    this.container = container;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.setupControls();
    this.setupGlowRing();
    this.setupEventListeners();
  }

  private setupControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.8;
    this.controls.zoomSpeed = 1.0;
    this.controls.panSpeed = 0.8;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 200;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };

    this.prevCameraRot.copy(this.camera.rotation);
  }

  private setupGlowRing(): void {
    const ringGeometry = new THREE.RingGeometry(50, 52, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x00b4d8,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.glowRing = new THREE.Mesh(ringGeometry, ringMaterial);
    this.glowRing.rotation.x = -Math.PI / 2;
    this.glowRing.position.y = -2;
    this.scene.add(this.glowRing);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    canvas.addEventListener('pointerup', this.onPointerUp.bind(this));

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.checkHover(event.clientX, event.clientY);
  }

  private onMouseLeave(): void {
    this.clearHover();
  }

  private onPointerDown(): void {
    this.clearHover();
  }

  private onPointerUp(): void {
    // No-op, hover will resume on next mousemove
  }

  private onWindowResize(): void {
    for (const card of this.lockedCards.values()) {
      this.updateCardPosition(card);
    }
  }

  private checkHover(clientX: number, clientY: number): void {
    const targets: THREE.Object3D[] = [];
    for (const segment of this.riverSystem.segments) {
      for (const particle of segment.particles) {
        if (targets.indexOf(particle.mesh) === -1) {
          targets.push(particle.mesh);
        }
      }
    }

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(targets, false);

    if (intersects.length > 0) {
      const obj = intersects[0].object;
      const segmentId = obj.userData.segmentId;

      if (segmentId && segmentId !== this.hoveredSegmentId) {
        this.clearHover();
        this.hoveredSegmentId = segmentId;

        const segment = this.riverSystem.getSegmentById(segmentId);
        if (segment && !this.lockedCards.has(segmentId)) {
          this.riverSystem.setHighlight(segmentId, true);
          this.showInfoCard(segment, clientX, clientY, false);
        } else if (segment && this.lockedCards.has(segmentId)) {
          this.riverSystem.setHighlight(segmentId, true);
        }
      } else if (segmentId && segmentId === this.hoveredSegmentId && this.activeCard && !this.lockedCards.has(segmentId)) {
        const segment = this.riverSystem.getSegmentById(segmentId);
        if (segment) {
          this.updateActiveCardPosition(clientX, clientY, segment);
        }
      }
    } else {
      this.clearHover();
    }
  }

  private clearHover(): void {
    if (this.hoveredSegmentId && !this.lockedCards.has(this.hoveredSegmentId)) {
      this.riverSystem.setHighlight(this.hoveredSegmentId, false);
      this.hideActiveCard();
    }
    this.hoveredSegmentId = null;
  }

  private showInfoCard(segment: RiverSegment, clientX: number, clientY: number, locked: boolean): void {
    const card = document.createElement('div');
    card.className = 'info-card';
    card.dataset.segmentId = segment.id;

    const flowRate = this.riverSystem.getSegmentFlowRate(segment);
    const tributaryCount = this.riverSystem.getTributaryCountForSegment(segment);
    const speed = (segment.baseSpeed * this.riverSystem.params.flowSpeed).toFixed(2);

    card.innerHTML = `
      <div class="info-card-header">
        <span class="info-card-title">${segment.isTributary ? '支流' : '干流'}河段</span>
        <button class="btn-lock ${locked ? 'locked' : ''}" data-action="lock" title="${locked ? '取消锁定' : '锁定显示'}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            ${locked ? '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>' : '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>'}
          </svg>
        </button>
      </div>
      <div class="info-card-body">
        <div class="info-row">
          <span class="info-label">流速</span>
          <span class="info-value">${speed} m/s</span>
        </div>
        <div class="info-row">
          <span class="info-label">流量</span>
          <span class="info-value">${flowRate.toFixed(2)} m³/s</span>
        </div>
        <div class="info-row">
          <span class="info-label">支流汇入</span>
          <span class="info-value">${tributaryCount} 条</span>
        </div>
        <div class="info-row">
          <span class="info-label">粒子数</span>
          <span class="info-value">${segment.particleCount}</span>
        </div>
      </div>
    `;

    document.getElementById('app')!.appendChild(card);

    const lockBtn = card.querySelector('[data-action="lock"]') as HTMLElement;
    lockBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCardLock(segment.id);
    });

    this.positionCard(card, clientX, clientY);

    if (!locked) {
      this.activeCard = card;
    }

    const worldPos = new THREE.Vector3()
      .addVectors(segment.startNode.position, segment.endNode.position)
      .multiplyScalar(0.5);

    if (locked) {
      this.lockedCards.set(segment.id, {
        segmentId: segment.id,
        element: card,
        worldPos
      });
    }
  }

  private positionCard(card: HTMLElement, clientX: number, clientY: number): void {
    const padding = 16;
    const offsetY = 12;

    requestAnimationFrame(() => {
      const rect = card.getBoundingClientRect();
      const appRect = document.getElementById('app')!.getBoundingClientRect();

      let x = clientX - appRect.left - rect.width / 2;
      let y = clientY - appRect.top + offsetY;

      x = Math.max(padding, Math.min(appRect.width - rect.width - padding, x));
      y = Math.max(padding + 48, Math.min(appRect.height - rect.height - padding, y));

      card.style.left = `${x}px`;
      card.style.top = `${y}px`;
    });
  }

  private updateActiveCardPosition(clientX: number, clientY: number, segment: RiverSegment): void {
    if (!this.activeCard) return;
    this.positionCard(this.activeCard, clientX, clientY);
  }

  private updateCardPosition(card: LockedCard): void {
    const projected = card.worldPos.clone().project(this.camera);
    const appRect = document.getElementById('app')!.getBoundingClientRect();

    const clientX = (projected.x * 0.5 + 0.5) * appRect.width + appRect.left;
    const clientY = (-projected.y * 0.5 + 0.5) * appRect.height + appRect.top;

    this.positionCard(card.element, clientX, clientY);
  }

  private hideActiveCard(): void {
    if (this.activeCard && this.activeCard.parentNode) {
      this.activeCard.parentNode.removeChild(this.activeCard);
    }
    this.activeCard = null;
  }

  private toggleCardLock(segmentId: string): void {
    const segment = this.riverSystem.getSegmentById(segmentId);
    if (!segment) return;

    if (this.lockedCards.has(segmentId)) {
      const card = this.lockedCards.get(segmentId)!;
      if (card.element.parentNode) {
        card.element.parentNode.removeChild(card.element);
      }
      this.lockedCards.delete(segmentId);
      this.riverSystem.setHighlight(segmentId, false);
      this.hoveredSegmentId = null;
    } else {
      if (this.activeCard) {
        if (this.activeCard.parentNode) {
          this.activeCard.parentNode.removeChild(this.activeCard);
        }
        this.activeCard = null;
      }

      const worldPos = new THREE.Vector3()
        .addVectors(segment.startNode.position, segment.endNode.position)
        .multiplyScalar(0.5);

      const projected = worldPos.clone().project(this.camera);
      const appRect = document.getElementById('app')!.getBoundingClientRect();
      const clientX = (projected.x * 0.5 + 0.5) * appRect.width + appRect.left;
      const clientY = (-projected.y * 0.5 + 0.5) * appRect.height + appRect.top;

      this.showInfoCard(segment, clientX, clientY, true);
    }
  }

  public clearAllLockedCards(): void {
    for (const card of this.lockedCards.values()) {
      if (card.element.parentNode) {
        card.element.parentNode.removeChild(card.element);
      }
      this.riverSystem.setHighlight(card.segmentId, false);
    }
    this.lockedCards.clear();
    this.hideActiveCard();
    this.hoveredSegmentId = null;
  }

  public update(deltaTime: number): void {
    this.controls.update();

    const rotDelta =
      Math.abs(this.camera.rotation.x - this.prevCameraRot.x) +
      Math.abs(this.camera.rotation.y - this.prevCameraRot.y) +
      Math.abs(this.camera.rotation.z - this.prevCameraRot.z);

    this.isRotating = rotDelta > 0.001;
    this.prevCameraRot.copy(this.camera.rotation);

    this.glowTargetOpacity = this.isRotating ? 0.1 : 0;
    this.glowCurrentOpacity += (this.glowTargetOpacity - this.glowCurrentOpacity) * deltaTime * 5;

    if (this.glowRing) {
      (this.glowRing.material as THREE.MeshBasicMaterial).opacity = this.glowCurrentOpacity;
      this.glowRing.rotation.z += deltaTime * 0.1;
    }

    for (const card of this.lockedCards.values()) {
      this.updateCardPosition(card);
    }
  }

  public dispose(): void {
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.removeEventListener('mouseleave', this.onMouseLeave.bind(this));
    canvas.removeEventListener('pointerdown', this.onPointerDown.bind(this));
    canvas.removeEventListener('pointerup', this.onPointerUp.bind(this));
    window.removeEventListener('resize', this.onWindowResize.bind(this));

    this.clearAllLockedCards();
    this.controls.dispose();
  }
}
