import * as THREE from 'three';
import { SceneManager } from './sceneManager';
import {
  calculateCollisions,
  updatePhysics,
  getWalls,
  isBallOutsideTable,
  Ball,
  RectObstacle,
  CircleObstacle,
  Paddle,
  CollisionEvent,
} from './physicsEngine';
import { gameState, ScoreZone } from './gameState';

const TABLE_WIDTH = 16;
const TABLE_HEIGHT = 9;
const BALL_RADIUS = 0.3;
const PHYSICS_FIXED_DT = 1 / 60;

class PinballGame {
  private sceneManager: SceneManager;
  private ball: Ball;
  private paddle: Paddle;
  private rectObstacles: RectObstacle[] = [];
  private circleObstacles: CircleObstacle[] = [];
  private scoreZones: ScoreZone[] = [];
  private walls = getWalls();

  private lastTime = 0;
  private accumulator = 0;
  private mouseX = 0;
  private targetPaddleX = 0;
  private animationId: number | null = null;
  private nextZoneId = 1;
  private nextObstacleId = 1;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  constructor() {
    this.sceneManager = new SceneManager('app');

    this.ball = {
      position: new THREE.Vector3(0, 3, 0),
      velocity: new THREE.Vector3(0, 0, 0),
      radius: BALL_RADIUS,
    };

    this.paddle = {
      position: new THREE.Vector3(0, 0.4, TABLE_HEIGHT / 2 - 1),
      width: 3,
      height: 0.4,
      depth: 1,
      restitution: 0.95,
    };

    this.setupEventListeners();
    this.resetGame();
    this.startLoop();
  }

