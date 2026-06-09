import * as THREE from 'three';
import { Firefly, Meteor } from './firefly';
import { SceneSetup } from './scene';

export class InteractionController {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private fireflies: Firefly[];
  private container: HTMLElement;

  private theta: number = 0;
  private phi: number = Math.PI / 3;
  private radius: number = 18;
  private targetTheta: number = 0;
  private targetPhi: number = Math.PI / 3;
  private targetRadius: number = 18;

  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private dragMoved: boolean = false;
  private readonly MIN_PHI: number = Math.PI / 6;
  private readonly MAX_PHI: number = (5 * Math.PI) / 6;
  private readonly MIN_RADIUS: number = 5;
  private readonly MAX_RADIUS: number = 30;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouseNDC: THREE.Vector2 = new THREE.Vector2();

  private selectedFirefly: Firefly | null = null;
  private isMouseDownOnFirefly: boolean = false;

  private moonPhase: number = 4;
  private ambientLight: THREE.AmbientLight;
  private moon: THREE.Mesh;
  private targetAmbientIntensity: number;
  private currentAmbientIntensity: number;
  private readonly MOON_PHASES: { intensity: number; moonOpacity: number }[] = [
    { intensity: 0.05, moonOpacity: 0.1 },
    { intensity: 0.1, moonOpacity: 0.25 },
    { intensity: 0.18, moonOpacity: 0.45 },
    { intensity: 0.28, moonOpacity: 0.65 },
    { intensity: 0.38, moonOpacity: 0.8 },
    { intensity: 0.45, moonOpacity: 0.9 },
    { intensity: 0.5, moonOpacity: 0.95 },
    { intensity: 0.5, moonOpacity: 1.0 }
  ];

  public meteors: Meteor[] = [];
  private meteorPool: Meteor[] = [];
  private readonly METEOR_LIFETIME: number = 1.5;
  private meteorTrails: THREE.Line[] = [];

  private onMoonPhaseChange?: (boost: number) => void;

