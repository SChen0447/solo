export type EmotionLabel = 'happy' | 'sad' | 'angry' | 'surprise' | 'fear' | 'disgust'

export interface EmotionScore {
  label: EmotionLabel
  name: string
  emoji: string
  confidence: number
  color: string
}

export interface EmotionResult {
  scores: EmotionScore[]
  dominant: EmotionScore
  timestamp: number
}

export const EMOTIONS: Omit<EmotionScore, 'confidence'>[] = [
  { label: 'happy', name: '高兴', emoji: '😊', color: '#22c55e' },
  { label: 'sad', name: '悲伤', emoji: '😢', color: '#6366f1' },
  { label: 'angry', name: '愤怒', emoji: '😡', color: '#ef4444' },
  { label: 'surprise', name: '惊讶', emoji: '😲', color: '#f59e0b' },
  { label: 'fear', name: '恐惧', emoji: '😨', color: '#a855f7' },
  { label: 'disgust', name: '厌恶', emoji: '🤢', color: '#84cc16' }
]

export const EMOTION_LABELS: EmotionLabel[] = ['happy', 'sad', 'angry', 'surprise', 'fear', 'disgust']
