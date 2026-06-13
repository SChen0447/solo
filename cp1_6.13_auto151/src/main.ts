import * as THREE from 'three';
import { setupScene, POLE_COLORS } from './sceneSetup';
import { createPrayerFlags, PrayerFlagsSystem } from './prayerFlag';
import { createLightParticles, LightParticlesSystem } from './lightParticles';

class WindChimeAudio {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private lastPlayTime: number = 0;
  private minInterval: number = 0.3;

  private chimeFrequencies = [
    523.25, 587.33, 659.25, 698.46, 783.99,
    880.00, 987.77, 1046.50, 1174.66, 1318.51
  ];

  init() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.15;
      this.masterGain.connect(this.audioContext.destination);
    } catch (e) {
      console.warn('Web Audio not supported');
    }
  }

  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  playChime(strength: number = 1) {
    if (!this.audioContext || !this.masterGain) return;

    const now = performance.now();
    if (now - this.lastPlayTime < this.minInterval * 1000) return;
    this.lastPlayTime = now;

    const ctx = this.audioContext;
    const freq = this.chimeFrequencies[Math.floor(Math.random() * this.chimeFrequencies.length)];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.value = freq;

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = freq * 2.01;

    const gain2 = ctx.createGain();
    gain2.gain.value = 0.2;

    filter.type = 'lowpass';
    filter.frequency.value = 4000;
    filter.Q.value = 1;

    const duration = 1.5 + Math.random() * 1.5;
    const peakGain = 0.3 * strength;

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(peakGain, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    gain2.gain.setValueAtTime(0, ctx.currentTime);
    gain2.gain.linearRampToValueAtTime(peakGain * 0.2, ctx.currentTime + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration * 0.7);

    osc.connect(gain);
    osc2.connect(gain2);
    gain.connect(filter);
    gain2.connect(filter);
    filter.connect(this.masterGain);

    osc.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
    osc2.stop(ctx.currentTime + duration * 0.7);
  }

  playRandomChimes(windStrength: number) {
    const chance = Math.abs(windStrength) / 35;
    if (Math.random() < chance * 0.08) {
      this.playChime(0.5 + chance * 0.5);
    }
  }
}

class CameraController {
  camera: THREE.PerspectiveCamera;
  target: THREE.Vector3;
  targetAzimuth: number = 0;
  targetPolar: number = Math.PI / 3;
  currentAzimuth: number = 0;
  currentPolar: number = Math.PI / 3;
  distance: number = 30;
  damping: number = 0.8;
  isDragging: boolean = false;
  lastX: number = 0;
  lastY: number = 0;

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.target = new THREE.Vector3(0, 5, 0);
    this.updateCamera();
  }

  onPointerDown(x: number, y: number) {
    this.isDragging = true;
    this.lastX = x;
    this.lastY = y;
  }

  onPointerMove(x: number, y: number): number {
    let windDirection = 0;

    if (this.isDragging) {
      const dx = x - this.lastX;
      const dy = y - this.lastY;

      this.targetAzimuth -= dx * 0.005;
      this.targetPolar = Math.max(
        Math.PI / 6,
        Math.min(Math.PI / 2.2, this.targetPolar - dy * 0.005)
      );

      windDirection = dx * 0.3;

      this.lastX = x;
      this.lastY = y;
    }

    return windDirection;
  }

  onPointerUp() {
    this.isDragging = false;
  }

  update(delta: number) {
    const smoothFactor = 1 - this.damping;
    this.currentAzimuth += (this.targetAzimuth - this.currentAzimuth) * smoothFactor;
    this.currentPolar += (this.targetPolar - this.currentPolar) * smoothFactor;

    this.updateCamera();
  }

  private updateCamera() {
    const x = this.target.x + this.distance * Math.sin(this.currentPolar) * Math.sin(this.currentAzimuth);
    const y = this.target.y + this.distance * Math.cos(this.currentPolar);
    const z = this.target.z + this.distance * Math.sin(this.currentPolar) * Math.cos(this.currentAzimuth);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }
}

class App {
  renderer!: THREE.WebGLRenderer;
  camera!: THREE.PerspectiveCamera;
  scene!: THREE.Scene;
  cameraController!: CameraController;
  flagsSystem!: PrayerFlagsSystem;
  lightsSystem!: LightParticlesSystem;
  windChime!: WindChimeAudio;
  poleTopPositions!: THREE.Vector3[];

  currentWindDirection: number = 0;
  targetWindDirection: number = 0;
  mousePressed: boolean = false;

  frameCount: number = 0;
  lastFpsTime: number = 0;

  private container!: HTMLElement;
  private clock: THREE.Clock = new THREE.Clock();
  private animationId: number = 0;

  constructor() {
    this.init();
  }

  init() {
    this.container = document.getElementById('app')!;

    const { scene, poleTopPositions } = setupScene();
    this.scene = scene;
    this.poleTopPositions = poleTopPositions;

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      500
    );

    this.cameraController = new CameraController(this.camera);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    this.flagsSystem = createPrayerFlags(this.poleTopPositions);
    this.scene.add(this.flagsSystem.flagsGroup);

    this.lightsSystem = createLightParticles(this.poleTopPositions);
    this.scene.add(this.lightsSystem.lightsGroup);

    this.windChime = new WindChimeAudio();

    this.setupEventListeners();

    this.animate();
  }

  setupEventListeners() {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('pointerdown', (e) => {
      this.mousePressed = true;
      this.cameraController.onPointerDown(e.clientX, e.clientY);
      this.windChime.resume();
      this.windChime.playChime(0.8);
    });

    canvas.addEventListener('pointermove', (e) => {
      const wind = this.cameraController.onPointerMove(e.clientX, e.clientY);
      if (Math.abs(wind) > 0.1) {
        this.targetWindDirection += wind;
        this.targetWindDirection = Math.max(-35, Math.min(35, this.targetWindDirection));
      }
    });

    canvas.addEventListener('pointerup', () => {
      this.mousePressed = false;
      this.cameraController.onPointerUp();
    });

    canvas.addEventListener('pointerleave', () => {
      this.mousePressed = false;
      this.cameraController.onPointerUp();
    });

    window.addEventListener('resize', () => {
      this.onResize();
    });

    document.addEventListener('click', () => {
      this.windChime.resume();
    }, { once: false });
  }

  onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.05);

    const windDecay = 0.95;
    this.targetWindDirection *= windDecay;
    this.currentWindDirection += (this.targetWindDirection - this.currentWindDirection) * 0.1;

    if (Math.abs(this.currentWindDirection) < 0.5) {
      const ambientWind = Math.sin(performance.now() * 0.001) * 3 + Math.sin(performance.now() * 0.0023) * 2;
      this.currentWindDirection = ambientWind;
    }

    this.cameraController.update(delta);

    this.flagsSystem.update(delta, this.currentWindDirection, this.mousePressed);

    this.lightsSystem.update(delta);

    this.windChime.playRandomChimes(this.currentWindDirection);

    this.renderer.render(this.scene, this.camera);

    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 1000) {
      this.lastFpsTime = now;
      this.frameCount = 0;
    }
  }

  dispose() {
    cancelAnimationFrame(this.animationId);
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
