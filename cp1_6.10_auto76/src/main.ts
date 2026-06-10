import { Ship, polygonCollision } from './entities';
import { BulletSystem } from './bullets';
import { AIController } from './ai';
import { EffectSystem } from './effects';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;
const MAX_ROUNDS = 6;

type GamePhase = 'playing' | 'roundEnd' | 'gameOver';

interface GameState {
  phase: GamePhase;
  roundEndTimer: number;
  playerScore: number;
  aiScore: number;
  currentRound: number;
}

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

let player: Ship;
let ai: Ship;
let bulletSystem: BulletSystem;
let aiController: AIController;
let effects: EffectSystem;
let gameState: GameState;
let lastTime = 0;
let engineTimer = 0;

const keys: { [key: string]: boolean } = {};

function initScene(): void {
  player = new Ship({
    x: 150,
    y: CANVAS_HEIGHT - 150,
    rotation: -Math.PI / 4,
    isPlayer: true,
  });

  ai = new Ship({
    x: CANVAS_WIDTH - 150,
    y: 150,
    rotation: (3 * Math.PI) / 4,
    isPlayer: false,
  });

  bulletSystem = new BulletSystem();
  aiController = new AIController();
  effects = new EffectSystem();
  effects.init(CANVAS_WIDTH, CANVAS_HEIGHT);

  gameState = {
    phase: 'playing',
    roundEndTimer: 0,
    playerScore: 0,
    aiScore: 0,
    currentRound: 1,
  };
}

function resetRound(keepScore: boolean = true): void {
  player.reset(150, CANVAS_HEIGHT - 150, -Math.PI / 4);
  ai.reset(CANVAS_WIDTH - 150, 150, (3 * Math.PI) / 4);
  bulletSystem.clear();
  effects.clear();
  aiController.reset();
  gameState.phase = 'playing';
  gameState.roundEndTimer = 0;
  if (keepScore) {
    gameState.currentRound++;
  }
}

function handleInput(deltaTime: number): void {
  if (!player.alive || gameState.phase !== 'playing') return;

  if (keys['KeyA'] || keys['ArrowLeft']) {
    player.rotate(-1);
  }
  if (keys['KeyD'] || keys['ArrowRight']) {
    player.rotate(1);
  }
  if (keys['KeyW'] || keys['ArrowUp']) {
    player.thrust();
    spawnEngineParticles(player, deltaTime);
  }
  if (keys['KeyS'] || keys['ArrowDown']) {
  }
  if (keys['Space']) {
    if (player.canFire()) {
      const nose = player.getNosePosition();
      bulletSystem.spawn(nose.x, nose.y, player.rotation, 'player');
      player.fire();
    }
  }
}

function spawnEngineParticles(ship: Ship, deltaTime: number): void {
  engineTimer += deltaTime;
  if (engineTimer > 20) {
    engineTimer = 0;
    const pos = ship.getEnginePosition();
    effects.spawnEngineParticle(pos.x, pos.y, ship.rotation);
    if (ship === player) {
      effects.spawnEngineParticle(
        pos.x + (Math.random() - 0.5) * 4,
        pos.y + (Math.random() - 0.5) * 4,
        ship.rotation
      );
    }
  }
}

function updateAI(deltaTime: number): void {
  if (!ai.alive || gameState.phase !== 'playing') return;

  const input = aiController.update(ai, player, deltaTime, CANVAS_WIDTH, CANVAS_HEIGHT);

  if (input.rotate !== 0) {
    ai.rotate(input.rotate);
  }
  if (input.thrust) {
    ai.thrust();
    spawnEngineParticles(ai, deltaTime);
  }
  if (input.fire && ai.canFire()) {
    const nose = ai.getNosePosition();
    bulletSystem.spawn(nose.x, nose.y, ai.rotation, 'ai');
    ai.fire();
  }
}

