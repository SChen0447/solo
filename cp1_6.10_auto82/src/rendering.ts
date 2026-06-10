import {
  Stone,
  Particle,
  TRACK_LENGTH,
  TRACK_WIDTH,
  STONE_RADIUS,
  getHouseCenter,
  OUTER_RING_RADIUS,
  MIDDLE_RING_RADIUS,
  INNER_RING_RADIUS,
} from './physics';

export interface RenderState {
  stones: Stone[];
  particles: Particle[];
  currentTurn: 'red' | 'yellow';
  redScore: number;
  yellowScore: number;
  currentEnd: number;
  totalEnds: number;
  selectedStoneId: number | null;
  dragStart: { x: number; y: number } | null;
  dragCurrent: { x: number; y: number } | null;
  power: number;
  angle: number;
  isDragging: boolean;
  aiCountdown: number | null;
  screenShake: number;
  sweepProgress: number;
  sweepCooldown: number;
  sweepActive: boolean;
  gameOver: boolean;
  winner: 'red' | 'yellow' | 'draw' | null;
  mvpStoneId: number | null;
  flashEffect: number;
}

export function render(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  state: RenderState,
  time: number
): void {
  ctx.fillStyle = '#0b1d2e';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.save();
  if (state.screenShake > 0) {
    const shakeX = (Math.random() - 0.5) * state.screenShake * 5;
    const shakeY = (Math.random() - 0.5) * state.screenShake * 5;
    ctx.translate(shakeX, shakeY);
  }

  const minCanvasWidth = 1200;
  const scale = Math.min(
    canvasWidth / minCanvasWidth,
    canvasHeight / (TRACK_LENGTH + 100)
  );
  const trackDrawWidth = TRACK_WIDTH * scale;
  const trackDrawHeight = TRACK_LENGTH * scale;
  const offsetX = (canvasWidth - trackDrawWidth) / 2;
  const offsetY = (canvasHeight - trackDrawHeight) / 2;

  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  drawIce(ctx, time);
  drawBoundaries(ctx);
  drawHouse(ctx, 'far');
  drawHouse(ctx, 'near');
  drawParticles(ctx, state.particles);

  const sortedStones = [...state.stones].sort((a, b) => a.y - b.y);

  for (const stone of sortedStones) {
    if (stone.id === state.mvpStoneId && state.gameOver) {
      drawMVPGlow(ctx, stone, time);
    }
    if (stone.id === state.selectedStoneId && !state.gameOver) {
      drawSelectedGlow(ctx, stone, time);
    }
    drawStone(ctx, stone);
  }

  if (state.isDragging && state.dragStart && state.dragCurrent) {
    drawAimLine(ctx, state.dragStart, state.dragCurrent, state.power, state.angle);
  }

  if (state.aiCountdown !== null) {
    drawAICountdown(ctx, state.stones, state.aiCountdown);
  }

  if (state.flashEffect > 0) {
    ctx.fillStyle = `rgba(100, 150, 255, ${state.flashEffect * 0.3})`;
    ctx.fillRect(0, 0, TRACK_WIDTH, TRACK_LENGTH);
  }

  ctx.restore();

  drawHUD(
    ctx,
    canvasWidth,
    canvasHeight,
    state,
    time
  );

  if (state.gameOver) {
    drawGameOverModal(ctx, canvasWidth, canvasHeight, state, time);
  }
}

function drawIce(ctx: CanvasRenderingContext2D, time: number): void {
  const gradient = ctx.createRadialGradient(
    TRACK_WIDTH / 2,
    TRACK_LENGTH / 2,
    50,
    TRACK_WIDTH / 2,
    TRACK_LENGTH / 2,
    TRACK_LENGTH / 2
  );
  gradient.addColorStop(0, '#e8f2f8');
  gradient.addColorStop(0.3, '#d4e6f1');
  gradient.addColorStop(0.7, '#bdd8e8');
  gradient.addColorStop(1, '#a9cce3');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, TRACK_WIDTH, TRACK_LENGTH);

  ctx.save();
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 60; i++) {
    const x = (i * 137 + (time * 0.01) % 100) % TRACK_WIDTH;
    const y = (i * 263 + 50) % TRACK_LENGTH;
    const size = 20 + (i % 5) * 15;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.strokeStyle = 'rgba(150, 180, 210, 0.15)';
  ctx.lineWidth = 1;
  for (let y = 100; y < TRACK_LENGTH; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(TRACK_WIDTH, y);
    ctx.stroke();
  }
}

function drawBoundaries(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
  ctx.fillRect(0, 0, 10, TRACK_LENGTH);
  ctx.fillRect(TRACK_WIDTH - 10, 0, 10, TRACK_LENGTH);

  ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
  ctx.fillRect(0, 0, TRACK_WIDTH, 10);
  ctx.fillRect(0, TRACK_LENGTH - 10, TRACK_WIDTH, 10);
}

