import { ParticleSystem, hsvToHex } from './particle';
import { PresetPattern, PresetManager } from './presets';

export interface FireworkConfig {
  explosionRadius: number;
  particleCount: number;
  lifetime: number;
  gravity: number;
  hueOffset: number;
  primaryColor: string;
  primaryHue: number;
  preset: PresetPattern;
}

export interface LaunchPoint {
  x: number;
  y: number;
  isMain: boolean;
}

export interface AimingCircle {
  x: number;
  y: number;
  lifetime: number;
  maxLifetime: number;
}

export interface ActiveFirework {
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  duration: number;
  config: FireworkConfig;
}

export interface ExplosionEvent {
  x: number;
  y: number;
  timestamp: number;
}

export class Emitter {
  private canvasWidth: number;
  private canvasHeight: number;
  private particleSystem: ParticleSystem;
  private launchPoints: LaunchPoint[] = [];
  private activeFireworks: ActiveFirework[] = [];
  private aimingCircles: AimingCircle[] = [];
  private explosions: ExplosionEvent[] = [];
  private presetManager: PresetManager;
  private maxLaunchPoints: number = 5;
  private onExplosionCallback?: () => void;

  constructor(
    canvasWidth: number,
    canvasHeight: number,
    particleSystem: ParticleSystem
  ) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.particleSystem = particleSystem;
    this.presetManager = new PresetManager();
    
