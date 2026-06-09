import * as THREE from 'three';

export const TERRAIN_RADIUS = 10;
export const BLOCK_SIZE = 1;

export const PRESET_COLORS = [
  new THREE.Color(0xE67E22),
  new THREE.Color(0x27AE60),
  new THREE.Color(0x2980B9),
  new THREE.Color(0x8E44AD),
];

export interface BlockData {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  color: THREE.Color;
  baseY: number;
}

export class TerrainManager {
  scene: THREE.Scene;
  terrain!: THREE.Mesh;
  blocks: Map<string, BlockData>;
  blockGeometry: THREE.BoxGeometry;
  raycaster: THREE.Raycaster;
  mouse: THREE.Vector2;
  camera: THREE.PerspectiveCamera;
  earthquakeActive: boolean;
  earthquakeTime: number;
  earthquakeDurations: Map<string, number>;
  earthquakeOffsets: Map<string, number>;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.blocks = new Map();
    this.blockGeometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.earthquakeActive = false;
    this.earthquakeTime = 0;
    this.earthquakeDurations = new Map();
    this.earthquakeOffsets = new Map();

    this.createTerrain();
  }

  createGraniteTexture(): THREE.Texture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const baseColor = { r: 74, g: 63, b: 53 };
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;

    for (let i = 0; i < size * size; i++) {
      const idx = i * 4;
      const noise = (Math.random() - 0.5) * 30;
      data[idx] = Math.max(0, Math.min(255, baseColor.r + noise));
      data[idx + 1] = Math.max(0, Math.min(255, baseColor.g + noise));
      data[idx + 2] = Math.max(0, Math.min(255, baseColor.b + noise));
      data[idx + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    return texture;
  }

  createTerrain(): void {
    const geometry = new THREE.CircleGeometry(TERRAIN_RADIUS, 64);
    const texture = this.createGraniteTexture();
    const material = new THREE.MeshStandardMaterial({
      color: 0x4A3F35,
      map: texture,
      roughness: 0.85,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    this.terrain = new THREE.Mesh(geometry, material);
    this.terrain.rotation.x = -Math.PI / 2;
    this.terrain.receiveShadow = true;
    this.terrain.name = 'terrain';
    this.scene.add(this.terrain);
  }

  static posKey(x: number, y: number, z: number): string {
    return `${Math.round(x)},${Math.round(y)},${Math.round(z)}`;
  }

  getBlockAt(x: number, y: number, z: number): BlockData | undefined {
    return this.blocks.get(TerrainManager.posKey(x, y, z));
  }

  hasBlockAt(x: number, y: number, z: number): boolean {
    return this.blocks.has(TerrainManager.posKey(x, y, z));
  }

  isWithinBounds(x: number, z: number): boolean {
    return x * x + z * z <= TERRAIN_RADIUS * TERRAIN_RADIUS;
  }

  createBlockMaterial(color: THREE.Color): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.3,
      metalness: 0.6,
      emissive: color.clone().multiplyScalar(0.15),
    });
  }

  createBlockEdges(mesh: THREE.Mesh, color: THREE.Color): THREE.LineSegments {
    const edges = new THREE.EdgesGeometry(this.blockGeometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: color.clone().multiplyScalar(1.5),
      transparent: true,
      opacity: 0.8,
    });
    const lineSegments = new THREE.LineSegments(edges, lineMaterial);
    mesh.add(lineSegments);
    return lineSegments;
  }

  createBlock(
    x: number,
    y: number,
    z: number,
    color: THREE.Color
  ): BlockData | null {
    if (this.hasBlockAt(x, y, z)) return null;
    if (y < 0) return null;
    if (y === 0 && !this.isWithinBounds(x, z)) return null;
    if (y > 0 && !this.isWithinBounds(x, z)) return null;

    const material = this.createBlockMaterial(color);
    const mesh = new THREE.Mesh(this.blockGeometry, material);
    mesh.position.set(
      x * BLOCK_SIZE + BLOCK_SIZE / 2,
      y * BLOCK_SIZE + BLOCK_SIZE / 2,
      z * BLOCK_SIZE + BLOCK_SIZE / 2
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    this.createBlockEdges(mesh, color);
    this.scene.add(mesh);

    const blockData: BlockData = {
      mesh,
      position: new THREE.Vector3(x, y, z),
      color: color.clone(),
      baseY: mesh.position.y,
    };

    this.blocks.set(TerrainManager.posKey(x, y, z), blockData);
    return blockData;
  }

  getRandomPresetColor(): THREE.Color {
    return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)].clone();
  }

  createLightPillar(worldX: number, worldZ: number): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 16, 1, true);
    const material = new THREE.MeshBasicMaterial({
      color: 0xFFD700,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const pillar = new THREE.Mesh(geometry, material);
    pillar.position.set(worldX, 1, worldZ);
    this.scene.add(pillar);

    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xFFD700,
      transparent: true,
      opacity: 0.2,
    });
    const glowGeo = new THREE.CylinderGeometry(0.8, 0.8, 2.2, 16);
    const glow = new THREE.Mesh(glowGeo, glowMat);
    pillar.add(glow);

    return pillar;
  }

  handleClick(event: MouseEvent, container: HTMLElement): THREE.Vector3 | null {
    const rect = container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.terrain);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      return point;
    }
    return null;
  }

  placeSeed(worldPoint: THREE.Vector3): BlockData | null {
    const gx = Math.floor(worldPoint.x / BLOCK_SIZE);
    const gz = Math.floor(worldPoint.z / BLOCK_SIZE);
    const color = this.getRandomPresetColor();
    return this.createBlock(gx, 0, gz, color);
  }

  triggerEarthquake(): void {
    this.earthquakeActive = true;
    this.earthquakeTime = 0;
    this.earthquakeDurations.clear();
    this.earthquakeOffsets.clear();

    this.blocks.forEach((block, key) => {
      this.earthquakeDurations.set(key, 0.8 + Math.random() * 0.4);
      this.earthquakeOffsets.set(key, (Math.random() - 0.5) * 4);
    });
  }

  updateEarthquake(delta: number): boolean {
    if (!this.earthquakeActive) return false;

    this.earthquakeTime += delta;
    const totalDuration = 1.0;

    if (this.earthquakeTime >= totalDuration) {
      this.earthquakeActive = false;
      this.blocks.forEach((block) => {
        block.mesh.position.y = block.baseY;
      });
      return false;
    }

    this.blocks.forEach((block, key) => {
      const duration = this.earthquakeDurations.get(key) || 1.0;
      const offset = this.earthquakeOffsets.get(key) || 0;
      const progress = Math.min(this.earthquakeTime / duration, 1.0);
      const decay = 1.0 - progress;
      const wave = Math.sin(this.earthquakeTime * Math.PI * 1.0) * decay;
      block.mesh.position.y = block.baseY + offset * wave;
    });

    return true;
  }

  getBlockCount(): number {
    return this.blocks.size;
  }

  getAllBlocks(): BlockData[] {
    return Array.from(this.blocks.values());
  }
}
