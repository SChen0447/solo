import * as THREE from 'three';

export interface BrushParams {
  size: number;
  strength: number;
}

export type PresetType = 'mountain' | 'hills' | 'basin' | 'flat';

interface AnimationState {
  startHeights: Float32Array;
  targetHeights: Float32Array;
  startTime: number;
  duration: number;
}

interface HistoryState {
  heights: Float32Array;
}

const GRID_SIZE = 100;
const TERRAIN_SIZE = 100;
const MAX_HEIGHT = 20;
const ANIMATION_DURATION = 300;
const MAX_UNDO = 5;
const MAX_REDO = 3;

export class TerrainPainter {
  public mesh: THREE.Mesh;
  public geometry: THREE.PlaneGeometry;
  private heights: Float32Array;
  private targetHeights: Float32Array;
  private gridSize: number;
  private terrainSize: number;
  private maxHeight: number;
  private animation: AnimationState | null = null;
  private undoStack: HistoryState[] = [];
  private redoStack: HistoryState[] = [];
  private isPainting = false;
  private lastPaintKey: string | null = null;

  constructor() {
    this.gridSize = GRID_SIZE;
    this.terrainSize = TERRAIN_SIZE;
    this.maxHeight = MAX_HEIGHT;
    this.heights = new Float32Array(this.gridSize * this.gridSize);
    this.targetHeights = new Float32Array(this.gridSize * this.gridSize);
    this.geometry = new THREE.PlaneGeometry(
      this.terrainSize,
      this.terrainSize,
      this.gridSize - 1,
      this.gridSize - 1
    );
    this.geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshStandardMaterial({
      vertexColors: false,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: false,
    });
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = true;
    this.updateMeshFromHeights();
  }

  public getHeights(): Float32Array {
    return this.heights;
  }

  public getGridSize(): number {
    return this.gridSize;
  }

  public getTerrainSize(): number {
    return this.terrainSize;
  }

  public getMaxHeight(): number {
    return this.maxHeight;
  }

  public setMaterial(material: THREE.Material): void {
    this.mesh.material = material;
  }

  public saveHistory(): void {
    const snapshot = new Float32Array(this.heights);
    this.undoStack.push({ heights: snapshot });
    if (this.undoStack.length > MAX_UNDO) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  public undo(): boolean {
    if (this.undoStack.length === 0) return false;
    const current = new Float32Array(this.heights);
    this.redoStack.push({ heights: current });
    if (this.redoStack.length > MAX_REDO) {
      this.redoStack.shift();
    }
    const prev = this.undoStack.pop()!;
    this.animateToHeights(prev.heights);
    return true;
  }

  public redo(): boolean {
    if (this.redoStack.length === 0) return false;
    const current = new Float32Array(this.heights);
    this.undoStack.push({ heights: current });
    if (this.undoStack.length > MAX_UNDO) {
      this.undoStack.shift();
    }
    const next = this.redoStack.pop()!;
    this.animateToHeights(next.heights);
    return true;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public applyPreset(preset: PresetType): void {
    this.saveHistory();
    const newHeights = new Float32Array(this.gridSize * this.gridSize);
    const centerX = this.gridSize / 2;
    const centerY = this.gridSize / 2;

    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const idx = y * this.gridSize + x;
        const dx = (x - centerX) / this.gridSize;
        const dy = (y - centerY) / this.gridSize;
        const dist = Math.sqrt(dx * dx + dy * dy);

        switch (preset) {
          case 'mountain':
            newHeights[idx] = this.mountainHeight(dx, dy, dist);
            break;
          case 'hills':
            newHeights[idx] = this.hillsHeight(x, y);
            break;
          case 'basin':
            newHeights[idx] = this.basinHeight(dist);
            break;
          case 'flat':
          default:
            newHeights[idx] = 0;
        }
      }
    }
    this.animateToHeights(newHeights);
  }

  private mountainHeight(dx: number, dy: number, dist: number): number {
    let h = (1 - dist * 1.5) * this.maxHeight;
    h += Math.sin(dx * 10) * 2;
    h += Math.cos(dy * 10) * 2;
    h += this.noise(dx * 5, dy * 5) * 3;
    return Math.max(0, Math.min(this.maxHeight, h));
  }

