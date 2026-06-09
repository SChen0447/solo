import * as THREE from 'three';
import { CelestialBody, BODY_COLORS, massToColor } from './CelestialBody';
import { GravityEngine } from './GravityEngine';
import { UIPanel } from './UIPanel';

class OrbitCamera {
  public camera: THREE.PerspectiveCamera;
  public target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private spherical: THREE.Spherical = new THREE.Spherical();
  private domElement: HTMLElement;
  private isRotating: boolean = false;
  private isPanning: boolean = false;
  private prevX: number = 0;
  private prevY: number = 0;
  private minDistance: number = 5;
  private maxDistance: number = 50;
  private rotateSpeed: number = 0.005;
  private panSpeed: number = 0.01;
  private zoomSpeed: number = 0.1;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.updateSphericalFromCamera();
    this.bindEvents();
  }

  private updateSphericalFromCamera(): void {
    const offset = new THREE.Vector3().subVectors(this.camera.position, this.target);
    this.spherical.setFromVector3(offset);
  }

  private updateCameraFromSpherical(): void {
    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  public reset(): void {
    this.target.set(0, 0, 0);
    this.camera.position.set(0, 15, 25);
    this.camera.lookAt(this.target);
    this.updateSphericalFromCamera();
  }

  private bindEvents(): void {
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    this.domElement.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('mouseup', this.onMouseUp);
    this.domElement.addEventListener('mouseleave', this.onMouseUp);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.isRotating = true;
    } else if (e.button === 2) {
      this.isPanning = true;
    }
    this.prevX = e.clientX;
    this.prevY = e.clientY;
  };

  private onMouseMove = (e: MouseEvent): void => {
    const dx = e.clientX - this.prevX;
    const dy = e.clientY - this.prevY;
    this.prevX = e.clientX;
    this.prevY = e.clientY;

    if (this.isRotating) {
      this.spherical.theta -= dx * this.rotateSpeed;
      this.spherical.phi -= dy * this.rotateSpeed;
      this.spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, this.spherical.phi));
      this.updateCameraFromSpherical();
    } else if (this.isPanning) {
      const panOffset = new THREE.Vector3();
      const distance = this.spherical.radius;
      const right = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);
      right.crossVectors(this.camera.getWorldDirection(new THREE.Vector3()), up).normalize();
      panOffset.addScaledVector(right, -dx * this.panSpeed * distance * 0.05);
      panOffset.addScaledVector(up, dy * this.panSpeed * distance * 0.05);
      this.target.add(panOffset);
      this.updateCameraFromSpherical();
    }
  };

  private onMouseUp = (): void => {
    this.isRotating = false;
    this.isPanning = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1 + this.zoomSpeed : 1 - this.zoomSpeed;
    this.spherical.radius = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.spherical.radius * factor)
    );
    this.updateCameraFromSpherical();
  };

  public isInteracting(): boolean {
    return this.isRotating || this.isPanning;
  }
}

class Starfield {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stars: { x: number; y: number; r: number; baseAlpha: number; phase: number; speed: number }[] = [];
  private time: number = 0;

