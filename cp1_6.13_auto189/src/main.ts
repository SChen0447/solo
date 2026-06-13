import { InteractionManager } from './interaction';
import { Cocoon, CocoonConfig } from './cocoon';
import { EffectsManager } from './effects';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private interaction: InteractionManager;
  private cocoon: Cocoon;
  private effects: EffectsManager;
  private lastTime: number;
  private animationId: number;
  private width: number;
  private height: number;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not supported');
    this.ctx = ctx;
    
    this.width = 0;
    this.height = 0;
    this.lastTime = 0;
    this.animationId = 0;
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    this.interaction = new InteractionManager(this.canvas);
    
    const cocoonConfig = this.getCocoonConfig();
    this.cocoon = new Cocoon(this.ctx, cocoonConfig);
    
    const center = this.cocoon.getCenter();
    const cocoonRadius = cocoonConfig.minorAxis + 60;
    this.effects = new EffectsManager(this.ctx, center, cocoonRadius);
    
    this.canvas.addEventListener('click', this.handleClick.bind(this));
  }

  private getCocoonConfig(): CocoonConfig {
    const viewportHeight = this.height;
    const viewportWidth = this.width;
    
    let majorAxis = viewportHeight * 0.45;
    let minorAxis = viewportWidth * 0.3;
    
    const minMajor = 250;
    const minMinor = 175;
    
    majorAxis = Math.max(majorAxis, minMajor);
    minorAxis = Math.max(minorAxis, minMinor);
    
    if (minorAxis > viewportWidth * 0.45) {
      minorAxis = viewportWidth * 0.4;
    }
    
    return {
      centerX: this.width / 2,
      centerY: this.height / 2,
      majorAxis,
      minorAxis,
      threadCount: 150,
      starCount: 30,
      rotationSpeed: 0.01
    };
  }

  private resize(): void {
    const container = document.getElementById('game-container');
    if (!container) return;
    
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    
    this.ctx.scale(dpr, dpr);
    
    if (this.cocoon && this.effects) {
      const config = this.getCocoonConfig();
      
      (this.cocoon as any).config = config;
      (this.cocoon as any).rotation = 0;
      
      (this.cocoon as any).threads = [];
      (this.cocoon as any).stars = [];
      (this.cocoon as any).initThreads();
      (this.cocoon as any).initStars();
      
      const center = { x: config.centerX, y: config.centerY };
      const cocoonRadius = config.minorAxis + 60;
      this.effects.updateCenter(center, cocoonRadius);
    }
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    const runeClicked = this.effects.handleClick(point);
    if (runeClicked) return;
    
    const star = this.cocoon.checkStarClick(point);
    if (star) {
      const explosion = this.cocoon.explodeStar(star);
      this.effects.createStarDustExplosion(explosion.x, explosion.y, explosion.particles);
      this.effects.playArpeggioSound();
    }
  }

  start(): void {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  private loop(currentTime: number): void {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    this.update(deltaTime);
    this.render();
    
    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }

  update(deltaTime: number): void {
    const interactionState = this.interaction.getState();
    this.cocoon.update(deltaTime, interactionState);
    this.effects.update(deltaTime, interactionState);
  }

  render(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.cocoon.render();
    this.effects.render();
  }

  initAudio(): void {
    this.effects.initAudio();
  }
}

let game: Game;

window.addEventListener('DOMContentLoaded', () => {
  game = new Game();
  
  document.body.addEventListener('click', () => {
    game.initAudio();
  }, { once: true });
  
  game.start();
});
