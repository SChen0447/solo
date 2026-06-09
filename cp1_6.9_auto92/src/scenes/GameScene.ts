import Phaser from 'phaser';
import { Resource, ResourceType } from '../entities/Resource';
import { Building, BuildingType } from '../entities/Building';
import { EventManager, WeatherType } from '../managers/EventManager';

interface PlayerState {
  stamina: number;
  food: number;
  wood: number;
  stone: number;
  isResting: boolean;
  restTimer: number;
  isGameOver: boolean;
}

export class GameScene extends Phaser.Scene {
  public player!: Phaser.GameObjects.Container;
  public playerSprite!: Phaser.GameObjects.Shape;
  public playerShadow!: Phaser.GameObjects.Shape;
  public playerState!: PlayerState;

  public resources: Resource[] = [];
  public buildings: Building[] = [];

  public maxFood: number = 10;
  public maxWood: number = 8;
  public maxStone: number = 6;
  public resourceRespawnTimer: number = 0;
  public resourceRespawnInterval: number = 30000;

  public eventManager!: EventManager;

  public hudContainer!: Phaser.GameObjects.Container;
  public staminaBar!: Phaser.GameObjects.Graphics;
  public staminaBarBg!: Phaser.GameObjects.Graphics;
  public foodText!: Phaser.GameObjects.Text;
  public woodText!: Phaser.GameObjects.Text;
  public stoneText!: Phaser.GameObjects.Text;
  public restButton!: Phaser.GameObjects.Arc;
  public restButtonText!: Phaser.GameObjects.Text;

  public oceanWaves!: Phaser.GameObjects.Graphics;
  public island!: Phaser.GameObjects.Graphics;
  public waveTime: number = 0;

  public draggingResource: Resource | null = null;
  public buildSlots: Map<string, { wood: number; stone: number }> = new Map();

  public collectParticles!: Phaser.GameObjects.Particles.ParticleEmitter;

  public playerPosX: number = 400;
  public playerPosY: number = 300;
  public islandCenterX: number = 400;
  public islandCenterY: number = 300;
  public islandRadius: number = 300;

  public staminaAccumulator: number = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  public create(): void {
    this.initPlayerState();
    this.createBackground();
    this.createIsland();
    this.createPlayer();
    this.eventManager = new EventManager(this);
    this.createParticleEmitters();
    this.spawnInitialResources();
    this.createHUD();
    this.setupInputHandlers();
  }

  private initPlayerState(): void {
    this.playerState = {
      stamina: 100,
      food: 0,
      wood: 0,
      stone: 0,
      isResting: false,
      restTimer: 0,
      isGameOver: false
    };
  }

  private createBackground(): void {
    this.oceanWaves = this.add.graphics();
    this.oceanWaves.setDepth(-1);
  }

  private createIsland(): void {
    this.island = this.add.graphics();
    this.island.setDepth(0);

    const gradientSteps = 20;
    for (let i = gradientSteps; i > 0; i--) {
      const t = i / gradientSteps;
      const r = Math.floor(0x4a * t + 0x2a * (1 - t));
      const g = Math.floor(0x7a * t + 0x5a * (1 - t));
      const b = Math.floor(0x2a * t + 0x1a * (1 - t));
      const color = Phaser.Display.Color.GetColor(r, g, b);
      const radius = this.islandRadius * (i / gradientSteps);
      this.island.fillStyle(color, 1);
      this.island.fillCircle(this.islandCenterX, this.islandCenterY, radius);
    }

    this.island.lineStyle(4, 0x1a4a1a, 1);
    this.island.strokeCircle(this.islandCenterX, this.islandCenterY, this.islandRadius);
  }

  private createPlayer(): void {
    this.player = this.add.container(this.playerPosX, this.playerPosY);
    this.player.setDepth(10);

    this.playerShadow = this.add.ellipse(3, 15, 25, 8, 0x000000, 0.3);
    this.player.add(this.playerShadow);

    this.playerSprite = this.add.circle(0, 0, 15, 0x4488ff);
    this.playerSprite.setStrokeStyle(3, 0x2266cc);
    this.player.add(this.playerSprite);

    const eye1 = this.add.circle(-5, -3, 3, 0xffffff);
    const eye2 = this.add.circle(5, -3, 3, 0xffffff);
    const pupil1 = this.add.circle(-5, -3, 1.5, 0x000000);
    const pupil2 = this.add.circle(5, -3, 1.5, 0x000000);
    this.player.add(eye1);
    this.player.add(eye2);
    this.player.add(pupil1);
    this.player.add(pupil2);

    this.player.setSize(30, 30);
  }

