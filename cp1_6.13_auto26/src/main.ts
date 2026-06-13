import Phaser from 'phaser';
import { Scene_Main } from './Scene_Main';
import { Scene_UI } from './Scene_UI';

export class GameConfig {
  static readonly WIDTH: number = 800;
  static readonly HEIGHT: number = 600;
  static readonly WORLD_HEIGHT: number = 3000;
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GameConfig.WIDTH,
  height: GameConfig.HEIGHT,
  parent: 'game-container',
  backgroundColor: '#000510',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GameConfig.WIDTH,
    height: GameConfig.HEIGHT
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [Scene_Main, Scene_UI]
};

const game = new Phaser.Game(config);

export default game;
