import { GameController } from './GameController';

class GameEngine {
  private canvas: HTMLCanvasElement;
  private gameController: GameController;
  private loadingScreen: HTMLElement;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.loadingScreen = document.getElementById('loadingScreen') as HTMLElement;

    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    this.gameController = new GameController(this.canvas);
    this.init();
  }

  private init(): void {
    this.loadResources().then(() => {
      setTimeout(() => {
        this.hideLoadingScreen();
        this.startGame();
      }, 1500);
    });
  }

  private loadResources(): Promise<void> {
    return new Promise((resolve) => {
      const images: string[] = [];
      let loaded = 0;
      const total = images.length;

      if (total === 0) {
        resolve();
        return;
      }

      for (const src of images) {
        const img = new Image();
        img.onload = () => {
          loaded++;
          if (loaded >= total) {
            resolve();
          }
        };
        img.onerror = () => {
          loaded++;
          if (loaded >= total) {
            resolve();
          }
        };
        img.src = src;
      }
    });
  }

  private hideLoadingScreen(): void {
    if (this.loadingScreen) {
      this.loadingScreen.classList.add('hidden');
      setTimeout(() => {
        if (this.loadingScreen.parentNode) {
          this.loadingScreen.parentNode.removeChild(this.loadingScreen);
        }
      }, 800);
    }
  }

  private startGame(): void {
    this.gameController.start();
  }

  public getFPS(): number {
    return this.gameController.getFPS();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new GameEngine();
  (window as any).game = game;
});
