export interface GridConfig {
  columns: number;
  rows: number;
  columnWidths: string[];
  rowHeights: string[];
  gap: number;
  templateAreas: string;
}

export interface GridItem {
  id: string;
  number: number;
  color: string;
  gridColumnStart: string;
  gridColumnEnd: string;
  gridRowStart: string;
  gridRowEnd: string;
  gridArea: string;
  justifySelf: 'start' | 'center' | 'end' | 'stretch';
  alignSelf: 'start' | 'center' | 'end' | 'stretch';
  areaName: string;
}

export interface LayoutData {
  gridContainerStyle: {
    display: string;
    gridTemplateColumns: string;
    gridTemplateRows: string;
    gap: string;
    gridTemplateAreas: string;
  };
  items: Array<{
    id: string;
    style: Record<string, string>;
    areaColor?: string;
    areaName?: string;
  }>;
}

export interface ParsedArea {
  name: string;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
}

const LIGHT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8B500', '#00CED1', '#FF69B4', '#32CD32', '#FF7F50',
  '#9370DB', '#20B2AA', '#FFB347', '#87CEEB', '#DDA0DD',
];

const AREA_COLORS = [
  'rgba(233, 69, 96, 0.7)', 'rgba(83, 52, 131, 0.7)',
  'rgba(15, 52, 96, 0.7)', 'rgba(78, 205, 196, 0.7)',
  'rgba(255, 107, 107, 0.7)', 'rgba(150, 206, 180, 0.7)',
  'rgba(221, 160, 221, 0.7)', 'rgba(247, 220, 111, 0.7)',
];

export function generateGridColumns(config: GridConfig): string {
  const { columns, columnWidths } = config;
  const widths: string[] = [];
  for (let i = 0; i < columns; i++) {
    widths.push(columnWidths[i] || '1fr');
  }
  return widths.join(' ');
}

export function generateGridRows(config: GridConfig): string {
  const { rows, rowHeights } = config;
  const heights: string[] = [];
  for (let i = 0; i < rows; i++) {
    heights.push(rowHeights[i] || 'auto');
  }
  return heights.join(' ');
}

export function parseAreaTemplate(template: string): ParsedArea[] {
  const lines = template
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const cells: string[][] = lines.map((line) =>
    line.split(/\s+/).filter((cell) => cell.length > 0)
  );

  if (cells.length === 0) return [];

  const maxCols = Math.max(...cells.map((row) => row.length));
  const normalized = cells.map((row) => {
    const padded = [...row];
    while (padded.length < maxCols) padded.push('.');
    return padded;
  });

  const areaMap = new Map<string, { row: number; col: number; rowSpan: number; colSpan: number }>();
  const visited = new Set<string>();

  for (let r = 0; r < normalized.length; r++) {
    for (let c = 0; c < normalized[r].length; c++) {
      const name = normalized[r][c];
      if (name === '.' || visited.has(`${r},${c}`)) continue;

      let rowSpan = 1;
      let colSpan = 1;

      for (let rr = r; rr < normalized.length && normalized[rr][c] === name; rr++) {
        rowSpan = rr - r + 1;
      }
      for (let cc = c; cc < normalized[r].length && normalized[r][cc] === name; cc++) {
        colSpan = cc - c + 1;
      }

      for (let rr = r; rr < r + rowSpan; rr++) {
        for (let cc = c; cc < c + colSpan; cc++) {
          visited.add(`${rr},${cc}`);
        }
      }

      areaMap.set(name, { row: r + 1, col: c + 1, rowSpan, colSpan });
    }
  }

  return Array.from(areaMap.entries()).map(([name, pos]) => ({
    name,
    row: pos.row,
    col: pos.col,
    rowSpan: pos.rowSpan,
    colSpan: pos.colSpan,
  }));
}

