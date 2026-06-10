import { Star, detectSentiment, colorForSentiment } from './star';
import { StarPool } from './pool';

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  length: number;
}

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const statsPanel = document.getElementById('stats-panel')!;
const collapseBtn = document.getElementById('collapse-btn')!;
const expandBtn = document.getElementById('expand-btn')!;
const statTotal = document.getElementById('stat-total')!;
const statCollected = document.getElementById('stat-collected')!;
const statToday = document.getElementById('stat-today')!;

const wishBtn = document.getElementById('wish-btn')!;
const wishInputWrap = document.getElementById('wish-input-wrap')!;
const wishInput = document.getElementById('wish-input') as HTMLInputElement;
const sendBtn = document.getElementById('send-btn')!;

const bubbleDialog = document.getElementById('bubble-dialog')!;
const bubbleText = document.getElementById('bubble-text')!;
const bubbleClose = document.getElementById('bubble-close')!;
const bubbleCollect = document.getElementById('bubble-collect')!;
const bubbleTip = document.getElementById('bubble-tip')!;

const isMobile = () => window.innerWidth < 768;

let width = 0;
let height = 0;
let dpr = Math.max(1, window.devicePixelRatio || 1);
let centerX = 0;
let centerY = 0;

const ORBIT_PERIOD = 60;
const ORBIT_SPEED = (Math.PI * 2) / ORBIT_PERIOD;

const initialCount = isMobile() ? 120 : 200;
const pool = new StarPool(initialCount);

let meteors: Meteor[] = [];
let currentBubbleStar: Star | null = null;

let lastTime = performance.now();
let fpsFrames = 0;
let fpsAccum = 0;
let lastFpsCheck = performance.now();
let lastStarAdjust = performance.now();

function resizeCanvas(): void {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  centerX = width / 2;
  centerY = height / 2;
}

function randomStarPosition(): { x: number; y: number } {
  const margin = 60;
  const minR = 40;
  const maxR = Math.min(width, height) / 2 - margin;
  const angle = Math.random() * Math.PI * 2;
  const r = minR + Math.random() * (maxR - minR);
  return {
    x: centerX + Math.cos(angle) * r,
    y: centerY + Math.sin(angle) * r,
  };
}

function generateInitialStars(): void {
  const target = pool.targetCount;
  for (let i = 0; i < target; i++) {
    const { x, y } = randomStarPosition();
    const star = new Star({ baseX: x, baseY: y });
    star.isCollected = pool.isWishCollected(star.wishText);
    pool.addStar(star);
  }
}

function spawnMeteors(count: number): void {
  for (let i = 0; i < count; i++) {
    const fromLeft = Math.random() > 0.5;
    const startX = fromLeft ? -20 : width + 20;
    const startY = Math.random() * height * 0.6;
    const speed = 400 + Math.random() * 300;
    const angle = (fromLeft ? 1 : -1) * (Math.PI / 5 + Math.random() * Math.PI / 6);
    meteors.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed * (fromLeft ? 1 : -1),
      vy: Math.abs(Math.sin(angle) * speed),
      life: 0,
      maxLife: 0.8 + Math.random() * 0.4,
      length: 60 + Math.random() * 60,
    });
  }
}

function updateMeteors(dt: number): void {
  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i];
    m.life += dt;
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    if (m.life >= m.maxLife || m.x < -100 || m.x > width + 100 || m.y > height + 100) {
      meteors.splice(i, 1);
    }
  }
}

