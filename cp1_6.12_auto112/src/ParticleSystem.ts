import * as THREE from 'three';

const COLOR_THEMES: Record<string, number[][]> = {
  aurora: [
    [0x00, 0xF5, 0xFF],
    [0x7B, 0x2F, 0xF7],
    [0xFF, 0x6B, 0x6B],
    [0x00, 0xFF, 0x87],
    [0xFF, 0xD7, 0x00]
  ],
  sunset: [
    [0xFF, 0x6B, 0x35],
    [0xFF, 0x8E, 0x53],
    [0xFF, 0xD9, 0x3D],
    [0xFF, 0x5E, 0x5E],
    [0xC7, 0x7D, 0xF2]
  ],
  neon: [
    [0x00, 0xFF, 0x87],
    [0x7B, 0x2F, 0xF7],
    [0xFF, 0x00, 0x6E],
    [0x00, 0xD4, 0xFF],
    [0xB0, 0x26, 0xFF]
  ]
};

const THEME_KEYS = ['aurora', 'sunset', 'neon'];

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  baseSize: number;
  opacity: number;
  baseOpacity: number;
  color: THREE.Color;
  colorIndex: number;
  colorProgress: number;
  life: number;
  maxLife: number;
  isFading: boolean;
  fadeStartTime: number;
  spiralAngle: number;
  spiralRadius: number;
  active: boolean;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private maxParticles = 400;
  private minParticles = 200;

  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.PointsMaterial;
  private points: THREE.Points;

  private lineGeometry: THREE.BufferGeometry;
  private lineMaterial: THREE.LineBasicMaterial;
  private lines: THREE.LineSegments;

  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;

  private linePositions: Float32Array;
  private lineColors: Float32Array;

  private currentTheme = 0;
  private isPaused = false;
  private isFadingOut = false;
  private fadeOutStartTime = 0;
  private readonly FADE_DURATION = 2000;

  private spawnAccumulator = 0;
  private particlesPerSecond = 10;

  private connectionDistanceThreshold = 3;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.particleGeometry = new THREE.BufferGeometry();
    this.lineGeometry = new THREE.BufferGeometry();

    this.initBuffers();
    this.initMaterials();
    this.initObjects();
    this.initParticlePool();
  }

  private initBuffers(): void {
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);

    const maxConnections = this.maxParticles * 4;
    this.linePositions = new Float32Array(maxConnections * 6);
    this.lineColors = new Float32Array(maxConnections * 6);

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3));
    this.lineGeometry.setAttribute('color', new THREE.BufferAttribute(this.lineColors, 3));
  }

  private initMaterials(): void {
    this.particleMaterial = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }

  private initObjects(): void {
    this.points = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.lines = new THREE.LineSegments(this.lineGeometry, this.lineMaterial);
    this.scene.add(this.points);
    this.scene.add(this.lines);
  }

  private initParticlePool(): void {
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push(this.createParticle());
    }
  }

  private createParticle(origin?: THREE.Vector3): Particle {
    const themeColors = COLOR_THEMES[THEME_KEYS[this.currentTheme]];
    const colorIndex = Math.floor(Math.random() * themeColors.length);
    const rgb = themeColors[colorIndex];

    const position = origin
      ? origin.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5
        ))
      : new THREE.Vector3(0, -100, 0);

    const spiralAngle = Math.random() * Math.PI * 2;
    const spiralRadius = 0.5 + Math.random() * 1.5;

    const baseSize = 0.1 + Math.random() * 0.2;
    const baseOpacity = 0.6 + Math.random() * 0.4;

    return {
      position,
      velocity: new THREE.Vector3(0, 0, 0),
      size: baseSize,
      baseSize,
      opacity: baseOpacity,
      baseOpacity,
      color: new THREE.Color(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255),
      colorIndex,
      colorProgress: Math.random(),
      life: 0,
      maxLife: 3 + Math.random() * 4,
      isFading: false,
      fadeStartTime: 0,
      spiralAngle,
      spiralRadius,
      active: !!origin
    };
  }

  public spawnParticles(origin: THREE.Vector3, velocityFactor: number): void {
    this.particlesPerSecond = THREE.MathUtils.lerp(10, 50, velocityFactor);
    this.isFadingOut = false;

    const activeCount = this.particles.filter(p => p.active).length;
    if (activeCount >= this.maxParticles) return;

    const toSpawn = Math.min(
      Math.ceil(this.particlesPerSecond * 0.016),
      this.maxParticles - activeCount
    );

    for (let i = 0; i < toSpawn; i++) {
      const inactive = this.particles.find(p => !p.active);
      if (inactive) {
        this.resetParticle(inactive, origin);
      }
    }
  }

  private resetParticle(particle: Particle, origin: THREE.Vector3): void {
    const themeColors = COLOR_THEMES[THEME_KEYS[this.currentTheme]];
    const colorIndex = Math.floor(Math.random() * themeColors.length);
    const rgb = themeColors[colorIndex];

    particle.position.copy(origin).add(new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.5
    ));
    particle.velocity.set(0, 0, 0);
    particle.spiralAngle = Math.random() * Math.PI * 2;
    particle.spiralRadius = 0.5 + Math.random() * 1.5;
    particle.baseSize = 0.1 + Math.random() * 0.2;
    particle.size = particle.baseSize;
    particle.baseOpacity = 0.6 + Math.random() * 0.4;
    particle.opacity = particle.baseOpacity;
    particle.colorIndex = colorIndex;
    particle.colorProgress = Math.random();
    particle.color.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
    particle.life = 0;
    particle.maxLife = 3 + Math.random() * 4;
    particle.isFading = false;
    particle.active = true;
  }

  public startFadeOut(): void {
    if (!this.isFadingOut) {
      this.isFadingOut = true;
      this.fadeOutStartTime = performance.now();
      this.particles.forEach(p => {
        if (p.active) {
          p.isFading = true;
          p.fadeStartTime = performance.now();
        }
      });
    }
  }

  public update(deltaTime: number): void {
    if (this.isPaused) {
      this.updateBuffers();
      return;
    }

    const now = performance.now();
    const themeColors = COLOR_THEMES[THEME_KEYS[this.currentTheme]];

    let activeCount = 0;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;

      activeCount++;
      p.life += deltaTime;

      p.spiralAngle += deltaTime * 1.5;
      const spiralX = Math.cos(p.spiralAngle) * p.spiralRadius * 0.3;
      const spiralY = Math.sin(p.spiralAngle) * p.spiralRadius * 0.3;
      const spiralZ = deltaTime * 2;

      p.position.x += spiralX * deltaTime;
      p.position.y += spiralY * deltaTime;
      p.position.z += spiralZ;

      p.colorProgress += deltaTime * 0.3;
      if (p.colorProgress >= 1) {
        p.colorProgress = 0;
        p.colorIndex = (p.colorIndex + 1) % themeColors.length;
      }

      const currentRgb = themeColors[p.colorIndex];
      const nextRgb = themeColors[(p.colorIndex + 1) % themeColors.length];
      const t = p.colorProgress;
      p.color.setRGB(
        THREE.MathUtils.lerp(currentRgb[0], nextRgb[0], t) / 255,
        THREE.MathUtils.lerp(currentRgb[1], nextRgb[1], t) / 255,
        THREE.MathUtils.lerp(currentRgb[2], nextRgb[2], t) / 255
      );

      if (p.isFading) {
        const fadeElapsed = now - p.fadeStartTime;
        const fadeProgress = Math.min(fadeElapsed / this.FADE_DURATION, 1);
        p.opacity = THREE.MathUtils.lerp(p.baseOpacity, 0, fadeProgress);
        p.size = THREE.MathUtils.lerp(p.baseSize, 0, fadeProgress);

        if (fadeProgress >= 1) {
          p.active = false;
          p.position.set(0, -100, 0);
        }
      } else if (p.life >= p.maxLife) {
        p.isFading = true;
        p.fadeStartTime = now;
      }
    }

    if (activeCount > 500) {
      this.connectionDistanceThreshold = 1.5;
    } else {
      this.connectionDistanceThreshold = 3;
    }

    this.updateBuffers();
    this.updateConnections();
  }

  private updateBuffers(): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const idx3 = i * 3;

      this.positions[idx3] = p.position.x;
      this.positions[idx3 + 1] = p.position.y;
      this.positions[idx3 + 2] = p.position.z;

      this.colors[idx3] = p.color.r;
      this.colors[idx3 + 1] = p.color.g;
      this.colors[idx3 + 2] = p.color.b;

      this.sizes[i] = p.active ? p.size : 0;
    }

    (this.particleGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.particleGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    (this.particleGeometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
  }

  private updateConnections(): void {
    const activeParticles = this.particles.filter(p => p.active);
    let lineIndex = 0;
    const maxLines = Math.floor(this.linePositions.length / 6);

    for (let i = 0; i < activeParticles.length && lineIndex < maxLines; i++) {
      for (let j = i + 1; j < activeParticles.length && lineIndex < maxLines; j++) {
        const p1 = activeParticles[i];
        const p2 = activeParticles[j];
        const dist = p1.position.distanceTo(p2.position);

        if (dist < this.connectionDistanceThreshold) {
          const idx6 = lineIndex * 6;

          this.linePositions[idx6] = p1.position.x;
          this.linePositions[idx6 + 1] = p1.position.y;
          this.linePositions[idx6 + 2] = p1.position.z;
          this.linePositions[idx6 + 3] = p2.position.x;
          this.linePositions[idx6 + 4] = p2.position.y;
          this.linePositions[idx6 + 5] = p2.position.z;

          const mixR = (p1.color.r + p2.color.r) * 0.5;
          const mixG = (p1.color.g + p2.color.g) * 0.5;
          const mixB = (p1.color.b + p2.color.b) * 0.5;

          this.lineColors[idx6] = mixR;
          this.lineColors[idx6 + 1] = mixG;
          this.lineColors[idx6 + 2] = mixB;
          this.lineColors[idx6 + 3] = mixR;
          this.lineColors[idx6 + 4] = mixG;
          this.lineColors[idx6 + 5] = mixB;

          lineIndex++;
        }
      }
    }

    for (let i = lineIndex * 6; i < this.linePositions.length; i++) {
      this.linePositions[i] = 0;
      this.lineColors[i] = 0;
    }

    (this.lineGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.lineGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    this.lineGeometry.setDrawRange(0, lineIndex * 2);
  }

  public reset(): void {
    this.isFadingOut = false;
    this.isPaused = false;
    this.particles.forEach(p => {
      p.active = false;
      p.position.set(0, -100, 0);
      p.opacity = 0;
      p.size = 0;
    });
    this.particleMaterial.opacity = 0.8;
  }

  public toggleColorTheme(): void {
    this.currentTheme = (this.currentTheme + 1) % THEME_KEYS.length;
    const themeColors = COLOR_THEMES[THEME_KEYS[this.currentTheme]];

    this.particles.forEach(p => {
      if (!p.active) return;
      p.colorIndex = Math.floor(Math.random() * themeColors.length);
      p.colorProgress = 0;
      const rgb = themeColors[p.colorIndex];
      p.color.setRGB(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
    });
  }

  public togglePause(): void {
    this.isPaused = !this.isPaused;
    this.particleMaterial.opacity = this.isPaused ? 0.4 : 0.8;
  }

  public isPausedState(): boolean {
    return this.isPaused;
  }

  public dispose(): void {
    this.scene.remove(this.points);
    this.scene.remove(this.lines);
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    this.lineGeometry.dispose();
    this.lineMaterial.dispose();
  }
}
