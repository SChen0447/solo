import {
  TileType,
  MAP_SIZE,
  TILE_SIZE,
  GeneratedMap,
  Guard,
} from './mapGenerator';
import { PlayerState, PLAYER_SIZE, TOTAL_KEYS } from './player';

const COLORS = {
  WALL: '#2C2C2C',
  FLOOR: '#4A4A4A',
  FLOOR_LIGHT: '#525252',
  PLAYER_BODY: '#22C55E',
  PLAYER_DARK: '#16A34A',
  PLAYER_EYE: '#FFFFFF',
  TRAP_BASE: '#DC2626',
  TRAP_BRIGHT: '#EF4444',
  KEY: '#FFD700',
  KEY_DARK: '#DAA520',
  GUARD_BODY: '#DC2626',
  GUARD_DARK: '#991B1B',
  GUARD_EYE: '#FFFFFF',
  EXIT_1: '#FFD700',
  EXIT_2: '#FFA500',
  EXIT_BEAM: 'rgba(255, 215, 0, 0.4)',
  BORDER: '#3A3A3A',
  FOOTPRINT: 'rgba(220, 38, 38, 0.6)',
  DAMAGE_FLASH: 'rgba(220, 38, 38, 0.5)',
};

const EXIT_BLINK_PERIOD = 500;
const TRAP_BLINK_PERIOD = 400;
const GUARD_MOVE_INTERVAL = 350;
const GUARD_CHASE_RANGE = 3;
const FOOTPRINT_DURATION = 300;
const EXIT_BEAM_DURATION = 500;
const DAMAGE_FLASH_DURATION = 100;

export interface RenderState {
  offscreenCanvas: HTMLCanvasElement;
  offscreenCtx: CanvasRenderingContext2D;
  exitAnimationStartTime: number;
  exitAnimationProgress: number;
  damageFlashEndTime: number;
}

export function createRenderState(canvasWidth: number, canvasHeight: number): RenderState {
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = canvasWidth;
  offscreenCanvas.height = canvasHeight;
  const offscreenCtx = offscreenCanvas.getContext('2d')!;
  offscreenCtx.imageSmoothingEnabled = false;

  return {
    offscreenCanvas,
    offscreenCtx,
    exitAnimationStartTime: 0,
    exitAnimationProgress: 0,
    damageFlashEndTime: 0,
  };
}

export function triggerDamageFlash(renderState: RenderState, currentTime: number): void {
  renderState.damageFlashEndTime = currentTime + DAMAGE_FLASH_DURATION;
}

export function triggerExitAnimation(renderState: RenderState, currentTime: number): void {
  if (renderState.exitAnimationStartTime === 0) {
    renderState.exitAnimationStartTime = currentTime;
  }
}

function drawWall(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = COLORS.WALL;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  ctx.fillStyle = '#363636';
  ctx.fillRect(x, y, TILE_SIZE, 2);
  ctx.fillRect(x, y, 2, TILE_SIZE);

  ctx.fillStyle = '#222222';
  ctx.fillRect(x, y + TILE_SIZE - 2, TILE_SIZE, 2);
  ctx.fillRect(x + TILE_SIZE - 2, y, 2, TILE_SIZE);
}

function drawFloor(ctx: CanvasRenderingContext2D, x: number, y: number, tileX: number, tileY: number): void {
  ctx.fillStyle = COLORS.FLOOR;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  if ((tileX + tileY) % 2 === 0) {
    ctx.fillStyle = COLORS.FLOOR_LIGHT;
    ctx.fillRect(x + 2, y + 2, 2, 2);
    ctx.fillRect(x + TILE_SIZE - 4, y + TILE_SIZE - 4, 2, 2);
  }
}

function drawTrap(ctx: CanvasRenderingContext2D, x: number, y: number, currentTime: number): void {
  ctx.fillStyle = COLORS.FLOOR;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  const phase = Math.sin((currentTime / TRAP_BLINK_PERIOD) * Math.PI * 2);
  const bright = phase > 0;

  ctx.fillStyle = bright ? COLORS.TRAP_BRIGHT : COLORS.TRAP_BASE;
  ctx.beginPath();
  const centerX = x + TILE_SIZE / 2;
  const centerY = y + TILE_SIZE / 2;
  const size = TILE_SIZE * 0.35;

  ctx.moveTo(centerX, centerY - size);
  ctx.lineTo(centerX + size, centerY + size * 0.7);
  ctx.lineTo(centerX - size, centerY + size * 0.7);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = bright ? '#FCA5A5' : '#B91C1C';
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - size * 0.5);
  ctx.lineTo(centerX + size * 0.4, centerY + size * 0.3);
  ctx.lineTo(centerX - size * 0.4, centerY + size * 0.3);
  ctx.closePath();
  ctx.fill();
}

