import { SimulationState, Brick } from './physics';

const BG_COLOR = '#F5E6C8';
const GRASS_COLOR = '#6B8E23';
const GRASS_DARK = '#556B2F';
const INNER_WALL_COLOR = '#808080';
const BRICK_COLOR = '#A0522D';
const BRICK_MORTAR = '#C8B8A0';
const TREBUCHET_WOOD = '#8B6914';
const TREBUCHET_DARK = '#5C4033';

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  canvasW: number,
  canvasH: number,
  wallBaseX: number,
  wallBaseY: number,
  trebuchetX: number,
  trebuchetY: number
): void {
  ctx.save();

  if (state.wallShakeOffset !== 0) {
    ctx.translate(0, state.wallShakeOffset);
  }

  drawBackground(ctx, canvasW, canvasH);
  drawGrass(ctx, canvasW, canvasH);
  drawInnerWall(ctx, wallBaseX, wallBaseY, state);
  drawWallBricks(ctx, state);
  drawScatteredBricks(ctx, state);
  drawTrebuchet(ctx, trebuchetX, trebuchetY, state);
  drawTrajectory(ctx, state);
  drawProjectile(ctx, state);
  drawParticles(ctx, state);
  drawFloatingTexts(ctx, state);

  ctx.restore();

  if (state.screenFlashAlpha > 0) {
    ctx.fillStyle = `rgba(255, 0, 0, ${state.screenFlashAlpha})`;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  drawHUD(ctx, state, canvasW);
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, w, h);

  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.6);
  skyGrad.addColorStop(0, '#87CEEB');
  skyGrad.addColorStop(1, BG_COLOR);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h * 0.6);

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, h * 0.55, w, h * 0.45);
}

function drawGrass(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const grassY = h * 0.78;
  const grassGrad = ctx.createLinearGradient(0, grassY, 0, h);
  grassGrad.addColorStop(0, GRASS_COLOR);
  grassGrad.addColorStop(1, GRASS_DARK);
  ctx.fillStyle = grassGrad;
  ctx.beginPath();
  ctx.moveTo(0, grassY);
  for (let x = 0; x <= w; x += 20) {
    ctx.lineTo(x, grassY + Math.sin(x * 0.02 + Date.now() * 0.001) * 4);
  }
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#7CFC00';
  ctx.lineWidth = 1;
  for (let x = 10; x < w; x += 15) {
    const baseY = grassY + Math.sin(x * 0.02 + Date.now() * 0.001) * 4;
    const sway = Math.sin(Date.now() * 0.002 + x) * 3;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + sway, baseY - 6 - Math.random() * 4);
    ctx.stroke();
  }
}

function drawInnerWall(ctx: CanvasRenderingContext2D, baseX: number, baseY: number, state: SimulationState): void {
  const dim = { totalW: 6 * 45, totalH: 8 * 25 };
  ctx.fillStyle = INNER_WALL_COLOR;
  ctx.fillRect(baseX - 3, baseY - dim.totalH - 5, dim.totalW + 6, dim.totalH + 5);

  ctx.fillStyle = '#696969';
  for (let y = baseY - dim.totalH; y < baseY; y += 30) {
    for (let x = baseX; x < baseX + dim.totalW; x += 40) {
      const ox = (Math.floor(y / 30) % 2) * 20;
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + ox, y, 38, 28);
    }
  }
}

function drawWallBricks(ctx: CanvasRenderingContext2D, state: SimulationState): void {
  for (const brick of state.bricks) {
    if (!brick.alive || brick.scattered) continue;
    drawSingleBrick(ctx, brick);
  }
}

function drawSingleBrick(ctx: CanvasRenderingContext2D, brick: Brick): void {
  const { x, y, w, h } = brick;

  ctx.fillStyle = BRICK_MORTAR;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);

  const brickGrad = ctx.createLinearGradient(x, y, x, y + h);
  brickGrad.addColorStop(0, '#B5651D');
  brickGrad.addColorStop(0.5, BRICK_COLOR);
  brickGrad.addColorStop(1, '#8B4513');
  ctx.fillStyle = brickGrad;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(x, y, w, h * 0.3);

  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fillRect(x, y + h * 0.7, w, h * 0.3);

  if (brick.cracked && brick.crackLines.length > 0) {
    ctx.strokeStyle = '#2F1B0E';
    ctx.lineWidth = 1.5;
    for (const cl of brick.crackLines) {
      ctx.beginPath();
      ctx.moveTo(x + cl.x1, y + cl.y1);
      ctx.lineTo(x + cl.x2, y + cl.y2);
      ctx.stroke();
    }
  }
}

function drawScatteredBricks(ctx: CanvasRenderingContext2D, state: SimulationState): void {
  for (const brick of state.bricks) {
    if (!brick.scattered) continue;
    const alpha = Math.max(0, brick.scatterLife / 2);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(brick.x + brick.w / 2, brick.y + brick.h / 2);
    ctx.rotate(brick.scatterRotation);
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-brick.w / 2, -brick.h / 2, brick.w, brick.h);
    ctx.restore();
  }
}

