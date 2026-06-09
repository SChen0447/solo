import * as THREE from 'three';
import type { Constellation } from './constellation';
import { getConstellationCenter, CONSTELLATIONS } from './constellation';
import type { ConstellationMeshes } from './effects';

export interface CameraState {
  theta: number;
  phi: number;
  radius: number;
  targetTheta: number;
  targetPhi: number;
  targetRadius: number;
}

export const INITIAL_CAMERA: CameraState = {
  theta: 0,
  phi: Math.PI / 6,
  radius: 15,
  targetTheta: 0,
  targetPhi: Math.PI / 6,
  targetRadius: 15
};

const THETA_MIN = -Math.PI;
const THETA_MAX = Math.PI;
const PHI_MIN = -Math.PI / 3;
const PHI_MAX = Math.PI / 3;
const RADIUS_MIN = 5;
const RADIUS_MAX = 30;
const DAMPING = 0.85;

export interface InteractionCallbacks {
  onHover: (constellationId: string | null) => void;
  onClick: (constellationId: string) => void;
  onOutsideClick: () => void;
  onAutoRoamToggle?: (active: boolean) => void;
}

export interface InteractionContext {
  camera: THREE.PerspectiveCamera;
  container: HTMLElement;
  constellationGroups: Map<string, THREE.Group>;
  constellationMeshes: Map<string, ConstellationMeshes>;
  callbacks: InteractionCallbacks;
}

export class InteractionManager {
  private ctx: InteractionContext;
  public state: CameraState;
  private raycaster: THREE.Raycaster;
  private mouseNdc: THREE.Vector2;
  private isDragging: boolean;
  private lastMouse: { x: number; y: number };
  private isAnimatingCamera: boolean;
  private cameraAnimation: {
    startTime: number;
    duration: number;
    startTheta: number;
    startPhi: number;
    startRadius: number;
    endTheta: number;
    endPhi: number;
    endRadius: number;
  } | null;
  private autoRoamActive: boolean;
  private roamIndex: number;
  private roamTimer: number;
  private roamPhase: 'moving' | 'dwelling';
  private hoveredId: string | null;
  private boundResize: () => void;

  constructor(ctx: InteractionContext) {
    this.ctx = ctx;
    this.state = { ...INITIAL_CAMERA };
    this.raycaster = new THREE.Raycaster();
    this.mouseNdc = new THREE.Vector2();
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };
    this.isAnimatingCamera = false;
    this.cameraAnimation = null;
    this.autoRoamActive = false;
    this.roamIndex = 0;
    this.roamTimer = 0;
    this.roamPhase = 'moving';
    this.hoveredId = null;
    this.boundResize = this.onResize.bind(this);

