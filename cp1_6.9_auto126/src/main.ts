import p5 from 'p5';
import {
  LightString,
  Resonance,
  Particle,
  segmentsIntersect,
  Point
} from './string';

interface StarDot {
  x: number;
  y: number;
  alpha: number;
}

const MAX_STRINGS = 10;

const sketch = (p: p5): void => {
  let strings: LightString[] = [];
  let currentString: LightString | null = null;
  let isDrawing: boolean = false;
  let stars: StarDot[] = [];
  let resonances: Resonance[] = [];
  let particles: Particle[] = [];
  let checkedIntersections: Set<string> = new Set();
  let mouseXPos: number = 0;
  let mouseYPos: number = 0;

  const generateStars = (): void => {
    stars = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * p.windowWidth,
        y: Math.random() * p.windowHeight,
        alpha: 0.3 + Math.random() * 0.3
      });
    }
  };

  const drawBackground = (): void => {
    const top = p.color('#0a0a1a');
    const bottom = p.color('#1a0a2a');
    p.noFill();
    for (let y = 0; y < p.height; y++) {
      const inter = p.map(y, 0, p.height, 0, 1);
      const c = p.lerpColor(top, bottom, inter);
      p.stroke(c);
      p.line(0, y, p.width, y);
    }
  };

  const drawStars = (): void => {
    p.noStroke();
    for (const star of stars) {
      p.fill(255, 255, 255, Math.floor(star.alpha * 255));
      p.circle(star.x, star.y, 1);
    }
  };

  const drawCrosshair = (): void => {
    if (!isDrawing) return;
    p.push();
    p.stroke(255, 255, 255, 128);
    p.strokeWeight(1);
    p.noFill();
    p.line(mouseXPos - 10, mouseYPos, mouseXPos + 10, mouseYPos);
    p.line(mouseXPos, mouseYPos - 10, mouseXPos, mouseYPos + 10);
    p.pop();
  };

  const checkIntersections = (): void => {
    for (let i = 0; i < strings.length; i++) {
      for (let j = i + 1; j < strings.length; j++) {
        const s1 = strings[i];
        const s2 = strings[j];
        if (s1.isDrawing || s2.isDrawing) continue;

        const key = `${Math.min(s1.id, s2.id)}-${Math.max(s1.id, s2.id)}`;
        if (checkedIntersections.has(key)) continue;

        const segs1 = s1.getSegments();
        const segs2 = s2.getSegments();

        for (const seg1 of segs1) {
          for (const seg2 of segs2) {
            const pt = segmentsIntersect(seg1.a, seg1.b, seg2.a, seg2.b);
            if (pt) {
              createResonance(pt, s1.currentColor, s2.currentColor);
              checkedIntersections.add(key);
              break;
            }
          }
          if (checkedIntersections.has(key)) break;
        }
      }
    }
  };

  const createResonance = (pt: Point, c1: string, c2: string): void => {
    const mixed = LightString.mixColors(c1, c2);
    resonances.push(new Resonance(pt.x, pt.y, mixed));

    const count = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(pt.x, pt.y, mixed));
    }
  };

  const drawResonances = (): void => {
    for (const r of resonances) {
      p.push();
      const ctx = p.drawingContext as CanvasRenderingContext2D;
      ctx.shadowBlur = 12;
      ctx.shadowColor = r.color;
      p.noFill();
      const rgb = LightString.hexToRgb(r.color);
      p.stroke(rgb.r, rgb.g, rgb.b, Math.floor(r.alpha * 255));
      p.strokeWeight(2);
      p.circle(r.x, r.y, r.radius * 2);
      p.pop();
    }
  };

  const drawParticles = (): void => {
    for (const particle of particles) {
      p.push();
      const ctx = p.drawingContext as CanvasRenderingContext2D;
      ctx.shadowBlur = 8;
      ctx.shadowColor = particle.color;
      p.noStroke();
      const rgb = LightString.hexToRgb(particle.color);
      p.fill(rgb.r, rgb.g, rgb.b, Math.floor(particle.alpha * 255));
      p.circle(particle.x, particle.y, particle.size * 2);
      p.pop();
    }
  };

  p.setup = (): void => {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.parent('app');
    generateStars();
    p.frameRate(60);
  };

  p.draw = (): void => {
    drawBackground();
    drawStars();

    for (const s of strings) {
      s.update();
      s.draw(p);
    }

    checkIntersections();

    for (const r of resonances) {
      r.update();
    }
    resonances = resonances.filter(r => r.alive);
    drawResonances();

    for (const particle of particles) {
      particle.update();
    }
    particles = particles.filter(pt => pt.alive);
    drawParticles();

    drawCrosshair();
  };

  p.mousePressed = (): void => {
    if (p.mouseButton !== p.LEFT) return;
    if (strings.length >= MAX_STRINGS) return;

    mouseXPos = p.mouseX;
    mouseYPos = p.mouseY;
    isDrawing = true;
    const newId = Date.now() + Math.random();
    currentString = new LightString(newId, p.mouseX, p.mouseY);
    strings.push(currentString);
  };

  p.mouseDragged = (): void => {
    mouseXPos = p.mouseX;
    mouseYPos = p.mouseY;
    if (currentString && currentString.isDrawing) {
      currentString.addNode(p.mouseX, p.mouseY);
    }
  };

  p.mouseMoved = (): void => {
    mouseXPos = p.mouseX;
    mouseYPos = p.mouseY;
  };

  p.mouseReleased = (): void => {
    if (p.mouseButton !== p.LEFT) return;
    if (currentString) {
      currentString.finish();

      if (currentString.nodes.length < 2) {
        strings = strings.filter(s => s !== currentString);
      }
      currentString = null;
    }
    isDrawing = false;
  };

  p.windowResized = (): void => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    generateStars();
  };
};

new p5(sketch);
