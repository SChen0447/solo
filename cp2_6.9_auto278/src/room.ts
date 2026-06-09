export interface InteractivePoint {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  hovered: boolean;
  clicked: boolean;
  pressed: boolean;
  interacted: boolean;
  itemTaken: boolean;
  label: string;
  icon: string;
}

export class Room {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private points: InteractivePoint[] = [];
  private hoveredPointId: string | null = null;
  private pressedPointId: string | null = null;
  private floorPattern: CanvasPattern | null = null;
  private scaleX: number = 1;
  private scaleY: number = 1;
  private baseWidth: number = 800;
  private baseHeight: number = 600;
  private onPointClick: ((pointId: string) => void) | null = null;
  private animationFrame: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.initPoints();
    this.generateFloorPattern();
    this.bindEvents();
    this.resize();
    window.addEventListener('resize', this.handleResize);
  }

  setOnPointClick(callback: (pointId: string) => void): void {
    this.onPointClick = callback;
  }

  private initPoints(): void {
    this.points = [
      {
        id: 'desk',
        name: '古老书桌',
        x: 120,
        y: 120,
        width: 200,
        height: 100,
        color: '#4A3B32',
        hovered: false,
        clicked: false,
        pressed: false,
        interacted: false,
        itemTaken: false,
        label: '书桌',
        icon: '🪑'
      },
      {
        id: 'drawer',
        name: '书桌抽屉',
        x: 140,
        y: 175,
        width: 80,
        height: 35,
        color: '#3A2E28',
        hovered: false,
        clicked: false,
        pressed: false,
        interacted: false,
        itemTaken: false,
        label: '抽屉',
        icon: '📦'
      },
      {
        id: 'bookshelf',
        name: '书架',
        x: 500,
        y: 80,
        width: 220,
        height: 180,
        color: '#4A3B32',
        hovered: false,
        clicked: false,
        pressed: false,
        interacted: false,
        itemTaken: false,
        label: '书架',
        icon: '📚'
      },
      {
        id: 'fireplace',
        name: '壁炉',
        x: 80,
        y: 380,
        width: 140,
        height: 150,
        color: '#3A2E28',
        hovered: false,
        clicked: false,
        pressed: false,
        interacted: false,
        itemTaken: false,
        label: '壁炉',
        icon: '🔥'
      },
      {
        id: 'carpet',
        name: '波斯地毯',
        x: 300,
        y: 350,
        width: 180,
        height: 120,
        color: '#5C2828',
        hovered: false,
        clicked: false,
        pressed: false,
        interacted: false,
        itemTaken: false,
        label: '地毯',
        icon: '🟥'
      },
      {
        id: 'clock',
        name: '挂钟',
        x: 400,
        y: 50,
        width: 70,
        height: 70,
        color: '#4A3B32',
        hovered: false,
        clicked: false,
        pressed: false,
        interacted: false,
        itemTaken: false,
        label: '挂钟',
        icon: '🕰️'
      },
      {
        id: 'plant',
        name: '枯萎盆栽',
        x: 660,
        y: 350,
        width: 80,
        height: 100,
        color: '#3A2E28',
        hovered: false,
        clicked: false,
        pressed: false,
        interacted: false,
        itemTaken: false,
        label: '盆栽',
        icon: '🪴'
      }
    ];
  }

  private generateFloorPattern(): void {
    const offscreen = document.createElement('canvas');
    offscreen.width = 200;
    offscreen.height = 200;
    const octx = offscreen.getContext('2d')!;
    octx.fillStyle = '#2E1F16';
    octx.fillRect(0, 0, 200, 200);
    octx.strokeStyle = 'rgba(212, 165, 116, 0.08)';
    octx.lineWidth = 1;
    for (let i = 0; i < 40; i++) {
      octx.beginPath();
      const y = Math.random() * 200;
      octx.moveTo(0, y);
      octx.bezierCurveTo(
        50 + Math.random() * 50, y + (Math.random() - 0.5) * 10,
        100 + Math.random() * 50, y + (Math.random() - 0.5) * 10,
        200, y + (Math.random() - 0.5) * 8
      );
      octx.stroke();
    }
    octx.strokeStyle = 'rgba(74, 59, 50, 0.4)';
    octx.lineWidth = 2;
    for (let i = 0; i < 200; i += 50) {
      octx.beginPath();
      octx.moveTo(i, 0);
      octx.lineTo(i, 200);
      octx.stroke();
    }
    this.floorPattern = this.ctx.createPattern(offscreen, 'repeat');
  }

  setInteracted(pointId: string, value: boolean = true): void {
    const point = this.points.find(p => p.id === pointId);
    if (point) point.interacted = value;
  }

  setItemTaken(pointId: string, value: boolean = true): void {
    const point = this.points.find(p => p.id === pointId);
    if (point) point.itemTaken = value;
  }

  isInteracted(pointId: string): boolean {
    return this.points.find(p => p.id === pointId)?.interacted ?? false;
  }

  isItemTaken(pointId: string): boolean {
    return this.points.find(p => p.id === pointId)?.itemTaken ?? false;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
  }

  private unbindEvents(): void {
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    window.removeEventListener('resize', this.handleResize);
  }

  private handleResize = (): void => {
    this.resize();
  };

  resize(): void {
    const container = document.getElementById('game-container');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    let w = rect.width;
    let h = rect.height;
    const ratio = 4 / 3;
    if (w / h > ratio) {
      w = h * ratio;
    } else {
      h = w / ratio;
    }
    w = Math.max(w, 800);
    h = Math.max(h, 600);
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.scale(dpr, dpr);
    this.scaleX = w / this.baseWidth;
    this.scaleY = h / this.baseHeight;
    this.generateFloorPattern();
  }

  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / this.scaleX,
      y: (clientY - rect.top) / this.scaleY
    };
  }

  private hitTest(x: number, y: number): InteractivePoint | null {
    for (let i = this.points.length - 1; i >= 0; i--) {
      const p = this.points[i];
      if (x >= p.x && x <= p.x + p.width && y >= p.y && y <= p.y + p.height) {
        return p;
      }
    }
    return null;
  }

  private handleMouseMove = (e: MouseEvent): void => {
    const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);
    const hit = this.hitTest(x, y);
    if (this.hoveredPointId && (!hit || hit.id !== this.hoveredPointId)) {
      const prev = this.points.find(p => p.id === this.hoveredPointId);
      if (prev) prev.hovered = false;
      this.hoveredPointId = null;
    }
    if (hit) {
      hit.hovered = true;
      this.hoveredPointId = hit.id;
      this.canvas.style.cursor = 'pointer';
    } else {
      this.canvas.style.cursor = 'default';
    }
  };

  private handleMouseDown = (e: MouseEvent): void => {
    const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);
    const hit = this.hitTest(x, y);
    if (hit) {
      hit.pressed = true;
      this.pressedPointId = hit.id;
    }
  };

  private handleMouseUp = (e: MouseEvent): void => {
    const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);
    const hit = this.hitTest(x, y);
    if (this.pressedPointId) {
      const pressed = this.points.find(p => p.id === this.pressedPointId);
      if (pressed) pressed.pressed = false;
      if (hit && hit.id === this.pressedPointId) {
        this.onPointClick?.(hit.id);
      }
      this.pressedPointId = null;
    }
  };

  private handleMouseLeave = (): void => {
    if (this.hoveredPointId) {
      const prev = this.points.find(p => p.id === this.hoveredPointId);
      if (prev) prev.hovered = false;
      this.hoveredPointId = null;
    }
    if (this.pressedPointId) {
      const pressed = this.points.find(p => p.id === this.pressedPointId);
      if (pressed) pressed.pressed = false;
      this.pressedPointId = null;
    }
    this.canvas.style.cursor = 'default';
  };

  private drawFloor(): void {
    if (this.floorPattern) {
      this.ctx.save();
      this.ctx.scale(this.scaleX, this.scaleY);
      this.ctx.fillStyle = this.floorPattern;
      this.ctx.fillRect(0, 0, this.baseWidth, this.baseHeight);
      this.ctx.restore();
    }
  }

  private drawDesk(p: InteractivePoint): void {
    const offset = p.hovered ? -2 : 0;
    const scale = p.pressed ? 0.98 : 1;
    this.ctx.save();
    this.ctx.scale(this.scaleX, this.scaleY);
    this.ctx.translate(p.x + p.width / 2, p.y + p.height / 2 + offset);
    this.ctx.scale(scale, scale);
    this.ctx.translate(-(p.x + p.width / 2), -(p.y + p.height / 2));

    this.ctx.fillStyle = p.color;
    this.ctx.fillRect(p.x, p.y, p.width, p.height);
    this.ctx.fillStyle = '#5C4033';
    this.ctx.fillRect(p.x, p.y, p.width, 12);
    this.ctx.strokeStyle = '#D4A574';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(p.x, p.y, p.width, p.height);

    this.ctx.fillStyle = '#2E1F16';
    this.ctx.fillRect(p.x + 10, p.y + 40, 25, 30);
    this.ctx.fillRect(p.x + 50, p.y + 40, 50, 30);
    this.ctx.fillRect(p.x + 120, p.y + 40, 60, 30);

    this.ctx.fillStyle = '#E8C89B';
    this.ctx.font = '20px serif';
    this.ctx.fillText('📖', p.x + 12, p.y + 30);
    this.ctx.fillText('✒️', p.x + 80, p.y + 30);
    this.ctx.fillText('🕯️', p.x + 150, p.y + 30);

    if (p.hovered) {
      this.ctx.strokeStyle = '#D4A574';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(p.x - 2, p.y - 2, p.width + 4, p.height + 4);
    }
    this.ctx.restore();
  }

  private drawDrawer(p: InteractivePoint): void {
    const offset = p.hovered ? -2 : 0;
    const scale = p.pressed ? 0.96 : 1;
    const slideOffset = p.interacted ? 20 : 0;
    this.ctx.save();
    this.ctx.scale(this.scaleX, this.scaleY);
    this.ctx.translate(p.x + p.width / 2, p.y + p.height / 2 + offset);
    this.ctx.scale(scale, scale);
    this.ctx.translate(-(p.x + p.width / 2), -(p.y + p.height / 2));

    this.ctx.fillStyle = p.color;
    this.ctx.fillRect(p.x + slideOffset, p.y, p.width, p.height);
    this.ctx.strokeStyle = '#2A1F18';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(p.x + slideOffset, p.y, p.width, p.height);

    this.ctx.fillStyle = '#D4A574';
    this.ctx.fillRect(p.x + slideOffset + 30, p.y + 12, 20, 4);
    this.ctx.fillRect(p.x + slideOffset + 36, p.y + 8, 8, 12);

    if (p.hovered) {
      this.ctx.strokeStyle = '#D4A574';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(p.x - 2 + slideOffset, p.y - 2, p.width + 4, p.height + 4);
    }
    this.ctx.restore();
  }

  private drawBookshelf(p: InteractivePoint): void {
    const offset = p.hovered ? -2 : 0;
    const scale = p.pressed ? 0.98 : 1;
    this.ctx.save();
    this.ctx.scale(this.scaleX, this.scaleY);
    this.ctx.translate(p.x + p.width / 2, p.y + p.height / 2 + offset);
    this.ctx.scale(scale, scale);
    this.ctx.translate(-(p.x + p.width / 2), -(p.y + p.height / 2));

    this.ctx.fillStyle = p.color;
    this.ctx.fillRect(p.x, p.y, p.width, p.height);
    this.ctx.strokeStyle = '#D4A574';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(p.x, p.y, p.width, p.height);

    const shelfColors = ['#8B1A1A', '#1A3A5C', '#2E5C1A', '#7A5A1A', '#5C1A7A', '#5C3A1A'];
    const bookY = [p.y + 15, p.y + 70, p.y + 125];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 6; col++) {
        const bx = p.x + 10 + col * 34;
        const by = bookY[row];
        const taken = p.interacted && row === 0 && col === 0;
        if (!taken) {
          this.ctx.fillStyle = shelfColors[(row + col) % shelfColors.length];
          this.ctx.fillRect(bx, by, 28, 45);
          this.ctx.fillStyle = 'rgba(212, 165, 116, 0.3)';
          this.ctx.fillRect(bx + 2, by + 2, 24, 2);
        } else {
          this.ctx.fillStyle = '#2A1F18';
          this.ctx.fillRect(bx, by, 28, 45);
        }
      }
      this.ctx.fillStyle = '#3A2E28';
      this.ctx.fillRect(p.x, bookY[row] + 50, p.width, 5);
    }

    if (p.hovered) {
      this.ctx.strokeStyle = '#D4A574';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(p.x - 2, p.y - 2, p.width + 4, p.height + 4);
    }
    this.ctx.restore();
  }

  private drawFireplace(p: InteractivePoint): void {
    const offset = p.hovered ? -2 : 0;
    const scale = p.pressed ? 0.98 : 1;
    this.ctx.save();
    this.ctx.scale(this.scaleX, this.scaleY);
    this.ctx.translate(p.x + p.width / 2, p.y + p.height / 2 + offset);
    this.ctx.scale(scale, scale);
    this.ctx.translate(-(p.x + p.width / 2), -(p.y + p.height / 2));

    this.ctx.fillStyle = '#5C4033';
    this.ctx.fillRect(p.x - 10, p.y, p.width + 20, 20);
    this.ctx.fillStyle = p.color;
    this.ctx.fillRect(p.x, p.y + 20, p.width, p.height - 20);
    this.ctx.fillStyle = '#1A120E';
    this.ctx.fillRect(p.x + 15, p.y + 40, p.width - 30, p.height - 60);

    if (!p.itemTaken) {
      const flicker = Math.sin(this.animationFrame * 0.15) * 2;
      const gradient = this.ctx.createRadialGradient(
        p.x + p.width / 2, p.y + p.height - 40 + flicker, 5,
        p.x + p.width / 2, p.y + p.height - 40 + flicker, 35
      );
      gradient.addColorStop(0, 'rgba(255, 200, 50, 0.9)');
      gradient.addColorStop(0.5, 'rgba(255, 100, 30, 0.6)');
      gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(p.x, p.y + 50, p.width, p.height - 80);

      this.ctx.fillStyle = '#FFA500';
      this.ctx.beginPath();
      this.ctx.arc(p.x + p.width / 2 - 8, p.y + p.height - 35 + flicker, 8, 0, Math.PI * 2);
      this.ctx.arc(p.x + p.width / 2 + 8, p.y + p.height - 38 + flicker, 10, 0, Math.PI * 2);
      this.ctx.arc(p.x + p.width / 2, p.y + p.height - 45 + flicker, 6, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.fillStyle = '#2A1F18';
    this.ctx.fillRect(p.x + 10, p.y + p.height - 25, p.width - 20, 10);
    this.ctx.fillStyle = '#4A3B32';
    for (let i = 0; i < 4; i++) {
      this.ctx.fillRect(p.x + 15 + i * 30, p.y + p.height - 30, 25, 15);
    }

    if (p.hovered) {
      this.ctx.strokeStyle = '#D4A574';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(p.x - 12, p.y - 2, p.width + 24, p.height + 4);
    }
    this.ctx.restore();
  }

  private drawCarpet(p: InteractivePoint): void {
    const offset = p.hovered ? -2 : 0;
    const scale = p.pressed ? 0.98 : 1;
    this.ctx.save();
    this.ctx.scale(this.scaleX, this.scaleY);
    this.ctx.translate(p.x + p.width / 2, p.y + p.height / 2 + offset);
    this.ctx.scale(scale, scale);
    this.ctx.translate(-(p.x + p.width / 2), -(p.y + p.height / 2));

    this.ctx.fillStyle = p.color;
    this.ctx.fillRect(p.x, p.y, p.width, p.height);

    this.ctx.strokeStyle = '#D4A574';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(p.x + 5, p.y + 5, p.width - 10, p.height - 10);
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(p.x + 12, p.y + 12, p.width - 24, p.height - 24);

    this.ctx.fillStyle = '#D4A574';
    this.ctx.font = '20px serif';
    this.ctx.fillText('✦', p.x + p.width / 2 - 10, p.y + p.height / 2 + 5);

    if (p.interacted && !p.itemTaken) {
      this.ctx.save();
      this.ctx.globalAlpha = 0.8;
      this.ctx.fillStyle = '#FFD700';
      this.ctx.font = '28px serif';
      this.ctx.fillText('🗝️', p.x + p.width / 2 - 14, p.y + p.height / 2 + 8);
      this.ctx.restore();
    }

    if (p.hovered) {
      this.ctx.strokeStyle = '#D4A574';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(p.x - 2, p.y - 2, p.width + 4, p.height + 4);
    }
    this.ctx.restore();
  }

  private drawClock(p: InteractivePoint): void {
    const offset = p.hovered ? -2 : 0;
    const scale = p.pressed ? 0.98 : 1;
    this.ctx.save();
    this.ctx.scale(this.scaleX, this.scaleY);
    this.ctx.translate(p.x + p.width / 2, p.y + p.height / 2 + offset);
    this.ctx.scale(scale, scale);
    this.ctx.translate(-(p.x + p.width / 2), -(p.y + p.height / 2));

    const cx = p.x + p.width / 2;
    const cy = p.y + p.height / 2;
    const r = p.width / 2 - 2;

    this.ctx.fillStyle = p.color;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#D4A574';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();

    this.ctx.fillStyle = '#E8D5B7';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r - 6, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#2E1F16';
    this.ctx.font = '10px serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) {
      const angle = (i * 30 - 90) * Math.PI / 180;
      const tx = cx + Math.cos(angle) * (r - 14);
      const ty = cy + Math.sin(angle) * (r - 14);
      this.ctx.fillText(String(i), tx, ty);
    }

    this.ctx.strokeStyle = '#2E1F16';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.lineTo(cx + 12, cy - 10);
    this.ctx.stroke();

    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.lineTo(cx - 15, cy + 5);
    this.ctx.stroke();

    this.ctx.fillStyle = '#8B0000';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.textAlign = 'start';
    this.ctx.textBaseline = 'alphabetic';

    if (p.hovered) {
      this.ctx.strokeStyle = '#D4A574';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  private drawPlant(p: InteractivePoint): void {
    const offset = p.hovered ? -2 : 0;
    const scale = p.pressed ? 0.98 : 1;
    this.ctx.save();
    this.ctx.scale(this.scaleX, this.scaleY);
    this.ctx.translate(p.x + p.width / 2, p.y + p.height / 2 + offset);
    this.ctx.scale(scale, scale);
    this.ctx.translate(-(p.x + p.width / 2), -(p.y + p.height / 2));

    this.ctx.fillStyle = '#6B4226';
    this.ctx.beginPath();
    this.ctx.moveTo(p.x + 10, p.y + 50);
    this.ctx.lineTo(p.x + p.width - 10, p.y + 50);
    this.ctx.lineTo(p.x + p.width - 18, p.y + p.height);
    this.ctx.lineTo(p.x + 18, p.y + p.height);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.strokeStyle = '#D4A574';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.ctx.fillStyle = '#4A3728';
    this.ctx.beginPath();
    this.ctx.ellipse(p.x + p.width / 2, p.y + 52, 28, 8, 0, 0, Math.PI * 2);
    this.ctx.fill();

    if (!p.itemTaken) {
      this.ctx.strokeStyle = '#6B8E23';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(p.x + p.width / 2, p.y + 50);
      this.ctx.quadraticCurveTo(p.x + p.width / 2 - 10, p.y + 20, p.x + p.width / 2 + 5, p.y + 10);
      this.ctx.stroke();

      this.ctx.fillStyle = '#8B7355';
      this.ctx.beginPath();
      this.ctx.ellipse(p.x + p.width / 2 + 5, p.y + 10, 8, 4, 0.3, 0, Math.PI * 2);
      this.ctx.fill();

      if (p.interacted) {
        this.ctx.save();
        this.ctx.globalAlpha = 0.9;
        this.ctx.fillStyle = '#F5DEB3';
        this.ctx.font = '20px serif';
        this.ctx.fillText('📜', p.x + p.width / 2 + 5, p.y + 48);
        this.ctx.restore();
      }
    } else {
      this.ctx.strokeStyle = '#5C4033';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(p.x + p.width / 2, p.y + 55);
      this.ctx.lineTo(p.x + p.width / 2 - 5, p.y + 30);
      this.ctx.moveTo(p.x + p.width / 2, p.y + 55);
      this.ctx.lineTo(p.x + p.width / 2 + 8, p.y + 35);
      this.ctx.stroke();
    }

    if (p.hovered) {
      this.ctx.strokeStyle = '#D4A574';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(p.x - 2, p.y - 2, p.width + 4, p.height + 4);
    }
    this.ctx.restore();
  }

  private drawLabels(): void {
    this.ctx.save();
    this.ctx.scale(this.scaleX, this.scaleY);
    for (const p of this.points) {
      if (p.hovered) {
        this.ctx.fillStyle = 'rgba(26, 18, 14, 0.9)';
        const label = p.label;
        this.ctx.font = '13px "Georgia", serif';
        const textWidth = this.ctx.measureText(label).width;
        const lx = p.x + p.width / 2 - textWidth / 2 - 8;
        const ly = p.y - 28;
        this.ctx.fillRect(lx, ly, textWidth + 16, 22);
        this.ctx.strokeStyle = '#D4A574';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(lx, ly, textWidth + 16, 22);
        this.ctx.fillStyle = '#D4A574';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(label, p.x + p.width / 2, ly + 11);
        this.ctx.textAlign = 'start';
        this.ctx.textBaseline = 'alphabetic';
      }
    }
    this.ctx.restore();
  }

  render(frame: number): void {
    this.animationFrame = frame;
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    const dpr = window.devicePixelRatio || 1;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();

    this.drawFloor();

    for (const p of this.points) {
      switch (p.id) {
        case 'desk': this.drawDesk(p); break;
        case 'drawer': this.drawDrawer(p); break;
        case 'bookshelf': this.drawBookshelf(p); break;
        case 'fireplace': this.drawFireplace(p); break;
        case 'carpet': this.drawCarpet(p); break;
        case 'clock': this.drawClock(p); break;
        case 'plant': this.drawPlant(p); break;
      }
    }

    this.drawLabels();
  }

  reset(): void {
    this.points.forEach(p => {
      p.hovered = false;
      p.clicked = false;
      p.pressed = false;
      p.interacted = false;
      p.itemTaken = false;
    });
    this.hoveredPointId = null;
    this.pressedPointId = null;
  }

  destroy(): void {
    this.unbindEvents();
  }
}
