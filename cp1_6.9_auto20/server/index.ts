import express, { Request, Response } from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001
const DATA_DIR = path.join(__dirname, 'data')

app.use(cors())
app.use(express.json({ limit: '10mb' }))

interface User {
  id: string
  username: string
  password: string
  avatar: string
  createdAt: string
}

interface Crack {
  id: string
  startX: number
  startY: number
  endX: number
  endY: number
  width: number
  repaired: boolean
}

interface Stroke {
  id: string
  tool: string
  color: string
  points: { x: number; y: number; z: number }[]
  timestamp: number
}

interface Antique {
  id: string
  name: string
  dynasty: string
  type: string
  baseColor: string
  userId: string
  username: string
  cracks: Crack[]
  strokes: Stroke[]
  originalThumbnail: string
  restoredThumbnail: string
  status: 'pending' | 'completed'
  createdAt: string
  completedAt?: string
  ratings: { userId: string; rating: number }[]
  comments: { id: string; userId: string; username: string; content: string; createdAt: string }[]
}

interface Feed {
  id: string
  userId: string
  username: string
  avatar: string
  antiqueId: string
  antiqueName: string
  thumbnail: string
  likes: string[]
  createdAt: string
}

const ensureDataDir = () => {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

const readJSON = <T>(filename: string, defaultValue: T): T => {
  ensureDataDir()
  const filePath = path.join(DATA_DIR, filename)
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2))
    return defaultValue
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return defaultValue
  }
}

const writeJSON = (filename: string, data: unknown) => {
  ensureDataDir()
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2))
}

const generateRandomCracks = (count: number): Crack[] => {
  const cracks: Crack[] = []
  for (let i = 0; i < count; i++) {
    cracks.push({
      id: uuidv4(),
      startX: Math.random() * 2 - 1,
      startY: Math.random() * 1 - 0.5,
      endX: Math.random() * 2 - 1,
      endY: Math.random() * 1 - 0.5,
      width: 0.5 + Math.random() * 0.5,
      repaired: false,
    })
  }
  return cracks
}

const ANTIQUE_TEMPLATES = [
  { name: '明朝青花瓷瓶', dynasty: '明代', type: 'vase', baseColor: '#1e5799' },
  { name: '宋代钧窑碗', dynasty: '宋代', type: 'bowl', baseColor: '#8b4513' },
  { name: '清代粉彩盘', dynasty: '清代', type: 'plate', baseColor: '#c71585' },
  { name: '元代青花罐', dynasty: '元代', type: 'jar', baseColor: '#2c3e50' },
  { name: '唐代唐三彩马', dynasty: '唐代', type: 'horse', baseColor: '#d4a574' },
  { name: '汉代铜香炉', dynasty: '汉代', type: 'censer', baseColor: '#8b7355' },
  { name: '宋代汝窑天青釉瓶', dynasty: '宋代', type: 'vase', baseColor: '#a3c1ad' },
  { name: '明代釉里红大盘', dynasty: '明代', type: 'plate', baseColor: '#8b0000' },
  { name: '清代乾隆粉彩花鸟瓶', dynasty: '清代', type: 'vase', baseColor: '#ffb6c1' },
]

const DEFAULT_AVATARS = [
  '🧑‍🎨', '👨‍🔬', '👩‍🎨', '🧙‍♂️', '👨‍🏫', '👩‍🔬', '🦸‍♂️', '🧝‍♀️'
]

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' })
  }
  const users = readJSON<User[]>('users.json', [])
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: '用户名已存在' })
  }
  const user: User = {
    id: uuidv4(),
    username,
    password,
    avatar: DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)],
    createdAt: new Date().toISOString(),
  }
  users.push(user)
  writeJSON('users.json', users)
  res.json({ id: user.id, username: user.username, avatar: user.avatar })
})

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body
  const users = readJSON<User[]>('users.json', [])
  const user = users.find(u => u.username === username && u.password === password)
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' })
  }
  res.json({ id: user.id, username: user.username, avatar: user.avatar })
})

app.get('/api/antiques', (req: Request, res: Response) => {
  const { userId, status } = req.query
  const antiques = readJSON<Antique[]>('antiques.json', [])
  let result = antiques
  if (userId) {
    result = result.filter(a => a.userId === userId)
  }
  if (status) {
    result = result.filter(a => a.status === status)
  }
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  res.json(result)
})

app.get('/api/antiques/:id', (req: Request, res: Response) => {
  const antiques = readJSON<Antique[]>('antiques.json', [])
  const antique = antiques.find(a => a.id === req.params.id)
  if (!antique) {
    return res.status(404).json({ error: '古董未找到' })
  }
  res.json(antique)
})