  private setupEventListeners(): void {
    const canvas = this.sceneManager.renderer.domElement;

    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      const rect = canvas.getBoundingClientRect();
      const normalizedX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.targetPaddleX = normalizedX * (TABLE_WIDTH / 2 - 1.5);
    });

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (gameState.get().status !== 'playing') return;

      const rect = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);
      const point = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(this.tablePlane, point);

      if (point) {
        const clampedX = THREE.MathUtils.clamp(point.x, -TABLE_WIDTH / 2 + 1, TABLE_WIDTH / 2 - 1);
        const clampedZ = THREE.MathUtils.clamp(point.z, -TABLE_HEIGHT / 2 + 1, TABLE_HEIGHT / 2 - 2);
        const obs = this.sceneManager.addObstacle(clampedX, clampedZ);
        this.rectObstacles.push(obs);
      }
    });

    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        this.resetGame();
      });
    }

    gameState.subscribe((state) => {
      this.sceneManager.updateScore(state.score);
      this.sceneManager.updateLives(state.lives);
      this.sceneManager.updateStatus(state.status);
      if (state.status === 'gameover') {
        this.sceneManager.showGameOver(state.score);
      }
    });
  }

  private resetGame(): void {
    gameState.reset();
    this.sceneManager.hideGameOver();

    this.rectObstacles.forEach((o) => this.sceneManager.removeObstacle(o.id));
    this.rectObstacles = [];
    this.circleObstacles = [];
    this.scoreZones = [];
    this.nextObstacleId = 1;
    this.nextZoneId = 1;

    this.sceneManager.createBall();
    this.sceneManager.createPaddle();

    this.generateObstacles();
    this.generateScoreZones();
    this.launchBall();

    setTimeout(() => {
      gameState.setStatus('playing');
    }, 1000);
  }

  private generateObstacles(): void {
    for (let i = 0; i < 3; i++) {
      const width = 1 + Math.random() * 1.5;
      const depth = 1 + Math.random() * 1.5;
      const obs: RectObstacle = {
        id: this.nextObstacleId++,
        position: new THREE.Vector3(
          (Math.random() - 0.5) * (TABLE_WIDTH - 4),
          0.25,
          (Math.random() - 0.5) * (TABLE_HEIGHT - 6)
        ),
        width,
        depth,
        height: 0.5,
        restitution: 0.9,
        color: this.sceneManager.getRandomVividColor(),
      };
      this.rectObstacles.push(obs);
      this.sceneManager.createRectObstacle(obs);
    }

    for (let i = 0; i < 2; i++) {
      const obs: CircleObstacle = {
        id: this.nextObstacleId++,
        position: new THREE.Vector3(
          (Math.random() - 0.5) * (TABLE_WIDTH - 4),
          0.25,
          (Math.random() - 0.5) * (TABLE_HEIGHT - 6)
        ),
        radius: 0.5 + Math.random() * 0.3,
        height: 0.5,
        restitution: 0.9,
        color: this.sceneManager.getRandomVividColor(),
      };
      this.circleObstacles.push(obs);
      this.sceneManager.createCircleObstacle(obs);
    }
  }

  private generateScoreZones(): void {
    for (let i = 0; i < 6; i++) {
      const cfg = this.sceneManager.getScoreZoneConfig(i);
      const zone: ScoreZone = {
        id: this.nextZoneId++,
        position: new THREE.Vector3(
          (Math.random() - 0.5) * (TABLE_WIDTH - 3),
          0,
          (Math.random() - 0.5) * (TABLE_HEIGHT - 4)
        ),
        color: cfg.color,
        value: cfg.value,
        type: cfg.type,
        triggered: false,
        lastTriggerTime: 0,
      };
      this.scoreZones.push(zone);
      this.sceneManager.createScoreZone(zone);
    }
  }

  private launchBall(): void {
    this.ball.position.set(
      (Math.random() - 0.5) * (TABLE_WIDTH - 2),
      4,
      -TABLE_HEIGHT / 2 + 1
    );
    this.ball.velocity.set(
      (Math.random() - 0.5) * 4,
      -(Math.random() * 3 + 3),
      (Math.random() - 0.5) * 2
    );
    gameState.setBallPosition(this.ball.position);
    gameState.setBallVelocity(this.ball.velocity);
    this.sceneManager.updateBallPosition(this.ball.position);
  }

  private handleCollisions(events: CollisionEvent[]): void {
    for (const evt of events) {
      if (evt.color) {
        this.sceneManager.spawnParticles(evt.position, evt.color, 20);
      }
    }
  }

  private checkScoreZones(): void {
    const now = performance.now();
    for (const zone of this.scoreZones) {
      const dx = this.ball.position.x - zone.position.x;
      const dz = this.ball.position.z - zone.position.z;
      const distSq = dx * dx + dz * dz;

      if (distSq < 0.5 * 0.5 && now - zone.lastTriggerTime > 500) {
        zone.lastTriggerTime = now;
        const state = gameState.get();
        const oldScore = state.score;
        gameState.addScore(zone.value, zone.type);
        const newState = gameState.get();
        const gained = newState.score - oldScore;

        this.sceneManager.spawnZonePulse(zone);
        if (newState.combo > 0) {
          this.sceneManager.showComboFloat(newState.combo, zone.value, gained);
        }
      }
    }
  }

  private cleanupTemporaryObstacles(): void {
    const now = performance.now();
    for (let i = this.rectObstacles.length - 1; i >= 0; i--) {
      const obs = this.rectObstacles[i];
      if (obs.temporary && obs.expireTime && now > obs.expireTime) {
        this.sceneManager.removeObstacle(obs.id);
        this.rectObstacles.splice(i, 1);
      }
    }
  }

  private stepPhysics(dt: number): void {
    updatePhysics(this.ball, dt);

    const smoothFactor = 0.35;
    this.paddle.position.x += (this.targetPaddleX - this.paddle.position.x) * smoothFactor;
    gameState.setPaddleX(this.paddle.position.x);
    this.sceneManager.updatePaddlePosition(this.paddle.position.x);

    const events = calculateCollisions(
      this.ball,
      this.paddle,
      this.rectObstacles,
      this.circleObstacles,
      this.walls
    );
    this.handleCollisions(events);

    gameState.setBallPosition(this.ball.position);
    gameState.setBallVelocity(this.ball.velocity);
    this.sceneManager.updateBallPosition(this.ball.position);

    this.checkScoreZones();

    if (isBallOutsideTable(this.ball)) {
      gameState.loseLife();
      if (gameState.get().status !== 'gameover') {
        setTimeout(() => this.launchBall(), 800);
      }
    }
  }

  private startLoop(): void {
    this.lastTime = performance.now();

    const tick = () => {
      const now = performance.now();
      let delta = (now - this.lastTime) / 1000;
      this.lastTime = now;
      delta = Math.min(delta, 0.05);

      this.cleanupTemporaryObstacles();

      if (gameState.get().status === 'playing') {
        this.accumulator += delta;
        while (this.accumulator >= PHYSICS_FIXED_DT) {
          this.stepPhysics(PHYSICS_FIXED_DT);
          this.accumulator -= PHYSICS_FIXED_DT;
        }
      }

      this.sceneManager.update(delta);
      this.sceneManager.render();

      this.animationId = requestAnimationFrame(tick);
    };

    this.animationId = requestAnimationFrame(tick);
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.sceneManager.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new PinballGame();
  (window as any).__pinballGame = game;
});
