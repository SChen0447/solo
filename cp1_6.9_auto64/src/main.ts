import p5 from 'p5';
import {
  ColorRGB,
  BG_COLOR_START,
  BG_COLOR_END,
  NEBULA_COLORS,
  STAMP_COLORS,
  PARTICLE_SPAWN_RATE_MIN,
  PARTICLE_SPAWN_RATE_MAX,
  PAUSE_THRESHOLD,
  INK_BTN_BG,
  INK_BTN_BORDER,
  INK_BTN_BORDER_RADIUS,
  INK_BTN_HOVER_TRANSITION,
  colorToP5Color,
  easeOut
} from './style';
import {
  ParticleSystem,
  GalaxyBand,
  LightSpot
} from './particles';

interface ButtonState {
  hoverOffset: number;
  hoverTarget: number;
  transitionStart: number;
}

class StarTrailApp {
  private p: p5;
  private particleSystem: ParticleSystem;
  private galaxyBand: GalaxyBand;

  private isDrawing: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private lastMoveTime: number = 0;
  private lastEmitTime: number = 0;
  private isSettling: boolean = false;

  private currentColor: ColorRGB;
  private displayColor: ColorRGB;
  private colorTransitionStart: number = 0;
  private colorTransitionFrom: ColorRGB;

  private showInkPalette: boolean = false;
  private stampMode: boolean = false;

  private inkBtnState: ButtonState;
  private stampBtnState: ButtonState;
  private hoveredBtn: 'ink' | 'stamp' | null = null;

  private readonly BTN_SIZE = 50;
  private readonly BTN_SPACING = 15;
  private readonly BTN_MARGIN = 20;
  private readonly COLOR_DOT_SIZE = 24;
  private readonly COLOR_DOT_SPACING = 10;

  constructor(p: p5) {
    this.p = p;
    this.particleSystem = new ParticleSystem(p);
    this.galaxyBand = new GalaxyBand(p);
    this.currentColor = { ...NEBULA_COLORS[0] };
    this.displayColor = { ...NEBULA_COLORS[0] };
    this.colorTransitionFrom = { ...NEBULA_COLORS[0] };

    this.inkBtnState = {
      hoverOffset: 0,
      hoverTarget: 0,
      transitionStart: 0
    };
    this.stampBtnState = {
      hoverOffset: 0,
      hoverTarget: 0,
      transitionStart: 0
    };
  }

  setup(): void {
    const p = this.p;
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.pixelDensity(Math.min(window.devicePixelRatio, 2));
    this.galaxyBand.resize();
  }

  draw(): void {
    const p = this.p;
    const currentTime = p.millis();

    this.drawBackground();
    this.updateColorTransition(currentTime);
    this.updateButtons(currentTime);

    if (this.isDrawing) {
      this.updateDrawing(currentTime);
    } else if (!this.isSettling && currentTime - this.lastMoveTime > PAUSE_THRESHOLD && this.lastMoveTime > 0) {
      this.startSettling();
    }

    this.particleSystem.update();
    this.galaxyBand.update();

    this.galaxyBand.draw();
    this.particleSystem.draw();

    this.drawUI(currentTime);
  }

  private drawBackground(): void {
    const p = this.p;
    const gradient = p.drawingContext.createLinearGradient(0, 0, 0, p.height);
    gradient.addColorStop(0, `rgb(${BG_COLOR_START.r},${BG_COLOR_START.g},${BG_COLOR_START.b})`);
    gradient.addColorStop(1, `rgb(${BG_COLOR_END.r},${BG_COLOR_END.g},${BG_COLOR_END.b})`);
    p.drawingContext.fillStyle = gradient;
    p.rect(0, 0, p.width, p.height);
  }

  private updateColorTransition(currentTime: number): void {
    if (this.colorTransitionStart > 0) {
      const age = currentTime - this.colorTransitionStart;
      const ratio = Math.min(age / 400, 1);
      const eased = easeOut(ratio);

      this.displayColor = {
        r: this.colorTransitionFrom.r + (this.currentColor.r - this.colorTransitionFrom.r) * eased,
        g: this.colorTransitionFrom.g + (this.currentColor.g - this.colorTransitionFrom.g) * eased,
        b: this.colorTransitionFrom.b + (this.currentColor.b - this.colorTransitionFrom.b) * eased
      };

      if (ratio >= 1) {
        this.colorTransitionStart = 0;
      }
    }
  }

