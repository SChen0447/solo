export interface GraphNode {
  id: string;
  title: string;
  x: number;
  y: number;
  category: 'math' | 'programming' | 'design';
  color: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  style: 'solid' | 'dashed';
  label: string;
}

export interface TopologyResult {
  order: string[];
  hasCycle: boolean;
  cycleNodes: string[];
  layers: string[][];
}

export type ViewMode = 'edit' | 'preview';

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  nodeId: string | null;
}
