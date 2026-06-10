import {
  Direction,
  TrackType,
  GridPos,
  LevelConfig,
  ReplayFrame,
  GameState,
  posEquals
} from './types';
import { GridManager } from './GridManager';
import { TrainController } from './TrainController';
import { EventSystem } from './EventSystem';

const LEVELS: LevelConfig[] = [
  {
    level: 1, gridSize: 9,
    stations: { green: { x: 0, y: 4 }, red: { x: 8, y: 4 } },
    obstacles: [{ x: 4, y: 2 }, { x: 4, y: 6 }],
    maxTracks: 15, signalCount: 3, eventFrequency: 0.02, timeLimit: 120
  },
  {
    level: 2, gridSize: 9,
    stations: { green: { x: 0, y: 0 }, red: { x: 8, y: 8 } },
    obstacles: [{ x: 3, y: 3 }, { x: 5, y: 4 }, { x: 2, y: 6 }],
    maxTracks: 18, signalCount: 4, eventFrequency: 0.03, timeLimit: 120
  },
  {
    level: 3, gridSize: 9,
    stations: { green: { x: 0, y: 8 }, red: { x: 8, y: 0 } },
    obstacles: [{ x: 2, y: 2 }, { x: 4, y: 4 }, { x: 6, y: 6 }, { x: 3, y: 5 }],
    maxTracks: 20, signalCount: 4, eventFrequency: 0.04, timeLimit: 120
  },
  {
    level: 4, gridSize: 9,
    stations: { green: { x: 4, y: 0 }, red: { x: 4, y: 8 } },
    obstacles: [{ x: 2, y: 3 }, { x: 6, y: 3 }, { x: 2, y: 5 }, { x: 6, y: 5 }, { x: 4, y: 4 }],
    maxTracks: 22, signalCount: 5, eventFrequency: 0.05, timeLimit: 120
  },
  {
    level: 5, gridSize: 9,
    stations: { green: { x: 0, y: 4 }, red: { x: 8, y: 4 } },
    obstacles: [
      { x: 2, y: 1 }, { x: 2, y: 7 }, { x: 4, y: 2 }, { x: 4, y: 6 },
      { x: 6, y: 3 }, { x: 6, y: 5 }, { x: 3, y: 4 }, { x: 5, y: 4 }
    ],
    maxTracks: 25, signalCount: 5, eventFrequency: 0.06, timeLimit: 120
  }
];

class GameEngine {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gridManager!: GridManager;
  private trainController!: TrainController;
  private eventSystem!: EventSystem;
  private uiManager: any;

  private gameState: GameState = 'editing';
  private currentLevel: number = 0;
  private score: number = 0;
  private timeRemaining: number = 0;
  private trainSpeed: number = 0.3;
  private lastTime: number = 0;
  private animFrameId: number = 0;
  private replayFrames: ReplayFrame[] = [];
  private replayIndex: number = 0;
  private replayStartTime: number = 0;
  private isDragging: boolean = false;
  private dragPos: GridPos | null = null;
  private logs: string[] = [];

  constructor() {
    this.container = document.getElementById('game')!;
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.loadLevel(0);
    this.initUIManager();
    this.bindCanvasEvents();
    window.addEventListener('resize', () => this.uiManager?.handleResize());
    this.startLoop();
  }

  private loadLevel(index: number): void {
    this.currentLevel = index;
    const config = LEVELS[index];
    this.gridManager = new GridManager(this.canvas, config);
    this.trainController = new TrainController(this.gridManager);
    this.eventSystem = new EventSystem(this.gridManager, config);
    this.eventSystem.reset();
    this.timeRemaining = config.timeLimit;
    this.gameState = 'editing';
    this.replayFrames = [];
    this.logs = [];
    this.trainController.onLog = (msg) => this.addLog(msg);
    this.trainController.onCollision = () => this.handleCollision();
    this.eventSystem.onLog = (msg) => this.addLog(msg);

    setTimeout(() => {
      this.uiManager?.handleResize();
      this.uiManager?.setLevel(index + 1, LEVELS.length);
      this.uiManager?.setTimer(this.timeRemaining);
      this.uiManager?.setScore(this.score);
      this.uiManager?.setStartButtonEnabled(true, '▶ 发 车');
      this.uiManager?.setSignals(this.eventSystem.signals.map(s => ({ id: s.id, state: s.state })));
      this.uiManager?.clearLogs();
      this.addLog(`第 ${index + 1} 关开始！最多可铺设 ${config.maxTracks} 段轨道`);
    }, 50);
  }

