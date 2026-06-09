import { AudioEngine, SongInfo } from './audioEngine';
import { Player } from './player';
import { Renderer } from './renderer';
import { GameScene } from './gameScene';

const CANVAS_RATIO = 16 / 9;
const MIN_WIDTH = 800;

class GameApp {
  private canvas: HTMLCanvasElement;
  private audioEngine: AudioEngine;
  private player: Player;
  private renderer: Renderer;
  private gameScene: GameScene;

  private songSelectEl: HTMLElement;
  private songListEl: HTMLElement;
  private startBtn: HTMLElement;
  private gameOverEl: HTMLElement;
  private finalScoreEl: HTMLElement;
  private finalMaxComboEl: HTMLElement;
  private restartBtn: HTMLElement;
  private hudEl: HTMLElement;

  private selectedSongId: string = '';
  private lastFrameTime: number = 0;
  private animationId: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.songSelectEl = document.getElementById('songSelect') as HTMLElement;
    this.songListEl = document.getElementById('songList') as HTMLElement;
    this.startBtn = document.getElementById('startBtn') as HTMLElement;
    this.gameOverEl = document.getElementById('gameOver') as HTMLElement;
    this.finalScoreEl = document.getElementById('finalScore') as HTMLElement;
    this.finalMaxComboEl = document.getElementById('finalMaxCombo') as HTMLElement;
    this.restartBtn = document.getElementById('restartBtn') as HTMLElement;
    this.hudEl = document.getElementById('hud') as HTMLElement;

    this.audioEngine = new AudioEngine();
    this.player = new Player(3);
    this.renderer = new Renderer(this.canvas);
    this.gameScene = new GameScene(this.audioEngine, this.player, this.renderer);

    this.gameScene.setGameOverCallback(this.handleGameOver.bind(this));

    this.setupCanvas();
    this.setupEventListeners();
    this.loadSongList();
  }

  private setupCanvas(): void {
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const appEl = document.getElementById('app') as HTMLElement;
    const maxWidth = window.innerWidth - 40;
    const maxHeight = window.innerHeight - 40;

    let width = maxWidth;
    let height = width / CANVAS_RATIO;

    if (height > maxHeight) {
      height = maxHeight;
      width = height * CANVAS_RATIO;
    }

    width = Math.max(MIN_WIDTH, width);
    height = Math.max(MIN_WIDTH / CANVAS_RATIO, height);

    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    const cssScale = width / MIN_WIDTH;
    this.songSelectEl.style.width = `${width}px`;
    this.songSelectEl.style.height = `${height}px`;
    this.gameOverEl.style.width = `${width}px`;
    this.gameOverEl.style.height = `${height}px`;
    this.hudEl.style.width = `${width}px`;
    this.hudEl.style.fontSize = `${16 * cssScale}px`;

    this.renderer.resize(Math.floor(width), Math.floor(height));

    if (!this.gameScene.getIsRunning()) {
      this.player.setPosition(this.renderer.width / 3, this.renderer.height * 0.7);
    }
  }

  private setupEventListeners(): void {
    this.startBtn.addEventListener('click', () => this.startGame());
    this.restartBtn.addEventListener('click', () => this.restartToSongSelect());

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (this.gameScene.getIsRunning()) {
          this.gameScene.handleBeatInput();
        }
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (this.gameScene.getIsRunning()) {
          this.gameScene.handleJumpInput();
        }
      }
    });

    this.canvas.addEventListener('click', (e) => {
      if (!this.gameScene.getIsRunning()) return;

      const rect = this.canvas.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const canvasHeight = rect.height;

      if (clickY < canvasHeight * 0.6) {
        this.gameScene.handleJumpInput();
      } else {
        this.gameScene.handleBeatInput();
      }
    });
  }

  private loadSongList(): void {
    const tryLoad = () => {
      const songs = this.audioEngine.getSongs();
      if (songs.length === 0) {
        setTimeout(tryLoad, 50);
        return;
      }
      this.renderSongList(songs);
    };
    tryLoad();
  }

  private renderSongList(songs: SongInfo[]): void {
    this.songListEl.innerHTML = '';

    songs.forEach((song, index) => {
      const item = document.createElement('div');
      item.className = 'song-item';
      item.dataset.songId = song.id;

      if (index === 0) {
        item.classList.add('selected');
        this.selectedSongId = song.id;
      }

      const stars = '★'.repeat(song.difficulty) + '☆'.repeat(3 - song.difficulty);
      const minutes = Math.floor(song.duration / 60);
      const seconds = Math.floor(song.duration % 60);
      const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      item.innerHTML = `
        <span class="song-name">${song.name}</span>
        <span class="song-meta">
          <span class="song-duration">${durationStr}</span>
          <span class="song-difficulty">${stars}</span>
        </span>
      `;

      item.addEventListener('click', () => {
        document.querySelectorAll('.song-item').forEach(el => el.classList.remove('selected'));
        item.classList.add('selected');
        this.selectedSongId = song.id;
      });

      this.songListEl.appendChild(item);
    });
  }

  private async startGame(): Promise<void> {
    await this.audioEngine.loadMusic(this.selectedSongId);

    this.songSelectEl.classList.add('fading');

    setTimeout(() => {
      this.songSelectEl.classList.add('hidden');
      this.songSelectEl.classList.remove('fading');
      this.hudEl.classList.remove('hidden');

      this.gameScene.init();
      this.gameScene.start();
      this.startLoop();
    }, 400);
  }

  private startLoop(): void {
    this.lastFrameTime = performance.now();

    const loop = (currentTime: number) => {
      const deltaTime = (currentTime - this.lastFrameTime) / 1000;
      this.lastFrameTime = currentTime;

      this.gameScene.update(deltaTime);
      this.gameScene.render();

      if (this.gameScene.getIsRunning()) {
        this.animationId = requestAnimationFrame(loop);
      }
    };

    this.animationId = requestAnimationFrame(loop);
  }

  private handleGameOver(score: number, maxCombo: number): void {
    cancelAnimationFrame(this.animationId);
    this.hudEl.classList.add('hidden');
    this.finalScoreEl.textContent = score.toString();
    this.finalMaxComboEl.textContent = `MAX COMBO: ${maxCombo}`;
    this.gameOverEl.classList.add('visible');
  }

  private restartToSongSelect(): void {
    this.gameOverEl.classList.remove('visible');
    this.songSelectEl.classList.remove('hidden');
  }

  destroy(): void {
    cancelAnimationFrame(this.animationId);
    this.audioEngine.destroy();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  (window as any).gameApp = new GameApp();
});
