import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import { Heart } from './Heart';
import { GearSystem } from './GearSystem';
import { ParticleSystem } from './ParticleSystem';

class MechanicalHeartApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private clock: THREE.Clock;

  private heart!: Heart;
  private gearSystem!: GearSystem;
  private particleSystem!: ParticleSystem;

  private gearSpeedMultiplier: number = 2.0;
  private beatFrequency: number = 75;
  private volume: number = 0.5;
  private isPlaying: boolean = true;
  private time: number = 0;

  private audioCtx: AudioContext | null = null;
  private gearOscillator: OscillatorNode | null = null;
  private gearGain: GainNode | null = null;
  private lastBeatTime: number = 0;

  private fpsFrames: number = 0;
  private fpsLastTime: number = 0;
  private currentFps: number = 0;

  private defaultCameraPos = new THREE.Vector3(5, 3.5, 5);
  private defaultTarget = new THREE.Vector3(0, 0.3, 0);

  constructor() {
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();

    const container = document.getElementById('canvas-container')!;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    this.camera.position.copy(this.defaultCameraPos);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.copy(this.defaultTarget);
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 15;
    this.controls.maxPolarAngle = Math.PI * 0.75;
    this.controls.minPolarAngle = Math.PI * 0.1;

    this.setupLights();
    this.setupScene();
    this.setupUI();
    this.setupAudio();
    this.setupResize();

    this.updateInfo();

    this.animate = this.animate.bind(this);
    this.animate();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfff0d0, 0.9);
    dirLight.position.set(6, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    this.scene.add(dirLight);

    const point1 = new THREE.PointLight(0xffcc66, 0.7, 15);
    point1.position.set(-4, 3, -3);
    this.scene.add(point1);

    const point2 = new THREE.PointLight(0xff8844, 0.5, 12);
    point2.position.set(4, 2, 4);
    this.scene.add(point2);

    const rimLight = new THREE.DirectionalLight(0x664422, 0.3);
    rimLight.position.set(-5, 2, -5);
    this.scene.add(rimLight);
  }

  private setupScene(): void {
    this.heart = new Heart();
    this.heart.group.position.y = 0;
    this.scene.add(this.heart.group);

    this.gearSystem = new GearSystem();
    this.scene.add(this.gearSystem.group);

    this.particleSystem = new ParticleSystem();
    this.scene.add(this.particleSystem.group);

    this.addGroundDecor();
  }

  private addGroundDecor(): void {
    const baseGeom = new THREE.CylinderGeometry(4, 4.5, 0.2, 48);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x3a2a1a,
      metalness: 0.3,
      roughness: 0.9,
    });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.position.y = -2.3;
    base.receiveShadow = true;
    this.scene.add(base);

    const ringGeom = new THREE.TorusGeometry(4.1, 0.08, 12, 64);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xcfa144,
      metalness: 0.9,
      roughness: 0.25,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.y = -2.19;
    ring.rotation.x = Math.PI / 2;
    this.scene.add(ring);

    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const boltGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.1, 12);
      const bolt = new THREE.Mesh(boltGeom, ringMat);
      bolt.position.set(Math.cos(angle) * 4.1, -2.15, Math.sin(angle) * 4.1);
      this.scene.add(bolt);
    }
  }

  private setupUI(): void {
    const gearSpeedSlider = document.getElementById('gear-speed') as HTMLInputElement;
    const gearSpeedValue = document.getElementById('gear-speed-value')!;
    gearSpeedSlider.addEventListener('input', (e) => {
      this.gearSpeedMultiplier = parseFloat((e.target as HTMLInputElement).value);
      gearSpeedValue.textContent = this.gearSpeedMultiplier.toFixed(2);
      this.updateGearSound();
    });

    const beatFreqSlider = document.getElementById('beat-freq') as HTMLInputElement;
    const beatFreqValue = document.getElementById('beat-freq-value')!;
    beatFreqSlider.addEventListener('input', (e) => {
      this.beatFrequency = parseInt((e.target as HTMLInputElement).value);
      beatFreqValue.textContent = this.beatFrequency.toString();
    });

    const volumeSlider = document.getElementById('volume') as HTMLInputElement;
    const volumeValue = document.getElementById('volume-value')!;
    volumeSlider.addEventListener('input', (e) => {
      this.volume = parseInt((e.target as HTMLInputElement).value) / 100;
      volumeValue.textContent = `${Math.round(this.volume * 100)}%`;
      if (this.gearGain) {
        this.gearGain.gain.value = this.volume * 0.08;
      }
    });

    const playPauseBtn = document.getElementById('play-pause')!;
    playPauseBtn.addEventListener('click', () => {
      this.isPlaying = !this.isPlaying;
      playPauseBtn.textContent = this.isPlaying ? '⏸ 暂停' : '▶ 播放';
    });

    const resetBtn = document.getElementById('reset')!;
    resetBtn.addEventListener('click', () => {
      this.resetScene();
    });

    document.querySelectorAll('.btn-view').forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = (btn as HTMLElement).dataset.view!;
        this.switchView(view);
      });
    });
  }

  private switchView(view: string): void {
    let targetPos = this.defaultCameraPos.clone();
    let targetLook = this.defaultTarget.clone();

    switch (view) {
      case 'top':
        targetPos = new THREE.Vector3(0, 9, 0.01);
        targetLook = new THREE.Vector3(0, 0, 0);
        break;
      case 'side':
        targetPos = new THREE.Vector3(8, 1.5, 0);
        targetLook = new THREE.Vector3(0, 0.3, 0);
        break;
      case 'front':
        targetPos = new THREE.Vector3(0, 1.5, 8);
        targetLook = new THREE.Vector3(0, 0.3, 0);
        break;
      case 'default':
      default:
        targetPos = this.defaultCameraPos.clone();
        targetLook = this.defaultTarget.clone();
        break;
    }

    gsap.to(this.camera.position, {
      x: targetPos.x,
      y: targetPos.y,
      z: targetPos.z,
      duration: 0.3,
      ease: 'power2.inOut',
    });
    gsap.to(this.controls.target, {
      x: targetLook.x,
      y: targetLook.y,
      z: targetLook.z,
      duration: 0.3,
      ease: 'power2.inOut',
    });
  }

  private resetScene(): void {
    this.time = 0;
    this.particleSystem.reset();
    this.switchView('default');

    (document.getElementById('gear-speed') as HTMLInputElement).value = '2.0';
    this.gearSpeedMultiplier = 2.0;
    (document.getElementById('gear-speed-value')!).textContent = '2.00';

    (document.getElementById('beat-freq') as HTMLInputElement).value = '75';
    this.beatFrequency = 75;
    (document.getElementById('beat-freq-value')!).textContent = '75';

    this.isPlaying = true;
    (document.getElementById('play-pause')!).textContent = '⏸ 暂停';

    this.updateGearSound();
  }

  private setupAudio(): void {
    const initAudio = () => {
      if (this.audioCtx) return;
      try {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

        this.gearOscillator = this.audioCtx.createOscillator();
        this.gearGain = this.audioCtx.createGain();
        this.gearOscillator.type = 'sawtooth';
        this.gearOscillator.frequency.value = 80;
        this.gearGain.gain.value = this.volume * 0.08;

        const filter = this.audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 400;
        filter.Q.value = 1.5;

        this.gearOscillator.connect(filter);
        filter.connect(this.gearGain);
        this.gearGain.connect(this.audioCtx.destination);
        this.gearOscillator.start();
      } catch (e) {
        console.warn('Audio not supported', e);
      }
    };

    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('keydown', initAudio, { once: true });
  }

  private updateGearSound(): void {
    if (this.gearOscillator && this.audioCtx) {
      const freq = 60 + this.gearSpeedMultiplier * 40;
      gsap.to(this.gearOscillator.frequency, {
        value: freq,
        duration: 0.1,
      });
    }
  }

  private playBeatSound(): void {
    if (!this.audioCtx || this.volume <= 0.01) return;
    const now = this.audioCtx.currentTime;

    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
    gain.gain.setValueAtTime(this.volume * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.2);

    const noise = this.audioCtx.createBufferSource();
    const buf = this.audioCtx.createBuffer(1, this.audioCtx.sampleRate * 0.08, this.audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    noise.buffer = buf;
    const noiseGain = this.audioCtx.createGain();
    noiseGain.gain.setValueAtTime(this.volume * 0.1, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    const noiseFilter = this.audioCtx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 800;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.audioCtx.destination);
    noise.start(now);
  }

  private setupResize(): void {
    window.addEventListener('resize', () => {
      const container = document.getElementById('canvas-container')!;
      const width = container.clientWidth;
      const height = container.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    });
  }

  private updateInfo(): void {
    const gearCountEl = document.getElementById('gear-count');
    const particleCountEl = document.getElementById('particle-count');
    const fpsEl = document.getElementById('fps');

    if (gearCountEl) gearCountEl.textContent = this.gearSystem?.getGearCount().toString() || '0';
    if (particleCountEl) particleCountEl.textContent = this.particleSystem?.getActiveCount().toString() || '0';
    if (fpsEl) fpsEl.textContent = this.currentFps.toString();
  }

  private animate(): void {
    requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const clampedDelta = Math.min(delta, 0.05);

    if (this.isPlaying) {
      this.time += clampedDelta;

      const beatIntensity = this.heart.update(this.beatFrequency, this.time);

      this.gearSystem.update(this.gearSpeedMultiplier, clampedDelta);

      const contactPoints = this.gearSystem.getContactPoints();
      this.particleSystem.addSparksAtPositions(
        contactPoints,
        clampedDelta,
        0.5 + this.gearSpeedMultiplier * 0.3
      );
      this.particleSystem.update(clampedDelta);

      const distortionEl = document.getElementById('heart-distortion');
      if (distortionEl) {
        const blur = beatIntensity * 3;
        distortionEl.style.opacity = (beatIntensity * 0.5).toString();
        distortionEl.style.backdropFilter = `blur(${blur}px)`;
      }

      const beatInterval = 60 / this.beatFrequency;
      if (this.time - this.lastBeatTime >= beatInterval) {
        this.lastBeatTime = this.time;
        this.playBeatSound();
      }
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    this.fpsFrames++;
    if (this.time - this.fpsLastTime >= 0.5) {
      this.currentFps = Math.round(this.fpsFrames / (this.time - this.fpsLastTime));
      this.fpsFrames = 0;
      this.fpsLastTime = this.time;
      this.updateInfo();
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new MechanicalHeartApp();
});
