import { StarBoard, DistortionFn as BoardDistortionFn } from './board';
import { PieceManager, DistortionFn as PieceDistortionFn } from './piece';
import { EffectManager } from './effects';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private board: StarBoard;
  private pieceManager: PieceManager;
  private effectManager: EffectManager;

  private lastTime: number = 0;
  private animationFrameId: number = 0;
  private dpr: number = 1;

  private viewportWidth: number = 0;
  private viewportHeight: number = 0;

  private fps: number = 0;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;

  private hoverIntersection: { x: number; y: number } | null = null;

  private distortionFn: BoardDistortionFn & PieceDistortionFn;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not available');
    }
    this.ctx = ctx;

    this.board = new StarBoard();
    this.pieceManager = new PieceManager();
    this.effectManager = new EffectManager();

    this.dpr = window.devicePixelRatio || 1;

    this.distortionFn = (x: number, y: number) => {
      return this.effectManager.getDistortionOffset(x, y);
    };

    this.init();
  }

  private init(): void {
    this.resize();
    this.setupEventListeners();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private resize(): void {
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;

    this.canvas.width = this.viewportWidth * this.dpr;
    this.canvas.height = this.viewportHeight * this.dpr;
    this.canvas.style.width = this.viewportWidth + 'px';
    this.canvas.style.height = this.viewportHeight + 'px';

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.board.resize(this.viewportWidth, this.viewportHeight);

    this.effectManager.setBoardBounds(
      this.board.centerX,
      this.board.centerY,
      this.board.getBoardRadius()
    );
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const isOnBoard = this.board.isInsideBoard(x, y);
    this.effectManager.updateMouse(x, y, isOnBoard);

    const intersection = this.board.findNearestIntersection(x, y);
    if (intersection && isOnBoard) {
      this.hoverIntersection = { x: intersection.x, y: intersection.y };
      this.effectManager.setHoverPosition(intersection.x, intersection.y);
    } else {
      this.hoverIntersection = null;
      this.effectManager.setHoverPosition(null, null);
    }
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const intersection = this.board.findNearestIntersection(x, y);
    if (!intersection) return;

    if (this.pieceManager.isPositionOccupied(intersection.gridX, intersection.gridY)) {
      return;
    }

    const edgePoint = this.board.getRandomEdgePoint();
    const mouseHue = this.effectManager.getMouseHue();
    const currentTurn = this.pieceManager.getCurrentTurn();

    this.pieceManager.dropPiece(
      edgePoint.x,
      edgePoint.y,
      intersection.x,
      intersection.y,
      intersection.gridX,
      intersection.gridY,
      currentTurn,
      mouseHue
    );
  }

  private handleMouseLeave(): void {
    this.effectManager.updateMouse(0, 0, false);
    this.hoverIntersection = null;
    this.effectManager.setHoverPosition(null, null);
  }

  private gameLoop(): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.frameCount++;
    if (currentTime - this.fpsUpdateTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
    }

    this.update(deltaTime);
    this.render();

    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  private update(deltaTime: number): void {
    this.board.update(deltaTime);
    this.pieceManager.update(deltaTime);
    this.effectManager.update(deltaTime);
  }

  private render(): void {
    this.ctx.save();
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);

    const distortionState = this.effectManager.getDistortionState();
    const useDistortion = distortionState.amplitude > 0.3;

    const dfn = useDistortion ? this.distortionFn : undefined;

    this.board.render(this.ctx, dfn);
    this.pieceManager.render(this.ctx, dfn);

    this.renderHoverIndicator();

    this.renderTurnIndicator();

    this.renderFPS();

    this.ctx.restore();
  }

  private renderHoverIndicator(): void {
    const hover = this.effectManager.getHoverPosition();
    if (!hover.visible) return;

    const currentTurn = this.pieceManager.getCurrentTurn();

    this.ctx.save();
    this.ctx.globalAlpha = 0.35;

    const radius = 12;

    if (currentTurn === 'black') {
      const gradient = this.ctx.createRadialGradient(
        hover.x, hover.y, radius * 0.8,
        hover.x, hover.y, radius * 2.5
      );
      gradient.addColorStop(0, 'rgba(212, 175, 55, 0)');
      gradient.addColorStop(0.6, 'rgba(212, 175, 55, 0.2)');
      gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');

      this.ctx.beginPath();
      this.ctx.arc(hover.x, hover.y, radius * 2.5, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(hover.x, hover.y, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = '#1a1a2a';
      this.ctx.fill();
    } else {
      const gradient = this.ctx.createRadialGradient(
        hover.x, hover.y, radius * 0.8,
        hover.x, hover.y, radius * 2.5
      );
      gradient.addColorStop(0, 'rgba(135, 206, 250, 0)');
      gradient.addColorStop(0.6, 'rgba(135, 206, 250, 0.25)');
      gradient.addColorStop(1, 'rgba(135, 206, 250, 0)');

      this.ctx.beginPath();
      this.ctx.arc(hover.x, hover.y, radius * 2.5, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(hover.x, hover.y, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = '#e0e8f0';
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private renderTurnIndicator(): void {
    const currentTurn = this.pieceManager.getCurrentTurn();

    this.ctx.save();
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    const indicatorX = 20;
    const indicatorY = 20;
    const dotRadius = 8;

    this.ctx.fillStyle = 'rgba(200, 220, 255, 0.6)';
    this.ctx.font = '14px sans-serif';
    this.ctx.fillText('当前: ', indicatorX, indicatorY + 2);

    const dotX = indicatorX + 60;
    const dotY = indicatorY + 10;

    if (currentTurn === 'black') {
      const gradient = this.ctx.createRadialGradient(
        dotX - 2, dotY - 2, 0,
        dotX, dotY, dotRadius * 1.5
      );
      gradient.addColorStop(0, 'rgba(212, 175, 55, 0)');
      gradient.addColorStop(0.6, 'rgba(212, 175, 55, 0.3)');
      gradient.addColorStop(1, 'rgba(212, 175, 55, 0)');

      this.ctx.beginPath();
      this.ctx.arc(dotX, dotY, dotRadius * 1.5, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = '#1a1a2a';
      this.ctx.fill();
    } else {
      const gradient = this.ctx.createRadialGradient(
        dotX - 2, dotY - 2, 0,
        dotX, dotY, dotRadius * 1.5
      );
      gradient.addColorStop(0, 'rgba(135, 206, 250, 0)');
      gradient.addColorStop(0.6, 'rgba(135, 206, 250, 0.4)');
      gradient.addColorStop(1, 'rgba(135, 206, 250, 0)');

      this.ctx.beginPath();
      this.ctx.arc(dotX, dotY, dotRadius * 1.5, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = '#e0e8f0';
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  private renderFPS(): void {
    const totalParticles = this.pieceManager.getTotalParticles();

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(200, 220, 255, 0.5)';
    this.ctx.font = '12px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    const startY = 50;
    this.ctx.fillText(`FPS: ${this.fps}`, 20, startY);
    this.ctx.fillText(`Particles: ${totalParticles}`, 20, startY + 20);

    const mouseHue = Math.round(this.effectManager.getMouseHue());
    this.ctx.fillText(`Hue: ${mouseHue}°`, 20, startY + 40);

    this.ctx.restore();
  }

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

const game = new Game();
