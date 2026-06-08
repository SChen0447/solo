export type PetMood = 'happy' | 'normal' | 'hungry' | 'dirty' | 'bored' | 'sleepy' | 'sick' | 'weak';
export type GrowthStage = 'baby' | 'teen' | 'adult';
export type AnimationState = 'idle' | 'feeding' | 'cleaning' | 'playing' | 'sleeping' | 'yawning' | 'dancing' | 'shaking' | 'weak';
export type ActionType = 'feed' | 'clean' | 'play' | 'sleep';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  type: 'water' | 'dust' | 'zzz' | 'heart' | 'sparkle';
  size: number;
  rotation: number;
  rotationSpeed: number;
}

export class Pet {
  name: string;
  hunger: number = 80;
  cleanliness: number = 80;
  happiness: number = 80;
  energy: number = 80;
  health: number = 100;
  
  growthStage: GrowthStage = 'baby';
  ageInDays: number = 0;
  dayProgress: number = 0;
  
  animationState: AnimationState = 'idle';
  animationTimer: number = 0;
  animationDuration: number = 0;
  isActionActive: boolean = false;
  
  mood: PetMood = 'normal';
  
  x: number;
  y: number;
  baseY: number;
  
  private particles: Particle[] = [];
  private maxParticles: number = 50;
  
  private decayAccumulator: number = 0;
  private behaviorAccumulator: number = 0;
  private isSick: boolean = false;
  private sickDuration: number = 0;
  
  private breathPhase: number = 0;
  private tailPhase: number = 0;
  private eyeBlinkTimer: number = 0;
  private isBlinking: boolean = false;
  
  private jumpHeight: number = 0;
  private rotation: number = 0;
  private bodyScale: number = 1;
  
  private behaviorCooldown: number = 0;
  
  private shakeOffset: number = 0;
  
