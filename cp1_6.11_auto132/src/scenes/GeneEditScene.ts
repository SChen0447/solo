import Phaser from 'phaser';
import { Plant, mutateAllele, Locus, genotypeToString, getPhenotype } from '../geneManager';
import { generateGardenPlantSprite, createBounceAnimation } from '../plantRenderer';
import { Game } from '../main';

export class GeneEditScene extends Phaser.Scene {
  private plant!: Plant;
  private plantContainer!: Phaser.GameObjects.Container;
  private alleleBadges: Map<string, Phaser.GameObjects.Container> = new Map();
  private energyBar!: Phaser.GameObjects.Graphics;
  private energyText!: Phaser.GameObjects.Text;
  private backButton!: Phaser.GameObjects.Container;
  private isMobile: boolean = false;

  constructor() {
    super('GeneEditScene');
  }

  create(): void {
    this.isMobile = window.innerWidth <= 768;
    
    const state = (this.game as Game).gameState;
    if (!state.selectedPlant) {
      this.scene.start('LabScene');
      return;
    }
    this.plant = state.selectedPlant;
    
    this.createBackground();
    this.createBackButton();
    this.createEnergyDisplay();
    this.createTitle();
    this.createPlantDisplay();
    this.createGeneEditor();
    this.createInstructions();
  }

