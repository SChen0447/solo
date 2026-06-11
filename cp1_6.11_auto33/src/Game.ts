import {
  Grid,
  LevelConfig,
  CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
} from './Grid';
import { Spider, Command, CommandType } from './Spider';

export type GameStatus = 'editing' | 'executing' | 'levelComplete' | 'gameOver' | 'victory';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface SavedScheme {
  name: string;
  commands: Command[];
  timestamp: number;
}

const SCHEME_STORAGE_KEY = 'steampunk_spider_schemes';
const MAX_SCHEMES = 3;
const MAX_COMMANDS = 10;

const LEVELS: LevelConfig[] = [
  { id: 1, name: '新手管道', coreCount: 5, ventCount: 3, layout: 'straight' },
  { id: 2, name: '绕行迷宫', coreCount: 5, ventCount: 4, layout: 'detour' },
  { id: 3, name: '交叉网路', coreCount: 5, ventCount: 5, layout: 'cross' },
];

export class Game {
  grid: Grid;
  spider: Spider;
  status: GameStatus;
  score: number;
  currentLevel: number;
  commands: Command[];
  activeCommandIndex: number;
  particles: Particle[];
  canvasWidth: number;
  canvasHeight: number;
  offsetX: number;
  offsetY: number;
  cellSize: number;
  private _ctx: CanvasRenderingContext2D;
  private _dom: {
    levelDisplay: HTMLElement;
    scoreDisplay: HTMLElement;
    livesContainer: HTMLElement;
    coreDisplay: HTMLElement;
    commandQueue: HTMLElement;
    schemeList: HTMLElement;
    schemeName: HTMLInputElement;
    btnForward: HTMLButtonElement;
    btnLeft: HTMLButtonElement;
    btnRight: HTMLButtonElement;
    btnRun: HTMLButtonElement;
    btnUndo: HTMLButtonElement;
    btnClear: HTMLButtonElement;
    btnSave: HTMLButtonElement;
    modalOverlay: HTMLElement;
    modalTitle: HTMLElement;
    modalText: HTMLElement;
    modalButtons: HTMLElement;
    toast: HTMLElement;
  };
  private _totalCoresInLevel: number;
  private _cmdCounter: number;
  private _toastTimer: number | null;

  constructor(canvas: HTMLCanvasElement) {
    this._ctx = canvas.getContext('2d')!;
    this.canvasWidth = canvas.width;
    this.canvasHeight = canvas.height;
    this.grid = new Grid(GRID_COLS, GRID_ROWS);
    this.spider = new Spider(this.grid, 0, 0);
    this.status = 'editing';
    this.score = 0;
    this.currentLevel = 0;
    this.commands = [];
    this.activeCommandIndex = -1;
    this.particles = [];
    this._totalCoresInLevel = 0;
    this._cmdCounter = 0;
    this._toastTimer = null;

    const cellW = (this.canvasWidth - 20) / GRID_COLS;
    const cellH = (this.canvasHeight - 20) / GRID_ROWS;
    this.cellSize = Math.min(cellW, cellH, CELL_SIZE);
    this.offsetX = (this.canvasWidth - this.cellSize * GRID_COLS) / 2;
    this.offsetY = (this.canvasHeight - this.cellSize * GRID_ROWS) / 2;

    this._dom = {
      levelDisplay: document.getElementById('levelDisplay')!,
      scoreDisplay: document.getElementById('scoreDisplay')!,
      livesContainer: document.getElementById('livesContainer')!,
      coreDisplay: document.getElementById('coreDisplay')!,
      commandQueue: document.getElementById('commandQueue')!,
      schemeList: document.getElementById('schemeList')!,
      schemeName: document.getElementById('schemeName') as HTMLInputElement,
      btnForward: document.getElementById('btnForward') as HTMLButtonElement,
      btnLeft: document.getElementById('btnLeft') as HTMLButtonElement,
      btnRight: document.getElementById('btnRight') as HTMLButtonElement,
      btnRun: document.getElementById('btnRun') as HTMLButtonElement,
      btnUndo: document.getElementById('btnUndo') as HTMLButtonElement,
      btnClear: document.getElementById('btnClear') as HTMLButtonElement,
      btnSave: document.getElementById('btnSave') as HTMLButtonElement,
      modalOverlay: document.getElementById('modalOverlay')!,
      modalTitle: document.getElementById('modalTitle')!,
      modalText: document.getElementById('modalText')!,
      modalButtons: document.getElementById('modalButtons')!,
      toast: document.getElementById('toast')!,
    };

    this.spider.setListeners({
      onCollect: (x, y) => this._onCollect(x, y),
      onHurt: (x, y) => this._onHurt(x, y),
      onError: (_x, _y) => this._onError(),
      onStepDone: () => this._onStepDone(),
    });

    this._bindUI();
    this._loadLevel(0);
    this._renderSchemes();
    this._renderCommands();
    this._updateStatusBar();
  }

