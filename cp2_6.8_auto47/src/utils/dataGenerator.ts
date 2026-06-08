import { v4 as uuidv4 } from 'uuid'

export type Sentiment = 'positive' | 'negative' | 'neutral'

export interface Comment {
  id: string
  userId: string
  userName: string
  avatar: string
  text: string
  sentiment: Sentiment
  timestamp: number
}

export interface VoteOption {
  id: string
  text: string
  votes: number
}

export interface Voter {
  userId: string
  userName: string
  avatar: string
  optionId: string
  timestamp: number
}

export interface Vote {
  id: string
  title: string
  options: VoteOption[]
  duration: number
  startTime: number
  endTime: number
  status: 'active' | 'ended'
  voters: Voter[]
}

export interface OnlineUser {
  id: string
  userName: string
  avatar: string
  color: string
}

const positiveComments = [
  '这个方案太棒了！',
  '完全同意，非常有远见',
  '我喜欢这个想法，很有创意',
  '支持！这是最好的选择',
  '太好了，终于有人提出来了',
  '这个决定会让我们更上一层楼',
  '完美的解决方案',
  '我对这个结果很满意',
  '这才是正确的方向',
  '干得漂亮，团队！'
]

const negativeComments = [
  '我觉得这个方案有问题',
  '不太看好这个方向',
  '风险太大了，需要再考虑',
  '可能会带来一些负面影响',
  '我持保留意见',
  '这个决定太仓促了',
  '我担心实际效果',
  '还需要更多数据支持',
  '感觉不够稳妥',
  '我们是不是漏了什么？'
]

const neutralComments = [
  '再看看情况吧',
  '还行吧，感觉一般',
  '有待观察实际效果',
  '中规中矩的选择',
  '可以试试看',
  '没有特别的感觉',
  '综合来看还可以',
  '需要更多时间评估',
  '各有利弊吧',
  '看后续发展再说'
]

const avatars = ['😀', '😎', '🤖', '👨‍💻', '👩‍💻', '🧑‍💼', '👨‍🎨', '👩‍🔬', '🦊', '🐱', '🐶', '🐼', '🦁', '🐯', '🐸']

const userNames = [
  '张三', '李四', '王五', '赵六', '陈七', '周八', '吴九', '郑十',
  '小明', '小红', '小华', '小李', '阿强', '小美', '大伟', '小芳'
]

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function generateComment(): Comment {
  const sentiment = getRandomItem(['positive', 'negative', 'neutral'] as const)
  let textList: string[]
  if (sentiment === 'positive') textList = positiveComments
  else if (sentiment === 'negative') textList = negativeComments
  else textList = neutralComments

  return {
    id: uuidv4(),
    userId: uuidv4(),
    userName: getRandomItem(userNames),
    avatar: getRandomItem(avatars),
    text: getRandomItem(textList),
    sentiment,
    timestamp: Date.now() - Math.floor(Math.random() * 30000)
  }
}

export function generateComments(count: number = 8): Comment[] {
  const result: Comment[] = []
  for (let i = 0; i < count; i++) {
    result.push(generateComment())
  }
  return result.sort((a, b) => b.timestamp - a.timestamp)
}

export function calculateSentimentStats(comments: Comment[]) {
  const total = comments.length
  if (total === 0) {
    return { positive: 0, negative: 0, neutral: 0 }
  }
  const positive = comments.filter(c => c.sentiment === 'positive').length
  const negative = comments.filter(c => c.sentiment === 'negative').length
  const neutral = comments.filter(c => c.sentiment === 'neutral').length
  return {
    positive: +((positive / total) * 100).toFixed(1),
    negative: +((negative / total) * 100).toFixed(1),
    neutral: +((neutral / total) * 100).toFixed(1)
  }
}

export function getWinner(vote: Vote): VoteOption | null {
  if (vote.options.length === 0) return null
  return vote.options.reduce((max, opt) => opt.votes > max.votes ? opt : max, vote.options[0])
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
