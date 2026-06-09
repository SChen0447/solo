import * as THREE from 'three';

export type ShapeType = 'torusKnot' | 'sphere' | 'torus';
export type ThemeType = 'aurora' | 'lava' | 'ocean';

interface ColorTheme {
  primary: THREE.Color;
  secondary: THREE.Color;
  accent: THREE.Color;
  emissive: THREE.Color;
  metalness: number;
  roughness: number;
  emissiveIntensity: number;
}

const THEMES: Record<ThemeType, ColorTheme> = {
  aurora: {
    primary: new THREE.Color(0x00ffaa),
    secondary: new THREE.Color(0x0088ff),
    accent: new THREE.Color(0xaa00ff),
    emissive: new THREE.Color(0x0044aa),
    metalness: 0.7,
    roughness: 0.2,
    emissiveIntensity: 0.3,
  },
  lava: {
    primary: new THREE.Color(0xff4400),
    secondary: new THREE.Color(0xff8800),
    accent: new THREE.Color(0xffaa00),
    emissive: new THREE.Color(0x440000),
    metalness: 0.5,
    roughness: 0.3,
    emissiveIntensity: 0.5,
  },
  ocean: {
    primary: new THREE.Color(0x00aaff),
    secondary: new THREE.Color(0x00ffff),
    accent: new THREE.Color(0xffffff),
    emissive: new THREE.Color(0x002244),
    metalness: 0.6,
    roughness: 0.25,
    emissiveIntensity: 0.4,
  },
};

export class ShapeGenerator {
  private mesh: THREE.Mesh;
  private geometry: THREE.BufferGeometry;
  private material: THREE.MeshStandardMaterial;
  private originalPositions: Float32Array;
  private basePositions: Float32Array;
  private targetPositions: Float32Array;
  private morphProgress: number = 1;
  private morphDuration: number = 0.8;
  private isMorphing: boolean = false;
  private currentShape: ShapeType;
  private currentTheme: ThemeType;
  private sensitivity: number = 1.0;
  private time: number = 0;
  private colorProgress: number = 1;
  private colorDuration: number = 1.0;
  private isColorTransitioning: boolean = false;
  private startTheme: ColorTheme;
  private endTheme: ColorTheme;

  constructor(shape: ShapeType = 'torusKnot', theme: ThemeType = 'aurora') {
    this.currentShape = shape;
    this.currentTheme = theme;
    this.startTheme = { ...THEMES[theme] };
    this.endTheme = { ...THEMES[theme] };

    this.geometry = this.createGeometry(shape);
    this.material = this.createMaterial(THEMES[theme]);
    
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    
    const pos = this.geometry.attributes.position.array as Float32Array;
    this.originalPositions = new Float32Array(pos);
    this.basePositions = new Float32Array(pos);
    this.targetPositions = new Float32Array(pos);
  }

  private createGeometry(shape: ShapeType): THREE.BufferGeometry {
    let geometry: THREE.BufferGeometry;

    switch (shape) {
      case 'torusKnot':
        geometry = new THREE.TorusKnotGeometry(2, 0.6, 128, 32);
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(2, 64, 64);
        break;
      case 'torus':
        geometry = new THREE.TorusGeometry(2, 0.5, 32, 128);
        break;
      default:
        geometry = new THREE.TorusKnotGeometry(2, 0.6, 128, 32);
    }

    geometry.computeVertexNormals();
    return geometry;
  }

