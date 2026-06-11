import * as THREE from 'three';

const MAX_PLUCK_PARTICLES = 2000;
const MAX_RESONANCE_PARTICLES = 1000;
const NEBULA_PARTICLES = 800;

export interface ParticleDataForRecording {
  type: 'pluck' | 'resonance';
  x: number;
  y: number;
  z: number;
  r: number;
  g: number;
  b: number;
}

export class ParticleManager {
  public scene: THREE.Scene;

  private pluckPool: Array<{
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    baseColor: THREE.Color;
    life: number;
    maxLife: number;
    size: number;
    active: boolean;
    stringId: number;
    index: number;
  }> = [];

  private resonancePool: Array<{
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    baseColorA: THREE.Color;
    baseColorB: THREE.Color;
    life: number;
    maxLife: number;
    active: boolean;
    angle: number;
    angularSpeed: number;
    radius: number;
    center: THREE.Vector3;
    helixOffset: number;
    index: number;
  }> = [];

  private pluckPoints!: THREE.Points;
  private pluckGeometry!: THREE.BufferGeometry;
  private pluckMaterial!: THREE.PointsMaterial;
  private pluckPositions!: Float32Array;
  private pluckColors!: Float32Array;
  private pluckSizes!: Float32Array;

  private resonancePoints!: THREE.Points;
  private resonanceGeometry!: THREE.BufferGeometry;
  private resonanceMaterial!: THREE.PointsMaterial;
  private resonancePositions!: Float32Array;
  private resonanceColors!: Float32Array;
  private resonanceSizes!: Float32Array;

  private nebulaPoints!: THREE.Points;
  private nebulaPositions!: Float32Array;
  private nebulaColors!: Float32Array;
  private nebulaVelocities: Array<THREE.Vector3> = [];
  private nebulaPhases: number[] = [];

  private activePluckCount = 0;
  private activeResonanceCount = 0;