  private updateDrawing(currentTime: number): void {
    const p = this.p;
    const mouseX = this.getMouseX();
    const mouseY = this.getMouseY();

    const dx = mouseX - this.lastMouseX;
    const dy = mouseY - this.lastMouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = dist / Math.max(1, (currentTime - this.lastEmitTime) / 16.67);

    const spawnRate = this.mapRange(speed, 0, 20, PARTICLE_SPAWN_RATE_MIN, PARTICLE_SPAWN_RATE_MAX);
    const timeSinceEmit = currentTime - this.lastEmitTime;
    const particlesToSpawn = Math.floor((timeSinceEmit / 1000) * spawnRate);

    if (particlesToSpawn > 0) {
      const vx = dx / Math.max(1, timeSinceEmit / 16.67);
      const vy = dy / Math.max(1, timeSinceEmit / 16.67);

      for (let i = 0; i < particlesToSpawn; i++) {
        const t = i / particlesToSpawn;
        const emitX = this.lastMouseX + dx * t;
        const emitY = this.lastMouseY + dy * t;
        this.particleSystem.emit(emitX, emitY, vx, vy, 1);
      }

      this.lastEmitTime = currentTime;
      this.lastMouseX = mouseX;
      this.lastMouseY = mouseY;
    }

    this.lastMoveTime = currentTime;
  }

  private startSettling(): void {
    if (this.isSettling) return;
    this.isSettling = true;
    this.particleSystem.setColor(this.currentColor);
    this.particleSystem.startSettling();
  }

