import { Rune, RunePoint, CoreState } from './Rune';
import { UI } from './UI';

interface Slab {
  x: number;
  y: number;
  gridGraphics: Phaser.GameObjects.Graphics;
  borderGraphics: Phaser.GameObjects.Graphics;
  coreGraphics: Phaser.GameObjects.Graphics;
  coreState: CoreState;
  rune: Rune;
  activated: boolean;
}

interface BackgroundParticle {
  graphics: Phaser.GameObjects.Graphics;
  vx: number;
  vy: number;
}

interface PortalParticle {
  graphics: Phaser.GameObjects.Graphics;
  angle: number;
  radius: number;
  speed: number;
  size: number;
}

export class SceneGame extends Phaser.Scene {
  static readonly GRID_SIZE = 8;
  static readonly CELL_SIZE = 40;
  static readonly SNAP_DISTANCE = 12;
  static readonly SLAB_SPACING = 60;
  static readonly NUM_SLABS = 3;

  private slabs: Slab[] = [];
  private currentSlabIndex: number = 0;
  private isDrawing: boolean = false;
  private tempSegment: Phaser.GameObjects.Graphics | null = null;
  private lastDrawPoint: RunePoint | null = null;

  private ui!: UI;
  private health: number = 3;
  private level: number = 1;

  private backgroundParticles: BackgroundParticle[] = [];
  private portalParticles: PortalParticle[] = [];
  private portalContainer: Phaser.GameObjects.Container | null = null;
  private portalLightBeam: Phaser.GameObjects.Graphics | null = null;
  private isLevelComplete: boolean = false;

  private slabTotalSize: number = 0;
  private slabsStartX: number = 0;
  private slabsY: number = 0;

  constructor() {
    super('SceneGame');
  }

  preload(): void {}

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    this.slabTotalSize = SceneGame.GRID_SIZE * SceneGame.CELL_SIZE;
    const totalSlabsWidth = SceneGame.NUM_SLABS * this.slabTotalSize + (SceneGame.NUM_SLABS - 1) * SceneGame.SLAB_SPACING;
    this.slabsStartX = (width - totalSlabsWidth) / 2;
    this.slabsY = (height - this.slabTotalSize) / 2 - 50;

    this.createLampPosts();
    this.createBackgroundParticles();
    this.createSlabs();

    this.ui = new UI(this);
    this.ui.create(0, 0, width, height);
    this.ui.setResetButtonCallback(() => this.resetCurrentSlab());

