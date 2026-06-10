import p5 from 'p5';
import { CONFIG, PieceColor, PlayerId, HexCoord } from './main';
import { Board } from './Board';
import {
  Piece,
  ResonanceEffect,
  PulsingSpot,
  createResonanceParticles,
  updateResonanceParticles,
  renderResonanceEffect,
  renderPulsingSpot
} from './Piece';

interface Button {
  x: number;
  y: number;
  w: number;
  h: number;
  hovered: boolean;
  pressed: boolean;
  pressAnim: number;
  flashAnim: number;
}

interface RotateButton {
  x: number;
  y: number;
  r: number;
  direction: 'left' | 'right';
  hovered: boolean;
}

interface ResonancePull {
  piece: Piece;
  targetX: number;
  targetY: number;
  startTime: number;
  duration: number;
  startX: number;
  startY: number;
}

export class GameManager {
  private p: p5;
  private board: Board;
  private pieces: Piece[] = [];
  private currentPlayer: PlayerId = 1;
  private turnNumber: number = 1;
  private turnStartTime: number = 0;
  private turnDuration: number = 10000;
  private hasMovedPiece: boolean = false;
  private hasActivatedCell: boolean = false;
  private draggingPiece: Piece | null = null;
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;
  private mouseDownX: number = 0;
  private mouseDownY: number = 0;
  private gameOver: boolean = false;
  private winner: PlayerId | null = null;

  private resonanceEffects: ResonanceEffect[] = [];
  private pulsingSpots: PulsingSpot[] = [];
  private resonancePulls: ResonancePull[] = [];

  private endTurnBtn: Button = {
    x: 0, y: 0, w: 160, h: 48,
    hovered: false, pressed: false, pressAnim: 0, flashAnim: 0
  };
  private rotateLeftBtn: RotateButton = { x: 0, y: 0, r: 18, direction: 'left', hovered: false };
  private rotateRightBtn: RotateButton = { x: 0, y: 0, r: 18, direction: 'right', hovered: false };
  private manualRotation: number = 0;

  private player1TotalHp: number = 0;
  private player2TotalHp: number = 0;
  private player1MaxHp: number = 0;
  private player2MaxHp: number = 0;

  constructor(p: p5) {
    this.p = p;
    this.board = new Board(p);
    this.turnStartTime = p.millis();
    this.initPieces();
    this.calculateUI();
    this.updateTotalHp();
  }

  private initPieces(): void {
    this.pieces = [];
    const colors: PieceColor[] = ['RED', 'BLUE', 'GREEN', 'PURPLE'];

    const p1Positions: [number, number][] = [];
    for (let r = 0; r < 2; r++) {
      for (let q = 0; q < 6; q++) {
        p1Positions.push([q, r]);
      }
    }

    const p2Positions: [number, number][] = [];
    for (let r = 4; r < 6; r++) {
      for (let q = 0; q < 6; q++) {
        p2Positions.push([q, r]);
      }
    }

    for (let i = 0; i < 12; i++) {
      const color = colors[i % 4];
      const [q, r] = p1Positions[i];
      const piece = new Piece(color, 1, q, r);
      this.pieces.push(piece);
    }

    for (let i = 0; i < 12; i++) {
      const color = colors[i % 4];
      const [q, r] = p2Positions[i];
      const piece = new Piece(color, 2, q, r);
      this.pieces.push(piece);
    }

    this.updatePieceScreenPositions();
  }

  private updatePieceScreenPositions(): void {
    for (const piece of this.pieces) {
      const center = this.board.getCellCenter(piece.hexQ, piece.hexR);
      if (center) {
        piece.setScreenPosition(center.x, center.y);
      }
    }
  }

  private updateTotalHp(): void {
    this.player1TotalHp = 0;
    this.player2TotalHp = 0;
    this.player1MaxHp = 0;
    this.player2MaxHp = 0;
    for (const piece of this.pieces) {
      if (piece.player === 1) {
        this.player1TotalHp += Math.max(0, piece.hp);
        this.player1MaxHp += piece.maxHp;
      } else {
        this.player2TotalHp += Math.max(0, piece.hp);
        this.player2MaxHp += piece.maxHp;
      }
    }
  }

