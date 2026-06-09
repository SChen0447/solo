import p5 from 'p5';
import { InkDrop, RGB } from './inkDrop';
import { WaterFlow } from './waterFlow';

const CANVAS_WIDTH = 600;
const CANVAS_INITIAL_HEIGHT = 800;
const CANVAS_EXTEND_THRESHOLD = 100;
const INK_COLORS: RGB[] = [
  { r: 192, g: 57, b: 43 },
  { r: 41, g: 128, b: 185 },
  { r: 39, g: 174, b: 96 },
  { r: 243, g: 156, b: 18 },
];

interface InkLine {
  x: number;
  startY: number;
  currentY: number;
  targetY: number;
  baseWidth: number;
  widthPhase: number;
  startTime: number;
}

interface OverlapDeposit {
  x: number;
  y: number;
  radius: number;
  color: RGB;
  opacity: number;
}

class InkScrollSketch {
  private p: p5;
  private inkDrops: InkDrop[] = [];
  private waterFlows: WaterFlow[] = [];
  private activeFlow: WaterFlow | null = null;
  private inkLines: InkLine[] = [];
  private overlapDeposits: OverlapDeposit[] = [];
  private buffer: p5.Graphics | null = null;
  private isDrawingWaterFlow = false;
  private lastInkLineTime = 0;
  private humidity = 0.6;
  private inkDensity = 0.5;
  private diffusionSpeed = 1.0;
  private paperNoiseSeed = 0;
  private lastFrameTime = 0;
  private processedOverlaps = new Set<string>();
  private canvasHeight = CANVAS_INITIAL_HEIGHT;

  constructor() {
    this.p = new p5((sketch: p5) => {
      sketch.setup = () => this.setup(sketch);
      sketch.draw = () => this.draw(sketch);
      sketch.mousePressed = () => this.mousePressed(sketch);
      sketch.mouseDragged = () => this.mouseDragged(sketch);
      sketch.mouseReleased = () => this.mouseReleased(sketch);
      sketch.keyPressed = () => this.keyPressed(sketch);
    }, 'canvas-container');

    this.setupUIControls();
  }

  private setup(p: p5): void {
    const canvas = p.createCanvas(CANVAS_WIDTH, this.canvasHeight);
    canvas.parent('canvas-container');
    canvas.style('display', 'block');

    this.buffer = p.createGraphics(CANVAS_WIDTH, this.canvasHeight);
    this.buffer.pixelDensity(1);

    this.paperNoiseSeed = p.random(10000);
    this.lastFrameTime = p.millis();
    this.lastInkLineTime = p.millis();

    this.addInitialInkLine(p);
  }

  private draw(p: p5): void {
    const currentTime = p.millis();
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    this.autoAddInkLines(p, currentTime);

    this.updateInkDrops(deltaTime);
    this.checkOverlaps(p);
    this.updateWaterFlows(p, deltaTime);
    this.updateInkLines(p, deltaTime);

    this.drawPaperTexture(p);

    if (this.buffer) {
      p.image(this.buffer, 0, 0);
    }

    this.drawInkLines(p);
    this.drawOverlapDeposits(p);
    this.drawActiveInkDrops(p);
    this.drawWaterFlows(p);

    if (this.activeFlow) {
      this.activeFlow.draw();
    }

    this.extendCanvasIfNeeded(p);
  }

  private drawPaperTexture(p: p5): void {
    p.noStroke();

    for (let y = 0; y < this.canvasHeight; y += 4) {
      const t = y / this.canvasHeight;
      const r = p.lerp(245, 250, t);
      const g = p.lerp(240, 246, t);
      const b = p.lerp(225, 235, t);
      p.fill(r, g, b);
      p.rect(0, y, CANVAS_WIDTH, 4);
    }

    p.loadPixels();
    const pixels = p.pixels;
    for (let i = 0; i < pixels.length; i += 16) {
      const noiseVal = p.noise(
        ((i / 4) % CANVAS_WIDTH) * 0.05 + this.paperNoiseSeed,
        Math.floor(i / 4 / CANVAS_WIDTH) * 0.05 + this.paperNoiseSeed
      );
      const variation = p.map(noiseVal, 0, 1, -8, 8);
      pixels[i] = p.constrain(pixels[i] + variation, 0, 255);
      pixels[i + 1] = p.constrain(pixels[i + 1] + variation, 0, 255);
      pixels[i + 2] = p.constrain(pixels[i + 2] + variation, 0, 255);
    }
    p.updatePixels();
  }