function drawHouse(ctx: CanvasRenderingContext2D, which: 'far' | 'near'): void {
  const { x, y } = getHouseCenter(which);

  ctx.save();
  const outerGrad = ctx.createRadialGradient(x, y, 0, x, y, OUTER_RING_RADIUS);
  outerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
  outerGrad.addColorStop(1, 'rgba(231, 76, 60, 0.3)');
  ctx.fillStyle = outerGrad;
  ctx.beginPath();
  ctx.arc(x, y, OUTER_RING_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.beginPath();
  ctx.arc(x, y, MIDDLE_RING_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(52, 152, 219, 0.7)';
  ctx.beginPath();
  ctx.arc(x, y, INNER_RING_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(231, 76, 60, 0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, OUTER_RING_RADIUS, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, MIDDLE_RING_RADIUS, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(52, 152, 219, 0.95)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, INNER_RING_RADIUS, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawStone(ctx: CanvasRenderingContext2D, stone: Stone): void {
  ctx.save();
  ctx.translate(stone.x, stone.y);
  ctx.rotate(stone.angle);

  const baseColor = stone.team === 'red' ? '#e74c3c' : '#f1c40f';

  ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 4;

  const bodyGrad = ctx.createRadialGradient(
    -STONE_RADIUS * 0.3,
    -STONE_RADIUS * 0.3,
    0,
    0,
    0,
    STONE_RADIUS
  );
  bodyGrad.addColorStop(0, lightenColor(baseColor, 40));
  bodyGrad.addColorStop(0.5, baseColor);
  bodyGrad.addColorStop(1, darkenColor(baseColor, 30));

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(0, 0, STONE_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = 'transparent';

  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + stone.angle * 0.5;
    const r1 = STONE_RADIUS * 0.3;
    const r2 = STONE_RADIUS * 0.9;
    ctx.strokeStyle = darkenColor(baseColor, 20);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * r1, Math.sin(angle) * r1);
    ctx.lineTo(Math.cos(angle) * r2, Math.sin(angle) * r2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = 'rgba(120, 120, 120, 0.6)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, STONE_RADIUS * 0.55, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(200, 200, 200, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, STONE_RADIUS * 0.65, 0, Math.PI * 2);
  ctx.stroke();

  const highlightGrad = ctx.createRadialGradient(
    -STONE_RADIUS * 0.4,
    -STONE_RADIUS * 0.4,
    0,
    -STONE_RADIUS * 0.3,
    -STONE_RADIUS * 0.3,
    STONE_RADIUS * 0.6
  );
  highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
  highlightGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = highlightGrad;
  ctx.beginPath();
  ctx.arc(0, 0, STONE_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(80, 80, 80, 0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, STONE_RADIUS, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawSelectedGlow(
  ctx: CanvasRenderingContext2D,
  stone: Stone,
  time: number
): void {
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.006);
  const alpha = 0.4 + pulse * 0.4;
  const radius = STONE_RADIUS + 8 + pulse * 4;

  ctx.save();
  const grad = ctx.createRadialGradient(
    stone.x,
    stone.y,
    STONE_RADIUS,
    stone.x,
    stone.y,
    radius
  );
  grad.addColorStop(0, `rgba(52, 152, 219, ${alpha})`);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(stone.x, stone.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMVPGlow(
  ctx: CanvasRenderingContext2D,
  stone: Stone,
  time: number
): void {
  const pulse = 0.5 + 0.5 * Math.sin(time * 0.004);
  const radius = STONE_RADIUS + 12 + pulse * 6;

  ctx.save();
  const grad = ctx.createRadialGradient(
    stone.x,
    stone.y,
    STONE_RADIUS,
    stone.x,
    stone.y,
    radius
  );
  grad.addColorStop(0, `rgba(255, 215, 0, 0.8)`);
  grad.addColorStop(0.5, `rgba(255, 215, 0, 0.4)`);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(stone.x, stone.y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(255, 215, 0, ${0.8 + pulse * 0.2})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(stone.x, stone.y, STONE_RADIUS + 5 + pulse * 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[]
): void {
  ctx.save();
  for (const p of particles) {
    const lifeRatio = p.life / p.maxLife;
    if (p.type === 'ice') {
      ctx.fillStyle = `rgba(255, 255, 255, ${lifeRatio * 0.6})`;
    } else {
      ctx.fillStyle = `rgba(255, 255, 200, ${lifeRatio})`;
    }
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * lifeRatio, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawAimLine(
  ctx: CanvasRenderingContext2D,
  start: { x: number; y: number },
  current: { x: number; y: number },
  power: number,
  angle: number
): void {
  ctx.save();
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(current.x, current.y);
  ctx.stroke();
  ctx.setLineDash([]);

  const lineLength = Math.sqrt(
    Math.pow(current.x - start.x, 2) + Math.pow(current.y - start.y, 2)
  );
  const maxLineLength = 150;
  const displayPower = Math.min(100, (lineLength / maxLineLength) * 100);

  const textX = (start.x + current.x) / 2;
  const textY = (start.y + current.y) / 2 - 20;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(textX - 40, textY - 15, 80, 28);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.strokeRect(textX - 40, textY - 15, 80, 28);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.round(displayPower)}%`, textX, textY);
  ctx.restore();
}

function drawAICountdown(
  ctx: CanvasRenderingContext2D,
  stones: Stone[],
  countdown: number
): void {
  const aiStone = stones.find((s) => s.team === 'yellow' && !s.stopped && s.vx === 0 && s.vy === 0);
  if (!aiStone) return;

  ctx.save();
  const pulse = 0.8 + 0.2 * Math.sin(Date.now() * 0.01);
  ctx.fillStyle = `rgba(241, 196, 15, ${pulse})`;
  ctx.font = 'bold 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 10;
  ctx.fillText(Math.ceil(countdown / 1000).toString(), aiStone.x, aiStone.y - 50);
  ctx.restore();
}

function drawHUD(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  state: RenderState,
  time: number
): void {
  const hudWidth = 200;
  const hudHeight = 150;
  const hudX = canvasWidth - hudWidth - 20;
  const hudY = 20;

  ctx.save();
  drawGlassPanel(ctx, hudX, hudY, hudWidth, hudHeight);

  ctx.fillStyle = '#87ceeb';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`第 ${state.currentEnd} / ${state.totalEnds} 局`, hudX + 15, hudY + 32);

  const turnText =
    state.currentTurn === 'red' ? '红队 (玩家)' : '黄队 (AI)';
  ctx.fillStyle = state.currentTurn === 'red' ? '#e74c3c' : '#f1c40f';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(turnText, hudX + 15, hudY + 55);

  ctx.fillStyle = '#e74c3c';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`红队: ${state.redScore.toFixed(1)}`, hudX + 15, hudY + 85);

  ctx.fillStyle = '#f1c40f';
  ctx.fillText(`黄队: ${state.yellowScore.toFixed(1)}`, hudX + 15, hudY + 115);

  const btnSize = 60;
  const btnX = canvasWidth - 90;
  const btnY = canvasHeight - 90;

  drawGlassPanel(ctx, btnX, btnY, btnSize, btnSize, btnSize / 2);

  ctx.strokeStyle = state.sweepCooldown > 0 ? 'rgba(100, 100, 100, 0.6)' : '#3498db';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(btnX + btnSize / 2, btnY + btnSize / 2, btnSize / 2 - 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * state.sweepProgress);
  ctx.stroke();

  if (state.sweepCooldown > 0) {
    ctx.fillStyle = 'rgba(100, 100, 100, 0.6)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(state.sweepCooldown / 1000)}s`, btnX + btnSize / 2, btnY + btnSize / 2 + 5);
  } else {
    ctx.fillStyle = state.sweepActive ? '#3498db' : '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('擦冰', btnX + btnSize / 2, btnY + btnSize / 2 - 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '10px sans-serif';
    ctx.fillText('[空格]', btnX + btnSize / 2, btnY + btnSize / 2 + 14);
  }

  if (state.sweepActive) {
    ctx.fillStyle = `rgba(52, 152, 219, ${0.3 + 0.2 * Math.sin(time * 0.01)})`;
    ctx.beginPath();
    ctx.arc(btnX + btnSize / 2, btnY + btnSize / 2, btnSize / 2 + 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawGlassPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number = 12
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;

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
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawGameOverModal(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  state: RenderState,
  time: number
): void {
  ctx.save();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const modalWidth = 400;
  const modalHeight = 300;
  const modalX = (canvasWidth - modalWidth) / 2;
  const modalY = (canvasHeight - modalHeight) / 2;

  const scaleAnim = Math.min(1, (time % 10000) / 300);
  const animProgress = scaleAnim >= 1 ? 1 : scaleAnim;
  const scale = 0.8 + animProgress * 0.2;

  ctx.translate(
    modalX + modalWidth / 2,
    modalY + modalHeight / 2
  );
  ctx.scale(scale, scale);
  ctx.translate(
    -(modalX + modalWidth / 2),
    -(modalY + modalHeight / 2)
  );

  drawGlassPanel(ctx, modalX, modalY, modalWidth, modalHeight, 20);

  ctx.textAlign = 'center';

  let title = '';
  let titleColor = '#ffffff';
  if (state.winner === 'red') {
    title = '🎉 胜利！';
    titleColor = '#e74c3c';
  } else if (state.winner === 'yellow') {
    title = '😔 失败';
    titleColor = '#f1c40f';
  } else {
    title = '🤝 平局';
  }

  ctx.fillStyle = titleColor;
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText(title, modalX + modalWidth / 2, modalY + 60);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('最终比分', modalX + modalWidth / 2, modalY + 100);

  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = '#e74c3c';
  ctx.fillText(`红队: ${state.redScore.toFixed(1)}`, modalX + modalWidth / 2, modalY + 140);
  ctx.fillStyle = '#f1c40f';
  ctx.fillText(`黄队: ${state.yellowScore.toFixed(1)}`, modalX + modalWidth / 2, modalY + 175);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '14px sans-serif';
  ctx.fillText('点击任意位置重新开始', modalX + modalWidth / 2, modalY + modalHeight - 30);

  ctx.restore();
}

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return `rgb(${R}, ${G}, ${B})`;
}

function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
  const B = Math.max(0, (num & 0x0000ff) - amt);
  return `rgb(${R}, ${G}, ${B})`;
}
