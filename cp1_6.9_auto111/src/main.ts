import p5 from 'p5';
import { TotemManager } from './TotemManager';
import { Renderer } from './Renderer';

let totemManager: TotemManager;
let renderer: Renderer;
let isMouseDown = false;

const sketch = (p: p5) => {
  p.setup = () => {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.elt.addEventListener('contextmenu', (e: MouseEvent) => e.preventDefault());
    p.pixelDensity(1);
    totemManager = new TotemManager(p.windowWidth, p.windowHeight);
    renderer = new Renderer(p, p.windowWidth, p.windowHeight);
  };

  p.draw = () => {
    const time = p.millis() / 1000;
    const state = totemManager.update(time);
    renderer.render(state, time);
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    totemManager.resize(p.windowWidth, p.windowHeight);
    renderer.resize(p.windowWidth, p.windowHeight);
  };

  p.mouseMoved = () => {
    totemManager.setMousePos(p.mouseX, p.mouseY);
  };

  p.mousePressed = () => {
    if (p.mouseButton === p.LEFT) {
      isMouseDown = true;
      totemManager.handleLeftClick(p.mouseX, p.mouseY);
    } else if (p.mouseButton === p.RIGHT) {
      totemManager.handleRightClick(p.mouseX, p.mouseY);
    }
  };

  p.mouseDragged = () => {
    totemManager.setMousePos(p.mouseX, p.mouseY);
    if (isMouseDown && p.mouseButton === p.LEFT) {
      totemManager.handleLeftDrag(p.mouseX, p.mouseY);
    }
  };

  p.mouseReleased = () => {
    if (p.mouseButton === p.LEFT) {
      isMouseDown = false;
      totemManager.handleLeftRelease();
    }
  };
};

new p5(sketch);
