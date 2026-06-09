export interface QuestionOption {
  key: string
  text: string
}

export interface Question {
  id: string
  text: string
  options: QuestionOption[]
  correctAnswer: string
  duration: number
}

export interface Player {
  id: string
  name: string
  score: number
  lastUpdated?: number
}

export interface AnswerSubmission {
  playerId: string
  questionId: string
  answer: string
}

export type QuestionPhase = 'idle' | 'active' | 'revealed'
