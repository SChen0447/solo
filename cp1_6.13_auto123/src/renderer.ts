import {
  GameState,
  Ship,
  Asteroid,
  CrystalFragment,
  BlackHole,
  Particle,
  Star,
  Vector2,
  UpgradeType,
  AsteroidType
} from './entities';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private dpr: number;
  private time: number = 0;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.dpr = window.devicePixelRatio || 1;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.dpr = window.devicePixelRatio || 1;
  }

  render(
    gameState: GameState,
    ship: Ship,
    asteroids: Asteroid[],
    fragments: CrystalFragment[],
    blackHoles: BlackHole[],
    particles: Particle[],
    stars: Star[],
    cutLine: Vector2[],
    isDragging: boolean
  ): { pulseButtonRect: any; upgradePanelRect: any; restartButtonRect: any } {
    this.time += 0.016;
    
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    this.drawBackground();
    this.drawStars(stars);
    this.drawBlackHoles(blackHoles);
    this.drawAsteroids(asteroids);
    this.drawCrystalFragments(fragments);
    this.drawShip(ship);
    this.drawCutLine(cutLine, isDragging);
    this.drawParticles(particles);
    
    const uiRects = this.drawUI(gameState, ship);
    
    if (gameState.damageFlashTimer > 0) {
      this.drawDamageFlash(gameState.damageFlashTimer);
    }
    
    return uiRects;
  }

  private drawBackground(): void {
    const gradient = this.ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.7
    );
    gradient.addColorStop(0, '#0f1535');
    gradient.addColorStop(1, '#0a0e27');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawStars(stars: Star[]): void {
    stars.forEach(star => {
      star.update(this.time);
      
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size * this.dpr, 0, Math.PI * 2);
      
      const alpha = star.brightness;
      this.ctx.fillStyle = star.baseColor;
      this.ctx.globalAlpha = alpha;
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    });
  }

  private drawShip(ship: Ship): void {
    if (ship.isFlashing()) return;
    
    this.ctx.save();
    this.ctx.translate(ship.x, ship.y);
    
    this.drawBeam(ship);
    this.drawShipBody(ship);
    this.drawEngineFlame(ship);
    
    this.ctx.restore();
  }

  private drawBeam(ship: Ship): void {
    const beamLength = 100 * this.dpr;
    const beamAngle = ship.beamAngle;
    const spreadAngle = Math.PI / 6;
    
    this.ctx.save();
    
    const gradient = this.ctx.createLinearGradient(0, 0, 
      Math.cos(beamAngle) * beamLength, 
      Math.sin(beamAngle) * beamLength
    );
    gradient.addColorStop(0, 'rgba(255, 220, 100, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 220, 100, 0)');
    
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.arc(0, 0, beamLength, beamAngle - spreadAngle / 2, beamAngle + spreadAngle / 2);
    this.ctx.closePath();
    
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
    
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(
      Math.cos(beamAngle) * beamLength * 0.8,
      Math.sin(beamAngle) * beamLength * 0.8
    );
    this.ctx.strokeStyle = 'rgba(255, 255, 200, 0.9)';
    this.ctx.lineWidth = 2 * this.dpr;
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  private drawShipBody(ship: Ship): void {
    this.ctx.save();
    
    const bodyGradient = this.ctx.createLinearGradient(-30 * this.dpr, 0, 30 * this.dpr, 0);
    bodyGradient.addColorStop(0, '#8b94a8');
    bodyGradient.addColorStop(0.5, '#c0c8d4');
    bodyGradient.addColorStop(1, '#8b94a8');
    
    this.ctx.beginPath();
    this.ctx.moveTo(30 * this.dpr, 0);
    this.ctx.lineTo(15 * this.dpr, -15 * this.dpr);
    this.ctx.lineTo(-25 * this.dpr, -20 * this.dpr);
    this.ctx.lineTo(-30 * this.dpr, -10 * this.dpr);
    this.ctx.lineTo(-30 * this.dpr, 10 * this.dpr);
    this.ctx.lineTo(-25 * this.dpr, 20 * this.dpr);
    this.ctx.lineTo(15 * this.dpr, 15 * this.dpr);
    this.ctx.closePath();
    
    this.ctx.fillStyle = bodyGradient;
    this.ctx.fill();
    
    this.ctx.strokeStyle = '#e0e8f4';
    this.ctx.lineWidth = 2 * this.dpr;
    this.ctx.stroke();
    
    this.ctx.beginPath();
    this.ctx.ellipse(10 * this.dpr, 0, 12 * this.dpr, 8 * this.dpr, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = '#5fa8e8';
    this.ctx.fill();
    this.ctx.strokeStyle = '#88c8ff';
    this.ctx.lineWidth = 1 * this.dpr;
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  private drawEngineFlame(ship: Ship): void {
    const isBoosted = ship.speedMultiplier > 1;
    const flameIntensity = isBoosted ? 1.5 : 1;
    const flameLength = (15 + Math.sin(this.time * 20) * 5) * flameIntensity * this.dpr;
    
    this.ctx.save();
    
    const gradient = this.ctx.createLinearGradient(-30 * this.dpr, 0, -30 * this.dpr - flameLength, 0);
    gradient.addColorStop(0, isBoosted ? '#00aaff' : '#ffaa00');
    gradient.addColorStop(0.5, isBoosted ? '#0066cc' : '#ff6600');
    gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
    
    this.ctx.beginPath();
    this.ctx.moveTo(-30 * this.dpr, -8 * this.dpr);
    this.ctx.lineTo(-30 * this.dpr - flameLength, 0);
    this.ctx.lineTo(-30 * this.dpr, 8 * this.dpr);
    this.ctx.closePath();
    
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
    
    this.ctx.restore();
  }

  private drawAsteroids(asteroids: Asteroid[]): void {
    asteroids.forEach(asteroid => {
      if (!asteroid.active) return;
      
      this.ctx.save();
      this.ctx.translate(asteroid.x, asteroid.y);
      this.ctx.rotate(asteroid.rotation);
      
      if (asteroid.type !== AsteroidType.NORMAL) {
        this.ctx.shadowColor = asteroid.glowColor;
        this.ctx.shadowBlur = 15 * this.dpr;
      }
      
      this.ctx.beginPath();
      asteroid.vertices.forEach((vertex, index) => {
        const x = vertex.x * this.dpr;
        const y = vertex.y * this.dpr;
        if (index === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      });
      this.ctx.closePath();
      
      const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, asteroid.size / 2 * this.dpr);
      gradient.addColorStop(0, this.lightenColor(asteroid.color, 30));
      gradient.addColorStop(1, asteroid.color);
      
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
      
      this.ctx.strokeStyle = this.darkenColor(asteroid.color, 20);
      this.ctx.lineWidth = 2 * this.dpr;
      this.ctx.stroke();
      
      this.ctx.shadowBlur = 0;
      
      if (asteroid.type === AsteroidType.BLUE && asteroid.hitCount > 0) {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, asteroid.size / 3 * this.dpr, 0, Math.PI * 2 * (asteroid.hitCount / asteroid.health));
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 3 * this.dpr;
        this.ctx.stroke();
      }
      
      if (asteroid.isBeingCut && asteroid.cutLine.length > 1) {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.lineWidth = 2 * this.dpr;
        this.ctx.setLineDash([5 * this.dpr, 5 * this.dpr]);
        this.ctx.beginPath();
        asteroid.cutLine.forEach((point, index) => {
          const localX = (point.x - asteroid.x) * this.dpr;
          const localY = (point.y - asteroid.y) * this.dpr;
          const rotatedX = localX * Math.cos(-asteroid.rotation) - localY * Math.sin(-asteroid.rotation);
          const rotatedY = localX * Math.sin(-asteroid.rotation) + localY * Math.cos(-asteroid.rotation);
          
          if (index === 0) {
            this.ctx.moveTo(rotatedX, rotatedY);
          } else {
            this.ctx.lineTo(rotatedX, rotatedY);
          }
        });
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }
      
      this.ctx.restore();
    });
  }

  private drawCrystalFragments(fragments: CrystalFragment[]): void {
    fragments.forEach(fragment => {
      if (!fragment.active) return;
      
      this.ctx.save();
      this.ctx.translate(fragment.x, fragment.y);
      this.ctx.rotate(fragment.rotation);
      
      const alpha = Math.min(1, fragment.lifetime / 2);
      this.ctx.globalAlpha = alpha;
      
      this.ctx.shadowColor = fragment.getGlowColor();
      this.ctx.shadowBlur = (10 + fragment.glowIntensity * 10) * this.dpr;
      
      const size = fragment.width / 2 * this.dpr;
      this.ctx.beginPath();
      this.ctx.moveTo(0, -size);
      this.ctx.lineTo(size * 0.7, 0);
      this.ctx.lineTo(0, size);
      this.ctx.lineTo(-size * 0.7, 0);
      this.ctx.closePath();
      
      this.ctx.fillStyle = fragment.getColor();
      this.ctx.fill();
      
      this.ctx.strokeStyle = fragment.getGlowColor();
      this.ctx.lineWidth = 2 * this.dpr;
      this.ctx.stroke();
      
      this.ctx.restore();
    });
  }

  private drawBlackHoles(blackHoles: BlackHole[]): void {
    blackHoles.forEach(blackHole => {
      if (!blackHole.active) return;
      
      this.ctx.save();
      this.ctx.translate(blackHole.x, blackHole.y);
      
      const currentRadius = blackHole.getCurrentRadius() * this.dpr;
      const gravityRadius = blackHole.getGravityRadius() * this.dpr;
      
      if (gravityRadius > 0) {
        const gravityGradient = this.ctx.createRadialGradient(0, 0, currentRadius, 0, 0, gravityRadius);
        gravityGradient.addColorStop(0, 'rgba(123, 45, 142, 0.3)');
        gravityGradient.addColorStop(1, 'rgba(123, 45, 142, 0)');
        
        this.ctx.beginPath();
        this.ctx.arc(0, 0, gravityRadius, 0, Math.PI * 2);
        this.ctx.fillStyle = gravityGradient;
        this.ctx.fill();
      }
      
      for (let i = 0; i < 5; i++) {
        this.ctx.save();
        this.ctx.rotate(blackHole.rotationAngle + (i / 5) * Math.PI * 2);
        
        const ringGradient = this.ctx.createLinearGradient(-currentRadius * 2, 0, currentRadius * 2, 0);
        ringGradient.addColorStop(0, 'rgba(150, 60, 180, 0)');
        ringGradient.addColorStop(0.3, 'rgba(150, 60, 180, 0.4)');
        ringGradient.addColorStop(0.5, 'rgba(200, 100, 220, 0.6)');
        ringGradient.addColorStop(0.7, 'rgba(150, 60, 180, 0.4)');
        ringGradient.addColorStop(1, 'rgba(150, 60, 180, 0)');
        
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, currentRadius * 1.8, currentRadius * 0.3, 0, 0, Math.PI * 2);
        this.ctx.fillStyle = ringGradient;
        this.ctx.fill();
        
        this.ctx.restore();
      }
      
      const coreGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, currentRadius);
      coreGradient.addColorStop(0, '#1a0a20');
      coreGradient.addColorStop(0.7, '#3d1a50');
      coreGradient.addColorStop(1, '#5a2a70');
      
      this.ctx.beginPath();
      this.ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = coreGradient;
      this.ctx.fill();
      
      this.ctx.strokeStyle = '#a050c0';
      this.ctx.lineWidth = 3 * this.dpr;
      this.ctx.stroke();
      
      this.ctx.restore();
    });
  }

  private drawCutLine(cutLine: Vector2[], isDragging: boolean): void {
    if (!isDragging || cutLine.length < 2) return;
    
    this.ctx.save();
    
    this.ctx.shadowColor = '#ff4444';
    this.ctx.shadowBlur = 10 * this.dpr;
    
    this.ctx.beginPath();
    this.ctx.strokeStyle = '#ff4444';
    this.ctx.lineWidth = 3 * this.dpr;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    cutLine.forEach((point, index) => {
      if (index === 0) {
        this.ctx.moveTo(point.x, point.y);
      } else {
        this.ctx.lineTo(point.x, point.y);
      }
    });
    
    this.ctx.stroke();
    
    cutLine.forEach((point, index) => {
      if (index % 5 === 0) {
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, 4 * this.dpr, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ff6666';
        this.ctx.fill();
      }
    });
    
    this.ctx.restore();
  }

  private drawParticles(particles: Particle[]): void {
    particles.forEach(particle => {
      if (!particle.active) return;
      
      this.ctx.save();
      this.ctx.globalAlpha = particle.getAlpha();
      
      this.ctx.shadowColor = particle.color;
      this.ctx.shadowBlur = 5 * this.dpr;
      
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.getCurrentSize() * this.dpr, 0, Math.PI * 2);
      this.ctx.fillStyle = particle.color;
      this.ctx.fill();
      
      this.ctx.restore();
    });
  }

  private drawUI(gameState: GameState, ship: Ship): { 
    pulseButtonRect: any; 
    upgradePanelRect: any; 
    restartButtonRect: any 
  } {
    const pulseButtonRect = this.drawPulseButton(gameState);
    const upgradePanelRect = this.drawUpgradePanel(gameState);
    const restartButtonRect = this.drawGameOverPanel(gameState);
    
    this.drawScore(gameState);
    this.drawHealthBar(ship, gameState);
    this.drawTimer(gameState);
    this.drawSpeedLevel(ship);
    
    if (gameState.upgradePanelActive) {
      this.drawUpgradeOptions(gameState);
    }
    
    return { pulseButtonRect, upgradePanelRect, restartButtonRect };
  }

  private drawScore(gameState: GameState): void {
    const x = 30 * this.dpr;
    const y = 40 * this.dpr;
    
    this.ctx.save();
    
    this.ctx.shadowColor = '#c0c8d4';
    this.ctx.shadowBlur = 10 * this.dpr;
    
    this.ctx.font = `${24 * this.dpr}px 'Press Start 2P', monospace`;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(`分数: ${gameState.score}`, x, y);
    
    this.ctx.restore();
  }

  private drawHealthBar(ship: Ship, gameState: GameState): void {
    const x = 30 * this.dpr;
    const y = 80 * this.dpr;
    const width = 120 * this.dpr;
    const height = 8 * this.dpr;
    
    this.ctx.save();
    
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(x, y, width, height);
    
    const healthPercent = ship.health / ship.maxHealth;
    const healthWidth = width * healthPercent;
    
    const gradient = this.ctx.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, '#44ff44');
    gradient.addColorStop(0.5, '#ffff44');
    gradient.addColorStop(1, '#ff4444');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(x, y, healthWidth, height);
    
    this.ctx.strokeStyle = '#c0c8d4';
    this.ctx.lineWidth = 2 * this.dpr;
    this.ctx.strokeRect(x, y, width, height);
    
    this.ctx.font = `${10 * this.dpr}px 'Press Start 2P', monospace`;
    this.ctx.fillStyle = '#ffff00';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`生命: ${ship.health}/${ship.maxHealth}`, x, y + height + 15 * this.dpr);
    
    this.ctx.restore();
  }

  private drawTimer(gameState: GameState): void {
    const x = this.width - 80 * this.dpr;
    const y = 60 * this.dpr;
    const radius = 50 * this.dpr;
    
    const minutes = Math.floor(gameState.timeRemaining / 60);
    const seconds = Math.floor(gameState.timeRemaining % 60);
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    const percent = gameState.timeRemaining / 120;
    
    this.ctx.save();
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * percent);
    
    const gradient = this.ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
    gradient.addColorStop(0, '#44ff44');
    gradient.addColorStop(0.5, '#ffff44');
    gradient.addColorStop(1, '#ff4444');
    
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = 6 * this.dpr;
    this.ctx.stroke();
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = '#333355';
    this.ctx.lineWidth = 2 * this.dpr;
    this.ctx.stroke();
    
    this.ctx.shadowColor = '#c0c8d4';
    this.ctx.shadowBlur = 10 * this.dpr;
    
    this.ctx.font = `${16 * this.dpr}px 'Press Start 2P', monospace`;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(timeString, x, y);
    
    this.ctx.restore();
  }

  private drawSpeedLevel(ship: Ship): void {
    const x = this.width / 2;
    const y = this.height - 40 * this.dpr;
    const level = ship.getSpeedLevel();
    const levelString = ['I', 'II', 'III'][Math.min(level - 1, 2)];
    
    this.ctx.save();
    
    const flashAlpha = 0.5 + Math.sin(this.time * 5) * 0.5;
    
    this.ctx.shadowColor = '#00aaff';
    this.ctx.shadowBlur = 15 * this.dpr;
    this.ctx.globalAlpha = flashAlpha;
    
    this.ctx.font = `${14 * this.dpr}px 'Press Start 2P', monospace`;
    this.ctx.fillStyle = '#00ddff';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(`速度等级 ${levelString}`, x, y);
    
    this.ctx.restore();
  }

  private drawPulseButton(gameState: GameState): any {
    const x = this.width - 80 * this.dpr;
    const y = this.height - 80 * this.dpr;
    const size = 50 * this.dpr;
    const isOnCooldown = gameState.pulseCooldown > 0;
    
    this.ctx.save();
    
    const floatOffset = Math.sin(this.time * 2) * 3 * this.dpr;
    
    this.ctx.shadowColor = isOnCooldown ? '#666666' : '#ff4444';
    this.ctx.shadowBlur = isOnCooldown ? 5 * this.dpr : 20 * this.dpr;
    
    this.ctx.beginPath();
    this.ctx.arc(x, y + floatOffset, size / 2, 0, Math.PI * 2);
    
    const gradient = this.ctx.createRadialGradient(x, y + floatOffset, 0, x, y + floatOffset, size / 2);
    if (isOnCooldown) {
      gradient.addColorStop(0, '#444444');
      gradient.addColorStop(1, '#222222');
    } else {
      gradient.addColorStop(0, '#ff6666');
      gradient.addColorStop(1, '#cc2222');
    }
    
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
    
    this.ctx.strokeStyle = isOnCooldown ? '#555555' : '#ff8888';
    this.ctx.lineWidth = 3 * this.dpr;
    this.ctx.stroke();
    
    this.ctx.beginPath();
    this.ctx.moveTo(x - 10 * this.dpr, y + floatOffset - 12 * this.dpr);
    this.ctx.lineTo(x + 5 * this.dpr, y + floatOffset - 2 * this.dpr);
    this.ctx.lineTo(x, y + floatOffset - 2 * this.dpr);
    this.ctx.lineTo(x + 10 * this.dpr, y + floatOffset + 12 * this.dpr);
    this.ctx.lineTo(x - 5 * this.dpr, y + floatOffset + 2 * this.dpr);
    this.ctx.lineTo(x, y + floatOffset + 2 * this.dpr);
    this.ctx.closePath();
    
    this.ctx.fillStyle = isOnCooldown ? '#666666' : '#ffff00';
    this.ctx.fill();
    
    if (isOnCooldown) {
      const cooldownPercent = gameState.pulseCooldown / gameState.pulseCooldownMax;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y + floatOffset, size / 2 + 5 * this.dpr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - cooldownPercent));
      this.ctx.strokeStyle = '#4488ff';
      this.ctx.lineWidth = 3 * this.dpr;
      this.ctx.stroke();
      
      this.ctx.font = `${8 * this.dpr}px 'Press Start 2P', monospace`;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(`${Math.ceil(gameState.pulseCooldown)}s`, x, y + floatOffset + size / 2 + 15 * this.dpr);
    }
    
    this.ctx.restore();
    
    return { 
      x: x - size / 2, 
      y: y + floatOffset - size / 2, 
      width: size, 
      height: size 
    };
  }

  private drawUpgradePanel(gameState: GameState): any {
    if (!gameState.upgradePanelActive) return { x: 0, y: 0, width: 0, height: 0 };
    
    const panelWidth = 450 * this.dpr;
    const panelHeight = 180 * this.dpr;
    const x = (this.width - panelWidth) / 2;
    const y = 60 * this.dpr;
    
    this.ctx.save();
    
    this.ctx.fillStyle = 'rgba(10, 14, 39, 0.9)';
    this.ctx.fillRect(x, y, panelWidth, panelHeight);
    
    this.ctx.strokeStyle = '#7b2d8e';
    this.ctx.lineWidth = 3 * this.dpr;
    this.ctx.strokeRect(x, y, panelWidth, panelHeight);
    
    this.ctx.shadowColor = '#7b2d8e';
    this.ctx.shadowBlur = 10 * this.dpr;
    
    this.ctx.font = `${14 * this.dpr}px 'Press Start 2P', monospace`;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText('选择升级', this.width / 2, y + 15 * this.dpr);
    
    const timerPercent = gameState.upgradePanelTimer / 5;
    this.ctx.fillStyle = '#7b2d8e';
    this.ctx.fillRect(x, y + panelHeight - 8 * this.dpr, panelWidth * timerPercent, 8 * this.dpr);
    
    this.ctx.restore();
    
    return { x, y, width: panelWidth, height: panelHeight };
  }

  private drawUpgradeOptions(gameState: GameState): void {
    const panelWidth = 450 * this.dpr;
    const panelHeight = 180 * this.dpr;
    const x = (this.width - panelWidth) / 2;
    const y = 60 * this.dpr;
    const optionWidth = panelWidth / 2 - 30 * this.dpr;
    const optionHeight = panelHeight - 60 * this.dpr;
    
    const options = gameState.upgradeOptions;
    
    options.forEach((option, index) => {
      const optionX = x + 20 * this.dpr + index * (optionWidth + 20 * this.dpr);
      const optionY = y + 45 * this.dpr;
      
      this.ctx.save();
      
      this.ctx.shadowColor = option === UpgradeType.SHIELD ? '#44ff44' : '#4488ff';
      this.ctx.shadowBlur = 15 * this.dpr;
      
      this.ctx.fillStyle = 'rgba(20, 25, 50, 0.95)';
      this.ctx.fillRect(optionX, optionY, optionWidth, optionHeight);
      
      this.ctx.strokeStyle = option === UpgradeType.SHIELD ? '#44ff44' : '#4488ff';
      this.ctx.lineWidth = 2 * this.dpr;
      this.ctx.strokeRect(optionX, optionY, optionWidth, optionHeight);
      
      this.ctx.font = `${10 * this.dpr}px 'Press Start 2P', monospace`;
      this.ctx.fillStyle = '#ffffff';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      
      if (option === UpgradeType.SHIELD) {
        this.ctx.fillText('加固护盾', optionX + optionWidth / 2, optionY + 15 * this.dpr);
        this.ctx.font = `${8 * this.dpr}px 'Press Start 2P', monospace`;
        this.ctx.fillStyle = '#aaaaaa';
        this.ctx.fillText('生命上限+1', optionX + optionWidth / 2, optionY + 40 * this.dpr);
        this.ctx.fillText('回满生命', optionX + optionWidth / 2, optionY + 55 * this.dpr);
      } else {
        this.ctx.fillText('加速引擎', optionX + optionWidth / 2, optionY + 15 * this.dpr);
        this.ctx.font = `${8 * this.dpr}px 'Press Start 2P', monospace`;
        this.ctx.fillStyle = '#aaaaaa';
        this.ctx.fillText('速度+20%', optionX + optionWidth / 2, optionY + 40 * this.dpr);
        this.ctx.fillText('持续15秒', optionX + optionWidth / 2, optionY + 55 * this.dpr);
      }
      
      this.ctx.restore();
    });
  }

  private drawGameOverPanel(gameState: GameState): any {
    if (!gameState.gameOver) return { x: 0, y: 0, width: 0, height: 0 };
    
    const panelWidth = 500 * this.dpr;
    const panelHeight = 400 * this.dpr;
    const x = (this.width - panelWidth) / 2;
    const y = (this.height - panelHeight) / 2;
    
    this.ctx.save();
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    this.ctx.fillRect(x, y, panelWidth, panelHeight);
    
    this.ctx.strokeStyle = '#7b2d8e';
    this.ctx.lineWidth = 4 * this.dpr;
    this.ctx.shadowColor = '#7b2d8e';
    this.ctx.shadowBlur = 20 * this.dpr;
    this.ctx.strokeRect(x, y, panelWidth, panelHeight);
    
    this.ctx.shadowBlur = 10 * this.dpr;
    this.ctx.font = `${20 * this.dpr}px 'Press Start 2P', monospace`;
    this.ctx.fillStyle = '#ff4444';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText('任务结束', this.width / 2, y + 25 * this.dpr);
    
    this.ctx.font = `${16 * this.dpr}px 'Press Start 2P', monospace`;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`最终得分: ${gameState.score}`, this.width / 2, y + 70 * this.dpr);
    
    this.ctx.font = `${12 * this.dpr}px 'Press Start 2P', monospace`;
    this.ctx.fillStyle = '#ff4444';
    this.ctx.fillText(`红色晶体: ${gameState.crystalStats.red}`, this.width / 2, y + 115 * this.dpr);
    this.ctx.fillStyle = '#4488ff';
    this.ctx.fillText(`蓝色晶体: ${gameState.crystalStats.blue}`, this.width / 2, y + 140 * this.dpr);
    this.ctx.fillStyle = '#aa44ff';
    this.ctx.fillText(`紫色晶体: ${gameState.crystalStats.purple}`, this.width / 2, y + 165 * this.dpr);
    
    const totalCrystals = gameState.crystalStats.red + gameState.crystalStats.blue + gameState.crystalStats.purple;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(`总计: ${totalCrystals} 块`, this.width / 2, y + 200 * this.dpr);
    
    this.ctx.font = `${10 * this.dpr}px 'Press Start 2P', monospace`;
    this.ctx.fillStyle = '#c0c8d4';
    this.ctx.fillText(gameState.spaceQuote, this.width / 2, y + 245 * this.dpr);
    
    const buttonWidth = 180 * this.dpr;
    const buttonHeight = 50 * this.dpr;
    const buttonX = (this.width - buttonWidth) / 2;
    const buttonY = y + panelHeight - 80 * this.dpr;
    
    const floatOffset = Math.sin(this.time * 3) * 2 * this.dpr;
    
    this.ctx.shadowColor = '#44ff44';
    this.ctx.shadowBlur = 15 * this.dpr;
    
    this.ctx.fillStyle = '#226622';
    this.ctx.fillRect(buttonX, buttonY + floatOffset, buttonWidth, buttonHeight);
    
    this.ctx.strokeStyle = '#44ff44';
    this.ctx.lineWidth = 3 * this.dpr;
    this.ctx.strokeRect(buttonX, buttonY + floatOffset, buttonWidth, buttonHeight);
    
    this.ctx.font = `${12 * this.dpr}px 'Press Start 2P', monospace`;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('重新启航', this.width / 2, buttonY + floatOffset + buttonHeight / 2);
    
    this.ctx.restore();
    
    return { x: buttonX, y: buttonY, width: buttonWidth, height: buttonHeight };
  }

  private drawDamageFlash(timer: number): void {
    const alpha = Math.min(0.5, timer * 0.5);
    
    this.ctx.save();
    this.ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.restore();
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
    const B = Math.min(255, (num & 0x0000FF) + amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }
}
