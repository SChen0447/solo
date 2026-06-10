import { AudioPlayer } from './AudioPlayer';
import { ParticleSystem } from './ParticleSystem';
import songsData from './songs.json';

type GameState = 'title' | 'songSelect' | 'playing' | 'gameover';

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  colorHex: string;
  frequency: number;
  radius: number;
  trail: { x: number; y: number; alpha: number; radius: number }[];
  hit: boolean;
  hitProgress: number;
  colorIndex: number;
}

interface SongNote {
  color: string;
  timeMs: number;
}

interface Song {
  name: string;
  durationMs: number;
  notes: SongNote[];
}

interface Button {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  hovered: boolean;
}

interface SongCard {
  x: number;
  y: number;
  w: number;
  h: number;
  index: number;
  hovered: boolean;
}

const COLOR_MAP: Record<string, { hex: string; freq: number }> = {
  C: { hex: '#ff6b6b', freq: 262 },
  D: { hex: '#ff9f43', freq: 294 },
  E: { hex: '#feca57', freq: 330 },
  F: { hex: '#1dd1a1', freq: 349 },
  G: { hex: '#48dbfb', freq: 392 },
  A: { hex: '#5f27cd', freq: 440 },
  B: { hex: '#c44dff', freq: 494 },
};

const COLOR_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const KEY_MAP: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6 };

const INITIAL_VY = 120;
const ACCELERATION = 30;
const HIT_WINDOW = 15;
const MAX_LIVES = 5;
const MILESTONES = [10, 25, 50];

export class GameEngine {
  private canvasW: number = 800;
  private canvasH: number = 600;
  private balls: Ball[] = [];
  private score: number = 0;
  private combo: number = 0;
  private maxCombo: number = 0;
  private lives: number = MAX_LIVES;
  private state: GameState = 'title';
  private currentSong: Song | null = null;
  private songStartTime: number = 0;
  private nextNoteIndex: number = 0;
  private audioPlayer: AudioPlayer;
  private particleSystem: ParticleSystem;
  private activeKeys: Set<number> = new Set();
  private songs: Song[] = songsData as Song[];
  private scoreAnim: number = 0;
  private milestoneText: string | null = null;
  private milestoneTimer: number = 0;
  private titleButtons: Button[] = [];
  private songCards: SongCard[] = [];
  private gameoverButton: Button | null = null;

  constructor() {
    this.audioPlayer = new AudioPlayer();
    this.particleSystem = new ParticleSystem();
  }

  resize(w: number, h: number): void {
    this.canvasW = w;
    this.canvasH = h;
    this.layoutUI();
  }

  private layoutUI(): void {
    const cx = this.canvasW / 2;
    this.titleButtons = [
      { x: cx - 100, y: this.canvasH / 2 + 20, w: 200, h: 56, label: '开始游戏', hovered: false },
      { x: cx - 100, y: this.canvasH / 2 + 96, w: 200, h: 56, label: '曲目选择', hovered: false },
    ];

    const cardW = 200, cardH = 120, gap = 32;
    const totalW = cardW * this.songs.length + gap * (this.songs.length - 1);
    const startX = (this.canvasW - totalW) / 2;
    this.songCards = this.songs.map((_, i) => ({
      x: startX + i * (cardW + gap),
      y: this.canvasH / 2 - cardH / 2,
      w: cardW,
      h: cardH,
      index: i,
      hovered: false,
    }));

    this.gameoverButton = {
      x: cx - 100,
      y: this.canvasH / 2 + 120,
      w: 200,
      h: 56,
      label: '返回标题',
      hovered: false,
    };
  }

  private get ballRadius(): number {
    return this.canvasW < 500 ? 15 : 20;
  }

  private get keyConfig(): { w: number; h: number } {
    return this.canvasW < 500 ? { w: 45, h: 24 } : { w: 60, h: 30 };
  }

  private get judgmentLineY(): number {
    const { h } = this.keyConfig;
    return this.canvasH - h - 40;
  }

  private get keyAreaY(): number {
    const { h } = this.keyConfig;
    return this.canvasH - h - 10;
  }

