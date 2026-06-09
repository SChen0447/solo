import p5 from 'p5';
import { Waterfall } from './Waterfall';

interface TouchPoint {
  x: number;
  y: number;
}

let waterfall: Waterfall;
let isDragging = false;
let lastX = 0;
let lastY = 0;

function getTouchX(p: p5, index: number): number {
  const touches = p.touches as TouchPoint[];
  return touches[index]?.x ?? p.mouseX;
}

function getTouchY(p: p5, index: number): number {
  const touches = p.touches as TouchPoint[];
  return touches[index]?.y ?? p.mouseY;
}

const sketch = (p: p5): void => {
  p.setup = () => {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.parent('canvas-container');
    p.frameRate(60);
    waterfall = new Waterfall(p.width, p.height);
    setupUI();
  };

  p.draw = () => {
    p.background(0, 0, 0);
    waterfall.update();
    waterfall.draw(p);
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    waterfall.resize(p.width, p.height);
  };

  p.mousePressed = () => {
    if (p.mouseY > 0 && p.mouseY < p.height - 100) {
      isDragging = true;
      lastX = p.mouseX;
      lastY = p.mouseY;
    }
  };

  p.mouseDragged = () => {
    if (!isDragging) return;
    const dx = p.mouseX - lastX;
    const dy = p.mouseY - lastY;
    const speed = Math.sqrt(dx * dx + dy * dy);
    if (speed > 0.5) {
      waterfall.applyDisturbance(p.mouseX, p.mouseY, dx, dy, speed);
    }
    lastX = p.mouseX;
    lastY = p.mouseY;
  };

  p.mouseReleased = () => {
    isDragging = false;
  };

  p.touchStarted = () => {
    if (p.mouseY > 0 && p.mouseY < p.height - 100) {
      isDragging = true;
      lastX = getTouchX(p, 0);
      lastY = getTouchY(p, 0);
    }
  };

  p.touchMoved = () => {
    if (!isDragging) return;
    const currentX = getTouchX(p, 0);
    const currentY = getTouchY(p, 0);
    const dx = currentX - lastX;
    const dy = currentY - lastY;
    const speed = Math.sqrt(dx * dx + dy * dy);
    if (speed > 0.5) {
      waterfall.applyDisturbance(currentX, currentY, dx, dy, speed);
    }
    lastX = currentX;
    lastY = currentY;
  };

  p.touchEnded = () => {
    isDragging = false;
  };
};

function setupUI(): void {
  const injectBtn = document.getElementById('inject-btn');
  const resetBtn = document.getElementById('reset-btn');
  const input = document.getElementById('keyword-input') as HTMLInputElement;

  injectBtn?.addEventListener('click', () => {
    const keyword = input.value.trim();
    if (keyword.length >= 1 && keyword.length <= 10) {
      waterfall.injectKeyword(keyword);
      input.value = '';
      input.blur();
    }
  });

  resetBtn?.addEventListener('click', () => {
    waterfall.reset();
    input.value = '';
  });

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      injectBtn?.click();
    }
  });
}

new p5(sketch);
