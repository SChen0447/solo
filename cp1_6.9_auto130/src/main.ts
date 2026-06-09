import p5 from 'p5';
import { InteractionManager, MAX_GEOMETRIES } from './interaction';
import { Geometry, SHAPE_NAMES } from './geometry';

const sketch = (p: p5) => {
  const interactionManager = new InteractionManager();
  let countSpan: HTMLElement | null = null;
  let infoPanel: HTMLElement | null = null;
  let infoShape: HTMLElement | null = null;
  let infoColor: HTMLElement | null = null;
  let infoSize: HTMLElement | null = null;
  let infoAlpha: HTMLElement | null = null;

  interactionManager.setSelectionCallback((geo: Geometry | null) => {
    if (!infoPanel || !infoShape || !infoColor || !infoSize || !infoAlpha) return;

    if (geo) {
      infoPanel.style.display = 'block';
      infoShape.textContent = SHAPE_NAMES[geo.shape];
      infoColor.textContent = geo.color.toUpperCase();
      infoSize.textContent = `${Math.round(geo.size)}px`;
      infoAlpha.textContent = (geo.alpha * 100).toFixed(0) + '%';
    } else {
      infoPanel.style.display = 'none';
    }
  });

  p.setup = () => {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.parent('app');
    p.pixelDensity(1);

    countSpan = document.getElementById('geo-count');
    infoPanel = document.getElementById('info-panel');
    infoShape = document.getElementById('info-shape');
    infoColor = document.getElementById('info-color');
    infoSize = document.getElementById('info-size');
    infoAlpha = document.getElementById('info-alpha');

    interactionManager.initialize(5, p.windowWidth, p.windowHeight);
    updateCountDisplay();
  };

  p.draw = () => {
    const gradient = p.drawingContext.createLinearGradient(0, 0, p.windowWidth, p.windowHeight);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(1, '#1a0a2a');
    p.drawingContext.fillStyle = gradient;
    p.rect(0, 0, p.windowWidth, p.windowHeight);

    interactionManager.updateAll();
    interactionManager.drawAll(p);

    updateCountDisplay();
  };

  p.mousePressed = () => {
    if (p.mouseX >= 0 && p.mouseX <= p.windowWidth && p.mouseY >= 0 && p.mouseY <= p.windowHeight) {
      interactionManager.handleMousePressed(p, p.keyIsDown(p.SHIFT));
      updateCountDisplay();
    }
  };

  p.mouseDragged = () => {
    interactionManager.handleMouseDragged(p);
  };

  p.mouseReleased = () => {
    interactionManager.handleMouseReleased(p);
  };

  p.mouseWheel = (event: WheelEvent) => {
    interactionManager.handleWheel(event.deltaY);
    return false;
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };

  function updateCountDisplay(): void {
    if (countSpan) {
      countSpan.textContent = `${interactionManager.getCount()} / ${MAX_GEOMETRIES}`;
    }
  }
};

new p5(sketch);