  private updateInkDrops(deltaTime: number): void {
    for (let i = this.inkDrops.length - 1; i >= 0; i--) {
      const drop = this.inkDrops[i];
      drop.update(deltaTime);

      if (drop.isComplete && this.buffer) {
        drop.drawStatic(this.buffer);
        this.inkDrops.splice(i, 1);
      }
    }
  }

  private checkOverlaps(p: p5): void {
    for (let i = 0; i < this.inkDrops.length; i++) {
      for (let j = i + 1; j < this.inkDrops.length; j++) {
        const a = this.inkDrops[i];
        const b = this.inkDrops[j];
        const key = `${Math.min(a.startTime, b.startTime)}-${Math.max(a.startTime, b.startTime)}`;

        if (this.processedOverlaps.has(key)) continue;

        if (a.overlapsWith(b)) {
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const overlapDist = (a.currentRadius + b.currentRadius - dist) / 2;

          if (overlapDist > 0) {
            const t = a.currentRadius / (a.currentRadius + b.currentRadius);
            const depositX = a.x + dx * t;
            const depositY = a.y + dy * t;

            const mixedColor = InkDrop.mixColors(a, b);
            const saturatedColor = InkDrop.increaseSaturation(mixedColor, 0.2);
            const depositRadius = overlapDist * 0.6;

            this.overlapDeposits.push({
              x: depositX,
              y: depositY,
              radius: depositRadius,
              color: saturatedColor,
              opacity: p.min(a.opacity, b.opacity) * 0.85,
            });

            this.processedOverlaps.add(key);
          }
        }
      }
    }
  }

  private drawOverlapDeposits(p: p5): void {
    for (let i = this.overlapDeposits.length - 1; i >= 0; i--) {
      const deposit = this.overlapDeposits[i];
      const segments = 32;

      p.push();
      p.noStroke();

      for (let layer = 0; layer < 3; layer++) {
        const r = deposit.radius * (1 - layer * 0.2);
        const alpha = deposit.opacity * (1 - layer * 0.2);

        p.fill(deposit.color.r, deposit.color.g, deposit.color.b, alpha * 255);
        p.beginShape();

        for (let k = 0; k <= segments; k++) {
          const angle = (k / segments) * p.TWO_PI;
          const noiseVal = p.noise(
            deposit.x * 0.05 + Math.cos(angle) * 0.15,
            deposit.y * 0.05 + Math.sin(angle) * 0.15,
            layer
          );
          const perturbed = r + (noiseVal - 0.5) * r * 0.3;
          const px = deposit.x + Math.cos(angle) * perturbed;
          const py = deposit.y + Math.sin(angle) * perturbed;
          p.vertex(px, py);
        }
        p.endShape(p.CLOSE);
      }
      p.pop();

      if (this.buffer) {
        this.drawDepositToBuffer(this.buffer, deposit);
        this.overlapDeposits.splice(i, 1);
      }
    }
  }

  private drawDepositToBuffer(buffer: p5.Graphics, deposit: OverlapDeposit): void {
    const segments = 32;
    buffer.push();
    buffer.noStroke();

    for (let layer = 0; layer < 3; layer++) {
      const r = deposit.radius * (1 - layer * 0.2);
      const alpha = deposit.opacity * (1 - layer * 0.2);

      buffer.fill(deposit.color.r, deposit.color.g, deposit.color.b, alpha * 255);
      buffer.beginShape();

      for (let k = 0; k <= segments; k++) {
        const angle = (k / segments) * buffer.TWO_PI;
        const noiseVal = buffer.noise(
          deposit.x * 0.05 + Math.cos(angle) * 0.15,
          deposit.y * 0.05 + Math.sin(angle) * 0.15,
          layer
        );
        const perturbed = r + (noiseVal - 0.5) * r * 0.3;
        const px = deposit.x + Math.cos(angle) * perturbed;
        const py = deposit.y + Math.sin(angle) * perturbed;
        buffer.vertex(px, py);
      }
      buffer.endShape(buffer.CLOSE);
    }
    buffer.pop();
  }

  private drawActiveInkDrops(_p: p5): void {
    for (const drop of this.inkDrops) {
      drop.draw();
    }
  }

