import * as THREE from 'three';
import { LensArray } from './LensArray';
import { ParticleSystem } from './ParticleSystem';
import './style.css';

class CrystalGapApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private lensArray: LensArray;
  private particleSystem: ParticleSystem;
  private clock: THREE.Clock;
  private mouse: THREE.Vector2;
  private crosshair: HTMLElement;
  private stars: THREE.Points;

  constructor() {
    const canvas = document.getElementById('scene') as HTMLCanvasElement;
    this.clock = new THREE.Clock();
    this.mouse = new THREE.Vector2(-999, -999);
    this.crosshair = document.getElementById('crosshair')!;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x0a0b16, 1);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0b16, 0.0008);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      5000,
    );
    this.camera.position.set(0, 0, 500);

    this.lensArray = new LensArray(window.innerHeight);
    this.lensArray.setCameraRef(this.camera);
    this.scene.add(this.lensArray.group);

    this.particleSystem = new ParticleSystem();
    this.scene.add(this.particleSystem.group);

    this.stars = this.createStars();
    this.scene.add(this.stars);

    this.setupLighting();
    this.setupEvents();
    this.animate();
  }

  private createStars(): THREE.Points {
    const count = 30;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const periods = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2000;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2000;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1500 - 200;
      sizes[i] = 1 + Math.random() * 2;
      phases[i] = Math.random() * Math.PI * 2;
      periods[i] = 2 + Math.random() * 3;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 2,
      sizeAttenuation: true,
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    (points as any)._starPhases = phases;
    (points as any)._starPeriods = periods;
    return points;
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0x1a1a3e, 0.6);
    this.scene.add(ambient);

    const point1 = new THREE.PointLight(0x4361ee, 1.5, 1000);
    point1.position.set(200, 150, 300);
    this.scene.add(point1);

    const point2 = new THREE.PointLight(0xf72585, 1.0, 800);
    point2.position.set(-200, -100, 200);
    this.scene.add(point2);

    const point3 = new THREE.PointLight(0x4cc9f0, 0.8, 600);
    point3.position.set(0, 200, -200);
    this.scene.add(point3);
  }

  private setupEvents(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      this.crosshair.style.left = `${e.clientX - 10}px`;
      this.crosshair.style.top = `${e.clientY - 10}px`;
      this.crosshair.classList.add('visible');
    });

    window.addEventListener('mouseleave', () => {
      this.crosshair.classList.remove('visible');
    });

    const canvas = this.renderer.domElement;
    canvas.addEventListener('click', (e) => {
      const clickMouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1,
      );

      const hitIndex = this.lensArray.getLensAtMouse(clickMouse, this.camera);
      if (hitIndex >= 0) {
        this.lensArray.triggerExplosion(hitIndex, (pos, color) => {
          this.particleSystem.spawn(pos, color);
        });
      }
    });
  }

  private updateStars(time: number): void {
    const phases = (this.stars as any)._starPhases as Float32Array;
    const periods = (this.stars as any)._starPeriods as Float32Array;
    const baseOpacity = 0.4;

    let avgFlicker = 0;
    for (let i = 0; i < phases.length; i++) {
      avgFlicker += 0.5 + 0.5 * Math.sin(time * (2 * Math.PI / periods[i]) + phases[i]);
    }
    avgFlicker /= phases.length;
    (this.stars.material as THREE.PointsMaterial).opacity = baseOpacity * avgFlicker + 0.1;
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;

    this.lensArray.updateRotation(delta);
    this.particleSystem.update(delta);
    this.updateStars(elapsed);

    this.renderer.render(this.scene, this.camera);
  }
}

new CrystalGapApp();
