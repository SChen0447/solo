import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type HeadingCallback = (heading: number) => void;

export class Navigation {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private controls: OrbitControls;

  private currentHeading: number = 0;
  private targetHeading: number = 0;
  private headingTransitionDuration: number = 0.3;
  private headingTransitionElapsed: number = 0.3;
  private startHeading: number = 0;
  private readonly stepDegrees: number = 5;

  private headingCallbacks: HeadingCallback[] = [];
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.controls = new OrbitControls(this.camera, this.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.minPolarAngle = 0.1;
    this.controls.maxPolarAngle = 2.5;
    this.controls.minDistance = 0.3 * 15;
    this.controls.maxDistance = 3 * 15;
    this.controls.zoomSpeed = 0.8;
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        this.adjustHeading(-this.stepDegrees);
      } else if (e.key === 'ArrowRight') {
        this.adjustHeading(this.stepDegrees);
      }
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  onHeadingChange(callback: HeadingCallback): void {
    this.headingCallbacks.push(callback);
    callback(this.currentHeading);
  }

  private adjustHeading(delta: number): void {
    this.targetHeading += delta;

    while (this.targetHeading > 180) this.targetHeading -= 360;
    while (this.targetHeading < -180) this.targetHeading += 360;

    let diff = this.targetHeading - this.currentHeading;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    this.startHeading = this.currentHeading;
    this.targetHeading = this.startHeading + diff;
    this.headingTransitionElapsed = 0;
  }

  update(delta: number): void {
    this.controls.update();

    if (this.headingTransitionElapsed < this.headingTransitionDuration) {
      this.headingTransitionElapsed += delta;
      const t = Math.min(this.headingTransitionElapsed / this.headingTransitionDuration, 1);
      const easeT = 1 - Math.pow(1 - t, 3);
      const newHeading = this.startHeading + (this.targetHeading - this.startHeading) * easeT;

      if (newHeading !== this.currentHeading) {
        this.currentHeading = newHeading;
        this.notifyHeadingChange();
      }
    } else if (this.currentHeading !== this.targetHeading) {
      this.currentHeading = this.targetHeading;
      this.notifyHeadingChange();
    }
  }

  private notifyHeadingChange(): void {
    for (const cb of this.headingCallbacks) {
      cb(this.currentHeading);
    }
  }

  dispose(): void {
    window.removeEventListener('keydown', this.keyHandler);
    this.controls.dispose();
    this.headingCallbacks = [];
  }
}
