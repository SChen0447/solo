import {
  CharacterStateData,
  CharacterState,
  getHitBox,
  getStateInterpolation,
} from './stateMachine';
import {
  CombatState,
  ComboEntry,
  FloatingDamage,
  getDamageColor,
  getDamageMultiplier,
} from './combatEngine';

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getStateOffsetY(state: CharacterState, progress: number): number {
  const t = easeInOutQuad(progress);
  switch (state) {
    case 'attacking':
      return -5 * Math.sin(t * Math.PI);
    case 'hit':
      return 3 * Math.sin(t * Math.PI);
    case 'knockedDown':
      return 10;
    case 'gettingUp':
      return lerp(10, 0, t);
    default:
      return 0;
  }
}

function getStateOffsetX(state: CharacterState, progress: number, facing: 1 | -1): number {
  const t = easeInOutQuad(progress);
  switch (state) {
    case 'attacking':
      return 25 * t * facing;
    case 'hit':
      return -10 * Math.sin(t * Math.PI) * facing;
    default:
      return 0;
  }
}

function getStateRotation(state: CharacterState, progress: number, facing: 1 | -1): number {
  const t = easeInOutQuad(progress);
  switch (state) {
    case 'attacking':
      return (-15 * t * Math.PI) / 180 * facing;
    case 'hit':
      return (10 * Math.sin(t * Math.PI) * Math.PI) / 180 * facing;
    case 'knockedDown':
      return (-90 * Math.PI) / 180 * facing;
    case 'gettingUp':
      return lerp((-90 * Math.PI) / 180 * facing, 0, easeInOutQuad(progress));
    default:
      return 0;
  }
}

function resizeCanvas(canvas: HTMLCanvasElement): void {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.scale(dpr, dpr);
}

export function setupCanvases(
  mainCanvas: HTMLCanvasElement,
  frameCanvas: HTMLCanvasElement,
  curveCanvas: HTMLCanvasElement
): void {
  resizeCanvas(mainCanvas);
  resizeCanvas(frameCanvas);
  resizeCanvas(curveCanvas);
}

