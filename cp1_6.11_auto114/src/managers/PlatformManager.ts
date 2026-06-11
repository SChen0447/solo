import Phaser from 'phaser';
import { PlatformData } from '../types';

const MAX_PLATFORMS = 30;
const PLATFORM_HEIGHT = 20;
const PLATFORM_LAYERS = [500, 400, 300];
const MIN_WIDTH = 120;
const MAX_WIDTH = 250;
const MIN_GAP = 80;
const MAX_GAP = 150;
const GAP_CHANCE = 0.3;
const MIN_BREAK_GAP = 50;
const MAX_BREAK_GAP = 80;

export interface PlatformObject {
  data: PlatformData;
  graphics: Phaser.GameObjects.Graphics;
  body?: Phaser.Physics.Arcade.Body;
}

export class PlatformManager {
  private scene: Phaser.Scene;
  private platforms: PlatformObject[] = [];
  private difficulty: number;
  private lastPlatformX: number = 0;
  private scrollSpeed: number = 300;
  private neonOffset: number = 0;

  constructor(scene: Phaser.Scene, difficulty: number = 1) {
    this.scene = scene;
    this.difficulty = difficulty;
  }

  init(startX: number = 0): void {
    this.platforms = [];
    this.lastPlatformX = startX;

    const firstPlatform: PlatformData = {
      x: startX,
      y: PLATFORM_LAYERS[0],
      width: 400,
      height: PLATFORM_HEIGHT,
      layer: 0,
      hasGap: false
    };
    this.createPlatformObject(firstPlatform);
    this.lastPlatformX = startX + 400;

    for (let i = 0; i < 10; i++) {
      this.generateNextPlatform();
    }
  }

  setScrollSpeed(speed: number): void {
    this.scrollSpeed = speed;
  }

  setDifficulty(difficulty: number): void {
    this.difficulty = difficulty;
  }

  getPlatforms(): PlatformObject[] {
    return this.platforms;
  }

  update(delta: number, speedMultiplier: number = 1): void {
    const moveAmount = (this.scrollSpeed * speedMultiplier * delta) / 1000;
    this.neonOffset += delta * 0.05;

    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const platform = this.platforms[i];
      platform.data.x -= moveAmount;

      if (platform.body) {
        platform.body.position.x = platform.data.x;
        platform.body.position.y = platform.data.y;
      }

      this.redrawPlatform(platform);

      if (platform.data.x + platform.data.width < -100) {
        this.destroyPlatform(platform);
        this.platforms.splice(i, 1);
      }
    }

