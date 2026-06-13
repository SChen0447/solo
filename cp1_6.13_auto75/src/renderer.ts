import { GameState, Piece, Position, AttackEffect, Footprint } from './gameState';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'spark' | 'rain' | 'footprint';
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private gameState: GameState;
  private cellSize: number = 80;
  private boardOffsetX: number = 0;
  private boardOffsetY: number = 0;
  private borderWidth: number = 10;
  private particles: Particle[] = [];
  private readonly maxParticles: number = 50;
  private hoveredCell: Position | null = null;
  private animationTime: number = 0;
  private deadCells: Set<string> = new Set();

  constructor(canvas: HTMLCanvasElement, gameState: GameState) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.gameState = gameState;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const isSmallScreen = window.innerWidth < 768;
    this.cellSize = isSmallScreen ? 60 : 80;
    
    const boardSize = this.gameState.getBoardSize() * this.cellSize;
    const totalSize = boardSize + this.borderWidth * 2;
    
    this.canvas.width = totalSize;
    this.canvas.height = totalSize;
    
    this.boardOffsetX = this.borderWidth;
    this.boardOffsetY = this.borderWidth;
  }

  setHoveredCell(cell: Position | null): void {
    this.hoveredCell = cell;
  }

  getCellSize(): number {
    return this.cellSize;
  }

  getBoardOffsetX(): number {
    return this.boardOffsetX;
  }

  getBoardOffsetY(): number {
    return this.boardOffsetY;
  }

  screenToBoard(screenX: number, screenY: number): Position | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = screenX - rect.left - this.boardOffsetX;
    const y = screenY - rect.top - this.boardOffsetY;
    
    if (x < 0 || y < 0 || x >= this.gameState.getBoardSize() * this.cellSize || y >= this.gameState.getBoardSize() * this.cellSize) {
      return null;
    }
    
    return {
      row: Math.floor(y / this.cellSize),
      col: Math.floor(x / this.cellSize)
    };
  }

  render(deltaTime: number): void {
    this.animationTime += deltaTime;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.drawBorder();
    this.drawBoard();
    this.drawDeadCells();
    this.drawValidMoves();
    this.drawHoverHint();
    this.drawFootprints();
    this.drawPieces();
    this.drawRevealedPieces();
    this.drawSelectedPiece();
    this.drawAttackEffects();
    this.updateAndDrawParticles(deltaTime);
  }

  private drawBorder(): void {
    const { width, height } = this.canvas;
    
    const gradient = this.ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#3E2723');
    gradient.addColorStop(0.3, '#8D6E63');
    gradient.addColorStop(0.5, '#B8860B');
    gradient.addColorStop(0.7, '#8D6E63');
    gradient.addColorStop(1, '#3E2723');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);
    
    const innerGradient = this.ctx.createLinearGradient(0, 0, width, 0);
    innerGradient.addColorStop(0, '#5D4037');
    innerGradient.addColorStop(0.5, '#8D6E63');
    innerGradient.addColorStop(1, '#5D4037');
    
    this.ctx.strokeStyle = innerGradient;
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(
      this.borderWidth / 2,
      this.borderWidth / 2,
      width - this.borderWidth,
      height - this.borderWidth
    );
    
    this.ctx.fillStyle = 'rgba(255, 213, 79, 0.1)';
    for (let i = 0; i < width; i += 30) {
      this.ctx.fillRect(i, 0, 15, 3);
      this.ctx.fillRect(i, height - 3, 15, 3);
    }
  }

  private drawBoard(): void {
    const boardSize = this.gameState.getBoardSize();
    
    this.ctx.fillStyle = '#3E2723';
    this.ctx.fillRect(
      this.boardOffsetX,
      this.boardOffsetY,
      boardSize * this.cellSize,
      boardSize * this.cellSize
    );
    
    this.ctx.strokeStyle = '#FFD54F';
    this.ctx.lineWidth = 1;
    
    for (let i = 0; i <= boardSize; i++) {
      const x = this.boardOffsetX + i * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(x, this.boardOffsetY);
      this.ctx.lineTo(x, this.boardOffsetY + boardSize * this.cellSize);
      this.ctx.stroke();
      
      const y = this.boardOffsetY + i * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(this.boardOffsetX, y);
      this.ctx.lineTo(this.boardOffsetX + boardSize * this.cellSize, y);
      this.ctx.stroke();
    }
  }

  private drawDeadCells(): void {
    this.deadCells.forEach(key => {
      const [row, col] = key.split(',').map(Number);
      const x = this.boardOffsetX + col * this.cellSize;
      const y = this.boardOffsetY + row * this.cellSize;
      
      this.ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
      this.ctx.fillRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);
    });
  }

  addDeadCell(row: number, col: number): void {
    this.deadCells.add(`${row},${col}`);
  }

  clearDeadCells(): void {
    this.deadCells.clear();
  }

  private drawValidMoves(): void {
    const selectedPiece = this.gameState.getSelectedPiece();
    if (!selectedPiece) return;
    
    const validMoves = this.gameState.getValidMoves(selectedPiece);
    
    validMoves.forEach(move => {
      const x = this.boardOffsetX + move.col * this.cellSize;
      const y = this.boardOffsetY + move.row * this.cellSize;
      
      this.ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
      this.ctx.fillRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);
      
      this.ctx.strokeStyle = 'rgba(76, 175, 80, 0.6)';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x + 3, y + 3, this.cellSize - 6, this.cellSize - 6);
    });
  }

  private drawHoverHint(): void {
    if (!this.hoveredCell) return;
    
    const { row, col } = this.hoveredCell;
    const piece = this.gameState.getPieceAt(row, col);
    const currentPlayer = this.gameState.getCurrentPlayer();
    
    if (piece && piece.owner === currentPlayer && piece.alive) {
      const x = this.boardOffsetX + col * this.cellSize + this.cellSize / 2;
      const y = this.boardOffsetY + row * this.cellSize + this.cellSize / 2;
      
      const pulse = Math.sin(this.animationTime * Math.PI * 2) * 0.3 + 0.7;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, 40 * (this.cellSize / 80), 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(100, 181, 246, ${0.4 * pulse})`;
      this.ctx.fill();
      
      this.ctx.strokeStyle = `rgba(100, 181, 246, ${0.8 * pulse})`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  }

  private drawFootprints(): void {
    const footprints = this.gameState.getFootprints();
    
    footprints.forEach(footprint => {
      this.drawFootprint(footprint);
    });
  }

  private drawFootprint(footprint: Footprint): void {
    const progress = (Date.now() - footprint.startTime) / footprint.duration;
    const alpha = 1 - progress;
    
    const x = this.boardOffsetX + footprint.col * this.cellSize + this.cellSize / 2;
    const y = this.boardOffsetY + footprint.row * this.cellSize + this.cellSize / 2;
    
    this.ctx.save();
    this.ctx.globalAlpha = alpha * 0.8;
    this.ctx.fillStyle = '#FFFFFF';
    
    const scale = this.cellSize / 80;
    
    this.ctx.beginPath();
    this.ctx.ellipse(x - 8 * scale, y - 5 * scale, 8 * scale, 12 * scale, -0.3, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.beginPath();
    this.ctx.ellipse(x + 8 * scale, y + 5 * scale, 8 * scale, 12 * scale, 0.3, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.beginPath();
    this.ctx.arc(x - 8 * scale, y - 15 * scale, 5 * scale, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.beginPath();
    this.ctx.arc(x + 8 * scale, y - 5 * scale, 5 * scale, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.restore();
  }

  private drawPieces(): void {
    const currentPlayer = this.gameState.getCurrentPlayer();
    const boardSize = this.gameState.getBoardSize();
    
    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        const piece = this.gameState.getPieceAt(row, col);
        if (piece && piece.alive) {
          if (piece.owner === currentPlayer) {
            this.drawFriendlyPiece(piece);
          }
        }
      }
    }
  }

  private drawFriendlyPiece(piece: Piece): void {
    const x = this.boardOffsetX + piece.col * this.cellSize + this.cellSize / 2;
    const y = this.boardOffsetY + piece.row * this.cellSize + this.cellSize / 2;
    const size = this.cellSize * 0.35;
    
    const color = piece.owner === 'red' ? 'rgba(239, 83, 80, 0.6)' : 'rgba(66, 165, 245, 0.6)';
    const glowColor = piece.owner === 'red' ? 'rgba(239, 83, 80, 0.3)' : 'rgba(66, 165, 245, 0.3)';
    
    this.ctx.beginPath();
    this.ctx.arc(x, y, size + 5, 0, Math.PI * 2);
    this.ctx.fillStyle = glowColor;
    this.ctx.fill();
    
    if (piece.type === 'infantry') {
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.fill();
      this.ctx.strokeStyle = piece.owner === 'red' ? '#EF5350' : '#42A5F5';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    } else {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y - size);
      this.ctx.lineTo(x + size, y);
      this.ctx.lineTo(x, y + size);
      this.ctx.lineTo(x - size, y);
      this.ctx.closePath();
      this.ctx.fillStyle = color;
      this.ctx.fill();
      this.ctx.strokeStyle = piece.owner === 'red' ? '#EF5350' : '#42A5F5';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  }

  private drawRevealedPieces(): void {
    const revealedPieces = this.gameState.getRevealedPieces();
    
    revealedPieces.forEach(revealed => {
      const progress = (Date.now() - revealed.startTime) / revealed.duration;
      const alpha = 1 - progress * 0.5;
      
      this.drawPieceIcon(revealed.piece, alpha);
    });
  }

  private drawPieceIcon(piece: Piece, alpha: number = 1): void {
    const x = this.boardOffsetX + piece.col * this.cellSize + this.cellSize / 2;
    const y = this.boardOffsetY + piece.row * this.cellSize + this.cellSize / 2;
    const size = this.cellSize * 0.35;
    
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    
    const baseColor = piece.owner === 'red' ? '#EF5350' : '#42A5F5';
    const glowColor = piece.owner === 'red' ? 'rgba(239, 83, 80, 0.5)' : 'rgba(66, 165, 245, 0.5)';
    
    this.ctx.shadowColor = baseColor;
    this.ctx.shadowBlur = 20;
    
    if (piece.type === 'infantry') {
      this.ctx.beginPath();
      this.ctx.arc(x, y, size + 3, 0, Math.PI * 2);
      this.ctx.fillStyle = glowColor;
      this.ctx.fill();
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fillStyle = baseColor;
      this.ctx.fill();
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    } else {
      this.ctx.beginPath();
      this.ctx.moveTo(x, y - size - 3);
      this.ctx.lineTo(x + size + 3, y);
      this.ctx.lineTo(x, y + size + 3);
      this.ctx.lineTo(x - size - 3, y);
      this.ctx.closePath();
      this.ctx.fillStyle = glowColor;
      this.ctx.fill();
      
      this.ctx.beginPath();
      this.ctx.moveTo(x, y - size);
      this.ctx.lineTo(x + size, y);
      this.ctx.lineTo(x, y + size);
      this.ctx.lineTo(x - size, y);
      this.ctx.closePath();
      this.ctx.fillStyle = baseColor;
      this.ctx.fill();
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
    
    this.ctx.restore();
  }

  private drawSelectedPiece(): void {
    const selectedPiece = this.gameState.getSelectedPiece();
    if (!selectedPiece) return;
    
    const x = this.boardOffsetX + selectedPiece.col * this.cellSize;
    const y = this.boardOffsetY + selectedPiece.row * this.cellSize;
    
    const pulse = Math.sin(this.animationTime * Math.PI * 2 / 0.8) * 0.3 + 0.7;
    
    this.ctx.strokeStyle = `rgba(255, 213, 79, ${pulse})`;
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(x + 4, y + 4, this.cellSize - 8, this.cellSize - 8);
    
    this.ctx.strokeStyle = `rgba(255, 213, 79, ${pulse * 0.5})`;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2);
  }

  private drawAttackEffects(): void {
    const attackEffects = this.gameState.getAttackEffects();
    
    attackEffects.forEach(effect => {
      this.spawnAttackParticles(effect);
    });
  }

  private spawnAttackParticles(effect: AttackEffect): void {
    const x = this.boardOffsetX + effect.col * this.cellSize + this.cellSize / 2;
    const y = this.boardOffsetY + effect.row * this.cellSize + this.cellSize / 2;
    
    const progress = (Date.now() - effect.startTime) / effect.duration;
    
    if (progress < 0.1 && this.particles.filter(p => p.type === 'spark').length < 30) {
      for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        
        this.addParticle({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 300 + Math.random() * 200,
          color: Math.random() > 0.5 ? '#FFD54F' : '#FFA726',
          size: 2 + Math.random() * 3,
          type: 'spark'
        });
      }
    }
  }

  spawnVictoryParticles(): void {
    const centerX = this.canvas.width / 2;
    
    for (let i = 0; i < 20; i++) {
      setTimeout(() => {
        for (let j = 0; j < 3; j++) {
          this.addParticle({
            x: centerX + (Math.random() - 0.5) * 200,
            y: -20,
            vx: (Math.random() - 0.5) * 2,
            vy: 1 + Math.random() * 3,
            life: 0,
            maxLife: 3000 + Math.random() * 2000,
            color: ['#FFD54F', '#FFA726', '#FFE082', '#FFCC80'][Math.floor(Math.random() * 4)],
            size: 3 + Math.random() * 4,
            type: 'rain'
          });
        }
      }, i * 100);
    }
  }

  private addParticle(particle: Particle): void {
    if (this.particles.length >= this.maxParticles) {
      const sparks = this.particles.filter(p => p.type === 'spark');
      if (sparks.length > 0) {
        const index = this.particles.indexOf(sparks[0]);
        this.particles.splice(index, 1);
      } else {
        this.particles.shift();
      }
    }
    this.particles.push(particle);
  }

  private updateAndDrawParticles(deltaTime: number): void {
    this.particles = this.particles.filter(particle => {
      particle.life += deltaTime;
      if (particle.life >= particle.maxLife) return false;
      
      particle.x += particle.vx;
      particle.y += particle.vy;
      
      if (particle.type === 'rain') {
        particle.vy += 0.05;
      } else if (particle.type === 'spark') {
        particle.vx *= 0.98;
        particle.vy *= 0.98;
      }
      
      const progress = particle.life / particle.maxLife;
      const alpha = 1 - progress;
      
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      
      if (particle.type === 'spark') {
        const gradient = this.ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 2
        );
        gradient.addColorStop(0, particle.color);
        gradient.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        this.ctx.fillStyle = particle.color;
        this.ctx.shadowColor = particle.color;
        this.ctx.shadowBlur = 10;
        
        this.ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
          const outerX = particle.x + Math.cos(angle) * particle.size;
          const outerY = particle.y + Math.sin(angle) * particle.size;
          const innerAngle = angle + Math.PI / 5;
          const innerX = particle.x + Math.cos(innerAngle) * (particle.size * 0.4);
          const innerY = particle.y + Math.sin(innerAngle) * (particle.size * 0.4);
          
          if (i === 0) {
            this.ctx.moveTo(outerX, outerY);
          } else {
            this.ctx.lineTo(outerX, outerY);
          }
          this.ctx.lineTo(innerX, innerY);
        }
        this.ctx.closePath();
        this.ctx.fill();
      }
      
      this.ctx.restore();
      
      return true;
    });
  }

  clearParticles(): void {
    this.particles = [];
  }
}
