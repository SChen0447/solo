import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 960,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#2A1B38',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 900 },
      debug: false,
    },
  },
  pixelArt: true,
  scene: [GameScene],
};

document.getElementById('start-btn')?.addEventListener('click', () => {
  new Phaser.Game(config);
});
