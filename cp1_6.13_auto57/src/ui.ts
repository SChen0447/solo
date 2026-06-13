export interface UIState {
  isPlaying: boolean;
  rippleSpeed: number;
  flowerDensity: number;
}

class SpringVal {
  value: number;
  target: number;
  velocity: number = 0;
  stiffness: number;
  damping: number;

  constructor(initial: number, stiffness = 0.12, damping = 0.72) {
    this.value = initial;
    this.target = initial;
    this.stiffness = stiffness;
    this.damping = damping;
  }

  update() {
    const force = (this.target - this.value) * this.stiffness;
    this.velocity += force;
    this.velocity *= this.damping;
    this.value += this.velocity;
  }
}

interface Slider {
  x: number;
  y: number;
  width: number;
  height: number;
  min: number;
  max: number;
  value: number;
  label: string;
  handlePos: SpringVal;
  isDragging: boolean;
  glowPhase: number;
}

export class UIManager {
  private playSwitch: {
    x: number; y: number;
    width: number; height: number;
    leverPos: SpringVal;
    isOn: boolean;
    glowIntensity: number;
  };

  private speedSlider: Slider;
  private densitySlider: Slider;

  private onPlayToggle: (() => void) | null = null;
  private onSpeedChange: ((val: number) => void) | null = null;
  private onDensityChange: ((val: number) => void) | null = null;

  private isMobile: boolean = false;
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;

  constructor() {
    this.playSwitch = {
      x: 0, y: 0,
      width: 36, height: 56,
      leverPos: new SpringVal(0, 0.15, 0.65),
      isOn: false,
      glowIntensity: 0
    };

    this.speedSlider = {
      x: 0, y: 0,
      width: 160, height: 28,
      min: 0.5, max: 2.0,
      value: 1.0,
      label: '涟漪速度',
      handlePos: new SpringVal(0.333, 0.1, 0.7),
      isDragging: false,
      glowPhase: 0
    };

    this.densitySlider = {
      x: 0, y: 0,
      width: 160, height: 28,
      min: 1, max: 10,
      value: 3,
      label: '墨花密度',
      handlePos: new SpringVal(0.222, 0.1, 0.7),
      isDragging: false,
      glowPhase: 0
    };
  }

  layout(canvasWidth: number, canvasHeight: number, recordCx: number, recordCy: number, recordRadius: number, isMobile: boolean) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.isMobile = isMobile;

    this.playSwitch.x = recordCx - recordRadius - 50;
    this.playSwitch.y = recordCy - recordRadius - 30;

