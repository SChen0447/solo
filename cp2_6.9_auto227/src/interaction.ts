import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { VeinData } from './oreVeins';
import { setVeinHighlight } from './oreVeins';

export interface InteractionCallbacks {
  onVeinHover: (vein: VeinData | null, screenX: number, screenY: number) => void;
  onVeinClick: (vein: VeinData, screenX: number, screenY: number) => void;
  onUserInteraction: () => void;
}

export interface InteractionConfig {
  domElement: HTMLElement;
  camera: THREE.PerspectiveCamera;
  veinMeshes: THREE.Mesh[];
  callbacks: InteractionCallbacks;
}

export class InteractionManager {
  private domElement: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private veinMeshes: THREE.Mesh[];
  private callbacks: InteractionCallbacks;
  private controls: OrbitControls;
  private hoveredVein: VeinData | null = null;
  private isDragging: boolean = false;
  private downPosition: { x: number; y: number } = { x: 0, y: 0 };
  private boundHandlers: {
    onMouseMove: (e: MouseEvent) => void;
    onMouseDown: (e: MouseEvent) => void;
    onMouseUp: (e: MouseEvent) => void;
    onWheel: (e: WheelEvent) => void;
    onControlChange: () => void;
    onControlStart: () => void;
    onControlEnd: () => void;
  } | null = null;

  constructor(config: InteractionConfig) {
    this.domElement = config.domElement;
    this.camera = config.camera;
    this.veinMeshes = config.veinMeshes;
    this.callbacks = config.callbacks;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Line.threshold = 2;
    this.raycaster.params.Mesh.threshold = 2;
    this.mouse = new THREE.Vector2();

    this.controls = new OrbitControls(this.camera, this.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 50;
    this.controls.maxDistance = 3000;
    this.controls.zoomSpeed = 0.8;
    this.controls.rotateSpeed = 0.6;
    this.controls.target.set(0, 0, 0);
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.5;

    this.bindEvents();
  }

  getControls(): OrbitControls {
    return this.controls;
  }

  updateVeinMeshes(meshes: THREE.Mesh[]): void {
    this.veinMeshes = meshes;
  }

  private bindEvents(): void {
    const onMouseMove = (e: MouseEvent): void => {
      this.updateMousePosition(e);
      this.checkHover(e);
    };

    const onMouseDown = (e: MouseEvent): void => {
      this.isDragging = false;
      this.downPosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = (e: MouseEvent): void => {
      const dx = Math.abs(e.clientX - this.downPosition.x);
      const dy = Math.abs(e.clientY - this.downPosition.y);
      const wasClick = dx < 5 && dy < 5;
      if (wasClick) {
        this.checkClick(e);
      }
    };

    const onWheel = (): void => {
      this.callbacks.onUserInteraction();
    };

    const onControlChange = (): void => {
      this.callbacks.onUserInteraction();
    };

    const onControlStart = (): void => {
      this.callbacks.onUserInteraction();
    };

    const onControlEnd = (): void => {};

    this.boundHandlers = { onMouseMove, onMouseDown, onMouseUp, onWheel, onControlChange, onControlStart, onControlEnd };

    this.domElement.addEventListener('mousemove', onMouseMove);
    this.domElement.addEventListener('mousedown', onMouseDown);
    this.domElement.addEventListener('mouseup', onMouseUp);
    this.domElement.addEventListener('wheel', onWheel, { passive: true });

    this.controls.addEventListener('change', onControlChange);
    this.controls.addEventListener('start', onControlStart);
    this.controls.addEventListener('end', onControlEnd);
  }

  private updateMousePosition(e: MouseEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private checkHover(e: MouseEvent): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.veinMeshes.length === 0) {
      if (this.hoveredVein) {
        setVeinHighlight(this.hoveredVein, false);
        this.hoveredVein = null;
        this.callbacks.onVeinHover(null, e.clientX, e.clientY);
      }
      return;
    }

    const intersects = this.raycaster.intersectObjects(this.veinMeshes, false);

    if (intersects.length > 0) {
      const obj = intersects[0].object as THREE.Mesh;
      const vein = obj.userData.veinData as VeinData | undefined;

      if (vein && vein !== this.hoveredVein) {
        if (this.hoveredVein) {
          setVeinHighlight(this.hoveredVein, false);
        }
        setVeinHighlight(vein, true);
        this.hoveredVein = vein;
        this.callbacks.onVeinHover(vein, e.clientX, e.clientY);
        this.domElement.style.cursor = 'pointer';
      } else if (vein && vein === this.hoveredVein) {
        this.callbacks.onVeinHover(vein, e.clientX, e.clientY);
      }
    } else {
      if (this.hoveredVein) {
        setVeinHighlight(this.hoveredVein, false);
        this.hoveredVein = null;
        this.callbacks.onVeinHover(null, e.clientX, e.clientY);
        this.domElement.style.cursor = 'default';
      }
    }
  }

  private checkClick(e: MouseEvent): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.veinMeshes.length === 0) return;

    const intersects = this.raycaster.intersectObjects(this.veinMeshes, false);

    if (intersects.length > 0) {
      const obj = intersects[0].object as THREE.Mesh;
      const vein = obj.userData.veinData as VeinData | undefined;
      if (vein) {
        this.callbacks.onVeinClick(vein, e.clientX, e.clientY);
      }
    }
  }

  getHoveredVein(): VeinData | null {
    return this.hoveredVein;
  }

  update(): void {
    this.controls.update();
  }

  dispose(): void {
    if (this.boundHandlers) {
      this.domElement.removeEventListener('mousemove', this.boundHandlers.onMouseMove);
      this.domElement.removeEventListener('mousedown', this.boundHandlers.onMouseDown);
      this.domElement.removeEventListener('mouseup', this.boundHandlers.onMouseUp);
      this.domElement.removeEventListener('wheel', this.boundHandlers.onWheel);
      this.controls.removeEventListener('change', this.boundHandlers.onControlChange);
      this.controls.removeEventListener('start', this.boundHandlers.onControlStart);
      this.controls.removeEventListener('end', this.boundHandlers.onControlEnd);
    }
    this.controls.dispose();
  }
}