  private updateWaterFlows(p: p5, deltaTime: number): void {
    for (let i = this.waterFlows.length - 1; i >= 0; i--) {
      const flow = this.waterFlows[i];
      flow.trapInk(this.inkDrops);
      flow.update(deltaTime);

      if (flow.isComplete) {
        if (this.buffer) {
          flow.drawStatic(this.buffer);
        }
        this.waterFlows.splice(i, 1);
      }
    }
  }

  private drawWaterFlows(_p: p5): void {
    for (const flow of this.waterFlows) {
      flow.draw();
    }
  }

  private addInitialInkLine(p: p5): void {
    this.inkLines.push({
      x: 80,
      startY: 0,
      currentY: 0,
      targetY: this.canvasHeight,
      baseWidth: 2,
      widthPhase: 0,
      startTime: p.millis(),
    });
  }

  private autoAddInkLines(p: p5, currentTime: number): void {
    if (currentTime - this.lastInkLineTime >= 30000) {
      const lastX = this.inkLines.length > 0
        ? this.inkLines[this.inkLines.length - 1].x
        : 80;
      const offset = p.random(10, 20);
      const direction = p.random() > 0.5 ? 1 : -1;
      let newX = lastX + direction * offset;
      newX = p.constrain(newX, 30, CANVAS_WIDTH - 30);

      this.inkLines.push({
        x: newX,
        startY: 0,
        currentY: 0,
        targetY: this.canvasHeight,
        baseWidth: 2,
        widthPhase: 0,
        startTime: p.millis(),
      });

      this.lastInkLineTime = currentTime;
    }
  }

  private updateInkLines(p: p5, deltaTime: number): void {
    for (const line of this.inkLines) {
      if (line.currentY < line.targetY) {
        line.currentY = p.min(
          line.currentY + (deltaTime * 40) / 1000,
          line.targetY
        );
      }
      line.widthPhase += deltaTime * 0.001 * (p.TWO_PI / 10);
    }
  }

  private drawInkLines(p: p5): void {
    for (const line of this.inkLines) {
      const widthVariation = Math.sin(line.widthPhase);
      const currentWidth = p.lerp(2, 4, (widthVariation + 1) / 2);

      p.noFill();
      p.strokeCap(p.ROUND);

      const gradientSteps = Math.ceil(line.currentY);
      for (let i = 0; i < gradientSteps; i++) {
        const t = i / gradientSteps;
        const r = p.lerp(51, 102, t);
        const g = p.lerp(51, 102, t);
        const b = p.lerp(51, 102, t);
        const w = currentWidth * (0.8 + p.noise(line.x * 0.01, i * 0.02) * 0.4);

        p.stroke(r, g, b, this.inkDensity * 255);
        p.strokeWeight(w * this.inkDensity);
        p.point(line.x + (p.noise(line.x * 0.05, i * 0.03) - 0.5) * 2, i);
      }
    }
  }

  private extendCanvasIfNeeded(p: p5): void {
    let needsExtend = false;
    for (const line of this.inkLines) {
      if (this.canvasHeight - line.currentY < CANVAS_EXTEND_THRESHOLD) {
        needsExtend = true;
        break;
      }
    }
    for (const drop of this.inkDrops) {
      if (this.canvasHeight - drop.y < CANVAS_EXTEND_THRESHOLD + drop.currentRadius) {
        needsExtend = true;
        break;
      }
    }

    if (needsExtend) {
      const oldHeight = this.canvasHeight;
      this.canvasHeight += 400;

      p.resizeCanvas(CANVAS_WIDTH, this.canvasHeight);

      const oldBuffer = this.buffer;
      this.buffer = p.createGraphics(CANVAS_WIDTH, this.canvasHeight);
      if (oldBuffer) {
        this.buffer.image(oldBuffer, 0, 0);
      }

      for (const line of this.inkLines) {
        line.targetY = this.canvasHeight;
      }
    }
  }

  private mousePressed(p: p5): void {
    if (!this.isMouseOverCanvas(p)) return;

    const canvasX = this.getCanvasX(p);
    const canvasY = this.getCanvasY(p);

    this.addInkDrop(p, canvasX, canvasY);

    if (p.keyIsDown(p.SHIFT)) {
      this.isDrawingWaterFlow = true;
      this.activeFlow = new WaterFlow(p, canvasX, canvasY);
    }
  }

