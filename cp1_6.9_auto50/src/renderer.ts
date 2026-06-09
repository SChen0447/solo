import { ReactionEngine, ContainerState } from './reactionEngine';
import { CHEMICALS, Chemical, getChemicalsByDrawer } from './chemicalData';

interface DrawerState {
  open: boolean;
  animationProgress: number;
}

interface DraggingState {
  chemicalId: string;
  x: number;
  y: number;
  scale: number;
}

interface BottlePosition {
  chemical: Chemical;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class LabRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private engine: ReactionEngine;
  private width: number;
  private height: number;
  private drawers: DrawerState[];
  private dragging: DraggingState | null;
  private bottlePositions: BottlePosition[][];
  private hoveredDrawer: number | null;
  private hoveredBottle: { drawer: number; index: number } | null;
  private thermometerFrame: number;
  private lastTime: number;
  private animationId: number | null;
  private onReaction: ((chemicalId: string) => void) | null;
  private onClear: (() => void) | null;
  private onSwitchContainer: (() => void) | null;

  constructor(canvas: HTMLCanvasElement, engine: ReactionEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.engine = engine;
    this.width = canvas.width;
    this.height = canvas.height;
    this.drawers = [
      { open: false, animationProgress: 0 },
      { open: false, animationProgress: 0 },
      { open: false, animationProgress: 0 }
    ];
    this.dragging = null;
    this.bottlePositions = [[], [], []];
    this.hoveredDrawer = null;
    this.hoveredBottle = null;
    this.thermometerFrame = 0;
    this.lastTime = performance.now();
    this.animationId = null;
    this.onReaction = null;
    this.onClear = null;
    this.onSwitchContainer = null;

    this.setupEventListeners();
    this.calculateBottlePositions();
  }

  setOnReaction(callback: (chemicalId: string) => void): void {
    this.onReaction = callback;
  }

  setOnClear(callback: () => void): void {
    this.onClear = callback;
  }

  setOnSwitchContainer(callback: () => void): void {
    this.onSwitchContainer = callback;
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
  }

