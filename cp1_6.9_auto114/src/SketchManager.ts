import type p5 from 'p5';
import { RuneManager } from './RuneManager';
import { ConnectionManager } from './ConnectionManager';
import { PatternLibrary } from './PatternLibrary';
import type { PatternDef, TreeBranch, GameState } from './types';

const TOTAL_PATTERNS = 5;

export class SketchManager {
  private p: p5;
  private runeManager!: RuneManager;
  private connectionManager!: ConnectionManager;
  private patternLibrary!: PatternLibrary;
  private width: number;
  private height: number;
  private lastFrameTime: number = 0;
  private gameState: GameState = 'playing';
  private startTime: number | null = null;
  private elapsedTime: number = 0;
  private progressFlash: number = 0;
  private resetButton: { x: number; y: number; radius: number; hovered: boolean } = {
    x: 0,
    y: 0,
    radius: 25,
    hovered: false,
  };
  private treeBranches: TreeBranch[] = [];
  private treeProgress: number = 0;
  private bgBrightness: number = 0;

  constructor(p: p5, width: number, height: number) {
    this.p = p;
    this.width = width;
    this.height = height;
    this.init();
  }

  private init(): void {
    this.patternLibrary = new PatternLibrary();
    this.runeManager = new RuneManager(this.p, this.width, this.height);
    this.connectionManager = new ConnectionManager(this.p, this.runeManager, this.patternLibrary);

    this.connectionManager.setCallbacks(
      (pattern) => this.handlePatternComplete(pattern),
      () => this.handleFirstDraw()
    );

    this.updateResetButtonPosition();
  }

  private handlePatternComplete(pattern: PatternDef): void {
    this.progressFlash = 0.5;
    if (this.connectionManager.getCompletedPatterns().size >= TOTAL_PATTERNS) {
      this.gameState = 'victory';
      this.initVictoryTree();
    }
  }

  private handleFirstDraw(): void {
    this.startTime = Date.now();
  }

  private initVictoryTree(): void {
    this.treeBranches = [];
    const trunk: TreeBranch = {
      x: this.width / 2,
      y: this.height,
      angle: -this.p.HALF_PI,
      length: this.height * 0.35,
      depth: 0,
      progress: 0,
      children: [],
      hasChildren: false,
    };
    this.treeBranches.push(trunk);
  }

  private updateResetButtonPosition(): void {
    this.resetButton.x = this.width / 2;
    this.resetButton.y = this.height - 50;
  }

  handleMousePressed(x: number, y: number): void {
    if (this.isOverResetButton(x, y)) {
      this.reset();
      return;
    }
    if (this.gameState === 'playing') {
      this.connectionManager.startDrawing(x, y);
    }
  }

  handleMouseMoved(x: number, y: number): void {
    this.runeManager.setHover(x, y);
    this.resetButton.hovered = this.isOverResetButton(x, y);
  }

  handleMouseDragged(x: number, y: number): void {
    if (this.gameState === 'playing') {
      this.connectionManager.continueDrawing(x, y);
    }
    this.runeManager.setHover(x, y);
  }

  handleMouseReleased(x: number, y: number): void {
    if (this.gameState === 'playing') {
      this.connectionManager.endDrawing(x, y);
    }
  }

  private isOverResetButton(x: number, y: number): boolean {
    const dx = this.resetButton.x - x;
    const dy = this.resetButton.y - y;
    return Math.sqrt(dx * dx + dy * dy) < this.resetButton.radius;
  }

  reset(): void {
    this.runeManager.reset();
    this.connectionManager.reset();
    this.startTime = null;
    this.elapsedTime = 0;
    this.progressFlash = 0;
    this.gameState = 'playing';
    this.treeBranches = [];
    this.treeProgress = 0;
    this.bgBrightness = 0;
  }

