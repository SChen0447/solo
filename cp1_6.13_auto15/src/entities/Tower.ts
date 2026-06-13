import Phaser from 'phaser';
import { Enemy } from './Enemy';

export type TowerType = 'firewall' | 'virus' | 'encryptor';

export interface TowerLevelStats {
  damage: number;
  range: number;
  fireRate: number;
  upgradeCost: number;
  sellValue: number;
}

export interface TowerConfig {
  type: TowerType;
  name: string;
  description: string;
  baseCost: number;
  levels: TowerLevelStats[];
}

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  firewall: {
    type: 'firewall',
    name: '防火墙',
    description: '蓝色激光束，平衡输出',
    baseCost: 50,
    levels: [
      { damage: 18, range: 150, fireRate: 650, upgradeCost: 75, sellValue: 30 },
      { damage: 32, range: 170, fireRate: 550, upgradeCost: 120, sellValue: 70 },
      { damage: 55, range: 195, fireRate: 450, upgradeCost: 0, sellValue: 140 }
    ]
  },
  virus: {
    type: 'virus',
    name: '病毒陷阱',
    description: '紫色波浪线，穿透护盾',
    baseCost: 80,
    levels: [
      { damage: 14, range: 130, fireRate: 800, upgradeCost: 100, sellValue: 48 },
      { damage: 26, range: 150, fireRate: 700, upgradeCost: 160, sellValue: 105 },
      { damage: 48, range: 175, fireRate: 600, upgradeCost: 0, sellValue: 200 }
    ]
  },
  encryptor: {
    type: 'encryptor',
    name: '数据加密塔',
    description: '橙色散射弹，群体伤害',
    baseCost: 110,
    levels: [
      { damage: 10, range: 120, fireRate: 950, upgradeCost: 140, sellValue: 66 },
      { damage: 18, range: 145, fireRate: 820, upgradeCost: 220, sellValue: 145 },
      { damage: 34, range: 170, fireRate: 700, upgradeCost: 0, sellValue: 275 }
    ]
  }
};

export class Tower extends Phaser.GameObjects.Container {
  public type: TowerType;
  public level: number = 0;
  public cellX: number;
  public cellY: number;
  public isSelected: boolean = false;

