import {
  Stone,
  Particle,
  TRACK_LENGTH,
  TRACK_WIDTH,
  STONE_RADIUS,
  createStone,
  launchStone,
  updateStones,
  updateParticles,
  allStonesStopped,
  calculateScore,
} from './physics';
import { calculateAIDecision } from './ai';
import { render, RenderState } from './rendering';

interface GameState {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
  offsetX: number;
  offsetY: number;

  stones: Stone[];
  particles: Particle[];

  currentTurn: 'red' | 'yellow';
  redScore: number;
  yellowScore: number;
  currentEnd: number;
  totalEnds: number;
  endStoneCount: number;

  selectedStoneId: number | null;
  dragStart: { x: number; y: number } | null;
  dragCurrent: { x: number; y: number } | null;
  power: number;
  angle: number;
  isDragging: boolean;
  isProcessingTurn: boolean;

  aiCountdown: number | null;
  aiDecisionTimer: number | null;

  screenShake: number;
  flashEffect: number;

  sweepProgress: number;
  sweepCooldown: number;
  sweepActive: boolean;
  sweepDuration: number;
  activeSweepStoneId: number | null;

  audioContext: AudioContext | null;
  lastStoneCount: number;

  gameOver: boolean;
  winner: 'red' | 'yellow' | 'draw' | null;
  mvpStoneId: number | null;
}

const TOTAL_ENDS = 10;
const SWEEP_DURATION = 2000;
const SWEEP_COOLDOWN = 10000;
const AI_COUNTDOWN_DURATION = 3000;

let state: GameState;

function init(): void {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get canvas context');

  state = {
    canvas,
    ctx,
    canvasWidth: 0,
    canvasHeight: 0,
    scale: 1,
    offsetX: 0,
    offsetY: 0,

    stones: [],
    particles: [],

    currentTurn: 'red',
    redScore: 0,
    yellowScore: 0,
    currentEnd: 1,
    totalEnds: TOTAL_ENDS,
    endStoneCount: 0,

    selectedStoneId: null,
    dragStart: null,
    dragCurrent: null,
    power: 0,
    angle: 0,
    isDragging: false,
    isProcessingTurn: false,

    aiCountdown: null,
    aiDecisionTimer: null,

    screenShake: 0,
    flashEffect: 0,

    sweepProgress: 1,
    sweepCooldown: 0,
    sweepActive: false,
    sweepDuration: 0,
    activeSweepStoneId: null,

    audioContext: null,
    lastStoneCount: 0,

    gameOver: false,
    winner: null,
    mvpStoneId: null,
  };

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseUp);

  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });

  window.addEventListener('keydown', onKeyDown);

  canvas.addEventListener('click', onClick);

  setupEnd();
  requestAnimationFrame(gameLoop);
}

function resizeCanvas(): void {
  const canvas = state.canvas;
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  state.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  state.canvasWidth = width;
  state.canvasHeight = height;

  const minCanvasWidth = 1200;
  state.scale = Math.min(
    width / minCanvasWidth,
    height / (TRACK_LENGTH + 100)
  );
  const trackDrawWidth = TRACK_WIDTH * state.scale;
  const trackDrawHeight = TRACK_LENGTH * state.scale;
  state.offsetX = (width - trackDrawWidth) / 2;
  state.offsetY = (height - trackDrawHeight) / 2;
}

function screenToWorld(sx: number, sy: number): { x: number; y: number } {
  return {
    x: (sx - state.offsetX) / state.scale,
    y: (sy - state.offsetY) / state.scale,
  };
}

function setupEnd(): void {
  state.stones = [];
  state.particles = [];
  state.endStoneCount = 0;
  state.currentTurn = state.currentEnd % 2 === 1 ? 'red' : 'yellow';
  state.isProcessingTurn = false;
  state.selectedStoneId = null;
  spawnNextStone();
}

function spawnNextStone(): void {
  const team = state.currentTurn;
  const startX = TRACK_WIDTH / 2;
  const startY = TRACK_LENGTH - 120;
  const id = Date.now() + Math.random();
  const stone = createStone(id, team, startX, startY);
  state.stones.push(stone);
  state.lastStoneCount = state.stones.length;

  if (team === 'red') {
    state.selectedStoneId = id;
  } else {
    state.selectedStoneId = null;
    state.aiCountdown = AI_COUNTDOWN_DURATION;
  }
}

function onClick(e: MouseEvent): void {
  if (state.gameOver) {
    resetGame();
  }
}

