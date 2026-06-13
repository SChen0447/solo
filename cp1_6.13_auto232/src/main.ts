import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { URDFluid } from './fluid';
import { AudioAnalyzer, AudioData } from './audio';

class App {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private fluid: URDFluid;
  private audio: AudioAnalyzer;
  private clock: THREE.Clock;
  private audioData: AudioData = { amplitude: 0, frequency: 440 };

  constructor() {
    const container = document.getElementById('canvas-container')!;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'default',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 0, 7);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 15;
    this.controls.rotateSpeed = 0.1;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;

    this.fluid = new URDFluid();
    this.scene.add(this.fluid.group);

    this.audio = new AudioAnalyzer();
    this.audio.onAudio((data: AudioData) => {
      this.audioData = data;
    });

    this.clock = new THREE.Clock();

    this.setupUI();
    this.setupResize();
    this.animate();
  }

  private setupUI(): void {
    const overlay = document.getElementById('permission-overlay')!;
    const btn = document.getElementById('start-btn')!;

    btn.addEventListener('click', async () => {
      const success = await this.audio.start();
      if (success) {
        overlay.classList.add('hidden');
      } else {
        btn.textContent = '权限被拒绝，请刷新重试';
        btn.style.borderColor = 'rgba(255, 107, 107, 0.6)';
        btn.style.color = '#ff6b6b';
      }
    });
  }

  private setupResize(): void {
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.fluid.update(this.audioData.amplitude, this.audioData.frequency, delta);

    this.controls.rotateSpeed = this.fluid.getRotationSpeed();
    this.controls.autoRotateSpeed = 0.5 + this.audioData.amplitude * 2;
    this.controls.update();

    this.fluid.glowMesh.quaternion.copy(this.camera.quaternion);

    this.renderer.render(this.scene, this.camera);
  }
}

new App();
