import Phaser from 'phaser';
import { ForgeParticles } from './forgeParticles';
import { ForgeResult, MetalType, WeaponShape, TextureType } from './forgeScene';

type RuneType = 'fire' | 'ice' | 'lightning' | 'shadow' | 'light' | 'nature';

interface RuneInfo {
  name: string;
  symbol: string;
  color: number;
  property: string;
  extraDamage: number;
}

const RUNES: Record<RuneType, RuneInfo> = {
  fire: { name: '火焰', symbol: '🔥', color: 0xff4500, property: '灼烧', extraDamage: 8 },
  ice: { name: '冰霜', symbol: '❄️', color: 0x00bfff, property: '冻结', extraDamage: 6 },
  lightning: { name: '雷电', symbol: '⚡', color: 0xffd700, property: '电击', extraDamage: 10 },
  shadow: { name: '暗影', symbol: '🌑', color: 0x4b0082, property: '暗蚀', extraDamage: 9 },
  light: { name: '光明', symbol: '✨', color: 0xffffff, property: '神圣', extraDamage: 7 },
  nature: { name: '自然', symbol: '🌿', color: 0x228b22, property: '再生', extraDamage: 5 },
};

const WEAPON_NAMES_ZH: Record<WeaponShape, string[]> = {
  sword: ['烈焰之刃', '寒冰长剑', '雷鸣圣剑', '暗影刺剑', '圣光裁决', '翠风利刃'],
  axe: ['裂地战斧', '冰霜巨斧', '雷霆劈斧', '暗夜斧', '光辉战斧', '自然裂斧'],
  hammer: ['熔岩锤', '冰封重锤', '闪电锤', '暗影碎锤', '圣光之锤', '生命锤'],
};

