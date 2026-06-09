import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';

export class FlyControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  
  private keys: Record<string, boolean> = {};
  private movementSpeed: number = 2.0;
  private lookSpeed: number = 0.002;
  private dampingFactor: number = 0.9;
  
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private pitch: number = 0;
  private yaw: number = 0;
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  private euler: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  private targetQuaternion: THREE.Quaternion = new THREE.Quaternion();

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;

    this.euler.setFromQuaternion(camera.quaternion);
    this.yaw = this.euler.y;
    this.pitch = this.euler.x;

    this.bindEvents();
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('contextmenu', this.onContextMenu);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    this.keys[event.code] = true;
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys[event.code] = false;
  };

  private onMouseDown = (event: MouseEvent): void => {
    if (event.button === 0) {
      this.isDragging = true;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
    }
  };

  private onMouseUp = (event: MouseEvent): void => {
    if (event.button === 0) {
      this.isDragging = false;
    }
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.lastMouseX;
    const deltaY = event.clientY - this.lastMouseY;

    this.yaw -= deltaX * this.lookSpeed;
    this.pitch -= deltaY * this.lookSpeed;

    const maxPitch = Math.PI / 2 - 0.1;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  };

  private onContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  public resetView(position?: THREE.Vector3, target?: THREE.Vector3): void {
    const startPos = this.camera.position.clone();
    const startQuat = this.camera.quaternion.clone();

    const endPos = position || new THREE.Vector3(0, 2.5, 10);
    const lookTarget = target || new THREE.Vector3(0, 2.5, 0);
    
    const tempCamera = new THREE.PerspectiveCamera();
    tempCamera.position.copy(endPos);
    tempCamera.lookAt(lookTarget);
    const endQuat = tempCamera.quaternion.clone();

    new TWEEN.Tween({ t: 0 })
      .to({ t: 1 }, 500)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(({ t }) => {
        this.camera.position.lerpVectors(startPos, endPos, t);
        this.camera.quaternion.slerpQuaternions(startQuat, endQuat, t);
      })
      .onComplete(() => {
        this.targetPosition.copy(endPos);
        this.targetQuaternion.copy(endQuat);
        this.euler.setFromQuaternion(endQuat);
        this.yaw = this.euler.y;
        this.pitch = this.euler.x;
        this.velocity.set(0, 0, 0);
      })
      .start();
  }

  public update(deltaTime: number): void {
    const dt = Math.min(deltaTime, 0.1);

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const up = new THREE.Vector3(0, 1, 0);

    const moveDir = new THREE.Vector3(0, 0, 0);

    if (this.keys['KeyW']) moveDir.add(forward);
    if (this.keys['KeyS']) moveDir.sub(forward);
    if (this.keys['KeyA']) moveDir.sub(right);
    if (this.keys['KeyD']) moveDir.add(right);
    if (this.keys['Space']) moveDir.add(up);
    if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) moveDir.sub(up);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      moveDir.multiplyScalar(this.movementSpeed);
      this.velocity.lerp(moveDir, 1 - this.dampingFactor);
    } else {
      this.velocity.multiplyScalar(this.dampingFactor);
    }

    this.camera.position.addScaledVector(this.velocity, dt);

    this.euler.set(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(this.euler);

    this.camera.position.y = Math.max(0.1, this.camera.position.y);
  }

  public getHeight(): number {
    return this.camera.position.y;
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);
  }
}