  private config: TowerConfig;
  private baseGraphics: Phaser.GameObjects.Graphics;
  private topGraphics: Phaser.GameObjects.Graphics;
  private rangeCircle: Phaser.GameObjects.Arc | null = null;
  private deployTime: number = 0;
  private fireCooldown: number = 0;
  private currentTarget: Enemy | null = null;
  private beamLines: Phaser.GameObjects.Graphics | null = null;
  private digitalFlickerTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, cellX: number, cellY: number, type: TowerType) {
    super(scene, x, y);
    this.cellX = cellX;
    this.cellY = cellY;
    this.type = type;
    this.config = TOWER_CONFIGS[type];

    this.baseGraphics = new Phaser.GameObjects.Graphics(scene);
    this.topGraphics = new Phaser.GameObjects.Graphics(scene);
    this.beamLines = new Phaser.GameObjects.Graphics(scene);

    this.add(this.baseGraphics);
    this.add(this.topGraphics);
    this.add(this.beamLines);

    this.drawBase();
    this.drawTop();

    scene.add.existing(this);
    this.setSize(44, 44);

    this.playDeployAnimation();
  }

  public get currentStats(): TowerLevelStats {
    return this.config.levels[this.level];
  }

  public getConfig(): TowerConfig {
    return this.config;
  }

  public canUpgrade(): boolean {
    return this.level < this.config.levels.length - 1;
  }

  public upgrade(): boolean {
    if (!this.canUpgrade()) return false;
    this.level++;
    this.drawTop();
    this.playDeployAnimation();
    return true;
  }

  public sellValue(): number {
    return this.currentStats.sellValue;
  }

  private drawBase(): void {
    const g = this.baseGraphics;
    g.clear();

    const colors = this.getColors();
    const outer = 20;
    const inner = 13;

    g.fillStyle(0x0a0520, 0.85);
    g.lineStyle(2, colors.glow, 0.9);
    this.drawHexShape(g, outer);
    g.fillPath();
    g.strokePath();

    g.lineStyle(1, colors.accent, 0.6);
    this.drawHexShape(g, inner);
    g.strokePath();

    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 + Math.PI / 6;
      const sx = Math.cos(angle) * (outer - 3);
      const sy = Math.sin(angle) * (outer - 3);
      const ex = Math.cos(angle) * (inner + 3);
      const ey = Math.sin(angle) * (inner + 3);
      g.lineStyle(1, colors.glow, 0.45);
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(ex, ey);
      g.strokePath();
    }
  }

  private drawTop(): void {
    const g = this.topGraphics;
    g.clear();
    const colors = this.getColors();
    const lvl = this.level;

    g.lineStyle(2, colors.glow, 0.95);

    switch (this.type) {
      case 'firewall':
        this.drawFirewallTop(g, colors, lvl);
        break;
      case 'virus':
        this.drawVirusTop(g, colors, lvl);
        break;
      case 'encryptor':
        this.drawEncryptorTop(g, colors, lvl);
        break;
    }

    for (let i = 0; i <= lvl; i++) {
      const dotX = -8 + i * 8;
      const dotY = 16;
      g.fillStyle(colors.glow, 1);
      g.fillCircle(dotX, dotY, 2.2);
    }
  }

  private drawFirewallTop(g: Phaser.GameObjects.Graphics, colors: { glow: number; accent: number; body: number }, lvl: number): void {
    const h = 10 + lvl * 2;

    g.fillStyle(colors.body, 0.95);
    g.fillRect(-10, -h, 20, h * 2);
    g.strokeRect(-10, -h, 20, h * 2);

    g.fillStyle(colors.glow, 0.85);
    for (let i = -h + 3; i < h - 2; i += 5) {
      g.fillRect(-8, i, 16, 1.5);
    }

    g.fillStyle(0xffffff, 0.9);
    g.fillRect(-2, -h - 4, 4, h + 4);
    g.fillStyle(colors.glow, 1);
    g.fillCircle(0, -h - 4, 3.5);
  }

  private drawVirusTop(g: Phaser.GameObjects.Graphics, colors: { glow: number; accent: number; body: number }, lvl: number): void {
    const r = 9 + lvl * 1.5;

    g.fillStyle(colors.body, 0.95);
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.fillPath();
    g.strokePath();

    const spikes = 6 + lvl * 2;
    for (let i = 0; i < spikes; i++) {
      const a = (i * Math.PI * 2) / spikes;
      const sx = Math.cos(a) * r;
      const sy = Math.sin(a) * r;
      const ex = Math.cos(a) * (r + 5 + lvl);
      const ey = Math.sin(a) * (r + 5 + lvl);
      g.lineStyle(2, colors.glow, 0.9);
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(ex, ey);
      g.strokePath();
      g.fillStyle(colors.glow, 1);
      g.fillCircle(ex, ey, 2.5);
    }

    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(-2, -2, 2);
    g.fillCircle(3, 2, 1.8);
  }

  private drawEncryptorTop(g: Phaser.GameObjects.Graphics, colors: { glow: number; accent: number; body: number }, lvl: number): void {
    const size = 9 + lvl * 1.5;

    g.fillStyle(colors.body, 0.95);
    g.beginPath();
    g.moveTo(0, -size);
    g.lineTo(size, 0);
    g.lineTo(0, size);
    g.lineTo(-size, 0);
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.lineStyle(1.5, colors.accent, 0.75);
    g.beginPath();
    g.moveTo(0, -size * 0.6);
    g.lineTo(size * 0.6, 0);
    g.lineTo(0, size * 0.6);
    g.lineTo(-size * 0.6, 0);
    g.closePath();
    g.strokePath();

    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(0, 0, 3 + lvl * 0.5);
  }

  private drawHexShape(g: Phaser.GameObjects.Graphics, r: number): void {
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 6;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath();
  }

  private getColors(): { glow: number; accent: number; body: number } {
    switch (this.type) {
      case 'firewall':
        return { glow: 0x00ccff, accent: 0x0088ff, body: 0x002244 };
      case 'virus':
        return { glow: 0xcc44ff, accent: 0x8800ff, body: 0x220044 };
      case 'encryptor':
        return { glow: 0xff9933, accent: 0xff6600, body: 0x442200 };
    }
  }

  private playDeployAnimation(): void {
    this.deployTime = 500;
    this.setScale(0.2);

    if (this.digitalFlickerTween) this.digitalFlickerTween.stop();

    this.scene.tweens.add({
      targets: this,
      scale: 1,
      duration: 450,
      ease: Phaser.Math.Easing.Back.Out
    });

    const colors = this.getColors();
    const ringKey = `ring_${Phaser.Utils.String.UUID().slice(0, 6)}`;
    const rg = this.scene.make.graphics({ x: 0, y: 0, add: false });
    rg.lineStyle(3, colors.glow, 1);
    rg.strokeCircle(24, 24, 20);
    rg.generateTexture(ringKey, 48, 48);
    rg.destroy();

    const ring = this.scene.add.image(this.x, this.y, ringKey);
    ring.setAlpha(0.8);
    ring.setScale(0.3);

    this.scene.tweens.add({
      targets: ring,
      scale: 3.5,
      alpha: 0,
      duration: 650,
      ease: Phaser.Math.Easing.Cubic.Out,
      onComplete: () => {
        ring.destroy();
        this.scene.textures.exists(ringKey) && this.scene.textures.remove(ringKey);
      }
    });

    const digitKey = `digit_${Phaser.Utils.String.UUID().slice(0, 6)}`;
    const dg = this.scene.make.graphics({ x: 0, y: 0, add: false });
    dg.fillStyle(0xffffff, 1);
    dg.fillRect(0, 0, 2, 2);
    dg.generateTexture(digitKey, 2, 2);
    dg.destroy();

    this.scene.add.particles(this.x, this.y, digitKey, {
      lifespan: 700,
      speed: { min: 40, max: 150 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.5, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [colors.glow, colors.accent, 0xffffff],
      quantity: 22,
      frequency: -1
    });

    this.scene.time.delayedCall(900, () => this.scene.textures.exists(digitKey) && this.scene.textures.remove(digitKey));
  }

  public showRange(show: boolean): void {
    if (show) {
      const colors = this.getColors();
      if (!this.rangeCircle) {
        this.rangeCircle = this.scene.add.circle(this.x, this.y, this.currentStats.range);
        this.rangeCircle.setStrokeStyle(2, colors.glow, 0.6);
        this.rangeCircle.setFillStyle(colors.glow, 0.07);
        this.rangeCircle.setDepth(5);
      } else {
        this.rangeCircle.setVisible(true);
        this.rangeCircle.setRadius(this.currentStats.range);
      }
    } else {
      if (this.rangeCircle) {
        this.rangeCircle.setVisible(false);
      }
    }
  }

  public findTarget(enemies: Enemy[]): Enemy | null {
    const range = this.currentStats.range;
    let best: Enemy | null = null;
    let bestProgress = -1;

    for (const e of enemies) {
      if (e.isDead || e.reachedEnd) continue;
      const dx = e.x - this.x;
      const dy = e.y - this.y;
      if (dx * dx + dy * dy > range * range) continue;
      const progress = e.pathIndex + e.pathProgress * 0.0001;
      if (progress > bestProgress) {
        bestProgress = progress;
        best = e;
      }
    }

    return best;
  }

  public update(time: number, delta: number, enemies: Enemy[]): void {
    if (this.deployTime > 0) {
      this.deployTime -= delta;
      const colors = this.getColors();
      const pulse = 0.8 + Math.sin(time * 0.02) * 0.2;
      if (this.rangeCircle) {
        this.rangeCircle.setStrokeStyle(2, colors.glow, 0.6 * pulse);
      }
    }

    this.fireCooldown -= delta;

    if (!this.currentTarget || this.currentTarget.isDead || this.currentTarget.reachedEnd ||
        Phaser.Math.Distance.Between(this.x, this.y, this.currentTarget.x, this.currentTarget.y) > this.currentStats.range) {
      this.currentTarget = this.findTarget(enemies);
    }

    if (this.beamLines) {
      this.beamLines.clear();
    }

    if (this.currentTarget && this.fireCooldown <= 0 && this.beamLines) {
      this.fire(this.currentTarget);
      this.fireCooldown = this.currentStats.fireRate;
    }
  }

  private fire(target: Enemy): void {
    const colors = this.getColors();
    const g = this.beamLines!;
    const stats = this.currentStats;

    switch (this.type) {
      case 'firewall':
        this.fireStraightBeam(g, target, colors);
        break;
      case 'virus':
        this.fireWaveBeam(g, target, colors);
        break;
      case 'encryptor':
        this.fireSpreadShots(target, colors);
        break;
    }

    this.scene.cameras.main.shake(50, 0.0015);
  }

  private fireStraightBeam(g: Phaser.GameObjects.Graphics, target: Enemy, colors: { glow: number; accent: number }): void {
    g.lineStyle(6, colors.glow, 0.35);
    g.beginPath();
    g.moveTo(this.x, this.y - 8);
    g.lineTo(target.x, target.y);
    g.strokePath();

    g.lineStyle(3, 0xffffff, 0.95);
    g.beginPath();
    g.moveTo(this.x, this.y - 8);
    g.lineTo(target.x, target.y);
    g.strokePath();

    g.lineStyle(2, colors.accent, 0.9);
    g.beginPath();
    g.moveTo(this.x, this.y - 8);
    g.lineTo(target.x, target.y);
    g.strokePath();

    this.spawnHitSparks(target.x, target.y, colors.glow);
    this.spawnTrajectory(this.x, this.y - 8, target.x, target.y, colors.glow);

    let dmg = this.currentStats.damage;
    const result = target.takeDamage(dmg);
  }

  private fireWaveBeam(g: Phaser.GameObjects.Graphics, target: Enemy, colors: { glow: number; accent: number }): void {
    const x0 = this.x, y0 = this.y;
    const x1 = target.x, y1 = target.y;
    const dx = x1 - x0, dy = y1 - y0;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.max(10, Math.floor(dist / 8));

    g.lineStyle(3, colors.glow, 0.85);
    g.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const bx = x0 + dx * t;
      const by = y0 + dy * t;
      const nx = -dy / dist;
      const ny = dx / dist;
      const waveAmp = Math.sin(t * Math.PI * 6 + this.scene.time.now * 0.03) * 7;
      const px = bx + nx * waveAmp;
      const py = by + ny * waveAmp;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.strokePath();

    g.lineStyle(1.5, 0xffffff, 0.7);
    g.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const bx = x0 + dx * t;
      const by = y0 + dy * t;
      const nx = -dy / dist;
      const ny = dx / dist;
      const waveAmp = Math.sin(t * Math.PI * 6 + this.scene.time.now * 0.03 + 1) * 7;
      const px = bx + nx * waveAmp;
      const py = by + ny * waveAmp;
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.strokePath();

    this.spawnHitSparks(target.x, target.y, colors.glow);
    this.spawnTrajectory(this.x, this.y, target.x, target.y, colors.glow);

    let dmg = this.currentStats.damage;
    const result = target.takeDamage(dmg);
  }

  private fireSpreadShots(target: Enemy, colors: { glow: number; accent: number }): void {
    const shots = 3 + this.level;
    const baseAngle = Math.atan2(target.y - this.y, target.x - this.x);
    const spread = 0.55;

    for (let i = 0; i < shots; i++) {
      const a = baseAngle + Phaser.Math.Linear(-spread / 2, spread / 2, i / (shots - 1 || 1));
      const tx = target.x + Math.cos(a + Math.PI) * Phaser.Math.Between(-30, 30);
      const ty = target.y + Math.sin(a + Math.PI) * Phaser.Math.Between(-30, 30);
      this.launchProjectile(this.x, this.y, tx, ty, target, colors);
    }
  }

  private launchProjectile(x0: number, y0: number, x1: number, y1: number, primaryTarget: Enemy, colors: { glow: number; accent: number }): void {
    const key = `proj_${Phaser.Utils.String.UUID().slice(0, 6)}`;
    const pg = this.scene.make.graphics({ x: 0, y: 0, add: false });
    pg.fillStyle(colors.glow, 1);
    pg.fillCircle(4, 4, 4);
    pg.lineStyle(1, 0xffffff, 0.8);
    pg.strokeCircle(4, 4, 4);
    pg.generateTexture(key, 8, 8);
    pg.destroy();

    const proj = this.scene.add.image(x0, y0, key);
    proj.setDepth(8);

    const angle = Math.atan2(y1 - y0, x1 - x0);
    const speed = 480;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const maxDist = 400;
    let traveled = 0;

    this.spawnTrajectory(x0, y0, x1, y1, colors.glow);

    const scene = this.scene;
    const dmg = this.currentStats.damage;
    const enemiesRef = (scene as any).enemies as Enemy[];

    let updateEvt: Phaser.Time.TimerEvent | null = null;
    updateEvt = scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (!proj.active) return;
        const step = speed * 0.016;
        proj.x += vx * 0.016;
        proj.y += vy * 0.016;
        proj.rotation += 0.3;
        traveled += step;

        for (const e of enemiesRef) {
          if (e.isDead || e.reachedEnd) continue;
          const ddx = e.x - proj.x;
          const ddy = e.y - proj.y;
          if (ddx * ddx + ddy * ddy < 500) {
            e.takeDamage(dmg);
            this.spawnHitSparks(proj.x, proj.y, colors.glow);
            proj.destroy();
            scene.textures.exists(key) && scene.textures.remove(key);
            updateEvt?.remove();
            return;
          }
        }

        if (traveled > maxDist || proj.x < -50 || proj.x > 1250 || proj.y < -50 || proj.y > 850) {
          proj.destroy();
          scene.textures.exists(key) && scene.textures.remove(key);
          updateEvt?.remove();
        }
      }
    });
  }

  private spawnHitSparks(x: number, y: number, color: number): void {
    const key = `spk_${Phaser.Utils.String.UUID().slice(0, 6)}`;
    const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(2, 2, 2);
    g.generateTexture(key, 4, 4);
    g.destroy();

    this.scene.add.particles(x, y, key, {
      lifespan: 320,
      speed: { min: 80, max: 220 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.2, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [color, 0xffffff, 0xffff00],
      quantity: 10,
      frequency: -1
    });

    this.scene.time.delayedCall(500, () => this.scene.textures.exists(key) && this.scene.textures.remove(key));
  }

  private spawnTrajectory(x0: number, y0: number, x1: number, y1: number, color: number): void {
    const dx = x1 - x0, dy = y1 - y0;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / dist, ny = dx / dist;
    const count = 6;

    const key = `traj_${Phaser.Utils.String.UUID().slice(0, 6)}`;
    const g = this.scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(color, 1);
    g.fillCircle(2, 2, 2);
    g.generateTexture(key, 4, 4);
    g.destroy();

    for (let i = 0; i < count; i++) {
      const t = (i + 1) / (count + 1);
      const px = x0 + dx * t + nx * Phaser.Math.Between(-6, 6);
      const py = y0 + dy * t + ny * Phaser.Math.Between(-6, 6);
      this.scene.add.particles(px, py, key, {
        lifespan: 220,
        speed: 10,
        scale: { start: 0.8, end: 0 },
        alpha: { start: 0.6, end: 0 },
        tint: color,
        quantity: 1,
        frequency: -1,
        delay: i * 10
      });
    }

    this.scene.time.delayedCall(400, () => this.scene.textures.exists(key) && this.scene.textures.remove(key));
  }

  public destroy(fromScene?: boolean): void {
    if (this.rangeCircle) this.rangeCircle.destroy();
    if (this.digitalFlickerTween) this.digitalFlickerTween.stop();
    this.baseGraphics.destroy();
    this.topGraphics.destroy();
    this.beamLines?.destroy();
    super.destroy(fromScene);
  }
}
