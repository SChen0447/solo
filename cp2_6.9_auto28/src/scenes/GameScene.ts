import Phaser from 'phaser';
import { Player, type FrameSnapshot } from '../entities/Player';
import { TimeClone } from '../entities/TimeClone';
import { InputManager } from '../utils/InputManager';

interface PlatformConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface LevelConfig {
  platforms: PlatformConfig[];
  start: { x: number; y: number };
  goal: { x: number; y: number };
  switches?: { x: number; y: number; linkedDoor: number }[];
  doors?: { x: number; y: number; width: number; height: number; index: number }[];
  pressurePlates?: { x: number; y: number; linkedDoor: number }[];
}

const LEVELS: LevelConfig[] = [
  {
    platforms: [
      { x: 0, y: 560, width: 200, height: 40 },
      { x: 280, y: 480, width: 120, height: 20 },
      { x: 520, y: 400, width: 120, height: 20 },
      { x: 760, y: 320, width: 200, height: 20 },
      { x: 400, y: 260, width: 100, height: 20 },
      { x: 180, y: 200, width: 140, height: 20 },
    ],
    start: { x: 80, y: 500 },
    goal: { x: 240, y: 160 },
    switches: [{ x: 860, y: 290, linkedDoor: 0 }],
    doors: [{ x: 100, y: 100, width: 20, height: 100, index: 0 }],
  },
  {
    platforms: [
      { x: 0, y: 560, width: 960, height: 40 },
      { x: 150, y: 460, width: 100, height: 20 },
      { x: 320, y: 400, width: 100, height: 20 },
      { x: 500, y: 460, width: 100, height: 20 },
      { x: 680, y: 380, width: 120, height: 20 },
      { x: 850, y: 300, width: 110, height: 20 },
    ],
    start: { x: 60, y: 500 },
    goal: { x: 900, y: 260 },
    pressurePlates: [{ x: 370, y: 380, linkedDoor: 0 }],
    doors: [{ x: 780, y: 280, width: 20, height: 100, index: 0 }],
  },
];

