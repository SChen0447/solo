import { MagicCore, Particle } from './core';
import { StateManager, HexNode, RuneType, RUNES, Spell } from './state';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private core: MagicCore;
  private state: StateManager;
  private lastTime: number = 0;
  private animationId: number | null = null;
  private running: boolean = false;

  constructor(canvas: HTMLCanvasElement, core: MagicCore, state: StateManager) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;
    this.core = core;
    this.state = state;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private loop = (): void => {
    if (!this.running) return;
    const now = performance.now();
    const deltaTime = now - this.lastTime;
    this.lastTime = now;

    this.core.updateParticles(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame(this.loop);
  };

  render(): void {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    this.drawBackground();
    this.drawHexGrid();
    this.drawParticles();
  }

  private drawBackground(): void {
    const { width, height } = this.canvas;
    const gradient = this.ctx.createRadialGradient(
      width / 2, height / 2, 50,
      width / 2, height / 2, Math.max(width, height) * 0.7
    );
    gradient.addColorStop(0, 'rgba(74, 144, 217, 0.05)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);
  }

  private drawHexGrid(): void {
    const nodes = this.state.getState().hexNodes;
    const hexSize = this.core.getHexSize();
    const center = this.core.getCenter();
    const animState = this.core.getAnimationState();

    let clearProgress = 0;
    if (animState.clearAnimation.active) {
      const elapsed = performance.now() - animState.clearAnimation.startTime;
      clearProgress = Math.min(elapsed / 600, 1);
    }

    nodes.forEach(node => {
      const dist = Math.sqrt(
        Math.pow(node.x - center.x, 2) + Math.pow(node.y - center.y, 2)
      );
      const maxDist = hexSize * 4;
      const delayFactor = Math.min(dist / maxDist, 1);

      let globalAlpha = 1;
      if (animState.clearAnimation.active) {
        const nodeClearProgress = Math.max(0, (clearProgress - delayFactor * 0.4) / 0.6);
        globalAlpha = Math.max(0, 1 - nodeClearProgress);
      }

      this.ctx.save();
      this.ctx.globalAlpha = globalAlpha;
      this.drawSingleHex(node, hexSize);
      this.ctx.restore();
    });
  }

  private drawSingleHex(node: HexNode, hexSize: number): void {
    const pulseScale = this.getPulseScale(node.pulseProgress);
    const size = hexSize * pulseScale;
    const corners = this.core.getHexCorners(node.x, node.y, size - 2);

    this.ctx.save();

    let fillColor: string;
    let fillAlpha: number;

    if (node.rune && !node.fadeOut) {
      fillColor = RUNES[node.rune].color;
      fillAlpha = 0.5;
    } else if (node.isHighlighted || node.pulseProgress > 0) {
      fillColor = '#ffd700';
      fillAlpha = 0.6;
    } else {
      fillColor = '#000000';
      fillAlpha = 0.3;
    }

    let alpha = fillAlpha;
    if (node.fadeOut) {
      alpha = node.fadeProgress * fillAlpha;
    }

    this.ctx.beginPath();
    corners.forEach((corner, i) => {
      if (i === 0) this.ctx.moveTo(corner.x, corner.y);
      else this.ctx.lineTo(corner.x, corner.y);
    });
    this.ctx.closePath();

    this.ctx.fillStyle = this.hexToRgba(fillColor, alpha);
    this.ctx.fill();

    this.ctx.strokeStyle = '#4a90d9';
    this.ctx.lineWidth = 2;
    if (node.isHighlighted || node.pulseProgress > 0) {
      this.ctx.shadowColor = '#ffd700';
      this.ctx.shadowBlur = 15;
    }
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    if (node.rune && (!node.fadeOut || node.fadeProgress > 0)) {
      this.ctx.save();
      if (node.fadeOut) {
        this.ctx.globalAlpha = node.fadeProgress;
      }
      this.drawRuneIcon(node.x, node.y, node.rune, size * 0.5);
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  private getPulseScale(progress: number): number {
    if (progress <= 0 || progress >= 1) return 1.0;
    const t = progress;
    const pulse = Math.sin(t * Math.PI);
    return 1.0 + pulse * 0.15;
  }

  private drawRuneIcon(cx: number, cy: number, rune: RuneType, size: number): void {
    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.strokeStyle = '#fff';
    this.ctx.fillStyle = '#fff';
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.shadowColor = RUNES[rune].color;
    this.ctx.shadowBlur = 8;

    switch (rune) {
      case 'fire':
        this.drawFireIcon(size);
        break;
      case 'ice':
        this.drawIceIcon(size);
        break;
      case 'thunder':
        this.drawThunderIcon(size);
        break;
      case 'heal':
        this.drawHealIcon(size);
        break;
      case 'shadow':
        this.drawShadowIcon(size);
        break;
    }

    this.ctx.restore();
  }

  private drawFireIcon(size: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(0, -size * 0.6);
    this.ctx.quadraticCurveTo(size * 0.5, -size * 0.2, size * 0.3, size * 0.2);
    this.ctx.quadraticCurveTo(size * 0.4, size * 0.4, size * 0.1, size * 0.5);
    this.ctx.quadraticCurveTo(0, size * 0.3, -size * 0.1, size * 0.5);
    this.ctx.quadraticCurveTo(-size * 0.4, size * 0.4, -size * 0.3, size * 0.2);
    this.ctx.quadraticCurveTo(-size * 0.5, -size * 0.2, 0, -size * 0.6);
    this.ctx.fillStyle = '#fff';
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(0, -size * 0.3);
    this.ctx.quadraticCurveTo(size * 0.2, 0, size * 0.1, size * 0.2);
    this.ctx.quadraticCurveTo(0, size * 0.1, -size * 0.1, size * 0.2);
    this.ctx.quadraticCurveTo(-size * 0.2, 0, 0, -size * 0.3);
    this.ctx.fillStyle = RUNES.fire.color;
    this.ctx.fill();
  }

  private drawIceIcon(size: number): void {
    const arms = 6;
    for (let i = 0; i < arms; i++) {
      const angle = (i / arms) * Math.PI * 2;
      this.ctx.save();
      this.ctx.rotate(angle);
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(0, -size * 0.6);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(0, -size * 0.3);
      this.ctx.lineTo(-size * 0.15, -size * 0.45);
      this.ctx.moveTo(0, -size * 0.3);
      this.ctx.lineTo(size * 0.15, -size * 0.45);
      this.ctx.stroke();
      this.ctx.restore();
    }

    this.ctx.beginPath();
    this.ctx.arc(0, 0, size * 0.12, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawThunderIcon(size: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(size * 0.1, -size * 0.6);
    this.ctx.lineTo(-size * 0.3, 0);
    this.ctx.lineTo(-size * 0.05, 0);
    this.ctx.lineTo(-size * 0.15, size * 0.6);
    this.ctx.lineTo(size * 0.3, -size * 0.05);
    this.ctx.lineTo(size * 0.05, -size * 0.05);
    this.ctx.closePath();
    this.ctx.fillStyle = '#fff';
    this.ctx.fill();
  }

  private drawHealIcon(size: number): void {
    const thickness = size * 0.35;
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(-thickness / 2, -size * 0.55, thickness, size * 1.1);
    this.ctx.fillRect(-size * 0.55, -thickness / 2, size * 1.1, thickness);
  }

  private drawShadowIcon(size: number): void {
    this.ctx.beginPath();
    this.ctx.arc(0, 0, size * 0.55, Math.PI * 0.2, Math.PI * 1.8, false);
    this.ctx.arc(size * 0.15, 0, size * 0.45, Math.PI * 1.8, Math.PI * 0.2, true);
    this.ctx.closePath();
    this.ctx.fillStyle = '#fff';
    this.ctx.fill();

    this.ctx.fillStyle = RUNES.shadow.color;
    for (let i = 0; i < 3; i++) {
      const angle = -Math.PI * 0.3 + (i * 0.3);
      const sx = Math.cos(angle) * size * 0.25;
      const sy = Math.sin(angle) * size * 0.25 - size * 0.05;
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, size * 0.05, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawParticles(): void {
    const particles = this.core.getParticles();
    const animState = this.core.getAnimationState();

    if (animState.activeSpell?.effectType === 'THUNDERSTORM') {
      this.drawLightningEffect(animState.activeSpell);
    }

    if (animState.activeSpell?.effectType === 'FREEZE') {
      this.drawFreezeOverlay(animState.activeSpell, animState.spellStartTime);
    }

    particles.forEach(p => {
      if (!p.active) return;
      this.drawParticle(p);
    });
  }

  private drawParticle(p: Particle): void {
    this.ctx.save();
    this.ctx.globalAlpha = p.alpha;
    this.ctx.translate(p.x, p.y);
    this.ctx.rotate(p.rotation);
    this.ctx.fillStyle = p.color;
    this.ctx.shadowColor = p.color;
    this.ctx.shadowBlur = 6;

    this.ctx.beginPath();
    const sides = 4 + Math.floor(Math.random() * 0);
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const r = p.size * (0.7 + Math.random() * 0.3);
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) this.ctx.moveTo(px, py);
      else this.ctx.lineTo(px, py);
    }
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.restore();
  }

  private drawLightningEffect(spell: Spell): void {
    const elapsed = performance.now() - (this.core.getAnimationState().spellStartTime || 0);
    const progress = elapsed / spell.duration;

    if (progress > 1) return;

    const flashAlpha = Math.sin(progress * Math.PI * 20) * 0.1 + 0.1;
    this.ctx.save();
    this.ctx.fillStyle = `rgba(241, 196, 15, ${Math.max(0, flashAlpha)})`;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();

    if (Math.random() > 0.6) {
      const boltCount = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < boltCount; i++) {
        this.drawSingleLightning();
      }
    }
  }

  private drawSingleLightning(): void {
    const startX = Math.random() * this.canvas.width;
    const startY = 0;
    const endX = startX + (Math.random() - 0.5) * 200;
    const endY = this.canvas.height;

    this.ctx.save();
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 3;
    this.ctx.shadowColor = '#f1c40f';
    this.ctx.shadowBlur = 20;

    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);

    let x = startX;
    let y = startY;
    const segments = 8 + Math.floor(Math.random() * 6);
    for (let i = 0; i < segments; i++) {
      x += (Math.random() - 0.5) * 40;
      y += (endY - startY) / segments;
      this.ctx.lineTo(x, y);
    }
    this.ctx.stroke();

    this.ctx.strokeStyle = '#f1c40f';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawFreezeOverlay(spell: Spell, startTime: number): void {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / spell.duration, 1);

    this.ctx.save();
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, 0,
      this.canvas.width / 2, this.canvas.height / 2, this.canvas.width * 0.6
    );
    gradient.addColorStop(0, `rgba(116, 185, 255, ${0.15 * progress})`);
    gradient.addColorStop(1, `rgba(52, 152, 219, ${0.05 * progress})`);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();

    const center = this.core.getCenter();
    const hexSize = this.core.getHexSize();
    for (let ring = 0; ring < 4; ring++) {
      const ringProgress = Math.max(0, Math.min(1, (progress - ring * 0.15) / 0.4));
      if (ringProgress <= 0) continue;

      this.ctx.save();
      this.ctx.globalAlpha = ringProgress * 0.5;
      this.ctx.strokeStyle = '#74b9ff';
      this.ctx.lineWidth = 2;
      this.ctx.shadowColor = '#a29bfe';
      this.ctx.shadowBlur = 10;

      const ringSize = hexSize * (ring + 1) * 1.1;
      const ringCorners = this.core.getHexCorners(center.x, center.y, ringSize);
      this.ctx.beginPath();
      ringCorners.forEach((corner, i) => {
        if (i === 0) this.ctx.moveTo(corner.x, corner.y);
        else this.ctx.lineTo(corner.x, corner.y);
      });
      this.ctx.closePath();
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(0,0,0,${alpha})`;
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
