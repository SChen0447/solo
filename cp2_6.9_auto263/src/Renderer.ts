import { GameEngine, Player, Artifact, Enemy, Particle, ShipSection, SeaCreature, Debris, Exit } from './GameEngine';

const CANVAS_W = 960;
const CANVAS_H = 540;
const SPOTLIGHT_LENGTH = 80;
const SPOTLIGHT_ANGLE = Math.PI / 6;

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private artifactCounterEl: HTMLElement | null;
  private timerDisplayEl: HTMLElement | null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.artifactCounterEl = document.getElementById('artifact-counter');
    this.timerDisplayEl = document.getElementById('timer-display');
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
  }

  public handleResize(): void {
    const container = document.getElementById('game-container');
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const aspect = CANVAS_W / CANVAS_H;
    let w = cw;
    let h = cw / aspect;
    if (h > ch) {
      h = ch;
      w = ch * aspect;
    }
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
  }

  public render(engine: GameEngine): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    if (engine.state === 'TITLE') {
      this.renderTitle();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(engine.shakeOffset.x, engine.shakeOffset.y);

    this.renderBackground();
    this.renderDebris(engine.debris);
    this.renderSeaCreatures(engine.seaCreatures);
    this.renderShip(engine.shipSections);
    this.renderExit(engine.exit, engine.countdownActive);
    this.renderArtifacts(engine.artifacts, engine.player);
    this.renderEnemies(engine.enemies);
    this.renderParticles(engine.particles);
    this.renderPlayer(engine.player);

    if (engine.player.spotlightOn) {
      this.renderSpotlight(engine.player);
    }

    ctx.restore();

    this.updateHUD(engine);

    if (engine.state === 'WIN') {
      this.renderWinScreen(engine);
    } else if (engine.state === 'LOSE') {
      this.renderLoseScreen();
    }

    ctx.restore();
  }

  private renderTitle(): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    gradient.addColorStop(0, '#001F3F');
    gradient.addColorStop(1, '#000B18');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '24px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('深海沉船', CANVAS_W / 2, CANVAS_H / 2 - 20);

    ctx.fillStyle = '#AAAAAA';
    ctx.font = '16px monospace';
    const t = Math.floor(Date.now() / 500) % 2;
    if (t === 0) {
      ctx.fillText('按空格开始', CANVAS_W / 2, CANVAS_H / 2 + 20);
    }

    ctx.fillStyle = '#888888';
    ctx.font = '12px monospace';
    ctx.fillText('WASD/方向键移动，空格开启探照灯', CANVAS_W / 2, CANVAS_H / 2 + 60);
  }

  private renderBackground(): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    gradient.addColorStop(0, '#001F3F');
    gradient.addColorStop(1, '#000B18');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = '#00336620';
    for (let i = 0; i < 20; i++) {
      const x = (i * 53 + (Date.now() / 50) % 100) % CANVAS_W;
      const y = (i * 37) % CANVAS_H;
      ctx.fillRect(Math.floor(x), Math.floor(y), 2, 2);
    }
  }

  private renderShip(sections: ShipSection[]): void {
    const ctx = this.ctx;
    for (const section of sections) {
      ctx.save();
      if (section.falling) {
        ctx.translate(section.x + section.w / 2, section.y + section.h / 2);
        ctx.rotate(section.rotation);
        ctx.translate(-(section.x + section.w / 2), -(section.y + section.h / 2));
      }
      if (section.shape === 'rect') {
        const gradient = ctx.createLinearGradient(section.x, section.y, section.x, section.y + section.h);
        gradient.addColorStop(0, '#A0522D');
        gradient.addColorStop(1, '#8B4513');
        ctx.fillStyle = gradient;
        ctx.fillRect(section.x, section.y, section.w, section.h);
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 1;
        ctx.strokeRect(section.x, section.y, section.w, section.h);
      } else if (section.shape === 'triangle') {
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.moveTo(section.x, section.y + section.h);
        ctx.lineTo(section.x + section.w / 2, section.y);
        ctx.lineTo(section.x + section.w, section.y + section.h);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private renderSeaCreatures(creatures: SeaCreature[]): void {
    const ctx = this.ctx;
    for (const c of creatures) {
      const offset = Math.sin(c.phase) * 2;
      const y = c.y + (c.isTop ? offset : -offset);
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(c.x, y, c.size, 0, Math.PI * 2);
      ctx.fill();
      if (c.color === '#2ECC71') {
        ctx.fillStyle = '#1E8449';
        ctx.beginPath();
        ctx.arc(c.x, y, c.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private renderDebris(debrisList: Debris[]): void {
    const ctx = this.ctx;
    for (const d of debrisList) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rotation);
      ctx.fillStyle = d.falling ? '#5D4037' : '#6D4C41';
      ctx.beginPath();
      if (d.points.length > 0) {
        ctx.moveTo(d.points[0].x, d.points[0].y);
        for (let i = 1; i < d.points.length; i++) {
          ctx.lineTo(d.points[i].x, d.points[i].y);
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#3E2723';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderExit(exit: Exit, active: boolean): void {
    if (!active) return;
    const ctx = this.ctx;
    const blink = (Math.sin(exit.blinkPhase) + 1) / 2;
    ctx.globalAlpha = 0.5 + blink * 0.5;

    const arrowX = exit.x + exit.w + 8;
    const arrowY = exit.y + exit.h / 2;
    ctx.fillStyle = '#00FF00';
    ctx.beginPath();
    ctx.moveTo(arrowX - 8, arrowY - 12);
    ctx.lineTo(arrowX + 4, arrowY);
    ctx.lineTo(arrowX - 8, arrowY + 12);
    ctx.lineTo(arrowX - 4, arrowY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(exit.x, exit.y, exit.w, exit.h);
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  private renderArtifacts(artifacts: Artifact[], player: Player): void {
    const ctx = this.ctx;
    for (const a of artifacts) {
      if (a.collected && a.fadeOut <= 0) continue;
      const alpha = a.collected ? a.fadeOut : 1;
      const flash = (Math.sin(a.flashPhase) + 1) / 2;
      ctx.globalAlpha = alpha;

      const inSpotlight = player.spotlightOn && this.isInSpotlight(player, a.x, a.y);
      const brightness = inSpotlight ? 1 : 0.55;

      ctx.fillStyle = `rgba(${Math.floor(255 * brightness)}, ${Math.floor(215 * brightness)}, 0, ${alpha})`;
      ctx.fillRect(a.x - 3, a.y - 2, 6, 4);
      ctx.fillStyle = `rgba(255, 255, 200, ${flash * alpha})`;
      ctx.fillRect(a.x - 3, a.y - 2, 2, 2);

      if (inSpotlight && !a.collected) {
        ctx.fillStyle = `rgba(255, 255, 0, ${0.3 * flash})`;
        ctx.beginPath();
        ctx.arc(a.x, a.y, 10, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  private renderEnemies(enemies: Enemy[]): void {
    const ctx = this.ctx;
    for (const e of enemies) {
      ctx.fillStyle = '#FF4444';
      ctx.fillRect(e.x - 3, e.y - 3, 6, 6);
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(e.x - 2, e.y - 2, 2, 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(e.x - 1, e.y - 1, 1, 1);
    }
  }

  private renderParticles(particles: Particle[]): void {
    const ctx = this.ctx;
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private renderPlayer(player: Player): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    const flash = player.flashTimer > 0;
    ctx.fillStyle = flash ? '#FFFFFF' : '#00BFFF';
    ctx.fillRect(-4, -3, 8, 6);
    ctx.fillRect(-3, -4, 6, 8);

    ctx.fillStyle = flash ? '#FFFFFF' : '#87CEEB';
    ctx.fillRect(-2, -2, 4, 4);

    ctx.fillStyle = flash ? '#FFFFFF' : '#0099CC';
    ctx.beginPath();
    ctx.arc(1, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = flash ? '#FFFFFF' : '#0077AA';
    ctx.fillRect(-5, -1, 2, 2);

    ctx.restore();
  }

  private renderSpotlight(player: Player): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, SPOTLIGHT_LENGTH);
    gradient.addColorStop(0, 'rgba(255, 215, 0, 0.25)');
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(
      Math.cos(-SPOTLIGHT_ANGLE) * SPOTLIGHT_LENGTH,
      Math.sin(-SPOTLIGHT_ANGLE) * SPOTLIGHT_LENGTH
    );
    ctx.lineTo(
      Math.cos(SPOTLIGHT_ANGLE) * SPOTLIGHT_LENGTH,
      Math.sin(SPOTLIGHT_ANGLE) * SPOTLIGHT_LENGTH
    );
    ctx.closePath();

    ctx.fillStyle = gradient;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fill();
    ctx.restore();
  }

  private isInSpotlight(player: Player, px: number, py: number): boolean {
    const dx = px - player.x;
    const dy = py - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > SPOTLIGHT_LENGTH) return false;
    const angle = Math.atan2(dy, dx);
    let diff = angle - player.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff) <= SPOTLIGHT_ANGLE;
  }

  private updateHUD(engine: GameEngine): void {
    if (this.artifactCounterEl) {
      this.artifactCounterEl.textContent = `文物: ${engine.collectedCount}`;
    }
    if (this.timerDisplayEl) {
      if (engine.countdownActive) {
        this.timerDisplayEl.style.display = 'block';
        const sec = Math.max(0, Math.ceil(engine.countdown));
        this.timerDisplayEl.textContent = `${sec}`;
        if (sec <= 10) {
          this.timerDisplayEl.classList.add('blinking');
        } else {
          this.timerDisplayEl.classList.remove('blinking');
        }
      } else {
        this.timerDisplayEl.style.display = 'none';
      }
    }
  }

  private renderWinScreen(engine: GameEngine): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#00FF0040';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('逃脱成功', CANVAS_W / 2, CANVAS_H / 2 - 40);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px monospace';
    ctx.fillText(`收集文物: ${engine.collectedCount}`, CANVAS_W / 2, CANVAS_H / 2);
    ctx.fillText(`用时: ${engine.timeElapsed.toFixed(1)}秒`, CANVAS_W / 2, CANVAS_H / 2 + 24);
    ctx.fillText('即将返回标题...', CANVAS_W / 2, CANVAS_H / 2 + 56);
  }

  private renderLoseScreen(): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#FF000040';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('游戏结束', CANVAS_W / 2, CANVAS_H / 2 - 20);
    ctx.font = '16px monospace';
    ctx.fillText('即将返回标题...', CANVAS_W / 2, CANVAS_H / 2 + 20);
  }
}
