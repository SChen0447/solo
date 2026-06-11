import Phaser from 'phaser';
import { ForgeScene } from './forgeScene';
import { EnchantScene } from './enchantScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1200,
  height: 700,
  backgroundColor: '#2b2b2b',
  parent: document.body,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [ForgeScene, EnchantScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
    },
  },
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
};

const game = new Phaser.Game(config);
