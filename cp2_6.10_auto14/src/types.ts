export interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: 'circle' | 'rect';
  collapsed: boolean;
  parentId: string | null;
}

export interface MindMapEdge {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface MindMapData {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

export interface CanvasState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface HistoryState {
  data: MindMapData;
  timestamp: number;
}