  private _bindUI(): void {
    this._dom.btnForward.addEventListener('click', () => this._addCommand('forward'));
    this._dom.btnLeft.addEventListener('click', () => this._addCommand('turnLeft'));
    this._dom.btnRight.addEventListener('click', () => this._addCommand('turnRight'));
    this._dom.btnRun.addEventListener('click', () => this._runCommands());
    this._dom.btnUndo.addEventListener('click', () => this._undoCommand());
    this._dom.btnClear.addEventListener('click', () => this._clearCommands());
    this._dom.btnSave.addEventListener('click', () => this._saveScheme());
  }

  private _loadLevel(index: number): void {
    this.currentLevel = index;
    this.grid.generateLevel(LEVELS[index]);
    this._totalCoresInLevel = this.grid.coresRemaining;
    this.spider.reset(0, 0);
    this.status = 'editing';
    this.activeCommandIndex = -1;
    this.particles = [];
    this.commands = [];
    this._renderCommands();
    this._updateStatusBar();
    this._updateButtonsEnabled();
  }

  private _addCommand(type: CommandType): void {
    if (this.status !== 'editing') return;
    if (this.commands.length >= MAX_COMMANDS) {
      this._showToast(`最多 ${MAX_COMMANDS} 条指令`);
      return;
    }
    this._cmdCounter++;
    this.commands.push({ id: `cmd_${Date.now()}_${this._cmdCounter}`, type });
    this._renderCommands();
    this._updateButtonsEnabled();
  }

  private _removeCommand(id: string): void {
    if (this.status !== 'editing') return;
    this.commands = this.commands.filter((c) => c.id !== id);
    this._renderCommands();
    this._updateButtonsEnabled();
  }

  private _undoCommand(): void {
    if (this.status !== 'editing') return;
    if (this.commands.length === 0) return;
    this.commands.pop();
    this._renderCommands();
    this._updateButtonsEnabled();
  }

  private _clearCommands(): void {
    if (this.status !== 'editing') return;
    if (this.commands.length === 0) return;
    this.commands = [];
    this.activeCommandIndex = -1;
    this._renderCommands();
    this._updateButtonsEnabled();
  }

  private async _runCommands(): Promise<void> {
    if (this.status !== 'editing') return;
    if (this.commands.length === 0) {
      this._showToast('请先添加指令');
      return;
    }
    this.status = 'executing';
    this.activeCommandIndex = -1;
    this._updateButtonsEnabled();
    for (let i = 0; i < this.commands.length; i++) {
      if (this.status !== 'executing') break;
      this.activeCommandIndex = i;
      this._renderCommands();
      await this.spider.execute(this.commands[i]);
      if (this.spider.lives <= 0) {
        this._gameOver();
        return;
      }
      if (this.grid.coresRemaining <= 0) {
        this._levelComplete();
        return;
      }
    }
    this.activeCommandIndex = -1;
    this._renderCommands();
    if (this.grid.coresRemaining > 0 && this.status === 'executing') {
      this.status = 'editing';
      this._showToast('指令执行完毕，还有核心未收集');
    }
    this._updateButtonsEnabled();
  }