function drawCharacter(
  ctx: CanvasRenderingContext2D,
  char: CharacterStateData,
  playerNum: 1 | 2,
  scale: number = 1
): void {
  const progress = getStateInterpolation(char);
  const state = char.state;
  const offsetY = getStateOffsetY(state, progress);
  const offsetX = getStateOffsetX(state, progress, char.facing);
  const rotation = getStateRotation(state, progress, char.facing);

  const baseX = char.x + offsetX;
  const baseY = char.y + offsetY;

  const isFlashing = char.hitFlashTimer > 0 && char.hitFlashTimer % 2 === 0;
  const isBlocking = char.blockFlashTimer > 0;

  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.rotate(rotation);
  ctx.scale(char.facing, 1);

  const bodyColor = playerNum === 1 ? '#e74c3c' : '#3498db';
  const bodyDark = playerNum === 1 ? '#c0392b' : '#2980b9';
  const outlineColor = playerNum === 1 ? '#922b21' : '#1a5276';

  if (isBlocking) {
    ctx.shadowColor = '#3498db';
    ctx.shadowBlur = 20;
  }

  if (state === 'knockedDown' || state === 'gettingUp') {
    ctx.fillStyle = isFlashing ? '#ffffff' : bodyColor;
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-50, -40, 100, 40, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isFlashing ? '#ffffff' : bodyDark;
    ctx.beginPath();
    ctx.arc(40, -20, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (playerNum === 1) {
      ctx.fillStyle = isFlashing ? '#ffffff' : '#8b4513';
      ctx.beginPath();
      ctx.arc(-35, -35, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.strokeStyle = isFlashing ? '#ffffff' : '#bdc3c7';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-40, -10);
      ctx.lineTo(-65, -30);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = isFlashing ? '#ffffff' : bodyColor;
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.roundRect(-20, -85, 40, 60, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isFlashing ? '#ffffff' : bodyDark;
    ctx.beginPath();
    ctx.arc(0, -100, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(6, -103, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(7, -103, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isFlashing ? '#ffffff' : bodyDark;
    ctx.lineWidth = 4;

    if (state === 'attacking') {
      const atkT = easeInOutQuad(progress);
      ctx.beginPath();
      ctx.moveTo(15, -75);
      ctx.lineTo(lerp(25, 55, atkT), lerp(-65, -45, atkT));
      ctx.stroke();

      if (playerNum === 1) {
        ctx.fillStyle = isFlashing ? '#ffffff' : '#8b4513';
        ctx.beginPath();
        ctx.arc(lerp(25, 55, atkT), lerp(-65, -45, atkT), 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.strokeStyle = isFlashing ? '#ffffff' : '#bdc3c7';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(lerp(25, 55, atkT), lerp(-65, -45, atkT));
        ctx.lineTo(lerp(45, 85, atkT), lerp(-75, -55, atkT));
        ctx.stroke();
      }

      ctx.strokeStyle = isFlashing ? '#ffffff' : bodyDark;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-15, -75);
      ctx.lineTo(-30, -50);
      ctx.stroke();
    } else if (state === 'hit') {
      const hitT = Math.sin(easeInOutQuad(progress) * Math.PI);
      ctx.beginPath();
      ctx.moveTo(15, -75);
      ctx.lineTo(25 + 15 * hitT, -65 + 20 * hitT);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-15, -75);
      ctx.lineTo(-25 - 15 * hitT, -65 + 20 * hitT);
      ctx.stroke();
    } else if (char.isDefending) {
      ctx.beginPath();
      ctx.moveTo(15, -75);
      ctx.lineTo(35, -80);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-15, -75);
      ctx.lineTo(-35, -80);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(15, -75);
      ctx.lineTo(25, -55);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-15, -75);
      ctx.lineTo(-25, -55);
      ctx.stroke();

      if (playerNum === 1) {
        ctx.fillStyle = isFlashing ? '#ffffff' : '#8b4513';
        ctx.beginPath();
        ctx.arc(25, -55, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-25, -55, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.strokeStyle = isFlashing ? '#ffffff' : '#bdc3c7';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-25, -55);
        ctx.lineTo(-35, -70);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = isFlashing ? '#ffffff' : bodyDark;
    ctx.lineWidth = 4;
    if (state === 'attacking') {
      const atkT = easeInOutQuad(progress);
      ctx.beginPath();
      ctx.moveTo(-10, -25);
      ctx.lineTo(lerp(-15, -25, atkT), 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(10, -25);
      ctx.lineTo(lerp(15, 25, atkT), 0);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-10, -25);
      ctx.lineTo(-12, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(10, -25);
      ctx.lineTo(12, 0);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawHitBox(
  ctx: CanvasRenderingContext2D,
  char: CharacterStateData
): void {
  const box = getHitBox(char);
  const isFlashing = char.hitBoxFlashTimer > 0;

  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = isFlashing ? '#e74c3c' : '#2ecc71';
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = isFlashing ? '#c0392b' : '#27ae60';
  ctx.lineWidth = 2;
  ctx.strokeRect(box.x, box.y, box.w, box.h);
  ctx.restore();
}

function drawFloatingDamage(
  ctx: CanvasRenderingContext2D,
  fd: FloatingDamage,
  baseDamage: number
): void {
  ctx.save();
  ctx.globalAlpha = fd.opacity;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const color = getDamageColor(fd.damage, baseDamage);
  ctx.fillStyle = color;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.strokeText(`-${fd.damage}`, fd.x, fd.y);
  ctx.fillText(`-${fd.damage}`, fd.x, fd.y);
  ctx.restore();
}

function drawArenaBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): void {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#f0f0f0');
  grad.addColorStop(0.7, '#e0e0e0');
  grad.addColorStop(1, '#d0d0d0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(0, h - 40, w, 40);

  ctx.strokeStyle = '#b0b0b0';
  ctx.lineWidth = 2;
  for (let i = 0; i < w; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, h - 40);
    ctx.lineTo(i, h);
    ctx.stroke();
  }

  ctx.strokeStyle = '#999';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 40, w - 40, h - 80);
}

function drawComboList(
  listEl: HTMLElement,
  combo: ComboEntry[],
  terminated: boolean,
  terminatedTimer: number
): void {
  listEl.innerHTML = '';

  if (terminated) {
    const div = document.createElement('div');
    div.className = 'combo-terminated';
    if (terminatedTimer < 15) div.classList.add('fade');
    div.textContent = '连击终止';
    listEl.appendChild(div);
    return;
  }

  combo.forEach((entry, idx) => {
    const div = document.createElement('div');
    div.className = `combo-entry ${idx % 2 === 0 ? 'alt' : 'white'}`;
    div.innerHTML = `
      <span>第${entry.hitNumber}击</span>
      <span>${entry.damage}伤害</span>
      <span>帧${entry.hitFrame}(${entry.hitWindow})</span>
    `;
    listEl.appendChild(div);
  });
}

export function renderMain(
  mainCanvas: HTMLCanvasElement,
  state: CombatState,
  p1ComboList: HTMLElement,
  p2ComboList: HTMLElement
): void {
  const ctx = mainCanvas.getContext('2d');
  if (!ctx) return;

  const rect = mainCanvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;

  drawArenaBackground(ctx, w, h);

  const groundY = h - 40;
  state.p1.y = groundY;
  state.p2.y = groundY;
  state.p1.x = w * 0.3;
  state.p2.x = w * 0.7;

  drawHitBox(ctx, state.p1);
  drawHitBox(ctx, state.p2);

  drawCharacter(ctx, state.p1, 1);
  drawCharacter(ctx, state.p2, 2);

  const avgBaseDamage = (state.p1.config.baseDamage + state.p2.config.baseDamage) / 2;
  state.floatingDamages.forEach((fd) => {
    drawFloatingDamage(ctx, fd, avgBaseDamage);
  });

  drawComboList(p1ComboList, state.p1Combo, state.p1ComboTerminated, state.p1ComboTerminatedTimer);
  drawComboList(p2ComboList, state.p2Combo, state.p2ComboTerminated, state.p2ComboTerminatedTimer);
}

export function renderFramePreview(
  frameCanvas: HTMLCanvasElement,
  state: CombatState
): void {
  const ctx = frameCanvas.getContext('2d');
  if (!ctx) return;

  const rect = frameCanvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(0, 0, w, h);

  const activeChar = state.p1.state === 'attacking'
    ? state.p1
    : state.p2.state === 'attacking'
    ? state.p2
    : state.p1;

  const totalFrames = Math.max(activeChar.config.attackFrames, 30);
  const frameWidth = Math.min(40, (w - 40) / totalFrames);
  const startX = 20;
  const frameY = 15;
  const frameH = h - 30;

  const { hitWindowStart, hitWindowEnd } = activeChar.config;
  ctx.fillStyle = 'rgba(231, 76, 60, 0.4)';
  ctx.fillRect(
    startX + hitWindowStart * frameWidth,
    frameY,
    (hitWindowEnd - hitWindowStart + 1) * frameWidth,
    frameH
  );

  for (let i = 0; i < totalFrames; i++) {
    const fx = startX + i * frameWidth;
    const isCurrentFrame = activeChar.state === 'attacking' && i === activeChar.frameInState;

    ctx.fillStyle = isCurrentFrame ? 'rgba(241, 196, 15, 0.6)' : 'rgba(255,255,255,0.15)';
    ctx.fillRect(fx + 2, frameY + 2, frameWidth - 4, frameH - 4);

    if (isCurrentFrame) {
      ctx.strokeStyle = '#f1c40f';
      ctx.lineWidth = 3;
      ctx.strokeRect(fx + 1, frameY + 1, frameWidth - 2, frameH - 2);
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(fx + 2, frameY + 2, frameWidth - 4, frameH - 4);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${i}`, fx + frameWidth / 2, h - 3);
  }

  ctx.fillStyle = '#e74c3c';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`命中窗口: ${hitWindowStart}-${hitWindowEnd}帧`, startX, 12);
}

export function renderDamageCurve(
  curveCanvas: HTMLCanvasElement,
  state: CombatState,
  draggingIndex: number | null
): { x: number; y: number; w: number; h: number } {
  const ctx = curveCanvas.getContext('2d');
  if (!ctx) return { x: 0, y: 0, w: 0, h: 0 };

  const rect = curveCanvas.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;

  ctx.clearRect(0, 0, w, h);

  const padLeft = 35;
  const padRight = 15;
  const padTop = 15;
  const padBottom = 25;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;

  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = padTop + (chartH * i) / 5;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(padLeft + chartW, y);
    ctx.stroke();

    const value = 1.0 - i * 0.14;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(value.toFixed(1), padLeft - 5, y + 3);
  }

  for (let i = 0; i <= 4; i++) {
    const x = padLeft + (chartW * i) / 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.moveTo(x, padTop);
    ctx.lineTo(x, padTop + chartH);
    ctx.stroke();

    const hitCount = 1 + i * 5;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${hitCount}`, x, padTop + chartH + 15);
  }

  const gradient = ctx.createLinearGradient(padLeft, 0, padLeft + chartW, 0);
  gradient.addColorStop(0, '#e74c3c');
  gradient.addColorStop(0.5, '#9b59b6');
  gradient.addColorStop(1, '#8e44ad');

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2.5;
  ctx.beginPath();

  for (let hit = 1; hit <= 20; hit++) {
    const x = padLeft + ((hit - 1) / 19) * chartW;
    const mult = getDamageMultiplier(state, hit);
    const y = padTop + (1 - (mult - 0.3) / 0.7) * chartH;

    if (hit === 1) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  state.curveControlPoints.forEach((point, idx) => {
    const x = padLeft + ((point.hitCount - 1) / 19) * chartW;
    const y = padTop + (1 - (point.multiplier - 0.3) / 0.7) * chartH;
    const isDragging = draggingIndex === idx;
    const radius = isDragging ? 9 : 7;

    ctx.beginPath();
    ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#9b59b6';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (isDragging) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(point.multiplier.toFixed(2), x, y - 15);
    }
  });

  return { x: padLeft, y: padTop, w: chartW, h: chartH };
}

export function updateDamageBars(
  p1Bar: HTMLElement,
  p2Bar: HTMLElement,
  p1Val: HTMLElement,
  p2Val: HTMLElement,
  state: CombatState
): void {
  const maxDamage = Math.max(1, state.p1DamageTotal, state.p2DamageTotal, 100);
  const p1Pct = (state.p1DamageTotal / maxDamage) * 100;
  const p2Pct = (state.p2DamageTotal / maxDamage) * 100;

  p1Bar.style.width = `${p1Pct}%`;
  p2Bar.style.width = `${p2Pct}%`;
  p1Val.textContent = `${state.p1DamageTotal}`;
  p2Val.textContent = `${state.p2DamageTotal}`;
}

export function updateTimer(timerEl: HTMLElement, seconds: number): void {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  timerEl.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function showResultPanel(
  overlay: HTMLElement,
  panel: HTMLElement,
  title: HTMLElement,
  totalCombosEl: HTMLElement,
  maxComboEl: HTMLElement,
  totalDamageEl: HTMLElement,
  state: CombatState
): void {
  overlay.classList.add('show');

  if (state.winner === 1) {
    panel.classList.remove('p2-win');
    panel.classList.add('p1-win');
    title.textContent = '玩家1 胜利!';
  } else {
    panel.classList.remove('p1-win');
    panel.classList.add('p2-win');
    title.textContent = '玩家2 胜利!';
  }

  const winnerTotalCombos = state.winner === 1 ? state.p1TotalCombos : state.p2TotalCombos;
  const winnerMaxCombo = state.winner === 1 ? state.p1MaxCombo : state.p2MaxCombo;
  const winnerDamage = state.winner === 1 ? state.p1DamageTotal : state.p2DamageTotal;

  totalCombosEl.textContent = `${winnerTotalCombos}`;
  maxComboEl.textContent = `${winnerMaxCombo}`;
  totalDamageEl.textContent = `${winnerDamage}`;
}

export function hideResultPanel(overlay: HTMLElement): void {
  overlay.classList.remove('show');
}
