import p5 from 'p5';
import { Bubble, BUBBLE_RADIUS, BUBBLE_SPACING, COLOR_PALETTE } from './bubble';
import { ParticleSystem } from './effect';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const ROWS = 6;
export const COLS = 10;
const GAME_OVER_LINE = 50;
const CELL_SIZE = (BUBBLE_RADIUS * 2) + BUBBLE_SPACING;

export class Game {
  p: p5;
  grid: (Bubble | null)[][];
  currentBubble: Bubble | null;
  nextBubble: Bubble;
  particles: ParticleSystem;
  score: number;
  gameOver: boolean;
  gameOverTime: number;
  burstQueue: Bubble[];
  lastBurstTime: number;
  isAiming: boolean;
  aimAngle: number;
  shakeOffset: { x: number; y: number };
  shakeDuration: number;
  shakeStartTime: number;
  flashAlpha: number;
  flashDuration: number;
  flashStartTime: number;
  lastScoreMilestone: number;
  crosshairTime: number;
  mouseX: number;
  mouseY: number;
  mouseHovering: boolean;

  constructor(p: p5) {
    this.p = p;
    this.grid = [];
    this.currentBubble = null;
    this.nextBubble = this.createRandomBubble();
    this.particles = new ParticleSystem(500);
    this.score = 0;
    this.gameOver = false;
    this.gameOverTime = 0;
    this.burstQueue = [];
    this.lastBurstTime = 0;
    this.isAiming = false;
    this.aimAngle = -Math.PI / 2;
    this.shakeOffset = { x: 0, y: 0 };
    this.shakeDuration = 0;
    this.shakeStartTime = 0;
    this.flashAlpha = 0;
    this.flashDuration = 0;
    this.flashStartTime = 0;
    this.lastScoreMilestone = 0;
    this.crosshairTime = 0;
    this.mouseX = CANVAS_WIDTH / 2;
    this.mouseY = CANVAS_HEIGHT / 2;
    this.mouseHovering = false;
    this.initGrid();
    this.prepareNextBubble();
  }

  createRandomBubble(): Bubble {
    const color = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
    return new Bubble(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 60, color);
  }

  initGrid(): void {
    for (let row = 0; row < ROWS; row++) {
      this.grid[row] = [];
      for (let col = 0; col < COLS; col++) {
        const color = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
        const x = this.getGridX(row, col);
        const y = this.getGridY(row);
        this.grid[row][col] = new Bubble(x, y, color, row, col);
      }
    }
  }

  getGridX(row: number, col: number): number {
    const offset = (row % 2 === 1) ? CELL_SIZE / 2 : 0;
    return BUBBLE_RADIUS + BUBBLE_SPACING / 2 + col * CELL_SIZE + offset;
  }

  getGridY(row: number): number {
    return BUBBLE_RADIUS + BUBBLE_SPACING / 2 + row * CELL_SIZE;
  }

  getRowFromY(y: number): number {
    return Math.floor((y - BUBBLE_RADIUS - BUBBLE_SPACING / 2) / CELL_SIZE);
  }

  getColFromX(row: number, x: number): number {
    const offset = (row % 2 === 1) ? CELL_SIZE / 2 : 0;
    return Math.round((x - BUBBLE_RADIUS - BUBBLE_SPACING / 2 - offset) / CELL_SIZE);
  }