function resetGame(): void {
  state.redScore = 0;
  state.yellowScore = 0;
  state.currentEnd = 1;
  state.gameOver = false;
  state.winner = null;
  state.mvpStoneId = null;
  state.sweepProgress = 1;
  state.sweepCooldown = 0;
  state.sweepActive = false;
  setupEnd();
}

function getMousePos(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = state.canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

function onMouseDown(e: MouseEvent): void {
  if (state.gameOver) return;
  if (state.currentTurn !== 'red') return;
  if (state.isProcessingTurn) return;

  const pos = getMousePos(e);
  const worldPos = screenToWorld(pos.x, pos.y);

  const selectedStone = state.stones.find(
    (s) => s.id === state.selectedStoneId
  );
  if (!selectedStone) return;

  const dist = Math.sqrt(
    Math.pow(worldPos.x - selectedStone.x, 2) +
      Math.pow(worldPos.y - selectedStone.y, 2)
  );

  if (dist < STONE_RADIUS * 3) {
    state.isDragging = true;
    state.dragStart = { x: selectedStone.x, y: selectedStone.y };
    state.dragCurrent = worldPos;
    state.power = 0;
    state.angle = -Math.PI / 2;
  }
}

function onMouseMove(e: MouseEvent): void {
  if (!state.isDragging) return;

  const pos = getMousePos(e);
  const worldPos = screenToWorld(pos.x, pos.y);
  updateDrag(worldPos);
}

function onMouseUp(): void {
  if (!state.isDragging) return;
  releaseStone();
}

function onTouchStart(e: TouchEvent): void {
  e.preventDefault();
  if (e.touches.length === 0) return;
  if (state.gameOver) {
    resetGame();
    return;
  }
  if (state.currentTurn !== 'red') return;
  if (state.isProcessingTurn) return;

  const touch = e.touches[0];
  const pos = getMousePos(touch);
  const worldPos = screenToWorld(pos.x, pos.y);

  const selectedStone = state.stones.find(
    (s) => s.id === state.selectedStoneId
  );
  if (!selectedStone) return;

  const dist = Math.sqrt(
    Math.pow(worldPos.x - selectedStone.x, 2) +
      Math.pow(worldPos.y - selectedStone.y, 2)
  );

  if (dist < STONE_RADIUS * 5) {
    state.isDragging = true;
    state.dragStart = { x: selectedStone.x, y: selectedStone.y };
    state.dragCurrent = worldPos;
    state.power = 0;
    state.angle = -Math.PI / 2;
  }
}

function onTouchMove(e: TouchEvent): void {
  e.preventDefault();
  if (!state.isDragging || e.touches.length === 0) return;

  const touch = e.touches[0];
  const pos = getMousePos(touch);
  const worldPos = screenToWorld(pos.x, pos.y);
  updateDrag(worldPos);
}

function onTouchEnd(e: TouchEvent): void {
  e.preventDefault();
  if (!state.isDragging) return;
  releaseStone();
}

function updateDrag(worldPos: { x: number; y: number }): void {
  if (!state.dragStart) return;
  state.dragCurrent = worldPos;

  const dx = worldPos.x - state.dragStart.x;
  const dy = worldPos.y - state.dragStart.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxDist = 150;

  state.power = Math.min(100, (dist / maxDist) * 100);
  state.angle = Math.atan2(dy, dx);
}

function releaseStone(): void {
  if (!state.dragStart || !state.dragCurrent) return;

  const selectedStone = state.stones.find(
    (s) => s.id === state.selectedStoneId
  );
  if (!selectedStone) return;

  if (state.power >= 5) {
    launchStone(selectedStone, state.power, state.angle);
    state.isProcessingTurn = true;
    state.screenShake = 1;
    playCollisionSound(200, 0.1);
  }

  state.isDragging = false;
  state.dragStart = null;
  state.dragCurrent = null;
  state.selectedStoneId = null;
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.code === 'Space') {
    e.preventDefault();
    activateSweep();
  }
}

function activateSweep(): void {
  if (state.sweepCooldown > 0) return;
  if (state.sweepActive) return;

  const movingStone = state.stones.find((s) => s.team === 'red' && s.isMoving);
  if (!movingStone) return;

  state.sweepActive = true;
  state.sweepDuration = SWEEP_DURATION;
  state.activeSweepStoneId = movingStone.id;
}

function playCollisionSound(freq: number, duration: number): void {
  try {
    if (!state.audioContext) {
      state.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
    const ctx = state.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      freq * 0.5,
      ctx.currentTime + duration
    );

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + duration
    );

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // ignore audio errors
  }
}

