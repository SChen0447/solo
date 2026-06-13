import Phaser from 'phaser';
import { GameConfig } from './main';
import { Scene_Main } from './Scene_Main';

export class Scene_UI extends Phaser.Scene {
  private depthDial!: Phaser.GameObjects.Container;
  private depthNeedle!: Phaser.GameObjects.Graphics;
  private depthText!: Phaser.GameObjects.Text;
  
  private oxygenBar!: Phaser.GameObjects.Graphics;
  private oxygenBarBg!: Phaser.GameObjects.Graphics;
  private oxygenText!: Phaser.GameObjects.Text;
  
  private scoreText!: Phaser.GameObjects.Text;
  private mineralCountText!: Phaser.GameObjects.Text;
  private scoreTween: Phaser.Tweens.Tween | null = null;
  
  private minimap!: Phaser.GameObjects.Container;
  private minimapCanvas!: Phaser.GameObjects.Graphics;
  private minimapSub!: Phaser.GameObjects.Graphics;
  private minimapMinerals: Phaser.GameObjects.Graphics[] = [];
  private minimapMask!: Phaser.GameObjects.Graphics;
  
  private mainScene!: Scene_Main;

  constructor() {
    super({ key: 'Scene_UI' });
  }

  create(): void {
    this.mainScene = this.scene.get('Scene_Main') as Scene_Main;
    
    this.createDepthDial();
    this.createOxygenBar();
    this.createScoreDisplay();
    this.createMinimap();
  }

  private createDepthDial(): void {
    this.depthDial = this.add.container(70, 70);
    this.depthDial.setScrollFactor(0);
    this.depthDial.setDepth(10);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x001122, 0.6);
    bg.lineStyle(2, 0x0066aa, 0.6);
    bg.beginPath();
    bg.arc(0, 0, 50, 0, Math.PI * 2);
    bg.closePath();
    bg.fillPath();
    bg.strokePath();
    this.depthDial.add(bg);
    
    const inner = this.add.graphics();
    inner.fillStyle(0x002244, 0.5);
    inner.beginPath();
    inner.arc(0, 0, 42, 0, Math.PI * 2);
    inner.closePath();
    inner.fillPath();
    this.depthDial.add(inner);
    
    const ticks = this.add.graphics();
    ticks.lineStyle(1.5, 0x64c8ff, 0.8);
    
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const innerR = i % 3 === 0 ? 32 : 36;
      const outerR = 42;
      