  private isMobile = window.innerWidth < 768;
  private particleMultiplier = this.isMobile ? 0.6 : 1.0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initPluckParticles();
    this.initResonanceParticles();
    this.initNebulaParticles();
  }

  private initPluckParticles(): void {
    const maxParticles = Math.floor(MAX_PLUCK_PARTICLES * this.particleMultiplier);

    this.pluckGeometry = new THREE.BufferGeometry();
    this.pluckPositions = new Float32Array(maxParticles * 3);
    this.pluckColors = new Float32Array(maxParticles * 3);
    this.pluckSizes = new Float32Array(maxParticles);

    for (let i = 0; i < maxParticles; i++) {
      this.pluckSizes[i] = 0;
      this.pluckPositions[i * 3 + 1] = -9999;
    }

    this.pluckGeometry.setAttribute('position', new THREE.BufferAttribute(this.pluckPositions, 3));
    this.pluckGeometry.setAttribute('color', new THREE.BufferAttribute(this.pluckColors, 3));

    this.pluckMaterial = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.pluckPoints = new THREE.Points(this.pluckGeometry, this.pluckMaterial);
    this.pluckPoints.frustumCulled = false;
    this.scene.add(this.pluckPoints);

    for (let i = 0; i < maxParticles; i++) {
      this.pluckPool.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        baseColor: new THREE.Color(),
        life: 0,
        maxLife: 3,
        size: 0.08,
        active: false,
        stringId: -1,
        index: i,
      });
    }
  }

  private initResonanceParticles(): void {
    const maxParticles = Math.floor(MAX_RESONANCE_PARTICLES * this.particleMultiplier);

    this.resonanceGeometry = new THREE.BufferGeometry();
    this.resonancePositions = new Float32Array(maxParticles * 3);
    this.resonanceColors = new Float32Array(maxParticles * 3);
    this.resonanceSizes = new Float32Array(maxParticles);

    for (let i = 0; i < maxParticles; i++) {
      this.resonanceSizes[i] = 0;
      this.resonancePositions[i * 3 + 1] = -9999;
    }

    this.resonanceGeometry.setAttribute('position', new THREE.BufferAttribute(this.resonancePositions, 3));
    this.resonanceGeometry.setAttribute('color', new THREE.BufferAttribute(this.resonanceColors, 3));

    this.resonanceMaterial = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.resonancePoints = new THREE.Points(this.resonanceGeometry, this.resonanceMaterial);
    this.resonancePoints.frustumCulled = false;
    this.scene.add(this.resonancePoints);

    for (let i = 0; i < maxParticles; i++) {
      this.resonancePool.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        baseColorA: new THREE.Color(),
        baseColorB: new THREE.Color(),
        life: 0,
        maxLife: 4,
        active: false,
        angle: 0,
        angularSpeed: 2,
        radius: 0.6,
        center: new THREE.Vector3(),
        helixOffset: 0,
        index: i,
      });
    }
  }

  private initNebulaParticles(): void {
    const count = Math.floor(NEBULA_PARTICLES * (this.isMobile ? 0.5 : 1.0));
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const colorA = new THREE.Color('#1a2a4a');
    const colorB = new THREE.Color('#4a6bff');
    const colorC = new THREE.Color('#ff6b9d');

    for (let i = 0; i < count; i++) {
      const radius = 15 + Math.random() * 35;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi) - 10;

      const mixFactor = Math.random();
      const tempColor = colorA.clone().lerp(colorB, mixFactor * 0.7);
      tempColor.lerp(colorC, Math.random() * 0.3);

      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;

      const v = new THREE.Vector3(
        (Math.random() - 0.5) * 0.002,
        (Math.random() - 0.5) * 0.002,
        (Math.random() - 0.5) * 0.002
      );
      this.nebulaVelocities.push(v);
      this.nebulaPhases.push(Math.random() * Math.PI * 2);
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.nebulaPoints = new THREE.Points(geo, mat);
    this.nebulaPositions = positions;
    this.nebulaColors = colors;
    this.scene.add(this.nebulaPoints);
  }

  public emitPluckParticles(
    origin: THREE.Vector3,
    normal: THREE.Vector3,
    color: THREE.Color,
    stringId: number,
    tension: number = 1.0
  ): void {
    const baseCount = Math.floor(80 * this.particleMultiplier);
    const speedMult = 0.8 + Math.sqrt(tension) * 0.6;
    const maxLife = 3;

    let emitted = 0;
    const poolSize = this.pluckPool.length;

    for (let pass = 0; pass < 2 && emitted < baseCount; pass++) {
      for (let i = 0; i < poolSize && emitted < baseCount; i++) {
        const p = this.pluckPool[i];
        if (p.active) continue;

        p.active = true;
        p.position.copy(origin);
        p.baseColor.copy(color);
        p.life = maxLife;
        p.maxLife = maxLife;
        p.stringId = stringId;

        const tangent = new THREE.Vector3(0, 1, 0).cross(normal).normalize();
        if (tangent.lengthSq() < 0.01) {
          tangent.set(1, 0, 0).cross(normal).normalize();
        }
        const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();

        const thetaAngle = (Math.random() - 0.5) * Math.PI / 6;
        const phiAngle = Math.random() * Math.PI * 2;

        const normalBase = normal.clone();
        const rotAxis = tangent.clone().applyAxisAngle(normalBase, phiAngle).normalize();

        const dir = normalBase.clone().applyAxisAngle(rotAxis, thetaAngle).normalize();

        const speed = (0.8 + Math.random() * 1.2) * speedMult;
        dir.multiplyScalar(speed);

        dir.y += (Math.random() - 0.5) * 1.2;

        p.velocity.copy(dir);

        const idx = p.index * 3;
        this.pluckPositions[idx] = p.position.x;
        this.pluckPositions[idx + 1] = p.position.y;
        this.pluckPositions[idx + 2] = p.position.z;
        this.pluckColors[idx] = color.r;
        this.pluckColors[idx + 1] = color.g;
        this.pluckColors[idx + 2] = color.b;

        emitted++;
        this.activePluckCount++;
      }
    }

    this.pluckGeometry.attributes.position.needsUpdate = true;
    this.pluckGeometry.attributes.color.needsUpdate = true;
  }

  public emitResonanceRing(
    center: THREE.Vector3,
    colorA: THREE.Color,
    colorB: THREE.Color,
    strength: number = 1.0
  ): void {
    const particleCount = Math.floor(120 * Math.min(1, strength) * this.particleMultiplier);
    const radius = 0.6 * (0.8 + strength * 0.4);
    const angularSpeed = 2 + Math.random() * 1;
    const maxLife = 4;

    let emitted = 0;
    const poolSize = this.resonancePool.length;

    for (let pass = 0; pass < 3 && emitted < particleCount; pass++) {
      for (let i = 0; i < poolSize && emitted < particleCount; i++) {
        const p = this.resonancePool[i];
        if (p.active) continue;

        p.active = true;
        p.center.copy(center);
        p.radius = radius * (0.7 + Math.random() * 0.6);
        p.angle = Math.random() * Math.PI * 2;
        p.angularSpeed = angularSpeed * (0.7 + Math.random() * 0.6) * (Math.random() > 0.5 ? 1 : -1);
        p.baseColorA.copy(colorA);
        p.baseColorB.copy(colorB);
        p.life = maxLife;
        p.maxLife = maxLife;
        p.helixOffset = (emitted / particleCount) * Math.PI * 4;

        const idx = p.index * 3;
        this.resonancePositions[idx] = center.x + p.radius;
        this.resonancePositions[idx + 1] = center.y;
        this.resonancePositions[idx + 2] = center.z;

        const mix = (emitted / particleCount + Math.random() * 0.1) % 1;
        const tempColor = colorA.clone().lerp(colorB, mix);
        this.resonanceColors[idx] = tempColor.r;
        this.resonanceColors[idx + 1] = tempColor.g;
        this.resonanceColors[idx + 2] = tempColor.b;

        emitted++;
        this.activeResonanceCount++;
      }
    }

    this.resonanceGeometry.attributes.position.needsUpdate = true;
    this.resonanceGeometry.attributes.color.needsUpdate = true;
  }

  public update(delta: number, time: number, sceneRotationBoost: number = 1.0): void {
    this.updatePluckParticles(delta);
    this.updateResonanceParticles(delta, time);
    this.updateNebulaParticles(delta, time, sceneRotationBoost);
  }

  private updatePluckParticles(delta: number): void {
    let changed = false;

    for (const p of this.pluckPool) {
      if (!p.active) continue;

      p.life -= delta;

      if (p.life <= 0) {
        p.active = false;
        this.activePluckCount--;
        const idx = p.index * 3;
        this.pluckPositions[idx + 1] = -9999;
        changed = true;
        continue;
      }

      p.velocity.y -= 0.15 * delta;

      const drag = Math.pow(0.98, delta * 60);
      p.velocity.multiplyScalar(drag);

      p.position.addScaledVector(p.velocity, delta);

      const lifeRatio = p.life / p.maxLife;
      const midRatio = lifeRatio * 2;
      const fadeIn = Math.min(1, midRatio);
      const fadeOut = Math.min(1, 2 - lifeRatio * 2);
      const overall = fadeIn * fadeOut;

      const whiteMix = Math.sin(lifeRatio * Math.PI * 0.8) * 0.6;
      const tempColor = p.baseColor.clone().lerp(new THREE.Color(0xffffff), whiteMix);
      tempColor.multiplyScalar(0.8 + overall * 0.8);

      const idx = p.index * 3;
      this.pluckPositions[idx] = p.position.x;
      this.pluckPositions[idx + 1] = p.position.y;
      this.pluckPositions[idx + 2] = p.position.z;
      this.pluckColors[idx] = tempColor.r;
      this.pluckColors[idx + 1] = tempColor.g;
      this.pluckColors[idx + 2] = tempColor.b;

      changed = true;
    }

    if (changed) {
      this.pluckGeometry.attributes.position.needsUpdate = true;
      this.pluckGeometry.attributes.color.needsUpdate = true;
    }
  }

  private updateResonanceParticles(delta: number, time: number): void {
    let changed = false;

    for (const p of this.resonancePool) {
      if (!p.active) continue;

      p.life -= delta;

      if (p.life <= 0) {
        p.active = false;
        this.activeResonanceCount--;
        const idx = p.index * 3;
        this.resonancePositions[idx + 1] = -9999;
        changed = true;
        continue;
      }

      p.angle += p.angularSpeed * delta;

      const lifeRatio = p.life / p.maxLife;
      const pulse = 1 + Math.sin(p.angle * 3 + time * 2) * 0.1;
      const radiusScale = Math.sin(lifeRatio * Math.PI) * pulse;
      const helixY = Math.sin(p.angle * 2 + p.helixOffset) * 0.4 * radiusScale;

      const x = p.center.x + Math.cos(p.angle) * p.radius * radiusScale;
      const z = p.center.z + Math.sin(p.angle) * p.radius * radiusScale;
      const y = p.center.y + helixY + Math.sin(p.angle + p.helixOffset) * 0.2;

      const mix = ((p.angle + p.helixOffset) % (Math.PI * 2)) / (Math.PI * 2);
      const mixPositive = mix < 0 ? mix + 1 : mix;
      const whiteMix = Math.sin(lifeRatio * Math.PI * 0.6) * 0.3;
      const tempColor = p.baseColorA.clone().lerp(p.baseColorB, mixPositive);
      tempColor.lerp(new THREE.Color(0xffffff), whiteMix);
      tempColor.multiplyScalar(0.9 + lifeRatio * 0.3);

      const idx = p.index * 3;
      this.resonancePositions[idx] = x;
      this.resonancePositions[idx + 1] = y;
      this.resonancePositions[idx + 2] = z;
      this.resonanceColors[idx] = tempColor.r;
      this.resonanceColors[idx + 1] = tempColor.g;
      this.resonanceColors[idx + 2] = tempColor.b;

      changed = true;
    }

    if (changed) {
      this.resonanceGeometry.attributes.position.needsUpdate = true;
      this.resonanceGeometry.attributes.color.needsUpdate = true;
    }
  }

  private updateNebulaParticles(delta: number, time: number, rotationBoost: number): void {
    const geo = this.nebulaPoints.geometry;
    const positions = geo.attributes.position.array as Float32Array;
    const colors = geo.attributes.color.array as Float32Array;

    for (let i = 0; i < this.nebulaVelocities.length; i++) {
      const idx = i * 3;

      const x = positions[idx];
      const y = positions[idx + 1];
      const z = positions[idx + 2];

      const rotSpeed = 0.05 * delta * rotationBoost;
      const cos = Math.cos(rotSpeed);
      const sin = Math.sin(rotSpeed);
      positions[idx] = x * cos - z * sin;
      positions[idx + 2] = x * sin + z * cos;

      const phase = this.nebulaPhases[i];
      const yOffset = Math.sin(time * 0.3 + phase) * 0.02;
      positions[idx + 1] += yOffset * delta * 60;

      const colorShift = Math.sin(time * 0.2 + phase * 2) * 0.05;
      colors[idx] = Math.min(1, colors[idx] + colorShift * 0.1);
      colors[idx + 2] = Math.min(1, colors[idx + 2] - colorShift * 0.1);
    }

    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  public shiftNebulaColors(targetColor: THREE.Color, amount: number): void {
    const colors = this.nebulaColors;
    const col = targetColor;

    for (let i = 0; i < this.nebulaVelocities.length; i++) {
      const idx = i * 3;
      colors[idx] = colors[idx] * (1 - amount) + col.r * amount;
      colors[idx + 1] = colors[idx + 1] * (1 - amount) + col.g * amount;
      colors[idx + 2] = colors[idx + 2] * (1 - amount) + col.b * amount;
    }

    this.nebulaPoints.geometry.attributes.color.needsUpdate = true;
  }

  public getActiveParticlesForRecording(): ParticleDataForRecording[] {
    const result: ParticleDataForRecording[] = [];

    for (const p of this.pluckPool) {
      if (!p.active) continue;
      const lifeRatio = p.life / p.maxLife;
      const whiteMix = Math.sin(lifeRatio * Math.PI * 0.8) * 0.6;
      const c = p.baseColor.clone().lerp(new THREE.Color(0xffffff), whiteMix);

      result.push({
        type: 'pluck',
        x: p.position.x,
        y: p.position.y,
        z: p.position.z,
        r: c.r,
        g: c.g,
        b: c.b,
      });
    }

    for (const p of this.resonancePool) {
      if (!p.active) continue;
      const mix = ((p.angle + p.helixOffset) % (Math.PI * 2)) / (Math.PI * 2);
      const mixPositive = mix < 0 ? mix + 1 : mix;
      const c = p.baseColorA.clone().lerp(p.baseColorB, mixPositive);

      result.push({
        type: 'resonance',
        x: p.position.x,
        y: p.position.y,
        z: p.position.z,
        r: c.r,
        g: c.g,
        b: c.b,
      });
    }

    return result;
  }

  public clearAll(): void {
    for (const p of this.pluckPool) {
      if (!p.active) continue;
      p.active = false;
      const idx = p.index * 3;
      this.pluckPositions[idx + 1] = -9999;
    }
    this.activePluckCount = 0;

    for (const p of this.resonancePool) {
      if (!p.active) continue;
      p.active = false;
      const idx = p.index * 3;
      this.resonancePositions[idx + 1] = -9999;
    }
    this.activeResonanceCount = 0;

    this.pluckGeometry.attributes.position.needsUpdate = true;
    this.resonanceGeometry.attributes.position.needsUpdate = true;
  }

  public getActiveCount(): { pluck: number; resonance: number } {
    return {
      pluck: this.activePluckCount,
      resonance: this.activeResonanceCount,
    };
  }
}
