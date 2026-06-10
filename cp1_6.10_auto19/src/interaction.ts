import * as THREE from 'three';
import { ExtrudedModel } from './extrude';

export class SceneInteraction {
  private camera: THREE.PerspectiveCamera;
  private models: ExtrudedModel[] = [];
  private canvas: HTMLElement;

  private isRotating = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private targetCameraRotationY = 0;
  private currentCameraRotationY = 0;
  private targetCameraTilt = 0;
  private currentCameraTilt = 0;
  private targetCameraDistance = 9;
  private currentCameraDistance = 9;

  private sceneGroup: THREE.Group;
  private isClearing = false;

  private returnToHomeVelocity = 0;
  private tiltReturnVelocity = 0;

  public userInteracting = false;

  constructor(
    camera: THREE.PerspectiveCamera,
    sceneGroup: THREE.Group,
    canvas: HTMLElement
  ) {
    this.camera = camera;
    this.sceneGroup = sceneGroup;
    this.canvas = canvas;
    this.targetCameraDistance = camera.position.length();
    this.currentCameraDistance = this.targetCameraDistance;
    this.bindEvents();
  }

  public registerModel(model: ExtrudedModel): void {
    this.models.push(model);
  }

  public unregisterModel(model: ExtrudedModel): void {
    const idx = this.models.indexOf(model);
    if (idx >= 0) this.models.splice(idx, 1);
  }

