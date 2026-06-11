import Phaser from 'phaser';
import { Plant, genotypeToString, getPhenotype } from '../geneManager';
import { generateGardenPlantSprite, createBounceAnimation, createHoverAnimation, createLeaveAnimation } from '../plantRenderer';
import { Game } from '../main';

export class GardenScene extends Phaser.Scene {
  private plantContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private detailPanel!: Phaser.GameObjects.Container | null;
  private backButton!: Phaser.GameObjects.Container;
  private isMobile: boolean = false;

  constructor() {
    super('GardenScene');
  }

  create(): void {
    this.isMobile = window.innerWidth <= 768;
    
    this.createBackground();
    this.createBackButton();
    this.createTitle();
    this.renderGardenPlants();
  }

  private createBackground(): void {
    this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0xe8f5e9
    );
    
    const decorCount = this.isMobile ? 10 : 20;
    for (let i = 0; i < decorCount; i++) {
      const x = Math.random() * this.scale.width;
      const y = Math.random() * this.scale.height;
      const size = 3 + Math.random() * 5;
      
      this.add.circle(x, y, size, 0xc5e1a5, 0.5);
    }
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

  private createTitle(): void {
    this.add.text(
      this.scale.width / 2,
      this.isMobile ? 35 : 50,
      '🌷 花圃展示 🌷',
      {
        fontSize: this.isMobile ? '22px' : '28px',
        color: '#2e7d32',
        fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5, 0);
    
    const state = (this.game as Game).gameState;
    const totalPlants = state.plants.length + state.shelfPlants.length;
    this.add.text(
      this.scale.width / 2,
      this.isMobile ? 65 : 90,
      `共培育 ${totalPlants} 株植物`,
      {
        fontSize: this.isMobile ? '13px' : '15px',
        color: '#558b2f',
        fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif'
      }
    ).setOrigin(0.5, 0);
  }

  private renderGardenPlants(): void {
    const state = (this.game as Game).gameState;
    const allPlants = [...state.plants, ...state.shelfPlants];
    
    if (allPlants.length === 0) {
      this.add.text(
        this.scale.width / 2,
        this.scale.height / 2,
        '还没有培育的植物\n回到实验室开始吧！',
        {
          fontSize: this.isMobile ? '16px' : '20px',
          color: '#8d6e63',
          fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
          align: 'center'
        }
      ).setOrigin(0.5);
      return;
    }
    
    const cols = this.isMobile ? 1 : 3;
    const rows = 4;
    const plantWidth = this.isMobile ? 120 : 150;
    const plantHeight = this.isMobile ? 160 : 200;
    const hSpacing = this.isMobile ? 20 : 40;
    const vSpacing = this.isMobile ? 15 : 30;
    
    const totalWidth = cols * plantWidth + (cols - 1) * hSpacing;
    const startX = (this.scale.width - totalWidth) / 2 + plantWidth / 2;
    const startY = this.isMobile ? 120 : 140;
    
    const maxPlants = rows * cols;
    const displayPlants = allPlants.slice(-maxPlants).reverse();
    
    displayPlants.forEach((plant, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (plantWidth + hSpacing);
      const y = startY + row * (plantHeight + vSpacing);
      
      const card = this.createPlantCard(plant, x, y, plantWidth, plantHeight);
      this.plantContainers.set(plant.id, card);
    });
  }

  private createPlantCard(
    plant: Plant,
    x: number,
    y: number,
    width: number,
    height: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.15);
    shadow.fillRoundedRect(-width / 2 - 8, -height / 2 - 8, width + 20, height + 40, 8);
    container.add(shadow);
    
    const cardBg = this.add.graphics();
    cardBg.fillStyle(0xffffff, 0.9);
    cardBg.fillRoundedRect(-width / 2 - 10, -height / 2 - 10, width + 20, height + 40, 8);
    cardBg.lineStyle(1, 0x9e9e9e, 0.3);
    cardBg.strokeRoundedRect(-width / 2 - 10, -height / 2 - 10, width + 20, height + 40, 8);
    container.add(cardBg);
    
    const plantSprite = generateGardenPlantSprite(this, plant, 0, 0, width, height);
    container.add(plantSprite);
    
    const phenotype = getPhenotype(plant.genotype);
    const shapeText = phenotype.leafShape === 'wide' ? '宽叶' : '窄叶';
    
    const label = this.add.text(0, height / 2 + 5, `F${plant.generation} | ${shapeText}`, {
      fontSize: this.isMobile ? '11px' : '13px',
      color: '#333333',
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif'
    }).setOrigin(0.5);
    container.add(label);
    
    container.setSize(width + 20, height + 40);
    container.setInteractive({ useHandCursor: true });
    
    container.on('pointerover', () => {
      createHoverAnimation(this, container);
    });
    
    container.on('pointerout', () => {
      createLeaveAnimation(this, container);
    });
    
    container.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      createBounceAnimation(this, container);
      this.showPlantDetail(plant, pointer.x, pointer.y);
    });
    
    return container;
  }

  private showPlantDetail(plant: Plant, clickX: number, clickY: number): void {
    if (this.detailPanel) {
      this.detailPanel.destroy();
      this.detailPanel = null;
    }
    
    const genotypeStr = genotypeToString(plant.genotype);
    const phenotype = getPhenotype(plant.genotype);
    const shapeText = phenotype.leafShape === 'wide' ? '宽叶' : '窄叶';
    
    const panelWidth = this.isMobile ? 220 : 280;
    const panelHeight = this.isMobile ? 130 : 150;
    
    let panelX = clickX;
    let panelY = clickY - 40 - panelHeight;
    
    if (panelX - panelWidth / 2 < 10) {
      panelX = panelWidth / 2 + 10;
    }
    if (panelX + panelWidth / 2 > this.scale.width - 10) {
      panelX = this.scale.width - panelWidth / 2 - 10;
    }
    if (panelY < 10) {
      panelY = clickY + 40;
    }
    if (panelY + panelHeight > this.scale.height - 10) {
      panelY = clickY - 40 - panelHeight;
    }
    
    this.detailPanel = this.add.container(panelX, panelY);
    
    const panelBg = this.add.graphics();
    
    const blurRect = this.add.graphics();
    blurRect.fillStyle(0xffffff, 0.85);
    blurRect.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 12);
    
    blurRect.setDepth(-1);
    
    panelBg.fillStyle(0xffffff, 0.85);
    panelBg.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 12);
    panelBg.lineStyle(1, 0xe0e0e0, 0.8);
    panelBg.strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 12);
    this.detailPanel.add(panelBg);
    
    const title = this.add.text(0, -panelHeight / 2 + 20, '🔬 植物详情', {
      fontSize: this.isMobile ? '14px' : '16px',
      color: '#2e7d32',
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.detailPanel.add(title);
    
    const genotypeLabel = this.add.text(0, -panelHeight / 2 + 50, '基因型:', {
      fontSize: this.isMobile ? '11px' : '12px',
      color: '#666666',
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif'
    }).setOrigin(0.5);
    this.detailPanel.add(genotypeLabel);
    
    const genotypeValue = this.add.text(0, -panelHeight / 2 + 70, genotypeStr, {
      fontSize: '14px',
      color: '#333333',
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.detailPanel.add(genotypeValue);
    
    const generationText = this.add.text(0, -panelHeight / 2 + 95, `培育代数: F${plant.generation}`, {
      fontSize: this.isMobile ? '11px' : '13px',
      color: '#558b2f',
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif'
    }).setOrigin(0.5);
    this.detailPanel.add(generationText);
    
    const phenotypeText = this.add.text(0, -panelHeight / 2 + 115, `表型: ${shapeText}`, {
      fontSize: this.isMobile ? '11px' : '13px',
      color: '#795548',
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif'
    }).setOrigin(0.5);
    this.detailPanel.add(phenotypeText);
    
    this.detailPanel.setSize(panelWidth, panelHeight);
    this.detailPanel.setDepth(3000);
    
    this.detailPanel.setScale(0.5);
    this.detailPanel.setAlpha(0);
    
    this.tweens.add({
      targets: this.detailPanel,
      scale: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut'
    });
    
    const closeHandler = () => {
      if (this.detailPanel) {
        this.tweens.add({
          targets: this.detailPanel,
          scale: 0.8,
          alpha: 0,
          duration: 150,
          ease: 'Quad.easeIn',
          onComplete: () => {
            if (this.detailPanel) {
              this.detailPanel.destroy();
              this.detailPanel = null;
            }
          }
        });
      }
      this.input.off('pointerdown', closeHandler);
    };
    
    this.time.delayedCall(300, () => {
      this.input.once('pointerdown', closeHandler);
    });
  }
}
