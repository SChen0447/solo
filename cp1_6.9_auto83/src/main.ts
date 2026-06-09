import Phaser from 'phaser';
import GameScene from './scenes/GameScene';

const BASE_WIDTH = 1600;
const BASE_HEIGHT = 900;
const ASPECT_RATIO = 16 / 9;

function calculateGameSize(): { width: number; height: number } {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const windowRatio = windowWidth / windowHeight;

  let width: number;
  let height: number;

  if (windowRatio > ASPECT_RATIO) {
    height = windowHeight;
    width = height * ASPECT_RATIO;
  } else {
    width = windowWidth;
    height = width / ASPECT_RATIO;
  }

  return { width, height };
}

const { width, height } = calculateGameSize();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: width,
  height: height,
  parent: 'game-container',
  backgroundColor: '#0a0a3a',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: BASE_WIDTH,
    height: BASE_HEIGHT
  },
  scene: [GameScene],
  render: {
    antialias: true,
    pixelArt: false
  }
};

window.addEventListener('resize', () => {
  if (game && game.scale) {
    game.scale.refresh();
  }
});

const game = new Phaser.Game(config);
