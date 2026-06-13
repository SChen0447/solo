import gsap from 'gsap';

export class Particle {
  x: number;
  y: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  color: string;
  baseColor: string;
  warmColor: string;
  glowSize: number;
  life: number;
  maxLife: number;
  isTrail: boolean;
  angle: number;
  orbitRadius: number;
  group: number;

  constructor() {
    this.x = 0;
    this.y = 0;
    this.ox = 0;
    this.oy = 0;
    this.vx = 0;
    this.vy = 0;
    this.radius = 2;
    this.baseRadius = 2;
    this.color = '#88ccff';
    this.baseColor = '#88ccff';
    this.warmColor = '#ffaa33';
    this.glowSize = 1.5;
    this.life = 1;
    this.maxLife = 1;
    this.isTrail = false;
    this.angle = 0;
    this.orbitRadius = 0;
    this.group = 0;
  }
}

interface Star {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  opacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

export class ParticleSystem {
  particles: Particle[];
  trailParticles: Particle[];
  stars: Star[];
  centerX: number;
  centerY: number;
  baseRadius: number;
  rotation: number;
  rotationSpeed: number;
  connectionWidth: number;
  trailCount: number;
  bounceDuration: number;
  isWarmMode: boolean;
  colorTransition: number;
  targetColorTransition: number;
  scale: number;
  targetScale: number;
  isAnimating: boolean;
  splitProgress: number;
  splitOffset: number;
  particleCount: number;
  maxConnectionDistance: number;
  warmModeTimer: number;

  constructor() {
    this.particles = [];
    this.trailParticles = [];
    this.stars = [];
    this.centerX = 0;
    this.centerY = 0;
    this.baseRadius = 150;
    this.rotation = 0;
    this.rotationSpeed = (Math.PI * 2) / 10 / 60;
    this.connectionWidth = 1.5;
    this.trailCount = 25;
    this.bounceDuration = 2;
    this.isWarmMode = false;
    this.colorTransition = 0;
    this.targetColorTransition = 0;
    this.scale = 1;
    this.targetScale = 1;
    this.isAnimating = false;
    this.splitProgress = 0;
    this.splitOffset = 0;
    this.particleCount = 650;
    this.maxConnectionDistance = 50;
    this.warmModeTimer = 0;
  }

  init(count: number, centerX: number, centerY: number, radius: number): void {
    this.particleCount = count;
    this.centerX = centerX;
    this.centerY = centerY;
    this.baseRadius = radius;
    this.particles = [];

    for (let i = 0; i < count; i++) {
      const particle = new Particle();
      
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = radius * Math.cbrt(Math.random());
      
      particle.ox = r * Math.sin(phi) * Math.cos(theta);
      particle.oy = r * Math.sin(phi) * Math.sin(theta);
      particle.x = particle.ox + centerX;
      particle.y = particle.oy + centerY;
      particle.angle = theta;
      particle.orbitRadius = r;
      particle.group = i % 2;
      
      particle.baseRadius = 1.5 + Math.random() * 1.5;
      particle.radius = particle.baseRadius;
      particle.glowSize = 1.5;
      
      const hue = 200 + Math.random() * 30;
      const sat = 70 + Math.random() * 20;
      const light = 70 + Math.random() * 20;
      particle.baseColor = `hsla(${hue}, ${sat}%, ${light}%, 1)`;
      particle.warmColor = `hsla(${30 + Math.random() * 30}, 100%, ${60 + Math.random() * 20}%, 1)`;
      particle.color = particle.baseColor;
      
      this.particles.push(particle);
    }

    this.initStars();
  }