  private _onCollect(x: number, y: number): void {
    this.score += 10;
    const px = this.offsetX + x * this.cellSize + this.cellSize / 2;
    const py = this.offsetY + y * this.cellSize + this.cellSize / 2;
    this._spawnGoldParticles(px, py);
    this._updateStatusBar();
  }

  private _onHurt(x: number, y: number): void {
    const px = this.offsetX + x * this.cellSize + this.cellSize / 2;
    const py = this.offsetY + y * this.cellSize + this.cellSize / 2;
    this._spawnSteamParticles(px, py);
    this._updateStatusBar();
  }

  private _onError(): void {
    this._showToast('无法移动！');
  }

  private _onStepDone(): void {
    // noop
  }

  private _levelComplete(): void {
    this.activeCommandIndex = -1;
    this._renderCommands();
    if (this.currentLevel >= LEVELS.length - 1) {
      this.status = 'victory';
      this.spider.triggerCelebrate();
      this._showModal(
        '🏆 全部通关！',
        `你成功收集了所有能量核心！最终得分：${this.score}`,
        [{ label: '再玩一次', onClick: () => { this._hideModal(); this._loadLevel(0); this.score = 0; this._updateStatusBar(); } }],
      );
    } else {
      this.status = 'levelComplete';
      this._showModal(
        `✦ 关卡 ${this.currentLevel + 1} 通关 ✦`,
        `当前得分：${this.score}\n准备进入下一关：${LEVELS[this.currentLevel + 1].name}`,
        [{ label: '下一关', onClick: () => { this._hideModal(); this._loadLevel(this.currentLevel + 1); } }],
      );
    }
    this._updateButtonsEnabled();
  }

  private _gameOver(): void {
    this.status = 'gameOver';
    this.activeCommandIndex = -1;
    this._renderCommands();
    this._showModal(
      '💥 任务失败',
      `生命值耗尽！当前得分：${this.score}`,
      [
        { label: '重试本关', onClick: () => { this._hideModal(); this._loadLevel(this.currentLevel); } },
        { label: '从头开始', onClick: () => { this._hideModal(); this.score = 0; this._loadLevel(0); this._updateStatusBar(); } },
      ],
    );
    this._updateButtonsEnabled();
  }

