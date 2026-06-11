export type TrapType = 'fire' | 'rock';
export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Trap {
  id: number;
  type: TrapType;
  gridX: number;
  gridY: number;
  pixelX: number;
  pixelY: number;
  direction: Direction;
  container: Phaser.GameObjects.Container;
  isMoving: boolean;
  moveInterval: number;
  lastMoveTime: number;
  changeDirInterval: number;
  lastDirChangeTime: number;
  moveTween?: Phaser.Tweens.Tween;
  particles?: Phaser.GameObjects.Particles.ParticleEmitter;
}

export class TrapManager {
  scene: Phaser.Scene;
  tileSize: number;
  traps: Trap[] = [];
  private isWallCheck: (x: number, y: number) => boolean;
  private nextId: number = 1;
  private directions: Direction[] = ['up', 'down', 'left', 'right'];

  constructor(
    scene: Phaser.Scene,
    tileSize: number,
    isWallCheck: (x: number, y: number) => boolean
  ) {
    this.scene = scene;
    this.tileSize = tileSize;
    this.isWallCheck = isWallCheck;
  }

  spawnFireTrap(gridX: number, gridY: number): Trap {
    const container = this.scene.add.container(
      gridX * this.tileSize + this.tileSize / 2,
      gridY * this.tileSize + this.tileSize / 2
    );

    const size = this.tileSize * 0.7;
    const body = this.scene.add.circle(0, 0, size * 0.35, 0xff3300);
    body.setStrokeStyle(2, 0xcc0000);

    const inner = this.scene.add.circle(0, -size * 0.05, size * 0.2, 0xffaa00);
    const core = this.scene.add.circle(0, -size * 0.08, size * 0.1, 0xffff00);

    container.add([body, inner, core]);
    container.setSize(size, size);

    const particleManager = this.scene.add.particles(0, 0, undefined, {
      lifespan: 500,
      speed: { min: 20, max: 50 },
      angle: { min: -100, max: -80 },
      scale: { start: 0.1, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0xff3300, 0xffaa00, 0xffff00],
      blendMode: 'ADD',
      emitZone: {
        type: 'edge',
        source: new Phaser.Geom.Circle(0, 0, size * 0.25),
        quantity: 48
      },
      frequency: 80
    });
    container.add(particleManager);
    particleManager.startFollow(container);

    const trap: Trap = {
      id: this.nextId++,
      type: 'fire',
      gridX,
      gridY,
      pixelX: gridX * this.tileSize + this.tileSize / 2,
      pixelY: gridY * this.tileSize + this.tileSize / 2,
      direction: this.directions[Math.floor(Math.random() * 4)],
      container,
      isMoving: false,
      moveInterval: 1000,
      lastMoveTime: 0,
      changeDirInterval: 2000,
      lastDirChangeTime: 0,
      particles: particleManager
    };

    this.traps.push(trap);
    return trap;
  }

  spawnRockTrap(gridX: number, gridY: number): Trap {
    const container = this.scene.add.container(
      gridX * this.tileSize + this.tileSize / 2,
      gridY * this.tileSize + this.tileSize / 2
    );

    const size = this.tileSize * 0.8;
    const body = this.scene.add.circle(0, 0, size * 0.45, 0x666666);
    body.setStrokeStyle(2, 0x333333);

    const shadow1 = this.scene.add.circle(-size * 0.15, size * 0.1, size * 0.12, 0x444444);
    const shadow2 = this.scene.add.circle(size * 0.18, -size * 0.05, size * 0.1, 0x555555);
    const highlight = this.scene.add.circle(-size * 0.1, -size * 0.15, size * 0.08, 0x888888);

    container.add([body, shadow1, shadow2, highlight]);
    container.setSize(size, size);

    const trap: Trap = {
      id: this.nextId++,
      type: 'rock',
      gridX,
      gridY,
      pixelX: gridX * this.tileSize + this.tileSize / 2,
      pixelY: gridY * this.tileSize + this.tileSize / 2,
      direction: this.directions[Math.floor(Math.random() * 4)],
      container,
      isMoving: false,
      moveInterval: 500,
      lastMoveTime: 0,
      changeDirInterval: 2000,
      lastDirChangeTime: 0
    };

    this.traps.push(trap);
    return trap;
  }

