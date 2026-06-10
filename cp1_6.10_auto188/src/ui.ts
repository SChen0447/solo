export interface GameState {
  fishCount: number;
  coins: number;
  netRangeLevel: number;
  speedLevel: number;
  tideProgress: number;
  isHighTide: boolean;
  fishFlashTimer: number;
  coinFlashTimer: number;
}

export interface UIConfig {
  canvasWidth: number;
  canvasHeight: number;
  isSmallScreen: boolean;
}

export class UIManager {
  private shopOpen: boolean = false;
  private shopButtonHovered: boolean = false;
  private mouseX: number = 0;
  private mouseY: number = 0;

  constructor() {
    this.shopOpen = false;
  }

  handleMouseMove(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
    this.updateShopButtonHover();
  }

  handleClick(x: number, y: number, onBuy: (type: 'net' | 'speed') => void): boolean {
    const shopBtn = this.getShopButtonRect();
    if (x >= shopBtn.x && x <= shopBtn.x + shopBtn.w &&
        y >= shopBtn.y && y <= shopBtn.y + shopBtn.h) {
      this.shopOpen = !this.shopOpen;
      return true;
    }

    if (this.shopOpen) {
      const modal = this.getModalRect();
      if (x < modal.x || x > modal.x + modal.w ||
          y < modal.y || y > modal.y + modal.h) {
        this.shopOpen = false;
        return true;
      }

      const netBtn = this.getBuyButtonRect(modal, 0);
      if (x >= netBtn.x && x <= netBtn.x + netBtn.w &&
          y >= netBtn.y && y <= netBtn.y + netBtn.h) {
        onBuy('net');
        return true;
      }

      const speedBtn = this.getBuyButtonRect(modal, 1);
      if (x >= speedBtn.x && x <= speedBtn.x + speedBtn.w &&
          y >= speedBtn.y && y <= speedBtn.y + speedBtn.h) {
        onBuy('speed');
        return true;
      }
    }

    return false;
  }

  private updateShopButtonHover(): void {
    const btn = this.getShopButtonRect();
    this.shopButtonHovered =
      this.mouseX >= btn.x && this.mouseX <= btn.x + btn.w &&
      this.mouseY >= btn.y && this.mouseY <= btn.y + btn.h;
  }

  private getShopButtonRect(): { x: number; y: number; w: number; h: number } {
    const w = 60;
    const h = 30;
    const config: UIConfig = {
      canvasWidth: window.innerWidth,
      canvasHeight: window.innerHeight,
      isSmallScreen: window.innerWidth < 600
    };
    if (config.isSmallScreen) {
      return {
        x: (config.canvasWidth - w) / 2,
        y: config.canvasHeight - h - 15,
        w, h
      };
    }
    return {
      x: config.canvasWidth - w - 15,
      y: config.canvasHeight - h - 15,
      w, h
    };
  }

  private getModalRect(): { x: number; y: number; w: number; h: number } {
    const w = 200;
    const h = 300;
    const config: UIConfig = {
      canvasWidth: window.innerWidth,
      canvasHeight: window.innerHeight,
      isSmallScreen: window.innerWidth < 600
    };
    return {
      x: (config.canvasWidth - w) / 2,
      y: (config.canvasHeight - h) / 2,
      w, h
    };
  }

  private getBuyButtonRect(modal: { x: number; y: number; w: number; h: number },
                           index: number): { x: number; y: number; w: number; h: number } {
    const w = 100;
    const h = 30;
    return {
      x: modal.x + (modal.w - w) / 2,
      y: modal.y + 100 + index * 80,
      w, h
    };
  }

  draw(ctx: CanvasRenderingContext2D, state: GameState, config: UIConfig): void {
    this.drawResourcePanel(ctx, state, config);
    this.drawTideTimer(ctx, state, config);
    this.drawShopButton(ctx, config);
    if (this.shopOpen) {
      this.drawShopModal(ctx, state, config);
    }
  }

