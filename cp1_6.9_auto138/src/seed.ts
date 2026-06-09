import * as THREE from 'three';

export class Seed {
  public mesh: THREE.Mesh;
  public glowMesh: THREE.Mesh;
  public group: THREE.Group;
  public particles: THREE.Points;
  public position: THREE.Vector3;
  public color: THREE.Color;
  public isFullyGrown: boolean = false;
  public targetRadius: number = 0.6;
  public initialRadius: number = 0.3;
  public growDuration: number = 1.5;
  public growTime: number = 0;
  public particleOrbitRadius: number = 0.9;
  public particleCount: number = 30;
  public particleAngles: Float32Array;
  public particleSpeeds: Float32Array;
  public startTime: number;

  private startColor = new THREE.Color(0x88aaff);
  private endColor = new THREE.Color(0xff88aa);

  constructor(position: THREE.Vector3) {
    this.position = position.clone();
    this.color = this.startColor.clone();
    this.startTime = performance.now();
    this.group = new THREE.Group();

    const seedGeometry = new THREE.SphereGeometry(this.initialRadius, 32, 32);
    const seedMaterial = new THREE.MeshBasicMaterial({
      color: this.startColor,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    this.mesh = new THREE.Mesh(seedGeometry, seedMaterial);
    this.mesh.position.copy(position);
    this.group.add(this.mesh);

    const glowGeometry = new THREE.SphereGeometry(this.initialRadius * 1.8, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: this.startColor,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending
    });
    this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.glowMesh.position.copy(position);
    this.group.add(this.glowMesh);

    this.particleAngles = new Float32Array(this.particleCount);
    this.particleSpeeds = new Float32Array(this.particleCount);
    const particlePositions = new Float32Array(this.particleCount * 3);
    const particleColors = new Float32Array(this.particleCount * 3);
    const particleSizes = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      this.particleAngles[i] = (i / this.particleCount) * Math.PI * 2;
      this.particleSpeeds[i] = 0.5 + Math.random() * 0.5;
      particleSizes[i] = 1.0 + Math.random() * 1.0;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.particles = new THREE.Points(particleGeometry, particleMaterial);
    this.group.add(this.particles);

    this.updateParticlePositions();
  }

  public update(deltaTime: number): void {
    if (!this.isFullyGrown) {
      this.growTime += deltaTime;
      const t = Math.min(this.growTime / this.growDuration, 1);
      const easeT = 1 - Math.pow(1 - t, 3);
      const currentRadius = this.initialRadius + (this.targetRadius - this.initialRadius) * easeT;

      this.mesh.scale.setScalar(currentRadius / this.initialRadius);
      this.glowMesh.scale.setScalar(currentRadius / this.initialRadius);

      const colorMix = easeT;
      (this.mesh.material as THREE.MeshBasicMaterial).color.copy(this.startColor).lerp(this.endColor, colorMix);
      (this.glowMesh.material as THREE.MeshBasicMaterial).color.copy(this.startColor).lerp(this.endColor, colorMix);
      this.color.copy(this.startColor).lerp(this.endColor, colorMix);

      if (t >= 1) {
        this.isFullyGrown = true;
      }
    }

    for (let i = 0; i < this.particleCount; i++) {
      this.particleAngles[i] += this.particleSpeeds[i] * deltaTime * 0.8;
    }
    this.updateParticlePositions();

    const pulse = 0.9 + Math.sin(performance.now() * 0.002) * 0.1;
    this.glowMesh.scale.setScalar((this.glowMesh.scale.x) * pulse / (this.glowMesh.userData.lastPulse || 1));
    this.glowMesh.userData.lastPulse = pulse;
  }

  private updateParticlePositions(): void {
    const positions = this.particles.geometry.attributes.position.array as Float32Array;
    const colors = this.particles.geometry.attributes.color.array as Float32Array;
    const colorTmp = new THREE.Color();

    for (let i = 0; i < this.particleCount; i++) {
      const angle = this.particleAngles[i];
      const r = this.particleOrbitRadius * (0.8 + (i % 3) * 0.1);
      const offsetY = Math.sin(angle * 2) * 0.15;

      positions[i * 3] = this.position.x + Math.cos(angle) * r;
      positions[i * 3 + 1] = this.position.y + offsetY;
      positions[i * 3 + 2] = this.position.z + Math.sin(angle) * r;

      const t = (i / this.particleCount + this.particleAngles[i] / (Math.PI * 2)) % 1;
      colorTmp.copy(this.startColor).lerp(this.endColor, t);
      colors[i * 3] = colorTmp.r;
      colors[i * 3 + 1] = colorTmp.g;
      colors[i * 3 + 2] = colorTmp.b;
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.color.needsUpdate = true;
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.glowMesh.geometry.dispose();
    (this.glowMesh.material as THREE.Material).dispose();
    this.particles.geometry.dispose();
    (this.particles.material as THREE.Material).dispose();
  }
}
