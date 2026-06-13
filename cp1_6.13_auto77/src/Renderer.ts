import { Bullet, Particle, Cloud, ChargedBeam, CONFIG, GameState } from './types';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private clouds: Cloud[] = [];
  private flashAlpha: number = 0;
  private flashDuration: number = 0;
  private victoryGlowRadius: number = 0;
  private victoryGlowDuration: number = 0;
  private defeatFade: number = 0;
  private titleFloatOffset: number = 0;
  private titleFloatTime: number = 0;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = width;
    this.height = height;
    this.initClouds();
  }

  private initClouds(): void {
    this.clouds = [
      { x: this.width * 0.1, y: this.height * 0.15, width: 120, height: 40, speed: 10, opacity: 0.5 },
      { x: this.width * 0.7, y: this.height * 0.25, width: 150, height: 50, speed: -10, opacity: 0.4 },
      { x: this.width * 0.3, y: this.height * 0.5, width: 100, height: 35, speed: 10, opacity: 0.3 },
    ];
  }

  public update(deltaTime: number, gameState: GameState): void {
    this.updateClouds(deltaTime);
    this.updateFlash(deltaTime);
    this.updateVictoryEffect(deltaTime, gameState);
    this.updateDefeatEffect(deltaTime, gameState);
    this.titleFloatTime += deltaTime;
    this.titleFloatOffset = Math.sin(this.titleFloatTime * 2) * 8;
  }

  private updateClouds(deltaTime: number): void {
    for (const cloud of this.clouds) {
      cloud.x += cloud.speed * deltaTime;
      if (cloud.speed > 0 && cloud.x > this.width + cloud.width) {
        cloud.x = -cloud.width;
      } else if (cloud.speed < 0 && cloud.x < -cloud.width) {
        cloud.x = this.width + cloud.width;
      }
    }
  }

  private updateFlash(deltaTime: number): void {
    if (this.flashDuration > 0) {
      this.flashDuration -= deltaTime * 1000;
      this.flashAlpha = Math.max(0, (this.flashDuration / 300) * 0.8);
    } else {
      this.flashAlpha = 0;
    }
  }

  private updateVictoryEffect(deltaTime: number, gameState: GameState): void {
    if (gameState.status === 'victory') {
      if (this.victoryGlowDuration < 1000) {
        this.victoryGlowDuration += deltaTime * 1000;
        const progress = this.victoryGlowDuration / 1000;
        this.victoryGlowRadius = Math.min(this.width, this.height) * progress;
      }
    }
  }

  private updateDefeatEffect(deltaTime: number, gameState: GameState): void {
    if (gameState.status === 'defeat') {
      this.defeatFade = Math.min(1, this.defeatFade + deltaTime * 2);
    }
  }

  public triggerFlash(): void {
    this.flashDuration = 300;
    this.flashAlpha = 0.8;
  }

  public render(
    playerX: number,
    playerY: number,
    playerWidth: number,
    playerHeight: number,
    playerHealth: number,
    isCharged: boolean,
    engineParticles: Particle[],
    shieldInfo: { x: number; y: number; radius: number; angle: number; active: boolean },
    crystalInfo: { x: number; y: number; diameter: number; pulsePhase: number; health: number },
    bullets: Bullet[],
    chargedBeam: ChargedBeam | null,
    particles: Particle[],
    gameState: GameState
  ): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.drawSky();
    this.drawClouds();
    this.drawArena();

    this.drawBullets(bullets);
    this.drawChargedBeam(chargedBeam);
    this.drawCrystal(crystalInfo);
    this.drawEngineParticles(engineParticles);
    this.drawPlayer(playerX, playerY, playerWidth, playerHeight, isCharged);
    this.drawShield(shieldInfo);
    this.drawParticles(particles);
    this.drawUI(playerHealth, crystalInfo.health, gameState.score);
    this.drawFlash();
    this.drawVictoryEffect();
    this.drawDefeatEffect();

    if (gameState.status === 'victory') {
      this.drawVictoryScreen();
    } else if (gameState.status === 'defeat') {
      this.drawDefeatScreen();
    }
  }

  private drawSky(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.5, '#B0E0E6');
    gradient.addColorStop(1, '#FFFFFF');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawClouds(): void {
    for (const cloud of this.clouds) {
      this.drawCloud(cloud);
    }
  }

  private drawCloud(cloud: Cloud): void {
    this.ctx.save();
    this.ctx.globalAlpha = cloud.opacity;
    this.ctx.fillStyle = '#FFFFFF';

    const cx = cloud.x + cloud.width / 2;
    const cy = cloud.y + cloud.height / 2;

    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy, cloud.width / 2, cloud.height / 2, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.ellipse(cx - cloud.width * 0.25, cy + cloud.height * 0.1, cloud.width * 0.3, cloud.height * 0.4, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.ellipse(cx + cloud.width * 0.25, cy + cloud.height * 0.05, cloud.width * 0.25, cloud.height * 0.35, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawArena(): void {
    const arenaWidth = this.width * CONFIG.ARENA_WIDTH_RATIO;
    const arenaHeight = this.height * CONFIG.ARENA_HEIGHT_RATIO;
    const arenaX = (this.width - arenaWidth) / 2;
    const arenaY = this.height * CONFIG.ARENA_POSITION_RATIO;

    this.ctx.save();

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.strokeStyle = '#FFD700';
    this.ctx.lineWidth = 3;

    this.ctx.beginPath();
    this.ctx.roundRect(arenaX, arenaY, arenaWidth, arenaHeight, 8);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    this.ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const x = arenaX + (arenaWidth / 5) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(x, arenaY + 5);
      this.ctx.lineTo(x, arenaY + arenaHeight - 5);
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawPlayer(x: number, y: number, width: number, height: number, isCharged: boolean): void {
    this.ctx.save();
    this.ctx.translate(x, y);

    const bodyGradient = this.ctx.createLinearGradient(0, -height / 2, 0, height / 2);
    bodyGradient.addColorStop(0, '#2d5a8a');
    bodyGradient.addColorStop(0.5, '#1e3a5f');
    bodyGradient.addColorStop(1, '#152a42');

    this.ctx.fillStyle = bodyGradient;
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#3d7ab8';
    this.ctx.beginPath();
    this.ctx.ellipse(0, -height * 0.1, width * 0.4, height * 0.3, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#1e3a5f';
    this.ctx.beginPath();
    this.ctx.moveTo(-width * 0.3, -height * 0.3);
    this.ctx.lineTo(-width * 0.5, -height * 0.6);
    this.ctx.lineTo(-width * 0.1, -height * 0.3);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(-width * 0.3, height * 0.3);
    this.ctx.lineTo(-width * 0.5, height * 0.6);
    this.ctx.lineTo(-width * 0.1, height * 0.3);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = '#1e3a5f';
    this.ctx.beginPath();
    this.ctx.moveTo(width * 0.3, -height * 0.25);
    this.ctx.lineTo(width * 0.5, -height * 0.45);
    this.ctx.lineTo(width * 0.45, -height * 0.2);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(width * 0.3, height * 0.25);
    this.ctx.lineTo(width * 0.5, height * 0.45);
    this.ctx.lineTo(width * 0.45, height * 0.2);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(135, 206, 235, 0.8)';
    for (let i = 0; i < 3; i++) {
      const cx = -width * 0.15 + i * width * 0.15;
      this.ctx.beginPath();
      this.ctx.arc(cx, -height * 0.05, height * 0.1, 0, Math.PI * 2);
      this.ctx.fill();
    }

    if (isCharged) {
      this.ctx.shadowColor = '#4A90D9';
      this.ctx.shadowBlur = 15;
      this.ctx.strokeStyle = '#4A90D9';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, width / 2 + 3, height / 2 + 3, 0, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    }

    this.ctx.restore();
  }

  private drawEngineParticles(particles: Particle[]): void {
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawShield(info: { x: number; y: number; radius: number; angle: number; active: boolean }): void {
    if (!info.active) return;

    this.ctx.save();
    this.ctx.translate(info.x, info.y);
    this.ctx.rotate(info.angle);

    this.ctx.beginPath();
    this.ctx.arc(0, 0, info.radius, -Math.PI / 2, Math.PI / 2);

    const gradient = this.ctx.createRadialGradient(0, 0, info.radius * 0.8, 0, 0, info.radius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.6)');

    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    this.ctx.strokeStyle = '#FFD700';
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = '#FFD700';
    this.ctx.shadowBlur = 8;
    this.ctx.stroke();

    this.ctx.shadowBlur = 0;
    this.ctx.restore();
  }

  private drawCrystal(info: { x: number; y: number; diameter: number; pulsePhase: number; health: number }): void {
    this.ctx.save();
    this.ctx.translate(info.x, info.y);

    const pulseScale = 1 + Math.sin(info.pulsePhase) * 0.05;
    const radius = (info.diameter / 2) * pulseScale;

    this.ctx.shadowColor = '#FFD700';
    this.ctx.shadowBlur = 20 + Math.sin(info.pulsePhase) * 10;

    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    gradient.addColorStop(0, '#FFFACD');
    gradient.addColorStop(0.3, '#FFD700');
    gradient.addColorStop(0.7, '#FFA500');
    gradient.addColorStop(1, '#FF8C00');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.drawHexagon(0, 0, radius);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.drawHexagon(0, 0, radius * 0.6);
    this.ctx.stroke();

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -radius * 0.6);
    this.ctx.lineTo(0, radius * 0.6);
    this.ctx.moveTo(-radius * 0.5, -radius * 0.3);
    this.ctx.lineTo(radius * 0.5, radius * 0.3);
    this.ctx.moveTo(radius * 0.5, -radius * 0.3);
    this.ctx.lineTo(-radius * 0.5, radius * 0.3);
    this.ctx.stroke();

    this.ctx.shadowBlur = 0;
    this.ctx.restore();
  }

  private drawHexagon(x: number, y: number, radius: number): void {
    this.ctx.moveTo(x + radius, y);
    for (let i = 1; i <= 6; i++) {
      const angle = (i * Math.PI) / 3;
      this.ctx.lineTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
    }
    this.ctx.closePath();
  }

  private drawBullets(bullets: Bullet[]): void {
    for (const bullet of bullets) {
      this.drawBulletTrail(bullet);

      this.ctx.save();
      if (bullet.isReflected) {
        this.ctx.shadowColor = '#FF4444';
        this.ctx.fillStyle = '#FF6666';
      } else {
        this.ctx.shadowColor = '#FFD700';
        this.ctx.fillStyle = '#FFEB3B';
      }
      this.ctx.shadowBlur = 10;

      this.ctx.beginPath();
      this.ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(bullet.x - bullet.radius * 0.3, bullet.y - bullet.radius * 0.3, bullet.radius * 0.3, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    }
  }

  private drawBulletTrail(bullet: Bullet): void {
    if (bullet.trail.length < 2) return;

    this.ctx.save();
    for (let i = 1; i < bullet.trail.length; i++) {
      const alpha = (i / bullet.trail.length) * 0.6;
      const size = (i / bullet.trail.length) * bullet.radius * 0.8;

      this.ctx.globalAlpha = alpha;
      if (bullet.isReflected) {
        this.ctx.fillStyle = '#FF4444';
      } else {
        this.ctx.fillStyle = '#FFD700';
      }

      this.ctx.beginPath();
      this.ctx.arc(bullet.trail[i].x, bullet.trail[i].y, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  private drawChargedBeam(beam: ChargedBeam | null): void {
    if (!beam || !beam.active) return;

    this.ctx.save();

    this.ctx.shadowColor = '#4A90D9';
    this.ctx.shadowBlur = 15;

    const gradient = this.ctx.createLinearGradient(beam.x - 100, 0, beam.x, 0);
    gradient.addColorStop(0, 'rgba(74, 144, 217, 0)');
    gradient.addColorStop(0.5, 'rgba(135, 206, 235, 0.8)');
    gradient.addColorStop(1, '#FFFFFF');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(beam.x - 100, beam.y - beam.width / 2, 100, beam.width);

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.shadowBlur = 20;
    this.ctx.fillRect(beam.x - 5, beam.y - beam.width / 2 - 1, 5, beam.width + 2);

    this.ctx.restore();
  }

  private drawParticles(particles: Particle[]): void {
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;

      if (p.shape === 'circle') {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.life * 10);
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        this.ctx.restore();
      }

      this.ctx.restore();
    }
  }

  private drawUI(playerHealth: number, crystalHealth: number, score: number): void {
    this.ctx.save();

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.fillRect(10, 10, 180, 70);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.strokeRect(10, 10, 180, 70);

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '16px sans-serif';
    this.ctx.textBaseline = 'top';

    this.ctx.fillText('玩家生命: ', 20, 20);
    for (let i = 0; i < CONFIG.PLAYER_MAX_HEALTH; i++) {
      if (i < playerHealth) {
        this.ctx.fillStyle = '#4CAF50';
      } else {
        this.ctx.fillStyle = '#666666';
      }
      this.ctx.fillRect(100 + i * 22, 22, 18, 14);
    }

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText(`得分: ${score}`, 20, 48);

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.fillRect(this.width - 190, 10, 180, 50);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.strokeRect(this.width - 190, 10, 180, 50);

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText('水晶生命: ', this.width - 180, 20);
    for (let i = 0; i < CONFIG.CRYSTAL_MAX_HEALTH; i++) {
      if (i < crystalHealth) {
        this.ctx.fillStyle = '#FFD700';
      } else {
        this.ctx.fillStyle = '#666666';
      }
      this.ctx.beginPath();
      this.drawHexagon(this.width - 100 + i * 22, 29, 8);
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private drawFlash(): void {
    if (this.flashAlpha <= 0) return;

    this.ctx.save();
    this.ctx.globalAlpha = this.flashAlpha;
    this.ctx.fillStyle = '#FF0000';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.restore();
  }

  private drawVictoryEffect(): void {
    if (this.victoryGlowRadius <= 0) return;

    this.ctx.save();
    const gradient = this.ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, this.victoryGlowRadius
    );
    gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
    gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.restore();
  }

  private drawDefeatEffect(): void {
    if (this.defeatFade <= 0) return;

    this.ctx.save();
    this.ctx.globalAlpha = this.defeatFade * 0.6;
    this.ctx.fillStyle = '#8B0000';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.restore();
  }

  private drawVictoryScreen(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2 + this.titleFloatOffset;

    this.ctx.save();

    this.ctx.shadowColor = '#FFD700';
    this.ctx.shadowBlur = 20;
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 48px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('胜利', centerX, centerY - 30);

    this.ctx.shadowBlur = 0;
    this.ctx.font = '20px sans-serif';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText('恭喜你摧毁了敌方水晶！', centerX, centerY + 20);

    const buttonX = centerX - 80;
    const buttonY = centerY + 70;
    const buttonW = 160;
    const buttonH = 45;

    this.ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
    this.ctx.strokeStyle = '#FFD700';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.roundRect(buttonX, buttonY, buttonW, buttonH, 8);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#1e3a5f';
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.fillText('重新开始', centerX, buttonY + buttonH / 2);

    this.ctx.restore();
  }

  private drawDefeatScreen(): void {
    const centerX = this.width / 2;
    const centerY = this.height / 2 + this.titleFloatOffset;

    this.ctx.save();

    this.ctx.shadowColor = '#FF0000';
    this.ctx.shadowBlur = 15;
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 48px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('失败', centerX, centerY - 30);

    this.ctx.shadowBlur = 0;
    this.ctx.font = '20px sans-serif';
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText('你的飞艇被击毁了...', centerX, centerY + 20);

    const buttonX = centerX - 80;
    const buttonY = centerY + 70;
    const buttonW = 160;
    const buttonH = 45;

    this.ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
    this.ctx.strokeStyle = '#FF6666';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.roundRect(buttonX, buttonY, buttonW, buttonH, 8);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 18px sans-serif';
    this.ctx.fillText('重新开始', centerX, buttonY + buttonH / 2);

    this.ctx.restore();
  }

  public isRestartButtonClicked(mouseX: number, mouseY: number, gameState: GameState): boolean {
    if (gameState.status !== 'victory' && gameState.status !== 'defeat') return false;

    const centerX = this.width / 2;
    const centerY = this.height / 2 + this.titleFloatOffset;
    const buttonX = centerX - 80;
    const buttonY = centerY + 70;
    const buttonW = 160;
    const buttonH = 45;

    return mouseX >= buttonX && mouseX <= buttonX + buttonW &&
           mouseY >= buttonY && mouseY <= buttonY + buttonH;
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.initClouds();
  }
}
