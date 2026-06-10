import { DiceEngine } from './diceEngine';
import { GameCore, EventRange, ProbabilityData, HistoryEntry } from './gameCore';

const DICE_COLORS: Record<number, string> = {
  6: '#f4a261',
  8: '#e76f51',
  10: '#2a9d8f',
  20: '#9b5de5'
};

const DICE_TYPES = [6, 8, 10, 20];

class App {
  private root: HTMLElement;
  private gameCore: GameCore;
  private diceEngine: DiceEngine | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private resultCard: HTMLElement | null = null;
  private isRolling: boolean = false;
  private selectedEventSides: number = 6;

  constructor(root: HTMLElement) {
    this.root = root;
    this.gameCore = new GameCore();
    this.gameCore.subscribe(() => this.render());
  }

  public start(): void {
    this.render();
  }

  private render(): void {
    this.root.innerHTML = '';
    this.root.appendChild(this.createStyles());

    const container = document.createElement('div');
    container.className = 'app-container';

    container.appendChild(this.createDicePanel());
    container.appendChild(this.createCenterArea());
    container.appendChild(this.createStatsPanel());

    this.root.appendChild(container);
    this.initDiceEngine();
  }

  private createStyles(): HTMLStyleElement {
    const style = document.createElement('style');
    style.textContent = `
      .app-container {
        display: flex;
        width: 100%;
        height: 100vh;
        padding: 20px;
        gap: 20px;
        background: #0a0b1e;
      }

      .glass-panel {
        background: rgba(30, 30, 46, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }

      .btn {
        border: none;
        border-radius: 8px;
        color: white;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.17, 0.67, 0.83, 0.67);
        padding: 10px 16px;
      }

      .btn:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      }

      .btn:active {
        transform: scale(0.98);
      }

      /* 骰子编辑面板 */
      .dice-panel {
        width: 240px;
        background: #2b2d42;
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        flex-shrink: 0;
        overflow-y: auto;
      }

      .panel-title {
        color: white;
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 8px;
      }

      .add-dice-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .dice-type-buttons {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .dice-type-btn {
        background: #4ecdc4;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 10px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 14px;
      }

      .dice-type-btn:hover:not(:disabled) {
        transform: scale(1.05);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      }

      .dice-type-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .dice-display {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        min-height: 48px;
        padding: 8px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
      }

      .dice-icon {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 700;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
        position: relative;
      }

      .dice-icon:hover {
        transform: scale(1.1);
      }

      .dice-icon:hover::after {
        content: '×';
        position: absolute;
        top: -6px;
        right: -6px;
        width: 18px;
        height: 18px;
        background: #ff6b6b;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
      }

      .roll-btn {
        background: #ff6b6b;
        width: 100%;
        padding: 14px;
        font-size: 16px;
      }

      .roll-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }

      .clear-btn {
        background: #6c757d;
        width: 100%;
        padding: 10px;
      }

      .edit-events-btn {
        background: #9b5de5;
        width: 100%;
        padding: 10px;
        margin-top: auto;
      }

      /* 中央区域 */
      .center-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
      }

      .canvas-container {
        width: 350px;
        height: 350px;
        border-radius: 16px;
        overflow: hidden;
        background: rgba(0, 0, 0, 0.6);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      }

      #diceCanvas {
        width: 100%;
        height: 100%;
        display: block;
      }

      .result-card {
        width: 100%;
        max-width: 350px;
        height: 80px;
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 6px;
        opacity: 0;
        transform: translateY(-20px);
        transition: opacity 0.6s ease, transform 0.6s ease;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      }

      .result-card.show {
        opacity: 1;
        transform: translateY(0);
      }

      .result-title {
        color: white;
        font-size: 18px;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .result-probability {
        color: rgba(255, 255, 255, 0.9);
        font-size: 13px;
      }

      /* 统计面板 */
      .stats-panel {
        width: 220px;
        background: #1e1e2e;
        border-radius: 10px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        flex-shrink: 0;
        overflow-y: auto;
      }

      .stats-title {
        color: white;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .probability-chart {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 200px;
        overflow-y: auto;
      }

      .probability-bar {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .probability-label {
        color: rgba(255, 255, 255, 0.8);
        font-size: 12px;
        width: 24px;
        flex-shrink: 0;
      }

      .probability-track {
        flex: 1;
        height: 16px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
        overflow: hidden;
        position: relative;
      }

      .probability-fill {
        height: 100%;
        background: linear-gradient(90deg, #00b4d8, #90e0ef);
        border-radius: 4px;
        transition: width 0.1s ease;
      }

      .probability-pct {
        color: white;
        font-size: 11px;
        font-weight: 600;
        width: 40px;
        text-align: right;
        flex-shrink: 0;
      }

      .history-section {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .history-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 280px;
        overflow-y: auto;
      }

      .history-item {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 6px;
        padding: 8px;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.85);
        line-height: 1.5;
      }

      .history-empty {
        color: rgba(255, 255, 255, 0.4);
        font-size: 12px;
        text-align: center;
        padding: 20px;
      }

      .clear-history-btn {
        background: #6c757d;
        padding: 8px;
        font-size: 12px;
      }

      /* 模态框 */
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.53);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .modal {
        width: 400px;
        background: #222244;
        border-radius: 16px;
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        max-height: 80vh;
        overflow-y: auto;
      }

      .modal-title {
        color: white;
        font-size: 20px;
        font-weight: 700;
      }

      .modal-sides-selector {
        display: flex;
        gap: 8px;
      }

      .sides-tab {
        flex: 1;
        padding: 10px;
        border: none;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .sides-tab.active {
        background: #4ecdc4;
      }

      .event-ranges-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .event-range-item {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .range-inputs {
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .range-input {
        width: 50px;
        padding: 6px;
        border: none;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        text-align: center;
        font-size: 13px;
      }

      .range-input:focus {
        outline: 2px solid #4ecdc4;
      }

      .text-input {
        flex: 1;
        padding: 6px 10px;
        border: none;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        font-size: 13px;
      }

      .text-input:focus {
        outline: 2px solid #4ecdc4;
      }

      .color-input {
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        background: none;
        padding: 0;
      }

      .emoji-input {
        width: 50px;
        padding: 6px;
        border: none;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        text-align: center;
        font-size: 18px;
      }

      .modal-footer {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }

      .modal-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .modal-btn:hover {
        transform: scale(1.05);
      }

      .modal-btn.save {
        background: #4ecdc4;
      }

      .modal-btn.cancel {
        background: #6c757d;
      }

      .modal-btn.reset {
        background: #ff6b6b;
        margin-right: auto;
      }

      /* 响应式布局 */
      @media (max-width: 768px) {
        .app-container {
          flex-direction: column;
          height: auto;
          min-height: 100vh;
          overflow-y: auto;
        }

        .dice-panel {
          width: 100%;
          max-height: none;
        }

        .center-area {
          width: 100%;
        }

        .canvas-container {
          width: 100%;
          max-width: 350px;
          height: 350px;
        }

        .stats-panel {
          width: 100%;
        }
      }

      /* 滚动条样式 */
      ::-webkit-scrollbar {
        width: 6px;
      }

      ::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 3px;
      }

      ::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: rgba(255, 255, 255, 0.3);
      }
    `;
    return style;
  }

