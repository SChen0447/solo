import p5 from 'p5';
import {
  Step,
  ParticlePool,
  BPMManager,
  HistoryManager,
  StarField,
  hexToRgb,
  mixColors,
  MAX_STEPS,
  COLOR_PALETTE
} from './step';

export class StarTrailSketch {
  private p: p5;
  private steps: Step[] = [];
  private particlePool: ParticlePool;
  private bpmManager: BPMManager;
  private historyManager: HistoryManager;
  private starField: StarField;

  private isDragging: boolean = false;
  private isDrawingMode: boolean = false;
  private dragStartTime: number = 0;
  private longPressThreshold: number = 300;
  private isLongPress: boolean = false;
  private selectionStart: { x: number; y: number } | null = null;
  private selectionEnd: { x: number; y: number } | null = null;
  private lastDraggedStepPos: { x: number; y: number } | null = null;
  private minDragDistance: number = 15;

  private lastProcessedIndex: number = -1;
  private lastFrameTime: number = 0;

  private controlPanel: {
    visible: boolean;
    bpmSliderX: number;
    bpmSliderY: number;
    bpmSliderWidth: number;
    bpmSliderHeight: number;
    playBtnX: number;
    playBtnY: number;
    playBtnRadius: number;
    isDraggingSlider: boolean;
    isHoveringPlay: boolean;
    isHoveringSlider: boolean;
    playBtnScale: number;
  };

  constructor(p: p5) {
    this.p = p;
    this.particlePool = new ParticlePool();
    this.bpmManager = new BPMManager(80);
    this.historyManager = new HistoryManager();
    this.starField = new StarField(window.innerWidth, window.innerHeight, 150);

    this.controlPanel = {
      visible: true,
      bpmSliderX: 0,
      bpmSliderY: 0,
      bpmSliderWidth: 120,
      bpmSliderHeight: 6,
      playBtnX: 0,
      playBtnY: 0,
      playBtnRadius: 15,
      isDraggingSlider: false,
      isHoveringPlay: false,
      isHoveringSlider: false,
      playBtnScale: 1
    };

    this.bpmManager.onBeat = () => {
      this.triggerBeatEffect();
    };
  }

  setup(): void {
    this.p.createCanvas(window.innerWidth, window.innerHeight);
    this.lastFrameTime = performance.now();
    this.updateControlPanelPositions();
  }

  windowResized(): void {
    this.p.resizeCanvas(window.innerWidth, window.innerHeight);
    this.starField.generate(window.innerWidth, window.innerHeight, 150);
    this.updateControlPanelPositions();
  }

  private updateControlPanelPositions(): void {
    const isTouch = 'ontouchstart' in window;
    const panelWidth = isTouch ? this.p.width * 0.8 : 180;
    const panelX = this.p.width - panelWidth - 20;
    const panelY = 20;

    this.controlPanel.bpmSliderWidth = isTouch ? panelWidth - 60 : 120;
    this.controlPanel.bpmSliderX = panelX + 20;
    this.controlPanel.bpmSliderY = panelY + 70;

    this.controlPanel.playBtnX = panelX + panelWidth - 35;
    this.controlPanel.playBtnY = panelY + 35;
  }

  draw(): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;

