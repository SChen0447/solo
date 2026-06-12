import { CardGrid } from './CardGrid';
import { ParticleBackground } from './ParticleBackground';

type AppState = 'start' | 'playing' | 'ended';

class GameApp {
  private container: HTMLElement;
  private appState: AppState = 'start';
  private particleBackground: ParticleBackground;
  private cardGrid: CardGrid | null = null;
  private timerInterval: number | null = null;
  private timeRemaining: number = 120;
  private score: number = 0;

  private startScreen: HTMLElement | null = null;
  private gameScreen: HTMLElement | null = null;
  private endModal: HTMLElement | null = null;
  private timerElement: HTMLElement | null = null;
  private scoreElement: HTMLElement | null = null;
  private scoreBarFill: HTMLElement | null = null;

  constructor(containerId: string) {
    const app = document.getElementById(containerId);
    if (!app) throw new Error(`Container #${containerId} not found`);
    this.container = app;

    this.particleBackground = new ParticleBackground(this.container);

    this.initStyles();
    this.showStartScreen();

    window.addEventListener('resize', () => this.handleResize());
  }

  private initStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes title-glow {
        0%, 100% {
          text-shadow: 
            0 0 10px #fff,
            0 0 20px #fff,
            0 0 30px #FF00FF,
            0 0 40px #FF00FF;
        }
        50% {
          text-shadow: 
            0 0 20px #fff,
            0 0 30px #00FFFF,
            0 0 40px #00FFFF,
            0 0 50px #00FFFF;
        }
      }

      @keyframes btn-pulse {
        0%, 100% {
          box-shadow: 0 0 20px #00FFFF, 0 0 40px rgba(0, 255, 255, 0.5);
        }
        50% {
          box-shadow: 0 0 40px #FF00FF, 0 0 80px rgba(255, 0, 255, 0.5);
        }
      }

