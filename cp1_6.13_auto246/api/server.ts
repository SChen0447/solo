import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { app, activeLogs, BURN_DURATION } from './app.js'
import type { EmotionType } from './app.js'

const PORT = process.env.PORT || 3001

const server = createServer(app)

const wss = new WebSocketServer({ server, path: '/ws' })

function broadcastState() {
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
  const message = JSON.stringify({ type: 'state_update', logs })
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  })
}

const broadcastInterval = setInterval(broadcastState, 100)

wss.on('connection', (ws) => {
  console.log('WebSocket client connected')
  const now = Date.now()
  const logs: Array<{ id: string; emotion: EmotionType; remainingMs: number }> = []
  for (const [id, log] of activeLogs) {
    const remaining = log.burnDuration - (now - log.timestamp)
    if (remaining > 0) {
      logs.push({ id, emotion: log.emotion, remainingMs: remaining })
    }
  }
  ws.send(JSON.stringify({ type: 'state_update', logs }))

  ws.on('close', () => {
    console.log('WebSocket client disconnected')
  })
})

server.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`)
})

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received')
  clearInterval(broadcastInterval)
  wss.close()
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT signal received')
  clearInterval(broadcastInterval)
  wss.close()
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

export default app
