import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const { width, height } = this.scale;
    this.createBackground(width, height);
    this.createSubmarine();
    this.createCreatures();
    this.createBubbles();
    this.createVentParticle();
    this.createUIAssets();
  }

  create(): void {
    this.scene.start('PlayScene');
    this.scene.launch('UIScene');
  }

  private createBackground(w: number, h: number): void {
    const bg = this.make.graphics({ x: 0, y: 0, add: false });
    for (let y = 0; y < h * 3; y += 2) {
      const t = y / (h * 3);
      const r = Math.floor(0 * (1 - t));
      const g = Math.floor(51 * (1 - t) + 17 * t);
      const b = Math.floor(102 * (1 - t) + 17 * t);
      bg.fillStyle(Phaser.Display.Color.GetColor(r, g, b), 1);
      bg.fillRect(0, y, w, 2);
    }
    bg.fillStyle(0xffffff, 0.15);
    bg.fillCircle(w / 2, 0, 200);
    bg.fillStyle(0xffffcc, 0.08);
    bg.fillCircle(w / 2, 0, 350);
    bg.generateTexture('deepBg', w, h * 3);
    bg.destroy();
  }

  private createSubmarine(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(40, 16, 0, 8, 0, 24);
    g.fillStyle(0xe0e0e0, 1);
    g.fillRoundedRect(5, 6, 28, 20, 6);
    g.fillStyle(0x88ccff, 0.5);
    g.fillRoundedRect(10, 9, 14, 10, 3);
    g.lineStyle(1.5, 0x00d4ff, 0.6);
    g.strokeRoundedRect(10, 9, 14, 10, 3);
    g.fillStyle(0xffe4b5, 0.25);
    g.beginPath();
    g.moveTo(40, 16);
    g.lineTo(130, 4);
    g.lineTo(130, 28);
    g.closePath();
    g.fillPath();
    g.lineStyle(1, 0xffe4b5, 0.3);
    g.beginPath();
    g.moveTo(40, 16);
    g.lineTo(130, 4);
    g.moveTo(40, 16);
    g.lineTo(130, 28);
    g.strokePath();
    g.generateTexture('submarine', 140, 32);
    g.destroy();

    const light = this.make.graphics({ x: 0, y: 0, add: false });
    light.fillStyle(0xffe4b5, 0.12);
    light.beginPath();
    light.moveTo(0, 40);
    light.lineTo(200, 0);
    light.lineTo(200, 80);
    light.closePath();
    light.fillPath();
    light.generateTexture('searchlight', 200, 80);
    light.destroy();
  }

  private createCreatures(): void {
    this.createClownfish();
    this.createJellyfish();
    this.createGlowingSquid();
    this.createAnglerfish();
    this.createSeaTurtle();
  }

  private createClownfish(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xff6600, 1);
    g.fillEllipse(16, 12, 28, 18);
    g.fillStyle(0xffffff, 1);
    g.fillRect(10, 3, 4, 18);
    g.fillRect(18, 5, 3, 14);
    g.fillStyle(0xff8833, 1);
    g.fillTriangle(28, 12, 36, 4, 36, 20);
    g.fillStyle(0x111111, 1);
    g.fillCircle(7, 10, 2.5);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(6.5, 9.5, 1);
    g.generateTexture('clownfish', 38, 24);
    g.destroy();

    const gs = this.make.graphics({ x: 0, y: 0, add: false });
    gs.fillStyle(0x555555, 0.4);
    gs.fillEllipse(16, 12, 28, 18);
    gs.fillTriangle(28, 12, 36, 4, 36, 20);
    gs.generateTexture('clownfish_silhouette', 38, 24);
    gs.destroy();
  }

  private createJellyfish(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xdd77cc, 0.5);
    g.fillEllipse(18, 14, 30, 22);
    g.fillStyle(0xff99ee, 0.3);
    g.fillEllipse(18, 12, 22, 14);
    g.lineStyle(1.5, 0xee88dd, 0.4);
    for (let i = 0; i < 5; i++) {
      const x = 6 + i * 6;
      g.beginPath();
      g.moveTo(x, 22);
      g.lineTo(x + 2, 32);
      g.lineTo(x - 1, 38);
      g.strokePath();
    }
    g.fillStyle(0xffaaff, 0.2);
    g.fillEllipse(18, 14, 14, 8);
    g.generateTexture('jellyfish', 36, 40);
    g.destroy();

    const gs = this.make.graphics({ x: 0, y: 0, add: false });
    gs.fillStyle(0x555555, 0.4);
    gs.fillEllipse(18, 14, 30, 22);
    gs.generateTexture('jellyfish_silhouette', 36, 40);
    gs.destroy();
  }

  private createGlowingSquid(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x1a1a6e, 1);
    g.fillEllipse(16, 14, 22, 24);
    g.fillStyle(0x2222aa, 0.8);
    g.fillRect(6, 24, 4, 12);
    g.fillRect(12, 24, 4, 14);
    g.fillRect(18, 24, 4, 12);
    g.fillRect(24, 24, 4, 10);
    g.fillStyle(0x44ffaa, 0.8);
    g.fillCircle(10, 10, 2);
    g.fillCircle(18, 8, 1.5);
    g.fillCircle(14, 16, 1.8);
    g.fillCircle(22, 14, 1.2);
    g.fillCircle(8, 18, 1);
    g.fillStyle(0x66ffcc, 0.5);
    g.fillCircle(10, 10, 4);
    g.fillCircle(18, 8, 3);
    g.generateTexture('glowing_squid', 32, 38);
    g.destroy();

    const gs = this.make.graphics({ x: 0, y: 0, add: false });
    gs.fillStyle(0x555555, 0.4);
    gs.fillEllipse(16, 14, 22, 24);
    gs.generateTexture('glowing_squid_silhouette', 32, 38);
    gs.destroy();
  }

  private createAnglerfish(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x3d2b1f, 1);
    g.fillEllipse(20, 18, 36, 24);
    g.fillStyle(0x4a3528, 1);
    g.fillTriangle(34, 14, 42, 8, 42, 22);
    g.fillStyle(0x2a1a10, 1);
    g.fillCircle(28, 10, 8);
    g.fillStyle(0xffff00, 1);
    g.fillCircle(28, 5, 4);
    g.fillStyle(0xffff88, 0.4);
    g.fillCircle(28, 5, 7);
    g.lineStyle(1, 0x665544, 0.8);
    g.beginPath();
    g.moveTo(20, 6);
    g.lineTo(28, 5);
    g.strokePath();
    g.fillStyle(0x111111, 1);
    g.fillCircle(14, 16, 3);
    g.fillStyle(0xffff44, 1);
    g.fillCircle(14.5, 15.5, 1.2);
    g.generateTexture('anglerfish', 44, 28);
    g.destroy();

    const gs = this.make.graphics({ x: 0, y: 0, add: false });
    gs.fillStyle(0x555555, 0.4);
    gs.fillEllipse(20, 18, 36, 24);
    gs.generateTexture('anglerfish_silhouette', 44, 28);
    gs.destroy();
  }

  private createSeaTurtle(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x4a7a4a, 1);
    g.fillEllipse(20, 18, 32, 26);
    g.fillStyle(0x3a6a3a, 0.8);
    g.fillEllipse(20, 18, 24, 18);
    g.fillStyle(0x5a8a5a, 1);
    g.fillEllipse(8, 12, 8, 5);
    g.fillEllipse(8, 24, 8, 5);
    g.fillEllipse(32, 12, 8, 5);
    g.fillEllipse(32, 24, 8, 5);
    g.fillStyle(0x6a9a5a, 1);
    g.fillEllipse(6, 18, 8, 6);
    g.fillStyle(0x111111, 1);
    g.fillCircle(5, 16, 1.5);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4.5, 15.5, 0.6);
    g.generateTexture('sea_turtle', 40, 30);
    g.destroy();

    const gs = this.make.graphics({ x: 0, y: 0, add: false });
    gs.fillStyle(0x555555, 0.4);
    gs.fillEllipse(20, 18, 32, 26);
    gs.generateTexture('sea_turtle_silhouette', 40, 30);
    gs.destroy();
  }

  private createBubbles(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x88ccff, 0.3);
    g.fillCircle(4, 4, 4);
    g.lineStyle(0.8, 0xaaddff, 0.5);
    g.strokeCircle(4, 4, 4);
    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(2.5, 2.5, 1.2);
    g.generateTexture('bubble', 8, 8);
    g.destroy();
  }

  private createVentParticle(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xff6600, 0.7);
    g.fillCircle(4, 4, 4);
    g.fillStyle(0xffaa33, 0.3);
    g.fillCircle(4, 4, 6);
    g.generateTexture('vent_particle', 8, 8);
    g.destroy();

    const g2 = this.make.graphics({ x: 0, y: 0, add: false });
    g2.fillStyle(0xff4400, 0.6);
    g2.fillCircle(3, 3, 3);
    g2.fillStyle(0xff8833, 0.25);
    g2.fillCircle(3, 3, 5);
    g2.generateTexture('vent_smoke', 6, 6);
    g2.destroy();
  }

  private createUIAssets(): void {
    const logIcon = this.make.graphics({ x: 0, y: 0, add: false });
    logIcon.fillStyle(0x00d4ff, 0.8);
    logIcon.fillRoundedRect(2, 2, 28, 34, 4);
    logIcon.fillStyle(0x003366, 0.8);
    logIcon.fillRoundedRect(5, 6, 22, 3, 1);
    logIcon.fillRoundedRect(5, 12, 18, 3, 1);
    logIcon.fillRoundedRect(5, 18, 20, 3, 1);
    logIcon.fillRoundedRect(5, 24, 16, 3, 1);
    logIcon.generateTexture('log_icon', 32, 38);
    logIcon.destroy();

    const collectSparkle = this.make.graphics({ x: 0, y: 0, add: false });
    collectSparkle.fillStyle(0x00d4ff, 0.9);
    collectSparkle.fillCircle(6, 6, 3);
    collectSparkle.fillStyle(0xffffff, 0.6);
    collectSparkle.fillCircle(6, 6, 1.5);
    collectSparkle.fillStyle(0x00d4ff, 0.3);
    collectSparkle.fillCircle(6, 6, 6);
    collectSparkle.generateTexture('collect_sparkle', 12, 12);
    collectSparkle.destroy();
  }
}
