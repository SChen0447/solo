import {
  GameState,
  INVENTORY_WIDTH,
  FURNACE_CENTER_X,
  FURNACE_CENTER_Y,
  FURNACE_RADIUS,
  ELEMENT_ICON_SIZE,
  ELEMENTS_PER_ROW,
  ELEMENT_GAP,
  INVENTORY_PADDING,
  MAP_OFFSET_X,
  MAP_OFFSET_Y,
  MAP_GRID_SIZE,
  MAP_TILE_SIZE,
  EXPLORE_BTN_X,
  EXPLORE_BTN_Y,
  EXPLORE_BTN_W,
  EXPLORE_BTN_H,
  getInventorySlotPosition,
} from './game.js';
import { ELEMENTS, RARITY_COLORS } from './synthData.js';

const TERRAIN_COLORS = [
  '#2244AA',
  '#3366CC',
  '#EEDD88',
  '#44AA44',
  '#559933',
  '#886644',
  '#998877',
  '#FFFFFF',
];

function getTerrainColor(noise: number): string {
  if (noise < 0.25) return TERRAIN_COLORS[0];
  if (noise < 0.35) return TERRAIN_COLORS[1];
  if (noise < 0.4) return TERRAIN_COLORS[2];
  if (noise < 0.6) return TERRAIN_COLORS[3];
  if (noise < 0.72) return TERRAIN_COLORS[4];
  if (noise < 0.82) return TERRAIN_COLORS[5];
  if (noise < 0.9) return TERRAIN_COLORS[6];
  return TERRAIN_COLORS[7];
}

export function render(ctx: CanvasRenderingContext2D, state: GameState, time: number): void {
  ctx.clearRect(0, 0, 600, 600);
  ctx.fillStyle = '#2D2D3A';
  ctx.fillRect(0, 0, 600, 600);

  if (state.mode === 'alchemy') {
    renderInventory(ctx, state);
    renderFurnace(ctx, state, time);
    renderExploreButton(ctx, state);
  } else {
    renderMap(ctx, state, time);
    renderReturnButton(ctx, state);
  }

  renderParticles(ctx, state);
  renderDragging(ctx, state);
}

function drawPixelRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function renderInventory(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.fillStyle = 'rgba(58, 58, 74, 0.85)';
  drawPixelRoundedRect(ctx, 0, 0, INVENTORY_WIDTH, 600, 8);
  ctx.fill();

  ctx.strokeStyle = '#555566';
  ctx.lineWidth = 2;
  drawPixelRoundedRect(ctx, 1, 1, INVENTORY_WIDTH - 2, 598, 8);
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px Courier New, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('元 素 背 包', INVENTORY_WIDTH / 2, 32);

  ctx.fillStyle = '#888899';
  ctx.font = '11px Courier New, monospace';
  ctx.fillText(`${state.inventory.length}/50`, INVENTORY_WIDTH / 2, 48);

  for (let i = 0; i < state.inventory.length; i++) {
    const pos = getInventorySlotPosition(i);
    const elId = state.inventory[i];
    const el = ELEMENTS[elId];
    if (!el) continue;
    const isLongPress = state.longPress?.elementId === elId && state.longPress?.triggered;
    drawElementIcon(ctx, pos.x, pos.y, ELEMENT_ICON_SIZE, el.color, RARITY_COLORS[el.rarity], isLongPress);
  }
}

function drawElementIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  borderColor: string,
  highlight = false
): void {
  const s = 4;
  const inner = size - 8;
  const offX = x + 4;
  const offY = y + 4;

  ctx.fillStyle = borderColor;
  ctx.fillRect(x, y, size, s);
  ctx.fillRect(x, y + size - s, size, s);
  ctx.fillRect(x, y, s, size);
  ctx.fillRect(x + size - s, y, s, size);
  ctx.fillRect(x, y + s, s, s);
  ctx.fillRect(x + size - s, y + s, s, s);
  ctx.fillRect(x, y + size - s - s, s, s);
  ctx.fillRect(x + size - s, y + size - s - s, s, s);

  ctx.fillStyle = color;
  for (let py = 0; py < inner; py += s) {
    for (let px = 0; px < inner; px += s) {
      const shade = ((px + py) / s) % 3;
      ctx.globalAlpha = 0.75 + shade * 0.1;
      ctx.fillRect(offX + px, offY + py, s, s);
    }
  }
  ctx.globalAlpha = 1;

  if (highlight) {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 2, y - 2, size + 4, size + 4);
  }
}

