import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Instrument, MarkerInfo } from './Instrument';
import { AudioEngine } from './AudioEngine';

export interface InteractionCallbacks {
  onMarkerHover?: (info: MarkerInfo | null, clientX: number, clientY: number) => void;
  onMarkerClick?: (info: MarkerInfo) => void;
}

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private instrument: Instrument;
  private audioEngine: AudioEngine;
  private callbacks: InteractionCallbacks;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private controls: OrbitControls;

  private hoveredMarker: THREE.Object3D | null = null;
  private isDragging = false;
  private mouseDownPos = { x: 0, y: 0 };

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    instrument: Instrument,
    audioEngine: AudioEngine,
    callbacks: InteractionCallbacks = {}
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.instrument = instrument;
    this.audioEngine = audioEngine;
    this.callbacks = callbacks;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.setupOrbitControls();
    this.setupEventListeners();
  }

  private setupOrbitControls(): void {
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 0.8;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 40;
    this.controls.target.set(0, 1, 0);
    this.controls.enablePan = false;
  }

  private setupEventListeners(): void {
    const dom = this.renderer.domElement;

    dom.addEventListener('pointermove', this.onPointerMove.bind(this));
    dom.addEventListener('pointerdown', this.onPointerDown.bind(this));
    dom.addEventListener('pointerup', this.onPointerUp.bind(this));
    dom.addEventListener('pointerleave', this.onPointerLeave.bind(this));
    dom.addEventListener('click', this.onClick.bind(this));
  }

  private updateMouse(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getIntersectedMarker(): THREE.Intersection | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const pickables = this.instrument.getAllPickableObjects();
    const intersects = this.raycaster.intersectObjects(pickables, false);
    return intersects.length > 0 ? intersects[0] : null;
  }

  private onPointerMove(event: PointerEvent): void {
    this.updateMouse(event);
    const intersect = this.getIntersectedMarker();

    if (intersect) {
      const markerInfo = this.instrument.getMarkerByIntersect(intersect);
      if (markerInfo) {
        this.hoveredMarker = intersect.object;
        this.renderer.domElement.style.cursor = 'pointer';
        if (this.callbacks.onMarkerHover) {
          this.callbacks.onMarkerHover(markerInfo, event.clientX, event.clientY);
        }
      }
    } else {
      if (this.hoveredMarker) {
        this.hoveredMarker = null;
        this.renderer.domElement.style.cursor = 'grab';
        if (this.callbacks.onMarkerHover) {
          this.callbacks.onMarkerHover(null, 0, 0);
        }
      }
    }
  }

  private onPointerDown(event: PointerEvent): void {
    this.isDragging = false;
    this.mouseDownPos = { x: event.clientX, y: event.clientY };
    this.renderer.domElement.style.cursor = 'grabbing';
  }

  private onPointerUp(event: PointerEvent): void {
    const dx = Math.abs(event.clientX - this.mouseDownPos.x);
    const dy = Math.abs(event.clientY - this.mouseDownPos.y);
    this.isDragging = dx > 5 || dy > 5;

    if (!this.hoveredMarker) {
      this.renderer.domElement.style.cursor = 'grab';
    } else {
      this.renderer.domElement.style.cursor = 'pointer';
    }
  }

  private onPointerLeave(): void {
    this.hoveredMarker = null;
    if (this.callbacks.onMarkerHover) {
      this.callbacks.onMarkerHover(null, 0, 0);
    }
    this.renderer.domElement.style.cursor = 'grab';
  }

  private async onClick(event: PointerEvent): Promise<void> {
    if (this.isDragging) return;

    this.updateMouse(event);
    const intersect = this.getIntersectedMarker();
    if (!intersect) return;

    const markerIndex = this.instrument.getMarkerIndexByObject(intersect.object);
    if (markerIndex === null) return;

    const markerInfo = this.instrument.markerInfos[markerIndex];
    if (!markerInfo) return;

    try {
      await this.audioEngine.init();
    } catch (e) {
      console.warn('Audio init failed:', e);
    }

    this.audioEngine.playNote(markerIndex);
    this.instrument.highlightMarker(markerIndex);
    this.instrument.vibrateStrings(markerIndex);

    if (this.callbacks.onMarkerClick) {
      this.callbacks.onMarkerClick(markerInfo);
    }
  }

  public update(): void {
    this.controls.update();
  }

  public getControls(): OrbitControls {
    return this.controls;
  }

  public startAutoRotation(): { cancel: () => void } {
    const originalAutoRotate = this.controls.autoRotate;
    const originalSpeed = this.controls.autoRotateSpeed;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 36;

    let timeoutId: number | null = null;
    let finished = false;

    timeoutId = window.setTimeout(() => {
      if (!finished) {
        this.controls.autoRotate = originalAutoRotate;
        this.controls.autoRotateSpeed = originalSpeed;
        finished = true;
      }
    }, 10000);

    return {
      cancel: () => {
        if (!finished) {
          this.controls.autoRotate = originalAutoRotate;
          this.controls.autoRotateSpeed = originalSpeed;
          if (timeoutId !== null) {
            clearTimeout(timeoutId);
          }
          finished = true;
        }
      }
    };
  }

  public onResize(): void {
    this.controls.update();
  }

  public dispose(): void {
    this.controls.dispose();
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointermove', this.onPointerMove.bind(this));
    dom.removeEventListener('pointerdown', this.onPointerDown.bind(this));
    dom.removeEventListener('pointerup', this.onPointerUp.bind(this));
    dom.removeEventListener('pointerleave', this.onPointerLeave.bind(this));
    dom.removeEventListener('click', this.onClick.bind(this));
  }
}
