import { Game, GamePhase } from './Game';
import { Card } from './Card';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface FloatingNumber {
  x: number;
  y: number;
  value: number;
  life: number;
  maxLife: number;
  isPlayer: boolean;
}

export interface Layout {
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  playerHandY: number;
  aiHandY: number;
  battleY: number;
  centerX: number;
  confirmBtn: { x: number; y: number; w: number; h: number };
  playerInfo: { x: number; y: number };
  aiInfo: { x: number; y: number };
  playerBattleSlot: { x: number; y: number };
  aiBattleSlot: { x: number; y: number };
  restartBtn: { x: number; y: number; w: number; h: number };
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private game: Game;
  private particles: Particle[] = [];
  private floatingNumbers: FloatingNumber[] = [];
  private battleTriggered: boolean = false;
  private lastPhase: GamePhase = 'player_select';
  private gameOverScale: number = 0;
  private hoveredCard: Card | null = null;
  private confirmBtnHovered: boolean = false;
  private restartBtnHovered: boolean = false;
  public layout: Layout;
  private onConfirmClick?: () => void;
  private onRestartClick?: () => void;
  private onCardClick?: (card: Card) => void;

  constructor(canvas: HTMLCanvasElement, game: Game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.game = game;
    this.layout = this.computeLayout();
  }

  setCallbacks(
    onCardClick: (card: Card) => void,
    onConfirmClick: () => void,
    onRestartClick: () => void
  ): void {
    this.onCardClick = onCardClick;
    this.onConfirmClick = onConfirmClick;
    this.onRestartClick = onRestartClick;
  }

  computeLayout(): Layout {
    const w = this.canvas.width;
    const h = this.canvas.height;
    return {
      width: w,
      height: h,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      playerHandY: h - 110,
      aiHandY: 160,
      battleY: h / 2,
      centerX: w / 2,
      confirmBtn: { x: w - 110, y: h - 50, w: 160, h: 50 },
      playerInfo: { x: 120, y: 50 },
      aiInfo: { x: w - 120, y: 50 },
      playerBattleSlot: { x: w / 2 - 100, y: h / 2 + 40 },
      aiBattleSlot: { x: w / 2 + 100, y: h / 2 - 40 },
      restartBtn: { x: w / 2 - 80, y: h / 2 + 60, w: 160, h: 50 },
    };
  }

  resize(): void {
    const container = this.canvas.parentElement;
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const ratio = 16 / 9;
    let w = cw;
    let h = cw / ratio;
    if (h > ch) {
      h = ch;
      w = ch * ratio;
    }
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.canvas.width = Math.floor(w);
    this.canvas.height = Math.floor(h);
    this.layout = this.computeLayout();
    this.positionCards();
  }

  positionCards(): void {
    const L = this.layout;
    const spacing = 15;
    const cardW = 120;
    const totalPlayer = this.game.playerHand.length;
    const playerStartX = L.centerX - ((totalPlayer - 1) * (cardW + spacing)) / 2;
    for (let i = 0; i < totalPlayer; i++) {
      const card = this.game.playerHand[i];
      if (!card.isFlying && card !== this.game.battleCardPlayer) {
        card.setPosition(playerStartX + i * (cardW + spacing), L.playerHandY);
      }
      card.width = cardW;
      card.height = 160;
    }
    const totalAi = this.game.aiHand.length;
    const aiStartX = L.centerX - ((totalAi - 1) * (cardW + spacing)) / 2;
    for (let i = 0; i < totalAi; i++) {
      const card = this.game.aiHand[i];
      if (!card.isFlying && card !== this.game.battleCardAi) {
        card.setPosition(aiStartX + i * (cardW + spacing), L.aiHandY);
      }
      card.width = cardW;
      card.height = 160;
    }
  }

  handleClick(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (clientY - rect.top) * (this.canvas.height / rect.height);

    if (this.game.phase === 'game_over') {
      const b = this.layout.restartBtn;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        this.onRestartClick?.();
      }
      return;
    }

