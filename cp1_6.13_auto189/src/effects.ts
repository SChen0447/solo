import gsap from 'gsap';
import { Point, InteractionState } from './interaction';

interface RuneAura {
  id: number;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  diameter: number;
  baseDiameter: number;
  scale: number;
  targetScale: number;
  brightness: number;
  angle: number;
  floatPhase: number;
}

interface PulseWave {
  id: number;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  width: number;
  alpha: number;
  color: string;
  active: boolean;
}

interface StarDust {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  targetDistance: number;
}

export class EffectsManager {
  private ctx: CanvasRenderingContext2D;
  private audioContext: AudioContext | null;
  private runes: RuneAura[];
  private pulseWaves: PulseWave[];
  private starDusts: StarDust[];
  private center: Point;
  private cocoonRadius: number;
  private time: number;
  private nextPulseId: number;
  private nextDustId: number;
  private onRuneClick: ((x: number, y: number) => void) | null;

  constructor(ctx: CanvasRenderingContext2D, center: Point, cocoonRadius: number) {
    this.ctx = ctx;
    this.audioContext = null;
    this.runes = [];
    this.pulseWaves = [];
    this.starDusts = [];
    this.center = center;
    this.cocoonRadius = cocoonRadius;
    this.time = 0;
    this.nextPulseId = 0;
    this.nextDustId = 0;
    this.onRuneClick = null;
    this.initRunes();
  }

  private initRunes(): void {
    const runeCount = 12;
    const baseRadius = this.cocoonRadius;
    
    for (let i = 0; i < runeCount; i++) {
      const angle = (i / runeCount) * Math.PI * 2 - Math.PI / 2;
      const x = this.center.x + Math.cos(angle) * baseRadius;
      const y = this.center.y + Math.sin(angle) * baseRadius;
      
      this.runes.push({
        id: i,
        x,
        y,
        baseX: x,
        baseY: y,
        diameter: 40,
        baseDiameter: 40,
        scale: 1,
        targetScale: 1,
        brightness: 1,
        angle,
        floatPhase: Math.random() * Math.PI * 2
      });
    }
  }

  public initAudio(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  public setOnRuneClick(callback: (x: number, y: number) => void): void {
    this.onRuneClick = callback;
  }

  public update(deltaTime: number, interaction: InteractionState): void {
    this.time += deltaTime;
    
    this.updateRunes(deltaTime, interaction);
    this.updatePulseWaves(deltaTime);
    this.updateStarDusts(deltaTime);
  }

  private updateRunes(deltaTime: number, interaction: InteractionState): void {
    const floatSpeed = 0.002;
    const floatAmplitude = 5;
    const rotationSpeed = 0.0005;
    
    this.runes.forEach(rune => {
      const rotatedAngle = rune.angle + this.time * rotationSpeed;
      const floatOffset = Math.sin(this.time * floatSpeed + rune.floatPhase) * floatAmplitude;
      
      const radius = this.cocoonRadius + floatOffset;
      rune.x = this.center.x + Math.cos(rotatedAngle) * radius;
      rune.y = this.center.y + Math.sin(rotatedAngle) * radius;
      
      const dist = this.distance(interaction.mouse, rune);
      const isHover = dist < rune.diameter * rune.scale * 0.6;
      
      rune.targetScale = isHover ? 1.3 : 1;
      rune.scale += (rune.targetScale - rune.scale) * deltaTime / 200;
      
      rune.brightness = isHover ? 1.5 : 1;
    });
  }

  private distance(p1: Point, p2: Point): number {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  }

  private updatePulseWaves(deltaTime: number): void {
    this.pulseWaves = this.pulseWaves.filter(wave => wave.active);
    
    this.pulseWaves.forEach(wave => {
      const speed = (wave.maxRadius - 0) / 500;
      wave.radius += speed * deltaTime;
      wave.alpha = Math.max(0, 1 - wave.radius / wave.maxRadius);
      
      if (wave.radius >= wave.maxRadius) {
        wave.active = false;
      }
    });
  }

  private updateStarDusts(deltaTime: number): void {
    this.starDusts = this.starDusts.filter(dust => dust.life > 0);
    
    this.starDusts.forEach(dust => {
      dust.life -= deltaTime;
      
      const progress = 1 - dust.life / dust.maxLife;
      const easeProgress = 1 - Math.pow(1 - progress, 2);
      
      dust.x = dust.startX + dust.vx * easeProgress * dust.targetDistance / 100;
      dust.y = dust.startY + dust.vy * easeProgress * dust.targetDistance / 100;
    });
  }

  public render(): void {
    this.pulseWaves.forEach(wave => {
      this.renderPulseWave(wave);
    });
    
    this.starDusts.forEach(dust => {
      this.renderStarDust(dust);
    });
    
    this.runes.forEach(rune => {
      this.renderRune(rune);
    });
  }

  private renderRune(rune: RuneAura): void {
    const ctx = this.ctx;
    const diameter = rune.diameter * rune.scale;
    const brightness = rune.brightness;
    
    ctx.save();
    ctx.translate(rune.x, rune.y);
    
    const glowRadius = diameter * 0.8;
    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
    glowGradient.addColorStop(0, `rgba(179, 136, 255, ${0.3 * brightness})`);
    glowGradient.addColorStop(0.5, `rgba(179, 136, 255, ${0.1 * brightness})`);
    glowGradient.addColorStop(1, 'rgba(179, 136, 255, 0)');
    
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = glowGradient;
    ctx.fill();
    
    for (let i = 0; i < 3; i++) {
      const ringRadius = (diameter / 2) * (0.6 + i * 0.15);
      const ringAlpha = (0.6 - i * 0.15) * brightness;
      
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(179, 136, 255, ${ringAlpha})`;
      ctx.lineWidth = 1.5 - i * 0.3;
      ctx.stroke();
    }
    
    ctx.beginPath();
    ctx.arc(0, 0, diameter * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200, 180, 255, ${0.8 * brightness})`;
    ctx.fill();
    
    const symbolRotation = this.time * 0.001 * rune.id;
    ctx.rotate(symbolRotation);
    
    ctx.beginPath();
    const innerR = diameter * 0.25;
    const outerR = diameter * 0.4;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const x = Math.cos(angle) * innerR;
      const y = Math.sin(angle) * innerR;
      const ox = Math.cos(angle) * outerR;
      const oy = Math.sin(angle) * outerR;
      
      ctx.moveTo(x, y);
      ctx.lineTo(ox, oy);
    }
    ctx.strokeStyle = `rgba(179, 136, 255, ${0.7 * brightness})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.restore();
  }

  private renderPulseWave(wave: PulseWave): void {
    const ctx = this.ctx;
    
    ctx.save();
    
    for (let i = 0; i < 3; i++) {
      const trailRadius = Math.max(0, wave.radius - i * wave.width);
      const trailAlpha = wave.alpha * (1 - i * 0.3);
      
      if (trailRadius > 0) {
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, trailRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(130, 177, 255, ${trailAlpha * 0.5})`;
        ctx.lineWidth = wave.width;
        ctx.stroke();
      }
    }
    
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(130, 177, 255, ${wave.alpha})`;
    ctx.lineWidth = wave.width;
    ctx.stroke();
    
    ctx.restore();
  }

  private renderStarDust(dust: StarDust): void {
    const ctx = this.ctx;
    const alpha = Math.max(0, dust.life / dust.maxLife);
    
    ctx.save();
    
    const glowGradient = ctx.createRadialGradient(dust.x, dust.y, 0, dust.x, dust.y, dust.size * 3);
    glowGradient.addColorStop(0, `rgba(255, 107, 107, ${alpha})`);
    glowGradient.addColorStop(0.5, `rgba(255, 107, 107, ${alpha * 0.3})`);
    glowGradient.addColorStop(1, 'rgba(255, 107, 107, 0)');
    
    ctx.beginPath();
    ctx.arc(dust.x, dust.y, dust.size * 3, 0, Math.PI * 2);
    ctx.fillStyle = glowGradient;
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(dust.x, dust.y, dust.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 107, 107, ${alpha})`;
    ctx.fill();
    
