import { Maze } from './maze';
import { Player } from './player';
import { UI } from './ui';
import { AudioSystem } from './audio';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  maze.resize(window.innerWidth, window.innerHeight);
  ui.resize(window.innerWidth, window.innerHeight);
}

const maze = new Maze(ctx);
const player = new Player(ctx, maze);
const ui = new UI(ctx);
const audio = new AudioSystem();

let level = 1;
let successCount = 0;
let failCount = 0;
let inputLocked = false;
let successAnimationTimer = 0;
const SUCCESS_ANIM_DURATION = 1.2;

function loadLevel(lv: number) {
  const colors = Maze.pickColorsForLevel(lv);
  maze.setupLevel({
    level: lv,
    trackColors: colors,
    cracksPerTrack: Math.min(5, 2 + lv - 1),
    pulseSpeed: 0.3 + (lv - 1) * 0.05,
  });
  player.reset(maze.getEntryPos());
  ui.setState({
    level: lv,
    innerTrackColor: colors[0],
  });
}

player.setCallbacks({
  onMove: () => {
    audio.playMove();
  },
  onCrack: () => {
    audio.playCrack();
    failCount++;
    ui.setState({ failCount });
    const ring = player.getPos().ring;
    maze.regenerateCracksForRing(ring);
  },
  onSuccess: () => {
    audio.playSuccess();
    successCount++;
    maze.triggerGateBurst();
    inputLocked = true;
    successAnimationTimer = 0;
    ui.setState({ successCount });
  },
});

function handleKey(e: KeyboardEvent) {
  audio.init();
  audio.resume();
  if (inputLocked) return;
  let handled = false;
  switch (e.key) {
    case 'ArrowLeft':
    case 'a':
    case 'A':
      handled = player.tryMoveLeft();
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      handled = player.tryMoveRight();
      break;
    case 'ArrowUp':
    case 'w':
    case 'W':
      handled = player.tryMoveUp();
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      handled = player.tryMoveDown();
      break;
  }
  if (handled) e.preventDefault();
}

window.addEventListener('keydown', handleKey);
window.addEventListener('resize', resize);
window.addEventListener('click', () => {
  audio.init();
  audio.resume();
});

let lastTime = performance.now();

function loop(now: number) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (inputLocked) {
    successAnimationTimer += dt;
    if (successAnimationTimer >= SUCCESS_ANIM_DURATION) {
      inputLocked = false;
      level++;
      loadLevel(level);
    }
  }

  maze.update(dt);
  player.update(dt);
  ui.update(dt);

  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  maze.render();
  player.render();
  ui.render();

  requestAnimationFrame(loop);
}

resize();
loadLevel(1);
requestAnimationFrame(loop);
