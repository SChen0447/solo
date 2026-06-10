import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { PlantData, ElementRatio } from '../types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DATA_DIR = path.join(__dirname, '..', '..', 'data')
const DATA_FILE = path.join(DATA_DIR, 'plants.json')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

if (!fs.existsSync(DATA_FILE)) {
  const samplePlants: PlantData[] = []
  const elements: (keyof ElementRatio)[] = ['fire', 'water', 'wind', 'earth']
  const names = ['炎心藤', '碧兰花', '清风草', '琥珀树', '海月花', '赤焰兰', '翠叶藤', '瑰玉花']
  
  for (let i = 0; i < 8; i++) {
    const ratio: ElementRatio = { fire: 0, water: 0, wind: 0, earth: 0 }
    let remaining = 5
    elements.forEach((el, idx) => {
      if (idx === elements.length - 1) {
        ratio[el] = remaining
      } else {
        const val = Math.floor(Math.random() * (remaining + 1))
        ratio[el] = val
        remaining -= val
      }
    })
    
    samplePlants.push({
      id: `sample-${i}`,
      userId: `user-${Math.floor(Math.random() * 5)}`,
      ratio,
      growthTime: 5000,
      likes: Math.floor(Math.random() * 100) + 10,
      createdAt: Date.now() - Math.random() * 24 * 60 * 60 * 1000,
      name: names[i % names.length]
    })
  }
  
  fs.writeFileSync(DATA_FILE, JSON.stringify({ plants: samplePlants }, null, 2))
}

interface DataStore {
  plants: PlantData[]
}

function readData(): DataStore {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return { plants: [] }
  }
}

function writeData(data: DataStore) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.get('/api/plants', (_req, res) => {
  const data = readData()
  const now = Date.now()
  const last24Hours = now - 24 * 60 * 60 * 1000
  
  const recentPlants = data.plants.filter(p => p.createdAt >= last24Hours)
  
  const sorted = recentPlants
    .sort((a, b) => b.likes - a.likes)
    .slice(0, 10)
  
  res.json(sorted)
})

app.post('/api/plants', (req, res) => {
  const { ratio, userId, growthTime, name } = req.body
  
  if (!ratio || !userId) {
    return res.status(400).json({ error: '缺少必要参数' })
  }
  
  const data = readData()
  const newPlant: PlantData = {
    id: generateId(),
    userId,
    ratio,
    growthTime: growthTime || 5000,
    likes: 0,
    createdAt: Date.now(),
    name: name || '魔法植物'
  }
  
  data.plants.push(newPlant)
  writeData(data)
  
  res.status(201).json(newPlant)
})

app.post('/api/plants/:id/like', (req, res) => {
  const { id } = req.params
  const data = readData()
  
  const plant = data.plants.find(p => p.id === id)
  
  if (!plant) {
    return res.status(404).json({ error: '植物不存在' })
  }
  
  plant.likes += 1
  writeData(data)
  
  res.json({ likes: plant.likes })
})

app.get('/api/users/:userId/plants', (req, res) => {
  const { userId } = req.params
  const data = readData()
  
  const userPlants = data.plants
    .filter(p => p.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt)
  
  res.json(userPlants)
})

app.listen(PORT, () => {
  console.log(`魔法植物后端服务器运行在 http://localhost:${PORT}`)
})
