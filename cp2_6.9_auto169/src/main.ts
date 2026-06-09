import {
  GameObject,
  PlayerCursor,
  Box,
  Barrel,
  Bottle,
  Door,
  EnergyOrb,
  MarkerVisual,
  generateRandomObjects,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  RippleEffect,
  Vec2
} from './objects';
import { TimelineManager, TimelineEvent } from './timeline';
import { UIManager, Goal } from './ui';

const GAME_DURATION = 600;
const INITIAL_ENERGY = 3;
const ENERGY_ORB_INTERVAL = 15;
const SNAPSHOT_INTERVAL = 0.5;

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private replayCanvas: HTMLCanvasElement;
  private replayCtx: CanvasRenderingContext2D;

  private objects: GameObject[] = [];
  private player: PlayerCursor;
  private energyOrbs: EnergyOrb[] = [];
  private markerVisuals: MarkerVisual[] = [];
  private ripples: RippleEffect[] = [];

  private timeline: TimelineManager;
  private ui: UIManager;

  private gameTime: number = 0;
  private lastFrameTime: number = 0;
  private lastSnapshotTime: number = 0;
  private lastEnergySpawn: number = 0;
  private selectedObjectId: string | null = null;
  private hoveredObjectId: string | null = null;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private gameOver: boolean = false;

  private canvasScale: number = 1;
  private canvasOffset: Vec2 = { x: 0, y: 0 };

  private replayHoverX: number | null = null;
  private isDraggingReplay: boolean = false;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.replayCanvas = document.getElementById('replay-canvas') as HTMLCanvasElement;
    this.replayCtx = this.replayCanvas.getContext('2d')!;

    this.timeline = new TimelineManager();
    this.player = new PlayerCursor({ x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 });

    this.ui = new UIManager(INITIAL_ENERGY, {
      onJumpToMarker: (index: number) => this.jumpToMarker(index)
    });

    this.init();
  }

  private init(): void {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.objects = generateRandomObjects();
    this.spawnEnergyOrb();

    this.setupGoals();
    this.bindEvents();

    this.timeline.recordSnapshot(0, this.getAllStateObjects());
    this.lastSnapshotTime = 0;

    this.ui.renderMarkers();
    this.ui.updateTimer(GAME_DURATION);

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  private resizeCanvas(): void {
    const container = document.getElementById('game-container')!;
    const rect = container.getBoundingClientRect();

    const padding = 40;
    const availableWidth = rect.width - padding * 2;
    const availableHeight = rect.height - padding * 2;

    const scaleX = availableWidth / WORLD_WIDTH;
    const scaleY = availableHeight / WORLD_HEIGHT;
    this.canvasScale = Math.min(scaleX, scaleY, 1.5);

    const canvasWidth = WORLD_WIDTH * this.canvasScale;
    const canvasHeight = WORLD_HEIGHT * this.canvasScale;

    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;
    this.canvas.style.width = canvasWidth + 'px';
    this.canvas.style.height = canvasHeight + 'px';

    this.canvasOffset = {
      x: (rect.width - canvasWidth) / 2,
      y: (rect.height - canvasHeight) / 2
    };
  }

  private screenToWorld(screenX: number, screenY: number): Vec2 {
    const rect = this.canvas.getBoundingClientRect();
    const x = (screenX - rect.left) / this.canvasScale;
    const y = (screenY - rect.top) / this.canvasScale;
    return { x, y };
  }

  private setupGoals(): void {
    const redBox = this.objects.find(o => o.type === 'box') as Box;
    const barrel = this.objects.find(o => o.type === 'barrel') as Barrel;
    const bottles = this.objects.filter(o => o.type === 'bottle') as Bottle[];
    const rightDoor = this.objects.find(o =>
      o.type === 'door' && o.position.x > WORLD_WIDTH / 2
    ) as Door;

    const goals: Goal[] = [
      {
        id: 'goal1',
        description: redBox
          ? '使箱子到达右下角区域'
          : '推动任意箱子到右下角区域',
        completed: false,
        check: () => {
          const boxes = this.objects.filter(o => o.type === 'box') as Box[];
          for (const box of boxes) {
            if (box.position.x > WORLD_WIDTH - 120 && box.position.y > WORLD_HEIGHT - 120) {
              return true;
            }
          }
          return false;
        }
      },
      {
        id: 'goal2',
        description: '使油桶点燃后在5秒内熄灭',
        completed: false,
        check: () => {
          const barrels = this.objects.filter(o => o.type === 'barrel') as Barrel[];
          for (const b of barrels) {
            if (!b.burning && b.burnStartTime > 0) {
              const burnDuration = this.getBarrelExtinguishTime(b);
              if (burnDuration > 0 && burnDuration <= 5) {
                return true;
              }
            }
          }
          return false;
        }
      },
      {
        id: 'goal3',
        description: bottles.length >= 2
          ? '至少同时打碎2个玻璃瓶'
          : '打碎所有玻璃瓶',
        completed: false,
        check: () => {
          const brokenCount = bottles.filter(b => b.broken).length;
          return brokenCount >= Math.min(2, bottles.length);
        }
      }
    ];

    this.ui.setGoals(goals);
  }

  private getBarrelExtinguishTime(barrel: Barrel): number {
    const events = this.timeline.getEvents();
    let lastIgnite = 0;
    for (const evt of events) {
      if (evt.objectId === barrel.id) {
        if (evt.type === 'ignite') {
          lastIgnite = evt.time;
        } else if (evt.type === 'extinguish' && lastIgnite > 0) {
          return evt.time - lastIgnite;
        }
      }
    }
    return 0;
  }

  private getAllStateObjects(): GameObject[] {
    return [...this.objects, this.player, ...this.energyOrbs];
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.gameOver) return;
      const worldPos = this.screenToWorld(e.clientX, e.clientY);
      this.player.moveTo(worldPos);
      this.updateHoveredObject(worldPos);
    });

    this.canvas.addEventListener('click', (e) => {
      if (this.gameOver) return;
      const worldPos = this.screenToWorld(e.clientX, e.clientY);
      this.handleClick(worldPos, e.clientX, e.clientY);
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    document.addEventListener('click', (e) => {
      if (!(e.target as HTMLElement).closest('#context-menu') &&
          !(e.target as HTMLElement).closest('#game-canvas')) {
        this.ui.hideContextMenu();
      }
    });

    this.replayCanvas.addEventListener('mousemove', (e) => {
      const rect = this.replayCanvas.getBoundingClientRect();
      this.replayHoverX = e.clientX - rect.left;
      if (this.isDraggingReplay) {
      }
    });

    this.replayCanvas.addEventListener('mouseleave', () => {
      this.replayHoverX = null;
    });

    this.replayCanvas.addEventListener('mousedown', (e) => {
      this.isDraggingReplay = true;
    });

    this.replayCanvas.addEventListener('mouseup', () => {
      this.isDraggingReplay = false;
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.ui.hideContextMenu();
      }
    });
  }

  private updateHoveredObject(pos: Vec2): void {
    let newHovered: string | null = null;

    for (const obj of this.objects) {
      if (obj.type === 'player') continue;
      obj.hovered = false;
      if (obj.containsPoint(pos.x, pos.y)) {
        newHovered = obj.id;
        obj.hovered = true;
      }
    }

    this.hoveredObjectId = newHovered;
  }

  private handleClick(worldPos: Vec2, screenX: number, screenY: number): void {
    this.addRipple(worldPos.x, worldPos.y);

    for (const orb of this.energyOrbs) {
      if (!orb.collected && orb.containsPoint(worldPos.x, worldPos.y)) {
        orb.collected = true;
        this.ui.addEnergy();
        this.timeline.addEvent({
          time: this.gameTime,
          type: 'energy',
          description: `拾取能量球 at ${this.gameTime.toFixed(1)}s`
        });
        return;
      }
    }

    let clickedObject: GameObject | null = null;
    for (const obj of this.objects) {
      if (obj.containsPoint(worldPos.x, worldPos.y)) {
        clickedObject = obj;
        break;
      }
    }

    if (clickedObject) {
      this.selectedObjectId = clickedObject.id;
      this.handleObjectInteraction(clickedObject, worldPos);
      this.showObjectMenu(clickedObject, screenX, screenY);
    } else {
      this.selectedObjectId = null;
      this.ui.hideContextMenu();
    }
  }

  private handleObjectInteraction(obj: GameObject, clickPos: Vec2): void {
    if (obj.type === 'door') {
      const door = obj as Door;
      const wasOpen = door.open;
      door.toggle();
      if (door.open !== wasOpen) {
        this.timeline.addEvent({
          time: this.gameTime,
          type: door.open ? 'door_open' : 'door_close',
          description: `${door.open ? '打开' : '关闭'}门 at ${this.gameTime.toFixed(1)}s`,
          objectId: door.id
        });
      }
    } else if (obj.type === 'bottle') {
      const bottle = obj as Bottle;
      if (!bottle.broken) {
        bottle.break();
        this.timeline.addEvent({
          time: this.gameTime,
          type: 'break',
          description: `打碎玻璃瓶 at ${this.gameTime.toFixed(1)}s`,
          objectId: bottle.id
        });
      }
    } else if (obj.type === 'barrel') {
      const barrel = obj as Barrel;
      if (!barrel.burning) {
        barrel.ignite(this.gameTime);
        this.timeline.addEvent({
          time: this.gameTime,
          type: 'ignite',
          description: `点燃油桶 at ${this.gameTime.toFixed(1)}s`,
          objectId: barrel.id
        });
      } else {
        barrel.extinguish();
        this.timeline.addEvent({
          time: this.gameTime,
          type: 'extinguish',
          description: `熄灭火焰 at ${this.gameTime.toFixed(1)}s`,
          objectId: barrel.id
        });
      }
    } else if (obj.pushable) {
      const dx = clickPos.x - obj.position.x;
      const dy = clickPos.y - obj.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        obj.applyImpulse((dx / dist) * 2, (dy / dist) * 2);
      }
    }
  }

  private showObjectMenu(obj: GameObject, screenX: number, screenY: number): void {
    const hasRecordedState = obj.recordedStates.size > 0;
    const canRecord = this.timeline.getMarkerCount() < this.timeline.getMaxMarkers();

    this.ui.showContextMenu(
      screenX,
      screenY,
      hasRecordedState,
      canRecord,
      () => this.recordObjectState(obj),
      () => this.rewindObject(obj),
      () => this.sendSignalToPast(obj)
    );
  }

  private recordObjectState(obj: GameObject): void {
    obj.recordState(this.gameTime);

    const markerVis = this.timeline.addMarker(this.gameTime, obj.id, this.getAllStateObjects());
    if (markerVis) {
      this.markerVisuals.push(markerVis);
      this.ui.addMarker(this.gameTime, this.timeline.getMarkerCount() - 1);
    }

    this.timeline.addEvent({
      time: this.gameTime,
      type: 'record',
      description: `记录状态 at ${this.gameTime.toFixed(1)}s`,
      objectId: obj.id
    });
  }

  private rewindObject(obj: GameObject): void {
    if (obj.recordedStates.size === 0) return;
    if (!this.ui.consumeEnergy()) return;

    const times = Array.from(obj.recordedStates.keys()).sort((a, b) => a - b);
    const latestRecordedTime = times[times.length - 1];

    this.timeline.restoreObjectToRecordedState(obj.id, latestRecordedTime, this.getAllStateObjects());
    this.timeline.addRewindPoint(this.gameTime);

    this.timeline.addEvent({
      time: this.gameTime,
      type: 'rewind',
      description: `回溯到 ${latestRecordedTime.toFixed(1)}s at ${this.gameTime.toFixed(1)}s`,
      objectId: obj.id
    });
  }

  private sendSignalToPast(obj: GameObject): void {
    if (!this.ui.consumeEnergy()) return;

    this.timeline.sendSignalToPast(obj.id, this.gameTime, this.getAllStateObjects());

    this.timeline.addEvent({
      time: this.gameTime,
      type: 'signal',
      description: `发送信号到过去 at ${this.gameTime.toFixed(1)}s`,
      objectId: obj.id
    });
  }

  private jumpToMarker(index: number): void {
    if (!this.ui.consumeEnergy()) return;

    this.timeline.restoreToMarker(index, this.getAllStateObjects());
    this.timeline.addRewindPoint(this.gameTime);

    const markers = this.timeline.getMarkers();
    if (markers[index]) {
      this.timeline.addEvent({
        time: this.gameTime,
        type: 'rewind',
        description: `跳跃到标记点 ${markers[index].time.toFixed(1)}s`,
      });
    }
  }

  private addRipple(x: number, y: number): void {
    this.ripples.push({
      x,
      y,
      radius: 0,
      maxRadius: 30,
      startTime: this.gameTime,
      duration: 0.4
    });
  }

  private spawnEnergyOrb(): void {
    const margin = 50;
    const x = margin + Math.random() * (WORLD_WIDTH - margin * 2);
    const y = margin + Math.random() * (WORLD_HEIGHT - margin * 2);

    const orb = new EnergyOrb({ x, y }, this.gameTime);
    this.energyOrbs.push(orb);
  }

  private gameLoop(currentTime: number): void {
    if (!this.isRunning) return;

    const dt = Math.min((currentTime - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = currentTime;

    if (!this.isPaused && !this.gameOver) {
      this.update(dt);
    }

    this.render();
    this.renderReplayBar();

    requestAnimationFrame(this.gameLoop.bind(this));
  }

  private update(dt: number): void {
    this.gameTime += dt;

    const remaining = GAME_DURATION - this.gameTime;
    this.ui.updateTimer(Math.max(0, remaining));

    if (remaining <= 0) {
      this.endGame(false);
      return;
    }

    for (const obj of this.objects) {
      obj.applyPhysics(dt, this.objects);
    }

    for (const barrel of this.objects.filter(o => o.type === 'barrel') as Barrel[]) {
      if (barrel.burning && this.gameTime - barrel.burnStartTime > 10) {
        barrel.extinguish();
        this.timeline.addEvent({
          time: this.gameTime,
          type: 'extinguish',
          description: `油桶自然熄灭 at ${this.gameTime.toFixed(1)}s`,
          objectId: barrel.id
        });
      }
    }

    if (this.gameTime - this.lastSnapshotTime >= SNAPSHOT_INTERVAL) {
      this.timeline.recordSnapshot(this.gameTime, this.getAllStateObjects());
      this.lastSnapshotTime = this.gameTime;
    }

    if (this.gameTime - this.lastEnergySpawn >= ENERGY_ORB_INTERVAL) {
      this.energyOrbs = this.energyOrbs.filter(o => !o.collected);
      if (this.energyOrbs.length < 3) {
        this.spawnEnergyOrb();
      }
      this.lastEnergySpawn = this.gameTime;
    }

    this.ripples = this.ripples.filter(r => {
      const elapsed = this.gameTime - r.startTime;
      r.radius = (elapsed / r.duration) * r.maxRadius;
      return elapsed < r.duration;
    });

    const goals = this.ui.checkGoals();
    if (this.ui.allGoalsCompleted()) {
      this.endGame(true);
    }
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.save();

    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#1A1A2E');
    gradient.addColorStop(1, '#16213E');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.scale(this.canvasScale, this.canvasScale);

    this.drawGrid(ctx);

    for (const obj of this.objects) {
      if (obj.type === 'door') {
        const door = obj as Door;
        if (door.hovered || this.selectedObjectId === door.id) {
          this.drawMarkerLine(ctx, door);
        }
      }
    }

    for (const markerVis of this.markerVisuals) {
      const connectedObj = this.objects.find(o => o.id === markerVis.connectedObjectId);
      if (connectedObj) {
        ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(markerVis.position.x, markerVis.position.y + 10);
        ctx.lineTo(connectedObj.position.x, connectedObj.position.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    for (const obj of this.objects) {
      obj.render(ctx, this.gameTime);
    }

    for (const orb of this.energyOrbs) {
      orb.render(ctx, this.gameTime);
    }

    for (const markerVis of this.markerVisuals) {
      markerVis.render(ctx, this.gameTime);
    }

    this.player.render(ctx, this.gameTime);

    for (const ripple of this.ripples) {
      const alpha = 1 - (ripple.radius / ripple.maxRadius);
      ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.05)';
    ctx.lineWidth = 1;

    const gridSize = 40;
    for (let x = 0; x <= WORLD_WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= WORLD_HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD_WIDTH, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  private drawMarkerLine(ctx: CanvasRenderingContext2D, obj: GameObject): void {
    const times = Array.from(obj.recordedStates.keys()).sort((a, b) => a - b);
    if (times.length === 0) return;

    const latestTime = times[times.length - 1];
    const state = obj.recordedStates.get(latestTime);
    if (!state) return;

    ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(state.position.x, state.position.y);
    ctx.lineTo(obj.position.x, obj.position.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(0, 229, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(state.position.x, state.position.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderReplayBar(): void {
    const ctx = this.replayCtx;
    const { eventAtHover } = this.timeline.renderReplayBar(
      ctx,
      this.replayCanvas.width,
      this.replayCanvas.height,
      this.gameTime,
      GAME_DURATION,
      this.replayHoverX
    );

    this.replayCanvas.title = eventAtHover
      ? `${eventAtHover.description}`
      : '';
  }

  private endGame(win: boolean): void {
    this.gameOver = true;
    this.ui.showMessage(win ? '🎉 恭喜通关！' : '⏰ 时间到！', win ? 'win' : 'lose');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