function drawMeteors(): void {
  for (const m of meteors) {
    const alpha = 1 - m.life / m.maxLife;
    const tailX = m.x - (m.vx / Math.hypot(m.vx, m.vy)) * m.length;
    const tailY = m.y - (m.vy / Math.hypot(m.vx, m.vy)) * m.length;
    const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
    grad.addColorStop(0, `rgba(255, 248, 220, 0)`);
    grad.addColorStop(1, `rgba(255, 248, 220, ${alpha})`);
    ctx.save();
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(m.x, m.y);
    ctx.stroke();
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(m.x, m.y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawBackground(): void {
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#0b0e27');
  grad.addColorStop(1, '#1a1d4a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

function updateStatsUI(): void {
  const s = pool.getStats();
  statTotal.textContent = String(s.total);
  statCollected.textContent = String(s.collected);
  statToday.textContent = String(s.todayNew);
}

function showBubble(star: Star): void {
  currentBubbleStar = star;
  bubbleText.textContent = star.wishText;
  const isCollected = star.isCollected;
  if (isCollected) {
    bubbleCollect.classList.add('collected');
    bubbleCollect.textContent = '💛 已收藏';
    bubbleTip.style.display = 'inline';
  } else {
    bubbleCollect.classList.remove('collected');
    bubbleCollect.textContent = '❤️ 收藏';
    bubbleTip.style.display = 'none';
  }
  bubbleDialog.classList.add('visible');
  positionBubble(star);
}

function positionBubble(star: Star): void {
  const bw = bubbleDialog.offsetWidth || 280;
  const bh = bubbleDialog.offsetHeight || 120;
  let left = star.x + 20;
  let top = star.y - bh / 2;
  if (left + bw > width - 10) left = star.x - bw - 20;
  if (left < 10) left = 10;
  if (top < 10) top = 10;
  if (top + bh > height - 10) top = height - bh - 10;
  bubbleDialog.style.left = `${left}px`;
  bubbleDialog.style.top = `${top}px`;
  bubbleDialog.style.transform = 'none';
}

function hideBubble(): void {
  currentBubbleStar = null;
  bubbleDialog.classList.remove('visible');
}

function showWishInput(): void {
  wishInputWrap.classList.add('visible');
  setTimeout(() => wishInput.focus(), 50);
}

function hideWishInput(): void {
  wishInputWrap.classList.remove('visible');
  wishInput.value = '';
}

function submitWish(): void {
  const text = wishInput.value.trim();
  if (!text) return;
  const sentiment = detectSentiment(text);
  const color = colorForSentiment(sentiment);
  const { x: endX, y: endY } = randomStarPosition();
  const rect = wishInput.getBoundingClientRect();
  const startX = rect.left + rect.width / 2;
  const startY = rect.top + rect.height / 2;
  const newStar = new Star({
    baseX: endX,
    baseY: endY,
    size: 4 + Math.random() * 4,
    color,
    opacity: 0.8 + Math.random() * 0.2,
    wishText: text.slice(0, 30),
  });
  newStar.startFly(startX, startY, endX, endY);
  pool.addStar(newStar);
  pool.incrementTodayWishes();
  spawnMeteors(5 + Math.floor(Math.random() * 6));
  sendBtn.classList.add('pulse');
  setTimeout(() => sendBtn.classList.remove('pulse'), 300);
  hideWishInput();
  updateStatsUI();
}

function handleCanvasClick(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const star = pool.getStarAtPosition(x, y);
  if (star) {
    star.handleClick();
    showBubble(star);
  } else {
    hideBubble();
  }
}

function handleTouchStart(e: TouchEvent): void {
  if (e.touches.length === 0) return;
  const t = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const x = t.clientX - rect.left;
  const y = t.clientY - rect.top;
  const star = pool.getStarAtPosition(x, y);
  if (star) {
    star.handleClick();
    showBubble(star);
    e.preventDefault();
  } else {
    hideBubble();
  }
}

function togglePanelCollapsed(): void {
  const collapsed = statsPanel.classList.toggle('collapsed');
  if (collapsed) {
    collapseBtn.style.display = 'none';
    expandBtn.style.display = 'block';
    statsPanel.querySelector('.title')!.textContent = '';
  } else {
    collapseBtn.style.display = 'flex';
    expandBtn.style.display = 'none';
    statsPanel.querySelector('.title')!.textContent = '星语心愿';
  }
}

function adjustStarCount(avgFps: number): void {
  const now = performance.now();
  if (now - lastStarAdjust < 3000) return;
  lastStarAdjust = now;
  if (avgFps < 55 && pool.stars.length > 60) {
    const toRemove = Math.min(5, pool.stars.length - 60);
    for (let i = 0; i < toRemove; i++) {
      pool.removeStar(pool.stars.length - 1);
    }
    pool.adjustTargetCount(-toRemove);
    updateStatsUI();
  } else if (avgFps > 58 && pool.stars.length < pool.targetCount) {
    const maxAdd = isMobile() ? 120 : 220;
    const toAdd = Math.min(5, maxAdd - pool.stars.length);
    for (let i = 0; i < toAdd; i++) {
      const { x, y } = randomStarPosition();
      const s = new Star({ baseX: x, baseY: y });
      s.isCollected = pool.isWishCollected(s.wishText);
      pool.addStar(s);
    }
    pool.adjustTargetCount(toAdd);
    updateStatsUI();
  }
}

function frame(now: number): void {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  fpsFrames += 1;
  fpsAccum += dt;
  if (now - lastFpsCheck >= 2000) {
    const avgFps = fpsFrames / fpsAccum;
    adjustStarCount(avgFps);
    fpsFrames = 0;
    fpsAccum = 0;
    lastFpsCheck = now;
  }

  for (const s of pool.stars) {
    s.update(dt, centerX, centerY, ORBIT_SPEED);
  }
  updateMeteors(dt);

  drawBackground();

  for (const s of pool.stars) {
    if (
      s.x < -50 ||
      s.x > width + 50 ||
      s.y < -50 ||
      s.y > height + 50
    ) {
      continue;
    }
    s.draw(ctx);
  }

  drawMeteors();

  if (currentBubbleStar) {
    positionBubble(currentBubbleStar);
  }

  requestAnimationFrame(frame);
}

function init(): void {
  resizeCanvas();
  generateInitialStars();
  updateStatsUI();

  window.addEventListener('resize', () => {
    resizeCanvas();
  });

  canvas.addEventListener('click', handleCanvasClick);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });

  collapseBtn.addEventListener('click', togglePanelCollapsed);
  expandBtn.addEventListener('click', togglePanelCollapsed);

  wishBtn.addEventListener('click', () => {
    wishBtn.classList.add('pulse');
    setTimeout(() => wishBtn.classList.remove('pulse'), 400);
    if (wishInputWrap.classList.contains('visible')) {
      hideWishInput();
    } else {
      hideBubble();
      showWishInput();
    }
  });

  sendBtn.addEventListener('click', submitWish);
  wishInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitWish();
    else if (e.key === 'Escape') hideWishInput();
  });

  bubbleClose.addEventListener('click', hideBubble);
  bubbleCollect.addEventListener('click', () => {
    if (!currentBubbleStar) return;
    pool.toggleCollection(currentBubbleStar);
    if (currentBubbleStar.isCollected) {
      bubbleCollect.classList.add('collected');
      bubbleCollect.textContent = '💛 已收藏';
      bubbleTip.style.display = 'inline';
    } else {
      bubbleCollect.classList.remove('collected');
      bubbleCollect.textContent = '❤️ 收藏';
      bubbleTip.style.display = 'none';
    }
    updateStatsUI();
  });

  document.addEventListener('click', (e) => {
    if (
      !bubbleDialog.contains(e.target as Node) &&
      !(e.target as HTMLElement).closest('#canvas') &&
      !(e.target as HTMLElement).closest('#wish-input-wrap') &&
      !(e.target as HTMLElement).closest('#wish-btn')
    ) {
      hideBubble();
    }
  });

  requestAnimationFrame((t) => {
    lastTime = t;
    lastFpsCheck = t;
    frame(t);
  });
}

init();