  private keyX(index: number): number {
    const { w } = this.keyConfig;
    const totalW = 7 * w + 6 * 8;
    const startX = (this.canvasW - totalW) / 2;
    return startX + index * (w + 8);
  }

  update(deltaTime: number): void {
    this.particleSystem.update(deltaTime);
    if (this.scoreAnim > 0) this.scoreAnim = Math.max(0, this.scoreAnim - deltaTime);
    if (this.milestoneTimer > 0) {
      this.milestoneTimer -= deltaTime;
      if (this.milestoneTimer <= 0) this.milestoneText = null;
    }

    if (this.state !== 'playing') return;

    if (!this.currentSong) return;

    const elapsed = performance.now() - this.songStartTime;

    while (this.nextNoteIndex < this.currentSong.notes.length) {
      const note = this.currentSong.notes[this.nextNoteIndex];
      if (note.timeMs <= elapsed) {
        this.spawnBall(note.color);
        this.nextNoteIndex++;
      } else {
        break;
      }
    }

    const jLine = this.judgmentLineY;

    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      if (ball.hit) {
        ball.hitProgress += deltaTime / 0.2;
        if (ball.hitProgress >= 1) {
          this.balls.splice(i, 1);
        }
        continue;
      }

      ball.vy += ACCELERATION * deltaTime;
      ball.y += ball.vy * deltaTime;

      ball.trail.unshift({ x: ball.x, y: ball.y, alpha: 1, radius: ball.radius });
      if (ball.trail.length > 3) ball.trail.pop();
      ball.trail.forEach((t, idx) => {
        t.alpha = 1 - (idx + 1) * 0.3;
        t.radius = ball.radius * (1 - (idx + 1) * 0.2);
      });

      if (ball.y > jLine + HIT_WINDOW) {
        this.balls.splice(i, 1);
        this.loseLife();
      }
    }

    if (
      elapsed >= this.currentSong.durationMs &&
      this.nextNoteIndex >= this.currentSong.notes.length &&
      this.balls.length === 0
    ) {
      this.state = 'gameover';
    }

