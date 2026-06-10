import type { PlayerCell, SmallCell, BigCell, EnergyGem } from './entities';

export interface UIState {
  energy: number;
  maxEnergy: number;
  level: number;
  consumeCount: number;
  isPaused: boolean;
  isGameOver: boolean;
  dashCooldown: number;
  isMobile: boolean;
  mouseX: number;
  mouseY: number;
}

export interface VirtualButton {
  x: number;
  y: number;
  radius: number;
  label: string;
  hoverScale: number;
  pressScale: number;
  isHovered: boolean;
  isPressed: boolean;
  pressAnimation: number;
  action: string;
}

export class UIRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  levelUpAnimation: { active: boolean; timer: number; level: number };
  gameOverAnimation: { active: boolean; timer: number; scale: number };
  consumeCountAnimation: { target: number; display: number };
  buttons: VirtualButton[];
  minimapScale: number;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.levelUpAnimation = { active: false, timer: 0, level: 0 };
    this.gameOverAnimation = { active: false, timer: 0, scale: 0 };
    this.consumeCountAnimation = { target: 0, display: 0 };
    this.minimapScale = 4;
    this.buttons = [];
    this.initButtons();
  }

  initButtons(): void {
    this.buttons = [
      {
        x: 0,
        y: 0,
        radius: 35,
        label: '冲刺',
        hoverScale: 1.1,
        pressScale: 0.9,
        isHovered: false,
        isPressed: false,
        pressAnimation: 0,
        action: 'dash'
      },
      {
        x: 0,
        y: 0,
        radius: 35,
        label: '暂停',
        hoverScale: 1.1,
        pressScale: 0.9,
        isHovered: false,
        isPressed: false,
        pressAnimation: 0,
        action: 'pause'
      }
    ];
  }

  triggerLevelUp(level: number): void {
    this.levelUpAnimation = { active: true, timer: 1500, level };
  }

  triggerGameOver(): void {
    this.gameOverAnimation = { active: true, timer: 3000, scale: 0 };
  }

  resetGameOver(): void {
    this.gameOverAnimation = { active: false, timer: 0, scale: 0 };
  }

  updateConsumeCount(target: number): void {
    this.consumeCountAnimation.target = target;
  }

  updateButtonPositions(width: number, height: number, isMobile: boolean): void {
    const padding = isMobile ? 30 : 20;
    const btnRadius = isMobile ? 45 : 35;
    const spacing = isMobile ? 110 : 90;

    this.buttons[0].radius = btnRadius;
    this.buttons[1].radius = btnRadius;

    this.buttons[0].x = width - padding - btnRadius - spacing;
    this.buttons[0].y = height - padding - btnRadius;

    this.buttons[1].x = width - padding - btnRadius;
    this.buttons[1].y = height - padding - btnRadius;
  }

  checkButtonClick(x: number, y: number): string | null {
    for (const btn of this.buttons) {
      const dx = x - btn.x;
      const dy = y - btn.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= btn.radius) {
        btn.isPressed = true;
        btn.pressAnimation = 1;
        return btn.action;
      }
    }
    return null;
  }

  updateButtonHover(x: number, y: number): void {
    for (const btn of this.buttons) {
      const dx = x - btn.x;
      const dy = y - btn.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      btn.isHovered = dist <= btn.radius * 1.2;
    }
  }

  update(dt: number): void {
    if (this.levelUpAnimation.active) {
      this.levelUpAnimation.timer -= dt;
      if (this.levelUpAnimation.timer <= 0) {
        this.levelUpAnimation.active = false;
      }
    }

    if (this.gameOverAnimation.active) {
      this.gameOverAnimation.timer -= dt;
      this.gameOverAnimation.scale = Math.min(1, this.gameOverAnimation.scale + dt / 400);
    }

    const diff = this.consumeCountAnimation.target - this.consumeCountAnimation.display;
    if (Math.abs(diff) > 0.5) {
      this.consumeCountAnimation.display += diff * 0.2;
    } else {
      this.consumeCountAnimation.display = this.consumeCountAnimation.target;
    }

    for (const btn of this.buttons) {
      if (btn.pressAnimation > 0) {
        btn.pressAnimation = Math.max(0, btn.pressAnimation - dt / 200);
        if (btn.pressAnimation === 0) {
          btn.isPressed = false;
        }
      }
    }
  }

  drawBackground(width: number, height: number, time: number): void {
    const gradient = this.ctx.createRadialGradient(
      width / 2,
      height / 2,
      0,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.7
    );
    gradient.addColorStop(0, '#004466');
    gradient.addColorStop(1, '#001a33');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);
  }

  drawEnergyBar(state: UIState, time: number): void {
    const { ctx, canvas } = this;
    const isMobile = state.isMobile;
    const padding = isMobile ? 15 : 20;
    const barWidth = isMobile ? 150 : 200;
    const barHeight = isMobile ? 16 : 20;
    const panelW = barWidth + padding * 2;
    const panelH = isMobile ? 100 : 110;
    const panelX = padding;
    const panelY = padding;

    this.drawPanel(panelX, panelY, panelW, panelH, isMobile);

    const barX = panelX + padding;
    const barY = panelY + padding;
    const energyRatio = Math.max(0, Math.min(1, state.energy / state.maxEnergy));

    const barGradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
    barGradient.addColorStop(0, '#ff4444');
    barGradient.addColorStop(0.5, '#ffaa00');
    barGradient.addColorStop(1, '#44ff44');

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    this.roundRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4, 6);
    ctx.fill();

    ctx.beginPath();
    this.roundRect(barX, barY, barWidth, barHeight, 4);
    ctx.fillStyle = 'rgba(50, 50, 80, 0.8)';
    ctx.fill();

    if (energyRatio > 0) {
      ctx.beginPath();
      this.roundRect(barX, barY, barWidth * energyRatio, barHeight, 4);
      ctx.fillStyle = barGradient;
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      this.roundRect(barX, barY, barWidth * energyRatio, barHeight, 4);
      ctx.clip();

      const shineX = barX + ((time * 0.15) % (barWidth + 50)) - 50;
      const shineGradient = ctx.createLinearGradient(shineX, barY, shineX + 40, barY);
      shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
      shineGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.4)');
      shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = shineGradient;
      ctx.fillRect(shineX, barY, 40, barHeight);
      ctx.restore();
    }

    ctx.strokeStyle = 'rgba(100, 150, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    this.roundRect(barX, barY, barWidth, barHeight, 4);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${isMobile ? 12 : 14}px 'Microsoft YaHei', sans-serif`;
    ctx.textBaseline = 'top';
    const energyText = `能量: ${Math.floor(state.energy)} / ${state.maxEnergy}`;
    ctx.fillText(energyText, barX, barY + barHeight + 8);

    const levelText = `Lv.${state.level}`;
    ctx.fillStyle = `hsl(${180 + state.level * 20}, 80%, 65%)`;
    ctx.font = `bold ${isMobile ? 18 : 22}px 'Microsoft YaHei', sans-serif`;
    ctx.shadowBlur = 8;
    ctx.shadowColor = `hsl(${180 + state.level * 20}, 80%, 60%)`;
    ctx.fillText(levelText, barX, barY + barHeight + 28);
    ctx.shadowBlur = 0;

    const countDisplay = Math.floor(this.consumeCountAnimation.display);
    const bounce = 1 + Math.sin(time * 0.01 + countDisplay) * 0.02 * (this.consumeCountAnimation.target !== this.consumeCountAnimation.display ? 3 : 0);
    ctx.save();
    ctx.translate(barX + barWidth - 20, barY + barHeight + 38);
    ctx.scale(bounce, bounce);
    ctx.fillStyle = '#ffdd44';
    ctx.font = `bold ${isMobile ? 12 : 14}px 'Microsoft YaHei', sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(`吞噬: ${countDisplay}`, 0, 0);
    ctx.restore();
  }

  drawMinimap(
    state: UIState,
    player: PlayerCell,
    smallCells: SmallCell[],
    bigCells: BigCell[],
    gems: EnergyGem[],
    worldWidth: number,
    worldHeight: number
  ): void {
    const { ctx } = this;
    const isMobile = state.isMobile;
    const padding = isMobile ? 15 : 20;
    const mapSize = isMobile ? 90 : 120;
    const panelSize = mapSize + padding * 2;

    const panelX = this.canvas.width - panelSize;
    const panelY = padding;

    this.drawPanel(panelX, panelY, panelSize, panelSize, isMobile);

    const mapX = panelX + padding;
    const mapY = panelY + padding;

    ctx.save();
    ctx.beginPath();
    ctx.arc(mapX + mapSize / 2, mapY + mapSize / 2, mapSize / 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = 'rgba(0, 20, 40, 0.8)';
    ctx.fillRect(mapX, mapY, mapSize, mapSize);

    const scaleX = mapSize / worldWidth;
    const scaleY = mapSize / worldHeight;

    for (const gem of gems) {
      if (!gem.active) continue;
      ctx.beginPath();
      ctx.arc(mapX + gem.x * scaleX, mapY + gem.y * scaleY, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#FFD700';
      ctx.fill();
    }

    for (const cell of smallCells) {
      if (!cell.active) continue;
      ctx.beginPath();
      ctx.arc(mapX + cell.x * scaleX, mapY + cell.y * scaleY, 2, 0, Math.PI * 2);
      ctx.fillStyle = `hsl(${cell.hue}, 70%, 60%)`;
      ctx.fill();
    }

    for (const cell of bigCells) {
      if (!cell.active) continue;
      ctx.beginPath();
      ctx.arc(mapX + cell.x * scaleX, mapY + cell.y * scaleY, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200, 100, 255, 0.9)';
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(mapX + player.x * scaleX, mapY + player.y * scaleY, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#44ccff';
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#44ccff';
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();

    ctx.beginPath();
    ctx.arc(mapX + mapSize / 2, mapY + mapSize / 2, mapSize / 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawButtons(state: UIState, time: number): void {
    const { ctx } = this;

    for (const btn of this.buttons) {
      let scale = 1;
      if (btn.isHovered && !btn.isPressed) scale = btn.hoverScale;
      if (btn.isPressed || btn.pressAnimation > 0) {
        scale = btn.pressScale + (1 - btn.pressAnimation) * (1 - btn.pressScale);
      }

      let bgColor = 'rgba(20, 40, 70, 0.7)';
      let borderColor = 'rgba(100, 150, 255, 0.5)';

      if (btn.action === 'dash') {
        const ready = state.dashCooldown <= 0;
        bgColor = ready
          ? (btn.isHovered ? 'rgba(60, 150, 255, 0.8)' : 'rgba(40, 100, 200, 0.7)')
          : 'rgba(60, 60, 80, 0.7)';
        borderColor = ready ? 'rgba(100, 180, 255, 0.8)' : 'rgba(100, 100, 120, 0.5)';
      } else if (btn.action === 'pause') {
        if (state.isPaused) {
          bgColor = btn.isHovered ? 'rgba(255, 180, 60, 0.8)' : 'rgba(220, 140, 40, 0.7)';
          borderColor = 'rgba(255, 200, 100, 0.8)';
        } else {
          bgColor = btn.isHovered ? 'rgba(100, 200, 100, 0.8)' : 'rgba(60, 160, 60, 0.7)';
          borderColor = 'rgba(150, 255, 150, 0.8)';
        }
      }

      ctx.save();
      ctx.translate(btn.x, btn.y);
      ctx.scale(scale, scale);

      ctx.beginPath();
      ctx.arc(0, 0, btn.radius, 0, Math.PI * 2);
      ctx.fillStyle = bgColor;
      ctx.shadowBlur = 15;
      ctx.shadowColor = borderColor;
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      if (btn.action === 'dash' && state.dashCooldown > 0) {
        const cooldownRatio = state.dashCooldown / 3000;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, btn.radius - 4, -Math.PI / 2, -Math.PI / 2 + (1 - cooldownRatio) * Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = 'rgba(100, 180, 255, 0.3)';
        ctx.fill();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${state.isMobile ? 16 : 14}px 'Microsoft YaHei', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, 0, 0);

      ctx.restore();
    }
  }

  drawLevelUp(time: number): void {
    if (!this.levelUpAnimation.active) return;
    const { ctx, canvas } = this;
    const t = this.levelUpAnimation.timer / 1500;
    const alpha = t < 0.2 ? t / 0.2 : (t > 0.8 ? (1 - t) / 0.2 : 1);
    const scale = 1 + (1 - t) * 0.5;
    const glow = 0.5 + 0.5 * Math.sin(time * 0.01);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(scale, scale);

    const text = `升级！Lv.${this.levelUpAnimation.level}`;
    ctx.font = "bold 48px 'Microsoft YaHei', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowBlur = 30 + glow * 20;
    ctx.shadowColor = `hsla(${180 + this.levelUpAnimation.level * 20}, 100%, 60%, ${alpha})`;
    ctx.fillStyle = `hsla(${180 + this.levelUpAnimation.level * 20}, 100%, 75%, ${alpha})`;
    ctx.fillText(text, 0, 0);

    ctx.strokeStyle = `hsla(${180 + this.levelUpAnimation.level * 20}, 100%, 90%, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.strokeText(text, 0, 0);

    ctx.restore();
  }

  drawGameOver(time: number): boolean {
    if (!this.gameOverAnimation.active) return false;
    const { ctx, canvas } = this;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    const s = this.gameOverAnimation.scale;
    ctx.scale(s, s);

    const glow = 0.5 + 0.5 * Math.sin(time * 0.008);
    ctx.font = "bold 72px 'Microsoft YaHei', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowBlur = 40 + glow * 20;
    ctx.shadowColor = `rgba(255, 60, 60, ${0.8 * s})`;
    ctx.fillStyle = `rgba(255, 80, 80, ${s})`;
    ctx.fillText('GAME OVER', 0, 0);

    ctx.strokeStyle = `rgba(255, 200, 200, ${s})`;
    ctx.lineWidth = 3;
    ctx.strokeText('GAME OVER', 0, 0);

    ctx.restore();

    return this.gameOverAnimation.timer <= 0 && this.gameOverAnimation.scale >= 1;
  }

  drawPaused(): void {
    const { ctx, canvas } = this;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 48px 'Microsoft YaHei', sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(100, 180, 255, 0.8)';
    ctx.fillText('已暂停', canvas.width / 2, canvas.height / 2);
    ctx.shadowBlur = 0;

    ctx.font = "20px 'Microsoft YaHei', sans-serif";
    ctx.fillStyle = 'rgba(200, 220, 255, 0.8)';
    ctx.fillText('点击继续按钮或按空格键恢复', canvas.width / 2, canvas.height / 2 + 50);
  }

  private drawPanel(x: number, y: number, w: number, h: number, _isMobile: boolean): void {
    const { ctx } = this;
    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 26, 0.7)';
    ctx.beginPath();
    this.roundRect(x, y, w, h, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(100, 150, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    this.roundRect(x, y, w, h, 12);
    ctx.stroke();
    ctx.restore();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const { ctx } = this;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }
}
