import { Piece, GameState } from './pieces';
import { AnimationState, FlowLight, getPatternRingProgress, getTextDisplay } from './animations';

function noise(x: number, y: number, seed: number = 0): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const a = noise(ix, iy, seed);
  const b = noise(ix + 1, iy, seed);
  const c = noise(ix, iy + 1, seed);
  const d = noise(ix + 1, iy + 1, seed);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy;
}

function fractalNoise(x: number, y: number, seed: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += smoothNoise(x * frequency, y * frequency, seed + i * 100) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / maxValue;
}

export function drawWorkbench(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
  const gradient = ctx.createRadialGradient(width * 0.4, height * 0.5, 50, width * 0.4, height * 0.5, Math.max(width, height));
  gradient.addColorStop(0, '#6B4423');
  gradient.addColorStop(0.5, '#5C4033');
  gradient.addColorStop(1, '#3D1F14');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const n = fractalNoise(x * 0.01, y * 0.005, 42, 3);
      const woodLine = Math.sin(y * 0.02 + x * 0.003 + n * 5) * 0.5 + 0.5;
      const grain = Math.sin(y * 0.2 + n * 10) * 0.3;
      const alpha = (woodLine * 0.15 + grain * 0.1);
      ctx.fillStyle = `rgba(20, 10, 5, ${alpha})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  for (let i = 0; i < 500; i++) {
    const x = (i * 73) % width;
    const y = (i * 137) % height;
    const n = noise(x, y, 123);
    if (n > 0.95) {
      ctx.fillStyle = `rgba(0, 0, 0, ${(n - 0.95) * 2})`;
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
  }

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + time * 0.1;
    const dist = 100 + Math.sin(time * 0.3 + i) * 50;
    const cx = width * 0.4 + Math.cos(angle) * dist;
    const cy = height * 0.5 + Math.sin(angle) * dist;
    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 200);
    rg.addColorStop(0, 'rgba(139, 69, 19, 0.05)');
    rg.addColorStop(1, 'rgba(139, 69, 19, 0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.restore();
}

export function drawFlowLights(ctx: CanvasRenderingContext2D, lights: FlowLight[], time: number): void {
  lights.forEach(light => {
    ctx.save();
    ctx.translate(light.x, light.y);
    ctx.rotate(light.angle);

    const grad = ctx.createLinearGradient(0, 0, light.length, 0);
    grad.addColorStop(0, `rgba(255, 191, 0, 0)`);
    grad.addColorStop(0.3, `rgba(255, 191, 0, ${light.opacity * 0.5})`);
    grad.addColorStop(0.7, `rgba(255, 191, 0, ${light.opacity})`);
    grad.addColorStop(1, `rgba(255, 191, 0, 0)`);

    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const wobble = Math.sin(time * 2 + light.progress * 10) * 3;
    ctx.bezierCurveTo(
      light.length * 0.3, wobble,
      light.length * 0.6, -wobble,
      light.length, 0
    );
    ctx.stroke();
    ctx.restore();
  });
}

export function drawPiece(
  ctx: CanvasRenderingContext2D,
  piece: Piece,
  animState: AnimationState,
  time: number
): void {
  ctx.save();
  ctx.translate(piece.x, piece.y);
  ctx.rotate(piece.rotation);

  if (piece.isDragging) {
    ctx.globalAlpha = 0.7;
    ctx.shadowColor = 'rgba(255, 191, 0, 0.6)';
    ctx.shadowBlur = 20;
  } else {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
  }

  ctx.beginPath();
  piece.points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, -piece.height / 2, 0, piece.height / 2);
  grad.addColorStop(0, '#E8C48A');
  grad.addColorStop(0.3, '#D4A76A');
  grad.addColorStop(0.7, '#C49A5C');
  grad.addColorStop(1, '#A67C44');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.clip();

  for (let y = -piece.height; y < piece.height; y += 3) {
    for (let x = -piece.width; x < piece.width; x += 3) {
      const n = noise(x * 0.1, y * 0.1, piece.noiseSeed);
      if (n > 0.7) {
        const alpha = (n - 0.7) * 0.6;
        ctx.fillStyle = `rgba(100, 70, 30, ${alpha})`;
        ctx.fillRect(x, y, 3, 3);
      } else if (n < 0.3) {
        const alpha = (0.3 - n) * 0.4;
        ctx.fillStyle = `rgba(240, 210, 160, ${alpha})`;
        ctx.fillRect(x, y, 3, 3);
      }
    }
  }

  drawPiecePattern(ctx, piece, animState, time);

  ctx.restore();
  ctx.save();

  if (piece.isDragging) {
    ctx.translate(piece.x, piece.y);
    ctx.rotate(piece.rotation);
    ctx.beginPath();
    piece.points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255, 191, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  if (piece.isHighlighted) {
    ctx.translate(piece.x, piece.y);
    ctx.rotate(piece.rotation);
    const pulse = Math.sin(time * 4) * 0.5 + 0.5;
    ctx.beginPath();
    piece.points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.5 + pulse * 0.5})`;
    ctx.lineWidth = 3 + pulse * 2;
    ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
    ctx.shadowBlur = 15 + pulse * 10;
    ctx.stroke();
  }

  ctx.restore();
}

