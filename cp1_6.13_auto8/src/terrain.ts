import * as THREE from 'three';

class PerlinNoise {
  private perm: number[];

  constructor(seed: number = Math.random() * 10000) {
    this.perm = this.generatePermutation(seed);
  }

  private generatePermutation(seed: number): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = Math.floor((s / 2147483647) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    return [...p, ...p];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise2D(x: number, y: number): number {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = this.fade(xf);
    const v = this.fade(yf);

    const aa = this.perm[this.perm[xi] + yi];
    const ab = this.perm[this.perm[xi] + yi + 1];
    const ba = this.perm[this.perm[xi + 1] + yi];
    const bb = this.perm[this.perm[xi + 1] + yi + 1];

    const x1 = this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u);
    const x2 = this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u);

    return this.lerp(x1, x2, v);
  }

  fbm(x: number, y: number, octaves: number = 5, persistence: number = 0.5, lacunarity: number = 2): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return value / maxValue;
  }
}

export interface TerrainOptions {
  width: number;
  depth: number;
  segmentsX: number;
  segmentsZ: number;
  maxHeight: number;
  minHeight: number;
  noiseScale: number;
  noiseOctaves: number;
}

export class Terrain {
  private mesh: THREE.Mesh;
  private geometry: THREE.PlaneGeometry;
  private material: THREE.MeshBasicMaterial;
  private wireframeMaterial: THREE.LineBasicMaterial;
  private wireframe: THREE.LineSegments;
  private noise: PerlinNoise;
  private options: TerrainOptions;
  private heights: Float32Array;

  constructor(options: Partial<TerrainOptions> = {}) {
    this.options = {
      width: 200,
      depth: 200,
      segmentsX: 99,
      segmentsZ: 99,
      maxHeight: 0,
      minHeight: -100,
      noiseScale: 0.02,
      noiseOctaves: 5,
      ...options
    };

    this.noise = new PerlinNoise(42);
    this.geometry = new THREE.PlaneGeometry(
      this.options.width,
      this.options.depth,
      this.options.segmentsX,
      this.options.segmentsZ
    );
    this.geometry.rotateX(-Math.PI / 2);

    const vertexCount = (this.options.segmentsX + 1) * (this.options.segmentsZ + 1);
    this.heights = new Float32Array(vertexCount);

    this.material = new THREE.MeshBasicMaterial({
      color: 0x0a2a4a,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.receiveShadow = true;

    this.wireframeMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.8
    });

    const wireframeGeo = new THREE.WireframeGeometry(this.geometry);
    this.wireframe = new THREE.LineSegments(wireframeGeo, this.wireframeMaterial);
    this.mesh.add(this.wireframe);

    this.generateTerrain();
    this.updateWireframeColors();
  }

  private generateTerrain(): void {
    const positions = this.geometry.attributes.position;
    const { width, depth, maxHeight, minHeight, noiseScale, noiseOctaves } = this.options;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      const noiseVal = this.noise.fbm(
        (x + width / 2) * noiseScale,
        (z + depth / 2) * noiseScale,
        noiseOctaves,
        0.5,
        2
      );

      const normalizedNoise = (noiseVal + 1) / 2;
      const height = minHeight + normalizedNoise * (maxHeight - minHeight);

      positions.setY(i, height);
      this.heights[i] = height;
    }

    positions.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  private updateWireframeColors(): void {
    const wireframeGeo = this.wireframe.geometry as THREE.BufferGeometry;
    const positions = wireframeGeo.attributes.position;
    const colors = new Float32Array(positions.count * 3);

    const colorDeep = new THREE.Color(0x003366);
    const colorShallow = new THREE.Color(0x00ff88);

    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const t = (y - this.options.minHeight) / (this.options.maxHeight - this.options.minHeight);
      const clampedT = Math.max(0, Math.min(1, t));
      const color = colorDeep.clone().lerp(colorShallow, clampedT);

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    wireframeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.wireframeMaterial.vertexColors = true;
    this.wireframeMaterial.needsUpdate = true;
  }

  getHeightAt(x: number, z: number): number {
    const { width, depth, segmentsX, segmentsZ } = this.options;

    const halfW = width / 2;
    const halfD = depth / 2;

    if (x < -halfW || x > halfW || z < -halfD || z > halfD) {
      return this.options.minHeight;
    }

    const u = (x + halfW) / width;
    const v = (z + halfD) / depth;

    const xi = u * segmentsX;
    const zi = v * segmentsZ;

    const x0 = Math.floor(xi);
    const z0 = Math.floor(zi);
    const x1 = Math.min(x0 + 1, segmentsX);
    const z1 = Math.min(z0 + 1, segmentsZ);

    const xf = xi - x0;
    const zf = zi - z0;

    const idx00 = z0 * (segmentsX + 1) + x0;
    const idx10 = z0 * (segmentsX + 1) + x1;
    const idx01 = z1 * (segmentsX + 1) + x0;
    const idx11 = z1 * (segmentsX + 1) + x1;

    const h00 = this.heights[idx00];
    const h10 = this.heights[idx10];
    const h01 = this.heights[idx01];
    const h11 = this.heights[idx11];

    const h0 = h00 * (1 - xf) + h10 * xf;
    const h1 = h01 * (1 - xf) + h11 * xf;
    const h = h0 * (1 - zf) + h1 * zf;

    return h;
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  getGeometry(): THREE.PlaneGeometry {
    return this.geometry;
  }

  getOptions(): TerrainOptions {
    return { ...this.options };
  }

  update(_deltaTime: number): void {
    this.wireframeMaterial.opacity = 0.7 + Math.sin(Date.now() * 0.001) * 0.1;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.wireframeMaterial.dispose();
    this.wireframe.geometry.dispose();
  }
}
