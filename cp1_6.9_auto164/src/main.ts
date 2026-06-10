import p5 from 'p5';
import { ColorDot } from './colorDot';
import { ColorRibbon } from './colorRibbon';

interface Star {
  x: number;
  y: number;
  size: number;
  twinklePeriod: number;
  twinkleOffset: number;
}

const sketch = (p: p5): void => {
  let dots: ColorDot[] = [];
  let ribbons: ColorRibbon[] = [];
  let stars: Star[] = [];
  let activeRibbon: ColorRibbon | null = null;
  let prevMousePos: { x: number; y: number } | null = null;
  let prevMouseTime = 0;
  let dotIdCounter = 0;
  const MAX_DOTS = 80;
  const STAR_COUNT = 200;

  p.setup = () => {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.parent('app');
    p.colorMode(p.RGB);
    p.frameRate(60);

    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * p.width,
        y: Math.random() * p.height,
        size: 1 + Math.random(),
        twinklePeriod: 1000 + Math.random() * 2000,
        twinkleOffset: Math.random() * Math.PI * 2
      });
    }

    window.addEventListener('resize', () => {
      p.resizeCanvas(p.windowWidth, p.windowHeight);
      stars = [];
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
          x: Math.random() * p.width,
          y: Math.random() * p.height,
          size: 1 + Math.random(),
          twinklePeriod: 1000 + Math.random() * 2000,
          twinkleOffset: Math.random() * Math.PI * 2
        });
      }
    });
  };

  p.draw = () => {
    drawBackground();
    drawStars();
    drawBorder();

    for (let i = ribbons.length - 1; i >= 0; i--) {
      const ribbon = ribbons[i];
      for (const dot of dots) {
        const ripples = dot.getActiveRipples();
        if (ripples.length > 0) {
          ribbon.checkRippleInteraction(ripples, dot.x, dot.y);
        }
      }
      if (!ribbon.update()) {
        ribbons.splice(i, 1);
      } else {
        ribbon.draw();
      }
    }

    if (activeRibbon) {
      activeRibbon.draw();
    }

    for (let i = dots.length - 1; i >= 0; i--) {
      if (!dots[i].update()) {
        dots.splice(i, 1);
      } else {
        dots[i].draw();
      }
    }

    drawHUD();
    cleanupOldDots();
  };

  const drawBackground = () => {
    const gradient = p.drawingContext.createRadialGradient(
      p.width / 2, p.height / 2, 0,
      p.width / 2, p.height / 2, Math.max(p.width, p.height) * 0.7
    );
    gradient.addColorStop(0, '#13131e');
    gradient.addColorStop(1, '#0b0b14');
    p.drawingContext.fillStyle = gradient;
    p.rect(0, 0, p.width, p.height);
  };

  const drawStars = () => {
    p.noStroke();
    const now = p.millis();
    for (const star of stars) {
      const twinkle = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(now / star.twinklePeriod * Math.PI * 2 + star.twinkleOffset));
      p.fill(`rgba(170, 170, 204, ${twinkle})`);
      p.circle(star.x, star.y, star.size);
    }
  };

  const drawBorder = () => {
    p.noFill();
    p.strokeWeight(2);
    p.stroke('rgba(51, 85, 170, 0.2)');
    p.rect(1, 1, p.width - 2, p.height - 2);
  };

  const drawHUD = () => {
    p.textAlign(p.RIGHT, p.BOTTOM);
    p.textSize(14);
    p.noStroke();
    p.fill('rgba(200, 200, 220, 0.7)');
    p.text(`光点数量: ${dots.length}`, p.width - 100, p.height - 70);

    drawColorWheel();
  };

  const drawColorWheel = () => {
    const cx = p.width - 55;
    const cy = p.height - 45;
    const outerR = 30;
    const innerR = 15;

    const usedHues = new Set<number>();
    for (const dot of dots) {
      usedHues.add(Math.floor(dot.getHue() / 10) * 10);
    }

    p.noStroke();
    const step = 10;
    for (let hue = 0; hue < 360; hue += step) {
      const startAngle = p.radians(hue - 90);
      const endAngle = p.radians(hue + step - 90);
      const isUsed = usedHues.has(hue);
      const alpha = isUsed ? 1 : 0.2;

      p.fill(p.color(`hsla(${hue}, 80%, 70%, ${alpha})`));
      p.beginShape();
      p.vertex(cx, cy);
      for (let a = startAngle; a <= endAngle; a += 0.05) {
        p.vertex(cx + Math.cos(a) * outerR, cy + Math.sin(a) * outerR);
      }
      p.vertex(cx + Math.cos(endAngle) * outerR, cy + Math.sin(endAngle) * outerR);
      p.endShape(p.CLOSE);
    }

    p.noStroke();
    p.fill('#0b0b14');
    p.circle(cx, cy, innerR * 2);
  };

  const cleanupOldDots = () => {
    if (dots.length > MAX_DOTS) {
      const removeCount = Math.ceil(dots.length * 0.1);
      const toRemove = dots.slice(0, removeCount);
      for (const dot of toRemove) {
        dot.startDestroy();
      }
    }
  };

  p.mousePressed = () => {
    if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return;

    for (let i = dots.length - 1; i >= 0; i--) {
      if (dots[i].contains(p.mouseX, p.mouseY)) {
        dots[i].triggerRipple();
        return;
      }
    }

    const newDot = new ColorDot(p, p.mouseX, p.mouseY, dotIdCounter++);
    dots.push(newDot);
    activeRibbon = new ColorRibbon(p, newDot);
    prevMousePos = { x: p.mouseX, y: p.mouseY };
    prevMouseTime = p.millis();
  };

  p.mouseDragged = () => {
    if (!activeRibbon || !prevMousePos) return;

    const now = p.millis();
    const dt = Math.max(now - prevMouseTime, 1);
    const dx = p.mouseX - prevMousePos.x;
    const dy = p.mouseY - prevMousePos.y;
    const speed = Math.sqrt(dx * dx + dy * dy) / dt * 16;

    const hue = activeRibbon.endHue + (Math.random() - 0.5) * 30;
    const clampedHue = (hue + 360) % 360;
    activeRibbon.addPoint(p.mouseX, p.mouseY, speed, clampedHue);

    prevMousePos = { x: p.mouseX, y: p.mouseY };
    prevMouseTime = now;
  };

  p.mouseReleased = () => {
    if (activeRibbon) {
      const endPos = activeRibbon.getEndPosition();
      if (endPos) {
        for (let i = dots.length - 1; i >= 0; i--) {
          if (dots[i].contains(endPos.x, endPos.y) && dots[i] !== activeRibbon.startDot) {
            activeRibbon.setEndDot(dots[i]);
            break;
          }
        }
      }
      activeRibbon.startFading();
      ribbons.push(activeRibbon);
      activeRibbon = null;
    }
    prevMousePos = null;
  };
};

new p5(sketch);