  constructor(canvasId: string) {
    const c = document.getElementById(canvasId);
    if (!c) throw new Error(`Canvas #${canvasId} not found`);
    this.canvas = c as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.resize();
    this.generateStars();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private generateStars(): void {
    this.stars = [];
    const count = Math.floor((window.innerWidth * window.innerHeight) / 5000);
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        r: 1 + Math.random(),
        baseAlpha: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1,
      });
    }
  }

  public update(dt: number): void {
    this.time += dt;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const s of this.stars) {
      const flicker = 0.7 + 0.3 * Math.sin(this.time * s.speed + s.phase);
      this.ctx.globalAlpha = s.baseAlpha * flicker;
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }
}

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private orbit: OrbitCamera;
  private engine: GravityEngine;
  private uiPanel: UIPanel;
  private starfield: Starfield;
  private clock: THREE.Clock;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private selectedBody: CelestialBody | null = null;
  private isDraggingBody: boolean = false;
  private dragStartPos: THREE.Vector3 = new THREE.Vector3();
  private dragStartScreen: { x: number; y: number; time: number } | null = null;
  private lastDragPos: THREE.Vector3 = new THREE.Vector3();
  private lastDragTime: number = 0;
  private containerEl: HTMLElement;
  private trailUpdateAccumulator: number = 0;

  constructor() {
    this.containerEl = document.getElementById('canvas-container')!;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 15, 25);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.containerEl.appendChild(this.renderer.domElement);

    this.orbit = new OrbitCamera(this.camera, this.renderer.domElement);
    this.engine = new GravityEngine(this.scene);
    this.starfield = new Starfield('stars-layer');
    this.clock = new THREE.Clock();

    this.uiPanel = new UIPanel('ui-panel', {
      onGChange: (v) => (this.engine.G = v),
      onTimeScaleChange: (v) => (this.engine.timeScale = v),
      onAddRandomBody: () => this.addRandomBody(),
    });

    this.bindGlobalEvents();
    this.spawnInitialBodies();
  }

  private bindGlobalEvents(): void {
    window.addEventListener('resize', this.onResize);
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown);
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove);
    this.renderer.domElement.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('keydown', this.onKeyDown);
    document.getElementById('reset-btn')!.addEventListener('click', this.onReset);
  }

  private onResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private updateMouse(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private pickBody(): CelestialBody | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.engine.bodies.map((b) => b.mesh);
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length > 0) {
      const mesh = hits[0].object;
      return this.engine.bodies.find((b) => b.mesh === mesh) || null;
    }
    return null;
  }

  private getPlanePoint(): THREE.Vector3 {
    const planeNormal = new THREE.Vector3(0, 1, 0);
    const planeD = 0;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const dir = this.raycaster.ray.direction;
    const origin = this.raycaster.ray.origin;
    const denom = dir.dot(planeNormal);
    if (Math.abs(denom) < 1e-6) {
      return origin.clone().addScaledVector(dir, 20);
    }
    const t = -(origin.dot(planeNormal) + planeD) / denom;
    if (t <= 0) return origin.clone().addScaledVector(dir, 20);
    return origin.clone().addScaledVector(dir, t);
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    this.updateMouse(e);
    const hit = this.pickBody();
    if (hit) {
      if (this.selectedBody && this.selectedBody !== hit) {
        this.selectedBody.setSelected(false);
      }
      this.selectedBody = hit;
      this.selectedBody.setSelected(true);
      this.isDraggingBody = true;
      this.dragStartPos.copy(hit.data.position);
      this.lastDragPos.copy(hit.data.position);
      this.dragStartScreen = { x: e.clientX, y: e.clientY, time: performance.now() };
      this.lastDragTime = performance.now();
    } else {
      if (this.selectedBody) {
        this.selectedBody.setSelected(false);
        this.selectedBody = null;
      }
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    this.updateMouse(e);
    if (this.isDraggingBody && this.selectedBody) {
      const worldPt = this.getPlanePoint();
      this.selectedBody.updatePosition(worldPt);
      const now = performance.now();
      this.lastDragPos.copy(worldPt);
      this.lastDragTime = now;
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (!this.isDraggingBody) {
      if (e.button === 0 && !this.orbit.isInteracting()) {
        this.updateMouse(e);
        const hit = this.pickBody();
        if (!hit && this.dragStartScreen) {
          const elapsed = performance.now() - this.dragStartScreen.time;
          const dist = Math.hypot(e.clientX - this.dragStartScreen.x, e.clientY - this.dragStartScreen.y);
          if (elapsed < 300 && dist < 5) {
            this.addBodyAtClick();
          }
        }
      }
      this.dragStartScreen = null;
      return;
    }

    if (this.selectedBody && this.dragStartScreen) {
      const now = performance.now();
      const dt = Math.max(0.016, (now - this.lastDragTime) / 1000);
      const dragVel = new THREE.Vector3()
        .subVectors(this.selectedBody.data.position, this.lastDragPos)
        .divideScalar(dt);
      this.selectedBody.data.velocity.copy(dragVel);
    }
    this.isDraggingBody = false;
    this.dragStartScreen = null;
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Shift') {
      this.engine.clearAllTrails();
    }
  };

  private onReset = (): void => {
    this.engine.clearAll();
    this.selectedBody = null;
    this.orbit.reset();
    this.spawnInitialBodies();
  };

  private addBodyAtClick(): void {
    const pos = this.getPlanePoint();
    const mass = 1 + Math.random() * 9;
    const color = BODY_COLORS[Math.floor(Math.random() * BODY_COLORS.length)].clone();
    const body = new CelestialBody(pos, new THREE.Vector3(0, 0, 0), mass, color);
    this.engine.addBody(body);
  }

  private addRandomBody(): void {
    const angle = Math.random() * Math.PI * 2;
    const r = 8 + Math.random() * 10;
    const pos = new THREE.Vector3(Math.cos(angle) * r, (Math.random() - 0.5) * 4, Math.sin(angle) * r);
    const mass = 1 + Math.random() * 9;
    const color = BODY_COLORS[Math.floor(Math.random() * BODY_COLORS.length)].clone();
    const dir = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
    const speed = 1 + Math.random() * 2;
    const vel = dir.multiplyScalar(speed);
    const body = new CelestialBody(pos, vel, mass, color);
    this.engine.addBody(body);
  }

  private spawnInitialBodies(): void {
    const star = new CelestialBody(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
      20,
      new THREE.Color('#FFD700'),
      2.5,
      true,
      0.1,
      1
    );
    this.engine.addBody(star);

    const planet = new CelestialBody(
      new THREE.Vector3(8, 0, 0),
      new THREE.Vector3(0, 0, 2.5),
      2,
      new THREE.Color('#4FC3F7'),
      0.6
    );
    this.engine.addBody(planet);
  }

  public start(): void {
    const animate = (): void => {
      requestAnimationFrame(animate);
      const dt = Math.min(0.05, this.clock.getDelta());
      const time = this.clock.elapsedTime;

      this.starfield.update(dt);

      if (!this.isDraggingBody) {
        this.engine.step(dt);
      }

      this.trailUpdateAccumulator += dt;
      if (this.trailUpdateAccumulator >= 0.033) {
        for (const body of this.engine.bodies) {
          body.updateTrail(200);
        }
        this.trailUpdateAccumulator = 0;
      }

      for (const body of this.engine.bodies) {
        body.animatePulse(dt);
        body.animateHalo(time);
      }

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }
}

const app = new App();
app.start();
