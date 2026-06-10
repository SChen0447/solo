import p5 from 'p5';
import { DropletManager } from './dropletManager';

const sketch = (p: p5) => {
  let dropletManager: DropletManager;

  p.setup = () => {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.parent('app');
    p.frameRate(60);
    dropletManager = new DropletManager();
    dropletManager.setup(p);
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    dropletManager.windowResized(p);
  };

  p.draw = () => {
    p.clear();
    dropletManager.update(p);
    dropletManager.draw(p);
  };

  p.mousePressed = () => {
    dropletManager.mousePressed(p);
  };

  p.mouseDragged = () => {
    dropletManager.mouseDragged(p);
  };

  p.mouseReleased = () => {
    dropletManager.mouseReleased();
  };

  p.mouseMoved = () => {
    dropletManager.mouseMoved(p);
  };
};

new p5(sketch);
