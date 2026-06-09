import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

function calculateGameSize(): { width: number; height: number } {
  const windowRatio = window.innerWidth / window.innerHeight;
  const targetRatio = 16 / 9;

  let width = window.innerWidth;
  let height = window.innerHeight;

  if (windowRatio > targetRatio) {
    width = Math.floor(height * targetRatio);
  } else {
    height = Math.floor(width / targetRatio);
  }

  return { width, height };
}

const { width, height } = calculateGameSize();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  canvasStyle: 'display: block;',
  backgroundColor: '#000000',
  width: width,
  height: height,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [GameScene],
  fps: {
    target: 60,
    forceSetTimeOut: true
  },
  input: {
    keyboard: true
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  }
};

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
  const { width, height } = calculateGameSize();
  game.scale.resize(width, height);
});
