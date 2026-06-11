import Phaser from 'phaser';
import {
  generateDungeon,
  DungeonData,
  isWalkable,
  getRoomAt,
  Room,
} from './dungeonGenerator';
import { RuneSystem, RuneFragment } from './runeSystem';

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const GAME_AREA_WIDTH = CANVAS_WIDTH * 0.7;
const UI_PANEL_WIDTH = CANVAS_WIDTH * 0.3;
const UI_PANEL_X = GAME_AREA_WIDTH;

const PLAYER_MOVE_DURATION = 150;
const ENEMY_MOVE_DURATION = 250;
const PLAYER_ATTACK_DAMAGE = 8;
const PLAYER_MAX_HP = 50;
const PLAYER_ATTACK = 8;

const COLORS = {
  bg: '#1e1e1e',
  wall: '#4a4a4a',
  floor: '#3b2f1f',
  corridor: '#6b5b4b',
  player: '#42a5f5',
  rune: '#4fc3f7',
  runeDisk: '#1a237e',
  portalClosed: '#6a1b9a',
  portalOpen: '#ffc107',
  hpBar: '#e53935',
  uiPanel: '#2c2c2c',
  uiText: '#e0e0e0',
  uiBorder: '#e0e0e0',
  enemyHit: '#ff0000',
  skeleton: '#d7ccc8',
  slime: '#66bb6a',
  bat: '#8d6e63',
};

type EnemyType = 'skeleton' | 'slime' | 'bat';

interface Enemy {
  id: number;
  type: EnemyType;
  tileX: number;
  tileY: number;
  hp: number;
  maxHp: number;
  attack: number;
  roomId: number;
  sprite?: Phaser.GameObjects.Container;
  isMoving: boolean;
  moveProgress: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  lastTeleportTime: number;
  hitFlashTime: number;
  dying: boolean;
  deathProgress: number;
}

interface Player {
  tileX: number;
  tileY: number;
  hp: number;
  maxHp: number;
  attack: number;
  sprite?: Phaser.GameObjects.Container;
  isMoving: boolean;
  moveProgress: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  attackAnimTime: number;
  attackDirection: { dx: number; dy: number };
  mergeParticlesActive: boolean;
}

interface CombatState {
  active: boolean;
  enemy: Enemy | null;
  turn: 'player' | 'enemy';
  playerAttackTime: number;
  enemyAttackTime: number;
  playerHitFlashTime: number;
}

export class DungeonScene extends Phaser.Scene {
  private dungeon!: DungeonData;
  private runeSystem!: RuneSystem;
  private player!: Player;
  private enemies: Enemy[] = [];
  private tileSprites: Phaser.GameObjects.Rectangle[][] = [];
  private runeSprites: Map<number, Phaser.GameObjects.Container> = new Map();
  private runeDiskSprite?: Phaser.GameObjects.Container;
  private portalSprite?: Phaser.GameObjects.Container;
  private portalLightSprite?: Phaser.GameObjects.Arc;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  private combat: CombatState = {
    active: false,
    enemy: null,
    turn: 'player',
    playerAttackTime: 0,
    enemyAttackTime: 0,
    playerHitFlashTime: 0,
  };

  private uiPanel!: Phaser.GameObjects.Container;
  private playerHpBar!: Phaser.GameObjects.Rectangle;
  private playerHpBarBg!: Phaser.GameObjects.Rectangle;
  private runeSlots: (Phaser.GameObjects.Container | null)[] = [null, null, null];
  private roomCoordText!: Phaser.GameObjects.Text;
  private attackText!: Phaser.GameObjects.Text;
  private playerAvatar!: Phaser.GameObjects.Container;

  private cameraOffsetX: number = 0;
  private cameraOffsetY: number = 0;

  private lastTime: number = 0;
  private pulseAnimElements: Map<Phaser.GameObjects.Container, number> = new Map();

  constructor() {
    super('DungeonScene');
  }

  init(): void {
    this.runeSystem = new RuneSystem();
  }

