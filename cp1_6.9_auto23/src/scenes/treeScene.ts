import Phaser from 'phaser';
import {
  PuzzlePiece,
  BranchNode,
  generateBranchNodes,
  generatePuzzlePieces,
  ILLUSION_TEXTS
} from '../data/puzzleData';
import type { MemoryTreeGame } from '../main';

interface FloatingPiece {
  sprite: Phaser.GameObjects.Container;
  data: PuzzlePiece;
  originalX: number;
  originalY: number;
  floatTween: Phaser.Tweens.Tween;
}

interface ToolbarPiece {
  sprite: Phaser.GameObjects.Container;
  data: PuzzlePiece;
  slotIndex: number;
}

interface Star {
  sprite: Phaser.GameObjects.Graphics;
  twinkleTween: Phaser.Tweens.Tween;
  moveTween: Phaser.Tweens.Tween;
}

export class TreeScene extends Phaser.Scene {
  private branchNodes: BranchNode[] = [];
  private puzzlePieces: PuzzlePiece[] = [];
  private availablePieces: PuzzlePiece[] = [];
  private branchGraphics!: Phaser.GameObjects.Graphics;
  private nodeHitAreas: Map<number, Phaser.Geom.Rectangle> = new Map();

  private floatingPieces: FloatingPiece[] = [];
  private toolbarPieces: ToolbarPiece[] = [];
  private readonly MAX_FLOATING = 5;
  private readonly MAX_TOOLBAR = 3;

  private stars: Star[] = [];
  private readonly STAR_COUNT = 40;

  private progressText!: Phaser.GameObjects.Text;
  private unlockTextBg!: Phaser.GameObjects.Graphics;
  private unlockText!: Phaser.GameObjects.Text;
  private edgeGlow!: Phaser.GameObjects.Graphics;

  private illusionContainer!: Phaser.GameObjects.Container;
  private illusionGraphics!: Phaser.GameObjects.Graphics;
  private isIllusionPlaying = false;

  private draggedPiece: ToolbarPiece | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;

  private pieceSpawnTimer!: Phaser.Time.TimerEvent;
  private endingContainer!: Phaser.GameObjects.Container;

  private scaleFactor = 1;

  constructor() {
    super('TreeScene');
  }

  public init(): void {
    this.scaleFactor = Math.min(window.innerWidth / 1280, window.innerHeight / 800, 1.2);
  }

  public create(): void {
    this.initGameData();
    this.createBackground();
    this.createStars();
    this.createEdgeGlow();
    this.createTree();
    this.createUI();
    this.createIllusionLayer();
    this.setupPieceSpawning();
    this.setupInputEvents();
    this.updateProgress();
  }

  private initGameData(): void {
    const cx = this.scale.width / 2;
    const baseY = this.scale.height - 120 * this.scaleFactor;
    this.branchNodes = generateBranchNodes(cx, baseY);
    this.puzzlePieces = generatePuzzlePieces();
    this.availablePieces = [...this.puzzlePieces];
    Phaser.Utils.Array.Shuffle(this.availablePieces);
  }

  private createBackground(): void {
    const bg = this.add.graphics();
    const gradient = bg.createGradientTexture(
      'skyGradient',
      this.scale.width,
      this.scale.height,
      [0x0F0C29, 0x302B63, 0x302B63, 0x0F0C29]
    );
    bg.setTexture(gradient);
    bg.setDepth(-10);
    this.add.image(this.scale.width / 2, this.scale.height / 2, 'skyGradient')
      .setDisplaySize(this.scale.width, this.scale.height)
      .setDepth(-10);
    bg.destroy();
  }

