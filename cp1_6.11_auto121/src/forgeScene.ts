import Phaser from 'phaser';
import { ForgeParticles } from './forgeParticles';

export type MetalType = 'iron' | 'steel' | 'silver' | 'gold' | 'obsidian' | 'meteorite';
export type WeaponShape = 'sword' | 'axe' | 'hammer';
export type TextureType = 'spiral' | 'grid' | 'scale' | 'flame';

interface MetalInfo {
  name: string;
  color: number;
  cardColor: number;
  damage: number;
}

const METALS: Record<MetalType, MetalInfo> = {
  iron: { name: '铁', color: 0x8a8a8a, cardColor: 0x6e6e6e, damage: 10 },
  steel: { name: '钢', color: 0xb0b0b0, cardColor: 0x8a8a8a, damage: 15 },
  silver: { name: '银', color: 0xc0c0c0, cardColor: 0xa8a8a8, damage: 12 },
  gold: { name: '金', color: 0xffd700, cardColor: 0xc8a800, damage: 8 },
  obsidian: { name: '黑曜石', color: 0x1a1a2e, cardColor: 0x2d2d4a, damage: 20 },
  meteorite: { name: '陨铁', color: 0x4a0e4e, cardColor: 0x6b1a6e, damage: 25 },
};

export interface ForgeResult {
  metal: MetalType;
  weapon: WeaponShape;
  texture: TextureType;
  damage: number;
}

export class ForgeScene extends Phaser.Scene {
  private particles!: ForgeParticles;
  private selectedMetal: MetalType | null = null;
  private temperature: number = 0;
  private maxTemp: number = 30;
  private isHeating: boolean = false;
  private hammerHits: number = 0;
  private maxHammerHits: number = 20;
  private currentShape: WeaponShape | null = null;
  private forgePhase: 'select' | 'heat' | 'hammer' | 'cool' | 'done' = 'select';
  private metalInForge: Phaser.GameObjects.Rectangle | null = null;
  private forgeGlow!: Phaser.GameObjects.Arc;
  private tempBarBg!: Phaser.GameObjects.Rectangle;
  private tempBarFill!: Phaser.GameObjects.Rectangle;
  private tempText!: Phaser.GameObjects.Text;
  private hammerBtn!: Phaser.GameObjects.Container;
  private shapeButtons: Phaser.GameObjects.Container[] = [];
  private waterBucket!: Phaser.GameObjects.Container;
  private weaponShapeDisplay!: Phaser.GameObjects.Graphics;
  private hammerAnim: Phaser.Tweens.Tween | null = null;
  private heatTimer: Phaser.Time.TimerEvent | null = null;
  private waterRipple!: Phaser.GameObjects.Ellipse;
  private statusText!: Phaser.GameObjects.Text;
  private metalCards: Map<MetalType, Phaser.GameObjects.Container> = new Map();
  private cooledResult: ForgeResult | null = null;

  constructor() {
    super({ key: 'ForgeScene' });
  }

  create(): void {
    this.particles = new ForgeParticles(this);
    this.forgePhase = 'select';
    this.selectedMetal = null;
    this.temperature = 0;
    this.hammerHits = 0;
    this.currentShape = null;
    this.cooledResult = null;

    this.drawBackground();
    this.drawMaterialShelf();
    this.drawForgeArea();
    this.drawAnvilArea();
    this.drawWaterBucket();
    this.drawUI();
    this.updateStatus('选择一种金属锭开始锻造');
  }

