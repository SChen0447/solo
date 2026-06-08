import { Ball, Obstacle, Particle } from './physics';
import { LevelState, LightPoint } from './level';

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function render(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  ball: Ball | null,
  trail: TrailPoint[],
  levelState: LevelState,
  particles: Particle[],
  isAiming: boolean,
  mousePos: { x: number; y: number },
  launchPos: { x: number; y: number }
): void {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  drawBackground(ctx, canvasWidth, canvasHeight);
  drawObstacles(ctx, levelState.obstacles);
  drawLights(ctx, levelState);
  drawParticles(ctx, particles);

  if (ball) {
    drawTrail(ctx, trail);
    drawBall(ctx, ball);
  }

  if (isAiming) {
    drawLauncher(ctx, launchPos);
    drawAimLine(ctx, launchPos, mousePos);
  } else if (!ball) {
    drawLauncher(ctx, launchPos);
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#0a0a2e');
  gradient.addColorStop(1, '#1a1a3e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  for (let i = 0; i < 50; i++) {
    const x = (i * 73) % width;
    const y = (i * 97) % height;
    const size = (i % 3) + 1;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawObstacles(ctx: CanvasRenderingContext2D, obstacles: Obstacle[]): void {
  for (const obstacle of obstacles) {
    if (obstacle.type === 'rect') {
      drawRectObstacle(ctx, obstacle);
    } else if (obstacle.type === 'circle') {
      drawCircleObstacle(ctx, obstacle);
    } else if (obstacle.type === 'slope') {
      drawSlopeObstacle(ctx, obstacle);
    }
  }
}

function drawRectObstacle(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number }
): void {
  const gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.height);
  gradient.addColorStop(0, '#4a5568');
  gradient.addColorStop(1, '#2d3748');

  ctx.fillStyle = gradient;
  ctx.strokeStyle = '#718096';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.width, rect.height, 4);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rect.x + 2, rect.y + 2);
  ctx.lineTo(rect.x + rect.width - 2, rect.y + 2);
  ctx.stroke();
}

