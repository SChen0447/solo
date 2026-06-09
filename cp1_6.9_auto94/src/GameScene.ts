import Phaser from 'phaser';
import { PlayerController } from './PlayerController';
import { MazeGenerator, CrystalData } from './MazeGenerator';
import { CollisionManager, CollisionEvent } from './CollisionManager';
import { ParticleEffects } from './ParticleEffects';

type GameState = 'playing' | 'levelComplete' | 'victory' | 'gameover';

export class GameScene extends Phaser.Scene {
  private worldBounds!: Phaser.Geom.Rectangle;
  private player!: PlayerController;
  private maze!: MazeGenerator;
  private collisionManager!: CollisionManager;
  private particles!: ParticleEffects;

  private energy: number = 50;
  private maxEnergy: number = 300;
  private level: number = 1;
  private maxLevel: number = 5;
  private gameState: GameState = 'playing';

  private timer: number = 180;
  private lastEnergyMilestone: number = 0;

  private energyBarBg!: Phaser.GameObjects.Graphics;
  private energyBar!: Phaser.GameObjects.Graphics;
  private energyText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private minimapBg!: Phaser.GameObjects.Graphics;
  private floatingTexts: Phaser.GameObjects.Text[] = [];

  private guardianLotusContainer!: Phaser.GameObjects.Container;
  private guardianActive: boolean = false;
  private fireworksTimer: number = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  public preload(): void {
    this.load.atlas('flares', 'https://labs.phaser.io/assets/particles/flares.png', 'https://labs.phaser.io/assets/particles/flares.json');
  }

  public create(): void {
    this.worldBounds = new Phaser.Geom.Rectangle(0, 0, 1200, 800);
    this.createBackground();
    this.createGrid();

    this.particles = new ParticleEffects(this);
    this.maze = new MazeGenerator(this, this.worldBounds);
    this.player = new PlayerController(this, this.worldBounds);
    this.collisionManager = new CollisionManager(this, this.maze, this.particles);

    this.maze.generate(this.level);
    this.createUI();
    this.gameState = 'playing';
    this.energy = 50;
    this.timer = 180;
    this.lastEnergyMilestone = 0;
    this.guardianActive = false;
    this.updateUI();
  }

