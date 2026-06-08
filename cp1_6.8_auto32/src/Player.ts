import type { AudioFeatures } from './AudioController';

export type PlayerState = 'running' | 'jumping' | 'sliding' | 'dead';

export interface PlayerStateData {
  x: number;
  y: number;
  width: number;
  height: number;
  state: PlayerState;
  velocityY: number;
  eyeScale: number;
  bodySquash: number;
  rotation: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

export class Player {
  public x: number = 100;
  public y: number = 0;
  public width: number = 40;
  public height: number = 40;
  
  public state: PlayerState = 'running';
  
  private velocityY: number = 0;
  private gravity: number = 1500;
  private jumpForce: number = -600;
  private maxJumpHeight: number = 0;
  
  private groundY: number = 0;
  private canvasHeight: number = 600;
  
  private isOnGround: boolean = true;
  
  private eyeScale: number = 1;
  private bodySquash: number = 1;
  private rotation: number = 0;
  
  private slideDuration: number = 0;
  private minSlideDuration: number = 200;
  
  private particles: Particle[] = [];
  private deathTime: number = 0;
  private respawnDelay: number = 2000;
  
  private lastJumpTime: number = 0;
  private jumpCooldown: number = 100;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasHeight = canvasHeight;
    this.groundY = canvasHeight * 0.8;
    this.y = this.groundY - this.height;
    this.maxJumpHeight = canvasHeight * 0.4;
  }

  update(deltaTime: number, audioFeatures: AudioFeatures, currentTime: number): void {
    if (this.state === 'dead') {
      this.updateParticles(deltaTime);
      return;
    }

    this.handleInput(audioFeatures, currentTime);
    this.updatePhysics(deltaTime);
    this.updateAnimation(deltaTime);
  }

  private handleInput(audioFeatures: AudioFeatures, currentTime: number): void {
    if (audioFeatures.isHighPitch && this.isOnGround && (currentTime - this.lastJumpTime) > this.jumpCooldown) {
      this.jump(audioFeatures.volume);
      this.lastJumpTime = currentTime;
    }

    if (audioFeatures.isLowPitch && audioFeatures.lowPitchDuration > this.minSlideDuration) {
      if (this.state !== 'sliding') {
        this.startSlide();
      }
      this.slideDuration = audioFeatures.lowPitchDuration;
    } else if (this.state === 'sliding' && this.isOnGround) {
      this.endSlide();
    }

    if (!audioFeatures.isHighPitch && !audioFeatures.isLowPitch && this.isOnGround && this.state !== 'running') {
      if (this.state === 'sliding') {
        this.endSlide();
      }
    }
  }

  private jump(volume: number): void {
    if (!this.isOnGround) return;

    const normalizedVolume = Math.max(0.3, Math.min(volume, 1));
    const jumpMultiplier = 0.5 + normalizedVolume * 0.5;
    const actualJumpForce = this.jumpForce * jumpMultiplier;

    const maxVelocity = -Math.sqrt(2 * this.gravity * this.maxJumpHeight);
    this.velocityY = Math.max(actualJumpForce, maxVelocity);

    this.isOnGround = false;
    this.state = 'jumping';
    
    this.eyeScale = 1.5;
    this.bodySquash = 0.8;
  }

  private startSlide(): void {
    if (!this.isOnGround) return;
    
    this.state = 'sliding';
    this.bodySquash = 0.5;
    this.height = 20;
    this.y = this.groundY - this.height;
  }

  private endSlide(): void {
    this.state = 'running';
    this.bodySquash = 1;
    this.height = 40;
    this.y = this.groundY - this.height;
    this.slideDuration = 0;
  }

  private updatePhysics(deltaTime: number): void {
    if (this.state === 'sliding' || this.isOnGround) return;

    this.velocityY += this.gravity * deltaTime;
    this.y += this.velocityY * deltaTime;

    if (this.y >= this.groundY - this.height) {
      this.y = this.groundY - this.height;
      this.velocityY = 0;
      this.isOnGround = true;
      
      if (this.state === 'jumping') {
        this.state = 'running';
      }
      
      this.bodySquash = 1.2;
      setTimeout(() => {
        this.bodySquash = 1;
      }, 100);
    }
  }

  private updateAnimation(deltaTime: number): void {
    if (this.state === 'jumping') {
      this.rotation = Math.min(this.rotation + deltaTime * 5, 0.2);
      this.eyeScale = Math.max(this.eyeScale - deltaTime * 2, 1);
    } else if (this.state === 'sliding') {
      this.eyeScale = 0.8;
      this.rotation = 0;
    } else {
      this.rotation = Math.max(this.rotation - deltaTime * 3, 0);
      this.eyeScale = Math.max(this.eyeScale - deltaTime * 3, 1);
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += 800 * deltaTime;
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.life -= deltaTime;
      
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  die(): void {
    if (this.state === 'dead') return;
    
    this.state = 'dead';
    this.deathTime = performance.now();
    this.createDeathParticles();
  }

  private createDeathParticles(): void {
    const particleCount = 30;
    const colors = ['#ff6b6b', '#ffd93d', '#ff8c42', '#ff4757', '#ffa502'];
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const speed = 100 + Math.random() * 300;
      
      this.particles.push({
        x: this.x + this.width / 2,
        y: this.y + this.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 200,
        size: 4 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1 + Math.random(),
        maxLife: 1.5
      });
    }
  }

  shouldRespawn(): boolean {
    return this.state === 'dead' && (performance.now() - this.deathTime) > this.respawnDelay;
  }

  respawn(): void {
    this.state = 'running';
    this.y = this.groundY - this.height;
    this.velocityY = 0;
    this.isOnGround = true;
    this.particles = [];
    this.eyeScale = 1;
    this.bodySquash = 1;
    this.rotation = 0;
    this.height = 40;
  }

  getStateData(): PlayerStateData {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      state: this.state,
      velocityY: this.velocityY,
      eyeScale: this.eyeScale,
      bodySquash: this.bodySquash,
      rotation: this.rotation
    };
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  getGroundY(): number {
    return this.groundY;
  }

  getCollisionBox(): { x: number; y: number; width: number; height: number } {
    if (this.state === 'sliding') {
      return {
        x: this.x + 5,
        y: this.y + 5,
        width: this.width - 10,
        height: this.height - 10
      };
    }
    return {
      x: this.x + 5,
      y: this.y + 5,
      width: this.width - 10,
      height: this.height - 10
    };
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    this.canvasHeight = canvasHeight;
    this.groundY = canvasHeight * 0.8;
    this.maxJumpHeight = canvasHeight * 0.4;
    
    if (this.isOnGround || this.state === 'sliding') {
      this.y = this.groundY - this.height;
    }
    
    this.x = canvasWidth * 0.1;
  }

  getIsOnGround(): boolean {
    return this.isOnGround;
  }
}
