export type NodeType = 'town' | 'monster' | 'treasure' | 'start' | 'boss' | 'forest' | 'mountain'

export interface MapNode {
  id: number
  type: NodeType
  x: number
  y: number
  name: string
  connectedTo: number[]
}

export type EventType = 'combat' | 'treasure' | 'story' | 'shop' | 'rest'

export interface EventOption {
  id: string
  text: string
  effect: {
    health?: number
    gold?: number
    message: string
  }
}

export interface GameEvent {
  id: string
  title: string
  description: string
  type: EventType
  options: EventOption[]
}

export type LogType = 'info' | 'success' | 'danger' | 'gold' | 'turn'

export interface LogEntry {
  id: number
  message: string
  type: LogType
  timestamp: number
}

export interface GameState {
  health: number
  maxHealth: number
  gold: number
  turn: number
  currentNodeId: number
  isMoving: boolean
  isRolling: boolean
  eventLog: LogEntry[]
  currentEvent: GameEvent | null
  showEventDialog: boolean
}

export interface Position {
  x: number
  y: number
}
