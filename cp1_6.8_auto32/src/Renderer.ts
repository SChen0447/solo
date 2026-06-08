import type { PlayerStateData, Particle } from './Player';
import type { Obstacle } from './ObstacleManager';
import type { AudioFeatures } from './AudioController';

export interface GameState {
  player: PlayerStateData;
  obstacles: Obstacle[];
  particles: Particle[];
  score: number;
  combo: number;
  isComboEffect: boolean;
  comboEffectTime: number;
  isHitFlash: boolean;
  hitFlashTime: number;
  groundY: number;
  gameTime: number;
  speed: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  private width: number;
  private height: number;
  
  private backgroundOffset: number = 0;
  private bgGradientHue: number = 240;
  private bgHueDirection: number = 1;
  
  private groundPulseTime: number = 0;
  private groundPulseSpeed: number = 3;

  private comboWaves: ComboWave[] = [];
  private lastCombo: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  render(state: GameState, deltaTime: number, audioFeatures: AudioFeatures): void {
    this.updateBackground(deltaTime);
    this.updateGroundPulse(deltaTime, audioFeatures);
    this.updateComboWaves(deltaTime);
    
    this.drawBackground();
    this.drawGround(state.groundY, audioFeatures);
    this.drawObstacles(state.obstacles, state.isHitFlash);
    this.drawPlayer(state.player);
    this.drawParticles(state.particles);
    this.drawComboWaves();
    
    if (state.isHitFlash) {
      this.drawHitFlash(state.hitFlashTime);
    }
  }

  private updateBackground(deltaTime: number): void {
    this.backgroundOffset += deltaTime * 20;
    if (this.backgroundOffset > 1000) {
      this.backgroundOffset -= 1000;
    }
    
    this.bgHueDirection = 260;
  }

  private updateGroundPulse(deltaTime: number, audioFeatures: AudioFeatures): void {
    const pulseIntensity = audioFeatures.volume * 2;
    this.groundPulseTime += deltaTime * (this.groundPulseSpeed + pulseIntensity * 5);
  }

  private updateComboWaves(deltaTime: number): void {
    for (let i = this.comboWaves.length - 1; i >= 0; i--) {
      const wave = this.comboWaves[i];
      wave.radius += deltaTime * 400;
      wave.opacity -= deltaTime * 0.8;
      
      if (wave.opacity <= 0) {
        this.comboWaves.splice(i, 1);
      }
    }
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    
    const t = (Math.sin(Date.now() * 0.0003) + 1) / 2;
    
    const r1 = Math.floor(26 + t * 30);
    const g1 = Math.floor(26 + t * 20);
    const b1 = Math.floor(62 + t * 20);
    
    const r2 = Math.floor(74 + t * 20);
    const g2 = Math.floor(42 + t * 20);
    const b2 = Math.floor(106 + t * 20);
    
    gradient.addColorStop(0, `rgb(${r1}, ${g1}, ${b1})`);
    gradient.addColorStop(1, `rgb(${r2}, ${g2}, ${b2})`);
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.drawStars();
  }

