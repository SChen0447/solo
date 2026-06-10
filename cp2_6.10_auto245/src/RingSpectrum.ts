import type { Track } from './ConflictDetector';

interface HoverInfo {
  track: Track;
  x: number;
  y: number;
}

interface HoverState {
  info: HoverInfo | null;
  highlightedTrackId: string | null;
}

interface FreqBand {
  name: string;
  min: number;
  max: number;
  colorStart: string;
  colorEnd: string;
}

const FREQ_BANDS: FreqBand[] = [
  { name: '低频', min: 20, max: 250, colorStart: '#0a3d62', colorEnd: '#1e6091' },
  { name: '中低频', min: 250, max: 2000, colorStart: '#1abc9c', colorEnd: '#16a085' },
  { name: '中高频', min: 2000, max: 8000, colorStart: '#e67e22', colorEnd: '#d35400' },
  { name: '高频', min: 8000, max: 20000, colorStart: '#9b59b6', colorEnd: '#8e44ad' },
];

const MIN_FREQ = 20;
const MAX_FREQ = 20000;
const RING_START_ANGLE = -Math.PI / 2;
const RING_ANGLE_RANGE = Math.PI * 2;

const freqToAngle = (freq: number): number => {
  const logMin = Math.log10(MIN_FREQ);
  const logMax = Math.log10(MAX_FREQ);
  const logFreq = Math.log10(Math.max(MIN_FREQ, Math.min(MAX_FREQ, freq)));
  const t = (logFreq - logMin) / (logMax - logMin);
  return RING_START_ANGLE + t * RING_ANGLE_RANGE;
};

const angleToFreq = (angle: number): number => {
  const logMin = Math.log10(MIN_FREQ);
  const logMax = Math.log10(MAX_FREQ);
  let t = (angle - RING_START_ANGLE) / RING_ANGLE_RANGE;
  t = ((t % 1) + 1) % 1;
  return Math.pow(10, logMin + t * (logMax - logMin));
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 255, g: 255, b: 255 };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return `#${Math.round(Math.max(0, Math.min(255, r))).toString(16).padStart(2, '0')}${Math.round(Math.max(0, Math.min(255, g))).toString(16).padStart(2, '0')}${Math.round(Math.max(0, Math.min(255, b))).toString(16).padStart(2, '0')}`;
};

const brightenColor = (hex: string, percent: number): string => {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * percent, g + (255 - g) * percent, b + (255 - b) * percent);
};

const formatFreqDisplay = (freq: number): string => {
  if (freq >= 1000) return (freq / 1000).toFixed(1) + 'kHz';
  return Math.round(freq) + 'Hz';
};

class RingSpectrum {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private wrapper: HTMLElement;
  private bubbleEl: HTMLElement;
  private dpr: number = window.devicePixelRatio || 1;
  private tracks: Track[] = [];
  private animationId: number | null = null;
  private hoverState: HoverState = { info: null, highlightedTrackId: null };
  private baseCanvas: HTMLCanvasElement | null = null;
  private baseCtx: CanvasRenderingContext2D | null = null;
  private centerX: number = 0;
  private centerY: number = 0;
  private outerRadius: number = 0;
  private bandWidth: number = 0;
  private time: number = 0;
  private onHoverChange: ((hoveredTrackId: string | null) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, wrapper: HTMLElement, bubbleEl: HTMLElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.wrapper = wrapper;
    this.bubbleEl = bubbleEl;

    this.baseCanvas = document.createElement('canvas');
    this.baseCtx = this.baseCanvas.getContext('2d');

    this.resize();
    this.bindEvents();
  }

  setOnHoverChange(callback: (hoveredTrackId: string | null) => void): void {
    this.onHoverChange = callback;
  }

  setTracks(tracks: Track[]): void {
    this.tracks = tracks;
  }

  setHighlightedTrack(trackId: string | null): void {
    this.hoverState.highlightedTrackId = trackId;
  }

