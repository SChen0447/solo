import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { Crystal } from './Crystal';

const CRYSTAL_COUNT = 50;
const SOUND_WAVE_RADIUS = 3;
const SOUND_WAVE_DURATION = 1;
const PARTICLE_COUNT_SOUND = 100;
const PARTICLE_COUNT_COLLECT = 50;
const MAX_PARTICLES = 200;
const RESONANCE_DISTANCE = 2;
const RESONANCE_DURATION = 0.3;
const PORTAL_ACTIVATION_INTERVAL = 10;

interface SoundWave {
  center: THREE.Vector3;
  radius: number;
  life: number;
  mesh: THREE.Mesh;
}

interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  colorStart: THREE.Color;
  colorEnd: THREE.Color;
}

interface ResonanceBeam {
  from: THREE.Vector3;
  to: THREE.Vector3;
  life: number;
  line: THREE.Line;
}

interface Portal {
  mesh: THREE.Mesh;
  particles: THREE.Points;
  particleAngles: Float32Array;
  active: boolean;
}

export class GameWorld {
  public scene: THREE.Scene;
  public crystals: Crystal[] = [];
  public collectedCount: number = 0;
  public totalEnergy: number = 0;

  private soundWaves: SoundWave[] = [];
  private particles: ParticleData[] = [];
  private particleSystem!: THREE.Points;
  private particleGeometry!: THREE.BufferGeometry;
  private resonanceBeams: ResonanceBeam[] = [];
  private portals: Portal[] = [];
  private stars!: THREE.Points;
  private noise2D = createNoise2D();
  private time: number = 0;
  private lastResonanceCheck: number = 0;

