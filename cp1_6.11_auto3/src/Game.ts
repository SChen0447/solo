import Phaser from 'phaser';
import { TileMap, TileType } from './TileMap';
import { Player } from './Player';
import { HUD } from './ui/HUD';

export class Game extends Phaser.Scene {
  private tileMap!: TileMap;
  private player!: Player;
  private hud!: HUD;
  private graphics!: Phaser.GameObjects.Graphics;
  private fogGraphics!: Phaser.GameObjects.Graphics;
  private particleGraphics!: Phaser.GameObjects.Graphics;
  private uiCanvas!: HTMLCanvasElement;
  private uiCtx!: CanvasRenderingContext2D;
  private inputKeys: { [key: string]: Phaser.Input.Keyboard.Key } = {};
  private isPaused: boolean = false;
  private isGameOver: boolean = false;
  private isVictory: boolean = false;
  private shakeIntensity: number = 0;
  private shakeDuration: number = 0;
  private particles: Particle[] = [];
  private visionRadius: number = 2;
  private visionTransition: number = 0.3;
  private cameraTarget: { x: number; y: number } = { x: 0, y: 0 };
  private cameraSmooth: number = 0.1;
  private pauseOverlay!: Phaser.GameObjects.Graphics;
  private pauseText!: Phaser.GameObjects.Text;
  private continueBtn!: Phaser.GameObjects.Text;
  private restartBtn!: Phaser.GameObjects.Text;
  private gameOverOverlay!: Phaser.GameObjects.Graphics;
  private victoryOverlay!: Phaser.GameObjects.Graphics;

  constructor() {
    super('GameScene');
  }

  preload(): void {
  }

  create(): void {
    this.initMap();
    this.initPlayer();
    this.initGraphics();
    this.initHUD();
    this.initInput();
    this.initPauseMenu();
    this.initGameOverOverlay();
    this.initVictoryOverlay();

    this.cameras.main.setBackgroundColor('#1a1a2e');

    this.scale.on('resize', this.handleResize, this);
  }

  private initMap(): void {
    this.tileMap = new TileMap(20, 20, 32);
    const startPos = this.tileMap.getStartPosition();
    this.tileMap.markExplored(startPos.x, startPos.y);
  }

  private initPlayer(): void {
    this.player = new Player(this.tileMap);
  }