  private createDicePanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'dice-panel';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '骰子池';
    panel.appendChild(title);

    const addSection = document.createElement('div');
    addSection.className = 'add-dice-section';

    const addLabel = document.createElement('div');
    addLabel.style.cssText = 'color: rgba(255,255,255,0.7); font-size: 13px; margin-bottom: 4px;';
    addLabel.textContent = '添加骰子';
    addSection.appendChild(addLabel);

    const typeButtons = document.createElement('div');
    typeButtons.className = 'dice-type-buttons';

    DICE_TYPES.forEach((sides) => {
      const btn = document.createElement('button');
      btn.className = 'dice-type-btn';
      const count = this.gameCore.getDiceCount(sides);
      const max = this.gameCore.getMaxDicePerType();
      btn.textContent = `D${sides} (${count}/${max})`;
      btn.disabled = count >= max;
      btn.onclick = () => this.gameCore.addDice(sides);
      typeButtons.appendChild(btn);
    });

    addSection.appendChild(typeButtons);
    panel.appendChild(addSection);

    const displayLabel = document.createElement('div');
    displayLabel.style.cssText = 'color: rgba(255,255,255,0.7); font-size: 13px; margin-top: 8px;';
    displayLabel.textContent = '当前骰子（点击移除）';
    panel.appendChild(displayLabel);

