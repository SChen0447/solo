import { generateDungeon, TileType, GeneratedMap, isWalkable } from './MapGenerator.js';
import { Player } from './Player.js';

const GRID_WIDTH = 10;
const GRID_HEIGHT = 10;
const TILE_SIZE = 32;
const ENEMY_MOVE_INTERVAL = 2000;
const ENEMY_HP = 3;
const MAX_FLOORS = 3;

const COLORS = {
  WALL: '#3a3a5a',
  FLOOR: '#5a5a7a',
  FLOOR_LIT: '#7a7a9a',
  STAIRS: '#00ff7f',
  PLAYER: '#ff8c00',
  ENEMY: '#cc3333',
  COIN: '#ffd700',
  TRAIL: 'rgba(255, 255, 255, 0.4)',
  ATTACK: 'rgba(255, 255, 255, 0.9)'
};

interface Enemy {
  id: string;
  x: number;
  y: number;
  hp: number;
  lastMoveTime: number;
  attackEffectTime?: number;
}

interface Coin {
  id: string;
  x: number;
  y: number;
  collectAnimStart?: number;
}

interface AttackEffect {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let map: GeneratedMap;
let player: Player;
let enemies: Enemy[] = [];
let coins: Coin[] = [];
let attackEffects: AttackEffect[] = [];
let currentFloor = 1;
let gameOver = false;
let victory = false;
let coinAnimTriggerTime: number | null = null;
const COIN_ANIM_DURATION = 300;

let canvasOffsetX = 0;
let canvasOffsetY = 0;
let canvasScale = 1;

const pressedKeys = new Set<string>();

function uid(): string {
  return Math.random().toString(36).substring(2, 11);
}

function getRandomFloorPositions(count: number, exclude: { x: number; y: number }[]): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const floorTiles: { x: number; y: number }[] = [];

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      if (map.tiles[y][x] === TileType.FLOOR || map.tiles[y][x] === TileType.FLOOR_LIT) {
        let excluded = false;
        for (const e of exclude) {
          if (e.x === x && e.y === y) {
            excluded = true;
            break;
          }
        }
        if (!excluded && !(x === map.spawnX && y === map.spawnY) && !(x === map.stairsX && y === map.stairsY)) {
          const distToSpawn = Math.abs(x - map.spawnX) + Math.abs(y - map.spawnY);
          if (distToSpawn >= 3) {
            floorTiles.push({ x, y });
          }
        }
      }
    }
  }

  for (let i = 0; i < count && floorTiles.length > 0; i++) {
    const idx = Math.floor(Math.random() * floorTiles.length);
    positions.push(floorTiles[idx]);
    floorTiles.splice(idx, 1);
  }

  return positions;
}

function spawnEnemies(): void {
  enemies = [];
  const count = 3 + Math.floor(Math.random() * 3);
  const positions = getRandomFloorPositions(count, []);
  for (const pos of positions) {
    enemies.push({
      id: uid(),
      x: pos.x,
      y: pos.y,
      hp: ENEMY_HP,
      lastMoveTime: performance.now()
    });
  }
}

function spawnCoinsFromEnemy(x: number, y: number): void {
  coins.push({
    id: uid(),
    x,
    y
  });
}

function initFloor(): void {
  map = generateDungeon(GRID_WIDTH, GRID_HEIGHT, TILE_SIZE);
  player.reset(map.spawnX, map.spawnY, true);
  enemies = [];
  coins = [];
  attackEffects = [];
  spawnEnemies();
}

function handleInput(now: number): void {
  if (gameOver || victory) return;

  let dx = 0;
  let dy = 0;

  if (pressedKeys.has('KeyW') || pressedKeys.has('ArrowUp')) dy = -1;
  else if (pressedKeys.has('KeyS') || pressedKeys.has('ArrowDown')) dy = 1;
  else if (pressedKeys.has('KeyA') || pressedKeys.has('ArrowLeft')) dx = -1;
  else if (pressedKeys.has('KeyD') || pressedKeys.has('ArrowRight')) dx = 1;

  if (dx !== 0 || dy !== 0) {
    const enemyPositions = enemies.map((e) => ({ x: e.x, y: e.y }));
    const moved = player.tryMove(dx, dy, map.tiles, now, enemyPositions);
    if (moved) {
      checkCoinCollection();
      checkStairs();
      checkEnemyAdjacency(now);
    }
    pressedKeys.clear();
  }
}

function checkCoinCollection(): void {
  const toRemove: string[] = [];
  for (const coin of coins) {
    if (coin.x === player.state.x && coin.y === player.state.y) {
      const result = player.addGold(1);
      if (result.added > 0) {
        toRemove.push(coin.id);
        if (result.animated) {
          coinAnimTriggerTime = performance.now();
        }
      }
    }
  }
  coins = coins.filter((c) => !toRemove.includes(c.id));
  updateUI();
}

