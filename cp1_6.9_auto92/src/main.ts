import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

export const globalEvents = new Phaser.Events.EventEmitter();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game',
  backgroundColor: '#1a3a3a',
  scene: [GameScene],
  fps: {
    target: 60,
    forceSetTimeOut: true
  },
  render: {
    antialias: true,
    pixelArt: false
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  }
};

new Phaser.Game(config);
