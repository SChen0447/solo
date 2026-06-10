import p5 from 'p5';
import { WindowPanel } from './windowPanel';
import { LightSimulator } from './lightSimulator';
import type { GlassPiece } from './glassPiece';

class StainedGlassApp {
  private panel: WindowPanel;
  private lightSim: LightSimulator;
  private scale: number;
  private canvas: p5.Renderer | null;
  private windowBaseWidth: number;
  private windowBaseHeight: number;
  private controlPanelOffset: number;
  private hoverReset: boolean;
  private hoverSave: boolean;
  private mouseDownOnCanvas: boolean;

  constructor() {
    this.panel = new WindowPanel();
    this.lightSim = new LightSimulator();
    this.scale = 1;
    this.canvas = null;
    this.windowBaseWidth = 400;
    this.windowBaseHeight = 600;
    this.controlPanelOffset = 20;
    this.hoverReset = false;
    this.hoverSave = false;
    this.mouseDownOnCanvas = false;
  }

  setup = (p: p5): void => {
    this.canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    this.canvas.parent('app');
    p.colorMode(p.HSL, 360, 100, 100, 255);
    p.angleMode(p.RADIANS);
    p.frameRate(60);

    this.updateLayout(p);
    this.panel.generateRandomPieces(30);
    this.lightSim.updateKnobFromAngles(
      p.windowWidth - this.controlPanelOffset - this.lightSim.controlRadius,
      p.windowHeight - this.controlPanelOffset - this.lightSim.controlRadius
    );

    this.setupEventListeners(p);
  };

