import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  canvas: document.getElementById('gameCanvas') as HTMLCanvasElement,
  backgroundColor: '#1a0f08',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  pixelArt: false,
  roundPixels: false,
  scene: [BootScene, GameScene, GameOverScene]
};

const game = new Phaser.Game(config);

game.events.once(Phaser.Core.Events.READY, () => {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.5s ease-out';
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 500);
  }
});

export default game;
