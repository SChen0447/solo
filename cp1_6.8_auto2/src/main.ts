import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ParticleGalaxy } from './particles';
import { nextMode, TrajectoryMode } from './trajectory';

class GalaxyApp {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private galaxy: ParticleGalaxy;
  private clock: THREE.Clock;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private globalTime: number = 0;
  private globalHueShift: number = 0;
  private hueCycleTime: number = 0;
  private hueCyclePeriod: number = 120;

  private modeSwitchTimer: number = 0;
  private modeSwitchInterval: number = 5;

  private trailGeometries: THREE.BufferGeometry[] = [];
  private trailMaterials: THREE.PointsMaterial[] = [];
  private trailPoints: THREE.Points[] = [];
  private trailHistory: Float32Array[] = [];
  private trailColors: Float32Array[] = [];
  private trailLength: number = 6;
  private isTrailActive: boolean = true;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 25);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 1);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 80;
    this.controls.enablePan = false;

    this.galaxy = new ParticleGalaxy({
      particleCount: 2000,
      minRadius: 5,
      maxRadius: 15,
      minSize: 0.1,
      maxSize: 0.5
    });

    this.scene.add(this.galaxy.getPoints());

    this.clock = new THREE.Clock();

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.initTrails();
    this.setupEventListeners();
  }

  private initTrails(): void {
    const particleCount = this.galaxy.getParticleCount();

    for (let i = 0; i < this.trailLength; i++) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const alpha = (1 - i / this.trailLength) * 0.4;

      const material = new THREE.PointsMaterial({
        size: 0.8 - i * 0.1,
        map: this.createTrailTexture(),
        transparent: true,
        opacity: alpha,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        sizeAttenuation: true
      });

      const points = new THREE.Points(geometry, material);
      this.scene.add(points);

      this.trailGeometries.push(geometry);
      this.trailMaterials.push(material);
      this.trailPoints.push(points);
      this.trailHistory.push(positions);
      this.trailColors.push(colors);
    }
  }

  private createTrailTexture(): THREE.Texture {
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private updateTrails(): void {
    if (!this.isTrailActive) return;

    const particleCount = this.galaxy.getParticleCount();
    const mainPositions = this.galaxy.getGeometry().attributes.position.array as Float32Array;
    const mainColors = this.galaxy.getGeometry().attributes.color.array as Float32Array;

    for (let i = this.trailLength - 1; i > 0; i--) {
      const prevPositions = this.trailHistory[i - 1];
      const prevColors = this.trailColors[i - 1];
      const currPositions = this.trailHistory[i];
      const currColors = this.trailColors[i];

      for (let j = 0; j < particleCount * 3; j++) {
        currPositions[j] = prevPositions[j];
        currColors[j] = prevColors[j];
      }
    }

    for (let j = 0; j < particleCount * 3; j++) {
      this.trailHistory[0][j] = mainPositions[j];
      this.trailColors[0][j] = mainColors[j];
    }

    for (let i = 0; i < this.trailLength; i++) {
      (this.trailGeometries[i].attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (this.trailGeometries[i].attributes.color as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('click', this.onClick.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      event.preventDefault();
      const current = this.galaxy.getCurrentMode();
      const next = nextMode(current);
      this.galaxy.switchMode(next);
      this.modeSwitchTimer = 0;
    }
  }

  private onClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObject(this.galaxy.getPoints());

    if (intersects.length > 0) {
      const intersection = intersects[0];
      if (intersection.index !== undefined) {
        this.galaxy.highlightParticle(intersection.index);
      }
    }
  }

  private updateHueCycle(deltaTime: number): void {
    this.hueCycleTime += deltaTime;
    const cycleProgress = (this.hueCycleTime % this.hueCyclePeriod) / this.hueCyclePeriod;

    const warmHue = 20;
    const coolHue = 260;

    const t = (Math.sin(cycleProgress * Math.PI * 2) + 1) / 2;
    const baseHue = coolHue + (warmHue - coolHue) * t;

    const slowShift = this.hueCycleTime * 0.5;

    this.globalHueShift = baseHue + slowShift;
  }

  private updateModeSwitch(deltaTime: number): void {
    this.modeSwitchTimer += deltaTime;
    if (this.modeSwitchTimer >= this.modeSwitchInterval) {
      this.modeSwitchTimer = 0;
      const current = this.galaxy.getCurrentMode();
      const next = nextMode(current);
      this.galaxy.switchMode(next);
    }
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const deltaTime = this.clock.getDelta();
    this.globalTime += deltaTime;

    this.updateHueCycle(deltaTime);
    this.updateModeSwitch(deltaTime);
    this.galaxy.update(this.globalTime, deltaTime, this.globalHueShift);
    this.updateTrails();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public start(): void {
    this.clock.start();
    this.animate();
  }

  public dispose(): void {
    this.galaxy.dispose();
    this.trailGeometries.forEach(g => g.dispose());
    this.trailMaterials.forEach(m => m.dispose());
    this.renderer.dispose();
    this.controls.dispose();
  }
}

const app = new GalaxyApp('canvas-container');
app.start();
