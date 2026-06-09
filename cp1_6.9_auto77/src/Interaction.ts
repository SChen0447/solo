import * as THREE from 'three';
import { Fountain, Vortex } from './Fountain';
import { Background } from './Background';

export interface InteractionCallbacks {
  onRateChange?: (rate: number) => void;
}

export class Interaction {
  private container: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  private fountain: Fountain;
  private background: Background;
  private callbacks?: InteractionCallbacks;

  private raycaster: THREE.Raycaster;
  private mouseNdc: THREE.Vector2;
  private isDragging: boolean;
  private worldPoint: THREE.Vector3;
  private plane: THREE.Plane;

  private emissionRate: number = 100;
  private minRate: number = 50;
  private maxRate: number = 200;

  constructor(
    container: HTMLElement,
    camera: THREE.PerspectiveCamera,
    fountain: Fountain,
    background: Background,
    callbacks?: InteractionCallbacks
  ) {
    this.container = container;
    this.camera = camera;
    this.fountain = fountain;
    this.background = background;
    this.callbacks = callbacks;

    this.raycaster = new THREE.Raycaster();
    this.mouseNdc = new THREE.Vector2();
    this.isDragging = false;
    this.worldPoint = new THREE.Vector3();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    this.bindEvents();
    this.updateRate();
  }

  private bindEvents(): void {
    this.container.addEventListener('mousedown', this.onMouseDown);
    this.container.addEventListener('mousemove', this.onMouseMove);
    this.container.addEventListener('mouseup', this.onMouseUp);
    this.container.addEventListener('mouseleave', this.onMouseUp);
    this.container.addEventListener('wheel', this.onWheel, { passive: false });

    this.container.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.container.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.container.addEventListener('touchend', this.onTouchEnd);
  }

  private getMouseNdc(clientX: number, clientY: number): void {
    const rect = this.container.getBoundingClientRect();
    this.mouseNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private intersectYPlane(): boolean {
    this.raycaster.setFromCamera(this.mouseNdc, this.camera);
    const planeNormal = new THREE.Vector3(0, 1, 0);
    const plane = new THREE.Plane(planeNormal, 0);
    const result = this.raycaster.ray.intersectPlane(plane, this.worldPoint);
    return result !== null;
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.getMouseNdc(e.clientX, e.clientY);
    if (this.intersectYPlane()) {
      this.fountain.vortex.start(this.worldPoint);
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.getMouseNdc(e.clientX, e.clientY);
    if (this.isDragging && this.intersectYPlane()) {
      if (this.fountain.vortex.active) {
        this.fountain.vortex.updatePosition(this.worldPoint);
      } else {
        this.fountain.vortex.start(this.worldPoint);
      }
    }
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -10 : 10;
    this.emissionRate = Math.max(this.minRate, Math.min(this.maxRate, this.emissionRate + delta));
    this.updateRate();
  };

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 0) return;
    this.isDragging = true;
    const touch = e.touches[0];
    this.getMouseNdc(touch.clientX, touch.clientY);
    if (this.intersectYPlane()) {
      this.fountain.vortex.start(this.worldPoint);
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    this.getMouseNdc(touch.clientX, touch.clientY);
    if (this.isDragging && this.intersectYPlane()) {
      if (this.fountain.vortex.active) {
        this.fountain.vortex.updatePosition(this.worldPoint);
      } else {
        this.fountain.vortex.start(this.worldPoint);
      }
    }
  };

  private onTouchEnd = (): void => {
    this.isDragging = false;
  };

  private updateRate(): void {
    this.fountain.setEmissionRate(this.emissionRate);
    this.background.setEmissionRate(this.emissionRate);
    if (this.callbacks?.onRateChange) {
      this.callbacks.onRateChange(this.emissionRate);
    }
  }

  public dispose(): void {
    this.container.removeEventListener('mousedown', this.onMouseDown);
    this.container.removeEventListener('mousemove', this.onMouseMove);
    this.container.removeEventListener('mouseup', this.onMouseUp);
    this.container.removeEventListener('mouseleave', this.onMouseUp);
    this.container.removeEventListener('wheel', this.onWheel);
    this.container.removeEventListener('touchstart', this.onTouchStart);
    this.container.removeEventListener('touchmove', this.onTouchMove);
    this.container.removeEventListener('touchend', this.onTouchEnd);
  }
}
