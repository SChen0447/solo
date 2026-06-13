import type { Point, Glyph } from './glyph';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

export interface CompletedStroke {
  points: Point[];
  solidified: boolean;
  burnProgress: number;
  fadeAlpha: number;
  energized: boolean;
}

export interface RendererState {
  stoneCanvas: HTMLCanvasElement;
  stoneCtx: CanvasRenderingContext2D;
  cracks: Point[][];
  activeParticles: Particle[];
  drawingStroke: Point[];
  completedStrokes: CompletedStroke[];
  energyFlow: {
    active: boolean;
    progress: number;
    strokeIndex: number;
    pathLength: number;
    currentPoint: Point;
  };
  coreGlow: number;
  corePulse: number;
  auraWave: {
    active: boolean;
    radius: number;
    alpha: number;
  };
  aurora: {
    active: boolean;
    progress: number;
  };
  magicCircle: {
    active: boolean;
    rotation: number;
    particles: Particle[];
    lightPulse: number;
  };
  hintGlyph: {
    visible: boolean;
    alpha: number;
    fadeDirection: number;
    glyph: Glyph | null;
    timer: number;
  };
  lightBridge: {
    active: boolean;
    alpha: number;
    tiles: { x: number; y: number; alpha: number }[];
  };
  failFlash: {
    active: boolean;
    progress: number;
    originPoint: Point | null;
  };
  scale: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private stoneX: number = 0;
  private stoneY: number = 0;
  private stoneWidth: number = 0;
  private stoneHeight: number = 0;
  public state: RendererState;
  private audioContext: AudioContext | null = null;
  private noiseSeed: number = Math.random() * 1000;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.state = this.createInitialState();
    this.calculateStoneDimensions();
    this.generateStoneTexture();
    this.generateCracks();
  }

  private createInitialState(): RendererState {
    const stoneCanvas = document.createElement('canvas');
    return {
      stoneCanvas,
      stoneCtx: stoneCanvas.getContext('2d')!,
      cracks: [],
      activeParticles: [],
      drawingStroke: [],
      completedStrokes: [],
      energyFlow: {
        active: false,
        progress: 0,
        strokeIndex: 0,
        pathLength: 0,
        currentPoint: { x: 0, y: 0 }
      },
      coreGlow: 0,
      corePulse: 0,
      auraWave: {
        active: false,
        radius: 40,
        alpha: 0
      },
      aurora: {
        active: false,
        progress: 0
      },
      magicCircle: {
        active: false,
        rotation: 0,
        particles: [],
        lightPulse: 0
      },
      hintGlyph: {
        visible: false,
        alpha: 0,
        fadeDirection: 0,
        glyph: null,
        timer: 0
      },
      lightBridge: {
        active: false,
        alpha: 0,
        tiles: []
      },
      failFlash: {
        active: false,
        progress: 0,
        originPoint: null
      },
      scale: 1
    };
  }

  private calculateStoneDimensions(): void {
    const isMobile = this.width < 768;
    this.state.scale = Math.min(1, this.width / 1920);
    
    if (isMobile) {
      this.stoneWidth = this.width * 0.7;
      this.stoneHeight = this.stoneWidth * 1.25;
      this.stoneX = (this.width - this.stoneWidth) / 2;
      this.stoneY = (this.height - this.stoneHeight) / 2;
    } else {
      this.stoneWidth = this.width * 0.4;
      this.stoneHeight = this.height * 0.5;
      this.stoneX = this.width * 0.3 - this.stoneWidth / 2;
      this.stoneY = (this.height - this.stoneHeight) / 2;
    }
  }

  private noise2D(x: number, y: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + this.noiseSeed) * 43758.5453;
    return n - Math.floor(n);
  }

  private smoothNoise(x: number, y: number): number {
    const corners = (
      this.noise2D(x - 1, y - 1) +
      this.noise2D(x + 1, y - 1) +
      this.noise2D(x - 1, y + 1) +
      this.noise2D(x + 1, y + 1)
    ) / 16;
    const sides = (
      this.noise2D(x - 1, y) +
      this.noise2D(x + 1, y) +
      this.noise2D(x, y - 1) +
      this.noise2D(x, y + 1)
    ) / 8;
    const center = this.noise2D(x, y) / 4;
    return corners + sides + center;
  }

  private interpolatedNoise(x: number, y: number): number {
    const intX = Math.floor(x);
    const fracX = x - intX;
    const intY = Math.floor(y);
    const fracY = y - intY;

    const v1 = this.smoothNoise(intX, intY);
    const v2 = this.smoothNoise(intX + 1, intY);
    const v3 = this.smoothNoise(intX, intY + 1);
    const v4 = this.smoothNoise(intX + 1, intY + 1);

    const i1 = v1 * (1 - fracX) + v2 * fracX;
    const i2 = v3 * (1 - fracX) + v4 * fracX;

    return i1 * (1 - fracY) + i2 * fracY;
  }

  private perlinNoise(x: number, y: number): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < 4; i++) {
      total += this.interpolatedNoise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return total / maxValue;
  }

  public generateStoneTexture(): void {
    const { stoneCanvas, stoneCtx } = this.state;
    stoneCanvas.width = this.stoneWidth;
    stoneCanvas.height = this.stoneHeight;

    const imageData = stoneCtx.createImageData(this.stoneWidth, this.stoneHeight);
    const data = imageData.data;

    for (let y = 0; y < this.stoneHeight; y++) {
      for (let x = 0; x < this.stoneWidth; x++) {
        const idx = (y * this.stoneWidth + x) * 4;
        const noiseVal = this.perlinNoise(x * 0.03, y * 0.03);
        
        const baseGray = 60 + noiseVal * 40;
        const variation = (Math.random() - 0.5) * 15;
        
        const r = Math.max(0, Math.min(255, baseGray + variation - 5));
        const g = Math.max(0, Math.min(255, baseGray + variation - 3));
        const b = Math.max(0, Math.min(255, baseGray + variation + 2));

        const edgeX = Math.min(x, this.stoneWidth - x);
        const edgeY = Math.min(y, this.stoneHeight - y);
        const edgeDist = Math.min(edgeX, edgeY);
        const edgeDarken = Math.max(0, 1 - edgeDist / 30) * 30;

        data[idx] = Math.max(0, r - edgeDarken);
        data[idx + 1] = Math.max(0, g - edgeDarken);
        data[idx + 2] = Math.max(0, b - edgeDarken);
        data[idx + 3] = 255;
      }
    }

    stoneCtx.putImageData(imageData, 0, 0);
  }

  private generateCracks(): void {
    this.state.cracks = [];
    const crackCount = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < crackCount; i++) {
      const crack: Point[] = [];
      let x = Math.random() * this.stoneWidth;
      let y = Math.random() * this.stoneHeight;
      const angle = Math.random() * Math.PI * 2;
      const length = 50 + Math.random() * 150;
      const segments = 10 + Math.floor(Math.random() * 10);

      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const wobble = (Math.random() - 0.5) * 20;
        const px = x + Math.cos(angle + wobble * 0.1) * t * length + wobble;
        const py = y + Math.sin(angle + wobble * 0.1) * t * length + wobble;
        
        if (px >= 0 && px < this.stoneWidth && py >= 0 && py < this.stoneHeight) {
          crack.push({ x: px, y: py });
        }
      }

      if (crack.length >= 2) {
        this.state.cracks.push(crack);
      }
    }
  }

  public getStoneBounds(): { x: number; y: number; width: number; height: number } {
    return { x: this.stoneX, y: this.stoneY, width: this.stoneWidth, height: this.stoneHeight };
  }

  public toStoneLocal(point: Point): Point {
    return {
      x: (point.x - this.stoneX) / this.stoneWidth,
      y: (point.y - this.stoneY) / this.stoneHeight
    };
  }

  public toCanvasLocal(normPoint: Point): Point {
    return {
      x: this.stoneX + normPoint.x * this.stoneWidth,
      y: this.stoneY + normPoint.y * this.stoneHeight
    };
  }

  public addParticle(
    x: number,
    y: number,
    vx: number,
    vy: number,
    maxLife: number,
    size: number,
    color: string,
    alpha: number = 1
  ): void {
    if (this.state.activeParticles.length >= 200) {
      const oldest = this.state.activeParticles.reduce((min, p) => 
        p.life < min.life ? p : min, this.state.activeParticles[0]);
      const idx = this.state.activeParticles.indexOf(oldest);
      if (idx >= 0) this.state.activeParticles.splice(idx, 1);
    }

    this.state.activeParticles.push({
      x, y, vx, vy,
      life: maxLife,
      maxLife,
      size,
      color,
      alpha
    });
  }

  public addDrawingParticles(point: Point): void {
    const particleCount = 2;
    const s = this.state.scale;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (10 + Math.random() * 15) * s;
      const life = 0.3 + Math.random() * 0.3;
      const size = (2 + Math.random() * 1) * s;
      
      const t = Math.random();
      const r = Math.floor(255);
      const g = Math.floor(180 + t * 75);
      const b = Math.floor(50 + t * 205);
      const color = `rgb(${r},${g},${b})`;

      this.addParticle(
        point.x,
        point.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        life,
        size,
        color,
        0.8
      );
    }
  }

  public updateParticles(dt: number): void {
    const particles = this.state.activeParticles;
    
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.alpha = (p.life / p.maxLife) * 0.8;
    }
  }

  public updateMagicCircleParticles(dt: number): void {
    if (!this.state.magicCircle.active) return;

    const centerX = this.stoneX + this.stoneWidth / 2;
    const centerY = this.stoneY + this.stoneHeight / 2;
    this.state.magicCircle.rotation += dt * (Math.PI * 2 / 10);

    if (this.state.magicCircle.particles.length < 150) {
      const angle = Math.random() * Math.PI * 2;
      const radius = (100 + Math.random() * 50) * this.state.scale;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      this.state.magicCircle.particles.push({
        x, y,
        vx: 0, vy: 0,
        life: 10,
        maxLife: 10,
        size: (1.5 + Math.random() * 1.5) * this.state.scale,
        color: `rgb(255,${180 + Math.random() * 75},${50 + Math.random() * 50})`,
        alpha: 0.6 + Math.random() * 0.4,
      });
    }

    for (const p of this.state.magicCircle.particles) {
      const dx = p.x - centerX;
      const dy = p.y - centerY;
      const angle = Math.atan2(dy, dx) + dt * (Math.PI * 2 / 10);
      const radius = Math.sqrt(dx * dx + dy * dy);
      
      p.x = centerX + Math.cos(angle) * radius;
      p.y = centerY + Math.sin(angle) * radius;
    }
  }

  public drawBackground(dt: number): void {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.7
    );
    gradient.addColorStop(0, '#2d1b4e');
    gradient.addColorStop(0.4, '#1a0f2e');
    gradient.addColorStop(1, '#0d0a1a');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    const altarY = this.height * 0.85;
    const altarGradient = ctx.createRadialGradient(
      this.width / 2, altarY, 0,
      this.width / 2, altarY, this.width * 0.6
    );
    altarGradient.addColorStop(0, 'rgba(212, 175, 55, 0.15)');
    altarGradient.addColorStop(1, 'rgba(212, 175, 55, 0)');
    
    ctx.fillStyle = altarGradient;
    ctx.beginPath();
    ctx.ellipse(this.width / 2, altarY, this.width * 0.45, 50 * this.state.scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(this.width / 2, altarY, this.width * 0.42, 45 * this.state.scale, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  public drawStone(dt: number): void {
    const ctx = this.ctx;
    
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 30 * this.state.scale;
    ctx.shadowOffsetY = 10 * this.state.scale;
    
    ctx.drawImage(
      this.state.stoneCanvas,
      this.stoneX,
      this.stoneY,
      this.stoneWidth,
      this.stoneHeight
    );
    
    ctx.restore();

    ctx.strokeStyle = 'rgba(139, 115, 85, 0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.stoneX, this.stoneY, this.stoneWidth, this.stoneHeight);

    ctx.strokeStyle = 'rgba(50, 45, 40, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const crack of this.state.cracks) {
      if (crack.length < 2) continue;
      
      ctx.beginPath();
      ctx.moveTo(this.stoneX + crack[0].x, this.stoneY + crack[0].y);
      
      for (let i = 1; i < crack.length; i++) {
        ctx.lineTo(this.stoneX + crack[i].x, this.stoneY + crack[i].y);
      }
      ctx.stroke();
    }

    if (this.state.failFlash.active) {
      this.drawFailFlash(dt);
    }
  }

  private drawFailFlash(dt: number): void {
    const ctx = this.ctx;
    const { failFlash } = this.state;

    failFlash.progress += dt / 0.3;

    if (failFlash.progress >= 1) {
      failFlash.active = false;
      failFlash.progress = 0;
      return;
    }

    const alpha = Math.sin(failFlash.progress * Math.PI) * 0.8;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = 'rgba(255, 50, 50, 0.9)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    const origin = failFlash.originPoint || { 
      x: this.stoneX + this.stoneWidth / 2, 
      y: this.stoneY + this.stoneHeight / 2 
    };

    const crackCount = 8;
    for (let i = 0; i < crackCount; i++) {
      const angle = (i / crackCount) * Math.PI * 2 + Math.random() * 0.3;
      const length = (50 + Math.random() * 100) * this.state.scale * failFlash.progress;
      
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      
      let px = origin.x;
      let py = origin.y;
      const segments = 5;
      
      for (let j = 1; j <= segments; j++) {
        const t = j / segments;
        const wobble = (Math.random() - 0.5) * 20 * this.state.scale;
        px = origin.x + Math.cos(angle + wobble * 0.05) * t * length + wobble;
        py = origin.y + Math.sin(angle + wobble * 0.05) * t * length + wobble;
        ctx.lineTo(px, py);
      }
      
      ctx.stroke();
    }

    ctx.restore();
  }

  public drawHintGlyph(dt: number): void {
    const { hintGlyph } = this.state;
    if (!hintGlyph.glyph) return;

    if (hintGlyph.fadeDirection > 0) {
      hintGlyph.alpha = Math.min(0.6, hintGlyph.alpha + dt / 0.3);
      if (hintGlyph.alpha >= 0.6) {
        hintGlyph.fadeDirection = 0;
      }
    } else if (hintGlyph.fadeDirection < 0) {
      hintGlyph.alpha = Math.max(0, hintGlyph.alpha + dt / 0.5 * hintGlyph.fadeDirection);
      if (hintGlyph.alpha <= 0) {
        hintGlyph.fadeDirection = 0;
        hintGlyph.visible = false;
        return;
      }
    }

    if (hintGlyph.timer > 0) {
      hintGlyph.timer -= dt;
      if (hintGlyph.timer <= 0) {
        hintGlyph.fadeDirection = -1;
      }
    }

    if (hintGlyph.alpha <= 0) return;

    const ctx = this.ctx;
    const s = this.state.scale;

    ctx.save();
    ctx.globalAlpha = hintGlyph.alpha;
    ctx.strokeStyle = 'rgba(135, 206, 250, 0.8)';
    ctx.lineWidth = 3 * s;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(135, 206, 250, 0.8)';
    ctx.shadowBlur = 10 * s;

    for (const stroke of hintGlyph.glyph.strokes) {
      if (stroke.points.length < 2) continue;

      const firstPoint = this.toCanvasLocal(stroke.points[0]);
      ctx.beginPath();
      ctx.moveTo(firstPoint.x, firstPoint.y);

      for (let i = 1; i < stroke.points.length; i++) {
        const point = this.toCanvasLocal(stroke.points[i]);
        ctx.lineTo(point.x, point.y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  public drawPlayerStrokes(dt: number): void {
    const ctx = this.ctx;
    const s = this.state.scale;

    for (const stroke of this.state.completedStrokes) {
      if (stroke.points.length < 2) continue;
      if (stroke.fadeAlpha <= 0) continue;

      ctx.save();
      ctx.globalAlpha = stroke.fadeAlpha;

      if (stroke.burnProgress < 1) {
        stroke.burnProgress = Math.min(1, stroke.burnProgress + dt / 0.5);
        
        const visiblePoints = Math.floor(stroke.points.length * stroke.burnProgress);
        if (visiblePoints < 2) {
          ctx.restore();
          continue;
        }

        const drawPoints = stroke.points.slice(0, visiblePoints + 1);
        const burnPoint = drawPoints[drawPoints.length - 1];

        const gradient = ctx.createRadialGradient(
          burnPoint.x, burnPoint.y, 0,
          burnPoint.x, burnPoint.y, 20 * s
        );
        gradient.addColorStop(0, 'rgba(255, 220, 100, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 180, 50, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(burnPoint.x, burnPoint.y, 20 * s, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 6 * s;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(255, 215, 0, 0.9)';
        ctx.shadowBlur = 15 * s;

        ctx.beginPath();
        ctx.moveTo(drawPoints[0].x, drawPoints[0].y);
        for (let i = 1; i < drawPoints.length; i++) {
          ctx.lineTo(drawPoints[i].x, drawPoints[i].y);
        }
        ctx.stroke();
      } else {
        if (!stroke.solidified) {
          stroke.solidified = true;
        }

        const color = stroke.energized ? '#ffd700' : 'rgba(184, 115, 51, 0.7)';
        const shadowColor = stroke.energized ? 'rgba(255, 215, 0, 0.9)' : 'rgba(184, 115, 51, 0.3)';
        const lineWidth = stroke.energized ? 6 * s : 5 * s;

        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = stroke.energized ? 20 * s : 8 * s;

        if (stroke.energized) {
          const glowSize = 3 + Math.sin(Date.now() * 0.005) * 1;
          ctx.shadowBlur = glowSize * s;
        }

        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      }

      ctx.restore();
    }

    if (this.state.drawingStroke.length >= 2) {
      const points = this.state.drawingStroke;
      
      const startPoint = points[0];
      const startGlow = ctx.createRadialGradient(
        startPoint.x, startPoint.y, 0,
        startPoint.x, startPoint.y, 15 * s
      );
      startGlow.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      startGlow.addColorStop(0.3, 'rgba(255, 240, 200, 0.5)');
      startGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
      
      ctx.fillStyle = startGlow;
      ctx.beginPath();
      ctx.arc(startPoint.x, startPoint.y, 15 * s, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 6 * s;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(255, 215, 0, 0.9)';
      ctx.shadowBlur = 20 * s;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    }

    for (const p of this.state.activeParticles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 5 * s;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  public drawEnergyFlow(dt: number): void {
    const { energyFlow } = this.state;
    if (!energyFlow.active) return;

    const ctx = this.ctx;
    const s = this.state.scale;
    const flowSpeed = 60 * s;

    if (energyFlow.strokeIndex >= this.state.completedStrokes.length) {
      energyFlow.active = false;
      this.state.auraWave.active = true;
      return;
    }

    const currentStroke = this.state.completedStrokes[energyFlow.strokeIndex];
    if (!currentStroke) {
      energyFlow.active = false;
      this.state.auraWave.active = true;
      return;
    }

    const points = currentStroke.points;
    energyFlow.pathLength += flowSpeed * dt;

    let totalDist = 0;
    let currentIdx = 0;
    
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (totalDist + dist >= energyFlow.pathLength) {
        const t = (energyFlow.pathLength - totalDist) / dist;
        energyFlow.currentPoint = {
          x: points[i].x + dx * t,
          y: points[i].y + dy * t
        };
        currentIdx = i;
        break;
      }
      totalDist += dist;
      currentIdx = i + 1;
    }

    if (currentIdx >= points.length - 1) {
      energyFlow.currentPoint = points[points.length - 1];
      energyFlow.strokeIndex++;
      energyFlow.pathLength = 0;
      return;
    }

    const trailLength = 40 * s;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const visiblePoints = [energyFlow.currentPoint];
    let remainingDist = trailLength;
    
    for (let i = currentIdx; i >= 0 && remainingDist > 0; i--) {
      if (i === currentIdx) {
        const dx = points[i + 1].x - points[i].x;
        const dy = points[i + 1].y - points[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const t = (energyFlow.pathLength - (totalDist - (totalDist > 0 ? dist : 0))) / dist;
        const px = points[i].x + dx * t;
        const py = points[i].y + dy * t;
        
        const segmentDist = Math.min(remainingDist, dist * t);
        const ratio = segmentDist / (dist * t || 1);
        visiblePoints.unshift({
          x: px - dx * ratio,
          y: py - dy * ratio
        });
        remainingDist -= segmentDist;
      } else {
        const dx = points[i + 1].x - points[i].x;
        const dy = points[i + 1].y - points[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist <= remainingDist) {
          visiblePoints.unshift(points[i]);
          remainingDist -= dist;
        } else {
          const ratio = remainingDist / dist;
          visiblePoints.unshift({
            x: points[i + 1].x - dx * ratio,
            y: points[i + 1].y - dy * ratio
          });
          remainingDist = 0;
        }
      }
    }

    for (let i = 0; i < visiblePoints.length; i++) {
      const t = i / (visiblePoints.length - 1 || 1);
      const alpha = t * 0.9 + 0.1;
      
      const gradient = ctx.createRadialGradient(
        visiblePoints[i].x, visiblePoints[i].y, 0,
        visiblePoints[i].x, visiblePoints[i].y, 12 * s
      );
      gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      gradient.addColorStop(0.5, `rgba(255, 240, 200, ${alpha * 0.7})`);
      gradient.addColorStop(1, `rgba(255, 215, 0, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(visiblePoints[i].x, visiblePoints[i].y, 12 * s, 0, Math.PI * 2);
      ctx.fill();
    }

    if (visiblePoints.length >= 2) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.lineWidth = 8 * s;
      ctx.shadowColor = 'rgba(255, 240, 200, 1)';
      ctx.shadowBlur = 15 * s;
      
      ctx.beginPath();
      ctx.moveTo(visiblePoints[0].x, visiblePoints[0].y);
      for (let i = 1; i < visiblePoints.length; i++) {
        ctx.lineTo(visiblePoints[i].x, visiblePoints[i].y);
      }
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
      ctx.lineWidth = 12 * s;
      ctx.shadowBlur = 20 * s;
      ctx.beginPath();
      ctx.moveTo(visiblePoints[0].x, visiblePoints[0].y);
      for (let i = 1; i < visiblePoints.length; i++) {
        ctx.lineTo(visiblePoints[i].x, visiblePoints[i].y);
      }
      ctx.stroke();
    }

    const headGradient = ctx.createRadialGradient(
      energyFlow.currentPoint.x, energyFlow.currentPoint.y, 0,
      energyFlow.currentPoint.x, energyFlow.currentPoint.y, 25 * s
    );
    headGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    headGradient.addColorStop(0.3, 'rgba(255, 240, 200, 0.8)');
    headGradient.addColorStop(0.6, 'rgba(255, 215, 0, 0.4)');
    headGradient.addColorStop(1, 'rgba(255, 180, 50, 0)');
    
    ctx.fillStyle = headGradient;
    ctx.beginPath();
    ctx.arc(energyFlow.currentPoint.x, energyFlow.currentPoint.y, 25 * s, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (20 + Math.random() * 30) * s;
      this.addParticle(
        energyFlow.currentPoint.x,
        energyFlow.currentPoint.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.4 + Math.random() * 0.3,
        (2 + Math.random() * 2) * s,
        'rgb(255, 240, 200)',
        0.9
      );
    }

    ctx.restore();
  }

  public drawEnergyCore(dt: number): void {
    const ctx = this.ctx;
    const s = this.state.scale;
    const centerX = this.stoneX + this.stoneWidth / 2;
    const centerY = this.stoneY + this.stoneHeight / 2;
    const coreSize = 40 * s;

    if (this.state.auraWave.active) {
      this.state.auraWave.radius += dt * 100 * s;
      this.state.auraWave.alpha -= dt / 0.8 * 0.6;

      if (this.state.auraWave.alpha <= 0 || this.state.auraWave.radius > 120 * s) {
        this.state.auraWave.active = false;
        this.state.auraWave.radius = 40 * s;
        this.state.auraWave.alpha = 0.6;
      } else {
        ctx.save();
        ctx.globalAlpha = this.state.auraWave.alpha;
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
        ctx.lineWidth = 3 * s;
        ctx.beginPath();
        ctx.arc(centerX, centerY, this.state.auraWave.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (this.state.coreGlow > 0 && !this.state.auraWave.active && this.state.energyFlow.active === false) {
      this.state.coreGlow = Math.min(1, this.state.coreGlow + dt * 0.5);
    }
    this.state.corePulse += dt * 2;

    const glowIntensity = this.state.coreGlow;
    const baseColor = Math.floor(60 + glowIntensity * 170);
    const goldColor = Math.floor(100 + glowIntensity * 155);

    const outerGlow = ctx.createRadialGradient(
      centerX, centerY, coreSize * 0.5,
      centerX, centerY, coreSize * 2.5
    );
    outerGlow.addColorStop(0, `rgba(255, ${goldColor}, ${baseColor / 2}, ${0.3 + glowIntensity * 0.4})`);
    outerGlow.addColorStop(1, `rgba(255, ${goldColor}, ${baseColor / 2}, 0)`);
    
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreSize * 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(Math.PI / 8);

    const coreGradient = ctx.createRadialGradient(
      0, 0, 0,
      0, 0, coreSize
    );
    
    if (glowIntensity > 0.5) {
      const pulse = 1 + Math.sin(this.state.corePulse) * 0.1;
      coreGradient.addColorStop(0, `rgba(255, 255, 255, ${0.9 * pulse})`);
      coreGradient.addColorStop(0.3, `rgba(255, 240, 200, ${0.8 * pulse})`);
      coreGradient.addColorStop(0.6, `rgba(255, 215, 100, ${0.7 * pulse})`);
      coreGradient.addColorStop(1, `rgba(255, 180, 50, ${0.5 * pulse})`);
    } else {
      coreGradient.addColorStop(0, `rgb(${baseColor}, ${baseColor - 10}, ${baseColor - 20})`);
      coreGradient.addColorStop(1, `rgb(${baseColor - 30}, ${baseColor - 40}, ${baseColor - 50})`);
    }

    ctx.fillStyle = coreGradient;
    ctx.shadowColor = glowIntensity > 0.5 ? 'rgba(255, 240, 200, 0.8)' : 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = glowIntensity > 0.5 ? 30 * s : 10 * s;

    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = Math.cos(angle) * coreSize;
      const y = Math.sin(angle) * coreSize;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = glowIntensity > 0.5 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(80, 70, 60, 0.8)';
    ctx.lineWidth = 2 * s;
    ctx.stroke();

    ctx.restore();
  }

  public drawLightBridge(dt: number): void {
    const { lightBridge } = this.state;
    if (!lightBridge.active) return;

    const ctx = this.ctx;
    const s = this.state.scale;
    
    lightBridge.alpha = Math.min(1, lightBridge.alpha + dt / 0.5);

    const startX = this.stoneX + this.stoneWidth;
    const startY = this.stoneY + this.stoneHeight / 2;
    const endX = this.width + 20;
    const tileCount = 5;
    const spacing = 20 * s;
    const tileWidth = ((endX - startX) - spacing * (tileCount - 1)) / tileCount;
    const tileHeight = 30 * s;

    if (lightBridge.tiles.length === 0) {
      for (let i = 0; i < tileCount; i++) {
        lightBridge.tiles.push({
          x: startX + i * (tileWidth + spacing),
          y: startY,
          alpha: 0
        });
      }
    }

    ctx.save();
    for (let i = 0; i < lightBridge.tiles.length; i++) {
      const tile = lightBridge.tiles[i];
      tile.alpha = Math.min(1, tile.alpha + dt / (0.3 + i * 0.1));
      
      if (tile.alpha <= 0) continue;

      ctx.globalAlpha = tile.alpha * lightBridge.alpha * 0.7;
      
      const gradient = ctx.createRadialGradient(
        tile.x + tileWidth / 2, tile.y, 0,
        tile.x + tileWidth / 2, tile.y, tileWidth
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      gradient.addColorStop(0.5, 'rgba(255, 240, 200, 0.6)');
      gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.shadowColor = 'rgba(255, 240, 200, 0.8)';
      ctx.shadowBlur = 15 * s;

      ctx.save();
      ctx.translate(tile.x + tileWidth / 2, tile.y);
      ctx.rotate(Math.PI / 4);
      
      ctx.beginPath();
      ctx.rect(-tileWidth / 2, -tileHeight / 2, tileWidth, tileHeight);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.restore();
    }
    ctx.restore();
  }

  public drawUI(dt: number, level: number, attempts: number, message: string, messageTimer: number): void {
    const ctx = this.ctx;
    const s = this.state.scale;

    const panelX = this.stoneX + this.stoneWidth + 40 * s;
    const panelY = this.stoneY;
    const panelWidth = 200 * s;
    const panelHeight = 180 * s;

    if (panelX + panelWidth < this.width) {
      ctx.save();
      
      ctx.fillStyle = 'rgba(45, 27, 78, 0.7)';
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
      ctx.lineWidth = 1;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 15 * s;
      
      ctx.beginPath();
      ctx.roundRect(panelX, panelY, panelWidth, panelHeight, 8 * s);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#d4af37';
      ctx.font = `${14 * s}px 'Times New Roman', serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      const padding = 15 * s;
      let y = panelY + padding;

      ctx.fillText(`第 ${level} / 5 关`, panelX + padding, y);
      y += 25 * s;
      ctx.fillText(`剩余尝试: ${Math.max(0, 3 - attempts)}`, panelX + padding, y);
      y += 30 * s;

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
      ctx.moveTo(panelX + padding, y);
      ctx.lineTo(panelX + panelWidth - padding, y);
      ctx.stroke();
      y += 20 * s;

      if (messageTimer > 0 && message) {
        const alpha = Math.min(1, messageTimer / 1);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(212, 175, 55, 0.9)';
        ctx.font = `${13 * s}px 'Times New Roman', serif`;
        
        const words = message.split('');
        let line = '';
        const maxWidth = panelWidth - padding * 2;
        
        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i];
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && i > 0) {
            ctx.fillText(line, panelX + padding, y);
            line = words[i];
            y += 20 * s;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, panelX + padding, y);
      }

      ctx.restore();
    }
  }

  public drawAurora(dt: number): void {
    const { aurora } = this.state;
    if (!aurora.active) return;

    aurora.progress += dt;

    if (aurora.progress >= 1) {
      aurora.active = false;
      aurora.progress = 0;
      return;
    }

    const ctx = this.ctx;
    const alpha = Math.sin(aurora.progress * Math.PI);

    ctx.save();
    ctx.globalAlpha = alpha * 0.6;

    const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, 'rgba(100, 255, 150, 0.3)');
    gradient.addColorStop(0.3, 'rgba(50, 200, 200, 0.4)');
    gradient.addColorStop(0.6, 'rgba(150, 100, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(200, 50, 200, 0.3)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    for (let i = 0; i < 5; i++) {
      const yOffset = (i / 5) * this.height + Math.sin(aurora.progress * 3 + i) * 50;
      const waveGradient = ctx.createLinearGradient(0, yOffset - 100, 0, yOffset + 100);
      waveGradient.addColorStop(0, 'rgba(100, 255, 150, 0)');
      waveGradient.addColorStop(0.5, `rgba(${150 + i * 20}, ${100 + i * 30}, ${200 - i * 20}, ${0.2 * alpha})`);
      waveGradient.addColorStop(1, 'rgba(200, 50, 200, 0)');

      ctx.fillStyle = waveGradient;
      ctx.fillRect(0, yOffset - 100, this.width, 200);
    }

    ctx.restore();
  }

  public drawMagicCircle(dt: number): void {
    if (!this.state.magicCircle.active) return;

    const ctx = this.ctx;
    const s = this.state.scale;
    const centerX = this.stoneX + this.stoneWidth / 2;
    const centerY = this.stoneY + this.stoneHeight / 2;

    this.updateMagicCircleParticles(dt);
    this.state.magicCircle.lightPulse += dt;

    for (const p of this.state.magicCircle.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8 * s;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(this.state.magicCircle.rotation);

    for (let ring = 0; ring < 3; ring++) {
      const radius = (100 + ring * 25) * s;
      const alpha = 0.15 + ring * 0.05;
      
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();

      const symbolCount = 8;
      for (let i = 0; i < symbolCount; i++) {
        const angle = (i / symbolCount) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + Math.PI / 2);
        
        ctx.globalAlpha = alpha * 0.8;
        ctx.strokeStyle = 'rgba(255, 215, 100, 0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -8 * s);
        ctx.lineTo(-5 * s, 5 * s);
        ctx.lineTo(5 * s, 5 * s);
        ctx.closePath();
        ctx.stroke();
        
        ctx.restore();
      }
    }

    ctx.restore();

    const pulseSize = 40 + Math.sin(this.state.magicCircle.lightPulse * 3) * 20;
    const lightGradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, pulseSize * s
    );
    lightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    lightGradient.addColorStop(0.4, 'rgba(255, 240, 200, 0.5)');
    lightGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

    ctx.fillStyle = lightGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, pulseSize * s, 0, Math.PI * 2);
    ctx.fill();
  }

  public showHint(glyph: Glyph, duration: number): void {
    this.state.hintGlyph.glyph = glyph;
    this.state.hintGlyph.visible = true;
    this.state.hintGlyph.fadeDirection = 1;
    this.state.hintGlyph.alpha = 0;
    this.state.hintGlyph.timer = duration;
  }

  public startEnergyFlow(): void {
    for (const stroke of this.state.completedStrokes) {
      stroke.energized = true;
    }
    
    this.state.energyFlow.active = true;
    this.state.energyFlow.progress = 0;
    this.state.energyFlow.strokeIndex = 0;
    this.state.energyFlow.pathLength = 0;
    
    if (this.state.completedStrokes.length > 0 && this.state.completedStrokes[0].points.length > 0) {
      this.state.energyFlow.currentPoint = { ...this.state.completedStrokes[0].points[0] };
    }
  }

  public triggerFail(originPoint: Point): void {
    this.state.failFlash.active = true;
    this.state.failFlash.progress = 0;
    this.state.failFlash.originPoint = originPoint;

    const fadeDuration = 0.5;
    for (const stroke of this.state.completedStrokes) {
      stroke.fadeAlpha = 1;
    }

    const startTime = Date.now();
    const fadeInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const alpha = Math.max(0, 1 - elapsed / fadeDuration);
      
      for (const stroke of this.state.completedStrokes) {
        stroke.fadeAlpha = alpha;
      }
      
      if (alpha <= 0) {
        clearInterval(fadeInterval);
        this.state.completedStrokes = [];
        this.state.drawingStroke = [];
      }
    }, 16);
  }

  public triggerVictory(): void {
    this.state.magicCircle.active = true;
    this.state.magicCircle.rotation = 0;
    this.state.magicCircle.lightPulse = 0;
    this.state.coreGlow = 1;

    for (const stroke of this.state.completedStrokes) {
      stroke.energized = true;
    }

    this.playVictorySound();

    const centerX = this.stoneX + this.stoneWidth / 2;
    const centerY = this.stoneY + this.stoneHeight / 2;

    let pulsePhase = 0;
    const pulseDuration = 2000;
    const startTime = Date.now();

    const pulseInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      pulsePhase = Math.min(1, elapsed / pulseDuration);
      
      if (pulsePhase < 0.5) {
        const t = pulsePhase / 0.5;
        this.state.corePulse = t * Math.PI;
      } else {
        const t = (pulsePhase - 0.5) / 0.5;
        this.state.corePulse = Math.PI + t * Math.PI * 2;
      }

      if (pulsePhase >= 1) {
        clearInterval(pulseInterval);
      }
    }, 16);
  }

  public triggerAurora(): void {
    this.state.aurora.active = true;
    this.state.aurora.progress = 0;
  }

  public showLightBridge(): void {
    this.state.lightBridge.active = true;
    this.state.lightBridge.alpha = 0;
    this.state.lightBridge.tiles = [];
  }

  public resetForNewLevel(): void {
    this.state.drawingStroke = [];
    this.state.completedStrokes = [];
    this.state.activeParticles = [];
    this.state.energyFlow.active = false;
    this.state.energyFlow.strokeIndex = 0;
    this.state.energyFlow.pathLength = 0;
    this.state.coreGlow = 0;
    this.state.auraWave.active = false;
    this.state.auraWave.radius = 40 * this.state.scale;
    this.state.auraWave.alpha = 0.6;
    this.state.lightBridge.active = false;
    this.state.lightBridge.alpha = 0;
    this.state.lightBridge.tiles = [];
    this.state.failFlash.active = false;
    this.state.hintGlyph.visible = false;
    this.state.hintGlyph.alpha = 0;
    this.state.hintGlyph.fadeDirection = 0;
    this.generateCracks();
  }

  public clearDrawing(): void {
    this.state.drawingStroke = [];
    this.state.completedStrokes = [];
    this.state.activeParticles = [];
  }

  private playVictorySound(): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }

      const ctx = this.audioContext;
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(110, now);
      osc1.frequency.exponentialRampToValueAtTime(55, now + 3);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 3);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now);
      osc2.frequency.exponentialRampToValueAtTime(1760, now + 1.5);
      osc2.frequency.exponentialRampToValueAtTime(880, now + 3);
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(0.15, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 3);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 3);

      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(1320, now + 0.5);
      gain3.gain.setValueAtTime(0, now + 0.5);
      gain3.gain.linearRampToValueAtTime(0.1, now + 0.7);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 2);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.5);
      osc3.stop(now + 2);

    } catch (e) {
      console.log('Audio not supported');
    }
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.calculateStoneDimensions();
    this.generateStoneTexture();
  }

  public render(
    dt: number,
    level: number,
    attempts: number,
    uiMessage: string,
    uiMessageTimer: number
  ): void {
    this.updateParticles(dt);

    this.drawBackground(dt);
    this.drawMagicCircle(dt);
    this.drawStone(dt);
    this.drawAurora(dt);
    this.drawHintGlyph(dt);
    this.drawPlayerStrokes(dt);
    this.drawEnergyFlow(dt);
    this.drawEnergyCore(dt);
    this.drawLightBridge(dt);
    this.drawUI(dt, level, attempts, uiMessage, uiMessageTimer);
  }
}
