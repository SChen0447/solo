import type { GameState, Rune, RuneType, Particle } from './types';
import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  BOOKSHELF_X, BOOKSHELF_Y, BOOKSHELF_WIDTH, BOOKSHELF_HEIGHT,
  BOOKSHELF_COLS, BOOKSHELF_ROWS,
  SPELL_BOOK_X, SPELL_BOOK_Y, SPELL_BOOK_WIDTH, SPELL_BOOK_HEIGHT,
  RUNE_SIZE,
  GATE_X, GATE_Y, GATE_WIDTH, GATE_HEIGHT,
  GATE_CENTER_X, GATE_CENTER_Y, GATE_RADIUS,
  HINT_BUTTON_X, HINT_BUTTON_Y, HINT_BUTTON_WIDTH, HINT_BUTTON_HEIGHT,
  RESET_BUTTON_X, RESET_BUTTON_Y, RESET_BUTTON_RADIUS,
  RUNE_COLORS, RUNE_NAMES, SPELL_COLORS, BREATH_CYCLE
} from './constants';
import {
  getCastProgress, getEdgeFlameProgress, getGateShakeProgress,
  getGateErrorProgress, getOpenLightProgress, getRippleProgress,
  getHintCooldownProgress
} from './game';
import { breathe, easeOut } from './utils';

export function render(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawBackground(ctx);
  drawBookshelf(ctx);
  drawCandles(ctx, now);
  drawSpellBook(ctx, state, now);

  const shakeOffset = getGateShakeOffset(state, now);
  ctx.save();
  ctx.translate(shakeOffset, 0);
  drawGate(ctx, state, now);
  ctx.restore();

  drawRunes(ctx, state, now);
  drawHintButton(ctx, state, now);
  drawResetButton(ctx, now);
  drawHintText(ctx, state, now);
  drawRipple(ctx, state, now);
  drawOpenLight(ctx, state, now);
  drawVictoryText(ctx, state, now);
  drawParticles(ctx, state.particles);

  if (state.isCasting) {
    drawCastBeam(ctx, state, now);
  }
}

function getGateShakeOffset(state: GameState, now: number): number {
  const p = getGateShakeProgress(state, now);
  if (p <= 0) return 0;
  return Math.sin(now / 20) * 4 * p;
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
  const grad = ctx.createRadialGradient(
    CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 50,
    CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH
  );
  grad.addColorStop(0, '#2a1810');
  grad.addColorStop(0.5, '#1a0f08');
  grad.addColorStop(1, '#0a0502');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.15;
  for (let x = 0; x < CANVAS_WIDTH; x += 6) {
    ctx.fillStyle = x % 12 === 0 ? '#3d2817' : '#1a0f08';
    ctx.fillRect(x, 0, 3, CANVAS_HEIGHT);
  }
  ctx.restore();
}

