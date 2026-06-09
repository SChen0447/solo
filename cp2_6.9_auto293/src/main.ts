import { GameState, type Fragment } from './gameState';
import { ObjectRenderer } from './objectRenderer';
import { TimelineRenderer } from './timelineRenderer';

const gameState = new GameState();

function renderFake3DScene(): void {
  const scene = document.getElementById('fake3d-scene');
  if (!scene) return;
  scene.innerHTML = '';

  const W = 1920;
  const H = 880;
  const VP = { x: W / 2, y: H * 0.4 };

  const createLine = (x1: number, y1: number, x2: number, y2: number, width = 1.5): void => {
    const line = document.createElement('div');
    line.className = 'perspective-line';
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
    line.style.left = `${minX}px`;
    line.style.top = `${minY}px`;
    line.style.width = `${len}px`;
    line.style.height = `${width}px`;
    line.style.transformOrigin = '0 50%';
    line.style.transform = `rotate(${angle}deg)`;
    scene.appendChild(line);
  };

  const floorY1 = H * 0.55;
  const floorY2 = H * 0.95;
  const leftWallX1 = W * 0.05;
  const leftWallX2 = W * 0.35;
  const rightWallX1 = W * 0.95;
  const rightWallX2 = W * 0.65;
  const backWallY = H * 0.2;

  createLine(leftWallX1, floorY2, leftWallX1, backWallY);
  createLine(rightWallX1, floorY2, rightWallX1, backWallY);
  createLine(leftWallX1, backWallY, rightWallX1, backWallY);
  createLine(leftWallX1, floorY2, rightWallX1, floorY2);

  for (let i = 1; i <= 6; i++) {
    const t = i / 7;
    const y = floorY1 + (floorY2 - floorY1) * t;
    const lx = leftWallX1 + (leftWallX2 - leftWallX1) * t;
    const rx = rightWallX1 - (rightWallX1 - rightWallX2) * t;
    createLine(lx, y, rx, y);
  }

  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const bx = leftWallX1 + (rightWallX1 - leftWallX1) * t;
    const ty = backWallY + (floorY2 - backWallY) * 0.15;
    createLine(bx, floorY2, VP.x + (bx - VP.x) * 0.25, ty);
  }

  createLine(leftWallX1, backWallY, VP.x, VP.y);
  createLine(rightWallX1, backWallY, VP.x, VP.y);

  const baseL = W * 0.28, baseR = W * 0.72;
  const baseT = H * 0.35, baseB = H * 0.62;
  [
    [baseL, baseT, baseR, baseT],
    [baseL, baseB, baseR, baseB],
    [baseL, baseT, baseL, baseB],
    [baseR, baseT, baseR, baseB],
    [baseL + 30, baseT + 30, baseR - 30, baseT + 30],
    [baseL + 30, baseB - 60, baseR - 30, baseB - 60]
  ].forEach(([a, b, c, d]) => createLine(a, b, c, d, 2));

  const deskL = W * 0.7, deskR = W * 0.92;
  const deskT = H * 0.5, deskB = H * 0.78;
  [
    [deskL, deskT, deskR, deskT],
    [deskL, deskT, deskL, deskB],
    [deskR, deskT, deskR, deskB],
    [deskL, deskB, deskL + 20, deskB],
    [deskR - 20, deskB, deskR, deskB]
  ].forEach(([a, b, c, d]) => createLine(a, b, c, d, 2));

  const mirrorCx = W * 0.78;
  const mirrorCy = H * 0.28;
  const mirrorRx = 80, mirrorRy = 100;
  for (let i = 0; i < 48; i++) {
    const a1 = (i / 48) * Math.PI * 2;
    const a2 = ((i + 1) / 48) * Math.PI * 2;
    createLine(
      mirrorCx + Math.cos(a1) * mirrorRx,
      mirrorCy + Math.sin(a1) * mirrorRy,
      mirrorCx + Math.cos(a2) * mirrorRx,
      mirrorCy + Math.sin(a2) * mirrorRy,
      2
    );
  }
}

function handleFragmentCollected(e: Event): void {
  const ce = e as CustomEvent<Fragment>;
  const fragment = ce.detail;
  gameState.addFragment(fragment);
  renderFragmentChips();
}

function renderFragmentChips(): void {
  const area = document.getElementById('fragment-area');
  if (!area) return;
  area.innerHTML = '';
  gameState.collectedFragments.forEach(fragment => {
    const chip = document.createElement('div');
    chip.className = 'fragment-chip';
    if (gameState.isFragmentPlaced(fragment.id)) chip.classList.add('used');
    chip.textContent = fragment.content;
    chip.draggable = true;
    chip.dataset.fragmentId = fragment.id;
    chip.dataset.objectIndex = String(fragment.objectIndex);
    chip.dataset.timeIndex = String(fragment.timeIndex);
    chip.dataset.content = fragment.content;
    chip.addEventListener('dragstart', (ev) => {
      if (ev.dataTransfer) {
        ev.dataTransfer.setData('fragmentId', fragment.id);
        ev.dataTransfer.setData('objectIndex', String(fragment.objectIndex));
        ev.dataTransfer.setData('timeIndex', String(fragment.timeIndex));
        ev.dataTransfer.setData('content', fragment.content);
      }
    });
    area.appendChild(chip);
  });
}

