import * as THREE from 'three';
import { MaterialType, MATERIAL_CONFIGS } from './audio';

interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
  type: 'wave' | 'spark' | 'trail';
  initialSize: number;
  phase: number;
  radiusDir?: THREE.Vector3;
  baseAngle?: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: ParticleData[] = [];
  private mesh: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private maxParticles: number = 2000;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private alphas: Float32Array;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geometry = new THREE.BufferGeometry();
    
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);
    this.alphas = new Float32Array(this.maxParticles);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1));

    this.geometry.setDrawRange(0, 0);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute float alpha;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = color;
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          glow = pow(glow, 1.5);
          vec3 finalColor = vColor * (0.6 + glow * 1.4);
          gl_FragColor = vec4(finalColor, glow * vAlpha);
        }
      `,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.mesh = new THREE.Points(this.geometry, material);
    this.mesh.renderOrder = 100;
    this.scene.add(this.mesh);
  }

  emitWaveParticles(
    origin: THREE.Vector3,
    material: MaterialType,
    count: number
  ): void {
    const config = MATERIAL_CONFIGS[material];
    const baseColor = new THREE.Color(config.color);
    const glowColor = new THREE.Color(config.glowColor);
    
    const actualCount = Math.min(count, 200);

    for (let i = 0; i < actualCount; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      
      const dir = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi)
      );

      const speed = 0.8 + Math.random() * 1.2;
      const life = 1.5;
      const size = 0.1 + Math.random() * 0.2;
      const mixRatio = Math.random();
      const color = baseColor.clone().lerp(glowColor, mixRatio);

      this.particles.push({
        position: origin.clone().add(dir.clone().multiplyScalar(0.1)),
        velocity: dir.multiplyScalar(speed),
        life: life,
        maxLife: life,
        size: size,
        initialSize: size,
        color: color,
        type: 'wave',
        phase: Math.random() * Math.PI * 2,
        radiusDir: dir.clone(),
        baseAngle: Math.random() * Math.PI * 2
      });
    }
  }

  emitSparkParticles(
    origin: THREE.Vector3,
    material: MaterialType,
    count: number = 15
  ): void {
    const config = MATERIAL_CONFIGS[material];
    const color = new THREE.Color(config.glowColor);

    for (let i = 0; i < count; i++) {
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 0.8 + 0.2,
        (Math.random() - 0.5) * 2
      ).normalize();

      const speed = 1.5 + Math.random() * 2.5;
      const life = 0.4 + Math.random() * 0.4;

      this.particles.push({
        position: origin.clone(),
        velocity: dir.multiplyScalar(speed),
        life: life,
        maxLife: life,
        size: 0.05 + Math.random() * 0.08,
        initialSize: 0.05 + Math.random() * 0.08,
        color: color.clone(),
        type: 'spark',
        phase: 0
      });
    }
  }

  emitTrailParticle(
    position: THREE.Vector3
  ): void {
    const color = new THREE.Color('#7eb8ff');
    const jitter = new THREE.Vector3(
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.05,
      (Math.random() - 0.5) * 0.05
    );

    this.particles.push({
      position: position.clone().add(jitter),
      velocity: new THREE.Vector3(0, 0.02, 0),
      life: 0.6,
      maxLife: 0.6,
      size: 0.12 + Math.random() * 0.08,
      initialSize: 0.12 + Math.random() * 0.08,
      color: color,
      type: 'trail',
      phase: Math.random() * Math.PI * 2
    });
  }

  attractNearbyParticles(
    attractPoint: THREE.Vector3,
    radius: number = 1.5,
    strength: number = 0.5
  ): void {
    for (const p of this.particles) {
      if (p.type !== 'wave') continue;
      const dist = p.position.distanceTo(attractPoint);
      if (dist < radius && dist > 0.01) {
        const attractDir = attractPoint.clone().sub(p.position).normalize();
        const factor = (1 - dist / radius) * strength;
        p.velocity.add(attractDir.multiplyScalar(factor * 0.3));
      }
    }
  }

  update(delta: number, time: number): void {
    const gravity = new THREE.Vector3(0, -2, 0);
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      const lifeRatio = p.life / p.maxLife;

      if (p.type === 'wave') {
        const waveOffset = Math.sin(time * 3 + p.phase) * 0.15;
        const rippleDir = p.radiusDir!.clone();
        const tangent = new THREE.Vector3(
          -rippleDir.z,
          0,
          rippleDir.x
        ).normalize();
        
        const perturb = tangent.multiplyScalar(
          Math.sin(time * 2 + (p.baseAngle || 0)) * 0.08 * (1 - lifeRatio)
        );

        p.velocity.add(perturb.multiplyScalar(delta * 60));
        p.position.addScaledVector(p.velocity, delta);
        p.size = p.initialSize * (0.5 + lifeRatio * 1.5);
      } else if (p.type === 'spark') {
        p.velocity.addScaledVector(gravity, delta);
        p.position.addScaledVector(p.velocity, delta);
        p.velocity.multiplyScalar(0.96);
        p.size = p.initialSize * lifeRatio;
      } else if (p.type === 'trail') {
        const floatOffset = Math.sin(time * 2 + p.phase) * 0.02;
        p.position.y += (0.03 + floatOffset) * delta * 60;
        p.velocity.multiplyScalar(0.92);
        p.position.addScaledVector(p.velocity, delta);
        p.size = p.initialSize * lifeRatio;
      }
    }

    this.updateGeometry(time);
  }

  private updateGeometry(time: number): void {
    const drawCount = Math.min(this.particles.length, this.maxParticles);
    
    for (let i = 0; i < drawCount; i++) {
      const p = this.particles[i];
      const lifeRatio = p.life / p.maxLife;
      const alpha = lifeRatio;

      this.positions[i * 3] = p.position.x;
      this.positions[i * 3 + 1] = p.position.y;
      this.positions[i * 3 + 2] = p.position.z;

      this.colors[i * 3] = p.color.r;
      this.colors[i * 3 + 1] = p.color.g;
      this.colors[i * 3 + 2] = p.color.b;

      this.sizes[i] = p.size;
      this.alphas[i] = alpha;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.attributes.alpha.needsUpdate = true;
    this.geometry.setDrawRange(0, drawCount);

    (this.mesh.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    this.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
