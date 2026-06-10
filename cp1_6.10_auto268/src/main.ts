import * as THREE from 'three';
import { StarSystem, getTypeLabel, type StarData, type PlanetData } from './starSystem';
import { EffectsManager } from './effects';

const MIN_ZOOM = 5;
const MAX_ZOOM = 50;
const DAMPING = 0.92;
const VELOCITY_THRESHOLD = 0.0008;

interface CameraState {
  theta: number;
  phi: number;
  radius: number;
  target: THREE.Vector3;
  velTheta: number;
  velPhi: number;
  velRadius: number;
}

function lerpColor(a: THREE.Color, b: THREE.Color, t: number, out: THREE.Color): THREE.Color {
  out.r = a.r + (b.r - a.r) * t;
  out.g = a.g + (b.g - a.g) * t;
  out.b = a.b + (b.b - a.b) * t;
  return out;
}

function createGradientBackground(width: number, height: number): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#0a0e27');
  gradient.addColorStop(1, '#0a0a15');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

class App {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private starSystem: StarSystem;
  private effects: EffectsManager;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;

  private cameraState: CameraState;
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private dragMoved: boolean = false;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredObject: THREE.Object3D | null = null;

  private clock: THREE.Clock;
  private animationId: number = 0;

  private bgColorA: THREE.Color = new THREE.Color('#0a0e27');
  private bgColorB: THREE.Color = new THREE.Color('#0a0a15');
  private warmColor: THREE.Color = new THREE.Color('#1a0e15');

  private infoPanel: HTMLElement;
  private infoTitle: HTMLElement;
  private infoName: HTMLElement;
  private infoType: HTMLElement;
  private infoTemp: HTMLElement;
  private infoMass: HTMLElement;
  private infoPlanetsRow: HTMLElement;
  private infoPlanets: HTMLElement;
  private infoOrbitRow: HTMLElement;
  private infoOrbit: HTMLElement;
  private starCountEl: HTMLElement;

