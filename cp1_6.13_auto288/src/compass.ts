import * as THREE from 'three';

const RING_COLORS = [
  0xff6b6b,
  0xff9ff3,
  0xfeca57,
  0x48dbfb,
  0xa29bfe,
  0xff9ff3,
  0xa29bfe
];

const RING_ROTATION_SPEEDS = [5, 7, 9, 11, 13, 16, 20];

export interface RingData {
  mesh: THREE.Mesh;
  particles: THREE.Points;
  radius: number;
  rotationSpeed: number;
  color: number;
  particleCount: number;
  particleBasePositions: Float32Array;
  particleOffsets: number[];
  particleFrequencies: number[];
  pulseProgress: number;
  pulseActive: boolean;
  hovered: boolean;
}

export class Compass {
  private scene: THREE.Scene;
  private rings: RingData[] = [];
  private coreSphere: THREE.Mesh | null = null;
  private coreLight: THREE.PointLight | null = null;
  private waveMesh: THREE.Mesh | null = null;
  private waveActive: boolean = false;
  private waveProgress: number = 0;
  private rotationDamping: number = 0.95;
  private rotationVelocityX: number = 0;
  private rotationVelocityY: number = 0;
  private isInteracting: boolean = false;
  private compassGroup: THREE.Group;
  private time: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.compassGroup = new THREE.Group();
    this.compassGroup.name = 'compass';
    this.scene.add(this.compassGroup);
    this.createCompass();
  }

  private createCompass(): void {
    const baseRadius = 50;
    const radiusStep = 50;
    const baseParticles = 40;

    for (let i = 0; i < 7; i++) {
      const radius = baseRadius + i * radiusStep;
      const particleCount = Math.floor(baseParticles + i * 15);
      const color = RING_COLORS[i];
      const rotationSpeed = (2 * Math.PI) / RING_ROTATION_SPEEDS[i];

      const ring = this.createRing(radius, color, i);
      const particles = this.createParticles(radius, color, particleCount, i);

      this.compassGroup.add(ring.mesh);
      this.compassGroup.add(particles.particles);

      this.rings.push({
        mesh: ring.mesh,
        particles: particles.particles,
        radius,
        rotationSpeed,
        color,
        particleCount,
        particleBasePositions: particles.basePositions,
        particleOffsets: particles.offsets,
        particleFrequencies: particles.frequencies,
        pulseProgress: 0,
        pulseActive: false,
        hovered: false
      });
    }

    this.createCore();
    this.createWave();
  }

  private createRing(radius: number, color: number, index: number): { mesh: THREE.Mesh } {
    const geometry = new THREE.TorusGeometry(radius, 0.5, 8, 128);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2;
    mesh.userData.ringIndex = index;
    mesh.userData.type = 'ring';

    return { mesh };
  }

  private createParticles(
    radius: number,
    color: number,
    count: number,
    ringIndex: number
  ): {
    particles: THREE.Points;
    basePositions: Float32Array;
    offsets: number[];
    frequencies: number[];
  } {
    const positions = new Float32Array(count * 3);
    const basePositions = new Float32Array(count * 3);
    const offsets: number[] = [];
    const frequencies: number[] = [];
    const colors = new Float32Array(count * 3);

    const colorObj = new THREE.Color(color);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 0;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      basePositions[i * 3] = x;
      basePositions[i * 3 + 1] = y;
      basePositions[i * 3 + 2] = z;

      offsets.push(Math.random() * Math.PI * 2);
      frequencies.push(0.8 + Math.random() * 1.2);

      colors[i * 3] = colorObj.r;
      colors[i * 3 + 1] = colorObj.g;
      colors[i * 3 + 2] = colorObj.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 2.5 + ringIndex * 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particles = new THREE.Points(geometry, material);
    particles.userData.ringIndex = ringIndex;
    particles.userData.type = 'particles';

    return { particles, basePositions, offsets, frequencies };
  }

  private createCore(): void {
    const geometry = new THREE.SphereGeometry(20, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    });

    this.coreSphere = new THREE.Mesh(geometry, material);
    this.coreSphere.userData.type = 'core';
    this.compassGroup.add(this.coreSphere);

    this.coreLight = new THREE.PointLight(0xffeb3b, 1.5, 200);
    this.coreLight.position.set(0, 0, 0);
    this.compassGroup.add(this.coreLight);

    const glowGeometry = new THREE.SphereGeometry(28, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffeb3b,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
    this.compassGroup.add(glowSphere);
  }

  private createWave(): void {
    const geometry = new THREE.RingGeometry(0, 2, 64);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    this.waveMesh = new THREE.Mesh(geometry, material);
    this.waveMesh.rotation.x = Math.PI / 2;
    this.waveMesh.visible = false;
    this.compassGroup.add(this.waveMesh);
  }

  public triggerWave(): void {
    if (!this.waveMesh) return;
    this.waveActive = true;
    this.waveProgress = 0;
    this.waveMesh.visible = true;
  }

  public triggerRingPulse(ringIndex: number): void {
    if (ringIndex >= 0 && ringIndex < this.rings.length) {
      this.rings[ringIndex].pulseActive = true;
      this.rings[ringIndex].pulseProgress = 0;
    }
  }

  public setHoveredRing(ringIndex: number | null): void {
    this.rings.forEach((ring, i) => {
      ring.hovered = i === ringIndex;
      const material = ring.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = ring.hovered ? 1.0 : 0.5;
    });
  }

  public setInteracting(interacting: boolean): void {
    this.isInteracting = interacting;
  }

  public setRotationVelocity(vx: number, vy: number): void {
    this.rotationVelocityX = vx;
    this.rotationVelocityY = vy;
  }

  public getRingMeshes(): THREE.Mesh[] {
    return this.rings.map((r) => r.mesh);
  }

  public getCompassGroup(): THREE.Group {
    return this.compassGroup;
  }

  public getRingCount(): number {
    return this.rings.length;
  }

  public getRingRadius(index: number): number {
    return this.rings[index]?.radius || 0;
  }

  public getRingColor(index: number): number {
    return this.rings[index]?.color || 0xffffff;
  }

  public update(delta: number): void {
    this.time += delta;

    this.updateCore(delta);
    this.updateRings(delta);
    this.updateParticles(delta);
    this.updateWave(delta);
    this.updateRotationInertia(delta);
  }

  private updateCore(delta: number): void {
    if (!this.coreSphere || !this.coreLight) return;

    const pulsePhase = (this.time / 2) * Math.PI * 2;
    const pulseScale = 1 + Math.sin(pulsePhase) * 0.15;
    this.coreSphere.scale.setScalar(pulseScale);

    const coreMaterial = this.coreSphere.material as THREE.MeshBasicMaterial;
    const colorT = (Math.sin(pulsePhase) + 1) / 2;
    coreMaterial.color.setHex(
      colorT > 0.5 ? 0xffffff : 0xffeb3b
    );
    coreMaterial.color.lerpColors(
      new THREE.Color(0xffffff),
      new THREE.Color(0xffeb3b),
      colorT
    );

    this.coreLight.intensity = 1 + Math.sin(pulsePhase) * 0.5;
  }

  private updateRings(delta: number): void {
    this.rings.forEach((ring, index) => {
      ring.mesh.rotation.z += ring.rotationSpeed * delta;

      if (ring.pulseActive) {
        ring.pulseProgress += delta / 0.8;
        if (ring.pulseProgress >= 1) {
          ring.pulseActive = false;
          ring.pulseProgress = 0;
        }

        const t = ring.pulseProgress;
        const pulseT = t < 0.5 ? t * 2 : 2 - t * 2;
        const ringMaterial = ring.mesh.material as THREE.MeshBasicMaterial;
        const baseColor = new THREE.Color(ring.color);
        const whiteColor = new THREE.Color(0xffffff);
        ringMaterial.color.copy(baseColor).lerp(whiteColor, pulseT);
      }
    });
  }

  private updateParticles(delta: number): void {
    this.rings.forEach((ring, ringIndex) => {
      const positions = ring.particles.geometry.attributes.position.array as Float32Array;
      const colors = ring.particles.geometry.attributes.color.array as Float32Array;
      const basePositions = ring.particleBasePositions;
      const offsets = ring.particleOffsets;
      const frequencies = ring.particleFrequencies;

      const floatAmplitude = 3 + ringIndex * 0.8;
      const rotationZ = ring.mesh.rotation.z;

      for (let i = 0; i < ring.particleCount; i++) {
        const angle = (i / ring.particleCount) * Math.PI * 2 + rotationZ;
        const floatY = Math.sin(this.time * frequencies[i] + offsets[i]) * floatAmplitude;

        const x = Math.cos(angle) * ring.radius;
        const z = Math.sin(angle) * ring.radius;
        const y = floatY;

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        if (ring.pulseActive) {
          const t = ring.pulseProgress;
          const pulseT = t < 0.5 ? t * 2 : 2 - t * 2;
          const baseColor = new THREE.Color(ring.color);
          const whiteColor = new THREE.Color(0xffffff);
          const lerpedColor = baseColor.clone().lerp(whiteColor, pulseT);
          colors[i * 3] = lerpedColor.r;
          colors[i * 3 + 1] = lerpedColor.g;
          colors[i * 3 + 2] = lerpedColor.b;
        } else {
          const baseColor = new THREE.Color(ring.color);
          colors[i * 3] = baseColor.r;
          colors[i * 3 + 1] = baseColor.g;
          colors[i * 3 + 2] = baseColor.b;
        }
      }

      ring.particles.geometry.attributes.position.needsUpdate = true;
      ring.particles.geometry.attributes.color.needsUpdate = true;
    });
  }

  private updateWave(delta: number): void {
    if (!this.waveActive || !this.waveMesh) return;

    this.waveProgress += delta / 1.5;
    if (this.waveProgress >= 1) {
      this.waveActive = false;
      this.waveMesh.visible = false;
      return;
    }

    const t = this.waveProgress;
    const radius = 50 + t * 250;
    const opacity = 0.8 * (1 - t);

    const waveGeometry = new THREE.RingGeometry(radius - 3, radius + 3, 64);
    this.waveMesh.geometry.dispose();
    this.waveMesh.geometry = waveGeometry;

    const material = this.waveMesh.material as THREE.MeshBasicMaterial;
    material.opacity = opacity;

    const hue = 0.15 + t * 0.6;
    material.color.setHSL(hue, 1, 0.6);
  }

  private updateRotationInertia(delta: number): void {
    if (this.isInteracting) return;

    if (Math.abs(this.rotationVelocityX) > 0.0001 || Math.abs(this.rotationVelocityY) > 0.0001) {
      this.compassGroup.rotation.x += this.rotationVelocityY * delta * 60;
      this.compassGroup.rotation.y += this.rotationVelocityX * delta * 60;

      this.rotationVelocityX *= this.rotationDamping;
      this.rotationVelocityY *= this.rotationDamping;
    }

    this.compassGroup.rotation.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.compassGroup.rotation.x));
  }

  public getRotationEuler(): { x: number; y: number } {
    return {
      x: (this.compassGroup.rotation.x * 180) / Math.PI,
      y: (this.compassGroup.rotation.y * 180) / Math.PI
    };
  }

  public resize(scale: number): void {
    this.compassGroup.scale.setScalar(scale);
  }
}
