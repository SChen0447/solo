import Phaser from 'phaser';
import { LabScene } from './scenes/LabScene';
import { GeneEditScene } from './scenes/GeneEditScene';
import { GardenScene } from './scenes/GardenScene';
import { Plant, createInitialPlants } from './geneManager';

export interface GameState {
  plants: Plant[];
  shelfPlants: Plant[];
  selectedPlant: Plant | null;
  energyPoints: number;
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#e8f5e9',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [LabScene, GeneEditScene, GardenScene],
  fps: {
    target: 60,
    min: 30
  },
  input: {
    activePointers: 2
  }
};

export class Game extends Phaser.Game {
  public gameState: GameState;
  
  constructor(config: Phaser.Types.Core.GameConfig) {
    super(config);
    this.gameState = {
      plants: createInitialPlants(6),
      shelfPlants: [],
      selectedPlant: null,
      energyPoints: 5
    };
  }
}

let game: Game;

function initGame() {
  game = new Game(config);
  (window as any).game = game;
}

function resizeHandler() {
  if (game) {
    game.scale.resize(window.innerWidth, window.innerHeight);
  }
}

window.addEventListener('load', initGame);
window.addEventListener('resize', resizeHandler);
