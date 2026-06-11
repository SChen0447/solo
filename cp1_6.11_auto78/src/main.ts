import { GameManager, RatingResult } from './GameManager.js';

const forgeCanvas = document.getElementById('forgeCanvas') as HTMLCanvasElement;
const productCanvas = document.getElementById('productCanvas') as HTMLCanvasElement;
const tempValueEl = document.getElementById('tempValue') as HTMLElement;
const tempFillEl = document.getElementById('tempFill') as HTMLElement;
const hammerCountEl = document.getElementById('hammerCount') as HTMLElement;
const btnBellows = document.getElementById('btnBellows') as HTMLButtonElement;
const btnHammer = document.getElementById('btnHammer') as HTMLButtonElement;
const btnTongs = document.getElementById('btnTongs') as HTMLButtonElement;
const btnReset = document.getElementById('btnReset') as HTMLButtonElement;
const quenchTub = document.getElementById('quenchTub') as HTMLDivElement;
const canvasHint = document.getElementById('canvasHint') as HTMLElement;
const ratingSection = document.getElementById('ratingSection') as HTMLDivElement;
const starsDisplay = document.getElementById('starsDisplay') as HTMLDivElement;
const statsList = document.getElementById('statsList') as HTMLDivElement;
const craftsmanComment = document.getElementById('craftsmanComment') as HTMLDivElement;
const emptyHint = document.getElementById('emptyHint') as HTMLDivElement;
const canvasWrapper = forgeCanvas.parentElement!;

let tongsMode = false;
let lastRated = false;

const game = new GameManager(forgeCanvas, productCanvas, updateUI);

function updateUI(): void {
  const temp = Math.round(game.temperature);
  tempValueEl.textContent = String(temp);
  tempFillEl.style.width = `${temp}%`;
  hammerCountEl.textContent = String(game.hammerStrokes);

  btnHammer.disabled = !game.canForge;
  btnTongs.disabled = !game.canQuench;

  if (game.canForge && !btnHammer.classList.contains('active')) {
    btnHammer.querySelector('.tool-hint')!.textContent = '[点击铁坯]';
  } else if (!game.canForge) {
    btnHammer.querySelector('.tool-hint')!.textContent = '[温度需>50]';
  }

  if (game.canQuench && !btnTongs.classList.contains('active')) {
    btnTongs.querySelector('.tool-hint')!.textContent = '[拖拽铁坯]';
  } else if (!game.canQuench) {
    btnTongs.querySelector('.tool-hint')!.textContent = '[温度需>40]';
  }

  if (game.finished && !lastRated) {
    lastRated = true;
    showRating(game.calculateRating());
  }

  if (!game.finished) {
    lastRated = false;
  }

  updateHint();
}

function updateHint(): void {
  const t = game.temperature;
  if (game.finished) {
    canvasHint.textContent = '✨ 锻造完成！成品已展示在右侧';
  } else if (t < 30) {
    canvasHint.textContent = '🔥 提示：点击风箱或按空格键鼓风升温';
  } else if (t < 50) {
    canvasHint.textContent = '🌡️ 继续鼓风，温度升高后可锻打';
  } else if (t < 70) {
    canvasHint.textContent = '🔨 温度适宜，点击铁坯进行锻打';
  } else {
    canvasHint.textContent = '⚡ 高温状态，注意火星！锻打后拖入淬火桶';
  }
}

function showRating(rating: RatingResult): void {
  ratingSection.style.display = 'block';
  emptyHint.style.display = 'none';

  const fullStars = Math.floor(rating.stars);
  const hasHalf = rating.stars - fullStars >= 0.25 && rating.stars - fullStars <= 0.75;
  const adjustedFull = hasHalf ? fullStars : (rating.stars - fullStars > 0.75 ? fullStars + 1 : fullStars);
  const emptyStars = 5 - adjustedFull - (hasHalf ? 1 : 0);

  let starsHTML = '';
  for (let i = 0; i < adjustedFull; i++) {
    starsHTML += `<span class="star star-full">★</span>`;
  }
  if (hasHalf) {
    starsHTML += `<span class="star star-half">★</span>`;
  }
  for (let i = 0; i < emptyStars; i++) {
    starsHTML += `<span class="star star-empty">★</span>`;
  }
  starsDisplay.innerHTML = starsHTML;

  const statLabels: Array<{ key: keyof typeof rating.stats; name: string; icon: string }> = [
    { key: 'hardness', name: '硬度', icon: '💎' },
    { key: 'toughness', name: '韧性', icon: '🌀' },
    { key: 'aesthetics', name: '美观度', icon: '✨' },
  ];
  statsList.innerHTML = statLabels.map(s => `
    <div class="stat-row">
      <span class="stat-name">${s.icon} ${s.name}</span>
      <div class="stat-value-bar">
        <div class="stat-value-fill" style="width:${rating.stats[s.key]}%"></div>
      </div>
    </div>
  `).join('');

  craftsmanComment.textContent = `「${rating.comment}」`;
}

