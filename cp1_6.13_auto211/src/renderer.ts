import {
  GameCore,
  GameState,
  HexCoord,
  RunePiece,
  RuneAttribute,
  RUNE_COLORS,
  RUNE_ATTRIBUTES,
  BattleInfo
} from './gameCore';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  type: 'explosion' | 'ripple' | 'trail' | 'spark';
  createdAt: number;
}

interface RippleEffect {
  x: number;
  y: number;
  startRadius: number;
  endRadius: number;
  startTime: number;
  duration: number;
  color: string;
}

interface ScreenShake {
  intensity: number;
  duration: number;
  startTime: number;
}

interface TrailPoint {
  x: number;
  y: number;
  startTime: number;
  duration: number;
  color: string;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameCore: GameCore;
  private width: number = 0;
  private height: number = 0;
  private scale: number = 1;
  private boardCenterX: number = 0;
  private boardCenterY: number = 0;
  private hexSize: number = 40;

  private particles: Particle[] = [];
  private maxParticles: number = 150;
  private ripples: RippleEffect[] = [];
  private trails: TrailPoint[] = [];
  private screenShake: ScreenShake | null = null;
  private animationTime: number = 0;
  private lastTime: number = 0;

  private hoveredHex: HexCoord | null = null;

  private clickHandlers: ((coord: HexCoord | null, piece: RunePiece | null) => void)[] = [];
  private battleClickHandlers: ((sectorIndex: number) => void)[] = [];