  private mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    return outMin + (Math.min(Math.max(value, inMin), inMax) - inMin) * (outMax - outMin) / (inMax - inMin);
  }

  private getMouseX(): number {
    const p = this.p;
    return 'touches' in p && p.touches.length > 0 ? p.touches[0].x : p.mouseX;
  }

  private getMouseY(): number {
    const p = this.p;
    return 'touches' in p && p.touches.length > 0 ? p.touches[0].y : p.mouseY;
  }

  private updateButtons(currentTime: number): void {
    this.updateBtnState(this.inkBtnState, currentTime);
    this.updateBtnState(this.stampBtnState, currentTime);
  }

  private updateBtnState(state: ButtonState, currentTime: number): void {
    if (state.transitionStart > 0) {
      const age = currentTime - state.transitionStart;
      const ratio = Math.min(age / INK_BTN_HOVER_TRANSITION, 1);
      const eased = easeOut(ratio);
      state.hoverOffset = eased * state.hoverTarget;
      if (ratio >= 1) {
        state.transitionStart = 0;
      }
    }
  }

  private setBtnHover(btn: 'ink' | 'stamp', hover: boolean): void {
    const state = btn === 'ink' ? this.inkBtnState : this.stampBtnState;
    const currentTime = this.p.millis();
    state.hoverTarget = hover ? -3 : 0;
    state.transitionStart = currentTime;
    this.hoveredBtn = hover ? btn : null;
  }

  private drawUI(currentTime: number): void {
    const p = this.p;

    const inkBtnX = this.BTN_MARGIN;
    const inkBtnY = this.BTN_MARGIN - this.inkBtnState.hoverOffset;
    this.drawInkBottleButton(inkBtnX, inkBtnY, this.hoveredBtn === 'ink' || this.showInkPalette);

    const stampBtnX = this.BTN_MARGIN;
    const stampBtnY = this.BTN_MARGIN + this.BTN_SIZE + this.BTN_SPACING - this.stampBtnState.hoverOffset;
    this.drawStampButton(stampBtnX, stampBtnY, this.hoveredBtn === 'stamp' || this.stampMode);

    if (this.showInkPalette) {
      this.drawInkPalette(inkBtnX + this.BTN_SIZE + this.BTN_SPACING, inkBtnY);
    }

    if (this.stampMode) {
      this.drawStampIndicator();
    }
  }

  private drawInkBottleButton(x: number, y: number, highlight: boolean): void {
    const p = this.p;
    const s = this.BTN_SIZE;

    p.push();
    this.drawButtonBg(x, y, highlight);

    p.stroke(255, 255, 255, highlight ? 255 : 200);
    p.strokeWeight(2);
    p.noFill();

    const cx = x + s / 2;
    const cy = y + s / 2;

    p.rect(cx - 8, cy - 14, 16, 6, 2);
    p.quad(
      cx - 12, cy - 8,
      cx + 12, cy - 8,
      cx + 14, cy + 12,
      cx - 14, cy + 12
    );

    p.noStroke();
    p.fill(colorToP5Color(p, this.displayColor, 200));
    p.quad(
      cx - 10, cy - 4,
      cx + 10, cy - 4,
      cx + 12, cy + 10,
      cx - 12, cy + 10
    );

    p.pop();
  }

  private drawStampButton(x: number, y: number, highlight: boolean): void {
    const p = this.p;
    const s = this.BTN_SIZE;

    p.push();
    this.drawButtonBg(x, y, highlight);

    p.stroke(255, 255, 255, highlight ? 255 : 200);
    p.strokeWeight(2);
    p.noFill();

    const cx = x + s / 2;
    const cy = y + s / 2;

    p.ellipse(cx, cy, 22, 22);

    p.push();
    p.translate(cx, cy);
    p.rotate(p.radians(-20));
    p.ellipse(0, 0, 34, 10);
    p.pop();

    p.pop();
  }

  private drawButtonBg(x: number, y: number, highlight: boolean): void {
    const p = this.p;
    const s = this.BTN_SIZE;

    p.noStroke();
    p.drawingContext.fillStyle = highlight
      ? 'rgba(255,255,255,0.18)'
      : INK_BTN_BG;
    this.roundRect(x, y, s, s, INK_BTN_BORDER_RADIUS);

    p.stroke(255, 255, 255, highlight ? 60 : 40);
    p.strokeWeight(1);
    p.noFill();
    this.roundRect(x, y, s, s, INK_BTN_BORDER_RADIUS);
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const p = this.p;
    p.beginShape();
    p.vertex(x + r, y);
    p.vertex(x + w - r, y);
    p.quadraticVertex(x + w, y, x + w, y + r);
    p.vertex(x + w, y + h - r);
    p.quadraticVertex(x + w, y + h, x + w - r, y + h);
    p.vertex(x + r, y + h);
    p.quadraticVertex(x, y + h, x, y + h - r);
    p.vertex(x, y + r);
    p.quadraticVertex(x, y, x + r, y);
    p.endShape(p.CLOSE);
  }

  private drawInkPalette(x: number, y: number): void {
    const p = this.p;
    const dotS = this.COLOR_DOT_SIZE;
    const spacing = this.COLOR_DOT_SPACING;
    const cols = 3;
    const rows = Math.ceil(NEBULA_COLORS.length / cols);
    const paletteW = cols * dotS + (cols + 1) * spacing;
    const paletteH = rows * dotS + (rows + 1) * spacing;

    p.push();
    p.noStroke();
    p.drawingContext.fillStyle = 'rgba(0,0,0,0.6)';
    this.roundRect(x - 5, y - 5, paletteW + 10, paletteH + 10, 12);

    p.stroke(255, 255, 255, 30);
    p.strokeWeight(1);
    p.noFill();
    this.roundRect(x - 5, y - 5, paletteW + 10, paletteH + 10, 12);

    for (let i = 0; i < NEBULA_COLORS.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const dotX = x + spacing + col * (dotS + spacing) + dotS / 2;
      const dotY = y + spacing + row * (dotS + spacing) + dotS / 2;
      const color = NEBULA_COLORS[i];
      const isSelected = color.r === this.currentColor.r &&
        color.g === this.currentColor.g &&
        color.b === this.currentColor.b;

      p.noStroke();
      p.drawingContext.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
      p.ellipse(dotX, dotY, dotS - 4, dotS - 4);

      p.drawingContext.fillStyle = `rgba(${color.r},${color.g},${color.b},0.3)`;
      p.ellipse(dotX, dotY, dotS + 4, dotS + 4);

      if (isSelected) {
        p.noFill();
        p.stroke(255, 255, 255, 200);
        p.strokeWeight(2);
        p.ellipse(dotX, dotY, dotS + 2, dotS + 2);
      }
    }

    p.pop();
  }

  private drawStampIndicator(): void {
    const p = this.p;
    const mouseX = this.getMouseX();
    const mouseY = this.getMouseY();

    p.push();
    p.noFill();
    p.stroke(255, 255, 255, 100);
    p.strokeWeight(1.5);
    p.setLineDash([5, 5]);
    p.ellipse(mouseX, mouseY, 50, 50);
    p.pop();
  }

  mousePressed(): void {
    const p = this.p;
    const mouseX = this.getMouseX();
    const mouseY = this.getMouseY();

    if (this.handleUIClick(mouseX, mouseY)) {
      return;
    }

    const clickedSpot = this.particleSystem.findSpotAt(mouseX, mouseY);
    if (clickedSpot) {
      this.particleSystem.explodeSpot(clickedSpot);
      return;
    }

    if (this.stampMode) {
      const stampColor = STAMP_COLORS[Math.floor(p.random(STAMP_COLORS.length))];
      this.particleSystem.addStamp(mouseX, mouseY, stampColor);
      this.stampMode = false;
      return;
    }

    this.isDrawing = true;
    this.isSettling = false;
    this.lastMouseX = mouseX;
    this.lastMouseY = mouseY;
    this.lastMoveTime = p.millis();
    this.lastEmitTime = p.millis();
    this.showInkPalette = false;
  }

  mouseDragged(): void {
    if (this.isDrawing) {
      this.lastMoveTime = this.p.millis();
    }
  }

  mouseReleased(): void {
    this.isDrawing = false;
  }

  touchStarted(): void {
    this.mousePressed();
  }

  touchMoved(): void {
    this.mouseDragged();
  }

  touchEnded(): void {
    this.mouseReleased();
  }

  mouseMoved(): void {
    const mouseX = this.getMouseX();
    const mouseY = this.getMouseY();

    const inkBtnX = this.BTN_MARGIN;
    const inkBtnY = this.BTN_MARGIN;
    const overInk = this.isPointInRect(mouseX, mouseY, inkBtnX, inkBtnY, this.BTN_SIZE, this.BTN_SIZE);

    const stampBtnX = this.BTN_MARGIN;
    const stampBtnY = this.BTN_MARGIN + this.BTN_SIZE + this.BTN_SPACING;
    const overStamp = this.isPointInRect(mouseX, mouseY, stampBtnX, stampBtnY, this.BTN_SIZE, this.BTN_SIZE);

    if (overInk && this.hoveredBtn !== 'ink') {
      this.setBtnHover('ink', true);
    } else if (!overInk && this.hoveredBtn === 'ink') {
      this.setBtnHover('ink', false);
    }

    if (overStamp && this.hoveredBtn !== 'stamp') {
      this.setBtnHover('stamp', true);
    } else if (!overStamp && this.hoveredBtn === 'stamp') {
      this.setBtnHover('stamp', false);
    }

    if (this.showInkPalette) {
      this.checkPaletteHover(mouseX, mouseY);
    }
  }

  private isPointInRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number): boolean {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }

  private checkPaletteHover(mouseX: number, mouseY: number): void {
  }

  private handleUIClick(mouseX: number, mouseY: number): boolean {
    const inkBtnX = this.BTN_MARGIN;
    const inkBtnY = this.BTN_MARGIN;
    if (this.isPointInRect(mouseX, mouseY, inkBtnX, inkBtnY, this.BTN_SIZE, this.BTN_SIZE)) {
      this.showInkPalette = !this.showInkPalette;
      this.stampMode = false;
      return true;
    }

    const stampBtnX = this.BTN_MARGIN;
    const stampBtnY = this.BTN_MARGIN + this.BTN_SIZE + this.BTN_SPACING;
    if (this.isPointInRect(mouseX, mouseY, stampBtnX, stampBtnY, this.BTN_SIZE, this.BTN_SIZE)) {
      this.stampMode = !this.stampMode;
      this.showInkPalette = false;
      return true;
    }

    if (this.showInkPalette) {
      const paletteX = inkBtnX + this.BTN_SIZE + this.BTN_SPACING;
      const paletteY = inkBtnY;
      const color = this.getPaletteColorAt(mouseX, mouseY, paletteX, paletteY);
      if (color) {
        this.setColor(color);
        return true;
      }
    }

    return false;
  }

  private getPaletteColorAt(mouseX: number, mouseY: number, px: number, py: number): ColorRGB | null {
    const dotS = this.COLOR_DOT_SIZE;
    const spacing = this.COLOR_DOT_SPACING;
    const cols = 3;

    for (let i = 0; i < NEBULA_COLORS.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const dotX = px + spacing + col * (dotS + spacing) + dotS / 2;
      const dotY = py + spacing + row * (dotS + spacing) + dotS / 2;
      const dist = Math.sqrt((mouseX - dotX) ** 2 + (mouseY - dotY) ** 2);
      if (dist < dotS / 2 + 5) {
        return NEBULA_COLORS[i];
      }
    }
    return null;
  }

  private setColor(color: ColorRGB): void {
    const p = this.p;
    this.colorTransitionFrom = { ...this.displayColor };
    this.currentColor = { ...color };
    this.colorTransitionStart = p.millis();
    this.particleSystem.setColor(color);
  }

  windowResized(): void {
    const p = this.p;
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    this.galaxyBand.resize();
  }
}

declare module 'p5' {
  interface p5InstanceExtensions {
    setLineDash(dash: number[]): void;
    touches: { x: number; y: number }[];
  }
}

const sketch = (p: p5): void => {
  let app: StarTrailApp;

  p.setup = () => {
    app = new StarTrailApp(p);
    app.setup();

    p.Renderer2D.prototype.setLineDash = function (dash: number[]) {
      this.drawingContext.setLineDash(dash);
    };
  };

  p.draw = () => {
    app.draw();
  };

  p.mousePressed = () => {
    app.mousePressed();
  };

  p.mouseDragged = () => {
    app.mouseDragged();
  };

  p.mouseReleased = () => {
    app.mouseReleased();
  };

  p.mouseMoved = () => {
    app.mouseMoved();
  };

  p.touchStarted = () => {
    app.touchStarted();
  };

  p.touchMoved = () => {
    app.touchMoved();
  };

  p.touchEnded = () => {
    app.touchEnded();
  };

  p.windowResized = () => {
    app.windowResized();
  };
};

new p5(sketch, document.getElementById('app')!);
