import p5 from 'p5';
import { ParticleLine } from './ParticleLine';

interface Star {
  x: number;
  y: number;
  size: number;
  twinklePhase: number;
  twinklePeriod: number;
  jitterPhase: number;
  jitterAmp: number;
}

interface ButtonParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: p5.Color;
  size: number;
}

let sketch = (p: p5) => {
  const lines: ParticleLine[] = [];
  let currentLine: ParticleLine | null = null;
  let isDrawing = false;
  let lastMouseX = 0;
  let lastMouseY = 0;
  const stars: Star[] = [];
  let buttonParticles: ButtonParticle[] = [];
  let buttonHover = false;
  let buttonScale = 1;

  const buttonRect = {
    x: 0,
    y: 0,
    w: 140,
    h: 44
  };

  const MAX_LINES = 5;

  function initStars(): void {
    stars.length = 0;
    for (let i = 0; i < 250; i++) {
      stars.push({
        x: p.random(p.width),
        y: p.random(p.height),
        size: p.random(1, 2),
        twinklePhase: p.random(p.TWO_PI),
        twinklePeriod: p.random(2, 5),
        jitterPhase: p.random(p.TWO_PI),
        jitterAmp: p.random(0.5, 1.5)
      });
    }
  }

  function drawBackground(): void {
    const c1 = p.color('#0a0520');
    const c2 = p.color('#120828');
    for (let y = 0; y < p.height; y++) {
      const inter = p.map(y, 0, p.height, 0, 1);
      const c = p.lerpColor(c1, c2, inter);
      p.stroke(c);
      p.line(0, y, p.width, y);
    }

    const fc = p.frameCount;
    for (const star of stars) {
      const twinkle = p.sin(
        fc / 60 * (p.TWO_PI / star.twinklePeriod) + star.twinklePhase
      );
      const alpha = 0.3 * 255 * (0.6 + 0.4 * (twinkle + 1) / 2);
      const jx = p.sin(fc / 60 * 2 + star.jitterPhase) * star.jitterAmp;
      const jy = p.cos(fc / 60 * 1.5 + star.jitterPhase) * star.jitterAmp;

      p.noStroke();
      p.fill(170, 170, 204, alpha);
      p.ellipse(star.x + jx, star.y + jy, star.size, star.size);
    }
  }

  function drawUI(): void {
    const lineCount = lines.filter(l => !l.isDead()).length;
    p.drawingContext.shadowBlur = 6;
    p.drawingContext.shadowColor = '#3355aa';
    p.noStroke();
    p.fill(255, 255, 255, 180);
    p.textSize(14);
    p.textAlign(p.LEFT, p.TOP);
    p.text(`线条数量: ${lineCount} / ${MAX_LINES}`, 20, 20);
    p.drawingContext.shadowBlur = 0;

    drawClearButton();
  }

  function drawClearButton(): void {
    const cx = p.width - 20 - buttonRect.w / 2;
    const cy = 20 + buttonRect.h / 2;
    buttonRect.x = cx - buttonRect.w / 2;
    buttonRect.y = cy - buttonRect.h / 2;

    if (buttonHover && buttonScale < 1.05) {
      buttonScale = p.lerp(buttonScale, 1.05, 0.15);
    } else if (!buttonHover && buttonScale > 1) {
      buttonScale = p.lerp(buttonScale, 1, 0.15);
    }

    p.push();
    p.translate(cx, cy);
    p.scale(buttonScale);
    p.translate(-cx, -cy);

    let bgAlpha = 80;
    if (buttonHover) bgAlpha = 140;

    p.noStroke();
    p.fill(60, 80, 140, bgAlpha);
    p.drawingContext.shadowBlur = 12;
    p.drawingContext.shadowColor = 'rgba(80, 120, 200, 0.5)';
    p.rect(buttonRect.x, buttonRect.y, buttonRect.w, buttonRect.h, 10, 10, 10, 10);
    p.drawingContext.shadowBlur = 0;

    p.fill(255, 255, 255, 220);
    p.textSize(15);
    p.textAlign(p.CENTER, p.CENTER);
    p.text('清空画布', cx, cy);

    for (let i = 0; i < 3; i++) {
      const px = buttonRect.x + p.random(buttonRect.w);
      const py = buttonRect.y + p.random(buttonRect.h);
      const pulse = p.sin(p.frameCount / 30 + i * 2) * 0.5 + 0.5;
      p.noStroke();
      p.fill(180, 210, 255, 100 * pulse);
      p.ellipse(px, py, 2 + pulse * 2, 2 + pulse * 2);
    }

    p.pop();

    updateButtonParticles();
  }

  function updateButtonParticles(): void {
    for (let i = buttonParticles.length - 1; i >= 0; i--) {
      const bp = buttonParticles[i];
      bp.x += bp.vx;
      bp.y += bp.vy;
      bp.vx *= 0.95;
      bp.vy *= 0.95;
      bp.life--;

      if (bp.life <= 0) {
        buttonParticles.splice(i, 1);
        continue;
      }

      const ratio = bp.life / bp.maxLife;
      const a = p.alpha(bp.color) * ratio;
      p.noStroke();
      p.fill(p.red(bp.color), p.green(bp.color), p.blue(bp.color), a);
      p.ellipse(bp.x, bp.y, bp.size * ratio, bp.size * ratio);
    }
  }

  function spawnButtonParticles(cx: number, cy: number): void {
    for (let i = 0; i < 25; i++) {
      const angle = p.random(p.TWO_PI);
      const speed = p.random(2, 6);
      buttonParticles.push({
        x: cx,
        y: cy,
        vx: p.cos(angle) * speed,
        vy: p.sin(angle) * speed,
        life: 40,
        maxLife: 40,
        color: p.color(
          p.random(150, 255),
          p.random(180, 255),
          p.random(200, 255),
          220
        ),
        size: p.random(2, 5)
      });
    }
  }

  function isInsideButton(mx: number, my: number): boolean {
    return (
      mx >= buttonRect.x &&
      mx <= buttonRect.x + buttonRect.w &&
      my >= buttonRect.y &&
      my <= buttonRect.y + buttonRect.h
    );
  }

  function clearAllLines(): void {
    for (const line of lines) {
      line.startFading();
    }
  }

  function manageLineLimit(): void {
    const activeLines = lines.filter(
      l => l.getState() === 'rotating' || l.getState() === 'drawing'
    );
    if (activeLines.length > MAX_LINES) {
      activeLines.sort((a, b) => a.getCreationTime() - b.getCreationTime());
      const excess = activeLines.length - MAX_LINES;
      for (let i = 0; i < excess; i++) {
        activeLines[i].startFading();
      }
    }
  }

  function removeDeadLines(): void {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].isDead()) {
        lines.splice(i, 1);
      }
    }
  }

  function getTotalParticleCount(): number {
    let count = 0;
    for (const line of lines) {
      count += line.getParticleCount();
    }
    return count;
  }

  p.setup = () => {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.parent('app');
    p.pixelDensity(1);
    initStars();
    lastMouseX = p.mouseX;
    lastMouseY = p.mouseY;
  };

  p.draw = () => {
    drawBackground();

    const centerX = p.width / 2;
    const centerY = p.height / 2;

    for (const line of lines) {
      line.update(centerX, centerY);
      line.draw();
    }

    removeDeadLines();

    if (isDrawing && currentLine) {
      const dx = p.mouseX - lastMouseX;
      const dy = p.mouseY - lastMouseY;
      const speed = p.sqrt(dx * dx + dy * dy);

      if (getTotalParticleCount() < 2000) {
        currentLine.addPoint(p.mouseX, p.mouseY, speed);
      }

      lastMouseX = p.mouseX;
      lastMouseY = p.mouseY;
    }

    buttonHover = isInsideButton(p.mouseX, p.mouseY);
    drawUI();
  };

  p.mousePressed = () => {
    if (isInsideButton(p.mouseX, p.mouseY)) {
      const cx = buttonRect.x + buttonRect.w / 2;
      const cy = buttonRect.y + buttonRect.h / 2;
      spawnButtonParticles(cx, cy);
      clearAllLines();
      return;
    }

    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].hitTest(p.mouseX, p.mouseY)) {
        lines[i].explode(p.mouseX, p.mouseY);
        return;
      }
    }

    isDrawing = true;
    const centerX = p.width / 2;
    const centerY = p.height / 2;
    currentLine = new ParticleLine(p, centerX, centerY);
    lines.push(currentLine);
    lastMouseX = p.mouseX;
    lastMouseY = p.mouseY;
    currentLine.addPoint(p.mouseX, p.mouseY, 0);
    manageLineLimit();
  };

  p.mouseDragged = () => {
    if (isDrawing && currentLine) {
      const dx = p.mouseX - lastMouseX;
      const dy = p.mouseY - lastMouseY;
      const speed = p.sqrt(dx * dx + dy * dy);

      if (getTotalParticleCount() < 2000) {
        currentLine.addPoint(p.mouseX, p.mouseY, speed);
      }

      lastMouseX = p.mouseX;
      lastMouseY = p.mouseY;
    }
  };

  p.mouseReleased = () => {
    if (isDrawing && currentLine) {
      currentLine.finishDrawing();
      currentLine = null;
      isDrawing = false;
      manageLineLimit();
    }
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    initStars();
  };
};

new p5(sketch);