  private createStars(): void {
    for (let i = 0; i < this.STAR_COUNT; i++) {
      const x = Phaser.Math.Between(0, this.scale.width);
      const y = Phaser.Math.Between(0, this.scale.height * 0.7);
      const size = Phaser.Math.FloatBetween(1, 3);
      const alpha = Phaser.Math.FloatBetween(0.3, 0.9);

      const star = this.add.graphics();
      star.fillStyle(0xffffff, alpha);
      star.fillCircle(x, y, size);
      star.setDepth(-5);

      const twinkleTween = this.tweens.add({
        targets: star,
        alpha: { from: alpha * 0.3, to: alpha },
        duration: Phaser.Math.Between(1500, 3500),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      const moveX = Phaser.Math.FloatBetween(-5, 5);
      const moveY = Phaser.Math.FloatBetween(-3, 3);
      const moveTween = this.tweens.add({
        targets: star,
        x: x + moveX,
        y: y + moveY,
        duration: Phaser.Math.Between(8000, 15000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      this.stars.push({ sprite: star, twinkleTween, moveTween });
    }
  }

  private createEdgeGlow(): void {
    this.edgeGlow = this.add.graphics();
    this.edgeGlow.setDepth(20);
    this.edgeGlow.setAlpha(0);
  }

  private createTree(): void {
    this.branchGraphics = this.add.graphics();
    this.branchGraphics.setDepth(1);
    this.drawTree();
  }

  private drawTree(): void {
    this.branchGraphics.clear();
    this.nodeHitAreas.clear();

    for (const node of this.branchNodes) {
      const angleRad = Phaser.Math.DegToRad(node.angle);
      const endX = node.x + Math.cos(angleRad) * node.length;
      const endY = node.y + Math.sin(angleRad) * node.length;

      if (node.repaired) {
        this.branchGraphics.lineStyle(node.thickness, 0x2d5a27, 1);
        this.branchGraphics.beginPath();
        this.branchGraphics.moveTo(node.x, node.y);
        this.branchGraphics.lineTo(endX, endY);
        this.branchGraphics.strokePath();

        this.branchGraphics.lineStyle(node.thickness + 3, 0x00ff66, 0.6);
        this.branchGraphics.beginPath();
        this.branchGraphics.moveTo(node.x, node.y);
        this.branchGraphics.lineTo(endX, endY);
        this.branchGraphics.strokePath();

        this.branchGraphics.lineStyle(node.thickness, 0x4ade80, 1);
        this.branchGraphics.beginPath();
        this.branchGraphics.moveTo(node.x, node.y);
        this.branchGraphics.lineTo(endX, endY);
        this.branchGraphics.strokePath();
      } else {
        this.branchGraphics.lineStyle(node.thickness, 0x555555, 1);
        this.branchGraphics.beginPath();
        this.branchGraphics.moveTo(node.x, node.y);
        this.branchGraphics.lineTo(endX, endY);
        this.branchGraphics.strokePath();

        const midX = (node.x + endX) / 2;
        const midY = (node.y + endY) / 2;
        const hitSize = Math.max(40, node.length * 0.8);
        this.nodeHitAreas.set(node.id, new Phaser.Geom.Rectangle(
          midX - hitSize / 2,
          midY - hitSize / 2,
          hitSize,
          hitSize
        ));

        this.drawBrokenStone(midX, midY, node.thickness);
      }
    }
  }

  private drawBrokenStone(x: number, y: number, size: number): void {
    this.branchGraphics.fillStyle(0x666666, 0.9);
    this.branchGraphics.fillCircle(x - size * 0.3, y, size * 0.4);
    this.branchGraphics.fillCircle(x + size * 0.2, y - size * 0.2, size * 0.35);
    this.branchGraphics.fillCircle(x + size * 0.1, y + size * 0.3, size * 0.3);

    this.branchGraphics.lineStyle(1, 0x888888, 0.6);
    this.branchGraphics.strokeCircle(x - size * 0.3, y, size * 0.4);
    this.branchGraphics.strokeCircle(x + size * 0.2, y - size * 0.2, size * 0.35);
    this.branchGraphics.strokeCircle(x + size * 0.1, y + size * 0.3, size * 0.3);
  }

  private createUI(): void {
    const padding = 30 * this.scaleFactor;

    this.progressText = this.add.text(
      this.scale.width - padding,
      padding,
      '0 / 20',
      {
        fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
        fontSize: `${28 * this.scaleFactor}px`,
        color: '#FFD700',
        fontStyle: 'bold'
      }
    ).setOrigin(1, 0).setDepth(30);

    this.unlockTextBg = this.add.graphics();
    this.unlockTextBg.setDepth(25);
    this.unlockTextBg.setAlpha(0);

    this.unlockText = this.add.text(
      padding,
      padding + 10 * this.scaleFactor,
      '',
      {
        fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
        fontSize: `${16 * this.scaleFactor}px`,
        color: '#ffffff',
        wordWrap: { width: Math.min(400 * this.scaleFactor, this.scale.width - 100) }
      }
    ).setDepth(26).setAlpha(0);

    const toolbarBg = this.add.graphics();
    toolbarBg.fillStyle(0x000000, 0.4);
    toolbarBg.lineStyle(2, 0xffd700, 0.5);
    const tbWidth = 380 * this.scaleFactor;
    const tbHeight = 100 * this.scaleFactor;
    const tbX = (this.scale.width - tbWidth) / 2;
    const tbY = this.scale.height - tbHeight - 20 * this.scaleFactor;
    toolbarBg.fillRoundedRect(tbX, tbY, tbWidth, tbHeight, 16 * this.scaleFactor);
    toolbarBg.strokeRoundedRect(tbX, tbY, tbWidth, tbHeight, 16 * this.scaleFactor);
    toolbarBg.setDepth(5);

    const toolbarLabel = this.add.text(
      this.scale.width / 2,
      tbY - 8 * this.scaleFactor,
      '记忆碎片 · 工具栏',
      {
        fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
        fontSize: `${14 * this.scaleFactor}px`,
        color: '#FFD700'
      }
    ).setOrigin(0.5, 1).setDepth(6);
  }

  private createIllusionLayer(): void {
    this.illusionContainer = this.add.container(0, 0);
    this.illusionContainer.setDepth(15);
    this.illusionContainer.setAlpha(0);

    this.illusionGraphics = this.add.graphics();
    this.illusionContainer.add(this.illusionGraphics);
  }

  private setupPieceSpawning(): void {
    this.spawnFloatingPiece();
    this.pieceSpawnTimer = this.time.addEvent({
      delay: 10000,
      callback: () => this.spawnFloatingPiece(),
      loop: true
    });
  }

  private spawnFloatingPiece(): void {
    if (this.floatingPieces.length >= this.MAX_FLOATING) return;
    if (this.availablePieces.length === 0) return;

    const pieceData = this.availablePieces.shift()!;
    const container = this.createPieceSprite(pieceData, true);
    const spawnY = this.scale.height - 160 * this.scaleFactor;
    const minX = 80 * this.scaleFactor;
    const maxX = this.scale.width - 80 * this.scaleFactor;
    const spawnX = Phaser.Math.FloatBetween(minX, maxX);
    container.setPosition(spawnX, spawnY);
    container.setDepth(8);
    container.setSize(60 * this.scaleFactor, 60 * this.scaleFactor);
    container.setInteractive({ useHandCursor: true });

    const floatTween = this.tweens.add({
      targets: container,
      y: spawnY - 15 * this.scaleFactor,
      duration: Phaser.Math.Between(2000, 3500),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    container.on('pointerdown', () => this.pickupPiece(pieceData, container, floatTween));

    this.floatingPieces.push({
      sprite: container,
      data: pieceData,
      originalX: spawnX,
      originalY: spawnY,
      floatTween
    });
  }

  private createPieceSprite(data: PuzzlePiece, withGlow: boolean): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const size = 50 * this.scaleFactor;
    const color = Phaser.Display.Color.HexStringToColor(data.color).color;

    if (withGlow) {
      const glow = this.add.graphics();
      glow.fillStyle(color, 0.25);
      glow.fillCircle(0, 0, size * 0.9);
      container.add(glow);

      const glow2 = this.add.graphics();
      glow2.fillStyle(color, 0.15);
      glow2.fillCircle(0, 0, size * 1.2);
      container.add(glow2);
    }

    const shape = this.add.graphics();
    const points: Phaser.Geom.Point[] = [];
    const sides = Phaser.Math.Between(5, 7);
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const r = size * Phaser.Math.FloatBetween(0.55, 0.85);
      points.push(new Phaser.Geom.Point(
        Math.cos(angle) * r,
        Math.sin(angle) * r
      ));
    }

    shape.fillGradientStyle(
      color, color,
      Phaser.Display.Color.GetColor(
        Math.floor(Phaser.Display.Color.IntegerToColor(color).red * 0.6),
        Math.floor(Phaser.Display.Color.IntegerToColor(color).green * 0.6),
        Math.floor(Phaser.Display.Color.IntegerToColor(color).blue * 0.6)
      ),
      Phaser.Display.Color.GetColor(
        Math.floor(Phaser.Display.Color.IntegerToColor(color).red * 0.4),
        Math.floor(Phaser.Display.Color.IntegerToColor(color).green * 0.4),
        Math.floor(Phaser.Display.Color.IntegerToColor(color).blue * 0.4)
      ),
      1
    );

    shape.beginPath();
    shape.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i].x, points[i].y);
    }
    shape.closePath();
    shape.fillPath();

    shape.lineStyle(2, 0xffffff, 0.6);
    shape.strokePath();

    container.add(shape);

    const idText = this.add.text(0, 0, String(data.id), {
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: `${16 * this.scaleFactor}px`,
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(idText);

    return container;
  }

  private pickupPiece(
    data: PuzzlePiece,
    container: Phaser.GameObjects.Container,
    floatTween: Phaser.Tweens.Tween
  ): void {
    if (this.toolbarPieces.length >= this.MAX_TOOLBAR) {
      this.cameras.main.shake(150, 0.005);
      return;
    }

    floatTween.stop();
    this.flashEdgeGlow();

    const idx = this.floatingPieces.findIndex(p => p.data.id === data.id);
    if (idx !== -1) this.floatingPieces.splice(idx, 1);

    const slotIndex = this.toolbarPieces.length;
    const tbX = (this.scale.width - 380 * this.scaleFactor) / 2 + 60 * this.scaleFactor + slotIndex * 110 * this.scaleFactor;
    const tbY = this.scale.height - 70 * this.scaleFactor;

    this.tweens.add({
      targets: container,
      x: tbX,
      y: tbY,
      scale: 0.85,
      duration: 350,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        container.removeAllListeners();
        container.setInteractive({ useHandCursor: true });
        container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          this.startDrag(container, data, slotIndex, pointer);
        });

        this.toolbarPieces.push({
          sprite: container,
          data,
          slotIndex
        });
      }
    });
  }

  private flashEdgeGlow(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const t = 30;

    this.edgeGlow.clear();
    this.edgeGlow.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0.4, 0, 0, 0.4);
    this.edgeGlow.fillRect(0, 0, w, t);
    this.edgeGlow.fillGradientStyle(0, 0.4, 0.4, 0, 0xffffff, 0xffffff, 0xffffff, 0xffffff);
    this.edgeGlow.fillRect(0, h - t, w, t);
    this.edgeGlow.fillGradientStyle(0.4, 0.4, 0, 0, 0xffffff, 0xffffff, 0xffffff, 0xffffff);
    this.edgeGlow.fillRect(0, 0, t, h);
    this.edgeGlow.fillGradientStyle(0, 0, 0.4, 0.4, 0xffffff, 0xffffff, 0xffffff, 0xffffff);
    this.edgeGlow.fillRect(w - t, 0, t, h);

    this.tweens.add({
      targets: this.edgeGlow,
      alpha: { from: 1, to: 0 },
      duration: 500,
      ease: 'Cubic.easeOut'
    });
  }