function renderFurnace(ctx: CanvasRenderingContext2D, state: GameState, time: number): void {
  const shakeX = state.effects.furnaceShake > 0 ? (Math.random() - 0.5) * 6 : 0;
  const cx = FURNACE_CENTER_X + shakeX;
  const cy = FURNACE_CENTER_Y;

  if (state.effects.furnaceGlow > 0) {
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, FURNACE_RADIUS + 40);
    const alpha = state.effects.furnaceGlow / 0.3;
    grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    grad.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.4})`);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, FURNACE_RADIUS + 40, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.effects.furnaceFail > 0) {
    const alpha = state.effects.furnaceFail / 0.2;
    ctx.fillStyle = `rgba(255, 60, 60, ${alpha * 0.6})`;
    ctx.beginPath();
    ctx.arc(cx, cy, FURNACE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(time * 0.3);
  drawOctagon(ctx, 0, 0, FURNACE_RADIUS);
  ctx.fillStyle = 'rgba(30, 30, 45, 0.9)';
  ctx.fill();
  ctx.strokeStyle = '#B8860B';
  ctx.lineWidth = 4;
  ctx.stroke();

  drawOctagon(ctx, 0, 0, FURNACE_RADIUS - 10);
  ctx.strokeStyle = '#8B6508';
  ctx.lineWidth = 2;
  ctx.stroke();

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r1 = FURNACE_RADIUS - 20;
    const r2 = FURNACE_RADIUS - 30;
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
    ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
    ctx.stroke();
  }
  ctx.restore();

  for (let i = 0; i < 2; i++) {
    const slotX = cx + (i === 0 ? -30 : 30);
    const slotY = cy;
    ctx.fillStyle = 'rgba(60, 60, 80, 0.8)';
    ctx.fillRect(slotX - 18, slotY - 18, 36, 36);
    ctx.strokeStyle = '#555566';
    ctx.lineWidth = 2;
    ctx.strokeRect(slotX - 18, slotY - 18, 36, 36);

    const elId = state.furnaceSlots[i];
    if (elId && ELEMENTS[elId]) {
      const el = ELEMENTS[elId];
      drawElementIcon(ctx, slotX - 14, slotY - 14, 28, el.color, RARITY_COLORS[el.rarity]);
    }
  }

  ctx.fillStyle = '#B8860B';
  ctx.font = 'bold 12px Courier New, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('熔  炉', cx, cy + FURNACE_RADIUS + 20);
}

function drawOctagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function renderExploreButton(ctx: CanvasRenderingContext2D, state: GameState): void {
  let bg = '#5A4A3A';
  if (state.exploreHovering) bg = '#7A6A5A';
  let scale = 1;
  if (state.explorePressed) scale = 0.95;

  const cx = EXPLORE_BTN_X + EXPLORE_BTN_W / 2;
  const cy = EXPLORE_BTN_Y + EXPLORE_BTN_H / 2;
  const w = EXPLORE_BTN_W * scale;
  const h = EXPLORE_BTN_H * scale;
  const x = cx - w / 2;
  const y = cy - h / 2;

  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = '#3A2A1A';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x + 2, y + 2, w - 4, 2);
  ctx.fillRect(x + 2, y + 2, 2, h - 4);

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x + 2, y + h - 4, w - 4, 2);
  ctx.fillRect(x + w - 4, y + 2, 2, h - 4);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 13px Courier New, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('探 索', cx, cy);
  ctx.textBaseline = 'alphabetic';
}

function renderReturnButton(ctx: CanvasRenderingContext2D, state: GameState): void {
  let bg = '#5A4A3A';
  if (state.exploreHovering) bg = '#7A6A5A';
  let scale = 1;
  if (state.explorePressed) scale = 0.95;

  const cx = EXPLORE_BTN_X + EXPLORE_BTN_W / 2;
  const cy = EXPLORE_BTN_Y + EXPLORE_BTN_H / 2;
  const w = EXPLORE_BTN_W * scale;
  const h = EXPLORE_BTN_H * scale;
  const x = cx - w / 2;
  const y = cy - h / 2;

  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = '#3A2A1A';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(x + 2, y + 2, w - 4, 2);
  ctx.fillRect(x + 2, y + 2, 2, h - 4);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 13px Courier New, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('返 回', cx, cy);
  ctx.textBaseline = 'alphabetic';
}

function renderMap(ctx: CanvasRenderingContext2D, state: GameState, time: number): void {
  const totalTiles = MAP_GRID_SIZE * MAP_GRID_SIZE;
  const fadeProgress = state.effects.mapFadeProgress;
  const tilesVisible = Math.floor(totalTiles * fadeProgress);

  ctx.fillStyle = '#1A1A28';
  ctx.fillRect(MAP_OFFSET_X - 4, MAP_OFFSET_Y - 4, MAP_GRID_SIZE * MAP_TILE_SIZE + 8, MAP_GRID_SIZE * MAP_TILE_SIZE + 8);
  ctx.strokeStyle = '#555566';
  ctx.lineWidth = 2;
  ctx.strokeRect(MAP_OFFSET_X - 4, MAP_OFFSET_Y - 4, MAP_GRID_SIZE * MAP_TILE_SIZE + 8, MAP_GRID_SIZE * MAP_TILE_SIZE + 8);

  let tileCount = 0;
  outer: for (let y = 0; y < MAP_GRID_SIZE; y++) {
    for (let x = 0; x < MAP_GRID_SIZE; x++) {
      if (tileCount >= tilesVisible) break outer;
      const noise = state.mapTiles[y]?.[x] ?? 0.5;
      ctx.fillStyle = getTerrainColor(noise);
      ctx.fillRect(
        MAP_OFFSET_X + x * MAP_TILE_SIZE,
        MAP_OFFSET_Y + y * MAP_TILE_SIZE,
        MAP_TILE_SIZE,
        MAP_TILE_SIZE
      );
      tileCount++;
    }
  }

  if (fadeProgress >= 1) {
    const blink = (Math.sin(time * 4) + 1) / 2;
    for (const s of state.sparkles) {
      if (s.discovered) continue;
      const px = MAP_OFFSET_X + s.x * MAP_TILE_SIZE;
      const py = MAP_OFFSET_Y + s.y * MAP_TILE_SIZE;
      const size = 6 + blink * 4;
      ctx.fillStyle = s.color;
      ctx.globalAlpha = 0.5 + blink * 0.5;
      ctx.fillRect(px - size / 2, py - size / 2, size, size);
      ctx.fillRect(px - 1, py - size / 2 - 3, 2, 3);
      ctx.fillRect(px - 1, py + size / 2, 2, 3);
      ctx.fillRect(px - size / 2 - 3, py - 1, 3, 2);
      ctx.fillRect(px + size / 2, py - 1, 3, 2);
      ctx.globalAlpha = 1;
    }
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px Courier New, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('地 图 探 索', 600 / 2, 110);
}

function renderParticles(ctx: CanvasRenderingContext2D, state: GameState): void {
  for (const p of state.particles) {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    const s = p.size;
    ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    ctx.fillRect(p.x - 1, p.y - s / 2 - 2, 2, 2);
    ctx.fillRect(p.x - 1, p.y + s / 2, 2, 2);
    ctx.fillRect(p.x - s / 2 - 2, p.y - 1, 2, 2);
    ctx.fillRect(p.x + s / 2, p.y - 1, 2, 2);
    ctx.globalAlpha = 1;
  }
}

function renderDragging(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (!state.dragging) return;
  const el = ELEMENTS[state.dragging.elementId];
  if (!el) return;
  ctx.globalAlpha = 0.7;
  drawElementIcon(
    ctx,
    state.dragging.x - ELEMENT_ICON_SIZE / 2,
    state.dragging.y - ELEMENT_ICON_SIZE / 2,
    ELEMENT_ICON_SIZE,
    el.color,
    RARITY_COLORS[el.rarity]
  );
  ctx.globalAlpha = 1;
}
