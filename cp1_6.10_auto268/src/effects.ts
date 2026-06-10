import * as THREE from 'three';

interface SupernovaParticle {
  velocity: THREE.Vector3;
  spinAxis: THREE.Vector3;
  spinSpeed: number;
  birthTime: number;
}

interface ActiveSupernova {
  particles: THREE.Points;
  particleData: SupernovaParticle[];
  nebula: THREE.Mesh;
  position: THREE.Vector3;
  startTime: number;
  starMesh: THREE.Mesh;
  starGlow: THREE.Mesh;
  originalStarColor: THREE.Color;
  originalGlowColor: THREE.Color;
}

const PARTICLE_LIFETIME = 2.0;
const NEBULA_LIFETIME = 3.0;
const COLOR_WARMUP = 1.0;
const COLOR_COOLDOWN = 1.5;

function createParticleTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(0.6, 'rgba(255,180,100,0.4)');
  gradient.addColorStop(1, 'rgba(255,100,50,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createNebulaTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  for (let i = 0; i < 5; i++) {
    const cx = size / 2 + (Math.random() - 0.5) * size * 0.3;
    const cy = size / 2 + (Math.random() - 0.5) * size * 0.3;
    const r = size * (0.25 + Math.random() * 0.25);
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const hue = 15 + Math.random() * 40;
    gradient.addColorStop(0, `hsla(${hue + 20}, 100%, 70%, 0.7)`);
    gradient.addColorStop(0.4, `hsla(${hue}, 90%, 55%, 0.45)`);
    gradient.addColorStop(0.75, `hsla(${hue - 20}, 80%, 40%, 0.2)`);
    gradient.addColorStop(1, 'hsla(280, 60%, 25%, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export class EffectsManager {
  public group: THREE.Group;
  private activeEffects: ActiveSupernova[] = [];
  private particleTexture: THREE.Texture;
  private nebulaTexture: THREE.Texture;
  public globalWarmth: number = 0;
  public totalParticleCount: number = 0;

  constructor() {
    this.group = new THREE.Group();
    this.particleTexture = createParticleTexture();
    this.nebulaTexture = createNebulaTexture();
  }

  public startSupernova(
    position: THREE.Vector3,
    starMesh: THREE.Mesh,
    starGlow: THREE.Mesh
  ): void {
    const particleCount = Math.floor(120 + Math.random() * 81);

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const particleData: SupernovaParticle[] = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 1.0;
      colors[i * 3 + 2] = 1.0;

      sizes[i] = 0.5;

      const dir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize();

      const speed = 1.0 + Math.random() * 3.0;
      particleData.push({
        velocity: dir.multiplyScalar(speed),
        spinAxis: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize(),
        spinSpeed: (Math.random() - 0.5) * 4.0,
        birthTime: performance.now() / 1000
      });
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.5,
      map: this.particleTexture,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    const particles = new THREE.Points(geometry, material);
    this.group.add(particles);

    const nebulaGeometry = new THREE.PlaneGeometry(2, 2, 1, 1);
    const nebulaMaterial = new THREE.MeshBasicMaterial({
      map: this.nebulaTexture,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
    nebula.position.copy(position);
    nebula.rotation.z = Math.random() * Math.PI * 2;
    this.group.add(nebula);

    this.activeEffects.push({
      particles,
      particleData,
      nebula,
      position: position.clone(),
      startTime: performance.now() / 1000,
      starMesh,
      starGlow,
      originalStarColor: (starMesh.material as THREE.MeshBasicMaterial).color.clone(),
      originalGlowColor: (starGlow.material as THREE.MeshBasicMaterial).color.clone()
    });

    this.totalParticleCount = Math.max(this.totalParticleCount, particleCount);
  }

  public update(deltaTime: number, _elapsed: number): void {
    const now = performance.now() / 1000;
    let maxWarmth = 0;

    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const effect = this.activeEffects[i];
      const age = now - effect.startTime;

      const particlePositions = effect.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
      const particleColors = effect.particles.geometry.getAttribute('color') as THREE.BufferAttribute;
      const particleSizes = effect.particles.geometry.getAttribute('size') as THREE.BufferAttribute;
      const positions = particlePositions.array as Float32Array;
      const colors = particleColors.array as Float32Array;
      const sizes = particleSizes.array as Float32Array;

      let maxParticleAge = 0;
      for (let p = 0; p < effect.particleData.length; p++) {
        const data = effect.particleData[p];
        const particleAge = now - data.birthTime;
        maxParticleAge = Math.max(maxParticleAge, particleAge);

        const t = Math.min(1.0, particleAge / PARTICLE_LIFETIME);
        positions[p * 3] += data.velocity.x * deltaTime * (1.0 - t * 0.5);
        positions[p * 3 + 1] += data.velocity.y * deltaTime * (1.0 - t * 0.5);
        positions[p * 3 + 2] += data.velocity.z * deltaTime * (1.0 - t * 0.5);

        if (t < 0.33) {
          const tt = t / 0.33;
          colors[p * 3] = 1.0;
          colors[p * 3 + 1] = 1.0;
          colors[p * 3 + 2] = 1.0 - tt * (1.0 - 0.42);
        } else if (t < 0.7) {
          const tt = (t - 0.33) / 0.37;
          colors[p * 3] = 1.0;
          colors[p * 3 + 1] = 0.42 - tt * (0.42 - 0.22);
          colors[p * 3 + 2] = 0.42 - tt * (0.42 - 0.21);
        } else {
          const tt = (t - 0.7) / 0.3;
          colors[p * 3] = 1.0 - tt * (1.0 - 0.56);
          colors[p * 3 + 1] = 0.22 - tt * (0.22 - 0.27);
          colors[p * 3 + 2] = 0.21 + tt * (0.68 - 0.21);
        }

        sizes[p] = 0.5 * (1.0 - t);
      }

      particlePositions.needsUpdate = true;
      particleColors.needsUpdate = true;
      particleSizes.needsUpdate = true;

      const particleMat = effect.particles.material as THREE.PointsMaterial;
      const particleT = Math.min(1.0, maxParticleAge / PARTICLE_LIFETIME);
      particleMat.opacity = 1.0 - particleT;

      if (effect.starMesh && effect.starGlow) {
        const flashT = Math.min(1.0, age / 0.35);
        const starMat = effect.starMesh.material as THREE.MeshBasicMaterial;
        const glowMat = effect.starGlow.material as THREE.MeshBasicMaterial;

        if (flashT < 1.0) {
          const flicker = 0.5 + Math.sin(age * 60) * 0.5;
          const brightness = 0.3 + flicker * 0.7 * (1.0 - flashT);
          starMat.color.setRGB(
            1.0,
            0.95 - flashT * 0.5,
            0.85 - flashT * 0.6
          );
          starMat.opacity = 1.0 - flashT * 0.6;
          glowMat.color.setRGB(
            1.0,
            0.6 + flicker * 0.4,
            0.3 + flicker * 0.3
          );
          glowMat.opacity = 0.25 + brightness * 0.6;
          effect.starMesh.scale.setScalar(1.0 + flashT * 0.5);
          effect.starGlow.scale.setScalar(2.2 * (1.0 + flashT * 1.2));
        } else {
          starMat.opacity = Math.max(0, 0.4 - (age - 0.35) * 0.5);
          glowMat.opacity = Math.max(0, 0.25 - (age - 0.35) * 0.3);
        }
      }

      const nebulaT = Math.min(1.0, age / NEBULA_LIFETIME);
      const nebulaScale = 1.0 + nebulaT * 4.0;
      effect.nebula.scale.set(nebulaScale, nebulaScale, 1.0);
      effect.nebula.rotation.z += 0.3 * deltaTime;
      const nebulaMat = effect.nebula.material as THREE.MeshBasicMaterial;
      nebulaMat.opacity = 0.9 * (1.0 - nebulaT);

      const warmthT = age < COLOR_WARMUP
        ? age / COLOR_WARMUP
        : Math.max(0, 1.0 - (age - COLOR_WARMUP) / COLOR_COOLDOWN);
      maxWarmth = Math.max(maxWarmth, warmthT);

      if (age > Math.max(PARTICLE_LIFETIME, NEBULA_LIFETIME) + 0.5) {
        this.group.remove(effect.particles);
        this.group.remove(effect.nebula);
        effect.particles.geometry.dispose();
        (effect.particles.material as THREE.Material).dispose();
        effect.nebula.geometry.dispose();
        (effect.nebula.material as THREE.Material).dispose();
        this.activeEffects.splice(i, 1);
      }
    }

    this.globalWarmth = THREE.MathUtils.lerp(this.globalWarmth, maxWarmth, 0.08);
  }

  public applyColorWarmth(renderer: THREE.WebGLRenderer): void {
    if (this.globalWarmth > 0.001) {
      const w = this.globalWarmth;
      renderer.toneMappingExposure = 1.0 + w * 0.5;
    } else {
      renderer.toneMappingExposure = 1.0;
    }
  }

  public getActiveCount(): number {
    return this.activeEffects.length;
  }
}
