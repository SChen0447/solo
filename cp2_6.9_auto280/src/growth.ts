import * as THREE from 'three';
import { TerrainManager, BlockData } from './terrain';

export interface ColorBias {
  red: boolean;
  green: boolean;
  blue: boolean;
}

export interface GrowthConfig {
  speed: number;
  maxBlocks: number;
  colorBias: ColorBias;
}

const DIRECTIONS = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, -1),
];

export class GrowthSystem {
  terrain: TerrainManager;
  config: GrowthConfig;
  private growthTimer: number;
  private lastGrowthTime: number;
  public onMaxBlocksReached: (() => void) | null;
  private isStopped: boolean;

  constructor(terrain: TerrainManager) {
    this.terrain = terrain;
    this.config = {
      speed: 0.8,
      maxBlocks: 200,
      colorBias: { red: false, green: false, blue: false },
    };
    this.growthTimer = 0;
    this.lastGrowthTime = 0;
    this.onMaxBlocksReached = null;
    this.isStopped = false;
  }

  setSpeed(speed: number): void {
    this.config.speed = Math.max(0.3, Math.min(2.0, speed));
  }

  setMaxBlocks(max: number): void {
    this.config.maxBlocks = Math.max(50, Math.min(500, max));
    if (this.terrain.getBlockCount() < this.config.maxBlocks) {
      this.isStopped = false;
    }
  }

  setColorBias(bias: ColorBias): void {
    this.config.colorBias = { ...bias };
  }

  applyColorBias(color: THREE.Color): THREE.Color {
    const result = color.clone();
    if (this.config.colorBias.red) {
      result.r = Math.min(1, result.r * 1.5);
    }
    if (this.config.colorBias.green) {
      result.g = Math.min(1, result.g * 1.5);
    }
    if (this.config.colorBias.blue) {
      result.b = Math.min(1, result.b * 1.5);
    }
    return result;
  }

  colorDifference(c1: THREE.Color, c2: THREE.Color): number {
    const dr = (c1.r - c2.r) * 255;
    const dg = (c1.g - c2.g) * 255;
    const db = (c1.b - c2.b) * 255;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  mixColors(parentColor: THREE.Color, neighborColor: THREE.Color): THREE.Color {
    const diff = this.colorDifference(parentColor, neighborColor);
    if (diff > 20) {
      const result = new THREE.Color();
      result.r = parentColor.r * 0.7 + neighborColor.r * 0.3;
      result.g = parentColor.g * 0.7 + neighborColor.g * 0.3;
      result.b = parentColor.b * 0.7 + neighborColor.b * 0.3;
      return result;
    }
    return Math.random() < 0.7 ? parentColor.clone() : neighborColor.clone();
  }

  getNeighborColors(block: BlockData): THREE.Color[] {
    const colors: THREE.Color[] = [];
    for (const dir of DIRECTIONS) {
      const nx = block.position.x + dir.x;
      const ny = block.position.y + dir.y;
      const nz = block.position.z + dir.z;
      const neighbor = this.terrain.getBlockAt(nx, ny, nz);
      if (neighbor) {
        colors.push(neighbor.color);
      }
    }
    return colors;
  }

  getEmptyNeighbors(block: BlockData): THREE.Vector3[] {
    const empty: THREE.Vector3[] = [];
    for (const dir of DIRECTIONS) {
      const nx = block.position.x + dir.x;
      const ny = block.position.y + dir.y;
      const nz = block.position.z + dir.z;

      if (!this.terrain.hasBlockAt(nx, ny, nz) && ny >= 0) {
        if (ny === 0 || this.terrain.hasBlockAt(nx, ny - 1, nz)) {
          if (this.terrain.isWithinBounds(nx, nz)) {
            empty.push(new THREE.Vector3(nx, ny, nz));
          }
        }
      }
    }
    return empty;
  }

  growBlock(block: BlockData): boolean {
    if (this.terrain.getBlockCount() >= this.config.maxBlocks) {
      this.isStopped = true;
      if (this.onMaxBlocksReached) {
        this.onMaxBlocksReached();
      }
      return false;
    }

    const emptySpots = this.getEmptyNeighbors(block);
    if (emptySpots.length === 0) return false;

    const spot = emptySpots[Math.floor(Math.random() * emptySpots.length)];
    const neighborColors = this.getNeighborColors(block);

    let newColor: THREE.Color;
    if (neighborColors.length > 0 && Math.random() < 0.5) {
      const randomNeighbor = neighborColors[Math.floor(Math.random() * neighborColors.length)];
      newColor = this.mixColors(block.color, randomNeighbor);
    } else {
      newColor = block.color.clone();
    }

    newColor = this.applyColorBias(newColor);
    const created = this.terrain.createBlock(spot.x, spot.y, spot.z, newColor);
    return created !== null;
  }

  update(delta: number): void {
    if (this.isStopped) return;
    if (this.terrain.getBlockCount() === 0) return;

    this.growthTimer += delta;

    if (this.growthTimer >= this.config.speed) {
      this.growthTimer = 0;
      const blocks = this.terrain.getAllBlocks();
      const shuffled = blocks.sort(() => Math.random() - 0.5);
      const blocksToGrow = Math.min(shuffled.length, Math.ceil(shuffled.length * 0.3));

      for (let i = 0; i < blocksToGrow; i++) {
        if (this.terrain.getBlockCount() >= this.config.maxBlocks) {
          this.isStopped = true;
          if (this.onMaxBlocksReached) {
            this.onMaxBlocksReached();
          }
          break;
        }
        this.growBlock(shuffled[i]);
      }
    }
  }

  reset(): void {
    this.growthTimer = 0;
    this.isStopped = false;
  }
}