    if (this.lives <= 0) {
      this.state = 'gameover';
    }
  }

  private spawnBall(colorName: string): void {
    const color = COLOR_MAP[colorName];
    if (!color) return;
    const colorIndex = COLOR_ORDER.indexOf(colorName);

    const ball: Ball = {
      x: this.keyX(colorIndex) + this.keyConfig.w / 2,
      y: -this.ballRadius,
      vx: 0,
      vy: INITIAL_VY,
      color: colorName,
      colorHex: color.hex,
      frequency: color.freq,
      radius: this.ballRadius,
      trail: [],
      hit: false,
      hitProgress: 0,
      colorIndex,
    };
    this.balls.push(ball);
  }

  private loseLife(): void {
    this.lives = Math.max(0, this.lives - 1);
    this.combo = 0;
  }

  private addScore(base: number): void {
    this.score += base * (1 + Math.floor(this.combo / 10) * 0.1);
    this.scoreAnim = 0.3;
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    if (MILESTONES.includes(this.combo)) {
      this.milestoneText = `${this.combo} 连击!`;
      this.milestoneTimer = 0.8;
    }
  }

  handleKeyDown(key: string): void {
    if (this.state !== 'playing') return;
    const idx = KEY_MAP[key.toLowerCase()];
    if (idx === undefined) return;
    this.activeKeys.add(idx);
    this.checkHit(idx);
  }

  handleKeyUp(key: string): void {
    const idx = KEY_MAP[key.toLowerCase()];
    if (idx === undefined) return;
    this.activeKeys.delete(idx);
  }

  handleVirtualKeyPress(index: number): void {
    if (this.state !== 'playing') return;
    this.activeKeys.add(index);
    this.checkHit(index);
    setTimeout(() => this.activeKeys.delete(index), 100);
  }

  private checkHit(colorIndex: number): void {
    const jLine = this.judgmentLineY;
    let best: Ball | null = null;
    let bestDist = Infinity;

    for (const ball of this.balls) {
      if (ball.hit || ball.colorIndex !== colorIndex) continue;
      const dist = Math.abs(ball.y - jLine);
      if (dist <= HIT_WINDOW && dist < bestDist) {
        best = ball;
        bestDist = dist;
      }
    }

    if (best) {
      best.hit = true;
      this.audioPlayer.playTone(best.frequency, 0.3);
      this.particleSystem.emit(best.x, best.y, 8);
      this.addScore(100);
    }
  }

  private isPointIn(x: number, y: number, b: { x: number; y: number; w: number; h: number }): boolean {
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  handleMouseMove(x: number, y: number): void {
    this.titleButtons.forEach((b) => (b.hovered = this.isPointIn(x, y, b)));
    this.songCards.forEach((c) => (c.hovered = this.isPointIn(x, y, c)));
    if (this.gameoverButton) this.gameoverButton.hovered = this.isPointIn(x, y, this.gameoverButton);
  }

  handleClick(x: number, y: number): void {
    if (this.state === 'title') {
      if (this.isPointIn(x, y, this.titleButtons[0])) this.selectSong(0);
      if (this.isPointIn(x, y, this.titleButtons[1])) this.state = 'songSelect';
    } else if (this.state === 'songSelect') {
      for (const card of this.songCards) {
        if (this.isPointIn(x, y, card)) {
          this.selectSong(card.index);
          return;
        }
      }
    } else if (this.state === 'playing') {
      const { w, h } = this.keyConfig;
      for (let i = 0; i < 7; i++) {
        if (x >= this.keyX(i) && x <= this.keyX(i) + w && y >= this.keyAreaY && y <= this.keyAreaY + h) {
          this.handleVirtualKeyPress(i);
          return;
        }
      }
    } else if (this.state === 'gameover') {
      if (this.gameoverButton && this.isPointIn(x, y, this.gameoverButton)) {
        this.resetToTitle();
      }
    }
  }

  selectSong(index: number): void {
    this.currentSong = this.songs[index];
    this.startGame();
  }

  startGame(): void {
    this.balls = [];
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.lives = MAX_LIVES;
    this.nextNoteIndex = 0;
    this.songStartTime = performance.now();
    this.state = 'playing';
    this.scoreAnim = 0;
    this.milestoneText = null;
    this.milestoneTimer = 0;
    this.activeKeys.clear();
  }

  resetToTitle(): void {
    this.state = 'title';
    this.currentSong = null;
    this.balls = [];
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx);
    if (this.state === 'title') {
      this.drawTitle(ctx);
    } else if (this.state === 'songSelect') {
      this.drawSongSelect(ctx);
    } else if (this.state === 'playing') {
      this.drawGame(ctx);
    } else if (this.state === 'gameover') {
      this.drawGame(ctx);
      this.drawGameOver(ctx);
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const grad = ctx.createLinearGradient(0, 0, 0, this.canvasH);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(1, '#16213e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.canvasW, this.canvasH);
  }

  private drawTitle(ctx: CanvasRenderingContext2D): void {
    const cx = this.canvasW / 2;

    ctx.save();
    ctx.font = 'bold 48px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    const grad = ctx.createLinearGradient(cx - 150, 0, cx + 150, 0);
    grad.addColorStop(0, '#feca57');
    grad.addColorStop(1, '#ff6b6b');
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(254, 202, 87, 0.6)';
    ctx.shadowBlur = 20;
    ctx.fillText('音律坠球', cx, this.canvasH / 2 - 40);
    ctx.restore();

    for (const btn of this.titleButtons) {
      this.drawButton(ctx, btn);
    }
  }

  private drawButton(ctx: CanvasRenderingContext2D, btn: Button): void {
    ctx.save();
    const scale = btn.hovered ? 1.05 : 1;
    const cx = btn.x + btn.w / 2;
    const cy = btn.y + btn.h / 2;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);

    ctx.fillStyle = '#2a2a4a';
    ctx.shadowColor = btn.hovered ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = btn.hovered ? 16 : 8;
    this.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 12);
    ctx.fill();

    ctx.strokeStyle = 'rgba(254, 202, 87, 0.3)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 12);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
    ctx.restore();
  }

  private drawSongSelect(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.font = 'bold 32px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#feca57';
    ctx.shadowColor = 'rgba(254, 202, 87, 0.4)';
    ctx.shadowBlur = 12;
    ctx.fillText('选择曲目', this.canvasW / 2, 120);
    ctx.restore();

    for (const card of this.songCards) {
      const song = this.songs[card.index];
      ctx.save();
      const offsetY = card.hovered ? -8 : 0;
      ctx.fillStyle = '#2a2a4a';
      ctx.shadowColor = card.hovered ? 'rgba(254, 202, 87, 0.5)' : 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = card.hovered ? 24 : 8;
      ctx.shadowOffsetY = card.hovered ? 8 : 4;
      this.roundRect(ctx, card.x, card.y + offsetY, card.w, card.h, 16);
      ctx.fill();

      ctx.strokeStyle = card.hovered ? 'rgba(254, 202, 87, 0.6)' : 'rgba(254, 202, 87, 0.2)';
      ctx.lineWidth = 1.5;
      this.roundRect(ctx, card.x, card.y + offsetY, card.w, card.h, 16);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(song.name, card.x + card.w / 2, card.y + offsetY + card.h / 2 - 8);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '13px -apple-system, sans-serif';
      ctx.fillText(`${song.notes.length} 音符 · ${(song.durationMs / 1000).toFixed(0)}秒`, card.x + card.w / 2, card.y + offsetY + card.h / 2 + 18);
      ctx.restore();
    }
  }

  private drawGame(ctx: CanvasRenderingContext2D): void {
    if (this.currentSong) {
      const elapsed = performance.now() - this.songStartTime;
      const progress = Math.min(1, elapsed / this.currentSong.durationMs);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(0, 0, this.canvasW, 4);
      ctx.fillStyle = '#4fc3f7';
      ctx.fillRect(0, 0, this.canvasW * progress, 4);

      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '14px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.currentSong.name, this.canvasW / 2, 24);
      ctx.restore();
    }

    this.drawHUD(ctx);
    this.drawBalls(ctx);
    this.drawJudgmentLine(ctx);
    this.drawKeys(ctx);
    this.particleSystem.render(ctx);

    if (this.milestoneText) {
      const alpha = Math.min(1, this.milestoneTimer / 0.8);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 56px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#feca57';
      ctx.shadowColor = 'rgba(254, 202, 87, 0.8)';
      ctx.shadowBlur = 20;
      ctx.fillText(this.milestoneText, this.canvasW / 2, this.canvasH / 2);
      ctx.restore();
    }
  }

  private drawHUD(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const scoreScale = 1 + (this.scoreAnim > 0 ? (1 - this.scoreAnim / 0.3) * 0.2 : 0);
    ctx.font = `bold ${Math.floor(24 * scoreScale)}px -apple-system, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(`分数: ${Math.floor(this.score)}`, 20, 20);

    if (this.combo > 0) {
      ctx.font = 'bold 22px -apple-system, sans-serif';
      ctx.fillStyle = '#feca57';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(254, 202, 87, 0.5)';
      ctx.shadowBlur = 8;
      ctx.fillText(`${this.combo} 连击`, this.canvasW / 2, 60);
    }
    ctx.restore();

    const heartSize = 24;
    const startX = this.canvasW - 20 - MAX_LIVES * (heartSize + 6);
    for (let i = 0; i < MAX_LIVES; i++) {
      const active = i < this.lives;
      this.drawHeart(ctx, startX + i * (heartSize + 6), 22, heartSize, active);
    }
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, active: boolean): void {
    ctx.save();
    ctx.fillStyle = active ? '#ff6b6b' : 'rgba(255,255,255,0.2)';
    ctx.shadowColor = active ? 'rgba(255, 107, 107, 0.6)' : 'transparent';
    ctx.shadowBlur = active ? 8 : 0;
    const s = size / 2;
    ctx.beginPath();
    ctx.moveTo(x + s, y + s * 1.2);
    ctx.bezierCurveTo(x + s * 2, y, x + s * 2.2, y - s, x + s, y - s * 0.2);
    ctx.bezierCurveTo(x - s * 0.2, y - s, x, y, x + s, y + s * 1.2);
    ctx.fill();
    ctx.restore();
  }

  private drawBalls(ctx: CanvasRenderingContext2D): void {
    for (const ball of this.balls) {
      for (let i = ball.trail.length - 1; i >= 0; i--) {
        const t = ball.trail[i];
        ctx.save();
        ctx.globalAlpha = t.alpha * 0.5;
        ctx.fillStyle = ball.colorHex;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      const scale = ball.hit ? 1 - ball.hitProgress : 1;
      const r = ball.radius * scale;
      if (r <= 0) continue;

      ctx.save();
      ctx.fillStyle = ball.colorHex;
      ctx.globalAlpha = 0.3;
      ctx.shadowColor = ball.colorHex;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, r + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.fillStyle = ball.colorHex;
      ctx.shadowColor = ball.colorHex;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawJudgmentLine(ctx: CanvasRenderingContext2D): void {
    const y = this.judgmentLineY;
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(this.canvasW - 20, y);
    ctx.stroke();
    ctx.restore();
  }

  private drawKeys(ctx: CanvasRenderingContext2D): void {
    const { w, h } = this.keyConfig;
    const y = this.keyAreaY;
    const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

    for (let i = 0; i < 7; i++) {
      const x = this.keyX(i);
      const colorHex = COLOR_MAP[COLOR_ORDER[i]].hex;
      const active = this.activeKeys.has(i);

      ctx.save();
      ctx.fillStyle = active ? colorHex : '#2a2a4a';
      ctx.shadowColor = active ? colorHex : 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = active ? 16 : 8;
      ctx.globalAlpha = active ? 1 : 0.9;
      this.roundRect(ctx, x, y, w, h, 8);
      ctx.fill();

      ctx.strokeStyle = active ? colorHex : 'rgba(254, 202, 87, 0.3)';
      ctx.lineWidth = 1.5;
      this.roundRect(ctx, x, y, w, h, 8);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.fillStyle = active ? '#ffffff' : 'rgba(255,255,255,0.8)';
      ctx.font = `bold ${this.canvasW < 500 ? 12 : 14}px -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[i], x + w / 2, y + h + 14);
      ctx.restore();
    }
  }

  private drawGameOver(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, this.canvasW, this.canvasH);

    const cx = this.canvasW / 2;
    const cy = this.canvasH / 2;

    ctx.fillStyle = '#2a2a4a';
    ctx.shadowColor = 'rgba(254, 202, 87, 0.4)';
    ctx.shadowBlur = 20;
    this.roundRect(ctx, cx - 180, cy - 140, 360, 280, 20);
    ctx.fill();

    ctx.strokeStyle = 'rgba(254, 202, 87, 0.5)';
    ctx.lineWidth = 2;
    this.roundRect(ctx, cx - 180, cy - 140, 360, 280, 20);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.font = 'bold 28px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#feca57';
    ctx.fillText('游戏结束', cx, cy - 90);

    ctx.font = 'bold 48px -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${Math.floor(this.score)}`, cx, cy - 30);

    ctx.font = '16px -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(`最高连击: ${this.maxCombo}`, cx, cy + 10);

    const grade = this.getGrade();
    ctx.font = 'bold 40px -apple-system, sans-serif';
    ctx.fillStyle = grade.color;
    ctx.shadowColor = grade.color;
    ctx.shadowBlur = 12;
    ctx.fillText(grade.label, cx, cy + 60);
    ctx.restore();

    if (this.gameoverButton) this.drawButton(ctx, this.gameoverButton);
  }

  private getGrade(): { label: string; color: string } {
    if (this.maxCombo >= 50 && this.lives >= 4) return { label: 'S', color: '#feca57' };
    if (this.maxCombo >= 25) return { label: 'A', color: '#48dbfb' };
    if (this.maxCombo >= 10) return { label: 'B', color: '#1dd1a1' };
    return { label: 'C', color: '#ff6b6b' };
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
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

  dispose(): void {
    this.audioPlayer.dispose();
  }
}
