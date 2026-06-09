import p5 from 'p5';
import { TreeSystem } from './tree';

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  baseAlpha: number;
  twinklePhase: number;
  twinkleSpeed: number;
  driftX: number;
  driftY: number;
}

const STAR_COUNT = 300;
const MAX_PARTICLES = 400;

const sketch = (p: p5) => {
  let treeSystem: TreeSystem;
  let stars: Star[] = [];
  let bgGrad: p5.Image | null = null;
  let centerGlow: p5.Graphics | null = null;
  let isDragging: boolean = false;

  p.setup = () => {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.parent('app');
    p.pixelDensity(1);

    treeSystem = new TreeSystem(p);
    treeSystem.createInitialTree(p.width / 2, p.height / 2 + 50);

    initStars();
    createBackgroundGradient();
    createCenterGlow();
  };

  const initStars = () => {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: p.random(p.width),
        y: p.random(p.height),
        size: p.random(1, 3),
        alpha: p.random(0.3, 0.8),
        baseAlpha: p.random(0.3, 0.8),
        twinklePhase: p.random(p.TWO_PI),
        twinkleSpeed: p.random(0.02, 0.06),
        driftX: p.random(-0.1, 0.1),
        driftY: p.random(-0.1, 0.1)
      });
    }
  };

  const createBackgroundGradient = () => {
    bgGrad = p.createImage(p.width, p.height);
    bgGrad.loadPixels();

    const centerX = p.width / 2;
    const centerY = p.height / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

    for (let y = 0; y < p.height; y++) {
      for (let x = 0; x < p.width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;

        const r1 = 10, g1 = 5, b1 = 32;
        const r2 = 6, g2 = 12, b2 = 32;

        const t = Math.min(dist * 1.5, 1);
        const r = p.lerp(r1, r2, t);
        const g = p.lerp(g1, g2, t);
        const b = p.lerp(b1, b2, t);

        const idx = (y * p.width + x) * 4;
        bgGrad.pixels[idx] = r;
        bgGrad.pixels[idx + 1] = g;
        bgGrad.pixels[idx + 2] = b;
        bgGrad.pixels[idx + 3] = 255;
      }
    }
    bgGrad.updatePixels();
  };

  const createCenterGlow = () => {
    if (centerGlow) centerGlow.remove();
    centerGlow = p.createGraphics(p.width, p.height);
    const cx = p.width / 2;
    const cy = p.height / 2;
    const maxR = Math.min(p.width, p.height) * 0.4;

    for (let r = maxR; r > 0; r -= 2) {
      const t = r / maxR;
      const alpha = p.map(t, 0, 1, 5, 0) * 0.5;
      centerGlow.noStroke();
      centerGlow.fill(51, 85, 170, alpha);
      centerGlow.ellipse(cx, cy, r * 2, r * 2);
    }
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    createBackgroundGradient();
    createCenterGlow();
    initStars();
  };

  p.draw = () => {
    if (bgGrad) {
      p.image(bgGrad, 0, 0);
    }

    if (centerGlow) {
      p.image(centerGlow, 0, 0);
    }

    drawStars();

    treeSystem.update();
    treeSystem.draw();

    if (isDragging && treeSystem.getDraggedLeaf()) {
      treeSystem.updateDrag(p.mouseX, p.mouseY);
    }
  };

  const drawStars = () => {
    p.push();
    p.noStroke();
    for (const star of stars) {
      star.twinklePhase += star.twinkleSpeed;
      star.alpha = star.baseAlpha * (0.5 + 0.5 * Math.sin(star.twinklePhase));

      star.x += star.driftX;
      star.y += star.driftY;

      if (star.x < -10) star.x = p.width + 10;
      if (star.x > p.width + 10) star.x = -10;
      if (star.y < -10) star.y = p.height + 10;
      if (star.y > p.height + 10) star.y = -10;

      p.drawingContext.shadowBlur = 2;
      p.drawingContext.shadowColor = 'rgba(255, 255, 255, 0.3)';
      p.fill(255, 255, 255, star.alpha * 255);
      p.ellipse(star.x, star.y, star.size, star.size);
    }
    p.pop();
  };

  p.mousePressed = () => {
    if (treeSystem.tryClickSeed(p.mouseX, p.mouseY)) {
      return;
    }

    if (treeSystem.tryStartDrag(p.mouseX, p.mouseY)) {
      isDragging = true;
      return;
    }
  };

  p.mouseDragged = () => {
    if (isDragging) {
      treeSystem.updateDrag(p.mouseX, p.mouseY);
    }
  };

  p.mouseReleased = () => {
    if (isDragging) {
      treeSystem.endDrag();
      isDragging = false;
    }
  };

  p.doubleClicked = () => {
    treeSystem.addTreeAt(p.mouseX, p.mouseY, 30);
  };
};

new p5(sketch);
