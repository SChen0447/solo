export interface GridConfig {
  columns: number;
  gap: number;
  containerWidth: number;
  breakpoint: BreakpointKey | null;
}

export type BreakpointKey = 'mobile' | 'tablet' | 'desktop';

export interface Breakpoint {
  key: BreakpointKey;
  label: string;
  width: number;
}

export const BREAKPOINTS: Record<BreakpointKey, Breakpoint> = {
  mobile: { key: 'mobile', label: '手机', width: 360 },
  tablet: { key: 'tablet', label: '平板', width: 768 },
  desktop: { key: 'desktop', label: '桌面', width: 1200 }
};

export interface GridColumn {
  index: number;
  x: number;
  width: number;
}

export interface GridNodeData {
  columns: GridColumn[];
  gap: number;
  containerWidth: number;
  totalWidth: number;
  columnWidth: number;
}

export interface ContentBlock {
  id: string;
  color: string;
  startColumn: number;
  spanColumns: number;
  y: number;
  height: number;
}

export interface SavedConfig {
  id: string;
  name: string;
  config: GridConfig;
  blocks: ContentBlock[];
  timestamp: number;
}

type Listener = () => void;

export class GridEngine {
  private config: GridConfig;
  private blocks: ContentBlock[];
  private listeners: Set<Listener> = new Set();
  private savedConfigs: SavedConfig[] = [];
  private readonly STORAGE_KEY = 'grid-designer-configs';
  private readonly LAST_CONFIG_KEY = 'grid-designer-last-config';
  private readonly MAX_SAVED = 3;

  constructor() {
    this.config = this.loadLastConfig() ?? {
      columns: 12,
      gap: 20,
      containerWidth: 1200,
      breakpoint: null
    };
    this.blocks = this.loadLastBlocks() ?? [
      { id: 'block-red', color: '#E53E3E', startColumn: 0, spanColumns: 4, y: 60, height: 80 },
      { id: 'block-blue', color: '#2B6CB0', startColumn: 4, spanColumns: 4, y: 60, height: 80 },
      { id: 'block-green', color: '#38A169', startColumn: 8, spanColumns: 4, y: 160, height: 80 }
    ];
    this.savedConfigs = this.loadSavedConfigs();
  }

