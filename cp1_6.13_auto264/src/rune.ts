import { PALETTE, SYMBOL_TYPES, SymbolType } from './data';

export interface RuneState {
  isHovered: boolean;
  isSelected: boolean;
  isUsed: boolean;
  isError: boolean;
  waveProgress: number;
  glowIntensity: number;
  scale: number;
  whiteFlash: number;
}

export class Rune {
  row: number;
  col: number;
  x: number;
  y: number;
  size: number;
  color: string;
  originalColor: string;
  symbol: SymbolType;

  state: RuneState;
  waveActive: boolean;
  waveStartTime: number;
  errorStartTime: number;
  whiteFlashStartTime: number;
  audioCtx: AudioContext | null;

  private _tempNeighbors: Rune[] = [];

  constructor(row: number, col: number, x: number, y: number, size: number) {
    this.row = row;
    this.col = col;
    this.x = x;
    this.y = y;
    this.size = size;
    this.color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
    this.originalColor = this.color;
    this.symbol = SYMBOL_TYPES[Math.floor(Math.random() * SYMBOL_TYPES.length)];

    this.state = {
      isHovered: false,
      isSelected: false,
      isUsed: false,
      isError: false,
      waveProgress: 0,
      glowIntensity: 1,
      scale: 1,
      whiteFlash: 0
    };

    this.waveActive = false;
    this.waveStartTime = 0;
    this.errorStartTime = 0;
    this.whiteFlashStartTime = 0;
    this.audioCtx = null;
  }

  setPosition(x: number, y: number, size: number): void {
    this.x = x;
    this.y = y;
    this.size = size;
  }

  getHexPath(ctx: CanvasRenderingContext2D, size: number): void {
    const s = size;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const px = Math.cos(angle) * s;
      const py = Math.sin(angle) * s;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  containsPoint(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist <= this.size * 0.95;
  }

  isAdjacentTo(other: Rune): boolean {
    const dr = Math.abs(this.row - other.row);
    const dc = Math.abs(this.col - other.col);
    if (dr === 0 && dc === 1) return true;
    if (dr === 1 && dc === 0) return true;
    if (dr === 1 && dc === 1) return true;
    return false;
  }

  playHoverSound(): void {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = this.audioCtx;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 80 + Math.random() * 40;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch (_) { /* ignore audio errors */ }
  }

  playSelectSound(): void {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = this.audioCtx;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch (_) { /* ignore */ }
  }

  playErrorSound(): void {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = this.audioCtx;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 120;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch (_) { /* ignore */ }
  }

  triggerWave(now: number): void {
    this.waveActive = true;
    this.waveStartTime = now;
    this.whiteFlashStartTime = now;
    this.playSelectSound();
  }

  triggerError(now: number): void {
    this.state.isError = true;
    this.errorStartTime = now;
    this.playErrorSound();
  }

  update(now: number): void {
    if (this.waveActive) {
      const elapsed = (now - this.waveStartTime) / 1000;
      if (elapsed < 0.8) {
        this.state.waveProgress = elapsed / 0.8;
      } else {
        this.waveActive = false;
        this.state.waveProgress = 0;
      }
    }

    if (this.whiteFlashStartTime > 0) {
      const elapsed = (now - this.whiteFlashStartTime) / 1000;
      if (elapsed < 1.0) {
        this.state.whiteFlash = 1 - elapsed / 1.0;
      } else {
        this.whiteFlashStartTime = 0;
        this.state.whiteFlash = 0;
      }
    }

    if (this.state.isError) {
      const elapsed = (now - this.errorStartTime) / 1000;
      if (elapsed >= 0.2) {
        this.state.isError = false;
      }
    }

    const targetScale = this.state.isHovered && !this.state.isUsed ? 1.1 : 1.0;
    this.state.scale += (targetScale - this.state.scale) * 0.15;

    const baseGlow = this.state.isSelected ? 2.5 : (this.state.isHovered ? 1.5 : 1.0);
    this.state.glowIntensity += (baseGlow - this.state.glowIntensity) * 0.12;
  }

  private drawSymbol(ctx: CanvasRenderingContext2D, symbolSize: number, color: string): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const s = symbolSize;

    switch (this.symbol) {
      case 'triangle': {
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.7);
        ctx.lineTo(s * 0.6, s * 0.5);
        ctx.lineTo(-s * 0.6, s * 0.5);
        ctx.closePath();
        ctx.stroke();
        break;
      }
      case 'diamond': {
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.75);
        ctx.lineTo(s * 0.55, 0);
        ctx.lineTo(0, s * 0.75);
        ctx.lineTo(-s * 0.55, 0);
        ctx.closePath();
        ctx.stroke();
        break;
      }
      case 'star': {
        const spikes = 5;
        const outer = s * 0.7;
        const inner = s * 0.3;
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
          const r = i % 2 === 0 ? outer : inner;
          const angle = (Math.PI / spikes) * i - Math.PI / 2;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        break;
      }
      case 'circle': {
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.55, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'pentagon': {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
          const px = Math.cos(angle) * s * 0.6;
          const py = Math.sin(angle) * s * 0.6;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }

  draw(ctx: CanvasRenderingContext2D, now: number): void {
    this.update(now);
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.state.scale, this.state.scale);

    const drawSize = this.size;
    const borderColor = this.state.isError ? '#ff0000'
      : this.state.whiteFlash > 0 ? '#ffffff'
      : this.state.isUsed ? 'rgba(180,180,180,0.4)'
      : this.color;

    if (this.waveActive && this.state.waveProgress > 0) {
      const waveRadius = 0 + this.state.waveProgress * 120;
      const waveAlpha = 0.8 * (1 - this.state.waveProgress);
      ctx.save();
      ctx.globalAlpha = waveAlpha;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 4;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, 0, waveRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    const glow = this.state.glowIntensity;
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 12 * glow;

    this.getHexPath(ctx, drawSize);
    ctx.fillStyle = this.state.isUsed
      ? 'rgba(150, 150, 150, 0.08)'
      : 'rgba(255, 255, 255, 0.04)';
    ctx.fill();

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = borderColor;
    ctx.stroke();

    ctx.shadowBlur = 0;
    this.getHexPath(ctx, drawSize * 0.96);
    ctx.strokeStyle = this.state.isUsed
      ? 'rgba(255,255,255,0.03)'
      : 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const symbolColor = this.state.whiteFlash > 0
      ? `rgba(255,255,255,${0.6 + this.state.whiteFlash * 0.4})`
      : this.state.isUsed
        ? 'rgba(180,180,180,0.35)'
        : this.color;
    this.drawSymbol(ctx, drawSize * 0.5, symbolColor);

    if (this.state.isSelected && !this.state.isUsed) {
      ctx.save();
      ctx.globalAlpha = 0.6 + Math.sin(now / 200) * 0.2;
      this.getHexPath(ctx, drawSize * 0.9);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 18;
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }
}
