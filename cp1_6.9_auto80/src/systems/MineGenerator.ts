export type OreType = 'dirt' | 'coal' | 'iron' | 'gold';

export interface OreConfig {
  color: number;
  hardness: number;
  score: number;
  name: OreType;
}

export interface MineBlock {
  type: OreType;
  x: number;
  y: number;
  width: number;
  height: number;
  config: OreConfig;
  destroyed: boolean;
  sprite?: Phaser.GameObjects.Rectangle;
}

export interface MineLayer {
  blocks: MineBlock[];
  y: number;
  height: number;
}

export const ORE_CONFIGS: Record<OreType, OreConfig> = {
  dirt: { color: 0x8B4513, hardness: 1, score: 1, name: 'dirt' },
  coal: { color: 0x333333, hardness: 3, score: 3, name: 'coal' },
  iron: { color: 0x8B0000, hardness: 5, score: 5, name: 'iron' },
  gold: { color: 0xFFD700, hardness: 4, score: 10, name: 'gold' }
};

const BLOCK_WIDTH = 50;
const LAYER_HEIGHT = 50;
const NUM_LAYERS = 8;

export class MineGenerator {
  private scene: Phaser.Scene;
  private layers: MineLayer[] = [];
  private worldWidth: number;
  private worldHeight: number;
  private blocksPerRow: number = 0;
  private allBlocks: MineBlock[] = [];

  constructor(scene: Phaser.Scene, worldWidth: number, worldHeight: number) {
    this.scene = scene;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
  }

  private selectOreType(): OreType {
    const rand = Math.random();
    if (rand < 0.6) return 'dirt';
    if (rand < 0.8) return 'coal';
    if (rand < 0.95) return 'iron';
    return 'gold';
  }

  generate(): MineBlock[] {
    this.layers = [];
    this.allBlocks = [];

    const mineAreaWidth = this.worldWidth * 0.7;
    const mineStartX = (this.worldWidth - mineAreaWidth) / 2 + 50;
    const mineEndX = this.worldWidth - 80;
    this.blocksPerRow = Math.floor((mineEndX - mineStartX) / BLOCK_WIDTH);

    const mineStartY = this.worldHeight * 0.1;

    for (let layerIdx = 0; layerIdx < NUM_LAYERS; layerIdx++) {
      const layerY = mineStartY + layerIdx * LAYER_HEIGHT;
      const layer: MineLayer = {
        blocks: [],
        y: layerY,
        height: LAYER_HEIGHT
      };

      for (let col = 0; col < this.blocksPerRow; col++) {
        const oreType = this.selectOreType();
        const config = ORE_CONFIGS[oreType];
        const blockX = mineStartX + col * BLOCK_WIDTH;

        const block: MineBlock = {
          type: oreType,
          x: blockX,
          y: layerY,
          width: BLOCK_WIDTH - 2,
          height: LAYER_HEIGHT - 2,
          config,
          destroyed: false
        };

        this.createBlockSprite(block);
        layer.blocks.push(block);
        this.allBlocks.push(block);
      }

      this.layers.push(layer);
    }

    return this.allBlocks;
  }

  private createBlockSprite(block: MineBlock): void {
    const rect = this.scene.add.rectangle(
      block.x + block.width / 2,
      block.y + block.height / 2,
      block.width,
      block.height,
      block.config.color
    );
    rect.setStrokeStyle(2, 0x2C1810);
    rect.setOrigin(0.5);

    if (block.type !== 'dirt') {
      const shine = this.scene.add.circle(
        block.x + block.width * 0.3,
        block.y + block.height * 0.3,
        3,
        0xFFFFFF,
        0.3
      );
      shine.setData('parent', block);
    }

    block.sprite = rect;
  }

  destroyBlock(block: MineBlock): void {
    if (block.destroyed) return;
    block.destroyed = true;
    if (block.sprite) {
      block.sprite.destroy();
    }
  }

  getAllBlocks(): MineBlock[] {
    return this.allBlocks.filter(b => !b.destroyed);
  }

  getLayerHeight(): number {
    return LAYER_HEIGHT;
  }

  getBlockWidth(): number {
    return BLOCK_WIDTH;
  }
}
