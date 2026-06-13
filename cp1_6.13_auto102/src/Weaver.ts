export interface GridCell {
  x: number;
  y: number;
  row: number;
  col: number;
  size: number;
  pitch: number;
  phase: number;
  activated: boolean;
  activatedAt: number;
  flashAt: number;
  rippleStart: number;
  hue: number;
  brightness: number;
  memoryUnlocked: boolean;
}

export interface MemoryFragment {
  id: number;
  cells: Array<{ row: number; col: number }>;
  text: string;
  illustration: string;
  unlocked: boolean;
  unlockedAt: number;
  cellPositions: Array<{ x: number; y: number }>;
}

export interface TrailPoint {
  x: number;
  y: number;
  time: number;
  speed: number;
}

export interface ErrorMark {
  x: number;
  y: number;
  time: number;
}

export interface FlashCell {
  row: number;
  col: number;
  time: number;
}

const MEMORY_FRAGMENTS_DATA: Array<{ text: string; illustration: string; pattern: Array<{ row: number; col: number }> }> = [
  {
    text: '晨光透过旧窗棂，洒在泛黄的信纸上',
    illustration: 'window',
    pattern: [
      { row: 1, col: 2 }, { row: 1, col: 3 }, { row: 1, col: 4 }
    ]
  },
  {
    text: '街角的咖啡店，两杯冒着热气的拿铁',
    illustration: 'coffee',
    pattern: [
      { row: 2, col: 6 }, { row: 3, col: 6 }, { row: 4, col: 6 }
    ]
  },
  {
    text: '海边的黄昏，脚印被潮水温柔抹去',
    illustration: 'beach',
    pattern: [
      { row: 5, col: 1 }, { row: 5, col: 2 }, { row: 6, col: 2 }
    ]
  },
  {
    text: '老唱片机旋转着，流淌出熟悉的旋律',
    illustration: 'music',
    pattern: [
      { row: 4, col: 4 }, { row: 5, col: 4 }, { row: 5, col: 5 }, { row: 5, col: 6 }
    ]
  },
  {
    text: '雨天的站台，伞沿滴落的水珠数着时间',
    illustration: 'rain',
    pattern: [
      { row: 7, col: 3 }, { row: 7, col: 4 }, { row: 7, col: 5 }
    ]
  },
  {
    text: '童年的纸飞机，划过湛蓝的天空',
    illustration: 'plane',
    pattern: [
      { row: 1, col: 7 }, { row: 2, col: 7 }, { row: 2, col: 8 }
    ]
  },
  {
    text: '深夜的台灯下，钢笔在日记本上沙沙作响',
    illustration: 'diary',
    pattern: [
      { row: 6, col: 7 }, { row: 7, col: 7 }, { row: 8, col: 7 }
    ]
  },
  {
    text: '春日的樱花雨，花瓣落在你的发梢',
    illustration: 'sakura',
    pattern: [
      { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 4, col: 2 }, { row: 4, col: 3 }
    ]
  },
  {
    text: '冬日的壁炉旁，温暖驱散了所有寒意',
    illustration: 'fire',
    pattern: [
      { row: 7, col: 1 }, { row: 8, col: 1 }, { row: 8, col: 2 }
    ]
  },
  {
    text: '山顶的日出，云海翻涌成金色的浪',
    illustration: 'mountain',
    pattern: [
      { row: 2, col: 4 }, { row: 2, col: 5 }, { row: 3, col: 5 }
    ]
  },
  {
    text: '故乡的小桥下，溪水唱着古老的歌谣',
    illustration: 'bridge',
    pattern: [
      { row: 6, col: 4 }, { row: 6, col: 5 }, { row: 6, col: 6 }, { row: 7, col: 6 }
    ]
  },
  {
    text: '时光织成的网，每一段都是珍贵的回响',
    illustration: 'finale',
    pattern: [
      { row: 4, col: 8 }, { row: 5, col: 8 }, { row: 5, col: 9 }, { row: 6, col: 9 }
    ]
  }
];

export class Weaver {
  gridSize: number = 10;
  cellSize: number = 40;
  gridX: number = 0;
  gridY: number = 0;
  cells: GridCell[][] = [];
  bpm: number = 120;
  beatInterval: number;
  lastBeatTime: number = 0;
  currentBeat: number = 0;
  memories: MemoryFragment[] = [];
  trail: TrailPoint[] = [];
  errorMarks: ErrorMark[] = [];
  flashCells: FlashCell[] = [];
  errorCount: number = 0;
  progress: number = 0;
  totalProgress: number = 12;
  isVictory: boolean = false;
  victoryTime: number = 0;
  resetMessageTime: number = 0;
  audioContext: AudioContext | null = null;
  onProgressUpdate: ((progress: number, total: number) => void) | null = null;
  onMemoryUnlocked: ((memory: MemoryFragment) => void) | null = null;
  onError: (() => void) | null = null;
  onVictory: (() => void) | null = null;
  onResetMessage: (() => void) | null = null;

