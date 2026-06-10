import * as THREE from 'three';

export class OrbitControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private target: THREE.Vector3;

  private spherical: THREE.Spherical;
  private sphericalDelta: THREE.Spherical;
  private scale: number;

  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number };

  private readonly MIN_POLAR = Math.PI / 2 - THREE.MathUtils.degToRad(30);
  private readonly MAX_POLAR = Math.PI / 2 + THREE.MathUtils.degToRad(30);
  private readonly MIN_DISTANCE = 5;
  private readonly MAX_DISTANCE = 50;
  private readonly ROTATE_SPEED = 0.005;
  private readonly ZOOM_SPEED = 0.95;

  private readonly DEFAULT_DISTANCE = 25;
  private readonly DEFAULT_POLAR = Math.PI / 2;
  private readonly DEFAULT_AZIMUTH = 0;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.target = new THREE.Vector3(0, 10, 0);
    this.spherical = new THREE.Spherical();
    this.sphericalDelta = new THREE.Spherical();
    this.scale = 1;
    this.previousMousePosition = { x: 0, y: 0 };

    this.setFromCamera();
    this.addEventListeners();
  }

  private setFromCamera(): void {
    const offset = new THREE.Vector3().subVectors(this.camera.position, this.target);
    this.spherical.setFromVector3(offset);
    this.spherical.radius = this.DEFAULT_DISTANCE;
    this.spherical.phi = this.DEFAULT_POLAR;
    this.spherical.theta = this.DEFAULT_AZIMUTH;
    this.updateCameraPosition();
  }

  private addEventListeners(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    this.domElement.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('mouseup', this.onMouseUp);
    this.domElement.addEventListener('mouseleave', this.onMouseUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private onMouseDown = (event: MouseEvent): void => {
    this.isDragging = true;
    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.previousMousePosition.x;
    const deltaY = event.clientY - this.previousMousePosition.y;

    this.sphericalDelta.theta -= deltaX * this.ROTATE_SPEED;
    this.sphericalDelta.phi -= deltaY * this.ROTATE_SPEED;

    this.previousMousePosition = {
      x: event.clientX,
      y: event.clientY
    };
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    if (event.deltaY < 0) {
      this.scale *= this.ZOOM_SPEED;
    } else {
      this.scale /= this.ZOOM_SPEED;
    }
  };

  update(): void {
    this.spherical.theta += this.sphericalDelta.theta;
    this.spherical.phi += this.sphericalDelta.phi;

    this.spherical.phi = THREE.MathUtils.clamp(
      this.spherical.phi,
      this.MIN_POLAR,
      this.MAX_POLAR
    );

    this.spherical.radius *= this.scale;
    this.spherical.radius = THREE.MathUtils.clamp(
      this.spherical.radius,
      this.MIN_DISTANCE,
      this.MAX_DISTANCE
    );

    this.updateCameraPosition();

    this.sphericalDelta.set(0, 0, 0);
    this.scale = 1;
  }

  private updateCameraPosition(): void {
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  reset(): void {
    this.spherical.radius = this.DEFAULT_DISTANCE;
    this.spherical.phi = this.DEFAULT_POLAR;
    this.spherical.theta = this.DEFAULT_AZIMUTH;
    this.sphericalDelta.set(0, 0, 0);
    this.scale = 1;
    this.updateCameraPosition();
  }

  dispose(): void {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('mouseleave', this.onMouseUp);
    this.domElement.removeEventListener('wheel', this.onWheel);
  }
}