  public clearModels(): void {
    this.models = [];
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd);
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    this.userInteracting = true;
    this.isRotating = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isRotating) return;
    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.targetCameraRotationY -= dx * 0.005;
    this.targetCameraTilt -= dy * 0.003;
    this.targetCameraTilt = Math.max(-0.8, Math.min(0.8, this.targetCameraTilt));
    this.currentCameraRotationY = this.targetCameraRotationY;
    this.currentCameraTilt = this.targetCameraTilt;
  };

  private onMouseUp = (): void => {
    if (!this.isRotating) return;
    this.isRotating = false;
    this.userInteracting = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.08 : 0.92;
    this.targetCameraDistance *= factor;
    this.targetCameraDistance = Math.max(3, Math.min(25, this.targetCameraDistance));
  };

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const t = e.touches[0];
    this.userInteracting = true;
    this.isRotating = true;
    this.lastMouseX = t.clientX;
    this.lastMouseY = t.clientY;
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (!this.isRotating || e.touches.length !== 1) return;
    e.preventDefault();
    const t = e.touches[0];
    const dx = t.clientX - this.lastMouseX;
    const dy = t.clientY - this.lastMouseY;
    this.lastMouseX = t.clientX;
    this.lastMouseY = t.clientY;
    this.targetCameraRotationY -= dx * 0.005;
    this.targetCameraTilt -= dy * 0.003;
    this.targetCameraTilt = Math.max(-0.8, Math.min(0.8, this.targetCameraTilt));
    this.currentCameraRotationY = this.targetCameraRotationY;
    this.currentCameraTilt = this.targetCameraTilt;
  };

  private onTouchEnd = (): void => {
    if (!this.isRotating) return;
    this.isRotating = false;
    this.userInteracting = false;
  };

  public update(delta: number): void {
    if (!this.isRotating) {
      this.targetCameraTilt *= Math.pow(0.001, delta);
      const diff = this.targetCameraTilt - this.currentCameraTilt;
      this.tiltReturnVelocity += diff * 8 * delta;
      this.tiltReturnVelocity *= Math.pow(0.0001, delta);
      this.currentCameraTilt += this.tiltReturnVelocity * delta * 10;

      const yDiff = this.targetCameraRotationY - this.currentCameraRotationY;
      this.returnToHomeVelocity += yDiff * 0.5 * delta;
      this.returnToHomeVelocity *= Math.pow(0.0001, delta);
      this.currentCameraRotationY += this.returnToHomeVelocity * delta * 10;
    }

    const distDiff = this.targetCameraDistance - this.currentCameraDistance;
    this.currentCameraDistance += distDiff * Math.min(1, delta * 8);

    this.updateCameraPosition();

    for (const model of this.models) {
      model.update(delta, this.userInteracting || this.isRotating);
    }
  }

  private updateCameraPosition(): void {
    const yRot = this.currentCameraRotationY;
    const tilt = this.currentCameraTilt;
    const dist = this.currentCameraDistance;
    const cosTilt = Math.cos(tilt);
    this.camera.position.x = Math.sin(yRot) * dist * cosTilt;
    this.camera.position.z = Math.cos(yRot) * dist * cosTilt;
    this.camera.position.y = Math.sin(tilt) * dist + 1.5;
    this.camera.lookAt(0, 0.5, 0);
  }

  public explodeModels(
    scene: THREE.Scene,
    models: ExtrudedModel[],
    onComplete: () => void
  ): void {
    if (models.length === 0) {
      onComplete();
      return;
    }
    this.isClearing = true;
    const totalDuration = 1000;
    const stagger = Math.min(80, totalDuration / Math.max(1, models.length));

    models.forEach((model, index) => {
      setTimeout(() => {
        this.explodeSingleModel(scene, model, totalDuration * 0.8);
      }, index * stagger);
    });

    setTimeout(() => {
      this.isClearing = false;
      onComplete();
    }, totalDuration + 100);
  }

  private explodeSingleModel(
    scene: THREE.Scene,
    model: ExtrudedModel,
    duration: number
  ): void {
    const mesh = model.mesh;
    const geometry = mesh.geometry;
    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const vertexCount = positionAttr.count;
    const particleCount = Math.min(vertexCount, 250);

    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const worldMatrix = model.group.matrixWorld;
    const tmpPos = new THREE.Vector3();
    const tmpColor = model.color.clone();

    const meshWorldPos = new THREE.Vector3();
    model.group.getWorldPosition(meshWorldPos);

    for (let i = 0; i < particleCount; i++) {
      const vi = Math.floor(Math.random() * vertexCount);
      tmpPos.fromBufferAttribute(positionAttr, vi);
      tmpPos.applyMatrix4(worldMatrix);

      positions[i * 3] = tmpPos.x;
      positions[i * 3 + 1] = tmpPos.y;
      positions[i * 3 + 2] = tmpPos.z;

      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 1.5 + 0.5,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(Math.random() * 3 + 1);

      velocities[i * 3] = dir.x;
      velocities[i * 3 + 1] = dir.y;
      velocities[i * 3 + 2] = dir.z;

      const jitter = 0.85 + Math.random() * 0.3;
      colors[i * 3] = Math.min(1, tmpColor.r * jitter);
      colors[i * 3 + 1] = Math.min(1, tmpColor.g * jitter);
      colors[i * 3 + 2] = Math.min(1, tmpColor.b * jitter);

      sizes[i] = 0.04 + Math.random() * 0.08;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      depthWrite: false
    });

    const points = new THREE.Points(particleGeo, particleMat);
    scene.add(points);

    this.sceneGroup.remove(model.group);
    model.dispose();

    const startTime = performance.now();
    const gravity = -4.5;
    const anim = () => {
      const now = performance.now();
      const elapsed = (now - startTime) / 1000;
      const t = Math.min(1, elapsed / (duration / 1000));

      const pos = particleGeo.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < particleCount; i++) {
        velocities[i * 3 + 1] += gravity * 0.016;
        pos.array[i * 3] += velocities[i * 3] * 0.016;
        pos.array[i * 3 + 1] += velocities[i * 3 + 1] * 0.016;
        pos.array[i * 3 + 2] += velocities[i * 3 + 2] * 0.016;
      }
      pos.needsUpdate = true;

      particleMat.opacity = 1 - t;

      if (t < 1) {
        requestAnimationFrame(anim);
      } else {
        scene.remove(points);
        particleGeo.dispose();
        particleMat.dispose();
      }
    };
    anim();
  }
}
