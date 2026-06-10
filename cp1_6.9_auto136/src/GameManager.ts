import type p5 from 'p5';
import { FragmentMesh, type Fragment } from './FragmentMesh';
import { ParticleSystem } from './ParticleSystem';

const INITIAL_LIVES = 5;
const SCORE_PER_MATCH = 10;
const TOTAL_PAIRS = 12;

export class GameManager {
  private p: p5;
  private fragmentMesh: FragmentMesh;
  private particleSystem: ParticleSystem;
  private score: number = 0;
  private lives: number = INITIAL_LIVES;
  private selectedFragment: Fragment | null = null;
  private isGameOver: boolean = false;
  private isVictory: boolean = false;
  private victoryPhase: number = 0;
  private victoryStartTime: number = 0;
  private isProcessing: boolean = false;
  private restartButton: { x: number; y: number; w: number; h: number; hovered: boolean } = {
    x: 0,
    y: 0,
    w: 160,
    h: 50,
    hovered: false,
  };

  constructor(p: p5) {
    this.p = p;
    this.particleSystem = new ParticleSystem(p);
    this.fragmentMesh = new FragmentMesh(p, this.particleSystem);
  }

  init(canvasWidth: number, canvasHeight: number): void {
    this.score = 0;
    this.lives = INITIAL_LIVES;
    this.selectedFragment = null;
    this.isGameOver = false;
    this.isVictory = false;
    this.victoryPhase = 0;
    this.isProcessing = false;
    this.fragmentMesh.clear();
    this.particleSystem.clear();
    this.fragmentMesh.init(canvasWidth, canvasHeight);
  }

  update(): void {
    if (this.isGameOver) return;

    if (this.isVictory) {
      this.victoryPhase = (this.p.millis() - this.victoryStartTime) / 1000;
      return;
    }

    this.fragmentMesh.update();
    this.particleSystem.update();

    const matched = this.fragmentMesh.getMatchedCount();
    if (matched === TOTAL_PAIRS && !this.isVictory) {
      this.isVictory = true;
      this.victoryStartTime = this.p.millis();
    }
  }

  render(): void {
    const p = this.p;

    this.fragmentMesh.renderBackground();
    this.fragmentMesh.render();
    this.particleSystem.render();
    this.renderHUD();

    if (this.isVictory) {
      this.renderVictory();
    }

    if (this.isGameOver) {
      this.renderGameOver();
    }
  }

  private renderHUD(): void {
    const p = this.p;

    p.push();
    p.textAlign(p.LEFT, p.TOP);
    p.textSize(16);
    p.textFont('Courier New');

    for (let i = 0; i < INITIAL_LIVES; i++) {
      const hx = 30 + i * 28;
      const hy = 25;
      const filled = i < this.lives;
      this.drawHeart(hx, hy, filled);
    }

    p.textAlign(p.RIGHT, p.TOP);
    p.fill('#cccccc');
    p.noStroke();
    p.drawingContext.shadowBlur = 0;
    p.text(`SCORE: ${this.score}`, p.width - 30, 25);

    p.pop();
  }

  private drawHeart(x: number, y: number, filled: boolean): void {
    const p = this.p;
    p.push();
    p.translate(x, y);
    p.noStroke();
    const color = filled ? '#ff3355' : '#444444';
    if (filled) {
      p.drawingContext.shadowBlur = 8;
      p.drawingContext.shadowColor = color;
    }
    p.fill(color);
    p.beginShape();
    p.vertex(0, -4);
    p.bezierVertex(-8, -14, -16, -4, 0, 10);
    p.bezierVertex(16, -4, 8, -14, 0, -4);
    p.endShape(p.CLOSE);
    p.pop();
  }

