import { CONSTANTS, LevelConfig } from './levels';

export interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'explosion' | 'confetti' | 'spark';
}

export interface FieldDot {
  angle: number;
  phase: number;
  frequency: number;
  size: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  layer: number;
}

export interface GameRenderState {
  time: number;
  dt: number;
  cameraAngle: number;
  targetCameraAngle: number;
  platformAngleX: number;
  platformAngleZ: number;
  targetPlatformAngleX: number;
  targetPlatformAngleZ: number;
  ball: {
    active: boolean;
    x: number;
    y: number;
    vx: number;
    vy: number;
  };
  trail: TrailPoint[];
  target: { x: number; y: number; hit: boolean };
  particles: Particle[];
  laserActive: boolean;
  laserCooldown: number;
  ballsRemaining: number;
  currentLevel: number;
  levelConfig: LevelConfig | null;
  levelTransition: {
    active: boolean;
    startTime: number;
    type: 'intro' | 'win' | 'lose' | 'complete';
  };
  fieldDots: FieldDot[];
  stars: Star[];
  canvasWidth: number;
  canvasHeight: number;
  scale: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  render(state: GameRenderState): void {
    const ctx = this.ctx;
    const { canvasWidth, canvasHeight, time, cameraAngle, scale } = state;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    this.drawBackground(ctx, canvasWidth, canvasHeight, time, cameraAngle, state.stars);

    ctx.save();
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.scale(scale, scale);
    ctx.rotate(cameraAngle);

    if (state.levelConfig?.magneticFieldEnabled) {
      this.drawMagneticField(ctx, time, state.levelConfig, state.platformAngleX, state.platformAngleZ);
    }

    this.drawMagneticRing(ctx, time, state.fieldDots, state.laserCooldown);

    this.drawPlatform(ctx, state.platformAngleX, state.platformAngleZ, time, state.laserCooldown);

    if (state.laserActive) {
      this.drawLaser(ctx);
    }

    this.drawTarget(ctx, state.target.x, state.target.y, state.target.hit, time);

    if (state.ball.active) {
      this.drawTrail(ctx, state.trail);
      this.drawBall(ctx, state.ball.x, state.ball.y, time);
    }

    this.drawParticles(ctx, state.particles);

    ctx.restore();

    this.drawUI(ctx, state);
    this.drawLevelTransition(ctx, state, canvasWidth, canvasHeight);
  }

