import * as THREE from 'three';

interface HSV {
  h: number;
  s: number;
  v: number;
}

const DEFAULT_HSV: HSV = { h: 180, s: 0.75, v: 0.6 };
const GRID_SIZE = 27;
const CUBE_SIZE = 6;
const SPHERE_RADIUS = 0.15;
const PULSE_MIN = 0.12;
const PULSE_MAX = 0.2;
const PULSE_PERIOD = 2;
const LINE_STEP = 2;
const LINE_OPACITY = 0.15;
const COLOR_TRANSITION_DURATION = 0.3;
const FADE_IN_DURATION = 2;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hsvToRgb(h: number, s: number, v: number): THREE.Color {
  const color = new THREE.Color();
  color.setHSL(h / 360, s, v);
  return color;
}

export class ColorCube {
  private scene: THREE.Scene;
  private gridSize = GRID_SIZE;
  private cubeSize = CUBE_SIZE;
  private cellSize: number;

  public spheres!: THREE.InstancedMesh;
  public lines!: THREE.LineSegments;

  private baseHsv: HSV = { ...DEFAULT_HSV };
  private targetHsv: HSV = { ...DEFAULT_HSV };
  private transitionProgress = 1;

  private phases!: Float32Array;
  private baseHues!: Float32Array;
  private baseSats!: Float32Array;
  private baseVals!: Float32Array;

  private sphereGeometry!: THREE.SphereGeometry;
  private dummy: THREE.Object3D;
  private tempColor: THREE.Color;

