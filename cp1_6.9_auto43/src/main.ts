import Phaser from 'phaser';
import BootScene from './scenes/BootScene';
import GameScene from './scenes/GameScene';
import ResultScene from './scenes/ResultScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: Math.min(window.innerWidth, 800),
  height: Math.min(window.innerHeight, 900),
  parent: 'game-container',
  backgroundColor: '#2c1810',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [BootScene, GameScene, ResultScene],
  fps: {
    target: 60,
    forceSetTimeOut: false
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  }
};

function startGame(): void {
  const splash = document.getElementById('splash-screen');
  if (splash) {
    splash.classList.add('hidden');
    setTimeout(() => splash.remove(), 600);
  }
  new Phaser.Game(config);
}

window.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', startGame);
  } else {
    startGame();
  }
});
