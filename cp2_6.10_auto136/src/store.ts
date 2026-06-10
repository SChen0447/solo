import { v4 as uuidv4 } from 'uuid'
import { AnimationElement, AnimationStatus, AppState, EasingType, PathNode, SCENE_WIDTH, SCENE_HEIGHT } from './types'

const COLORS = ['#76d7c4', '#f5b041', '#a569bd', '#5dade2', '#ec7063', '#58d68d']
const ELEMENT_NAMES = ['红球', '蓝方块', '绿圆', '紫菱形', '橙三角', '粉矩形', '青多边形', '黄星形']

let nameIndex = 0

const randomColor = (): string => COLORS[Math.floor(Math.random() * COLORS.length)]

const nextName = (): string => {
  const name = ELEMENT_NAMES[nameIndex % ELEMENT_NAMES.length]
  nameIndex++
  const suffix = nameIndex > ELEMENT_NAMES.length ? `${Math.floor((nameIndex - 1) / ELEMENT_NAMES.length) + 1}` : ''
  return `${name}${suffix}`
}

const createDefaultPathNodes = (): PathNode[] => [
  { id: uuidv4(), x: 0, y: SCENE_HEIGHT / 2 },
  { id: uuidv4(), x: 300, y: SCENE_HEIGHT / 2 }
]

export const createNewElement = (): AnimationElement => ({
  id: uuidv4(),
  name: nextName(),
  color: randomColor(),
  pathNodes: createDefaultPathNodes(),
  duration: 2,
  delay: 0,
  iterationCount: 'infinite',
  easing: 'ease-in-out',
  status: 'paused'
})

const initialElement = createNewElement()

export const initialState: AppState = {
  elements: [initialElement],
  selectedElementId: initialElement.id,
  splitScreen: false,
  isPlaying: false,
  currentTime: 0,
  selectedNodeId: null
}

type Action =
  | { type: 'ADD_ELEMENT' }
  | { type: 'REMOVE_ELEMENT'; payload: string }
  | { type: 'SELECT_ELEMENT'; payload: string | null }
  | { type: 'UPDATE_ELEMENT'; payload: { id: string; patch: Partial<AnimationElement> } }
  | { type: 'ADD_PATH_NODE'; payload: string }
  | { type: 'REMOVE_PATH_NODE'; payload: string }
  | { type: 'UPDATE_PATH_NODE'; payload: { elementId: string; nodeId: string; x: number; y: number } }
  | { type: 'SELECT_NODE'; payload: string | null }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'STOP_ANIMATION' }
  | { type: 'RESET_ANIMATION' }
  | { type: 'TOGGLE_SPLIT_SCREEN' }
  | { type: 'SET_CURRENT_TIME'; payload: number }

export const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'ADD_ELEMENT': {
      const newEl = createNewElement()
      return {
        ...state,
        elements: [...state.elements, newEl],
        selectedElementId: newEl.id
      }
    }
    case 'REMOVE_ELEMENT': {
      const remaining = state.elements.filter(e => e.id !== action.payload)
      return {
        ...state,
        elements: remaining,
        selectedElementId: remaining.length > 0 ? remaining[0].id : null,
        selectedNodeId: null
      }
    }
    case 'SELECT_ELEMENT':
      return { ...state, selectedElementId: action.payload, selectedNodeId: null }
    case 'UPDATE_ELEMENT': {
      return {
        ...state,
        elements: state.elements.map(e =>
          e.id === action.payload.id ? { ...e, ...action.payload.patch } : e
        )
      }
    }
    case 'ADD_PATH_NODE': {
      return {
        ...state,
        elements: state.elements.map(e => {
          if (e.id !== action.payload) return e
          if (e.pathNodes.length >= 8) return e
          const last = e.pathNodes[e.pathNodes.length - 1]
          const newNode: PathNode = {
            id: uuidv4(),
            x: Math.min(last.x + 80, SCENE_WIDTH - 10),
            y: last.y
          }
          return { ...e, pathNodes: [...e.pathNodes, newNode] }
        })
      }
    }
    case 'REMOVE_PATH_NODE': {
      return {
        ...state,
        elements: state.elements.map(e => {
          if (e.id !== action.payload) return e
          if (e.pathNodes.length <= 2) return e
          return { ...e, pathNodes: e.pathNodes.slice(0, -1) }
        })
      }
    }
    case 'UPDATE_PATH_NODE': {
      const { elementId, nodeId, x, y } = action.payload
      return {
        ...state,
        elements: state.elements.map(e => {
          if (e.id !== elementId) return e
          return {
            ...e,
            pathNodes: e.pathNodes.map(n =>
              n.id === nodeId ? { ...n, x: Math.max(0, Math.min(SCENE_WIDTH, x)), y: Math.max(0, Math.min(SCENE_HEIGHT, y)) } : n
            )
          }
        })
      }
    }
    case 'SELECT_NODE':
      return { ...state, selectedNodeId: action.payload }
    case 'TOGGLE_PLAY': {
      const newPlaying = !state.isPlaying
      const newStatus: AnimationStatus = newPlaying ? 'playing' : 'paused'
      return {
        ...state,
        isPlaying: newPlaying,
        elements: state.elements.map(e => ({ ...e, status: newPlaying ? 'playing' : e.status === 'playing' ? 'paused' : e.status }))
      }
    }
    case 'STOP_ANIMATION':
      return {
        ...state,
        isPlaying: false,
        currentTime: 0,
        elements: state.elements.map(e => ({ ...e, status: 'stopped' }))
      }
    case 'RESET_ANIMATION':
      return {
        ...state,
        isPlaying: false,
        currentTime: 0,
        elements: state.elements.map(e => ({ ...e, status: 'paused' }))
      }
    case 'TOGGLE_SPLIT_SCREEN':
      return { ...state, splitScreen: !state.splitScreen }
    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload }
    default:
      return state
  }
}
