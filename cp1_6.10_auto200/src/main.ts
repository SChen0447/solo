import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParticleSystem, ParticleSystemParams } from './particleSystem';

class StardustApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private particleSystem: ParticleSystem;
  private container: HTMLElement;
  private clock: THREE.Clock;
  private frameCount = 0;
  private lastFpsUpdate = 0;
  private targetZoom: number = 1;
  private currentZoom: number = 1;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 0, 100);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
    this.controls.rotateSpeed = 0.5;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 150;
    this.controls.enablePan = false;
    this.controls.zoomSpeed = 0.8;

    const params: ParticleSystemParams = {
      particleCount: 2000,
      gravityStrength: 2.0,
      orbitSpeed: 1.0
    };
    this.particleSystem = new ParticleSystem(this.scene, params);

    this.setupEventListeners();
    this.setupControls();
    this.animate();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private setupControls(): void {
    const particleCountSlider = document.getElementById('particle-count') as HTMLInputElement;
    const particleCountValue = document.getElementById('particle-count-value')!;
    const gravitySlider = document.getElementById('gravity-strength') as HTMLInputElement;
    const gravityValue = document.getElementById('gravity-strength-value')!;
    const orbitSpeedSlider = document.getElementById('orbit-speed') as HTMLInputElement;
    const orbitSpeedValue = document.getElementById('orbit-speed-value')!;

    particleCountSlider.addEventListener('input', () => {
      const count = parseInt(particleCountSlider.value, 10);
      particleCountValue.textContent = count.toString();
      this.particleSystem.setParticleCount(count);
    });

    gravitySlider.addEventListener('input', () => {
      const value = parseFloat(gravitySlider.value);
      gravityValue.textContent = value.toFixed(1);
      this.particleSystem.setGravityStrength(value);
    });

    orbitSpeedSlider.addEventListener('input', () => {
      const value = parseFloat(orbitSpeedSlider.value);
      orbitSpeedValue.textContent = value.toFixed(1);
      this.particleSystem.setOrbitSpeed(value);
    });

    this.camera.addEventListener('change', () => {
      this.targetZoom = this.camera.position.length();
    });
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateFPS(timestamp: number): void {
    this.frameCount++;
    if (timestamp - this.lastFpsUpdate >= 1000) {
      const fpsCounter = document.getElementById('fps-counter')!;
      fpsCounter.textContent = `FPS: ${this.frameCount}`;
      this.frameCount = 0;
      this.lastFpsUpdate = timestamp;
    }
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    const timestamp = performance.now();

    this.controls.update();

    const targetDistance = this.camera.position.length();
    this.currentZoom += (targetDistance - this.currentZoom) * Math.min(delta * 5, 1);

    this.particleSystem.update(delta, this.currentZoom);

    this.updateFPS(timestamp);
    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new StardustApp();
});
