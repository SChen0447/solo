import * as THREE from 'three';
import { GearSystem, GearData } from './gearSystem';

export interface InteractionCallbacks {
  onGearMoved?: (gear: GearData) => void;
  onGearConnected?: (gear: GearData) => void;
  onGearDisconnected?: (gear: GearData) => void;
  onGearRotated?: (gear: GearData) => void;
  onStep?: () => void;
  onError?: () => void;
}

export class InteractionManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private gearSystem: GearSystem;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private selectedGear: GearData | null = null;
  private isDragging = false;
  private dragPlane: THREE.Plane;
  private dragOffset = new THREE.Vector3();
  private trailParticles: THREE.Points | null = null;
  private trailGeometry: THREE.BufferGeometry | null = null;
  private trailPositions: Float32Array | null = null;
  private trailSizes: Float32Array | null = null;
  private maxTrailParticles = 50;
  private currentTrailIndex = 0;
  private callbacks: InteractionCallbacks;
  private hasMoved = false;
  private dragStartPos = new THREE.Vector2();
  private doubleClickTime = 0;
  private lastClickGear: GearData | null = null;
  private container: HTMLElement;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    gearSystem: GearSystem,
    container: HTMLElement,
    callbacks: InteractionCallbacks = {}
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.gearSystem = gearSystem;
    this.container = container;
    this.callbacks = callbacks;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.setupEventListeners();
    this.createTrailParticles();
  }

  private createTrailParticles(): void {
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailPositions = new Float32Array(this.maxTrailParticles * 3);
    this.trailSizes = new Float32Array(this.maxTrailParticles);

    for (let i = 0; i < this.maxTrailParticles; i++) {
      this.trailPositions[i * 3] = 0;
      this.trailPositions[i * 3 + 1] = -1000;
      this.trailPositions[i * 3 + 2] = 0;
      this.trailSizes[i] = 0;
    }

    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    this.trailGeometry.setAttribute('size', new THREE.BufferAttribute(this.trailSizes, 1));

    const trailMaterial = new THREE.PointsMaterial({
      color: 0xffff00,
      size: 1.5,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.trailParticles = new THREE.Points(this.trailGeometry, trailMaterial);
    this.trailParticles.visible = false;
    this.scene.add(this.trailParticles);
  }

  private setupEventListeners(): void {
    this.container.addEventListener('pointerdown', this.onPointerDown);
    this.container.addEventListener('pointermove', this.onPointerMove);
    this.container.addEventListener('pointerup', this.onPointerUp);
    this.container.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private updateMousePosition(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;

    this.updateMousePosition(event);
    this.dragStartPos.set(event.clientX, event.clientY);

    const gear = this.pickGear();
    const now = Date.now();

    if (gear && this.lastClickGear === gear && now - this.doubleClickTime < 400) {
      if (gear.connected) {
        this.gearSystem.disconnectGear(gear);
        this.gearSystem.shakeGear(gear);
        this.callbacks.onGearDisconnected?.(gear);
        this.callbacks.onError?.();
      }
      this.lastClickGear = null;
      return;
    }

    if (gear) {
      this.selectedGear = gear;
      this.isDragging = false;
      this.hasMoved = false;
      this.lastClickGear = gear;
      this.doubleClickTime = now;
      this.gearSystem.highlightGear(gear, true);

      const intersectPoint = this.getIntersectionPoint();
      if (intersectPoint) {
        this.dragOffset.copy(gear.mesh.position).sub(intersectPoint);
      }

      if (this.trailParticles) {
        this.trailParticles.visible = true;
        this.currentTrailIndex = 0;
      }
    } else {
      this.lastClickGear = null;
    }
  };

  private onPointerMove = (event: PointerEvent): void => {
    this.updateMousePosition(event);

    if (this.selectedGear) {
      const dx = Math.abs(event.clientX - this.dragStartPos.x);
      const dy = Math.abs(event.clientY - this.dragStartPos.y);

      if (dx > 3 || dy > 3) {
        this.isDragging = true;
        this.hasMoved = true;
      }

      if (this.isDragging) {
        const intersectPoint = this.getIntersectionPoint();
        if (intersectPoint) {
          const newPos = intersectPoint.add(this.dragOffset);
          newPos.y = this.selectedGear.mesh.position.y;
          this.gearSystem.moveGear(this.selectedGear, newPos);
          this.addTrailParticle(this.selectedGear.mesh.position);
        }
      }
    }
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (event.button !== 0) return;

    if (this.selectedGear) {
      this.gearSystem.highlightGear(this.selectedGear, false);

      if (this.isDragging && this.hasMoved) {
        const snapped = this.gearSystem.trySnapToDriveRod(this.selectedGear);
        if (snapped) {
          this.callbacks.onGearConnected?.(this.selectedGear);
          this.createShockwave(this.selectedGear.mesh.position);
        } else if (this.selectedGear.connected) {
          this.gearSystem.disconnectGear(this.selectedGear);
          this.gearSystem.shakeGear(this.selectedGear);
          this.callbacks.onGearDisconnected?.(this.selectedGear);
          this.callbacks.onError?.();
        }
        this.callbacks.onStep?.();
      } else if (!this.hasMoved) {
        this.gearSystem.rotateGear(this.selectedGear, 22.5);
        this.callbacks.onGearRotated?.(this.selectedGear);
        this.callbacks.onStep?.();
      }

      this.selectedGear = null;
      this.isDragging = false;
      this.hasMoved = false;

      if (this.trailParticles) {
        this.trailParticles.visible = false;
      }
    }
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
  };

  private pickGear(): GearData | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const allMeshes: THREE.Object3D[] = [];
    for (const gear of this.gearSystem.getAllGears()) {
      allMeshes.push(gear.mesh);
    }

    const intersects = this.raycaster.intersectObjects(allMeshes, true);

    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && obj.parent) {
        const gear = this.gearSystem.getAllGears().find((g) => g.mesh === obj);
        if (gear) return gear;
        obj = obj.parent;
      }
    }
    return null;
  }

  private getIntersectionPoint(): THREE.Vector3 | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint);
    return intersectPoint;
  }

  private addTrailParticle(position: THREE.Vector3): void {
    if (!this.trailPositions || !this.trailSizes || !this.trailGeometry) return;

    const idx = this.currentTrailIndex % this.maxTrailParticles;
    this.trailPositions[idx * 3] = position.x;
    this.trailPositions[idx * 3 + 1] = position.y + 2;
    this.trailPositions[idx * 3 + 2] = position.z;

    for (let i = 0; i < this.maxTrailParticles; i++) {
      const age = (this.currentTrailIndex - i + this.maxTrailParticles) % this.maxTrailParticles;
      const sizeIdx = i;
      this.trailSizes[sizeIdx] = Math.max(0, 1.5 - age * 0.03);
    }

    this.trailGeometry.attributes.position.needsUpdate = true;
    this.trailGeometry.attributes.size.needsUpdate = true;
    this.currentTrailIndex++;
  }

  private createShockwave(position: THREE.Vector3): void {
    const maxRadius = 20;
    const segments = 64;
    const geometry = new THREE.RingGeometry(0.5, 1, segments);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const shockwave = new THREE.Mesh(geometry, material);
    shockwave.rotation.x = -Math.PI / 2;
    shockwave.position.copy(position);
    shockwave.position.y += 1;
    this.scene.add(shockwave);

    let elapsed = 0;
    const duration = 0.6;
    const animate = () => {
      elapsed += 0.016;
      const progress = elapsed / duration;

      if (progress >= 1) {
        this.scene.remove(shockwave);
        geometry.dispose();
        material.dispose();
        return;
      }

      const currentRadius = maxRadius * progress;
      shockwave.scale.set(currentRadius, currentRadius, 1);
      material.opacity = 0.8 * (1 - progress);

      requestAnimationFrame(animate);
    };
    animate();
  }

  dispose(): void {
    this.container.removeEventListener('pointerdown', this.onPointerDown);
    this.container.removeEventListener('pointermove', this.onPointerMove);
    this.container.removeEventListener('pointerup', this.onPointerUp);
    this.container.removeEventListener('wheel', this.onWheel);

    if (this.trailParticles) {
      this.scene.remove(this.trailParticles);
      this.trailGeometry?.dispose();
      if (this.trailParticles.material instanceof THREE.Material) {
        this.trailParticles.material.dispose();
      }
    }
  }

  setDragPlaneHeight(y: number): void {
    this.dragPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, y, 0));
  }
}