  initStars(): void {
    this.stars = [];
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        size: 1 + Math.random() * 2,
        baseOpacity: 0.3 + Math.random() * 0.7,
        opacity: 0.5,
        twinkleSpeed: 1 + Math.random() * 2,
        twinkleOffset: Math.random() * Math.PI * 2
      });
    }
  }

  resize(centerX: number, centerY: number, radius: number): void {
    this.centerX = centerX;
    this.centerY = centerY;
    if (!this.isAnimating) {
      this.baseRadius = radius;
      this.updateParticleOrbits();
    }
  }

  updateParticleOrbits(): void {
    this.particles.forEach((p, i) => {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = this.baseRadius * Math.cbrt(Math.random());
      
      p.ox = r * Math.sin(phi) * Math.cos(theta);
      p.oy = r * Math.sin(phi) * Math.sin(theta);
      p.angle = theta;
      p.orbitRadius = r;
    });
  }

  update(dt: number, time: number): void {
    this.rotation += this.rotationSpeed * dt * 60;
    
    const scaleDiff = this.targetScale - this.scale;
    this.scale += scaleDiff * 0.08;

    const colorDiff = this.targetColorTransition - this.colorTransition;
    this.colorTransition += colorDiff * 0.05;
    this.isWarmMode = this.colorTransition > 0.1;

    if (this.warmModeTimer > 0) {
      this.warmModeTimer -= dt;
      if (this.warmModeTimer <= 0) {
        this.targetColorTransition = 0;
      }
    }

    this.updateMainParticles(dt, time);
    this.updateTrailParticles(dt);
    this.updateStars(dt, time);
  }

  updateMainParticles(dt: number, time: number): void {
    const particles = this.particles;
    const len = particles.length;

    if (this.isAnimating) {
      this.updateSplitAnimation(dt, time);
    } else {
      for (let i = 0; i < len; i++) {
        const p = particles[i];
        
        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);
        const rx = p.ox * cos - p.oy * sin;
        const ry = p.ox * sin + p.oy * cos;
        
        const targetX = this.centerX + rx * this.scale;
        const targetY = this.centerY + ry * this.scale;
        
        p.x += (targetX - p.x) * 0.08;
        p.y += (targetY - p.y) * 0.08;
      }
    }

    for (let i = 0; i < len; i++) {
      const p = particles[i];
      const t = this.colorTransition;
      p.color = this.lerpColor(p.baseColor, p.warmColor, t);
      p.radius = p.baseRadius * (1 + t * 0.3);
      p.glowSize = 1.5 + t * 2;
    }
  }

  updateSplitAnimation(dt: number, time: number): void {
    const halfLen = Math.floor(this.particles.length / 2);
    const offset = this.splitOffset * this.baseRadius * 0.5;
    
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const group = p.group;
      
      const groupOffset = group === 0 ? -offset : offset;
      const groupRotation = this.rotation * (group === 0 ? 1.2 : -0.8);
      
      const cos = Math.cos(groupRotation);
      const sin = Math.sin(groupRotation);
      const rx = p.ox * cos - p.oy * sin;
      const ry = p.ox * sin + p.oy * cos;
      
      const targetX = this.centerX + groupOffset + rx * this.scale;
      const targetY = this.centerY + ry * this.scale;
      
      p.x += (targetX - p.x) * 0.05;
      p.y += (targetY - p.y) * 0.05;
    }
  }

  updateTrailParticles(dt: number): void {
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const p = this.trailParticles[i];
      p.life -= dt;
      
      if (p.life <= 0) {
        this.trailParticles.splice(i, 1);
        continue;
      }
      
      const lifeRatio = p.life / p.maxLife;
      p.radius = p.baseRadius * lifeRatio;
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.vx *= 0.98;
      p.vy *= 0.98;
    }
  }

  updateStars(dt: number, time: number): void {
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      star.opacity = star.baseOpacity * (0.5 + 0.5 * Math.sin(time * star.twinkleSpeed + star.twinkleOffset));
    }
  }

  render(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number): void {
    this.renderStars(ctx, canvasWidth, canvasHeight);
    this.renderConnections(ctx);
    this.renderTrailParticles(ctx);
    this.renderMainParticles(ctx);
  }

  renderStars(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      ctx.beginPath();
      ctx.arc(star.x * w, star.y * h, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
      ctx.fill();
    }
  }

  renderConnections(ctx: CanvasRenderingContext2D): void {
    const particles = this.particles;
    const len = particles.length;
    const maxDist = this.maxConnectionDistance;
    const width = this.connectionWidth;
    
    ctx.lineWidth = width;
    ctx.strokeStyle = `rgba(150, 180, 255, 0.3)`;
    
    const sampleRate = Math.max(1, Math.floor(len / 150));
    
    for (let i = 0; i < len; i += sampleRate) {
      const p1 = particles[i];
      for (let j = i + sampleRate; j < len; j += sampleRate) {
        const p2 = particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < maxDist) {
          const alpha = (1 - dist / maxDist) * 0.3;
          if (this.isWarmMode) {
            ctx.strokeStyle = `rgba(255, 170, 80, ${alpha})`;
          } else {
            ctx.strokeStyle = `rgba(150, 180, 255, ${alpha})`;
          }
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }
    }
  }

  renderMainParticles(ctx: CanvasRenderingContext2D): void {
    const particles = this.particles;
    const len = particles.length;
    
    for (let i = 0; i < len; i++) {
      const p = particles[i];
      
      const gradient = ctx.createRadialGradient(
        p.x, p.y, 0,
        p.x, p.y, p.radius * (1 + p.glowSize)
      );
      
      const baseColor = this.isWarmMode ? '255, 150, 50' : '100, 180, 255';
      gradient.addColorStop(0, `rgba(${baseColor}, 1)`);
      gradient.addColorStop(0.4, `rgba(${baseColor}, 0.6)`);
      gradient.addColorStop(1, `rgba(${baseColor}, 0)`);
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * (1 + p.glowSize), 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
  }

  renderTrailParticles(ctx: CanvasRenderingContext2D): void {
    const particles = this.trailParticles;
    
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const lifeRatio = p.life / p.maxLife;
      
      const gradient = ctx.createRadialGradient(
        p.x, p.y, 0,
        p.x, p.y, p.radius * 2
      );
      
      gradient.addColorStop(0, `rgba(255, 180, 80, ${lifeRatio * 0.8})`);
      gradient.addColorStop(1, `rgba(255, 100, 30, 0)`);
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 200, 100, ${lifeRatio})`;
      ctx.fill();
    }
  }

  applyStretch(targetX: number, targetY: number, intensity: number): void {
    const dx = targetX - this.centerX;
    const dy = targetY - this.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 1) return;
    
    const maxStretch = this.baseRadius * 0.5;
    const stretchAmount = Math.min(dist * intensity * 0.005, maxStretch);
    
    const dirX = dx / dist;
    const dirY = dy / dist;
    
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      
      const cos = Math.cos(this.rotation);
      const sin = Math.sin(this.rotation);
      const rx = p.ox * cos - p.oy * sin;
      const ry = p.ox * sin + p.oy * cos;
      
      const dot = rx * dirX + ry * dirY;
      const stretchFactor = dot / this.baseRadius;
      
      const baseX = this.centerX + rx * this.scale;
      const baseY = this.centerY + ry * this.scale;
      
      const stretchedX = baseX + dirX * stretchAmount * Math.max(0, stretchFactor) * 1.5;
      const stretchedY = baseY + dirY * stretchAmount * Math.max(0, stretchFactor) * 1.5;
      
      p.x += (stretchedX - p.x) * 0.15;
      p.y += (stretchedY - p.y) * 0.15;
    }
  }

  bounceBack(): void {
    const duration = this.bounceDuration;
    
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      
      gsap.to(p, {
        x: this.centerX + (p.ox * Math.cos(this.rotation) - p.oy * Math.sin(this.rotation)) * this.scale,
        y: this.centerY + (p.ox * Math.sin(this.rotation) + p.oy * Math.cos(this.rotation)) * this.scale,
        duration: duration,
        ease: 'power2.out'
      });
    }
  }

  spawnTrail(x: number, y: number, count: number, vx: number, vy: number): void {
    const numToSpawn = Math.min(count, this.trailCount);
    
    for (let i = 0; i < numToSpawn; i++) {
      const p = new Particle();
      p.isTrail = true;
      p.x = x + (Math.random() - 0.5) * 10;
      p.y = y + (Math.random() - 0.5) * 10;
      p.vx = vx * 0.3 + (Math.random() - 0.5) * 2;
      p.vy = vy * 0.3 + (Math.random() - 0.5) * 2;
      p.baseRadius = 4 + Math.random() * 4;
      p.radius = p.baseRadius;
      p.maxLife = 1;
      p.life = 1;
      
      this.trailParticles.push(p);
    }
    
    if (this.trailParticles.length > 200) {
      this.trailParticles.splice(0, this.trailParticles.length - 200);
    }
  }

  triggerWarmMode(duration: number): void {
    this.targetColorTransition = 1;
    this.warmModeTimer = duration;
  }

  triggerSplitAnimation(): void {
    if (this.isAnimating) return;
    this.isAnimating = true;
    
    const tl = gsap.timeline({
      onComplete: () => {
        this.isAnimating = false;
        this.targetScale = 1;
        this.splitProgress = 0;
        this.splitOffset = 0;
        this.targetColorTransition = 0;
      }
    });

    tl.to(this, {
      targetScale: 0.6,
      duration: 3,
      ease: 'power2.inOut'
    });

    tl.to(this, {
      targetScale: 1.1,
      duration: 0.8,
      ease: 'elastic.out(1, 0.5)'
    });

    tl.to(this, {
      targetScale: 0.95,
      duration: 0.5,
      ease: 'power2.inOut'
    });

    tl.to(this, {
      targetScale: 1.05,
      duration: 0.4,
      ease: 'elastic.out(1, 0.5)'
    });

    tl.to(this, {
      splitOffset: 1,
      targetScale: 0.85,
      duration: 3,
      ease: 'power2.inOut'
    });

    tl.to(this, {
      targetColorTransition: 0.5,
      duration: 2,
      ease: 'power2.inOut'
    }, '-=2');

    const orbitRotation = { value: 0 };
    tl.to(orbitRotation, {
      value: Math.PI * 4,
      duration: 22,
      ease: 'none',
      onUpdate: () => {
        this.rotation += 0.01;
      }
    }, '-=18');

    tl.to(this, {
      splitOffset: 0,
      targetScale: 1,
      targetColorTransition: 0,
      duration: 5,
      ease: 'power3.inOut'
    });
  }

  setConnectionWidth(width: number): void {
    this.connectionWidth = width;
  }

  setBounceDuration(seconds: number): void {
    this.bounceDuration = seconds;
  }

  setTrailCount(count: number): void {
    this.trailCount = count;
  }

  lerpColor(color1: string, color2: string, t: number): string {
    const c1 = this.parseColor(color1);
    const c2 = this.parseColor(color2);
    
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    const a = c1.a + (c2.a - c1.a) * t;
    
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  parseColor(color: string): { r: number; g: number; b: number; a: number } {
    if (color.startsWith('hsla')) {
      return { r: 136, g: 204, b: 255, a: 1 };
    }
    
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3]),
        a: match[4] ? parseFloat(match[4]) : 1
      };
    }
    
    return { r: 136, g: 204, b: 255, a: 1 };
  }
}