  update(): void {
    const now = Date.now();
    const dt = this.lastFrameTime === 0 ? 0.016 : (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    if (this.progressFlash > 0) {
      this.progressFlash = Math.max(0, this.progressFlash - dt);
    }

    if (this.startTime && this.gameState === 'playing') {
      this.elapsedTime = (now - this.startTime) / 1000;
    }

    this.runeManager.update(dt, now);
    this.connectionManager.update(dt, now);

    if (this.gameState === 'victory') {
      this.bgBrightness = Math.min(1, this.bgBrightness + dt * 0.5);
      this.updateVictoryTree(dt);
    }
  }

  private updateVictoryTree(dt: number): void {
    this.treeProgress = Math.min(5, this.treeProgress + dt);

    for (const branch of this.treeBranches) {
      const maxDepth = 6;
      if (branch.progress < 1) {
        branch.progress = Math.min(1, branch.progress + dt * 1.5);
      } else if (!branch.hasChildren && branch.depth < maxDepth) {
        branch.hasChildren = true;
        const childCount = this.p.random(2, 3);
        for (let i = 0; i < childCount; i++) {
          const angleOffset = this.p.random(-this.p.PI / 3, this.p.PI / 3);
          const lengthScale = 0.6 + this.p.random(-0.1, 0.1);
          const endX = branch.x + Math.cos(branch.angle) * branch.length;
          const endY = branch.y + Math.sin(branch.angle) * branch.length;
          branch.children.push({
            x: endX,
            y: endY,
            angle: branch.angle + angleOffset,
            length: branch.length * lengthScale,
            depth: branch.depth + 1,
            progress: 0,
            children: [],
            hasChildren: false,
          });
        }
        for (const child of branch.children) {
          this.treeBranches.push(child);
        }
      }
    }
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.runeManager.resize(width, height);
    this.updateResetButtonPosition();
  }

  draw(): void {
    this.drawBackground();

    if (this.gameState === 'victory') {
      this.drawVictoryTree();
    }

    this.connectionManager.draw();
    this.runeManager.draw();
    this.drawUI();
  }

  private drawBackground(): void {
    const p = this.p;
    const t = this.bgBrightness;

    const c1 = p.lerpColor(
      p.color('#0a1a0a'),
      p.color('#2a4a2a'),
      t
    );
    const c2 = p.lerpColor(
      p.color('#1a2a1a'),
      p.color('#4a8a4a'),
      t
    );

    for (let y = 0; y < this.height; y++) {
      const amt = y / this.height;
      p.stroke(p.lerpColor(c1, c2, amt));
      p.line(0, y, this.width, y);
    }

    p.noStroke();
    for (let i = 0; i < 30; i++) {
      const x = (i * 83 + 17) % this.width;
      const y = (i * 127 + 41) % this.height;
      const size = 1 + (i % 3);
      p.fill(255, 30 + Math.sin(Date.now() / 1000 + i) * 20);
      p.ellipse(x, y, size, size);
    }
  }

  private drawUI(): void {
    const p = this.p;
    const isSmall = this.width < 600;
    const scale = isSmall ? 0.7 : 1;

    this.drawProgressBar(20, 20, 200 * scale, 10 * scale);
    this.drawTimer(this.width - 120 * scale, 20, scale);
    this.drawResetButton();

    if (this.gameState === 'victory' && this.treeProgress > 3) {
      this.drawVictoryText();
    }
  }

  private drawProgressBar(x: number, y: number, w: number, h: number): void {
    const p = this.p;
    const completed = this.connectionManager.getCompletedPatterns().size;
    const progress = completed / TOTAL_PATTERNS;

    p.noStroke();
    p.fill(80, 80, 80);
    p.rect(x, y, w, h, h / 2);

    const grad = p.drawingContext.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, '#888888');
    grad.addColorStop(1, '#ffcc00');
    p.drawingContext.fillStyle = grad;
    p.rect(x, y, w * progress, h, h / 2);

    if (this.progressFlash > 0) {
      const flashAlpha = this.progressFlash * 2;
      p.drawingContext.fillStyle = `rgba(255, 215, 0, ${flashAlpha})`;
      p.rect(x, y, w * progress, h, h / 2);
    }

    p.fill(255, 200);
    p.textSize(12);
    p.textAlign(p.LEFT, p.CENTER);
    p.text(`${completed}/${TOTAL_PATTERNS}`, x + w + 8, y + h / 2);
  }

  private drawTimer(x: number, y: number, scale: number): void {
    const p = this.p;
    const minutes = Math.floor(this.elapsedTime / 60);
    const seconds = Math.floor(this.elapsedTime % 60);
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    p.fill(255, 220);
    p.textSize(18 * scale);
    p.textAlign(p.RIGHT, p.TOP);
    p.textFont('monospace');
    p.text(timeStr, x, y);
  }

  private drawResetButton(): void {
    const p = this.p;
    const btn = this.resetButton;
    const hoverScale = btn.hovered ? 1.1 : 1;

    p.push();
    p.translate(btn.x, btn.y);
    p.scale(hoverScale);

    p.noStroke();
    p.drawingContext.shadowColor = 'rgba(0,0,0,0.5)';
    p.drawingContext.shadowBlur = 8;
    p.drawingContext.shadowOffsetY = 2;

    p.fill(p.color(btn.hovered ? '#ffffff' : '#aaaaaa', 180));
    p.ellipse(0, 0, btn.radius * 2, btn.radius * 2);

    p.drawingContext.shadowBlur = 0;
    p.drawingContext.shadowOffsetY = 0;

    p.stroke(btn.hovered ? '#333333' : '#555555');
    p.strokeWeight(2);
    p.line(-10, 0, 10, 0);
    p.line(-8, -8, 8, 8);
    p.line(-8, 8, 8, -8);

    p.pop();
  }

  private drawVictoryTree(): void {
    const p = this.p;
    p.drawingContext.shadowColor = '#ffcc66';
    p.drawingContext.shadowBlur = 15;

    for (const branch of this.treeBranches) {
      if (branch.progress <= 0) continue;
      const endX = branch.x + Math.cos(branch.angle) * branch.length * branch.progress;
      const endY = branch.y + Math.sin(branch.angle) * branch.length * branch.progress;

      const thickness = Math.max(1, 6 - branch.depth);
      p.stroke('#ffcc66', 220);
      p.strokeWeight(thickness);
      p.line(branch.x, branch.y, endX, endY);

      if (branch.progress >= 1 && branch.depth >= 4) {
        p.noStroke();
        p.fill('#ffdd88', 200);
        p.ellipse(endX, endY, 6, 6);
      }
    }

    p.drawingContext.shadowBlur = 0;
  }

  private drawVictoryText(): void {
    const p = this.p;
    const alpha = Math.min(255, (this.treeProgress - 3) * 127);

    p.fill(255, 220, 100, alpha);
    p.textSize(48);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('远古能量已苏醒', this.width / 2, this.height / 2 - 40);

    p.fill(255, 200, alpha);
    p.textSize(18);
    p.text('所有符文图腾已激活', this.width / 2, this.height / 2 + 20);
  }
}
