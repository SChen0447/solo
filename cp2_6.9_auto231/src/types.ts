export type NodeType = 'dialog' | 'choice' | 'event';

export interface StoryNode {
  id: string;
  type: NodeType;
  title: string;
  content: string;
  x: number;
  y: number;
  choices?: StoryChoice[];
  eventData?: string;
}

export interface StoryChoice {
  id: string;
  label: string;
  nextNodeId: string | null;
}

export interface StoryConnection {
  id: string;
  fromNodeId: string;
  fromChoiceId?: string;
  toNodeId: string;
  label?: string;
}

export interface StoryGraph {
  nodes: StoryNode[];
  connections: StoryConnection[];
  rootNodeId: string | null;
}

export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 160;
export const NODE_HEADER_HEIGHT = 36;
export const OUTPUT_PORT_OFFSET_Y = NODE_HEIGHT;
export const INPUT_PORT_OFFSET_Y = 0;