function switchToObject(objectIndex: number, renderer: ObjectRenderer): void {
  if (gameState.isTransitioning) return;
  gameState.isTransitioning = true;
  gameState.currentObjectIndex = objectIndex;

  const overlay = document.getElementById('fade-overlay');
  const objView = document.getElementById('object-view');
  if (!overlay || !objView) return;

  overlay.classList.add('fade-out');

  window.setTimeout(() => {
    renderer.render(objectIndex, () => switchToMainScene(renderer));
    overlay.classList.remove('fade-out');
    gameState.isTransitioning = false;
  }, 400);
}

function switchToMainScene(renderer: ObjectRenderer): void {
  if (gameState.isTransitioning) return;
  gameState.isTransitioning = true;
  gameState.currentObjectIndex = -1;

  const overlay = document.getElementById('fade-overlay');
  if (!overlay) return;

  overlay.classList.add('fade-out');
  window.setTimeout(() => {
    renderer.clear();
    const objView = document.getElementById('object-view');
    if (objView) objView.classList.add('hidden');
    overlay.classList.remove('fade-out');
    gameState.isTransitioning = false;
  }, 400);
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number;
  r: number; g: number; b: number;
}

function startFireplaceAnimation(): void {
  const container = document.getElementById('fireplace-container');
  const canvas = document.getElementById('fireplace-canvas') as HTMLCanvasElement | null;
  const truthText = document.getElementById('truth-text');
  if (!container || !canvas || !truthText) return;

  container.classList.add('active');
  canvas.width = 400;
  canvas.height = 400;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const particles: Particle[] = [];
  const PARTICLE_COUNT = 80;
  let startT = performance.now();
  let rafId = 0;

  const createParticle = (): Particle => {
    const t = (performance.now() - startT) / 5000;
    const intensity = Math.min(1, t * 1.8);
    const mix = Math.random();
    const r = Math.round(255 * (0.7 + 0.3 * mix));
    const g = Math.round(69 + (99 - 69) * mix);
    const b = Math.round(0 + (71 - 0) * mix);
    return {
      x: 180 + Math.random() * 40,
      y: 340,
      vx: (Math.random() - 0.5) * 1.2,
      vy: -(1 + Math.random() * 2.5) * (0.4 + intensity * 0.6),
      life: 0,
      maxLife: 60 + Math.random() * 40,
      size: 3 + Math.random() * 5,
      r, g, b
    };
  };

  const animate = () => {
    const elapsed = performance.now() - startT;
    const t = elapsed / 5000;
    const intensity = Math.min(1, t * 1.8);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const targetCount = Math.floor(PARTICLE_COUNT * (0.3 + intensity * 0.7));
    while (particles.length < targetCount) particles.push(createParticle());

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.015;
      p.vx *= 0.99;
      const lifeRatio = p.life / p.maxLife;
      const alpha = (1 - lifeRatio) * intensity;
      const size = p.size * (1 - lifeRatio * 0.5);

      ctx.beginPath();
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
      grad.addColorStop(0, `rgba(${p.r},${p.g},${p.b},${alpha})`);
      grad.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
      ctx.fillStyle = grad;
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();

      if (p.life >= p.maxLife || p.y < 50) {
        particles.splice(i, 1);
      }
    }

    if (elapsed > 1000 && !truthText.classList.contains('show')) {
      truthText.textContent = '"她没有消失，\n她只是选择了\n另一种方式存在。"';
      truthText.style.whiteSpace = 'pre-line';
      truthText.classList.add('show');
    }

    if (elapsed < 6500) {
      rafId = requestAnimationFrame(animate);
    } else {
      truthText.style.opacity = '0';
      setTimeout(() => {
        cancelAnimationFrame(rafId);
      }, 1000);
    }
  };
  animate();
}

function handleTimelineComplete(): void {
  if (gameState.isGameComplete) return;
  gameState.isGameComplete = true;
  startFireplaceAnimation();
}

function init(): void {
  renderFake3DScene();

  const objectView = document.getElementById('object-view');
  const objectRenderer = new ObjectRenderer(objectView as HTMLElement);
  objectView?.addEventListener('fragmentCollected', handleFragmentCollected);

  const hotspots = document.querySelectorAll('.hotspot');
  hotspots.forEach(h => {
    h.addEventListener('click', () => {
      const idx = parseInt((h as HTMLElement).dataset.objectIndex || '-1', 10);
      if (idx >= 0) switchToObject(idx, objectRenderer);
    });
  });

  const timelineContainer = document.getElementById('timeline');
  if (timelineContainer) {
    new TimelineRenderer(timelineContainer, gameState);
  }
  document.addEventListener('timelineComplete', handleTimelineComplete);

  window.addEventListener('resize', handleResize);
  handleResize();
}

function handleResize(): void {
  const scene = document.getElementById('scene-container');
  if (!scene) return;
  const w = window.innerWidth;
  if (w < 1200) {
    scene.style.transform = 'translateX(-50%) scale(0.8)';
  } else {
    scene.style.transform = 'translateX(-50%) scale(1)';
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
