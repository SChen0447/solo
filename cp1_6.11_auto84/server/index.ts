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
const DATA_PATH = path.join(__dirname, 'data.json')

app.use(cors())
app.use(express.json({ limit: '10mb' }))

interface GlazeSpot {
  x: number
  y: number
  color: string
  colorName: string
  radius: number
  timestamp: number
}

interface Artwork {
  id: string
  shapeData: number[]
  glazeData: GlazeSpot[]
  scores: {
    uniformity: number
    symmetry: number
    colorMatch: number
    total: number
  }
  thumbnail: string
  createdAt: string
}

interface DataStore {
  artworks: Artwork[]
}

function readData(): DataStore {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return { artworks: [] }
  }
}

function writeData(data: DataStore) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

app.get('/api/artworks', (_req: Request, res: Response) => {
  const data = readData()
  res.json(data.artworks.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ))
})

app.get('/api/artworks/:id', (req: Request, res: Response) => {
  const data = readData()
  const artwork = data.artworks.find(a => a.id === req.params.id)
  if (!artwork) {
    res.status(404).json({ error: '作品不存在' })
    return
  }
  res.json(artwork)
})

app.post('/api/artworks', (req: Request, res: Response) => {
  const data = readData()
  const newArtwork: Artwork = {
    id: uuidv4(),
    shapeData: req.body.shapeData || [],
    glazeData: req.body.glazeData || [],
    scores: req.body.scores || { uniformity: 0, symmetry: 0, colorMatch: 0, total: 0 },
    thumbnail: req.body.thumbnail || '',
    createdAt: new Date().toISOString()
  }
  data.artworks.push(newArtwork)
  writeData(data)
  res.status(201).json(newArtwork)
})

app.delete('/api/artworks/:id', (req: Request, res: Response) => {
  const data = readData()
  const idx = data.artworks.findIndex(a => a.id === req.params.id)
  if (idx === -1) {
    res.status(404).json({ error: '作品不存在' })
    return
  }
  data.artworks.splice(idx, 1)
  writeData(data)
  res.json({ success: true })
})

app.listen(PORT, () => {
  console.log(`陶艺工坊后端服务已启动: http://localhost:${PORT}`)
})