function checkStairs(): void {
  if (player.state.x === map.stairsX && player.state.y === map.stairsY) {
    if (currentFloor < MAX_FLOORS) {
      const fadeEl = document.getElementById('fade-overlay');
      if (fadeEl) {
        fadeEl.classList.add('active');
        setTimeout(() => {
          currentFloor++;
          initFloor();
          updateUI();
          setTimeout(() => {
            fadeEl.classList.remove('active');
          }, 50);
        }, 500);
      }
    } else {
      if (enemies.length === 0) {
        triggerVictory();
      }
    }
  }
}

function checkEnemyAdjacency(now: number): void {
  for (const enemy of enemies) {
    const dist = Math.abs(enemy.x - player.state.x) + Math.abs(enemy.y - player.state.y);
    if (dist === 1) {
      enemy.hp -= 1;
      attackEffects.push({
        x: enemy.x,
        y: enemy.y,
        startTime: now,
        duration: 200
      });
      if (enemy.hp <= 0) {
        spawnCoinsFromEnemy(enemy.x, enemy.y);
      }
    }
  }
  enemies = enemies.filter((e) => e.hp > 0);

  if (currentFloor === MAX_FLOORS && enemies.length === 0) {
    if (player.state.x === map.stairsX && player.state.y === map.stairsY) {
      triggerVictory();
    }
  }
}

