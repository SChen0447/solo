import * as THREE from 'three';
import { SatelliteManager } from './satelliteManager';
import { UIManager, type UIData } from './ui';

const EASE_DURATION = 0.3;
const CAMERA_MIN_DISTANCE = 2.5;
const CAMERA_MAX_DISTANCE = 10.0;
const EARTH_ROTATION_SPEED = 0.02;
const STAR_COUNT = 2000;

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private satelliteManager: SatelliteManager;
  private uiManager: UIManager;

  private earth: THREE.Mesh | null = null;
  private earthRotation: number = 0;
  private stars: THREE.Points | null = null;

  private cameraDistance: number = 5;
  private cameraTheta: number = Math.PI * 0.25;
  private cameraPhi: number = Math.PI * 0.4;
  private targetDistance: number = 5;
  private targetTheta: number = Math.PI * 0.25;
  private targetPhi: number = Math.PI * 0.4;
  private lookAtTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private targetLookAt: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  private focusSatelliteId: string | null = null;
  private isFocusing: boolean = false;
  private focusStartPosition: THREE.Vector3 = new THREE.Vector3();
  private focusTargetPosition: THREE.Vector3 = new THREE.Vector3();
  private focusStartTime: number = 0;
  private focusDuration: number = 1.0;

  private lastFrameTime: number = 0;
  private fpsFrames: number = 0;
  private fpsAccumulator: number = 0;
  private currentFps: number = 60;

  constructor() {
    this.container = document.getElementById('canvas-container') as HTMLElement;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.satelliteManager = new SatelliteManager(this.scene);
    this.uiManager = new UIManager();

    this.init();
  }

  private init(): void {
    this.setupRenderer();
    this.setupEarth();
    this.setupStars();
    this.setupLighting();
    this.setupCamera();
    this.setupEvents();
    this.uiManager.setFocusCallback((id) => this.focusOnSatellite(id));
    this.animate = this.animate.bind(this);
    this.lastFrameTime = performance.now();
    requestAnimationFrame(this.animate);
  }

  private setupRenderer(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);
  }

  private setupEarth(): void {
    const geometry = new THREE.SphereGeometry(1, 128, 128);
    const texture = this.createEarthTexture();
    const material = new THREE.MeshPhongMaterial({
      map: texture,
      specular: new THREE.Color(0x223344),
      shininess: 15,
      bumpScale: 0.02
    });
    this.earth = new THREE.Mesh(geometry, material);
    this.scene.add(this.earth);

    const atmosphereGeo = new THREE.SphereGeometry(1.03, 64, 64);
    const atmosphereMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide
    });
    const atmosphere = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    this.scene.add(atmosphere);
  }

  private createEarthTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0a2a4a');
    gradient.addColorStop(0.3, '#0d3d6b');
    gradient.addColorStop(0.5, '#10457a');
    gradient.addColorStop(0.7, '#0d3d6b');
    gradient.addColorStop(1, '#0a2a4a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#1a5530';
    this.drawContinent(ctx, 300, 250, 280, 180);
    this.drawContinent(ctx, 420, 450, 150, 280);
    this.drawContinent(ctx, 1000, 200, 400, 320);
    this.drawContinent(ctx, 1050, 520, 180, 140);
    this.drawContinent(ctx, 1350, 300, 200, 250);
    this.drawContinent(ctx, 1550, 450, 180, 120);
    this.drawContinent(ctx, 200, 80, 140, 80);
    this.drawContinent(ctx, 1600, 80, 250, 100);

    ctx.fillStyle = '#e8e8f0';
    ctx.fillRect(0, 940, canvas.width, 84);
    ctx.fillRect(0, 0, canvas.width, 60);

    for (let i = 0; i < 500; i++) {
      const x = Math.random() * canvas.width;
      const y = 60 + Math.random() * 880;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + Math.random() * 0.15})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 20 + Math.random() * 60, 10 + Math.random() * 30, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private drawContinent(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number): void {
    ctx.beginPath();
    const points = 20;
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const radiusFactor = 0.7 + Math.sin(angle * 3) * 0.15 + Math.cos(angle * 5) * 0.1;
      const r = (i % 2 === 0 ? w : h) * 0.5 * radiusFactor;
      const x = cx + Math.cos(angle) * r * 1.2;
      const y = cy + Math.sin(angle) * r * 0.8;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#257044';
    for (let i = 0; i < 15; i++) {
      const nx = cx + (Math.random() - 0.5) * w * 0.9;
      const ny = cy + (Math.random() - 0.5) * h * 0.9;
      ctx.beginPath();
      ctx.arc(nx, ny, 8 + Math.random() * 20, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#1a5530';
  }

  private setupStars(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(STAR_COUNT * 3);
    const colors = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);
    const phases = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      const radius = 80 + Math.random() * 120;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const brightness = 0.6 + Math.random() * 0.4;
      const tint = Math.random();
      if (tint < 0.7) {
        colors[i * 3] = brightness;
        colors[i * 3 + 1] = brightness;
        colors[i * 3 + 2] = brightness;
      } else if (tint < 0.85) {
        colors[i * 3] = brightness;
        colors[i * 3 + 1] = brightness * 0.85;
        colors[i * 3 + 2] = brightness * 0.7;
      } else {
        colors[i * 3] = brightness * 0.75;
        colors[i * 3 + 1] = brightness * 0.85;
        colors[i * 3 + 2] = brightness;
      }

      sizes[i] = 0.3 + Math.random() * 0.7;
      phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    const material = new THREE.PointsMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      size: 0.5,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(5, 3, 5);
    this.scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x4466aa, 0.4);
    rimLight.position.set(-5, -2, -5);
    this.scene.add(rimLight);
  }

  private setupCamera(): void {
    this.targetDistance = this.cameraDistance;
    this.targetTheta = this.cameraTheta;
    this.targetPhi = this.cameraPhi;
    const sinPhi = Math.sin(this.cameraPhi);
    const x = this.cameraDistance * sinPhi * Math.cos(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * sinPhi * Math.sin(this.cameraTheta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private setupEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.isFocusing = false;
      this.focusSatelliteId = null;
      this.uiManager.setActiveSatellite(null);
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      this.targetTheta -= dx * 0.005;
      this.targetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetPhi - dy * 0.005));
      this.targetLookAt.set(0, 0, 0);
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1.1 : 0.9;
      this.targetDistance = Math.max(
        CAMERA_MIN_DISTANCE,
        Math.min(CAMERA_MAX_DISTANCE, this.targetDistance * delta)
      );
    }, { passive: false });

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.lastMouseX = e.touches[0].clientX;
        this.lastMouseY = e.touches[0].clientY;
        this.isFocusing = false;
        this.focusSatelliteId = null;
        this.uiManager.setActiveSatellite(null);
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (!this.isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - this.lastMouseX;
      const dy = e.touches[0].clientY - this.lastMouseY;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;

      this.targetTheta -= dx * 0.005;
      this.targetPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.targetPhi - dy * 0.005));
      this.targetLookAt.set(0, 0, 0);
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
      this.isDragging = false;
    });

    window.addEventListener('resize', () => this.onResize());
  }

  private focusOnSatellite(id: string): void {
    const pos = this.satelliteManager.getSatellitePosition(id);
    if (!pos) return;

    this.focusSatelliteId = id;
    this.isFocusing = true;
    this.focusStartTime = performance.now();
    this.focusStartPosition.copy(this.camera.position);
    this.focusTargetPosition.copy(pos);
    this.targetLookAt.copy(pos);
    this.uiManager.setActiveSatellite(id);

    const direction = pos.clone().normalize();
    const offset = direction.multiplyScalar(1.2);
    this.focusTargetPosition.add(offset);
    this.targetDistance = 1.5;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private updateCamera(dt: number): void {
    if (this.isFocusing && this.focusSatelliteId) {
      const satPos = this.satelliteManager.getSatellitePosition(this.focusSatelliteId);
      if (satPos) {
        const direction = satPos.clone().normalize();
        const offset = direction.multiplyScalar(1.2);
        this.focusTargetPosition.copy(satPos).add(offset);
        this.targetLookAt.copy(satPos);
      }

      const elapsed = (performance.now() - this.focusStartTime) / 1000;
      if (elapsed >= this.focusDuration) {
        this.isFocusing = false;
      } else {
        const t = this.easeOutCubic(elapsed / this.focusDuration);
        this.camera.position.lerpVectors(this.focusStartPosition, this.focusTargetPosition, t);
        this.lookAtTarget.lerpVectors(new THREE.Vector3(0, 0, 0), this.targetLookAt, t);
        this.camera.lookAt(this.lookAtTarget);
        return;
      }
    }

    const lerpFactor = Math.min(1, dt / EASE_DURATION);

    this.cameraDistance += (this.targetDistance - this.cameraDistance) * lerpFactor;
    this.cameraTheta += (this.targetTheta - this.cameraTheta) * lerpFactor;
    this.cameraPhi += (this.targetPhi - this.cameraPhi) * lerpFactor;
    this.lookAtTarget.lerp(this.targetLookAt, lerpFactor);

    const sinPhi = Math.sin(this.cameraPhi);
    const x = this.lookAtTarget.x + this.cameraDistance * sinPhi * Math.cos(this.cameraTheta);
    const y = this.lookAtTarget.y + this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.lookAtTarget.z + this.cameraDistance * sinPhi * Math.sin(this.cameraTheta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.lookAtTarget);
  }

  private updateStars(dt: number, time: number): void {
    if (!this.stars) return;
    const phaseAttr = this.stars.geometry.getAttribute('phase') as THREE.BufferAttribute;
    const sizeAttr = this.stars.geometry.getAttribute('size') as THREE.BufferAttribute;
    const sizeArr = sizeAttr.array as Float32Array;

    for (let i = 0; i < STAR_COUNT; i++) {
      const phase = phaseAttr.array[i] as number;
      const baseSize = sizeArr[i];
      const pulse = 0.7 + 0.3 * Math.sin(time * 2 + phase);
      (this.stars.material as THREE.PointsMaterial).opacity = 0.7 + 0.2 * Math.sin(time + phase * 0.5);
      phaseAttr.array[i] = phase;
    }

    this.stars.rotation.y += dt * 0.001;
  }

  private animate(): void {
    const now = performance.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;

    this.fpsFrames++;
    this.fpsAccumulator += dt;
    if (this.fpsAccumulator >= 0.5) {
      this.currentFps = this.fpsFrames / this.fpsAccumulator;
      this.fpsFrames = 0;
      this.fpsAccumulator = 0;
    }

    this.earthRotation += EARTH_ROTATION_SPEED * dt;
    if (this.earth) {
      this.earth.rotation.y = this.earthRotation;
    }

    const satelliteData = this.satelliteManager.update(dt, (this.earthRotation * 180) / Math.PI);
    this.updateStars(dt, now / 1000);
    this.updateCamera(dt);

    this.renderer.render(this.scene, this.camera);

    const uiData: UIData = {
      fps: this.currentFps,
      time: new Date(),
      satellites: satelliteData
    };
    this.uiManager.update(uiData);

    requestAnimationFrame(this.animate);
  }
}

new App();
