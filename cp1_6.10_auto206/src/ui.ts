import type { GrowthParams } from './flower';

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

interface SliderConfig {
  key: keyof GrowthParams;
  label: string;
  min: number;
  max: number;
  step: number;
  idealMin: number;
  idealMax: number;
  unit: string;
}

interface SliderState {
  dragging: boolean;
}

interface InfoBarState {
  visible: boolean;
  startTime: number;
  age: number;
  health: number;
}

interface ScoreState {
  displayed: number;
  target: number;
  startTime: number;
  duration: number;
  transitioning: boolean;
}

export type OnParamsChange = (params: GrowthParams) => void;

export class UIDrawer {
  private canvasWidth: number;
  private canvasHeight: number;

  private params: GrowthParams;
  private onParamsChange: OnParamsChange;

  private panelX: number = 0;
  private panelY: number = 0;
  private panelW: number = 0;
  private panelH: number = 0;

  private sliders: SliderConfig[] = [
    { key: 'light', label: '光照', min: 1, max: 16, step: 0.5, idealMin: 8, idealMax: 12, unit: 'h' },
    { key: 'water', label: '水分', min: 0, max: 100, step: 5, idealMin: 40, idealMax: 70, unit: '%' },
    { key: 'fertility', label: '肥力', min: 1, max: 10, step: 1, idealMin: 4, idealMax: 7, unit: '级' }
  ];

  private sliderStates: Record<keyof GrowthParams, SliderState> = {
    light: { dragging: false },
    water: { dragging: false },
    fertility: { dragging: false }
  };

  private hoveredSlider: keyof GrowthParams | null = null;
  private environmentHovered: boolean = false;

  private infoBar: InfoBarState = { visible: false, startTime: 0, age: 0, health: 0 };
  private warningGlowStart: number = 0;
  private warningGlowActive: boolean = false;

  private scoreState: ScoreState = { displayed: 0, target: 0, startTime: 0, duration: 600, transitioning: false };

  private mouseX: number = 0;
  private mouseY: number = 0;