  private calculateUI(): void {
    const w = this.p.width;
    const h = this.p.height;

    this.endTurnBtn.x = w / 2 - this.endTurnBtn.w / 2;
    this.endTurnBtn.y = h - 80;

    this.rotateLeftBtn.x = this.endTurnBtn.x - 60;
    this.rotateLeftBtn.y = this.endTurnBtn.y + this.endTurnBtn.h / 2;

    this.rotateRightBtn.x = this.endTurnBtn.x + this.endTurnBtn.w + 60;
    this.rotateRightBtn.y = this.endTurnBtn.y + this.endTurnBtn.h / 2;
  }

  public onResize(): void {
    this.board.onResize();
    this.updatePieceScreenPositions();
    this.calculateUI();
  }

  public update(dt: number, time: number): void {
    this.board.update(dt, time);
    this.updatePieceScreenPositions();

    for (const piece of this.pieces) {
      piece.update(dt, time);

      const waveInfo = this.board.isInActivationWave(piece.screenX, piece.screenY, time);
      if (waveInfo.inWave && waveInfo.color && piece.color === waveInfo.color) {
        piece.shieldedByWave = true;
        piece.waveGlowStartTime = time;
      } else if (piece.shieldedByWave && time - piece.waveGlowStartTime > 1500) {
        piece.shieldedByWave = false;
      }
    }

    for (let i = this.resonanceEffects.length - 1; i >= 0; i--) {
      const effect = this.resonanceEffects[i];
      updateResonanceParticles(effect.particles, dt, effect.x, effect.y);
      if (time - effect.startTime > 1200 && effect.particles.length === 0) {
        this.resonanceEffects.splice(i, 1);
      }
    }

    for (let i = this.pulsingSpots.length - 1; i >= 0; i--) {
      if (time - this.pulsingSpots[i].startTime > this.pulsingSpots[i].duration) {
        this.pulsingSpots.splice(i, 1);
      }
    }

    for (let i = this.resonancePulls.length - 1; i >= 0; i--) {
      const pull = this.resonancePulls[i];
      const elapsed = time - pull.startTime;
      if (elapsed >= pull.duration) {
        this.resonancePulls.splice(i, 1);
        continue;
      }
      const t = elapsed / pull.duration;
      const px = pull.startX + (pull.targetX - pull.startX) * t;
      const py = pull.startY + (pull.targetY - pull.startY) * t;
      pull.piece.screenX = px;
      pull.piece.screenY = py;
    }

    if (this.endTurnBtn.pressAnim > 0) {
      this.endTurnBtn.pressAnim = Math.max(0, this.endTurnBtn.pressAnim - dt * 0.005);
    }
    if (this.endTurnBtn.flashAnim > 0) {
      this.endTurnBtn.flashAnim = Math.max(0, this.endTurnBtn.flashAnim - dt * 0.01);
    }

    if (!this.gameOver && time - this.turnStartTime > this.turnDuration) {
      this.endTurn(time);
    }

    this.checkWinCondition();
  }

  private checkWinCondition(): void {
    const p1Alive = this.pieces.some(p => p.player === 1 && p.hp > 0);
    const p2Alive = this.pieces.some(p => p.player === 2 && p.hp > 0);

    if (!p1Alive && p2Alive) {
      this.gameOver = true;
      this.winner = 2;
    } else if (p1Alive && !p2Alive) {
      this.gameOver = true;
      this.winner = 1;
    }
    this.updateTotalHp();
  }

  public render(time: number): void {
    this.board.render(time, this.pieces);

    for (const spot of this.pulsingSpots) {
      renderPulsingSpot(this.p, time, spot);
    }

    for (const effect of this.resonanceEffects) {
      renderResonanceEffect(this.p, time, effect);
    }

    const sortedPieces = [...this.pieces].sort((a, b) => {
      if (a.isDragging) return 1;
      if (b.isDragging) return -1;
      return 0;
    });

    for (const piece of sortedPieces) {
      const isOpponent = piece.player !== this.currentPlayer;
      piece.render(this.p, time, isOpponent);
    }

    this.renderStatusBar(time);
    this.renderBottomUI(time);

    if (this.gameOver) {
      this.renderGameOver();
    }
  }