  constructor(sceneSetup: SceneSetup, fireflies: Firefly[], onMoonPhaseChange?: (boost: number) => void) {
    this.scene = sceneSetup.scene;
    this.camera = sceneSetup.camera;
    this.renderer = sceneSetup.renderer;
    this.fireflies = fireflies;
    this.container = sceneSetup.container;
    this.ambientLight = sceneSetup.ambientLight;
    this.moon = sceneSetup.moon;
    this.onMoonPhaseChange = onMoonPhaseChange;

    this.targetAmbientIntensity = this.MOON_PHASES[this.moonPhase].intensity;
    this.currentAmbientIntensity = this.targetAmbientIntensity;
    this.ambientLight.intensity = this.currentAmbientIntensity;
    (this.moon.material as THREE.MeshBasicMaterial).opacity = this.MOON_PHASES[this.moonPhase].moonOpacity;

    this.bindEvents();
    this.updateCamera();
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown);
    canvas.addEventListener('mousemove', this.onMouseMove);
    canvas.addEventListener('mouseup', this.onMouseUp);
    canvas.addEventListener('mouseleave', this.onMouseUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd);
    window.addEventListener('keydown', this.onKeyDown);
  }

  private getCanvasMouse(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private updateMouseNDC(canvasX: number, canvasY: number): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseNDC.x = (canvasX / rect.width) * 2 - 1;
    this.mouseNDC.y = -(canvasY / rect.height) * 2 + 1;
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    const { x, y } = this.getCanvasMouse(e);
    this.isDragging = true;
    this.dragMoved = false;
    this.lastMouseX = x;
    this.lastMouseY = y;
    this.updateMouseNDC(x, y);

    const firefly = this.pickFirefly();
    if (firefly) {
      this.isMouseDownOnFirefly = true;
      if (this.selectedFirefly && this.selectedFirefly !== firefly) {
        this.selectedFirefly.deselect();
      }
      this.selectedFirefly = firefly;
      firefly.select();
      this.spawnRipple(x, y);
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    const { x, y } = this.getCanvasMouse(e);

    if (this.isDragging) {
      const dx = x - this.lastMouseX;
      const dy = y - this.lastMouseY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        this.dragMoved = true;
        this.isMouseDownOnFirefly = false;
      }
      if (this.dragMoved) {
        this.targetTheta -= dx * 0.005;
        this.targetPhi -= dy * 0.005;
        this.targetPhi = Math.max(this.MIN_PHI, Math.min(this.MAX_PHI, this.targetPhi));
      }
      this.lastMouseX = x;
      this.lastMouseY = y;
    }

    this.updateMouseNDC(x, y);

    if (this.selectedFirefly && this.isMouseDownOnFirefly) {
      const targetPoint = this.intersectVerticalPlane();
      if (targetPoint) {
        this.selectedFirefly.setSelectedTarget(targetPoint);
      }
    }
  };

  private onMouseUp = (): void => {
    if (this.isMouseDownOnFirefly && this.selectedFirefly && !this.dragMoved) {
    }
    this.isDragging = false;
    this.isMouseDownOnFirefly = false;
    if (this.selectedFirefly && !this.isMouseDownOnFirefly) {
      this.selectedFirefly.deselect();
      this.selectedFirefly = null;
    }
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    this.targetRadius *= factor;
    this.targetRadius = Math.max(this.MIN_RADIUS, Math.min(this.MAX_RADIUS, this.targetRadius));
  };

  private onTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      const { x, y } = this.getCanvasMouse(touch);
      this.isDragging = true;
      this.dragMoved = false;
      this.lastMouseX = x;
      this.lastMouseY = y;
      this.updateMouseNDC(x, y);

      const firefly = this.pickFirefly();
      if (firefly) {
        this.isMouseDownOnFirefly = true;
        if (this.selectedFirefly && this.selectedFirefly !== firefly) {
          this.selectedFirefly.deselect();
        }
        this.selectedFirefly = firefly;
        firefly.select();
        this.spawnRipple(x, y);
      }
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (e.touches.length === 1) {
      e.preventDefault();
      const touch = e.touches[0];
      const { x, y } = this.getCanvasMouse(touch);
      const dx = x - this.lastMouseX;
      const dy = y - this.lastMouseY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        this.dragMoved = true;
        this.isMouseDownOnFirefly = false;
      }
      if (this.dragMoved) {
        this.targetTheta -= dx * 0.005;
        this.targetPhi -= dy * 0.005;
        this.targetPhi = Math.max(this.MIN_PHI, Math.min(this.MAX_PHI, this.targetPhi));
      }
      this.lastMouseX = x;
      this.lastMouseY = y;
      this.updateMouseNDC(x, y);

      if (this.selectedFirefly && this.isMouseDownOnFirefly) {
        const targetPoint = this.intersectVerticalPlane();
        if (targetPoint) {
          this.selectedFirefly.setSelectedTarget(targetPoint);
        }
      }
    }
  };

  private onTouchEnd = (): void => {
    this.isDragging = false;
    this.isMouseDownOnFirefly = false;
    if (this.selectedFirefly) {
      this.selectedFirefly.deselect();
      this.selectedFirefly = null;
    }
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'KeyM') {
      this.cycleMoonPhase();
    } else if (e.code === 'Space') {
      e.preventDefault();
      this.spawnMeteor();
    }
  };

  private cycleMoonPhase(): void {
    this.moonPhase = (this.moonPhase + 1) % this.MOON_PHASES.length;
    const phase = this.MOON_PHASES[this.moonPhase];
    this.targetAmbientIntensity = phase.intensity;
    const moonMat = this.moon.material as THREE.MeshBasicMaterial;
    moonMat.opacity = phase.moonOpacity;

    const boost = 1.0 + (1.0 - phase.intensity / 0.5) * 0.3;
    if (this.onMoonPhaseChange) {
      this.onMoonPhaseChange(boost);
    }
  }

  private spawnMeteor(): void {
    let meteor: Meteor;
    if (this.meteorPool.length > 0) {
      meteor = this.meteorPool.pop()!;
    } else {
      meteor = {
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        active: false
      };
    }

    const startX = (Math.random() - 0.5) * 40;
    const startY = 20 + Math.random() * 10;
    const startZ = -15 - Math.random() * 10;
    meteor.position.set(startX, startY, startZ);

    const endX = startX + (Math.random() - 0.5) * 20;
    const endY = startY - 15 - Math.random() * 10;
    const endZ = startZ + 20 + Math.random() * 15;
    const dir = new THREE.Vector3(endX - startX, endY - startY, endZ - startZ).normalize();
    const speed = 25;
    meteor.velocity.copy(dir).multiplyScalar(speed);
    meteor.active = true;

    this.meteors.push(meteor);
    this.createMeteorTrail(meteor);
  }

  private createMeteorTrail(meteor: Meteor): void {
    const points: THREE.Vector3[] = [];
    const trailLength = 15;
    for (let i = 0; i < trailLength; i++) {
      points.push(meteor.position.clone());
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    const line = new THREE.Line(geometry, material);
    (line as any).meteorRef = meteor;
    (line as any).trailPoints = points;
    this.scene.add(line);
    this.meteorTrails.push(line);
  }

  private pickFirefly(): Firefly | null {
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const meshes: THREE.Object3D[] = [];
    for (const f of this.fireflies) {
      meshes.push(f.mesh);
    }
    const intersects = this.raycaster.intersectObjects(meshes, true);
    if (intersects.length > 0) {
      let obj: THREE.Object3D | null = intersects[0].object;
      while (obj) {
        for (const f of this.fireflies) {
          if (f.mesh === obj) return f;
        }
        obj = obj.parent;
      }
    }
    return null;
  }

  private intersectVerticalPlane(): THREE.Vector3 | null {
    if (!this.selectedFirefly) return null;
    const planeNormal = new THREE.Vector3();
    this.camera.getWorldDirection(planeNormal);
    planeNormal.y = 0;
    planeNormal.normalize();

    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      planeNormal,
      new THREE.Vector3(this.selectedFirefly.x, this.selectedFirefly.y, this.selectedFirefly.z)
    );

    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const target = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, target);
    return target;
  }

  private spawnRipple(canvasX: number, canvasY: number): void {
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    const containerRect = this.container.getBoundingClientRect();
    const canvasRect = this.renderer.domElement.getBoundingClientRect();
    ripple.style.left = `${canvasRect.left - containerRect.left + canvasX}px`;
    ripple.style.top = `${canvasRect.top - containerRect.top + canvasY}px`;
    this.container.appendChild(ripple);
    setTimeout(() => ripple.remove(), 300);
  }

  public update(deltaTime: number): void {
    this.theta += (this.targetTheta - this.theta) * Math.min(1, deltaTime * 8);
    this.phi += (this.targetPhi - this.phi) * Math.min(1, deltaTime * 8);
    this.radius += (this.targetRadius - this.radius) * Math.min(1, deltaTime * 6);
    this.currentAmbientIntensity += (this.targetAmbientIntensity - this.currentAmbientIntensity) * Math.min(1, deltaTime * 1);
    this.ambientLight.intensity = this.currentAmbientIntensity;

    this.updateCamera();
    this.updateMeteors(deltaTime);
  }

  private updateCamera(): void {
    const x = this.radius * Math.sin(this.phi) * Math.cos(this.theta);
    const y = this.radius * Math.cos(this.phi);
    const z = this.radius * Math.sin(this.phi) * Math.sin(this.theta);
    this.camera.position.set(x, y + 2, z);
    this.camera.lookAt(0, 3, 0);
  }

  private updateMeteors(deltaTime: number): void {
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const meteor = this.meteors[i];
      if (!meteor.active) continue;

      meteor.position.addScaledVector(meteor.velocity, deltaTime);

      const trail = this.meteorTrails.find((t) => (t as any).meteorRef === meteor);
      if (trail) {
        const points = (trail as any).trailPoints as THREE.Vector3[];
        for (let j = points.length - 1; j > 0; j--) {
          points[j].copy(points[j - 1]);
        }
        points[0].copy(meteor.position);
        trail.geometry.setFromPoints(points);
        trail.geometry.attributes.position.needsUpdate = true;

        const ageAttr = (trail as any)._age || 0;
        (trail as any)._age = ageAttr + deltaTime;
        (trail.material as THREE.LineBasicMaterial).opacity = Math.max(0, 0.8 * (1 - ageAttr / this.METEOR_LIFETIME));
      }

      (meteor as any).lifetime = ((meteor as any).lifetime || 0) + deltaTime;
      if ((meteor as any).lifetime >= this.METEOR_LIFETIME || meteor.position.y < -5) {
        meteor.active = false;
        (meteor as any).lifetime = 0;
        this.meteors.splice(i, 1);
        this.meteorPool.push(meteor);

        if (trail) {
          this.scene.remove(trail);
          trail.geometry.dispose();
          (trail.material as THREE.Material).dispose();
          const idx = this.meteorTrails.indexOf(trail);
          if (idx >= 0) this.meteorTrails.splice(idx, 1);
        }
      }
    }
  }

  public getMoonPhase(): number {
    return this.moonPhase;
  }
}
