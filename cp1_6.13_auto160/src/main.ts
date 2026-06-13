import { gsap } from 'gsap';
import {
  AstrolabeState,
  createAstrolabe,
  drawBackground,
  drawDisc,
  drawPointer,
  drawConstellations,
  drawRipples,
  drawMeteors,
  updateAstrolabe,
  regenerateBackgroundStars,
  getConstellationIndexAtAngle,
  resizeAstrolabe
} from './astrolabe';
import {
  CONSTELLATIONS,
  createAnimationState,
  AnimationState,
  triggerConstellationAppear,
  triggerRipple,
  triggerMeteor,
  updateAnimations
} from './constellation';

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

function playGearClick(): void {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.03);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch (e) {}
}

function playWoodClick(): void {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);

    const noise = ctx.createOscillator();
    const noiseGain = ctx.createGain();
    noise.type = 'sawtooth';
    noise.frequency.setValueAtTime(150, now);
    noise.frequency.exponentialRampToValueAtTime(60, now + 0.06);
    noiseGain.gain.setValueAtTime(0.05, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    noise.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.06);
  } catch (e) {}
}

function playChime(): void {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.08);
      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.12, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.6);
    });
  } catch (e) {}
}

function playTwinkle(): void {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {}
}

interface AppState {
  astrolabe: AstrolabeState;
  animation: AnimationState;
  timeline: gsap.core.Timeline;
  lastFrame: number;
  frameCount: number;
  fpsTime: number;
  fps: number;
  lastClickSound: number;
  lastAngleStep: number;
  hoveredIndex: number | null;
  hoveredTime: number;
  lastConstellationTriggered: number | null;
  discoveredIds: number[];
}

let appState: AppState;
let domRefs: {
  compassNeedle: HTMLElement;
  compassValue: HTMLElement;
  currentName: HTMLElement;
  toast: HTMLElement;
  codexBar: HTMLElement;
  storyEl: HTMLElement;
  seasonBtns: NodeListOf<HTMLElement>;
};

let clickableStars: { x: number; y: number; id: number; idx: number; radius: number }[] = [];

function initCompassDots(): void {
  const container = document.getElementById('compassDots')!;
  container.innerHTML = '';
  for (let i = 0; i < 12; i++) {
    const dot = document.createElement('div');
    dot.className = 'compass-dot';
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const r = 26;
    const x = Math.cos(angle) * r - 2;
    const y = Math.sin(angle) * r - 2;
    dot.style.transform = `translate(${x}px, ${y}px)`;
    container.appendChild(dot);
  }
}

function showToast(): void {
  domRefs.toast.classList.add('show');
  setTimeout(() => {
    domRefs.toast.classList.remove('show');
  }, 1500);
}

function updateCurrentName(index: number | null): void {
  if (index === null) {
    domRefs.currentName.textContent = '拖动指针观测星象';
  } else {
    domRefs.currentName.textContent = CONSTELLATIONS[index].name;
  }
}

function updateCompass(angle: number): void {
  let norm = ((angle + 90) % 360 + 360) % 360;
  domRefs.compassNeedle.style.transform = `translateX(-50%) rotate(${norm}deg)`;
  domRefs.compassValue.textContent = `${norm.toFixed(1)}°`;
}

function showStory(id: number): void {
  const story = CONSTELLATIONS[id].story;
  domRefs.storyEl.textContent = story;
  gsap.to(domRefs.storyEl, {
    opacity: 1,
    duration: 1,
    ease: 'power2.out'
  });
}

function hideStory(): void {
  gsap.to(domRefs.storyEl, {
    opacity: 0,
    duration: 0.5,
    ease: 'power2.out'
  });
}

function addCodexCard(id: number): void {
  if (appState.discoveredIds.includes(id)) return;
  appState.discoveredIds.push(id);

  const constellation = CONSTELLATIONS[id];
  const card = document.createElement('div');
  card.className = 'codex-card';
  card.dataset.id = String(id);

  const thumb = document.createElement('div');
  thumb.className = 'codex-thumb';

  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = 64;
  thumbCanvas.height = 64;
  const tctx = thumbCanvas.getContext('2d')!;
  tctx.clearRect(0, 0, 64, 64);

  const cx = 32;
  const cy = 32;
  const scale = 30 / appState.astrolabe.discRadius;

  for (let s = 0; s < constellation.stars.length; s++) {
    const star = constellation.stars[s];
    const sx = cx + (star.x - appState.astrolabe.centerX) * scale;
    const sy = cy + (star.y - appState.astrolabe.centerY) * scale;
    tctx.beginPath();
    tctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
    tctx.fillStyle = '#ffd700';
    tctx.fill();
  }

  tctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
  tctx.lineWidth = 0.5;
  for (const [a, b] of constellation.connections) {
    if (a < constellation.stars.length && b < constellation.stars.length) {
      const sA = constellation.stars[a];
      const sB = constellation.stars[b];
      const ax = cx + (sA.x - appState.astrolabe.centerX) * scale;
      const ay = cy + (sA.y - appState.astrolabe.centerY) * scale;
      const bx = cx + (sB.x - appState.astrolabe.centerX) * scale;
      const by = cy + (sB.y - appState.astrolabe.centerY) * scale;
      tctx.beginPath();
      tctx.moveTo(ax, ay);
      tctx.lineTo(bx, by);
      tctx.stroke();
    }
  }

  thumb.style.position = 'relative';
  thumbCanvas.style.position = 'absolute';
  thumbCanvas.style.top = '0';
  thumbCanvas.style.left = '0';
  thumb.appendChild(thumbCanvas);

  const name = document.createElement('div');
  name.className = 'codex-name';
  name.textContent = constellation.name;

  const info = document.createElement('div');
  info.className = 'codex-info';
  info.textContent = `亮星${constellation.brightStars}颗`;

  card.appendChild(thumb);
  card.appendChild(name);
  card.appendChild(info);
  domRefs.codexBar.appendChild(card);

  requestAnimationFrame(() => {
    card.classList.add('show');
  });
}

