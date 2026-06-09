import * as THREE from 'three';

interface FloatingParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  baseY: number;
  size: number;
  phase: number;
  opacity: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private floatingPoints!: THREE.Points;
  private iceShards!: THREE.Points;
  private floatingParticles: FloatingParticle[] = [];
  private floatingCount = 300;
  private shardCount = 200;
  private temperature: number = -15;
  private currentColor: THREE.Color = new THREE.Color(0xb1d4e8);
  private targetColor: THREE.Color = new THREE.Color(0xb1d4e8);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public init(): void {
    this.createIceShards();
    this.createFloatingParticles();
  }

  private createIceShards(): void {
    const positions: number[] = [];

    for (let i = 0; i < this.shardCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * 14.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 0.01 + Math.random() * 0.02;
      positions.push(x, y, z);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.02,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.8
    });

    this.iceShards = new THREE.Points(geometry, material);
    this.scene.add(this.iceShards);
  }

  private createFloatingParticles(): void {
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];

    for (let i = 0; i < this.floatingCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + Math.random() * 8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 0.5 + Math.random() * 5;

      const size = 0.02 + Math.random() * 0.04;
      const opacity = 0.4 + Math.random() * 0.4;

      positions.push(x, y, z);
      colors.push(0xb1 / 255, 0xd4 / 255, 0xe8 / 255);
      sizes.push(size);

      this.floatingParticles.push({
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.003,
          (Math.random() - 0.5) * 0.002,
          (Math.random() - 0.5) * 0.003
        ),
        baseY: y,
        size,
        phase: Math.random() * Math.PI * 2,
        opacity
      });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.floatingPoints = new THREE.Points(geometry, material);
    this.scene.add(this.floatingPoints);
  }

  public setTemperature(temp: number): void {
    this.temperature = temp;
    this.targetColor = this.getColorForTemperature(temp);
  }

  private getColorForTemperature(temp: number): THREE.Color {
    const warmColor = new THREE.Color(0xc9b1d4);
    const midColor = new THREE.Color(0xb1d4e8);
    const coldColor = new THREE.Color(0x6b8bb5);

    if (temp >= -10) {
      const t = (temp - (-15)) / 10;
      return midColor.clone().lerp(warmColor, Math.min(1, Math.max(0, t)));
    } else if (temp <= -20) {
      const t = (temp - (-25)) / 5;
      return coldColor.clone().lerp(midColor, Math.min(1, Math.max(0, t)));
    } else {
      const t = (temp - (-20)) / 10;
      return coldColor.clone().lerp(warmColor, Math.min(1, Math.max(0, t)));
    }
  }

  public update(time: number): void {
    this.currentColor.lerp(this.targetColor, 0.02);

    const positions = this.floatingPoints.geometry.attributes.position.array as Float32Array;
    const colors = this.floatingPoints.geometry.attributes.color.array as Float32Array;

    for (let i = 0; i < this.floatingCount; i++) {
      const p = this.floatingParticles[i];

      p.phase += 0.01;

      const breathOffset = Math.sin(p.phase) * 0.008;
      const driftX = Math.sin(p.phase * 0.7 + i) * 0.003;
      const driftZ = Math.cos(p.phase * 0.5 + i * 0.3) * 0.003;

      p.position.x += p.velocity.x + driftX;
      p.position.z += p.velocity.z + driftZ;
      p.position.y = p.baseY + breathOffset + Math.sin(p.phase * 0.3) * 0.1;

      const dist = Math.sqrt(
        p.position.x * p.position.x + p.position.z * p.position.z
      );
      if (dist > 10) {
        const angle = Math.atan2(p.position.z, p.position.x) + Math.PI;
        p.position.x = Math.cos(angle) * 2;
        p.position.z = Math.sin(angle) * 2;
        p.baseY = 0.5 + Math.random() * 5;
      }

      const idx = i * 3;
      positions[idx] = p.position.x;
      positions[idx + 1] = p.position.y;
      positions[idx + 2] = p.position.z;

      const colorVariation = 0.9 + Math.sin(p.phase * 0.5) * 0.1;
      colors[idx] = this.currentColor.r * colorVariation;
      colors[idx + 1] = this.currentColor.g * colorVariation;
      colors[idx + 2] = this.currentColor.b * colorVariation;
    }

    this.floatingPoints.geometry.attributes.position.needsUpdate = true;
    this.floatingPoints.geometry.attributes.color.needsUpdate = true;
  }
}

export function createIceGround(scene: THREE.Scene): THREE.Mesh {
  const geometry = new THREE.CircleGeometry(15, 64);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xd6e8f0,
    transparent: true,
    opacity: 0.4,
    roughness: 0.2,
    metalness: 0.1,
    side: THREE.DoubleSide
  });

  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  scene.add(ground);

  return ground;
}
