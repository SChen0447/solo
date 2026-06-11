import Phaser from 'phaser';
import { Plant, cross } from '../geneManager';
import { 
  generatePlantSprite, 
  createGrowthAnimation, 
  createBounceAnimation,
  createHoverAnimation,
  createLeaveAnimation
} from '../plantRenderer';
import { Game } from '../main';

export class LabScene extends Phaser.Scene {
  private plantContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private shelfContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private selectedPlantId: string | null = null;
  private selectedHighlight: Phaser.GameObjects.Graphics | null = null;
  private pollinateButton!: Phaser.GameObjects.Container;
  private geneEditButton!: Phaser.GameObjects.Container;
  private gardenButton!: Phaser.GameObjects.Container;
  private energyText!: Phaser.GameObjects.Text;
  private energyBar!: Phaser.GameObjects.Graphics;
  private isMobile: boolean = false;

  constructor() {
    super('LabScene');
  }

  create(): void {
    this.isMobile = window.innerWidth <= 768;
    
    this.createBackground();
    this.createNavigationButtons();
    this.createEnergyDisplay();
    this.createWorkbench();
    this.createShelf();
    this.createPollinateButton();
    this.renderWorkbenchPlants();
    this.events.on('wake', this.onWake, this);
  }

  private onWake(): void {
    this.selectedPlantId = null;
    this.removeHighlight();
    this.clearAllContainers();
    this.renderWorkbenchPlants();
    this.renderShelfPlants();
    this.updateEnergyDisplay();
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

  private createNavigationButtons(): void {
    const buttonY = 50;
    const spacing = this.isMobile ? 70 : 100;
    
    this.geneEditButton = this.createRoundButton(
      this.scale.width - spacing,
      buttonY,
      '#81d4fa',
      '🧬',
      () => {
        if ((this.game as Game).gameState.selectedPlant) {
          this.scene.start('GeneEditScene');
        } else {
          this.showToast('请先选择一株植物');
        }
      }
    );
    
    this.gardenButton = this.createRoundButton(
      this.scale.width - spacing * 2,
      buttonY,
      '#aed581',
      '🌷',
      () => {
        this.scene.start('GardenScene');
      }
    );
  }

  private createRoundButton(
    x: number,
    y: number,
    color: string,
    emoji: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const size = this.isMobile ? 40 : 50;
    
    const circle = this.add.circle(0, 0, size / 2, Phaser.Display.Color.HexStringToColor(color).color);
    circle.setStrokeStyle(2, 0xffffff, 0.8);
    container.add(circle);
    
    const text = this.add.text(0, 0, emoji, {
      fontSize: this.isMobile ? '20px' : '24px'
    }).setOrigin(0.5);
    container.add(text);
    
    container.setSize(size, size);
    container.setInteractive({ useHandCursor: true });
    
    container.on('pointerover', () => {
      this.tweens.add({
        targets: circle,
        scale: 1.1,
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
      createBounceAnimation(this, container);
      onClick();
    });
    
    return container;
  }

  private createEnergyDisplay(): void {
    const x = 20;
    const y = 40;
    
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
    const barWidth = this.isMobile ? 140 : 200;
    const barHeight = this.isMobile ? 10 : 12;
    const x = 20;
    const y = 65;
    
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

  private createWorkbench(): void {
    const benchWidth = this.isMobile ? this.scale.width * 0.95 : this.scale.width * 0.6;
    const benchHeight = this.isMobile ? 280 : 220;
    const x = this.isMobile ? this.scale.width / 2 : benchWidth / 2 + 20;
    const y = this.scale.height - benchHeight / 2 - (this.isMobile ? 20 : 30);
    
    const benchGraphics = this.add.graphics();
    
    const stripeCount = Math.floor(benchHeight / 15);
    for (let i = 0; i < stripeCount; i++) {
      const stripeY = y - benchHeight / 2 + i * 15;
      const color = i % 2 === 0 ? 0xd7ccc8 : 0xa1887f;
      benchGraphics.fillStyle(color, 1);
      benchGraphics.fillRect(x - benchWidth / 2, stripeY, benchWidth, 15);
    }
    
    benchGraphics.lineStyle(3, 0x6d4c41, 1);
    benchGraphics.strokeRoundedRect(x - benchWidth / 2, y - benchHeight / 2, benchWidth, benchHeight, 8);
    
    benchGraphics.setDepth(-1);
    
    this.add.text(x, y - benchHeight / 2 + 15, '工作台', {
      fontSize: this.isMobile ? '16px' : '18px',
      color: '#5d4037',
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
  }

  private createShelf(): void {
    const shelfWidth = this.isMobile ? this.scale.width * 0.95 : 280;
    const shelfHeight = this.isMobile ? 320 : 400;
    const x = this.isMobile ? this.scale.width / 2 : this.scale.width - shelfWidth / 2 - 20;
    const y = this.isMobile ? 420 : shelfHeight / 2 + 80;
    
    const shelfGraphics = this.add.graphics();
    shelfGraphics.fillStyle(0xf5f5dc, 0.9);
    shelfGraphics.fillRoundedRect(x - shelfWidth / 2, y - shelfHeight / 2, shelfWidth, shelfHeight, 8);
    shelfGraphics.lineStyle(2, 0x8d6e63, 1);
    shelfGraphics.strokeRoundedRect(x - shelfWidth / 2, y - shelfHeight / 2, shelfWidth, shelfHeight, 8);
    
    const rowCount = 4;
    const rowHeight = shelfHeight / rowCount;
    for (let i = 1; i < rowCount; i++) {
      const rowY = y - shelfHeight / 2 + i * rowHeight;
      shelfGraphics.lineStyle(1, 0x8d6e63, 0.5);
      shelfGraphics.beginPath();
      shelfGraphics.moveTo(x - shelfWidth / 2 + 10, rowY);
      shelfGraphics.lineTo(x + shelfWidth / 2 - 10, rowY);
      shelfGraphics.stroke();
    }
    
    shelfGraphics.setDepth(-1);
    
    this.add.text(x, y - shelfHeight / 2 + 15, '培育架', {
      fontSize: this.isMobile ? '16px' : '18px',
      color: '#5d4037',
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
  }

  private createPollinateButton(): void {
    const x = this.isMobile ? this.scale.width / 2 : this.scale.width * 0.3;
    const y = this.isMobile ? 340 : this.scale.height - 280;
    
    this.pollinateButton = this.add.container(x, y);
    
    const circle = this.add.circle(0, 0, 16, 0xf48fb1);
    circle.setStrokeStyle(2, 0xffffff, 0.8);
    this.pollinateButton.add(circle);
    
    const text = this.add.text(0, 0, '🌸', {
      fontSize: '18px'
    }).setOrigin(0.5);
    this.pollinateButton.add(text);
    
    const label = this.add.text(0, 35, '授粉', {
      fontSize: this.isMobile ? '12px' : '14px',
      color: '#d81b60',
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif'
    }).setOrigin(0.5);
    this.pollinateButton.add(label);
    
    this.pollinateButton.setSize(32, 32);
    this.pollinateButton.setInteractive({ useHandCursor: true });
    
    this.pollinateButton.on('pointerover', () => {
      this.tweens.add({
        targets: circle,
        scale: 34 / 32,
        fillColor: 0xd81b60,
        duration: 150,
        ease: 'Quad.easeOut'
      });
    });
    
    this.pollinateButton.on('pointerout', () => {
      this.tweens.add({
        targets: circle,
        scale: 1,
        fillColor: 0xf48fb1,
        duration: 150,
        ease: 'Quad.easeOut'
      });
    });
    
    this.pollinateButton.on('pointerdown', () => {
      createBounceAnimation(this, this.pollinateButton);
      this.performPollination();
    });
  }

  private renderWorkbenchPlants(): void {
    const state = (this.game as Game).gameState;
    const benchWidth = this.isMobile ? this.scale.width * 0.95 : this.scale.width * 0.6;
    const benchHeight = this.isMobile ? 280 : 220;
    const benchX = this.isMobile ? this.scale.width / 2 : benchWidth / 2 + 20;
    const benchY = this.scale.height - benchHeight / 2 - (this.isMobile ? 20 : 30);
    
    const plantWidth = this.isMobile ? 90 : 120;
    const plantHeight = this.isMobile ? 120 : 160;
    const cols = this.isMobile ? 3 : 6;
    const spacing = plantWidth + (this.isMobile ? 5 : 10);
    const startX = benchX - ((cols - 1) * spacing) / 2;
    const startY = benchY + (this.isMobile ? 20 : 10);
    
    state.plants.forEach((plant, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * spacing;
      const y = startY + row * (plantHeight + 10);
      
      const container = generatePlantSprite(this, plant, x, y, plantWidth, plantHeight, 4);
      container.setData('plantId', plant.id);
      container.setData('plantType', 'workbench');
      container.setInteractive({ useHandCursor: true });
      
      container.on('pointerdown', () => {
        this.selectPlant(plant.id, container);
      });
      
      container.on('pointerover', () => {
        createHoverAnimation(this, container);
      });
      
      container.on('pointerout', () => {
        createLeaveAnimation(this, container);
      });
      
      this.plantContainers.set(plant.id, container);
      
      if (this.selectedPlantId === plant.id) {
        this.highlightContainer(container);
      }
    });
  }

  private renderShelfPlants(): void {
    const state = (this.game as Game).gameState;
    const shelfWidth = this.isMobile ? this.scale.width * 0.95 : 280;
    const shelfHeight = this.isMobile ? 320 : 400;
    const x = this.isMobile ? this.scale.width / 2 : this.scale.width - shelfWidth / 2 - 20;
    const y = this.isMobile ? 420 : shelfHeight / 2 + 80;
    
    const plantWidth = this.isMobile ? 70 : 100;
    const plantHeight = this.isMobile ? 90 : 130;
    const cols = 2;
    const rows = 4;
    const cellWidth = shelfWidth / cols;
    const cellHeight = shelfHeight / rows;
    
    state.shelfPlants.forEach((plant, index) => {
      if (index >= rows * cols) return;
      
      const col = index % cols;
      const row = Math.floor(index / cols);
      const plantX = x - shelfWidth / 2 + cellWidth / 2 + col * cellWidth;
      const plantY = y - shelfHeight / 2 + cellHeight / 2 + row * cellHeight + (this.isMobile ? 5 : 10);
      
      const existing = this.shelfContainers.get(plant.id);
      if (existing) {
        existing.destroy();
      }
      
      const container = generatePlantSprite(this, plant, plantX, plantY, plantWidth, plantHeight, 4);
      container.setData('plantId', plant.id);
      container.setData('plantType', 'shelf');
      container.setInteractive({ useHandCursor: true });
      
      container.on('pointerdown', () => {
        this.selectPlant(plant.id, container);
      });
      
      container.on('pointerover', () => {
        createHoverAnimation(this, container);
      });
      
      container.on('pointerout', () => {
        createLeaveAnimation(this, container);
      });
      
      this.shelfContainers.set(plant.id, container);
      
      if (this.selectedPlantId === plant.id) {
        this.highlightContainer(container);
      }
    });
  }

  private selectPlant(plantId: string, container: Phaser.GameObjects.Container): void {
    const state = (this.game as Game).gameState;
    const allPlants = [...state.plants, ...state.shelfPlants];
    const plant = allPlants.find(p => p.id === plantId);
    
    if (plant) {
      state.selectedPlant = plant;
      this.selectedPlantId = plantId;
      this.removeHighlight();
      this.highlightContainer(container);
      createBounceAnimation(this, container);
    }
  }

  private highlightContainer(container: Phaser.GameObjects.Container): void {
    const bounds = container.getBounds();
    this.selectedHighlight = this.add.graphics();
    this.selectedHighlight.lineStyle(3, 0xffeb3b, 1);
    this.selectedHighlight.strokeRoundedRect(bounds.x - 5, bounds.y - 5, bounds.width + 10, bounds.height + 10, 8);
    this.selectedHighlight.setDepth(1000);
    
    this.tweens.add({
      targets: this.selectedHighlight,
      alpha: { from: 0.5, to: 1 },
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private removeHighlight(): void {
    if (this.selectedHighlight) {
      this.selectedHighlight.destroy();
      this.selectedHighlight = null;
    }
  }

  private async performPollination(): Promise<void> {
    const state = (this.game as Game).gameState;
    
    if (!this.selectedPlantId) {
      this.showToast('请先选择一株植物');
      return;
    }
    
    const allPlants = [...state.plants, ...state.shelfPlants];
    const parent1 = allPlants.find(p => p.id === this.selectedPlantId);
    
    if (!parent1) {
      this.showToast('请先选择一株植物');
      return;
    }
    
    const otherPlants = allPlants.filter(p => p.id !== this.selectedPlantId);
    if (otherPlants.length === 0) {
      this.showToast('没有其他植物可以杂交');
      return;
    }
    
    const parent2 = otherPlants[Math.floor(Math.random() * otherPlants.length)];
    const newPlant = cross(parent1, parent2);
    
    if (state.shelfPlants.length >= 8) {
      this.showToast('培育架已满，请先清理');
      return;
    }
    
    state.shelfPlants.push(newPlant);
    state.energyPoints += 1;
    this.updateEnergyDisplay();
    
    this.addNewPlantToShelf(newPlant);
    
    this.showToast(`成功培育 F${newPlant.generation} 代植株！`);
  }

  private async addNewPlantToShelf(plant: Plant): Promise<void> {
    const shelfWidth = this.isMobile ? this.scale.width * 0.95 : 280;
    const shelfHeight = this.isMobile ? 320 : 400;
    const x = this.isMobile ? this.scale.width / 2 : this.scale.width - shelfWidth / 2 - 20;
    const y = this.isMobile ? 420 : shelfHeight / 2 + 80;
    
    const plantWidth = this.isMobile ? 70 : 100;
    const plantHeight = this.isMobile ? 90 : 130;
    const cols = 2;
    const rows = 4;
    const cellWidth = shelfWidth / cols;
    const cellHeight = shelfHeight / rows;
    
    const index = (this.game as Game).gameState.shelfPlants.length - 1;
    if (index >= rows * cols) return;
    
    const col = index % cols;
    const row = Math.floor(index / cols);
    const plantX = x - shelfWidth / 2 + cellWidth / 2 + col * cellWidth;
    const plantY = y - shelfHeight / 2 + cellHeight / 2 + row * cellHeight + (this.isMobile ? 5 : 10);
    
    const container = generatePlantSprite(this, plant, plantX, plantY, plantWidth, plantHeight, 1);
    container.setData('plantId', plant.id);
    container.setData('plantType', 'shelf');
    container.setInteractive({ useHandCursor: true });
    
    container.on('pointerdown', () => {
      this.selectPlant(plant.id, container);
    });
    
    container.on('pointerover', () => {
      createHoverAnimation(this, container);
    });
    
    container.on('pointerout', () => {
      createLeaveAnimation(this, container);
    });
    
    this.shelfContainers.set(plant.id, container);
    
    await createGrowthAnimation(this, container, 4000);
    
    const existing = this.shelfContainers.get(plant.id);
    if (existing) {
      existing.destroy();
    }
    
    const matureContainer = generatePlantSprite(this, plant, plantX, plantY, plantWidth, plantHeight, 4);
    matureContainer.setData('plantId', plant.id);
    matureContainer.setData('plantType', 'shelf');
    matureContainer.setInteractive({ useHandCursor: true });
    
    matureContainer.on('pointerdown', () => {
      this.selectPlant(plant.id, matureContainer);
    });
    
    matureContainer.on('pointerover', () => {
      createHoverAnimation(this, matureContainer);
    });
    
    matureContainer.on('pointerout', () => {
      createLeaveAnimation(this, matureContainer);
    });
    
    this.shelfContainers.set(plant.id, matureContainer);
  }

  private showToast(message: string): void {
    const toast = this.add.text(
      this.scale.width / 2,
      this.isMobile ? 200 : 100,
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

  private clearAllContainers(): void {
    this.plantContainers.forEach(c => c.destroy());
    this.shelfContainers.forEach(c => c.destroy());
    this.plantContainers.clear();
    this.shelfContainers.clear();
  }
}
