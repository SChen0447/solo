import * as THREE from 'three';
import type { PoemData, CharacterData } from './poemManager';

export type ParticleState = 'floating' | 'converging' | 'scattering';

export type ColorScheme = 'moon' | 'sunset' | 'aurora';

interface ColorPalette {
  primary: THREE.Color;
  secondary: THREE.Color;
  highlight: THREE.Color;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.ShaderMaterial | null = null;

  private totalParticles: number = 0;
  private particlesPerChar: number = 250;

  private currentPositions: Float32Array = new Float32Array();
  private targetPositions: Float32Array = new Float32Array();
  private floatingPositions: Float32Array = new Float32Array();
  private scatteredPositions: Float32Array = new Float32Array();
  private velocities: Float32Array = new Float32Array();
  private colors: Float32Array = new Float32Array();
  private baseColors: Float32Array = new Float32Array();
  private particleSizes: Float32Array = new Float32Array();
  private hoverStates: Float32Array = new Float32Array();
  private characterIndices: Int32Array = new Int32Array();

  private state: ParticleState = 'floating';
  private stateTime: number = 0;
  private stateDuration: number = 2.0;
  private stateHoldTime: number = 0;
  private scatterSpeedMultiplier: number = 1.0;

  private poemData: PoemData | null = null;

  private mouse: THREE.Vector2 = new THREE.Vector2();
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private hoveredCharacter: number = -1;
  private hoverTimer: number = 0;

  private shockwaves: { position: THREE.Vector3; time: number; duration: number; strength: number }[] = [];

  private colorSchemes: Record<ColorScheme, ColorPalette> = {
    moon: {
      primary: new THREE.Color(0x4a5568),
      secondary: new THREE.Color(0x667eea),
      highlight: new THREE.Color(0xb794f4)
    },
    sunset: {
      primary: new THREE.Color(0xf56565),
      secondary: new THREE.Color(0xed8936),
      highlight: new THREE.Color(0xf687b3)
    },
    aurora: {
      primary: new THREE.Color(0x48bb78),
      secondary: new THREE.Color(0x38b2ac),
      highlight: new THREE.Color(0x4299e1)
    }
  };

  private currentColorScheme: ColorScheme = 'moon';
  private baseParticleSize: number = 4.0;

  private warmColor: THREE.Color = new THREE.Color(0xff8c42);

  constructor(scene: THREE.Scene, particlesPerChar: number = 250) {
    this.scene = scene;
    this.particlesPerChar = particlesPerChar;
  }

  init(poemData: PoemData): void {
    this.poemData = poemData;
    const charCount = poemData.characters.length;
    this.totalParticles = charCount * this.particlesPerChar;

    this.currentPositions = new Float32Array(this.totalParticles * 3);
    this.targetPositions = new Float32Array(this.totalParticles * 3);
    this.floatingPositions = new Float32Array(this.totalParticles * 3);
    this.scatteredPositions = new Float32Array(this.totalParticles * 3);
    this.velocities = new Float32Array(this.totalParticles * 3);
    this.colors = new Float32Array(this.totalParticles * 3);
    this.baseColors = new Float32Array(this.totalParticles * 3);
    this.particleSizes = new Float32Array(this.totalParticles);
    this.hoverStates = new Float32Array(this.totalParticles);
    this.characterIndices = new Int32Array(this.totalParticles);

    for (let c = 0; c < charCount; c++) {
      const charData = poemData.characters[c];
      for (let i = 0; i < this.particlesPerChar; i++) {
        const idx = c * this.particlesPerChar + i;
        const posIdx = i * 3;

        this.targetPositions[idx * 3] = charData.positions[posIdx] + charData.centerX;
        this.targetPositions[idx * 3 + 1] = charData.positions[posIdx + 1];
        this.targetPositions[idx * 3 + 2] = charData.positions[posIdx + 2];

        const spread = 4.0;
        this.floatingPositions[idx * 3] = (Math.random() - 0.5) * spread;
        this.floatingPositions[idx * 3 + 1] = (Math.random() - 0.5) * spread;
        this.floatingPositions[idx * 3 + 2] = (Math.random() - 0.5) * spread;

        const scatterSpread = 2.5;
        this.scatteredPositions[idx * 3] = charData.positions[posIdx] + charData.centerX + (Math.random() - 0.5) * scatterSpread;
        this.scatteredPositions[idx * 3 + 1] = charData.positions[posIdx + 1] + (Math.random() - 0.5) * scatterSpread;
        this.scatteredPositions[idx * 3 + 2] = charData.positions[posIdx + 2] + (Math.random() - 0.5) * scatterSpread;

        this.currentPositions[idx * 3] = this.floatingPositions[idx * 3];
        this.currentPositions[idx * 3 + 1] = this.floatingPositions[idx * 3 + 1];
        this.currentPositions[idx * 3 + 2] = this.floatingPositions[idx * 3 + 2];

        this.velocities[idx * 3] = (Math.random() - 0.5) * 0.01;
        this.velocities[idx * 3 + 1] = (Math.random() - 0.5) * 0.01;
        this.velocities[idx * 3 + 2] = (Math.random() - 0.5) * 0.01;

        this.characterIndices[idx] = c;
        this.hoverStates[idx] = 0;
        this.particleSizes[idx] = this.baseParticleSize * (0.7 + Math.random() * 0.6);
      }
    }

    this.applyColorScheme();
    this.createParticles();
    this.state = 'floating';
    this.stateTime = 0;
    this.stateHoldTime = 1.0;
  }

