import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

const uploadsDir = path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${uuidv4()}${ext}`)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.wav', '.mp3', '.ogg']
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, allowed.includes(ext))
  },
})

app.use('/uploads', express.static(uploadsDir))

interface User {
  id: string
  username: string
  password: string
}

interface CardData {
  id: string
  userId: string
  type: 'image' | 'text' | 'audio'
  title: string
  content: string
  tags: string[]
  positionX: number
  positionY: number
  createdAt: string
  fileUrl?: string
}

const users = new Map<string, User>()
const cards = new Map<string, CardData>()
const tokens = new Map<string, string>()

function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token || !tokens.has(token)) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }
  next()
}

app.post('/api/auth/register', (req: Request, res: Response): void => {
  const { username, password } = req.body
  if (!username || !password) {
    res.status(400).json({ success: false, error: 'Username and password required' })
    return
  }
  for (const u of users.values()) {
    if (u.username === username) {
      res.status(409).json({ success: false, error: 'Username already exists' })
      return
    }
  }
  const id = uuidv4()
  const token = uuidv4()
  users.set(id, { id, username, password })
  tokens.set(token, id)
  res.json({ success: true, user: { id, username }, token })
})

app.post('/api/auth/login', (req: Request, res: Response): void => {
  const { username, password } = req.body
  if (!username || !password) {
    res.status(400).json({ success: false, error: 'Username and password required' })
    return
  }
  for (const u of users.values()) {
    if (u.username === username && u.password === password) {
      const token = uuidv4()
      tokens.set(token, u.id)
      res.json({ success: true, user: { id: u.id, username: u.username }, token })
      return
    }
  }
  res.status(401).json({ success: false, error: 'Invalid credentials' })
})

app.get('/api/cards', authMiddleware, (req: Request, res: Response): void => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  const userId = tokens.get(token!)
  const tag = req.query.tag as string | undefined
  const sort = req.query.sort as string | undefined

  let userCards = Array.from(cards.values()).filter(c => c.userId === userId)

  if (tag) {
    userCards = userCards.filter(c => c.tags.includes(tag))
  }

  if (sort === 'time') {
    userCards.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } else if (sort === 'title') {
    userCards.sort((a, b) => a.title.localeCompare(b.title))
  }

  res.json({ success: true, cards: userCards })
})

app.post('/api/cards', authMiddleware, (req: Request, res: Response): void => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  const userId = tokens.get(token!)
  const { type, title, content, tags, positionX, positionY } = req.body

  if (!type || !title) {
    res.status(400).json({ success: false, error: 'Type and title are required' })
    return
  }

  const id = uuidv4()
  const card: CardData = {
    id,
    userId: userId!,
    type,
    title,
    content: content || '',
    tags: tags || [],
    positionX: positionX || 0,
    positionY: positionY || 0,
    createdAt: new Date().toISOString(),
  }
  cards.set(id, card)
  res.json({ success: true, card })
})

app.put('/api/cards/:id', authMiddleware, (req: Request, res: Response): void => {
  const { id } = req.params
  const card = cards.get(id)
  if (!card) {
    res.status(404).json({ success: false, error: 'Card not found' })
    return
  }
  const updates = req.body
  Object.assign(card, updates)
  cards.set(id, card)
  res.json({ success: true, card })
})

app.delete('/api/cards/:id', authMiddleware, (req: Request, res: Response): void => {
  const { id } = req.params
  if (!cards.has(id)) {
    res.status(404).json({ success: false, error: 'Card not found' })
    return
  }
  cards.delete(id)
  res.json({ success: true })
})

app.post('/api/cards/:id/upload', authMiddleware, upload.single('file'), (req: Request, res: Response): void => {
  const { id } = req.params
  const card = cards.get(id)
  if (!card) {
    res.status(404).json({ success: false, error: 'Card not found' })
    return
  }
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No file uploaded' })
    return
  }
  const fileUrl = `/uploads/${req.file.filename}`
  card.fileUrl = fileUrl
  cards.set(id, card)
  res.json({ success: true, url: fileUrl })
})

app.get('/api/tags', authMiddleware, (req: Request, res: Response): void => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  const userId = tokens.get(token!)
  const tagSet = new Set<string>()
  for (const card of cards.values()) {
    if (card.userId === userId) {
      card.tags.forEach(t => tagSet.add(t))
    }
  }
  res.json({ success: true, tags: Array.from(tagSet) })
})

app.use('/api/health', (_req: Request, res: Response): void => {
  res.json({ success: true, message: 'ok' })
})

app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  console.error(err.stack)
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.listen(PORT, () => {
  console.log(`Archive server ready on port ${PORT}`)
})

export default app
