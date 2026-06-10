import * as THREE from 'three';
import { PoemManager } from './poemManager';
import { ParticleSystem, type ColorScheme } from './particleSystem';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private poemManager: PoemManager;
  private particleSystem: ParticleSystem;
  private clock: THREE.Clock;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.poemManager = new PoemManager();
    this.particleSystem = new ParticleSystem(this.scene, this.poemManager.getParticlesPerChar());

    const initialPoem = this.poemManager.generatePoemData();
    this.particleSystem.init(initialPoem);

    this.setupEventListeners();
    this.animate();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('click', this.onClick.bind(this));

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        this.handlePointerMove(touch.clientX, touch.clientY);
      }
    }, { passive: true });

    window.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        this.handlePointerClick(touch.clientX, touch.clientY);
      }
    }, { passive: true });

    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const poemIndex = parseInt(target.dataset.poem || '0', 10);

        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        target.classList.add('active');

        const poemData = this.poemManager.switchPoem(poemIndex);
        this.particleSystem.updatePoem(poemData);
      });
    });

    const sizeSlider = document.getElementById('particleSize') as HTMLInputElement;
    const sizeValue = document.getElementById('sizeValue')!;
    sizeSlider.addEventListener('input', () => {
      const size = parseFloat(sizeSlider.value);
      sizeValue.textContent = `${size.toFixed(1)}px`;
      this.particleSystem.setParticleSize(size);
    });

    const speedSlider = document.getElementById('scatterSpeed') as HTMLInputElement;
    const speedValue = document.getElementById('speedValue')!;
    speedSlider.addEventListener('input', () => {
      const speed = parseFloat(speedSlider.value);
      speedValue.textContent = `${speed.toFixed(1)}x`;
      this.particleSystem.setScatterSpeed(speed);
    });

    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const scheme = target.dataset.scheme as ColorScheme;

        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        target.classList.add('active');

        this.particleSystem.setColorScheme(scheme);
      });
    });
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.particleSystem.resize();
  }

  private onMouseMove(e: MouseEvent): void {
    this.handlePointerMove(e.clientX, e.clientY);
  }

  private handlePointerMove(clientX: number, clientY: number): void {
    const normalizedX = (clientX / window.innerWidth) * 2 - 1;
    const normalizedY = -(clientY / window.innerHeight) * 2 + 1;
    this.particleSystem.handleMouseMove(normalizedX, normalizedY, this.camera);
  }

  private onClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).closest('.nav-btn, .control-panel, .color-btn, .slider')) {
      return;
    }
    this.handlePointerClick(e.clientX, e.clientY);
  }

  private handlePointerClick(clientX: number, clientY: number): void {
    const normalizedX = (clientX / window.innerWidth) * 2 - 1;
    const normalizedY = -(clientY / window.innerHeight) * 2 + 1;
    this.particleSystem.handleClick(normalizedX, normalizedY, this.camera);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    const delta = this.clock.getDelta();
    this.particleSystem.update(delta);

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
