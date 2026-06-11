import type {
  GameState,
  Player,
  Mushroom,
  Spore,
  StarDust,
  Tentacle,
  Portal,
  Star,
  Particle,
} from './entities';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private mushroomCacheDirty: boolean = true;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;

    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;
    const offCtx = this.offscreenCanvas.getContext('2d');
    if (!offCtx) throw new Error('Failed to get offscreen canvas context');
    this.offscreenCtx = offCtx;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.ctx.canvas.width = width;
    this.ctx.canvas.height = height;
    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;
    this.mushroomCacheDirty = true;
  }

  invalidateMushroomCache(): void {
    this.mushroomCacheDirty = true;
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createRadialGradient(
      this.width / 2,
      this.height,
      0,
      this.width / 2,
      this.height / 2,
      this.height
    );
    gradient.addColorStop(0, '#0a0e27');
    gradient.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawStars(ctx: CanvasRenderingContext2D, stars: Star[]): void {
    for (const s of stars) {
      const brightness = (Math.sin(s.blinkPhase) + 1) / 2;
      const alpha = 0.3 + brightness * 0.7;
      ctx.beginPath();
      ctx.arc(s.pos.x, s.pos.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }
  }

  private drawMushroom(ctx: CanvasRenderingContext2D, m: Mushroom): void {
    const scale = m.pulseScale;
    const capR = m.capRadius * scale;
    const stemH = m.stemHeight * scale;
    const stemW = m.stemWidth * scale;
    const x = m.pos.x;
    const y = m.pos.y;

    const glowGrad = ctx.createRadialGradient(x, y - stemH / 2, 0, x, y - stemH / 2, capR * 2.5);
    glowGrad.addColorStop(0, 'rgba(180, 255, 180, 0.25)');
    glowGrad.addColorStop(0.5, 'rgba(100, 200, 255, 0.1)');
    glowGrad.addColorStop(1, 'rgba(100, 200, 255, 0)');
    ctx.beginPath();
    ctx.arc(x, y - stemH / 2, capR * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    ctx.fillStyle = '#8fbc5a';
    ctx.fillRect(x - stemW / 2, y - stemH, stemW, stemH);

    const capGrad = ctx.createRadialGradient(x - capR * 0.3, y - stemH - capR * 0.3, 0, x, y - stemH, capR);
    capGrad.addColorStop(0, '#8a5cf5');
    capGrad.addColorStop(1, '#3a5bd9');
    ctx.beginPath();
    ctx.ellipse(x, y - stemH, capR, capR * 0.7, 0, Math.PI, 0);
    ctx.fillStyle = capGrad;
    ctx.fill();

    const innerGlow = ctx.createRadialGradient(x, y - stemH, capR * 0.2, x, y - stemH, capR);
    innerGlow.addColorStop(0, 'rgba(200, 150, 255, 0.4)');
    innerGlow.addColorStop(1, 'rgba(200, 150, 255, 0)');
    ctx.beginPath();
    ctx.ellipse(x, y - stemH, capR, capR * 0.7, 0, Math.PI, 0);
    ctx.fillStyle = innerGlow;
    ctx.fill();

    ctx.fillStyle = 'rgba(220, 200, 255, 0.6)';
    for (let i = 0; i < 3; i++) {
      const angle = Math.PI * (0.2 + i * 0.3);
      const dx = Math.cos(angle) * capR * 0.5;
      const dy = -Math.sin(angle) * capR * 0.3;
      ctx.beginPath();
      ctx.arc(x + dx, y - stemH + dy, 1.5 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawCachedMushrooms(mushrooms: Mushroom[]): void {
    if (this.mushroomCacheDirty) {
      this.offscreenCtx.clearRect(0, 0, this.width, this.height);
      for (const m of mushrooms) {
        this.drawMushroom(this.offscreenCtx, m);
      }
      this.mushroomCacheDirty = false;
    }
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, player: Player): void {
    for (let i = player.trail.length - 1; i >= 0; i--) {
      const t = player.trail[i];
      const alpha = (1 - i / player.trailMaxLength) * 0.5;
      const r = player.radius * (1 - i / player.trailMaxLength) * 0.8;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 255, 213, ${alpha})`;
      ctx.fill();
    }

    const pulseAmount = 0.3 * Math.sin(player.glowPulse * Math.PI * 2);
    const glowR = player.glowRadius * (1 + pulseAmount);

    const glowGrad = ctx.createRadialGradient(
      player.pos.x, player.pos.y, 0,
      player.pos.x, player.pos.y, glowR
    );
    glowGrad.addColorStop(0, 'rgba(0, 255, 213, 0.6)');
    glowGrad.addColorStop(0.4, 'rgba(0, 255, 213, 0.2)');
    glowGrad.addColorStop(1, 'rgba(0, 255, 213, 0)');
    ctx.beginPath();
    ctx.arc(player.pos.x, player.pos.y, glowR, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    if (player.flashTimer > 0) {
      const flashAlpha = player.flashTimer / 100;
      ctx.beginPath();
      ctx.arc(player.pos.x, player.pos.y, player.radius * 2, 0, Math.PI * 2);
      ctx.fillStyle = player.flashColor.includes('rgba')
        ? player.flashColor
        : hexToRgba(player.flashColor, flashAlpha * 0.5);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(player.pos.x, player.pos.y, player.radius, 0, Math.PI * 2);
    const bodyGrad = ctx.createRadialGradient(
      player.pos.x - 3, player.pos.y - 3, 0,
      player.pos.x, player.pos.y, player.radius
    );
    bodyGrad.addColorStop(0, '#aaffee');
    bodyGrad.addColorStop(1, '#00ffd5');
    ctx.fillStyle = bodyGrad;
    ctx.fill();
  }

  private drawSpore(ctx: CanvasRenderingContext2D, s: Spore): void {
    const alpha = s.life / s.maxLife;
    ctx.beginPath();
    ctx.arc(s.pos.x, s.pos.y, s.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fill();
  }

  private drawStarDust(ctx: CanvasRenderingContext2D, star: StarDust): void {
    if (!star.active) return;

    ctx.save();
    ctx.translate(star.pos.x, star.pos.y);
    ctx.rotate(star.rotation);

    const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, star.size * 1.5);
    glowGrad.addColorStop(0, 'rgba(255, 215, 0, 0.5)');
    glowGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.beginPath();
    ctx.arc(0, 0, star.size * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = glowGrad;
    ctx.fill();

    const r = star.size / 2;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const outerAngle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const innerAngle = outerAngle + Math.PI / 5;
      if (i === 0) {
        ctx.moveTo(Math.cos(outerAngle) * r, Math.sin(outerAngle) * r);
      } else {
        ctx.lineTo(Math.cos(outerAngle) * r, Math.sin(outerAngle) * r);
      }
      ctx.lineTo(Math.cos(innerAngle) * r * 0.4, Math.sin(innerAngle) * r * 0.4);
    }
    ctx.closePath();

    const starGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    starGrad.addColorStop(0, '#fff7aa');
    starGrad.addColorStop(1, '#ffd700');
    ctx.fillStyle = starGrad;
    ctx.fill();

    ctx.restore();
  }

  private drawTentacle(ctx: CanvasRenderingContext2D, t: Tentacle): void {
    if (!t.active || t.segments.length < 2) return;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const baseGrad = ctx.createLinearGradient(
      t.segments[0].x, t.segments[0].y,
      t.tipPos.x, t.tipPos.y
    );
    baseGrad.addColorStop(0, '#2d0a3e');
    baseGrad.addColorStop(0.5, '#4a1060');
    baseGrad.addColorStop(1, '#6a1a8a');

    ctx.strokeStyle = baseGrad;
    ctx.lineWidth = t.thickness;
    ctx.beginPath();
    ctx.moveTo(t.basePos.x, t.basePos.y);
    for (let i = 0; i < t.segments.length; i++) {
      ctx.lineTo(t.segments[i].x, t.segments[i].y);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(150, 80, 200, 0.4)';
    ctx.lineWidth = t.thickness + 3;
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.moveTo(t.basePos.x, t.basePos.y);
    for (let i = 0; i < t.segments.length; i++) {
      ctx.lineTo(t.segments[i].x, t.segments[i].y);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';

    for (let i = 0; i < t.segments.length; i++) {
      const wave = Math.sin(t.wavePhase + i * 0.8) * 0.5 + 0.5;
      ctx.beginPath();
      ctx.arc(t.segments[i].x, t.segments[i].y, t.thickness * 0.3 * wave + 1, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180, 100, 230, ${wave * 0.5})`;
      ctx.fill();
    }
  }

  private drawPortal(ctx: CanvasRenderingContext2D, portal: Portal): void {
    if (!portal.active) return;

    ctx.save();
    ctx.translate(portal.pos.x, portal.pos.y);
    ctx.rotate(portal.rotation);

    const pulse = Math.sin(portal.pulsePhase) * 0.1 + 1;
    const r = portal.radius * pulse;

    const outerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.8);
    outerGrad.addColorStop(0, 'rgba(200, 100, 255, 0.3)');
    outerGrad.addColorStop(1, 'rgba(200, 100, 255, 0)');
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = outerGrad;
    ctx.fill();

    const ringColors = [
      { r: r, color: 'rgba(180, 50, 220, 0.8)' },
      { r: r * 0.75, color: 'rgba(50, 100, 220, 0.9)' },
      { r: r * 0.5, color: 'rgba(0, 220, 200, 0.9)' },
      { r: r * 0.25, color: 'rgba(255, 255, 255, 1)' },
    ];

    for (let i = 0; i < ringColors.length; i++) {
      const ring = ringColors[i];
      ctx.beginPath();
      ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
      ctx.fillStyle = ring.color;
      ctx.fill();
    }

    ctx.rotate(-portal.rotation * 2);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(r * 0.4, 0);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
    const alpha = p.life / p.maxLife;
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fillStyle = p.color.includes('rgba') ? p.color : hexToRgba(p.color, alpha);
    ctx.fill();
  }

  private drawUI(ctx: CanvasRenderingContext2D, starCount: number, level: number): void {
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`星尘: ${starCount}`, 15, 15);
    if (level > 1) {
      ctx.fillText(`关卡: ${level}`, 15, 30);
    }
  }

  private drawGameOver(
    ctx: CanvasRenderingContext2D,
    timer: number,
    showButton: boolean,
    button: { x: number; y: number; w: number; h: number } | null,
    mousePos: { x: number; y: number } | null
  ): void {
    const progress = Math.min(1, timer / 1500);
    const vignetteAlpha = progress * 0.85;

    const vignette = ctx.createRadialGradient(
      this.width / 2, this.height / 2, this.width * 0.1,
      this.width / 2, this.height / 2, this.width * 0.7
    );
    vignette.addColorStop(0, `rgba(0, 0, 0, 0)`);
    vignette.addColorStop(1, `rgba(10, 5, 30, ${vignetteAlpha})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = `rgba(15, 5, 30, ${progress * 0.6})`;
    ctx.fillRect(0, 0, this.width, this.height);

    if (progress >= 1) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.font = 'bold 36px sans-serif';
      ctx.fillStyle = 'rgba(200, 150, 255, 0.95)';
      ctx.fillText('游戏结束', this.width / 2, this.height / 2 - 40);

      ctx.font = '14px sans-serif';
      ctx.fillStyle = 'rgba(180, 180, 220, 0.8)';
      ctx.fillText('你被暗影触手抓住了...', this.width / 2, this.height / 2);

      if (showButton && button) {
        const hovered = mousePos &&
          mousePos.x >= button.x && mousePos.x <= button.x + button.w &&
          mousePos.y >= button.y && mousePos.y <= button.y + button.h;

        const btnGrad = ctx.createLinearGradient(button.x, button.y, button.x, button.y + button.h);
        if (hovered) {
          btnGrad.addColorStop(0, '#7a3fcf');
          btnGrad.addColorStop(1, '#5a2faf');
        } else {
          btnGrad.addColorStop(0, '#6a3fbf');
          btnGrad.addColorStop(1, '#4a2f9f');
        }

        ctx.beginPath();
        const radius = 8;
        ctx.moveTo(button.x + radius, button.y);
        ctx.lineTo(button.x + button.w - radius, button.y);
        ctx.quadraticCurveTo(button.x + button.w, button.y, button.x + button.w, button.y + radius);
        ctx.lineTo(button.x + button.w, button.y + button.h - radius);
        ctx.quadraticCurveTo(button.x + button.w, button.y + button.h, button.x + button.w - radius, button.y + button.h);
        ctx.lineTo(button.x + radius, button.y + button.h);
        ctx.quadraticCurveTo(button.x, button.y + button.h, button.x, button.y + button.h - radius);
        ctx.lineTo(button.x, button.y + radius);
        ctx.quadraticCurveTo(button.x, button.y, button.x + radius, button.y);
        ctx.closePath();

        ctx.fillStyle = btnGrad;
        ctx.fill();

        ctx.strokeStyle = 'rgba(200, 150, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.font = 'bold 16px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('重新开始', button.x + button.w / 2, button.y + button.h / 2 + 1);
      }
    }
  }

  render(
    state: GameState,
    mousePos: { x: number; y: number } | null
  ): void {
    const ctx = this.ctx;

    this.drawBackground(ctx);
    this.drawStars(ctx, state.stars);
    this.drawCachedMushrooms(state.mushrooms);

    for (const s of state.spores) {
      this.drawSpore(ctx, s);
    }

    for (const star of state.starDusts) {
      this.drawStarDust(ctx, star);
    }

    for (const t of state.tentacles) {
      this.drawTentacle(ctx, t);
    }

    if (state.portal) {
      this.drawPortal(ctx, state.portal);
    }

    this.drawPlayer(ctx, state.player);

    for (const p of state.particles) {
      this.drawParticle(ctx, p);
    }

    this.drawUI(ctx, state.starCount, state.level);

    if (state.isGameOver) {
      this.drawGameOver(
        ctx,
        state.gameOverTimer,
        state.showRestartButton,
        state.restartButton,
        mousePos
      );
    }
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(255, 255, 255, ${alpha})`;
}
