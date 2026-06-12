import * as THREE from 'three';

export type TerrainPreset = 'mountain' | 'hills';

export interface TerrainOptions {
  preset?: TerrainPreset;
  roughness: number;
  elevationScale: number;
  resolution?: number;
  size?: number;
  seed?: number;
}

export interface TerrainResult {
  geometry: THREE.BufferGeometry;
  heightData: Float32Array;
  resolution: number;
  size: number;
  minHeight: number;
  maxHeight: number;
}

interface Grad {
  x: number;
  y: number;
  z: number;
}

const grad3: Grad[] = [
  { x: 1, y: 1, z: 0 }, { x: -1, y: 1, z: 0 }, { x: 1, y: -1, z: 0 }, { x: -1, y: -1, z: 0 },
  { x: 1, y: 0, z: 1 }, { x: -1, y: 0, z: 1 }, { x: 1, y: 0, z: -1 }, { x: -1, y: 0, z: -1 },
  { x: 0, y: 1, z: 1 }, { x: 0, y: -1, z: 1 }, { x: 0, y: 1, z: -1 }, { x: 0, y: -1, z: -1 }
];

class SimplexNoise {
  private perm: number[];
  private permMod12: number[];

  constructor(seed: number = Math.random()) {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p[i] = Math.floor(seededRandom(seed + i) * 256);
    }
    this.perm = new Array(512);
    this.permMod12 = new Array(512);
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  noise2D(xin: number, yin: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    let n0 = 0, n1 = 0, n2 = 0;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    let i1: number, j1: number;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.permMod12[ii + this.perm[jj]];
    const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
    const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * dot2(grad3[gi0], x0, y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * dot2(grad3[gi1], x1, y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * dot2(grad3[gi2], x2, y2); }
    return 70 * (n0 + n1 + n2);
  }
}

function dot2(g: Grad, x: number, y: number): number {
  return g.x * x + g.y * y;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function fbm(
  noise: SimplexNoise,
  x: number, y: number,
  octaves: number,
  lacunarity: number,
  gain: number,
  baseFreq: number
): number {
  let amplitude = 1;
  let frequency = baseFreq;
  let sum = 0;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amplitude * noise.noise2D(x * frequency, y * frequency);
    norm += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }
  return sum / norm;
}

const GRADIENT_STOPS: Array<[number, THREE.Color]> = [
  [0.0, new THREE.Color(0x00e676)],
  [0.25, new THREE.Color(0x76ff03)],
  [0.45, new THREE.Color(0xffeb3b)],
  [0.65, new THREE.Color(0xff9800)],
  [0.82, new THREE.Color(0xf44336)],
  [1.0, new THREE.Color(0xe91e63)]
];

export function getElevationColor(normalizedHeight: number): THREE.Color {
  const t = Math.max(0, Math.min(1, normalizedHeight));
  for (let i = 0; i < GRADIENT_STOPS.length - 1; i++) {
    const [t0, c0] = GRADIENT_STOPS[i];
    const [t1, c1] = GRADIENT_STOPS[i + 1];
    if (t >= t0 && t <= t1) {
      const k = (t - t0) / (t1 - t0);
      const color = new THREE.Color();
      color.r = c0.r + (c1.r - c0.r) * k;
      color.g = c0.g + (c1.g - c0.g) * k;
      color.b = c0.b + (c1.b - c0.b) * k;
      return color;
    }
  }
  return GRADIENT_STOPS[GRADIENT_STOPS.length - 1][1].clone();
}

interface PresetConfig {
  octaves: number;
  lacunarity: number;
  gain: number;
  baseFreq: number;
  elevationBase: number;
}

const PRESET_CONFIGS: Record<TerrainPreset, PresetConfig> = {
  mountain: {
    octaves: 6,
    lacunarity: 2.0,
    gain: 0.5,
    baseFreq: 0.008,
    elevationBase: 1.0
  },
  hills: {
    octaves: 4,
    lacunarity: 1.8,
    gain: 0.55,
    baseFreq: 0.004,
    elevationBase: 0.5
  }
};

export function createTerrain(options: TerrainOptions): TerrainResult {
  const {
    preset = 'mountain',
    roughness,
    elevationScale,
    resolution = 128,
    size = 200,
    seed = 42
  } = options;

  const config = PRESET_CONFIGS[preset];
  const noise = new SimplexNoise(seed);
  const octaves = Math.max(2, Math.round(config.octaves * roughness));
  const lacunarity = config.lacunarity * (0.8 + roughness * 0.4);
  const gain = config.gain * (1.1 - roughness * 0.2);
  const baseFreq = config.baseFreq * roughness;
  const elevMultiplier = elevationScale * config.elevationBase * 30;

  const geometry = new THREE.PlaneGeometry(size, size, resolution - 1, resolution - 1);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  const heights = new Float32Array(resolution * resolution);
  const colors = new Float32Array(resolutions * resolution * 3);

  let minH = Infinity;
  let maxH = -Infinity;

  for (let idx = 0; idx < positions.count; idx++) {
    const x = positions.getX(idx);
    const z = positions.getZ(idx);
    const nx = x + size / 2;
    const nz = z + size / 2;
    const h = fbm(noise, nx + seed * 100, nz + seed * 200, octaves, lacunarity, gain, baseFreq) * elevMultiplier;
    positions.setY(idx, h);
    const ri = Math.round((nz / size) * (resolution - 1));
    const ci = Math.round((nx / size) * (resolution - 1));
    heights[ri * resolution + ci] = h;
    if (h < minH) minH = h;
    if (h > maxH) maxH = h;
  }

  const range = Math.max(0.0001, maxH - minH);
  for (let idx = 0; idx < positions.count; idx++) {
    const h = positions.getY(idx);
    const t = (h - minH) / range;
    const color = getElevationColor(t);
    colors[idx * 3] = color.r;
    colors[idx * 3 + 1] = color.g;
    colors[idx * 3 + 2] = color.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  return {
    geometry,
    heightData: heights,
    resolution,
    size,
    minHeight: minH,
    maxHeight: maxH
  };
}

export function createContourLines(
  terrain: TerrainResult,
  levelCount: number = 10
): THREE.LineSegments {
  const { heightData, resolution, size, minHeight, maxHeight } = terrain;
  const range = maxHeight - minHeight;
  const step = range / (levelCount + 1);
  const levels: number[] = [];
  for (let i = 1; i <= levelCount; i++) {
    levels.push(minHeight + step * i);
  }

  const positions: number[] = [];
  const colors: number[] = [];
  const halfSize = size / 2;
  const cellSize = size / (resolution - 1);

  for (const level of levels) {
    const t = (level - minHeight) / range;
    const color = getElevationColor(t);

    for (let r = 0; r < resolution - 1; r++) {
      for (let c = 0; c < resolution - 1; c++) {
        const h00 = heightData[r * resolution + c];
        const h10 = heightData[r * resolution + (c + 1)];
        const h01 = heightData[(r + 1) * resolution + c];
        const h11 = heightData[(r + 1) * resolution + (c + 1)];

        const x0 = c * cellSize - halfSize;
        const x1 = (c + 1) * cellSize - halfSize;
        const z0 = r * cellSize - halfSize;
        const z1 = (r + 1) * cellSize - halfSize;

        const idx = (h00 >= level ? 1 : 0) |
                    (h10 >= level ? 2 : 0) |
                    (h11 >= level ? 4 : 0) |
                    (h01 >= level ? 8 : 0);

        if (idx === 0 || idx === 15) continue;

        const lerpXZ = (xStart: number, xEnd: number, zStart: number, zEnd: number, hStart: number, hEnd: number): [number, number] => {
          const t = (level - hStart) / (hEnd - hStart);
          return [xStart + (xEnd - xStart) * t, zStart + (zEnd - zStart) * t];
        };

        const edges: [number, number][] = [];

        if (idx === 1 || idx === 14) {
          const [ax, az] = lerpXZ(x0, x1, z0, z0, h00, h10);
          const [bx, bz] = lerpXZ(x0, x0, z0, z1, h00, h01);
          edges.push([ax, az], [bx, bz]);
        } else if (idx === 2 || idx === 13) {
          const [ax, az] = lerpXZ(x0, x1, z0, z0, h00, h10);
          const [bx, bz] = lerpXZ(x1, x1, z0, z1, h10, h11);
          edges.push([ax, az], [bx, bz]);
        } else if (idx === 3 || idx === 12) {
          const [ax, az] = lerpXZ(x0, x0, z0, z1, h00, h01);
          const [bx, bz] = lerpXZ(x1, x1, z0, z1, h10, h11);
          edges.push([ax, az], [bx, bz]);
        } else if (idx === 4 || idx === 11) {
          const [ax, az] = lerpXZ(x1, x1, z0, z1, h10, h11);
          const [bx, bz] = lerpXZ(x0, x1, z1, z1, h01, h11);
          edges.push([ax, az], [bx, bz]);
        } else if (idx === 5) {
          const [ax, az] = lerpXZ(x0, x1, z0, z0, h00, h10);
          const [bx, bz] = lerpXZ(x1, x1, z0, z1, h10, h11);
          const [cx, cz] = lerpXZ(x0, x0, z0, z1, h00, h01);
          const [dx, dz] = lerpXZ(x0, x1, z1, z1, h01, h11);
          edges.push([ax, az], [bx, bz], [cx, cz], [dx, dz]);
        } else if (idx === 6 || idx === 9) {
          const [ax, az] = lerpXZ(x0, x1, z0, z0, h00, h10);
          const [bx, bz] = lerpXZ(x0, x1, z1, z1, h01, h11);
          edges.push([ax, az], [bx, bz]);
        } else if (idx === 7 || idx === 8) {
          const [ax, az] = lerpXZ(x0, x0, z0, z1, h00, h01);
          const [bx, bz] = lerpXZ(x0, x1, z1, z1, h01, h11);
          edges.push([ax, az], [bx, bz]);
        } else if (idx === 10) {
          const [ax, az] = lerpXZ(x0, x1, z0, z0, h00, h10);
          const [bx, bz] = lerpXZ(x0, x0, z0, z1, h00, h01);
          const [cx, cz] = lerpXZ(x1, x1, z0, z1, h10, h11);
          const [dx, dz] = lerpXZ(x0, x1, z1, z1, h01, h11);
          edges.push([ax, az], [bx, bz], [cx, cz], [dx, dz]);
        }

        for (let k = 0; k < edges.length; k++) {
          positions.push(edges[k][0], level + 0.3, edges[k][1]);
          colors.push(color.r, color.g, color.b);
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    linewidth: 1
  });

  return new THREE.LineSegments(geometry, material);
}

export function getHeightAt(
  terrain: TerrainResult,
  worldX: number,
  worldZ: number
): number | null {
  const { heightData, resolution, size } = terrain;
  const halfSize = size / 2;
  const localX = worldX + halfSize;
  const localZ = worldZ + halfSize;
  if (localX < 0 || localX >= size || localZ < 0 || localZ >= size) return null;
  const cellSize = size / (resolution - 1);
  const fx = localX / cellSize;
  const fz = localZ / cellSize;
  const c0 = Math.floor(fx);
  const r0 = Math.floor(fz);
  const c1 = Math.min(resolution - 1, c0 + 1);
  const r1 = Math.min(resolution - 1, r0 + 1);
  const tx = fx - c0;
  const tz = fz - r0;
  const h00 = heightData[r0 * resolution + c0];
  const h10 = heightData[r0 * resolution + c1];
  const h01 = heightData[r1 * resolution + c0];
  const h11 = heightData[r1 * resolution + c1];
  const h0 = h00 + (h10 - h00) * tx;
  const h1 = h01 + (h11 - h01) * tx;
  return h0 + (h1 - h0) * tz;
}
