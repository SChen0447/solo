export interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  parentId: string | null;
  fontSize: number;
  color: string;
  shape: 'rectangle' | 'rounded' | 'ellipse';
  editingUserId: string | null;
  collapsed: boolean;
}

export interface MindMapEdge {
  id: string;
  sourceId: string;
  targetId: string;
}

export interface RemoteUser {
  id: string;
  color: string;
  name: string;
  cursorX: number;
  cursorY: number;
  editingNodeId: string | null;
}

export type ThemeName = 'minimal' | 'cyber' | 'green';

export interface ThemeColors {
  bg: string;
  panelBg: string;
  panelBorder: string;
  cardBg: string;
  cardBorder: string;
  cardText: string;
  lineColor: string;
  gridColor: string;
  accent: string;
  accentText: string;
  selectedBorder: string;
  hoverBg: string;
  treeItemActive: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  buttonBg: string;
  buttonText: string;
  shadow: string;
}

export type Action =
  | { type: 'ADD_NODE'; payload: { id: string; text: string; x: number; y: number; parentId: string | null; userId: string } }
  | { type: 'MOVE_NODE'; payload: { id: string; x: number; y: number; userId: string } }
  | { type: 'UPDATE_NODE_TEXT'; payload: { id: string; text: string; userId: string } }
  | { type: 'DELETE_NODE'; payload: { id: string; userId: string } }
  | { type: 'UPDATE_NODE_STYLE'; payload: { id: string; fontSize?: number; color?: string; shape?: 'rectangle' | 'rounded' | 'ellipse'; userId: string } }
  | { type: 'SELECT_NODE'; payload: { id: string | null } }
  | { type: 'SET_EDITING'; payload: { id: string | null; userId: string } }
  | { type: 'TOGGLE_COLLAPSE'; payload: { id: string } }
  | { type: 'SET_THEME'; payload: { theme: ThemeName } }
  | { type: 'UPDATE_REMOTE_USER'; payload: { user: RemoteUser } }
  | { type: 'REMOVE_REMOTE_USER'; payload: { userId: string } }
  | { type: 'SET_CONNECTED'; payload: { connected: boolean } }
  | { type: 'SET_USER_ID'; payload: { userId: string } }
  | { type: 'COLLISION_ALERT'; payload: { nodeId: string; userId: string; userName: string } }
  | { type: 'DISMISS_COLLISION'; payload: {} };

export interface AppState {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  selectedNodeId: string | null;
  theme: ThemeName;
  remoteUsers: Record<string, RemoteUser>;
  userId: string;
  connected: boolean;
  collision: { nodeId: string; userId: string; userName: string } | null;
}
