import express, { Request, Response } from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json({ limit: '50mb' }))

interface Capsule {
  id: string
  title: string
  color: string
  audioUrl: string
  createdAt: number
}

const capsules: Capsule[] = [
  {
    id: uuidv4(),
    title: '晨曦的低语',
    color: 'amber',
    audioUrl: '',
    createdAt: Date.now() - 86400000
  },
  {
    id: uuidv4(),
    title: '星海漫游',
    color: 'starBlue',
    audioUrl: '',
    createdAt: Date.now() - 43200000
  },
  {
    id: uuidv4(),
    title: '玫瑰色的梦',
    color: 'rose',
    audioUrl: '',
    createdAt: Date.now() - 21600000
  },
  {
    id: uuidv4(),
    title: '翡翠森林',
    color: 'emerald',
    audioUrl: '',
    createdAt: Date.now() - 10800000
  },
  {
    id: uuidv4(),
    title: '薰衣草田',
    color: 'lavender',
    audioUrl: '',
    createdAt: Date.now() - 5400000
  }
]

app.get('/api/capsules', (_req: Request, res: Response) => {
  try {
    const sorted = [...capsules].sort((a, b) => b.createdAt - a.createdAt)
    res.json(sorted)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch capsules' })
  }
})

app.get('/api/capsules/:id', (req: Request, res: Response) => {
  const capsule = capsules.find(c => c.id === req.params.id)
  if (!capsule) {
    res.status(404).json({ error: 'Capsule not found' })
    return
  }
  res.json(capsule)
})

app.post('/api/capsules', (req: Request, res: Response) => {
  try {
    const { title, color, audioUrl } = req.body

    if (!title || typeof title !== 'string') {
      res.status(400).json({ error: 'Title is required' })
      return
    }

    if (!color || typeof color !== 'string') {
      res.status(400).json({ error: 'Color is required' })
      return
    }

    const newCapsule: Capsule = {
      id: uuidv4(),
      title: title.trim(),
      color,
      audioUrl: audioUrl || '',
      createdAt: Date.now()
    }

    capsules.push(newCapsule)
    res.status(201).json(newCapsule)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create capsule' })
  }
})

app.delete('/api/capsules/:id', (req: Request, res: Response) => {
  const index = capsules.findIndex(c => c.id === req.params.id)
  if (index === -1) {
    res.status(404).json({ error: 'Capsule not found' })
    return
  }
  const deleted = capsules.splice(index, 1)[0]
  res.json(deleted)
})

app.listen(PORT, () => {
  console.log(`[Capsule Server] running on http://localhost:${PORT}`)
})
