import express from 'express'
import cors from 'cors'
import { WebSocketServer, WebSocket } from 'ws'
import http from 'http'
import { v4 as uuidv4 } from 'uuid'

export interface Flavor {
  id: string
  name: string
  votes: number
  color: string
}

const COLORS = ['#ff6b6b', '#48dbfb', '#feca57', '#ff9ff3']

const initialFlavors: Flavor[] = [
  { id: uuidv4(), name: '焦糖奶油', votes: 12, color: COLORS[0] },
  { id: uuidv4(), name: '榛果巧克力', votes: 18, color: COLORS[1] },
  { id: uuidv4(), name: '柑橘花香', votes: 9, color: COLORS[2] },
  { id: uuidv4(), name: '香草拿铁', votes: 15, color: COLORS[3] },
  { id: uuidv4(), name: '海盐芝士', votes: 7, color: COLORS[0] },
  { id: uuidv4(), name: '抹茶红豆', votes: 11, color: COLORS[1] },
  { id: uuidv4(), name: '草莓奶昔', votes: 14, color: COLORS[2] },
  { id: uuidv4(), name: '黑糖珍珠', votes: 16, color: COLORS[3] },
  { id: uuidv4(), name: '桂花乌龙', votes: 6, color: COLORS[0] },
  { id: uuidv4(), name: '椰香芒果', votes: 10, color: COLORS[1] },
  { id: uuidv4(), name: '玫瑰荔枝', votes: 8, color: COLORS[2] },
  { id: uuidv4(), name: '炭烧杏仁', votes: 5, color: COLORS[3] },
  { id: uuidv4(), name: '柠檬蜜柚', votes: 13, color: COLORS[0] },
  { id: uuidv4(), name: '蓝莓芝士', votes: 17, color: COLORS[1] },
  { id: uuidv4(), name: '蜜桃乌龙', votes: 9, color: COLORS[2] },
  { id: uuidv4(), name: '生姜红茶', votes: 4, color: COLORS[3] },
  { id: uuidv4(), name: '百香果茶', votes: 11, color: COLORS[0] },
  { id: uuidv4(), name: '薄荷冰美式', votes: 20, color: COLORS[1] },
  { id: uuidv4(), name: '桂花酒酿', votes: 3, color: COLORS[2] },
  { id: uuidv4(), name: '紫薯拿铁', votes: 8, color: COLORS[3] },
  { id: uuidv4(), name: '燕麦丝绒', votes: 6, color: COLORS[0] },
  { id: uuidv4(), name: '枫糖肉桂', votes: 10, color: COLORS[1] },
  { id: uuidv4(), name: '白桃茉莉', votes: 7, color: COLORS[2] },
  { id: uuidv4(), name: '可可碎片', votes: 14, color: COLORS[3] },
  { id: uuidv4(), name: '太妃榛果', votes: 9, color: COLORS[0] },
  { id: uuidv4(), name: '葡萄柚冰茶', votes: 5, color: COLORS[1] },
  { id: uuidv4(), name: '青梅气泡', votes: 12, color: COLORS[2] },
  { id: uuidv4(), name: '椰乳可可', votes: 11, color: COLORS[3] },
  { id: uuidv4(), name: '荔枝玫瑰', votes: 6, color: COLORS[0] },
  { id: uuidv4(), name: '雪顶摩卡', votes: 15, color: COLORS[1] }
]

let flavors: Flavor[] = [...initialFlavors]

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/flavors', (req, res) => {
  res.json(flavors)
})

app.post('/api/flavors/:id/vote', (req, res) => {
  const { id } = req.params
  const flavor = flavors.find(f => f.id === id)
  if (flavor) {
    flavor.votes += 1
    broadcast({ type: 'vote', flavor })
    res.json(flavor)
  } else {
    res.status(404).json({ error: 'Flavor not found' })
  }
})

app.post('/api/flavors', (req, res) => {
  const { name } = req.body
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Name is required' })
  }
  if (flavors.some(f => f.name === name.trim())) {
    return res.status(409).json({ error: 'Flavor already exists' })
  }
  const newFlavor: Flavor = {
    id: uuidv4(),
    name: name.trim(),
    votes: 1,
    color: COLORS[Math.floor(Math.random() * COLORS.length)]
  }
  flavors.push(newFlavor)
  broadcast({ type: 'add', flavor: newFlavor })
  res.status(201).json(newFlavor)
})

const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

interface WSMessage {
  type: string
  flavor: Flavor
}

function broadcast(message: WSMessage) {
  const data = JSON.stringify(message)
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  })
}

wss.on('connection', (ws) => {
  console.log('Client connected')
  ws.send(JSON.stringify({ type: 'init', flavors }))
  ws.on('close', () => {
    console.log('Client disconnected')
  })
})

const PORT = 3001
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`WebSocket on ws://localhost:${PORT}/ws`)
})
