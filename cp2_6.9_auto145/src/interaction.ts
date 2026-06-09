import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { SpaceScene, DebrisData } from './scene';

export class InteractionManager {
  private scene: SpaceScene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private hoveredDebris: DebrisData | null = null;
  private selectedDebris: DebrisData | null = null;
  private trajectoryLine: THREE.Line | null = null;

  private infoLabel: HTMLElement;
  private labelId: HTMLElement;
  private labelAltitude: HTMLElement;
  private labelVelocity: HTMLElement;
  private labelRisk: HTMLElement;

  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private spherical: { radius: number; theta: number; phi: number };
  private targetPosition: THREE.Vector3;
  private isCameraAnimating: boolean = false;

  private defaultCameraPosition: THREE.Vector3 = new THREE.Vector3(15, 10, 15);
  private defaultLookAt: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  constructor(
    scene: SpaceScene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer
  ) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.infoLabel = document.getElementById('info-label')!;
    this.labelId = document.getElementById('label-id')!;
    this.labelAltitude = document.getElementById('label-altitude')!;
    this.labelVelocity = document.getElementById('label-velocity')!;
    this.labelRisk = document.getElementById('label-risk')!;

    this.targetPosition = new THREE.Vector3(0, 0, 0);
    const dir = new THREE.Vector3().subVectors(
      this.camera.position,
      this.targetPosition
    );
    this.spherical = {
      radius: dir.length(),
      theta: Math.atan2(dir.x, dir.z),
      phi: Math.acos(Math.max(-1, Math.min(1, dir.y / dir.length()))),
    };

