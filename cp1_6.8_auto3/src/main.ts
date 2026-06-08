import { Game } from './game';
import { GameState, Difficulty, GameStats } from './types';

let game: Game;
let currentDifficulty: Difficulty = 'normal';

function init(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  game = new Game(canvas);
  game.setDifficulty(currentDifficulty);
  game.setupDemo(120, 60);

  setupGameCallbacks();
  setupUIEventListeners();
  setupInputListeners();
  setupResizeListener();

  updateLivesDisplay();
}

function setupGameCallbacks(): void {
  game.setOnStateChange((state: GameState) => {
    handleStateChange(state);
  });

  game.setOnStatsUpdate((stats: GameStats) => {
    updateHUD(stats);
  });

  game.setOnBPMUpdate((bpm: number, progress: number) => {
    updateBPMDisplay(bpm, progress);
  });
}

function handleStateChange(state: GameState): void {
  const mainMenu = document.getElementById('main-menu');
  const pauseScreen = document.getElementById('pause-screen');
  const gameoverScreen = document.getElementById('gameover-screen');
  const hud = document.getElementById('hud');
  const loadingScreen = document.getElementById('loading-screen');
  const touchControls = document.getElementById('touch-controls');

  const hideAll = () => {
    mainMenu?.classList.add('hidden');
    pauseScreen?.classList.add('hidden');
    gameoverScreen?.classList.add('hidden');
    hud?.classList.add('hidden');
    loadingScreen?.classList.add('hidden');
    touchControls?.classList.remove('visible');
  };

  hideAll();

  switch (state) {
    case 'menu':
      mainMenu?.classList.remove('hidden');
      break;
    case 'playing':
      hud?.classList.remove('hidden');
      if (window.innerWidth < 768) {
        touchControls?.classList.add('visible');
      }
      break;
    case 'paused':
      hud?.classList.remove('hidden');
      pauseScreen?.classList.remove('hidden');
      break;
    case 'gameover':
      gameoverScreen?.classList.remove('hidden');
      showGameOverStats();
      break;
  }
}

function setupUIEventListeners(): void {
  const startBtn = document.getElementById('start-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const resumeBtn = document.getElementById('resume-btn');
  const menuBtn = document.getElementById('menu-btn');
  const retryBtn = document.getElementById('retry-btn');
  const gameoverMenuBtn = document.getElementById('gameover-menu-btn');
  const leaderboardBtn = document.getElementById('leaderboard-btn');
  const musicUpload = document.getElementById('music-upload') as HTMLInputElement;
  const musicName = document.getElementById('music-name');

  const diffBtns = document.querySelectorAll('.diff-btn');
  diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const difficulty = btn.getAttribute('data-difficulty') as Difficulty;
      if (difficulty) {
        setDifficulty(difficulty);
        diffBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
    });
  });

  startBtn?.addEventListener('click', () => {
    startGame();
  });

  pauseBtn?.addEventListener('click', () => {
    game.pause();
  });

  resumeBtn?.addEventListener('click', () => {
    game.resume();
  });

  menuBtn?.addEventListener('click', () => {
    goToMenu();
  });

  retryBtn?.addEventListener('click', () => {
    startGame();
  });

  gameoverMenuBtn?.addEventListener('click', () => {
    goToMenu();
  });

  leaderboardBtn?.addEventListener('click', () => {
    toggleLeaderboard();
  });

  musicUpload?.addEventListener('change', async (e) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      if (musicName) {
        musicName.textContent = file.name;
      }
      await loadMusicFile(file);
    }
  });
}

function setupInputListeners(): void {
  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;

    switch (e.code) {
      case 'Space':
      case 'ArrowUp':
        e.preventDefault();
        game.jump();
        break;
      case 'ArrowDown':
        e.preventDefault();
        game.slide();
        break;
      case 'Escape':
      case 'KeyP':
        e.preventDefault();
        if (game.getState() === 'playing') {
          game.pause();
        } else if (game.getState() === 'paused') {
          game.resume();
        }
        break;
    }
  });

  const canvas = document.getElementById('game-canvas');
  canvas?.addEventListener('click', () => {
    if (game.getState() === 'playing') {
      game.jump();
    }
  });

  const touchLeft = document.getElementById('touch-left');
  const touchRight = document.getElementById('touch-right');

  touchRight?.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (game.getState() === 'playing') {
      game.jump();
    }
  }, { passive: false });

  touchLeft?.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (game.getState() === 'playing') {
      game.slide();
    }
  }, { passive: false });
}

function setupResizeListener(): void {
  let resizeTimeout: number;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(() => {
      game.resize();
      const touchControls = document.getElementById('touch-controls');
      if (window.innerWidth < 768 && game.getState() === 'playing') {
        touchControls?.classList.add('visible');
      } else {
        touchControls?.classList.remove('visible');
      }
    }, 100);
  });
}

