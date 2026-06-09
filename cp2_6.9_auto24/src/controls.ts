import * as THREE from 'three';

export interface ControlsCallbacks {
  onTimeSpeedChange: (speed: number) => void;
  onToggleRotation: () => void;
  onResetView: () => void;
}

export class CameraControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private earthRadius: number;
  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };
  private spherical: { theta: number; phi: number; radius: number };
  private targetSpherical: { theta: number; phi: number; radius: number };
  private isResetting: boolean = false;
  private resetProgress: number = 0;
  private resetStartSpherical: { theta: number; phi: number; radius: number } | null = null;
  private readonly minRadius: number;
  private readonly maxRadius: number;
  private readonly defaultTheta: number = 0;
  private readonly defaultPhi: number = Math.PI / 2;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    earthRadius: number
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.earthRadius = earthRadius;
    this.minRadius = earthRadius * 1.5;
    this.maxRadius = earthRadius * 10;
    this.spherical = {
      theta: this.defaultTheta,
      phi: this.defaultPhi,
      radius: earthRadius * 3
    };
    this.targetSpherical = { ...this.spherical };
    this.attachEventListeners();
    this.updateCamera();
  }

  private attachEventListeners(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.domElement.addEventListener('touchstart', this.onTouchStart, { passive: false });
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd);
  }

  private onMouseDown = (e: MouseEvent): void => {
    this.isDragging = true;
    this.isResetting = false;
    this.previousMouse = { x: e.clientX, y: e.clientY };
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.previousMouse.x;
    const dy = e.clientY - this.previousMouse.y;
    this.targetSpherical.theta -= dx * 0.005;
    this.targetSpherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetSpherical.phi - dy * 0.005));
    this.previousMouse = { x: e.clientX, y: e.clientY };
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.isResetting = false;
    const scale = Math.exp(e.deltaY * 0.001);
    this.targetSpherical.radius = Math.max(
      this.minRadius,
      Math.min(this.maxRadius, this.targetSpherical.radius * scale)
    );
  };

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 1) {
      e.preventDefault();
      this.isDragging = true;
      this.isResetting = false;
      this.previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      (this as any)._initialPinchDist = Math.sqrt(dx * dx + dy * dy);
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (e.touches.length === 1 && this.isDragging) {
      e.preventDefault();
      const dx = e.touches[0].clientX - this.previousMouse.x;
      const dy = e.touches[0].clientY - this.previousMouse.y;
      this.targetSpherical.theta -= dx * 0.005;
      this.targetSpherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetSpherical.phi - dy * 0.005));
      this.previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const initialDist = (this as any)._initialPinchDist || dist;
      const scale = initialDist / dist;
      this.targetSpherical.radius = Math.max(
        this.minRadius,
        Math.min(this.maxRadius, this.targetSpherical.radius * scale)
      );
      (this as any)._initialPinchDist = dist;
    }
  };

  private onTouchEnd = (): void => {
    this.isDragging = false;
  };

  public startReset(): void {
    this.isResetting = true;
    this.resetProgress = 0;
    this.resetStartSpherical = { ...this.spherical };
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private lerpSpherical(
    a: { theta: number; phi: number; radius: number },
    b: { theta: number; phi: number; radius: number },
    t: number
  ): { theta: number; phi: number; radius: number } {
    return {
      theta: a.theta + (b.theta - a.theta) * t,
      phi: a.phi + (b.phi - a.phi) * t,
      radius: a.radius + (b.radius - a.radius) * t
    };
  }

  public update(delta: number): void {
    if (this.isResetting && this.resetStartSpherical) {
      this.resetProgress += delta;
      const duration = 1.0;
      const t = Math.min(1, this.resetProgress / duration);
      const easedT = this.easeInOutCubic(t);
      const target = {
        theta: this.defaultTheta,
        phi: this.defaultPhi,
        radius: this.earthRadius * 3
      };
      this.spherical = this.lerpSpherical(this.resetStartSpherical, target, easedT);
      this.targetSpherical = { ...this.spherical };
      if (t >= 1) {
        this.isResetting = false;
        this.resetStartSpherical = null;
      }
    } else if (!this.isDragging) {
      const lerpFactor = 1 - Math.exp(-delta * 10);
      this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * lerpFactor;
      this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * lerpFactor;
      this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * lerpFactor;
    } else {
      this.spherical = { ...this.targetSpherical };
    }
    this.updateCamera();
  }

  private updateCamera(): void {
    const { theta, phi, radius } = this.spherical;
    this.camera.position.set(
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.cos(theta)
    );
    this.camera.lookAt(0, 0, 0);
  }

  public setupUIControls(callbacks: ControlsCallbacks): void {
    const timeSlider = document.getElementById('time-slider') as HTMLInputElement;
    const speedValue = document.getElementById('speed-value')!;
    const toggleBtn = document.getElementById('toggle-rotation') as HTMLButtonElement;
    const resetBtn = document.getElementById('reset-view') as HTMLButtonElement;

    timeSlider.addEventListener('input', () => {
      const speed = parseFloat(timeSlider.value);
      speedValue.textContent = `${speed}x`;
      callbacks.onTimeSpeedChange(speed);
    });

    toggleBtn.addEventListener('click', () => {
      callbacks.onToggleRotation();
      toggleBtn.textContent = toggleBtn.textContent === '暂停自转' ? '恢复自转' : '暂停自转';
    });

    resetBtn.addEventListener('click', () => {
      callbacks.onResetView();
      this.startReset();
    });
  }

  public dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchend', this.onTouchEnd);
  }
}