function handlePointerDown(e: MouseEvent | TouchEvent): void {
  const canvas = appState.astrolabe.canvas;
  const rect = canvas.getBoundingClientRect();
  let clientX: number, clientY: number;
  if (e instanceof TouchEvent) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }

  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);

  for (const star of clickableStars) {
    const dx = x - star.x;
    const dy = y - star.y;
    if (Math.sqrt(dx * dx + dy * dy) <= star.radius + 5) {
      handleStarClick(star.id, star.idx, star.x, star.y);
      e.preventDefault();
      return;
    }
  }

  const dx = x - appState.astrolabe.centerX;
  const dy = y - appState.astrolabe.centerY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const pointerAngle = appState.astrolabe.pointerAngle;

  const pointerRad = (pointerAngle * Math.PI) / 180;
  const px = appState.astrolabe.centerX + Math.cos(pointerRad) * (appState.astrolabe.mobile ? 130 : 200);
  const py = appState.astrolabe.centerY + Math.sin(pointerRad) * (appState.astrolabe.mobile ? 130 : 200);
  const distToPointer = Math.sqrt((x - px) ** 2 + (y - py) ** 2);

  if (dist < appState.astrolabe.discRadius + 60 || distToPointer < 60) {
    appState.astrolabe.isDragging = true;
    appState.lastAngleStep = Math.round(appState.astrolabe.targetAngle);
    e.preventDefault();
  }
}

function handleStarClick(id: number, idx: number, x: number, y: number): void {
  const cState = appState.animation.constellationStates.get(id);
  if (!cState || cState.dimmed) return;
  if (CONSTELLATIONS[id].stars[idx].explored) return;

  CONSTELLATIONS[id].stars[idx].explored = true;
  triggerRipple(appState.animation, x, y);
  playTwinkle();

  triggerMeteor(
    appState.animation,
    x, y, id, idx,
    appState.astrolabe.canvasWidth,
    appState.astrolabe.canvasHeight
  );

  gsap.delayedCall(0.6, () => {
    cState.dimmed = true;
    CONSTELLATIONS[id].explored = true;
    CONSTELLATIONS[id].discoveredAt = Date.now();
    addCodexCard(id);
  });
}

function handlePointerMove(e: MouseEvent | TouchEvent): void {
  if (!appState.astrolabe.isDragging) return;

  const canvas = appState.astrolabe.canvas;
  const rect = canvas.getBoundingClientRect();
  let clientX: number, clientY: number;
  if (e instanceof TouchEvent) {
    if (e.touches.length === 0) return;
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }

  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);

  const dx = x - appState.astrolabe.centerX;
  const dy = y - appState.astrolabe.centerY;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  appState.astrolabe.targetAngle = angle;

  const currentStep = Math.round(angle);
  if (Math.abs(currentStep - appState.lastAngleStep) >= 1) {
    const now = performance.now();
    if (now - appState.lastClickSound > 40) {
      playGearClick();
      appState.lastClickSound = now;
    }
    appState.lastAngleStep = currentStep;
  }
}

function handlePointerUp(): void {
  if (appState.astrolabe.isDragging) {
    appState.astrolabe.isDragging = false;

    const target = appState.astrolabe.targetAngle;
    const snapped = Math.round(target);
    const overshoot = (target - snapped) * 0.3;
    gsap.to(appState.astrolabe, {
      targetAngle: snapped + overshoot,
      duration: 0.5,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(appState.astrolabe, {
          targetAngle: snapped,
          duration: 0.3,
          ease: 'power2.inOut'
        });
      }
    });
  }
}

function handleSeasonClick(e: Event): void {
  const btn = e.currentTarget as HTMLElement;
  const season = btn.dataset.season;
  const angleMap: Record<string, number> = {
    spring: 0,
    summer: 90,
    autumn: 180,
    winter: 270
  };
  if (season && angleMap[season] !== undefined) {
    playWoodClick();
    hideStory();
    gsap.to(appState.astrolabe, {
      targetAngle: angleMap[season] - 90,
      duration: 1.2,
      ease: 'power3.inOut',
      onUpdate: () => {
        const step = Math.round(appState.astrolabe.targetAngle);
        const now = performance.now();
        if (now - appState.lastClickSound > 60) {
          playGearClick();
          appState.lastClickSound = now;
        }
      }
    });
  }
}

