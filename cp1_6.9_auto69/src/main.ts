import * as THREE from 'three';
import { generateMaze, MazeData } from './mazeGenerator';
import { MazeRenderer } from './mazeRenderer';
import { PlayerControls } from './playerControls';

const TIME_LIMIT = 10 * 60;
const EXIT_DISTANCE = 1.5;

class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private maze!: MazeData;
  private mazeRenderer!: MazeRenderer;
  private playerControls!: PlayerControls;
  private clock: THREE.Clock;
  private animFrameId: number = 0;

  private fpsEl: HTMLElement;
  private timerEl: HTMLElement;
  private stepsEl: HTMLElement;
  private messageEl: HTMLElement;
  private minimapCanvas: HTMLCanvasElement;
  private minimapCtx: CanvasRenderingContext2D;
  private gameCanvas: HTMLCanvasElement;

  private frameCount = 0;
  private fpsTimer = 0;
  private currentFps = 60;

  private elapsedTime = 0;
  private lastSecondTime = 0;
  private gamePaused = false;
  private gameEnded = false;

  private audioContext: AudioContext | null = null;
  private lastStepTime = 0;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);
    this.scene.fog = new THREE.Fog(0x0a0a0a, 5, 25);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.gameCanvas,
      antialias: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.fpsEl = document.getElementById('fps')!;
    this.timerEl = document.getElementById('timer')!;
    this.stepsEl = document.getElementById('steps')!;
    this.messageEl = document.getElementById('center-message')!;
    this.minimapCanvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
    this.minimapCtx = this.minimapCanvas.getContext('2d')!;

    this.clock = new THREE.Clock();

    this.initLights();
    this.generateNewMaze();
    this.setupAudio();

    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);

    this.onResize();
    this.animate();
  }

  private initLights(): void {
    const ambient = new THREE.AmbientLight(0x404050, 0.6);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    this.scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x88aaff, 0.8, 15);
    pointLight.position.set(0, 5, 0);
    this.scene.add(pointLight);
  }

  private generateNewMaze(): void {
    if (this.mazeRenderer) {
      this.mazeRenderer.dispose();
    }
    if (this.playerControls) {
      this.playerControls.dispose();
    }

    this.maze = generateMaze();
    this.mazeRenderer = new MazeRenderer(this.scene, this.maze);
    this.playerControls = new PlayerControls(this.camera, this.maze);
    this.playerControls.onStep = () => this.playFootstep();

    this.elapsedTime = 0;
    this.lastSecondTime = 0;
    this.gamePaused = false;
    this.gameEnded = false;
    this.messageEl.className = '';
    this.messageEl.textContent = '';

    this.drawMinimap();
  }

  private setupAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      this.audioContext = null;
    }
  }

  private playFootstep(): void {
    if (!this.audioContext) return;

    const now = performance.now();
    if (now - this.lastStepTime < 150) return;
    this.lastStepTime = now;

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const ctx = this.audioContext;
    const duration = 0.15;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      const envelope = Math.exp(-t * 15);
      data[i] = (Math.random() * 2 - 1) * 0.15 * envelope;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    const gain = ctx.createGain();
    gain.gain.value = 0.3;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    source.start();
    source.stop(ctx.currentTime + duration);
  }

  private onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'KeyR' && this.gameEnded) {
      this.generateNewMaze();
    }
  };

  private drawMinimap(): void {
    const ctx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;

    ctx.clearRect(0, 0, w, h);

    const cellSize = Math.min(w, h) / (this.maze.width + 2);
    const offsetX = (w - this.maze.width * cellSize) / 2;
    const offsetY = (h - this.maze.height * cellSize) / 2;

    ctx.fillStyle = 'rgba(100, 100, 100, 0.6)';
    for (let gz = 0; gz < this.maze.height; gz++) {
      for (let gx = 0; gx < this.maze.width; gx++) {
        if (this.maze.grid[gz][gx] === 0) {
          ctx.fillRect(
            offsetX + gx * cellSize,
            offsetY + gz * cellSize,
            cellSize,
            cellSize
          );
        }
      }
    }

    const exitPx = offsetX + (this.maze.exit.x + 0.5) * cellSize;
    const exitPy = offsetY + (this.maze.exit.z + 0.5) * cellSize;
    ctx.beginPath();
    ctx.arc(exitPx, exitPy, cellSize * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = '#00ff44';
    ctx.fill();

    const playerPx =
      offsetX +
      ((this.playerControls.state.position.x / this.maze.cellSize) + 0.5) * cellSize;
    const playerPy =
      offsetY +
      ((this.playerControls.state.position.z / this.maze.cellSize) + 0.5) * cellSize;
    ctx.beginPath();
    ctx.arc(playerPx, playerPy, cellSize * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#ff3333';
    ctx.fill();
  }

  private checkWin(): void {
    const playerPos = this.playerControls.state.position;
    const exitPos = this.mazeRenderer.getExitWorldPosition();
    const dx = playerPos.x - exitPos.x;
    const dz = playerPos.z - exitPos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < EXIT_DISTANCE) {
      this.gamePaused = true;
      this.gameEnded = true;
      this.messageEl.textContent = '恭喜逃脱！';
      this.messageEl.className = 'win show';
    }
  }

  private checkTimeLimit(): void {
    if (this.elapsedTime >= TIME_LIMIT) {
      this.gamePaused = true;
      this.gameEnded = true;
      this.messageEl.textContent = '时间耗尽';
      this.messageEl.className = 'lose show';
    }
  }

  private updateUI(): void {
    this.fpsEl.textContent = `FPS: ${this.currentFps}`;

    const minutes = Math.floor(this.elapsedTime / 60);
    const seconds = Math.floor(this.elapsedTime % 60);
    this.timerEl.textContent = `时间: ${String(minutes).padStart(2, '0')}:${String(
      seconds
    ).padStart(2, '0')}`;

    this.stepsEl.textContent = `步数: ${this.playerControls.state.stepsCount}`;
  }

  private animate = (): void => {
    this.animFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.frameCount++;
    this.fpsTimer += delta;
    if (this.fpsTimer >= 0.5) {
      this.currentFps = Math.round(this.frameCount / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    if (!this.gamePaused) {
      this.elapsedTime += delta;
      this.playerControls.update(delta);
      this.mazeRenderer.update(delta);
      this.checkWin();
      this.checkTimeLimit();
    }

    if (this.elapsedTime - this.lastSecondTime >= 1) {
      this.lastSecondTime = Math.floor(this.elapsedTime);
      this.updateUI();
    }

    this.drawMinimap();

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    this.playerControls.dispose();
    this.mazeRenderer.dispose();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