  constructor() {
    this.beatInterval = 60000 / this.bpm;
  }

  init(audioContext: AudioContext, viewportWidth: number, viewportHeight: number) {
    this.audioContext = audioContext;
    this.resize(viewportWidth, viewportHeight);
    this.initGrid();
    this.initMemories();
    this.lastBeatTime = performance.now();
  }

  resize(viewportWidth: number, viewportHeight: number) {
    const maxGridWidth = viewportWidth * 0.9;
    const maxGridHeight = viewportHeight * 0.7;
    this.cellSize = Math.floor(Math.min(maxGridWidth / this.gridSize, maxGridHeight / this.gridSize));
    const gridTotalWidth = this.cellSize * this.gridSize;
    const gridTotalHeight = this.cellSize * this.gridSize;
    this.gridX = (viewportWidth - gridTotalWidth) / 2;
    this.gridY = viewportHeight * 0.15 + (viewportHeight * 0.7 - gridTotalHeight) / 2;

    if (this.cells.length > 0) {
      for (let r = 0; r < this.gridSize; r++) {
        for (let c = 0; c < this.gridSize; c++) {
          const cell = this.cells[r][c];
          cell.x = this.gridX + c * this.cellSize + this.cellSize / 2;
          cell.y = this.gridY + r * this.cellSize + this.cellSize / 2;
          cell.size = this.cellSize;
        }
      }
      this.updateMemoryPositions();
    }
  }

  private initGrid() {
    this.cells = [];
    for (let r = 0; r < this.gridSize; r++) {
      const row: GridCell[] = [];
      for (let c = 0; c < this.gridSize; c++) {
        const pitchIndex = (this.gridSize - 1 - r) * this.gridSize + c;
        const normalizedPitch = pitchIndex / (this.gridSize * this.gridSize - 1);
        const pitch = 261.63 + normalizedPitch * (523.25 - 261.63);
        const hue = 270 - normalizedPitch * 270 + normalizedPitch * 50;
        row.push({
          x: this.gridX + c * this.cellSize + this.cellSize / 2,
          y: this.gridY + r * this.cellSize + this.cellSize / 2,
          row: r,
          col: c,
          size: this.cellSize,
          pitch,
          phase: 0,
          activated: false,
          activatedAt: 0,
          flashAt: 0,
          rippleStart: 0,
          hue,
          brightness: 0.5,
          memoryUnlocked: false
        });
      }
      this.cells.push(row);
    }
  }

  private initMemories() {
    this.memories = MEMORY_FRAGMENTS_DATA.map((data, index) => ({
      id: index,
      cells: data.pattern,
      text: data.text,
      illustration: data.illustration,
      unlocked: false,
      unlockedAt: 0,
      cellPositions: []
    }));
    this.updateMemoryPositions();
  }

  private updateMemoryPositions() {
    this.memories.forEach(memory => {
      memory.cellPositions = memory.cells.map(cell => {
        const gridCell = this.cells[cell.row][cell.col];
        return { x: gridCell.x, y: gridCell.y };
      });
    });
  }

  update(now: number) {
    if (now - this.lastBeatTime >= this.beatInterval) {
      this.lastBeatTime = now;
      this.currentBeat++;
      this.triggerGridRipples(now);
    }

    this.trail = this.trail.filter(p => now - p.time < 1000);
    this.errorMarks = this.errorMarks.filter(m => now - m.time < 500);
    this.flashCells = this.flashCells.filter(f => now - f.time < 200);

    if (this.resetMessageTime > 0 && now - this.resetMessageTime > 3000) {
      this.resetMessageTime = 0;
    }
  }