  private particlePositions!: Float32Array;
  private particleColors!: Float32Array;
  private particleSizes!: Float32Array;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initStars();
    this.initParticleSystem();
    this.initCrystals();
  }

  private initStars(): void {
    const starCount = 500;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const r = 40 + Math.random() * 30;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      const brightness = 0.6 + Math.random() * 0.4;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;
      sizes[i] = 0.02 + Math.random() * 0.03;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  private initParticleSystem(): void {
    this.particlePositions = new Float32Array(MAX_PARTICLES * 3);
    this.particleColors = new Float32Array(MAX_PARTICLES * 3);
    this.particleSizes = new Float32Array(MAX_PARTICLES);

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    });

    this.particleSystem = new THREE.Points(this.particleGeometry, material);
    this.scene.add(this.particleSystem);
  }

  private initCrystals(): void {
    for (let i = 0; i < CRYSTAL_COUNT; i++) {
      const x = (Math.random() - 0.5) * 20;
      const y = (Math.random() - 0.5) * 12;
      const z = (Math.random() - 0.5) * 15 - 3;
      const position = new THREE.Vector3(x, y, z);
      const size = 0.3 + Math.random() * 0.3;
      const crystal = new Crystal(position, size);
      this.crystals.push(crystal);
      this.scene.add(crystal.mesh);
    }
  }

  public emitSoundWave(worldPosition: THREE.Vector3): void {
    const geometry = new THREE.SphereGeometry(0.1, 16, 16);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(worldPosition);
    this.scene.add(mesh);

    this.soundWaves.push({
      center: worldPosition.clone(),
      radius: 0.1,
      life: SOUND_WAVE_DURATION,
      mesh
    });

    this.spawnSoundParticles(worldPosition);
    this.affectCrystalsInRange(worldPosition);
    this.createRippleEffect(worldPosition);
  }

  private affectCrystalsInRange(center: THREE.Vector3): void {
    for (const crystal of this.crystals) {
      if (crystal.collected) continue;
      const distance = crystal.getPosition().distanceTo(center);
      if (distance <= SOUND_WAVE_RADIUS) {
        const intensity = 1 - distance / SOUND_WAVE_RADIUS;
        crystal.applySoundWave(intensity);
      }
    }
  }

  private spawnSoundParticles(origin: THREE.Vector3): void {
    const count = PARTICLE_COUNT_SOUND;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) {
        this.particles.shift();
      }
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.5 + Math.random() * 1.0;
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );
      this.particles.push({
        position: origin.clone(),
        velocity,
        life: 1.5,
        maxLife: 1.5,
        size: 0.04 + Math.random() * 0.04,
        colorStart: new THREE.Color('#ff00ff'),
        colorEnd: new THREE.Color('#ffffff')
      });
    }
  }

  private spawnCollectParticles(origin: THREE.Vector3): void {
    const count = PARTICLE_COUNT_COLLECT;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) {
        this.particles.shift();
      }
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const speed = 0.8 + Math.random() * 1.2;
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );
      this.particles.push({
        position: origin.clone(),
        velocity,
        life: 1.2,
        maxLife: 1.2,
        size: 0.05 + Math.random() * 0.05,
        colorStart: new THREE.Color('#ffd93d'),
        colorEnd: new THREE.Color('#ff6b6b')
      });
    }
  }

  private createRippleEffect(center: THREE.Vector3): void {
    const curve = new THREE.RingGeometry(0.1, 0.15, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ring = new THREE.Mesh(curve, material);
    ring.position.copy(center);
    ring.lookAt(new THREE.Vector3(0, 0, 0));
    this.scene.add(ring);

    const startTime = this.time;
    const animateRipple = () => {
      const elapsed = this.time - startTime;
      const progress = elapsed / 0.5;
      if (progress >= 1) {
        this.scene.remove(ring);
        curve.dispose();
        material.dispose();
        return;
      }
      const r = 0.1 + progress * 3;
      ring.scale.setScalar(r);
      material.opacity = 0.7 * (1 - progress);
      requestAnimationFrame(animateRipple);
    };
    animateRipple();
  }

  private checkResonance(): void {
    for (let i = 0; i < this.crystals.length; i++) {
      for (let j = i + 1; j < this.crystals.length; j++) {
        const a = this.crystals[i];
        const b = this.crystals[j];
        if (a.collected || b.collected) continue;
        const dist = a.getPosition().distanceTo(b.getPosition());
        if (dist <= RESONANCE_DISTANCE && Math.random() < 0.02) {
          this.spawnResonanceBeam(a, b);
        }
      }
    }
  }

  private spawnResonanceBeam(a: Crystal, b: Crystal): void {
    const points = [a.getPosition().clone(), b.getPosition().clone()];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const mixedColor = a.getColor().clone().lerp(b.getColor(), 0.5);
    const material = new THREE.LineBasicMaterial({
      color: mixedColor,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);

    this.resonanceBeams.push({
      from: a.getPosition().clone(),
      to: b.getPosition().clone(),
      life: RESONANCE_DURATION,
      line
    });
  }

  private activatePortal(): void {
    const angle = this.portals.length * (Math.PI * 2 / 5);
    const radius = 10;
    const position = new THREE.Vector3(
      Math.cos(angle) * radius,
      (Math.random() - 0.5) * 5,
      Math.sin(angle) * radius - 5
    );

    const torusGeo = new THREE.TorusGeometry(2.5, 0.2, 16, 64);
    const torusMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 0.8,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9
    });
    const mesh = new THREE.Mesh(torusGeo, torusMat);
    mesh.position.copy(position);
    mesh.lookAt(new THREE.Vector3(0, 0, 0));
    this.scene.add(mesh);

    const portalParticleCount = 80;
    const positions = new Float32Array(portalParticleCount * 3);
    const colors = new Float32Array(portalParticleCount * 3);
    const angles = new Float32Array(portalParticleCount);

    for (let i = 0; i < portalParticleCount; i++) {
      const a = Math.random() * Math.PI * 2;
      angles[i] = a;
      const r = 2.5;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = Math.sin(a) * r;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.3;

      const colorMix = Math.random();
      colors[i * 3] = 1;
      colors[i * 3 + 1] = colorMix;
      colors[i * 3 + 2] = 1 - colorMix * 0.5;
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const pMat = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const points = new THREE.Points(pGeo, pMat);
    points.position.copy(position);
    points.lookAt(new THREE.Vector3(0, 0, 0));
    this.scene.add(points);

    this.portals.push({
      mesh,
      particles: points,
      particleAngles: angles,
      active: true
    });
  }

  private updateParticleSystem(): void {
    const posAttr = this.particleGeometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.particleGeometry.getAttribute('color') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const colors = colAttr.array as Float32Array;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i];
        positions[i * 3] = p.position.x;
        positions[i * 3 + 1] = p.position.y;
        positions[i * 3 + 2] = p.position.z;

        const lifeRatio = p.life / p.maxLife;
        const color = p.colorStart.clone().lerp(p.colorEnd, 1 - lifeRatio);
        colors[i * 3] = color.r * lifeRatio;
        colors[i * 3 + 1] = color.g * lifeRatio;
        colors[i * 3 + 2] = color.b * lifeRatio;
      } else {
        positions[i * 3 + 1] = -9999;
        colors[i * 3] = 0;
        colors[i * 3 + 1] = 0;
        colors[i * 3 + 2] = 0;
      }
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    this.totalEnergy = 0;
    for (let i = this.crystals.length - 1; i >= 0; i--) {
      const crystal = this.crystals[i];
      const result = crystal.update(deltaTime);
      this.totalEnergy += result.currentEnergy;
      if (result.collected) {
        this.spawnCollectParticles(crystal.getPosition());
        this.collectedCount++;
        if (this.collectedCount % PORTAL_ACTIVATION_INTERVAL === 0) {
          this.activatePortal();
        }
      }
    }

    for (let i = this.soundWaves.length - 1; i >= 0; i--) {
      const sw = this.soundWaves[i];
      sw.life -= deltaTime;
      sw.radius = SOUND_WAVE_RADIUS * (1 - sw.life / SOUND_WAVE_DURATION);
      sw.mesh.scale.setScalar(sw.radius * 2);
      (sw.mesh.material as THREE.MeshBasicMaterial).opacity = 0.4 * (sw.life / SOUND_WAVE_DURATION);
      if (sw.life <= 0) {
        this.scene.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        (sw.mesh.material as THREE.Material).dispose();
        this.soundWaves.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.position.addScaledVector(p.velocity, deltaTime);
      p.velocity.multiplyScalar(0.98);
    }
    this.updateParticleSystem();

    if (this.time - this.lastResonanceCheck > 0.5) {
      this.lastResonanceCheck = this.time;
      this.checkResonance();
    }

    for (let i = this.resonanceBeams.length - 1; i >= 0; i--) {
      const beam = this.resonanceBeams[i];
      beam.life -= deltaTime;
      (beam.line.material as THREE.LineBasicMaterial).opacity = 0.8 * (beam.life / RESONANCE_DURATION);
      if (beam.life <= 0) {
        this.scene.remove(beam.line);
        beam.line.geometry.dispose();
        (beam.line.material as THREE.Material).dispose();
        this.resonanceBeams.splice(i, 1);
      }
    }

    for (const portal of this.portals) {
      portal.mesh.rotation.z += deltaTime * 0.5;
      portal.particles.rotation.z += deltaTime * 0.8;

      const posAttr = portal.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;
      for (let i = 0; i < portal.particleAngles.length; i++) {
        portal.particleAngles[i] += deltaTime * (0.5 + Math.random() * 0.5);
        const a = portal.particleAngles[i];
        const r = 2.5;
        positions[i * 3] = Math.cos(a) * r;
        positions[i * 3 + 1] = Math.sin(a) * r;
      }
      posAttr.needsUpdate = true;
    }

    this.stars.rotation.y += deltaTime * 0.01;
    const starColors = this.stars.geometry.getAttribute('color') as THREE.BufferAttribute;
    const cols = starColors.array as Float32Array;
    for (let i = 0; i < cols.length; i += 3) {
      const flicker = 0.6 + 0.4 * Math.sin(this.time * 2 + i * 0.1);
      cols[i] = flicker;
      cols[i + 1] = flicker;
      cols[i + 2] = flicker;
    }
    starColors.needsUpdate = true;
  }

  public dispose(): void {
    for (const crystal of this.crystals) crystal.dispose();
  }
}
