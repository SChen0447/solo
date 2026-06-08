export type ElementType = 'button' | 'card' | 'modal' | 'slider'

export type TriggerType = 'click' | 'hover' | 'drag'

export type AnimationType = 'scale' | 'rotate' | 'translate' | 'fade'

export interface ElementStyle {
  x: number
  y: number
  width: number
  height: number
  rotation: number
  opacity: number
}

export interface InteractionTrigger {
  type: TriggerType
  animation: AnimationType
  duration: number
  easing: string
  targetValue: number
}

export interface PrototypeElement {
  id: string
  type: ElementType
  style: ElementStyle
  label: string
  triggers: InteractionTrigger[]
}

export interface Keyframe {
  id: string
  elementId: string
  timestamp: number
  property: keyof ElementStyle | 'interaction'
  value: number | string
  interactionType?: TriggerType
}

export interface AnimationTimeline {
  id: string
  name: string
  duration: number
  keyframes: Keyframe[]
  createdAt: number
}

export interface HistoryState {
  elements: PrototypeElement[]
  selectedId: string | null
}

export interface AnimationState {
  isPlaying: boolean
  isRecording: boolean
  currentTime: number
  duration: number
  playbackSpeed: number
}

export type ToolType = 'select' | ElementType

export interface ExportData {
  version: string
  elements: PrototypeElement[]
  timeline: AnimationTimeline | null
  exportedAt: number
}