function drawBookshelf(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  const shelfGrad = ctx.createLinearGradient(
    BOOKSHELF_X, BOOKSHELF_Y,
    BOOKSHELF_X + BOOKSHELF_WIDTH, BOOKSHELF_Y + BOOKSHELF_HEIGHT
  );
  shelfGrad.addColorStop(0, '#4a2c1a');
  shelfGrad.addColorStop(0.3, '#5a3a22');
  shelfGrad.addColorStop(0.7, '#3d2817');
  shelfGrad.addColorStop(1, '#2a1810');
  ctx.fillStyle = shelfGrad;
  roundRect(ctx, BOOKSHELF_X, BOOKSHELF_Y, BOOKSHELF_WIDTH, BOOKSHELF_HEIGHT, 8);
  ctx.fill();

  ctx.strokeStyle = '#1a0f08';
  ctx.lineWidth = 6;
  roundRect(ctx, BOOKSHELF_X, BOOKSHELF_Y, BOOKSHELF_WIDTH, BOOKSHELF_HEIGHT, 8);
  ctx.stroke();

  const cellW = BOOKSHELF_WIDTH / BOOKSHELF_COLS;
  const cellH = BOOKSHELF_HEIGHT / BOOKSHELF_ROWS;

  ctx.strokeStyle = '#6b4523';
  ctx.lineWidth = 3;
  for (let c = 1; c < BOOKSHELF_COLS; c++) {
    const x = BOOKSHELF_X + cellW * c;
    ctx.beginPath();
    ctx.moveTo(x, BOOKSHELF_Y + 10);
    ctx.lineTo(x, BOOKSHELF_Y + BOOKSHELF_HEIGHT - 10);
    ctx.stroke();
  }
  for (let r = 1; r < BOOKSHELF_ROWS; r++) {
    const y = BOOKSHELF_Y + cellH * r;
    ctx.beginPath();
    ctx.moveTo(BOOKSHELF_X + 10, y);
    ctx.lineTo(BOOKSHELF_X + BOOKSHELF_WIDTH - 10, y);
    ctx.stroke();
  }

  for (let r = 0; r < BOOKSHELF_ROWS; r++) {
    for (let c = 0; c < BOOKSHELF_COLS; c++) {
      const cx = BOOKSHELF_X + cellW * (c + 0.5);
      const cy = BOOKSHELF_Y + cellH * (r + 0.5);
      const bgGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 80);
      bgGrad.addColorStop(0, 'rgba(107, 69, 35, 0.4)');
      bgGrad.addColorStop(1, 'rgba(26, 15, 8, 0)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(BOOKSHELF_X + cellW * c + 10, BOOKSHELF_Y + cellH * r + 10, cellW - 20, cellH - 20);
    }
  }
  ctx.restore();
}

