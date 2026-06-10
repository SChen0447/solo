import type { AudioClip } from './types';

export class WaveformRenderer {
  private accentColor = '#7c5cbf';
  private bgColor = '#1e1e2e';
  private lineColor = '#6b6b8a';
  private textColor = '#aaaaaa';

  public setAccentColor(color: string): void {
    this.accentColor = color;
  }

  public renderWaveform(
    canvas: HTMLCanvasElement,
    data: number[],
    color: string = this.accentColor,
    lineWidth: number = 2
  ): void {
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = this.bgColor;
    ctx.fillRect(0, 0, w, h);

    if (!data || data.length === 0) return;

    const centerY = h / 2;
    const barWidth = w / data.length;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = i * barWidth + barWidth / 2;
      const amp = data[i] * (h / 2 - 4);
      ctx.moveTo(x, centerY - amp);
      ctx.lineTo(x, centerY + amp);
    }
    ctx.stroke();
  }

  public renderTimeline(
    canvas: HTMLCanvasElement,
    duration: number,
    pixelsPerSecond: number = 100
  ): void {
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#202030';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = this.lineColor;
    ctx.fillStyle = this.textColor;
    ctx.font = '12px sans-serif';
    ctx.textBaseline = 'top';

    const secondsToShow = Math.max(duration, w / pixelsPerSecond);
    const interval = this.getInterval(pixelsPerSecond);

    for (let t = 0; t <= secondsToShow; t += interval) {
      const x = t * pixelsPerSecond;
      if (x > w) break;

      const isMajor = t % 1 === 0;
      const lineHeight = isMajor ? 8 : 4;

      ctx.beginPath();
      ctx.lineWidth = isMajor ? 1 : 0.5;
      ctx.moveTo(x, h - lineHeight);
      ctx.lineTo(x, h);
      ctx.stroke();

      if (isMajor) {
        const label = this.formatTime(t);
        ctx.fillText(label, x + 3, 4);
      }
    }
  }

  private getInterval(pps: number): number {
    if (pps >= 200) return 0.5;
    if (pps >= 100) return 1;
    if (pps >= 50) return 2;
    if (pps >= 20) return 5;
    return 10;
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  public updatePlayhead(
    canvas: HTMLCanvasElement,
    time: number,
    pixelsPerSecond: number
  ): number {
    return time * pixelsPerSecond;
  }

  public renderTrackClips(
    canvas: HTMLCanvasElement,
    clips: AudioClip[],
    trackHeight: number,
    pixelsPerSecond: number,
    currentTime: number = 0
  ): void {
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#1e1e2e';
    ctx.fillRect(0, 0, w, h);

    for (const clip of clips) {
      const x = clip.startTime * pixelsPerSecond;
      const clipW = clip.duration * pixelsPerSecond;
      if (x + clipW < 0 || x > w) continue;

      ctx.fillStyle = 'rgba(124, 92, 191, 0.2)';
      ctx.fillRect(x, 4, clipW, h - 8);

      ctx.strokeStyle = '#7c5cbf';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, 4.5, clipW - 1, h - 9);

      if (clip.waveformData && clip.waveformData.length > 0) {
        const centerY = h / 2;
        const ampMax = (h - 16) / 2;
        const barWidth = clipW / clip.waveformData.length;
        ctx.strokeStyle = '#7c5cbf';
        ctx.lineWidth = Math.max(1, barWidth * 0.8);
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i < clip.waveformData.length; i++) {
          const px = x + i * barWidth + barWidth / 2;
          if (px < 0 || px > w) continue;
          const amp = clip.waveformData[i] * ampMax;
          ctx.moveTo(px, centerY - amp);
          ctx.lineTo(px, centerY + amp);
        }
        ctx.stroke();
      }

      if (clip.fadeIn > 0) {
        const fadeW = clip.duration * clip.fadeIn * pixelsPerSecond;
        ctx.fillStyle = 'rgba(255, 107, 107, 0.3)';
        ctx.beginPath();
        ctx.moveTo(x, h - 4);
        ctx.lineTo(x, 4);
        ctx.lineTo(x + fadeW, h / 2);
        ctx.closePath();
        ctx.fill();
      }

      if (clip.fadeOut > 0) {
        const fadeW = clip.duration * clip.fadeOut * pixelsPerSecond;
        const startX = x + clipW - fadeW;
        ctx.fillStyle = 'rgba(255, 107, 107, 0.3)';
        ctx.beginPath();
        ctx.moveTo(startX, h / 2);
        ctx.lineTo(x + clipW, 4);
        ctx.lineTo(x + clipW, h - 4);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(clip.name, x + 6, 6);
    }
  }

  public renderEmptyTrack(canvas: HTMLCanvasElement): void {
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#1e1e2e';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(107, 107, 138, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(8.5, 8.5, w - 17, h - 17);
    ctx.setLineDash([]);

    ctx.fillStyle = '#6b6b8a';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('点击此处添加音频片段到轨道', w / 2, h / 2);
    ctx.textAlign = 'left';
  }

  public drawSnapLine(
    canvas: HTMLCanvasElement,
    x: number,
    color: string = '#ffff00'
  ): void {
    const ctx = canvas.getContext('2d')!;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  public drawPlayhead(
    canvas: HTMLCanvasElement,
    x: number
  ): void {
    const ctx = canvas.getContext('2d')!;
    ctx.save();
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.clientHeight);
    ctx.stroke();
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.moveTo(x - 5, 0);
    ctx.lineTo(x + 5, 0);
    ctx.lineTo(x, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  public clear(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

export function formatTimeFull(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}
