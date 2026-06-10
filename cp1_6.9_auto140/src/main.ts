import p5 from 'p5';
import { CanvasManager } from './canvasManager';

let canvasManager: CanvasManager;

const sketch = (p: p5) => {
  canvasManager = new CanvasManager(p);

  p.setup = () => {
    canvasManager.setup();
  };

  p.draw = () => {
    canvasManager.draw();
  };

  p.mousePressed = () => {
    canvasManager.mousePressed(p.mouseX, p.mouseY);
  };

  p.mouseDragged = () => {
    canvasManager.mouseDragged(p.mouseX, p.mouseY);
  };

  p.mouseReleased = () => {
    canvasManager.mouseReleased();
  };

  p.mouseMoved = () => {
    canvasManager.mouseMoved(p.mouseX, p.mouseY);
  };

  p.windowResized = () => {
    canvasManager.windowResized();
  };
};

new p5(sketch);