  private setupEventListeners(p: p5): void {
    const resetBtn = document.getElementById('resetBtn');
    const saveBtn = document.getElementById('saveBtn');

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.panel.generateRandomPieces(30);
      });
      resetBtn.addEventListener('mouseenter', () => {
        this.hoverReset = true;
      });
      resetBtn.addEventListener('mouseleave', () => {
        this.hoverReset = false;
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.saveSnapshot(p);
      });
      saveBtn.addEventListener('mouseenter', () => {
        this.hoverSave = true;
      });
      saveBtn.addEventListener('mouseleave', () => {
        this.hoverSave = false;
      });
    }

    window.addEventListener('contextmenu', (e) => {
      if (e.target instanceof HTMLCanvasElement) {
        e.preventDefault();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.panel.selectedPiece) {
          this.panel.removePiece(this.panel.selectedPiece);
        }
      }
    });
  }

  private saveSnapshot(p: p5): void {
    const dataUrl = p.canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'stained-glass-' + Date.now() + '.png';
    link.href = dataUrl;
    link.click();
  }

  private updateLayout(p: p5): void {
    const toolbarHeight = 60;
    const availableWidth = p.windowWidth;
    const availableHeight = p.windowHeight - toolbarHeight;

    const targetRatio = 3 / 2;
    let winW = availableWidth * 0.55;
    let winH = winW * targetRatio;

    if (winH > availableHeight * 0.85) {
      winH = availableHeight * 0.85;
      winW = winH / targetRatio;
    }

    this.scale = winW / this.windowBaseWidth;

    const winX = (availableWidth - winW) * 0.35;
    const winY = toolbarHeight + (availableHeight - winH) / 2;

    this.panel.setWindowRect(winX, winY, winW, winH);
  }

  draw = (p: p5): void => {
    const { x: winX, y: winY, width: winW, height: winH } = this.panel.windowRect;
    const wallStartX = winX + winW + 8;
    const controlCenterX = p.windowWidth - this.controlPanelOffset - this.lightSim.controlRadius;
    const controlCenterY = p.windowHeight - this.controlPanelOffset - this.lightSim.controlRadius;

    p.background(42, 0, 0, 255);
    p.colorMode(p.HSL, 360, 100, 100, 255);

    p.noStroke();
    p.fill(40, 10, 92, 255);
    p.rect(wallStartX, winY - 8, p.windowWidth - wallStartX, winH + 16, 4);

    const lightDir = this.lightSim.getLightDirection();

    p.push();
    p.blendMode(p.ADD);
    for (const piece of this.panel.pieces) {
      const projection = this.lightSim.calculateWallProjection(
        piece,
        wallStartX,
        winX + winW
      );
      const verts = projection.vertices;
      const c = projection.color;
      p.noStroke();
      p.fill(c.h, c.s, c.l, c.a * 255);
      p.beginShape();
      for (const v of verts) {
        p.vertex(v.x, v.y);
      }
      p.endShape(p.CLOSE);
    }
    p.pop();

    p.blendMode(p.BLEND);

    this.panel.drawWindowFrame(p);
    this.panel.drawAllPieces(p, lightDir);
    this.lightSim.drawControlPanel(p, controlCenterX, controlCenterY);

    this.drawInfoText(p, controlCenterX, controlCenterY);
  };

  private drawInfoText(
    p: p5,
    controlCenterX: number,
    controlCenterY: number
  ): void {
    p.push();
    p.noStroke();
    p.fill(200, 0, 80, 200);
    p.textSize(12);
    p.textAlign(p.CENTER, p.TOP);
    const azimuth = Math.round(this.lightSim.azimuthAngle);
    const elevation = Math.round(this.lightSim.elevationAngle);
    p.text(
      `方位角: ${azimuth}°  高度角: ${elevation}°`,
      controlCenterX,
      controlCenterY + this.lightSim.controlRadius + 8
    );
    p.pop();
  }

  private getCanvasMouse(p: p5): { x: number; y: number } {
    return { x: p.mouseX, y: p.mouseY };
  }

  mousePressed = (p: p5): void => {
    if (p.mouseButton !== p.LEFT && p.mouseButton !== p.RIGHT) return;

    const { x: mx, y: my } = this.getCanvasMouse(p);
    const controlCenterX = p.windowWidth - this.controlPanelOffset - this.lightSim.controlRadius;
    const controlCenterY = p.windowHeight - this.controlPanelOffset - this.lightSim.controlRadius;

    if (p.mouseButton === p.LEFT) {
      if (this.lightSim.isKnobHit(mx, my, controlCenterX, controlCenterY)) {
        this.lightSim.draggingKnob = true;
        return;
      }

      if (this.lightSim.isInsideControlPanel(mx, my, controlCenterX, controlCenterY)) {
        this.lightSim.draggingKnob = true;
        this.lightSim.setFromKnobPosition(mx, my, controlCenterX, controlCenterY);
        return;
      }

      if (this.panel.isInsideWindow(mx, my)) {
        const piece = this.panel.getPieceAt(mx, my);
        if (piece) {
          this.panel.startDrag(piece, mx, my);
          this.mouseDownOnCanvas = true;
          return;
        } else {
          this.panel.selectPiece(null);
        }
      } else {
        this.panel.selectPiece(null);
      }

      this.mouseDownOnCanvas = true;
    }

    if (p.mouseButton === p.RIGHT) {
      if (this.panel.isInsideWindow(mx, my)) {
        const piece = this.panel.getPieceAt(mx, my);
        if (piece) {
          this.panel.selectPiece(piece);
          const newPiece = piece.clone(20, 20);
          this.panel.addPiece(newPiece);
          this.panel.selectPiece(newPiece);
        }
      }
    }
  };

  mouseDragged = (p: p5): void => {
    const { x: mx, y: my } = this.getCanvasMouse(p);
    const controlCenterX = p.windowWidth - this.controlPanelOffset - this.lightSim.controlRadius;
    const controlCenterY = p.windowHeight - this.controlPanelOffset - this.lightSim.controlRadius;

    if (this.lightSim.draggingKnob) {
      this.lightSim.setFromKnobPosition(mx, my, controlCenterX, controlCenterY);
    }

    if (this.panel.isDragging()) {
      this.panel.updateDrag(mx, my);
    }
  };

  mouseReleased = (): void => {
    this.lightSim.draggingKnob = false;
    this.panel.endDrag();
    this.mouseDownOnCanvas = false;
  };

  windowResized = (p: p5): void => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    this.updateLayout(p);
    this.lightSim.updateKnobFromAngles(
      p.windowWidth - this.controlPanelOffset - this.lightSim.controlRadius,
      p.windowHeight - this.controlPanelOffset - this.lightSim.controlRadius
    );
  };
}

const app = new StainedGlassApp();

const sketch = (p: p5): void => {
  p.setup = () => app.setup(p);
  p.draw = () => app.draw(p);
  p.mousePressed = () => app.mousePressed(p);
  p.mouseDragged = () => app.mouseDragged(p);
  p.mouseReleased = () => app.mouseReleased();
  p.windowResized = () => app.windowResized(p);
};

new p5(sketch);