  private renderGameOver(): void {
    const p = this.p;
    const shakeX = Math.sin(this.p.frameCount * 8) * 2;
    const shakeY = Math.cos(this.p.frameCount * 9) * 2;

    p.push();
    p.fill(0, 0, 0, 200);
    p.rect(0, 0, p.width, p.height);

    p.textAlign(p.CENTER, p.CENTER);
    p.textFont('Courier New');
    p.textSize(40);
    p.fill('#ff3355');
    p.noStroke();
    p.drawingContext.shadowBlur = 20;
    p.drawingContext.shadowColor = '#ff3355';
    p.text('DATA CORRUPTED', p.width / 2 + shakeX, p.height / 2 - 40 + shakeY);

    const btn = this.restartButton;
    btn.x = p.width / 2 - btn.w / 2;
    btn.y = p.height / 2 + 40;

    p.textSize(18);
    p.drawingContext.shadowBlur = btn.hovered ? 15 : 8;
    p.fill(btn.hovered ? '#ff6688' : '#ff3355');
    p.rectMode(p.CORNER);
    p.stroke('#ff3355');
    p.strokeWeight(2);
    p.rect(btn.x, btn.y, btn.w, btn.h, 4);
    p.noStroke();
    p.fill('#ffffff');
    p.textAlign(p.CENTER, p.CENTER);
    p.text('RESTART', p.width / 2, btn.y + btn.h / 2);

    p.pop();
  }

  private renderVictory(): void {
    const p = this.p;
    const t = this.victoryPhase;

    let fadeAlpha = 0;
    if (t > 3) {
      fadeAlpha = Math.min(255, (t - 3) * 200);
    }

    p.push();
    if (fadeAlpha > 0) {
      p.fill(255, 255, 255, fadeAlpha);
      p.rect(0, 0, p.width, p.height);
    }

    if (t > 3.5) {
      const textAlpha = Math.min(1, (t - 3.5) * 2);
      p.textAlign(p.CENTER, p.CENTER);
      p.textFont('Courier New');
      p.textSize(48);
      p.drawingContext.shadowBlur = 30;
      p.drawingContext.shadowColor = '#ffd700';
      const goldR = Math.floor(255 * textAlpha);
      const goldG = Math.floor(215 * textAlpha);
      const goldB = 0;
      p.fill(goldR, goldG, goldB, Math.floor(255 * textAlpha));
      p.text('SYSTEM RESTORED', p.width / 2, p.height / 2);
    }
    p.pop();
  }

  handleMousePressed(mx: number, my: number): void {
    if (this.isGameOver) {
      const btn = this.restartButton;
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        this.init(this.p.width, this.p.height);
      }
      return;
    }

    if (this.isVictory || this.isProcessing) return;

    this.fragmentMesh.handleHover(mx, my);
    const clicked = this.fragmentMesh.handleClick(mx, my);

    if (!clicked) return;

    if (!this.selectedFragment) {
      this.selectedFragment = clicked;
      this.fragmentMesh.selectFragment(clicked);
    } else {
      if (clicked.id === this.selectedFragment.id) {
        this.fragmentMesh.deselectFragment(this.selectedFragment);
        this.selectedFragment = null;
        return;
      }

      this.isProcessing = true;
      const first = this.selectedFragment;
      const second = clicked;

      if (first.shapeHash === second.shapeHash) {
        this.fragmentMesh.triggerMatch(first, second);
        this.score += SCORE_PER_MATCH;
        this.selectedFragment = null;
        setTimeout(() => {
          this.isProcessing = false;
        }, 500);
      } else {
        this.fragmentMesh.triggerMismatch(first, second);
        this.lives = Math.max(0, this.lives - 1);
        this.selectedFragment = null;
        setTimeout(() => {
          this.isProcessing = false;
          if (this.lives <= 0) {
            this.isGameOver = true;
          }
        }, 600);
      }
    }
  }

  handleMouseMoved(mx: number, my: number): void {
    this.fragmentMesh.handleHover(mx, my);

    if (this.isGameOver) {
      const btn = this.restartButton;
      btn.hovered = mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h;
    }
  }
}