  private initGraphics(): void {
    this.graphics = this.add.graphics();
    this.fogGraphics = this.add.graphics();
    this.particleGraphics = this.add.graphics();

    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
      this.uiCanvas = document.createElement('canvas');
      this.uiCanvas.style.position = 'absolute';
      this.uiCanvas.style.top = '0';
      this.uiCanvas.style.left = '0';
      this.uiCanvas.style.pointerEvents = 'none';
      this.uiCanvas.style.zIndex = '10';
      gameContainer.appendChild(this.uiCanvas);
      this.uiCtx = this.uiCanvas.getContext('2d')!;
      this.resizeUICanvas();
    }
  }

  private resizeUICanvas(): void {
    if (this.uiCanvas) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.uiCanvas.width = w;
      this.uiCanvas.height = h;
      if (this.hud) {
        this.hud.resize(w, h);
      }
    }
  }

  private initHUD(): void {
    const w = this.uiCanvas ? this.uiCanvas.width : 1024;
    const h = this.uiCanvas ? this.uiCanvas.height : 768;
    this.hud = new HUD(this.tileMap, this.player, w, h);
  }

  private initInput(): void {
    this.inputKeys = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      upArrow: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      downArrow: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      leftArrow: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      rightArrow: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      esc: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    };

    this.inputKeys.esc.on('down', () => {
      if (!this.isGameOver && !this.isVictory) {
        this.togglePause();
      }
    });
  }

  private initPauseMenu(): void {
    const { width, height } = this.scale;

    this.pauseOverlay = this.add.graphics();
    this.pauseOverlay.fillStyle(0x000000, 0.7);
    this.pauseOverlay.fillRect(0, 0, width, height);
    this.pauseOverlay.setDepth(100);
    this.pauseOverlay.setVisible(false);
    this.pauseOverlay.setScrollFactor(0);

    this.pauseText = this.add.text(width / 2, height / 2 - 100, 'PAUSED', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '48px',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.pauseText.setDepth(101);
    this.pauseText.setVisible(false);
    this.pauseText.setScrollFactor(0);

    this.continueBtn = this.add.text(width / 2, height / 2, 'CONTINUE', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '20px',
      color: '#00ff00',
      backgroundColor: '#2a2a2a',
      padding: { x: 20, y: 15 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.continueBtn.setDepth(101);
    this.continueBtn.setVisible(false);
    this.continueBtn.setScrollFactor(0);

    this.continueBtn.on('pointerover', () => {
      this.continueBtn.setStyle({ color: '#ffffff', backgroundColor: '#4a4a4a' });
    });
    this.continueBtn.on('pointerout', () => {
      this.continueBtn.setStyle({ color: '#00ff00', backgroundColor: '#2a2a2a' });
    });
    this.continueBtn.on('pointerdown', () => {
      this.togglePause();
    });

    this.restartBtn = this.add.text(width / 2, height / 2 + 80, 'RESTART', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '20px',
      color: '#ff6b6b',
      backgroundColor: '#2a2a2a',
      padding: { x: 20, y: 15 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.restartBtn.setDepth(101);
    this.restartBtn.setVisible(false);
    this.restartBtn.setScrollFactor(0);

    this.restartBtn.on('pointerover', () => {
      this.restartBtn.setStyle({ color: '#ffffff', backgroundColor: '#4a4a4a' });
    });
    this.restartBtn.on('pointerout', () => {
      this.restartBtn.setStyle({ color: '#ff6b6b', backgroundColor: '#2a2a2a' });
    });
    this.restartBtn.on('pointerdown', () => {
      this.restartGame();
    });
  }

  private initGameOverOverlay(): void {
    const { width, height } = this.scale;

    this.gameOverOverlay = this.add.graphics();
    this.gameOverOverlay.fillStyle(0x000000, 0.8);
    this.gameOverOverlay.fillRect(0, 0, width, height);
    this.gameOverOverlay.setDepth(102);
    this.gameOverOverlay.setVisible(false);
    this.gameOverOverlay.setScrollFactor(0);

    const gameOverText = this.add.text(width / 2, height / 2 - 50, 'GAME OVER', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '48px',
      color: '#ff4444'
    }).setOrigin(0.5);
    gameOverText.setDepth(103);
    gameOverText.setVisible(false);
    gameOverText.setScrollFactor(0);
    (this as any).gameOverTextObj = gameOverText;

    const restartGameOverBtn = this.add.text(width / 2, height / 2 + 50, 'RESTART', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#ff4444',
      padding: { x: 30, y: 20 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    restartGameOverBtn.setDepth(103);
    restartGameOverBtn.setVisible(false);
    restartGameOverBtn.setScrollFactor(0);
    (this as any).restartGameOverBtn = restartGameOverBtn;

    restartGameOverBtn.on('pointerover', () => {
      restartGameOverBtn.setStyle({ backgroundColor: '#ff6666' });
    });
    restartGameOverBtn.on('pointerout', () => {
      restartGameOverBtn.setStyle({ backgroundColor: '#ff4444' });
    });
    restartGameOverBtn.on('pointerdown', () => {
      this.restartGame();
    });
  }

  private initVictoryOverlay(): void {
    const { width, height } = this.scale;

    this.victoryOverlay = this.add.graphics();
    this.victoryOverlay.fillStyle(0x000000, 0.8);
    this.victoryOverlay.fillRect(0, 0, width, height);
    this.victoryOverlay.setDepth(102);
    this.victoryOverlay.setVisible(false);
    this.victoryOverlay.setScrollFactor(0);

    const victoryText = this.add.text(width / 2, height / 2 - 50, 'VICTORY!', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '48px',
      color: '#00ff00'
    }).setOrigin(0.5);
    victoryText.setDepth(103);
    victoryText.setVisible(false);
    victoryText.setScrollFactor(0);
    (this as any).victoryTextObj = victoryText;

    const restartVictoryBtn = this.add.text(width / 2, height / 2 + 50, 'PLAY AGAIN', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#00aa00',
      padding: { x: 30, y: 20 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    restartVictoryBtn.setDepth(103);
    restartVictoryBtn.setVisible(false);
    restartVictoryBtn.setScrollFactor(0);
    (this as any).restartVictoryBtn = restartVictoryBtn;

    restartVictoryBtn.on('pointerover', () => {
      restartVictoryBtn.setStyle({ backgroundColor: '#00cc00' });
    });
    restartVictoryBtn.on('pointerout', () => {
      restartVictoryBtn.setStyle({ backgroundColor: '#00aa00' });
    });
    restartVictoryBtn.on('pointerdown', () => {
      this.restartGame();
    });
  }

  update(time: number, delta: number): void {
    if (this.isPaused || this.isGameOver || this.isVictory) {
      return;
    }

    super.update(time, delta);

    const input = {
      up: this.inputKeys.up.isDown || this.inputKeys.upArrow.isDown,
      down: this.inputKeys.down.isDown || this.inputKeys.downArrow.isDown,
      left: this.inputKeys.left.isDown || this.inputKeys.leftArrow.isDown,
      right: this.inputKeys.right.isDown || this.inputKeys.rightArrow.isDown
    };

    const prevGems = this.player.getGemsCollected();
    const prevLives = this.player.getLives();
    const prevPos = this.player.getTilePosition();

    this.player.update(delta, input);

    const currGems = this.player.getGemsCollected();
    const currLives = this.player.getLives();

    if (currGems > prevGems) {
      this.spawnGemParticles();
    }

    if (currLives < prevLives) {
      this.triggerScreenShake(15, 300);
    }

    if (!this.player.isAlive() && !this.isGameOver) {
      this.showGameOver();
    }

    if (this.player.hasWon(this.tileMap.getTotalGems()) && !this.isVictory) {
      this.showVictory();
    }

    this.updateCamera();
    this.updateScreenShake(delta);
    this.updateParticles(delta);

    this.renderMap();
    this.renderPlayer();
    this.renderFog();
    this.renderParticles();
    this.renderHUD();
  }

  private updateCamera(): void {
    const playerCenter = this.player.getCenterPixelPosition();
    const tileSize = this.tileMap.getTileSize();
    const mapPixelWidth = this.tileMap.getWidth() * tileSize;
    const mapPixelHeight = this.tileMap.getHeight() * tileSize;

    const { width, height } = this.scale;

    let targetX = playerCenter.x - width / 2;
    let targetY = playerCenter.y - height / 2;

    targetX = Phaser.Math.Clamp(targetX, 0, Math.max(0, mapPixelWidth - width));
    targetY = Phaser.Math.Clamp(targetY, 0, Math.max(0, mapPixelHeight - height));

    this.cameraTarget.x += (targetX - this.cameraTarget.x) * this.cameraSmooth;
    this.cameraTarget.y += (targetY - this.cameraTarget.y) * this.cameraSmooth;

    this.cameras.main.scrollX = this.cameraTarget.x;
    this.cameras.main.scrollY = this.cameraTarget.y;
  }

  private renderMap(): void {
    this.graphics.clear();

    const tileSize = this.tileMap.getTileSize();
    const mapWidth = this.tileMap.getWidth();
    const mapHeight = this.tileMap.getHeight();

    const cam = this.cameras.main;
    const startX = Math.max(0, Math.floor(cam.scrollX / tileSize));
    const startY = Math.max(0, Math.floor(cam.scrollY / tileSize));
    const endX = Math.min(mapWidth, Math.ceil((cam.scrollX + cam.width) / tileSize));
    const endY = Math.min(mapHeight, Math.ceil((cam.scrollY + cam.height) / tileSize));

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const tile = this.tileMap.getTile(x, y);
        const px = x * tileSize;
        const py = y * tileSize;

        if (tile === TileType.WALL) {
          this.graphics.fillStyle(0x5a3a1a);
          this.graphics.fillRect(px, py, tileSize, tileSize);
          this.graphics.fillStyle(0x6a4a2a);
          this.graphics.fillRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
        } else {
          this.graphics.fillStyle(0x3a4a5a);
          this.graphics.fillRect(px, py, tileSize, tileSize);
          this.graphics.fillStyle(0x2a3a4a);
          this.graphics.fillRect(px + 1, py + 1, tileSize - 2, tileSize - 2);
        }

        if (tile === TileType.GEM) {
          this.drawGem(px + tileSize / 2, py + tileSize / 2, tileSize * 0.4);
        }

        if (tile === TileType.START) {
          this.graphics.fillStyle(0x00ff00, 0.3);
          this.graphics.fillRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
        }

        if (tile === TileType.END) {
          this.graphics.fillStyle(0xffcc00, 0.3);
          this.graphics.fillRect(px + 2, py + 2, tileSize - 4, tileSize - 4);
        }
      }
    }
  }

  private drawGem(cx: number, cy: number, size: number): void {
    const pulse = Math.sin(this.time.now * 0.005) * 0.1 + 1;
    const s = size * pulse;

    this.graphics.fillStyle(0x00ffff, 0.8);
    this.graphics.beginPath();
    this.graphics.moveTo(cx, cy - s);
    this.graphics.lineTo(cx + s, cy);
    this.graphics.lineTo(cx, cy + s);
    this.graphics.lineTo(cx - s, cy);
    this.graphics.closePath();
    this.graphics.fill();

    this.graphics.fillStyle(0xffffff, 0.9);
    this.graphics.beginPath();
    this.graphics.arc(cx - s * 0.3, cy - s * 0.3, s * 0.2, 0, Math.PI * 2);
    this.graphics.fill();
  }

  private renderPlayer(): void {
    const center = this.player.getCenterPixelPosition();
    const trail = this.player.getTrail();
    const tileSize = this.tileMap.getTileSize();
    const radius = tileSize * 0.35;

    for (let i = trail.length - 1; i >= 0; i--) {
      const t = trail[i];
      const alpha = t.alpha * 0.5;
      const r = radius * (1 - i / trail.length * 0.5);
      this.graphics.fillStyle(0x4dabf7, alpha);
      this.graphics.beginPath();
      this.graphics.arc(t.x, t.y, r, 0, Math.PI * 2);
      this.graphics.fill();
    }

    const flashAlpha = this.player.getFlashAlpha();
    if (flashAlpha > 0) {
      this.graphics.fillStyle(0xff4444, flashAlpha);
      this.graphics.beginPath();
      this.graphics.arc(center.x, center.y, radius * 1.3, 0, Math.PI * 2);
      this.graphics.fill();
    }

    const gradient = this.graphics.createGradientStyle(
      center.x - radius, center.y - radius,
      center.x + radius, center.y + radius,
      0x87ceeb, 0x4dabf7, 0x3498db, 1
    );
    this.graphics.fillGradientStyle(0x87ceeb, 0x4dabf7, 0x3498db, 0x2980b9, 1);
    this.graphics.beginPath();
    this.graphics.arc(center.x, center.y, radius, 0, Math.PI * 2);
    this.graphics.fill();

    this.graphics.fillStyle(0xffffff, 0.6);
    this.graphics.beginPath();
    this.graphics.arc(center.x - radius * 0.3, center.y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
    this.graphics.fill();

    this.graphics.lineStyle(2, 0x4dabf7, 0.3);
    this.graphics.beginPath();
    this.graphics.arc(center.x, center.y, radius * 1.5, 0, Math.PI * 2);
    this.graphics.strokePath();
  }

  private renderFog(): void {
    this.fogGraphics.clear();

    const { width, height } = this.scale;
    const cam = this.cameras.main;
    const playerCenter = this.player.getCenterPixelPosition();
    const tileSize = this.tileMap.getTileSize();
    const visionPixelRadius = this.visionRadius * tileSize;

    this.fogGraphics.fillStyle(0x000000, 0.95);
    this.fogGraphics.fillRect(cam.scrollX, cam.scrollY, width, height);

    this.fogGraphics.setBlendMode(Phaser.BlendModes.ERASE);

    const rings = 5;
    for (let i = rings; i >= 0; i--) {
      const r = visionPixelRadius + i * tileSize * 0.5;
      const alpha = 0.2 + (i / rings) * 0.8;
      this.fogGraphics.fillStyle(0xffffff, alpha);
      this.fogGraphics.beginPath();
      this.fogGraphics.arc(playerCenter.x, playerCenter.y, r, 0, Math.PI * 2);
      this.fogGraphics.fill();
    }

    this.fogGraphics.setBlendMode(Phaser.BlendModes.NORMAL);
  }

  private triggerScreenShake(intensity: number, duration: number): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  private updateScreenShake(delta: number): void {
    if (this.shakeDuration > 0) {
      this.shakeDuration -= delta;
      if (this.shakeDuration <= 0) {
        this.shakeIntensity = 0;
        this.cameras.main.x = 0;
        this.cameras.main.y = 0;
      } else {
        const shake = this.shakeIntensity * (this.shakeDuration / 300);
        this.cameras.main.x = (Math.random() - 0.5) * shake;
        this.cameras.main.y = (Math.random() - 0.5) * shake;
      }
    }
  }

  private spawnGemParticles(): void {
    const center = this.player.getCenterPixelPosition();
    const particleCount = 12;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5;
      const speed = 80 + Math.random() * 60;
      this.particles.push({
        x: center.x,
        y: center.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 4,
        alpha: 1,
        color: 0x00ffff,
        life: 0.6,
        maxLife: 0.6,
        type: 'star'
      });
    }
  }

  private updateParticles(delta: number): void {
    const dt = delta / 1000;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      p.size *= 0.98;

      if (p.life <= 0 || p.size < 0.5) {
        this.particles.splice(i, 1);
      }
    }
  }

  private renderParticles(): void {
    this.particleGraphics.clear();

    for (const p of this.particles) {
      if (p.type === 'star') {
        this.drawStarParticle(p);
      } else {
        this.particleGraphics.fillStyle(p.color, p.alpha);
        this.particleGraphics.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
  }

  private drawStarParticle(p: any): void {
    const points = 4;
    const outerRadius = p.size;
    const innerRadius = p.size * 0.4;

    this.particleGraphics.fillStyle(p.color, p.alpha);
    this.particleGraphics.beginPath();

    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (Math.PI * i) / points - Math.PI / 2;
      const x = p.x + Math.cos(angle) * radius;
      const y = p.y + Math.sin(angle) * radius;

      if (i === 0) {
        this.particleGraphics.moveTo(x, y);
      } else {
        this.particleGraphics.lineTo(x, y);
      }
    }

    this.particleGraphics.closePath();
    this.particleGraphics.fill();
  }

  private renderHUD(): void {
    if (this.uiCtx && this.hud) {
      this.uiCtx.clearRect(0, 0, this.uiCanvas.width, this.uiCanvas.height);
      this.hud.render(this.uiCtx);
    }
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;

    this.pauseOverlay.setVisible(this.isPaused);
    this.pauseText.setVisible(this.isPaused);
    this.continueBtn.setVisible(this.isPaused);
    this.restartBtn.setVisible(this.isPaused);
  }

  private showGameOver(): void {
    this.isGameOver = true;
    this.gameOverOverlay.setVisible(true);
    (this as any).gameOverTextObj.setVisible(true);
    (this as any).restartGameOverBtn.setVisible(true);
  }

  private showVictory(): void {
    this.isVictory = true;
    this.victoryOverlay.setVisible(true);
    (this as any).victoryTextObj.setVisible(true);
    (this as any).restartVictoryBtn.setVisible(true);
  }

  private restartGame(): void {
    this.tileMap = new TileMap(20, 20, 32);
    this.player = new Player(this.tileMap);
    const w = this.uiCanvas ? this.uiCanvas.width : 1024;
    const h = this.uiCanvas ? this.uiCanvas.height : 768;
    this.hud = new HUD(this.tileMap, this.player, w, h);

    const startPos = this.tileMap.getStartPosition();
    this.tileMap.markExplored(startPos.x, startPos.y);

    this.particles = [];
    this.isPaused = false;
    this.isGameOver = false;
    this.isVictory = false;
    this.shakeIntensity = 0;
    this.shakeDuration = 0;

    this.pauseOverlay.setVisible(false);
    this.pauseText.setVisible(false);
    this.continueBtn.setVisible(false);
    this.restartBtn.setVisible(false);
    this.gameOverOverlay.setVisible(false);
    (this as any).gameOverTextObj.setVisible(false);
    (this as any).restartGameOverBtn.setVisible(false);
    this.victoryOverlay.setVisible(false);
    (this as any).victoryTextObj.setVisible(false);
    (this as any).restartVictoryBtn.setVisible(false);

    const tileSize = this.tileMap.getTileSize();
    this.cameraTarget.x = startPos.x * tileSize - this.scale.width / 2;
    this.cameraTarget.y = startPos.y * tileSize - this.scale.height / 2;
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const width = gameSize.width;
    const height = gameSize.height;

    if (this.pauseOverlay) {
      this.pauseOverlay.clear();
      this.pauseOverlay.fillStyle(0x000000, 0.7);
      this.pauseOverlay.fillRect(0, 0, width, height);
    }

    if (this.gameOverOverlay) {
      this.gameOverOverlay.clear();
      this.gameOverOverlay.fillStyle(0x000000, 0.8);
      this.gameOverOverlay.fillRect(0, 0, width, height);
    }

    if (this.victoryOverlay) {
      this.victoryOverlay.clear();
      this.victoryOverlay.fillStyle(0x000000, 0.8);
      this.victoryOverlay.fillRect(0, 0, width, height);
    }

    if (this.pauseText) this.pauseText.setPosition(width / 2, height / 2 - 100);
    if (this.continueBtn) this.continueBtn.setPosition(width / 2, height / 2);
    if (this.restartBtn) this.restartBtn.setPosition(width / 2, height / 2 + 80);

    if ((this as any).gameOverTextObj) {
      (this as any).gameOverTextObj.setPosition(width / 2, height / 2 - 50);
    }
    if ((this as any).restartGameOverBtn) {
      (this as any).restartGameOverBtn.setPosition(width / 2, height / 2 + 50);
    }

    if ((this as any).victoryTextObj) {
      (this as any).victoryTextObj.setPosition(width / 2, height / 2 - 50);
    }
    if ((this as any).restartVictoryBtn) {
      (this as any).restartVictoryBtn.setPosition(width / 2, height / 2 + 50);
    }

    this.resizeUICanvas();
  }
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: number;
  life: number;
  maxLife: number;
  type: string;
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: {
      width: 1024,
      height: 768
    }
  },
  scene: [Game],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: false
  }
};

new Phaser.Game(config);
