import p5 from 'p5';
import { Game, CANVAS_WIDTH, CANVAS_HEIGHT } from './game';

let game: Game;

const sketch = (p: p5) => {
  p.setup = () => {
    const canvas = p.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    canvas.parent('app');
    p.frameRate(60);
    game = new Game(p);
    const canvasEl = canvas.elt as HTMLCanvasElement;
    canvasEl.addEventListener('mouseleave', () => {
      game.handleMouseLeave();
    });
  };

  p.draw = () => {
    const deltaTime = Math.min(p.deltaTime, 50);
    game.update(deltaTime);
    game.draw();
  };

  p.mousePressed = () => {
    game.handleMousePress(p.mouseX, p.mouseY);
  };

  p.mouseDragged = () => {
    game.handleMouseDrag(p.mouseX, p.mouseY);
  };

  p.mouseMoved = () => {
    game.handleMouseMove(p.mouseX, p.mouseY);
  };

  p.mouseReleased = () => {
    game.handleMouseRelease(p.mouseX, p.mouseY);
  };
};

new p5(sketch);
