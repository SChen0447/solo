import { CelestialBody, Aspect, ZODIAC_SIGNS, ASPECT_TYPES } from './types';

let infoPanelEl: HTMLElement | null = null;
let infoNameEl: HTMLElement | null = null;
let infoMythEl: HTMLElement | null = null;
let infoPositionEl: HTMLElement | null = null;
let aspectCanvasEl: HTMLCanvasElement | null = null;
let closeBtnEl: HTMLElement | null = null;
let prophecyScrollEl: HTMLElement | null = null;
let prophecyTextEl: HTMLElement | null = null;
let prophecySealEl: HTMLElement | null = null;
let drawChartBtnEl: HTMLElement | null = null;
let instructionsEl: HTMLElement | null = null;
let zodiacRingEl: HTMLElement | null = null;

let prophecyTimer: number | null = null;

export function initUI(): void {
  infoPanelEl = document.getElementById('info-panel');
  infoNameEl = document.getElementById('info-name');
  infoMythEl = document.getElementById('info-myth');
  infoPositionEl = document.getElementById('info-position');
  aspectCanvasEl = document.getElementById('aspect-canvas') as HTMLCanvasElement;
  closeBtnEl = document.querySelector('#info-panel .close-btn');
  prophecyScrollEl = document.getElementById('prophecy-scroll');
  prophecyTextEl = document.getElementById('prophecy-text');
  prophecySealEl = document.getElementById('prophecy-seal');
  drawChartBtnEl = document.getElementById('draw-chart-btn');
  instructionsEl = document.getElementById('instructions');
  zodiacRingEl = document.getElementById('zodiac-ring');

  if (closeBtnEl) {
    closeBtnEl.addEventListener('click', hideInfoPanel);
  }

  setTimeout(() => {
    if (instructionsEl) {
      instructionsEl.style.opacity = '0';
      setTimeout(() => {
        if (instructionsEl && instructionsEl.parentNode) {
          instructionsEl.parentNode.removeChild(instructionsEl);
        }
      }, 2000);
    }
  }, 5000);
}

export function createZodiacRing(): void {
  if (!zodiacRingEl) return;

  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const radius = Math.min(cx, cy) * 0.82;

  zodiacRingEl.innerHTML = '';

  for (let i = 0; i < ZODIAC_SIGNS.length; i++) {
    const sign = ZODIAC_SIGNS[i];
    const angle = (i * 30 - 90) * (Math.PI / 180);
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;

    const icon = document.createElement('span');
    icon.className = 'zodiac-icon';
    icon.textContent = sign.symbol;
    icon.style.left = `${x - 10}px`;
    icon.style.top = `${y - 10}px`;

    const tooltip = document.createElement('span');
    tooltip.className = 'zodiac-tooltip';
    tooltip.textContent = sign.name;
    tooltip.style.left = `${x + 15}px`;
    tooltip.style.top = `${y - 10}px`;

    zodiacRingEl.appendChild(icon);
    zodiacRingEl.appendChild(tooltip);
  }
}

export function showInfoPanel(body: CelestialBody, aspects: Aspect[]): void {
  if (!infoPanelEl || !infoNameEl || !infoMythEl || !infoPositionEl) return;

  infoNameEl.textContent = body.name;
  infoMythEl.textContent = body.mythology;

  const signIndex = Math.floor(body.longitude / 30) % 12;
  const degrees = body.longitude % 30;
  const sign = ZODIAC_SIGNS[signIndex];
  infoPositionEl.textContent = `${sign.name} ${degrees}°${body.latitude >= 0 ? '+' : ''}${body.latitude.toFixed(0)}'`;

  infoPanelEl.classList.add('open');

  drawAspectLines(body, aspects);
}

function drawAspectLines(body: CelestialBody, aspects: Aspect[]): void {
  if (!aspectCanvasEl) return;

  const ctx = aspectCanvasEl.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, 260, 80);

  const bodyAspects = aspects.filter(a => a.source.name === body.name || a.target.name === body.name);
  const count = Math.min(bodyAspects.length, 3);

  for (let i = 0; i < count; i++) {
    const aspect = bodyAspects[i];
    const y = 15 + i * 22;

    ctx.beginPath();
    ctx.moveTo(20, y);
    ctx.lineTo(100, y);
    ctx.strokeStyle = aspect.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(20, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = aspect.source.color || '#c9a84c';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(100, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = aspect.target.color || '#c9a84c';
    ctx.fill();

    ctx.fillStyle = '#3e2723';
    ctx.font = '12px KaiTi, STKaiti, serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${aspect.label} ${aspect.source.name} ↔ ${aspect.target.name}`, 110, y);
  }
}

export function hideInfoPanel(): void {
  if (infoPanelEl) {
    infoPanelEl.classList.remove('open');
  }
}

export function showProphecy(text: string): void {
  if (!prophecyScrollEl || !prophecyTextEl || !prophecySealEl) return;

  prophecyScrollEl.style.display = 'block';
  prophecyTextEl.textContent = '';
  prophecySealEl.classList.remove('visible');

  if (prophecyTimer) {
    clearInterval(prophecyTimer);
  }

  let charIndex = 0;
  prophecyTimer = window.setInterval(() => {
    if (charIndex < text.length) {
      prophecyTextEl.textContent += text[charIndex];
      charIndex++;
    } else {
      if (prophecyTimer) clearInterval(prophecyTimer);
      prophecyTimer = null;
      setTimeout(() => {
        if (prophecySealEl) prophecySealEl.classList.add('visible');
      }, 300);
    }
  }, 100);
}

export function getDrawChartBtn(): HTMLElement | null {
  return drawChartBtnEl;
}

export function updateZodiacRingRotation(rotation: number): void {
  if (zodiacRingEl) {
    zodiacRingEl.style.transform = `translate(-50%, -50%) rotate(${rotation}rad)`;
  }
}
