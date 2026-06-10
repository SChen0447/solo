import { GameEngine, ScoreResult, Player } from './GameEngine';
import { Renderer } from './Renderer';
import { UIManager } from './UIManager';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const uiContainer = document.getElementById('app') as HTMLElement;

const engine = new GameEngine();
const renderer = new Renderer(canvas, engine);
const uiManager = new UIManager(canvas, engine, renderer, uiContainer);

uiManager.bindEvents();

engine.onStateChange(() => {
  renderer.spawnParticlesForEvents();
  uiManager.updateUI();
});

engine.onGameEnd((winner: Player | null, scores: ScoreResult) => {
  uiManager.showVictoryModal(winner, scores);
});

function gameLoop(currentTime: number) {
  engine.updateTimers(currentTime);
  renderer.spawnParticlesForEvents();
  renderer.render(uiManager.getHoverCell(), uiManager.getSelectedCell());
  uiManager.updateUI();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
