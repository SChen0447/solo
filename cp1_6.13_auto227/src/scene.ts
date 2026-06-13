import { Player } from './player';

export interface Star {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  phase: number;
  period: number;
}

export interface Fragment {
  x: number;
  y: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  scale: number;
  targetScale: number;
  spawning: boolean;
  spawnTimer: number;
  spawnDuration: number;
  attracted: boolean;
  attractSpeed: number;
  color1: string;
  color2: string;
  trail: { x: number; y: number; alpha: number }[];
}

export interface PulseParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  radius: number;
  life: number;
  maxLife: number;
}

export class Scene {
  stars: Star[] = [];
  starCount: number = 80;
  fragments: Fragment[] = [];
  maxFragments: number = 20;
  fragmentSpawnTimer: number = 0;
  fragmentSpawnInterval: number = 2.5;
  pulseParticles: PulseParticle[] = [];
  gridOffsetX: number = 0;
  gridOffsetY: number = 0;
  gridSize: number = 60;
  score: number = 0;
  fragmentsCollected: number = 0;
  survivalTime: number = 0;
  gameOver: boolean = false;
  pulseWave: { x: number; y: number; radius: number; maxRadius: number; speed: number; alpha: number; active: boolean } = {
    x: 0, y: 0, radius: 20, maxRadius: 120, speed: 600, alpha: 0.8, active: false
  };
  energyBarFlash: boolean = false;
  energyBarFlashTimer: number = 0;
  canvasWidth: number;
  canvasHeight: number;

  constructor(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.initStars();
  }

