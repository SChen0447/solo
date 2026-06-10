import type { DayCycleResult } from './dayCycle';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 400;

function applyAmbientToColor(hex: string, ambient: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  let r = parseInt(result[1], 16);
  let g = parseInt(result[2], 16);
  let b = parseInt(result[3], 16);
  r = Math.round(Math.max(0, Math.min(255, r * ambient)));
  g = Math.round(Math.max(0, Math.min(255, g * ambient)));
  b = Math.round(Math.max(0, Math.min(255, b * ambient)));
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hexStr = x.toString(16);
        return hexStr.length === 1 ? '0' + hexStr : hexStr;
      })
      .join('')
  );
}

function drawSky(ctx: CanvasRenderingContext2D, cycle: DayCycleResult): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT * 0.65);
  gradient.addColorStop(0, applyAmbientToColor(cycle.skyColorTop, cycle.ambientLight));
  gradient.addColorStop(1, applyAmbientToColor(cycle.skyColorBottom, cycle.ambientLight));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawMountains(ctx: CanvasRenderingContext2D, cycle: DayCycleResult): void {
  const mountainColor = applyAmbientToColor(cycle.mountainColor, cycle.ambientLight);
  const baseY = CANVAS_HEIGHT * 0.55;

  ctx.fillStyle = mountainColor;
  ctx.beginPath();
  ctx.moveTo(0, baseY + 40);
  ctx.quadraticCurveTo(80, baseY - 60, 160, baseY);
  ctx.quadraticCurveTo(240, baseY + 30, 320, baseY - 40);
  ctx.quadraticCurveTo(400, baseY - 80, 480, baseY - 10);
  ctx.quadraticCurveTo(560, baseY + 40, 640, baseY - 30);
  ctx.quadraticCurveTo(720, baseY - 70, 800, baseY + 20);
  ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.lineTo(0, CANVAS_HEIGHT);
  ctx.closePath();
  ctx.fill();

  const darkerMountain = applyAmbientToColor('#1a1a2a', cycle.ambientLight * 0.7);
  ctx.fillStyle = darkerMountain;
  ctx.beginPath();
  ctx.moveTo(0, baseY + 80);
  ctx.quadraticCurveTo(120, baseY, 240, baseY + 40);
  ctx.quadraticCurveTo(360, baseY + 70, 480, baseY + 20);
  ctx.quadraticCurveTo(600, baseY - 20, 720, baseY + 50);
  ctx.lineTo(CANVAS_WIDTH, baseY + 90);
  ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.lineTo(0, CANVAS_HEIGHT);
  ctx.closePath();
  ctx.fill();
}

function drawGround(ctx: CanvasRenderingContext2D, cycle: DayCycleResult): void {
  const groundTop = CANVAS_HEIGHT * 0.7;
  const gradient = ctx.createLinearGradient(0, groundTop, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, applyAmbientToColor(cycle.groundColorTop, cycle.ambientLight));
  gradient.addColorStop(1, applyAmbientToColor(cycle.groundColorBottom, cycle.ambientLight));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, groundTop, CANVAS_WIDTH, CANVAS_HEIGHT - groundTop);

  const grassColor = applyAmbientToColor('#52b788', cycle.ambientLight);
  ctx.fillStyle = grassColor;
  for (let x = 0; x < CANVAS_WIDTH; x += 6) {
    const height = 4 + Math.sin(x * 0.3) * 2;
    ctx.fillRect(x, groundTop - height, 3, height);
  }
}

function drawShadow(ctx: CanvasRenderingContext2D, cycle: DayCycleResult): void {
  const treeX = CANVAS_WIDTH * 0.5;
  const groundY = CANVAS_HEIGHT * 0.7;
  const shadowCenterX = treeX + cycle.shadowOffsetX;
  const shadowCenterY = groundY + cycle.shadowOffsetY * 0.3;

  ctx.save();
  ctx.globalAlpha = cycle.shadowOpacity;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.ellipse(shadowCenterX, shadowCenterY, 70, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTree(ctx: CanvasRenderingContext2D, cycle: DayCycleResult): void {
  const treeX = CANVAS_WIDTH * 0.5;
  const groundY = CANVAS_HEIGHT * 0.7;
  const trunkWidth = 36;
  const trunkHeight = 100;
  const trunkX = treeX - trunkWidth / 2;
  const trunkY = groundY - trunkHeight;

  const trunkColor = applyAmbientToColor('#6b4423', cycle.ambientLight);
  const trunkDark = applyAmbientToColor('#4a2f17', cycle.ambientLight);
  ctx.fillStyle = trunkColor;
  ctx.fillRect(trunkX, trunkY, trunkWidth, trunkHeight);

  ctx.fillStyle = trunkDark;
  ctx.fillRect(trunkX, trunkY, 6, trunkHeight);
  ctx.fillRect(trunkX + trunkWidth - 6, trunkY, 6, trunkHeight);

  for (let i = 0; i < 5; i++) {
    ctx.fillRect(trunkX + 8 + (i % 2) * 10, trunkY + 15 + i * 18, 4, 8);
  }

  const leafColor = applyAmbientToColor('#1b4332', cycle.ambientLight);
  const leafLight = applyAmbientToColor('#2d6a4f', cycle.ambientLight);
  const leafHighlight = applyAmbientToColor('#40916c', cycle.ambientLight);

  const crownCenters = [
    { x: treeX, y: trunkY - 30, r: 55 },
    { x: treeX - 40, y: trunkY - 10, r: 42 },
    { x: treeX + 40, y: trunkY - 10, r: 42 },
    { x: treeX - 20, y: trunkY - 55, r: 38 },
    { x: treeX + 20, y: trunkY - 55, r: 38 },
    { x: treeX, y: trunkY - 75, r: 32 },
  ];

  ctx.fillStyle = leafColor;
  for (const c of crownCenters) {
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = leafLight;
  for (const c of crownCenters) {
    ctx.beginPath();
    ctx.arc(c.x - 8, c.y - 8, c.r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = leafHighlight;
  for (const c of crownCenters) {
    ctx.beginPath();
    ctx.arc(c.x - 15, c.y - 15, c.r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function renderScene(ctx: CanvasRenderingContext2D, cycle: DayCycleResult): void {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawSky(ctx, cycle);
  drawMountains(ctx, cycle);
  drawGround(ctx, cycle);
  drawShadow(ctx, cycle);
  drawTree(ctx, cycle);
}