      ticks.beginPath();
      ticks.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
      ticks.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
      ticks.closePath();
      ticks.strokePath();
    }
    this.depthDial.add(ticks);
    
    this.depthNeedle = this.add.graphics();
    this.depthDial.add(this.depthNeedle);
    
    const center = this.add.graphics();
    center.fillStyle(0x64c8ff, 1);
    center.beginPath();
    center.arc(0, 0, 5, 0, Math.PI * 2);
    center.closePath();
    center.fillPath();
    this.depthDial.add(center);
    
    this.depthText = this.add.text(0, 20, '0m', {
      fontSize: '14px',
      fontFamily: 'Microsoft YaHei, sans-serif',
      color: '#64c8ff',
      stroke: '#001122',
      strokeThickness: 2
    });
    this.depthText.setOrigin(0.5);
    this.depthDial.add(this.depthText);
    
    const label = this.add.text(0, -28, '深度', {
      fontSize: '12px',
      fontFamily: 'Microsoft YaHei, sans-serif',
      color: '#88aacc'
    });
    label.setOrigin(0.5);
    this.depthDial.add(label);
  }

  private createOxygenBar(): void {
    const barWidth = 20;
    const barHeight = 180;
    const x = GameConfig.WIDTH - 40;
    const y = GameConfig.HEIGHT / 2;
    
    const panel = this.add.graphics();
    panel.fillStyle(0x001122, 0.6);
    panel.lineStyle(2, 0x0066aa, 0.6);
    panel.fillRoundedRect(x - 35, y - barHeight / 2 - 10, 70, barHeight + 20, 8);
    panel.strokeRoundedRect(x - 35, y - barHeight / 2 - 10, 70, barHeight + 20, 8);
    panel.setScrollFactor(0);
    panel.setDepth(10);
    
    this.oxygenBarBg = this.add.graphics();
    this.oxygenBarBg.fillStyle(0x002233, 0.8);
    this.oxygenBarBg.fillRoundedRect(x - barWidth / 2, y - barHeight / 2, barWidth, barHeight, 4);
    this.oxygenBarBg.setScrollFactor(0);
    this.oxygenBarBg.setDepth(11);
    
    this.oxygenBar = this.add.graphics();
    this.oxygenBar.setScrollFactor(0);
    this.oxygenBar.setDepth(12);
    
    this.oxygenText = this.add.text(x, y + barHeight / 2 + 15, '100%', {
      fontSize: '14px',
      fontFamily: 'Microsoft YaHei, sans-serif',
      color: '#00ffaa',
      stroke: '#001122',
      strokeThickness: 2
    });
    this.oxygenText.setOrigin(0.5);
    this.oxygenText.setScrollFactor(0);
    this.oxygenText.setDepth(13);
    
    const label = this.add.text(x, y - barHeight / 2 - 20, '氧气', {
      fontSize: '12px',
      fontFamily: 'Microsoft YaHei, sans-serif',
      color: '#88aacc'
    });
    label.setOrigin(0.5);
    label.setScrollFactor(0);
    label.setDepth(10);
  }

  private createScoreDisplay(): void {
    const x = GameConfig.WIDTH - 20;
    const y = 20;
    
    const panel = this.add.graphics();
    panel.fillStyle(0x001122, 0.6);
    panel.lineStyle(2, 0x0066aa, 0.6);
    panel.fillRoundedRect(x - 180, y - 10, 170, 70, 8);
    panel.strokeRoundedRect(x - 180, y - 10, 170, 70, 8);
    panel.setScrollFactor(0);
    panel.setDepth(10);
    
    this.scoreText = this.add.text(x - 20, y + 5, '0', {
      fontSize: '28px',
      fontFamily: 'Microsoft YaHei, sans-serif',
      color: '#ffd700',
      stroke: '#002244',
      strokeThickness: 3,
      align: 'right'
    });
    this.scoreText.setOrigin(1, 0);
    this.scoreText.setScrollFactor(0);
    this.scoreText.setDepth(11);
    
    const scoreLabel = this.add.text(x - 20, y - 3, '得分', {
      fontSize: '11px',
      fontFamily: 'Microsoft YaHei, sans-serif',
      color: '#88aacc'
    });
    scoreLabel.setOrigin(1, 1);
    scoreLabel.setScrollFactor(0);
    scoreLabel.setDepth(11);
    
    const mineralIcon = this.add.graphics();
    mineralIcon.fillStyle(0xff4444, 1);
    mineralIcon.lineStyle(1, 0xff6666, 1);
    mineralIcon.beginPath();
    mineralIcon.moveTo(0, -6);
    mineralIcon.lineTo(5, 0);
    mineralIcon.lineTo(0, 6);
    mineralIcon.lineTo(-5, 0);
    mineralIcon.closePath();
    mineralIcon.fillPath();
    mineralIcon.strokePath();
    mineralIcon.setPosition(x - 165, y + 45);
    mineralIcon.setScrollFactor(0);
    mineralIcon.setDepth(11);
    
    this.mineralCountText = this.add.text(x - 150, y + 45, '0', {
      fontSize: '16px',
      fontFamily: 'Microsoft YaHei, sans-serif',
      color: '#64c8ff',
      stroke: '#002244',
      strokeThickness: 2
    });
    this.mineralCountText.setOrigin(0, 0.5);
    this.mineralCountText.setScrollFactor(0);
    this.mineralCountText.setDepth(11);
  }

  private createMinimap(): void {
    const size = 200;
    const x = size / 2 + 20;
    const y = GameConfig.HEIGHT - size / 2 - 20;
    
    this.minimap = this.add.container(x, y);
    this.minimap.setScrollFactor(0);
    this.minimap.setDepth(10);
    
    const bg = this.add.graphics();
    bg.fillStyle(0x001122, 0.6);
    bg.lineStyle(2, 0x0066aa, 0.6);
    bg.beginPath();
    bg.arc(0, 0, size / 2, 0, Math.PI * 2);
    bg.closePath();
    bg.fillPath();
    bg.strokePath();
    this.minimap.add(bg);
    
    this.minimapCanvas = this.add.graphics();
    this.minimap.add(this.minimapCanvas);
    
    this.minimapSub = this.add.graphics();
    this.minimapSub.fillStyle(0x00ff00, 1);
    this.minimapSub.beginPath();
    this.minimapSub.arc(0, 0, 4, 0, Math.PI * 2);
    this.minimapSub.closePath();
    this.minimapSub.fillPath();
    this.minimap.add(this.minimapSub);
    
    this.minimapMask = this.add.graphics();
    this.minimapMask.beginPath();
    this.minimapMask.arc(0, 0, size / 2 - 5, 0, Math.PI * 2);
    this.minimapMask.closePath();
    this.minimapMask.fillPath();
    
    const maskGeometry = this.make.graphics({ x: 0, y: 0, add: false });
    maskGeometry.fillStyle(0xffffff);
    maskGeometry.beginPath();
    maskGeometry.arc(x, y, size / 2 - 5, 0, Math.PI * 2);
    maskGeometry.closePath();
    maskGeometry.fillPath();
    
    const mask = maskGeometry.createGeometryMask();
    this.minimapCanvas.setMask(mask);
    this.minimapSub.setMask(mask);
    
    const label = this.add.text(0, -size / 2 + 15, '小地图', {
      fontSize: '11px',
      fontFamily: 'Microsoft YaHei, sans-serif',
      color: '#88aacc'
    });
    label.setOrigin(0.5);
    this.minimap.add(label);
  }

  update(time: number, delta: number): void {
    if (!this.mainScene || !this.mainScene.gameStarted || this.mainScene.gameOver) return;
    
    const dt = delta / 1000;
    
    this.updateDepthDial();
    this.updateOxygenBar(dt);
    this.updateScoreDisplay();
    this.updateMinimap();
  }

  private updateDepthDial(): void {
    const depth = this.mainScene.depth;
    const maxDepth = 2500;
    const progress = Math.min(depth / maxDepth, 1);
    
    const angle = -Math.PI / 2 + progress * Math.PI * 2;
    
    this.depthNeedle.clear();
    this.depthNeedle.lineStyle(2, 0xff6b6b, 1);
    this.depthNeedle.fillStyle(0xff6b6b, 1);
    this.depthNeedle.beginPath();
    this.depthNeedle.moveTo(0, 0);
    this.depthNeedle.lineTo(Math.cos(angle) * 30, Math.sin(angle) * 30);
    this.depthNeedle.closePath();
    this.depthNeedle.strokePath();
    
    this.depthNeedle.beginPath();
    this.depthNeedle.moveTo(Math.cos(angle - 0.3) * 8, Math.sin(angle - 0.3) * 8);
    this.depthNeedle.lineTo(Math.cos(angle) * 32, Math.sin(angle) * 32);
    this.depthNeedle.lineTo(Math.cos(angle + 0.3) * 8, Math.sin(angle + 0.3) * 8);
    this.depthNeedle.closePath();
    this.depthNeedle.fillPath();
    
    this.depthText.setText(`${Math.floor(depth)}m`);
  }

  private updateOxygenBar(dt: number): void {
    const oxygen = this.mainScene.oxygen;
    const barWidth = 20;
    const barHeight = 180;
    const x = GameConfig.WIDTH - 40;
    const y = GameConfig.HEIGHT / 2;
    
    const fillHeight = (oxygen / 100) * barHeight;
    const fillY = y + barHeight / 2 - fillHeight;
    
    this.oxygenBar.clear();
    
    const gradientColors = oxygen > 50 
      ? [0x00ffaa, 0x00cc88]
      : oxygen > 25
        ? [0xffaa00, 0xff8800]
        : [0xff4444, 0xff2222];
    
    this.oxygenBar.fillStyle(gradientColors[0], 1);
    this.oxygenBar.fillRoundedRect(x - barWidth / 2, fillY, barWidth, fillHeight, 4);
    
    const midY = fillY + fillHeight / 2;
    this.oxygenBar.fillStyle(gradientColors[1], 0.7);
    this.oxygenBar.fillRect(x - barWidth / 2, midY, barWidth, fillHeight / 2);
    
    this.oxygenText.setText(`${Math.floor(oxygen)}%`);
    
    const textColor = oxygen > 50 ? '#00ffaa' : oxygen > 25 ? '#ffaa00' : '#ff4444';
    this.oxygenText.setColor(textColor);
    
    if (oxygen <= 25) {
      const flash = Math.sin(this.time.now / 100) > 0;
      this.oxygenBar.setAlpha(flash ? 1 : 0.5);
      this.oxygenText.setAlpha(flash ? 1 : 0.7);
    } else {
      this.oxygenBar.setAlpha(1);
      this.oxygenText.setAlpha(1);
    }
  }

  private updateScoreDisplay(): void {
    this.scoreText.setText(this.mainScene.score.toString());
    this.mineralCountText.setText(this.mainScene.mineralCount.toString());
  }

  public triggerScoreAnimation(score: number): void {
    if (this.scoreTween) {
      this.scoreTween.remove();
    }
    
    this.scoreText.setScale(1.5);
    
    this.scoreTween = this.tweens.add({
      targets: this.scoreText,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut'
    });
    
    this.scoreText.setColor('#ffffff');
    this.time.delayedCall(100, () => {
      this.scoreText.setColor('#ffd700');
    });
  }

  private updateMinimap(): void {
    const size = 190;
    const halfSize = size / 2;
    
    this.minimapCanvas.clear();
    
    const subY = this.mainScene.submarine.y;
    const viewHeight = 800;
    const viewTop = subY - viewHeight / 2;
    const viewBottom = subY + viewHeight / 2;
    
    const scaleY = size / viewHeight;
    const scaleX = (size - 20) / GameConfig.WIDTH;
    
    this.minimapCanvas.fillStyle(0x1a3a5a, 0.6);
    this.minimapCanvas.beginPath();
    
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const worldY = viewTop + t * viewHeight;
      const bounds = this.mainScene.getCanyonBoundsAtY(worldY);
      
      const leftX = (bounds.left * scaleX) - halfSize + 10;
      const rightX = (bounds.right * scaleX) - halfSize + 10;
      const mapY = t * size - halfSize;
      
      if (i === 0) {
        this.minimapCanvas.moveTo(leftX, mapY);
      } else {
        this.minimapCanvas.lineTo(leftX, mapY);
      }
    }
    
    for (let i = 20; i >= 0; i--) {
      const t = i / 20;
      const worldY = viewTop + t * viewHeight;
      const bounds = this.mainScene.getCanyonBoundsAtY(worldY);
      
      const rightX = (bounds.right * scaleX) - halfSize + 10;
      const mapY = t * size - halfSize;
      
      this.minimapCanvas.lineTo(rightX, mapY);
    }
    
    this.minimapCanvas.closePath();
    this.minimapCanvas.fillPath();
    
    const minerals = this.mainScene.getMineralPositions();
    
    for (const m of minerals) {
      if (m.y < viewTop || m.y > viewBottom) continue;
      
      const mapX = (m.x * scaleX) - halfSize + 10;
      const mapY = ((m.y - viewTop) * scaleY) - halfSize;
      
      const pulse = 0.7 + 0.3 * Math.sin(this.time.now / 200 + m.x * 0.01);
      
      this.minimapCanvas.fillStyle(m.color, pulse);
      this.minimapCanvas.beginPath();
      this.minimapCanvas.arc(mapX, mapY, 2, 0, Math.PI * 2);
      this.minimapCanvas.closePath();
      this.minimapCanvas.fillPath();
    }
    
    const subMapY = size / 2 - halfSize;
    const subMapX = (this.mainScene.submarine.x * scaleX) - halfSize + 10;
    this.minimapSub.setPosition(subMapX, subMapY);
  }
}