export function getItemPosition(item: GridItem, parsedAreas: ParsedArea[]): {
  gridColumn: string;
  gridRow: string;
  gridArea: string;
} {
  if (item.areaName) {
    const area = parsedAreas.find((a) => a.name === item.areaName);
    if (area) {
      return {
        gridColumn: `${area.col} / ${area.col + area.colSpan}`,
        gridRow: `${area.row} / ${area.row + area.rowSpan}`,
        gridArea: item.areaName,
      };
    }
  }

  const colStart = item.gridColumnStart || 'auto';
  const colEnd = item.gridColumnEnd || 'auto';
  const rowStart = item.gridRowStart || 'auto';
  const rowEnd = item.gridRowEnd || 'auto';

  return {
    gridColumn: `${colStart} / ${colEnd}`,
    gridRow: `${rowStart} / ${rowEnd}`,
    gridArea: item.gridArea,
  };
}

export function getAreaColor(areaName: string): string {
  let hash = 0;
  for (let i = 0; i < areaName.length; i++) {
    hash = areaName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AREA_COLORS.length;
  return AREA_COLORS[index];
}

export function getRandomColor(): string {
  return LIGHT_COLORS[Math.floor(Math.random() * LIGHT_COLORS.length)];
}

export function generateId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function computeLayout(config: GridConfig, items: GridItem[]): LayoutData {
  const parsedAreas = parseAreaTemplate(config.templateAreas);

  const gridContainerStyle: LayoutData['gridContainerStyle'] = {
    display: 'grid',
    gridTemplateColumns: generateGridColumns(config),
    gridTemplateRows: generateGridRows(config),
    gap: `${config.gap}px`,
    gridTemplateAreas: config.templateAreas
      ? config.templateAreas
          .split('\n')
          .map((line) => `"${line.trim()}"`)
          .join('\n')
      : 'none',
  };

  const layoutItems = items.map((item) => {
    const pos = getItemPosition(item, parsedAreas);
    const style: Record<string, string> = {
      gridColumn: pos.gridColumn,
      gridRow: pos.gridRow,
      justifySelf: item.justifySelf,
      alignSelf: item.alignSelf,
      backgroundColor: item.color,
    };

    if (item.gridArea && pos.gridArea) {
      style.gridArea = pos.gridArea;
    }

    const result: LayoutData['items'][number] = {
      id: item.id,
      style,
    };

    if (item.areaName) {
      result.areaColor = getAreaColor(item.areaName);
      result.areaName = item.areaName;
    }

    return result;
  });

  return {
    gridContainerStyle,
    items: layoutItems,
  };
}

export const PRESET_LAYOUTS: Record<string, {
  name: string;
  config: Partial<GridConfig>;
  items: Array<Partial<GridItem> & { areaName: string }>;
}> = {
  threeColumn: {
    name: '经典三栏式',
    config: {
      columns: 3,
      rows: 3,
      columnWidths: ['1fr', '2fr', '1fr'],
      rowHeights: ['80px', '1fr', '60px'],
      templateAreas:
        'header header header\n' +
        'sidebar main sidebar2\n' +
        'footer footer footer',
    },
    items: [
      { areaName: 'header' },
      { areaName: 'sidebar' },
      { areaName: 'main' },
      { areaName: 'sidebar2' },
      { areaName: 'footer' },
    ],
  },
  dashboard: {
    name: '仪表盘2x2',
    config: {
      columns: 2,
      rows: 2,
      columnWidths: ['1fr', '1fr'],
      rowHeights: ['1fr', '1fr'],
      templateAreas:
        'panel1 panel2\n' +
        'panel3 panel4',
    },
    items: [
      { areaName: 'panel1' },
      { areaName: 'panel2' },
      { areaName: 'panel3' },
      { areaName: 'panel4' },
    ],
  },
  magazine: {
    name: '杂志封面混合式',
    config: {
      columns: 4,
      rows: 3,
      columnWidths: ['1fr', '1fr', '1fr', '1fr'],
      rowHeights: ['120px', '1fr', '80px'],
      templateAreas:
        'hero hero hero hero\n' +
        'article article sidebar sidebar\n' +
        'ad ad ad footer',
    },
    items: [
      { areaName: 'hero' },
      { areaName: 'article' },
      { areaName: 'sidebar' },
      { areaName: 'ad' },
      { areaName: 'footer' },
    ],
  },
};