  private createParticleEmitters(): void {
    this.collectParticles = this.add.particles(0, 0, undefined, {
      lifespan: 500,
      speed: { min: 50, max: 150 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0x44ff44, 0x66ff66, 0x88ff88],
      quantity: 10,
      emitting: false
    });
    this.collectParticles.setDepth(50);
  }

  private spawnInitialResources(): void {
    for (let i = 0; i < this.maxFood; i++) {
      this.spawnResource('food');
    }
    for (let i = 0; i < this.maxWood; i++) {
      this.spawnResource('wood');
    }
    for (let i = 0; i < this.maxStone; i++) {
      this.spawnResource('stone');
    }
  }

  private spawnResource(type: ResourceType): void {
    const pos = this.getRandomIslandPosition();
    if (pos) {
      const resource = new Resource(this, { type, x: pos.x, y: pos.y });
      resource.setDepth(5);
      this.resources.push(resource);
    }
  }

  private getRandomIslandPosition(): { x: number; y: number } | null {
    for (let attempt = 0; attempt < 50; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * (this.islandRadius - 40);
      const x = this.islandCenterX + Math.cos(angle) * distance;
      const y = this.islandCenterY + Math.sin(angle) * distance;

      if (!this.isPositionOccupied(x, y, 35)) {
        const playerDist = Phaser.Math.Distance.Between(x, y, this.playerPosX, this.playerPosY);
        if (playerDist > 60) {
          return { x, y };
        }
      }
    }
    return null;
  }

  private isPositionOccupied(x: number, y: number, minDistance: number): boolean {
    for (const resource of this.resources) {
      if (resource.active && resource.visible) {
        const dist = Phaser.Math.Distance.Between(x, y, resource.x, resource.y);
        if (dist < minDistance) return true;
      }
    }
    for (const building of this.buildings) {
      if (building.active) {
        const dist = Phaser.Math.Distance.Between(x, y, building.x, building.y);
        if (dist < minDistance + 30) return true;
      }
    }
    return false;
  }

  private createHUD(): void {
    this.hudContainer = this.add.container(0, 0);
    this.hudContainer.setDepth(1000);
    this.hudContainer.setScrollFactor(0);

    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x000000, 0.73);
    hudBg.fillRoundedRect(570, 10, 220, 160, 12);
    hudBg.lineStyle(2, 0x444444, 0.8);
    hudBg.strokeRoundedRect(570, 10, 220, 160, 12);
    this.hudContainer.add(hudBg);

