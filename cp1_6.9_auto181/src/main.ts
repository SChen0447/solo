import p5 from 'p5';
import { DrawingManager } from './DrawingManager';
import { SoundManager } from './SoundManager';
import { ParticleManager } from './ParticleManager';
import type { Trail, Star, Particle } from './types';

let drawingManager: DrawingManager;
let soundManager: SoundManager;
let particleManager: ParticleManager;
let stars: Star[] = [];
let canvasOpacity: number = 1;
let isAudioInitialized: boolean = false;
let fadingTrails: Trail[] = [];

const sketchInstance = (p: p5) => {
  drawingManager = new DrawingManager();
  soundManager = new SoundManager(p);
  particleManager = new ParticleManager();

  drawingManager.setOnPointAdded((point, trail) => {
    if (!isAudioInitialized) return;
    const recentSpeed = drawingManager.calculateRecentSpeed(10);
    soundManager.playRealTimeSound(recentSpeed);
    particleManager.spawnRippleParticles(point, trail.color, recentSpeed, trail.points);
  });

  drawingManager.setOnTrailComplete((trail) => {
    if (!isAudioInitialized) return;
    soundManager.playTrailCompleteSound(trail.avgSpeed);
  });

  drawingManager.setOnTrailFade((trail) => {
    fadingTrails.push(trail);
    particleManager.spawnFadeParticles(trail);
  });

  p.setup = () => {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.parent('canvas-container');
    p.pixelDensity(1);
    initStars();
    setupControlPanel();
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    initStars();
  };

  p.mousePressed = () => {
    if (p.mouseButton !== p.LEFT) return;
    if (isMouseOnPanel()) return;
    if (!isAudioInitialized) {
      (p as any).userStartAudio();
      soundManager.initAudio();
      isAudioInitialized = true;
    }
    drawingManager.startDrawing(p.mouseX, p.mouseY, p.width);
  };

  p.mouseDragged = () => {
    if (!drawingManager.getCurrentTrail()) return;
    drawingManager.addPoint(p.mouseX, p.mouseY);
  };

  p.mouseReleased = () => {
    if (p.mouseButton !== p.LEFT) return;
    drawingManager.endDrawing();
  };

  p.keyPressed = () => {
    if (p.key === ' ') {
      drawingManager.clearAll();
      particleManager.clearAll();
      fadingTrails = [];
      if (isAudioInitialized) {
        soundManager.playAscendingScale();
      }
    }
  };

  p.draw = () => {
    const deltaTime = p.deltaTime;

    drawBackground();
    drawStars();

    particleManager.update(deltaTime);
    updateTrails(deltaTime);
    checkPulseSounds();
    updateFadingTrails(deltaTime);

    drawParticles();
    drawCompletedTrails();
    drawCurrentTrail();
  };

  const drawBackground = () => {
    p.push();
    const cx = p.width * 0.65;
    const cy = p.height * 0.35;
    const maxDist = Math.sqrt(p.width * p.width + p.height * p.height);

    for (let d = maxDist; d > 0; d -= 4) {
      const t = d / maxDist;
      const r = p.lerp(10, 4, t);
      const g = p.lerp(5, 12, t);
      const b = p.lerp(32, 24, t);
      p.noStroke();
      p.fill(r, g, b, canvasOpacity * 255);
      p.ellipse(cx, cy, d * 2, d * 2);
    }
    p.pop();
  };

  const initStars = () => {
    stars = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * p.width,
        y: Math.random() * p.height,
        size: 1 + Math.random() * 2,
        baseAlpha: 0.3 + Math.random() * 0.5,
        twinklePeriod: 0.5 + Math.random() * 1.5,
        twinklePhase: Math.random() * Math.PI * 2
      });
    }
  };

  const drawStars = () => {
    const time = p.millis() / 1000;
    p.noStroke();
    for (const star of stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(time * (Math.PI * 2 / star.twinklePeriod) + star.twinklePhase);
      const alpha = star.baseAlpha * twinkle * canvasOpacity;
      p.fill(255, 255, 255, alpha * 255);
      p.ellipse(star.x, star.y, star.size, star.size);
    }
  };

  const drawCurrentTrail = () => {
    const current = drawingManager.getCurrentTrail();
    if (!current || current.points.length < 2) return;

    p.push();
    for (let i = 1; i < current.points.length; i++) {
      const prev = current.points[i - 1];
      const curr = current.points[i];
      const speed = drawingManager.calculateRecentSpeed(10);
      const strokeW = p.lerp(2, 8, Math.min(1, speed / 100));

      p.stroke(current.color);
      p.strokeWeight(strokeW + 6);
      p.drawingContext.globalAlpha = 0.5 * canvasOpacity;
      p.line(prev.x, prev.y, curr.x, curr.y);

      p.strokeWeight(strokeW);
      p.drawingContext.globalAlpha = canvasOpacity;
      p.line(prev.x, prev.y, curr.x, curr.y);
    }
    p.pop();
  };

  const drawCompletedTrails = () => {
    const trails = drawingManager.getTrails();
    const time = p.millis() / 1000;

    for (const trail of trails) {
      if (trail.fadingOut) continue;
      drawFlowingTrail(trail, time);
    }

    for (const trail of fadingTrails) {
      const elapsed = (Date.now() - trail.fadeStartTime) / 2000;
      const alpha = Math.max(0, 1 - elapsed) * canvasOpacity;
      drawTrailStatic(trail, alpha, 1);
    }
  };

  const drawFlowingTrail = (trail: Trail, time: number) => {
    if (trail.points.length < 2) return;

    const cycleDuration = 3 + trail.points.length * 0.02;
    const progress = (time % cycleDuration) / cycleDuration;
    const totalLength = getTrailLength(trail);
    const headLength = Math.min(totalLength * 0.15, 100);
    const headPosition = progress * totalLength;

    p.push();
    p.noFill();

    p.stroke(trail.color);
    p.strokeWeight(2);
    p.drawingContext.globalAlpha = 0.3 * canvasOpacity;
    drawTrailPath(trail);

    p.drawingContext.globalAlpha = canvasOpacity;
    for (let i = 1; i < trail.points.length; i++) {
      const prev = trail.points[i - 1];
      const curr = trail.points[i];
      const segStart = getDistanceUpTo(trail, i - 1);
      const segEnd = segStart + dist(prev.x, prev.y, curr.x, curr.y);

      const headSegStart = headPosition - headLength;
      const overlapStart = Math.max(segStart, headSegStart);
      const overlapEnd = Math.min(segEnd, headPosition);

      if (overlapEnd > overlapStart) {
        const t1 = (overlapStart - segStart) / (segEnd - segStart);
        const t2 = (overlapEnd - segStart) / (segEnd - segStart);
        const x1 = p.lerp(prev.x, curr.x, t1);
        const y1 = p.lerp(prev.y, curr.y, t1);
        const x2 = p.lerp(prev.x, curr.x, t2);
        const y2 = p.lerp(prev.y, curr.y, t2);

        const brightness = p.map(overlapStart, headSegStart, headPosition, 0.3, 1);
        p.strokeWeight(4 * brightness + 2);
        p.drawingContext.globalAlpha = brightness * canvasOpacity;
        p.line(x1, y1, x2, y2);

        p.strokeWeight((4 * brightness + 2) + 4);
        p.drawingContext.globalAlpha = brightness * 0.5 * canvasOpacity;
        p.line(x1, y1, x2, y2);
      }
    }
    p.pop();
  };

  const drawTrailStatic = (trail: Trail, alpha: number, glowSize: number) => {
    if (trail.points.length < 2) return;

    p.push();
    p.stroke(trail.color);
    p.strokeWeight(2 + glowSize * 2);
    p.drawingContext.globalAlpha = 0.3 * alpha;
    drawTrailPath(trail);

    p.strokeWeight(2);
    p.drawingContext.globalAlpha = alpha;
    drawTrailPath(trail);
    p.pop();
  };

  const drawTrailPath = (trail: Trail) => {
    if (trail.points.length < 2) return;
    p.beginShape();
    p.vertex(trail.points[0].x, trail.points[0].y);
    for (let i = 1; i < trail.points.length; i++) {
      p.vertex(trail.points[i].x, trail.points[i].y);
    }
    p.endShape();
  };

  const getTrailLength = (trail: Trail): number => {
    let len = 0;
    for (let i = 1; i < trail.points.length; i++) {
      len += dist(trail.points[i - 1].x, trail.points[i - 1].y, trail.points[i].x, trail.points[i].y);
    }
    return len;
  };

  const getDistanceUpTo = (trail: Trail, index: number): number => {
    let len = 0;
    for (let i = 1; i <= index; i++) {
      len += dist(trail.points[i - 1].x, trail.points[i - 1].y, trail.points[i].x, trail.points[i].y);
    }
    return len;
  };

  const dist = (x1: number, y1: number, x2: number, y2: number): number => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const updateTrails = (_deltaTime: number) => {
    const trails = drawingManager.getTrails();
    for (const trail of trails) {
      if (!trail.fadingOut) {
        trail.playProgress = (p.millis() - trail.createdAt) / 1000;
      }
    }
  };

  const checkPulseSounds = () => {
    if (!isAudioInitialized) return;
    const trails = drawingManager.getTrails();
    for (const trail of trails) {
      if (trail.fadingOut) continue;
      const now = Date.now();
      if (now - trail.lastPulseTime >= trail.nextPulseDelay) {
        const freq = soundManager.speedToFrequency(trail.avgSpeed) * (0.8 + Math.random() * 0.4);
        soundManager.playPulseSound(freq);
        trail.lastPulseTime = now;
        trail.nextPulseDelay = 1000 + Math.random() * 2000;
      }
    }
  };

  const updateFadingTrails = (_deltaTime: number) => {
    fadingTrails = fadingTrails.filter((trail) => {
      return Date.now() - trail.fadeStartTime < 2000;
    });
  };

  const drawParticles = () => {
    const particles = particleManager.getParticles();
    p.push();
    p.noStroke();
    for (const particle of particles) {
      drawParticle(particle);
    }
    p.pop();
  };

  const drawParticle = (particle: Particle) => {
    const alpha = particle.alpha * canvasOpacity;
    p.fill(particle.color);
    p.drawingContext.globalAlpha = alpha * 0.5;
    p.ellipse(particle.x, particle.y, particle.size + 4, particle.size + 4);

    p.drawingContext.globalAlpha = alpha;
    p.ellipse(particle.x, particle.y, particle.size, particle.size);
  };

  const isMouseOnPanel = (): boolean => {
    const panel = document.getElementById('control-panel');
    if (!panel) return false;
    const rect = panel.getBoundingClientRect();
    return p.mouseX >= rect.left && p.mouseX <= rect.right &&
           p.mouseY >= rect.top && p.mouseY <= rect.bottom;
  };

  const setupControlPanel = () => {
    setupSlider('volume', 50, 0, 100, (value) => {
      soundManager.setVolume(value / 100);
    });

    setupSlider('opacity', 100, 0, 100, (value) => {
      canvasOpacity = value / 100;
    });
  };

  const setupSlider = (name: string, defaultValue: number, min: number, max: number, onChange: (value: number) => void) => {
    const wrapper = document.querySelector(`.slider-wrapper:nth-of-type(${name === 'volume' ? 1 : 2})`) as HTMLElement;
    const fill = document.getElementById(`${name}-fill`) as HTMLElement;
    const thumb = document.getElementById(`${name}-thumb`) as HTMLElement;
    const valueDisplay = document.getElementById(`${name}-value`) as HTMLElement;

    if (!wrapper || !fill || !thumb || !valueDisplay) return;

    let currentValue = defaultValue;
    let targetValue = defaultValue;
    let isDragging = false;
    let animationId: number | null = null;

    const updateUI = () => {
      const percent = (currentValue - min) / (max - min) * 100;
      fill.style.width = `${percent}%`;
      thumb.style.left = `${percent}%`;
      valueDisplay.textContent = `${Math.round(currentValue)}`;
    };

    const animate = () => {
      const diff = targetValue - currentValue;
      if (Math.abs(diff) < 0.1) {
        currentValue = targetValue;
        updateUI();
        onChange(currentValue);
        animationId = null;
        return;
      }
      currentValue += diff * 0.1;
      updateUI();
      onChange(currentValue);
      animationId = requestAnimationFrame(animate);
    };

    const setValue = (newValue: number) => {
      targetValue = Math.max(min, Math.min(max, newValue));
      if (!animationId) {
        animationId = requestAnimationFrame(animate);
      }
    };

    const getValueFromEvent = (clientX: number): number => {
      const rect = wrapper.getBoundingClientRect();
      const percent = (clientX - rect.left) / rect.width;
      return min + percent * (max - min);
    };

    thumb.addEventListener('mousedown', (e) => {
      e.preventDefault();
      isDragging = true;
      thumb.style.transition = 'none';
      wrapper.style.transition = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        setValue(getValueFromEvent(e.clientX));
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      thumb.style.transition = '';
      wrapper.style.transition = '';
    });

    wrapper.addEventListener('click', (e) => {
      if (!isDragging) {
        setValue(getValueFromEvent((e as MouseEvent).clientX));
      }
    });

    setValue(defaultValue);
    updateUI();
  };
};

new p5(sketchInstance);
