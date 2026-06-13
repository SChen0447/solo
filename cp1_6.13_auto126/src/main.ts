import { generateGlyphs, matchGlyph, type Point, type Glyph, type MatchResult } from './glyph';
import { Renderer } from './renderer';
import { InteractionHandler } from './interaction';

type GameState = 'MENU' | 'PLAYING' | 'SUCCESS' | 'RESTART';

interface GameStateData {
  currentLevel: number;
  attempts: number;
  currentGlyph: Glyph | null;
  playerStrokes: Point[][];
  currentStroke: Point[];
  matchResult: MatchResult | null;
  uiMessage: string;
  uiMessageTimer: number;
  isAnimating: boolean;
  waitingForNextLevel: boolean;
  nextLevelTimer: number;
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: Renderer;
  private interaction: InteractionHandler;
  private glyphs: Glyph[];
  
  private state: GameState = 'MENU';
  private stateData: GameStateData;
  
  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;

    this.resizeCanvas();
    window.addEventListener('resize', this.handleResize.bind(this));

    this.renderer = new Renderer(this.ctx, this.canvas.width, this.canvas.height);
    this.glyphs = generateGlyphs();

    this.stateData = this.createInitialStateData();
    this.interaction = new InteractionHandler(this.canvas, {
      onStrokeStart: this.handleStrokeStart.bind(this),
      onStrokeMove: this.handleStrokeMove.bind(this),
      onStrokeEnd: this.handleStrokeEnd.bind(this)
    });
  }

  private createInitialStateData(): GameStateData {
    return {
      currentLevel: 1,
      attempts: 0,
      currentGlyph: null,
      playerStrokes: [],
      currentStroke: [],
      matchResult: null,
      uiMessage: '',
      uiMessageTimer: 0,
      isAnimating: false,
      waitingForNextLevel: false,
      nextLevelTimer: 0
    };
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private handleResize(): void {
    this.resizeCanvas();
    this.renderer.resize(window.innerWidth, window.innerHeight);
  }

  public init(): void {
    this.showLoading();
    
    setTimeout(() => {
      this.hideLoading();
      this.startGame();
    }, 1500);
  }

  private showLoading(): void {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.remove('hidden');
    }
  }

  private hideLoading(): void {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.add('hidden');
      setTimeout(() => {
        if (loading && loading.parentNode) {
          loading.parentNode.removeChild(loading);
        }
      }, 500);
    }
  }

  private startGame(): void {
    this.state = 'PLAYING';
    this.stateData.currentLevel = 1;
    this.stateData.attempts = 0;
    this.startLevel(1);
    this.startLoop();
  }

  private startLevel(level: number): void {
    this.stateData.currentLevel = level;
    this.stateData.attempts = 0;
    this.stateData.currentGlyph = this.glyphs[level - 1];
    this.stateData.playerStrokes = [];
    this.stateData.currentStroke = [];
    this.stateData.matchResult = null;
    this.stateData.isAnimating = false;
    this.stateData.waitingForNextLevel = false;

    this.renderer.resetForNewLevel();
    
    const messages = [
      '觉醒吧，初绘者。以手代笔，以心为墨。',
      '古老的力量正在苏醒，继续你的铭刻。',
      '三叉之光，指引前路。',
      '螺旋之境，时空交错。',
      '最终的符文，将开启永恒之门。'
    ];
    
    this.showUIMessage(messages[level - 1], 5);
    this.renderer.showHint(this.stateData.currentGlyph, 3);
  }

  private showUIMessage(message: string, duration: number): void {
    this.stateData.uiMessage = message;
    this.stateData.uiMessageTimer = duration;
  }

  private isPointInStone(point: Point): boolean {
    const bounds = this.renderer.getStoneBounds();
    return point.x >= bounds.x && 
           point.x <= bounds.x + bounds.width &&
           point.y >= bounds.y && 
           point.y <= bounds.y + bounds.height;
  }

  private handleStrokeStart(point: Point): void {
    if (this.state !== 'PLAYING' || this.stateData.isAnimating || this.stateData.waitingForNextLevel) return;
    if (!this.isPointInStone(point)) return;

    this.stateData.currentStroke = [point];
    this.renderer.state.drawingStroke = [point];
    
    const bounds = this.renderer.getStoneBounds();
    const localPoint = {
      x: point.x - bounds.x,
      y: point.y - bounds.y
    };
    this.renderer.addDrawingParticles(point);
  }

  private handleStrokeMove(point: Point): void {
    if (this.state !== 'PLAYING' || this.stateData.isAnimating) return;
    if (this.stateData.currentStroke.length === 0) return;

    if (this.isPointInStone(point)) {
      this.stateData.currentStroke.push(point);
      this.renderer.state.drawingStroke.push(point);
      this.renderer.addDrawingParticles(point);
    }
  }

  private handleStrokeEnd(point: Point): void {
    if (this.state !== 'PLAYING' || this.stateData.isAnimating) return;
    if (this.stateData.currentStroke.length < 5) {
      this.stateData.currentStroke = [];
      this.renderer.state.drawingStroke = [];
      return;
    }

    this.stateData.playerStrokes.push([...this.stateData.currentStroke]);
    
    this.renderer.state.completedStrokes.push({
      points: [...this.stateData.currentStroke],
      solidified: false,
      burnProgress: 0,
      fadeAlpha: 1,
      energized: false
    });

    this.stateData.currentStroke = [];
    this.renderer.state.drawingStroke = [];

    if (this.stateData.currentGlyph && 
        this.stateData.playerStrokes.length >= this.stateData.currentGlyph.strokes.length) {
      setTimeout(() => {
        this.checkMatch();
      }, 600);
    }
  }

  private checkMatch(): void {
    if (!this.stateData.currentGlyph) return;

    this.stateData.isAnimating = true;
    
    const bounds = this.renderer.getStoneBounds();
    const result = matchGlyph(
      this.stateData.playerStrokes,
      this.stateData.currentGlyph,
      bounds.width,
      bounds.height
    );

    this.stateData.matchResult = result;

    if (result.success) {
      this.triggerSuccessAnimation();
    } else {
      this.triggerFailAnimation();
    }
  }

  private triggerSuccessAnimation(): void {
    this.stateData.attempts = 0;
    this.showUIMessage(`匹配度: ${Math.round(this.stateData.matchResult!.score * 100)}% - 符文共鸣！`, 3);
    
    setTimeout(() => {
      this.renderer.startEnergyFlow();
      
      const checkFlowComplete = setInterval(() => {
        if (!this.renderer.state.energyFlow.active && !this.renderer.state.auraWave.active) {
          clearInterval(checkFlowComplete);
          
          setTimeout(() => {
            this.renderer.showLightBridge();
            this.renderer.triggerAurora();
            
            if (this.stateData.currentLevel >= 5) {
              setTimeout(() => {
                this.renderer.triggerVictory();
                this.state = 'SUCCESS';
                this.showUIMessage('所有符文已觉醒！永恒之门为你敞开。', 10);
              }, 1500);
            } else {
              this.stateData.waitingForNextLevel = true;
              this.stateData.nextLevelTimer = 2;
            }
          }, 500);
        }
      }, 100);
    }, 500);

    this.stateData.isAnimating = false;
  }

  private triggerFailAnimation(): void {
    this.stateData.attempts++;
    
    const score = Math.round(this.stateData.matchResult!.score * 100);
    const originPoint = this.stateData.playerStrokes.length > 0 && 
                       this.stateData.playerStrokes[0].length > 0
      ? this.stateData.playerStrokes[0][0]
      : { x: this.renderer.getStoneBounds().x + this.renderer.getStoneBounds().width / 2,
          y: this.renderer.getStoneBounds().y + this.renderer.getStoneBounds().height / 2 };

    this.renderer.triggerFail(originPoint);
    this.stateData.playerStrokes = [];
    this.stateData.currentStroke = [];

    if (this.stateData.attempts >= 3) {
      this.showUIMessage(`匹配度: ${score}% - 符文未共鸣。再试一次，提示已显示。`, 3);
      if (this.stateData.currentGlyph) {
        this.renderer.showHint(this.stateData.currentGlyph, 2);
      }
      this.stateData.attempts = 0;
    } else {
      this.showUIMessage(`匹配度: ${score}% - 符文未共鸣。再试一次。`, 2);
    }

    setTimeout(() => {
      this.stateData.isAnimating = false;
    }, 600);
  }

  private goToNextLevel(): void {
    if (this.stateData.currentLevel < 5) {
      this.startLevel(this.stateData.currentLevel + 1);
    }
  }

  private update(dt: number): void {
    if (this.stateData.uiMessageTimer > 0) {
      this.stateData.uiMessageTimer -= dt;
    }

    if (this.stateData.waitingForNextLevel && this.state === 'PLAYING') {
      this.stateData.nextLevelTimer -= dt;
      if (this.stateData.nextLevelTimer <= 0) {
        this.stateData.waitingForNextLevel = false;
        this.goToNextLevel();
      }
    }
  }

  private render(dt: number): void {
    this.renderer.render(
      dt,
      this.stateData.currentLevel,
      this.stateData.attempts,
      this.stateData.uiMessage,
      this.stateData.uiMessageTimer
    );
  }

  private gameLoop(currentTime: number): void {
    if (!this.isRunning) return;

    const dt = Math.min(0.05, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    this.update(dt);
    this.render(dt);

    this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  private startLoop(): void {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
  }

  private stopLoop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public destroy(): void {
    this.stopLoop();
    this.interaction.destroy();
    window.removeEventListener('resize', this.handleResize.bind(this));
  }
}

const game = new Game();
window.addEventListener('DOMContentLoaded', () => {
  game.init();
});