export class EnchantScene extends Phaser.Scene {
  private particles!: ForgeParticles;
  private forgeResult!: ForgeResult;
  private selectedRunes: RuneType[] = [];
  private runeSlots: (Phaser.GameObjects.Container | null)[] = [null, null];
  private weaponDisplay!: Phaser.GameObjects.Container;
  private enchantPhase: 'select' | 'merge' | 'done' = 'select';
  private statusText!: Phaser.GameObjects.Text;
  private cardContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'EnchantScene' });
  }

  init(data: { forgeResult: ForgeResult }): void {
    this.forgeResult = data.forgeResult;
    this.selectedRunes = [];
    this.runeSlots = [null, null];
    this.enchantPhase = 'select';
  }

  create(): void {
    this.particles = new ForgeParticles(this);
    this.drawBackground();
    this.drawEnchantTable();
    this.drawRuneShelf();
    this.drawWeaponDisplay();
    this.drawRuneSlots();
    this.drawUI();
    this.updateStatus('选择两个符文镶嵌到武器上');
  }

  private drawBackground(): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x2b2b2b);
    bg.fillRect(0, 0, 1200, 700);

    const tableBg = this.add.graphics();
    tableBg.fillStyle(0x1a1a1a, 0.3);
    tableBg.fillRect(0, 620, 1200, 80);

    const title = this.add.text(600, 30, '✦ 符文附魔台 ✦', {
      fontSize: '28px',
      color: '#d4af37',
      fontStyle: 'bold',
      fontFamily: 'serif',
    });
    title.setOrigin(0.5);
  }

  private drawEnchantTable(): void {
    const table = this.add.graphics();
    table.fillStyle(0x4a3728);
    table.fillRoundedRect(350, 350, 500, 250, 6);
    table.lineStyle(2, 0xd4af37, 0.4);
    table.strokeRoundedRect(350, 350, 500, 250, 6);

    const glow = this.add.circle(600, 470, 80, 0x4b0082, 0.08);
    const innerGlow = this.add.circle(600, 470, 50, 0x8b0000, 0.05);

    this.tweens.add({
      targets: [glow, innerGlow],
      alpha: 0.15,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const tableLabel = this.add.text(600, 610, '附魔台', {
      fontSize: '16px',
      color: '#d4af37',
      fontStyle: 'bold',
      fontFamily: 'serif',
    });
    tableLabel.setOrigin(0.5);
  }

  private drawRuneShelf(): void {
    const shelfBg = this.add.graphics();
    shelfBg.fillStyle(0x3b3b3b, 0.8);
    shelfBg.fillRoundedRect(15, 80, 180, 520, 4);
    shelfBg.lineStyle(2, 0xd4af37, 0.3);
    shelfBg.strokeRoundedRect(15, 80, 180, 520, 4);

    const shelfTitle = this.add.text(105, 95, '符文库', {
      fontSize: '16px',
      color: '#d4af37',
      fontStyle: 'bold',
      fontFamily: 'serif',
    });
    shelfTitle.setOrigin(0.5);

    const runeKeys = Object.keys(RUNES) as RuneType[];
    runeKeys.forEach((key, i) => {
      const r = RUNES[key];
      const cardY = 130 + i * 78;

      const card = this.add.container(105, cardY);

      const bg = this.add.rectangle(0, 0, 155, 65, 0x2a2a2a, 0.95);
      bg.setStrokeStyle(1, r.color, 0.5);
      bg.setInteractive({ useHandCursor: true });

      const glowCircle = this.add.circle(-50, 0, 20, r.color, 0.15);

      const symbol = this.add.text(-50, 0, r.symbol, { fontSize: '24px' });
      symbol.setOrigin(0.5);

      const nameText = this.add.text(-20, -10, r.name, {
        fontSize: '13px',
        color: '#f0e6d2',
        fontStyle: 'bold',
        fontFamily: 'serif',
      });

      const propText = this.add.text(-20, 8, r.property, {
        fontSize: '11px',
        color: '#b0a090',
        fontFamily: 'serif',
      });

      card.add([bg, glowCircle, symbol, nameText, propText]);

      this.tweens.add({
        targets: glowCircle,
        alpha: 0.3,
        duration: Phaser.Math.Between(1000, 2000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: i * 200,
      });

      bg.on('pointerover', () => {
        bg.setStrokeStyle(2, r.color, 1);
        this.tweens.add({ targets: card, scaleX: 1.04, scaleY: 1.04, duration: 100 });
      });

      bg.on('pointerout', () => {
        bg.setStrokeStyle(1, r.color, 0.5);
        this.tweens.add({ targets: card, scaleX: 1, scaleY: 1, duration: 100 });
      });

      bg.on('pointerdown', () => {
        if (this.enchantPhase !== 'select') return;
        this.selectRune(key, card);
      });
    });
  }

  private selectRune(key: RuneType, card: Phaser.GameObjects.Container): void {
    if (this.selectedRunes.includes(key)) return;
    if (this.selectedRunes.length >= 2) return;

    this.selectedRunes.push(key);
    const r = RUNES[key];
    const slotIndex = this.selectedRunes.length - 1;

    const cardWorldPos = new Phaser.Math.Vector2();
    card.getWorldPoint(cardWorldPos);

    const flyRune = this.add.text(cardWorldPos.x, cardWorldPos.y, r.symbol, { fontSize: '28px' });
    flyRune.setDepth(200);
    flyRune.setOrigin(0.5);

    const targetX = 530 + slotIndex * 140;
    const targetY = 380;

    this.tweens.add({
      targets: flyRune,
      x: targetX,
      y: targetY - 20,
      duration: 600,
      ease: 'Power2',
      onComplete: () => {
        this.tweens.add({
          targets: flyRune,
          y: targetY,
          duration: 200,
          ease: 'Bounce.easeOut',
          onComplete: () => {
            flyRune.destroy();
            this.placeRuneInSlot(key, slotIndex);
          },
        });

        this.particles.emitBurst(targetX, targetY, r.color, 15);
      },
    });

    this.tweens.add({
      targets: card,
      alpha: 0.3,
      duration: 600,
    });

    this.updateStatus(`已选择 ${r.name} 符文 (${this.selectedRunes.length}/2)`);

    if (this.selectedRunes.length === 2) {
      this.time.delayedCall(1000, () => {
        this.startMerge();
      });
    }
  }

  private placeRuneInSlot(key: RuneType, slotIndex: number): void {
    const r = RUNES[key];
    const slotX = 530 + slotIndex * 140;
    const slotY = 380;

    const slot = this.add.container(slotX, slotY);

    const bg = this.add.circle(0, 0, 30, r.color, 0.3);
    bg.setStrokeStyle(2, r.color, 0.8);

    const symbol = this.add.text(0, 0, r.symbol, { fontSize: '22px' });
    symbol.setOrigin(0.5);

    const pulse = this.add.circle(0, 0, 35, r.color, 0);
    this.tweens.add({
      targets: pulse,
      alpha: 0.3,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    slot.add([pulse, bg, symbol]);
    slot.setDepth(60);

    this.runeSlots[slotIndex] = slot;
  }

  private drawWeaponDisplay(): void {
    this.weaponDisplay = this.add.container(600, 470);
    this.weaponDisplay.setDepth(55);

    const g = this.add.graphics();
    const metal = this.forgeResult.metal;
    const color = this.getMetalColor(metal);
    g.fillStyle(color, 0.9);

    if (this.forgeResult.weapon === 'sword') {
      g.fillRect(-8, -35, 16, 50);
      g.fillRect(-18, 15, 36, 8);
      g.fillRect(-5, 23, 10, 10);
    } else if (this.forgeResult.weapon === 'axe') {
      g.fillRect(-5, -30, 10, 55);
      g.fillCircle(-18, -15, 20);
      g.fillCircle(18, -15, 20);
    } else if (this.forgeResult.weapon === 'hammer') {
      g.fillRect(-5, -10, 10, 45);
      g.fillRoundedRect(-22, -30, 44, 25, 3);
    }

    this.weaponDisplay.add(g);
  }

  private getMetalColor(metal: MetalType): number {
    const colors: Record<MetalType, number> = {
      iron: 0x8a8a8a,
      steel: 0xb0b0b0,
      silver: 0xc0c0c0,
      gold: 0xffd700,
      obsidian: 0x1a1a2e,
      meteorite: 0x4a0e4e,
    };
    return colors[metal];
  }

  private drawRuneSlots(): void {
    for (let i = 0; i < 2; i++) {
      const x = 530 + i * 140;
      const y = 380;
      const slotOutline = this.add.circle(x, y, 32, 0x000000, 0);
      slotOutline.setStrokeStyle(2, 0xd4af37, 0.4);
      slotOutline.setDepth(59);

      const slotLabel = this.add.text(x, y + 42, `符文槽 ${i + 1}`, {
        fontSize: '11px',
        color: '#d4af37',
        fontFamily: 'serif',
      });
      slotLabel.setOrigin(0.5);
      slotLabel.setDepth(59);
    }
  }

  private drawUI(): void {
    this.statusText = this.add.text(600, 660, '', {
      fontSize: '16px',
      color: '#d4af37',
      fontStyle: 'bold',
      fontFamily: 'serif',
    });
    this.statusText.setOrigin(0.5);
  }

  private startMerge(): void {
    this.enchantPhase = 'merge';
    this.updateStatus('符文融合中...');

    const rune1 = this.runeSlots[0];
    const rune2 = this.runeSlots[1];

    if (rune1 && rune2) {
      this.tweens.add({
        targets: [rune1, rune2],
        x: 600,
        y: 430,
        duration: 600,
        ease: 'Power2',
      });

      this.time.delayedCall(700, () => {
        this.particles.emitBurst(600, 430, 0xffd700, 30);
        this.particles.emitBurst(600, 430, 0xffffff, 20);

        if (rune1 && rune2) {
          rune1.destroy();
          rune2.destroy();
        }

        this.mergeRunesIntoWeapon();
      });
    }
  }

  private mergeRunesIntoWeapon(): void {
    const r1 = RUNES[this.selectedRunes[0]];
    const r2 = RUNES[this.selectedRunes[1]];

    const glowR1 = this.add.circle(600, 455, 25, r1.color, 0.4);
    const glowR2 = this.add.circle(600, 455, 25, r2.color, 0.4);
    glowR1.setDepth(56);
    glowR2.setDepth(56);

    this.tweens.add({
      targets: glowR1,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: glowR2,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 800,
      delay: 200,
      ease: 'Power2',
    });

    const symbol1 = this.add.text(590, 445, r1.symbol, { fontSize: '14px' });
    symbol1.setOrigin(0.5);
    symbol1.setDepth(57);

    const symbol2 = this.add.text(610, 445, r2.symbol, { fontSize: '14px' });
    symbol2.setOrigin(0.5);
    symbol2.setDepth(57);

    this.tweens.add({
      targets: [symbol1, symbol2],
      alpha: 0,
      duration: 1000,
    });

    this.time.delayedCall(1000, () => {
      this.showFinalCard();
    });
  }

  private showFinalCard(): void {
    this.enchantPhase = 'done';
    this.updateStatus('武器锻造完成！');

    const r1 = RUNES[this.selectedRunes[0]];
    const r2 = RUNES[this.selectedRunes[1]];
    const baseDamage = this.forgeResult.damage;
    const totalDamage = baseDamage + r1.extraDamage + r2.extraDamage;

    const weaponNames = WEAPON_NAMES_ZH[this.forgeResult.weapon];
    const seed = this.selectedRunes[0].charCodeAt(0) + this.selectedRunes[1].charCodeAt(0);
    const weaponName = weaponNames[seed % weaponNames.length];

    this.cardContainer = this.add.container(600, 350);
    this.cardContainer.setDepth(200);
    this.cardContainer.setScale(0);
    this.cardContainer.setAngle(-10);

    const cardW = 300;
    const cardH = 420;
    const cardBg = this.add.rectangle(0, 0, cardW, cardH, 0xf5deb3, 0.95);
    cardBg.setStrokeStyle(3, 0xd4af37, 0.8);

    const outerShadow = this.add.rectangle(0, 0, cardW + 8, cardH + 8, 0x000000, 0.3);
    const innerFrame = this.add.rectangle(0, 0, cardW - 16, cardH - 16, 0x000000, 0);
    innerFrame.setStrokeStyle(1, 0xd4af37, 0.5);

    const distCorner1 = this.add.circle(-cardW / 2 + 5, -cardH / 2 + 5, 8, 0xf5deb3);
    const distCorner2 = this.add.circle(cardW / 2 - 5, -cardH / 2 + 5, 6, 0xf5deb3);
    const distCorner3 = this.add.circle(-cardW / 2 + 8, cardH / 2 - 8, 10, 0xf5deb3);

    const weaponSymbol = this.getWeaponSymbol(this.forgeResult.weapon);
    const weaponIcon = this.add.text(0, -150, weaponSymbol, { fontSize: '48px' });
    weaponIcon.setOrigin(0.5);

    const nameText = this.add.text(0, -90, weaponName, {
      fontSize: '22px',
      color: '#8b0000',
      fontStyle: 'bold',
      fontFamily: 'serif',
    });
    nameText.setOrigin(0.5);

    const separator = this.add.graphics();
    separator.lineStyle(1, 0xd4af37, 0.5);
    separator.lineBetween(-100, -65, 100, -65);

    const metalName = this.getMetalNameZh(this.forgeResult.metal);
    const shapeName = this.getShapeNameZh(this.forgeResult.weapon);
    const textureName = this.getTextureNameZh(this.forgeResult.texture);

    const materialText = this.add.text(0, -45, `材质: ${metalName}  |  类型: ${shapeName}`, {
      fontSize: '13px',
      color: '#4a3728',
      fontFamily: 'serif',
    });
    materialText.setOrigin(0.5);

    const textureText = this.add.text(0, -25, `纹理: ${textureName}`, {
      fontSize: '13px',
      color: '#4a3728',
      fontFamily: 'serif',
    });
    textureText.setOrigin(0.5);

    const sep2 = this.add.graphics();
    sep2.lineStyle(1, 0xd4af37, 0.5);
    sep2.lineBetween(-100, -8, 100, -8);

    const damageLabel = this.add.text(0, 15, `⚔ 伤害: ${totalDamage}`, {
      fontSize: '20px',
      color: '#8b0000',
      fontStyle: 'bold',
      fontFamily: 'serif',
    });
    damageLabel.setOrigin(0.5);

    const rune1Text = this.add.text(-60, 55, `${r1.symbol} ${r1.name}`, {
      fontSize: '15px',
      color: '#' + r1.color.toString(16).padStart(6, '0'),
      fontStyle: 'bold',
      fontFamily: 'serif',
    });
    rune1Text.setOrigin(0.5);

    const rune1Prop = this.add.text(-60, 78, r1.property, {
      fontSize: '12px',
      color: '#4a3728',
      fontFamily: 'serif',
    });
    rune1Prop.setOrigin(0.5);

    const rune2Text = this.add.text(60, 55, `${r2.symbol} ${r2.name}`, {
      fontSize: '15px',
      color: '#' + r2.color.toString(16).padStart(6, '0'),
      fontStyle: 'bold',
      fontFamily: 'serif',
    });
    rune2Text.setOrigin(0.5);

    const rune2Prop = this.add.text(60, 78, r2.property, {
      fontSize: '12px',
      color: '#4a3728',
      fontFamily: 'serif',
    });
    rune2Prop.setOrigin(0.5);

    const sep3 = this.add.graphics();
    sep3.lineStyle(1, 0xd4af37, 0.5);
    sep3.lineBetween(-100, 100, 100, 100);

    const descText = this.add.text(0, 125, this.generateDescription(this.selectedRunes[0], this.selectedRunes[1]), {
      fontSize: '11px',
      color: '#5a4a3a',
      fontFamily: 'serif',
      align: 'center',
      wordWrap: { width: 240 },
    });
    descText.setOrigin(0.5);

    const sep4 = this.add.graphics();
    sep4.lineStyle(1, 0xd4af37, 0.3);
    sep4.lineBetween(-100, 160, 100, 160);

    const forgeAgainBtn = this.add.rectangle(0, 180, 120, 35, 0x3b3b3b, 0.9);
    forgeAgainBtn.setStrokeStyle(2, 0xd4af37, 0.6);
    forgeAgainBtn.setInteractive({ useHandCursor: true });

    const forgeAgainText = this.add.text(0, 180, '重新锻造', {
      fontSize: '13px',
      color: '#d4af37',
      fontStyle: 'bold',
      fontFamily: 'serif',
    });
    forgeAgainText.setOrigin(0.5);

    forgeAgainBtn.on('pointerover', () => {
      forgeAgainBtn.setStrokeStyle(2, 0xd4af37, 1);
    });
    forgeAgainBtn.on('pointerout', () => {
      forgeAgainBtn.setStrokeStyle(2, 0xd4af37, 0.6);
    });
    forgeAgainBtn.on('pointerdown', () => {
      this.scene.start('ForgeScene');
    });

    this.cardContainer.add([
      outerShadow, cardBg, innerFrame,
      distCorner1, distCorner2, distCorner3,
      weaponIcon, nameText, separator,
      materialText, textureText, sep2,
      damageLabel,
      rune1Text, rune1Prop, rune2Text, rune2Prop,
      sep3, descText, sep4,
      forgeAgainBtn, forgeAgainText,
    ]);

    this.tweens.add({
      targets: this.cardContainer,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      duration: 500,
      ease: 'Back.easeOut',
    });

    this.time.delayedCall(200, () => {
      this.particles.emitBurst(600, 350, 0xffd700, 25);
    });
  }

  private getWeaponSymbol(shape: WeaponShape): string {
    if (shape === 'sword') return '⚔️';
    if (shape === 'axe') return '🪓';
    return '🔨';
  }

  private getMetalNameZh(metal: MetalType): string {
    const names: Record<MetalType, string> = {
      iron: '铁', steel: '钢', silver: '银',
      gold: '金', obsidian: '黑曜石', meteorite: '陨铁',
    };
    return names[metal];
  }

  private getShapeNameZh(shape: WeaponShape): string {
    const names: Record<WeaponShape, string> = { sword: '剑', axe: '斧', hammer: '锤' };
    return names[shape];
  }

  private getTextureNameZh(texture: TextureType): string {
    const names: Record<TextureType, string> = {
      spiral: '螺旋纹', grid: '网格纹', scale: '鳞纹', flame: '火焰纹',
    };
    return names[texture];
  }

  private generateDescription(r1: RuneType, r2: RuneType): string {
    const rune1 = RUNES[r1];
    const rune2 = RUNES[r2];
    return `蕴含${rune1.name}与${rune2.name}之力，${rune1.property}与${rune2.property}交织于此，铸造出无与伦比的传奇武器。`;
  }

  private updateStatus(text: string): void {
    if (this.statusText) {
      this.statusText.setText(text);
    }
  }
}
