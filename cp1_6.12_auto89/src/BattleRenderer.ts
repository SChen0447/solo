import {
  ShipUnit, HexCoord, GameSnapshot, ShipType, Faction, TurnPhase, SkillType,
  GRID_SIZE, HEX_SIZE,
} from './UnitTypes';
import { GameBoard } from './GameBoard';

interface BeamAnim {
  fromX: number; fromY: number;
  toX: number; toY: number;
  startTime: number;
  duration: number;
}

interface TrailAnim {
  path: { x: number; y: number }[];
  startTime: number;
  duration: number;
  current: number;
}

interface Star {
  x: number; y: number;
  size: number;
  baseAlpha: number;
  phase: number;
  speed: number;
}

export class BattleRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private offsetX = 0;
  private offsetY = 0;
  private stars: Star[] = [];
  private beamAnims: BeamAnim[] = [];
  private trailAnims: TrailAnim[] = [];
  private dirtyRects: { x: number; y: number; w: number; h: number }[] = [];
  private lastTime = 0;
  private frameTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d')!;
    this.ctx = ctx;
    this.resize();
    this.generateStars();
  }

  resize(): void {
    const container = this.canvas.parentElement!;
    const maxW = container.clientWidth;
    const maxH = container.clientHeight;
    const aspect = 16 / 9;
    let w = maxW;
    let h = w / aspect;
    if (h > maxH) {
      h = maxH;
      w = h * aspect;
    }
    this.width = Math.floor(w);
    this.height = Math.floor(h);
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';

    const gridPixelW = Math.sqrt(3) * HEX_SIZE * GRID_SIZE + Math.sqrt(3) / 2 * HEX_SIZE;
    const gridPixelH = 1.5 * HEX_SIZE * (GRID_SIZE - 1) + 2 * HEX_SIZE;
    this.offsetX = (this.width - gridPixelW) / 2 + Math.sqrt(3) / 2 * HEX_SIZE;
    this.offsetY = (this.height - gridPixelH) / 2 + HEX_SIZE;

    this.generateStars();
    this.markDirty(0, 0, this.width, this.height);
  }

  private generateStars(): void {
    this.stars = [];
    const density = this.width * this.height / 200;
    const count = Math.floor(density);
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 1 + Math.random() * 2,
        baseAlpha: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 2,
      });
    }
  }

  markDirty(x: number, y: number, w: number, h: number): void {
    this.dirtyRects.push({ x: Math.floor(x) - 2, y: Math.floor(y) - 2, w: Math.ceil(w) + 4, h: Math.ceil(h) + 4 });
  }

  markFullDirty(): void {
    this.dirtyRects = [{ x: 0, y: 0, w: this.width, h: this.height }];
  }

  private isDirty(x: number, y: number, w: number, h: number): boolean {
    if (this.dirtyRects.length === 0) return true;
    for (const r of this.dirtyRects) {
      if (x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y) {
        return true;
      }
    }
    return false;
  }

  addBeamAnim(fromX: number, fromY: number, toX: number, toY: number): void {
    this.beamAnims.push({ fromX, fromY, toX, toY, startTime: performance.now(), duration: 300 });
    this.markDirty(Math.min(fromX, toX) - 20, Math.min(fromY, toY) - 20,
      Math.abs(toX - fromX) + 40, Math.abs(toY - fromY) + 40);
  }

  addTrailAnim(path: { x: number; y: number }[]): void {
    if (path.length < 2) return;
    this.trailAnims.push({ path, startTime: performance.now(), duration: 400, current: 0 });
    const minX = Math.min(...path.map(p => p.x)) - 20;
    const minY = Math.min(...path.map(p => p.y)) - 20;
    const maxX = Math.max(...path.map(p => p.x)) + 20;
    const maxY = Math.max(...path.map(p => p.y)) + 20;
    this.markDirty(minX, minY, maxX - minX, maxY - minY);
  }

  render(snapshot: GameSnapshot, timestamp: number): void {
    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;
    this.frameTime = dt;

    this.ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground(timestamp);
    this.drawStars(timestamp);
    this.drawHexGrid(snapshot);
    this.drawMovableHexes(snapshot);
    this.drawAttackTargets(snapshot);
    this.drawShips(snapshot);
    this.drawAnimations(timestamp);
    this.drawUI(snapshot);
    this.drawShipDetailCard(snapshot);

    this.dirtyRects = [];
  }

  private drawBackground(_t: number): void {
    const grad = this.ctx.createLinearGradient(0, 0, this.width, this.height);
    grad.addColorStop(0, '#0B0C10');
    grad.addColorStop(1, '#1F2833');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawStars(t: number): void {
    for (const star of this.stars) {
      const alpha = star.baseAlpha + 0.2 * Math.sin(t * 0.001 * star.speed + star.phase);
      this.ctx.beginPath();
      this.ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(255,255,255,${Math.max(0, Math.min(1, alpha))})`;
      this.ctx.fill();
    }
  }

  private hexCorners(cx: number, cy: number, size: number): { x: number; y: number }[] {
    const corners: { x: number; y: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 180 * (60 * i - 30);
      corners.push({ x: cx + size * Math.cos(angle), y: cy + size * Math.sin(angle) });
    }
    return corners;
  }

  private drawHex(cx: number, cy: number, size: number, fillColor?: string, strokeColor?: string, lineWidth?: number): void {
    const corners = this.hexCorners(cx, cy, size);
    this.ctx.beginPath();
    this.ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 6; i++) {
      this.ctx.lineTo(corners[i].x, corners[i].y);
    }
    this.ctx.closePath();
    if (fillColor) {
      this.ctx.fillStyle = fillColor;
      this.ctx.fill();
    }
    if (strokeColor) {
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = lineWidth || 1;
      this.ctx.stroke();
    }
  }

  private drawHexGrid(snapshot: GameSnapshot): void {
    for (let q = 0; q < GRID_SIZE; q++) {
      for (let r = 0; r < GRID_SIZE; r++) {
        if (!isValidHexCoord(q, r)) continue;
        const { x, y } = GameBoard.hexToPixel(q, r, HEX_SIZE, this.offsetX, this.offsetY);
        this.drawHex(x, y, HEX_SIZE, undefined, 'rgba(255,255,255,0.2)', 0.5);
      }
    }
  }

  private drawMovableHexes(snapshot: GameSnapshot): void {
    for (const hex of snapshot.movableHexes) {
      const { x, y } = GameBoard.hexToPixel(hex.q, hex.r, HEX_SIZE, this.offsetX, this.offsetY);
      this.drawHex(x, y, HEX_SIZE, 'rgba(69,162,158,0.3)', 'rgba(69,162,158,0.6)', 1.5);
    }
  }

  private drawAttackTargets(snapshot: GameSnapshot): void {
    for (const id of snapshot.attackableTargets) {
      const allShips = [...snapshot.playerShips, ...snapshot.enemyShips];
      const ship = allShips.find(s => s.id === id);
      if (!ship) continue;
      const { x, y } = GameBoard.hexToPixel(ship.pos.q, ship.pos.r, HEX_SIZE, this.offsetX, this.offsetY);
      this.drawHex(x, y, HEX_SIZE, 'rgba(255,50,50,0.2)', 'rgba(255,50,50,0.6)', 1.5);
    }
  }

  private drawShips(snapshot: GameSnapshot): void {
    const allShips = [...snapshot.playerShips, ...snapshot.enemyShips];
    for (const ship of allShips) {
      if (ship.hp <= 0) continue;
      const { x, y } = GameBoard.hexToPixel(ship.pos.q, ship.pos.r, HEX_SIZE, this.offsetX, this.offsetY);
      this.drawShip(x, y, ship, ship.id === snapshot.selectedShipId);
    }
  }

  private drawShip(x: number, y: number, ship: ShipUnit, selected: boolean): void {
    const ctx = this.ctx;

    if (selected) {
      ctx.beginPath();
      ctx.arc(x, y, HEX_SIZE * 0.7, 0, Math.PI * 2);
      ctx.strokeStyle = '#66FCF1';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = 'rgba(102,252,241,0.1)';
      ctx.fill();
    }

    if (ship.shieldActive) {
      ctx.beginPath();
      ctx.arc(x, y, HEX_SIZE * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(100,200,255,0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(100,200,255,0.1)';
      ctx.fill();
    }

    const color = ship.faction === Faction.Player ? '#66FCF1' : '#FF4444';
    const innerColor = ship.faction === Faction.Player ? '#45A29E' : '#CC2222';

    if (ship.type === ShipType.Frigate) {
      this.drawFrigate(x, y, color, innerColor);
    } else if (ship.type === ShipType.Destroyer) {
      this.drawDestroyer(x, y, color, innerColor);
    } else {
      this.drawBattleship(x, y, color, innerColor);
    }

    const barW = HEX_SIZE * 0.9;
    const barH = 3;
    const barY = y + HEX_SIZE * 0.35;

    const hpRatio = ship.hp / ship.maxHp;
    const hpColor = hpRatio < 0.3 ? '#FF3333' : '#33FF66';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - barW / 2, barY, barW, barH);
    ctx.fillStyle = hpColor;
    ctx.fillRect(x - barW / 2, barY, barW * hpRatio, barH);

    const energyRatio = ship.energy / ship.maxEnergy;
    const energyY = barY + barH + 1;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - barW / 2, energyY, barW, barH);
    const energyGrad = ctx.createLinearGradient(x - barW / 2, energyY, x + barW / 2, energyY);
    energyGrad.addColorStop(0, '#1E90FF');
    energyGrad.addColorStop(1, '#00BFFF');
    ctx.fillStyle = energyGrad;
    ctx.fillRect(x - barW / 2, energyY, barW * energyRatio, barH);
  }

  private drawFrigate(x: number, y: number, color: string, inner: string): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x, y - 12);
    ctx.lineTo(x + 8, y + 6);
    ctx.lineTo(x + 3, y + 8);
    ctx.lineTo(x - 3, y + 8);
    ctx.lineTo(x - 8, y + 6);
    ctx.closePath();
    ctx.fillStyle = inner;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  private drawDestroyer(x: number, y: number, color: string, inner: string): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x, y - 14);
    ctx.lineTo(x + 12, y + 4);
    ctx.lineTo(x + 10, y + 8);
    ctx.lineTo(x + 3, y + 6);
    ctx.lineTo(x - 3, y + 6);
    ctx.lineTo(x - 10, y + 8);
    ctx.lineTo(x - 12, y + 4);
    ctx.closePath();
    ctx.fillStyle = inner;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  private drawBattleship(x: number, y: number, color: string, inner: string): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x, y - 16);
    ctx.lineTo(x + 6, y - 8);
    ctx.lineTo(x + 14, y);
    ctx.lineTo(x + 12, y + 6);
    ctx.lineTo(x + 4, y + 10);
    ctx.lineTo(x - 4, y + 10);
    ctx.lineTo(x - 12, y + 6);
    ctx.lineTo(x - 14, y);
    ctx.lineTo(x - 6, y - 8);
    ctx.closePath();
    ctx.fillStyle = inner;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawAnimations(t: number): void {
    this.drawBeams(t);
    this.drawTrails(t);
  }

  private drawBeams(t: number): void {
    const ctx = this.ctx;
    const remaining: BeamAnim[] = [];
    for (const beam of this.beamAnims) {
      const elapsed = t - beam.startTime;
      if (elapsed > beam.duration) continue;
      remaining.push(beam);
      const progress = elapsed / beam.duration;
      const alpha = 1 - progress;

      ctx.beginPath();
      ctx.moveTo(beam.fromX, beam.fromY);
      ctx.lineTo(beam.toX, beam.toY);
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = 3 * alpha;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(beam.fromX, beam.fromY);
      ctx.lineTo(beam.toX, beam.toY);
      ctx.strokeStyle = `rgba(100,200,255,${alpha * 0.5})`;
      ctx.lineWidth = 6 * alpha;
      ctx.stroke();
    }
    this.beamAnims = remaining;
  }

  private drawTrails(t: number): void {
    const ctx = this.ctx;
    const remaining: TrailAnim[] = [];
    for (const trail of this.trailAnims) {
      const elapsed = t - trail.startTime;
      if (elapsed > trail.duration) continue;
      remaining.push(trail);
      const progress = elapsed / trail.duration;

      for (let i = 0; i < trail.path.length - 1; i++) {
        const segProgress = (progress * (trail.path.length - 1)) - i;
        if (segProgress <= 0 || segProgress > 1) continue;
        const p = trail.path[i];
        const pNext = trail.path[i + 1];
        const cx = p.x + (pNext.x - p.x) * segProgress;
        const cy = p.y + (pNext.y - p.y) * segProgress;
        const alpha = 1 - progress;
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(69,162,158,${alpha})`;
        ctx.fill();
      }
    }
    this.trailAnims = remaining;
  }

  private drawUI(snapshot: GameSnapshot): void {
    const ctx = this.ctx;
    const panelW = 200;
    const panelH = 180;
    const panelX = 16;
    const panelY = 16;

    ctx.save();
    ctx.beginPath();
    this.roundRect(ctx, panelX, panelY, panelW, panelH, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#C5C6C7';
    ctx.font = '14px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(`回合: ${snapshot.turn}`, panelX + 12, panelY + 12);

    const phaseText = snapshot.phase === TurnPhase.Move ? '移动阶段' :
      snapshot.phase === TurnPhase.Attack ? '攻击阶段' : '结束阶段';
    ctx.fillStyle = '#66FCF1';
    ctx.fillText(`阶段: ${phaseText}`, panelX + 12, panelY + 34);

    const totalEnergy = snapshot.playerShips.filter(s => s.hp > 0).reduce((sum, s) => sum + s.energy, 0);
    ctx.fillStyle = '#1E90FF';
    ctx.fillText(`能量池: ${totalEnergy}`, panelX + 12, panelY + 56);

    ctx.fillStyle = '#C5C6C7';
    ctx.fillText('敌方状态:', panelX + 12, panelY + 80);

    const enemyAlive = snapshot.enemyShips.filter(s => s.hp > 0);
    const enemyTotalHp = enemyAlive.reduce((sum, s) => sum + s.hp, 0);
    ctx.fillStyle = '#FF6666';
    ctx.fillText(`  ${enemyAlive.length}艘存活 | HP: ${enemyTotalHp}`, panelX + 12, panelY + 102);

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '11px "Segoe UI", "Microsoft YaHei", sans-serif';
    const maxLogLines = 4;
    const startIdx = Math.max(0, snapshot.log.length - maxLogLines);
    for (let i = startIdx; i < snapshot.log.length; i++) {
      const line = snapshot.log[i];
      const y = panelY + 126 + (i - startIdx) * 14;
      ctx.fillText(line.length > 20 ? line.slice(0, 20) + '…' : line, panelX + 12, y);
    }

    ctx.restore();

    this.drawPhaseButtons(snapshot);
    this.drawSkillButtons(snapshot);
  }

  private drawPhaseButtons(snapshot: GameSnapshot): void {
    const ctx = this.ctx;
    const btnW = 100;
    const btnH = 32;
    const startX = this.width - btnW - 16;
    const startY = 16;

    if (snapshot.phase === TurnPhase.Move) {
      this.drawButton(startX, startY, btnW, btnH, '攻击阶段 →', '#45A29E');
    } else if (snapshot.phase === TurnPhase.Attack) {
      this.drawButton(startX, startY, btnW, btnH, '结束回合 →', '#FF8844');
    } else {
      this.drawButton(startX, startY, btnW, btnH, '下回合 →', '#66FCF1');
    }
  }

  private drawSkillButtons(snapshot: GameSnapshot): void {
    if (!snapshot.selectedShipId) return;
    const allShips = [...snapshot.playerShips, ...snapshot.enemyShips];
    const ship = allShips.find(s => s.id === snapshot.selectedShipId);
    if (!ship || ship.faction !== Faction.Player || ship.hp <= 0) return;

    const ctx = this.ctx;
    const btnW = 90;
    const btnH = 28;
    const startX = this.width - btnW - 16;
    const startY = 56;

    ship.skills.forEach((skill, i) => {
      const y = startY + i * (btnH + 6);
      const canUse = ship.energy >= skill.energyCost && !ship.silenced && !ship.skillUsedThisTurn;
      const bgColor = canUse ? '#45A29E' : '#333';
      this.drawButton(startX, y, btnW, btnH, `${skill.name}`, bgColor, canUse ? 1 : 0.4);
      ctx.fillStyle = canUse ? '#C5C6C7' : '#666';
      ctx.font = '10px "Segoe UI", "Microsoft YaHei", sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(`${skill.energyCost}能量`, startX + 4, y + btnH - 14);
    });
  }

  private drawButton(x: number, y: number, w: number, h: number, text: string, color: string, alpha = 1): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    this.roundRect(ctx, x, y, w, h, 6);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '12px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  private drawShipDetailCard(snapshot: GameSnapshot): void {
    if (!snapshot.selectedShipId) return;
    const allShips = [...snapshot.playerShips, ...snapshot.enemyShips];
    const ship = allShips.find(s => s.id === snapshot.selectedShipId);
    if (!ship || ship.hp <= 0) return;

    const ctx = this.ctx;
    const cardW = 220;
    const cardH = 140;
    const cardX = this.width - cardW - 16;
    const cardY = this.height - cardH - 16;

    ctx.save();
    ctx.beginPath();
    this.roundRect(ctx, cardX, cardY, cardW, cardH, 16);
    ctx.fillStyle = 'rgba(11,12,16,0.85)';
    ctx.fill();
    ctx.shadowColor = '#66FCF1';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = 'rgba(102,252,241,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#66FCF1';
    ctx.font = 'bold 14px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(ship.name, cardX + 14, cardY + 12);

    const typeLabel = ship.type === ShipType.Frigate ? '护卫舰' :
      ship.type === ShipType.Destroyer ? '驱逐舰' : '战列舰';
    ctx.fillStyle = '#888';
    ctx.font = '11px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillText(typeLabel, cardX + 14, cardY + 32);

    const barX = cardX + 14;
    const barW = cardW - 28;
    const barH = 10;

    const hpY = cardY + 52;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    this.roundRectFill(ctx, barX, hpY, barW, barH, 3);
    const hpRatio = ship.hp / ship.maxHp;
    const hpGrad = ctx.createLinearGradient(barX, hpY, barX + barW, hpY);
    if (hpRatio < 0.3) {
      hpGrad.addColorStop(0, '#FF3333');
      hpGrad.addColorStop(1, '#FF6644');
    } else {
      hpGrad.addColorStop(0, '#33CC33');
      hpGrad.addColorStop(1, '#66FF66');
    }
    ctx.fillStyle = hpGrad;
    this.roundRectFill(ctx, barX, hpY, barW * hpRatio, barH, 3);
    ctx.fillStyle = '#fff';
    ctx.font = '10px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillText(`HP: ${ship.hp}/${ship.maxHp}`, barX, hpY + barH + 3);

    const enY = hpY + barH + 18;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    this.roundRectFill(ctx, barX, enY, barW, barH, 3);
    const enRatio = ship.energy / ship.maxEnergy;
    const enGrad = ctx.createLinearGradient(barX, enY, barX + barW, enY);
    enGrad.addColorStop(0, '#1E90FF');
    enGrad.addColorStop(1, '#00BFFF');
    ctx.fillStyle = enGrad;
    this.roundRectFill(ctx, barX, enY, barW * enRatio, barH, 3);

    const flowOffset = (performance.now() % 2000) / 2000;
    ctx.fillStyle = `rgba(255,255,255,${0.15 + 0.1 * Math.sin(flowOffset * Math.PI * 2)})`;
    const flowX = barX + barW * enRatio * flowOffset;
    ctx.fillRect(flowX, enY, 8, barH);

    ctx.fillStyle = '#fff';
    ctx.font = '10px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillText(`能量: ${ship.energy}/${ship.maxEnergy}`, barX, enY + barH + 3);

    ctx.fillStyle = '#C5C6C7';
    ctx.font = '10px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillText(`攻击:${ship.attack} 速度:${ship.speed}`, barX, enY + barH + 18);

    if (ship.shieldActive) {
      ctx.fillStyle = '#66CCFF';
      ctx.fillText(`护盾: ${ship.shieldTurnsLeft}回合`, barX + 110, enY + barH + 18);
    }
    if (ship.silenced) {
      ctx.fillStyle = '#FF6666';
      ctx.fillText('沉默中', barX + 110, enY + barH + 18);
    }

    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
  }

  private roundRectFill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    if (w <= 0) return;
    ctx.beginPath();
    this.roundRect(ctx, x, y, w, h, r);
    ctx.fill();
  }

  getOffset(): { x: number; y: number } {
    return { x: this.offsetX, y: this.offsetY };
  }

  getPhaseButtonRect(snapshot: GameSnapshot): { x: number; y: number; w: number; h: number } | null {
    const btnW = 100;
    const btnH = 32;
    const startX = this.width - btnW - 16;
    const startY = 16;
    return { x: startX, y: startY, w: btnW, h: btnH };
  }

  getSkillButtonRects(snapshot: GameSnapshot): { x: number; y: number; w: number; h: number; skillType: SkillType }[] {
    if (!snapshot.selectedShipId) return [];
    const allShips = [...snapshot.playerShips, ...snapshot.enemyShips];
    const ship = allShips.find(s => s.id === snapshot.selectedShipId);
    if (!ship || ship.faction !== Faction.Player || ship.hp <= 0) return [];

    const btnW = 90;
    const btnH = 28;
    const startX = this.width - btnW - 16;
    const startY = 56;

    return ship.skills.map((skill, i) => ({
      x: startX,
      y: startY + i * (btnH + 6),
      w: btnW,
      h: btnH,
      skillType: skill.type,
    }));
  }

  renderGameOver(winner: Faction): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = winner === Faction.Player ? '#66FCF1' : '#FF4444';
    ctx.font = 'bold 48px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = winner === Faction.Player ? '胜 利' : '战 败';
    ctx.fillText(text, this.width / 2, this.height / 2 - 20);

    ctx.fillStyle = '#C5C6C7';
    ctx.font = '18px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillText('点击任意处重新开始', this.width / 2, this.height / 2 + 30);
    ctx.textAlign = 'left';
  }
}

function isValidHexCoord(q: number, r: number): boolean {
  if (q < 0 || q >= GRID_SIZE || r < 0 || r >= GRID_SIZE) return false;
  if (q + r < 0 || q + r >= GRID_SIZE * 2 - 1) return false;
  return true;
}
