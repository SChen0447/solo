export interface PaperPuppet {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  velX: number;
  velY: number;
  width: number;
  height: number;
  color: string;
  isHighlighted: boolean;
  highlightTime: number;
  type: PuppetType;
  scale: number;
  targetScale: number;
}

export type PuppetType = 
  | 'female' 
  | 'male' 
  | 'monkey' 
  | 'oldman' 
  | 'skeleton'
  | 'scholar'
  | 'butterfly1'
  | 'butterfly2';

export interface CandleState {
  x: number;
  y: number;
  flameHeight: number;
  baseFlameHeight: number;
  glowRadius: number;
  color: string;
  time: number;
}

export interface RenderState {
  width: number;
  height: number;
  puppets: PaperPuppet[];
  candle: CandleState;
  currentScript: string | null;
  scriptTitle: string;
  transitionAlpha: number;
}

const DAMPING = 0.8;
const SPRING_STRENGTH = 0.15;

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private paperTextureCanvas: HTMLCanvasElement | null = null;
  private state: RenderState;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;

    this.state = {
      width: canvas.width,
      height: canvas.height,
      puppets: [],
      candle: {
        x: 0,
        y: 0,
        flameHeight: 45,
        baseFlameHeight: 45,
        glowRadius: 300,
        color: '#ffdd77',
        time: 0
      },
      currentScript: null,
      scriptTitle: '',
      transitionAlpha: 0
    };

    this.generatePaperTexture();
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.state.width = width;
    this.state.height = height;
    this.state.candle.x = width / 2;
    this.state.candle.y = height - 80;
    this.generatePaperTexture();
  }

  private generatePaperTexture(): void {
    this.paperTextureCanvas = document.createElement('canvas');
    this.paperTextureCanvas.width = this.state.width;
    this.paperTextureCanvas.height = this.state.height;
    const ctx = this.paperTextureCanvas.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, this.state.height);
    gradient.addColorStop(0, '#f5e6c8');
    gradient.addColorStop(0.5, '#efe0c0');
    gradient.addColorStop(1, '#e8d4b0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.state.width, this.state.height);

    const imageData = ctx.getImageData(0, 0, this.state.width, this.state.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 20;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.9));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.7));
    }

    for (let i = 0; i < 200; i++) {
      const x = Math.random() * this.state.width;
      const y = Math.random() * this.state.height;
      const len = Math.random() * 30 + 10;
      const angle = Math.random() * Math.PI;
      const alpha = Math.random() * 0.08 + 0.02;

      ctx.strokeStyle = `rgba(180, 160, 120, ${alpha})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }

    ctx.putImageData(imageData, 0, 0);
  }

  addPuppet(puppet: PaperPuppet): void {
    if (this.state.puppets.length >= 8) {
      console.warn('Maximum 8 puppets allowed');
      return;
    }
    this.state.puppets.push(puppet);
  }

  removePuppet(id: string): void {
    const index = this.state.puppets.findIndex(p => p.id === id);
    if (index > -1) {
      this.state.puppets.splice(index, 1);
    }
  }

  getPuppets(): PaperPuppet[] {
    return this.state.puppets;
  }

  clearPuppets(): void {
    this.state.puppets = [];
  }

  setScriptTitle(title: string): void {
    this.state.scriptTitle = title;
    this.state.currentScript = title;
  }

  setTransitionAlpha(alpha: number): void {
    this.state.transitionAlpha = alpha;
  }

  start(): void {
    this.lastTime = performance.now();
    this.animate();
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private animate = (): void => {
    const now = performance.now();
    const deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.update(deltaTime);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  private update(deltaTime: number): void {
    this.state.candle.time += deltaTime;
    
    const flickerPhase = this.state.candle.time * (Math.PI * 2 / 1.5);
    const flicker = Math.sin(flickerPhase) * 0.15 + Math.sin(flickerPhase * 2.3) * 0.08;
    this.state.candle.flameHeight = this.state.candle.baseFlameHeight * (1 + flicker * 0.25);

    for (const puppet of this.state.puppets) {
      const dx = puppet.targetX - puppet.x;
      const dy = puppet.targetY - puppet.y;
      
      puppet.velX += dx * SPRING_STRENGTH;
      puppet.velY += dy * SPRING_STRENGTH;
      
      puppet.velX *= DAMPING;
      puppet.velY *= DAMPING;
      
      puppet.x += puppet.velX;
      puppet.y += puppet.velY;

      const ds = puppet.targetScale - puppet.scale;
      puppet.scale += ds * 0.1;

      if (puppet.isHighlighted) {
        puppet.highlightTime -= deltaTime;
        if (puppet.highlightTime <= 0) {
          puppet.isHighlighted = false;
          puppet.highlightTime = 0;
        }
      }
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const { width, height } = this.state;

    ctx.clearRect(0, 0, width, height);

    if (this.paperTextureCanvas) {
      ctx.drawImage(this.paperTextureCanvas, 0, 0);
    }

    this.drawPaperEdges();

    this.drawCandleGlow();

    for (const puppet of this.state.puppets) {
      this.drawPuppet(puppet);
    }

    this.drawCandleFlame();

    if (this.state.scriptTitle) {
      this.drawScriptTitle();
    }

    if (this.state.transitionAlpha > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${this.state.transitionAlpha * 0.6})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  private drawPaperEdges(): void {
    const ctx = this.ctx;
    const { width, height } = this.state;

    ctx.save();
    
    const edgeGradient = ctx.createRadialGradient(
      width / 2, height / 2, Math.min(width, height) * 0.3,
      width / 2, height / 2, Math.min(width, height) * 0.55
    );
    edgeGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    edgeGradient.addColorStop(1, 'rgba(100, 70, 40, 0.15)');
    ctx.fillStyle = edgeGradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(150, 120, 80, 0.4)';
    ctx.lineWidth = 8;
    
    ctx.beginPath();
    for (let x = 0; x <= width; x += 20) {
      const y = 4 + Math.sin(x * 0.1) * 3 + Math.sin(x * 0.05) * 2;
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.beginPath();
    for (let x = 0; x <= width; x += 20) {
      const y = height - 4 + Math.sin(x * 0.12 + 1) * 3 + Math.sin(x * 0.04) * 2;
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let y = 0; y <= height; y += 20) {
      const x = 4 + Math.sin(y * 0.1 + 2) * 2 + Math.sin(y * 0.06) * 2;
      if (y === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.beginPath();
    for (let y = 0; y <= height; y += 20) {
      const x = width - 4 + Math.sin(y * 0.11 + 3) * 3 + Math.sin(y * 0.05) * 2;
      if (y === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    ctx.restore();
  }

  private drawCandleGlow(): void {
    const ctx = this.ctx;
    const { candle } = this.state;

    const gradient = ctx.createRadialGradient(
      candle.x, candle.y - 20,
      0,
      candle.x, candle.y - 20,
      candle.glowRadius
    );

    const intensity = 0.9 + Math.sin(candle.time * 4) * 0.05 + Math.sin(candle.time * 7) * 0.03;
    
    gradient.addColorStop(0, `rgba(255, 221, 119, ${0.8 * intensity})`);
    gradient.addColorStop(0.3, `rgba(255, 200, 80, ${0.5 * intensity})`);
    gradient.addColorStop(0.6, `rgba(255, 180, 60, ${0.25 * intensity})`);
    gradient.addColorStop(1, 'rgba(255, 150, 50, 0)');

    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.state.width, this.state.height);
    ctx.restore();
  }

  private drawCandleFlame(): void {
    const ctx = this.ctx;
    const { candle } = this.state;
    const flameHeight = candle.flameHeight;
    const baseWidth = flameHeight * 0.4;

    ctx.save();
    ctx.translate(candle.x, candle.y);

    const bodyGradient = ctx.createLinearGradient(0, -flameHeight, 0, 0);
    bodyGradient.addColorStop(0, 'rgba(255, 255, 200, 0.9)');
    bodyGradient.addColorStop(0.3, 'rgba(255, 220, 100, 0.95)');
    bodyGradient.addColorStop(0.6, 'rgba(255, 160, 40, 0.9)');
    bodyGradient.addColorStop(1, 'rgba(255, 100, 20, 0.7)');

    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.moveTo(0, -flameHeight);
    ctx.bezierCurveTo(
      baseWidth * 0.8, -flameHeight * 0.7,
      baseWidth, -flameHeight * 0.4,
      baseWidth * 0.6, 0
    );
    ctx.lineTo(-baseWidth * 0.6, 0);
    ctx.bezierCurveTo(
      -baseWidth, -flameHeight * 0.4,
      -baseWidth * 0.8, -flameHeight * 0.7,
      0, -flameHeight
    );
    ctx.fill();

    const innerGradient = ctx.createRadialGradient(
      0, -flameHeight * 0.3, 0,
      0, -flameHeight * 0.3, flameHeight * 0.4
    );
    innerGradient.addColorStop(0, 'rgba(255, 255, 240, 1)');
    innerGradient.addColorStop(0.5, 'rgba(255, 240, 180, 0.8)');
    innerGradient.addColorStop(1, 'rgba(255, 220, 120, 0)');

    ctx.fillStyle = innerGradient;
    ctx.beginPath();
    ctx.moveTo(0, -flameHeight * 0.9);
    ctx.bezierCurveTo(
      baseWidth * 0.4, -flameHeight * 0.6,
      baseWidth * 0.5, -flameHeight * 0.3,
      baseWidth * 0.3, 0
    );
    ctx.lineTo(-baseWidth * 0.3, 0);
    ctx.bezierCurveTo(
      -baseWidth * 0.5, -flameHeight * 0.3,
      -baseWidth * 0.4, -flameHeight * 0.6,
      0, -flameHeight * 0.9
    );
    ctx.fill();

    ctx.fillStyle = '#f5f0e0';
    ctx.fillRect(-4, 0, 8, 20);
    ctx.fillStyle = '#d4cfb8';
    ctx.fillRect(4, 0, 2, 20);

    ctx.restore();
  }

  private drawPuppet(puppet: PaperPuppet): void {
    const ctx = this.ctx;
    const { x, y, width, height, scale, isHighlighted } = puppet;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    const shadowGradient = ctx.createRadialGradient(0, 0, 0, 0, 10, width * 0.8);
    shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
    shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGradient;
    ctx.beginPath();
    ctx.ellipse(0, height * 0.45, width * 0.5, height * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isHighlighted ? '#ffd700' : puppet.color;
    ctx.strokeStyle = isHighlighted ? '#ffaa00' : '#8b0000';
    ctx.lineWidth = 2;

    this.drawPuppetShape(puppet.type, width, height);

    if (isHighlighted) {
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.shadowColor = '#ffdd77';
      ctx.shadowBlur = 20;
      ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
      this.drawPuppetShape(puppet.type, width, height);
      ctx.restore();
    }

    ctx.restore();
  }

  private drawPuppetShape(type: PuppetType, w: number, h: number): void {
    const ctx = this.ctx;
    const halfW = w / 2;
    const headRadius = w * 0.22;
    const neckY = headRadius * 2;
    const shoulderY = neckY + h * 0.08;
    const waistY = shoulderY + h * 0.35;
    const bottomY = h * 0.9;

    ctx.beginPath();

    switch (type) {
      case 'female':
        this.drawFemaleShape(w, h);
        break;
      case 'male':
        this.drawMaleShape(w, h);
        break;
      case 'monkey':
        this.drawMonkeyShape(w, h);
        break;
      case 'oldman':
        this.drawOldmanShape(w, h);
        break;
      case 'skeleton':
        this.drawSkeletonShape(w, h);
        break;
      case 'scholar':
        this.drawScholarShape(w, h);
        break;
      case 'butterfly1':
      case 'butterfly2':
        this.drawButterflyShape(w, h, type);
        break;
      default:
        this.drawFemaleShape(w, h);
    }

    this.addJaggedEdges(w, h, type);
  }

  private drawFemaleShape(w: number, h: number): void {
    const ctx = this.ctx;
    const halfW = w / 2;
    const headRadius = w * 0.22;
    const headY = headRadius;
    const neckY = headRadius * 2;
    const shoulderY = neckY + h * 0.06;
    const waistY = shoulderY + h * 0.32;
    const bottomY = h * 0.92;
    const hemWidth = w * 0.45;

    ctx.moveTo(0, headY - headRadius);
    ctx.bezierCurveTo(
      headRadius, headY - headRadius,
      headRadius, headY + headRadius,
      0, headY + headRadius
    );
    ctx.bezierCurveTo(
      -headRadius, headY + headRadius,
      -headRadius, headY - headRadius,
      0, headY - headRadius
    );

    ctx.moveTo(-headRadius * 0.5, neckY);
    ctx.lineTo(-halfW * 0.7, shoulderY);
    ctx.lineTo(-halfW * 0.85, waistY * 0.7);
    ctx.lineTo(-hemWidth, bottomY);
    ctx.lineTo(hemWidth, bottomY);
    ctx.lineTo(halfW * 0.85, waistY * 0.7);
    ctx.lineTo(halfW * 0.7, shoulderY);
    ctx.lineTo(headRadius * 0.5, neckY);

    ctx.moveTo(-halfW * 0.2, shoulderY + h * 0.1);
    ctx.lineTo(-halfW * 0.9, shoulderY + h * 0.25);
    ctx.lineTo(-halfW * 0.85, shoulderY + h * 0.28);
    ctx.lineTo(-halfW * 0.25, shoulderY + h * 0.15);

    ctx.moveTo(halfW * 0.2, shoulderY + h * 0.1);
    ctx.lineTo(halfW * 0.9, shoulderY + h * 0.25);
    ctx.lineTo(halfW * 0.85, shoulderY + h * 0.28);
    ctx.lineTo(halfW * 0.25, shoulderY + h * 0.15);

    ctx.fill();
    ctx.stroke();
  }

  private drawMaleShape(w: number, h: number): void {
    const ctx = this.ctx;
    const halfW = w / 2;
    const headRadius = w * 0.24;
    const headY = headRadius;
    const neckY = headRadius * 2;
    const shoulderY = neckY + h * 0.05;
    const waistY = shoulderY + h * 0.35;
    const bottomY = h * 0.92;

    ctx.moveTo(0, headY - headRadius);
    ctx.bezierCurveTo(
      headRadius, headY - headRadius,
      headRadius, headY + headRadius,
      0, headY + headRadius
    );
    ctx.bezierCurveTo(
      -headRadius, headY + headRadius,
      -headRadius, headY - headRadius,
      0, headY - headRadius
    );

    ctx.moveTo(-headRadius * 0.6, neckY);
    ctx.lineTo(-halfW * 0.9, shoulderY);
    ctx.lineTo(-halfW * 0.8, waistY);
    ctx.lineTo(-halfW * 0.55, bottomY);
    ctx.lineTo(-halfW * 0.15, bottomY);
    ctx.lineTo(-halfW * 0.25, waistY);
    ctx.lineTo(halfW * 0.25, waistY);
    ctx.lineTo(halfW * 0.15, bottomY);
    ctx.lineTo(halfW * 0.55, bottomY);
    ctx.lineTo(halfW * 0.8, waistY);
    ctx.lineTo(halfW * 0.9, shoulderY);
    ctx.lineTo(headRadius * 0.6, neckY);

    ctx.moveTo(-halfW * 0.3, shoulderY + h * 0.08);
    ctx.lineTo(-halfW * 0.95, shoulderY + h * 0.22);
    ctx.lineTo(-halfW * 0.9, shoulderY + h * 0.26);
    ctx.lineTo(-halfW * 0.35, shoulderY + h * 0.12);

    ctx.moveTo(halfW * 0.3, shoulderY + h * 0.08);
    ctx.lineTo(halfW * 0.95, shoulderY + h * 0.22);
    ctx.lineTo(halfW * 0.9, shoulderY + h * 0.26);
    ctx.lineTo(halfW * 0.35, shoulderY + h * 0.12);

    ctx.fill();
    ctx.stroke();
  }

  private drawMonkeyShape(w: number, h: number): void {
    const ctx = this.ctx;
    const halfW = w / 2;
    const headRadius = w * 0.28;
    const headY = headRadius;
    const neckY = headRadius * 1.9;
    const shoulderY = neckY + h * 0.04;
    const waistY = shoulderY + h * 0.3;
    const bottomY = h * 0.9;

    ctx.moveTo(0, headY - headRadius);
    ctx.bezierCurveTo(
      headRadius, headY - headRadius * 0.8,
      headRadius * 1.1, headY + headRadius * 0.5,
      headRadius * 0.7, headY + headRadius
    );
    ctx.lineTo(-headRadius * 0.7, headY + headRadius);
    ctx.bezierCurveTo(
      -headRadius * 1.1, headY + headRadius * 0.5,
      -headRadius, headY - headRadius * 0.8,
      0, headY - headRadius
    );

    ctx.moveTo(-headRadius * 0.8, neckY);
    ctx.lineTo(-halfW * 0.85, shoulderY);
    ctx.lineTo(-halfW * 0.75, waistY);
    ctx.lineTo(-halfW * 0.5, bottomY);
    ctx.lineTo(-halfW * 0.2, bottomY);
    ctx.lineTo(-halfW * 0.3, waistY);
    ctx.lineTo(halfW * 0.3, waistY);
    ctx.lineTo(halfW * 0.2, bottomY);
    ctx.lineTo(halfW * 0.5, bottomY);
    ctx.lineTo(halfW * 0.75, waistY);
    ctx.lineTo(halfW * 0.85, shoulderY);
    ctx.lineTo(headRadius * 0.8, neckY);

    ctx.moveTo(-halfW * 0.25, shoulderY + h * 0.06);
    ctx.quadraticCurveTo(
      -halfW * 0.9, shoulderY + h * 0.1,
      -halfW * 1.0, shoulderY + h * 0.35
    );
    ctx.lineTo(-halfW * 0.9, shoulderY + h * 0.38);
    ctx.quadraticCurveTo(
      -halfW * 0.7, shoulderY + h * 0.18,
      -halfW * 0.3, shoulderY + h * 0.1
    );

    ctx.moveTo(halfW * 0.25, shoulderY + h * 0.06);
    ctx.quadraticCurveTo(
      halfW * 0.9, shoulderY + h * 0.1,
      halfW * 1.0, shoulderY + h * 0.35
    );
    ctx.lineTo(halfW * 0.9, shoulderY + h * 0.38);
    ctx.quadraticCurveTo(
      halfW * 0.7, shoulderY + h * 0.18,
      halfW * 0.3, shoulderY + h * 0.1
    );

    ctx.moveTo(0, bottomY);
    ctx.quadraticCurveTo(halfW * 0.3, bottomY + h * 0.1, halfW * 0.15, bottomY + h * 0.15);
    ctx.quadraticCurveTo(-halfW * 0.1, bottomY + h * 0.12, 0, bottomY);

    ctx.fill();
    ctx.stroke();
  }

  private drawOldmanShape(w: number, h: number): void {
    const ctx = this.ctx;
    const halfW = w / 2;
    const headRadius = w * 0.22;
    const headY = headRadius;
    const neckY = headRadius * 2.1;
    const shoulderY = neckY + h * 0.06;
    const waistY = shoulderY + h * 0.38;
    const bottomY = h * 0.9;

    ctx.moveTo(0, headY - headRadius);
    ctx.bezierCurveTo(
      headRadius, headY - headRadius,
      headRadius, headY + headRadius,
      0, headY + headRadius
    );
    ctx.bezierCurveTo(
      -headRadius, headY + headRadius,
      -headRadius, headY - headRadius,
      0, headY - headRadius
    );

    ctx.moveTo(-headRadius * 0.5, neckY);
    ctx.lineTo(-halfW * 0.75, shoulderY + h * 0.02);
    ctx.lineTo(-halfW * 0.9, waistY);
    ctx.lineTo(-halfW * 0.65, bottomY);
    ctx.lineTo(-halfW * 0.25, bottomY);
    ctx.lineTo(-halfW * 0.35, waistY);
    ctx.lineTo(halfW * 0.35, waistY);
    ctx.lineTo(halfW * 0.25, bottomY);
    ctx.lineTo(halfW * 0.65, bottomY);
    ctx.lineTo(halfW * 0.9, waistY);
    ctx.lineTo(halfW * 0.75, shoulderY + h * 0.02);
    ctx.lineTo(headRadius * 0.5, neckY);

    ctx.moveTo(-halfW * 0.25, shoulderY + h * 0.05);
    ctx.quadraticCurveTo(
      -halfW * 0.7, shoulderY + h * 0.15,
      -halfW * 0.8, shoulderY + h * 0.3
    );
    ctx.lineTo(-halfW * 0.72, shoulderY + h * 0.33);
    ctx.quadraticCurveTo(
      -halfW * 0.55, shoulderY + h * 0.2,
      -halfW * 0.3, shoulderY + h * 0.08
    );

    ctx.moveTo(halfW * 0.25, shoulderY + h * 0.05);
    ctx.quadraticCurveTo(
      halfW * 0.7, shoulderY + h * 0.15,
      halfW * 0.8, shoulderY + h * 0.3
    );
    ctx.lineTo(halfW * 0.72, shoulderY + h * 0.33);
    ctx.quadraticCurveTo(
      halfW * 0.55, shoulderY + h * 0.2,
      halfW * 0.3, shoulderY + h * 0.08
    );

    ctx.moveTo(-headRadius * 0.7, headY + headRadius * 0.3);
    ctx.quadraticCurveTo(
      -headRadius * 0.9, headY + headRadius * 1.2,
      -headRadius * 0.6, headY + headRadius * 1.5
    );
    ctx.quadraticCurveTo(
      -headRadius * 0.3, headY + headRadius * 1.3,
      -headRadius * 0.4, headY + headRadius * 0.5
    );

    ctx.moveTo(headRadius * 0.7, headY + headRadius * 0.3);
    ctx.quadraticCurveTo(
      headRadius * 0.9, headY + headRadius * 1.2,
      headRadius * 0.6, headY + headRadius * 1.5
    );
    ctx.quadraticCurveTo(
      headRadius * 0.3, headY + headRadius * 1.3,
      headRadius * 0.4, headY + headRadius * 0.5
    );

    ctx.fill();
    ctx.stroke();
  }

  private drawSkeletonShape(w: number, h: number): void {
    const ctx = this.ctx;
    const halfW = w / 2;
    const headRadius = w * 0.25;
    const headY = headRadius;
    const neckY = headRadius * 2;
    const shoulderY = neckY + h * 0.06;
    const waistY = shoulderY + h * 0.32;
    const bottomY = h * 0.92;

    ctx.moveTo(0, headY - headRadius);
    ctx.bezierCurveTo(
      headRadius, headY - headRadius,
      headRadius, headY + headRadius * 0.8,
      headRadius * 0.6, headY + headRadius
    );
    ctx.lineTo(-headRadius * 0.6, headY + headRadius);
    ctx.bezierCurveTo(
      -headRadius, headY + headRadius * 0.8,
      -headRadius, headY - headRadius,
      0, headY - headRadius
    );

    ctx.moveTo(-headRadius * 0.4, neckY);
    ctx.lineTo(-halfW * 0.85, shoulderY);
    ctx.lineTo(-halfW * 0.7, waistY);
    ctx.lineTo(-halfW * 0.45, bottomY);
    ctx.lineTo(-halfW * 0.2, bottomY);
    ctx.lineTo(-halfW * 0.3, waistY);
    ctx.lineTo(halfW * 0.3, waistY);
    ctx.lineTo(halfW * 0.2, bottomY);
    ctx.lineTo(halfW * 0.45, bottomY);
    ctx.lineTo(halfW * 0.7, waistY);
    ctx.lineTo(halfW * 0.85, shoulderY);
    ctx.lineTo(headRadius * 0.4, neckY);

    ctx.moveTo(-halfW * 0.25, shoulderY + h * 0.08);
    ctx.lineTo(-halfW * 0.9, shoulderY + h * 0.25);
    ctx.lineTo(-halfW * 0.85, shoulderY + h * 0.3);
    ctx.lineTo(-halfW * 0.3, shoulderY + h * 0.13);

    ctx.moveTo(halfW * 0.25, shoulderY + h * 0.08);
    ctx.lineTo(halfW * 0.9, shoulderY + h * 0.25);
    ctx.lineTo(halfW * 0.85, shoulderY + h * 0.3);
    ctx.lineTo(halfW * 0.3, shoulderY + h * 0.13);

    for (let i = 0; i < 5; i++) {
      const ribY = shoulderY + h * 0.08 + i * h * 0.05;
      const ribWidth = halfW * (0.5 - i * 0.08);
      ctx.moveTo(-ribWidth, ribY);
      ctx.lineTo(ribWidth, ribY);
    }

    ctx.fill();
    ctx.stroke();
  }

  private drawScholarShape(w: number, h: number): void {
    const ctx = this.ctx;
    const halfW = w / 2;
    const headRadius = w * 0.2;
    const headY = headRadius;
    const neckY = headRadius * 2.2;
    const shoulderY = neckY + h * 0.05;
    const waistY = shoulderY + h * 0.35;
    const bottomY = h * 0.93;
    const robeWidth = w * 0.42;

    ctx.moveTo(0, headY - headRadius);
    ctx.bezierCurveTo(
      headRadius, headY - headRadius,
      headRadius, headY + headRadius,
      0, headY + headRadius
    );
    ctx.bezierCurveTo(
      -headRadius, headY + headRadius,
      -headRadius, headY - headRadius,
      0, headY - headRadius
    );

    ctx.moveTo(-headRadius * 0.5, neckY);
    ctx.lineTo(-halfW * 0.8, shoulderY);
    ctx.lineTo(-robeWidth, bottomY);
    ctx.lineTo(robeWidth, bottomY);
    ctx.lineTo(halfW * 0.8, shoulderY);
    ctx.lineTo(headRadius * 0.5, neckY);

    ctx.moveTo(-halfW * 0.25, shoulderY + h * 0.1);
    ctx.lineTo(-halfW * 0.85, shoulderY + h * 0.28);
    ctx.lineTo(-halfW * 0.8, shoulderY + h * 0.32);
    ctx.lineTo(-halfW * 0.3, shoulderY + h * 0.15);

    ctx.moveTo(halfW * 0.25, shoulderY + h * 0.1);
    ctx.lineTo(halfW * 0.85, shoulderY + h * 0.28);
    ctx.lineTo(halfW * 0.8, shoulderY + h * 0.32);
    ctx.lineTo(halfW * 0.3, shoulderY + h * 0.15);

    ctx.moveTo(-headRadius * 0.8, headY - headRadius * 0.1);
    ctx.lineTo(-headRadius * 0.9, headY - headRadius * 0.5);
    ctx.lineTo(headRadius * 0.9, headY - headRadius * 0.5);
    ctx.lineTo(headRadius * 0.8, headY - headRadius * 0.1);

    ctx.fill();
    ctx.stroke();
  }

  private drawButterflyShape(w: number, h: number, type: PuppetType): void {
    const ctx = this.ctx;
    const halfW = w / 2;
    const bodyW = w * 0.08;
    const bodyH = h * 0.5;

    ctx.fillStyle = type === 'butterfly1' ? '#c41e3a' : '#4169e1';

    ctx.beginPath();
    ctx.ellipse(0, h * 0.4, bodyW, bodyH / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-bodyW, h * 0.25);
    ctx.quadraticCurveTo(-halfW * 0.9, 0, -halfW * 0.7, h * 0.35);
    ctx.quadraticCurveTo(-halfW * 0.5, h * 0.5, -bodyW, h * 0.4);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(bodyW, h * 0.25);
    ctx.quadraticCurveTo(halfW * 0.9, 0, halfW * 0.7, h * 0.35);
    ctx.quadraticCurveTo(halfW * 0.5, h * 0.5, bodyW, h * 0.4);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-bodyW * 0.8, h * 0.45);
    ctx.quadraticCurveTo(-halfW * 0.6, h * 0.55, -halfW * 0.45, h * 0.7);
    ctx.quadraticCurveTo(-halfW * 0.3, h * 0.75, -bodyW * 0.6, h * 0.6);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(bodyW * 0.8, h * 0.45);
    ctx.quadraticCurveTo(halfW * 0.6, h * 0.55, halfW * 0.45, h * 0.7);
    ctx.quadraticCurveTo(halfW * 0.3, h * 0.75, bodyW * 0.6, h * 0.6);
    ctx.fill();

    ctx.strokeStyle = type === 'butterfly1' ? '#8b0000' : '#00008b';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  private addJaggedEdges(w: number, h: number, type: PuppetType): void {
    if (type.startsWith('butterfly')) return;
    
    const ctx = this.ctx;
    const jaggedSize = 3;
    const steps = 12;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';

    for (let side = 0; side < 2; side++) {
      const startX = side === 0 ? -w / 2 : w / 2;
      const direction = side === 0 ? 1 : -1;

      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const y = h * 0.1 + t * h * 0.8;
        const jagged = Math.sin(t * Math.PI * 8) * jaggedSize * direction;
        const x = startX + jagged;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.lineWidth = jaggedSize * 2;
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawScriptTitle(): void {
    const ctx = this.ctx;
    const title = this.state.scriptTitle;

    ctx.save();
    
    ctx.font = 'bold 32px "SimSun", "STSong", serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    const gradient = ctx.createLinearGradient(40, 40, 40, 80);
    gradient.addColorStop(0, '#ffe594');
    gradient.addColorStop(0.5, '#ffd700');
    gradient.addColorStop(1, '#c9a85c');
    ctx.fillStyle = gradient;

    ctx.fillText(title, 40, 40);

    ctx.font = '14px "SimSun", "STSong", serif';
    ctx.fillStyle = 'rgba(201, 168, 92, 0.7)';
    ctx.fillText('—— 皮影戏 ——', 40, 80);

    ctx.restore();
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getState(): RenderState {
    return this.state;
  }
}

export function createPuppet(
  id: string,
  x: number,
  y: number,
  type: PuppetType = 'female',
  color: string = '#c41e3a'
): PaperPuppet {
  return {
    id,
    x,
    y,
    targetX: x,
    targetY: y,
    velX: 0,
    velY: 0,
    width: 120,
    height: 180,
    color,
    isHighlighted: false,
    highlightTime: 0,
    type,
    scale: 1,
    targetScale: 1
  };
}
