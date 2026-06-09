import * as THREE from 'three';

const ORGANISM_RADIUS = 1.5;
const HALO_PARTICLE_COUNT = 200;
const FLASH_DURATION = 500;
const SCALE_DURATION = 500;

export class Organism {
  public group: THREE.Group;
  public mesh: THREE.Mesh;
  public outlineMesh: THREE.Mesh;
  public halo: THREE.Points;

  private geometry: THREE.IcosahedronGeometry;
  private material: THREE.MeshPhongMaterial;
  private outlineMaterial: THREE.MeshBasicMaterial;
  private haloGeometry: THREE.BufferGeometry;
  private haloMaterial: THREE.PointsMaterial;

  private baseVertices: Float32Array;
  private originalPositions: Float32Array;
  private haloBasePositions: Float32Array;

  private pulseIntensity: number = 1;
  private flashActive: boolean = false;
  private flashProgress: number = 0;
  private scaleTarget: number = 1;
  private scaleCurrent: number = 1;
  private scaleFrom: number = 1;
  private scaleProgress: number = 1;
  private originalColor: THREE.Color = new THREE.Color(0x00ff88);

  private perm: number[];

  constructor() {
    this.group = new THREE.Group();
    this.perm = this.generatePermutation();

    this.geometry = new THREE.IcosahedronGeometry(ORGANISM_RADIUS, 2);
    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    this.originalPositions = new Float32Array(posAttr.array as Float32Array);
    this.baseVertices = new Float32Array(this.originalPositions);

    this.material = new THREE.MeshPhongMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.6,
      shininess: 100,
      emissive: 0x00ff88,
      emissiveIntensity: 0.3,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.userData.isOrganism = true;

    this.outlineMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.4,
      side: THREE.BackSide,
    });

    this.outlineMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(ORGANISM_RADIUS * 1.08, 2),
      this.outlineMaterial
    );

    this.haloGeometry = new THREE.BufferGeometry();
    this.haloBasePositions = new Float32Array(HALO_PARTICLE_COUNT * 3);
    this.initializeHalo();

    this.haloMaterial = new THREE.PointsMaterial({
      color: 0x00ff88,
      size: 0.08,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.halo = new THREE.Points(this.haloGeometry, this.haloMaterial);

    this.group.add(this.outlineMesh);
    this.group.add(this.mesh);
    this.group.add(this.halo);
  }

  private generatePermutation(): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    const perm: number[] = new Array(512);
    for (let i = 0; i < 512; i++) {
      perm[i] = p[i & 255];
    }
    return perm;
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  private perlinNoise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);
    const A = this.perm[X] + Y;
    const AA = this.perm[A] + Z;
    const AB = this.perm[A + 1] + Z;
    const B = this.perm[X + 1] + Y;
    const BA = this.perm[B] + Z;
    const BB = this.perm[B + 1] + Z;
    return this.lerp(
      this.lerp(
        this.lerp(this.grad(this.perm[AA], x, y, z), this.grad(this.perm[BA], x - 1, y, z), u),
        this.lerp(this.grad(this.perm[AB], x, y - 1, z), this.grad(this.perm[BB], x - 1, y - 1, z), u),
        v
      ),
      this.lerp(
        this.lerp(this.grad(this.perm[AA + 1], x, y, z - 1), this.grad(this.perm[BA + 1], x - 1, y, z - 1), u),
        this.lerp(this.grad(this.perm[AB + 1], x, y - 1, z - 1), this.grad(this.perm[BB + 1], x - 1, y - 1, z - 1), u),
        v
      ),
      w
    );
  }

  private initializeHalo(): void {
    const positions = new Float32Array(HALO_PARTICLE_COUNT * 3);
    for (let i = 0; i < HALO_PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 2 + (Math.random() - 0.5) * 0.3;
      const idx = i * 3;
      positions[idx] = r * Math.sin(phi) * Math.cos(theta);
      positions[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[idx + 2] = r * Math.cos(phi);
      this.haloBasePositions[idx] = positions[idx];
      this.haloBasePositions[idx + 1] = positions[idx + 1];
      this.haloBasePositions[idx + 2] = positions[idx + 2];
    }
    this.haloGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  }

  public setPulseIntensity(intensity: number): void {
    this.pulseIntensity = Math.max(0.5, Math.min(2, intensity));
  }

  public triggerReaction(): void {
    this.flashActive = true;
    this.flashProgress = 0;
    this.scaleFrom = this.scaleCurrent;
    this.scaleTarget = 1.2;
    this.scaleProgress = 0;
  }

  public update(time: number, deltaTime: number): void {
    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const vertexCount = positions.length / 3;

    const pulsePhase = time * 0.002;
    const noiseScale = 0.35;
    const timeScale = time * 0.0008;

    const maxVertices = Math.min(vertexCount, 500);

    for (let i = 0; i < maxVertices; i++) {
      const idx = i * 3;
      const ox = this.originalPositions[idx];
      const oy = this.originalPositions[idx + 1];
      const oz = this.originalPositions[idx + 2];

      const noiseVal = this.perlinNoise(
        ox * noiseScale + timeScale,
        oy * noiseScale + timeScale * 1.3,
        oz * noiseScale + timeScale * 0.7
      );

      const sinusoidVal = Math.sin(ox * 1.5 + pulsePhase) * 0.5 +
                          Math.cos(oy * 1.2 + pulsePhase * 0.7) * 0.3 +
                          Math.sin(oz * 1.8 + pulsePhase * 1.1) * 0.2;

      const combinedDisplacement = (noiseVal * 0.6 + sinusoidVal * 0.4) * this.pulseIntensity;
      const displacementAmount = 0.05 + Math.abs(combinedDisplacement) * 0.15;

      const length = Math.sqrt(ox * ox + oy * oy + oz * oz) || 1;
      const nx = ox / length;
      const ny = oy / length;
      const nz = oz / length;

      positions[idx] = ox + nx * displacementAmount;
      positions[idx + 1] = oy + ny * displacementAmount;
      positions[idx + 2] = oz + nz * displacementAmount;
    }

    for (let i = maxVertices; i < vertexCount; i++) {
      const idx = i * 3;
      positions[idx] = this.originalPositions[idx];
      positions[idx + 1] = this.originalPositions[idx + 1];
      positions[idx + 2] = this.originalPositions[idx + 2];
    }

    this.geometry.computeVertexNormals();
    posAttr.needsUpdate = true;

    if (this.flashActive) {
      this.flashProgress = Math.min(1, this.flashProgress + deltaTime / FLASH_DURATION);
      const t = this.easeInOut(this.flashProgress);
      const flashColor = new THREE.Color().lerpColors(
        new THREE.Color(0xffffff),
        this.originalColor,
        t
      );
      this.material.color.copy(flashColor);
      this.material.emissive.copy(flashColor);
      this.material.emissiveIntensity = 0.3 + (1 - t) * 0.7;
      this.outlineMaterial.color.copy(flashColor);
      this.outlineMaterial.opacity = 0.4 + (1 - t) * 0.3;

      if (this.flashProgress >= 1) {
        this.flashActive = false;
      }
    }

    if (this.scaleProgress < 1) {
      this.scaleProgress = Math.min(1, this.scaleProgress + deltaTime / SCALE_DURATION);
      const t = this.easeInOut(this.scaleProgress);
      if (this.scaleTarget > this.scaleFrom && t > 0.5) {
        const reboundT = (t - 0.5) * 2;
        this.scaleCurrent = this.lerp(this.scaleTarget, 1, this.easeInOut(reboundT));
      } else {
        this.scaleCurrent = this.lerp(this.scaleFrom, this.scaleTarget, this.easeInOut(t));
      }
      this.mesh.scale.setScalar(this.scaleCurrent);
      this.outlineMesh.scale.setScalar(this.scaleCurrent * 1.08);
    }

    this.halo.rotation.y += deltaTime * 0.0003;
    this.halo.rotation.x += deltaTime * 0.0001;

    const haloPosAttr = this.haloGeometry.getAttribute('position') as THREE.BufferAttribute;
    const haloPositions = haloPosAttr.array as Float32Array;
    for (let i = 0; i < HALO_PARTICLE_COUNT; i++) {
      const idx = i * 3;
      const bx = this.haloBasePositions[idx];
      const by = this.haloBasePositions[idx + 1];
      const bz = this.haloBasePositions[idx + 2];
      const len = Math.sqrt(bx * bx + by * by + bz * bz) || 1;
      const wobble = Math.sin(time * 0.002 + i * 0.1) * 0.05;
      haloPositions[idx] = bx + (bx / len) * wobble;
      haloPositions[idx + 1] = by + (by / len) * wobble;
      haloPositions[idx + 2] = bz + (bz / len) * wobble;
    }
    haloPosAttr.needsUpdate = true;
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.outlineMaterial.dispose();
    (this.outlineMesh.geometry as THREE.BufferGeometry).dispose();
    this.haloGeometry.dispose();
    this.haloMaterial.dispose();
  }
}
