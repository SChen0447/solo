import { ColorMatrix, ColorBlock, FilterType, getColorName } from './colorMatrix';
import { ColorChecker, ContrastResult } from './colorChecker';

export interface ScoreRecord {
  accuracy: number;
  avgTime: number;
  timestamp: number;
}

export interface AppState {
  gameActive: boolean;
  timeLeft: number;
  foundCount: number;
  totalClicks: number;
  correctClicks: number;
  scores: ScoreRecord[];
  currentFilter: FilterType;
  showLabels: boolean;
}

const STORAGE_KEY = 'color_perception_scores';
const GAME_DURATION = 30;

export class UIController {
  private colorMatrix: ColorMatrix;
  private colorChecker: ColorChecker;
  private state: AppState;
  private timerInterval: number | null = null;
  private resizeTimer: number | null = null;

  private $matrix!: HTMLElement;
  private $statsPanel!: HTMLElement;
  private $timerDisplay!: HTMLElement;
  private $foundCount!: HTMLElement;
  private $accuracyDisplay!: HTMLElement;
  private $historyList!: HTMLElement;
  private $startBtn!: HTMLElement;
  private $filterGroup!: HTMLElement;
  private $toggleLabelsBtn!: HTMLElement;
  private $colorInput!: HTMLInputElement;
  private $checkBtn!: HTMLElement;
  private $preview1!: HTMLElement;
  private $preview2!: HTMLElement;
  private $contrastResult!: HTMLElement;
  private $alternativesSection!: HTMLElement;
  private $alternativesGrid!: HTMLElement;

  constructor(colorMatrix: ColorMatrix, colorChecker: ColorChecker) {
    this.colorMatrix = colorMatrix;
    this.colorChecker = colorChecker;
    this.state = {
      gameActive: false,
      timeLeft: GAME_DURATION,
      foundCount: 0,
      totalClicks: 0,
      correctClicks: 0,
      scores: this.loadScores(),
      currentFilter: 'none',
      showLabels: false,
    };
  }

  public initLayout(): void {
    this.cacheDomReferences();
    this.renderHistory();
    this.renderMatrix();
    this.bindEvents();
    this.handleResize();
    requestAnimationFrame(() => {
      this.$statsPanel.classList.add('visible');
    });
  }

  private cacheDomReferences(): void {
    this.$matrix = document.getElementById('colorMatrix') as HTMLElement;
    this.$statsPanel = document.getElementById('statsPanel') as HTMLElement;
    this.$timerDisplay = document.getElementById('timerDisplay') as HTMLElement;
    this.$foundCount = document.getElementById('foundCount') as HTMLElement;
    this.$accuracyDisplay = document.getElementById('accuracyDisplay') as HTMLElement;
    this.$historyList = document.getElementById('historyList') as HTMLElement;
    this.$startBtn = document.getElementById('startBtn') as HTMLElement;
    this.$filterGroup = document.getElementById('filterGroup') as HTMLElement;
    this.$toggleLabelsBtn = document.getElementById('toggleLabelsBtn') as HTMLElement;
    this.$colorInput = document.getElementById('colorInput') as HTMLInputElement;
    this.$checkBtn = document.getElementById('checkBtn') as HTMLElement;
    this.$preview1 = document.getElementById('preview1') as HTMLElement;
    this.$preview2 = document.getElementById('preview2') as HTMLElement;
    this.$contrastResult = document.getElementById('contrastResult') as HTMLElement;
    this.$alternativesSection = document.getElementById('alternativesSection') as HTMLElement;
    this.$alternativesGrid = document.getElementById('alternativesGrid') as HTMLElement;
  }

