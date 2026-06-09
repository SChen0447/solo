import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

interface User {
  id: string
  username: string
  createdAt: string
}

interface TastingRecord {
  id: string
  userId: string
  username: string
  coffeeName: string
  acidity: number
  sweetness: number
  bitterness: number
  aroma: number
  aftertaste: number
  tags: string[]
  notes?: string
  likes: number
  likedBy: string[]
  comments: { id: string; userId: string; username: string; content: string; createdAt: string }[]
  isPublic: boolean
  createdAt: string
}

const users: Map<string, User> = new Map()
const records: TastingRecord[] = []

const sampleUsers: User[] = [
  { id: 'user1', username: '咖啡达人小王', createdAt: new Date().toISOString() },
  { id: 'user2', username: '手冲爱好者', createdAt: new Date().toISOString() },
  { id: 'user3', username: '风味探索家', createdAt: new Date().toISOString() }
]
sampleUsers.forEach(u => users.set(u.id, u))

const sampleRecords: TastingRecord[] = [
  {
    id: uuidv4(),
    userId: 'user1',
    username: '咖啡达人小王',
    coffeeName: '埃塞俄比亚耶加雪菲',
    acidity: 8,
    sweetness: 7,
    bitterness: 3,
    aroma: 9,
    aftertaste: 7,
    tags: ['果酸明亮', '花香浓郁', '柑橘调性'],
    notes: '带有茉莉花和柠檬的香气，口感清爽，余韵悠长。',
    likes: 24,
    likedBy: [],
    comments: [
      { id: uuidv4(), userId: 'user2', username: '手冲爱好者', content: '耶加雪菲果然名不虚传！', createdAt: new Date().toISOString() }
    ],
    isPublic: true,
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: uuidv4(),
    userId: 'user2',
    username: '手冲爱好者',
    coffeeName: '哥伦比亚慧兰',
    acidity: 6,
    sweetness: 8,
    bitterness: 4,
    aroma: 7,
    aftertaste: 8,
    tags: ['焦糖甜感', '坚果调性', '醇厚平衡'],
    notes: '明显的焦糖和榛果风味，整体非常平衡醇厚。',
    likes: 18,
    likedBy: [],
    comments: [],
    isPublic: true,
    createdAt: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: uuidv4(),
    userId: 'user3',
    username: '风味探索家',
    coffeeName: '肯尼亚AA',
    acidity: 9,
    sweetness: 6,
    bitterness: 4,
    aroma: 8,
    aftertaste: 6,
    tags: ['黑醋栗', '番茄酸', '复杂层次'],
    notes: '非常有特色的黑醋栗和番茄酸质，层次复杂。',
    likes: 31,
    likedBy: [],
    comments: [],
    isPublic: true,
    createdAt: new Date(Date.now() - 259200000).toISOString()
  },
  {
    id: uuidv4(),
    userId: 'user1',
    username: '咖啡达人小王',
    coffeeName: '巴西喜拉多',
    acidity: 4,
    sweetness: 7,
    bitterness: 5,
    aroma: 6,
    aftertaste: 7,
    tags: ['巧克力', '坚果', '低酸顺滑'],
    notes: '经典的巴西风味，低酸顺滑，适合日常饮用。',
    likes: 12,
    likedBy: [],
    comments: [],
    isPublic: true,
    createdAt: new Date(Date.now() - 345600000).toISOString()
  },
  {
    id: uuidv4(),
    userId: 'user2',
    username: '手冲爱好者',
    coffeeName: '危地马拉安提瓜',
    acidity: 7,
    sweetness: 7,
    bitterness: 5,
    aroma: 8,
    aftertaste: 8,
    tags: ['可可', '烟熏', '香料感'],
    notes: '带有淡淡的烟熏和香料风味，可可尾韵非常棒。',
    likes: 22,
    likedBy: [],
    comments: [],
    isPublic: true,
    createdAt: new Date(Date.now() - 432000000).toISOString()
  }
]
records.push(...sampleRecords)

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += Math.pow(vecA[i], 2)
    normB += Math.pow(vecB[i], 2)
  }
  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