  private initUIManager(): void {
    import('./UIManager').then(({ UIManager }) => {
      this.uiManager = new UIManager(this.container, this.canvas, this.gridManager, {
        onSelectTool: (type: TrackType | null) => {
          this.addLog(type ? `选择工具: ${type === 'straight' ? '直轨' : type === 'curve' ? '弯轨' : '道岔'}` : '取消选择');
        },
        onStart: () => this.startRun(),
        onReplay: () => this.startReplay(),
        onReset: () => this.resetBoard(),
        onSpeedChange: (speed: number) => {
          this.trainSpeed = speed;
          this.trainController.setSpeed(speed);
        }
      });
      this.uiManager.handleResize();
      this.uiManager.setLevel(this.currentLevel + 1, LEVELS.length);
      this.uiManager.setTimer(this.timeRemaining);
      this.uiManager.setScore(this.score);
      this.uiManager.setSignals(this.eventSystem.signals.map(s => ({ id: s.id, state: s.state })));
      this.addLog('欢迎来到铁轨铺排与调度！请规划轨道线路');
    });
  }

  private addLog(msg: string): void {
    this.logs.push(msg);
    if (this.logs.length > 100) this.logs.shift();
    this.uiManager?.addLog(msg);
  }

  private bindCanvasEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));

    const getTouchPos = (e: TouchEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const t = e.touches[0] || e.changedTouches[0];
      return {
        x: t.clientX - rect.left,
        y: t.clientY - rect.top
      };
    };

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const p = getTouchPos(e);
      this.handleMouseDown({ clientX: p.x + this.canvas.getBoundingClientRect().left, clientY: p.y + this.canvas.getBoundingClientRect().top, preventDefault: () => {} } as MouseEvent);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const p = getTouchPos(e);
      this.handleMouseMove({ clientX: p.x + this.canvas.getBoundingClientRect().left, clientY: p.y + this.canvas.getBoundingClientRect().top, preventDefault: () => {} } as MouseEvent);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const p = getTouchPos(e);
      this.handleMouseUp({ clientX: p.x + this.canvas.getBoundingClientRect().left, clientY: p.y + this.canvas.getBoundingClientRect().top, preventDefault: () => {} } as MouseEvent);
      this.handleClick({ clientX: p.x + this.canvas.getBoundingClientRect().left, clientY: p.y + this.canvas.getBoundingClientRect().top, preventDefault: () => {} } as MouseEvent);
    }, { passive: false });
  }

  private getCanvasPos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width) / (window.devicePixelRatio || 1),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height) / (window.devicePixelRatio || 1)
    };
  }

  private handleMouseDown(e: MouseEvent): void {
    if (this.gameState !== 'editing') return;
    const pos = this.getCanvasPos(e);
    const gridPos = this.gridManager.pixelToGrid(pos.x, pos.y);
    if (this.uiManager?.selectedTool && this.gridManager.canPlace(gridPos)) {
      this.isDragging = true;
      this.dragPos = gridPos;
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isDragging || this.gameState !== 'editing') return;
    const pos = this.getCanvasPos(e);
    const gridPos = this.gridManager.pixelToGrid(pos.x, pos.y);
    if (!this.dragPos || !posEquals(gridPos, this.dragPos)) {
      if (this.uiManager?.selectedTool && this.gridManager.canPlace(gridPos)) {
        this.gridManager.placeTrack(gridPos, this.uiManager.selectedTool);
        this.dragPos = gridPos;
      }
    }
  }

  private handleMouseUp(_e: MouseEvent): void {
    this.isDragging = false;
    this.dragPos = null;
  }

  private handleClick(e: MouseEvent): void {
    if (this.gameState !== 'editing') return;
    const pos = this.getCanvasPos(e);
    const gridPos = this.gridManager.pixelToGrid(pos.x, pos.y);
    const cell = this.gridManager.getTrack(gridPos);

    if (cell && cell.type !== null) {
      this.gridManager.rotateTrack(gridPos);
    } else if (this.uiManager?.selectedTool && this.gridManager.canPlace(gridPos)) {
      const placed = this.gridManager.placeTrack(gridPos, this.uiManager.selectedTool);
      if (!placed) {
        this.addLog('轨道数量已达上限！');
      }
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.gameState !== 'editing') return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      for (let y = 0; y < this.gridManager.gridSize; y++) {
        for (let x = 0; x < this.gridManager.gridSize; x++) {
          if (this.gridManager.grid[y][x].type !== null) {
            this.gridManager.grid[y][x] = { type: null, rotation: 0 };
          }
        }
      }
    }
  }

  private startRun(): void {
    if (this.gameState !== 'editing') return;
    if (this.gridManager.getTrackCount() === 0) {
      this.addLog('请先铺设轨道！');
      return;
    }
    this.trainController.initTrains(this.trainSpeed);
    this.eventSystem.reset();
    this.gameState = 'running';
    this.uiManager?.setStartButtonEnabled(false, '运行中...');
    this.replayFrames = [];
    this.trainController.start();
    this.addLog('列车运行开始！');
  }

  private handleCollision(): void {
    this.score = Math.max(0, this.score - 500);
    this.uiManager?.showCollisionOverlay();
    this.uiManager?.setScore(this.score);
    this.addLog('发生事故！扣 500 分');
    setTimeout(() => this.endRun(false), 1500);
  }

  private endRun(success: boolean): void {
    this.gameState = 'finished';

    let gained = 0;
    let timeBonus = 0;

    if (success) {
      gained = 1000;
      timeBonus = Math.floor(this.timeRemaining) * 10;
      this.score += gained + timeBonus;
      this.addLog(`成功！基础 +${gained} 分，时间奖励 +${timeBonus} 分`);
    }

    this.uiManager?.setScore(this.score);
    this.saveScore(this.score);

    const isLast = this.currentLevel >= LEVELS.length - 1;
    this.uiManager?.showLevelComplete(
      this.currentLevel + 1,
      gained,
      timeBonus,
      this.score,
      isLast,
      this.getLeaderboard()
    ).then(() => {
      if (isLast) {
        this.score = 0;
        this.loadLevel(0);
      } else {
        this.loadLevel(this.currentLevel + 1);
      }
    });
  }

  private startReplay(): void {
    if (this.replayFrames.length < 2) {
      this.addLog('暂无可回放内容');
      return;
    }
    this.gameState = 'replaying';
    this.replayIndex = 0;
    this.replayStartTime = performance.now();
    this.uiManager?.setStartButtonEnabled(false, '回放中...');
    this.addLog('开始回放（0.5倍速）');
  }

  private resetBoard(): void {
    this.gridManager.clearTracks();
    this.eventSystem.reset();
    this.gameState = 'editing';
    this.timeRemaining = LEVELS[this.currentLevel].timeLimit;
    this.uiManager?.setStartButtonEnabled(true, '▶ 发 车');
    this.uiManager?.setTimer(this.timeRemaining);
    this.uiManager?.setSignals(this.eventSystem.signals.map(s => ({ id: s.id, state: s.state })));
    this.addLog('棋盘已重置');
  }

  private saveScore(score: number): void {
    try {
      const raw = localStorage.getItem('railway_leaderboard');
      const scores: number[] = raw ? JSON.parse(raw) : [];
      scores.push(score);
      scores.sort((a, b) => b - a);
      localStorage.setItem('railway_leaderboard', JSON.stringify(scores.slice(0, 10)));
    } catch {}
  }

  private getLeaderboard(): number[] {
    try {
      const raw = localStorage.getItem('railway_leaderboard');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private captureReplayFrame(): ReplayFrame {
    return {
      timestamp: performance.now(),
      trains: this.trainController.trains.map(t => ({
        id: t.id,
        color: t.color,
        position: { ...t.position },
        pixelProgress: t.pixelProgress,
        direction: t.direction,
        isWaiting: t.isWaiting,
        waitReason: t.waitReason,
        reachedDestination: t.reachedDestination
      })),
      signals: this.eventSystem.signals.map(s => ({
        id: s.id,
        position: { ...s.position },
        state: s.state
      })),
      animals: this.eventSystem.animals.map(a => ({
        id: a.id,
        position: { ...a.position },
        active: a.active,
        progress: a.progress,
        direction: a.direction
      })),
      logs: [...this.logs]
    };
  }

  private startLoop(): void {
    this.lastTime = performance.now();
    const loop = (now: number) => {
      const delta = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;

      this.update(delta, now);
      this.render(now);

      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private update(delta: number, now: number): void {
    if (this.gameState === 'running') {
      this.timeRemaining -= delta;
      if (this.timeRemaining <= 0) {
        this.timeRemaining = 0;
        this.uiManager?.setTimer(0);
        this.addLog('时间到！');
        this.endRun(false);
        return;
      }
      this.uiManager?.setTimer(this.timeRemaining);

      this.eventSystem.update(delta, true);
      this.trainController.update(delta, this.eventSystem.signals, this.eventSystem.animals);
      this.uiManager?.setSignals(this.eventSystem.signals.map(s => ({ id: s.id, state: s.state })));

      this.replayFrames.push(this.captureReplayFrame());
      if (this.replayFrames.length > 5000) this.replayFrames.shift();

      if (this.trainController.allReached()) {
        this.endRun(true);
      }

      if (this.trainController.collisionOccurred) {
        this.endRun(false);
      }
    } else if (this.gameState === 'replaying') {
      const elapsed = (now - this.replayStartTime) * 0.5;
      const targetIndex = Math.min(
        this.replayFrames.length - 1,
        Math.floor(elapsed / (1000 / 60))
      );
      this.replayIndex = targetIndex;

      if (this.replayIndex >= this.replayFrames.length - 1) {
        this.gameState = 'editing';
        this.uiManager?.setStartButtonEnabled(true, '▶ 发 车');
        this.addLog('回放结束');
      }
    }
  }

  private render(time: number): void {
    this.gridManager.draw(time);

    if (this.gameState === 'replaying' && this.replayFrames.length > 0) {
      const frame = this.replayFrames[this.replayIndex];
      if (frame) {
        for (const sig of frame.signals) {
          const existing = this.eventSystem.signals.find(s => s.id === sig.id);
          if (existing) existing.state = sig.state;
        }
      }
    }

    this.eventSystem.draw(this.ctx, time);

    if (this.gameState === 'replaying' && this.replayFrames.length > 0) {
      this.drawReplayTrains(time);
    } else {
      this.trainController.draw(this.ctx, time);
    }
  }

  private drawReplayTrains(time: number): void {
    const frame = this.replayFrames[this.replayIndex];
    if (!frame) return;

    for (const tData of frame.trains) {
      const train = this.trainController.trains.find(x => x.color === tData.color);
      if (!train) continue;

      train.position = { ...tData.position };
      train.prevPosition = { ...tData.position };
      train.pixelProgress = tData.pixelProgress;
      train.direction = tData.direction as Direction;
      train.isWaiting = tData.isWaiting;
      train.reachedDestination = tData.reachedDestination;
    }

    this.trainController.draw(this.ctx, time);
  }
}

new GameEngine();