    while (this.platforms.length < MAX_PLATFORMS) {
      const rightMost = this.getRightmostX();
      if (rightMost < this.scene.scale.width + 500) {
        this.generateNextPlatform();
      } else {
        break;
      }
    }
  }

  private getRightmostX(): number {
    let maxX = 0;
    for (const p of this.platforms) {
      const right = p.data.x + p.data.width;
      if (right > maxX) maxX = right;
    }
    return maxX;
  }

  private generateNextPlatform(): void {
    const gapReduction = this.difficulty > 1 ? 0.7 : 1;
    const gap = Phaser.Math.Between(MIN_GAP, MAX_GAP) * gapReduction;
    const width = Phaser.Math.Between(MIN_WIDTH, MAX_WIDTH);
    const layerIndex = Phaser.Math.Between(0, 2);
    const y = PLATFORM_LAYERS[layerIndex];

    const hasGap = Math.random() < GAP_CHANCE;
    let gapStart: number | undefined;
    let gapWidth: number | undefined;

    if (hasGap && width > MIN_BREAK_GAP + 60) {
      gapWidth = Phaser.Math.Between(MIN_BREAK_GAP, MAX_BREAK_GAP);
      gapStart = Phaser.Math.Between(30, width - gapWidth - 30);
    }

    const data: PlatformData = {
      x: this.lastPlatformX + gap,
      y,
      width,
      height: PLATFORM_HEIGHT,
      layer: layerIndex,
      hasGap,
      gapStart,
      gapWidth
    };

    this.createPlatformObject(data);
    this.lastPlatformX = data.x + width;
  }

  private createPlatformObject(data: PlatformData): void {
    const graphics = this.scene.add.graphics();
    const platform: PlatformObject = { data, graphics };

    if (data.hasGap && data.gapStart !== undefined && data.gapWidth !== undefined) {
      const leftWidth = data.gapStart;
      const rightX = data.x + data.gapStart + data.gapWidth;
      const rightWidth = data.width - data.gapStart - data.gapWidth;

      const leftBody = this.scene.physics.add.staticBody(data.x, data.y, leftWidth, data.height);
      const rightBody = this.scene.physics.add.staticBody(rightX, data.y, rightWidth, data.height);
      platform.body = leftBody;
    } else {
      const body = this.scene.physics.add.staticBody(data.x, data.y, data.width, data.height);
      platform.body = body;
    }

    this.redrawPlatform(platform);
    this.platforms.push(platform);
  }

  private redrawPlatform(platform: PlatformObject): void {
    const { x, y, width, height, hasGap, gapStart, gapWidth } = platform.data;
    platform.graphics.clear();

    platform.graphics.fillStyle(0x1a1a2e, 1);
    platform.graphics.fillRect(x, y, width, height);

    platform.graphics.fillStyle(0x2a2a4e, 1);
    platform.graphics.fillRect(x, y, width, 4);

    this.drawNeonStrips(platform.graphics, x, y, width, height, hasGap, gapStart, gapWidth);

    platform.graphics.lineStyle(1, 0xff6b9d, 0.5);
    platform.graphics.strokeRect(x, y, width, height);
  }

  private drawNeonStrips(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    hasGap: boolean,
    gapStart?: number,
    gapWidth?: number
  ): void {
    const stripWidth = 4;
    let offset = (this.neonOffset * 50) % 20;
    const colors = [0xff6b9d, 0x00d4ff];
    let colorIndex = 0;

    const segments: { start: number; end: number }[] = [];

    if (hasGap && gapStart !== undefined && gapWidth !== undefined) {
      segments.push({ start: x, end: x + gapStart });
      segments.push({ start: x + gapStart + gapWidth, end: x + width });
    } else {
      segments.push({ start: x, end: x + width });
    }

    for (const seg of segments) {
      let pos = seg.start - offset;
      let idx = Math.floor((offset) / stripWidth) % 2;

      while (pos < seg.end) {
        const stripX = Math.max(pos, seg.start);
        const stripEnd = Math.min(pos + stripWidth, seg.end);
        const actualWidth = stripEnd - stripX;

        if (actualWidth > 0) {
          graphics.fillStyle(colors[idx % 2], 0.8);
          graphics.fillRect(stripX, y - 2, actualWidth, 2);
        }

        pos += stripWidth;
        idx++;
      }
    }
  }

  private destroyPlatform(platform: PlatformObject): void {
    platform.graphics.destroy();
    if (platform.body) {
      const world = this.scene.physics.world as Phaser.Physics.Arcade.World;
      world.remove(platform.body);
    }
  }

  destroy(): void {
    for (const platform of this.platforms) {
      this.destroyPlatform(platform);
    }
    this.platforms = [];
  }

  checkPlatformCollision(playerX: number, playerY: number, playerWidth: number, playerHeight: number): {
    onGround: boolean;
    groundY: number;
  } {
    let onGround = false;
    let groundY = Number.MAX_VALUE;

    for (const platform of this.platforms) {
      const { x, y, width, height, hasGap, gapStart, gapWidth } = platform.data;

      const playerRight = playerX + playerWidth;
      const playerBottom = playerY + playerHeight;

      if (playerRight > x && playerX < x + width) {
        if (hasGap && gapStart !== undefined && gapWidth !== undefined) {
          const gapX1 = x + gapStart;
          const gapX2 = gapX1 + gapWidth;
          if (playerRight > gapX1 && playerX < gapX2) {
            continue;
          }
        }

        if (playerBottom >= y && playerBottom <= y + height + 20) {
          if (y < groundY) {
            groundY = y;
            onGround = true;
          }
        }
      }
    }

    return { onGround, groundY };
  }

  findNearestPlatformEdge(targetX: number, targetY: number, maxDistance: number): {
    x: number;
    y: number;
    distance: number;
  } | null {
    let nearest: { x: number; y: number; distance: number } | null = null;

    for (const platform of this.platforms) {
      const { x, y, width, hasGap, gapStart, gapWidth } = platform.data;

      const edges: { ex: number; ey: number }[] = [];

      if (hasGap && gapStart !== undefined && gapWidth !== undefined) {
        edges.push({ ex: x, ey: y });
        edges.push({ ex: x + gapStart, ey: y });
        edges.push({ ex: x + gapStart + gapWidth, ey: y });
        edges.push({ ex: x + width, ey: y });
      } else {
        edges.push({ ex: x, ey: y });
        edges.push({ ex: x + width, ey: y });
      }

      for (const edge of edges) {
        const dist = Phaser.Math.Distance.Between(targetX, targetY, edge.ex, edge.ey);
        if (dist <= maxDistance) {
          if (!nearest || dist < nearest.distance) {
            nearest = { x: edge.ex, y: edge.ey, distance: dist };
          }
        }
      }
    }

    return nearest;
  }
}
