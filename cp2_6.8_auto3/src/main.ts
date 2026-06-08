import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParticleSystem, ParticleMode } from './particleSystem';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private particleSystem: ParticleSystem;
  private container: HTMLElement;
  
  private audioValue: number = 0;
  private audioTarget: number = 0;
  private lastAudioUpdate: number = 0;
  private audioPhase: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a12);
    this.scene.fog = new THREE.FogExp2(0x0a0a12, 0.02);
    
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 18);
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x0a0a12, 1);
    this.container.appendChild(this.renderer.domElement);
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = false;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 40;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.3;
    
    this.particleSystem = new ParticleSystem({
      particleCount: 6000,
      text: 'FLOW',
      mode: 'vortex',
      speed: 1,
      intensity: 1,
      particleSize: 1
    });
    this.scene.add(this.particleSystem.getMesh());
    
    this.setupEventListeners();
    this.setupUI();
    this.animate();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());
  }

  private setupUI(): void {
    const textInput = document.getElementById('text-input') as HTMLInputElement;
    textInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const text = target.value.toUpperCase();
      if (text) {
        this.particleSystem.setText(text);
      }
    });
    
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const mode = target.dataset.mode as ParticleMode;
        
        modeButtons.forEach((b) => b.classList.remove('active'));
        target.classList.add('active');
        
        this.particleSystem.setMode(mode);
      });
    });
    
    const sizeSlider = document.getElementById('size-slider') as HTMLInputElement;
    const sizeValue = document.getElementById('size-value')!;
    sizeSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.particleSystem.setParticleSize(value);
      sizeValue.textContent = value.toFixed(1);
    });
    
    const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    const speedValue = document.getElementById('speed-value')!;
    speedSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.particleSystem.setSpeed(value);
      speedValue.textContent = value.toFixed(1) + 'x';
    });
    
    const intensitySlider = document.getElementById('intensity-slider') as HTMLInputElement;
    const intensityValue = document.getElementById('intensity-value')!;
    intensitySlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.particleSystem.setIntensity(value);
      intensityValue.textContent = value.toFixed(1);
    });
  }

  private simulateAudio(time: number): void {
    if (time - this.lastAudioUpdate > 100) {
      this.audioPhase += 0.1 + Math.random() * 0.2;
      const baseValue = 0.3 + Math.sin(this.audioPhase * 1.5) * 0.2;
      const noise = Math.random() * 0.3;
      this.audioTarget = Math.min(1, Math.max(0, baseValue + noise));
      this.lastAudioUpdate = time;
    }
    
    this.audioValue += (this.audioTarget - this.audioValue) * 0.1;
    this.particleSystem.setAudioValue(this.audioValue);
    
    const audioFill = document.getElementById('audio-fill') as HTMLElement;
    if (audioFill) {
      audioFill.style.width = (this.audioValue * 100) + '%';
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    
    const time = performance.now();
    
    this.simulateAudio(time);
    
    this.particleSystem.update(time);
    
    this.controls.update();
    
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.particleSystem.dispose();
    this.renderer.dispose();
    this.controls.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});

export { App };
