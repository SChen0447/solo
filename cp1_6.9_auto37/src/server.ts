import express, { Request, Response } from 'express'
import cors from 'cors'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3001
const DATA_FILE = path.join(__dirname, '..', 'data.json')

app.use(cors())
app.use(express.json())

interface Resource {
  crystal: number
  wood: number
  ore: number
}

interface Island {
  id: string
  name: string
  shape: 'dome' | 'peak' | 'platform'
  color: string
  size: number
  position: { x: number; y: number; z: number }
  resources: Resource
  resourceRate: number
}

interface Route {
  id: string
  fromId: string
  toId: string
}

interface DataStore {
  islands: Island[]
  routes: Route[]
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

function loadData(): DataStore {
  if (!fs.existsSync(DATA_FILE)) {
    const defaultData: DataStore = {
      islands: [
        {
          id: generateId(),
          name: '晨曦岛',
          shape: 'dome',
          color: '#228b22',
          size: 3,
          position: { x: -8, y: 0, z: 0 },
          resources: { crystal: 2, wood: 5, ore: 1 },
          resourceRate: 1
        },
        {
          id: generateId(),
          name: '云雾峰',
          shape: 'peak',
          color: '#8b4513',
          size: 2.5,
          position: { x: 0, y: 2, z: -5 },
          resources: { crystal: 4, wood: 2, ore: 3 },
          resourceRate: 1
        },
        {
          id: generateId(),
          name: '翠平台',
          shape: 'platform',
          color: '#32cd32',
          size: 3.5,
          position: { x: 8, y: 0, z: 2 },
          resources: { crystal: 1, wood: 8, ore: 0 },
          resourceRate: 1
        }
      ],
      routes: []
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), 'utf-8')
    return defaultData
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf-8')
  return JSON.parse(raw) as DataStore
}

function saveData(data: DataStore): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

app.get('/islands', (req: Request, res: Response) => {
  try {
    const data = loadData()
    res.json(data.islands)
  } catch (err) {
    res.status(500).json({ error: 'Failed to load islands' })
  }
})

app.post('/islands', (req: Request, res: Response) => {
  try {
    const data = loadData()
    const { name, shape, color, size, position, resources } = req.body
    const newIsland: Island = {
      id: generateId(),
      name: name || `岛屿-${Date.now()}`,
      shape: shape || 'dome',
      color: color || '#00aaff',
      size: size || 2.5,
      position: position || { x: 0, y: 0, z: 0 },
      resources: resources || { crystal: 0, wood: 0, ore: 0 },
      resourceRate: 1
    }
    data.islands.push(newIsland)
    saveData(data)
    res.json(newIsland)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create island' })
  }
})

app.put('/islands/:id', (req: Request, res: Response) => {
  try {
    const data = loadData()
    const idx = data.islands.findIndex((i) => i.id === req.params.id)
    if (idx === -1) {
      res.status(404).json({ error: 'Island not found' })
      return
    }
    data.islands[idx] = { ...data.islands[idx], ...req.body }
    saveData(data)
    res.json(data.islands[idx])
  } catch (err) {
    res.status(500).json({ error: 'Failed to update island' })
  }
})

app.delete('/islands/:id', (req: Request, res: Response) => {
  try {
    const data = loadData()
    const filtered = data.islands.filter((i) => i.id !== req.params.id)
    if (filtered.length === data.islands.length) {
      res.status(404).json({ error: 'Island not found' })
      return
    }
    data.islands = filtered
    data.routes = data.routes.filter(
      (r) => r.fromId !== req.params.id && r.toId !== req.params.id
    )
    saveData(data)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete island' })
  }
})

app.get('/resources', (req: Request, res: Response) => {
  try {
    const data = loadData()
    const resources = data.islands.map((i) => ({
      islandId: i.id,
      islandName: i.name,
      resources: i.resources
    }))
    res.json(resources)
  } catch (err) {
    res.status(500).json({ error: 'Failed to load resources' })
  }
})

app.get('/routes', (req: Request, res: Response) => {
  try {
    const data = loadData()
    res.json(data.routes)
  } catch (err) {
    res.status(500).json({ error: 'Failed to load routes' })
  }
})

app.post('/routes', (req: Request, res: Response) => {
  try {
    const data = loadData()
    const { fromId, toId } = req.body
    if (!fromId || !toId || fromId === toId) {
      res.status(400).json({ error: 'Invalid route endpoints' })
      return
    }
    const exists = data.routes.some(
      (r) =>
        (r.fromId === fromId && r.toId === toId) ||
        (r.fromId === toId && r.toId === fromId)
    )
    if (exists) {
      res.status(409).json({ error: 'Route already exists' })
      return
    }
    const newRoute: Route = { id: generateId(), fromId, toId }
    data.routes.push(newRoute)
    saveData(data)
    res.json(newRoute)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create route' })
  }
})

app.delete('/routes/:id', (req: Request, res: Response) => {
  try {
    const data = loadData()
    const filtered = data.routes.filter((r) => r.id !== req.params.id)
    if (filtered.length === data.routes.length) {
      res.status(404).json({ error: 'Route not found' })
      return
    }
    data.routes = filtered
    saveData(data)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete route' })
  }
})

app.listen(PORT, () => {
  console.log(`Sky Islands server running on http://localhost:${PORT}`)
})