function updateEnemies(now: number): void {
  for (const enemy of enemies) {
    if (now - enemy.lastMoveTime < ENEMY_MOVE_INTERVAL) continue;
    enemy.lastMoveTime = now;

    const dx = player.state.x - enemy.x;
    const dy = player.state.y - enemy.y;

    let moveX = 0;
    let moveY = 0;

    if (Math.abs(dx) > Math.abs(dy)) {
      moveX = dx > 0 ? 1 : -1;
    } else if (dy !== 0) {
      moveY = dy > 0 ? 1 : -1;
    }

    const newX = enemy.x + moveX;
    const newY = enemy.y + moveY;

    if (newX === player.state.x && newY === player.state.y) {
      const dead = player.takeDamage(1);
      attackEffects.push({
        x: player.state.x,
        y: player.state.y,
        startTime: now,
        duration: 200
      });
      updateUI();
      if (dead) {
        gameOver = true;
      }
      continue;
    }

    if (!isWalkable(map.tiles, newX, newY)) continue;

    let blocked = false;
    for (const other of enemies) {
      if (other.id !== enemy.id && other.x === newX && other.y === newY) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;

    enemy.x = newX;
    enemy.y = newY;
  }
}

function updateAttackEffects(now: number): void {
  attackEffects = attackEffects.filter((e) => now - e.startTime < e.duration);
}

function triggerVictory(): void {
  victory = true;
  const victoryEl = document.getElementById('victory-screen');
  const finalCoinsEl = document.getElementById('final-coins');
  if (victoryEl && finalCoinsEl) {
    finalCoinsEl.textContent = String(player.state.gold);
    victoryEl.classList.add('show');
  }
}

function updateUI(): void {
  const heartsEl = document.getElementById('hearts');
  const goldEl = document.getElementById('gold-count');
  const floorEl = document.getElementById('floor-count');

  if (heartsEl) {
    heartsEl.innerHTML = '';
    for (let i = 0; i < player.state.maxHp; i++) {
      const heart = document.createElement('span');
      heart.className = 'heart ' + (i < player.state.hp ? 'full' : 'empty');
      heartsEl.appendChild(heart);
    }
  }

  if (goldEl) {
    goldEl.textContent = String(player.state.gold);
  }

  if (floorEl) {
    floorEl.textContent = `${currentFloor} / ${MAX_FLOORS}`;
  }
}

function resizeCanvas(): void {
  const container = document.getElementById('game-container');
  if (!container || !canvas) return;

  const containerW = container.clientWidth;
  const containerH = container.clientHeight;

  const gameW = GRID_WIDTH * TILE_SIZE;
  const gameH = GRID_HEIGHT * TILE_SIZE;
  const aspect = gameW / gameH;

  let canvasW = containerW;
  let canvasH = containerW / aspect;
  if (canvasH > containerH) {
    canvasH = containerH;
    canvasW = containerH * aspect;
  }

  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = canvasW + 'px';
  canvas.style.height = canvasH + 'px';
  canvas.width = Math.floor(canvasW * dpr);
  canvas.height = Math.floor(canvasH * dpr);

  canvasScale = (canvasW / gameW) * dpr;
  canvasOffsetX = 0;
  canvasOffsetY = 0;
}

function render(now: number): void {
  if (!ctx) return;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(canvasScale, 0, 0, canvasScale, canvasOffsetX, canvasOffsetY);

  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const tile = map.tiles[y][x];
      let color = COLORS.WALL;
      if (tile === TileType.FLOOR) color = COLORS.FLOOR;
      else if (tile === TileType.FLOOR_LIT) color = COLORS.FLOOR_LIT;
      else if (tile === TileType.STAIRS) color = COLORS.FLOOR_LIT;

      ctx.fillStyle = color;
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

      if (tile === TileType.STAIRS) {
        const pulse = 0.5 + 0.5 * Math.sin(now / 300);
        ctx.fillStyle = COLORS.STAIRS;
        ctx.globalAlpha = 0.6 + 0.4 * pulse;
        const stairSize = 16;
        const sx = x * TILE_SIZE + (TILE_SIZE - stairSize) / 2;
        const sy = y * TILE_SIZE + (TILE_SIZE - stairSize) / 2;
        ctx.fillRect(sx, sy, stairSize, stairSize);
        ctx.globalAlpha = 1;
      }

      if (tile !== TileType.WALL) {
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * TILE_SIZE + 0.5, y * TILE_SIZE + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
      }
    }
  }

  for (const trail of player.state.trails) {
    const age = now - trail.createdAt;
    const alpha = Math.max(0, 1 - age / trail.duration) * 0.5;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    const tSize = 8;
    ctx.fillRect(
      trail.x * TILE_SIZE + (TILE_SIZE - tSize) / 2,
      trail.y * TILE_SIZE + (TILE_SIZE - tSize) / 2,
      tSize,
      tSize
    );
  }

  for (const coin of coins) {
    const cx = coin.x * TILE_SIZE + TILE_SIZE / 2;
    const cy = coin.y * TILE_SIZE + TILE_SIZE / 2;
    let size = 14;
    if (coin.collectAnimStart !== undefined) {
      const t = (now - coin.collectAnimStart) / COIN_ANIM_DURATION;
      size = 14 * (1 + t * 0.5);
    }
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = COLORS.COIN;
    ctx.shadowColor = COLORS.COIN;
    ctx.shadowBlur = 6;
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.restore();
  }

  for (const enemy of enemies) {
    const eSize = 24;
    ctx.fillStyle = COLORS.ENEMY;
    ctx.shadowColor = COLORS.ENEMY;
    ctx.shadowBlur = 4;
    ctx.fillRect(
      enemy.x * TILE_SIZE + (TILE_SIZE - eSize) / 2,
      enemy.y * TILE_SIZE + (TILE_SIZE - eSize) / 2,
      eSize,
      eSize
    );
    ctx.shadowBlur = 0;
  }

  const pSize = 24;
  ctx.fillStyle = COLORS.PLAYER;
  ctx.shadowColor = COLORS.PLAYER;
  ctx.shadowBlur = 8;
  ctx.fillRect(
    player.getPixelX() + (TILE_SIZE - pSize) / 2,
    player.getPixelY() + (TILE_SIZE - pSize) / 2,
    pSize,
    pSize
  );
  ctx.shadowBlur = 0;

  for (const effect of attackEffects) {
    const age = now - effect.startTime;
    const t = age / effect.duration;
    const alpha = 1 - t;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    const flashSize = TILE_SIZE * (0.6 + t * 0.4);
    ctx.fillRect(
      effect.x * TILE_SIZE + (TILE_SIZE - flashSize) / 2,
      effect.y * TILE_SIZE + (TILE_SIZE - flashSize) / 2,
      flashSize,
      flashSize
    );
  }

  if (coinAnimTriggerTime !== null) {
    const age = now - coinAnimTriggerTime;
    if (age < COIN_ANIM_DURATION) {
      const t = age / COIN_ANIM_DURATION;
      const pulse = 1 + Math.sin(t * Math.PI) * 0.5;
      ctx.save();
      ctx.translate(player.getPixelX() + TILE_SIZE / 2, player.getPixelY() - 10);
      ctx.scale(pulse, pulse);
      const s = 10;
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = COLORS.COIN;
      ctx.shadowColor = COLORS.COIN;
      ctx.shadowBlur = 10;
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.restore();
    } else {
      coinAnimTriggerTime = null;
    }
  }

  ctx.restore();
}

let lastTime = 0;
function gameLoop(timestamp: number): void {
  const now = timestamp;
  const dt = now - lastTime;
  lastTime = now;
  void dt;

  handleInput(now);
  player.updateTrails(now);
  updateEnemies(now);
  updateAttackEffects(now);
  render(now);

  requestAnimationFrame(gameLoop);
}

function initGame(): void {
  canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;

  map = generateDungeon(GRID_WIDTH, GRID_HEIGHT, TILE_SIZE);
  player = new Player(map.spawnX, map.spawnY, TILE_SIZE);
  spawnEnemies();

  resizeCanvas();
  updateUI();

  window.addEventListener('resize', resizeCanvas);

  window.addEventListener('keydown', (e) => {
    const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (keys.includes(e.code)) {
      e.preventDefault();
      pressedKeys.add(e.code);
    }
  });

  window.addEventListener('keyup', (e) => {
    pressedKeys.delete(e.code);
  });

  requestAnimationFrame(gameLoop);
}

window.addEventListener('DOMContentLoaded', initGame);