    const titleText = this.add.text(680, 25, '生存状态', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    });
    titleText.setOrigin(0.5);
    this.hudContainer.add(titleText);

    this.staminaBarBg = this.add.graphics();
    this.staminaBarBg.fillStyle(0x333333, 1);
    this.staminaBarBg.fillRoundedRect(585, 45, 200, 20, 5);
    this.hudContainer.add(this.staminaBarBg);

    this.staminaBar = this.add.graphics();
    this.hudContainer.add(this.staminaBar);

    const staminaLabel = this.add.text(585, 70, '体力值', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#aaaaaa'
    });
    this.hudContainer.add(staminaLabel);

    this.foodText = this.add.text(585, 95, '🍖 食物: 0', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.hudContainer.add(this.foodText);

    this.woodText = this.add.text(585, 120, '🪵 木材: 0', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.hudContainer.add(this.woodText);

    this.stoneText = this.add.text(585, 145, '🪨 石头: 0', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    });
    this.hudContainer.add(this.stoneText);

    this.createRestButton();
  }

  private createRestButton(): void {
    this.restButton = this.add.arc(680, 185, 20, 0, 360, false, 0x4488ff);
    this.restButton.setStrokeStyle(2, 0x2266cc);
    this.restButton.setInteractive({ useHandCursor: true });
    this.hudContainer.add(this.restButton);

    this.restButtonText = this.add.text(680, 185, '💤', {
      fontFamily: 'Arial',
      fontSize: '16px'
    });
    this.restButtonText.setOrigin(0.5);
    this.hudContainer.add(this.restButtonText);

    const restLabel = this.add.text(680, 215, '休息', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#aaaaaa'
    });
    restLabel.setOrigin(0.5);
    this.hudContainer.add(restLabel);

    this.restButton.on('pointerover', () => {
      this.tweens.add({
        targets: this.restButton,
        scale: 1.1,
        fillColor: 0x66aaff,
        duration: 150
      });
    });

    this.restButton.on('pointerout', () => {
      this.tweens.add({
        targets: this.restButton,
        scale: 1,
        fillColor: 0x4488ff,
        duration: 150
      });
    });

    this.restButton.on('pointerdown', () => {
      this.tweens.add({
        targets: this.restButton,
        scale: 0.9,
        duration: 100,
        yoyo: true
      });
      this.startResting();
    });
  }

  private startResting(): void {
    if (this.playerState.isResting || this.playerState.isGameOver || this.draggingResource) return;

    this.playerState.isResting = true;
    this.playerState.restTimer = 5000;

    this.tweens.add({
      targets: this.player,
      alpha: 0.6,
      duration: 300,
      yoyo: true,
      repeat: -1
    });
  }

  private setupInputHandlers(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
      if (this.playerState.isResting || this.playerState.isGameOver) return;

      if (gameObjects.length > 0) {
        const obj = gameObjects[0];
        if (obj instanceof Resource && !obj.isCollected) {
          this.draggingResource = obj;
          obj.startDrag();
        }
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.draggingResource) {
        this.draggingResource.updateDragPosition(pointer);
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.draggingResource) {
        this.handleResourceDrop(pointer);
      }
    });

    this.input.on('pointerupoutside', (pointer: Phaser.Input.Pointer) => {
      if (this.draggingResource) {
        this.handleResourceDrop(pointer);
      }
    });
  }

  private handleResourceDrop(pointer: Phaser.Input.Pointer): void {
    if (!this.draggingResource) return;

    const resource = this.draggingResource;
    const distToPlayer = Phaser.Math.Distance.Between(
      pointer.x, pointer.y, this.playerPosX, this.playerPosY
    );

    if (distToPlayer < 50) {
      this.collectResource(resource);
    } else {
      const distFromPlayer = Phaser.Math.Distance.Between(
        pointer.x, pointer.y, this.playerPosX, this.playerPosY
      );
      if (distFromPlayer > 30 && this.isOnIsland(pointer.x, pointer.y) && !this.isPositionOccupied(pointer.x, pointer.y, 50)) {
        this.tryBuildingAt(resource, pointer.x, pointer.y);
      } else {
        this.returnResource(resource);
      }
    }

    this.draggingResource = null;
  }

  private isOnIsland(x: number, y: number): boolean {
    const dist = Phaser.Math.Distance.Between(x, y, this.islandCenterX, this.islandCenterY);
    return dist < this.islandRadius - 20;
  }

  private collectResource(resource: Resource): void {
    if (resource.isCollected) return;

    let staminaCost = 3;
    let resourceGain = 1;

    if (resource.type === 'food' && this.eventManager.isFoodGatheringReduced()) {
      staminaCost = 6;
    }

    if (this.playerState.stamina < staminaCost) {
      this.returnResource(resource);
      this.showFloatingText('体力不足!', this.playerPosX, this.playerPosY - 40, 0xff4444);
      return;
    }

    this.playerState.stamina -= staminaCost;

    switch (resource.type) {
      case 'food':
        this.playerState.food += resourceGain;
        break;
      case 'wood':
        this.playerState.wood += resourceGain;
        break;
      case 'stone':
        this.playerState.stone += resourceGain;
        break;
    }

    this.collectParticles.setPosition(resource.x, resource.y);
    this.collectParticles.explode(10);

    resource.collect();
    const idx = this.resources.indexOf(resource);
    if (idx > -1) this.resources.splice(idx, 1);

    this.updateHUD();
  }

  private returnResource(resource: Resource): void {
    resource.endDrag();
    this.tweens.add({
      targets: resource,
      x: resource.originalX,
      y: resource.originalY,
      scale: 1,
      duration: 300,
      ease: 'Quad.easeOut'
    });
  }

  private tryBuildingAt(resource: Resource, x: number, y: number): void {
    const slotKey = `${Math.floor(x / 40)}-${Math.floor(y / 40)}`;
    let slot = this.buildSlots.get(slotKey);
    if (!slot) {
      slot = { wood: 0, stone: 0 };
      this.buildSlots.set(slotKey, slot);
    }

    if (resource.type === 'wood') {
      slot.wood++;
    } else if (resource.type === 'stone') {
      slot.stone++;
    }

    resource.endDrag();
    resource.collect();
    const idx = this.resources.indexOf(resource);
    if (idx > -1) this.resources.splice(idx, 1);

    if (slot.wood >= 3) {
      this.createBuilding('shelter', x, y);
      this.buildSlots.delete(slotKey);
      slot.wood -= 3;
      if (slot.wood > 0 || slot.stone > 0) {
        this.buildSlots.set(slotKey, slot);
      }
    } else if (slot.wood >= 2 && slot.stone >= 1) {
      this.createBuilding('campfire', x, y);
      this.buildSlots.delete(slotKey);
      slot.wood -= 2;
      slot.stone -= 1;
      if (slot.wood > 0 || slot.stone > 0) {
        this.buildSlots.set(slotKey, slot);
      }
    } else {
      this.showFloatingText(
        `木材: ${slot.wood}/3 石头: ${slot.stone}`,
        x, y - 30, 0xffff00
      );
    }
  }

  private createBuilding(type: BuildingType, x: number, y: number): void {
    const building = new Building(this, { type, x, y });
    building.setDepth(8);
    this.buildings.push(building);

    const message = type === 'shelter' ? '🏠 庇护所建造完成!' : '🔥 篝火建造完成!';
    this.showFloatingText(message, x, y - 50, 0x44ff44);
  }

  private showFloatingText(text: string, x: number, y: number, color: number): void {
    const txt = this.add.text(x, y, text, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#' + color.toString(16).padStart(6, '0'),
      stroke: '#000000',
      strokeThickness: 2
    });
    txt.setOrigin(0.5);
    txt.setDepth(500);

    this.tweens.add({
      targets: txt,
      y: y - 40,
      alpha: 0,
      duration: 1500,
      ease: 'Quad.easeOut',
      onComplete: () => {
        txt.destroy();
      }
    });
  }

  private updateHUD(): void {
    this.foodText.setText(`🍖 食物: ${this.playerState.food}`);
    this.woodText.setText(`🪵 木材: ${this.playerState.wood}`);
    this.stoneText.setText(`🪨 石头: ${this.playerState.stone}`);
    this.updateStaminaBar();
  }

  private updateStaminaBar(): void {
    this.staminaBar.clear();
    const pct = Math.max(0, this.playerState.stamina) / 100;
    const width = Math.max(0, 200 * pct);

    let color: number;
    if (pct > 0.6) {
      color = 0x44ff44;
    } else if (pct > 0.3) {
      color = 0xffaa00;
    } else {
      color = 0xff4444;
    }

    this.staminaBar.fillStyle(color, 1);
    this.staminaBar.fillRoundedRect(585, 45, width, 20, 5);
  }

  public update(time: number, delta: number): void {
    if (this.playerState.isGameOver) return;

    this.updateWaves(delta);

    const hasShelter = this.buildings.some(b => b.type === 'shelter');
    this.eventManager.update(delta, hasShelter);

    this.updateStamina(delta);
    this.updateResting(delta);
    this.updateResourceRespawn(delta);
    this.checkCampfireBonus(delta);
  }

  private updateWaves(delta: number): void {
    this.waveTime += delta * 0.002 * this.eventManager.waveFrequency;
    this.oceanWaves.clear();

    for (let y = 0; y < 600; y += 8) {
      for (let x = 0; x < 800; x += 8) {
        const distToCenter = Phaser.Math.Distance.Between(x, y, this.islandCenterX, this.islandCenterY);
        if (distToCenter > this.islandRadius) {
          const wave = Math.sin(x * 0.02 + this.waveTime) * Math.cos(y * 0.02 + this.waveTime * 0.7);
          const brightness = 0x1a3a6a + Math.floor(wave * 10) * 0x010101;
          this.oceanWaves.fillStyle(brightness, 1);
          this.oceanWaves.fillPoint(x, y, 4);
        }
      }
    }
  }

  private updateStamina(delta: number): void {
    if (this.playerState.isResting) return;

    const drainRate = this.eventManager.getEffectiveStaminaDrain(
      this.buildings.some(b => b.type === 'shelter')
    );

    this.staminaAccumulator += delta * drainRate;
    while (this.staminaAccumulator >= 1000) {
      this.playerState.stamina -= 1;
      this.staminaAccumulator -= 1000;
    }

    if (this.playerState.stamina <= 0) {
      this.playerState.stamina = 0;
      this.gameOver();
    }

    this.updateStaminaBar();
  }

  private updateResting(delta: number): void {
    if (!this.playerState.isResting) return;

    this.playerState.restTimer -= delta;

    if (Math.random() < delta / 30000 && this.eventManager.currentWeather === 'clear') {
      this.playerState.isResting = false;
      this.playerState.restTimer = 0;
      this.tweens.killTweensOf(this.player);
      this.player.setAlpha(1);
      this.showFloatingText('休息被打断!', this.playerPosX, this.playerPosY - 40, 0xff4444);
      return;
    }

    const recoveryRate = 5;
    this.staminaAccumulator -= delta * recoveryRate;
    while (this.staminaAccumulator <= -1000) {
      this.playerState.stamina = Math.min(100, this.playerState.stamina + 1);
      this.staminaAccumulator += 1000;
    }

    if (this.playerState.restTimer <= 0) {
      this.playerState.isResting = false;
      this.tweens.killTweensOf(this.player);
      this.player.setAlpha(1);
      this.showFloatingText('休息完成!', this.playerPosX, this.playerPosY - 40, 0x44ff44);
    }

    this.updateStaminaBar();
  }

  private updateResourceRespawn(delta: number): void {
    this.resourceRespawnTimer += delta;

    if (this.resourceRespawnTimer >= this.resourceRespawnInterval) {
      this.resourceRespawnTimer = 0;

      const foodCount = this.resources.filter(r => r.type === 'food' && r.active && r.visible).length;
      const woodCount = this.resources.filter(r => r.type === 'wood' && r.active && r.visible).length;
      const stoneCount = this.resources.filter(r => r.type === 'stone' && r.active && r.visible).length;

      if (foodCount < this.maxFood) {
        for (let i = foodCount; i < this.maxFood; i++) {
          this.spawnResource('food');
        }
      }
      if (woodCount < this.maxWood) {
        for (let i = woodCount; i < this.maxWood; i++) {
          this.spawnResource('wood');
        }
      }
      if (stoneCount < this.maxStone) {
        for (let i = stoneCount; i < this.maxStone; i++) {
          this.spawnResource('stone');
        }
      }
    }
  }

  private checkCampfireBonus(delta: number): void {
    for (const building of this.buildings) {
      if (building.type === 'campfire' && building.isPointNearFire(this.playerPosX, this.playerPosY)) {
        if (!this.playerState.isResting) {
          this.staminaAccumulator -= delta * 0.5;
          while (this.staminaAccumulator <= -1000) {
            this.playerState.stamina = Math.min(100, this.playerState.stamina + 1);
            this.staminaAccumulator += 1000;
          }
        }
      }
    }
  }

  private gameOver(): void {
    this.playerState.isGameOver = true;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, 800, 600);
    overlay.setDepth(2000);

    const gameOverText = this.add.text(400, 250, '游戏结束', {
      fontFamily: 'Arial',
      fontSize: '48px',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 6
    });
    gameOverText.setOrigin(0.5);
    gameOverText.setDepth(2001);

    const subText = this.add.text(400, 320, '体力耗尽，你未能在荒岛上生存下来...', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    });
    subText.setOrigin(0.5);
    subText.setDepth(2001);

    const restartBtn = this.add.arc(400, 400, 50, 0, 360, false, 0x4488ff);
    restartBtn.setStrokeStyle(3, 0x2266cc);
    restartBtn.setInteractive({ useHandCursor: true });
    restartBtn.setDepth(2001);

    const restartText = this.add.text(400, 400, '重新开始', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    });
    restartText.setOrigin(0.5);
    restartText.setDepth(2002);

    restartBtn.on('pointerover', () => {
      this.tweens.add({ targets: restartBtn, scale: 1.1, fillColor: 0x66aaff, duration: 150 });
    });
    restartBtn.on('pointerout', () => {
      this.tweens.add({ targets: restartBtn, scale: 1, fillColor: 0x4488ff, duration: 150 });
    });
    restartBtn.on('pointerdown', () => {
      this.scene.restart();
    });
  }
}