  constructor(width: number, height: number, initialParams: GrowthParams, onParamsChange: OnParamsChange) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.params = { ...initialParams };
    this.onParamsChange = onParamsChange;
    this.calculatePanelRect();
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.calculatePanelRect();
  }

  private calculatePanelRect(): void {
    this.panelW = Math.max(180, this.canvasWidth * 0.2);
    this.panelH = Math.max(400, this.canvasHeight * 0.7);
    this.panelX = this.canvasWidth - this.panelW - 30;
    this.panelY = (this.canvasHeight - this.panelH) / 2;
  }

  updateParams(params: GrowthParams): void {
    this.params = { ...params };
  }

  showInfoBar(age: number, health: number, now: number): void {
    this.infoBar = { visible: true, startTime: now, age, health };
  }

  update(now: number, healthScore: number): void {
    if (this.scoreState.target !== healthScore) {
      this.scoreState.start = this.scoreState.displayed;
      this.scoreState.target = healthScore;
      this.scoreState.startTime = now;
      this.scoreState.transitioning = true;
    }
    if (this.scoreState.transitioning) {
      const elapsed = now - this.scoreState.startTime;
      const t = Math.min(1, elapsed / this.scoreState.duration);
      this.scoreState.displayed = Math.round(lerp(this.scoreState.start ?? 0, this.scoreState.target, easeInOutCubic(t)));
      if (t >= 1) this.scoreState.transitioning = false;
    }
  }

  triggerWarning(now: number): void {
    this.warningGlowStart = now;
    this.warningGlowActive = true;
  }

  draw(ctx: CanvasRenderingContext2D, now: number, healthScore: number): void {
    this.drawWarningGlow(ctx, now);
    this.drawPanel(ctx);
    this.drawSliders(ctx, now);
    this.drawEnvironmentIndicator(ctx, now);
    this.drawStatusDot(ctx, now, healthScore);
    this.drawInfoBar(ctx, now);
  }

  private drawWarningGlow(ctx: CanvasRenderingContext2D, now: number): void {
    if (!this.warningGlowActive) return;
    const elapsed = now - this.warningGlowStart;
    const duration = 800;
    if (elapsed > duration) {
      this.warningGlowActive = false;
      return;
    }
    const t = elapsed / duration;
    const alpha = 0.2 * (1 - t);
    ctx.save();
    ctx.strokeStyle = `rgba(255, 69, 0, ${alpha})`;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.restore();
  }

  private drawPanel(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, this.panelX, this.panelY, this.panelW, this.panelH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#228B22';
    ctx.font = 'bold 18px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('控制面板', this.panelX + this.panelW / 2, this.panelY + 20);
    ctx.restore();
  }

  private drawSliders(ctx: CanvasRenderingContext2D, now: number): void {
    const sliderAreaTop = this.panelY + 65;
    const sliderSpacing = 95;

    for (let i = 0; i < this.sliders.length; i++) {
      const s = this.sliders[i];
      const y = sliderAreaTop + i * sliderSpacing;
      this.drawSingleSlider(ctx, s, y, now);
    }
  }

  private drawSingleSlider(ctx: CanvasRenderingContext2D, s: SliderConfig, y: number, now: number): void {
    const trackX = this.panelX + 20;
    const trackY = y + 30;
    const trackW = this.panelW - 40;
    const trackH = 8;

    ctx.save();
    ctx.fillStyle = '#228B22';
    ctx.font = '14px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(s.label, trackX, y);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff69b4';
    ctx.font = 'bold 14px sans-serif';
    const val = this.params[s.key];
    ctx.fillText(`${val}${s.unit}`, trackX + trackW, y);

    this.roundRect(ctx, trackX, trackY, trackW, trackH, 4);
    ctx.fillStyle = '#e0e0e0';
    ctx.fill();

    const idealStartX = trackX + ((s.idealMin - s.min) / (s.max - s.min)) * trackW;
    const idealEndX = trackX + ((s.idealMax - s.min) / (s.max - s.min)) * trackW;
    const idealW = idealEndX - idealStartX;

    ctx.save();
    this.roundRect(ctx, trackX, trackY, trackW, trackH, 4);
    ctx.clip();
    const idealGrad = ctx.createLinearGradient(idealStartX, 0, idealEndX, 0);
    idealGrad.addColorStop(0, '#90EE90');
    idealGrad.addColorStop(1, '#FFD700');
    ctx.fillStyle = idealGrad;
    ctx.fillRect(idealStartX, trackY, idealW, trackH);
    ctx.restore();

    const handleX = trackX + ((val - s.min) / (s.max - s.min)) * trackW;
    const handleY = trackY + trackH / 2;
    const isDragging = this.sliderStates[s.key].dragging;
    const handleR = isDragging ? 12 : 10;

    if (isDragging) {
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
    }

    ctx.beginPath();
    ctx.arc(handleX, handleY, handleR, 0, Math.PI * 2);
    ctx.fillStyle = '#FF69B4';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.restore();
  }

  private drawEnvironmentIndicator(ctx: CanvasRenderingContext2D, now: number): void {
    const indicatorW = 128;
    const indicatorH = 8;
    const x = this.panelX + (this.panelW - indicatorW) / 2;
    const y = this.panelY + this.panelH - 110;

    ctx.save();
    ctx.fillStyle = '#228B22';
    ctx.font = '13px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('季节环境', this.panelX + this.panelW / 2, y - 22);

    const grad = ctx.createLinearGradient(x, 0, x + indicatorW, 0);
    grad.addColorStop(0, '#66CDAA');
    grad.addColorStop(1, '#FFD700');
    this.roundRect(ctx, x, y, indicatorW, indicatorH, 4);
    ctx.fillStyle = grad;
    ctx.fill();

    if (this.environmentHovered) {
      const score = this.scoreState.displayed;
      const labelW = 100;
      const labelH = 24;
      const labelX = this.panelX + (this.panelW - labelW) / 2;
      const labelY = y - labelH - 8;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      this.roundRect(ctx, labelX, labelY, labelW, labelH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#228B22';
      ctx.font = 'bold 12px "PingFang SC", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`环境评分：${score}/100`, labelX + labelW / 2, labelY + labelH / 2);
    }
    ctx.restore();
  }

  private drawStatusDot(ctx: CanvasRenderingContext2D, now: number, healthScore: number): void {
    const cx = this.panelX + this.panelW / 2;
    const cy = this.panelY + this.panelH - 45;
    const r = 5;

    const state = this.getHealthState(healthScore);
    let color = '#32CD32';
    let scale = 1;

    if (state === 'healthy') {
      color = '#32CD32';
      const breath = Math.sin((now / 2000) * Math.PI * 2);
      scale = 1 + breath * 0.15;
    } else if (state === 'warning') {
      color = '#FFD700';
      const blink = (Math.sin((now / 500) * Math.PI * 2) + 1) / 2;
      ctx.globalAlpha = 0.5 + blink * 0.5;
    } else {
      color = '#FF4500';
      const t = (now % 200) / 200;
      scale = 1 + Math.sin(t * Math.PI * 2) * 0.2;
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();

    ctx.globalAlpha = 1;
    ctx.save();
    ctx.fillStyle = '#666';
    ctx.font = '11px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const stateText = state === 'healthy' ? '健康' : state === 'warning' ? '注意' : '警告';
    ctx.fillText(stateText, cx, cy + 10);
    ctx.restore();
  }

  private getHealthState(score: number): 'healthy' | 'warning' | 'danger' {
    if (score >= 80) return 'healthy';
    if (score >= 50) return 'warning';
    return 'danger';
  }

  private drawInfoBar(ctx: CanvasRenderingContext2D, now: number): void {
    if (!this.infoBar.visible) return;
    const elapsed = now - this.infoBar.startTime;
    const totalDuration = 2000;

    if (elapsed > totalDuration) {
      this.infoBar.visible = false;
      return;
    }

    let alpha = 1;
    if (elapsed > totalDuration - 500) {
      alpha = 1 - (elapsed - (totalDuration - 500)) / 500;
    }

    const cx = this.canvasWidth / 2;
    const cy = this.canvasHeight * 0.82 - 230;
    const barW = 200;
    const barH = 40;
    const bx = cx - barW / 2;
    const by = cy - 80;

    ctx.save();
    ctx.globalAlpha = alpha;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, bx, by, barW, barH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`年龄：${this.infoBar.age}秒`, cx, by + 6);
    ctx.fillText(`健康度：${this.infoBar.health}%`, cx, by + 22);

    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
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

  handleMouseDown(mx: number, my: number): boolean {
    for (const s of this.sliders) {
      if (this.isSliderHandleHit(mx, my, s)) {
        this.sliderStates[s.key].dragging = true;
        return true;
      }
    }
    return false;
  }

  handleMouseMove(mx: number, my: number): boolean {
    this.mouseX = mx;
    this.mouseY = my;

    this.hoveredSlider = null;
    for (const s of this.sliders) {
      if (this.isSliderAreaHit(mx, my, s)) {
        this.hoveredSlider = s.key;
        break;
      }
    }

    this.environmentHovered = this.isEnvironmentHit(mx, my);

    let dragging = false;
    for (const s of this.sliders) {
      if (this.sliderStates[s.key].dragging) {
        this.updateSliderValue(s, mx);
        dragging = true;
      }
    }
    return dragging;
  }

  handleMouseUp(): boolean {
    let wasDragging = false;
    for (const key in this.sliderStates) {
      if (this.sliderStates[key as keyof GrowthParams].dragging) {
        this.sliderStates[key as keyof GrowthParams].dragging = false;
        wasDragging = true;
      }
    }
    return wasDragging;
  }

  private isSliderAreaHit(mx: number, my: number, s: SliderConfig): boolean {
    const sliderAreaTop = this.panelY + 65;
    const sliderSpacing = 95;
    const idx = this.sliders.indexOf(s);
    const y = sliderAreaTop + idx * sliderSpacing;
    const trackX = this.panelX + 20;
    const trackY = y + 30;
    const trackW = this.panelW - 40;
    return mx >= trackX - 10 && mx <= trackX + trackW + 10 && my >= trackY - 15 && my <= trackY + 25;
  }

  private isSliderHandleHit(mx: number, my: number, s: SliderConfig): boolean {
    const sliderAreaTop = this.panelY + 65;
    const sliderSpacing = 95;
    const idx = this.sliders.indexOf(s);
    const y = sliderAreaTop + idx * sliderSpacing;
    const trackX = this.panelX + 20;
    const trackY = y + 30;
    const trackW = this.panelW - 40;
    const trackH = 8;
    const val = this.params[s.key];
    const handleX = trackX + ((val - s.min) / (s.max - s.min)) * trackW;
    const handleY = trackY + trackH / 2;
    const dx = mx - handleX;
    const dy = my - handleY;
    return dx * dx + dy * dy <= 14 * 14;
  }

  private isEnvironmentHit(mx: number, my: number): boolean {
    const indicatorW = 128;
    const indicatorH = 8;
    const x = this.panelX + (this.panelW - indicatorW) / 2;
    const y = this.panelY + this.panelH - 110;
    return mx >= x - 5 && mx <= x + indicatorW + 5 && my >= y - 30 && my <= y + indicatorH + 10;
  }

  private updateSliderValue(s: SliderConfig, mx: number): void {
    const trackX = this.panelX + 20;
    const trackW = this.panelW - 40;
    let ratio = (mx - trackX) / trackW;
    ratio = Math.max(0, Math.min(1, ratio));
    let rawVal = s.min + ratio * (s.max - s.min);
    rawVal = Math.round(rawVal / s.step) * s.step;
    rawVal = Math.max(s.min, Math.min(s.max, rawVal));

    if (this.params[s.key] !== rawVal) {
      this.params[s.key] = rawVal;
      this.onParamsChange({ ...this.params });
    }
  }

  getPanelRect(): { x: number; y: number; w: number; h: number } {
    return { x: this.panelX, y: this.panelY, w: this.panelW, h: this.panelH };
  }

  isInsidePanel(mx: number, my: number): boolean {
    return mx >= this.panelX && mx <= this.panelX + this.panelW &&
           my >= this.panelY && my <= this.panelY + this.panelH;
  }
}
