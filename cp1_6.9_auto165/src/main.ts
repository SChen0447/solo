import p5 from 'p5';
import { Board } from './board';
import { Rune, RuneAttribute, ATTRIBUTE_COLORS, RainParticle } from './rune';

const LEVEL_TARGETS = [2, 3, 4];
const ATTRIBUTES: RuneAttribute[] = ['fire', 'frost', 'thunder', 'shadow', 'light'];

class Game {
  private p: p5;
  private board: Board;
  private runePool: Rune[];
  private currentLevel: number;
  private isLevelTransitioning: boolean;
  private transitionTimer: number;
  private rainParticles: RainParticle[];
  private draggingRune: number | null;
  private dragOffsetX: number;
  private dragOffsetY: number;
  private dragFromPool: boolean;
  private resetButton: { x: number; y: number; w: number; h: number; hovered: boolean };
  private container: HTMLElement;
  private lastTime: number;
  private runeJustPlaced: boolean;
  private lastClickTime: number;

  constructor(container: HTMLElement) {
    this.container = container;
    this.currentLevel = 1;
    this.isLevelTransitioning = false;
    this.transitionTimer = 0;
    this.rainParticles = [];
    this.draggingRune = null;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.dragFromPool = false;
    this.resetButton = { x: 0, y: 0, w: 120, h: 40, hovered: false };
    this.lastTime = 0;
    this.runeJustPlaced = false;
    this.lastClickTime = 0;

    this.board = new Board(window.innerWidth / 2, window.innerHeight / 2, this.currentLevel);
    this.runePool = this.createRunePool();

    const sketch = (p: p5) => {
      this.p = p;
      p.setup = () => this.setup();
      p.draw = () => this.draw();
      p.mousePressed = () => this.mousePressed();
      p.mouseReleased = () => this.mouseReleased();
      p.mouseDragged = () => this.mouseDragged();
      p.mouseMoved = () => this.mouseMoved();
      p.windowResized = () => this.windowResized();
    };

    new p5(sketch, this.container);
  }

  setup(): void {
    const canvas = this.p.createCanvas(window.innerWidth, window.innerHeight);
    canvas.parent('game-container');
    this.p.textFont('sans-serif');
  }

  createRunePool(): Rune[] {
    const pool: Rune[] = [];
    const poolY = window.innerHeight - 80;
    const spacing = 80;
    const startX = window.innerWidth / 2 - (ATTRIBUTES.length - 1) * spacing / 2;

    for (let i = 0; i < ATTRIBUTES.length; i++) {
      const rune = new Rune(ATTRIBUTES[i], startX + i * spacing, poolY);
      rune.homeX = rune.x;
      rune.homeY = rune.y;
      pool.push(rune);
    }
    return pool;
  }

  mousePressed(): void {
    if (this.isLevelTransitioning) return;

    const mx = this.p.mouseX;
    const my = this.p.mouseY;

    if (mx >= this.resetButton.x && mx <= this.resetButton.x + this.resetButton.w &&
        my >= this.resetButton.y && my <= this.resetButton.y + this.resetButton.h) {
      this.resetBoard();
      return;
    }

    for (let i = this.board.runes.length - 1; i >= 0; i--) {
      const rune = this.board.runes[i];
      if (rune.contains(mx, my)) {
        this.draggingRune = i;
        this.dragFromPool = false;
        this.dragOffsetX = mx - rune.x;
        this.dragOffsetY = my - rune.y;
        rune.isDragging = true;
        this.runeJustPlaced = false;
        this.lastClickTime = performance.now();
        return;
      }
    }

    for (let i = this.runePool.length - 1; i >= 0; i--) {
      const rune = this.runePool[i];
      if (rune.contains(mx, my)) {
        const newRune = new Rune(rune.attribute, rune.x, rune.y);
        newRune.homeX = rune.x;
        newRune.homeY = rune.y;
        newRune.isDragging = true;
        this.board.runes.push(newRune);
        this.draggingRune = this.board.runes.length - 1;
        this.dragFromPool = true;
        this.dragOffsetX = mx - newRune.x;
        this.dragOffsetY = my - newRune.y;
        this.runeJustPlaced = false;
        this.lastClickTime = performance.now();
        return;
      }
    }
  }

  mouseReleased(): void {
    if (this.draggingRune === null) return;

    const rune = this.board.runes[this.draggingRune];
    if (!rune) {
      this.draggingRune = null;
      return;
    }

    rune.isDragging = false;
    const nearestSlot = this.board.getNearestEmptySlot(rune.x, rune.y);

    const now = performance.now();
    const isClick = (now - this.lastClickTime) < 200 && !this.runeJustPlaced;

    if (nearestSlot >= 0) {
      this.board.placeRune(rune, nearestSlot);
      this.runeJustPlaced = true;
    } else {
      if (this.dragFromPool) {
        const idx = this.board.runes.indexOf(rune);
        if (idx >= 0) {
          this.board.removeRuneFromSlot(idx);
          this.board.runes.splice(idx, 1);
        }
      } else {
        this.board.removeRuneFromSlot(this.draggingRune);
        rune.startShake();
      }
    }

    if (isClick && rune.isPlaced && !this.runeJustPlaced) {
      this.board.triggerPulse(this.draggingRune);
    }

    this.draggingRune = null;
    this.dragFromPool = false;
    this.checkLevelComplete();
  }

  mouseDragged(): void {
    if (this.draggingRune === null) return;

    const rune = this.board.runes[this.draggingRune];
    if (!rune) return;

    rune.x = this.p.mouseX - this.dragOffsetX;
    rune.y = this.p.mouseY - this.dragOffsetY;
  }

