import type { GameState, Block, Fragment, AmbientParticle } from './physics';

export interface UIState {
  hoveredBlockId: string | null;
  draggingBlockId: string | null;
  dragOffsetX: number;
  dragOffsetY: number;
  mouseX: number;
  mouseY: number;
  resetBtnHover: boolean;
  resetBtnPressed: boolean;
  resetBtnRotation: number;
  resetBtnScale: number;
  undoBtnHover: boolean;
  undoBtnPressed: boolean;
  undoBtnRotation: number;
  undoBtnScale: number;
  canUndo: boolean;
}

const shadowLookup: Map<string, string> = new Map();

function getShadowColor(alpha: number = 0.3): string {
  const key = alpha.toFixed(2);
  if (!shadowLookup.has(key)) {
    shadowLookup.set(key, `rgba(51, 51, 51, ${alpha})`);
  }
  return shadowLookup.get(key)!;
}

const glowLookup: Map<string, string> = new Map();

function getGlowColor(alpha: number = 0.1): string {
  const key = alpha.toFixed(2);
  if (!glowLookup.has(key)) {
    glowLookup.set(key, `rgba(255, 255, 255, ${alpha})`);
  }
  return glowLookup.get(key)!;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, state: GameState): void {
  const wobbleIntensity = Math.sin(state.globalWobble) * 0.5 + 0.5;
  const t = wobbleIntensity * 0.15;

  const gradient = ctx.createRadialGradient(w / 2, h * 0.4, 50, w / 2, h * 0.4, Math.max(w, h));
  const r1 = Math.round(13 + (22 - 13) * t);
  const g1 = Math.round(27 + (33 - 27) * t);
  const b1 = Math.round(42 + (62 - 42) * t);
  gradient.addColorStop(0, `rgb(${r1}, ${g1}, ${b1})`);
  gradient.addColorStop(1, '#1b263b');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

export function drawAmbientParticles(ctx: CanvasRenderingContext2D, particles: AmbientParticle[]): void {
  particles.forEach(p => {
    const flicker = Math.sin(p.phase * 2) * 0.2 + 0.8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(79, 195, 247, ${p.alpha * flicker})`;
    ctx.fill();
  });
}

export function drawGround(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const groundY = h - 50;
  const gradient = ctx.createLinearGradient(0, groundY, 0, h);
  gradient.addColorStop(0, '#2d3a4a');
  gradient.addColorStop(1, '#1a2332');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, groundY, w, 50);

  ctx.strokeStyle = 'rgba(79, 195, 247, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(w, groundY);
  ctx.stroke();
}

export function drawBlock(ctx: CanvasRenderingContext2D, block: Block, uiState: UIState): void {
  if (block.isRemoved) return;

  const isHovered = uiState.hoveredBlockId === block.id;
  const isDragging = uiState.draggingBlockId === block.id;
  const scale = isHovered && !isDragging ? 1.05 : 1;
  const wobbleX = block.wobbleAmplitude > 0 ? Math.sin(block.wobblePhase) * block.wobbleAmplitude : 0;

  let drawX = block.x + wobbleX;
  let drawY = block.y;

  if (isDragging) {
    drawX = uiState.mouseX + uiState.dragOffsetX;
    drawY = block.y;
  }

  let alpha = 1;
  if (block.isRemoving) {
    const p = block.removeProgress;
    if (p < 0.5) {
      alpha = 1 - p * 1.6;
    } else {
      alpha = 0.2 - (p - 0.5) * 0.4;
    }
    alpha = Math.max(0, alpha);
  }

  const compressedHeight = block.height * (1 - block.compressY);
  const w = block.width * scale;
  const h = compressedHeight * scale;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(drawX, drawY);
  ctx.rotate(block.angle);

  ctx.shadowColor = getShadowColor(0.3);
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 4;

  const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  grad.addColorStop(0, block.color);
  grad.addColorStop(1, block.colorSecondary);
  ctx.fillStyle = grad;
  ctx.fillRect(-w / 2, -h / 2, w, h);

  ctx.shadowColor = 'transparent';

  const highlightGrad = ctx.createLinearGradient(-w / 2, -h / 2, -w / 2, -h / 2 + h * 0.4);
  highlightGrad.addColorStop(0, getGlowColor(0.15));
  highlightGrad.addColorStop(1, getGlowColor(0));
  ctx.fillStyle = highlightGrad;
  ctx.fillRect(-w / 2, -h / 2, w, h * 0.4);

  let borderColor = '#8b5a2b';
  let borderWidth = 2;
  if (isHovered || isDragging) {
    borderColor = '#ffd700';
    borderWidth = 3;
  }
  if (block.hoverFlashTime > 0) {
    borderColor = '#ffffff';
    borderWidth = 3;
  }
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  ctx.strokeRect(-w / 2, -h / 2, w, h);

  ctx.restore();
}

export function drawFragments(ctx: CanvasRenderingContext2D, fragments: Fragment[]): void {
  fragments.forEach(f => {
    ctx.save();
    ctx.globalAlpha = f.alpha;
    ctx.translate(f.x, f.y);
    ctx.rotate(f.angle);

    ctx.fillStyle = f.color;
    ctx.fillRect(-f.width / 2, -f.height / 2, f.width, f.height);

    ctx.strokeStyle = hexToRgba('#000000', 0.3);
    ctx.lineWidth = 1;
    ctx.strokeRect(-f.width / 2, -f.height / 2, f.width, f.height);

    ctx.restore();
  });
}

export function drawFlash(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number): void {
  if (alpha <= 0) return;
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.fillRect(0, 0, w, h);
}

export function drawCollapseMessage(ctx: CanvasRenderingContext2D, w: number, h: number, collapseTime: number): void {
  if (collapseTime < 0.1) return;

  let alpha = 0;
  if (collapseTime < 0.5) {
    alpha = collapseTime / 0.5;
  } else if (collapseTime < 2.5) {
    alpha = 1;
  } else if (collapseTime < 3) {
    alpha = 1 - (collapseTime - 2.5) / 0.5;
  } else {
    return;
  }

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff6b6b';
  ctx.shadowColor = 'rgba(255, 107, 107, 0.8)';
  ctx.shadowBlur = 20;
  ctx.fillText('塔倒了！', w / 2, h / 2 - 50);
  ctx.font = '24px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 10;
  ctx.fillText('点击重置按钮重新开始', w / 2, h / 2 + 10);
  ctx.restore();
}

export function drawWinMessage(ctx: CanvasRenderingContext2D, w: number, h: number, score: number): void {
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#4fc3f7';
  ctx.shadowColor = 'rgba(79, 195, 247, 0.8)';
  ctx.shadowBlur = 20;
  ctx.fillText('恭喜通关！', w / 2, h / 2 - 50);
  ctx.font = '28px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.shadowBlur = 10;
  ctx.fillText(`最终得分：${score}`, w / 2, h / 2 + 10);
  ctx.restore();
}

export function drawScoreboard(ctx: CanvasRenderingContext2D, score: number, extracted: number): void {
  ctx.save();
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.shadowColor = 'rgba(79, 195, 247, 0.5)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`分数：${score}`, 20, 20);
  ctx.fillText(`已抽出：${extracted} / 45`, 20, 55);
  ctx.restore();
}

export function drawButtons(ctx: CanvasRenderingContext2D, w: number, h: number, uiState: UIState): void {
  const resetX = w - 50;
  const resetY = h - 50;
  drawCircularButton(
    ctx,
    resetX,
    resetY,
    30,
    uiState.resetBtnHover ? '#81d4fa' : '#4fc3f7',
    uiState.resetBtnRotation,
    uiState.resetBtnScale,
    'refresh'
  );

  const undoX = w - 120;
  const undoY = h - 50;
  const undoColor = uiState.canUndo
    ? uiState.undoBtnHover ? '#81d4fa' : '#4fc3f7'
    : '#4a5568';
  drawCircularButton(
    ctx,
    undoX,
    undoY,
    30,
    undoColor,
    uiState.undoBtnRotation,
    uiState.undoBtnScale,
    'undo'
  );
}

function drawCircularButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  rotation: number,
  scale: number,
  icon: 'refresh' | 'undo'
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(scale, scale);

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.shadowColor = hexToRgba(color, 0.6);
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (icon === 'refresh') {
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.55, -Math.PI * 0.7, Math.PI * 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(radius * 0.5, -radius * 0.4);
    ctx.lineTo(radius * 0.75, -radius * 0.2);
    ctx.lineTo(radius * 0.5, 0);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.55, -Math.PI * 0.6, Math.PI * 0.7, true);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-radius * 0.5, -radius * 0.4);
    ctx.lineTo(-radius * 0.75, -radius * 0.2);
    ctx.lineTo(-radius * 0.5, 0);
    ctx.stroke();
  }

  ctx.restore();
}

export function isPointInButton(x: number, y: number, btnX: number, btnY: number, radius: number): boolean {
  const dx = x - btnX;
  const dy = y - btnY;
  return dx * dx + dy * dy <= radius * radius;
}

export function render(ctx: CanvasRenderingContext2D, w: number, h: number, state: GameState, uiState: UIState): void {
  drawBackground(ctx, w, h, state);
  drawAmbientParticles(ctx, state.ambientParticles);
  drawGround(ctx, w, h);

  const sortedBlocks = [...state.blocks].sort((a, b) => {
    if (a.isRemoved && !b.isRemoved) return -1;
    if (!a.isRemoved && b.isRemoved) return 1;
    return a.layer - b.layer;
  });

  sortedBlocks.forEach(block => drawBlock(ctx, block, uiState));

  drawFragments(ctx, state.fragments);

  if (state.isCollapsed) {
    drawCollapseMessage(ctx, w, h, state.collapseTime);
  }
  if (state.gameWon && !state.isCollapsed) {
    drawWinMessage(ctx, w, h, state.score);
  }

  drawScoreboard(ctx, state.score, state.extractedCount);
  drawButtons(ctx, w, h, uiState);
  drawFlash(ctx, w, h, state.flashAlpha);
}
