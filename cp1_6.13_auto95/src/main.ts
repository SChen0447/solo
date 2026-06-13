import { DataManager, PuzzlePiece, Season } from './DataManager';
import { PuzzleEngine } from './PuzzleEngine';
import { Renderer } from './Renderer';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;

class App {
  private canvas: HTMLCanvasElement;
  private dataManager: DataManager;
  private puzzleEngine: PuzzleEngine;
  private renderer: Renderer;
  private isDragging: boolean = false;
  private draggedPiece: PuzzlePiece | null = null;
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;
  private lastTime: number = 0;
  private animationId: number = 0;
  private particleSpawnTimer: number = 0;
  private isFadingParticles: boolean = false;
  private targetSeason: Season | null = null;
  private seasonIcons: HTMLElement;
  private hintText: HTMLElement;
  private opacitySlider: HTMLInputElement;
  private timelinePoints: NodeListOf<HTMLElement>;

  constructor() {
    this.canvas = document.getElementById('puzzle-canvas') as HTMLCanvasElement;
    this.seasonIcons = document.querySelector('.season-icons') as HTMLElement;
    this.hintText = document.querySelector('.hint-text') as HTMLElement;
    this.opacitySlider = document.getElementById('opacity-slider') as HTMLInputElement;
    this.timelinePoints = document.querySelectorAll('.timeline-point');

    this.dataManager = new DataManager(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.puzzleEngine = new PuzzleEngine(this.dataManager, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.renderer = new Renderer(this.canvas, this.dataManager, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.puzzleEngine.setOnSnapCallback((piece) => this.onPieceSnap(piece));
    this.puzzleEngine.setOnCompleteCallback(() => this.onPuzzleComplete());

    this.bindEvents();
    this.hideLoading();
    this.startGameLoop();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());

    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    window.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    window.addEventListener('touchend', () => this.onTouchEnd());

    document.querySelectorAll('.season-icon').forEach(icon => {
      icon.addEventListener('click', () => {
        const season = icon.getAttribute('data-season') as Season;
        if (season) {
          this.switchSeason(season);
        }
      });
    });

    this.opacitySlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.dataManager.setOpacity(value);
      this.updateSliderThumbColor();
    });

    this.timelinePoints.forEach(point => {
      point.addEventListener('click', () => {
        const season = point.getAttribute('data-season') as Season;
        if (season && this.dataManager.isComplete()) {
          this.switchSeason(season);
          point.classList.add('active');
          const color = this.getSeasonColor(season);
          point.style.color = color;
          setTimeout(() => {
            point.classList.remove('active');
          }, 300);
        }
      });
    });

    this.hintText.addEventListener('mouseenter', () => {
      const currentSeason = this.dataManager.getCurrentSeason();
      this.hintText.classList.add(`${currentSeason}-color`);
    });

    this.hintText.addEventListener('mouseleave', () => {
      this.hintText.className = 'hint-text';
    });
  }

  private getSeasonColor(season: Season): string {
    const colors: Record<Season, string> = {
      spring: '#FF69B4',
      summer: '#228B22',
      autumn: '#FF6347',
      winter: '#708090'
    };
    return colors[season];
  }

  private updateSliderThumbColor(): void {
    const opacity = this.dataManager.getOpacity();
    const currentSeason = this.dataManager.getCurrentSeason();
    const baseColor = this.getSeasonColor(currentSeason);

    const grayness = 1 - opacity;
    const thumbColor = this.mixWithGray(baseColor, grayness);

    const style = document.createElement('style');
    style.textContent = `
      #opacity-slider::-webkit-slider-thumb { background: ${thumbColor} !important; }
      #opacity-slider::-moz-range-thumb { background: ${thumbColor} !important; }
    `;
    const oldStyle = document.getElementById('slider-thumb-style');
    if (oldStyle) oldStyle.remove();
    style.id = 'slider-thumb-style';
    document.head.appendChild(style);
  }

  private mixWithGray(color: string, grayAmount: number): string {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const gray = 128;
    const newR = Math.round(r * (1 - grayAmount) + gray * grayAmount);
    const newG = Math.round(g * (1 - grayAmount) + gray * grayAmount);
    const newB = Math.round(b * (1 - grayAmount) + gray * grayAmount);

    return `rgb(${newR}, ${newG}, ${newB})`;
  }