function getUserVector(userId: string): number[] {
  const userRecords = records.filter(r => r.userId === userId)
  if (userRecords.length === 0) return [5, 5, 5, 5, 5]
  const avg = [0, 0, 0, 0, 0]
  userRecords.forEach(r => {
    avg[0] += r.acidity
    avg[1] += r.sweetness
    avg[2] += r.bitterness
    avg[3] += r.aroma
    avg[4] += r.aftertaste
  })
  return avg.map(v => v / userRecords.length)
}

app.get('/api/records', (_req, res) => {
  res.json(records.filter(r => r.isPublic))
})

app.post('/api/records', (req, res) => {
  const {
    userId,
    coffeeName,
    acidity,
    sweetness,
    bitterness,
    aroma,
    aftertaste,
    tags,
    notes,
    isPublic = true
  } = req.body

  if (!userId || !coffeeName) {
    return res.status(400).json({ error: '缺少必要字段' })
  }

  const user = users.get(userId)
  if (!user) {
    return res.status(404).json({ error: '用户不存在' })
  }

  const newRecord: TastingRecord = {
    id: uuidv4(),
    userId,
    username: user.username,
    coffeeName: coffeeName.slice(0, 20),
    acidity: Math.max(0, Math.min(10, acidity || 0)),
    sweetness: Math.max(0, Math.min(10, sweetness || 0)),
    bitterness: Math.max(0, Math.min(10, bitterness || 0)),
    aroma: Math.max(0, Math.min(10, aroma || 0)),
    aftertaste: Math.max(0, Math.min(10, aftertaste || 0)),
    tags: tags || [],
    notes,
    likes: 0,
    likedBy: [],
    comments: [],
    isPublic,
    createdAt: new Date().toISOString()
  }

  records.unshift(newRecord)
  res.status(201).json(newRecord)
})

app.post('/api/records/:id/like', (req, res) => {
  const { id } = req.params
  const { userId } = req.body
  const record = records.find(r => r.id === id)

  if (!record) {
    return res.status(404).json({ error: '记录不存在' })
  }

  const likeIndex = record.likedBy.indexOf(userId)
  if (likeIndex === -1) {
    record.likedBy.push(userId)
    record.likes++
  } else {
    record.likedBy.splice(likeIndex, 1)
    record.likes--
  }

  res.json(record)
})

app.post('/api/records/:id/comment', (req, res) => {
  const { id } = req.params
  const { userId, content } = req.body
  const record = records.find(r => r.id === id)

  if (!record) {
    return res.status(404).json({ error: '记录不存在' })
  }

  const user = users.get(userId)
  if (!user) {
    return res.status(404).json({ error: '用户不存在' })
  }

  const comment = {
    id: uuidv4(),
    userId,
    username: user.username,
    content,
    createdAt: new Date().toISOString()
  }

  record.comments.push(comment)
  res.json(record)
})

app.post('/api/login', (req, res) => {
  const { username } = req.body

  if (!username || username.trim().length === 0) {
    return res.status(400).json({ error: '用户名不能为空' })
  }

  const trimmedName = username.trim()
  let existingUser: User | undefined

  for (const user of users.values()) {
    if (user.username === trimmedName) {
      existingUser = user
      break
    }
  }

  if (existingUser) {
    return res.json(existingUser)
  }

  const newUser: User = {
    id: uuidv4(),
    username: trimmedName,
    createdAt: new Date().toISOString()
  }
  users.set(newUser.id, newUser)
  res.status(201).json(newUser)
})

app.get('/api/recommendations/:userId', (req, res) => {
  const { userId } = req.params
  const userVector = getUserVector(userId)
  const publicRecords = records.filter(r => r.userId !== userId && r.isPublic)

  const scored = publicRecords.map(record => ({
    record,
    score: cosineSimilarity(userVector, [record.acidity, record.sweetness, record.bitterness, record.aroma, record.aftertaste])
  }))

  scored.sort((a, b) => b.score - a.score)
  const recommendations = scored.slice(0, 3).map(s => s.record)

  res.json(recommendations)
})

app.listen(PORT, () => {
  console.log(`咖啡品鉴服务器运行在 http://localhost:${PORT}`)
})
