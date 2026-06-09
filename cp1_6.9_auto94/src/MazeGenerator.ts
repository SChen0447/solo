import Phaser from 'phaser';

export interface PetalData {
  id: number;
  x: number;
  y: number;
  radius: number;
  angle: number;
  container: Phaser.GameObjects.Container;
  auras: Phaser.GameObjects.Arc[];
}

export interface VineData {
  id: number;
  points: Phaser.Geom.Point[];
  graphics: Phaser.GameObjects.Graphics;
  baseY: number;
  amplitude: number;
  speed: number;
}

export interface CrystalData {
  id: number;
  x: number;
  y: number;
  color: number;
  container: Phaser.GameObjects.Container;
  collected: boolean;
}

export class MazeGenerator {
  private scene: Phaser.Scene;
  private worldBounds: Phaser.Geom.Rectangle;
  private petals: PetalData[] = [];
  private vines: VineData[] = [];
  private crystals: CrystalData[] = [];
  private idCounter: number = 0;
  private time: number = 0;
  private level: number = 1;
  private petalSpeedMultiplier: number = 1.0;

  constructor(scene: Phaser.Scene, worldBounds: Phaser.Geom.Rectangle) {
    this.scene = scene;
    this.worldBounds = worldBounds;
  }

  public generate(level: number = 1): void {
    this.level = level;
    this.petalSpeedMultiplier = 1.0 + (level - 1) * 0.1;
    this.clear();
    const crystalCount = 30 + (level - 1) * 5;
    const petalCount = 18 + level * 2;
    const vineCount = 10 + level;

    for (let i = 0; i < petalCount; i++) {
      this.createPetal();
    }
    for (let i = 0; i < vineCount; i++) {
      this.createVine();
    }
    for (let i = 0; i < crystalCount; i++) {
      this.createCrystal();
    }
  }

  private clear(): void {
    this.petals.forEach(p => {
      p.auras.forEach(a => a.destroy());
      p.container.destroy();
    });
    this.vines.forEach(v => v.graphics.destroy());
    this.crystals.forEach(c => c.container.destroy());
    this.petals = [];
    this.vines = [];
    this.crystals = [];
    this.idCounter = 0;
  }

  private createPetal(): void {
    const id = this.idCounter++;
    const radius = Phaser.Math.Between(20, 35);
    const x = Phaser.Math.Between(100, this.worldBounds.width - 100);
    const y = Phaser.Math.Between(100, this.worldBounds.height - 100);
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);

    const container = this.scene.add.container(x, y);
    container.setDepth(50);

    const graphics = this.scene.add.graphics();
    graphics.fillGradientStyle(0xff69b4, 0xff69b4, 0x87ceeb, 0x87ceeb, 0.85);
    graphics.slice(0, 0, radius, 0, Math.PI, false);
    graphics.fillPath();

    graphics.setRotation(angle);
    container.add(graphics);