  private drawResourcePanel(ctx: CanvasRenderingContext2D, state: GameState,
                            config: UIConfig): void {
    const scale = config.isSmallScreen ? 0.8 : 1.0;
    const padding = 8 * scale;
    const fontSize = 14 * scale;
    const panelWidth = 130 * scale;
    const panelHeight = 60 * scale;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.roundRect(ctx, 10, 10, panelWidth, panelHeight, 6);
    ctx.fill();

    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 1;
    this.roundRect(ctx, 10, 10, panelWidth, panelHeight, 6);
    ctx.stroke();

    ctx.font = `${fontSize}px Arial`;
    ctx.textBaseline = 'top';

    const fishColor = state.fishFlashTimer > 0 ?
      this.interpolateColor('#ffd700', '#ffffff', state.fishFlashTimer / 0.3) :
      '#ffd700';
    ctx.fillStyle = fishColor;
    ctx.fillText(`鱼获: ${state.fishCount}`, 10 + padding, 10 + padding);

    const coinColor = state.coinFlashTimer > 0 ?
      this.interpolateColor('#ffd700', '#ffffff', state.coinFlashTimer / 0.3) :
      '#ffd700';
    ctx.fillStyle = coinColor;
    ctx.fillText(`金币: ${state.coins}`, 10 + padding, 10 + padding + fontSize + 4);
  }

  private drawTideTimer(ctx: CanvasRenderingContext2D, state: GameState,
                        config: UIConfig): void {
    const scale = config.isSmallScreen ? 0.8 : 1.0;
    const radius = 25 * scale;
    const centerX = config.canvasWidth - radius - 15;
    const centerY = radius + 15;
    const lineWidth = 4 * scale;

    const progressColor = this.interpolateColor('#3498db', '#2ecc71', state.tideProgress);

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(44, 62, 80, 0.8)';
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI / 2,
      -Math.PI / 2 + state.tideProgress * Math.PI * 2);
    ctx.strokeStyle = progressColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    ctx.font = `${10 * scale}px Arial`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.isHighTide ? '涨潮' : '退潮', centerX, centerY);
    ctx.textAlign = 'left';
  }

  private drawShopButton(ctx: CanvasRenderingContext2D, config: UIConfig): void {
    const btn = this.getShopButtonRect();

    ctx.fillStyle = this.shopButtonHovered ? '#9b59b6' : '#8e44ad';
    this.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 6);
    ctx.fill();

    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 1;
    this.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 6);
    ctx.stroke();

    ctx.font = '14px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('商店', btn.x + btn.w / 2, btn.y + btn.h / 2);
    ctx.textAlign = 'left';
  }

  private drawShopModal(ctx: CanvasRenderingContext2D, state: GameState,
                        config: UIConfig): void {
    const modal = this.getModalRect();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.roundRect(ctx, modal.x, modal.y, modal.w, modal.h, 8);
    ctx.fill();

    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 1;
    this.roundRect(ctx, modal.x, modal.y, modal.w, modal.h, 8);
    ctx.stroke();

    ctx.font = '16px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('升级商店', modal.x + modal.w / 2, modal.y + 15);

    this.drawUpgradeItem(ctx, modal, 0,
      '增加渔网范围', state.netRangeLevel, 3, 50, state.coins);
    this.drawUpgradeItem(ctx, modal, 1,
      '增加渔船速度', state.speedLevel, 3, 50, state.coins);

    ctx.textAlign = 'left';
  }

  private drawUpgradeItem(ctx: CanvasRenderingContext2D,
                          modal: { x: number; y: number; w: number; h: number },
                          index: number, name: string, level: number,
                          maxLevel: number, cost: number, coins: number): void {
    const y = modal.y + 50 + index * 80;

    ctx.font = '13px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(`${name} ${level}/${maxLevel}`, modal.x + modal.w / 2, y);

    const btn = this.getBuyButtonRect(modal, index);
    const canAfford = coins >= cost && level < maxLevel;
    const isMaxed = level >= maxLevel;

    ctx.fillStyle = isMaxed ? '#555555' : (canAfford ? '#27ae60' : '#7f8c8d');
    this.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 4);
    ctx.fill();

    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 1;
    this.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 4);
    ctx.stroke();

    ctx.font = '12px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(isMaxed ? '已满级' : `${cost} 金币`,
      btn.x + btn.w / 2, btn.y + btn.h / 2 - 6);
  }

  private roundRect(ctx: CanvasRenderingContext2D,
                    x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private interpolateColor(color1: string, color2: string, t: number): string {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }
}