  private getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private onMouseDown(e: MouseEvent): void {
    const coords = this.getCanvasCoords(e);
    const piece = this.dataManager.getPieceAtPosition(coords.x, coords.y);

    if (piece && !piece.isPlaced) {
      this.isDragging = true;
      this.draggedPiece = piece;
      this.dragOffsetX = coords.x - piece.currentX;
      this.dragOffsetY = coords.y - piece.currentY;
      this.dataManager.bringToFront(piece);
      this.canvas.classList.add('grabbing-cursor');
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const coords = this.getCanvasCoords(e);

    if (this.isDragging && this.draggedPiece) {
      this.draggedPiece.currentX = coords.x - this.dragOffsetX;
      this.draggedPiece.currentY = coords.y - this.dragOffsetY;
    } else {
      const piece = this.dataManager.getPieceAtPosition(coords.x, coords.y);
      if (piece && !piece.isPlaced) {
        this.canvas.classList.add('grab-cursor');
      } else {
        this.canvas.classList.remove('grab-cursor');
      }
    }
  }

  private onMouseUp(): void {
    if (this.isDragging && this.draggedPiece) {
      this.puzzleEngine.checkSnap(this.draggedPiece);
    }
    this.isDragging = false;
    this.draggedPiece = null;
    this.canvas.classList.remove('grabbing-cursor');
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const coords = this.getCanvasCoords(touch);
      const piece = this.dataManager.getPieceAtPosition(coords.x, coords.y);

      if (piece && !piece.isPlaced) {
        this.isDragging = true;
        this.draggedPiece = piece;
        this.dragOffsetX = coords.x - piece.currentX;
        this.dragOffsetY = coords.y - piece.currentY;
        this.dataManager.bringToFront(piece);
      }
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (this.isDragging && this.draggedPiece && e.touches.length === 1) {
      const touch = e.touches[0];
      const coords = this.getCanvasCoords(touch);
      this.draggedPiece.currentX = coords.x - this.dragOffsetX;
      this.draggedPiece.currentY = coords.y - this.dragOffsetY;
    }
  }

  private onTouchEnd(): void {
    if (this.isDragging && this.draggedPiece) {
      this.puzzleEngine.checkSnap(this.draggedPiece);
    }
    this.isDragging = false;
    this.draggedPiece = null;
  }

  private onPieceSnap(piece: PuzzlePiece): void {
    this.renderer.addFlashEffect(piece.targetX, piece.targetY);
  }

  private onPuzzleComplete(): void {
    this.seasonIcons.classList.add('visible');
    this.updateSliderThumbColor();
    this.updateTimelineActive('spring');
    this.switchSeason('spring');
  }

  private switchSeason(season: Season): void {
    if (this.isFadingParticles) {
      this.targetSeason = season;
      return;
    }

    this.isFadingParticles = true;
    this.targetSeason = season;

    this.hintText.classList.remove('flicker');
    void this.hintText.offsetWidth;
    this.hintText.classList.add('flicker');
    setTimeout(() => {
      this.hintText.classList.remove('flicker');
    }, 500);

    this.updateTimelineActive(season);
  }

  private updateTimelineActive(season: Season): void {
    this.timelinePoints.forEach(point => {
      const pointSeason = point.getAttribute('data-season');
      if (pointSeason === season) {
        point.classList.add('active');
      } else {
        point.classList.remove('active');
      }
    });
  }

  private hideLoading(): void {
    const loadingScreen = document.getElementById('loading-screen');
    const app = document.getElementById('app');

    if (loadingScreen && app) {
      setTimeout(() => {
        loadingScreen.classList.add('fade-out');
        app.classList.remove('hidden');
        setTimeout(() => {
          loadingScreen.style.display = 'none';
        }, 800);
      }, 1500);
    }
  }

  private startGameLoop(): void {
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private gameLoop(): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.puzzleEngine.update(deltaTime);
    this.renderer.updateParticles(deltaTime);

    if (this.isFadingParticles) {
      const done = this.renderer.fadeOutParticles(deltaTime);
      if (done && this.targetSeason) {
        this.dataManager.setCurrentSeason(this.targetSeason);
        this.updateSliderThumbColor();
        this.isFadingParticles = false;
        this.targetSeason = null;
        this.particleSpawnTimer = 0;
      }
    }

    if (this.dataManager.isComplete() && !this.isFadingParticles) {
      this.particleSpawnTimer += deltaTime;
      const spawnInterval = 150;
      if (this.particleSpawnTimer >= spawnInterval) {
        this.particleSpawnTimer = 0;
        const currentSeason = this.dataManager.getCurrentSeason();
        this.renderer.spawnParticle(currentSeason);
      }
    }

    this.renderer.render();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  destroy(): void {
    cancelAnimationFrame(this.animationId);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