    this.bindEvents();
    this.updateCameraFromState(true);
  }

  private bindEvents(): void {
    const c = this.ctx.container;
    c.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    c.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    c.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    c.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    c.addEventListener('touchend', this.onTouchEnd.bind(this));
    c.addEventListener('click', this.onClick.bind(this));
    window.addEventListener('resize', this.boundResize);

    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', () => this.resetCamera());

    const roamToggle = document.getElementById('auto-roam-toggle');
    if (roamToggle) {
      roamToggle.addEventListener('click', () => {
        this.setAutoRoam(!this.autoRoamActive);
      });
    }
  }

  public setAutoRoam(active: boolean): void {
    this.autoRoamActive = active;
    const el = document.getElementById('auto-roam-toggle');
    if (el) el.classList.toggle('active', active);
    if (active) {
      this.roamIndex = 0;
      this.roamPhase = 'moving';
      this.roamTimer = 0;
      this.focusOnConstellation(CONSTELLATIONS[0].id, 1.2);
    } else {
      this.ctx.callbacks.onAutoRoamToggle?.(false);
    }
    this.ctx.callbacks.onAutoRoamToggle?.(active);
  }

  public resetCamera(duration: number = 2.0): void {
    this.animateCameraTo(
      INITIAL_CAMERA.targetTheta,
      INITIAL_CAMERA.targetPhi,
      INITIAL_CAMERA.targetRadius,
      duration
    );
  }

  public focusOnConstellation(id: string, duration: number = 1.2): void {
    const c = CONSTELLATIONS.find(x => x.id === id);
    if (!c) return;
    const center = getConstellationCenter(c);
    const r = Math.sqrt(center.x * center.x + center.y * center.y + center.z * center.z);
    const targetTheta = Math.atan2(center.x, center.z);
    const targetPhi = Math.asin(center.y / (r || 1));
    const targetRadius = Math.max(8, Math.min(18, r + 5));
    this.animateCameraTo(targetTheta, targetPhi, targetRadius, duration);
  }

  private animateCameraTo(theta: number, phi: number, radius: number, duration: number): void {
    this.isAnimatingCamera = true;
    this.cameraAnimation = {
      startTime: performance.now(),
      duration: duration * 1000,
      startTheta: this.state.theta,
      startPhi: this.state.phi,
      startRadius: this.state.radius,
      endTheta: theta,
      endPhi: phi,
      endRadius: radius
    };
    this.state.targetTheta = theta;
    this.state.targetPhi = phi;
    this.state.targetRadius = radius;
  }

  private onMouseDown(e: MouseEvent): void {
    if (this.autoRoamActive) this.setAutoRoam(false);
    this.isDragging = true;
    this.lastMouse = { x: e.clientX, y: e.clientY };
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.ctx.container.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.mouseNdc.set(nx, ny);

    if (this.isDragging && !this.isAnimatingCamera) {
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      this.state.targetTheta -= dx * 0.005;
      this.state.targetPhi += dy * 0.005;
      this.clampTargets();
      this.lastMouse = { x: e.clientX, y: e.clientY };
    }

    this.checkHover();
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    if (this.autoRoamActive) this.setAutoRoam(false);
    const delta = e.deltaY * 0.005;
    this.state.targetRadius *= 1 + delta;
    this.clampTargets();
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      if (this.autoRoamActive) this.setAutoRoam(false);
      this.isDragging = true;
      this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    e.preventDefault();
  }

  private onTouchMove(e: TouchEvent): void {
    if (e.touches.length === 1 && this.isDragging && !this.isAnimatingCamera) {
      const dx = e.touches[0].clientX - this.lastMouse.x;
      const dy = e.touches[0].clientY - this.lastMouse.y;
      this.state.targetTheta -= dx * 0.005;
      this.state.targetPhi += dy * 0.005;
      this.clampTargets();
      this.lastMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    e.preventDefault();
  }

  private onTouchEnd(e: TouchEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      const rect = this.ctx.container.getBoundingClientRect();
      const t = e.changedTouches[0];
      const nx = ((t.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((t.clientY - rect.top) / rect.height) * 2 + 1;
      this.mouseNdc.set(nx, ny);
      this.checkHover();
    }
  }

  private onClick(_e: MouseEvent): void {
    if (this.isDragging) return;
    this.raycaster.setFromCamera(this.mouseNdc, this.ctx.camera);
    const groups = Array.from(this.ctx.constellationGroups.values());
    const intersects = this.raycaster.intersectObjects(groups, true);
    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !obj.userData.constellationId) obj = obj.parent;
      if (obj) {
        this.ctx.callbacks.onClick(obj.userData.constellationId);
        return;
      }
    }
    this.ctx.callbacks.onOutsideClick();
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouseNdc, this.ctx.camera);
    const groups = Array.from(this.ctx.constellationGroups.values());
    const intersects = this.raycaster.intersectObjects(groups, true);
    let newHover: string | null = null;
    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj && !obj.userData.constellationId) obj = obj.parent;
      if (obj) newHover = obj.userData.constellationId;
    }
    if (newHover !== this.hoveredId) {
      this.hoveredId = newHover;
      this.ctx.callbacks.onHover(newHover);
      this.ctx.container.style.cursor = newHover ? 'pointer' : 'grab';
    }
  }

  private clampTargets(): void {
    this.state.targetTheta = THREE.MathUtils.clamp(this.state.targetTheta, THETA_MIN, THETA_MAX);
    this.state.targetPhi = THREE.MathUtils.clamp(this.state.targetPhi, PHI_MIN, PHI_MAX);
    this.state.targetRadius = THREE.MathUtils.clamp(this.state.targetRadius, RADIUS_MIN, RADIUS_MAX);
  }

  private onResize(): void {
    const cam = this.ctx.camera;
    cam.aspect = window.innerWidth / window.innerHeight;
    cam.updateProjectionMatrix();
  }

  private static easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  public update(dt: number): void {
    if (this.isAnimatingCamera && this.cameraAnimation) {
      const anim = this.cameraAnimation;
      const elapsed = performance.now() - anim.startTime;
      const raw = THREE.MathUtils.clamp(elapsed / anim.duration, 0, 1);
      const t = InteractionManager.easeInOut(raw);
      this.state.theta = anim.startTheta + (anim.endTheta - anim.startTheta) * t;
      this.state.phi = anim.startPhi + (anim.endPhi - anim.startPhi) * t;
      this.state.radius = anim.startRadius + (anim.endRadius - anim.startRadius) * t;
      if (raw >= 1) {
        this.isAnimatingCamera = false;
        this.cameraAnimation = null;
        this.state.targetTheta = this.state.theta;
        this.state.targetPhi = this.state.phi;
        this.state.targetRadius = this.state.radius;
      }
    } else {
      this.state.theta += (this.state.targetTheta - this.state.theta) * (1 - DAMPING);
      this.state.phi += (this.state.targetPhi - this.state.phi) * (1 - DAMPING);
      this.state.radius += (this.state.targetRadius - this.state.radius) * (1 - DAMPING);
    }

    if (this.autoRoamActive) {
      this.roamTimer += dt;
      if (this.roamPhase === 'dwelling' && this.roamTimer >= 3.0) {
        this.roamIndex = (this.roamIndex + 1) % CONSTELLATIONS.length;
        this.focusOnConstellation(CONSTELLATIONS[this.roamIndex].id, 1.2);
        this.roamPhase = 'moving';
        this.roamTimer = 0;
      } else if (this.roamPhase === 'moving' && !this.isAnimatingCamera) {
        this.roamPhase = 'dwelling';
        this.roamTimer = 0;
        this.ctx.callbacks.onClick(CONSTELLATIONS[this.roamIndex].id);
      }
    }

    this.updateCameraFromState(false);
  }

  private updateCameraFromState(snap: boolean): void {
    const cam = this.ctx.camera;
    const { theta, phi, radius } = this.state;
    const x = radius * Math.cos(phi) * Math.sin(theta);
    const y = radius * Math.sin(phi);
    const z = radius * Math.cos(phi) * Math.cos(theta);
    if (snap) {
      cam.position.set(x, y, z);
    } else {
      cam.position.lerp(new THREE.Vector3(x, y, z), 1 - DAMPING);
    }
    cam.lookAt(0, 0, 0);
  }

  public getHoveredId(): string | null {
    return this.hoveredId;
  }

  public isRoamActive(): boolean {
    return this.autoRoamActive;
  }

  public dispose(): void {
    const c = this.ctx.container;
    c.removeEventListener('mousedown', this.onMouseDown.bind(this));
    window.removeEventListener('mousemove', this.onMouseMove.bind(this));
    window.removeEventListener('mouseup', this.onMouseUp.bind(this));
    window.removeEventListener('resize', this.boundResize);
  }
}

export function applyConstellationHighlight(
  meshes: ConstellationMeshes,
  constellation: Constellation,
  highlighted: boolean,
  selected: boolean
): void {
  const targetScale = highlighted || selected ? 1.5 : 1.0;
  const lineOpacity = highlighted || selected ? 1.0 : 0.6;
  const lineColor = highlighted || selected ? '#ffffff' : '#4A90D9';

  for (const star of meshes.stars) {
    star.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.2);
    const mat = star.material as THREE.MeshBasicMaterial;
    if (selected) {
      mat.color.set('#ffffff');
    } else if (highlighted) {
      mat.color.copy(new THREE.Color(constellation.color)).lerp(new THREE.Color('#ffffff'), 0.4);
    } else {
      mat.color.set(constellation.color);
    }
  }

  for (const line of meshes.lines) {
    const mat = line.material as THREE.LineBasicMaterial;
    mat.opacity = THREE.MathUtils.lerp(mat.opacity, lineOpacity, 0.2);
    const cur = mat.color.clone();
    const target = new THREE.Color(lineColor);
    mat.color.copy(cur.lerp(target, 0.2));
  }
}
