import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 700,
  parent: 'game-container',
  backgroundColor: '#0a0a1f',
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: 0.8 },
      enableSleeping: false,
      debug: false,
      setBounds: {
        left: true,
        right: true,
        top: true,
        bottom: false
      }
    }
  },
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  fps: {
    target: 60,
    forceSetTimeOut: true
  }
};

export default new Phaser.Game(config);
