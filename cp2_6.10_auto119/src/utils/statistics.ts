export type RenderStatus = 'not-rendered' | 'rendering' | 're-rendered' | 'cache-hit';

export interface ComponentNode {
  id: string;
  name: string;
  status: RenderStatus;
  children: ComponentNode[];
  parentId: string | null;
}

export interface RenderRecord {
  id: string;
  componentId: string;
  componentName: string;
  startTime: number;
  duration: number;
  isReRender: boolean;
}

export interface FlameNode {
  name: string;
  duration: number;
  children: FlameNode[];
  depth: number;
}

export interface ComponentStats {
  componentId: string;
  componentName: string;
  renderCount: number;
  avgDuration: number;
  maxDuration: number;
}

export interface PerformanceTip {
  componentId: string;
  componentName: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
}

export interface TrackerState {
  isTracking: boolean;
  componentTree: ComponentNode[];
  renderRecords: RenderRecord[];
  selectedComponentId: string | null;
  threshold: number;
  stats: {
    totalRenders: number;
    avgDuration: number;
    tips: PerformanceTip[];
  };
}

export type SortField = 'componentName' | 'renderCount' | 'avgDuration' | 'maxDuration';
export type SortDirection = 'asc' | 'desc';

export function calculateAvgDuration(records: RenderRecord[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((sum, r) => sum + r.duration, 0);
  return Math.round((total / records.length) * 100) / 100;
}

export function calculateComponentStats(records: RenderRecord[]): ComponentStats[] {
  const map = new Map<string, ComponentStats>();
  records.forEach((r) => {
    const existing = map.get(r.componentId);
    if (existing) {
      existing.renderCount += 1;
      existing.avgDuration = (existing.avgDuration * (existing.renderCount - 1) + r.duration) / existing.renderCount;
      existing.maxDuration = Math.max(existing.maxDuration, r.duration);
    } else {
      map.set(r.componentId, {
        componentId: r.componentId,
        componentName: r.componentName,
        renderCount: 1,
        avgDuration: r.duration,
        maxDuration: r.duration,
      });
    }
  });
  return Array.from(map.values()).map((s) => ({
    ...s,
    avgDuration: Math.round(s.avgDuration * 100) / 100,
    maxDuration: Math.round(s.maxDuration * 100) / 100,
  }));
}

export function sortStats(
  stats: ComponentStats[],
  field: SortField,
  direction: SortDirection
): ComponentStats[] {
  return [...stats].sort((a, b) => {
    let cmp = 0;
    if (field === 'componentName') {
      cmp = a.componentName.localeCompare(b.componentName);
    } else {
      cmp = (a[field] as number) - (b[field] as number);
    }
    return direction === 'asc' ? cmp : -cmp;
  });
}

export function paginate<T>(items: T[], page: number, perPage: number): T[] {
  const start = (page - 1) * perPage;
  return items.slice(start, start + perPage);
}

export function generatePerformanceTips(
  stats: ComponentStats[],
  records: RenderRecord[]
): PerformanceTip[] {
  const tips: PerformanceTip[] = [];
  stats.forEach((s) => {
    if (s.renderCount > 20 && s.avgDuration > 5) {
      tips.push({
        componentId: s.componentId,
        componentName: s.componentName,
        message: `发现${s.componentName}组件重渲染频率过高（${s.renderCount}次，平均${s.avgDuration}ms），建议使用React.memo`,
        severity: 'warning',
      });
    } else if (s.maxDuration > 30) {
      tips.push({
        componentId: s.componentId,
        componentName: s.componentName,
        message: `${s.componentName}组件单次渲染耗时较长（最慢${s.maxDuration}ms），建议拆分或优化渲染逻辑`,
        severity: 'error',
      });
    }
  });
  const reRenderCount = records.filter((r) => r.isReRender).length;
  if (reRenderCount > records.length * 0.5 && records.length > 10) {
    tips.push({
      componentId: 'global',
      componentName: '全局',
      message: `整体重渲染比例偏高（${Math.round((reRenderCount / records.length) * 100)}%），建议检查状态管理和Props传递`,
      severity: 'info',
    });
  }
  return tips;
}
