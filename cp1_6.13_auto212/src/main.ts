import * as THREE from 'three';
import { Kaleidoscope } from './kaleidoscope';

const ROTATION_SPEED = 1.2;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const ZOOM_DAMPING = 0.1;
const CURSOR_RADIUS = 20;

class Application {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private kaleidoscope!: Kaleidoscope;
  private clock: THREE.Clock = new THREE.Clock();

  private canvas!: HTMLCanvasElement;
  private crosshair!: HTMLDivElement;

  private rotationY: number = 0;
  private rotationX: number = 0;
  private targetRotationY: number = 0;
  private targetRotationX: number = 0;

  private zoom: number = 1.0;
  private targetZoom: number = 1.0;

  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private lastDragTime: number = 0;
  private dragSpeedX: number = 0;
  private dragSpeedY: number = 0;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouseNdc: THREE.Vector2 = new THREE.Vector2();

  private idleTime: number = 0;
  private idleSpinSpeed: number = 0.0008;
  private sphereBaseDistance: number = 8;

  public init(): void {
    this.canvas = document.getElementById('app') as HTMLCanvasElement;
    if (!this.canvas) throw new Error('Canvas #app not found');

    this.createCrosshair();
    this.setupThree();
    this.setupEvents();
    this.animate();
  }

  private createCrosshair(): void {
    this.crosshair = document.createElement('div');
    this.crosshair.style.position = 'fixed';
    this.crosshair.style.pointerEvents = 'none';
    this.crosshair.style.zIndex = '9999';
    this.crosshair.style.opacity = '0';
    this.crosshair.style.transition = 'opacity 0.15s ease';
    this.crosshair.style.transform = 'translate(-50%, -50%)';

    const size = CURSOR_RADIUS * 2;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', String(CURSOR_RADIUS));
    circle.setAttribute('cy', String(CURSOR_RADIUS));
    circle.setAttribute('r', String(CURSOR_RADIUS - 0.5));
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', 'rgba(255,255,255,0.4)');
    circle.setAttribute('stroke-width', '1');

    const lineH = document.createElementNS(svgNS, 'line');
    lineH.setAttribute('x1', '0');
    lineH.setAttribute('y1', String(CURSOR_RADIUS));
    lineH.setAttribute('x2', String(size));
    lineH.setAttribute('y2', String(CURSOR_RADIUS));
    lineH.setAttribute('stroke', 'rgba(255,255,255,0.4)');
    lineH.setAttribute('stroke-width', '1');

    const lineV = document.createElementNS(svgNS, 'line');
    lineV.setAttribute('x1', String(CURSOR_RADIUS));
    lineV.setAttribute('y1', '0');
    lineV.setAttribute('x2', String(CURSOR_RADIUS));
    lineV.setAttribute('y2', String(size));
    lineV.setAttribute('stroke', 'rgba(255,255,255,0.4)');
    lineV.setAttribute('stroke-width', '1');

    svg.appendChild(circle);
    svg.appendChild(lineH);
    svg.appendChild(lineV);
    this.crosshair.appendChild(svg);
    document.body.appendChild(this.crosshair);
  }

  private setupThree(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 1);

    const sphereRadius = this.calculateSphereRadius();
    this.kaleidoscope = new Kaleidoscope(this.scene, sphereRadius);