  private renderStatusBar(time: number): void {
    const w = this.p.width;
    const barH = 60;

    this.p.noStroke();
    this.p.fill(0, 0, 0, 0.3 * 255);
    this.p.rect(0, 0, w, barH);

    this.p.textAlign(this.p.CENTER, this.p.CENTER);
    this.p.noStroke();
    this.p.fill(255, 255, 255, 230);
    this.p.textSize(18);
    this.p.text(`回合 ${this.turnNumber}`, w / 2, barH / 2);

    const progress1 = this.player1MaxHp > 0 ? this.player1TotalHp / this.player1MaxHp : 0;
    this.renderHpBar(80, barH / 2 - 6, 200, 12, progress1, '玩家1');

    const progress2 = this.player2MaxHp > 0 ? this.player2TotalHp / this.player2MaxHp : 0;
    this.renderHpBar(w - 280, barH / 2 - 6, 200, 12, progress2, '玩家2');

    const timeLeft = Math.max(0, this.turnDuration - (time - this.turnStartTime));
    this.renderTimer(w / 2, barH / 2, 20, timeLeft, time);
  }

  private renderHpBar(x: number, y: number, w: number, h: number, progress: number, label: string): void {
    this.p.noStroke();
    this.p.fill(255, 255, 255, 30);
    this.p.rect(x, y, w, h, 4);

    const fillW = w * progress;
    if (fillW > 0) {
      for (let i = 0; i < fillW; i++) {
        const t = i / w;
        const color = this.lerpHpColor(t);
        this.p.stroke(color);
        this.p.strokeWeight(1);
        this.p.line(x + i, y + 1, x + i, y + h - 1);
      }
    }

    this.p.noStroke();
    this.p.fill(255, 255, 255, 200);
    this.p.textSize(11);
    this.p.textAlign(this.p.LEFT, this.p.CENTER);
    this.p.text(label, x, y + h + 12);
  }

  private lerpHpColor(t: number): string {
    const gR = 0, gG = 255, gB = 136;
    const rR = 255, rG = 51, rB = 85;
    const r = Math.round(rR * (1 - t) + gR * t);
    const g = Math.round(rG * (1 - t) + gG * t);
    const b = Math.round(rB * (1 - t) + gB * t);
    return this.p.color(r, g, b).toString('#rrggbb');
  }

  private renderTimer(cx: number, cy: number, r: number, timeLeft: number, time: number): void {
    const progress = 1 - timeLeft / this.turnDuration;
    const angle = -Math.PI / 2 + progress * Math.PI * 2;

    this.p.noFill();
    this.p.stroke(this.p.hex(CONFIG.COLORS.HEX_BORDER) + this.p.alpha(150));
    this.p.strokeWeight(3);
    this.p.circle(cx, cy, r * 2);

    this.p.noFill();
    this.p.stroke(this.p.hex(CONFIG.COLORS.HEX_BORDER));
    this.p.strokeWeight(3);
    this.p.arc(cx, cy, r * 2, r * 2, -Math.PI / 2, angle);

    this.p.push();
    this.p.translate(cx, cy);
    this.p.rotate(angle);
    this.p.noStroke();
    this.p.fill(CONFIG.COLORS.HEX_BORDER);
    this.p.circle(r - 2, 0, 5);
    this.p.pop();

    const seconds = Math.ceil(timeLeft / 1000);
    this.p.noStroke();
    this.p.fill(255, 255, 255, 220);
    this.p.textSize(10);
    this.p.textAlign(this.p.CENTER, this.p.CENTER);
    this.p.text(`${seconds}s`, cx, cy);
  }

  private renderBottomUI(time: number): void {
    this.renderEndTurnButton(time);
    this.renderRotateButton(this.rotateLeftBtn, time);
    this.renderRotateButton(this.rotateRightBtn, time);

    this.p.noStroke();
    this.p.fill(255, 255, 255, 150);
    this.p.textSize(12);
    this.p.textAlign(this.p.CENTER, this.p.CENTER);
    const status = `回合状态: ${this.hasMovedPiece ? '✓' : '○'} 移动  ${this.hasActivatedCell ? '✓' : '○'} 激活`;
    this.p.text(status, this.p.width / 2, this.endTurnBtn.y - 20);

    this.p.fill(255, 255, 255, 180);
    this.p.textSize(13);
    this.p.text(`玩家 ${this.currentPlayer} 的回合`, this.p.width / 2, this.endTurnBtn.y + this.endTurnBtn.h + 20);
  }

