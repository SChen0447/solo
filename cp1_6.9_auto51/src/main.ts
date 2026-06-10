import p5 from 'p5';
import { Sketch } from './sketch';

let sketchInstance: Sketch | null = null;
let p5Instance: p5 | null = null;

const sketch = (p: p5) => {
  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.pixelDensity(1);
    p.frameRate(60);
    sketchInstance = new Sketch(p);
    sketchInstance.setup();
    sketchInstance.setScaleFactor(p.width, p.height);
  };

  p.draw = () => {
    if (sketchInstance) {
      sketchInstance.setScaleFactor(p.width, p.height);
      sketchInstance.update(p.deltaTime);
      sketchInstance.draw();
    }
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };

  p.keyPressed = () => {
    if (!sketchInstance) return;
    if (p.keyCode === 32 || p.key === ' ') {
      sketchInstance.generateWave();
    }
    if (p.key >= '1' && p.key <= '4') {
      sketchInstance.switchTheme(Number(p.key));
    }
  };

  p.mouseMoved = () => {
    if (sketchInstance) {
      sketchInstance.handleMouseMove(p.mouseX, p.mouseY, p.width / 2, p.height / 2);
    }
  };

  p.mousePressed = () => {
    if (sketchInstance) {
      sketchInstance.handleMouseClick();
    }
  };
};

const parentElement = document.getElementById('app');
if (parentElement) {
  p5Instance = new p5(sketch, parentElement);
}
