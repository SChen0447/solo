import p5 from 'p5';
import { Fragment, PALETTES, averageColors, ColorPalette } from './fragment';

interface RippleEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  wave: boolean;
  life: number;
}

interface FloatingDot {
  x: number;
  y: number;
  r: number;
  color: p5.Color;
  vx: number;
  vy: number;
  phase: number;
}

interface SpatialHash {
  [key: string]: number[];
}

export class KaleidoscopeSketch {
  private p: p5;
  private fragments: Fragment[] = [];
  private ripples: RippleEffect[] = [];
  private floatingDots: FloatingDot[] = [];

  private centerX: number = 0;
  private centerY: number = 0;
  private kaleidoRadius: number = 250;
  private baseRadius: number = 250;

  private currentPalette: ColorPalette = PALETTES[3];
  private targetPalette: ColorPalette = PALETTES[3];
  private paletteTransition: number = 1;

  private densitySlider: HTMLInputElement | null = null;
  private speedSlider: HTMLInputElement | null = null;
  private sizeSlider: HTMLInputElement | null = null;
  private paletteButtons: HTMLButtonElement[] = [];
  private panelElement: HTMLDivElement | null = null;
  private toggleButton: HTMLButtonElement | null = null;
  private panelExpanded: boolean = false;

  private targetDensity: number = 30;
  private density: number = 30;
  private speedMultiplier: number = 1.0;
  private sizeMultiplier: number = 1.0;

  private collisionCount: number = 0;
  private collisionCountBuffer: number[] = [];
  private fpsBuffer: number[] = [];
  private lastTime: number = 0;
  private frameCount60: number = 0;

  private clickTimeout: number | null = null;
  private lastClickTime: number = 0;
  private doubleClickThreshold: number = 250;

  private isWideScreen: boolean = false;
  private isNarrowScreen: boolean = false;

  constructor(p: p5) {
    this.p = p;
  }

  public setup(): void {
    const p = this.p;
    p.createCanvas(p.windowWidth, p.windowHeight);
    this.centerX = p.width / 2;
    this.centerY = p.height / 2;
    this.updateResponsive();
    this.createUI();
    this.spawnInitialFragments(25);
    this.lastTime = p.millis();
  }

  private spawnInitialFragments(count: number): void {
    const p = this.p;
    for (let i = 0; i < count; i++) {
      const angle = p.random(p.TWO_PI);
      const dist = p.random(0, this.kaleidoRadius - 40);
      const x = this.centerX + Math.cos(angle) * dist;
      const y = this.centerY + Math.sin(angle) * dist;
      const sides = Math.floor(p.random(4, 9));
      const radius = p.random(15, 35);
      const color = this.getRandomPaletteColor();
      this.fragments.push(new Fragment(p, { x, y, sides, radius, color }));
    }
  }

  private getRandomPaletteColor(): p5.Color {
    const p = this.p;
    const palette = this.currentPalette;
    const hex = palette.colors[Math.floor(p.random(palette.colors.length))];
    return p.color(hex);
  }

