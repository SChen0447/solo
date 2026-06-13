import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

interface PulseWave {
  position: THREE.Vector3;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
  streamIndex: number;
  streamAngle: number;
  speed: number;
}

export class EffectsManager {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private particleMesh!: THREE.Points;
  private particleGeometry!: THREE.BufferGeometry;
  private particleMaterial!: THREE.PointsMaterial;
  private maxParticles: number = 500;
  
  private pulseWaves: PulseWave[] = [];
  private pulseMeshes: THREE.Mesh[] = [];
  private maxPulses: number = 20;
  
  private particleEmitRate: number = 80;
  private particleEmitAccum: number = 0;
  private windOffset: number = 0;
  private fountainHeight: number = 2;

  private streamAngles: number[] = [];
  private streamCount: number = 6;

  private splashTimer: number = 0;
  private splashInterval: number = 0.8;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initParticles();
    this.initPulses();
    
    for (let i = 0; i < this.streamCount; i++) {
      this.streamAngles.push((i / this.streamCount) * Math.PI * 2);
    }
  }

  private initParticles(): void {
    this.particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);
    const sizes = new Float32Array(this.maxParticles);
    const alphas = new Float32Array(this.maxParticles);

    for (let i = 0; i < this.maxParticles; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;
      sizes[i] = 0;
      alphas[i] = 0;
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.particleMaterial = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.particleMesh = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particleMesh);
  }

  private initPulses(): void {
    for (let i = 0; i < this.maxPulses; i++) {
      const group = new THREE.Group();
      
      const innerGeo = new THREE.RingGeometry(0.9, 1, 64);
      const innerMat = new THREE.MeshBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const innerRing = new THREE.Mesh(innerGeo, innerMat);
      group.add(innerRing);

      const outerGeo = new THREE.RingGeometry(0.7, 1.1, 64);
      const outerMat = new THREE.MeshBasicMaterial({
        color: 0xc084fc,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const outerRing = new THREE.Mesh(outerGeo, outerMat);
      group.add(outerRing);

      const glowGeo = new THREE.CircleGeometry(1, 64);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      group.add(glow);

      group.rotation.x = -Math.PI / 2;
      group.visible = false;
      group.userData = { innerRing, outerRing, glow };
      this.pulseMeshes.push(group as unknown as THREE.Mesh);
      this.scene.add(group);
    }
  }

  setFountainHeight(height: number): void {
    this.fountainHeight = height;
  }

  setWindOffset(offset: number): void {
    this.windOffset = offset;
  }

  update(deltaTime: number, time: number): void {
    this.updateParticles(deltaTime, time);
    this.updatePulses(deltaTime);
    this.checkSplashes(deltaTime, time);
  }

  private updateParticles(deltaTime: number, time: number): void {
    this.particleEmitAccum += deltaTime;
    const emitInterval = 1 / this.particleEmitRate;
    
    while (this.particleEmitAccum >= emitInterval && this.particles.length < this.maxParticles) {
      this.emitParticle(time);
      this.particleEmitAccum -= emitInterval;
    }

    const positions = this.particleGeometry.attributes.position.array as Float32Array;
    const colors = this.particleGeometry.attributes.color.array as Float32Array;
    const sizes = this.particleGeometry.attributes.size.array as Float32Array;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      p.velocity.y -= 2.5 * deltaTime;
      p.position.add(p.velocity.clone().multiplyScalar(deltaTime));
      p.life -= deltaTime;

      if (p.life <= 0 || p.position.y <= 0.1) {
        this.particles.splice(i, 1);
        continue;
      }

      const lifeRatio = p.life / p.maxLife;
      const alpha = Math.min(1, lifeRatio * 2) * (p.color instanceof THREE.Color ? 1 : 0.5);

      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;

      colors[i * 3] = p.color.r;
      colors[i * 3 + 1] = p.color.g;
      colors[i * 3 + 2] = p.color.b;

      sizes[i] = p.size * (0.5 + lifeRatio * 0.5);
    }

    for (let i = this.particles.length; i < this.maxParticles; i++) {
      positions[i * 3 + 1] = -100;
      sizes[i] = 0;
    }

    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
    this.particleGeometry.attributes.size.needsUpdate = true;
  }

  private emitParticle(time: number): void {
    const meridianAngle = Math.random() * Math.PI * 2;
    const latitudeAngle = Math.random() * (Math.PI / 3);
    
    const startRadius = 0.8 + Math.random() * 0.2;
    const startY = 0.2 + Math.sin(latitudeAngle) * startRadius;
    
    const baseSpeed = 2.5 + Math.random() * 1.5;
    const windAngle = this.windOffset;
    const windStrength = Math.abs(this.windOffset) * 0.3;

    const vx = Math.cos(meridianAngle) * baseSpeed * 0.3 + Math.cos(windAngle) * windStrength * 2;
    const vy = baseSpeed * (0.8 + Math.random() * 0.4) * (0.5 + this.fountainHeight / 4);
    const vz = Math.sin(meridianAngle) * baseSpeed * 0.3 + Math.sin(windAngle) * windStrength * 2;

    const colorStages = [
      new THREE.Color(0x7dd3fc),
      new THREE.Color(0xc084fc),
      new THREE.Color(0xf472b6)
    ];
    const t = Math.random();
    let color: THREE.Color;
    if (t < 0.5) {
      color = colorStages[0].clone().lerp(colorStages[1], t * 2);
    } else {
      color = colorStages[1].clone().lerp(colorStages[2], (t - 0.5) * 2);
    }

    const particle: Particle = {
      position: new THREE.Vector3(
        Math.cos(meridianAngle) * Math.cos(latitudeAngle) * 0.5,
        startY,
        Math.sin(meridianAngle) * Math.cos(latitudeAngle) * 0.5
      ),
      velocity: new THREE.Vector3(vx, vy, vz),
      life: 1.2 + Math.random() * 0.8,
      maxLife: 2,
      size: 0.04 + Math.random() * 0.04,
      color: color
    };

    this.particles.push(particle);
  }

  private updatePulses(deltaTime: number): void {
    for (let i = this.pulseWaves.length - 1; i >= 0; i--) {
      const pulse = this.pulseWaves[i];
      pulse.radius += pulse.speed * deltaTime;
      pulse.life -= deltaTime;

      if (pulse.life <= 0 || pulse.radius >= pulse.maxRadius) {
        this.pulseWaves.splice(i, 1);
        (this.pulseMeshes[i + this.pulseWaves.length] as unknown as THREE.Group).visible = false;
        continue;
      }

      const group = this.pulseMeshes[i] as unknown as THREE.Group;
      const { innerRing, outerRing, glow } = group.userData;
      
      group.position.copy(pulse.position);
      group.position.y = 0.12;

      const lifeRatio = pulse.life / pulse.maxLife;
      const scale = pulse.radius;
      group.scale.setScalar(scale);

      const innerOpacity = lifeRatio * 0.8;
      const outerOpacity = lifeRatio * 0.4;
      const glowOpacity = lifeRatio * 0.15;

      (innerRing.material as THREE.MeshBasicMaterial).opacity = innerOpacity;
      (outerRing.material as THREE.MeshBasicMaterial).opacity = outerOpacity;
      (glow.material as THREE.MeshBasicMaterial).opacity = glowOpacity;

      (innerRing.material as THREE.MeshBasicMaterial).color.copy(pulse.color);
      const outerColor = pulse.color.clone().lerp(new THREE.Color(0xc084fc), 0.5);
      (outerRing.material as THREE.MeshBasicMaterial).color.copy(outerColor);
      (glow.material as THREE.MeshBasicMaterial).color.copy(pulse.color);

      group.visible = true;
    }
  }

  private checkSplashes(deltaTime: number, time: number): void {
    this.splashTimer -= deltaTime;
    
    if (this.splashTimer <= 0 && this.pulseWaves.length < this.maxPulses) {
      this.createSplash(time);
      this.splashTimer = this.splashInterval * (0.5 + Math.random());
    }
  }

  private createSplash(time: number): void {
    const streamIndex = Math.floor(Math.random() * this.streamCount);
    const streamAngle = this.streamAngles[streamIndex];
    const dist = 1.5 + Math.random() * 2;

    const x = Math.cos(streamAngle) * dist;
    const z = Math.sin(streamAngle) * dist;

    const color = new THREE.Color(0x7dd3fc);
    color.lerp(new THREE.Color(0xc084fc), Math.random() * 0.5);

    const pulse: PulseWave = {
      position: new THREE.Vector3(x, 0.12, z),
      radius: 0.2,
      maxRadius: 1.5,
      life: 1.2,
      maxLife: 1.2,
      color: color,
      streamIndex,
      streamAngle,
      speed: 1.5
    };

    this.pulseWaves.push(pulse);
  }

  addPulseAt(x: number, z: number): void {
    if (this.pulseWaves.length >= this.maxPulses) return;

    const pulse: PulseWave = {
      position: new THREE.Vector3(x, 0.12, z),
      radius: 0.2,
      maxRadius: 1.5,
      life: 1.2,
      maxLife: 1.2,
      color: new THREE.Color(0x7dd3fc),
      streamIndex: 0,
      streamAngle: 0,
      speed: 1.5
    };

    this.pulseWaves.push(pulse);
  }

  setParticleRate(rate: number): void {
    this.particleEmitRate = rate;
  }

  dispose(): void {
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    this.pulseMeshes.forEach((mesh) => {
      const group = mesh as unknown as THREE.Group;
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          (obj.material as THREE.Material).dispose();
        }
      });
    });
  }
}
