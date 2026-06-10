import type { ProjectileType } from './entities';

export interface UIEvents {
  onAmmoSelect?: (type: ProjectileType) => void;
  onRestart?: () => void;
}

export class UIManager {
  private playerScoreEl: HTMLElement;
  private aiScoreEl: HTMLElement;
  private playerAmmoEl: HTMLElement;
  private aiAmmoEl: HTMLElement;
  private turnTextEl: HTMLElement;
  private turnPlayerEl: HTMLElement;
  private turnAiEl: HTMLElement;
  private turnTimerEl: HTMLElement;
  private ammoButtons: NodeListOf<HTMLElement>;
  private gameOverPanel: HTMLElement;
  private gameOverTitle: HTMLElement;
  private finalPlayerScore: HTMLElement;
  private finalAiScore: HTMLElement;
  private restartBtn: HTMLElement;
  private ammoCountEls: Record<ProjectileType, HTMLElement>;

  private events: UIEvents;
  private selectedAmmo: ProjectileType = 'stone';
  private trajectoryPoints: { x: number; y: number }[] = [];
  private showTrajectory: boolean = false;

  constructor(events: UIEvents = {}) {
    this.events = events;

    this.playerScoreEl = document.getElementById('player-score')!;
    this.aiScoreEl = document.getElementById('ai-score')!;
    this.playerAmmoEl = document.getElementById('player-ammo')!;
    this.aiAmmoEl = document.getElementById('ai-ammo')!;
    this.turnTextEl = document.getElementById('turn-text')!;
    this.turnPlayerEl = document.getElementById('turn-player')!;
    this.turnAiEl = document.getElementById('turn-ai')!;
    this.turnTimerEl = document.getElementById('turn-timer')!;
    this.ammoButtons = document.querySelectorAll('.ammo-btn') as NodeListOf<HTMLElement>;
    this.gameOverPanel = document.getElementById('game-over-panel')!;
    this.gameOverTitle = document.getElementById('game-over-title')!;
    this.finalPlayerScore = document.getElementById('final-player-score')!;
    this.finalAiScore = document.getElementById('final-ai-score')!;
    this.restartBtn = document.getElementById('restart-btn')!;

    this.ammoCountEls = {
      stone: document.getElementById('count-stone')!,
      sticky: document.getElementById('count-sticky')!,
      bouncy: document.getElementById('count-bouncy')!
    };

    this.bindEvents();
  }

  private bindEvents(): void {
    this.ammoButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type as ProjectileType;
        if (type) {
          this.selectAmmo(type);
        }
      });
    });

    this.restartBtn.addEventListener('click', () => {
      if (this.events.onRestart) {
        this.events.onRestart();
      }
    });
  }

  public selectAmmo(type: ProjectileType): void {
    this.selectedAmmo = type;
    this.ammoButtons.forEach((btn) => {
      if (btn.dataset.type === type) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    if (this.events.onAmmoSelect) {
      this.events.onAmmoSelect(type);
    }
  }

  public getSelectedAmmo(): ProjectileType {
    return this.selectedAmmo;
  }

  public updateScore(playerScore: number, aiScore: number): void {
    this.playerScoreEl.textContent = playerScore.toString();
    this.aiScoreEl.textContent = aiScore.toString();
  }

  public updateAmmo(playerTotal: number, aiTotal: number): void {
    this.playerAmmoEl.textContent = playerTotal.toString();
    this.aiAmmoEl.textContent = aiTotal.toString();
  }

  public updateAmmoCounts(counts: Record<ProjectileType, number>): void {
    this.ammoCountEls.stone.textContent = counts.stone.toString();
    this.ammoCountEls.sticky.textContent = counts.sticky.toString();
    this.ammoCountEls.bouncy.textContent = counts.bouncy.toString();
  }

  public setTurn(turn: 'player' | 'ai'): void {
    if (turn === 'player') {
      this.turnPlayerEl.classList.add('active');
      this.turnAiEl.classList.remove('active');
      this.turnTextEl.textContent = '玩家回合';
    } else {
      this.turnPlayerEl.classList.remove('active');
      this.turnAiEl.classList.add('active');
      this.turnTextEl.textContent = 'AI回合';
    }
  }

  public setTurnTimer(seconds: number | null): void {
    if (seconds === null) {
      this.turnTimerEl.textContent = '';
    } else {
      this.turnTimerEl.textContent = `⏱ ${seconds}s`;
    }
  }

  public setTrajectory(points: { x: number; y: number }[]): void {
    this.trajectoryPoints = points;
  }

  public setShowTrajectory(show: boolean): void {
    this.showTrajectory = show;
  }

  public showGameOver(playerWon: boolean, playerScore: number, aiScore: number): void {
    this.gameOverTitle.classList.remove('win', 'lose');
    if (playerWon) {
      this.gameOverTitle.classList.add('win');
      this.gameOverTitle.textContent = '🎉 胜利！';
    } else {
      this.gameOverTitle.classList.add('lose');
      this.gameOverTitle.textContent = '💥 失败';
    }
    this.finalPlayerScore.textContent = playerScore.toString();
    this.finalAiScore.textContent = aiScore.toString();
    this.gameOverPanel.classList.add('show');
  }

  public hideGameOver(): void {
    this.gameOverPanel.classList.remove('show');
  }

  public setAmmoButtonsEnabled(enabled: boolean): void {
    this.ammoButtons.forEach((btn) => {
      (btn as HTMLButtonElement).disabled = !enabled;
      btn.style.opacity = enabled ? '1' : '0.5';
      btn.style.pointerEvents = enabled ? 'auto' : 'none';
    });
  }

  public renderOverlay(ctx: CanvasRenderingContext2D): void {
    if (this.showTrajectory && this.trajectoryPoints.length > 0) {
      this.renderTrajectory(ctx);
    }
  }

  private renderTrajectory(ctx: CanvasRenderingContext2D): void {
    if (this.trajectoryPoints.length < 2) return;

    ctx.save();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(this.trajectoryPoints[0].x, this.trajectoryPoints[0].y);
    for (let i = 1; i < this.trajectoryPoints.length; i++) {
      ctx.lineTo(this.trajectoryPoints[i].x, this.trajectoryPoints[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    const previewIndices = [
      Math.floor(this.trajectoryPoints.length * 0.25),
      Math.floor(this.trajectoryPoints.length * 0.5),
      Math.min(this.trajectoryPoints.length - 1, Math.floor(this.trajectoryPoints.length * 0.85))
    ];

    for (let i = 0; i < previewIndices.length; i++) {
      const idx = previewIndices[i];
      if (idx < this.trajectoryPoints.length) {
        const p = this.trajectoryPoints[idx];
        ctx.fillStyle = `rgba(243, 156, 18, ${0.7 - i * 0.15})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5 - i, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 - i * 0.2})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

export class AudioManager {
  private audioContext: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  public playLaunchSound(type: ProjectileType): void {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case 'stone':
        osc.type = 'square';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      case 'sticky':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      case 'bouncy':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
    }
  }

  public playImpactSound(velocity: number): void {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    const intensity = Math.min(1, velocity / 20);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120 * (0.5 + intensity * 0.5), now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
    gain.gain.setValueAtTime(0.08 + intensity * 0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playBreakSound(): void {
    const ctx = this.getContext();
    const bufferSize = ctx.sampleRate * 0.2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start();
  }

  public playTurnSound(): void {
    const ctx = this.getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.setValueAtTime(650, now + 0.1);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.start(now);
    osc.stop(now + 0.2);
  }
}