  private totalSpheres: number;
  private startTime: number;
  private linesVisible: boolean = true;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.cellSize = CUBE_SIZE / (GRID_SIZE - 1);
    this.totalSpheres = GRID_SIZE * GRID_SIZE * GRID_SIZE;
    this.dummy = new THREE.Object3D();
    this.tempColor = new THREE.Color();
    this.startTime = performance.now();
    this.initLattice();
  }

  private initLattice(): void {
    this.sphereGeometry = new THREE.SphereGeometry(SPHERE_RADIUS, 8, 6);

    const sphereMaterial = new THREE.MeshStandardMaterial({
      metalness: 0.3,
      roughness: 0.5,
      transparent: true,
      opacity: 0
    });

    this.spheres = new THREE.InstancedMesh(
      this.sphereGeometry,
      sphereMaterial,
      this.totalSpheres
    );
    this.spheres.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(this.totalSpheres * 3),
      3
    );

    this.phases = new Float32Array(this.totalSpheres);
    this.baseHues = new Float32Array(this.totalSpheres);
    this.baseSats = new Float32Array(this.totalSpheres);
    this.baseVals = new Float32Array(this.totalSpheres);

    let index = 0;
    const half = (GRID_SIZE - 1) / 2;

    for (let z = 0; z < GRID_SIZE; z++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const px = (x - half) * this.cellSize;
          const py = (y - half) * this.cellSize;
          const pz = (z - half) * this.cellSize;

          this.dummy.position.set(px, py, pz);
          this.dummy.scale.setScalar(1);
          this.dummy.updateMatrix();
          this.spheres.setMatrixAt(index, this.dummy.matrix);

          this.baseHues[index] = (x / (GRID_SIZE - 1)) * 360;
          this.baseSats[index] = y / (GRID_SIZE - 1);
          this.baseVals[index] = z / (GRID_SIZE - 1);

          this.phases[index] = Math.random() * Math.PI * 2;

          const color = this.computeColor(index, this.baseHsv);
          this.spheres.setColorAt(index, color);

          index++;
        }
      }
    }

    this.spheres.instanceMatrix.needsUpdate = true;
    if (this.spheres.instanceColor) {
      this.spheres.instanceColor.needsUpdate = true;
    }
    this.scene.add(this.spheres);

    this.buildLines();
  }

  private buildLines(): void {
    const positions: number[] = [];
    const colors: number[] = [];
    const half = (GRID_SIZE - 1) / 2;
    const sampleStep = LINE_STEP;

    for (let z = 0; z < GRID_SIZE; z += sampleStep) {
      for (let y = 0; y < GRID_SIZE; y += sampleStep) {
        for (let x = 0; x < GRID_SIZE - sampleStep; x += sampleStep) {
          this.addLineSegment(x, y, z, x + sampleStep, y, z, half, positions, colors);
        }
      }
    }

    for (let z = 0; z < GRID_SIZE; z += sampleStep) {
      for (let x = 0; x < GRID_SIZE; x += sampleStep) {
        for (let y = 0; y < GRID_SIZE - sampleStep; y += sampleStep) {
          this.addLineSegment(x, y, z, x, y + sampleStep, z, half, positions, colors);
        }
      }
    }

    for (let x = 0; x < GRID_SIZE; x += sampleStep) {
      for (let y = 0; y < GRID_SIZE; y += sampleStep) {
        for (let z = 0; z < GRID_SIZE - sampleStep; z += sampleStep) {
          this.addLineSegment(x, y, z, x, y, z + sampleStep, half, positions, colors);
        }
      }
    }

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: LINE_OPACITY
    });

    this.lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    this.scene.add(this.lines);
  }

  private addLineSegment(
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    half: number,
    positions: number[],
    colors: number[]
  ): void {
    const cs = this.cellSize;
    positions.push(
      (x1 - half) * cs, (y1 - half) * cs, (z1 - half) * cs,
      (x2 - half) * cs, (y2 - half) * cs, (z2 - half) * cs
    );

    const idx1 = x1 + y1 * GRID_SIZE + z1 * GRID_SIZE * GRID_SIZE;
    const idx2 = x2 + y2 * GRID_SIZE + z2 * GRID_SIZE * GRID_SIZE;

    const hue1 = (this.baseHues[idx1] + this.baseHsv.h) % 360;
    const sat1 = clamp(this.baseSats[idx1] * this.baseHsv.s, 0, 1);
    const val1 = clamp(this.baseVals[idx1] * this.baseHsv.v, 0, 1);
    const hue2 = (this.baseHues[idx2] + this.baseHsv.h) % 360;
    const sat2 = clamp(this.baseSats[idx2] * this.baseHsv.s, 0, 1);
    const val2 = clamp(this.baseVals[idx2] * this.baseHsv.v, 0, 1);

    const c1 = hsvToRgb(hue1, sat1, val1);
    const c2 = hsvToRgb(hue2, sat2, val2);

    const avgR = (c1.r + c2.r) / 2;
    const avgG = (c1.g + c2.g) / 2;
    const avgB = (c1.b + c2.b) / 2;

    colors.push(avgR, avgG, avgB, avgR, avgG, avgB);
  }

  private computeColor(index: number, hsv: HSV, timeOffset: number = 0): THREE.Color {
    const hueShift = Math.sin(timeOffset * 2 + this.phases[index]) * 5;
    const hue = (this.baseHues[index] + hsv.h + hueShift + 360) % 360;
    const sat = clamp(this.baseSats[index] * hsv.s, 0, 1);
    const val = clamp(this.baseVals[index] * hsv.v, 0, 1);
    return hsvToRgb(hue, sat, val);
  }

  public updateHsv(h: number, s: number, v: number): void {
    this.targetHsv = { h, s, v };
    this.transitionProgress = 0;
  }

  public getCurrentHsv(): HSV {
    return { ...this.baseHsv };
  }

  public getCurrentRgb(): { r: number; g: number; b: number } {
    const color = hsvToRgb(this.baseHsv.h, this.baseHsv.s, this.baseHsv.v);
    return {
      r: Math.round(color.r * 255),
      g: Math.round(color.g * 255),
      b: Math.round(color.b * 255)
    };
  }

  public toggleLines(visible: boolean): void {
    this.linesVisible = visible;
    this.lines.visible = visible;
  }

  public isLinesVisible(): boolean {
    return this.linesVisible;
  }

  public reset(): void {
    this.updateHsv(DEFAULT_HSV.h, DEFAULT_HSV.s, DEFAULT_HSV.v);
  }

  public animate(currentTime: number): void {
    const elapsed = (currentTime - this.startTime) / 1000;

    const fadeProgress = clamp(elapsed / FADE_IN_DURATION, 0, 1);
    const material = this.spheres.material as THREE.MeshStandardMaterial;
    material.opacity = fadeProgress;
    const lineMat = this.lines.material as THREE.LineBasicMaterial;
    lineMat.opacity = this.linesVisible ? LINE_OPACITY * fadeProgress : 0;

    if (this.transitionProgress < 1) {
      this.transitionProgress = clamp(
        this.transitionProgress + (1 / 60) / COLOR_TRANSITION_DURATION,
        0,
        1
      );
      const t = this.transitionProgress;
      this.baseHsv.h = lerp(this.baseHsv.h, this.targetHsv.h, t);
      this.baseHsv.s = lerp(this.baseHsv.s, this.targetHsv.s, t);
      this.baseHsv.v = lerp(this.baseHsv.v, this.targetHsv.v, t);
    }

    const pulseFreq = (Math.PI * 2) / PULSE_PERIOD;

    for (let i = 0; i < this.totalSpheres; i++) {
      const pulsePhase = this.phases[i];
      const pulse = (Math.sin(elapsed * pulseFreq + pulsePhase) + 1) / 2;
      const scale = PULSE_MIN + pulse * (PULSE_MAX - PULSE_MIN);

      const half = (GRID_SIZE - 1) / 2;
      const x = i % GRID_SIZE;
      const y = Math.floor(i / GRID_SIZE) % GRID_SIZE;
      const z = Math.floor(i / (GRID_SIZE * GRID_SIZE));

      this.dummy.position.set(
        (x - half) * this.cellSize,
        (y - half) * this.cellSize,
        (z - half) * this.cellSize
      );
      this.dummy.scale.setScalar(scale / SPHERE_RADIUS);
      this.dummy.updateMatrix();
      this.spheres.setMatrixAt(i, this.dummy.matrix);

      const color = this.computeColor(i, this.baseHsv, elapsed);
      this.spheres.setColorAt(i, color);
    }

    this.spheres.instanceMatrix.needsUpdate = true;
    if (this.spheres.instanceColor) {
      this.spheres.instanceColor.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.sphereGeometry.dispose();
    (this.spheres.material as THREE.Material).dispose();
    this.lines.geometry.dispose();
    (this.lines.material as THREE.Material).dispose();
    this.scene.remove(this.spheres);
    this.scene.remove(this.lines);
  }
}
