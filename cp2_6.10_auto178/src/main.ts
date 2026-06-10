import { Drone, InputState } from './drone';
import { Track } from './track';
import { UIManager } from './ui';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const SPEEDOMETER_UPDATE_INTERVAL = 0.5;
const CHECKPOINT_RADIUS = 30;
const DRONE_RADIUS = 8;

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private track: Track;
  private drone: Drone;
  private ui: UIManager;
  private input: InputState;

  private lastTime: number = 0;
  private speedometerTimer: number = 0;
  private running: boolean = true;

  private currentLap: number = 0;
  private lapStartTime: number = 0;
  private lastCheckpointIndex: number = -1;
  private visitedCheckpoints: Set<number> = new Set();

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.track = new Track(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.drone = new Drone(
      this.track.startPosition.x,
      this.track.startPosition.y,
      this.track.startAngle
    );
    this.ui = new UIManager();
    this.input = {
      accelerate: false,
      decelerate: false,
      turnLeft: false,
      turnRight: false
    };

    this.setupInput();
    this.lapStartTime = performance.now();
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
          this.input.accelerate = true;
          break;
        case 's':
          this.input.decelerate = true;
          break;
        case 'a':
          this.input.turnLeft = true;
          break;
        case 'd':
          this.input.turnRight = true;
          break;
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
          this.input.accelerate = false;
          break;
        case 's':
          this.input.decelerate = false;
          break;
        case 'a':
          this.input.turnLeft = false;
          break;
        case 'd':
          this.input.turnRight = false;
          break;
      }
    });
  }

  private update(dt: number): void {
    this.drone.update(dt, this.input);

    const collisionResult = this.track.checkCollision(this.drone.position, DRONE_RADIUS);
    if (collisionResult.collided) {
      this.drone.handleCollision(collisionResult.normal);
    }

    this.checkCheckpoints();

    this.ui.updateStatus(this.drone.isStopped());

    this.speedometerTimer += dt;
    if (this.speedometerTimer >= SPEEDOMETER_UPDATE_INTERVAL) {
      this.speedometerTimer = 0;
      this.ui.updateSpeed(this.drone.getSpeed());
    }

    this.ui.drawSpeedometer(dt);
  }

  private checkCheckpoints(): void {
    const nearest = this.track.findNearestCheckpoint(this.drone.position);

    if (nearest.distance < CHECKPOINT_RADIUS) {
      const checkpoint = nearest.checkpoint;

      if (checkpoint.index === 0) {
        if (this.lastCheckpointIndex > 0 || this.visitedCheckpoints.size >= this.track.checkpoints.length - 1) {
          if (this.visitedCheckpoints.size > 0 || this.currentLap === 0) {
            this.completeLap();
          }
        }
      }

      if (!this.visitedCheckpoints.has(checkpoint.index)) {
        this.visitedCheckpoints.add(checkpoint.index);
      }

      this.lastCheckpointIndex = checkpoint.index;
    }
  }

  private completeLap(): void {
    this.currentLap++;
    const currentTime = performance.now();
    const lapTime = (currentTime - this.lapStartTime) / 1000;

    this.ui.addLapRecord(this.currentLap, lapTime, this.track.totalLength);

    this.lapStartTime = currentTime;
    this.visitedCheckpoints.clear();
    this.lastCheckpointIndex = -1;
  }

  private draw(): void {
    this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.track.draw(this.ctx);
    this.drone.draw(this.ctx);
  }

  private loop(timestamp: number): void {
    if (!this.running) return;

    if (this.lastTime === 0) {
      this.lastTime = timestamp;
    }

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }

  public start(): void {
    this.running = true;
    requestAnimationFrame((t) => this.loop(t));
  }

  public stop(): void {
    this.running = false;
  }

  public reset(): void {
    this.track.regenerate();
    this.drone = new Drone(
      this.track.startPosition.x,
      this.track.startPosition.y,
      this.track.startAngle
    );
    this.currentLap = 0;
    this.lapStartTime = performance.now();
    this.lastCheckpointIndex = -1;
    this.visitedCheckpoints.clear();
    this.ui.reset();
  }
}

const game = new Game();
game.start();

(window as any).game = game;