  private createUI(): void {
    const container = document.getElementById('app');
    if (!container) return;

    this.panelElement = document.createElement('div');
    this.panelElement.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(26, 26, 42, 0.7);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 16px 24px;
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      align-items: center;
      justify-content: center;
      z-index: 100;
      transition: all 0.3s ease;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      max-width: 90vw;
    `;

    this.densitySlider = this.createSlider('碎片密度', 10, 60, 30, (val) => {
      this.targetDensity = val;
    });

    this.speedSlider = this.createSlider('旋转速度', 0.5, 3.0, 1.0, (val) => {
      this.speedMultiplier = val;
    }, 0.1);

    this.sizeSlider = this.createSlider('大小缩放', 0.5, 2.0, 1.0, (val) => {
      this.sizeMultiplier = val;
    }, 0.1);

    const paletteContainer = document.createElement('div');
    paletteContainer.style.display = 'flex';
    paletteContainer.style.flexDirection = 'column';
    paletteContainer.style.gap = '6px';

    const paletteLabel = document.createElement('span');
    paletteLabel.textContent = '颜色模式';
    paletteLabel.style.color = '#ffffff';
    paletteLabel.style.fontSize = '12px';
    paletteLabel.style.opacity = '0.8';
    paletteContainer.appendChild(paletteLabel);

    const buttonsWrap = document.createElement('div');
    buttonsWrap.style.display = 'flex';
    buttonsWrap.style.gap = '6px';

    PALETTES.forEach((palette, idx) => {
      const btn = document.createElement('button');
      btn.textContent = palette.name;
      btn.style.cssText = `
        padding: 6px 12px;
        border: none;
        border-radius: 12px;
        background: rgba(68, 68, 102, 0.6);
        color: white;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      `;
      if (idx === 3) {
        btn.style.background = 'rgba(170, 68, 255, 0.8)';
        btn.style.boxShadow = '0 0 12px rgba(170, 68, 255, 0.5)';
      }
      this.addButtonInteractions(btn);
      btn.addEventListener('click', () => {
        this.targetPalette = palette;
        this.paletteTransition = 0;
        this.paletteButtons.forEach(b => {
          b.style.background = 'rgba(68, 68, 102, 0.6)';
          b.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        });
        btn.style.background = 'rgba(170, 68, 255, 0.8)';
        btn.style.boxShadow = '0 0 12px rgba(170, 68, 255, 0.5)';
      });
      this.paletteButtons.push(btn);
      buttonsWrap.appendChild(btn);
    });
    paletteContainer.appendChild(buttonsWrap);

    this.panelElement.appendChild(this.densitySlider.parentElement!);
    this.panelElement.appendChild(this.speedSlider.parentElement!);
    this.panelElement.appendChild(this.sizeSlider.parentElement!);
    this.panelElement.appendChild(paletteContainer);

    this.toggleButton = document.createElement('button');
    this.toggleButton.textContent = '控制面板 ▲';
    this.toggleButton.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 24px;
      border: none;
      border-radius: 12px;
      background: rgba(26, 26, 42, 0.8);
      color: white;
      font-size: 14px;
      cursor: pointer;
      z-index: 101;
      display: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    `;
    this.addButtonInteractions(this.toggleButton);
    this.toggleButton.addEventListener('click', () => {
      this.panelExpanded = !this.panelExpanded;
      if (this.toggleButton && this.panelElement) {
        this.toggleButton.textContent = this.panelExpanded ? '控制面板 ▼' : '控制面板 ▲';
        this.panelElement.style.display = this.panelExpanded ? 'flex' : 'none';
      }
    });

    container.appendChild(this.panelElement);
    container.appendChild(this.toggleButton);
  }

  private createSlider(
    label: string,
    min: number,
    max: number,
    value: number,
    onChange: (val: number) => void,
    step: number = 1
  ): HTMLInputElement {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '6px';
    container.style.minWidth = '140px';

    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;
    labelSpan.style.color = '#ffffff';
    labelSpan.style.fontSize = '12px';
    labelSpan.style.opacity = '0.8';
    container.appendChild(labelSpan);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);
    slider.style.cssText = `
      -webkit-appearance: none;
      appearance: none;
      width: 140px;
      height: 6px;
      border-radius: 3px;
      background: #444466;
      outline: none;
      cursor: pointer;
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #ffffff;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(255,255,255,0.6);
        transition: all 0.2s ease;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 16px rgba(255,255,255,0.9);
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #ffffff;
        cursor: pointer;
        border: none;
        box-shadow: 0 0 10px rgba(255,255,255,0.6);
      }
    `;
    document.head.appendChild(styleEl);