  constructor(name: string, x: number, y: number) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.updateMood();
  }
  
  getSize(): number {
    switch (this.growthStage) {
      case 'baby': return 50;
      case 'teen': return 65;
      case 'adult': return 80;
    }
  }
  
  getDecayMultiplier(): number {
    switch (this.growthStage) {
      case 'baby': return 0.7;
      case 'teen': return 1.0;
      case 'adult': return 1.4;
    }
  }
  
  update(deltaTime: number): void {
    this.breathPhase += deltaTime * 0.003;
    this.tailPhase += deltaTime * 0.004;
    this.eyeBlinkTimer += deltaTime;
    
    if (this.eyeBlinkTimer > 3000 + Math.random() * 2000) {
      this.isBlinking = true;
      setTimeout(() => { this.isBlinking = false; }, 150);
      this.eyeBlinkTimer = 0;
    }
    
    if (!this.isActionActive) {
      this.decayAccumulator += deltaTime;
      if (this.decayAccumulator >= 5000) {
        this.decayStats();
        this.decayAccumulator = 0;
      }
    }
    
    this.dayProgress += deltaTime;
    if (this.dayProgress >= 120000) {
      this.ageInDays++;
      this.dayProgress = 0;
      this.checkGrowth();
    }
    
    if (this.isActionActive) {
      this.animationTimer += deltaTime;
      this.updateAnimation(deltaTime);
      if (this.animationTimer >= this.animationDuration) {
        this.finishAction();
      }
    }
    
    if (!this.isActionActive && this.behaviorCooldown <= 0) {
      this.behaviorAccumulator += deltaTime;
      if (this.behaviorAccumulator >= 4000 + Math.random() * 3000) {
        this.tryTriggerBehavior();
        this.behaviorAccumulator = 0;
      }
    } else if (this.behaviorCooldown > 0) {
      this.behaviorCooldown -= deltaTime;
    }
    
    this.updateSickState(deltaTime);
    this.updateParticles(deltaTime);
    this.updateMood();
    
    if (this.isSick || this.mood === 'weak') {
      this.shakeOffset = Math.sin(Date.now() * 0.01) * 2;
    } else {
      this.shakeOffset = 0;
    }
  }
  
  private decayStats(): void {
    const mult = this.getDecayMultiplier();
    this.hunger = Math.max(0, this.hunger - (1 + Math.random() * 2) * mult);
    this.cleanliness = Math.max(0, this.cleanliness - (1 + Math.random() * 2) * mult);
    this.happiness = Math.max(0, this.happiness - (1 + Math.random() * 2) * mult);
    this.energy = Math.max(0, this.energy - (1 + Math.random() * 2) * mult);
  }
  
  private checkGrowth(): void {
    if (this.growthStage === 'baby' && this.ageInDays >= 3) {
      this.growthStage = 'teen';
    } else if (this.growthStage === 'teen' && this.ageInDays >= 8) {
      this.growthStage = 'adult';
    }
  }
  
  private updateSickState(deltaTime: number): void {
    const lowStats = [this.hunger, this.cleanliness, this.happiness, this.energy].filter(s => s < 20).length;
    
    if (lowStats >= 2) {
      this.isSick = true;
      this.sickDuration += deltaTime;
      if (this.sickDuration >= 300000) {
        this.animationState = 'weak';
      }
    } else {
      this.isSick = false;
      this.sickDuration = 0;
    }
  }
  
  private updateMood(): void {
    if (this.isSick) {
      this.mood = 'sick';
      return;
    }
    
    const allHigh = this.hunger >= 60 && this.cleanliness >= 60 && this.happiness >= 60 && this.energy >= 60;
    if (allHigh && !this.isActionActive) {
      this.mood = 'happy';
      return;
    }
    
    const stats = [
      { name: 'hungry', value: this.hunger },
      { name: 'dirty', value: this.cleanliness },
      { name: 'bored', value: this.happiness },
      { name: 'sleepy', value: this.energy }
    ];
    
    const lowest = stats.reduce((min, curr) => curr.value < min.value ? curr : min, stats[0]);
    
    if (lowest.value < 10) {
      this.mood = 'weak';
    } else if (lowest.value < 20) {
      this.mood = lowest.name as PetMood;
    } else {
      this.mood = 'normal';
    }
  }
  
  private updateAnimation(deltaTime: number): void {
    const t = this.animationTimer / this.animationDuration;
    
    switch (this.animationState) {
      case 'feeding':
        this.updateFeedingAnimation(t, deltaTime);
        break;
      case 'cleaning':
        this.updateCleaningAnimation(t, deltaTime);
        break;
      case 'playing':
        this.updatePlayingAnimation(t, deltaTime);
        break;
      case 'sleeping':
        this.updateSleepingAnimation(t, deltaTime);
        break;
      case 'yawning':
        this.updateYawningAnimation(t);
        break;
      case 'dancing':
        this.updateDancingAnimation(t, deltaTime);
        break;
      case 'shaking':
        this.updateShakingAnimation(t, deltaTime);
        break;
    }
  }
  
  private updateFeedingAnimation(_t: number, deltaTime: number): void {
    if (Math.random() < deltaTime * 0.01) {
      this.addParticle('sparkle', this.x, this.y - this.getSize() * 0.5);
    }
  }
  
  private updateCleaningAnimation(_t: number, deltaTime: number): void {
    if (this.particles.length < this.maxParticles && Math.random() < deltaTime * 0.03) {
      const angle = Math.random() * Math.PI * 2;
      const dist = this.getSize() * (0.5 + Math.random() * 0.5);
      this.addParticle('water', 
        this.x + Math.cos(angle) * dist,
        this.y + Math.sin(angle) * dist
      );
    }
  }
  
  private updatePlayingAnimation(t: number, deltaTime: number): void {
    const jumps = 3;
    const jumpCycle = t * jumps;
    const jumpProgress = jumpCycle - Math.floor(jumpCycle);
    this.jumpHeight = -Math.sin(jumpProgress * Math.PI) * (this.growthStage === 'baby' ? 80 : 60);
    this.rotation = Math.sin(t * Math.PI * 2) * 0.3;
    
    if (Math.random() < deltaTime * 0.3) {
      this.addParticle('sparkle', 
        this.x + (Math.random() - 0.5) * this.getSize(),
        this.y + this.jumpHeight + (Math.random() - 0.5) * this.getSize()
      );
    }
  }
  
  private updateSleepingAnimation(_t: number, deltaTime: number): void {
    this.bodyScale = 1 + Math.sin(this.breathPhase * 0.5) * 0.05;
    this.jumpHeight = -this.getSize() * 0.2;
    
    if (Math.random() < deltaTime * 0.003) {
      this.addParticle('zzz', this.x + this.getSize() * 0.3, this.y - this.getSize() * 0.3);
    }
  }
  
  private updateYawningAnimation(t: number): void {
    if (t < 0.3) {
      this.bodyScale = 1 - (t / 0.3) * 0.1;
    } else if (t < 0.7) {
      this.bodyScale = 0.9 + ((t - 0.3) / 0.4) * 0.1;
    }
  }
  
  private updateDancingAnimation(t: number, deltaTime: number): void {
    this.jumpHeight = -Math.abs(Math.sin(t * Math.PI * 4)) * 30;
    this.rotation = Math.sin(t * Math.PI * 2) * 0.2;
    
    if (Math.random() < deltaTime * 0.02) {
      this.addParticle('heart', 
        this.x + (Math.random() - 0.5) * this.getSize() * 1.5,
        this.y - this.getSize() * 0.8
      );
    }
  }
  
  private updateShakingAnimation(t: number, deltaTime: number): void {
    this.shakeOffset = Math.sin(t * Math.PI * 20) * 5;
    
    if (Math.random() < deltaTime * 0.02) {
      this.addParticle('dust', 
        this.x + (Math.random() - 0.5) * this.getSize(),
        this.y + this.getSize() * 0.3
      );
    }
  }
  
  private addParticle(type: Particle['type'], x: number, y: number): void {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }
    
    const particle: Particle = {
      x,
      y,
      vx: (Math.random() - 0.5) * 2,
      vy: -1 - Math.random() * 2,
      life: 0,
      maxLife: 1000 + Math.random() * 1000,
      type,
      size: 5 + Math.random() * 8,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.1
    };
    
    if (type === 'zzz') {
      particle.vx = 0.5 + Math.random() * 0.5;
      particle.vy = -0.5 - Math.random() * 0.5;
      particle.maxLife = 2000 + Math.random() * 1000;
      particle.size = 12 + Math.random() * 8;
    } else if (type === 'heart') {
      particle.vy = -1.5 - Math.random() * 1;
      particle.maxLife = 1500 + Math.random() * 500;
      particle.size = 10 + Math.random() * 10;
    } else if (type === 'dust') {
      particle.vy = 0.5 + Math.random();
      particle.maxLife = 800 + Math.random() * 400;
    } else if (type === 'water') {
      particle.vy = -2 - Math.random() * 2;
      particle.maxLife = 600 + Math.random() * 400;
    }
    
    this.particles.push(particle);
  }
  
  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += deltaTime;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      
      if (p.type === 'water') {
        p.vy += 0.1;
      }
      
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }
  }
  
  private tryTriggerBehavior(): void {
    if (this.energy < 30 && Math.random() < 0.5) {
      this.startBehavior('yawning', 2000);
      return;
    }
    
    if (this.happiness > 70 && this.hunger > 60 && Math.random() < 0.4) {
      this.startBehavior('dancing', 2500);
      return;
    }
    
    if (this.cleanliness < 20 && Math.random() < 0.5) {
      this.startBehavior('shaking', 2000);
      return;
    }
  }
  
  private startBehavior(behavior: AnimationState, duration: number): void {
    this.animationState = behavior;
    this.animationTimer = 0;
    this.animationDuration = duration;
    this.isActionActive = true;
  }
  
  feed(): boolean {
    if (this.isActionActive) return false;
    this.animationState = 'feeding';
    this.animationTimer = 0;
    this.animationDuration = 1800;
    this.isActionActive = true;
    return true;
  }
  
  clean(): boolean {
    if (this.isActionActive) return false;
    this.animationState = 'cleaning';
    this.animationTimer = 0;
    this.animationDuration = 2000;
    this.isActionActive = true;
    return true;
  }
  
  play(): boolean {
    if (this.isActionActive) return false;
    this.animationState = 'playing';
    this.animationTimer = 0;
    this.animationDuration = 2000;
    this.isActionActive = true;
    return true;
  }
  
  sleep(): boolean {
    if (this.isActionActive) return false;
    this.animationState = 'sleeping';
    this.animationTimer = 0;
    this.animationDuration = 5000;
    this.isActionActive = true;
    return true;
  }
  
  private finishAction(): void {
    switch (this.animationState) {
      case 'feeding':
        this.hunger = Math.min(100, this.hunger + 15 + Math.random() * 5);
        break;
      case 'cleaning':
        this.cleanliness = Math.min(100, this.cleanliness + 15 + Math.random() * 5);
        break;
      case 'playing':
        this.happiness = Math.min(100, this.happiness + 15 + Math.random() * 5);
        this.hunger = Math.max(0, this.hunger - 3 - Math.random() * 2);
        this.energy = Math.max(0, this.energy - 3 - Math.random() * 2);
        break;
      case 'sleeping':
        this.energy = 100;
        break;
    }
    
    this.animationState = 'idle';
    this.isActionActive = false;
    this.jumpHeight = 0;
    this.rotation = 0;
    this.bodyScale = 1;
    this.behaviorCooldown = 2000;
  }
  
  render(ctx: CanvasRenderingContext2D): void {
    const size = this.getSize();
    const drawY = this.y + this.jumpHeight;
    const shadowScale = 1 - Math.abs(this.jumpHeight) / 200;
    
    this.renderShadow(ctx, size * shadowScale, drawY);
    this.renderParticles(ctx);
    
    ctx.save();
    ctx.translate(this.x + this.shakeOffset, drawY);
    ctx.rotate(this.rotation);
    ctx.scale(this.bodyScale, this.bodyScale);
    
    if (this.mood === 'happy') {
      this.renderHappyGlow(ctx, size);
    }
    
    this.renderBody(ctx, size);
    this.renderEars(ctx, size);
    this.renderEyes(ctx, size);
    this.renderMouth(ctx, size);
    this.renderCheeks(ctx, size);
    
    if (this.growthStage !== 'baby') {
      this.renderTail(ctx, size);
    }
    
    ctx.restore();
    
    this.renderMoodEmoji(ctx, size, drawY);
  }
  
  private renderShadow(ctx: CanvasRenderingContext2D, width: number, petY: number): void {
    const gradient = ctx.createRadialGradient(this.x, petY + this.getSize() * 0.6, 0, this.x, petY + this.getSize() * 0.6, width);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(this.x, petY + this.getSize() * 0.6, width, width * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  
  private renderHappyGlow(ctx: CanvasRenderingContext2D, size: number): void {
    const glowSize = size * 1.4;
    const pulse = 1 + Math.sin(this.breathPhase * 2) * 0.1;
    
    const gradient = ctx.createRadialGradient(0, 0, size * 0.3, 0, 0, glowSize * pulse);
    gradient.addColorStop(0, 'rgba(255, 215, 100, 0.4)');
    gradient.addColorStop(0.5, 'rgba(255, 200, 100, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 180, 100, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, glowSize * pulse, 0, Math.PI * 2);
    ctx.fill();
  }
  
  private getBodyColor(): string {
    if (this.isSick) return '#7CB342';
    if (this.mood === 'weak') return '#9E9E9E';
    if (this.growthStage === 'baby') return '#FFB74D';
    if (this.growthStage === 'teen') return '#FF9800';
    return '#F57C00';
  }
  
  private getBodyGradient(ctx: CanvasRenderingContext2D, size: number): CanvasGradient {
    const baseColor = this.getBodyColor();
    const gradient = ctx.createRadialGradient(-size * 0.2, -size * 0.2, 0, 0, 0, size * 0.8);
    gradient.addColorStop(0, this.lightenColor(baseColor, 30));
    gradient.addColorStop(1, baseColor);
    return gradient;
  }
  
  private lightenColor(color: string, amount: number): string {
    const hex = color.replace('#', '');
    const r = Math.min(255, parseInt(hex.slice(0, 2), 16) + amount);
    const g = Math.min(255, parseInt(hex.slice(2, 4), 16) + amount);
    const b = Math.min(255, parseInt(hex.slice(4, 6), 16) + amount);
    return `rgb(${r}, ${g}, ${b})`;
  }
  
  private renderBody(ctx: CanvasRenderingContext2D, size: number): void {
    const breathOffset = Math.sin(this.breathPhase) * size * 0.03;
    
    ctx.fillStyle = this.getBodyGradient(ctx, size);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 3;
    
    ctx.beginPath();
    ctx.arc(0, breathOffset, size * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#FFE0B2';
    ctx.beginPath();
    ctx.ellipse(0, size * 0.1 + breathOffset, size * 0.45, size * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  
  private renderEars(ctx: CanvasRenderingContext2D, size: number): void {
    const earSize = size * 0.35;
    const earOffset = size * 0.5;
    
    ctx.fillStyle = this.getBodyColor();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.ellipse(-earOffset, -size * 0.5, earSize * 0.6, earSize, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.beginPath();
    ctx.ellipse(earOffset, -size * 0.5, earSize * 0.6, earSize, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#FFAB91';
    ctx.beginPath();
    ctx.ellipse(-earOffset, -size * 0.45, earSize * 0.3, earSize * 0.6, -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.ellipse(earOffset, -size * 0.45, earSize * 0.3, earSize * 0.6, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  
  private renderEyes(ctx: CanvasRenderingContext2D, size: number): void {
    const eyeY = -size * 0.1;
    const eyeSpacing = size * 0.3;
    const eyeSize = this.growthStage === 'baby' ? size * 0.18 : size * 0.14;
    
    if (this.isBlinking || this.animationState === 'sleeping') {
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      ctx.arc(-eyeSpacing, eyeY, eyeSize, 0.2, Math.PI - 0.2);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(eyeSpacing, eyeY, eyeSize, 0.2, Math.PI - 0.2);
      ctx.stroke();
    } else {
      const eyeColor = this.mood === 'hungry' || this.mood === 'weak' ? '#E53935' : '#333';
      
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(-eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
      ctx.arc(eyeSpacing, eyeY, eyeSize, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = eyeColor;
      ctx.beginPath();
      ctx.arc(-eyeSpacing, eyeY, eyeSize * 0.6, 0, Math.PI * 2);
      ctx.arc(eyeSpacing, eyeY, eyeSize * 0.6, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(-eyeSpacing + eyeSize * 0.2, eyeY - eyeSize * 0.2, eyeSize * 0.25, 0, Math.PI * 2);
      ctx.arc(eyeSpacing + eyeSize * 0.2, eyeY - eyeSize * 0.2, eyeSize * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  private renderMouth(ctx: CanvasRenderingContext2D, size: number): void {
    const mouthY = size * 0.2;
    const mouthWidth = size * 0.25;
    
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    
    if (this.animationState === 'feeding') {
      const t = this.animationTimer / 200;
      const openAmount = Math.abs(Math.sin(t * Math.PI)) * size * 0.15;
      
      ctx.fillStyle = '#8D6E63';
      ctx.beginPath();
      ctx.ellipse(0, mouthY, mouthWidth * 0.8, mouthWidth * 0.5 + openAmount, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (this.animationState === 'yawning') {
      const t = this.animationTimer / this.animationDuration;
      let openAmount = 0;
      if (t < 0.3) {
        openAmount = (t / 0.3) * size * 0.25;
      } else if (t < 0.7) {
        openAmount = size * 0.25;
      } else {
        openAmount = ((1 - t) / 0.3) * size * 0.25;
      }
      
      ctx.fillStyle = '#8D6E63';
      ctx.beginPath();
      ctx.ellipse(0, mouthY, mouthWidth * 0.8, mouthWidth * 0.3 + openAmount, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (this.mood === 'happy') {
      ctx.beginPath();
      ctx.arc(0, mouthY - mouthWidth * 0.2, mouthWidth, 0.1, Math.PI - 0.1);
      ctx.stroke();
    } else if (this.mood === 'weak') {
      ctx.beginPath();
      ctx.moveTo(-mouthWidth * 0.5, mouthY + 5);
      ctx.lineTo(mouthWidth * 0.5, mouthY - 5);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, mouthY, mouthWidth * 0.6, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  }
  
  private renderCheeks(ctx: CanvasRenderingContext2D, size: number): void {
    if (this.mood === 'happy' || this.mood === 'normal') {
      const cheekY = size * 0.15;
      const cheekX = size * 0.45;
      const cheekSize = size * 0.12;
      
      ctx.fillStyle = 'rgba(255, 138, 128, 0.5)';
      ctx.beginPath();
      ctx.arc(-cheekX, cheekY, cheekSize, 0, Math.PI * 2);
      ctx.arc(cheekX, cheekY, cheekSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  private renderTail(ctx: CanvasRenderingContext2D, size: number): void {
    const tailWag = Math.sin(this.tailPhase) * 0.3;
    const tailLength = size * 0.6;
    
    ctx.save();
    ctx.translate(-size * 0.6, size * 0.1);
    ctx.rotate(tailWag - 0.5);
    
    ctx.fillStyle = this.getBodyColor();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-tailLength * 0.5, -tailLength * 0.3, -tailLength, -tailLength * 0.1);
    ctx.quadraticCurveTo(-tailLength * 0.5, tailLength * 0.1, 0, 0);
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
  }
  
  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = 1 - p.life / p.maxLife;
      
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = alpha;
      
      switch (p.type) {
        case 'water':
          const wg = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
          wg.addColorStop(0, 'rgba(100, 200, 255, 0.9)');
          wg.addColorStop(1, 'rgba(50, 150, 255, 0.3)');
          ctx.fillStyle = wg;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
          
        case 'dust':
          ctx.fillStyle = '#BDBDBD';
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
          
        case 'zzz':
          ctx.fillStyle = '#78909C';
          ctx.font = `bold ${p.size * 1.5}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('Z', 0, 0);
          break;
          
        case 'heart':
          this.drawHeart(ctx, p.size, '#FF6B9D');
          break;
          
        case 'sparkle':
          ctx.fillStyle = '#FFD54F';
          this.drawStar(ctx, p.size, 4);
          break;
      }
      
      ctx.restore();
    }
  }
  
  private drawHeart(ctx: CanvasRenderingContext2D, size: number, color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.3);
    ctx.bezierCurveTo(size * 0.5, -size * 0.3, size, size * 0.2, 0, size);
    ctx.bezierCurveTo(-size, size * 0.2, -size * 0.5, -size * 0.3, 0, size * 0.3);
    ctx.fill();
  }
  
  private drawStar(ctx: CanvasRenderingContext2D, size: number, points: number): void {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? size : size * 0.4;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
  
  private renderMoodEmoji(ctx: CanvasRenderingContext2D, size: number, petY: number): void {
    const emojiY = petY - size * 1.3;
    const bounce = Math.sin(this.breathPhase * 2) * 3;
    const emojiSize = size * 0.35;
    
    ctx.save();
    ctx.translate(this.x, emojiY + bounce);
    
    let emoji = '';
    let bgColor = '#FFD54F';
    
    switch (this.mood) {
      case 'happy':
        emoji = '❤️';
        bgColor = '#FF80AB';
        break;
      case 'hungry':
        emoji = '😋';
        bgColor = '#FFB74D';
        break;
      case 'dirty':
        emoji = '😫';
        bgColor = '#90A4AE';
        break;
      case 'bored':
        emoji = '😐';
        bgColor = '#BDBDBD';
        break;
      case 'sleepy':
        emoji = '😴';
        bgColor = '#9FA8DA';
        break;
      case 'sick':
        emoji = '🤢';
        bgColor = '#9CCC65';
        break;
      case 'weak':
        emoji = '😢';
        bgColor = '#EF9A9A';
        break;
      default:
        emoji = '😊';
        bgColor = '#FFD54F';
    }
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 2;
    
    ctx.fillStyle = bgColor;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, emojiSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.shadowColor = 'transparent';
    
    ctx.font = `${emojiSize * 1.2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 0, 2);
    
    ctx.restore();
  }
  
  getDayProgress(): number {
    return this.dayProgress / 120000;
  }
  
  isNightTime(): boolean {
    return this.getDayProgress() > 0.7 || this.getDayProgress() < 0.2;
  }
  
  getStatsWarning(): { hunger: boolean; cleanliness: boolean; happiness: boolean; energy: boolean } {
    return {
      hunger: this.hunger < 30,
      cleanliness: this.cleanliness < 30,
      happiness: this.happiness < 30,
      energy: this.energy < 30
    };
  }
  
  getCriticalWarning(): boolean {
    return this.hunger < 10 || this.cleanliness < 10 || this.happiness < 10 || this.energy < 10;
  }
  
  canPerformAction(): boolean {
    return !this.isActionActive;
  }
  
  getActionProgress(): number {
    if (!this.isActionActive) return 0;
    return this.animationTimer / this.animationDuration;
  }
  
  getCurrentAction(): ActionType | null {
    switch (this.animationState) {
      case 'feeding': return 'feed';
      case 'cleaning': return 'clean';
      case 'playing': return 'play';
      case 'sleeping': return 'sleep';
      default: return null;
    }
  }
}