    this.drawBackground();
    this.starField.draw(this.p);
    this.drawPaths();
    this.drawSteps();
    this.particlePool.update(deltaTime);
    this.particlePool.draw(this.p);
    this.updateAndDrawLightOrb();
    this.drawSelectionBox();
    this.drawControlPanel();
    this.drawInfoText();
  }

  private drawBackground(): void {
    const gradient = this.p.drawingContext.createLinearGradient(
      0, 0, 0, this.p.height
    );
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(1, '#1a0a2a');
    this.p.drawingContext.fillStyle = gradient;
    this.p.rect(0, 0, this.p.width, this.p.height);
  }

  private drawPaths(): void {
    if (this.steps.length < 2) return;

    for (let i = 0; i < this.steps.length - 1; i++) {
      const start = this.steps[i];
      const end = this.steps[i + 1];
      const distance = start.distanceTo(end);
      const isClose = distance < 30;
      const isDifferentColor = start.color !== end.color;
      const isCollision = isClose && isDifferentColor;

      let pathColor: string;
      if (isCollision) {
        pathColor = mixColors(start.color, end.color);
      } else {
        pathColor = mixColors(start.color, end.color);
      }

      const rgb = hexToRgb(pathColor.startsWith('#') ? pathColor : '#ffffff');

      this.p.noFill();
      this.p.stroke(rgb.r, rgb.g, rgb.b, 180);
      this.p.strokeWeight(2);

      this.drawBezierSegment(start, end, i);
    }
  }

  private drawBezierSegment(start: Step, end: Step, index: number): void {
    const prev = index > 0 ? this.steps[index - 1] : start;
    const next = index < this.steps.length - 2 ? this.steps[index + 2] : end;

    const cp1x = start.x + (end.x - prev.x) * 0.2;
    const cp1y = start.y + (end.y - prev.y) * 0.2;
    const cp2x = end.x - (next.x - start.x) * 0.2;
    const cp2y = end.y - (next.y - start.y) * 0.2;

    this.p.bezier(
      start.x, start.y,
      cp1x, cp1y,
      cp2x, cp2y,
      end.x, end.y
    );
  }

  private drawSteps(): void {
    for (const step of this.steps) {
      const scale = step.getSpawnScale();
      const pulseRadius = step.getPulseRadius();
      const displayRadius = pulseRadius * scale;
      const rgb = hexToRgb(step.color);

      this.p.drawingContext.save();
      this.p.drawingContext.shadowColor = step.color;
      this.p.drawingContext.shadowBlur = 12;

      this.p.noStroke();
      this.p.fill(rgb.r, rgb.g, rgb.b, 77);
      this.p.ellipse(step.x, step.y, displayRadius * 2 + 12, displayRadius * 2 + 12);

      this.p.drawingContext.shadowBlur = 0;

      this.p.fill(rgb.r, rgb.g, rgb.b, 255);
      this.p.ellipse(step.x, step.y, displayRadius * 2, displayRadius * 2);

      this.p.drawingContext.restore();

      if (step.selected) {
        this.p.noFill();
        this.p.stroke(255, 255, 255, 200);
        this.p.strokeWeight(2);
        this.p.ellipse(step.x, step.y, displayRadius * 2 + 8, displayRadius * 2 + 8);
      }
    }
  }

  private updateAndDrawLightOrb(): void {
    const pos = this.bpmManager.getPositionOnPath(this.steps);
    if (pos && this.steps.length >= 2) {
      const currentIndex = pos.currentIndex;
      if (currentIndex !== this.lastProcessedIndex) {
        this.processStepAt(currentIndex);
        this.lastProcessedIndex = currentIndex;
      }

      this.p.drawingContext.save();
      this.p.drawingContext.shadowColor = '#ffffff';
      this.p.drawingContext.shadowBlur = 20;

      this.p.noStroke();
      this.p.fill(255, 255, 255, 255);
      this.p.ellipse(pos.x, pos.y, 16, 16);

      this.p.fill(255, 255, 255, 100);
      this.p.ellipse(pos.x, pos.y, 28, 28);

      this.p.drawingContext.restore();
    } else {
      this.lastProcessedIndex = -1;
    }
  }

  private processStepAt(index: number): void {
    if (index < 0 || index >= this.steps.length) return;

    const step = this.steps[index];
    step.triggerPulse();

    const nextIndex = index + 1;
    if (nextIndex < this.steps.length) {
      const nextStep = this.steps[nextIndex];
      const distance = step.distanceTo(nextStep);
      const isClose = distance < 30;
      const isDifferentColor = step.color !== nextStep.color;

      if (isClose && isDifferentColor) {
        const particleCount = 15 + Math.floor(Math.random() * 6);
        this.particlePool.emitMixed(
          (step.x + nextStep.x) / 2,
          (step.y + nextStep.y) / 2,
          step.color,
          nextStep.color,
          particleCount
        );
      } else {
        const particleCount = 5 + Math.floor(Math.random() * 6);
        this.particlePool.emit(step.x, step.y, step.color, particleCount);
      }
    } else {
      const particleCount = 5 + Math.floor(Math.random() * 6);
      this.particlePool.emit(step.x, step.y, step.color, particleCount);
    }
  }

  private triggerBeatEffect(): void {
  }

  private drawSelectionBox(): void {
    if (this.isLongPress && this.selectionStart && this.selectionEnd) {
      this.p.noFill();
      this.p.stroke(255, 255, 255, 150);
      this.p.strokeWeight(1);
      this.p.drawingContext.setLineDash([5, 5]);

      const x = Math.min(this.selectionStart.x, this.selectionEnd.x);
      const y = Math.min(this.selectionStart.y, this.selectionEnd.y);
      const w = Math.abs(this.selectionEnd.x - this.selectionStart.x);
      const h = Math.abs(this.selectionEnd.y - this.selectionStart.y);

      this.p.rect(x, y, w, h);
      this.p.drawingContext.setLineDash([]);
    }
  }

  private isTouchDevice(): boolean {
    return 'ontouchstart' in window;
  }

  private drawControlPanel(): void {
    const isTouch = this.isTouchDevice();
    const panelWidth = isTouch ? this.p.width * 0.8 : 180;
    const panelHeight = isTouch ? 130 : 120;
    const panelX = this.p.width - panelWidth - 20;
    const panelY = 20;

    this.p.noStroke();
    this.p.fill(26, 26, 58, 230);
    this.p.rect(panelX, panelY, panelWidth, panelHeight, 8);

    this.p.fill(255, 255, 255, 255);
    this.p.textFont('Courier New');
    this.p.textSize(14);
    this.p.textAlign(this.p.LEFT, this.p.TOP);
    this.p.text('BPM: ' + this.bpmManager.bpm, panelX + 15, panelY + 15);

    this.updateControlPanelPositions();
    this.drawBpmSlider();
    this.drawPlayButton();
    this.drawPalettePreview(panelX, panelY, panelWidth);
  }

  private drawBpmSlider(): void {
    const cp = this.controlPanel;
    const sliderX = cp.bpmSliderX;
    const sliderY = cp.bpmSliderY;
    const sliderW = cp.bpmSliderWidth;
    const sliderH = cp.bpmSliderHeight;

    this.p.noStroke();
    this.p.fill(60, 60, 100, 255);
    this.p.rect(sliderX, sliderY, sliderW, sliderH, 3);

    const bpmMin = 40;
    const bpmMax = 180;
    const ratio = (this.bpmManager.bpm - bpmMin) / (bpmMax - bpmMin);
    const fillWidth = sliderW * ratio;

    const rgb = hexToRgb('#88aaff');
    this.p.fill(rgb.r, rgb.g, rgb.b, 255);
    this.p.rect(sliderX, sliderY, fillWidth, sliderH, 3);

    const handleX = sliderX + fillWidth;
    this.p.fill(200, 200, 255, 255);
    this.p.ellipse(handleX, sliderY + sliderH / 2, 14, 14);

    this.p.fill(255, 255, 255, 255);
    this.p.textSize(11);
    this.p.textAlign(this.p.LEFT, this.p.TOP);
    this.p.text('40', sliderX, sliderY + sliderH + 5);
    this.p.textAlign(this.p.RIGHT, this.p.TOP);
    this.p.text('180', sliderX + sliderW, sliderY + sliderH + 5);
  }

  private drawPlayButton(): void {
    const cp = this.controlPanel;
    const btnX = cp.playBtnX;
    const btnY = cp.playBtnY;
    const radius = cp.playBtnRadius * cp.playBtnScale;

    const hoverScale = cp.isHoveringPlay ? 1.1 : 1;
    const displayRadius = radius * hoverScale;

    const rgb = hexToRgb('#ff88aa');
    this.p.drawingContext.save();
    this.p.drawingContext.shadowColor = '#ff88aa';
    this.p.drawingContext.shadowBlur = 8;

    this.p.noStroke();
    this.p.fill(rgb.r, rgb.g, rgb.b, 255);
    this.p.ellipse(btnX, btnY, displayRadius * 2, displayRadius * 2);

    this.p.drawingContext.restore();

    this.p.fill(255, 255, 255, 255);
    this.p.textSize(14);
    this.p.textAlign(this.p.CENTER, this.p.CENTER);
    const icon = this.bpmManager.getPlaying() ? '⏸' : '▶';
    this.p.text(icon, btnX, btnY + 1);
  }

  private drawPalettePreview(panelX: number, panelY: number, panelWidth: number): void {
    const usedColors = new Set<string>();
    for (const step of this.steps) {
      usedColors.add(step.color);
    }

    const startX = panelX + 15;
    const y = panelY + (this.isTouchDevice() ? 105 : 95);
    const dotSize = 10;
    const spacing = 4;

    let x = startX;
    const maxX = panelX + panelWidth - 15;

    for (const color of COLOR_PALETTE) {
      if (x + dotSize > maxX) break;

      const rgb = hexToRgb(color);
      const isUsed = usedColors.has(color);

      this.p.noStroke();
      if (isUsed) {
        this.p.drawingContext.save();
        this.p.drawingContext.shadowColor = color;
        this.p.drawingContext.shadowBlur = 6;
      }

      this.p.fill(rgb.r, rgb.g, rgb.b, isUsed ? 255 : 80);
      this.p.ellipse(x + dotSize / 2, y, dotSize, dotSize);

      if (isUsed) {
        this.p.drawingContext.restore();
      }

      x += dotSize + spacing;
    }
  }

  private drawInfoText(): void {
    this.p.fill(255, 255, 255, 255);
    this.p.textFont('Courier New');
    this.p.textSize(16);
    this.p.textAlign(this.p.LEFT, this.p.TOP);
    this.p.text('Steps: ' + this.steps.length + ' / ' + MAX_STEPS, 20, 20);
    this.p.text('BPM: ' + this.bpmManager.bpm, 20, 45);
  }

  mousePressed(): void {
    if (this.isOverPlayButton(this.p.mouseX, this.p.mouseY)) {
      this.controlPanel.playBtnScale = 0.9;
      return;
    }

    if (this.isOverBpmSlider(this.p.mouseX, this.p.mouseY)) {
      this.controlPanel.isDraggingSlider = true;
      this.updateBpmFromMouse(this.p.mouseX);
      return;
    }

    const clickedStep = this.findStepAt(this.p.mouseX, this.p.mouseY);

    this.isDragging = true;
    this.dragStartTime = performance.now();
    this.isLongPress = false;
    this.selectionStart = { x: this.p.mouseX, y: this.p.mouseY };
    this.selectionEnd = { x: this.p.mouseX, y: this.p.mouseY };
    this.lastDraggedStepPos = { x: this.p.mouseX, y: this.p.mouseY };

    if (clickedStep) {
      this.isDrawingMode = false;
    } else {
      this.historyManager.saveState(this.steps);
      this.addStep(this.p.mouseX, this.p.mouseY);
      this.isDrawingMode = true;
    }
  }

  mouseDragged(): void {
    if (this.controlPanel.isDraggingSlider) {
      this.updateBpmFromMouse(this.p.mouseX);
      return;
    }

    if (!this.isDragging) return;

    const elapsed = performance.now() - this.dragStartTime;

    if (elapsed > this.longPressThreshold && !this.isDrawingMode) {
      this.isLongPress = true;
      this.selectionEnd = { x: this.p.mouseX, y: this.p.mouseY };
      this.updateSelectionFromBox();
      return;
    }

    if (this.isDrawingMode && this.lastDraggedStepPos) {
      const dx = this.p.mouseX - this.lastDraggedStepPos.x;
      const dy = this.p.mouseY - this.lastDraggedStepPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist >= this.minDragDistance) {
        this.addStep(this.p.mouseX, this.p.mouseY);
        this.lastDraggedStepPos = { x: this.p.mouseX, y: this.p.mouseY };
      }
    }
  }

  mouseReleased(): void {
    if (this.controlPanel.playBtnScale !== 1) {
      if (this.isOverPlayButton(this.p.mouseX, this.p.mouseY)) {
        this.bpmManager.toggle();
        if (!this.bpmManager.getPlaying()) {
          this.lastProcessedIndex = -1;
        }
      }
      this.controlPanel.playBtnScale = 1;
      return;
    }

    if (this.controlPanel.isDraggingSlider) {
      this.controlPanel.isDraggingSlider = false;
      return;
    }

    if (!this.isDragging) return;

    if (this.isLongPress) {
      this.isLongPress = false;
    } else {
      const clickedStep = this.findStepAt(this.p.mouseX, this.p.mouseY);
      if (clickedStep && !this.isDrawingMode) {
        this.historyManager.saveState(this.steps);
        this.removeStep(clickedStep);
      }
    }

    this.clearSelection();
    this.isDragging = false;
    this.isDrawingMode = false;
    this.selectionStart = null;
    this.selectionEnd = null;
    this.lastDraggedStepPos = null;
  }

  mouseMoved(): void {
    this.controlPanel.isHoveringPlay = this.isOverPlayButton(this.p.mouseX, this.p.mouseY);
    this.controlPanel.isHoveringSlider = this.isOverBpmSlider(this.p.mouseX, this.p.mouseY);
  }

  keyPressed(): void {
    if ((this.p.keyIsDown(this.p.CONTROL) || this.p.keyIsDown(17)) && this.p.key === 'z') {
      this.undo();
    }

    if (this.p.key === 'Delete' || this.p.key === 'Backspace') {
      this.deleteSelected();
    }

    if (this.p.key === ' ') {
      this.bpmManager.toggle();
      if (!this.bpmManager.getPlaying()) {
        this.lastProcessedIndex = -1;
      }
      return false;
    }
  }

  private addStep(x: number, y: number): void {
    if (this.steps.length >= MAX_STEPS) return;
    const step = new Step(x, y);
    this.steps.push(step);
  }

  private removeStep(step: Step): void {
    const index = this.steps.indexOf(step);
    if (index !== -1) {
      this.steps.splice(index, 1);
    }
  }

  private deleteSelected(): void {
    const selectedSteps = this.steps.filter((s) => s.selected);
    if (selectedSteps.length > 0) {
      this.historyManager.saveState(this.steps);
      this.steps = this.steps.filter((s) => !s.selected);
    }
  }

  private clearSelection(): void {
    for (const step of this.steps) {
      step.selected = false;
    }
  }

  private undo(): void {
    const previousState = this.historyManager.undo();
    if (previousState) {
      this.steps = previousState;
      this.clearSelection();
    }
  }

  private findStepAt(x: number, y: number): Step | null {
    for (let i = this.steps.length - 1; i >= 0; i--) {
      if (this.steps[i].contains(x, y)) {
        return this.steps[i];
      }
    }
    return null;
  }

  private updateSelectionFromBox(): void {
    if (!this.selectionStart || !this.selectionEnd) return;

    const minX = Math.min(this.selectionStart.x, this.selectionEnd.x);
    const maxX = Math.max(this.selectionStart.x, this.selectionEnd.x);
    const minY = Math.min(this.selectionStart.y, this.selectionEnd.y);
    const maxY = Math.max(this.selectionStart.y, this.selectionEnd.y);

    for (const step of this.steps) {
      step.selected =
        step.x >= minX && step.x <= maxX && step.y >= minY && step.y <= maxY;
    }
  }

  private updateBpmFromMouse(mouseX: number): void {
    const cp = this.controlPanel;
    const ratio = (mouseX - cp.bpmSliderX) / cp.bpmSliderWidth;
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    this.bpmManager.bpm = Math.round(40 + clampedRatio * 140);
  }

  private isOverPlayButton(x: number, y: number): boolean {
    const cp = this.controlPanel;
    const dx = x - cp.playBtnX;
    const dy = y - cp.playBtnY;
    return Math.sqrt(dx * dx + dy * dy) <= cp.playBtnRadius + 5;
  }

  private isOverBpmSlider(x: number, y: number): boolean {
    const cp = this.controlPanel;
    return (
      x >= cp.bpmSliderX - 10 &&
      x <= cp.bpmSliderX + cp.bpmSliderWidth + 10 &&
      y >= cp.bpmSliderY - 10 &&
      y <= cp.bpmSliderY + cp.bpmSliderHeight + 10
    );
  }

  getSteps(): Step[] {
    return this.steps;
  }

  getBpmManager(): BPMManager {
    return this.bpmManager;
  }
}

export function createSketch(containerId: string): StarTrailSketch {
  let sketchInstance: StarTrailSketch;

  const sketch = (p: p5) => {
    sketchInstance = new StarTrailSketch(p);

    p.setup = () => {
      sketchInstance.setup();
    };

    p.draw = () => {
      sketchInstance.draw();
    };

    p.windowResized = () => {
      sketchInstance.windowResized();
    };

    p.mousePressed = () => {
      sketchInstance.mousePressed();
    };

    p.mouseDragged = () => {
      sketchInstance.mouseDragged();
    };

    p.mouseReleased = () => {
      sketchInstance.mouseReleased();
    };

    p.mouseMoved = () => {
      sketchInstance.mouseMoved();
    };

    p.keyPressed = () => {
      sketchInstance.keyPressed();
    };
  };

  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container with id ${containerId} not found`);
  }

  new p5(sketch, container);
  return sketchInstance!;
}
