export interface Leg {
  baseAngle: number;
  segments: { length: number; angle: number }[];
  targetX: number;
  targetY: number;
  phase: number;
}

export interface Rope {
  active: boolean;
  anchorX: number;
  anchorY: number;
  length: number;
  velocity: { x: number; y: number };
  shooting: boolean;
  shootProgress: number;
  shootStartX: number;
  shootStartY: number;
  targetX: number;
  targetY: number;
}

export interface RopeParticle {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  size: number;
}

export interface JumpParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export class Spider {
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;
  public bodyRadius: number = 22;
  public rotation: number = 0;
  
  public health: number = 3;
  public maxHealth: number = 3;
  
  public ropeCount: number = 3;
  public maxRopes: number = 3;
  public ropeCooldown: number = 0;
  public ropeCooldownTime: number = 5;
  
  public rope: Rope | null = null;
  public ropeParticles: RopeParticle[] = [];
  
  public legs: Leg[] = [];
  
  public hasJump: boolean = false;
  public jumpUnlocked: boolean = false;
  public jumpCooldown: number = 0;
  public jumpParticles: JumpParticle[] = [];
  public jumping: boolean = false;
  
  public energyCoreSize: number = 0;
  public energyCoreActive: boolean = false;
  
  public isFalling: boolean = false;
  public fallStartY: number = 0;
  public invulnerable: number = 0;
  
  public crystalCount: number = 0;
  public crystalsForJump: number = 5;
  
  public swingAngle: number = 0;
  public swingVelocity: number = 0;
  public swingDamping: number = 0.995;
  public gravity: number = 500;
  
