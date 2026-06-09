import Phaser from 'phaser';

export const TILE_SIZE = 64;
export const MAP_COLS = 20;
export const MAP_ROWS = 12;

export interface DroneData {
  sprite: Phaser.Physics.Arcade.Sprite;
  path: Phaser.Math.Vector2[];
  currentTarget: number;
  speed: number;
}

export interface LaserData {
  group: Phaser.GameObjects.Group;
  emitters: Phaser.GameObjects.Image[];
  beam: Phaser.GameObjects.TileSprite | null;
  isActive: boolean;
  toggleTimer: number;
  warningTimer: number;
  isWarning: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  horizontal: boolean;
  collider: Phaser.Physics.Arcade.Sprite | null;
}

export interface LevelManagerConfig {
  scene: Phaser.Scene;
}

const MAZE_DATA: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,0,1,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
  [1,0,1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,1],
  [1,0,1,0,1,1,1,1,1,0,1,1,1,1,1,1,0,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,1],
  [1,0,0,0,1,0,1,0,0,0,0,0,0,0,1,0,0,0,0,1],
  [1,1,1,0,1,0,1,1,1,1,1,0,1,1,1,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

export class LevelManager {
  private scene: Phaser.Scene;
  public walls: Phaser.Physics.Arcade.StaticGroup;
  public floorTiles: Phaser.GameObjects.Group;
  public drones: DroneData[] = [];
  public lasers: LaserData[] = [];
  public openSpots: Phaser.Math.Vector2[] = [];
  private droneUpdateTimer: number = 0;
  private laserUpdateTimer: number = 0;
  private readonly DRONE_UPDATE_INTERVAL: number = 1000 / 30;
  private readonly LASER_UPDATE_INTERVAL: number = 1000 / 30;
  public playerHitCallback: ((knockbackAngle: number) => void) | null = null;

  constructor(config: LevelManagerConfig) {
    this.scene = config.scene;
    this.walls = this.scene.physics.add.staticGroup();
    this.floorTiles = this.scene.add.group();
  }

  public buildLevel(): void {
    this.createFloorAndWalls();
    this.createDrones();
    this.createLasers();
    this.collectOpenSpots();
  }

  private createFloorAndWalls(): void {
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const x = col * TILE_SIZE + TILE_SIZE / 2;
        const y = row * TILE_SIZE + TILE_SIZE / 2;
        const tile = this.scene.add.image(x, y, 'stoneFloor');
        tile.setOrigin(0.5);
        this.floorTiles.add(tile);

        if (MAZE_DATA[row][col] === 1) {
          const wall = this.walls.create(x, y, 'copperWall') as Phaser.Physics.Arcade.Sprite;
          wall.setOrigin(0.5);
          wall.refreshBody();
          wall.setImmovable(true);
        }
      }
    }
  }

  private createDrones(): void {
    const droneConfigs = [
      {
        startX: 5 * TILE_SIZE + TILE_SIZE / 2,
        startY: 5 * TILE_SIZE + TILE_SIZE / 2,
        speed: 80,
        path: [
          new Phaser.Math.Vector2(5 * TILE_SIZE + TILE_SIZE / 2, 5 * TILE_SIZE + TILE_SIZE / 2),
          new Phaser.Math.Vector2(14 * TILE_SIZE + TILE_SIZE / 2, 5 * TILE_SIZE + TILE_SIZE / 2),
          new Phaser.Math.Vector2(14 * TILE_SIZE + TILE_SIZE / 2, 9 * TILE_SIZE + TILE_SIZE / 2),
          new Phaser.Math.Vector2(5 * TILE_SIZE + TILE_SIZE / 2, 9 * TILE_SIZE + TILE_SIZE / 2),
        ]
      },
      {
        startX: 1 * TILE_SIZE + TILE_SIZE / 2,
        startY: 3 * TILE_SIZE + TILE_SIZE / 2,
        speed: 70,
        path: [
          new Phaser.Math.Vector2(1 * TILE_SIZE + TILE_SIZE / 2, 3 * TILE_SIZE + TILE_SIZE / 2),
          new Phaser.Math.Vector2(1 * TILE_SIZE + TILE_SIZE / 2, 9 * TILE_SIZE + TILE_SIZE / 2),
          new Phaser.Math.Vector2(3 * TILE_SIZE + TILE_SIZE / 2, 9 * TILE_SIZE + TILE_SIZE / 2),
          new Phaser.Math.Vector2(3 * TILE_SIZE + TILE_SIZE / 2, 3 * TILE_SIZE + TILE_SIZE / 2),
        ]
      },
      {
        startX: 16 * TILE_SIZE + TILE_SIZE / 2,
        startY: 1 * TILE_SIZE + TILE_SIZE / 2,
        speed: 75,
        path: [
          new Phaser.Math.Vector2(16 * TILE_SIZE + TILE_SIZE / 2, 1 * TILE_SIZE + TILE_SIZE / 2),
          new Phaser.Math.Vector2(18 * TILE_SIZE + TILE_SIZE / 2, 1 * TILE_SIZE + TILE_SIZE / 2),
          new Phaser.Math.Vector2(18 * TILE_SIZE + TILE_SIZE / 2, 5 * TILE_SIZE + TILE_SIZE / 2),
          new Phaser.Math.Vector2(16 * TILE_SIZE + TILE_SIZE / 2, 5 * TILE_SIZE + TILE_SIZE / 2),
        ]
      }
    ];

    droneConfigs.forEach((cfg) => {
      const sprite = this.scene.physics.add.sprite(cfg.startX, cfg.startY, 'drone');
      sprite.setCollideWorldBounds(true);
      sprite.body.setSize(36, 36, true);

      const drone: DroneData = {
        sprite,
        path: cfg.path,
        currentTarget: 1 % cfg.path.length,
        speed: cfg.speed
      };

      this.drones.push(drone);

      this.scene.physics.add.overlap(
        sprite,
        this.scene.physics.world.bounds,
        undefined,
        undefined,
        this
      );
    });
  }

  private createLasers(): void {
    const laserConfigs = [
      { x1: 6, y1: 3, x2: 6, y2: 5, horizontal: false },
      { x1: 8, y1: 7, x2: 11, y2: 7, horizontal: true },
      { x1: 15, y1: 2, x2: 15, y2: 4, horizontal: false },
      { x1: 2, y1: 10, x2: 6, y2: 10, horizontal: true },
    ];

    laserConfigs.forEach((cfg, index) => {
      const x1 = cfg.x1 * TILE_SIZE + TILE_SIZE / 2;
      const y1 = cfg.y1 * TILE_SIZE + TILE_SIZE / 2;
      const x2 = cfg.x2 * TILE_SIZE + TILE_SIZE / 2;
      const y2 = cfg.y2 * TILE_SIZE + TILE_SIZE / 2;

      const group = this.scene.add.group();
      const emitters: Phaser.GameObjects.Image[] = [];

      const emitter1 = this.scene.add.image(x1, y1, 'laserEmitter');
      const emitter2 = this.scene.add.image(x2, y2, 'laserEmitter');

      if (!cfg.horizontal) {
        emitter1.setOrigin(0.5, 1);
        emitter2.setOrigin(0.5, 0);
      } else {
        emitter1.setOrigin(1, 0.5);
        emitter1.rotation = Math.PI / 2;
        emitter2.setOrigin(0, 0.5);
        emitter2.rotation = Math.PI / 2;
      }

      emitters.push(emitter1, emitter2);
      group.addMultiple([emitter1, emitter2]);

      let beam: Phaser.GameObjects.TileSprite | null = null;
      let collider: Phaser.Physics.Arcade.Sprite | null = null;

      if (cfg.horizontal) {
        const width = x2 - x1;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        beam = this.scene.add.tileSprite(midX, midY, width, 8, 'laserBeam');
        beam.setOrigin(0.5);
        beam.setAlpha(0);

        collider = this.scene.physics.add.sprite(midX, midY);
        collider.body.setSize(width, 8, true);
        collider.body.setAllowGravity(false);
        collider.body.setImmovable(true);
        collider.setVisible(false);
        collider.body.enable = false;
      } else {
        const height = y2 - y1;
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        beam = this.scene.add.tileSprite(midX, midY, 8, height, 'laserBeam');
        beam.setOrigin(0.5);
        beam.rotation = Math.PI / 2;
        beam.setAlpha(0);

        collider = this.scene.physics.add.sprite(midX, midY);
        collider.body.setSize(8, height, true);
        collider.body.setAllowGravity(false);
        collider.body.setImmovable(true);
        collider.setVisible(false);
        collider.body.enable = false;
      }

      group.add(beam);

      const laser: LaserData = {
        group,
        emitters,
        beam,
        isActive: index % 2 === 0,
        toggleTimer: 5000,
        warningTimer: 0,
        isWarning: false,
        x1, y1, x2, y2,
        horizontal: cfg.horizontal,
        collider
      };

      if (laser.isActive && laser.beam) {
        laser.beam.setAlpha(1);
        if (laser.collider) {
          laser.collider.body.enable = true;
        }
      }

      this.lasers.push(laser);
    });
  }

  private collectOpenSpots(): void {
    this.openSpots = [];
    for (let row = 1; row < MAP_ROWS - 1; row++) {
      for (let col = 1; col < MAP_COLS - 1; col++) {
        if (MAZE_DATA[row][col] === 0) {
          const x = col * TILE_SIZE + TILE_SIZE / 2;
          const y = row * TILE_SIZE + TILE_SIZE / 2;
          const isNearLaser = this.lasers.some(l => {
            const dx1 = x - l.x1, dy1 = y - l.y1;
            const dx2 = x - l.x2, dy2 = y - l.y2;
            return Math.sqrt(dx1 * dx1 + dy1 * dy1) < TILE_SIZE ||
                   Math.sqrt(dx2 * dx2 + dy2 * dy2) < TILE_SIZE;
          });
          if (!isNearLaser) {
            this.openSpots.push(new Phaser.Math.Vector2(x, y));
          }
        }
      }
    }
  }

  public update(time: number, delta: number, playerSprite: Phaser.Physics.Arcade.Sprite): void {
    this.droneUpdateTimer += delta;
    this.laserUpdateTimer += delta;

    if (this.droneUpdateTimer >= this.DRONE_UPDATE_INTERVAL) {
      this.droneUpdateTimer = 0;
      this.updateDrones(this.DRONE_UPDATE_INTERVAL, playerSprite);
    }

    if (this.laserUpdateTimer >= this.LASER_UPDATE_INTERVAL) {
      this.laserUpdateTimer = 0;
      this.updateLasers(this.LASER_UPDATE_INTERVAL, playerSprite);
    }
  }

  private updateDrones(delta: number, playerSprite: Phaser.Physics.Arcade.Sprite): void {
    this.drones.forEach((drone) => {
      const target = drone.path[drone.currentTarget];
      const dx = target.x - drone.sprite.x;
      const dy = target.y - drone.sprite.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 5) {
        drone.currentTarget = (drone.currentTarget + 1) % drone.path.length;
      } else {
        const velX = (dx / dist) * drone.speed;
        const velY = (dy / dist) * drone.speed;
        drone.sprite.setVelocity(velX, velY);
        drone.sprite.rotation = Math.atan2(dy, dx);
      }

      const pdx = playerSprite.x - drone.sprite.x;
      const pdy = playerSprite.y - drone.sprite.y;
      const pdist = Math.sqrt(pdx * pdx + pdy * pdy);

      if (pdist < 36 && this.playerHitCallback) {
        const angle = Math.atan2(pdy, pdx);
        this.playerHitCallback(angle);
        drone.sprite.setVelocity(-(dx / dist) * drone.speed * 2, -(dy / dist) * drone.speed * 2);
        this.scene.time.delayedCall(200, () => {
          drone.sprite.setVelocity(0, 0);
        });
      }
    });
  }

  private updateLasers(delta: number, playerSprite: Phaser.Physics.Arcade.Sprite): void {
    this.lasers.forEach((laser) => {
      if (laser.isWarning) {
        laser.warningTimer -= delta;
        laser.emitters.forEach(e => {
          e.setTint(Math.floor(laser.warningTimer / 100) % 2 === 0 ? 0xff4444 : 0xffffff);
        });
        if (laser.beam) {
          laser.beam.setAlpha(0.3 + Math.sin(laser.warningTimer / 50) * 0.2);
          laser.beam.setTint(0xff6666);
        }
        if (laser.warningTimer <= 0) {
          laser.isWarning = false;
          laser.isActive = !laser.isActive;
          laser.toggleTimer = 5000;
          laser.emitters.forEach(e => e.clearTint());
          if (laser.beam) {
            laser.beam.clearTint();
            laser.beam.setAlpha(laser.isActive ? 1 : 0);
          }
          if (laser.collider) {
            laser.collider.body.enable = laser.isActive;
          }
        }
      } else {
        laser.toggleTimer -= delta;
        if (laser.toggleTimer <= 2000 && laser.toggleTimer > 0) {
          laser.isWarning = true;
          laser.warningTimer = 2000;
        }
      }

      if (laser.isActive && laser.collider) {
        const pdx = playerSprite.x - laser.collider.x;
        const pdy = playerSprite.y - laser.collider.y;
        const laserWidth = laser.horizontal ? laser.x2 - laser.x1 : 8;
        const laserHeight = laser.horizontal ? 8 : laser.y2 - laser.y1;
        const halfW = laserWidth / 2 + 16;
        const halfH = laserHeight / 2 + 16;
        if (Math.abs(pdx) < halfW && Math.abs(pdy) < halfH && this.playerHitCallback) {
          const angle = Math.atan2(pdy, pdx);
          this.playerHitCallback(angle);
        }
      }
    });
  }

  public getRandomOpenSpot(excludePositions?: Phaser.Math.Vector2[], minDist: number = 100): Phaser.Math.Vector2 | null {
    const valid = this.openSpots.filter(spot => {
      if (excludePositions) {
        return !excludePositions.some(ex => {
          const dx = spot.x - ex.x;
          const dy = spot.y - ex.y;
          return Math.sqrt(dx * dx + dy * dy) < minDist;
        });
      }
      return true;
    });
    if (valid.length === 0) return null;
    return Phaser.Utils.Array.GetRandom(valid);
  }

  public getPlayerStartPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(TILE_SIZE + TILE_SIZE / 2, TILE_SIZE + TILE_SIZE / 2);
  }

  public destroy(): void {
    this.walls.destroy(true);
    this.floorTiles.destroy(true);
    this.drones.forEach(d => d.sprite.destroy());
    this.lasers.forEach(l => {
      l.group.destroy(true);
      l.collider?.destroy();
    });
  }
}