function drawKey(ctx: CanvasRenderingContext2D, x: number, y: number, currentTime: number): void {
  ctx.fillStyle = COLORS.FLOOR;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  const bob = Math.sin((currentTime / 300) * Math.PI * 2) * 2;
  const keyX = x + (TILE_SIZE - 12) / 2;
  const keyY = y + (TILE_SIZE - 12) / 2 + bob;

  ctx.fillStyle = COLORS.KEY;
  ctx.beginPath();
  ctx.arc(keyX + 4, keyY + 4, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = COLORS.KEY_DARK;
  ctx.beginPath();
  ctx.arc(keyX + 4, keyY + 4, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = COLORS.KEY;
  ctx.fillRect(keyX + 6, keyY + 3, 5, 2);
  ctx.fillRect(keyX + 9, keyY + 5, 2, 2);
  ctx.fillRect(keyX + 6, keyY + 5, 2, 2);
}

function drawExit(ctx: CanvasRenderingContext2D, x: number, y: number, currentTime: number, beamProgress: number): void {
  ctx.fillStyle = COLORS.FLOOR;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

  const phase = Math.floor(currentTime / EXIT_BLINK_PERIOD) % 2;
  const color = phase === 0 ? COLORS.EXIT_1 : COLORS.EXIT_2;

  ctx.fillStyle = color;
  ctx.fillRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);

  ctx.fillStyle = phase === 0 ? '#FFEC8B' : '#FFD700';
  ctx.fillRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12);

  ctx.fillStyle = '#8B4513';
  ctx.fillRect(x + TILE_SIZE / 2 - 1, y + TILE_SIZE / 2 - 1, 2, 3);

  if (beamProgress > 0) {
    const beamHeight = TILE_SIZE * 3 * beamProgress;
    const gradient = ctx.createLinearGradient(x, y + TILE_SIZE - beamHeight, x, y + TILE_SIZE);
    gradient.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0.1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x + 4, y + TILE_SIZE - beamHeight, TILE_SIZE - 8, beamHeight);

    ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * beamProgress})`;
    ctx.fillRect(x + TILE_SIZE / 2 - 2, y + TILE_SIZE - beamHeight, 4, beamHeight);
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: PlayerState, currentTime: number): void {
  const x = player.renderX;
  const y = player.renderY;
  const size = PLAYER_SIZE;

  ctx.fillStyle = COLORS.PLAYER_BODY;
  ctx.fillRect(x + 1, y + 2, size - 2, size - 3);

  ctx.fillStyle = COLORS.PLAYER_BODY;
  ctx.fillRect(x + 2, y, size - 4, 3);

  ctx.fillStyle = COLORS.PLAYER_DARK;
  ctx.fillRect(x, y + 3, 1, size - 4);
  ctx.fillRect(x + size - 1, y + 3, 1, size - 4);
  ctx.fillRect(x + 1, y + size - 1, size - 2, 1);

  const blinkPhase = Math.floor(currentTime / 200) % 20;
  if (blinkPhase < 18) {
    ctx.fillStyle = COLORS.PLAYER_EYE;
    ctx.fillRect(x + 2, y + 1, 2, 1);
    ctx.fillRect(x + size - 4, y + 1, 2, 1);
  }

  const walkOffset = player.isMoving ? Math.floor((currentTime / 80) % 2) : 0;
  ctx.fillStyle = COLORS.PLAYER_DARK;
  if (walkOffset === 0) {
    ctx.fillRect(x + 1, y + size - 2, 2, 2);
    ctx.fillRect(x + size - 3, y + size - 2, 2, 2);
  } else {
    ctx.fillRect(x + 2, y + size - 2, 2, 2);
    ctx.fillRect(x + size - 4, y + size - 2, 2, 2);
  }
}

function drawGuard(ctx: CanvasRenderingContext2D, guard: Guard, currentTime: number): void {
  const size = PLAYER_SIZE;
  const pixelX = guard.x * TILE_SIZE + (TILE_SIZE - size) / 2;
  const pixelY = guard.y * TILE_SIZE + (TILE_SIZE - size) / 2;

  for (let i = guard.footprints.length - 1; i >= 0; i--) {
    const fp = guard.footprints[i];
    const age = currentTime - fp.createTime;
    if (age >= FOOTPRINT_DURATION) {
      guard.footprints.splice(i, 1);
      continue;
    }
    const alpha = 1 - age / FOOTPRINT_DURATION;
    const fpSize = 2 + (age / FOOTPRINT_DURATION) * 6;
    const fpX = fp.x * TILE_SIZE + TILE_SIZE / 2 - fpSize / 2;
    const fpY = fp.y * TILE_SIZE + TILE_SIZE / 2 - fpSize / 2;
    ctx.fillStyle = `rgba(220, 38, 38, ${alpha * 0.5})`;
    ctx.beginPath();
    ctx.arc(fpX + fpSize / 2, fpY + fpSize / 2, fpSize / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = COLORS.GUARD_BODY;
  ctx.fillRect(pixelX + 1, pixelY + 2, size - 2, size - 3);
  ctx.fillRect(pixelX + 2, pixelY, size - 4, 3);

  ctx.fillStyle = COLORS.GUARD_DARK;
  ctx.fillRect(pixelX, pixelY + 3, 1, size - 4);
  ctx.fillRect(pixelX + size - 1, pixelY + 3, 1, size - 4);
  ctx.fillRect(pixelX + 1, pixelY + size - 1, size - 2, 1);

  if (guard.isChasing) {
    ctx.fillStyle = '#FCA5A5';
  } else {
    ctx.fillStyle = COLORS.GUARD_EYE;
  }
  ctx.fillRect(pixelX + 2, pixelY + 1, 2, 1);
  ctx.fillRect(pixelX + size - 4, pixelY + 1, 2, 1);

  const walkOffset = Math.floor((currentTime / 100) % 2);
  ctx.fillStyle = COLORS.GUARD_DARK;
  if (walkOffset === 0) {
    ctx.fillRect(pixelX + 1, pixelY + size - 2, 2, 2);
    ctx.fillRect(pixelX + size - 3, pixelY + size - 2, 2, 2);
  } else {
    ctx.fillRect(pixelX + 2, pixelY + size - 2, 2, 2);
    ctx.fillRect(pixelX + size - 4, pixelY + size - 2, 2, 2);
  }
}

function drawMap(ctx: CanvasRenderingContext2D, mapData: GeneratedMap, currentTime: number, renderState: RenderState): void {
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const pixelX = x * TILE_SIZE;
      const pixelY = y * TILE_SIZE;
      const tile = mapData.map[y][x];

      switch (tile) {
        case TileType.WALL:
          drawWall(ctx, pixelX, pixelY);
          break;
        case TileType.FLOOR:
          drawFloor(ctx, pixelX, pixelY, x, y);
          break;
        case TileType.TRAP:
          drawTrap(ctx, pixelX, pixelY, currentTime);
          break;
        case TileType.KEY:
          drawFloor(ctx, pixelX, pixelY, x, y);
          drawKey(ctx, pixelX, pixelY, currentTime);
          break;
        case TileType.EXIT:
          drawExit(ctx, pixelX, pixelY, currentTime, renderState.exitAnimationProgress);
          break;
      }
    }
  }
}

function drawDamageFlash(ctx: CanvasRenderingContext2D, width: number, height: number, currentTime: number, renderState: RenderState): void {
  if (currentTime < renderState.damageFlashEndTime) {
    ctx.fillStyle = COLORS.DAMAGE_FLASH;
    ctx.fillRect(0, 0, width, height);
  }
}

function drawBorder(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.strokeStyle = COLORS.BORDER;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
}

export function updateGuards(
  mapData: GeneratedMap,
  player: PlayerState,
  currentTime: number
): boolean {
  let hitPlayer = false;

  for (const guard of mapData.guards) {
    const dx = Math.abs(player.x - guard.x);
    const dy = Math.abs(player.y - guard.y);
    guard.isChasing = dx + dy <= GUARD_CHASE_RANGE;

    if (currentTime - guard.lastMoveTime >= GUARD_MOVE_INTERVAL) {
      guard.lastMoveTime = currentTime;

      if (guard.isChasing) {
        if (guard.footprints.length === 0 || guard.footprints[guard.footprints.length - 1].x !== guard.x || guard.footprints[guard.footprints.length - 1].y !== guard.y) {
          guard.footprints.push({ x: guard.x, y: guard.y, createTime: currentTime });
          if (guard.footprints.length > 5) {
            guard.footprints.shift();
          }
        }

        let moveX = 0;
        let moveY = 0;

        if (player.x > guard.x) moveX = 1;
        else if (player.x < guard.x) moveX = -1;
        else if (player.y > guard.y) moveY = 1;
        else if (player.y < guard.y) moveY = -1;

        const newX = guard.x + moveX;
        const newY = guard.y + moveY;

        if (newX >= 0 && newX < MAP_SIZE && newY >= 0 && newY < MAP_SIZE && mapData.map[newY][newX] !== TileType.WALL) {
          guard.x = newX;
          guard.y = newY;
        } else {
          if (moveX !== 0) {
            const altY = guard.y + (player.y > guard.y ? 1 : player.y < guard.y ? -1 : 0);
            if (altY >= 0 && altY < MAP_SIZE && mapData.map[altY][guard.x] !== TileType.WALL) {
              guard.y = altY;
            }
          } else if (moveY !== 0) {
            const altX = guard.x + (player.x > guard.x ? 1 : player.x < guard.x ? -1 : 0);
            if (altX >= 0 && altX < MAP_SIZE && mapData.map[guard.y][altX] !== TileType.WALL) {
              guard.x = altX;
            }
          }
        }
      } else {
        if (guard.patrolPath.length > 1) {
          const target = guard.patrolPath[guard.pathIndex];
          if (guard.x === target.x && guard.y === target.y) {
            guard.pathIndex = (guard.pathIndex + 1) % guard.patrolPath.length;
          } else {
            let moveX = 0;
            let moveY = 0;
            if (target.x > guard.x) moveX = 1;
            else if (target.x < guard.x) moveX = -1;
            else if (target.y > guard.y) moveY = 1;
            else if (target.y < guard.y) moveY = -1;

            const newX = guard.x + moveX;
            const newY = guard.y + moveY;
            if (newX >= 0 && newX < MAP_SIZE && newY >= 0 && newY < MAP_SIZE && mapData.map[newY][newX] !== TileType.WALL) {
              guard.x = newX;
              guard.y = newY;
            } else {
              guard.pathIndex = (guard.pathIndex + 1) % guard.patrolPath.length;
            }
          }
        }
      }

      if (guard.x === player.x && guard.y === player.y) {
        hitPlayer = true;
      }
    }
  }

  return hitPlayer;
}

export function render(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  mapData: GeneratedMap,
  player: PlayerState,
  currentTime: number,
  renderState: RenderState,
  exitOpen: boolean
): void {
  const offCtx = renderState.offscreenCtx;

  if (exitOpen && renderState.exitAnimationStartTime > 0 && renderState.exitAnimationProgress < 1) {
    const elapsed = currentTime - renderState.exitAnimationStartTime;
    renderState.exitAnimationProgress = Math.min(1, elapsed / EXIT_BEAM_DURATION);
  }

  offCtx.fillStyle = '#000000';
  offCtx.fillRect(0, 0, canvasWidth, canvasHeight);

  drawMap(offCtx, mapData, currentTime, renderState);

  for (const guard of mapData.guards) {
    drawGuard(offCtx, guard, currentTime);
  }

  drawPlayer(offCtx, player, currentTime);

  drawDamageFlash(offCtx, canvasWidth, canvasHeight, currentTime, renderState);

  drawBorder(offCtx, canvasWidth, canvasHeight);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(renderState.offscreenCanvas, 0, 0);
}

export function renderHearts(container: HTMLElement, health: number, maxHealth: number): void {
  let html = '';
  for (let i = 0; i < maxHealth; i++) {
    if (i < health) {
      html += '<span style="color: #EF4444; font-size: 20px;">❤</span>';
    } else {
      html += '<span style="color: #4A4A4A; font-size: 20px;">❤</span>';
    }
  }
  container.innerHTML = html;
}

export function renderKeys(element: HTMLElement, keys: number): void {
  element.textContent = `${keys} / ${TOTAL_KEYS}`;
}

export function renderSteps(element: HTMLElement, steps: number): void {
  element.textContent = steps.toString();
}

export function showOverlay(
  title: string,
  steps: number,
  titleColor: string
): void {
  const overlay = document.getElementById('overlay')!;
  const titleEl = document.getElementById('overlay-title')!;
  const stepsEl = document.getElementById('overlay-steps')!;

  titleEl.textContent = title;
  titleEl.style.color = titleColor;
  stepsEl.textContent = `总步数：${steps}`;

  overlay.classList.add('show');
}

export function hideOverlay(): void {
  const overlay = document.getElementById('overlay')!;
  overlay.classList.remove('show');
}
