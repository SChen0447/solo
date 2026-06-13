import * as PIXI from 'pixi.js';
import { FurnaceEngine, PALETTE_A, PALETTE_B, CrystalState, FurnacePhase } from './furnace';

export class WorkshopRenderer {
  private app: PIXI.Application;
  private engine: FurnaceEngine;
  private stage: PIXI.Container;

  private bgLayer!: PIXI.Container;
  private furnaceLayer!: PIXI.Container;
  private blowingLayer!: PIXI.Container;
  private dashboardLayer!: PIXI.Container;
  private crystalLayer!: PIXI.Container;
  private authLayer!: PIXI.Container;

  private furnaceGlow!: PIXI.Graphics;
  private glassBlobGfx!: PIXI.Graphics;
  private flowLightGfx!: PIXI.Graphics;
  private crackGfx!: PIXI.Graphics;
  private solidifyGfx!: PIXI.Graphics;
  private crystalGfxMap: Map<number, PIXI.Graphics> = new Map();
  private trailGfxMap: Map<number, PIXI.Graphics> = new Map();

  private tempText!: PIXI.Text;
  private rpmText!: PIXI.Text;
  private paletteACircles: PIXI.Graphics[] = [];
  private paletteBCircles: PIXI.Graphics[] = [];

  private furnacePulseTime = 0;
  private blowingCenterX = 0;
  private blowingCenterY = 0;

  private onFurnaceClick?: () => void;
  private onPaletteAClick?: (color: string) => void;
  private onPaletteBClick?: (color: string) => void;
  private onCoolClick?: () => void;

  constructor(app: PIXI.Application, engine: FurnaceEngine) {
    this.app = app;
    this.engine = engine;
    this.stage = app.stage;
    this.buildLayers();
    this.buildBackground();
    this.buildFurnace();
    this.buildBlowingStation();
    this.buildDashboard();
    this.buildAuthLayer();
    this.bindEvents();
  }

  setCallbacks(cbs: {
    onFurnaceClick?: () => void;
    onPaletteAClick?: (color: string) => void;
    onPaletteBClick?: (color: string) => void;
    onCoolClick?: () => void;
  }): void {
    this.onFurnaceClick = cbs.onFurnaceClick;
    this.onPaletteAClick = cbs.onPaletteAClick;
    this.onPaletteBClick = cbs.onPaletteBClick;
    this.onCoolClick = cbs.onCoolClick;
  }

  private buildLayers(): void {
    this.bgLayer = new PIXI.Container();
    this.furnaceLayer = new PIXI.Container();
    this.blowingLayer = new PIXI.Container();
    this.crystalLayer = new PIXI.Container();
    this.dashboardLayer = new PIXI.Container();
    this.authLayer = new PIXI.Container();

    this.stage.addChild(this.bgLayer);
    this.stage.addChild(this.furnaceLayer);
    this.stage.addChild(this.blowingLayer);
    this.stage.addChild(this.crystalLayer);
    this.stage.addChild(this.dashboardLayer);
    this.stage.addChild(this.authLayer);

    this.blowingLayer.visible = false;
    this.crystalLayer.visible = false;
    this.dashboardLayer.visible = false;
  }