    this.launchPoints.push({
      x: canvasWidth / 2,
      y: canvasHeight - 30,
      isMain: true
    });
  }

  public setOnExplosionCallback(callback: () => void): void {
    this.onExplosionCallback = callback;
  }

  public addLaunchPoint(x: number, y: number): boolean {
    if (this.launchPoints.length >= this.maxLaunchPoints) {
      return false;
    }
    
    x = Math.max(20, Math.min(this.canvasWidth - 20, x));
    if (y > this.canvasHeight - 40) {
      y = this.canvasHeight - 40;
    }
    
    this.launchPoints.push({ x, y, isMain: false });
    return true;
  }

  public removeLaunchPoint(x: number, y: number): boolean {
    const index = this.launchPoints.findIndex(point => {
      if (point.isMain) return false;
      const dist = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
      return dist < 20;
    });
    
    if (index !== -1) {
      this.launchPoints.splice(index, 1);
      return true;
    }
    return false;
  }

  public getLaunchPointAt(x: number, y: number): LaunchPoint | null {
    for (const point of this.launchPoints) {
      const dist = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
      if (dist < 20) {
        return point;
      }
    }
    return null;
  }

  public launch(targetX: number, targetY: number, config: FireworkConfig, launchPointIndex: number = 0): void {
    const launchPoint = this.launchPoints[launchPointIndex] || this.launchPoints[0];
    
    this.aimingCircles.push({
      x: targetX,
      y: targetY,
      lifetime: 1,
      maxLifetime: 1
    });
    
    const dist = Math.sqrt(
      Math.pow(targetX - launchPoint.x, 2) + 
      Math.pow(targetY - launchPoint.y, 2)
    );
    const duration = Math.max(0.8, Math.min(2.5, dist / 400));
    
    this.activeFireworks.push({
      x: launchPoint.x,
      y: launchPoint.y,
      startX: launchPoint.x,
      startY: launchPoint.y,
      targetX,
      targetY,
      progress: 0,
      duration,
      config: { ...config }
    });
  }

  public update(deltaTime: number): void {
    this.aimingCircles = this.aimingCircles.filter(circle => {
      circle.lifetime -= deltaTime;
      return circle.lifetime > 0;
    });
    
    const now = performance.now();
    this.explosions = this.explosions.filter(e => now - e.timestamp < 300);
    
    this.activeFireworks = this.activeFireworks.filter(firework => {
      firework.progress += deltaTime / firework.duration;
      
      const t = firework.progress;
      const t2 = t * t;
      
      firework.x = firework.startX + (firework.targetX - firework.startX) * t;
      
      const peakHeight = Math.min(firework.targetY, firework.startY - 100);
      const midY = (firework.startY + peakHeight) / 2;
      firework.y = firework.startY + (firework.targetY - firework.startY) * t2 
        - 4 * (midY - firework.startY) * t * (1 - t);
      
      if (t < 1) {
        for (let i = 0; i < 3; i++) {
          const offsetX = (Math.random() - 0.5) * 4;
          const offsetY = (Math.random() - 0.5) * 4;
          const vx = (firework.targetX - firework.startX) / firework.duration / 60;
          const vy = (firework.targetY - firework.startY) / firework.duration / 60;
          this.particleSystem.addTrail(
            firework.x + offsetX,
            firework.y + offsetY,
            vx + (Math.random() - 0.5) * 2,
            vy + (Math.random() - 0.5) * 2
          );
        }
      }
      
      if (firework.progress >= 1) {
        this.explode(firework.targetX, firework.targetY, firework.config);
        this.explosions.push({ x: firework.targetX, y: firework.targetY, timestamp: now });
        if (this.onExplosionCallback) {
          this.onExplosionCallback();
        }
        return false;
      }
      
      return true;
    });
  }

  private explode(x: number, y: number, config: FireworkConfig): void {
    const pattern = this.presetManager.getPattern(config.preset);
    const { particleCount, explosionRadius, lifetime, gravity, primaryHue, hueOffset } = config;
    
    const actualHue = (primaryHue + hueOffset + 360) % 360;
    
    for (let i = 0; i < particleCount; i++) {
      const particleData = pattern.getParticle(i, particleCount, explosionRadius);
      
      const mainColor = hsvToHex(
        (actualHue + particleData.hueShift) % 360,
        0.8 + Math.random() * 0.2,
        0.9 + Math.random() * 0.1
      );
      
      const secondaryHue = Math.random() * 360;
      const secondaryColor = hsvToHex(
        secondaryHue,
        0.7 + Math.random() * 0.3,
        0.8 + Math.random() * 0.2
      );
      
      this.particleSystem.addParticle({
        x,
        y,
        vx: particleData.vx,
        vy: particleData.vy,
        color: mainColor,
        secondaryColor,
        colorMix: 0.7,
        size: 4,
        lifetime,
        gravity,
        decay: 0.02,
        easeOut: particleData.easeOut,
        sineWobble: particleData.sineWobble
      });
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.renderLaunchPad(ctx);
    
    this.launchPoints.forEach(point => {
      if (!point.isMain) {
        this.renderWoodenPost(ctx, point.x, point.y);
      }
    });
    
    this.aimingCircles.forEach(circle => {
      const alpha = circle.lifetime / circle.maxLifetime;
      ctx.save();
      ctx.globalAlpha = alpha * 0.8;
      ctx.strokeStyle = '#e0f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, 20 * (1 - alpha * 0.5), 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
    
    this.activeFireworks.forEach(firework => {
      ctx.save();
      ctx.fillStyle = '#fffacd';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(firework.x, firework.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    
    this.explosions.forEach(explosion => {
      const elapsed = performance.now() - explosion.timestamp;
      if (elapsed < 200) {
        const alpha = 1 - elapsed / 200;
        const radius = 30 + (elapsed / 200) * 50;
        ctx.save();
        ctx.globalAlpha = alpha * 0.3;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
  }

  private renderLaunchPad(ctx: CanvasRenderingContext2D): void {
    const mainPoint = this.launchPoints.find(p => p.isMain);
    if (!mainPoint) return;
    
    const x = mainPoint.x;
    const y = mainPoint.y;
    
    const gradient = ctx.createLinearGradient(x - 30, y - 20, x + 30, y);
    gradient.addColorStop(0, '#8B4513');
    gradient.addColorStop(0.5, '#A0522D');
    gradient.addColorStop(1, '#654321');
    
    ctx.save();
    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#3d2817';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.roundRect(x - 30, y - 20, 60, 20, 4);
    ctx.fill();
    ctx.stroke();
    
    ctx.strokeStyle = '#5a3a1a';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(x - 25 + i * 12, y - 18);
      ctx.lineTo(x - 25 + i * 12, y - 2);
      ctx.stroke();
    }
    
    ctx.fillStyle = '#654321';
    ctx.fillRect(x - 15, y - 10, 30, 10);
    
    ctx.restore();
  }

  private renderWoodenPost(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();
    
    const gradient = ctx.createLinearGradient(x - 4, y - 12, x + 4, y);
    gradient.addColorStop(0, '#7a6a5a');
    gradient.addColorStop(1, '#5a4a3a');
    
    ctx.fillStyle = gradient;
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.roundRect(x - 4, y - 12, 8, 12, 2);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = '#8b7355';
    ctx.beginPath();
    ctx.arc(x, y - 12, 4, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    
    const mainPoint = this.launchPoints.find(p => p.isMain);
    if (mainPoint) {
      mainPoint.x = width / 2;
      mainPoint.y = height - 30;
    }
  }

  public getLaunchPoints(): LaunchPoint[] {
    return [...this.launchPoints];
  }

  public clear(): void {
    this.activeFireworks = [];
    this.aimingCircles = [];
    this.explosions = [];
  }
}
