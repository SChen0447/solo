import * as THREE from 'three';
import SimplexNoise from 'simplex-noise';

const simplex = new SimplexNoise();
const noise3D = (x: number, y: number, z: number) => simplex.noise3D(x, y, z);

export interface WaveParticle {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  startRadius: number;
  endRadius: number;
  color: THREE.Color;
}

export class ParticleSystem {
  public group: THREE.Group;
  private planktonPoints: THREE.Points;
  private planktonCount: number;
  private planktonPositions: Float32Array;
  private planktonOriginalPositions: Float32Array;
  private waveParticles: WaveParticle[];
  private time: number;

  constructor(maxPlankton: number = 400) {
    this.group = new THREE.Group();
    this.planktonCount = Math.min(maxPlankton, 600);
    this.waveParticles = [];
    this.time = 0;

    this.planktonPositions = new Float32Array(this.planktonCount * 3);
    this.planktonOriginalPositions = new Float32Array(this.planktonCount * 3);

    for (let i = 0; i < this.planktonCount; i++) {
      const idx = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const radius = 3 + Math.random() * 10;
      const height = (Math.random() - 0.5) * 6;

      this.planktonOriginalPositions[idx] = Math.cos(angle) * radius;
      this.planktonOriginalPositions[idx + 1] = height;
      this.planktonOriginalPositions[idx + 2] = Math.sin(angle) * radius;

      this.planktonPositions[idx] = this.planktonOriginalPositions[idx];
      this.planktonPositions[idx + 1] = this.planktonOriginalPositions[idx + 1];
      this.planktonPositions[idx + 2] = this.planktonOriginalPositions[idx + 2];
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.planktonPositions, 3));

    const sizes = new Float32Array(this.planktonCount);
    for (let i = 0; i < this.planktonCount; i++) {
      sizes[i] = 0.5 + Math.random() * 1.5;
    }
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const colors = new Float32Array(this.planktonCount * 3);
    const opacities = new Float32Array(this.planktonCount);
    const color = new THREE.Color(0x44aaff);
    for (let i = 0; i < this.planktonCount; i++) {
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      opacities[i] = 0.1 + Math.random() * 0.2;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));

    const particleCanvas = document.createElement('canvas');
    particleCanvas.width = 64;
    particleCanvas.height = 64;
    const pctx = particleCanvas.getContext('2d')!;
    const gradient = pctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.7, 'rgba(255,255,255,0.2)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    pctx.fillStyle = gradient;
    pctx.fillRect(0, 0, 64, 64);
    const particleTexture = new THREE.CanvasTexture(particleCanvas);

    const material = new THREE.PointsMaterial({
      size: 0.12,
      map: particleTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      alphaTest: 0.01
    });

    this.planktonPoints = new THREE.Points(geometry, material);
    this.group.add(this.planktonPoints);
  }

  public spawnWave(origin: THREE.Vector3, color: THREE.Color, startRadius: number = 0.3, endRadius: number = 3, duration: number = 0.5): void {
    const geometry = new THREE.RingGeometry(0.01, 0.02, 48);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(origin);
    mesh.lookAt(origin.clone().add(new THREE.Vector3(0, 1, 0)));
    mesh.rotateX(Math.PI / 2);
    mesh.scale.setScalar(startRadius);

    this.group.add(mesh);

    this.waveParticles.push({
      mesh,
      life: duration,
      maxLife: duration,
      startRadius,
      endRadius,
      color: color.clone()
    });
  }

  public update(dt: number, cameraPosition?: THREE.Vector3): void {
    this.time += dt;

    const posAttr = this.planktonPoints.geometry.attributes.position as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;

    for (let i = 0; i < this.planktonCount; i++) {
      const idx = i * 3;
      const ox = this.planktonOriginalPositions[idx];
      const oy = this.planktonOriginalPositions[idx + 1];
      const oz = this.planktonOriginalPositions[idx + 2];

      const noiseScale = 0.15;
      const nx = noise3D(ox * noiseScale + this.time * 0.1, oy * noiseScale, oz * noiseScale);
      const ny = noise3D(ox * noiseScale, oy * noiseScale + this.time * 0.1, oz * noiseScale);
      const nz = noise3D(ox * noiseScale, oy * noiseScale, oz * noiseScale + this.time * 0.1);

      positions[idx] = ox + nx * 0.4;
      positions[idx + 1] = oy + ny * 0.4;
      positions[idx + 2] = oz + nz * 0.4;
    }
    posAttr.needsUpdate = true;

    for (let i = this.waveParticles.length - 1; i >= 0; i--) {
      const wp = this.waveParticles[i];
      wp.life -= dt;

      if (wp.life <= 0) {
        this.group.remove(wp.mesh);
        wp.mesh.geometry.dispose();
        (wp.mesh.material as THREE.Material).dispose();
        this.waveParticles.splice(i, 1);
        continue;
      }

      const t = 1 - wp.life / wp.maxLife;
      const radius = THREE.MathUtils.lerp(wp.startRadius, wp.endRadius, t);
      const opacity = 0.8 * Math.pow(1 - t, 2);

      wp.mesh.scale.setScalar(radius);
      const mat = wp.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = opacity;

      if (cameraPosition) {
        wp.mesh.lookAt(cameraPosition);
      }
    }
  }

  public dispose(): void {
    this.planktonPoints.geometry.dispose();
    (this.planktonPoints.material as THREE.Material).dispose();

    for (const wp of this.waveParticles) {
      wp.mesh.geometry.dispose();
      (wp.mesh.material as THREE.Material).dispose();
    }
    this.waveParticles.length = 0;
  }
}
