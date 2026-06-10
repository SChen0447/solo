import p5 from 'p5';
import { StrokeManager, PALETTE } from './stroke';
import { Renderer } from './renderer';
import { Exporter } from './exporter';
import { UI } from './ui';

const TOOLBAR_HEIGHT = 60;

const sketch = (p: p5) => {
  const manager = new StrokeManager();
  let renderer: Renderer;
  let exporter: Exporter;
  let ui: UI;
  let canvas: p5.Renderer;
  let isDrawing = false;
  let dragInfo: { strokeIdx: number; pointIdx: number } | null = null;

  p.setup = () => {
    const w = window.innerWidth;
    const h = window.innerHeight - TOOLBAR_HEIGHT;
    canvas = p.createCanvas(w, h);
    canvas.id('p5-canvas');
    canvas.parent('app');

    renderer = new Renderer(p, manager);
    exporter = new Exporter(p, renderer, manager);
    ui = new UI(manager, exporter);

    manager.onChange(() => {
      ui.update();
    });
    ui.update();
  };

  p.draw = () => {
    renderer.render();
  };

  p.windowResized = () => {
    const w = window.innerWidth;
    const h = window.innerHeight - TOOLBAR_HEIGHT;
    p.resizeCanvas(w, h);
  };

  p.mousePressed = () => {
    if (p.mouseY < 0 || p.mouseY > p.height || p.mouseX < 0 || p.mouseX > p.width) return;
    if (p.mouseButton !== p.LEFT) return;

    const hitPoint = manager.hitTestPoint(p.mouseX, p.mouseY);
    if (hitPoint) {
      dragInfo = hitPoint;
      return;
    }

    const hitStroke = manager.hitTestStroke(p.mouseX, p.mouseY);
    if (hitStroke >= 0) {
      manager.selectStroke(hitStroke);
      return;
    }

    manager.deselectAll();
    manager.startStroke(p.mouseX, p.mouseY);
    isDrawing = true;
    renderer.setDrawing(true);
  };

  p.mouseDragged = () => {
    if (dragInfo) {
      manager.movePoint(dragInfo.strokeIdx, dragInfo.pointIdx, p.mouseX, p.mouseY);
      return;
    }
    if (isDrawing) {
      manager.addPoint(p.mouseX, p.mouseY);
    }
  };

  p.mouseReleased = () => {
    if (dragInfo) {
      dragInfo = null;
      return;
    }
    if (isDrawing) {
      const finished = manager.endStroke();
      if (finished && finished.points.length > 0) {
        const lastPoint = finished.points[finished.points.length - 1];
        renderer.addPulse(lastPoint.x, lastPoint.y, finished.color);
      }
      isDrawing = false;
      renderer.setDrawing(false);
    }
  };

  p.mouseWheel = (event: WheelEvent) => {
    if (p.mouseY < 0 || p.mouseY > p.height) return;
    const delta = event.deltaY < 0 ? 1 : -1;
    manager.adjustWidth(delta * 2);
    manager.adjustBlur(delta);
    return false;
  };

  p.keyPressed = () => {
    const num = parseInt(p.key, 10);
    if (!isNaN(num) && num >= 1 && num <= 7) {
      manager.setColor(num - 1);
    }
    if ((p.key === 'z' || p.key === 'Z') && (p.keyIsDown(p.CONTROL) || p.keyIsDown(17))) {
      manager.undo();
      return false;
    }
    if ((p.key === 'y' || p.key === 'Y') && (p.keyIsDown(p.CONTROL) || p.keyIsDown(17))) {
      manager.redo();
      return false;
    }
  };
};

new p5(sketch);
