import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

const WIDTH = 1180;
const HEIGHT = 760;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  parent: 'game-container',
  canvas: document.getElementById('game-canvas') as HTMLCanvasElement,
  backgroundColor: '#0a0016',
  pixelArt: false,
  roundPixels: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: WIDTH,
    height: HEIGHT
  },
  fps: {
    target: 60,
    forceSetTimeOut: true
  },
  render: {
    antialias: true,
    antialiasGL: true,
    powerPreference: 'high-performance'
  },
  scene: [GameScene]
};

window.addEventListener('DOMContentLoaded', () => {
  new Phaser.Game(config);
});

export { WIDTH as GAME_WIDTH, HEIGHT as GAME_HEIGHT };
