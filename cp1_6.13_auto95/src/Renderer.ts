import { DataManager, PuzzlePiece, Particle, Season } from './DataManager';

const SEASON_COLORS: Record<Season, { primary: string; secondary: string; bg1: string; bg2: string }> = {
  spring: {
    primary: '#FF69B4',
    secondary: '#FFB6C1',
    bg1: '#FFF0F5',
    bg2: '#FFE4E1'
  },
  summer: {
    primary: '#228B22',
    secondary: '#90EE90',
    bg1: '#F0FFF0',
    bg2: '#E0FFE0'
  },
  autumn: {
    primary: '#FF6347',
    secondary: '#FFA500',
    bg1: '#FFF5EE',
    bg2: '#FFEFD5'
  },
  winter: {
    primary: '#708090',
    secondary: '#E0FFFF',
    bg1: '#F0F8FF',
    bg2: '#E6E6FA'
  }
};

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dataManager: DataManager;
  private width: number;
  private height: number;
  private flashEffects: { x: number; y: number; startTime: number; duration: number }[] = [];

  constructor(canvas: HTMLCanvasElement, dataManager: DataManager, width: number, height: number) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dataManager = dataManager;
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  addFlashEffect(x: number, y: number): void {
    this.flashEffects.push({
      x,
      y,
      startTime: performance.now(),
      duration: 200
    });
  }

  render(): void {
    const ctx = this.ctx;
    const opacity = this.dataManager.getOpacity();
    const isComplete = this.dataManager.isComplete();

    ctx.clearRect(0, 0, this.width, this.height);
    ctx.save();
    ctx.globalAlpha = opacity;

    this.drawScrollBackground();

    if (isComplete) {
      this.drawCompleteScroll();
    } else {
      this.drawPieces();
    }

    this.drawFlashEffects();
    this.drawParticles();

    if (isComplete) {
      this.drawGoldenGlow();
    }

    ctx.restore();
  }

  private drawScrollBackground(): void {
    const ctx = this.ctx;
    const isComplete = this.dataManager.isComplete();
    const currentSeason = this.dataManager.getCurrentSeason();
    const colors = SEASON_COLORS[currentSeason];

    if (isComplete) {
      const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
      gradient.addColorStop(0, colors.bg1);
      gradient.addColorStop(1, colors.bg2);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.width, this.height);
    } else {
      ctx.fillStyle = '#FAF3E3';
      ctx.fillRect(0, 0, this.width, this.height);

      this.drawPaperTexture();
    }
  }

  private drawPaperTexture(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.03;

    for (let i = 0; i < 200; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const size = Math.random() * 2;
      ctx.fillStyle = '#8B7355';
      ctx.fillRect(x, y, size, size);
    }

    ctx.restore();
  }

  private drawPieces(): void {
    const pieces = [...this.dataManager.getPieces()].sort((a, b) => a.zIndex - b.zIndex);

    for (const piece of pieces) {
      this.drawPiece(piece);
    }
  }

  private drawPiece(piece: PuzzlePiece): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(piece.currentX, piece.currentY);
    ctx.rotate((piece.currentRotation * Math.PI) / 180);

    const halfW = piece.width / 2;
    const halfH = piece.height / 2;

    ctx.save();
    this.clipPuzzleShape(halfW, halfH);

    this.drawPieceBack(halfW, halfH);

    if (!piece.isPlaced && !piece.isSnapping) {
      if (Math.abs(piece.currentRotation) > 90) {
        this.drawPieceBackPattern(halfW, halfH);
      } else {
        this.drawPieceFront(piece);
      }
    } else {
      this.drawPieceFront(piece);
    }

    ctx.restore();

    this.drawPieceBorder(halfW, halfH);

    ctx.restore();
  }

  private clipPuzzleShape(halfW: number, halfH: number): void {
    const ctx = this.ctx;
    const notchSize = Math.min(halfW, halfH) * 0.15;

    ctx.beginPath();

    ctx.moveTo(-halfW, -halfH + notchSize);

    this.drawNotch(-halfW, -halfH + notchSize, -halfW, -halfH, notchSize, 'left', 'top');
    this.drawNotch(-halfW, -halfH, halfW, -halfH, notchSize, 'top', 'right');
    this.drawNotch(halfW, -halfH, halfW, halfH, notchSize, 'right', 'bottom');
    this.drawNotch(halfW, halfH, -halfW, halfH, notchSize, 'bottom', 'left');

    ctx.closePath();
    ctx.clip();
  }

  private drawNotch(x1: number, y1: number, x2: number, y2: number, size: number, _side: string, _nextSide: string): void {
    const ctx = this.ctx;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / length;
    const ny = dx / length;

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    const isOuter = Math.random() > 0.5;
    const direction = isOuter ? 1 : -1;

    ctx.lineTo(x1, y1);

    const cp1x = midX - dx * 0.2 + nx * size * direction * 0.3;
    const cp1y = midY - dy * 0.2 + ny * size * direction * 0.3;
    const cp2x = midX - dx * 0.15 + nx * size * direction;
    const cp2y = midY - dy * 0.15 + ny * size * direction;
    const midNx = midX + nx * size * direction;
    const midNy = midY + ny * size * direction;
    const cp3x = midX + dx * 0.15 + nx * size * direction;
    const cp3y = midY + dy * 0.15 + ny * size * direction;
    const cp4x = midX + dx * 0.2 + nx * size * direction * 0.3;
    const cp4y = midY + dy * 0.2 + ny * size * direction * 0.3;

    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, midNx, midNy);
    ctx.bezierCurveTo(cp3x, cp3y, cp4x, cp4y, x2, y2);
  }

  private drawPieceBack(halfW: number, halfH: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#C5D5C5';
    ctx.fillRect(-halfW - 5, -halfH - 5, halfW * 2 + 10, halfH * 2 + 10);
  }

  private drawPieceBackPattern(halfW: number, halfH: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.15;

    const stripeWidth = 8;
    for (let x = -halfW; x < halfW; x += stripeWidth * 2) {
      ctx.fillStyle = '#8FA89C';
      ctx.fillRect(x, -halfH, stripeWidth, halfH * 2);
    }

    ctx.restore();
  }

  private drawPieceFront(piece: PuzzlePiece): void {
    const ctx = this.ctx;
    const halfW = piece.width / 2;
    const halfH = piece.height / 2;
    const colors = SEASON_COLORS[piece.season];

    const gradient = ctx.createLinearGradient(0, -halfH, 0, halfH);
    gradient.addColorStop(0, colors.bg1);
    gradient.addColorStop(1, colors.bg2);
    ctx.fillStyle = gradient;
    ctx.fillRect(-halfW, -halfH, halfW * 2, halfH * 2);

    this.drawSeasonElement(piece.season, -halfW, -halfH, halfW * 2, halfH * 2, piece.gridX, piece.gridY);
  }

  private drawSeasonElement(season: Season, x: number, y: number, w: number, h: number, gridX: number, gridY: number): void {
    const colors = SEASON_COLORS[season];

    switch (season) {
      case 'spring':
        this.drawCherryBlossom(x, y, w, h, colors, gridX, gridY);
        break;
      case 'summer':
        this.drawLotusPond(x, y, w, h, colors, gridX, gridY);
        break;
      case 'autumn':
        this.drawMapleLeaves(x, y, w, h, colors, gridX, gridY);
        break;
      case 'winter':
        this.drawSnowBranches(x, y, w, h, colors, gridX, gridY);
        break;
    }
  }

  private drawCherryBlossom(x: number, y: number, w: number, h: number, colors: { primary: string; secondary: string }, gridX: number, _gridY: number): void {
    const ctx = this.ctx;

    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const trunkX = x + w * 0.3;
    ctx.moveTo(trunkX, y + h);
    ctx.quadraticCurveTo(trunkX - 10, y + h * 0.6, trunkX + 5, y + h * 0.3);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(trunkX + 5, y + h * 0.4);
    ctx.quadraticCurveTo(trunkX + w * 0.2, y + h * 0.35, trunkX + w * 0.4, y + h * 0.2);
    ctx.stroke();

    const blossomCount = 8 + gridX * 3;
    for (let i = 0; i < blossomCount; i++) {
      const bx = x + w * (0.2 + Math.random() * 0.7);
      const by = y + h * (0.1 + Math.random() * 0.5);
      const size = 6 + Math.random() * 8;
      this.drawFlower(bx, by, size, colors.primary, colors.secondary);
    }

    for (let i = 0; i < 5; i++) {
      const px = x + Math.random() * w;
      const py = y + Math.random() * h;
      const size = 3 + Math.random() * 4;
      ctx.fillStyle = colors.primary;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private drawFlower(cx: number, cy: number, size: number, _primary: string, secondary: string): void {
    const ctx = this.ctx;
    const petals = 5;

    for (let i = 0; i < petals; i++) {
      const angle = (i / petals) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(angle) * size * 0.5;
      const py = cy + Math.sin(angle) * size * 0.5;

      ctx.fillStyle = secondary;
      ctx.beginPath();
      ctx.ellipse(px, py, size * 0.4, size * 0.6, angle, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawLotusPond(x: number, y: number, w: number, h: number, colors: { primary: string; secondary: string }, gridX: number, gridY: number): void {
    const ctx = this.ctx;

    const gradient = ctx.createLinearGradient(x, y, x, y + h);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#4682B4');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y + h * 0.4, w, h * 0.6);

    const leafCount = 4 + gridX;
    for (let i = 0; i < leafCount; i++) {
      const lx = x + w * (0.1 + (i / leafCount) * 0.8);
      const ly = y + h * (0.5 + Math.random() * 0.35);
      const size = 15 + Math.random() * 20;
      this.drawLotusLeaf(lx, ly, size, colors.secondary, colors.primary);
    }

    if (gridY === 0 || gridX === 2) {
      const fx = x + w * 0.6;
      const fy = y + h * 0.55;
      this.drawLotusFlower(fx, fy, 12);
    }
  }

  private drawLotusLeaf(cx: number, cy: number, size: number, color: string, border: string): void {
    const ctx = this.ctx;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy, size, size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = border;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.8, cy);
    ctx.lineTo(cx + size * 0.8, cy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.4);
    ctx.lineTo(cx, cy + size * 0.4);
    ctx.stroke();
  }

  private drawLotusFlower(cx: number, cy: number, size: number): void {
    const ctx = this.ctx;

    ctx.fillStyle = '#FFB6C1';
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(angle) * size * 0.4;
      const py = cy + Math.sin(angle) * size * 0.3;

      ctx.beginPath();
      ctx.ellipse(px, py - size * 0.2, size * 0.35, size * 0.5, angle, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawMapleLeaves(x: number, y: number, w: number, h: number, colors: { primary: string; secondary: string }, _gridX: number, gridY: number): void {
    const ctx = this.ctx;

    ctx.fillStyle = '#F5DEB3';
    ctx.fillRect(x, y + h * 0.6, w, h * 0.4);

    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 2;
    const branchX = x + w * 0.7;
    ctx.beginPath();
    ctx.moveTo(branchX, y + h * 0.1);
    ctx.quadraticCurveTo(branchX - 20, y + h * 0.4, branchX - 10, y + h * 0.7);
    ctx.stroke();

    const leafCount = 6 + gridY * 2;
    for (let i = 0; i < leafCount; i++) {
      const lx = x + w * (0.3 + Math.random() * 0.6);
      const ly = y + h * (0.15 + Math.random() * 0.5);
      const size = 10 + Math.random() * 12;
      const rot = Math.random() * Math.PI;
      const color = Math.random() > 0.5 ? colors.primary : colors.secondary;
      this.drawMapleLeaf(lx, ly, size, rot, color);
    }

    for (let i = 0; i < 4; i++) {
      const fx = x + Math.random() * w;
      const fy = y + h * 0.8 + Math.random() * h * 0.15;
      const size = 5 + Math.random() * 6;
      ctx.fillStyle = colors.primary;
      ctx.globalAlpha = 0.5;
      this.drawMapleLeaf(fx, fy, size, Math.random() * Math.PI, colors.primary);
      ctx.globalAlpha = 1;
    }
  }

  private drawMapleLeaf(cx: number, cy: number, size: number, rotation: number, color: string): void {
    const ctx = this.ctx;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    ctx.fillStyle = color;

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.save();
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-size * 0.3, -size * 0.5);
      ctx.lineTo(0, -size);
      ctx.lineTo(size * 0.3, -size * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-1, 0, 2, size * 0.4);

    ctx.restore();
  }

  private drawSnowBranches(x: number, y: number, w: number, h: number, _colors: { primary: string; secondary: string }, gridX: number, _gridY: number): void {
    const ctx = this.ctx;

    const gradient = ctx.createLinearGradient(x, y, x, y + h);
    gradient.addColorStop(0, '#B0C4DE');
    gradient.addColorStop(1, '#708090');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y + h * 0.85, w, h * 0.15);

    ctx.strokeStyle = '#4A4A4A';
    ctx.lineWidth = 3;
    const treeX = x + w * 0.5;
    ctx.beginPath();
    ctx.moveTo(treeX, y + h * 0.85);
    ctx.lineTo(treeX, y + h * 0.3);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(treeX, y + h * 0.5);
    ctx.lineTo(treeX - w * 0.2, y + h * 0.35);
    ctx.moveTo(treeX, y + h * 0.4);
    ctx.lineTo(treeX + w * 0.25, y + h * 0.25);
    ctx.moveTo(treeX, y + h * 0.6);
    ctx.lineTo(treeX - w * 0.15, y + h * 0.5);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(treeX - w * 0.2, y + h * 0.33, 8, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(treeX + w * 0.25, y + h * 0.23, 10, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();

    const snowCount = 10 + gridX * 3;
    for (let i = 0; i < snowCount; i++) {
      const sx = x + Math.random() * w;
      const sy = y + Math.random() * h * 0.8;
      const size = 2 + Math.random() * 3;
      ctx.fillStyle = '#FFFFFF';
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private drawPieceBorder(halfW: number, halfH: number): void {
    const ctx = this.ctx;
    ctx.save();

    const notchSize = Math.min(halfW, halfH) * 0.15;

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    this.drawNotch(-halfW, -halfH + notchSize, -halfW, -halfH, notchSize, 'left', 'top');
    this.drawNotch(-halfW, -halfH, halfW, -halfH, notchSize, 'top', 'right');
    this.drawNotch(halfW, -halfH, halfW, halfH, notchSize, 'right', 'bottom');
    this.drawNotch(halfW, halfH, -halfW, halfH, notchSize, 'bottom', 'left');
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }

  private drawCompleteScroll(): void {
    const ctx = this.ctx;
    const progress = this.dataManager.getCompleteProgress();
    const highlightSeason = this.dataManager.getHighlightSeason();
    const highlightProgress = this.dataManager.getHighlightProgress();

    const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
    const cols = 4;
    const rows = 3;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const season = seasons[col];
        const pieceW = this.width / cols;
        const pieceH = this.height / rows;
        const px = col * pieceW;
        const py = row * pieceH;

        const seasonProgress = this.getSeasonRevealProgress(progress, col);

        if (seasonProgress > 0) {
          ctx.save();

          const centerX = px + pieceW / 2;
          const centerY = py + pieceH / 2;
          const radius = Math.sqrt(pieceW * pieceW + pieceH * pieceH) / 2 * seasonProgress;

          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.clip();

          this.drawSeasonElement(season, px, py, pieceW, pieceH, col, row);

          if (highlightSeason === season && highlightProgress > 0) {
            const hlRadius = Math.min(pieceW, pieceH) * 0.7 * highlightProgress;
            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, hlRadius);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
            gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(px, py, pieceW, pieceH);

            const scale = 1 + 0.1 * highlightProgress;
            ctx.translate(centerX, centerY);
            ctx.scale(scale, scale);
            ctx.translate(-centerX, -centerY);
          }

          ctx.restore();
        }
      }
    }
  }

  private getSeasonRevealProgress(totalProgress: number, seasonIndex: number): number {
    const seasonCount = 4;
    const perSeason = 1 / seasonCount;
    const seasonStart = seasonIndex * perSeason;
    const seasonEnd = (seasonIndex + 1) * perSeason;

    if (totalProgress <= seasonStart) return 0;
    if (totalProgress >= seasonEnd) return 1;

    return (totalProgress - seasonStart) / perSeason;
  }

  private drawFlashEffects(): void {
    const ctx = this.ctx;
    const now = performance.now();

    this.flashEffects = this.flashEffects.filter(flash => {
      const elapsed = now - flash.startTime;
      if (elapsed >= flash.duration) return false;

      const t = elapsed / flash.duration;
      const scale = 1 + t;
      const alpha = 1 - t;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(flash.x, flash.y, 25 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      return true;
    });
  }

  private drawParticles(): void {
    const particles = this.dataManager.getParticles();

    for (const particle of particles) {
      this.drawParticle(particle);
    }
  }

  private drawParticle(particle: Particle): void {
    const ctx = this.ctx;
    const colors = SEASON_COLORS[particle.season];

    ctx.save();
    ctx.globalAlpha = particle.opacity;
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.rotation);

    switch (particle.type) {
      case 'petal':
        ctx.fillStyle = colors.primary;
        ctx.beginPath();
        ctx.ellipse(0, 0, particle.size, particle.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'leaf':
        ctx.fillStyle = colors.secondary;
        ctx.beginPath();
        ctx.ellipse(0, 0, particle.size, particle.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-particle.size * 0.8, 0);
        ctx.lineTo(particle.size * 0.8, 0);
        ctx.stroke();
        break;

      case 'maple':
        this.drawMapleLeaf(0, 0, particle.size, 0, colors.primary);
        break;

      case 'snow':
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 0.5;
        this.drawSnowflake(0, 0, particle.size);
        break;
    }

    ctx.restore();
  }

  private drawSnowflake(cx: number, cy: number, size: number): void {
    const ctx = this.ctx;
    const arms = 6;

    for (let i = 0; i < arms; i++) {
      const angle = (i / arms) * Math.PI * 2;
      const ex = cx + Math.cos(angle) * size;
      const ey = cy + Math.sin(angle) * size;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      const midX = cx + Math.cos(angle) * size * 0.5;
      const midY = cy + Math.sin(angle) * size * 0.5;
      const perpAngle = angle + Math.PI / 2;

      ctx.beginPath();
      ctx.moveTo(midX, midY);
      ctx.lineTo(
        midX + Math.cos(perpAngle) * size * 0.3,
        midY + Math.sin(perpAngle) * size * 0.3
      );
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(midX, midY);
      ctx.lineTo(
        midX - Math.cos(perpAngle) * size * 0.3,
        midY - Math.sin(perpAngle) * size * 0.3
      );
      ctx.stroke();
    }
  }

  private drawGoldenGlow(): void {
    const ctx = this.ctx;
    const progress = this.dataManager.getGoldenGlowProgress();

    if (progress >= 1) return;

    ctx.save();

    const glowAlpha = progress < 0.5
      ? progress * 2
      : (1 - progress) * 2;

    const gradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, this.width * 0.7
    );
    gradient.addColorStop(0, `rgba(255, 215, 0, ${0.6 * glowAlpha})`);
    gradient.addColorStop(0.5, `rgba(255, 215, 0, ${0.3 * glowAlpha})`);
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');

    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.restore();
  }

  updateParticles(deltaTime: number): void {
    const particles = this.dataManager.getParticles();
    const toRemove: number[] = [];

    for (const particle of particles) {
      particle.x += particle.vx * deltaTime * 0.06;
      particle.y += particle.vy * deltaTime * 0.06;
      particle.rotation += particle.rotationSpeed * deltaTime * 0.003;
      particle.life += deltaTime;

      if (particle.life >= particle.maxLife) {
        const fadeStart = particle.maxLife * 0.8;
        if (particle.life > fadeStart) {
          particle.opacity = 1 - (particle.life - fadeStart) / (particle.maxLife - fadeStart);
        }
      }

      if (particle.life >= particle.maxLife ||
          particle.y > this.height + 50 ||
          particle.y < -50 ||
          particle.x < -50 ||
          particle.x > this.width + 50) {
        toRemove.push(particle.id);
      }
    }

    for (const id of toRemove) {
      this.dataManager.removeParticle(id);
    }
  }

  spawnParticle(season: Season): void {
    const type = this.getParticleTypeForSeason(season);
    const size = this.getParticleSize(season);
    const { x, y, vx, vy, maxLife } = this.getParticleSpawnParams(season);

    this.dataManager.addParticle({
      x,
      y,
      vx,
      vy,
      size,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 2,
      opacity: 1,
      life: 0,
      maxLife,
      season,
      type
    });
  }

  private getParticleTypeForSeason(season: Season): Particle['type'] {
    switch (season) {
      case 'spring': return 'petal';
      case 'summer': return 'leaf';
      case 'autumn': return 'maple';
      case 'winter': return 'snow';
    }
  }

  private getParticleSize(season: Season): number {
    switch (season) {
      case 'spring': return 10 + Math.random() * 5;
      case 'summer': return 10 + Math.random() * 7;
      case 'autumn': return 12 + Math.random() * 5;
      case 'winter': return 5 + Math.random() * 4;
    }
  }

  private getParticleSpawnParams(season: Season): { x: number; y: number; vx: number; vy: number; maxLife: number } {
    switch (season) {
      case 'spring':
        return {
          x: Math.random() * this.width,
          y: -20,
          vx: (Math.random() - 0.5) * 20,
          vy: 30 + Math.random() * 20,
          maxLife: 5000 + Math.random() * 2000
        };
      case 'summer':
        return {
          x: Math.random() * this.width,
          y: this.height + 20,
          vx: (Math.random() - 0.5) * 10,
          vy: -(25 + Math.random() * 15),
          maxLife: 6000 + Math.random() * 2000
        };
      case 'autumn':
        return {
          x: this.width + 20,
          y: Math.random() * this.height * 0.7,
          vx: -(60 + Math.random() * 30),
          vy: 40 + Math.random() * 20,
          maxLife: 3500 + Math.random() * 1000
        };
      case 'winter':
        return {
          x: Math.random() * this.width,
          y: -20,
          vx: (Math.random() - 0.5) * 10,
          vy: 40 + Math.random() * 20,
          maxLife: 3000 + Math.random() * 2000
        };
    }
  }

  fadeOutParticles(deltaTime: number): boolean {
    const particles = this.dataManager.getParticles();
    if (particles.length === 0) return true;

    const fadeSpeed = deltaTime / 800;

    for (const particle of particles) {
      particle.opacity = Math.max(0, particle.opacity - fadeSpeed);
    }

    this.dataManager.getParticles().filter(p => p.opacity <= 0).forEach(p => {
      this.dataManager.removeParticle(p.id);
    });

    return this.dataManager.getParticles().length === 0;
  }

  getSeasonColors(season: Season): typeof SEASON_COLORS.spring {
    return SEASON_COLORS[season];
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }
}