  private bindEvents(): void {
    this.$startBtn.addEventListener('click', () => this.startGame());

    this.$filterGroup.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.dataset.filter) {
        this.setFilter(target.dataset.filter as FilterType);
      }
    });

    this.$toggleLabelsBtn.addEventListener('click', () => {
      this.state.showLabels = !this.state.showLabels;
      this.$matrix.classList.toggle('show-labels', this.state.showLabels);
      this.$toggleLabelsBtn.textContent = this.state.showLabels ? '隐藏颜色标注' : '显示颜色标注';
    });

    this.$matrix.addEventListener('click', (e: Event) => this.handleMatrixClick(e));

    this.$checkBtn.addEventListener('click', () => this.handleContrastCheck());

    this.$colorInput.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        this.handleContrastCheck();
      }
    });

    window.addEventListener('resize', () => {
      if (this.resizeTimer) {
        window.clearTimeout(this.resizeTimer);
      }
      this.resizeTimer = window.setTimeout(() => this.handleResize(), 100);
    });
  }

  public renderMatrix(): void {
    const blocks = this.colorMatrix.generateMatrix();
    const fragment = document.createDocumentFragment();

    blocks.forEach((block) => {
      const el = document.createElement('div');
      el.className = 'color-block';
      el.style.backgroundColor = `hsl(${block.hsl.h}, ${block.hsl.s}%, ${block.hsl.l}%)`;
      el.dataset.row = String(block.row);
      el.dataset.col = String(block.col);
      el.dataset.index = String(block.row * this.colorMatrix.cols + block.col);

      const glowColor = block.hex;
      el.style.setProperty('--glow-color', glowColor);

      const label = document.createElement('div');
      label.className = 'color-label';
      label.textContent = `${block.name} ${block.hex}`;
      el.appendChild(label);

      fragment.appendChild(el);
    });

    this.$matrix.innerHTML = '';
    this.$matrix.appendChild(fragment);

    if (this.state.showLabels) {
      this.$matrix.classList.add('show-labels');
    }

    this.colorMatrix.applyFilter(this.state.currentFilter, this.$matrix);
  }

  private handleMatrixClick(e: Event): void {
    const target = e.target as HTMLElement;
    const blockEl = target.closest('.color-block') as HTMLElement | null;
    if (!blockEl) return;

    if (!this.state.gameActive) {
      return;
    }

    const index = parseInt(blockEl.dataset.index || '-1', 10);
    if (index < 0) return;

    const block = this.colorMatrix.matrix[index];
    if (!block) return;

    this.state.totalClicks++;

    if (block.isTarget && !block.found) {
      block.found = true;
      this.state.correctClicks++;
      this.state.foundCount++;
      blockEl.classList.add('found');
      this.showRipple(blockEl);
      this.updateStats();

      if (this.state.foundCount >= this.colorMatrix.targetCount) {
        this.endGame();
      }
    } else if (!block.isTarget) {
      this.flashError(blockEl);
      this.state.timeLeft = Math.max(0, this.state.timeLeft - 1);
      this.updateStats();

      if (this.state.timeLeft <= 0) {
        this.endGame();
      }
    }

    this.updateAccuracy();
  }

  public showRipple(element: HTMLElement): void {
    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    element.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
  }

  public flashError(element: HTMLElement): void {
    element.classList.add('error');
    setTimeout(() => element.classList.remove('error'), 300);
  }

  private startGame(): void {
    this.state.gameActive = true;
    this.state.timeLeft = GAME_DURATION;
    this.state.foundCount = 0;
    this.state.totalClicks = 0;
    this.state.correctClicks = 0;

    this.renderMatrix();
    this.updateStats();
    this.updateAccuracy();
    this.$timerDisplay.classList.remove('warning');

    if (this.timerInterval) {
      window.clearInterval(this.timerInterval);
    }

    this.timerInterval = window.setInterval(() => {
      this.state.timeLeft--;
      this.updateStats();

      if (this.state.timeLeft <= 5) {
        this.$timerDisplay.classList.add('warning');
      }

      if (this.state.timeLeft <= 0) {
        this.endGame();
      }
    }, 1000);
  }

  private endGame(): void {
    if (this.timerInterval) {
      window.clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    this.state.gameActive = false;

    const accuracy = this.state.totalClicks > 0
      ? Math.round((this.state.correctClicks / this.state.totalClicks) * 100)
      : 0;

    const usedTime = GAME_DURATION - this.state.timeLeft;
    const avgTime = this.state.correctClicks > 0
      ? Math.round((usedTime / this.state.correctClicks) * 10) / 10
      : 0;

    this.saveScore(accuracy, avgTime);
    this.renderHistory();
  }

  private updateStats(): void {
    this.$timerDisplay.textContent = String(this.state.timeLeft);
    this.$foundCount.textContent = String(this.state.foundCount);
  }

  private updateAccuracy(): void {
    if (this.state.totalClicks > 0) {
      const acc = Math.round((this.state.correctClicks / this.state.totalClicks) * 100);
      this.$accuracyDisplay.textContent = `${acc}%`;
    } else {
      this.$accuracyDisplay.textContent = '--';
    }
  }

  private setFilter(type: FilterType): void {
    this.state.currentFilter = type;
    this.colorMatrix.applyFilter(type, this.$matrix);

    const buttons = this.$filterGroup.querySelectorAll('.filter-btn');
    buttons.forEach((btn) => {
      const el = btn as HTMLElement;
      el.classList.toggle('active', el.dataset.filter === type);
    });
  }

  private handleContrastCheck(): void {
    const raw = this.$colorInput.value.trim();
    const parts = raw.split(',').map(p => p.trim());
    if (parts.length !== 2) {
      this.$contrastResult.innerHTML = '<span style="color:#f85149">请输入两个颜色，用逗号分隔</span>';
      return;
    }

    const c1 = this.colorChecker.parseColor(parts[0]);
    const c2 = this.colorChecker.parseColor(parts[1]);

    if (!c1 || !c2) {
      this.$contrastResult.innerHTML = '<span style="color:#f85149">颜色格式无效，请使用 #RRGGBB 或标准颜色名称</span>';
      return;
    }

    this.$preview1.style.backgroundColor = c1;
    this.$preview2.style.backgroundColor = c2;
    this.$preview1.style.color = this.getTextColor(c1);
    this.$preview2.style.color = this.getTextColor(c2);
    this.$preview1.textContent = c1;
    this.$preview2.textContent = c2;

    const result = this.colorChecker.checkContrast(c1, c2);
    this.renderContrastResult(result);
  }

  private getTextColor(bgHex: string): string {
    const r = parseInt(bgHex.slice(1, 3), 16);
    const g = parseInt(bgHex.slice(3, 5), 16);
    const b = parseInt(bgHex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#0d1117' : '#f0f6fc';
  }

  private renderContrastResult(result: ContrastResult): void {
    const aaClass = result.passAA ? 'pass' : 'fail';
    const aaaClass = result.passAAA ? 'pass' : 'fail';

    let html = `
      <div class="contrast-ratio">${result.ratio.toFixed(2)} : 1</div>
      <div class="contrast-badges">
        <span class="badge ${aaClass}">WCAG AA ${result.passAA ? '✓ 通过' : '✗ 未达'}</span>
        <span class="badge ${aaaClass}">WCAG AAA ${result.passAAA ? '✓ 通过' : '✗ 未达'}</span>
      </div>
    `;

    if (!result.passAA) {
      html += '<div class="warning-text">⚠ 当前对比度不足</div>';
    }

    this.$contrastResult.innerHTML = html;

    if (result.alternatives.length > 0) {
      this.renderAlternatives(result.alternatives);
      this.$alternativesSection.style.display = 'block';
    } else {
      this.$alternativesSection.style.display = 'none';
    }
  }

  private renderAlternatives(alts: Array<{ color1: string; color2: string; ratio: number }>): void {
    this.$alternativesGrid.innerHTML = '';
    alts.forEach((alt) => {
      const item = document.createElement('div');
      item.className = 'alt-item';

      const swatches = document.createElement('div');
      swatches.className = 'alt-swatches';

      const s1 = document.createElement('div');
      s1.className = 'alt-swatch';
      s1.style.backgroundColor = alt.color1;

      const s2 = document.createElement('div');
      s2.className = 'alt-swatch';
      s2.style.backgroundColor = alt.color2;

      swatches.appendChild(s1);
      swatches.appendChild(s2);

      const ratio = document.createElement('div');
      ratio.className = 'alt-ratio';
      ratio.textContent = `${alt.ratio.toFixed(2)}:1 ${alt.color1} / ${alt.color2}`;

      item.appendChild(swatches);
      item.appendChild(ratio);

      item.addEventListener('click', () => {
        this.$colorInput.value = `${alt.color1}, ${alt.color2}`;
        this.handleContrastCheck();
      });

      this.$alternativesGrid.appendChild(item);
    });
  }

  private saveScore(accuracy: number, avgTime: number): void {
    this.state.scores.unshift({
      accuracy,
      avgTime,
      timestamp: Date.now(),
    });
    this.state.scores = this.state.scores.slice(0, 5);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state.scores));
    } catch (e) {
      // ignore storage errors
    }
  }

  private loadScores(): ScoreRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.slice(0, 5);
        }
      }
    } catch (e) {
      // ignore
    }
    return [];
  }

  private renderHistory(): void {
    if (this.state.scores.length === 0) {
      this.$historyList.innerHTML = '<div style="color:#6e7681;font-size:12px">暂无历史记录，开始游戏吧！</div>';
      return;
    }

    this.$historyList.innerHTML = '';
    this.state.scores.forEach((score, i) => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML = `
        <span style="color:#8b949e">#${i + 1}</span>
        <span class="history-acc">${score.accuracy}%</span>
        <span class="history-time">${score.avgTime}s/个</span>
      `;
      this.$historyList.appendChild(item);
    });
  }

  public handleResize(): void {
    // responsive adjustments handled via CSS media queries
    // this method can be extended for JS-based responsive logic if needed
  }
}
