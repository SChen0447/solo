import { Game } from './game';
import { Renderer } from './renderer';

const ASPECT_RATIO = 3 / 2;
const MIN_WIDTH = 600;
const MIN_HEIGHT = 400;

class GameApp {
  private game: Game;
  private renderer: Renderer;
  private canvas: HTMLCanvasElement;
  private stepsEl: HTMLElement;
  private remainingEl: HTMLElement;
  private modalOverlay: HTMLElement;
  private modalTitle: HTMLElement;
  private modalRestart: HTMLElement;
  private sizeButtons: NodeListOf<HTMLElement>;
  private lastTime: number = 0;
  private needsRedraw: boolean = true;
  private hasWon: boolean = false;
  private celebrationShown: boolean = false;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas not found');
    this.canvas = canvas;

    const stepsEl = document.getElementById('steps');
    const remainingEl = document.getElementById('remaining');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalRestart = document.getElementById('modal-restart');
    if (!stepsEl || !remainingEl || !modalOverlay || !modalTitle || !modalRestart) {
      throw new Error('DOM elements not found');
    }
    this.stepsEl = stepsEl;
    this.remainingEl = remainingEl;
    this.modalOverlay = modalOverlay;
    this.modalTitle = modalTitle;
    this.modalRestart = modalRestart;

    this.sizeButtons = document.querySelectorAll('#game-size-select button');

    this.game = new Game({ gridSize: 4 });
    this.renderer = new Renderer(canvas, this.game);

    this.setupCallbacks();
    this.setupEventListeners();
    this.game.init(4);
    this.updateStatusBar();
    this.resizeCanvas();
    this.loop(performance.now());
  }

  private setupCallbacks(): void {
    this.game.setOnStateChange(() => {
      this.needsRedraw = true;
      this.updateStatusBar();
    });

    this.game.setOnWin(() => {
      this.hasWon = true;
      this.renderer.startCelebration();
      this.needsRedraw = true;
      setTimeout(() => {
        this.showModal();
      }, 2000);
    });
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    window.addEventListener('resize', () => this.resizeCanvas());

    this.modalRestart.addEventListener('click', () => {
      this.restartGame();
    });

    this.sizeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const size = parseInt(btn.getAttribute('data-size') || '4', 10) as 4 | 6;
        this.sizeButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.game.init(size);
        this.renderer.resetCelebration();
        this.hasWon = false;
        this.celebrationShown = false;
        this.updateStatusBar();
        this.resizeCanvas();
        this.needsRedraw = true;
      });
    });
  }

  private handleClick(e: MouseEvent): void {
    if (this.hasWon) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const card = this.game.getCardAtPosition(
      x,
      y,
      this.renderer.getCardWidth(),
      this.renderer.getCardHeight(),
      this.renderer.getGridOffsetX(),
      this.renderer.getGridOffsetY(),
      this.renderer.getGap()
    );

    if (card) {
      this.game.selectCard(card);
    }
  }

  private resizeCanvas(): void {
    const container = document.getElementById('game-container');
    if (!container) return;

    let width = window.innerWidth * 0.95;
    let height = window.innerHeight * 0.85;

    if (width / height > ASPECT_RATIO) {
      width = height * ASPECT_RATIO;
    } else {
      height = width / ASPECT_RATIO;
    }

    width = Math.max(width, MIN_WIDTH);
    height = Math.max(height, MIN_HEIGHT);

    const maxWidth = window.innerWidth * 0.95;
    const maxHeight = window.innerHeight * 0.85;
    if (width > maxWidth) {
      width = maxWidth;
      height = width / ASPECT_RATIO;
    }
    if (height > maxHeight) {
      height = maxHeight;
      width = height * ASPECT_RATIO;
    }

    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    const dpr = window.devicePixelRatio || 1;
    this.renderer.resize(Math.floor(width * dpr), Math.floor(height * dpr));
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.needsRedraw = true;
  }

  private updateStatusBar(): void {
    this.stepsEl.textContent = `步数：${this.game.getSteps()}`;
    this.remainingEl.textContent = `剩余配对：${this.game.getRemainingPairs()}`;
  }

  private showModal(): void {
    this.modalTitle.textContent = `恭喜完成！步数：${this.game.getSteps()}`;
    this.modalOverlay.classList.add('visible');
    this.celebrationShown = true;
  }

  private hideModal(): void {
    this.modalOverlay.classList.remove('visible');
  }

  private restartGame(): void {
    this.hideModal();
    const activeBtn = document.querySelector('#game-size-select button.active');
    const size = activeBtn ? parseInt(activeBtn.getAttribute('data-size') || '4', 10) as 4 | 6 : 4;
    this.game.init(size);
    this.renderer.resetCelebration();
    this.hasWon = false;
    this.celebrationShown = false;
    this.updateStatusBar();
    this.needsRedraw = true;
  }

  private hasAnimation(): boolean {
    const cards = this.game.getCards();
    for (const card of cards) {
      if (card.state === 'flipping' || card.matchGlowProgress > 0 || card.shakeProgress > 0) {
        return true;
      }
    }
    return this.renderer.isCelebrationComplete() === false && this.hasWon && !this.celebrationShown;
  }

  private loop = (currentTime: number): void => {
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.game.update(deltaTime);

    const shouldRender = this.needsRedraw || this.hasAnimation();
    if (shouldRender) {
      this.renderer.render(deltaTime);
      this.needsRedraw = false;
    }

    requestAnimationFrame(this.loop);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
