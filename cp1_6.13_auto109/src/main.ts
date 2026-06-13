import { InkDropSystem, InkParticle } from './inkDrop.js';
import { FlowerSystem } from './flower.js';

interface CharacterEntity {
  char: string;
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isHovered: boolean;
  isSelected: boolean;
  isFloating: boolean;
  floatProgress: number;
  originalX: number;
  originalY: number;
  floatStartX: number;
  floatStartY: number;
  floatTargetX: number;
  floatTargetY: number;
  hoverProgress: number;
  floatElapsed: number;
}

interface PoemData {
  id: string;
  title: string;
  author: string;
  dynasty: string;
  content: string;
}

type AnimationState = 
  | 'loading'
  | 'idle'
  | 'char_floating'
  | 'ink_spreading'
  | 'petals_falling'
  | 'poem_typing'
  | 'clearing';

interface TypingPoemState {
  text: string;
  displayedChars: number;
  charTimer: number;
  charInterval: number;
  holdTimer: number;
  holdDuration: number;
  fadeTimer: number;
  fadeDuration: number;
  opacity: number;
  phase: 'typing' | 'holding' | 'fading';
}

const POEM_DATA: PoemData = {
  id: 'chunxiao',
  title: '春晓',
  author: '孟浩然',
  dynasty: '唐',
  content: '春眠不觉晓'
};

const CHARACTER_POEM_MAP: { [key: string]: string } = {
  '春': '春风拂槛露华浓',
  '眠': '眠沙鸥鹭不回头',
  '不': '不教胡马度阴山',
  '觉': '觉时枕席非碧山',
  '晓': '晓驾炭车辗冰辙'
};

class AppController {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private inkSystem: InkDropSystem;
  private flowerSystem: FlowerSystem;
  private characters: CharacterEntity[] = [];
  private animationState: AnimationState = 'loading';
  private lastTime: number = 0;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private poemContent: string = POEM_DATA.content;
  private selectedChar: CharacterEntity | null = null;
  private typingState: TypingPoemState | null = null;
  private loadingInk: InkParticle | null = null;
  private loadingProgress: number = 0;
  private devicePixelRatio: number = window.devicePixelRatio || 1;
  private baseFontSize: number = 28;
  private charSpacing: number = 30;
  private clearTimer: number = 0;
  private clearDuration: number = 300;
  private fps: number = 0;
  private frameCount: number = 0;
  private fpsTimer: number = 0;

  constructor() {
    this.canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context');
    }
    this.ctx = ctx;
    
    this.resizeCanvas();
    this.inkSystem = new InkDropSystem(this.canvas.width, this.canvas.height);
    this.flowerSystem = new FlowerSystem(this.canvas.width, this.canvas.height);
    