  private createBackground(): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0f0c29, 0x0f0c29, 0x302b63, 0x302b63, 1);
    bg.fillRect(0, 0, 1200, 800);
    bg.setDepth(-10);

    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, 1200);
      const y = Phaser.Math.Between(0, 800);
      const size = Phaser.Math.FloatBetween(0.5, 2);
      const star = this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.3, 0.9));
      star.setDepth(-5);
      this.tweens.add({
        targets: star,
        alpha: { from: 0.2, to: 0.9 },
        duration: Phaser.Math.Between(1500, 3500),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private createGrid(): void {
    const grid = this.add.graphics();
    grid.setDepth(-3);
    grid.lineStyle(1, 0x00ff88, 0.2);
    for (let x = 0; x <= 1200; x += 50) {
      grid.moveTo(x, 0);
      grid.lineTo(x, 800);
    }
    for (let y = 0; y <= 800; y += 50) {
      grid.moveTo(0, y);
      grid.lineTo(1200, y);
    }
    grid.strokePath();
  }

  private createUI(): void {
    this.energyBarBg = this.add.graphics();
    this.energyBarBg.setDepth(200);
    this.energyBarBg.fillStyle(0x000000, 0.5);
    this.energyBarBg.fillRoundedRect(20, 20, 20, 200, 6);
    this.energyBarBg.lineStyle(2, 0x88ffff, 0.6);
    this.energyBarBg.strokeRoundedRect(20, 20, 20, 200, 6);

    this.energyBar = this.add.graphics();
    this.energyBar.setDepth(201);

    this.energyText = this.add.text(50, 110, '', {
      fontFamily: 'Segoe UI',
      fontSize: '20px',
      color: '#00ffff',
      fontStyle: 'bold',
      stroke: '#000033',
      strokeThickness: 3
    }).setDepth(202);

    this.timerText = this.add.text(1180, 25, '', {
      fontFamily: 'Segoe UI',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000033',
      strokeThickness: 3
    }).setOrigin(1, 0).setDepth(202);

    this.levelText = this.add.text(600, 20, '', {
      fontFamily: 'Segoe UI',
      fontSize: '20px',
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#000033',
      strokeThickness: 3
    }).setOrigin(0.5, 0).setDepth(202);

    this.minimapBg = this.add.graphics();
    this.minimapBg.setDepth(200);
    this.minimapBg.fillStyle(0x000000, 0.4);
    this.minimapBg.fillRoundedRect(1080, 680, 100, 100, 8);
    this.minimapBg.lineStyle(2, 0x88ffff, 0.5);
    this.minimapBg.strokeRoundedRect(1080, 680, 100, 100, 8);
  }

  private updateUI(): void {
    this.energyBar.clear();
    const barHeight = (this.energy / this.maxEnergy) * 196;
    const barY = 220 - barHeight;
    this.energyBar.fillGradientStyle(0xff4444, 0xff4444, 0x4444ff, 0x4444ff, 1);
    this.energyBar.fillRoundedRect(22, barY, 16, barHeight - 2, 4);

    this.energyText.setText(`${Math.floor(this.energy)}/${this.maxEnergy}`);

    const minutes = Math.floor(this.timer / 60);
    const seconds = Math.floor(this.timer % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    this.timerText.setText(timeStr);
    if (this.timer < 30 && Math.floor(this.timer * 2) % 2 === 0) {
      this.timerText.setColor('#ff4444');
    } else {
      this.timerText.setColor('#ffffff');
    }

    this.levelText.setText(`第 ${this.level} / ${this.maxLevel} 关`);
  }

  private updateMinimap(): void {
    this.minimapBg.clear();
    this.minimapBg.fillStyle(0x000000, 0.4);
    this.minimapBg.fillRoundedRect(1080, 680, 100, 100, 8);
    this.minimapBg.lineStyle(2, 0x88ffff, 0.5);
    this.minimapBg.strokeRoundedRect(1080, 680, 100, 100, 8);

    const crystals = this.maze.getCrystals();
    crystals.forEach(c => {
      if (c.collected) return;
      const mx = 1080 + (c.x / 1200) * 100;
      const my = 680 + (c.y / 800) * 100;
      this.minimapBg.fillStyle(0xffffff, 1);
      this.minimapBg.fillCircle(mx, my, 1);
    });

    const p = this.player.getState();
    const px = 1080 + (p.x / 1200) * 100;
    const py = 680 + (p.y / 800) * 100;
    this.minimapBg.fillStyle(0xffd700, 1);
    this.minimapBg.fillCircle(px, py, 2.5);

    if (this.guardianActive) {
      const gx = 1080 + (600 / 1200) * 100;
      const gy = 680 + (400 / 800) * 100;
      this.minimapBg.lineStyle(2, 0xffd700, 0.8);
      this.minimapBg.strokeCircle(gx, gy, 5);
    }
  }

  private addFloatingText(text: string, x: number, y: number, color: string = '#00ff00'): void {
    const t = this.add.text(x, y, text, {
      fontFamily: 'Segoe UI',
      fontSize: '18px',
      color: color,
      fontStyle: 'bold',
      stroke: '#000033',
      strokeThickness: 3
    }).setOrigin(0.5, 0.5).setDepth(300);

    this.floatingTexts.push(t);
    this.tweens.add({
      targets: t,
      y: y - 40,
      alpha: { from: 1, to: 0 },
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        t.destroy();
        const idx = this.floatingTexts.indexOf(t);
        if (idx >= 0) this.floatingTexts.splice(idx, 1);
      }
    });
  }

  private handleCollisionEvents(events: CollisionEvent[]): void {
    for (const ev of events) {
      if (ev.type === 'crystal') {
        this.energy = Math.min(this.maxEnergy, this.energy + 10);
        this.addFloatingText('+10', ev.crystalX!, ev.crystalY! - 20, '#00ff88');

        const milestone = Math.floor(this.energy / 100);
        if (milestone > this.lastEnergyMilestone && milestone > 0) {
          this.lastEnergyMilestone = milestone;
          this.maze.generate(this.level);
        }

        if (this.energy >= this.maxEnergy && !this.guardianActive) {
          this.spawnGuardianLotus();
        }
      } else if (ev.type === 'petal') {
        this.energy = Math.max(0, this.energy - 5);
        this.player.applyBounce(ev.petalAngle!, 450);
        this.addFloatingText('-5', ev.petalX!, ev.petalY! - 20, '#ff4444');

        if (this.energy <= 0) {
          this.triggerGameOver('能量耗尽！');
        }
      }
    }
  }

  private spawnGuardianLotus(): void {
    this.guardianActive = true;
    this.guardianLotusContainer = this.add.container(600, 900);
    this.guardianLotusContainer.setDepth(150);

    const petals: Phaser.GameObjects.Graphics[] = [];
    for (let layer = 0; layer < 3; layer++) {
      const petalCount = 8 + layer * 4;
      const layerRadius = 50 + layer * 25;
      for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2 + layer * 0.2;
        const petal = this.add.graphics();
        const hue = (300 + layer * 30 + i * 8) % 360;
        const color = Phaser.Display.Color.HSVToRGB(hue / 360, 0.7, 1).color;
        petal.fillStyle(color, 0.6);
        petal.beginPath();
        petal.slice(layerRadius * 0.5, 0, layerRadius * 0.6, angle, angle + Math.PI, false);
        petal.fillPath();
        petal.setRotation(angle);
        petal.setScale(0);
        this.guardianLotusContainer.add(petal);
        petals.push(petal);
      }
    }

    const centerGlow = this.add.arc(0, 0, 30, 0, 360, false, 0xffd700, 0.5);
    this.guardianLotusContainer.add(centerGlow);

    const halo = this.add.arc(0, 0, 45, 0, 360, false, 0x000000, 0);
    halo.setStrokeStyle(3, 0xffd700, 0.9);
    this.guardianLotusContainer.add(halo);
    (this.guardianLotusContainer as any).halo = halo;

    this.tweens.add({
      targets: this.guardianLotusContainer,
      y: 400,
      alpha: { from: 0, to: 0.9 },
      duration: 3000,
      ease: 'Cubic.easeOut'
    });

    petals.forEach((p, idx) => {
      this.tweens.add({
        targets: p,
        scale: { from: 0, to: 1 },
        duration: 2000,
        delay: 1000 + idx * 50,
        ease: 'Back.easeOut'
      });
    });
  }

  private checkGuardianVictory(): void {
    if (!this.guardianActive || !this.guardianLotusContainer) return;
    const p = this.player.getState();
    const dx = p.x - 600;
    const dy = p.y - 400;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 40) {
      this.triggerVictory();
    }
  }

  private triggerVictory(): void {
    if (this.gameState === 'victory') return;
    this.gameState = 'victory';
    this.fireworksTimer = 0;

    const victoryText = this.add.text(600, 300, '', {
      fontFamily: 'Segoe UI',
      fontSize: '48px',
      color: '#ffd700',
      fontStyle: 'bold',
      stroke: '#000033',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(500);

    if (this.level >= this.maxLevel) {
      victoryText.setText('🎉 通关胜利！');
    } else {
      victoryText.setText(`第 ${this.level} 关完成！`);
      this.time.delayedCall(3000, () => {
        this.level++;
        this.resetLevel();
      });
    }
  }

  private triggerGameOver(reason: string): void {
    if (this.gameState === 'gameover') return;
    this.gameState = 'gameover';
    this.add.text(600, 350, `💔 ${reason}`, {
      fontFamily: 'Segoe UI',
      fontSize: '48px',
      color: '#ff4444',
      fontStyle: 'bold',
      stroke: '#000033',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(500);

    this.add.text(600, 420, '点击屏幕重新开始', {
      fontFamily: 'Segoe UI',
      fontSize: '22px',
      color: '#ffffff',
      stroke: '#000033',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(500);

    this.input.once('pointerdown', () => {
      this.level = 1;
      this.resetLevel();
    });
  }

  private resetLevel(): void {
    this.floatingTexts.forEach(t => t.destroy());
    this.floatingTexts = [];
    if (this.guardianLotusContainer) {
      this.guardianLotusContainer.destroy();
    }
    this.guardianActive = false;
    this.energy = 50;
    this.timer = 180;
    this.lastEnergyMilestone = 0;
    this.player.reset();
    this.maze.generate(this.level);
    this.gameState = 'playing';
    this.updateUI();

    this.children.list.filter((c: any) => c.depth === 500).forEach(c => c.destroy());
  }

  public update(_time: number, delta: number): void {
    if (this.gameState !== 'playing') {
      if (this.gameState === 'victory') {
        this.fireworksTimer += delta;
        if (this.fireworksTimer >= 500) {
          this.fireworksTimer = 0;
          this.particles.emitFireworks(
            Phaser.Math.Between(100, 1100),
            Phaser.Math.Between(100, 600)
          );
        }
        if (this.guardianLotusContainer) {
          const halo = (this.guardianLotusContainer as any).halo;
          if (halo) halo.rotation += delta / 1000 * 2;
        }
      }
      return;
    }

    this.timer -= delta / 1000;
    if (this.timer <= 0) {
      this.timer = 0;
      this.triggerGameOver('时间到！');
      return;
    }

    this.player.update(delta);
    this.maze.update(delta);

    const pState = this.player.getState();
    this.particles.updateTrailTarget(pState.x, pState.y, Math.abs(pState.velocityX) + Math.abs(pState.velocityY) > 50);

    const events = this.collisionManager.checkCollisions(pState);
    this.handleCollisionEvents(events);

    if (this.guardianActive) {
      this.checkGuardianVictory();
      if (this.guardianLotusContainer) {
        const halo = (this.guardianLotusContainer as any).halo;
        if (halo) halo.rotation += delta / 1000 * 2;
      }
    }

    this.updateUI();
    this.updateMinimap();
  }
}
