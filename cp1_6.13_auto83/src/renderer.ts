import { Maze, type Edge } from './maze';
import { Particle, type Ripple, type EnergyWave } from './particle';

export interface RenderState {
  maze: Maze;
  particles: Particle[];
  ripples: Ripple[];
  energyWaves: EnergyWave[];
  currentLevel: number;
  totalLevels: number;
  steps: number;
  isVictory: boolean;
  victoryTime: number;
  isLevelComplete: boolean;
  levelCompleteTime: number;
  hoverReset: boolean;
  resetRotation: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private centerX: number = 0;
  private centerY: number = 0;
  private time: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
    this.resize();
  }

  public resize(): void {
    const container = this.canvas.parentElement;
    if (container) {
      this.canvas.width = container.clientWidth;
      this.canvas.height = container.clientHeight;
    } else {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight * 0.85;
    }
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
  }

  public render(state: RenderState, deltaTime: number): void {
    this.time += deltaTime;
    const { maze, particles, ripples, energyWaves } = state;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawBackground();

    if (state.isVictory) {
      this.drawVictoryAnimation(state);
      return;
    }

    this.drawEdges(maze);
    this.drawNodes(maze);
    this.drawTargets(maze);
    this.drawRipples(ripples);
    this.drawEnergyWaves(energyWaves);
    this.drawParticles(particles, maze);
    this.drawUI(state);

    if (state.isLevelComplete) {
      this.drawLevelComplete(state);
    }
  }

  private drawBackground(): void {
    const gradient = this.ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, Math.max(this.canvas.width, this.canvas.height) / 2
    );
    gradient.addColorStop(0, 'rgba(30, 15, 60, 0.3)');
    gradient.addColorStop(1, 'rgba(10, 10, 30, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawEdges(maze: Maze): void {
    maze.edges.forEach((edge: Edge) => {
      const from = maze.hexToPixel(edge.from, this.centerX, this.centerY);
      const to = maze.hexToPixel(edge.to, this.centerX, this.centerY);

      this.ctx.beginPath();
      this.ctx.moveTo(from.x, from.y);
      this.ctx.lineTo(to.x, to.y);
      this.ctx.strokeStyle = `rgba(200, 200, 220, ${edge.brightness})`;
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
    });
  }

  private drawNodes(maze: Maze): void {
    maze.nodes.forEach((node) => {
      const pixel = maze.hexToPixel(node.coord, this.centerX, this.centerY);
      const size = 4;

      this.ctx.beginPath();
      this.ctx.arc(pixel.x, pixel.y, size, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(180, 180, 200, 0.5)';
      this.ctx.fill();
    });
  }

  private drawTargets(maze: Maze): void {
    const targetNodes = maze.getTargetNodes();
    const hexSize = maze.nodeSpacing * 0.45;

    targetNodes.forEach((node) => {
      const pixel = maze.hexToPixel(node.coord, this.centerX, this.centerY);
      this.drawHexagonBorder(pixel.x, pixel.y, hexSize, '#ffd54f', 0.8, 3);
    });
  }

  private drawHexagonBorder(cx: number, cy: number, size: number, color: string, alpha: number, lineWidth: number): void {
    this.ctx.save();
    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const x = cx + size * Math.cos(angle);
      const y = cy + size * Math.sin(angle);
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.closePath();
    this.ctx.strokeStyle = color;
    this.ctx.globalAlpha = alpha;
    this.ctx.lineWidth = lineWidth;

    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 15;

    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawRipples(ripples: Ripple[]): void {
    const now = this.time;
    ripples.forEach((ripple) => {
      const elapsed = now - ripple.startTime;
      if (elapsed > ripple.duration) return;

      const progress = elapsed / ripple.duration;
      const currentRadius = ripple.maxRadius * progress;
      const alpha = 1 - progress;

      const gradient = this.ctx.createRadialGradient(
        ripple.x, ripple.y, 0,
        ripple.x, ripple.y, currentRadius
      );
      gradient.addColorStop(0, `rgba(100, 255, 150, 0)`);
      gradient.addColorStop(0.5, `rgba(150, 100, 255, ${alpha * 0.5})`);
      gradient.addColorStop(1, `rgba(200, 50, 255, 0)`);

      this.ctx.beginPath();
      this.ctx.arc(ripple.x, ripple.y, currentRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = gradient;
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
    });
  }

  private drawEnergyWaves(energyWaves: EnergyWave[]): void {
    const now = this.time;
    energyWaves.forEach((wave) => {
      const elapsed = now - wave.startTime;
      if (elapsed > wave.duration) return;

      const progress = elapsed / wave.duration;
      const currentRadius = wave.maxRadius * progress;
      const alpha = 1 - progress;

      this.ctx.beginPath();
      this.ctx.arc(wave.x, wave.y, currentRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(255, 213, 79, ${alpha * 0.8})`;
      this.ctx.lineWidth = 3;
      this.ctx.shadowColor = '#ffd54f';
      this.ctx.shadowBlur = 20;
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    });
  }

  private drawParticles(particles: Particle[], maze: Maze): void {
    particles.forEach((particle) => {
      let pixel;
      if (particle.isMoving && particle.moveFromCoord && particle.moveToCoord) {
        const from = maze.hexToPixel(particle.moveFromCoord, this.centerX, this.centerY);
        const to = maze.hexToPixel(particle.moveToCoord, this.centerX, this.centerY);
        const t = particle.getEasedProgress();
        pixel = {
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
        };
      } else {
        pixel = maze.hexToPixel(particle.coord, this.centerX, this.centerY);
      }

      const yOffset = particle.floatOffset;
      const px = pixel.x;
      const py = pixel.y + yOffset;

      if (particle.isMain) {
        this.drawMainParticle(px, py, particle);
      } else {
        this.drawNormalParticle(px, py, particle);
      }
    });
  }

  private drawMainParticle(x: number, y: number, particle: Particle): void {
    const breatheScale = 1 + Math.sin(this.time * 3) * 0.15;
    const radius = 20 * breatheScale;

    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius * 2);
    gradient.addColorStop(0, particle.getGlowColor());
    gradient.addColorStop(0.5, `rgba(${particle.energyLevel === 'high' ? '255, 213, 79' : '79, 195, 247'}, 0.3)`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    this.ctx.beginPath();
    this.ctx.arc(x, y, radius * 2, 0, Math.PI * 2);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    const bodyGradient = this.ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
    bodyGradient.addColorStop(0, '#4fc3f7');
    bodyGradient.addColorStop(1, '#ffd54f');

    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = bodyGradient;
    this.ctx.shadowColor = particle.energyLevel === 'high' ? '#ffd54f' : '#4fc3f7';
    this.ctx.shadowBlur = 20;
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
  }

  private drawNormalParticle(x: number, y: number, particle: Particle): void {
    const radius = 14;

    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius * 1.8);
    gradient.addColorStop(0, particle.getGlowColor());
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    this.ctx.beginPath();
    this.ctx.arc(x, y, radius * 1.8, 0, Math.PI * 2);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = particle.getColor();
    this.ctx.shadowColor = particle.getColor();
    this.ctx.shadowBlur = 10;
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
  }

  private drawUI(state: RenderState): void {
    this.drawLevelInfo(state);
    this.drawStepsCounter(state);
    this.drawResetButton(state);
    this.drawProgressBar(state);
  }

  private drawLevelInfo(state: RenderState): void {
    const x = 30;
    const y = 40;

    this.ctx.save();
    this.ctx.font = 'bold 24px "Courier New", monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    this.ctx.shadowColor = '#ffd54f';
    this.ctx.shadowBlur = 10;
    this.ctx.fillStyle = '#ffd54f';
    this.ctx.fillText(`第 ${state.currentLevel} 关`, x, y);

    this.ctx.restore();
  }

  private drawStepsCounter(state: RenderState): void {
    const x = 30;
    const y = 75;

    this.ctx.save();
    this.ctx.font = '16px "Courier New", monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillStyle = 'rgba(200, 200, 220, 0.8)';
    this.ctx.fillText(`步数: ${state.steps}`, x, y);
    this.ctx.restore();
  }

  private drawResetButton(state: RenderState): void {
    const x = this.canvas.width - 40;
    const y = 40;
    const radius = 20;

    this.ctx.save();

    const scale = state.hoverReset ? 1.1 : 1;
    const buttonRadius = radius * scale;

    this.ctx.beginPath();
    this.ctx.arc(x, y, buttonRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(20, 20, 40, 0.6)';
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(100, 100, 150, 0.5)';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();

    if (state.hoverReset) {
      this.ctx.beginPath();
      this.ctx.arc(x, y, buttonRadius - 4, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(this.time * 4) * 0.3})`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }

    this.ctx.translate(x, y);
    this.ctx.rotate(state.resetRotation);
    this.ctx.translate(-x, -y);

    this.ctx.beginPath();
    this.ctx.strokeStyle = 'rgba(200, 200, 220, 0.9)';
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';

    const arrowSize = 10;
    this.ctx.arc(x, y, arrowSize, -Math.PI * 0.3, Math.PI * 1.3);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(x + arrowSize * Math.cos(-Math.PI * 0.3), y + arrowSize * Math.sin(-Math.PI * 0.3));
    this.ctx.lineTo(x + arrowSize * Math.cos(-Math.PI * 0.3) + 4, y + arrowSize * Math.sin(-Math.PI * 0.3) - 2);
    this.ctx.moveTo(x + arrowSize * Math.cos(-Math.PI * 0.3), y + arrowSize * Math.sin(-Math.PI * 0.3));
    this.ctx.lineTo(x + arrowSize * Math.cos(-Math.PI * 0.3) - 2, y + arrowSize * Math.sin(-Math.PI * 0.3) - 4);
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawProgressBar(state: RenderState): void {
    const totalGrooves = state.totalLevels;
    const grooveRadius = 12;
    const spacing = 20;
    const totalWidth = totalGrooves * (grooveRadius * 2 + spacing) - spacing;
    const startX = (this.canvas.width - totalWidth) / 2 + grooveRadius;
    const y = this.canvas.height - 30;

    for (let i = 0; i < totalGrooves; i++) {
      const cx = startX + i * (grooveRadius * 2 + spacing);

      this.ctx.beginPath();
      this.ctx.arc(cx, y, grooveRadius, Math.PI, 0, true);
      this.ctx.fillStyle = 'rgba(30, 30, 60, 0.8)';
      this.ctx.fill();
      this.ctx.strokeStyle = 'rgba(100, 100, 150, 0.5)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      if (i < state.currentLevel - 1 || (i === state.currentLevel - 1 && state.isLevelComplete)) {
        this.ctx.beginPath();
        this.ctx.arc(cx, y, grooveRadius - 3, Math.PI, 0, true);
        this.ctx.fillStyle = '#ffd54f';
        this.ctx.shadowColor = '#ffd54f';
        this.ctx.shadowBlur = 8;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      } else if (i === state.currentLevel - 1) {
        const pulse = 0.5 + Math.sin(this.time * 3) * 0.3;
        this.ctx.beginPath();
        this.ctx.arc(cx, y, grooveRadius - 4, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255, 213, 79, ${pulse})`;
        this.ctx.shadowColor = '#ffd54f';
        this.ctx.shadowBlur = 6;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      }
    }
  }

  private drawLevelComplete(state: RenderState): void {
    const elapsed = this.time - state.levelCompleteTime;
    const alpha = Math.min(1, elapsed / 0.5);

    this.ctx.save();
    this.ctx.globalAlpha = alpha * 0.6;
    this.ctx.fillStyle = 'rgba(10, 10, 30, 0.5)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();

    const scale = Math.min(1, elapsed / 0.5);
    this.ctx.save();
    this.ctx.translate(this.centerX, this.centerY);
    this.ctx.scale(scale, scale);
    this.ctx.translate(-this.centerX, -this.centerY);

    this.ctx.font = 'bold 36px "Courier New", monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.shadowColor = '#ffd54f';
    this.ctx.shadowBlur = 20;
    this.ctx.fillStyle = '#ffd54f';
    this.ctx.fillText('关卡完成!', this.centerX, this.centerY - 20);

    this.ctx.font = '18px "Courier New", monospace';
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = 'rgba(200, 200, 220, 0.9)';
    this.ctx.fillText(`${state.steps} 步`, this.centerX, this.centerY + 25);

    this.ctx.restore();
  }

  private drawVictoryAnimation(state: RenderState): void {
    const elapsed = this.time - state.victoryTime;

    this.ctx.fillStyle = 'rgba(5, 5, 20, 0.15)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (elapsed < 3) {
      this.drawFlyingParticles(elapsed);
    } else {
      this.drawQuantumTotem(elapsed - 3);
    }

    if (elapsed > 4) {
      const alpha = Math.min(1, (elapsed - 4) / 1);
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.font = 'bold 42px "Courier New", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.shadowColor = '#ffd54f';
      this.ctx.shadowBlur = 30;
      this.ctx.fillStyle = '#ffd54f';
      this.ctx.fillText('恭喜通关!', this.centerX, this.centerY + 120);
      this.ctx.restore();
    }
  }

  private drawFlyingParticles(elapsed: number): void {
    const particleCount = 30;
    const duration = 2.5;
    const progress = Math.min(1, elapsed / duration);
    const easeProgress = 1 - Math.pow(1 - progress, 3);

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const startRadius = Math.max(this.canvas.width, this.canvas.height) * 0.5;
      const startX = this.centerX + Math.cos(angle + i * 0.3) * startRadius;
      const startY = this.centerY + Math.sin(angle + i * 0.5) * startRadius * 0.8;

      const x = startX + (this.centerX - startX) * easeProgress;
      const y = startY + (this.centerY - startY) * easeProgress;

      const size = 4 + Math.sin(this.time * 5 + i) * 2;
      const alpha = 1 - progress * 0.5;

      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255, 213, 79, ${alpha})`;
      this.ctx.shadowColor = '#ffd54f';
      this.ctx.shadowBlur = 15;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }
  }

  private drawQuantumTotem(elapsed: number): void {
    const rotation = (elapsed / 10) * Math.PI * 2;
    const totemSize = 100;

    this.ctx.save();
    this.ctx.translate(this.centerX, this.centerY);

    const layers = 5;
    for (let layer = 0; layer < layers; layer++) {
      const layerRotation = rotation * (layer % 2 === 0 ? 1 : -1) + layer * 0.3;
      const radius = totemSize * (0.4 + layer * 0.15);
      const alpha = 0.3 + (layer / layers) * 0.5;

      this.ctx.save();
      this.ctx.rotate(layerRotation);

      const lines = 8 + layer * 2;
      for (let i = 0; i < lines; i++) {
        const angle = (i / lines) * Math.PI * 2;
        const x1 = Math.cos(angle) * radius * 0.3;
        const y1 = Math.sin(angle) * radius * 0.3;
        const x2 = Math.cos(angle) * radius;
        const y2 = Math.sin(angle) * radius;

        const gradient = this.ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, `rgba(79, 195, 247, 0)`);
        gradient.addColorStop(0.5, `rgba(255, 213, 79, ${alpha})`);
        gradient.addColorStop(1, `rgba(200, 100, 255, 0)`);

        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.strokeStyle = gradient;
        this.ctx.lineWidth = 2;
        this.ctx.shadowColor = '#ffd54f';
        this.ctx.shadowBlur = 10;
        this.ctx.stroke();
      }

      this.ctx.restore();
    }

    const coreSize = 15 + Math.sin(this.time * 4) * 3;
    const coreGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize * 2);
    coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    coreGradient.addColorStop(0.3, 'rgba(255, 213, 79, 0.8)');
    coreGradient.addColorStop(1, 'rgba(255, 213, 79, 0)');

    this.ctx.beginPath();
    this.ctx.arc(0, 0, coreSize * 2, 0, Math.PI * 2);
    this.ctx.fillStyle = coreGradient;
    this.ctx.fill();

    this.ctx.restore();
  }

  public getCanvasSize(): { width: number; height: number } {
    return { width: this.canvas.width, height: this.canvas.height };
  }

  public isPointInResetButton(x: number, y: number): boolean {
    const bx = this.canvas.width - 40;
    const by = 40;
    const radius = 25;
    return Math.sqrt((x - bx) ** 2 + (y - by) ** 2) <= radius;
  }
}