  private mouseDragged(p: p5): void {
    if (!this.isMouseOverCanvas(p)) return;

    const canvasX = this.getCanvasX(p);
    const canvasY = this.getCanvasY(p);

    if (this.isDrawingWaterFlow && this.activeFlow) {
      this.activeFlow.addPoint(canvasX, canvasY);
    } else {
      if (p.frameCount % 3 === 0) {
        this.addInkDrop(p, canvasX, canvasY);
      }
    }
  }

  private mouseReleased(_p: p5): void {
    if (this.isDrawingWaterFlow && this.activeFlow) {
      this.activeFlow.finish();
      this.waterFlows.push(this.activeFlow);
      this.activeFlow = null;
    }
    this.isDrawingWaterFlow = false;
  }

  private keyPressed(p: p5): void {
    if (p.keyCode === p.UP_ARROW) {
      this.humidity = p.min(1.0, this.humidity + 0.05);
      this.updateHumiditySlider();
    } else if (p.keyCode === p.DOWN_ARROW) {
      this.humidity = p.max(0.2, this.humidity - 0.05);
      this.updateHumiditySlider();
    }
  }

  private updateHumiditySlider(): void {
    const slider = document.getElementById('humidity') as HTMLInputElement | null;
    const valueDisplay = document.getElementById('humidity-value');
    if (slider) {
      slider.value = String(Math.round(this.humidity * 100));
    }
    if (valueDisplay) {
      valueDisplay.textContent = String(Math.round(this.humidity * 100));
    }
  }

  private addInkDrop(p: p5, x: number, y: number): void {
    if (this.inkDrops.length >= 100) return;

    const color = INK_COLORS[Math.floor(p.random(INK_COLORS.length))];
    const drop = new InkDrop(
      p,
      x,
      y,
      {
        r: Math.round(color.r * (0.7 + this.inkDensity * 0.3)),
        g: Math.round(color.g * (0.7 + this.inkDensity * 0.3)),
        b: Math.round(color.b * (0.7 + this.inkDensity * 0.3)),
      },
      this.humidity,
      this.diffusionSpeed
    );
    this.inkDrops.push(drop);
  }

  private isMouseOverCanvas(p: p5): boolean {
    return (
      p.mouseX >= 0 &&
      p.mouseX <= CANVAS_WIDTH &&
      p.mouseY >= 0 &&
      p.mouseY <= this.canvasHeight
    );
  }

  private getCanvasX(p: p5): number {
    return p.constrain(p.mouseX, 0, CANVAS_WIDTH);
  }

  private getCanvasY(p: p5): number {
    return p.constrain(p.mouseY, 0, this.canvasHeight);
  }

  private setupUIControls(): void {
    const humiditySlider = document.getElementById('humidity') as HTMLInputElement | null;
    const densitySlider = document.getElementById('density') as HTMLInputElement | null;
    const diffusionSlider = document.getElementById('diffusion') as HTMLInputElement | null;
    const resetBtn = document.getElementById('reset-btn');

    if (humiditySlider) {
      humiditySlider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        this.humidity = parseInt(target.value) / 100;
        const display = document.getElementById('humidity-value');
        if (display) display.textContent = target.value;
      });
    }

    if (densitySlider) {
      densitySlider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        this.inkDensity = parseInt(target.value) / 100;
        const display = document.getElementById('density-value');
        if (display) display.textContent = target.value;
      });
    }

    if (diffusionSlider) {
      diffusionSlider.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        this.diffusionSpeed = 0.3 + (parseInt(target.value) / 100) * 1.4;
        const display = document.getElementById('diffusion-value');
        if (display) display.textContent = target.value;
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.reset();
      });
    }
  }

  private reset(): void {
    this.inkDrops = [];
    this.waterFlows = [];
    this.activeFlow = null;
    this.inkLines = [];
    this.overlapDeposits = [];
    this.processedOverlaps.clear();
    this.canvasHeight = CANVAS_INITIAL_HEIGHT;
    this.isDrawingWaterFlow = false;

    if (this.buffer) {
      this.buffer.clear();
    }

    if (this.p) {
      this.p.resizeCanvas(CANVAS_WIDTH, this.canvasHeight);
      this.buffer = this.p.createGraphics(CANVAS_WIDTH, this.canvasHeight);
      this.addInitialInkLine(this.p);
      this.lastInkLineTime = this.p.millis();
      this.lastFrameTime = this.p.millis();
    }
  }
}

new InkScrollSketch();
