import gsap from 'gsap';
import { Board } from './board';
import type { GridPoint } from './board';
import { Piece } from './piece';
import type { Wave, Particle } from './piece';
import { audioManager } from './audio';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private board: Board;
  private pieces: Piece[] = [];
  private waves: Wave[] = [];
  private particles: Particle[] = [];
  private score: number = 0;
  private lastTime: number = 0;
  private animationId: number = 0;
  private draggingPiece: Piece | null = null;
  private dragStartGrid: GridPoint | null = null;
  private isDragging: boolean = false;
  private mouseDownTime: number = 0;
  private mouseDownPos: { x: number; y: number } | null = null;

  private static readonly MAX_PIECES: number = 50;
  private static readonly MAX_VISUALS: number = 300;
  private static readonly DRAG_THRESHOLD: number = 5;
  private static readonly CLICK_THRESHOLD: number = 200;

  private scoreElement: HTMLElement | null = null;
  private pieceCountElement: HTMLElement | null = null;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!this.canvas) throw new Error('Canvas element not found');
    
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;

    this.board = new Board(this.canvas);
    this.scoreElement = document.getElementById('score');
    this.pieceCountElement = document.getElementById('piece-count');

    this.bindEvents();
    this.updateUI();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private getCanvasPosition(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private onMouseDown(e: MouseEvent): void {
    const pos = this.getCanvasPosition(e);
    this.mouseDownTime = performance.now();
    this.mouseDownPos = pos;

    const piece = this.findPieceAt(pos.x, pos.y);
    if (piece) {
      this.draggingPiece = piece;
      this.dragStartGrid = { gridX: piece.gridX, gridY: piece.gridY };
      this.canvas.style.cursor = 'grabbing';
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const pos = this.getCanvasPosition(e);

    if (this.draggingPiece && this.mouseDownPos) {
      const dist = Math.hypot(pos.x - this.mouseDownPos.x, pos.y - this.mouseDownPos.y);
      if (dist > Game.DRAG_THRESHOLD) {
        this.isDragging = true;
      }

      if (this.isDragging) {
        this.draggingPiece.x = pos.x;
        this.draggingPiece.y = pos.y;
      }
    } else {
      const piece = this.findPieceAt(pos.x, pos.y);
      this.canvas.style.cursor = piece ? 'pointer' : 'crosshair';
    }
  }

  private onMouseUp(e: MouseEvent): void {
    const pos = this.getCanvasPosition(e);
    const currentTime = performance.now();
    const clickDuration = currentTime - this.mouseDownTime;

    if (this.draggingPiece) {
      if (this.isDragging && this.dragStartGrid) {
        const targetGrid = this.board.screenToGrid(pos.x, pos.y);
        
        if (this.board.isValidGrid(targetGrid.gridX, targetGrid.gridY) &&
            this.board.isAdjacent(this.dragStartGrid, targetGrid) &&
            !this.getPieceAtGrid(targetGrid.gridX, targetGrid.gridY)) {
          
          this.handleDragEnd(this.draggingPiece, this.dragStartGrid, targetGrid);
        } else {
          const originalPos = this.board.gridToScreen(this.dragStartGrid.gridX, this.dragStartGrid.gridY);
          gsap.to(this.draggingPiece, {
            x: originalPos.x,
            y: originalPos.y,
            duration: 0.3,
            ease: 'back.out(1.5)'
          });
        }
      } else if (clickDuration < Game.CLICK_THRESHOLD) {
        this.collectPiece(this.draggingPiece, currentTime);
      }

      this.draggingPiece = null;
      this.dragStartGrid = null;
      this.isDragging = false;
      this.canvas.style.cursor = 'pointer';
    } else {
      const grid = this.board.screenToGrid(pos.x, pos.y);
      if (this.board.isValidGrid(grid.gridX, grid.gridY) &&
          !this.getPieceAtGrid(grid.gridX, grid.gridY) &&
          !this.findPieceAt(pos.x, pos.y)) {
        this.placePiece(grid.gridX, grid.gridY);
      }
    }

    this.mouseDownPos = null;
  }

  private onResize(): void {
    this.board.resize();
    for (const piece of this.pieces) {
      const pos = this.board.gridToScreen(piece.gridX, piece.gridY);
      piece.x = pos.x;
      piece.y = pos.y;
    }
  }

  private findPieceAt(x: number, y: number): Piece | null {
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      if (this.pieces[i].containsPoint(x, y)) {
        return this.pieces[i];
      }
    }
    return null;
  }

  private getPieceAtGrid(gridX: number, gridY: number): Piece | null {
    return this.pieces.find(p => p.gridX === gridX && p.gridY === gridY && !p.moving) || null;
  }

  private placePiece(gridX: number, gridY: number): void {
    if (this.pieces.length >= Game.MAX_PIECES) return;

    const pos = this.board.gridToScreen(gridX, gridY);
    const piece = new Piece(gridX, gridY, pos.x, pos.y);
    
    this.pieces.push(piece);
    audioManager.playPlaceSound();

    gsap.from(piece, {
      x: this.board.centerX,
      y: this.board.centerY,
      scale: 0,
      duration: 0.4,
      ease: 'back.out(2)',
      onStart: () => {
        (piece as unknown as { scale: number }).scale = 0;
      },
      onUpdate: function() {
        (piece as unknown as { scale: number }).scale = this.targets()[0].scale ?? 1;
      }
    });

    this.updateUI();
  }

  private handleDragEnd(piece: Piece, fromGrid: GridPoint, toGrid: GridPoint): void {
    const targetPos = this.board.gridToScreen(toGrid.gridX, toGrid.gridY);
    piece.gridX = toGrid.gridX;
    piece.gridY = toGrid.gridY;

    gsap.to(piece, {
      x: targetPos.x,
      y: targetPos.y,
      duration: 0.2,
      ease: 'power2.out',
      onComplete: () => {
        piece.x = targetPos.x;
        piece.y = targetPos.y;
        
        piece.setDirection(fromGrid, toGrid);
        this.createMirrorPieces(piece, fromGrid, toGrid);
      }
    });
  }

  private createMirrorPieces(originalPiece: Piece, fromGrid: GridPoint, toGrid: GridPoint): void {
    const mirrorPositions = this.board.getMirrorPosition(toGrid.gridX, toGrid.gridY);
    const mirrorColor = Piece.getComplementaryColor(originalPiece.color);

    const mirrors: { grid: GridPoint; axis: 'horizontal' | 'vertical' }[] = [
      { grid: mirrorPositions.horizontal, axis: 'horizontal' },
      { grid: mirrorPositions.vertical, axis: 'vertical' }
    ];

    for (const { grid, axis } of mirrors) {
      if (this.board.isValidGrid(grid.gridX, grid.gridY) &&
          !this.getPieceAtGrid(grid.gridX, grid.gridY) &&
          this.pieces.length < Game.MAX_PIECES) {
        
        const pos = this.board.gridToScreen(grid.gridX, grid.gridY);
        const mirrorPiece = new Piece(grid.gridX, grid.gridY, pos.x, pos.y, mirrorColor, true);
        
        const offsetX = axis === 'horizontal' ? 0 : -20;
        const offsetY = axis === 'vertical' ? 0 : -20;
        mirrorPiece.x = pos.x + offsetX;
        mirrorPiece.y = pos.y + offsetY;

        this.pieces.push(mirrorPiece);

        gsap.to(mirrorPiece, {
          x: pos.x,
          y: pos.y,
          duration: 0.3,
          ease: 'back.out(1.5)',
          onComplete: () => {
            mirrorPiece.setMirrorDirection(fromGrid, toGrid);
          }
        });
      }
    }

    this.updateUI();
  }

  private collectPiece(piece: Piece, currentTime: number): void {
    const index = this.pieces.indexOf(piece);
    if (index !== -1) {
      this.pieces.splice(index, 1);
      
      const newParticles = piece.createCollectParticles(currentTime);
      this.particles.push(...newParticles);
      
      this.score += 10;
      audioManager.playCollectSound();
      this.updateUI();
      this.enforceVisualLimits();
    }
  }

  private enforceVisualLimits(): void {
    let totalVisuals = this.waves.length + this.particles.length;
    for (const piece of this.pieces) {
      totalVisuals += piece.trail.length;
    }

    while (totalVisuals > Game.MAX_VISUALS) {
      if (this.waves.length > 0) {
        this.waves.shift();
      } else if (this.particles.length > 0) {
        this.particles.shift();
      } else {
        for (const piece of this.pieces) {
          if (piece.trail.length > 0) {
            piece.trail.shift();
            break;
          }
        }
      }
      totalVisuals--;
    }
  }

  private updateUI(): void {
    if (this.scoreElement) {
      this.scoreElement.textContent = `得分: ${this.score}`;
    }
    if (this.pieceCountElement) {
      this.pieceCountElement.textContent = `棋子: ${this.pieces.length} / ${Game.MAX_PIECES}`;
    }
  }

  public start(): void {
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private gameLoop(): void {
    const currentTime = performance.now();
    const deltaTime = Math.min(currentTime - this.lastTime, 50);
    this.lastTime = currentTime;

    this.update(deltaTime, currentTime);
    this.render(currentTime);

    this.animationId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  private update(deltaTime: number, currentTime: number): void {
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const piece = this.pieces[i];
      const result = piece.update(deltaTime, currentTime, this.board);

      if (result.bounced) {
        audioManager.playBounceSound();
      }

      if (result.waves.length > 0) {
        this.waves.push(...result.waves);
        this.enforceVisualLimits();
      }
    }

    this.waves = this.waves.filter(w => currentTime - w.startTime < w.duration);
    this.particles = this.particles.filter(p => currentTime - p.startTime < p.duration);

    for (const particle of this.particles) {
      const progress = (currentTime - particle.startTime) / particle.duration;
      particle.x += particle.vx * (deltaTime / 1000) * (1 - progress * 0.5);
      particle.y += particle.vy * (deltaTime / 1000) * (1 - progress * 0.5);
      particle.rotation += particle.rotationSpeed * (deltaTime / 1000);
    }

    this.checkPieceCollisions();
    this.enforceVisualLimits();
  }

  private checkPieceCollisions(): void {
    for (let i = 0; i < this.pieces.length; i++) {
      for (let j = i + 1; j < this.pieces.length; j++) {
        const p1 = this.pieces[i];
        const p2 = this.pieces[j];
        
        if (!p1.moving && !p2.moving) continue;

        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (dist < 20) {
          if (p1.moving && p2.moving) {
            [p1.velocityX, p2.velocityX] = [p2.velocityX, p1.velocityX];
            [p1.velocityY, p2.velocityY] = [p2.velocityY, p1.velocityY];
            audioManager.playBounceSound();
          } else if (p1.moving) {
            p1.velocityX *= -1;
            p1.velocityY *= -1;
            audioManager.playBounceSound();
          } else {
            p2.velocityX *= -1;
            p2.velocityY *= -1;
            audioManager.playBounceSound();
          }
        }
      }
    }
  }

  private render(currentTime: number): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.board.draw();
    this.drawWaves(currentTime);
    this.drawParticles(currentTime);

    const sortedPieces = [...this.pieces].sort((a, b) => {
      if (this.draggingPiece === a) return 1;
      if (this.draggingPiece === b) return -1;
      return a.y - b.y;
    });

    for (const piece of sortedPieces) {
      piece.draw(this.ctx, currentTime);
    }
  }

  private drawWaves(currentTime: number): void {
    for (const wave of this.waves) {
      const progress = (currentTime - wave.startTime) / wave.duration;
      const radius = 5 + progress * 35;
      const alpha = 1 - progress;

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(wave.x, wave.y, radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = this.hexToRgba(wave.color, alpha * 0.8);
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  private drawParticles(currentTime: number): void {
    for (const particle of this.particles) {
      const progress = (currentTime - particle.startTime) / particle.duration;
      const alpha = 1 - progress;
      const size = 4 * (1 - progress * 0.5);

      this.ctx.save();
      this.ctx.translate(particle.x, particle.y);
      this.ctx.rotate(particle.rotation);
      this.ctx.fillStyle = this.hexToRgba(particle.color, alpha);
      this.ctx.shadowColor = particle.color;
      this.ctx.shadowBlur = 10;
      
      this.ctx.beginPath();
      this.ctx.moveTo(0, -size);
      this.ctx.lineTo(size * 0.5, 0);
      this.ctx.lineTo(0, size);
      this.ctx.lineTo(-size * 0.5, 0);
      this.ctx.closePath();
      this.ctx.fill();
      
      this.ctx.restore();
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  public destroy(): void {
    cancelAnimationFrame(this.animationId);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
