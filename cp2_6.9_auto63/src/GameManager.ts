import { Player } from './Player';
import { Physics } from './Physics';
import { Level } from './Level';
import { Renderer } from './Renderer';
import { GAME_CONFIG, Block, Pole } from './types';

export class GameManager {
  private player: Player;
  private physics: Physics;
  private level: Level;
  private renderer: Renderer;
  private lastTime: number = 0;
  private running: boolean = false;
  private animationFrameId: number = 0;
  private elapsedTime: number = 0;
  private gameWon: boolean = false;
  private magneticInfluences: Map<number, { inRange: boolean; pole: Pole }> = new Map();
  private nextLevelCooldown: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.level = new Level();
    const levelData = this.level.getLevelData();
    this.player = new Player(levelData.playerStart);
    this.physics = new Physics(levelData.worldWidth, levelData.worldHeight);
    this.renderer = new Renderer(canvas, levelData.worldWidth, levelData.worldHeight);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  stop(): void {
    this.running = false;
    if (this.animationFrameId !== 0) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }

  handleKeyDown(key: string): void {
    const k = key.toLowerCase();
    if (k === 'r') {
      this.resetLevel();
      return;
    }
    if (k === ' ' || key === ' ') {
      if (this.level.isCompleted() && !this.gameWon) {
        if (this.nextLevelCooldown <= 0) {
          this.advanceLevel();
        }
        return;
      }
      if (this.gameWon) {
        this.restartGame();
        return;
      }
    }
    this.player.handleKeyDown(key);
  }

  handleKeyUp(key: string): void {
    this.player.handleKeyUp(key);
  }

  private gameLoop = (timestamp: number): void => {
    if (!this.running) return;

    let deltaTime = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;
    if (deltaTime > 0.05) deltaTime = 0.05;
    this.elapsedTime += deltaTime;

    if (this.nextLevelCooldown > 0) {
      this.nextLevelCooldown -= deltaTime;
    }

    this.update(deltaTime);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    const gravity = this.level.getLevelData().gravity;
    const blocks = this.level.getBlocks() as Block[];
    const platforms = this.level.getPlatforms();

    this.level.update(deltaTime);

    if (this.level.isTimeUp() || this.level.isCompleted() || this.gameWon) {
      return;
    }

    this.player.update(deltaTime, gravity);

    const playerState = this.player.getState();
    const physResult = this.physics.update(
      deltaTime,
      playerState as { position: { x: number; y: number }; velocity: { x: number; y: number }; pole: Pole; poleCooldown: number; onGround: boolean; facing: number },
      blocks,
      platforms,
      gravity
    );

    this.player.setOnGround(physResult.playerOnGround);

    this.magneticInfluences.clear();
    for (const block of blocks) {
      const info = this.physics.getMagneticForceInfo(
        playerState as { position: { x: number; y: number }; velocity: { x: number; y: number }; pole: Pole; poleCooldown: number; onGround: boolean; facing: number },
        block
      );
      this.magneticInfluences.set(block.id, info);
      if (info.inRange) {
        this.level.spawnMagneticParticles(block, playerState.pole);
      }
    }

    this.level.checkPlates();

    this.checkExit();
  }

  private checkExit(): void {
    const exit = this.level.getExit();
    if (!exit.unlocked) return;

    const playerState = this.player.getState();
    const px = playerState.position.x;
    const py = playerState.position.y;
    const ps = GAME_CONFIG.PLAYER_SIZE;
    const px1 = px - ps / 2;
    const py1 = py - ps / 2;
    const px2 = px + ps / 2;
    const py2 = py + ps / 2;
    const ex1 = exit.position.x;
    const ey1 = exit.position.y;
    const ex2 = exit.position.x + exit.size.x;
    const ey2 = exit.position.y + exit.size.y;

    if (px1 < ex2 && px2 > ex1 && py1 < ey2 && py2 > ey1) {
      this.level.setLevelCompleted(true);
      this.nextLevelCooldown = 0.5;
    }
  }

  private advanceLevel(): void {
    const hasNext = this.level.nextLevel();
    if (hasNext) {
      const levelData = this.level.getLevelData();
      this.player.reset(levelData.playerStart);
      this.physics.setWorldSize(levelData.worldWidth, levelData.worldHeight);
    } else {
      this.gameWon = true;
    }
  }

  private resetLevel(): void {
    this.level.reset();
    const levelData = this.level.getLevelData();
    this.player.reset(levelData.playerStart);
    this.physics.setWorldSize(levelData.worldWidth, levelData.worldHeight);
    this.gameWon = false;
  }

  private restartGame(): void {
    this.level.loadLevel(0);
    const levelData = this.level.getLevelData();
    this.player.reset(levelData.playerStart);
    this.physics.setWorldSize(levelData.worldWidth, levelData.worldHeight);
    this.gameWon = false;
  }

  private render(): void {
    const playerState = this.player.getState();
    this.renderer.render({
      player: playerState,
      blocks: this.level.getBlocks(),
      plates: this.level.getPlates(),
      exit: this.level.getExit(),
      platforms: this.level.getPlatforms(),
      levelName: this.level.getLevelData().name,
      levelIndex: this.level.getCurrentIndex(),
      totalLevels: this.level.getTotalLevels(),
      timeRemaining: this.level.getTimeRemaining(),
      hasTimeLimit: this.level.hasTimeLimit(),
      timeUp: this.level.isTimeUp(),
      levelComplete: this.level.isCompleted(),
      gameWon: this.gameWon,
      magneticInfluences: this.magneticInfluences,
      elapsedTime: this.elapsedTime,
    });
  }
}
