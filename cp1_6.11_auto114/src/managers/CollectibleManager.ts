import Phaser from 'phaser';
import {
  CollectibleData,
  CollectibleColor,
  COLOR_HEX,
  COLOR_ORDER,
  COLOR_GROUP,
  ColorGroup
} from '../types';
import { PlatformManager, PlatformObject } from './PlatformManager';

const MAX_COLLECTIBLES = 40;
const COLLECTIBLE_RADIUS = 6;
const COLLECT_DISTANCE = 30;
const SPAWN_CHANCE = 0.6;

export interface CollectibleObject {
  data: CollectibleData;
  circle: Phaser.GameObjects.Arc;
  glow: Phaser.GameObjects.Arc;
  pulseTween?: Phaser.Tweens.Tween;
}

export interface CollectEvent {
  color: CollectibleColor;
  group: ColorGroup;
  x: number;
  y: number;
}

export class CollectibleManager {
  private scene: Phaser.Scene;
  private collectibles: CollectibleObject[] = [];
  private platformManager: PlatformManager;
  private colorIndex: number = 0;
  private scrollSpeed: number = 300;
  private lastSpawnPlatformX: number = 0;
  private onCollectCallback?: (event: CollectEvent) => void;

  constructor(scene: Phaser.Scene, platformManager: PlatformManager) {
    this.scene = scene;
    this.platformManager = platformManager;
  }

  setOnCollect(callback: (event: CollectEvent) => void): void {
    this.onCollectCallback = callback;
  }

  setScrollSpeed(speed: number): void {
    this.scrollSpeed = speed;
  }

  init(): void {
    this.collectibles = [];
    this.colorIndex = 0;
    this.lastSpawnPlatformX = 0;
  }

  getCollectibles(): CollectibleObject[] {
    return this.collectibles;
  }

  update(delta: number, playerX: number, playerY: number, speedMultiplier: number = 1): CollectEvent[] {
    const collected: CollectEvent[] = [];
    const moveAmount = (this.scrollSpeed * speedMultiplier * delta) / 1000;

    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];
      c.data.x -= moveAmount;
      c.circle.x = c.data.x;
      c.circle.y = c.data.y;
      c.glow.x = c.data.x;
      c.glow.y = c.data.y;

      if (!c.data.collected) {
        const dist = Phaser.Math.Distance.Between(
          c.data.x,
          c.data.y,
          playerX,
          playerY
        );

        if (dist < COLLECT_DISTANCE) {
          c.data.collected = true;
          this.playCollectAnimation(c);

          const event: CollectEvent = {
            color: c.data.color,
            group: COLOR_GROUP[c.data.color],
            x: c.data.x,
            y: c.data.y
          };
          collected.push(event);

          if (this.onCollectCallback) {
            this.onCollectCallback(event);
          }
        }
      }

      if (c.data.x < -100) {
        this.destroyCollectible(c);
        this.collectibles.splice(i, 1);
      }
    }

    this.spawnCollectibles();

    return collected;
  }

  private spawnCollectibles(): void {
    const platforms = this.platformManager.getPlatforms();

    for (const platform of platforms) {
      const { x, y, width, hasGap, gapStart, gapWidth } = platform.data;

      if (x <= this.lastSpawnPlatformX) continue;
      this.lastSpawnPlatformX = x;

      if (this.collectibles.length >= MAX_COLLECTIBLES) break;
      if (Math.random() > SPAWN_CHANCE) continue;

      let spawnX: number;
      if (hasGap && gapStart !== undefined && gapWidth !== undefined) {
        const useLeft = Math.random() > 0.5;
        if (useLeft && gapStart > 40) {
          spawnX = x + Phaser.Math.Between(20, gapStart - 20);
        } else if (width - gapStart - gapWidth > 40) {
          spawnX = x + gapStart + gapWidth + Phaser.Math.Between(20, width - gapStart - gapWidth - 20);
        } else {
          continue;
        }
      } else {
        if (width < 40) continue;
        spawnX = x + Phaser.Math.Between(20, width - 20);
      }

      const spawnY = y - Phaser.Math.Between(40, 100);
      const color = COLOR_ORDER[this.colorIndex % COLOR_ORDER.length];
      this.colorIndex++;

      this.createCollectible(spawnX, spawnY, color);
    }
  }

  private createCollectible(x: number, y: number, color: CollectibleColor): void {
    const hexColor = Phaser.Display.Color.HexStringToColor(COLOR_HEX[color]).color;

    const glow = this.scene.add.circle(x, y, COLLECTIBLE_RADIUS + 8, hexColor, 0.3);
    const circle = this.scene.add.circle(x, y, COLLECTIBLE_RADIUS, hexColor, 1);

    circle.setStrokeStyle(2, hexColor, 1);

    const pulseTween = this.scene.tweens.add({
      targets: glow,
      scale: { from: 0.8, to: 1.4 },
      alpha: { from: 0.5, to: 0.1 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const data: CollectibleData = {
      x,
      y,
      color,
      collected: false
    };

    this.collectibles.push({ data, circle, glow, pulseTween });
  }

  private playCollectAnimation(obj: CollectibleObject): void {
    if (obj.pulseTween) {
      obj.pulseTween.stop();
    }

    this.scene.tweens.add({
      targets: [obj.circle, obj.glow],
      scale: 2,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.destroyCollectible(obj);
        const idx = this.collectibles.indexOf(obj);
        if (idx > -1) this.collectibles.splice(idx, 1);
      }
    });
  }

  private destroyCollectible(obj: CollectibleObject): void {
    if (obj.pulseTween) {
      obj.pulseTween.remove();
    }
    obj.circle.destroy();
    obj.glow.destroy();
  }

  destroy(): void {
    for (const c of this.collectibles) {
      this.destroyCollectible(c);
    }
    this.collectibles = [];
  }
}
