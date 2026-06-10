import { LabState, Container, AlcoholLamp, DropperState } from './types';
import { getMixedColor, interpolateColor, hexToRgba, CHEMICAL_DATA } from './chemicals';

export class LabRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tempChartCanvas: HTMLCanvasElement;
  private tempChartCtx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement, tempChartCanvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.tempChartCanvas = tempChartCanvas;
    this.tempChartCtx = tempChartCanvas.getContext('2d')!;
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.scale(dpr, dpr);
  }

  render(state: LabState, dropperState: DropperState): void {
    const ctx = this.ctx;
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    this.drawLamps(state);
    this.drawContainers(state);
    this.drawPrecipitates(state);
    this.drawBubbles(state);
    this.drawSteamParticles(state);
    this.drawTemperatureLabels(state);

    if (dropperState.isActive) {
      this.drawDropper(dropperState);
    }

    this.drawTempChart(state.temperatureHistory);
  }

  private drawLamps(state: LabState): void {
    const ctx = this.ctx;
    state.lamps.forEach((lamp) => {
      const { x, y, width, height } = lamp;

      const baseGradient = ctx.createLinearGradient(x, y + height - 20, x, y + height);
      baseGradient.addColorStop(0, '#daa520');
      baseGradient.addColorStop(1, '#b8860b');

      ctx.fillStyle = baseGradient;
      ctx.beginPath();
      ctx.ellipse(x + width / 2, y + height - 10, width / 2, 12, 0, 0, Math.PI * 2);
      ctx.fill();

      const bodyGradient = ctx.createLinearGradient(x, y, x + width, y + height - 15);
      bodyGradient.addColorStop(0, 'rgba(255, 248, 220, 0.9)');
      bodyGradient.addColorStop(0.5, 'rgba(245, 222, 179, 0.8)');
      bodyGradient.addColorStop(1, 'rgba(218, 165, 32, 0.7)');

      ctx.fillStyle = bodyGradient;
      ctx.beginPath();
      ctx.moveTo(x + 10, y + height - 15);
      ctx.quadraticCurveTo(x, y + height * 0.5, x + width * 0.3, y + 20);
      ctx.lineTo(x + width * 0.7, y + 20);
      ctx.quadraticCurveTo(x + width, y + height * 0.5, x + width - 10, y + height - 15);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(139, 69, 19, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#8b4513';
      ctx.fillRect(x + width * 0.35, y, width * 0.3, 25);

      if (lamp.isLit) {
        const flameX = x + width / 2;
        const flameY = y - 5;

        const outerFlame = ctx.createRadialGradient(flameX, flameY, 2, flameX, flameY - 10, 25);
        outerFlame.addColorStop(0, 'rgba(255, 220, 100, 0.9)');
        outerFlame.addColorStop(0.5, 'rgba(255, 140, 50, 0.7)');
        outerFlame.addColorStop(1, 'rgba(255, 80, 30, 0)');

        ctx.fillStyle = outerFlame;
        ctx.beginPath();
        ctx.moveTo(flameX - 15, flameY + 5);
        ctx.quadraticCurveTo(flameX - 20, flameY - 15, flameX, flameY - 30);
        ctx.quadraticCurveTo(flameX + 20, flameY - 15, flameX + 15, flameY + 5);
        ctx.closePath();
        ctx.fill();

        const innerFlame = ctx.createRadialGradient(flameX, flameY, 1, flameX, flameY - 5, 15);
        innerFlame.addColorStop(0, 'rgba(200, 230, 255, 0.95)');
        innerFlame.addColorStop(0.6, 'rgba(255, 255, 180, 0.8)');
        innerFlame.addColorStop(1, 'rgba(255, 200, 80, 0)');

        ctx.fillStyle = innerFlame;
        ctx.beginPath();
        ctx.moveTo(flameX - 8, flameY + 3);
        ctx.quadraticCurveTo(flameX - 10, flameY - 8, flameX, flameY - 18);
        ctx.quadraticCurveTo(flameX + 10, flameY - 8, flameX + 8, flameY + 3);
        ctx.closePath();
        ctx.fill();
      }
    });
  }

  private drawContainers(state: LabState): void {
    const ctx = this.ctx;
    state.containers.forEach((container) => {
      if (container.type === 'beaker') {
        this.drawBeaker(container);
      } else {
        this.drawTestTube(container);
      }
    });
  }

  private drawBeaker(container: Container): void {
    const ctx = this.ctx;
    const { x, y, width, height } = container;
    const radius = 10;

    const glassGradient = ctx.createLinearGradient(x, y, x + width, y);
    glassGradient.addColorStop(0, 'rgba(200, 230, 255, 0.15)');
    glassGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)');
    glassGradient.addColorStop(0.7, 'rgba(200, 230, 255, 0.2)');
    glassGradient.addColorStop(1, 'rgba(255, 255, 255, 0.3)');

    ctx.fillStyle = glassGradient;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width - 5, y + height - radius);
    ctx.quadraticCurveTo(x + width - 5, y + height, x + width - radius - 5, y + height);
    ctx.lineTo(x + radius + 5, y + height);
    ctx.quadraticCurveTo(x + 5, y + height, x + 5, y + height - radius);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(100, 150, 200, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(100, 150, 200, 0.4)';
    ctx.fillRect(x - 5, y - 3, width + 10, 6);

    this.drawLiquid(container);

    ctx.strokeStyle = 'rgba(100, 150, 200, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const markY = y + (height * i) / 5;
      ctx.beginPath();
      ctx.moveTo(x + width - 15, markY);
      ctx.lineTo(x + width - 3, markY);
      ctx.stroke();
    }
  }

  private drawTestTube(container: Container): void {
    const ctx = this.ctx;
    const { x, y, width, height } = container;

    const glassGradient = ctx.createLinearGradient(x, y, x + width, y);
    glassGradient.addColorStop(0, 'rgba(200, 230, 255, 0.2)');
    glassGradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.5)');
    glassGradient.addColorStop(0.7, 'rgba(200, 230, 255, 0.25)');
    glassGradient.addColorStop(1, 'rgba(255, 255, 255, 0.35)');

    ctx.fillStyle = glassGradient;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, y + height - width / 2);
    ctx.quadraticCurveTo(x + width, y + height, x + width / 2, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - width / 2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(100, 150, 200, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(100, 150, 200, 0.4)';
    ctx.fillRect(x - 3, y - 3, width + 6, 6);

    this.drawLiquid(container);
  }

  private drawLiquid(container: Container): void {
    const ctx = this.ctx;
    const { x, y, width, height, chemicals, reactionState } = container;

    if (chemicals.length === 0 && !reactionState) return;

    const liquidHeight = Math.min(height * 0.6, 30 + chemicals.length * 15);
    const liquidY = y + height - liquidHeight;

    let liquidColor = getMixedColor(chemicals);
    if (reactionState) {
      const elapsed = performance.now() - reactionState.startTime;
      const progress = Math.min(1, elapsed / reactionState.duration);
      liquidColor = interpolateColor(reactionState.startColor, reactionState.endColor, progress);
    }

    const isBeaker = container.type === 'beaker';
    const padding = isBeaker ? 6 : 2;
    const liquidWidth = width - padding * 2;

    ctx.save();
    ctx.beginPath();
    if (isBeaker) {
      const radius = 8;
      ctx.moveTo(x + padding, liquidY);
      ctx.lineTo(x + width - padding, liquidY);
      ctx.lineTo(x + width - padding, y + height - radius - 5);
      ctx.quadraticCurveTo(x + width - padding, y + height - 5, x + width - padding - radius, y + height - 5);
      ctx.lineTo(x + padding + radius, y + height - 5);
      ctx.quadraticCurveTo(x + padding, y + height - 5, x + padding, y + height - radius - 5);
    } else {
      ctx.moveTo(x + padding, liquidY);
      ctx.lineTo(x + width - padding, liquidY);
      ctx.lineTo(x + width - padding, y + height - width / 2);
      ctx.quadraticCurveTo(x + width - padding, y + height - padding, x + width / 2, y + height - padding);
      ctx.quadraticCurveTo(x + padding, y + height - padding, x + padding, y + height - width / 2);
    }
    ctx.closePath();
    ctx.clip();

    const liquidGradient = ctx.createLinearGradient(x, liquidY, x, liquidY + liquidHeight);
    liquidGradient.addColorStop(0, hexToRgba(liquidColor, 0.85));
    liquidGradient.addColorStop(1, hexToRgba(liquidColor, 0.95));

    ctx.fillStyle = liquidGradient;
    ctx.fillRect(x, liquidY - 5, width, liquidHeight + 10);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const waveOffset = Math.sin(performance.now() * 0.005) * 2;
    ctx.moveTo(x + padding, liquidY + waveOffset);
    for (let i = 0; i <= liquidWidth; i += 5) {
      const wave = Math.sin((i + performance.now() * 0.003) * 0.1) * 1.5;
      ctx.lineTo(x + padding + i, liquidY + waveOffset + wave);
    }
    ctx.stroke();

    ctx.restore();
  }

  private drawPrecipitates(state: LabState): void {
    const ctx = this.ctx;
    state.precipitates.forEach((p) => {
      const gradient = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.height);
      gradient.addColorStop(0, hexToRgba(p.color, 0.7));
      gradient.addColorStop(1, hexToRgba(p.color, 0.95));

      ctx.fillStyle = gradient;
      ctx.beginPath();
      for (let i = 0; i <= p.width; i += 3) {
        const offset = Math.sin(i * 0.5) * 2;
        if (i === 0) {
          ctx.moveTo(p.x + i, p.y + offset);
        } else {
          ctx.lineTo(p.x + i, p.y + offset);
        }
      }
      ctx.lineTo(p.x + p.width, p.y + p.height);
      ctx.lineTo(p.x, p.y + p.height);
      ctx.closePath();
      ctx.fill();
    });
  }

  private drawBubbles(state: LabState): void {
    const ctx = this.ctx;
    state.bubbles.forEach((bubble) => {
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${bubble.alpha * 0.6})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(200, 230, 255, ${bubble.alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(bubble.x - bubble.radius * 0.3, bubble.y - bubble.radius * 0.3, bubble.radius * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${bubble.alpha * 0.8})`;
      ctx.fill();
    });
  }

  private drawSteamParticles(state: LabState): void {
    const ctx = this.ctx;
    state.steamParticles.forEach((p) => {
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${p.alpha * 0.7})`);
      gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private drawTemperatureLabels(state: LabState): void {
    const ctx = this.ctx;
    ctx.font = '12px "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    state.containers.forEach((container) => {
      const tempText = `${container.temperature.toFixed(1)}°C`;
      const x = container.x + container.width / 2;
      const y = container.y - 8;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      const textWidth = ctx.measureText(tempText).width;
      ctx.fillRect(x - textWidth / 2 - 6, y - 16, textWidth + 12, 18);

      ctx.fillStyle = container.isHeating ? '#e74c3c' : '#ffffff';
      ctx.fillText(tempText, x, y - 2);
    });
  }

  private drawDropper(dropperState: DropperState): void {
    const ctx = this.ctx;
    const { x, y, chemical, isCooling } = dropperState;

    ctx.save();

    ctx.fillStyle = '#8b4513';
    ctx.fillRect(x - 8, y - 35, 16, 20);

    const dropperGradient = ctx.createLinearGradient(x - 6, y - 15, x + 6, y + 20);
    dropperGradient.addColorStop(0, 'rgba(200, 230, 255, 0.4)');
    dropperGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)');
    dropperGradient.addColorStop(1, 'rgba(200, 230, 255, 0.3)');

    ctx.fillStyle = dropperGradient;
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 15);
    ctx.lineTo(x + 6, y - 15);
    ctx.lineTo(x + 4, y + 15);
    ctx.quadraticCurveTo(x, y + 22, x - 4, y + 15);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(100, 150, 200, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (chemical) {
      const chemColor = CHEMICAL_DATA[chemical].color;
      ctx.fillStyle = hexToRgba(chemColor, 0.85);
      ctx.beginPath();
      ctx.ellipse(x, y + 5, 3, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (isCooling) {
      ctx.fillStyle = 'rgba(150, 150, 150, 0.5)';
      ctx.beginPath();
      ctx.arc(x, y - 5, 25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2c3e50';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⏳', x, y);
    }

    ctx.restore();
  }

  private drawTempChart(history: number[]): void {
    const ctx = this.tempChartCtx;
    const width = this.tempChartCanvas.width;
    const height = this.tempChartCanvas.height;

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#34495e';
    ctx.fillRect(0, 0, width, height);

    if (history.length < 2) return;

    const minTemp = 20;
    const maxTemp = 105;
    const tempRange = maxTemp - minTemp;

    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const y = (height * i) / 4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.beginPath();

    history.forEach((temp, index) => {
      const x = (width * index) / (history.length - 1);
      const y = height - ((temp - minTemp) / tempRange) * height;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    const lastTemp = history[history.length - 1];
    ctx.fillStyle = '#ecf0f1';
    ctx.font = '11px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${lastTemp.toFixed(1)}°C`, width - 5, 12);
  }
}
