import * as THREE from 'three';

interface WindParticle {
  mesh: THREE.Mesh;
  curve: THREE.CubicBezierCurve3;
  progress: number;
  speed: number;
  lifetime: number;
  age: number;
  direction: THREE.Vector2;
  strength: number;
}

export class WindManager {
  public group: THREE.Group;
  public particles: WindParticle[] = [];
  public maxParticles: number = 50;
  private particleGeo: THREE.SphereGeometry;
  private audioContext: AudioContext | null = null;

  constructor() {
    this.group = new THREE.Group();
    this.particleGeo = new THREE.SphereGeometry(0.05, 4, 4);
  }

  public initAudio(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private playWindSound(duration: number = 0.8, strength: number = 1): void {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 500;
    filter.Q.value = 0.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05 * strength, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(ctx.currentTime);
  }

  public createWindStream(
    startWorld: THREE.Vector3,
    endWorld: THREE.Vector3,
    strength: number = 1
  ): THREE.Vector2 {
    if (this.particles.length >= this.maxParticles) {
      const old = this.particles.shift();
      if (old) this.group.remove(old.mesh);
    }

    const count = 10 + Math.floor(Math.random() * 6);
    const dir = new THREE.Vector2(
      endWorld.x - startWorld.x,
      endWorld.z - startWorld.z
    ).normalize();

    for (let i = 0; i < count; i++) {
      const offsetStart = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 1,
        (Math.random() - 0.5) * 2
      );
      const offsetEnd = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 3
      );

      const p0 = startWorld.clone().add(offsetStart);
      const p3 = endWorld.clone().add(offsetEnd);
      const mid = new THREE.Vector3().addVectors(p0, p3).multiplyScalar(0.5);
      mid.y += 1 + Math.random() * 2;
      const p1 = new THREE.Vector3().addVectors(p0, mid).multiplyScalar(0.5);
      p1.x += (Math.random() - 0.5) * 2;
      p1.z += (Math.random() - 0.5) * 2;
      const p2 = new THREE.Vector3().addVectors(p3, mid).multiplyScalar(0.5);
      p2.x += (Math.random() - 0.5) * 2;
      p2.z += (Math.random() - 0.5) * 2;

      const curve = new THREE.CubicBezierCurve3(p0, p1, p2, p3);

      const mat = new THREE.MeshBasicMaterial({
        color: 0xb3e0ff,
        transparent: true,
        opacity: 0.7
      });
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      mesh.position.copy(p0);
      this.group.add(mesh);

      this.particles.push({
        mesh,
        curve,
        progress: 0,
        speed: 0.8 + Math.random() * 0.4,
        lifetime: 0.8,
        age: 0,
        direction: dir.clone(),
        strength
      });
    }

    this.playWindSound(0.8, strength);

    return dir.clone().multiplyScalar(strength);
  }

  public getWindForce(position: THREE.Vector3): THREE.Vector2 {
    let totalForce = new THREE.Vector2(0, 0);
    for (const p of this.particles) {
      const particlePos = p.mesh.position;
      const dist = Math.sqrt(
        Math.pow(position.x - particlePos.x, 2) +
        Math.pow(position.z - particlePos.z, 2)
      );
      if (dist < 3) {
        const influence = (1 - dist / 3) * p.strength;
        totalForce.x += p.direction.x * influence;
        totalForce.y += p.direction.y * influence;
      }
    }
    return totalForce;
  }

  public update(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += delta;
      p.progress += (delta / p.lifetime) * p.speed;

      if (p.progress >= 1 || p.age >= p.lifetime) {
        this.group.remove(p.mesh);
        (p.mesh.material as THREE.MeshBasicMaterial).dispose();
        this.particles.splice(i, 1);
        continue;
      }

      const pos = p.curve.getPoint(p.progress);
      p.mesh.position.copy(pos);

      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      const fadeIn = Math.min(1, p.progress * 5);
      const fadeOut = 1 - Math.pow(p.progress, 3);
      mat.opacity = 0.7 * fadeIn * fadeOut;

      const scale = 0.5 + p.progress * 1.5;
      p.mesh.scale.setScalar(scale);
    }
  }
}