    const valueSpan = document.createElement('span');
    valueSpan.textContent = String(value);
    valueSpan.style.color = '#aa88ff';
    valueSpan.style.fontSize = '11px';
    valueSpan.style.textAlign = 'right';
    container.appendChild(valueSpan);

    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value);
      valueSpan.textContent = step < 1 ? val.toFixed(1) : String(Math.round(val));
      onChange(val);
    });

    container.appendChild(slider);
    container.appendChild(valueSpan);
    return slider;
  }

  private addButtonInteractions(btn: HTMLElement): void {
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'translateY(-2px)';
      if (btn.parentElement === this.panelElement || btn === this.toggleButton) {
        // handled by css
      }
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translateY(0)';
    });
    btn.addEventListener('mousedown', () => {
      btn.style.transform = 'translateY(1px) scale(0.97)';
    });
    btn.addEventListener('mouseup', () => {
      btn.style.transform = 'translateY(-1px)';
      setTimeout(() => {
        btn.style.transform = 'translateY(0)';
      }, 150);
    });
  }

  public windowResized(): void {
    const p = this.p;
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    this.centerX = p.width / 2;
    this.centerY = p.height / 2;
    this.updateResponsive();
  }

  private updateResponsive(): void {
    const p = this.p;
    this.isNarrowScreen = p.width < 600;
    this.isWideScreen = p.width > 1200;

    if (this.isNarrowScreen) {
      this.kaleidoRadius = p.width * 0.4;
      if (this.panelElement && this.toggleButton) {
        this.toggleButton.style.display = 'block';
        if (!this.panelExpanded) {
          this.panelElement.style.display = 'none';
        }
        this.toggleButton.style.bottom = '10px';
        this.panelElement.style.bottom = '50px';
      }
    } else {
      this.kaleidoRadius = this.isWideScreen ? 350 : this.baseRadius;
      if (this.panelElement && this.toggleButton) {
        this.toggleButton.style.display = 'none';
        this.panelElement.style.display = 'flex';
        this.panelElement.style.bottom = '20px';
      }
    }

    if (this.isWideScreen && this.floatingDots.length === 0) {
      this.spawnFloatingDots(60);
    } else if (!this.isWideScreen) {
      this.floatingDots = [];
    }
  }

  private spawnFloatingDots(count: number): void {
    const p = this.p;
    this.floatingDots = [];
    for (let i = 0; i < count; i++) {
      this.floatingDots.push({
        x: p.random(p.width),
        y: p.random(p.height),
        r: p.random(2, 5),
        color: this.getRandomPaletteColor(),
        vx: (p.random() - 0.5) * 0.3,
        vy: (p.random() - 0.5) * 0.3,
        phase: p.random(p.TWO_PI)
      });
    }
  }

  public mousePressed(): void {
    const p = this.p;
    const now = p.millis();

    if (this.clickTimeout) {
      clearTimeout(this.clickTimeout);
      this.clickTimeout = null;
    }

    if (now - this.lastClickTime < this.doubleClickThreshold) {
      this.handleDoubleClick(p.mouseX, p.mouseY);
      this.lastClickTime = 0;
      return;
    }

    this.lastClickTime = now;
    this.clickTimeout = window.setTimeout(() => {
      this.handleSingleClick(p.mouseX, p.mouseY);
      this.clickTimeout = null;
    }, this.doubleClickThreshold);
  }

  private handleSingleClick(mx: number, my: number): void {
    const p = this.p;
    const dx = mx - this.centerX;
    const dy = my - this.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.kaleidoRadius) return;

    const count = Math.floor(p.random(3, 6));
    for (let i = 0; i < count; i++) {
      const angle = p.random(p.TWO_PI);
      const speed = p.random(1.5, 3.5);
      const sides = Math.floor(p.random(3, 6));
      const radius = p.random(8, 15);
      const color = this.getRandomPaletteColor();
      this.fragments.push(new Fragment(p, {
        x: mx,
        y: my,
        sides,
        radius,
        color,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed
      }));
    }

    this.ripples.push({
      x: mx,
      y: my,
      radius: 10,
      maxRadius: 60,
      alpha: 0.6,
      wave: false,
      life: 30
    });
  }

  private handleDoubleClick(mx: number, my: number): void {
    const p = this.p;
    const clickedIdx = this.findFragmentAt(mx, my);
    if (clickedIdx === -1) return;

    const clicked = this.fragments[clickedIdx];
    const toMerge: number[] = [clickedIdx];

    for (let i = 0; i < this.fragments.length; i++) {
      if (i === clickedIdx) continue;
      const f = this.fragments[i];
      const dx = f.x - clicked.x;
      const dy = f.y - clicked.y;
      if (Math.sqrt(dx * dx + dy * dy) < 40) {
        toMerge.push(i);
      }
    }

    if (toMerge.length < 2) return;

    toMerge.sort((a, b) => b - a);

    const mergeColors: p5.Color[] = toMerge.map(i => this.fragments[i].color);
    const avgColor = averageColors(p, mergeColors);
    const newRadius = Math.min(50, Math.max(30, toMerge.length * 8));
    const newSides = Math.floor(p.random(7, 10));

    const newFragment = new Fragment(p, {
      x: clicked.x,
      y: clicked.y,
      sides: newSides,
      radius: newRadius,
      color: avgColor,
      vx: clicked.vx,
      vy: clicked.vy
    });

    for (const idx of toMerge) {
      this.fragments.splice(idx, 1);
    }

    this.fragments.push(newFragment);

    this.ripples.push({
      x: clicked.x,
      y: clicked.y,
      radius: 10,
      maxRadius: 150,
      alpha: 0.8,
      wave: true,
      life: 120
    });
  }

  private findFragmentAt(x: number, y: number): number {
    for (let i = this.fragments.length - 1; i >= 0; i--) {
      const f = this.fragments[i];
      const dx = x - f.x;
      const dy = y - f.y;
      if (Math.sqrt(dx * dx + dy * dy) < f.radius) {
        return i;
      }
    }
    return -1;
  }

  public draw(): void {
    const p = this.p;
    const now = p.millis();
    const dt = now - this.lastTime;
    this.lastTime = now;

    this.density = p.lerp(this.density, this.targetDensity, 0.1);
    this.adjustFragmentCount();

    if (this.paletteTransition < 1) {
      this.paletteTransition = Math.min(1, this.paletteTransition + 0.03);
      if (this.paletteTransition >= 0.5 && this.currentPalette !== this.targetPalette) {
        this.currentPalette = this.targetPalette;
        this.recolorAllFragments();
      }
    }

    p.background(0);

    this.drawFloatingDots(dt);
    this.drawKaleidoscopeBackground();

    this.checkCollisions();

    for (const f of this.fragments) {
      f.update(this.speedMultiplier, this.sizeMultiplier, this.centerX, this.centerY, this.kaleidoRadius, dt);
    }

    p.push();
    const ctx = (p as any).drawingContext;
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, this.kaleidoRadius, 0, p.TWO_PI);
    ctx.clip();

    for (const f of this.fragments) {
      f.render();
    }
    ctx.restore();
    p.pop();

    this.drawRipples(dt);
    this.drawStats();
    this.updateCollisionStats();

    this.frameCount60++;
    if (this.frameCount60 % 10 === 0) {
      this.fpsBuffer.push(1000 / dt);
      if (this.fpsBuffer.length > 6) this.fpsBuffer.shift();
    }
  }

  private adjustFragmentCount(): void {
    const p = this.p;
    const target = Math.round(this.density);

    while (this.fragments.length < target && this.fragments.length < 80) {
      const angle = p.random(p.TWO_PI);
      const dist = p.random(0, this.kaleidoRadius - 40);
      const x = this.centerX + Math.cos(angle) * dist;
      const y = this.centerY + Math.sin(angle) * dist;
      const sides = Math.floor(p.random(4, 9));
      const radius = p.random(15, 35);
      const color = this.getRandomPaletteColor();
      this.fragments.push(new Fragment(p, { x, y, sides, radius, color }));
    }

    while (this.fragments.length > target) {
      this.fragments.pop();
    }
  }

  private recolorAllFragments(): void {
    for (const f of this.fragments) {
      f.setColor(this.getRandomPaletteColor());
    }
    if (this.floatingDots.length > 0) {
      for (const dot of this.floatingDots) {
        dot.color = this.getRandomPaletteColor();
      }
    }
  }

  private checkCollisions(): void {
    const n = this.fragments.length;
    if (n < 2) return;

    if (n > 50) {
      this.checkCollisionsSpatialHash();
    } else {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          this.checkFragmentCollision(i, j);
        }
      }
    }
  }

  private checkCollisionsSpatialHash(): void {
    const cellSize = 50;
    const hash: SpatialHash = {};

    for (let i = 0; i < this.fragments.length; i++) {
      const f = this.fragments[i];
      const cx = Math.floor(f.x / cellSize);
      const cy = Math.floor(f.y / cellSize);
      const key = `${cx},${cy}`;
      if (!hash[key]) hash[key] = [];
      hash[key].push(i);
    }

    const checked = new Set<string>();
    for (const key in hash) {
      const [cx, cy] = key.split(',').map(Number);
      const bucket = hash[key];

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const neighborKey = `${cx + dx},${cy + dy}`;
          const neighborBucket = hash[neighborKey];
          if (!neighborBucket) continue;

          for (const i of bucket) {
            for (const j of neighborBucket) {
              if (i >= j) continue;
              const pairKey = `${i},${j}`;
              if (checked.has(pairKey)) continue;
              checked.add(pairKey);
              this.checkFragmentCollision(i, j);
            }
          }
        }
      }
    }
  }

  private checkFragmentCollision(i: number, j: number): void {
    const a = this.fragments[i];
    const b = this.fragments[j];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = a.radius + b.radius;

    if (dist < minDist && dist > 0) {
      this.collisionCount++;
      a.triggerCollisionFlash();
      b.triggerCollisionFlash();

      const nx = dx / dist;
      const ny = dy / dist;
      const dvx = a.vx - b.vx;
      const dvy = a.vy - b.vy;
      const dvn = dvx * nx + dvy * ny;

      if (dvn > 0) {
        a.vx -= dvn * nx * 0.8;
        a.vy -= dvn * ny * 0.8;
        b.vx += dvn * nx * 0.8;
        b.vy += dvn * ny * 0.8;
      }

      const overlap = (minDist - dist) / 2;
      a.x -= nx * overlap;
      a.y -= ny * overlap;
      b.x += nx * overlap;
      b.y += ny * overlap;
    }
  }

  private drawKaleidoscopeBackground(): void {
    const p = this.p;
    const cx = this.centerX;
    const cy = this.centerY;
    const r = this.kaleidoRadius;

    const c1 = p.color('#1a0a2a');
    const c2 = p.color('#0a0a3a');

    for (let i = r; i > 0; i--) {
      const t = i / r;
      const col = p.lerpColor(c2, c1, t);
      p.noStroke();
      p.fill(p.red(col), p.green(col), p.blue(col), 255);
      p.ellipse(cx, cy, i * 2, i * 2);
    }

    p.noFill();
    p.stroke(170, 136, 255, 120);
    p.strokeWeight(2);
    p.circle(cx, cy, r * 2);

    p.stroke(170, 136, 255, 40);
    p.strokeWeight(1);
    for (let i = 1; i <= 3; i++) {
      p.circle(cx, cy, (r * i * 2) / 4);
    }
  }

  private drawFloatingDots(_dt: number): void {
    if (!this.isWideScreen) return;
    const p = this.p;

    for (const dot of this.floatingDots) {
      dot.x += dot.vx;
      dot.y += dot.vy;
      dot.phase += 0.02;

      if (dot.x < 0) dot.x = p.width;
      if (dot.x > p.width) dot.x = 0;
      if (dot.y < 0) dot.y = p.height;
      if (dot.y > p.height) dot.y = 0;

      const pulse = 0.7 + Math.sin(dot.phase) * 0.3;
      p.push();
      p.blendMode(p.ADD);
      p.noStroke();
      p.fill(
        p.red(dot.color),
        p.green(dot.color),
        p.blue(dot.color),
        150 * pulse
      );
      p.circle(dot.x, dot.y, dot.r * 2 * pulse);
      p.pop();
    }
  }

  private drawRipples(_dt: number): void {
    const p = this.p;

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius = p.lerp(r.radius, r.maxRadius, 0.08);
      r.alpha = p.lerp(r.alpha, 0, 0.05);
      r.life--;

      if (r.wave) {
        p.push();
        p.noFill();
        p.stroke(255, 200, 255, r.alpha * 255);
        p.strokeWeight(2);
        const waveOffset = Math.sin(r.life * 0.2) * 5;
        for (let w = 0; w < 3; w++) {
          p.circle(r.x, r.y, (r.radius + w * 20 + waveOffset) * 2);
        }
        p.pop();
      } else {
        p.push();
        p.blendMode(p.ADD);
        p.noStroke();
        for (let g = 3; g >= 0; g--) {
          p.fill(255, 220, 255, r.alpha * 255 * (0.3 + g * 0.15));
          p.circle(r.x, r.y, (r.radius - g * 5) * 2);
        }
        p.pop();
      }

      if (r.life <= 0 || r.alpha < 0.01) {
        this.ripples.splice(i, 1);
      }
    }
  }

  private drawStats(): void {
    const p = this.p;
    p.push();
    p.textSize(16);
    p.textAlign(p.RIGHT, p.TOP);

    const stats = [
      `碎片总数: ${this.fragments.length}`,
      `平均转速: ${this.getAverageAngularVelocity().toFixed(2)} rad/s`,
      `碰撞次数: ${this.getCollisionsPerSecond()}/s`
    ];

    const x = p.width - 20;
    let y = 20;

    for (const line of stats) {
      p.stroke(0, 0, 0, 200);
      p.strokeWeight(3);
      p.noFill();
      p.text(line, x, y);

      p.noStroke();
      p.fill(255, 255, 255);
      p.text(line, x, y);

      y += 24;
    }
    p.pop();
  }

  private getAverageAngularVelocity(): number {
    if (this.fragments.length === 0) return 0;
    let total = 0;
    for (const f of this.fragments) {
      total += f.getAngularVelocity();
    }
    return (total / this.fragments.length) * this.speedMultiplier;
  }

  private updateCollisionStats(): void {
    if (this.frameCount60 % 6 === 0) {
      this.collisionCountBuffer.push(this.collisionCount);
      this.collisionCount = 0;
      if (this.collisionCountBuffer.length > 10) {
        this.collisionCountBuffer.shift();
      }
    }
  }

  private getCollisionsPerSecond(): number {
    if (this.collisionCountBuffer.length === 0) return 0;
    const sum = this.collisionCountBuffer.reduce((a, b) => a + b, 0);
    return Math.round((sum / this.collisionCountBuffer.length) * 10);
  }
}

export const createSketch = (p: p5): void => {
  const sketch = new KaleidoscopeSketch(p);

  p.setup = () => sketch.setup();
  p.draw = () => sketch.draw();
  p.windowResized = () => sketch.windowResized();
  p.mousePressed = () => sketch.mousePressed();
};