function checkCollisions(): void {
  if (gameState.phase !== 'playing') return;

  const bulletPairs = bulletSystem.checkBulletCollisions();
  if (bulletPairs.length > 0) {
    bulletSystem.resolveBulletCollisions(bulletPairs);
    for (const [i] of bulletPairs) {
      const b = bulletSystem.getBulletAtIndex(i);
      if (b) {
        effects.spawnExplosion(b.x, b.y, 4, false);
      }
    }
  }

  const playerVertices = player.getVertices();
  const aiVertices = ai.getVertices();

  if (player.alive && ai.alive && polygonCollision(playerVertices, aiVertices)) {
    player.takeDamage(30);
    ai.takeDamage(30);
    effects.triggerShieldFlash('player');
    effects.triggerShieldFlash('ai');
    const cx = (player.x + ai.x) / 2;
    const cy = (player.y + ai.y) / 2;
    effects.spawnExplosion(cx, cy, 20, false);

    const dx = player.x - ai.x;
    const dy = player.y - ai.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;
    player.vx = nx * 3;
    player.vy = ny * 3;
    ai.vx = -nx * 3;
    ai.vy = -ny * 3;
  }

  if (player.alive) {
    const hit = bulletSystem.checkShipCollision(player.x, player.y, 25, 'player');
    if (hit >= 0) {
      player.takeDamage(10);
      effects.triggerShieldFlash('player');
      const b = bulletSystem.getBulletAtIndex(hit);
      if (b) {
        effects.spawnExplosion(b.x, b.y, 6, false);
      }
    }
  }

  if (ai.alive) {
    const hit = bulletSystem.checkShipCollision(ai.x, ai.y, 22, 'ai');
    if (hit >= 0) {
      ai.takeDamage(10);
      effects.triggerShieldFlash('ai');
      const b = bulletSystem.getBulletAtIndex(hit);
      if (b) {
        effects.spawnExplosion(b.x, b.y, 6, false);
      }
    }
  }
}

function checkShipBounce(ship: Ship, bouncedX: boolean, bouncedY: boolean): void {
  if ((bouncedX || bouncedY) && ship.alive) {
    ship.takeDamage(5);
    if (ship.isPlayer) {
      effects.triggerShieldFlash('player');
    } else {
      effects.triggerShieldFlash('ai');
    }
  }
}

function updateGameState(deltaTime: number): void {
  if (gameState.phase === 'roundEnd') {
    gameState.roundEndTimer -= deltaTime;
    if (gameState.roundEndTimer <= 0) {
      if (gameState.currentRound >= MAX_ROUNDS) {
        gameState.phase = 'gameOver';
      } else {
        resetRound(true);
      }
    }
    return;
  }

  if (gameState.phase === 'playing') {
    if (!player.alive || !ai.alive) {
      const deadShip = !player.alive ? player : ai;
      effects.spawnExplosion(deadShip.x, deadShip.y, 50, true);

      if (!player.alive) {
        gameState.aiScore++;
      } else {
        gameState.playerScore++;
      }

      gameState.phase = 'roundEnd';
      gameState.roundEndTimer = 3000;
    }
  }
}

function update(deltaTime: number, currentTime: number): void {
  handleInput(deltaTime);
  updateAI(deltaTime);

  if (gameState.phase === 'playing') {
    if (player.alive) {
      const { bouncedX, bouncedY } = player.update(deltaTime, CANVAS_WIDTH, CANVAS_HEIGHT);
      checkShipBounce(player, bouncedX, bouncedY);
    }
    if (ai.alive) {
      const { bouncedX, bouncedY } = ai.update(deltaTime, CANVAS_WIDTH, CANVAS_HEIGHT);
      checkShipBounce(ai, bouncedX, bouncedY);
    }

    bulletSystem.update(CANVAS_WIDTH, CANVAS_HEIGHT, deltaTime);
    checkCollisions();
  }

  const bulletPositions = bulletSystem.bullets
    .filter((b) => b.alive)
    .map((b) => ({ x: b.x, y: b.y }));
  const ships: Array<{ x: number; y: number }> = [];
  if (player.alive) ships.push({ x: player.x, y: player.y });
  if (ai.alive) ships.push({ x: ai.x, y: ai.y });

  effects.update(deltaTime, ships, bulletPositions);

  updateGameState(deltaTime);
}

