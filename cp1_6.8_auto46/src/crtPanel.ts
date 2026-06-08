export interface HitRecord {
  energy: number;
  time: number;
  detectorId: number;
}

export class CRTPanel {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 360;
  private height: number = 280;
  private waveformData: number[] = [];
  private waveformLength: number = 200;
  private totalHits: number = 0;
  private displayedHits: number = 0;
  private energyLevel: number = 0;
  private targetEnergyLevel: number = 0;
  private recentHits: HitRecord[] = [];
  private maxRecentHits: number = 10;
  private scanlineOffset: number = 0;
  private flickerIntensity: number = 1;
  private pulseSpike: number = 0;
  private pulseDecay: number = 0.95;
  private hitScrollOffset: number = 0;
  private lastHitTime: number = 0;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas with id "${canvasId}" not found`);
    }
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    this.initWaveform();
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    this.width = 360;
    this.height = 280;
    
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    
    this.ctx.scale(dpr, dpr);
  }

  private initWaveform(): void {
    this.waveformData = [];
    for (let i = 0; i < this.waveformLength; i++) {
      this.waveformData.push(0);
    }
  }

  public addHit(energy: number, time: number, detectorId: number): void {
    this.totalHits++;
    
    this.pulseSpike = Math.min(1, energy / 250);
    
    const hitRecord: HitRecord = { energy, time, detectorId };
    this.recentHits.unshift(hitRecord);
    if (this.recentHits.length > this.maxRecentHits) {
      this.recentHits.pop();
    }
    
    this.hitScrollOffset = 1;
    this.lastHitTime = time;
    
    const energyPercent = Math.min(100, (energy / 250) * 100);
    this.targetEnergyLevel = energyPercent;
  }

  public update(deltaTime: number): void {
    this.waveformData.shift();
    
    const noise = (Math.random() - 0.5) * 0.02;
    let newValue = noise + this.pulseSpike * 0.8;
    this.waveformData.push(newValue);
    
    this.pulseSpike *= this.pulseDecay;
    if (this.pulseSpike < 0.001) {
      this.pulseSpike = 0;
    }
    
    const energyDiff = this.targetEnergyLevel - this.energyLevel;
    this.energyLevel += energyDiff * deltaTime * 3;
    if (this.energyLevel < 0) this.energyLevel = 0;
    if (this.energyLevel > 100) this.energyLevel = 100;
    
    this.targetEnergyLevel *= Math.pow(0.9, deltaTime * 2);
    
    if (this.displayedHits < this.totalHits) {
      this.displayedHits += Math.ceil((this.totalHits - this.displayedHits) * deltaTime * 5);
      if (this.displayedHits > this.totalHits) {
        this.displayedHits = this.totalHits;
      }
    }
    
    this.scanlineOffset = (this.scanlineOffset + deltaTime * 20) % 4;
    
    this.flickerIntensity = 0.95 + Math.random() * 0.1;
    
    if (this.hitScrollOffset > 0) {
      this.hitScrollOffset -= deltaTime * 2;
      if (this.hitScrollOffset < 0) this.hitScrollOffset = 0;
    }
  }

  public render(): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    
    ctx.save();
    ctx.globalAlpha = this.flickerIntensity;
    
    this.drawBackground(ctx, w, h);
    this.drawScanlines(ctx, w, h);
    this.drawWaveform(ctx, w, h);
    this.drawStats(ctx, w, h);
    this.drawRecentHits(ctx, w, h);
    
    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#0a1a0a');
    gradient.addColorStop(0.5, '#052005');
    gradient.addColorStop(1, '#0a1a0a');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    
    ctx.strokeStyle = '#1a3a1a';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, w - 4, h - 4);
    
    ctx.strokeStyle = '#0a2a0a';
    ctx.lineWidth = 1;
    ctx.strokeRect(4, 4, w - 8, h - 8);
  }

  private drawScanlines(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#000000';
    
    for (let y = this.scanlineOffset; y < h; y += 4) {
      ctx.fillRect(0, y, w, 1);
    }
    
    ctx.restore();
  }

  private drawWaveform(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const waveTop = 30;
    const waveHeight = 100;
    const waveLeft = 15;
    const waveWidth = w - 30;
    
    ctx.save();
    
    ctx.strokeStyle = '#0a2a0a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(waveLeft, waveTop + waveHeight / 2);
    ctx.lineTo(waveLeft + waveWidth, waveTop + waveHeight / 2);
    ctx.stroke();
    
    ctx.shadowColor = '#00ff44';
    ctx.shadowBlur = 6;
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    
    for (let i = 0; i < this.waveformLength; i++) {
      const x = waveLeft + (i / this.waveformLength) * waveWidth;
      const value = this.waveformData[i];
      const y = waveTop + waveHeight / 2 - value * waveHeight * 0.45;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
    
    ctx.fillStyle = '#00ff66';
    ctx.font = '10px Courier New, monospace';
    ctx.fillText('SIGNAL', waveLeft, waveTop - 8);
    
    ctx.fillStyle = '#00aa33';
    ctx.fillText('ENERGY SPECTRUM', waveLeft + waveWidth - 100, waveTop - 8);
    
    ctx.restore();
  }

  private drawStats(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const statsTop = 145;
    const statsLeft = 15;
    
    ctx.save();
    
    ctx.fillStyle = '#00ff66';
    ctx.font = 'bold 12px Courier New, monospace';
    ctx.fillText(`HIT COUNT: ${Math.floor(this.displayedHits)}`, statsLeft, statsTop);
    
    const barLeft = statsLeft;
    const barTop = statsTop + 15;
    const barWidth = w - 30;
    const barHeight = 16;
    
    ctx.strokeStyle = '#00aa33';
    ctx.lineWidth = 1;
    ctx.strokeRect(barLeft, barTop, barWidth, barHeight);
    
    const energyPercent = this.energyLevel / 100;
    const fillWidth = barWidth * energyPercent;
    
    const gradient = ctx.createLinearGradient(barLeft, 0, barLeft + barWidth, 0);
    gradient.addColorStop(0, '#00ff44');
    gradient.addColorStop(0.5, '#ffff00');
    gradient.addColorStop(1, '#ff3300');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(barLeft + 1, barTop + 1, fillWidth - 2, barHeight - 2);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ENERGY LEVEL', barLeft + barWidth / 2, barTop - 3);
    ctx.textAlign = 'left';
    
    ctx.fillStyle = '#00ff66';
    ctx.font = '10px Courier New, monospace';
    ctx.fillText(`LEVEL: ${this.energyLevel.toFixed(0)}%`, statsLeft, barTop + barHeight + 13);
    
    ctx.restore();
  }

  private drawRecentHits(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const listTop = 195;
    const listLeft = 15;
    const listWidth = w - 30;
    const itemHeight = 16;
    
    ctx.save();
    
    ctx.fillStyle = '#00ff66';
    ctx.font = 'bold 11px Courier New, monospace';
    ctx.fillText('RECENT HITS:', listLeft, listTop - 5);
    
    for (let i = 0; i < this.maxRecentHits; i++) {
      const y = listTop + i * itemHeight + this.hitScrollOffset * itemHeight;
      
      if (i < this.recentHits.length) {
        const hit = this.recentHits[i];
        const timeStr = this.formatTime(hit.time);
        const energyStr = hit.energy.toFixed(1);
        
        if (i === 0) {
          ctx.fillStyle = '#00ff88';
          ctx.font = 'bold 10px Courier New, monospace';
        } else {
          ctx.fillStyle = '#00aa33';
          ctx.font = '10px Courier New, monospace';
        }
        
        ctx.fillText(`${timeStr}`, listLeft, y + 12);
        ctx.fillText(`D${hit.detectorId.toString().padStart(2, '0')}`, listLeft + 60, y + 12);
        ctx.fillText(`${energyStr} MeV`, listLeft + 110, y + 12);
      } else {
        ctx.fillStyle = '#0a3a0a';
        ctx.font = '10px Courier New, monospace';
        ctx.fillText('--:--:--.--  --  ---.- MeV', listLeft, y + 12);
      }
    }
    
    ctx.restore();
  }

  private formatTime(time: number): string {
    const date = new Date(time);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ms = Math.floor(date.getMilliseconds() / 10).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}.${ms}`;
  }

  public getTotalHits(): number {
    return this.totalHits;
  }

  public getEnergyLevel(): number {
    return this.energyLevel;
  }
}
