import * as THREE from 'three';

interface ParticleData {
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class HydrothermalVent {
  public group: THREE.Group;
  private particles: THREE.Points;
  private particleData: ParticleData[];
  private lastEmitTime: number;
  private maxParticles: number;
  private particleGeometry: THREE.BufferGeometry;
  private particlePositions: Float32Array;
  private particleColors: Float32Array;
  private particleSizes: Float32Array;

  constructor() {
    this.group = new THREE.Group();
    this.maxParticles = 300;
    this.particleData = [];
    this.lastEmitTime = 0;

    this.createVentGeometry();
    this.createParticleSystem();
  }

  private createVentGeometry(): void {
    const chimneys: THREE.Mesh[] = [];
    const chimneyCount = 5 + Math.floor(Math.random() * 4);

    for (let i = 0; i < chimneyCount; i++) {
      const radius = 0.3 + Math.random() * 0.8;
      const height = 3 + Math.random() * 2;
      const geometry = new THREE.CylinderGeometry(radius * 0.7, radius, height, 16, 1, true);
      
      const material = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
      });

      const positions = geometry.attributes.position;
      const colors = new Float32Array(positions.count * 3);
      
      for (let j = 0; j < positions.count; j++) {
        const y = positions.getY(j);
        const t = (y + height / 2) / height;
        
        const bottomColor = new THREE.Color(0x2e2e2e);
        const topColor = new THREE.Color(0xff4500);
        const color = bottomColor.clone().lerp(topColor, t);
        
        colors[j * 3] = color.r;
        colors[j * 3 + 1] = color.g;
        colors[j * 3 + 2] = color.b;
      }
      
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      
      const chimney = new THREE.Mesh(geometry, material);
      
      const angle = (i / chimneyCount) * Math.PI * 2 + Math.random() * 0.5;
      const dist = Math.random() * 1.5;
      chimney.position.set(
        Math.cos(angle) * dist,
        height / 2 - 2,
        Math.sin(angle) * dist
      );
      chimney.rotation.x = (Math.random() - 0.5) * 0.2;
      chimney.rotation.z = (Math.random() - 0.5) * 0.2;
      
      chimneys.push(chimney);
      this.group.add(chimney);
    }

    const baseGeometry = new THREE.CylinderGeometry(3, 3.5, 1, 32);
    const baseMaterial = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -2.5;
    this.group.add(base);
  }

  private createParticleSystem(): void {
    this.particleGeometry = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(this.maxParticles * 3);
    this.particleColors = new Float32Array(this.maxParticles * 3);
    this.particleSizes = new Float32Array(this.maxParticles);

    for (let i = 0; i < this.maxParticles; i++) {
      this.particlePositions[i * 3] = 0;
      this.particlePositions[i * 3 + 1] = -100;
      this.particlePositions[i * 3 + 2] = 0;
      this.particleColors[i * 3] = 0;
      this.particleColors[i * 3 + 1] = 0;
      this.particleColors[i * 3 + 2] = 0;
      this.particleSizes[i] = 0;
      
      this.particleData.push({
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 0
      });
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(this.particleGeometry, particleMaterial);
    this.group.add(this.particles);
  }

  private findInactiveParticle(): number {
    for (let i = 0; i < this.maxParticles; i++) {
      if (this.particleData[i].life <= 0) {
        return i;
      }
    }
    return -1;
  }

  private emitParticles(count: number): void {
    for (let i = 0; i < count; i++) {
      const idx = this.findInactiveParticle();
      if (idx === -1) break;

      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 1.5;
      
      this.particlePositions[idx * 3] = Math.cos(angle) * radius;
      this.particlePositions[idx * 3 + 1] = 1.5 + Math.random() * 0.5;
      this.particlePositions[idx * 3 + 2] = Math.sin(angle) * radius;

      const t = Math.random();
      const startColor = new THREE.Color(0xffa500);
      const endColor = new THREE.Color(0xff6347);
      const color = startColor.clone().lerp(endColor, t);
      this.particleColors[idx * 3] = color.r;
      this.particleColors[idx * 3 + 1] = color.g;
      this.particleColors[idx * 3 + 2] = color.b;

      const size = 0.05 + Math.random() * 0.15;
      this.particleSizes[idx] = size;

      const speed = 0.2 + Math.random() * 0.4;
      this.particleData[idx].velocity.set(
        (Math.random() - 0.5) * 0.1,
        speed,
        (Math.random() - 0.5) * 0.1
      );
      this.particleData[idx].life = 3 + Math.random() * 2;
      this.particleData[idx].maxLife = this.particleData[idx].life;
    }
  }

  public update(delta: number, time: number): void {
    if (time - this.lastEmitTime >= 0.5) {
      this.emitParticles(20);
      this.lastEmitTime = time;
    }

    for (let i = 0; i < this.maxParticles; i++) {
      if (this.particleData[i].life > 0) {
        this.particleData[i].life -= delta;
        
        this.particlePositions[i * 3] += this.particleData[i].velocity.x * delta;
        this.particlePositions[i * 3 + 1] += this.particleData[i].velocity.y * delta;
        this.particlePositions[i * 3 + 2] += this.particleData[i].velocity.z * delta;

        this.particleData[i].velocity.x += (Math.random() - 0.5) * 0.02;
        this.particleData[i].velocity.z += (Math.random() - 0.5) * 0.02;

        const lifeRatio = this.particleData[i].life / this.particleData[i].maxLife;
        const alpha = Math.max(0, lifeRatio);
        this.particleColors[i * 3 + 0] *= 0.99 + alpha * 0.01;
        this.particleColors[i * 3 + 1] *= 0.99 + alpha * 0.01;
        this.particleColors[i * 3 + 2] *= 0.99 + alpha * 0.01;

        if (this.particleData[i].life <= 0) {
          this.particlePositions[i * 3 + 1] = -100;
        }
      }
    }

    this.particleGeometry.attributes.position.needsUpdate = true;
    this.particleGeometry.attributes.color.needsUpdate = true;
  }
}

export function createDebrisParticles(): THREE.Points {
  const count = 200;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const opacities: number[] = [];
  const offsets: number[] = [];

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
    
    colors[i * 3] = 1;
    colors[i * 3 + 1] = 1;
    colors[i * 3 + 2] = 1;
    
    opacities.push(0.1 + Math.random() * 0.2);
    offsets.push(Math.random() * Math.PI * 2);
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.01,
    vertexColors: true,
    transparent: true,
    opacity: 0.2,
    depthWrite: false
  });

  const points = new THREE.Points(geometry, material);
  (points as any).userData = { opacities, offsets, basePositions: positions.slice() };
  
  return points;
}

export function updateDebrisParticles(points: THREE.Points, time: number): void {
  const positions = points.geometry.attributes.position.array as Float32Array;
  const userData = (points as any).userData;
  const { offsets, basePositions } = userData;
  const count = offsets.length;

  for (let i = 0; i < count; i++) {
    const offset = offsets[i];
    positions[i * 3 + 1] = basePositions[i * 3 + 1] + Math.sin(time * 0.3 + offset) * 0.3;
  }

  points.geometry.attributes.position.needsUpdate = true;
}
