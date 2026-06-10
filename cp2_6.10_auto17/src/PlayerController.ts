import { CONFIG, COLORS } from './config.js';
import type { Position, Particle } from './Renderer.js';

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface GameCommand {
  type: 'move' | 'interact';
  direction?: 'up' | 'down' | 'left' | 'right';
  target?: Position;
}

export interface ParticlePool {
  particles: Particle[];
  add(particle: Particle): void;
}

export class PlayerController {
  private inputState: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
  };

  private canvas: HTMLCanvasElement;
  private commands: GameCommand[] = [];
  private particlePool: ParticlePool;
  private getMapOffset: () => { x: number; y: number };
  private onRestart: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    particlePool: ParticlePool,
    getMapOffset: () => { x: number; y: number },
    onRestart: () => void
  ) {
    this.canvas = canvas;
    this.particlePool = particlePool;
    this.getMapOffset = getMapOffset;
    this.onRestart = onRestart;
    this.bindEvents();
  }

  private bindEvents(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);

    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        this.onRestart();
      });
    }
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    switch (key) {
      case 'w':
      case 'arrowup':
        this.inputState.up = true;
        e.preventDefault();
        break;
      case 's':
      case 'arrowdown':
        this.inputState.down = true;
        e.preventDefault();
        break;
      case 'a':
      case 'arrowleft':
        this.inputState.left = true;
        e.preventDefault();
        break;
      case 'd':
      case 'arrowright':
        this.inputState.right = true;
        e.preventDefault();
        break;
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    switch (key) {
      case 'w':
      case 'arrowup':
        this.inputState.up = false;
        break;
      case 's':
      case 'arrowdown':
        this.inputState.down = false;
        break;
      case 'a':
      case 'arrowleft':
        this.inputState.left = false;
        break;
      case 'd':
      case 'arrowright':
        this.inputState.right = false;
        break;
    }
  };

  private handleMouseDown = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const offset = this.getMapOffset();
    const worldX = canvasX - offset.x;
    const worldY = canvasY - offset.y;

    this.spawnInteractParticles({ x: worldX, y: worldY });

    this.commands.push({
      type: 'interact',
      target: { x: worldX, y: worldY },
    });
  };

  getInputState(): InputState {
    return { ...this.inputState };
  }

  getMovementVector(): { x: number; y: number } {
    let dx = 0;
    let dy = 0;
    if (this.inputState.up) dy -= 1;
    if (this.inputState.down) dy += 1;
    if (this.inputState.left) dx -= 1;
    if (this.inputState.right) dx += 1;

    if (dx !== 0 && dy !== 0) {
      const invLen = 1 / Math.sqrt(2);
      dx *= invLen;
      dy *= invLen;
    }

    return { x: dx, y: dy };
  }

  getDirection(): 'up' | 'down' | 'left' | 'right' | null {
    const { up, down, left, right } = this.inputState;
    if (up && !down) return 'up';
    if (down && !up) return 'down';
    if (left && !right) return 'left';
    if (right && !left) return 'right';
    return null;
  }

  consumeCommands(): GameCommand[] {
    const cmds = this.commands;
    this.commands = [];
    return cmds;
  }

  spawnMoveParticles(position: Position, direction: { x: number; y: number }): void {
    if (direction.x === 0 && direction.y === 0) return;

    const count = 2;
    for (let i = 0; i < count; i++) {
      const angle = Math.atan2(-direction.y, -direction.x) + (Math.random() - 0.5) * 0.8;
      const speed = 30 + Math.random() * 40;
      this.particlePool.add({
        position: {
          x: position.x + (Math.random() - 0.5) * 8,
          y: position.y + (Math.random() - 0.5) * 8,
        },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        },
        life: CONFIG.PARTICLE_LIFE,
        maxLife: CONFIG.PARTICLE_LIFE,
        color: COLORS.PARTICLE_ARC,
        size: 2 + Math.random() * 2,
      });
    }
  }

  spawnInteractParticles(position: Position): void {
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 50 + Math.random() * 80;
      this.particlePool.add({
        position: { x: position.x, y: position.y },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        },
        life: CONFIG.PARTICLE_LIFE * 1.2,
        maxLife: CONFIG.PARTICLE_LIFE * 1.2,
        color: i % 2 === 0 ? COLORS.PARTICLE_ARC : COLORS.PARTICLE_INTERACT,
        size: 2 + Math.random() * 3,
      });
    }
  }

  spawnDamageParticles(position: Position): void {
    const count = 15;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 100;
      this.particlePool.add({
        position: { x: position.x, y: position.y },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        },
        life: CONFIG.PARTICLE_LIFE * 1.5,
        maxLife: CONFIG.PARTICLE_LIFE * 1.5,
        color: COLORS.WARNING,
        size: 2 + Math.random() * 4,
      });
    }
  }
}