  private buildBackground(): void {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const bg = new PIXI.Graphics();
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy);
    const steps = 20;
    for (let i = steps; i >= 0; i--) {
      const t = i / steps;
      const r = maxR * t;
      const c1 = this.hexToRgb('#2c1810');
      const c2 = this.hexToRgb('#0e0a08');
      const cr = Math.round(c2.r + (c1.r - c2.r) * (1 - t));
      const cg = Math.round(c2.g + (c1.g - c2.g) * (1 - t));
      const cb = Math.round(c2.b + (c1.b - c2.b) * (1 - t));
      bg.beginFill((cr << 16) | (cg << 8) | cb, 1);
      bg.drawCircle(cx, cy, r);
      bg.endFill();
    }
    this.bgLayer.addChild(bg);
  }

  private buildFurnace(): void {
    const cx = this.app.screen.width / 2;
    const cy = this.app.screen.height / 2;

    const furnaceBody = new PIXI.Graphics();
    furnaceBody.beginFill(0x8b7355, 0.3);
    furnaceBody.drawCircle(cx, cy, 40);
    furnaceBody.endFill();
    furnaceBody.beginFill(0x6b5b45, 0.4);
    furnaceBody.drawCircle(cx, cy, 30);
    furnaceBody.endFill();
    this.furnaceLayer.addChild(furnaceBody);

    this.furnaceGlow = new PIXI.Graphics();
    this.furnaceLayer.addChild(this.furnaceGlow);

    const innerRing = new PIXI.Graphics();
    innerRing.lineStyle(2, 0xb0b0b0, 0.3);
    innerRing.drawCircle(cx, cy, 35);
    this.furnaceLayer.addChild(innerRing);

    const label = new PIXI.Text('熔炉', {
      fontFamily: 'sans-serif',
      fontSize: 12,
      fill: 0xcccccc,
      align: 'center',
    });
    label.anchor.set(0.5);
    label.x = cx;
    label.y = cy + 55;
    this.furnaceLayer.addChild(label);
  }

  private buildBlowingStation(): void {
    const cx = this.app.screen.width / 2;
    const cy = this.app.screen.height / 2;
    this.blowingCenterX = cx;
    this.blowingCenterY = cy;

    const station = new PIXI.Graphics();
    station.lineStyle(1, 0xb0b0b0, 0.6);
    station.beginFill(0x1a1a1a, 1);
    station.drawCircle(cx, cy, 200);
    station.endFill();
    this.blowingLayer.addChild(station);

    this.crackGfx = new PIXI.Graphics();
    this.blowingLayer.addChild(this.crackGfx);

    this.glassBlobGfx = new PIXI.Graphics();
    this.blowingLayer.addChild(this.glassBlobGfx);

    this.flowLightGfx = new PIXI.Graphics();
    this.blowingLayer.addChild(this.flowLightGfx);

    this.solidifyGfx = new PIXI.Graphics();
    this.blowingLayer.addChild(this.solidifyGfx);
  }

  private buildDashboard(): void {
    const w = this.app.screen.width;
    const panelW = 220;
    const panelH = 280;
    const px = w - panelW - 20;
    const py = 20;

    const panel = new PIXI.Graphics();
    panel.beginFill(0x1a0f0a, 0.85);
    panel.lineStyle(1, 0x3e2723, 0.6);
    panel.drawRoundedRect(px, py, panelW, panelH, 12);
    panel.endFill();
    this.dashboardLayer.addChild(panel);

    this.tempText = new PIXI.Text('800°C', {
      fontFamily: 'monospace',
      fontSize: 14,
      fill: 0xff6b35,
    });
    this.tempText.x = px + 15;
    this.tempText.y = py + 15;
    this.dashboardLayer.addChild(this.tempText);

    this.rpmText = new PIXI.Text('0 rpm', {
      fontFamily: 'monospace',
      fontSize: 14,
      fill: 0xb0b0b0,
    });
    this.rpmText.x = px + panelW - 75;
    this.rpmText.y = py + 15;
    this.dashboardLayer.addChild(this.rpmText);

    const labelA = new PIXI.Text('熔融色', {
      fontFamily: 'sans-serif',
      fontSize: 11,
      fill: 0x999999,
    });
    labelA.x = px + 15;
    labelA.y = py + 50;
    this.dashboardLayer.addChild(labelA);

    const paletteAGfx = new PIXI.Graphics();
    const pax = px + 15;
    const pay = py + 70;
    const segAngle = (Math.PI * 2) / 12;
    PALETTE_A.forEach((color, i) => {
      const rgb = this.hexToRgb(color);
      const c = (rgb.r << 16) | (rgb.g << 8) | rgb.b;
      paletteAGfx.beginFill(c, 1);
      paletteAGfx.moveTo(pax + 25, pay + 25);
      const startAngle = segAngle * i - Math.PI / 2;
      const endAngle = startAngle + segAngle;
      paletteAGfx.lineTo(
        pax + 25 + Math.cos(startAngle) * 25,
        pay + 25 + Math.sin(startAngle) * 25
      );
      for (let a = startAngle; a <= endAngle; a += 0.1) {
        paletteAGfx.lineTo(pax + 25 + Math.cos(a) * 25, pay + 25 + Math.sin(a) * 25);
      }
      paletteAGfx.lineTo(pax + 25, pay + 25);
      paletteAGfx.endFill();
    });
    paletteAGfx.lineStyle(1, 0x555555, 0.5);
    paletteAGfx.drawCircle(pax + 25, pay + 25, 25);
    this.dashboardLayer.addChild(paletteAGfx);
    this.paletteACircles.push(paletteAGfx);

    const labelB = new PIXI.Text('星辉色', {
      fontFamily: 'sans-serif',
      fontSize: 11,
      fill: 0x999999,
    });
    labelB.x = px + 115;
    labelB.y = py + 50;
    this.dashboardLayer.addChild(labelB);

    const paletteBGfx = new PIXI.Graphics();
    const pbx = px + 115;
    const pby = pay;
    PALETTE_B.forEach((color, i) => {
      const rgb = this.hexToRgb(color);
      const c = (rgb.r << 16) | (rgb.g << 8) | rgb.b;
      paletteBGfx.beginFill(c, 1);
      paletteBGfx.moveTo(pbx + 25, pby + 25);
      const startAngle = segAngle * i - Math.PI / 2;
      const endAngle = startAngle + segAngle;
      paletteBGfx.lineTo(
        pbx + 25 + Math.cos(startAngle) * 25,
        pby + 25 + Math.sin(startAngle) * 25
      );
      for (let a = startAngle; a <= endAngle; a += 0.1) {
        paletteBGfx.lineTo(pbx + 25 + Math.cos(a) * 25, pby + 25 + Math.sin(a) * 25);
      }
      paletteBGfx.lineTo(pbx + 25, pby + 25);
      paletteBGfx.endFill();
    });
    paletteBGfx.lineStyle(1, 0x555555, 0.5);
    paletteBGfx.drawCircle(pbx + 25, pby + 25, 25);
    this.dashboardLayer.addChild(paletteBGfx);
    this.paletteBCircles.push(paletteBGfx);

    const coolBtn = new PIXI.Graphics();
    const cbx = px + panelW / 2;
    const cby = py + panelH - 45;
    coolBtn.beginFill(0x0288d1, 1);
    coolBtn.drawCircle(cbx, cby, 20);
    coolBtn.endFill();
    coolBtn.beginFill(0x4fc3f7, 1);
    coolBtn.drawCircle(cbx, cby - 2, 18);
    coolBtn.endFill();

    const snowflake = new PIXI.Text('❄', {
      fontFamily: 'sans-serif',
      fontSize: 16,
      fill: 0xffffff,
    });
    snowflake.anchor.set(0.5);
    snowflake.x = cbx;
    snowflake.y = cby;
    this.dashboardLayer.addChild(coolBtn);
    this.dashboardLayer.addChild(snowflake);

    const coolLabel = new PIXI.Text('冷却', {
      fontFamily: 'sans-serif',
      fontSize: 10,
      fill: 0x66ccff,
    });
    coolLabel.anchor.set(0.5);
    coolLabel.x = cbx;
    coolLabel.y = cby + 28;
    this.dashboardLayer.addChild(coolLabel);
  }

  private buildAuthLayer(): void {
    this.authLayer.visible = false;
  }

  showAuthLayer(): void {
    this.authLayer.visible = true;
  }

  hideAuthLayer(): void {
    this.authLayer.visible = false;
  }

  private bindEvents(): void {
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;

    this.app.stage.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
      const { x, y } = e.global;
      this.handlePointerDown(x, y);
    });
    this.app.stage.on('pointermove', (e: PIXI.FederatedPointerEvent) => {
      const { x, y } = e.global;
      this.engine.handleMouseMove(x, y);
    });
    this.app.stage.on('pointerup', () => {
      this.engine.handleMouseUp();
    });
    this.app.stage.on('wheel', (e: PIXI.FederatedWheelEvent) => {
      this.engine.handleWheel(e.deltaY);
    });
  }

  private handlePointerDown(x: number, y: number): void {
    if (this.engine.phase === 'idle' || this.engine.phase === 'workshop') {
      const cx = this.app.screen.width / 2;
      const cy = this.app.screen.height / 2;
      const dx = x - cx;
      const dy = y - cy;
      if (Math.sqrt(dx * dx + dy * dy) < 50) {
        this.onFurnaceClick?.();
        return;
      }
    }

    if (this.engine.phase === 'blowing') {
      const w = this.app.screen.width;
      const panelW = 220;
      const px = w - panelW - 20;
      const py = 20;
      const pay = py + 70;

      const pax = px + 15;
      const dax = x - (pax + 25);
      const day = y - (pay + 25);
      if (Math.sqrt(dax * dax + day * day) < 25) {
        const angle = Math.atan2(day, dax) + Math.PI / 2;
        const normAngle = angle < 0 ? angle + Math.PI * 2 : angle;
        const idx = Math.floor((normAngle / (Math.PI * 2)) * 12) % 12;
        this.onPaletteAClick?.(PALETTE_A[idx]);
        return;
      }

      const pbx = px + 115;
      const dbx = x - (pbx + 25);
      const dby = y - (pay + 25);
      if (Math.sqrt(dbx * dbx + dby * dby) < 25) {
        const angle = Math.atan2(dby, dbx) + Math.PI / 2;
        const normAngle = angle < 0 ? angle + Math.PI * 2 : angle;
        const idx = Math.floor((normAngle / (Math.PI * 2)) * 12) % 12;
        this.onPaletteBClick?.(PALETTE_B[idx]);
        return;
      }

      const cbx = px + panelW / 2;
      const cby = py + 280 - 45;
      const dcx = x - cbx;
      const dcy = y - cby;
      if (Math.sqrt(dcx * dcx + dcy * dcy) < 20) {
        this.onCoolClick?.();
        return;
      }

      this.engine.handleMouseDown(x, y);
    }
  }

  update(dt: number): void {
    this.furnacePulseTime += dt;

    switch (this.engine.phase) {
      case 'idle':
      case 'workshop':
        this.furnaceLayer.visible = true;
        this.blowingLayer.visible = false;
        this.crystalLayer.visible = false;
        this.dashboardLayer.visible = false;
        break;
      case 'blowing':
      case 'solidifying':
      case 'complete':
        this.furnaceLayer.visible = false;
        this.blowingLayer.visible = true;
        this.crystalLayer.visible = true;
        this.dashboardLayer.visible = true;
        break;
    }

    this.updateFurnaceGlow();
    this.updateGlassBlob();
    this.updateFlowLights();
    this.updateCracks();
    this.updateSolidification();
    this.updateCrystals();
    this.updateDashboard();
  }

  private updateFurnaceGlow(): void {
    if (!this.furnaceLayer.visible) return;
    this.furnaceGlow.clear();
    const cx = this.app.screen.width / 2;
    const cy = this.app.screen.height / 2;
    const pulse = (Math.sin(this.furnacePulseTime * Math.PI) + 1) / 2;
    const innerR = 10 + pulse * 8;
    const outerR = 25 + pulse * 5;

    this.furnaceGlow.beginFill(0xff6b35, 0.6 + pulse * 0.3);
    this.furnaceGlow.drawCircle(cx, cy, innerR);
    this.furnaceGlow.endFill();

    this.furnaceGlow.beginFill(0xffb347, 0.3 + pulse * 0.2);
    this.furnaceGlow.drawCircle(cx, cy, outerR);
    this.furnaceGlow.endFill();

    this.furnaceGlow.beginFill(0xff6b35, 0.1);
    this.furnaceGlow.drawCircle(cx, cy, outerR + 10);
    this.furnaceGlow.endFill();
  }

  private updateGlassBlob(): void {
    if (!this.blowingLayer.visible) return;
    this.glassBlobGfx.clear();
    const blob = this.engine.blob;
    const rx = blob.baseRadius * blob.stretchRatio;
    const ry = blob.baseRadius * blob.flatRatio;
    const cx = this.blowingCenterX;
    const cy = this.blowingCenterY;

    const rgb = this.hexToRgb(blob.colorA);
    const color = (rgb.r << 16) | (rgb.g << 8) | rgb.b;
    const alpha = blob.isSolidified ? 0.6 : blob.opacity;

    this.glassBlobGfx.beginFill(color, alpha);
    this.glassBlobGfx.drawEllipse(cx, cy, rx, ry);
    this.glassBlobGfx.endFill();

    if (!blob.isSolidified) {
      const highlight = this.lightenColor(rgb, 60);
      const hColor = (highlight.r << 16) | (highlight.g << 8) | highlight.b;
      this.glassBlobGfx.beginFill(hColor, 0.15);
      this.glassBlobGfx.drawEllipse(cx - rx * 0.2, cy - ry * 0.25, rx * 0.5, ry * 0.4);
      this.glassBlobGfx.endFill();
    }
  }

  private updateFlowLights(): void {
    if (!this.blowingLayer.visible) return;
    this.flowLightGfx.clear();
    const blob = this.engine.blob;
    if (blob.isSolidified) return;
    if (!blob.isDeforming && blob.crackIntensity <= 0) return;

    const cx = this.blowingCenterX;
    const cy = this.blowingCenterY;
    const rx = blob.baseRadius * blob.stretchRatio;
    const ry = blob.baseRadius * blob.flatRatio;
    const rgb = this.hexToRgb(blob.colorA);
    const color = (rgb.r << 16) | (rgb.g << 8) | rgb.b;

    for (let i = 0; i < 6; i++) {
      const angleOffset = (i / 6) * Math.PI * 2;
      this.flowLightGfx.lineStyle(1.5, color, 0.5);
      this.flowLightGfx.moveTo(
        cx - rx * 0.8 * Math.cos(angleOffset),
        cy - ry * 0.8 * Math.sin(angleOffset)
      );
      const segments = 12;
      for (let s = 1; s <= segments; s++) {
        const t = s / segments;
        const wave = Math.sin(blob.flowLightPhase + t * 8 + i) * ry * 0.15;
        const px = cx - rx * 0.8 * Math.cos(angleOffset) * (1 - 2 * t);
        const py = cy - ry * 0.8 * Math.sin(angleOffset) * (1 - 2 * t) + wave;
        this.flowLightGfx.lineTo(px, py);
      }
    }
  }

  private updateCracks(): void {
    if (!this.blowingLayer.visible) return;
    this.crackGfx.clear();
    const blob = this.engine.blob;
    if (blob.crackIntensity <= 0) return;

    const cx = this.blowingCenterX;
    const cy = this.blowingCenterY;
    const rx = blob.baseRadius * blob.stretchRatio;
    const ry = blob.baseRadius * blob.flatRatio;

    this.crackGfx.lineStyle(1, 0x555555, blob.crackIntensity * 0.7);
    const crackCount = Math.floor(blob.crackIntensity * 8) + 2;
    for (let i = 0; i < crackCount; i++) {
      const angle = (i / crackCount) * Math.PI * 2 + 0.3;
      const startR = 0.2 + Math.random() * 0.2;
      const endR = 0.7 + Math.random() * 0.3;
      this.crackGfx.moveTo(
        cx + Math.cos(angle) * rx * startR,
        cy + Math.sin(angle) * ry * startR
      );
      this.crackGfx.lineTo(
        cx + Math.cos(angle) * rx * endR,
        cy + Math.sin(angle) * ry * endR
      );
      const branchAngle = angle + (Math.random() - 0.5) * 1.2;
      const branchR = startR + (endR - startR) * 0.5;
      this.crackGfx.lineTo(
        cx + Math.cos(branchAngle) * rx * (branchR + 0.1),
        cy + Math.sin(branchAngle) * ry * (branchR + 0.1)
      );
    }
  }

  private updateSolidification(): void {
    if (!this.blowingLayer.visible) return;
    this.solidifyGfx.clear();
    const blob = this.engine.blob;
    if (blob.solidifyProgress <= 0 && !blob.isSolidified) return;

    const cx = this.blowingCenterX;
    const cy = this.blowingCenterY;
    const rx = blob.baseRadius * blob.stretchRatio;
    const ry = blob.baseRadius * blob.flatRatio;

    if (blob.isSolidified || blob.solidifyProgress > 0) {
      this.solidifyGfx.lineStyle(0.8, 0xdddddd, 0.4 * blob.solidifyProgress);
      const iceCrackCount = 15;
      for (let i = 0; i < iceCrackCount; i++) {
        const angle = (i / iceCrackCount) * Math.PI * 2;
        const r1 = Math.random() * 0.3;
        const r2 = 0.3 + Math.random() * 0.7;
        this.solidifyGfx.moveTo(
          cx + Math.cos(angle) * rx * r1,
          cy + Math.sin(angle) * ry * r1
        );
        this.solidifyGfx.lineTo(
          cx + Math.cos(angle + (Math.random() - 0.5) * 0.3) * rx * r2,
          cy + Math.sin(angle + (Math.random() - 0.5) * 0.3) * ry * r2
        );
      }
    }
  }

  private updateCrystals(): void {
    if (!this.crystalLayer.visible) return;

    const existingIds = new Set<number>();
    for (const crystal of this.engine.crystals) {
      existingIds.add(crystal.id);
      if (!this.crystalGfxMap.has(crystal.id)) {
        const gfx = new PIXI.Graphics();
        this.crystalLayer.addChild(gfx);
        this.crystalGfxMap.set(crystal.id, gfx);
      }
      if (!this.trailGfxMap.has(crystal.id)) {
        const trail = new PIXI.Graphics();
        this.crystalLayer.addChildAt(trail, 0);
        this.trailGfxMap.set(crystal.id, trail);
      }

      const trailGfx = this.trailGfxMap.get(crystal.id)!;
      trailGfx.clear();
      if (crystal.trail.length > 1) {
        const rgb = this.hexToRgb(crystal.color);
        const c = (rgb.r << 16) | (rgb.g << 8) | rgb.b;
        for (let i = 0; i < crystal.trail.length - 1; i++) {
          const seg = crystal.trail[i];
          const nextSeg = crystal.trail[i + 1];
          trailGfx.lineStyle(2, c, seg.opacity * 0.5);
          trailGfx.moveTo(seg.x, seg.y);
          trailGfx.lineTo(nextSeg.x, nextSeg.y);
        }
      }

      const gfx = this.crystalGfxMap.get(crystal.id)!;
      gfx.clear();
      this.drawHexagon(gfx, crystal.x, crystal.y, crystal.size, crystal.color, crystal.opacity);

      if (crystal.fixed) {
        const borderAlpha = (Math.sin(crystal.goldBorderPhase * Math.PI * 2) + 1) / 2 * 0.8 + 0.2;
        gfx.lineStyle(1, 0xffd54f, borderAlpha);
        gfx.drawCircle(crystal.x, crystal.y, crystal.size + 2);
      }
    }

    for (const [id] of this.crystalGfxMap) {
      if (!existingIds.has(id)) {
        const gfx = this.crystalGfxMap.get(id)!;
        this.crystalLayer.removeChild(gfx);
        gfx.destroy();
        this.crystalGfxMap.delete(id);
        const trail = this.trailGfxMap.get(id);
        if (trail) {
          this.crystalLayer.removeChild(trail);
          trail.destroy();
          this.trailGfxMap.delete(id);
        }
      }
    }
  }

  private drawHexagon(gfx: PIXI.Graphics, cx: number, cy: number, size: number, color: string, opacity: number): void {
    const rgb = this.hexToRgb(color);
    const c = (rgb.r << 16) | (rgb.g << 8) | rgb.b;
    gfx.beginFill(c, opacity);
    gfx.moveTo(cx + size, cy);
    for (let i = 1; i <= 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      gfx.lineTo(cx + Math.cos(angle) * size, cy + Math.sin(angle) * size);
    }
    gfx.closePath();
    gfx.endFill();
  }

  private updateDashboard(): void {
    if (!this.dashboardLayer.visible) return;
    const blob = this.engine.blob;
    this.tempText.text = `${Math.round(blob.temperature)}°C`;
    this.tempText.style.fill = blob.temperature < 500 ? 0xff3366 : 0xff6b35;
    this.rpmText.text = `${Math.abs(Math.round(blob.rotationSpeed * 10))} rpm`;
  }

  resize(): void {
    this.bgLayer.removeChildren();
    this.buildBackground();
    this.blowingCenterX = this.app.screen.width / 2;
    this.blowingCenterY = this.app.screen.height / 2;

    this.blowingLayer.removeChildren();
    this.buildBlowingStation();

    this.dashboardLayer.removeChildren();
    this.buildDashboard();
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 255, g: 255, b: 255 };
  }

  private lightenColor(rgb: { r: number; g: number; b: number }, amount: number): { r: number; g: number; b: number } {
    return {
      r: Math.min(255, rgb.r + amount),
      g: Math.min(255, rgb.g + amount),
      b: Math.min(255, rgb.b + amount),
    };
  }
}
