import Phaser from 'phaser';
import { TreeScene } from './scenes/treeScene';

export interface GameGlobalState {
  repairedCount: number;
  totalBranches: number;
  isComplete: boolean;
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  canvas: document.getElementById('game-canvas') as HTMLCanvasElement,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#0F0C29',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [TreeScene],
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  },
  fps: {
    target: 60,
    forceSetTimeOut: false
  }
};

class MemoryTreeGame extends Phaser.Game {
  public globalState: GameGlobalState;

  constructor(config: Phaser.Types.Core.GameConfig) {
    super(config);
    this.globalState = {
      repairedCount: 0,
      totalBranches: 20,
      isComplete: false
    };
  }

  public resetState(): void {
    this.globalState.repairedCount = 0;
    this.globalState.isComplete = false;
  }
}

declare global {
  interface Window {
    memoryTreeGame?: MemoryTreeGame;
  }
}

window.addEventListener('load', () => {
  const game = new MemoryTreeGame(config);
  window.memoryTreeGame = game;

  window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
  });
});