  private _spawnGoldParticles(x: number, y: number): void {
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 800,
        maxLife: 800,
        color: ['#ffd700', '#ffeb3b', '#fff176', '#ffa000'][Math.floor(Math.random() * 4)],
        size: 2 + Math.random() * 4,
      });
    }
    this._limitParticles();
  }

  private _spawnSteamParticles(x: number, y: number): void {
    for (let i = 0; i < 18; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -0.6 - Math.random() * 1.8,
        life: 900,
        maxLife: 900,
        color: 'rgba(255, 255, 255, 0.85)',
        size: 6 + Math.random() * 8,
      });
    }
    this._limitParticles();
  }

  private _limitParticles(): void {
    if (this.particles.length > 200) {
      this.particles = this.particles.slice(-200);
    }
  }

  private _updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02;
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private _renderParticles(): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      this._ctx.save();
      this._ctx.globalAlpha = alpha;
      this._ctx.fillStyle = p.color;
      this._ctx.beginPath();
      this._ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this._ctx.fill();
      this._ctx.restore();
    }
  }

  private _renderVictoryParticles(time: number): void {
    if (this.status !== 'victory') return;
    const cx = this.offsetX + (GRID_COLS / 2) * this.cellSize;
    const cy = this.offsetY + (GRID_ROWS / 2) * this.cellSize;
    if (Math.random() < 0.7) {
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 4;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 1,
        life: 1200,
        maxLife: 1200,
        color: ['#ffd700', '#ff6b35', '#ff4081', '#00e5ff'][Math.floor(Math.random() * 4)],
        size: 3 + Math.random() * 5,
      });
      this._limitParticles();
    }
    void time;
  }

  update(deltaTime: number, time: number): void {
    this.spider.update(deltaTime, time);
    this._updateParticles(deltaTime);
    this._renderVictoryParticles(time);
  }

  render(time: number): void {
    const ctx = this._ctx;
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    const grad = ctx.createLinearGradient(0, 0, this.canvasWidth, this.canvasHeight);
    grad.addColorStop(0, '#1a0f08');
    grad.addColorStop(1, '#2d1b0e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    this._drawDecorativeRivets();

    this.grid.render(ctx, this.offsetX, this.offsetY, this.cellSize, time);
    this.spider.render(ctx, this.offsetX, this.offsetY, this.cellSize, time);
    this._renderParticles();
  }

  private _drawDecorativeRivets(): void {
    const ctx = this._ctx;
    const rivetR = 4;
    const positions = [
      { x: 8, y: 8 },
      { x: this.canvasWidth - 8, y: 8 },
      { x: 8, y: this.canvasHeight - 8 },
      { x: this.canvasWidth - 8, y: this.canvasHeight - 8 },
      { x: this.canvasWidth / 2, y: 6 },
      { x: this.canvasWidth / 2, y: this.canvasHeight - 6 },
    ];
    for (const p of positions) {
      const grad = ctx.createRadialGradient(p.x - 1, p.y - 1, 0, p.x, p.y, rivetR);
      grad.addColorStop(0, '#e0b070');
      grad.addColorStop(1, '#6b4423');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rivetR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2a1a0e';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  private _updateStatusBar(): void {
    this._dom.levelDisplay.textContent = `${this.currentLevel + 1} / ${LEVELS.length}`;
    this._dom.scoreDisplay.textContent = `${this.score}`;
    this._dom.coreDisplay.textContent = `${this._totalCoresInLevel - this.grid.coresRemaining} / ${this._totalCoresInLevel}`;
    this._dom.livesContainer.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const pipe = document.createElement('div');
      pipe.className = 'life-pipe' + (i >= this.spider.lives ? ' empty' : '');
      this._dom.livesContainer.appendChild(pipe);
    }
  }

  private _renderCommands(): void {
    const q = this._dom.commandQueue;
    q.innerHTML = '';
    if (this.commands.length === 0) {
      const hint = document.createElement('div');
      hint.className = 'queue-empty-hint';
      hint.textContent = '点击上方按钮添加指令（最多10步）';
      q.appendChild(hint);
      return;
    }
    this.commands.forEach((cmd, idx) => {
      const chip = document.createElement('div');
      chip.className = 'command-chip ' + (cmd.type === 'forward' ? 'forward' : cmd.type === 'turnLeft' ? 'left' : 'right');
      chip.title = '点击删除';
      if (idx === this.activeCommandIndex) chip.classList.add('active');
      chip.textContent = cmd.type === 'forward' ? '↑' : cmd.type === 'turnLeft' ? '↶' : '↷';
      chip.addEventListener('click', () => this._removeCommand(cmd.id));
      q.appendChild(chip);
    });
  }

  private _updateButtonsEnabled(): void {
    const editing = this.status === 'editing';
    this._dom.btnForward.disabled = !editing || this.commands.length >= MAX_COMMANDS;
    this._dom.btnLeft.disabled = !editing || this.commands.length >= MAX_COMMANDS;
    this._dom.btnRight.disabled = !editing || this.commands.length >= MAX_COMMANDS;
    this._dom.btnRun.disabled = !editing || this.commands.length === 0;
    this._dom.btnUndo.disabled = !editing || this.commands.length === 0;
    this._dom.btnClear.disabled = !editing || this.commands.length === 0;
  }

  private _getSchemes(): SavedScheme[] {
    try {
      const raw = localStorage.getItem(SCHEME_STORAGE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw) as SavedScheme[];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  private _setSchemes(list: SavedScheme[]): void {
    try {
      localStorage.setItem(SCHEME_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
  }

  private _renderSchemes(): void {
    const list = this._getSchemes();
    const host = this._dom.schemeList;
    host.innerHTML = '';
    if (list.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'scheme-empty';
      empty.textContent = '暂无保存方案';
      host.appendChild(empty);
      return;
    }
    list.forEach((scheme, idx) => {
      const card = document.createElement('div');
      card.className = 'scheme-card';
      card.dataset.idx = String(idx);

      const header = document.createElement('div');
      header.className = 'scheme-card-header';

      const name = document.createElement('div');
      name.className = 'scheme-name';
      name.textContent = scheme.name;

      const actions = document.createElement('div');
      actions.className = 'scheme-actions';

      const loadBtn = document.createElement('button');
      loadBtn.className = 'brass-btn mini-btn';
      loadBtn.textContent = '加载';
      loadBtn.addEventListener('click', () => {
        card.classList.add('loading');
        setTimeout(() => {
          this._loadScheme(idx);
          card.classList.remove('loading');
        }, 200);
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'brass-btn mini-btn delete';
      delBtn.textContent = '删除';
      delBtn.addEventListener('click', () => this._deleteScheme(idx));

      actions.appendChild(loadBtn);
      actions.appendChild(delBtn);
      header.appendChild(name);
      header.appendChild(actions);
      card.appendChild(header);

      const meta = document.createElement('div');
      meta.style.cssText = 'font-size:11px;color:rgba(240,215,140,0.5);';
      meta.textContent = `${scheme.commands.length} 条指令`;
      card.appendChild(meta);

      host.appendChild(card);
    });
  }

  private _saveScheme(): void {
    if (this.status !== 'editing') {
      this._showToast('执行中无法保存');
      return;
    }
    const name = (this._dom.schemeName.value || '').trim();
    if (!name) {
      this._showToast('请输入方案名');
      return;
    }
    if (name.length > 6) {
      this._showToast('方案名最多6个字');
      return;
    }
    if (this.commands.length === 0) {
      this._showToast('指令队列为空');
      return;
    }
    const list = this._getSchemes();
    if (list.length >= MAX_SCHEMES) {
      this._showToast(`最多保存 ${MAX_SCHEMES} 个方案，请先删除`);
      return;
    }
    list.push({ name, commands: [...this.commands], timestamp: Date.now() });
    this._setSchemes(list);
    this._dom.schemeName.value = '';
    this._renderSchemes();
    this._showToast('方案已保存');
  }

  private _loadScheme(idx: number): void {
    if (this.status !== 'editing') {
      this._showToast('执行中无法加载');
      return;
    }
    const list = this._getSchemes();
    const scheme = list[idx];
    if (!scheme) return;
    this.commands = scheme.commands.map((c) => ({ ...c }));
    this._renderCommands();
    this._updateButtonsEnabled();
    this._showToast(`已加载方案：${scheme.name}`);
  }

  private _deleteScheme(idx: number): void {
    const list = this._getSchemes();
    list.splice(idx, 1);
    this._setSchemes(list);
    this._renderSchemes();
    this._showToast('方案已删除');
  }

  private _showToast(msg: string): void {
    const el = this._dom.toast;
    el.textContent = msg;
    el.classList.add('show');
    if (this._toastTimer) window.clearTimeout(this._toastTimer);
    this._toastTimer = window.setTimeout(() => {
      el.classList.remove('show');
      this._toastTimer = null;
    }, 1800);
  }

  private _showModal(title: string, text: string, buttons: Array<{ label: string; onClick: () => void }>): void {
    this._dom.modalTitle.textContent = title;
    this._dom.modalText.textContent = text;
    this._dom.modalButtons.innerHTML = '';
    buttons.forEach((b) => {
      const btn = document.createElement('button');
      btn.className = 'brass-btn';
      btn.textContent = b.label;
      btn.addEventListener('click', b.onClick);
      this._dom.modalButtons.appendChild(btn);
    });
    this._dom.modalOverlay.classList.add('show');
  }

  private _hideModal(): void {
    this._dom.modalOverlay.classList.remove('show');
  }
}