  private drawBackground(): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x2b2b2b);
    bg.fillRect(0, 0, 1200, 700);

    bg.fillStyle(0x1a1a1a);
    bg.fillRect(0, 640, 1200, 60);

    const wallBg = this.add.graphics();
    wallBg.fillStyle(0x3b3b3b, 0.5);
    wallBg.fillRect(0, 0, 1200, 80);
    wallBg.lineStyle(2, 0x555555, 0.5);
    for (let x = 0; x < 1200; x += 60) {
      wallBg.strokeLineStyle(1, 0x444444, 0.3);
      wallBg.lineBetween(x, 0, x, 80);
    }

    const title = this.add.text(600, 30, '⚔ 符文熔炉 ⚔', {
      fontSize: '28px',
      color: '#d4af37',
      fontStyle: 'bold',
      fontFamily: 'serif',
    });
    title.setOrigin(0.5);
  }

  private drawMaterialShelf(): void {
    const shelfBg = this.add.graphics();
    shelfBg.fillStyle(0x3b3b3b, 0.8);
    shelfBg.fillRoundedRect(15, 95, 180, 530, 4);
    shelfBg.lineStyle(2, 0xd4af37, 0.3);
    shelfBg.strokeRoundedRect(15, 95, 180, 530, 4);

    const shelfTitle = this.add.text(105, 105, '材料架', {
      fontSize: '16px',
      color: '#d4af37',
      fontStyle: 'bold',
      fontFamily: 'serif',
    });
    shelfTitle.setOrigin(0.5);

    const metalKeys = Object.keys(METALS) as MetalType[];
    metalKeys.forEach((key, i) => {
      const m = METALS[key];
      const cardY = 140 + i * 80;

      const card = this.add.container(105, cardY);

      const bg = this.add.rectangle(0, 0, 155, 65, m.cardColor, 0.9);
      bg.setStrokeStyle(1, 0xd4af37, 0.4);
      bg.setInteractive({ useHandCursor: true });

      const shine = this.add.rectangle(0, -10, 155, 20, 0xffffff, 0.06);

      const metalCircle = this.add.circle(-50, 0, 14, m.color);
      metalCircle.setStrokeStyle(1, 0xd4af37, 0.5);

      const nameText = this.add.text(-25, -8, m.name, {
        fontSize: '14px',
        color: '#f0e6d2',
        fontStyle: 'bold',
        fontFamily: 'serif',
      });

      const dmgText = this.add.text(-25, 10, `伤害: ${m.damage}`, {
        fontSize: '11px',
        color: '#b0a090',
        fontFamily: 'serif',
      });

      card.add([bg, shine, metalCircle, nameText, dmgText]);

      bg.on('pointerover', () => {
        bg.setFillStyle(m.cardColor, 1);
        bg.setStrokeStyle(2, 0xd4af37, 0.8);
        this.tweens.add({ targets: card, scaleX: 1.04, scaleY: 1.04, duration: 100 });
      });

      bg.on('pointerout', () => {
        bg.setFillStyle(m.cardColor, 0.9);
        bg.setStrokeStyle(1, 0xd4af37, 0.4);
        this.tweens.add({ targets: card, scaleX: 1, scaleY: 1, duration: 100 });
      });

      bg.on('pointerdown', () => {
        if (this.forgePhase !== 'select') return;
        this.selectMetal(key, card);
      });

      this.metalCards.set(key, card);
    });
  }

  private selectMetal(key: MetalType, card: Phaser.GameObjects.Container): void {
    this.selectedMetal = key;
    const m = METALS[key];
    const cardWorldPos = new Phaser.Math.Vector2();
    card.getWorldPoint(cardWorldPos);

    const flyMetal = this.add.circle(cardWorldPos.x, cardWorldPos.y, 14, m.color);
    flyMetal.setDepth(200);

    this.tweens.add({
      targets: flyMetal,
      x: 500,
      y: 380,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        flyMetal.destroy();
        this.forgePhase = 'heat';
        this.showMetalInForge(m.color);
        this.updateStatus('点击锻炉开始加热金属');
      },
    });

    this.tweens.add({
      targets: card,
      alpha: 0.3,
      duration: 500,
    });
  }

  private showMetalInForge(color: number): void {
    this.metalInForge = this.add.rectangle(500, 380, 60, 40, color);
    this.metalInForge.setDepth(10);
    this.metalInForge.setStrokeStyle(2, 0x000000, 0.5);

    this.forgeGlow = this.add.circle(500, 400, 120, 0xff4500, 0);
    this.forgeGlow.setDepth(5);
  }

  private drawForgeArea(): void {
    const forge = this.add.graphics();
    forge.fillStyle(0x4a2020);
    forge.fillRoundedRect(380, 300, 240, 220, 6);
    forge.lineStyle(3, 0xd4af37, 0.3);
    forge.strokeRoundedRect(380, 300, 240, 220, 6);

    const innerGlow = this.add.graphics();
    const radGrad = innerGlow.createLinearGradient(500, 340, 500, 520);
    innerGlow.fillStyle(0xff4500, 0.15);
    innerGlow.fillCircle(500, 420, 90);
    innerGlow.fillStyle(0x8b0000, 0.1);
    innerGlow.fillCircle(500, 420, 110);

    const forgeClickZone = this.add.rectangle(500, 410, 220, 200, 0x000000, 0);
    forgeClickZone.setInteractive({ useHandCursor: true });
    forgeClickZone.setDepth(6);

    forgeClickZone.on('pointerdown', () => {
      if (this.forgePhase === 'heat') {
        this.startHeating();
      }
    });

    const forgeLabel = this.add.text(500, 540, '锻炉', {
      fontSize: '16px',
      color: '#d4af37',
      fontStyle: 'bold',
      fontFamily: 'serif',
    });
    forgeLabel.setOrigin(0.5);
  }

  private startHeating(): void {
    if (this.isHeating) return;
    this.isHeating = true;
    this.updateStatus('加热中... 等待金属变红热');

    this.heatTimer = this.time.addEvent({
      delay: 100,
      callback: () => {
        if (this.temperature < this.maxTemp) {
          this.temperature += 0.1;
          this.updateTemperatureDisplay();
          this.updateForgeGlow();
          if (this.temperature >= this.maxTemp) {
            this.isHeating = false;
            this.heatTimer?.destroy();
            this.forgePhase = 'hammer';
            this.updateStatus('金属已炽热！选择武器形状并锤打塑形');
            this.showShapeButtons();
          }
        }
      },
      loop: true,
    });
  }

  private updateTemperatureDisplay(): void {
    const pct = this.temperature / this.maxTemp;
    this.tempBarFill.width = Math.max(1, 200 * pct);

    const r = Math.floor(139 + (255 - 139) * pct);
    const g = Math.floor(0 + (250 - 0) * pct);
    const b = Math.floor(0 + (205 - 0) * pct);
    this.tempBarFill.setFillStyle(Phaser.Display.Color.GetColor(r, g, b));

    this.tempText.setText(`${this.temperature.toFixed(1)}s / ${this.maxTemp}s`);
  }

  private updateForgeGlow(): void {
    if (!this.forgeGlow || !this.metalInForge) return;
    const pct = this.temperature / this.maxTemp;
    this.forgeGlow.setAlpha(pct * 0.4);

    const color = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.IntegerToColor(0x8b0000),
      Phaser.Display.Color.IntegerToColor(0xfffacd),
      1,
      pct
    );
    const newColor = Phaser.Display.Color.GetColor(color.r, color.g, color.b);
    this.metalInForge.setFillStyle(newColor);

    if (pct > 0.3 && Math.random() < 0.1) {
      this.particles.emitSparks(this.metalInForge.x, this.metalInForge.y - 20, 2);
    }
  }

  private drawAnvilArea(): void {
    const anvil = this.add.graphics();
    anvil.fillStyle(0xa9a9a9);
    anvil.fillRect(680, 430, 120, 30);
    anvil.fillStyle(0x696969);
    anvil.fillRect(700, 460, 80, 60);
    anvil.fillStyle(0x808080);
    anvil.fillRect(690, 380, 100, 50);

    const anvilHighlight = this.add.rectangle(730, 390, 90, 40, 0xb0b0b0, 0.3);

    const anvilLabel = this.add.text(730, 540, '铁砧', {
      fontSize: '16px',
      color: '#d4af37',
      fontStyle: 'bold',
      fontFamily: 'serif',
    });
    anvilLabel.setOrigin(0.5);
  }

  private drawWaterBucket(): void {
    this.waterBucket = this.add.container(950, 420);

    const bucketBody = this.add.graphics();
    bucketBody.fillStyle(0x4682b4);
    bucketBody.fillTaperedRect(-40, -10, 80, 70, 4, 8);
    bucketBody.lineStyle(2, 0x708090);
    bucketBody.strokeTaperedRect(-40, -10, 80, 70, 4, 8);

    this.waterRipple = this.add.ellipse(0, 0, 70, 20, 0x000080, 0.7);
    this.waterRipple.setDepth(1);

    const bucketLabel = this.add.text(0, 80, '水桶', {
      fontSize: '14px',
      color: '#d4af37',
      fontStyle: 'bold',
      fontFamily: 'serif',
    });
    bucketLabel.setOrigin(0.5);

    this.waterBucket.add([bucketBody, this.waterRipple, bucketLabel]);
    this.waterBucket.setDepth(8);
    this.waterBucket.setAlpha(0.4);

    this.tweens.add({
      targets: this.waterRipple,
      scaleX: 1.1,
      scaleY: 1.2,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private drawUI(): void {
    this.tempBarBg = this.add.rectangle(500, 270, 204, 16, 0x1a1a1a);
    this.tempBarBg.setStrokeStyle(1, 0xd4af37, 0.5);
    this.tempBarBg.setDepth(15);

    this.tempBarFill = this.add.rectangle(398, 270, 1, 12, 0x8b0000);
    this.tempBarFill.setDepth(16);
    this.tempBarFill.setOrigin(0, 0.5);

    this.tempText = this.add.text(500, 252, `0.0s / ${this.maxTemp}s`, {
      fontSize: '12px',
      color: '#d4af37',
      fontFamily: 'serif',
    });
    this.tempText.setOrigin(0.5);
    this.tempText.setDepth(16);

    this.statusText = this.add.text(600, 660, '', {
      fontSize: '16px',
      color: '#d4af37',
      fontStyle: 'bold',
      fontFamily: 'serif',
    });
    this.statusText.setOrigin(0.5);
  }

  private showShapeButtons(): void {
    const shapes: { key: WeaponShape; label: string }[] = [
      { key: 'sword', label: '剑' },
      { key: 'axe', label: '斧' },
      { key: 'hammer', label: '锤' },
    ];

    shapes.forEach((s, i) => {
      const btn = this.add.container(420 + i * 160, 610);
      const bg = this.add.rectangle(0, 0, 120, 45, 0x3b3b3b, 0.9);
      bg.setStrokeStyle(2, 0xd4af37, 0.6);
      bg.setInteractive({ useHandCursor: true });

      const label = this.add.text(0, 0, s.label, {
        fontSize: '18px',
        color: '#d4af37',
        fontStyle: 'bold',
        fontFamily: 'serif',
      });
      label.setOrigin(0.5);

      btn.add([bg, label]);
      btn.setDepth(20);
      btn.setAlpha(0);

      this.tweens.add({
        targets: btn,
        alpha: 1,
        y: 600,
        duration: 300,
        delay: i * 100,
      });

      bg.on('pointerover', () => {
        bg.setStrokeStyle(2, 0xd4af37, 1);
        this.tweens.add({ targets: btn, scaleX: 1.05, scaleY: 1.05, duration: 100 });
      });

      bg.on('pointerout', () => {
        bg.setStrokeStyle(2, 0xd4af37, 0.6);
        this.tweens.add({ targets: btn, scaleX: 1, scaleY: 1, duration: 100 });
      });

      bg.on('pointerdown', () => {
        if (this.forgePhase === 'hammer' || this.forgePhase === 'heat') {
          this.currentShape = s.key;
          this.forgePhase = 'hammer';
          this.showHammerButton();
          this.shapeButtons.forEach((b) => {
            this.tweens.add({ targets: b, alpha: 0.3, duration: 200 });
          });
          this.tweens.add({ targets: btn, alpha: 1, duration: 200 });
          this.updateStatus(`正在锤打${s.label}形 — 点击锤打按钮塑形！`);
        }
      });

      this.shapeButtons.push(btn);
    });
  }

  private showHammerButton(): void {
    if (this.hammerBtn) return;

    this.hammerBtn = this.add.container(730, 600);

    const bg = this.add.rectangle(0, 0, 140, 55, 0x8b0000, 0.95);
    bg.setStrokeStyle(2, 0xd4af37, 0.8);
    bg.setInteractive({ useHandCursor: true });

    const icon = this.add.text(0, -8, '🔨', { fontSize: '22px' });
    icon.setOrigin(0.5);

    const label = this.add.text(0, 14, '锤打', {
      fontSize: '14px',
      color: '#fffacd',
      fontStyle: 'bold',
      fontFamily: 'serif',
    });
    label.setOrigin(0.5);

    this.hammerBtn.add([bg, icon, label]);
    this.hammerBtn.setDepth(25);
    this.hammerBtn.setAlpha(0);

    this.tweens.add({
      targets: this.hammerBtn,
      alpha: 1,
      duration: 200,
    });

    bg.on('pointerdown', () => {
      this.doHammerHit();
    });
  }

  private doHammerHit(): void {
    if (this.forgePhase !== 'hammer') return;

    this.hammerHits++;
    this.particles.emitSparks(730, 400, 10);

    if (this.hammerBtn) {
      this.tweens.add({
        targets: this.hammerBtn,
        scaleX: 0.9,
        scaleY: 0.9,
        duration: 100,
        yoyo: true,
        ease: 'Power2',
      });
    }

    this.updateWeaponShapeProgress();

    if (this.hammerHits >= this.maxHammerHits) {
      this.forgePhase = 'cool';
      this.updateStatus('武器已成形！将武器拖入水桶淬火');
      this.enableDraggingToBucket();
      if (this.hammerBtn) {
        this.tweens.add({
          targets: this.hammerBtn,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            this.hammerBtn?.destroy();
            this.hammerBtn = null as unknown as Phaser.GameObjects.Container;
          },
        });
      }
      this.shapeButtons.forEach((b) => {
        this.tweens.add({ targets: b, alpha: 0, duration: 300 });
      });
    }
  }

  private updateWeaponShapeProgress(): void {
    if (!this.metalInForge || !this.currentShape) return;

    const pct = Math.min(this.hammerHits / this.maxHammerHits, 1);

    const graphics = this.add.graphics();
    graphics.setDepth(12);
    graphics.clear();

    const cx = this.metalInForge.x;
    const cy = this.metalInForge.y;
    const color = 0x707070;
    graphics.fillStyle(color, 0.6 + pct * 0.4);

    const scale = 0.3 + pct * 0.7;

    if (this.currentShape === 'sword') {
      graphics.fillRect(cx - 8 * scale, cy - 35 * scale, 16 * scale, 50 * scale);
      graphics.fillRect(cx - 18 * scale, cy + 15 * scale, 36 * scale, 8 * scale);
      graphics.fillRect(cx - 5 * scale, cy + 23 * scale, 10 * scale, 10 * scale);
    } else if (this.currentShape === 'axe') {
      graphics.fillRect(cx - 5 * scale, cy - 30 * scale, 10 * scale, 55 * scale);
      graphics.fillCircle(cx - 18 * scale, cy - 15 * scale, 20 * scale);
      graphics.fillCircle(cx + 18 * scale, cy - 15 * scale, 20 * scale);
    } else if (this.currentShape === 'hammer') {
      graphics.fillRect(cx - 5 * scale, cy - 10 * scale, 10 * scale, 45 * scale);
      graphics.fillRoundedRect(cx - 22 * scale, cy - 30 * scale, 44 * scale, 25 * scale, 3);
    }

    this.metalInForge.setAlpha(1 - pct * 0.5);
  }

  private enableDraggingToBucket(): void {
    if (!this.metalInForge) return;

    this.waterBucket.setAlpha(1);

    const dragZone = this.add.rectangle(this.metalInForge.x, this.metalInForge.y, 80, 70, 0x000000, 0);
    dragZone.setInteractive({ draggable: true, useHandCursor: true });
    dragZone.setDepth(50);

    this.input.on('drag', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Rectangle, dragX: number, dragY: number) => {
      if (gameObject !== dragZone) return;
      gameObject.x = dragX;
      gameObject.y = dragY;
      this.metalInForge?.setPosition(dragX, dragY);
    });

    this.input.on('dragend', () => {
      if (!this.metalInForge) return;
      const dist = Phaser.Math.Distance.Between(
        this.metalInForge.x,
        this.metalInForge.y,
        950,
        420
      );

      if (dist < 80) {
        this.startCooling(dragZone);
      } else {
        this.tweens.add({
          targets: [this.metalInForge, dragZone],
          x: 500,
          y: 380,
          duration: 300,
        });
      }
    });
  }

  private startCooling(dragZone: Phaser.GameObjects.Rectangle): void {
    if (this.forgePhase !== 'cool') return;
    this.forgePhase = 'cooling';

    dragZone.destroy();
    this.metalInForge?.setPosition(950, 420);

    this.updateStatus('淬火冷却中...');

    let steamCount = 0;
    const steamInterval = this.time.addEvent({
      delay: 150,
      callback: () => {
        this.particles.emitSteam(950, 400, 15);
        steamCount++;
        if (steamCount > 15) {
          steamInterval.destroy();
          this.applyTexture();
        }
      },
      loop: true,
    });
  }

  private applyTexture(): void {
    const textures: TextureType[] = ['spiral', 'grid', 'scale', 'flame'];
    const chosen = textures[Phaser.Math.Between(0, textures.length - 1)];
    const metal = this.selectedMetal!;
    const weapon = this.currentShape!;

    this.cooledResult = {
      metal,
      weapon,
      texture: chosen,
      damage: METALS[metal].damage + (weapon === 'sword' ? 5 : weapon === 'axe' ? 8 : 10),
    };

    if (this.metalInForge) {
      this.drawTextureOnWeapon(this.metalInForge, chosen);
    }

    this.tweens.add({
      targets: this.metalInForge,
      alpha: 1,
      duration: 500,
    });

    this.forgePhase = 'done';
    this.updateStatus('锻造完成！点击武器前往附魔台');

    const proceedBtn = this.add.container(950, 540);
    const btnBg = this.add.rectangle(0, 0, 140, 45, 0x3b3b3b, 0.95);
    btnBg.setStrokeStyle(2, 0xd4af37, 0.8);
    btnBg.setInteractive({ useHandCursor: true });

    const btnLabel = this.add.text(0, 0, '前往附魔', {
      fontSize: '14px',
      color: '#d4af37',
      fontStyle: 'bold',
      fontFamily: 'serif',
    });
    btnLabel.setOrigin(0.5);

    proceedBtn.add([btnBg, btnLabel]);
    proceedBtn.setDepth(30);

    btnBg.on('pointerdown', () => {
      this.scene.start('EnchantScene', { forgeResult: this.cooledResult });
    });
  }

  private drawTextureOnWeapon(obj: Phaser.GameObjects.Rectangle, texture: TextureType): void {
    const g = this.add.graphics();
    g.setDepth(13);

    const x = obj.x - 30;
    const y = obj.y - 20;

    g.lineStyle(1, 0xd4af37, 0.4);

    if (texture === 'spiral') {
      for (let angle = 0; angle < Math.PI * 6; angle += 0.2) {
        const r = angle * 2;
        const px = x + 30 + Math.cos(angle) * r;
        const py = y + 20 + Math.sin(angle) * r;
        g.fillCircle(px, py, 1);
      }
    } else if (texture === 'grid') {
      for (let gx = x; gx < x + 60; gx += 8) {
        g.lineBetween(gx, y, gx, y + 40);
      }
      for (let gy = y; gy < y + 40; gy += 8) {
        g.lineBetween(x, gy, x + 60, gy);
      }
    } else if (texture === 'scale') {
      for (let gy = y; gy < y + 40; gy += 8) {
        const offset = (Math.floor((gy - y) / 8) % 2) * 5;
        for (let gx = x + offset; gx < x + 60; gx += 12) {
          g.strokeCircle(gx, gy, 5);
        }
      }
    } else if (texture === 'flame') {
      for (let i = 0; i < 8; i++) {
        const fx = x + Phaser.Math.Between(5, 55);
        const fy = y + Phaser.Math.Between(5, 35);
        g.fillStyle(0xff4500, 0.3);
        g.fillCircle(fx, fy, Phaser.Math.Between(3, 8));
      }
    }
  }

  private updateStatus(text: string): void {
    if (this.statusText) {
      this.statusText.setText(text);
    }
  }

  update(): void {
    if (this.forgePhase === 'hammer' && this.metalInForge) {
      if (Phaser.Math.Between(0, 100) < 3) {
        this.particles.emitSparks(this.metalInForge.x, this.metalInForge.y - 15, 2);
      }
    }
  }
}