  private createParticles(): void {
    if (this.particles) {
      this.scene.remove(this.particles);
      this.geometry?.dispose();
      this.material?.dispose();
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.currentPositions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.particleSizes, 1));

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float uPixelRatio;
        
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          alpha = pow(alpha, 1.5);
          
          vec3 glow = vColor * (1.0 + (1.0 - dist) * 0.5);
          gl_FragColor = vec4(glow, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.particles);
  }

  private applyColorScheme(): void {
    const palette = this.colorSchemes[this.currentColorScheme];

    for (let i = 0; i < this.totalParticles; i++) {
      const t = Math.random();
      let color: THREE.Color;

      if (t < 0.5) {
        color = palette.primary.clone().lerp(palette.secondary, t * 2);
      } else {
        color = palette.secondary.clone().lerp(palette.highlight, (t - 0.5) * 2);
      }

      this.baseColors[i * 3] = color.r;
      this.baseColors[i * 3 + 1] = color.g;
      this.baseColors[i * 3 + 2] = color.b;

      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
    }
  }

  setColorScheme(scheme: ColorScheme): void {
    this.currentColorScheme = scheme;
    this.applyColorScheme();
    if (this.geometry) {
      const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
      colorAttr.needsUpdate = true;
    }
  }

  setParticleSize(size: number): void {
    this.baseParticleSize = size;
    for (let i = 0; i < this.totalParticles; i++) {
      this.particleSizes[i] = size * (0.7 + (this.particleSizes[i] / this.baseParticleSize - 0.7));
    }
    if (this.geometry) {
      const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute;
      sizeAttr.needsUpdate = true;
    }
  }

  setScatterSpeed(multiplier: number): void {
    this.scatterSpeedMultiplier = multiplier;
  }

  updatePoem(poemData: PoemData): void {
    this.poemData = poemData;
    const charCount = poemData.characters.length;
    const newTotal = charCount * this.particlesPerChar;

    if (newTotal !== this.totalParticles) {
      this.init(poemData);
      return;
    }

    for (let c = 0; c < charCount; c++) {
      const charData = poemData.characters[c];
      for (let i = 0; i < this.particlesPerChar; i++) {
        const idx = c * this.particlesPerChar + i;
        const posIdx = i * 3;

        this.targetPositions[idx * 3] = charData.positions[posIdx] + charData.centerX;
        this.targetPositions[idx * 3 + 1] = charData.positions[posIdx + 1];
        this.targetPositions[idx * 3 + 2] = charData.positions[posIdx + 2];

        this.scatteredPositions[idx * 3] = charData.positions[posIdx] + charData.centerX + (Math.random() - 0.5) * 2.5;
        this.scatteredPositions[idx * 3 + 1] = charData.positions[posIdx + 1] + (Math.random() - 0.5) * 2.5;
        this.scatteredPositions[idx * 3 + 2] = charData.positions[posIdx + 2] + (Math.random() - 0.5) * 2.5;
      }
    }

    this.state = 'floating';
    this.stateTime = 0;
    this.stateHoldTime = 0.5;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  setState(state: ParticleState): void {
    if (this.state !== state) {
      this.state = state;
      this.stateTime = 0;
      this.stateHoldTime = 0;
    }
  }

  handleMouseMove(normalizedX: number, normalizedY: number, camera: THREE.Camera): void {
    this.mouse.set(normalizedX, normalizedY);

    if (!this.poemData || !this.particles) return;

    this.raycaster.setFromCamera(this.mouse, camera);

    const charCount = this.poemData.characters.length;
    let newHovered = -1;

    for (let c = 0; c < charCount; c++) {
      const char = this.poemData.characters[c];
      const charBox = new THREE.Box3(
        new THREE.Vector3(char.centerX - char.width / 2, -0.8, -0.5),
        new THREE.Vector3(char.centerX + char.width / 2, 0.8, 0.5)
      );

      if (this.raycaster.ray.intersectsBox(charBox)) {
        newHovered = c;
        break;
      }
    }

    if (newHovered !== this.hoveredCharacter) {
      this.hoveredCharacter = newHovered;
      this.hoverTimer = 0;
    }
  }

  handleClick(normalizedX: number, normalizedY: number, camera: THREE.Camera): void {
    this.raycaster.setFromCamera(new THREE.Vector2(normalizedX, normalizedY), camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersect = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersect);

    if (intersect) {
      this.shockwaves.push({
        position: intersect.clone(),
        time: 0,
        duration: 1.0,
        strength: 2.0
      });
    }
  }

  update(deltaTime: number): void {
    if (!this.geometry || !this.poemData) return;

    this.stateTime += deltaTime;
    if (this.hoveredCharacter >= 0) {
      this.hoverTimer += deltaTime;
    }

    const effectiveDuration = this.state === 'scattering' || this.state === 'floating'
      ? this.stateDuration / this.scatterSpeedMultiplier
      : this.stateDuration;

    let t = Math.min(this.stateTime / effectiveDuration, 1);
    t = this.easeInOutCubic(t);

    let sourceArr: Float32Array;
    let targetArr: Float32Array;

    switch (this.state) {
      case 'converging':
        sourceArr = this.floatingPositions;
        targetArr = this.targetPositions;
        break;
      case 'scattering':
        sourceArr = this.targetPositions;
        targetArr = this.scatteredPositions;
        break;
      case 'floating':
      default:
        sourceArr = this.scatteredPositions;
        targetArr = this.floatingPositions;
        break;
    }

    for (let i = 0; i < this.totalParticles; i++) {
      const i3 = i * 3;

      let baseX = sourceArr[i3] + (targetArr[i3] - sourceArr[i3]) * t;
      let baseY = sourceArr[i3 + 1] + (targetArr[i3 + 1] - sourceArr[i3 + 1]) * t;
      let baseZ = sourceArr[i3 + 2] + (targetArr[i3 + 2] - sourceArr[i3 + 2]) * t;

      if (this.state === 'floating') {
        baseX += Math.sin(performance.now() * 0.0005 + i * 0.1) * 0.05;
        baseY += Math.cos(performance.now() * 0.0007 + i * 0.15) * 0.05;
        baseZ += Math.sin(performance.now() * 0.0003 + i * 0.2) * 0.03;
      }

      const charIdx = this.characterIndices[i];
      let hoverOffsetX = 0, hoverOffsetY = 0, hoverOffsetZ = 0;
      let hoverColorMix = 0;

      if (this.hoveredCharacter >= 0 && charIdx === this.hoveredCharacter) {
        const hoverProgress = Math.min(this.hoverTimer / 0.5, 1);
        const hoverEase = this.easeInOutCubic(hoverProgress);

        const centerX = this.poemData.characters[charIdx].centerX;
        const dx = this.targetPositions[i3] - centerX;
        const dy = this.targetPositions[i3 + 1];
        const dz = this.targetPositions[i3 + 2];

        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;
        const explodeStrength = 0.8 * hoverEase;

        hoverOffsetX = (dx / dist) * explodeStrength;
        hoverOffsetY = (dy / dist) * explodeStrength;
        hoverOffsetZ = (dz / dist) * explodeStrength;
        hoverColorMix = hoverEase;

        if (this.hoverTimer >= 0.5) {
          const recoveryProgress = Math.min((this.hoverTimer - 0.5) / 0.5, 1);
          const recoveryEase = this.easeInOutCubic(recoveryProgress);
          hoverOffsetX *= (1 - recoveryEase);
          hoverOffsetY *= (1 - recoveryEase);
          hoverOffsetZ *= (1 - recoveryEase);
          hoverColorMix *= (1 - recoveryEase);
        }
      }

      let shockOffsetX = 0, shockOffsetY = 0, shockOffsetZ = 0;

      for (const shock of this.shockwaves) {
        const shockProgress = shock.time / shock.duration;
        if (shockProgress >= 1) continue;

        const shockEase = Math.sin(shockProgress * Math.PI);
        const waveRadius = shockProgress * 6.0;

        const px = this.targetPositions[i3] - shock.position.x;
        const py = this.targetPositions[i3 + 1] - shock.position.y;
        const pz = this.targetPositions[i3 + 2] - shock.position.z;

        const dist = Math.sqrt(px * px + py * py + pz * pz);
        const waveWidth = 1.5;
        const waveInfluence = Math.max(0, 1 - Math.abs(dist - waveRadius) / waveWidth);

        if (waveInfluence > 0) {
          const pushStrength = shock.strength * shockEase * waveInfluence;
          shockOffsetX += (px / (dist + 0.01)) * pushStrength;
          shockOffsetY += (py / (dist + 0.01)) * pushStrength;
          shockOffsetZ += (pz / (dist + 0.01)) * pushStrength;
        }
      }

      this.currentPositions[i3] = baseX + hoverOffsetX + shockOffsetX;
      this.currentPositions[i3 + 1] = baseY + hoverOffsetY + shockOffsetY;
      this.currentPositions[i3 + 2] = baseZ + hoverOffsetZ + shockOffsetZ;

      const baseR = this.baseColors[i3];
      const baseG = this.baseColors[i3 + 1];
      const baseB = this.baseColors[i3 + 2];

      this.colors[i3] = baseR + (this.warmColor.r - baseR) * hoverColorMix;
      this.colors[i3 + 1] = baseG + (this.warmColor.g - baseG) * hoverColorMix;
      this.colors[i3 + 2] = baseB + (this.warmColor.b - baseB) * hoverColorMix;
    }

    this.shockwaves = this.shockwaves.filter(s => {
      s.time += deltaTime;
      return s.time < s.duration;
    });

    if (this.hoveredCharacter >= 0 && this.hoverTimer >= 1.0) {
      this.hoveredCharacter = -1;
      this.hoverTimer = 0;
    }

    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;

    const colorAttr = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    colorAttr.needsUpdate = true;

    this.autoTransition();
  }

  private autoTransition(): void {
    if (this.stateTime >= this.stateDuration / this.scatterSpeedMultiplier + this.stateHoldTime) {
      switch (this.state) {
        case 'floating':
          this.state = 'converging';
          break;
        case 'converging':
          this.state = 'scattering';
          this.stateHoldTime = 1.5;
          break;
        case 'scattering':
          this.state = 'floating';
          this.stateHoldTime = 0.5;
          break;
      }
      this.stateTime = 0;
    }
  }

  resize(): void {
    if (this.material) {
      this.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
    }
  }

  dispose(): void {
    if (this.particles) {
      this.scene.remove(this.particles);
    }
    this.geometry?.dispose();
    this.material?.dispose();
  }
}
