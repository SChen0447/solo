import * as THREE from 'three';

export class GoldParticles {
  public group: THREE.Group;
  private particles: THREE.Mesh[] = [];
  private startTime = 0;
  private duration = 4000;
  private active = false;
  private basePositions: { x: number; y: number; phase: number; speed: number; amplitude: number }[] = [];

  constructor(count: number = 10) {
    this.group = new THREE.Group();

    for (let i = 0; i < count; i++) {
      const size = 4 + Math.random() * 4;
      const geometry = new THREE.CircleGeometry(size, 16);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      });
      const particle = new THREE.Mesh(geometry, material);
      this.particles.push(particle);
      this.group.add(particle);

      this.basePositions.push({
        x: -200 + Math.random() * 400,
        y: -150 + Math.random() * 300,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1,
        amplitude: 20 + Math.random() * 30
      });
    }
  }

  public start(): void {
    this.active = true;
    this.startTime = performance.now();

    for (let i = 0; i < this.particles.length; i++) {
      const pos = this.basePositions[i];
      this.particles[i].position.set(pos.x, pos.y, 50);
      (this.particles[i].material as THREE.MeshBasicMaterial).opacity = 0;
    }
  }

  public update(): void {
    if (!this.active) return;

    const elapsed = performance.now() - this.startTime;
    const t = Math.min(elapsed / this.duration, 1);

    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      const base = this.basePositions[i];
      const localT = Math.min((elapsed - i * 100) / this.duration, 1);

      if (localT > 0) {
        const x = base.x + Math.sin(base.phase + localT * Math.PI * 2 * base.speed) * base.amplitude;
        const y = base.y + localT * 200;

        let opacity: number;
        if (localT < 0.2) {
          opacity = localT / 0.2 * 0.7;
        } else if (localT > 0.8) {
          opacity = (1 - localT) / 0.2 * 0.7;
        } else {
          opacity = 0.7;
        }

        particle.position.set(x, y, 50);
        (particle.material as THREE.MeshBasicMaterial).opacity = opacity;
      }
    }

    if (t >= 1) {
      this.active = false;
      for (const particle of this.particles) {
        (particle.material as THREE.MeshBasicMaterial).opacity = 0;
      }
    }
  }

  public isActive(): boolean {
    return this.active;
  }

  public dispose(): void {
    for (const particle of this.particles) {
      particle.geometry.dispose();
      (particle.material as THREE.Material).dispose();
    }
    this.particles = [];
  }
}

export class ShowcaseAnimation {
  private target: THREE.Group;
  private isRunning = false;
  private startTime = 0;
  private duration = 4000;
  private startRotation = 0;

  constructor(target: THREE.Group) {
    this.target = target;
  }

  public start(): void {
    this.isRunning = true;
    this.startTime = performance.now();
    this.startRotation = this.target.rotation.y;
  }

  public update(): void {
    if (!this.isRunning) return;

    const elapsed = performance.now() - this.startTime;
    const t = Math.min(elapsed / this.duration, 1);

    this.target.rotation.y = this.startRotation + t * Math.PI * 2;

    if (t >= 1) {
      this.isRunning = false;
    }
  }

  public active(): boolean {
    return this.isRunning;
  }
}

export class BackgroundTransition {
  private renderer: THREE.WebGLRenderer;
  private isTransitioning = false;
  private startTime = 0;
  private duration = 1500;
  private toShowcase = false;
  private startColor: THREE.Color;
  private showcaseColor1 = new THREE.Color(0x1a1a2e);
  private showcaseColor2 = new THREE.Color(0x16213e);
  private normalColor = new THREE.Color(0xf0f0f0);

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.startColor = new THREE.Color(0xf0f0f0);
  }

  public start(showcase: boolean): void {
    this.isTransitioning = true;
    this.startTime = performance.now();
    this.toShowcase = showcase;
    this.startColor = this.getCurrentColor();
  }

  private getCurrentColor(): THREE.Color {
    return this.toShowcase ? this.normalColor.clone() : this.showcaseColor1.clone();
  }

  public update(): void {
    if (!this.isTransitioning) return;

    const elapsed = performance.now() - this.startTime;
    let t = Math.min(elapsed / this.duration, 1);
    t = 1 - Math.pow(1 - t, 3);

    let color: THREE.Color;
    if (this.toShowcase) {
      const c1 = this.normalColor.clone().lerp(this.showcaseColor1, t);
      const c2 = this.normalColor.clone().lerp(this.showcaseColor2, t);
      color = c1.lerp(c2, 0.5);
    } else {
      color = this.showcaseColor1.clone().lerp(this.normalColor, t);
    }

    this.renderer.setClearColor(color);

    if (t >= 1) {
      this.isTransitioning = false;
    }
  }

  public active(): boolean {
    return this.isTransitioning;
  }
}

export class AudioManager {
  private audioContext: AudioContext | null = null;

  constructor() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  public playFoldSound(): void {
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / ctx.sampleRate;
      const envelope = Math.exp(-t * 15);
      data[i] = (Math.random() * 2 - 1) * envelope * 0.15;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 0.8;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start(now);
    source.stop(now + 0.15);
  }

  public resume(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}
