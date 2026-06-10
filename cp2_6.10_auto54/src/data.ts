import { v4 as uuidv4 } from 'uuid'
import { groupBy, sumBy } from 'lodash'

export type CardStatus = 'todo' | 'inProgress' | 'adopted' | 'archived'

export interface Card {
  id: string
  title: string
  description: string
  tags: string[]
  votes: number
  status: CardStatus
  createdAt: number
  updatedAt: number
}

export interface TagStats {
  name: string
  count: number
  totalVotes: number
}

const STORAGE_KEY = 'brainstorm_cards'
const VOTE_KEY = 'brainstorm_votes'

const getTodayKey = (): string => {
  return new Date().toISOString().split('T')[0]
}

const initialCards: Card[] = [
  {
    id: uuidv4(),
    title: 'AI智能客服系统',
    description: '基于大语言模型构建智能客服，支持多轮对话和情感分析，提升用户满意度',
    tags: ['AI', '客服', '创新'],
    votes: 28,
    status: 'adopted',
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 2
  },
  {
    id: uuidv4(),
    title: '移动端暗黑模式优化',
    description: '全面优化暗黑模式下的UI表现，支持自动切换和护眼模式',
    tags: ['UI', '移动端', '用户体验'],
    votes: 15,
    status: 'inProgress',
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now() - 86400000 * 1
  },
  {
    id: uuidv4(),
    title: '实时协作白板',
    description: '团队成员可以在同一白板上实时协作绘图、标注和头脑风暴',
    tags: ['协作', '工具', '创新'],
    votes: 42,
    status: 'todo',
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000
  },
  {
    id: uuidv4(),
    title: '数据可视化大屏',
    description: '构建企业级数据可视化大屏，实时展示业务数据和KPI指标',
    tags: ['数据', '可视化', '前端'],
    votes: 35,
    status: 'adopted',
    createdAt: Date.now() - 86400000 * 15,
    updatedAt: Date.now() - 86400000 * 7
  },
  {
    id: uuidv4(),
    title: '智能文档翻译功能',
    description: '支持多语言文档自动翻译，保持格式不变，专业术语准确',
    tags: ['AI', '工具', '效率'],
    votes: 22,
    status: 'todo',
    createdAt: Date.now() - 86400000 * 8,
    updatedAt: Date.now() - 86400000 * 3
  },
  {
    id: uuidv4(),
    title: '微前端架构改造',
    description: '将现有单体应用拆分为微前端架构，提升团队协作效率',
    tags: ['架构', '前端', '技术'],
    votes: 18,
    status: 'inProgress',
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 86400000 * 5
  },
  {
    id: uuidv4(),
    title: '用户行为分析系统',
    description: '埋点采集用户行为数据，生成用户画像和行为路径分析',
    tags: ['数据', '分析', '用户'],
    votes: 31,
    status: 'todo',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000
  },
  {
    id: uuidv4(),
    title: '自动化测试平台',
    description: '构建一站式自动化测试平台，支持UI、接口和性能测试',
    tags: ['测试', '效率', '工具'],
    votes: 12,
    status: 'archived',
    createdAt: Date.now() - 86400000 * 40,
    updatedAt: Date.now() - 86400000 * 35
  },
  {
    id: uuidv4(),
    title: '智能推荐引擎',
    description: '基于机器学习的个性化内容推荐算法',
    tags: ['AI', '算法', '推荐'],
    votes: 45,
    status: 'adopted',
    createdAt: Date.now() - 86400000 * 25,
    updatedAt: Date.now() - 86400000 * 10
  },
  {
    id: uuidv4(),
    title: '无障碍功能完善',
    description: '完善WCAG 2.1无障碍标准支持，让所有用户都能顺畅使用',
    tags: ['无障碍', '用户体验', 'UI'],
    votes: 8,
    status: 'todo',
    createdAt: Date.now() - 86400000 * 6,
    updatedAt: Date.now() - 86400000 * 2
  },
  {
    id: uuidv4(),
    title: 'Serverless架构探索',
    description: '探索Serverless架构在核心业务中的应用场景',
    tags: ['架构', '云原生', '技术'],
    votes: 19,
    status: 'inProgress',
    createdAt: Date.now() - 86400000 * 12,
    updatedAt: Date.now() - 86400000 * 4
  },
  {
    id: uuidv4(),
    title: '移动端性能优化',
    description: '启动速度优化50%，内存占用降低30%，流畅度显著提升',
    tags: ['移动端', '性能', '优化'],
    votes: 38,
    status: 'todo',
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000
  },
  {
    id: uuidv4(),
    title: '设计系统建设',
    description: '建立统一的设计系统和组件库，提升开发效率和UI一致性',
    tags: ['设计', 'UI', '组件库'],
    votes: 27,
    status: 'inProgress',
    createdAt: Date.now() - 86400000 * 18,
    updatedAt: Date.now() - 86400000 * 6
  },
  {
    id: uuidv4(),
    title: '离线功能支持',
    description: '支持离线模式下的核心功能可用，数据同步机制完善',
    tags: ['离线', '移动端', '技术'],
    votes: 6,
    status: 'archived',
    createdAt: Date.now() - 86400000 * 50,
    updatedAt: Date.now() - 86400000 * 45
  },
  {
    id: uuidv4(),
    title: '智能日程管理',
    description: 'AI自动识别邮件和消息，智能生成日程安排和提醒',
    tags: ['AI', '效率', '工具'],
    votes: 33,
    status: 'todo',
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now() - 86400000 * 2
  },
  {
    id: uuidv4(),
    title: 'API网关升级',
    description: '升级API网关，支持限流、熔断和灰度发布',
    tags: ['架构', '后端', '技术'],
    votes: 14,
    status: 'archived',
    createdAt: Date.now() - 86400000 * 35,
    updatedAt: Date.now() - 86400000 * 32
  }
]

