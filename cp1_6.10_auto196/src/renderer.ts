import { Star, StarTrack, StarField } from './starField';
import { ConnectionGame, MatchEvent } from './connectionGame';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  startTime: number;
  lifetime: number;
}

interface RippleEffect {
  centerX: number;
  centerY: number;
  color: string;
  startTime: number;
  lifetime: number;
  maxRadius: number;
}

interface EdgeRipple {
  startTime: number;
  lifetime: number;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private starField: StarField;
  private game: ConnectionGame;
  private width: number;
  private height: number;
  private dpr: number;
  private particles: Particle[] = [];
  private ripples: RippleEffect[] = [];
  private edgeRipples: EdgeRipple[] = [];
  private buttonHover = false;
  private buttonPress = false;
  private buttonPressTime = 0;
  private settlingRotationAngle = 0;

  private readonly RESTART_BUTTON = {
    x: 0,
    y: 0,
    radius: 30,
    size: 60
  };

  constructor(
    canvas: HTMLCanvasElement,
    starField: StarField,
    game: ConnectionGame
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas 2D context');
    this.ctx = ctx;
    this.starField = starField;
    this.game = game;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this.buttonHover = this.isPointInButton(x, y);
      this.canvas.style.cursor = this.buttonHover ? 'pointer' : 'crosshair';
    });

    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (this.isPointInButton(x, y)) {
        this.buttonPress = true;
        this.buttonPressTime = performance.now();
        e.preventDefault();
        e.stopPropagation();
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (this.buttonPress && this.isPointInButton(x, y)) {
        this.game.restart();
      }
      this.buttonPress = false;
    });
  }

  private isPointInButton(x: number, y: number): boolean {
    const bx = this.width - this.RESTART_BUTTON.radius - 20;
    const by = this.RESTART_BUTTON.radius + 20;
    const dx = x - bx;
    const dy = y - by;
    return dx * dx + dy * dy <= this.RESTART_BUTTON.radius * this.RESTART_BUTTON.radius;
  }

  resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  handleMatch(event: MatchEvent): void {
    for (const star of event.stars) {
      this.createBurstParticles(star, event.currentTime);
      this.createRipple(star, event.currentTime);
    }
    this.starField.triggerBlink(event.neighborIds, event.currentTime);
    this.edgeRipples.push({
      startTime: event.currentTime,
      lifetime: 800
    });
  }

  private createBurstParticles(star: Star, startTime: number): void {
    const count = Math.floor(20 + Math.random() * 11);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 80 + Math.random() * 120;
      this.particles.push({
        x: star.x,
        y: star.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 2,
        color: star.color,
        startTime,
        lifetime: 1000
      });
    }
  }

  private createRipple(star: Star, startTime: number): void {
    this.ripples.push({
      centerX: star.x,
      centerY: star.y,
      color: star.color,
      startTime,
      lifetime: 1200,
      maxRadius: 80
    });
  }

  render(currentTime: number): void {
    this.cleanupEffects(currentTime);

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground(currentTime);
    this.drawTracks();
    this.drawDragLine();
    this.drawParticles(currentTime);
    this.drawStars(currentTime);
    this.drawRipples(currentTime);
    this.drawEdgeRipples(currentTime);
    this.drawScore(currentTime);

    if (this.game.getPhase() === 'settling') {
      this.drawSettlingScreen(currentTime);
    }

    this.drawRestartButton(currentTime);
  }

  private cleanupEffects(currentTime: number): void {
    this.particles = this.particles.filter(
      p => currentTime - p.startTime < p.lifetime
    );
    this.ripples = this.ripples.filter(
      r => currentTime - r.startTime < r.lifetime
    );
    this.edgeRipples = this.edgeRipples.filter(
      r => currentTime - r.startTime < r.lifetime
    );
  }

  private drawBackground(currentTime: number): void {
    const ctx = this.ctx;
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);

    const isSettling = this.game.getPhase() === 'settling';
    let rotation = 0;
    if (isSettling) {
      const settlingTime = currentTime - this.game.getSettlingStartTime();
      rotation = Math.min(1, settlingTime / 4000) * Math.PI * 2;
    } else {
      rotation = (currentTime / 100000) * Math.PI * 2;
    }
    this.settlingRotationAngle = rotation;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);
    ctx.translate(-centerX, -centerY);

    const gradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, maxRadius
    );
    gradient.addColorStop(0, '#2a2a5e');
    gradient.addColorStop(0.5, '#1a1a3e');
    gradient.addColorStop(1, '#0b0b20');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawBackgroundStars(centerX, centerY, maxRadius);

    ctx.restore();
  }

  private drawBackgroundStars(cx: number, cy: number, maxR: number): void {
    const ctx = this.ctx;
    const seed = 12345;
    const count = 150;
    for (let i = 0; i < count; i++) {
      const angle = ((i * 7919) % 1000) / 1000 * Math.PI * 2;
      const r = ((i * 104729) % 1000) / 1000 * maxR * 0.95;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      const size = 0.5 + ((i * 31) % 100) / 100 * 1;
      const alpha = 0.1 + ((i * 17) % 100) / 100 * 0.3;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }
  }

  private drawTracks(): void {
    const ctx = this.ctx;
    const tracks = this.starField.getTracks();
    const stars = this.starField.getStars();
    const starMap = new Map(stars.map(s => [s.id, s]));

    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);

    for (const track of tracks) {
      const from = starMap.get(track.fromId);
      const to = starMap.get(track.toId);
      if (!from || !to || from.isRemoving || to.isRemoving) continue;

      const avgColor = from.color;
      ctx.strokeStyle = hexToRgba(avgColor, 0.2);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }

  private drawDragLine(): void {
    if (!this.game.isInDraggingState()) return;

    const selectedId = this.game.getSelectedStarId();
    const endPoint = this.game.getDragEndPoint();
    if (selectedId === null || !endPoint) return;

    const star = this.starField.getStarById(selectedId);
    if (!star) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = hexToRgba(star.color, 0.8);
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(star.x, star.y);
    ctx.lineTo(endPoint.x, endPoint.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  private drawStars(currentTime: number): void {
    const ctx = this.ctx;
    const stars = this.starField.getStars();

    for (const star of stars) {
      let alpha = 1;
      let scale = 1;

      if (star.isRemoving) {
        const t = (currentTime - star.removeStartTime) / 1000;
        alpha = Math.max(0, 1 - t);
        scale = 1 + t * 0.5;
      }

      let brightness = 1;
      if (star.isBlinking) {
        const t = (currentTime - star.blinkStartTime) / 300;
        const blinkPhase = Math.floor(t) % 2;
        const blinkT = t - Math.floor(t);
        brightness = blinkPhase === 0
          ? 1 + 0.5 * Math.sin(blinkT * Math.PI)
          : 1 + 0.5 * Math.sin(blinkT * Math.PI + Math.PI);
        brightness = Math.max(1, brightness);
      }

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(star.x, star.y);
      ctx.scale(scale, scale);

      const glowRadius = star.glowRadius * brightness;
      const glowGradient = ctx.createRadialGradient(
        0, 0, 0,
        0, 0, glowRadius
      );
      glowGradient.addColorStop(0, hexToRgba(star.color, star.glowAlpha * brightness));
      glowGradient.addColorStop(1, hexToRgba(star.color, 0));
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      const coreGradient = ctx.createRadialGradient(
        0, 0, 0,
        0, 0, star.radius
      );
      coreGradient.addColorStop(0, '#ffffff');
      coreGradient.addColorStop(0.5, star.color);
      coreGradient.addColorStop(1, hexToRgba(star.color, 0.7));
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(0, 0, star.radius * brightness, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawParticles(currentTime: number): void {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const t = (currentTime - p.startTime) / p.lifetime;
      if (t >= 1) continue;

      const x = p.x + p.vx * t;
      const y = p.y + p.vy * t;
      const alpha = 1 - t;

      ctx.save();
      ctx.globalAlpha = alpha;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, p.radius);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.3, p.color);
      gradient.addColorStop(1, hexToRgba(p.color, 0));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, p.radius * (1 - t * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawRipples(currentTime: number): void {
    const ctx = this.ctx;
    for (const r of this.ripples) {
      const t = (currentTime - r.startTime) / r.lifetime;
      if (t >= 1) continue;

      const radius = r.maxRadius * t;
      const alpha = (1 - t) * 0.8;

      ctx.save();
      const gradient = ctx.createRadialGradient(
        r.centerX, r.centerY, radius * 0.6,
        r.centerX, r.centerY, radius
      );
      gradient.addColorStop(0, hexToRgba(r.color, 0));
      gradient.addColorStop(0.7, hexToRgba(r.color, alpha * 0.5));
      gradient.addColorStop(1, hexToRgba(r.color, 0));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(r.centerX, r.centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawEdgeRipples(currentTime: number): void {
    if (this.edgeRipples.length === 0) return;

    const ctx = this.ctx;
    const latest = this.edgeRipples[this.edgeRipples.length - 1];
    const t = (currentTime - latest.startTime) / latest.lifetime;
    if (t >= 1) return;

    const maxDist = Math.max(this.width, this.height);
    const waveWidth = 80;
    const dist = maxDist * t;
    const alpha = (1 - t) * 0.15;

    ctx.save();
    const gradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, Math.max(0, dist - waveWidth),
      this.width / 2, this.height / 2, dist
    );
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(0.5, `rgba(200, 200, 255, ${alpha})`);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }

  private drawScore(currentTime: number): void {
    const ctx = this.ctx;
    const score = this.game.getScore();
    const pulseTime = this.game.getScorePulseTime();
    const pulseT = pulseTime > 0 ? (currentTime - pulseTime) / 300 : 1;
    const scale = pulseT < 1 ? 1 + 0.2 * (1 - pulseT) : 1;

    ctx.save();
    ctx.translate(24, 36);
    ctx.scale(scale, scale);
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.shadowBlur = 8;
    ctx.fillText(`积分: ${score}`, 0, 0);
    ctx.restore();

    const combo = this.game.getComboCount();
    if (combo > 1) {
      ctx.save();
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#ffd93d';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(255, 217, 61, 0.6)';
      ctx.shadowBlur = 10;
      ctx.fillText(`${combo} 连击!`, 24, 68);
      ctx.restore();
    }
  }

  private drawRestartButton(currentTime: number): void {
    const ctx = this.ctx;
    const bx = this.width - this.RESTART_BUTTON.radius - 20;
    const by = this.RESTART_BUTTON.radius + 20;

    let scale = 1;
    if (this.buttonPress) {
      const t = (currentTime - this.buttonPressTime) / 200;
      scale = t < 0.5 ? 0.9 + t * 0.2 : 1 - (t - 0.5) * 0.2;
      scale = Math.max(0.9, Math.min(1, scale));
    }

    const bgAlpha = this.buttonHover ? 0.2 : 0.1;

    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(scale, scale);

    ctx.fillStyle = `rgba(255, 255, 255, ${bgAlpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, this.RESTART_BUTTON.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 255, 255, ${bgAlpha + 0.1})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = '28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255, 255, 255, 0.4)';
    ctx.shadowBlur = 6;
    ctx.fillText('↻', 0, 1);

    ctx.restore();
  }

  private drawSettlingScreen(currentTime: number): void {
    const ctx = this.ctx;
    const settlingTime = currentTime - this.game.getSettlingStartTime();

    ctx.save();
    ctx.fillStyle = 'rgba(11, 11, 32, 0.6)';
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();

    const titleT = Math.min(1, Math.max(0, (settlingTime - 300) / 600));
    const titleY = this.height / 2 - 80;

    if (titleT > 0) {
      const easedT = easeOutBack(titleT);
      const translateY = 40 * (1 - easedT);
      const alpha = titleT;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(0, translateY);
      ctx.font = 'bold 48px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffd93d';
      ctx.shadowColor = 'rgba(255, 217, 61, 0.5)';
      ctx.shadowBlur = 20;
      ctx.fillText('✨ 星轨完成 ✨', this.width / 2, titleY);
      ctx.restore();
    }

    const statsStart = 1000;
    const statItems = [
      { label: '总积分', value: this.game.getScore() },
      { label: '消除组数', value: this.game.getEliminatedPairs() },
      { label: '最大连击', value: this.game.getMaxCombo() }
    ];

    statItems.forEach((item, index) => {
      const itemStart = statsStart + index * 250;
      const t = Math.min(1, Math.max(0, (settlingTime - itemStart) / 600));
      if (t <= 0) return;

      const easedT = easeOutCubic(t);
      const translateY = 40 * (1 - easedT);
      const alpha = t;
      const y = this.height / 2 + index * 50;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(0, translateY);
      ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
      ctx.shadowBlur = 8;
      ctx.fillText(`${item.label}: ${item.value}`, this.width / 2, y);
      ctx.restore();
    });
  }
}