  getNeighbors(row: number, col: number): { row: number; col: number }[] {
    const isOdd = row % 2 === 1;
    const offsets = isOdd
      ? [
          [-1, 0], [-1, 1],
          [0, -1], [0, 1],
          [1, 0], [1, 1]
        ]
      : [
          [-1, -1], [-1, 0],
          [0, -1], [0, 1],
          [1, -1], [1, 0]
        ];
    const neighbors: { row: number; col: number }[] = [];
    for (const [dr, dc] of offsets) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nc >= 0 && nc < COLS) {
        neighbors.push({ row: nr, col: nc });
      }
    }
    return neighbors;
  }

  prepareNextBubble(): void {
    this.currentBubble = this.nextBubble;
    this.currentBubble.x = CANVAS_WIDTH / 2;
    this.currentBubble.y = CANVAS_HEIGHT - 60;
    this.nextBubble = this.createRandomBubble();
  }

  handleMousePress(mx: number, my: number): void {
    if (this.gameOver || !this.currentBubble || this.currentBubble.isMoving) return;
    this.isAiming = true;
    this.updateAim(mx, my);
  }

  handleMouseDrag(mx: number, my: number): void {
    this.mouseX = mx;
    this.mouseY = my;
    this.mouseHovering = true;
    if (this.isAiming && !this.gameOver) {
      this.updateAim(mx, my);
    }
  }

  handleMouseMove(mx: number, my: number): void {
    this.mouseX = mx;
    this.mouseY = my;
    this.mouseHovering = true;
    if (!this.gameOver && this.currentBubble && !this.currentBubble.isMoving) {
      this.updateAim(mx, my);
    }
  }

  handleMouseRelease(mx: number, my: number): void {
    if (this.isAiming && this.currentBubble && !this.currentBubble.isMoving && !this.gameOver) {
      this.updateAim(mx, my);
      this.currentBubble.launch(this.aimAngle);
      this.isAiming = false;
    }
  }

  handleMouseLeave(): void {
    this.mouseHovering = false;
    this.isAiming = false;
  }

  updateAim(mx: number, my: number): void {
    if (!this.currentBubble) return;
    const dx = mx - this.currentBubble.x;
    const dy = my - this.currentBubble.y;
    this.aimAngle = Math.atan2(dy, dx);
    if (this.aimAngle > -0.1) this.aimAngle = -0.1;
    if (this.aimAngle < -Math.PI + 0.1) this.aimAngle = -Math.PI + 0.1;
  }

  findClosestEmptyCell(x: number, y: number): { row: number; col: number } | null {
    let bestRow = -1;
    let bestCol = -1;
    let bestDist = Infinity;

    for (let row = 0; row < this.grid.length + 2; row++) {
      for (let col = 0; col < COLS; col++) {
        if (row < this.grid.length && this.grid[row] && this.grid[row][col]) continue;
        const gx = this.getGridX(row, col);
        const gy = this.getGridY(row);
        const d = Math.sqrt((gx - x) ** 2 + (gy - y) ** 2);
        if (d < bestDist) {
          bestDist = d;
          bestRow = row;
          bestCol = col;
        }
      }
    }
    if (bestRow < 0 || bestCol < 0) return null;
    return { row: bestRow, col: bestCol };
  }

  placeBubbleInGrid(bubble: Bubble, row: number, col: number): void {
    while (this.grid.length <= row) {
      this.grid.push(new Array(COLS).fill(null));
    }
    if (!this.grid[row]) {
      this.grid[row] = new Array(COLS).fill(null);
    }
    bubble.row = row;
    bubble.col = col;
    bubble.x = this.getGridX(row, col);
    bubble.y = this.getGridY(row);
    bubble.isMoving = false;
    this.grid[row][col] = bubble;
  }

  findConnectedChain(row: number, col: number, color: string): { row: number; col: number }[] {
    const visited = new Set<string>();
    const chain: { row: number; col: number }[] = [];
    const stack = [{ row, col }];

    while (stack.length > 0) {
      const pos = stack.pop()!;
      const key = `${pos.row},${pos.col}`;
      if (visited.has(key)) continue;
      if (pos.row < 0 || pos.row >= this.grid.length) continue;
      if (!this.grid[pos.row] || !this.grid[pos.row][pos.col]) continue;
      if (this.grid[pos.row][pos.col]!.color !== color) continue;

      visited.add(key);
      chain.push(pos);

      const neighbors = this.getNeighbors(pos.row, pos.col);
      for (const n of neighbors) {
        stack.push(n);
      }
    }
    return chain;
  }

  removeBubbles(chain: { row: number; col: number }[]): void {
    for (const pos of chain) {
      if (this.grid[pos.row] && this.grid[pos.row][pos.col]) {
        const bubble = this.grid[pos.row][pos.col]!;
        const particleCount = Math.floor(Math.random() * 31) + 20;
        this.particles.emit(bubble.x, bubble.y, bubble.color, particleCount);
        this.grid[pos.row][pos.col] = null;
      }
    }
  }

  calculateScore(chainLength: number): number {
    if (chainLength < 3) return 0;
    const baseScore = chainLength * 10;
    const bonus = (chainLength - 3) * 5;
    return baseScore + bonus;
  }

  checkGameOver(): boolean {
    for (let row = 0; row < this.grid.length; row++) {
      for (let col = 0; col < COLS; col++) {
        if (this.grid[row] && this.grid[row][col]) {
          const y = this.getGridY(row);
          if (y + BUBBLE_RADIUS > CANVAS_HEIGHT - GAME_OVER_LINE - 60) {
            return true;
          }
        }
      }
    }
    return false;
  }

  triggerShake(): void {
    this.shakeDuration = 200;
    this.shakeStartTime = performance.now();
  }

  triggerFlash(): void {
    this.flashDuration = 300;
    this.flashStartTime = performance.now();
  }

  updateShake(now: number): void {
    if (now - this.shakeStartTime < this.shakeDuration) {
      this.shakeOffset.x = (Math.random() - 0.5) * 6;
      this.shakeOffset.y = (Math.random() - 0.5) * 6;
    } else {
      this.shakeOffset.x = 0;
      this.shakeOffset.y = 0;
    }
  }

  updateFlash(now: number): void {
    const elapsed = now - this.flashStartTime;
    if (elapsed < this.flashDuration) {
      this.flashAlpha = 1 - elapsed / this.flashDuration;
    } else {
      this.flashAlpha = 0;
    }
  }

  collectAllBubbles(): Bubble[] {
    const bubbles: Bubble[] = [];
    for (let row = 0; row < this.grid.length; row++) {
      for (let col = 0; col < COLS; col++) {
        if (this.grid[row] && this.grid[row][col]) {
          bubbles.push(this.grid[row][col]!);
        }
      }
    }
    return bubbles;
  }

  update(deltaTime: number): void {
    const now = performance.now();
    this.crosshairTime += deltaTime;

    this.particles.update(deltaTime);
    this.updateShake(now);
    this.updateFlash(now);

    if (this.gameOver) {
      if (this.burstQueue.length > 0 && now - this.lastBurstTime > 100) {
        const bubble = this.burstQueue.shift()!;
        this.particles.emit(bubble.x, bubble.y, bubble.color, 30);
        if (this.grid[bubble.row] && this.grid[bubble.row][bubble.col]) {
          this.grid[bubble.row][bubble.col] = null;
        }
        this.lastBurstTime = now;
      }
      return;
    }

    if (this.currentBubble && this.currentBubble.isMoving) {
      this.currentBubble.update(CANVAS_WIDTH, CANVAS_HEIGHT);

      if (this.currentBubble.stopsAtTop()) {
        this.settleBubble();
        return;
      }

      for (let row = 0; row < this.grid.length; row++) {
        for (let col = 0; col < COLS; col++) {
          if (this.grid[row] && this.grid[row][col]) {
            const other = this.grid[row][col]!;
            if (this.currentBubble.hits(other)) {
              this.settleBubble();
              return;
            }
          }
        }
      }
    }
  }

  settleBubble(): void {
    if (!this.currentBubble) return;
    const pos = this.findClosestEmptyCell(this.currentBubble.x, this.currentBubble.y);
    if (pos) {
      this.placeBubbleInGrid(this.currentBubble, pos.row, pos.col);
      const chain = this.findConnectedChain(pos.row, pos.col, this.currentBubble.color);
      if (chain.length >= 3) {
        const earned = this.calculateScore(chain.length);
        this.score += earned;
        this.removeBubbles(chain);

        const currentMilestone = Math.floor(this.score / 100);
        if (currentMilestone > this.lastScoreMilestone) {
          this.lastScoreMilestone = currentMilestone;
          this.triggerShake();
          this.triggerFlash();
        }
      }

      if (this.checkGameOver()) {
        this.gameOver = true;
        this.gameOverTime = performance.now();
        this.burstQueue = this.collectAllBubbles();
        this.burstQueue.sort((a, b) => b.y - a.y);
        this.lastBurstTime = performance.now();
      }
    }

    this.prepareNextBubble();
  }

  drawBackground(): void {
    const p = this.p;
    const gradient = p.drawingContext.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#0a0a2a');
    gradient.addColorStop(1, '#1a0a1a');
    p.drawingContext.fillStyle = gradient;
    p.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    p.drawingContext.save();
    p.drawingContext.shadowBlur = 15;
    p.drawingContext.shadowColor = '#334466';
    p.stroke('#334466');
    p.strokeWeight(2);
    p.noFill();
    p.rect(1, 1, CANVAS_WIDTH - 2, CANVAS_HEIGHT - 2);
    p.drawingContext.restore();
  }

  drawGrid(): void {
    for (let row = 0; row < this.grid.length; row++) {
      for (let col = 0; col < COLS; col++) {
        if (this.grid[row] && this.grid[row][col]) {
          this.grid[row][col]!.draw(this.p);
        }
      }
    }
  }

  drawScore(): void {
    const p = this.p;
    p.drawingContext.save();
    p.drawingContext.shadowBlur = 10;
    p.drawingContext.shadowColor = '#00ffcc';
    p.fill(255);
    p.noStroke();
    p.textSize(24);
    p.textAlign(p.RIGHT, p.TOP);
    p.text(`Score: ${this.score}`, CANVAS_WIDTH - 20, 20);
    p.drawingContext.restore();
  }

  drawAimLine(): void {
    if (!this.currentBubble || this.currentBubble.isMoving || this.gameOver) return;
    if (!this.mouseHovering) return;

    const p = this.p;
    const startX = this.currentBubble.x;
    const startY = this.currentBubble.y;
    const lineLength = 150;
    const endX = startX + Math.cos(this.aimAngle) * lineLength;
    const endY = startY + Math.sin(this.aimAngle) * lineLength;

    p.drawingContext.save();
    p.drawingContext.globalAlpha = 0.6;
    p.drawingContext.setLineDash([5, 5]);
    p.stroke(255);
    p.strokeWeight(2);
    p.line(startX, startY, endX, endY);
    p.drawingContext.restore();
  }

  drawCrosshair(): void {
    if (!this.mouseHovering || this.gameOver) return;

    const p = this.p;
    const blink = Math.sin(this.crosshairTime / 250) > 0;
    const color = this.isAiming ? '#ffcc00' : '#00ffcc';
    const size = 10;

    p.drawingContext.save();
    p.drawingContext.globalAlpha = blink ? 0.8 : 0.4;
    p.drawingContext.shadowBlur = 8;
    p.drawingContext.shadowColor = color;
    p.stroke(color);
    p.strokeWeight(2);
    p.line(this.mouseX - size, this.mouseY, this.mouseX + size, this.mouseY);
    p.line(this.mouseX, this.mouseY - size, this.mouseX, this.mouseY + size);
    p.drawingContext.restore();
  }

  drawFlash(): void {
    if (this.flashAlpha <= 0) return;
    const p = this.p;
    p.drawingContext.save();
    p.drawingContext.globalAlpha = this.flashAlpha * 0.6;
    p.noStroke();
    p.fill('#00ffcc');
    p.rect(0, CANVAS_HEIGHT - 20, CANVAS_WIDTH, 20);
    p.drawingContext.restore();
  }

  drawGameOver(): void {
    if (!this.gameOver) return;
    const p = this.p;
    const now = performance.now();
    const elapsed = (now - this.gameOverTime) / 1000;
    const scale = 1 + Math.sin(elapsed * Math.PI * 2) * 0.1;

    p.drawingContext.save();
    p.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    p.scale(scale);
    p.drawingContext.shadowOffsetX = 4;
    p.drawingContext.shadowOffsetY = 4;
    p.drawingContext.shadowBlur = 8;
    p.drawingContext.shadowColor = 'rgba(0,0,0,0.8)';
    p.fill('#ff3366');
    p.noStroke();
    p.textSize(60);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('Game Over', 0, 0);
    p.drawingContext.restore();
  }

  drawNextBubblePreview(): void {
    if (this.gameOver) return;
    const p = this.p;
    const previewX = CANVAS_WIDTH / 2 + 80;
    const previewY = CANVAS_HEIGHT - 60;
    p.drawingContext.save();
    p.drawingContext.globalAlpha = 0.5;
    this.nextBubble.x = previewX;
    this.nextBubble.y = previewY;
    this.nextBubble.draw(p);
    p.drawingContext.restore();
  }

  draw(): void {
    const p = this.p;
    p.push();
    p.translate(this.shakeOffset.x, this.shakeOffset.y);

    this.drawBackground();
    this.drawGrid();

    if (this.currentBubble) {
      this.currentBubble.draw(p);
    }

    this.drawNextBubblePreview();
    this.drawAimLine();
    this.particles.draw(p);
    this.drawFlash();
    this.drawScore();
    this.drawCrosshair();
    this.drawGameOver();

    p.pop();
  }
}
