import p5 from 'p5';
import { GlazeSystem } from './glaze';
import { KilnSystem } from './kiln';

let kiln: KilnSystem;
let glaze: GlazeSystem;
let lastTime = 0;

const sketch = (p: p5): void => {
  p.setup = (): void => {
    const container = document.getElementById('game-container');
    const w = container ? container.clientWidth : window.innerWidth;
    const h = container ? container.clientHeight : window.innerHeight;
    p.createCanvas(w, h);
    p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
    p.textFont('Georgia, SimSun, serif');
    p.noCursor();

    glaze = new GlazeSystem(p);
    kiln = new KilnSystem(p, glaze);

    lastTime = p.millis();
  };

  p.draw = (): void => {
    const now = p.millis();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    p.clear();

    kiln.update(dt);
    glaze.update(dt);

    kiln.render();
    glaze.renderParticles();

    drawCursor(p);
  };

  p.windowResized = (): void => {
    const container = document.getElementById('game-container');
    const w = container ? container.clientWidth : window.innerWidth;
    const h = container ? container.clientHeight : window.innerHeight;
    p.resizeCanvas(w, h);
    kiln.setupLayout();
  };

  p.mousePressed = (): void => {
    kiln.onMousePressed(p.mouseX, p.mouseY);
  };

  p.mouseDragged = (): void => {
    kiln.onMouseDragged(p.mouseX, p.mouseY);
  };

  p.mouseReleased = (): void => {
    kiln.onMouseReleased(p.mouseX, p.mouseY);
  };

  p.mouseMoved = (): void => {
    kiln.onMouseMoved(p.mouseX, p.mouseY);
  };
};

function drawCursor(p: p5): void {
  const mx = p.mouseX;
  const my = p.mouseY;

  p.noFill();
  p.stroke(255, 200, 120, 200);
  p.strokeWeight(1.5);
  p.ellipse(mx, my, 14, 14);

  p.stroke(255, 220, 160, 220);
  p.strokeWeight(1);
  p.line(mx - 8, my, mx - 3, my);
  p.line(mx + 3, my, mx + 8, my);
  p.line(mx, my - 8, mx, my - 3);
  p.line(mx, my + 3, mx, my + 8);

  p.noStroke();
  p.fill(255, 230, 180, 255);
  p.ellipse(mx, my, 2, 2);
}

new p5(sketch, document.getElementById('game-container') || undefined);
