import { RubiksCube } from './Cube';

const GAME_DURATION = 10 * 60;

type UIEventHandlers = {
  onScramble: () => void;
  onReset: () => void;
};

export class UIController {
  private cube: RubiksCube;
  private handlers: UIEventHandlers;
  private stepCount = 0;
  private timeLeft = GAME_DURATION;
  private timerInterval: number | null = null;
  private timerStarted = false;
  private gameEnded = false;

  private timerEl: HTMLElement;
  private stepCountEl: HTMLElement;
  private scrambleBtn: HTMLButtonElement;
  private resetBtn: HTMLButtonElement;
  private modalOverlay: HTMLElement;
  private modalCloseBtn: HTMLButtonElement;
  private finalStepsEl: HTMLElement;

  constructor(cube: RubiksCube, handlers: UIEventHandlers) {
    this.cube = cube;
    this.handlers = handlers;

    this.timerEl = document.getElementById('timer')!;
    this.stepCountEl = document.getElementById('step-count')!;
    this.scrambleBtn = document.getElementById('scramble-btn') as HTMLButtonElement;
    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
    this.modalOverlay = document.getElementById('modal-overlay')!;
    this.modalCloseBtn = document.getElementById('modal-close') as HTMLButtonElement;
    this.finalStepsEl = document.getElementById('final-steps')!;

    this.bindEvents();
    this.updateTimerDisplay();
  }

  private bindEvents(): void {
    this.scrambleBtn.addEventListener('click', () => {
      if (this.cube.isBusy()) return;
      this.handlers.onScramble();
    });

    this.resetBtn.addEventListener('click', () => {
      this.handlers.onReset();
    });

    this.modalCloseBtn.addEventListener('click', () => {
      this.hideModal();
      this.handlers.onReset();
    });
  }

  public incrementStep(): void {
    if (this.gameEnded) return;
    this.stepCount++;
    this.stepCountEl.textContent = String(this.stepCount);

    if (!this.timerStarted) {
      this.startTimer();
    }
  }

  public startTimer(): void {
    if (this.timerStarted || this.gameEnded) return;
    this.timerStarted = true;

    this.timerInterval = window.setInterval(() => {
      this.timeLeft--;
      this.updateTimerDisplay();

      if (this.timeLeft <= 60) {
        this.timerEl.classList.add('warning');
      }

      if (this.timeLeft <= 0) {
        this.endGame();
      }
    }, 1000);
  }

  public stopTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  public reset(): void {
    this.stopTimer();
    this.stepCount = 0;
    this.timeLeft = GAME_DURATION;
    this.timerStarted = false;
    this.gameEnded = false;
    this.stepCountEl.textContent = '0';
    this.timerEl.classList.remove('warning');
    this.updateTimerDisplay();
  }

  private updateTimerDisplay(): void {
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = this.timeLeft % 60;
    this.timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  private endGame(): void {
    this.stopTimer();
    this.gameEnded = true;
    this.finalStepsEl.textContent = String(this.stepCount);
    this.showModal();
  }

  private showModal(): void {
    this.modalOverlay.classList.add('active');
  }

  private hideModal(): void {
    this.modalOverlay.classList.remove('active');
  }
}