    const auras: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < 3; i++) {
      const aura = this.scene.add.arc(
        0, 0,
        radius + 8 + i * 6,
        0, 360,
        false,
        0xffffff,
        0.06
      );
      aura.setStrokeStyle(1, 0xffffff, 0.12 - i * 0.03);
      container.add(aura);
      auras.push(aura);
    }

    this.petals.push({
      id,
      x, y, radius, angle,
      container,
      auras
    });
  }

  private createVine(): void {
    const id = this.idCounter++;
    const startX = Phaser.Math.Between(0, this.worldBounds.width - 300);
    const baseY = Phaser.Math.Between(100, this.worldBounds.height - 100);
    const length = Phaser.Math.Between(200, 400);
    const amplitude = 5;
    const speed = Phaser.Math.FloatBetween(0.8, 1.5) * this.petalSpeedMultiplier;

    const graphics = this.scene.add.graphics();
    graphics.setDepth(40);

    const points: Phaser.Geom.Point[] = [];
    const step = 10;
    for (let x = 0; x <= length; x += step) {
      points.push(new Phaser.Geom.Point(startX + x, baseY));
    }

    this.vines.push({
      id,
      points,
      graphics,
      baseY,
      amplitude,
      speed
    });

    this.drawVine(this.vines[this.vines.length - 1], 0);
  }

  private drawVine(vine: VineData, time: number): void {
    const g = vine.graphics;
    g.clear();
    g.lineStyle(8, 0xffffff, 1);

    if (vine.points.length < 2) return;

    const startX = vine.points[0].x;
    const endX = vine.points[vine.points.length - 1].x;
    const totalLength = endX - startX;

    g.beginPath();
    for (let i = 0; i < vine.points.length; i++) {
      const p = vine.points[i];
      const t = (p.x - startX) / totalLength;
      const wave = Math.sin(t * Math.PI * 4 + time * vine.speed) * vine.amplitude;
      const hue = (t * 360 + time * 50) % 360;
      const color = Phaser.Display.Color.HSVToRGB(hue / 360, 0.8, 0.9).color;

      if (i === 0) {
        g.moveTo(p.x, vine.baseY + wave);
      } else {
        const prevP = vine.points[i - 1];
        const prevT = (prevP.x - startX) / totalLength;
        const prevWave = Math.sin(prevT * Math.PI * 4 + time * vine.speed) * vine.amplitude;
        g.lineStyle(8, color, 0.9);
        g.lineBetween(prevP.x, vine.baseY + prevWave, p.x, vine.baseY + wave);
      }
    }
  }

  private createCrystal(): void {
    const id = this.idCounter++;
    const colors = [0x00ffff, 0xff00ff, 0xffd700];
    const color = Phaser.Utils.Array.GetRandom(colors);
    let x: number, y: number;
    let valid = false;
    let attempts = 0;

    while (!valid && attempts < 50) {
      x = Phaser.Math.Between(60, this.worldBounds.width - 60);
      y = Phaser.Math.Between(60, this.worldBounds.height - 60);
      valid = true;
      for (const p of this.petals) {
        const dx = x - p.x;
        const dy = y - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < p.radius + 25) {
          valid = false;
          break;
        }
      }
      attempts++;
    }

    const container = this.scene.add.container(x!, y!);
    container.setDepth(60);

    const crystalShape = this.scene.add.graphics();
    crystalShape.fillStyle(color, 1);
    crystalShape.beginPath();
    crystalShape.moveTo(0, -6);
    crystalShape.lineTo(6, 0);
    crystalShape.lineTo(0, 6);
    crystalShape.lineTo(-6, 0);
    crystalShape.closePath();
    crystalShape.fillPath();
    crystalShape.lineStyle(1, 0xffffff, 0.6);
    crystalShape.strokePath();
    container.add(crystalShape);

    const glow = this.scene.add.arc(0, 0, 10, 0, 360, false, color, 0.2);
    container.add(glow);

    const orbitDots: Phaser.GameObjects.Arc[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dot = this.scene.add.circle(
        Math.cos(angle) * 12,
        Math.sin(angle) * 12,
        1.5,
        color,
        0.9
      );
      container.add(dot);
      orbitDots.push(dot);
    }
    (container as any).orbitDots = orbitDots;

    this.crystals.push({
      id,
      x: x!,
      y: y!,
      color,
      container,
      collected: false
    });
  }

  public update(delta: number): void {
    this.time += delta / 1000;

    this.petals.forEach(petal => {
      const breathScale = 1.0 + 0.05 * Math.sin(this.time * Math.PI);
      petal.container.setScale(breathScale);
      petal.container.rotation += delta / 1000 * 0.3 * this.petalSpeedMultiplier;
      petal.auras.forEach((aura, idx) => {
        const t = (this.time * 2 + idx * 0.33) % 1;
        aura.setAlpha(0.1 - t * 0.08);
        aura.setRadius(petal.radius + 8 + idx * 6 + t * 8);
      });
    });

    this.vines.forEach(vine => {
      this.drawVine(vine, this.time);
    });

    this.crystals.forEach(crystal => {
      if (crystal.collected) return;
      crystal.container.rotation += delta / 1000 * Math.PI;
      const dots = (crystal.container as any).orbitDots as Phaser.GameObjects.Arc[];
      dots.forEach((dot, i) => {
        const angle = (i / 8) * Math.PI * 2 + this.time * Math.PI * 2;
        dot.x = Math.cos(angle) * 12;
        dot.y = Math.sin(angle) * 12;
      });
    });
  }

  public getPetals(): PetalData[] {
    return this.petals;
  }

  public getVines(): VineData[] {
    return this.vines;
  }

  public getCrystals(): CrystalData[] {
    return this.crystals;
  }

  public markCrystalCollected(id: number): void {
    const c = this.crystals.find(cr => cr.id === id);
    if (c) {
      c.collected = true;
      c.container.setVisible(false);
    }
  }

  public isCrystalCollected(id: number): boolean {
    const c = this.crystals.find(cr => cr.id === id);
    return c ? c.collected : true;
  }

  public destroy(): void {
    this.clear();
  }
}