function drawPiecePattern(
  ctx: CanvasRenderingContext2D,
  piece: Piece,
  animState: AnimationState,
  _time: number
): void {
  const patternProgress = animState.completionAnimation ? animState.completionAnimation.patternProgress : 0;

  ctx.save();
  ctx.translate(piece.patternOffsetX, piece.patternOffsetY);

  const rings = [
    { y: -60, type: 'spiral', color: '#2a1810' },
    { y: -30, type: 'spiral', color: '#2a1810' },
    { y: 0, type: 'meander', color: '#2a1810' },
    { y: 30, type: 'spiral', color: '#2a1810' },
    { y: 60, type: 'meander', color: '#2a1810' }
  ];

  rings.forEach((ring, ringIndex) => {
    const ringProgress = getPatternRingProgress(animState, ringIndex, rings.length);
    if (ringProgress <= 0 && patternProgress > 0) return;
    if (patternProgress > 0 && ringProgress <= 0) return;

    if (patternProgress > 0) {
      const r = Math.floor(139 + (255 - 139) * ringProgress);
      const g = Math.floor(0 + (191 - 0) * ringProgress);
      const b = Math.floor(0);
      ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${ringProgress * 0.8})`;
      ctx.shadowBlur = 10 * ringProgress;
    } else {
      ctx.strokeStyle = ring.color;
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (ring.type === 'spiral') {
      drawSpiralPattern(ctx, ring.y, ringProgress, patternProgress);
    } else {
      drawMeanderPattern(ctx, ring.y, ringProgress, patternProgress);
    }
  });

  ctx.restore();
}

function drawSpiralPattern(ctx: CanvasRenderingContext2D, y: number, ringProgress: number, patternProgress: number): void {
  ctx.beginPath();
  const width = 160;
  const step = 20;
  let first = true;
  let totalPoints = 0;
  const points: { x: number; y: number }[] = [];

  for (let x = -width / 2; x <= width / 2; x += step) {
    const spiralY1 = y - 8;
    const spiralY2 = y + 8;
    points.push({ x: x, y: spiralY1 });
    points.push({ x: x + step / 2, y: spiralY2 });
    totalPoints += 2;
  }

  let drawCount = patternProgress > 0 ? Math.floor(totalPoints * ringProgress) : totalPoints;
  drawCount = Math.max(1, drawCount);

  for (let i = 0; i < Math.min(drawCount, points.length); i++) {
    const p = points[i];
    if (first) {
      ctx.moveTo(p.x, p.y);
      first = false;
    } else {
      ctx.lineTo(p.x, p.y);
    }
  }
  ctx.stroke();

  if (patternProgress > 0 && ringProgress > 0) {
    ctx.beginPath();
    for (let i = 0; i < Math.min(drawCount, points.length); i++) {
      const p = points[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.lineWidth = 4;
    ctx.strokeStyle = `rgba(255, 191, 0, ${ringProgress * 0.4})`;
    ctx.stroke();
  }
}

function drawMeanderPattern(ctx: CanvasRenderingContext2D, y: number, ringProgress: number, patternProgress: number): void {
  ctx.beginPath();
  const width = 160;
  const unit = 16;
  const points: { x: number; y: number }[] = [];

  for (let x = -width / 2; x < width / 2; x += unit * 2) {
    points.push({ x: x, y: y - 8 });
    points.push({ x: x + unit, y: y - 8 });
    points.push({ x: x + unit, y: y + 8 });
    points.push({ x: x + unit * 2, y: y + 8 });
    points.push({ x: x + unit * 2, y: y - 8 });
  }

  let drawCount = patternProgress > 0 ? Math.floor(points.length * ringProgress) : points.length;
  drawCount = Math.max(1, drawCount);

  for (let i = 0; i < Math.min(drawCount, points.length); i++) {
    const p = points[i];
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();

  if (patternProgress > 0 && ringProgress > 0) {
    ctx.beginPath();
    for (let i = 0; i < Math.min(drawCount, points.length); i++) {
      const p = points[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.lineWidth = 4;
    ctx.strokeStyle = `rgba(255, 191, 0, ${ringProgress * 0.4})`;
    ctx.stroke();
  }
}

export function drawHintButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  hintCount: number,
  time: number,
  isHovered: boolean
): void {
  const pulse = Math.sin(time * 2) * 0.3 + 0.7;
  const isDisabled = hintCount <= 0;

  ctx.save();

  if (!isDisabled) {
    const glowGrad = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius * 2);
    glowGrad.addColorStop(0, `rgba(255, 191, 0, ${0.2 * pulse})`);
    glowGrad.addColorStop(1, 'rgba(255, 191, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  const grad = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, radius);
  if (isDisabled) {
    grad.addColorStop(0, '#888888');
    grad.addColorStop(1, '#555555');
  } else if (isHovered) {
    grad.addColorStop(0, '#FFD700');
    grad.addColorStop(1, '#DAA520');
  } else {
    grad.addColorStop(0, '#FFBF00');
    grad.addColorStop(1, '#B8860B');
  }

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = isDisabled ? '#444' : '#8B6914';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = isDisabled ? '#aaa' : '#fff';
  ctx.font = 'bold 20px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', x, y - 2);

  ctx.font = '12px serif';
  ctx.fillText(`${hintCount}`, x, y + 14);

  ctx.restore();
}

export function drawResetButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  isHovered: boolean
): void {
  ctx.save();

  const grad = ctx.createLinearGradient(x, y, x, y + height);
  if (isHovered) {
    grad.addColorStop(0, '#FFD700');
    grad.addColorStop(1, '#DAA520');
  } else {
    grad.addColorStop(0, '#FFBF00');
    grad.addColorStop(1, '#B8860B');
  }

  ctx.fillStyle = grad;
  ctx.beginPath();
  const radius = 6;
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.fill();

  ctx.strokeStyle = '#8B6914';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('重新开始', x + width / 2, y + height / 2);

  ctx.restore();
}

export function drawTimer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  elapsedTime: number,
  animProgress: number
): void {
  const totalSeconds = Math.floor(elapsedTime / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  ctx.save();

  ctx.fillStyle = '#5C4033';
  ctx.fillRect(x - 70, y - 20, 140, 40);
  ctx.strokeStyle = '#8B6914';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 70, y - 20, 140, 40);

  const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const offsetY = (1 - animProgress) * -15;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - 65, y - 18, 130, 36);
  ctx.clip();

  ctx.font = 'bold 28px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#8B6914';
  ctx.shadowColor = 'rgba(255, 191, 0, 0.3)';
  ctx.shadowBlur = 5;
  ctx.fillText(timeStr, x, y + offsetY);

  if (animProgress < 1) {
    ctx.globalAlpha = animProgress;
    ctx.fillText(timeStr, x, y + offsetY + 15);
  }

  ctx.restore();
  ctx.restore();
}

export function drawParticles(ctx: CanvasRenderingContext2D, animState: AnimationState): void {
  animState.particles.forEach(p => {
    const alpha = p.life / p.maxLife;
    ctx.fillStyle = p.color + alpha + ')';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = p.color + (alpha * 0.3) + ')';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha * 2, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function drawCompletionText(ctx: CanvasRenderingContext2D, animState: AnimationState, centerX: number, y: number): void {
  const text = getTextDisplay(animState);
  if (!text) return;

  ctx.save();
  ctx.font = 'bold 48px "Microsoft YaHei", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.shadowColor = 'rgba(255, 191, 0, 0.8)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#fff';
  ctx.fillText(text, centerX, y);

  ctx.shadowBlur = 10;
  ctx.fillText(text, centerX, y);

  ctx.restore();
}

export function isPointInCircle(px: number, py: number, cx: number, cy: number, r: number): boolean {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

export function isPointInRect(px: number, py: number, x: number, y: number, w: number, h: number): boolean {
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

export function render(
  ctx: CanvasRenderingContext2D,
  gameState: GameState,
  animState: AnimationState,
  time: number,
  hoverState: { hint: boolean; reset: boolean }
): void {
  const { canvasWidth, canvasHeight } = gameState;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  drawWorkbench(ctx, canvasWidth, canvasHeight, time);
  drawFlowLights(ctx, animState.flowLights, time);

  const sortedPieces = [...gameState.pieces].sort((a, b) => {
    if (a.isDragging) return 1;
    if (b.isDragging) return -1;
    if (a.isPlaced && !b.isPlaced) return -1;
    if (!a.isPlaced && b.isPlaced) return 1;
    return 0;
  });

  sortedPieces.forEach(piece => {
    drawPiece(ctx, piece, animState, time);
  });

  drawParticles(ctx, animState);

  const hintX = canvasWidth - 80;
  const hintY = canvasHeight / 2;
  drawHintButton(ctx, hintX, hintY, 25, gameState.hintCount, time, hoverState.hint);

  const timerX = canvasWidth - 80;
  const timerY = 60;
  drawTimer(ctx, timerX, timerY, gameState.elapsedTime, animState.timerDisplay.animProgress);

  const resetW = 100;
  const resetH = 36;
  const resetX = timerX - resetW / 2;
  const resetY = timerY + 35;
  drawResetButton(ctx, resetX, resetY, resetW, resetH, hoverState.reset);

  if (animState.completionAnimation && animState.completionAnimation.phase === 'text') {
    drawCompletionText(ctx, animState, gameState.potCenterX, 100);
  }
}

export const UI = {
  hintButton: { x: 0, y: 0, r: 25 },
  resetButton: { x: 0, y: 0, w: 100, h: 36 }
};

export function updateUIPositions(canvasWidth: number, canvasHeight: number): void {
  UI.hintButton.x = canvasWidth - 80;
  UI.hintButton.y = canvasHeight / 2;
  UI.resetButton.x = canvasWidth - 80 - 50;
  UI.resetButton.y = 95;
}
