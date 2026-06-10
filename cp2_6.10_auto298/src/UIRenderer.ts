import {
  Rune,
  RuneElement,
  ELEMENT_COLORS,
  ELEMENT_NAMES,
  GRID_SIZE,
  CELL_SIZE,
  RECIPES,
  Recipe,
  HistoryEntry,
  BackgroundParticle,
  MAX_HISTORY,
} from './types';
import { Grid } from './Grid';
import { DragSystem } from './DragSystem';
import { SynthesisEngine } from './SynthesisEngine';
import { EventManager } from './EventManager';

export class UIRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private grid: Grid;
  private dragSystem: DragSystem;
  private synthesisEngine: SynthesisEngine;
  private eventManager: EventManager;
  private history: HistoryEntry[] = [];
  private backgroundParticles: BackgroundParticle[] = [];
  private hoveredRecipe: number = -1;
  private scale: number = 1;
  private baseWidth: number = 1280;
  private baseHeight: number = 800;

  constructor(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    grid: Grid,
    dragSystem: DragSystem,
    synthesisEngine: SynthesisEngine,
    eventManager: EventManager
  ) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.grid = grid;
    this.dragSystem = dragSystem;
    this.synthesisEngine = synthesisEngine;
    this.eventManager = eventManager;
    this.initBackgroundParticles();
    this.bindMouseMove();
  }

  private initBackgroundParticles(): void {
    for (let i = 0; i < 50; i++) {
      this.backgroundParticles.push({
        x: Math.random() * this.baseWidth,
        y: Math.random() * this.baseHeight,
        baseY: Math.random() * this.baseHeight,
        size: 1 + Math.random() * 2,
        opacity: 0.2 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.5,
      });
    }
  }

  private bindMouseMove(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;
      this.checkRecipeHover(mx, my);
    });
  }

  private checkRecipeHover(mx: number, my: number): void {
    const recipeX = this.baseWidth - 200;
    const recipeY = 200;
    const cardHeight = 80;
    const cardGap = 10;

    this.hoveredRecipe = -1;
    for (let i = 0; i < RECIPES.length; i++) {
      const y = recipeY + i * (cardHeight + cardGap);
      if (mx >= recipeX && mx <= recipeX + 180 && my >= y && my <= y + cardHeight) {
        this.hoveredRecipe = i;
        break;
      }
    }
  }

  addHistory(recipeName: string, resultName: string): void {
    const entry: HistoryEntry = {
      id: String(Date.now()),
      recipeName,
      resultName,
      timestamp: Date.now(),
      slideIn: 0,
    };
    this.history.unshift(entry);
    if (this.history.length > MAX_HISTORY) {
      this.history.pop();
    }
  }

  resize(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const scale = Math.min(w / this.baseWidth, h / this.baseHeight);
    this.scale = scale;

    this.canvas.width = this.baseWidth;
    this.canvas.height = this.baseHeight;
    this.canvas.style.width = `${this.baseWidth * scale}px`;
    this.canvas.style.height = `${this.baseHeight * scale}px`;
  }

  render(time: number, deltaTime: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawBackground(time, deltaTime);
    this.drawGrid(time);
    this.drawHistory(deltaTime);
    this.drawRecipes();
    this.drawDrawer(time);
    this.drawEnergyBar();
    this.drawScore();
    this.drawLightBeam();
    this.drawParticles();
    this.drawBreakParticles();
    this.drawDragRune(time);
    this.drawRampageIndicators(time);
    this.drawEdgeFlash();
    this.drawEventText();
  }

  private drawBackground(time: number, deltaTime: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (const p of this.backgroundParticles) {
      p.phase += deltaTime * 0.001 * p.speed;
      p.y = p.baseY + Math.sin(p.phase) * 20;
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  private drawGrid(time: number): void {
    const ctx = this.ctx;
    const gridPixelSize = GRID_SIZE * CELL_SIZE;

    ctx.fillStyle = '#5d4037';
    ctx.fillRect(
      this.grid.offsetX - 8,
      this.grid.offsetY - 8,
      gridPixelSize + 16,
      gridPixelSize + 16
    );

    ctx.fillStyle = '#4e342e';
    ctx.fillRect(this.grid.offsetX, this.grid.offsetY, gridPixelSize, gridPixelSize);

    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 2;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(this.grid.offsetX + i * CELL_SIZE, this.grid.offsetY);
      ctx.lineTo(this.grid.offsetX + i * CELL_SIZE, this.grid.offsetY + gridPixelSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this.grid.offsetX, this.grid.offsetY + i * CELL_SIZE);
      ctx.lineTo(this.grid.offsetX + gridPixelSize, this.grid.offsetY + i * CELL_SIZE);
      ctx.stroke();
    }

    if (this.hoveredRecipe >= 0) {
      this.drawRecipeGuide(RECIPES[this.hoveredRecipe]);
    }

    const runes = this.grid.getPlacedRunes();
    for (const rune of runes) {
      this.drawRune(rune, time);
    }

    if (this.dragSystem.isElasticActive()) {
      const pos = this.dragSystem.getElasticPosition();
      const scale = this.dragSystem.getElasticScale();
      const dragRune = this.dragSystem.getDragRune();
      if (!dragRune) return;
      this.drawFloatingRune(dragRune.element, pos.x, pos.y, scale, time);
    }
  }

  private drawRecipeGuide(recipe: Recipe): void {
    const ctx = this.ctx;
    const patterns: Record<string, { dx: number; dy: number }[]> = {
      line3: [
        { dx: 0, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: 2, dy: 0 },
      ],
      triangle: [
        { dx: 0, dy: 0 },
        { dx: 2, dy: 0 },
        { dx: 1, dy: 1 },
      ],
      lshape: [
        { dx: 0, dy: 0 },
        { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },
      ],
      hexagon: [
        { dx: 1, dy: 0 },
        { dx: 2, dy: 0 },
        { dx: 0, dy: 1 },
        { dx: 3, dy: 1 },
        { dx: 1, dy: 2 },
        { dx: 2, dy: 2 },
      ],
    };

    const pattern = patterns[recipe.id];
    if (!pattern) return;

    const centerX = Math.floor(GRID_SIZE / 2) - 2;
    const centerY = Math.floor(GRID_SIZE / 2) - 1;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    for (const p of pattern) {
      const x = this.grid.offsetX + (centerX + p.dx) * CELL_SIZE;
      const y = this.grid.offsetY + (centerY + p.dy) * CELL_SIZE;
      ctx.strokeRect(x + 4, y + 4, CELL_SIZE - 8, CELL_SIZE - 8);
    }

    ctx.setLineDash([]);
  }

  private drawRune(rune: Rune, time: number): void {
    if (rune.isDormant) {
      this.drawDormantRune(rune);
    } else {
      this.drawFloatingRune(rune.element, rune.x, rune.y, rune.scale, time, rune.glowIntensity);
    }
  }

  private drawDormantRune(rune: Rune): void {
    const ctx = this.ctx;
    const size = CELL_SIZE * 0.7;
    ctx.fillStyle = '#555555';
    ctx.fillRect(rune.x - size / 2, rune.y - size / 2, size, size);

    ctx.fillStyle = '#777777';
    ctx.fillRect(rune.x - size / 2 + 4, rune.y - size / 2 + 4, size - 8, size - 8);

    ctx.fillStyle = '#444444';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Z', rune.x, rune.y);
  }

  private drawFloatingRune(
    element: RuneElement,
    x: number,
    y: number,
    scale: number = 1,
    time: number = 0,
    glowIntensity: number = 0.5
  ): void {
    const ctx = this.ctx;
    const color = ELEMENT_COLORS[element];
    const baseSize = CELL_SIZE * 0.7 * scale;
    const size = baseSize;

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 8 + glowIntensity * 12;

    ctx.fillStyle = color;
    ctx.fillRect(x - size / 2, y - size / 2, size, size);

    ctx.fillStyle = this.lightenColor(color, 40);
    ctx.fillRect(x - size / 2 + 3, y - size / 2 + 3, size - 6, size - 6);

    ctx.fillStyle = color;
    ctx.fillRect(x - size / 2 + 6, y - size / 2 + 6, size - 12, size - 12);

    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.floor(14 * scale)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ELEMENT_NAMES[element], x, y);
  }

  private lightenColor(hex: string, amount: number): string {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
    return `rgb(${r},${g},${b})`;
  }

  private drawDrawer(time: number): void {
    const ctx = this.ctx;
    const drawerX = this.baseWidth - 200;
    const drawerY = 580;
    const drawerWidth = 180;
    const drawerHeight = 190;

    ctx.fillStyle = '#4e342e';
    this.roundRect(ctx, drawerX, drawerY, drawerWidth, drawerHeight, 12);
    ctx.fill();

    ctx.strokeStyle = '#d4a574';
    ctx.lineWidth = 3;
    this.roundRect(ctx, drawerX, drawerY, drawerWidth, drawerHeight, 12);
    ctx.stroke();

    ctx.fillStyle = '#d4a574';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('符文抽屉', drawerX + drawerWidth / 2, drawerY + 28);

    const slots = this.dragSystem.getDrawerSlots();
    for (let i = 0; i < slots.length; i++) {
      const pos = this.dragSystem.getDrawerSlotPosition(i);
      const slot = slots[i];
      const color = ELEMENT_COLORS[slot.element];

      ctx.fillStyle = '#3e2723';
      this.roundRect(ctx, pos.x, pos.y, pos.width, pos.height, 8);
      ctx.fill();

      if (slot.count > 0) {
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.fillStyle = color;
        this.roundRect(ctx, pos.x + 8, pos.y + 8, pos.width - 16, pos.height - 20, 4);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ELEMENT_NAMES[slot.element], pos.x + pos.width / 2, pos.y + pos.height / 2 - 5);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`×${slot.count}`, pos.x + pos.width / 2, pos.y + pos.height - 10);
      } else {
        ctx.fillStyle = '#555555';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('空', pos.x + pos.width / 2, pos.y + pos.height / 2);
      }
    }
  }

  private drawHistory(deltaTime: number): void {
    const ctx = this.ctx;
    const panelX = 20;
    const panelY = 80;
    const panelWidth = 200;

    ctx.fillStyle = '#d4a574';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('合成记录', panelX, panelY);

    const cardHeight = 50;
    const cardGap = 6;

    for (let i = 0; i < this.history.length; i++) {
      const entry = this.history[i];
      if (entry.slideIn < 1) {
        entry.slideIn = Math.min(1, entry.slideIn + deltaTime / 300);
      }

      const y = panelY + 20 + i * (cardHeight + cardGap);
      const slideOffset = (1 - entry.slideIn) * -50;
      const x = panelX + slideOffset;
      const alpha = entry.slideIn;

      ctx.globalAlpha = alpha;

      ctx.fillStyle = '#d7ccc8';
      this.roundRect(ctx, x, y, panelWidth, cardHeight, 4);
      ctx.fill();

      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 2;
      this.roundRect(ctx, x, y, panelWidth, cardHeight, 4);
      ctx.stroke();

      ctx.fillStyle = '#3e2723';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(entry.recipeName, x + 10, y + 20);

      ctx.fillStyle = '#5d4037';
      ctx.font = '11px monospace';
      ctx.fillText(`→ ${entry.resultName}`, x + 10, y + 38);

      ctx.globalAlpha = 1;
    }
  }

  private drawRecipes(): void {
    const ctx = this.ctx;
    const recipeX = this.baseWidth - 200;
    const recipeY = 200;
    const cardHeight = 80;
    const cardGap = 10;

    ctx.fillStyle = '#d4a574';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('合成配方', recipeX, recipeY - 10);

    for (let i = 0; i < RECIPES.length; i++) {
      const recipe = RECIPES[i];
      const y = recipeY + i * (cardHeight + cardGap);
      const isHovered = this.hoveredRecipe === i;

      ctx.fillStyle = isHovered ? '#5d4037' : '#4e342e';
      this.roundRect(ctx, recipeX, y, 180, cardHeight, 8);
      ctx.fill();

      ctx.strokeStyle = isHovered ? '#ffcc80' : '#d4a574';
      ctx.lineWidth = 2;
      this.roundRect(ctx, recipeX, y, 180, cardHeight, 8);
      ctx.stroke();

      ctx.fillStyle = '#ffcc80';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(recipe.name, recipeX + 10, y + 22);

      ctx.fillStyle = '#d7ccc8';
      ctx.font = '11px monospace';
      ctx.fillText(recipe.description, recipeX + 10, y + 40);

      ctx.fillStyle = '#a5d6a7';
      ctx.fillText(`产出: ${recipe.resultName}`, recipeX + 10, y + 56);

      ctx.fillStyle = '#ffab91';
      ctx.fillText(`耗能: ${recipe.energyCost}`, recipeX + 10, y + 72);

      ctx.fillStyle = '#ffd54f';
      ctx.textAlign = 'right';
      ctx.fillText(`+${recipe.scoreBonus}分`, recipeX + 170, y + 72);
    }
  }

  private drawEnergyBar(): void {
    const ctx = this.ctx;
    const barX = this.canvas.width / 2 - 200;
    const barY = 30;
    const barWidth = 400;
    const barHeight = 30;

    const energy = this.synthesisEngine.getEnergy();
    const ratio = energy / 100;

    ctx.fillStyle = '#ffffff';
    this.roundRect(ctx, barX, barY, barWidth, barHeight, 4);
    ctx.fill();

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    this.roundRect(ctx, barX, barY, barWidth, barHeight, 4);
    ctx.stroke();

    const innerPadding = 3;
    const innerWidth = (barWidth - innerPadding * 2) * ratio;

    let offsetX = 0;
    if (energy < 20) {
      offsetX = Math.sin(Date.now() * 0.02) * 2;
    }

    const gradient = ctx.createLinearGradient(barX + innerPadding + offsetX, 0, barX + innerPadding + innerWidth, 0);
    gradient.addColorStop(0, '#4caf50');
    gradient.addColorStop(0.5, '#ffeb3b');
    gradient.addColorStop(1, '#f44336');

    ctx.fillStyle = gradient;
    ctx.fillRect(
      barX + innerPadding + offsetX,
      barY + innerPadding,
      Math.max(0, innerWidth),
      barHeight - innerPadding * 2
    );

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`能量: ${Math.floor(energy)} / 100`, barX + barWidth / 2, barY + barHeight / 2);
  }

  private drawScore(): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#ffd54f';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`分数: ${this.synthesisEngine.getScore()}`, this.canvas.width - 30, 55);
  }

  private drawLightBeam(): void {
    if (!this.synthesisEngine.lightBeam.active) return;

    const ctx = this.ctx;
    const beam = this.synthesisEngine.lightBeam;
    const t = beam.progress;

    ctx.globalAlpha = Math.sin(t * Math.PI);
    const gradient = ctx.createLinearGradient(beam.x, beam.y - 300, beam.x, beam.y + 100);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.3, beam.color);
    gradient.addColorStop(1, 'rgba(255,255,255,0.8)');

    ctx.fillStyle = gradient;
    const beamWidth = 40 + t * 30;
    ctx.fillRect(beam.x - beamWidth / 2, beam.y - 300, beamWidth, 400);

    ctx.globalAlpha = 1;
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    for (const p of this.synthesisEngine.particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  private drawBreakParticles(): void {
    const ctx = this.ctx;
    for (const p of this.dragSystem.breakParticles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  private drawDragRune(time: number): void {
    if (!this.dragSystem.isDragging()) return;
    const rune = this.dragSystem.getDragRune();
    if (!rune) return;
    this.drawFloatingRune(rune.element, rune.x, rune.y, 1.2, time, 0.8);
  }

  private drawRampageIndicators(time: number): void {
    const ctx = this.ctx;
    const positions = this.eventManager.rampageChargedPositions;
    for (const pos of positions) {
      const world = this.grid.gridToWorld(pos.x, pos.y);
      const flash = (Math.sin(time * 0.01) + 1) * 0.5;
      ctx.globalAlpha = 0.5 + flash * 0.5;
      ctx.strokeStyle = '#ff6b35';
      ctx.lineWidth = 4;
      ctx.strokeRect(world.x - CELL_SIZE / 2 + 2, world.y - CELL_SIZE / 2 + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    }
    ctx.globalAlpha = 1;
  }

  private drawEdgeFlash(): void {
    if (!this.eventManager.edgeFlash.active) return;

    const ctx = this.ctx;
    const alpha = this.eventManager.edgeFlash.alpha;
    const color = this.eventManager.edgeFlash.color;

    ctx.save();
    ctx.globalAlpha = alpha * 0.6;
    const gradient = ctx.createRadialGradient(
      this.canvas.width / 2,
      this.canvas.height / 2,
      Math.min(this.canvas.width, this.canvas.height) * 0.3,
      this.canvas.width / 2,
      this.canvas.height / 2,
      Math.max(this.canvas.width, this.canvas.height) * 0.7
    );
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, color);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.restore();
  }

  private drawEventText(): void {
    if (!this.eventManager.eventText.active) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = this.eventManager.eventText.alpha;
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#000000';
    ctx.fillText(
      this.eventManager.eventText.text,
      this.canvas.width / 2 + 2,
      this.eventManager.eventText.y + 2
    );

    ctx.fillStyle = '#ffffff';
    ctx.fillText(
      this.eventManager.eventText.text,
      this.canvas.width / 2,
      this.eventManager.eventText.y
    );
    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
