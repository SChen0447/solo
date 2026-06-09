export interface MindMapNode {
  id: string
  text: string
  x: number
  y: number
  color: string
  parentId: string | null
  collapsed: boolean
  createdAt: number
  updatedAt: number
}

export interface Connection {
  id: string
  fromId: string
  toId: string
  label?: string
}

export interface MindMapData {
  nodes: Record<string, MindMapNode>
  connections: Record<string, Connection>
  rootId: string
}

export interface UserCursor {
  userId: string
  userName: string
  nodeId: string | null
  x: number
  y: number
  color: string
}

export interface WSMessage {
  type: 'sync' | 'cursor' | 'op' | 'hello' | 'ack'
  payload: any
  timestamp: number
  userId: string
}

export interface Operation {
  type: 'add_node' | 'update_node' | 'delete_node' | 'add_connection' | 'update_connection' | 'delete_connection'
  data: any
  timestamp: number
}

export interface ViewTransform {
  scale: number
  offsetX: number
  offsetY: number
}

export interface HistoryState {
  undoStack: Operation[][]
  redoStack: Operation[][]
}