    this.initCharacters();
    this.bindEvents();
    this.startLoadingAnimation();
  }

  private resizeCanvas(): void {
    const container = this.canvas.parentElement;
    if (!container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    this.canvas.width = width * this.devicePixelRatio;
    this.canvas.height = height * this.devicePixelRatio;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    
    this.ctx.scale(this.devicePixelRatio, this.devicePixelRatio);
    
    this.updateResponsiveParams(width);
    
    if (this.inkSystem) {
      this.inkSystem.resize(width, height);
    }
    if (this.flowerSystem) {
      this.flowerSystem.resize(width, height);
    }
    
    this.positionCharacters();
  }

  private updateResponsiveParams(width: number): void {
    if (width >= 1280) {
      this.baseFontSize = 28;
      this.charSpacing = 30;
    } else if (width >= 768) {
      this.baseFontSize = 24;
      this.charSpacing = 24;
    } else {
      this.baseFontSize = 22;
      this.charSpacing = 20;
    }
  }

  private initCharacters(): void {
    const chars = this.poemContent.split('');
    this.characters = chars.map((char, index) => ({
      char,
      index,
      x: 0,
      y: 0,
      width: 0,
      height: this.baseFontSize * 1.2,
      isHovered: false,
      isSelected: false,
      isFloating: false,
      floatProgress: 0,
      originalX: 0,
      originalY: 0,
      floatStartX: 0,
      floatStartY: 0,
      floatTargetX: 0,
      floatTargetY: 0,
      hoverProgress: 0,
      floatElapsed: 0
    }));
    this.positionCharacters();
  }

  private positionCharacters(): void {
    const canvasWidth = this.canvas.width / this.devicePixelRatio;
    const canvasHeight = this.canvas.height / this.devicePixelRatio;
    
    this.ctx.font = `${this.baseFontSize}px "KaiTi", "STKaiti", "楷体", serif`;
    this.ctx.textBaseline = 'middle';
    
    let totalWidth = 0;
    const charWidths: number[] = [];
    
    for (const char of this.characters) {
      const metrics = this.ctx.measureText(char.char);
      const w = metrics.width + this.charSpacing;
      charWidths.push(w);
      totalWidth += w;
    }
    totalWidth -= this.charSpacing;
    
    let startX = (canvasWidth - totalWidth) / 2;
    const centerY = canvasHeight / 2;
    
    for (let i = 0; i < this.characters.length; i++) {
      const char = this.characters[i];
      const w = charWidths[i] - this.charSpacing;
      char.x = startX;
      char.y = centerY;
      char.width = w;
      char.originalX = startX;
      char.originalY = centerY;
      char.height = this.baseFontSize * 1.2;
      startX += w + this.charSpacing;
    }
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    window.addEventListener('resize', () => this.resizeCanvas());
    
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.handleReset());
    }
  }

  private getCanvasCoords(e: MouseEvent | TouchEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: (clientX - rect.left),
      y: (clientY - rect.top)
    };
  }

  private handleMouseMove(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e);
    this.mouseX = x;
    this.mouseY = y;
    
    if (this.animationState === 'idle' || this.animationState === 'poem_typing') {
      this.updateCharacterHover(x, y);
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const { x, y } = this.getCanvasCoords(e);
    this.mouseX = x;
    this.mouseY = y;
    
    if (this.animationState === 'idle' || this.animationState === 'poem_typing') {
      this.updateCharacterHover(x, y);
      this.handleClickAt(x, y);
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    const { x, y } = this.getCanvasCoords(e);
    this.mouseX = x;
    this.mouseY = y;
    
    if (this.animationState === 'idle' || this.animationState === 'poem_typing') {
      this.updateCharacterHover(x, y);
    }
  }

  private updateCharacterHover(x: number, y: number): void {
    for (const char of this.characters) {
      if (char.isSelected || char.isFloating) {
        char.isHovered = false;
        continue;
      }
      
      const isHovered = this.isPointInChar(x, y, char);
      char.isHovered = isHovered;
    }
  }

  private isPointInChar(x: number, y: number, char: CharacterEntity): boolean {
    const padding = 8;
    return x >= char.x - padding && 
           x <= char.x + char.width + padding &&
           y >= char.y - char.height / 2 - padding && 
           y <= char.y + char.height / 2 + padding;
  }

  private handleClick(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e);
    this.handleClickAt(x, y);
  }

  private handleClickAt(x: number, y: number): void {
    if (this.animationState === 'clearing' || this.animationState === 'loading') return;
    
    if (this.animationState !== 'idle' && this.animationState !== 'poem_typing') {
      if (this.flowerSystem.handleClick(x, y)) {
        return;
      }
      this.startClearAnimation();
      return;
    }
    
    if (this.flowerSystem.handleClick(x, y)) {
      return;
    }
    
    for (const char of this.characters) {
      if (!char.isSelected && !char.isFloating && this.isPointInChar(x, y, char)) {
        if (this.animationState === 'poem_typing' || this.selectedChar) {
          this.startClearAnimation(() => {
            this.selectCharacter(char);
          });
        } else {
          this.selectCharacter(char);
        }
        return;
      }
    }
  }

  private selectCharacter(char: CharacterEntity): void {
    char.isSelected = true;
    char.isFloating = true;
    char.floatProgress = 0;
    char.floatElapsed = 0;
    char.floatStartX = char.x;
    char.floatStartY = char.y;
    char.floatTargetX = this.canvas.width / this.devicePixelRatio / 2;
    char.floatTargetY = this.canvas.height / this.devicePixelRatio / 2;
    this.selectedChar = char;
    this.animationState = 'char_floating';
    
    for (const c of this.characters) {
      c.isHovered = false;
    }
  }

  private startClearAnimation(callback?: () => void): void {
    if (this.animationState === 'clearing') return;
    
    this.animationState = 'clearing';
    this.clearTimer = 0;
    
    const centerX = this.canvas.width / this.devicePixelRatio / 2;
    const centerY = this.canvas.height / this.devicePixelRatio / 2;
    
    this.inkSystem.clear();
    this.flowerSystem.clear(centerX, centerY);
    
    if (this.selectedChar) {
      this.selectedChar.isFloating = false;
      this.selectedChar.isSelected = false;
      this.selectedChar.floatProgress = 0;
    }
    
    this.typingState = null;
    
    setTimeout(() => {
      this.selectedChar = null;
      this.animationState = 'idle';
      if (callback) callback();
    }, this.clearDuration);
  }

  private handleReset(): void {
    this.startClearAnimation(() => {
      this.characters.forEach(char => {
        char.isSelected = false;
        char.isFloating = false;
        char.floatProgress = 0;
        char.x = char.originalX;
        char.y = char.originalY;
      });
      this.selectedChar = null;
      this.typingState = null;
      this.animationState = 'idle';
    });
  }

  private startLoadingAnimation(): void {
    const centerX = this.canvas.width / this.devicePixelRatio / 2;
    const centerY = this.canvas.height / this.devicePixelRatio / 2;
    
    this.loadingInk = this.inkSystem.createInkDrop(centerX, centerY, 5, 80, 1500);
    this.loadingProgress = 0;
    this.animationState = 'loading';
    
    this.animate(performance.now());
  }

  private animate(currentTime: number): void {
    const deltaTime = Math.min(currentTime - this.lastTime, 50);
    this.lastTime = currentTime;
    
    this.updateFPS(deltaTime);
    this.update(deltaTime);
    this.render();
    
    requestAnimationFrame((t) => this.animate(t));
  }

  private updateFPS(deltaTime: number): void {
    this.frameCount++;
    this.fpsTimer += deltaTime;
    if (this.fpsTimer >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;
    }
  }

  private update(deltaTime: number): void {
    this.inkSystem.update(deltaTime);
    this.flowerSystem.update(deltaTime);
    
    for (const char of this.characters) {
      if (char.isHovered && char.hoverProgress < 1) {
        char.hoverProgress = Math.min(1, char.hoverProgress + deltaTime / 300);
      } else if (!char.isHovered && char.hoverProgress > 0) {
        char.hoverProgress = Math.max(0, char.hoverProgress - deltaTime / 300);
      }
    }
    
    switch (this.animationState) {
      case 'loading':
        this.updateLoading(deltaTime);
        break;
      case 'char_floating':
        this.updateCharFloating(deltaTime);
        break;
      case 'ink_spreading':
        this.updateInkSpreading(deltaTime);
        break;
      case 'petals_falling':
        this.updatePetalsFalling(deltaTime);
        break;
      case 'poem_typing':
        this.updatePoemTyping(deltaTime);
        break;
      case 'clearing':
        this.clearTimer += deltaTime;
        break;
    }
  }

  private updateLoading(deltaTime: number): void {
    this.loadingProgress += deltaTime;
    if (this.loadingProgress >= 1500) {
      this.animationState = 'idle';
      this.loadingInk = null;
    }
  }

  private updateCharFloating(deltaTime: number): void {
    if (!this.selectedChar) return;
    
    this.selectedChar.floatElapsed += deltaTime;
    const duration = 800;
    const progress = Math.min(1, this.selectedChar.floatElapsed / duration);
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    
    this.selectedChar.floatProgress = easeProgress;
    this.selectedChar.x = this.selectedChar.floatStartX + 
      (this.selectedChar.floatTargetX - this.selectedChar.floatStartX) * easeProgress;
    this.selectedChar.y = this.selectedChar.floatStartY + 
      (this.selectedChar.floatTargetY - this.selectedChar.floatStartY) * easeProgress;
    
    if (progress >= 1) {
      this.animationState = 'ink_spreading';
      this.inkSystem.createInkDrop(
        this.selectedChar.x,
        this.selectedChar.y,
        20,
        120,
        1500
      );
    }
  }

  private updateInkSpreading(deltaTime: number): void {
    if (!this.selectedChar) return;
    
    const inkParticles = this.inkSystem.getActiveParticleCount();
    if (inkParticles.ink === 0) {
      this.animationState = 'petals_falling';
      const petalCount = this.flowerSystem.getPetalCountPerCorner();
      this.flowerSystem.spawnPetalsFromCorners(petalCount);
      this.startTypingPoem(this.selectedChar.char);
    }
  }

  private updatePetalsFalling(deltaTime: number): void {
    this.updatePoemTyping(deltaTime);
    
    const petalCount = this.flowerSystem.getActiveParticleCount().petals;
    if (petalCount === 0 && this.typingState === null && this.animationState === 'petals_falling') {
      this.animationState = 'poem_typing';
    }
  }

  private startTypingPoem(char: string): void {
    const poemText = CHARACTER_POEM_MAP[char] || '花落知多少';
    this.typingState = {
      text: poemText,
      displayedChars: 0,
      charTimer: 0,
      charInterval: 150,
      holdTimer: 0,
      holdDuration: 3000,
      fadeTimer: 0,
      fadeDuration: 500,
      opacity: 1,
      phase: 'typing'
    };
  }

  private updatePoemTyping(deltaTime: number): void {
    if (!this.typingState) return;
    
    const state = this.typingState;
    
    switch (state.phase) {
      case 'typing':
        state.charTimer += deltaTime;
        if (state.charTimer >= state.charInterval) {
          state.charTimer = 0;
          state.displayedChars++;
          if (state.displayedChars >= state.text.length) {
            state.phase = 'holding';
          }
        }
        break;
        
      case 'holding':
        state.holdTimer += deltaTime;
        if (state.holdTimer >= state.holdDuration) {
          state.phase = 'fading';
        }
        break;
        
      case 'fading':
        state.fadeTimer += deltaTime;
        state.opacity = Math.max(0, 1 - state.fadeTimer / state.fadeDuration);
        if (state.fadeTimer >= state.fadeDuration) {
          this.typingState = null;
          if (this.animationState === 'petals_falling' || this.animationState === 'poem_typing') {
            this.animationState = 'poem_typing';
          }
        }
        break;
    }
  }

  private render(): void {
    const width = this.canvas.width / this.devicePixelRatio;
    const height = this.canvas.height / this.devicePixelRatio;
    
    this.ctx.clearRect(0, 0, width, height);
    
    this.inkSystem.render(this.ctx);
    this.flowerSystem.render(this.ctx);
    this.renderCharacters();
    this.renderTypingPoem();
  }

  private renderCharacters(): void {
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    
    for (const char of this.characters) {
      if (char.isSelected && !char.isFloating) continue;
      
      this.ctx.save();
      
      if (!char.isSelected) {
        this.ctx.save();
        this.ctx.globalAlpha = 0.2;
        this.ctx.font = `${this.baseFontSize}px "KaiTi", "STKaiti", "楷体", serif`;
        this.ctx.fillStyle = '#888888';
        this.ctx.fillText(char.char, char.originalX, char.originalY);
        this.ctx.restore();
      }
      
      if (char.hoverProgress > 0 && !char.isSelected && !char.isFloating) {
        const glowAlpha = char.hoverProgress * 0.3;
        this.ctx.save();
        this.ctx.globalAlpha = glowAlpha;
        this.ctx.fillStyle = '#fffacd';
        const glowPadding = 12;
        this.ctx.fillRect(
          char.x - glowPadding,
          char.y - char.height / 2 - glowPadding,
          char.width + glowPadding * 2,
          char.height + glowPadding * 2
        );
        this.ctx.restore();
        
        this.ctx.save();
        this.ctx.globalAlpha = char.hoverProgress;
        this.ctx.strokeStyle = '#c0392b';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(char.x - 2, char.y + char.height / 2 + 5);
        this.ctx.lineTo(char.x + char.width + 2, char.y + char.height / 2 + 5);
        this.ctx.stroke();
        this.ctx.restore();
      }
      
      this.ctx.font = `${this.baseFontSize}px "KaiTi", "STKaiti", "楷体", serif`;
      
      if (char.isFloating) {
        this.ctx.globalAlpha = 0.8 + char.floatProgress * 0.2;
        const scale = 1 + char.floatProgress * 0.5;
        this.ctx.save();
        this.ctx.translate(char.x + char.width / 2, char.y);
        this.ctx.scale(scale, scale);
        this.ctx.translate(-(char.x + char.width / 2), -char.y);
      }
      
      this.ctx.fillStyle = '#0a0a0a';
      this.renderCharWithFeibai(char);
      
      this.ctx.restore();
    }
    
    if (this.selectedChar && !this.selectedChar.isFloating) {
      this.ctx.save();
      this.ctx.font = `${this.baseFontSize * 1.5}px "KaiTi", "STKaiti", "楷体", serif`;
      this.ctx.fillStyle = '#0a0a0a';
      this.ctx.textAlign = 'center';
      this.renderCharWithFeibai({
        ...this.selectedChar,
        x: this.canvas.width / this.devicePixelRatio / 2 - this.baseFontSize * 0.75,
        width: this.baseFontSize * 1.5
      });
      this.ctx.restore();
    }
  }

  private renderCharWithFeibai(char: { char: string; x: number; y: number; width: number }): void {
    this.ctx.save();
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillText(char.char, char.x, char.y);
    
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.globalAlpha = 0.15;
    
    for (let i = 0; i < 5; i++) {
      const fx = char.x + Math.random() * char.width;
      const fy = char.y - this.baseFontSize * 0.4 + Math.random() * this.baseFontSize * 0.8;
      const fw = 2 + Math.random() * 4;
      const fh = 1 + Math.random() * 2;
      
      this.ctx.beginPath();
      this.ctx.ellipse(fx, fy, fw, fh, Math.random() * Math.PI, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  private renderTypingPoem(): void {
    if (!this.typingState) return;
    
    const state = this.typingState;
    const width = this.canvas.width / this.devicePixelRatio;
    
    this.ctx.save();
    this.ctx.globalAlpha = state.opacity;
    this.ctx.font = '20px "STXingkai", "XingKai SC", "华文行楷", cursive';
    this.ctx.fillStyle = '#c0392b';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    
    const displayText = state.text.substring(0, state.displayedChars);
    const y = 60;
    
    this.ctx.shadowColor = 'rgba(192, 57, 43, 0.3)';
    this.ctx.shadowBlur = 4;
    this.ctx.fillText(displayText, width / 2, y);
    
    if (state.phase === 'typing' && state.displayedChars < state.text.length) {
      const metrics = this.ctx.measureText(displayText);
      this.ctx.fillRect(width / 2 + metrics.width / 2 + 4, y + 2, 2, 20);
    }
    
    this.ctx.restore();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    new AppController();
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
});
