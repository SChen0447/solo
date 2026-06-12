import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AudioEngine, type AudioData } from './AudioEngine';
import { ParticleSystem } from './ParticleSystem';
import { UIController } from './UIController';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private audioEngine: AudioEngine;
  private particleSystem: ParticleSystem;
  private uiController: UIController;
  private container: HTMLElement;
  private clock: THREE.Clock;
  private animationId: number | null = null;
  private lastTime: number = 0;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 15);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x1a1a2e, 1);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 40;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 0.8;

    this.audioEngine = new AudioEngine(256);

    this.particleSystem = new ParticleSystem(this.scene, 300);

    this.uiController = new UIController({
      onRecordToggle: this.handleRecordToggle,
    });

    this.addSceneLights();
    this.bindEvents();
    this.start();
  }

  private addSceneLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x4ecdc4, 1, 50);
    pointLight1.position.set(10, 10, 10);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff6b6b, 0.8, 50);
    pointLight2.position.set(-10, -10, 10);
    this.scene.add(pointLight2);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onWindowResize);
  }

  private onWindowResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  };

  private handleRecordToggle = async (shouldRecord: boolean): Promise<boolean> => {
    if (shouldRecord) {
      const success = await this.audioEngine.start();
      return success;
    } else {
      this.audioEngine.stop();
      return true;
    }
  };

  private start(): void {
    this.lastTime = performance.now();
    this.animate();
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    const audioData: AudioData = this.audioEngine.getAudioData();

    if (this.audioEngine.getIsRecording()) {
      this.particleSystem.update(audioData, deltaTime);
      this.uiController.update(audioData);
    } else {
      this.uiController.drawIdleWaveform();
      this.updateIdleParticles(deltaTime);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private updateIdleParticles(deltaTime: number): void {
    const time = this.clock.getElapsedTime();
    const idleData: AudioData = {
      volume: Math.sin(time * 2) * 0.05 + 0.05,
      frequencyData: new Uint8Array(128),
      timeDomainData: new Uint8Array(128),
      dominantFrequency: 0,
      isHighFrequency: false,
    };

    for (let i = 0; i < 128; i++) {
      idleData.frequencyData[i] = Math.floor(Math.sin(time * 3 + i * 0.1) * 20 + 30);
    }

    this.particleSystem.update(idleData, deltaTime);
  }

  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }

    window.removeEventListener('resize', this.onWindowResize);

    this.audioEngine.stop();
    this.particleSystem.dispose();
    this.uiController.dispose();
    this.controls.dispose();
    this.renderer.dispose();

    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

let app: App | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose();
  }
});