function drawTrebuchet(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  state: SimulationState
): void {
  ctx.save();

  const glowGrad = ctx.createRadialGradient(tx, ty - 20, 10, tx, ty - 20, 80);
  glowGrad.addColorStop(0, 'rgba(180, 140, 80, 0.2)');
  glowGrad.addColorStop(1, 'rgba(180, 140, 80, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(tx - 80, ty - 100, 160, 160);

  ctx.fillStyle = TREBUCHET_DARK;
  ctx.fillRect(tx - 25, ty - 5, 8, 20);
  ctx.fillRect(tx + 17, ty - 5, 8, 20);

  ctx.fillStyle = TREBUCHET_WOOD;
  ctx.beginPath();
  ctx.arc(tx - 21, ty + 18, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(tx + 21, ty + 18, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#5C4033';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(tx - 21 + Math.cos(a) * 3, ty + 18 + Math.sin(a) * 3);
    ctx.lineTo(tx - 21 + Math.cos(a) * 7, ty + 18 + Math.sin(a) * 7);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tx + 21 + Math.cos(a) * 3, ty + 18 + Math.sin(a) * 3);
    ctx.lineTo(tx + 21 + Math.cos(a) * 7, ty + 18 + Math.sin(a) * 7);
    ctx.stroke();
  }

  ctx.fillStyle = TREBUCHET_DARK;
  ctx.fillRect(tx - 30, ty - 8, 60, 8);

  ctx.fillStyle = TREBUCHET_WOOD;
  ctx.fillRect(tx - 4, ty - 8, 8, -55);

  const armAngle = (state.trebuchetAngle * Math.PI) / 180;
  const armLen = 70;
  const pivotX = tx;
  const pivotY = ty - 63;

  ctx.save();
  ctx.translate(pivotX, pivotY);

  if (state.trebuchetSpringCompress > 0) {
    const compressOffset = state.trebuchetSpringCompress * 15;
    ctx.save();
    ctx.translate(0, 25);
    ctx.fillStyle = '#8B8682';
    const springW = 8;
    const springH = 25 - compressOffset;
    const segments = 6;
    const segH = springH / segments;
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const sx = i % 2 === 0 ? -springW / 2 : springW / 2;
      ctx.lineTo(sx, -i * segH);
    }
    ctx.stroke();
    ctx.restore();
  }

  ctx.rotate(-armAngle + Math.PI / 2);

  ctx.fillStyle = TREBUCHET_WOOD;
  ctx.fillRect(-3, -armLen * 0.4, 6, armLen);

  ctx.fillStyle = '#4A4A4A';
  ctx.fillRect(-8, -armLen * 0.4 - 5, 16, 10);

  ctx.fillStyle = TREBUCHET_DARK;
  ctx.fillRect(4, armLen * 0.6 - 5, 12, 15);

  ctx.restore();

  ctx.fillStyle = '#555';
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawTrajectory(ctx: CanvasRenderingContext2D, state: SimulationState): void {
  const trail = state.projectile.trail;
  if (trail.length < 2) return;

  const now = Date.now();
  ctx.save();
  ctx.setLineDash([8, 6]);

  for (let i = 1; i < trail.length; i++) {
    const prev = trail[i - 1];
    const curr = trail[i];
    const age = curr.age;
    const maxAge = 2.0;
    if (age > maxAge) continue;

    const alpha = 1 - age / maxAge;
    ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(curr.x, curr.y);
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.restore();
}

function drawProjectile(ctx: CanvasRenderingContext2D, state: SimulationState): void {
  if (!state.projectile.active) return;
  const p = state.projectile;

  ctx.save();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.beginPath();
  ctx.ellipse(p.x + 5, p.y + 10, p.radius * 0.8, p.radius * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);

  const stoneGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, p.radius);
  stoneGrad.addColorStop(0, '#A9A9A9');
  stoneGrad.addColorStop(0.7, '#808080');
  stoneGrad.addColorStop(1, '#5A5A5A');
  ctx.fillStyle = stoneGrad;
  ctx.beginPath();
  ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#6B6B6B';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const a1 = Math.random() * Math.PI * 2;
    const r1 = Math.random() * p.radius * 0.5;
    const a2 = a1 + Math.random() * 1 - 0.5;
    const r2 = Math.random() * p.radius * 0.8 + p.radius * 0.2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a1) * r1, Math.sin(a1) * r1);
    ctx.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, state: SimulationState): void {
  for (const p of state.particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    if (p.type === 'dust') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }
  ctx.globalAlpha = 1;
}

function drawFloatingTexts(ctx: CanvasRenderingContext2D, state: SimulationState): void {
  for (const ft of state.floatingTexts) {
    const alpha = Math.max(0, ft.life / ft.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = '#FF4444';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.textAlign = 'center';
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}

function drawHUD(ctx: CanvasRenderingContext2D, state: SimulationState, canvasW: number): void {
  drawStabilityBar(ctx, state);
  drawStats(ctx, state, canvasW);
  drawTitle(ctx, canvasW);
}

function drawStabilityBar(ctx: CanvasRenderingContext2D, state: SimulationState): void {
  const x = 20;
  const y = 20;
  const w = 200;
  const h = 24;

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

  ctx.fillStyle = '#333';
  ctx.fillRect(x, y, w, h);

  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, '#FF0000');
  grad.addColorStop(0.5, '#FFFF00');
  grad.addColorStop(1, '#00FF00');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w * (state.stability / 100), h);

  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`城墙稳定度: ${Math.round(state.stability)}%`, x + w / 2, y + 17);
}

function drawStats(ctx: CanvasRenderingContext2D, state: SimulationState, canvasW: number): void {
  const x = canvasW - 300;
  const y = 30;

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x - 10, y - 20, 250, 55);

  ctx.fillStyle = '#FFD700';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`🏹 发射次数: ${state.launchCount}`, x, y);

  ctx.fillStyle = '#FF6347';
  ctx.fillText(`💥 总伤害: ${state.totalDamage}`, x, y + 25);
}

function drawTitle(ctx: CanvasRenderingContext2D, canvasW: number): void {
  ctx.save();
  ctx.font = '36px UnifrakturMaguntia, cursive';
  ctx.fillStyle = '#5C4033';
  ctx.textAlign = 'center';
  ctx.fillText('⚔ 投石机攻城战 ⚔', canvasW / 2, 45);
  ctx.restore();
}