  constructor() {
    this.container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();
    this.scene.background = createGradientBackground(window.innerWidth, window.innerHeight);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    this.ambientLight = new THREE.AmbientLight(0x404060, 0.3);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(10, 20, 10);
    this.scene.add(this.directionalLight);

    this.starSystem = new StarSystem();
    this.scene.add(this.starSystem.group);

    this.effects = new EffectsManager();
    this.scene.add(this.effects.group);

    this.cameraState = {
      theta: Math.PI * 0.3,
      phi: Math.PI * 0.4,
      radius: 30,
      target: new THREE.Vector3(0, 0, 0),
      velTheta: 0,
      velPhi: 0,
      velRadius: 0
    };

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.clock = new THREE.Clock();

    this.infoPanel = document.getElementById('info-panel')!;
    this.infoTitle = document.getElementById('info-title')!;
    this.infoName = document.getElementById('info-name')!;
    this.infoType = document.getElementById('info-type')!;
    this.infoTemp = document.getElementById('info-temp')!;
    this.infoMass = document.getElementById('info-mass')!;
    this.infoPlanetsRow = document.getElementById('info-planets-row')!;
    this.infoPlanets = document.getElementById('info-planets')!;
    this.infoOrbitRow = document.getElementById('info-orbit-row')!;
    this.infoOrbit = document.getElementById('info-orbit')!;
    this.starCountEl = document.getElementById('star-count')!;

    this.bindEvents();
    this.generateGalaxy();
    this.updateCamera();
    this.animate();
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));

    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    window.addEventListener('resize', this.onResize.bind(this));

    document.getElementById('btn-regenerate')!.addEventListener('click', () => {
      this.generateGalaxy();
    });
    document.getElementById('btn-reset')!.addEventListener('click', () => {
      this.resetCamera();
    });
  }

  private generateGalaxy(): void {
    this.starCountEl.classList.add('fading');
    setTimeout(() => {
      this.starSystem.generate(35);
      this.starCountEl.textContent = String(this.starSystem.getStarCount());
      this.starCountEl.classList.remove('fading');
    }, 200);
  }

  private resetCamera(): void {
    this.cameraState.theta = Math.PI * 0.3;
    this.cameraState.phi = Math.PI * 0.4;
    this.cameraState.radius = 30;
    this.cameraState.target.set(0, 0, 0);
    this.cameraState.velTheta = 0;
    this.cameraState.velPhi = 0;
    this.cameraState.velRadius = 0;
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.dragMoved = false;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.isDragging) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;

      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        this.dragMoved = true;
      }

      const sensitivity = 0.005;
      this.cameraState.velTheta = -dx * sensitivity;
      this.cameraState.velPhi = -dy * sensitivity;

      this.cameraState.theta += this.cameraState.velTheta;
      this.cameraState.phi = Math.max(
        0.1,
        Math.min(Math.PI - 0.1, this.cameraState.phi + this.cameraState.velPhi)
      );

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }

    this.checkHover();
  }

  private onMouseUp(e: MouseEvent): void {
    if (this.isDragging && !this.dragMoved) {
      this.handleClick(e);
    }
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomSpeed = 0.003;
    this.cameraState.velRadius = e.deltaY * zoomSpeed;
    this.cameraState.radius = Math.max(
      MIN_ZOOM,
      Math.min(MAX_ZOOM, this.cameraState.radius + this.cameraState.velRadius)
    );
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.scene.background = createGradientBackground(window.innerWidth, window.innerHeight);
  }

  private getPickableObjects(): THREE.Object3D[] {
    const objects: THREE.Object3D[] = [];
    for (const star of this.starSystem.stars) {
      objects.push(star.mesh);
    }
    for (const planet of this.starSystem.planets) {
      objects.push(planet.mesh);
    }
    return objects;
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.getPickableObjects(), false);

    const newHovered = intersects.length > 0 ? intersects[0].object : null;

    if (newHovered !== this.hoveredObject) {
      this.hoveredObject = newHovered;

      if (newHovered) {
        this.showInfoFor(newHovered);
        this.renderer.domElement.style.cursor = 'pointer';
      } else {
        this.hideInfo();
        this.renderer.domElement.style.cursor = 'default';
      }
    }
  }

  private handleClick(_e: MouseEvent): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.getPickableObjects(), false);

    if (intersects.length === 0) return;

    const obj = intersects[0].object;
    const userData = obj.userData;

    if (userData.kind === 'star') {
      const star = this.starSystem.stars[userData.index];
      if (star) {
        this.effects.startSupernova(star.position, star.mesh, star.glow);
      }
    } else if (userData.kind === 'planet') {
      this.showInfoFor(obj);
    }
  }

  private showInfoFor(obj: THREE.Object3D): void {
    const ud = obj.userData;

    if (ud.kind === 'star') {
      const star: StarData = this.starSystem.stars[ud.index];
      if (!star) return;

      this.infoTitle.textContent = '✦ 恒星信息';
      this.infoName.textContent = star.name;
      this.infoType.textContent = getTypeLabel(star.type);
      this.infoTemp.textContent = `${star.temperature} K`;
      this.infoMass.textContent = `${star.mass} M☉`;
      this.infoPlanetsRow.style.display = 'flex';
      this.infoPlanets.textContent = String(star.planets.length);
      this.infoOrbitRow.style.display = 'none';
    } else if (ud.kind === 'planet') {
      const star: StarData = this.starSystem.stars[ud.starIndex];
      const planet: PlanetData | undefined = star?.planets[ud.planetIndex];
      if (!planet) return;

      this.infoTitle.textContent = '◉ 行星信息';
      this.infoName.textContent = planet.name;
      this.infoType.textContent = '行星';
      this.infoTemp.textContent = '—';
      this.infoMass.textContent = '—';
      this.infoPlanetsRow.style.display = 'none';
      this.infoOrbitRow.style.display = 'flex';
      this.infoOrbit.textContent = `${planet.orbitRadius.toFixed(2)} AU`;
    }

    this.infoPanel.classList.add('visible');
  }

  private hideInfo(): void {
    this.infoPanel.classList.remove('visible');
  }

  private updateCamera(): void {
    if (!this.isDragging) {
      this.cameraState.theta += this.cameraState.velTheta;
      this.cameraState.phi = Math.max(
        0.1,
        Math.min(Math.PI - 0.1, this.cameraState.phi + this.cameraState.velPhi)
      );
      this.cameraState.radius = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, this.cameraState.radius + this.cameraState.velRadius)
      );

      this.cameraState.velTheta *= DAMPING;
      this.cameraState.velPhi *= DAMPING;
      this.cameraState.velRadius *= DAMPING;

      if (Math.abs(this.cameraState.velTheta) < VELOCITY_THRESHOLD) this.cameraState.velTheta = 0;
      if (Math.abs(this.cameraState.velPhi) < VELOCITY_THRESHOLD) this.cameraState.velPhi = 0;
      if (Math.abs(this.cameraState.velRadius) < VELOCITY_THRESHOLD) this.cameraState.velRadius = 0;
    }

    const { theta, phi, radius, target } = this.cameraState;
    const sinPhi = Math.sin(phi);
    this.camera.position.set(
      target.x + radius * sinPhi * Math.cos(theta),
      target.y + radius * Math.cos(phi),
      target.z + radius * sinPhi * Math.sin(theta)
    );
    this.camera.lookAt(target);

    const fov = THREE.MathUtils.lerp(75, 45, (radius - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM));
    if (Math.abs(this.camera.fov - fov) > 0.1) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, fov, 0.08);
      this.camera.updateProjectionMatrix();
    }

    const camDir = new THREE.Vector3().subVectors(target, this.camera.position).normalize();
    this.directionalLight.position.copy(this.camera.position).add(
      camDir.clone().multiplyScalar(-5).add(new THREE.Vector3(3, 5, 2))
    );
  }

  private applyGlobalWarmth(): void {
    const w = this.effects.globalWarmth;
    if (w > 0.001) {
      const bg = new THREE.Color();
      const baseBg = lerpColor(this.bgColorA, this.bgColorB, 0.5, new THREE.Color());
      lerpColor(baseBg, this.warmColor, w * 0.7, bg);
      this.scene.background = null;
      this.scene.background = bg;
      this.renderer.toneMappingExposure = 1.0 + w * 0.6;
    } else {
      if (this.scene.background instanceof THREE.Color) {
        this.scene.background = createGradientBackground(window.innerWidth, window.innerHeight);
      }
      this.renderer.toneMappingExposure = 1.0;
    }
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    this.updateCamera();
    this.starSystem.update(delta, elapsed);
    this.effects.update(delta, elapsed);
    this.applyGlobalWarmth();

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.starSystem.clear();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