  private createBackground(): void {
    this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0xe8f5e9
    );
  }

  private createBackButton(): void {
    const x = this.isMobile ? 40 : 50;
    const y = this.isMobile ? 40 : 50;
    
    this.backButton = this.add.container(x, y);
    
    const circle = this.add.circle(0, 0, this.isMobile ? 20 : 25, 0x90a4ae);
    circle.setStrokeStyle(2, 0xffffff, 0.8);
    this.backButton.add(circle);
    
    const text = this.add.text(0, 0, '←', {
      fontSize: this.isMobile ? '18px' : '22px',
      color: '#ffffff',
      fontFamily: 'Segoe UI, sans-serif'
    }).setOrigin(0.5);
    this.backButton.add(text);
    
    this.backButton.setSize(this.isMobile ? 40 : 50, this.isMobile ? 40 : 50);
    this.backButton.setInteractive({ useHandCursor: true });
    
    this.backButton.on('pointerover', () => {
      this.tweens.add({
        targets: circle,
        scale: 1.1,
        duration: 150,
        ease: 'Quad.easeOut'
      });
    });
    
    this.backButton.on('pointerout', () => {
      this.tweens.add({
        targets: circle,
        scale: 1,
        duration: 150,
        ease: 'Quad.easeOut'
      });
    });
    
    this.backButton.on('pointerdown', () => {
      createBounceAnimation(this, this.backButton);
      this.scene.start('LabScene');
    });
  }

  private createEnergyDisplay(): void {
    const x = this.isMobile ? 80 : 120;
    const y = this.isMobile ? 35 : 40;
    
    this.add.text(x, y, '能量点数', {
      fontSize: this.isMobile ? '14px' : '16px',
      color: '#333333',
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif'
    });
    
    this.energyBar = this.add.graphics();
    this.updateEnergyDisplay();
  }

  private updateEnergyDisplay(): void {
    const energy = (this.game as Game).gameState.energyPoints;
    const maxEnergy = 20;
    const barWidth = this.isMobile ? 120 : 200;
    const barHeight = this.isMobile ? 10 : 12;
    const x = this.isMobile ? 80 : 120;
    const y = this.isMobile ? 60 : 65;
    
    this.energyBar.clear();
    
    this.energyBar.fillStyle(0xffffff, 0.5);
    this.energyBar.fillRoundedRect(x, y, barWidth, barHeight, 6);
    
    const fillWidth = Math.min((energy / maxEnergy) * barWidth, barWidth);
    
    this.energyBar.fillGradientStyle(0xcddc39, 0x4caf50, 0x4caf50, 0xcddc39, 1);
    this.energyBar.fillRoundedRect(x, y, fillWidth, barHeight, 6);
    
    this.energyBar.lineStyle(1, 0x9e9e9e, 0.5);
    this.energyBar.strokeRoundedRect(x, y, barWidth, barHeight, 6);
    
    if (!this.energyText) {
      this.energyText = this.add.text(x + barWidth + 10, y - 2, '', {
        fontSize: this.isMobile ? '12px' : '14px',
        color: '#333333',
        fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif'
      });
    }
    this.energyText.setText(`${energy}`);
  }

  private createTitle(): void {
    this.add.text(
      this.scale.width / 2,
      this.isMobile ? 35 : 50,
      '基因编辑器',
      {
        fontSize: this.isMobile ? '20px' : '24px',
        color: '#2e7d32',
        fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5, 0);
  }

  private createPlantDisplay(): void {
    const x = this.scale.width / 2;
    const y = this.isMobile ? 180 : 200;
    const width = this.isMobile ? 120 : 150;
    const height = this.isMobile ? 160 : 200;
    
    this.plantContainer = generateGardenPlantSprite(this, this.plant, x, y, width, height);
    
    const genotypeStr = genotypeToString(this.plant.genotype);
    this.add.text(x, y + height / 2 + 15, genotypeStr, {
      fontSize: this.isMobile ? '12px' : '14px',
      color: '#333333',
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const phenotype = getPhenotype(this.plant.genotype);
    const shapeText = phenotype.leafShape === 'wide' ? '宽叶' : '窄叶';
    this.add.text(x, y + height / 2 + 35, `F${this.plant.generation}代 | ${shapeText}`, {
      fontSize: this.isMobile ? '11px' : '13px',
      color: '#666666',
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif'
    }).setOrigin(0.5);
  }

  private createGeneEditor(): void {
    const centerX = this.scale.width / 2;
    const startY = this.isMobile ? 320 : 350;
    const spacing = this.isMobile ? 80 : 100;
    
    this.add.text(centerX, startY - 60, '点击等位基因进行编辑（每次消耗1点能量）', {
      fontSize: this.isMobile ? '12px' : '14px',
      color: '#666666',
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif'
    }).setOrigin(0.5);
    
    this.add.text(centerX - spacing, startY - 30, '花瓣颜色', {
      fontSize: this.isMobile ? '14px' : '16px',
      color: '#d81b60',
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.add.text(centerX + spacing, startY - 30, '叶形', {
      fontSize: this.isMobile ? '14px' : '16px',
      color: '#2e7d32',
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.createAlleleBadges('color', centerX - spacing, startY, this.plant.genotype.color);
    this.createAlleleBadges('shape', centerX + spacing, startY, this.plant.genotype.shape);
    
    const connectorY = startY;
    const connector = this.add.graphics();
    connector.lineStyle(2, 0x9e9e9e, 0.5);
    connector.beginPath();
    connector.moveTo(centerX - spacing + 30, connectorY);
    connector.lineTo(centerX + spacing - 30, connectorY);
    connector.stroke();
  }

  private createAlleleBadges(
    locus: Locus,
    x: number,
    y: number,
    alleles: [string, string]
  ): void {
    const badgeSpacing = 35;
    
    this.createAlleleBadge(
      x - badgeSpacing / 2,
      y,
      locus,
      0,
      alleles[0]
    );
    
    this.createAlleleBadge(
      x + badgeSpacing / 2,
      y,
      locus,
      1,
      alleles[1]
    );
  }

  private createAlleleBadge(
    x: number,
    y: number,
    locus: Locus,
    index: 0 | 1,
    allele: string
  ): void {
    const container = this.add.container(x, y);
    const size = 20;
    
    const isDominant = allele === allele.toUpperCase();
    const color = locus === 'color' ? 
      (isDominant ? 0xe91e63 : 0xfce4ec) :
      (isDominant ? 0x2e7d32 : 0xe8f5e9);
    
    const circle = this.add.circle(0, 0, size / 2, color);
    if (!isDominant) {
      circle.setStrokeStyle(2, locus === 'color' ? 0xe91e63 : 0x2e7d32, 1);
    }
    container.add(circle);
    
    const text = this.add.text(0, 0, allele, {
      fontSize: '14px',
      color: isDominant ? '#ffffff' : (locus === 'color' ? '#e91e63' : '#2e7d32'),
      fontFamily: 'Segoe UI, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(text);
    
    container.setSize(size, size);
    container.setInteractive({ useHandCursor: true });
    
    container.on('pointerover', () => {
      this.tweens.add({
        targets: circle,
        scale: 1.15,
        duration: 150,
        ease: 'Quad.easeOut'
      });
    });
    
    container.on('pointerout', () => {
      this.tweens.add({
        targets: circle,
        scale: 1,
        duration: 150,
        ease: 'Quad.easeOut'
      });
    });
    
    container.on('pointerdown', () => {
      this.performMutation(locus, index, container, circle);
    });
    
    const key = `${locus}-${index}`;
    this.alleleBadges.set(key, container);
  }

  private performMutation(
    locus: Locus,
    index: 0 | 1,
    container: Phaser.GameObjects.Container,
    circle: Phaser.GameObjects.Arc
  ): void {
    const state = (this.game as Game).gameState;
    
    if (state.energyPoints < 1) {
      this.showToast('能量不足！进行杂交可获得能量');
      return;
    }
    
    createBounceAnimation(this, container);
    
    state.energyPoints -= 1;
    this.updateEnergyDisplay();
    
    const oldPlant = state.selectedPlant!;
    const newPlant = mutateAllele(oldPlant, locus, index);
    
    const allPlants = [...state.plants, ...state.shelfPlants];
    const plantIndex = allPlants.findIndex(p => p.id === oldPlant.id);
    const isWorkbench = plantIndex < state.plants.length;
    
    if (isWorkbench) {
      const idx = state.plants.findIndex(p => p.id === oldPlant.id);
      if (idx !== -1) {
        state.plants[idx] = newPlant;
      }
    } else {
      const idx = state.shelfPlants.findIndex(p => p.id === oldPlant.id);
      if (idx !== -1) {
        state.shelfPlants[idx] = newPlant;
      }
    }
    
    state.selectedPlant = newPlant;
    this.plant = newPlant;
    
    this.tweens.add({
      targets: circle,
      scaleX: { from: 0.8, to: 1.2 },
      scaleY: { from: 0.8, to: 1.2 },
      duration: 200,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.refreshDisplay();
      }
    });
    
    this.showToast('基因编辑成功！');
  }

  private refreshDisplay(): void {
    this.plantContainer.destroy();
    this.alleleBadges.forEach(badge => badge.destroy());
    this.alleleBadges.clear();
    
    const centerX = this.scale.width / 2;
    const startY = this.isMobile ? 320 : 350;
    const spacing = this.isMobile ? 80 : 100;
    
    const y = this.isMobile ? 180 : 200;
    const width = this.isMobile ? 120 : 150;
    const height = this.isMobile ? 160 : 200;
    
    this.plantContainer = generateGardenPlantSprite(this, this.plant, centerX, y, width, height);
    
    const genotypeStr = genotypeToString(this.plant.genotype);
    this.add.text(centerX, y + height / 2 + 15, genotypeStr, {
      fontSize: this.isMobile ? '12px' : '14px',
      color: '#333333',
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    const phenotype = getPhenotype(this.plant.genotype);
    const shapeText = phenotype.leafShape === 'wide' ? '宽叶' : '窄叶';
    this.add.text(centerX, y + height / 2 + 35, `F${this.plant.generation}代 | ${shapeText}`, {
      fontSize: this.isMobile ? '11px' : '13px',
      color: '#666666',
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif'
    }).setOrigin(0.5);
    
    this.createAlleleBadges('color', centerX - spacing, startY, this.plant.genotype.color);
    this.createAlleleBadges('shape', centerX + spacing, startY, this.plant.genotype.shape);
  }

  private createInstructions(): void {
    const y = this.isMobile ? 420 : 450;
    
    const instructions = [
      'R = 显性红色花瓣',
      'r = 隐性白色花瓣',
      'L = 显性宽叶',
      'l = 隐性窄叶'
    ];
    
    instructions.forEach((text, i) => {
      const isColor = i < 2;
      this.add.text(
        this.scale.width / 2,
        y + i * (this.isMobile ? 18 : 22),
        text,
        {
          fontSize: this.isMobile ? '11px' : '13px',
          color: isColor ? '#d81b60' : '#2e7d32',
          fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif'
        }
      ).setOrigin(0.5);
    });
  }

  private showToast(message: string): void {
    const toast = this.add.text(
      this.scale.width / 2,
      this.isMobile ? 100 : 80,
      message,
      {
        fontSize: this.isMobile ? '14px' : '16px',
        color: '#ffffff',
        fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: { x: 15, y: 8 }
      }
    ).setOrigin(0.5).setDepth(2000);
    
    this.tweens.add({
      targets: toast,
      alpha: { from: 0, to: 1 },
      duration: 200,
      ease: 'Quad.easeOut'
    });
    
    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: toast,
        alpha: 0,
        duration: 300,
        ease: 'Quad.easeIn',
        onComplete: () => toast.destroy()
      });
    });
  }
}
