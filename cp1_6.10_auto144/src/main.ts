import { MemoryGrid } from './grid';
import { StatsPanel } from './stats';
import { SettingsManager, GameSettings } from './settings';

class MemoryGameApp {
  private app: HTMLElement;
  private gameArea: HTMLElement;
  private gridContainer: HTMLElement;
  private statsContainer: HTMLElement;
  private startBtn: HTMLButtonElement;
  private grid?: MemoryGrid;
  private stats?: StatsPanel;
  private settings?: SettingsManager;
  private round: number = 0;
  private isRoundActive: boolean = false;

  constructor() {
    this.app = document.getElementById('app') as HTMLElement;
    if (!this.app) throw new Error('App container not found');

    this.gameArea = this.createGameArea();
    this.gridContainer = this.createGridContainer();
    this.statsContainer = this.createStatsContainer();
    this.startBtn = this.createStartButton();

    this.gameArea.appendChild(this.gridContainer);
    this.gameArea.appendChild(this.startBtn);
    this.app.appendChild(this.gameArea);
    this.app.appendChild(this.statsContainer);

    this.initComponents();
    this.bindEvents();
  }

  private createGameArea(): HTMLElement {
    const el = document.createElement('div');
    el.style.flex = '1';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.position = 'relative';
    el.style.padding = '20px';
    return el;
  }

  private createGridContainer(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'grid-container';
    return el;
  }

  private createStatsContainer(): HTMLElement {
    const el = document.createElement('div');
    el.id = 'stats-panel';
    return el;
  }

  private createStartButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = '开始练习';
    btn.style.marginTop = '28px';
    btn.style.padding = '14px 48px';
    btn.style.fontSize = '18px';
    btn.style.fontWeight = '600';
    btn.style.color = '#fff';
    btn.style.backgroundColor = '#7c4dff';
    btn.style.border = 'none';
    btn.style.borderRadius = '10px';
    btn.style.cursor = 'pointer';
    btn.style.transition = 'all 0.2s ease';
    btn.style.boxShadow = '0 4px 20px #7c4dff40';
    btn.style.letterSpacing = '2px';

    const applyHover = () => {
      btn.style.backgroundColor = '#9a6dff';
      btn.style.transform = 'translateY(-2px)';
      btn.style.boxShadow = '0 6px 30px #7c4dff60';
    };
    const applyNormal = () => {
      btn.style.backgroundColor = '#7c4dff';
      btn.style.transform = '';
      btn.style.boxShadow = '0 4px 20px #7c4dff40';
    };
    const applyActive = () => {
      btn.style.transform = 'translateY(0) scale(0.98)';
    };

    btn.addEventListener('mouseenter', applyHover);
    btn.addEventListener('mouseleave', applyNormal);
    btn.addEventListener('mousedown', applyActive);
    btn.addEventListener('mouseup', applyHover);

    return btn;
  }

  private initComponents(): void {
    this.settings = new SettingsManager(this.gameArea);
    const settings: GameSettings = this.settings.getSettings();

    this.grid = new MemoryGrid(this.gridContainer, settings);
    this.stats = new StatsPanel(this.statsContainer);

    this.round = this.stats.getTotalRounds();

    this.settings.setOnChange((newSettings: GameSettings) => {
      this.grid?.updateConfig(newSettings);
    });

    this.grid.setOnComplete((correct: boolean, mistakes: number) => {
      this.handleRoundComplete(correct, mistakes);
    });
  }

  private bindEvents(): void {
    this.startBtn.addEventListener('click', () => this.startRound());

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !this.isRoundActive) {
        e.preventDefault();
        this.startRound();
      }
    });
  }

  private startRound(): void {
    if (this.isRoundActive || !this.grid || !this.stats) return;

    const phase = this.grid.getPhase();
    if (phase === 'showing' || phase === 'playing') return;

    this.isRoundActive = true;
    this.round++;
    this.stats.saveTotalRounds();
    this.stats.startRound(this.round);
    this.setButtonState('记住顺序...', false);

    setTimeout(() => {
      this.grid?.startRound();
      this.setButtonState('按顺序点击还原', false);
      this.waitForPlayingPhase();
    }, 100);
  }

  private waitForPlayingPhase(): void {
    if (!this.grid) return;
    const check = () => {
      const phase = this.grid!.getPhase();
      if (phase === 'playing') {
        this.setButtonState('游戏中...', false);
      } else if (phase === 'showing') {
        requestAnimationFrame(check);
      }
    };
    requestAnimationFrame(check);
  }

  private handleRoundComplete(correct: boolean, mistakes: number): void {
    if (!this.stats) return;
    this.stats.recordRound(correct, mistakes);
    this.isRoundActive = false;

    if (correct && mistakes === 0) {
      this.setButtonState('🎉 完美！再来一轮', true);
    } else if (correct) {
      this.setButtonState(`✓ 完成！失误 ${mistakes} 次，再来一轮`, true);
    } else {
      this.setButtonState('开始下一轮', true);
    }
  }

  private setButtonState(text: string, enabled: boolean): void {
    this.startBtn.textContent = text;
    this.startBtn.disabled = !enabled;
    if (!enabled) {
      this.startBtn.style.backgroundColor = '#444';
      this.startBtn.style.cursor = 'not-allowed';
      this.startBtn.style.boxShadow = 'none';
      this.startBtn.style.transform = '';
    } else {
      this.startBtn.style.backgroundColor = '#7c4dff';
      this.startBtn.style.cursor = 'pointer';
      this.startBtn.style.boxShadow = '0 4px 20px #7c4dff40';
    }
  }

  public destroy(): void {
    this.grid?.destroy();
    this.stats?.destroy();
    this.settings?.destroy();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    new MemoryGameApp();
  } catch (err) {
    console.error('Failed to initialize MemoryGameApp:', err);
  }
});