    if (isMobile) {
      const controlY = recordCy + recordRadius + 80;
      const controlW = Math.min(360, canvasWidth - 40);
      const startX = (canvasWidth - controlW) / 2;

      this.playSwitch.x = startX + controlW * 0.1 - this.playSwitch.width / 2;
      this.playSwitch.y = controlY;

      this.speedSlider.x = startX + controlW * 0.35;
      this.speedSlider.y = controlY + 10;
      this.speedSlider.width = controlW * 0.55;

      this.densitySlider.x = startX + controlW * 0.35;
      this.densitySlider.y = controlY + 55;
      this.densitySlider.width = controlW * 0.55;
    } else {
      const panelX = recordCx + recordRadius + 60;
      const panelY = recordCy - recordRadius;

      this.speedSlider.x = panelX;
      this.speedSlider.y = panelY + 40;
      this.speedSlider.width = 180;

      this.densitySlider.x = panelX;
      this.densitySlider.y = panelY + 110;
      this.densitySlider.width = 180;
    }
  }

  setCallbacks(
    onPlay: () => void,
    onSpeed: (v: number) => void,
    onDensity: (v: number) => void
  ) {
    this.onPlayToggle = onPlay;
    this.onSpeedChange = onSpeed;
    this.onDensityChange = onDensity;
  }

  update(dt: number) {
    this.playSwitch.leverPos.update();
    this.playSwitch.glowIntensity *= 0.92;

    this.speedSlider.handlePos.update();
    this.densitySlider.handlePos.update();

    if (this.speedSlider.isDragging) {
      this.speedSlider.glowPhase += dt * 0.005;
    } else {
      this.speedSlider.glowPhase *= 0.95;
    }

    if (this.densitySlider.isDragging) {
      this.densitySlider.glowPhase += dt * 0.005;
    } else {
      this.densitySlider.glowPhase *= 0.95;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.drawPlaySwitch(ctx);
    this.drawSlider(ctx, this.speedSlider);
    this.drawSlider(ctx, this.densitySlider);
  }

  private drawPlaySwitch(ctx: CanvasRenderingContext2D) {
    const sw = this.playSwitch;
    const x = sw.x;
    const y = sw.y;
    const w = sw.width;
    const h = sw.height;

    ctx.save();

    const baseGrad = ctx.createLinearGradient(x - 4, y, x + w + 4, y);
    baseGrad.addColorStop(0, '#5a4a30');
    baseGrad.addColorStop(0.3, '#8a7a50');
    baseGrad.addColorStop(0.5, '#a09060');
    baseGrad.addColorStop(0.7, '#8a7a50');
    baseGrad.addColorStop(1, '#5a4a30');

    this.roundRect(ctx, x - 4, y - 4, w + 8, h + 8, 6);
    ctx.fillStyle = baseGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(180, 160, 100, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const slotGrad = ctx.createLinearGradient(x, y, x + w, y);
    slotGrad.addColorStop(0, '#1a1a1a');
    slotGrad.addColorStop(0.5, '#2a2a2a');
    slotGrad.addColorStop(1, '#1a1a1a');
    this.roundRect(ctx, x + w / 2 - 6, y + 6, 12, h - 12, 4);
    ctx.fillStyle = slotGrad;
    ctx.fill();

    const leverT = sw.leverPos.value;
    const leverY = y + 10 + leverT * (h - 26);

    const leverGrad = ctx.createLinearGradient(x + w / 2 - 8, leverY, x + w / 2 + 8, leverY);
    leverGrad.addColorStop(0, '#b0b0b0');
    leverGrad.addColorStop(0.3, '#e8e8e8');
    leverGrad.addColorStop(0.5, '#f0f0f0');
    leverGrad.addColorStop(0.7, '#d0d0d0');
    leverGrad.addColorStop(1, '#a0a0a0');
    this.roundRect(ctx, x + w / 2 - 8, leverY, 16, 14, 3);
    ctx.fillStyle = leverGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + w / 2 - 5, leverY + 4 + i * 3);
      ctx.lineTo(x + w / 2 + 5, leverY + 4 + i * 3);
      ctx.strokeStyle = 'rgba(120, 120, 120, 0.5)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    if (sw.glowIntensity > 0.01) {
      ctx.beginPath();
      ctx.arc(x + w / 2, leverY + 7, 15, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 220, 150, ${sw.glowIntensity * 0.3})`;
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(200, 180, 130, 0.7)';
    ctx.font = '10px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('ON', x + w / 2, y + h + 14);
    ctx.fillText('OFF', x + w / 2, y - 8);

    ctx.restore();
  }

  private drawSlider(ctx: CanvasRenderingContext2D, slider: Slider) {
    const { x, y, width, height, label, min, max, value } = slider;

    ctx.save();

    ctx.fillStyle = 'rgba(200, 180, 130, 0.8)';
    ctx.font = '12px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, x, y - 8);

    const valStr = min < 2 ? value.toFixed(1) + 'x' : Math.round(value).toString();
    ctx.textAlign = 'right';
    ctx.fillText(valStr, x + width, y - 8);

    const trackY = y + height / 2;
    const trackH = 6;

    const trackGrad = ctx.createLinearGradient(x, trackY - trackH, x, trackY + trackH);
    trackGrad.addColorStop(0, '#3a3020');
    trackGrad.addColorStop(0.3, '#4a4030');
    trackGrad.addColorStop(1, '#2a2018');
    this.roundRect(ctx, x, trackY - trackH / 2, width, trackH, 3);
    ctx.fillStyle = trackGrad;
    ctx.fill();

    if (slider.glowPhase > 0.01) {
      const glowX = x + slider.handlePos.value * width;
      const glowGrad = ctx.createRadialGradient(glowX, trackY, 0, glowX, trackY, 40);
      glowGrad.addColorStop(0, `rgba(200, 170, 100, ${0.3 * Math.sin(slider.glowPhase) * 0.5 + 0.3})`);
      glowGrad.addColorStop(0.5, `rgba(180, 140, 60, ${0.15 * Math.sin(slider.glowPhase * 1.3) * 0.5 + 0.15})`);
      glowGrad.addColorStop(1, 'rgba(150, 120, 50, 0)');
      ctx.beginPath();
      ctx.rect(x, trackY - trackH / 2, width, trackH);
      ctx.fillStyle = glowGrad;
      ctx.fill();
    }

    const filledWidth = slider.handlePos.value * width;
    const fillGrad = ctx.createLinearGradient(x, trackY, x + filledWidth, trackY);
    fillGrad.addColorStop(0, 'rgba(180, 150, 80, 0.6)');
    fillGrad.addColorStop(1, 'rgba(200, 170, 100, 0.4)');
    this.roundRect(ctx, x, trackY - trackH / 2, filledWidth, trackH, 3);
    ctx.fillStyle = fillGrad;
    ctx.fill();

    const handleX = x + slider.handlePos.value * width;
    const handleR = 10;

    ctx.beginPath();
    ctx.arc(handleX, trackY, handleR + 3, 0, Math.PI * 2);
    const outerGrad = ctx.createRadialGradient(handleX, trackY - 2, 0, handleX, trackY, handleR + 3);
    outerGrad.addColorStop(0, 'rgba(200, 180, 120, 0.3)');
    outerGrad.addColorStop(1, 'rgba(200, 180, 120, 0)');
    ctx.fillStyle = outerGrad;
    ctx.fill();

    const knobGrad = ctx.createRadialGradient(handleX - 2, trackY - 2, 0, handleX, trackY, handleR);
    knobGrad.addColorStop(0, '#d0c090');
    knobGrad.addColorStop(0.3, '#b0a070');
    knobGrad.addColorStop(0.7, '#907a50');
    knobGrad.addColorStop(1, '#6a5a38');
    ctx.beginPath();
    ctx.arc(handleX, trackY, handleR, 0, Math.PI * 2);
    ctx.fillStyle = knobGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(220, 200, 150, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const miniR = 5;
    const miniGrad = ctx.createRadialGradient(handleX, trackY, 0, handleX, trackY, miniR);
    miniGrad.addColorStop(0, '#1a1a1a');
    miniGrad.addColorStop(0.6, '#222');
    miniGrad.addColorStop(1, '#333');
    ctx.beginPath();
    ctx.arc(handleX, trackY, miniR, 0, Math.PI * 2);
    ctx.fillStyle = miniGrad;
    ctx.fill();

    for (let i = 0; i < 3; i++) {
      const gr = miniR + 1 + i * 1.5;
      ctx.beginPath();
      ctx.arc(handleX, trackY, gr, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(60, 60, 60, ${0.3 - i * 0.08})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  hitTest(x: number, y: number): { type: string; index: number } | null {
    const sw = this.playSwitch;
    if (x >= sw.x - 10 && x <= sw.x + sw.width + 10 &&
        y >= sw.y - 10 && y <= sw.y + sw.height + 10) {
      return { type: 'switch', index: 0 };
    }

    const s1 = this.speedSlider;
    if (x >= s1.x - 15 && x <= s1.x + s1.width + 15 &&
        y >= s1.y - 5 && y <= s1.y + s1.height + 5) {
      return { type: 'slider', index: 0 };
    }

    const s2 = this.densitySlider;
    if (x >= s2.x - 15 && x <= s2.x + s2.width + 15 &&
        y >= s2.y - 5 && y <= s2.y + s2.height + 5) {
      return { type: 'slider', index: 1 };
    }

    return null;
  }

  handleSwitchClick() {
    this.playSwitch.isOn = !this.playSwitch.isOn;
    this.playSwitch.leverPos.target = this.playSwitch.isOn ? 1 : 0;
    this.playSwitch.glowIntensity = 1;
    if (this.onPlayToggle) this.onPlayToggle();
  }

  startSliderDrag(index: number, x: number) {
    const slider = index === 0 ? this.speedSlider : this.densitySlider;
    slider.isDragging = true;
    this.updateSliderValue(index, x);
  }

  moveSliderDrag(index: number, x: number) {
    this.updateSliderValue(index, x);
  }

  endSliderDrag(index: number) {
    const slider = index === 0 ? this.speedSlider : this.densitySlider;
    slider.isDragging = false;
  }

  private updateSliderValue(index: number, mouseX: number) {
    const slider = index === 0 ? this.speedSlider : this.densitySlider;
    const t = Math.max(0, Math.min(1, (mouseX - slider.x) / slider.width));
    slider.handlePos.target = t;
    slider.value = slider.min + t * (slider.max - slider.min);

    if (index === 0 && this.onSpeedChange) {
      this.onSpeedChange(slider.value);
    } else if (index === 1 && this.onDensityChange) {
      this.onDensityChange(slider.value);
    }
  }

  setPlayState(playing: boolean) {
    this.playSwitch.isOn = playing;
    this.playSwitch.leverPos.target = playing ? 1 : 0;
  }

  setSpeedValue(val: number) {
    this.speedSlider.value = val;
    this.speedSlider.handlePos.target = (val - this.speedSlider.min) / (this.speedSlider.max - this.speedSlider.min);
  }

  setDensityValue(val: number) {
    this.densitySlider.value = val;
    this.densitySlider.handlePos.target = (val - this.densitySlider.min) / (this.densitySlider.max - this.densitySlider.min);
  }
}