function setDifficulty(difficulty: Difficulty): void {
  currentDifficulty = difficulty;
  game.setDifficulty(difficulty);
}

async function loadMusicFile(file: File): Promise<void> {
  const loadingScreen = document.getElementById('loading-screen');
  const loadingText = document.getElementById('loading-text');

  loadingScreen?.classList.remove('hidden');
  if (loadingText) {
    loadingText.textContent = '正在分析音乐节拍...';
  }

  try {
    const result = await game.loadAudioFile(file);
    console.log(`BPM: ${result.bpm}, Duration: ${result.duration.toFixed(2)}s`);
  } catch (error) {
    console.error('Failed to load audio:', error);
    alert('加载音频失败，请尝试其他文件');
  } finally {
    loadingScreen?.classList.add('hidden');
  }
}

function startGame(): void {
  game.start();
}

function goToMenu(): void {
  game.getBPMAnalyzer().stop();
  handleStateChange('menu');
}

function showGameOverStats(): void {
  const stats = game.getStats();
  const scores = Game.getHighScores();
  const highScore = scores.length > 0 ? scores[0].score : 0;

  const finalScoreEl = document.getElementById('final-score');
  const highScoreEl = document.getElementById('high-score');
  const perfectEl = document.getElementById('stat-perfect');
  const goodEl = document.getElementById('stat-good');
  const missEl = document.getElementById('stat-miss');
  const maxComboEl = document.getElementById('stat-max-combo');

  if (finalScoreEl) finalScoreEl.textContent = stats.score.toLocaleString();
  if (highScoreEl) highScoreEl.textContent = Math.max(highScore, stats.score).toLocaleString();
  if (perfectEl) perfectEl.textContent = stats.perfect.toString();
  if (goodEl) goodEl.textContent = stats.good.toString();
  if (missEl) missEl.textContent = stats.miss.toString();
  if (maxComboEl) maxComboEl.textContent = stats.maxCombo.toString();
}

function toggleLeaderboard(): void {
  const scores = Game.getHighScores();
  const menu = document.getElementById('main-menu');
  const existing = document.querySelector('.menu-leaderboard');

  if (existing) {
    existing.remove();
    return;
  }

  if (menu) {
    const div = document.createElement('div');
    div.className = 'menu-leaderboard';

    let html = '<div class="leaderboard" style="margin-top:1rem;"><div class="leaderboard-title">🏆 排行榜</div>';

    if (scores.length === 0) {
      html += '<div style="text-align:center;color:#666;font-size:0.85rem;padding:10px 0;">暂无记录</div>';
    } else {
      for (let i = 0; i < scores.length; i++) {
        html += `
          <div class="leaderboard-item">
            <span class="leaderboard-rank">#${i + 1}</span>
            <span class="leaderboard-score">${scores[i].score.toLocaleString()}</span>
            <span class="leaderboard-date">${scores[i].date}</span>
          </div>
        `;
      }
    }

    html += '</div>';
    div.innerHTML = html;
    menu.appendChild(div);
  }
}

function updateHUD(stats: GameStats): void {
  const scoreEl = document.getElementById('hud-score');
  const comboEl = document.getElementById('hud-combo');

  if (scoreEl) {
    scoreEl.textContent = stats.score.toLocaleString();
  }

  if (comboEl) {
    comboEl.textContent = `Combo: ${stats.combo}`;
  }

  updateLivesDisplay(stats.lives);
}

function updateLivesDisplay(lives?: number): void {
  const livesContainer = document.getElementById('hud-lives');
  if (!livesContainer) return;

  const displayLives = lives ?? 3;
  const currentHearts = livesContainer.children.length;

  if (currentHearts !== displayLives && displayLives > 0) {
    livesContainer.innerHTML = '';
    for (let i = 0; i < displayLives; i++) {
      const heart = document.createElement('span');
      heart.innerHTML = `
        <svg class="heart" viewBox="0 0 24 24">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      `;
      livesContainer.appendChild(heart);
    }
  }

  const hearts = livesContainer.querySelectorAll('.heart');
  hearts.forEach((heart, index) => {
    if (index < displayLives) {
      heart.classList.remove('lost');
    } else {
      heart.classList.add('lost');
    }
  });
}

function updateBPMDisplay(bpm: number, progress: number): void {
  const bpmValueEl = document.getElementById('hud-bpm-value');
  const progressBarEl = document.getElementById('progress-bar');

  if (bpmValueEl) {
    bpmValueEl.textContent = Math.round(bpm).toString();
  }

  if (progressBarEl) {
    progressBarEl.style.width = `${Math.min(100, progress)}%`;
  }
}

document.addEventListener('DOMContentLoaded', init);
