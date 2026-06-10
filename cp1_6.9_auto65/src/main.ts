import p5 from 'p5';
import { ForestManager } from './forest';
import { FireflyManager } from './firefly';

let forestManager: ForestManager;
let fireflyManager: FireflyManager;
let startTime: number = 0;
let lastFrameTime: number = 0;
let rightMousePressed = false;

const sketch = (p: p5) => {
  p.setup = () => {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.parent('canvas-container');
    p.frameRate(60);
    p.noCursor();

    startTime = p.millis() / 1000;
    lastFrameTime = startTime;

    forestManager = new ForestManager(p);
    fireflyManager = new FireflyManager(p, 500);

    document.addEventListener('contextmenu', (e: Event) => {
      e.preventDefault();
    });
  };

  p.draw = () => {
    const currentTime = p.millis() / 1000;
    const time = currentTime - startTime;
    const dt = Math.min(0.05, currentTime - lastFrameTime);
    lastFrameTime = currentTime;

    forestManager.drawForest(p, time);

    const mousePressed = p.mouseIsPressed;
    fireflyManager.update(dt, time, p.mouseX, p.mouseY, mousePressed, rightMousePressed);
    fireflyManager.draw();

    drawMouseGlow(p, time, mousePressed, rightMousePressed);
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    forestManager = new ForestManager(p);
  };

  p.mousePressed = () => {
    if (p.mouseButton === p.RIGHT) {
      rightMousePressed = true;
    } else if (p.mouseButton === p.LEFT) {
      rightMousePressed = false;
      const result = forestManager.handleClick(p.mouseX, p.mouseY);
      if (result.hit) {
        const orbitRadius = Math.min(p.width, p.height) * 0.06;
        fireflyManager.attractToPoint(result.treeX, result.treeY, 80, orbitRadius);
      }
    }
  };

  p.mouseReleased = () => {
    if (p.mouseButton === p.RIGHT) {
      rightMousePressed = false;
    }
  };
};

function drawMouseGlow(p: p5, time: number, mousePressed: boolean, isRight: boolean) {
  const baseRadius = 30;
  let radius = baseRadius;
  let alpha = 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(time * 3));

  if (mousePressed) {
    if (!isRight) {
      radius = baseRadius * 1.5;
      alpha = 0.35;
    } else {
      radius = baseRadius * 2;
      alpha = 0.45;
    }
  }

  p.noStroke();
  for (let i = 4; i >= 1; i--) {
    const r = radius * (i * 0.5 + 0.5);
    let colR: number, colG: number, colB: number;

    if (mousePressed && !isRight) {
      colR = 255;
      colG = 221;
      colB = 68;
    } else if (mousePressed && isRight) {
      colR = 102;
      colG = 204;
      colB = 255;
    } else {
      colR = 200;
      colG = 230;
      colB = 200;
    }

    p.fill(colR, colG, colB, (alpha / i) * 100);
    p.ellipse(p.mouseX, p.mouseY, r, r);
  }

  if (mousePressed && !isRight) {
    p.stroke(255, 221, 68, 150);
    p.strokeWeight(1);
    p.noFill();
    p.ellipse(p.mouseX, p.mouseY, radius * 3, radius * 3);
  } else if (mousePressed && isRight) {
    p.stroke(102, 204, 255, 150);
    p.strokeWeight(1);
    p.noFill();
    p.ellipse(p.mouseX, p.mouseY, radius * 4, radius * 4);
  }
}

new p5(sketch);
