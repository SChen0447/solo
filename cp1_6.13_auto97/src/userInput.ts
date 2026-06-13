import * as THREE from 'three';

export interface UserInputState {
  windTriggered: boolean;
  zoom: number;
  zoomTarget: number;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ZOOM_LERP = 0.08;

export class UserInput {
  private domElement: HTMLElement;
  private camera: THREE.PerspectiveCamera;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private state: UserInputState;
  private fireHitTestObjects: THREE.Object3D[] = [];
  private onWindTriggered: (() => void) | null = null;

  constructor(domElement: HTMLElement, camera: THREE.PerspectiveCamera) {
    this.domElement = domElement;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.state = {
      windTriggered: false,
      zoom: 1,
      zoomTarget: 1
    };

    this.bindEvents();
  }

  setWindTriggerCallback(callback: () => void) {
    this.onWindTriggered = callback;
  }

  registerFireHitObject(obj: THREE.Object3D) {
    this.fireHitTestObjects.push(obj);
  }

  private bindEvents() {
    this.domElement.addEventListener('click', this.onClick.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    this.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
  }

  private onClick(event: MouseEvent) {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.fireHitTestObjects, true);

    if (intersects.length > 0 || this.fireHitTestObjects.length === 0) {
      this.triggerWind();
    }
  }

  private onTouchStart(event: TouchEvent) {
    event.preventDefault();
    if (event.touches.length > 0) {
      const touch = event.touches[0];
      const rect = this.domElement.getBoundingClientRect();
      this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.fireHitTestObjects, true);

      if (intersects.length > 0 || this.fireHitTestObjects.length === 0) {
        this.triggerWind();
      }
    }
  }

  private onKeyDown(event: KeyboardEvent) {
    if (event.code === 'Space') {
      event.preventDefault();
      this.triggerWind();
    }
  }

  private onWheel(event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    this.state.zoomTarget = THREE.MathUtils.clamp(
      this.state.zoomTarget + delta,
      MIN_ZOOM,
      MAX_ZOOM
    );
  }

  private triggerWind() {
    this.state.windTriggered = true;
    if (this.onWindTriggered) {
      this.onWindTriggered();
    }
  }

  consumeWindTrigger(): boolean {
    const triggered = this.state.windTriggered;
    this.state.windTriggered = false;
    return triggered;
  }

  getZoom(): number {
    return this.state.zoom;
  }

  update(): number {
    const prevZoom = this.state.zoom;
    this.state.zoom = THREE.MathUtils.lerp(
      this.state.zoom,
      this.state.zoomTarget,
      ZOOM_LERP
    );

    const baseFov = 60;
    this.camera.fov = baseFov / this.state.zoom;
    this.camera.updateProjectionMatrix();

    return this.state.zoom - prevZoom;
  }
}
