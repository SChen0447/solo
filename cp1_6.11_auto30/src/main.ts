import { Wheel, SECTORS } from './wheel';
import { ParticleSystem } from './particle';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const countValueEl = document.getElementById('count-value')!;
const noChancesEl = document.getElementById('no-chances')!;
const prizeModal = document.getElementById('prize-modal')!;
const prizeNameEl = document.getElementById('prize-name')!;
const btnReplay = document.getElementById('btn-replay')!;
const historyList = document.getElementById('history-list')!;

let remainingChances = 5;
let wheel: Wheel;
let particles: ParticleSystem;
const history: { label: string; time: string }[] = [];

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const maxR = Math.min(window.innerWidth * 0.38, window.innerHeight * 0.32);

  if (!wheel) {
    wheel = new Wheel(cx, cy, maxR);
  } else {
    wheel.x = cx;
    wheel.y = cy;
    wheel.radius = maxR;
  }
}

resize();
window.addEventListener('resize', resize);

particles = new ParticleSystem();

function updateCounter() {
  countValueEl.textContent = String(remainingChances);
  if (remainingChances <= 0) {
    noChancesEl.style.display = 'block';
  } else {
    noChancesEl.style.display = 'none';
  }
}

function showPrize(sectorIndex: number) {
  const prize = SECTORS[sectorIndex];
  prizeNameEl.textContent = prize.label;
  prizeModal.style.display = 'block';
  prizeModal.style.animation = 'none';
  void prizeModal.offsetHeight;
  prizeModal.style.animation = 'modalIn 0.3s ease-out';

  const tip = wheel.getPointerTip();
  particles.burst(tip.x, tip.y);

  addHistory(prize.label);
}

function addHistory(label: string) {
  const now = new Date();
  const time = now.getHours().toString().padStart(2, '0') + ':' +
    now.getMinutes().toString().padStart(2, '0') + ':' +
    now.getSeconds().toString().padStart(2, '0');
  history.unshift({ label, time });
  if (history.length > 10) history.pop();
  renderHistory();
}

function renderHistory() {
  historyList.innerHTML = '';
  history.forEach((item, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span style="color:#ff00ff">⟐</span> ${item.label}<span class="time">${item.time}</span>`;
    li.style.animationDelay = `${i * 0.3}s`;
    historyList.appendChild(li);
  });
}

function handleCanvasClick(e: MouseEvent | TouchEvent) {
  if (wheel.isSpinning || remainingChances <= 0) return;

  let clientX: number, clientY: number;
  if ('touches' in e) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }

  const rect = canvas.getBoundingClientRect();
  const px = clientX - rect.left;
  const py = clientY - rect.top;

  if (wheel.isInsideGoButton(px, py)) {
    remainingChances--;
    updateCounter();
    wheel.spin((sectorIndex) => {
      showPrize(sectorIndex);
    });
  }
}

canvas.addEventListener('click', handleCanvasClick);
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  handleCanvasClick(e);
}, { passive: false });

btnReplay.addEventListener('click', () => {
  prizeModal.style.display = 'none';
});

function drawBackground(now: number) {
  const w = window.innerWidth;
  const h = window.innerHeight;

  ctx.fillStyle = 'rgba(5, 0, 20, 0.3)';
  ctx.fillRect(0, 0, w, h);

  const scanY = (now / 30) % h;
  ctx.strokeStyle = 'rgba(0, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, scanY);
  ctx.lineTo(w, scanY);
  ctx.stroke();

  const scanX = (now / 50) % w;
  ctx.strokeStyle = 'rgba(255, 0, 255, 0.03)';
  ctx.beginPath();
  ctx.moveTo(scanX, 0);
  ctx.lineTo(scanX, h);
  ctx.stroke();
}

function loop(now: number) {
  drawBackground(now);

  wheel.update(now);
  wheel.draw(ctx);

  particles.update(now);
  particles.draw(ctx);

  requestAnimationFrame(loop);
}

updateCounter();
requestAnimationFrame(loop);
