import * as THREE from 'three';
import { LevelManager } from './levelManager';
import { AnimationManager } from './animation';

export interface InteractionCallbacks {
  onTileClick: (tileId: number) => void;
  onVictory: () => void;
}

export class InteractionManager {
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private levelManager: LevelManager;
  private animationManager: AnimationManager;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private tileMeshes: Map<number, THREE.Mesh> = new Map();
  private audioContext: AudioContext | null = null;
  private callbacks: InteractionCallbacks;
  private isProcessing: boolean = false;

  constructor(
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    levelManager: LevelManager,
    animationManager: AnimationManager,
    callbacks: InteractionCallbacks
  ) {
    this.camera = camera;
    this.renderer = renderer;
    this.levelManager = levelManager;
    this.animationManager = animationManager;
    this.callbacks = callbacks;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.initEventListeners();
  }

  private initEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('click', this.handleClick.bind(this));
    canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
  }

  private touchStartPos: { x: number; y: number } | null = null;

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.touchStartPos = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    if (!this.touchStartPos || e.changedTouches.length !== 1) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - this.touchStartPos.x;
    const dy = touch.clientY - this.touchStartPos.y;

    if (Math.sqrt(dx * dx + dy * dy) < 10) {
      this.handleInteraction(touch.clientX, touch.clientY);
    }

    this.touchStartPos = null;
  }

  private handleClick(e: MouseEvent): void {
    this.handleInteraction(e.clientX, e.clientY);
  }

  private handleInteraction(clientX: number, clientY: number): void {
    if (this.isProcessing) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes = Array.from(this.tileMeshes.values());
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object as THREE.Mesh;
      const tileId = this.getTileIdByMesh(clickedMesh);

      if (tileId !== -1) {
        this.processTileClick(tileId, intersects[0].point);
      }
    }
  }

  private getTileIdByMesh(mesh: THREE.Mesh): number {
    for (const [id, tileMesh] of this.tileMeshes) {
      if (tileMesh === mesh) {
        return id;
      }
    }
    return -1;
  }

  private processTileClick(tileId: number, clickPoint: THREE.Vector3): void {
    this.isProcessing = true;

    this.playClickSound();

    this.animationManager.spawnClickParticles(clickPoint);

    const tile = this.levelManager.getTile(tileId);
    if (!tile) {
      this.isProcessing = false;
      return;
    }

    const affectedIds = this.levelManager.flipTile(tileId);

    for (const id of affectedIds) {
      const mesh = this.tileMeshes.get(id);
      const tileData = this.levelManager.getTile(id);
      if (mesh && tileData) {
        const wasLit = !tileData.isLit;
        this.animationManager.startFlipAnimation(id, mesh, wasLit, tileData.isLit);
      }
    }

    setTimeout(() => {
      this.callbacks.onTileClick(tileId);

      if (this.levelManager.checkWin()) {
        this.callbacks.onVictory();
      }

      this.isProcessing = false;
    }, 100);
  }

  registerTileMesh(tileId: number, mesh: THREE.Mesh): void {
    this.tileMeshes.set(tileId, mesh);
  }

  unregisterAllTiles(): void {
    this.tileMeshes.clear();
  }

  private initAudioContext(): void {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  playClickSound(): void {
    this.initAudioContext();
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, now);
    oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.05);

    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.1);
  }

  playVictorySound(): void {
    this.initAudioContext();
    if (!this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.50];

    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const startTime = now + index * 0.15;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  }

  dispose(): void {
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('click', this.handleClick.bind(this));
    canvas.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    canvas.removeEventListener('touchend', this.handleTouchEnd.bind(this));

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.tileMeshes.clear();
  }
}
