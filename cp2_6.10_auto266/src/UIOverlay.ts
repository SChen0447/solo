import {
  GRID_SIZE,
  CELL_SIZE,
  MIN_DEPTH,
  MAX_DEPTH,
  type GridCell,
  type DroneState,
  type Creature,
  type FloatingText,
  type UpgradeState,
  type MineralType,
  type GameRecord,
  TERRAIN_COLORS,
  MINERAL_COLORS,
  MINERAL_NAMES
} from './types';

export class UIOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private hudContainer: HTMLDivElement | null = null;
  private upgradePanel: HTMLDivElement | null = null;
  private gameOverPanel: HTMLDivElement | null = null;
  private alertBar: HTMLDivElement | null = null;
  private baseButton: HTMLButtonElement | null = null;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private gridDirty: boolean = true;

  private onUpgradeClick: ((type: 'thruster' | 'arm' | 'oxygenTank') => void) | null = null;
  private onRestartClick: (() => void) | null = null;
  private onReturnBaseClick: (() => void) | null = null;
  private onBaseButtonClick: (() => void) | null = null;
  private onCloseUpgradeClick: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement, container: HTMLElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.container = container;

    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;

    this.resize();
    this.createHUD();
    this.createAlertBar();
    this.createBaseButton();
    this.createUpgradePanel();
    this.createGameOverPanel();

    window.addEventListener('resize', () => this.resize());
  }

  public resize(): void {
    const rect = this.container.getBoundingClientRect();
    const size = Math.min(rect.width - 40, rect.height - 180, GRID_SIZE * CELL_SIZE + 40);
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.canvas.style.width = size + 'px';
    this.canvas.style.height = size + 'px';
    this.ctx.scale(dpr, dpr);

    this.offscreenCanvas.width = size * dpr;
    this.offscreenCanvas.height = size * dpr;
    this.offscreenCtx.scale(dpr, dpr);

    this.gridDirty = true;
  }

  private getDrawSize(): number {
    return parseFloat(this.canvas.style.width);
  }

  private getCellSize(): number {
    return (this.getDrawSize() - 40) / GRID_SIZE;
  }

  private getGridOffset(): { x: number; y: number } {
    return { x: 20, y: 20 };
  }

  private createHUD(): void {
    this.hudContainer = document.createElement('div');
    this.hudContainer.style.cssText = `
      position: absolute;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 16px;
      padding: 12px 24px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      backdrop-filter: blur(4px);
      z-index: 5;
      align-items: center;
    `;
    this.container.appendChild(this.hudContainer);
  }

  private createAlertBar(): void {
    this.alertBar = document.createElement('div');
    this.alertBar.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      box-shadow: inset 0 0 60px rgba(255, 0, 0, 0);
      transition: box-shadow 0.2s ease;
      z-index: 4;
      border-radius: 8px;
    `;
    this.container.appendChild(this.alertBar);
  }

  private createBaseButton(): void {
    this.baseButton = document.createElement('button');
    this.baseButton.textContent = '⚓ 返回基地';
    this.baseButton.style.cssText = `
      position: absolute;
      bottom: 20px;
      right: 20px;
      padding: 10px 20px;
      background: rgba(0, 212, 255, 0.2);
      color: #00d4ff;
      border: 1px solid #00d4ff;
      border-radius: 8px;
      cursor: pointer;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      transition: all 0.3s ease;
      z-index: 5;
    `;
    this.baseButton.addEventListener('mouseenter', () => {
      if (this.baseButton) {
        this.baseButton.style.background = 'rgba(0, 212, 255, 0.4)';
      }
    });
    this.baseButton.addEventListener('mouseleave', () => {
      if (this.baseButton) {
        this.baseButton.style.background = 'rgba(0, 212, 255, 0.2)';
      }
    });
    this.baseButton.addEventListener('click', () => {
      if (this.onBaseButtonClick) this.onBaseButtonClick();
    });
    this.container.appendChild(this.baseButton);
  }

  private createUpgradePanel(): void {
    this.upgradePanel = document.createElement('div');
    this.upgradePanel.style.cssText = `
      position: absolute;
      top: 0;
      left: -360px;
      width: 340px;
      height: 100%;
      background: rgba(0, 29, 61, 0.95);
      border-right: 1px solid rgba(0, 212, 255, 0.3);
      padding: 24px;
      transition: left 0.3s ease, opacity 0.3s ease;
      opacity: 0;
      z-index: 20;
      box-sizing: border-box;
      overflow-y: auto;
    `;
    this.upgradePanel.innerHTML = `
      <h2 style="color: #00d4ff; margin: 0 0 20px 0; font-size: 20px; letter-spacing: 2px;">装备升级</h2>
      <div id="upgrade-list"></div>
      <button id="close-upgrade" style="
        margin-top: 20px;
        padding: 10px 20px;
        background: rgba(255, 255, 255, 0.1);
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        cursor: pointer;
        font-family: inherit;
        width: 100%;
        font-size: 14px;
      ">关闭</button>
    `;
    const closeBtn = this.upgradePanel.querySelector('#close-upgrade') as HTMLButtonElement;
    closeBtn.addEventListener('click', () => {
      if (this.onCloseUpgradeClick) this.onCloseUpgradeClick();
    });
    this.container.appendChild(this.upgradePanel);
  }

  private createGameOverPanel(): void {
    this.gameOverPanel = document.createElement('div');
    this.gameOverPanel.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 30;
    `;
    this.gameOverPanel.innerHTML = `
      <div id="gameover-content" style="
        background: rgba(0, 29, 61, 0.98);
        border: 1px solid rgba(0, 212, 255, 0.5);
        border-radius: 16px;
        padding: 32px 40px;
        min-width: 400px;
        max-width: 500px;
        text-align: center;
      ">
        <h2 style="color: #ff4444; margin: 0 0 24px 0; font-size: 24px; letter-spacing: 3px;">任务失败</h2>
        <div id="gameover-stats"></div>
        <div id="gameover-buttons" style="display: flex; gap: 16px; margin-top: 24px;"></div>
      </div>
    `;
    this.container.appendChild(this.gameOverPanel);
  }

  public setOnUpgradeClick(callback: (type: 'thruster' | 'arm' | 'oxygenTank') => void): void {
    this.onUpgradeClick = callback;
  }

  public setOnRestartClick(callback: () => void): void {
    this.onRestartClick = callback;
  }

  public setOnReturnBaseClick(callback: () => void): void {
    this.onReturnBaseClick = callback;
  }

  public setOnBaseButtonClick(callback: () => void): void {
    this.onBaseButtonClick = callback;
  }

  public setOnCloseUpgradeClick(callback: () => void): void {
    this.onCloseUpgradeClick = callback;
  }

  public renderGrid(grid: GridCell[][]): void {
    if (!this.gridDirty) return;
    const ctx = this.offscreenCtx;
    const cellSize = this.getCellSize();
    const offset = this.getGridOffset();
    const drawSize = this.getDrawSize();

    ctx.clearRect(0, 0, drawSize, drawSize);

    const gradient = ctx.createRadialGradient(drawSize / 2, 0, 0, drawSize / 2, drawSize / 2, drawSize);
    gradient.addColorStop(0, 'rgba(10, 22, 40, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 29, 61, 0.6)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, drawSize, drawSize);

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const cell = grid[y][x];
        const px = offset.x + x * cellSize;
        const py = offset.y + y * cellSize;

        ctx.fillStyle = TERRAIN_COLORS[cell.terrain];
        ctx.fillRect(px, py, cellSize, cellSize);

        if (cell.minerals.length > 0) {
          const totalRichness = cell.minerals.reduce((s, m) => s + m.amount, 0);
          const alpha = Math.min(0.4, totalRichness / 30);
          const primaryColor = MINERAL_COLORS[cell.minerals[0].type];
          ctx.fillStyle = this.hexToRgba(primaryColor, alpha);
          ctx.fillRect(px, py, cellSize, cellSize);
        }

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, cellSize, cellSize);

        this.drawMineralIcons(ctx, cell, px, py, cellSize);
      }
    }
    this.gridDirty = false;
  }

  private drawMineralIcons(ctx: CanvasRenderingContext2D, cell: GridCell, px: number, py: number, cellSize: number): void {
    const iconSize = cellSize * 0.22;
    const centerX = px + cellSize / 2;
    const centerY = py + cellSize / 2;
    const spacing = iconSize * 1.3;
    const startX = centerX - ((cell.minerals.length - 1) * spacing) / 2;

    for (let i = 0; i < cell.minerals.length; i++) {
      const mineral = cell.minerals[i];
      const ix = startX + i * spacing;
      const iy = centerY;
      ctx.fillStyle = MINERAL_COLORS[mineral.type];
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1;

      if (mineral.type === 'iron') {
        this.drawDiamond(ctx, ix, iy, iconSize);
      } else if (mineral.type === 'copper') {
        this.drawSquare(ctx, ix, iy, iconSize);
      } else {
        this.drawHexagon(ctx, ix, iy, iconSize);
      }
    }
  }

  private drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s, cy);
    ctx.lineTo(cx, cy + s);
    ctx.lineTo(cx - s, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawSquare(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
    ctx.fillRect(cx - s, cy - s, s * 2, s * 2);
    ctx.strokeRect(cx - s, cy - s, s * 2, s * 2);
  }

  private drawHexagon(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const x = cx + s * Math.cos(angle);
      const y = cy + s * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  public render(drone: DroneState, creatures: readonly Creature[], floatingTexts: readonly FloatingText[], alertActive: boolean): void {
    const ctx = this.ctx;
    const drawSize = this.getDrawSize();
    const cellSize = this.getCellSize();
    const offset = this.getGridOffset();

    ctx.clearRect(0, 0, drawSize, drawSize);
    ctx.drawImage(this.offscreenCanvas, 0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height, 0, 0, drawSize, drawSize);

    const dronePx = offset.x + drone.gridX * cellSize + cellSize / 2;
    const dronePy = offset.y + drone.gridY * cellSize + cellSize / 2;
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(offset.x + drone.gridX * cellSize, offset.y + drone.gridY * cellSize, cellSize, cellSize);
    ctx.setLineDash([]);

    for (const creature of creatures) {
      this.drawCreature(ctx, creature, offset, cellSize);
    }

    this.drawDrone(ctx, drone, dronePx, dronePy, cellSize);

    const now = Date.now();
    for (const text of floatingTexts) {
      const elapsed = now - text.startTime;
      const progress = elapsed / text.duration;
      if (progress >= 1) continue;
      const tx = offset.x + text.x * cellSize + cellSize / 2;
      const ty = offset.y + text.y * cellSize + cellSize / 2 - progress * 40;
      ctx.globalAlpha = 1 - progress;
      ctx.fillStyle = text.color;
      ctx.font = 'bold 16px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(text.text, tx, ty);
      ctx.globalAlpha = 1;
    }

    if (drone.isMining && drone.miningTarget) {
      this.drawMiningProgress(ctx, drone, offset, cellSize);
    }

    if (alertActive) {
      this.alertBar!.style.boxShadow = 'inset 0 0 80px rgba(255, 0, 0, 0.6)';
    } else {
      this.alertBar!.style.boxShadow = 'inset 0 0 60px rgba(255, 0, 0, 0)';
    }
  }

  private drawDrone(ctx: CanvasRenderingContext2D, drone: DroneState, cx: number, cy: number, cellSize: number): void {
    const radius = cellSize * 0.3;

    ctx.fillStyle = 'rgba(0, 150, 255, 0.6)';
    for (let i = 0; i < 3; i++) {
      const flameLen = radius * (0.6 + Math.random() * 0.4);
      ctx.beginPath();
      ctx.moveTo(cx - radius * 0.3, cy + radius);
      ctx.lineTo(cx, cy + radius + flameLen);
      ctx.lineTo(cx + radius * 0.3, cy + radius);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#87ceeb';
    ctx.strokeStyle = '#4a90c2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#00d4ff';
    ctx.beginPath();
    ctx.arc(cx, cy - radius * 0.1, radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    if (drone.isMining) {
      const progress = drone.miningProgress / drone.miningTime;
      const phase = Math.floor(progress * 3);
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      if (phase === 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.3, 0, Math.PI * 2 * progress * 3);
        ctx.stroke();
      } else if (phase === 1) {
        const angle = (Date.now() / 50) % (Math.PI * 2);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(radius * 1.3, 0);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.strokeStyle = MINERAL_COLORS.iron;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.2 + Math.sin(Date.now() / 50) * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  private drawCreature(ctx: CanvasRenderingContext2D, creature: Creature, offset: { x: number; y: number }, cellSize: number): void {
    const cx = offset.x + creature.gridX * cellSize + cellSize / 2;
    const cy = offset.y + creature.gridY * cellSize + cellSize / 2;
    const size = cellSize * 0.3;

    for (let i = 0; i < creature.trail.length; i++) {
      const t = creature.trail[i];
      const alpha = (i / creature.trail.length) * 0.3 * (0.5 + Math.sin(Date.now() / 100 + i) * 0.5);
      const tx = offset.x + t.x * cellSize + cellSize / 2;
      const ty = offset.y + t.y * cellSize + cellSize / 2;
      ctx.fillStyle = creature.type === 'eel' ? `rgba(255, 50, 50, ${alpha})` : `rgba(180, 100, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(tx, ty, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (creature.type === 'eel') {
      ctx.strokeStyle = '#ff3030';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const wobble = Math.sin(Date.now() / 100) * size;
      ctx.moveTo(cx - size, cy - size * 0.5 + wobble);
      ctx.lineTo(cx, cy + wobble * 0.5);
      ctx.lineTo(cx + size, cy + size * 0.5 - wobble);
      ctx.stroke();

      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(cx + size, cy + size * 0.5 - wobble, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(180, 100, 255, 0.5)';
      ctx.strokeStyle = 'rgba(200, 150, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, size, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(180, 100, 255, 0.6)';
      ctx.lineWidth = 1.5;
      for (let i = -2; i <= 2; i++) {
        const tx = cx + i * size * 0.3;
        ctx.beginPath();
        ctx.moveTo(tx, cy);
        ctx.lineTo(tx + Math.sin(Date.now() / 200 + i) * 4, cy + size * 0.8);
        ctx.stroke();
      }
    }
  }

  private drawMiningProgress(ctx: CanvasRenderingContext2D, drone: DroneState, offset: { x: number; y: number }, cellSize: number): void {
    const target = drone.miningTarget!;
    const px = offset.x + target.x * cellSize + cellSize / 2;
    const py = offset.y + target.y * cellSize + cellSize * 0.85;
    const barW = cellSize * 0.8;
    const barH = 6;
    const progress = Math.min(1, drone.miningProgress / drone.miningTime);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(px - barW / 2, py, barW, barH);
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(px - barW / 2, py, barW * progress, barH);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(px - barW / 2, py, barW, barH);
  }

  public updateHUD(drone: DroneState): void {
    if (!this.hudContainer) return;

    const o2Pct = (drone.oxygen / drone.maxOxygen) * 100;
    const batPct = (drone.battery / drone.maxBattery) * 100;
    const depthPct = ((Math.abs(drone.depth) - 50) / (Math.abs(MAX_DEPTH) - 50)) * 100;

    this.hudContainer.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 4px; min-width: 120px;">
        <div style="color: #00bfff; font-size: 11px; letter-spacing: 1px;">O₂ ${o2Pct.toFixed(0)}%</div>
        <div style="width: 120px; height: 10px; background: rgba(0,0,0,0.4); border-radius: 5px; overflow: hidden;">
          <div style="width: ${o2Pct}%; height: 100%; background: linear-gradient(90deg, #00bfff, #0088cc); transition: width 0.3s ease;"></div>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 4px; min-width: 120px;">
        <div style="color: #ffaa00; font-size: 11px; letter-spacing: 1px;">电力 ${batPct.toFixed(0)}%</div>
        <div style="width: 120px; height: 10px; background: rgba(0,0,0,0.4); border-radius: 5px; overflow: hidden;">
          <div style="width: ${batPct}%; height: 100%; background: linear-gradient(90deg, #ffaa00, #ff8800); transition: width 0.3s ease;"></div>
        </div>
      </div>
      <div style="width: 1px; height: 40px; background: rgba(255,255,255,0.2);"></div>
      <div style="display: flex; gap: 12px; align-items: center;">
        <div style="display: flex; align-items: center; gap: 4px;">
          <div style="width: 14px; height: 14px; background: #b5651d; transform: rotate(45deg);"></div>
          <span style="color: #b5651d; font-size: 14px; font-weight: bold;">${drone.inventory.iron}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <div style="width: 14px; height: 14px; background: #cd7f32;"></div>
          <span style="color: #cd7f32; font-size: 14px; font-weight: bold;">${drone.inventory.copper}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <div style="width: 14px; height: 14px; background: #008080; clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);"></div>
          <span style="color: #008080; font-size: 14px; font-weight: bold;">${drone.inventory.cobalt}</span>
        </div>
      </div>
      <div style="width: 1px; height: 40px; background: rgba(255,255,255,0.2);"></div>
      <div style="display: flex; flex-direction: column; gap: 4px; min-width: 100px;">
        <div style="color: #00d4ff; font-size: 11px; letter-spacing: 1px;">深度 ${drone.depth.toFixed(0)}m</div>
        <div style="position: relative; width: 100px; height: 20px; background: rgba(0,0,0,0.4); border-radius: 4px; overflow: hidden;">
          <div style="position: absolute; top: 0; bottom: 0; left: 0; right: 0; display: flex; justify-content: space-between; padding: 0 4px; font-size: 9px; color: rgba(255,255,255,0.5); align-items: center;">
            <span>-50</span><span>-1000</span>
          </div>
          <div style="width: ${depthPct}%; height: 100%; background: linear-gradient(90deg, rgba(0,212,255,0.4), rgba(0,212,255,0.8));"></div>
        </div>
      </div>
    `;
  }

  public showUpgradePanel(drone: DroneState, upgrades: UpgradeState): void {
    if (!this.upgradePanel) return;
    this.upgradePanel.style.left = '0';
    this.upgradePanel.style.opacity = '1';

    const list = this.upgradePanel.querySelector('#upgrade-list') as HTMLDivElement;
    const cards = [
      {
        key: 'thruster' as const,
        name: '推进器',
        level: upgrades.thrusterLevel,
        desc: '提高移动速度 +15%',
        cost: { iron: 10, copper: 5, cobalt: 0 },
        color: '#00bfff'
      },
      {
        key: 'arm' as const,
        name: '机械臂',
        level: upgrades.armLevel,
        desc: '缩短采集时间 0.5秒',
        cost: { iron: 15, copper: 0, cobalt: 8 },
        color: '#ffaa00'
      },
      {
        key: 'oxygenTank' as const,
        name: '氧气罐',
        level: upgrades.oxygenTankLevel,
        desc: '增加氧气上限 +30',
        cost: { iron: 0, copper: 12, cobalt: 5 },
        color: '#00ff88'
      }
    ];

    list.innerHTML = cards.map(c => {
      const canAfford = drone.inventory.iron >= c.cost.iron && drone.inventory.copper >= c.cost.copper && drone.inventory.cobalt >= c.cost.cobalt;
      return `
        <div data-upgrade="${c.key}" style="
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid ${c.color}40;
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 12px;
          cursor: ${canAfford ? 'pointer' : 'not-allowed'};
          opacity: ${canAfford ? 1 : 0.5};
          transition: all 0.3s ease;
        " onmouseover="this.style.background='${canAfford ? 'rgba(255,255,255,0.12)' : ''}'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="color: ${c.color}; font-size: 16px; font-weight: bold;">${c.name}</span>
            <span style="color: rgba(255,255,255,0.7); font-size: 12px;">Lv.${c.level}</span>
          </div>
          <div style="color: rgba(255,255,255,0.7); font-size: 12px; margin-bottom: 10px;">${c.desc}</div>
          <div style="display: flex; gap: 12px; font-size: 12px;">
            ${c.cost.iron > 0 ? `<span style="color:#b5651d">铁 ${c.cost.iron}</span>` : ''}
            ${c.cost.copper > 0 ? `<span style="color:#cd7f32">铜 ${c.cost.copper}</span>` : ''}
            ${c.cost.cobalt > 0 ? `<span style="color:#008080">钴 ${c.cost.cobalt}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('[data-upgrade]').forEach(el => {
      el.addEventListener('click', () => {
        const key = el.getAttribute('data-upgrade') as 'thruster' | 'arm' | 'oxygenTank';
        if (this.onUpgradeClick) this.onUpgradeClick(key);
      });
    });
  }

  public hideUpgradePanel(): void {
    if (!this.upgradePanel) return;
    this.upgradePanel.style.left = '-360px';
    this.upgradePanel.style.opacity = '0';
  }

  public showGameOverPanel(
    record: { duration: number; maxDepth: number; minerals: Record<MineralType, number>; upgrades: number }
  ): void {
    if (!this.gameOverPanel) return;
    this.gameOverPanel.style.display = 'flex';

    const stats = this.gameOverPanel.querySelector('#gameover-stats') as HTMLDivElement;
    const mins = Math.floor(record.duration / 60);
    const secs = Math.floor(record.duration % 60);
    const totalMinerals = record.minerals.iron + record.minerals.copper + record.minerals.cobalt;
    const maxBarW = 200;

    const mineralBars = [
      { key: 'iron', name: MINERAL_NAMES.iron, color: MINERAL_COLORS.iron, val: record.minerals.iron },
      { key: 'copper', name: MINERAL_NAMES.copper, color: MINERAL_COLORS.copper, val: record.minerals.copper },
      { key: 'cobalt', name: MINERAL_NAMES.cobalt, color: MINERAL_COLORS.cobalt, val: record.minerals.cobalt }
    ];

    stats.innerHTML = `
      <div style="text-align: left; color: rgba(255,255,255,0.9); font-size: 14px; line-height: 1.8;">
        <div style="margin-bottom: 16px;">
          <div style="color: rgba(255,255,255,0.6); font-size: 12px;">本局采集矿物</div>
          ${mineralBars.map(m => {
            const pct = totalMinerals > 0 ? (m.val / Math.max(record.minerals.iron, record.minerals.copper, record.minerals.cobalt, 1)) * 100 : 0;
            return `
              <div style="display: flex; align-items: center; gap: 10px; margin-top: 6px;">
                <span style="color: ${m.color}; width: 40px;">${m.name}矿</span>
                <div style="flex: 1; height: 16px; background: rgba(0,0,0,0.4); border-radius: 4px; overflow: hidden;">
                  <div style="width: ${pct}%; height: 100%; background: ${m.color};"></div>
                </div>
                <span style="color: ${m.color}; width: 30px; text-align: right;">${m.val}</span>
              </div>
            `;
          }).join('')}
        </div>
        <div style="display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.15);">
          <div>
            <div style="color: rgba(255,255,255,0.6); font-size: 12px;">解锁升级</div>
            <div style="color: #00d4ff; font-size: 18px;">${record.upgrades} 项</div>
          </div>
          <div>
            <div style="color: rgba(255,255,255,0.6); font-size: 12px;">最高深度</div>
            <div style="color: #00d4ff; font-size: 18px;">${record.maxDepth}m</div>
          </div>
          <div>
            <div style="color: rgba(255,255,255,0.6); font-size: 12px;">游戏时长</div>
            <div style="color: #00d4ff; font-size: 18px;">${mins}:${secs.toString().padStart(2, '0')}</div>
          </div>
        </div>
      </div>
    `;

    const buttons = this.gameOverPanel.querySelector('#gameover-buttons') as HTMLDivElement;
    buttons.innerHTML = `
      <button id="btn-restart" style="
        flex: 1;
        padding: 12px;
        background: #00d4ff30;
        color: #00d4ff;
        border: 1px solid #00d4ff;
        border-radius: 8px;
        cursor: pointer;
        font-family: inherit;
        font-size: 14px;
        transition: all 0.3s ease;
      ">重新开始</button>
      <button id="btn-return" style="
        flex: 1;
        padding: 12px;
        background: rgba(255,255,255,0.1);
        color: #fff;
        border: 1px solid rgba(255,255,255,0.3);
        border-radius: 8px;
        cursor: pointer;
        font-family: inherit;
        font-size: 14px;
        transition: all 0.3s ease;
      ">返回基地</button>
    `;
    (buttons.querySelector('#btn-restart') as HTMLButtonElement).addEventListener('click', () => {
      if (this.onRestartClick) this.onRestartClick();
    });
    (buttons.querySelector('#btn-return') as HTMLButtonElement).addEventListener('click', () => {
      if (this.onReturnBaseClick) this.onReturnBaseClick();
    });
  }

  public hideGameOverPanel(): void {
    if (!this.gameOverPanel) return;
    this.gameOverPanel.style.display = 'none';
  }

  public triggerShake(): void {
    this.canvas.classList.remove('shake');
    void this.canvas.offsetWidth;
    this.canvas.classList.add('shake');
  }

  public markGridDirty(): void {
    this.gridDirty = true;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  public static loadRecords(): GameRecord[] {
    try {
      const raw = localStorage.getItem('deep_sea_miner_records');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public static saveRecord(record: GameRecord): void {
    try {
      const records = UIOverlay.loadRecords();
      records.unshift(record);
      localStorage.setItem('deep_sea_miner_records', JSON.stringify(records.slice(0, 50)));
    } catch {
    }
  }
}
