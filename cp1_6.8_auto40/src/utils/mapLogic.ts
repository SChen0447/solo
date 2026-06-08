import { v4 as uuidv4 } from 'uuid';

export interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  collapsed: boolean;
  children: string[];
  parentId: string | null;
}

export interface MindMapData {
  rootId: string | null;
  nodes: Record<string, MindMapNode>;
}

export const DEFAULT_COLORS = [
  '#4A90D9', '#7B68EE', '#9370DB', '#BA55D3',
  '#FF6B9D', '#FF8C69', '#FFB347', '#FFD700',
  '#7CCD7C', '#45B7D1', '#5DADE2', '#85929E'
];

export const DEFAULT_COLOR = '#4A90D9';

export const NODE_WIDTH = 140;
export const NODE_HEIGHT = 40;
export const HORIZONTAL_GAP = 60;
export const VERTICAL_GAP = 20;

export function createMindMapData(): MindMapData {
  return {
    rootId: null,
    nodes: {},
  };
}

export function createNode(
  text: string,
  x: number,
  y: number,
  parentId: string | null = null,
  color: string = DEFAULT_COLOR
): MindMapNode {
  return {
    id: uuidv4(),
    text,
    x,
    y,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    color,
    collapsed: false,
    children: [],
    parentId,
  };
}

export function addNode(
  data: MindMapData,
  node: MindMapNode
): MindMapData {
  const newNodes = { ...data.nodes };
  newNodes[node.id] = node;

  let newRootId = data.rootId;

  if (node.parentId && newNodes[node.parentId]) {
    const parent = { ...newNodes[node.parentId] };
    parent.children = [...parent.children, node.id];
    newNodes[node.parentId] = parent;
    node.color = parent.color;
  } else if (!data.rootId) {
    newRootId = node.id;
  }

  return {
    rootId: newRootId,
    nodes: newNodes,
  };
}

export function deleteNode(data: MindMapData, nodeId: string): MindMapData {
  const node = data.nodes[nodeId];
  if (!node) return data;

  const newNodes = { ...data.nodes };
  const nodesToDelete: string[] = [];

  depthFirstTraverse(data, nodeId, (id) => {
    nodesToDelete.push(id);
  });

  nodesToDelete.forEach((id) => {
    delete newNodes[id];
  });

  if (node.parentId && newNodes[node.parentId]) {
    const parent = { ...newNodes[node.parentId] };
    parent.children = parent.children.filter((id) => id !== nodeId);
    newNodes[node.parentId] = parent;
  }

  let newRootId = data.rootId;
  if (data.rootId === nodeId) {
    newRootId = null;
  }

  return {
    rootId: newRootId,
    nodes: newNodes,
  };
}

export function updateNode(
  data: MindMapData,
  nodeId: string,
  updates: Partial<MindMapNode>
): MindMapData {
  const node = data.nodes[nodeId];
  if (!node) return data;

  const newNodes = { ...data.nodes };
  newNodes[nodeId] = { ...node, ...updates };

  return {
    ...data,
    nodes: newNodes,
  };
}

export function updateNodeText(
  data: MindMapData,
  nodeId: string,
  text: string
): MindMapData {
  return updateNode(data, nodeId, { text });
}

export function updateNodePosition(
  data: MindMapData,
  nodeId: string,
  x: number,
  y: number
): MindMapData {
  return updateNode(data, nodeId, { x, y });
}

export function updateNodeColor(
  data: MindMapData,
  nodeId: string,
  color: string
): MindMapData {
  let newData = updateNode(data, nodeId, { color });
  const node = newData.nodes[nodeId];
  if (!node) return newData;

  depthFirstTraverse(newData, nodeId, (id) => {
    if (id !== nodeId) {
      newData = updateNode(newData, id, { color });
    }
  });

  return newData;
}

export function toggleCollapse(data: MindMapData, nodeId: string): MindMapData {
  const node = data.nodes[nodeId];
  if (!node) return data;
  return updateNode(data, nodeId, { collapsed: !node.collapsed });
}

export function collapseAll(data: MindMapData): MindMapData {
  let newData = { ...data };
  Object.keys(newData.nodes).forEach((id) => {
    const node = newData.nodes[id];
    if (node.children.length > 0) {
      newData = updateNode(newData, id, { collapsed: true });
    }
  });
  return newData;
}

export function expandAll(data: MindMapData): MindMapData {
  let newData = { ...data };
  Object.keys(newData.nodes).forEach((id) => {
    newData = updateNode(newData, id, { collapsed: false });
  });
  return newData;
}

export function depthFirstTraverse(
  data: MindMapData,
  startId: string,
  callback: (nodeId: string, node: MindMapNode) => void
): void {
  const node = data.nodes[startId];
  if (!node) return;

  callback(startId, node);

  if (!node.collapsed) {
    node.children.forEach((childId) => {
      depthFirstTraverse(data, childId, callback);
    });
  }
}

export function getVisibleNodes(data: MindMapData): string[] {
  const visible: string[] = [];
  if (!data.rootId) return visible;

  depthFirstTraverse(data, data.rootId, (id) => {
    visible.push(id);
  });

  return visible;
}

export function isDescendant(
  data: MindMapData,
  ancestorId: string,
  descendantId: string
): boolean {
  const ancestor = data.nodes[ancestorId];
  if (!ancestor) return false;
  if (ancestorId === descendantId) return false;

  for (const childId of ancestor.children) {
    if (childId === descendantId) return true;
    if (isDescendant(data, childId, descendantId)) return true;
  }
  return false;
}

export function getBranchColor(data: MindMapData, nodeId: string): string {
  let currentId: string | null = nodeId;
  while (currentId) {
    const node: MindMapNode | undefined = data.nodes[currentId];
    if (!node) return DEFAULT_COLOR;
    if (node.parentId === null || !data.nodes[node.parentId]) {
      return node.color;
    }
    currentId = node.parentId;
  }
  return DEFAULT_COLOR;
}

export function serializeMindMap(data: MindMapData): string {
  return JSON.stringify(data);
}

export function deserializeMindMap(json: string): MindMapData | null {
  try {
    const parsed = JSON.parse(json);
    if (!parsed.nodes || typeof parsed.nodes !== 'object') {
      return null;
    }
    return parsed as MindMapData;
  } catch {
    return null;
  }
}

export function cloneMindMap(data: MindMapData): MindMapData {
  return JSON.parse(JSON.stringify(data));
}

export function calculateNodeWidth(text: string, fontSize: number = 14): number {
  const baseWidth = 60;
  const charWidth = fontSize * 0.6;
  const textWidth = text.length * charWidth;
  return Math.max(NODE_WIDTH, baseWidth + textWidth);
}

export function snapToGrid(value: number, gridSize: number = 20): number {
  return Math.round(value / gridSize) * gridSize;
}
