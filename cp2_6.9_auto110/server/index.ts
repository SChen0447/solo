import express from 'express'
import { WebSocketServer, WebSocket } from 'ws'
import http from 'http'
import { v4 as uuidv4 } from 'uuid'

const GRID_SIZE = 300
const SNAPSHOT_INTERVAL = 30000
const MAX_SNAPSHOTS = 1800

interface PixelUpdate {
  x: number
  y: number
  color: string
  userId: string
  timestamp: number
}

interface Snapshot {
  timestamp: number
  data: string[]
}

interface User {
  id: string
  name: string
  color: string
  joinedAt: number
}

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

const grid: string[] = new Array(GRID_SIZE * GRID_SIZE).fill('')
const snapshots: Snapshot[] = []
const users = new Map<string, User>()
const history: PixelUpdate[] = []

const USER_COLORS = [
  '#FF6B6B', '#FFE66D', '#4ECDC4', '#95E1D3',
  '#AA96DA', '#FCBAD3', '#A8D8EA', '#FFD93D',
  '#6BCB77', '#4D96FF', '#FF6B9D', '#C56CF0',
  '#FF8C42', '#00C9A7', '#845EC2', '#FF9671'
]

function getRandomColor() {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)]
}

function getRandomName() {
  const adjectives = ['快乐', '勇敢', '聪明', '可爱', '神奇', '超级', '幸运', '阳光']
  const nouns = ['小猫', '小狗', '兔子', '熊猫', '企鹅', '考拉', '狐狸', '松鼠']
  return adjectives[Math.floor(Math.random() * adjectives.length)] +
    nouns[Math.floor(Math.random() * nouns.length)]
}

function takeSnapshot() {
  const snapshot: Snapshot = {
    timestamp: Date.now(),
    data: [...grid]
  }
  snapshots.push(snapshot)
  if (snapshots.length > MAX_SNAPSHOTS) {
    snapshots.shift()
  }
  console.log(`[Snapshot] Saved at ${new Date(snapshot.timestamp).toLocaleTimeString()}, total: ${snapshots.length}`)
}

function findSnapshotAt(targetTime: number): Snapshot | null {
  if (snapshots.length === 0) return null
  let closest = snapshots[0]
  let minDiff = Math.abs(targetTime - closest.timestamp)
  for (const snap of snapshots) {
    const diff = Math.abs(targetTime - snap.timestamp)
    if (diff < minDiff) {
      minDiff = diff
      closest = snap
    }
  }
  return closest
}

setInterval(takeSnapshot, SNAPSHOT_INTERVAL)
takeSnapshot()

app.use(express.json())

app.get('/api/snapshots', (_req, res) => {
  res.json({
    startTime: snapshots.length > 0 ? snapshots[0].timestamp : Date.now(),
    endTime: Date.now(),
    count: snapshots.length
  })
})

app.get('/api/snapshot', (req, res) => {
  const time = Number(req.query.time) || Date.now()
  const snapshot = findSnapshotAt(time)
  if (snapshot) {
    res.json(snapshot)
  } else {
    res.status(404).json({ error: 'Snapshot not found' })
  }
})

app.get('/api/history', (_req, res) => {
  res.json(history.slice(-5000))
})

app.get('/api/users', (_req, res) => {
  res.json(Array.from(users.values()))
})

wss.on('connection', (ws: WebSocket) => {
  const userId = uuidv4()
  const user: User = {
    id: userId,
    name: getRandomName(),
    color: getRandomColor(),
    joinedAt: Date.now()
  }
  users.set(userId, user)

  console.log(`[WS] User connected: ${user.name} (${userId})`)

  ws.send(JSON.stringify({
    type: 'init',
    userId,
    user,
    grid,
    users: Array.from(users.values()),
    startTime: snapshots.length > 0 ? snapshots[0].timestamp : Date.now()
  }))

  broadcast({
    type: 'user_join',
    user
  })

  ws.on('message', (data: string) => {
    try {
      const msg = JSON.parse(data.toString())

      if (msg.type === 'pixel') {
        const { x, y, color } = msg
        if (
          typeof x === 'number' && typeof y === 'number' &&
          x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE &&
          typeof color === 'string'
        ) {
          const idx = y * GRID_SIZE + x
          grid[idx] = color
          const update: PixelUpdate = {
            x, y, color, userId, timestamp: Date.now()
          }
          history.push(update)
          if (history.length > 100000) history.shift()

          broadcast({
            type: 'pixel',
            ...update
          })
        }
      }
    } catch (e) {
      console.error('[WS] Parse error:', e)
    }
  })

  ws.on('close', () => {
    users.delete(userId)
    console.log(`[WS] User disconnected: ${user.name}`)
    broadcast({
      type: 'user_leave',
      userId
    })
  })
})

function broadcast(data: unknown) {
  const msg = JSON.stringify(data)
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg)
    }
  }
}

const PORT = 4000
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`WebSocket on ws://localhost:${PORT}/ws`)
})
