export interface DialogueNode {
  id: string;
  parentId: string | null;
  content: string;
  angerDelta: number;
  sadnessDelta: number;
  joyDelta: number;
  childIds: string[];
}

export interface EmotionDataPoint {
  depth: number;
  nodeId: string;
  anger: number;
  sadness: number;
  joy: number;
}

export interface NodePosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