function handleResize(): void {
  const w = window.innerWidth;
  let canvasW: number, canvasH: number;
  if (w < 768) {
    canvasW = Math.min(w - 20, 600);
    canvasH = canvasW + 80;
  } else {
    canvasW = 800;
    canvasH = 700;
  }
  const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
  canvas.style.width = canvasW + 'px';
  canvas.style.height = canvasH + 'px';
  resizeAstrolabe(appState.astrolabe, canvasW < 600 ? 800 : canvasW, canvasH + 50);
}

function checkHoverConstellation(dt: number): void {
  const idx = getConstellationIndexAtAngle(appState.astrolabe.pointerAngle);

  if (appState.hoveredIndex !== idx) {
    appState.hoveredIndex = idx;
    appState.hoveredTime = 0;
    updateCurrentName(idx);
    hideStory();
    return;
  }

  if (idx !== null && !appState.astrolabe.isDragging) {
    appState.hoveredTime += dt;

    if (appState.hoveredTime >= 2 && appState.lastConstellationTriggered !== idx) {
      const cState = appState.animation.constellationStates.get(idx);
      if (!cState || cState.appearProgress < 1) {
        triggerConstellationAppear(appState.animation, idx, appState.timeline);
        regenerateBackgroundStars(appState.astrolabe);
        appState.astrolabe.flashConstellationId = idx;
        appState.astrolabe.flashPhase = 0;
        showToast();
        playChime();
        showStory(idx);
        appState.lastConstellationTriggered = idx;
      } else {
        showStory(idx);
        appState.lastConstellationTriggered = idx;
      }
    }
  }
}

function mainLoop(now: number): void {
  if (!appState.lastFrame) appState.lastFrame = now;
  const dt = Math.min((now - appState.lastFrame) / 1000, 0.1);
  appState.lastFrame = now;

  appState.frameCount++;
  if (now - appState.fpsTime > 1000) {
    appState.fps = appState.frameCount;
    appState.frameCount = 0;
    appState.fpsTime = now;
  }

  updateAstrolabe(appState.astrolabe, dt);
  updateAnimations(
    appState.animation,
    dt,
    appState.astrolabe.canvasWidth,
    appState.astrolabe.canvasHeight
  );
  checkHoverConstellation(dt);
  updateCompass(appState.astrolabe.pointerAngle);

  const ctx = appState.astrolabe.ctx;
  ctx.clearRect(0, 0, appState.astrolabe.canvasWidth, appState.astrolabe.canvasHeight);

  drawBackground(appState.astrolabe, now);
  drawDisc(appState.astrolabe, now, appState.hoveredIndex);

  const stars = drawConstellations(appState.astrolabe, appState.animation, now);
  clickableStars = stars;

  drawRipples(appState.astrolabe, appState.animation);
  drawMeteors(appState.astrolabe, appState.animation);
  drawPointer(appState.astrolabe);

  requestAnimationFrame(mainLoop);
}

function init(): void {
  initCompassDots();

  const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
  domRefs = {
    compassNeedle: document.getElementById('compassNeedle')!,
    compassValue: document.getElementById('compassValue')!,
    currentName: document.getElementById('currentName')!,
    toast: document.getElementById('toast')!,
    codexBar: document.getElementById('codexBar')!,
    storyEl: document.getElementById('constellationStory')!,
    seasonBtns: document.querySelectorAll('.season-btn')
  };

  appState = {
    astrolabe: createAstrolabe(canvas),
    animation: createAnimationState(),
    timeline: gsap.timeline(),
    lastFrame: 0,
    frameCount: 0,
    fpsTime: 0,
    fps: 60,
    lastClickSound: 0,
    lastAngleStep: -90,
    hoveredIndex: null,
    hoveredTime: 0,
    lastConstellationTriggered: null,
    discoveredIds: []
  };

  handleResize();
  window.addEventListener('resize', handleResize);

  canvas.addEventListener('mousedown', handlePointerDown);
  canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
  window.addEventListener('mousemove', handlePointerMove);
  window.addEventListener('touchmove', handlePointerMove, { passive: false });
  window.addEventListener('mouseup', handlePointerUp);
  window.addEventListener('touchend', handlePointerUp);
  window.addEventListener('touchcancel', handlePointerUp);

  domRefs.seasonBtns.forEach(btn => {
    btn.addEventListener('click', handleSeasonClick);
  });

  document.addEventListener('click', () => {
    getAudioCtx();
  }, { once: true });
  document.addEventListener('touchstart', () => {
    getAudioCtx();
  }, { once: true });

  updateCurrentName(null);
  requestAnimationFrame(mainLoop);
}

window.addEventListener('DOMContentLoaded', init);