const RECORD_FPS = 15;
const RECORD_DURATION = 3;
const MAX_SNAPSHOTS = RECORD_FPS * RECORD_DURATION;
const SNAPSHOT_INTERVAL = 1000 / RECORD_FPS;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private clones: TimeClone[] = [];
  private inputManager!: InputManager;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private goal!: Phaser.GameObjects.Rectangle;
  private goalFlag!: Phaser.GameObjects.Graphics;
  private switches: { sprite: Phaser.Physics.Arcade.Sprite; graphics: Phaser.GameObjects.Graphics; linkedDoor: number; activated: boolean }[] = [];
  private pressurePlates: { sprite: Phaser.Physics.Arcade.Sprite; graphics: Phaser.GameObjects.Graphics; linkedDoor: number; activated: boolean }[] = [];
  private doors: { sprite: Phaser.Physics.Arcade.Sprite; graphics: Phaser.GameObjects.Graphics; open: boolean }[] = [];

  private snapshots: FrameSnapshot[] = [];
  private isRecording: boolean = false;
  private lastSnapshotTime: number = 0;
  private recordTimer: number = 0;

  private currentLevel: number = 0;
  private levelTimer: number = 0;
  private isPaused: boolean = false;
  private isTransitioning: boolean = false;

  private uiLayer!: Phaser.GameObjects.Container;
  private levelText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private recordIndicator!: Phaser.GameObjects.Graphics;
  private recordBarBg!: Phaser.GameObjects.Graphics;
  private recordBar!: Phaser.GameObjects.Graphics;
  private recordBlinkTween!: Phaser.Tweens.Tween | null = null;
  private transitionOverlay!: Phaser.GameObjects.Rectangle;
  private bgParticles!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super('GameScene');
  }

  public create(): void {
    this.createBackgroundParticles();
    this.inputManager = new InputManager(this);
    this.platforms = this.physics.add.staticGroup();
    this.uiLayer = this.add.container(0, 0);
    this.uiLayer.setDepth(100);
    this.createUI();
    this.createTransitionOverlay();
    this.loadLevel(this.currentLevel);
    this.setupCollisions();
  }

  private createBackgroundParticles(): void {
    const pg = this.add.graphics();
    pg.fillStyle(0xffffff, 0.8);
    pg.fillCircle(2, 2, 2);
    pg.generateTexture('bg-dot', 4, 4);
    pg.destroy();

    this.bgParticles = this.add.particles(480, 300, 'bg-dot', {
      x: { min: 0, max: 960 },
      y: { min: 0, max: 600 },
      speed: { min: 10, max: 25 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.5, end: 1 },
      alpha: { start: 0.2, end: 0.6 },
      lifespan: { min: 4000, max: 8000 },
      quantity: 30,
      blendMode: 'ADD',
    });
    this.bgParticles.setDepth(0);
  }

  private createUI(): void {
    const panelStyle = { fill: '#C9D1D9', fontFamily: 'Courier New, monospace', fontSize: '16px' };

    const leftPanel = this.add.graphics();
    leftPanel.fillStyle(0x1a1127, 0.75);
    leftPanel.fillRoundedRect(16, 16, 180, 68, 12);
    this.uiLayer.add(leftPanel);

    this.levelText = this.add.text(30, 28, '', panelStyle);
    this.timerText = this.add.text(30, 54, '', panelStyle);
    this.uiLayer.add([this.levelText, this.timerText]);

    const rightPanel = this.add.graphics();
    rightPanel.fillStyle(0x1a1127, 0.75);
    rightPanel.fillRoundedRect(960 - 220, 16, 204, 68, 12);
    this.uiLayer.add(rightPanel);

    const recordLabel = this.add.text(960 - 204, 28, 'REC', { fill: '#C9D1D9', fontFamily: 'Courier New, monospace', fontSize: '14px' });
    this.uiLayer.add(recordLabel);

    this.recordIndicator = this.add.graphics();
    this.uiLayer.add(this.recordIndicator);

    this.recordBarBg = this.add.graphics();
    this.recordBarBg.fillStyle(0x3a2948, 1);
    this.recordBarBg.fillRoundedRect(960 - 204, 52, 172, 14, 6);
    this.uiLayer.add(this.recordBarBg);

    this.recordBar = this.add.graphics();
    this.uiLayer.add(this.recordBar);

    this.updateRecordUI();
  }

  private createTransitionOverlay(): void {
    this.transitionOverlay = this.add.rectangle(480, 300, 960, 600, 0x1a1127, 1);
    this.transitionOverlay.setDepth(200);
    this.tweens.add({
      targets: this.transitionOverlay,
      alpha: 0,
      duration: 800,
      ease: 'Power2.easeInOut',
    });
  }

  private loadLevel(index: number): void {
    this.clearLevel();
    const level = LEVELS[index];
    if (!level) return;

    level.platforms.forEach((p) => this.createPlatform(p.x, p.y, p.width, p.height));
    this.platforms.refresh();

    if (!this.player) {
      this.player = new Player(this, level.start.x, level.start.y);
    } else {
      this.player.setStartPosition(level.start.x, level.start.y);
    }

    this.createGoal(level.goal.x, level.goal.y);

    level.switches?.forEach((sw) => this.createSwitch(sw.x, sw.y, sw.linkedDoor));
    level.doors?.forEach((d) => this.createDoor(d.x, d.y, d.width, d.height, d.index));
    level.pressurePlates?.forEach((pp) => this.createPressurePlate(pp.x, pp.y, pp.linkedDoor));

    this.levelTimer = 0;
    this.snapshots = [];
    this.isRecording = false;
    this.updateLevelUI();
    this.updateRecordUI();
  }

  private clearLevel(): void {
    this.platforms.clear(true, true);
    this.switches.forEach((s) => { s.sprite.destroy(); s.graphics.destroy(); });
    this.switches = [];
    this.doors.forEach((d) => { d.sprite.destroy(); d.graphics.destroy(); });
    this.doors = [];
    this.pressurePlates.forEach((p) => { p.sprite.destroy(); p.graphics.destroy(); });
    this.pressurePlates = [];
    this.clones.forEach((c) => c.destroy());
    this.clones = [];
    this.goalFlag?.destroy();
    this.goal?.destroy();
  }

  private createPlatform(x: number, y: number, width: number, height: number): void {
    const g = this.add.graphics();
    const grad = g.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 0x63b8ff);
    grad.addColorStop(1, 0x4a90d9);
    g.fillGradientStyle(0x63b8ff, 0x63b8ff, 0x4a90d9, 0x4a90d9, 1);
    g.fillRoundedRect(0, 0, width, height, 3);
    g.lineStyle(2, 0x9fd4ff, 1);
    g.strokeRoundedRect(0, 0, width, height, 3);
    const texKey = `plat-${x}-${y}-${width}-${height}`;
    g.generateTexture(texKey, width, height);
    g.destroy();
    const sprite = this.platforms.create(x + width / 2, y + height / 2, texKey) as Phaser.Physics.Arcade.Sprite;
    sprite.refreshBody();
  }

  private createGoal(x: number, y: number): void {
    this.goal = this.add.rectangle(x, y, 4, 40, 0x63b8ff, 0.8);
    this.goal.setDepth(5);
    this.goalFlag = this.add.graphics();
    this.goalFlag.fillStyle(0xffcc00, 1);
    this.goalFlag.fillTriangle(x, y - 20, x + 24, y - 12, x, y - 4);
    this.goalFlag.lineStyle(1, 0xffffff, 0.8);
    this.goalFlag.strokeTriangle(x, y - 20, x + 24, y - 12, x, y - 4);
    this.goalFlag.setDepth(6);
  }

  private createSwitch(x: number, y: number, linkedDoor: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x88ff88, 1);
    g.fillRoundedRect(-12, -6, 24, 12, 3);
    g.lineStyle(2, 0xaaffaa, 1);
    g.strokeRoundedRect(-12, -6, 24, 12, 3);
    const texKey = `switch-${x}-${y}`;
    g.generateTexture(texKey, 24, 12);
    g.destroy();
    const sprite = this.physics.add.staticSprite(x, y, texKey);
    sprite.setImmovable(true);
    const gg = this.add.graphics();
    gg.setDepth(4);
    this.switches.push({ sprite, graphics: gg, linkedDoor, activated: false });
  }

  private createDoor(x: number, y: number, width: number, height: number, _index: number): void {
    const g = this.add.graphics();
    g.fillStyle(0xcc6644, 1);
    g.fillRoundedRect(0, 0, width, height, 3);
    g.lineStyle(2, 0xffaa88, 1);
    g.strokeRoundedRect(0, 0, width, height, 3);
    const texKey = `door-${x}-${y}-${width}-${height}`;
    g.generateTexture(texKey, width, height);
    g.destroy();
    const sprite = this.physics.add.staticSprite(x + width / 2, y + height / 2, texKey);
    sprite.setImmovable(true);
    sprite.refreshBody();
    const gg = this.add.graphics();
    gg.setDepth(4);
    this.doors.push({ sprite, graphics: gg, open: false });
  }

  private createPressurePlate(x: number, y: number, linkedDoor: number): void {
    const g = this.add.graphics();
    g.fillStyle(0xffaa44, 1);
    g.fillRoundedRect(-20, -4, 40, 8, 2);
    g.lineStyle(2, 0xffcc88, 1);
    g.strokeRoundedRect(-20, -4, 40, 8, 2);
    const texKey = `plate-${x}-${y}`;
    g.generateTexture(texKey, 40, 8);
    g.destroy();
    const sprite = this.physics.add.staticSprite(x, y, texKey);
    sprite.setImmovable(true);
    const gg = this.add.graphics();
    gg.setDepth(4);
    this.pressurePlates.push({ sprite, graphics: gg, linkedDoor, activated: false });
  }

  private setupCollisions(): void {
    this.physics.add.collider(this.player.sprite, this.platforms);
  }

  private updateCollisions(): void {
    this.doors.forEach((d) => {
      if (!d.open) {
        this.physics.add.collider(this.player.sprite, d.sprite);
      }
    });
    this.clones.forEach((c) => {
      if (c.isActive()) {
        this.physics.add.collider(this.player.sprite, c.sprite);
      }
    });
  }

  public update(_time: number, delta: number): void {
    if (this.isPaused || this.isTransitioning) return;

    this.levelTimer += delta / 1000;
    this.updateLevelUI();

    const input = this.inputManager.getState();
    this.player.update(input.player);

    if (input.recordPressed) {
      this.toggleRecording();
    }

    if (this.isRecording) {
      this.recordTimer += delta;
      if (this.recordTimer >= SNAPSHOT_INTERVAL) {
        this.recordTimer -= SNAPSHOT_INTERVAL;
        this.addSnapshot();
      }
      if (this.snapshots.length >= MAX_SNAPSHOTS) {
        this.stopRecordingAndSpawnClone();
      }
      this.updateRecordUI();
    }

    this.clones.forEach((c) => c.update());
    this.updateCollisions();
    this.checkSwitches();
    this.checkPressurePlates();
    this.checkGoal();
    this.checkBounds();
  }

  private toggleRecording(): void {
    if (this.isRecording) {
      this.stopRecordingAndSpawnClone();
    } else {
      this.startRecording();
    }
  }

  private startRecording(): void {
    this.isRecording = true;
    this.snapshots = [];
    this.recordTimer = 0;
    this.lastSnapshotTime = this.time.now;
    this.addSnapshot();
    this.updateRecordUI();
    this.startRecordBlink();
  }

  private stopRecordingAndSpawnClone(): void {
    this.isRecording = false;
    this.stopRecordBlink();
    if (this.snapshots.length > 1) {
      const clone = new TimeClone(this, this.snapshots);
      this.clones.push(clone);
      clone.startPlayback(() => {
        const idx = this.clones.indexOf(clone);
        if (idx >= 0) this.clones.splice(idx, 1);
      });
    }
    this.snapshots = [];
    this.updateRecordUI();
  }

  private addSnapshot(): void {
    if (this.snapshots.length >= MAX_SNAPSHOTS) {
      this.snapshots.shift();
    }
    this.snapshots.push(this.player.getSnapshot());
  }

  private updateLevelUI(): void {
    this.levelText.setText(`关卡 ${this.currentLevel + 1} / ${LEVELS.length}`);
    this.timerText.setText(`时间 ${this.levelTimer.toFixed(1)}s`);
  }

  private updateRecordUI(): void {
    this.recordIndicator.clear();
    const cx = 960 - 160;
    const cy = 38;
    if (this.isRecording) {
      this.recordIndicator.fillStyle(0xff4444, 1);
    } else {
      this.recordIndicator.fillStyle(0x666666, 1);
    }
    this.recordIndicator.fillCircle(cx, cy, 8);

    this.recordBar.clear();
    let ratio = 0;
    if (this.isRecording) {
      ratio = this.snapshots.length / MAX_SNAPSHOTS;
    }
    this.recordBar.fillStyle(0xff4444, 0.9);
    this.recordBar.fillRoundedRect(960 - 202, 54, 168 * ratio, 10, 4);
  }

  private startRecordBlink(): void {
    this.stopRecordBlink();
    this.recordBlinkTween = this.tweens.add({
      targets: this.recordIndicator,
      alpha: { from: 1, to: 0.3 },
      yoyo: true,
      repeat: -1,
      duration: 400,
    });
  }

  private stopRecordBlink(): void {
    if (this.recordBlinkTween) {
      this.recordBlinkTween.remove();
      this.recordBlinkTween = null;
    }
    this.recordIndicator.setAlpha(1);
  }

  private checkSwitches(): void {
    this.switches.forEach((sw) => {
      if (sw.activated) return;
      const touchPlayer = Phaser.Geom.Intersects.RectangleToRectangle(
        this.player.sprite.getBounds(),
        sw.sprite.getBounds()
      );
      const touchClone = this.clones.some((c) =>
        c.isActive() &&
        Phaser.Geom.Intersects.RectangleToRectangle(c.sprite.getBounds(), sw.sprite.getBounds())
      );
      if (touchPlayer || touchClone) {
        sw.activated = true;
        sw.graphics.clear();
        sw.graphics.fillStyle(0x44ff44, 1);
        sw.graphics.fillRoundedRect(sw.sprite.x - 12, sw.sprite.y - 6, 24, 12, 3);
        const door = this.doors[sw.linkedDoor];
        if (door) {
          door.open = true;
          door.sprite.setAlpha(0.2);
          door.sprite.disableBody();
        }
      }
    });
  }

  private checkPressurePlates(): void {
    this.pressurePlates.forEach((pp) => {
      const touchPlayer = Phaser.Geom.Intersects.RectangleToRectangle(
        this.player.sprite.getBounds(),
        pp.sprite.getBounds()
      );
      const touchClone = this.clones.some((c) =>
        c.isActive() &&
        Phaser.Geom.Intersects.RectangleToRectangle(c.sprite.getBounds(), pp.sprite.getBounds())
      );
      const pressed = touchPlayer || touchClone;
      if (pressed !== pp.activated) {
        pp.activated = pressed;
        pp.graphics.clear();
        if (pressed) {
          pp.graphics.fillStyle(0x44ff44, 1);
          pp.graphics.fillRoundedRect(pp.sprite.x - 20, pp.sprite.y - 2, 40, 4, 2);
        } else {
          pp.graphics.fillStyle(0xffaa44, 1);
          pp.graphics.fillRoundedRect(pp.sprite.x - 20, pp.sprite.y - 4, 40, 8, 2);
        }
        const door = this.doors[pp.linkedDoor];
        if (door) {
          if (pressed) {
            door.open = true;
            door.sprite.setAlpha(0.2);
            door.sprite.disableBody();
          } else {
            door.open = false;
            door.sprite.setAlpha(1);
            door.sprite.enableBody(false, 0, 0, true, true);
          }
        }
      }
    });
  }

  private checkGoal(): void {
    if (!this.goal) return;
    const dist = Phaser.Math.Distance.Between(
      this.player.sprite.x,
      this.player.sprite.y,
      this.goal.x,
      this.goal.y
    );
    if (dist < 30) {
      this.levelComplete();
    }
  }

  private checkBounds(): void {
    if (this.player.sprite.y > 700) {
      this.player.reset();
    }
  }

  private levelComplete(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    this.tweens.add({
      targets: this.transitionOverlay,
      alpha: 1,
      duration: 400,
      ease: 'Power2.easeIn',
      onComplete: () => {
        this.currentLevel++;
        if (this.currentLevel >= LEVELS.length) {
          this.currentLevel = 0;
        }
        this.loadLevel(this.currentLevel);
        this.tweens.add({
          targets: this.transitionOverlay,
          alpha: 0,
          duration: 400,
          ease: 'Power2.easeOut',
          onComplete: () => {
            this.isTransitioning = false;
          },
        });
      },
    });
  }
}