  public legAnimPhase: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.initLegs();
  }

  private initLegs(): void {
    const legCount = 6;
    for (let i = 0; i < legCount; i++) {
      const side = i < 3 ? -1 : 1;
      const idx = i < 3 ? i : i - 3;
      const baseAngle = side * (Math.PI / 2) + (idx - 1) * 0.4 * side;
      
      const segments = [
        { length: 18, angle: baseAngle + side * 0.3 },
        { length: 22, angle: baseAngle + side * 0.8 }
      ];
      
      this.legs.push({
        baseAngle,
        segments,
        targetX: 0,
        targetY: 0,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  public shootRope(targetX: number, targetY: number): boolean {
    if (this.ropeCount <= 0 || this.rope?.active) return false;
    
    this.ropeCount--;
    this.ropeCooldown = this.ropeCooldownTime;
    
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    this.rope = {
      active: false,
      anchorX: targetX,
      anchorY: targetY,
      length: dist,
      velocity: { x: 0, y: 0 },
      shooting: true,
      shootProgress: 0,
      shootStartX: this.x,
      shootStartY: this.y,
      targetX,
      targetY
    };
    
    return true;
  }

  public releaseRope(): void {
    if (this.rope && this.rope.active) {
      this.rope.active = false;
      this.rope = null;
      this.isFalling = true;
      this.fallStartY = this.y;
    }
  }

  public jump(): boolean {
    if (!this.jumpUnlocked || !this.hasJump || this.jumpCooldown > 0) return false;
    
    this.hasJump = false;
    this.jumping = true;
    this.jumpCooldown = 1;
    
    this.releaseRope();
    this.vy = -350;
    this.vx *= 1.2;
    
    for (let i = 0; i < 15; i++) {
      const angle = Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      this.jumpParticles.push({
        x: this.x,
        y: this.y + this.bodyRadius,
        vx: Math.cos(angle) * (50 + Math.random() * 100),
        vy: Math.sin(angle) * (50 + Math.random() * 100),
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        size: 3 + Math.random() * 4
      });
    }
    
    return true;
  }

  public collectCrystal(): void {
    this.crystalCount++;
    
    if (this.crystalCount >= this.crystalsForJump && !this.jumpUnlocked) {
      this.jumpUnlocked = true;
      this.hasJump = true;
      this.energyCoreActive = true;
    }
  }

  public takeDamage(): boolean {
    if (this.invulnerable > 0) return false;
    
    this.health--;
    this.invulnerable = 1.5;
    
    return this.health <= 0;
  }

  public update(dt: number, terrainHeight: number): void {
    if (this.invulnerable > 0) {
      this.invulnerable -= dt;
    }
    
    if (this.jumpCooldown > 0) {
      this.jumpCooldown -= dt;
    }
    
    if (this.ropeCooldown > 0) {
      this.ropeCooldown -= dt;
      if (this.ropeCooldown <= 0 && this.ropeCount < this.maxRopes) {
        this.ropeCount++;
        if (this.ropeCount < this.maxRopes) {
          this.ropeCooldown = this.ropeCooldownTime;
        } else {
          this.ropeCooldown = 0;
        }
      }
    }
    
    if (this.energyCoreActive) {
      const targetSize = 20;
      if (this.energyCoreSize < targetSize) {
        this.energyCoreSize += dt * 30;
        if (this.energyCoreSize > targetSize) this.energyCoreSize = targetSize;
      }
    }
    
    if (this.rope && this.rope.shooting) {
      this.rope.shootProgress += dt * 4;
      
      const t = this.rope.shootProgress;
      const sx = this.rope.shootStartX;
      const sy = this.rope.shootStartY;
      const tx = this.rope.targetX;
      const ty = this.rope.targetY;
      
      const currentX = sx + (tx - sx) * t;
      const currentY = sy + (ty - sy) * t - Math.sin(t * Math.PI) * 50;
      
      if (Math.random() < 0.3) {
        this.ropeParticles.push({
          x: currentX,
          y: currentY,
          life: 0.3 + Math.random() * 0.2,
          maxLife: 0.5,
          size: 1 + Math.random() * 2
        });
      }
      
      if (t >= 1) {
        this.rope.shooting = false;
        this.rope.active = true;
        
        const dx = this.x - this.rope.anchorX;
        const dy = this.y - this.rope.anchorY;
        this.rope.length = Math.sqrt(dx * dx + dy * dy);
        
        this.swingAngle = Math.atan2(dx, dy);
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        this.swingVelocity = speed / this.rope.length * (this.vx > 0 ? 1 : -1);
        
        this.isFalling = false;
      }
    }
    
    if (this.rope && this.rope.active) {
      const gravityForce = this.gravity / this.rope.length;
      this.swingVelocity += gravityForce * Math.sin(this.swingAngle) * dt;
      this.swingVelocity *= this.swingDamping;
      this.swingAngle += this.swingVelocity * dt;
      
      this.x = this.rope.anchorX + Math.sin(this.swingAngle) * this.rope.length;
      this.y = this.rope.anchorY + Math.cos(this.swingAngle) * this.rope.length;
      
      this.rotation = this.swingAngle * 0.3;
      
      this.legAnimPhase += Math.abs(this.swingVelocity) * dt * 3;
    } else {
      this.vy += this.gravity * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      
      this.vx *= 0.99;
      
      const targetRotation = 0;
      this.rotation += (targetRotation - this.rotation) * dt * 3;
      
      this.legAnimPhase += dt * 2;
    }
    
    if (!this.rope?.active && this.vy > 50) {
      this.isFalling = true;
    }
    
    const bottomY = terrainHeight - 50;
    if (this.y + this.bodyRadius > bottomY) {
      this.y = bottomY - this.bodyRadius;
      if (this.isFalling && this.fallStartY - this.y > this.bodyRadius * 4) {
        this.takeDamage();
      }
      this.vy = 0;
      this.vx *= 0.7;
      this.isFalling = false;
      this.fallStartY = this.y;
    }
    
    if (this.jumping) {
      if (Math.random() < 0.5) {
        this.jumpParticles.push({
          x: this.x + (Math.random() - 0.5) * 10,
          y: this.y + this.bodyRadius * 0.5,
          vx: (Math.random() - 0.5) * 20,
          vy: 30 + Math.random() * 50,
          life: 0.3 + Math.random() * 0.2,
          maxLife: 0.5,
          size: 2 + Math.random() * 3
        });
      }
      
      if (this.vy > 0) {
        this.jumping = false;
      }
    }
    
    for (let i = this.jumpParticles.length - 1; i >= 0; i--) {
      const p = this.jumpParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.jumpParticles.splice(i, 1);
      }
    }
    
    for (let i = this.ropeParticles.length - 1; i >= 0; i--) {
      const p = this.ropeParticles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.ropeParticles.splice(i, 1);
      }
    }
    
    this.updateLegTargetPositions();
  }

  private updateLegTargetPositions(): void {
    const swingIntensity = this.rope?.active ? Math.abs(this.swingVelocity) * 2 : 0.3;
    
    for (let i = 0; i < this.legs.length; i++) {
      const leg = this.legs[i];
      const side = i < 3 ? -1 : 1;
      const idx = i < 3 ? i : i - 3;
      
      const phase = this.legAnimPhase + leg.phase;
      const legSpread = 0.6 + swingIntensity * 0.5;
      const legLift = Math.sin(phase * 2 + idx) * 0.3;
      
      const baseDist = this.bodyRadius + 35;
      const verticalOffset = (idx - 1) * 12;
      
      leg.targetX = this.x + side * baseDist * legSpread + Math.sin(phase) * 8 * side;
      leg.targetY = this.y + verticalOffset + legLift * 15;
      
      const totalLength = leg.segments.reduce((sum, s) => sum + s.length, 0);
      const dx = leg.targetX - this.x;
      const dy = leg.targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clampedDist = Math.min(dist, totalLength * 0.95);
      
      const angle = Math.atan2(dy, dx);
      
      leg.segments[0].angle = angle + side * 0.4 * (1 - clampedDist / totalLength);
      leg.segments[1].angle = angle - side * 0.6 * (1 - clampedDist / totalLength);
    }
  }

  public draw(ctx: CanvasRenderingContext2D, cameraY: number): void {
    const screenY = this.y - cameraY;
    
    for (const p of this.jumpParticles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#00aaff';
      ctx.shadowColor = '#00aaff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y - cameraY, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    
    for (const p of this.ropeParticles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle = '#c0c0c0';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y - cameraY, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    
    if (this.rope && (this.rope.active || this.rope.shooting)) {
      this.drawRope(ctx, cameraY);
    }
    
    ctx.save();
    ctx.translate(this.x, screenY);
    ctx.rotate(this.rotation);
    
    if (this.invulnerable > 0 && Math.floor(this.invulnerable * 10) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }
    
    this.drawLegs(ctx);
    this.drawBody(ctx);
    
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private drawRope(ctx: CanvasRenderingContext2D, cameraY: number): void {
    if (!this.rope) return;
    
    let endX: number, endY: number;
    
    if (this.rope.shooting) {
      const t = this.rope.shootProgress;
      const sx = this.rope.shootStartX;
      const sy = this.rope.shootStartY;
      const tx = this.rope.targetX;
      const ty = this.rope.targetY;
      endX = sx + (tx - sx) * t;
      endY = sy + (ty - sy) * t - Math.sin(t * Math.PI) * 50;
    } else {
      endX = this.rope.anchorX;
      endY = this.rope.anchorY;
    }
    
    const gradient = ctx.createLinearGradient(this.x, this.y - cameraY, endX, endY - cameraY);
    gradient.addColorStop(0, 'rgba(200, 200, 220, 0.8)');
    gradient.addColorStop(0.5, 'rgba(180, 180, 200, 0.6)');
    gradient.addColorStop(1, 'rgba(200, 200, 220, 0.8)');
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.shadowBlur = 8;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - cameraY);
    
    if (this.rope.active && this.rope.length > 0) {
      const segments = 20;
      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const angle = this.swingAngle;
        const r = this.rope.length * t;
        const x = this.rope.anchorX + Math.sin(angle) * r;
        const y = this.rope.anchorY + Math.cos(angle) * r;
        ctx.lineTo(x, y - cameraY);
      }
    } else {
      ctx.lineTo(endX, endY - cameraY);
    }
    ctx.stroke();
    
    ctx.shadowBlur = 0;
    
    if (!this.rope.shooting) {
      ctx.fillStyle = '#aaa';
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(endX, endY - cameraY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  private drawBody(ctx: CanvasRenderingContext2D): void {
    const r = this.bodyRadius;
    
    const bodyGradient = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
    bodyGradient.addColorStop(0, '#e8e8f0');
    bodyGradient.addColorStop(0.5, '#b0b0c0');
    bodyGradient.addColorStop(1, '#707080');
    
    ctx.fillStyle = bodyGradient;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = '#8a8a9a';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.3, r * 0.7, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    if (this.energyCoreActive) {
      const coreR = this.energyCoreSize * 0.5;
      const coreGradient = ctx.createRadialGradient(0, r * 0.3, 0, 0, r * 0.3, coreR);
      coreGradient.addColorStop(0, '#fff');
      coreGradient.addColorStop(0.3, '#ffaa00');
      coreGradient.addColorStop(0.7, '#ff6600');
      coreGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
      
      ctx.fillStyle = coreGradient;
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(0, r * 0.3, coreR, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    
    const eyeSpacing = 10;
    const eyeY = -r * 0.2;
    
    for (let i = -1; i <= 1; i += 2) {
      ctx.fillStyle = '#2a2a3e';
      ctx.beginPath();
      ctx.ellipse(i * eyeSpacing, eyeY, 6, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#e94560';
      ctx.shadowColor = '#e94560';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(i * eyeSpacing, eyeY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    
    const plateLines = 4;
    ctx.strokeStyle = 'rgba(100, 100, 120, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i < plateLines; i++) {
      const y = -r * 0.5 + (i / (plateLines - 1)) * r;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, y);
      ctx.lineTo(r * 0.6, y);
      ctx.stroke();
    }
  }

  private drawLegs(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.legs.length; i++) {
      const leg = this.legs[i];
      const side = i < 3 ? -1 : 1;
      const idx = i < 3 ? i : i - 3;
      
      const baseX = side * this.bodyRadius * 0.7;
      const baseY = (idx - 1) * 10 - 2;
      
      let x = baseX;
      let y = baseY;
      
      for (let j = 0; j < leg.segments.length; j++) {
        const seg = leg.segments[j];
        const nextX = x + Math.cos(seg.angle) * seg.length;
        const nextY = y + Math.sin(seg.angle) * seg.length;
        
        const legGradient = ctx.createLinearGradient(x, y, nextX, nextY);
        legGradient.addColorStop(0, '#9090a0');
        legGradient.addColorStop(0.5, '#b0b0c0');
        legGradient.addColorStop(1, '#707080');
        
        ctx.strokeStyle = legGradient;
        ctx.lineWidth = 5 - j;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(nextX, nextY);
        ctx.stroke();
        
        ctx.fillStyle = '#e94560';
        ctx.shadowColor = '#e94560';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(nextX, nextY, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        x = nextX;
        y = nextY;
      }
      
      ctx.fillStyle = '#e94560';
      ctx.shadowColor = '#e94560';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(baseX, baseY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  public getFrontLegPosition(): { x: number; y: number } {
    return {
      x: this.x + Math.cos(this.rotation - Math.PI / 4) * this.bodyRadius * 1.5,
      y: this.y + Math.sin(this.rotation - Math.PI / 4) * this.bodyRadius * 1.5
    };
  }

  public getFeetY(): number {
    return this.y + this.bodyRadius;
  }
}