function drawHealthBar(
  x: number,
  y: number,
  width: number,
  height: number,
  value: number,
  maxValue: number,
  isPlayer: boolean,
  label: string
): void {
  const percent = Math.max(0, value / maxValue);
  const now = performance.now();
  const isLow = percent < 0.3;
  const isCritical = percent < 0.1;
  const shouldFlash = isLow && Math.floor(now / 300) % 2 === 0;

  ctx.save();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  roundRect(ctx, x - 5, y - 25, width + 10, height + 35, 8);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = isPlayer ? 'left' : 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(label, isPlayer ? x : x + width, y - 20);

  const bgGradient = ctx.createLinearGradient(x, y, x, y + height);
  bgGradient.addColorStop(0, 'rgba(50, 50, 70, 0.8)');
  bgGradient.addColorStop(1, 'rgba(30, 30, 50, 0.8)');
  ctx.fillStyle = bgGradient;
  roundRect(ctx, x, y, width, height, 4);
  ctx.fill();

  if (!shouldFlash || !isLow) {
    const fillWidth = width * percent;
    const fillColor = isCritical
      ? ctx.createLinearGradient(x, y, x, y + height)
      : isPlayer
      ? ctx.createLinearGradient(x, y, x + width, y + height)
      : ctx.createLinearGradient(x, y, x + width, y + height);

    if (isCritical) {
      (fillColor as CanvasGradient).addColorStop(0, '#ff2222');
      (fillColor as CanvasGradient).addColorStop(1, '#ff0000');
    } else if (isPlayer) {
      (fillColor as CanvasGradient).addColorStop(0, '#00d4ff');
      (fillColor as CanvasGradient).addColorStop(1, '#0066ff');
    } else {
      (fillColor as CanvasGradient).addColorStop(0, '#ff4444');
      (fillColor as CanvasGradient).addColorStop(1, '#990000');
    }

    ctx.fillStyle = fillColor;
    roundRect(ctx, x, y, fillWidth, height, 4);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, width, height, 4);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.ceil(value)} / ${maxValue}`, x + width / 2, y + height / 2);

  ctx.restore();
}

function drawScore(): void {
  ctx.save();

  const text = `击落: ${gameState.playerScore} - ${gameState.aiScore}`;
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 4;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, CANVAS_WIDTH / 2, 20);

  ctx.shadowBlur = 10;
  ctx.shadowColor = 'rgba(0, 212, 255, 0.6)';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, CANVAS_WIDTH / 2, 20);

  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText(`回合 ${gameState.currentRound} / ${MAX_ROUNDS}`, CANVAS_WIDTH / 2, 78);

  ctx.restore();
}

function drawControls(): void {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  roundRect(ctx, 20, CANVAS_HEIGHT - 60, 280, 40, 8);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('WASD 移动 | 空格 射击', 35, CANVAS_HEIGHT - 40);

  ctx.restore();
}

function drawRoundEndScreen(): void {
  ctx.save();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const winner = !player.alive ? 'AI' : '玩家';
  const color = winner === '玩家' ? '#00d4ff' : '#ff4444';

  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = 30;
  ctx.fillStyle = color;
  ctx.fillText(`${winner} 获胜!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

  const seconds = Math.ceil(gameState.roundEndTimer / 1000);
  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 10;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.fillText(`${seconds} 秒后下一回合...`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);

  ctx.restore();
}

function drawGameOverScreen(): void {
  ctx.save();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const playerWon = gameState.playerScore > gameState.aiScore;
  const tie = gameState.playerScore === gameState.aiScore;
  const winner = tie ? '平局!' : playerWon ? '玩家胜利!' : 'AI 胜利!';
  const color = tie ? '#aaaaaa' : playerWon ? '#00d4ff' : '#ff4444';

  ctx.font = 'bold 80px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = 40;
  ctx.fillStyle = color;
  ctx.fillText(winner, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);

  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 15;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.fillText(
    `最终比分: ${gameState.playerScore} - ${gameState.aiScore}`,
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT / 2
  );

  ctx.font = '22px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText('按 R 键重新开始游戏', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawBackground(): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, '#0d0d1a');
  gradient.addColorStop(1, '#1a1a3a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function render(currentTime: number): void {
  drawBackground();

  effects.draw(ctx, currentTime);

  bulletSystem.draw(ctx);

  if (player.alive) player.draw(ctx);
  if (ai.alive) ai.draw(ctx);

  effects.drawShieldFlash(ctx, { x: player.x, y: player.y }, { x: ai.x, y: ai.y });

  drawHealthBar(30, 110, 200, 16, player.shield, player.maxShield, true, '玩家护盾');
  drawHealthBar(CANVAS_WIDTH - 230, 110, 200, 16, ai.shield, ai.maxShield, false, 'AI 护盾');

  drawScore();
  drawControls();

  if (gameState.phase === 'roundEnd') {
    drawRoundEndScreen();
  } else if (gameState.phase === 'gameOver') {
    drawGameOverScreen();
  }
}

function gameLoop(currentTime: number): void {
  const deltaTime = Math.min(currentTime - lastTime, 50);
  lastTime = currentTime;

  update(deltaTime, currentTime);
  render(currentTime);

  requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space') {
    e.preventDefault();
  }
  if (e.code === 'KeyR' && gameState.phase === 'gameOver') {
    initScene();
  }
});

document.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

function fitCanvas(): void {
  const scale = Math.min(
    window.innerWidth / CANVAS_WIDTH,
    window.innerHeight / CANVAS_HEIGHT
  );
  canvas.style.width = `${CANVAS_WIDTH * scale}px`;
  canvas.style.height = `${CANVAS_HEIGHT * scale}px`;
  canvas.style.position = 'absolute';
  canvas.style.left = `${(window.innerWidth - CANVAS_WIDTH * scale) / 2}px`;
  canvas.style.top = `${(window.innerHeight - CANVAS_HEIGHT * scale) / 2}px`;
}

window.addEventListener('resize', fitCanvas);

initScene();
fitCanvas();
lastTime = performance.now();
requestAnimationFrame(gameLoop);
