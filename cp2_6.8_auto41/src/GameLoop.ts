import { MazeGenerator, MazeState, MazeMode } from './mazeGenerator';

export interface PlayerState {
  x: number;
  y: number;
  radius: number;
  isDead: boolean;
  deathAnimation: number;
  deathFlashCount: number;
}

export interface GameState {
  player: PlayerState;
  distance: number;
  level: number;
  score: number;
  gameOver: boolean;
  isPaused: boolean;
  bpm: number;
  mode: MazeMode;
}

export interface GameLoopCallbacks {
  onGameStateChange: (state: GameState) => void;
  onRender: (ctx: CanvasRenderingContext2D, time: number) => void;
  onModeChange?: (mode: MazeMode) => void;
}

export class GameLoop {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mazeGenerator: MazeGenerator;
  private callbacks: GameLoopCallbacks;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private cellSize: number = 40;
  private playerSpeed: number = 80;
  private scrollOffset: number = 0;
  private totalDistance: number = 0;
  private lastClickTime: number = 0;
  private clickCount: number = 0;
  private currentMode: MazeMode = 'normal';
  private modeChangeTime: number = 0;
  private playerScreenY: number = 0;

  public gameState: GameState;
  public playerState: PlayerState;

  constructor(
    canvas: HTMLCanvasElement,
    mazeGenerator: MazeGenerator,
    callbacks: GameLoopCallbacks
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.mazeGenerator = mazeGenerator;
    this.callbacks = callbacks;

    const mazeState = mazeGenerator.getState();

    this.playerScreenY = canvas.height * 0.75;

    this.gameState = {
      player: {
        x: mazeState.currentHead.x * this.cellSize + this.cellSize / 2,
        y: this.playerScreenY,
        radius: 8,
        isDead: false,
        deathAnimation: 0,
        deathFlashCount: 0
      },
      distance: 0,
      level: 1,
      score: 0,
      gameOver: false,
      isPaused: false,
      bpm: 120,
      mode: 'normal'
    };

    this.playerState = this.gameState.player;
  }