    this.bindEvents();
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mouseup', () => this.onMouseUp());
    canvas.addEventListener('mouseleave', () => this.onMouseLeave());
    canvas.addEventListener('click', (e) => this.onClick(e));
    canvas.addEventListener('wheel', (e) => this.onWheel(e));

    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', () => this.onTouchEnd());
  }

  private updateMouseFromEvent(e: MouseEvent | Touch): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onMouseMove(e: MouseEvent): void {
    this.updateMouseFromEvent(e);

    if (this.isDragging) {
      const dx = e.clientX - this.previousMousePosition.x;
      const dy = e.clientY - this.previousMousePosition.y;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };

      if (!this.isCameraAnimating) {
        this.spherical.theta -= dx * 0.005;
        this.spherical.phi = Math.max(
          0.1,
          Math.min(Math.PI - 0.1, this.spherical.phi - dy * 0.005)
        );
        this.updateCameraFromSpherical();
      }
      return;
    }

    this.checkHover(e);
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.previousMousePosition = { x: e.clientX, y: e.clientY };
    this.renderer.domElement.style.cursor = 'grabbing';
  }

  private onMouseUp(): void {
    this.isDragging = false;
    this.renderer.domElement.style.cursor = 'grab';
  }

  private onMouseLeave(): void {
    this.isDragging = false;
    this.clearHover();
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    if (this.isCameraAnimating) return;
    const zoomSpeed = 0.001;
    this.spherical.radius = Math.max(
      6,
      Math.min(40, this.spherical.radius + e.deltaY * zoomSpeed * this.spherical.radius)
    );
    this.updateCameraFromSpherical();
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      e.preventDefault();
      this.isDragging = true;
      this.previousMousePosition = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (e.touches.length === 1 && this.isDragging) {
      e.preventDefault();
      const touch = e.touches[0];
      this.updateMouseFromEvent(touch);
      const dx = touch.clientX - this.previousMousePosition.x;
      const dy = touch.clientY - this.previousMousePosition.y;
      this.previousMousePosition = { x: touch.clientX, y: touch.clientY };

      if (!this.isCameraAnimating) {
        this.spherical.theta -= dx * 0.005;
        this.spherical.phi = Math.max(
          0.1,
          Math.min(Math.PI - 0.1, this.spherical.phi - dy * 0.005)
        );
        this.updateCameraFromSpherical();
      }
      this.checkHover(touch);
    }
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  private checkHover(e: MouseEvent | Touch): void {
    if (this.isCameraAnimating) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.scene.getDebrisMeshes();
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const data = mesh.userData.debrisData as DebrisData;
      if (data !== this.hoveredDebris) {
        this.setHovered(data);
      }
      this.updateInfoLabelPosition(e);
      this.renderer.domElement.style.cursor = 'pointer';
    } else {
      this.clearHover();
      this.renderer.domElement.style.cursor = 'grab';
    }
  }

  private setHovered(data: DebrisData): void {
    this.clearHover();
    this.hoveredDebris = data;
    data.mesh.scale.copy(data.originalScale).multiplyScalar(1.5);
    const mat = data.mesh.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.8;
    this.showInfoLabel(data);
  }

  private clearHover(): void {
    if (this.hoveredDebris && this.hoveredDebris !== this.selectedDebris) {
      this.hoveredDebris.mesh.scale.copy(this.hoveredDebris.originalScale);
      if (!this.hoveredDebris.isColliding) {
        const mat = this.hoveredDebris.mesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.3;
      }
    }
    this.hoveredDebris = null;
    this.hideInfoLabel();
  }

  private onClick(e: MouseEvent): void {
    if (this.isDragging) return;

    this.updateMouseFromEvent(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.scene.getDebrisMeshes();
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const data = mesh.userData.debrisData as DebrisData;
      this.selectDebris(data);
    } else {
      this.deselectDebris();
    }
  }

  public selectDebris(data: DebrisData): void {
    if (this.selectedDebris && this.selectedDebris !== data) {
      this.deselectDebris();
    }
    this.selectedDebris = data;
    this.setHovered(data);
    this.animateCameraToDebris(data);
    this.showTrajectory(data);
  }

  public deselectDebris(): void {
    if (this.selectedDebris) {
      this.selectedDebris.mesh.scale.copy(this.selectedDebris.originalScale);
      if (!this.selectedDebris.isColliding) {
        const mat = this.selectedDebris.mesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.3;
      }
      this.selectedDebris = null;
    }
    this.hideTrajectory();
    this.animateCameraToDefault();
  }

  private showInfoLabel(data: DebrisData): void {
    this.labelId.textContent = `#${data.id.toString().padStart(4, '0')}`;
    this.labelAltitude.textContent = `${data.altitudeKm.toFixed(0)} km`;
    this.labelVelocity.textContent = `${data.velocityKms.toFixed(2)} km/s`;

    const riskPct = (data.collisionRisk * 100).toFixed(1) + '%';
    this.labelRisk.textContent = riskPct;
    if (data.collisionRisk > 0.7) {
      this.labelRisk.classList.add('high-risk');
    } else {
      this.labelRisk.classList.remove('high-risk');
    }

    this.infoLabel.classList.remove('hidden');
  }

  private hideInfoLabel(): void {
    this.infoLabel.classList.add('hidden');
  }

  private updateInfoLabelPosition(e: MouseEvent | Touch): void {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      this.infoLabel.style.left = `${e.clientX}px`;
      this.infoLabel.style.top = `${e.clientY}px`;
    } else {
      this.infoLabel.style.left = `${e.clientX}px`;
      this.infoLabel.style.top = `${e.clientY}px`;
    }
  }

  private showTrajectory(data: DebrisData): void {
    this.hideTrajectory();
    const points = this.scene.getOrbitPath(data, 3.0, 90);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const colors = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      const t = i / (points.length - 1);
      const r = 1.0;
      const g = 0.843 - 0.578 * t;
      const b = 0.0;
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
    });

    this.trajectoryLine = new THREE.Line(geometry, material);
    this.scene.scene.add(this.trajectoryLine);
  }

  private hideTrajectory(): void {
    if (this.trajectoryLine) {
      this.scene.scene.remove(this.trajectoryLine);
      this.trajectoryLine.geometry.dispose();
      (this.trajectoryLine.material as THREE.Material).dispose();
      this.trajectoryLine = null;
    }
  }

  private updateTrajectory(): void {
    if (this.selectedDebris && this.trajectoryLine) {
      this.scene.scene.remove(this.trajectoryLine);
      this.trajectoryLine.geometry.dispose();
      (this.trajectoryLine.material as THREE.Material).dispose();
      this.showTrajectory(this.selectedDebris);
    }
  }

  private animateCameraToDebris(data: DebrisData): void {
    this.isCameraAnimating = true;

    const targetLookAt = data.mesh.position.clone();
    const offsetDir = new THREE.Vector3()
      .subVectors(this.camera.position, this.targetPosition)
      .normalize();
    const targetCameraPos = targetLookAt.clone().add(offsetDir.multiplyScalar(3));

    const startPos = this.camera.position.clone();
    const startLookAt = this.targetPosition.clone();

    new TWEEN.Tween({ t: 0 })
      .to({ t: 1 }, 1200)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate((obj) => {
        const t = obj.t;
        this.camera.position.lerpVectors(startPos, targetCameraPos, t);
        const lookAt = new THREE.Vector3().lerpVectors(startLookAt, targetLookAt, t);
        this.camera.lookAt(lookAt);
        this.targetPosition.copy(lookAt);

        const dir = new THREE.Vector3().subVectors(this.camera.position, this.targetPosition);
        this.spherical.radius = dir.length();
        this.spherical.theta = Math.atan2(dir.x, dir.z);
        this.spherical.phi = Math.acos(Math.max(-1, Math.min(1, dir.y / dir.length())));
      })
      .onComplete(() => {
        this.isCameraAnimating = false;
      })
      .start();
  }

  private animateCameraToDefault(): void {
    this.isCameraAnimating = true;

    const startPos = this.camera.position.clone();
    const startLookAt = this.targetPosition.clone();

    new TWEEN.Tween({ t: 0 })
      .to({ t: 1 }, 1200)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate((obj) => {
        const t = obj.t;
        this.camera.position.lerpVectors(startPos, this.defaultCameraPosition, t);
        const lookAt = new THREE.Vector3().lerpVectors(startLookAt, this.defaultLookAt, t);
        this.camera.lookAt(lookAt);
        this.targetPosition.copy(lookAt);

        const dir = new THREE.Vector3().subVectors(this.camera.position, this.targetPosition);
        this.spherical.radius = dir.length();
        this.spherical.theta = Math.atan2(dir.x, dir.z);
        this.spherical.phi = Math.acos(Math.max(-1, Math.min(1, dir.y / dir.length())));
      })
      .onComplete(() => {
        this.isCameraAnimating = false;
      })
      .start();
  }

  private updateCameraFromSpherical(): void {
    const x =
      this.spherical.radius *
      Math.sin(this.spherical.phi) *
      Math.sin(this.spherical.theta);
    const y = this.spherical.radius * Math.cos(this.spherical.phi);
    const z =
      this.spherical.radius *
      Math.sin(this.spherical.phi) *
      Math.cos(this.spherical.theta);
    this.camera.position.set(
      this.targetPosition.x + x,
      this.targetPosition.y + y,
      this.targetPosition.z + z
    );
    this.camera.lookAt(this.targetPosition);
  }

  public update(delta: number, time: number): void {
    TWEEN.update();
    if (this.selectedDebris) {
      this.updateTrajectory();
      if (this.hoveredDebris === this.selectedDebris) {
        this.labelAltitude.textContent = `${this.selectedDebris.altitudeKm.toFixed(0)} km`;
      }
    }
  }

  public onResize(): void {}
}