  preload(): void {}

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.bg);

    this.dungeon = generateDungeon();
    this.runeSystem.initialize(this.dungeon.rooms, this.dungeon.runeRoomIds);

    this.calculateCameraOffset();
    this.createTiles();
    this.createPlayer();
    this.createEnemies();
    this.createRunes();
    this.createPortalAndDisk();
    this.createUI();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasdKeys = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.lastTime = this.time.now;
  }

  private calculateCameraOffset(): void {
    const mapPixelWidth = this.dungeon.width * this.dungeon.tileSize;
    const mapPixelHeight = this.dungeon.height * this.dungeon.tileSize;
    this.cameraOffsetX = (GAME_AREA_WIDTH - mapPixelWidth) / 2;
    this.cameraOffsetY = (CANVAS_HEIGHT - mapPixelHeight) / 2;
  }

  private tileToPixel(tileX: number, tileY: number): { x: number; y: number } {
    return {
      x: this.cameraOffsetX + tileX * this.dungeon.tileSize + this.dungeon.tileSize / 2,
      y: this.cameraOffsetY + tileY * this.dungeon.tileSize + this.dungeon.tileSize / 2,
    };
  }

  private createTiles(): void {
    const ts = this.dungeon.tileSize;
    this.tileSprites = [];

    for (let y = 0; y < this.dungeon.height; y++) {
      this.tileSprites[y] = [];
      for (let x = 0; x < this.dungeon.width; x++) {
        const tile = this.dungeon.tiles[y][x];
        let color = COLORS.wall;
        if (tile.type === 'floor') color = COLORS.floor;
        else if (tile.type === 'corridor') color = COLORS.corridor;

        const px = this.cameraOffsetX + x * ts;
        const py = this.cameraOffsetY + y * ts;
        const rect = this.add.rectangle(px + ts / 2, py + ts / 2, ts, ts, parseInt(color.replace('#', ''), 16));
        rect.setOrigin(0.5);
        this.tileSprites[y][x] = rect;
      }
    }
  }

  private createPlayer(): void {
    const { playerStartX, playerStartY } = this.dungeon;
    this.player = {
      tileX: playerStartX,
      tileY: playerStartY,
      hp: PLAYER_MAX_HP,
      maxHp: PLAYER_MAX_HP,
      attack: PLAYER_ATTACK,
      isMoving: false,
      moveProgress: 0,
      fromX: playerStartX,
      fromY: playerStartY,
      toX: playerStartX,
      toY: playerStartY,
      attackAnimTime: 0,
      attackDirection: { dx: 0, dy: 0 },
      mergeParticlesActive: false,
    };

    const pos = this.tileToPixel(playerStartX, playerStartY);
    const container = this.add.container(pos.x, pos.y);
    const circle = this.add.circle(0, 0, this.dungeon.tileSize * 0.35, parseInt(COLORS.player.replace('#', ''), 16));
    circle.setStrokeStyle(2, 0xffffff, 0.8);
    container.add(circle);
    this.player.sprite = container;
  }

  private createEnemies(): void {
    this.enemies = [];
    const types: EnemyType[] = ['skeleton', 'slime', 'bat'];
    let idCounter = 0;

    for (const roomId of this.dungeon.enemyRoomIds) {
      const room = this.dungeon.rooms.find(r => r.id === roomId);
      if (!room) continue;

      const type = types[Math.floor(Math.random() * types.length)];
      let hp = 20, attack = 3;
      let color = COLORS.skeleton;

      if (type === 'skeleton') {
        hp = 20; attack = 3; color = COLORS.skeleton;
      } else if (type === 'slime') {
        hp = 12; attack = 2; color = COLORS.slime;
      } else if (type === 'bat') {
        hp = 8; attack = 1; color = COLORS.bat;
      }

      const offsets = [
        { dx: 0, dy: 0 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 },
      ];
      const offset = offsets[idCounter % offsets.length];

      const enemy: Enemy = {
        id: idCounter++,
        type,
        tileX: room.centerX + offset.dx,
        tileY: room.centerY + offset.dy,
        hp,
        maxHp: hp,
        attack,
        roomId,
        isMoving: false,
        moveProgress: 0,
        fromX: room.centerX + offset.dx,
        fromY: room.centerY + offset.dy,
        toX: room.centerX + offset.dx,
        toY: room.centerY + offset.dy,
        lastTeleportTime: 0,
        hitFlashTime: 0,
        dying: false,
        deathProgress: 0,
      };

      const pos = this.tileToPixel(enemy.tileX, enemy.tileY);
      const container = this.add.container(pos.x, pos.y);
      let sprite: Phaser.GameObjects.Shape;
      if (type === 'slime') {
        sprite = this.add.ellipse(0, 0, this.dungeon.tileSize * 0.6, this.dungeon.tileSize * 0.45, parseInt(color.replace('#', ''), 16));
      } else if (type === 'bat') {
        sprite = this.add.triangle(0, 0, -14, 6, 0, -14, 14, 6, parseInt(color.replace('#', ''), 16));
      } else {
        sprite = this.add.circle(0, 0, this.dungeon.tileSize * 0.32, parseInt(color.replace('#', ''), 16));
      }
      sprite.setStrokeStyle(2, 0x000000, 0.5);
      container.add(sprite);
      enemy.sprite = container;

      this.enemies.push(enemy);
    }
  }

  private createRunes(): void {
    this.runeSprites.clear();
    for (const fragment of this.runeSystem.getFragments()) {
      if (fragment.collected) continue;
      this.createRuneSprite(fragment);
    }
  }

  private createRuneSprite(fragment: RuneFragment): void {
    const pos = this.tileToPixel(fragment.tileX, fragment.tileY);
    const container = this.add.container(pos.x, pos.y);
    const size = this.dungeon.tileSize * 0.5;

    const glow = this.add.circle(0, 0, size * 0.8, parseInt(fragment.color.replace('#', ''), 16), 0.3);
    const diamond = this.add.polygon(0, 0, [
      0, -size * 0.5, size * 0.4, 0, 0, size * 0.5, -size * 0.4, 0,
    ], parseInt(fragment.color.replace('#', ''), 16), 0.7);
    diamond.setStrokeStyle(2, 0xffffff, 0.8);

    container.add(glow);
    container.add(diamond);
    (container as any).baseAlpha = 0.7;
    (container as any).pulsePhase = Math.random() * Math.PI * 2;
    this.runeSprites.set(fragment.id, container);
  }

  private createPortalAndDisk(): void {
    const exitRoom = this.dungeon.exitRoom;
    const pos = this.tileToPixel(exitRoom.centerX, exitRoom.centerY);

    const portalContainer = this.add.container(pos.x, pos.y);
    const portalBg = this.add.circle(0, 0, 30, parseInt(COLORS.portalClosed.replace('#', ''), 16), 0.6);
    const portalInner = this.add.circle(0, 0, 20, 0x000000, 0.8);
    portalContainer.add(portalBg);
    portalContainer.add(portalInner);
    portalContainer.setVisible(false);
    (portalContainer as any).bg = portalBg;
    this.portalSprite = portalContainer;

    const diskContainer = this.add.container(pos.x, pos.y);
    const disk = this.add.circle(0, 0, 40, parseInt(COLORS.runeDisk.replace('#', ''), 16), 0.8);
    disk.setStrokeStyle(3, 0xffffff, 0.5);

    const ringGraphics = this.add.graphics();
    ringGraphics.lineStyle(2, 0xffffff, 0.8);
    ringGraphics.strokeCircle(0, 0, 45);
    (diskContainer as any).ring = ringGraphics;

    diskContainer.add(disk);
    diskContainer.add(ringGraphics);
    diskContainer.setVisible(false);
    this.runeDiskSprite = diskContainer;
  }

  private createUI(): void {
    this.uiPanel = this.add.container(UI_PANEL_X, 0);
    const bg = this.add.rectangle(
      UI_PANEL_WIDTH / 2,
      CANVAS_HEIGHT / 2,
      UI_PANEL_WIDTH,
      CANVAS_HEIGHT,
      parseInt(COLORS.uiPanel.replace('#', ''), 16)
    );
    this.uiPanel.add(bg);

    let yOffset = 40;
    const centerX = UI_PANEL_WIDTH / 2;

    this.playerAvatar = this.add.container(centerX, yOffset);
    const avatarBg = this.add.circle(0, 0, 34, 0x000000, 0.5);
    avatarBg.setStrokeStyle(3, parseInt(COLORS.uiBorder.replace('#', ''), 16), 0.5);
    const avatarCircle = this.add.circle(0, 0, 28, parseInt(COLORS.player.replace('#', ''), 16));
    avatarCircle.setStrokeStyle(2, 0xffffff, 0.6);
    this.playerAvatar.add(avatarBg);
    this.playerAvatar.add(avatarCircle);
    this.uiPanel.add(this.playerAvatar);

    yOffset += 90;

    const hpLabel = this.addText(centerX, yOffset, 'HP');
    yOffset += 25;
    this.uiPanel.add(hpLabel);

    const barWidth = UI_PANEL_WIDTH - 60;
    const barHeight = 20;
    this.playerHpBarBg = this.add.rectangle(centerX, yOffset, barWidth, barHeight, 0x000000, 0.7);
    this.playerHpBarBg.setStrokeStyle(2, parseInt(COLORS.uiBorder.replace('#', ''), 16), 0.6);
    this.playerHpBar = this.add.rectangle(centerX - barWidth / 2, yOffset, barWidth, barHeight, parseInt(COLORS.hpBar.replace('#', ''), 16));
    this.playerHpBar.setOrigin(0, 0.5);
    this.uiPanel.add(this.playerHpBarBg);
    this.uiPanel.add(this.playerHpBar);

    yOffset += 45;

    const roomLabel = this.addText(centerX, yOffset, 'ROOM');
    yOffset += 25;
    this.uiPanel.add(roomLabel);
    this.roomCoordText = this.addText(centerX, yOffset, '(0, 0)');
    yOffset += 35;
    this.uiPanel.add(this.roomCoordText);

    const runeLabel = this.addText(centerX, yOffset, 'RUNES');
    yOffset += 30;
    this.uiPanel.add(runeLabel);

    const slotSize = 44;
    const slotGap = 20;
    const totalWidth = 3 * slotSize + 2 * slotGap;
    const startX = centerX - totalWidth / 2 + slotSize / 2;

    for (let i = 0; i < 3; i++) {
      const slotX = startX + i * (slotSize + slotGap);
      const slotContainer = this.add.container(slotX, yOffset);
      const slotBg = this.add.circle(0, 0, slotSize / 2, 0x000000, 0.8);
      slotBg.setStrokeStyle(2, parseInt(COLORS.uiBorder.replace('#', ''), 16), 0.5);
      slotContainer.add(slotBg);
      (slotContainer as any).bg = slotBg;
      this.runeSlots[i] = slotContainer;
      this.uiPanel.add(slotContainer);
    }

    yOffset += 60;

    const atkLabel = this.addText(centerX, yOffset, 'ATTACK');
    yOffset += 25;
    this.uiPanel.add(atkLabel);
    this.attackText = this.addText(centerX, yOffset, `${PLAYER_ATTACK}`);
    this.uiPanel.add(this.attackText);

    this.updateUI();
  }

  private addText(x: number, y: number, text: string): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      fontFamily: "'Press Start 2P', 'Courier New', monospace",
      fontSize: '14px',
      color: COLORS.uiText,
      align: 'center',
    }).setOrigin(0.5).setShadow(2, 2, 'rgba(0,0,0,0.8)', 1, true, true);
  }

  private updateUI(): void {
    const hpRatio = Math.max(0, this.player.hp / this.player.maxHp);
    const targetWidth = (UI_PANEL_WIDTH - 60) * hpRatio;
    const currentWidth = this.playerHpBar.width;
    const newWidth = currentWidth + (targetWidth - currentWidth) * 0.15;
    this.playerHpBar.width = Math.max(0, newWidth);

    const room = getRoomAt(this.dungeon, this.player.tileX, this.player.tileY);
    if (room) {
      this.roomCoordText.setText(`(${room.gridX}, ${room.gridY})`);
    } else {
      this.roomCoordText.setText('(---)');
    }

    const fragments = this.runeSystem.getFragments();
    for (let i = 0; i < 3; i++) {
      const slot = this.runeSlots[i];
      if (!slot) continue;
      const fragment = fragments[i];
      if (fragment && fragment.collected) {
        if ((slot as any).rune === undefined) {
          const diamond = this.add.polygon(0, 0, [
            0, -14, 11, 0, 0, 14, -11, 0,
          ], parseInt(fragment.color.replace('#', ''), 16), 0.9);
          diamond.setStrokeStyle(2, 0xffffff, 0.8);
          slot.add(diamond);
          (slot as any).rune = diamond;
        }
      }
    }

    this.attackText.setText(`${this.player.attack}`);
  }

  public update(time: number): void {
    const deltaTime = time - this.lastTime;
    this.lastTime = time;
    const dt = Math.min(deltaTime, 50);

    if (!this.combat.active) {
      this.handlePlayerInput();
    }

    this.updatePlayer(dt);
    this.updateEnemies(dt);
    this.updateCombat(dt);
    this.updateRuneAnimations(dt);
    this.updatePortalAndDisk(dt);
    this.updatePulseAnimations(dt);
    this.runeSystem.update(dt);

    this.checkRuneCollection();
    this.checkRuneDiskInteraction(dt);
    this.checkPortalInteraction();

    this.updateUI();
  }

  private handlePlayerInput(): void {
    if (this.player.isMoving) return;

    let dx = 0, dy = 0;
    if (this.cursors.left.isDown || this.wasdKeys.A.isDown) dx = -1;
    else if (this.cursors.right.isDown || this.wasdKeys.D.isDown) dx = 1;
    else if (this.cursors.up.isDown || this.wasdKeys.W.isDown) dy = -1;
    else if (this.cursors.down.isDown || this.wasdKeys.S.isDown) dy = 1;

    if (dx !== 0 || dy !== 0) {
      this.tryMovePlayer(dx, dy);
    }
  }

  private tryMovePlayer(dx: number, dy: number): void {
    const newX = this.player.tileX + dx;
    const newY = this.player.tileY + dy;

    const enemy = this.enemies.find(e => !e.dying && e.tileX === newX && e.tileY === newY);
    if (enemy) {
      this.startCombat(enemy, dx, dy);
      return;
    }

    if (!isWalkable(this.dungeon, newX, newY)) return;

    this.player.fromX = this.player.tileX;
    this.player.fromY = this.player.tileY;
    this.player.toX = newX;
    this.player.toY = newY;
    this.player.isMoving = true;
    this.player.moveProgress = 0;
  }

  private updatePlayer(dt: number): void {
    if (this.player.isMoving) {
      this.player.moveProgress += dt / PLAYER_MOVE_DURATION;
      if (this.player.moveProgress >= 1) {
        this.player.moveProgress = 1;
        this.player.tileX = this.player.toX;
        this.player.tileY = this.player.toY;
        this.player.isMoving = false;
      }
      const t = this.player.moveProgress;
      const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const px = this.player.fromX + (this.player.toX - this.player.fromX) * easeT;
      const py = this.player.fromY + (this.player.toY - this.player.fromY) * easeT;
      const pos = this.tileToPixel(px, py);

      let offsetX = 0, offsetY = 0;
      if (this.player.attackAnimTime > 0) {
        const at = 1 - this.player.attackAnimTime / 200;
        const lunge = Math.sin(at * Math.PI) * this.dungeon.tileSize * 0.4;
        offsetX = this.player.attackDirection.dx * lunge;
        offsetY = this.player.attackDirection.dy * lunge;
      }

      if (this.player.sprite) {
        this.player.sprite.setPosition(pos.x + offsetX, pos.y + offsetY);
        if (this.player.attackAnimTime > 0 && this.player.attackAnimTime % 40 < 20) {
          this.player.sprite.setAlpha(0.5);
        } else {
          this.player.sprite.setAlpha(1);
        }
      }
    }

    if (this.player.attackAnimTime > 0) {
      this.player.attackAnimTime = Math.max(0, this.player.attackAnimTime - dt);
      if (this.player.attackAnimTime === 0 && !this.player.isMoving && this.player.sprite) {
        const pos = this.tileToPixel(this.player.tileX, this.player.tileY);
        this.player.sprite.setPosition(pos.x, pos.y);
        this.player.sprite.setAlpha(1);
      }
    }

    if (this.runeSystem.getState() === 'merging' && this.player.sprite) {
      if (Math.random() < 0.3) {
        const pos = this.tileToPixel(this.player.tileX, this.player.tileY);
        const particle = this.add.circle(
          pos.x + (Math.random() - 0.5) * 20,
          pos.y + (Math.random() - 0.5) * 20,
          3 + Math.random() * 3,
          0x4fc3f7,
          0.8
        );
        this.tweens.add({
          targets: particle,
          y: particle.y - 50 - Math.random() * 30,
          alpha: 0,
          duration: 600 + Math.random() * 400,
          onComplete: () => particle.destroy(),
        });
      }
    }
  }

  private startCombat(enemy: Enemy, dx: number, dy: number): void {
    this.combat.active = true;
    this.combat.enemy = enemy;
    this.combat.turn = 'player';
    this.combat.playerAttackTime = 0;
    this.combat.enemyAttackTime = 0;
    this.combat.playerHitFlashTime = 0;

    this.player.attackDirection = { dx, dy };
    this.player.attackAnimTime = 200;
  }

  private updateCombat(dt: number): void {
    if (!this.combat.active || !this.combat.enemy) return;

    const enemy = this.combat.enemy;

    if (this.combat.turn === 'player') {
      this.combat.playerAttackTime += dt;
      if (this.combat.playerAttackTime >= 200) {
        enemy.hp -= this.player.attack;
        enemy.hitFlashTime = 100;

        if (enemy.hp <= 0) {
          enemy.dying = true;
          enemy.deathProgress = 0;
          this.combat.active = false;
          this.combat.enemy = null;
          this.player.attackAnimTime = 0;
          this.tryDropRune(enemy);
        } else {
          this.combat.turn = 'enemy';
          this.combat.enemyAttackTime = 0;
          this.player.attackAnimTime = 0;
        }
      }
    } else if (this.combat.turn === 'enemy') {
      this.combat.enemyAttackTime += dt;
      if (this.combat.enemyAttackTime >= 400) {
        this.player.hp -= enemy.attack;
        this.combat.playerHitFlashTime = 100;

        this.cameras.main.flash(100, 255, 0, 0);

        if (this.player.hp <= 0) {
          this.player.hp = 0;
          this.time.delayedCall(500, () => this.scene.restart());
        }

        this.combat.active = false;
        this.combat.enemy = null;
      }
    }

    if (this.combat.playerHitFlashTime > 0) {
      this.combat.playerHitFlashTime = Math.max(0, this.combat.playerHitFlashTime - dt);
    }
  }

  private tryDropRune(enemy: Enemy): void {
    if (Math.random() < 0.7) {
      const uncollected = this.runeSystem.getFragments().filter(f => !f.collected);
      if (uncollected.length > 0 && !this.runeSprites.has(uncollected[0].id)) {
        const fragment = { ...uncollected[0], tileX: enemy.tileX, tileY: enemy.tileY };
        uncollected[0].tileX = enemy.tileX;
        uncollected[0].tileY = enemy.tileY;
        this.createRuneSprite(uncollected[0]);
      }
    }
  }

  private updateEnemies(dt: number): void {
    const playerRoom = getRoomAt(this.dungeon, this.player.tileX, this.player.tileY);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];

      if (enemy.dying) {
        enemy.deathProgress += dt / 300;
        if (enemy.deathProgress >= 1) {
          if (enemy.sprite) enemy.sprite.destroy();
          this.enemies.splice(i, 1);
          continue;
        }
        if (enemy.sprite) {
          const scale = 1 - enemy.deathProgress;
          enemy.sprite.setScale(scale);
          enemy.sprite.setAlpha(1 - enemy.deathProgress);
        }
        continue;
      }

      if (enemy.hitFlashTime > 0) {
        enemy.hitFlashTime = Math.max(0, enemy.hitFlashTime - dt);
        if (enemy.sprite) {
          if (enemy.hitFlashTime > 0 && enemy.hitFlashTime % 20 < 10) {
            enemy.sprite.each((child: any) => {
              if (child.setFillStyle) {
                child.setFillStyle(0xff0000, 1);
              }
            });
          } else {
            this.restoreEnemyColor(enemy);
          }
        }
      }

      const sameRoom = playerRoom && playerRoom.id === enemy.roomId;
      const canFly = enemy.type === 'bat';

      if (enemy.type === 'slime') {
        enemy.lastTeleportTime += dt;
        if (enemy.lastTeleportTime >= 1500 && sameRoom && !enemy.isMoving) {
          enemy.lastTeleportTime = 0;
          const room = this.dungeon.rooms.find(r => r.id === enemy.roomId);
          if (room) {
            const possiblePositions: { x: number; y: number }[] = [];
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const nx = room.centerX + dx;
                const ny = room.centerY + dy;
                if (isWalkable(this.dungeon, nx, ny) &&
                    !(nx === this.player.tileX && ny === this.player.tileY) &&
                    !(nx === enemy.tileX && ny === enemy.tileY)) {
                  possiblePositions.push({ x: nx, y: ny });
                }
              }
            }
            if (possiblePositions.length > 0) {
              const target = possiblePositions[Math.floor(Math.random() * possiblePositions.length)];
              if (enemy.sprite) {
                this.tweens.add({
                  targets: enemy.sprite,
                  alpha: 0,
                  scale: 0.3,
                  duration: 150,
                  onComplete: () => {
                    enemy.tileX = target.x;
                    enemy.tileY = target.y;
                    const pos = this.tileToPixel(target.x, target.y);
                    enemy.sprite!.setPosition(pos.x, pos.y);
                    this.tweens.add({
                      targets: enemy.sprite,
                      alpha: 1,
                      scale: 1,
                      duration: 150,
                    });
                  },
                });
              }
            }
          }
        }
      }

      if (!enemy.isMoving && sameRoom && !this.combat.active) {
        let moveDx = 0, moveDy = 0;
        if (enemy.tileX < this.player.tileX) moveDx = 1;
        else if (enemy.tileX > this.player.tileX) moveDx = -1;
        else if (enemy.tileY < this.player.tileY) moveDy = 1;
        else if (enemy.tileY > this.player.tileY) moveDy = -1;

        if (moveDx !== 0 || moveDy !== 0) {
          const newX = enemy.tileX + moveDx;
          const newY = enemy.tileY + moveDy;

          if (newX === this.player.tileX && newY === this.player.tileY) {
            this.startCombat(enemy, -moveDx, -moveDy);
          } else if (canFly || isWalkable(this.dungeon, newX, newY)) {
            const blocked = this.enemies.some(e => e !== enemy && !e.dying && e.tileX === newX && e.tileY === newY);
            if (!blocked) {
              enemy.fromX = enemy.tileX;
              enemy.fromY = enemy.tileY;
              enemy.toX = newX;
              enemy.toY = newY;
              enemy.isMoving = true;
              enemy.moveProgress = 0;
            }
          }
        }
      }

      if (enemy.isMoving) {
        enemy.moveProgress += dt / ENEMY_MOVE_DURATION;
        if (enemy.moveProgress >= 1) {
          enemy.moveProgress = 1;
          enemy.tileX = enemy.toX;
          enemy.tileY = enemy.toY;
          enemy.isMoving = false;
        }
        const t = enemy.moveProgress;
        const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const px = enemy.fromX + (enemy.toX - enemy.fromX) * easeT;
        const py = enemy.fromY + (enemy.toY - enemy.fromY) * easeT;
        const pos = this.tileToPixel(px, py);
        if (enemy.sprite) {
          enemy.sprite.setPosition(pos.x, pos.y);
        }
      }
    }
  }

  private restoreEnemyColor(enemy: Enemy): void {
    if (!enemy.sprite) return;
    let color = COLORS.skeleton;
    if (enemy.type === 'slime') color = COLORS.slime;
    else if (enemy.type === 'bat') color = COLORS.bat;
    const colorNum = parseInt(color.replace('#', ''), 16);
    enemy.sprite.each((child: any) => {
      if (child.setFillStyle) {
        child.setFillStyle(colorNum, 1);
      }
    });
  }

  private checkRuneCollection(): void {
    const fragment = this.runeSystem.tryCollect(this.player.tileX, this.player.tileY);
    if (fragment) {
      const sprite = this.runeSprites.get(fragment.id);
      if (sprite) {
        this.pulseAnimElements.set(sprite, 0);
        this.time.delayedCall(200, () => {
          sprite.destroy();
          this.runeSprites.delete(fragment.id);
        });
      }
    }
  }

  private updateRuneAnimations(dt: number): void {
    this.runeSprites.forEach((sprite) => {
      const base = (sprite as any).baseAlpha || 0.7;
      (sprite as any).pulsePhase = ((sprite as any).pulsePhase || 0) + dt * 0.005;
      const alpha = base + Math.sin((sprite as any).pulsePhase) * 0.2;
      sprite.setAlpha(alpha);
      sprite.setScale(1 + Math.sin((sprite as any).pulsePhase * 1.5) * 0.05);
    });
  }

  private checkRuneDiskInteraction(dt: number): void {
    const state = this.runeSystem.getState();
    const disk = this.runeDiskSprite;
    if (!disk) return;

    if (state === 'ready' || state === 'merging') {
      disk.setVisible(true);
      const ring = (disk as any).ring as Phaser.GameObjects.Graphics;
      ring.rotation += dt * 0.003;

      if (state === 'ready') {
        const exitRoom = this.dungeon.exitRoom;
        if (this.player.tileX === exitRoom.centerX && this.player.tileY === exitRoom.centerY) {
          if (this.runeSystem.startMerge()) {
            this.pulseAnimElements.set(disk, 0);
          }
        }
      }
    } else {
      disk.setVisible(false);
    }
  }

  private checkPortalInteraction(): void {
    const portal = this.portalSprite;
    if (!portal) return;

    if (this.runeSystem.isPortalActive()) {
      portal.setVisible(true);
      const bg = (portal as any).bg as Phaser.GameObjects.Arc;
      const t = this.runeSystem.getPortalTransitionProgress();
      const fromColor = Phaser.Display.Color.HexStringToColor(COLORS.portalClosed);
      const toColor = Phaser.Display.Color.HexStringToColor(COLORS.portalOpen);
      const r = Math.floor(fromColor.red + (toColor.red - fromColor.red) * t);
      const g = Math.floor(fromColor.green + (toColor.green - fromColor.green) * t);
      const b = Math.floor(fromColor.blue + (toColor.blue - fromColor.blue) * t);
      bg.setFillStyle(Phaser.Display.Color.GetColor(r, g, b), 0.6 + t * 0.3);

      const allEnemiesDead = this.enemies.filter(e => !e.dying).length === 0;
      const allRunesCollected = this.runeSystem.getCollectedCount() >= this.runeSystem.getTotalCount();

      if (t >= 1 && allEnemiesDead && allRunesCollected) {
        const exitRoom = this.dungeon.exitRoom;
        if (this.player.tileX === exitRoom.centerX && this.player.tileY === exitRoom.centerY) {
          this.cameras.main.fadeOut(1000, 0, 0, 0);
          this.time.delayedCall(1100, () => {
            this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 'VICTORY!', {
              fontFamily: "'Press Start 2P', 'Courier New', monospace",
              fontSize: '48px',
              color: COLORS.portalOpen,
            }).setOrigin(0.5).setShadow(4, 4, 'rgba(0,0,0,0.8)', 2, true, true);
            this.time.delayedCall(3000, () => this.scene.restart());
          });
        }
      }
    } else {
      portal.setVisible(false);
    }
  }

  private updatePortalAndDisk(dt: number): void {
  }

  private updatePulseAnimations(dt: number): void {
    const toRemove: Phaser.GameObjects.Container[] = [];
    this.pulseAnimElements.forEach((progress, obj) => {
      const newProgress = progress + dt / 200;
      if (newProgress >= 1) {
        obj.setScale(1);
        toRemove.push(obj);
      } else {
        const t = newProgress;
        const scale = 1 + Math.sin(t * Math.PI) * 0.1;
        obj.setScale(scale);
        this.pulseAnimElements.set(obj, newProgress);
      }
    });
    toRemove.forEach(obj => this.pulseAnimElements.delete(obj));
  }
}