    this.updateCameraPosition();
  }

  private calculateSphereRadius(): number {
    const minDiameter = 400;
    const viewportHeightPx = window.innerHeight;
    const diameterPx = Math.max(minDiameter, viewportHeightPx * 0.65);
    const fovRad = (this.camera.fov * Math.PI) / 180;
    const visibleHeightAtTarget = 2 * Math.tan(fovRad / 2) * this.sphereBaseDistance;
    const pxPerUnit = viewportHeightPx / visibleHeightAtTarget;
    return (diameterPx / 2) / pxPerUnit;
  }

  private updateCameraPosition(): void {
    const distance = this.sphereBaseDistance / this.zoom;

    const x = distance * Math.sin(this.rotationY) * Math.cos(this.rotationX);
    const y = distance * Math.sin(this.rotationX);
    const z = distance * Math.cos(this.rotationY) * Math.cos(this.rotationX);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private setupEvents(): void {
    window.addEventListener('resize', this.onResize.bind(this));
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.canvas.addEventListener('mouseenter', this.onMouseEnter.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    this.canvas.addEventListener('click', this.onClick.bind(this));
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.kaleidoscope.updateResolution();
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.lastDragTime = performance.now();
    this.dragSpeedX = 0;
    this.dragSpeedY = 0;
    this.idleTime = 0;
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button !== 0) return;
    this.isDragging = false;
  }

  private onMouseMove(e: MouseEvent): void {
    const x = e.clientX;
    const y = e.clientY;

    this.crosshair.style.left = `${x}px`;
    this.crosshair.style.top = `${y}px`;

    this.mouseNdc.x = (x / window.innerWidth) * 2 - 1;
    this.mouseNdc.y = -(y / window.innerHeight) * 2 + 1;

    if (this.isDragging) {
      const now = performance.now();
      const dt = Math.max(1, now - this.lastDragTime);
      const dx = x - this.lastMouseX;
      const dy = y - this.lastMouseY;

      const deltaYaw = (dx / window.innerWidth) * Math.PI * ROTATION_SPEED;
      const deltaPitch = (dy / window.innerHeight) * Math.PI * ROTATION_SPEED;

      this.targetRotationY += deltaYaw;
      this.targetRotationX += deltaPitch;

      const maxPitch = Math.PI / 2 - 0.01;
      this.targetRotationX = Math.max(-maxPitch, Math.min(maxPitch, this.targetRotationX));

      this.dragSpeedX = dx / dt;
      this.dragSpeedY = dy / dt;

      this.lastMouseX = x;
      this.lastMouseY = y;
      this.lastDragTime = now;
      this.idleTime = 0;
    }

    this.updateHoverPoint();
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomFactor = Math.exp(-e.deltaY * 0.001);
    this.targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.targetZoom * zoomFactor));
  }

  private onMouseEnter(): void {
    this.crosshair.style.opacity = '1';
  }

  private onMouseLeave(): void {
    this.crosshair.style.opacity = '0';
    this.isDragging = false;
    this.kaleidoscope.setHoverPoint(null);
  }

  private onClick(_e: MouseEvent): void {
    this.kaleidoscope.triggerPulse();
  }

  private updateHoverPoint(): void {
    this.raycaster.setFromCamera(this.mouseNdc, this.camera);

    const planeNormal = new THREE.Vector3();
    this.camera.getWorldDirection(planeNormal);
    planeNormal.negate();

    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      planeNormal,
      new THREE.Vector3(0, 0, 0)
    );

    const hitPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, hitPoint);

    if (hitPoint) {
      const r = this.kaleidoscope.sphereRadius;
      const len = hitPoint.length();
      if (len > r) {
        hitPoint.multiplyScalar(r / len);
      }
      this.kaleidoscope.setHoverPoint(hitPoint);
    }
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = Math.min(this.clock.getDelta(), 0.05);

    this.updateInteractions(delta);
    this.updateCamera(delta);
    this.updateKaleidoscopeInteraction(delta);

    this.kaleidoscope.update(delta);
    this.renderer.render(this.scene, this.camera);
  }

  private updateInteractions(delta: number): void {
    if (!this.isDragging) {
      this.dragSpeedX *= Math.pow(0.01, delta);
      this.dragSpeedY *= Math.pow(0.01, delta);
      this.idleTime += delta;
    }

    this.rotationY += (this.targetRotationY - this.rotationY) * 0.15;
    this.rotationX += (this.targetRotationX - this.rotationX) * 0.15;

    this.zoom += (this.targetZoom - this.zoom) * ZOOM_DAMPING;

    if (this.idleTime > 2.5 && !this.isDragging) {
      this.targetRotationY += this.idleSpinSpeed;
    }
  }

  private updateCamera(_delta: number): void {
    this.updateCameraPosition();
  }

  private updateKaleidoscopeInteraction(_delta: number): void {
    const speed = Math.sqrt(this.dragSpeedX * this.dragSpeedX + this.dragSpeedY * this.dragSpeedY);
    this.kaleidoscope.setDragSpeed(speed);
  }
}

const app = new Application();
(window as any).__app = app;
app.init();
