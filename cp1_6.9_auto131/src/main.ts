import p5 from 'p5';
import { SpiderWeb } from './SpiderWeb';
import { PulseEffect } from './PulseEffect';
import { UIManager } from './UIManager';

interface BackgroundStar {
  x: number;
  y: number;
  size: number;
  alpha: number;
  blinkPeriod: number;
  phase: number;
}

const MIN_WIDTH = 400;
const MIN_HEIGHT = 400;
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;

const sketch = (p: p5) => {
  let spiderWeb: SpiderWeb;
  let pulseEffect: PulseEffect;
  let uiManager: UIManager;
  let stars: BackgroundStar[] = [];
  let isDragging = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  let strokeProgress = 0;
  let totalStrokeLength = 0;
  let startTime = 0;
  let lastFrameTime = 0;

  const generateStars = (count: number, w: number, h: number): BackgroundStar[] => {
    const result: BackgroundStar[] = [];
    for (let i = 0; i < count; i++) {
      result.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 1 + Math.random() * 2,
        alpha: 0.3 + Math.random() * 0.5,
        blinkPeriod: 500 + Math.random() * 1500,
        phase: Math.random() * Math.PI * 2,
      });
    }
    return result;
  };

  const calculateCanvasSize = (): { w: number; h: number } => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const ratio = vw / vh;

    let w = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, vw));
    let h = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, vh));

    if (w / h > ratio) {
      w = h * ratio;
    } else {
      h = w / ratio;
    }

    return { w: Math.round(w), h: Math.round(h) };
  };

  const drawBackground = (w: number, h: number) => {
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.hypot(w, h) / 2;

    const gradient = p.drawingContext.createRadialGradient(cx, cy, 0, cx, cy, maxR);
    gradient.addColorStop(0, '#1a0a2a');
    gradient.addColorStop(1, '#0a0a1a');

    p.drawingContext.fillStyle = gradient;
    p.noStroke();
    p.rect(0, 0, w, h);
  };

  const drawStars = (now: number) => {
    p.noStroke();
    for (const star of stars) {
      const t = (now / 1000) * (1000 / star.blinkPeriod) * Math.PI * 2;
      const blink = 0.5 + 0.5 * Math.sin(t + star.phase);
      const alpha = star.alpha * (0.5 + 0.5 * blink);
      p.fill(255, 255, 255, Math.round(alpha * 255));
      p.ellipse(star.x, star.y, star.size, star.size);
    }
  };

  const lerpColor = (
    c1: { r: number; g: number; b: number },
    c2: { r: number; g: number; b: number },
    t: number
  ): { r: number; g: number; b: number } => {
    return {
      r: Math.round(c1.r + (c2.r - c1.r) * t),
      g: Math.round(c1.g + (c2.g - c1.g) * t),
      b: Math.round(c1.b + (c2.b - c1.b) * t),
    };
  };

  const drawSpiderWeb = (now: number) => {
    const segments = spiderWeb.getSegments();
    const particles = spiderWeb.getParticles();
    const nodes = spiderWeb.getNodes();

    for (const seg of segments) {
      const startP = particles.find(pp => pp.id === seg.startParticleId);
      const endP = particles.find(pp => pp.id === seg.endParticleId);
      if (!startP || !endP) continue;

      let lineColor: { r: number; g: number; b: number };
      let alpha = 120;

      if (seg.highlightUntil > now && seg.highlightColor) {
        lineColor = seg.highlightColor;
        alpha = 200;
      } else {
        const midColor = lerpColor(startP.color, endP.color, 0.5);
        lineColor = midColor;
      }

      p.strokeWeight(1.5);
      p.stroke(lineColor.r, lineColor.g, lineColor.b, alpha);
      p.line(startP.x, startP.y, endP.x, endP.y);
    }

    for (const pt of particles) {
      p.noStroke();
      p.fill(pt.color.r, pt.color.g, pt.color.b, 220);
      p.ellipse(pt.x, pt.y, pt.radius * 2, pt.radius * 2);
    }

    for (const node of nodes) {
      const t = (now / 1000) * (Math.PI * 2 / 1.5);
      const pulse = 1.0 + 0.3 * (0.5 + 0.5 * Math.sin(t + node.pulsePhase));
      const r = node.radius * pulse;

      p.drawingContext.save();
      const glowGrad = p.drawingContext.createRadialGradient(
        node.x, node.y, 0,
        node.x, node.y, r * 3
      );
      glowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
      glowGrad.addColorStop(0.4, 'rgba(187, 136, 255, 0.3)');
      glowGrad.addColorStop(1, 'rgba(187, 136, 255, 0)');
      p.drawingContext.fillStyle = glowGrad;
      p.ellipse(node.x, node.y, r * 6, r * 6);
      p.drawingContext.restore();

      p.noStroke();
      p.fill(255, 255, 255, 255);
      p.ellipse(node.x, node.y, r * 2, r * 2);
    }
  };

  const drawTrailParticles = (now: number) => {
    const trails = pulseEffect.getTrailParticles();
    p.noStroke();

    for (const t of trails) {
      const elapsed = now - t.createdAt;
      const life = Math.max(0, 1 - elapsed / t.lifetime);
      const alpha = Math.round(0.8 * life * 255);
      p.fill(t.color.r, t.color.g, t.color.b, alpha);
      p.ellipse(t.x, t.y, t.radius * 2, t.radius * 2);
    }
  };

  const drawPulseWaves = (now: number) => {
    const waves = pulseEffect.getWaves();
    p.noStroke();

    for (const wave of waves) {
      const tip = pulseEffect.getWaveTipPosition(wave);
      if (!tip) continue;

      const elapsed = now - wave.startTime;
      const color = pulseEffect.getPulseColor(elapsed);

      p.drawingContext.save();
      const glowGrad = p.drawingContext.createRadialGradient(
        tip.x, tip.y, 0,
        tip.x, tip.y, 20
      );
      glowGrad.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0.9)`);
      glowGrad.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, 0.3)`);
      glowGrad.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
      p.drawingContext.fillStyle = glowGrad;
      p.ellipse(tip.x, tip.y, 40, 40);
      p.drawingContext.restore();

      p.fill(color.r, color.g, color.b, 255);
      p.ellipse(tip.x, tip.y, 6, 6);
    }
  };

  p.setup = () => {
    const { w, h } = calculateCanvasSize();
    p.createCanvas(w, h);
    p.pixelDensity(window.devicePixelRatio || 1);

    spiderWeb = new SpiderWeb();
    pulseEffect = new PulseEffect(spiderWeb);
    uiManager = new UIManager('app', () => {
      spiderWeb.clear();
      pulseEffect.clear();
    });

    stars = generateStars(400, w, h);
    startTime = performance.now();
    lastFrameTime = startTime;
    p.frameRate(60);
  };

  p.windowResized = () => {
    const { w, h } = calculateCanvasSize();
    p.resizeCanvas(w, h);
    stars = generateStars(400, w, h);
  };

  p.mousePressed = () => {
    if (p.mouseButton !== p.LEFT) return;

    const node = spiderWeb.findNodeAt(p.mouseX, p.mouseY, 15);
    if (node) {
      pulseEffect.trigger(node);
      return;
    }

    isDragging = true;
    lastMouseX = p.mouseX;
    lastMouseY = p.mouseY;
    strokeProgress = 0;
    totalStrokeLength = 0;
    spiderWeb.addParticle(p.mouseX, p.mouseY, 0);
  };

  p.mouseDragged = () => {
    if (!isDragging) return;

    const dx = p.mouseX - lastMouseX;
    const dy = p.mouseY - lastMouseY;
    const dist = Math.hypot(dx, dy);

    if (dist < 10) return;

    const spacing = 10 + Math.random() * 5;
    const steps = Math.floor(dist / spacing);

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = lastMouseX + dx * t;
      const y = lastMouseY + dy * t;

      totalStrokeLength += spacing;
      strokeProgress = Math.min(1, totalStrokeLength / 2000);

      spiderWeb.addParticle(x, y, strokeProgress);
    }

    lastMouseX = p.mouseX;
    lastMouseY = p.mouseY;
  };

  p.mouseReleased = () => {
    if (p.mouseButton !== p.LEFT) return;
    if (isDragging) {
      isDragging = false;
      spiderWeb.endStroke();
    }
  };

  p.draw = () => {
    const now = performance.now();
    const deltaTime = now - lastFrameTime;
    lastFrameTime = now;

    const w = p.width;
    const h = p.height;

    drawBackground(w, h);
    drawStars(now);

    pulseEffect.update(deltaTime);

    drawSpiderWeb(now);
    drawTrailParticles(now);
    drawPulseWaves(now);

    uiManager.update({
      nodeCount: spiderWeb.getNodeCount(),
      totalLength: spiderWeb.getTotalLength(),
      pulseEventCount: pulseEffect.getPulseEventCount(),
    });
  };
};

new p5(sketch, document.getElementById('app')!);
