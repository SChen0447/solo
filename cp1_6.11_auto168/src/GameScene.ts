import { MazeGenerator, FloorCell } from './MazeGenerator';
import { Player, Direction as PlayerDirection } from './Player';
import { TrapManager, Trap } from './TrapManager';

const CELL_SIZE = 15;
const TILE_PX = 46;
const MAZE_PX = 690;
const VIEW_WIDTH = 1024;
const VIEW_HEIGHT = 768;

export class GameScene extends Phaser.Scene {
  mazeGenerator!: MazeGenerator;
  player!: Player;
  trapManager!: TrapManager;
  mazeGrid: number[][] = [];
  keys: { gridX: number; gridY: number; container: Phaser.GameObjects.Container; collected: boolean; glowTween?: Phaser.Tweens.Tween }[] = [];
  chest!: { gridX: number; gridY: number; container: Phaser.GameObjects.Container; lid: Phaser.GameObjects.Rectangle; opened: boolean };
  minimapGraphics!: Phaser.GameObjects.Graphics;
  minimapPlayerDot!: Phaser.GameObjects.Graphics;
  hpHearts: Phaser.GameObjects.Container[] = [];
  keyIcon!: Phaser.GameObjects.Container;
  keyCountText!: Phaser.GameObjects.Text;
  timerText!: Phaser.GameObjects.Text;
  hurtBorder!: Phaser.GameObjects.Graphics;
  keyHintText!: Phaser.GameObjects.Text;
  candleParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  elapsedTime: number = 0;
  gameOver: boolean = false;
  gameWon: boolean = false;
  inputKeys!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key; w: Phaser.Input.Keyboard.Key; s: Phaser.Input.Keyboard.Key; a: Phaser.Input.Keyboard.Key; d: Phaser.Input.Keyboard.Key; space: Phaser.Input.Keyboard.Key; enter: Phaser.Input.Keyboard.Key };
  lastInputCheck: number = 0;
  inputDelay: number = 80;
  overlayContainer!: Phaser.GameObjects.Container;
  overlayButton!: Phaser.GameObjects.Container;
  overlayBg!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('GameScene');
  }

  preload(): void {}

  create(): void {
    this.cameras.main.setBackgroundColor('#000000');

    this.createGradientBackground();
    this.generateMaze();
    this.createMazeGraphics();
    this.createPlayer();
    this.spawnItems();
    this.createTrapManager();
    this.spawnTraps();
    this.setupUI();
    this.setupCandleParticles();
    this.setupInput();
    this.startTimer();
    this.setupOverlay();
  }

  private createGradientBackground(): void {
    const bg = this.add.graphics();
    const centerX = VIEW_WIDTH / 2;
    const centerY = VIEW_HEIGHT / 2;
    const radius = Math.max(VIEW_WIDTH, VIEW_HEIGHT);

    for (let i = radius; i > 0; i -= 10) {
      const t = i / radius;
      const r = Math.floor(26 * (1 - t));
      const g = Math.floor(15 * (1 - t));
      const b = Math.floor(10 * (1 - t));
      bg.fillStyle(Phaser.Display.Color.GetColor(r, g, b));
      bg.fillCircle(centerX, centerY, i);
    }
    bg.setDepth(-100);
  }

  private generateMaze(): void {
    const startTime = performance.now();
    this.mazeGenerator = new MazeGenerator();
    this.mazeGrid = this.mazeGenerator.generate(CELL_SIZE);
    const elapsed = performance.now() - startTime;
    console.log(`迷宫生成耗时: ${elapsed.toFixed(2)}ms`);
  }

  private createMazeGraphics(): void {
    const offsetX = (VIEW_WIDTH - MAZE_PX) / 2;
    const offsetY = (VIEW_HEIGHT - MAZE_PX) / 2;

    const graphics = this.add.graphics();
    graphics.x = offsetX;
    graphics.y = offsetY;

    for (let y = 0; y < this.mazeGrid.length; y++) {
      for (let x = 0; x < this.mazeGrid[y].length; x++) {
        const px = x * TILE_PX;
        const py = y * TILE_PX;

        if (this.mazeGrid[y][x] === 1) {
          graphics.fillStyle(0x3a3a3a);
          graphics.fillRect(px, py, TILE_PX, TILE_PX);

          graphics.fillStyle(0x2a2a2a);
          graphics.fillRect(px + 1, py + 1, TILE_PX - 2, TILE_PX - 2);
          graphics.fillStyle(0x3a3a3a);
          graphics.fillRect(px + 2, py + 2, TILE_PX - 4, TILE_PX - 4);
        } else {
          graphics.fillStyle(0xbababa);
          graphics.fillRect(px, py, TILE_PX, TILE_PX);

          graphics.fillStyle(0xaaaaaa);
          graphics.fillRect(px + 1, py + 1, TILE_PX - 2, TILE_PX - 2);
          graphics.fillStyle(0xbababa);
          graphics.fillRect(px + 2, py + 2, TILE_PX - 4, TILE_PX - 4);

          graphics.lineStyle(1, 0x999999, 0.3);
          graphics.strokeRect(px + 2, py + 2, TILE_PX - 4, TILE_PX - 4);
        }
      }
    }
  }

  private isWall(gridX: number, gridY: number): boolean {
    return !this.mazeGenerator.isWalkable(gridX, gridY);
  }

  private createPlayer(): void {
    const start = this.mazeGenerator.getStartPosition();
    const offsetX = (VIEW_WIDTH - MAZE_PX) / 2;
    const offsetY = (VIEW_HEIGHT - MAZE_PX) / 2;

    this.player = new Player(
      this,
      start.x,
      start.y,
      TILE_PX,
      (x, y) => this.isWall(x, y)
    );
    this.player.container.x += offsetX;
    this.player.container.y += offsetY;
    this.player.container.setDepth(50);
  }

  private spawnItems(): void {
    const floors = this.mazeGenerator.getFloorCells();
    const start = this.mazeGenerator.getStartPosition();

    const filteredFloors = floors.filter(
      f => Math.abs(f.x - start.x) + Math.abs(f.y - start.y) > 5
    );

    for (let i = filteredFloors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filteredFloors[i], filteredFloors[j]] = [filteredFloors[j], filteredFloors[i]];
    }

    const keyPositions = filteredFloors.slice(0, 3);
    const chestPos = filteredFloors[3] || filteredFloors[filteredFloors.length - 1];

    this.keys = [];
    for (const kp of keyPositions) {
      this.createKey(kp.x, kp.y);
    }

    this.createChest(chestPos.x, chestPos.y);
  }

  private createKey(gridX: number, gridY: number): void {
    const offsetX = (VIEW_WIDTH - MAZE_PX) / 2;
    const offsetY = (VIEW_HEIGHT - MAZE_PX) / 2;

    const container = this.add.container(
      offsetX + gridX * TILE_PX + TILE_PX / 2,
      offsetY + gridY * TILE_PX + TILE_PX / 2
    );

    const keySize = TILE_PX * 0.5;

    const head = this.add.circle(-keySize * 0.3, 0, keySize * 0.25, 0xffd700);
    head.setStrokeStyle(2, 0xcc9900);

    const hole = this.add.circle(-keySize * 0.3, 0, keySize * 0.1, 0x1a0f0a);

    const shaft = this.add.rectangle(keySize * 0.1, 0, keySize * 0.45, keySize * 0.15, 0xffd700);
    shaft.setStrokeStyle(1, 0xcc9900);

    const tooth1 = this.add.rectangle(keySize * 0.3, keySize * 0.15, keySize * 0.1, keySize * 0.12, 0xffd700);
    const tooth2 = this.add.rectangle(keySize * 0.42, keySize * 0.15, keySize * 0.08, keySize * 0.1, 0xffd700);

    container.add([head, hole, shaft, tooth1, tooth2]);
    container.setDepth(40);

    const glowTween = this.tweens.add({
      targets: container,
      scale: { from: 0.9, to: 1.1 },
      alpha: { from: 0.8, to: 1 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.keys.push({
      gridX,
      gridY,
      container,
      collected: false,
      glowTween
    });
  }

  private createChest(gridX: number, gridY: number): void {
    const offsetX = (VIEW_WIDTH - MAZE_PX) / 2;
    const offsetY = (VIEW_HEIGHT - MAZE_PX) / 2;

    const container = this.add.container(
      offsetX + gridX * TILE_PX + TILE_PX / 2,
      offsetY + gridY * TILE_PX + TILE_PX / 2
    );

    const chestW = TILE_PX * 0.85;
    const chestH = TILE_PX * 0.75;

    const body = this.add.rectangle(0, chestH * 0.1, chestW, chestH * 0.65, 0x8b4513);
    body.setStrokeStyle(3, 0xffd700);

    const band1 = this.add.rectangle(0, chestH * 0.1, chestW, 4, 0xffd700);
    const band2 = this.add.rectangle(-chestW * 0.25, chestH * 0.1, 4, chestH * 0.6, 0xffd700);
    const band3 = this.add.rectangle(chestW * 0.25, chestH * 0.1, 4, chestH * 0.6, 0xffd700);

    const lid = this.add.rectangle(0, -chestH * 0.25, chestW, chestH * 0.35, 0xa0522d);
    lid.setStrokeStyle(3, 0xffd700);
    lid.setOrigin(0.5, 1);

    const lock = this.add.rectangle(0, chestH * 0.05, chestW * 0.12, chestH * 0.18, 0xffd700);
    lock.setStrokeStyle(1, 0xcc9900);

    container.add([body, band1, band2, band3, lid, lock]);
    container.setDepth(40);
    container.setSize(chestW, chestH);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerdown', () => {
      this.interactChest();
    });

    this.chest = {
      gridX,
      gridY,
      container,
      lid,
      opened: false
    };
  }

  private createTrapManager(): void {
    const isWallCheck = (x: number, y: number) => this.isWall(x, y);
    this.trapManager = new TrapManager(this, TILE_PX, isWallCheck);
  }

  private spawnTraps(): void {
    const start = this.mazeGenerator.getStartPosition();
    const floors = this.mazeGenerator.getFloorCells();

    const farFloors = floors.filter(
      f => Math.abs(f.x - start.x) + Math.abs(f.y - start.y) > 6
    );

    for (let i = farFloors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [farFloors[i], farFloors[j]] = [farFloors[j], farFloors[i]];
    }

    const offsetX = (VIEW_WIDTH - MAZE_PX) / 2;
    const offsetY = (VIEW_HEIGHT - MAZE_PX) / 2;

    const fireCount = 4;
    for (let i = 0; i < fireCount && i < farFloors.length; i++) {
      const pos = farFloors[i];
      const trap = this.trapManager.spawnFireTrap(pos.x, pos.y);
      trap.container.x += offsetX;
      trap.container.y += offsetY;
      trap.container.setDepth(45);
    }

    const rockStart = fireCount;
    const rockCount = 2;
    for (let i = 0; i < rockCount && (rockStart + i) < farFloors.length; i++) {
      const pos = farFloors[rockStart + i];
      const trap = this.trapManager.spawnRockTrap(pos.x, pos.y);
      trap.container.x += offsetX;
      trap.container.y += offsetY;
      trap.container.setDepth(45);
    }
  }

  private setupUI(): void {
    this.setupMinimap();
    this.setupHP();
    this.setupKeyCounter();
    this.setupTimer();
    this.setupHurtBorder();
    this.setupKeyHint();
  }

  private setupMinimap(): void {
    const mapSize = 180;
    const mapX = 20;
    const mapY = (VIEW_HEIGHT - mapSize) / 2;
    const cellSize = mapSize / this.mazeGrid.length;

    const border = this.add.rectangle(
      mapX + mapSize / 2,
      mapY + mapSize / 2,
      mapSize + 8,
      mapSize + 8,
      0x000000,
      0.8
    );
    border.setStrokeStyle(2, 0x8b4513);
    border.setDepth(200);

    this.minimapGraphics = this.add.graphics();
    this.minimapGraphics.x = mapX;
    this.minimapGraphics.y = mapY;
    this.minimapGraphics.setDepth(201);

    for (let y = 0; y < this.mazeGrid.length; y++) {
      for (let x = 0; x < this.mazeGrid[y].length; x++) {
        if (this.mazeGrid[y][x] === 1) {
          this.minimapGraphics.fillStyle(0x3a3a3a);
        } else {
          this.minimapGraphics.fillStyle(0xbababa);
        }
        this.minimapGraphics.fillRect(
          x * cellSize,
          y * cellSize,
          cellSize,
          cellSize
        );
      }
    }

    this.minimapPlayerDot = this.add.graphics();
    this.minimapPlayerDot.x = mapX;
    this.minimapPlayerDot.y = mapY;
    this.minimapPlayerDot.setDepth(202);
  }

  private updateMinimap(): void {
    this.minimapPlayerDot.clear();
    const cellSize = 180 / this.mazeGrid.length;
    this.minimapPlayerDot.fillStyle(0x00ff00);
    this.minimapPlayerDot.fillCircle(
      this.player.state.gridX * cellSize + cellSize / 2,
      this.player.state.gridY * cellSize + cellSize / 2,
      Math.max(cellSize * 0.6, 3)
    );
  }

  private setupHP(): void {
    const hpX = VIEW_WIDTH - 160;
    const hpY = 30;

    for (let i = 0; i < 3; i++) {
      const heart = this.createHeartIcon();
      heart.x = hpX + i * 45;
      heart.y = hpY;
      heart.setDepth(200);
      this.hpHearts.push(heart);
    }
  }

  private createHeartIcon(): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const size = 30;

    const g = this.add.graphics();
    g.fillStyle(0xff0000);

    g.fillCircle(-size * 0.25, -size * 0.1, size * 0.28);
    g.fillCircle(size * 0.25, -size * 0.1, size * 0.28);

    const tri = new Phaser.Geom.Triangle(
      -size * 0.5, 0,
      size * 0.5, 0,
      0, size * 0.45
    );
    g.fillTriangleShape(tri);

    g.lineStyle(2, 0xcc0000);
    g.strokeCircle(-size * 0.25, -size * 0.1, size * 0.28);
    g.strokeCircle(size * 0.25, -size * 0.1, size * 0.28);
    g.strokeTriangleShape(tri);

    const shine = this.add.graphics();
    shine.fillStyle(0xff6666, 0.6);
    shine.fillCircle(-size * 0.32, -size * 0.18, size * 0.08);

    container.add([g, shine]);
    container.setSize(size, size);
    return container;
  }

  private updateHP(): void {
    const hp = this.player.state.hp;
    for (let i = 0; i < this.hpHearts.length; i++) {
      this.hpHearts[i].setVisible(i < hp);
    }
  }

  private setupKeyCounter(): void {
    const x = VIEW_WIDTH - 160;
    const y = 80;

    this.keyIcon = this.createKeyIcon();
    this.keyIcon.x = x;
    this.keyIcon.y = y;
    this.keyIcon.setDepth(200);

    this.keyCountText = this.add.text(
      x + 30,
      y - 12,
      '0 / 3',
      {
        fontFamily: 'Courier New',
        fontSize: '22px',
        color: '#ffd700',
        fontStyle: 'bold'
      }
    );
    this.keyCountText.setDepth(200);
  }

  private createKeyIcon(): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);

    const head = this.add.circle(-7, 0, 9, 0xffd700);
    head.setStrokeStyle(2, 0xcc9900);
    const hole = this.add.circle(-7, 0, 3, 0x1a0f0a);
    const shaft = this.add.rectangle(5, 0, 18, 5, 0xffd700);
    shaft.setStrokeStyle(1, 0xcc9900);
    const t1 = this.add.rectangle(14, 5, 4, 4, 0xffd700);
    const t2 = this.add.rectangle(19, 5, 3, 3, 0xffd700);

    container.add([head, hole, shaft, t1, t2]);
    container.setSize(30, 20);
    return container;
  }

  private updateKeyCount(): void {
    this.keyCountText.setText(`${this.player.state.keys} / 3`);
  }

  private setupTimer(): void {
    const x = VIEW_WIDTH - 60;
    const y = 130;

    const label = this.add.text(
      x - 80,
      y,
      '时间:',
      {
        fontFamily: 'Courier New',
        fontSize: '16px',
        color: '#88ff88'
      }
    );
    label.setDepth(200);

    this.timerText = this.add.text(
      x - 10,
      y,
      '0s',
      {
        fontFamily: 'Courier New',
        fontSize: '20px',
        color: '#00ff00',
        fontStyle: 'bold'
      }
    );
    this.timerText.setDepth(200);
  }

  private setupHurtBorder(): void {
    this.hurtBorder = this.add.graphics();
    this.hurtBorder.setDepth(1000);
    this.hurtBorder.setVisible(false);
  }

  private showHurtBorder(): void {
    this.hurtBorder.clear();
    this.hurtBorder.setVisible(true);

    const borderWidth = 8;
    this.hurtBorder.lineStyle(borderWidth, 0xff0000, 0.8);

    this.hurtBorder.strokeRect(
      borderWidth / 2,
      borderWidth / 2,
      VIEW_WIDTH - borderWidth,
      VIEW_HEIGHT - borderWidth
    );

    this.tweens.add({
      targets: this.hurtBorder,
      alpha: { from: 1, to: 0 },
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.hurtBorder.setVisible(false);
      }
    });
  }

  private setupKeyHint(): void {
    this.keyHintText = this.add.text(
      VIEW_WIDTH / 2,
      VIEW_HEIGHT / 2 - 50,
      '缺少钥匙',
      {
        fontFamily: 'Courier New',
        fontSize: '32px',
        color: '#ff0000',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    this.keyHintText.setOrigin(0.5);
    this.keyHintText.setVisible(false);
    this.keyHintText.setDepth(1500);
  }

  private showKeyHint(): void {
    this.keyHintText.setVisible(true);
    this.keyHintText.setAlpha(1);

    this.tweens.add({
      targets: this.keyHintText,
      alpha: 0,
      delay: 500,
      duration: 500,
      onComplete: () => {
        this.keyHintText.setVisible(false);
      }
    });
  }

  private setupCandleParticles(): void {
    const floors = this.mazeGenerator.getFloorCells();
    const offsetX = (VIEW_WIDTH - MAZE_PX) / 2;
    const offsetY = (VIEW_HEIGHT - MAZE_PX) / 2;

    const candleCount = 25;

    for (let i = 0; i < candleCount; i++) {
      const idx = Math.floor(Math.random() * floors.length);
      const cell = floors[idx];

      const px = offsetX + cell.x * TILE_PX + TILE_PX / 2;
      const py = offsetY + cell.y * TILE_PX + TILE_PX / 2;

      const candle = this.add.circle(
        px + Phaser.Math.Between(-TILE_PX * 0.3, TILE_PX * 0.3),
        py + Phaser.Math.Between(-TILE_PX * 0.3, TILE_PX * 0.3),
        2,
        0xffdd44,
        0.7
      );
      candle.setDepth(30);

      this.tweens.add({
        targets: candle,
        alpha: { from: 0.3, to: 0.9 },
        scale: { from: 0.6, to: 1.4 },
        duration: Phaser.Math.Between(1000, 3000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private setupInput(): void {
    const kb = this.input.keyboard!;
    this.inputKeys = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      w: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      s: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      a: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      d: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      space: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      enter: kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER)
    };
  }

  private startTimer(): void {
    this.elapsedTime = 0;
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (!this.gameOver && !this.gameWon) {
          this.elapsedTime++;
          this.timerText.setText(`${this.elapsedTime}s`);
        }
      }
    });
  }

  private setupOverlay(): void {
    this.overlayContainer = this.add.container(0, 0);
    this.overlayContainer.setDepth(2000);
    this.overlayContainer.setVisible(false);

    this.overlayBg = this.add.rectangle(
      VIEW_WIDTH / 2,
      VIEW_HEIGHT / 2,
      VIEW_WIDTH,
      VIEW_HEIGHT,
      0x000000,
      0.85
    );
    this.overlayContainer.add(this.overlayBg);
  }

  update(time: number, delta: number): void {
    if (this.gameOver || this.gameWon) return;

    this.handleInput(time);
    this.trapManager.update(time);
    this.checkItemPickup();
    this.checkTrapCollision();
    this.updateMinimap();
    this.updatePlayerTrapOffset();
  }

  private handleInput(currentTime: number): void {
    if (currentTime - this.lastInputCheck < this.inputDelay) return;

    let direction: PlayerDirection | null = null;

    if (this.inputKeys.up.isDown || this.inputKeys.w.isDown) {
      direction = 'up';
    } else if (this.inputKeys.down.isDown || this.inputKeys.s.isDown) {
      direction = 'down';
    } else if (this.inputKeys.left.isDown || this.inputKeys.a.isDown) {
      direction = 'left';
    } else if (this.inputKeys.right.isDown || this.inputKeys.d.isDown) {
      direction = 'right';
    }

    if (direction) {
      const moved = this.player.tryMove(direction);
      if (moved) {
        this.lastInputCheck = currentTime + 20;
      } else {
        this.lastInputCheck = currentTime + 100;
      }
    }

    if (this.inputKeys.space.isDown || this.inputKeys.enter.isDown) {
      this.interactChest();
      this.lastInputCheck = currentTime + 200;
    }
  }

  private updatePlayerTrapOffset(): void {
    const offsetX = (VIEW_WIDTH - MAZE_PX) / 2;
    const offsetY = (VIEW_HEIGHT - MAZE_PX) / 2;

    this.player.container.x = this.player.state.pixelX + offsetX;
    this.player.container.y = this.player.state.pixelY + offsetY;

    for (const trap of this.trapManager.traps) {
      trap.container.x = trap.pixelX + offsetX;
      trap.container.y = trap.pixelY + offsetY;
    }
  }

  private checkItemPickup(): void {
    const px = this.player.state.gridX;
    const py = this.player.state.gridY;

    for (const key of this.keys) {
      if (!key.collected && key.gridX === px && key.gridY === py) {
        key.collected = true;
        if (key.glowTween) {
          key.glowTween.stop();
        }
        this.tweens.add({
          targets: key.container,
          scale: 1.5,
          alpha: 0,
          y: key.container.y - 30,
          duration: 300,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            key.container.destroy();
          }
        });
        this.player.collectKey();
        this.updateKeyCount();
      }
    }
  }

  private checkTrapCollision(): void {
    const collision = this.trapManager.checkCollision(
      this.player.state.gridX,
      this.player.state.gridY
    );

    if (collision) {
      const isDead = this.player.takeDamage();
      this.showHurtBorder();
      this.updateHP();

      if (isDead) {
        this.showGameOver();
      }
    }
  }

  private interactChest(): void {
    if (this.chest.opened || this.gameOver || this.gameWon) return;

    const dx = Math.abs(this.player.state.gridX - this.chest.gridX);
    const dy = Math.abs(this.player.state.gridY - this.chest.gridY);

    if (dx <= 1 && dy <= 1) {
      if (this.player.state.keys >= 3) {
        this.openChest();
      } else {
        this.showKeyHint();
      }
    }
  }

  private openChest(): void {
    this.chest.opened = true;

    this.tweens.add({
      targets: this.chest.lid,
      rotation: -Math.PI * 0.7,
      y: this.chest.lid.y - TILE_PX * 0.2,
      duration: 500,
      ease: 'Cubic.easeOut'
    });

    this.time.delayedCall(300, () => {
      this.spawnVictoryParticles();
    });

    this.time.delayedCall(1000, () => {
      this.showVictory();
    });
  }

  private spawnVictoryParticles(): void {
    const offsetX = (VIEW_WIDTH - MAZE_PX) / 2;
    const offsetY = (VIEW_HEIGHT - MAZE_PX) / 2;

    const cx = offsetX + this.chest.gridX * TILE_PX + TILE_PX / 2;
    const cy = offsetY + this.chest.gridY * TILE_PX + TILE_PX / 2;

    const particles = this.add.particles(0, 0, undefined, {
      x: cx,
      y: cy,
      speed: { min: 50, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xffd700, 0xffff00, 0xffaa00],
      lifespan: 1000,
      blendMode: 'ADD',
      quantity: 80,
      frequency: 20,
      duration: 1000
    });

    const light = this.add.circle(cx, cy, 10, 0xffd700, 0.8);
    light.setDepth(1500);

    this.tweens.add({
      targets: light,
      scale: { from: 0.5, to: 30 },
      alpha: { from: 0.9, to: 0 },
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        light.destroy();
      }
    });
  }

  private showVictory(): void {
    this.gameWon = true;
    this.showOverlay('victory');
  }

  private showGameOver(): void {
    this.gameOver = true;
    this.showOverlay('gameover');
  }

  private showOverlay(type: 'victory' | 'gameover'): void {
    this.overlayContainer.removeAll(true);
    this.overlayContainer.add(this.overlayBg);
    this.overlayContainer.setVisible(true);
    this.overlayBg.setAlpha(0);

    this.tweens.add({
      targets: this.overlayBg,
      alpha: type === 'victory' ? 0.75 : 0.85,
      duration: 300
    });

    const isVictory = type === 'victory';

    const title = this.add.text(
      VIEW_WIDTH / 2,
      VIEW_HEIGHT / 2 - 80,
      isVictory ? '恭喜通关' : '游戏结束',
      {
        fontFamily: 'Courier New',
        fontSize: '56px',
        color: isVictory ? '#ffd700' : '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6
      }
    );
    title.setOrigin(0.5);
    title.setAlpha(0);
    title.setDepth(2001);

    this.tweens.add({
      targets: title,
      alpha: 1,
      scale: { from: 0.5, to: 1 },
      duration: 600,
      delay: 100,
      ease: 'Back.easeOut'
    });

    this.overlayContainer.add(title);

    if (isVictory) {
      const timeText = this.add.text(
        VIEW_WIDTH / 2,
        VIEW_HEIGHT / 2 - 10,
        `通关用时: ${this.elapsedTime} 秒`,
        {
          fontFamily: 'Courier New',
          fontSize: '28px',
          color: '#00ff00',
          fontStyle: 'bold'
        }
      );
      timeText.setOrigin(0.5);
      timeText.setAlpha(0);
      this.overlayContainer.add(timeText);

      this.tweens.add({
        targets: timeText,
        alpha: 1,
        duration: 400,
        delay: 400
      });
    }

    const btn = this.createOverlayButton(
      isVictory ? '再来一局' : '重新开始',
      VIEW_WIDTH / 2,
      VIEW_HEIGHT / 2 + 60,
      () => this.resetGame()
    );
    btn.setAlpha(0);
    this.overlayContainer.add(btn);

    this.tweens.add({
      targets: btn,
      alpha: 1,
      duration: 400,
      delay: 600
    });
  }

  private createOverlayButton(
    text: string,
    x: number,
    y: number,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const paddingX = 32;
    const paddingY = 14;

    const label = this.add.text(0, 0, text, {
      fontFamily: 'Courier New',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    label.setOrigin(0.5);

    const bg = this.add.rectangle(
      0,
      0,
      label.width + paddingX * 2,
      label.height + paddingY * 2,
      0x8b4513
    );
    bg.setStrokeStyle(2, 0xffd700);

    container.add([bg, label]);

    container.setSize(bg.width, bg.height);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.setFillStyle(0xa0522d);
      container.setScale(1.03);
    });

    container.on('pointerout', () => {
      bg.setFillStyle(0x8b4513);
      container.setScale(1);
    });

    container.on('pointerdown', () => {
      container.setScale(0.95);
    });

    container.on('pointerup', () => {
      container.setScale(1.03);
      onClick();
    });

    return container;
  }

  private resetGame(): void {
    this.trapManager.clearTraps();

    for (const key of this.keys) {
      if (key.glowTween) key.glowTween.stop();
      key.container.destroy();
    }
    this.keys = [];

    this.chest.container.destroy();
    this.player.destroy();

    this.hpHearts.forEach(h => h.destroy());
    this.hpHearts = [];

    this.overlayContainer.setVisible(false);

    this.gameOver = false;
    this.gameWon = false;
    this.elapsedTime = 0;
    this.timerText?.setText('0s');

    this.generateMaze();
    this.children.removeAll();

    this.createGradientBackground();
    this.createMazeGraphics();
    this.createPlayer();
    this.spawnItems();
    this.createTrapManager();
    this.spawnTraps();
    this.setupUI();
    this.setupCandleParticles();
  }
}