  start(): void {
    if (this.animationId !== null) return;
    const loop = () => {
      this.time += 0.016;
      this.render();
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  resize(): void {
    const rect = this.wrapper.getBoundingClientRect();
    const size = Math.min(rect.width, rect.height);
    this.canvas.width = size * this.dpr;
    this.canvas.height = size * this.dpr;
    this.canvas.style.width = size + 'px';
    this.canvas.style.height = size + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    if (this.baseCanvas && this.baseCtx) {
      this.baseCanvas.width = size * this.dpr;
      this.baseCanvas.height = size * this.dpr;
      this.baseCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    this.centerX = size / 2;
    this.centerY = size / 2;
    this.outerRadius = size * 0.45;
    this.bandWidth = size * 0.06;

    this.renderBase();
  }

  private renderBase(): void {
    if (!this.baseCtx || !this.baseCanvas) return;
    const ctx = this.baseCtx;
    const size = this.baseCanvas.width / this.dpr;
    ctx.clearRect(0, 0, size, size);

    for (let i = FREQ_BANDS.length - 1; i >= 0; i--) {
      const band = FREQ_BANDS[i];
      const innerR = this.outerRadius - (i + 1) * this.bandWidth;
      const outerR = this.outerRadius - i * this.bandWidth;

      const gradient = ctx.createRadialGradient(
        this.centerX, this.centerY, innerR,
        this.centerX, this.centerY, outerR
      );
      gradient.addColorStop(0, band.colorStart);
      gradient.addColorStop(1, band.colorEnd);

      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, outerR, 0, Math.PI * 2);
      ctx.arc(this.centerX, this.centerY, innerR, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      ctx.arc(this.centerX, this.centerY, outerR, 0, Math.PI * 2);
      ctx.arc(this.centerX, this.centerY, innerR, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const innerRadius = this.outerRadius - FREQ_BANDS.length * this.bandWidth;
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(26, 26, 46, 0.8)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(240, 255, 255, 0.8)';
    ctx.fillText('20Hz-20kHz', this.centerX, this.centerY);

    const labelRadius = innerRadius * 0.5;
    FREQ_BANDS.forEach((band, i) => {
      const angle = RING_START_ANGLE + (i + 0.5) * (RING_ANGLE_RANGE / FREQ_BANDS.length);
      const lx = this.centerX + Math.cos(angle) * labelRadius;
      const ly = this.centerY + Math.sin(angle) * labelRadius;
      ctx.font = '11px sans-serif';
      ctx.fillStyle = band.colorEnd;
      ctx.fillText(band.name, lx, ly);
    });

    const tickCount = 20;
    for (let i = 0; i <= tickCount; i++) {
      const t = i / tickCount;
      const angle = RING_START_ANGLE + t * RING_ANGLE_RANGE;
      const freq = angleToFreq(angle);
      const r1 = this.outerRadius + 6;
      const r2 = this.outerRadius + 14;
      const x1 = this.centerX + Math.cos(angle) * r1;
      const y1 = this.centerY + Math.sin(angle) * r1;
      const x2 = this.centerX + Math.cos(angle) * r2;
      const y2 = this.centerY + Math.sin(angle) * r2;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = i % 5 === 0 ? 2 : 1;
      ctx.stroke();

      if (i % 5 === 0) {
        const lr = this.outerRadius + 26;
        const lx = this.centerX + Math.cos(angle) * lr;
        const ly = this.centerY + Math.sin(angle) * lr;
        ctx.font = '10px sans-serif';
        ctx.fillStyle = 'rgba(200,200,200,0.6)';
        ctx.textAlign = 'center';
        ctx.fillText(formatFreqDisplay(freq), lx, ly);
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const size = this.canvas.width / this.dpr;
    ctx.clearRect(0, 0, size, size);

    if (this.baseCanvas) {
      ctx.drawImage(this.baseCanvas, 0, 0, size, size);
    }

    this.tracks.forEach((track) => {
      this.drawTrackWaveform(ctx, track);
    });
  }

  private drawTrackWaveform(ctx: CanvasRenderingContext2D, track: Track): void {
    const isHovered = this.hoverState.info?.track.id === track.id;
    const isHighlighted = this.hoverState.highlightedTrackId === track.id;
    const hasHover = this.hoverState.info !== null;
    const hasHighlight = this.hoverState.highlightedTrackId !== null;

    let alpha = 1;
    let color = track.color;
    let lineWidthMultiplier = 1;

    if (hasHover || hasHighlight) {
      if (isHovered || isHighlighted) {
        color = brightenColor(track.color, 0.2);
        lineWidthMultiplier = 1.5;
        alpha = 1;
      } else {
        alpha = 0.4;
      }
    }

    const startAngle = freqToAngle(track.startFreq);
    const endAngle = freqToAngle(track.endFreq);
    const bandCenter = this.outerRadius - FREQ_BANDS.length * this.bandWidth / 2;
    const totalBandWidth = FREQ_BANDS.length * this.bandWidth;
    const trackRadius = bandCenter - totalBandWidth * 0.15 + (parseInt(track.id.slice(-1)) % 3) * 8;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = color;
    ctx.shadowBlur = isHovered || isHighlighted ? 20 : 8;

    ctx.beginPath();
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = startAngle + (endAngle - startAngle) * t;
      const waveIdx = Math.min(track.waveformData.length - 1, Math.floor(t * track.waveformData.length));
      const energy = track.waveformData[waveIdx] * (track.volume / 100);
      const animOffset = Math.sin(this.time * 2 + i * 0.3) * 0.3;
      const waveAmplitude = (energy * 0.6 + animOffset * 0.1) * totalBandWidth * 0.35;
      const r = trackRadius + waveAmplitude;
      const x = this.centerX + Math.cos(angle) * r;
      const y = this.centerY + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = (3 + track.peakEnergy * 0.3) * lineWidthMultiplier;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = startAngle + (endAngle - startAngle) * t;
      const waveIdx = Math.min(track.waveformData.length - 1, Math.floor(t * track.waveformData.length));
      const energy = track.waveformData[waveIdx] * (track.volume / 100);
      const animOffset = Math.sin(this.time * 2 + i * 0.3) * 0.3;
      const waveAmplitude = (energy * 0.6 + animOffset * 0.1) * totalBandWidth * 0.35;
      const r = trackRadius - waveAmplitude;
      const x = this.centerX + Math.cos(angle) * r;
      const y = this.centerY + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.globalAlpha = alpha * 0.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = (1.5 + track.peakEnergy * 0.1) * lineWidthMultiplier;
    ctx.stroke();

    ctx.restore();

    const midAngle = (startAngle + endAngle) / 2;
    const labelR = this.outerRadius + 40;
    const lx = this.centerX + Math.cos(midAngle) * labelR;
    const ly = this.centerY + Math.sin(midAngle) * labelR;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(track.name, lx, ly);
    ctx.restore();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
    window.addEventListener('resize', () => this.resize());
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let foundHover: HoverInfo | null = null;
    const hitRadius = 20;

    for (const track of this.tracks) {
      const startAngle = freqToAngle(track.startFreq);
      const endAngle = freqToAngle(track.endFreq);
      const bandCenter = this.outerRadius - FREQ_BANDS.length * this.bandWidth / 2;
      const totalBandWidth = FREQ_BANDS.length * this.bandWidth;
      const trackRadius = bandCenter - totalBandWidth * 0.15 + (parseInt(track.id.slice(-1)) % 3) * 8;

      const dx = mx - this.centerX;
      const dy = my - this.centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      if (Math.abs(dist - trackRadius) < hitRadius + totalBandWidth * 0.4) {
        let normalizedStart = startAngle;
        let normalizedEnd = endAngle;
        let normalizedAngle = angle;

        while (normalizedEnd < normalizedStart) normalizedEnd += Math.PI * 2;
        while (normalizedAngle < normalizedStart - Math.PI * 0.1) normalizedAngle += Math.PI * 2;
        while (normalizedAngle > normalizedEnd + Math.PI * 0.1) normalizedAngle -= Math.PI * 2;

        if (normalizedAngle >= normalizedStart - 0.1 && normalizedAngle <= normalizedEnd + 0.1) {
          const midAngle = (normalizedStart + normalizedEnd) / 2;
          const labelR = this.outerRadius + 55;
          foundHover = {
            track,
            x: this.centerX + Math.cos(midAngle) * labelR,
            y: this.centerY + Math.sin(midAngle) * labelR,
          };
          break;
        }
      }
    }

    const prevHoverId = this.hoverState.info?.track.id ?? null;
    const newHoverId = foundHover?.track.id ?? null;

    if (prevHoverId !== newHoverId) {
      this.hoverState.info = foundHover;
      if (this.onHoverChange) this.onHoverChange(newHoverId);
      this.updateBubble();
    }
  }

  private handleMouseLeave(): void {
    if (this.hoverState.info !== null) {
      this.hoverState.info = null;
      if (this.onHoverChange) this.onHoverChange(null);
      this.updateBubble();
    }
  }

  private updateBubble(): void {
    const hover = this.hoverState.info;
    if (!hover) {
      this.bubbleEl.style.display = 'none';
      return;
    }

    const { track, x, y } = hover;
    this.bubbleEl.style.display = 'block';
    this.bubbleEl.innerHTML = `
      <div class="bubble-title">${track.name}</div>
      <div class="bubble-row">
        <span class="bubble-label">起始频率</span>
        <span class="bubble-value">${formatFreqDisplay(track.startFreq)}</span>
      </div>
      <div class="bubble-row">
        <span class="bubble-label">截止频率</span>
        <span class="bubble-value">${formatFreqDisplay(track.endFreq)}</span>
      </div>
      <div class="bubble-row">
        <span class="bubble-label">能量峰值</span>
        <span class="bubble-value">${track.peakEnergy.toFixed(1)} dBFS</span>
      </div>
      <div class="bubble-row">
        <span class="bubble-label">音量</span>
        <span class="bubble-value">${track.volume}%</span>
      </div>
    `;

    const bubbleRect = this.bubbleEl.getBoundingClientRect();
    const wrapperRect = this.wrapper.getBoundingClientRect();
    let bx = x - bubbleRect.width / 2;
    let by = y - bubbleRect.height / 2;

    bx = Math.max(8, Math.min(wrapperRect.width - bubbleRect.width - 8, bx));
    by = Math.max(8, Math.min(wrapperRect.height - bubbleRect.height - 8, by));

    this.bubbleEl.style.left = bx + 'px';
    this.bubbleEl.style.top = by + 'px';
  }
}

export default RingSpectrum;