  private renderEndTurnButton(time: number): void {
    const btn = this.endTurnBtn;
    const scale = 1 - btn.pressAnim * 0.05;

    this.p.push();
    this.p.translate(btn.x + btn.w / 2, btn.y + btn.h / 2);
    this.p.scale(scale);
    this.p.translate(-btn.w / 2, -btn.h / 2);

    let bgColor = '#2a3a5a';
    if (btn.hovered) bgColor = '#4a6a9a';

    this.p.noStroke();
    this.p.fill(this.p.hex(bgColor));
    this.p.rect(0, 0, btn.w, btn.h, 8);

    if (btn.flashAnim > 0) {
      this.p.fill(255, 255, 255, btn.flashAnim * 255);
      this.p.rect(0, 0, btn.w, btn.h, 8);
    }

    this.p.noStroke();
    this.p.fill(255, 255, 255, 230);
    this.p.textSize(16);
    this.p.textAlign(this.p.CENTER, this.p.CENTER);
    this.p.text('结束回合', btn.w / 2, btn.h / 2);

    this.p.pop();
  }

  private renderRotateButton(btn: RotateButton, time: number): void {
    const r = btn.hovered ? btn.r + 4 : btn.r;

    this.p.push();
    this.p.translate(btn.x, btn.y);

    this.p.noFill();
    this.p.stroke(this.p.hex(CONFIG.COLORS.HEX_BORDER) + this.p.alpha(200));
    this.p.strokeWeight(2);
    this.p.circle(0, 0, r * 2);

    this.p.noStroke();
    this.p.fill(CONFIG.COLORS.HEX_BORDER);
    this.p.stroke(CONFIG.COLORS.HEX_BORDER);
    this.p.strokeWeight(2);
    this.p.strokeCap(this.p.ROUND);

    if (btn.direction === 'left') {
      this.p.line(-r * 0.4, -r * 0.4, -r * 0.5, 0);
      this.p.line(-r * 0.5, 0, -r * 0.4, r * 0.4);
      this.p.line(-r * 0.5, 0, r * 0.4, 0);
    } else {
      this.p.line(r * 0.4, -r * 0.4, r * 0.5, 0);
      this.p.line(r * 0.5, 0, r * 0.4, r * 0.4);
      this.p.line(r * 0.5, 0, -r * 0.4, 0);
    }
    this.p.noStroke();

    this.p.pop();
  }

  private renderGameOver(): void {
    const w = this.p.width;
    const h = this.p.height;

    this.p.noStroke();
    this.p.fill(0, 0, 0, 0.7 * 255);
    this.p.rect(0, 0, w, h);

    this.p.fill(255, 255, 255, 255);
    this.p.textSize(48);
    this.p.textAlign(this.p.CENTER, this.p.CENTER);
    this.p.text(`玩家 ${this.winner} 胜利!`, w / 2, h / 2 - 30);

    this.p.textSize(20);
    this.p.fill(200, 200, 200, 200);
    this.p.text(`共进行了 ${this.turnNumber} 回合`, w / 2, h / 2 + 30);
  }

  public onMousePressed(mx: number, my: number): void {
    if (this.gameOver) return;
    this.mouseDownX = mx;
    this.mouseDownY = my;

    if (this.isPointInButton(mx, my, this.endTurnBtn)) {
      this.endTurnBtn.pressed = true;
      this.endTurnBtn.pressAnim = 1;
      return;
    }

    if (this.isPointInCircle(mx, my, this.rotateLeftBtn)) {
      this.manualRotation += Math.PI / 12;
      return;
    }
    if (this.isPointInCircle(mx, my, this.rotateRightBtn)) {
      this.manualRotation -= Math.PI / 12;
      return;
    }

    if (!this.hasMovedPiece) {
      for (const piece of this.pieces) {
        if (piece.player === this.currentPlayer && piece.hp > 0 && piece.containsPoint(mx, my)) {
          this.draggingPiece = piece;
          piece.isDragging = true;
          this.dragOffsetX = mx - piece.screenX;
          this.dragOffsetY = my - piece.screenY;
          break;
        }
      }
    }
  }

