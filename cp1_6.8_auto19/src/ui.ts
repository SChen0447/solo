import type { Pet, ActionType } from './pet';

interface Button {
  x: number;
  y: number;
  radius: number;
  action: ActionType;
  icon: string;
  color1: string;
  color2: string;
  label: string;
  pressed: boolean;
  disabled: boolean;
  rippleEffect: { active: boolean; progress: number; x: number; y: number };
}

export class UI {
  private canvasWidth: number;
  private canvasHeight: number;
  
  private buttons: Button[] = [];
  private stripeOffset: number = 0;
  private pulsePhase: number = 0;
  
  private statBarWidth: number = 25;
  private statBarHeight: number = 180;
  private statBarX: number = 60;
  private statBarSpacing: number = 70;
  
  private timeDisplay: { day: number; isNight: boolean; progress: number } = { day: 1, isNight: false, progress: 0 };
  
  private criticalWarning: boolean = false;
  private statWarnings: { hunger: boolean; cleanliness: boolean; happiness: boolean; energy: boolean } = {
    hunger: false,
    cleanliness: false,
    happiness: false,
    energy: false
  };

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.initButtons();
  }
  
  private drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
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
  
  private initButtons(): void {
    const startX = this.canvasWidth - 120;
    const startY = this.canvasHeight / 2 - 80;
    const spacing = 90;
    
    this.buttons = [
      {
        x: startX,
        y: startY,
        radius: 40,
        action: 'feed',
        icon: '🍴',
        color1: '#FFD54F',
        color2: '#FF8F00',
        label: '喂食',
        pressed: false,
        disabled: false,
        rippleEffect: { active: false, progress: 0, x: 0, y: 0 }
      },
      {
        x: startX + spacing,
        y: startY,
        radius: 40,
        action: 'clean',
        icon: '💧',
        color1: '#4FC3F7',
        color2: '#0288D1',
        label: '清洁',
        pressed: false,
        disabled: false,
        rippleEffect: { active: false, progress: 0, x: 0, y: 0 }
      },
      {
        x: startX,
        y: startY + spacing,
        radius: 40,
        action: 'play',
        icon: '⭐',
        color1: '#F48FB1',
        color2: '#C2185B',
        label: '玩耍',
        pressed: false,
        disabled: false,
        rippleEffect: { active: false, progress: 0, x: 0, y: 0 }
      },
      {
        x: startX + spacing,
        y: startY + spacing,
        radius: 40,
        action: 'sleep',
        icon: '🌙',
        color1: '#B39DDB',
        color2: '#512DA8',
        label: '睡觉',
        pressed: false,
        disabled: false,
        rippleEffect: { active: false, progress: 0, x: 0, y: 0 }
      }
    ];
  }
  
  update(deltaTime: number, pet: Pet): void {
    this.stripeOffset += deltaTime * 0.05;
    if (this.stripeOffset > 20) this.stripeOffset = 0;
    
    this.pulsePhase += deltaTime * 0.005;
    
    this.timeDisplay.day = pet.ageInDays + 1;
    this.timeDisplay.isNight = pet.isNightTime();
    this.timeDisplay.progress = pet.getDayProgress();
    
    this.statWarnings = pet.getStatsWarning();
    this.criticalWarning = pet.getCriticalWarning();
    
    for (const btn of this.buttons) {
      btn.disabled = !pet.canPerformAction();
      
      if (btn.rippleEffect.active) {
        btn.rippleEffect.progress += deltaTime * 0.003;
        if (btn.rippleEffect.progress >= 1) {
          btn.rippleEffect.active = false;
          btn.rippleEffect.progress = 0;
        }
      }
      
      if (btn.pressed && !pet.canPerformAction()) {
        btn.pressed = false;
      }
    }
  }
  
  render(ctx: CanvasRenderingContext2D, pet: Pet): void {
    this.renderBackground(ctx);
    this.renderTimeDisplay(ctx);
    this.renderStatBars(ctx, pet);
    this.renderButtons(ctx);
    
    if (this.criticalWarning) {
      this.renderVignette(ctx);
    }
  }
  
  private renderBackground(ctx: CanvasRenderingContext2D): void {
    const centerX = this.canvasWidth / 2;
    const centerY = this.canvasHeight / 2 + 30;
    const roomRadius = Math.min(this.canvasWidth, this.canvasHeight) * 0.42;
    
    const gradient = ctx.createRadialGradient(centerX, centerY - 50, 0, centerX, centerY, roomRadius);
    
    if (this.timeDisplay.isNight) {
      gradient.addColorStop(0, '#E1BEE7');
      gradient.addColorStop(0.7, '#CE93D8');
      gradient.addColorStop(1, '#9C27B0');
    } else {
      gradient.addColorStop(0, '#B3E5FC');
      gradient.addColorStop(0.5, '#81D4FA');
      gradient.addColorStop(1, '#F8BBD0');
    }
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, roomRadius, 0, Math.PI * 2);
    ctx.fill();
    
    const floorGradient = ctx.createRadialGradient(centerX, centerY + roomRadius * 0.5, 0, centerX, centerY + roomRadius * 0.5, roomRadius * 0.8);
    floorGradient.addColorStop(0, 'rgba(0, 0, 0, 0.08)');
    floorGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = floorGradient;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + roomRadius * 0.55, roomRadius * 0.8, roomRadius * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  
  private renderTimeDisplay(ctx: CanvasRenderingContext2D): void {
    const x = 30;
    const y = 35;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ctx.lineWidth = 2;
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    
    this.drawRoundRect(ctx, x - 10, y - 25, 130, 50, 15);
    ctx.fill();
    ctx.stroke();
    
    ctx.shadowColor = 'transparent';
    
    const icon = this.timeDisplay.isNight ? '🌙' : '☀️';
    ctx.font = '24px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, x, y);
    
    ctx.fillStyle = '#5D4037';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`第 ${this.timeDisplay.day} 天`, x + 35, y);
    
    const barX = x + 35;
    const barY = y + 12;
    const barWidth = 80;
    const barHeight = 4;
    
    ctx.fillStyle = '#E0E0E0';
    this.drawRoundRect(ctx, barX, barY, barWidth, barHeight, 2);
    ctx.fill();
    
    const progressColor = this.timeDisplay.isNight ? '#7E57C2' : '#FFB74D';
    ctx.fillStyle = progressColor;
    this.drawRoundRect(ctx, barX, barY, barWidth * this.timeDisplay.progress, barHeight, 2);
    ctx.fill();
  }
  
  private renderStatBars(ctx: CanvasRenderingContext2D, pet: Pet): void {
    const stats = [
      { value: pet.hunger, label: '饱食', color1: '#FFD54F', color2: '#E64A19', warning: this.statWarnings.hunger, icon: '🍖' },
      { value: pet.cleanliness, label: '清洁', color1: '#81D4FA', color2: '#0277BD', warning: this.statWarnings.cleanliness, icon: '🧼' },
      { value: pet.happiness, label: '开心', color1: '#F48FB1', color2: '#C2185B', warning: this.statWarnings.happiness, icon: '💖' },
      { value: pet.energy, label: '精力', color1: '#CE93D8', color2: '#512DA8', warning: this.statWarnings.energy, icon: '⚡' }
    ];
    
    const startY = this.canvasHeight / 2 - (stats.length * this.statBarSpacing) / 2 + this.statBarSpacing / 2;
    
    for (let i = 0; i < stats.length; i++) {
      const stat = stats[i];
      const x = this.statBarX;
      const y = startY + i * this.statBarSpacing - this.statBarHeight / 2;
      
      this.renderStatBar(ctx, x, y, stat.value, stat.label, stat.color1, stat.color2, stat.warning, stat.icon, i);
    }
  }
  
  private renderStatBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    value: number,
    label: string,
    color1: string,
    color2: string,
    warning: boolean,
    icon: string,
    index: number
  ): void {
    const width = this.statBarWidth;
    const height = this.statBarHeight;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ctx.lineWidth = 2;
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    
    this.drawRoundRect(ctx, x - width / 2 - 5, y - 5, width + 10, height + 10, 12);
    ctx.fill();
    ctx.stroke();
    
    ctx.shadowColor = 'transparent';
    
    const bgGradient = ctx.createLinearGradient(x - width / 2, y, x + width / 2, y);
    bgGradient.addColorStop(0, '#E0E0E0');
    bgGradient.addColorStop(1, '#BDBDBD');
    
    ctx.fillStyle = bgGradient;
    this.drawRoundRect(ctx, x - width / 2, y, width, height, 8);
    ctx.fill();
    
    const fillHeight = height * (value / 100);
    const fillY = y + height - fillHeight;
    
    const fillGradient = ctx.createLinearGradient(x - width / 2, fillY, x + width / 2, y + height);
    fillGradient.addColorStop(0, color1);
    fillGradient.addColorStop(1, color2);
    
    ctx.save();
    this.drawRoundRect(ctx, x - width / 2, fillY, width, fillHeight, 8);
    ctx.clip();
    
    ctx.fillStyle = fillGradient;
    ctx.fillRect(x - width / 2, fillY, width, fillHeight);
    
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = 'white';
    for (let sy = y - this.stripeOffset; sy < y + height; sy += 20) {
      ctx.beginPath();
      ctx.moveTo(x - width / 2, sy);
      ctx.lineTo(x - width / 2 + width, sy + 10);
      ctx.lineTo(x - width / 2 + width, sy + 15);
      ctx.lineTo(x - width / 2, sy + 5);
      ctx.closePath();
      ctx.fill();
    }
    
    ctx.restore();
    
    if (warning) {
      const pulseAlpha = 0.3 + Math.sin(this.pulsePhase * 3 + index) * 0.3;
      ctx.strokeStyle = `rgba(244, 67, 54, ${0.8 + pulseAlpha})`;
      ctx.lineWidth = 3;
      this.drawRoundRect(ctx, x - width / 2 - 2, y - 2, width + 4, height + 4, 10);
      ctx.stroke();
      
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('⚠️', x, y - 15);
    }
    
    ctx.fillStyle = '#5D4037';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + height + 20);
    
    ctx.font = '18px Arial';
    ctx.fillText(icon, x, y - 8);
  }
  
  private renderButtons(ctx: CanvasRenderingContext2D): void {
    for (const btn of this.buttons) {
      this.renderButton(ctx, btn);
    }
  }
  
  private renderButton(ctx: CanvasRenderingContext2D, btn: Button): void {
    const { x, y, radius, color1, color2, icon, pressed, disabled, rippleEffect } = btn;
    
    ctx.save();
    
    if (pressed) {
      ctx.translate(x, y + 3);
    } else {
      ctx.translate(x, y);
    }
    
    const scale = pressed ? 0.92 : 1;
    ctx.scale(scale, scale);
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = pressed ? 4 : 10;
    ctx.shadowOffsetY = pressed ? 1 : 4;
    
    const gradient = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, 0, 0, 0, radius);
    if (disabled) {
      gradient.addColorStop(0, '#BDBDBD');
      gradient.addColorStop(1, '#757575');
    } else {
      gradient.addColorStop(0, color1);
      gradient.addColorStop(1, color2);
    }
    
    ctx.fillStyle = gradient;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.shadowColor = 'transparent';
    
    if (rippleEffect.active) {
      ctx.globalAlpha = 1 - rippleEffect.progress;
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, radius * (0.5 + rippleEffect.progress * 0.8), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    
    ctx.font = `${radius * 0.9}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (disabled) {
      ctx.globalAlpha = 0.6;
    }
    ctx.fillText(icon, 0, 2);
    ctx.globalAlpha = 1;
    
    ctx.restore();
    
    ctx.fillStyle = '#5D4037';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(btn.label, x, y + radius + 20);
  }
  
  private renderVignette(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createRadialGradient(
      this.canvasWidth / 2, this.canvasHeight / 2, Math.min(this.canvasWidth, this.canvasHeight) * 0.3,
      this.canvasWidth / 2, this.canvasHeight / 2, Math.max(this.canvasWidth, this.canvasHeight) * 0.7
    );
    
    const pulseIntensity = 0.2 + Math.sin(this.pulsePhase * 2) * 0.1;
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${pulseIntensity})`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }
  
  handleClick(clickX: number, clickY: number): ActionType | null {
    for (const btn of this.buttons) {
      const dx = clickX - btn.x;
      const dy = clickY - btn.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist <= btn.radius && !btn.disabled) {
        btn.pressed = true;
        btn.rippleEffect.active = true;
        btn.rippleEffect.progress = 0;
        btn.rippleEffect.x = clickX - btn.x;
        btn.rippleEffect.y = clickY - btn.y;
        
        setTimeout(() => {
          btn.pressed = false;
        }, 150);
        
        return btn.action;
      }
    }
    return null;
  }
  
  handleMouseMove(_mouseX: number, _mouseY: number): void {
  }
  
  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.initButtons();
  }
}
