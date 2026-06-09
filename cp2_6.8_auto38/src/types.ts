export interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  parentId: string | null;
  collapsed: boolean;
  color: string;
  creatorColor: string;
  children: string[];
}

export interface User {
  id: string;
  name: string;
  color: string;
  socketId: string;
  cursorPosition?: { nodeId: string; offset: number };
}

export interface JoinRoomResult {
  success: boolean;
  user?: User;
  users?: User[];
  nodes?: Record<string, MindMapNode>;
  error?: string;
}