  private drawStars(): void {
    const starCount = 50;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    
    for (let i = 0; i < starCount; i++) {
      const x = (i * 137 + this.backgroundOffset * 0.1) % this.width;
      const y = (i * 73) % (this.height * 0.6);
      const size = (i % 3) * 0.5 + 0.5;
      const twinkle = Math.sin(Date.now() * 0.002 + i) * 0.3 + 0.7;
      
      this.ctx.globalAlpha = twinkle * 0.5;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }

  private drawGround(groundY: number, audioFeatures: AudioFeatures): void {
    const gradient = this.ctx.createLinearGradient(0, groundY, 0, this.height);
    gradient.addColorStop(0, 'rgba(100, 80, 140, 0.8)');
    gradient.addColorStop(1, 'rgba(50, 40, 80, 0.9)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, groundY, this.width, this.height - groundY);
    
    this.drawGroundLines(groundY, audioFeatures);
  }

  private drawGroundLines(groundY: number, audioFeatures: AudioFeatures): void {
    const lineCount = 20;
    const lineSpacing = this.width / lineCount;
    const volumeBoost = audioFeatures.volume * 10;
    
    this.ctx.strokeStyle = 'rgba(150, 120, 200, 0.6)';
    this.ctx.lineCap = 'round';
    
    for (let i = 0; i < lineCount + 2; i++) {
      const x = ((i * lineSpacing - (this.backgroundOffset % lineSpacing) + this.width + lineSpacing) % (this.width + lineSpacing)) - lineSpacing / 2;
      const pulse = Math.sin(this.groundPulseTime + i * 0.5) * 0.5 + 0.5;
      const lineWidth = 2 + pulse * 3 + volumeBoost;
      const height = 10 + pulse * 15 + volumeBoost * 2;
      
      this.ctx.lineWidth = lineWidth;
      this.ctx.globalAlpha = 0.3 + pulse * 0.4;
      this.ctx.beginPath();
      this.ctx.moveTo(x, groundY);
      this.ctx.lineTo(x, groundY + height);
      this.ctx.stroke();
    }
    
    this.ctx.globalAlpha = 1;
    
    this.ctx.strokeStyle = 'rgba(180, 150, 220, 0.8)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(0, groundY);
    this.ctx.lineTo(this.width, groundY);
    this.ctx.stroke();
  }

  private drawObstacles(obstacles: Obstacle[], isHitFlash: boolean): void {
    for (const obstacle of obstacles) {
      if (obstacle.type === 'spike') {
        this.drawSpike(obstacle, isHitFlash);
      } else {
        this.drawFlyingBoard(obstacle, isHitFlash);
      }
    }
  }

  private drawSpike(spike: Obstacle, isHitFlash: boolean): void {
    this.ctx.save();
    
    const baseColor = isHitFlash ? '#ff0000' : '#ff6b35';
    const glowColor = isHitFlash ? 'rgba(255, 0, 0, 0.5)' : 'rgba(255, 107, 53, 0.4)';
    
    this.ctx.shadowColor = glowColor;
    this.ctx.shadowBlur = 15;
    
    this.ctx.fillStyle = baseColor;
    this.ctx.beginPath();
    this.ctx.moveTo(spike.x + spike.width / 2, spike.y);
    this.ctx.lineTo(spike.x, spike.y + spike.height);
    this.ctx.lineTo(spike.x + spike.width, spike.y + spike.height);
    this.ctx.closePath();
    this.ctx.fill();
    
    const highlightGradient = this.ctx.createLinearGradient(
      spike.x, spike.y,
      spike.x + spike.width / 2, spike.y + spike.height
    );
    highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    this.ctx.fillStyle = highlightGradient;
    this.ctx.beginPath();
    this.ctx.moveTo(spike.x + spike.width / 2, spike.y);
    this.ctx.lineTo(spike.x, spike.y + spike.height);
    this.ctx.lineTo(spike.x + spike.width * 0.3, spike.y + spike.height);
    this.ctx.closePath();
    this.ctx.fill();
    
    this.ctx.restore();
  }

  private drawFlyingBoard(board: Obstacle, isHitFlash: boolean): void {
    this.ctx.save();
    
    const cx = board.x + board.width / 2;
    const cy = board.y + board.height / 2;
    
    this.ctx.translate(cx, cy);
    this.ctx.rotate(board.rotation);
    
    const baseColor = isHitFlash ? '#ff0000' : '#ff8c42';
    const glowColor = isHitFlash ? 'rgba(255, 0, 0, 0.5)' : 'rgba(255, 140, 66, 0.4)';
    
    this.ctx.shadowColor = glowColor;
    this.ctx.shadowBlur = 20;
    
    this.ctx.fillStyle = baseColor;
    this.ctx.beginPath();
    this.ctx.roundRect(-board.width / 2, -board.height / 2, board.width, board.height, 5);
    this.ctx.fill();
    
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.beginPath();
    this.ctx.roundRect(-board.width / 2 + 3, -board.height / 2 + 2, board.width - 6, board.height / 2 - 2, 3);
    this.ctx.fill();
    
    this.ctx.restore();
  }

  private drawPlayer(player: PlayerStateData): void {
    if (player.state === 'dead') return;
    
    this.ctx.save();
    
    const cx = player.x + player.width / 2;
    const cy = player.y + player.height / 2;
    
    this.ctx.translate(cx, cy);
    this.ctx.rotate(player.rotation);
    
    const scaleX = 1 + (player.bodySquash - 1) * 0.5;
    const scaleY = player.bodySquash;
    this.ctx.scale(scaleX, scaleY);
    
    const w = player.width;
    const h = player.height;
    
    this.ctx.shadowColor = 'rgba(255, 107, 107, 0.6)';
    this.ctx.shadowBlur = 20;
    
    this.ctx.fillStyle = '#ff6b6b';
    this.ctx.beginPath();
    this.ctx.roundRect(-w / 2, -h / 2, w, h, 10);
    this.ctx.fill();
    
    this.ctx.shadowBlur = 0;
    
    const eyeY = -h * 0.15;
    const eyeSpacing = w * 0.25;
    const eyeSize = (6 * player.eyeScale) / scaleY;
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(-eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
    this.ctx.arc(eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
    this.ctx.fill();
    
    const pupilSize = eyeSize * 0.5;
    this.ctx.fillStyle = '#2c2c54';
    this.ctx.beginPath();
    this.ctx.arc(-eyeSpacing + 1, eyeY, pupilSize, 0, Math.PI * 2);
    this.ctx.arc(eyeSpacing + 1, eyeY, pupilSize, 0, Math.PI * 2);
    this.ctx.fill();
    
    const mouthY = h * 0.2;
    
    if (player.state === 'jumping') {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.ellipse(0, mouthY, 5, 6, 0, 0, Math.PI * 2);
      this.ctx.fill();
    } else if (player.state === 'sliding') {
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(0, mouthY - 2, 4, 0.2 * Math.PI, 0.8 * Math.PI);
      this.ctx.stroke();
    } else {
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(0, mouthY, 5, 0.1 * Math.PI, 0.9 * Math.PI);
      this.ctx.stroke();
    }
    
    const cheekColor = 'rgba(255, 150, 150, 0.5)';
    this.ctx.fillStyle = cheekColor;
    this.ctx.beginPath();
    this.ctx.arc(-w * 0.3, h * 0.1, 4, 0, Math.PI * 2);
    this.ctx.arc(w * 0.3, h * 0.1, 4, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.restore();
  }

  private drawParticles(particles: Particle[]): void {
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }

  triggerComboEffect(comboCount: number): void {
    if (comboCount > 0 && comboCount % 10 === 0 && comboCount !== this.lastCombo) {
      this.comboWaves.push({
        x: this.width / 2,
        y: this.height / 2,
        radius: 0,
        opacity: 1,
        color: 'rgba(100, 200, 255, 0.8)'
      });
      this.lastCombo = comboCount;
    }
  }

  private drawComboWaves(): void {
    for (const wave of this.comboWaves) {
      this.ctx.save();
      this.ctx.globalAlpha = wave.opacity;
      this.ctx.strokeStyle = wave.color;
      this.ctx.lineWidth = 4;
      this.ctx.shadowColor = wave.color;
      this.ctx.shadowBlur = 20;
      
      this.ctx.beginPath();
      this.ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      this.ctx.stroke();
      
      this.ctx.lineWidth = 2;
      this.ctx.globalAlpha = wave.opacity * 0.5;
      this.ctx.beginPath();
      this.ctx.arc(wave.x, wave.y, wave.radius * 0.7, 0, Math.PI * 2);
      this.ctx.stroke();
      
      this.ctx.restore();
    }
  }

  private drawHitFlash(hitFlashTime: number): void {
    const flashAlpha = Math.sin(hitFlashTime * 20) * 0.3 + 0.3;
    this.ctx.fillStyle = `rgba(255, 0, 0, ${flashAlpha})`;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }
}

interface ComboWave {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  color: string;
}