function hideRating(): void {
  ratingSection.style.display = 'none';
  emptyHint.style.display = 'block';
  lastRated = false;
}

btnBellows.addEventListener('click', () => {
  game.onBlowAir();
  playClickAnim(btnBellows);
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault();
    game.onBlowAir();
    playClickAnim(btnBellows);
  }
});

forgeCanvas.addEventListener('click', (e) => {
  if (tongsMode) return;
  const rect = forgeCanvas.getBoundingClientRect();
  const scaleX = forgeCanvas.width / rect.width;
  const scaleY = forgeCanvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;
  if (game.canForge && game.isPointInsideIron(x, y)) {
    game.onHammer(x, y);
    playClickAnim(btnHammer);
  }
});

btnTongs.addEventListener('click', () => {
  if (!game.canQuench) return;
  tongsMode = !tongsMode;
  btnTongs.classList.toggle('active', tongsMode);
  forgeCanvas.style.cursor = tongsMode ? 'grab' : 'crosshair';
});

let draggingIron = false;

forgeCanvas.addEventListener('mousedown', (e) => {
  if (!tongsMode) return;
  const rect = forgeCanvas.getBoundingClientRect();
  const scaleX = forgeCanvas.width / rect.width;
  const scaleY = forgeCanvas.height / rect.height;
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;
  draggingIron = game.onStartDrag(x, y);
  if (draggingIron) {
    forgeCanvas.style.cursor = 'grabbing';
  }
});

document.addEventListener('mousemove', (e) => {
  if (!draggingIron) return;
  const rect = forgeCanvas.getBoundingClientRect();
  const scaleX = forgeCanvas.width / rect.width;
  const scaleY = forgeCanvas.height / rect.height;
  let x = (e.clientX - rect.left) * scaleX;
  let y = (e.clientY - rect.top) * scaleY;

  const tubRect = quenchTub.getBoundingClientRect();
  const wrapperRect = canvasWrapper.getBoundingClientRect();
  if (
    e.clientX >= tubRect.left && e.clientX <= tubRect.right &&
    e.clientY >= tubRect.top && e.clientY <= tubRect.bottom
  ) {
    const relX = tubRect.left + tubRect.width / 2 - wrapperRect.left;
    const relY = tubRect.top + tubRect.height / 2 - wrapperRect.top;
    x = relX * scaleX;
    y = relY * scaleY;
    quenchTub.classList.add('drag-over');
  } else {
    quenchTub.classList.remove('drag-over');
  }

  game.onDrag(x, y);
});

document.addEventListener('mouseup', () => {
  if (draggingIron) {
    const tubRect = quenchTub.getBoundingClientRect();
    const mouseAtTub =
      lastMouseX >= tubRect.left && lastMouseX <= tubRect.right &&
      lastMouseY >= tubRect.top && lastMouseY <= tubRect.bottom;

    const result = game.onEndDrag();
    if (mouseAtTub && game.canQuench) {
      triggerQuench();
    }
    draggingIron = false;
    forgeCanvas.style.cursor = tongsMode ? 'grab' : 'crosshair';
    quenchTub.classList.remove('drag-over');
  }
});

let lastMouseX = 0;
let lastMouseY = 0;
document.addEventListener('mousemove', (e) => {
  lastMouseX = e.clientX;
  lastMouseY = e.clientY;
});

quenchTub.addEventListener('click', () => {
  triggerQuench();
});

function triggerQuench(): void {
  if (!game.canQuench) return;
  game.triggerQuench(quenchTub.offsetLeft, quenchTub.offsetTop);
  tongsMode = false;
  btnTongs.classList.remove('active');
  forgeCanvas.style.cursor = 'crosshair';
  playClickAnim(btnTongs);
}

btnReset.addEventListener('click', () => {
  game.reset();
  hideRating();
  tongsMode = false;
  btnTongs.classList.remove('active');
  forgeCanvas.style.cursor = 'crosshair';
  playClickAnim(btnReset);
});

function playClickAnim(btn: HTMLElement): void {
  btn.style.transform = 'translateY(2px)';
  setTimeout(() => {
    btn.style.transform = '';
  }, 150);
}

game.run();
updateUI();
