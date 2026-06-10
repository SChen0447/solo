import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Star } from './Star';
import { AsteroidBelt, type AsteroidData } from './AsteroidBelt';

const MIN_CAMERA_DISTANCE = 15;
const MAX_CAMERA_DISTANCE = 50;
const INITIAL_CAMERA_DISTANCE = 30;

class App {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly star: Star;
  private readonly asteroidBelt: AsteroidBelt;
  private readonly clock: THREE.Clock;
  private readonly container: HTMLElement;
  private readonly infoCard: HTMLElement;
  private readonly cardTitle: HTMLElement;
  private readonly cardRadius: HTMLElement;
  private readonly cardPeriod: HTMLElement;
  private readonly cardMass: HTMLElement;
  private animationFrameId: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.infoCard = document.getElementById('info-card')!;
    this.cardTitle = document.getElementById('card-title')!;
    this.cardRadius = document.getElementById('card-radius')!;
    this.cardPeriod = document.getElementById('card-period')!;
    this.cardMass = document.getElementById('card-mass')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );
    this.camera.position.set(
      INITIAL_CAMERA_DISTANCE * 0.6,
      INITIAL_CAMERA_DISTANCE * 0.7,
      INITIAL_CAMERA_DISTANCE * 0.6
    );
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = MIN_CAMERA_DISTANCE;
    this.controls.maxDistance = MAX_CAMERA_DISTANCE;
    this.controls.enablePan = false;
    this.controls.target.set(0, 0, 0);

    this.star = new Star();
    this.scene.add(this.star.group);

    this.asteroidBelt = new AsteroidBelt(this.star.getLightPosition());
    this.scene.add(this.asteroidBelt.group);

    this.clock = new THREE.Clock();

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.addEventListener('click', this.onCanvasClick.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onCanvasClick(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const asteroid = this.asteroidBelt.getAsteroidAt(x, y, this.camera);
    if (asteroid) {
      this.asteroidBelt.highlightAsteroid(asteroid.id, 500);
      this.showInfoCard(asteroid);
    }
  }

  private showInfoCard(data: AsteroidData): void {
    this.cardTitle.textContent = `小行星 #${data.id.toString().padStart(4, '0')}`;
    this.cardRadius.textContent = `${data.orbitRadius.toFixed(2)} AU`;

    const periodFrames = (Math.PI * 2) / data.orbitSpeed;
    const periodSeconds = periodFrames / 60;
    if (periodSeconds >= 60) {
      this.cardPeriod.textContent = `${(periodSeconds / 60).toFixed(2)} 分`;
    } else {
      this.cardPeriod.textContent = `${periodSeconds.toFixed(2)} 秒`;
    }

    this.cardMass.textContent = `${(data.mass * 100).toFixed(1)} %`;

    this.infoCard.classList.add('visible');
  }

  public start(): void {
    this.animate();
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.star.update(elapsed);
    this.asteroidBelt.update(delta, performance.now());
    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.renderer.domElement.removeEventListener('click', this.onCanvasClick.bind(this));
    this.star.dispose();
    this.asteroidBelt.dispose();
    this.renderer.dispose();
    this.controls.dispose();
  }
}

const app = new App();
app.start();