    this.setupInputEvents();
  }

  private createLampPosts(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const lampHeight = 300;
    const lampY = height / 2;

    this.createLampPost(100, lampY, lampHeight);
    this.createLampPost(width - 100, lampY, lampHeight);
  }

  private createLampPost(x: number, y: number, height: number): void {
    const post = this.add.graphics();
    post.fillStyle(0x2a2a3a, 1);
    post.fillRect(x - 8, y - height / 2, 16, height);

    post.lineStyle(2, 0x4a4a6a, 1);
    post.strokeRect(x - 8, y - height / 2, 16, height);

    for (let i = 0; i < 5; i++) {
      const glowY = y - height / 2 + (i + 1) * (height / 6);
      const glow = this.add.graphics();
      
      glow.fillStyle(0xa0c4ff, 0.15);
      glow.beginPath();
      glow.arc(x, glowY, 35, 0, Math.PI * 2);
      glow.fillPath();

      glow.fillStyle(0xa0c4ff, 0.3);
      glow.beginPath();
      glow.arc(x, glowY, 22, 0, Math.PI * 2);
      glow.fillPath();

      glow.fillStyle(0xa0c4ff, 0.6);
      glow.beginPath();
      glow.arc(x, glowY, 10, 0, Math.PI * 2);
      glow.fillPath();

      glow.fillStyle(0xffffff, 0.9);
      glow.beginPath();
      glow.arc(x, glowY, 4, 0, Math.PI * 2);
      glow.fillPath();
    }
  }

  private createBackgroundParticles(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.Between(1, 3);
      const alpha = Phaser.Math.FloatBetween(0.3, 0.7);

      const graphics = this.add.graphics();
      graphics.fillStyle(0x6b5b95, alpha);
      graphics.beginPath();
      graphics.arc(x, y, size, 0, Math.PI * 2);
      graphics.fillPath();

      this.backgroundParticles.push({
        graphics,
        vx: Phaser.Math.FloatBetween(-0.3, 0.3),
        vy: Phaser.Math.FloatBetween(-0.3, 0.3)
      });
    }
  }

  private createSlabs(): void {
    for (let i = 0; i < SceneGame.NUM_SLABS; i++) {
      const x = this.slabsStartX + i * (this.slabTotalSize + SceneGame.SLAB_SPACING);
      const y = this.slabsY;
      this.createSlab(x, y, i);
    }
  }

  private createSlab(x: number, y: number, index: number): void {
    const size = this.slabTotalSize;

    const border = this.add.graphics();
    border.lineStyle(3, 0x8b7355, 0.8);
    border.strokeRect(x - 2, y - 2, size + 4, size + 4);

    const grid = this.add.graphics();
    grid.fillStyle(0x2b1f14, 1);
    grid.fillRect(x, y, size, size);

    grid.lineStyle(1, 0x8b7355, 0.5);
    for (let i = 0; i <= SceneGame.GRID_SIZE; i++) {
      const lineX = x + i * SceneGame.CELL_SIZE;
      const lineY = y + i * SceneGame.CELL_SIZE;
      grid.beginPath();
      grid.moveTo(lineX, y);
      grid.lineTo(lineX, y + size);
      grid.strokePath();
      grid.beginPath();
      grid.moveTo(x, lineY);
      grid.lineTo(x + size, lineY);
      grid.strokePath();
    }

    const coreX = x + size / 2;
    const coreY = y + size / 2;
    const core = this.add.graphics();
    this.drawCore(core, coreX, coreY, 0x555555);

    const rune = new Rune(
      this,
      x,
      y,
      SceneGame.GRID_SIZE,
      SceneGame.CELL_SIZE,
      SceneGame.SNAP_DISTANCE
    );

    this.slabs.push({
      x,
      y,
      gridGraphics: grid,
      borderGraphics: border,
      coreGraphics: core,
      coreState: CoreState.INACTIVE,
      rune,
      activated: false
    });
  }

  private drawCore(graphics: Phaser.GameObjects.Graphics, x: number, y: number, color: number): void {
    graphics.clear();
    
    graphics.fillStyle(color, 0.3);
    graphics.beginPath();
    graphics.arc(x, y, 25, 0, Math.PI * 2);
    graphics.fillPath();

    graphics.fillStyle(color, 0.6);
    graphics.beginPath();
    graphics.arc(x, y, 22, 0, Math.PI * 2);
    graphics.fillPath();

    graphics.fillStyle(color, 1);
    graphics.beginPath();
    graphics.arc(x, y, 20, 0, Math.PI * 2);
    graphics.fillPath();

    graphics.fillStyle(0xffffff, 0.4);
    graphics.beginPath();
    graphics.arc(x - 5, y - 5, 5, 0, Math.PI * 2);
    graphics.fillPath();
  }

  private setupInputEvents(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isLevelComplete) return;
      this.startDrawing(pointer);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDrawing || this.isLevelComplete) return;
      this.onDrawing(pointer);
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDrawing || this.isLevelComplete) return;
      this.endDrawing(pointer);
    });

    this.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDrawing || this.isLevelComplete) return;
      this.endDrawing(pointer);
    });
  }

  private findSlabAt(x: number, y: number): number {
    for (let i = 0; i < this.slabs.length; i++) {
      const slab = this.slabs[i];
      if (slab.activated) continue;
      
      if (
        x >= slab.x &&
        x <= slab.x + this.slabTotalSize &&
        y >= slab.y &&
        y <= slab.y + this.slabTotalSize
      ) {
        return i;
      }
    }
    return -1;
  }

  private startDrawing(pointer: Phaser.Input.Pointer): void {
    const slabIndex = this.findSlabAt(pointer.x, pointer.y);
    if (slabIndex === -1) return;

    const slab = this.slabs[slabIndex];
    const snapped = slab.rune.snapToGrid(pointer.x, pointer.y);
    
    if (!snapped) return;

    this.currentSlabIndex = slabIndex;
    this.isDrawing = true;
    this.lastDrawPoint = snapped;
    slab.rune.addPoint(snapped);
  }

  private onDrawing(pointer: Phaser.Input.Pointer): void {
    if (!this.lastDrawPoint) return;

    const slab = this.slabs[this.currentSlabIndex];
    const snapped = slab.rune.snapToGrid(pointer.x, pointer.y);

    if (snapped && (snapped.gridX !== this.lastDrawPoint.gridX || snapped.gridY !== this.lastDrawPoint.gridY)) {
      if (this.tempSegment) {
        this.tempSegment.destroy();
        this.tempSegment = null;
      }
      
      slab.rune.addSegment(this.lastDrawPoint, snapped);
      slab.rune.addPoint(snapped);
      this.lastDrawPoint = snapped;
    }

    if (this.tempSegment) {
      slab.rune.updateTempSegment(this.tempSegment, this.lastDrawPoint, pointer.x, pointer.y);
    } else if (this.lastDrawPoint) {
      this.tempSegment = slab.rune.createTempSegment(this.lastDrawPoint, {
        x: pointer.x,
        y: pointer.y,
        gridX: 0,
        gridY: 0
      });
    }
  }

  private endDrawing(pointer: Phaser.Input.Pointer): void {
    if (this.tempSegment) {
      this.tempSegment.destroy();
      this.tempSegment = null;
    }

    const slab = this.slabs[this.currentSlabIndex];
    const rune = slab.rune;

    this.isDrawing = false;
    this.lastDrawPoint = null;

    if (rune.points.length < 2) {
      rune.clear();
      return;
    }

    const snappedEnd = rune.snapToGrid(pointer.x, pointer.y);
    if (snappedEnd && rune.points.length > 0) {
      const lastPoint = rune.points[rune.points.length - 1];
      if (snappedEnd.gridX !== lastPoint.gridX || snappedEnd.gridY !== lastPoint.gridY) {
        rune.addSegment(lastPoint, snappedEnd);
        rune.addPoint(snappedEnd);
      }
    }

    this.time.delayedCall(500, () => {
      if (rune.validate()) {
        this.activateSlabCore(this.currentSlabIndex);
      } else {
        this.handleInvalidRune(this.currentSlabIndex);
      }
    });
  }

  private activateSlabCore(slabIndex: number): void {
    const slab = this.slabs[slabIndex];
    slab.coreState = CoreState.ACTIVATING;

    const coreX = slab.x + this.slabTotalSize / 2;
    const coreY = slab.y + this.slabTotalSize / 2;

    this.createEnergyRipple(coreX, coreY);
    this.animateSlabBorder(slab);

    const colors = [0x555555, 0xff8c00, 0xffd700];
    let colorIndex = 0;

    const colorTween = () => {
      if (colorIndex < colors.length) {
        this.tweens.addCounter({
          from: 0,
          to: 1,
          duration: 300,
          onUpdate: (tween) => {
            const progress = tween.getValue();
            const prevColor = colors[colorIndex];
            const nextColor = colors[colorIndex + 1] || colors[colorIndex];
            
            const r = Phaser.Math.Interpolation.Linear([
              (prevColor >> 16) & 255,
              (nextColor >> 16) & 255
            ], progress);
            const g = Phaser.Math.Interpolation.Linear([
              (prevColor >> 8) & 255,
              (nextColor >> 8) & 255
            ], progress);
            const b = Phaser.Math.Interpolation.Linear([
              prevColor & 255,
              nextColor & 255
            ], progress);

            const color = (r << 16) | (g << 8) | b;
            this.drawCore(slab.coreGraphics, coreX, coreY, color);
          },
          onComplete: () => {
            colorIndex++;
            if (colorIndex < colors.length - 1) {
              colorTween();
            } else {
              slab.coreState = CoreState.ACTIVE;
              slab.activated = true;
              this.ui.updateScore(100);
              this.flashSlabEdge(slab);
              this.checkLevelComplete();
            }
          }
        });
      }
    };

    colorTween();
  }

  private createEnergyRipple(x: number, y: number): void {
    const ripple = this.add.graphics();
    let radius = 20;
    let alpha = 0.8;

    this.tweens.add({
      targets: { radius, alpha },
      radius: 80,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.Out',
      onUpdate: (tween) => {
        const r = tween.getValue() as number;
        const a = 1 - tween.progress;
        ripple.clear();
        
        ripple.lineStyle(4, 0xffd700, a * 0.5);
        ripple.beginPath();
        ripple.arc(x, y, r, 0, Math.PI * 2);
        ripple.strokePath();

        ripple.lineStyle(2, 0xffd700, a);
        ripple.beginPath();
        ripple.arc(x, y, r * 0.8, 0, Math.PI * 2);
        ripple.strokePath();
      },
      onComplete: () => {
        ripple.destroy();
      }
    });
  }

  private animateSlabBorder(slab: Slab): void {
    this.tweens.add({
      targets: slab.borderGraphics,
      alpha: 0.3,
      duration: 150,
      yoyo: true,
      repeat: 3,
      onStart: () => {
        slab.borderGraphics.clear();
        slab.borderGraphics.lineStyle(3, 0xffd700, 1);
        slab.borderGraphics.strokeRect(slab.x - 2, slab.y - 2, this.slabTotalSize + 4, this.slabTotalSize + 4);
      },
      onComplete: () => {
        slab.borderGraphics.clear();
        slab.borderGraphics.lineStyle(3, 0x8b7355, 0.8);
        slab.borderGraphics.strokeRect(slab.x - 2, slab.y - 2, this.slabTotalSize + 4, this.slabTotalSize + 4);
      }
    });
  }

  private flashSlabEdge(slab: Slab): void {
    const flash = this.add.graphics();
    let alpha = 0;

    this.tweens.add({
      targets: { alpha },
      alpha: 1,
      duration: 250,
      yoyo: true,
      repeat: 0,
      onUpdate: (tween) => {
        const a = tween.getValue() as number;
        flash.clear();
        flash.lineStyle(4, 0xffd700, a);
        flash.strokeRect(slab.x - 4, slab.y - 4, this.slabTotalSize + 8, this.slabTotalSize + 8);
      },
      onComplete: () => {
        flash.destroy();
      }
    });
  }

  private handleInvalidRune(slabIndex: number): void {
    const slab = this.slabs[slabIndex];
    const rune = slab.rune;

    rune.flashInvalid();

    this.time.delayedCall(300, () => {
      rune.clear();
      
      this.health--;
      this.ui.updateHealth(this.health);

      if (this.health <= 0) {
        this.gameOver();
      }
    });
  }

  private resetCurrentSlab(): void {
    if (this.isDrawing) {
      this.isDrawing = false;
      if (this.tempSegment) {
        this.tempSegment.destroy();
        this.tempSegment = null;
      }
      this.lastDrawPoint = null;
    }

    const unactivatedSlab = this.slabs.find(s => !s.activated);
    if (unactivatedSlab) {
      unactivatedSlab.rune.clear();
    }
  }

  private checkLevelComplete(): void {
    const allActivated = this.slabs.every(s => s.activated);
    if (allActivated && !this.isLevelComplete) {
      this.isLevelComplete = true;
      this.time.delayedCall(500, () => this.createPortal());
    }
  }

  private createPortal(): void {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.portalLightBeam = this.add.graphics();
    let beamAlpha = 0;

    this.tweens.add({
      targets: { beamAlpha },
      beamAlpha: 1,
      duration: 2000,
      ease: 'Cubic.Out',
      onUpdate: (tween) => {
        const a = tween.getValue() as number;
        if (this.portalLightBeam) {
          this.portalLightBeam.clear();
          
          this.portalLightBeam.fillStyle(0xffd700, a * 0.1);
          this.portalLightBeam.fillRect(centerX - 80, 0, 160, this.scale.height);
          
          this.portalLightBeam.fillStyle(0xffd700, a * 0.2);
          this.portalLightBeam.fillRect(centerX - 50, 0, 100, this.scale.height);
          
          this.portalLightBeam.fillStyle(0xffd700, a * 0.3);
          this.portalLightBeam.fillRect(centerX - 25, 0, 50, this.scale.height);
        }
      }
    });

    this.portalContainer = this.add.container(centerX, centerY);

    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2;
      const radius = 50 + Phaser.Math.Between(-10, 10);
      const size = Phaser.Math.Between(3, 6);
      
      const graphics = this.add.graphics();
      graphics.fillStyle(0x8a2be2, 1);
      graphics.beginPath();
      graphics.arc(0, 0, size, 0, Math.PI * 2);
      graphics.fillPath();

      const particle: PortalParticle = {
        graphics,
        angle,
        radius,
        speed: 0.5 * (Math.PI * 2) / 60,
        size
      };

      this.portalParticles.push(particle);
      this.portalContainer.add(graphics);
    }

    this.portalContainer.setSize(140, 140);
    this.portalContainer.setInteractive({ useHandCursor: true });

    this.portalContainer.on('pointerdown', () => {
      this.nextLevel();
    });

    this.ui.setHint('点击传送门进入下一层');
  }

  private nextLevel(): void {
    this.level++;
    this.isLevelComplete = false;

    if (this.portalContainer) {
      this.portalContainer.destroy();
      this.portalContainer = null;
    }
    if (this.portalLightBeam) {
      this.portalLightBeam.destroy();
      this.portalLightBeam = null;
    }
    this.portalParticles = [];

    this.slabs.forEach(slab => {
      slab.activated = false;
      slab.coreState = CoreState.INACTIVE;
      slab.rune.clear();
      
      const coreX = slab.x + this.slabTotalSize / 2;
      const coreY = slab.y + this.slabTotalSize / 2;
      this.drawCore(slab.coreGraphics, coreX, coreY, 0x555555);
    });

    this.ui.updateLevel(this.level);
    this.ui.setHint('绘制封闭符文回路（至少6个节点）以激活核心');
  }

  private gameOver(): void {
    this.ui.showGameOver(this.ui.getScore(), () => {
      this.restartGame();
    });
  }

  private restartGame(): void {
    this.level = 1;
    this.health = 3;
    this.isLevelComplete = false;

    if (this.portalContainer) {
      this.portalContainer.destroy();
      this.portalContainer = null;
    }
    if (this.portalLightBeam) {
      this.portalLightBeam.destroy();
      this.portalLightBeam = null;
    }
    this.portalParticles = [];

    this.slabs.forEach(slab => {
      slab.activated = false;
      slab.coreState = CoreState.INACTIVE;
      slab.rune.clear();
      
      const coreX = slab.x + this.slabTotalSize / 2;
      const coreY = slab.y + this.slabTotalSize / 2;
      this.drawCore(slab.coreGraphics, coreX, coreY, 0x555555);
    });

    this.ui.reset(1);
  }

  update(time: number, delta: number): void {
    const width = this.scale.width;
    const height = this.scale.height;

    this.backgroundParticles.forEach(p => {
      const particle = p.graphics;
      const currentX = particle.x || 0;
      const currentY = particle.y || 0;
      
      let newX = currentX + p.vx;
      let newY = currentY + p.vy;

      if (newX < 0) newX = width;
      if (newX > width) newX = 0;
      if (newY < 0) newY = height;
      if (newY > height) newY = 0;

      particle.setPosition(newX, newY);
    });

    if (this.portalContainer && this.portalParticles.length > 0) {
      this.portalParticles.forEach((p, i) => {
        p.angle += p.speed;
        
        const progress = p.angle / (Math.PI * 2);
        const color = progress < 0.5 
          ? Phaser.Display.Color.Interpolate.ColorWithColor(
              new Phaser.Display.Color(138, 43, 226),
              new Phaser.Display.Color(74, 144, 217),
              50,
              Math.floor(progress * 100)
            )
          : Phaser.Display.Color.Interpolate.ColorWithColor(
              new Phaser.Display.Color(74, 144, 217),
              new Phaser.Display.Color(138, 43, 226),
              50,
              Math.floor((progress - 0.5) * 100)
            );

        const rgb = Phaser.Display.Color.GetColor(color.r, color.g, color.b);
        
        const x = Math.cos(p.angle) * p.radius;
        const y = Math.sin(p.angle) * p.radius;
        
        p.graphics.clear();
        p.graphics.fillStyle(rgb, 1);
        p.graphics.beginPath();
        p.graphics.arc(x, y, p.size, 0, Math.PI * 2);
        p.graphics.fillPath();
      });
    }
  }

  destroy(): void {
    this.slabs.forEach(slab => slab.rune.destroy());
    this.backgroundParticles.forEach(p => p.graphics.destroy());
    this.portalParticles.forEach(p => p.graphics.destroy());
    if (this.portalContainer) this.portalContainer.destroy();
    if (this.portalLightBeam) this.portalLightBeam.destroy();
    this.ui.destroy();
  }
}