  constructor(canvas: HTMLCanvasElement, gameCore: GameCore) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.gameCore = gameCore;
    this.resize();
    this.setupEventListeners();
  }

  resize(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const dpr = window.devicePixelRatio || 1;
    this.width = container.clientWidth;
    this.height = container.clientHeight;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';

    const baseSize = Math.min(this.width * 0.6, this.height * 0.7);
    this.scale = baseSize / 500;
    this.hexSize = 40 * this.scale;
    this.boardCenterX = this.width / 2;
    this.boardCenterY = this.height / 2;
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('click', this.handleClick.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    window.addEventListener('resize', () => this.resize());
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const state = this.gameCore.getState();

    if (state.phase === 'battle' && state.battleInfo) {
      const sector = this.getBattleSectorAt(x, y);
      if (sector >= 0) {
        this.battleClickHandlers.forEach(h => h(sector));
        return;
      }
    }

    const coord = this.getHexAt(x, y);
    const piece = coord ? this.gameCore.getPieceAt(coord) : null;
    this.clickHandlers.forEach(h => h(coord, piece));

    if (coord && piece && piece.faction === state.currentPlayer) {
      const center = this.getHexCenter(coord);
      this.addRipple(center.x, center.y, this.hexSize * 0.6, this.hexSize * 1.5, 0.3, '#00d2ff');
      this.addScreenShake(2, 0.1);
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.hoveredHex = this.getHexAt(x, y);
  }

  onHexClick(callback: (coord: HexCoord | null, piece: RunePiece | null) => void): void {
    this.clickHandlers.push(callback);
  }

  onBattleClick(callback: (sectorIndex: number) => void): void {
    this.battleClickHandlers.push(callback);
  }

  getHexAt(x: number, y: number): HexCoord | null {
    const dx = x - this.boardCenterX;
    const dy = y - this.boardCenterY;

    const q = (2 / 3 * dx) / this.hexSize;
    const r = (-1 / 3 * dx + Math.sqrt(3) / 3 * dy) / this.hexSize;

    const rounded = this.roundHex({ q, r });
    if (GameCore.isOnBoard(rounded)) {
      return rounded;
    }
    return null;
  }

  private roundHex(coord: { q: number; r: number }): HexCoord {
    const s = -coord.q - coord.r;
    let rq = Math.round(coord.q);
    let rr = Math.round(coord.r);
    let rs = Math.round(s);

    const qDiff = Math.abs(rq - coord.q);
    const rDiff = Math.abs(rr - coord.r);
    const sDiff = Math.abs(rs - s);

    if (qDiff > rDiff && qDiff > sDiff) {
      rq = -rr - rs;
    } else if (rDiff > sDiff) {
      rr = -rq - rs;
    }

    return { q: rq, r: rr };
  }

  getHexCenter(coord: HexCoord): { x: number; y: number } {
    return GameCore.getHexCenter(coord, this.boardCenterX, this.boardCenterY, this.hexSize);
  }

  private getBattleSectorAt(x: number, y: number): number {
    const state = this.gameCore.getState();
    if (!state.battleInfo) return -1;

    const battleDiskRadius = 60 * this.scale;
    const cx = this.boardCenterX;
    const cy = this.boardCenterY;

    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > battleDiskRadius || dist < 10) return -1;

    let angle = Math.atan2(dy, dx);
    if (angle < 0) angle += Math.PI * 2;

    const sectorAngle = (Math.PI * 2) / 8;
    const sectorIndex = Math.floor((angle + sectorAngle / 2) / sectorAngle) % 8;

    return sectorIndex;
  }

  render(time: number): void {
    const deltaTime = time - this.lastTime;
    this.lastTime = time;
    this.animationTime = time / 1000;

    this.updateParticles(deltaTime);
    this.updateRipples(deltaTime);
    this.updateTrails(deltaTime);

    this.ctx.save();

    if (this.screenShake) {
      const elapsed = time - this.screenShake.startTime;
      if (elapsed < this.screenShake.duration) {
        const progress = elapsed / this.screenShake.duration;
        const intensity = this.screenShake.intensity * (1 - progress);
        const shakeX = (Math.random() - 0.5) * intensity * 2;
        const shakeY = (Math.random() - 0.5) * intensity * 2;
        this.ctx.translate(shakeX, shakeY);
      } else {
        this.screenShake = null;
      }
    }

    this.drawBackground();
    this.drawBoard();
    this.drawValidMoves();
    this.drawPieces(time);
    this.drawParticles();
    this.drawRipples();
    this.drawTrails();
    this.drawUI(time);
    this.drawBattleDisk(time);

    this.ctx.restore();
  }

  private drawBackground(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0d0f1e');
    gradient.addColorStop(1, '#1a1c3a');

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawBoard(): void {
    const allCoords = GameCore.getAllHexCoords();
    const borderPulse = (Math.sin(this.animationTime * Math.PI) + 1) / 2;

    for (let layer = 2; layer >= 0; layer--) {
      this.ctx.strokeStyle = `rgba(0, 210, 255, ${0.15 + borderPulse * 0.2 + layer * 0.1})`;
      this.ctx.lineWidth = (3 - layer) * 2 + 1;
      this.ctx.shadowColor = '#00d2ff';
      this.ctx.shadowBlur = (3 - layer) * 8 + borderPulse * 10;

      allCoords.forEach(coord => {
        this.drawHexagon(coord, this.hexSize + layer * 4 + borderPulse * 2, false);
      });

      this.ctx.shadowBlur = 0;
    }

    allCoords.forEach(coord => {
      const isHovered = this.hoveredHex && this.hoveredHex.q === coord.q && this.hoveredHex.r === coord.r;

      const gradient = this.ctx.createRadialGradient(
        this.boardCenterX, this.boardCenterY, 0,
        this.boardCenterX, this.boardCenterY, this.hexSize * 4
      );
      gradient.addColorStop(0, '#161c3a');
      gradient.addColorStop(1, '#0b0f24');

      if (isHovered) {
        this.ctx.fillStyle = 'rgba(0, 210, 255, 0.15)';
      } else {
        this.ctx.fillStyle = gradient;
      }

      this.drawHexagon(coord, this.hexSize * 0.92, true);

      this.ctx.strokeStyle = 'rgba(0, 150, 200, 0.3)';
      this.ctx.lineWidth = 1;
      this.drawHexagon(coord, this.hexSize * 0.92, false);
    });
  }

  private drawHexagon(coord: HexCoord, size: number, fill: boolean): void {
    const center = this.getHexCenter(coord);

    this.ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const x = center.x + size * Math.cos(angle);
      const y = center.y + size * Math.sin(angle);
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.closePath();

    if (fill) {
      this.ctx.fill();
    } else {
      this.ctx.stroke();
    }
  }

  private drawValidMoves(): void {
    const state = this.gameCore.getState();
    if (!state.selectedPieceId) return;

    const validMoves = this.gameCore.getValidMoves();
    const pulse = (Math.sin(this.animationTime * 4) + 1) / 2;

    validMoves.forEach(coord => {
      const center = this.getHexCenter(coord);
      const piece = this.gameCore.getPieceAt(coord);

      if (piece && piece.faction !== state.currentPlayer) {
        this.ctx.strokeStyle = `rgba(255, 107, 53, ${0.6 + pulse * 0.4})`;
        this.ctx.lineWidth = 3;
        this.ctx.shadowColor = '#ff6b35';
        this.ctx.shadowBlur = 10 + pulse * 5;
      } else {
        this.ctx.strokeStyle = `rgba(72, 219, 251, ${0.4 + pulse * 0.3})`;
        this.ctx.lineWidth = 2;
        this.ctx.shadowColor = '#48dbfb';
        this.ctx.shadowBlur = 5 + pulse * 3;
      }

      this.drawHexagon(coord, this.hexSize * 0.8, false);
      this.ctx.shadowBlur = 0;
    });
  }

  private drawPieces(time: number): void {
    const state = this.gameCore.getState();

    state.pieces.filter(p => !p.isEliminated).forEach(piece => {
      this.drawPiece(piece, time);
    });
  }

  private drawPiece(piece: RunePiece, time: number): void {
    const center = this.getHexCenter(piece.position);
    const radius = 16 * this.scale;
    const baseColor = piece.faction === 'player' ? '#48dbfb' : '#ff6b35';
    const isSelected = this.gameCore.getState().selectedPieceId === piece.id;
    const isFrozen = piece.isFrozen && Date.now() < piece.frozenUntil;

    if (piece.faction === 'ai' && this.gameCore.getState().currentPlayer === 'ai') {
      const aiPulse = (Math.sin(this.animationTime * 3) + 1) / 2;
      this.ctx.beginPath();
      this.ctx.arc(center.x, center.y, radius + 8 + aiPulse * 4, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(255, 50, 50, ${0.4 + aiPulse * 0.3})`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }

    if (piece.hasShield) {
      const shieldPulse = (Math.sin(this.animationTime * 2) + 1) / 2;
      this.ctx.beginPath();
      this.ctx.arc(center.x, center.y, radius + 6 + shieldPulse * 3, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + shieldPulse * 0.3})`;
      this.ctx.lineWidth = 3;
      this.ctx.shadowColor = '#ffffff';
      this.ctx.shadowBlur = 10 + shieldPulse * 5;
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    }

    if (isFrozen) {
      this.ctx.beginPath();
      this.ctx.arc(center.x, center.y, radius + 4, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(72, 219, 251, 0.4)';
      this.ctx.fill();
      this.ctx.strokeStyle = '#48dbfb';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }

    const gradient = this.ctx.createRadialGradient(
      center.x - radius * 0.3, center.y - radius * 0.3, 0,
      center.x, center.y, radius
    );
    gradient.addColorStop(0, this.lightenColor(baseColor, 40));
    gradient.addColorStop(0.5, baseColor);
    gradient.addColorStop(1, this.darkenColor(baseColor, 30));

    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    this.ctx.clip();

    const flowAngle = this.animationTime * 2;
    const flowGradient = this.ctx.createLinearGradient(
      center.x - radius, center.y - radius,
      center.x + radius, center.y + radius
    );
    flowGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    flowGradient.addColorStop(0.4, `rgba(255, 255, 255, ${0.1 + Math.sin(flowAngle) * 0.1})`);
    flowGradient.addColorStop(0.6, `rgba(255, 255, 255, ${0.2 + Math.sin(flowAngle) * 0.1})`);
    flowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    this.ctx.fillStyle = flowGradient;
    this.ctx.translate(center.x, center.y);
    this.ctx.rotate(flowAngle * 0.5);
    this.ctx.fillRect(-radius * 2, -radius * 2, radius * 4, radius * 4);
    this.ctx.restore();

    const attrColor = RUNE_COLORS[piece.attribute];
    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, radius * 0.35, 0, Math.PI * 2);
    this.ctx.fillStyle = attrColor;
    this.ctx.shadowColor = attrColor;
    this.ctx.shadowBlur = 8;
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    if (isSelected) {
      const rotation = this.animationTime * 0.5 * Math.PI * 2;
      this.ctx.save();
      this.ctx.translate(center.x, center.y);
      this.ctx.rotate(rotation);

      const ringGradient = this.ctx.createConicGradient
        ? this.ctx.createConicGradient(0, 0, 0)
        : null;

      if (ringGradient) {
        ringGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        ringGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
        ringGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      }

      this.ctx.beginPath();
      this.ctx.arc(0, 0, radius + 5, 0, Math.PI * 2);
      this.ctx.strokeStyle = ringGradient || 'rgba(255, 255, 255, 0.6)';
      this.ctx.lineWidth = 3;
      this.ctx.shadowColor = '#ffffff';
      this.ctx.shadowBlur = 15;
      this.ctx.stroke();

      this.ctx.restore();
      this.ctx.shadowBlur = 0;
    }

    this.ctx.beginPath();
    this.ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
    this.ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }

  private drawBattleDisk(time: number): void {
    const state = this.gameCore.getState();
    if (!state.battleInfo) return;

    const battle = state.battleInfo;
    const cx = this.boardCenterX;
    const cy = this.boardCenterY;
    const radius = 60 * this.scale;
    const elapsed = time - battle.startTime;
    const progress = Math.min(1, elapsed / battle.duration);

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.save();
    this.ctx.translate(cx, cy);

    for (let i = 0; i < 8; i++) {
      const startAngle = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const endAngle = ((i + 1) / 8) * Math.PI * 2 - Math.PI / 2;

      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.arc(0, 0, radius, startAngle, endAngle);
      this.ctx.closePath();

      const color = RUNE_COLORS[RUNE_ATTRIBUTES[i]];
      this.ctx.fillStyle = color;
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 15;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;

      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }

    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius * 0.25, 0, Math.PI * 2);
    this.ctx.fillStyle = '#1a1c3a';
    this.ctx.fill();
    this.ctx.strokeStyle = '#00d2ff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    const targetColor = RUNE_COLORS[battle.targetAttribute];
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius * 0.18, 0, Math.PI * 2);
    this.ctx.fillStyle = targetColor;
    this.ctx.shadowColor = targetColor;
    this.ctx.shadowBlur = 10;
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius + 5, -Math.PI / 2, -Math.PI / 2 + (1 - progress) * Math.PI * 2);
    this.ctx.strokeStyle = progress > 0.7 ? '#ff4444' : '#00d2ff';
    this.ctx.lineWidth = 4;
    this.ctx.stroke();

    this.ctx.restore();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold ${16 * this.scale}px 'Segoe UI', sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = '#00d2ff';
    this.ctx.shadowBlur = 10;
    this.ctx.fillText('点击匹配的颜色！', cx, cy - radius - 20 * this.scale);
    this.ctx.shadowBlur = 0;
  }

  private drawUI(time: number): void {
    const state = this.gameCore.getState();

    this.drawTurnIndicator(time);
    this.drawPlayerInfo(time);
    this.drawAIInfo(time);
    this.drawEnergyBar(time);
    this.drawSkillButtons(time);
    this.drawMessage();

    if (state.phase === 'gameover') {
      this.drawGameOver();
    }
  }

  private drawTurnIndicator(time: number): void {
    const state = this.gameCore.getState();
    const barWidth = this.width * 0.6;
    const barHeight = 40;
    const x = (this.width - barWidth) / 2;
    const y = 20;

    const hueShift = (state.turn / 10) % 1;
    const color1 = this.interpolateColor('#00d2ff', '#a29bfe', hueShift);
    const color2 = this.interpolateColor('#3a7bd5', '#6c5ce7', hueShift);

    const gradient = this.ctx.createLinearGradient(x, y, x + barWidth, y);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);

    const pulse = (Math.sin(this.animationTime * 2) + 1) / 2;

    this.ctx.fillStyle = gradient;
    this.ctx.shadowColor = color1;
    this.ctx.shadowBlur = 15 + pulse * 5;

    this.ctx.beginPath();
    this.ctx.roundRect(x, y, barWidth, barHeight, 8);
    this.ctx.fill();

    this.ctx.shadowBlur = 0;

    const text = state.currentPlayer === 'player' ? '玩家回合' : 'AI思考中';
    const turnText = `第 ${state.turn} 回合`;

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold ${18 * this.scale}px 'Segoe UI', sans-serif`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(turnText, x + 20, y + barHeight / 2);

    this.ctx.textAlign = 'right';
    this.ctx.fillText(text, x + barWidth - 20, y + barHeight / 2);
  }

  private drawPlayerInfo(time: number): void {
    const state = this.gameCore.getState();
    const x = 40;
    const y = 100;

    const avatarSize = 60;
    const avatarX = x + avatarSize / 2;
    const avatarY = y + avatarSize / 2;

    this.ctx.beginPath();
    this.ctx.arc(avatarX, avatarY, avatarSize / 2 + 3, 0, Math.PI * 2);
    this.ctx.strokeStyle = '#00b09b';
    this.ctx.lineWidth = 3;
    this.ctx.shadowColor = '#00b09b';
    this.ctx.shadowBlur = 10;
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    const avatarGradient = this.ctx.createRadialGradient(
      avatarX - 10, avatarY - 10, 0,
      avatarX, avatarY, avatarSize / 2
    );
    avatarGradient.addColorStop(0, '#48dbfb');
    avatarGradient.addColorStop(1, '#0066cc');

    this.ctx.beginPath();
    this.ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
    this.ctx.fillStyle = avatarGradient;
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold ${24 * this.scale}px 'Segoe UI', sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('玩', avatarX, avatarY);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold ${16 * this.scale}px 'Segoe UI', sans-serif`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText('玩家', x + avatarSize + 15, y + 10);

    const hpBarWidth = 120;
    const hpBarHeight = 12;
    const hpBarX = x + avatarSize + 15;
    const hpBarY = y + 35;

    const playerPieces = state.pieces.filter(p => p.faction === 'player');
    const aliveCount = playerPieces.filter(p => !p.isEliminated).length;
    const hpPercent = aliveCount / playerPieces.length;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.beginPath();
    this.ctx.roundRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight, 4);
    this.ctx.fill();

    const hpGradient = this.ctx.createLinearGradient(hpBarX, hpBarY, hpBarX + hpBarWidth, hpBarY);
    hpGradient.addColorStop(0, '#00b09b');
    hpGradient.addColorStop(1, '#96c93d');

    this.ctx.fillStyle = hpGradient;
    this.ctx.beginPath();
    this.ctx.roundRect(hpBarX, hpBarY, hpBarWidth * hpPercent, hpBarHeight, 4);
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.font = `${11 * this.scale}px 'Segoe UI', sans-serif`;
    this.ctx.fillText(`棋子: ${aliveCount}/${playerPieces.length}`, hpBarX, hpBarY + hpBarHeight + 5);
  }

  private drawAIInfo(time: number): void {
    const state = this.gameCore.getState();
    const x = this.width - 40 - 60 - 15 - 120;
    const y = 100;

    const avatarSize = 60;
    const avatarX = this.width - 40 - avatarSize / 2;
    const avatarY = y + avatarSize / 2;

    this.ctx.beginPath();
    this.ctx.arc(avatarX, avatarY, avatarSize / 2 + 3, 0, Math.PI * 2);
    this.ctx.strokeStyle = '#d4145a';
    this.ctx.lineWidth = 3;
    this.ctx.shadowColor = '#d4145a';
    this.ctx.shadowBlur = 10;
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    const avatarGradient = this.ctx.createRadialGradient(
      avatarX - 10, avatarY - 10, 0,
      avatarX, avatarY, avatarSize / 2
    );
    avatarGradient.addColorStop(0, '#ff6b35');
    avatarGradient.addColorStop(1, '#d4145a');

    this.ctx.beginPath();
    this.ctx.arc(avatarX, avatarY, avatarSize / 2, 0, Math.PI * 2);
    this.ctx.fillStyle = avatarGradient;
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold ${24 * this.scale}px 'Segoe UI', sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('AI', avatarX, avatarY);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold ${16 * this.scale}px 'Segoe UI', sans-serif`;
    this.ctx.textAlign = 'right';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText('AI对手', this.width - 40 - avatarSize - 15, y + 10);

    const hpBarWidth = 120;
    const hpBarHeight = 12;
    const hpBarX = this.width - 40 - avatarSize - 15 - hpBarWidth;
    const hpBarY = y + 35;

    const aiPieces = state.pieces.filter(p => p.faction === 'ai');
    const aliveCount = aiPieces.filter(p => !p.isEliminated).length;
    const hpPercent = aliveCount / aiPieces.length;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.beginPath();
    this.ctx.roundRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight, 4);
    this.ctx.fill();

    const hpGradient = this.ctx.createLinearGradient(hpBarX, hpBarY, hpBarX + hpBarWidth, hpBarY);
    hpGradient.addColorStop(0, '#d4145a');
    hpGradient.addColorStop(1, '#ff6b35');

    this.ctx.fillStyle = hpGradient;
    this.ctx.beginPath();
    this.ctx.roundRect(hpBarX, hpBarY, hpBarWidth * hpPercent, hpBarHeight, 4);
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.font = `${11 * this.scale}px 'Segoe UI', sans-serif`;
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`棋子: ${aliveCount}/${aiPieces.length}`, hpBarX + hpBarWidth, hpBarY + hpBarHeight + 5);
  }

  private drawEnergyBar(time: number): void {
    const state = this.gameCore.getState();
    const barWidth = 30;
    const barHeight = 150;
    const x = 40;
    const y = this.height / 2 - barHeight / 2;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, barWidth, barHeight, 6);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(0, 242, 254, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    const cellHeight = (barHeight - 8) / 5;

    for (let i = 0; i < 5; i++) {
      const cellY = y + 4 + (4 - i) * cellHeight + 2;
      const cellH = cellHeight - 4;

      if (i < state.playerEnergy) {
        const gradient = this.ctx.createLinearGradient(x, cellY, x + barWidth, cellY);
        gradient.addColorStop(0, '#00f2fe');
        gradient.addColorStop(1, '#4facfe');

        this.ctx.fillStyle = gradient;
        this.ctx.shadowColor = '#00f2fe';
        this.ctx.shadowBlur = 5;
        this.ctx.beginPath();
        this.ctx.roundRect(x + 3, cellY, barWidth - 6, cellH, 3);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
      } else {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.roundRect(x + 3, cellY, barWidth - 6, cellH, 3);
        this.ctx.stroke();
      }
    }

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.font = `bold ${12 * this.scale}px 'Segoe UI', sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`能量 ${state.playerEnergy}/5`, x + barWidth / 2, y - 12);
  }

  private drawSkillButtons(time: number): void {
    const state = this.gameCore.getState();
    if (state.currentPlayer !== 'player') return;
    if (state.phase === 'battle' || state.phase === 'gameover') return;

    const skills = [
      { name: '护盾', cost: 2, key: 'shield', desc: '免疫1次对决失败' },
      { name: '冰封', cost: 3, key: 'freeze', desc: '冻结敌方1枚棋子' },
      { name: '星裂', cost: 5, key: 'starcrack', desc: '重排全场+复活' }
    ];

    const btnWidth = 90;
    const btnHeight = 60;
    const spacing = 15;
    const startX = this.width - (btnWidth + spacing) * 3 - 30 + spacing;
    const y = this.height - 100;

    skills.forEach((skill, i) => {
      const x = startX + i * (btnWidth + spacing);
      const canUse = state.playerEnergy >= skill.cost;
      const isHovered = this.isSkillButtonHovered(x, y, btnWidth, btnHeight);

      const gradient = this.ctx.createLinearGradient(x, y, x, y + btnHeight);
      if (canUse) {
        gradient.addColorStop(0, '#4facfe');
        gradient.addColorStop(1, '#00f2fe');
      } else {
        gradient.addColorStop(0, '#4a4a4a');
        gradient.addColorStop(1, '#2a2a2a');
      }

      this.ctx.fillStyle = gradient;
      if (canUse && isHovered) {
        this.ctx.shadowColor = '#00f2fe';
        this.ctx.shadowBlur = 15;
      }

      this.ctx.beginPath();
      this.ctx.roundRect(x, y, btnWidth, btnHeight, 8);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = `bold ${14 * this.scale}px 'Segoe UI', sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(skill.name, x + btnWidth / 2, y + 8);

      this.ctx.font = `${11 * this.scale}px 'Segoe UI', sans-serif`;
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      this.ctx.fillText(skill.desc, x + btnWidth / 2, y + 28);

      this.ctx.fillStyle = canUse ? '#ffd700' : '#666666';
      this.ctx.font = `bold ${12 * this.scale}px 'Segoe UI', sans-serif`;
      this.ctx.fillText(`⚡ ${skill.cost}`, x + btnWidth / 2, y + btnHeight - 18);
    });
  }

  private isSkillButtonHovered(x: number, y: number, w: number, h: number): boolean {
    if (!this.hoveredHex) return false;
    return false;
  }

  private drawMessage(): void {
    const state = this.gameCore.getState();
    const y = this.height - 40;

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.font = `${14 * this.scale}px 'Segoe UI', sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(state.message, this.width / 2, y);
  }

  private drawGameOver(): void {
    const state = this.gameCore.getState();

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    const text = state.winner === 'player' ? '🎉 胜利！' : '💀 失败...';
    const subtext = state.winner === 'player' ? '你击败了AI对手！' : 'AI获得了最终胜利';

    this.ctx.fillStyle = state.winner === 'player' ? '#00f2fe' : '#ff6b35';
    this.ctx.font = `bold ${48 * this.scale}px 'Segoe UI', sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.shadowColor = state.winner === 'player' ? '#00f2fe' : '#ff6b35';
    this.ctx.shadowBlur = 30;
    this.ctx.fillText(text, this.width / 2, this.height / 2 - 30);
    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.font = `${20 * this.scale}px 'Segoe UI', sans-serif`;
    this.ctx.fillText(subtext, this.width / 2, this.height / 2 + 30);

    const btnX = this.width / 2 - 60;
    const btnY = this.height / 2 + 80;
    const btnW = 120;
    const btnH = 40;

    const btnGradient = this.ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
    btnGradient.addColorStop(0, '#4facfe');
    btnGradient.addColorStop(1, '#00f2fe');

    this.ctx.fillStyle = btnGradient;
    this.ctx.shadowColor = '#00f2fe';
    this.ctx.shadowBlur = 10;
    this.ctx.beginPath();
    this.ctx.roundRect(btnX, btnY, btnW, btnH, 8);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold ${16 * this.scale}px 'Segoe UI', sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('重新开始', this.width / 2, btnY + btnH / 2);
  }

  addExplosion(x: number, y: number, color: string, count: number = 80): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 3 + Math.random() * 5,
        life: 1,
        maxLife: 1000 + Math.random() * 500,
        type: 'explosion',
        createdAt: Date.now()
      });
    }

    this.addScreenShake(5, 0.15);
  }

  addRipple(x: number, y: number, startRadius: number, endRadius: number, duration: number, color: string): void {
    this.ripples.push({
      x,
      y,
      startRadius,
      endRadius,
      startTime: Date.now(),
      duration: duration * 1000,
      color
    });
  }

  addTrail(x: number, y: number, color: string): void {
    this.trails.push({
      x,
      y,
      startTime: Date.now(),
      duration: 500,
      color
    });
  }

  addScreenShake(intensity: number, duration: number): void {
    this.screenShake = {
      intensity: intensity * this.scale,
      duration: duration * 1000,
      startTime: Date.now()
    };
  }

  private updateParticles(deltaTime: number): void {
    const now = Date.now();

    this.particles = this.particles.filter(p => {
      const age = now - p.createdAt;
      if (age >= p.maxLife) return false;

      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.1;
      p.vx *= 0.98;
      p.life = 1 - age / p.maxLife;

      return true;
    });

    while (this.particles.length > this.maxParticles) {
      this.particles.shift();
    }
  }

  private updateRipples(deltaTime: number): void {
    const now = Date.now();
    this.ripples = this.ripples.filter(r => now - r.startTime < r.duration);
  }

  private updateTrails(deltaTime: number): void {
    const now = Date.now();
    this.trails = this.trails.filter(t => now - t.startTime < t.duration);
  }

  private drawParticles(): void {
    this.particles.forEach(p => {
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 10;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
      this.ctx.globalAlpha = 1;
    });
  }

  private drawRipples(): void {
    const now = Date.now();

    this.ripples.forEach(r => {
      const progress = (now - r.startTime) / r.duration;
      if (progress >= 1) return;

      const radius = r.startRadius + (r.endRadius - r.startRadius) * progress;
      const alpha = 0.6 * (1 - progress);

      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = r.color;
      this.ctx.globalAlpha = alpha;
      this.ctx.lineWidth = 3;
      this.ctx.shadowColor = r.color;
      this.ctx.shadowBlur = 10;
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
      this.ctx.globalAlpha = 1;
    });
  }

  private drawTrails(): void {
    const now = Date.now();

    this.trails.forEach(t => {
      const progress = (now - t.startTime) / t.duration;
      if (progress >= 1) return;

      const alpha = 0.5 * (1 - progress);
      const size = 12 * (1 - progress) + 4;

      this.ctx.beginPath();
      this.ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
      this.ctx.fillStyle = t.color;
      this.ctx.globalAlpha = alpha;
      this.ctx.shadowColor = t.color;
      this.ctx.shadowBlur = 15;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
      this.ctx.globalAlpha = 1;
    });
  }

  private lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
    const B = Math.max(0, (num & 0x0000ff) - amt);
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  private interpolateColor(color1: string, color2: string, t: number): string {
    const c1 = parseInt(color1.replace('#', ''), 16);
    const c2 = parseInt(color2.replace('#', ''), 16);

    const r1 = (c1 >> 16) & 0xff;
    const g1 = (c1 >> 8) & 0xff;
    const b1 = c1 & 0xff;

    const r2 = (c2 >> 16) & 0xff;
    const g2 = (c2 >> 8) & 0xff;
    const b2 = c2 & 0xff;

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
  }

  getScale(): number {
    return this.scale;
  }
}
