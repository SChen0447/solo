import Phaser from 'phaser';
import { RaceScene } from './scenes/RaceScene';
import { GAME_WIDTH, GAME_HEIGHT } from './utils/constants';

const loadingEl = document.getElementById('loading');

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-wrapper',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1a0f0a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT
  },
  scene: [RaceScene],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  render: {
    pixelArt: false,
    antialias: true,
    antialiasGL: true
  }
};

const game = new Phaser.Game(config);

game.events.once('ready', () => {
  if (loadingEl) {
    loadingEl.style.display = 'none';
  }
});

export default game;