  private createMaterial(theme: ColorTheme): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: theme.primary.clone(),
      emissive: theme.emissive.clone(),
      metalness: theme.metalness,
      roughness: theme.roughness,
      emissiveIntensity: theme.emissiveIntensity,
      flatShading: false,
    });
  }

  setSensitivity(value: number): void {
    this.sensitivity = Math.max(0.1, Math.min(2.0, value));
  }

  getSensitivity(): number {
    return this.sensitivity;
  }

  setShape(shape: ShapeType): void {
    if (shape === this.currentShape) return;

    const newGeometry = this.createGeometry(shape);
    const newPositions = newGeometry.attributes.position.array as Float32Array;
    const currentPositions = this.geometry.attributes.position.array as Float32Array;

    const targetCount = newPositions.length;
    const currentCount = currentPositions.length;

    if (targetCount !== currentCount) {
      this.geometry.dispose();
      this.geometry = newGeometry;
      this.mesh.geometry = this.geometry;
      
      this.originalPositions = new Float32Array(newPositions);
      this.basePositions = new Float32Array(newPositions);
      this.targetPositions = new Float32Array(newPositions);
      this.morphProgress = 1;
      this.isMorphing = false;
    } else {
      this.basePositions = new Float32Array(currentPositions);
      this.targetPositions = new Float32Array(newPositions);
      this.morphProgress = 0;
      this.isMorphing = true;
      newGeometry.dispose();
    }

    this.currentShape = shape;
    this.geometry.computeVertexNormals();
  }

  setTheme(theme: ThemeType): void {
    if (theme === this.currentTheme) return;

    this.startTheme = this.getCurrentThemeValues();
    this.endTheme = { ...THEMES[theme] };
    this.colorProgress = 0;
    this.isColorTransitioning = true;
    this.currentTheme = theme;
  }

  private getCurrentThemeValues(): ColorTheme {
    return {
      primary: this.material.color.clone(),
      secondary: new THREE.Color(0xffffff),
      accent: new THREE.Color(0xffffff),
      emissive: this.material.emissive.clone(),
      metalness: this.material.metalness,
      roughness: this.material.roughness,
      emissiveIntensity: this.material.emissiveIntensity,
    };
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  getShape(): ShapeType {
    return this.currentShape;
  }

  getTheme(): ThemeType {
    return this.currentTheme;
  }

  update(frequencyBands: number[], deltaTime: number): void {
    this.time += deltaTime;

    if (this.isMorphing) {
      this.morphProgress += deltaTime / this.morphDuration;
      if (this.morphProgress >= 1) {
        this.morphProgress = 1;
        this.isMorphing = false;
        this.originalPositions = new Float32Array(this.targetPositions);
      }
      this.interpolatePositions();
    }

    if (this.isColorTransitioning) {
      this.colorProgress += deltaTime / this.colorDuration;
      if (this.colorProgress >= 1) {
        this.colorProgress = 1;
        this.isColorTransitioning = false;
      }
      this.interpolateColors();
    }

    this.deformGeometry(frequencyBands);
    this.mesh.rotation.y += deltaTime * 0.2;
    this.mesh.rotation.x += deltaTime * 0.1;
  }

  private interpolatePositions(): void {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const t = this.easeInOutCubic(this.morphProgress);

    for (let i = 0; i < positions.length; i++) {
      positions[i] = this.basePositions[i] * (1 - t) + this.targetPositions[i] * t;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  private interpolateColors(): void {
    const t = this.easeInOutCubic(this.colorProgress);

    this.material.color.lerpColors(
      this.startTheme.primary,
      this.endTheme.primary,
      t
    );
    this.material.emissive.lerpColors(
      this.startTheme.emissive,
      this.endTheme.emissive,
      t
    );
    this.material.metalness = this.startTheme.metalness * (1 - t) + this.endTheme.metalness * t;
    this.material.roughness = this.startTheme.roughness * (1 - t) + this.endTheme.roughness * t;
    this.material.emissiveIntensity = this.startTheme.emissiveIntensity * (1 - t) + this.endTheme.emissiveIntensity * t;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private deformGeometry(frequencyBands: number[]): void {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const basePos = this.isMorphing 
      ? this.lerpArray(this.basePositions, this.targetPositions, this.morphProgress)
      : this.originalPositions;

    const [, bass, lowMid, mid, highMid, treble] = frequencyBands;
    const s = this.sensitivity;

    const scale = 1 + bass * 0.3 * s;
    const waveAmplitude = lowMid * 0.5 * s;
    const twistAmount = mid * 0.3 * s;
    const noiseAmount = highMid * 0.2 * s;
    const detailAmount = treble * 0.1 * s;

    for (let i = 0; i < positions.length; i += 3) {
      const x = basePos[i];
      const y = basePos[i + 1];
      const z = basePos[i + 2];

      const length = Math.sqrt(x * x + y * y + z * z) || 1;
      const nx = x / length;
      const ny = y / length;
      const nz = z / length;

      const wave = Math.sin(y * 2 + this.time * 3) * waveAmplitude * 0.5;
      const wave2 = Math.cos(x * 2 + this.time * 2) * waveAmplitude * 0.3;

      const angle = this.time * 0.5 + length * 0.1 * twistAmount;
      const cosT = Math.cos(angle);
      const sinT = Math.sin(angle);
      const twistedX = x * cosT - z * sinT;
      const twistedZ = x * sinT + z * cosT;

      const noise = this.pseudoNoise(x * 10, y * 10, z * 10 + this.time * 5) * noiseAmount;
      const detail = this.pseudoNoise(x * 50, y * 50, z * 50 + this.time * 10) * detailAmount;

      const displacement = (noise + detail) * s;

      positions[i] = (twistedX + nx * displacement * length) * scale + nx * wave * length;
      positions[i + 1] = (y + ny * displacement * length) * scale + ny * wave2 * length;
      positions[i + 2] = (twistedZ + nz * displacement * length) * scale + nz * wave * length;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  private lerpArray(a: Float32Array, b: Float32Array, t: number): Float32Array {
    const result = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) {
      result[i] = a[i] * (1 - t) + b[i] * t;
    }
    return result;
  }

  private pseudoNoise(x: number, y: number, z: number): number {
    const value = Math.sin(x * 1.2345) * Math.cos(y * 2.3456) * Math.sin(z * 3.4567)
                + Math.sin(x * 4.5678) * Math.cos(y * 5.6789) * Math.sin(z * 6.789) * 0.5
                + Math.sin(x * 7.89) * Math.cos(y * 8.901) * Math.sin(z * 9.012) * 0.25;
    return value / 1.75;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
