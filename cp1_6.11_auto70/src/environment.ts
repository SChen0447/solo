interface Bubble {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
  wobblePhase: number;
  wobbleSpeed: number;
}

interface LightSpot {
  x: number;
  baseY: number;
  amp: number;
  freq: number;
  phase: number;
  radius: number;
  alphaSpeed: number;
  alphaPhase: number;
}

export class Environment {
  bubbles: Bubble[] = [];
  lightSpots: LightSpot[] = [];
  private canvasW: number;
  private canvasH: number;
  private bubbleCount = 40;
  private spotCount = 14;

  fishCountSlider!: HTMLInputElement;
  jellyCountSlider!: HTMLInputElement;
  onFishCountChange: ((n: number) => void) | null = null;
  onJellyCountChange: ((n: number) => void) | null = null;

  private controlPanel!: HTMLDivElement;

  constructor(canvasW: number, canvasH: number) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.initBubbles();
    this.initLightSpots();
    this.initControls();
  }

  resize(canvasW: number, canvasH: number): void {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    for (const b of this.bubbles) {
      b.x = Math.random() * canvasW;
      b.y = Math.random() * canvasH;
    }
    this.initLightSpots();
  }

  private initBubbles(): void {
    this.bubbles = [];
    for (let i = 0; i < this.bubbleCount; i++) {
      this.bubbles.push({
        x: Math.random() * this.canvasW,
        y: Math.random() * this.canvasH,
        size: 2 + Math.random() * 4,
        speed: 0.02 + Math.random() * 0.05,
        alpha: 0.1 + Math.random() * 0.2,
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.001 + Math.random() * 0.002
      });
    }
  }

  private initLightSpots(): void {
    this.lightSpots = [];
    for (let i = 0; i < this.spotCount; i++) {
      this.lightSpots.push({
        x: (i / this.spotCount) * this.canvasW + (Math.random() - 0.5) * 80,
        baseY: 10 + Math.random() * 40,
        amp: 15 + Math.random() * 25,
        freq: 0.005 + Math.random() * 0.01,
        phase: Math.random() * Math.PI * 2,
        radius: 50 + Math.random() * 120,
        alphaSpeed: 0.0008 + Math.random() * 0.0015,
        alphaPhase: Math.random() * Math.PI * 2
      });
    }
  }

  private initControls(): void {
    this.controlPanel = document.createElement('div');
    this.controlPanel.style.cssText = `
      position: fixed;
      top: 50%;
      right: 20px;
      transform: translateY(-50%);
      z-index: 100;
      padding: 20px 18px;
      background: rgba(10, 22, 40, 0.35);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-radius: 16px;
      border: 1px solid rgba(107, 203, 255, 0.2);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3), 0 0 40px rgba(107, 203, 255, 0.05);
      display: flex;
      flex-direction: column;
      gap: 18px;
      min-width: 160px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      user-select: none;
    `;

    const fishLabel = this.createLabel('鱼群数量', '80');
    const fishSlider = this.createSlider(20, 200, 80);
    this.fishCountSlider = fishSlider;

    const fishValue = fishLabel.querySelector('.value') as HTMLSpanElement;
    fishSlider.addEventListener('input', () => {
      fishValue.textContent = fishSlider.value;
      if (this.onFishCountChange) this.onFishCountChange(parseInt(fishSlider.value));
    });

    const jellyLabel = this.createLabel('水母数量', '20');
    const jellySlider = this.createSlider(5, 50, 20);
    this.jellyCountSlider = jellySlider;

    const jellyValue = jellyLabel.querySelector('.value') as HTMLSpanElement;
    jellySlider.addEventListener('input', () => {
      jellyValue.textContent = jellySlider.value;
      if (this.onJellyCountChange) this.onJellyCountChange(parseInt(jellySlider.value));
    });

    this.controlPanel.appendChild(fishLabel);
    this.controlPanel.appendChild(fishSlider);
    this.controlPanel.appendChild(jellyLabel);
    this.controlPanel.appendChild(jellySlider);

    document.body.appendChild(this.controlPanel);
  }

  private createLabel(text: string, value: string): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: rgba(200, 220, 255, 0.9);
      font-size: 12px;
      letter-spacing: 0.5px;
      text-shadow: 0 0 8px rgba(107, 203, 255, 0.4);
    `;
    const name = document.createElement('span');
    name.textContent = text;
    const val = document.createElement('span');
    val.className = 'value';
    val.textContent = value;
    val.style.cssText = `
      color: rgba(107, 203, 255, 1);
      font-weight: 600;
      min-width: 28px;
      text-align: right;
    `;
    wrapper.appendChild(name);
    wrapper.appendChild(val);
    return wrapper;
  }

  private createSlider(min: number, max: number, value: number): HTMLInputElement {
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.value = String(value);
    slider.style.cssText = `
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 4px;
      border-radius: 2px;
      background: linear-gradient(90deg, rgba(107, 203, 255, 0.6), rgba(255, 107, 203, 0.4));
      outline: none;
      cursor: pointer;
    `;

    const styleId = 'range-slider-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #ffffff, #6bcbff);
          border: 2px solid rgba(255, 255, 255, 0.8);
          cursor: pointer;
          box-shadow: 0 0 10px rgba(107, 203, 255, 0.8), 0 2px 6px rgba(0,0,0,0.3);
          transition: transform 0.15s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #ffffff, #6bcbff);
          border: 2px solid rgba(255, 255, 255, 0.8);
          cursor: pointer;
          box-shadow: 0 0 10px rgba(107, 203, 255, 0.8);
        }
      `;
      document.head.appendChild(style);
    }

    return slider;
  }

  update(dt: number): void {
    for (const b of this.bubbles) {
      b.y -= b.speed * dt;
      b.wobblePhase += b.wobbleSpeed * dt;
      b.x += Math.sin(b.wobblePhase) * 0.015 * dt;
      if (b.y < -b.size * 2) {
        b.y = this.canvasH + b.size * 2;
        b.x = Math.random() * this.canvasW;
      }
      if (b.x < -10) b.x = this.canvasW + 10;
      if (b.x > this.canvasW + 10) b.x = -10;
    }
  }

  renderBackground(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number): void {
    const grad = ctx.createRadialGradient(
      canvasW * 0.5, canvasH * 0.2, 50,
      canvasW * 0.5, canvasH * 0.7, Math.max(canvasW, canvasH)
    );
    grad.addColorStop(0, '#0a1628');
    grad.addColorStop(0.5, '#0a1d2a');
    grad.addColorStop(1, '#0d2818');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    const topGlow = ctx.createLinearGradient(0, 0, 0, canvasH * 0.35);
    topGlow.addColorStop(0, 'rgba(107, 203, 255, 0.08)');
    topGlow.addColorStop(1, 'rgba(107, 203, 255, 0)');
    ctx.fillStyle = topGlow;
    ctx.fillRect(0, 0, canvasW, canvasH * 0.35);
  }

  renderLightSpots(ctx: CanvasRenderingContext2D, time: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    for (const spot of this.lightSpots) {
      const y = spot.baseY + Math.sin(time * spot.freq + spot.phase) * spot.amp
        + Math.sin(time * spot.freq * 2.3 + spot.phase * 1.7) * spot.amp * 0.4;
      const alphaBase = 0.1 + 0.3 * (0.5 + 0.5 * Math.sin(time * spot.alphaSpeed + spot.alphaPhase));

      const grad = ctx.createRadialGradient(spot.x, y, 0, spot.x, y, spot.radius);
      grad.addColorStop(0, `rgba(140, 220, 255, ${alphaBase})`);
      grad.addColorStop(0.4, `rgba(107, 203, 255, ${alphaBase * 0.5})`);
      grad.addColorStop(1, 'rgba(107, 203, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(spot.x, y, spot.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  renderBubbles(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const b of this.bubbles) {
      const grad = ctx.createRadialGradient(
        b.x - b.size * 0.3, b.y - b.size * 0.3, 0,
        b.x, b.y, b.size
      );
      grad.addColorStop(0, `rgba(200, 230, 255, ${b.alpha * 1.5})`);
      grad.addColorStop(0.5, `rgba(150, 200, 255, ${b.alpha})`);
      grad.addColorStop(1, `rgba(100, 180, 255, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${b.alpha * 1.8})`;
      ctx.beginPath();
      ctx.arc(b.x - b.size * 0.35, b.y - b.size * 0.35, b.size * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
