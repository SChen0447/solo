import Phaser from 'phaser';
import { BootScene } from './scene/BootScene';
import { GameScene } from './scene/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0d0d1a',
  width: 960,
  height: 720,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  pixelArt: false,
  fps: {
    target: 60,
    forceSetTimeOut: true
  },
  scene: [BootScene, GameScene]
};

new Phaser.Game(config);
