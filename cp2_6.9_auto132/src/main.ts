import * as THREE from 'three';
import { ParticleField } from './ParticleField';
import { Navigation } from './Navigation';
import { DashboardUI } from './UI';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;

  private particleField: ParticleField;
  private navigation: Navigation;
  private ui: DashboardUI;

  private clock: THREE.Clock;
  private animationId: number = 0;

  private readonly INITIAL_PARTICLES = 5000;
  private readonly DOWNGRADE_PARTICLES = 3000;
  private readonly LOW_FPS_THRESHOLD = 30;
  private readonly LOW_FPS_DURATION = 2;
  private hasDowngraded: boolean = false;
  private lowFpsTimer: number = 0;

  private fpsFrames: number[] = [];
  private readonly FPS_WINDOW = 60;

  constructor() {
    this.canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.setupBackground();

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 15);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x0a0a2e, 1);

    this.particleField = new ParticleField(this.scene, this.INITIAL_PARTICLES);
    this.navigation = new Navigation(this.camera, this.canvas);
    this.ui = new DashboardUI(document.getElementById('app')!);

    this.navigation.onHeadingChange((heading) => {
      this.particleField.updateHeading(heading);
      this.ui.updateHeading(heading);
    });

    this.ui.updateParticleCount(this.particleField.getVisibleCount());

    window.addEventListener('resize', this.handleResize);

    this.animate();
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(1, '#1a1a3e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    this.scene.background = texture;
  }

  private handleResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.navigation.update(delta);
    this.particleField.update(delta);
    this.ui.update(delta);

    this.renderer.render(this.scene, this.camera);

    this.monitorFPS(delta);
  }

  private monitorFPS(delta: number): void {
    const instantFps = delta > 0 ? 1 / delta : 60;
    this.fpsFrames.push(instantFps);
    if (this.fpsFrames.length > this.FPS_WINDOW) {
      this.fpsFrames.shift();
    }

    const avgFps =
      this.fpsFrames.reduce((a, b) => a + b, 0) / this.fpsFrames.length;

    this.ui.updateFPS(avgFps);

    if (avgFps < this.LOW_FPS_THRESHOLD && !this.hasDowngraded) {
      this.lowFpsTimer += delta;
      if (this.lowFpsTimer >= this.LOW_FPS_DURATION) {
        this.downgradeParticles();
      }
    } else if (avgFps >= this.LOW_FPS_THRESHOLD) {
      this.lowFpsTimer = Math.max(0, this.lowFpsTimer - delta * 0.5);
    }
  }

  private downgradeParticles(): void {
    if (this.hasDowngraded) return;
    this.hasDowngraded = true;
    this.particleField.setParticleCount(this.DOWNGRADE_PARTICLES);
    this.ui.updateParticleCount(this.particleField.getVisibleCount());
    this.ui.showWarning(
      '性能优化：粒子数量已自动降低以保持流畅',
      3000
    );
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.handleResize);
    this.particleField.dispose();
    this.navigation.dispose();
    this.ui.dispose();
    this.renderer.dispose();
  }
}

new App();
