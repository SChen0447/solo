import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, TRACK, COLORS, CHARIOT, PARTICLES,
  GATE, HUD, PLAYER1_KEYS, PLAYER2_KEYS
} from '../utils/constants';

interface ChariotData {
  sprite: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Graphics;
  speed: number;
  prevX: number;
  prevY: number;
  prevAngle: number;
  angle: number;
  laps: number;
  lastGateAngle: number;
  hasPassedHalf: boolean;
  slowdownTimer: number;
  flashTimer: number;
  collisionCooldown: number;
  displayLap: number;
  lapScrollTimer: number;
  dustAccum: number;
  trailAccum: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  alpha: number;
}

export class RaceScene extends Phaser.Scene {
  private trackTexture!: Phaser.GameObjects.Graphics;
  private audienceParticles: Particle[] = [];
  private tireMarks: Phaser.GameObjects.Graphics[] = [];
  private dustParticles: Particle[] = [];
  private shockwaves: { x: number; y: number; radius: number; maxRadius: number; life: number; maxLife: number }[] = [];
  private chariots: ChariotData[] = [];
  private collisions: number = 0;
  private displayCollisions: number = 0;
  private collisionScrollTimer: number = 0;
  private gate!: Phaser.GameObjects.Graphics;
  private gateFlashTimer: number = 0;
  private pillars: Phaser.GameObjects.Container[] = [];
  private hudTop!: Phaser.GameObjects.Container;
  private hudRight!: Phaser.GameObjects.Container;
  private rankTexts: Phaser.GameObjects.Text[] = [];
  private lapTexts: Phaser.GameObjects.Text[] = [];
  private collisionText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'RaceScene' });
  }

  preload(): void {}

  create(): void {
    this.createTrack();
    this.createPillars();
    this.createGate();
    this.createChariots();
    this.createHUD();
    this.initAudio();
  }

  private createTrack(): void {
    const track = this.add.graphics();
    track.fillStyle(COLORS.SAND_DARK, 1);
    track.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    track.fillStyle(COLORS.SAND_TRACK, 1);
    track.beginPath();
    track.ellipse(TRACK.CENTER_X, TRACK.CENTER_Y, TRACK.OUTER_RADIUS_X, TRACK.OUTER_RADIUS_Y, 0, 0, Math.PI * 2);
    track.fillPath();

    track.fillStyle(COLORS.SAND_DARK, 1);
    track.beginPath();
    track.ellipse(TRACK.CENTER_X, TRACK.CENTER_Y, TRACK.INNER_RADIUS_X, TRACK.INNER_RADIUS_Y, 0, 0, Math.PI * 2);
    track.fillPath();

    track.lineStyle(3, COLORS.BRICK_RED, 0.6);
    track.beginPath();
    track.ellipse(TRACK.CENTER_X, TRACK.CENTER_Y, TRACK.OUTER_RADIUS_X, TRACK.OUTER_RADIUS_Y, 0, 0, Math.PI * 2);
    track.strokePath();
    track.beginPath();
    track.ellipse(TRACK.CENTER_X, TRACK.CENTER_Y, TRACK.INNER_RADIUS_X, TRACK.INNER_RADIUS_Y, 0, 0, Math.PI * 2);
    track.strokePath();

    for (let i = 0; i < 150; i++) {
      const angle = Math.random() * Math.PI * 2;
      const t = Math.random();
      const rX = Phaser.Math.Linear(TRACK.INNER_RADIUS_X + 10, TRACK.OUTER_RADIUS_X - 10, t);
      const rY = Phaser.Math.Linear(TRACK.INNER_RADIUS_Y + 10, TRACK.OUTER_RADIUS_Y - 10, t);
      const x = TRACK.CENTER_X + Math.cos(angle) * rX;
      const y = TRACK.CENTER_Y + Math.sin(angle) * rY;
      const mark = this.add.graphics();
      mark.fillStyle(COLORS.TIRE_MARK, Phaser.Math.FloatBetween(0.15, 0.45));
      mark.fillEllipse(x, y, Phaser.Math.Between(3, 8), Phaser.Math.Between(8, 18));
      mark.rotation = angle + Math.PI / 2 + Phaser.Math.FloatBetween(-0.3, 0.3);
      this.tireMarks.push(mark);
    }

    this.trackTexture = track;
  }

  private createPillars(): void {
    const positions = [
      { angle: -Math.PI / 2, inner: false },
      { angle: 0, inner: false },
      { angle: Math.PI / 2, inner: false },
      { angle: Math.PI, inner: false }
    ];

    positions.forEach(pos => {
      const x = TRACK.CENTER_X + Math.cos(pos.angle) * (TRACK.OUTER_RADIUS_X + 30);
      const y = TRACK.CENTER_Y + Math.sin(pos.angle) * (TRACK.OUTER_RADIUS_Y + 30);
      const pillar = this.add.container(x, y);

      const base = this.add.graphics();
      base.fillStyle(COLORS.BRICK_RED_DARK, 1);
      base.fillRect(-18, 10, 36, 14);
      base.fillStyle(COLORS.BRICK_RED, 1);
      base.fillRect(-22, -22, 44, 32);
      base.fillStyle(COLORS.GOLD, 1);
      base.fillRect(-20, -26, 40, 8);
      base.fillStyle(COLORS.BRICK_RED, 1);
      base.fillRect(-16, -44, 32, 20);
      base.lineStyle(2, COLORS.GOLD, 0.5);
      base.strokeRect(-22, -22, 44, 32);
      pillar.add(base);

      this.pillars.push(pillar);
    });

    this.audienceParticles = [];
  }

  private createGate(): void {
    const gate = this.add.graphics();
    gate.setDepth(5);
    this.gate = gate;
    this.updateGate();
  }

  private updateGate(): void {
    this.gate.clear();
    const angle = TRACK.START_ANGLE;
    const perpAngle = angle + Math.PI / 2;
    const midR = (TRACK.INNER_RADIUS_X + TRACK.OUTER_RADIUS_X) / 2;
    const midR_Y = (TRACK.INNER_RADIUS_Y + TRACK.OUTER_RADIUS_Y) / 2;
    const cx = TRACK.CENTER_X + Math.cos(angle) * midR;
    const cy = TRACK.CENTER_Y + Math.sin(angle) * midR_Y;
    const halfW = (TRACK.OUTER_RADIUS_X - TRACK.INNER_RADIUS_X) / 2;
    const halfH = (TRACK.OUTER_RADIUS_Y - TRACK.INNER_RADIUS_Y) / 2;

    const flashAlpha = this.gateFlashTimer > 0
      ? Phaser.Math.Easing.Sine.Out(this.gateFlashTimer / GATE.FLASH_DURATION) * 0.8 + GATE.ALPHA
      : GATE.ALPHA;

    this.gate.save();
    this.gate.translateCanvas(cx, cy);
    this.gate.rotateCanvas(angle);

    this.gate.fillStyle(COLORS.GOLD_LIGHT, flashAlpha * 0.25);
    this.gate.fillRect(-halfW, -halfH, halfW * 2, halfH * 2);

    this.gate.lineStyle(6, this.gateFlashTimer > 0 ? COLORS.GOLD_LIGHT : COLORS.GOLD, flashAlpha * 1.5);
    this.gate.strokeRect(-halfW, -halfH, halfW * 2, halfH * 2);

    this.gate.lineStyle(2, COLORS.GOLD_LIGHT, flashAlpha * 0.8);
    for (let i = -halfW + 20; i < halfW; i += 40) {
      this.gate.lineBetween(i, -halfH, i, halfH);
    }
    for (let j = -halfH + 20; j < halfH; j += 40) {
      this.gate.lineBetween(-halfW, j, halfW, j);
    }

    this.gate.restore();
  }

  private createChariots(): void {
    const createChariot = (color: number, id: number): ChariotData => {
      const angle = TRACK.START_ANGLE + (id === 0 ? 0.08 : -0.08);
      const rX = (TRACK.INNER_RADIUS_X + TRACK.OUTER_RADIUS_X) / 2 + (id === 0 ? 50 : -50);
      const rY = (TRACK.INNER_RADIUS_Y + TRACK.OUTER_RADIUS_Y) / 2 + (id === 0 ? 30 : -30);
      const x = TRACK.CENTER_X + Math.cos(angle) * rX;
      const y = TRACK.CENTER_Y + Math.sin(angle) * rY;

      const container = this.add.container(x, y);
      container.setDepth(10);

      const gfx = this.add.graphics();
      const bodyW = 46;
      const bodyH = 28;

      gfx.fillStyle(COLORS.PARCHMENT_DARK, 1);
      gfx.fillEllipse(-bodyW * 0.3, 0, bodyW * 0.5, bodyH * 0.6);
      gfx.fillStyle(COLORS.BRICK_RED_DARK, 1);
      gfx.fillEllipse(-bodyW * 0.3, 0, bodyW * 0.4, bodyH * 0.45);

      gfx.fillStyle(COLORS.PARCHMENT, 1);
      gfx.fillRect(-bodyW * 0.1, -bodyH / 2, bodyW * 0.6, bodyH);
      gfx.fillStyle(color, 1);
      gfx.fillRect(-bodyW * 0.05, -bodyH / 2 + 4, bodyW * 0.5, bodyH - 8);

      gfx.lineStyle(2, COLORS.GOLD, 1);
      gfx.strokeRect(-bodyW * 0.1, -bodyH / 2, bodyW * 0.6, bodyH);

      gfx.fillStyle(COLORS.GOLD, 1);
      gfx.fillCircle(bodyW * 0.5, 0, 6);

      gfx.fillStyle(COLORS.SAND_DARK, 1);
      gfx.fillCircle(bodyW * 0.15, -bodyH / 2 - 6, 7);
      gfx.fillCircle(bodyW * 0.15, bodyH / 2 + 6, 7);
      gfx.lineStyle(2, COLORS.GOLD, 0.8);
      gfx.strokeCircle(bodyW * 0.15, -bodyH / 2 - 6, 7);
      gfx.strokeCircle(bodyW * 0.15, bodyH / 2 + 6, 7);

      gfx.fillStyle(0x2a1810, 1);
      gfx.fillCircle(bodyW * 0.15, -bodyH / 2 - 6, 2);
      gfx.fillCircle(bodyW * 0.15, bodyH / 2 + 6, 2);

      const label = this.add.text(bodyW * 0.25, 0, `P${id + 1}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      container.add(gfx);
      container.add(label);

      container.rotation = angle + Math.PI / 2;

      return {
        sprite: container,
        body: gfx,
        speed: 0,
        prevX: x,
        prevY: y,
        prevAngle: container.rotation,
        angle: container.rotation,
        laps: 0,
        lastGateAngle: angle,
        hasPassedHalf: false,
        slowdownTimer: 0,
        flashTimer: 0,
        collisionCooldown: 0,
        displayLap: 0,
        lapScrollTimer: 0,
        dustAccum: 0,
        trailAccum: 0
      };
    };

    this.chariots.push(createChariot(COLORS.PLAYER1, 0));
    this.chariots.push(createChariot(COLORS.PLAYER2, 1));
  }

  private createHUD(): void {
    this.hudTop = this.add.container(0, 0);
    this.hudTop.setDepth(50);
    this.hudTop.setScrollFactor(0);

    const topBg = this.add.graphics();
    topBg.fillStyle(COLORS.PARCHMENT, 0.92);
    topBg.fillRect(0, 0, GAME_WIDTH, HUD.TOP_BAR_HEIGHT);
    topBg.lineStyle(3, COLORS.BRICK_RED, 1);
    topBg.lineBetween(0, HUD.TOP_BAR_HEIGHT, GAME_WIDTH, HUD.TOP_BAR_HEIGHT);
    topBg.lineStyle(5, COLORS.GOLD, 1);
    topBg.lineBetween(0, 0, GAME_WIDTH, 0);

    this.addParchmentTexture(topBg, 0, 0, GAME_WIDTH, HUD.TOP_BAR_HEIGHT);
    this.hudTop.add(topBg);

    const title = this.add.text(GAME_WIDTH / 2, HUD.TOP_BAR_HEIGHT / 2, '⚔ LUDUS CIRCENSIS · 战车大赛 ⚔', {
      fontFamily: 'Georgia, serif',
      fontSize: '22px',
      color: '#5c1a00',
      fontStyle: 'bold',
      stroke: '#c9a227',
      strokeThickness: 1
    }).setOrigin(0.5);
    this.hudTop.add(title);

    const collisionLabel = this.add.text(30, HUD.TOP_BAR_HEIGHT / 2, '碰撞次数:', {
      fontFamily: 'Georgia, serif',
      fontSize: '18px',
      color: '#5c1a00',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.hudTop.add(collisionLabel);

    this.collisionText = this.add.text(30 + collisionLabel.width + 10, HUD.TOP_BAR_HEIGHT / 2, '0', {
      fontFamily: 'Georgia, serif',
      fontSize: '26px',
      color: '#8b2500',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.hudTop.add(this.collisionText);

    const p1Label = this.add.text(GAME_WIDTH - 260, HUD.TOP_BAR_HEIGHT / 2, 'P1:WASD', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#dc143c',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    const p2Label = this.add.text(GAME_WIDTH - 140, HUD.TOP_BAR_HEIGHT / 2, 'P2:↑↓←→', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#1e90ff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.hudTop.add(p1Label);
    this.hudTop.add(p2Label);

    this.hudRight = this.add.container(GAME_WIDTH - HUD.RIGHT_PANEL_WIDTH - 10, HUD.TOP_BAR_HEIGHT + 20);
    this.hudRight.setDepth(50);
    this.hudRight.setScrollFactor(0);

    const rightBg = this.add.graphics();
    const panelH = 300;
    rightBg.fillStyle(COLORS.PARCHMENT, 0.95);
    rightBg.fillRect(0, 0, HUD.RIGHT_PANEL_WIDTH, panelH);
    rightBg.lineStyle(4, COLORS.BRICK_RED, 1);
    rightBg.strokeRect(0, 0, HUD.RIGHT_PANEL_WIDTH, panelH);
    rightBg.lineStyle(2, COLORS.GOLD, 1);
    rightBg.strokeRect(4, 4, HUD.RIGHT_PANEL_WIDTH - 8, panelH - 8);
    this.addParchmentTexture(rightBg, 0, 0, HUD.RIGHT_PANEL_WIDTH, panelH);
    this.hudRight.add(rightBg);

    const rankTitle = this.add.text(HUD.RIGHT_PANEL_WIDTH / 2, 20, '🏆 实时排名', {
      fontFamily: 'Georgia, serif',
      fontSize: '20px',
      color: '#5c1a00',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.hudRight.add(rankTitle);

    const sepLine = this.add.graphics();
    sepLine.lineStyle(2, COLORS.GOLD, 0.6);
    sepLine.lineBetween(20, 40, HUD.RIGHT_PANEL_WIDTH - 20, 40);
    this.hudRight.add(sepLine);

    for (let i = 0; i < 2; i++) {
      const y = 65 + i * 110;

      const pLabel = this.add.text(20, y, `玩家${i + 1}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: i === 0 ? '#dc143c' : '#1e90ff',
        fontStyle: 'bold'
      }).setOrigin(0, 0);
      this.hudRight.add(pLabel);

      const lapLabel = this.add.text(20, y + 28, '圈数: ', {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: '#5c1a00'
      }).setOrigin(0, 0);
      this.hudRight.add(lapLabel);

      const lapText = this.add.text(20 + lapLabel.width + 4, y + 28, `0 / ${TRACK.TOTAL_LAPS}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '20px',
        color: '#8b2500',
        fontStyle: 'bold'
      }).setOrigin(0, 0);
      this.lapTexts.push(lapText);
      this.hudRight.add(lapText);

      const rankLabel = this.add.text(20, y + 60, '排名: ', {
        fontFamily: 'Georgia, serif',
        fontSize: '14px',
        color: '#5c1a00'
      }).setOrigin(0, 0);
      this.hudRight.add(rankLabel);

      const rankText = this.add.text(20 + rankLabel.width + 4, y + 58, '--', {
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        color: '#c9a227',
        fontStyle: 'bold'
      }).setOrigin(0, 0);
      this.rankTexts.push(rankText);
      this.hudRight.add(rankText);
    }
  }

  private addParchmentTexture(gfx: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
    gfx.fillStyle(0x000000, 0.03);
    for (let i = 0; i < 40; i++) {
      const rx = Phaser.Math.Between(x, x + w);
      const ry = Phaser.Math.Between(y, y + h);
      const r = Phaser.Math.FloatBetween(0.5, 2.5);
      gfx.fillCircle(rx, ry, r);
    }
    gfx.fillStyle(0x8b7355, 0.05);
    for (let i = 0; i < 15; i++) {
      const rx = Phaser.Math.Between(x, x + w);
      const ry = Phaser.Math.Between(y, y + h);
      gfx.fillEllipse(rx, ry, Phaser.Math.FloatBetween(8, 20), Phaser.Math.FloatBetween(2, 6));
    }
  }

  private initAudio(): void {
    if (!this.sound) return;
    try {
      this.sound.add('lap', { volume: 0.6 });
    } catch {}
  }

  private playLapSound(): void {
    if (!this.sound) return;
    try {
      const ctx = (this.sound as any).context as AudioContext;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
      osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }

  private playCollisionSound(): void {
    if (!this.sound) return;
    try {
      const ctx = (this.sound as any).context as AudioContext;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  }

  private isOnTrack(x: number, y: number): boolean {
    const dx = (x - TRACK.CENTER_X) / TRACK.OUTER_RADIUS_X;
    const dy = (y - TRACK.CENTER_Y) / TRACK.OUTER_RADIUS_Y;
    const outer = dx * dx + dy * dy;
    const dx2 = (x - TRACK.CENTER_X) / TRACK.INNER_RADIUS_X;
    const dy2 = (y - TRACK.CENTER_Y) / TRACK.INNER_RADIUS_Y;
    const inner = dx2 * dx2 + dy2 * dy2;
    return outer <= 1 && inner >= 1;
  }

  private clampToTrack(ch: ChariotData): void {
    const dx = ch.sprite.x - TRACK.CENTER_X;
    const dy = ch.sprite.y - TRACK.CENTER_Y;
    const ox = dx / TRACK.OUTER_RADIUS_X;
    const oy = dy / TRACK.OUTER_RADIUS_Y;
    const outerD2 = ox * ox + oy * oy;
    if (outerD2 > 1) {
      const sc = 1 / Math.sqrt(outerD2);
      ch.sprite.x = TRACK.CENTER_X + dx * sc * 0.98;
      ch.sprite.y = TRACK.CENTER_Y + dy * sc * 0.98;
      ch.speed *= 0.6;
    }
    const ix = dx / TRACK.INNER_RADIUS_X;
    const iy = dy / TRACK.INNER_RADIUS_Y;
    const innerD2 = ix * ix + iy * iy;
    if (innerD2 < 1) {
      const sc = 1 / Math.sqrt(innerD2);
      ch.sprite.x = TRACK.CENTER_X + dx * sc * 1.02;
      ch.sprite.y = TRACK.CENTER_Y + dy * sc * 1.02;
      ch.speed *= 0.6;
    }
  }

  private emitDust(x: number, y: number, angle: number, speed: number, drifting: boolean): void {
    if (this.dustParticles.length >= PARTICLES.MAX_COUNT) return;
    const count = drifting ? 3 : 1;
    for (let i = 0; i < count; i++) {
      const spread = drifting ? 0.8 : 0.3;
      const a = angle + Math.PI + Phaser.Math.FloatBetween(-spread, spread);
      const s = speed * 0.3 + Phaser.Math.FloatBetween(10, 30);
      this.dustParticles.push({
        x: x + Phaser.Math.FloatBetween(-6, 6),
        y: y + Phaser.Math.FloatBetween(-6, 6),
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: PARTICLES.DUST_LIFESPAN,
        maxLife: PARTICLES.DUST_LIFESPAN,
        size: Phaser.Math.FloatBetween(3, drifting ? 10 : 6),
        color: COLORS.DUST,
        alpha: drifting ? 0.7 : 0.45
      });
    }
  }

  private emitTireTrail(x: number, y: number, angle: number): void {
    if (this.tireMarks.length >= PARTICLES.MAX_COUNT) {
      const old = this.tireMarks.shift();
      if (old) old.destroy();
    }
    const mark = this.add.graphics();
    mark.fillStyle(COLORS.TIRE_TRAIL, 0.35);
    mark.fillEllipse(0, 0, 5, 14);
    mark.x = x;
    mark.y = y;
    mark.rotation = angle;
    mark.setDepth(2);
    this.tireMarks.push(mark);
    this.time.delayedCall(PARTICLES.TIRE_TRAIL_LIFESPAN, () => {
      const idx = this.tireMarks.indexOf(mark);
      if (idx >= 0) {
        this.tireMarks.splice(idx, 1);
        mark.destroy();
      }
    });
  }

  private emitAudience(): void {
    if (this.audienceParticles.length >= 50) return;
    const side = Phaser.Math.Between(0, 3);
    let x = 0, y = 0;
    const margin = 40;
    switch (side) {
      case 0: x = Phaser.Math.Between(margin, GAME_WIDTH - margin); y = Phaser.Math.Between(10, 50); break;
      case 1: x = GAME_WIDTH - Phaser.Math.Between(10, 30); y = Phaser.Math.Between(margin, GAME_HEIGHT - margin); break;
      case 2: x = Phaser.Math.Between(margin, GAME_WIDTH - margin); y = GAME_HEIGHT - Phaser.Math.Between(10, 30); break;
      case 3: x = Phaser.Math.Between(10, 30); y = Phaser.Math.Between(margin, GAME_HEIGHT - margin); break;
    }
    this.audienceParticles.push({
      x, y,
      vx: Phaser.Math.FloatBetween(-15, 15),
      vy: Phaser.Math.FloatBetween(-40, -10),
      life: PARTICLES.AUDIENCE_LIFESPAN,
      maxLife: PARTICLES.AUDIENCE_LIFESPAN,
      size: Phaser.Math.FloatBetween(2, 4),
      color: [COLORS.BRICK_RED, COLORS.GOLD, COLORS.WHITE, COLORS.PLAYER1, COLORS.PLAYER2][Phaser.Math.Between(0, 4)],
      alpha: 0.9
    });
  }

  private createShockwave(x: number, y: number): void {
    this.shockwaves.push({
      x, y,
      radius: 5,
      maxRadius: 120,
      life: PARTICLES.SHOCKWAVE_LIFESPAN,
      maxLife: PARTICLES.SHOCKWAVE_LIFESPAN
    });
    this.playCollisionSound();
  }

  private checkCollision(c1: ChariotData, c2: ChariotData): boolean {
    const dx = c1.sprite.x - c2.sprite.x;
    const dy = c1.sprite.y - c2.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < CHARIOT.COLLISION_RADIUS * 2;
  }

  private handleCollision(c1: ChariotData, c2: ChariotData): void {
    const dx = c1.sprite.x - c2.sprite.x;
    const dy = c1.sprite.y - c2.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = CHARIOT.COLLISION_RADIUS * 2 - dist;
    c1.sprite.x += nx * overlap * 0.5;
    c1.sprite.y += ny * overlap * 0.5;
    c2.sprite.x -= nx * overlap * 0.5;
    c2.sprite.y -= ny * overlap * 0.5;

    const relSpeed = Math.abs(c1.speed) + Math.abs(c2.speed);
    c1.speed += relSpeed * 0.2;
    c2.speed += relSpeed * 0.2;

    const midX = (c1.sprite.x + c2.sprite.x) / 2;
    const midY = (c1.sprite.y + c2.sprite.y) / 2;
    this.createShockwave(midX, midY);

    c1.slowdownTimer = CHARIOT.SLOWDOWN_DURATION;
    c1.flashTimer = CHARIOT.FLASH_DURATION;
    c1.collisionCooldown = CHARIOT.COLLISION_COOLDOWN;
    c2.slowdownTimer = CHARIOT.SLOWDOWN_DURATION;
    c2.flashTimer = CHARIOT.FLASH_DURATION;
    c2.collisionCooldown = CHARIOT.COLLISION_COOLDOWN;

    this.collisions++;
    this.collisionScrollTimer = HUD.SCROLL_DURATION;
  }

  private checkLap(ch: ChariotData, index: number): void {
    const dx = ch.sprite.x - TRACK.CENTER_X;
    const dy = ch.sprite.y - TRACK.CENTER_Y;
    let currentAngle = Math.atan2(dy, dx);

    if (currentAngle > 0 && ch.lastGateAngle < 0 && !ch.hasPassedHalf) {
      ch.hasPassedHalf = true;
    }

    if (ch.hasPassedHalf && Math.abs(currentAngle - TRACK.START_ANGLE) < 0.3 &&
        (ch.lastGateAngle - TRACK.START_ANGLE) * (currentAngle - TRACK.START_ANGLE) < 0) {
      ch.laps++;
      ch.hasPassedHalf = false;
      ch.lapScrollTimer = HUD.SCROLL_DURATION;
      this.gateFlashTimer = GATE.FLASH_DURATION;
      this.playLapSound();
    }
    ch.lastGateAngle = currentAngle;
  }

  private updateChariot(ch: ChariotData, index: number, keys: any, delta: number): void {
    const dt = delta / 1000;
    ch.prevX = ch.sprite.x;
    ch.prevY = ch.sprite.y;
    ch.prevAngle = ch.sprite.rotation;

    let turnDir = 0;
    if (this.input.keyboard?.addKey(keys.LEFT).isDown) turnDir -= 1;
    if (this.input.keyboard?.addKey(keys.RIGHT).isDown) turnDir += 1;

    let accel = 0;
    if (this.input.keyboard?.addKey(keys.UP).isDown) accel += 1;
    if (this.input.keyboard?.addKey(keys.DOWN).isDown) accel -= 1;

    const speedFactor = ch.slowdownTimer > 0 ? CHARIOT.SLOWDOWN_FACTOR : 1;
    ch.speed += accel * CHARIOT.ACCELERATION * dt * speedFactor;
    ch.speed *= CHARIOT.FRICTION;

    const absSpeed = Math.abs(ch.speed);
    if (ch.speed > CHARIOT.MAX_SPEED) ch.speed = CHARIOT.MAX_SPEED;
    if (ch.speed < CHARIOT.MIN_SPEED) ch.speed = CHARIOT.MIN_SPEED;

    if (absSpeed > 10 && turnDir !== 0) {
      ch.angle += turnDir * CHARIOT.TURN_SPEED * dt * (absSpeed / CHARIOT.MAX_SPEED);
    }

    const drifting = absSpeed > 100 && turnDir !== 0;
    const moveAngle = drifting ? ch.angle + turnDir * 0.2 * (absSpeed / CHARIOT.MAX_SPEED) : ch.angle;

    ch.sprite.x += Math.cos(moveAngle - Math.PI / 2) * ch.speed * dt;
    ch.sprite.y += Math.sin(moveAngle - Math.PI / 2) * ch.speed * dt;

    ch.sprite.rotation = Phaser.Math.Linear(ch.sprite.rotation, ch.angle, CHARIOT.INTERPOLATION_ALPHA * Math.min(1, dt * 60));

    this.clampToTrack(ch);

    if (ch.slowdownTimer > 0) ch.slowdownTimer -= delta;
    if (ch.flashTimer > 0) ch.flashTimer -= delta;
    if (ch.collisionCooldown > 0) ch.collisionCooldown -= delta;
    if (ch.lapScrollTimer > 0) ch.lapScrollTimer -= delta;

    const flashAlpha = ch.flashTimer > 0
      ? (Math.floor(ch.flashTimer / 60) % 2 === 0 ? 1 : 0.3)
      : 1;
    ch.sprite.setAlpha(flashAlpha);

    if (absSpeed > 40 && this.isOnTrack(ch.sprite.x, ch.sprite.y)) {
      ch.dustAccum += dt * 60 * PARTICLES.DUST_EMIT_RATE * (absSpeed / CHARIOT.MAX_SPEED);
      while (ch.dustAccum >= 1) {
        ch.dustAccum -= 1;
        this.emitDust(ch.sprite.x, ch.sprite.y, ch.angle, absSpeed, drifting);
      }
      if (drifting) {
        ch.trailAccum += dt * 60 * 0.6;
        while (ch.trailAccum >= 1) {
          ch.trailAccum -= 1;
          this.emitTireTrail(
            ch.sprite.x - Math.cos(ch.angle - Math.PI / 2) * 15,
            ch.sprite.y - Math.sin(ch.angle - Math.PI / 2) * 15,
            ch.angle + Math.PI / 2
          );
        }
      }
    }

    this.checkLap(ch, index);
  }

  private updateDustParticles(delta: number): void {
    for (let i = this.dustParticles.length - 1; i >= 0; i--) {
      const p = this.dustParticles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.dustParticles.splice(i, 1);
        continue;
      }
      p.x += p.vx * (delta / 1000);
      p.y += p.vy * (delta / 1000);
      p.vx *= 0.96;
      p.vy *= 0.96;
    }
  }

  private updateAudienceParticles(delta: number): void {
    for (let i = this.audienceParticles.length - 1; i >= 0; i--) {
      const p = this.audienceParticles[i];
      p.life -= delta;
      if (p.life <= 0) {
        this.audienceParticles.splice(i, 1);
        continue;
      }
      p.x += p.vx * (delta / 1000);
      p.y += p.vy * (delta / 1000);
      p.vy += 50 * (delta / 1000);
    }
  }

  private updateShockwaves(delta: number): void {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.life -= delta;
      if (s.life <= 0) {
        this.shockwaves.splice(i, 1);
        continue;
      }
      s.radius = Phaser.Math.Linear(s.radius, s.maxRadius, delta / s.maxLife * 3);
    }
  }

  private updateHUD(delta: number): void {
    if (this.collisionScrollTimer > 0) {
      this.collisionScrollTimer -= delta;
      const progress = 1 - this.collisionScrollTimer / HUD.SCROLL_DURATION;
      this.displayCollisions = Math.round(Phaser.Math.Linear(
        this.displayCollisions, this.collisions,
        Phaser.Math.Easing.Out.Quad(progress)
      ));
    } else {
      this.displayCollisions = this.collisions;
    }
    if (this.collisionText) {
      const offset = this.collisionScrollTimer > 0 ? Math.sin(this.collisionScrollTimer / 30) * 3 : 0;
      this.collisionText.setText(`${this.displayCollisions}`);
      this.collisionText.y = HUD.TOP_BAR_HEIGHT / 2 + offset;
    }

    const sorted = [...this.chariots].map((c, i) => ({ ch: c, index: i }))
      .sort((a, b) => {
        if (b.ch.laps !== a.ch.laps) return b.ch.laps - a.ch.laps;
        const adx = a.ch.sprite.x - TRACK.CENTER_X;
        const ady = a.ch.sprite.y - TRACK.CENTER_Y;
        const bdx = b.ch.sprite.x - TRACK.CENTER_X;
        const bdy = b.ch.sprite.y - TRACK.CENTER_Y;
        let aa = Math.atan2(ady, adx) - TRACK.START_ANGLE;
        let ba = Math.atan2(bdy, bdx) - TRACK.START_ANGLE;
        if (aa < 0) aa += Math.PI * 2;
        if (ba < 0) ba += Math.PI * 2;
        return ba - aa;
      });

    const rankMap = new Map<number, number>();
    sorted.forEach((s, r) => rankMap.set(s.index, r + 1));

    this.chariots.forEach((ch, i) => {
      if (ch.lapScrollTimer > 0) {
        ch.lapScrollTimer -= delta;
        const progress = 1 - ch.lapScrollTimer / HUD.SCROLL_DURATION;
        ch.displayLap = Math.round(Phaser.Math.Linear(ch.displayLap, ch.laps, Phaser.Math.Easing.Out.Quad(progress)));
      } else {
        ch.displayLap = ch.laps;
      }
      this.lapTexts[i].setText(`${ch.displayLap} / ${TRACK.TOTAL_LAPS}`);
      this.rankTexts[i].setText(`${rankMap.get(i) ?? '--'}`);
    });
  }

  private renderDustParticles(): void {
    if (this.dustParticles.length === 0) return;
    const gfx = this.add.graphics({ x: 0, y: 0 });
    gfx.setDepth(3);
    this.dustParticles.forEach(p => {
      const t = p.life / p.maxLife;
      gfx.fillStyle(p.color, p.alpha * t);
      gfx.fillCircle(p.x, p.y, p.size * (1 + (1 - t) * 0.5));
    });
    this.time.delayedCall(16, () => gfx.destroy());
  }

  private renderAudienceParticles(): void {
    if (this.audienceParticles.length === 0) return;
    const gfx = this.add.graphics({ x: 0, y: 0 });
    gfx.setDepth(1);
    this.audienceParticles.forEach(p => {
      const t = p.life / p.maxLife;
      gfx.fillStyle(p.color, p.alpha * t);
      gfx.fillCircle(p.x, p.y, p.size);
    });
    this.time.delayedCall(16, () => gfx.destroy());
  }

  private renderShockwaves(): void {
    if (this.shockwaves.length === 0) return;
    const gfx = this.add.graphics({ x: 0, y: 0 });
    gfx.setDepth(15);
    this.shockwaves.forEach(s => {
      const t = s.life / s.maxLife;
      gfx.lineStyle(6 * t, COLORS.SHOCKWAVE, t);
      gfx.strokeCircle(s.x, s.y, s.radius);
      gfx.lineStyle(3 * t, COLORS.GOLD_LIGHT, t * 0.7);
      gfx.strokeCircle(s.x, s.y, s.radius * 0.7);
    });
    this.time.delayedCall(16, () => gfx.destroy());
  }

  private audienceTimer: number = 0;

  update(time: number, delta: number): void {
    const clampedDelta = Math.min(delta, 33);

    this.updateChariot(this.chariots[0], 0, PLAYER1_KEYS, clampedDelta);
    this.updateChariot(this.chariots[1], 1, PLAYER2_KEYS, clampedDelta);

    if (this.chariots[0].collisionCooldown <= 0 && this.chariots[1].collisionCooldown <= 0) {
      if (this.checkCollision(this.chariots[0], this.chariots[1])) {
        this.handleCollision(this.chariots[0], this.chariots[1]);
      }
    }

    this.updateDustParticles(clampedDelta);
    this.updateAudienceParticles(clampedDelta);
    this.updateShockwaves(clampedDelta);
    this.updateHUD(clampedDelta);

    this.audienceTimer += clampedDelta;
    if (this.audienceTimer >= 1000 / PARTICLES.AUDIENCE_EMIT_RATE) {
      this.audienceTimer = 0;
      this.emitAudience();
      if (Math.random() < 0.5) this.emitAudience();
    }

    if (this.gateFlashTimer > 0) this.gateFlashTimer -= clampedDelta;
    this.updateGate();

    this.renderDustParticles();
    this.renderAudienceParticles();
    this.renderShockwaves();
  }
}
