import type { WSMessage, UserCursor, Operation } from '../types'

type MessageHandler = (message: WSMessage) => void

export class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string
  private userId: string
  private handlers: Map<string, MessageHandler[]> = new Map()
  private reconnectTimer: number | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000
  private isManualClose = false
  private pendingMessages: WSMessage[] = []

  constructor(url: string, userId?: string) {
    this.url = url
    this.userId = userId || `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  }

  getUserId(): string {
    return this.userId
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url)
      } catch (e) {
        this.scheduleReconnect()
        reject(e)
        return
      }

      this.ws.onopen = () => {
        this.reconnectAttempts = 0
        this.flushPendingMessages()
        this.send({
          type: 'hello',
          payload: { userId: this.userId },
          timestamp: Date.now(),
          userId: this.userId
        })
        resolve()
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data)
          const handlers = this.handlers.get(message.type) || []
          handlers.forEach(h => h(message))
        } catch (e) {
          console.error('Failed to parse WS message:', e)
        }
      }

      this.ws.onerror = (e) => {
        console.error('WebSocket error:', e)
        reject(e)
      }

      this.ws.onclose = () => {
        if (!this.isManualClose) {
          this.scheduleReconnect()
        }
      }
    })
  }

  disconnect(): void {
    this.isManualClose = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
  }

  on(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, [])
    }
    this.handlers.get(type)!.push(handler)
    return () => {
      const handlers = this.handlers.get(type)
      if (handlers) {
        const idx = handlers.indexOf(handler)
        if (idx > -1) handlers.splice(idx, 1)
      }
    }
  }

  send(message: WSMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      this.pendingMessages.push(message)
    }
  }

  sendOperation(op: Operation): void {
    this.send({
      type: 'op',
      payload: op,
      timestamp: Date.now(),
      userId: this.userId
    })
  }

  sendCursor(cursor: UserCursor): void {
    this.send({
      type: 'cursor',
      payload: cursor,
      timestamp: Date.now(),
      userId: this.userId
    })
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached')
      return
    }
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1)
    this.reconnectTimer = window.setTimeout(() => {
      this.connect().catch(() => {})
    }, delay)
  }

  private flushPendingMessages(): void {
    while (this.pendingMessages.length > 0) {
      const msg = this.pendingMessages.shift()
      if (msg) this.send(msg)
    }
  }
}
