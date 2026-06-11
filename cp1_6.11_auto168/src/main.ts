import Phaser from 'phaser';
import { GameScene } from './GameScene';

const VIEW_WIDTH = 1024;
const VIEW_HEIGHT = 768;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: VIEW_WIDTH,
  height: VIEW_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT
  },
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true
  },
  scene: [GameScene],
  fps: {
    target: 60,
    forceSetTimeOut: false
  }
};

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