    ctx.restore();
  }

  public handleClick(point: Point): boolean {
    for (const rune of this.runes) {
      const dist = this.distance(point, rune);
      if (dist < rune.diameter * rune.scale * 0.6) {
        this.createPulseWave(rune.x, rune.y);
        this.playArpeggioSound();
        
        gsap.to(rune, {
          scale: 1.5,
          duration: 0.1,
          yoyo: true,
          repeat: 1,
          ease: 'power2.out'
        });
        
        if (this.onRuneClick) {
          this.onRuneClick(rune.x, rune.y);
        }
        return true;
      }
    }
    return false;
  }

  private createPulseWave(x: number, y: number): void {
    this.pulseWaves.push({
      id: this.nextPulseId++,
      x,
      y,
      radius: 20,
      maxRadius: 100,
      width: 10,
      alpha: 1,
      color: '#82b1ff',
      active: true
    });
  }

  public createStarDustExplosion(
    x: number,
    y: number,
    particles: { angle: number; speed: number; distance: number }[]
  ): void {
    particles.forEach(p => {
      const vx = Math.cos(p.angle);
      const vy = Math.sin(p.angle);
      
      this.starDusts.push({
        id: this.nextDustId++,
        x,
        y,
        startX: x,
        startY: y,
        vx,
        vy,
        life: 600,
        maxLife: 600,
        color: '#ff6b6b',
        size: 2,
        targetDistance: p.distance
      });
    });
  }

  public playArpeggioSound(): void {
    if (!this.audioContext) return;
    
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      
      gain.gain.setValueAtTime(0, now + i * 0.05);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.3);
    });
  }

  public updateCenter(center: Point, cocoonRadius: number): void {
    this.center = center;
    this.cocoonRadius = cocoonRadius;
    
    this.runes.forEach((rune, i) => {
      const angle = (i / this.runes.length) * Math.PI * 2 - Math.PI / 2;
      rune.angle = angle;
      rune.baseX = center.x + Math.cos(angle) * cocoonRadius;
      rune.baseY = center.y + Math.sin(angle) * cocoonRadius;
    });
  }
}