  update(currentTime: number): void {
    for (const trap of this.traps) {
      if (currentTime - trap.lastDirChangeTime >= trap.changeDirInterval) {
        this.randomizeDirection(trap);
        trap.lastDirChangeTime = currentTime;
      }

      if (currentTime - trap.lastMoveTime >= trap.moveInterval && !trap.isMoving) {
        this.tryMoveTrap(trap, currentTime);
      }
    }
  }

  private tryMoveTrap(trap: Trap, currentTime: number): void {
    let dx = 0;
    let dy = 0;

    switch (trap.direction) {
      case 'up': dy = -1; break;
      case 'down': dy = 1; break;
      case 'left': dx = -1; break;
      case 'right': dx = 1; break;
    }

    const newX = trap.gridX + dx;
    const newY = trap.gridY + dy;

    if (this.isWallCheck(newX, newY)) {
      this.randomizeDirection(trap);
      trap.lastMoveTime = currentTime;
      return;
    }

    trap.isMoving = true;
    trap.gridX = newX;
    trap.gridY = newY;

    const targetX = newX * this.tileSize + this.tileSize / 2;
    const targetY = newY * this.tileSize + this.tileSize / 2;

    if (trap.type === 'fire') {
      const jumpHeight = this.tileSize * 0.4;
      const startY = trap.container.y;

      trap.moveTween = this.scene.tweens.add({
        targets: trap.container,
        x: targetX,
        duration: trap.moveInterval,
        ease: 'Linear'
      });

      this.scene.tweens.add({
        targets: trap.container,
        y: {
          getStart: () => startY,
          getEnd: () => targetY
        },
        duration: trap.moveInterval / 2,
        yoyo: true,
        ease: 'Sine.easeOut',
        offsetY: -jumpHeight,
        onComplete: () => {
          trap.container.y = targetY;
          this.finishTrapMove(trap, targetX, targetY, currentTime);
        }
      });
    } else {
      const rotation = trap.direction === 'left' ? -Math.PI * 2 : Math.PI * 2;

      trap.moveTween = this.scene.tweens.add({
        targets: trap.container,
        x: targetX,
        y: targetY,
        duration: trap.moveInterval,
        ease: 'Linear',
        onUpdate: () => {
          trap.pixelX = trap.container.x;
          trap.pixelY = trap.container.y;
        },
        onComplete: () => {
          this.finishTrapMove(trap, targetX, targetY, currentTime);
        }
      });

      this.scene.tweens.add({
        targets: trap.container,
        rotation: rotation,
        duration: trap.moveInterval,
        ease: 'Linear'
      });
    }
  }

  private finishTrapMove(trap: Trap, targetX: number, targetY: number, currentTime: number): void {
    trap.pixelX = targetX;
    trap.pixelY = targetY;
    trap.container.setPosition(targetX, targetY);
    trap.isMoving = false;
    trap.lastMoveTime = currentTime;
    trap.moveTween = undefined;
  }

  randomizeDirection(trap: Trap): void {
    const idx = Math.floor(Math.random() * 4);
    trap.direction = this.directions[idx];
  }

  checkCollision(playerGridX: number, playerGridY: number): Trap | null {
    for (const trap of this.traps) {
      if (trap.gridX === playerGridX && trap.gridY === playerGridY) {
        return trap;
      }
    }
    return null;
  }

  clearTraps(): void {
    for (const trap of this.traps) {
      if (trap.moveTween) {
        trap.moveTween.stop();
      }
      if (trap.particles) {
        trap.particles.destroy();
      }
      trap.container.destroy();
    }
    this.traps = [];
  }
}