    const diceDisplay = document.createElement('div');
    diceDisplay.className = 'dice-display';

    const dicePool = this.gameCore.getDicePool();
    if (dicePool.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color: rgba(255,255,255,0.4); font-size: 12px; padding: 10px;';
      empty.textContent = '暂无骰子';
      diceDisplay.appendChild(empty);
    } else {
      dicePool.forEach((dice) => {
        const icon = document.createElement('div');
        icon.className = 'dice-icon';
        icon.style.background = DICE_COLORS[dice.sides] || '#666666';
        icon.textContent = `D${dice.sides}`;
        icon.title = '点击移除';
        icon.onclick = () => this.gameCore.removeDice(dice.id);
        diceDisplay.appendChild(icon);
      });
    }

    panel.appendChild(diceDisplay);

    const rollBtn = document.createElement('button');
    rollBtn.className = 'btn roll-btn';
    rollBtn.textContent = '🎲 掷骰';
    rollBtn.disabled = dicePool.length === 0 || this.isRolling;
    rollBtn.onclick = () => this.handleRoll();
    panel.appendChild(rollBtn);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn clear-btn';
    clearBtn.textContent = '清空骰子';
    clearBtn.disabled = dicePool.length === 0;
    clearBtn.onclick = () => {
      this.gameCore.clearDicePool();
      if (this.resultCard) {
        this.resultCard.classList.remove('show');
      }
    };
    panel.appendChild(clearBtn);

    const editBtn = document.createElement('button');
    editBtn.className = 'btn edit-events-btn';
    editBtn.textContent = '✏️ 编辑事件';
    editBtn.onclick = () => this.openEventEditor();
    panel.appendChild(editBtn);