  private hillsHeight(x: number, y: number): number {
    let h = 0;
    const scale = 0.08;
    h += Math.sin(x * scale) * Math.cos(y * scale) * 5;
    h += Math.sin(x * scale * 2 + 1) * Math.cos(y * scale * 2 + 0.5) * 3;
    h += this.noise(x * 0.05, y * 0.05) * 4;
    h += 3;
    return Math.max(0, Math.min(this.maxHeight, h));
  }

  private basinHeight(dist: number): number {
    let h = (dist * 1.5 - 0.3) * this.maxHeight * 0.6;
    h += this.noise(dist * 5, dist * 5) * 2;
    return Math.max(0, Math.min(this.maxHeight, h));
  }

  private noise(x: number, y: number): number {
    return (
      Math.sin(x * 12.9898 + y * 78.233) * 43758.5453 % 1 +
      Math.cos(x * 39.346 + y * 11.135) * 24634.6345 % 1
    ) * 0.5;
  }

  public startPainting(): void {
    this.isPainting = true;
    this.lastPaintKey = null;
    this.saveHistory();
    this.targetHeights = new Float32Array(this.heights);
  }

  public stopPainting(): void {
    this.isPainting = false;
    this.lastPaintKey = null;
  }

  public paint(
    worldX: number,
    worldZ: number,
    brush: BrushParams,
    isRaise: boolean
  ): void {
    if (!this.isPainting) return;

    const halfSize = this.terrainSize / 2;
    const gridX = ((worldX + halfSize) / this.terrainSize) * this.gridSize;
    const gridZ = ((worldZ + halfSize) / this.terrainSize) * this.gridSize;
    const brushRadius = brush.size * (this.gridSize / this.terrainSize);

    const key = `${Math.floor(gridX)}-${Math.floor(gridZ)}-${brush.size}-${brush.strength}-${isRaise}`;
    if (key === this.lastPaintKey) return;
    this.lastPaintKey = key;

    const minX = Math.max(0, Math.floor(gridX - brushRadius));
    const maxX = Math.min(this.gridSize - 1, Math.ceil(gridX + brushRadius));
    const minZ = Math.max(0, Math.floor(gridZ - brushRadius));
    const maxZ = Math.min(this.gridSize - 1, Math.ceil(gridZ + brushRadius));

    for (let z = minZ; z <= maxZ; z++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - gridX;
        const dz = z - gridZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > brushRadius) continue;

        const falloff = 1 - dist / brushRadius;
        const weight = falloff * falloff * (3 - 2 * falloff);
        const delta = brush.strength * weight * this.maxHeight * 0.1;

        const idx = z * this.gridSize + x;
        if (isRaise) {
          this.targetHeights[idx] = Math.min(
            this.maxHeight,
            this.targetHeights[idx] + delta
          );
        } else {
          this.targetHeights[idx] = Math.max(
            0,
            this.targetHeights[idx] - delta
          );
        }
      }
    }

    this.heights = new Float32Array(this.targetHeights);
    this.updateMeshFromHeights();
  }

  private animateToHeights(target: Float32Array): void {
    this.animation = {
      startHeights: new Float32Array(this.heights),
      targetHeights: target,
      startTime: performance.now(),
      duration: ANIMATION_DURATION,
    };
  }

  public update(): boolean {
    if (!this.animation) return false;

    const now = performance.now();
    const progress = Math.min(1, (now - this.animation.startTime) / this.animation.duration);
    const eased = this.easeInOutCubic(progress);

    for (let i = 0; i < this.heights.length; i++) {
      this.heights[i] =
        this.animation.startHeights[i] +
        (this.animation.targetHeights[i] - this.animation.startHeights[i]) * eased;
    }

    this.updateMeshFromHeights();

    if (progress >= 1) {
      this.animation = null;
    }
    return true;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private updateMeshFromHeights(): void {
    const positions = this.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = (i % this.gridSize);
      const z = Math.floor(i / this.gridSize);
      const idx = z * this.gridSize + x;
      positions.setY(i, this.heights[idx]);
    }
    positions.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  public getTerrainIntersection(
    raycaster: THREE.Raycaster,
    camera: THREE.Camera,
    mouseNDC: THREE.Vector2
  ): THREE.Intersection | null {
    const intersects = raycaster.intersectObject(this.mesh);
    if (intersects.length > 0) {
      return intersects[0];
    }
    return null;
  }

  public dispose(): void {
    this.geometry.dispose();
    if (Array.isArray(this.mesh.material)) {
      this.mesh.material.forEach((m) => m.dispose());
    } else {
      this.mesh.material.dispose();
    }
  }
}
