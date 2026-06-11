import * as THREE from 'three';

export class CameraControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;

  private spherical = new THREE.Spherical();
  private targetSpherical = new THREE.Spherical();

  private target = new THREE.Vector3(0, 0, 0);
  private isDragging = false;
  private previousMouse = { x: 0, y: 0 };

  private dampingFactor = 0.1;
  private rotateSpeed = 0.005;
  private zoomSpeed = 5;

  private minDistance = 50;
  private maxDistance = 500;

  private keys = { w: false, a: false, s: false, d: false };
  private moveTarget = new THREE.Vector3(0, 0, 0);

  private isAutoTouring = false;
  private autoTourTime = 0;
  private autoTourDuration = 15;
  private autoTourInterrupted = false;

  autoRotateSpeed = 0.01;
  autoRotatePaused = false;
  autoRotateAngle = 0;

  private onInterruptCallback: (() => void) | null = null;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    const dist = camera.position.length();
    this.spherical.set(dist, Math.PI / 3, 0);
    this.targetSpherical.copy(this.spherical);

    this.updateCameraPosition();
    this.bindEvents();
  }

  private bindEvents() {
    this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this));

    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  private onMouseDown(e: MouseEvent) {
    if (e.button === 0) {
      this.isDragging = true;
      this.previousMouse = { x: e.clientX, y: e.clientY };
      this.autoRotatePaused = true;
      if (this.isAutoTouring) {
        this.stopAutoTour();
      }
    }
  }

  private onMouseMove(e: MouseEvent) {
    if (!this.isDragging) return;
    const dx = e.clientX - this.previousMouse.x;
    const dy = e.clientY - this.previousMouse.y;
    this.previousMouse = { x: e.clientX, y: e.clientY };

    this.targetSpherical.theta -= dx * this.rotateSpeed;
    this.targetSpherical.phi -= dy * this.rotateSpeed;
    this.targetSpherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetSpherical.phi));
  }

  private onMouseUp() {
    this.isDragging = false;
    setTimeout(() => {
      if (!this.isDragging) this.autoRotatePaused = false;
    }, 2000);
  }

  private onTouchStart(e: TouchEvent) {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.autoRotatePaused = true;
      if (this.isAutoTouring) this.stopAutoTour();
    }
    e.preventDefault();
  }

  private onTouchMove(e: TouchEvent) {
    if (!this.isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - this.previousMouse.x;
    const dy = e.touches[0].clientY - this.previousMouse.y;
    this.previousMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };

    this.targetSpherical.theta -= dx * this.rotateSpeed;
    this.targetSpherical.phi -= dy * this.rotateSpeed;
    this.targetSpherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetSpherical.phi));
    e.preventDefault();
  }

  private onTouchEnd() {
    this.isDragging = false;
    setTimeout(() => {
      if (!this.isDragging) this.autoRotatePaused = false;
    }, 2000);
  }

  private onWheel(e: WheelEvent) {
    e.preventDefault();
    this.targetSpherical.radius += e.deltaY * this.zoomSpeed * 0.05;
    this.targetSpherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.targetSpherical.radius));
  }

  private onKeyDown(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    if (key in this.keys) {
      (this.keys as any)[key] = true;
      this.autoRotatePaused = true;
      if (this.isAutoTouring) this.stopAutoTour();
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    const key = e.key.toLowerCase();
    if (key in this.keys) {
      (this.keys as any)[key] = false;
    }
  }

  private updateCameraPosition() {
    const pos = new THREE.Vector3();
    pos.setFromSpherical(this.spherical);
    pos.add(this.target);
    this.camera.position.copy(pos);
    this.camera.lookAt(this.target);
  }

  private getMoveSpeed(): number {
    const t = (this.spherical.radius - this.minDistance) / (this.maxDistance - this.minDistance);
    return 1 + t * 2;
  }

  update(delta: number) {
    if (this.isAutoTouring) {
      this.updateAutoTour(delta);
      return;
    }

    if (!this.autoRotatePaused && this.autoRotateSpeed > 0) {
      this.autoRotateAngle += this.autoRotateSpeed * delta * 60;
      this.targetSpherical.theta = this.autoRotateAngle;
    }

    const moveSpeed = this.getMoveSpeed();
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    if (this.keys.w) this.moveTarget.add(forward.clone().multiplyScalar(moveSpeed));
    if (this.keys.s) this.moveTarget.add(forward.clone().multiplyScalar(-moveSpeed));
    if (this.keys.a) this.moveTarget.add(right.clone().multiplyScalar(-moveSpeed));
    if (this.keys.d) this.moveTarget.add(right.clone().multiplyScalar(moveSpeed));

    this.target.lerp(this.moveTarget, 0.05);

    this.spherical.theta += (this.targetSpherical.theta - this.spherical.theta) * this.dampingFactor;
    this.spherical.phi += (this.targetSpherical.phi - this.spherical.phi) * this.dampingFactor;
    this.spherical.radius += (this.targetSpherical.radius - this.spherical.radius) * this.dampingFactor;

    if (this.autoRotatePaused && !this.isDragging && !this.keys.w && !this.keys.a && !this.keys.s && !this.keys.d) {
      this.autoRotateAngle = this.spherical.theta;
    }

    this.updateCameraPosition();
  }

  resetView(onComplete?: () => void) {
    this.isAutoTouring = false;
    this.moveTarget.set(0, 0, 0);

    const startSpherical = this.spherical.clone();
    const endSpherical = new THREE.Spherical(200, Math.PI / 3, 0);
    this.autoRotateAngle = 0;

    const duration = 1.0;
    let elapsed = 0;

    const animate = () => {
      elapsed += 1 / 60;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);

      this.spherical.theta = startSpherical.theta + (endSpherical.theta - startSpherical.theta) * ease;
      this.spherical.phi = startSpherical.phi + (endSpherical.phi - startSpherical.phi) * ease;
      this.spherical.radius = startSpherical.radius + (endSpherical.radius - startSpherical.radius) * ease;

      this.targetSpherical.copy(this.spherical);
      this.updateCameraPosition();

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        onComplete?.();
      }
    };
    animate();
  }

  startAutoTour(onInterrupt: () => void) {
    this.isAutoTouring = true;
    this.autoTourTime = 0;
    this.autoTourInterrupted = false;
    this.onInterruptCallback = onInterrupt;
  }

  stopAutoTour() {
    this.isAutoTouring = false;
    this.autoTourInterrupted = true;
    this.onInterruptCallback?.();
    this.onInterruptCallback = null;
  }

  private updateAutoTour(delta: number) {
    this.autoTourTime += delta;
    const t = this.autoTourTime / this.autoTourDuration;
    if (t >= 1) {
      this.isAutoTouring = false;
      this.onInterruptCallback?.();
      this.onInterruptCallback = null;
      return;
    }

    const angle = t * Math.PI * 2;
    const heightAngle = t * Math.PI * 2;
    const r = 180 + 40 * Math.sin(angle * 2);
    const y = 60 * Math.sin(heightAngle);

    const pos = new THREE.Vector3(r * Math.cos(angle), y, r * Math.sin(angle));
    this.camera.position.copy(pos);
    this.camera.lookAt(0, 0, 0);

    this.spherical.setFromVector3(pos);
    this.targetSpherical.copy(this.spherical);
  }

  getRaycaster(): THREE.Raycaster {
    return new THREE.Raycaster();
  }
}
