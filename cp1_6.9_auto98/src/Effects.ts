import * as THREE from 'three';

interface ParticleData {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class EffectsManager {
  private scene: THREE.Scene;
  private audioContext: AudioContext | null = null;
  private particles: ParticleData[] = [];
  private goldRainParticles: ParticleData[] = [];

  constructor(scene: THREE.Scene, _camera: THREE.PerspectiveCamera) {
    this.scene = scene;
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return this.audioContext;
  }

  public emitParticles(position: THREE.Vector3, count: number, color: THREE.Color): void {
    const geometry = new THREE.SphereGeometry(0.05, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 1
    });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.position.copy(position);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 0.03 + Math.random() * 0.05;

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed * 0.5,
        Math.sin(phi) * Math.sin(theta) * speed
      );

      mesh.position.y += 0.02;

      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity,
        life: 0.5,
        maxLife: 0.5
      });
    }
  }

  public emitGoldRain(): void {
    const colors = [0xffd700, 0xffc107, 0xffeb3b, 0xffe082];

    for (let i = 0; i < 600; i++) {
      const size = 0.02 + Math.random() * 0.06;
      const geometry = new THREE.SphereGeometry(size, 6, 6);
      const material = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 0.9
      });

      const mesh = new THREE.Mesh(geometry, material);

      const rangeX = 25;
      const rangeZ = 25;
      mesh.position.set(
        (Math.random() - 0.5) * rangeX,
        15 + Math.random() * 10,
        (Math.random() - 0.5) * rangeZ
      );

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.01,
        -(0.04 + Math.random() * 0.08),
        (Math.random() - 0.5) * 0.01
      );

      this.scene.add(mesh);
      this.goldRainParticles.push({
        mesh,
        velocity,
        life: 3.0,
        maxLife: 3.0
      });
    }
  }

  public playSound(frequency: number, duration: number, type: OscillatorType = 'sine', fadeOut: boolean = true): void {
    try {
      const ctx = this.getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);

      if (fadeOut) {
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      }

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }

  public playSuccessSound(): void {
    this.playSound(440, 0.2, 'sine', true);
  }

  public playErrorSound(): void {
    this.playSound(200, 0.3, 'square', true);
  }

  public update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        p.mesh.geometry.dispose();
        this.particles.splice(i, 1);
      } else {
        p.mesh.position.add(p.velocity);
        p.velocity.y -= 0.001;
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.life / p.maxLife;
      }
    }

    for (let i = this.goldRainParticles.length - 1; i >= 0; i--) {
      const p = this.goldRainParticles[i];
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        (p.mesh.material as THREE.Material).dispose();
        p.mesh.geometry.dispose();
        this.goldRainParticles.splice(i, 1);
      } else {
        p.mesh.position.add(p.velocity);
        const opacityFactor = p.life / p.maxLife;
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(0.9, opacityFactor * 1.5);
      }
    }
  }

  public dispose(): void {
    [...this.particles, ...this.goldRainParticles].forEach(p => {
      this.scene.remove(p.mesh);
      (p.mesh.material as THREE.Material).dispose();
      p.mesh.geometry.dispose();
    });
    this.particles = [];
    this.goldRainParticles = [];
  }
}
