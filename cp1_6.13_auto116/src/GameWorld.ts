import { AssetManager, ERAS, FRAGMENTS } from './AssetManager';
import { ParticleSystem } from './ParticleSystem';
import gsap from 'gsap';

interface Fragment {
  id: number;
  eraId: number;
  name: string;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  width: number;
  height: number;
  matched: boolean;
  dragging: boolean;
  shakeAnim: number;
  scale: number;
  alpha: number;
}

interface EraZone {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  nodeX: number;
  nodeY: number;
  matchedCount: number;
  totalFragments: number;
}

export class GameWorld {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private assetManager: AssetManager;
  private particleSystem: ParticleSystem;
  private fragments: Fragment[] = [];
  private eraZones: EraZone[] = [];
  private draggingFragment: Fragment | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private score = 0;
  private matchedCount = 0;
  private totalFragments = 20;
  private maxScore = 100;
  private gameStarted = false;
  private gameOver = false;
  private startTime = 0;
  private elapsedTime = 0;
  private timelineFlashAlpha = 0;
  private victoryGlowAlpha = 0;
  private victoryTextAlpha = 0;
  private scale = 1;
  private timelineY = 0;
  private timelineStartX = 0;
  private timelineEndX = 0;
  private fragAreaY = 0;
  private fragSize = 50;
  private onScoreUpdate: ((score: number, matched: number) => void) | null = null;
  private onTimerUpdate: ((time: string) => void) | null = null;
  private onGameComplete: ((score: number, matched: number, time: string) => void) | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    assetManager: AssetManager,
    particleSystem: ParticleSystem
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.assetManager = assetManager;
    this.particleSystem = particleSystem;
  }

  setCallbacks(
    onScore: (score: number, matched: number) => void,
    onTimer: (time: string) => void,
    onComplete: (score: number, matched: number, time: string) => void
  ): void {
    this.onScoreUpdate = onScore;
    this.onTimerUpdate = onTimer;
    this.onGameComplete = onComplete;
  }

  init(): void {
    this.resize();
    this.initFragments();
    this.initEraZones();
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.scale = Math.min(w / 1024, h / 768, 1.2);
    if (w < 768) this.scale = Math.min(w / 768, 0.85);

    this.timelineY = h * 0.38;
    this.timelineStartX = w * 0.06;
    this.timelineEndX = w * 0.94;
    this.fragAreaY = h * 0.55;
    this.fragSize = Math.round(50 * this.scale);

    if (this.eraZones.length > 0) {
      this.updateEraZonePositions();
    }
    if (this.fragments.length > 0) {
      this.updateFragmentPositions();
    }
  }

  private initEraZones(): void {
    this.eraZones = [];
    const w = window.innerWidth;
    const zoneWidth = (this.timelineEndX - this.timelineStartX) / ERAS.length;
    for (let i = 0; i < ERAS.length; i++) {
      const nodeX = this.timelineStartX + zoneWidth * i + zoneWidth / 2;
      this.eraZones.push({
        id: i,
        name: ERAS[i].name,
        x: this.timelineStartX + zoneWidth * i,
        y: this.timelineY - 80 * this.scale,
        width: zoneWidth,
        height: 80 * this.scale,
        nodeX,
        nodeY: this.timelineY,
        matchedCount: 0,
        totalFragments: FRAGMENTS.filter((f) => f.eraId === i).length,
      });
    }
  }

  private initFragments(): void {
    this.fragments = [];
    const w = window.innerWidth;
    const cols = Math.min(10, Math.floor((w - 40) / (this.fragSize + 8)));
    const rows = Math.ceil(FRAGMENTS.length / cols);
    const totalWidth = cols * (this.fragSize + 8) - 8;
    const startX = (w - totalWidth) / 2;
    const startY = this.fragAreaY;

    const shuffled = [...FRAGMENTS].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffled.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (this.fragSize + 8);
      const y = startY + row * (this.fragSize + 12);
      this.fragments.push({
        id: shuffled[i].id,
        eraId: shuffled[i].eraId,
        name: shuffled[i].name,
        x,
        y,
        homeX: x,
        homeY: y,
        width: this.fragSize,
        height: this.fragSize,
        matched: false,
        dragging: false,
        shakeAnim: 0,
        scale: 1,
        alpha: 1,
      });
    }
  }

  private updateEraZonePositions(): void {
    const zoneWidth = (this.timelineEndX - this.timelineStartX) / ERAS.length;
    for (let i = 0; i < this.eraZones.length; i++) {
      const z = this.eraZones[i];
      z.x = this.timelineStartX + zoneWidth * i;
      z.y = this.timelineY - 80 * this.scale;
      z.width = zoneWidth;
      z.height = 80 * this.scale;
      z.nodeX = this.timelineStartX + zoneWidth * i + zoneWidth / 2;
      z.nodeY = this.timelineY;
    }
  }

  private updateFragmentPositions(): void {
    const w = window.innerWidth;
    const cols = Math.min(10, Math.floor((w - 40) / (this.fragSize + 8)));
    const totalWidth = cols * (this.fragSize + 8) - 8;
    const startX = (w - totalWidth) / 2;
    const unmatchedFragments = this.fragments.filter((f) => !f.matched);
    for (let i = 0; i < unmatchedFragments.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const frag = unmatchedFragments[i];
      frag.homeX = startX + col * (this.fragSize + 8);
      frag.homeY = this.fragAreaY + row * (this.fragSize + 12);
      if (!frag.dragging) {
        frag.x = frag.homeX;
        frag.y = frag.homeY;
      }
      frag.width = this.fragSize;
      frag.height = this.fragSize;
    }
  }

  startGame(): void {
    this.gameStarted = true;
    this.gameOver = false;
    this.score = 0;
    this.matchedCount = 0;
    this.startTime = performance.now();
    this.elapsedTime = 0;
    this.victoryGlowAlpha = 0;
    this.victoryTextAlpha = 0;
    this.particleSystem.clear();
    this.emitScoreUpdate();
  }

  resetGame(): void {
    this.gameStarted = false;
    this.gameOver = false;
    this.score = 0;
    this.matchedCount = 0;
    this.elapsedTime = 0;
    this.timelineFlashAlpha = 0;
    this.victoryGlowAlpha = 0;
    this.victoryTextAlpha = 0;
    this.particleSystem.clear();
    this.draggingFragment = null;
    this.initFragments();
    this.initEraZones();
    this.emitScoreUpdate();
  }

  private emitScoreUpdate(): void {
    if (this.onScoreUpdate) {
      this.onScoreUpdate(this.score, this.matchedCount);
    }
  }

  private emitTimerUpdate(): void {
    if (this.onTimerUpdate) {
      this.onTimerUpdate(this.formatTime(this.elapsedTime));
    }
  }

  private formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  handlePointerDown(clientX: number, clientY: number): void {
    if (!this.gameStarted || this.gameOver) return;
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const f = this.fragments[i];
      if (f.matched) continue;
      if (
        clientX >= f.x &&
        clientX <= f.x + f.width &&
        clientY >= f.y &&
        clientY <= f.y + f.height
      ) {
        f.dragging = true;
        this.draggingFragment = f;
        this.dragOffsetX = clientX - f.x;
        this.dragOffsetY = clientY - f.y;
        gsap.to(f, { scale: 1.15, duration: 0.2, ease: 'back.out(2)' });
        break;
      }
    }
  }

  handlePointerMove(clientX: number, clientY: number): void {
    if (!this.draggingFragment) return;
    this.draggingFragment.x = clientX - this.dragOffsetX;
    this.draggingFragment.y = clientY - this.dragOffsetY;
  }

  handlePointerUp(): void {
    if (!this.draggingFragment) return;
    const frag = this.draggingFragment;
    frag.dragging = false;
    this.draggingFragment = null;

    const zone = this.getEraZoneAt(frag.x + frag.width / 2, frag.y + frag.height / 2);
    if (zone && zone.id === frag.eraId) {
      this.onCorrectMatch(frag, zone);
    } else if (zone) {
      this.onWrongMatch(frag);
    } else {
      gsap.to(frag, {
        x: frag.homeX,
        y: frag.homeY,
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
      });
    }
  }

  private getEraZoneAt(x: number, y: number): EraZone | null {
    for (const zone of this.eraZones) {
      if (
        x >= zone.x &&
        x <= zone.x + zone.width &&
        y >= zone.y &&
        y <= zone.y + zone.height
      ) {
        return zone;
      }
    }
    return null;
  }

  private onCorrectMatch(frag: Fragment, zone: EraZone): void {
    frag.matched = true;
    this.score += 5;
    this.matchedCount++;
    zone.matchedCount++;

    const snapX = zone.nodeX - frag.width / 2;
    const snapY = zone.y + 10 * this.scale + (zone.matchedCount - 1) * (this.fragSize + 4) * 0.3;
    gsap.to(frag, {
      x: snapX,
      y: Math.min(snapY, zone.y + zone.height - frag.height),
      scale: 1,
      alpha: 0.85,
      duration: 0.3,
      ease: 'back.out(1.5)',
    });

    this.particleSystem.emit(zone.nodeX, zone.y, zone.id, 50 + Math.floor(Math.random() * 30));
    this.assetManager.playEraSound(zone.id);
    this.emitScoreUpdate();

    if (this.matchedCount >= this.totalFragments) {
      this.onGameVictory();
    }
  }

  private onWrongMatch(frag: Fragment): void {
    this.timelineFlashAlpha = 0.6;
    this.assetManager.playErrorSound();

    const originalX = frag.x;
    const shakeAmount = 6 * this.scale;
    gsap.to(frag, {
      x: originalX + shakeAmount,
      duration: 0.075,
      ease: 'power1.inOut',
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        gsap.to(frag, {
          x: originalX - shakeAmount,
          duration: 0.075,
          ease: 'power1.inOut',
          yoyo: true,
          repeat: 1,
          onComplete: () => {
            gsap.to(frag, {
              x: frag.homeX,
              y: frag.homeY,
              scale: 1,
              duration: 0.3,
              ease: 'power2.out',
            });
          },
        });
      },
    });
  }

  private onGameVictory(): void {
    this.gameOver = true;
    this.assetManager.playVictorySound();

    gsap.to(this, {
      victoryGlowAlpha: 1,
      duration: 1.5,
      ease: 'power2.inOut',
    });
    gsap.to(this, {
      victoryTextAlpha: 1,
      duration: 1,
      delay: 0.8,
      ease: 'power2.out',
    });

    const w = window.innerWidth;
    this.particleSystem.emitVictory(this.timelineStartX, this.timelineY, this.timelineEndX - this.timelineStartX);

    setTimeout(() => {
      if (this.onGameComplete) {
        this.onGameComplete(this.score, this.matchedCount, this.formatTime(this.elapsedTime));
      }
    }, 2500);
  }

  update(dt: number): void {
    if (this.gameStarted && !this.gameOver) {
      this.elapsedTime = performance.now() - this.startTime;
      this.emitTimerUpdate();
    }

    if (this.timelineFlashAlpha > 0) {
      this.timelineFlashAlpha = Math.max(0, this.timelineFlashAlpha - dt * 2);
    }

    this.particleSystem.update(dt);
  }

  draw(): void {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.clearRect(0, 0, w, h);
    this.drawTimeline(ctx, w);
    this.drawEraZones(ctx);
    this.drawFragments(ctx);
    this.drawDragHighlight(ctx);
    this.particleSystem.draw(ctx);
    this.drawVictoryEffect(ctx, w);
  }

  private drawTimeline(ctx: CanvasRenderingContext2D, w: number): void {
    ctx.save();

    ctx.strokeStyle = '#5c3a1e';
    ctx.lineWidth = 3 * this.scale;
    ctx.beginPath();
    ctx.moveTo(this.timelineStartX, this.timelineY);
    ctx.lineTo(this.timelineEndX, this.timelineY);
    ctx.stroke();

    if (this.victoryGlowAlpha > 0) {
      ctx.strokeStyle = `rgba(218, 165, 32, ${this.victoryGlowAlpha * 0.6})`;
      ctx.lineWidth = 8 * this.scale;
      ctx.shadowColor = `rgba(255, 215, 0, ${this.victoryGlowAlpha})`;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.moveTo(this.timelineStartX, this.timelineY);
      ctx.lineTo(this.timelineEndX, this.timelineY);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    if (this.timelineFlashAlpha > 0) {
      ctx.strokeStyle = `rgba(200, 30, 30, ${this.timelineFlashAlpha})`;
      ctx.lineWidth = 5 * this.scale;
      ctx.beginPath();
      ctx.moveTo(this.timelineStartX, this.timelineY);
      ctx.lineTo(this.timelineEndX, this.timelineY);
      ctx.stroke();
    }

    for (const zone of this.eraZones) {
      ctx.fillStyle = '#daa520';
      ctx.beginPath();
      ctx.arc(zone.nodeX, zone.nodeY, 7 * this.scale, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#5c3a1e';
      ctx.strokeStyle = 'rgba(218, 165, 32, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(zone.nodeX, zone.nodeY, 7 * this.scale, 0, Math.PI * 2);
      ctx.stroke();

      if (this.victoryGlowAlpha > 0) {
        ctx.fillStyle = `rgba(255, 215, 0, ${this.victoryGlowAlpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(zone.nodeX, zone.nodeY, 12 * this.scale, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#5c3a1e';
      ctx.font = `${Math.round(13 * this.scale)}px SimSun, STSong, serif`;
      ctx.textAlign = 'center';
      ctx.fillText(zone.name, zone.nodeX, zone.nodeY + 22 * this.scale);
    }

    ctx.restore();
  }

  private drawEraZones(ctx: CanvasRenderingContext2D): void {
    for (const zone of this.eraZones) {
      ctx.save();
      ctx.strokeStyle = 'rgba(92, 58, 30, 0.15)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.strokeRect(zone.x + 4, zone.y, zone.width - 8, zone.height);
      ctx.setLineDash([]);

      if (zone.matchedCount >= zone.totalFragments && zone.totalFragments > 0) {
        ctx.fillStyle = `rgba(218, 165, 32, 0.08)`;
        ctx.fillRect(zone.x + 4, zone.y, zone.width - 8, zone.height);
      }

      ctx.fillStyle = 'rgba(92, 58, 30, 0.35)';
      ctx.font = `${Math.round(10 * this.scale)}px SimSun, STSong, serif`;
      ctx.textAlign = 'center';
      ctx.fillText(
        `${zone.matchedCount}/${zone.totalFragments}`,
        zone.x + zone.width / 2,
        zone.y + zone.height - 4 * this.scale
      );

      ctx.restore();
    }
  }

  private drawFragments(ctx: CanvasRenderingContext2D): void {
    for (const frag of this.fragments) {
      if (frag.alpha <= 0.01) continue;
      ctx.save();
      ctx.globalAlpha = frag.alpha;
      const cx = frag.x + frag.width / 2;
      const cy = frag.y + frag.height / 2;
      ctx.translate(cx, cy);
      ctx.scale(frag.scale, frag.scale);

      const glowCanvas = this.assetManager.getGlowCanvas(frag.id);
      const glowOffset = 8;
      ctx.drawImage(
        glowCanvas,
        -frag.width / 2 - glowOffset,
        -frag.height / 2 - glowOffset,
        frag.width + glowOffset * 2,
        frag.height + glowOffset * 2
      );

      if (frag.matched) {
        ctx.strokeStyle = 'rgba(218, 165, 32, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-frag.width / 2, -frag.height / 2, frag.width, frag.height);
      }

      ctx.fillStyle = '#5c3a1e';
      ctx.font = `${Math.round(9 * this.scale)}px SimSun, STSong, serif`;
      ctx.textAlign = 'center';
      ctx.fillText(frag.name, 0, frag.height / 2 + 11 * this.scale);

      ctx.restore();
    }
  }

  private drawDragHighlight(ctx: CanvasRenderingContext2D): void {
    if (!this.draggingFragment) return;
    const frag = this.draggingFragment;
    const cx = frag.x + frag.width / 2;
    const cy = frag.y + frag.height / 2;
    const zone = this.getEraZoneAt(cx, cy);
    if (zone) {
      ctx.save();
      const isCorrect = zone.id === frag.eraId;
      ctx.fillStyle = isCorrect
        ? 'rgba(218, 165, 32, 0.15)'
        : 'rgba(200, 30, 30, 0.12)';
      ctx.fillRect(zone.x + 4, zone.y, zone.width - 8, zone.height);
      ctx.strokeStyle = isCorrect
        ? 'rgba(218, 165, 32, 0.5)'
        : 'rgba(200, 30, 30, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.strokeRect(zone.x + 4, zone.y, zone.width - 8, zone.height);
      ctx.restore();
    }
  }

  private drawVictoryEffect(ctx: CanvasRenderingContext2D, w: number): void {
    if (this.victoryTextAlpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.victoryTextAlpha;
    ctx.fillStyle = '#8b6914';
    ctx.font = `bold ${Math.round(28 * this.scale)}px SimSun, STSong, serif`;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
    ctx.shadowBlur = 15;
    ctx.fillText('文明之路已然编织', w / 2, this.timelineY - 50 * this.scale);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}