app.post('/api/antiques', (req: Request, res: Response) => {
  const { userId, username } = req.body
  if (!userId) {
    return res.status(400).json({ error: '用户ID不能为空' })
  }
  const template = ANTIQUE_TEMPLATES[Math.floor(Math.random() * ANTIQUE_TEMPLATES.length)]
  const antique: Antique = {
    id: uuidv4(),
    name: template.name,
    dynasty: template.dynasty,
    type: template.type,
    baseColor: template.baseColor,
    userId,
    username: username || '匿名修复师',
    cracks: generateRandomCracks(2 + Math.floor(Math.random() * 2)),
    strokes: [],
    originalThumbnail: '',
    restoredThumbnail: '',
    status: 'pending',
    createdAt: new Date().toISOString(),
    ratings: [],
    comments: [],
  }
  const antiques = readJSON<Antique[]>('antiques.json', [])
  antiques.push(antique)
  writeJSON('antiques.json', antiques)
  res.json(antique)
})

app.put('/api/antiques/:id', (req: Request, res: Response) => {
  const antiques = readJSON<Antique[]>('antiques.json', [])
  const index = antiques.findIndex(a => a.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: '古董未找到' })
  }
  const { cracks, strokes, status, originalThumbnail, restoredThumbnail } = req.body
  if (cracks !== undefined) antiques[index].cracks = cracks
  if (strokes !== undefined) antiques[index].strokes = strokes
  if (status !== undefined) antiques[index].status = status
  if (originalThumbnail !== undefined) antiques[index].originalThumbnail = originalThumbnail
  if (restoredThumbnail !== undefined) antiques[index].restoredThumbnail = restoredThumbnail
  if (status === 'completed' && !antiques[index].completedAt) {
    antiques[index].completedAt = new Date().toISOString()
  }
  writeJSON('antiques.json', antiques)
  res.json(antiques[index])
})

app.post('/api/antiques/:id/rate', (req: Request, res: Response) => {
  const { userId, rating } = req.body
  if (!userId || !rating) {
    return res.status(400).json({ error: '缺少必要参数' })
  }
  const antiques = readJSON<Antique[]>('antiques.json', [])
  const index = antiques.findIndex(a => a.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: '古董未找到' })
  }
  const existingIndex = antiques[index].ratings.findIndex(r => r.userId === userId)
  if (existingIndex !== -1) {
    antiques[index].ratings[existingIndex].rating = rating
  } else {
    antiques[index].ratings.push({ userId, rating })
  }
  writeJSON('antiques.json', antiques)
  res.json(antiques[index])
})

app.post('/api/antiques/:id/comment', (req: Request, res: Response) => {
  const { userId, username, content } = req.body
  if (!userId || !content) {
    return res.status(400).json({ error: '缺少必要参数' })
  }
  const antiques = readJSON<Antique[]>('antiques.json', [])
  const index = antiques.findIndex(a => a.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: '古董未找到' })
  }
  antiques[index].comments.push({
    id: uuidv4(),
    userId,
    username: username || '匿名鉴赏家',
    content,
    createdAt: new Date().toISOString(),
  })
  writeJSON('antiques.json', antiques)
  res.json(antiques[index])
})

app.get('/api/feed', (_req: Request, res: Response) => {
  const feeds = readJSON<Feed[]>('feed.json', [])
  feeds.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  res.json(feeds.slice(0, 50))
})

app.post('/api/feed', (req: Request, res: Response) => {
  const { userId, username, avatar, antiqueId, antiqueName, thumbnail } = req.body
  if (!userId || !antiqueId) {
    return res.status(400).json({ error: '缺少必要参数' })
  }
  const feed: Feed = {
    id: uuidv4(),
    userId,
    username: username || '匿名修复师',
    avatar: avatar || '🎨',
    antiqueId,
    antiqueName,
    thumbnail,
    likes: [],
    createdAt: new Date().toISOString(),
  }
  const feeds = readJSON<Feed[]>('feed.json', [])
  feeds.unshift(feed)
  writeJSON('feed.json', feeds)
  res.json(feed)
})

app.post('/api/feed/:id/like', (req: Request, res: Response) => {
  const { userId } = req.body
  const feeds = readJSON<Feed[]>('feed.json', [])
  const index = feeds.findIndex(f => f.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: '动态未找到' })
  }
  const likeIndex = feeds[index].likes.indexOf(userId)
  if (likeIndex !== -1) {
    feeds[index].likes.splice(likeIndex, 1)
  } else {
    feeds[index].likes.push(userId)
  }
  writeJSON('feed.json', feeds)
  res.json(feeds[index])
})

app.listen(PORT, () => {
  console.log(`古董修复工作室服务端已启动: http://localhost:${PORT}`)
})
