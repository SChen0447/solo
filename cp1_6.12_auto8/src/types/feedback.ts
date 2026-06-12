export type UrgencyLevel = 'normal' | 'urgent' | 'critical'

export type FeedbackStatus = 'pending' | 'processing' | 'resolved'

export interface Feedback {
  id: string
  title: string
  source: string
  description: string
  urgency: UrgencyLevel
  status: FeedbackStatus
  createdAt: number
  updatedAt: number
  order: number
}

export interface FeedbackFilters {
  searchKeyword: string
  urgency: UrgencyLevel | 'all'
  status: FeedbackStatus | 'all'
}

export type ViewMode = 'list' | 'kanban'

export interface Statistics {
  todayCount: number
  pendingCount: number
  avgResponseTime: number
}
