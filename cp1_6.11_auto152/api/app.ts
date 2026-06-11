import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

const scentNotes = [
  { id: 'citrus', name: '柑橘', category: 'top', color: '#ff7f50', particleShape: 'pulse', particleColor: '#ff7f50', particleSize: 7 },
  { id: 'lavender', name: '薰衣草', category: 'top', color: '#9b7bb8', particleShape: 'spiral', particleColor: '#9b7bb8', particleSize: 5 },
  { id: 'bergamot', name: '佛手柑', category: 'top', color: '#c9a84c', particleShape: 'bubble', particleColor: '#c9a84c', particleSize: 5 },
  { id: 'lemon', name: '柠檬', category: 'top', color: '#fff44f', particleShape: 'bounce', particleColor: '#fff44f', particleSize: 5 },
  { id: 'rose', name: '玫瑰', category: 'middle', color: '#ff69b4', particleShape: 'star', particleColor: '#ff69b4', particleSize: 6 },
  { id: 'jasmine', name: '茉莉', category: 'middle', color: '#fffacd', particleShape: 'float', particleColor: '#fffacd', particleSize: 5 },
  { id: 'lily', name: '铃兰', category: 'middle', color: '#e8f5e9', particleShape: 'spiral_down', particleColor: '#e8f5e9', particleSize: 5 },
  { id: 'violet', name: '紫罗兰', category: 'middle', color: '#8a2be2', particleShape: 'wave', particleColor: '#8a2be2', particleSize: 5 },
  { id: 'sandalwood', name: '檀木', category: 'base', color: '#8b4513', particleShape: 'zigzag', particleColor: '#8b4513', particleSize: 6 },
  { id: 'amber', name: '琥珀', category: 'base', color: '#ffbf00', particleShape: 'slow_spread', particleColor: '#ffbf00', particleSize: 6 },
  { id: 'musk', name: '麝香', category: 'base', color: '#c4a882', particleShape: 'random_walk', particleColor: '#c4a882', particleSize: 5 },
  { id: 'cedar', name: '雪松', category: 'base', color: '#5d4037', particleShape: 'sink', particleColor: '#5d4037', particleSize: 5 },
]

const defaultCandles = [
  {
    id: 'candle-honey',
    name: '蜜意黄昏',
    waxColor: '#f5d78e',
    scents: [
      { noteId: 'citrus', percentage: 30 },
      { noteId: 'rose', percentage: 40 },
      { noteId: 'sandalwood', percentage: 30 },
    ],
    burnDuration: 0,
    currentColor: '#f5d78e',
  },
  {
    id: 'candle-rose',
    name: '玫瑰花园',
    waxColor: '#e8a0b0',
    scents: [
      { noteId: 'lavender', percentage: 25 },
      { noteId: 'rose', percentage: 50 },
      { noteId: 'amber', percentage: 25 },
    ],
    burnDuration: 0,
    currentColor: '#e8a0b0',
  },
  {
    id: 'candle-forest',
    name: '森林清晨',
    waxColor: '#6b8e5a',
    scents: [
      { noteId: 'bergamot', percentage: 30 },
      { noteId: 'jasmine', percentage: 30 },
      { noteId: 'cedar', percentage: 40 },
    ],
    burnDuration: 0,
    currentColor: '#6b8e5a',
  },
]

app.get('/api/notes', (_req: Request, res: Response) => {
  res.json(scentNotes)
})

app.get('/api/candles', (_req: Request, res: Response) => {
  res.json(defaultCandles)
})

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'ok' })
})

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