function drawCircleObstacle(
  ctx: CanvasRenderingContext2D,
  circle: { x: number; y: number; radius: number }
): void {
  const gradient = ctx.createRadialGradient(
    circle.x - circle.radius * 0.3,
    circle.y - circle.radius * 0.3,
    0,
    circle.x,
    circle.y,
    circle.radius
  );
  gradient.addColorStop(0, '#6b7280');
  gradient.addColorStop(1, '#374151');

  ctx.fillStyle = gradient;
  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.arc(
    circle.x - circle.radius * 0.25,
    circle.y - circle.radius * 0.25,
    circle.radius * 0.3,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

function drawSlopeObstacle(
  ctx: CanvasRenderingContext2D,
  slope: { x: number; y: number; width: number; height: number; direction: 'left' | 'right' }
): void {
  const gradient = ctx.createLinearGradient(
    slope.x,
    slope.y,
    slope.x,
    slope.y + slope.height
  );
  gradient.addColorStop(0, '#5a6370');
  gradient.addColorStop(1, '#334155');

  ctx.fillStyle = gradient;
  ctx.strokeStyle = '#7d8999';
  ctx.lineWidth = 2;

  ctx.beginPath();
  if (slope.direction === 'right') {
    ctx.moveTo(slope.x, slope.y + slope.height);
    ctx.lineTo(slope.x + slope.width, slope.y);
    ctx.lineTo(slope.x + slope.width, slope.y + slope.height);
  } else {
    ctx.moveTo(slope.x, slope.y);
    ctx.lineTo(slope.x + slope.width, slope.y + slope.height);
    ctx.lineTo(slope.x, slope.y + slope.height);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawLights(ctx: CanvasRenderingContext2D, state: LevelState): void {
  for (const light of state.lights) {
    drawLight(ctx, light, state);
  }
}

function drawLight(
  ctx: CanvasRenderingContext2D,
  light: LightPoint,
  state: LevelState
): void {
  const progress = easeOutCubic(light.litProgress);

  const baseColor = { r: 100, g: 100, b: 100 };
  const litColor = { r: 255, g: 215, b: 0 };
  const color = {
    r: Math.floor(baseColor.r + (litColor.r - baseColor.r) * progress),
    g: Math.floor(baseColor.g + (litColor.g - baseColor.g) * progress),
    b: Math.floor(baseColor.b + (litColor.b - baseColor.b) * progress)
  };

  if (light.isPulsing) {
    const pulseSize = light.pulseProgress * 40 + light.radius;
    const pulseAlpha = (1 - light.pulseProgress) * 0.6;
    ctx.beginPath();
    ctx.arc(light.x, light.y, pulseSize, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 215, 0, ${pulseAlpha})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  const glowSize = 20 + progress * 15;
  const glowGradient = ctx.createRadialGradient(
    light.x, light.y, 0,
    light.x, light.y, glowSize
  );
  glowGradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${0.4 + progress * 0.3})`);
  glowGradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

  ctx.beginPath();
  ctx.arc(light.x, light.y, glowSize, 0, Math.PI * 2);
  ctx.fillStyle = glowGradient;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
  ctx.lineWidth = 3;
  ctx.stroke();

  if (progress > 0.1) {
    const innerGradient = ctx.createRadialGradient(
      light.x - light.radius * 0.3,
      light.y - light.radius * 0.3,
      0,
      light.x,
      light.y,
      light.radius
    );
    innerGradient.addColorStop(0, `rgba(255, 255, 255, ${0.8 * progress})`);
    innerGradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${0.6 * progress})`);
    innerGradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, ${0.3 * progress})`);

    ctx.beginPath();
    ctx.arc(light.x, light.y, light.radius - 4, 0, Math.PI * 2);
    ctx.fillStyle = innerGradient;
    ctx.fill();
  }

  if (light.lit && state.isComplete && state.blinkCount < 6) {
    const isBlink = state.blinkCount % 2 === 0 ? 1 : 0.3;
    ctx.beginPath();
    ctx.arc(light.x, light.y, light.radius + 5, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${isBlink * 0.8})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawBall(ctx: CanvasRenderingContext2D, ball: Ball): void {
  const gradient = ctx.createRadialGradient(
    ball.position.x - ball.radius * 0.3,
    ball.position.y - ball.radius * 0.3,
    0,
    ball.position.x,
    ball.position.y,
    ball.radius
  );
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.5, '#a0d8ff');
  gradient.addColorStop(1, '#4a90d9');

  ctx.beginPath();
  ctx.arc(ball.position.x, ball.position.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(
    ball.position.x - ball.radius * 0.3,
    ball.position.y - ball.radius * 0.3,
    ball.radius * 0.4,
    0,
    Math.PI * 2
  );
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fill();
}

function drawTrail(ctx: CanvasRenderingContext2D, trail: TrailPoint[]): void {
  for (let i = 0; i < trail.length; i++) {
    const point = trail[i];
    const size = (i / trail.length) * 8 + 2;
    ctx.beginPath();
    ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(160, 216, 255, ${point.alpha * 0.4})`;
    ctx.fill();
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const particle of particles) {
    const alpha = particle.life / particle.maxLife;
    ctx.beginPath();
    ctx.arc(particle.position.x, particle.position.y, particle.size * alpha, 0, Math.PI * 2);
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawLauncher(
  ctx: CanvasRenderingContext2D,
  pos: { x: number; y: number }
): void {
  const baseRadius = 30;
  const baseY = pos.y + 10;

  const gradient = ctx.createRadialGradient(
    pos.x - baseRadius * 0.3,
    baseY - baseRadius * 0.5,
    0,
    pos.x,
    baseY,
    baseRadius
  );
  gradient.addColorStop(0, '#6b7280');
  gradient.addColorStop(1, '#374151');

  ctx.beginPath();
  ctx.arc(pos.x, baseY, baseRadius, Math.PI, 0, false);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.strokeStyle = '#9ca3af';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(pos.x - baseRadius, baseY);
  ctx.lineTo(pos.x + baseRadius, baseY);
  ctx.strokeStyle = '#6b7280';
  ctx.lineWidth = 3;
  ctx.stroke();

  const ballY = pos.y - 15;
  const ballGradient = ctx.createRadialGradient(
    pos.x - 8,
    ballY - 8,
    0,
    pos.x,
    ballY,
    12
  );
  ballGradient.addColorStop(0, '#ffffff');
  ballGradient.addColorStop(0.5, '#a0d8ff');
  ballGradient.addColorStop(1, '#4a90d9');

  ctx.beginPath();
  ctx.arc(pos.x, ballY, 11, 0, Math.PI * 2);
  ctx.fillStyle = ballGradient;
  ctx.fill();
}

function drawAimLine(
  ctx: CanvasRenderingContext2D,
  launchPos: { x: number; y: number },
  mousePos: { x: number; y: number }
): void {
  const angle = Math.atan2(launchPos.y - mousePos.y, mousePos.x - launchPos.x);
  const lineLength = 150;

  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 2;

  const startY = launchPos.y - 15;
  const endX = launchPos.x + Math.cos(angle) * lineLength;
  const endY = startY + Math.sin(-angle) * lineLength;

  ctx.beginPath();
  ctx.moveTo(launchPos.x, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  ctx.setLineDash([]);
}