  private loadLastConfig(): GridConfig | null {
    try {
      const raw = localStorage.getItem(this.LAST_CONFIG_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private loadLastBlocks(): ContentBlock[] | null {
    try {
      const raw = localStorage.getItem(this.LAST_CONFIG_KEY + '-blocks');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private loadSavedConfigs(): SavedConfig[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private persistLastConfig(): void {
    localStorage.setItem(this.LAST_CONFIG_KEY, JSON.stringify(this.config));
    localStorage.setItem(this.LAST_CONFIG_KEY + '-blocks', JSON.stringify(this.blocks));
  }

  private persistSavedConfigs(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.savedConfigs));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    this.persistLastConfig();
    this.listeners.forEach(fn => fn());
  }

  getConfig(): GridConfig {
    return { ...this.config };
  }

  setColumns(columns: number): void {
    this.config.columns = Math.max(2, Math.min(12, columns));
    this.blocks.forEach(block => {
      if (block.startColumn + block.spanColumns > this.config.columns) {
        block.spanColumns = Math.min(block.spanColumns, this.config.columns - block.startColumn);
        if (block.spanColumns < 1) block.spanColumns = 1;
      }
    });
    this.emit();
  }

  setGap(gap: number): void {
    this.config.gap = Math.max(0, Math.min(40, gap));
    this.emit();
  }

  setContainerWidth(width: number): void {
    this.config.containerWidth = Math.max(600, Math.min(1400, width));
    this.config.breakpoint = null;
    this.emit();
  }

  setBreakpoint(key: BreakpointKey | null): void {
    this.config.breakpoint = key;
    if (key) {
      this.config.containerWidth = BREAKPOINTS[key].width;
    }
    this.emit();
  }

  getBlocks(): ContentBlock[] {
    return this.blocks.map(b => ({ ...b }));
  }

  updateBlock(id: string, updates: Partial<ContentBlock>): void {
    const block = this.blocks.find(b => b.id === id);
    if (!block) return;

    if (updates.startColumn !== undefined) {
      const maxStart = this.config.columns - block.spanColumns;
      updates.startColumn = Math.max(0, Math.min(maxStart, updates.startColumn));
    }
    if (updates.spanColumns !== undefined) {
      const maxSpan = Math.min(6, this.config.columns - block.startColumn);
      updates.spanColumns = Math.max(1, Math.min(maxSpan, updates.spanColumns));
    }

    Object.assign(block, updates);
    this.emit();
  }

  computeGrid(): GridNodeData {
    const { columns, gap, containerWidth } = this.config;
    const totalGap = gap * (columns - 1);
    const columnWidth = (containerWidth - totalGap) / columns;

    const cols: GridColumn[] = [];
    for (let i = 0; i < columns; i++) {
      cols.push({
        index: i,
        x: i * (columnWidth + gap),
        width: columnWidth
      });
    }

    return {
      columns: cols,
      gap,
      containerWidth,
      totalWidth: containerWidth,
      columnWidth
    };
  }

  snapToGrid(x: number): number {
    const grid = this.computeGrid();
    const snapPoints: number[] = [];
    grid.columns.forEach(col => {
      snapPoints.push(col.x);
      snapPoints.push(col.x + col.width);
    });
    snapPoints.push(grid.totalWidth);

    let nearest = snapPoints[0];
    let minDist = Math.abs(x - nearest);
    for (const p of snapPoints) {
      const dist = Math.abs(x - p);
      if (dist < minDist) {
        minDist = dist;
        nearest = p;
      }
    }
    return nearest;
  }

  getColumnFromX(x: number): number {
    const grid = this.computeGrid();
    for (let i = 0; i < grid.columns.length; i++) {
      const col = grid.columns[i];
      if (x >= col.x && x <= col.x + col.width + grid.gap / 2) {
        return i;
      }
    }
    return grid.columns.length - 1;
  }

  getSpanFromWidth(widthPx: number): number {
    const grid = this.computeGrid();
    if (grid.columnWidth <= 0) return 1;
    const span = Math.round((widthPx + grid.gap) / (grid.columnWidth + grid.gap));
    return Math.max(1, Math.min(6, span));
  }

  generateCSS(): string {
    const grid = this.computeGrid();
    const { columns, gap, breakpoint } = this.config;
    const mediaQuery = breakpoint
      ? `@media (min-width: ${BREAKPOINTS[breakpoint].width}px) {\n  `
      : '';
    const mediaClose = breakpoint ? '\n}' : '';

    return `${mediaQuery}:root {
  --grid-columns: ${columns};
  --grid-gap: ${gap}px;
  --grid-column-width: ${grid.columnWidth.toFixed(2)}px;
  --grid-container-width: ${grid.totalWidth}px;
}

.grid-container {
  width: var(--grid-container-width);
  max-width: 100%;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(var(--grid-columns), 1fr);
  gap: var(--grid-gap);
  padding: 0;
}

.grid-col {
  min-height: 1px;
  background: rgba(43, 108, 176, 0.05);
}${mediaClose}`;
  }

  saveConfig(name: string): boolean {
    if (this.savedConfigs.length >= this.MAX_SAVED) {
      this.savedConfigs.shift();
    }
    const saved: SavedConfig = {
      id: 'cfg-' + Date.now(),
      name,
      config: { ...this.config },
      blocks: this.blocks.map(b => ({ ...b })),
      timestamp: Date.now()
    };
    this.savedConfigs.push(saved);
    this.persistSavedConfigs();
    this.emit();
    return true;
  }

  loadConfig(id: string): boolean {
    const saved = this.savedConfigs.find(s => s.id === id);
    if (!saved) return false;
    this.config = { ...saved.config };
    this.blocks = saved.blocks.map(b => ({ ...b }));
    this.emit();
    return true;
  }

  deleteConfig(id: string): boolean {
    const idx = this.savedConfigs.findIndex(s => s.id === id);
    if (idx === -1) return false;
    this.savedConfigs.splice(idx, 1);
    this.persistSavedConfigs();
    this.emit();
    return true;
  }

  getSavedConfigs(): SavedConfig[] {
    return [...this.savedConfigs];
  }

  resetConfig(): void {
    this.config = {
      columns: 12,
      gap: 20,
      containerWidth: 1200,
      breakpoint: null
    };
    this.blocks = [
      { id: 'block-red', color: '#E53E3E', startColumn: 0, spanColumns: 4, y: 60, height: 80 },
      { id: 'block-blue', color: '#2B6CB0', startColumn: 4, spanColumns: 4, y: 60, height: 80 },
      { id: 'block-green', color: '#38A169', startColumn: 8, spanColumns: 4, y: 160, height: 80 }
    ];
    this.emit();
  }
}