  private drawBackground(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    time: number,
    cameraAngle: number,
    stars: Star[]
  ): void {
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.75);
    grad.addColorStop(0, '#1a1040');
    grad.addColorStop(0.4, '#0d0828');
    grad.addColorStop(1, '#05020f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    for (const star of stars) {
      const parallax = cameraAngle * 0.3 * star.layer;
      const sx = star.x + Math.sin(parallax) * star.layer * 20;
      const sy = star.y + Math.cos(parallax) * star.layer * 20;
      const twinkle = 0.6 + 0.4 * Math.sin(time * 2 + star.brightness * 10);
      ctx.globalAlpha = star.brightness * twinkle;
      ctx.fillStyle = `hsl(${210 + star.layer * 30}, 80%, ${70 + star.layer * 10}%)`;
      ctx.beginPath();
      ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  private drawMagneticField(
    ctx: CanvasRenderingContext2D,
    time: number,
    config: LevelConfig,
    angleX: number,
    angleZ: number
  ): void {
    const lines = 20;
    const { magneticFieldFrequency, magneticFieldAmplitude, magneticFieldRandomness } = config;

    for (let i = 0; i < lines; i++) {
      const baseAngle = (i / lines) * Math.PI * 2;
      const tiltFactor = (Math.sin(baseAngle) * angleZ + Math.cos(baseAngle) * angleX) / 60;

      ctx.beginPath();
      const points = 40;
      const innerR = CONSTANTS.MAGNETIC_RING_RADIUS + 10;
      const outerR = CONSTANTS.SCENE_RADIUS - 20;

      for (let j = 0; j <= points; j++) {
        const t = j / points;
        const r = innerR + (outerR - innerR) * t;
        const wave = Math.sin(t * 4 + time * magneticFieldFrequency + i * 0.5) * magneticFieldAmplitude * (1 - t * 0.5);
        const rand = magneticFieldRandomness * Math.sin(time * 3 + i * 2 + j * 1.7) * 15;
        const angle = baseAngle + wave * 0.008 + rand * 0.005 + tiltFactor * t * 0.3;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      const alpha = 0.25 + 0.1 * Math.sin(time * 1.5 + i);
      const colorGrad = ctx.createLinearGradient(
        Math.cos(baseAngle) * innerR,
        Math.sin(baseAngle) * innerR,
        Math.cos(baseAngle) * outerR,
        Math.sin(baseAngle) * outerR
      );
      colorGrad.addColorStop(0, `rgba(120, 200, 255, ${alpha})`);
      colorGrad.addColorStop(0.5, `rgba(160, 140, 255, ${alpha * 0.8})`);
      colorGrad.addColorStop(1, `rgba(200, 100, 255, ${alpha * 0.4})`);

      ctx.strokeStyle = colorGrad;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }

  private drawMagneticRing(
    ctx: CanvasRenderingContext2D,
    time: number,
    dots: FieldDot[],
    laserCooldown: number
  ): void {
    const r = CONSTANTS.MAGNETIC_RING_RADIUS;
    const ringRotation = time * 0.2 * Math.PI * 2;

    ctx.save();
    ctx.rotate(ringRotation);

    const ringGrad = ctx.createRadialGradient(0, 0, r - 8, 0, 0, r + 8);
    ringGrad.addColorStop(0, 'rgba(100, 180, 255, 0)');
    ringGrad.addColorStop(0.4, 'rgba(100, 180, 255, 0.35)');
    ringGrad.addColorStop(0.6, 'rgba(130, 160, 255, 0.5)');
    ringGrad.addColorStop(1, 'rgba(100, 180, 255, 0)');

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = ringGrad;
    ctx.lineWidth = 10;
    ctx.stroke();

    for (const dot of dots) {
      const blink = 0.3 + 0.7 * Math.abs(Math.sin(time * dot.frequency + dot.phase));
      const angle = dot.angle;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      ctx.globalAlpha = blink;
      ctx.fillStyle = `rgba(180, 220, 255, ${blink})`;
      ctx.beginPath();
      ctx.arc(x, y, dot.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = blink * 0.4;
      ctx.beginPath();
      ctx.arc(x, y, dot.size * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.restore();

    if (laserCooldown > 0) {
      const cdAlpha = laserCooldown / CONSTANTS.LASER_COOLDOWN;
      ctx.strokeStyle = `rgba(255, 80, 80, ${0.3 + 0.5 * Math.sin(time * 15) * cdAlpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r + 12, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawPlatform(
    ctx: CanvasRenderingContext2D,
    angleX: number,
    angleZ: number,
    time: number,
    laserCooldown: number
  ): void {
    const size = CONSTANTS.PLATFORM_HALF;
    const breath = 0.85 + 0.15 * Math.sin((time / 1.2) * Math.PI * 2);

    ctx.save();

    const radX = (angleX * Math.PI) / 180;
    const radZ = (angleZ * Math.PI) / 180;

    const sx = 1 + Math.sin(radZ) * 0.25;
    const sy = 1 + Math.sin(radX) * 0.25;
    const skewX = Math.sin(radZ) * 0.3;
    const skewY = Math.sin(radX) * 0.3;

    ctx.transform(sx, skewY * 0.3, skewX * 0.3, sy, 0, 0);
    ctx.rotate(-skewX * 0.4);

    const shadowGrad = ctx.createRadialGradient(0, size * 0.3, 0, 0, size * 0.3, size * 1.6);
    shadowGrad.addColorStop(0, 'rgba(0, 20, 60, 0.5)');
    shadowGrad.addColorStop(1, 'rgba(0, 20, 60, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.moveTo(0, -size * 1.2);
    ctx.lineTo(size * 1.2, 0);
    ctx.lineTo(0, size * 1.2);
    ctx.lineTo(-size * 1.2, 0);
    ctx.closePath();
    ctx.fill();

    const platformGrad = ctx.createLinearGradient(-size, -size, size, size);
    platformGrad.addColorStop(0, `rgba(140, 210, 255, ${0.55 * breath})`);
    platformGrad.addColorStop(0.5, `rgba(100, 180, 255, ${0.45 * breath})`);
    platformGrad.addColorStop(1, `rgba(120, 160, 255, ${0.55 * breath})`);

    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size, 0);
    ctx.closePath();
    ctx.fillStyle = platformGrad;
    ctx.fill();

    ctx.save();
    ctx.clip();

    ctx.globalAlpha = 0.18 * breath;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.8;
    const gridStep = 10;
    for (let g = -size * 2; g <= size * 2; g += gridStep) {
      ctx.beginPath();
      ctx.moveTo(g - size * 2, -size * 2);
      ctx.lineTo(g + size * 2, size * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const centerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.6);
    centerGrad.addColorStop(0, `rgba(255, 255, 255, ${0.25 * breath})`);
    centerGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = centerGrad;
    ctx.fillRect(-size, -size, size * 2, size * 2);

    ctx.restore();

    const edgeColor = laserCooldown > 0
      ? `rgba(255, ${100 + 80 * Math.abs(Math.sin(time * 20))}, 100, 0.9)`
      : `rgba(180, 230, 255, ${0.8 * breath})`;
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size, 0);
    ctx.closePath();
    ctx.stroke();

    ctx.shadowColor = laserCooldown > 0 ? 'rgba(255, 120, 120, 0.8)' : `rgba(120, 200, 255, ${0.6 * breath})`;
    ctx.shadowBlur = 20 * breath;
    ctx.strokeStyle = `rgba(160, 220, 255, ${0.5 * breath})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  private drawLaser(ctx: CanvasRenderingContext2D): void {
    const sceneR = CONSTANTS.SCENE_RADIUS;

    ctx.save();

    const laserGrad = ctx.createLinearGradient(0, 0, 0, -sceneR);
    laserGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    laserGrad.addColorStop(0.3, 'rgba(200, 230, 255, 0.7)');
    laserGrad.addColorStop(1, 'rgba(150, 200, 255, 0)');

    ctx.strokeStyle = laserGrad;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(180, 220, 255, 0.9)';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -sceneR);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -sceneR);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.shadowColor = 'rgba(200, 240, 255, 1)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, -3, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawTarget(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    hit: boolean,
    time: number
  ): void {
    const size = CONSTANTS.TARGET_SIZE;
    const pulse = hit ? 1 + Math.sin(time * 20) * 0.3 : 1 + 0.08 * Math.sin(time * 3);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.scale(pulse, pulse);

    ctx.shadowColor = 'rgba(255, 60, 60, 0.9)';
    ctx.shadowBlur = hit ? 40 : 20;

    const outerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    outerGrad.addColorStop(0, '#ff4444');
    outerGrad.addColorStop(0.5, '#cc2222');
    outerGrad.addColorStop(1, '#881111');

    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size, 0);
    ctx.closePath();
    ctx.fillStyle = outerGrad;
    ctx.fill();

    ctx.shadowBlur = 0;

    const innerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.55);
    innerGrad.addColorStop(0, '#ffffff');
    innerGrad.addColorStop(0.4, '#ffdddd');
    innerGrad.addColorStop(1, '#ff4444');

    ctx.beginPath();
    ctx.moveTo(0, -size * 0.55);
    ctx.lineTo(size * 0.55, 0);
    ctx.lineTo(0, size * 0.55);
    ctx.lineTo(-size * 0.55, 0);
    ctx.closePath();
    ctx.fillStyle = innerGrad;
    ctx.fill();

    ctx.fillStyle = hit ? '#ffff88' : '#881111';
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.22);
    ctx.lineTo(size * 0.22, 0);
    ctx.lineTo(0, size * 0.22);
    ctx.lineTo(-size * 0.22, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawTrail(ctx: CanvasRenderingContext2D, trail: TrailPoint[]): void {
    if (trail.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < trail.length; i++) {
      const p0 = trail[i - 1];
      const p1 = trail[i];
      const t = i / trail.length;
      const alpha = t * 0.5;
      const width = t * 6 + 1;

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = `rgba(180, 220, 255, ${alpha})`;
      ctx.lineWidth = width;
      ctx.shadowColor = 'rgba(150, 200, 255, 0.6)';
      ctx.shadowBlur = 10 * t;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
    const r = CONSTANTS.BALL_RADIUS;

    ctx.save();
    ctx.translate(x, y);

    ctx.shadowColor = 'rgba(180, 220, 255, 0.9)';
    ctx.shadowBlur = 18;

    const ballGrad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
    ballGrad.addColorStop(0, '#ffffff');
    ballGrad.addColorStop(0.2, '#e8f4ff');
    ballGrad.addColorStop(0.5, '#a8c8e8');
    ballGrad.addColorStop(0.85, '#6a8aaa');
    ballGrad.addColorStop(1, '#3a5a7a');

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = ballGrad;
    ctx.fill();

    ctx.shadowBlur = 0;

    ctx.save();
    ctx.rotate(time * 3);
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = '#4a7aaa';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const offset = (i - 1) * r * 0.5;
      const ringR = Math.sqrt(Math.max(0, r * r - offset * offset));
      ctx.beginPath();
      ctx.ellipse(0, offset, ringR, ringR * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.4, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(r * 0.2, r * 0.25, r * 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
    for (const p of particles) {
      const lifeRatio = p.life / p.maxLife;
      const alpha = Math.max(0, lifeRatio);

      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.type === 'confetti') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.vx * 0.1 + p.life * 5);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.fillRect(-p.size / 2, -p.size, p.size, p.size * 2);
      } else if (p.type === 'explosion') {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 15;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + lifeRatio * 0.5), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * lifeRatio, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawUI(ctx: CanvasRenderingContext2D, state: GameRenderState): void {
    const { canvasWidth, canvasHeight, currentLevel, ballsRemaining, time } = state;

    ctx.save();

    const levelText = state.levelConfig?.name || '';
    ctx.font = 'bold 26px "Microsoft YaHei", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(120, 200, 255, 0.9)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(levelText, 30, 28);
    ctx.shadowBlur = 0;

    ctx.font = '14px "Microsoft YaHei", Arial, sans-serif';
    ctx.fillStyle = 'rgba(180, 210, 255, 0.7)';
    ctx.fillText('A/D 旋转视角 · W/S X轴倾斜 · Q/E Z轴倾斜 · 空格 发射激光', 30, 62);

    const ballAnim = Math.abs(Math.sin(time * 10)) * 0.1;
    const ballsScale = 1 + ballAnim;
    ctx.save();
    ctx.translate(canvasWidth - 30, 42);
    ctx.scale(ballsScale, ballsScale);
    ctx.font = 'bold 30px "Microsoft YaHei", Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255, 200, 150, 0.8)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = ballsRemaining > 0 ? '#ffffff' : '#ff6666';
    ctx.fillText(`● ${ballsRemaining}`, 0, 0);
    ctx.restore();

    ctx.font = '13px "Microsoft YaHei", Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(180, 210, 255, 0.7)';
    ctx.shadowBlur = 0;
    ctx.fillText('剩余发射次数', canvasWidth - 30, 68);

    ctx.restore();
  }

  private drawLevelTransition(
    ctx: CanvasRenderingContext2D,
    state: GameRenderState,
    w: number,
    h: number
  ): void {
    if (!state.levelTransition.active) return;

    const { startTime, type } = state.levelTransition;
    const elapsed = state.time - startTime;
    let alpha = 0;
    let text = '';
    let subText = '';

    if (type === 'intro') {
      const duration = 2;
      if (elapsed < 0.4) {
        alpha = elapsed / 0.4;
      } else if (elapsed < duration - 0.4) {
        alpha = 1;
      } else if (elapsed < duration) {
        alpha = (duration - elapsed) / 0.4;
      }
      text = state.levelConfig?.name || '';
      subText = state.levelConfig?.hint || '';
    } else if (type === 'win') {
      const duration = 3;
      alpha = Math.min(1, elapsed / 0.3) * Math.max(0, 1 - (elapsed - duration + 0.5) / 0.5);
      const flash = 0.5 + 0.5 * Math.sin(elapsed * 12);
      ctx.save();
      ctx.globalAlpha = alpha * (0.3 + flash * 0.4);
      const flashGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
      flashGrad.addColorStop(0, `rgba(255, ${180 + 75 * flash}, 80, 0.8)`);
      flashGrad.addColorStop(1, 'rgba(255, 100, 50, 0)');
      ctx.fillStyle = flashGrad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
      text = '🎉 过关！';
      subText = '即将进入下一关...';
    } else if (type === 'lose') {
      const duration = 2.5;
      alpha = Math.min(1, elapsed / 0.3) * Math.max(0, 1 - (elapsed - duration + 0.5) / 0.5);
      text = '💔 挑战失败';
      subText = '按 R 键重新开始本关';
    } else if (type === 'complete') {
      const duration = 5;
      alpha = Math.min(1, elapsed / 0.5);
      text = '🏆 全部通关！';
      subText = '恭喜你成为磁悬浮大师';
    }

    if (alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 56px "Microsoft YaHei", Arial, sans-serif';
    ctx.shadowColor = 'rgba(120, 200, 255, 0.9)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, w / 2, h / 2 - 30);
    ctx.shadowBlur = 0;

    if (subText) {
      ctx.font = '22px "Microsoft YaHei", Arial, sans-serif';
      ctx.fillStyle = 'rgba(200, 220, 255, 0.9)';
      ctx.fillText(subText, w / 2, h / 2 + 30);
    }

    ctx.restore();
  }
}
