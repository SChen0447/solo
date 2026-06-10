import { v4 as uuidv4 } from 'uuid';
import {
  Direction,
  GridPos,
  SignalLight,
  AnimalEvent,
  LevelConfig,
  posEquals,
  directionToDelta
} from './types';
import { GridManager } from './GridManager';

export class EventSystem {
  public signals: SignalLight[] = [];
  public animals: AnimalEvent[] = [];
  private gridManager: GridManager;
  private levelConfig: LevelConfig;
  private elapsedTime: number = 0;
  public onLog: (msg: string) => void = () => {};

  constructor(gridManager: GridManager, levelConfig: LevelConfig) {
    this.gridManager = gridManager;
    this.levelConfig = levelConfig;
  }

  public reset(): void {
    this.signals = [];
    this.animals = [];
    this.elapsedTime = 0;
    this.generateSignals();
  }

  private generateSignals(): void {
    this.signals = [];
    const count = this.levelConfig.signalCount;
    const occupied = new Set<string>();

    occupied.add(`${this.gridManager.stations.green.x},${this.gridManager.stations.green.y}`);
    occupied.add(`${this.gridManager.stations.red.x},${this.gridManager.stations.red.y}`);
    for (const o of this.gridManager.obstacles) {
      occupied.add(`${o.x},${o.y}`);
    }

    let attempts = 0;
    while (this.signals.length < count && attempts < 200) {
      attempts++;
      const x = Math.floor(Math.random() * this.gridManager.gridSize);
      const y = Math.floor(Math.random() * this.gridManager.gridSize);
      const key = `${x},${y}`;
      if (occupied.has(key)) continue;
      occupied.add(key);

      this.signals.push({
        id: uuidv4(),
        position: { x, y },
        state: 'green',
        timer: 0,
        nextChangeTime: 2 + Math.random() * 6
      });
    }
  }

  public update(deltaTime: number, isRunning: boolean): void {
    if (!isRunning) return;
    this.elapsedTime += deltaTime;

    for (const sig of this.signals) {
      sig.timer += deltaTime;
      if (sig.timer >= sig.nextChangeTime) {
        sig.timer = 0;
        if (sig.state === 'green') {
          sig.state = 'red';
          sig.nextChangeTime = 3 + Math.random() * 2;
          this.onLog(`信号灯 [${sig.position.x},${sig.position.y}] 变为红色`);
        } else {
          sig.state = 'green';
          sig.nextChangeTime = 2 + Math.random() * 6;
          this.onLog(`信号灯 [${sig.position.x},${sig.position.y}] 变为绿色`);
        }
      }
    }

    this.animals = this.animals.filter(a => a.active);

    if (Math.random() < this.levelConfig.eventFrequency * deltaTime) {
      this.triggerAnimalEvent();
    }

    for (const animal of this.animals) {
      if (!animal.active) continue;
      animal.progress += deltaTime / animal.duration;
      if (animal.progress >= 1) {
        animal.active = false;
        this.onLog('动物已离开轨道');
      }
    }
  }

  private triggerAnimalEvent(): void {
    const tracksWithPos: Array<{ pos: GridPos; direction: Direction }> = [];

    for (let y = 0; y < this.gridManager.gridSize; y++) {
      for (let x = 0; x < this.gridManager.gridSize; x++) {
        const cell = this.gridManager.grid[y][x];
        if (!cell.type) continue;
        if (posEquals({ x, y }, this.gridManager.stations.green)) continue;
        if (posEquals({ x, y }, this.gridManager.stations.red)) continue;
        if (this.animals.some(a => a.active && posEquals(a.position, { x, y }))) continue;

        const dirs: Direction[] = [Direction.UP, Direction.RIGHT, Direction.DOWN, Direction.LEFT];
        for (const d of dirs) {
          const delta = directionToDelta(d);
          const nx = x + delta.dx * 2;
          const ny = y + delta.dy * 2;
          if (nx >= 0 && nx < this.gridManager.gridSize && ny >= 0 && ny < this.gridManager.gridSize) {
            tracksWithPos.push({ pos: { x, y }, direction: d });
          }
        }
      }
    }

    if (tracksWithPos.length === 0) return;

    const chosen = tracksWithPos[Math.floor(Math.random() * tracksWithPos.length)];
    const delta = directionToDelta(chosen.direction);

    this.animals.push({
      id: uuidv4(),
      position: { ...chosen.pos },
      direction: chosen.direction,
      moveTimer: 0,
      duration: 2,
      active: true,
      startPos: {
        x: chosen.pos.x - delta.dx,
        y: chosen.pos.y - delta.dy
      },
      endPos: {
        x: chosen.pos.x + delta.dx,
        y: chosen.pos.y + delta.dy
      },
      progress: 0
    });

    this.onLog('⚠️ 动物横穿事件！注意避让');
  }

  public draw(ctx: CanvasRenderingContext2D, time: number): void {
    for (const sig of this.signals) {
      this.drawSignal(ctx, sig, time);
    }

    for (const animal of this.animals) {
      if (animal.active) {
        this.drawAnimal(ctx, animal);
      }
    }
  }

  private drawSignal(ctx: CanvasRenderingContext2D, sig: SignalLight, time: number): void {
    const pos = this.gridManager.gridToPixel(sig.position);
    const size = this.gridManager.cellSize * 0.25;
    const color = sig.state === 'green' ? '#00ff88' : '#ff4466';
    const pulse = sig.state === 'red' ? Math.sin(time / 100) * 0.3 + 0.7 : 1;

    ctx.save();
    ctx.translate(pos.x, pos.y);

    ctx.fillStyle = '#333';
    ctx.fillRect(-size * 0.3, -size * 1.8, size * 0.6, size * 1.5);

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12 * pulse;
    ctx.beginPath();
    ctx.arc(0, -size * 1.2, size * 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#553322';
    ctx.fillRect(-size * 0.08, -size * 0.3, size * 0.16, size * 1.5);

    ctx.restore();
  }

  private drawAnimal(ctx: CanvasRenderingContext2D, animal: AnimalEvent): void {
    const startPx = this.gridManager.gridToPixel(animal.startPos);
    const endPx = this.gridManager.gridToPixel(animal.endPos);
    const t = animal.progress;
    const x = startPx.x + (endPx.x - startPx.x) * t;
    const y = startPx.y + (endPx.y - startPx.y) * t;
    const size = this.gridManager.cellSize * 0.3;

    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = '#8b5a2b';
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.8, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#a0683a';
    ctx.beginPath();
    ctx.arc(size * 0.6, -size * 0.2, size * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(size * 0.75, -size * 0.3, size * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#5a3a1b';
    ctx.fillRect(-size * 0.4, size * 0.3, size * 0.1, size * 0.25);
    ctx.fillRect(size * 0.3, size * 0.3, size * 0.1, size * 0.25);

    ctx.fillStyle = '#333';
    ctx.font = `bold ${size * 0.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐾', 0, -size * 0.8);

    ctx.restore();
  }
}
