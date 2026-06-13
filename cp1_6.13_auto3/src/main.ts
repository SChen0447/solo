import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { UIOverlay } from './scenes/UIOverlay';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#0a0a1a',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  dom: {
    createContainer: true
  },
  scene: [GameScene, UIOverlay]
};

window.addEventListener('load', () => {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
  new Phaser.Game(config);
});
