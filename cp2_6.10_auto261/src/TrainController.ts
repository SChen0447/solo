import { v4 as uuidv4 } from 'uuid';
import {
  Direction,
  GridPos,
  Train,
  SignalLight,
  AnimalEvent,
  posEquals,
  directionToDelta,
  nextTrackDirection
} from './types';
import { GridManager } from './GridManager';

export class TrainController {
  public trains: Train[] = [];
  private gridManager: GridManager;
  public onLog: (msg: string) => void = () => {};
  public onCollision: () => void = () => {};
  public collisionOccurred: boolean = false;

  constructor(gridManager: GridManager) {
    this.gridManager = gridManager;
  }

  public initTrains(speed: number): void {
    this.trains = [];
    this.collisionOccurred = false;
    const green = this.gridManager.stations.green;
    const red = this.gridManager.stations.red;

    this.trains.push({
      id: uuidv4(),
      color: 'green',
      position: { ...green },
      prevPosition: { ...green },
      pixelProgress: 0,
      direction: Direction.RIGHT,
      speed,
      isMoving: false,
      isWaiting: false,
      waitTimer: 0,
      waitReason: null,
      reachedDestination: false,
      startStation: { ...green },
      targetStation: { ...red }
    });

    this.trains.push({
      id: uuidv4(),
      color: 'red',
      position: { ...red },
      prevPosition: { ...red },
      pixelProgress: 0,
      direction: Direction.LEFT,
      speed,
      isMoving: false,
      isWaiting: false,
      waitTimer: 0,
      waitReason: null,
      reachedDestination: false,
      startStation: { ...red },
      targetStation: { ...green }
    });
  }

  public setSpeed(speed: number): void {
    for (const t of this.trains) t.speed = speed;
  }

  private findInitialDirection(train: Train): Direction | null {
    for (let d = 0; d < 4; d++) {
      const dir = d as Direction;
      const delta = directionToDelta(dir);
      const nextPos: GridPos = {
        x: train.position.x + delta.dx,
        y: train.position.y + delta.dy
      };
      const track = this.gridManager.getTrack(nextPos);
      if (track && track.type) {
        const nextDir = nextTrackDirection(dir, track.type, track.rotation);
        if (nextDir !== null) return dir;
      }
    }
    return null;
  }

  public start(): void {
    for (const train of this.trains) {
      const dir = this.findInitialDirection(train);
      if (dir !== null) {
        train.direction = dir;
        train.isMoving = true;
        train.pixelProgress = 0;
        this.onLog(`${train.color === 'green' ? '绿色' : '红色'}列车发车`);
      } else {
        this.onLog(`${train.color === 'green' ? '绿色' : '红色'}列车无法启动：无轨道连接`);
      }
    }
  }

  public update(
    deltaTime: number,
    signals: SignalLight[],
    animals: AnimalEvent[]
  ): void {
    if (this.collisionOccurred) return;

    for (const train of this.trains) {
      if (train.reachedDestination) continue;

      if (train.isWaiting) {
        train.waitTimer -= deltaTime;
        if (train.waitTimer <= 0) {
          train.isWaiting = false;
          train.waitReason = null;
          this.onLog(`${train.color === 'green' ? '绿色' : '红色'}列车恢复行驶`);
        }
        continue;
      }

      if (!train.isMoving) continue;

      train.pixelProgress += deltaTime / train.speed;

      if (train.pixelProgress >= 1) {
        train.pixelProgress = 0;
        train.prevPosition = { ...train.position };

        const delta = directionToDelta(train.direction);
        const nextPos: GridPos = {
          x: train.position.x + delta.dx,
          y: train.position.y + delta.dy
        };

        if (posEquals(nextPos, train.targetStation)) {
          train.position = nextPos;
          train.isMoving = false;
          train.reachedDestination = true;
          this.onLog(`${train.color === 'green' ? '绿色' : '红色'}列车到达目标车站！`);
          continue;
        }

        const nextTrack = this.gridManager.getTrack(nextPos);
        if (!nextTrack || !nextTrack.type) {
          train.isMoving = false;
          this.onLog(`${train.color === 'green' ? '绿色' : '红色'}列车脱轨：前方无轨道`);
          continue;
        }

        const redSignalBlocking = signals.find(s =>
          s.state === 'red' && posEquals(s.position, nextPos)
        );
        if (redSignalBlocking) {
          train.isWaiting = true;
          train.waitTimer = 0.5;
          train.waitReason = '红灯';
          this.onLog(`${train.color === 'green' ? '绿色' : '红色'}列车遇红灯停车`);
          continue;
        }

        const blockingAnimal = animals.find(a =>
          a.active && posEquals(a.position, nextPos)
        );
        if (blockingAnimal) {
          train.isWaiting = true;
          train.waitTimer = 2;
          train.waitReason = '动物横穿';
          this.onLog(`${train.color === 'green' ? '绿色' : '红色'}列车停车避让动物`);
          continue;
        }

        const animalHit = animals.find(a =>
          a.active && posEquals(a.position, nextPos)
        );
        if (animalHit && train.isWaiting === false) {
          this.collisionOccurred = true;
          this.onLog(`事故：${train.color === 'green' ? '绿色' : '红色'}列车撞上动物！`);
          this.onCollision();
          return;
        }

        const nextDir = nextTrackDirection(train.direction, nextTrack.type, nextTrack.rotation);
        if (nextDir === null) {
          train.isMoving = false;
          this.onLog(`${train.color === 'green' ? '绿色' : '红色'}列车脱轨：轨道方向不匹配`);
          continue;
        }

        train.position = nextPos;
        train.direction = nextDir;
      }
    }

    this.checkCollision();
  }

