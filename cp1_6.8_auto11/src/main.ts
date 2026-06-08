import { GameState, InputState } from './entities';
import { createInitialState, updateGame, upgradeShield, upgradeEngine, upgradeFireRate, isNearBase } from './gameLoop';
import { Renderer } from './renderer';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element not found');
}

let width = window.innerWidth;
let height = window.innerHeight;

const renderer = new Renderer(canvas);
renderer.resize(width, height);

let gameState: GameState = createInitialState(width, height);

const inputState: InputState = {
  up: false,
  down: false,
  left: false,
  right: false,
  space: false,
};

let lastTime = performance.now();
let animationFrameId: number;

function handleResize(): void {
  width = window.innerWidth;
  height = window.innerHeight;
  renderer.resize(width, height);
}

function handleKeyDown(e: KeyboardEvent): void {
  switch (e.code) {
    case 'ArrowUp':
    case 'KeyW':
      inputState.up = true;
      e.preventDefault();
      break;
    case 'ArrowDown':
    case 'KeyS':
      inputState.down = true;
      e.preventDefault();
      break;
    case 'ArrowLeft':
    case 'KeyA':
      inputState.left = true;
      e.preventDefault();
      break;
    case 'ArrowRight':
    case 'KeyD':
      inputState.right = true;
      e.preventDefault();
      break;
    case 'Space':
      inputState.space = true;
      e.preventDefault();
      break;
    case 'KeyR':
      if (gameState.gameOver) {
        restartGame();
      }
      break;
    case 'KeyP':
      gameState.isPaused = !gameState.isPaused;
      break;
  }
}

function handleKeyUp(e: KeyboardEvent): void {
  switch (e.code) {
    case 'ArrowUp':
    case 'KeyW':
      inputState.up = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      inputState.down = false;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      inputState.left = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      inputState.right = false;
      break;
    case 'Space':
      inputState.space = false;
      break;
  }
}

function handleMouseMove(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const hovered = renderer.checkButtonHover(gameState, mouseX, mouseY);
  renderer.setHoveredButton(hovered);
  canvas.style.cursor = hovered ? 'pointer' : 'crosshair';
}

function handleClick(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const buttonId = renderer.checkButtonClick(gameState, mouseX, mouseY);
  if (buttonId && isNearBase(gameState)) {
    if (buttonId === 'shield') {
      upgradeShield(gameState);
    } else if (buttonId === 'engine') {
      upgradeEngine(gameState);
    } else if (buttonId === 'fire') {
      upgradeFireRate(gameState);
    }
  }
}

function restartGame(): void {
  gameState = createInitialState(width, height);
}

function gameLoop(currentTime: number): void {
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  updateGame(gameState, inputState, deltaTime, width, height);
  renderer.render(gameState, deltaTime);

  animationFrameId = requestAnimationFrame(gameLoop);
}

window.addEventListener('resize', handleResize);
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('click', handleClick);

animationFrameId = requestAnimationFrame(gameLoop);