  mouseMoved(): void {
    const mx = this.p.mouseX;
    const my = this.p.mouseY;
    this.resetButton.hovered = mx >= this.resetButton.x && mx <= this.resetButton.x + this.resetButton.w &&
                                my >= this.resetButton.y && my <= this.resetButton.y + this.resetButton.h;
  }

  windowResized(): void {
    this.p.resizeCanvas(window.innerWidth, window.innerHeight);
    const newCenterX = window.innerWidth / 2;
    const newCenterY = window.innerHeight / 2;
    this.board.resize(newCenterX, newCenterY);
    this.runePool = this.createRunePool();
  }

  resetBoard(): void {
    this.board.clearAllRunes();
    setTimeout(() => {
      this.board.runes = [];
    }, 1000);
  }

  checkLevelComplete(): void {
    const target = LEVEL_TARGETS[this.currentLevel - 1] || 4;
    if (this.board.loops.length >= target && !this.isLevelTransitioning && this.currentLevel < 3) {
      this.startLevelTransition();
    }
  }

  startLevelTransition(): void {
    this.isLevelTransitioning = true;
    this.transitionTimer = 2.0;
    this.board.startRotation(Math.PI);
    this.spawnRainParticles();
  }

  spawnRainParticles(): void {
    for (let i = 0; i < 500; i++) {
      setTimeout(() => {
        this.rainParticles.push(new RainParticle(window.innerWidth));
      }, i * 4);
    }
  }

  goToNextLevel(): void {
    this.currentLevel++;
    this.board = new Board(window.innerWidth / 2, window.innerHeight / 2, this.currentLevel);
    this.runePool = this.createRunePool();
    this.isLevelTransitioning = false;
  }

  draw(): void {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.update(dt);
    this.render();
  }

  update(dt: number): void {
    if (this.isLevelTransitioning) {
      this.transitionTimer -= dt;
      if (this.transitionTimer <= 0) {
        this.goToNextLevel();
      }
    }

    this.board.update(dt, this.p.mouseX, this.p.mouseY);

    for (const rune of this.runePool) {
      rune.update(dt);
    }

    this.rainParticles = this.rainParticles.filter(p => {
      p.update(dt, window.innerHeight);
      return !p.isDead(window.innerHeight);
    });
  }

  render(): void {
    this.p.clear();
    this.board.draw(this.p);

    for (const p of this.rainParticles) {
      p.draw(this.p);
    }

    this.drawRunePool();
    this.drawUI();
  }

  drawRunePool(): void {
    for (const rune of this.runePool) {
      rune.draw(this.p);
    }
  }

  drawUI(): void {
    const p = this.p;
    const target = LEVEL_TARGETS[this.currentLevel - 1] || 4;
    const loopCount = this.board.loops.length;

    p.push();

    p.drawingContext.shadowBlur = 20;
    p.drawingContext.shadowColor = '#ddaaff';
    p.fill('#ddaaff');
    p.noStroke();
    p.textSize(28);
    p.textStyle(p.BOLD);
    p.textAlign(p.LEFT, p.TOP);
    p.text(`关卡 ${this.currentLevel}`, 30, 30);

    p.drawingContext.shadowBlur = 10;
    p.drawingContext.shadowColor = '#88ccff';
    p.textSize(18);
    p.textStyle(p.NORMAL);
    p.fill('#aaddff');
    p.text(`已激活闭环: ${loopCount} / ${target}`, 30, 70);

    if (loopCount >= target && this.currentLevel < 3) {
      p.drawingContext.shadowBlur = 15;
      p.drawingContext.shadowColor = '#aaffaa';
      p.fill('#aaffaa');
      p.textSize(16);
      p.text('✓ 达成目标！准备进入下一关...', 30, 100);
    } else if (this.currentLevel >= 3 && loopCount >= target) {
      p.drawingContext.shadowBlur = 15;
      p.drawingContext.shadowColor = '#ffff88';
      p.fill('#ffff88');
      p.textSize(16);
      p.text('🎉 恭喜！已完成所有关卡！', 30, 100);
    }

    this.resetButton.x = window.innerWidth - this.resetButton.w - 30;
    this.resetButton.y = window.innerHeight - this.resetButton.h - 30;

    const btnBg = this.resetButton.hovered ? '#445588' : '#334466';
    const btnAlpha = this.resetButton.hovered ? 'ee' : 'aa';

    p.drawingContext.shadowBlur = this.resetButton.hovered ? 15 : 5;
    p.drawingContext.shadowColor = '#88aaff';
    p.noStroke();
    p.fill(btnBg + btnAlpha);

    const r = 10;
    p.rect(
      this.resetButton.x, this.resetButton.y,
      this.resetButton.w, this.resetButton.h,
      r, r, r, r
    );

    p.drawingContext.shadowBlur = 8;
    p.drawingContext.shadowColor = '#ffffff';
    p.fill('#ffffff');
    p.textSize(16);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('重置石板',
      this.resetButton.x + this.resetButton.w / 2,
      this.resetButton.y + this.resetButton.h / 2 + 1
    );

    p.drawingContext.shadowBlur = 0;
    p.textAlign(p.CENTER, p.BOTTOM);
    p.fill('#6688aa');
    p.textSize(13);
    p.textStyle(p.NORMAL);
    p.text('拖拽符文石到六边形槽位中 · 不同属性相邻会产生能量线 · 点击已放置的符文石激发脉冲',
      window.innerWidth / 2,
      window.innerHeight - 120
    );

    p.pop();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('game-container');
  if (container) {
    new Game(container);
  }
});