      @keyframes timer-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }

      .start-screen {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 10;
      }

      .game-title {
        font-size: clamp(36px, 8vw, 72px);
        font-weight: bold;
        font-family: 'Courier New', monospace;
        color: #fff;
        background: linear-gradient(180deg, #fff 0%, #FF00FF 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 60px;
        letter-spacing: 4px;
        animation: title-glow 3s ease-in-out infinite;
        text-align: center;
        padding: 0 20px;
      }

      .cyber-btn {
        padding: 18px 60px;
        font-size: clamp(16px, 2vw, 24px);
        font-weight: bold;
        font-family: 'Courier New', monospace;
        color: #00FFFF;
        background: rgba(0, 255, 255, 0.1);
        border: 2px solid #00FFFF;
        border-radius: 4px;
        cursor: pointer;
        letter-spacing: 2px;
        transition: all 0.3s ease;
        animation: btn-pulse 2s ease-in-out infinite;
        text-transform: uppercase;
      }

      .cyber-btn:hover {
        transform: scale(1.1);
        color: #FF00FF;
        border-color: #FF00FF;
        background: rgba(255, 0, 255, 0.15);
      }

      .game-screen {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 20px;
        box-sizing: border-box;
        z-index: 5;
      }

      .top-panel {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        max-width: 600px;
        padding: 12px 24px;
        background: rgba(10, 10, 30, 0.8);
        border: 1px solid rgba(0, 255, 255, 0.5);
        border-radius: 8px;
        margin-bottom: 20px;
        box-shadow: 0 0 20px rgba(0, 255, 255, 0.2);
        backdrop-filter: blur(10px);
      }

      .timer-display {
        font-size: clamp(20px, 3vw, 28px);
        font-weight: bold;
        font-family: 'Courier New', monospace;
        color: #00FFFF;
        text-shadow: 0 0 10px #00FFFF;
        min-width: 100px;
      }

      .timer-display.warning {
        color: #FF0040;
        text-shadow: 0 0 10px #FF0040;
        animation: timer-blink 1s ease-in-out infinite;
      }

      .score-display {
        font-size: clamp(16px, 2vw, 20px);
        font-family: 'Courier New', monospace;
        color: #FF00FF;
        text-shadow: 0 0 8px #FF00FF;
        text-align: right;
      }

      .score-value {
        font-weight: bold;
        font-size: clamp(20px, 2.5vw, 26px);
      }

      .score-bar-container {
        width: 100%;
        max-width: 600px;
        height: 8px;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 0, 255, 0.3);
        border-radius: 4px;
        margin-bottom: 15px;
        overflow: hidden;
      }

      .score-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #00FFFF 0%, #FF00FF 100%);
        box-shadow: 0 0 10px #00FFFF;
        transition: width 0.3s ease;
        width: 0%;
      }

      .game-grid-wrapper {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .end-modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 50;
        backdrop-filter: blur(5px);
      }

      .end-modal {
        padding: 40px 60px;
        background: rgba(10, 10, 30, 0.95);
        border: 2px solid #FF00FF;
        border-radius: 12px;
        box-shadow: 0 0 40px #FF00FF, inset 0 0 30px rgba(255, 0, 255, 0.1);
        text-align: center;
      }

      .end-title {
        font-size: clamp(24px, 4vw, 36px);
        font-weight: bold;
        font-family: 'Courier New', monospace;
        color: #FF00FF;
        text-shadow: 0 0 15px #FF00FF;
        margin-bottom: 20px;
        letter-spacing: 2px;
      }

      .end-score {
        font-size: clamp(20px, 3vw, 28px);
        font-family: 'Courier New', monospace;
        color: #00FFFF;
        text-shadow: 0 0 10px #00FFFF;
        margin-bottom: 30px;
      }

      .end-score-value {
        font-size: clamp(32px, 5vw, 48px);
        font-weight: bold;
        color: #FFFF00;
        text-shadow: 0 0 15px #FFFF00;
      }

      .hidden {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  private showStartScreen(): void {
    this.startScreen = document.createElement('div');
    this.startScreen.className = 'start-screen';

    const title = document.createElement('h1');
    title.className = 'game-title';
    title.textContent = 'NEON MEMORY';

    const startBtn = document.createElement('button');
    startBtn.className = 'cyber-btn';
    startBtn.textContent = 'START';
    startBtn.addEventListener('click', () => this.startGame());

    this.startScreen.appendChild(title);
    this.startScreen.appendChild(startBtn);
    this.container.appendChild(this.startScreen);

    this.particleBackground.start();
  }

  private hideStartScreen(): void {
    if (this.startScreen) {
      this.startScreen.remove();
      this.startScreen = null;
    }
  }

  private startGame(): void {
    this.appState = 'playing';
    this.hideStartScreen();
    this.createGameScreen();
    this.cardGrid = new CardGrid(this.gameScreen?.querySelector('.game-grid-wrapper') as HTMLElement);
    this.cardGrid.onScoreChange = (score) => this.updateScore(score);
    this.cardGrid.onGameComplete = () => this.endGame(true);

    this.timeRemaining = 120;
    this.score = 0;
    this.updateScore(0);
    this.updateTimerDisplay();

    this.cardGrid.startGame();
    this.startTimer();
  }

  private createGameScreen(): void {
    this.gameScreen = document.createElement('div');
    this.gameScreen.className = 'game-screen';

    const topPanel = document.createElement('div');
    topPanel.className = 'top-panel';

    this.timerElement = document.createElement('div');
    this.timerElement.className = 'timer-display';
    this.timerElement.textContent = '02:00';

    const scoreDisplay = document.createElement('div');
    scoreDisplay.className = 'score-display';
    scoreDisplay.innerHTML = 'SCORE<br><span class="score-value">0</span>';
    this.scoreElement = scoreDisplay.querySelector('.score-value') as HTMLElement;

    topPanel.appendChild(this.timerElement);
    topPanel.appendChild(scoreDisplay);

    const scoreBarContainer = document.createElement('div');
    scoreBarContainer.className = 'score-bar-container';
    this.scoreBarFill = document.createElement('div');
    this.scoreBarFill.className = 'score-bar-fill';
    scoreBarContainer.appendChild(this.scoreBarFill);

    const gridWrapper = document.createElement('div');
    gridWrapper.className = 'game-grid-wrapper';

    this.gameScreen.appendChild(topPanel);
    this.gameScreen.appendChild(scoreBarContainer);
    this.gameScreen.appendChild(gridWrapper);

    this.container.appendChild(this.gameScreen);
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerInterval = window.setInterval(() => {
      this.timeRemaining--;
      this.updateTimerDisplay();

      if (this.timeRemaining <= 0) {
        this.endGame(false);
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private updateTimerDisplay(): void {
    if (!this.timerElement) return;

    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    this.timerElement.textContent = display;

    if (this.timeRemaining <= 10) {
      this.timerElement.classList.add('warning');
    } else {
      this.timerElement.classList.remove('warning');
    }
  }

  private updateScore(score: number): void {
    this.score = score;
    if (this.scoreElement) {
      this.scoreElement.textContent = score.toString();
    }
    if (this.scoreBarFill) {
      const maxScore = 800;
      const percentage = Math.min((score / maxScore) * 100, 100);
      this.scoreBarFill.style.width = `${percentage}%`;
    }
  }

  private endGame(isWin: boolean): void {
    this.stopTimer();
    this.appState = 'ended';
    this.showEndModal(isWin);
  }

  private showEndModal(isWin: boolean): void {
    const overlay = document.createElement('div');
    overlay.className = 'end-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'end-modal';

    const title = document.createElement('div');
    title.className = 'end-title';
    title.textContent = isWin ? 'MISSION COMPLETE' : 'TIME\'S UP';

    const scoreInfo = document.createElement('div');
    scoreInfo.className = 'end-score';
    scoreInfo.innerHTML = `FINAL SCORE<br><span class="end-score-value">${this.score}</span>`;

    const restartBtn = document.createElement('button');
    restartBtn.className = 'cyber-btn';
    restartBtn.textContent = 'REPLAY';
    restartBtn.addEventListener('click', () => {
      overlay.remove();
      this.restartGame();
    });

    modal.appendChild(title);
    modal.appendChild(scoreInfo);
    modal.appendChild(restartBtn);
    overlay.appendChild(modal);

    this.container.appendChild(overlay);
    this.endModal = overlay;
  }

  private restartGame(): void {
    if (this.gameScreen) {
      this.gameScreen.remove();
      this.gameScreen = null;
    }
    if (this.cardGrid) {
      this.cardGrid.destroy();
      this.cardGrid = null;
    }

    this.startGame();
  }

  private handleResize(): void {
    this.particleBackground.handleResize();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new GameApp('app');
});