  public onMouseDragged(mx: number, my: number): void {
    if (this.draggingPiece) {
      this.draggingPiece.screenX = mx - this.dragOffsetX;
      this.draggingPiece.screenY = my - this.dragOffsetY;
    }
  }

  public onMouseReleased(mx: number, my: number): void {
    if (this.gameOver) return;

    const dx = mx - this.mouseDownX;
    const dy = my - this.mouseDownY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const isClick = dist < 5;

    if (this.endTurnBtn.pressed && this.isPointInButton(mx, my, this.endTurnBtn)) {
      this.endTurnBtn.pressed = false;
      this.endTurnBtn.flashAnim = 1;
      this.endTurn(this.p.millis());
      return;
    }
    this.endTurnBtn.pressed = false;

    if (this.draggingPiece) {
      const cell = this.board.findCellAt(mx, my);
      if (cell && this.board.isCellEmpty(cell.q, cell.r, this.pieces)) {
        this.draggingPiece.setHexCoord(cell.q, cell.r);
        const center = this.board.getCellCenter(cell.q, cell.r);
        if (center) {
          this.draggingPiece.setScreenPosition(center.x, center.y);
          this.draggingPiece.triggerLandExplosion(this.p.millis(), center.x, center.y);
        }
        this.hasMovedPiece = true;
        this.checkAndTriggerResonance(this.draggingPiece);
      } else {
        const center = this.board.getCellCenter(this.draggingPiece.hexQ, this.draggingPiece.hexR);
        if (center) {
          this.draggingPiece.setScreenPosition(center.x, center.y);
        }
      }
      this.draggingPiece.isDragging = false;
      this.draggingPiece = null;
    } else if (isClick && !this.hasActivatedCell) {
      const cell = this.board.findCellAt(mx, my);
      if (cell) {
        const piece = this.board.getPieceAt(cell.q, cell.r, this.pieces);
        if (piece && piece.player === this.currentPlayer && piece.hp > 0) {
          this.board.activateCell(cell.q, cell.r, piece.color, this.p.millis());
          this.hasActivatedCell = true;
        }
      }
    }
  }

  public onMouseMoved(mx: number, my: number): void {
    this.endTurnBtn.hovered = this.isPointInButton(mx, my, this.endTurnBtn);
    this.rotateLeftBtn.hovered = this.isPointInCircle(mx, my, this.rotateLeftBtn);
    this.rotateRightBtn.hovered = this.isPointInCircle(mx, my, this.rotateRightBtn);
  }

  private isPointInButton(px: number, py: number, btn: Button): boolean {
    return px >= btn.x && px <= btn.x + btn.w && py >= btn.y && py <= btn.y + btn.h;
  }

  private isPointInCircle(px: number, py: number, btn: RotateButton): boolean {
    const dx = px - btn.x;
    const dy = py - btn.y;
    return Math.sqrt(dx * dx + dy * dy) <= btn.r + 4;
  }

  private endTurn(time: number): void {
    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    if (this.currentPlayer === 1) {
      this.turnNumber++;
    }
    this.hasMovedPiece = false;
    this.hasActivatedCell = false;
    this.turnStartTime = time;

    for (const piece of this.pieces) {
      if (!piece.hasShield) {
        piece.hasShield = piece.shieldedByWave;
      }
      piece.shieldedByWave = false;
    }

    this.performAutoAttack();
  }

  private performAutoAttack(): void {
    for (const piece of this.pieces) {
      if (piece.hp <= 0) continue;
      const neighbors = this.getNeighborPieces(piece);
      for (const neighbor of neighbors) {
        if (neighbor.player !== piece.player && neighbor.hp > 0) {
          neighbor.takeDamage(1);
        }
      }
    }
    this.pieces = this.pieces.filter(p => p.hp > 0);
  }

  private getNeighborPieces(piece: Piece): Piece[] {
    const result: Piece[] = [];
    for (const other of this.pieces) {
      if (other === piece || other.hp <= 0) continue;
      if (this.board.areNeighbors(piece.hexQ, piece.hexR, other.hexQ, other.hexR)) {
        result.push(other);
      }
    }
    return result;
  }

