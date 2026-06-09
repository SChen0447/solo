import {
  PlayerState,
  Block,
  PressurePlate,
  ExitZone,
  Platform,
  GAME_CONFIG,
} from './types';

interface RenderState {
  player: PlayerState;
  blocks: ReadonlyArray<Block>;
  plates: ReadonlyArray<PressurePlate>;
  exit: ExitZone;
  platforms: ReadonlyArray<Platform>;
  levelName: string;
  levelIndex: number;
  totalLevels: number;
  timeRemaining: number;
  hasTimeLimit: boolean;
  timeUp: boolean;
  levelComplete: boolean;
  gameWon: boolean;
  magneticInfluences: Map<number, { inRange: boolean; pole: 'N' | 'S' }>;
  elapsedTime: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private worldWidth: number;
  private worldHeight: number;

  constructor(
    canvas: HTMLCanvasElement,
    worldWidth: number,
    worldHeight: number
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get Canvas 2D context');
    this.ctx = ctx;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const minW = 800;
    const maxW = 1600;

    const targetW = Math.min(maxW, Math.max(minW, cw));
    const scale = targetW / this.worldWidth;
    const canvasW = Math.floor(targetW);
    const canvasH = Math.floor(this.worldHeight * scale);

    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = canvasW + 'px';
    this.canvas.style.height = canvasH + 'px';
    this.canvas.width = Math.floor(canvasW * dpr);
    this.canvas.height = Math.floor(canvasH * dpr);

    this.ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    this.scale = scale;
    this.offsetX = (cw - canvasW) / 2;
    this.offsetY = (ch - canvasH) / 2;
  }

  getScale(): number {
    return this.scale;
  }