  start(): void {
    if (this.animationId !== null) return;
    this.lastTime = performance.now();
    this.animationId = requestAnimationFrame(this.gameLoop);
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  reset(): void {
    this.mazeGenerator.reset();
    const mazeState = this.mazeGenerator.getState();

    this.gameState = {
      player: {
        x: mazeState.currentHead.x * this.cellSize + this.cellSize / 2,
        y: this.playerScreenY,
        radius: 8,
        isDead: false,
        deathAnimation: 0,
        deathFlashCount: 0
      },
      distance: 0,
      level: 1,
      score: 0,
      gameOver: false,
      isPaused: false,
      bpm: 120,
      mode: 'normal'
    };

    this.scrollOffset = 0;
    this.totalDistance = 0;
    this.playerState = this.gameState.player;
    this.currentMode = 'normal';
    this.clickCount = 0;
    this.lastClickTime = 0;

    this.callbacks.onGameStateChange(this.gameState);
  }

  handleClick(): void {
    if (this.gameState.gameOver || this.gameState.isPaused) return;

    const now = performance.now();

    if (this.lastClickTime > 0) {
      const interval = (now - this.lastClickTime) / 1000;

      this.mazeGenerator.processPulse({
        interval,
        level: this.gameState.level
      });

      const mazeState = this.mazeGenerator.getState();
      if (mazeState.mode !== this.currentMode) {
        this.currentMode = mazeState.mode;
        this.gameState.mode = mazeState.mode;
        this.modeChangeTime = now;
        if (this.callbacks.onModeChange) {
          this.callbacks.onModeChange(mazeState.mode);
        }
      }
    }

    this.lastClickTime = now;
    this.clickCount++;
  }

  private gameLoop = (currentTime: number): void => {
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    this.update(deltaTime, currentTime);
    this.render(currentTime);
    this.callbacks.onRender(this.ctx, currentTime);
    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number, currentTime: number): void {
    const mazeState = this.mazeGenerator.getState();
    const player = this.gameState.player;

    if (player.isDead) {
      player.deathAnimation += deltaTime;
      const flashDuration = 0.2;
      const totalFlashes = 3;
      const totalDuration = flashDuration * totalFlashes * 2;

      if (player.deathAnimation >= totalDuration) {
        this.reset();
        return;
      }
      return;
    }

    if (this.gameState.isPaused || this.gameState.gameOver) {
      return;
    }

    this.scrollOffset += this.playerSpeed * deltaTime;
    this.totalDistance += this.playerSpeed * deltaTime;

    const newDistance = Math.floor(this.totalDistance / this.cellSize);
    if (newDistance > this.gameState.distance) {
      this.gameState.distance = newDistance;
      this.gameState.score = newDistance;

      const newLevel = Math.floor(newDistance / 100) + 1;
      if (newLevel > this.gameState.level) {
        this.gameState.level = newLevel;
        this.gameState.bpm = Math.min(160, 120 + (newLevel - 1) * 8);
      }

      this.callbacks.onGameStateChange({ ...this.gameState });
    }

    while (this.scrollOffset > this.cellSize) {
      this.scrollOffset -= this.cellSize;
      this.mazeGenerator.shiftMazeDown();
    }

    const playerGridX = Math.floor(player.x / this.cellSize);
    const playerGridY = Math.floor(
      (this.playerScreenY + this.scrollOffset) / this.cellSize
    );

    const hitWall = this.checkCollision(
      player,
      playerGridX,
      playerGridY,
      mazeState,
      currentTime
    );

    if (hitWall) {
      player.isDead = true;
      player.deathAnimation = 0;
      player.deathFlashCount = 0;
      this.gameState.gameOver = true;
      this.callbacks.onGameStateChange({ ...this.gameState });
    }
  }

  private checkCollision(
    player: PlayerState,
    gridX: number,
    gridY: number,
    mazeState: MazeState,
    currentTime: number
  ): boolean {
    const checkPoints = [
      { x: player.x - player.radius, y: this.playerScreenY + this.scrollOffset - player.radius },
      { x: player.x + player.radius, y: this.playerScreenY + this.scrollOffset + player.radius },
      { x: player.x, y: this.playerScreenY + this.scrollOffset - player.radius },
      { x: player.x, y: this.playerScreenY + this.scrollOffset + player.radius }
    ];

    for (const point of checkPoints) {
      const gx = Math.floor(point.x / this.cellSize);
      const gy = Math.floor(point.y / this.cellSize);

      if (gx < 0 || gx >= mazeState.columns) {
        return true;
      }

      if (gy < 0 || gy >= mazeState.rows) {
        continue;
      }

      const wallHeight = this.mazeGenerator.getWallHeight(gx, gy, currentTime);
      if (wallHeight > 0.5) {
        return true;
      }
    }

    return false;
  }

  private render(currentTime: number): void {
    const ctx = this.ctx;
    const mazeState = this.mazeGenerator.getState();
    const { width, height } = this.canvas;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    for (let y = -1; y < mazeState.rows + 2; y++) {
      const screenY = y * this.cellSize - this.scrollOffset;

      if (screenY < -this.cellSize || screenY > height) {
        continue;
      }

      for (let x = 0; x < mazeState.columns; x++) {
        const gridY = Math.max(0, Math.min(mazeState.rows - 1, y));
        const wallHeight = this.mazeGenerator.getWallHeight(x, gridY, currentTime);

        if (wallHeight > 0) {
          const wallTop = screenY + this.cellSize * (1 - wallHeight);
          const wallActualHeight = this.cellSize * wallHeight;

          const gradient = ctx.createLinearGradient(
            x * this.cellSize,
            wallTop,
            x * this.cellSize,
            wallTop + wallActualHeight
          );
          gradient.addColorStop(0, '#555555');
          gradient.addColorStop(1, '#222222');

          ctx.fillStyle = gradient;
          ctx.fillRect(
            x * this.cellSize + 1,
            wallTop,
            this.cellSize - 2,
            wallActualHeight
          );

          ctx.fillStyle = '#3a3a3a';
          ctx.fillRect(
            x * this.cellSize + 1,
            wallTop,
            this.cellSize - 2,
            3
          );
        } else {
          ctx.fillStyle = '#111111';
          ctx.fillRect(
            x * this.cellSize,
            screenY,
            this.cellSize,
            this.cellSize
          );
        }
      }
    }

    this.renderPlayer();
  }

  private renderPlayer(): void {
    const ctx = this.ctx;
    const player = this.gameState.player;

    if (player.isDead) {
      const flashDuration = 0.2;
      const flashPhase = Math.floor(player.deathAnimation / flashDuration) % 2;
      if (flashPhase === 0) {
        return;
      }
    }

    ctx.save();
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 20;

    ctx.beginPath();
    ctx.arc(player.x, this.playerScreenY, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#00e5ff';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(player.x, this.playerScreenY, player.radius * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  }

  getCellSize(): number {
    return this.cellSize;
  }

  setCellSize(size: number): void {
    this.cellSize = size;
    const mazeState = this.mazeGenerator.getState();
    this.gameState.player.x = mazeState.currentHead.x * this.cellSize + this.cellSize / 2;
  }

  getPlayerSpeed(): number {
    return this.playerSpeed;
  }

  setPlayerSpeed(speed: number): void {
    this.playerSpeed = speed;
  }

  setCanvasHeight(height: number): void {
    this.playerScreenY = height * 0.75;
  }
}
