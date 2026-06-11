import Phaser from 'phaser';
import { SceneGame } from './SceneGame';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#1a1a24',
  scene: [SceneGame],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    antialias: false,
    pixelArt: false,
    clearBeforeRender: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance'
  },
  fps: {
    target: 60,
    min: 30,
    forceSetTimeOut: false
  },
  input: {
    mouse: {
      target: null
    },
    touch: {
      target: null
    },
    keyboard: {
      target: null
    },
    gamepad: false
  }
};

window.addEventListener('load', () => {
  window.game = new Phaser.Game(config);
});

window.addEventListener('resize', () => {
  if (window.game) {
    window.game.scale.resize(window.innerWidth, window.innerHeight);
  }
});

declare global {
  interface Window {
    game: Phaser.Game;
  }
}
