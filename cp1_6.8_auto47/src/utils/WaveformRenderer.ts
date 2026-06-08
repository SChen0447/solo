import { WaveformType, FilterType } from '../types';
import { frequencyToColor, getGradientColors, easeOutCubic } from './index';

export class WaveformRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private waveformType: WaveformType = 'bar';
  private filterType: FilterType = 'none';
  private transitionProgress: number = 1;
  private prevWaveformType: WaveformType = 'bar';
  private prevFilterType: FilterType = 'none';
  private filterTransitionProgress: number = 1;
  private targetWaveformType: WaveformType = 'bar';
  private targetFilterType: FilterType = 'none';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  public setWaveformType(type: WaveformType): void {
    if (this.targetWaveformType !== type) {
      this.prevWaveformType = this.waveformType;
      this.targetWaveformType = type;
      this.transitionProgress = 0;
    }
  }

  public setFilterType(type: FilterType): void {
    if (this.targetFilterType !== type) {
      this.prevFilterType = this.filterType;
      this.targetFilterType = type;
      this.filterTransitionProgress = 0;
    }
  }

  public updateTransition(deltaTime: number): void {
    const transitionSpeed = 2;

    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + deltaTime * transitionSpeed);
    }

    if (this.filterTransitionProgress < 1) {
      this.filterTransitionProgress = Math.min(1, this.filterTransitionProgress + deltaTime);
    }

    if (this.transitionProgress >= 1) {
      this.waveformType = this.targetWaveformType;
    }

    if (this.filterTransitionProgress >= 1) {
      this.filterType = this.targetFilterType;
    }
  }

  public draw(audioData: Uint8Array, time: number): void {
    const { ctx, canvas } = this;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const t = easeOutCubic(this.transitionProgress);

    if (this.transitionProgress < 1) {
      ctx.globalAlpha = 1 - t;
      this.drawWaveform(this.prevWaveformType, audioData, time);
      ctx.globalAlpha = t;
      this.drawWaveform(this.targetWaveformType, audioData, time);
      ctx.globalAlpha = 1;
    } else {
      this.drawWaveform(this.waveformType, audioData, time);
    }

    this.applyFilter(time);
  }

  private drawWaveform(type: WaveformType, audioData: Uint8Array, time: number): void {
    switch (type) {
      case 'bar':
        this.drawBars(audioData);
        break;
      case 'curve':
        this.drawCurve(audioData);
        break;
      case 'circular':
        this.drawCircular(audioData, time);
        break;
    }
  }

  private drawBars(audioData: Uint8Array): void {
    const { ctx, canvas } = this;
    const barCount = Math.min(audioData.length, 128);
    const barWidth = (canvas.width * 0.8) / barCount;
    const gap = barWidth * 0.2;
    const startX = canvas.width * 0.1;
    const centerY = canvas.height / 2;

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * audioData.length);
      const value = audioData[dataIndex] / 255;
      const barHeight = value * canvas.height * 0.4;

      const freqRatio = i / barCount;
      const color = frequencyToColor(freqRatio * 20000, 20, 20000);
      const gradient = getGradientColors(freqRatio);

      const x = startX + i * barWidth;
      const y = centerY - barHeight;

      const barGradient = ctx.createLinearGradient(x, y, x, centerY + barHeight);
      barGradient.addColorStop(0, gradient.start);
      barGradient.addColorStop(1, gradient.end);

      ctx.fillStyle = barGradient;
      ctx.fillRect(x, y, barWidth - gap, barHeight * 2);

      ctx.shadowBlur = 15;
      ctx.shadowColor = color;
      ctx.fillRect(x, y, barWidth - gap, barHeight * 2);
      ctx.shadowBlur = 0;
    }
  }

  private drawCurve(audioData: Uint8Array): void {
    const { ctx, canvas } = this;
    const pointCount = Math.min(audioData.length, 256);
    const stepX = canvas.width / pointCount;
    const centerY = canvas.height / 2;

    ctx.beginPath();
    ctx.moveTo(0, centerY);

    for (let i = 0; i < pointCount; i++) {
      const dataIndex = Math.floor((i / pointCount) * audioData.length);
      const value = audioData[dataIndex] / 255;
      const x = i * stepX;
      const y = centerY - value * canvas.height * 0.35;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevX = (i - 1) * stepX;
        const prevDataIndex = Math.floor(((i - 1) / pointCount) * audioData.length);
        const prevValue = audioData[prevDataIndex] / 255;
        const prevY = centerY - prevValue * canvas.height * 0.35;

        const cpX = (prevX + x) / 2;
        ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
      }
    }

    ctx.lineTo(canvas.width, centerY);
    ctx.lineTo(0, centerY);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(0, 255, 170, 0.8)');
    gradient.addColorStop(0.5, 'rgba(155, 89, 182, 0.6)');
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0.4)');

    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = '#00ffaa';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ffaa';
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  private drawCircular(audioData: Uint8Array, time: number): void {
    const { ctx, canvas } = this;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const baseRadius = Math.min(canvas.width, canvas.height) * 0.2;
    const barCount = Math.min(audioData.length, 180);

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.floor((i / barCount) * audioData.length);
      const value = audioData[dataIndex] / 255;
      const barLength = value * baseRadius * 1.5;

      const angle = (i / barCount) * Math.PI * 2 + time * 0.0005;
      const freqRatio = i / barCount;
      const color = frequencyToColor(freqRatio * 20000, 20, 20000);

      const innerX = centerX + Math.cos(angle) * baseRadius;
      const innerY = centerY + Math.sin(angle) * baseRadius;
      const outerX = centerX + Math.cos(angle) * (baseRadius + barLength);
      const outerY = centerY + Math.sin(angle) * (baseRadius + barLength);

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;

      ctx.beginPath();
      ctx.moveTo(innerX, innerY);
      ctx.lineTo(outerX, outerY);
      ctx.stroke();

      ctx.shadowBlur = 0;
    }

    const avgValue = audioData.length > 0
      ? audioData.reduce((sum, val) => sum + val, 0) / audioData.length / 255
      : 0;

    const pulseRadius = baseRadius * 0.6 * (1 + avgValue * 0.3);
    const centerGradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, pulseRadius
    );
    centerGradient.addColorStop(0, 'rgba(0, 255, 170, 0.8)');
    centerGradient.addColorStop(0.5, 'rgba(155, 89, 182, 0.4)');
    centerGradient.addColorStop(1, 'rgba(0, 255, 170, 0)');

    ctx.fillStyle = centerGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  private applyFilter(time: number): void {
    const { ctx, canvas } = this;
    const t = easeOutCubic(this.filterTransitionProgress);

    if (this.filterTransitionProgress < 1 && this.prevFilterType !== 'none') {
      this.applyFilterEffect(this.prevFilterType, time, 1 - t);
    }

    if (this.filterType !== 'none' || this.filterTransitionProgress < 1) {
      const currentFilter = this.filterTransitionProgress < 1 ? this.targetFilterType : this.filterType;
      if (currentFilter !== 'none') {
        const alpha = this.filterTransitionProgress < 1 ? t : 1;
        this.applyFilterEffect(currentFilter, time, alpha);
      }
    }
  }

  private applyFilterEffect(filterType: FilterType, time: number, alpha: number): void {
    const { ctx, canvas } = this;

    switch (filterType) {
      case 'neon':
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = alpha * 0.5;
        ctx.filter = 'blur(10px) brightness(1.5)';
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        break;

      case 'vintage':
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(255, 200, 100, 0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const grainCount = 1000;
        for (let i = 0; i < grainCount; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          const size = Math.random() * 2;
          ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.3})`;
          ctx.fillRect(x, y, size, size);
        }
        ctx.globalAlpha = 1;
        break;

      case 'watercolor':
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = alpha * 0.3;

        const gradient1 = ctx.createRadialGradient(
          canvas.width * 0.3, canvas.height * 0.4, 0,
          canvas.width * 0.3, canvas.height * 0.4, canvas.width * 0.5
        );
        gradient1.addColorStop(0, 'rgba(0, 255, 170, 0.3)');
        gradient1.addColorStop(1, 'rgba(0, 255, 170, 0)');
        ctx.fillStyle = gradient1;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const gradient2 = ctx.createRadialGradient(
          canvas.width * 0.7, canvas.height * 0.6, 0,
          canvas.width * 0.7, canvas.height * 0.6, canvas.width * 0.4
        );
        gradient2.addColorStop(0, 'rgba(255, 0, 170, 0.3)');
        gradient2.addColorStop(1, 'rgba(255, 0, 170, 0)');
        ctx.fillStyle = gradient2;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        break;

      case 'liquid':
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = alpha * 0.4;
        ctx.filter = 'blur(5px) contrast(1.5)';
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        break;

      case 'pixel':
        ctx.globalAlpha = alpha;
        const pixelSize = 8;
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        for (let y = 0; y < canvas.height; y += pixelSize) {
          for (let x = 0; x < canvas.width; x += pixelSize) {
            let r = 0, g = 0, b = 0, count = 0;

            for (let py = 0; py < pixelSize && y + py < canvas.height; py++) {
              for (let px = 0; px < pixelSize && x + px < canvas.width; px++) {
                const i = ((y + py) * canvas.width + (x + px)) * 4;
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
                count++;
              }
            }

            r = Math.floor(r / count);
            g = Math.floor(g / count);
            b = Math.floor(b / count);

            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(x, y, pixelSize, pixelSize);
          }
        }
        ctx.globalAlpha = 1;
        break;
    }
  }

  public getCurrentWaveformType(): WaveformType {
    return this.waveformType;
  }

  public getCurrentFilterType(): FilterType {
    return this.filterType;
  }
}
