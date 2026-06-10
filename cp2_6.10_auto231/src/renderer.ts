import { GameManager, PlacedBait } from './gameManager';
import {
  GhostConfig,
  RARITY_CONFIG,
  Rarity,
  BaitType,
  RoomType,
  ROOM_CONFIG,
  BAIT_CONFIG,
  getGhostById,
  getGhostsByRarity,
  GHOSTS
} from './ghostData';

const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;

export interface UIHitbox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  data?: any;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameManager: GameManager;
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private viewportWidth: number = 0;
  private viewportHeight: number = 0;
  public lastHitboxes: UIHitbox[] = [];
  public codexOpen: boolean = false;
  public codexRarityTab: Rarity = 'common';
  public hoveredBait: Exclude<BaitType, 'none'> | null = null;
  public placingBait: Exclude<BaitType, 'none'> | null = null;

  constructor(canvas: HTMLCanvasElement, gameManager: GameManager) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.gameManager = gameManager;
    this.resize();
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;

    this.canvas.width = this.viewportWidth * dpr;
    this.canvas.height = this.viewportHeight * dpr;
    this.canvas.style.width = this.viewportWidth + 'px';
    this.canvas.style.height = this.viewportHeight + 'px';

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const scaleX = this.viewportWidth / BASE_WIDTH;
    const scaleY = this.viewportHeight / BASE_HEIGHT;
    this.scale = Math.min(scaleX, scaleY);
    this.offsetX = (this.viewportWidth - BASE_WIDTH * this.scale) / 2;
    this.offsetY = (this.viewportHeight - BASE_HEIGHT * this.scale) / 2;
  }

  getFontSize(base: number): number {
    const isSmall = this.viewportWidth < 768;
    return (isSmall ? base * 0.85 : base) * this.scale;
  }

  screenToGame(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - this.offsetX) / this.scale,
      y: (sy - this.offsetY) / this.scale
    };
  }

  render(now: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.viewportWidth, this.viewportHeight);
    this.lastHitboxes = [];

    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    const state = this.gameManager.getState();
    const roomCfg = ROOM_CONFIG[state.currentRoom];

    this.drawRoomBackground(roomCfg);
    this.drawRoomDecorations(roomCfg);
    this.drawPlacedBaits(state.placedBaits, now);
    this.drawGhosts(state.activeGhosts, now);
    this.drawParticles(state.particles);
    this.drawCatchRings(state.catchRings, now);
    this.drawPulseWaves(state.pulseWaves, now);
    this.drawMergeEffects(state.mergeEffects, now);

    this.drawTopUI(state, now);
    this.drawBottomUI(state, now);
    this.drawRoomTabs(state);

    if (this.codexOpen) {
      this.drawCodexPanel(state, now);
    }

    if (state.composeResultPopup) {
      this.drawComposeResultPopup(state.composeResultPopup, now);
    }

    if (state.offlineRewardPopup) {
      this.drawOfflineRewardPopup(state.offlineRewardPopup, now);
    }

    if (this.placingBait) {
      this.drawPlacingHint();
    }

    ctx.restore();
  }

  private drawRoomBackground(roomCfg: typeof ROOM_CONFIG[RoomType]): void {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
    grad.addColorStop(0, roomCfg.bgGradient[0]);
    grad.addColorStop(1, roomCfg.bgGradient[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    ctx.strokeStyle = 'rgba(106, 140, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, BASE_WIDTH - 8, BASE_HEIGHT - 8);
  }

  private drawRoomDecorations(roomCfg: typeof ROOM_CONFIG[RoomType]): void {
    const ctx = this.ctx;
    roomCfg.decorations.forEach(dec => {
      const s = dec.scale || 1;
      ctx.save();
      ctx.translate(dec.x, dec.y);
      ctx.scale(s, s);
      switch (dec.type) {
        case 'cobweb':
          this.drawCobweb();
          break;
        case 'books':
          this.drawBookPile();
          break;
        case 'moonwindow':
          this.drawMoonWindow();
          break;
      }
      ctx.restore();
    });
  }

  private drawCobweb(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(200, 200, 220, 0.35)';
    ctx.lineWidth = 1;
    const r = 40;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * 2 * i) / 8;
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.stroke();
    for (let ring = 1; ring <= 3; ring++) {
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const a = (Math.PI * 2 * i) / 8;
        const rr = (r * ring) / 3;
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  private drawBookPile(): void {
    const ctx = this.ctx;
    const colors = ['#6b4423', '#8b5a2b', '#4a3728', '#704214'];
    const heights = [22, 28, 18, 32];
    let y = 0;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = colors[i];
      const w = 60 - i * 6;
      const h = heights[i];
      ctx.fillRect(-w / 2, y - h, w, h);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-w / 2, y - h, w, h);
      y -= h;
    }
  }

  private drawMoonWindow(): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#2a2040';
    ctx.fillRect(-50, -60, 100, 120);
    ctx.strokeStyle = '#6a8cff';
    ctx.lineWidth = 3;
    ctx.strokeRect(-50, -60, 100, 120);
    ctx.beginPath();
    ctx.moveTo(0, -60);
    ctx.lineTo(0, 60);
    ctx.moveTo(-50, 0);
    ctx.lineTo(50, 0);
    ctx.stroke();

    const glow = ctx.createRadialGradient(20, -20, 5, 20, -20, 35);
    glow.addColorStop(0, 'rgba(220, 230, 255, 0.9)');
    glow.addColorStop(0.5, 'rgba(180, 200, 255, 0.4)');
    glow.addColorStop(1, 'rgba(100, 130, 200, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-50, -60, 100, 120);

    ctx.fillStyle = 'rgba(240, 245, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(20, -20, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawGhosts(ghosts: any[], now: number): void {
    const ctx = this.ctx;
    ghosts.forEach(g => {
      const cfg = getGhostById(g.ghostId);
      if (!cfg) return;
      const t = g.phase / 1000;
      const dy = Math.sin((2 * Math.PI * t) / cfg.animation.floatPeriod + g.phase * 0.001) * cfg.animation.floatAmplitude;
      const blink = 0.75 + 0.25 * Math.sin(t * cfg.animation.blinkInterval);

      const cx = g.x;
      const cy = g.baseY + dy;
      const size = cfg.animation.size;

      if (cfg.rarity === 'legendary') {
        const halo = ctx.createRadialGradient(cx, cy, size * 0.3, cx, cy, size * 1.8);
        halo.addColorStop(0, 'rgba(255, 215, 0, 0.5)');
        halo.addColorStop(0.5, 'rgba(255, 215, 0, 0.2)');
        halo.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cx, cy, size * 1.8, 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < 5; i++) {
          const pa = (now / 500 + i * 1.3) % (Math.PI * 2);
          const pr = size * (1.2 + 0.3 * Math.sin(now / 300 + i));
          const px = cx + Math.cos(pa) * pr;
          const py = cy + Math.sin(pa) * pr;
          ctx.fillStyle = `rgba(255, 215, 0, ${0.6 * blink})`;
          ctx.beginPath();
          ctx.arc(px, py, 2 + Math.sin(now / 200 + i) * 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 1.2);
      glow.addColorStop(0, this.hexToRgba(cfg.glowColor, 0.5 * blink));
      glow.addColorStop(1, this.hexToRgba(cfg.glowColor, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 1.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = this.hexToRgba(cfg.color, 0.85 * blink);
      ctx.beginPath();
      ctx.moveTo(cx - size * 0.8, cy + size * 0.4);
      ctx.quadraticCurveTo(cx - size * 0.9, cy - size * 0.3, cx, cy - size * 0.9);
      ctx.quadraticCurveTo(cx + size * 0.9, cy - size * 0.3, cx + size * 0.8, cy + size * 0.4);
      const waves = 4;
      for (let i = 0; i < waves; i++) {
        const wx = cx + size * 0.8 - (size * 1.6 * i) / waves;
        const wy = cy + size * 0.4 + (i % 2 === 0 ? size * 0.15 : -size * 0.05);
        ctx.quadraticCurveTo(wx - size * 0.1, wy + size * 0.15, wx - size * 0.2, cy + size * 0.4);
      }
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(20, 10, 40, 0.9)';
      const eyeOffset = size * 0.28;
      const eyeY = cy - size * 0.2;
      const eyeSize = size * 0.12;
      ctx.beginPath();
      ctx.arc(cx - eyeOffset, eyeY, eyeSize, 0, Math.PI * 2);
      ctx.arc(cx + eyeOffset, eyeY, eyeSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(cx - eyeOffset + 1, eyeY - 1, eyeSize * 0.4, 0, Math.PI * 2);
      ctx.arc(cx + eyeOffset + 1, eyeY - 1, eyeSize * 0.4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private drawPlacedBaits(baits: PlacedBait[], now: number): void {
    const ctx = this.ctx;
    baits.forEach(b => {
      const cfg = BAIT_CONFIG[b.type];
      const elapsed = now - b.placedAt;
      const remain = Math.max(0, b.duration - elapsed);
      const alpha = remain < 3000 ? 0.4 + 0.6 * (remain / 3000) : 1;

      const pulse = 1 + 0.1 * Math.sin(now / 200);
      const size = 28 * pulse;

      const glow = ctx.createRadialGradient(b.x, b.y, 2, b.x, b.y, size * 1.5);
      glow.addColorStop(0, this.hexToRgba(cfg.color, 0.6 * alpha));
      glow.addColorStop(1, this.hexToRgba(cfg.color, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(b.x, b.y, size * 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = `${size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = alpha;
      ctx.fillText(cfg.icon, b.x, b.y);
      ctx.globalAlpha = 1;
    });
  }

  private drawParticles(particles: any[]): void {
    const ctx = this.ctx;
    particles.forEach(p => {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = this.hexToRgba(p.color, alpha);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private drawCatchRings(rings: any[], now: number): void {
    const ctx = this.ctx;
    rings.forEach(r => {
      const t = (now - r.startTime) / r.duration;
      const radius = r.maxRadius * t;
      const alpha = 1 - t;

      const grad = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, radius);
      grad.addColorStop(0, 'rgba(180, 120, 255, 0)');
      grad.addColorStop(0.7, `rgba(160, 100, 255, ${0.4 * alpha})`);
      grad.addColorStop(1, `rgba(140, 80, 255, ${0.6 * alpha})`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(180, 140, 255, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  private drawPulseWaves(waves: any[], now: number): void {
    const ctx = this.ctx;
    waves.forEach(w => {
      const t = (now - w.startTime) / w.duration;
      const radius = w.maxRadius * this.easeOutCubic(t);
      const alpha = 1 - t;

      ctx.strokeStyle = `rgba(150, 100, 220, ${0.7 * alpha})`;
      ctx.lineWidth = 6 * (1 - t * 0.5);
      ctx.beginPath();
      ctx.arc(w.x, w.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(180, 130, 255, ${0.4 * alpha})`;
      ctx.lineWidth = 12 * (1 - t * 0.3);
      ctx.beginPath();
      ctx.arc(w.x, w.y, radius * 0.7, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  private drawMergeEffects(effects: any[], now: number): void {
    const ctx = this.ctx;
    effects.forEach(e => {
      const t = (now - e.startTime) / e.duration;
      const invT = 1 - t;
      const size = 120 * invT + 20;
      const alpha = t > 0.5 ? (1 - t) * 2 : t * 2;

      const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, size);
      grad.addColorStop(0, `rgba(140, 80, 255, ${0.8 * alpha})`);
      grad.addColorStop(0.5, `rgba(100, 60, 220, ${0.4 * alpha})`);
      grad.addColorStop(1, 'rgba(80, 40, 200, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(e.x, e.y, size, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8 + t * 4;
        const r = size * (0.3 + t * 0.7);
        const px = e.x + Math.cos(a) * r;
        const py = e.y + Math.sin(a) * r;
        ctx.fillStyle = `rgba(180, 140, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, 4 * invT, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  private drawTopUI(state: any, now: number): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(26, 16, 64, 0.85)';
    this.roundRect(ctx, 12, 50, 220, 48, 12);
    ctx.fill();
    ctx.strokeStyle = '#6a8cff';
    ctx.lineWidth = 2;
    this.roundRect(ctx, 12, 50, 220, 48, 12);
    ctx.stroke();

    const cx = 36;
    const cy = 74;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#9d5cf5';
    ctx.fillRect(-12, -12, 24, 24);
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.strokeRect(-12, -12, 24, 24);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 6);
    ctx.lineTo(cx - 2, cy - 10);
    ctx.lineTo(cx + 2, cy - 6);
    ctx.lineTo(cx - 2, cy - 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${this.getFontSize(20)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${state.soulShards}`, 60, 74);

    const resonanceBtnX = 200;
    const resonanceBtnY = 74;
    const resonanceBtnR = 18;
    const canResonance = state.soulShards >= 10;
    const pulse = canResonance ? 1 + 0.08 * Math.sin(now / 300) : 1;

    ctx.fillStyle = canResonance ? '#6a3fbf' : '#3a2f6f';
    ctx.beginPath();
    ctx.arc(resonanceBtnX, resonanceBtnY, resonanceBtnR * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = canResonance ? '#8aacff' : '#5a6a9f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(resonanceBtnX, resonanceBtnY, resonanceBtnR * pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${this.getFontSize(14)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('10', resonanceBtnX, resonanceBtnY - 2);
    ctx.font = `${this.getFontSize(9)}px sans-serif`;
    ctx.fillText('共鸣', resonanceBtnX, resonanceBtnY + 7);

    this.lastHitboxes.push({
      id: 'resonance',
      x: resonanceBtnX - resonanceBtnR,
      y: resonanceBtnY - resonanceBtnR,
      w: resonanceBtnR * 2,
      h: resonanceBtnR * 2
    });

    const codexBtnX = BASE_WIDTH - 110;
    const codexBtnY = 60;
    const codexBtnW = 96;
    const codexBtnH = 36;
    ctx.fillStyle = 'rgba(26, 16, 64, 0.85)';
    this.roundRect(ctx, codexBtnX, codexBtnY, codexBtnW, codexBtnH, 8);
    ctx.fill();
    ctx.strokeStyle = this.codexOpen ? '#8aacff' : '#6a8cff';
    ctx.lineWidth = 2;
    this.roundRect(ctx, codexBtnX, codexBtnY, codexBtnW, codexBtnH, 8);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `${this.getFontSize(14)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`📖 图鉴 (${state.allGhosts.filter((g: GhostConfig) => (state.capturedGhosts[g.id] || 0) > 0).length}/${state.allGhosts.length})`, codexBtnX + codexBtnW / 2, codexBtnY + codexBtnH / 2);

    this.lastHitboxes.push({
      id: 'codex',
      x: codexBtnX,
      y: codexBtnY,
      w: codexBtnW,
      h: codexBtnH
    });
  }

  private drawBottomUI(state: any, now: number): void {
    const ctx = this.ctx;
    const baitTypes: Array<Exclude<BaitType, 'none'>> = ['pumpkin', 'book', 'crystal'];
    const slotSize = 56;
    const gap = 20;
    const totalW = baitTypes.length * slotSize + (baitTypes.length - 1) * gap;
    const startX = (BASE_WIDTH - totalW) / 2;
    const y = BASE_HEIGHT - 80;

    baitTypes.forEach((type, i) => {
      const cfg = BAIT_CONFIG[type];
      const x = startX + i * (slotSize + gap);
      const cooldown = this.gameManager.getBaitCooldown(type, now);
      const isOnCooldown = cooldown > 0;
      const isHovered = this.hoveredBait === type;
      const isPlacing = this.placingBait === type;

      ctx.fillStyle = isPlacing ? 'rgba(138, 172, 255, 0.4)' : 'rgba(26, 16, 64, 0.85)';
      this.roundRect(ctx, x, y, slotSize, slotSize, 10);
      ctx.fill();
      ctx.strokeStyle = isHovered || isPlacing ? '#8aacff' : '#6a8cff';
      ctx.lineWidth = isHovered || isPlacing ? 3 : 2;
      this.roundRect(ctx, x, y, slotSize, slotSize, 10);
      ctx.stroke();

      ctx.globalAlpha = isOnCooldown ? 0.35 : 1;
      ctx.font = `${this.getFontSize(26)}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cfg.icon, x + slotSize / 2, y + slotSize / 2);
      ctx.globalAlpha = 1;

      if (isOnCooldown) {
        const progress = 1 - cooldown / cfg.cooldown;
        const cx = x + slotSize / 2;
        const cy = y + slotSize / 2;
        const r = slotSize / 2 - 4;
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        ctx.stroke();

        const remainSec = Math.ceil(cooldown / 1000);
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${this.getFontSize(14)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${remainSec}`, cx, cy);
      }

      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = `${this.getFontSize(11)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(cfg.name, x + slotSize / 2, y + slotSize + 4);

      this.lastHitboxes.push({
        id: 'bait',
        x,
        y,
        w: slotSize,
        h: slotSize,
        data: { type }
      });
    });
  }

  private drawRoomTabs(state: any): void {
    const ctx = this.ctx;
    const rooms: RoomType[] = ['attic', 'basement', 'study'];
    const tabW = 80;
    const tabH = 32;
    const gap = 8;
    const startX = (BASE_WIDTH - (rooms.length * tabW + (rooms.length - 1) * gap)) / 2;
    const y = 12;

    rooms.forEach((room, i) => {
      const cfg = ROOM_CONFIG[room];
      const x = startX + i * (tabW + gap);
      const isUnlocked = state.unlockedRooms.includes(room);
      const isCurrent = state.currentRoom === room;

      ctx.fillStyle = isCurrent ? 'rgba(106, 140, 255, 0.5)' : isUnlocked ? 'rgba(26, 16, 64, 0.85)' : 'rgba(40, 30, 60, 0.85)';
      this.roundRect(ctx, x, y, tabW, tabH, 8);
      ctx.fill();
      ctx.strokeStyle = isCurrent ? '#8aacff' : isUnlocked ? '#6a8cff' : '#4a4a7a';
      ctx.lineWidth = 2;
      this.roundRect(ctx, x, y, tabW, tabH, 8);
      ctx.stroke();

      ctx.fillStyle = isUnlocked ? '#ffffff' : '#888888';
      ctx.font = `${this.getFontSize(12)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = isUnlocked ? cfg.name : `${cfg.name} 🔒${cfg.unlockCost}`;
      ctx.fillText(label, x + tabW / 2, y + tabH / 2);

      this.lastHitboxes.push({
        id: isUnlocked ? 'room' : 'unlock',
        x,
        y,
        w: tabW,
        h: tabH,
        data: { room }
      });
    });
  }

  private drawCodexPanel(state: any, now: number): void {
    const ctx = this.ctx;
    const panelW = 240;
    const slideProgress = Math.min(1, (now - (this as any)._codexToggleTime || 0) / 300);
    const eased = this.easeOut(slideProgress);
    const panelX = -panelW + panelW * eased;
    const panelY = 50;
    const panelH = BASE_HEIGHT - 150;

    ctx.fillStyle = '#1a1040';
    this.roundRect(ctx, panelX, panelY, panelW, panelH, [0, 16, 16, 0]);
    ctx.fill();
    ctx.strokeStyle = '#6a8cff';
    ctx.lineWidth = 2;
    this.roundRect(ctx, panelX, panelY, panelW, panelH, [0, 16, 16, 0]);
    ctx.stroke();

    const rarities: Rarity[] = ['common', 'rare', 'epic', 'legendary'];
    const tabY = panelY + 12;
    const tabH = 28;
    rarities.forEach((r, i) => {
      const tabX = panelX + 8 + i * 56;
      const tabW = 52;
      const rc = RARITY_CONFIG[r];
      const isActive = this.codexRarityTab === r;

      ctx.fillStyle = isActive ? this.hexToRgba(rc.color, 0.4) : 'rgba(40, 30, 70, 0.6)';
      this.roundRect(ctx, tabX, tabY, tabW, tabH, 6);
      ctx.fill();
      ctx.strokeStyle = isActive ? '#8aacff' : '#4a5a8a';
      ctx.lineWidth = 1.5;
      this.roundRect(ctx, tabX, tabY, tabW, tabH, 6);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `${this.getFontSize(10)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(rc.label, tabX + tabW / 2, tabY + tabH / 2);

      this.lastHitboxes.push({
        id: 'codexTab',
        x: tabX,
        y: tabY,
        w: tabW,
        h: tabH,
        data: { rarity: r }
      });
    });

    const ghosts = getGhostsByRarity(this.codexRarityTab);
    const contentY = tabY + tabH + 12;
    const contentH = panelH - (contentY - panelY) - 60;
    const itemW = 104;
    const itemH = 90;
    const gap = 8;
    const perRow = 2;

    ghosts.forEach((g, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      const ix = panelX + 12 + col * (itemW + gap);
      const iy = contentY + row * (itemH + gap);
      if (iy + itemH > contentY + contentH) return;

      const count = state.capturedGhosts[g.id] || 0;
      const captured = count > 0;

      ctx.fillStyle = captured ? 'rgba(60, 40, 100, 0.8)' : 'rgba(30, 25, 50, 0.8)';
      this.roundRect(ctx, ix, iy, itemW, itemH, 8);
      ctx.fill();
      ctx.strokeStyle = captured ? this.hexToRgba(g.glowColor, 0.8) : '#3a3a5a';
      ctx.lineWidth = 1.5;
      this.roundRect(ctx, ix, iy, itemW, itemH, 8);
      ctx.stroke();

      const cx = ix + itemW / 2;
      const cy = iy + 32;
      if (captured) {
        const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, 24);
        glow.addColorStop(0, this.hexToRgba(g.glowColor, 0.6));
        glow.addColorStop(1, this.hexToRgba(g.glowColor, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, 24, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.hexToRgba(g.color, 0.9);
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(80, 80, 100, 0.5)';
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = captured ? '#ffffff' : '#666666';
      ctx.font = `${this.getFontSize(10)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(captured ? g.name : '???', cx, iy + 52);

      ctx.fillStyle = this.hexToRgba(captured ? g.glowColor : '#555555', captured ? 1 : 0.5);
      ctx.font = `${this.getFontSize(9)}px sans-serif`;
      const stars = '★'.repeat(g.rarityStars);
      ctx.fillText(stars, cx, iy + 66);

      ctx.fillStyle = captured ? '#ffffff' : '#666666';
      ctx.font = `${this.getFontSize(10)}px sans-serif`;
      ctx.fillText(`${count}`, cx, iy + 78);
    });

    const canComposeAny = ghosts.some(g => this.gameManager.canCompose(g.id));
    const composeBtnX = panelX + 20;
    const composeBtnY = panelY + panelH - 48;
    const composeBtnW = panelW - 40;
    const composeBtnH = 36;

    ctx.fillStyle = canComposeAny ? 'rgba(106, 63, 191, 0.9)' : 'rgba(60, 40, 100, 0.5)';
    this.roundRect(ctx, composeBtnX, composeBtnY, composeBtnW, composeBtnH, 8);
    ctx.fill();
    ctx.strokeStyle = canComposeAny ? '#8aacff' : '#4a4a7a';
    ctx.lineWidth = 2;
    this.roundRect(ctx, composeBtnX, composeBtnY, composeBtnW, composeBtnH, 8);
    ctx.stroke();

    ctx.fillStyle = canComposeAny ? '#ffffff' : '#888888';
    ctx.font = `bold ${this.getFontSize(13)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦ 合成 (3只→1只)', composeBtnX + composeBtnW / 2, composeBtnY + composeBtnH / 2);

    this.lastHitboxes.push({
      id: 'compose',
      x: composeBtnX,
      y: composeBtnY,
      w: composeBtnW,
      h: composeBtnH
    });
  }

  private drawComposeResultPopup(popup: any, now: number): void {
    const ctx = this.ctx;
    const t = (now - popup.startTime) / popup.duration;
    if (t <= 0) return;
    const alpha = t < 0.1 ? t / 0.1 : t > 0.85 ? (1 - t) / 0.15 : 1;
    const scale = t < 0.2 ? 0.6 + (t / 0.2) * 0.4 : 1;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(BASE_WIDTH / 2, BASE_HEIGHT / 2);
    ctx.scale(scale, scale);

    const w = 200;
    const h = 120;
    ctx.fillStyle = '#2a1a50';
    this.roundRect(ctx, -w / 2, -h / 2, w, h, 16);
    ctx.fill();
    ctx.strokeStyle = '#8aacff';
    ctx.lineWidth = 2;
    this.roundRect(ctx, -w / 2, -h / 2, w, h, 16);
    ctx.stroke();

    const ghost: GhostConfig = popup.ghost;
    const cx = 0;
    const cy = -20;
    const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 36);
    glow.addColorStop(0, this.hexToRgba(ghost.glowColor, 0.9));
    glow.addColorStop(1, this.hexToRgba(ghost.glowColor, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.hexToRgba(ghost.color, 0.95);
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${this.getFontSize(16)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(ghost.name, 0, 16);

    ctx.fillStyle = this.hexToRgba(ghost.glowColor, 1);
    ctx.font = `${this.getFontSize(14)}px sans-serif`;
    ctx.fillText('★'.repeat(ghost.rarityStars), 0, 38);

    ctx.fillStyle = '#c0a0ff';
    ctx.font = `${this.getFontSize(11)}px sans-serif`;
    ctx.fillText(`+3 灵魂碎片`, 0, 60);

    ctx.restore();
  }

  private drawOfflineRewardPopup(popup: any, now: number): void {
    const ctx = this.ctx;
    const t = (now - popup.startTime) / popup.duration;
    const alpha = t < 0.2 ? t / 0.2 : t > 0.8 ? (1 - t) / 0.2 : 1;
    if (alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    const w = 240;
    const h = 50;
    const x = (BASE_WIDTH - w) / 2;
    const y = BASE_HEIGHT / 2 - h / 2 - 40;

    ctx.fillStyle = '#1a0a2e';
    this.roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = '#8aacff';
    ctx.lineWidth = 2;
    this.roundRect(ctx, x, y, w, h, 10);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `${this.getFontSize(14)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`离线捕获了 ${popup.count} 只幽灵`, BASE_WIDTH / 2, y + h / 2);
    ctx.restore();
  }

  private drawPlacingHint(): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(138, 172, 255, 0.85)';
    ctx.font = `${this.getFontSize(14)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('点击房间中的位置放置诱饵（右键/ESC取消）', BASE_WIDTH / 2, BASE_HEIGHT - 130);
  }

  setCodexOpen(open: boolean): void {
    this.codexOpen = open;
    (this as any)._codexToggleTime = performance.now();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[]): void {
    let radii: number[];
    if (typeof r === 'number') {
      radii = [r, r, r, r];
    } else {
      radii = r;
    }
    ctx.beginPath();
    ctx.moveTo(x + radii[0], y);
    ctx.lineTo(x + w - radii[1], y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radii[1]);
    ctx.lineTo(x + w, y + h - radii[2]);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radii[2], y + h);
    ctx.lineTo(x + radii[3], y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radii[3]);
    ctx.lineTo(x, y + radii[0]);
    ctx.quadraticCurveTo(x, y, x + radii[0], y);
    ctx.closePath();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }
}