  initStars(): void {
    for (let i = 0; i < this.starCount; i++) {
      this.stars.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        radius: 1 + Math.random() * 3,
        baseAlpha: 0.2 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        period: 3 + Math.random() * 2
      });
    }
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.stars = [];
    this.initStars();
  }

  spawnFragment(): void {
    if (this.fragments.length >= this.maxFragments) return;
    
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const padding = 80;
      this.fragments.push({
        x: padding + Math.random() * (this.canvasWidth - padding * 2),
        y: padding + Math.random() * (this.canvasHeight - padding * 2),
        size: 8,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 2,
        scale: 0,
        targetScale: 1,
        spawning: true,
        spawnTimer: 0,
        spawnDuration: 0.3,
        attracted: false,
        attractSpeed: 400,
        color1: '#feca57',
        color2: '#ff9ff3',
        trail: []
      });
    }
  }

  update(deltaTime: number, player: Player): void {
    if (this.gameOver) return;
    
    this.survivalTime += deltaTime;
    
    const gridSpeed = 0.3;
    this.gridOffsetX += player.velocityX * deltaTime * gridSpeed;
    this.gridOffsetY += player.velocityY * deltaTime * gridSpeed;
    
    this.fragmentSpawnTimer += deltaTime;
    if (this.fragmentSpawnTimer >= this.fragmentSpawnInterval) {
      this.fragmentSpawnTimer = 0;
      this.fragmentSpawnInterval = 2 + Math.random();
      this.spawnFragment();
    }
    
    if (player.canReleasePulse() && !this.energyBarFlash) {
      this.energyBarFlash = true;
    }
    if (this.energyBarFlash) {
      this.energyBarFlashTimer += deltaTime;
    }
    
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const frag = this.fragments[i];
      
      if (frag.spawning) {
        frag.spawnTimer += deltaTime;
        const t = frag.spawnTimer / frag.spawnDuration;
        if (t >= 1) {
          frag.spawning = false;
          frag.scale = 1;
        } else {
          const elasticT = this.elasticOut(t);
          frag.scale = elasticT;
        }
      }
      
      frag.rotation += frag.rotationSpeed * deltaTime;
      
      const dx = player.x - frag.x;
      const dy = player.y - frag.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 25 + player.radius) {
        frag.attracted = true;
      }
      
      if (frag.attracted) {
        const dirX = dx / dist;
        const dirY = dy / dist;
        frag.x += dirX * frag.attractSpeed * deltaTime;
        frag.y += dirY * frag.attractSpeed * deltaTime;
        
        frag.trail.push({ x: frag.x, y: frag.y, alpha: 0.6 });
        if (frag.trail.length > 6) {
          frag.trail.shift();
        }
        for (let j = 0; j < frag.trail.length; j++) {
          frag.trail[j].alpha = 0.6 * (j / frag.trail.length);
        }
        
        if (dist < player.radius + 5) {
          player.addEnergy(15);
          this.fragmentsCollected++;
          this.score += 100;
          this.fragments.splice(i, 1);
          continue;
        }
      }
    }
    
    if (this.pulseWave.active) {
      this.pulseWave.radius += this.pulseWave.speed * deltaTime;
      this.pulseWave.alpha = 0.8 * (1 - this.pulseWave.radius / this.pulseWave.maxRadius);
      if (this.pulseWave.radius >= this.pulseWave.maxRadius) {
        this.pulseWave.active = false;
      }
    }
    
    for (let i = this.pulseParticles.length - 1; i >= 0; i--) {
      const p = this.pulseParticles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.life -= deltaTime;
      p.alpha = (p.life / p.maxLife) * 0.8;
      p.radius *= 0.98;
      
      if (p.life <= 0) {
        this.pulseParticles.splice(i, 1);
      }
    }
  }

  elasticOut(t: number): number {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
  }

  triggerPulse(x: number, y: number): void {
    this.pulseWave = {
      x, y,
      radius: 20,
      maxRadius: 120,
      speed: 600,
      alpha: 0.8,
      active: true
    };
    
    const particleCount = 30;
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 150 + Math.random() * 100;
      this.pulseParticles.push({
        x: x + Math.cos(angle) * 25,
        y: y + Math.sin(angle) * 25,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 0.8,
        radius: 2 + Math.random() * 3,
        life: 0.6,
        maxLife: 0.6
      });
    }
  }

  drawBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
    gradient.addColorStop(0, '#12182b');
    gradient.addColorStop(0.5, '#1c2541');
    gradient.addColorStop(1, '#0b132b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }

  drawStars(ctx: CanvasRenderingContext2D, time: number): void {
    for (const star of this.stars) {
      const pulse = Math.sin(time / star.period * Math.PI * 2 + star.phase);
      const alpha = star.baseAlpha + pulse * 0.15;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, Math.min(1, alpha))})`;
      ctx.fill();
    }
  }

  drawHexGrid(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = 'rgba(42, 58, 92, 0.15)';
    ctx.lineWidth = 0.5;
    
    const hexHeight = this.gridSize * Math.sqrt(3);
    const hexWidth = this.gridSize * 2;
    const horizSpacing = hexWidth * 0.75;
    
    const offsetX = this.gridOffsetX % (horizSpacing * 2);
    const offsetY = this.gridOffsetY % (hexHeight * 2);
    
    for (let row = -2; row < this.canvasHeight / hexHeight + 2; row++) {
      for (let col = -2; col < this.canvasWidth / horizSpacing + 2; col++) {
        const x = col * horizSpacing + (row % 2 === 0 ? 0 : horizSpacing / 2) + offsetX;
        const y = row * hexHeight / 2 + offsetY;
        this.drawHexagon(ctx, x, y, this.gridSize);
      }
    }
  }

  drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
      const px = x + Math.cos(angle) * size;
      const py = y + Math.sin(angle) * size;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.stroke();
  }

  drawFragments(ctx: CanvasRenderingContext2D): void {
    for (const frag of this.fragments) {
      for (let i = 0; i < frag.trail.length; i++) {
        const t = frag.trail[i];
        ctx.beginPath();
        ctx.arc(t.x, t.y, frag.size * 0.4 * (i / frag.trail.length), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(254, 202, 87, ${t.alpha * 0.5})`;
        ctx.fill();
      }
      
      ctx.save();
      ctx.translate(frag.x, frag.y);
      ctx.rotate(frag.rotation);
      ctx.scale(frag.scale, frag.scale);
      
      ctx.shadowColor = '#feca57';
      ctx.shadowBlur = 8;
      
      const gradient = ctx.createLinearGradient(-frag.size, -frag.size, frag.size, frag.size);
      gradient.addColorStop(0, frag.color1);
      gradient.addColorStop(1, frag.color2);
      
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const px = Math.cos(angle) * frag.size;
        const py = Math.sin(angle) * frag.size;
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
      
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  drawPulseWave(ctx: CanvasRenderingContext2D): void {
    if (!this.pulseWave.active) return;
    
    const { x, y, radius, alpha } = this.pulseWave;
    
    const gradient = ctx.createRadialGradient(x, y, radius * 0.8, x, y, radius);
    gradient.addColorStop(0, `rgba(72, 219, 251, 0)`);
    gradient.addColorStop(0.5, `rgba(72, 219, 251, ${alpha * 0.5})`);
    gradient.addColorStop(1, `rgba(255, 255, 255, ${alpha})`);
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 4;
    ctx.stroke();
    
    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glowGradient.addColorStop(0, 'rgba(72, 219, 251, 0)');
    glowGradient.addColorStop(0.85, 'rgba(72, 219, 251, 0)');
    glowGradient.addColorStop(1, `rgba(72, 219, 251, ${alpha * 0.3})`);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = glowGradient;
    ctx.fill();
  }

  drawPulseParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.pulseParticles) {
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${p.alpha})`);
      gradient.addColorStop(0.5, `rgba(72, 219, 251, ${p.alpha * 0.7})`);
      gradient.addColorStop(1, 'rgba(72, 219, 251, 0)');
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }

  drawEnergyBar(ctx: CanvasRenderingContext2D, energy: number, maxEnergy: number): void {
    const centerX = 90;
    const centerY = 90;
    const radius = 60;
    const barWidth = 8;
    
    const glassGradient = ctx.createRadialGradient(centerX, centerY, radius - 15, centerX, centerY, radius + 15);
    glassGradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    glassGradient.addColorStop(1, 'rgba(255, 255, 251, 0.04)');
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 12, Math.PI, Math.PI * 2);
    ctx.lineWidth = barWidth + 16;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, Math.PI * 2);
    ctx.lineWidth = barWidth + 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, Math.PI, Math.PI * 2);
    ctx.lineWidth = barWidth;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.stroke();
    
    const progress = energy / maxEnergy;
    const startAngle = Math.PI;
    const endAngle = Math.PI + Math.PI * progress;
    
    if (progress > 0) {
      const barGradient = ctx.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
      barGradient.addColorStop(0, '#48dbfb');
      barGradient.addColorStop(1, '#00d2ff');
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.lineWidth = barWidth;
      ctx.strokeStyle = barGradient;
      ctx.lineCap = 'round';
      ctx.stroke();
      
      ctx.shadowColor = '#48dbfb';
      ctx.shadowBlur = this.energyBarFlash ? 15 : 8;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.lineWidth = barWidth * 0.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('能量', centerX, centerY - radius + 5);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`${Math.floor(energy)}%`, centerX, centerY + 8);
    
    ctx.restore();
  }

  drawScoreboard(ctx: CanvasRenderingContext2D): void {
    const x = this.canvasWidth - 180;
    const y = 30;
    const width = 160;
    const height = 80;
    
    this.drawGlassPanel(ctx, x, y, width, height, 8);
    
    ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
    ctx.shadowBlur = 5;
    
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`躲避时间: ${this.survivalTime.toFixed(1)}s`, x + 15, y + 30);
    ctx.fillText(`碎片收集: ${this.fragmentsCollected}`, x + 15, y + 55);
    ctx.fillText(`得分: ${this.score}`, x + 15, y + 80);
    
    ctx.shadowBlur = 0;
  }

  drawGlassPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.save();
    
    const gradient = ctx.createLinearGradient(x, y, x, y + h);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.06)');
    
    this.roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.restore();
  }

  roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  drawGameOver(ctx: CanvasRenderingContext2D): void {
    if (!this.gameOver) return;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    
    const panelW = 320;
    const panelH = 280;
    const panelX = (this.canvasWidth - panelW) / 2;
    const panelY = (this.canvasHeight - panelH) / 2;
    
    this.drawGlassPanel(ctx, panelX, panelY, panelW, panelH, 12);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#48dbfb';
    ctx.shadowBlur = 10;
    ctx.fillText('游戏结束', this.canvasWidth / 2, panelY + 50);
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '18px sans-serif';
    ctx.fillText(`最终得分: ${this.score}`, this.canvasWidth / 2, panelY + 95);
    ctx.fillText(`躲避时间: ${this.survivalTime.toFixed(1)}秒`, this.canvasWidth / 2, panelY + 125);
    ctx.fillText(`收集碎片: ${this.fragmentsCollected}个`, this.canvasWidth / 2, panelY + 155);
    
    const btnW = 140;
    const btnH = 45;
    const btnX = (this.canvasWidth - btnW) / 2;
    const btnY = panelY + panelH - 65;
    
    const btnGradient = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY);
    btnGradient.addColorStop(0, '#48dbfb');
    btnGradient.addColorStop(1, '#00d2ff');
    
    this.roundRect(ctx, btnX, btnY, btnW, btnH, 8);
    ctx.fillStyle = btnGradient;
    ctx.shadowColor = '#48dbfb';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('再来一局', this.canvasWidth / 2, btnY + 30);
  }

  isRestartButtonClicked(mx: number, my: number): boolean {
    if (!this.gameOver) return false;
    const btnW = 140;
    const btnH = 45;
    const btnX = (this.canvasWidth - btnW) / 2;
    const btnY = (this.canvasHeight - 280) / 2 + 280 - 65;
    return mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH;
  }

  reset(): void {
    this.fragments = [];
    this.pulseParticles = [];
    this.fragmentSpawnTimer = 0;
    this.score = 0;
    this.fragmentsCollected = 0;
    this.survivalTime = 0;
    this.gameOver = false;
    this.pulseWave.active = false;
    this.energyBarFlash = false;
    this.energyBarFlashTimer = 0;
    this.gridOffsetX = 0;
    this.gridOffsetY = 0;
  }

  getTotalParticles(): number {
    return this.stars.length + this.fragments.length * 6 + this.pulseParticles.length;
  }
}
