import Phaser from 'phaser';
import { BootScene } from './BootScene';
import { MainScene } from './MainScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1440,
  height: 900,
  backgroundColor: '#0d2818',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MainScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
    },
  },
};

const game = new Phaser.Game(config);
export default game;
