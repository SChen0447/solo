export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'ripple' | 'explosion' | 'heart' | 'feather' | 'spark';
  rotation?: number;
  rotationSpeed?: number;
}

export class EffectManager {
  private particles: Particle[] = [];
  private maxParticles: number = 300;

  addRipple(x: number, y: number): void {
    this.particles.push({
      x, y,
      vx: 0, vy: 0,
      life: 600,
      maxLife: 600,
      size: 0,
      color: 'rgba(255, 255, 255, 0.8)',
      type: 'ripple'
    });
  }

  addExplosion(x: number, y: number, color: string, count: number = 30): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 800,
        maxLife: 800,
        size: 3 + Math.random() * 4,
        color,
        type: 'explosion'
      });
    }
  }

  addHeartFragments(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1500,
        maxLife: 1500,
        size: 2 + Math.random() * 2,
        color: '#e74c3c',
        type: 'heart'
      });
    }
  }

  addFeather(x: number, y: number, color: string): void {
    if (this.particles.filter(p => p.type === 'feather').length >= 50) return;
    this.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 0.5,
      vy: 1,
      life: 10000,
      maxLife: 10000,
      size: 8,
      color,
      type: 'feather',
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.1
    });
  }

  addSpark(x: number, y: number, color: string): void {
    this.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      life: 500,
      maxLife: 500,
      size: 2 + Math.random() * 2,
      color,
      type: 'spark'
    });
  }

  update(deltaTime: number): void {
    const factor = deltaTime / 16.67;
    
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;

      if (p.type === 'ripple') {
        p.size = (1 - p.life / p.maxLife) * 60;
      } else if (p.type === 'feather') {
        p.x += p.vx * factor;
        p.y += p.vy * factor;
        if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
          p.rotation += p.rotationSpeed * factor;
        }
      } else {
        p.x += p.vx * factor;
        p.y += p.vy * factor;
        if (p.type !== 'spark') {
          p.vy += 0.1 * factor;
        }
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    if (this.particles.length > this.maxParticles) {
      this.particles = this.particles.slice(-this.maxParticles);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.type === 'ripple') {
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'feather') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        this.drawFeather(ctx, p.color, p.size);
      } else {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        if (p.type === 'heart') {
          this.drawHeart(ctx, p.x, p.y, p.size);
        } else {
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  private drawFeather(ctx: CanvasRenderingContext2D, color: string, size: number): void {
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(0, size * 0.5, size * 0.75, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(0, size * 0.9, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.beginPath();
    const s = size * 0.3;
    ctx.moveTo(x, y + s);
    ctx.bezierCurveTo(x, y, x - s, y, x - s, y + s);
    ctx.bezierCurveTo(x - s, y + s * 2, x, y + s * 3, x, y + s * 3);
    ctx.bezierCurveTo(x, y + s * 3, x + s, y + s * 2, x + s, y + s);
    ctx.bezierCurveTo(x + s, y, x, y, x, y + s);
    ctx.fill();
  }

  clear(): void {
    this.particles = [];
  }

  isPointInPauseButton(px: number, py: number, btnX: number, btnY: number, radius: number, scale: number = 1): boolean {
    const dx = px - btnX;
    const dy = py - btnY;
    return dx * dx + dy * dy <= (radius * scale) * (radius * scale);
  }

  renderPauseButton(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, hovered: boolean): void {
    const scale = hovered ? 1.2 : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    
    ctx.fillStyle = '#feca57';
    ctx.shadowColor = '#feca57';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#0b0e27';
    ctx.shadowBlur = 0;
    ctx.fillRect(-6, -8, 4, 16);
    ctx.fillRect(2, -8, 4, 16);
    
    if (hovered) {
      ctx.fillStyle = '#fff';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('暂停', 0, radius + 20);
    }
    
    ctx.restore();
  }

  renderGlassPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}