  private checkAndTriggerResonance(movedPiece: Piece): void {
    const playerPieces = this.pieces.filter(p => p.player === movedPiece.player && p.hp > 0);

    for (let i = 0; i < playerPieces.length; i++) {
      for (let j = i + 1; j < playerPieces.length; j++) {
        for (let k = j + 1; k < playerPieces.length; k++) {
          const a = playerPieces[i];
          const b = playerPieces[j];
          const c = playerPieces[k];

          if (this.isEquilateralTriangleResonance(a, b, c)) {
            this.triggerResonance(a, b, c);
          }
        }
      }
    }
  }

  private isEquilateralTriangleResonance(a: Piece, b: Piece, c: Piece): boolean {
    const colors = new Set([a.color, b.color, c.color]);
    if (colors.size !== 3) return false;
    if (!colors.has('RED') || !colors.has('BLUE') || !colors.has('GREEN')) return false;

    const distAB = this.pixelDistance(a, b);
    const distBC = this.pixelDistance(b, c);
    const distCA = this.pixelDistance(c, a);

    const hexW = CONFIG.HEX_SIZE * Math.sqrt(3);
    const neighborDist = hexW * 0.95;
    const tol = neighborDist * 0.4;

    const matchAB = Math.abs(distAB - neighborDist) < tol || Math.abs(distAB - neighborDist * Math.sqrt(3)) < tol;
    const matchBC = Math.abs(distBC - neighborDist) < tol || Math.abs(distBC - neighborDist * Math.sqrt(3)) < tol;
    const matchCA = Math.abs(distCA - neighborDist) < tol || Math.abs(distCA - neighborDist * Math.sqrt(3)) < tol;

    return matchAB && matchBC && matchCA;
  }

  private pixelDistance(a: Piece, b: Piece): number {
    const ca = this.board.getCellCenter(a.hexQ, a.hexR);
    const cb = this.board.getCellCenter(b.hexQ, b.hexR);
    if (!ca || !cb) return Infinity;
    return Math.sqrt((ca.x - cb.x) ** 2 + (ca.y - cb.y) ** 2);
  }

  private triggerResonance(a: Piece, b: Piece, c: Piece): void {
    const time = this.p.millis();
    const ca = this.board.getCellCenter(a.hexQ, a.hexR)!;
    const cb = this.board.getCellCenter(b.hexQ, b.hexR)!;
    const cc = this.board.getCellCenter(c.hexQ, c.hexR)!;

    const cx = (ca.x + cb.x + cc.x) / 3;
    const cy = (ca.y + cb.y + cc.y) / 3;

    const particles = createResonanceParticles(cx, cy);
    this.resonanceEffects.push({
      x: cx,
      y: cy,
      startTime: time,
      particles,
      flashTime: time
    });

    this.pulsingSpots.push({
      x: ca.x, y: ca.y, startTime: time, duration: 3000
    });
    this.pulsingSpots.push({
      x: cb.x, y: cb.y, startTime: time, duration: 3000
    });
    this.pulsingSpots.push({
      x: cc.x, y: cc.y, startTime: time, duration: 3000
    });

    const enemyPieces = this.pieces.filter(p => p.player !== a.player && p.hp > 0);
    const hexW = CONFIG.HEX_SIZE * Math.sqrt(3);
    const pullRadius = hexW * 2.5;

    for (const enemy of enemyPieces) {
      const ec = this.board.getCellCenter(enemy.hexQ, enemy.hexR);
      if (!ec) continue;
      const dist = Math.sqrt((ec.x - cx) ** 2 + (ec.y - cy) ** 2);
      if (dist <= pullRadius) {
        const pullStrength = 0.5;
        const tx = ec.x + (cx - ec.x) * pullStrength;
        const ty = ec.y + (cy - ec.y) * pullStrength;
        this.resonancePulls.push({
          piece: enemy,
          startX: ec.x,
          startY: ec.y,
          targetX: tx,
          targetY: ty,
          startTime: time,
          duration: 500
        });

        enemy.takeDamage(1);
      }
    }

    this.pieces = this.pieces.filter(p => p.hp > 0);
    this.board.activateCell(a.hexQ, a.hexR, a.color, time);
  }
}
