import { Player } from './player';

export class AIController {
  x: number;
  y: number;
  radius: number = 18;
  color: string = '#ff6b6b';
  speed: number = 0;
  velocityX: number = 0;
  velocityY: number = 0;
  maxSpeedRatio: number = 0.8;
  acceleration: number = 400;
  pulseTimer: number = 0;
  pulsePeriod: number = 0.8;
  stunned: boolean = false;
  stunTimer: number = 0;
  stunDuration: number = 1.5;
  stunBlinkTimer: number = 0;
  stunBlinkPeriod: number = 0.3;
  predictionTimer: number = 0;
  predictionInterval: number = 3;
  predictionAngle: number = 0;
  predictionOffset: number = 0;
  learningLevel: number = 0;
  maxLearningLevel: number = 5;
  playerMovePattern: { x: number; y: number; time: number }[] = [];
  maxPatternHistory: number = 20;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(deltaTime: number, player: Player, canvasWidth: number, canvasHeight: number): void {
    this.pulseTimer += deltaTime;
    
    if (this.stunned) {
      this.stunTimer -= deltaTime;
      this.stunBlinkTimer += deltaTime;
      if (this.stunTimer <= 0) {
        this.stunned = false;
        this.stunBlinkTimer = 0;
      }
      return;
    }
    
    this.predictionTimer += deltaTime;
    if (this.predictionTimer >= this.predictionInterval) {
      this.predictionTimer = 0;
      this.predictionOffset = (Math.random() - 0.5) * 2 * (Math.PI / 6);
    }
    
    this.playerMovePattern.push({ x: player.x, y: player.y, time: performance.now() });
    if (this.playerMovePattern.length > this.maxPatternHistory) {
      this.playerMovePattern.shift();
    }
    
    let targetX = player.x;
    let targetY = player.y;
    
    if (this.playerMovePattern.length >= 5) {
      const oldest = this.playerMovePattern[0];
      const newest = this.playerMovePattern[this.playerMovePattern.length - 1];
      const timeDiff = (newest.time - oldest.time) / 1000;
      if (timeDiff > 0) {
        const vx = (newest.x - oldest.x) / timeDiff;
        const vy = (newest.y - oldest.y) / timeDiff;
        const baseAngle = Math.atan2(vy, vx);
        const predictionAngle = baseAngle + this.predictionOffset;
        const predictionDistance = Math.min(100 + this.learningLevel * 20, 200);
        targetX = player.x + Math.cos(predictionAngle) * predictionDistance * 0.5;
        targetY = player.y + Math.sin(predictionAngle) * predictionDistance * 0.5;
      }
    }
    
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 1) {
      const dirX = dx / dist;
      const dirY = dy / dist;
      
      const maxSpeed = player.speed * this.maxSpeedRatio + 50 + this.learningLevel * 30;
      
      this.velocityX += dirX * this.acceleration * deltaTime;
      this.velocityY += dirY * this.acceleration * deltaTime;
      
      const currentSpeed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
      if (currentSpeed > maxSpeed) {
        this.velocityX = (this.velocityX / currentSpeed) * maxSpeed;
        this.velocityY = (this.velocityY / currentSpeed) * maxSpeed;
      }
    }
    
    this.x += this.velocityX * deltaTime;
    this.y += this.velocityY * deltaTime;
    this.speed = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
    
    const damping = 0.98;
    this.velocityX *= damping;
    this.velocityY *= damping;
    
    if (this.x < this.radius) { this.x = this.radius; this.velocityX = Math.abs(this.velocityX) * 0.5; }
    if (this.x > canvasWidth - this.radius) { this.x = canvasWidth - this.radius; this.velocityX = -Math.abs(this.velocityX) * 0.5; }
    if (this.y < this.radius) { this.y = this.radius; this.velocityY = Math.abs(this.velocityY) * 0.5; }
    if (this.y > canvasHeight - this.radius) { this.y = canvasHeight - this.radius; this.velocityY = -Math.abs(this.velocityY) * 0.5; }
  }

  stun(): void {
    this.stunned = true;
    this.stunTimer = this.stunDuration;
    this.stunBlinkTimer = 0;
    this.velocityX = 0;
    this.velocityY = 0;
  }

  pushBack(fromX: number, fromY: number, distance: number): void {
    const dx = this.x - fromX;
    const dy = this.y - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      this.x += (dx / dist) * distance;
      this.y += (dy / dist) * distance;
    }
  }

  isStunned(): boolean {
    return this.stunned;
  }

  isStunVisible(): boolean {
    return Math.floor(this.stunBlinkTimer / this.stunBlinkPeriod) % 2 === 0;
  }

  checkCollision(player: Player): boolean {
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < this.radius + player.radius;
  }

  getDistanceToPlayer(player: Player): number {
    const dx = this.x - player.x;
    const dy = this.y - player.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  increaseDifficulty(): void {
    if (this.learningLevel < this.maxLearningLevel) {
      this.learningLevel++;
    }
  }

  getPulseScale(): number {
    const t = (this.pulseTimer % this.pulsePeriod) / this.pulsePeriod;
    return 0.85 + Math.sin(t * Math.PI * 2) * 0.15;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const pulseScale = this.getPulseScale();
    const outerRadius = 30 * pulseScale;
    const innerRadius = 22 * pulseScale;
    
    const drawColor = this.stunned && !this.isStunVisible() ? '#ffffff' : this.color;
    const r = this.stunned ? 255 : 255;
    const g = this.stunned ? 255 : 107;
    const b = this.stunned ? 255 : 107;
    
    const outerGlow = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, outerRadius
    );
    outerGlow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.3)`);
    outerGlow.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.12)`);
    outerGlow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.beginPath();
    ctx.arc(this.x, this.y, outerRadius, 0, Math.PI * 2);
    ctx.fillStyle = outerGlow;
    ctx.fill();
    
    const innerGlow = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, innerRadius
    );
    innerGlow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.5)`);
    innerGlow.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.2)`);
    innerGlow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.beginPath();
    ctx.arc(this.x, this.y, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = innerGlow;
    ctx.fill();
    
    const coreGradient = ctx.createRadialGradient(
      this.x - 5, this.y - 5, 0,
      this.x, this.y, this.radius
    );
    if (this.stunned) {
      coreGradient.addColorStop(0, '#ffffff');
      coreGradient.addColorStop(0.5, '#e0e0e0');
      coreGradient.addColorStop(1, '#b0b0b0');
    } else {
      coreGradient.addColorStop(0, '#ffffff');
      coreGradient.addColorStop(0.3, '#ff9a9a');
      coreGradient.addColorStop(0.7, '#ff6b6b');
      coreGradient.addColorStop(1, '#ee5a5a');
    }
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = coreGradient;
    ctx.fill();
  }
}
