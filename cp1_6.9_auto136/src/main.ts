import p5 from 'p5';
import { GameManager } from './GameManager';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const sketch = (p: p5): void => {
  let gameManager: GameManager;

  p.setup = (): void => {
    const canvas = p.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    canvas.parent('app');
    p.frameRate(60);
    p.pixelDensity(1);

    gameManager = new GameManager(p);
    gameManager.init(CANVAS_WIDTH, CANVAS_HEIGHT);
  };

  p.draw = (): void => {
    p.clear();
    gameManager.update();
    gameManager.render();
  };

  p.mousePressed = (): void => {
    gameManager.handleMousePressed(p.mouseX, p.mouseY);
  };

  p.mouseMoved = (): void => {
    gameManager.handleMouseMoved(p.mouseX, p.mouseY);
  };

  p.windowResized = (): void => {
    // Canvas stays fixed size; no resize needed
  };
};

new p5(sketch);
