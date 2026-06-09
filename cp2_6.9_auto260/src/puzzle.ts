import { QuantumParticle } from './particles.js';

export interface TargetPoint {
  x: number;
  y: number;
  color: string;
  radius: number;
  occupied: boolean;
}

export interface PuzzleState {
  currentPuzzle: number;
  totalPuzzles: number;
  targets: TargetPoint[];
  blueStartX: number;
  blueStartY: number;
  redStartX: number;
  redStartY: number;
  isCompleted: boolean;
  isPlaying: boolean;
}

const BLUE_COLOR = '#4A90D9';
const RED_COLOR = '#FF6B6B';
const TARGET_GREEN = '#00FF88';

export class PuzzleController {
  state: PuzzleState;
  canvasWidth: number;
  canvasHeight: number;
  statusBarHeight: number;

  constructor(canvasWidth: number, canvasHeight: number, statusBarHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.statusBarHeight = statusBarHeight;
    this.state = {
      currentPuzzle: 1,
      totalPuzzles: 10,
      targets: [],
      blueStartX: 0,
      blueStartY: 0,
      redStartX: 0,
      redStartY: 0,
      isCompleted: false,
      isPlaying: false
    };
  }

  updateCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  generatePuzzle(puzzleIndex?: number): void {
    if (puzzleIndex !== undefined) {
      this.state.currentPuzzle = puzzleIndex;
    }
    this.state.isCompleted = false;
    this.state.isPlaying = true;

    const scale = Math.min(this.canvasWidth / 1200, 1.5);
    const targetRadius = 6 * scale;
    const particleDistance = 120 * scale;

    const margin = 80 * scale;
    const topMargin = 60 * scale;
    const bottomLimit = this.canvasHeight - this.statusBarHeight - margin;
    const usableWidth = this.canvasWidth - margin * 2;
    const usableHeight = bottomLimit - topMargin;

    const centerX = margin + usableWidth / 2;
    const centerY = topMargin + usableHeight / 2;

    const targets: TargetPoint[] = [];
    const usedPositions: { x: number; y: number }[] = [];

    const blueTargetX = centerX + (Math.random() - 0.5) * usableWidth * 0.6;
    const blueTargetY = centerY + (Math.random() - 0.5) * usableHeight * 0.6;
    targets.push({
      x: blueTargetX,
      y: blueTargetY,
      color: BLUE_COLOR,
      radius: targetRadius,
      occupied: false
    });
    usedPositions.push({ x: blueTargetX, y: blueTargetY });

    let redTargetX: number, redTargetY: number;
    let attempts = 0;
    do {
      redTargetX = centerX + (Math.random() - 0.5) * usableWidth * 0.6;
      redTargetY = centerY + (Math.random() - 0.5) * usableHeight * 0.6;
      attempts++;
    } while (
      attempts < 50 &&
      Math.sqrt((redTargetX - blueTargetX) ** 2 + (redTargetY - blueTargetY) ** 2) < particleDistance * 0.8
    );
    targets.push({
      x: redTargetX,
      y: redTargetY,
      color: RED_COLOR,
      radius: targetRadius,
      occupied: false
    });
    usedPositions.push({ x: redTargetX, y: redTargetY });

    for (let i = 0; i < 4; i++) {
      let x: number, y: number;
      let valid = false;
      attempts = 0;
      while (!valid && attempts < 100) {
        x = margin + Math.random() * usableWidth;
        y = topMargin + Math.random() * usableHeight;
        valid = true;
        for (const pos of usedPositions) {
          if (Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2) < targetRadius * 5) {
            valid = false;
            break;
          }
        }
        attempts++;
      }
      if (valid) {
        targets.push({
          x: x!,
          y: y!,
          color: TARGET_GREEN,
          radius: targetRadius,
          occupied: false
        });
        usedPositions.push({ x: x!, y: y! });
      }
    }

    this.state.targets = targets;

    let startAngle = Math.random() * Math.PI * 2;
    this.state.blueStartX = centerX + Math.cos(startAngle) * particleDistance / 2;
    this.state.blueStartY = centerY + Math.sin(startAngle) * particleDistance / 2;
    this.state.redStartX = centerX - Math.cos(startAngle) * particleDistance / 2;
    this.state.redStartY = centerY - Math.sin(startAngle) * particleDistance / 2;
  }

  checkSolution(blueParticle: QuantumParticle, redParticle: QuantumParticle): {
    success: boolean;
    blueCorrect: boolean;
    redCorrect: boolean;
  } {
    const tolerance = 20 * Math.min(this.canvasWidth / 1200, 1.5);

    let blueCorrect = false;
    let redCorrect = false;

    const blueTarget = this.state.targets.find(t => t.color === BLUE_COLOR);
    const redTarget = this.state.targets.find(t => t.color === RED_COLOR);

    if (blueTarget) {
      const dist = blueParticle.distanceTo(blueTarget.x, blueTarget.y);
      blueCorrect = dist < tolerance;
    }

    if (redTarget) {
      const dist = redParticle.distanceTo(redTarget.x, redTarget.y);
      redCorrect = dist < tolerance;
    }

    const success = blueCorrect && redCorrect;

    if (success) {
      this.state.isCompleted = true;
      this.state.isPlaying = false;
    }

    return { success, blueCorrect, redCorrect };
  }

  nextPuzzle(): boolean {
    if (this.state.currentPuzzle < this.state.totalPuzzles) {
      this.state.currentPuzzle++;
      this.generatePuzzle();
      return true;
    }
    return false;
  }

  resetCurrentPuzzle(): void {
    this.generatePuzzle(this.state.currentPuzzle);
  }

  restartGame(): void {
    this.state.currentPuzzle = 1;
    this.state.isCompleted = false;
    this.generatePuzzle(1);
  }

  isAllCompleted(): boolean {
    return this.state.currentPuzzle > this.state.totalPuzzles ||
           (this.state.currentPuzzle === this.state.totalPuzzles && this.state.isCompleted);
  }

  renderTargets(ctx: CanvasRenderingContext2D): void {
    for (const target of this.state.targets) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = target.color;
      ctx.shadowColor = target.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = target.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius * 2.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
