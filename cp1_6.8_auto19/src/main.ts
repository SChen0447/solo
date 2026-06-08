import { Pet } from './pet';
import { UI } from './ui';
import type { ActionType } from './pet';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pet: Pet;
  private ui: UI;
  
  private lastTime: number = 0;
  private animationFrameId: number = 0;
  private isRunning: boolean = false;
  
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private currentFps: number = 0;
  
  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2 + 30;
    
    this.pet = new Pet('小橙', centerX, centerY);
    this.ui = new UI(this.canvas.width, this.canvas.height);
    
    this.setupEventListeners();
    this.resizeCanvas();
  }
  
  private setupEventListeners(): void {
    this.canvas.addEventListener('click', this.handleClick.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
  }
  
  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    const action = this.ui.handleClick(x, y);
    if (action) {
      this.performAction(action);
    }
  }
  
  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;
    
    const action = this.ui.handleClick(x, y);
    if (action) {
      this.performAction(action);
    }
  }
  
  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    this.ui.handleMouseMove(x, y);
  }
  
  private handleResize(): void {
    this.resizeCanvas();
  }
  
  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.key.toLowerCase()) {
      case '1':
      case 'f':
        this.performAction('feed');
        break;
      case '2':
      case 'c':
        this.performAction('clean');
        break;
      case '3':
      case 'p':
        this.performAction('play');
        break;
      case '4':
      case 's':
        this.performAction('sleep');
        break;
    }
  }
  
  private resizeCanvas(): void {
    const container = document.getElementById('game-container');
    if (!container) return;
    
    const maxWidth = Math.min(container.clientWidth - 40, 900);
    const maxHeight = Math.min(container.clientHeight - 40, 600);
    const aspectRatio = 900 / 600;
    
    let width = maxWidth;
    let height = width / aspectRatio;
    
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
    
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    
    this.ui.resize(this.canvas.width, this.canvas.height);
  }
  
  private performAction(action: ActionType): boolean {
    let success = false;
    
    switch (action) {
      case 'feed':
        success = this.pet.feed();
        break;
      case 'clean':
        success = this.pet.clean();
        break;
      case 'play':
        success = this.pet.play();
        break;
      case 'sleep':
        success = this.pet.sleep();
        break;
    }
    
    return success;
  }
  
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.fpsUpdateTime = this.lastTime;
    this.gameLoop(this.lastTime);
  }
  
  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }
  
  private gameLoop(currentTime: number): void {
    if (!this.isRunning) return;
    
    const deltaTime = Math.min(currentTime - this.lastTime, 100);
    this.lastTime = currentTime;
    
    this.frameCount++;
    if (currentTime - this.fpsUpdateTime >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
    }
    
    this.update(deltaTime);
    this.render();
    
    this.animationFrameId = requestAnimationFrame(this.gameLoop.bind(this));
  }
  
  private update(deltaTime: number): void {
    this.pet.update(deltaTime);
    this.ui.update(deltaTime, this.pet);
  }
  
  private render(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ui.render(this.ctx, this.pet);
    
    this.pet.render(this.ctx);
  }
  
  getPet(): Pet {
    return this.pet;
  }
  
  getFPS(): number {
    return this.currentFps;
  }
}

let game: Game;

function init(): void {
  game = new Game();
  game.start();
  
  console.log('🐾 电子宠物养成游戏已启动！');
  console.log('快捷键: F=喂食, C=清洁, P=玩耍, S=睡觉');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export { Game, game };
