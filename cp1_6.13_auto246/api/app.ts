import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

export type EmotionType = 'joy' | 'sadness' | 'anger' | 'serenity'

export interface EmberLog {
  id: string
  emotion: EmotionType
  timestamp: number
  burnDuration: number
}

const BURN_DURATION = 15000

const activeLogs = new Map<string, EmberLog>()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.get('/api/logs', (_req: Request, res: Response): void => {
  const now = Date.now()
  const logs: Array<{ id: string; emotion: EmotionType; remainingMs: number }> = []
  for (const [id, log] of activeLogs) {
    const remaining = log.burnDuration - (now - log.timestamp)
    if (remaining <= 0) {
      activeLogs.delete(id)
    } else {
      logs.push({ id, emotion: log.emotion, remainingMs: remaining })
    }
  }
  res.status(200).json({ logs })
})

app.post('/api/logs', (req: Request, res: Response): void => {
  const { emotion } = req.body as { emotion: EmotionType }
  const validEmotions: EmotionType[] = ['joy', 'sadness', 'anger', 'serenity']
  if (!emotion || !validEmotions.includes(emotion)) {
    res.status(400).json({ error: 'Invalid emotion type' })
    return
  }
  const id = uuidv4()
  const now = Date.now()
  const log: EmberLog = { id, emotion, timestamp: now, burnDuration: BURN_DURATION }
  activeLogs.set(id, log)
  const remainingMs = BURN_DURATION
  res.status(201).json({ id, emotion, timestamp: now, remainingMs })
})

app.use(
  '/api/health',
  (_req: Request, res: Response, _next: NextFunction): void => {
    res.status(200).json({ success: true, message: 'ok' })
  },
)

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export { app, activeLogs, BURN_DURATION }