    return panel;
  }

  private createCenterArea(): HTMLElement {
    const center = document.createElement('div');
    center.className = 'center-area';

    const canvasContainer = document.createElement('div');
    canvasContainer.className = 'canvas-container';

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'diceCanvas';
    this.canvas.width = 350;
    this.canvas.height = 350;
    canvasContainer.appendChild(this.canvas);

    center.appendChild(canvasContainer);

    this.resultCard = document.createElement('div');
    this.resultCard.className = 'result-card';
    this.resultCard.style.background = 'rgba(255, 255, 255, 0.05)';

    const emptyTitle = document.createElement('div');
    emptyTitle.className = 'result-title';
    emptyTitle.textContent = '🎯 等待掷骰';
    this.resultCard.appendChild(emptyTitle);

    const emptySub = document.createElement('div');
    emptySub.className = 'result-probability';
    emptySub.textContent = '添加骰子并点击掷骰按钮';
    this.resultCard.appendChild(emptySub);

    center.appendChild(this.resultCard);

    return center;
  }

  private createStatsPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'stats-panel';

    const probTitle = document.createElement('div');
    probTitle.className = 'stats-title';
    probTitle.textContent = '概率一览';
    panel.appendChild(probTitle);

    const chart = document.createElement('div');
    chart.className = 'probability-chart';
    this.renderProbabilityChart(chart);
    panel.appendChild(chart);

    const historySection = document.createElement('div');
    historySection.className = 'history-section';

    const historyTitle = document.createElement('div');
    historyTitle.className = 'stats-title';
    historyTitle.textContent = '历史记录';
    historySection.appendChild(historyTitle);

    const historyList = document.createElement('div');
    historyList.className = 'history-list';
    this.renderHistoryList(historyList);
    historySection.appendChild(historyList);

    const clearHistoryBtn = document.createElement('button');
    clearHistoryBtn.className = 'btn clear-history-btn';
    clearHistoryBtn.textContent = '清空记录';
    clearHistoryBtn.onclick = () => this.gameCore.clearHistory();
    historySection.appendChild(clearHistoryBtn);

    panel.appendChild(historySection);

    return panel;
  }

  private renderProbabilityChart(container: HTMLElement): void {
    container.innerHTML = '';
    const probs: ProbabilityData[] = this.gameCore.getProbabilities();

    if (probs.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.textContent = '暂无数据';
      container.appendChild(empty);
      return;
    }

    probs.forEach((p) => {
      const bar = document.createElement('div');
      bar.className = 'probability-bar';

      const label = document.createElement('div');
      label.className = 'probability-label';
      label.textContent = p.value.toString();
      bar.appendChild(label);

      const track = document.createElement('div');
      track.className = 'probability-track';

      const fill = document.createElement('div');
      fill.className = 'probability-fill';
      fill.style.width = `${Math.min(p.percentage, 100)}%`;
      track.appendChild(fill);
      bar.appendChild(track);

      const pct = document.createElement('div');
      pct.className = 'probability-pct';
      pct.textContent = `${p.percentage.toFixed(1)}%`;
      bar.appendChild(pct);

      container.appendChild(bar);
    });
  }

  private renderHistoryList(container: HTMLElement): void {
    container.innerHTML = '';
    const history: HistoryEntry[] = this.gameCore.getHistory();

    if (history.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.textContent = '暂无记录';
      container.appendChild(empty);
      return;
    }

    history.forEach((entry) => {
      const item = document.createElement('div');
      item.className = 'history-item';
      item.innerHTML = `
        <div><strong>${entry.diceCombo}</strong></div>
        <div>${entry.eventIcon} 平均${entry.average}，触发「${entry.eventName}」</div>
        <div style="color: rgba(255,255,255,0.5);">耗时 ${entry.duration}s</div>
      `;
      container.appendChild(item);
    });
  }

  private initDiceEngine(): void {
    if (!this.canvas) return;

    this.diceEngine = new DiceEngine(this.canvas, {
      width: 350,
      height: 350,
      animationDuration: 2000
    });
  }

  private async handleRoll(): Promise<void> {
    if (this.isRolling || !this.diceEngine) return;

    const dicePool = this.gameCore.getDicePool();
    if (dicePool.length === 0) return;

    this.isRolling = true;
    this.render();

    const startTime = performance.now();

    try {
      const configs = dicePool.map((d) => ({ id: d.id, sides: d.sides }));
      const results = await this.diceEngine.roll(configs);

      const duration = (performance.now() - startTime) / 1000;
      const rollResult = this.gameCore.recordRoll(results, duration);

      this.showResultCard(rollResult.event, rollResult.average);
    } catch (e) {
      console.error('掷骰失败:', e);
    } finally {
      this.isRolling = false;
      this.render();
    }
  }

  private showResultCard(event: EventRange, average: number): void {
    if (!this.resultCard) return;

    this.resultCard.classList.remove('show');
    this.resultCard.innerHTML = '';

    const gradient = `linear-gradient(135deg, ${event.color}, ${this.lightenColor(event.color, 20)})`;
    this.resultCard.style.background = gradient;

    const title = document.createElement('div');
    title.className = 'result-title';
    title.innerHTML = `<span style="font-size: 24px;">${event.icon}</span> ${event.name}`;
    this.resultCard.appendChild(title);

    const probs = this.gameCore.getProbabilities();
    const avgRounded = Math.round(average * 10) / 10;
    const probEntry = probs.find((p) => Math.abs(p.value - avgRounded) < 0.5);
    const probText = probEntry
      ? `平均点数 ${avgRounded} · 概率 ${probEntry.percentage.toFixed(1)}%`
      : `平均点数 ${avgRounded}`;

    const sub = document.createElement('div');
    sub.className = 'result-probability';
    sub.textContent = probText;
    this.resultCard.appendChild(sub);

    requestAnimationFrame(() => {
      if (this.resultCard) {
        this.resultCard.classList.add('show');
      }
    });
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  private openEventEditor(): void {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';

    const title = document.createElement('div');
    title.className = 'modal-title';
    title.textContent = '编辑事件映射';
    modal.appendChild(title);

    const sidesSelector = document.createElement('div');
    sidesSelector.className = 'modal-sides-selector';

    DICE_TYPES.forEach((sides) => {
      const tab = document.createElement('button');
      tab.className = `sides-tab ${sides === this.selectedEventSides ? 'active' : ''}`;
      tab.textContent = `D${sides}`;
      tab.onclick = () => {
        this.selectedEventSides = sides;
        overlay.remove();
        this.openEventEditor();
      };
      sidesSelector.appendChild(tab);
    });

    modal.appendChild(sidesSelector);

    const config = this.gameCore.getEventConfig();
    const currentRanges = config[this.selectedEventSides] || [];

    const rangesList = document.createElement('div');
    rangesList.className = 'event-ranges-list';

    const tempRanges: EventRange[] = [...currentRanges.map((r) => ({ ...r }))];

    const renderRanges = () => {
      rangesList.innerHTML = '';
      tempRanges.forEach((range, index) => {
        const item = document.createElement('div');
        item.className = 'event-range-item';

        const row1 = document.createElement('div');
        row1.className = 'range-inputs';

        const minInput = document.createElement('input');
        minInput.type = 'number';
        minInput.className = 'range-input';
        minInput.value = range.min.toString();
        minInput.min = '1';
        minInput.max = this.selectedEventSides.toString();
        minInput.onchange = (e) => {
          tempRanges[index].min = parseInt((e.target as HTMLInputElement).value) || 1;
        };

        const dash = document.createElement('span');
        dash.style.color = 'white';
        dash.textContent = '-';

        const maxInput = document.createElement('input');
        maxInput.type = 'number';
        maxInput.className = 'range-input';
        maxInput.value = range.max.toString();
        maxInput.min = '1';
        maxInput.max = this.selectedEventSides.toString();
        maxInput.onchange = (e) => {
          tempRanges[index].max = parseInt((e.target as HTMLInputElement).value) || this.selectedEventSides;
        };

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'text-input';
        nameInput.value = range.name;
        nameInput.placeholder = '事件名称';
        nameInput.onchange = (e) => {
          tempRanges[index].name = (e.target as HTMLInputElement).value;
        };

        row1.appendChild(minInput);
        row1.appendChild(dash);
        row1.appendChild(maxInput);
        row1.appendChild(nameInput);
        item.appendChild(row1);

        const row2 = document.createElement('div');
        row2.className = 'range-inputs';

        const emojiLabel = document.createElement('span');
        emojiLabel.style.color = 'rgba(255,255,255,0.7)';
        emojiLabel.style.fontSize = '12px';
        emojiLabel.textContent = '图标:';

        const emojiInput = document.createElement('input');
        emojiInput.type = 'text';
        emojiInput.className = 'emoji-input';
        emojiInput.value = range.icon;
        emojiInput.placeholder = '😀';
        emojiInput.onchange = (e) => {
          tempRanges[index].icon = (e.target as HTMLInputElement).value;
        };

        const colorLabel = document.createElement('span');
        colorLabel.style.color = 'rgba(255,255,255,0.7)';
        colorLabel.style.fontSize = '12px';
        colorLabel.style.marginLeft = '10px';
        colorLabel.textContent = '颜色:';

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.className = 'color-input';
        colorInput.value = range.color;
        colorInput.onchange = (e) => {
          tempRanges[index].color = (e.target as HTMLInputElement).value;
        };

        const removeBtn = document.createElement('button');
        removeBtn.className = 'modal-btn';
        removeBtn.style.background = '#ff6b6b';
        removeBtn.style.padding = '6px 12px';
        removeBtn.style.fontSize = '12px';
        removeBtn.style.marginLeft = 'auto';
        removeBtn.textContent = '删除';
        removeBtn.onclick = () => {
          tempRanges.splice(index, 1);
          renderRanges();
        };

        row2.appendChild(emojiLabel);
        row2.appendChild(emojiInput);
        row2.appendChild(colorLabel);
        row2.appendChild(colorInput);
        row2.appendChild(removeBtn);
        item.appendChild(row2);

        rangesList.appendChild(item);
      });
    };

    renderRanges();
    modal.appendChild(rangesList);

    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    const resetBtn = document.createElement('button');
    resetBtn.className = 'modal-btn reset';
    resetBtn.textContent = '重置默认';
    resetBtn.onclick = () => {
      this.gameCore.resetEventConfig();
      overlay.remove();
      this.openEventEditor();
    };

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal-btn cancel';
    cancelBtn.textContent = '取消';
    cancelBtn.onclick = () => overlay.remove();

    const saveBtn = document.createElement('button');
    saveBtn.className = 'modal-btn save';
    saveBtn.textContent = '保存';
    saveBtn.onclick = () => {
      tempRanges.forEach((range, i) => {
        this.gameCore.setEventRange(this.selectedEventSides, i, range);
      });
      overlay.remove();
    };

    footer.appendChild(resetBtn);
    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);
    modal.appendChild(footer);

    overlay.appendChild(modal);

    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };

    this.root.appendChild(overlay);
  }
}

const app = new App(document.getElementById('app')!);
app.start();
