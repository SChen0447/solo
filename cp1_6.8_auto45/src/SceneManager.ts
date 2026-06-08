import { GameState, CharacterMood, SceneData, Dialog } from './GameState';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'sparkle' | 'teardrop' | 'exclamation' | 'firefly';
}

export class SceneManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState;
  private width: number;
  private height: number;
  private particles: Particle[];
  private typewriterProgress: number;
  private typewriterSpeed: number;
  private isTypewriterComplete: boolean;
  private characterAnimFrame: number;
  private characterAnimTimer: number;
  private reactionTimer: number;
  private reactionActive: boolean;
  private fireflies: { x: number; y: number; phase: number; speed: number }[];
  private time: number;

  constructor(canvas: HTMLCanvasElement, gameState: GameState) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Cannot get 2D context');
    }
    this.ctx = ctx;
    this.gameState = gameState;
    this.width = canvas.width;
    this.height = canvas.height;
    this.particles = [];
    this.typewriterProgress = 0;
    this.typewriterSpeed = 0.05;
    this.isTypewriterComplete = false;
    this.characterAnimFrame = 0;
    this.characterAnimTimer = 0;
    this.reactionTimer = 0;
    this.reactionActive = false;
    this.fireflies = [];
    this.time = 0;
    this.initFireflies();
  }

  private initFireflies(): void {
    this.fireflies = [];
    for (let i = 0; i < 15; i++) {
      this.fireflies.push({
        x: Math.random(),
        y: Math.random(),
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.5
      });
    }
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.width = width;
    this.height = height;
  }

  resetTypewriter(): void {
    this.typewriterProgress = 0;
    this.isTypewriterComplete = false;
  }

  skipTypewriter(): void {
    const dialog = this.gameState.getCurrentDialog();
    if (dialog) {
      this.typewriterProgress = dialog.text.length;
    }
    this.isTypewriterComplete = true;
  }

  isTypewriterDone(): boolean {
    return this.isTypewriterComplete;
  }

  triggerReaction(mood: CharacterMood): void {
    this.reactionActive = true;
    this.reactionTimer = 0;
    this.particles = [];

    const scene = this.gameState.getCurrentScene();
    const charX = scene.characterPosition.x * this.width;
    const charY = scene.characterPosition.y * this.height;

    if (mood === 'happy') {
      for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 * i) / 20;
        this.particles.push({
          x: charX,
          y: charY - 60,
          vx: Math.cos(angle) * (2 + Math.random() * 2),
          vy: Math.sin(angle) * (2 + Math.random() * 2) - 3,
          life: 1,
          maxLife: 1,
          color: '#FFD700',
          size: 3 + Math.random() * 3,
          type: 'sparkle'
        });
      }
    } else if (mood === 'angry') {
      for (let i = 0; i < 5; i++) {
        this.particles.push({
          x: charX + (Math.random() - 0.5) * 30,
          y: charY - 100 - i * 20,
          vx: (Math.random() - 0.5) * 2,
          vy: -1 - Math.random(),
          life: 1.2,
          maxLife: 1.2,
          color: '#E53935',
          size: 6,
          type: 'exclamation'
        });
      }
    } else if (mood === 'sad') {
      for (let i = 0; i < 10; i++) {
        this.particles.push({
          x: charX - 15 + Math.random() * 30,
          y: charY - 70 + Math.random() * 20,
          vx: (Math.random() - 0.5) * 0.5,
          vy: 1.5 + Math.random() * 1,
          life: 1.5,
          maxLife: 1.5,
          color: '#64B5F6',
          size: 4,
          type: 'teardrop'
        });
      }
    }
  }

  update(dt: number): void {
    this.time += dt;
    this.characterAnimTimer += dt;
    if (this.characterAnimTimer >= 0.08) {
      this.characterAnimTimer = 0;
      this.characterAnimFrame = (this.characterAnimFrame + 1) % 4;
    }

    if (this.reactionActive) {
      this.reactionTimer += dt;
      if (this.reactionTimer >= 1.5) {
        this.reactionActive = false;
      }
    }

    const dialog = this.gameState.getCurrentDialog();
    if (dialog && !this.isTypewriterComplete) {
      this.typewriterProgress += dt / this.typewriterSpeed;
      if (this.typewriterProgress >= dialog.text.length) {
        this.typewriterProgress = dialog.text.length;
        this.isTypewriterComplete = true;
      }
    }

    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.type === 'sparkle' || p.type === 'teardrop') {
        p.vy += 0.1;
      }
      p.life -= dt;
      return p.life > 0;
    });

    for (const ff of this.fireflies) {
      ff.phase += ff.speed * dt;
    }
  }

  draw(): void {
    const ctx = this.ctx;
    const scene = this.gameState.getCurrentScene();
    const transition = this.gameState.getSceneTransition();

    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground(scene);
    this.drawDecorations(scene);
    this.drawCharacter(scene);
    this.drawDialogBubble(scene);

    if (this.particles.length > 0) {
      this.drawParticles();
    }

    if (transition.active) {
      this.drawTransition(transition.progress, transition.direction);
    }
  }

  private drawBackground(scene: SceneData): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const gradient = ctx.createLinearGradient(0, 0, 0, h);

    if (scene.type === 'castle') {
      gradient.addColorStop(0, '#2C1810');
      gradient.addColorStop(0.5, '#4A2C1A');
      gradient.addColorStop(1, '#1A0F08');
    } else if (scene.type === 'forest') {
      gradient.addColorStop(0, '#0D3B0D');
      gradient.addColorStop(0.6, '#1B5E20');
      gradient.addColorStop(1, '#2E7D32');
    } else if (scene.type === 'cave') {
      gradient.addColorStop(0, '#0A0A1A');
      gradient.addColorStop(0.5, '#1A1A3A');
      gradient.addColorStop(1, '#0D0D20');
    } else if (scene.type === 'gift') {
      gradient.addColorStop(0, '#1A0A2E');
      gradient.addColorStop(0.5, '#3D1A5C');
      gradient.addColorStop(1, '#2A1040');
    } else if (scene.type === 'badEnding') {
      gradient.addColorStop(0, '#0A0A0A');
      gradient.addColorStop(0.5, '#1A1A1A');
      gradient.addColorStop(1, '#050505');
    } else if (scene.type === 'normalEnding') {
      gradient.addColorStop(0, '#FF8F00');
      gradient.addColorStop(0.5, '#FFA726');
      gradient.addColorStop(1, '#FFB74D');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  private drawDecorations(scene: SceneData): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    if (scene.type === 'castle') {
      this.drawCastleDecorations(w, h);
    } else if (scene.type === 'forest') {
      this.drawForestDecorations(w, h);
    } else if (scene.type === 'cave') {
      this.drawCaveDecorations(w, h);
    } else if (scene.type === 'gift') {
      this.drawGiftDecorations(w, h);
    } else if (scene.type === 'badEnding') {
      this.drawDarkDecorations(w, h);
    } else if (scene.type === 'normalEnding') {
      this.drawSunsetDecorations(w, h);
    }
  }

  private drawCastleDecorations(w: number, h: number): void {
    const ctx = this.ctx;

    ctx.fillStyle = '#5D3A1A';
    ctx.fillRect(0, h * 0.7, w, h * 0.3);

    ctx.fillStyle = '#3E2723';
    for (let i = 0; i < w; i += 40) {
      for (let j = h * 0.7; j < h; j += 20) {
        const offset = (Math.floor((j - h * 0.7) / 20) % 2) * 20;
        ctx.strokeStyle = '#2C1810';
        ctx.lineWidth = 2;
        ctx.strokeRect(i + offset, j, 40, 20);
      }
    }

    const fireplaceX = w * 0.75;
    const fireplaceY = h * 0.25;
    ctx.fillStyle = '#4E342E';
    ctx.fillRect(fireplaceX - 60, fireplaceY, 120, 100);
    ctx.fillStyle = '#1A0F08';
    ctx.fillRect(fireplaceX - 40, fireplaceY + 20, 80, 80);

    const flicker = Math.sin(this.time * 8) * 0.2 + 0.8;
    ctx.fillStyle = `rgba(255, 107, 53, ${flicker})`;
    ctx.beginPath();
    ctx.ellipse(fireplaceX, fireplaceY + 70, 25, 35, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 193, 7, ${flicker * 0.8})`;
    ctx.beginPath();
    ctx.ellipse(fireplaceX, fireplaceY + 65, 15, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    const glowGradient = ctx.createRadialGradient(fireplaceX, fireplaceY + 60, 10, fireplaceX, fireplaceY + 60, 200);
    glowGradient.addColorStop(0, `rgba(255, 150, 50, ${0.3 * flicker})`);
    glowGradient.addColorStop(1, 'rgba(255, 150, 50, 0)');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(fireplaceX - 200, fireplaceY - 100, 400, 400);

    ctx.fillStyle = '#6D4C41';
    ctx.fillRect(w * 0.15, h * 0.15, 80, 120);
    ctx.fillStyle = '#8D6E63';
    ctx.fillRect(w * 0.15 + 5, h * 0.15 + 5, 70, 110);

    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.15 + 40, h * 0.15);
    ctx.lineTo(w * 0.15 + 40, h * 0.15 + 120);
    ctx.moveTo(w * 0.15, h * 0.15 + 60);
    ctx.lineTo(w * 0.15 + 80, h * 0.15 + 60);
    ctx.stroke();

    ctx.fillStyle = '#8D6E63';
    ctx.fillRect(w * 0.6 - 8, h * 0.12, 16, h * 0.58);
    ctx.fillStyle = '#A1887F';
    ctx.beginPath();
    ctx.arc(w * 0.6, h * 0.12, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawForestDecorations(w: number, h: number): void {
    const ctx = this.ctx;

    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(0, h * 0.75, w, h * 0.25);

    ctx.fillStyle = '#388E3C';
    for (let i = 0; i < w; i += 15) {
      const grassHeight = 10 + Math.sin(i * 0.1 + this.time * 2) * 5;
      ctx.fillRect(i, h * 0.75 - grassHeight, 3, grassHeight);
    }

    const treePositions = [0.05, 0.15, 0.85, 0.95, 0.5, 0.65];
    for (const tx of treePositions) {
      const treeX = w * tx;
      const treeY = h * 0.45;

      ctx.fillStyle = '#5D4037';
      ctx.fillRect(treeX - 10, treeY, 20, h * 0.3);

      ctx.fillStyle = '#1B5E20';
      ctx.beginPath();
      ctx.arc(treeX, treeY - 20, 45, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#2E7D32';
      ctx.beginPath();
      ctx.arc(treeX - 20, treeY, 35, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(treeX + 20, treeY, 35, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255, 255, 200, 0.1)';
    ctx.beginPath();
    ctx.moveTo(w * 0.3, 0);
    ctx.lineTo(w * 0.5, h * 0.75);
    ctx.lineTo(w * 0.4, h * 0.75);
    ctx.lineTo(w * 0.2, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 200, 0.08)';
    ctx.beginPath();
    ctx.moveTo(w * 0.6, 0);
    ctx.lineTo(w * 0.8, h * 0.75);
    ctx.lineTo(w * 0.7, h * 0.75);
    ctx.lineTo(w * 0.5, 0);
    ctx.closePath();
    ctx.fill();

    const flowerColors = ['#E91E63', '#FF9800', '#9C27B0', '#FFEB3B'];
    for (let i = 0; i < 8; i++) {
      const fx = w * (0.1 + i * 0.11);
      const fy = h * 0.78 + Math.sin(i * 2.5) * 10;
      ctx.fillStyle = flowerColors[i % flowerColors.length];
      ctx.beginPath();
      for (let j = 0; j < 5; j++) {
        const angle = (j / 5) * Math.PI * 2;
        ctx.ellipse(fx + Math.cos(angle) * 4, fy + Math.sin(angle) * 4, 3, 5, angle, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.fillStyle = '#FFEB3B';
      ctx.beginPath();
      ctx.arc(fx, fy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawCaveDecorations(w: number, h: number): void {
    const ctx = this.ctx;

    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(0, h * 0.8, w, h * 0.2);

    ctx.fillStyle = '#2A2A4A';
    for (let i = 0; i < w; i += 30) {
      const stalHeight = 20 + Math.sin(i * 0.07) * 15;
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 15, stalHeight + 30);
      ctx.lineTo(i + 30, 0);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#252545';
    for (let i = 15; i < w; i += 40) {
      const stalHeight = 15 + Math.sin(i * 0.09 + 1) * 10;
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 10, stalHeight + 20);
      ctx.lineTo(i + 20, 0);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#3A3A5A';
    for (let i = 0; i < w; i += 35) {
      const stalHeight = 25 + Math.sin(i * 0.08 + 2) * 15;
      ctx.beginPath();
      ctx.moveTo(i, h * 0.8);
      ctx.lineTo(i + 17, h * 0.8 - stalHeight);
      ctx.lineTo(i + 35, h * 0.8);
      ctx.closePath();
      ctx.fill();
    }

    for (const ff of this.fireflies) {
      const x = ff.x * w + Math.sin(ff.phase) * 30;
      const y = ff.y * h * 0.6 + Math.cos(ff.phase * 0.7) * 20;
      const brightness = (Math.sin(ff.phase * 2) + 1) / 2;

      const glow = ctx.createRadialGradient(x, y, 0, x, y, 20);
      glow.addColorStop(0, `rgba(100, 255, 200, ${0.6 * brightness})`);
      glow.addColorStop(1, 'rgba(100, 255, 200, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 20, y - 20, 40, 40);

      ctx.fillStyle = `rgba(200, 255, 220, ${brightness})`;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#4A4A6A';
    ctx.beginPath();
    ctx.ellipse(w * 0.2, h * 0.75, 50, 25, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(w * 0.8, h * 0.78, 40, 20, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawGiftDecorations(w: number, h: number): void {
    const ctx = this.ctx;

    for (let i = 0; i < 30; i++) {
      const x = (i / 30) * w + Math.sin(this.time * 0.5 + i) * 20;
      const y = (h * 0.3) + Math.sin(this.time * 0.3 + i * 0.8) * 50;
      const size = 3 + Math.sin(this.time + i) * 2;
      const alpha = 0.5 + Math.sin(this.time * 2 + i) * 0.3;

      ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
      ctx.beginPath();
      this.drawStar(x, y, 5, size, size * 0.5);
      ctx.fill();
    }

    const giftX = w * 0.7;
    const giftY = h * 0.6;
    const giftSize = 50;

    ctx.fillStyle = '#E91E63';
    ctx.fillRect(giftX - giftSize, giftY - giftSize * 0.7, giftSize * 2, giftSize * 1.4);

    ctx.fillStyle = '#FFD700';
    ctx.fillRect(giftX - 8, giftY - giftSize * 0.7, 16, giftSize * 1.4);
    ctx.fillRect(giftX - giftSize, giftY - 5, giftSize * 2, 10);

    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.ellipse(giftX - 15, giftY - giftSize * 0.7 - 5, 15, 10, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(giftX + 15, giftY - giftSize * 0.7 - 5, 15, 10, 0.3, 0, Math.PI * 2);
    ctx.fill();

    const giftGlow = ctx.createRadialGradient(giftX, giftY, 10, giftX, giftY, 100);
    giftGlow.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
    giftGlow.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = giftGlow;
    ctx.fillRect(giftX - 100, giftY - 100, 200, 200);
  }

  private drawDarkDecorations(w: number, h: number): void {
    const ctx = this.ctx;

    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, h * 0.85, w, h * 0.15);

    const fogGradient = ctx.createLinearGradient(0, h * 0.5, 0, h * 0.85);
    fogGradient.addColorStop(0, 'rgba(50, 50, 80, 0)');
    fogGradient.addColorStop(1, 'rgba(30, 30, 50, 0.8)');
    ctx.fillStyle = fogGradient;
    ctx.fillRect(0, h * 0.5, w, h * 0.35);

    ctx.fillStyle = '#1A1A2A';
    for (let i = 0; i < w; i += 50) {
      const height = 100 + Math.sin(i * 0.05) * 50;
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 25, height);
      ctx.lineTo(i + 50, 0);
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawSunsetDecorations(w: number, h: number): void {
    const ctx = this.ctx;

    const sunY = h * 0.35 + Math.sin(this.time * 0.2) * 5;
    const sunGlow = ctx.createRadialGradient(w * 0.5, sunY, 20, w * 0.5, sunY, 150);
    sunGlow.addColorStop(0, 'rgba(255, 255, 200, 0.8)');
    sunGlow.addColorStop(0.5, 'rgba(255, 200, 100, 0.4)');
    sunGlow.addColorStop(1, 'rgba(255, 150, 50, 0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(w * 0.5 - 150, sunY - 150, 300, 300);

    ctx.fillStyle = '#FFF8E1';
    ctx.beginPath();
    ctx.arc(w * 0.5, sunY, 40, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#E65100';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.75);
    ctx.quadraticCurveTo(w * 0.2, h * 0.55, w * 0.4, h * 0.7);
    ctx.quadraticCurveTo(w * 0.6, h * 0.5, w * 0.8, h * 0.65);
    ctx.quadraticCurveTo(w * 0.9, h * 0.6, w, h * 0.72);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#BF360C';
    for (let i = 0; i < 5; i++) {
      const cloudX = w * (0.1 + i * 0.2) + Math.sin(this.time * 0.3 + i) * 10;
      const cloudY = h * 0.15 + i * 8;
      ctx.beginPath();
      ctx.ellipse(cloudX, cloudY, 40 + i * 5, 15, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const birdOffset = (this.time * 30) % (w + 100) - 50;
    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const bx = birdOffset + i * 40;
      const by = h * 0.2 + Math.sin(this.time * 3 + i) * 10;
      ctx.beginPath();
      ctx.moveTo(bx - 8, by);
      ctx.quadraticCurveTo(bx - 4, by - 5, bx, by);
      ctx.quadraticCurveTo(bx + 4, by - 5, bx + 8, by);
      ctx.stroke();
    }
  }

  private drawStar(cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number): void {
    const ctx = this.ctx;
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
      rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  }

  private drawCharacter(scene: SceneData): void {
    const ctx = this.ctx;
    const x = scene.characterPosition.x * this.width;
    let y = scene.characterPosition.y * this.height;
    const mood = this.gameState.getCharacterMood();

    if (this.reactionActive) {
      if (mood === 'happy') {
        y += Math.sin(this.reactionTimer * 15) * -10;
      } else if (mood === 'angry') {
        y += Math.sin(this.reactionTimer * 30) * 3;
      } else if (mood === 'sad') {
        y += 8;
      }
    }

    ctx.save();
    ctx.translate(x, y);

    this.drawCharacterBody(mood);
    this.drawCharacterHead(mood);
    this.drawAccessory(mood);

    ctx.restore();
  }

  private drawCharacterBody(mood: CharacterMood): void {
    const ctx = this.ctx;

    const bodyColor = '#5C6BC0';
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, 20, 22, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#7986CB';
    ctx.beginPath();
    ctx.ellipse(0, 22, 18, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    const armSwing = Math.sin(this.characterAnimFrame * Math.PI / 2) * 5;

    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(-25, 15 + armSwing, 8, 14, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(25, 15 - armSwing, 8, 14, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFCCBC';
    ctx.beginPath();
    ctx.arc(-25, 28 + armSwing, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(25, 28 - armSwing, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3F51B5';
    const legSwing = Math.sin(this.characterAnimFrame * Math.PI / 2) * 4;
    ctx.beginPath();
    ctx.ellipse(-10, 45 + legSwing, 7, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(10, 45 - legSwing, 7, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#5D4037';
    ctx.beginPath();
    ctx.ellipse(-10, 55 + legSwing, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(10, 55 - legSwing, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawCharacterHead(mood: CharacterMood): void {
    const ctx = this.ctx;

    ctx.fillStyle = '#FFCCBC';
    ctx.beginPath();
    ctx.arc(0, -20, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8D6E63';
    ctx.beginPath();
    ctx.arc(0, -28, 25, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8D6E63';
    ctx.beginPath();
    ctx.ellipse(-20, -25, 6, 10, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(20, -25, 6, 10, 0.3, 0, Math.PI * 2);
    ctx.fill();

    if (mood === 'happy') {
      ctx.fillStyle = '#1A1A2E';
      ctx.beginPath();
      ctx.arc(-10, -18, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(10, -18, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-8, -20, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(12, -20, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#1A1A2E';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -10, 8, 0.2, Math.PI - 0.2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 138, 128, 0.5)';
      ctx.beginPath();
      ctx.ellipse(-18, -10, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(18, -10, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (mood === 'angry') {
      ctx.fillStyle = '#1A1A2E';
      ctx.beginPath();
      ctx.arc(-10, -18, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(10, -18, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#1A1A2E';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-18, -28);
      ctx.lineTo(-5, -25);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(18, -28);
      ctx.lineTo(5, -25);
      ctx.stroke();

      ctx.strokeStyle = '#1A1A2E';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -5, 7, Math.PI + 0.3, -0.3);
      ctx.stroke();
    } else if (mood === 'sad') {
      ctx.fillStyle = '#1A1A2E';
      ctx.beginPath();
      ctx.arc(-10, -16, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(10, -16, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#1A1A2E';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-18, -25);
      ctx.lineTo(-5, -28);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(18, -25);
      ctx.lineTo(5, -28);
      ctx.stroke();

      ctx.strokeStyle = '#1A1A2E';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -5, 7, Math.PI + 0.2, -0.2);
      ctx.stroke();

      ctx.fillStyle = '#64B5F6';
      ctx.beginPath();
      ctx.ellipse(-14, -10, 2, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#1A1A2E';
      ctx.beginPath();
      ctx.arc(-10, -18, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(10, -18, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(-8, -20, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(12, -20, 1, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#1A1A2E';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-5, -10);
      ctx.lineTo(5, -10);
      ctx.stroke();
    }
  }

  private drawAccessory(mood: CharacterMood): void {
    const ctx = this.ctx;

    ctx.fillStyle = '#B71C1C';
    ctx.beginPath();
    ctx.moveTo(0, -48);
    ctx.lineTo(-10, -30);
    ctx.lineTo(10, -30);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, -35, 4, 0, Math.PI * 2);
    ctx.fill();

    if (mood === 'happy') {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      const sparkleAngle = this.time * 3;
      for (let i = 0; i < 4; i++) {
        const angle = sparkleAngle + (i * Math.PI) / 2;
        const dist = 35 + Math.sin(this.time * 4 + i) * 5;
        const sx = Math.cos(angle) * dist;
        const sy = Math.sin(angle) * dist - 20;
        ctx.beginPath();
        ctx.moveTo(sx - 5, sy);
        ctx.lineTo(sx + 5, sy);
        ctx.moveTo(sx, sy - 5);
        ctx.lineTo(sx, sy + 5);
        ctx.stroke();
      }
    }
  }

  private drawDialogBubble(scene: SceneData): void {
    const ctx = this.ctx;
    const dialog = this.gameState.getCurrentDialog();
    if (!dialog) return;

    const charX = scene.characterPosition.x * this.width;
    const charY = scene.characterPosition.y * this.height;
    const bubbleX = charX;
    const bubbleY = charY - 130;
    const maxWidth = 350;
    const padding = 18;

    const displayText = dialog.text.substring(0, Math.floor(this.typewriterProgress));

    ctx.font = '16px "Microsoft YaHei", "PingFang SC", sans-serif';
    const lines = this.wrapText(displayText, maxWidth - padding * 2);
    const lineHeight = 24;
    const bubbleWidth = maxWidth;
    const bubbleHeight = lines.length * lineHeight + padding * 2 + 10;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 2;

    this.roundRect(bubbleX - bubbleWidth / 2, bubbleY - bubbleHeight, bubbleWidth, bubbleHeight, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.moveTo(bubbleX - 12, bubbleY);
    ctx.lineTo(bubbleX + 12, bubbleY);
    ctx.lineTo(bubbleX, bubbleY + 15);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bubbleX - 12, bubbleY);
    ctx.lineTo(bubbleX + 12, bubbleY);
    ctx.stroke();

    ctx.fillStyle = '#5C6BC0';
    ctx.font = 'bold 14px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.fillText(dialog.speaker, bubbleX - bubbleWidth / 2 + padding, bubbleY - bubbleHeight + padding + 14);

    ctx.fillStyle = '#1A1A2E';
    ctx.font = '16px "Microsoft YaHei", "PingFang SC", sans-serif';
    lines.forEach((line, i) => {
      ctx.fillText(line, bubbleX - bubbleWidth / 2 + padding, bubbleY - bubbleHeight + padding + 38 + i * lineHeight);
    });

    if (this.isTypewriterComplete && !this.gameState.hasMoreDialogs()) {
      const blink = Math.sin(this.time * 4) > 0;
      if (blink) {
        ctx.fillStyle = '#666';
        ctx.font = '12px "Microsoft YaHei", "PingFang SC", sans-serif';
        ctx.fillText('▼', bubbleX + bubbleWidth / 2 - 20, bubbleY - 12);
      }
    }
  }

  private wrapText(text: string, maxWidth: number): string[] {
    const ctx = this.ctx;
    const lines: string[] = [];
    let currentLine = '';

    for (const char of text) {
      const testLine = currentLine + char;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
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

  private drawParticles(): void {
    const ctx = this.ctx;

    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;

      if (p.type === 'sparkle') {
        ctx.fillStyle = p.color;
        this.drawStar(p.x, p.y, 5, p.size, p.size * 0.5);
        ctx.fill();
      } else if (p.type === 'teardrop') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size * 0.6, p.size, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'exclamation') {
        ctx.fillStyle = p.color;
        ctx.font = `bold ${p.size * 2}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('!', p.x, p.y);
      }

      ctx.globalAlpha = 1;
    }
  }

  private drawTransition(progress: number, direction: 'in' | 'out'): void {
    const ctx = this.ctx;
    const alpha = direction === 'out' ? progress : 1 - progress;

    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  isReactionActive(): boolean {
    return this.reactionActive;
  }
}
