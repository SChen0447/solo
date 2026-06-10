import * as THREE from 'three';

export class Terrain {
  public mesh: THREE.Mesh;
  public heights: number[][] = [];
  public roughness: number;
  public size: number;
  public segments: number;

  private targetHeights: number[][] = [];
  private animationProgress: number = 1;
  private animationDuration: number = 0.5;
  private geometry: THREE.PlaneGeometry;
  private sourceMarker: THREE.Mesh | null = null;

  constructor(size: number = 10, segments: number = 64, roughness: number = 50) {
    this.size = size;
    this.segments = segments;
    this.roughness = roughness;

    this.geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    this.geometry.rotateX(-Math.PI / 2);

    this.generateHeights();
    this.targetHeights = this.cloneHeights(this.heights);
    this.applyHeightsToGeometry(this.heights);

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.receiveShadow = true;
    this.updateColors();
    this.createSourceMarker();
  }

  private createSourceMarker(): void {
    const highest = this.getHighestPoint();
    const markerGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0xff4500,
      transparent: true,
      opacity: 0.9
    });
    this.sourceMarker = new THREE.Mesh(markerGeo, markerMat);
    this.sourceMarker.position.copy(highest);
    this.sourceMarker.position.y += 0.2;
    this.mesh.add(this.sourceMarker);
  }

  private cloneHeights(src: number[][]): number[][] {
    return src.map(row => [...row]);
  }

  public generateHeights(): void {
    const gridSize = this.segments + 1;
    this.heights = [];
    
    const seed = Math.random() * 10000;
    const scale = 0.15 + (this.roughness / 100) * 0.35;
    const amplitude = 0.5 + (this.roughness / 100) * 2.0;
    const octaves = 3 + Math.floor((this.roughness / 100) * 3);

    for (let i = 0; i < gridSize; i++) {
      this.heights[i] = [];
      for (let j = 0; j < gridSize; j++) {
        let height = 0;
        let freq = 1;
        let amp = 1;
        let maxAmp = 0;

        for (let o = 0; o < octaves; o++) {
          const x = (i / gridSize) * scale * freq + seed;
          const z = (j / gridSize) * scale * freq + seed;
          height += this.valueNoise(x, z) * amp;
          maxAmp += amp;
          amp *= 0.5;
          freq *= 2;
        }

        height = (height / maxAmp) * amplitude;
        
        const centerX = gridSize / 2;
        const centerZ = gridSize / 2;
        const distFromCenter = Math.sqrt((i - centerX) ** 2 + (j - centerZ) ** 2) / (gridSize / 2);
        const volcanoBoost = Math.max(0, 1 - distFromCenter) * 1.5 * (this.roughness / 100 + 0.3);
        height += volcanoBoost;

        this.heights[i][j] = height;
      }
    }
  }

  private valueNoise(x: number, z: number): number {
    const xi = Math.floor(x);
    const zi = Math.floor(z);
    const xf = x - xi;
    const zf = z - zi;

    const v00 = this.hash(xi, zi);
    const v10 = this.hash(xi + 1, zi);
    const v01 = this.hash(xi, zi + 1);
    const v11 = this.hash(xi + 1, zi + 1);

    const u = this.smoothstep(xf);
    const v = this.smoothstep(zf);

    const x1 = this.lerp(v00, v10, u);
    const x2 = this.lerp(v01, v11, u);

    return this.lerp(x1, x2, v) * 2 - 1;
  }

  private hash(x: number, z: number): number {
    let n = x * 374761393 + z * 668265263;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) >>> 0) / 4294967295;
  }

  private smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private applyHeightsToGeometry(heights: number[][]): void {
    const positions = this.geometry.attributes.position;
    const gridSize = this.segments + 1;

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const idx = i * gridSize + j;
        positions.setY(idx, heights[i][j]);
      }
    }

    positions.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  public updateRoughness(roughness: number): void {
    this.roughness = roughness;
    this.generateHeights();
    this.targetHeights = this.cloneHeights(this.heights);
    this.animationProgress = 0;
  }

  public update(deltaTime: number): void {
    if (this.animationProgress < 1) {
      this.animationProgress = Math.min(1, this.animationProgress + deltaTime / this.animationDuration);
      const t = this.smoothstep(this.animationProgress);
      
      const gridSize = this.segments + 1;
      const positions = this.geometry.attributes.position;

      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          const idx = i * gridSize + j;
          const currentY = positions.getY(idx);
          const targetY = this.targetHeights[i][j];
          const newY = this.lerp(currentY, targetY, t);
          positions.setY(idx, newY);
          this.heights[i][j] = newY;
        }
      }

      positions.needsUpdate = true;
      this.geometry.computeVertexNormals();
      this.updateColors();

      if (this.sourceMarker) {
        const highest = this.getHighestPoint();
        this.sourceMarker.position.lerp(highest, t);
        this.sourceMarker.position.y += 0.2;
      }
    }
  }

  private updateColors(): void {
    const colors: number[] = [];
    const gridSize = this.segments + 1;
    const positions = this.geometry.attributes.position;

    let minH = Infinity;
    let maxH = -Infinity;
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const h = positions.getY(i * gridSize + j);
        minH = Math.min(minH, h);
        maxH = Math.max(maxH, h);
      }
    }

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const h = positions.getY(i * gridSize + j);
        const normalized = maxH === minH ? 0.5 : (h - minH) / (maxH - minH);
        const color = this.colorForElevation(normalized);
        colors.push(color.r, color.g, color.b);
      }
    }

    this.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  }

  private colorForElevation(normalized: number): THREE.Color {
    const stops = [
      { t: 0.0, color: new THREE.Color(0x1a4d1a) },
      { t: 0.2, color: new THREE.Color(0x2d6b2d) },
      { t: 0.4, color: new THREE.Color(0x6b8e23) },
      { t: 0.55, color: new THREE.Color(0x9acd32) },
      { t: 0.7, color: new THREE.Color(0xd2b48c) },
      { t: 0.85, color: new THREE.Color(0xa0522d) },
      { t: 1.0, color: new THREE.Color(0x8b4513) }
    ];

    for (let i = 0; i < stops.length - 1; i++) {
      if (normalized >= stops[i].t && normalized <= stops[i + 1].t) {
        const t = (normalized - stops[i].t) / (stops[i + 1].t - stops[i].t);
        return stops[i].color.clone().lerp(stops[i + 1].color, t);
      }
    }

    return stops[stops.length - 1].color.clone();
  }

  public getHeightAt(worldX: number, worldZ: number): number {
    const half = this.size / 2;
    const x = ((worldX + half) / this.size) * this.segments;
    const z = ((worldZ + half) / this.size) * this.segments;

    const xi = Math.max(0, Math.min(this.segments - 1, Math.floor(x)));
    const zi = Math.max(0, Math.min(this.segments - 1, Math.floor(z)));
    const xf = x - xi;
    const zf = z - zi;

    const h00 = this.heights[xi][zi];
    const h10 = this.heights[xi + 1][zi];
    const h01 = this.heights[xi][zi + 1];
    const h11 = this.heights[xi + 1][zi + 1];

    const h1 = this.lerp(h00, h10, xf);
    const h2 = this.lerp(h01, h11, xf);

    return this.lerp(h1, h2, zf);
  }

  public getSlopeAt(worldX: number, worldZ: number): number {
    const eps = 0.05;
    const hLeft = this.getHeightAt(worldX - eps, worldZ);
    const hRight = this.getHeightAt(worldX + eps, worldZ);
    const hBack = this.getHeightAt(worldX, worldZ - eps);
    const hFront = this.getHeightAt(worldX, worldZ + eps);

    const dx = (hRight - hLeft) / (2 * eps);
    const dz = (hFront - hBack) / (2 * eps);

    return Math.sqrt(dx * dx + dz * dz);
  }

  public getGradientDirection(worldX: number, worldZ: number): THREE.Vector2 {
    const eps = 0.05;
    const hLeft = this.getHeightAt(worldX - eps, worldZ);
    const hRight = this.getHeightAt(worldX + eps, worldZ);
    const hBack = this.getHeightAt(worldX, worldZ - eps);
    const hFront = this.getHeightAt(worldX, worldZ + eps);

    const dx = (hRight - hLeft) / (2 * eps);
    const dz = (hFront - hBack) / (2 * eps);

    return new THREE.Vector2(-dx, -dz).normalize();
  }

  public getHighestPoint(): THREE.Vector3 {
    let maxH = -Infinity;
    let maxI = 0;
    let maxJ = 0;
    const gridSize = this.segments + 1;

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        if (this.heights[i][j] > maxH) {
          maxH = this.heights[i][j];
          maxI = i;
          maxJ = j;
        }
      }
    }

    const half = this.size / 2;
    const x = (maxI / this.segments) * this.size - half;
    const z = (maxJ / this.segments) * this.size - half;

    return new THREE.Vector3(x, maxH, z);
  }

  public reset(): void {
    this.generateHeights();
    this.targetHeights = this.cloneHeights(this.heights);
    this.animationProgress = 0;
  }
}
