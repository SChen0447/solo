import { GameState, HitEffect, Particle } from './logic';
import { Recipe, RecipeStep, getCurrentStep } from './recipe';

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const HUD_HEIGHT = 70;
const RHYTHM_TRACK_Y = 360;
const JUDGE_LINE_X = 80;
const RHYTHM_NOTE_SIZE = 40;

type IngredientType = 'tomato' | 'egg' | 'onion' | 'pan' | 'plate';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private hoverRestart = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.setupCanvasScaling();
    window.addEventListener('resize', () => this.setupCanvasScaling());
  }

  private setupCanvasScaling(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const aspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;

    let displayWidth = containerWidth;
    let displayHeight = containerWidth / aspectRatio;

    if (displayHeight > containerHeight) {
      displayHeight = containerHeight;
      displayWidth = containerHeight * aspectRatio;
    }

    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;
  }

  public setHoverRestart(hover: boolean): void {
    this.hoverRestart = hover;
  }

  public render(
    state: GameState,
    recipe: Recipe,
    hitEffects: HitEffect[],
    particles: Particle[]
  ): void {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.drawBackground();

    if (state.status === 'ready') {
      this.drawReadyScreen();
    } else {
      const { step, stepTime } = getCurrentStep(recipe, state.elapsedTime);

      this.drawKitchenScene(state, step);

      if (step) {
        this.drawStepInfo(step);
        this.drawRhythmTrack(step, stepTime);
      }

      this.drawHitEffects(hitEffects, state.elapsedTime);
      this.drawParticles(particles, state.elapsedTime);
      this.drawHUD(state);

      if (state.status === 'burning') {
        this.drawBurnEffect(state);
      }

      if (state.status === 'gameover' || state.status === 'victory') {
        this.drawResultScreen(state);
      }
    }
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#FFF3E0';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private drawKitchenScene(state: GameState, step: RecipeStep | null): void {
    const ctx = this.ctx;

    ctx.fillStyle = '#8B5E3C';
    ctx.fillRect(0, 280, CANVAS_WIDTH, 200);

    ctx.strokeStyle = '#6B4423';
    ctx.lineWidth = 1;
    for (let y = 280; y < 480; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 280);
      ctx.lineTo(x, 480);
      ctx.stroke();
    }

    const panX = 420;
    const panY = 340;
    ctx.fillStyle = '#555555';
    ctx.beginPath();
    ctx.ellipse(panX, panY, 80, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(panX + 70, panY - 8, 50, 16);

    if (state.status === 'burning') {
      this.drawSmoke(panX, panY, state);
    }

    if (step) {
      this.drawIngredient(step.ingredient, 280, 330, state);
    }
  }

  private drawSmoke(x: number, y: number, state: GameState): void {
    const ctx = this.ctx;
    const progress = Math.min(1, (state.elapsedTime - state.burnStartTime) / state.burnDuration);
    const smokeCount = Math.floor(3 + progress * 10);

    for (let i = 0; i < smokeCount; i++) {
      const offsetX = Math.sin(state.elapsedTime / 200 + i) * 20;
      const offsetY = -i * 15 - 10;
      const alpha = 0.3 + Math.random() * 0.4;
      const size = 20 + i * 5;

      ctx.fillStyle = `rgba(60, 60, 60, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x + offsetX, y + offsetY, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawIngredient(type: IngredientType, x: number, y: number, state: GameState): void {
    const isBurning = state.status === 'burning';

    switch (type) {
      case 'tomato':
        this.drawTomato(x, y, isBurning);
        break;
      case 'egg':
        this.drawEgg(x, y, isBurning);
        break;
      case 'onion':
        this.drawOnion(x, y, isBurning);
        break;
      case 'pan':
        this.drawPanContents(x, y, state);
        break;
      case 'plate':
        this.drawPlate(x, y, isBurning);
        break;
    }
  }

  private drawTomato(x: number, y: number, burnt: boolean): void {
    const ctx = this.ctx;
    ctx.fillStyle = burnt ? '#442222' : '#FF4444';
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = burnt ? '#221111' : '#CC2222';
    ctx.beginPath();
    ctx.arc(x - 8, y - 8, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#32CD32';
    ctx.beginPath();
    ctx.ellipse(x, y - 30, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - 2, y - 36, 4, 10);
  }

  private drawEgg(x: number, y: number, burnt: boolean): void {
    const ctx = this.ctx;

    ctx.fillStyle = burnt ? '#333333' : '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(x, y, 32, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = burnt ? '#222222' : '#FFD700';
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(x - 5, y - 5, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawOnion(x: number, y: number, burnt: boolean): void {
    const ctx = this.ctx;
    ctx.fillStyle = burnt ? '#222222' : '#32CD32';
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const ox = x + Math.cos(angle) * 15;
      const oy = y + Math.sin(angle) * 15;
      ctx.beginPath();
      ctx.arc(ox, oy, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawPanContents(x: number, y: number, state: GameState): void {
    const ctx = this.ctx;
    const stepIdx = state.currentStepIndex;
    const burnt = state.status === 'burning';

    if (stepIdx >= 4) {
      ctx.fillStyle = burnt ? '#222222' : '#FF8844';
      ctx.beginPath();
      ctx.ellipse(x, y, 40, 20, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = burnt ? '#111111' : '#FFD700';
      ctx.beginPath();
      ctx.arc(x - 10, y - 5, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 12, y + 3, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#32CD32';
      ctx.beginPath();
      ctx.arc(x + 5, y - 10, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (stepIdx >= 3) {
      ctx.fillStyle = '#FFAA00';
      ctx.beginPath();
      ctx.ellipse(x, y, 35, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPlate(x: number, y: number, burnt: boolean): void {
    const ctx = this.ctx;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 45, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = burnt ? '#333333' : '#FF8844';
    ctx.beginPath();
    ctx.ellipse(x, y + 5, 30, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = burnt ? '#222222' : '#FFD700';
    ctx.beginPath();
    ctx.arc(x - 8, y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#32CD32';
    ctx.beginPath();
    ctx.arc(x + 5, y - 3, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawStepInfo(step: RecipeStep): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(20, 90, 280, 60);
    ctx.strokeStyle = '#DDD';
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 90, 280, 60);

    const iconX = 55;
    const iconY = 120;
    this.drawSmallIngredient(step.ingredient, iconX, iconY);

    ctx.fillStyle = '#333';
    ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(step.name, 90, 115);

    ctx.fillStyle = '#666';
    ctx.font = '14px "Microsoft YaHei", sans-serif';
    ctx.fillText(step.instruction, 90, 138);
  }

  private drawSmallIngredient(type: IngredientType, x: number, y: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x - 15, y - 15);
    ctx.scale(0.5, 0.5);

    switch (type) {
      case 'tomato':
        ctx.fillStyle = '#FF4444';
        ctx.beginPath();
        ctx.arc(30, 30, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#32CD32';
        ctx.beginPath();
        ctx.ellipse(30, 0, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'egg':
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(30, 30, 30, 24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(30, 30, 14, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'onion':
        ctx.fillStyle = '#32CD32';
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2;
          const ox = 30 + Math.cos(angle) * 12;
          const oy = 30 + Math.sin(angle) * 12;
          ctx.beginPath();
          ctx.arc(ox, oy, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 'pan':
        ctx.fillStyle = '#555555';
        ctx.beginPath();
        ctx.ellipse(30, 35, 35, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(55, 30, 20, 10);
        break;
      case 'plate':
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(30, 35, 35, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#CCC';
        ctx.lineWidth = 2;
        ctx.stroke();
        break;
    }
    ctx.restore();
  }

  private drawRhythmTrack(step: RecipeStep, stepTime: number): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, RHYTHM_TRACK_Y - 35, CANVAS_WIDTH, 70);

    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(JUDGE_LINE_X, RHYTHM_TRACK_Y - 35);
    ctx.lineTo(JUDGE_LINE_X, RHYTHM_TRACK_Y + 35);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(JUDGE_LINE_X - 60, RHYTHM_TRACK_Y - 30, 120, 60);

    const travelDistance = 500;
    const travelTime = 1500;

    step.rhythmPoints.forEach((point) => {
      if (point.hit) return;

      const timeUntilHit = point.time - stepTime;
      if (timeUntilHit > travelTime || timeUntilHit < -500) return;

      let progress = 1 - timeUntilHit / travelTime;
      progress = this.easeOut(Math.max(0, Math.min(1, progress)));

      const x = JUDGE_LINE_X + travelDistance * (1 - progress);
      const y = RHYTHM_TRACK_Y;

      this.drawRhythmNote(x, y, progress);
    });
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private drawRhythmNote(x: number, y: number, progress: number): void {
    const ctx = this.ctx;
    const size = RHYTHM_NOTE_SIZE;
    const wobble = Math.sin(progress * Math.PI * 4) * 2;

    let color: string;
    if (progress > 0.85) {
      color = '#00FF88';
    } else if (progress > 0.7) {
      color = '#FFCC00';
    } else {
      color = '#FF3333';
    }

    ctx.fillStyle = `${color}33`;
    ctx.beginPath();
    ctx.arc(x, y + wobble, size / 2 + 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y + wobble, size / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(x - 6, y + wobble - 6, size / 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y + wobble, size / 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawHitEffects(effects: HitEffect[], elapsedTime: number): void {
    const ctx = this.ctx;

    effects.forEach((effect) => {
      const progress = (elapsedTime - effect.startTime) / effect.duration;
      if (progress > 1) return;

      const alpha = 1 - progress;
      const scale = 1 + progress * 0.5;
      const yOffset = -progress * 40;

      ctx.save();
      ctx.translate(effect.x, effect.y + yOffset);
      ctx.scale(scale, scale);
      ctx.globalAlpha = alpha;

      if (effect.type === 'perfect' || effect.type === 'good') {
        const text = effect.type === 'perfect' ? 'PERFECT!' : 'GOOD';
        ctx.fillStyle = effect.type === 'perfect' ? '#FFD700' : '#FFCC00';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 3;
        ctx.strokeText(text, 0, 0);
        ctx.fillText(text, 0, 0);
      } else {
        ctx.strokeStyle = '#FF3333';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-15, -15);
        ctx.lineTo(15, 15);
        ctx.moveTo(15, -15);
        ctx.lineTo(-15, 15);
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  private drawParticles(particles: Particle[], elapsedTime: number): void {
    const ctx = this.ctx;

    particles.forEach((p) => {
      const progress = (elapsedTime - p.startTime) / p.duration;
      if (progress > 1) return;

      const alpha = 1 - progress;
      const size = p.size * (1 - progress);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;

      this.drawStar(ctx, p.x, p.y, 5, size, size / 2);
      ctx.restore();
    });
  }

  private drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number
  ): void {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerRadius;
      let y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }

  private drawHUD(state: GameState): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT);

    ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, HUD_HEIGHT);
    ctx.lineTo(CANVAS_WIDTH, HUD_HEIGHT);
    ctx.stroke();

    ctx.fillStyle = '#333';
    ctx.font = 'bold 20px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`分数: ${state.score}`, 20, 35);

    this.drawCombo(180, 30, state.combo);
    this.drawLives(CANVAS_WIDTH - 130, 28, state.lives, state.maxLives);
  }

  private drawCombo(x: number, y: number, combo: number): void {
    const ctx = this.ctx;

    if (combo > 0) {
      let flameColor = '#FF4444';
      if (combo >= 10) {
        flameColor = '#FFD700';
      } else if (combo >= 5) {
        flameColor = '#FF8800';
      }

      this.drawFlame(ctx, x, y, flameColor);

      ctx.fillStyle = '#333';
      ctx.font = 'bold 20px "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${combo} 连击`, x + 28, y + 8);
    } else {
      ctx.fillStyle = '#999';
      ctx.font = '18px "Microsoft YaHei", sans-serif';
      ctx.fillText('连击: 0', x, y + 8);
    }
  }

  private drawFlame(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 22);
    ctx.quadraticCurveTo(x, y + 12, x + 5, y + 2);
    ctx.quadraticCurveTo(x + 10, y + 8, x + 10, y + 5);
    ctx.quadraticCurveTo(x + 10, y + 12, x + 15, y + 2);
    ctx.quadraticCurveTo(x + 20, y + 12, x + 10, y + 22);
    ctx.fill();
  }

  private drawLives(x: number, y: number, lives: number, maxLives: number): void {
    const ctx = this.ctx;
    const heartSize = 24;
    const spacing = 8;

    for (let i = 0; i < maxLives; i++) {
      const filled = i < lives;
      const heartX = x + i * (heartSize + spacing);
      this.drawHeart(ctx, heartX, y, heartSize, filled ? '#FF4444' : '#888888');
    }
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    const topCurveHeight = size * 0.3;
    ctx.moveTo(x + size / 2, y + size);
    ctx.bezierCurveTo(
      x - size * 0.2, y + size * 0.6,
      x, y,
      x + size / 2, y + topCurveHeight
    );
    ctx.bezierCurveTo(
      x + size, y,
      x + size * 1.2, y + size * 0.6,
      x + size / 2, y + size
    );
    ctx.fill();
  }

  private drawBurnEffect(state: GameState): void {
    const ctx = this.ctx;
    const progress = Math.min(1, (state.elapsedTime - state.burnStartTime) / state.burnDuration);
    const alpha = progress * 0.7;

    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private drawReadyScreen(): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('节奏烹饪', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

    ctx.font = 'bold 28px "Microsoft YaHei", sans-serif';
    ctx.fillText('番茄炒蛋', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);

    ctx.font = '20px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('点击屏幕 / 按空格键 开始', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);

    ctx.font = '14px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#CCC';
    ctx.fillText('当圆形节奏点到达左侧判定线时点击', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 90);
  }

  private drawResultScreen(state: GameState): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const isVictory = state.status === 'victory';
    const title = isVictory ? '菜品完成!' : '菜品糊掉了...';
    const titleColor = isVictory ? '#FFD700' : '#FF6666';

    ctx.fillStyle = titleColor;
    ctx.font = 'bold 32px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, CANVAS_WIDTH / 2, 120);

    const grade = this.getGrade(state.score);
    this.drawGrade(CANVAS_WIDTH / 2, 200, grade);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px "Microsoft YaHei", sans-serif';
    ctx.fillText(`最终得分: ${state.score}`, CANVAS_WIDTH / 2, 290);

    ctx.font = '18px "Microsoft YaHei", sans-serif';
    ctx.fillText(`最高连击: ${state.maxCombo}`, CANVAS_WIDTH / 2, 325);

    const btnWidth = 160;
    const btnHeight = 50;
    const btnX = (CANVAS_WIDTH - btnWidth) / 2;
    const btnY = CANVAS_HEIGHT - 100;

    ctx.fillStyle = this.hoverRestart ? '#357ABD' : '#4A90D9';
    this.roundRect(ctx, btnX, btnY, btnWidth, btnHeight, 12);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('再来一局', CANVAS_WIDTH / 2, btnY + 33);
  }

  private getGrade(score: number): string {
    if (score >= 1000) return 'S';
    if (score >= 700) return 'A';
    if (score >= 400) return 'B';
    return 'C';
  }

  private drawGrade(x: number, y: number, grade: string): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 72px Arial';
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 6;
    ctx.strokeText(grade, x, y);

    let fillColor = '#FFFFFF';
    if (grade === 'S') fillColor = '#FFD700';
    else if (grade === 'A') fillColor = '#C0C0C0';
    else if (grade === 'B') fillColor = '#CD7F32';

    ctx.fillStyle = fillColor;
    ctx.fillText(grade, x, y);
    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
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
  }
}
