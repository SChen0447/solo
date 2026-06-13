import { CONFIG } from './config';
import type { Coral, Current, CrystalLight, Bubble, RippleWave, Vector2 } from './types';

export class Cave {
  public width: number;
  public height: number;
  public leftWall: { x: number; y: number }[] = [];
  public rightWall: { x: number; y: number }[] = [];
  public topWall: { x: number; y: number }[] = [];
  public bottomWall: { x: number; y: number }[] = [];
  
  public corals: Coral[] = [];
  public currents: Current[] = [];
  public crystalLights: CrystalLight[] = [];
  public bubbles: Bubble[] = [];
  public rippleWaves: RippleWave[] = [];
  
  public lightsLit: number = 0;
  public coralsCollected: number = 0;
  public lightBeamIntensity: number = 0.1;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.generateWalls();
    this.generateCorals();
    this.generateCurrents();
    this.generateCrystalLights();
    this.generateBubbles();
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.generateWalls();
    this.generateCorals();
    this.generateCurrents();
    this.generateCrystalLights();
    this.generateBubbles();
    this.lightsLit = 0;
    this.coralsCollected = 0;
    this.lightBeamIntensity = 0.1;
    this.rippleWaves = [];
  }

  private generateWalls(): void {
    const segments = CONFIG.CAVE.WALL_SEGMENTS;
    const thickness = (CONFIG.CAVE.WALL_THICKNESS_MIN + CONFIG.CAVE.WALL_THICKNESS_MAX) / 2;

    this.leftWall = [];
    this.rightWall = [];
    this.topWall = [];
    this.bottomWall = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = t * this.height;
      const variance = Math.sin(t * Math.PI * 3) * 20 + Math.sin(t * Math.PI * 7) * 10;
      
      this.leftWall.push({ x: thickness + variance, y });
      this.rightWall.push({ x: this.width - thickness - variance, y });
    }

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = t * this.width;
      const variance = Math.sin(t * Math.PI * 4) * 15 + Math.sin(t * Math.PI * 9) * 8;
      
      this.topWall.push({ x, y: thickness + variance });
      this.bottomWall.push({ x, y: this.height - thickness - variance });
    }
  }

  private generateCorals(): void {
    this.corals = [];
    const count = CONFIG.CAVE.CORAL_COUNT;
    const margin = 80;

    for (let i = 0; i < count; i++) {
      const onLeftWall = Math.random() > 0.5;
      let x: number, y: number;

      if (onLeftWall) {
        const wallIndex = Math.floor(Math.random() * (this.leftWall.length - 1));
        const wallPoint = this.leftWall[wallIndex];
        x = wallPoint.x + 15 + Math.random() * 20;
        y = wallPoint.y + (Math.random() - 0.5) * 30;
      } else {
        const wallIndex = Math.floor(Math.random() * (this.rightWall.length - 1));
        const wallPoint = this.rightWall[wallIndex];
        x = wallPoint.x - 15 - Math.random() * 20;
        y = wallPoint.y + (Math.random() - 0.5) * 30;
      }

      x = Math.max(margin, Math.min(this.width - margin, x));
      y = Math.max(margin, Math.min(this.height - margin, y));

      const size = CONFIG.CAVE.CORAL_SIZE_MIN + Math.random() * (CONFIG.CAVE.CORAL_SIZE_MAX - CONFIG.CAVE.CORAL_SIZE_MIN);
      const hue = 330 + Math.random() * 30;
      const color = `hsl(${hue}, 100%, 70%)`;
      const glowColor = `hsl(${hue}, 100%, 60%)`;

      this.corals.push({
        x,
        y,
        size,
        color,
        glowColor,
        type: Math.random() > 0.5 ? 'star' : 'branch',
        collected: false,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  private generateCurrents(): void {
    this.currents = [];
    const count = CONFIG.CAVE.CURRENT_COUNT;

    for (let i = 0; i < count; i++) {
      const isHorizontal = Math.random() > 0.5;
      const width = CONFIG.CAVE.CURRENT_WIDTH_MIN + Math.random() * (CONFIG.CAVE.CURRENT_WIDTH_MAX - CONFIG.CAVE.CURRENT_WIDTH_MIN);
      
      let x: number, y: number, w: number, h: number;
      
      if (isHorizontal) {
        w = this.width;
        h = width;
        x = 0;
        y = 100 + Math.random() * (this.height - 200 - width);
      } else {
        w = width;
        h = this.height;
        x = 100 + Math.random() * (this.width - 200 - width);
        y = 0;
      }

      this.currents.push({
        x,
        y,
        width: w,
        height: h,
        direction: isHorizontal ? 'horizontal' : 'vertical',
        speed: (CONFIG.CAVE.CURRENT_SPEED + Math.random()) * (Math.random() > 0.5 ? 1 : -1),
        flowOffset: Math.random() * Math.PI * 2,
      });
    }
  }

  private generateCrystalLights(): void {
    this.crystalLights = [];
    const count = CONFIG.CAVE.TOTAL_LIGHTS;
    const spacing = (this.width - 200) / (count - 1);

    for (let i = 0; i < count; i++) {
      this.crystalLights.push({
        x: 100 + i * spacing,
        y: 60 + Math.sin(i * 0.8) * 20,
        lit: false,
        rotation: Math.random() * Math.PI * 2,
        intensity: 0,
      });
    }
  }

  private generateBubbles(): void {
    this.bubbles = [];
    const count = CONFIG.CAVE.BUBBLE_COUNT;
    const margin = 100;

    for (let i = 0; i < count; i++) {
      this.bubbles.push({
        x: margin + Math.random() * (this.width - margin * 2),
        y: margin + Math.random() * (this.height - margin * 2),
        size: CONFIG.CAVE.BUBBLE_SIZE,
        collected: false,
        wobblePhase: Math.random() * Math.PI * 2,
        colorHue: Math.random() * 360,
      });
    }
  }

  public update(dt: number, jellyX: number, jellyY: number, jellyRadius: number): {
    currentForce: Vector2 | null;
    coralCollected: Coral | null;
    bubbleCollected: Bubble | null;
  } {
    let currentForce: Vector2 | null = null;
    let coralCollected: Coral | null = null;
    let bubbleCollected: Bubble | null = null;

    for (const current of this.currents) {
      current.flowOffset += dt * 2;
      
      if (jellyX >= current.x && jellyX <= current.x + current.width &&
          jellyY >= current.y && jellyY <= current.y + current.height) {
        if (current.direction === 'horizontal') {
          currentForce = { x: current.speed, y: 0 };
        } else {
          currentForce = { x: 0, y: current.speed };
        }
        break;
      }
    }

    for (const coral of this.corals) {
      coral.pulsePhase += dt * 2;
      
      if (!coral.collected) {
        const dx = jellyX - coral.x;
        const dy = jellyY - coral.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < jellyRadius + coral.size * 0.5) {
          coral.collected = true;
          coralCollected = coral;
          this.coralsCollected++;
          
          this.addRippleWave(coral.x, coral.y, coral.color);
          
          if (this.coralsCollected % CONFIG.CAVE.CORALS_PER_LIGHT === 0) {
            this.lightNextCrystal();
          }
        }
      }
    }

    for (const bubble of this.bubbles) {
      bubble.wobblePhase += dt * 1.5;
      bubble.colorHue += dt * 20;
      
      if (!bubble.collected) {
        const wobbleX = Math.sin(bubble.wobblePhase) * 5;
        const wobbleY = Math.cos(bubble.wobblePhase * 0.7) * 3;
        const dx = jellyX - (bubble.x + wobbleX);
        const dy = jellyY - (bubble.y + wobbleY);
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < jellyRadius + bubble.size * 0.5) {
          bubble.collected = true;
          bubbleCollected = bubble;
        }
      }
    }

    for (let i = this.rippleWaves.length - 1; i >= 0; i--) {
      const ripple = this.rippleWaves[i];
      ripple.life -= dt;
      ripple.radius = ripple.maxRadius * (1 - ripple.life / ripple.maxLife);
      
      if (ripple.life <= 0) {
        this.rippleWaves.splice(i, 1);
      }
    }

    for (const light of this.crystalLights) {
      light.rotation += dt * 0.3;
      if (light.lit && light.intensity < 1) {
        light.intensity = Math.min(1, light.intensity + dt * 2);
      }
    }

    this.lightBeamIntensity = 0.1 + (this.lightsLit / CONFIG.CAVE.TOTAL_LIGHTS) * 0.9;

    return { currentForce, coralCollected, bubbleCollected };
  }

  private lightNextCrystal(): void {
    for (const light of this.crystalLights) {
      if (!light.lit) {
        light.lit = true;
        this.lightsLit++;
        break;
      }
    }
  }

  private addRippleWave(x: number, y: number, color: string): void {
    this.rippleWaves.push({
      x,
      y,
      radius: 0,
      maxRadius: CONFIG.PARTICLES.RIPPLE_MAX_RADIUS,
      life: CONFIG.PARTICLES.RIPPLE_DURATION,
      maxLife: CONFIG.PARTICLES.RIPPLE_DURATION,
      color,
    });
  }

  public isVictory(): boolean {
    return this.lightsLit >= CONFIG.CAVE.TOTAL_LIGHTS;
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    this.drawLightBeam(ctx);
    this.drawWalls(ctx);
    this.drawCurrents(ctx);
    this.drawCorals(ctx);
    this.drawCrystalLights(ctx);
    this.drawBubbles(ctx);
    this.drawRippleWaves(ctx);
  }

  private drawLightBeam(ctx: CanvasRenderingContext2D): void {
    const intensity = this.lightBeamIntensity;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height * 0.6);
    gradient.addColorStop(0, `rgba(150, 200, 255, ${0.15 * intensity})`);
    gradient.addColorStop(0.3, `rgba(120, 180, 255, ${0.08 * intensity})`);
    gradient.addColorStop(1, `rgba(100, 150, 200, 0)`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height * 0.6);

    const beamWidth = 150;
    for (let i = 0; i < 5; i++) {
      const x = this.width * (0.2 + i * 0.15);
      const beamGradient = ctx.createLinearGradient(x - beamWidth / 2, 0, x + beamWidth / 2, 0);
      beamGradient.addColorStop(0, 'rgba(150, 200, 255, 0)');
      beamGradient.addColorStop(0.5, `rgba(180, 220, 255, ${0.06 * intensity})`);
      beamGradient.addColorStop(1, 'rgba(150, 200, 255, 0)');
      
      ctx.fillStyle = beamGradient;
      ctx.fillRect(x - beamWidth / 2, 0, beamWidth, this.height * 0.7);
    }
  }

  private drawWalls(ctx: CanvasRenderingContext2D): void {
    const leftGradient = ctx.createLinearGradient(0, 0, 120, 0);
    leftGradient.addColorStop(0, CONFIG.COLORS.WALL_DARK);
    leftGradient.addColorStop(1, 'rgba(42, 26, 58, 0)');
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (const point of this.leftWall) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.lineTo(0, this.height);
    ctx.closePath();
    ctx.fillStyle = leftGradient;
    ctx.fill();

    const rightGradient = ctx.createLinearGradient(this.width - 120, 0, this.width, 0);
    rightGradient.addColorStop(0, 'rgba(42, 26, 58, 0)');
    rightGradient.addColorStop(1, CONFIG.COLORS.WALL_DARK);
    
    ctx.beginPath();
    ctx.moveTo(this.width, 0);
    for (const point of this.rightWall) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.lineTo(this.width, this.height);
    ctx.closePath();
    ctx.fillStyle = rightGradient;
    ctx.fill();

    const topGradient = ctx.createLinearGradient(0, 0, 0, 80);
    topGradient.addColorStop(0, CONFIG.COLORS.WALL_LIGHT);
    topGradient.addColorStop(1, 'rgba(58, 74, 106, 0)');
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (const point of this.topWall) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.lineTo(this.width, 0);
    ctx.closePath();
    ctx.fillStyle = topGradient;
    ctx.fill();

    const bottomGradient = ctx.createLinearGradient(0, this.height - 80, 0, this.height);
    bottomGradient.addColorStop(0, 'rgba(42, 26, 58, 0)');
    bottomGradient.addColorStop(1, CONFIG.COLORS.WALL_DARK);
    
    ctx.beginPath();
    ctx.moveTo(0, this.height);
    for (const point of this.bottomWall) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.lineTo(this.width, this.height);
    ctx.closePath();
    ctx.fillStyle = bottomGradient;
    ctx.fill();
  }

  private drawCurrents(ctx: CanvasRenderingContext2D): void {
    for (const current of this.currents) {
      ctx.save();
      
      if (current.direction === 'horizontal') {
        const gradient = ctx.createLinearGradient(0, current.y, 0, current.y + current.height);
        gradient.addColorStop(0, 'rgba(100, 180, 255, 0)');
        gradient.addColorStop(0.3, 'rgba(100, 180, 255, 0.15)');
        gradient.addColorStop(0.7, 'rgba(100, 180, 255, 0.15)');
        gradient.addColorStop(1, 'rgba(100, 180, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(current.x, current.y, current.width, current.height);

        const stripeCount = Math.floor(current.width / 60);
        for (let i = 0; i < stripeCount; i++) {
          const offset = ((current.flowOffset * 30 * current.speed) % 60 + 60) % 60;
          const sx = current.x + i * 60 + offset;
          const sy = current.y + current.height / 2;
          
          const stripeGradient = ctx.createLinearGradient(sx - 20, sy, sx + 20, sy);
          stripeGradient.addColorStop(0, 'rgba(150, 210, 255, 0)');
          stripeGradient.addColorStop(0.5, 'rgba(150, 210, 255, 0.25)');
          stripeGradient.addColorStop(1, 'rgba(150, 210, 255, 0)');
          
          ctx.fillStyle = stripeGradient;
          ctx.fillRect(sx - 20, current.y + 5, 40, current.height - 10);
        }
      } else {
        const gradient = ctx.createLinearGradient(current.x, 0, current.x + current.width, 0);
        gradient.addColorStop(0, 'rgba(100, 180, 255, 0)');
        gradient.addColorStop(0.3, 'rgba(100, 180, 255, 0.15)');
        gradient.addColorStop(0.7, 'rgba(100, 180, 255, 0.15)');
        gradient.addColorStop(1, 'rgba(100, 180, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(current.x, current.y, current.width, current.height);

        const stripeCount = Math.floor(current.height / 60);
        for (let i = 0; i < stripeCount; i++) {
          const offset = ((current.flowOffset * 30 * current.speed) % 60 + 60) % 60;
          const sx = current.x + current.width / 2;
          const sy = current.y + i * 60 + offset;
          
          const stripeGradient = ctx.createLinearGradient(sx, sy - 20, sx, sy + 20);
          stripeGradient.addColorStop(0, 'rgba(150, 210, 255, 0)');
          stripeGradient.addColorStop(0.5, 'rgba(150, 210, 255, 0.25)');
          stripeGradient.addColorStop(1, 'rgba(150, 210, 255, 0)');
          
          ctx.fillStyle = stripeGradient;
          ctx.fillRect(current.x + 5, sy - 20, current.width - 10, 40);
        }
      }
      
      ctx.restore();
    }
  }

  private drawCorals(ctx: CanvasRenderingContext2D): void {
    for (const coral of this.corals) {
      if (coral.collected) continue;

      const pulse = 1 + Math.sin(coral.pulsePhase) * 0.15;
      const size = coral.size * pulse;

      const glowGradient = ctx.createRadialGradient(coral.x, coral.y, 0, coral.x, coral.y, CONFIG.CAVE.CORAL_GLOW_RADIUS * pulse);
      glowGradient.addColorStop(0, this.withAlpha(coral.glowColor, 0.4));
      glowGradient.addColorStop(0.5, this.withAlpha(coral.glowColor, 0.2));
      glowGradient.addColorStop(1, this.withAlpha(coral.glowColor, 0));
      
      ctx.beginPath();
      ctx.arc(coral.x, coral.y, CONFIG.CAVE.CORAL_GLOW_RADIUS * pulse, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();

      if (coral.type === 'star') {
        this.drawStarCoral(ctx, coral.x, coral.y, size, coral.color);
      } else {
        this.drawBranchCoral(ctx, coral.x, coral.y, size, coral.color);
      }
    }
  }

  private drawStarCoral(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
    const points = 5;
    const outerRadius = size;
    const innerRadius = size * 0.4;

    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, size * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 220, 200, 0.8)';
    ctx.fill();
  }

  private drawBranchCoral(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
    ctx.save();
    ctx.translate(x, y);

    const branches = 6;
    for (let i = 0; i < branches; i++) {
      const angle = (i / branches) * Math.PI * 2;
      const length = size * (0.6 + Math.sin(i * 1.5) * 0.3);
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      
      const midX = Math.cos(angle) * length * 0.5 + Math.cos(angle + 0.5) * size * 0.2;
      const midY = Math.sin(angle) * length * 0.5 + Math.sin(angle + 0.5) * size * 0.2;
      const endX = Math.cos(angle) * length;
      const endY = Math.sin(angle) * length;
      
      ctx.quadraticCurveTo(midX, midY, endX, endY);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(endX, endY, size * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 200, 180, 0.9)';
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.restore();
  }

  private drawCrystalLights(ctx: CanvasRenderingContext2D): void {
    for (const light of this.crystalLights) {
      const intensity = light.intensity;
      
      if (intensity > 0) {
        const glowGradient = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, CONFIG.CAVE.LIGHT_GLOW_RADIUS * 2);
        glowGradient.addColorStop(0, `rgba(255, 221, 136, ${0.6 * intensity})`);
        glowGradient.addColorStop(0.4, `rgba(255, 200, 100, ${0.3 * intensity})`);
        glowGradient.addColorStop(1, 'rgba(255, 180, 80, 0)');
        
        ctx.beginPath();
        ctx.arc(light.x, light.y, CONFIG.CAVE.LIGHT_GLOW_RADIUS * 2, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();
      }

      ctx.save();
      ctx.translate(light.x, light.y);
      ctx.rotate(light.rotation);

      const size = 18;
      const faces = 6;
      
      ctx.beginPath();
      for (let i = 0; i < faces; i++) {
        const angle = (i / faces) * Math.PI * 2;
        const px = Math.cos(angle) * size;
        const py = Math.sin(angle) * size * 0.8;
        
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      
      if (light.lit) {
        const crystalGradient = ctx.createLinearGradient(-size, -size, size, size);
        crystalGradient.addColorStop(0, '#fff8dc');
        crystalGradient.addColorStop(0.5, '#ffdd88');
        crystalGradient.addColorStop(1, '#ffbb55');
        ctx.fillStyle = crystalGradient;
      } else {
        ctx.fillStyle = 'rgba(100, 110, 130, 0.5)';
      }
      ctx.fill();
      ctx.strokeStyle = light.lit ? 'rgba(255, 240, 200, 0.8)' : 'rgba(150, 160, 180, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -size * 0.6);
      ctx.lineTo(0, size * 0.6);
      ctx.moveTo(-size * 0.5, -size * 0.3);
      ctx.lineTo(size * 0.5, size * 0.3);
      ctx.moveTo(-size * 0.5, size * 0.3);
      ctx.lineTo(size * 0.5, -size * 0.3);
      ctx.strokeStyle = light.lit ? 'rgba(255, 255, 255, 0.6)' : 'rgba(180, 190, 210, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawBubbles(ctx: CanvasRenderingContext2D): void {
    for (const bubble of this.bubbles) {
      if (bubble.collected) continue;

      const wobbleX = Math.sin(bubble.wobblePhase) * 5;
      const wobbleY = Math.cos(bubble.wobblePhase * 0.7) * 3;
      const x = bubble.x + wobbleX;
      const y = bubble.y + wobbleY;
      const size = bubble.size;

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
      gradient.addColorStop(0, `hsla(${bubble.colorHue}, 100%, 80%, 0.4)`);
      gradient.addColorStop(0.5, `hsla(${bubble.colorHue + 30}, 100%, 70%, 0.2)`);
      gradient.addColorStop(1, `hsla(${bubble.colorHue + 60}, 100%, 60%, 0.1)`);
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${bubble.colorHue}, 100%, 85%, 0.6)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x - size * 0.3, y - size * 0.3, size * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fill();
    }
  }

  private drawRippleWaves(ctx: CanvasRenderingContext2D): void {
    for (const ripple of this.rippleWaves) {
      const progress = 1 - ripple.life / ripple.maxLife;
      const alpha = 0.8 * (1 - progress);
      
      const gradient = ctx.createRadialGradient(ripple.x, ripple.y, ripple.radius * 0.8, ripple.x, ripple.y, ripple.radius);
      gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
      gradient.addColorStop(0.5, `${this.colorToRgba(ripple.color, alpha * 0.7)}`);
      gradient.addColorStop(1, `rgba(255, 255, 255, ${alpha * 0.3})`);
      
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  }

  private withAlpha(color: string, alpha: number): string {
    if (color.startsWith('hsl')) {
      return color.replace('hsl', 'hsla').replace(')', `, ${alpha})`);
    }
    return `rgba(255, 200, 180, ${alpha})`;
  }

  private colorToRgba(color: string, alpha: number): string {
    return this.withAlpha(color, alpha);
  }
}
