import p5 from 'p5';
import { FluidSystem } from './fluid';
import { Renderer } from './renderer';

let fluidSystem: FluidSystem;
let renderer: Renderer;
let isDragging = false;
let lastX = 0;
let lastY = 0;
let lastBlobTime = 0;
const BLOB_INTERVAL = 80;

const sketch = (p: p5) => {
  p.setup = () => {
    const container = document.getElementById('canvas-container');
    const w = container ? container.clientWidth : window.innerWidth;
    const h = container ? container.clientHeight : window.innerHeight;
    const canvas = p.createCanvas(w, h);
    canvas.parent('canvas-container');
    p.frameRate(60);
    fluidSystem = new FluidSystem(w, h);
    renderer = new Renderer(p);
  };

  p.windowResized = () => {
    const container = document.getElementById('canvas-container');
    const w = container ? container.clientWidth : window.innerWidth;
    const h = container ? container.clientHeight : window.innerHeight;
    p.resizeCanvas(w, h);
    fluidSystem.resize(w, h);
  };

  p.draw = () => {
    const now = performance.now();
    const dt = p.deltaTime;
    fluidSystem.update(dt, now);

    renderer.drawBackground(p.width, p.height);

    for (const particle of fluidSystem.particles) {
      renderer.drawParticle(particle);
    }

    const sortedBlobs = [...fluidSystem.blobs].sort((a, b) => b.radius - a.radius);
    for (const blob of sortedBlobs) {
      renderer.drawBlob(blob, now);
    }

    renderer.drawPanel(fluidSystem.getThemeIndex(), p.width);
  };

  const handlePress = (x: number, y: number) => {
    isDragging = true;
    lastX = x;
    lastY = y;
    lastBlobTime = performance.now() - BLOB_INTERVAL;
    fluidSystem.createBlob(x, y, 0, 0);
  };

  const handleDrag = (x: number, y: number) => {
    if (!isDragging) return;
    const now = performance.now();
    const dx = x - lastX;
    const dy = y - lastY;
    if (now - lastBlobTime > BLOB_INTERVAL && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
      fluidSystem.createBlob(x, y, dx, dy);
      lastBlobTime = now;
    }
    lastX = x;
    lastY = y;
  };

  const handleRelease = () => {
    isDragging = false;
  };

  p.mousePressed = () => {
    handlePress(p.mouseX, p.mouseY);
  };

  p.mouseDragged = () => {
    handleDrag(p.mouseX, p.mouseY);
  };

  p.mouseReleased = () => {
    handleRelease();
  };

  p.touchStarted = (event: TouchEvent) => {
    if (event.touches.length > 0) {
      const t = event.touches[0];
      handlePress(t.clientX, t.clientY);
    }
    return false;
  };

  p.touchMoved = (event: TouchEvent) => {
    if (event.touches.length > 0) {
      const t = event.touches[0];
      handleDrag(t.clientX, t.clientY);
    }
    return false;
  };

  p.touchEnded = () => {
    handleRelease();
    return false;
  };

  p.keyPressed = () => {
    if (p.key >= '1' && p.key <= '5') {
      const idx = parseInt(p.key) - 1;
      fluidSystem.setTheme(idx);
      renderer.triggerPanelBounce();
    }
  };
};

new p5(sketch);