  private getMousePos(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private calculateBottlePositions(): void {
    const drawerWidth = 180;
    const drawerHeight = 120;
    const drawerX = 20;
    const bottleWidth = 50;
    const bottleHeight = 70;
    const padding = 15;

    for (let d = 0; d < 3; d++) {
      const drawerY = 80 + d * 140;
      const chemicals = getChemicalsByDrawer(d + 1);
      this.bottlePositions[d] = [];

      chemicals.forEach((chemical, i) => {
        const cols = chemicals.length <= 3 ? chemicals.length : 4;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = drawerX + padding + col * (bottleWidth + padding);
        const y = drawerY + 20 + row * (bottleHeight + 10);
        this.bottlePositions[d].push({ chemical, x, y, width: bottleWidth, height: bottleHeight });
      });
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    const pos = this.getMousePos(e);
    this.checkBottleClick(pos.x, pos.y);
    this.checkButtonClick(pos.x, pos.y);
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const pos = this.getMousePos(e.touches[0]);
      this.checkBottleClick(pos.x, pos.y);
      this.checkButtonClick(pos.x, pos.y);
    }
  }

  private checkBottleClick(x: number, y: number): void {
    for (let d = 0; d < 3; d++) {
      if (this.drawers[d].animationProgress < 0.5) continue;

      for (let i = 0; i < this.bottlePositions[d].length; i++) {
        const bp = this.bottlePositions[d][i];
        if (x >= bp.x && x <= bp.x + bp.width && y >= bp.y && y <= bp.y + bp.height) {
          this.dragging = {
            chemicalId: bp.chemical.id,
            x,
            y,
            scale: 1.0
          };
          return;
        }
      }
    }
  }

  private checkButtonClick(x: number, y: number): void {
    const clearBtn = this.getClearButtonRect();
    if (x >= clearBtn.x && x <= clearBtn.x + clearBtn.width && y >= clearBtn.y && y <= clearBtn.y + clearBtn.height) {
      if (this.onClear) this.onClear();
      return;
    }

    const beakerBtn = this.getBeakerButtonRect();
    if (x >= beakerBtn.x && x <= beakerBtn.x + beakerBtn.width && y >= beakerBtn.y && y <= beakerBtn.y + beakerBtn.height) {
      if (this.onSwitchContainer) this.onSwitchContainer();
      return;
    }

    const testtubeBtn = this.getTestTubeButtonRect();
    if (x >= testtubeBtn.x && x <= testtubeBtn.x + testtubeBtn.width && y >= testtubeBtn.y && y <= testtubeBtn.y + testtubeBtn.height) {
      if (this.onSwitchContainer) this.onSwitchContainer();
      return;
    }

    for (let d = 0; d < 3; d++) {
      const rect = this.getDrawerHandleRect(d);
      if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
        this.toggleDrawer(d);
        return;
      }
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const pos = this.getMousePos(e);
    this.updateHoverState(pos.x, pos.y);

    if (this.dragging) {
      this.dragging.x = pos.x;
      this.dragging.y = pos.y;
      this.dragging.scale = 1.1 + Math.sin(performance.now() / 100) * 0.05;
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0 && this.dragging) {
      const pos = this.getMousePos(e.touches[0]);
      this.dragging.x = pos.x;
      this.dragging.y = pos.y;
      this.dragging.scale = 1.15;
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    const pos = this.getMousePos(e);
    this.checkDrop(pos.x, pos.y);
  }

  private handleTouchEnd(e: TouchEvent): void {
    if (e.changedTouches.length > 0 && this.dragging) {
      const pos = this.getMousePos(e.changedTouches[0]);
      this.checkDrop(pos.x, pos.y);
    }
  }

  private handleMouseLeave(): void {
    this.hoveredDrawer = null;
    this.hoveredBottle = null;
    if (this.dragging) {
      this.dragging = null;
    }
  }

  private checkDrop(x: number, y: number): void {
    if (!this.dragging) return;

    const container = this.getContainerRect();
    if (x >= container.x && x <= container.x + container.width && y >= container.y && y <= container.y + container.height) {
      if (this.onReaction) {
        this.onReaction(this.dragging.chemicalId);
      }
    }
    this.dragging = null;
  }

  private updateHoverState(x: number, y: number): void {
    this.hoveredDrawer = null;
    this.hoveredBottle = null;

    for (let d = 0; d < 3; d++) {
      const rect = this.getDrawerHandleRect(d);
      if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
        this.hoveredDrawer = d;
        return;
      }

      if (this.drawers[d].animationProgress > 0.5) {
        for (let i = 0; i < this.bottlePositions[d].length; i++) {
          const bp = this.bottlePositions[d][i];
          if (x >= bp.x && x <= bp.x + bp.width && y >= bp.y && y <= bp.y + bp.height) {
            this.hoveredBottle = { drawer: d, index: i };
            return;
          }
        }
      }
    }
  }

  private toggleDrawer(index: number): void {
    this.drawers[index].open = !this.drawers[index].open;
  }

  private getDrawerHandleRect(drawerIndex: number): { x: number; y: number; width: number; height: number } {
    const x = 20;
    const y = 50 + drawerIndex * 140;
    return { x, y, width: 180, height: 30 };
  }

  private getContainerRect(): { x: number; y: number; width: number; height: number } {
    const state = this.engine.getState();
    if (state.containerType === 'beaker') {
      return { x: 340, y: 150, width: 180, height: 200 };
    }
    return { x: 380, y: 120, width: 100, height: 260 };
  }

  private getClearButtonRect(): { x: number; y: number; width: number; height: number } {
    return { x: 330, y: 420, width: 200, height: 50 };
  }

  private getBeakerButtonRect(): { x: number; y: number; width: number; height: number } {
    return { x: 340, y: 370, width: 90, height: 40 };
  }

  private getTestTubeButtonRect(): { x: number; y: number; width: number; height: number } {
    return { x: 440, y: 370, width: 90, height: 40 };
  }

  start(): void {
    this.animate();
  }

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private animate(): void {
    const now = performance.now();
    const delta = (now - this.lastTime) / 1000;
    this.lastTime = now;

    this.update(delta);
    this.render();
    this.thermometerFrame++;

    this.animationId = requestAnimationFrame(() => this.animate());
  }

  private update(delta: number): void {
    this.engine.update();

    this.drawers.forEach(drawer => {
      const target = drawer.open ? 1 : 0;
      const speed = delta / 0.3;
      if (drawer.animationProgress < target) {
        drawer.animationProgress = Math.min(target, drawer.animationProgress + speed);
      } else if (drawer.animationProgress > target) {
        drawer.animationProgress = Math.max(target, drawer.animationProgress - speed);
      }
    });

    if (this.dragging) {
      this.dragging.scale = 1.1 + Math.sin(performance.now() / 150) * 0.08;
    }
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground();
    this.drawGrid();
    this.drawCabinet();
    this.drawDrawers();
    this.drawThermometer();
    this.drawContainer();
    this.drawButtons();
    this.drawDraggingBottle();
    this.drawInfoPanel();
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#2c3e50');
    gradient.addColorStop(1, '#1a252f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawGrid(): void {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(52, 152, 219, 0.05)';
    ctx.lineWidth = 1;

    for (let x = 0; x < this.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }

    for (let y = 0; y < this.height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
  }

  private drawCabinet(): void {
    const ctx = this.ctx;

    ctx.fillStyle = '#34495e';
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 3;

    this.roundRect(ctx, 10, 40, 200, 420, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#3498db';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('药 品 柜', 110, 65);
  }

  private drawDrawers(): void {
    const ctx = this.ctx;
    const drawerLabels = ['酸 类', '碱 类', '盐/指示剂'];

    for (let d = 0; d < 3; d++) {
      const drawer = this.drawers[d];
      const baseY = 50 + d * 140;
      const offset = drawer.animationProgress * 100;
      const handleY = baseY - offset;
      const isHovered = this.hoveredDrawer === d;

      ctx.fillStyle = isHovered ? '#4a6278' : '#3d566e';
      ctx.strokeStyle = '#2c3e50';
      ctx.lineWidth = 2;
      this.roundRect(ctx, 20, handleY, 180, 30, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#95a5a6';
      ctx.fillRect(95, handleY + 10, 30, 10);
      this.roundRect(ctx, 93, handleY + 8, 34, 14, 3);
      ctx.strokeStyle = '#7f8c8d';
      ctx.stroke();

      ctx.fillStyle = '#ecf0f1';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(drawerLabels[d], 110, handleY + 22);

      if (drawer.animationProgress > 0.1) {
        const contentY = handleY + 30;
        const contentHeight = 110 * drawer.animationProgress;

        ctx.fillStyle = 'rgba(44, 62, 80, 0.95)';
        this.roundRect(ctx, 20, contentY, 180, contentHeight, 4);
        ctx.fill();
        ctx.strokeStyle = '#2c3e50';
        ctx.stroke();

        if (drawer.animationProgress > 0.5) {
          this.bottlePositions[d].forEach((bp, i) => {
            const isHovered = this.hoveredBottle?.drawer === d && this.hoveredBottle?.index === i;
            this.drawBottle(bp.x, bp.y, bp.chemical, isHovered ? 1.05 : 1.0);
          });
        }
      }
    }
  }

  private drawBottle(x: number, y: number, chemical: Chemical, scale: number = 1.0): void {
    const ctx = this.ctx;
    const w = 50 * scale;
    const h = 70 * scale;

    ctx.save();
    ctx.translate(x + 25, y + 35);
    ctx.scale(scale, scale);
    ctx.translate(-25, -35);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    this.roundRect(ctx, 5, 15, 40, 50, 4);
    ctx.fill();
    ctx.stroke();

    const liquidY = 25;
    const liquidH = 35;
    ctx.fillStyle = chemical.color + 'cc';
    this.roundRect(ctx, 7, liquidY, 36, liquidH, 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(9, liquidY + 2, 6, liquidH - 4);

    ctx.fillStyle = '#7f8c8d';
    this.roundRect(ctx, 12, 5, 26, 12, 2);
    ctx.fill();
    ctx.strokeStyle = '#6c7a7b';
    ctx.stroke();

    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(chemical.name, 25, 68);
    ctx.font = '6px sans-serif';
    ctx.fillStyle = '#bdc3c7';
    ctx.fillText(chemical.formula + ' ' + chemical.concentration, 25, 76);

    ctx.restore();
  }

  private drawDraggingBottle(): void {
    if (!this.dragging) return;
    const chemical = CHEMICALS.find(c => c.id === this.dragging.chemicalId);
    if (!chemical) return;

    this.drawBottle(this.dragging.x - 25 * this.dragging.scale, this.dragging.y - 35 * this.dragging.scale, chemical, this.dragging.scale);
  }

  private drawContainer(): void {
    const state = this.engine.getState();
    if (state.containerType === 'beaker') {
      this.drawBeaker();
    } else {
      this.drawTestTube();
    }
  }

  private drawBeaker(): void {
    const ctx = this.ctx;
    const state = this.engine.getState();
    const x = 340;
    const y = 150;
    const w = 180;
    const h = 200;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';

    ctx.beginPath();
    ctx.moveTo(x + 10, y);
    ctx.lineTo(x, y + h - 15);
    ctx.quadraticCurveTo(x, y + h, x + 15, y + h);
    ctx.lineTo(x + w - 15, y + h);
    ctx.quadraticCurveTo(x + w, y + h, x + w, y + h - 15);
    ctx.lineTo(x + w - 10, y);
    ctx.lineTo(x + 10, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const levelY = y + h - i * 40;
      ctx.beginPath();
      ctx.moveTo(x + 5, levelY);
      ctx.lineTo(x + 20, levelY);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText((i * 25) + 'ml', x + 25, levelY + 4);
    }

    if (state.liquidLevel > 0) {
      this.drawLiquid(x + 5, y + 10, w - 10, h - 10, state);
    }

    this.drawDrops(x + w / 2, y, state);
    this.drawRipples(x, y, w, h, state);
    this.drawPrecipitate(x, y, w, h, state);
    this.drawBubbles(x, y, w, h, state);
  }

  private drawTestTube(): void {
    const ctx = this.ctx;
    const state = this.engine.getState();
    const x = 380;
    const y = 120;
    const w = 100;
    const h = 260;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';

    ctx.beginPath();
    ctx.moveTo(x + 10, y);
    ctx.lineTo(x + 10, y + h - 50);
    ctx.quadraticCurveTo(x + 10, y + h - 10, x + w / 2, y + h - 10);
    ctx.quadraticCurveTo(x + w - 10, y + h - 10, x + w - 10, y + h - 50);
    ctx.lineTo(x + w - 10, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (state.liquidLevel > 0) {
      this.drawLiquid(x + 10, y + 10, w - 20, h - 20, state, true);
    }

    this.drawDrops(x + w / 2, y, state);
    this.drawRipples(x, y, w, h, state);
    this.drawPrecipitate(x, y, w, h, state);
    this.drawBubbles(x, y, w, h, state);
  }

  private drawLiquid(x: number, y: number, w: number, h: number, state: ContainerState, isTube: boolean = false): void {
    const ctx = this.ctx;
    const liquidHeight = (state.liquidLevel / 100) * (h - 30);
    const liquidTop = y + h - liquidHeight - 20;

    ctx.save();
    ctx.beginPath();
    if (isTube) {
      ctx.moveTo(x, y + 10);
      ctx.lineTo(x, y + h - 40);
      ctx.quadraticCurveTo(x, y + h - 15, x + w / 2, y + h - 15);
      ctx.quadraticCurveTo(x + w, y + h - 15, x + w, y + h - 40);
      ctx.lineTo(x + w, y + 10);
      ctx.lineTo(x, y + 10);
    } else {
      ctx.rect(x, y + 10, w, h - 20);
    }
    ctx.clip();

    const gradient = ctx.createLinearGradient(0, liquidTop, 0, y + h);
    gradient.addColorStop(0, state.liquidColor);
    gradient.addColorStop(1, this.darkenColor(state.liquidColor, 20));
    ctx.fillStyle = gradient;
    ctx.fillRect(x - 5, liquidTop, w + 10, h + 30);

    const waveOffset = Math.sin(performance.now() / 500) * 2;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.moveTo(x, liquidTop);
    ctx.quadraticCurveTo(x + w / 4, liquidTop - 3 + waveOffset, x + w / 2, liquidTop + waveOffset);
    ctx.quadraticCurveTo(x + (3 * w) / 4, liquidTop + 3 + waveOffset, x + w, liquidTop);
    ctx.lineTo(x + w, liquidTop + 5);
    ctx.lineTo(x, liquidTop + 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private drawDrops(centerX: number, topY: number, state: ContainerState): void {
    const ctx = this.ctx;
    state.drops.forEach(drop => {
      if (!drop.active) return;
      ctx.fillStyle = drop.color + Math.round(drop.opacity * 255).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.ellipse(centerX, drop.y, drop.size / 2, drop.size, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private drawRipples(x: number, y: number, w: number, h: number, state: ContainerState): void {
    const ctx = this.ctx;
    state.ripples.forEach(ripple => {
      if (!ripple.active) return;
      ctx.strokeStyle = 'rgba(255, 255, 255, ' + ripple.opacity + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(ripple.x, ripple.y, ripple.radius, ripple.radius * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
  }

  private drawPrecipitate(x: number, y: number, w: number, h: number, state: ContainerState): void {
    const ctx = this.ctx;
    state.precipitateParticles.forEach(particle => {
      ctx.fillStyle = particle.color + Math.round(particle.opacity * 255).toString(16).padStart(2, '0');
      ctx.fillRect(x + particle.x - particle.size / 2, y + particle.y - particle.size / 2, particle.size, particle.size);
    });
  }

  private drawBubbles(x: number, y: number, w: number, h: number, state: ContainerState): void {
    const ctx = this.ctx;
    state.bubbles.forEach(bubble => {
      if (!bubble.alive) return;
      ctx.strokeStyle = 'rgba(255, 255, 255, ' + bubble.opacity + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x + bubble.x, y + bubble.y, bubble.size, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, ' + (bubble.opacity * 0.5) + ')';
      ctx.beginPath();
      ctx.arc(x + bubble.x - bubble.size * 0.3, y + bubble.y - bubble.size * 0.3, bubble.size * 0.2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private drawThermometer(): void {
    const ctx = this.ctx;
    const state = this.engine.getState();
    const x = 250;
    const y = 80;
    const w = 30;
    const h = 300;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(x, y, w, h - 20, 4);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x + w / 2, y + h - 15, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const temp = Math.max(0, Math.min(100, state.temperature));
    const mercuryH = ((temp / 100) * (h - 70));
    const mercuryY = y + h - 35 - mercuryH;

    const mercuryGradient = ctx.createLinearGradient(0, mercuryY, 0, y + h);
    mercuryGradient.addColorStop(0, '#ff6b6b');
    mercuryGradient.addColorStop(1, '#e74c3c');
    ctx.fillStyle = mercuryGradient;

    ctx.beginPath();
    ctx.roundRect(x + w / 2 - 4, mercuryY, 8, mercuryH + 15, 3);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x + w / 2, y + h - 15, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ecf0f1';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    for (let i = 0; i <= 10; i++) {
      const markY = y + h - 35 - (i * (h - 70) / 10);
      ctx.fillRect(x + w - 2, markY, 6, 1);
      ctx.fillText((i * 10) + '°', x + w + 8, markY + 4);
    }

    if (this.thermometerFrame % 2 === 0) {
      ctx.fillStyle = '#e74c3c';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(temp.toFixed(1) + '°C', x + w / 2, y + h + 20);
    }
  }

  private drawButtons(): void {
    this.drawClearButton();
    this.drawContainerButtons();
  }

  private drawClearButton(): void {
    const ctx = this.ctx;
    const btn = this.getClearButtonRect();
    const pulse = Math.sin(performance.now() / 500) * 0.1 + 1;

    ctx.save();
    ctx.shadowColor = 'rgba(231, 76, 60, 0.5)';
    ctx.shadowBlur = 20 * pulse;

    const gradient = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.height);
    gradient.addColorStop(0, '#e74c3c');
    gradient.addColorStop(1, '#c0392b');
    ctx.fillStyle = gradient;
    this.roundRect(ctx, btn.x, btn.y, btn.width, btn.height, 8);
    ctx.fill();

    ctx.restore();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('清 空 容 器', btn.x + btn.width / 2, btn.y + btn.height / 2);
  }

  private drawContainerButtons(): void {
    const ctx = this.ctx;
    const state = this.engine.getState();

    const beakerBtn = this.getBeakerButtonRect();
    const beakerActive = state.containerType === 'beaker';
    ctx.fillStyle = beakerActive ? '#3498db' : '#34495e';
    this.roundRect(ctx, beakerBtn.x, beakerBtn.y, beakerBtn.width, beakerBtn.height, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚗ 烧杯', beakerBtn.x + beakerBtn.width / 2, beakerBtn.y + beakerBtn.height / 2);

    const tubeBtn = this.getTestTubeButtonRect();
    const tubeActive = state.containerType === 'testtube';
    ctx.fillStyle = tubeActive ? '#3498db' : '#34495e';
    this.roundRect(ctx, tubeBtn.x, tubeBtn.y, tubeBtn.width, tubeBtn.height, 8);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧪 试管', tubeBtn.x + tubeBtn.width / 2, tubeBtn.y + tubeBtn.height / 2);
  }

  private drawInfoPanel(): void {
    const ctx = this.ctx;
    const state = this.engine.getState();
    const x = 560;
    const y = 50;
    const w = 220;
    const h = 420;

    ctx.fillStyle = 'rgba(52, 73, 94, 0.8)';
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 2;
    this.roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#3498db';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('反应信息', x + w / 2, y + 30);

    ctx.fillStyle = '#ecf0f1';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('化学方程式:', x + 15, y + 60);

    if (state.currentEquation) {
      this.drawEquation(state.currentEquation, x + 15, y + 85, w - 30);
    } else {
      ctx.fillStyle = '#7f8c8d';
      ctx.font = 'italic 11px sans-serif';
      ctx.fillText('添加试剂开始反应...', x + 15, y + 85);
    }

    ctx.fillStyle = '#ecf0f1';
    ctx.font = '12px sans-serif';
    ctx.fillText('产物列表:', x + 15, y + 130);

    if (state.products.length > 0) {
      this.drawProductTable(x + 15, y + 150, w - 30, state.products);
    } else {
      ctx.fillStyle = '#7f8c8d';
      ctx.font = 'italic 11px sans-serif';
      ctx.fillText('暂无产物', x + 15, y + 150);
    }

    ctx.fillStyle = '#ecf0f1';
    ctx.font = '12px sans-serif';
    ctx.fillText('当前试剂:', x + 15, y + 280);

    const currentChemicals = state.chemicals.map(id => {
      const c = CHEMICALS.find(ch => ch.id === id);
      return c ? c.name : id;
    });

    ctx.fillStyle = '#bdc3c7';
    ctx.font = '11px sans-serif';
    if (currentChemicals.length > 0) {
      for (let i = 0; i < currentChemicals.length; i++) {
        ctx.fillText((i + 1) + '. ' + currentChemicals[i], x + 15, y + 300 + i * 18);
      }
    } else {
      ctx.fillStyle = '#7f8c8d';
      ctx.font = 'italic 11px sans-serif';
      ctx.fillText('容器为空', x + 15, y + 300);
    }

    ctx.fillStyle = '#7f8c8d';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('拖拽试剂到容器中进行实验', x + w / 2, y + h - 20);
  }

  private drawEquation(equation: string, x: number, y: number, maxWidth: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 14px serif';
    ctx.textAlign = 'left';

    let displayText = equation;
    let fontSize = 14;
    while (ctx.measureText(displayText).width > maxWidth && fontSize > 10) {
      fontSize--;
      ctx.font = 'bold ' + fontSize + 'px serif';
    }
    ctx.fillText(displayText, x, y);
  }

  private drawProductTable(x: number, y: number, w: number, products: Array<{ name: string; formula: string; state: string; color: string }>): void {
    const ctx = this.ctx;
    const rowHeight = 35;
    const colWidths = [55, 50, 45, w - 150];

    ctx.fillStyle = '#3498db';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('名称', x + colWidths[0] / 2, y - 5);
    ctx.fillText('化学式', x + colWidths[0] + colWidths[1] / 2, y - 5);
    ctx.fillText('状态', x + colWidths[0] + colWidths[1] + colWidths[2] / 2, y - 5);
    ctx.fillText('颜色', x + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] / 2, y - 5);

    const stateMap: Record<string, string> = {
      'aqueous': '溶液',
      'solid': '固体↓',
      'gas': '气体↑',
      'liquid': '液体'
    };

    products.forEach((product, i) => {
      const rowY = y + i * rowHeight;

      ctx.fillStyle = i % 2 === 0 ? 'rgba(52, 152, 219, 0.1)' : 'rgba(52, 152, 219, 0.05)';
      ctx.fillRect(x, rowY, w, rowHeight - 2);

      ctx.fillStyle = '#ecf0f1';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(product.name, x + colWidths[0] / 2, rowY + 15);
      ctx.font = '9px sans-serif';
      ctx.fillText(product.formula, x + colWidths[0] + colWidths[1] / 2, rowY + 15);
      ctx.fillText(stateMap[product.state] || product.state, x + colWidths[0] + colWidths[1] + colWidths[2] / 2, rowY + 15);

      const colorX = x + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] / 2;
      ctx.fillStyle = product.color;
      ctx.fillRect(colorX - 12, rowY + 5, 24, 16);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(colorX - 12, rowY + 5, 24, 16);
    });
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
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

  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max((num >> 16) - amt, 0);
    const G = Math.max((num >> 8 & 0x00FF) - amt, 0);
    const B = Math.max((num & 0x0000FF) - amt, 0);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }
}