export const loadCards = (): Card[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load cards:', e)
  }
  saveCards(initialCards)
  return initialCards
}

export const saveCards = (cards: Card[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
  } catch (e) {
    console.error('Failed to save cards:', e)
  }
}

export const hasVotedToday = (cardId: string): boolean => {
  try {
    const stored = localStorage.getItem(VOTE_KEY)
    if (stored) {
      const votes = JSON.parse(stored)
      const today = getTodayKey()
      return votes[cardId] === today
    }
  } catch (e) {
    console.error('Failed to check vote:', e)
  }
  return false
}

export const markVotedToday = (cardId: string): void => {
  try {
    const stored = localStorage.getItem(VOTE_KEY)
    const votes = stored ? JSON.parse(stored) : {}
    votes[cardId] = getTodayKey()
    localStorage.setItem(VOTE_KEY, JSON.stringify(votes))
  } catch (e) {
    console.error('Failed to mark vote:', e)
  }
}

export const voteCard = (cards: Card[], cardId: string): Card[] => {
  if (hasVotedToday(cardId)) {
    return cards
  }
  markVotedToday(cardId)
  return cards.map(card =>
    card.id === cardId
      ? { ...card, votes: card.votes + 1, updatedAt: Date.now() }
      : card
  )
}

export const addCard = (cards: Card[], title: string, description: string, tags: string[]): Card[] => {
  const newCard: Card = {
    id: uuidv4(),
    title,
    description,
    tags,
    votes: 0,
    status: 'todo',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
  const result = [newCard, ...cards]
  saveCards(result)
  return result
}

export const updateCard = (cards: Card[], cardId: string, updates: Partial<Card>): Card[] => {
  const result = cards.map(card =>
    card.id === cardId
      ? { ...card, ...updates, updatedAt: Date.now() }
      : card
  )
  saveCards(result)
  return result
}

export const updateCardStatus = (cards: Card[], cardId: string, status: CardStatus): Card[] => {
  return updateCard(cards, cardId, { status })
}

export const deleteCard = (cards: Card[], cardId: string): Card[] => {
  const result = cards.filter(card => card.id !== cardId)
  saveCards(result)
  return result
}

export const mergeTags = (cards: Card[]): TagStats[] => {
  const allTags: { name: string; votes: number }[] = []
  cards.forEach(card => {
    card.tags.forEach(tag => {
      allTags.push({ name: tag, votes: card.votes })
    })
  })
  const grouped = groupBy(allTags, 'name')
  return Object.entries(grouped).map(([name, items]) => ({
    name,
    count: items.length,
    totalVotes: sumBy(items, 'votes')
  }))
}

export const isExpiringSoon = (card: Card): boolean => {
  const thirtyDaysAgo = Date.now() - 86400000 * 30
  return card.updatedAt < thirtyDaysAgo
}

export const COLUMN_CONFIG: Record<CardStatus, { title: string; color: string }> = {
  todo: { title: '待讨论', color: '#FF6B6B' },
  inProgress: { title: '进行中', color: '#4ECDC4' },
  adopted: { title: '已采纳', color: '#45B7D1' },
  archived: { title: '已归档', color: '#96CEB4' }
}

export const TAG_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFD93D']

export const getTagColor = (tag: string): string => {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

export const calculateFontSize = (votes: number): number => {
  const minVotes = 1
  const maxVotes = 50
  const minSize = 12
  const maxSize = 48
  const normalized = Math.max(minVotes, Math.min(maxVotes, votes))
  const ratio = (normalized - minVotes) / (maxVotes - minVotes)
  return minSize + ratio * (maxSize - minSize)
}
