import Mock from 'mockjs'
import type { Feedback, UrgencyLevel, FeedbackStatus } from '@/types/feedback'

const Random = Mock.Random

const urgencyLevels: UrgencyLevel[] = ['normal', 'urgent', 'critical']
const statuses: FeedbackStatus[] = ['pending', 'processing', 'resolved']
const sources = ['市场部', '产品部', '技术部', '运营部', '客户服务部', '财务部', '人力资源部']

function generateMockFeedback(count: number): Feedback[] {
  const feedbacks: Feedback[] = []
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    const createdAt = now - Random.integer(0, 7 * 24 * 60 * 60 * 1000)
    const status = Random.pick(statuses)
    const updatedAt = status === 'pending'
      ? createdAt
      : createdAt + Random.integer(10 * 60 * 1000, 24 * 60 * 60 * 1000)

    feedbacks.push({
      id: Random.guid(),
      title: Random.ctitle(8, 30),
      source: Random.pick(sources),
      description: Random.cparagraph(2, 5),
      urgency: Random.pick(urgencyLevels),
      status,
      createdAt,
      updatedAt,
      order: i
    })
  }

  return feedbacks.sort((a, b) => b.createdAt - a.createdAt)
}

let mockData: Feedback[] = generateMockFeedback(30)

export const mockApi = {
  async getFeedbacks(): Promise<Feedback[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...mockData]), 100)
    })
  },

  async addFeedback(feedback: Omit<Feedback, 'id' | 'createdAt' | 'updatedAt' | 'order' | 'status'>): Promise<Feedback> {
    return new Promise((resolve) => {
      const newFeedback: Feedback = {
        ...feedback,
        id: Random.guid(),
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        order: mockData.length
      }
      mockData.unshift(newFeedback)
      setTimeout(() => resolve({ ...newFeedback }), 100)
    })
  },

  async updateFeedbackStatus(id: string, status: FeedbackStatus): Promise<Feedback> {
    return new Promise((resolve, reject) => {
      const index = mockData.findIndex(f => f.id === id)
      if (index === -1) {
        reject(new Error('Feedback not found'))
        return
      }
      mockData[index] = {
        ...mockData[index],
        status,
        updatedAt: Date.now()
      }
      setTimeout(() => resolve({ ...mockData[index] }), 100)
    })
  },

  async updateOrder(ids: string[]): Promise<void> {
    return new Promise((resolve) => {
      ids.forEach((id, index) => {
        const feedback = mockData.find(f => f.id === id)
        if (feedback) {
          feedback.order = index
        }
      })
      setTimeout(resolve, 50)
    })
  }
}