  render(state: RenderState): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.worldWidth, this.worldHeight);

    this.drawBackground();
    this.drawGrid();
    this.drawPlates(state.plates);
    this.drawPlatforms(state.platforms);
    this.drawExit(state.exit, state.elapsedTime);
    this.drawBlocks(state.blocks, state.magneticInfluences);
    this.drawPlayer(state.player);
    this.drawMagneticLines(state.player, state.blocks, state.magneticInfluences);
    this.drawUI(state);

    if (state.timeUp) {
      this.drawOverlay('时间到！', '按 R 键重新开始');
    } else if (state.levelComplete && !state.gameWon) {
      this.drawOverlay('关卡完成！', '按空格进入下一关');
    } else if (state.gameWon) {
      this.drawOverlay('恭喜通关！', '按 R 键重新挑战');
    }
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const grad = ctx.createRadialGradient(
      this.worldWidth / 2,
      this.worldHeight / 2,
      50,
      this.worldWidth / 2,
      this.worldHeight / 2,
      this.worldWidth * 0.7
    );
    grad.addColorStop(0, '#121826');
    grad.addColorStop(1, '#0B0E14');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(26, 39, 80, 0.3)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x <= this.worldWidth; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.worldHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= this.worldHeight; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.worldWidth, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawPlatforms(platforms: ReadonlyArray<Platform>): void {
    const ctx = this.ctx;
    for (const plat of platforms) {
      const isMoving = !!plat.path;
      ctx.save();
      const grad = ctx.createLinearGradient(
        plat.position.x,
        plat.position.y,
        plat.position.x,
        plat.position.y + plat.size.y
      );
      if (isMoving) {
        grad.addColorStop(0, '#3A5A9C');
        grad.addColorStop(1, '#1E3360');
      } else {
        grad.addColorStop(0, '#2A3A5C');
        grad.addColorStop(1, '#141E36');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(plat.position.x, plat.position.y, plat.size.x, plat.size.y);
      ctx.strokeStyle = isMoving ? 'rgba(100, 160, 255, 0.5)' : 'rgba(80, 120, 200, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(plat.position.x, plat.position.y, plat.size.x, plat.size.y);
      if (isMoving) {
        ctx.shadowColor = 'rgba(100, 160, 255, 0.4)';
        ctx.shadowBlur = 8;
        ctx.strokeRect(plat.position.x, plat.position.y, plat.size.x, plat.size.y);
      }
      ctx.restore();
    }
  }

  private drawPlates(plates: ReadonlyArray<PressurePlate>): void {
    const ctx = this.ctx;
    for (const plate of plates) {
      ctx.save();
      const color = plate.activated ? '#00FF00' : '#8B0000';
      ctx.fillStyle = color;
      if (plate.activated) {
        ctx.shadowColor = '#00FF00';
        ctx.shadowBlur = 15;
      }
      ctx.fillRect(plate.position.x, plate.position.y, plate.size.x, plate.size.y);
      ctx.strokeStyle = plate.activated ? '#66FF66' : '#550000';
      ctx.lineWidth = 2;
      ctx.strokeRect(plate.position.x, plate.position.y, plate.size.x, plate.size.y);
      ctx.fillStyle = '#EEEEEE';
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        `B${plate.targetBlockId}`,
        plate.position.x + plate.size.x / 2,
        plate.position.y + plate.size.y / 2 + 4
      );
      ctx.restore();
    }
  }

  private drawExit(exit: ExitZone, elapsed: number): void {
    const ctx = this.ctx;
    ctx.save();
    if (exit.unlocked) {
      const flick = 0.7 + Math.sin(elapsed * 4) * 0.3;
      const grad = ctx.createRadialGradient(
        exit.position.x + exit.size.x / 2,
        exit.position.y + exit.size.y / 2,
        5,
        exit.position.x + exit.size.x / 2,
        exit.position.y + exit.size.y / 2,
        exit.size.x
      );
      grad.addColorStop(0, `rgba(255, 215, 0, ${flick})`);
      grad.addColorStop(1, 'rgba(255, 180, 0, 0.1)');
      ctx.fillStyle = grad;
      ctx.fillRect(
        exit.position.x - 15,
        exit.position.y - 15,
        exit.size.x + 30,
        exit.size.y + 30
      );
      ctx.fillStyle = '#FFD700';
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 25;
      ctx.fillRect(exit.position.x, exit.position.y, exit.size.x, exit.size.y);
      for (const p of exit.particles) {
        const alpha = Math.min(1, (p.life / p.maxLife) * 2);
        const flickerP = 0.5 + Math.sin(elapsed * (0.5 + Math.random()) * 6) * 0.5;
        ctx.globalAlpha = alpha * flickerP;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.position.x, p.position.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(exit.position.x, exit.position.y, exit.size.x, exit.size.y);
    } else {
      ctx.fillStyle = 'rgba(120, 120, 120, 0.35)';
      ctx.fillRect(exit.position.x, exit.position.y, exit.size.x, exit.size.y);
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(exit.position.x, exit.position.y, exit.size.x, exit.size.y);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(200, 200, 200, 0.7)';
      ctx.font = 'bold 10px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(
        '锁定',
        exit.position.x + exit.size.x / 2,
        exit.position.y + exit.size.y / 2 + 4
      );
    }
    ctx.restore();
  }

  private drawBlocks(
    blocks: ReadonlyArray<Block>,
    influences: Map<number, { inRange: boolean; pole: 'N' | 'S' }>
  ): void {
    const ctx = this.ctx;
    for (const block of blocks) {
      const info = influences.get(block.id);
      const influenced = info?.inRange ?? false;

      ctx.save();
      const x = block.position.x - block.size / 2;
      const y = block.position.y - block.size / 2;
      const grad = ctx.createLinearGradient(x, y, x, y + block.size);
      grad.addColorStop(0, '#A8A8A8');
      grad.addColorStop(0.5, '#8B8B8B');
      grad.addColorStop(1, '#6B6B6B');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, block.size, block.size);

      ctx.strokeStyle = '#C8C8C8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 4, y + 4);
      ctx.lineTo(x + block.size - 4, y + 4);
      ctx.lineTo(x + block.size - 4, y + block.size * 0.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 4, y + 4);
      ctx.lineTo(x + 4, y + block.size - 4);
      ctx.lineTo(x + block.size * 0.4, y + block.size - 4);
      ctx.stroke();

      ctx.strokeStyle = influenced
        ? info!.pole === 'N'
          ? 'rgba(255, 100, 100, 0.8)'
          : 'rgba(100, 150, 255, 0.8)'
        : 'rgba(100, 100, 100, 0.6)';
      ctx.lineWidth = influenced ? 2.5 : 1.5;
      if (influenced) {
        ctx.shadowColor = info!.pole === 'N' ? '#FF6666' : '#6699FF';
        ctx.shadowBlur = 10;
      }
      ctx.strokeRect(x, y, block.size, block.size);
      ctx.shadowBlur = 0;

      for (const p of block.magneticParticles) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.position.x, p.position.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (block.attachedToPlayer) {
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(x - 3, y - 3, block.size + 6, block.size + 6);
        ctx.setLineDash([]);
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${block.id}`, block.position.x, block.position.y + 4);

      ctx.restore();
    }
  }

  private drawPlayer(player: PlayerState): void {
    const ctx = this.ctx;
    const size = GAME_CONFIG.PLAYER_SIZE;
    const isNPole = player.pole === 'N';
    const fillColor = isNPole ? '#FF3333' : '#3333FF';
    const glowColor = isNPole ? '#FFFFFF' : '#66FFFF';

    ctx.save();
    ctx.translate(player.position.x, player.position.y);

    const tilt = clamp(player.velocity.x / 500, -0.3, 0.3);
    ctx.rotate(tilt);

    if (player.poleCooldown > 0) {
      const pulse = 1 - player.poleCooldown;
      const radius = size * (1 + pulse * 1.5);
      const alpha = player.poleCooldown * 0.6;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      const pulseGrad = ctx.createRadialGradient(0, 0, size * 0.5, 0, 0, radius);
      pulseGrad.addColorStop(0, isNPole ? `rgba(255,200,200,${alpha})` : `rgba(200,220,255,${alpha})`);
      pulseGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = pulseGrad;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.moveTo(0, -size / 2);
    ctx.lineTo(size / 2, size / 2);
    ctx.lineTo(-size / 2, size / 2);
    ctx.closePath();

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 18;
    ctx.fillStyle = fillColor;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.pole, 0, 2);

    ctx.restore();
  }

  private drawMagneticLines(
    player: PlayerState,
    blocks: ReadonlyArray<Block>,
    influences: Map<number, { inRange: boolean; pole: 'N' | 'S' }>
  ): void {
    const ctx = this.ctx;
    ctx.save();
    for (const block of blocks) {
      const info = influences.get(block.id);
      if (!info?.inRange) continue;

      const dx = block.position.x - player.position.x;
      const dy = block.position.y - player.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const alpha = Math.max(0.1, 1 - dist / GAME_CONFIG.MAGNETIC_RADIUS);
      const color = info.pole === 'N' ? `rgba(255, 100, 100, ${alpha * 0.5})` : `rgba(100, 150, 255, ${alpha * 0.5})`;

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(player.position.x, player.position.y);
      ctx.lineTo(block.position.x, block.position.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const arrowCount = 3;
      for (let i = 1; i <= arrowCount; i++) {
        const t = i / (arrowCount + 1);
        const ax = player.position.x + dx * t;
        const ay = player.position.y + dy * t;
        const dirSign = info.pole === 'N' ? 1 : -1;
        this.drawArrow(ctx, ax, ay, dx * dirSign, dy * dirSign, color);
      }
    }
    ctx.restore();
  }

  private drawArrow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    dx: number,
    dy: number,
    color: string
  ): void {
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.1) return;
    const nx = dx / len;
    const ny = dy / len;
    const size = 5;
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + nx * size, y + ny * size);
    ctx.lineTo(x - nx * size - ny * size * 0.6, y - ny * size + nx * size * 0.6);
    ctx.lineTo(x - nx * size + ny * size * 0.6, y - ny * size - nx * size * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawUI(state: RenderState): void {
    const ctx = this.ctx;
    ctx.save();

    ctx.fillStyle = '#EEEEEE';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(100, 150, 255, 0.5)';
    ctx.shadowBlur = 8;
    ctx.fillText(state.levelName, 20, 38);
    ctx.shadowBlur = 0;

    ctx.font = '14px "Courier New", monospace';
    ctx.fillStyle = 'rgba(200, 220, 255, 0.8)';
    ctx.fillText(
      `关卡 ${state.levelIndex + 1} / ${state.totalLevels}`,
      20,
      60
    );

    const plateCount = state.plates.length;
    const activeCount = state.plates.filter((p) => p.activated).length;
    ctx.fillStyle = '#EEEEEE';
    ctx.font = '15px "Courier New", monospace';
    ctx.fillText(`压板 ${activeCount} / ${plateCount}`, 20, 85);

    if (state.hasTimeLimit) {
      const timeStr = Math.ceil(state.timeRemaining).toString().padStart(2, '0');
      ctx.textAlign = 'right';
      ctx.font = 'bold 32px "Courier New", monospace';
      const danger = state.timeRemaining <= 10;
      ctx.fillStyle = danger ? '#FF4444' : '#EEEEEE';
      ctx.shadowColor = danger ? 'rgba(255, 50, 50, 0.8)' : 'rgba(100, 150, 255, 0.5)';
      ctx.shadowBlur = 12;
      ctx.fillText(`00:${timeStr}`, this.worldWidth - 20, 42);
      ctx.shadowBlur = 0;
    }

    ctx.textAlign = 'right';
    ctx.font = '13px "Courier New", monospace';
    ctx.fillStyle = 'rgba(200, 220, 255, 0.7)';
    ctx.fillText('A/D 移动  W 跳跃  空格 切换磁极  R 重置', this.worldWidth - 20, this.worldHeight - 20);

    ctx.textAlign = 'left';
    const poleText = state.player.pole === 'N' ? 'N极 - 排斥' : 'S极 - 吸引';
    const poleColor = state.player.pole === 'N' ? '#FF6666' : '#6699FF';
    ctx.fillStyle = poleColor;
    ctx.font = 'bold 15px "Courier New", monospace';
    ctx.fillText(poleText, 20, this.worldHeight - 20);

    ctx.restore();
  }

  private drawOverlay(title: string, hint: string): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(11, 14, 20, 0.75)';
    ctx.fillRect(0, 0, this.worldWidth, this.worldHeight);

    ctx.fillStyle = '#EEEEEE';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(100, 180, 255, 0.8)';
    ctx.shadowBlur = 20;
    ctx.font = 'bold 48px "Courier New", monospace';
    ctx.fillText(title, this.worldWidth / 2, this.worldHeight / 2 - 10);
    ctx.shadowBlur = 0;

    ctx.font = '18px "Courier New", monospace';
    ctx.fillStyle = 'rgba(200, 220, 255, 0.8)';
    ctx.fillText(hint, this.worldWidth / 2, this.worldHeight / 2 + 40);
    ctx.restore();
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