  private startDrag(
    container: Phaser.GameObjects.Container,
    data: PuzzlePiece,
    slotIndex: number,
    pointer: Phaser.Input.Pointer
  ): void {
    if (this.isIllusionPlaying) return;

    const tbPiece = this.toolbarPieces.find(p => p.data.id === data.id);
    if (!tbPiece) return;

    this.draggedPiece = tbPiece;
    this.dragOffsetX = container.x - pointer.x;
    this.dragOffsetY = container.y - pointer.y;
    container.setDepth(50);
    container.setScale(1);
  }

  private setupInputEvents(): void {
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.draggedPiece) {
        this.draggedPiece.sprite.setPosition(
          pointer.x + this.dragOffsetX,
          pointer.y + this.dragOffsetY
        );
      }
    });

    this.input.on('pointerup', () => {
      if (this.draggedPiece) {
        this.handleDrop(this.draggedPiece);
        this.draggedPiece = null;
      }
    });
  }

  private handleDrop(tbPiece: ToolbarPiece): void {
    const sprite = tbPiece.sprite;
    const data = tbPiece.data;
    let matched = false;

    for (const [nodeId, rect] of this.nodeHitAreas) {
      if (rect.contains(sprite.x, sprite.y)) {
        const node = this.branchNodes.find(n => n.id === nodeId);
        if (node && !node.repaired && data.branchIndex === nodeId) {
          this.repairBranch(node, tbPiece);
          matched = true;
          break;
        } else {
          this.rejectDrop(tbPiece);
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      this.returnToToolbar(tbPiece);
    }
  }

  private repairBranch(node: BranchNode, tbPiece: ToolbarPiece): void {
    node.repaired = true;
    this.nodeHitAreas.delete(node.id);

    const angleRad = Phaser.Math.DegToRad(node.angle);
    const endX = node.x + Math.cos(angleRad) * node.length;
    const endY = node.y + Math.sin(angleRad) * node.length;

    this.spawnSuccessParticles(endX, endY);
    this.drawTree();

    this.tweens.add({
      targets: { scale: 0.8 },
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
      onUpdate: (tween) => {
        const progress = tween.getValue() as number;
        this.animateBranchGrowth(node, progress);
      }
    });

    tbPiece.sprite.destroy();
    const idx = this.toolbarPieces.findIndex(p => p.data.id === tbPiece.data.id);
    if (idx !== -1) this.toolbarPieces.splice(idx, 1);
    this.reflowToolbar();

    (this.game as unknown as MemoryTreeGame).globalState.repairedCount++;
    this.updateProgress();

    const illusionIdx = tbPiece.data.illusionIndex;
    const text = ILLUSION_TEXTS[illusionIdx] || tbPiece.data.unlockText;
    this.playIllusion(illusionIdx, text);

    const state = (this.game as unknown as MemoryTreeGame).globalState;
    if (state.repairedCount >= state.totalBranches) {
      this.time.delayedCall(4000, () => this.playEnding());
    }
  }

  private animateBranchGrowth(node: BranchNode, progress: number): void {
    const angleRad = Phaser.Math.DegToRad(node.angle);
    const currentLength = node.length * progress;
    const endX = node.x + Math.cos(angleRad) * currentLength;
    const endY = node.y + Math.sin(angleRad) * currentLength;

    this.branchGraphics.lineStyle(node.thickness + 3, 0x00ff66, 0.6);
    this.branchGraphics.beginPath();
    this.branchGraphics.moveTo(node.x, node.y);
    this.branchGraphics.lineTo(endX, endY);
    this.branchGraphics.strokePath();
  }

  private spawnSuccessParticles(x: number, y: number): void {
    const particles = this.add.particles(0, 0, undefined, {
      x,
      y,
      speed: { min: 80, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0 },
      lifespan: 800,
      quantity: 20,
      tint: 0xFFD700,
      blendMode: 'ADD',
      gravityY: 100
    });
    this.time.delayedCall(1000, () => particles.destroy());
  }

  private rejectDrop(tbPiece: ToolbarPiece): void {
    this.cameras.main.shake(200, 0.008);
    this.tweens.add({
      targets: tbPiece.sprite,
      x: tbPiece.sprite.x + Phaser.Math.Between(-10, 10),
      duration: 50,
      yoyo: true,
      repeat: 5,
      onComplete: () => this.returnToToolbar(tbPiece)
    });
  }

  private returnToToolbar(tbPiece: ToolbarPiece): void {
    const slotIndex = tbPiece.slotIndex;
    const tbX = (this.scale.width - 380 * this.scaleFactor) / 2 + 60 * this.scaleFactor + slotIndex * 110 * this.scaleFactor;
    const tbY = this.scale.height - 70 * this.scaleFactor;

    this.tweens.add({
      targets: tbPiece.sprite,
      x: tbX,
      y: tbY,
      scale: 0.85,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => tbPiece.sprite.setDepth(8)
    });
  }

  private reflowToolbar(): void {
    this.toolbarPieces.forEach((p, i) => {
      p.slotIndex = i;
      const tbX = (this.scale.width - 380 * this.scaleFactor) / 2 + 60 * this.scaleFactor + i * 110 * this.scaleFactor;
      const tbY = this.scale.height - 70 * this.scaleFactor;
      this.tweens.add({
        targets: p.sprite,
        x: tbX,
        y: tbY,
        duration: 250,
        ease: 'Cubic.easeOut'
      });
    });
  }

  private updateProgress(): void {
    const state = (this.game as unknown as MemoryTreeGame).globalState;
    this.progressText.setText(`${state.repairedCount} / ${state.totalBranches}`);
  }

  private playIllusion(index: number, text: string): void {
    this.isIllusionPlaying = true;

    const cx = this.scale.width / 2;
    const cy = this.scale.height * 0.28;

    this.illusionGraphics.clear();
    const illusionType = index % 5;

    if (illusionType === 0) {
      this.drawDragonIllusion(cx, cy);
    } else if (illusionType === 1) {
      this.drawCastleIllusion(cx, cy);
    } else if (illusionType === 2) {
      this.drawTreeBloomIllusion(cx, cy);
    } else if (illusionType === 3) {
      this.drawSpiritIllusion(cx, cy);
    } else {
      this.drawStarfallIllusion(cx, cy);
    }

    this.illusionContainer.setPosition(0, 0);
    this.illusionContainer.setAlpha(0);
    this.tweens.add({
      targets: this.illusionContainer,
      alpha: { from: 0, to: 0.9 },
      duration: 600,
      ease: 'Cubic.easeIn'
    });

    this.showUnlockText(text);

    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: this.illusionContainer,
        alpha: 0,
        duration: 800,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.isIllusionPlaying = false;
          this.hideUnlockText();
        }
      });
    });
  }

  private drawDragonIllusion(cx: number, cy: number): void {
    this.illusionGraphics.lineStyle(3, 0x9933ff, 0.6);
    this.illusionGraphics.fillStyle(0x6600cc, 0.3);

    const dragonPath: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < 12; i++) {
      dragonPath.push({
        x: cx - 250 + i * 45,
        y: cy + Math.sin(i * 0.8) * 20
      });
    }

    this.illusionGraphics.beginPath();
    this.illusionGraphics.moveTo(dragonPath[0].x, dragonPath[0].y);
    for (let i = 1; i < dragonPath.length; i++) {
      this.illusionGraphics.lineTo(dragonPath[i].x, dragonPath[i].y);
    }
    this.illusionGraphics.strokePath();

    this.illusionGraphics.fillTriangle(
      dragonPath[11].x + 25, dragonPath[11].y,
      dragonPath[11].x, dragonPath[11].y - 15,
      dragonPath[11].x, dragonPath[11].y + 15
    );

    for (let i = 3; i < dragonPath.length - 2; i += 3) {
      const p = dragonPath[i];
      this.illusionGraphics.fillTriangle(p.x, p.y - 10, p.x - 12, p.y - 25, p.x + 12, p.y - 25);
      this.illusionGraphics.strokeTriangle(p.x, p.y - 10, p.x - 12, p.y - 25, p.x + 12, p.y - 25);
    }
  }

  private drawCastleIllusion(cx: number, cy: number): void {
    this.illusionGraphics.lineStyle(2, 0xff6666, 0.6);
    this.illusionGraphics.fillStyle(0x990000, 0.3);

    this.illusionGraphics.fillRect(cx - 100, cy - 40, 50, 100);
    this.illusionGraphics.strokeRect(cx - 100, cy - 40, 50, 100);
    this.illusionGraphics.fillRect(cx - 30, cy - 80, 60, 140);
    this.illusionGraphics.strokeRect(cx - 30, cy - 80, 60, 140);
    this.illusionGraphics.fillRect(cx + 50, cy - 20, 45, 80);
    this.illusionGraphics.strokeRect(cx + 50, cy - 20, 45, 80);

    this.illusionGraphics.fillTriangle(cx - 100, cy - 40, cx - 75, cy - 70, cx - 50, cy - 40);
    this.illusionGraphics.strokeTriangle(cx - 100, cy - 40, cx - 75, cy - 70, cx - 50, cy - 40);
    this.illusionGraphics.fillTriangle(cx - 30, cy - 80, cx, cy - 130, cx + 30, cy - 80);
    this.illusionGraphics.strokeTriangle(cx - 30, cy - 80, cx, cy - 130, cx + 30, cy - 80);
    this.illusionGraphics.fillTriangle(cx + 50, cy - 20, cx + 72, cy - 50, cx + 95, cy - 20);
    this.illusionGraphics.strokeTriangle(cx + 50, cy - 20, cx + 72, cy - 50, cx + 95, cy - 20);

    this.illusionGraphics.lineStyle(2, 0xff3333, 0.4);
    for (let i = 0; i < 6; i++) {
      this.illusionGraphics.beginPath();
      this.illusionGraphics.moveTo(cx - 120 + i * 50, cy + 60);
      this.illusionGraphics.lineTo(cx - 140 + i * 50, cy + 90);
      this.illusionGraphics.strokePath();
    }
  }

  private drawTreeBloomIllusion(cx: number, cy: number): void {
    this.illusionGraphics.lineStyle(3, 0x44ff88, 0.6);
    this.illusionGraphics.fillStyle(0x00cc44, 0.3);

    this.illusionGraphics.fillRect(cx - 8, cy - 20, 16, 100);
    this.illusionGraphics.strokeRect(cx - 8, cy - 20, 16, 100);

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI - Math.PI / 2;
      const bx = cx + Math.cos(angle) * 50;
      const by = cy - 30 + Math.sin(angle) * 40;
      this.illusionGraphics.beginPath();
      this.illusionGraphics.moveTo(cx, cy - 10);
      this.illusionGraphics.lineTo(bx, by);
      this.illusionGraphics.strokePath();
    }

    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Phaser.Math.FloatBetween(40, 100);
      const px = cx + Math.cos(angle) * r;
      const py = cy - 40 + Math.sin(angle) * r * 0.7;
      const size = Phaser.Math.FloatBetween(5, 12);
      this.illusionGraphics.fillStyle(0xffd700, 0.6);
      this.illusionGraphics.fillCircle(px, py, size);
    }
  }

  private drawSpiritIllusion(cx: number, cy: number): void {
    this.illusionGraphics.lineStyle(2, 0x88ffff, 0.7);
    this.illusionGraphics.fillStyle(0x44dddd, 0.25);

    this.illusionGraphics.beginPath();
    this.illusionGraphics.ellipse(cx, cy, 35, 50, 0, 0, Math.PI * 2);
    this.illusionGraphics.fillPath();
    this.illusionGraphics.strokePath();

    this.illusionGraphics.fillStyle(0xffffff, 0.6);
    this.illusionGraphics.fillCircle(cx - 10, cy - 15, 5);
    this.illusionGraphics.fillCircle(cx + 10, cy - 15, 5);

    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const r = 70;
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r * 0.6;
      this.illusionGraphics.fillStyle(0x88ffff, 0.5);
      this.illusionGraphics.fillCircle(px, py, 4);
    }
  }

  private drawStarfallIllusion(cx: number, cy: number): void {
    this.illusionGraphics.lineStyle(2, 0xffe066, 0.7);
    this.illusionGraphics.fillStyle(0xffd700, 0.4);

    for (let i = 0; i < 8; i++) {
      const sx = cx - 200 + i * 55 + Phaser.Math.FloatBetween(-10, 10);
      const sy = cy - 80 + Phaser.Math.FloatBetween(-20, 20);
      const trailLen = Phaser.Math.FloatBetween(30, 60);

      this.illusionGraphics.beginPath();
      this.illusionGraphics.moveTo(sx, sy);
      this.illusionGraphics.lineTo(sx - trailLen * 0.7, sy + trailLen);
      this.illusionGraphics.strokePath();

      this.illusionGraphics.fillCircle(sx, sy, 6);
    }
  }

  private showUnlockText(text: string): void {
    const padding = 30 * this.scaleFactor;
    this.unlockText.setText(text);
    const w = Math.min(420 * this.scaleFactor, this.scale.width - 80);
    const h = this.unlockText.height + 30 * this.scaleFactor;

    this.unlockTextBg.clear();
    this.unlockTextBg.fillStyle(0x000000, 0.6);
    this.unlockTextBg.lineStyle(2, 0xffd700, 0.5);
    this.unlockTextBg.fillRoundedRect(padding - 15, padding, w, h, 12);
    this.unlockTextBg.strokeRoundedRect(padding - 15, padding, w, h, 12);

    this.tweens.add({
      targets: [this.unlockTextBg, this.unlockText],
      alpha: 1,
      duration: 500,
      ease: 'Cubic.easeOut'
    });
  }

  private hideUnlockText(): void {
    this.tweens.add({
      targets: [this.unlockTextBg, this.unlockText],
      alpha: 0,
      duration: 500,
      ease: 'Cubic.easeIn'
    });
  }

  private playEnding(): void {
    (this.game as unknown as MemoryTreeGame).globalState.isComplete = true;
    this.pieceSpawnTimer.remove();

    this.endingContainer = this.add.container(0, 0);
    this.endingContainer.setDepth(40);

    const flowers: Phaser.GameObjects.Graphics[] = [];
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Phaser.Math.FloatBetween(50, 220);
      const baseX = this.scale.width / 2 + Math.cos(angle) * r;
      const baseY = this.scale.height / 2 - 50 + Math.sin(angle) * r * 0.7;

      const flower = this.add.graphics();
      flower.fillStyle(0xffd700, 0.9);
      for (let p = 0; p < 5; p++) {
        const pa = (p / 5) * Math.PI * 2;
        flower.fillCircle(baseX + Math.cos(pa) * 6, baseY + Math.sin(pa) * 6, 4);
      }
      flower.fillStyle(0xff6b9d, 0.9);
      flower.fillCircle(baseX, baseY, 5);
      flower.setAlpha(0);
      flowers.push(flower);
      this.endingContainer.add(flower);
    }

    flowers.forEach((f, i) => {
      this.time.delayedCall(i * 50, () => {
        this.tweens.add({
          targets: f,
          alpha: 1,
          duration: 600,
          ease: 'Cubic.easeOut'
        });
      });
    });

    this.time.delayedCall(2500, () => {
      this.cameras.main.zoomTo(1.3, 3000, 'Cubic.easeInOut');
      this.cameras.main.pan(this.scale.width / 2, this.scale.height / 2 - 50, 3000, 'Cubic.easeInOut');
    });

    this.time.delayedCall(3500, () => {
      const cx = this.scale.width / 2;
      const cy = this.scale.height / 2;

      const btnBg = this.add.graphics();
      btnBg.fillStyle(0xffd700, 0.95);
      btnBg.lineStyle(3, 0xffffff, 0.8);
      const bw = 220 * this.scaleFactor;
      const bh = 70 * this.scaleFactor;
      btnBg.fillRoundedRect(cx - bw / 2, cy + 120, bw, bh, 16);
      btnBg.strokeRoundedRect(cx - bw / 2, cy + 120, bw, bh, 16);

      const btnText = this.add.text(cx, cy + 120 + bh / 2, '重新开始', {
        fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
        fontSize: `${26 * this.scaleFactor}px`,
        color: '#1a1a2e',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      const completeText = this.add.text(cx, cy - 30, '记忆之树已完全修复', {
        fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
        fontSize: `${36 * this.scaleFactor}px`,
        color: '#FFD700',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      completeText.setShadow(0, 0, 20, 'rgba(255,215,0,0.8)');

      this.endingContainer.add([btnBg, btnText, completeText]);

      const btnZone = this.add.zone(cx, cy + 120 + bh / 2, bw, bh);
      btnZone.setInteractive({ useHandCursor: true });
      this.endingContainer.add(btnZone);

      btnZone.on('pointerover', () => {
        this.tweens.add({ targets: btnBg, scale: 1.1, duration: 200 });
        this.tweens.add({ targets: btnText, scale: 1.1, duration: 200 });
      });
      btnZone.on('pointerout', () => {
        this.tweens.add({ targets: btnBg, scale: 1, duration: 200 });
        this.tweens.add({ targets: btnText, scale: 1, duration: 200 });
      });
      btnZone.on('pointerdown', () => this.restartGame());
    });
  }

  private restartGame(): void {
    (this.game as unknown as MemoryTreeGame).resetState();

    this.floatingPieces.forEach(p => {
      p.floatTween.stop();
      p.sprite.destroy();
    });
    this.floatingPieces = [];
    this.toolbarPieces.forEach(p => p.sprite.destroy());
    this.toolbarPieces = [];
    this.stars.forEach(s => {
      s.twinkleTween.stop();
      s.moveTween.stop();
      s.sprite.destroy();
    });
    this.stars = [];

    if (this.endingContainer) this.endingContainer.destroy();
    if (this.pieceSpawnTimer) this.pieceSpawnTimer.remove();

    this.cameras.main.zoom = 1;
    this.cameras.main.centerOn(this.scale.width / 2, this.scale.height / 2);

    this.scene.restart();
  }
}