let lastTime = performance.now();

function gameLoop(timestamp: number): void {
  const dt = Math.min(32, timestamp - lastTime);
  lastTime = timestamp;

  update(dt, timestamp);

  const renderState: RenderState = {
    stones: state.stones,
    particles: state.particles,
    currentTurn: state.currentTurn,
    redScore: state.redScore,
    yellowScore: state.yellowScore,
    currentEnd: state.currentEnd,
    totalEnds: state.totalEnds,
    selectedStoneId: state.selectedStoneId,
    dragStart: state.dragStart,
    dragCurrent: state.dragCurrent,
    power: state.power,
    angle: state.angle,
    isDragging: state.isDragging,
    aiCountdown: state.aiCountdown,
    screenShake: state.screenShake,
    sweepProgress: state.sweepProgress,
    sweepCooldown: state.sweepCooldown,
    sweepActive: state.sweepActive,
    gameOver: state.gameOver,
    winner: state.winner,
    mvpStoneId: state.mvpStoneId,
    flashEffect: state.flashEffect,
  };

  render(
    state.ctx,
    state.canvasWidth,
    state.canvasHeight,
    renderState,
    timestamp
  );

  requestAnimationFrame(gameLoop);
}

function update(dt: number, timestamp: number): void {
  if (state.gameOver) return;

  if (state.screenShake > 0) {
    state.screenShake = Math.max(0, state.screenShake - dt / 150);
  }

  if (state.flashEffect > 0) {
    state.flashEffect = Math.max(0, state.flashEffect - dt / 300);
  }

  if (state.sweepActive) {
    state.sweepDuration -= dt;
    state.sweepProgress = Math.max(0, state.sweepDuration / SWEEP_DURATION);
    if (state.sweepDuration <= 0) {
      state.sweepActive = false;
      state.sweepCooldown = SWEEP_COOLDOWN;
      state.activeSweepStoneId = null;
    }
  } else if (state.sweepCooldown > 0) {
    state.sweepCooldown -= dt;
    state.sweepProgress = Math.max(
      0,
      1 - state.sweepCooldown / SWEEP_COOLDOWN
    );
  } else {
    state.sweepProgress = 1;
  }

  if (state.aiCountdown !== null) {
    state.aiCountdown -= dt;
    if (state.aiCountdown <= 0) {
      state.aiCountdown = null;
      doAITurn();
    }
  }

  const prevMoving = state.stones.filter((s) => s.isMoving).length;
  const newParticles = updateStones(
    state.stones,
    state.sweepActive,
    state.activeSweepStoneId
  );
  state.particles.push(...newParticles);
  updateParticles(state.particles);

  const nowMoving = state.stones.filter((s) => s.isMoving).length;
  if (nowMoving < prevMoving && prevMoving > 1) {
    playCollisionSound(400, 0.08);
    state.screenShake = 0.3;
  }

  if (state.isProcessingTurn && allStonesStopped(state.stones)) {
    state.isProcessingTurn = false;
    onTurnComplete();
  }
}

function doAITurn(): void {
  const aiStone = state.stones.find(
    (s) => s.team === 'yellow' && !s.stopped && s.vx === 0 && s.vy === 0
  );
  if (!aiStone) {
    onTurnComplete();
    return;
  }

  const decision = calculateAIDecision(
    state.stones,
    aiStone.x,
    aiStone.y
  );

  state.flashEffect = 1;
  launchStone(aiStone, decision.power, decision.angle);
  state.isProcessingTurn = true;
  state.screenShake = 1;
  playCollisionSound(200, 0.1);
}

function onTurnComplete(): void {
  state.endStoneCount++;

  if (state.currentTurn === 'red') {
    state.currentTurn = 'yellow';
  } else {
    state.currentTurn = 'red';
  }

  if (state.endStoneCount >= 4) {
    onEndComplete();
  } else {
    spawnNextStone();
  }
}

function onEndComplete(): void {
  const scoreResult = calculateScore(state.stones);
  state.redScore += scoreResult.red;
  state.yellowScore += scoreResult.yellow;

  if (scoreResult.mvpStoneId !== null) {
    state.mvpStoneId = scoreResult.mvpStoneId;
  }

  if (state.currentEnd >= state.totalEnds) {
    state.gameOver = true;
    if (state.redScore > state.yellowScore) {
      state.winner = 'red';
    } else if (state.yellowScore > state.redScore) {
      state.winner = 'yellow';
    } else {
      state.winner = 'draw';
    }
  } else {
    state.currentEnd++;
    setupEnd();
  }
}

init();