  private triggerGridRipples(now: number) {
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if ((r + c + this.currentBeat) % 3 === 0) {
          this.cells[r][c].rippleStart = now;
        }
      }
    }
  }

  getCellAt(x: number, y: number): GridCell | null {
    const col = Math.floor((x - this.gridX) / this.cellSize);
    const row = Math.floor((y - this.gridY) / this.cellSize);
    if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
      return this.cells[row][col];
    }
    return null;
  }

  isOnBeat(now: number): boolean {
    const timeSinceBeat = now - this.lastBeatTime;
    const timeToNextBeat = this.beatInterval - timeSinceBeat;
    const tolerance = 150;
    return timeSinceBeat <= tolerance || timeToNextBeat <= tolerance;
  }

  activateCell(cell: GridCell, now: number, speed: number = 0) {
    if (this.isVictory) return;

    if (!this.isOnBeat(now)) {
      this.registerError(cell.x, cell.y, now);
      return;
    }

    cell.phase = (cell.phase + 0.5) % 1;
    cell.hue = 20 + (1 - cell.phase) * 180;
    cell.brightness = 0.7 + cell.phase * 0.3;
    cell.activated = true;
    cell.activatedAt = now;
    cell.rippleStart = now;

    this.trail.push({
      x: cell.x,
      y: cell.y,
      time: now,
      speed
    });

    this.playTone(cell.pitch, 0.15);

    this.checkPatternMatch(now);
  }

  private registerError(x: number, y: number, now: number) {
    this.errorMarks.push({ x, y, time: now });
    this.errorCount++;
    this.playDiscord();
    if (this.onError) this.onError();

    if (this.errorCount >= 5) {
      this.resetProgress(now);
    }
  }

  private resetProgress(now: number) {
    this.errorCount = 0;
    this.progress = 0;
    this.memories.forEach(m => {
      m.unlocked = false;
      m.unlockedAt = 0;
    });
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        this.cells[r][c].memoryUnlocked = false;
      }
    }
    this.resetMessageTime = now;
    if (this.onProgressUpdate) this.onProgressUpdate(0, this.totalProgress);
    if (this.onResetMessage) this.onResetMessage();
  }

  private checkPatternMatch(now: number) {
    const activeCells: Array<{ row: number; col: number }> = [];
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.cells[r][c].activated && now - this.cells[r][c].activatedAt < 1500) {
          activeCells.push({ row: r, col: c });
        }
      }
    }

    if (activeCells.length < 3) return;

    for (const memory of this.memories) {
      if (memory.unlocked) continue;

      const allActive = memory.cells.every(patternCell =>
        activeCells.some(ac => ac.row === patternCell.row && ac.col === patternCell.col)
      );

      if (allActive && this.isValidPattern(memory.cells)) {
        this.unlockMemory(memory, now);
        break;
      }
    }
  }

  private isValidPattern(cells: Array<{ row: number; col: number }>): boolean {
    if (cells.length < 3) return false;

    const rows = new Set(cells.map(c => c.row));
    const cols = new Set(cells.map(c => c.col));

    if (rows.size === 1) {
      const sortedCols = [...cols].sort((a, b) => a - b);
      for (let i = 1; i < sortedCols.length; i++) {
        if (sortedCols[i] - sortedCols[i - 1] !== 1) return false;
      }
      return true;
    }

    if (cols.size === 1) {
      const sortedRows = [...rows].sort((a, b) => a - b);
      for (let i = 1; i < sortedRows.length; i++) {
        if (sortedRows[i] - sortedRows[i - 1] !== 1) return false;
      }
      return true;
    }

    return this.isLShape(cells) || this.isTShape(cells);
  }

  private isLShape(cells: Array<{ row: number; col: number }>): boolean {
    if (cells.length < 3) return false;
    const rows = [...new Set(cells.map(c => c.row))].sort((a, b) => a - b);
    const cols = [...new Set(cells.map(c => c.col))].sort((a, b) => a - b);

    if (rows.length !== 2 || cols.length !== 2) return false;

    const cornerCount = cells.filter(c =>
      (c.row === rows[0] || c.row === rows[1]) && (c.col === cols[0] || c.col === cols[1])
    ).length;

    return cells.length >= 3 && cornerCount >= 3;
  }

  private isTShape(cells: Array<{ row: number; col: number }>): boolean {
    if (cells.length < 3) return false;
    const rows = [...new Set(cells.map(c => c.row))].sort((a, b) => a - b);
    const cols = [...new Set(cells.map(c => c.col))].sort((a, b) => a - b);

    if (rows.length < 2 || cols.length < 2) return false;

    for (const r of rows) {
      const rowCells = cells.filter(c => c.row === r);
      if (rowCells.length >= 2) {
        const rowCols = rowCells.map(c => c.col).sort((a, b) => a - b);
        for (let i = 1; i < rowCols.length; i++) {
          if (rowCols[i] - rowCols[i - 1] !== 1) return false;
        }
        const otherRows = rows.filter(rr => rr !== r);
        for (const or_ of otherRows) {
          const otherCell = cells.find(c => c.row === or_);
          if (otherCell && rowCols.includes(otherCell.col)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private unlockMemory(memory: MemoryFragment, now: number) {
    memory.unlocked = true;
    memory.unlockedAt = now;

    memory.cells.forEach(({ row, col }) => {
      const cell = this.cells[row][col];
      cell.memoryUnlocked = true;
      cell.flashAt = now;
      this.flashCells.push({ row, col, time: now });
      this.playTone(cell.pitch, 0.3);
    });

    this.progress++;
    if (this.onProgressUpdate) this.onProgressUpdate(this.progress, this.totalProgress);
    if (this.onMemoryUnlocked) this.onMemoryUnlocked(memory);

    if (this.progress >= this.totalProgress) {
      this.isVictory = true;
      this.victoryTime = now;
      if (this.onVictory) this.onVictory();
    }
  }

  private playTone(frequency: number, duration: number) {
    if (!this.audioContext) return;
    try {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      osc.start();
      osc.stop(this.audioContext.currentTime + duration);
    } catch { }
  }

  private playDiscord() {
    if (!this.audioContext) return;
    try {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 100;
      gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      osc.start();
      osc.stop(this.audioContext.currentTime + 0.2);
    } catch { }
  }
}