  private checkCollision(): void {
    if (this.trains.length < 2) return;
    const [a, b] = this.trains;

    if (posEquals(a.position, b.position) && !a.reachedDestination && !b.reachedDestination) {
      this.collisionOccurred = true;
      this.onLog('事故：两列列车发生碰撞！');
      this.onCollision();
      return;
    }

    if (posEquals(a.position, b.prevPosition) && posEquals(b.position, a.prevPosition)
        && a.pixelProgress > 0.3 && b.pixelProgress > 0.3) {
      this.collisionOccurred = true;
      this.onLog('事故：两列列车迎面相撞！');
      this.onCollision();
      return;
    }
  }

  public allReached(): boolean {
    return this.trains.every(t => t.reachedDestination);
  }

  public getTrainPixelPosition(train: Train): { x: number; y: number } {
    const startPx = this.gridManager.gridToPixel(train.prevPosition);
    const endPx = this.gridManager.gridToPixel(train.position);
    const t = train.pixelProgress;
    return {
      x: startPx.x + (endPx.x - startPx.x) * t,
      y: startPx.y + (endPx.y - startPx.y) * t
    };
  }

  public draw(ctx: CanvasRenderingContext2D, time: number): void {
    for (const train of this.trains) {
      if (train.reachedDestination && train.pixelProgress === 0 && !train.isMoving) {
        this.drawTrainAtStation(ctx, train);
      } else {
        this.drawTrain(ctx, train, time);
      }
    }
  }

  private drawTrain(ctx: CanvasRenderingContext2D, train: Train, time: number): void {
    const pos = this.getTrainPixelPosition(train);
    const size = this.gridManager.cellSize * 0.5;
    const color = train.color === 'green' ? '#00ff88' : '#ff4466';
    const darkColor = train.color === 'green' ? '#00aa55' : '#cc2244';

    ctx.save();
    ctx.translate(pos.x, pos.y);

    const angleMap: Record<Direction, number> = {
      [Direction.UP]: -Math.PI / 2,
      [Direction.RIGHT]: 0,
      [Direction.DOWN]: Math.PI / 2,
      [Direction.LEFT]: Math.PI
    };
    ctx.rotate(angleMap[train.direction]);

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = train.isWaiting ? 5 + Math.sin(time / 80) * 3 : 10;
    ctx.fillRect(-size * 0.7, -size * 0.35, size * 1.4, size * 0.7);

    ctx.fillStyle = darkColor;
    ctx.fillRect(size * 0.4, -size * 0.35, size * 0.3, size * 0.7);

    ctx.fillStyle = '#88ccff';
    ctx.fillRect(size * 0.05, -size * 0.2, size * 0.2, size * 0.4);

    ctx.fillStyle = '#333';
    ctx.fillRect(-size * 0.6, -size * 0.42, size * 0.25, size * 0.1);
    ctx.fillRect(-size * 0.1, -size * 0.42, size * 0.25, size * 0.1);
    ctx.fillRect(-size * 0.6, size * 0.32, size * 0.25, size * 0.1);
    ctx.fillRect(-size * 0.1, size * 0.32, size * 0.25, size * 0.1);

    if (train.isWaiting) {
      ctx.fillStyle = '#ffaa00';
      ctx.font = `bold ${size * 0.35}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 0;
      ctx.rotate(-angleMap[train.direction]);
      ctx.fillText('⏸', 0, -size * 0.6);
    }

    ctx.restore();
  }

  private drawTrainAtStation(ctx: CanvasRenderingContext2D, train: Train): void {
    const pos = this.gridManager.gridToPixel(train.position);
    const size = this.gridManager.cellSize * 0.35;
    const color = train.color === 'green' ? '#00ff88' : '#ff4466';

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${size * 0.8}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText('✓', 0, 0);
    ctx.restore();
  }
}
