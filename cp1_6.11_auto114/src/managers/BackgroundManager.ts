import Phaser from 'phaser';

interface BuildingLayer {
  graphics: Phaser.GameObjects.Graphics;
  speed: number;
  buildings: BuildingData[];
  color: number;
  minHeight: number;
  maxHeight: number;
  minWidth: number;
  maxWidth: number;
  offset: number;
}

interface BuildingData {
  x: number;
  y: number;
  width: number;
  height: number;
  windows: WindowData[];
}

interface WindowData {
  x: number;
  y: number;
  lit: boolean;
  flickerTimer: number;
  flickerInterval: number;
}

export class BackgroundManager {
  private scene: Phaser.Scene;
  private layers: BuildingLayer[] = [];
  private skyGradient: Phaser.GameObjects.Graphics;
  private baseScrollSpeed: number = 1;
  private highSpeedMode: boolean = false;
  private currentBgColor: { r: number; g: number; b: number } = { r: 13, g: 2, b: 33 };
  private targetBgColor: { r: number; g: number; b: number } = { r: 13, g: 2, b: 33 };
  private colorTransitionProgress: number = 0;
  private colorTransitionActive: boolean = false;
  private colorTransitionDuration: number = 5000;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.skyGradient = scene.add.graphics();
    this.createLayers();
  }

  private createLayers(): void {
    this.layers = [
      this.createLayer(0x0f3460, 1, 80, 200, 60, 120),
      this.createLayer(0x16213e, 2, 120, 280, 80, 150),
      this.createLayer(0x1a1a2e, 3, 180, 350, 100, 180)
    ];

    for (const layer of this.layers) {
      this.generateInitialBuildings(layer);
    }
  }

  private createLayer(
    color: number,
    speed: number,
    minHeight: number,
    maxHeight: number,
    minWidth: number,
    maxWidth: number
  ): BuildingLayer {
    return {
      graphics: this.scene.add.graphics(),
      speed,
      buildings: [],
      color,
      minHeight,
      maxHeight,
      minWidth,
      maxWidth,
      offset: 0
    };
  }

  private generateInitialBuildings(layer: BuildingLayer): void {
    const width = this.scene.scale.width;
    let x = -50;

    while (x < width + 200) {
      const buildingWidth = Phaser.Math.Between(layer.minWidth, layer.maxWidth);
      const buildingHeight = Phaser.Math.Between(layer.minHeight, layer.maxHeight);
      const buildingY = this.scene.scale.height - buildingHeight;

      const windows = this.generateWindows(buildingWidth, buildingHeight);

      layer.buildings.push({
        x,
        y: buildingY,
        width: buildingWidth,
        height: buildingHeight,
        windows
      });

      x += buildingWidth + Phaser.Math.Between(10, 30);
    }
  }

  private generateWindows(buildingWidth: number, buildingHeight: number): WindowData[] {
    const windows: WindowData[] = [];
    const windowSize = 6;
    const spacing = 12;

    for (let wy = 15; wy < buildingHeight - 15; wy += spacing) {
      for (let wx = 10; wx < buildingWidth - 10; wx += spacing) {
        windows.push({
          x: wx,
          y: wy,
          lit: Math.random() > 0.4,
          flickerTimer: 0,
          flickerInterval: Phaser.Math.Between(800, 2000)
        });
      }
    }

    return windows;
  }

  setHighSpeedMode(enabled: boolean): void {
    if (enabled !== this.highSpeedMode) {
      this.highSpeedMode = enabled;
      this.targetBgColor = enabled ? { r: 26, g: 0, b: 0 } : { r: 13, g: 2, b: 33 };
      this.colorTransitionActive = true;
      this.colorTransitionProgress = 0;
    }
  }

  setScrollSpeed(speed: number): void {
    this.baseScrollSpeed = speed;
  }

  update(delta: number, speedMultiplier: number = 1): void {
    if (this.colorTransitionActive) {
      this.colorTransitionProgress += delta;
      const t = Math.min(this.colorTransitionProgress / this.colorTransitionDuration, 1);

      this.currentBgColor.r = Phaser.Math.Linear(this.currentBgColor.r, this.targetBgColor.r, t * 0.05);
      this.currentBgColor.g = Phaser.Math.Linear(this.currentBgColor.g, this.targetBgColor.g, t * 0.05);
      this.currentBgColor.b = Phaser.Math.Linear(this.currentBgColor.b, this.targetBgColor.b, t * 0.05);

      if (t >= 1) {
        this.colorTransitionActive = false;
        this.currentBgColor = { ...this.targetBgColor };
      }
    }

    this.drawSkyGradient();

    const speedMult = this.highSpeedMode ? 2 : 1;

    for (const layer of this.layers) {
      const moveAmount = layer.speed * this.baseScrollSpeed * speedMultiplier * speedMult * (delta / 1000) * 60 / 60;
      layer.offset += moveAmount;

      for (let i = layer.buildings.length - 1; i >= 0; i--) {
        const building = layer.buildings[i];
        building.x -= moveAmount;

        for (const window of building.windows) {
          window.flickerTimer += delta;
          if (window.flickerTimer >= window.flickerInterval) {
            window.flickerTimer = 0;
            window.lit = !window.lit;
            window.flickerInterval = Phaser.Math.Between(800, 2000);
          }
        }

        if (building.x + building.width < -50) {
          layer.buildings.splice(i, 1);
        }
      }

      let rightMost = 0;
      for (const b of layer.buildings) {
        rightMost = Math.max(rightMost, b.x + b.width);
      }

      while (rightMost < this.scene.scale.width + 200) {
        const buildingWidth = Phaser.Math.Between(layer.minWidth, layer.maxWidth);
        const buildingHeight = Phaser.Math.Between(layer.minHeight, layer.maxHeight);
        const buildingY = this.scene.scale.height - buildingHeight;
        const newX = rightMost + Phaser.Math.Between(10, 30);

        layer.buildings.push({
          x: newX,
          y: buildingY,
          width: buildingWidth,
          height: buildingHeight,
          windows: this.generateWindows(buildingWidth, buildingHeight)
        });

        rightMost = newX + buildingWidth;
      }

      this.drawLayer(layer);
    }
  }

  private drawSkyGradient(): void {
    this.skyGradient.clear();

    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const steps = 20;

    const topColor = { r: this.currentBgColor.r, g: this.currentBgColor.g, b: this.currentBgColor.b };
    const bottomColor = {
      r: Math.min(255, this.currentBgColor.r + 10),
      g: Math.min(255, this.currentBgColor.g + 10),
      b: Math.min(255, this.currentBgColor.b + 20)
    };

    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.floor(Phaser.Math.Linear(topColor.r, bottomColor.r, t));
      const g = Math.floor(Phaser.Math.Linear(topColor.g, bottomColor.g, t));
      const b = Math.floor(Phaser.Math.Linear(topColor.b, bottomColor.b, t));
      const color = Phaser.Display.Color.GetColor(r, g, b);

      this.skyGradient.fillStyle(color, 1);
      this.skyGradient.fillRect(0, (h / steps) * i, w, h / steps + 1);
    }
  }

  private drawLayer(layer: BuildingLayer): void {
    layer.graphics.clear();

    for (const building of layer.buildings) {
      layer.graphics.fillStyle(layer.color, 1);
      layer.graphics.fillRect(building.x, building.y, building.width, building.height);

      layer.graphics.lineStyle(1, 0x000000, 0.3);
      layer.graphics.strokeRect(building.x, building.y, building.width, building.height);

      for (const window of building.windows) {
        if (window.lit) {
          const flicker = Math.random() > 0.9 ? 0.4 : 1;
          layer.graphics.fillStyle(0xffd700, 0.8 * flicker);
        } else {
          layer.graphics.fillStyle(0x4a3b32, 0.6);
        }
        layer.graphics.fillRect(building.x + window.x, building.y + window.y, 4, 4);
      }
    }
  }

  destroy(): void {
    this.skyGradient.destroy();
    for (const layer of this.layers) {
      layer.graphics.destroy();
    }
    this.layers = [];
  }
}
