import Phaser from 'phaser';
import { MineGenerator, MineBlock } from '../systems/MineGenerator';
import { ExcavatorController } from '../systems/ExcavatorController';
import { CollisionManager } from '../systems/CollisionManager';
import { HUDManager } from '../ui/HUDManager';

interface FallingRock {
  sprite: Phaser.GameObjects.Rectangle;
  vy: number;
  vx: number;
  active: boolean;
  radius: number;
}

interface LeaderboardEntry {
  score: number;
  depth: number;
  date: string;
}

export class GameScene extends Phaser.Scene {
  private mineGenerator!: MineGenerator;
  private excavator!: ExcavatorController;
  private collisionManager!: CollisionManager;
  private hudManager!: HUDManager;

  private score: number = 0;
  private depth: number = 0;
  private maxDepthReached: number = 0;
  private lowestY: number = 0;

  private collapseTimer: number = 0;
  private collapseInterval: number = 30000;
  private collapseChance: number = 0.3;
  private fallingRocks: FallingRock[] = [];
  private rockPoolSize: number = 20;

  private gameOver: boolean = false;
  private gameOverOverlay!: Phaser.GameObjects.Container;
  private gameOverBlinkTimer: number = 0;
  private gameOverBlinkState: boolean = false;

  private bgGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super('GameScene');
  }

  preload(): void {}

  create(): void {
    this.drawBackground();
    this.initSystems();
    this.initFallingRockPool();
    this.initGameOverOverlay();

    this.time.addEvent({
      delay: 100,
      callback: () => this.lowestY = this.excavator.getBucketWorldPosition().y,
      callbackScope: this
    });
  }

  private drawBackground(): void {
    const { width, height } = this.scale;

    this.bgGraphics = this.add.graphics();

    this.bgGraphics.fillStyle(0x3E2723, 1);
    this.bgGraphics.fillRect(0, 0, width, height);

    const gridSize = 40;
    this.bgGraphics.lineStyle(1, 0x5D4037, 0.4);

    for (let x = 0; x <= width; x += gridSize) {
      this.bgGraphics.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += gridSize) {
      this.bgGraphics.lineBetween(0, y, width, y);
    }

    this.bgGraphics.fillStyle(0x5D4037, 0.6);
    for (let x = gridSize / 2; x <= width; x += gridSize) {
      for (let y = gridSize / 2; y <= height; y += gridSize) {
        this.bgGraphics.fillCircle(x, y, 3);
      }
    }

    const mineAreaWidth = width * 0.7;
    const mineStartX = (width - mineAreaWidth) / 2 + 50;
    const mineEndX = width - 80;
    const mineStartY = height * 0.1;
    const mineHeight = height * 0.7;

    const mineFrame = this.add.graphics();
    mineFrame.lineStyle(6, 0xB87333, 1);
    mineFrame.strokeRect(mineStartX - 10, mineStartY - 10, mineEndX - mineStartX + 20, mineHeight + 20);
    mineFrame.lineStyle(3, 0x5D4037, 1);
    mineFrame.strokeRect(mineStartX - 5, mineStartY - 5, mineEndX - mineStartX + 10, mineHeight + 10);
  }

  private initSystems(): void {
    const { width, height } = this.scale;

    this.mineGenerator = new MineGenerator(this, width, height);
    this.mineGenerator.generate();

    const excavatorX = width * 0.18;
    const excavatorY = height * 0.1;
    this.excavator = new ExcavatorController(this, excavatorX, excavatorY);
    this.excavator.createVisuals();

    this.excavator.setOnHealthChange((health) => {
      this.hudManager.updateHealth(health);
      if (health <= 0 && !this.gameOver) {
        this.triggerGameOver();
      }
    });

    this.excavator.setOnSteamChange((pressure) => {
      this.hudManager.updateSteamPressure(pressure);
    });

    this.collisionManager = new CollisionManager(this, this.excavator, {
      onBlockDestroyed: (_block: MineBlock) => {
        this.checkDepthProgress();
      },
      onScoreGain: (points: number) => {
        this.score += points;
        this.hudManager.updateScore(this.score);
      },
      onDamage: (amount: number) => {
        this.excavator.takeDamage(amount, 200);
      },
      onGoldCollected: () => {
        this.excavator.restoreSteamFromGold();
      }
    });

    const hudX = width - 120;
    const hudY = height / 2;
    this.hudManager = new HUDManager(this, hudX, hudY);

    const initialState = this.excavator.getState();
    this.hudManager.updateAll({
      depth: 0,
      score: 0,
      steamPressure: initialState.steamPressure,
      health: initialState.health
    });
  }

  private initFallingRockPool(): void {
    for (let i = 0; i < this.rockPoolSize; i++) {
      const sprite = this.add.rectangle(-100, -100, 30, 30, 0x5D4037);
      sprite.setStrokeStyle(3, 0x2C1810);
      sprite.setActive(false);
      sprite.setVisible(false);
      this.fallingRocks.push({
        sprite,
        vy: 0,
        vx: 0,
        active: false,
        radius: 18
      });
    }
  }

  private initGameOverOverlay(): void {
    const { width, height } = this.scale;
    this.gameOverOverlay = this.add.container(width / 2, height / 2);
    this.gameOverOverlay.setVisible(false);

    const bgRect = this.add.rectangle(0, 0, width * 0.8, height * 0.6, 0x8B0000, 0.7);
    bgRect.setStrokeStyle(6, 0xB87333);
    this.gameOverOverlay.add(bgRect);

    const glitchEffect = this.add.graphics();
    glitchEffect.fillStyle(0xFF0000, 0.15);
    for (let i = 0; i < 8; i++) {
      const yOffset = -height * 0.25 + i * (height * 0.6 / 8);
      glitchEffect.fillRect(-width * 0.35, yOffset, width * 0.7, 3);
    }
    this.gameOverOverlay.add(glitchEffect);

    const title = this.add.text(0, -80, 'GAME OVER', {
      fontFamily: 'Georgia, serif',
      fontSize: '56px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#8B0000',
      strokeThickness: 6
    });
    title.setOrigin(0.5);
    this.gameOverOverlay.add(title);

    const subtitle = this.add.text(0, -20, '⚠ 系统故障 ⚠', {
      fontFamily: 'Georgia, serif',
      fontSize: '24px',
      color: '#FF5252'
    });
    subtitle.setOrigin(0.5);
    this.gameOverOverlay.add(subtitle);

    const scoreInfo = this.add.text(0, 30, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '20px',
      color: '#D7CCC8'
    });
    scoreInfo.setOrigin(0.5);
    scoreInfo.setName('scoreInfo');
    this.gameOverOverlay.add(scoreInfo);

    const leaderboardTitle = this.add.text(0, 70, '🏆 排行榜 TOP 5', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#FFD700'
    });
    leaderboardTitle.setOrigin(0.5);
    this.gameOverOverlay.add(leaderboardTitle);

    const leaderboardText = this.add.text(0, 100, '', {
      fontFamily: 'Courier New, monospace',
      fontSize: '14px',
      color: '#B87333',
      align: 'center'
    });
    leaderboardText.setOrigin(0.5);
    leaderboardText.setName('leaderboard');
    this.gameOverOverlay.add(leaderboardText);

    const restartHint = this.add.text(0, 180, '点击屏幕重新开始', {
      fontFamily: 'Georgia, serif',
      fontSize: '16px',
      color: '#8D6E63'
    });
    restartHint.setOrigin(0.5);
    this.gameOverOverlay.add(restartHint);
  }

  private checkDepthProgress(): void {
    const bucketPos = this.excavator.getBucketWorldPosition();
    if (bucketPos.y > this.lowestY) {
      this.lowestY = bucketPos.y;
      const pixelDiff = this.lowestY - this.excavator.getState().baseY;
      this.depth = Math.max(0, pixelDiff / 10);
      if (this.depth > this.maxDepthReached) {
        this.maxDepthReached = this.depth;
        this.hudManager.updateDepth(this.depth);
      }
    }
  }

  update(_time: number, delta: number): void {
    if (this.gameOver) {
      this.updateGameOverEffect(delta);
      return;
    }

    this.excavator.update(delta);
    this.collisionManager.updateParticles(delta);
    this.collisionManager.checkCollisions(this.mineGenerator.getAllBlocks());
    this.updateCollapseSystem(delta);
    this.updateFallingRocks(delta);
    this.checkDepthProgress();
  }

  private updateCollapseSystem(delta: number): void {
    this.collapseTimer += delta;
    if (this.collapseTimer >= this.collapseInterval) {
      this.collapseTimer = 0;
      if (Math.random() < this.collapseChance) {
        this.triggerCollapse();
      }
    }
  }

  private triggerCollapse(): void {
    const { width } = this.scale;
    const bucketPos = this.excavator.getBucketWorldPosition();

    const collapseX = Phaser.Math.Clamp(
      bucketPos.x + (Math.random() - 0.5) * 200,
      width * 0.35,
      width * 0.85
    );
    const collapseY = 40;

    const rockCount = Phaser.Math.Between(2, 5);
    let spawned = 0;

    for (const rock of this.fallingRocks) {
      if (!rock.active && spawned < rockCount) {
        rock.active = true;
        rock.sprite.setVisible(true);
        rock.sprite.setActive(true);
        rock.sprite.setPosition(
          collapseX + (Math.random() - 0.5) * 80,
          collapseY + Math.random() * 30
        );
        const size = Phaser.Math.Between(25, 45);
        rock.sprite.setSize(size, size);
        rock.radius = size / 2 + 5;
        rock.vy = 0;
        rock.vx = (Math.random() - 0.5) * 40;
        spawned++;
      }
    }

    this.cameras.main.shake(500, 0.005);
  }

  private updateFallingRocks(delta: number): void {
    const dt = delta / 1000;
    const gravity = 60;
    const { height } = this.scale;

    for (const rock of this.fallingRocks) {
      if (!rock.active) continue;

      rock.vy += gravity * dt;
      rock.sprite.x += rock.vx * dt;
      rock.sprite.y += rock.vy * dt;
      rock.sprite.angle += rock.vx * dt * 0.5;

      const excavatorState = this.excavator.getState();
      if (this.collisionManager.checkRockCollision(
        rock.sprite.x, rock.sprite.y, rock.radius,
        excavatorState.baseX, excavatorState.baseY, 50
      )) {
        this.excavator.takeDamage(20, 500);
        this.cameras.main.shake(500, 0.01);
        this.deactivateRock(rock);
        continue;
      }

      for (const block of this.mineGenerator.getAllBlocks()) {
        if (this.checkRockBlockCollision(rock, block)) {
          this.mineGenerator.destroyBlock(block);
          this.collisionManager.spawnParticles(
            block.x + block.width / 2,
            block.y + block.height / 2,
            block.config.color,
            8
          );
          this.deactivateRock(rock);
          break;
        }
      }

      if (rock.sprite.y > height + 50) {
        this.deactivateRock(rock);
      }
    }
  }

  private checkRockBlockCollision(rock: FallingRock, block: MineBlock): boolean {
    const closestX = Math.max(block.x, Math.min(rock.sprite.x, block.x + block.width));
    const closestY = Math.max(block.y, Math.min(rock.sprite.y, block.y + block.height));
    const dx = rock.sprite.x - closestX;
    const dy = rock.sprite.y - closestY;
    return (dx * dx + dy * dy) < (rock.radius * rock.radius);
  }

  private deactivateRock(rock: FallingRock): void {
    rock.active = false;
    rock.sprite.setActive(false);
    rock.sprite.setVisible(false);
    rock.sprite.setPosition(-100, -100);
  }

  private triggerGameOver(): void {
    this.gameOver = true;
    this.saveToLeaderboard();

    const scoreInfo = this.gameOverOverlay.getByName('scoreInfo') as Phaser.GameObjects.Text;
    if (scoreInfo) {
      scoreInfo.setText(`最终得分: ${this.score}  |  挖掘深度: ${Math.floor(this.maxDepthReached)}m`);
    }

    const leaderboardText = this.gameOverOverlay.getByName('leaderboard') as Phaser.GameObjects.Text;
    if (leaderboardText) {
      leaderboardText.setText(this.getFormattedLeaderboard());
    }

    this.gameOverOverlay.setVisible(true);

    this.input.once('pointerdown', () => {
      this.restartGame();
    });
  }

  private updateGameOverEffect(delta: number): void {
    this.gameOverBlinkTimer += delta;
    if (this.gameOverBlinkTimer >= 500) {
      this.gameOverBlinkTimer = 0;
      this.gameOverBlinkState = !this.gameOverBlinkState;
      this.gameOverOverlay.setAlpha(this.gameOverBlinkState ? 0.7 : 0.3);
    }
  }

  private saveToLeaderboard(): void {
    const storageKey = 'steampunk_excavator_leaderboard';
    let leaderboard: LeaderboardEntry[] = [];

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        leaderboard = JSON.parse(stored);
      }
    } catch (e) {
      leaderboard = [];
    }

    leaderboard.push({
      score: this.score,
      depth: Math.floor(this.maxDepthReached),
      date: new Date().toLocaleDateString()
    });

    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 5);

    try {
      localStorage.setItem(storageKey, JSON.stringify(leaderboard));
    } catch (e) {
      console.warn('Could not save leaderboard');
    }
  }

  private getFormattedLeaderboard(): string {
    const storageKey = 'steampunk_excavator_leaderboard';
    let leaderboard: LeaderboardEntry[] = [];

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        leaderboard = JSON.parse(stored);
      }
    } catch (e) {
      leaderboard = [];
    }

    if (leaderboard.length === 0) {
      return '暂无记录';
    }

    return leaderboard.map((entry, idx) => {
      return `${idx + 1}. ${entry.score}分 | ${entry.depth}m | ${entry.date}`;
    }).join('\n');
  }

  private restartGame(): void {
    this.score = 0;
    this.depth = 0;
    this.maxDepthReached = 0;
    this.gameOver = false;
    this.collapseTimer = 0;

    for (const rock of this.fallingRocks) {
      this.deactivateRock(rock);
    }

    this.gameOverOverlay.setVisible(false);
    this.gameOverOverlay.setAlpha(1);

    this.children.removeAll(true);

    this.drawBackground();
    this.initSystems();
    this.lowestY = this.excavator.getBucketWorldPosition().y;
  }
}