function drawCandles(ctx: CanvasRenderingContext2D, now: number): void {
  const candleCount = 5;
  const startX = BOOKSHELF_X + 30;
  const spacing = (BOOKSHELF_WIDTH - 60) / (candleCount - 1);
  const baseY = BOOKSHELF_Y - 20;

  for (let i = 0; i < candleCount; i++) {
    const x = startX + i * spacing;
    const flameSway = Math.sin(now / 200 + i * 0.5) * 3;
    const flameFlicker = 0.85 + Math.sin(now / 80 + i * 1.2) * 0.15;

    ctx.fillStyle = '#8b6914';
    ctx.fillRect(x - 6, baseY, 12, 30);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(x - 5, baseY + 2, 10, 26);

    const wickGrad = ctx.createLinearGradient(x, baseY - 8, x, baseY);
    wickGrad.addColorStop(0, '#000000');
    wickGrad.addColorStop(1, '#3d2817');
    ctx.strokeStyle = wickGrad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + flameSway * 0.3, baseY - 6);
    ctx.stroke();

    ctx.save();
    ctx.globalAlpha = flameFlicker;
    const flameGrad = ctx.createRadialGradient(
      x + flameSway, baseY - 14, 2,
      x + flameSway, baseY - 14, 18
    );
    flameGrad.addColorStop(0, '#ffffff');
    flameGrad.addColorStop(0.2, '#fdf6b0');
    flameGrad.addColorStop(0.5, '#ff9933');
    flameGrad.addColorStop(0.8, 'rgba(255, 80, 20, 0.5)');
    flameGrad.addColorStop(1, 'rgba(255, 50, 10, 0)');
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.ellipse(x + flameSway, baseY - 14, 10, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const glowGrad = ctx.createRadialGradient(x, baseY - 10, 5, x, baseY - 10, 60);
    glowGrad.addColorStop(0, 'rgba(255, 180, 80, 0.2)');
    glowGrad.addColorStop(1, 'rgba(255, 150, 50, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(x, baseY - 10, 60, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSpellBook(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
  ctx.save();

  const pageGrad = ctx.createLinearGradient(
    SPELL_BOOK_X, SPELL_BOOK_Y,
    SPELL_BOOK_X + SPELL_BOOK_WIDTH, SPELL_BOOK_Y + SPELL_BOOK_HEIGHT
  );
  pageGrad.addColorStop(0, '#ebe0c4');
  pageGrad.addColorStop(0.3, '#f5eedc');
  pageGrad.addColorStop(0.7, '#efe6cc');
  pageGrad.addColorStop(1, '#e0d4b2');
  ctx.fillStyle = pageGrad;
  roundRect(ctx, SPELL_BOOK_X, SPELL_BOOK_Y, SPELL_BOOK_WIDTH, SPELL_BOOK_HEIGHT, 6);
  ctx.fill();

  ctx.fillStyle = 'rgba(139, 105, 20, 0.03)';
  for (let i = 0; i < 40; i++) {
    const px = SPELL_BOOK_X + Math.random() * SPELL_BOOK_WIDTH;
    const py = SPELL_BOOK_Y + Math.random() * SPELL_BOOK_HEIGHT;
    ctx.fillRect(px, py, 2 + Math.random() * 3, 1);
  }

  ctx.strokeStyle = '#8b6914';
  ctx.lineWidth = 3;
  roundRect(ctx, SPELL_BOOK_X, SPELL_BOOK_Y, SPELL_BOOK_WIDTH, SPELL_BOOK_HEIGHT, 6);
  ctx.stroke();

  ctx.strokeStyle = '#a0845c';
  ctx.lineWidth = 1;
  roundRect(ctx, SPELL_BOOK_X + 8, SPELL_BOOK_Y + 8, SPELL_BOOK_WIDTH - 16, SPELL_BOOK_HEIGHT - 16, 4);
  ctx.stroke();

  drawCornerOrnament(ctx, SPELL_BOOK_X + 4, SPELL_BOOK_Y + 4, 0);
  drawCornerOrnament(ctx, SPELL_BOOK_X + SPELL_BOOK_WIDTH - 4, SPELL_BOOK_Y + 4, Math.PI / 2);
  drawCornerOrnament(ctx, SPELL_BOOK_X + SPELL_BOOK_WIDTH - 4, SPELL_BOOK_Y + SPELL_BOOK_HEIGHT - 4, Math.PI);
  drawCornerOrnament(ctx, SPELL_BOOK_X + 4, SPELL_BOOK_Y + SPELL_BOOK_HEIGHT - 4, -Math.PI / 2);

  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#3d2817';
  ctx.font = 'italic 14px Georgia, serif';
  const lines = [
    'Arcanum Mysterium',
    'Sigillum Magna',
    'Verbum Potens',
    'Lumen Sacrum'
  ];
  lines.forEach((line, i) => {
    ctx.fillText(line, SPELL_BOOK_X + 30, SPELL_BOOK_Y + 50 + i * 22);
  });
  ctx.restore();

  ctx.fillStyle = '#5a3a22';
  ctx.font = 'bold 18px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('咒语之书', SPELL_BOOK_X + SPELL_BOOK_WIDTH / 2, SPELL_BOOK_Y + 35);
  ctx.textAlign = 'left';

  drawSpellSlots(ctx, state);

  const edgeFlame = getEdgeFlameProgress(state, now);
  if (edgeFlame > 0 && state.castSpell) {
    drawEdgeFlames(ctx, state, now, edgeFlame);
  }

  ctx.restore();
}

function drawCornerOrnament(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#c9a227';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(18, 0);
  ctx.lineTo(18, 4);
  ctx.lineTo(6, 4);
  ctx.lineTo(6, 16);
  ctx.lineTo(0, 16);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#8b6914';
  ctx.beginPath();
  ctx.arc(8, 8, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSpellSlots(ctx: CanvasRenderingContext2D, state: GameState): void {
  const slotGap = 20;
  const totalWidth = 3 * RUNE_SIZE + 2 * slotGap;
  const startX = SPELL_BOOK_X + (SPELL_BOOK_WIDTH - totalWidth) / 2;
  const slotY = SPELL_BOOK_Y + SPELL_BOOK_HEIGHT * 0.55 - RUNE_SIZE / 2;

  state.spellSlots.forEach((slot, i) => {
    const x = startX + i * (RUNE_SIZE + slotGap);
    ctx.save();
    ctx.strokeStyle = slot.rune ? '#c9a227' : '#8b6914';
    ctx.lineWidth = 2;
    ctx.setLineDash(slot.rune ? [] : [4, 4]);
    ctx.globalAlpha = slot.rune ? 0.8 : 0.4;
    ctx.beginPath();
    ctx.arc(x + RUNE_SIZE / 2, slotY + RUNE_SIZE / 2, RUNE_SIZE / 2 + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
}

function drawEdgeFlames(ctx: CanvasRenderingContext2D, state: GameState, now: number, progress: number): void {
  if (!state.castSpell) return;
  const color = SPELL_COLORS[state.castSpell];
  const flicker = 0.7 + Math.sin(now / 40) * 0.3;

  ctx.save();
  ctx.globalAlpha = flicker * (1 - Math.abs(progress - 0.5) * 1.5);

  const sides = [
    { x1: SPELL_BOOK_X, y1: SPELL_BOOK_Y, x2: SPELL_BOOK_X + SPELL_BOOK_WIDTH, y2: SPELL_BOOK_Y },
    { x1: SPELL_BOOK_X + SPELL_BOOK_WIDTH, y1: SPELL_BOOK_Y, x2: SPELL_BOOK_X + SPELL_BOOK_WIDTH, y2: SPELL_BOOK_Y + SPELL_BOOK_HEIGHT },
    { x1: SPELL_BOOK_X + SPELL_BOOK_WIDTH, y1: SPELL_BOOK_Y + SPELL_BOOK_HEIGHT, x2: SPELL_BOOK_X, y2: SPELL_BOOK_Y + SPELL_BOOK_HEIGHT },
    { x1: SPELL_BOOK_X, y1: SPELL_BOOK_Y + SPELL_BOOK_HEIGHT, x2: SPELL_BOOK_X, y2: SPELL_BOOK_Y }
  ];

  sides.forEach(side => {
    const len = Math.hypot(side.x2 - side.x1, side.y2 - side.y1);
    const steps = Math.floor(len / 15);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = side.x1 + (side.x2 - side.x1) * t;
      const py = side.y1 + (side.y2 - side.y1) * t;
      const h = 12 + Math.sin(now / 60 + i * 0.7) * 8;
      const grad = ctx.createLinearGradient(px, py, px, py - h);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      const dx = side.y2 - side.y1;
      const dy = side.x1 - side.x2;
      const n = Math.hypot(dx, dy) || 1;
      const nx = dx / n;
      const ny = dy / n;
      ctx.ellipse(px + nx * h / 2, py + ny * h / 2, 6, h / 2, Math.atan2(ny, nx), 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.restore();
}

function drawRunes(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
  const sortedRunes = [...state.runes].sort((a, b) => {
    if (a.isDragging && !b.isDragging) return 1;
    if (!a.isDragging && b.isDragging) return -1;
    return 0;
  });
  sortedRunes.forEach(rune => drawRune(ctx, rune, now));
}

function drawRune(ctx: CanvasRenderingContext2D, rune: Rune, now: number): void {
  const colors = RUNE_COLORS[rune.type];
  const scale = rune.hoverScale * rune.pressScale;
  const breathVal = breathe(now, BREATH_CYCLE);
  const size = (RUNE_SIZE / 2) * scale;

  ctx.save();
  ctx.translate(rune.x, rune.y);

  if (rune.isDragging) {
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
    ctx.shadowBlur = 8;
  }

  const glowSize = size * 1.6 * breathVal;
  const glowGrad = ctx.createRadialGradient(0, 0, size * 0.3, 0, 0, glowSize);
  glowGrad.addColorStop(0, colors.glow + '88');
  glowGrad.addColorStop(1, colors.glow + '00');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
  ctx.fill();

  const baseGrad = ctx.createRadialGradient(-size * 0.3, -size * 0.3, size * 0.1, 0, 0, size);
  baseGrad.addColorStop(0, lightenColor(colors.base, 0.2));
  baseGrad.addColorStop(0.5, colors.base);
  baseGrad.addColorStop(1, colors.edge);
  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = colors.edge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.clip();
  drawRuneTexture(ctx, rune.type, size, colors);
  ctx.restore();

  ctx.fillStyle = '#fdf6b0';
  ctx.font = `bold ${Math.floor(size * 0.7)}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(RUNE_NAMES[rune.type], 0, 1);

  ctx.restore();
}

function drawRuneTexture(ctx: CanvasRenderingContext2D, type: RuneType, size: number, colors: typeof RUNE_COLORS[RuneType]): void {
  ctx.strokeStyle = colors.glow;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.7;

  switch (type) {
    case 'fire':
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(
          Math.cos(a) * size * 0.5,
          Math.sin(a) * size * 0.3 - size * 0.2,
          Math.cos(a) * size * 0.8,
          Math.sin(a) * size * 0.8
        );
        ctx.stroke();
      }
      break;
    case 'water':
      for (let i = 0; i < 3; i++) {
        const y = -size * 0.4 + i * size * 0.3;
        ctx.beginPath();
        for (let x = -size; x <= size; x += 4) {
          const yy = y + Math.sin((x + i * 10) / size * Math.PI * 2) * size * 0.15;
          if (x === -size) ctx.moveTo(x, yy);
          else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
      break;
    case 'wind':
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const y = -size * 0.4 + i * size * 0.4;
        ctx.moveTo(-size * 0.8, y);
        ctx.quadraticCurveTo(-size * 0.2, y - size * 0.15, size * 0.3, y);
        ctx.quadraticCurveTo(size * 0.7, y + size * 0.15, size * 0.9, y);
        ctx.stroke();
      }
      break;
    case 'earth':
      ctx.beginPath();
      ctx.moveTo(-size * 0.6, size * 0.5);
      ctx.lineTo(0, -size * 0.6);
      ctx.lineTo(size * 0.6, size * 0.5);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.3, size * 0.2);
      ctx.lineTo(0, -size * 0.2);
      ctx.lineTo(size * 0.3, size * 0.2);
      ctx.stroke();
      break;
    case 'light':
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * size * 0.2, Math.sin(a) * size * 0.2);
        ctx.lineTo(Math.cos(a) * size * 0.7, Math.sin(a) * size * 0.7);
        ctx.stroke();
      }
      break;
    case 'dark':
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, size * (0.3 + i * 0.2), i * 0.5, i * 0.5 + Math.PI * 1.2);
        ctx.stroke();
      }
      break;
  }
  ctx.globalAlpha = 1;
}

function drawGate(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
  ctx.save();

  ctx.fillStyle = '#2a2018';
  roundRect(ctx, GATE_X - 10, GATE_Y - 10, GATE_WIDTH + 20, GATE_HEIGHT + 20, 4);
  ctx.fill();

  const gateGrad = ctx.createLinearGradient(GATE_X, GATE_Y, GATE_X + GATE_WIDTH, GATE_Y);
  gateGrad.addColorStop(0, '#3d3530');
  gateGrad.addColorStop(0.5, '#5a4f45');
  gateGrad.addColorStop(1, '#3d3530');
  ctx.fillStyle = gateGrad;
  roundRect(ctx, GATE_X, GATE_Y, GATE_WIDTH, GATE_HEIGHT, 4);
  ctx.fill();

  ctx.strokeStyle = '#1a1410';
  ctx.lineWidth = 3;
  for (let i = 0; i < 5; i++) {
    const y = GATE_Y + 40 + i * (GATE_HEIGHT - 80) / 4;
    ctx.beginPath();
    ctx.moveTo(GATE_X + 8, y);
    ctx.lineTo(GATE_X + GATE_WIDTH - 8, y);
    ctx.stroke();
  }

  const cx = GATE_CENTER_X;
  const cy = GATE_CENTER_Y;

  ctx.strokeStyle = '#8b6914';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, GATE_RADIUS + 8, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + now / 5000;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (GATE_RADIUS - 5), cy + Math.sin(a) * (GATE_RADIUS - 5));
    ctx.lineTo(cx + Math.cos(a) * (GATE_RADIUS + 5), cy + Math.sin(a) * (GATE_RADIUS + 5));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const errP = getGateErrorProgress(state, now);
  if (errP > 0) {
    ctx.save();
    ctx.globalAlpha = errP * 0.6;
    ctx.fillStyle = '#ff3030';
    ctx.beginPath();
    ctx.arc(cx, cy, GATE_RADIUS + 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  state.gateNodes.forEach((node, idx) => {
    const pulse = node.activated ? 1 : 0.8 + Math.sin(now / 400 + idx) * 0.2;
    const nodeR = 12;

    if (node.activated) {
      const glowGrad = ctx.createRadialGradient(node.x, node.y, 2, node.x, node.y, 40);
      glowGrad.addColorStop(0, 'rgba(253, 246, 176, 0.6)');
      glowGrad.addColorStop(1, 'rgba(253, 246, 176, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 40, 0, Math.PI * 2);
      ctx.fill();
    }

    const ng = ctx.createRadialGradient(node.x, node.y, 1, node.x, node.y, nodeR);
    if (node.activated) {
      ng.addColorStop(0, '#ffffff');
      ng.addColorStop(0.5, '#fdf6b0');
      ng.addColorStop(1, '#c9a227');
    } else {
      ng.addColorStop(0, '#3d3530');
      ng.addColorStop(0.7, '#2a2018');
      ng.addColorStop(1, '#1a1410');
    }
    ctx.fillStyle = ng;
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeR * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = node.activated ? '#8b6914' : '#4a3828';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeR, 0, Math.PI * 2);
    ctx.stroke();

    if (!node.activated) {
      ctx.strokeStyle = '#c9a227';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeR * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  });

  ctx.restore();
}

function drawHintButton(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
  ctx.save();
  const isCooldown = state.hintCooldown > now;
  const progress = getHintCooldownProgress(state, now);
  const isHover = !isCooldown && (now % 1000000 < 999999);

  ctx.fillStyle = isCooldown ? '#8a7b65' : '#d4c4a0';
  roundRect(ctx, HINT_BUTTON_X, HINT_BUTTON_Y, HINT_BUTTON_WIDTH, HINT_BUTTON_HEIGHT, 6);
  ctx.fill();

  ctx.strokeStyle = isCooldown ? '#5a4d38' : '#8b6914';
  ctx.lineWidth = 2;
  roundRect(ctx, HINT_BUTTON_X, HINT_BUTTON_Y, HINT_BUTTON_WIDTH, HINT_BUTTON_HEIGHT, 6);
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(HINT_BUTTON_X, HINT_BUTTON_Y + 5);
  ctx.quadraticCurveTo(HINT_BUTTON_X - 8, HINT_BUTTON_Y + HINT_BUTTON_HEIGHT / 2, HINT_BUTTON_X, HINT_BUTTON_Y + HINT_BUTTON_HEIGHT - 5);
  ctx.lineTo(HINT_BUTTON_X + 12, HINT_BUTTON_Y + HINT_BUTTON_HEIGHT - 2);
  ctx.quadraticCurveTo(HINT_BUTTON_X + 5, HINT_BUTTON_Y + HINT_BUTTON_HEIGHT / 2, HINT_BUTTON_X + 12, HINT_BUTTON_Y + 2);
  ctx.closePath();
  ctx.fillStyle = isCooldown ? '#6a5d48' : '#b8a880';
  ctx.fill();
  ctx.strokeStyle = isCooldown ? '#4a3d28' : '#6b4523';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(HINT_BUTTON_X + HINT_BUTTON_WIDTH, HINT_BUTTON_Y + 8);
  ctx.quadraticCurveTo(HINT_BUTTON_X + HINT_BUTTON_WIDTH + 6, HINT_BUTTON_Y + HINT_BUTTON_HEIGHT / 2, HINT_BUTTON_X + HINT_BUTTON_WIDTH, HINT_BUTTON_Y + HINT_BUTTON_HEIGHT - 8);
  ctx.lineTo(HINT_BUTTON_X + HINT_BUTTON_WIDTH - 10, HINT_BUTTON_Y + HINT_BUTTON_HEIGHT - 3);
  ctx.quadraticCurveTo(HINT_BUTTON_X + HINT_BUTTON_WIDTH - 3, HINT_BUTTON_Y + HINT_BUTTON_HEIGHT / 2, HINT_BUTTON_X + HINT_BUTTON_WIDTH - 10, HINT_BUTTON_Y + 3);
  ctx.closePath();
  ctx.fillStyle = isCooldown ? '#6a5d48' : '#b8a880';
  ctx.fill();
  ctx.strokeStyle = isCooldown ? '#4a3d28' : '#6b4523';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  if (isCooldown) {
    const cx = HINT_BUTTON_X + HINT_BUTTON_WIDTH / 2;
    const cy = HINT_BUTTON_Y + HINT_BUTTON_HEIGHT / 2;
    ctx.strokeStyle = '#3d2817';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy - 5, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy + 3);
    ctx.lineTo(cx, cy + 15);
    ctx.stroke();
    ctx.fillStyle = '#3d2817';
    ctx.fillRect(cx - 10, cy + 15, 20, 3);

    ctx.save();
    ctx.translate(cx, cy - 5);
    ctx.rotate((1 - progress) * Math.PI * 4 + now / 200);
    ctx.fillStyle = '#c9a227';
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((i / 3) * Math.PI * 2);
      ctx.beginPath();
      ctx.ellipse(0, -4, 2, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  } else {
    ctx.fillStyle = '#3d2817';
    ctx.font = 'bold 16px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('神秘卷轴', HINT_BUTTON_X + HINT_BUTTON_WIDTH / 2, HINT_BUTTON_Y + HINT_BUTTON_HEIGHT / 2);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  if (isHover && !isCooldown) {
    void isHover;
  }

  ctx.restore();
}

function drawResetButton(ctx: CanvasRenderingContext2D, now: number): void {
  ctx.save();

  const bgGrad = ctx.createRadialGradient(
    RESET_BUTTON_X - 5, RESET_BUTTON_Y - 5, 2,
    RESET_BUTTON_X, RESET_BUTTON_Y, RESET_BUTTON_RADIUS
  );
  bgGrad.addColorStop(0, '#5a3a22');
  bgGrad.addColorStop(1, '#2a1810');
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.arc(RESET_BUTTON_X, RESET_BUTTON_Y, RESET_BUTTON_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#8b6914';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(RESET_BUTTON_X, RESET_BUTTON_Y, RESET_BUTTON_RADIUS, 0, Math.PI * 2);
  ctx.stroke();

  ctx.save();
  ctx.translate(RESET_BUTTON_X, RESET_BUTTON_Y);
  ctx.rotate(now / 1000 * 0.2);
  ctx.strokeStyle = '#c9a227';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, RESET_BUTTON_RADIUS - 8, -Math.PI * 0.3, Math.PI * 1.3);
  ctx.stroke();

  ctx.fillStyle = '#c9a227';
  ctx.beginPath();
  ctx.moveTo(-RESET_BUTTON_RADIUS + 6, -6);
  ctx.lineTo(-RESET_BUTTON_RADIUS + 14, 0);
  ctx.lineTo(-RESET_BUTTON_RADIUS + 6, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function drawHintText(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
  if (!state.hintText) return;
  const elapsed = now - state.hintShowTime;
  const duration = 4000;
  let alpha = 1;
  if (elapsed < 400) {
    alpha = elapsed / 400;
  } else if (elapsed > duration - 600) {
    alpha = Math.max(0, (duration - elapsed) / 600);
  }

  ctx.save();
  ctx.globalAlpha = alpha;

  const text = state.hintText;
  ctx.font = 'italic 24px Georgia, serif';
  const metrics = ctx.measureText(text);
  const tw = metrics.width + 60;
  const th = 60;
  const tx = CANVAS_WIDTH / 2 - tw / 2;
  const ty = 40;

  ctx.fillStyle = 'rgba(245, 238, 220, 0.95)';
  roundRect(ctx, tx, ty, tw, th, 8);
  ctx.fill();

  ctx.strokeStyle = '#8b6914';
  ctx.lineWidth = 2;
  roundRect(ctx, tx, ty, tw, th, 8);
  ctx.stroke();

  ctx.fillStyle = '#3d2817';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, CANVAS_WIDTH / 2, ty + th / 2 + 2);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

function drawRipple(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
  const p = getRippleProgress(state, now);
  if (p <= 0) return;
  const radius = (1 - p) * 400;
  ctx.save();
  ctx.globalAlpha = p * 0.6;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = p * 0.2;
  ctx.lineWidth = 20;
  ctx.beginPath();
  ctx.arc(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawOpenLight(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
  const p = getOpenLightProgress(state, now);
  if (p <= 0) return;
  const eased = easeOut(p);
  ctx.save();
  const gapW = 2 + eased * 40;
  const grad = ctx.createLinearGradient(
    GATE_X + GATE_WIDTH / 2 - gapW, 0,
    GATE_X + GATE_WIDTH / 2 + gapW, 0
  );
  grad.addColorStop(0, 'rgba(253, 246, 176, 0)');
  grad.addColorStop(0.3, `rgba(253, 246, 176, ${eased * 0.7})`);
  grad.addColorStop(0.5, `rgba(255, 255, 255, ${eased * 0.9})`);
  grad.addColorStop(0.7, `rgba(253, 246, 176, ${eased * 0.7})`);
  grad.addColorStop(1, 'rgba(253, 246, 176, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(GATE_X - 20, GATE_Y - 40, GATE_WIDTH + 40, GATE_HEIGHT + 80);

  const haloR = eased * 300;
  const haloGrad = ctx.createRadialGradient(
    GATE_CENTER_X, GATE_CENTER_Y, 10,
    GATE_CENTER_X, GATE_CENTER_Y, haloR
  );
  haloGrad.addColorStop(0, `rgba(253, 246, 176, ${eased * 0.4})`);
  haloGrad.addColorStop(1, 'rgba(253, 246, 176, 0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(GATE_CENTER_X, GATE_CENTER_Y, haloR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawVictoryText(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
  if (!state.gateOpened) return;
  const p = getOpenLightProgress(state, now);
  if (p < 0.8) return;
  const textP = Math.min(1, (p - 0.8) / 0.2);
  ctx.save();
  ctx.globalAlpha = easeOut(textP);
  ctx.fillStyle = '#fdf6b0';
  ctx.font = 'bold 56px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 12;
  ctx.fillText('密室开启', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 80);
  ctx.textAlign = 'left';
  ctx.restore();
}

function drawCastBeam(ctx: CanvasRenderingContext2D, state: GameState, now: number): void {
  const p = getCastProgress(state, now);
  if (!state.castSpell || p <= 0) return;
  const eased = easeOut(p);
  const color = SPELL_COLORS[state.castSpell];

  const cx = SPELL_BOOK_X + SPELL_BOOK_WIDTH / 2;
  const cy = SPELL_BOOK_Y + SPELL_BOOK_HEIGHT / 2;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  const beamW = Math.max(SPELL_BOOK_WIDTH * 0.3, CANVAS_WIDTH * eased);
  const beamH = Math.max(SPELL_BOOK_HEIGHT * 0.3, CANVAS_HEIGHT * eased);

  const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(beamW, beamH) / 2);
  grad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * (1 - eased * 0.3)})`);
  grad.addColorStop(0.3, hexToRgba(color, 0.7 * (1 - eased * 0.3)));
  grad.addColorStop(0.7, hexToRgba(color, 0.3 * (1 - eased * 0.5)));
  grad.addColorStop(1, hexToRgba(color, 0));

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, beamW / 2, beamH / 2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = hexToRgba(color, 0.6);
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + now / 300;
    const r1 = 50 + eased * 100;
    const r2 = 200 + eased * 400;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  particles.forEach(p => {
    const lifeP = 1 - p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = lifeP;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * lifeP, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
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

function lightenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.min(255, Math.floor(r + (255 - r) * amount));
  const ng = Math.min(255, Math.floor(g + (255 - g) * amount));
  const nb = Math.min(255, Math.floor(b + (255 - b) * amount));
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
