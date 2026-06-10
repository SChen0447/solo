import p5 from 'p5';
import { SketchManager } from './SketchManager';

let sketchManager: SketchManager;
let hintHidden = false;

const sketch = (p: p5) => {
  p.setup = () => {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.parent('canvas-container');
    p.frameRate(60);
    p.noStroke();

    sketchManager = new SketchManager(p, p.windowWidth, p.windowHeight);

    setTimeout(() => {
      if (!hintHidden) {
        const hint = document.getElementById('ui-hint');
        if (hint) {
          hint.classList.add('hidden');
        }
      }
    }, 5000);
  };

  p.draw = () => {
    sketchManager.update();
    sketchManager.draw();
  };

  p.mousePressed = () => {
    hideHint();
    sketchManager.handleMousePressed(p.mouseX, p.mouseY);
  };

  p.mouseMoved = () => {
    sketchManager.handleMouseMoved(p.mouseX, p.mouseY);
  };

  p.mouseDragged = () => {
    hideHint();
    sketchManager.handleMouseDragged(p.mouseX, p.mouseY);
  };

  p.mouseReleased = () => {
    sketchManager.handleMouseReleased(p.mouseX, p.mouseY);
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    sketchManager.resize(p.windowWidth, p.windowHeight);
  };
};

function hideHint(): void {
  if (hintHidden) return;
  hintHidden = true;
  const hint = document.getElementById('ui-hint');
  if (hint) {
    hint.classList.add('hidden');
  }
}

new p5(sketch);
