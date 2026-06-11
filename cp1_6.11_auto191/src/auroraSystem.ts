import * as THREE from 'three';

const BASE_PARTICLE_COUNT = 8000;
const MIN_PARTICLES = 2000;
const MAX_PARTICLES = 10000;

interface AuroraGlowEffect {
  center: THREE.Vector3;
  startTime: number;
  duration: number;
}

export class AuroraSystem {
  private scene: THREE.Scene;
  private points: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private basePositions: Float32Array = new Float32Array(0);
  private layerIndices: Float32Array = new Float32Array(0);
  private phaseOffsets: Float32Array = new Float32Array(0);
  private particleSizes: Float32Array = new Float32Array(0);
  private baseColors: Float32Array = new Float32Array(0);
  private currentParticleCount = 0;
  private intensity = 50;
  private colorShift = 0;
  private density = 60;
  private glowEffects: AuroraGlowEffect[] = [];
  private globalOpacity = 0;
  private clock = new THREE.Clock();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.buildParticles(this.getParticleCount());
  }

  private getParticleCount(): number {
    const ratio = this.density / 100;
    return Math.floor(MIN_PARTICLES + ratio * (MAX_PARTICLES - MIN_PARTICLES));
  }

  private buildParticles(count: number): void {
    if (this.points) {
      this.scene.remove(this.points);
      this.geometry?.dispose();
      this.material?.dispose();
    }

    this.currentParticleCount = count;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opacities = new Float32Array(count);
    this.basePositions = new Float32Array(count * 3);
    this.layerIndices = new Float32Array(count);
    this.phaseOffsets = new Float32Array(count);
    this.particleSizes = new Float32Array(count);
    this.baseColors = new Float32Array(count * 3);

    const layerCount = 12;
    const particlesPerLayer = Math.floor(count / layerCount);
    const layerWidthMin = 10;
    const layerWidthMax = 30;
    const layerSpacingMin = 3;
    const layerSpacingMax = 5;
    const baseY = 15;

    const colorStart = new THREE.Color(0x00ff88);
    const colorEnd = new THREE.Color(0x4400ff);

    for (let layer = 0; layer < layerCount; layer++) {
      const layerStart = layer * particlesPerLayer;
      const layerEnd = layer === layerCount - 1 ? count : (layer + 1) * particlesPerLayer;
      const layerY = baseY + layer * (layerSpacingMin + Math.random() * (layerSpacingMax - layerSpacingMin));
      const layerWidth = layerWidthMin + Math.random() * (layerWidthMax - layerWidthMin);
      const layerDepth = 8 + Math.random() * 12;
      const layerPhaseBase = Math.random() * Math.PI * 2;
      const layerPeriod = 5 + Math.random() * 3;

      const t = layer / (layerCount - 1);
      const layerColor = new THREE.Color().lerpColors(colorStart, colorEnd, t);

      for (let i = layerStart; i < layerEnd; i++) {
        const x = (Math.random() - 0.5) * layerWidth;
        const y = layerY + (Math.random() - 0.5) * 4;
        const z = (Math.random() - 0.5) * layerDepth;

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        this.basePositions[i * 3] = x;
        this.basePositions[i * 3 + 1] = y;
        this.basePositions[i * 3 + 2] = z;

        const colorVariation = 0.15;
        const r = Math.max(0, Math.min(1, layerColor.r + (Math.random() - 0.5) * colorVariation));
        const g = Math.max(0, Math.min(1, layerColor.g + (Math.random() - 0.5) * colorVariation));
        const b = Math.max(0, Math.min(1, layerColor.b + (Math.random() - 0.5) * colorVariation));

        colors[i * 3] = r;
        colors[i * 3 + 1] = g;
        colors[i * 3 + 2] = b;

        this.baseColors[i * 3] = r;
        this.baseColors[i * 3 + 1] = g;
        this.baseColors[i * 3 + 2] = b;

        sizes[i] = 1.5 + Math.random() * 2.5;
        opacities[i] = 0.4 + Math.random() * 0.5;

        this.particleSizes[i] = sizes[i];
        this.layerIndices[i] = layer;
        this.phaseOffsets[i] = layerPhaseBase + Math.random() * 0.5;
      }
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1));

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uGlobalOpacity: { value: 0.0 },
      },
      vertexShader: `
        attribute float aSize;
        attribute vec3 aColor;
        attribute float aOpacity;
        varying vec3 vColor;
        varying float vOpacity;
        uniform float uPixelRatio;
        uniform float uGlobalOpacity;
        void main() {
          vColor = aColor;
          vOpacity = aOpacity * uGlobalOpacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (300.0 / -mvPosition.z);
          gl_PointSize = max(gl_PointSize, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float glow = 1.0 - smoothstep(0.0, 0.5, dist);
          glow = pow(glow, 1.5);
          gl_FragColor = vec4(vColor * glow, vOpacity * glow);
        }
      `,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  setIntensity(value: number): void {
    this.intensity = value;
  }

  setColorShift(value: number): void {
    this.colorShift = value;
  }

  setDensity(value: number): void {
    const oldCount = this.getParticleCount();
    this.density = value;
    const newCount = this.getParticleCount();
    if (Math.abs(newCount - oldCount) > 100) {
      this.buildParticles(newCount);
    }
  }

  triggerGlowAt(center: THREE.Vector3): void {
    this.glowEffects.push({
      center: center.clone(),
      startTime: this.clock.getElapsedTime(),
      duration: 0.6,
    });
  }

  startRevealAnimation(): void {
    this.globalOpacity = 0;
    const start = performance.now();
    const animate = () => {
      const elapsed = (performance.now() - start) / 1000;
      const progress = Math.min(elapsed / 2.0, 1.0);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.globalOpacity = eased;
      if (progress < 1.0) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  update(time: number): void {
    if (!this.geometry || !this.material) return;

    const positions = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colors = this.geometry.getAttribute('aColor') as THREE.BufferAttribute;
    const opacities = this.geometry.getAttribute('aOpacity') as THREE.BufferAttribute;
    const posArray = positions.array as Float32Array;
    const colArray = colors.array as Float32Array;
    const opaArray = opacities.array as Float32Array;

    const intensityFactor = this.intensity / 100;
    const saturation = 0.2 + 0.8 * intensityFactor;
    const baseOpacity = 0.15 + 0.65 * intensityFactor;

    const shiftFactor = this.colorShift / 100;
    const shiftHue = shiftFactor * 0.3;

    const currentTime = this.clock.getElapsedTime();

    for (let i = 0; i < this.currentParticleCount; i++) {
      const phase = this.phaseOffsets[i];
      const layer = this.layerIndices[i];
      const period = 5 + (layer % 4);

      const waveX = Math.sin(currentTime * (2 * Math.PI / period) + phase) * (3 + layer * 0.5);
      const waveY = Math.sin(currentTime * (2 * Math.PI / (period * 1.3)) + phase * 0.7) * 1.5;
      const waveZ = Math.cos(currentTime * (2 * Math.PI / (period * 0.8)) + phase * 1.3) * 2;

      posArray[i * 3] = this.basePositions[i * 3] + waveX;
      posArray[i * 3 + 1] = this.basePositions[i * 3 + 1] + waveY;
      posArray[i * 3 + 2] = this.basePositions[i * 3 + 2] + waveZ;

      const br = this.baseColors[i * 3];
      const bg = this.baseColors[i * 3 + 1];
      const bb = this.baseColors[i * 3 + 2];

      const baseColor = new THREE.Color(br, bg, bb);
      const hsl = { h: 0, s: 0, l: 0 };
      baseColor.getHSL(hsl);

      hsl.h = (hsl.h + shiftHue + 1) % 1;
      hsl.s = Math.min(1, hsl.s * saturation);
      hsl.l = 0.3 + hsl.l * 0.7 * intensityFactor;

      let finalR = hsl.l * (1 - hsl.s) + hsl.s * (
        hsl.l < 0.5
          ? hsl.l * 2 * (hsl.h < 1/6 ? 1 : hsl.h < 2/6 ? (1/3 - hsl.h) * 6 : hsl.h < 3/6 ? 0 : hsl.h < 4/6 ? (hsl.h - 2/3) * 6 : hsl.h < 5/6 ? 1 : (5/6 - hsl.h) * 6)
          : (2 - hsl.l * 2) * (hsl.h < 1/6 ? 1 : hsl.h < 2/6 ? (1/3 - hsl.h) * 6 : hsl.h < 3/6 ? 0 : hsl.h < 4/6 ? (hsl.h - 2/3) * 6 : hsl.h < 5/6 ? 1 : (5/6 - hsl.h) * 6) / 2
      );

      const shiftedColor = new THREE.Color();
      shiftedColor.setHSL(hsl.h, hsl.s, hsl.l);

      let glowInfluence = 0;
      for (const glow of this.glowEffects) {
        const dx = posArray[i * 3] - glow.center.x;
        const dy = posArray[i * 3 + 1] - glow.center.y;
        const dz = posArray[i * 3 + 2] - glow.center.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const elapsed = currentTime - glow.startTime;
        const progress = elapsed / glow.duration;
        if (progress < 1) {
          const radius = progress * 25;
          const fade = 1 - progress;
          if (dist < radius) {
            glowInfluence = Math.max(glowInfluence, fade * (1 - dist / radius));
          }
        }
      }

      colArray[i * 3] = shiftedColor.r * (1 - glowInfluence) + glowInfluence;
      colArray[i * 3 + 1] = shiftedColor.g * (1 - glowInfluence) + glowInfluence;
      colArray[i * 3 + 2] = shiftedColor.b * (1 - glowInfluence) + glowInfluence;

      opaArray[i] = baseOpacity * (0.7 + 0.3 * Math.sin(currentTime * 0.5 + i * 0.01));
    }

    this.glowEffects = this.glowEffects.filter(
      (g) => currentTime - g.startTime < g.duration
    );

    this.material.uniforms.uGlobalOpacity.value = this.globalOpacity;

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    opacities.needsUpdate = true;
  }

  getPoints(): THREE.Points | null {
    return this.points;
  }

  dispose(): void {
    this.geometry?.dispose();
    this.material?.dispose();
    if (this.points) {
      this.scene.remove(this.points);
    }
  }
}
