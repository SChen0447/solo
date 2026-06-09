import * as THREE from 'three';
import { PrismTower } from './prisms';
import { LightSystem } from './lights';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private prismTower: PrismTower;
  private lightSystem: LightSystem;

  private isDragging = false;
  private isAdjustingAngle = false;
  private dragStart = new THREE.Vector2();
  private cameraDistance = 8;
  private targetRotationY = 0;
  private targetTiltX = 0;
  private currentRotationY = 0;
  private currentTiltX = 0;

  private incidentAngle = 0;
  private sliderRotation = 0;

  private clock: THREE.Clock;
  private accumulator = 0;
  private readonly FIXED_DT = 0.016;

  private angleValueEl!: HTMLSpanElement;
  private beamCountEl!: HTMLSpanElement;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      100
    );
    this.updateCameraPosition();

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.setupSceneLights();

    this.prismTower = new PrismTower();
    this.scene.add(this.prismTower.group);

    this.lightSystem = new LightSystem();
    this.scene.add(this.lightSystem.group);

    this.setupControlsUI();
    this.setupEventListeners();
    this.animate();
  }

  private setupSceneLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 5);
    this.scene.add(dir);

    const rim = new THREE.DirectionalLight(0x6688ff, 0.5);
    rim.position.set(-5, 5, -5);
    this.scene.add(rim);
  }

  private updateCameraPosition(): void {
    const tiltRad = (this.currentTiltX * Math.PI) / 180;
    const rotRad = (this.currentRotationY * Math.PI) / 180;
    this.camera.position.x = Math.sin(rotRad) * Math.cos(tiltRad) * this.cameraDistance;
    this.camera.position.y = Math.sin(tiltRad) * this.cameraDistance;
    this.camera.position.z = Math.cos(rotRad) * Math.cos(tiltRad) * this.cameraDistance;
    this.camera.lookAt(0, 0, 0);
  }

  private setupControlsUI(): void {
    this.angleValueEl = document.getElementById('angle-value') as HTMLSpanElement;
    this.beamCountEl = document.getElementById('beam-count') as HTMLSpanElement;

    const sliderAngle = document.getElementById('slider-angle') as HTMLInputElement;
    const sliderRotation = document.getElementById('slider-rotation') as HTMLInputElement;
    const sliderOpacity = document.getElementById('slider-opacity') as HTMLInputElement;
    const sliderParticles = document.getElementById('slider-particles') as HTMLInputElement;

    const sliderAngleValue = document.getElementById('slider-angle-value') as HTMLSpanElement;
    const sliderRotationValue = document.getElementById('slider-rotation-value') as HTMLSpanElement;
    const sliderOpacityValue = document.getElementById('slider-opacity-value') as HTMLSpanElement;
    const sliderParticlesValue = document.getElementById('slider-particles-value') as HTMLSpanElement;

    sliderAngle.addEventListener('input', (e) => {
      const v = parseFloat((e.target as HTMLInputElement).value);
      this.setIncidentAngle(v);
      sliderAngleValue.textContent = v.toFixed(1) + '°';
    });

    sliderRotation.addEventListener('input', (e) => {
      const v = parseInt((e.target as HTMLInputElement).value, 10);
      this.sliderRotation = v;
      this.targetRotationY = v;
      sliderRotationValue.textContent = v + '°';
    });

    sliderOpacity.addEventListener('input', (e) => {
      const v = parseFloat((e.target as HTMLInputElement).value);
      this.prismTower.setPrismOpacity(v);
      sliderOpacityValue.textContent = v.toFixed(2);
    });

    sliderParticles.addEventListener('input', (e) => {
      const v = parseInt((e.target as HTMLInputElement).value, 10);
      this.prismTower.setParticleCount(v);
      sliderParticlesValue.textContent = v.toString();
    });
  }

  private setIncidentAngle(angleDeg: number): void {
    const clamped = THREE.MathUtils.clamp(angleDeg, -30, 30);
    this.incidentAngle = clamped;
    this.lightSystem.setIncidentAngle(clamped);
    this.updateInfoDisplay();
  }

  private updateInfoDisplay(): void {
    this.angleValueEl.textContent = this.incidentAngle.toFixed(1);
    this.beamCountEl.textContent = this.lightSystem.getState().beamCount.toString();
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      this.dragStart.set(e.clientX, e.clientY);

      if (e.shiftKey) {
        this.isAdjustingAngle = true;
      } else {
        this.isDragging = true;
      }
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', (e) => {
      const dx = e.clientX - this.dragStart.x;
      const dy = e.clientY - this.dragStart.y;

      if (this.isAdjustingAngle) {
        const newAngle = this.incidentAngle - dy * 0.3;
        this.setIncidentAngle(newAngle);
        const slider = document.getElementById('slider-angle') as HTMLInputElement;
        slider.value = this.incidentAngle.toString();
        const label = document.getElementById('slider-angle-value') as HTMLSpanElement;
        label.textContent = this.incidentAngle.toFixed(1) + '°';
        this.dragStart.set(e.clientX, e.clientY);
      } else if (this.isDragging) {
        this.targetRotationY = this.sliderRotation + dx * 0.3;
        this.targetTiltX = THREE.MathUtils.clamp(this.currentTiltX + dy * 0.2, -30, 30);
        this.dragStart.set(e.clientX, e.clientY);
      }
    });

    canvas.addEventListener('pointerup', (e) => {
      if (e.button === 0 && !this.isDragging && !this.isAdjustingAngle) {
        this.handleClick(e);
      }
      this.isDragging = false;
      this.isAdjustingAngle = false;
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) { /* noop */ }
    });

    canvas.addEventListener('pointercancel', () => {
      this.isDragging = false;
      this.isAdjustingAngle = false;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance = THREE.MathUtils.clamp(
        this.cameraDistance + e.deltaY * 0.01,
        4,
        12
      );
    }, { passive: false });

    window.addEventListener('resize', () => {
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    });
  }

  private handleClick(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const spot = this.lightSystem.findSpotAtScreenPosition(ndc, this.camera);
    if (spot) {
      this.lightSystem.handleClickOnSpot(spot);
    }
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    const frameDelta = this.clock.getDelta();
    this.accumulator += frameDelta;

    while (this.accumulator >= this.FIXED_DT) {
      this.fixedUpdate(this.FIXED_DT);
      this.accumulator -= this.FIXED_DT;
    }

    this.render();
  }

  private fixedUpdate(dt: number): void {
    const elapsed = performance.now() / 1000;
    const smoothing = 1 - Math.pow(0.001, dt);
    this.currentRotationY = THREE.MathUtils.lerp(this.currentRotationY, this.targetRotationY, smoothing);
    this.currentTiltX = THREE.MathUtils.lerp(this.currentTiltX, this.targetTiltX, smoothing);
    this.prismTower.group.rotation.y = (this.currentRotationY * Math.PI) / 180;
    this.prismTower.group.rotation.x = (this.currentTiltX * Math.PI) / 180;
    this.updateCameraPosition();
    this.prismTower.update(dt, this.isDragging);
    this.lightSystem.update(dt, elapsed);
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}

new App();
