export type NodeType = 'person' | 'event' | 'concept';

export interface KnowledgeNode {
  id: string;
  title: string;
  description: string;
  type: NodeType;
  color: string;
  x: number;
  y: number;
  links: string[];
  createdAt: number;
}

export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  createdAt: number;
}

export interface CursorData {
  userId: string;
  name: string;
  color: string;
  x: number;
  y: number;
}

export const NODE_COLORS: Record<NodeType, string> = {
  person: '#9b8ec4',
  event: '#e8a87c',
  concept: '#7fb5b5',
};

export const PRESET_RELATIONS = [
  '影响',
  '起源',
  '包含',
  '对立',
  '类比',
  '合作',
];

export const PRESET_COLORS = [
  '#9b8ec4',
  '#e8a87c',
  '#7fb5b5',
  '#e85d75',
  '#5db8e8',
  '#e8d75d',
  '#5de8a8',
  '#e85dba',
  '#8ec49b',
  '#c49b8e',
  '#8e9bc4',
  '#c4b58e',
];

export const NODE_RADIUS = 40;