    if (this.game.phase === 'player_select') {
      for (const card of this.game.playerHand) {
        if (card.containsPoint(x, y)) {
          this.onCardClick?.(card);
          return;
        }
      }
      const b = this.layout.confirmBtn;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        this.onConfirmClick?.();
      }
    }
  }

  handleMove(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (clientY - rect.top) * (this.canvas.height / rect.height);

    this.hoveredCard = null;
    if (this.game.phase === 'player_select') {
      for (const card of this.game.playerHand) {
        card.isHovered = false;
        if (card.containsPoint(x, y)) {
          card.isHovered = true;
          this.hoveredCard = card;
        }
      }
    }
    const b = this.layout.confirmBtn;
    this.confirmBtnHovered = x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
    const rb = this.layout.restartBtn;
    this.restartBtnHovered = x >= rb.x && x <= rb.x + rb.w && y >= rb.y && y <= rb.y + rb.h;
  }

  private spawnParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 150;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3,
        maxLife: 0.3,
        color,
        size: 2 + Math.random() * 4,
      });
    }
  }

  private addFloatingNumber(value: number, isPlayer: boolean): void {
    const L = this.layout;
    this.floatingNumbers.push({
      x: isPlayer ? L.playerInfo.x : L.aiInfo.x,
      y: isPlayer ? L.playerInfo.y + 40 : L.aiInfo.y + 40,
      value,
      life: 1,
      maxLife: 1,
      isPlayer,
    });
  }

  private updatePhaseLogic(deltaTime: number): void {
    const phase = this.game.phase;

    if (phase !== this.lastPhase) {
      if (phase === 'player_flying' && this.game.battleCardPlayer) {
        const L = this.layout;
        this.game.battleCardPlayer.setTarget(L.playerBattleSlot.x, L.playerBattleSlot.y);
      }
      if (phase === 'ai_flying' && this.game.battleCardAi) {
        const L = this.layout;
        this.game.battleCardAi.setTarget(L.aiBattleSlot.x, L.aiBattleSlot.y);
      }
      if (phase === 'battle' && !this.battleTriggered) {
        this.battleTriggered = true;
      }
      this.lastPhase = phase;
    }

    if (phase === 'player_flying') {
      if (this.game.battleCardPlayer && !this.game.battleCardPlayer.isFlying) {
        this.game.startAiTurn();
      }
    } else if (phase === 'ai_flying') {
      if (this.game.battleCardAi && !this.game.battleCardAi.isFlying) {
        this.game.phase = 'battle';
      } else if (!this.game.battleCardAi) {
        this.game.resolveBattle();
      }
    } else if (phase === 'battle') {
      const L = this.layout;
      const pCard = this.game.battleCardPlayer;
      const aCard = this.game.battleCardAi;
      if (pCard) this.spawnParticles(L.playerBattleSlot.x, L.playerBattleSlot.y, pCard.themeColor);
      if (aCard) this.spawnParticles(L.aiBattleSlot.x, L.aiBattleSlot.y, aCard.themeColor);
      this.game.resolveBattle();
      if (this.game.battleResult) {
        if (this.game.battleResult.playerDamage > 0) {
          this.addFloatingNumber(this.game.battleResult.playerDamage, true);
        }
        if (this.game.battleResult.aiDamage > 0) {
          this.addFloatingNumber(this.game.battleResult.aiDamage, false);
        }
      }
      this.battleTriggered = false;
    } else if (phase === 'result') {
      setTimeout(() => {}, 0);
    }

    if (phase === 'game_over') {
      this.gameOverScale = Math.min(1, this.gameOverScale + deltaTime / 0.3);
    } else {
      this.gameOverScale = 0;
    }
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vy += 50 * deltaTime;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  private updateFloating(deltaTime: number): void {
    for (let i = this.floatingNumbers.length - 1; i >= 0; i--) {
      const f = this.floatingNumbers[i];
      f.life -= deltaTime;
      f.y -= 40 * deltaTime;
      if (f.life <= 0) this.floatingNumbers.splice(i, 1);
    }
  }

  update(deltaTime: number): void {
    this.game.update(deltaTime);
    this.updateParticles(deltaTime);
    this.updateFloating(deltaTime);
    this.updatePhaseLogic(deltaTime);
    this.positionCards();
  }

  draw(time: number): void {
    const ctx = this.ctx;
    const L = this.layout;
    ctx.clearRect(0, 0, L.width, L.height);

    this.drawBackground(ctx, time);
    this.drawBattleLine(ctx, time);
    this.drawPlayerInfo(ctx, time);
    this.drawAiInfo(ctx, time);
    this.drawAiHand(ctx);
    this.drawPlayerHand(ctx, time);
    this.drawBattleCards(ctx, time);
    this.drawConfirmButton(ctx);
    this.drawParticles(ctx);
    this.drawFloatingNumbers(ctx);
    this.drawMessage(ctx);
    if (this.game.phase === 'game_over') {
      this.drawGameOver(ctx);
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D, _time: number): void {
    const L = this.layout;
    const gradient = ctx.createLinearGradient(0, 0, 0, L.height);
    gradient.addColorStop(0, '#0b0b2b');
    gradient.addColorStop(1, '#1a1a4e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, L.width, L.height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    for (let i = 0; i < 80; i++) {
      const sx = (i * 97) % L.width;
      const sy = (i * 53) % L.height;
      const r = ((i % 3) + 1) * 0.5;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawBattleLine(ctx: CanvasRenderingContext2D, time: number): void {
    const L = this.layout;
    const pulse = 0.3 + 0.2 * Math.sin(time / 1000 * Math.PI);
    ctx.strokeStyle = `rgba(100, 180, 255, ${0.3 + pulse})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = '#4a9eff';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(50, L.battleY);
    ctx.lineTo(L.width - 50, L.battleY);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  private drawAvatar(ctx: CanvasRenderingContext2D, x: number, y: number, isPlayer: boolean): void {
    const r = 35;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = isPlayer ? '#2a5298' : '#8b1e3f';
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.fillStyle = isPlayer ? '#6ec1ff' : '#ff7aa2';
    ctx.beginPath();
    ctx.arc(x, y - 8, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, y + 18, 20, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawHpBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    current: number,
    max: number,
    shake: number
  ): void {
    const w = 140;
    const h = 16;
    let sx = x - w / 2;
    let sy = y;
    if (shake > 0) {
      sx += (Math.random() - 0.5) * 6;
      sy += (Math.random() - 0.5) * 6;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(sx - 2, sy - 2, w + 4, h + 4);
    ctx.fillStyle = '#333';
    ctx.fillRect(sx, sy, w, h);
    const ratio = Math.max(0, current / max);
    const grad = ctx.createLinearGradient(sx, sy, sx, sy + h);
    grad.addColorStop(0, ratio > 0.5 ? '#5eff7a' : ratio > 0.25 ? '#ffcf5e' : '#ff5e5e');
    grad.addColorStop(1, ratio > 0.5 ? '#2ca84a' : ratio > 0.25 ? '#c48a1e' : '#a52a2a');
    ctx.fillStyle = grad;
    ctx.fillRect(sx, sy, w * ratio, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.strokeRect(sx, sy, w, h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${current} / ${max}`, x, sy + h / 2);
  }

  private drawPlayerInfo(ctx: CanvasRenderingContext2D, _time: number): void {
    const L = this.layout;
    const info = L.playerInfo;
    this.drawAvatar(ctx, info.x, info.y, true);
    this.drawHpBar(ctx, info.x, info.y + 50, this.game.playerHp, this.game.playerMaxHp, this.game.playerHpShake);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('玩家', info.x, info.y - 48);
    ctx.font = '12px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(`手牌: ${this.game.playerHand.length}  牌库: ${this.game.playerDeck.length}`, info.x, info.y + 85);
  }

  private drawAiInfo(ctx: CanvasRenderingContext2D, _time: number): void {
    const L = this.layout;
    const info = L.aiInfo;
    this.drawAvatar(ctx, info.x, info.y, false);
    this.drawHpBar(ctx, info.x, info.y + 50, this.game.aiHp, this.game.aiMaxHp, this.game.aiHpShake);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('AI', info.x, info.y - 48);
    ctx.font = '12px Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText(`手牌: ${this.game.aiHand.length}  牌库: ${this.game.aiDeck.length}`, info.x, info.y + 85);
  }

  private drawCardBack(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const w = 120;
    const h = 160;
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    const r = 8;
    ctx.moveTo(-w / 2 + r, -h / 2);
    ctx.lineTo(w / 2 - r, -h / 2);
    ctx.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    ctx.lineTo(w / 2, h / 2 - r);
    ctx.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    ctx.lineTo(-w / 2 + r, h / 2);
    ctx.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    ctx.lineTo(-w / 2, -h / 2 + r);
    ctx.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    grad.addColorStop(0, '#4a148c');
    grad.addColorStop(1, '#1a0033');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,0,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,215,0,0.4)';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 0, 0);
    ctx.restore();
  }

  private drawAiHand(ctx: CanvasRenderingContext2D): void {
    for (const card of this.game.aiHand) {
      if (!card.isFlying && card !== this.game.battleCardAi) {
        this.drawCardBack(ctx, card.x, card.y);
      }
    }
  }

  private drawPlayerHand(ctx: CanvasRenderingContext2D, time: number): void {
    const hovered = this.hoveredCard;
    for (const card of this.game.playerHand) {
      if (card !== hovered && !card.isFlying && card !== this.game.battleCardPlayer) {
        card.draw(ctx, time);
      }
    }
    if (hovered && !hovered.isFlying && hovered !== this.game.battleCardPlayer) {
      hovered.draw(ctx, time);
    }
  }

  private drawBattleCards(ctx: CanvasRenderingContext2D, time: number): void {
    if (this.game.battleCardAi) {
      this.game.battleCardAi.draw(ctx, time);
    }
    if (this.game.battleCardPlayer) {
      this.game.battleCardPlayer.draw(ctx, time);
    }
  }

  private drawConfirmButton(ctx: CanvasRenderingContext2D): void {
    if (this.game.phase !== 'player_select') return;
    const L = this.layout;
    const b = L.confirmBtn;
    ctx.save();
    const hovered = this.confirmBtnHovered;
    const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
    grad.addColorStop(0, hovered ? '#ffb84d' : '#ff9800');
    grad.addColorStop(1, hovered ? '#e68a00' : '#cc7a00');
    ctx.fillStyle = grad;
    this.roundRect(ctx, b.x, b.y, b.w, b.h, 8);
    ctx.fill();
    ctx.strokeStyle = hovered ? '#fff' : 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    this.roundRect(ctx, b.x, b.y, b.w, b.h, 8);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('确认出牌', b.x + b.w / 2, b.y + b.h / 2);
    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawFloatingNumbers(ctx: CanvasRenderingContext2D): void {
    for (const f of this.floatingNumbers) {
      const alpha = f.life / f.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = f.isPlayer ? '#ff5555' : '#55ff88';
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = f.isPlayer ? '#ff0000' : '#00ff00';
      ctx.shadowBlur = 10;
      const sign = f.isPlayer ? '-' : '+';
      ctx.fillText(`${sign}${f.value}`, f.x, f.y);
      ctx.restore();
    }
  }

  private drawMessage(ctx: CanvasRenderingContext2D): void {
    const L = this.layout;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`第 ${this.game.turn} 回合  ${this.game.message}`, L.centerX, 10);
  }

  private drawGameOver(ctx: CanvasRenderingContext2D): void {
    const L = this.layout;
    const scale = this.easeOutBack(this.gameOverScale);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, L.width, L.height);
    ctx.translate(L.centerX, L.centerX < 0 ? 0 : L.height / 2 - 30);
    ctx.scale(scale, scale);
    ctx.fillStyle = this.game.winner === 'player' ? '#ffd700' : '#ff5555';
    ctx.font = 'bold 64px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = this.game.winner === 'player' ? '#ffd700' : '#ff0000';
    ctx.shadowBlur = 20;
    ctx.fillText(this.game.winner === 'player' ? '胜利！' : '失败...', 0, -30);
    ctx.shadowBlur = 0;
    const b = { x: -80, y: 30, w: 160, h: 50 };
    const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
    grad.addColorStop(0, this.restartBtnHovered ? '#5ea8ff' : '#3d8bff');
    grad.addColorStop(1, this.restartBtnHovered ? '#2d6bd8' : '#1d4bb8');
    ctx.fillStyle = grad;
    this.roundRect(ctx, b.x, b.y, b.w, b.h, 8);
    ctx.fill();
    ctx.strokeStyle = this.restartBtnHovered ? '#fff' : 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    this.roundRect(ctx, b.x, b.y, b.w, b.h, 8);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('重新开始', 0, b.y + b.h / 2);
    ctx.restore();
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
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
}
