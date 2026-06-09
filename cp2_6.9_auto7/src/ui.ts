import { speedToColor } from './renderer';

export interface UIElements {
  scoreValue: HTMLElement;
  speedValue: HTMLElement;
  speedBarFill: HTMLElement;
  startScreen: HTMLElement;
  pauseScreen: HTMLElement;
  gameoverScreen: HTMLElement;
  finalScore: HTMLElement;
  startBtn: HTMLButtonElement;
  resumeBtn: HTMLButtonElement;
  restartBtn: HTMLButtonElement;
  pauseBtn: HTMLButtonElement;
}

export class UIManager {
  private elements: UIElements;
  private lastDisplayedScore: number = -1;
  private scoreAnimFrame: number | null = null;

  constructor() {
    this.elements = {
      scoreValue: document.getElementById('score-value')!,
      speedValue: document.getElementById('speed-value')!,
      speedBarFill: document.getElementById('speed-bar-fill')!,
      startScreen: document.getElementById('start-screen')!,
      pauseScreen: document.getElementById('pause-screen')!,
      gameoverScreen: document.getElementById('gameover-screen')!,
      finalScore: document.getElementById('final-score')!,
      startBtn: document.getElementById('start-btn') as HTMLButtonElement,
      resumeBtn: document.getElementById('resume-btn') as HTMLButtonElement,
      restartBtn: document.getElementById('restart-btn') as HTMLButtonElement,
      pauseBtn: document.getElementById('pause-btn') as HTMLButtonElement
    };
  }

  getElements(): UIElements {
    return this.elements;
  }

  updateScore(score: number): void {
    const displayScore = Math.floor(score);
    if (displayScore !== this.lastDisplayedScore) {
      this.elements.scoreValue.textContent = displayScore.toString();
      this.lastDisplayedScore = displayScore;
      this.triggerScoreBounce();
    }
  }

  private triggerScoreBounce(): void {
    const el = this.elements.scoreValue;
    el.classList.remove('bounce');
    void el.offsetWidth;
    el.classList.add('bounce');
  }

  updateSpeed(multiplier: number): void {
    this.elements.speedValue.textContent = multiplier.toFixed(1) + 'x';
    this.elements.speedValue.style.color = speedToColor(multiplier);
    const percent = Math.min(((multiplier - 1) / 4) * 100, 100);
    this.elements.speedBarFill.style.width = percent + '%';
  }

  showStart(): void {
    this.elements.startScreen.classList.remove('hidden');
    this.elements.pauseScreen.classList.add('hidden');
    this.elements.gameoverScreen.classList.add('hidden');
  }

  showPause(): void {
    this.elements.startScreen.classList.add('hidden');
    this.elements.pauseScreen.classList.remove('hidden');
    this.elements.gameoverScreen.classList.add('hidden');
  }

  showGameOver(finalScore: number): void {
    this.elements.startScreen.classList.add('hidden');
    this.elements.pauseScreen.classList.add('hidden');
    this.elements.gameoverScreen.classList.remove('hidden');
    this.animateFinalScore(finalScore);
  }

  hideAll(): void {
    this.elements.startScreen.classList.add('hidden');
    this.elements.pauseScreen.classList.add('hidden');
    this.elements.gameoverScreen.classList.add('hidden');
  }

  private animateFinalScore(targetScore: number): void {
    if (this.scoreAnimFrame !== null) {
      cancelAnimationFrame(this.scoreAnimFrame);
    }
    const start = performance.now();
    const duration = 1500;
    const startScore = 0;
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startScore + (targetScore - startScore) * eased);
      this.elements.finalScore.textContent = current.toString();
      if (progress < 1) {
        this.scoreAnimFrame = requestAnimationFrame(animate);
      } else {
        this.scoreAnimFrame = null;
      }
    };
    this.scoreAnimFrame = requestAnimationFrame(animate);
  }

  reset(): void {
    this.lastDisplayedScore = -1;
    this.updateScore(0);
    this.updateSpeed(1);
  }
}
