import * as THREE from 'three';
import { MazeData } from './mazeGenerator';

export interface PlayerState {
  position: THREE.Vector3;
  yaw: number;
  pitch: number;
  velocity: THREE.Vector3;
  isMoving: boolean;
  bobAmount: number;
  bobTimer: number;
  stepsCount: number;
  distanceAccumulated: number;
}

const MOVE_SPEED = 5;
const PLAYER_RADIUS = 0.4;
const MOUSE_SENSITIVITY = 0.002;
const BOB_FREQUENCY = 8;
const BOB_AMPLITUDE = 0.1;
const STEP_DISTANCE = 1.0;

export class PlayerControls {
  private camera: THREE.PerspectiveCamera;
  private maze: MazeData;
  private keys: Set<string> = new Set();
  private isMouseDown = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  public state: PlayerState;
  public onStep?: () => void;

  constructor(camera: THREE.PerspectiveCamera, maze: MazeData) {
    this.camera = camera;
    this.maze = maze;

    const startX = maze.entrance.x * maze.cellSize;
    const startZ = maze.entrance.z * maze.cellSize;

    this.state = {
      position: new THREE.Vector3(startX, 1.6, startZ),
      yaw: -Math.PI / 2,
      pitch: 0,
      velocity: new THREE.Vector3(),
      isMoving: false,
      bobAmount: 0,
      bobTimer: 0,
      stepsCount: 0,
      distanceAccumulated: 0,
    };

    this.updateCamera();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0 || e.button === 2) {
      this.isMouseDown = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0 || e.button === 2) {
      this.isMouseDown = false;
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isMouseDown) return;

    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;

    this.state.yaw -= dx * MOUSE_SENSITIVITY;
    this.state.pitch -= dy * MOUSE_SENSITIVITY;

    const maxPitch = (80 * Math.PI) / 180;
    this.state.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.state.pitch));

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };

  public update(deltaTime: number): void {
    let moveX = 0;
    let moveZ = 0;

    if (this.keys.has('KeyW')) moveZ -= 1;
    if (this.keys.has('KeyS')) moveZ += 1;
    if (this.keys.has('KeyA')) moveX -= 1;
    if (this.keys.has('KeyD')) moveX += 1;

    const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (length > 0) {
      moveX /= length;
      moveZ /= length;
    }

    this.state.isMoving = length > 0;

    const forward = new THREE.Vector3(
      -Math.sin(this.state.yaw),
      0,
      -Math.cos(this.state.yaw)
    );
    const right = new THREE.Vector3(
      Math.cos(this.state.yaw),
      0,
      -Math.sin(this.state.yaw)
    );

    const moveDir = new THREE.Vector3();
    moveDir.addScaledVector(forward, -moveZ);
    moveDir.addScaledVector(right, moveX);

    const moveDistance = MOVE_SPEED * deltaTime;
    const newPos = this.state.position.clone();

    if (moveDir.length() > 0) {
      moveDir.normalize();

      const testX = newPos.x + moveDir.x * moveDistance;
      if (this.canMoveTo(testX, newPos.z)) {
        newPos.x = testX;
      }

      const testZ = newPos.z + moveDir.z * moveDistance;
      if (this.canMoveTo(newPos.x, testZ)) {
        newPos.z = testZ;
      }
    }

    const moved = this.state.position.distanceTo(newPos);
    if (moved > 0) {
      this.state.distanceAccumulated += moved;
      while (this.state.distanceAccumulated >= STEP_DISTANCE) {
        this.state.distanceAccumulated -= STEP_DISTANCE;
        this.state.stepsCount++;
        if (this.onStep) this.onStep();
      }
    }

    this.state.position.copy(newPos);

    if (this.state.isMoving) {
      this.state.bobTimer += deltaTime;
      this.state.bobAmount = Math.sin(this.state.bobTimer * BOB_FREQUENCY) * BOB_AMPLITUDE;
    } else {
      this.state.bobAmount = 0;
      this.state.bobTimer = 0;
    }

    this.updateCamera();
  }

  private canMoveTo(x: number, z: number): boolean {
    const cellSize = this.maze.cellSize;
    const halfCell = cellSize / 2;

    const gridX = Math.floor((x + halfCell) / cellSize);
    const gridZ = Math.floor((z + halfCell) / cellSize);

    if (gridX < 0 || gridX >= this.maze.width || gridZ < 0 || gridZ >= this.maze.height) {
      return false;
    }

    if (this.maze.grid[gridZ][gridX] === 1) {
      return false;
    }

    const margin = PLAYER_RADIUS;
    const checkPoints = [
      { x: x - margin, z: z - margin },
      { x: x + margin, z: z - margin },
      { x: x - margin, z: z + margin },
      { x: x + margin, z: z + margin },
    ];

    for (const point of checkPoints) {
      const gx = Math.floor((point.x + halfCell) / cellSize);
      const gz = Math.floor((point.z + halfCell) / cellSize);

      if (gx < 0 || gx >= this.maze.width || gz < 0 || gz >= this.maze.height) {
        return false;
      }

      if (this.maze.grid[gz][gx] === 1) {
        return false;
      }
    }

    return true;
  }

  private updateCamera(): void {
    this.camera.position.set(
      this.state.position.x,
      this.state.position.y + this.state.bobAmount,
      this.state.position.z
    );

    const lookDir = new THREE.Vector3(
      -Math.sin(this.state.yaw) * Math.cos(this.state.pitch),
      Math.sin(this.state.pitch),
      -Math.cos(this.state.yaw) * Math.cos(this.state.pitch)
    );

    this.camera.lookAt(
      this.camera.position.x + lookDir.x,
      this.camera.position.y + lookDir.y,
      this.camera.position.z + lookDir.z
    );
  }

  public resetSteps(): void {
    this.state.stepsCount = 0;
    this.state.distanceAccumulated = 0;
  }
}
