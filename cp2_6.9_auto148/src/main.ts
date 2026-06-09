import { GameEngine } from './GameEngine';

window.addEventListener('DOMContentLoaded', () => {
  try {
    const game = new GameEngine('game-canvas');
    game.start();
  } catch (error) {
    console.error('Failed to start game:', error);
  }
});
