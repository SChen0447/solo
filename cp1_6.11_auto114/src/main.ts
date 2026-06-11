import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { DEFAULT_CONFIG, GameConfig } from './types';

export function createGame(customConfig?: Partial<GameConfig>): Phaser.Game {
  const config: GameConfig = { ...DEFAULT_CONFIG, ...customConfig };

  const phaserConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: config.width,
    height: config.height,
    parent: 'game-container',
    backgroundColor: '#0d0221',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: config.gravity },
        fps: 60,
        fixedStep: true,
        timeScale: 1
      }
    },
    scene: [BootScene, GameScene],
    fps: {
      target: 60,
      forceSetTimeOut: true
    },
    input: {
      activePointers: 3
    }
  };

  const game = new Phaser.Game(phaserConfig);
  game.registry.set('gameConfig', config);

  return game;
}

createGame();
