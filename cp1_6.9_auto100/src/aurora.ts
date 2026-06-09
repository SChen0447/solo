import * as THREE from 'three';

export interface AuroraConfig {
  intensity: number;
  saturation: number;
}

export interface AuroraModule {
  group: THREE.Group;
  update: (time: number, config: AuroraConfig) => void;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function grad(hash: number, x: number, y: number, z: number): number {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

class SimplePerlin {
  private perm: number[];

  constructor(seed = Math.random() * 10000) {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = Math.floor((s / 2147483647) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    this.perm = new Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  noise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = fade(x);
    const v = fade(y);
    const w = fade(z);
    const A = this.perm[X] + Y;
    const AA = this.perm[A] + Z;
    const AB = this.perm[A + 1] + Z;
    const B = this.perm[X + 1] + Y;
    const BA = this.perm[B] + Z;
    const BB = this.perm[B + 1] + Z;
    return lerp(
      lerp(
        lerp(grad(this.perm[AA], x, y, z), grad(this.perm[BA], x - 1, y, z), u),
        lerp(grad(this.perm[AB], x, y - 1, z), grad(this.perm[BB], x - 1, y - 1, z), u),
        v
      ),
      lerp(
        lerp(grad(this.perm[AA + 1], x, y, z - 1), grad(this.perm[BA + 1], x - 1, y, z - 1), u),
        lerp(grad(this.perm[AB + 1], x, y - 1, z - 1), grad(this.perm[BB + 1], x - 1, y - 1, z - 1), u),
        v
      ),
      w
    );
  }
}

interface AuroraLayerData {
  points: THREE.Points;
  baseX: Float32Array;
  baseZ: Float32Array;
  phase: Float32Array;
  freq: Float32Array;
  verticalPhase: Float32Array;
  centerDist: Float32Array;
  size: Float32Array;
}

function createLayer(
  count: number,
  colorStartStr: string,
  colorEndStr: string,
  baseY: number,
  spread: number
): AuroraLayerData {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const baseX = new Float32Array(count);
  const baseZ = new Float32Array(count);
  const phase = new Float32Array(count);
  const freq = new Float32Array(count);
  const verticalPhase = new Float32Array(count);
  const centerDist = new Float32Array(count);

  const colorStart = new THREE.Color(colorStartStr);
  const colorEnd = new THREE.Color(colorEndStr);

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 18 + 2;
    const bx = Math.cos(angle) * radius;
    const bz = Math.sin(angle) * radius - 5;

    baseX[i] = bx;
    baseZ[i] = bz;
    phase[i] = Math.random() * Math.PI * 2;
    freq[i] = 0.3 + Math.random() * 0.3;
    verticalPhase[i] = Math.random() * Math.PI * 2;
    centerDist[i] = Math.min(1, radius / 20);

    positions[i * 3] = bx;
    positions[i * 3 + 1] = baseY + (Math.random() - 0.5) * 2;
    positions[i * 3 + 2] = bz;

    const t = Math.random();
    const c = colorStart.clone().lerp(colorEnd, t);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;

    sizes[i] = 2 + Math.random() * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 1,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true
  });

  const points = new THREE.Points(geometry, material);
  points.userData = { spread, baseY, colorStart, colorEnd };

  return {
    points,
    baseX,
    baseZ,
    phase,
    freq,
    verticalPhase,
    centerDist,
    size: sizes
  };
}

export function createAurora(): AuroraModule {
  const group = new THREE.Group();
  const perlin = new SimplePerlin();

  const layer1 = createLayer(2000, '#00ff88', '#00ccff', 4, 8);
  const layer2 = createLayer(2000, '#ff66aa', '#aa66ff', 6, 7);
  const layer3 = createLayer(2000, '#ffffaa', '#ffffff', 8, 6);

  const layers: AuroraLayerData[] = [layer1, layer2, layer3];
  layers.forEach((l) => group.add(l.points));

  let noiseOffset = 0;

  const update = (time: number, config: AuroraConfig): void => {
    noiseOffset += 0.01;

    for (let li = 0; li < layers.length; li++) {
      const layer = layers[li];
      const pos = layer.points.geometry.attributes.position as THREE.BufferAttribute;
      const colAttr = layer.points.geometry.attributes.color as THREE.BufferAttribute;
      const mat = layer.points.material as THREE.PointsMaterial;
      const baseY = layer.points.userData.baseY as number;
      const colorStart = layer.points.userData.colorStart as THREE.Color;
      const colorEnd = layer.points.userData.colorEnd as THREE.Color;

      mat.opacity = 0.7 * config.intensity;

      for (let i = 0; i < 2000; i++) {
        const t = time * 0.001;
        const bx = layer.baseX[i];
        const bz = layer.baseZ[i];
        const ph = layer.phase[i];
        const fr = layer.freq[i];
        const vPh = layer.verticalPhase[i];
        const cd = layer.centerDist[i];

        const amp = 3 + (8 - 3) * cd;
        const noiseVal = perlin.noise(bx * 0.1, bz * 0.1, noiseOffset) * amp;
        const waveX = Math.sin(t * fr + ph) * amp * 0.6;
        const waveZ = Math.cos(t * fr * 0.8 + ph * 1.3) * amp * 0.4;

        const x = bx + waveX + noiseVal;
        const z = bz + waveZ;
        const yOffset = Math.sin(t * 0.5 + vPh) * 1.5;
        const y = baseY + yOffset + noiseVal * 0.3;

        pos.setXYZ(i, x, y, z);

        const distFactor = 1 - cd * 0.8;
        const satFactor = Math.max(0, Math.min(1, config.saturation));
        const colorT = 0.5 + 0.5 * Math.sin(t * fr * 0.5 + ph);
        const c = colorStart.clone().lerp(colorEnd, colorT);
        c.lerp(new THREE.Color(0.5, 0.5, 0.5), 1 - satFactor);

        colAttr.setXYZ(i, c.r * distFactor, c.g * distFactor, c.b * distFactor);
      }

      pos.needsUpdate = true;
      colAttr.needsUpdate = true;
    }
  };

  return { group, update };
}
